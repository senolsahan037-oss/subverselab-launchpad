# subverselab.com split: site / api / media — cut-over runbook

Status: **written, not executed.** Release freeze until 1 Nov 2026. Every command below is an owner-go action
(deploy, bucket, DNS, Lemon Squeezy). Project, region and service names come from `Rules/DEPLOYMENT_REGISTRY.md`.
Owner decision behind it: RELEASE_QUEUE.md, "PARKED 2026-10-08 — split the site" (same pattern as the browser tools,
not Firebase Hosting, pages not iframed).

```
P=project-62238635-aae4-41f4-880   R=europe-west1
```

## What is in the tree now

| Part | Where | Image holds | Deploys when |
|---|---|---|---|
| `subverselab-site` | `server.js`, `Dockerfile`, `build.env` (root) | `dist/` + a 280-line static server; runtime deps express + compression only | page / copy / layout changes |
| `subverselab-api` (new) | `api/` (`server.js`, the six business modules, `tester-agreements/`, own `package.json` + lock, `Dockerfile`) | every `/api/*` route, unchanged business logic | backend changes, batched, full test suite |
| media | `public/plugins`, `public/social`, `public/press` (stay in the repo; local dev serves them from disk) | bucket, behind `VITE_MEDIA_BASE` | upload only, no container |

Config, all in one place each:

- `build.env` (site build): `VITE_API_BASE`, `VITE_MEDIA_BASE`. Both empty = today's single service. The Dockerfile sources
  it before `npm run build` (`gcloud run deploy --source` cannot pass build args).
- site service env: `API_PROXY_ORIGIN` (forward `/api/*` there; empty = `/api/*` is a JSON 404), `API_PROXY_AUDIENCE`
  (default `https://api.subverselab.com`).
- api service env: everything the site service has today (list in step 2) plus `PUBLIC_API_ORIGIN`,
  `SITE_PROXY_CALLERS`, `SITE_PROXY_AUDIENCE`, `CORS_ORIGINS`.

### Why the site keeps answering `/api/*` (permanently, not only during the switch)
`01_AI_Tools/subverselab-plugin-common/Licensing/License.h:45` compiles `https://subverselab.com/api/license/` into the
plug-ins (also SEDA / ADALET `LicenseConfig.h`). Shipped binaries cannot be repointed, so `subverselab.com/api/license/*`
must answer for as long as those builds are in use. The site therefore streams every `/api/*` request to the API
(`API_PROXY_ORIGIN`): raw body (the Lemon Squeezy signature still matches), streamed responses (installers), status and
headers unchanged.

Forwarded calls would all arrive from the site's address, and the API's per-address limits (licence 30/min, downloads
30/min, …) would trip for every user at once. So the site sends the caller's address in `X-SVL-Client-IP` with its own
Google identity token in `X-SVL-Proxy-Token` (minted from the metadata server; no stored secret). The API believes the
address only when the token is Google-signed for `SITE_PROXY_AUDIENCE` and its e-mail is in `SITE_PROXY_CALLERS`.
A client cannot inject either header: the site strips both before setting its own (covered by `scripts/test-split.js`).

## 0. Gate (before any step)
```bash
npm run lint
npm run build                                   # same-origin build (build.env empty)
for t in scripts/test-*.js; do node $t || break; done          # 9 scripts incl. test-split
VITE_API_BASE=https://api.subverselab.com VITE_MEDIA_BASE=https://storage.googleapis.com/subverselab-media npm run build
node scripts/test-split.js && node scripts/test-pages.js        # split build
```
Then restore the same-origin build if the next deploy is not the split (`npm run build`).

## 1. Service account for the site (recommended)
The site no longer touches Firestore or buckets. Give it its own empty identity so the API can tell it apart from the
tool services (which run as the default compute account and are on `CREDITS_ALLOWED_CALLERS`):
```bash
gcloud iam service-accounts create subverselab-site-web --project $P --display-name "subverselab-site (pages only)"
SITE_SA=subverselab-site-web@$P.iam.gserviceaccount.com
```
No roles are needed: minting its own identity token from the metadata server needs none.

## 2. Deploy `subverselab-api`
Copy the env of the live service (values never go into the repo; write the file outside the tree):
```bash
gcloud run services describe subverselab-site --project $P --region $R --format export > /tmp/site-live.yaml
# take spec.template.spec.containers[0].env from it into /tmp/api-env.yaml (YAML map NAME: value), including any
# valueFrom secret references as they are. Names in use (from the code): LEMONSQUEEZY_WEBHOOK_SECRET, LS_PRODUCT_SLUGS,
# LS_FAMILY_PRODUCT_ID, LS_FAMILY_VARIANT_ID, LS_BUNDLE4_PRODUCT_ID, LS_BUNDLE4_VARIANT_ID, DOWNLOAD_TICKET_SECRET,
# ACCOUNT_HASH_SECRET, CREDITS_ALLOWED_CALLERS, CREDITS_AUDIENCE (keep it unset/'https://subverselab.com': the tools mint
# their tokens for that audience), LAUNCH2_CAP, GOOGLE_CLOUD_PROJECT.
# add:
#   PUBLIC_API_ORIGIN: https://api.subverselab.com
#   SITE_PROXY_CALLERS: subverselab-site-web@project-62238635-aae4-41f4-880.iam.gserviceaccount.com
#   SITE_PROXY_AUDIENCE: https://api.subverselab.com
#   CORS_ORIGINS: https://split---subverselab-site-<hash>-ew.a.run.app     (the site tag URL of step 5; remove after)
```
A brand-new service cannot be created with `--no-traffic`; it is safe because nothing points at it yet:
```bash
gcloud run deploy subverselab-api --source api --project $P --region $R --allow-unauthenticated \
  --service-account 630319862116-compute@developer.gserviceaccount.com \
  --env-vars-file /tmp/api-env.yaml --timeout 3600 --min-instances 0 --cpu-throttling --memory 512Mi
```
Same identity as the site today, so Firestore, `gs://subverselab-downloads` (read + V4 signed upload URLs for the admin
build upload) and Firebase Auth keep working with no IAM change. Later deploys of the API use `--no-traffic --tag <name>`.

Check on the `run.app` URL (`A=https://subverselab-api-<hash>-ew.a.run.app`):
```bash
curl -s $A/api/download/manifest | head -c 200                                    # 200, the plug-in list
curl -s -o /dev/null -w '%{http_code}\n' -H 'Origin: https://subverselab.com' $A/api/launch/codes?launch=launch   # 200
curl -s -D - -o /dev/null -H 'Origin: https://subverselab.com' $A/api/launch/codes?launch=launch | grep -i access-control-allow-origin
curl -s -o /dev/null -w '%{http_code}\n' -H 'Origin: https://evil.example' $A/api/launch/codes?launch=launch    # 403
curl -s -D - -o /dev/null -X OPTIONS -H 'Origin: https://subverselab.com' \
  -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: authorization,content-type' $A/api/download/ticket  # 204 + Allow-Headers
curl -s -o /dev/null -w '%{http_code}\n' -X POST $A/api/lemonsqueezy/webhook -d '{}'   # 401 (bad signature), not 503
curl -s -X POST -H 'Content-Type: application/json' $A/api/license/validate -d '{"license_key":"SVL-0000-0000-0000-0000","instance_id":"x"}'  # {valid:false…}
curl -s -o /dev/null -w '%{http_code}\n' $A/plugins/kubbe                          # 404 JSON: the API has no pages
```

## 3. `api.subverselab.com`
```bash
gcloud beta run domain-mappings create --service subverselab-api --domain api.subverselab.com --project $P --region $R
```
DNS (owner, at the registrar): `api  CNAME  ghs.googlehosted.com.` Wait for the certificate
(`gcloud beta run domain-mappings describe --domain api.subverselab.com …` → `CertificateProvisioned True`; 15–60 min).
Re-run the step-2 checks against `https://api.subverselab.com`.

## 4. Media bucket
Proposed name `gs://subverselab-media` (same pattern as `gs://subverselab-promo`: public read, uniform access).
```bash
gcloud storage buckets create gs://subverselab-media --project $P --location $R --uniform-bucket-level-access
gcloud storage buckets add-iam-policy-binding gs://subverselab-media --member allUsers --role roles/storage.objectViewer
# Names like card-bg.webp are replaced in place, so not "immutable": a day for images, an hour for PDFs and the zip.
gcloud storage rsync -r public/plugins gs://subverselab-media/plugins --cache-control "public, max-age=86400"
gcloud storage rsync -r public/social  gs://subverselab-media/social  --cache-control "public, max-age=86400"
gcloud storage rsync -r public/press   gs://subverselab-media/press   --cache-control "public, max-age=3600"
gcloud storage objects update "gs://subverselab-media/plugins/**/*.pdf" --cache-control "public, max-age=3600"
```
**Bucket CORS is needed** (added 15 Oct): the rooms' "Hear it first" player loads its audio with `fetch()` + Web Audio
(`src/data/listen.js`, `public/plugins/*/audio/*.m4a`), which a cross-origin bucket must allow. Images and links alone would not need it.
```bash
cat > /tmp/media-cors.json <<'JSON'
[{"origin": ["https://subverselab.com", "https://www.subverselab.com"], "method": ["GET", "HEAD"],
  "responseHeader": ["Content-Type", "Content-Length", "Accept-Ranges"], "maxAgeSeconds": 3600}]
JSON
gcloud storage buckets update gs://subverselab-media --cors-file /tmp/media-cors.json
# (add the site tag URL of step 5 to "origin" while testing on the tag, remove it after)
```
Check the audio: `curl -sI -H 'Origin: https://subverselab.com' https://storage.googleapis.com/subverselab-media/plugins/kubbe/audio/dry.m4a`
→ 200, `audio/mp4` (or `audio/x-m4a`), `access-control-allow-origin: https://subverselab.com`. The site's CSP already allows the media
origin in `connect-src` (server.js). Images: `curl -sI https://storage.googleapis.com/subverselab-media/plugins/kubbe/hero.webp`
→ 200, `image/webp`, the cache header. The split build fails if any path the site loads through `media()` is missing from
`public/` (`scripts/split-media.js`), so the rsync above covers everything the pages load.
Adding a screenshot later: put it in `public/plugins/<slug>/`, upload that one file, reference it with `media('/plugins/…')`;
a new file still needs a site deploy only because the page names it.

## 5. Site, split build, on a tag
```bash
# build.env:
#   VITE_API_BASE=https://api.subverselab.com
#   VITE_MEDIA_BASE=https://storage.googleapis.com/subverselab-media
gcloud run deploy subverselab-site --source . --project $P --region $R --allow-unauthenticated --no-traffic --tag split \
  --service-account $SITE_SA \
  --update-env-vars API_PROXY_ORIGIN=https://api.subverselab.com,API_PROXY_AUDIENCE=https://api.subverselab.com
```
`--timeout 3600` stays on the service (old installer links stream through the proxy). Check on the tag URL
(`S=https://split---subverselab-site-<hash>-ew.a.run.app`):
```bash
curl -s -o /dev/null -w '%{http_code}\n' $S/no-such-page                  # 404
curl -s $S/.well-known/security.txt | head -2                              # Contact:
curl -s $S/sitemap.xml | grep -c '<loc>'                                   # 33 (with /preset-packs)
curl -sI $S/ | grep -i content-security-policy | tr ';' '\n' | grep -E 'connect-src|img-src'   # api + media origins present
curl -s -X POST -H 'Content-Type: application/json' $S/api/license/validate -d '{"license_key":"SVL-0000-0000-0000-0000","instance_id":"x"}'  # proxied answer
du -sh of the image: compare with the previous revision in Artifact Registry
```
In a browser on the tag (needs the tag host in Firebase Auth "Authorized domains" for sign-in, and in the API's
`CORS_ORIGINS`): sign in, /account (plug-ins, licence keys, credits), a free download ticket (TABAN) → file downloads,
/testers + tester space, /admin loads (members, stats, testers), images on /plugins and a room come from
`storage.googleapis.com`, DevTools console has no CSP or CORS error. Light and dark.

## 6. Switch
```bash
gcloud run services update-traffic subverselab-site --project $P --region $R --to-tags split=100
```
From this moment pages call `api.subverselab.com` directly; everything that still uses `subverselab.com/api/*`
(plug-ins, the webhook, tools, open tabs) is forwarded.

## 7. Lemon Squeezy webhook (owner, in the LS dashboard)
Settings → Webhooks → change the URL to `https://api.subverselab.com/api/lemonsqueezy/webhook`; the signing secret stays
the same (`LEMONSQUEEZY_WEBHOOK_SECRET` is identical on the API). The old URL keeps working through the proxy, so there
is no window where an order is lost; LS retries a failed delivery up to three times anyway. Check: a test-mode $0 order
(TABAN) → the API log shows `lemonsqueezy webhook` 200 and the order appears in /admin Stats and the buyer's inbox.

## 8. Tool services and tester agents (later, no rush)
- Tools (`arrangement-gps`, …) call `subverselab.com/api/credits/*` server to server. Leave them; they are forwarded.
  If repointed to `api.subverselab.com`, keep `CREDITS_AUDIENCE` unchanged — it is a string the tokens are minted for,
  not the host they are sent to.
- Tester agents read the base URL from `/api/testers/agent/openapi.json`, which now says `PUBLIC_API_ORIGIN`.
- Plug-ins: PARKED — the next family update (November batch) can switch `svlApiBase` to `https://api.subverselab.com/api/license/`;
  the site forward stays regardless for older builds.

## 9. Clean-up after a week of clean logs
- Remove the API secrets from the site service: `gcloud run services update subverselab-site … --remove-env-vars LEMONSQUEEZY_WEBHOOK_SECRET,DOWNLOAD_TICKET_SECRET,ACCOUNT_HASH_SECRET,…`
  (the site code never reads them; old revisions keep their own env, so rollback still works).
- Remove the tag origin from the API's `CORS_ORIGINS`.

## Rollback (each one is a traffic or config change)
| What broke | Do |
|---|---|
| anything after step 6 | `gcloud run services update-traffic subverselab-site --project $P --region $R --to-revisions <previous revision>=100`. The previous monolith revision (00215 or whatever is live then) still serves `/api` itself with its own env and its own media. Seconds. |
| the API only | Same as above: the monolith revision does not use the API at all. The webhook URL may stay on `api.subverselab.com` only if the API is up; otherwise set it back to `https://subverselab.com/api/lemonsqueezy/webhook`. |
| media only | `build.env`: `VITE_MEDIA_BASE=` (empty), redeploy the site: media is back inside the image. |
| want same-origin pages on the new code | `build.env` both empty + `API_PROXY_ORIGIN` set: every call goes to `subverselab.com/api/*` and is forwarded. |

Keep in mind: a revision is a snapshot of the code at that time. Rolling back to 00215 also takes back any page change
deployed after it.

## What to watch (Logs Explorer, first 48 h)
- API errors: `resource.labels.service_name="subverselab-api" severity>=ERROR`
- Webhook: `resource.labels.service_name="subverselab-api" textPayload:"lemonsqueezy webhook"` and every LS delivery 200
  (LS dashboard → Webhooks → recent deliveries).
- Licence and limits: `httpRequest.status=429 resource.labels.service_name="subverselab-api"` — a jump on `/api/license/`
  means the proxy's client address is not believed (check `SITE_PROXY_CALLERS` matches the site's service account and the
  site log for `api proxy: no identity token`).
- CORS: `httpRequest.status=403 resource.labels.service_name="subverselab-api"` — an origin missing from the list.
- Proxy: `resource.labels.service_name="subverselab-site" textPayload:"api proxy"` and `httpRequest.status=502`.
- Cold start: request latency of the first request after idle on both services (both `--min-instances 0`).
- Downloads: `/api/download/file` 200 with large `responseSize` (ELEK: chunked above 30 MiB, `--timeout 3600`).

## Deploy rule split — proposal for CLAUDE.md (owner decides; not applied)
Replace the subverselab.com bullet under "Publishing and money" with:
- **Content and media** (site service, media bucket): a page, copy, image or manual change may be deployed when it is
  ready and has passed lint, build, `test-pages` and `test-split`, on the owner's go for that change. Media uploads to the
  bucket follow the same go. No batching required. The release freeze still applies until 1 Nov.
- **API** (`subverselab-api`): backend changes are batched, listed under NEXT DEPLOY in RELEASE_QUEUE.md, gated by every
  `scripts/test-*.js`, deployed with `--no-traffic --tag`, smoke-tested on the tag, then switched — only on the owner's
  explicit go. Firestore rules stay a separate release.
