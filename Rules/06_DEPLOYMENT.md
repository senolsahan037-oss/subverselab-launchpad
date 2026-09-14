# 06 — Deployment

Canonical for: deployment flow, project topology, and deployment rules.
Source: `Infrastructure/CloudRun/subverselab-v2/.agents/rules/deployment.md` (and its identical mirror in `Infrastructure/MetadataSync/metadata-sync-service/.agents/rules/`), which remain the build-bundled copies. Verification steps moved to `07_POST_DEPLOY_VERIFICATION.md`; the target data table moved to `08_DEPLOYMENT_REGISTRY.md`.

## Deployment integrity

- Every deployment must originate from a Launchpad-certified release (see `04_CERTIFICATION.md`). Deployments initiated directly from arbitrary development folders are prohibited.
- The Launchpad is the only authorized production gateway.
- Before every deployment, the deployment pipeline must resolve its target from `08_DEPLOYMENT_REGISTRY.md` — never from repository names, folder names, prior conversations, or assumption. If any production target cannot be uniquely identified, the deployment must fail immediately rather than guess.

## Project topology

SubverseLab operates across specific, fixed Google Cloud and Firebase projects (full detail in `08_DEPLOYMENT_REGISTRY.md`). Deploying the frontend to the wrong project, or the backend without its required env file, is the most common cause of the production incidents documented below.

## Container images accumulate — the registry has a cleanup policy

Every `gcloud run deploy --source` build pushes a new image to Artifact Registry and nothing ever removes it. By 2026-08-24 this had reached ~37 GB across the two `cloud-run-source-deploy` repositories, 24.7 GB of it being 130 images for one service. Deleting a Cloud Run **service or revision does not free that storage** — the image stays in the registry and keeps billing. This is worth knowing mainly because it is invisible: nothing in the deploy output mentions it.

Both `europe-west1` `cloud-run-source-deploy` repositories now carry a cleanup policy:

- **Keep** the 10 most recent versions of every package.
- **Delete** anything older than 30 days that the keep rule did not claim.

Keep rules win over delete rules, so a service that has not been deployed in months still keeps its live image. This is only safe while every service routes 100% of traffic to `latestRevision` — all nine europe-west1 services did when the policy was set. **If you ever pin traffic to a specific older revision, check that its image is within the 10 most recent for that package**, or the revision will be unable to scale up once the policy collects its image.

The policy is live, not dry-run. To inspect or change it:

```bash
gcloud artifacts repositories describe cloud-run-source-deploy --location=europe-west1 --project <project> --format="yaml(cleanupPolicies, cleanupPolicyDryRun)"
```

Repositories still without a policy: `gcr.io` and `mcp-cloud-run-deployments` in the main project, and the `us-central1` `cloud-run-source-deploy` that serves the zen* products.

## A remote tool's CORS must be scoped to /api

A tool that serves its own bundle and its own API from one Express app must mount `cors()` on `/api`, never on the whole app:

```js
app.use('/api', cors({ origin(origin, callback) { /* … */ } }));
```

Mounted globally it rejects the tool's **own** assets. Vite marks its generated `<script type="module">` and `<link rel="stylesheet">` tags `crossorigin`, so the browser sends an `Origin` header even for same-origin asset requests. If that origin is not in the allowlist — and a tool's own production URL usually is not, because the list is written for the website — `cors()` errors, Express returns 500, and the SPA catch-all answers with `index.html`. The stylesheet then arrives as `text/html`, the module never executes, and the page paints nothing. In the Tool Room this looks like an empty product room, not like an error.

This has bitten SynthPulse and Sensei, on 2026-08-24, for the same reason both times.

**Verify with the Origin header or you will not see it.** `curl` sends no `Origin`, so a plain `curl` of the asset returns 200 and the service looks healthy:

```bash
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" -H "Origin: https://<tool-host>" https://<tool-host>/assets/<file>.css
```

`200 text/css` is correct. `500 text/html` is this bug.

## Responsive regression check

`npm run check:responsive` drives the machine's own Chrome (via `puppeteer-core`, so nothing is downloaded) over five routes at 320, 375, 414, 768, 1024 and 1366 px and asserts `scrollWidth - clientWidth === 0` on each. It exits 1 with the offending selector and its overflow in pixels.

**Run it before deploying the frontend.** It is not wired into `npm run build` on purpose: `build` also runs inside the Cloud Build container, where there is no Chrome and no point starting one. The check skips cleanly when no browser is found, because a missing local browser is a workstation problem and must never be able to block a release by itself.

The check exists because this was missed by eye. The site shipped with one media query and a header that ran 309 px past a 375 px viewport — not a subtle bug, just one nobody looked for, because whoever looked always had a wide window open. A check that depends on remembering to look is not a check.

Verified to fail, not just to pass: reintroducing `minmax(480px, 1fr)` makes it exit 1 and name the element.

## Frontend deployment (subverselab-v2)

- The frontend is a Vite-based React application, built via Cloud Build and served on Cloud Run by its own `server.js` — a small Express static host. It is **not** the `serve` package. `serve -s` rewrites every request to the root `index.html`, and its `serve.json` rewrites are checked before real files even without `-s`; either behaviour defeats prerendering, which depends on a real file existing at `dist/{route}/index.html`. Do not "simplify" this back to `serve`.
- `.env` must never be added to `.dockerignore`. Vite injects its `VITE_*` variables at build time; if `.env` is excluded from the build context, the resulting bundle ships with `undefined` keys, causing `auth/invalid-api-key` errors and a black-screen crash on load.
- `node_modules` and `dist` should stay excluded from the Docker build context to avoid Cloud Build timeouts and size limits.
- The service runs with `--min-instances=1`. At `0`, first-request cold starts measured 2.6–10 s of time-to-first-byte; with one warm instance the same requests measure ~0.2 s. This costs money continuously — it is a deliberate trade, not a default, and lowering it back to `0` is a decision to accept those cold starts again.

### What `npm run build` regenerates

The build is three steps: `generate-sitemap.js` → `vite build` → `prerender.js`. The first and third read **live Firestore**, which means these production artefacts are only ever as fresh as the last deploy:

- `sitemap.xml`, `robots.txt`, `llms.txt`, `llms-full.txt`
- `dist/{route}/index.html` for every route — each with that route's own title, description, canonical, JSON-LD, and **its real body content**

The body content matters: AI crawlers (GPTBot, ClaudeBot, PerplexityBot, CCBot) do not execute JavaScript. Without prerendering they receive an empty `<div id="root">` and conclude the site has no information. Publishing a guide or registering a tool in Firestore does **not** put it on the sitemap, in `llms.txt`, or into any crawlable page until subverselab-v2 is rebuilt and redeployed. A content change is not live for search until a deploy follows it.

### Serving-layer behaviour that must not regress

`server.js` is small, but each of these exists because its absence caused a real defect:

- **`www` → apex 301.** Both `subverselab.com` and `www.subverselab.com` are mapped to this service in Cloud Run, so both answered `200` and the site existed at two addresses. The redirect makes the apex the only host that ever serves content.
- **Compression.** Neither Cloud Run nor `express.static` compresses on its own. Without the `compression` middleware the ~890 KB bundle ships raw on every request; with it, ~268 KB.
- **Cache headers.** Content-hashed `/assets/*` are `immutable` for a year; HTML revalidates. Serving HTML from cache indefinitely leaves visitors on stale pages pointing at deleted asset URLs.
- **404 for missing files.** The SPA catch-all must not answer file-extension requests. Returning the shell under a `200` for a missing image is a soft 404 — Google penalises it and it hides broken links from logs.
- **No trailing-slash redirect.** `express.static` is configured with `redirect: false` and the catch-all resolves `dist/{path}/index.html` itself. Otherwise every canonical URL 301s to a slash variant whose own canonical points back at the redirect.
- **Security headers.** `x-powered-by` off, HSTS (only when `x-forwarded-proto` is `https`), `nosniff`, `Referrer-Policy`, `Permissions-Policy`, and a CSP that enumerates real hosts. The CSP hashes `index.html`'s inline theme script by reading the built file at startup rather than carrying a pasted constant, so editing that script cannot silently break the policy.

## Backend deployment (metadata-sync-service)

- The backend is an Express application deployed to Cloud Run.
- Runtime environment variables are passed via `env.yaml` using `--env-vars-file`, not via `.env` file upload — the backend deploy path differs from the frontend's on this specific point.
- Required variables include `FIREBASE_STORAGE_BUCKET` and `ALLOWED_ORIGINS`.

## Backend deployment (social-publish)

- Same Express-on-Cloud-Run shape as `metadata-sync-service`: `env.yaml` via `--env-vars-file`, `firebase-admin` with `applicationDefault()` credentials.
- Required static variables (`env.yaml`): `FIREBASE_STORAGE_BUCKET`, `GOOGLE_CLOUD_PROJECT`, `ALLOWED_ORIGINS`, `CRON_SECRET`, `YT_CLIENT_ID`/`YT_CLIENT_SECRET`, `IG_APP_ID`/`IG_APP_SECRET`, `FIREBASE_WEB_API_KEY`/`FIREBASE_WEB_AUTH_DOMAIN`.
- **Deliberate exception to "config via env.yaml":** the YouTube refresh token and the Instagram long-lived Page token are stored in Firestore (`social_publish_config/youtube`, `social_publish_config/instagram`), not in `env.yaml`. These two values rotate at runtime (Meta's Page token needs periodic renewal); storing them in `env.yaml` would force a full redeploy every rotation. Do not "fix" this by moving them into `env.yaml` — it's intentional. Everything else (app IDs/secrets, default privacy status) does follow the normal `env.yaml` convention.
- Tokens are written once by the one-time local helper `Scripts/social-publish-oauth-setup.js`, run on a developer machine — never inside Cloud Run.

## Known pitfalls & troubleshooting

- **Black screen / blank page on frontend** → Vite compiled without environment variables. Check `.dockerignore` doesn't exclude `.env`.
- **Firebase Auth `invalid-api-key`** → same root cause as above.
- **Old website appearing after deploy** → deployed to the wrong GCP project, or to Firebase Hosting instead of Cloud Run. Verify the actual domain mapping (see `08_DEPLOYMENT_REGISTRY.md`) before assuming the deployment target.
- **Backend `FATAL ERROR: FIREBASE_STORAGE_BUCKET is required`** → missing `--env-vars-file=env.yaml` on deploy.

## Deployment safety checklist

Before deployment, verify:
- Launch Authorization (`04_CERTIFICATION.md`)
- QA approval
- Rule compliance
- Manifest validation (`03_VALIDATION.md`)
- Version consistency
- Git revision and build timestamp
- Deployment Registry target resolution (`08_DEPLOYMENT_REGISTRY.md`)

If any check fails: **DEPLOY DENIED**.

## Architectural mandate — production topology is immutable

No agent or developer may migrate domains, Cloud Run services, Firebase projects, Hosting targets, Storage buckets, Firestore databases, or deployment targets without explicit user approval. Changing infrastructure is an architectural decision, not a deployment task. Always verify the current domain mapping before assuming a deployment target — do not infer it from folder names or prior sessions.

## Final deployment philosophy

Deployment is a controlled certification process — not file copying, not guessing, not selecting the most likely target. Every production deployment must be deterministic, reproducible, fully verifiable, and traceable.

- The Deployment Registry (`08_DEPLOYMENT_REGISTRY.md`) defines destinations.
- The Metadata Sync Service (`05_SYNC.md`) synchronizes products.
- The website renders synchronized metadata.

Each layer has a single responsibility and must never assume the responsibility of another layer.

## Firestore rules and indexes are deployed, not just committed

Added 2026-09-12 after the forum was found broken in production.

`firestore.rules` said `allow read: if true` for `forum_topics`. Live Firestore
answered **403 PERMISSION_DENIED**. The file had been written and committed and
never released, so nobody could read a topic and nobody could have seen one they
posted. The page fell back to its seed list and looked merely empty rather than
broken, which is why it survived that way.

A Cloud Run deploy does not carry them. They go separately:

```bash
firebase deploy --only firestore:rules --project project-62238635-aae4-41f4-880
```

Indexes are the same class — `firestore.indexes.json` is versioned and released
the same way. A missing index plus a `catch → return []` reads as "no content"
rather than as an error, which is how the site lost every Related Guides block
for weeks (`09_FAILURE_LOG.md`, class A).

**Verify from outside afterwards.** Compile-and-release output proves the upload,
not the outcome: read the collection as an anonymous visitor would, through the
app's own client rather than a bare REST call — an unauthenticated REST request
is refused at the API layer and will show 403 whatever the rules say, which is a
false negative that cost an hour here.

