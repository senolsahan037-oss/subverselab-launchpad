<!-- GENERATED FILE — DO NOT EDIT.
     This file is a generated mirror. Canonical source (repo root):
       - Rules/08_DEPLOYMENT_REGISTRY.md
     Regenerate: node Scripts/sync-agent-rules.js
     Verify:     node Scripts/verify-agent-rules-sync.js
     Hand-edits here will be silently overwritten on next generation, and will fail verification until then. -->

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

## Firebase

- **Project:** `project-62238635-aae4-41f4-880` (live-verified via `gcloud firestore databases list` / `gcloud storage buckets list`, 2026-08-07 — not `subverselab-project`, where Firestore is disabled and no Firebase Storage bucket exists)
- **Firestore:** `(default)` database in `project-62238635-aae4-41f4-880` (Native mode, `europe-west1`)
- **Storage Bucket:** `project-62238635-aae4-41f4-880.firebasestorage.app`
- **Authentication:** Managed by Firebase Auth in `project-62238635-aae4-41f4-880`

## Metadata Sync

- **Service:** `metadata-sync-service`
- **API URL:** `https://metadata-sync-service-il7bu2xxqa-ew.a.run.app`
- **Dependencies:** Google Cloud Storage bucket events, Firestore.

## Open question — not resolved by this restructure

`Infrastructure/CloudRun/subverselab-v2/README.md` describes this same project as a scratch/development environment and names a separate, absent project (`subverselab-site-cloud`) as the real production frontend. This registry reflects what `deployment.md`/`deployment_registry.md` state; it has not been reconciled with that README's claim. **Do not deploy based on an assumption about which is correct — confirm with the repository owner first.**
