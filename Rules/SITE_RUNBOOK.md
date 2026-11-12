# Site runbook — subverselab.com and the services around it

How a change reaches production and what is checked after it. `CLAUDE.md` at the repository root is authoritative over
everything here; where this file and `CLAUDE.md` disagree, `CLAUDE.md` wins and this file is fixed.

Written 2026-10-15 from `06_DEPLOYMENT.md` and `07_POST_DEPLOY_VERIFICATION.md` (archived in
`_arsiv/rules_2026-10/`). Sections marked *carried over* are their text, unchanged except for file references; the
manifest-certification gate those files described is retired (plug-ins never went through it). Targets — projects,
services, regions, URLs — are in [`DEPLOYMENT_REGISTRY.md`](DEPLOYMENT_REGISTRY.md); what has broken before is in
[`FAILURE_LOG.md`](FAILURE_LOG.md).

## Who decides a deploy

- **Nothing is deployed without the owner's explicit go in chat.** Not a site deploy, not a plug-in release, not a
  `firebase deploy`. Approval for one deploy does not carry over to the next.
- Every site change is made **locally** in `Infrastructure/CloudRun/subverselab-v2`, passes the gate below and is listed
  in that folder's `RELEASE_QUEUE.md` (QUEUED / NEXT DEPLOY). Related changes are batched into one deploy.
- **Release freeze until 1 Nov 2026** (owner 2026-10-13): no site releases and no plug-in builds, except a live outage,
  a security hole, or an explicit owner go for that one deploy. RU-8 is exempt (owner 2026-10-15); its signing,
  notarisation and release still go step by step with the owner.
- Plug-in installers are not part of a site deploy: `publish_download.sh` updates `gs://subverselab-downloads/plugins/manifest.json`
  and the site shows the new version within a minute. The plug-in release gate is in `CLAUDE.md`.
- The deploy target always comes from `DEPLOYMENT_REGISTRY.md` — never from repository names, folder names, prior
  conversations, or the nearest copied command. If a production target cannot be uniquely identified, stop.

## The gate before a site deploy

Run in `Infrastructure/CloudRun/subverselab-v2`, in this order. A step that fails stops the deploy.

1. `npm run lint` — 0 errors (warnings are listed, not fixed silently).
2. `npm run build` — eslint, sitemap, `vite build`, prerender. **Read the two counts it prints** and compare them with the
   last deploy in `RELEASE_QUEUE.md` (live 15 Oct 2026: 43 routes, 32 URLs; queued build with /preset-packs: 44 routes, 33 URLs). The sitemap reads live
   Firestore; a transient empty guide fetch once wrote 26 URLs instead of 32 and was only caught by counting.
3. Every `scripts/test-*.js` — all green (`for t in scripts/test-*.js; do node $t; done`). `test-pages.js` reads `dist/`,
   so it runs after the build.
4. `npm run check:responsive` — no route scrolls sideways at 320–1366 px.
5. A page you changed, opened in a browser in light **and** dark theme at 1440 and 375 px. Headless screenshots do not
   prove a window fits a real screen.

## Rollout

1. `gcloud run deploy subverselab-site --source . --project project-62238635-aae4-41f4-880 --region europe-west1 --no-traffic --tag <name>`
   (the full command, with its flags, is in the registry). `--timeout 3600` is set on the service since revision 00213
   and is kept unless overridden — a 680 MB installer download takes longer than five minutes on a slow line.
2. Smoke test on the tag URL: the changed pages 200, `/api/download/manifest` 200, member endpoints 401 without a token,
   no `ERROR` lines in the new revision's logs.
3. Move 100 % of traffic to the new revision, then repeat the checks on `subverselab.com`.
4. Firestore rules and indexes go separately (see below), only when they changed.
5. Write the revision, what shipped, the gate numbers and what was **not** verified into `RELEASE_QUEUE.md` under DEPLOYED.

## After a deploy — the checklist

- [ ] The new revision serves 100 % of traffic and its logs show no `ERROR` lines.
- [ ] `https://subverselab.com/` and `https://www.subverselab.com/` behave as in the public-surface checks below.
- [ ] The pages the deploy touched return 200 and render (not an empty `#root`), in light and dark theme.
- [ ] `/api/download/manifest` returns 200 and lists every product with the expected versions.
- [ ] A download ticket for one product completes end to end — a large installer (ELEK, ~680 MB) as well as a small one.
- [ ] Lemon Squeezy checkout links on the changed pages open the right product.
- [ ] `/account` signed out shows the sign-in step; member endpoints answer 401 without a token.
- [ ] No console errors and no CSP violations after the auth modal and a Tool Room iframe.

If any check fails: the release has failed, whatever the build said. Roll traffic back to the previous revision first,
investigate second.

*Carried over from 06, updated where marked.*

## Frontend deployment (subverselab-v2)

- The frontend is a Vite-based React application, built via Cloud Build and served on Cloud Run by its own `server.js` — an Express app that serves the prerendered pages **and** the site's own API (downloads, licences, Lemon Squeezy webhook, credits, testers, inbox, stats; about 60 `/api` routes). It is **not** the `serve` package. `serve -s` rewrites every request to the root `index.html`, and its `serve.json` rewrites are checked before real files even without `-s`; either behaviour defeats prerendering, which depends on a real file existing at `dist/{route}/index.html`. Do not "simplify" this back to `serve`.
- `.env` must never be added to `.dockerignore`. Vite injects its `VITE_*` variables at build time; if `.env` is excluded from the build context, the resulting bundle ships with `undefined` keys, causing `auth/invalid-api-key` errors and a black-screen crash on load.
- `node_modules` and `dist` should stay excluded from the Docker build context to avoid Cloud Build timeouts and size limits.
- The service runs with `--min-instances=1` (per the 2026-09 audit; re-check with the command under Idle cost before relying on it). At `0`, first-request cold starts measured 2.6–10 s of time-to-first-byte; with one warm instance the same requests measure ~0.2 s. This costs money continuously — it is a deliberate trade, not a default, and lowering it back to `0` is a decision to accept those cold starts again.

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
for weeks (`FAILURE_LOG.md`, class A).

**Verify from outside afterwards.** Compile-and-release output proves the upload,
not the outcome: read the collection as an anonymous visitor would, through the
app's own client rather than a bare REST call — an unauthenticated REST request
is refused at the API layer and will show 403 whatever the rules say, which is a
false negative that cost an hour here.

## Responsive regression check

`npm run check:responsive` drives the machine's own Chrome (via `puppeteer-core`, so nothing is downloaded) over the routes listed in `scripts/check-responsive.js` (eight on 2026-10-15; the plug-in rooms are not among them, so check those by hand) at 320, 375, 414, 768, 1024 and 1366 px and asserts `scrollWidth - clientWidth === 0` on each. It exits 1 with the offending selector and its overflow in pixels.

**Run it before deploying the frontend.** It is not wired into `npm run build` on purpose: `build` also runs inside the Cloud Build container, where there is no Chrome and no point starting one. The check skips cleanly when no browser is found, because a missing local browser is a workstation problem and must never be able to block a release by itself.

The check exists because this was missed by eye. The site shipped with one media query and a header that ran 309 px past a 375 px viewport — not a subtle bug, just one nobody looked for, because whoever looked always had a wide window open. A check that depends on remembering to look is not a check.

Verified to fail, not just to pass: reintroducing `minmax(480px, 1fr)` makes it exit 1 and name the element.

## Idle cost: every new service sleeps unless it earns the right not to

**Default for every new tool: `--min-instances=0` and CPU throttling left on.** A Cloud Run service in this configuration costs nothing while no request is in flight. Nothing about deploying a tool obliges it to burn money between visits.

Two settings break that, and both are easy to set without noticing:

- **`--min-instances=N` where N > 0** keeps N containers resident 24/7. They bill whether or not anyone arrives.
- **`--no-cpu-throttling`** allocates CPU for as long as the container is *alive*, not just while it is handling a request. On a service sized for heavy work this is the more expensive of the two — an 8-vCPU container billed continuously rather than per request.

Audited 2026-09-18: of 22 services, three were awake. `subverse-splitter` (8 vCPU / 8 GiB) and `subverse-mix-analyzer` both ran `--no-cpu-throttling`. Both are synchronous — `subverse-splitter` runs `containerConcurrency=1` with a 900 s timeout, i.e. the separation happens inside the request — so throttling is safe for them and was turned on. The measured account-wide burn before the change was **₺755/month forecast**, against a **₺481/month** Google Developer Program credit: a real shortfall, not a rounding error.

**If a service needs to stay awake, the exemption is written here with its measurement.** Not in a commit message, not in a conversation. One service currently holds it:

| Service | Setting | Why |
|---|---|---|
| `subverselab-site` | `--min-instances=1` | Cold start measured 2.6–10 s TTFB at `0`, ~0.2 s with one warm instance. The public site; the trade is deliberate (see Frontend deployment below). |
| `subverse-visualizer` | `--no-cpu-throttling` | A render runs on a background thread for minutes while the browser polls; between two polls a throttled instance does almost nothing and the job appears to hang. Measured 2026-09-18 on the same track, style and frame count (3711 frames): 466 s here against 197 s on an M2 — a Cloud Run vCPU is **2.4× slower**, and throttling on top of that would stretch it past any tab anyone keeps open. `--min-instances` stays `0`, so this buys CPU only while an instance is alive after a render, not around the clock. The cost of that idle tail is real: about 4 cents per isolated render at 2 vCPU, on top of 4-5 cents of render. Revisit when the frame loop is parallelised or the service drops to 1 vCPU. |

Everything else sleeps. Before adding an exemption, measure the thing you are buying — a cold start figure, a background job that genuinely outlives its request — and write the number down. An exemption without a measurement next to it is a leak, and it will be reverted by the next audit.

### Checking the current state

```bash
for S in $(gcloud run services list --project <project> --format="value(metadata.name)"); do
  gcloud run services describe $S --project <project> --region <region> \
    --format="value(spec.template.metadata.annotations['autoscaling.knative.dev/minScale'],
                    spec.template.metadata.annotations['run.googleapis.com/cpu-throttling'])"
done
```

An empty `minScale` means 0; an empty `cpu-throttling` means `true`. Both empty is the state a new tool should ship in.

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

## Backend deployment (metadata-sync-service)

- The backend is an Express application deployed to Cloud Run.
- Runtime environment variables are passed via `env.yaml` using `--env-vars-file`, not via `.env` file upload — the backend deploy path differs from the frontend's on this specific point.
- Required variables include `FIREBASE_STORAGE_BUCKET` and `ALLOWED_ORIGINS`.

## Known pitfalls & troubleshooting

- **Black screen / blank page on frontend** → Vite compiled without environment variables. Check `.dockerignore` doesn't exclude `.env`.
- **Firebase Auth `invalid-api-key`** → same root cause as above.
- **Old website appearing after deploy** → deployed to the wrong GCP project, or to Firebase Hosting instead of Cloud Run. Verify the actual domain mapping (see `DEPLOYMENT_REGISTRY.md`) before assuming the deployment target.
- **Backend `FATAL ERROR: FIREBASE_STORAGE_BUCKET is required`** → missing `--env-vars-file=env.yaml` on deploy.

## Architectural mandate — production topology is immutable

No agent or developer may migrate domains, Cloud Run services, Firebase projects, Hosting targets, Storage buckets, Firestore databases, or deployment targets without explicit user approval. Changing infrastructure is an architectural decision, not a deployment task. Always verify the current domain mapping before assuming a deployment target — do not infer it from folder names or prior sessions.

# Verification detail

*Carried over from 07. The metadata-sync and manifest checks apply to the browser tools only (`BROWSER_TOOLS.md`).*

## Frontend-specific checks

- Correct Google Cloud project and Cloud Run service.
- Correct custom domain mapping.
- Vite environment variables were injected — build contains no `undefined` `VITE_*` values.

## Public-surface checks (subverselab-v2)

These are the checks that catch the failures a browser smoke test does not. Each one exists because the corresponding defect shipped to production at least once. All are verifiable with `curl` and the browser console — none require a person to eyeball anything.

**Serving layer**

- [ ] `https://www.subverselab.com/` returns `301` to the apex, and the apex returns `200`. Both hostnames are mapped to the service, so a regression here silently restores a duplicate site.
- [ ] A known-missing file (`/nonexistent.png`) returns `404`, not `200` with HTML.
- [ ] A canonical content URL (`/learn/{slug}`, no trailing slash) returns `200` directly — not a `301` to a slash variant.
- [ ] Response headers include HSTS, `X-Content-Type-Options`, `Referrer-Policy`, and a CSP; `x-powered-by` is absent.
- [ ] A hashed asset carries `immutable`; HTML revalidates.

**Crawlability — verify with JavaScript disabled, since AI crawlers never run it**

- [ ] `/`, `/learn/{slug}` and `/tools/{slug}` each return real body content, not an empty `<div id="root">`.
- [ ] `sitemap.xml`, `robots.txt`, `llms.txt` and `llms-full.txt` all return `200`, and the sitemap's URL count matches the number of published guides and registered tools.
- [ ] Every route serves **exactly one** `<title>`, one `<link rel="canonical">` and one `<meta name="description">`.
- [ ] No meta description begins with Markdown syntax (`## `, `**`) — that means a raw guide body reached a description field.

**Client-side navigation** — the prerendered HTML being correct does not mean the app is:

- [ ] Navigating between routes updates the tab title, including on browser Back. A route whose component sets no metadata inherits the previous page's title.
- [ ] After navigating, the counts above are still exactly one each. React 19 hoists its own `<title>`/`<meta>`/`<link>` and knows nothing about the prerendered tags, so anything that stops `main.jsx` from removing them reintroduces duplicates.
- [ ] The browser console reports no CSP violations after exercising the auth modal and a Tool Room iframe — the two flows that reach the most external origins.

## Backend-specific checks

- `env.yaml` loaded successfully.
- `FIREBASE_STORAGE_BUCKET` exists.
- Metadata Sync starts correctly.
- Required environment variables are present.
- Service account permissions are valid.

Backend startup failures must immediately fail the deployment — do not treat a running-but-misconfigured backend as a successful release.

## Remote tool checks

- Fetch one CSS and one JS asset **with an `Origin` header set to the tool's own production URL**. Expect `200` and `text/css` / `text/javascript`. A `500` returning `text/html` is the global-CORS bug in this runbook — the tool will render a blank page while every plain `curl` reports it healthy.
- Load the tool's page and confirm `document.getElementById('root').children.length > 0`. A `200` on the HTML says nothing about whether the app mounted.
- Confirm each member-gated endpoint returns `401` without a token.

## Responsive checks

For the website this is automated: `npm run check:responsive` (see this runbook). Run it before deploying rather than checking by eye.

Remote tools are not covered by it — they are separate services on their own origins — so each is still verified by hand at **320, 375, 768, 1024 and 1366 px**. The check is objective, not a glance:

```js
document.documentElement.scrollWidth - document.documentElement.clientWidth  // must be 0
```

Anything above 0 means the page scrolls sideways, which on a phone puts controls out of reach with no way to get to them. Content that is *meant* to scroll horizontally — a sequencer grid, a wide table — must do so inside its own `overflow-x` container, so the document total stays 0.

Two failures cause almost all of it:

- **A flex row with no wrap.** The site header was one nowrap row of brand, a 400 px search field, four links, a theme toggle and a button, with 40 px side padding. At 375 px it ran 309 px past the viewport and everything after the first link was unreachable.
- **`minmax(<fixed>, 1fr)` in a grid.** The track never shrinks below its floor, so a 480 px minimum inside a 295 px column overflows by 145 px. Write `minmax(min(480px, 100%), 1fr)`.

Checking only at desktop width is how both shipped. The tools were fine; the website was not, and nobody could have known from a 1440 px screen.

## Crawler surface checks

- **robots.txt groups do not inherit.** A crawler obeys only the single most specific `User-agent` group that matches it (RFC 9309 §2.2.1). Naming a bot to grant it access also releases it from every `Disallow` under `*`. Each `Disallow` must therefore be repeated in every group. This site named fifteen AI crawlers to welcome them and, in doing so, told all fifteen that `/admin` and `/account` were open — the one thing the file was meant to prevent. Verify with:

  ```bash
  curl -s https://subverselab.com/robots.txt | grep -c '^User-agent:'   # groups
  curl -s https://subverselab.com/robots.txt | grep -c '^Disallow:'     # must be groups × disallowed paths
  ```

- **`Disallow` is not `noindex`.** It stops fetching, not indexing from an inbound link. Client-rendered private routes carry no `<meta name="robots">` a non-JS crawler can see, so `/admin` and `/account` are served with `X-Robots-Tag: noindex, nofollow` from `server.js`. Confirm the header is present on those two and absent everywhere else.

- Every `<loc>` in `sitemap.xml` must return 200, and each public page must carry exactly one `<link rel="canonical">` pointing at itself.

## Before trusting a verification

`FAILURE_LOG.md` records every failure that reached production here, and each one passed the verification that was actually run. Three questions from it apply to any check written below:

1. **What does this look like when it fails?** If failing looks the same as "no data", a fallback is hiding it — check the output, not the status code.
2. **Does the instrument send what a real client sends?** `curl` sends no `Origin`, so it cannot see a CORS fault. A desktop window cannot see a mobile overflow. A `200` does not mean the app mounted.
3. **Is the other side of the contract implemented?** Grep the counterpart's shipped build for the message type or field before believing a handshake exists.
