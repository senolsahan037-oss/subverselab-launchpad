# The live catalogue: adding products and news from /admin (owner 2026-10-31)

New news items, plug-ins, sample packs and preset packs are added from **/admin → Catalogue**. They are kept in Firestore
(`catalog_news`, `catalog_plugins`, `catalog_sample_packs`, `catalog_preset_packs`), served by `GET /api/catalog` (cached
60 s) and laid over the hand-written data in `src/data/*` by the pages (`src/catalog/`). **No build, no deploy**: a saved
item is on the site within a minute. The prerendered HTML and the sitemap learn of it at the next build.

## What the panel does
- **News**: a new key is a new homepage frame, placed by *Order* (static frames are 10, 20, 30 …; 15 goes between the first
  two). An existing key (boeb, torna, jingfang, testers, elek, free-plugins, manuals, tool-credits, family-thanks) edits that
  frame: only the fields you fill in replace the code's; *Published* off hides it. *Show from / Hide from* schedule it.
  The editor shows the frame exactly as the homepage draws it.
- **Plug-ins and apps**: a new slug gets a room at `/plugins/<slug>` (the same PluginRoom template: panel picture, views,
  intro, sections, controls, buy / download, manual), a card on /plugins and a place in the store order. For a plug-in that
  is in the code, the live item sets price, checkout, launch price, release dates and MuseHub link only; the room stays as
  written in `plugins.js`.
- **Sample packs**: a new slug is a pack at `/sample-packs/<slug>` (cover, kind line, made line, summary, "what's inside"
  lines, preview audio, price, buy). It is in the store from *On sale from* (also the sweep cut-off, `SAMPLE_PACK_LISTED`
  rule: never moved later). For a pack the importer knows, the live item sets words, cover, preview, price, checkout, dates
  or hides it. Measured facts still come only from the importer.
- **Preset packs**: the same for /preset-packs; *Free for members* makes it a member download (no checkout).
- **Publishers** (owner 31 Oct): producers, labels and studios whose products the site sells. A product's *Publisher* field
  points at a publisher id; the card, the pack page and the plug-in room print "by <name>" with the link. The e-mail is
  private (never in `GET /api/catalog`). *Ended* keeps the credit on existing products.
- **Agents**: admin agent keys (`svla_…`, shown once, hash kept in `catalog_agents`). A key lets a Claude agent or a script
  use every `/api/admin/catalog/*` route and the tester admin routes (`/api/admin/testers`, `/decide`, `/invite`) without a
  Google sign-in; making and revoking keys stays with a signed-in admin. Tool: `scripts/catalog-cli.js` (see below).
- **Testers** (Admin → Testers): applications are approved, ended or revoked as before; *Invite a tester* takes someone on
  without an application (same seat cap, same agreement record). Agents: `catalog-cli.js testers invite …`.
- **Preview waveform**: uploading a sample pack's preview mp3 in the panel also writes its `peaks.json` (800 points) and
  fills *Preview waveform*; *Preview scenes* (`seconds name` lines) become the markers under the waveform. The store card
  (record in a sleeve, disc turns while playing) and the pack page then look exactly like the importer's packs.
- **Files**: the installer or zip that is sold. It goes into the private downloads bucket under `plugins/<slug>/<version>/`
  and into `plugins/manifest.json`, exactly as `publish_download.sh` writes it. The Download button turns on within a minute.
  Pictures, audio and PDFs upload from the forms into the Firebase bucket (`catalog/<kind>/<slug>/…`, public URL).
  When an item is saved with a new picture, preview or PDF, or deleted, the file it no longer uses is deleted from the bucket,
  unless another item still points at it (owner 5 Nov 2026). Uploads that were never saved into an item stay.
- **Without a deploy, for crawlers and link previews** (5 Nov 2026): a catalogue-only pack or plug-in page gets its own title,
  description, canonical, picture and Product JSON-LD from the site server, and `/sitemap.xml` lists it; a prerendered pack or
  plug-in page shows the panel's picture in its link preview. The page body still paints in the browser.
- **SoundCloud track** (sample packs): the demo's soundcloud.com link; the /sample-packs playlist plays these in the store
  order and the pack page links to it (`docs/PACK_DELIVERY.md` §3.4).

## Videos and edits of a room already in the code (2 Nov 2026, live with the 1 Dec deploy)
- **Videos:** every plug-in item has a *Videos* list: a YouTube link (watch, youtu.be or shorts) and a caption per row. They
  show first under "Hear it" in the room; a /shorts/ link plays upright.
- **Editing a plug-in that is in the site code** (TORNA, KUBBE …): *New plug-in*, the same slug, *Edits a product already on
  the site* = Yes, then fill in only what changes (a video, a new intro, a picture). Empty fields keep the room's own text;
  Name, Kind and Tagline are not required. Turning *Published* off takes the edit away again.

- **Changing only the cover / words of a pack already in the code** (owner 4 Nov 2026, 15 packs): *New sample pack* with the same
  slug, its own name and kind line, the new cover, *On sale from* = its original listing date, and **Released / Updated emptied**:
  the form pre-fills today, and a date here re-sorts the store (newest first) as if the pack were released today.

## What a new product needs (checklist)
1. Lemon Squeezy: create and publish the product; copy the **checkout URL** and the **product id** into the item. The id
   replaces an `LS_PRODUCT_SLUGS` entry: the webhook maps a paid order to the slug through the catalogue.
2. The item: slug, name, kind, pictures, words, price, dates, *Published* on.
3. Files: upload the zip / installers under the same slug with the version. A new version later: upload it and set
   *Updated* on the item; the product moves to the top of the store.
4. Check: the room or pack page, the Buy button, `/api/download/manifest` lists the slug, a test download from /account
   after a real or test order.

## For agents: `scripts/catalog-cli.js`
```
SVL_AGENT_KEY=svla_…  node scripts/catalog-cli.js schema | list <kind> | get <kind> <id> | save <kind> item.json | set <kind> <id> key=value …
                      | hide|show|delete <kind> <id> | media <image|audio|pdf|json> <kind> <slug> <file> | peaks <mp3> <slug>
                      | file <slug> <version> <mac|win|zip> <file> | unfile <slug> [platform] | manifest
                      | testers list | testers invite <email> <os> <agreementVersion> <acceptedAtISO> [daws=a,b] [production=…] | testers decide <email> <decision> …
```
`SVL_API=http://127.0.0.1:8790 SVL_AGENT_KEY=dev-preview` against the local API (preview config `subverselab-api-dev`).
The API validates every item against `api/catalogSchema.js` (`GET /api/catalog/schema` lists the fields) and names the
problems; the rules below and `docs/PACK_DELIVERY.md` are the agent's to keep. Nothing an agent saves needs a deploy.

## Rules that still apply
- Price floor (root CLAUDE.md): never below any earlier price. Sample packs $5, sweep $25 are permanent floors.
- Public copy: no product counts, no "coming soon", no "AI", ASCII product names, no brand prefix in plug-in names.
- A slug the code already knows is never re-registered: the hand-written lists (`api/entitlements.js`) win for it.
- Delivery of packs, step by step and for good: `docs/PACK_DELIVERY.md`.
- Local work: preview configs `subverselab-api-dev` (local API on 127.0.0.1:8790, `SVL_DEV_ADMIN=1`: accepts the local
  preview token for the catalogue routes only, never on Cloud Run) and `subverselab-site-dev-local` (dev server with
  `SVL_DEV_API`); open `http://localhost:5181/admin?devpreview=1`. Writes from the local panel go to the real Firestore and
  buckets (the live site does not read `catalog_*` until the deploy that ships this).
- On this Mac the API cannot sign bucket URLs (user credentials), so uploads go through the API itself (`PUT
  /api/admin/catalog/media`, `PUT /api/admin/catalog/file/direct`); on Cloud Run a sold file first tries a signed URL.
  Cloud Run accepts up to 32 MB in one request; a bigger installer needs the signed path (or `publish_download.sh`).

## Where things are
- API: `api/catalog.js` (service), `api/catalogSchema.js` (fields, validation; shared with the panel), routes in
  `api/server.js` (`/api/catalog`, `/api/catalog/slugs`, `/api/admin/catalog/*`), `registerCatalogProducts` in
  `api/entitlements.js` (new slugs join the live lists in place).
- Site: `src/catalog/catalog.js` (fetch + hook), `merge.js` (pure merges), `data.js` (prices, checkouts, dates into the data
  objects), `shapes.js` (document → page object); `src/components/admin/CatalogTab.jsx`, `CatalogEditor.jsx`,
  `catalogApi.js`; `src/components/CatalogPluginRoom.jsx`; `server.js` answers `/plugins/<slug>` and
  `/sample-packs/<slug>` for catalogue-only slugs (asks `/api/catalog/slugs`).
- Agent keys: `api/agents.js`; CLI `scripts/catalog-cli.js`; waveform `scripts/pack-peaks.js`.
- Tests: `node scripts/test-catalog.js` (schema, registration, service with a fake Firestore and bucket, merges, publishers,
  agent keys) and the invite / agent-key cases in `scripts/test-testers.js`.

## A local copy of the panel: `scripts/catalog-pull.js` (12 Nov 2026)
`node scripts/catalog-pull.js` writes the live items and their media to `catalog-snapshot/` (never built, never deployed); `--check`
only reports. Run it after a panel change so the tree and git hold what the panel holds. To put an item back:
`node scripts/catalog-cli.js save <kind> catalog-snapshot/<kind>/<id>.json` (media: `catalog-cli.js media …`).

## Live edit: changing a product room where it stands (12 Nov 2026; on the site after the next site deploy)
Signed in as an admin, every room that is in the site code (`/plugins/<slug>`) shows a bar under the header: **Edit this room**.
While it is on, every outlined text can be typed into in place: tagline, formats line, intro, each section's heading and text,
each control's name and description, the controls note, and the name and line of the panel view that is showing. Sections and
controls can be added and removed; **Replace picture** on the panel uploads a new picture for the view that is showing.
**Save, no deploy** writes the room's live item (`catalog_plugins/<slug>`, `edits: true`) through `POST /api/admin/catalog/plugins`,
the same route the Catalogue panel uses: visitors see it within a minute. **Discard** drops the unsaved changes, **Done** closes
the editor. Code: `src/liveEdit/liveEdit.jsx`, wired in `CatalogPluginRoom.jsx` (`LivePluginRoom`) and `PluginRoom.jsx`; panel
views of an edit item are laid over the room's own views in order (`overlayPlugin` in `src/catalog/shapes.js`).
- A field nobody edited keeps the code's value. Emptying a field does not remove it (the code's text comes back); to take an
  edit away, turn the item's *Published* off in /admin → Catalogue, or delete the item.
- Not editable in place yet: the rooms that open with the listen player (its button texts and audio are `src/data/listen.js`),
  the panel tour, prices (panel: price fields), the web manuals. Rooms added from the panel are edited in the panel.
- Run `node scripts/catalog-pull.js` after a session of edits, so the tree and git hold what the site shows.
- The prerendered HTML (what a crawler reads before the script runs) keeps the code's text until the next build.
