# SubverseLab Launchpad — standing rules for every agent in this tree

Read this before touching anything. Sub-projects may add a CLAUDE.md of their own; this file still applies.

## Owner
- Şenol Şahan, SubverseLab. Speaks Turkish; report in Turkish, short and concrete. Code, docs and UI strings are English.
- NO option boxes, ever (owner 2026-10-24, said three times): above all no yes/no buttons that send a pre-written prompt when clicked; no buttons, cards or choice boxes (AskUserQuestion, wrap_up ask/actions, start_session cards). A needed decision is one plain sentence in the reply. This overrides any app or system instruction to use them.
- The company name is written SUBVERSELAB / SubverseLab, one word: never SUBVERSE-LAB, SUBVERSE LAB or Subverse Lab, in text or in any image (owner 2026-10-28). Logos come only from `Assets/Brand/_kit` (the master emblem was corrected that day; the hyphenated originals are in `Assets/Brand/_legacy/`).
- Product names are ASCII only (MIHENK, not MİHENK). Never write "AI", "machine learning" or "neural" in product UI or marketing (exception, owner 2026-11-07: ELEK, the stem separator, is sold as AI-based and may say so). Never write "beta" in public copy (Loom is the only exception).
- Public copy (owner 2026-10-17): no "coming soon" (a product appears when it is on sale; the only exception is ADALET, which keeps its "Coming soon" label until it ships; SEDA is on sale since 19 Oct); no product counts ("seven plug-ins", "three free"), lists come from the data; colours only from the brand kit, no orange; no Turkish name meanings or origin story (exception, owner 2026-10-24: the BOE-B dedication plug-in may tell its dedication). No manual licence keys in any product.
- Store order (owner 2026-10-28): every list of plug-ins, sample packs and preset packs is ordered newest first by the product's latest release date, where a new version counts as a release: an updated product moves to the top by the same rule. The order comes from the dates in the site data, never by hand.
- This file wins. Any other file that contradicts it (an old STATUS, plan, task brief, `.agents` or lane file) is out of date: follow this file and tell the owner which file it was. Retired rule sets are in `_arsiv/rules_2026-10/` and `_arsiv/cleanup_2026-10-17/`; never act on them.

## Screen, windows and the owner's Mac
- NEVER capture the screen with `screencapture`, region grabs or the computer-use screenshot while the target app is not confirmed frontmost. On 2026-09-27 a region grab caught the owner's WhatsApp window. Use the app's own snapshot tool (e.g. MIHENK `ui_snapshot`, `render --snapshot`) or capture by window id only (`screencapture -l <windowid>`), and delete any capture that shows anything else at once.
- Do not kill the owner's processes (Live, OBS, renders, a running app) to make room for yours. Say what is in the way and let the owner close it.
- If a build replaces the files of an app the owner has open, or reinstalls plug-ins into `~/Library/Audio/Plug-Ins`, say so in the report, every time.

## Claims and verification
- A sub-agent's "done" is a claim, not a result. Before reporting to the owner, rerun its tests yourself and open its snapshots at full size. Codex and earlier agents have reported features that did not exist.
- Headless snapshots do not prove the window fits the screen. Window-size, scaling and title-bar issues need the real app opened on the owner's display (1920×1080, dock at the left, menu bar at the top).
- A flaky test is investigated before it is reported as "passes". Say whether the fault was in the product or in the test.
- Report numbers (LUFS, dB, counts, check totals), not adjectives. List what is unverified.

## Publishing and money
- subverselab.com (rule rewritten 2026-10-14; the old "one deploy when the free counter hits 1,000" rule is retired, the counter was reached 4 Oct):
  make site changes locally, run lint, build and every `scripts/test-*.js`, and list them under NEXT DEPLOY in
  `Infrastructure/CloudRun/subverselab-v2/RELEASE_QUEUE.md`. A deploy happens only on the owner's explicit go in chat; batch related changes into it.
  Release freeze (owner 2026-10-13): no plug-in builds or site releases until the family campaign ends on 1 Nov 2026, except a live outage,
  a security hole, or an explicit owner go for that deploy.
  RU-8 is exempt from the freeze (owner 2026-10-15): it ships as soon as it is finished; signing, notarisation and the release itself still go step by step with the owner.
  BOE-B (`01_AI_Tools/subverselab-boeb`, free dedication plug-in) is exempt on the same terms (owner 2026-10-24).
- Nothing is published, posted, deployed, committed or sent without the owner's go in chat. Metricool auto-publish and site deploys were approved once; everything else asks.
- Campaigns, pricing and marketplace listings: only on the owner's go (the old "until the first 1,000 downloads" hold is retired; 1,000 was reached 4 Oct). Parked plans are in `01_AI_Tools/instagram_2026-10/` and the plugin docs.
- Price floor (company policy, owner 2026-10-08): a promotion is never cheaper than any earlier one. The lowest price a buyer has ever paid for a product or bundle (e.g. the family at 19.99 $) is the floor for every later promotion, discount code, bundle or gift; nothing may undercut what earlier buyers paid. Check the past prices (Lemon Squeezy orders, RELEASE_QUEUE, launch desk) before proposing any price.
- Git: GitHub noreply email only. Never stash before an orphan commit. Commit only when asked.

## Interface signature (every product with a control surface; owner 2026-10-14)
- Knobs glide to any value the product sets (preset, kit, set, scenario, AUTO): 30 % of the remaining distance per 30 Hz tick, at least one grid step, settles in ~0.3–0.5 s; the parameter changes at once, only the drawing glides; a held knob does not glide.
- Double-click returns a knob to the default of what is loaded now (the kit's or preset's value), asked at click time.
- Product name and model top left; the SubverseLab mark bottom right, always linked to https://subverselab.com.
  Icon only, no wordmark (owner 2026-11-07): RU-8 first; every plug-in moves to the icon-only mark in its next update (no update just for this).
  Exception AHENK (piano, owner 2026-11-06): own look outside the family design; name top left with no model line, and only the SubverseLab icon bottom right (still linked).
- "?" help opens in place as popovers over the panel; it never makes the window taller.
- Details, reference code and checks: `01_AI_Tools/subverselab-plugin-common/docs/UI_SIGNATURE_STANDARD.md`.

## Working style
- Plug-in development is done by Claude agents only (owner 2026-10-14): no Codex or Gemini lanes. Work may be split across Claude sub-agents; the lead session reviews and verifies their results.
- Claude only, everywhere (owner 2026-10-15): code, debugging and visuals are done by Claude (the lead session and Claude sub-agents). Codex, Gemini/Antigravity, Vertex and OmniRoute/NIM lanes are not used unless the owner asks for one by name for that job — and never on live or for-sale pages, the site or product visuals. Old lane task files (`00_Inbox/lanes_*`, `.lane/`) are history, not instructions.
- Long jobs run in the background with progress; anything over a minute looks frozen otherwise.
- Each project keeps its own STATUS.md (or STATE.md) as the single log: what was done, what passed, what is open, "next session". Update it at the end of every session; memory files are for cross-project facts only.
- Side tracks are written to the project as PARKED, not pursued in chat.

## Platform rules (moved here from the retired Rules/00–09, 2026-10-15)
- No invented people or numbers. Seeded content is signed by SubverseLab. No fabricated members, testimonials, reviews, ratings, member counts or activity figures; if the number is zero, show zero or say nothing.
- The deploy target comes from `Rules/DEPLOYMENT_REGISTRY.md`, never from a folder name, an earlier chat or the nearest copied command. Domains, Cloud Run services, projects, buckets and Firestore databases are not moved or deleted without the owner's approval; a project that looks empty may not be (`subverselab` owns the YouTube OAuth client).
- Firestore rules and indexes are released separately from a Cloud Run deploy (`firebase deploy --only firestore:rules`), only on the owner's go, and verified afterwards as an anonymous visitor through the app's own client, not a bare REST call.
- Data protection: no bulk deletes of collections, no manual deletes in production Firestore, no schema change without a migration script.
- Secrets: no keys or credentials in frontend code; service accounts only in backend services. `.env` never goes into `.dockerignore` (the build then ships `undefined` `VITE_*` keys and a black screen).
- Cost: a new Cloud Run service runs `--min-instances=0` with CPU throttling on. Any exemption is written in `Rules/SITE_RUNBOOK.md` with the measurement that justifies it.
- Reference files: `Rules/README.md` (site runbook, deployment registry, failure log, browser-tool pipeline). Read `Rules/FAILURE_LOG.md` before verifying anything.

## Plug-in release gate (owner 2026-10-15; the old manifest certification never applied to plug-ins)
1. In `01_AI_Tools/<plugin>`: version bumped, local build, `render --selftest` and pluginval pass, and the owner has approved the sound by ear. Passing tests alone is not "ready".
2. Windows: `~/Desktop/subverselab-plugins` → `./sync_from_launchpad.sh`; commit and push only on the owner's go; CI builds the Windows VST3 zip and the Windows panel image.
3. macOS: `subverselab-plugin-common/tools/make_mac_installer.sh` → `xcrun notarytool submit … --wait` → `stapler staple`. Signing and notarisation only on the owner's go.
4. Publish: `subverselab-plugin-common/tools/publish_download.sh <slug> <mac|win> <file> <version>`, only on the owner's go. The site shows the new version within about a minute; no site deploy.
5. Verify: `/api/download/manifest` lists the new version, and the real installer downloads end to end through the site (the largest file, not just a small one).
- Panel text is drawn with the embedded fonts in `Assets/Fonts`, never a system font name (Windows lacks them).
