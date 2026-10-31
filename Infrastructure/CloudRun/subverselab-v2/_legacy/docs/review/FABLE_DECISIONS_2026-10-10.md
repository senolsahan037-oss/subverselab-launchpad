# subverselab.com — decisions (brand / sales / marketing manager), 2026-10-10

Owner (10 Oct): "buna ben karışmayacağım, Fable bir marka satış pazarlama yöneticisi gibi baksın." These are the
decisions for the seven open points. Each one: decision, exact copy, placement, file:line. No price, no offer date, no
campaign, no discount changes. Nothing is edited here; this is the brief for the next (single) deploy.
Facts below are only those verifiable in this repo today; where a fact is not in the repo it is left out and said so.

Constants referenced (`src/data/plugins.js`): `PRICES` (kubbe 9, kaset 9, yanki 9, hava 12, koro 15, mihenk 49, tutkal 12,
family 19.99), `FAMILY_REGULAR_PRICE` = 115, `FAMILY_OFFER_ENDS_AT` = '2026-11-01', `UPDATES_LINE`, `FORMATS` (:163).

---

## 1. /launch2 counter "8 people · Live count" — HIDE on /launch2, keep on /launch, replace with proof that is already strong

Decision: a live count on a paid offer is only an asset once it is in the hundreds. Today it reads "8 bought". Hide it.
Do not fake a bigger number and do not show the download total as if it were family sales.

- `src/components/LaunchPage.jsx:175` — `{!(second && !familyLive) && <Counter … />}` → render the Counter only for
  the first launch: `{!second && <Counter codes={codes} noun={noun} showTotal />}`.
- `src/components/LaunchPage.jsx:208` — the text line "Counter: 8 people." → same condition, `!second` only.
- In the place the counter occupied on /launch2 (the right column next to "Download Room"), put a static proof block
  with the numbers the admin dashboard already reports (`/api/admin` cards: 1,000 free seats, 2,406 downloads). These two
  are facts, not sales claims. Copy, two lines, same `.launch-codes` styling:
  - big: `2,406` · label: `plugin downloads` · small: `since 30 September`
  - under it, one plain line: `The first 1,000 free seats went in four days.`
  Source of the number: `downloads` doc read by the admin route in `server.js` (the "2406 plugin downloads in total" card).
  Implementation note (CODE): expose that total on the existing public `GET /api/launch/codes?launch=launch` response as
  `downloads` (it is already an aggregate, no PII) so the page needs no new endpoint; refresh it with the same 30 s timer.
  Round-up rule: show the exact integer, never "2,000+".
- Re-enable the paid counter when `codes.claimed >= 250` (one constant `FAMILY_COUNTER_MIN = 250` in `plugins.js`,
  checked in `LaunchPage.jsx`). Until then the proof block stays.
- Prerender: `scripts/prerender.js` /launch2 text has no counter today; nothing to change.

## 2. One price block — what stays, what goes

Principle: a product page states its own price once, big; the family once, as the alternative; the end date once; the
updates line once. Everything else is cut. The constants stay exactly as they are; this is placement, not pricing.

### PluginPage.jsx (the seven paid rooms)
Keep ONE block: the hero offer box (`:73-91`). Its content becomes:
- `:75` head: `` `$${PRICES[plugin.slug]} · or all seven for $${FAMILY_PRICE}` `` (drop `· out ${releaseLabel}`).
- `:76` sub: `{plugin.formats || FORMATS}` unchanged.
- `:81-91` CTA row: two buttons unchanged (family highlighted, single outline). The note under them becomes one line:
  `` `Launch price $${FAMILY_PRICE} until ${familyOfferEndLabel()} (regular $${FAMILY_REGULAR_PRICE}). ${UPDATES_LINE}` ``
  — this is the only sentence on the page that carries the date and the regular price.
Cut:
- `:147-178` "Price and download" section: delete the two paragraphs (`:155-158` and `:168-172`) and the second button row.
  Replace the whole section body with the trust line from decision 3 and the single sentence
  `Sold through Lemon Squeezy; the download and your licence key appear on your Account page within a minute.`
  Keep the `<h2>` but rename it `Buying and downloading`.
- `:181` `<FamilyOffer />` on paid rooms: remove. The family is already in the hero. (Keep it on the FREE rooms,
  `FreePluginPage.jsx`, queued 10 Oct — there it is new information.)
- `:195` Download Room paragraph "The free 1,000 have been claimed. KUBBE is $9, or part of the family ($19.99 until …)":
  → `Bought it? Sign in on the launch page with your order e-mail and download.` (no price, no date).
- Result on KORO: date once, "$115" once, "$19.99" twice (head + note), down from 7 mentions.

### PluginsPage.jsx (/plugins)
- `:46-55` Launch strip "Out now. The free 1,000 are gone — Kubbe and Kaset are $9 each — see the launch page." → delete the
  strip. New visitors do not need the closed offer in the first row.
- `:80-87` "Next" strip: keep one strip, text `` `All seven are out. ${LAUNCH2.offerNow}` `` + go-link `How the family works →`;
  drop ` — ${FAMILY_VALUE_LINE}.` and the `LaunchCountdown`.
- `:99` card badge: `` `$${PRICES[p.slug]} · or in the family` `` (no "Out now", no date).
- `:21-27` `CardBuy` note under each card's buttons: `` `${UPDATES_LINE}` `` only; drop `${FAMILY_UNTIL}, all seven.`
  The date lives once on this page: in the FamilyOffer box (below).
- `:114-116` Free strip: keep.

### FamilyOffer.jsx (shown on /plugins and the two free rooms; removed from paid rooms)
- `:21` h2 `SubverseLab plugin family — ~~$115~~ $19.99` keep.
- `:22` badge `Launch price until 1 November 2026` keep (this is the one dated line on the page).
- `:23-25` names line keep; `:26-28` "Each on its own: KUBBE $9 · …" keep (it is the value argument).
- `:29` `**Regular price $115, launch price $19.99.** $19.99 until 1 November 2026.` → delete the whole paragraph
  (both facts already sit two lines above).
- `:30` `{UPDATES_LINE}` keep. `:32` button keep.

### LaunchPage.jsx (/launch2 hero and price grid)
- `:147` hero tagline `KUBBE, … TUTKAL — Regular price $115, launch price $19.99` → `` `${names.join(', ')}` `` only.
- `:155-156` offer head/sub: head `The SubverseLab plugin family: seven products for $19.99` keep; sub `$19.99 until 1 November 2026.`
  → `` `Launch price until ${familyOfferEndLabel()} · regular $${FAMILY_REGULAR_PRICE}. ${UPDATES_LINE}` `` (one line).
- `:170` Download Room box: `Buy the family ($19.99 until 1 November 2026) or any plugin on its own, then sign in with the same
  e-mail to download. Includes 2 years of updates…` → `Buy the family or any plugin on its own, then sign in with the same
  e-mail to download.` (price, date and updates are two lines above).
- Price grid family card: keep `~~$115~~ $19.99` + `Launch price until 1 November 2026` (that card is the grid's dated element).
- `:237` closing paragraph keep `UPDATES_LINE`, drop `FAMILY_LATER` if it repeats the date; otherwise unchanged.
- /launch (first launch page): `:239` fine. The "Already downloaded? … Now: $9 each. Includes 2 years…" line keep; it is the
  thank-you page.

### prerender.js
Mirror the same cuts in the static text of /plugins, /launch2 and the seven product pages (the "Price and download"
paragraph at ~`:650` becomes the one-line head + trust line). Meta descriptions keep one price mention each (they already do).

## 3. Trust line under every Buy button — verified facts only

Verified in the repo:
- Refunds: `src/data/legalContent.js:183` — Lemon Squeezy is merchant of record and "processes refunds, under its own
  checkout terms and refund policy"; `:184` "If an order is refunded, the licence ends." No refund window of our own exists
  anywhere in the repo, so NO number of days is stated.
- macOS minimum: `CMAKE_OSX_DEPLOYMENT_TARGET "11.0"` in every plugin `CMakeLists.txt` (reverb/KUBBE, kaset, koro, yanki,
  hava, mihenk, tutkal, taban, kor/ALEV). Manuals agree: "macOS 11 or later (Apple Silicon and Intel)" (Alev_Manual.html:154,
  Taban_Manual.html:162, Mihenk_Manual.html:343).
- Windows minimum: manuals say "Windows 10 or later (64-bit)" (same lines). No CMake evidence for Windows; the manuals are
  the shipped statement, so it is used.
- Formats: `FORMATS` (`plugins.js:163`): VST3 and AU on macOS, VST3 on Windows; MIHENK adds the standalone app (`plugins.js`
  formats field of MIHENK, shown live).
- Licence scope: `legalContent.js:184` — one person, that person's own computers, personal and commercial use.
- Updates: `UPDATES_LINE` — 2 years of updates, the version you have keeps working.
- Payment: Lemon Squeezy, prices in US dollars (`legalContent.js:183`).
NOT verifiable in the repo, therefore NOT in the line: a DAW compatibility list (the manuals mention only "Ableton Live",
once, as an example; FL Studio, Logic, Cubase etc. appear nowhere as tested hosts), a refund window in days, Intel-vs-Apple
Silicon test coverage for TABAN/ALEV/TUTKAL (their CMake dev default is arm64-only; the release build passes universal
by hand — `01_AI_Tools/subverselab-taban/CMakeLists.txt:3-7`, `…-kor/…:3-8`, `…-tutkal/…:3-8` — so Intel is stated via the
manuals, not via the build file).

The line (one `<p className="plugin-trust">`, muted, directly under the CTA row; same text everywhere, MIHENK variant adds
the app):

`macOS 11 or later (Apple Silicon and Intel) · Windows 10 or later, 64-bit · VST3 and AU on macOS, VST3 on Windows ·
One licence, your own computers, personal and commercial use · 2 years of updates · Paid through Lemon Squeezy in US
dollars; refunds under Lemon Squeezy's policy`

MIHENK: `… · Standalone app, VST3 and AU on macOS; standalone app and VST3 on Windows · …`
Free rooms (TABAN, ALEV): drop the licence and refund items:
`macOS 11 or later (Apple Silicon and Intel) · Windows 10 or later, 64-bit · VST3 and AU on macOS, VST3 on Windows ·
Free, no card; the download appears on your Account page`

Placement: `PluginPage.jsx` right after the `.plugin-cta-row` (`:91`), and again as the body of the renamed "Buying and
downloading" section (decision 2); `LaunchPage.jsx` under the price grid (`:237`); `PluginsPage.jsx` once under the
FamilyOffer box; `FreePluginPage.jsx` under "Get it free". Prerender: add the same sentence to each product page's static
text. Put the string in ONE constant `TRUST_LINE` (and `TRUST_LINE_FREE`, `TRUST_LINE_MIHENK`) in `plugins.js` next to
`FORMATS` so it is never retyped. Add the DAW list only when a tested-hosts table exists in the manuals.

## 4. /testers — keep the page, change the copy, take it out of the index until the programme is run

Decision: the programme is real but has 0 applications and no inbound link; a public "100 / 100 seats left · Live count"
is a scoreboard that says nobody came. It also hands all five paid plugins out with "No key or activation" wording that
undercuts the $19.99 family. Until the owner actually runs the call, the page must not be a shop window.

- `src/components/TestersPage.jsx:199-204` counter block: remove the live count. Replace with a static line in the hero
  tagline: `100 seats. Applications are read by hand; you hear back by e-mail.`
- `:197-198` tagline `100 producers get all five free — chosen so that every operating system and DAW is covered.` keep.
- `:212` What you get: `KORO, YANKI, HAVA, MIHENK and TUTKAL for macOS and Windows, free, from the Download Room on this page.
  No key or activation is needed.` → `KORO, YANKI, HAVA, MIHENK and TUTKAL for macOS and Windows, free, from the Download Room
  on this page, for as long as you test. Testers get the same builds buyers get.` (activation sentence per decision 7).
- Add `What we ask in return` item 4: `Tell us where you heard about SubverseLab.` (one field; cheap attribution data).
- Indexing: `scripts/prerender.js` testers route → `robots: NOINDEX` (constant exists at `:185`); `scripts/generate-sitemap.js:176`
  → remove the `/testers` entry. Nav and footer: it is linked from neither today; leave it that way. The URL keeps working
  for the call when it goes out (social post, newsletter), which is where the applications will come from.
- Re-index and relink when the owner opens the call; the counter can come back at 25 approved or more.

## 5. Off-palette badges — replacement colours

Brand kit: cream `#F2EFE7`, green `#033733`, gold `#C5A059`, teal `#2A9D8F`. The mint `#5FE3C7` is the plugins' VFD display
colour (`--pl-vfd`, `index.css:1108`); it belongs to the panels and the counters' digits, not to status chips.

- "Out now" chip on the paid rooms (`LaunchCountdown.jsx:26` → `.plugin-count-out`, styled `index.css:1153` with `--pl-vfd`):
  the chip itself goes away with decision 2 (no release state once everything is out). Where `LaunchCountdown` still
  renders "Out now" (the /launch2 hero, `LaunchPage.jsx:78`), restyle `.plugin-hero .plugin-count-out` to
  `color: #C5A059; border: 1px solid #C5A059; border-radius: 999px; padding: 3px 10px; font-size: .72rem; letter-spacing: .12em;
  text-transform: uppercase;` — the same shape as `.plugin-card-badge` (`index.css:1210`), so one chip language on the site.
- `.plugin-strip .plugin-count { color: #5FE3C7 }` (`index.css:1237`): → `color: #C5A059`.
- Counter digits (`.launch-codes-num`, `--pl-vfd`): keep mint. It is the "display" of the device, used on purpose.
- Blue "BROWSER TOOL" banner on the tool cards (`Storefront.jsx:207` → class `badge-ai-tool`, `index.css:517`
  `background: rgba(59,130,246,0.25); color: #6ca0f5`): → `background: rgba(42,157,143,0.22); color: #2A9D8F` (teal; on the dark
  green card this passes contrast; in the light theme use `color: #1F6F65`, which is `--color-accent` light, `index.css:43`).
  Rename the class to `badge-browser-tool` at the same time (`Storefront.jsx:186/207`, `index.css:517`, `AdminPanel.jsx:11`
  comment) so "ai" leaves the stylesheet.
- `.badge-presets` purple (`:515`) and `.badge-workflow` orange (`:516`): no product uses them live; set both to the gold
  pair of `.badge-plugins` (`:513`) so no future card can appear off-palette.
- `.badge-sample-pack` (`:514`) already teal; keep.
- Rule for the stylesheet header comment (`index.css:21`): status and category chips are gold on dark, ink-green on cream;
  teal is for tool/browser context only; mint is for device displays only.

## 6. /forum, /account, 404 — what each prerendered document says

Today (`server.js:1664-1690`): `/account`, `/admin`, `/forum` are `CLIENT_ONLY_ROUTES` and receive `dist/index.html` (the
homepage shell with the homepage `<title>`, description and `canonical https://subverselab.com/`); unknown URLs get the same
shell with a 404 status. React then swaps the meta client-side, which crawlers and link previews do not see.

- `/forum` (public, in the nav): prerender it. Add a route in `scripts/prerender.js` with
  title `Forum | SubverseLab`, description `Questions and answers about SubverseLab plugins and browser tools, from producers
  and from us.`, canonical `https://subverselab.com/forum`, og image `og-image.jpg`, body `<h1>SubverseLab Forum</h1>` + the
  intro from `ForumPage.jsx:213-214` + a link list of the seed topics in `src/data/forumSeed.js` (titles only). Remove
  `/forum` from `CLIENT_ONLY_ROUTES` once the file exists (`/forum/<id>` stays client-only).
- `/account` (private): must never carry the homepage title or a canonical. Prerender a minimal document: title
  `Account | SubverseLab` (matches `AccountPage.jsx:372`), `<meta name="robots" content="noindex, nofollow">`, no canonical,
  no og tags, body `<h1>Your account</h1><p>Sign in to see your plugins, downloads, licence keys and credits.</p>`.
  robots.txt already disallows `/account` (`public/robots.txt:10`); the noindex closes the gap for links that are followed.
- `/admin`: same treatment as /account, title `Admin | SubverseLab`, noindex.
- 404: prerender `dist/404.html` with title `Page not found | SubverseLab` (matches `NotFound.jsx:71`), description
  `That page is not on subverselab.com.`, NO canonical, `<meta name="robots" content="noindex">`, body `<h1>The signal stops
  here.</h1>` (the React page's own h1, `NotFound.jsx:116`) + three links: `/plugins`, `/` (tools), `/help`. Serve it from
  the final `app.use` in `server.js` (`:1690` area) with status 404 instead of `index.html`. Keep the 404 status as is.
- `/tools` (404 today, linked nowhere as a bare path, but `/tools/<slug>` is the footer's "All tools" target): make `/tools`
  a 301 to `/#online-tools` in `server.js` (one line before the fallback). `/sample-packs` arrives with the queued page.

## 7. "No key or activation is needed" — the honest wording

Facts: today's builds compile the licence check OFF; no plugin asks for a key; Lemon Squeezy issues a key per order and
`/account` shows it ("Activations n of limit"). The 1.1 gate may turn the check on later. The sentence must be true now
and still true then.

Replace every occurrence with ONE sentence:
`Install and open it in your DAW. Your licence key is on your Account page; the current versions do not ask for it.`

Short form where space is tight (steps lists): `Install. Your licence key is on your Account page; this version does not ask
for it.`

Free plugins (TABAN, ALEV — no key at all): `Install and open it in your DAW. Nothing to activate.`

Testers (`TestersPage.jsx:212`): `… for as long as you test. Testers get the same builds buyers get.` (decision 4; no key
sentence at all, because tester builds are not keyed and the keyed future is a buyer matter).

Occurrences to change (all found by grep "activation" today):
- `src/components/PluginPage.jsx:221` (Download block, paid rooms)
- `src/components/LaunchPage.jsx` "Getting the plugins / family" paragraph (`:292` area, text "No activation needed") and
  /launch2 step 4 text, which comes from `LAUNCH2.steps` in `src/data/plugins.js` (search "Install the plugins or the MIHENK
  standalone app")
- `src/data/plugins.js:194` (LAUNCH steps, "Open in your DAW")
- `src/data/pluginManuals.js:48`
- `scripts/prerender.js:650, 713, 820`
- `src/components/TestersPage.jsx:212` (decision 4 wording)
When the 1.1 gate ships, the only edit is the second half: `; enter it once when the plugin asks.` — one constant
`ACTIVATION_LINE` in `plugins.js` next to `UPDATES_LINE`, used in all of the above, so the switch is one line.

---

## Order of work for the deploy (all CODE/COPY, no owner input needed)
1. Decision 7 constant `ACTIVATION_LINE` + decision 3 `TRUST_LINE*` constants in `plugins.js`.
2. Decision 2 cuts in PluginPage / PluginsPage / FamilyOffer / LaunchPage + prerender mirror.
3. Decision 1 counter condition + proof block + `downloads` field on `/api/launch/codes`.
4. Decision 5 CSS (four rules) + class rename.
5. Decision 6 prerender routes (/forum, /account, /admin, 404) + `/tools` redirect.
6. Decision 4 testers copy + noindex + sitemap.
Gate as in RELEASE_QUEUE.md: lint, build, test-download, test-account-delete, test-testers, test-credits, test-launch-licence,
local preview in a signed-out window (the owner's browser shows the admin preview and never the buyer's buttons).
