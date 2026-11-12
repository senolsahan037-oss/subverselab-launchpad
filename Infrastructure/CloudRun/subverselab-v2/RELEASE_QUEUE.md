# subverselab.com — release queue

Deploy rule (rewritten 2026-10-14, replaces the 2026-10-03 "one deploy when the counter hits 1,000" rule; the counter was
reached 4 Oct and deploys 00193–00213 followed): every site change is made LOCALLY in this tree, tested (lint, build, every
`scripts/test-*.js`) and listed under NEXT DEPLOY. A deploy happens only on the owner's explicit go in chat; related changes
are batched into it. Release freeze (owner 2026-10-13): no site releases until the family campaign ends on 1 Nov 2026,
except a live outage, a security hole, or an explicit owner go for that deploy.
Live now (12 Nov 2026 ~12:20 TR): `subverselab-site-00260-vef` + `subverselab-api-00030-nat` (see the two DEPLOYED 12 Nov entries). Rollback: `subverselab-site-00257-heb` + `subverselab-api-00027-lig`. Nothing is waiting under NEXT DEPLOY: every NEXT DEPLOY entry below has shipped (checked 12 Nov: the live pages equal the local build). Older:
Live before (7 Nov 2026): `subverselab-site-00248-fiq` + `subverselab-api-00021-har` (see the DEPLOYED 7 Nov entry). Rollback: `subverselab-site-00245-heb` + `subverselab-api-00018-yoy`. Older: 
Live now (1 Nov ~00:55 TR, owner "subverselabin son kontrollerini yapıp deploy edelim"): `subverselab-site-00233-yik` + `subverselab-api-00012-ziv` (see the DEPLOYED 1 Nov entry). Rollback: traffic to `subverselab-site-00230-cuq` and `subverselab-api-00010-kop` (and `LS_PRODUCT_SLUGS` back to the old value only if the new products must go too). Before (25 Oct ~22:45 TR): `subverselab-site-00230-cuq` + `subverselab-api-00010-kop`. Rollback then: traffic to `subverselab-site-00228-bir` and `subverselab-api-00008-dih`. Before: (22 Oct ~20:30 TR): `subverselab-site-00228-bir` + `subverselab-api-00008-dih` (see the DEPLOYED 22 Oct entry). Before (20 Oct ~17:55 TR, owner "deploy et"): `subverselab-site-00225-yop` + `subverselab-api-00006-her` (manuals JING FANG / RU-8 / ADALET, expanded rooms, buy-click counter, /account licence sentence, search titles, Merchant Center availability, JING FANG room FACTS text; env unchanged; Firestore rules NOT released). Rollback: traffic to `subverselab-site-00223-jax` and `subverselab-api-00004-rut`. Before that: (19 Oct ~20:40, owner "Deploy et: önce API, sonra site; etiketli sürümü kontrol et, sonra trafiği aç. Firestore kuralları hariç"): `subverselab-site-00223-jax` + `subverselab-api-00004-rut` (JING FANG + SEDA on sale, LS_PRODUCT_SLUGS += 1453169:jingfang,1453230:seda on both; everything listed under DEPLOY READY below shipped; Firestore rules NOT released). 00222-waf was the first site tag (prerender still wrote the old key line on solo rooms), never took traffic. Rollback: traffic to `subverselab-site-00220-faj` and `subverselab-api-00002-kuc`. Before: `subverselab-site-00220-faj` (pages + RU-8 opening, proxies /api; before it 00218-qul) + `subverselab-api-00002-kuc` (every /api route; 18 Oct parked-credit claim; rollback: traffic to `subverselab-api-00001-5xh`). Rollback: traffic to `subverselab-site-00215-pux` (the old single service, serves /api itself). Older revision history follows.

## DEPLOYED 12 Nov 2026 (~12:20 TR, owner "şimdi yap") — API ONLY: `subverselab-api-00030-nat` (tag nov12b), 100 %; tag nov12 removed. Site unchanged (`00260-vef`). Rollback: traffic to `subverselab-api-00027-lig`. NOT committed.
- Tag checks: manifest 200, /api/redeem and /api/partner-report 401 without a token, no WARNING/ERROR logs. Live: owner's account in Chrome,
  /redeem?code=<TABAN team code> -> "TABAN is now on your account."; API log "redeem: taban for uid juku2P…" (team code now 1 of 3 uses).
- Glyn (Loot Audio) mailed from Gmail web the same day with the three CSVs (500 codes each) + three team codes and the buyer steps.

### (entry as prepared) free plug-ins as store codes for Loot Audio (API ONLY)
Why: Loot Audio runs TABAN, ALEV and KIYMA as a free gift with purchase and its system hands every buyer a single-use code (Glyn,
5 + 8 Nov); our redeem codes only opened JING FANG, ELEK and the family.
- `api/redeem.js` REDEEM_PRODUCTS + taban, alev, kiyma (no licence key in these plug-ins, so a code adds them straight to the account like
  JING FANG; no checkout). `scripts/build-redeem-codes.js` PRODUCT_BY_NAME + SOURCES. New CSVs (600) in
  `01_AI_Tools/instagram_2026-10/launch_desk/loot_audio_2026-11/codes/`: SubverseLab_{taban,alev,kiyma}_codes_for_Loot.csv (500 each, LOOTTB / LOOTAL /
  LOOTKY + 7, single use, no expiry, redeem_at = /redeem?code=) and SubverseLab_free_TEAM_test_codes_for_Loot.csv (3 codes, 3 uses).
  `api/redeemCodes.json` rebuilt: 3,159 distinct codes (+1,503); `--check` up to date.
- Test: test-redeem 17/17 (new case: a TABAN code -> 200 {ok, product taban}, no checkout, owned, ownedVia 'code', second uid 409).
- Gate 12 Nov: eslint 0 errors (2 old warnings), build exit 0, 23/23 test files exit 0.
- When BOE-B goes on sale (free): add `boeb: 'BOE-B'` the same way if Loot gives it away too, plus its codes.
- After the deploy: send Glyn the three CSVs + team codes and the buyer steps; NOT sent before the API serves them.

## DEPLOYED 12 Nov 2026 (~03:30-03:50 TR, owner "kalanları da sen yap") — site AND API: `subverselab-site-00260-vef` + `subverselab-api-00027-lig` (tag nov12), 100 %; tags nov08c / nov08 removed. Rollback: traffic to `subverselab-site-00257-heb` + `subverselab-api-00024-hid`. NOT committed.
- API deployed by the owner (terminal) with `--update-secrets LS_API_KEY=ls-api-key:latest`; site deployed by the owner after a first try of mine failed on upload
  (network; no revision made). Tag checks before traffic: pages 200, /partners/nope 404, /partners/report X-Robots-Tag noindex, manifest 200,
  /api/partner-report 401 (after the API switch), privacy shows 12 November 2026, no ERROR logs on either revision.
- Live checks: /plugins?aff=qbnJo signed out (in-app browser, no consent): family Buy carries aff=qbnJo, checkout[custom][aff]=qbnJo,
  checkout[discount_code]=REKKERD10; other products aff only; nothing in localStorage. Owner's Chrome (consent granted): svl-aff kept to
  12 Dec. Lemon Squeezy checkout opened (no purchase): "REKKERD10 −$4.00", total $35.99.
- Firestore rules released (`firebase deploy --only firestore:rules`; adds redemptions, redeemed_by_uid, trials, device_codes, partners,
  partner_sales, all deny). Anonymous REST read of partners/rekkerd and partner_sales/rekkerd: 403 (not checked through the app's client).
- `partner-cli add --id rekkerd ... --ls-affiliate-id 74517` (LS affiliates API: 74517 active). Live report with the token: partner Rekkerd.org,
  30 %, REKKERD10, 0 sales. Report link mailed to Ronnie 12 Nov (Gmail 1a1cd36d7c0db196); the token is in no file.
- Not verified: a real paid order through the link (webhook -> partner_sales), code-only attribution through discount-redemptions live.

### (entry as prepared) affiliate partners: 30-day tracking, partner sales ledger, partner report
Why: Rekkerd (LS affiliate `qbnJo`, reader code `REKKERD10` = 10 % off the family, 30 % commission) was promised 30-day tracking, but `?aff=`
lived for the tab only; a reader who only typed REKKERD10 never showed in the partner's LS dashboard. One permanent setup for every partner.
- Site: `src/data/partners.js` (public registry by aff code: id, name, discountCode, discountProducts). `src/affiliate.js`: the code is kept
  30 days in localStorage (`svl-aff` = {code, until}) only after cookie consent ("granted"); without consent the tab only (sessionStorage, as
  before); consent granted later in the tab promotes the code, Decline removes the 30-day copy; expired entries removed; last click wins.
  `main.jsx` connects consent (`connectAffiliateConsent`). Checkout links (`withBuyer` in `BuyButton.jsx`, used by BuyButton and PackKey) add
  `aff`, `checkout[custom][aff]` and, only for the partner's listed products (product = the slug the button sells) and only when the link has
  no discount code yet, `checkout[discount_code]=REKKERD10`. BuyButton now puts its own `discount` (family upgrade) in first, so a partner
  code never replaces it. Price floor: 39.99 − 10 % = 35.99 > 19.99.
- Cookie banner line now also says accepting remembers a partner's link for 30 days; privacy text (`legalContent.js`, svl-aff) rewritten.
  `LEGAL_UPDATED` left at 6 November 2026 — owner/lead: bump it if the privacy wording change should date the policy.
- API: `api/partners.js` (new; Dockerfile COPY updated). Webhook `order_created` (paid) / `order_refunded` writes `partner_sales/{orderId}`
  BEFORE the family early return, in try/catch (never changes the webhook answer). Attribution: `meta.custom_data.aff` or the order's
  `affiliate_id` = `partners/{id}.lsAffiliateId` → source link, paidBy lemonsqueezy; else the order's discount code from
  `GET /v1/discount-redemptions?filter[order_id]=` (needs LS_API_KEY) → source code, paidBy subverselab. Amount = price without tax
  (orderAmount), commission = round(amount × pct / 100); stores LS's own `affiliate_id` / `referral_amount` too. No e-mail, name, uid or receipt.
  `GET /api/partner-report` (Bearer token, sha256 lookup, 10/min per IP, 401 with no detail, no-store).
- Page `/partners/report#<token>` (PartnerReportPage.jsx; noindex meta, X-Robots-Tag, robots.txt `Disallow: /partners` via
  generate-sitemap.js, CLIENT_ONLY_ROUTES in server.js; not in the sitemap). CLI `scripts/partner-cli.js` add | rotate-token | set | list.
- `firestore.rules`: `partners/` and `partner_sales/` denied to clients (local edit).
- Gate 12 Nov: `npx eslint .` 0 errors (2 old warnings); `npm run build` exit 0 (90 routes + homepage); 23/23 `scripts/test-*.js` exit 0
  (test-affiliate 25/25, new test-partners 24/24; the ten tests that load api/server.js got the `./partners.js` import rewrite). Browser:
  the page renders its no-token message and (with a stubbed API answer) the month and sale tables; 375 px scrollWidth 375.
- Owner steps (each on the owner's go): (1) LS API key exists in Secret Manager `ls-api-key`; mount it on `subverselab-api` as env
  `LS_API_KEY` (`--update-secrets=LS_API_KEY=ls-api-key:latest`) and give the API service account Secret Accessor on it; (2) after the API
  deploy: `node scripts/partner-cli.js add --id rekkerd --name "Rekkerd.org" --aff qbnJo --code REKKERD10 --pct 30 [--ls-affiliate-id <LS id>]`
  with Google credentials; it prints the report link ONCE: send it to Rekkerd privately; (3) `firebase deploy --only firestore:rules`,
  then check as an anonymous visitor that partners/ and partner_sales/ are unreadable. Orders before the deploy are not in the ledger.
- Lead review 12 Nov ~04:00: paidBy is 'lemonsqueezy' ONLY when the order carries LS's own affiliate_id; a link sale LS did not credit is
  'subverselab' (it must never look paid in the partner's report); tests updated (test-partners 24/24 again). `LEGAL_UPDATED` bumped to
  12 November 2026. Lead re-ran the gate: eslint 0 errors (2 old warnings), build exit 0, 23/23 test files exit 0. LS facts checked live
  (read-only): discount-redemptions attributes incl. discount_code/order_id; orders carry affiliate_id/referral_amount; REKKERD10 = LS discount
  1241255, 0 redemptions so far. Secret Accessor on ls-api-key for 90909956035-compute granted by the owner. Only change since the 8 Nov
  08:05 deploy (ADALET pictures/manual and the AHENK box are already live, checked 200).

## NEXT DEPLOY (prepared 8 Nov 2026 ~06:40, sub-agent for the lead) — ADALET room pictures and manual (local, NOT deployed, NOT committed; SITE only)
Owner: the ADALET room was careless (one panel picture, manuals without panel pictures). Brought to the JING FANG standard.
- Room (`src/data/plugins.js`, ADALET entry only): 8 panel tabs instead of 2 (Panel, Dynamic band, TARGET, TARGET list, COLLIDE, SELF, DELTA,
  BAKE), each `public/plugins/adalet/panel-*.webp` 1600x720 from the 1.0 ui_snapshot @2x shots (icon-only mark, no ORBIT); a "How ADALET works"
  panel tour (6 steps, `public/plugins/adalet/tour/*.webp`: row 1400x128, menu 436x786, resonance 1400x443, readout 1400x443, target 804x576,
  bake 1400x255) with an "In practice" list; TARGET part list corrected to the 1.0 engine (KICK + MUD, BOX; SNARE + BOX; HATS + BITE; BASS + MUD);
  controls list rewritten with ranges and defaults. "Only lab.webp appears" was the tab design (one picture per tab), not a bug; the old
  `lab.webp` (carved view) is now unused but left in place; `front_lab.png` / `front_lab_dynamic.png` (11 Oct) were already unused.
- Web manual (`src/data/manuals/adalet.js`): rewritten against the 1.0 source; 12 sections (new: The panel, ADVANCED and BAKE, Mouse and keys;
  Default columns everywhere) and 12 panel pictures. New block type `{ img, w, h, alt, caption }` in `PluginManualPage.jsx` + `scripts/prerender.js`
  (`<figure>` in the prerendered HTML), `.manual-figure` CSS with existing tokens; header of `pluginManuals.js` lists it.
- PDF: `01_AI_Tools/subverselab-dyneq/docs/manual/Adalet_Manual.html` with 11 panel pictures (images/panel_*.jpg, crop_*.jpg), rendered with
  `tools/make_manual.sh` (headless Chrome): 12 pages (was 7), 1,675,007 B, every page looked at; copied to `public/plugins/adalet/Adalet_Manual.pdf`.
- SWEET is described as it is in 1.0 ("does not change the sound"): the engine never reads targetSweet (STATUS C11, owner decision open).
- Gate 8 Nov ~06:35: `npx eslint .` 0 errors (2 old warnings); `npm run build` exit 0 (90 routes prerendered); `scripts/test-*.js` 21 of 22 files
  pass; test-listen.js 68/69: "RU-8 ... four or five kits" fails because listen.js now has 8 RU-8 kits (the lead's ~06:15 entry above), not this
  change: the test expectation needs the lead's update. dist: /plugins/adalet/manual references all 12 pictures (files exist); the room's 14
  pictures are in the JS bundle (room prerender is text-only for every room) and all exist in dist. Dev server 5181: all 8 tabs + 6 tour images
  load; 375 px room and manual scrollWidth 375 (no overflow).

## DEPLOYED 8 Nov 2026 ~08:05 TR (owner: a store buyer today could not find where to redeem) — site `subverselab-site-00257-heb` (tag nov08c), 100 %; tag nov08b removed; rollback 00254-pak. Redeem a code is linked from the site
- Owner 8 Nov: "websitede redeem kodu girecek bir yer görmüyorum": /redeem existed (live since 05:00) but nothing linked it; only signed-in
  users saw the closed "Redeem a code" fold on /account. Added: footer ACCOUNT column "Redeem a code" -> /redeem (Footer.jsx); every paid room
  shows "Have a code from a store? Redeem it" next to "Bought it already? Sign in to download" (PluginRoom.jsx, .plugin-already flex row).
  Dev server /plugins/jingfang: both links present, no overflow. 22/22 tests. Store instructions link /redeem directly, so this can wait for
  the next batch (owner rule: no second deploy the same day unless something is badly broken).

## DEPLOYED 8 Nov 2026 (~07:15 TR, owner "sesler ve yüklemeler bitince deploy et") — SITE ONLY: `subverselab-site-00254-pak` (tag nov08b), 100 % traffic; tag nov08 removed. API unchanged (`subverselab-api-00024-hid`). Rollback: traffic to `subverselab-site-00251-wob`.
- Shipped the "fixes after the 8 Nov 05:00 deploy" entry below: RU-8 listen room (1.1 engine, 8 kits), AHENK web manual + box + 1.0 pictures +
  listen room (5 setups), ADALET room (8 tabs + tour) + web manual with pictures + 12-page PDF, /plugins filter chips z-index fix.
- Before the switch: AHENK installers published by the owner's publish_download.sh runs (manifest 1.0.0: mac 2,470,267,840 B at 04:06 UTC,
  win 2,453,854,507 B at 04:03 UTC); the live AHENK room shows "Download free trial for macOS / Windows · v1.0.0".
- Tag smoke: / /plugins /plugins/{ahenk,ahenk/manual,adalet,adalet/manual,ru8,ru8/manual,jingfang} /redeem, ahenk audio, ru8 uptown.m4a, ahenk box,
  adalet PDF (md5 = local), manifest 200; /nope-404 404; /plugins filter z-index 4, AHENK box layers load, 17 cards. Live after the switch: the
  same 200s, www 301, ADALET's 8 tabs each load their picture, 0 error lines in the site log.
- NOT verified: a free account downloading the AHENK trial end to end (needs a sign-in); the owner's ear on the RU-8 and AHENK listen files.

## NEXT DEPLOY (prepared 8 Nov 2026 ~06:15, lead) — fixes after the 8 Nov 05:00 deploy (local, NOT deployed, NOT committed)
The owner found the 05:00 deploy incomplete. Checked live 8 Nov ~05:55: /plugins/ahenk/manual 404; ahenk box.webp / box-lid / box-body 404
(made 05:39, after the deploy); RU-8 "One rhythm" previews were the 17 Oct 1.0-engine renders with no sample kit; manifest ahenk version null.
- RU-8 listen room re-rendered with the 1.1 engine (ru8media rebuilt from 1.1 sources; 01_AI_Tools/subverselab-ru8/marketing/listen/SOURCE.md
  "8 Nov"): 8 buttons, synth Analog / Lo-fi / Industrial / Trap / Dry + sample Uptown / Basement / Drill; public/plugins/ru8/audio/*.m4a (8) and
  panel-kit-*.webp (8, 1600x1116); -23.9 … -24.1 LUFS, TP <= -1.6 dBTP, 21.334 s each; listen.js lines re-measured. Owner's ear: not yet.
  Checked on the dev server: 8 buttons + 8 panels load, wrap at 375 px with no page overflow.
- AHENK web manual: src/data/manuals/ahenk.js (16 sections, from the 1.0 PDF, no iOS chapter), registered in pluginManuals.js behind
  AHENK_ON_SALE, plugins.js ahenk manualPage; the room links "Read the AHENK manual · PDF". Dev server: 33,016 characters, no banned words, no overflow.
- AHENK box (box.webp, box-lid.webp, box-body.webp, 05:39) goes out with this deploy.
- AHENK "Hear it first" room (owner 8 Nov "hazırla ahenk seslerini"): LISTEN.ahenk, 5 buttons = factory setups Stage (concert grand),
  Recital Studio (studio grand), Felt Room (upright), Chamber Evening (baby grand), Stone Church (concert grand). Score: Schubert Heidenroeslein
  D.257 bars 1-16 (OpenScore Lieder CC0, the score AHENK's tests use), every part on the piano, rendered by AHENK's engine (fazilsay_render
  gained --midi / --midi-seconds and the plug-in's recorded-mic aliases StudioAB/StudioPair -> LID ORTF, Close -> LIP); recorded microphones
  only (model-built stands not rendered). public/plugins/ahenk/audio/*.m4a 31.51 s each, -16.7/-16.8 LUFS, TP -1.6 ... -2.6 dBTP;
  room tail (fall 30 dB after the last note) 350 / 400 / 650 / 450 / 1250 ms; panels listen-*.webp 1600x1024 from the 1.0 ui_snapshot
  (hall pictures; they show the concert grand on the rack). Rebuild: 01_AI_Tools/subverselab-fazilsay/marketing/listen/build.py.
  test-listen 75/75. Dev server: plays, waveform, switching changes panel + readout. Owner's ear: not yet.
- /plugins filter chips (owner 8 Nov: "bir çalışıyor bir çalışmıyor"): the first shelf row is pulled up under the filter row; when the pointer
  touched that row's box-item just above the chips, `.box-item:hover` raised it to z-index 3 = the filter's 3, and being later in the DOM it
  covered all three chips (elementFromPoint at each chip centre = ARTICLE.box-item, measured live at 1850 px) and kept the hover, so the click
  went to the empty article (or, from the lid, opened the product). Fix: `.plugin-filter` z-index 4 (src/index.css). Dev server 1850 px, same
  pointer path: all three chips hit-test to themselves, Free -> 3 cards, Sold on their own -> 14, All -> 17.
- Homepage news (live catalogue, NO deploy, done 8 Nov ~06:40): ru8-update picture = Blender render (ru8 marketing/build-media/r3d/upgrade.png,
  1600x900 webp, one-word SUBVERSELAB on the unit); jingfang-14 picture = device picture jf_device_4 (branding/out/device_2026-10-30; jf_device_3
  stays on the static JING FANG item). Live /api/catalog serves both.
- AHENK pictures (owner 8 Nov: "canlıdaki görseller eski versiyon"): the live ones were the 7 Nov MuseHub preview JPEGs (1080x720, edges
  cropped; the SCORE shot lacks 1.0's MIDI / MusicXML drag handles). Replaced with AHENK 1.0's own ui_snapshot (build-check, 7 Nov 22:15,
  newer than every source; the 1.0 release data linked into Application Support for the run and removed after): panel-stage / -pianos /
  -hall / -score.webp 1600x1024 full frame (stage_default, stage_picker, stage_hall_theatre, score_view_schubert 2x), card-bg.webp 1000x640,
  og.jpg 1200x630; plugins.js sizes updated. Old files kept in /private/tmp/claude-501/ahenk_old. Dev server: all 4 room tabs load, no overflow.
  Not changed: MuseHub's own preview pictures (docs/musehub/previews, same old shots) and the Lemon Squeezy product picture.
- Firestore rules: the LIVE ruleset (f80b0967…) predates the 17 Oct security audit: `users/` is readable by ANY signed-in account (e-mails,
  names), reports accept any fields, forum fields unchecked. Local firestore.rules fixes all of it; every browser write (two report forms,
  forum topic/reply/edit, admin reports) matches the new rules. `firebase deploy --only firestore:rules --project project-62238635-aae4-41f4-880`
  was refused by the session's permission layer on 8 Nov 06:00: the owner runs it.
  RELEASED 8 Nov 06:09 TR (ruleset e9b88f83…, by the owner); live source = local firestore.rules (diff: one trailing blank line).
  Checked 06:11 as an anonymous visitor: users / reports / redemptions / trials 403, forum_topics 200; live /forum lists its topics, 0 console errors.

## DEPLOYED 8 Nov 2026 (~05:00 TR, owner "deploy") — site AND API: `subverselab-site-00251-wob` + `subverselab-api-00024-hid` (tag nov08), 100 % traffic; tags nov07 removed on both. Rollback: traffic to `subverselab-site-00248-fiq` + `subverselab-api-00021-har`. NOT committed.
- Shipped every NEXT DEPLOY entry dated 7-8 Nov below (RU-8 1.1 room/manual/pictures, ADALET on sale, AHENK on sale + room, Redeem a code,
  Equipboard, T3 App Store ownership, JING FANG sign-in API + 1.4 room/manual/pictures).
- Secret `redeem-code-pepper` v1 (created by the owner) mounted on the API as REDEEM_CODE_PEPPER; LS_PRODUCT_SLUGS on site AND api = the 33 pairs +
  1508843:ahenk + 1509139:adalet (35).
- Tag smoke: api manifest 200, /api/catalog 200, /api/purchases/status 401, /api/redeem without token 401, /api/device/poll {"status":"expired"},
  /api/trial/start jingfang 400; no ERROR log on 00024. Site tag: / /plugins /plugins/{ru8,ru8/manual,jingfang,ahenk,adalet} /redeem /account
  /activate /sample-packs /api/download/manifest, RU8_Manual.pdf, ru8 og.jpg, jingfang panel-main.webp 200; /nope-404 404; AHENK room $29.99 +
  "1 January 2027", ADALET $15 and no "Coming soon", RU-8 room "EDIT screen" x5. Live after the switch: same 200s, www 301.
- NOT done in this session: Firestore rules release (the session's permission check refused `firebase deploy --only firestore:rules`; the
  catch-all already closes the four collections; owner runs it or allows it); LS JING FANG store codes NOT deactivated (Loot / APD instructions
  still say "redeem at checkout": send the new instructions first, then deactivate).

## DEPLOY PLAN for the batch (lead, 8 Nov 2026 ~04:20; NOTHING done yet — every outward step on the owner's go)
Ships together: RU-8 1.1 room/manual/pictures; ADALET on sale; AHENK on sale; Redeem a code; Equipboard footer; AHENK room; T3 App Store
ownership; JING FANG sign-in (API) + 1.4 room/manual. Live now (read 8 Nov): site 00248-fiq, api 00021-har = the rollback pair.
Pre-checks done 8 Nov ~04:20:
- Gate: eslint 0 errors (2 old warnings), build exit 0 (89 routes + homepage), 22/22 scripts/test-*.js (test-order fixture updated: jingfang and
  adalet now share the deploy day). Dev server: /plugins/ru8, /plugins/ru8/manual, /plugins/adalet, /plugins/ahenk, /plugins/jingfang,
  /plugins/jingfang/manual, /redeem, /plugins, / : 0 broken images, 0 console errors, 0 hits for the hyphenated brand / coming soon / beta;
  /plugins/ahenk shows "available shortly" x4 until the AHENK installers are published (expected).
- productDates: ru8.updated, jingfang.updated, adalet, ahenk all 2026-11-08 — change to the deploy day if it is later.
- api/redeemCodes.json --check: up to date (1,656 codes). API Dockerfile copies redeem.js + redeemCodes.json + trialGrant.js.
- Secret `redeem-code-pepper` does NOT exist yet in Secret Manager (only GRANT_SIGNING_KEY, roll-licence-key, mix-analyzer). Local file present.
- LS_PRODUCT_SLUGS (site AND api, identical, 33 pairs) lacks 1508843:ahenk and 1509139:adalet.
- Firestore rules diff only adds explicit `if false` blocks (the catch-all already closes them): release separately, not blocking.
- Installers on disk (all mac pkgs stapled):
  RU-8 1.1.0 mac 01_AI_Tools/subverselab-plugin-common/dist/1.1.0/RU-8-1.1.0-macOS.pkg (321,620,550 B) | win 01_AI_Tools/subverselab-ru8/build-windows/ci_1.1.0b/RU-8-windows-x64.zip (208,673,129 B)
  JING FANG 1.4.0 mac 01_AI_Tools/subverselab-studio/out/release-1.4.0/JingFang-1.4.0-macOS.pkg (126,718,722 B) | win dist/deploy_2026-11/jingfang_win/JING-FANG-windows.zip (41,786,114 B, run 42429221258)
  AHENK 1.0.0 mac 01_AI_Tools/subverselab-fazilsay/build-release/pkg/AHENK-1.0.0-macOS.pkg (2,470,267,840 B) | win dist/deploy_2026-11/ahenk_win/ (run 42411474239 AHENK-windows-setup, 2,453,854,908 B)
  ADALET 1.0.0 mac dist/1.0.0/Adalet-1.0.0-macOS.pkg (10,119,317 B) | win dist/1.0.0/ADALET-1.0.0-windows.zip (7,132,681 B)
Lead, 8 Nov ~04:40 (owner: "atladığın şeyler olabilir ... hepsini toparla"):
- JING FANG site pictures carried the HYPHENATED lockup and the 1.2 panel: panel-{main,drum,lab,micro,patch,seq}.webp, hero.webp, card-bg.webp,
  og.png rebuilt from the 1.4.0 panel (subverselab-studio build/ demo_render site -> marketing/site_14 -> tools/site_cutout.py, flattened on
  #033832 like before; CAMERA key and icon-only mark visible). box*.webp already say SUBVERSELAB.
- AHENK Windows: the setup from run 42411474239 is AHENK-0.1.0-Windows-Setup.exe (Inno AppVersion 0.1.0). DO NOT publish it. A plain run on
  bb229d3 (installer version from CMakeLists; e035c47 had a PowerShell parse error) was dispatched: subverselab-ahenk run 42435301228 -> use its AHENK-windows-setup
  (check the file name says 1.0.0).
  (Run 42433309829 is the MuseHub store_full build of the other session; not for the site.)
- News (live catalogue, written AFTER the downloads are published; files in docs/news_2026-11-08/): ahenk (order 1), adalet (2),
  ru8-update REPLACED (3; the live item says "1 January" in text and picture -> new text, picture ru8-11-edit.webp), jingfang-14 (4).
  Pictures: ahenk panel-stage.webp, adalet hero.webp, jingfang panel-main.webp (new), ru8-11-edit.webp — upload with catalog-cli media.
- Found, NOT fixed in this batch (pre-existing, live for weeks): OCR finds the hyphenated wordmark on 94 site pictures of TORNA, YANKI, ALEV,
  ELEK, KORO, TABAN, SEDA, KUBBE, KASET, MIHENK, HAVA, TUTKAL and three news pictures (elek, manuals, free-alev). PARKED in CLAUDE.md.
Order on deploy day (commands from Rules/DEPLOYMENT_REGISTRY.md / SITE_RUNBOOK.md):
  1. Secret Manager: create redeem-code-pepper from ~/.config/subverselab/redeem_code_pepper, secretAccessor for 90909956035-compute.
  2. Env on BOTH services: LS_PRODUCT_SLUGS = current value + ",1508843:ahenk,1509139:adalet"; api also --update-secrets REDEEM_CODE_PEPPER=redeem-code-pepper:latest.
  3. Deploy API (tag nov08), smoke on the tag (manifest 200, /api/redeem 401 without token, /api/device/poll), then 100 % traffic.
  4. Deploy site (tag nov08), smoke, 100 % traffic; drop the nov07 tags on both.
  5. publish_download.sh: ru8 mac|win 1.1.0, jingfang mac|win 1.4.0 (only after step 3), ahenk mac|win 1.0.0, adalet mac|win 1.0.0;
     /api/download/manifest lists them; the largest file (AHENK win setup, 2.45 GB) downloads end to end through the site.
  6. Live checks: /redeem with LOOTTEAMJFTX6ECY -> JING FANG on /account -> JING FANG 1.4.0 signs in; AHENK trial download on a fresh free account.
  7. Firestore rules release + anonymous check (separate go).
  8. Owner by hand in Lemon Squeezy: deactivate the JING FANG store codes (not ELEK/family); AHENK storefront if wanted; ADALET picture.
     Send the stores the new redeem instructions (launch_desk/REDEEM_INSTRUCTIONS_DRAFT.md).

## NEXT DEPLOY (prepared 8 Nov 2026) — RU-8 1.1: room copy, web manual and manual PDF (local, NOT deployed, NOT committed; SITE only)
- Done locally: `src/data/plugins.js` RU8 entry only (description, intro, new sections "New in 1.1", "Synth kits and sample kits", "The EDIT screen",
  "Your own samples, your own kits", "A drummer’s groove"; kits section names the sample kits; controls HUMAN text + EDIT and Your samples rows);
  `src/data/manuals/ru8.js` (web manual = RU8_Manual.html 1.1.0: sample kits table, synth kit redesign, HUMAN groove table, EDIT screen, your samples,
  user kits, spec rows); `public/plugins/ru8/RU8_Manual.pdf` = manual 1.1.0 (11 pages, 1,157,352 B, from 01_AI_Tools/subverselab-ru8/docs/manual).
  No price, checkout, offer date or other product touched. Facts from RU-8 STATUS.md (job21, job22, 8 Nov), SPEC.md and Source (read-only).
- SHIP ONLY WITH THE 1.1.0 INSTALLERS: the copy describes 1.1 (sample kits, EDIT, user samples); 1.0.0 is what /api/download serves today. At that deploy
  set productDates.js `ru8.updated` to the day 1.1.0 is published (store order: an update counts as a release; not changed now).
- Gate 8 Nov: `npx eslint .` 0 errors (2 old warnings); `npm run build` exit 0, 89 routes plus the homepage (dist/plugins/ru8 and /manual carry the new
  text, dist PDF identical to public); 22/22 scripts/test-*.js exit 0 (APPLE_TEST_ROOTS=1). pdftotext: 0 hits for AI, machine learning, neural, beta,
  coming soon, hyphenated brand.
- Lead, later 8 Nov: the RU-8 pictures carried the HYPHENATED lockup (rule break, live today). Replaced from the 1.1 panel (ui_snapshot --site, 2360 px ->
  WebP at each file's old size): panel-cream/night/powder/pink.webp, panel-rear.webp, panel-kit-{analog,dry,lofi,steel,trap}.webp (each with its kit's own
  preset in the bar), card-bg.webp, og.jpg (panel area swapped, text kept). Old files: scratchpad backup only. Still hyphenated / not redone: the 3D renders
  hero.webp, machine-3d.webp, box*.webp (lockup too small to read; need the Blender scene). "never the same one twice in a row" softened to "avoids" (the
  engine's weighted chain cannot avoid it for a weight above 50 %). Manual cover + rear picture swapped to the 1.1 panel. Gate after: eslint 0 errors,
  build 89 routes, 22/22 tests.
- Not checked: the room and manual pages in a browser (dev server not opened); no EDIT picture on the room yet.

## NEXT DEPLOY (prepared 8 Nov 2026, ~02:30) — ADALET ON SALE at $15 (local, NOT deployed, NOT committed; SITE AND API; owner 7 Nov "15 dolar yazalım imzala yeni klavuz ve ürün odalarını hazırla")
- Done locally: `plugins.js` ADALET_CHECKOUT (LS product 1509139, $15, licence keys off, hidden on the storefront) -> ADALET leaves LINE2 / "coming soon"
  and joins SOLO_PLUGINS like SEDA; PRICES.adalet 15; room copy without ORBIT, kick / bass via sidechain; `api/entitlements.js` SOLO_SLUGS gains 'adalet';
  productDates.js `adalet: 2026-11-08` (SET BOTH TO THE DEPLOY DAY); images lab / lab_dynamic / hero / og_lab / box / box-body / box-lid from the 1.0 panel,
  orbit.webp and front_orbit.png removed; public/plugins/adalet/Adalet_Manual.pdf = manual 1.0 (7 pages).
- Gate 7-8 Nov: eslint 0 errors (2 old warnings), build 89 routes, 22/22 scripts/test-*.js (test-download 106/106, test-testers 60/60 after adding 'adalet' to their fixed lists).
- The one active tester (Andre) gets ADALET free like SEDA.
- Installers: mac `01_AI_Tools/subverselab-plugin-common/dist/1.0.0/Adalet-1.0.0-macOS.pkg` (signed, notarised f8e81472…, stapled, 10,119,317 B);
  win `01_AI_Tools/subverselab-plugin-common/dist/1.0.0/ADALET-1.0.0-windows.zip` (CI run 42429221258, 7,132,681 B, VST3 + ADALET.exe, 1.0.0).
- AT DEPLOY (each on the owner's go), in order:
  1. Cloud Run env on subverselab-api: LS_PRODUCT_SLUGS gains "1509139:adalet" (read the current value first, keep every pair).
  2. Deploy API, then site, with the other NEXT DEPLOY entries.
  3. publish_download.sh adalet mac <pkg above> 1.0.0 and adalet win <the windows zip above> 1.0.0; then /api/download/manifest lists 1.0.0 and the
     largest file downloads end to end through the site.
  4. LS: upload `01_AI_Tools/subverselab-dyneq/docs/store/ls_adalet_4x3.jpg` as the product picture.

## NEXT DEPLOY (prepared 8 Nov 2026, ~01:05) — AHENK ON SALE: the room switched on (local, NOT deployed, NOT committed; SITE AND API; owner "ürün odasını hazırla")
- Done locally (the "AT LAUNCH" steps of "AHENK product room (switched off)" below that need no outside action):
  step 1b: `lipo -archs` on build-release AHENK.app / AHENK.vst3 / AHENK.component = x86_64 arm64; the notarised pkg was installed and checked on the
  owner's Mac 8 Nov 00:44 (then uninstalled on the owner's word) -> TRUST_LINE_AHENK and `formats` say "Apple Silicon and Intel".
  step 2: `AHENK_CHECKOUT` = https://subverselab.lemonsqueezy.com/checkout/buy/c37f6acf-46d9-4032-94a4-32eb1ecaad83 (LS 1508843, $29.99).
  step 3 (code half): `ahenk` added to SOLO_SLUGS in api/entitlements.js (kept in UNLISTED_SLUGS, de-duplicated).
  step 5: productDates.js `ahenk: { released: '2026-11-08', updated: '2026-11-08' }` — CHANGE BOTH TO THE DEPLOY DAY if it is not 8 Nov.
  Manual: public/plugins/ahenk/AHENK_Manual.pdf (manual 1.0, 19 pages, no iPhone / iPad / App Store; pdftotext 0 hits for AI, beta, coming soon,
  iPhone, iPad, App Store, Fazil, hyphenated brand); the room links "Read the AHENK manual (PDF)".
- Tests changed for "on sale": test-offers (switched-on case; trust line with Apple Silicon and Intel), test-trial (ahenk in SOLO_SLUGS),
  test-download and test-testers (owned / tester download lists gain 'ahenk'); check-responsive covers /plugins/ahenk.
- Gate 8 Nov ~01:00: `npx eslint .` 0 errors (2 old warnings); `npm run build` exit 0 (89 routes + homepage; dist/plugins/ahenk has the page,
  4 panel pictures, card, og.jpg and the manual; sitemap lists /plugins/ahenk); 22/22 scripts/test-*.js exit 0 (APPLE_TEST_ROOTS=1);
  check:responsive 10 routes clean at 320-1366 px. Looked at /plugins/ahenk in the dev server: price "$49 struck $29.99 — launch price until
  1 January 2027", trial lines, Buy $29.99, manual link; download buttons read "available shortly" until step 4 publishes the installers.
- STILL TO DO AT DEPLOY (each on the owner's go), in order:
  1. Cloud Run env on subverselab-api: LS_PRODUCT_SLUGS gains "1508843:ahenk" (keep every existing pair; read the current value first).
  2. Deploy API, then site, together with the other NEXT DEPLOY entries (redeem needs REDEEM_CODE_PEPPER mounted first).
  3. Firestore rules (trials/, device_codes/, redemptions/, redeemed_by_uid/) separately, then check as an anonymous visitor.
  4. publish_download.sh ahenk mac build-release/pkg/AHENK-1.0.0-macOS.pkg 1.0.0 and ahenk win <CI run 42411474239 AHENK-windows-setup> 1.0.0
     (the Windows artifact is 2,453,854,908 B; download it from the run first).
  5. LS: AHENK "Display on storefront" ON if wanted. 6b of the old entry: a fresh free account downloads the trial on mac + win end to end.
  6. 1 Jan 2027 00:00 TR: LS price 49 (reminder task ahenk-price-to-49 exists), rebuild + deploy for the prerendered $49.

## NEXT DEPLOY (prepared 7 Nov 2026, ~22:00) — "Redeem a code": store codes add the product to the account (local, NOT deployed, NOT committed; API AND SITE, API first)
- Lead change 7 Nov ~22:30 (supersedes the BLOCKER below): ELEK and family codes are no longer consumed on /redeem. `redeem.js`
  CHECKOUT_PRODUCTS: the API answers 200 {checkout} = that product's Lemon Squeezy checkout with checkout[discount_code]=<code>;
  RedeemCode.jsx adds the account's e-mail + uid and opens it ($0, one confirm), so LS keeps the code single-use and issues the key.
  One instruction for every store code (launch_desk/REDEEM_INSTRUCTIONS_DRAFT.md). At launch deactivate in LS ONLY the JING FANG
  store codes (LOOTJF…, APDJF…, the two JING FANG team codes); ELEK and family LS codes MUST stay active.
  Gate after the change: eslint 0 errors, build exit 0 (88 routes), 22/22 scripts/test-*.js exit 0 (test-redeem 16/16, ELEK/family
  cases rewritten: checkout link carries the code, nothing written, nothing owned before the LS order; dates still 403).
- Owner 7 Nov: a buyer who paid at a store (Loot Audio, Audio Plugin Deals) must not pass a second $0 checkout. Standard model (Arturia / NI /
  Plugin Alliance): sign in, type the code on /redeem (or /account → "Redeem a code"), the product is on the account; downloads and the
  plug-in's browser sign-in work from it. Stores may link `https://subverselab.com/redeem?code=XXXX` (prefills the field).
- API: `api/redeem.js` (new), `POST /api/redeem` {code} with the ID token -> 200 {ok, product, name} | 400 "That code is not valid." | 403 outside its
  dates (names the date) | 409 "That code has already been used." | 401 | 429 (10/min per IP and per account) | 503 (pepper missing / wrong). 2 KB body.
  Firestore `redemptions/{hash}` {product, store, batch, uses, maxUses, by:{uid:{at,email}}} (single use in one transaction, same uid again =
  idempotent 200) + `redeemed_by_uid/{uid}`. Ownership: entitlements.js readUidOwnership adds the code entries (downloads, /account, tickets),
  `ownedVia` returns 'code' (device approve, grant refresh, iOS entitlement); a family code makes server.js `launch2Access` answer 'paid'
  (opens exactly what a paid family order opens; no seat counted). Unverified e-mail: allowed (bound to the uid, like App Store purchases);
  the address must receive mail (requireDeliverable, the download rule). accountDeletion.js step 11: index deleted, uid + e-mail out of each
  redemption, the code stays used. firestore.rules: both collections closed (release separately). Dockerfile copies redeem.js + redeemCodes.json.
- Codes: `api/redeemCodes.json` built by `node scripts/build-redeem-codes.js` from the launch desk CSVs. 1,656 distinct codes: APD JING FANG 501
  (500 + APDTEAMJFLKAYV4, 3 uses), APD family 501 (500 + APDTEAMFMQ6AGZ4), Loot JING FANG 551 (50 + 500 + team), Loot ELEK 51, Loot family 51,
  Rekkerd family 1 (RKRDFAM8W3P). `..._JINGFANG_codes_for_Loot_500.csv` = batch2 exactly (500 duplicates dropped); the for_yemi copies are identical.
  APD windows in Istanbul days, inclusive: JING FANG 26 Jan – 11 Feb 2027, family 9 – 25 Feb 2027 (Loot, team, Rekkerd: no dates).
  The repository is PUBLIC, so the file has no plain code and no plain SHA-256: keys are HMAC-SHA256(REDEEM_CODE_PEPPER, code). The pepper is in
  `~/.config/subverselab/redeem_code_pepper` (600, made 7 Nov, never printed). New store codes: add the CSV to SOURCES in the script, rebuild, deploy the API.
- Site: `/redeem` (src/components/RedeemCode.jsx; prerendered noindex, X-Robots-Tag, CLIENT_ONLY_ROUTES, robots Disallow, not in the sitemap),
  "Redeem a code" fold on /account. Signed out: field + "Sign in to redeem" (the code is kept through the sign-in). check-responsive covers /redeem.
- Tests: new scripts/test-redeem.js 16/16 (per product, family opens the seven, 409, idempotent, team 3 uses, APD edges, 400s, pepper 503,
  unverified account, JING FANG device approve + grant refresh, deletion, rate limits, rules/Dockerfile, the committed file vs the CSVs).
  Gate 7 Nov ~22:00: `npx eslint .` 0 errors (2 old warnings); `npm run build` exit 0 (88 routes + homepage); 22/22 scripts/test-*.js exit 0;
  check:responsive 9 routes clean at 320-1366 px.
- BLOCKER for ELEK and family codes (not for JING FANG): ELEK and the seven family plug-ins unlock with a Lemon Squeezy licence key
  (plugin-common Licensing/License.h, no demo mode). A redeemed code gives the downloads but NO key, so those plug-ins would stay locked. Today's
  100 % LS checkout works because it makes a key. Until those plug-ins sign in with the account (the TRIAL_AND_SIGNIN grant, as JING FANG 1.4.0 /
  AHENK) or the server can issue them a key, keep ELEK and family codes on the LS checkout: do NOT deactivate those LS codes and tell those buyers
  the old way. JING FANG works end to end through /redeem (today's build has no gate per the JING FANG sign-in entry below; 1.4.0 signs in
  with the account, and must ship after this API is live). Unverified: whether today's JING FANG build really has no key gate.
- AT DEPLOY, in this order (each on the owner's go):
  1. Secret Manager: create `redeem-code-pepper` with the value of `~/.config/subverselab/redeem_code_pepper` (`gcloud secrets create redeem-code-pepper
     --data-file=~/.config/subverselab/redeem_code_pepper`), grant the API service account secretAccessor, mount it on subverselab-api as env
     `REDEEM_CODE_PEPPER` (`--update-secrets=REDEEM_CODE_PEPPER=redeem-code-pepper:latest`). Without it every code answers 503.
  2. `node scripts/build-redeem-codes.js --check` (file matches the CSVs), deploy the API, then the site.
  3. Firestore rules: `firebase deploy --only firestore:rules` (redemptions, redeemed_by_uid closed), then check as an anonymous visitor.
  4. Live check with one team code (e.g. LOOTTEAMJFTX6ECY, 3 uses): redeem on /redeem, the JING FANG card + download on /account, JING FANG 1.4.0 signs in.
  5. Lemon Squeezy (owner, by hand): deactivate the JING FANG store codes (LOOTJF…, APDJF…, LOOTTEAMJF…, APDTEAMJF…) so a code cannot be used twice
     (once at LS checkout, once on /redeem). LS orders do not record which discount code was used, so a code used at LS before this step cannot be
     found and blocked here. ELEK / family codes: see the BLOCKER above.
  6. Send the stores the new buyer instructions (launch_desk/REDEEM_INSTRUCTIONS_DRAFT.md); Loot's product sheet and APD's PRODUCT_INFO.txt
     currently say "redeem at checkout".
- Known: a deleted account's code stays used (no re-redeem, unlike an App Store purchase); admin Members does not show redeemed codes yet; the
  Licence keys fold says "your key appears here after a purchase" to a code-only owner.

## NEXT DEPLOY (prepared 7 Nov 2026, ~21:00) — Equipboard in the footer stores (local, NOT deployed, NOT committed; SITE)
- Owner 7 Nov: "alt fligrana ekipboardı da ekle" (Equipboard, equipboard.com, lists our plug-ins). `src/components/FooterStrips.jsx` STORES +
  { Equipboard, /partners/stores/equipboard.svg, 110x30 }: the equipboard.com header logo made a one-colour mask (square with the icon cut
  out + wordmark), looked at rendered. launch_desk/STORES.md logged. Gate: runs with T4's site gate (AHENK room) before the batched deploy.

## NEXT DEPLOY (prepared 7 Nov 2026, ~21:15) — AHENK product room (switched off) (T4; local, NOT deployed, NOT committed; SITE + one API line)
- 7 Nov ~23:30 (owner "lemon sequezy de ürünü aç"): Lemon Squeezy product CREATED and PUBLISHED: AHENK, id 1508843, variant 2349221,
  $29.99, tax category Software, licence keys OFF, NOT on the LS storefront (toggle off until launch), 3 images (stage, pianos, score),
  confirmation "Thank you, AHENK is yours" -> button "Go to your account" https://subverselab.com/account.
  Checkout URL to paste at launch: AHENK_CHECKOUT = https://subverselab.lemonsqueezy.com/checkout/buy/c37f6acf-46d9-4032-94a4-32eb1ecaad83 ;
  LS_PRODUCT_SLUGS gains "1508843:ahenk" (site + API). 1 Jan 2027 00:00 TR: LS price 29.99 -> 49 by hand (reminder to set).
- The room /plugins/ahenk is built and OFF: `AHENK_CHECKOUT = ''` in `src/data/plugins.js` (the JING FANG pattern). Off = no page in
  the build (`/plugins/ahenk` 404), no /plugins box, no homepage line, not in sitemap / llms.txt / launch2, prerender removes
  dist/plugins/ahenk. `npm run dev` only: the room with a disabled "Buy AHENK — $29.99 · Available shortly".
- Data: PRICES.ahenk 49; LAUNCH_PRICES.ahenk 29.99 / LAUNCH_ENDS.ahenk '2027-01-01' (00:00 Istanbul = 31 Dec 2026 21:00 UTC; "$49 struck
  $29.99 — launch price until 1 January 2027", then "$49" alone). Price floor: AHENK never sold before, so $29.99 is the floor for every
  later AHENK promotion. TRUST_LINE_AHENK "macOS 11 or later · Windows, 64-bit · …" (no architecture named, see step 1b). Copy only from
  the AHENK manual + STATUS 7 Nov; trial lines on the room; no App Store / iPhone / iPad. Pictures: public/plugins/ahenk/ (panel-stage /
  -pianos / -hall / -score .webp 1080x720, card-bg.webp 800x534, og.jpg 1080x567; from fazilsay docs/musehub/previews, 7 Nov).
  PluginRoom.jsx + prerender.js: optional `trialLines` and `activation` on a room. api/stats.js: '/plugins/ahenk' on the page-view
  allow-list (test-stats requires every plugins.js path; the JING FANG path was listed the same way before its launch).
- Tests: test-offers 5 -> 9 (AHENK before / at / after 1 Jan 2027 00:00 +03:00, trust line, banned words, switched off in every list);
  test-split 21 -> 22 (production build: no dist/plugins/ahenk, /plugins/ahenk 404, no "AHENK" on /, /plugins, /launch2, llms*.txt,
  sitemap; sitemap count includes AHENK_ON_SALE). Gate 7 Nov 21:15: `npx eslint .` 0 errors (2 old warnings); `npm run build` exit 0
  (87 routes + homepage); 21/21 scripts/test-*.js exit 0; check:responsive 8 routes clean at 320-1366 px.
- Known: the JS bundle carries the AHENK data object (copy, $49 / $29.99, image paths; the images 404) even while off; the HTML,
  sitemap and llms files do not. Same as JING FANG's object before its launch would have been.
- Trial download (decided and built 7 Nov ~23:15, replaces the OPEN item): the installer is a free download for any signed-in account
  (Pianoteq / Arturia / NI model; AHENK itself decides trial / owned / free mode through its signed grants). API: `/api/download/ticket`
  launchId 'trial' accepts the slugs of `api/trialGrant.js` TRIAL_PRODUCTS (only `ahenk`) on mac / win without any order; same auth,
  requireDeliverable (an unverified password account whose address receives mail is fine), 30/min per IP, counted in `trial/counter` +
  `downloads/{uid}` (Firestore rules: default deny already covers `trial`; nothing to release). JING FANG, ELEK and every other product:
  400 on 'trial', still owned-only on 'solo'. The public manifest lists `ahenk` only once it is in SOLO_SLUGS (step 3). Site: AHENK
  `trial: true` (src/data/plugins.js); PluginRoom shows "Download free trial for macOS / Windows" (outline buttons, DownloadButtons
  `verb` / `outline`) next to Buy, plus "Free trial: a free SubverseLab account, no card."; signed out the button opens sign-in / sign-up
  and the download starts after it; an owner sees the normal owned downloads instead. Part of the room, so it switches on with
  AHENK_CHECKOUT and is invisible until then. Tests: test-download 105 -> 106 (trial ticket for ahenk without ownership on mac + win, file
  served, counters, unverified 200, jingfang / elek / ru8 / koro / taban / racks 400 on 'trial', jingfang / elek 402 on 'solo', signed-out
  401, bounced / no-MX 403, 30/min then 429, manifest). Gate 7 Nov ~23:20: `npx eslint .` 0 errors (2 old warnings); `npm run build`
  exit 0 (88 routes + homepage); 22/22 scripts/test-*.js exit 0 (APPLE_TEST_ROOTS=1); check:responsive 9 routes clean at 320-1366 px
  (first run lost its local server at /help while another session rebuilt dist; the rerun was clean).
- AT LAUNCH, in this order (each on the owner's go):
  1. Lemon Squeezy: product AHENK, licence keys OFF, "Display on storefront" OFF, price set to the launch price $29.99 (as JING FANG /
     ELEK since 20 Oct: the LS price itself carries the launch price, no discount code in the link). On 1 Jan 2027 00:00 Istanbul
     (= 31 Dec 2026 21:00 UTC) set the LS price to $49.
  1b. Confirm the mac installer is universal (`lipo -archs` on AHENK.app / .vst3 / .component binaries) and then add "Apple Silicon and
     Intel" to TRUST_LINE_AHENK (and the AHENK `formats` line) in src/data/plugins.js.
  2. Paste the checkout URL into `AHENK_CHECKOUT` in src/data/plugins.js.
  3. api/entitlements.js: add "<LS product id>:ahenk" to LS_PRODUCT_SLUGS (Cloud Run env on subverselab-api; the site server does not read
     it since the split), move `ahenk` from UNLISTED_SLUGS to SOLO_SLUGS (then update the owned-list expectations in test-download /
     test-testers and the "ahenk in no listing" case in test-trial).
  4. Installers: `subverselab-plugin-common/tools/publish_download.sh ahenk mac <file> 1.0.0` and `... ahenk win <file> 1.0.0`.
     From then on the trial buttons work for any signed-in account (ticket launchId 'trial'); the manifest lists AHENK after step 3.
  5. src/data/productDates.js: `ahenk: { released: '<launch day>', updated: '<launch day>' }` (placeholder comment is there).
  6. `npx eslint .`, `npm run build`, every scripts/test-*.js, `npm run check:responsive`; look at /plugins/ahenk at 1440 and 375 px in
     light and dark, signed out and signed in (the "Download free trial" buttons, the owned downloads after a test purchase); then deploy
     (API with the site) on the owner's go.
  6b. After the deploy: as a fresh free account (not the owner's), "Download free trial for macOS" and "... Windows" download the real
     installers end to end through the site (the largest file); then a paid order shows the owned downloads instead.
  7. On 1 Jan 2027: LS price $49 (step 1), then rebuild and deploy so the prerendered HTML and JSON-LD say $49.
  Then /activate "not owned" (api/trialGrant.js BUY_URLS.ahenk = https://subverselab.com/plugins/ahenk, unchanged) links to a live
  page; today that link answers 404.
- Lead (T4 session, 7 Nov ~21:35): room copy follows AHENK 1.0: "Write notes" and the controls row name the drag grips (score dragged
  as MIDI onto a DAW track / MusicXML), "In your DAW" names the sustain / sostenuto / soft pedals, the microphone-named automation and
  "no latency" (all built and tested in fazilsay T4). Re-ran: eslint 0 errors, build exit 0, 21/21 test scripts exit 0.
  Manual: AHENK_Manual.pdf 1.0 (fazilsay docs/manual) is NOT on the site yet; it has an iPhone / iPad chapter (App Store), so it goes up
  (public/plugins/ahenk/, linked from the room like ELEK's) only when the owner allows App Store wording, or as a build without that chapter.
  Update 7 Nov ~23:30: that build exists now (fazilsay docs/manual/AHENK_Manual.pdf, 19 pages, no iPhone / iPad / App Store, "Apple Silicon
  and Intel", free trial download); the removed text waits in docs/manual/_ios_section_for_later.html. Not copied to public/ yet.

## NEXT DEPLOY (prepared 7 Nov 2026, evening) — AHENK: App Store purchases count as AHENK ownership (T3) (local, NOT deployed, NOT committed; API AND SITE)
- Moved here by the lead 7 Nov 20:20: T3 wrote it into the trial + sign-in entry, but that entry shipped in the 7 Nov deploy (API 00021 created
  14:31 UTC, T3 started 14:43 UTC), so none of this is live. Lead re-ran 7 Nov 19:55: 21/21 scripts/test-*.js exit 0 (test-appstore 30/30), eslint 0 errors.
- T3 (owner: "ahenki website lisans tanıma uygulama içi satın alma apple ve websitede tüm cihazlar için tek sahiplik
  adımlarını koştur"): App Store purchases of AHENK count as AHENK ownership. API before or with the site.
  - `api/appstore.js`: one table `APPLE_APPS` keyed by bundle id: RU-8 (`com.subverselab.ru8.app` / `.full` -> `ru8`, unchanged) and
    AHENK (`com.subverselab.ahenk` / `com.subverselab.ahenk.full` -> `ahenk`). `transactionProblem(tx, {slug})`, notifications and
    `readAppleOrders` use the row of the transaction's app; each linked, unrevoked purchase reads as an order of its own slug, so
    `ownedVia(..., 'ahenk')` = 'appstore' and `/api/device/approve` + `/api/grant/refresh` work for App Store buyers without more code.
    The free trial item `com.subverselab.ahenk.trial30` is never ownership (link 400, notifications ignore it). RU-8 names exported as before.
  - `api/server.js`: the iOS route pair is registered per app: `/api/ru8/ios/{entitlement,apple-purchase}` (unchanged answers and texts)
    and `/api/ahenk/ios/{entitlement,apple-purchase}` (same auth, 409 / 403 / Sandbox rules). New `POST /api/device/apple {device_code, jws}`
    (16 KB, 10/min/IP): the AHENK iPad app signs in through the browser (device flow, no Firebase token), so it attaches its verified
    App Store purchase to the pending code; `/api/device/approve` links it to the approving account first (409 -> `{ok:false,error:"linked elsewhere"}`).
    `/api/device/start` takes `platform:"ios"`: the "not owned" answer then has no `buy_url` (App Review 3.1.1) and lookup returns `device:"ios"`.
  - `api/trialGrant.js`: `deviceStart` platform, `deviceAttachApple`, `deviceApprove` links an attached purchase (`linkApple` injected).
  - Site: `src/components/ActivatePage.jsx`: "This purchase belongs to another account" (linked elsewhere); an iOS code says "device"
    and shows no Buy button. `/api/apple/notifications` handles both apps (REFUND / REVOKE / REFUND_REVERSED on AHENK purchases).
    Account deletion unlinks AHENK purchases the same way (accountDeletion.js was already product-blind). `ahenk` stays in UNLISTED_SLUGS.
  - Tests: `scripts/test-appstore.js` 20 -> 30 cases (AHENK link, crossed apps, trial item refused, 409, restore, Sandbox flag, desktop sign-in
    for an App Store buyer, refund by notification drops grant refresh and new sign-ins, REFUND_REVERSED, a RU-8 refund leaves AHENK alone,
    account deletion, device/apple attach + link + "linked elsewhere" + no buy link for iOS codes + refused inputs). Gate 7 Nov 18:00:
    eslint 0 errors (2 old warnings), `npm run build` exit 0, 21/21 `scripts/test-*.js` exit 0.
  - Owner's steps for this part (each on the owner's go): App Store Connect: AHENK app record (bundle id `com.subverselab.ahenk`), In-App
    Purchase capability, the two non-consumables `com.subverselab.ahenk.full` (price set by the owner, price floor rule) and
    `com.subverselab.ahenk.trial30` (free), App Group `group.com.subverselab.ahenk` on the app id and its AUv3; App Store Server
    Notifications V2 URL `https://subverselab.com/api/apple/notifications` (already the RU-8 URL: one URL serves both apps, set it on
    the AHENK app too). Nothing else changes in Cloud Run (APPLE_ALLOW_SANDBOX stays unset in production).


## NEXT DEPLOY (prepared 7 Nov 2026, night) — JING FANG signs in, owned-only (local, NOT deployed, NOT committed; API AND SITE)
- Owner 7 Nov: "sadece satın alanlar kullansın" (JING FANG: no trial). Must be live before the gated JING FANG 1.4.0 ships
  (target before 27 Nov; the build is not made yet).
- `api/trialGrant.js`: GRANT_PRODUCTS ['ahenk','jingfang'] for device/start and grant/refresh; TRIAL_PRODUCTS stays ['ahenk']
  (trial/start for jingfang -> 400 unknown product, nothing written); BUY_URLS.jingfang -> /plugins/jingfang.
- `src/components/ActivatePage.jsx`: the product's own name from the site data ("JING FANG", was slug.toUpperCase() = "JINGFANG").
- Tests: test-trial 21/0 (new case: no trial, not-owned answer with the JING FANG link, owned grant, refresh, refund -> not owned);
  test-download 105/0. Full gate run by the lead 7 Nov ~20:40 (JING FANG + T3 together): eslint 0 errors (2 old warnings), build exit 0
  (87 routes + homepage), 21/21 scripts/test-*.js exit 0, check:responsive 8 routes clean at 320-1366 px. JING FANG 1.4.0 (the gated
  plug-in) is NOT built yet; this server side can ship before it (no trial for jingfang; owned-only sign-in).
- J1 (7 Nov 2026, night; API session, lead to verify) — the 1.4.0 room and manual, SITE only (the plug-in itself is published with
  publish_download.sh, not by a deploy):
  - `src/data/plugins.js` JING FANG: `activation: JINGFANG_ACTIVATION` ("After you buy, sign in with your SubverseLab account inside
    JING FANG (it opens your browser); there is no key to type.") — the buy text on the room now says sign in instead of
    ACTIVATION_NO_KEY; two lines in the room's practical list (the camera; sign in once per computer, offline, renews every few days);
    the ELEK comment no longer says JING FANG has no in-app check. Prices, dates, LAUNCH / SALE / OFFERS untouched.
  - `src/data/manuals/jingfang.js` (/plugins/jingfang/manual): a "Sign in" section after Installation; CAMERA in the top-bar table and
    "The camera". `src/data/manuals/common.js` gettingIt(): `plugin.activation ||` before the noKey line (as PluginRoom buyText;
    any product with an `activation` line, e.g. AHENK if it gets a web manual, shows it there too).
  - `public/plugins/jingfang/JingFang_Manual.pdf`: the 1.4 manual (subverselab-studio/docs/manual, tools/make_manual.sh): Sign in,
    What's new in 1.4, the camera; the panel pictures re-shot from the 1.4.0 build (icon-only mark; the 1.2 pictures showed the old
    SUBVERSE-LAB wordmark).
  - ORDER: this text describes 1.4.0 (sign-in, camera); the site sells 1.2.0 until `publish_download.sh jingfang mac|win 1.4.0`. Deploy
    the API part first (before 1.4.0 is published), and this room / manual part with or right after the 1.4.0 publish. When 1.4.0 is
    published, set `src/data/productDates.js` jingfang.updated to that date (store order rule: a new version is a release).

## DEPLOYED 7 Nov 2026 (owner "deploy") — site AND API: `subverselab-site-00248-fiq` + `subverselab-api-00021-har` (tag nov07), 100 % traffic; tags nov06 removed on both. Rollback: traffic to `subverselab-site-00245-heb` + `subverselab-api-00018-yoy`. NOT committed.
- Shipped every NEXT DEPLOY entry below that is dated 6 Nov late or 7 Nov (headings still say "NOT deployed"): the free days kept
  internal, JING FANG $99 standing sale from 1 Dec, no updates term + ELEK manual PDF, plug-in trial + browser sign-in server side
  (AHENK), footer stores (Loot Audio, Audio Plugin Deals), Buy clicks by channel, footer social clicks, pack preview counts.
- AHENK gate wired: `roles/secretmanager.secretAccessor` on secret GRANT_SIGNING_KEY for 90909956035-compute (was no Secret Manager
  role); `--update-secrets=GRANT_SIGNING_KEY=GRANT_SIGNING_KEY:1` on the API revision (read back from the revision spec).
- Gate: eslint . clean; build exit 0; 21/21 scripts/test-*.js exit 0; check:responsive 8 routes clean at 320–1366 px; the API
  Dockerfile copies all 11 local modules server code imports.
- Tag smoke: api manifest 200, /api/catalog 200, /api/purchases/status 401, /api/trial/start unknown product 400 (route live),
  /api/device/poll {"status":"expired"}; site / /plugins /plugins/jingfang /plugins/elek /sample-packs /account /activate /terms
  /refunds /testers /help /api/download/manifest 200, /nope-404 404; footer "Also on MuseHub, KVR Audio, Gumroad, itch.io, Loot Audio,
  Audio Plugin Deals". Live subverselab.com after the switch: same codes, www 301, homepage "Black Friday|27 November" 0 (was 2+2),
  /terms "2 years" 0, JING FANG "$60 (regular $150), launch price until 1 December 2026"; no console errors on /; no ERROR logs
  on either new revision. (One 403 in the console on the tag URL only: not on subverselab.com.)
- NOT verified: light/dark at 1440 and 375 px by eye; a download ticket end to end (large and small); checkout links; a real
  trial/start or sign-in round trip on live (would write Firestore trials/ device_codes/ records; AHENK not on sale);
  Firestore rules for trials/ device_codes/ NOT released (the catch-all keeps them closed; separate release on the owner's go).
- By hand later: Lemon Squeezy JING FANG (1453169) free on 27 Nov 00:00 TR and $99 on 1 Dec 00:00 TR.

## NEXT DEPLOY (prepared 7 Nov 2026, evening) — the free days are internal: no Black Friday announcement before it starts (local, NOT deployed, NOT committed; SITE) — URGENT
- Owner 7 Nov: "haberlerden indirim ve bedava yayınlanacak tarihleri çekelim ... glyn haklı ... bunlar iç bilgi hiç bir yerde geçmemeli".
- LIVE NOW (checked 7 Nov with curl): the homepage shows "Black Friday" ×2, "27 November" ×2, "free instead" ×1 (the 6 Nov deploy).
  /plugins, /plugins/jingfang, /llms*.txt: 0. Panel news (catalog-cli list news): only `ru8-update`, no dates.
- `src/data/news.js` `jingfang-bf`: shown only while OFFERS.jingfang runs (offerActive), date "Black Friday", line without any date
  and without the "Until then it is $60" sentence. Before 27 Nov 00:00 TR nothing on the site says JING FANG will be free.
  Prices during the offer still read "Free … Black Friday: free until 1 December 2026" (the running offer, as the launch prices).
- test-listen: no Black Friday item and no free-day words before the offer; the item names no dates while it runs (69/0).
- Gate: `npx eslint .` no output; build exit 0; dist/index.html "27 November|Black Friday" = 0; 21/21 scripts/test-*.js exit 0.
- Footer stores checked against launch_desk/STORES.md: MuseHub, KVR Audio, Gumroad, itch.io, Loot Audio, Audio Plugin Deals = the six
  FOOTER: yes rows (Loot Audio listed its pages 7 Nov).
- With this deploy (owner 7 Nov "deploy tarafında ise ahenkin de lisans kapısı hazırsa bağla"): the trial + sign-in API entry below,
  plus mount the secret: `gcloud secrets add-iam-policy-binding GRANT_SIGNING_KEY --member=serviceAccount:90909956035-compute@developer.gserviceaccount.com --role=roles/secretmanager.secretAccessor`
  (the account has no Secret Manager role today) and `--update-secrets=GRANT_SIGNING_KEY=GRANT_SIGNING_KEY:1` on the subverselab-api deploy.
  Firestore rules (trials/, device_codes/) stay a separate release on the owner's go.

## NEXT DEPLOY (prepared 7 Nov 2026, evening) — JING FANG $99 from 1 Dec, regular $150 struck, no end date (local, NOT deployed, NOT committed; SITE)
- Owner 7 Nov: "jing fang 150 dolar üstü çizik 99 bizim websitemizde de aynı fiyat ikinci bir duruma kadar kalıcı indirim" (Loot Audio the same).
- `src/data/plugins.js`: SALE_PRICES { jingfang: { price: 99, from: '2026-12-01' } }, saleActive(); launchPriceActive / currentPrice /
  launchEndLabel / offerName / launchNote / priceText know the stage (no end date, no "launch price" words, struck $150).
  LaunchPrice.jsx, PluginsPage.jsx (no " · " or "until" without a name/date), prerender.js (no dash without a note), news.js
  (title "$99 instead of $150.", no "Launch price until" after 1 Dec). Measured: 7 Nov $60 / 28 Nov Free / 1 Dec 00:00:01 $99
  "(regular $150)" / June 2027 $99; ELEK $25 after 1 Dec, unchanged.
- Tests updated to the decision: test-offers (after the launch = $99, no end label), test-listen (news title after 1 Dec).
- Checks: eslint 0 errors; npm run build exit 0; all 21 scripts/test-*.js exit 0 (listen 69/0, offers 5/0, download 105/0).
- Lemon Squeezy by hand on 1 Dec 00:00 TR: product 1453169 price $99 (not $150 as written earlier).

## NEXT DEPLOY (prepared 7 Nov 2026, evening) — no updates term anywhere (local, NOT deployed, NOT committed; SITE)
- Owner 7 Nov: "bizim sitedeki 2 senelik ibaresini de kaldıralım … bu pluginlerin gelişebilecek version sayısı sınırlı".
  Every "2 years of updates" promise is gone: UPDATES_LINE is now "Updates appear on your Account page; the version you have
  keeps working forever." (src/data/plugins.js; UPDATE_YEARS removed there), the trust lines, /plugins meta description,
  Terms + Refunds (legalContent.js), the customer Learn card (learnContent.js), InfoFigures (bar + "+2 years" scale gone),
  /account (no "Updates until" on keys, no dates on the Updates card; .acct-help-dates CSS removed).
- API unchanged in behaviour: /api/purchases/status and /licenses still return updatesUntil (purchase + 2 years) but nothing
  shows it and nothing gates on it; comment in api/entitlements.js says so.
- ELEK manual: Specifications "Updates" row rewritten; PDF re-printed with headless Chrome (6 pages, as before) into
  public/plugins/elek/Elek_Manual.pdf and 01_AI_Tools/subverselab-splitter-desktop/docs/manual/.
- Checks: eslint 0 errors; npm run build exit 0; all 21 scripts/test-*.js exit 0 (e.g. download 105/0, testers 60/0, pages 11/0); "2 years" count 0 in dist elek page, dist terms, llms-full.txt.

## NEXT DEPLOY (prepared 7 Nov 2026) — plug-in trial + browser sign-in, server side (AHENK first) (local, NOT deployed, NOT committed; SITE AND API)
- Contract: `01_AI_Tools/subverselab-plugin-common/docs/TRIAL_AND_SIGNIN.md` ("Signed grants", "Endpoints", "Site page"). The C++ side
  is written against the same text; nothing ships until the AHENK build that uses it is approved.
- API (`api/trialGrant.js` new, `api/server.js`, `api/entitlements.js`, `api/Dockerfile` copies trialGrant.js):
  `POST /api/trial/start`, `/api/device/start`, `/api/device/approve` (Bearer Firebase ID token), `/api/device/poll`,
  `/api/grant/refresh`, plus `/api/device/lookup` (Bearer; site page only: product + computer name before the button).
  Grants = textbook RSA-2048 over SHA-256 (privateEncrypt + RSA_NO_PADDING), payload fields in the contract's order.
  4 KB bodies, 30 / minute / IP per route, failures plain text 503 / 429 / 413. Products with a trial: `['ahenk']`.
  Ownership = `ownedVia`; `ahenk` is in a new `UNLISTED_SLUGS` (counts in OWNABLE_SLUGS only), NOT in SOLO_SLUGS/PLUGIN_SLUGS,
  so it appears in no manifest, download ticket, tester list, account list or store page until it is on sale.
- Site: `/activate?code=…` (`src/components/ActivatePage.jsx`, route in `src/App.jsx`); prerendered noindex page
  (`scripts/prerender.js`), `server.js` CLIENT_ONLY_ROUTES + X-Robots-Tag noindex, robots.txt Disallow (`scripts/generate-sitemap.js`);
  not in the sitemap (checked: 0 hits in dist/sitemap.xml). No price, no counts, brand tokens only.
- Tests: `scripts/test-trial.js` 20 cases (npm `test:trial`; signature round trip incl. m^e mod n == sha256 in BigInt, field order,
  trial idempotence + 30-day ends, device flow, not owned stays pending, expiry, consume-once, refresh owned / refunded / bad
  signature, unknown product, ahenk in no listing). `scripts/test-download.js` +4 route cases (503 without key, trial route,
  device flow end to end through the routes, 429) -> 105 cases. The 9 tests that load server.js map the new import.
  C++ fixture: `api/testdata/grant_fixture.json` (THROWAWAY TEST KEY, private half never saved; `node scripts/test-trial.js --write-fixture`).
  Gate 7 Nov: eslint 0 errors (2 old warnings), build exit 0 (87 routes + homepage), 21/21 test files pass (520 cases).
- BEFORE / WITH THIS DEPLOY (each on the owner's go, nobody else does it):
  1. Create the RSA 2048 private key, store it in Secret Manager as `GRANT_SIGNING_KEY`, mount it as env on `subverselab-api`
     (PEM; a one-line value with literal `\n` also works). Its public half ("e,n" hex) goes into AHENK `Source/Licensing/GrantKey.h`
     in place of the dev key (release step). Without the secret every route answers 503 "Service not configured" (safe).
  2. `firestore.rules`: `trials/` and `device_codes/` spelled out closed (the catch-all already closed them). Released separately
     (`firebase deploy --only firestore:rules`), not part of the Cloud Run deploy.
  3. When AHENK is sold: its Lemon Squeezy product id -> `LS_PRODUCT_SLUGS` "<id>:ahenk" (or the panel's product id), and its
     page at /plugins/ahenk (the "not owned" answer links there; 404 until then).
- Deploy the API before or with the site (the page calls the new routes).
- 7 Nov afternoon (owner "anahtarı üret", then "deploy yok, ürün panelden eklenir"): step 1 half done. Secret `GRANT_SIGNING_KEY`
  version 1 created in project-62238635-aae4-41f4-880 (RSA 2048 PKCS#8 PEM; checked: read back from Secret Manager, signed with
  trialGrant.js, verified with BigInt and by the C++ plug-in test; local copy deleted). NOT mounted on subverselab-api (that makes a
  new revision = a deploy). Public half is in AHENK GrantKey.h (kGrantKeyIsDev = false). NO DEPLOY by owner's word: until this entry
  ships, the routes do not exist live (AHENK falls back to a local trial count, sign-in fails "no connection").
## NEXT DEPLOY (prepared 6 Nov 2026, late evening) — Loot Audio + Audio Plugin Deals in the footer stores; Buy clicks by channel; footer social clicks (local, NOT deployed, NOT committed; SITE AND API)
- Owner 6 Nov: "yeni anlaştığımız mağazaların logolarını filigrana ekle, kuyruktaki deployda gidecek" and "alt footerdaki sosyal
  hesaplardan websiteye gelen trafiği de takip etmemiz lazım, kendi analytic tarafımızda başka iyileştirmeler öner ve yap".
- Footer stores (`src/components/FooterStrips.jsx` STORES): + Loot Audio (`public/partners/stores/lootaudio.svg`, the lootaudio.com
  header SVG, viewBox cropped to the lockup, 67x36) and Audio Plugin Deals (`audioplugindeals.png`, audioplugin.deals logo, 149x26), both as
  one-colour masks like the others. Checked on the dev server: both files 200, the rotation reached LOOT AUDIO (looked at), the APD mask
  drawn in the footer ink (looked at). NOTE (STORES.md rule "FOOTER only when LIVE"): owner's explicit request; before the deploy check
  that Loot lists a SubverseLab product; APD's JING FANG feature starts 27 Jan 2027.
- Incoming social traffic was already counted (referrer host + ?utm_source, admin Stats "social"). New:
  - Buy clicks by channel: the landing page stores the referrer and utm_source in session storage `svl-via` (useHitCounter.js); a Buy click
    sends them; `stats.js viaChannel()` keeps ONLY a channel name (youtube … linkedin) or direct / other / unknown, in site_stats.buyvia
    "<slug>|<channel>". Admin Stats table "Buy clicks by where the visit came from".
  - Footer social icon clicks: `sendSocialClick(channel)` from Footer.jsx (each SOCIAL entry has `ch`), site_stats.outs; table "Footer social icon clicks".
  - Privacy text: names the icon clicks, the channel on a Buy click and the `svl-via` session flag (LEGAL_UPDATED already 6 Nov).
- Tests: test-stats.js 28 cases (new: channel attribution incl. "no host or address stored", social clicks, unknown channel refused, bots).
  Gate: eslint 0 errors (2 old warnings), build exit 0 (86 routes + homepage), 20/20 test files pass.
- Dev server (beacons intercepted, none sent): footer YouTube click -> {out: youtube}; a tab marked as from l.instagram.com, Buy on
  /plugins -> {buy: family, …, viaRef: https://l.instagram.com/, viaSrc: ""}.
- Deploy the API with (or before) the site (same reason as the preview counter below).

## NEXT DEPLOY (prepared 6 Nov 2026, evening) — sample pack preview plays counted (local, NOT deployed, NOT committed; SITE AND API)
- Owner 6 Nov: before moving the card previews to SoundCloud, measure our own preview plays ("evet sayacı ekle, deploy listesine koy").
- `api/stats.js`: the cookieless counter takes `{preview: <pack slug>, place: card|page|soundcloud}` (`PREVIEW_PLACES`), counted
  under "<slug>|<place>" in site_stats/{day}.previews, never as a page view; junk slug / unknown place / bots not counted; capped at
  `MAX_PREVIEW_KEYS` (200) a day. `aggregateViews` gives `preview_plays` and a per-pack list (card / page / soundcloud / total);
  /api/admin/stats returns them under `traffic`.
- Site: `sendPreviewPlay()` (`src/hooks/useHitCounter.js`); `useSnippet({slug, place})` in `packs/Snippet.jsx` reports the first
  play of a player once per page load (pause + resume is not a new play): the cover key = card, the pack page strip = page.
  `packs/SoundCloudPlaylist.jsx` reports the widget's PLAY once per pack per page load (place soundcloud); a row clicked before
  the widget is bound is counted on the click. Admin → Stats → "More detail": table "Sample pack preview plays".
- Privacy page: the counter paragraph names preview plays; `LEGAL_UPDATED` 24 Oct -> 6 November 2026 (privacy and terms share it).
- IMPORTANT: deploy the API with the site (or before). The live API (00018) has no preview branch and would count a preview beacon as
  a page view of /other.
- Gate 6 Nov evening: eslint 0 errors (2 old warnings); build exit 0 (86 routes + homepage); 20/20 test files pass
  (test-stats.js 27 cases incl. the new preview case; its privacy-text assertion updated).
- Checked on the dev server (subverselab-site-dev-local + local API, beacons intercepted in the page, nothing sent to Firestore):
  /sample-packs cover key play, pause, play = 1 beacon {preview: 8bitorchestral, place: card}, a second cover = its own beacon;
  SoundCloud list, real click on Kotoflux = 1 beacon {kotoflux, soundcloud} (a scripted click cannot start the widget: autoplay);
  /sample-packs/woodpanel strip play/pause/play = 1 beacon {woodpanel, page}. Console: no new errors from this change
  (64 older "<rect> x NaN" lines from earlier in the session did not grow on a fresh load).
- Not verified: the admin Stats table in the browser (needs an admin sign-in), live numbers.

## DEPLOYED 6 Nov 2026 (owner "deploy et" after the JING FANG Black Friday news) — site AND API: `subverselab-site-00245-heb` + `subverselab-api-00018-yoy` (tag nov06), 100 % traffic; tags nov05 (site) and nov04 (api) removed. Rollback: traffic to `subverselab-site-00242-vor` and `subverselab-api-00015-cem`. NOT committed
- Shipped every NEXT DEPLOY entry prepared 4-6 Nov below (the headings still say "NOT deployed": they are now in 00245-heb): partner ?aff= links, JING FANG Black Friday offer (27 Nov 00:00 - 1 Dec 00:00 TR) + its first news frame `jingfang-bf` (date range in the frame; the older JING FANG frame hides while the offer runs), sample pack data regenerated (no "draft" licence), /testers MuseHub e-mail, X / Bluesky / Ko-fi in the footer, social visits in admin Stats, one site search, SoundCloud + products from the panel, TUTKAL how-to v3.
- Fix found by the gate: `.footer-social` did not wrap, so the three new icons made 8 routes scroll sideways (320: +127 px, 375: +74, 414: +37); `flex-wrap: wrap` in `src/index.css`. check:responsive 8 routes clean at 320-1366 px after it.
- Gate: eslint 0 errors (2 old warnings); build exit 0 (86 routes + homepage, sitemap 67 URLs, as 1 Nov); all 20 scripts/test-*.js exit 0.
- Tag smoke: site /, /plugins, /plugins/jingfang, /sample-packs, /account, /testers, /help, /api/download/manifest 200, /nope-404 404; api manifest 200, /api/catalog 200, /api/purchases/status 401; no ERROR logs on either revision (30 min). Live subverselab.com: / /plugins/jingfang /testers manifest 200, purchases/status 401, /nope-404 404, www 301, homepage HTML carries "JING FANG is free".
- NOT done / NOT verified: (1) the panel news `ru8-update` has order 5, so it still leads the homepage and the Black Friday frame (order 10) is second; to put Black Friday first and RU-8 second set `ru8-update` order to 15 in /admin → Catalogue → News (needs an admin agent key; owner). (2) Lemon Squeezy: product 1453169 must switch to free on 27 Nov 00:00 TR and back to $150 on 1 Dec 00:00 TR; owner says it is scheduled, NOT checked (a UTC schedule would leave a 3 h gap). (3) Audio Plugin Deals JING FANG feature ($49, 27 Jan - 9 Feb 2027) vs a free week: owner's call. (4) Not opened in a browser in light/dark at 1440 and 375 px; the post-deploy checklist (download ticket end to end, checkout links, console/CSP) was not run. (5) Firestore rules not released. (6) The 19 SoundCloud links are not written yet.

## DEPLOYED 5 Nov 2026 (~02:30 TR, owner "bizde de 79,99 olacak bu şekilde deploy et toplamından yüzde 50 indirim") — site only: `subverselab-site-00242-vor` (tag nov05), 100 % traffic; tag nov04b removed. Rollback: 00239-noc. NOT committed
- Shipped the two entries below: the family list price (this one) and the footer store marks (prepared 5 Nov). The 4 Nov night
  "no draft licence wording" entry did NOT fully ship: `src/data/samplePacks.js` (dated 4 Nov 04:19) still holds `licence.draft: true`
  and "SVL X - Licence (draft)" for 15 packs, so the pack pages still show "Licence summary (draft)" as before. Open: regenerate the data.
- Tag smoke: /, /plugins, /sample-packs, /account, /api/download/manifest 200; /nope-404 404; /plugins#family "$79.99 $39.99 -50%
  Bought one by one: $115", key "Get the family — $39.99"; only error POST /api/hit 403 on the tag origin (expected). Live
  subverselab.com/plugins#family the same, no console errors.

### (prepared 5 Nov 2026, night) — the family shows its list price, $79.99 → $39.99 (−50 %)
- 5 Nov owner decision: the site keeps this display ($79.99 struck, $39.99, -50%) with no end date, and Lemon Squeezy stays at $39.99 (product 1414121). No date-driven change, no 50% code, nothing for the 1 Dec deploy. Only MuseHub ends its discount on 4 Jan 2027 (then 79.99 there).
- Owner 5 Nov: MuseHub caps a discount at 50 %, "yüzde 50 kuralını subverselab'de de uygulayacağız". MuseHub bundle the same
  night: Base 79.99 + Discount 39.99 (5 Nov 2026 → 4 Jan 2027). Jeanette told (labsubverse, 5 Nov 02:09): the site is never cheaper.
- `src/data/plugins.js`: `FAMILY_LIST_PRICE = 79.99`, `FAMILY_DISCOUNT_PCT` (computed, 50). `FamilyBand.jsx`: struck $79.99, $39.99,
  "-50%", then "Bought one by one: $115" as before. CSS `.family-band-price s / em`. `scripts/lib/llmsProducts.js`: "(list price $79.99)".
  The checkout price does not change ($39.99, Lemon Squeezy 1414121); upgrade prices unchanged.
- Gate 5 Nov night: eslint 0 errors (2 old warnings), build exit 0 (86 routes + homepage), 15 of 16 test files pass; `test-sample-packs.js`
  still fails the same 2 licence-draft cases as the entry below (not this change). Dev server /plugins#family reads
  "$79.99 $39.99 -50% Bought one by one: $115" (light, 800 px).

### (prepared 5 Nov 2026, shipped in 00242-vor) — store marks take turns in the footer's middle through a glitch
- Owner 5 Nov: "alta dönen filigrandaki yayın mağazalarımızı ortadaki boşlukta glitch efektiyle döndürelim".
- `src/components/FooterStrips.jsx`: the stores left the drifting bottom line (it now carries the seven hosts only); new
  `FooterStores` shows MuseHub, KVR Audio, Gumroad, itch.io one at a time, every 3.4 s, swapped through a 0.46 s glitch
  (sliced, shifted ink copy plus two channels in `--color-accent-light` / `--color-gold-bright`). Not links. Paused while the tab
  is hidden; with reduced motion the four stand side by side, no glitch. `Footer.jsx`: placed between the brand column and the
  link columns; under 760 px it drops below the links. CSS: `.footer-stores*` in `src/index.css`.
- PARKED (owner 5 Nov): the App Store joins this rotation once a SubverseLab product is listed there: one entry in `STORES`
  (FooterStrips.jsx) plus a one-colour mark in `public/partners/stores/`; nothing else changes.
- Checked 5 Nov on the dev server: 1600×900 light, the mark centred in the gap, a glitch frame caught mid-swap (MuseHub → KVR);
  375 px dark, below the links, page width 375 (no sideways scroll).
- Gate 5 Nov: eslint 0 errors (2 old warnings), build exit 0 (86 routes + homepage), test files 15 of 16 pass. `test-sample-packs.js`
  fails 2 cases (parseLicence DRAFT flag; prerender still finds draft licence wording) and warns STALE zip sizes for the importer
  packs: `src/data/samplePacks.js` does not match the fixed zips of the 4 Nov night entry below. Not caused by the footer change.

## CLOSED 6 Nov 2026 (owner: Rekkerd is not a store, no logo in the footer) — was PARKED 5 Nov: Rekkerd logo as a watermark in the footer
- Owner 5 Nov: thank Rekkerd by showing its logo as a watermark in the footer (src/components/FooterStrips.jsx, the drifting host line).
  Asked Ronnie (ronnie@rekkerd.org, labsubverse thread "Deal: the SubverseLab plugin family is back at $39.99", sent 5 Nov 22:52 TR,
  same mail: the family price has no end date on the site). Build only after his yes; one-colour mark like the other hosts.

## NEXT DEPLOY (prepared 6 Nov 2026) — partner ?aff= links reach the checkout (local, DEPLOYED 6 Nov in 00245-heb, NOT committed; site only)
- Owner 6 Nov: Rekkerd is our first Lemon Squeezy affiliate (Rekkerd Sounds #74517, approved; only the family, 30 %, code aff=qbnJo,
  reader code REKKERD10 = 10 %). Without this a partner's link to subverselab.com credits nothing, because our Buy keys open
  Lemon Squeezy without the partner's code. Chosen instead of Lemon Squeezy's tracking script (owner said "tracking code"): the
  script sets a cookie before any consent and needs a CSP hole for lmsqueezy.com; this keeps the privacy page's "nothing before you choose".
- `src/affiliate.js` (new): `captureAffiliate()` keeps a valid `?aff=` code ([A-Za-z0-9]{3,32}) in session storage `svl-aff` for the
  tab; `withAffiliate()` adds `aff=` to lemonsqueezy.com checkout URLs only. `main.jsx` captures on load; `withBuyer()`
  (BuyButton.jsx, also used by PackKey.jsx for packs and the sweep) now passes every checkout link through it. Privacy policy:
  one new line under "Cookies and browser storage" (legalContent.js). CSP unchanged, no new script.
- Limit: the partner is credited when the visitor opens the checkout from the same tab (Lemon Squeezy's 30-day window starts at the checkout).
- Gate 6 Nov: eslint 0 errors (2 old warnings); build exit 0; tests 18 pass, 1 fail = `test-sample-packs.js`, the same 2 licence-draft
  cases as before; new `scripts/test-affiliate.js` 8/8. Dev server (5182): /news?aff=qbnJo then /plugins → svl-aff = qbnJo, 16 of 16
  lemonsqueezy links carry aff=qbnJo (family: …/7eb4adc0-…?aff=qbnJo). Not verified: that Lemon Squeezy records a referral from
  ?aff= on a /checkout/buy/ URL (not clicked, to keep Rekkerd's click count clean) — check with the first real referral.

## NEXT DEPLOY (prepared 6 Nov 2026) — JING FANG free for Black Friday (local, DEPLOYED 6 Nov in 00245-heb, NOT committed; site only)
- Owner 6 Nov: "ziyaret ettiğim bütün sitelerde black friday kampanyası var bizde jing fang ile katılalım. süre boyunca jing fangi
  beleş verelim yereldeki kameralı sürümü sarmaya gerek yok mevcut sürüm sadece". The current release (v1.2.0, as published) only;
  nothing is built or packaged.
- Price floor checked: admin Stats all time (6 Nov) JINGFANG 0 paid / 1 free order; not on MuseHub. Free undercuts no buyer.
  CONFLICT to weigh (owner): Audio Plugin Deals accepted a JING FANG feature at $49 vs $150, 27 Jan – 9 Feb 2027
  (launch_desk/APD_AILE_2026-11-05.md); a public free week before it lowers what that deal can sell.
- `src/data/plugins.js`: OFFERS.jingfang {price 0, label "Black Friday", starts 2026-11-27, ends 2026-12-01} (00:00 Istanbul, the same
  end moment as the launch price), offerActive, priceWord ("Free" for 0), offerName; launchPriceActive / currentPrice /
  launchEndLabel / launchNote / priceText now honour an offer first. `LaunchPrice.jsx` ($150 struck, "Free"), `BuyButton.jsx`
  ("Get JING FANG free", never "Buy — $0"), `PluginsPage.jsx` (" · Black Friday"), `LaunchPage.jsx`, `news.js` (title "Black Friday:
  free instead of $150.", line "Free until 1 December 2026: the current release, the full instrument, yours to keep."),
  `scripts/prerender.js` (static HTML says Free, not $0). New `scripts/test-offers.js` (5 cases).
- The pages switch by themselves at both moments (decided in the browser); the prerendered HTML is as new as the last build, so build
  and deploy BEFORE 27 Nov (the static HTML then still shows $60 until a rebuild; the React page corrects itself on load).
- Lemon Squeezy, by hand, owner's go each: 27 Nov 00:00 TR product 1453169 (checkout 2f6933ca…) Single payment $60 -> Lead magnet
  (free, e-mail only, like ALEV; the $0 order path is the one the 1 existing free JINGFANG order took); 1 Dec 00:00 TR -> Single payment
  $150 (already due that day: the launch price ends). The download, licence and webhook paths are unchanged.
- Dates are the standard Black Friday – Cyber Monday window (27–30 Nov); the owner may set others (one line in OFFERS).
- Checked 6 Nov on the dev server with the clock set to 28 Nov 12:00 TR: /plugins box "$150 Free · Black Friday ... until 1 December
  2026"; home news title "BLACK FRIDAY: FREE INSTEAD OF $150."; node: before 27 Nov $60, 27 Nov 00:00 TR Free, 1 Dec 00:00 TR $150,
  ELEK unchanged ($7). Not seen: the room's buy key signed out (this browser is the admin account, which owns JING FANG).

## NEXT DEPLOY (prepared 6 Nov 2026) — sample pack data regenerated, the "draft" licence gate green again (local, DEPLOYED 6 Nov in 00245-heb, NOT committed; site only)
- The 4 Nov night entry below had regressed: `src/data/samplePacks.js` (4 Nov 04:19) still held licence.draft true / LICENCE_DRAFT.txt
  for 15 packs and the old zip sizes, and the importer's "(draft)" title strip was gone; test-sample-packs.js failed 2 cases.
- 6 Nov: `node scripts/import-sample-packs.js` (15 packs, Preview folders present); the 45 cover files restored from a backup of
  public/sample-packs taken just before (the importer rewrites them; the live ones = covers/v2 = the panel's); diff of the data:
  only draft true->false, LICENCE_DRAFT.txt->LICENCE.txt, zipBytes / unzippedBytes, zipSha256 and the header line, 15 each.
  `scripts/import-sample-packs.js` parseLicence drops a trailing "(draft)" again.
- Gate 6 Nov (whole tree): eslint 0 errors (2 old warnings); build exit 0 (86 routes + homepage); all 20 scripts/test-*.js pass
  (test-sample-packs 16/16, no STALE warnings).
- Still owner's go, same day as the deploy: re-upload the 15 importer zips + Woodpanel (out/SVL_*.zip) with publish_download.sh so the
  download matches the page's size and holds LICENCE.txt.

## NEXT DEPLOY (prepared 6 Nov 2026) — /testers asks for the MuseHub account e-mail (W13; local, DEPLOYED 6 Nov in 00245-heb, NOT committed; site + API)
- MuseHub adds beta testers by the e-mail of their MuseHub account. The application form has a new optional field "MuseHub account e-mail (for beta builds on MuseHub)".
- `src/components/TestersPage.jsx` (field `musehubEmail`); `api/server.js` `readApplication` (optional; trimmed, lower-cased, max 254, same shape check as the other e-mail fields; malformed = 400; stored on `tester_applications/{e-mail}.musehubEmail`, '' when empty);
  `src/components/AdminPanel.jsx` (shown under the answer in the applications table); `scripts/catalog-cli.js testers list` (adds the field to the list). The admin has no other export.
- Needs API and site deploy (both touched). Firestore rules: nothing to change (`tester_applications` is closed to clients, no field list), so no rules deploy is needed.
- Gate 6 Nov: eslint 0 errors (2 old warnings), build exit 0 (86 routes + homepage), every `scripts/test-*.js` passes except `test-sample-packs.js` (the same 2 licence-draft cases as above, not this change); `test-testers.js` 60 cases, 0 fail, incl. the new one (valid accepted, malformed rejected, optional).
- Draft mail to existing applicants: `01_AI_Tools/instagram_2026-10/launch_desk/MUSEHUB_TESTER_MAIL_DRAFT.md` (not sent).

## NEXT DEPLOY (prepared 6 Nov 2026) — X in the footer (local, DEPLOYED 6 Nov in 00245-heb, NOT committed; site only)
- Owner 6 Nov: "x hesabım chrome da açık bunu subverselab e çevirelim". Done in Chrome (live, no deploy): @SenolSahan50530 (Aug 2024,
  0 posts, 0 followers, following @Google) renamed to @SubverseLab (the handle was free), name SubverseLab, bio "Audio plugins, sample
  packs and preset packs for music producers.", website https://subverselab.com, avatar soundcloud-avatar-1000.png, header
  mastodon-header-1500x500.jpg (same set as Bluesky / Mastodon).
- `src/components/Footer.jsx` SOCIAL += X (https://x.com/SubverseLab); `scripts/prerender.js` sameAs += it; icon `public/social/x.svg`
  (Simple Icons 13.21.0, CC0). Stats already maps t.co / x.com to the X channel (entry below).
- Gate 6 Nov: eslint 0 errors on the two files; build exit 0 (dist/index.html carries the sameAs line, dist/social/x.svg present);
  test-pages 11 passed. Dev server 746 px: eight icons in one row, X last, links to x.com/SubverseLab.

## NEXT DEPLOY (prepared 6 Nov 2026) — visits from our social accounts in admin → Stats (local, DEPLOYED 6 Nov in 00245-heb, NOT committed; site AND api)
- Owner 6 Nov: "sosyal hesaplardaki paylaşımlarımıza bak. buralardan ne kadar kullanıcı geldiğini site kodunda ayarlayalım".
- Live numbers before the change (admin Stats, 30 days to 6 Nov): 4,791 visits; (direct) 2,037; youtube.com 514; t.co 24; no instagram,
  tiktok, soundcloud, mastodon, bsky or ko-fi host in the top 20. In-app browsers send no referrer, so those visits sit in (direct).
- Posts read 6 Nov: YouTube 15 videos, description links plain subverselab.com/<page>; Mastodon 2 posts (plain links); Bluesky 0 posts;
  Instagram 39 posts, bio link www.subverselab.com (bio still the old "Free tools ... Runs in your browser" text); TikTok no video;
  SoundCloud 19 demos, links to the pack pages. None carries a tag.
- `api/stats.js`: SOCIAL_CHANNELS (youtube, instagram, tiktok, soundcloud, mastodon, bluesky, kofi, x, facebook, threads, linkedin),
  channelOfHost (referrer host -> channel), channelOfSrc (utm_source -> channel; anything else is dropped). The counter keeps a new
  per-day map `srcs`: "<channel>|link" (tagged, referrer did not show the channel) or "<channel>|both"; the referrer host still goes
  into `refs` as before, so a visit is counted once. aggregateViews returns `traffic.social` [{channel, visits, tagged}] for every
  channel (zeros too): visits = refs-derived + link, so old days count from their refs. `api/server.js`: comment only.
- `src/hooks/useHitCounter.js`: the first page of a tab also sends `src` = the address's utm_source (40 chars max).
- `src/components/admin/StatsTab.jsx`: "From social platforms: N visits, M by our tagged links", one bar per channel.
- After the deploy (owner's go, outward): put tagged links on the profiles and in new posts, e.g.
  https://subverselab.com/?utm_source=instagram (Instagram bio), ?utm_source=tiktok (TikTok bio), ?utm_source=bluesky,
  ?utm_source=soundcloud (profile + track Buy links), ?utm_source=youtube (video descriptions), ?utm_source=kofi. Leave the Mastodon
  Website field as it is (rel="me" verification); mastodon.social sends its referrer anyway. youtube.com/t.co referrers also come from
  other people's videos and posts; only "tagged" means our own link.
- Gate 6 Nov: eslint 0 errors (2 old warnings); build exit 0 (86 routes + homepage); 17 of 18 test files pass (test-stats.js 26 cases,
  3 new); test-sample-packs.js fails the same 2 licence-draft cases as before. Dev server: /help?utm_source=instagram and an in-app
  landing on /plugins?utm_source=tiktok send {"landing":true,"src":"tiktok"}, the next page sends no src; /admin?devpreview=1 → Stats
  shows the new list (devdata snapshot of 28 Oct: YouTube 320, X 23, Facebook 10, the rest 0; the added field was removed after).

## WITHDRAWN 6 Nov 2026 (never deployed) — Rekkerd.org in the footer's store marks
- Owner 6 Nov later: "rekkerd kendisi bir mağaza olmadığı için alt footerdan logosunu çıkaralım". Entry removed from `STORES` in
  FooterStrips.jsx; the mark moved to `_legacy/rekkerd.png`. Footer back to MuseHub, KVR Audio, Gumroad, itch.io (= launch_desk/STORES.md FOOTER: yes). History below.
- Owner 6 Nov: "mağazalar fligranına rekkerd.org logosunu ekleyelim". `src/components/FooterStrips.jsx` STORES += Rekkerd.org
  (`public/partners/stores/rekkerd.png`: rekkerd.org's own header wordmark, rekkerd-logo-dark@2x, served as WebP, saved as PNG and
  cropped to 296×51; drawn 122×21 as a one-colour mask like the others). Not a link, like the others.
- Gate 6 Nov: eslint 0 errors (2 old warnings), build exit 0 (dist/partners/stores/rekkerd.png present), every test file passes except
  `test-sample-packs.js` (the same 2 licence-draft cases). Dev server 1280 px: the mark takes its turn after itch.io, reads REKKERD.ORG.

## NEXT DEPLOY (prepared 6 Nov 2026) — one search for the whole site (local, DEPLOYED 6 Nov in 00245-heb, NOT committed; site only)
- Owner 6 Nov: "arama alanını genel arama alanı yapalım ... lisans anahtarı, herhangi bir plugin ismi yazabilir hatta direkt soru sorabilir".
- `src/search/siteSearch.js` (plain JS): plug-ins, sample packs, preset packs (the live catalogue's too), browser tools and the Help
  answers in one index; names match however typed (YANKI/yankı, RU-8/ru8, JING FANG/jingfang); questions are scored by word with
  rare words weighted up, plus a small synonym table (licence/key/activation, refund/money back, install/download, DAW, Turkish
  lisans/iade/indir). Answers are the site's own sentences (Help, plugins.js ACTIVATION_SHORT / TRUST_LINE, the Account help texts).
- A licence key (8-4-4-4-12 or any long dashed code) or an order number gets one answer card (Account → Licence keys / the claim
  form). A key or an e-mail address never goes into a URL or the page title (so never into analytics page views).
- Navbar box → `src/components/SiteSearch.jsx` (results panel under the box, arrow keys + Enter, Esc); typing no longer jumps to /tools.
  New `/search?q=` page (`SearchPage.jsx`); `server.js`: /search is a client route (200) with `X-Robots-Tag: noindex`.
  Help answers get ids `#faq-<n>` and open on arrival; Account folds and preset pack headings scroll into view from a hash.
- Gate 6 Nov: eslint 0 errors (2 old warnings), build exit 0, 17 of 18 test files pass (new `test-search.js`: 30 checks);
  `test-sample-packs.js` fails the same 2 licence-draft cases as before. Dev server 1280 px and 375 px: panel opens, key → /account#keys
  (no key in the URL), "drum" + Enter → /search?q=drum, refund answer → /help#faq-2 opened; no console errors, no sideways scroll.

## NEXT DEPLOY (prepared 6 Nov 2026) — Bluesky and Ko-fi in the footer (local, DEPLOYED 6 Nov in 00245-heb, NOT committed; site only)
- Owner 6 Nov: "bluesky threads ve ko-fi ... subverselabin sosyal hesaplarını oluşturalım". Profiles filled in Chrome (live now, no deploy):
  Bluesky @subverselab.bsky.social and Ko-fi ko-fi.com/subverselab (renamed from ko-fi.com/senolsahan): name SubverseLab, avatar
  `Assets/Brand/social/soundcloud/soundcloud-avatar-1000.png`, cover `mastodon-header-1500x500.jpg`, bio "Audio plugins, sample packs and
  preset packs for music producers.", link subverselab.com. Ko-fi payout (PayPal/Stripe) not connected: owner's step.
- `src/components/Footer.jsx` SOCIAL += Bluesky, Ko-fi; `scripts/prerender.js` Organization sameAs += both; icons `public/social/bluesky.svg`,
  `kofi.svg` (Simple Icons 13.21.0, CC0). `threads.svg` is in place but unused: Chrome's Threads session is @babasultan.art.manager, the
  SubverseLab Threads profile (Instagram @subverse_lab) does not exist yet.
- Gate 6 Nov: eslint 0 errors (2 old warnings), build exit 0, 16 of 17 test files pass; `test-sample-packs.js` fails the same 2
  licence-draft cases as the 4 Nov entry (not this change). Built dist/index.html carries both links.

## NEXT DEPLOY (prepared 5 Nov 2026, afternoon/evening) — SoundCloud + products from the panel without a deploy (local, DEPLOYED 6 Nov in 00245-heb, NOT committed; SITE AND API)
- Owner 5 Nov: "üretim sırasına göre paket snippetlarını ve coverlarını yükle website içerisine çalma listelerini göm ... alt footerdaki
  sosyal hesapları bölümüne soundcloud iconunu ekle", then "deploysuz paket yükleme tarafını ve buna bağlı diğer açıkları kapatmamız
  gerekecek" → "evet devam" to: SoundCloud link per pack in the panel, the site builds the playlist; server-side head and sitemap for
  panel products; the panel deletes replaced uploads; the panel as the one source for the picture a link shows.
- SoundCloud (live now, no deploy): soundcloud.com/subverselab (the old BBSLTN account renamed; free plan, 22 of 180 upload minutes).
  19 demos uploaded oldest first, each with its live panel cover, genre, description with the pack page, Buy link = pack page, downloads
  off. Set "SubverseLab Sample Packs" (id 2324925216) in store order, now only a side copy on SoundCloud.
- Panel: sample packs get *SoundCloud track* (`api/catalogSchema.js`, https://soundcloud.com/<account>/<track> only; the url type now
  honours `pattern`). `src/catalog/shapes.js` carries it to known and catalogue-only packs.
- /sample-packs: `src/components/packs/SoundCloudPlaylist.jsx` under the grid: one SoundCloud widget + a list of every pack that has a
  link, in the page's own order (newest first); a row loads its track; FINISH plays the next (Widget API api.js, loaded on this page
  only). A pack added from the panel joins in its place, nothing to reorder on SoundCloud. Pack page: "Also on SoundCloud" under Listen.
- Site server (`server.js`): reads GET /api/catalog (a minute cache) and (1) gives a catalogue-only /sample-packs/<slug> or
  /plugins/<slug> its own title, description, canonical, og/twitter tags and a Product JSON-LD (it was the homepage's head);
  (2) puts the panel's picture in og:image / twitter:image / JSON-LD image of a prerendered pack or plug-in page; (3) /sitemap.xml
  lists catalogue-only products after the built ones (live sitemap had none of Woodpanel, Grindstone, Slagworks 2, 8-Bit Orchestral).
  CSP: frame-src += https://w.soundcloud.com, script-src += https://w.soundcloud.com.
- API (`api/catalog.js`): saving an item with a new upload, or deleting an item, deletes the catalog/… object it no longer uses from the
  media bucket, unless any item (any kind, hidden too) still points at it; the check reads Firestore afresh and deletes nothing when
  that read fails; the save answers `removedFiles`. Existing orphans (5 Nov, read only): slagworks2 first cover (mw1ftmpp), woodpanel
  first preview + peaks (mw0r5cax, mw0r5dcv), zz-test-pack peaks: not deleted, owner's go.
- Footer SOCIAL += SoundCloud, TikTok and Mastodon (@SubverseLab@mastodon.social, link rel="me" for Mastodon's verified link)
  (`public/social/soundcloud.svg`, `tiktok.svg`, `mastodon.svg`, Simple Icons 13.21.0, CC0); prerender Organization
  sameAs += both. TikTok = the owner's old personal account renamed 5 Nov to @subverselab (name SubverseLab, logo, bio);
  privacy page names SoundCloud. `public/sample-packs/<slug>/cover.*` for the 15 importer packs = covers/v2 (sha1 = the panel's);
  old files in ~/.Trash/old_pack_covers_2026-11-05/.
- Docs: `docs/CATALOG.md` (SoundCloud field, upload cleanup, head/sitemap without a deploy), `docs/PACK_DELIVERY.md` §3 step 4 (SoundCloud).
- Tests: new `scripts/test-catalog-pages.js` (5: catalogue-only pack and plug-in heads, panel picture on a prerendered page, unknown slug
  404, sitemap); `test-catalog.js` +3 (SoundCloud field accepts/refuses, merge carries it, replaced/removed uploads leave the bucket,
  a shared one stays).
- Checked 5 Nov on the dev server with a local catalogue copy carrying the 19 links (removed after): 19 rows in store order
  (8-Bit Orchestral … Palmglow); a real click on Ironmere played it, seek to the end → FINISH → Palmglow played by itself (Chrome);
  /sample-packs/grindstone "Also on SoundCloud" → svl-grindstone-demo; all 19 card previews play (earlier check, durations = SoundCloud).
- Gate 5 Nov evening: eslint 0 errors (2 old warnings); build exit 0 (86 routes + homepage); 16/17 test files pass; test-sample-packs.js
  fails the same 2 licence-draft cases as below (not this change).
- AFTER THE DEPLOY (API first, then site): write the 19 links (all answer 200), e.g.
  `SVL_AGENT_KEY=… node scripts/catalog-cli.js set samplePacks mirage soundcloud=https://soundcloud.com/subverselab/svl-mirage-demo`
  for: 8bitorchestral=svl-8-bit-orchestral-demo brickyard=svl-brickyard-demo grindstone=svl-grindstone-demo ironmere=svl-ironmere-demo
  kerbstone=svl-kerbstone-demo kotoflux=svl-kotoflux-demo lampglass=svl-lampglass-demo lowlight=svl-lowlight-demo mirage=svl-mirage-demo
  nightgrid=svl-nightgrid-demo palmglow=svl-palmglow-demo saffron=svl-saffron-demo slagworks=svl-slagworks-demo
  slagworks2=svl-slagworks-2-demo solstice=svl-solstice-demo squall=svl-squall-demo stepwell=svl-stepwell-demo
  velvetroom=svl-velvetroom-demo woodpanel=svl-woodpanel-demo. Until then the playlist section stays hidden (no links, no section).
  Then check live: /sample-packs playlist, view-source of /sample-packs/woodpanel (own title, og:image), /sitemap.xml has woodpanel.
- Still open (not in this entry): llms.txt product list is built from the code only (panel products missing until a build).

## NEXT DEPLOY (prepared 5 Nov 2026) — TUTKAL how-to v3 replaces the old one in the room (local, DEPLOYED 6 Nov in 00245-heb, NOT committed; site only)
- Owner 5 Nov: "adaptör üzerinden youtube a yükle panelden subverselab video olarak ekleyebiliyorsak ekle".
- YouTube: UxIeWqMjRXM uploaded with Scripts/yt_subverselab_upload.py (channel UCVet5uzZrX2MCFBMsr_e8rA checked), public, processed,
  embeddable, 2:47. The 21 Oct AuAGjv7M2NA is untouched on YouTube (owner decides whether it goes private).
- Panel (live now, no deploy): Catalogue → Plug-ins → New plug-in, slug tutkal, Edits = Yes, one Videos row, Released/Updated EMPTIED
  (the form pre-fills today; a date would move TUTKAL to the top of the store). /api/catalog: price/dates/musehub empty, published.
  Live /plugins/tutkal after the save: AuAGjv7M2NA (code, first), UxIeWqMjRXM (panel, second), XWjTrKvPzzo.
- Code: `src/data/howToVideos.js` tutkal -> UxIeWqMjRXM, so after the deploy the new video is the only how-to and comes first.
- Gate 5 Nov: eslint 0 errors (2 old warnings); build exit 0 (86 routes + homepage); 15/16 test files pass. test-sample-packs.js
  FAILS 2 cases (parseLicence DRAFT flag; prerender "Licence summary (draft)") + STALE zip-size warnings on 15 packs: from the
  pack/licence work in the tree (entry below), not from this one-line change. Must be green before the deploy.

## NEXT DEPLOY (prepared 4 Nov 2026 night) — no "draft" licence wording on the sample pack pages (local, DEPLOYED 6 Nov in 00245-heb, NOT committed; site only)
- Owner 4 Nov: "draft kısmını sil diğer paketlerde de böyle bir ibare varsa olmamalı ... son kullanıcıya gitmemesi gereken bir bilgi".
  Live today: 15 importer pack pages show "Licence summary (draft)" + "Draft wording, under review before release ...".
- `src/components/SamplePackPage.jsx`: the draft label and note removed (never shown, whatever the data says).
- `scripts/import-sample-packs.js`: a licence title loses a trailing "(draft)"; `scripts/test-sample-packs.js`: asserts no page
  shows "Licence summary (draft)" / "Draft wording".
- `src/data/samplePacks.js` regenerated from the fixed zips (01_AI_Tools/subverselab-packs/tools/licence_fix_zips.py: LICENCE.txt
  without the DRAFT line, README "See LICENCE.txt", SHA256SUMS updated; audio entries byte-identical, CRCs checked): per pack only
  docs LICENCE_DRAFT.txt -> LICENCE.txt, licence.draft false, title "SVL X - Licence", zipBytes / unzippedBytes (-87..-120 B),
  source.zipSha256. Gate 4 Nov: eslint 0 errors (2 old warnings), build exit 0 (86 routes + homepage), 16 test files all pass.
- NOT done, owner's go each: re-upload the 16 fixed zips (out/SVL_*.zip; Woodpanel is a panel item, the other 15 importer packs) with
  publish_download.sh so buyers download the clean text; until then the live downloads still hold LICENCE_DRAFT.txt.
  Originals: ~/.Trash/licence_fix_originals_2026-11-04/.

## DEPLOYED 4 Nov 2026 (second, owner "siteyi tekrar deploy et") — family upgrade key, site only: `subverselab-site-00239-noc` (tag nov04b), 100 % traffic; tag smoke 5 routes + headless /plugins (signed-out key "Get the family — $39.99", no page errors); tag nov04 removed. Rollback: 00236-yaz. NOT committed
- Owner 4 Nov: "mail gitmiyecek, onlar satın al yerine upgrade butonu görmeliydi". No e-mails. plugins.js FAMILY_UPGRADES + familyUpgrade():
  a signed-in account with a PAID order of a family product dated before 2026-11-04 (from /api/purchases/status `purchased`) and no
  family sees "You bought KORO before the family came back … $24.99 for you" and the key "Upgrade to the family — $24.99"; the
  checkout gets checkout[discount_code] (FAMKORO15 / FAMYANKI9; credit capped at price − $19.99; largest credit wins). Everyone
  else: "Get the family — $39.99". usePurchaseStatus keeps `purchased`; BuyButton takes `discount`. API unchanged.
- Checked: familyUpgrade 7 cases (KORO 22 Oct -> 24.99, YANKI 3 Nov -> 30.99, both -> KORO, KORO 5 Nov -> none, KUBBE -> none,
  owns family -> none, nothing -> none); localhost devpreview with a temporary KORO-owner fixture (restored): band line, key label,
  href with FAMKORO15; Lemon Squeezy checkout with ?checkout[discount_code]=FAMKORO15 shows $39.99, FAMKORO15 −$15.00, total $24.99.
- Gate: eslint 0 errors (2 old warnings); build exit 0; 16/16 scripts/test-*.js pass.

## DEPLOYED 4 Nov 2026 — site AND API (owner: "tarayıcıya yazabilirsin bu işlere devam et")
- Lemon Squeezy first: family 1414121 at $39.99 with the new description (lead), Published (owner), product image replaced by the
  v6 stack (Assets/LemonSqueezy/family_stack_ls_1500x1200_v6.jpg; old ls_family_4x3.jpg kept there); discounts FAMKORO15 / FAMYANKI9.
- API `subverselab-api-00015-cem` (tag nov04): tag smoke manifest 200, catalog 200, catalog/schema 200 with technical / folders /
  licence, purchases/status 401, no ERROR logs; then 100 % traffic. Env unchanged.
- Site `subverselab-site-00236-yaz` (tag nov04): tag smoke 10 routes (/, /plugins, /plugins/torna, /sample-packs, woodpanel,
  apple-touch-icon-precomposed 200, family_stack_hero.webp 200, manifest, catalog; unknown route 404); headless /plugins: band title,
  picture 1400 px, key "Get the family — $39.99" -> checkout 7eb4adc0…, no page errors; then 100 % traffic. Live: apex 200, www 301.
- Shipped: everything under "FOR THE 1 DEC DEPLOY" marked DONE LOCALLY (catalogue videos/edits, Members downloads + uid join, pack
  folds from the panel, the family back + stage light + v6 picture, /plugins gap, phone cookie banner, precomposed icon).
- After traffic, panel (no deploy): Woodpanel Technical details (9 rows) + Inside the folder (15 rows) saved; live page shows them.
- Old tags `nov01` removed on both services; only `nov04` remains. Rollback: site 00233-yik + api 00012-ziv.
- Not done / open: TORNA how-to video via the panel (Edits = Yes); Firestore rules release; panel zip-upload IAM; the two upgrade
  e-mails (owner's go); a real family purchase end to end through the webhook (not verified).

## DEPLOY CHECKLIST for the next deploy (written 3 Nov night; every step on the owner's go, in this order)
Gate on 3 Nov night (whole tree): eslint 0 errors (2 old warnings); build exit 0 (86 routes + homepage, media same origin);
all 16 scripts/test-*.js exit 0.
1. Lemon Squeezy, before anything else: family product 1414121 at $39.99, new description, Published; checkout 7eb4adc0… opens
   at $39.99. Then the two upgrade discounts (see "The family back" below). Not done: the session's browser write was blocked.
2. API first (`subverselab-api`, new tag): catalogue fields technical / folders / licence, Members downloads + uid join.
   Env unchanged. Smoke: /api/download/manifest 200, /api/catalog 200, /api/purchases/status 401, no ERROR logs.
3. Site (`subverselab-site`, new tag): family band + news, catalogue videos / edits, pack folds, the three 1 Dec fixes.
   Smoke on the tag: /plugins (band, picture, "Get the family — $39.99" -> 7eb4adc0…), the home news item, /plugins/torna,
   /sample-packs on 375 px, /apple-touch-icon-precomposed.png 200. Then traffic; drop the previous `--tag`.
4. After traffic, in the panel (no deploy): Woodpanel Technical details / Inside the folder (status/woodpanel_panel_details.md);
   TORNA how-to video (Edits = Yes). Woodpanel's long preview only after the owner has listened (v7, or v8 when it is done).
5. Separate decisions, not part of the deploy: Firestore rules release (catalog_publishers, catalog_agents); write access for
   `90909956035-compute` on gs://subverselab-downloads (panel zip uploads); the upgrade e-mails.
Not in this deploy: USLUP / Grindstone (round 7 mix running, owner's ear first), Woodpanel snippet v8 (running).
Rollback: traffic to `subverselab-site-00233-yik` + `subverselab-api-00012-ziv`.

## FOR THE 1 DEC DEPLOY (owner 1 Nov: "düzeltmek yerine 1 aralık deploy adımlarına ekle") — not done yet, do them before that deploy
- /plugins: at 1440 px a tall empty band sits between the filter chips and the first row of boxes (the rise room each box carries
  as `padding-top`), so the first product starts late in the first screen. Keep the rise room but stop it showing as a gap above row 1.
  DONE LOCALLY 3 Nov night: `.box-grid` is pulled up by row 1's rise room less 32 px (per column count), `.plugin-filter` sits
  above it (z-index 3) so the chips stay clickable. 1440x900: chips bottom 742, first box top 794 (52 px).
- /sample-packs on a phone (375 px): the cookie banner covers the first record card's name and price until it is closed.
  DONE LOCALLY 3 Nov night: banner 127 -> 111 px tall at 375x812 (smaller text and keys) and the body gets 120 px at the foot while
  it is open, so the last lines scroll above it. The Woodpanel name (y 791) is still under the banner in the first screen.
- /apple-touch-icon-precomposed.png answers 404 (3 requests since the 1 Nov deploy); serve the same file as apple-touch-icon.png.
  DONE LOCALLY 3 Nov night: public/apple-touch-icon-precomposed.png (copy of apple-touch-icon.png).
- Admin panel (owner 2 Nov: "bunlar da panelden eklenebilir olmalı"): videos and room edits without a deploy.
  (a) A demo-video field in the Catalogue (YouTube id + caption + vertical flag, like `demos` in plugins.js) for plug-ins,
  sample packs and preset packs. (b) Products that live in src/data/plugins.js (TORNA, KUBBE …) must be editable from the panel
  too: today `catalogPlugins()` skips known slugs ("a known slug is edited through the data objects only"); lay a catalogue doc
  with the same slug over the code object, field by field, like news frames and sample packs already do.
  First use: TORNA's how-to https://youtu.be/aUPclGBDIKg in the TORNA room.
  DONE LOCALLY 2 Nov (owner "evet şimdi yerelde kur ve test et"), NOT deployed, NOT committed:
  - api/catalogSchema.js: field type `videos` ([YouTube link, caption] rows; watch / youtu.be / shorts / embed links and bare ids
    parse, other hosts are refused; a /shorts/ link plays upright), `youtubeId()`, `videosToDemos()`; plug-ins get `videos` and
    `edits` ("Edits a product already on the site": only the slug is required then).
  - src/catalog/shapes.js `overlayPlugin()`, merge.js `livePlugin()`, CatalogPluginRoom.jsx `LivePluginRoom` (App.jsx routes every
    code room through it): filled-in fields replace the room's own, empty fields and the free/noKey flags keep the code's,
    panel videos come first under "Hear it" (an id in both shown once); catalogue-only plug-ins carry their videos too;
    an edit does not enter CATALOG_PLUGIN_INDEX. Admin editor: "Videos" rows ("Add a video").
  - Not done: videos for sample/preset packs (their pages draw no video yet); the form still marks Name/Kind/Tagline with *
    when "Edits" is Yes (the check itself skips them); the prerendered HTML keeps the code room (the live overlay comes
    with the page script, as for every catalogue item). Firestore rules unchanged (catalog_plugins already server-only).
  - Checked on localhost (dev preview, catalogue answer from a .devdata fixture, nothing written to Firestore): /plugins/torna
    shows "Hear it" with https://youtu.be/aUPclGBDIKg, the rest of the room unchanged; /admin → Catalogue → New plug-in shows both
    new fields. After the deploy: Catalogue → Plug-ins → New: slug torna, Edits = Yes, Videos = the link + caption, Save.
  - Gate: eslint 0 errors (2 old warnings); build exit 0 (67 sitemap URLs, 86 routes + homepage); every scripts/test-*.js passes
    (test-catalog 23/23 with 5 new cases). test-download and test-sample-packs fixed: their sweep orders are dated 17 Oct, so
    the six packs listed on 1 Nov are rightly not in them (the old note "passes from 1 Nov" was wrong; the code was right, the
    expectation was stale); both now also check that a sweep bought after 1 Nov opens every pack (101/101, 16/16).
- Admin → Members, orders and downloads (owner 3 Nov: a Slagworks buyer showed the product but no download; earlier, accounts
  showed downloads but no product). DONE LOCALLY 3 Nov, NOT deployed, NOT committed; API only (`api/server.js`, `api/stats.js`):
  - The Downloads column summed only `PLUGIN_SLUGS` × mac/win, so pack zips (sold and member racks) never counted. Now
    `countDownloads()` sums every product and platform in `downloads/{uid}`. Live data, read-only: 3,475 → 3,501 (26 zip
    downloads on 7 accounts); the 1 Nov Slagworks buyer (order 17:50:21 UTC, $5.95; 105,907,903 B served 17:50:45, the whole
    105,907,454 B zip) now shows 3.
  - `joinMembers()` joined orders by the checkout e-mail only; an order whose `uid` is the account that clicked Buy now joins
    that account even when the e-mail differs (9 of 1,250 orders; they were listed as separate account-less rows). Orders with
    no uid, or a uid that is no account, keep the e-mail join.
  - The remaining 858 accounts with downloads and no order are explained: 854 downloaded only KUBBE/KASET (the free 1,000, which
    has no order) and 4 those plus the free rack packs.
  - Gate: eslint 0 errors (2 old warnings); build exit 0; every scripts/test-*.js passes (test-stats 23/23 with 2 new cases).

- The family back + pack details from the panel (owner 3 Nov: "herşeyi tek bir deployda halledebiliriz ama sonradan ekleyeceğimiz
  işler için inside kısmı panelden çözülebilir olmalı"). DONE LOCALLY 3 Nov, NOT deployed, NOT committed; site AND API.
  - Sample packs from /admin get the folded sections the importer packs have: `technical` (Technical details rows),
    `folders` (Inside the folder rows), `licence` (standard SVL clauses | not shown, default standard) in api/catalogSchema.js;
    shapes.js carries them; packFacts.js `detailRows()` / `packLicence()`; SamplePackPage.jsx draws the three folds for
    catalogue packs too (before: none). Pairs editor takes per-field placeholders. API must be deployed for the panel to save them.
  - Woodpanel's rows are ready to type in after the deploy: 01_AI_Tools/subverselab-packs/status/woodpanel_panel_details.md
    (9 technical rows, 15 folder rows, from its measurements.csv and zip). Checked on localhost with a temporary .devdata
    catalogue fixture (removed): all three folds render, values as in the file.
  - The family is back on /plugins (#family): FamilyBand.jsx above the filter chips: the 3D box stack
    (public/plugins/family_stack_hero.webp, 1400x788, render v6: the store-angle stack on a seamless cove, owner 4 Nov "evet v6 koy"; v5 and v11 stay in box_renders), the names in store order linking to each room, $39.99,
    "Bought one by one: $115", one-checkout line + UPDATES_LINE, the Buy key (slug family, place offer). plugins.js:
    PRICES.family 19.99 -> 39.99 (the MuseHub price; $19.99 stays the floor), FAMILY_BUNDLE_ON, FAMILY_STACK_IMG/CARD.
    FAMILY_RETIRED stays true (it only drives the old launch-offer machinery: HomeIntro opening, /launch2, struck price).
  - Stage light on the family picture (owner 4 Nov: "görsel üzerinde gezerken sahne ışığı gibi aydınlatsa"; "yeni çıktıyı böyle
    yapalım"): FamilyBand.jsx `.family-band-stage` + index.css tokens --stage-spot / --stage-shade: a warm spot follows the pointer,
    the rest dims; off on touch screens and under reduced motion. Checked headless (Chrome, 1440x900): spot on KUBBE / TUTKAL,
    edges dimmed. The picture is the store-angle stack v6 (in place 4 Nov).
  - news.js: the 28 Oct "family-thanks" frame (its line said every plugin is sold on its own from now on) is replaced by
    `family`: "Our plugin family, together again for $39.99." -> /plugins#family, picture = the 3D stack.
  - Copy and upgrade (owner 3 Nov: "yoğun istek üzerine yeniden paketlendiğini vurgulayalım, haber satış pazarlama kokmalı";
    "daha önceden aile paketlerinden bir tanesini satın aldıysa ... 39,99 ile upgrade edebilecek"): band kicker "Back by popular
    demand"; news "You asked for it: the SubverseLab plugin family is back." (cta "Get the family"). A signed-in account that
    owns one or more family products but not the family sees "You already have <names>. Upgrade to the whole family for $39.99"
    and the key reads "Upgrade to the family — $39.99" (same checkout, same price; others see "Already own one of them? …").
    Checked on localhost with a temporary purchases fixture (KUBBE + KORO owned, standing none; restored afterwards).
  - Before the deploy (owner's go): the Lemon Squeezy family product 1414121 (checkout 7eb4adc0…) is DRAFT since 1 Nov
    (checkout 404) at $19.99, and its description still says "$19.99 until 1 November 2026" and counts the products. Set the
    price to $39.99, replace the description (no count, no date), publish, and open the checkout once. The webhook maps it to
    'family' whatever the date (live API: LS_FAMILY_PRODUCT_ID=1414121, LAUNCH2_CAP unset = no cap; read 3 Nov).
  - Upgrades (owner 3 Nov: only the one or two who bought a family product on its own; not on the page, not in the news):
    read-only from plugin_licenses on 3 Nov, paid single family orders without the family: luismau666.lmfg@gmail.com KORO $15
    (22 Oct, during the old family offer) and 29down@freenet.de YANKI $9 (3 Nov). Each gets a one-use Lemon Squeezy discount on
    product 1414121 only, for what they paid: $15 -> pays $24.99, $9 -> pays $30.99 (both above the $19.99 floor). The mail to
    them goes out only on the owner's go. Free KUBBE/KASET owners (the free 1,000) get nothing.
    DONE 4 Nov (owner "indirim kodlarını aç"): Lemon Squeezy discounts FAMKORO15 ($15) and FAMYANKI9 ($9), Active, product
    "SubverseLab Plugin Family" only, 1 redemption each. Same day: family price 39.99 and the new description saved (owner
    "tarayıcıya yazabilirsin"); the product is still DRAFT: publishing was refused by the session's permission check, the owner
    clicks Draft -> Published -> Save changes.
  - Checked on localhost (dev preview as the owner, headless Chrome 1920x1080, light and dark): the band, price, names and key
    ("You own this" for the owner's account). Not checked: a signed-out visitor's key, a phone width, the prerendered /plugins
    HTML (it does not include the band; the page script adds it).
  - Gate: eslint 0 errors (2 old warnings); build exit 0 (86 routes + homepage); every scripts/test-*.js passes
    (test-catalog 24/24 with 1 new case, test-listen 69/69 with the family test rewritten for 3 Nov).

## DEPLOYED 1 Nov 2026 (~00:55 TR) — everything listed under NEXT DEPLOY below (26–31 Oct), site AND API
- Owner 1 Nov: "subverselabin son kontrollerini yapıp deploy edelim". API first (`subverselab-api-00012-ziv`, tag `nov01`), smoke
  test, traffic; then the site (`subverselab-site-00233-yik`, tag `nov01`), smoke test, traffic. Both services:
  `LS_PRODUCT_SLUGS` += `1480722:mirage,1481075:kotoflux,1481389:saffron,1481392:solstice,1481394:velvetroom,1481396:nightgrid,1481039:torna`
  (33 pairs now). Other env unchanged. Firestore rules NOT released (the `catalog_*` collections have no client rule, so they
  are closed by default; release `firestore.rules` separately on the owner's go).
- Found and fixed in the final check: the pages import `api/catalogSchema.js`, but `api` was excluded from `.gcloudignore` and
  `.dockerignore`, so the Cloud Build site build would have failed (`Could not resolve '../../api/catalogSchema.js'`, reproduced
  from the exact `gcloud meta list-files-for-upload` set). Both files now ignore `api/*` except `!api/catalogSchema.js` (build
  stage only; the runtime image still copies only server.js + dist); `test-split.js` asserts exactly that exception.
- Gate (1 Nov ~00:30 TR = 31 Oct 21:30 UTC): eslint 0 errors (2 old warnings); build exit 0 (sitemap 67 URLs, 86 routes +
  homepage); check:responsive 8 routes clean at 320–1366 px; 17 test files: all pass except the two date-bound sweep cases
  (test-download 100/101, test-sample-packs 15/16), which flip at 1 Nov 00:00 UTC (03:00 TR) when the six packs are listed.
  Local tour of 14 routes: root mounted, 0 broken images, 0 horizontal overflow, no hyphenated name, "coming soon" only on ADALET.
- API tag smoke: manifest 200 (torna 1.0.0 + the six packs listed), `/api/catalog` 200 (empty), `/api/purchases/status` 401,
  no ERROR logs. Site tag: 21 routes 200 (home, /plugins, TORNA room + manual, JING FANG, all six pack pages, /preset-packs,
  /tools, /account, /launch2, /help), unknown route 404, sitemap 67 URLs; TORNA Buy -> checkout 68739459-…; the seven Lemon
  Squeezy checkouts open SVL Mirage/Kotoflux/Saffron/Solstice/Velvetroom/Nightgrid and TORNA. Live after traffic: apex 200,
  www 301 -> apex, homepage mounted with 0 broken images, 0 failed requests, no console errors.
- NOT verified: a TORNA download end to end through the site (needs a signed-in account; owner); a real purchase through the
  webhook for the new ids; the admin Catalogue uploads live — the API's service account
  (`90909956035-compute`) has only `roles/storage.objectViewer` on `gs://subverselab-downloads` (and project-wide), so the
  Files panel and media uploads will be refused until it is given write access (owner's decision, IAM change); light/dark
  check on the live pages by eye.
- Old revision tags removed on the owner's go (1 Nov ~01:10 TR): site `free1025`; API `credits1018`, `jf1019`, `man1020`,
  `inbox1022`, `free1025`. Only `nov01` (on the serving revisions) remains; site and manifest 200 afterwards.
- Family product retired outside the site (owner 1 Nov, "lemonsqueezy ve kvr de aile ürününü kaldır"): Lemon Squeezy
  "SubverseLab Plugin Family" (1414121) set to Draft, its checkout `7eb4adc0-…` now 404 (23 sales, $499.58 kept; buyers' orders,
  keys and downloads are untouched: `LS_PRODUCT_SLUGS` keeps `1414121:family` for them). KVR: the price line
  "(or in the $19.99 family of 7)" and the family paragraph removed from KUBBE, KASET, KORO, YANKI, HAVA, TUTKAL, MIHENK
  (now "<NAME> is $<price>, with 2 years of updates included: subverselab.com/plugins."); public pages re-read: 7/7 clean.
  KVR deal 68920 ended 31 Oct 13:59 PT by its own end date (left as is; KVR's news/deal area forbids agents).

## NEXT DEPLOY (prepared 31 Oct, JING FANG manual) — the owner's manual PDF with the camera section (local, NOT deployed, NOT committed; site only)
- `public/plugins/jingfang/JingFang_Manual.pdf` regenerated from `01_AI_Tools/subverselab-studio/docs/manual/JingFang_Manual.html`
  (tools/make_manual.sh): 15 pages, 3,960,741 B; new on page 4: the CAMERA row of the top bar and "The camera" (figure + paragraph).
  The camera itself is in the plug-in's next build (not released; subverselab-studio/STATUS.md 31 Oct): publish the PDF with that
  release, or with the 1 Nov deploy if the owner wants the text first. If `VITE_MEDIA_BASE` is in use, upload the PDF to the media bucket too.

## NEXT DEPLOY (prepared 31 Oct, tools strip) — the "Browser tools for producers" strip removed from /plugins, the rooms and the Download Room (local, NOT deployed, NOT committed; site only)
- Owner 31 Oct: "plugins sayfasının altındaki browser tools'u kaldıralım, yukarıda link var, her yerde karşımıza çıkmasına gerek
  yok". `ToolsStrip` no longer rendered by PluginsPage, PluginRoom or LaunchPage (the component and `src/data/tools.js` stay for
  /tools); `scripts/prerender.js` no longer appends the strip's HTML to the plugins and launch routes. /tools itself unchanged.
- Gate for the footer + strip work: lint 0 errors; `npm run build` exit 0 (86 routes + homepage); test-order 8/8, test-pages
  11/11 (after making the site server's 404 path synchronous again: only `/plugins/<slug>` and `/sample-packs/<slug>` ask the
  API, and without an API origin they 404), test-split 21/21 (the footer's social icons now go through `media()`),
  test-presets 7/7, test-toolnames 8/8.

## NEXT DEPLOY (prepared 31 Oct, footer band) — the logo strips run full width under the footer columns (local, NOT deployed, NOT committed; site only)
- Owner 31 Oct ("şuradaki dengesizliği düzeltelim", screenshot at 1888 px): the two strips sat between the brand column and the
  links, in a ~300 px window showing two logos, with a hole under the links. `Footer.jsx`: the strips moved out of the two-column
  row into their own full-width row under it. Second word ("yap bakalım"): ONE slow, faint line instead of two: the seven
  hosts, a 5 px dot, the four stores (`FooterStrips.jsx`), 90 s per loop, opacity 0.32, 64 px apart, no rule above (56 px gap),
  the whole line repeated once so no mark shows twice in a window. Checked at 1888 px: run 2,259 px > window 1,520 px, no seam.
- Third word (owner's screenshot: "derin boşluk" under the links): the right side was one line of links over a hole as tall as
  the brand column. `Footer.jsx` `FOOTER_COLUMNS`: three short columns, Store (Plugins, Sample packs, Preset packs, Browser
  tools), Account (Download Room, Your account, Testers, Forum), SubverseLab (Loom, Help, Privacy, Terms, Refunds, Cookie
  settings), `.footer-cols` / `.footer-link` in index.css; /sample-packs, /preset-packs, /tools, /account and /testers join the
  footer (they were not linked from it). Gate: lint 0 errors.

## NEXT DEPLOY (prepared 31 Oct, boxes and records) — /plugins as product boxes, /sample-packs as records in sleeves (local, NOT deployed, NOT committed; site only)
- Owner 31 Oct: "her pluginin kutulu görseli plugins sayfasında transparan bir şekilde arka plana otursun, alt satırları ve diğer
  detayları bu tasarıma göre kurgulayalım, diğer detaylar ürün odasında" and "samples sekmesinde sample'lar bir plak kartonunda,
  mouse ile üzerine geldiğimizde plak içinden yukarı doğru açılıyor, önizlediğimizde plak kutusunun yarım çıkmış şekilde dönerek".
- Boxes: `subverselab-plugin-common/tools/box_renders.py` (new) renders the TORNA news box (mockups.py render_box) on a
  transparent canvas for all 16 products -> `public/plugins/<slug>/box.webp` (1200 px, 38-60 KB each; 2x PNG sources in
  `plugin-common/box_renders_2026-10-31/`). The panel in each window is the site's panel with its footer band cropped (the
  shipped panels still carry the hyphenated lockup there); ALEV uses the corrected cut-out of 30 Oct; the box's own marks say
  SUBVERSELAB. Model lines as in plugins.js (KIYMA "No. 001", RU-8 "Rhythm Unit").
- Owner 31 Oct, second pass ("toplu yapmak yerine plugine uygun", then "kutu büyüklükleri aynı olmalı"): the box follows the
  product, at one size. KIYMA keeps its own grinder carton (oxblood, mustard Shrikhand type, the seal; faces from
  `subverselab-kiyma/tools/box_mockup.py`) redrawn in the family's landscape proportions, grinder left and type right, the side
  now reading "VST3 · AU · macOS · Windows" (`docs/mockups/kendi_kutu/kiyma_box_left_landscape_clear.png`, 1457x871); JING FANG a
  black lacquer box with the dragons' red side and gold type (palette sampled from its panel, `PALETTES` in box_renders.py);
  the green family keeps the cream carton. Tall panels now fill up to 58 % of the front (was 42 %). Every box is 1461x874 or
  within 4 px of it; the page gives each a 1461:874 frame (`.box-link`), so a future odd-shaped box still sits on the same shelf.
- Owner 31 Oct, third pass ("üst ve yan taraftaki yazılar dikey duruyor … panel görünürlüklerine dikkat ederek yeniden üretelim"):
  `box_renders.py` v2 draws the three faces flat (front 1600x960, side 560x960, lid 1600x900) and warps each into the box
  geometry (mockups.warp_into_quad, as KIYMA's carton does), so the lid wordmark and the side model follow the perspective
  instead of standing upright on it; the lid wordmark is pre-stretched 2.4x against the foreshortening; a long side label
  (RHYTHM UNIT) shrinks to fit. The panel window takes the frame's full width and up to 58 % of the face. Lid (owner 31 Oct,
  after a pre-stretched wordmark and a seal both read badly at that angle): the panel itself is printed on the lid, full width,
  nothing to read there; SUBVERSELAB stays on the front. All 15 family boxes re-rendered (1456x870); KIYMA's landscape carton unchanged.
- Owner 31 Oct, fourth pass: ADALET's box now carries its landscape panel (`adalet/lab_dynamic.webp`, footer cropped) instead
  of the square LAB view; ALEV's ring is printed straight on the carton, no dark window (`BARE` in box_renders.py). Hover
  (owner's final word after three bubbles and one round one): a second panel view slides up out of the box like a record out
  of its sleeve, and the box opens (owner: "daha iyi bir kutu açılış hissi"): box_renders.py now writes every box as two
  layers in one frame, `box-body.webp` (front + side) and `box-lid.webp` (the lid), KIYMA's carton included (`kiyma_layers`,
  its faces from subverselab-kiyma/tools/box_mockup.py); the page lays the lid over the body (`BOX_LAYERS` in plugins.js),
  hinges it at the frame's top edge and swings it up and back on hover (rotateX −62° in perspective), the body lifts 4 px,
  and the view rises between them; on touch the lid stands ajar (−22°) with the view peeking; reduced motion opens without
  the swing. The one-image `box.webp` stays for the catalogue fallback. (`.box-pop`: behind the body in z-order, inside the carton's front; a window of fixed size in the frame,
  57 x 40 %, centred on the lid's back edge (owner: "arka çizgiyi ortalayalım"), the panel's top band cropped to it, so every
  product's view comes out the same distance: the top 24 % of the frame above the lid; the foot with its lockup stays inside). The grid's row gap went 44 -> 84 px so the view never covers
  the row above's keys. Checked on RU-8 (tall) and KUBBE (wide) at 1440: same height. It and the box open the room.
  Under the box (owner: "kutunun altından tıklarsa direkt satın almaya"): the price line, then a Buy key (BuyButton, place
  'showcase': owned -> "You own X — Download", free -> "Get X free", ADALET -> no key, the "Coming soon" line only). The
  name still opens the room. Hidden on touch screens, no motion under reduced motion. Checked at 1440: no horizontal scroll.
- 31 Oct 14:30, the two notes done: the view is a device (`.box-pop`: 7 px dark bezel, 14 px bottom edge for the chassis,
  a hairline of light on top, a 1 px dark rim, a 22/34 px shadow, a 7° lean back in perspective as it rises); lid 58°, 0.75 s.
  Then (owner: "tam panel görseli", then "tamamen çıkmasın, bir kısmı içeride kalsın; yanlara boşluk var"): no window, no
  crop: the whole panel at its own proportions, 82 % of the frame wide (the box's opening, centred on the front face), and
  it rises by a `top` move until its top stands 38 % of the frame above the lid, whatever its height: every product rises
  the same distance, the rest of a tall panel stays inside the box behind the body. Row gap 104 px. Touch: 12 % out, static.
  Final pass (owner: "kutunun altında çıkıyor görünümü", "siyah çerçeveyi kaldıralım", "her varyasyonda test et"): the view
  layer is clipped at the box's foot (`clip-path: inset(-120% -20% 0 -20%)` on `.box-pops`), so a tall panel hanging inside
  never shows under the box; no bezel, the panel as it is with a hairline rim and its shadow. Tested with all 16 forced
  open at 1440: every panel's top 85-90 px above its box (the 7° lean makes the spread), none below the frame (ALEV the
  closest, 30 px inside), width 334 px = the opening on a 492 px box. FINAL for this round. Gate after it: lint 0 errors,
  `npm run build` exit 0 (86 routes + homepage), test-order 8/8, test-pages 11/11, test-split 21/21, test-presets 7/7,
  test-toolnames 8/8, test-catalog 15/15 (31 Oct 14:35 TR).
  Pass after it (31 Oct ~14:45 TR, owner: "alt kenarlarda minimum bir açılma var", then "neden böyle görünüyor" on ALEV):
  the panel layer was cut at the frame bottom, but the body foot sits at 99.4 % of the frame and the panel at rest reached
  100 %, so during the fade-in 1-2 px of panel (knob tops) showed under the foot; the panel was also 82 % wide against a
  front face of 82.3 %, edge on edge. A first fix cut the layer to the front face's x range inside the frame, which broke the
  clear ALEV box (a dark gap between glass wall and panel, and a step at the frame top): reverted. Final: the layer is cut
  `0.6 % + 7 px` above the frame bottom (the foot plus the 4 px hover lift plus margin), nothing is cut at the sides or
  above the frame, the panel is 81 % wide (1 px inside the front face on each side). Measured on the 1200x717 renders:
  body foot 99.4 %, front face x 17.4-99.7 %, lid 0.3-16.6 %; final panel bottoms 12.9 % (TORNA) to 86.1 % (ALEV, inside the
  glass by design), so the foot is only reached during the first 0.2 s. The row gap is no longer a fixed 104 px: each
  `.box-item` carries `padding-top: 23 %` of its width (= the 38 % rise) and the grid gap is 28 px, so the panel stays
  29-30 px clear of the buy key above it at 1, 2 and 3 columns (was 39 px over it at one column).
  Pass after it (31 Oct ~15:00 TR, owner: "kutu boyutlarına ve çıkan panelin cihaz hissine bakalım"): the rising panel now
  has a housing (`.box-device` wraps `.box-pop`): an enclosure in the product's own panel-edge colour (`BOX_SHELL` in
  plugins.js, measured as the mean of the outer 1 % of each panel picture and darkened to 78 %; catalogue plug-ins get the
  family green), 1.1 % thick at the sides and top, 1.6 % below, a lit top face (1.4 %, at least 4 px) that shows because
  the device leans back 7°, a 1 px dark seam round the front plate, light from above on the shell. No black frame: the
  shell is the panel's own colour. Sizes: the shelf has at most three boxes in a row (`minmax(max(380px, 30%), 1fr)`):
  499 px boxes on the owner's 1920 screen (was four of 366 px), 407 px at 1440, two columns under ~1230 px, one under ~790.
  Gate after it (31 Oct ~15:05 TR): lint 0 errors, `npm run build` exit 0 (86 routes + homepage), all 16 test files pass except
  the two known sweep cases (test-download 100/101, test-sample-packs 15/16: the six packs listed on 1 Nov, see CLAUDE.md).

### prepared 31 Oct, the panel for people and agents (owner: "haber plugin preset ya da sample pack veya tester ya da yayıncı almak için
deploy gerektirmeyecek paneli yaz, agentlar dahi bu paneli kullanmalı; eklenen paketler mağaza yapısına uygun önizlensin; paket teslim
kuralları kalıcı yazılsın, bayat bilgiler silinsin")
- **Publishers** (`catalog_publishers`, kind `publishers` in `api/catalogSchema.js`): id, name, role, link, picture, about, location,
  private e-mail, status, joined. Plug-ins, sample packs and preset packs got a `publisher` field; the pack card, the pack page and
  the plug-in room print "by <name>" (link when there is one; `.st-by`). `GET /api/catalog` strips the e-mail. `publisherOf()` in
  `src/catalog/catalog.js`.
- **Agent keys** (`api/agents.js`, `catalog_agents/{sha256}`): /admin → Catalogue → Agents makes a key (`svla_…`, shown once) and
  revokes it; every `/api/admin/catalog/*` route and `/api/admin/testers*` accept the key in place of a Google sign-in; making or
  revoking keys is refused to a key (humans only). `GET /api/catalog/schema` (public) lists the kinds and fields.
- **Tester invite**: `POST /api/admin/testers/invite` (same seat cap and agreement record as an approval; writes the application
  with `source: 'invite'`), the "Invite a tester" form on Admin → Testers, and `decideTester()` shared by /decide and /invite.
  Locally the testers admin routes now accept the preview token under `SVL_DEV_ADMIN=1` like the catalogue routes.
- **Store parity for catalogue packs**: sample packs carry `peaks` (waveform JSON) and `scenes` (`seconds name` lines →
  markers); the panel writes `peaks.json` by itself when the preview mp3 is uploaded (Web Audio, 800 points, media kind `json`);
  `scripts/pack-peaks.js` does it from a terminal (ffmpeg). The pack page draws the same `PreviewStrip` as the importer's packs
  when the waveform exists; the card's play label no longer prints "NaN s" for a pack without a known length.
- **CLI for agents**: `scripts/catalog-cli.js` (schema, list/get/save/set/hide/show/delete, media, peaks, file/unfile, manifest,
  testers list/invite/decide) with `SVL_AGENT_KEY` (+ `SVL_API` for the local API). Checked against the local API: schema, a test
  publisher and a test pack saved and read back, `peaks` uploaded a 5 KB JSON to `catalog/samplePacks/<slug>/`.
- **Docs**: `docs/PACK_DELIVERY.md` (the permanent delivery rules: what a pack is, where every piece lives, the catalogue path, the
  importer path, sweeps, publishers, what never happens); `docs/CATALOG.md` extended (publishers, agents, testers, waveform, CLI).
  Stale: `docs/SPLIT_CUTOVER.md` ("written, not executed"; the split was cut over 25 Oct) moved to `_legacy/docs/`, references in
  server.js, README and CLAUDE.md retargeted.
- **Firestore rules**: `catalog_publishers` and `catalog_agents` closed to clients (release with `firebase deploy --only
  firestore:rules` on the owner's go, verified as an anonymous visitor afterwards).
- **Tests**: test-catalog 18 (publishers, scenes/peaks shapes, agent store), test-testers 59 (invite by admin, agent key on the
  tester routes, key life cycle); every harness that loads server.js knows `catalogSchema.js` and `agents.js`.
- **Site tour (visitor's eye, 1440 px, 31 Oct)**: home (film, news, packs), /tools, /plugins, rooms (KUBBE, TORNA), /sample-packs,
  a pack page, /preset-packs, /testers, /account, /help, /forum, /loom, 404: no console errors, nothing broken. Local only:
  /learn is empty because the local API has no articles route (live lists seven guides).
- Gate (31 Oct ~15:20 TR): lint 0 errors (2 old warnings), `npm run build` exit 0 (86 routes + homepage), 16 test files: all pass
  except the two known sweep cases (test-download 100/101, test-sample-packs 15/16; six packs listed 1 Nov). The gate caught
  `agents.js` missing from `api/Dockerfile` (fixed; the API image must be rebuilt on 1 Nov with catalog.js, catalogSchema.js, agents.js).
- /plugins (`PluginsPage.jsx`, `.box-*` in index.css): no card, no frame; the box on the page ground with a soft drop shadow
  (the news `is-bare` look), lifts on hover; under it, centred: name, kind, price (launch price struck as before) and the
  owner's Download button. Filter chips, trust line and the tools strip unchanged. `BOX_IMG` in plugins.js; a catalogue
  plug-in may upload its own `boxImage` (schema field) or gets a CSS-drawn box from its panel. /account keeps the old cards.
- /sample-packs (`SamplePacksPage.jsx` PackCard, `packsCss.js` `.vinyl-*`, `Snippet.jsx` CoverPlay `onState`): the cover is the
  sleeve; a CSS record (grooves, conic sheen, a label cut from the cover, spindle hole) sits behind it, rises 38 % on hover /
  focus-within, and while the preview plays it stays 52 % out and turns (1.8 s/turn). The hovered card comes to the front, so
  the record passes over the row above (grid row gap 28 -> 40 px). Reduced motion: no easing, no turn. Checked on localhost:
  play -> `is-playing`, animation `vinyl-spin`, audio playing; pause stops it.
- Decision asked by the owner (record vs cassette vs CD): built as a record. The sleeve-and-disc gesture reads at card size
  and says "sample pack" at once; the cassette is KASET's own identity and its reels would be too small on a 230 px card; a
  CD case reads dated. Easy to swap: the disc is CSS only.
- Gate: eslint 0 errors (2 old warnings); test-order 8/8 (the /plugins and pack-page sort lines updated), test-presets 7/7,
  test-catalog 15/15; `npm run build` exit 0 (86 routes + homepage, sitemap 67 URLs), last run 31 Oct ~02:05 TR after the bubbles.

## NEXT DEPLOY (prepared 31 Oct, live catalogue) — products and news from /admin, no deploy per item (local, NOT deployed, NOT committed; site AND API)
- Owner 31 Oct: "bir pro admin panelini kuralım artık yeni bir ürün haber ya da sample paketi yükleyeceğimiz zaman panel üzerinden
  manuel ekleyeceğiz yeni bir şey çıktığında bütün siteyi yeniden deploy etmek zorunda kalmayacağız". How it works and the
  checklist: `docs/CATALOG.md`.
- API (`api/`): `catalog.js` + `catalogSchema.js` (new; BOTH added to `api/Dockerfile` COPY), routes `GET /api/catalog` (public,
  60 s cache), `GET /api/catalog/slugs`, `GET/POST /api/admin/catalog/*` (save, delete, media upload, sold-file upload + manifest
  publish/remove), a middleware that loads the catalogue before download / purchases / orders / webhook routes, and
  `productSlugFor` reads the Lemon Squeezy product id from the catalogue after `LS_PRODUCT_SLUGS`. `entitlements.js`:
  `registerCatalogProducts` mutates the slug lists IN PLACE (`SWEEP_SLUGS` no longer frozen); known slugs are never changed.
  `SVL_DEV_ADMIN=1` (never on Cloud Run, K_SERVICE guard) lets a local API accept the preview token for the catalogue routes.
  `app.listen` takes `HOST` (local 127.0.0.1 only).
- Site: `src/catalog/*` (fetch, merges, data overrides, shapes), the homepage news, /sample-packs, /sample-packs/<slug>,
  /preset-packs, /plugins, `/plugins/:slug` (CatalogPluginRoom) and the pack shelf read the catalogue over the static data;
  `plugins.js` `pluginBySlug` / `trustLineFor` know catalogue plug-ins (`CATALOG_PLUGIN_INDEX`). Admin: new **Catalogue** tab
  (`admin/CatalogTab.jsx`, `CatalogEditor.jsx`, `catalogApi.js`): code + live rows per kind, schema-driven editor with uploads
  and a live news-frame preview, hide/show, Files panel (manifest table, upload-and-publish).
- `server.js`: `/plugins/<slug>` and `/sample-packs/<slug>` that are not prerendered answer 200 when the API lists the slug
  (`/api/catalog/slugs`, cached a minute; without an API origin the shell is served); CSP gains `media-src` for the two buckets.
- `vite.config.js`: `SVL_DEV_API` sends /api to a local API (writes included); `/api/catalogSchema.js` is served as a module,
  not proxied. `.claude/launch.json`: `subverselab-api-dev`, `subverselab-site-dev-local`. `firestore.rules`: the four
  `catalog_*` collections named server-only (no behaviour change; a rules deploy is NOT needed for this).
- Verified 31 Oct ~00:40 TR on localhost (local API on the real Firestore with the owner's credentials): the Catalogue tab lists
  the 9 code news frames; a test frame `panel-test` (order 15, bare TORNA box, published) saved from the panel, appeared on the
  homepage in position 2 between BOE-B and TORNA, was read back by `GET /api/catalog`, then deleted from the panel (Firestore
  is clean again). The signed-URL upload fails on this Mac ("Cannot sign data without client_email"): uploads now go through
  the API (`PUT …/media`, `PUT …/file/direct`); the Cloud Run signed path is untested live. No file was uploaded to a bucket
  from here (the one attempt from the shell was stopped before it ran).
- Gate: eslint 0 errors (2 old warnings); `npm run build` exit 0 (86 routes); `node scripts/test-catalog.js` 15/15; every other
  `scripts/test-*.js` passes except the two known date-bound sweep cases (test-sample-packs 1, test-download 1; they pass from
  1 Nov). `test-order.js` updated for the pages' new sort lines. test-pages / test-split not rerun after the build.
- Deploy notes: the API image must be rebuilt (new files); the site after it. On Cloud Run check that the API's service account
  may write `gs://subverselab-downloads/plugins/*` and the Firebase bucket `catalog/*` (it already reads the first); if signed
  URLs fail there too, the direct upload still works up to 32 MB per request.
- Not done (follow-ups): sitemap / prerender for catalogue-only pages (they are client-rendered until the next build);
  /account cards for a catalogue-only plug-in; test coverage of the admin routes themselves (service is covered).

## NEXT DEPLOY (prepared 30 Oct, news) — one JING FANG news item instead of two (local, NOT deployed, NOT committed; site only)
- Owner 30 Oct: "jingfang haberini birleştir". `src/data/news.js`: the launch-price item and the GENERATE item are one item, key
  `jingfang`, in the launch item's place (after the family thank-you). While the launch price runs the title is "$60 instead of $150."
  and the line ends "Launch price until 1 December 2026."; afterwards the item stays with the title "Play between the keys, and let it
  write the first idea." and no price. `title` and `line` may now be functions of the date; `liveNews()` resolves them.
- Its picture is new (owner 30 Oct, picked "3" of four): `public/news/jf-device.webp` (1600x893, 193 KB), JING FANG as a hardware
  synth on a desk with the two dragons, made in Flow (Nano Banana 2.1, 0 credits) from the real panel; source 2752x1536 in
  `01_AI_Tools/subverselab-studio/branding/out/device_2026-10-30/jf_device_3.jpg`. News only: the model redraws the small section
  labels, so the room and the stores keep the real panel. If `VITE_MEDIA_BASE` is set, upload `news/jf-device.webp` with the media.
- BOE-B news picture is new (owner 30 Oct, picked "2" of the floor-pedal set): `public/news/boeb-pedal.webp` (1600x893, 82 KB),
  BOE-B as a red floor unit with the mic plugged in, a rapper in a small studio (Flow, 0 credits, from the real panel). The model
  copied the old hyphenated mark onto the unit's corner; it was painted out (`boeb_pedal_2_clean.jpg` in
  `01_AI_Tools/subverselab-boeb/docs/marketing/pedal_2026-10-30/`). News only; `public/plugins/boeb/news.webp` stays on disk.
  If `VITE_MEDIA_BASE` is set, upload `news/boeb-pedal.webp` with the media.
- Homepage packs sparser (owner 30 Oct: "tüm kaydırma boyunca sadece 2 tane açılsın ... sadece kapak isim play tuşu"):
  `PackShelf.jsx` shows two cards on the whole page, the first drum kit from the left edge at about a third of the way down and the
  next from the right edge at about two thirds (gaps 1971 px and 3930 px of 9 frames at 1273 px wide). A card is its cover, play
  button and name only (kind and price dropped), `width: max-content` (188-191 px instead of up to 300 px with an empty half).
- No entrance motion on the news frames (owner 30 Oct: "haberlerden frame motion'u kaldıralım"): the copy and the panel no longer
  fade or slide in; `index.css` rules removed (desktop, reduced-motion and mobile variants).
- Tried and removed the same day on the owner's word: 300 / 150 px side margins, panel pieces beside the news, a panel collage in
  the margins. None of it is in the code.
- TORNA news picture is its box (owner 30 Oct: "tornanın kutulu görselini koy"): `public/news/torna-box.webp` (1600x1129, 43 KB),
  rendered that day with the family's box generator (`subverselab-kaset/tools/mockups.py` render_box, model TR-83, "Graphic
  equalizer", current SUBVERSELAB lockup) from the panel without its footer; sources `torna_box_left|right.png` (2400x1600) in
  `01_AI_Tools/subverselab-analog-eq/docs/marketing/`. If `VITE_MEDIA_BASE` is set, upload `news/torna-box.webp`.
- Then (owner 30 Oct: "siyah arkaplanı kaldır sadece kutuyu görelim"): the box alone on a clear ground, no floor, shadow or reflection
  (`torna_box_left_clear.png`, 1466x930; `public/news/torna-box.webp` 59 KB). A news item may set `bare: true`: its window drops
  the frame, background and corner radius, and the picture gets a soft drop shadow of its own (`.news-window.is-bare`).
- Tester news picture (owner 30 Oct, picked "1" of the brand-palette set): a tidy home studio, bottle-green walls, cream chair and
  rug, brass lamp, an empty chair, TUTKAL on the screen, no name or text anywhere (Flow, 0 credits; `public/news/testers-studio.webp`,
  1376x768; source `launch_desk/testers/studio_2026-10-30/brand_1.jpg`). The earlier "Bigdre Productions" versions are not used (no permission from the tester). If `VITE_MEDIA_BASE`
  is set, upload `news/testers-studio.webp`.
- Free-plugins news (owner 30 Oct: "alev fotoğrafında arkaplanı kaldıralım plugin zemine otursun", "alttaki logoyu düzelt ve eğimli
  şekilde yerleştir"): ALEV cut out of its flat #033733 ground (`public/news/free-alev-cut.webp`, 1203x1146, 112 KB, `bare`). The old
  SUBVERSE-LAB lockup on the bottom of the bezel is painted out and the current mark + SUBVERSELAB wordmark (cream, brand kit) is
  bent along the bezel (radius R-40 of the fitted ring). Source `01_AI_Tools/subverselab-kor/alev_cutout.png`. The old
  `free-alev.webp` stays on disk. If `VITE_MEDIA_BASE` is set, upload `news/free-alev-cut.webp`.
- ELEK news picture (owner 30 Oct: "panel fotoğrafı yerine stem ayırmayı ifade eden bir şey çizelim, arka plana otursun"): a drawn
  split, one song waveform branching into VOCALS / DRUMS / BASS / OTHER lanes, transparent, in --color-gold-bright and
  --color-accent-light only (legible in both themes; `public/news/elek-stems.webp`, 1465x870, 96 KB, `bare`). Source
  `01_AI_Tools/subverselab-studio/marketing/elek/elek_stems.png`. If `VITE_MEDIA_BASE` is set, upload `news/elek-stems.webp`.
- Manuals news (owner 30 Oct, "kalan 2 haber içinde benzer bişi"): three real manual pages (page 2 of JING FANG, KUBBE, TORNA),
  fanned with soft shadows on a clear ground (`public/news/manuals-fan.webp`, 1600x1313, 280 KB, `bare`); source
  `01_AI_Tools/subverselab-studio/marketing/manuals/manual_fan.png`.
- Tool-credits news: a drawing, $1 coin -> 100 credit dots -> Mix Check, Splitter, Arrangement GPS (their brand glyphs, ink strokes
  recoloured to --color-accent-light so they read on dark green), gold and teal only (`public/news/tool-credits-flow.webp`,
  `bare: 'flat'`); source `01_AI_Tools/subverselab-studio/marketing/credits/tool_credits.png`. If `VITE_MEDIA_BASE` is set, upload
  `news/manuals-fan.webp` and `news/tool-credits-flow.webp`.
- Footer (owner 30 Oct: "sosyal hesapları footer linklerinden ayırıp icon olarak koyalım"): YouTube and Instagram leave the text
  links and sit as round icon buttons in the left column under the copyright, opposite the links (owner: "karşı tarafına") (`Footer.jsx` SOCIAL, `.footer-social*` in index.css). Marks from
  simple-icons 13.21.0 (CC0) in `public/social/`, painted in the footer's ink through a CSS mask, gold on hover; aria-label = name.
- OPEN, not fixed: ALEV's own panel shots (`public/plugins/alev/alev_*.png`) still carry the hyphenated lockup.
- OPEN, not fixed: TORNA's site panels (`public/plugins/torna/panel-default.webp`, `hero.webp`, likely the other panel shots) still
  show the old hyphenated SUBVERSE-LAB lockup bottom right; the room and the store use them. The JING FANG box mockup
  (`subverselab-studio/marketing/mockups/jingfang_box_*.png`, made before 28 Oct) also carries the hyphen.
- The homepage now has 9 news frames (was 10). Checked on localhost:5181: one JING FANG frame, panel image, GENERATE text in it.
- Owner 30 Oct: the news homepage is not to be published as it is now; more fixes follow before the deploy.
- Gate: eslint 0 errors (2 old warnings); build exit 0 (86 routes); test-listen 69/69 (key list and both date states tested); all
  other tests pass except the known date-bound sweep cases in test-sample-packs (1/16) and test-download (1).

## NEXT DEPLOY (prepared 29 Oct, footer strips) — hosts and stores drift through the footer (local, NOT deployed, NOT committed; site only)
- Owner 29 Oct: "2 şerit kuralım logolar transparan bir şekilde yüzsün, birinde dawları koyalım diğerinde mağazaları, kvr'yi de
  koyabilirsin"; then "biraz daha büyütüp alanı ortalayabilirsin".
- New `src/components/FooterStrips.jsx`, placed in `Footer.jsx` beside the emblem column; CSS `.footer-strip*` in `index.css`.
  Row "Runs in": Ableton Live, Logic Pro, FL Studio, Cubase, Studio One, Reaper, Bitwig Studio, GarageBand as names, not logos
  (the DAW makers restrict their marks; Pro Tools left out, no AAX). Row "Also on": MuseHub (UTM partner page), KVR
  (/developer/subverselab), Gumroad (subverselab.gumroad.com), itch.io (subverselab.itch.io), each linking to our page there.
- Marks in `public/partners/stores/` (MuseHub from musehub.com, Gumroad/itch.io simple-icons CC0, KVR PNG from kvraudio.com),
  drawn as one-colour masks in `--color-text`; faint (opacity 0.4/0.45), stores brighten on hover; rows drift in opposite
  directions (48 s / 36 s loops), pause on hover/focus; repeated copies are `inert` (each link reached once); reduced motion:
  static, wrapped.
- Second pass (owner 29 Oct: "runs in ve also on yazılarını kaldır, dawları logoları ile birlikte ekle"; "bizde aax formatı yok,
  yanlış daw koymayalım"): no visible labels (the rows keep aria-labels); hosts are logos in `public/partners/daws/`: Ableton
  Live, Cubase, Bitwig (Wikimedia Commons, public domain), FL Studio (fruit lockup from image-line.com), Logic Pro (Commons icon, shown greyed), Studio One
  (PreSonus mark from presonus.com + name), REAPER (reaper.fm JPEG turned into an alpha mark + name). Only VST3/AU hosts:
  no Pro Tools (AAX only); GarageBand dropped (no usable mark). Light and dark checked at 1920; lint 0 errors, build exit 0
  (86 routes), tests: only the two known date-bound failures.
- Third pass (owner 29 Oct: "tıklanabilir olmaması daha iyi, kullanıcı sayfada kalır"): store logos are no longer links
  (plain images with names for readers); no hover pause. FL Studio now its fruit lockup from image-line.com.
- Checked in the pane: 1440 and 1920 wide, light and dark, the loop has no gap at 1920 (run 2,636/2,829 px vs window ~1,030);
  375 px phone: no sideways scroll. Lint 0 errors (2 old warnings); build exit 0 (86 routes); tests: only the known date-bound
  failures (test-sample-packs 1 of 16, test-download 1 sweep case).

## NEXT DEPLOY (prepared 29 Oct, checkouts) — the seven Lemon Squeezy products are published; only the deploy waits for 1 Nov
- Owner 29 Oct: "kapatmadan önce bu işleri yap, sadece deploy 1 Kasım'a kalsın".
- Lemon Squeezy (live mode), published 29 Oct ~00:20 TR: SVL Mirage 1480722, Kotoflux 1481075, Saffron 1481389, Solstice
  1481392, Velvetroom 1481394, Nightgrid 1481396 ($5 each), TORNA 1481039 ($12). Checkout URLs pasted into
  `samplePackPrices.js` PACK_CHECKOUT (six packs) and `plugins.js` CHECKOUT.torna (stale "once it is published" comment removed).
- TORNA downloads published with `publish_download.sh` (owner's go): mac `Torna-1.0.0-macOS.pkg` 15,350,860 B (stapler validate
  OK, spctl "Notarized Developer ID"), win `TORNA-windows.zip` 6,999,237 B; bucket sizes equal the local files; bucket manifest
  lists torna 1.0.0. The live `/api/download/manifest` does not show torna yet: the live API (00010) does not know the slug.
- Importer re-run: 15 packs; covers now come from the 28 Oct name-fixed `out/<work>/cover.png` (SUBVERSELAB), so they differ
  from the live (old-name) covers on purpose.
- Lint 0 errors; build exit 0 (86 routes). Tests: all pass except one date-bound case in test-sample-packs (1 of 16) and
  test-download (1 of 101): a sweep bought today rightly excludes the six packs listed on 2026-11-01; both pass from 1 Nov 00:00 UTC.
- **Deploy day (1 Nov), what is left:** set `LS_PRODUCT_SLUGS` on site AND API to the current value plus
  `1480722:mirage,1481075:kotoflux,1481389:saffron,1481392:solstice,1481394:velvetroom,1481396:nightgrid,1481039:torna`;
  re-run the tests (the two sweep cases should pass); deploy; check the six pack rooms, /plugins/torna, the checkouts and
  `/api/download/manifest` (torna listed) live; download TORNA end to end. Owner decides: unpublish "SubverseLab Plugin Family"
  ($19.99, still Published on Lemon Squeezy) when the family ends.

## NEXT DEPLOY (prepared 28 Oct, Download Room) — /launch2 lists every product on sale or free (local, NOT deployed, NOT committed; site only)
- Owner 28 Oct: "güncelle yeni yapıya göre" (the room still listed only the retired family's seven products).
- `plugins.js`: new `DOWNLOAD_ROOM_PLUGINS` = `STORE_PLUGINS` minus products without a checkout in LINE2 (ADALET); LAUNCH2
  description and steps no longer name products. `LaunchPage.jsx` (/launch2): cards, prices (launch price where active, "Free"),
  buy buttons ("Get X free" for the free ones) and downloads for that list; each product downloads through its own launchId,
  as on /account (`p.launchId || 'launch'`). The generic VST3/AU trust line and the hand-written formats sentence are gone
  (formats live on each product's page). Card grid: `auto-fill, minmax(260px, 1fr)`, images 16:10 (1475 px: 4 columns; phone: 1).
- `scripts/prerender.js`: the static /launch2 lists the same products with their current price; the dead family branches
  (`familySold`, `bundleLine`, the family `<h1>` page) are removed, FAMILY_RETIRED makes them unreachable.
- Checked in the pane: 15 products in store order (TORNA … TABAN), prices TORNA $12 (available shortly until its checkout),
  JING FANG $60, ELEK $7, free ×3; light and dark; 375 px phone no sideways scroll; console clean on a fresh tab. Lint 0 errors;
  build exit 0 (86 routes); tests: only the known failures (test-sample-packs 3 of 16, test-download 1 of 101).
  Not tested: a signed-in buyer's download from this page (needs a real session; the same component and launchIds as /account).

## NEXT DEPLOY (prepared 28 Oct, site sweep) — page widths as tokens, theme conflicts, dead code, stale rules (local, NOT deployed, NOT committed; site only)
- Owner 28 Oct: "bütün websiteyi gez … boyutlandırma, karanlık/aydınlık çakışmaları … kesin ve kalıcı çözüm, ölü kodları temizle,
  eskiyen kuralları kaldır".
- Widths, one place: `:root` tokens `--page-max` (`min(92vw, 1600px)`) and `--read-max` (820px, running text). `.container`,
  `.news-feed`, `.plugin-hero-inner`, `.panel-tour-inner`, `.tp-layout`, `.lh-inner` use `--page-max`; `.manual-body` and the
  text columns set inline (Legal, Help, Launch, Loom, Testers, PluginRoom, ToolRoom, AccountSignIn) use `--read-max`; AdminPanel's
  own 1200px removed. The pack store's own CSS (`packs/packsCss.js`): `.st-page` 1120px and `.sp-plate.wide` 1080px →
  `--page-max`, `.st-grid` fixed 4/3/2 columns → `auto-fill, minmax(min(230px, 40vw), 1fr)` (1475 px: 5 columns edge to edge,
  phone: 2). Rule written in the site CLAUDE.md.
- Theme conflicts fixed: the bottom audio player was a fixed black bar in the light theme with ink text (unreadable) → surface token
  + shadow, play icon `var(--color-bg)`; the account welcome panel was fixed dark green in the light theme → `--pl-*` tokens.
- Dead code removed: `useLaunch2Standing` (LaunchPage), `FAMILY_LATER`, `FAMILY_IMAGE_SIZE`, CSS `.showcase` (+ keyframes
  `showcaseBob`) and `.divider` (no element renders them).
- Stale rules: duplicate `.launch-prices` merged; `.news-frame` border set then removed twice → one rule; the "HIGH STEREO / Deep
  Black" design-system header and "the product UI stays dark" comment replaced; 404 patch bay listed the retired family → every
  plugin on sale or free, newest first, centred rows of eight.
- Audit (iframe sweep in the browser pane, 71 routes × 375/1920 px × light/dark = 284 loads, before the fixes): horizontal overflow 0,
  script errors 0. Contrast flags were checked by eye: all on gradient grounds (gold keys, room headlines, the 404 device) and
  readable, i.e. false positives of the script. Lint 0 errors (2 old warnings); build exit 0 (86 routes); tests: only the known
  failures (test-sample-packs 3 of 16, test-download 1 of 101).
- Not changed: the Download Room (`/launch2`, footer link) still lists only the retired family's seven products (owner to decide).

## NEXT DEPLOY (prepared 28 Oct, full width) — homepage news wider, pack cards slide in from the window edges (local, NOT deployed, NOT committed; site only)
- Owner 28 Oct: the news sat in a 1200 px column with wide empty bands either side, and the drum/FX pack cards, whose point is to
  open from the edges, opened from the column's edges instead of the screen's.
- `src/index.css`: `.news-feed` max-width 1200px → `min(92vw, 1600px)`; `.pack-gaps` spans the window (left/right
  `calc(50% - 50vw + var(--sbw)/2)`), cards flush to the edge with the outer corners square. `PackShelf.jsx` sets `--sbw`
  (classic scrollbar width) on measure, so 100vw never causes a sideways scroll.
- Measured in the pane: 1920×1080 → news 1600 px (157/163 px either side), shelf 0–1914 px, cards at 0–300 and 1614–1914 px, no
  horizontal scroll; 375×812 phone → news 345 px, no horizontal scroll. Lint 0 errors (PackShelf, HomeIntro); build exit 0
  (86 routes); tests: all 15 files run, only the known failures (test-sample-packs 3 of 16, test-download 1 of 101).
- Not changed: the other pages keep `.container` max-width 1200px.

## NEXT DEPLOY (prepared 28 Oct, intro fix) — JING FANG opening on portrait windows (local, NOT deployed, NOT committed; site only)
- Owner 28 Oct: on a narrow/portrait window the opening played as a small boxed video with hard edges in the middle of the screen.
  Cause: the `-tall` files are the 16:9 film boxed on a 9:16 ink frame, shown with `object-fit: contain`.
- `src/components/HomeIntro.jsx`: always plays the `-wide` film; portrait layout sizes it to the window width, centred, top and bottom
  feathered into the ink by a mask (no box edge). Landscape unchanged (full-screen cover). The `-tall` files are no longer used.
- Checked in the browser pane: 700×800 (film 700×394, centred, feathered), 375×812 phone, 1475×979 desktop (full screen); no console errors.
  `npx eslint src/components/HomeIntro.jsx` 0 errors; `npm run build` exit 0 (86 routes prerendered). Not checked on a real phone.

## NEXT DEPLOY (prepared 28 Oct, store copy) — sales copy across the store (local, NOT deployed, NOT committed; site only)
- Owner 28 Oct: "tüm websiteyi gez, böyle soğuk kalan metinleri bul, satış pazarlama uzmanı gibi ürünleri pazarla". Words only, no layout,
  route, price or colour change; every claim taken from the existing product data.
- src/data/plugins.js: new intro (room lead) for every plug-in; new taglines for KUBBE, KASET, YANKI, TUTKAL, RU-8, ELEK, TORNA; the bare
  "Moods" lists of KORO, YANKI, HAVA and ADALET's COLLIDE / SELF lines rewritten. Meta descriptions untouched.
- Headers: /plugins, /sample-packs (+ foot line), /preset-packs, /tools (subtitle, empty states, Workflows line), /help intro, footer blurb,
  ToolsStrip; tool one-liners (src/data/tools.js); preset pack summaries (src/data/presetPacks.js). prerender.js kept in sync, and the
  family-room template no longer prints ".." after a tagline that ends with a full stop.
- Checks: eslint 0 errors; build OK; tests as before (test-sample-packs 3 and test-download 1 sweep case fail: packs without a checkout).

## NEXT DEPLOY (prepared 28 Oct) — web manuals for every product with a manual (local, NOT deployed, NOT committed; site only)
- Owner 28 Oct: "diğer pluginler için en güncel ve web klavuzunu hazırla". /plugins/<slug>/manual now exists for KORO, YANKI, HAVA, MIHENK,
  TUTKAL, JING FANG, RU-8, ELEK, ADALET, TABAN, ALEV, KIYMA (besides KUBBE, KASET); one data file each in src/data/manuals/, shared helpers in
  src/data/manuals/common.js; MANUALS drives App.jsx routes, prerender.js (static page per manual) and the sitemap (+12 URLs).
- plugins.js manualPage set for each; rooms (React and prerendered) link "Read the X manual · PDF"; Account page shows "Read online".
- Pages describe the versions on sale (manifest 28 Oct); TUTKAL follows 1.0.3 and JING FANG 1.2.0 where the HTML/PDF manuals are older:
  the PDFs on the site are NOT regenerated (TUTKAL PDF 4 Oct, YANKI and JING FANG PDFs predate their shipped versions).
- test-split.js sitemap count now 33 + MANUALS.length. Lint 0 errors; build OK; tests as before (Mirage pack failures only).
- No SEDA manual exists (none written). → superseded by the entry below.

## NEXT DEPLOY (prepared 28 Oct, manuals 2) — product copy follows the shipped versions; ELEK keyless; PDFs rebuilt; SEDA manual (local, NOT deployed, NOT committed; site only)
- Owner 28 Oct: "tespit ettiğin eksikleri tamamla". plugins.js: TUTKAL KEY ON/AUTO (no EXT), SC HPF off by default; JING FANG GENERATE + MIDI clips
  plain / MPE-style; ADALET analyzer OFF / PRE / POST / PRE+POST; MIHENK without "about twenty scenarios", APPLY buttons, REAR CLI/JSON and the
  macro tour step (macros wait for the owner); KORO / YANKI / HAVA formats + trust line name the macOS standalone app (FORMATS_MAC_STANDALONE,
  TRUST_LINE_MAC_STANDALONE); SEDA controlsNote formats fixed; ELEK noKey: true (account, room, manual and prerender say "No licence key to type").
- New SEDA manual: /plugins/seda/manual (src/data/manuals/seda.js, in MANUALS → +1 sitemap URL) and public/plugins/seda/Seda_Manual.pdf.
- PDFs replaced in public/plugins (same names): Tutkal_Manual.pdf (9 p), Yanki_Manual.pdf (10 p), JingFang_Manual.pdf (14 p), Seda_Manual.pdf (8 p, new),
  built with headless Chrome from each plug-in's docs/manual/*.html. With the split media bucket live, upload these four PDFs to the bucket at deploy.
- Checks: eslint 0 errors; build OK (80 routes); tests as before (only the Mirage / Kotoflux sample-pack failures).

## NEXT DEPLOY (prepared 28 Oct) — the plugin family leaves every public page (local, NOT deployed, NOT committed; site only)
- Owner 28 Oct: "plugin family ibarelerini her yerden kaldır hiç bir yerde görünmesin bu artık bitti".
- src/data/plugins.js FAMILY_RETIRED = true (isFamilyOfferOver/familyOnSale always over); /plugins, /launch, /launch2 copy rewritten; /launch2 is
  "SubverseLab plugins — Download Room" (og image /plugins/mihenk/og.jpg), keeps its route and download logic for single and family buyers.
- Removed from the client: FamilyOffer block, homepage family opening, family Buy buttons (launch2, rooms, /account), "In the family" filter,
  footer "Plugin family" link (now "Download Room"), family news image. Legal (/terms, /refunds), FAQ, llms files, prerender: no family wording;
  refunds keep the effect ("Refunding an order that holds several plugins closes all of them"). Legal "updated" dates not changed.
- Untouched: api/*, entitlement slugs (family/bundle4/bundle), LS checkouts, stats place names. Existing family buyers still get all seven on /account.
- Checks 28 Oct: eslint 0 errors; build ok; dist html/txt/xml grep "family" (minus font-family) = 0; JS chunks: visible family strings = 0.

## NEXT DEPLOY (prepared 28 Oct, 12) — the name is SUBVERSELAB everywhere: logos, covers, manuals, share card (local, NOT deployed)
- Owner 28 Oct: "SUBVERSE-LAB böyle bir ibare yok … SUBVERSELAB". The master emblem in the brand kit carried a hyphen; it was removed there (old one in `Assets/Brand/_legacy/`) and every kit asset regenerated.
- Site files: `public/og-image.jpg` (main share card: SUBVERSELAB, and "MACOS · WINDOWS" instead of "7 PLUGINS"), `og-learn.jpg`, `og-help.jpg`, `apple-touch-icon.png`; the 16 manual PDFs under `public/plugins/*/` rebuilt with the corrected wordmark; all 15 sample-pack covers re-composed ("SUBVERSE LAB" → "SUBVERSELAB") and imported; 404 page text; `index.html` title.
- Not in this deploy: the plug-in panels still draw the old wordmark until the plug-ins are rebuilt (files and steps: `01_AI_Tools/subverselab-plugin-common/brand_2026-10-28/README.md`); the site's panel screenshots follow after that rebuild.
- If `VITE_MEDIA_BASE` is used at deploy, upload the changed PDFs, covers and OG images to the media bucket too.

## NEXT DEPLOY (prepared 28 Oct, 11) — light/dark balance; shadows instead of gold frames (local, NOT deployed)
- Owner 28 Oct: "aydınlık karanlık tema dengesini çok iyi kur" and "dark modda her şeyin etrafında kalın sarı çizgi var, bunun yerine gölge, her iki modda".
- Rule now: light theme is cream everywhere, dark theme is dark green everywhere. Only the products' own pictures and device displays (panel screenshots, VFD/key readouts, waveform strips, the JING FANG film) keep their dark ground in both.
  - Plugin hero (`.plugin-hero`), "hear it" hero (`.lh`, KUBBE etc.), MIHENK/JING FANG panel tour and the tester band were always dark; they now follow the theme through `--pl-*` / `--room-amt` / `--tour-bg` tokens in index.css. In light the room colour is a 13 % wash over cream, with ink text.
  - Buy buttons: ink in light, gold in dark (`--pl-btn`).
- Dark `--color-border` is neutral cream at 10 % (was gold at 20 %). Boxes (cards, news images, gap cards, account folds, pack cards, manual blocks, Loom notice, tester cards) lose their border and take `--shadow-card` in both themes; lines remain only as dividers inside boxes.
- Checked: an audit of 17 pages × 2 themes (contrast of every text node, full-width blocks of the wrong lightness, gold borders on boxes). Before: 9 pages with dark blocks or unreadable text in light, gold frames on every box in dark. After: 0 wrong-lightness blocks; remaining gold lines are button outlines only; the one contrast hit left is /tools' gradient heading (gradient text, a false reading).

## NEXT DEPLOY (prepared 28 Oct, 10) — "Download with MuseHub" on MIHENK and ELEK (local, NOT deployed)
- Owner 28 Oct: "musehub ile indir tarafını ekleyelim". MuseHub's own badge (`public/partners/musehub/download-with-musehub.svg`, from Jeanette Kats' Drive folder "Download with MuseHub Buttons"; a grey variant is kept beside it) sits next to the Lemon Squeezy Buy button in the hero and in #buy of the plugin rooms (`MuseHubButton.jsx`, `PluginRoom.jsx`).
- Links: `MUSEHUB` in `src/data/plugins.js`, the UTM links Jeanette sent on 28 Oct 00:55 (labsubverse thread "SubverseLab X MuseHub / Distribution Opportunity"): utm_medium=PT, utm_source=WS, utm_campaign=MH_WW_PT_WS_WEB_ALL_271026_. `MUSEHUB_PARTNER_PAGE` (developer/subverselab) is defined for the "Available on" strip, not used yet.
- Owners and visitors who already own the product see Download, not the badge. Checked locally signed out: /plugins/elek and /plugins/mihenk, 2 badges each, 47 px like the Buy button, links to /plugin/elek and /plugin/mihenk with the campaign.
- After the deploy: tell Jeanette the buttons are live (she asked to be told), from labsubverse, only on the owner's go.

## NEXT DEPLOY (prepared 28 Oct, 9) — homepage: warmer news copy, five more news items, a side shelf of packs (local, NOT deployed)
- Owner 28 Oct: news copy rewritten to sell (BOE-B, TORNA, family thanks, JING FANG, testers); new items: JING FANG GENERATE, ELEK, free
  plugins, manuals online, tool credits (images in public/news/). test-listen pins the new order (10 keys).
- PackShelf.jsx (owner: "sadece boşluklarda çıkmaları gerekiyor ve haberleri küçültmemeliler"): two compact pack cards sit on each
  gap between news frames, one from each edge; they slide in while that gap passes the middle of the screen and back out after it,
  up and down alike (scroll-linked). The news keeps its full width (gaps 96 px each side of the divider). From 900 px wide; with
  reduced motion they are shown in place. Checked at 1119 px: 9 gaps, cards only in the gap at mid-screen.
  Update (owner, later 28 Oct): the gap cards show only the drum kits and the FX pack (Brickyard, Kerbstone, Stepwell, Lampglass, Slagworks, Squall); no melodic or preset packs. A card slides in as its gap rises past 85-65 % of the window, stays out while scrolling down, and closes when scrolled back up. `.pack-gaps` has z-index 6 so the play button and the card link take clicks; play button 32 px.

## NEXT DEPLOY (prepared 28 Oct, 8) — pack prices shown before the checkout exists; pack zips uploaded (local site change, NOT deployed)
- Owner 28 Oct: "paketleri yükle ve sample packs tarafına fiyatları 5 dolar olarak yaz". The catalogue card and the pack page show the
  $5 price whenever PACK_PRICES has it (SamplePacksPage, SamplePackPage); the Buy key stays "Available soon" and there is no JSON-LD offer
  until the checkout is set. The six zips were uploaded with publish_download.sh <slug> zip … 1.0.0 (owner's go; bucket private,
  downloads only for owners), so on deploy day step "publish_download" is already done for Mirage, Kotoflux, Saffron, Solstice,
  Velvetroom, Nightgrid (check the manifest first).

## NEXT DEPLOY (prepared 28 Oct, 7) — one sales line per sample pack (local, NOT deployed)
- Owner 28 Oct: sales-led, every pack its own description, no plug-in or engine names, true to that pack. src/data/packMadeLines.js,
  shown under the tagline on each pack page (SamplePackPage .st-made). The six JF packs claim their melodic voices and drums, not the
  Surge 808 their trap loops use; the three Surge melodic packs claim only the writing, production and drums. No "raw / no processing".

## NEXT DEPLOY (prepared 28 Oct, 6) — 1 Nov: sample packs Saffron, Solstice, Velvetroom, Nightgrid (local, NOT deployed)
- Owner 28 Oct: "saffronu onayladım", "hepsi onaylı geçir ve samplepacklere ekle". JING FANG builds, 20 loops / 200 WAV / 180 MIDI each,
  SHA 0 failures. Zips in 01_AI_Tools/subverselab-packs/out/: SVL_Saffron.zip, SVL_Solstice.zip, SVL_Velvetroom.zip, SVL_Nightgrid.zip.
- Site: PACK_SOURCES (surge_pack_indian / afrolatin / soulrnb / synthwave), SAMPLE_PACK_LISTED 2026-11-01, PACK_PRICES 5, productDates 2026-11-01.
  Importer: 15 packs; the nine live packs' snippet/peaks/scenes cmp-identical to dist, their covers copied back. Covers: Flow art + cover_compose.
- Lemon Squeezy DRAFTS ($5, Digital Goods or Services, keys off, receipt like Mirage): SVL Saffron 1481389, SVL Solstice 1481392,
  SVL Velvetroom 1481394, SVL Nightgrid 1481396. Deploy day: as for Mirage/Kotoflux (publish, checkout UUIDs, LS_PRODUCT_SLUGS,
  publish_download.sh <slug> zip …, tests, deploy).
- Rule (owner 28 Oct): instruments used in these packs are not used in later packs (packs CLAUDE.md 7, KNOWLEDGE B10, tools/used_instruments.json).

## NEXT DEPLOY (prepared 28 Oct, 5) — homepage opening: the JING FANG film (local, NOT deployed)
- Owner 28 Oct: "ikinci olanı localdeki sürüme intro olarak koy". HomeIntro JF_LIVE = true with the Flow film of the device and its two
  dragons (title in the film; baked: no text layer, no scrim; showMs 11.5 s). public/plugins/jingfang/intro/jf-intro-{wide,tall}.{webm,mp4,webp}
  (wide webm 1.13 MB / mp4 2.02 MB; tall = the film centred on ink, webm 0.53 MB). Muted autoplay, once per session, Skip, reduced motion skips.
  Source 01_AI_Tools/subverselab-studio/branding/teasers/JingFang_intro_b.mp4. If VITE_MEDIA_BASE is set at deploy, upload these to the media bucket.

## NEXT DEPLOY (prepared 28 Oct, 4) — news (TORNA out now, thanks for the family offer, tester frame), dividers, plus folds (local, NOT deployed)
- News: TORNA under BOE-B ("out now"), a thank-you for the family launch offer that says it has ended (owner's wording; the only place
  that names the family), tester frame image public/news/testers.webp from scripts/make-tester-news.py (OS_LIST x DAWS of the form, no counts).
- Dividers: .svl-divider / .svl-divider-top / .svl-divider-bottom (rule fading at both ends, gold waveform in the middle) on the news
  frames, the footer, article hr and section breaks, SEO section. Folds: every details/summary on the site opens with a gold "+" that
  turns into a cross (global rule in index.css; the account fold chevrons and the pack page's own +/− removed).
- Checked: eslint 0 errors, build OK, tests all green except the known Mirage/Kotoflux checkout cases (sample-packs 3, download 1).

## NEXT DEPLOY (prepared 28 Oct, redesign) — 1 Nov release: owner's visual overhaul, worked through page by page on localhost (local, NOT deployed, NOT committed)
- Owner 28 Oct: "bu deployda görünümde çok köklü değişiklikler yapacağız".
- /account "My plugins": owned plugins drawn as the /plugins cards (room-card: blurred card art, front panel, badge "Yours" /
  "Free · yours", name, kind + model), downloads, licence/updates note and manual links under each card (AccountPage.jsx MyPlugins,
  index.css .acct-room-*). Checked at desktop and 375 px (no horizontal scroll).
- Local preview as the owner (dev server only, never in a build): src/devPreview.js + vite.config.js svl-dev-preview.
  http://localhost:5181/?devpreview=1 on, ?devpreview=0 off. Saved API answers in .devdata/ (gitignored, dockerignored,
  gcloudignored; copied once from the owner's signed-in Chrome session). Non-GET API calls are not sent. Localhost Google
  sign-in goes by redirect under `npm run dev` (AuthModal.jsx); the live site keeps the popup.

## NEXT DEPLOY (prepared 28 Oct, 3) — 1 Nov: TORNA's room, card and manual; KUBBE lists its standalone app (local, NOT deployed, NOT committed; site + api)
- TORNA ($12, sold on its own like SEDA, keyless, launchId 'solo'): plugins.js TORNA entry (after SEDA), PRICES.torna 12, TRUST_LINE_TORNA,
  HERO_IMG / CARD_BG / SHOWCASE_SOLO_SLUGS / SOLO_PLUGINS += torna; CHECKOUT.torna NOT set, so the room and the prerendered page show
  "$12" with a disabled "Buy TORNA — $12 · Available shortly" button until the checkout URL is pasted. api/entitlements.js SOLO_SLUGS += torna
  (an active tester also gets it, as with SEDA / ELEK); api/stats.js STATIC_PATHS += /plugins/torna; sitemap += /plugins/torna and
  /plugins/torna/manual (test-split base 33 → 34); llms files regenerate from the data.
- Web manual src/data/manuals/torna.js (+ MANUALS) and public/plugins/torna/Torna_Manual.pdf (7 pages, 1,388,930 B, headless Chrome from
  subverselab-analog-eq/docs/manual/Torna_Manual.html, updated to 1.0.0 the same day). The hardware's maker and model are not named anywhere.
- Images public/plugins/torna/ from the plug-in's own snapshots (docs/ui/p2_*_2x.png): hero.webp 1400x527, card-bg.webp 800x301,
  panel-{default,preset,rev,eq-out,rear}.webp 1600x602, og.png 1200x630 (panel on #033832). If the deploy uses VITE_MEDIA_BASE, these
  files go to the media bucket with the rest (docs/SPLIT_CUTOVER.md).
- KUBBE: formats FORMATS_MAC_STANDALONE and the standalone trust line (make_mac_installer.sh: kubbe STANDALONE=1); its manual description says so.
- Deploy day: publish LS 1481039, CHECKOUT.torna = its checkout URL, LS_PRODUCT_SLUGS += 1481039:torna on the api, publish_download.sh torna mac/win.
- Checks 28 Oct: eslint 0 errors (2 old warnings); build OK (63 sitemap URLs); tests: all pass except the known sample-pack ones
  (test-sample-packs 3 fail, test-download 1 sweep fail: mirage / kotoflux have no checkout yet).

## NEXT DEPLOY (prepared 28 Oct, 2) — 1 Nov: sample pack SVL Kotoflux (East Asian loops on JING FANG) and TORNA (local, NOT deployed, NOT committed)
- Kotoflux: owner approved by ear 28 Oct ("kotuflux geldi iyi görünüyor bunu da sar"). 01_AI_Tools/subverselab-packs/out/SVL_Kotoflux.zip
  (594,026,860 B; 20 loops, 200 WAV, 180 MIDI; SHA256SUMS 0 failures). Site: PACK_SOURCES += kotoflux (surge_pack_eastasian),
  SAMPLE_PACK_LISTED.kotoflux = 2026-11-01, PACK_PRICES.kotoflux = 5, checkout NOT set. Cover: Flow art (temple courtyard, lantern, zither)
  + cover_compose. Importer: 11 packs; the nine live packs' snippet/peaks/scenes cmp-identical to dist, their original covers copied back.
  Lemon Squeezy: "SVL Kotoflux" 1481075 DRAFT ($5, Digital Goods or Services, keys off, receipt like Mirage).
- TORNA 1.0.0 ($12, owner 28 Oct): macOS pkg signed + notarised (01_AI_Tools/subverselab-analog-eq/release-dist/1.0.0/), Windows zip from
  CI run 40718097318 (release-dist/1.0.0/win/), Lemon Squeezy "TORNA" 1481039 DRAFT ($12, Software, keys off). Site page: see the entry above.
- Deploy day, for each of Mirage, Kotoflux, TORNA: publish the LS draft, copy the checkout UUID into the site, publish_download.sh,
  LS_PRODUCT_SLUGS += <id>:<slug> (mirage 1480722, kotoflux 1481075, torna 1481039), importer, lint, build, tests, deploy, live check.

## NEXT DEPLOY (prepared 28 Oct) — 1 Nov: sample pack SVL Mirage (Anatolian loops on JING FANG) (local, NOT deployed, NOT committed)
- Owner 28 Oct: "paketleyelim ... 1 kasımda deploy edilecek sürümü tasarlarken sample packi de ekleyelim".
- Pack: 01_AI_Tools/subverselab-packs/out/SVL_Mirage.zip (600,201,567 B; 20 loops, 200 WAV, 180 MIDI; SHA256SUMS 0 failures). Owner approved by ear 28 Oct ("dinledim ve paketle dedim zaten").
- Site (local): scripts/import-sample-packs.js PACK_SOURCES += mirage (work surge_pack_anatolian); api/entitlements.js SAMPLE_PACK_LISTED.mirage = 2026-11-01T00:00:00Z;
  src/data/samplePackPrices.js PACK_PRICES.mirage = 5 (B9 floor); PACK_CHECKOUT.mirage NOT set yet. Cover: Gemini (Flow, Nano Banana 2.1, 1:1 x4, 0 credits) art + tools/cover_compose.py.
- Importer incident 28 Oct: the 21 Oct pack clean-up had deleted out/<work>/Preview for the nine live packs, so the first importer run wrote
  samplePacks.js with Mirage only and removed public/sample-packs/<nine>. Rebuilt from dist/ (27 Oct build): out/<work>/Preview/SVL_<Name>_snippet.mp3
  + snippet_scenes.json + cover.jpg recreated from dist/sample-packs/<slug>/; re-import: 10 packs; snippet.mp3, peaks.json and scenes.json of all nine
  cmp-identical to dist; original cover files copied back from dist. Do not delete out/<work>/Preview or out/<work>/cover.* again.
- Lemon Squeezy: product "SVL Mirage" 1480722 created 28 Oct as DRAFT ($5 single payment, Digital Goods or Services, licence keys off, storefront on,
  confirmation + receipt "Go to your downloads" -> subverselab.com/account, receipt note like Palmglow). A draft has no checkout link.
- Deploy day steps, in order: (1) publish 1480722 in LS, copy its checkout UUID into PACK_CHECKOUT.mirage; (2) publish_download.sh mirage zip SVL_Mirage.zip 1.0.0;
  (3) LS_PRODUCT_SLUGS += 1480722:mirage on site + api; (4) re-run importer, eslint, build, every scripts/test-*.js; (5) deploy; (6) live check /sample-packs/mirage,
  checkout 200, manifest lists mirage.
- Tests now (28 Oct, before the checkout): test-sample-packs 16 cases, 5 fail, all from the missing checkout / not-yet-built sitemap and prerender
  (mirage not buyable, PACK_CHECKOUT.mirage, catalogue links, sitemap) plus entitlements deep-equal (sweep fixture lists nine packs) — to re-run after step 1.

## NEXT DEPLOY (prepared 28 Oct, store order) — every product list newest first by its latest release (local, NOT deployed, NOT committed; site only)
- Owner 28 Oct (root CLAUDE.md "Store order"): new plug-ins, sample packs and preset packs come first, ordered by release date; an updated version moves to the top by the same rule.
- `src/data/productDates.js` (new): `released` / `updated` per plug-in slug, sample pack slug and preset pack id, from the download bucket's upload times (Istanbul day) and the DEPLOYED entries here; TORNA, Mirage, Kotoflux 2026-11-01; ADALET has no date (last). `byLatestRelease(items, keyFn)`: newest of the two dates first, ties keep the old order.
  A new version: set `updated` the day publish_download.sh publishes it. A new product: add it the day it goes on sale (scripts/test-order.js fails otherwise).
- Used by: /plugins (CARDS; "All" and every filter group), `STORE_PLUGINS` (plugins.js) for llms.txt / llms-full.txt and the prerendered /plugins, the prerendered homepage plugin lists, `visiblePacks()` (packFacts.js: /sample-packs, "More sample packs", sweep list, prerender, llms, sitemap), `PRESET_PACK_LIST` (presetPacks.js: /preset-packs, prerender, llms), /account My plugins and My packs (order only).
- Result: /plugins TORNA, JING FANG, ELEK, SEDA, RU-8, KIYMA, KUBBE, KASET, KORO, YANKI, HAVA, MIHENK, TUTKAL, ALEV, TABAN, ADALET; /sample-packs Mirage, Kotoflux, then the nine 17 Oct packs in their old order; /preset-packs unchanged (all 17 Oct).
- Note: api/entitlements.js SAMPLE_PACK_LISTED / PRESET_PACK_LISTED say 16 Oct 00:00Z for six packs and the Drum Pack (the sweep cut-off); the store actually opened 17 Oct (00218-qul). Not changed (it decides sweep contents).
- Gate: eslint 0 errors (2 old warnings); build OK (82 routes + home, sitemap 63); new scripts/test-order.js 8/0; other tests as before (test-sample-packs 3 and test-download 1 Mirage/Kotoflux checkout failures only).

## NEXT DEPLOY (prepared 27 Oct) — admin Members you can search, with purchases and real "last seen"; simpler Stats and /account (local, NOT deployed, NOT committed; site + api)

Owner 27 Oct: "son giriş 26sında … leonidin girişi hiç görünmüyor, kullanıcılar arasından arama yapamıyorum, verileri okumak çok zor … account tarafında da … çorba".
- api/server.js `GET /api/admin/members`: adds `lastActiveAt` = Firebase Auth `lastRefreshTime` (lastSignInTime only moves on an
  explicit sign-in, which is why a member who stays signed in looked absent), and joins every member's orders from `plugin_licenses`;
  buyers who never made an account are listed too (`hasAccount: false`). api/stats.js: new pure `joinMembers()`; "active within
  1/7/30 days" in Stats now uses the same last-seen time.
- src/components/admin/MembersTab.jsx (new): one line of numbers, a search box (e-mail, name, product), filters Everyone / Paid /
  Free only / No account, sort by last seen / spent / joined, one row per person with what they bought and spent; click a row for dates.
  The old cards, the Google Analytics box and the launch-counter line are gone from this tab.
- StatsTab.jsx: four numbers (money in, free orders, visits, new accounts), "What sold" sorted by money, visits per day, top pages and
  referrers; per-day, downloads, Buy clicks and the buyer sentence moved under a closed "More detail".
- AdminPanel.jsx: tab labels shortened (Store items, Reports, SEO); dead member-stats code removed.
- AccountPage.jsx: no number strip at the top; order is My plugins, My packs, Inbox, Tool credits, Learn; licence keys sit in a closed
  "Licence keys" under the plugins (the plugins do not ask for them); "Bought without signing in?" and the credit cost list / activity
  are closed by default; the empty "web tools are launched from the storefront" panel is removed. index.css: unused .acct-summary rules removed.
- Checks 27 Oct: every scripts/test-*.js passes (test-stats 21/21 with a new joinMembers case), eslint 0 errors, build OK (65 routes).
  MembersTab rendered server-side with sample rows: last seen from lastActiveAt, product chips, a no-account buyer, total spent correct.
  NOT checked: the panel signed in as admin against live data (needs the owner's sign-in), /account in a browser.

## NEXT DEPLOY (prepared 26 Oct) — the homepage is the news; the tools move to /tools (local, NOT deployed, NOT committed; after 1 Nov or on the owner's go)
Owner 26 Oct: "ilk kısım artık kendi haber sayfamız" and then "yine witrin yapmışsın ve tools aynı sayfada; bunu subverselab yazısına
bağlarız ve anasayfa olur, haberleri okumak için aşağı doğru kaydırırız". A first version (a sideways news carousel above the tools)
was replaced the same day by this one.
- `/` = `src/components/HomePage.jsx` (new): HomeIntro + `NewsFeed.jsx` (new): one frame per news item, stacked, read by
  scrolling down; each frame's panel window slides in from its side the first time it is seen (IntersectionObserver; none with
  reduced motion). Frames from `src/data/news.js` (new), in the owner's order: BOE-B release date 19 November in a large type,
  JING FANG launch price and end date (the frame leaves on its own on 1 Dec), the tester programme. (The "SEDA joins the
  family" frame was removed 27 Oct.) CSS block "Homepage news feed" at the end of `src/index.css`.
- `/tools` = the tools page (Storefront.jsx, unchanged grid; own title/description `TOOLS` in siteMeta.js, h1 "Browser tools
  for music producers"). Navbar: the logo goes to `/`, the Tools tab to `/tools` (active on /tools*); navbar search sends to
  /tools; every "Back to Tools" / "Browse Tools" / "All tools" link goes to /tools.
- server.js: the `/tools` 301 to `/#online-tools` is gone; `dist/tools/index.html` is prerendered (own head, the tool list and
  the tools ItemList JSON-LD, moved from the homepage). The prerendered homepage carries the news instead of the tool list.
  Sitemap + /tools (35 base URLs).
- `public/plugins/boeb/news.webp` (new, 98 KB): the BOE-B panel (01_AI_Tools/subverselab-boeb/docs/ui/p3/front.png).
- ADALET is NOT added to the family (owner 26 Oct: the family is analog; a 70s analog EQ with its own character may take that
  place later — not announced until it is on sale).
- Tests: test-listen (/ = HomePage, /tools = Storefront, intro → news, Tools tab → /tools, prerendered home has news and no tool
  list, the frames' order, panels exist, no counts / "coming soon" / ADALET); test-pages (/tools is a page with its own title and
  canonical, no redirect; the built homepage has the news and no tool list); test-split (sitemap 35; news media through media()).
- Checks 26 Oct: build exit 0 (eslint 0 errors, 2 old warnings), prerender 65 routes plus the homepage; every scripts/test-*.js 0 fail (re-run after the SEDA/family change: 0 fail). Local dev
  5181 at 1440 px: "19 NOVEMBER" fits its column (470 px, no overflow), the frames slide in on scroll, /tools loads directly and
  from the Tools tab with its own title; at a narrow width the panel sits above the text.
- **REVERTED 27 Oct (owner: "websitedeki değişiklikleri geri al … pluginler uzun süre tekli olarak satılmalı; bir kampanya
  açarsak bunu marketlerde açarız"):** SEDA's move into the family and the $49 family price are undone, locally, site AND api:
  SEDA is a solo product again (SOLO_PLUGINS, SHOWCASE_SOLO_SLUGS, launchId 'solo'; api SOLO_SLUGS, out of ALL_SLUGS and
  LAUNCH2_SLUGS), FAMILY_LIST_PRICE / familyPrice are gone, FAMILY_PRICE = $19.99, the family stays the seven products it
  was sold as (singles total $115). Leonid Fedorov bought SEDA on 26 Oct 21:36 ($15) and owns the family: nothing changes for him.
- **New rule (owner 27 Oct): the family leaves the site when its offer ends (1 Nov 2026 00:00 TR).** `familyOnSale(now)` /
  `FAMILY_ON_SALE`: FamilyOffer renders nothing, plugin rooms drop "or the whole family" and show the single price, /account
  drops the family button and says "Each plugin on its own", /launch2 says the offer has ended and drops the family buy box,
  the prerendered /plugins text and llms.txt say each plugin is sold on its own. Owners keep their seven products (the
  entitlements do not change). The static HTML follows only after a build: **build and deploy on or after 1 Nov.**
  The Lemon Squeezy family product should be unpublished at the same moment (a store step, the owner's).
- Tests 27 Oct: every scripts/test-*.js 0 fail (family lists back to seven, SEDA solo, familyOnSale switch); lint 0 errors;
  build + prerender 65 routes plus the homepage.
- **BOE-B date is a promise:** signed + notarised installers and the owner's ear approval by 19 Nov (BOE-B is exempt from
  the freeze, CLAUDE.md).
- (The 26 Oct "$49 from 1 Nov" decision is withdrawn: owner 27 Oct, the family is not sold after the offer.)

Older entries (everything live by the 25 Oct deploy): `_legacy/status/RELEASE_QUEUE_history_to_2026-10-25.md`.

## PANEL (no deploy) 4 Nov 2026 night — news `ru8-update` (RU-8 first big update, 1 January; iOS with Apple), order 5, live ~23:22 TR; picture replaced 23:27 with the upgrade scene + type (ru8-upgrade.webp); 5 Nov 00:40 wording "our work with Apple continues" in picture and line
- Saved via catalog-cli + local API (Chrome not connected); picture in the media bucket catalog/news/ru8-update/. Details: subverselab-ru8/STATUS.md.

## NOTE 6 Nov 2026 (evening) — Rekkerd affiliate checked after the 00245-heb deploy (no deploy)
- Live: subverselab.com/?aff=qbnJo keeps `svl-aff` and every Buy key on /plugins carries `?aff=qbnJo` (family, TORNA, JING FANG, ELEK, SEDA, RU-8, KIYMA, KUBBE checked).
- Lemon Squeezy: affiliate #74517 Rekkerd Sounds Active, 0 clicks / 0 referrals; program: specific products ON, only the family enabled at 30 %, 30-day tracking, last referrer, min payout $10; default referral URL = subverselab.lemonsqueezy.com. Clicks from our site are not counted (no LS tracking script, by choice).
- New LS discount RKRDFAM8W3P "Rekkerd review copy - Ronnie (family)": 100 %, family only, 1 redemption, no expiry (Active).
- 19 SoundCloud links written to the live catalogue (local subverselab-api-dev, dev-preview key; the agent_key file is rejected live with 401): /api/catalog 19/19.
- LS default affiliate referral URL changed to subverselab.com/plugins (owner go). Reply SENT to Ronnie from labsubverse (owner "gönder"), Gmail id 1a1b0f6d0bb335e1: tracking, no click count from our site, 30 % / 30 days, promotion up to him, code RKRDFAM8W3P.
