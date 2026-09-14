<!-- GENERATED FILE — DO NOT EDIT.
     Generated mirror combining canonical sources (repo root), concatenated in this order:
       1. Rules/06_DEPLOYMENT.md
       2. Rules/07_POST_DEPLOY_VERIFICATION.md
     Regenerate: node Scripts/sync-agent-rules.js
     Verify:     node Scripts/verify-agent-rules-sync.js
     Hand-edits here will be silently overwritten on next generation, and will fail verification until then. -->

# 06 — Deployment

Canonical for: deployment flow, project topology, and deployment rules.
Source: `Infrastructure/CloudRun/subverselab-v2/.agents/rules/deployment.md` (and its identical mirror in `Infrastructure/MetadataSync/metadata-sync-service/.agents/rules/`), which remain the build-bundled copies. Verification steps moved to `07_POST_DEPLOY_VERIFICATION.md`; the target data table moved to `08_DEPLOYMENT_REGISTRY.md`.

## Deployment integrity

- Every deployment must originate from a Launchpad-certified release (see `04_CERTIFICATION.md`). Deployments initiated directly from arbitrary development folders are prohibited.
- The Launchpad is the only authorized production gateway.
- Before every deployment, the deployment pipeline must resolve its target from `08_DEPLOYMENT_REGISTRY.md` — never from repository names, folder names, prior conversations, or assumption. If any production target cannot be uniquely identified, the deployment must fail immediately rather than guess.

## Project topology

SubverseLab operates across specific, fixed Google Cloud and Firebase projects (full detail in `08_DEPLOYMENT_REGISTRY.md`). Deploying the frontend to the wrong project, or the backend without its required env file, is the most common cause of the production incidents documented below.

## Frontend deployment (subverselab-v2)

- The frontend is a Vite-based React application, built via Cloud Build and served on Cloud Run by its own `server.js` — a small Express static host, **not** the `serve` package. `serve -s` rewrites every request to the root `index.html` and its `serve.json` rewrites beat real files, either of which defeats prerendering. It also now runs with `--min-instances=1`. See `Rules/06_DEPLOYMENT.md` for the full serving-layer contract; this file is a build-bundled mirror, and `Rules/` is the authority.
- `.env` must never be added to `.dockerignore`. Vite injects its `VITE_*` variables at build time; if `.env` is excluded from the build context, the resulting bundle ships with `undefined` keys, causing `auth/invalid-api-key` errors and a black-screen crash on load.
- `node_modules` and `dist` should stay excluded from the Docker build context to avoid Cloud Build timeouts and size limits.

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

<!-- ===== End: Rules/06_DEPLOYMENT.md — Begin: Rules/07_POST_DEPLOY_VERIFICATION.md ===== -->

# 07 — Post-Deploy Verification

Canonical for: what must be checked after a deployment before it counts as complete.
Source: `Infrastructure/CloudRun/subverselab-v2/.agents/rules/deployment.md` §8–9 (and its identical mirror), extracted here so it's discoverable without reading the entire deployment file.

## Deployment verification is not optional

Deployment completion does not equal production success. A mandatory verification phase follows every deployment.

The full pipeline is:

```
Build → Deploy → Deployment Verification → Metadata Verification → Production Verification → Release Complete
```

Deployment is considered successful only if every verification step passes.

## Production verification checklist

At minimum, verify:

- [ ] Cloud Run revision deployed successfully.
- [ ] Production URL responds successfully.
- [ ] Custom domain resolves correctly.
- [ ] Metadata Sync API responds.
- [ ] Firebase connection succeeds.
- [ ] Firestore connection succeeds.
- [ ] Storage connection succeeds.
- [ ] Website loads without a runtime crash.
- [ ] Browser console contains no critical errors.
- [ ] Authentication initializes correctly.
- [ ] At least one synchronized product loads correctly.
- [ ] Manifest synchronization remains functional.

If any check fails: **RELEASE FAILED**. The deployment must not be considered complete, regardless of whether the build itself succeeded.

## Frontend-specific checks

- Correct Google Cloud project and Cloud Run service.
- Correct custom domain mapping.
- Vite environment variables were injected — build contains no `undefined` `VITE_*` values.

## Backend-specific checks

- `env.yaml` loaded successfully.
- `FIREBASE_STORAGE_BUCKET` exists.
- Metadata Sync starts correctly.
- Required environment variables are present.
- Service account permissions are valid.

Backend startup failures must immediately fail the deployment — do not treat a running-but-misconfigured backend as a successful release.
