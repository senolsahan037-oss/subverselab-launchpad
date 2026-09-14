# 08 — Deployment Registry

This is the single authoritative data source describing every production deployment target for SubverseLab. It is data, not policy — see `06_DEPLOYMENT.md` for the rules governing how this data is used.

Agents must never determine deployment targets from repository names, folder names, previous conversations, or assumptions. Deployment destinations must always be resolved from this registry.

Source: `Infrastructure/CloudRun/subverselab-v2/.agents/rules/deployment_registry.md` (and its identical mirror in `Infrastructure/MetadataSync/metadata-sync-service/.agents/rules/`), which remain the build-bundled copies for those two services.

## Frontend Production

- **Google Cloud Project:** `project-62238635-aae4-41f4-880`
- **Cloud Run Service:** `subverselab-site`
- **Region:** `europe-west1`
- **Production Domain:** `subverselab.com`
- **Production URL:** `https://subverselab.com`
- **Deployment Command:**
  ```bash
  gcloud run deploy subverselab-site --source . --project project-62238635-aae4-41f4-880 --region europe-west1 --allow-unauthenticated
  ```
- **Verification Command:**
  ```bash
  curl -s -I https://subverselab.com | grep "200"
  ```

## Backend Production

- **Google Cloud Project:** `subverselab-project`
- **Cloud Run Service:** `metadata-sync-service`
- **Region:** `europe-west1`
- **Production URL:** `https://metadata-sync-service-il7bu2xxqa-ew.a.run.app` (live-verified via `gcloud run services describe`, 2026-08-07). The currently-deployed frontend build still calls the legacy alias `https://metadata-sync-service-630319862116.europe-west1.run.app`, which resolves to the same live service.
- **Deployment Command:**
  ```bash
  gcloud run deploy metadata-sync-service --source . --project subverselab-project --region europe-west1 --env-vars-file env.yaml --allow-unauthenticated
  ```
- **Verification Command:**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" https://metadata-sync-service-il7bu2xxqa-ew.a.run.app/ | grep "404"
  ```
  `metadata-sync-service` defines no `/api/health` route and no GET routes at all (only `POST /api/admin/sync-remote-metadata` and `POST /api/admin/sync-folder-metadata`, both admin-authenticated — see `server.js`). A live, healthy instance therefore returns **HTTP 404 with an Express "Cannot GET" body** on any GET request — that is the expected passing signal, not a failure. A connection failure, timeout, or a Cloud Run infrastructure error page (different body, no "Cannot GET" text) indicates the service is actually down. Do not expect or wait for HTTP 200 from this service via GET.

## Remote Tool Target — Arrangement GPS

- **Product Slug:** `arrangement-gps`
- **Google Cloud Project:** `project-62238635-aae4-41f4-880`
- **Cloud Run Service:** `arrangement-gps`
- **Region:** `europe-west1`
- **Access:** `member`
- **Production URL:** Assigned by Cloud Run on the first deployment; must be recorded here from `gcloud run services describe` before the release is marked complete.
- **Deployment Command:**
  ```bash
  gcloud run deploy arrangement-gps --source . --project project-62238635-aae4-41f4-880 --region europe-west1 --allow-unauthenticated
  ```
- **Security Model:** Firebase member authentication and a server-enforced limit of five generations per IP per UTC day.

## Remote Tool Target — Sensei

- **Product Slug:** `sensei`
- **Google Cloud Project:** `subverselab-project` — **not** `project-62238635-aae4-41f4-880`. Sensei is the one remote tool hosted outside the main project, and its absence from this registry is how a deployment ends up creating a second, competing `sensei` service in the main project while the real one goes stale. Verify with `gcloud run services list --project=subverselab-project` before deploying.
- **Cloud Run Service:** `sensei`
- **Region:** `europe-west1`
- **Access:** `member`, policy `member_no_product_quota` — no quota, no credits (`00_PLATFORM_INVARIANTS.md`).
- **Production URL:** `https://sensei-il7bu2xxqa-ew.a.run.app` (also reachable as `https://sensei-630319862116.europe-west1.run.app`). This is the value stored in `products/sensei.deployment.tool_url` and framed by the Tool Room; changing it means changing the manifest and Firestore together (`05_SYNC.md`).
- **Firestore Project:** `project-62238635-aae4-41f4-880`. The service is hosted in one project and writes its data to another; `FIREBASE_PROJECT_ID` / `VITE_FIREBASE_PROJECT_ID` must both be set to the data project on every deployment, or member ID tokens fail verification and generations are written nowhere.
- **Deployment Command:**
  ```bash
  gcloud run deploy sensei --source . --project subverselab-project --region europe-west1 --allow-unauthenticated --set-env-vars FIREBASE_PROJECT_ID=project-62238635-aae4-41f4-880,VITE_FIREBASE_PROJECT_ID=project-62238635-aae4-41f4-880
  ```
- **Verification Command:**
  ```bash
  curl -s https://sensei-il7bu2xxqa-ew.a.run.app/api/tools/drum-generator/health
  ```
- **Security Model:** No sign-in of its own. The website mints a short-lived custom token and hands the session across (`03_VALIDATION.md`, "Session handoff to a member remote tool"); the tool verifies membership server-side on generation, variation, and export.

## Remote Tool Target — SynthPulse

- **Product Slug:** `synthpulse`
- **Google Cloud Project:** `subverselab-project` — like Sensei, outside the main project. Verify with `gcloud run services list --project=subverselab-project` before deploying.
- **Cloud Run Service:** `synthpulse`
- **Region:** `europe-west1`
- **Access:** `member`, policy `member_no_product_quota` (approved 2026-08-24), gated operations `generate`, `evolve`, `export`.
- **Production URL:** `https://synthpulse-il7bu2xxqa-ew.a.run.app` — the value stored in `products/synthpulse.deployment.tool_url`.
- **Firestore Project:** `project-62238635-aae4-41f4-880`. Hosted in one project, writing to another; `FIREBASE_PROJECT_ID` / `VITE_FIREBASE_PROJECT_ID` must both name the data project on every deployment.
- **Deployment Command:**
  ```bash
  gcloud run deploy synthpulse --source . --project subverselab-project --region europe-west1 --allow-unauthenticated --set-env-vars FIREBASE_PROJECT_ID=project-62238635-aae4-41f4-880,VITE_FIREBASE_PROJECT_ID=project-62238635-aae4-41f4-880
  ```
- **Verification Command:**
  ```bash
  curl -s https://synthpulse-il7bu2xxqa-ew.a.run.app/api/tools/synthpulse/health
  ```
- **Security Model:** No sign-in of its own; the website hands the session across (`03_VALIDATION.md`). Generation, evolution and export are server endpoints, not bundle functions — this service was nginx serving a static bundle until 2026-08-24, which made its access model unenforceable by construction.
- **Collections:** `synthpulse_generations`, `synthpulse_exports`, and `synthpulse_model/ranking-v1` — one shared ranking model trained on downloads.

## Remote Tool Target — Subverse Mix Check

- **Product Slug:** `subverse-mix-check` — **note the service is named differently**: `subverse-mix-analyzer`. Deploying by product slug finds nothing.
- **Google Cloud Project:** `subverselab-project`, region `europe-west1`. Like Sensei and SynthPulse, hosted outside the main project.
- **Cloud Run Service:** `subverse-mix-analyzer`
- **Production URL:** `https://subverse-mix-analyzer-630319862116.europe-west1.run.app`
- **Access:** `member`. The session handoff is implemented in `subverse/web/app.js`, which loads as a `defer` script so its message listener exists before the Tool Room's `onLoad` post — it also queues a token that arrives before Firebase is ready.
- **Deployment Command:**
  ```bash
  gcloud run deploy subverse-mix-analyzer --source . --project subverselab-project --region europe-west1 --allow-unauthenticated
  ```
- **Stack:** Python, not Node. The web client is plain JS under `subverse/web/`, not a Vite bundle, so there is no `npm run build` step and no `dist/`.

## Remote Tool Target — Subverse Splitter

- **Product Slug:** `subverse-splitter`. The Cloud Run service carries the same
  name, unlike Mix Check.
- **Google Cloud Project:** `subverselab-project`, region `europe-west1` — with
  Sensei, SynthPulse and Mix Check. Arrangement GPS and Time & Frequency Sync
  live in `project-62238635-aae4-41f4-880`; deploying this one there by copying
  the wrong command creates a second service rather than an error.
- **`FIREBASE_PROJECT_ID` is `project-62238635-aae4-41f4-880`**, which is *not*
  the project the service runs in. That is deliberate and correct: tokens are
  issued by the Firebase project, the container runs in the other one. Mix Check
  is configured the same way. A mismatch here fails as `CREDENTIAL_MISMATCH` at
  the moment a member signs in, not at deploy time.
- **Cloud Run Service:** `subverse-splitter`
- **Access:** `member`. No sign-in of its own; the website hands the session
  across. Every route that produces or returns audio verifies the ID token, and
  a job is bound to the member who created it — a job id is not a bearer token.
- **Runtime settings, and why each one is load-bearing:**

  | Flag | Value | Reason |
  |---|---|---|
  | `--memory` | `8Gi` | Measured: a six-minute track peaks at ~1.1 GB in the engine, ~2 GB in the ONNX session and ~0.35 GB of stems on a memory-backed `/tmp`, plus a 300 MB upload. 4Gi leaves no headroom and an OOM kill costs the visitor their daily run. |
  | `--cpu` | `8` | Billing is per vCPU-second, so 8 vCPU for 60 s costs about what 2 vCPU for 240 s costs — and only one of them finishes inside a sensible wait. |
  | `--concurrency` | `1` | A second separation on one instance is how the container gets OOM-killed, not how it goes faster. |
  | `--max-instances` | `2` | **Not a preference — a quota ceiling.** `CpuAllocPerProjectRegion` in this region is 20 vCPU; at 8 vCPU per instance, 3 instances request 24 and the deploy is rejected outright. |
  | `--no-cpu-throttling` | — | The separation runs on a background thread. Cloud Run's default allocates CPU only while a request is in flight, so between two-second polls the worker would be throttled to near-nothing. Without this the tool appears to hang. |
  | `--use-http2` | — | The container serves h2c via Hypercorn. Cloud Run's HTTP/1 request ceiling is 32 MiB; the advertised 300 MB upload is only real over HTTP/2. |
  | `--timeout` | `900` | The browser polls, so this only has to outlast one poll. A generous ceiling costs nothing. |

- **Deployment Command:**
  ```bash
  gcloud run deploy subverse-splitter --source . \
    --project subverselab-project --region europe-west1 --allow-unauthenticated \
    --memory 8Gi --cpu 8 --concurrency 1 --timeout 900 \
    --min-instances 0 --max-instances 2 --no-cpu-throttling --use-http2
  ```
- **Secret:** `IP_HASH_SECRET` from Secret Manager, secret `splitter-ip-hash-secret`
  in `subverselab-project`. Deliberately not shared with Mix Check's secret:
  a shared salt would make the same address hash identically in both tools'
  quota collections. **Secret Manager had to be enabled on this project first** —
  it was not, despite Mix Check using a secret there.
- **Stack:** Python 3.11 + FastAPI served by Hypercorn, with a Vite/React front
  end built in a first Docker stage. The 302 MB `htdemucs.onnx` is baked into
  the image and its SHA-256 is verified during the build
  (`68d0bf16428ef66e692cdff8a9ccf28f1ef3f69440d57e58605a4cc55fcc5e74`), so a
  truncated or swapped model fails the build rather than the first separation.
- **Collections:** `daily_separation_quotas`.

## Loom — not deployed here, but published here

Loom has no Cloud Run service and never will: it is an MCP server and an Ableton
extension that run on the reader's own machine. It appears in this registry
because three things about it are published and have to be findable.

- **Page:** `subverselab.com/loom` — a route in the website, not a product
  (`02_PRODUCT_CREATION.md`, "Not everything published is a product"). It ships
  with the site's own Cloud Run deploy. Navbar link, footer link, sitemap entry
  and a prerendered body; a `Loom` section in `faqContent.js` puts the same
  answers on `/help`.
- **Source:** `github.com/senolsahan037-oss/loom`, public.
- **MCP Registry:** `io.github.senolsahan037-oss/loom`, status active,
  distributed as an `.mcpb` bundle attached to a GitHub release. Republish with
  `mcp-publisher publish` after `mcp-publisher login github`; the bundle is
  rebuilt by `packaging/build_mcpb.py` in the Loom repo and its SHA-256 goes in
  `server.json`.

**The URL cannot move.** `https://subverselab.com/loom` is named as the canonical
home in `CITATION.cff`, `NOTICE`, the MCP server's `serverInfo`, the `_source`
field on every tool answer and 215 published source files. Changing the route
breaks all of them retroactively.

The namespace is the GitHub account because that is what can be authenticated
from this machine. `com.subverselab/loom` is the on-brand name and stays
available — it needs a TXT record on the **apex** of subverselab.com, and that
DNS is at the registrar, not in the Cloud project. If it is ever taken, the
`mcp-name` line in Loom's README has to move with it.

A PyPI distribution (`subverselab-loom`) builds from the same staging and is
ready, unpublished: there is no PyPI account. MCPB was chosen for that reason,
not because PyPI failed.

## Social Publish Service

- **Google Cloud Project:** `project-62238635-aae4-41f4-880`
- **Cloud Run Service:** `social-publish`
- **Region:** `europe-west1`
- **Access:** Internal only — admin-authenticated (`admin: true` Firebase custom claim) for `/api/*`, a shared `X-Cron-Secret` header for `/internal/*`. Not linked from the public website.
- **Purpose:** Publishes AI-generated images/videos to SubverseLab's YouTube and Instagram channels. Images go to Instagram only; videos go to YouTube + Instagram (Reels). Draft/approval/scheduling state lives in Firestore (`social_publish_queue`, `social_publish_config`) since Instagram's Graph API has no real draft concept.
- **Production URL:** Assigned by Cloud Run on first deployment; must be recorded here from `gcloud run services describe` before the service is considered deployed.
- **Deployment Command:**
  ```bash
  gcloud run deploy social-publish --source . --project project-62238635-aae4-41f4-880 --region europe-west1 --env-vars-file env.yaml --allow-unauthenticated
  ```
- **Verification Command:**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" https://<service-url>/health | grep "200"
  ```
  Unlike `metadata-sync-service`, this service defines a real `GET /health` route that returns 200 — do not apply that service's "404 is healthy" quirk here.
- **Scheduled Publishing:** A Cloud Scheduler job hits `POST /internal/run-scheduled-publish` (with `X-Cron-Secret`) on an interval to auto-publish drafts whose `scheduledFor` time has passed. Job name/schedule must be recorded here once created.

## Duplicate services — cleared 2026-08-24

Cloud Run service names are unique per project, not per account, so the same name in two projects is legal and silent. Three such pairs existed, and every one of them was a deploy target that would have accepted a push and changed nothing a user could see:

| Name | Kept | Deleted |
|---|---|---|
| `subverselab-site` | `project-62238635-aae4-41f4-880` / `europe-west1` — domain-mapped, live | `subverselab-project` / `europe-west1` — a working, publicly reachable copy of the site from 2026-08-10, no domain mapping |
| `metadata-sync-service` | `subverselab-project` / `europe-west1` | `project-62238635-aae4-41f4-880` / `us-central1`, from 2026-08-07 |
| `zen2b2` | `project-62238635-aae4-41f4-880` / `us-central1` — `zen2b2.com` maps here | same project / `europe-west1`, from 2026-07-26 |

Also removed: Sensei's four pre-rewrite revisions and their container images, and the unmounted `sensei-gemini-api-key` secret.

Before deploying any service in this registry, confirm the project **and** region from its entry. A deployment that reports success while the live site is unchanged is the signature of this class of mistake — check which service you actually updated before assuming a caching problem.

## Firebase

- **Project:** `project-62238635-aae4-41f4-880` (live-verified via `gcloud firestore databases list` / `gcloud storage buckets list`, 2026-08-07 — not `subverselab-project`, where Firestore is disabled and no Firebase Storage bucket exists)
- **Firestore:** `(default)` database in `project-62238635-aae4-41f4-880` (Native mode, `europe-west1`)
- **Storage Bucket:** `project-62238635-aae4-41f4-880.firebasestorage.app`
- **Authentication:** Managed by Firebase Auth in `project-62238635-aae4-41f4-880`

## Metadata Sync

- **Service:** `metadata-sync-service`
- **Google Cloud Project:** `subverselab-project`, region `europe-west1` — the same project that hosts Sensei, not the main project. A second, stale copy used to sit in `project-62238635-aae4-41f4-880` / `us-central1`; it was deleted on 2026-08-24. If a `metadata-sync-service` ever appears in the main project again, it is a mistake, not a fallback.
- **API URL:** `https://metadata-sync-service-il7bu2xxqa-ew.a.run.app`, also addressable as `https://metadata-sync-service-630319862116.europe-west1.run.app`, which is the form `VITE_METADATA_SYNC_API_URL` uses in subverselab-v2's `.env`. Both resolve to the service above; changing one without the other is drift.
- **Firestore / Storage Project:** `project-62238635-aae4-41f4-880`, set through `env.yaml` (`GOOGLE_CLOUD_PROJECT`, `FIREBASE_STORAGE_BUCKET`). Hosted in one project, writing to another — the same split as Sensei.
- **Deployment Command:**
  ```bash
  gcloud run deploy metadata-sync-service --source . --project subverselab-project --region europe-west1 --allow-unauthenticated --env-vars-file env.yaml
  ```
  `--env-vars-file env.yaml` is not optional: deploying without it drops `ALLOWED_ORIGINS` and the Admin Panel's sync calls start failing CORS.
- **Dependencies:** Google Cloud Storage bucket events, Firestore.

## Resolved 2026-08-24 — the `subverselab-site-cloud` question

`Infrastructure/CloudRun/subverselab-v2/README.md` used to call that project a scratch environment and name `subverselab-site-cloud` as the real production frontend. Settled by measurement, not by preference:

- No GCP project and no Cloud Run service named `subverselab-site-cloud` exists, in any project.
- The `subverselab.com` domain mapping resolves to `subverselab-site` in `project-62238635-aae4-41f4-880` / `europe-west1` — the service this registry already names, deployed from `subverselab-v2`.
- A local `~/subverselab-site-cloud` folder did exist: the pre-v2 site, 375 files last touched 2026-08-06, carrying its own `Dockerfile`, `.env` and `.gcloudignore` — a fully deployable second copy. Archived to `Archive/legacy/2026-08-24_subverselab-site-cloud.zip` (sample-pack content included, the duplicated Splitter binary excluded) and deleted.

The README has been corrected. The lesson worth keeping: the hazard was never the stale folder on its own, it was a stale folder plus documentation telling you it was production. Either alone is survivable; together they make deploying to the wrong place the *documented* behaviour.
