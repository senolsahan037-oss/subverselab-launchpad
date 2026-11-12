# Pack delivery: the permanent rules (owner 2026-10-31)

How a sample pack or preset pack gets from a finished zip to a buyer's download, whoever adds it (the owner in /admin, an
agent with `scripts/catalog-cli.js`, or the importer for the packs that live in the code). These rules do not change per
pack; anything older that says otherwise (plans, STATUS logs, old task files) is history.

## 1. What a pack is on the site
- One zip, sold at one price, downloaded from the buyer's Account page through a download ticket (`launchId 'pack'`,
  platform `zip`). No licence key, no activation, no per-file downloads.
- One preview per pack: a 45–60 s montage made only from the pack's own files (`<Name>_snippet.mp3`, ~-16 LUFS, TP ≤ -1 dBTP,
  MP3 192k), its waveform (`peaks.json`, 800 points) and its scene markers. The store card is a record in a sleeve: the disc
  rises on hover and turns while the preview plays; the pack page draws the waveform with a gold needle. No free taster, no
  separate demo files (packs project KNOWLEDGE B1–B2).
- Public copy: no product counts, no "coming soon", no "AI"; prices never below an earlier price of that pack (floor: sample
  packs $5, the sample-pack sweep $25, the RU-8 Drum Pack $10).
- Store order: newest first by the later of *Released* and *Updated*; a new version is a release.

## 2. Where the pieces live
| Piece | Place | Written by |
|---|---|---|
| The sold zip | `gs://subverselab-downloads/plugins/<slug>/<version>/<file>.zip` (private) | Files panel, `catalog-cli.js file`, or `publish_download.sh <slug> zip <file> <version>` |
| The manifest | `gs://subverselab-downloads/plugins/manifest.json` → `GET /api/download/manifest` | the same three tools; the Download key turns on within a minute |
| Cover, preview mp3, peaks JSON | importer packs: `public/sample-packs/<slug>/` (cover.jpg/.webp, snippet.mp3, peaks.json, scenes.json); catalogue packs: the Firebase bucket `catalog/samplePacks/<slug>/…` (public token URL) | importer / the panel upload / `catalog-cli.js media` |
| Words, price, checkout, dates, publisher | importer packs: `src/data/samplePacks.js` (generated), `samplePackPrices.js`, `productDates.js`, `packMadeLines.js`; catalogue packs and edits: Firestore `catalog_sample_packs` / `catalog_preset_packs` | importer / the panel / the CLI |
| Who may download | `api/entitlements.js`: a paid order for the pack's Lemon Squeezy product, a sweep bought on or after the pack's listing moment, or (preset packs marked free) any signed-in deliverable account | the webhook; catalogue slugs register themselves at request time |
| The order → slug map | `LS_PRODUCT_SLUGS` (code) or the item's *Lemon Squeezy product id* (catalogue) | Lemon Squeezy dashboard → the item |

## 3. Adding a pack without a deploy (catalogue path)
1. Lemon Squeezy: create and publish the product (price at or above the floor); copy the **product id** and the **checkout URL**.
2. `/admin → Catalogue → Sample packs → New` (or `catalog-cli.js save samplePacks pack.json`): slug, name, full name (`SVL <Name>`),
   kind line, made line (one honest sentence), summary, *What's inside* (counts, format, size read from the zip), cover
   (square, ≥1200 px), preview mp3 (the panel writes the waveform file by itself; from a terminal `catalog-cli.js peaks
   <mp3> <slug>` and paste the URL), scenes (`seconds name` per line), publisher (if not SubverseLab), price, checkout,
   product id, *On sale from* (ISO moment; this is also the sweep cut-off and is never moved later), Released, Published on.
3. Files: upload the zip under the same slug with its version (`catalog-cli.js file <slug> <version> zip <file>`).
4. SoundCloud (owner 5 Nov 2026): upload the same preview mp3 with the cover at soundcloud.com/upload (account
   soundcloud.com/subverselab; title `SVL <Name> (Demo)`, genre, description "Demo of the SVL <Name> sample pack. <Kind line>.
   Get the pack: <page>", Buy link = the pack page, downloads off; the "continue without a paid plan" answer to the upsell), then
   paste the track link into the pack's *SoundCloud track* field. The /sample-packs playlist picks it up in the store order;
   nothing on SoundCloud needs reordering. (The SoundCloud set "SubverseLab Sample Packs" is a side copy: add the track at its top.)
5. Check within a minute: the card on /sample-packs (sleeve, disc, play), the pack in the playlist under the grid,
   `/sample-packs/<slug>` (waveform, price, Buy key, "Also on SoundCloud"), its page title and link picture (view source or a
   link preview), `/sitemap.xml` lists it, `GET /api/download/manifest` lists the slug, a test order downloads from /account.
6. A new version later: upload the new zip with the new version, set *Updated*; the pack moves to the top of the store.

## 4. The importer path (packs that live in the code)
`node scripts/import-sample-packs.js` reads `01_AI_Tools/subverselab-packs/out/<work>/SVL_<Name>.zip` and `Preview/` (snippet
+ `snippet_scenes.json`), measures the zip and writes `src/data/samplePacks.js` and `public/sample-packs/<slug>/`. A pack
counts only when both its zip and its snippet exist. Never delete `out/<work>/Preview` or `cover.*`; after an import copy the
live packs' original covers back from `dist/sample-packs/<slug>/`. The importer path needs a build and a deploy; the
catalogue path does not. Measured facts (counts, keys, BPM, sizes) come only from the importer or the zip itself.

## 5. Sweeps
`SAMPLE_PACK_LISTED` (code) plus the catalogue packs' *On sale from* decide what a sweep opens: every sample pack listed on or
before the moment the sweep was bought. A pack listed later is not part of an earlier sweep. A listing moment is never moved
earlier or later once the pack is on sale.

## 6. Publishers (producers, labels, studios)
A pack made by someone else points at an entry in `/admin → Catalogue → Publishers` (id, name, link, private e-mail). The
pages print "by <name>" on the card, the pack page and a plug-in's room. Payouts and terms are handled outside the site; the
publisher record is the public credit and our contact, nothing more. An ended publisher keeps the credit on existing packs.

## 7. What never happens
- No manual licence keys, no "download link by e-mail", no file sent outside the ticket route.
- No pack deleted from the bucket while an order for it exists: hide the item or take the manifest entry out; buyers keep
  their download on /account.
- No pack sold without its preview and cover, and no preview that uses sounds not in the pack.
