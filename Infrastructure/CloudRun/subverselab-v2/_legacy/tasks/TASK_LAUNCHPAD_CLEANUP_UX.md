# Task: Launchpad rules cleanup + subverselab.com light mode and /plugins UX

Owner: Şenol (report in Turkish, short, with numbers). A lead Claude session in the desktop app manages this task and will verify your results; your "done" is a claim until it does.

Read first: `/Users/senolsahan/Desktop/SubverseLab-Launchpad/CLAUDE.md` (standing rules, newest), then this file.

## Hard limits
- RELEASE FREEZE until 1 Nov 2026. No deploy, no `gcloud`, no `firebase deploy`, no commit, no push. Local changes only; when done, list them under a new "QUEUED" section in `RELEASE_QUEUE.md`.
- The working tree already has many uncommitted changes (site files, plugin images, manuals). Do not revert, stash, reformat or overwrite them. Touch only what this task needs.
- Do not kill the owner's running apps. No `screencapture` of the screen; use headless browser screenshots of the local dev/preview server only.
- No "AI", "beta", "machine learning" in UI copy. Product names ASCII.

## Phase 1 — audit, NO edits (report back, then stop and wait)
A. Stale rules. The focus moved to building, publishing and selling plugins; the docs did not follow. Compare:
   `CLAUDE.md` (Oct, current) vs `Rules/*.md` (Aug), `Rules/INDEX.md`, `README.md`, `MAP.md`, `CHANGELOG.md`, `launchpad.json`,
   `.claude/` and `Infrastructure/*/.agents/rules/` if present.
   For each file: still true / partly stale / obsolete, with the exact lines that contradict CLAUDE.md or reality
   (e.g. `/tools/:slug` manifest pipeline vs today's plugin rooms in `src/data/plugins.js`, retired 1,000-download rules, Codex/Gemini lanes).
   Propose: what to keep, merge into CLAUDE.md, move to `_arsiv/`, or rewrite. Do not move or delete anything yet.
B. Light mode readability on the site (`src/`). Run the site locally (`npm run dev` or build + preview), screenshot every main route
   (/, /plugins, /plugins/<each room>, /account, /launch, /learn) in light AND dark, desktop 1440 and mobile 375.
   Measure contrast of text vs background (WCAG AA: 4.5:1 body, 3:1 large); list each failing element with the CSS selector/token,
   the two colours and the ratio. Find the root cause (hard-coded dark-only colours, missing light tokens, images/cards with dark backgrounds, etc.).
C. /plugins page and product cards. Describe the current flow (what a visitor sees, in what order, how many clicks to buy/download,
   free vs paid vs family bundle vs owned states). List what is confusing: inconsistent card layouts, too many badges/buttons,
   mixed messages, duplicated info. Propose a simpler card and page structure (one sketch per option, max 2 options) with reasoning.

Write the Phase 1 report to `docs/AUDIT_2026-10-15.md` (screenshots under `docs/audit_2026-10-15/`), then STOP and tell the lead session it is ready.

## Owner decisions (2026-10-15, after reading docs/AUDIT_2026-10-15.md)
1. /plugins: **Option B** — cards are links only; buying and downloading live in ONE room template (merge the three diverged room templates; owner gets one-click download in the room).
2. Rules: **the proposed structure** from the audit — move 00, 01, 02, 04, INDEX, ROADMAP_3YR, `_legacy/`, `_sync/`, root CHANGELOG.md, launchpad.json, `execution` into `_arsiv/rules_2026-10/` (move with `git mv` or `mv`, never delete); write Rules/README.md, SITE_RUNBOOK.md, DEPLOYMENT_REGISTRY.md (updated), FAILURE_LOG.md (+ PLATFORM_INCIDENTS.md), BROWSER_TOOLS.md; add the 6 still-valuable rules and the plug-in release gate to CLAUDE.md (keep every existing CLAUDE.md line). Rewrite root README.md, MAP.md and subverselab-v2/README.md. Stop shipping `.agents` in the Dockerfile (local change, queued). Do NOT touch `.claude/worktrees`, `git worktree`, memory files or `.claude/settings*.json` — list those as owner actions in the report.
3. Timing: everything **local**, gate green, listed under a QUEUED section in RELEASE_QUEUE.md. No deploy (freeze until 1 Nov). Also flag the 4 "until 1 November" launch-price strings as a 1 Nov deploy item.
Order: light-mode token/contrast fixes first (smallest, independent), then /plugins B, then rules. Report after each of the three with numbers, then continue.

## Phase 2 — only after the owner picks the direction
Implement the approved fixes locally. Gate: `npm run lint` 0 errors, build OK (check route count 43 and sitemap 32), every `scripts/test-*.js` green,
`scripts/check-responsive.js`, before/after screenshots light+dark, contrast re-measured. Update `RELEASE_QUEUE.md` (QUEUED, not deployed) and the
rules files as approved.
