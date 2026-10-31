# subverselab.com — release queue

Deploy rule (rewritten 2026-10-14, replaces the 2026-10-03 "one deploy when the counter hits 1,000" rule; the counter was
reached 4 Oct and deploys 00193–00213 followed): every site change is made LOCALLY in this tree, tested (lint, build, every
`scripts/test-*.js`) and listed under NEXT DEPLOY. A deploy happens only on the owner's explicit go in chat; related changes
are batched into it. Release freeze (owner 2026-10-13): no site releases until the family campaign ends on 1 Nov 2026,
except a live outage, a security hole, or an explicit owner go for that deploy.

Live now (1 Nov ~00:55 TR, owner "subverselabin son kontrollerini yapıp deploy edelim"): `subverselab-site-00233-yik` + `subverselab-api-00012-ziv` (see the DEPLOYED 1 Nov entry). Rollback: traffic to `subverselab-site-00230-cuq` and `subverselab-api-00010-kop` (and `LS_PRODUCT_SLUGS` back to the old value only if the new products must go too). Before (25 Oct ~22:45 TR): `subverselab-site-00230-cuq` + `subverselab-api-00010-kop`. Rollback then: traffic to `subverselab-site-00228-bir` and `subverselab-api-00008-dih`. Before: (22 Oct ~20:30 TR): `subverselab-site-00228-bir` + `subverselab-api-00008-dih` (see the DEPLOYED 22 Oct entry). Before (20 Oct ~17:55 TR, owner "deploy et"): `subverselab-site-00225-yop` + `subverselab-api-00006-her` (manuals JING FANG / RU-8 / ADALET, expanded rooms, buy-click counter, /account licence sentence, search titles, Merchant Center availability, JING FANG room FACTS text; env unchanged; Firestore rules NOT released). Rollback: traffic to `subverselab-site-00223-jax` and `subverselab-api-00004-rut`. Before that: (19 Oct ~20:40, owner "Deploy et: önce API, sonra site; etiketli sürümü kontrol et, sonra trafiği aç. Firestore kuralları hariç"): `subverselab-site-00223-jax` + `subverselab-api-00004-rut` (JING FANG + SEDA on sale, LS_PRODUCT_SLUGS += 1453169:jingfang,1453230:seda on both; everything listed under DEPLOY READY below shipped; Firestore rules NOT released). 00222-waf was the first site tag (prerender still wrote the old key line on solo rooms), never took traffic. Rollback: traffic to `subverselab-site-00220-faj` and `subverselab-api-00002-kuc`. Before: `subverselab-site-00220-faj` (pages + RU-8 opening, proxies /api; before it 00218-qul) + `subverselab-api-00002-kuc` (every /api route; 18 Oct parked-credit claim; rollback: traffic to `subverselab-api-00001-5xh`). Rollback: traffic to `subverselab-site-00215-pux` (the old single service, serves /api itself). Older revision history follows.

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
