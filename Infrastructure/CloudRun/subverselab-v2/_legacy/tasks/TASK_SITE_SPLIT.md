# Task: split subverselab.com into site / api / media (LOCAL build only)

Owner: Şenol (report in Turkish, short, with numbers). A lead Claude session manages this and verifies your results.
Start ONLY after TASK_LAUNCHPAD_CLEANUP_UX.md Phase 2 is finished and verified — both touch src/, server.js, Dockerfile and RELEASE_QUEUE.md.
Read first: `/Users/senolsahan/Desktop/SubverseLab-Launchpad/CLAUDE.md`, then RELEASE_QUEUE.md section "PARKED 2026-10-08 — split the site" (the owner's decision is there).

## Why
Today one Cloud Run container (`subverselab-site`) holds the Vite build (dist ≈ 96 MB, nearly all of it public/ media) and server.js
(≈ 2,700 lines, 63 routes: downloads, licences, LS webhook, credits, testers ×21, admin ×20, inbox, stats, account delete).
A typo or a new video rebuilds and redeploys the money path.

## Target (owner decision 8 Oct: same pattern as the browser tools, NOT Firebase Hosting, pages NOT iframed)
1. `subverselab-api` — new Cloud Run service, planned at `https://api.subverselab.com`. Every `/api/*` route plus the LS webhook,
   download streaming (keep the ELEK fix: Content-Length only ≤ 30 MiB, chunked above; `--timeout 3600`), licences, credits, testers,
   admin, inbox, stats, account delete. Auth = the Firebase ID token the site already sends (Authorization header, CORS allow-list:
   subverselab.com, www, localhost dev ports; no cookies). Secrets/env identical to today's service.
2. `subverselab-site` — pages only: static dist + prerender, 404 page with a real 404 status, security.txt, sitemap, robots, llms*.txt.
   No Firestore admin, no secrets. Must stay crawlable (prerendered HTML).
3. Media — product videos, screenshots, card art, manuals, social/press out of the container into a public bucket
   (pattern: existing `gs://subverselab-promo`) behind one config value `VITE_MEDIA_BASE`. Local dev serves the same paths from disk.
   Keep favicons, OG images and anything crawlers need at fixed URLs on the site itself.

## How
- Keep one repo/folder; suggested layout `api/` (server + its own Dockerfile + package.json) and the site at the root, or a clear
  equivalent. Move code, do not rewrite business logic. Shared helpers go in one place, not copied.
- Frontend: one `apiUrl()` helper (`VITE_API_BASE`, default `''` so today's same-origin still works) replacing the ~21 `/api` call sites.
- Transition safety: the site build must be able to run in BOTH modes (same-origin monolith and split) by env only, so the cut-over
  and a rollback are a config change, not a code change.
- Tests: every `scripts/test-*.js` must pass against the api service; add a CORS test (allowed origin OK, foreign origin refused,
  preflight for Authorization) and a site test (404 status, security.txt, sitemap count 32, no `/api` handled by the site).
- Run both locally (site + api on two ports, `VITE_API_BASE=http://127.0.0.1:<api>`), click through: sign in, /account, a free
  download ticket, the tester panel, admin page load. Screenshot light + dark.
- Measure and report: image sizes before/after (site image MB, api image MB), cold-start, build time per service.

## Hard limits
- RELEASE FREEZE until 1 Nov. No `gcloud`, no `firebase deploy`, no bucket upload, no DNS, no Lemon Squeezy change, no commit, no push.
- Write the cut-over as a runbook, not as actions: `docs/SPLIT_CUTOVER.md` — new service deploy with `--no-traffic --tag`,
  api.subverselab.com domain mapping, media upload + cache headers, LS webhook URL change (and keeping the old /api path answering
  during the switch), CORS check on the tag, rollback steps, what to watch in logs. Also the CLAUDE.md deploy-rule split proposal
  (content/media when ready; api batched) — as a proposal, owner decides.
- Uncommitted changes in the tree belong to the owner and earlier sessions: never revert or overwrite them.
- List under a QUEUED section in RELEASE_QUEUE.md with the full gate (lint, build, all tests, numbers). List everything unverified.
