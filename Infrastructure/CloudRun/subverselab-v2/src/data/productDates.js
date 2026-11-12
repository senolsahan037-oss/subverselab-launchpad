// Release dates of every product the store lists: plug-ins and apps, sample packs, preset packs. ONE source for the store
// order (root CLAUDE.md "Store order", owner 2026-10-28): every list of plug-ins, sample packs and preset packs is ordered
// newest first by the product's latest release, where a new version counts as a release.
//
// Shared by the React pages and scripts/ (plain Node, no imports), like siteMeta.js.
//
// Shape: <id>: { released, updated }, ISO 'YYYY-MM-DD', Istanbul calendar day (UTC+3).
//   released = the first day the product was on sale / downloadable on subverselab.com.
//   updated  = the day its CURRENT version went live (= released while it is still on its first version).
// Ids are the plug-in slug (plugins.js), the sample pack slug (samplePacks.js) or the preset pack id (presetPacks.js).
//
// Where the dates come from (read 2026-10-28):
// - Object upload times in gs://subverselab-downloads/plugins/<slug>/<version>/ (`gsutil ls -l -r`), converted to Istanbul
//   time: the first version's upload is `released` unless the site went live later, the current version's upload is
//   `updated`. Current versions = the live manifest (gs://subverselab-downloads/plugins/manifest.json, copy in
//   .devdata/download_manifest.json).
// - The day the site started selling it, from RELEASE_QUEUE.md DEPLOYED entries: KUBBE + KASET 1 Oct (plugins.js RELEASE_AT;
//   their 1.0.2 files were uploaded 30 Sep), launch 2 on 5 Oct, TABAN + ALEV 8 Oct (commit fc2a153), ELEK 12 Oct (00208),
//   KIYMA 14 Oct (00212), RU-8 and the whole pack store 17 Oct (00218-qul / 00220-faj; files uploaded 17 Oct 02:49-06:30 TR),
//   JING FANG + SEDA 19 Oct (00223-jax).
//   api/entitlements.js SAMPLE_PACK_LISTED / PRESET_PACK_LISTED carry 16 Oct 00:00Z for six packs and the Drum Pack: that is the
//   sweep cut-off set before the store went live, not the day it was on sale; the store opened with all nine packs on 17 Oct.
// - Going out with the 1 Nov release, not live yet: TORNA, SVL Mirage, SVL Kotoflux (SAMPLE_PACK_LISTED 2026-11-01).
// - ADALET goes on sale with the next deploy (owner 8 Nov 2026, $15): 1.0.0, dated the day it was signed; set both to the deploy day.
//
// How to update:
// - A new version: set `updated` to the day it is published (subverselab-plugin-common/tools/publish_download.sh). The product
//   then moves to the top of every list by itself. A product's `released` never changes.
// - A new product or pack: add it here the day it goes on sale (scripts/test-order.js fails while a listed product has no date).
export const PRODUCT_DATES = {
  // Plug-ins and apps
  adalet: { released: '2026-11-08', updated: '2026-11-08' },     // 1.0.0, owner 8 Nov "15 dolar yazalım"; set to the deploy day
  kubbe: { released: '2026-10-01', updated: '2026-10-12' },      // 1.0.2 up 30 Sep, on sale 1 Oct; 1.1.0 up 12 Oct 23:20 TR
  kaset: { released: '2026-10-01', updated: '2026-10-12' },      // 1.0.2 up 30 Sep, on sale 1 Oct; 1.1.0 up 12 Oct 23:20 TR
  koro: { released: '2026-10-05', updated: '2026-10-12' },       // 1.0.0 up 5 Oct 04:55 TR; 1.0.1 up 12 Oct 23:07 TR
  yanki: { released: '2026-10-05', updated: '2026-10-12' },      // 1.0.0 5 Oct; 1.0.1 12 Oct 23:08 TR
  hava: { released: '2026-10-05', updated: '2026-10-12' },       // 1.0.0 5 Oct; 1.0.1 12 Oct 23:08 TR
  mihenk: { released: '2026-10-05', updated: '2026-10-12' },     // 1.0.0 5 Oct; 1.0.2 12 Oct 23:09 TR
  tutkal: { released: '2026-10-05', updated: '2026-10-12' },     // 1.0.0 5 Oct; 1.0.3 12 Oct 18:42 TR
  taban: { released: '2026-10-08', updated: '2026-10-08' },      // 1.0.0 up 8 Oct 15:16 TR
  alev: { released: '2026-10-08', updated: '2026-10-12' },       // 1.0.0 8 Oct; 1.0.1 12 Oct 23:10 TR
  elek: { released: '2026-10-12', updated: '2026-10-22' },       // 1.0.0 12 Oct (site 00208); 1.0.3 up 22 Oct 20:40 TR
  kiyma: { released: '2026-10-14', updated: '2026-10-14' },      // 1.0.0 up 14 Oct 15:01 TR (site 00212)
  ru8: { released: '2026-10-17', updated: '2026-11-08' },        // 1.0.0 17 Oct; 1.1.0 with the next deploy: SET updated TO THE DEPLOY DAY
  jingfang: { released: '2026-10-19', updated: '2026-11-08' },   // 1.0.0 19 Oct; 1.2.0 27 Oct; 1.4.0 with the next deploy: SET updated TO THE DEPLOY DAY
  seda: { released: '2026-10-19', updated: '2026-10-19' },       // 1.0.0 up 19 Oct 18:42 TR (site 00223-jax)
  torna: { released: '2026-11-01', updated: '2026-11-01' },      // 1 Nov release (not live yet)
  // AHENK: switched on locally 8 Nov 2026 (lead). The date is the day it goes on sale (Istanbul): if the deploy is on another day,
  // change both to the deploy day before building (RELEASE_QUEUE "AHENK product room").
  ahenk: { released: '2026-11-08', updated: '2026-11-08' },
  // Sample packs (all 1.0.0, uploaded 17 Oct 06:16-06:30 TR, store live 17 Oct)
  brickyard: { released: '2026-10-17', updated: '2026-10-17' },
  kerbstone: { released: '2026-10-17', updated: '2026-10-17' },
  stepwell: { released: '2026-10-17', updated: '2026-10-17' },
  lampglass: { released: '2026-10-17', updated: '2026-10-17' },
  slagworks: { released: '2026-10-17', updated: '2026-10-17' },
  squall: { released: '2026-10-17', updated: '2026-10-17' },
  lowlight: { released: '2026-10-17', updated: '2026-10-17' },
  ironmere: { released: '2026-10-17', updated: '2026-10-17' },
  palmglow: { released: '2026-10-17', updated: '2026-10-17' },
  mirage: { released: '2026-11-01', updated: '2026-11-01' },     // 1 Nov release (SAMPLE_PACK_LISTED)
  kotoflux: { released: '2026-11-01', updated: '2026-11-01' },   // 1 Nov release (SAMPLE_PACK_LISTED)
  saffron: { released: '2026-11-01', updated: '2026-11-01' },   // 1 Nov release (SAMPLE_PACK_LISTED)
  solstice: { released: '2026-11-01', updated: '2026-11-01' },   // 1 Nov release (SAMPLE_PACK_LISTED)
  velvetroom: { released: '2026-11-01', updated: '2026-11-01' },   // 1 Nov release (SAMPLE_PACK_LISTED)
  nightgrid: { released: '2026-11-01', updated: '2026-11-01' },   // 1 Nov release (SAMPLE_PACK_LISTED)
  // Preset packs (all 1.0.0, uploaded 17 Oct 03:43-03:45 TR, live 17 Oct)
  'ru8-drum-pack': { released: '2026-10-17', updated: '2026-10-17' },
  'racks-drums': { released: '2026-10-17', updated: '2026-10-17' },
  'racks-bass': { released: '2026-10-17', updated: '2026-10-17' },
  'racks-vocals': { released: '2026-10-17', updated: '2026-10-17' },
  'racks-instruments': { released: '2026-10-17', updated: '2026-10-17' },
  'racks-bus': { released: '2026-10-17', updated: '2026-10-17' },
  'racks-fx': { released: '2026-10-17', updated: '2026-10-17' },
};

// The later of released / updated ('' when the product has no date: it sorts last).
export const latestRelease = (id) => {
  const d = PRODUCT_DATES[id];
  if (!d) return '';
  return (d.updated || '') > (d.released || '') ? d.updated : (d.released || '');
};

// Newest first by latestRelease(keyFn(item)); equal dates (and undated items, which go last) keep their current order.
export function byLatestRelease(items, keyFn = (x) => x) {
  return (items || [])
    .map((item, i) => ({ item, i, d: latestRelease(keyFn(item)) }))
    .sort((a, b) => (a.d === b.d ? a.i - b.i : a.d < b.d ? 1 : -1))
    .map((x) => x.item);
}
