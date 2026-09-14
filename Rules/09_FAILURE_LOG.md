# 09 — Failure Log

Canonical for: failures that reached production, why each one was invisible, and the check that catches it now.

This file is not a diary. Every entry is here because the bug **did not look like a bug** — the service reported healthy, the page returned 200, the build passed. Listing the bugs alone would be useless; what repeats is the *mechanism*, so the entries are grouped by mechanism and each one ends with the check that would have caught it.

All entries below were found on 2026-08-24, in one pass over three services that had been running for weeks.

---

## A. A fallback swallowed the failure

The most expensive class. Code catches an error, returns something plausible, and the failure becomes indistinguishable from "there is nothing here."

**A1 — Missing Firestore composite index emptied every guide page.**
`ArticlePage`'s related-guides query needs a `type + createdAt` composite index. It did not exist, so the query threw; `seoService.js` caught it and returned `[]`. The section rendered nothing and the page looked finished. The real loss was every internal link between guides — for readers and for crawlers alike. Fixed by creating the index; indexes are now versioned in `firestore.indexes.json` (see `00_PLATFORM_INVARIANTS.md` §4).
*Check:* a `where` plus an `orderBy` on a different field needs an index — add it to `firestore.indexes.json` in the same change. Load a page that runs the query and count the elements it should produce, not just its HTTP status.

**A2 — CORS rejection became a blank page via the SPA fallback.**
`cors()` mounted on the whole app rejected the tool's *own* assets, because Vite marks its script and stylesheet tags `crossorigin` and the browser sends an `Origin` header even same-origin. The rejection produced a 500, the SPA catch-all answered with `index.html`, the stylesheet arrived as `text/html`, and the module never executed. Sensei served a completely blank page while `/health` returned `ok`. Fixed by scoping CORS to `/api` in both tools (`06_DEPLOYMENT.md`).
*Check:* `curl -H "Origin: https://<tool-host>" .../assets/<file>.css` must return `200 text/css`. Without the header the bug is invisible.

**A3 — `deriveExcerpt` stripped HTML tags from Markdown.**
Guides are Markdown; the excerpt function only removed `<tags>`. Every guide's summary — the article hero *and* its meta description — began with the literal text `## Overview`. Six guides out of six. Fixed in `metadata-sync-service` and backfilled.
*Check:* read one generated excerpt per content type after a sync, as text.

---

## B. A contract only one side implemented

Two components agree on a handshake in comments and code review, and exactly one of them ships it.

**B1 — SynthPulse waited for a message the website never sent.**
The tool gated MIDI export behind an `AUTH_STATE_CHANGED` postMessage. That message appears nowhere in the website, including its build output. `isAuthed` could never become true, so export — the tool's only output — was unreachable for every visitor. Fixed by adopting the same session handoff Sensei uses (`03_VALIDATION.md`).

**B2 — The Tool Room disabled the handoff for one product by name.**
`usesIndependentToolAuth = slug === 'sensei'` set the iframe's `onLoad` to `undefined`, a leftover from when Sensei had its own login. After Sensei's login was removed, this line guaranteed the token was never posted.

**B3 — `access.public_shell: true` was declared and then ignored.**
Both tools declare a public shell and implement one. The Tool Room blocked the iframe entirely for signed-out visitors, so the shell never got to render: a product room with no product in it, which reads as broken rather than as locked.
*Check for B1–B3:* grep the **other** side for the message type, flag or field before believing a handshake exists. A contract implemented once is not a contract.

---

## C. The verification could not see the failure

Every one of these was "verified" before shipping. The verification was the wrong instrument.

**C1 — `curl` cannot see a CORS bug.** It sends no `Origin`, so the rejection never triggers and every asset returns 200. See A2.

**C2 — A desktop browser cannot see a responsive bug.** The site shipped with one media query. At 375 px the header ran 309 px past the viewport and everything after the first nav link was unreachable. It was never seen because whoever looked always had a wide window open. Now automated: `npm run check:responsive` (`06_DEPLOYMENT.md`), verified to fail as well as to pass.

**C3 — An HTTP 200 says nothing about whether the app mounted.** Sensei returned 200 with a correct `<title>` while `#root` had zero children.
*Check:* `document.getElementById('root').children.length > 0`.

**C4 — Checking one field is not checking the resource.** A secret was deleted after confirming no service referenced it — but the check read `spec.template.metadata.annotations` and the binding lived in `spec.template.spec.containers[0].env[].valueFrom.secretKeyRef`. The next deploy of `subverselab-site` failed. Live traffic was unaffected because the failed revision never took traffic.
*Check:* before deleting a shared resource, search the whole service description, not the field you expect.

---

## D. Configuration that existed only in the cloud

If it is not in the repository, nobody knows it is required and nothing can recreate it.

**D1 — Composite indexes** existed only as console state. Now in `firestore.indexes.json`, referenced from `firebase.json`.

**D2 — Deployment targets** were partly unrecorded. Sensei and SynthPulse are hosted in `subverselab-project` while writing Firestore in `project-62238635-aae4-41f4-880`; neither was in the registry, so the obvious guess — the main project — would have created a second, competing service while the real one went stale. Both are now in `08_DEPLOYMENT_REGISTRY.md` with the split spelled out.

**D3 — A stale duplicate of `metadata-sync-service`** sat in the main project in `us-central1`, pointed at by nothing. Deploying to it would have failed silently in the worst way: no error, no effect. Deleted, and the registry now names the duplicate so it is not recreated.

**D4 — A deployable copy of the previous website** (`~/subverselab-site-cloud`, with its own `Dockerfile` and `.env`) sat in the home directory, and the current repo's README named it as the live production project. Archived and deleted; the README corrected.

---

## E. A default that did not scale down

**E1 — `minmax(<fixed>, 1fr)` never shrinks.** A grid track with a fixed floor keeps that floor when the container is narrower, and overflows. A 480 px minimum in a 295 px column ran 145 px past the viewport. Write `minmax(min(480px, 100%), 1fr)`. Every fixed floor in the app was written the first way.

**E2 — A nowrap flex row has no failure mode except overflow.** The header put a brand, a 400 px search field, four links, a toggle and a button in one row with 40 px side padding, and simply drew outside the screen. Let rows wrap.

**E3 — Container images accumulate forever.** Every `gcloud run deploy --source` pushes an image and nothing removes it: ~37 GB across two repositories, 130 images for one service. Deleting a Cloud Run **service or revision does not free that storage**. Both `europe-west1` repositories now carry a cleanup policy (keep 10 most recent, delete older than 30 days).

---

## F. Copy that spoke for a product it did not own

**F1 — The Help page asserted a quota on behalf of a product that has none.**
"Each AI tool enforces its own daily quota" was false for a product under the approved no-quota policy, and that product may not correct it, because the same policy forbids discussing quotas at all. Shared surfaces now say a limit applies *where* one applies. See `00_PLATFORM_INVARIANTS.md` §5.

**F2 — robots.txt granted access and removed protection in the same stroke.**
Fifteen AI crawlers were named to welcome them. robots.txt groups do not inherit: a crawler obeys only its most specific matching group, so naming each bot also released it from the `Disallow` lines under `*`. All fifteen were being told explicitly that `/admin` and `/account` were open — the one thing the file existed to prevent. Every group now repeats the `Disallow` lines, and those two routes are additionally served `X-Robots-Tag: noindex, nofollow`, because `Disallow` stops fetching and not indexing.

---

## G. The machine was built and never connected

Every part exists, tests pass, and the product does not exist. This class hides
behind a green test suite, which is why it needs naming.

**G1 — A tool with 30 passing tests, a Dockerfile and a cover, never deployed.**
Subverse Splitter's server, front end, guide, cover and favicons were written
and all its tests passed. There was no Cloud Run service. `gcloud run services
list` was the whole check and it had not been run.

**G2 — The manifest still described the product being replaced.**
While the web tool sat undeployed, `00_Inbox/Remote/subverse-splitter/manifest.json`
still declared `content_type: "pack"`, `provider: "standalone"`,
`iframe_compatible: false` and two desktop download actions. The website could
not have opened the web tool even if it had been deployed — it had never been
told the tool existed.

**G3 — The built bundle was older than the source.**
`src/main.jsx` was edited after the last `npm run build`, so the deployable
artifact did not contain the last changes. Nothing warns about this; the build
output simply stays where it was.
*Check for G1–G3:* a feature is not finished when its tests pass. Finished is:
the service answers on its production URL, the manifest points at that URL, and
the bundle you fetched from that URL contains the code you last wrote. Fetch it
and grep it.

## H. A shared component rebuilt locally

A pattern is standardised across several products, and the next product
reimplements a thin version of it because reimplementing was quicker than
finding it.

**H1 — The members wall became one sentence.**
Five tools had been brought to one door — the same card, the same brand mark,
the same "Members only", the same free-account note, the same guide link. The
sixth shipped `<p>Sign in is required to use this tool.</p>` with a button. It
satisfied every functional test: no local login, correct `request-sign-in`
message, right class names. It was still a sixth dialect on the one screen the
standardisation existed for.
*Check for H1:* when a screen exists in other products, open one of them before
writing it. Functional tests do not catch a regression in what something says;
assert the pieces of shared copy by name, which is what
`tests/frontend-contract.test.mjs` now does.

## I. Cloud Run defaults that are wrong for long work

Cloud Run is shaped for short requests. Every default below is correct for that
and wrong for a job that runs for minutes.

**I1 — CPU is throttled between requests.**
By default an instance gets CPU only while a request is in flight. A separation
runs on a background thread and reports progress to a polling browser; between
two polls the worker would be throttled to near-nothing. `--no-cpu-throttling`
is not a tuning knob here, it is the difference between working and appearing
to hang.

**I2 — HTTP/1 caps a request at 32 MiB.**
The tool advertises a 300 MB upload. Over Cloud Run's default HTTP/1 that limit
is fiction. It needs `--use-http2` and a server that speaks h2c.

**I3 — Instance count multiplies against a regional vCPU quota.**
`--cpu 8 --max-instances 3` requests 24 vCPU against a 20 vCPU
`CpuAllocPerProjectRegion` ceiling and the deploy is **rejected**, not scaled
down. The failure names a quota, not a flag, so it reads as an account problem
rather than as arithmetic.

**I4 — `expires_at` is an ordinary field until a TTL policy exists.**
Both quota collections write an eight-day `expires_at`. `gcloud firestore
fields ttls list` returned zero policies for the whole database, so nothing had
ever acted on it and Mix Check's quota documents have been accumulating since
the day it shipped. Writing the field is not the same as enabling the policy.
*Check for I1–I4:* for anything that runs longer than a request, state the
runtime flags in `08_DEPLOYMENT_REGISTRY.md` with the reason each one exists,
and check TTL policies with `gcloud firestore fields ttls list` rather than by
reading the code that sets the field.

## J. A replacement that only replaced the product page

Swapping a product for its successor updates the manifest, and the old product
keeps describing itself everywhere the manifest does not reach.

**J1 — The site called the Splitter a local desktop app in nine places.**
The manifest was rewritten, synced, and the product page was correct. The
storefront hero, the footer on every page, the sign-in modal, the site meta
description, `llms.txt`, the prerendered crawler HTML and two source comments
still said "plus SubverseLabSplitter, a free local stem separation app". None of
those read the manifest; they are copy in the website's own source.

**J2 — An FAQ answer became a false privacy claim.**
"Does SubverseLabSplitter process my audio in the cloud?" — "No — it's a local
desktop app. Stem separation runs entirely on your own machine; nothing is
uploaded." Every clause of that was true when written and every clause was
false the moment the web tool went live. A stale feature description is
untidy; a stale privacy answer is a lie a visitor may act on.

**J3 — The account page looked up one product by slug.**
`packs.find(p => p.id === 'subverse-splitter')` rendered a "Your downloads"
section for the platform's only owned software. With the downloads gone from
the manifest, that heading would have sat above an "Open the Splitter" button.
Rewritten to ask each product whether it has a `download` action.
*Check for J1–J3:* when a product changes what it *is*, grep the website source
for its name and for the words describing the old form — "download", "install",
"desktop", "local" — not just the manifest. Include prerender output, `llms.txt`
and the FAQ. Treat any privacy or data-handling answer as the first thing to
re-verify, not the last.

## K. Markdown put through an HTML sanitiser

**K1 — Guide bodies are stored with their ampersands escaped.**
`metadata-sync-service` runs `sanitize-html` over guide Markdown before storing
it (`server.js:419` and `:585`). `sanitize-html` is an HTML sanitiser; given
Markdown, it escapes bare `&`, so `Key & BPM` is stored as `Key &amp; BPM` and
the Markdown renderer prints the entity as visible text. It had never shown
because no guide until this one contained an ampersand in its body.
**K2 — The renderer ignores `#` and bold inside ordered lists.**
A leading `# Title` renders as literal text — the page already supplies its own
H1, and four of the six guides start at `##` for that reason. `**bold**` works
in paragraphs and bullets but not inside `1.` items, where the asterisks show.
Neither had surfaced because no other guide used an ordered list or a top-level
heading.
*Check for K1–K2:* until the sanitiser is fixed, write guides without bare
ampersands, without a top-level `#`, and without inline emphasis inside numbered
lists. **Read the published page, not the Markdown** — the file and the page
disagree, and only one of them is what a reader gets.

## L. A hook placed below an early return

**L1 — "Continue with Google" landed on a blank page.**
`ToolRoom` calls `useEffect(() => { if (user) handoffSession(); })` so that a
member who signs in mid-session gets the handoff without losing their work. It
was written below the members wall. A signed-out visitor on a gated tool
returned at that wall and never reached the hook; a signed-in one did. React
identifies hooks by call order, so the moment the sign-in succeeded the count
changed, React threw *"Rendered more hooks than during the previous render"*,
the tree unmounted, and the visitor was looking at an empty page.

Everything about the diagnosis pointed away from the cause. The OAuth flow was
correct end to end — authorized domains, the Google provider, the popup URL,
`auth.subverselab.com` serving `/__/auth/handler`, `handler.js`, `iframe.js` and
`init.json`, Google's own consent screen naming the right client. The sign-in
was not failing. It was succeeding, and the success is what crashed the page.

**L2 — The check written to prevent it passed on code that was broken.**
A hand-rolled script that looked for hooks after a `return` reported a clean
pass on a deliberately reintroduced violation: the early returns sit inside
`if (…) { return … }`, one indent deeper than the pattern expected. A check that
reports success on provably broken code is worse than no check, because it is
believed. Replaced with `eslint-plugin-react-hooks`, which understands the
language rather than the whitespace, wired into `npm run build` so a deploy
cannot carry the fault; verified by reintroducing the bug and watching it fail.
*Check for L1–L2:* every hook goes above every early return, without exception —
and when writing a guard against a class of bug, reintroduce the bug and watch
the guard fail before trusting it.

## What to take from this

Three questions catch most of the above, and none of them are about reading code more carefully:

1. **What does this look like when it fails?** If the answer is "the same as when there is no data", the fallback is hiding a fault. Make the failing case distinguishable, or check the output rather than the status.
2. **Does my instrument send what a real client sends?** `curl` is not a browser. A desktop window is not a phone. A 200 is not a rendered page.
3. **Is the other side of this contract actually implemented?** Look at it, in its shipped build, before believing the handshake exists.
