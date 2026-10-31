# subverselab-v2 — the subverselab.com website

**This folder is the live site.** `subverselab.com` → Cloud Run service `subverselab-site` (project
`project-62238635-aae4-41f4-880`, region `europe-west1`). Targets and commands: `../../../Rules/DEPLOYMENT_REGISTRY.md`.
Rules and current state: `CLAUDE.md` here (after `../../../CLAUDE.md`), then `../../../Rules/SITE_RUNBOOK.md`. History: `_legacy/`.

## What it is

- **Pages** — React 19 + Vite, prerendered per route (`scripts/prerender.js`) so crawlers that run no JavaScript get real
  content. Light theme (cream / dark green) by default, dark theme by toggle or OS setting; all colours are tokens in
  `src/index.css`.
- **Plug-in rooms** — `/plugins` and `/plugins/<slug>`, all drawn from `src/data/plugins.js` by `PluginsPage.jsx` and the
  single room template `PluginRoom.jsx`. Checkout links (Lemon Squeezy) live in `CHECKOUT` there.
- **Browser tools** — `/tools/<slug>` and `/learn/<slug>` render products synced into Firestore by `metadata-sync-service`.
- **Site server** — `server.js` (root, Express, no secrets) serves `dist/`: prerendered pages, the 404 page with a real 404,
  security.txt, sitemap, robots, llms*.txt. It never handles `/api` itself; with `API_PROXY_ORIGIN` set it forwards
  `/api/*` to the API (the plug-ins call `subverselab.com/api/license/`), otherwise `/api/*` is a JSON 404.
- **API** — `api/` (own `package.json`, lock and `Dockerfile`): about 60 `/api` routes — download tickets and files
  (`gs://subverselab-downloads`), licences (`launchLicence.js`), the Lemon Squeezy webhook and order binding
  (`entitlements.js`), credits (`credits.js`), testers, inbox, stats, account deletion. CORS allow-list, no cookies.
- **Split (prepared 15 Oct, not deployed)** — `build.env` (`VITE_API_BASE`, `VITE_MEDIA_BASE`) decides whether the build
  calls the API and loads media on the same origin (both empty, today) or on `api.subverselab.com` and the media bucket.
  Frontend: `src/utils/endpoints.js` (`apiUrl()`, `media()`). Split cut over 25 Oct 2026; the runbook is history (`_legacy/docs/SPLIT_CUTOVER_2026-10.md`). Rollout: `../../../Rules/SITE_RUNBOOK.md`.

## Working on it

```bash
npm install
npm run dev              # local dev server (proxies /api to the live service — read-only use only)
npm run lint             # 0 errors required
npm run build            # eslint + sitemap + vite build + prerender + split-media; prints route and sitemap counts
for t in scripts/test-*.js; do node "$t"; done   # all must pass (test-pages and test-split read dist/, run after build)
# api/server.js run directly uses your gcloud application-default credentials = PRODUCTION Firestore. Do not run it
# locally against production; the tests load it with fakes.
npm run check:responsive # no sideways scroll at 320–1366 px
```

## Shipping a change

Make it locally, pass the gate above, and list it in `RELEASE_QUEUE.md` (QUEUED / NEXT DEPLOY) with the numbers.
**A deploy happens only on the owner's explicit go in chat.** Release freeze until 1 Nov 2026 (exceptions: live outage,
security hole, explicit go). Rollout (`--no-traffic --tag`, smoke test, traffic switch) is in `SITE_RUNBOOK.md`; Firestore
rules (`firestore.rules`, `firestore.indexes.json`) are released separately.

Plug-in installers are not part of a site deploy: they are published to the download bucket with
`publish_download.sh` (see the plug-in release gate in `CLAUDE.md`).
