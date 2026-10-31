# subverselab.com — sales, marketing and brand review (2026-10-10)

Reviewer: Fable 5.1 (sales / marketing / brand lens). Read-only: nothing edited, deployed, committed or sent.
Scope: live site `subverselab-site-00206` (prerendered HTML via curl + rendered pages in the owner's Chrome, which is
signed in as admin, so every Buy button showed the admin-preview "You own …" state), the admin dashboard (read only),
and the local tree (`RELEASE_QUEUE.md` NEXT DEPLOY, `git diff --stat`, `src/components/*.jsx`, `src/data/plugins.js`).
All numbers below are from those sources today; what I could not check is listed at the end.

Policy respected: no "AI / machine learning / neural", no "beta" outside Loom, ASCII product names, price floor $19.99
for the family, no new campaigns / pricing / marketplace actions (those are PARKED at the end).

---

## TOP 10 fixes, ranked by expected effect on sales and sign-ups

### 1. "Out October 5" is printed on five paid product pages and the /plugins index, five days after the date — CODE
- Where: `/plugins/koro`, `/plugins/yanki`, `/plugins/hava`, `/plugins/mihenk`, `/plugins/tutkal`, `/plugins`, `/launch2`.
- Live text: hero badge **"$15 · OR IN THE PLUGIN FAMILY · OUT OCTOBER 5"** next to a green **"Out now"** chip;
  /plugins strip **"Five more out October 5."**; every card badge **"$15 · or in the family · Out October 5"**;
  KORO Download Room **"KORO is out October 5."**; /launch2 **"KORO, YANKI, HAVA, MIHENK and TUTKAL are out October 5."**;
  /launch Download Room **"the next four products arrive October 5."**
- Why it costs money: a buyer reads a future date on a $15–$49 product and concludes "not released yet / abandoned
  site". It also contradicts the "Out now" chip two centimetres away, which reads as sloppiness on a page asking for a card.
- Fix: once `familyLive` is true the label must be "Out now" (or no date at all). Replace the hero line with
  `$15 · or in the plugin family` and drop ` · out ${releaseLabel}`; strip badge → `$15 · or in the family`; /plugins strip →
  `All seven are out. The SubverseLab plugin family: seven products for $19.99 — regular price $115.`; remove the sentence
  "KORO is out October 5." from the Download Room paragraph.
- Source (local tree, NOT fixed in the queue except /launch2 and FamilyOffer):
  - `src/components/PluginPage.jsx:41` (`releaseLabel = second ? plugin.releaseLabel : 'now'`), `:75`, `:150`, `:192`
  - `src/components/PluginsPage.jsx:83` ("Five more out {RELEASE2_LABEL}") and `:99` (card badge)
  - `src/data/plugins.js:382` (`RELEASE2_LABEL = 'October 5'`)
  - `src/components/LaunchPage.jsx:166` is already corrected locally (but lists four names; add TUTKAL).
  - Queue: NEXT DEPLOY item 6 lists only /launch and HAVA; the product pages and /plugins are missing from it.

### 2. Help/FAQ says everything is free and no payment is ever requested — COPY
- Where: `/help`, question "How much does everything cost?"
- Live text: **"Everything currently on SubverseLab is free. … no payment details are ever requested"**
- Why: the FAQ is where a hesitant buyer goes before paying. It flatly contradicts $9–$49 plugins and the $19.99 family,
  and reads like a refund argument ("your site said it was free"). Also "Do I need an account" answers only for tools.
- Fix (replace the answer): `The browser tools are free to start; where a tool has a daily limit, the credits that come
  with any plugin purchase pay for more. The plugins are sold on their own ($9–$49) or as the SubverseLab plugin family
  ($19.99, launch price until 1 November 2026) through Lemon Squeezy, the merchant of record. TABAN and ALEV are free.`
- Source: `src/data/faqContent.js:12` — unchanged locally, NOT in the release queue.

### 3. "No key or activation is needed" on keyed products, while /account hands out licence keys — COPY / NEEDS OWNER
- Where: `/launch2` step 4, `/launch` step 4 and "Getting the plugins", every paid product page Download block,
  `/testers`, the manuals data.
- Live text: **"Install the plugins or the MIHENK standalone app. No key or activation is needed."** and two paragraphs
  later **"Your licence key then shows on your Account page."**
- Why: the two sentences contradict each other on the same page; a buyer who sees a key in /account and a plugin that
  does not ask for one (KUBBE/KASET 1.0.2) is confused, and when the 1.1 licence gate ships the sentence becomes false
  and generates support mail. Trust signal, not a nicety.
- Fix: one neutral line everywhere: `Install, then open the plugin in your DAW. Your licence key is on your Account
  page; the current versions do not ask for it.` Owner decides the exact wording relative to the 1.1 gate.
- Source: `src/components/PluginPage.jsx:221`, `src/components/LaunchPage.jsx:292` area ("No activation needed"),
  `src/components/TestersPage.jsx:212`, `src/data/plugins.js:194`, `src/data/pluginManuals.js:48`,
  `scripts/prerender.js:650, 713, 820`. Queue item "Owner inputs": "belongs to the licence gate 1.1.0 decision" — it
  has waited since 5 Oct; decide the sentence now, the gate can follow.

### 4. The family page shows "8 people" as its live counter — negative social proof — CODE / NEEDS OWNER
- Where: `/launch2` right column and "Counter: 8 people." under the steps.
- Live text: **"8 people · Live count · updates every 30 seconds"** (server: `launch2/counter.claimed = paid seats`).
- Why: a counter was the right device for "1,000 free seats"; for a paid offer it tells every visitor that only eight
  people have bought in five days. Buyers copy the crowd; "8" says "nobody".
- Fix: hide the counter on /launch2 until it is a number worth showing (owner sets the threshold, e.g. 100), or replace
  it with the figure that is strong today: `2,406 plugin downloads · 1,492 producers signed up` (admin dashboard numbers).
  Keep the 1,000/1,000 counter on /launch (it is a closed-offer proof, fine).
- Source: `src/components/LaunchPage.jsx` (counter block, `noun = second ? 'people'`), `server.js:213`.

### 5. Repeated "Regular price $115, launch price $19.99" — the price block is noise, not a reason to buy — COPY / LAYOUT
- Where: every paid product page. On `/plugins/koro` the string "Regular price $115, launch price $19.99" or
  "$19.99 until 1 November 2026" appears **7 times** between the hero and the footer; /launch2 hero prints it twice
  in capitals ("REGULAR PRICE $115, LAUNCH PRICE $19.99" + "$19.99 until 1 November 2026.").
- Why: repetition reads as desperation and buries the single thing a buyer wants on a product page: what it sounds like
  and what it costs on its own. KORO's own price ($15) is shown once, in a badge.
- Fix: one price block per page: `KORO — $15` (big) · `or all seven for $19.99 (regular $115) until 1 November 2026` ·
  `2 years of updates` · two buttons. Remove the duplicate lines in "Price and download", the FamilyOffer box and the
  Download Room paragraph on the same page (keep the FamilyOffer box on free pages, where it is new — queued 10 Oct).
- Source: `src/components/PluginPage.jsx` (offer head, "Price and download" section, FamilyOffer include),
  `src/components/FamilyOffer.jsx:21-32`, `src/components/LaunchPage.jsx:147` (FAMILY_VALUE_LINE in the hero).

### 6. No refund line, no "works in Live / Logic / FL" line, no system requirements near any Buy button — COPY / NEEDS OWNER
- Where: all product pages, /plugins, /launch2.
- Live text on compatibility: **"VST3 and AU on macOS (Apple Silicon and Intel) · VST3 on Windows"** — formats only.
  Refunds: only in /terms: "processes refunds, under its own checkout terms and refund policy" (Lemon Squeezy's).
- Why: a $49 mastering app with no refund sentence, no minimum OS and no DAW list loses the cautious half of buyers.
  "Does it run in FL Studio 21 on Windows 10?" is the first question in every plugin forum.
- Fix: a one-line trust strip under every Buy button: `macOS 11+ (Apple Silicon and Intel) · Windows 10/11 · VST3 and
  AU · Ableton Live, Logic Pro, FL Studio, Cubase, Studio One, REAPER, Bitwig · 14-day refund through Lemon Squeezy`
  — the OS minimums and the refund window are the owner's to confirm (CLAUDE.md: verify at the primary source).
- Source: `src/data/plugins.js` (`FORMATS`), `src/components/PluginPage.jsx` offer block, `src/data/legalContent.js`
  (terms, Paid products).

### 7. Homepage headline and sub-line sell "free browser tools"; plugins are the product — COPY / LAYOUT
- Where: `/` below the showcase; prerendered `<h1>` and the first paragraph; footer on every page.
- Live text: badge **"◆ Free Tools for Producers"**, `<h1>` **"SubverseLab: Plugins and Tools for Music Producers"**,
  sub-line **"Browser-based tools for arranging, generating, measuring, mixing, and separating a track into stems."**
  Footer tagline: **"Browser-based tools for music producers — arranging, generating, measuring, mixing and stem
  separation."** Meta description leads with the plugins; the page body does not.
- Why: the 5-second test fails for a plugin buyer who scrolls past the carousel: the page says the company makes free
  web tools. "Free" next to a $19.99 hero also trains the visitor to expect free. (The 10 Oct queue fixed "every tool is
  free" wording but the badge and the taglines are untouched.)
- Fix: badge → `Plugins and browser tools`; sub-line → `Seven audio plugins for your DAW, two free ones, and browser
  tools for measuring, separating and arranging — free to start.`; footer tagline → `Audio plugins for macOS and Windows,
  and browser tools for music producers.`
- Source: `src/components/Storefront.jsx:92, 101, 109`, `src/components/Footer.jsx:40`, `scripts/prerender.js:339`.

### 8. Free-plugin flow sends the visitor through a Lemon Squeezy checkout and then to a page that may show nothing — CODE / COPY
- Where: `/plugins/taban`, `/plugins/alev` ("Get it free").
- Live text: **"The checkout asks for an e-mail address, no card. The download then appears on your account page."**
- Why: the admin dashboard's only pending report (8 Oct, Windows) is exactly this: got ALEV and TABAN through Lemon
  Squeezy, no verification mail, account page empty. 1,224 of 1,492 members (82 %) are "signed up, never returned".
  The queue's 9 Oct work (no verification mail, uid-bound orders, order-number claim) addresses the mechanism, but the
  page copy still does not tell the visitor the one rule that matters: use the same e-mail, and sign in first.
- Fix: on the free pages, before the button: `1. Sign in here (Google or e-mail). 2. Click Get it free — the checkout asks
  only for the same e-mail, no card. 3. The download is on your Account page within a minute.` and under the button a
  pointer `Bought with another e-mail? Claim it with the order number on your Account page.` (the claim card ships in the
  queue; the page must say it exists).
- Source: `src/components/FreePluginPage.jsx` ("Get it free" block), `src/components/AccountPage.jsx` (claim card, queued).

### 9. /testers shows "100 / 100 tester seats left" and the admin shows 0 applications — NEEDS OWNER
- Where: `/testers` (linked from nowhere in the nav or footer; only the sitemap and Search Console).
- Live text: **"100 / 100 tester seats left · Live count"**; admin: Testers 0 / 100 approved, "No applications yet."
- Why: a public programme page with a counter that has never moved is the same negative proof as item 4, and the page
  gives all five paid plugins free with "No key or activation is needed", which undercuts the $19.99 family on the next
  page. It is not linked, so it is not a funnel — it is just a risk.
- Fix (owner decision): either run it (link it from /plugins and the footer, post the call) or add `noindex` and remove it
  from the sitemap until the campaign starts. In both cases replace the counter with `Seats: 100` until applications exist.
- Source: `src/components/TestersPage.jsx`, `scripts/generate-sitemap.js`.

### 10. Price and date promises that end on 1 November 2026 are hard-coded in nine places, and nothing after that date is decided — NEEDS OWNER
- Where: `/`, `/plugins`, all seven paid pages, `/launch`, `/launch2`, meta descriptions, og descriptions, llms.txt.
- Live text: **"Launch price until 1 November 2026"**, **"$19.99 until 1 November 2026"**.
- Why: in 21 days the site either keeps selling at $19.99 with an expired "until" (credibility) or the price goes up and
  every og/meta description cached by Google, Facebook and LinkedIn still says $19.99 (complaints). The queue (10 Oct) hides
  only the FamilyOffer box after the date; buy buttons, /launch2 and Lemon Squeezy keep selling.
- Fix: decide the 1 November price now (floor: $19.99 — company policy, never lower than any earlier promotion) and make
  `FAMILY_OFFER_ENDS_AT` drive every string, including the prerendered meta, so one constant and one rebuild flip the site.
- Source: `src/data/plugins.js:106-136`, `scripts/prerender.js` (family lines), `src/components/{PluginPage,PluginsPage,LaunchPage,PluginShowcase}.jsx`.

---

## Other findings, by page

### Home `/`
- Showcase carousel: 10 slides, 5 s autoplay. The family slide is first; the first screenshot after load showed the hero
  image area empty for ~2 s (the 1400 px webp is lazy). Consider `loading="eager"` + `fetchpriority="high"` for slide 1.
- Two headlines on one page: the carousel H1-sized "SUBVERSELAB PLUGIN FAMILY" and the real `<h1>` "SubverseLab: Plugins
  and Tools for Music Producers" one screen lower. Keep one.
- "SCROLL FOR THE ONLINE TOOLS" hint is fine; the tool cards below are labelled "BROWSER TOOL" and the filter chips are
  "All / Production Tools / Workflows" — "Workflows" is unexplained.
- Admin preview: the signed-in owner sees "You own the family — go to your downloads" on every button, so the owner never
  sees the visitor's Buy copy. Open the site in a private window before every deploy.
- Prerendered text for `/account`, `/forum`, `/tools` and the 404 page is the homepage (same title, description, canonical
  `https://subverselab.com/`). `/tools` and `/sample-packs` answer HTTP 404. `/forum` is in the main nav yet its HTML is
  the homepage copy; give it its own title and description or take it out of the nav.
- Nav: Tools · Plugins · Loom · Help · Forum · Account. "Plugins" is the only product; it sits second. No "Free plugins".

### /plugins
- Launch strip: **"Out now. The free 1,000 are gone — Kubbe and Kaset are $9 each — see the launch page."** The free 1,000
  is history; a new visitor does not need it in the first strip. Replace with the family line.
- Card badges and the "Next" strip: see Top-10 #1.
- Order of cards: KUBBE, KASET, family box, KORO, YANKI, HAVA, MIHENK, TUTKAL, TABAN, ALEV. Fine, but the free two are at
  the very bottom under "Free, forever" — the best lead magnet is hidden below seven paid cards and ~5,000 px of scroll.
- Each card has two buttons of equal weight ("Get the family — $19.99" / "Buy KUBBE — $9" for visitors). Make the single
  price the card's primary action and the family a text link; the family box already carries the family CTA.

### Product pages (KUBBE, KASET, KORO, YANKI, HAVA, MIHENK, TUTKAL)
- KUBBE / KASET pages still carry **"The free first 1,000 are claimed. Kubbe and Kaset launch page."** inside "Price and
  download" — remove for new visitors.
- HAVA: **"sheen tail 0.12 s"** (page, /plugins card, og description) vs engine T60 0.63 s (queue item 6). Fix or remove the
  number; a measured brand cannot print a wrong measurement.
- Demo videos ("Hear it"): present on KORO (YouTube Short embed, vertical). The queue says all nine rooms now have `demos`
  locally. On the live site only KUBBE, KASET and KORO show one — the others sell blind. Ship the videos with this deploy.
- MIHENK: formats line differs from the others ("Standalone app and VST3/AU on macOS · Standalone app and VST3 on
  Windows") — good; the og image is a 2.1 MB PNG (`mihenk_v10_auto.png`); social crawlers time out above ~1 MB. Use a
  1200×630 JPEG under 300 KB (KUBBE's `og.jpg` is 99 KB).
- Product-page og images are mixed: KUBBE/KASET 16:9 `og.jpg`, KORO/TABAN 4:5 cards, MIHENK a UI PNG. One 1200×630 per
  product.
- Manuals: PDF links work (TUTKAL 2.3 MB). KUBBE/KASET also have HTML manual pages; the others do not — fine.
- Every page ends with the same "Browser tools for producers" list before the footer; on a product page this is a
  distraction from the Buy. Swap for "Other plugins" (the `otherFamily` list exists in PluginPage.jsx:40).

### Free plugin pages (TABAN, ALEV)
- Strong copy ("A limiter sets a ceiling. TABAN sets a floor.") and measured claims (< 0.1 LU, −85 dBc). Good.
- No video, no screenshot gallery live; the queue adds "Hear it" and the FamilyOffer box (10 Oct). Good additions.
- See Top-10 #8 for the flow.

### /launch
- Thank-you page for the first 1,000; headline repeated three times ("THE FREE 1,000 ARE GONE — THANK YOU …", "THE FREE
  1,000 HAVE BEEN CLAIMED — THANK YOU", "Free downloads are closed."). Queue item 6 covers the double headline.
- The footer links "Launch" on every page to this page — the footer's one product link points at a closed offer. Point
  "Launch" at `/launch2` and rename it "Plugin family".

### /launch2
- The full download list for all seven plugins (file names, versions, sizes) is visible to everyone before buying. That is
  a trust plus (real files exist), keep it.
- Step 2 wording **"Sign in … with an e-mail address that can receive mail"** is defensive language leaking from the bounce
  problem. Visitors do not know why it is there. `Sign in with Google or with your e-mail address.` is enough; the server
  enforces the rest.
- Counter: Top-10 #4.

### /help
- Besides Top-10 #2: "Why do some downloads require an account but browsing doesn't?" and "I signed in — why did a tool
  ask me to sign in again?" are tool-era questions. The plugin buyer's questions are absent: refunds, which DAWs,
  licence keys, how many computers, Windows AU, updates after 2 years, "I paid with another e-mail". Each of those is
  answered somewhere in /terms or /launch2 — bring them into the FAQ.

### /learn, /loom
- /learn: seven guides, tool-only; no plugin manuals or "how to install a VST3" article, which is the most searched
  plugin query. One guide "Installing SubverseLab plugins in Ableton / Logic / FL" would feed SEO and cut support.
- /loom: says **"Live 12.4 beta"** (allowed exception) and "45 MCP tools" while the queue says 59 and 2.1.0 — the local
  version re-reads the facts; make sure it ships.

### /testers — Top-10 #9.

### /account (seen only as admin; visitor view not checkable in the owner's Chrome)
- Prerendered HTML is the homepage; title "SubverseLab — Plugins and Tools…". Give /account a `noindex` and its own title.

### Legal
- /privacy and /terms "Last updated: 5 October 2026"; both describe the "free launch licence … while the 1,000 last" in
  the present tense. Terms defer refunds entirely to Lemon Squeezy's policy — fine legally, but see Top-10 #6 for the buyer-
  facing line.
- Terms say "Prices are shown in US dollars on the product pages." Correct and consistent everywhere ($9/$9/$15/$9/$12/$49/$12,
  $19.99, $115). No price inconsistency found across pages.

### 404
- Returns HTTP 404 with the full homepage HTML (title, description, canonical `/`). The React 404 page renders client-side.
  Prerender a small 404 document with its own title and no canonical.

### SEO / technical
- Titles and descriptions: present and specific on all product pages; canonical tags present (the 7 Oct TODO is partly
  done live). `twitter:card` set. `/.well-known/security.txt` 200, `/security.txt` 404 (fine).
- `/tools/*` pages are linked from every product page footer ("All tools" list uses `/tools/<slug>`) while `/tools` itself
  is a 404 — give `/tools` a page or make the list link to `/learn/<slug>`.
- Page weight: main JS bundle 1.1 MB raw / 328 KB gzip; HTML TTFB 0.21–0.26 s from this machine; product images are
  350–700 KB PNGs plus 1400 px webp heroes. Acceptable; the og PNGs are the only outlier.
- Sitemap 4.9 KB, llms.txt present. Prerender covers 34 routes.

---

## Brand consistency notes
- Product names: ASCII capitals everywhere live (KUBBE, KASET, KORO, YANKI, HAVA, MIHENK, TUTKAL, TABAN, ALEV). KUBBE/KASET
  pages and /launch still use the mixed-case "Kubbe", "Kaset" in body copy and meta descriptions ("Kubbe is an algorithmic
  reverb…"). Pick one: capitals in titles and badges, "Kubbe" in prose is defensible, but the meta descriptions should match
  the titles.
- Turkish name explanations ("'Kubbe' is Turkish for dome", "TUTKAL means glue in Turkish") appear on five pages in three
  different sentence shapes. One pattern: `"Koro" is Turkish for choir.` as the first line of every page.
- Model numbers (KB-79, KS-83, KR-77, YK-74, HV-72, MH-86, TK-79, AL-81) are a strong, consistent device; TABAN has none on
  /plugins or /launch2 — add it.
- Colours: cream / dark green / gold palette holds on every page; the "Out now" chip is a mint green outside the kit and the
  tool cards' "BROWSER TOOL" badge is blue. Two foreign accents; the mint is on every product page.
- Forbidden words: no "AI", "machine learning" or "neural" found in live visible copy. "Beta" appears only on /loom (allowed).
  The admin product catalogue column says "Ai Tool" (internal, not public).
- Voice: measured claims ("T60 2.4 s", "< 0.1 LU", "latency 54 ms") are the brand's best asset and are consistent. The
  exception is HAVA's 0.12 s (wrong) — the one place the brand breaks its own rule.
- Footer: "Created for subverselab.com" is template residue; remove. The footer has no Testers, no Free plugins, no
  Account link, and "Launch" points at the closed offer.

---

## Funnel numbers (admin dashboard, read-only, aggregates only) and reading
- Members 1,492; new in last 30 days 1,465; signed in last 30 days 1,468; **"signed up, never returned" 1,224 (82 %)**.
- Launch: 1,000 / 1,000 free seats claimed; **2,406 plugin downloads in total**.
- Family page live counter: **8 paid family seats** (`launch2/counter.claimed`).
- Free plugins (RELEASE_QUEUE 10 Oct): **$0 orders ALEV 95, TABAN 229** since 8 Oct; **0 of them bought the family** since.
- Testers: **0 applications, 0 / 100 approved**.
- Reports: 2 (1 pending, 8 Oct, Windows user: no verification mail, free plugins not on the account page).
- Not visible in the admin: orders, revenue, single-plugin sales, refunds, conversion — those live in Lemon Squeezy and
  Google Analytics, which I did not open.
- Reading: the top of the funnel works (≈1,500 sign-ups in 30 days, 2,406 downloads), the middle is broken by
  verification/e-mail friction (82 % never return; the one open report is that exact failure; 573 of the 1,000 claimants
  were unverified password accounts per the queue), and the bottom converts at roughly 8 family orders per ~1,500 members
  (≈0.5 %). The 9 Oct no-verification build is the right fix for the middle; the stale "October 5" copy, the "free"
  FAQ and the "8 people" counter are the cheap fixes for the bottom. The free plugins work as a magnet (324 orders in
  3 days) but convert nobody yet — the FamilyOffer box on those pages (queued 10 Oct) is the right next step; a follow-up
  message in the new Inbox ("you have ALEV — the family is $19.99 until 1 November") would be the second.

---

## Local, not yet deployed: does the queue fix or worsen what is live?
Fixes (good, ship them): no verification mail + uid-bound orders + order-number claim (the middle-funnel repair);
owned-aware buttons; Inbox; product videos on all nine rooms; FamilyOffer on free pages; "October 5" removed from
FamilyOffer and /launch2 prerender; /launch "arrive October 5" sentence rewritten; "every tool is free" wording unified;
canonical tags; /sample-packs page with "Apply to publish your packs" (replaces a live 404 that is linked from the footer
locally — make sure the footer link and the page ship together).

Still missing from the queue (found live, unchanged locally):
1. `PluginPage.jsx:41/75/150/192` and `PluginsPage.jsx:83/99` "Out October 5" (Top-10 #1).
2. `faqContent.js:12` "Everything currently on SubverseLab is free" (Top-10 #2).
3. "No key or activation is needed" in six files (Top-10 #3) — parked on the 1.1 decision since 5 Oct.
4. /launch2 "8 people" counter (Top-10 #4).
5. Homepage badge/sub-line/footer tagline still tools-first (Top-10 #7).
6. HAVA "0.12 s" (queue item 6 names it, no fix built).
7. /testers counter and visibility (Top-10 #9).
8. MIHENK 2.1 MB og PNG; mixed og formats.
9. `LaunchPage.jsx:166` new sentence lists four names; TUTKAL missing.
10. /forum, /account, 404 prerendered as the homepage.

Risk in the queue: the 9 Oct "non-proven password account mints no new first-1,000 seat" and the 7-day purge of unverified
accounts (item 2) are owner decisions; the purge would delete up to ~743 accounts that may still hold free-plugin orders
under their e-mail — confirm the claim path works before any purge.

---

## PARKED ideas (not actions; no campaigns, pricing or listings before the owner opens them)
- Inbox follow-up to ALEV/TABAN takers (324 accounts) with the family offer — needs the owner's go and the Inbox deploy.
- Post-1 November price: the floor is $19.99 (family); any later promotion, upgrade price for family-1 owners or bundle must
  not undercut it. Decide the number before the date.
- Reviews / quotes: there are 2,406 downloads and zero testimonials on the site. One line from three producers (with
  permission) under each Buy button would be the cheapest trust signal; collecting them is a campaign, so parked.
- Marketplace listings (KVR, Plugin Boutique, Gumroad mirror): parked per policy.
- Tester programme relaunch: parked until the owner wants it; today it is a liability (see #9).
- "How to install a VST3/AU" guide in /learn: content, not a campaign, but new work — parked.

---

## What I could not check
- The visitor (signed-out) rendering of Buy buttons, the sign-up modal, the cookie banner and /account: the owner's Chrome
  is signed in as admin (admin preview shows "You own …" everywhere) and I did not sign out. The built-in browser's tab
  cap was taken by the owner's dyneq mockup tabs, which I did not close. Visitor copy was read from the source
  (`BuyButton.jsx`, `FamilyOffer.jsx`) and from the prerendered HTML.
- Mobile layout at 375 px: the Chrome window would not resize (it stays 1,611 px wide; the resize call returned success but
  `innerWidth` did not change). Not verified. The queue reports the FamilyOffer box at 335 px wide on a 375 px viewport in
  a local dev server; the rest is unverified.
- Lemon Squeezy checkout pages, order totals, refunds, single-plugin sales, Google Analytics and Search Console numbers.
- Whether the demo videos for YANKI, HAVA, MIHENK, TUTKAL, TABAN, ALEV are rendered and linked (queue says yes, local only;
  not seen).
- Actual OS minimums and the refund window (Top-10 #6) — owner to confirm at the source before the line goes live.
- Dark/light theme toggle rendering (the nav has a theme button; only the dark theme was seen).
