// Audio plugins: things a visitor installs in their own DAW.
//
// Shared by the React pages and scripts/prerender.js (plain Node, no bundler),
// the same pattern as siteMeta.js and faqContent.js, so the crawler and the
// visitor read the same words.
//
// These are pages, not synced products (Rules/02 §"Not everything published is
// a product"): nothing here is written to `products/` and the files are not
// served from this site. The sale and the licence key come from Lemon Squeezy,
// the installers from a public bucket (see DOWNLOADS_MANIFEST); the site links
// to the checkout and the files and, for a signed-in buyer, mirrors what the
// Lemon Squeezy webhook recorded (server.js → Firestore `plugin_licenses`).
//
// Every statement below is taken from the plugins' own repositories
// (01_AI_Tools/subverselab-reverb, 01_AI_Tools/subverselab-kaset) or from the
// launch announcement. Nothing is counted here: the only number of launch
// licences the site ever shows comes live from GET /api/launch/codes, which
// reads the one Firestore counter every claim increments (server.js →
// launchLicence.js) — and when that cannot be read, the page shows no number.

import { apiUrl, media } from '../utils/endpoints.js';
import { byLatestRelease } from './productDates.js';

// 2026-10-01 00:00 in Istanbul (UTC+3, no daylight saving).
export const RELEASE_AT = '2026-09-30T21:00:00Z';

// RU-8 (owner 16 Oct): ONE switch opens its sales. null = RU-8 is not on the site at all (owner 17 Oct: no "Coming soon";
// it appears only finished and on sale: macOS and Windows together, iPhone/iPad later at the same price).
// Paste the Lemon Squeezy checkout URL (https://subverselab.lemonsqueezy.com/checkout/buy/<uuid>, no discount code) and the
// room, /plugins, the homepage showcase and /account all switch to the sold product (solo, like ELEK). Server: "<id>:ru8" in
// LS_PRODUCT_SLUGS (api/entitlements.js SOLO_SLUGS already lists ru8) and the installers published with publish_download.sh.
export const RU8_CHECKOUT = 'https://subverselab.lemonsqueezy.com/checkout/buy/9a8d6cce-8105-4b0c-89ad-5290a6027068';   // LS product 1446488 (RU-8, $25, no licence keys), created 17 Oct
export const RU8_ON_SALE = Boolean(RU8_CHECKOUT);

// JING FANG (owner 19 Oct: "$60, kampanya yok"; "jing fang için ürün sayfasını hazırla ve jing fangi vitrine ekle"). The same ONE
// switch as RU-8: '' = JING FANG is not on the site at all (no page, no showcase slide, no list entry; a product appears when it is
// on sale). Paste the Lemon Squeezy checkout URL (no discount code, no licence keys) and the page /plugins/jingfang, the homepage
// showcase, /plugins, /account and the sitemap switch on together. Server: "<id>:jingfang" in LS_PRODUCT_SLUGS (api/entitlements.js
// SOLO_SLUGS lists jingfang) and the installers published with publish_download.sh jingfang mac|win.
// Lemon Squeezy (as ELEK): product at $150, a discount of $90 off JING FANG only that ends 30 Nov 2026 21:00 UTC (= 1 Dec 00:00
// Istanbul, the moment of LAUNCH_ENDS.jingfang); (20 Oct: no code in the link any more; the LS price carries the launch price, see JINGFANG_CHECKOUT).
export const JINGFANG_CHECKOUT = 'https://subverselab.lemonsqueezy.com/checkout/buy/2f6933ca-a554-4ecf-858d-246ce0852022';   // LS product 1453169. Owner 20 Oct: the checkout showed $150 at the top; the LS price itself is now $60 (launch) and the JINGFANGLAUNCH code is off. On 1 Dec 2026 set the LS price back to $150 (no deploy needed).
// Local preview (owner 19 Oct: "değişiklikleri localhostta göremiyorum"): under `npm run dev` only (Vite sets import.meta.env.DEV),
// JING FANG shows as if on sale, with a disabled buy button ("Available shortly", no checkout). `npm run build`, prerender, the
// tests and the live site never see it: there import.meta.env.DEV is false or absent. scripts/prerender.js also removes
// dist/plugins/jingfang/ while it is not on sale, so its images never ship early.
const JINGFANG_DEV_PREVIEW = typeof import.meta !== 'undefined' && Boolean(import.meta.env) && import.meta.env.DEV === true;
export const JINGFANG_ON_SALE = Boolean(JINGFANG_CHECKOUT) || JINGFANG_DEV_PREVIEW;

// AHENK (piano instrument; prepared 7 Nov 2026, switched off). The same ONE switch as JING FANG: '' = AHENK is not on the site at
// all (no page, no showcase line, no list entry, not in the sitemap or llms.txt; scripts/prerender.js skips it and removes
// dist/plugins/ahenk/, so its images do not ship). Under `npm run dev` only it shows as on sale with a disabled "Available shortly"
// button (the JING FANG dev preview). At launch, in order (RELEASE_QUEUE "AHENK product room (switched off)"): create the Lemon
// Squeezy product (no licence keys, no discount code in the link), paste its checkout URL here, "<id>:ahenk" in LS_PRODUCT_SLUGS and
// ahenk from UNLISTED_SLUGS to SOLO_SLUGS (api/entitlements.js), publish the installers, add its date to productDates.js.
// AHENK has its own look (root CLAUDE.md, owner 6 Nov): its own app pictures only (public/plugins/ahenk/), no family visuals.
export const AHENK_CHECKOUT = 'https://subverselab.lemonsqueezy.com/checkout/buy/c37f6acf-46d9-4032-94a4-32eb1ecaad83';   // LS product 1508843, $29.99 launch price (8 Nov 2026, lead; deploy on the owner's go)
export const AHENK_ON_SALE = Boolean(AHENK_CHECKOUT) || JINGFANG_DEV_PREVIEW;

// ADALET (owner 8 Nov 2026: "15 dolar yazalım"): sold on its own like SEDA, no licence key. Lemon Squeezy product 1509139, $15,
// licence keys off, "Display on storefront" off (only this link sells it). '' = back to "Coming soon" (no price, no checkout).
// Deploy day (RELEASE_QUEUE "ADALET ON SALE"): "1509139:adalet" in LS_PRODUCT_SLUGS first, then publish_download.sh adalet mac|win.
export const ADALET_CHECKOUT = 'https://subverselab.lemonsqueezy.com/checkout/buy/53315f7c-95f5-4dcc-a2b0-2fa21131400d';
export const ADALET_ON_SALE = Boolean(ADALET_CHECKOUT);

// Lemon Squeezy checkout links. Empty until the products are created in Lemon
// Squeezy; while a link is empty its buy button renders disabled and says
// "Available shortly". Paste the checkout URL here — nothing else changes.
export const CHECKOUT = {
  // Lemon Squeezy store SubverseLab (#486764), products created 1 Oct 2026:
  // KUBBE 1402269, KASET 1402277 (the old $15 KUBBE + KASET bundle, 1402289, is
  // no longer offered anywhere on the site; orders already placed keep working
  // on the server: entitlements.js, LS_PRODUCT_SLUGS "...:bundle").
  kubbe: 'https://subverselab.lemonsqueezy.com/checkout/buy/89095abf-a0cf-4fab-9eba-c6b9b9c89ebe',
  kaset: 'https://subverselab.lemonsqueezy.com/checkout/buy/5c61153e-4fe6-48d4-899c-4bdbd97ac9d2',
  // The plugin family bundle (seven products, $19.99). Empty = the button renders disabled
  // ("Available shortly") until the product exists.
  family: 'https://subverselab.lemonsqueezy.com/checkout/buy/7eb4adc0-a939-435f-9c9e-1b6df5e6c17c',
  // Single checkouts (price = PRICES below, licence keys on, 2-year updates in the description); each product is also listed as
  // "<productId>:<slug>" in the Cloud Run env LS_PRODUCT_SLUGS (see RELEASE_QUEUE.md). Empty = the Buy button renders
  // disabled as "Available shortly"; no page ever links to a missing checkout.
  koro: 'https://subverselab.lemonsqueezy.com/checkout/buy/6c76c84f-bef1-4a71-b15c-07bb06589e61',
  yanki: 'https://subverselab.lemonsqueezy.com/checkout/buy/b1449667-0384-4104-9297-7326d2352a90',
  hava: 'https://subverselab.lemonsqueezy.com/checkout/buy/bcddd3f5-b27a-42dc-b5ce-e4aa235a90e9',
  tutkal: 'https://subverselab.lemonsqueezy.com/checkout/buy/34b33342-0de7-439f-b5fd-4722687a947b',
  mihenk: 'https://subverselab.lemonsqueezy.com/checkout/buy/be1389b5-1087-4252-a1bc-640ba3167a2d',
  // Free plugins: a $0 Lemon Squeezy product (pricing "Lead magnet", licence keys off, no card asked).
  // LS products: TABAN 1422884, ALEV 1419837, KIYMA 1439154 (all in LS_PRODUCT_SLUGS as "<id>:<slug>").
  taban: 'https://subverselab.lemonsqueezy.com/checkout/buy/f86f586c-6c3e-42dc-a541-fe6ac3d6b1b3',
  alev: 'https://subverselab.lemonsqueezy.com/checkout/buy/69c7387d-e316-498b-ab55-dcd23d0456a0',
  kiyma: 'https://subverselab.lemonsqueezy.com/checkout/buy/91bf8ac6-11b7-4129-b564-557e64df765a',
  // ADALET: ADALET_CHECKOUT above (8 Nov 2026, $15, no licence keys); SEDA below (on sale since 19 Oct).
  // ELEK: Lemon Squeezy product 1433515 ($25, licence keys on, published 12 Oct with "Display on storefront" OFF, so only this link sells it)
  // and discount ELEKLAUNCH ($18 off ELEK only, ends 30 Nov 2026 21:00 UTC = 1 Dec 00:00 Istanbul, the same moment as LAUNCH_ENDS.elek).
  // The link carries the code, so the checkout opens at $7 until then and at $25 after. Server: "1433515:elek" in LS_PRODUCT_SLUGS.
  elek: 'https://subverselab.lemonsqueezy.com/checkout/buy/2ac19e8b-4a26-4b68-bdb1-55390e4957de',   // 20 Oct: LS price is $7 (launch), ELEKLAUNCH in Draft; 1 Dec 2026: LS price back to $25
  // SEDA 1.0.0 (owner 19 Oct "sedayı da yayınlayalım"): LS product 1453230, $15, licence keys OFF, storefront OFF, no discount.
  // Server: "1453230:seda" in LS_PRODUCT_SLUGS; api/entitlements.js SOLO_SLUGS lists seda.
  seda: 'https://subverselab.lemonsqueezy.com/checkout/buy/1df20d0f-8ed4-4197-87b7-71bf6c9a2ec8',
  // TORNA 1.0.0: LS product 1481039, $12, published 29 Oct 2026 (owner's go). Server: "1481039:torna" in LS_PRODUCT_SLUGS.
  torna: 'https://subverselab.lemonsqueezy.com/checkout/buy/68739459-39f2-46d3-adff-bf5b2fcb6814',
  ...(RU8_CHECKOUT ? { ru8: RU8_CHECKOUT } : {}),
  ...(JINGFANG_CHECKOUT ? { jingfang: JINGFANG_CHECKOUT } : {}),
  ...(AHENK_CHECKOUT ? { ahenk: AHENK_CHECKOUT } : {}),
  ...(ADALET_CHECKOUT ? { adalet: ADALET_CHECKOUT } : {}),
  // 2-year updates in the description), a discount for the $7 launch price that expires 1 Dec 2026, then paste the checkout URL
  // (with the discount applied) here as `elek:` and add "<productId>:elek" to LS_PRODUCT_SLUGS. Until then the key stays absent and the
  // buy button renders disabled as "Available shortly".
};

// Installers are not in this repository and not in this constant. They live
// in the public bucket gs://subverselab-downloads, and this manifest says
// which files exist; the server reads the private bucket and serves names,
// sizes and versions (never URLs), so a download button turns on as soon as a
// build is published with tools/publish_download.sh — no site redeploy.
// Shape: { kubbe: { version, files: { mac: {name,size,version}, win } } }.
// A plugin with no entry keeps its buttons disabled ("download available shortly").
export const DOWNLOADS_MANIFEST = apiUrl('/api/download/manifest');

// One zip for editors: screenshots, YouTube demo links, logos, FACT_SHEET.txt.
// Built from 01_AI_Tools/instagram_2026-10/launch_desk/press_kit/.
export const PRESS_KIT = media('/press/SubverseLab_KUBBE_KASET_press_kit.zip');

export const DOWNLOAD_PLATFORMS = [
  ['mac', 'macOS'],
  ['win', 'Windows'],
];

// US dollars. Every plugin can be bought on its own at its price here, or as
// the family (owner decision 2026-10-05). The old $15 KUBBE + KASET bundle is gone.
export const PRICES = { kubbe: 9, kaset: 9, yanki: 9, hava: 12, koro: 15, mihenk: 49, tutkal: 12, family: 39.99, adalet: 15, seda: 15, torna: 12, elek: 25, ru8: 25, jingfang: 150, ahenk: 49 };
// The family stays the seven products it was sold as (owner 2026-10-27: SEDA's move into it reverted; SEDA and the later products
// are sold on their own).
export const SOLD_SINGLY = ['kubbe', 'kaset', 'koro', 'yanki', 'hava', 'mihenk', 'tutkal'];
// PRICES is the REGULAR price. A product with a launch price has an entry in LAUNCH_PRICES and an end date in LAUNCH_ENDS
// ('YYYY-MM-DD', 00:00 Istanbul time, UTC+3). ELEK: $25 regular, $7 until 1 December 2026. The server never reads these
// (the price is whatever the Lemon Squeezy product and its discount say); the pages only display them.
// AHENK (7 Nov 2026): $49 regular, $29.99 until 1 January 2027 00:00 Istanbul (= 31 Dec 2026 21:00 UTC). Price floor: AHENK has
// never been sold (no Lemon Squeezy product yet; the MuseHub beta had no price), so $29.99 is the first price any buyer pays and
// becomes the floor for every later AHENK promotion, discount code, bundle or gift.
export const LAUNCH_PRICES = { elek: 7, jingfang: 60, ahenk: 29.99 };   // JING FANG: owner 19 Oct "150 dolardan 60 düşür lansmana özel 1 aralığa kadar"
export const LAUNCH_ENDS = { elek: '2026-12-01', jingfang: '2026-12-01', ahenk: '2027-01-01' };
// Standing sale prices with a start and NO end (owner 7 Nov 2026: "jing fang 150 dolar üstü çizik 99 … ikinci bir duruma kadar
// kalıcı indirim", the same on Loot Audio). From `from` (00:00 Istanbul) the struck regular price and this price show until the
// entry is removed. Like LAUNCH_*, the server never reads it: the Lemon Squeezy price is set to it by hand on that day.
// Price floor: $99 is above every earlier JING FANG price ($60 launch, free Black Friday).
export const SALE_PRICES = { jingfang: { price: 99, from: '2026-12-01' } };
// Time-boxed store offers (owner 6 Nov 2026: "black friday kampanyası ... jing fang ile katılalım. süre boyunca jing fangi beleş
// verelim", the current release only). starts / ends: 'YYYY-MM-DD', 00:00 Istanbul (UTC+3); on from `starts`, off at `ends`.
// While an offer is on it replaces the launch price wherever a price is shown (struck regular price, "Free", the buy key).
// Like LAUNCH_*, the server never reads it: the Lemon Squeezy price is switched by hand at both moments (RELEASE_QUEUE).
// Price floor: no buyer has paid for JING FANG (admin Stats, all time on 6 Nov: 0 paid orders), so free undercuts nobody.
export const OFFERS = { jingfang: { price: 0, label: 'Black Friday', starts: '2026-11-27', ends: '2026-12-01' } };
const istanbulMidnight = (day) => Date.parse(`${day}T00:00:00+03:00`);
export const offerActive = (slug, now = Date.now()) => {
  const o = OFFERS[slug];
  if (!o) return false;
  const from = istanbulMidnight(o.starts); const to = istanbulMidnight(o.ends);
  return Number.isFinite(from) && Number.isFinite(to) && now >= from && now < to;
};
// "$7", or "Free" for a price of 0.
export const priceWord = (price) => (Number(price) === 0 ? 'Free' : `$${price}`);
// Updates: no term is promised (owner 7 Nov 2026: a plugin reaches its last version; a buyer must not wait out a period for
// updates that will not come). Updates appear on the Account page; the version the buyer has keeps working forever.
export const UPDATES_LINE = 'Updates appear on your Account page; the version you have keeps working forever.';

// What a buyer is told about the licence key, in ONE place. Today's builds ship with the licence check OFF; the
// 1.1 gate may turn it on. This sentence is true now and still true then; when the gate ships the only edit is
// the second half ("; enter it once when the plugin asks.").
const ACTIVATION_TAIL = 'Your licence key is on your Account page; the current versions do not ask for it.';
export const ACTIVATION_LINE = `Install and open it in your DAW. ${ACTIVATION_TAIL}`;
// Short form for step lists.
export const ACTIVATION_SHORT = 'Your licence key is on your Account page; this version does not ask for it.';
// Solo products sold without a licence key (RU-8, JING FANG, SEDA, ELEK: Lemon Squeezy keys OFF, owner rule "no manual licence keys").
export const ACTIVATION_NO_KEY = 'No licence key to type: install it on your own computers and play.';
// The free plugins (TABAN, ALEV, KIYMA) have no key at all.
export const ACTIVATION_LINE_FREE = 'Install and open it in your DAW. Nothing to activate.';

// The trust line under every Buy button. Only facts verifiable in the repo (decisions file 2026-10-10):
// macOS 11 (CMAKE_OSX_DEPLOYMENT_TARGET in every plugin build; the manuals say "macOS 11 or later"),
// Windows 64-bit (all manuals; only MIHENK/ALEV/TABAN name Windows 10, so no version is claimed), formats (FORMATS), licence scope and refunds (legalContent.js: Lemon Squeezy
// is merchant of record and refunds under its own policy), updates (UPDATES_LINE, no term promised).
// No refund window in days and no DAW list: neither exists in the repo.
const TRUST_OS = 'macOS 11 or later · Windows, 64-bit';
export const TRUST_LINE = `${TRUST_OS} · VST3 and AU on macOS, VST3 on Windows · One licence, your own computers, personal and commercial use · Paid through Lemon Squeezy in US dollars; refunds: subverselab.com/refunds`;
export const TRUST_LINE_MIHENK = `${TRUST_OS} · Standalone app, VST3 and AU on macOS; standalone app and VST3 on Windows · One licence, your own computers, personal and commercial use · Paid through Lemon Squeezy in US dollars; refunds: subverselab.com/refunds`;
// KORO, YANKI, HAVA: their macOS installers also install the standalone app (make_mac_installer.sh STANDALONE=1); the Windows zip
// holds the VST3 only (subverselab-plugins CI: no standalone_exe for them).
export const FORMATS_MAC_STANDALONE = 'Standalone app, VST3 and AU on macOS (Apple Silicon and Intel); VST3 on Windows (64-bit)';
export const TRUST_LINE_MAC_STANDALONE = `${TRUST_OS} · Standalone app, VST3 and AU on macOS; VST3 on Windows · One licence, your own computers, personal and commercial use · Paid through Lemon Squeezy in US dollars; refunds: subverselab.com/refunds`;
export const TRUST_LINE_FREE = `${TRUST_OS} · VST3 and AU on macOS, VST3 on Windows · Free, no card; the download appears on your Account page`;
// ELEK: universal macOS build since 1.0.3 (Apple Silicon and Intel, published 22 Oct; 1.0.0-1.0.2 were Apple Silicon only)
// and Windows 64-bit (standalone app, VST3; Windows package since 2026-10-12).
export const TRUST_LINE_ELEK = `macOS 11 or later, Apple Silicon and Intel · Windows, 64-bit · Standalone app, VST3 and AU on macOS; standalone app and VST3 on Windows · One licence, your own computers, personal and commercial use · Paid through Lemon Squeezy in US dollars; refunds: subverselab.com/refunds`;
// RU-8: universal macOS build (Apple Silicon and Intel, macOS 11, RU-8 STATUS 16 Oct) and Windows 64-bit, shipped together (owner 16 Oct).
export const TRUST_LINE_RU8 = `macOS 11 or later (Apple Silicon and Intel) · Windows, 64-bit · Standalone app, VST3 and AU instrument on macOS; standalone app and VST3 on Windows · One licence, your own computers, personal and commercial use · Paid through Lemon Squeezy in US dollars; refunds: subverselab.com/refunds`;
// JING FANG 1.0.0: macOS universal (Apple Silicon and Intel; signed, notarised 19 Oct) and Windows 64-bit (CI build published 19 Oct).
export const TRUST_LINE_SEDA = `macOS 11 or later, Apple Silicon and Intel · Windows, 64-bit · Standalone app, VST3 and AU on macOS; standalone app and VST3 on Windows · One licence, your own computers, personal and commercial use · Paid through Lemon Squeezy in US dollars; refunds: subverselab.com/refunds`;
export const TRUST_LINE_TORNA = TRUST_LINE_SEDA;   // the same formats (standalone app, VST3, AU on macOS; standalone app, VST3 on Windows)
export const TRUST_LINE_JINGFANG = `macOS 11 or later, Apple Silicon and Intel · Windows, 64-bit · Standalone app, VST3 and AU instrument on macOS; standalone app and VST3 on Windows · One licence, your own computers, personal and commercial use · Paid through Lemon Squeezy in US dollars; refunds: subverselab.com/refunds`;
// AHENK: universal since 1.0.0 (lead 8 Nov: `lipo -archs` on the release build's app, VST3 and AU = x86_64 arm64; the notarised
// pkg build-release/pkg/AHENK-1.0.0-macOS.pkg). Windows: standalone app and VST3 instrument, 64-bit (AHENK manual, Install).
export const TRUST_LINE_AHENK = `macOS 11 or later, Apple Silicon and Intel · Windows, 64-bit · Standalone app, VST3 and AU instrument on macOS; standalone app and VST3 on Windows · One licence, your own computers, personal and commercial use · Paid through Lemon Squeezy in US dollars; refunds: subverselab.com/refunds`;
export const trustLineFor = (slug) => (CATALOG_PLUGIN_INDEX[slug]?.trust ? CATALOG_PLUGIN_INDEX[slug].trust : slug === 'ahenk' ? TRUST_LINE_AHENK : slug === 'mihenk' ? TRUST_LINE_MIHENK : ['kubbe', 'koro', 'yanki', 'hava'].includes(slug) ? TRUST_LINE_MAC_STANDALONE : slug === 'elek' ? TRUST_LINE_ELEK : slug === 'ru8' ? RU8.trust : slug === 'jingfang' ? TRUST_LINE_JINGFANG : slug === 'seda' ? TRUST_LINE_SEDA : slug === 'torna' ? TRUST_LINE_TORNA : TRUST_LINE);


// The family offer has been live since 2026-10-05 (Istanbul): the family ($19.99, seven products) is shown next to the singles
// everywhere. Its end is FAMILY_OFFER_ENDS_AT below, decided at render time (isFamilyOfferOver).

// The SubverseLab plugin family: one bundle of seven products (TUTKAL, the
// bus compressor, joined it on 2026-10-05). The offer runs on a person
// counter (the first 1,000 people, the launch2 counter; server.js LAUNCH2_CAP
// still refuses seat 1,001) AND a time limit, whichever comes first.
// Owner 2026-10-27: the family is sold until the launch offer ends (FAMILY_OFFER_ENDS_AT) and then leaves the site; every plugin
// is then sold on its own. Owners keep their seven products (the server's entitlements do not change).
export const FAMILY_SLUGS = ['kubbe', 'kaset', 'koro', 'yanki', 'hava', 'mihenk', 'tutkal'];
export const FAMILY_SINGLES_TOTAL = FAMILY_SLUGS.reduce((sum, slug) => sum + PRICES[slug], 0);
// The end date of the family offer, an ISO date 'YYYY-MM-DD' (owner decision
// 2026-10-05, date moved 2026-10-05 night: $19.99 until 1 November 2026). Shown in plain words; the server
// does not enforce the date. Empty = no date is shown.
export const FAMILY_OFFER_ENDS_AT = '2026-11-01';
// True from FAMILY_OFFER_ENDS_AT 00:00 Turkey time (UTC+3) on. FamilyOffer then renders nothing, so no page
// keeps saying "until 1 November 2026" after the date. The next price is the owner's decision (not set here).
// Owner 2026-10-28: "plugin family ibarelerini her yerden kaldır hiç bir yerde görünmesin bu artık bitti" — the family is
// retired now, before the date; no page, text or meta names it any more. Buyers keep their seven products (server entitlements
// are untouched). The date check is kept for the record only.
export const FAMILY_RETIRED = true;
export const isFamilyOfferOver = (now = Date.now()) => {
  if (FAMILY_RETIRED) return true;
  const end = Date.parse(`${FAMILY_OFFER_ENDS_AT}T00:00:00+03:00`);
  return Number.isFinite(end) && now >= end;
};
// The family is on sale until the offer ends, then nowhere (owner 2026-10-27: "pluginler uzun süre tekli olarak satılmalı";
// campaigns, if any, run on the marketplaces). Decided when the module loads: at build time for the prerendered pages, at page
// load in the browser (rebuild and deploy after 1 Nov so the static HTML follows).
export const familyOnSale = (now = Date.now()) => !isFamilyOfferOver(now);
export const FAMILY_ON_SALE = familyOnSale();
export const FAMILY_PRICE = PRICES.family;
// The server still stops at this many paid family seats (server.js LAUNCH2_CAP),
// so the copy says so. If the offer becomes date-only: raise LAUNCH2_CAP there AND set this to 0.
export const FAMILY_PERSON_CAP = 0;   // owner 2026-10-05: no 1,000-person cap; the launch price ends 1 November 2026
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function familyOfferEndLabel() {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(FAMILY_OFFER_ENDS_AT);
  if (!m || +m[2] < 1 || +m[2] > 12) return '';
  return `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}`;
}
// 'YYYY-MM-DD' -> '1 November 2026' ('' when it is not a date).
export function formatDay(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m || +m[2] < 1 || +m[2] > 12) return '';
  return `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}`;
}
// Launch price of a single product (LAUNCH_PRICES / LAUNCH_ENDS). Decided at RENDER time in the visitor's browser, like
// isFamilyOfferOver; scripts/prerender.js evaluates the same functions at BUILD time, so the static HTML is only as new as
// the last build: rebuild and deploy after the end moment to refresh it (the React page corrects itself on load).
export const isLaunchOver = (slug, now = Date.now()) => {
  const end = Date.parse(`${LAUNCH_ENDS[slug]}T00:00:00+03:00`);
  return Number.isFinite(end) && now >= end;
};
const launchOn = (slug, now) => slug in LAUNCH_PRICES && !isLaunchOver(slug, now);
// A standing sale (SALE_PRICES) is on from its start day and has no end.
export const saleActive = (slug, now = Date.now()) => {
  const s = SALE_PRICES[slug];
  if (!s) return false;
  const from = istanbulMidnight(s.from);
  return Number.isFinite(from) && now >= from;
};
// True while a reduced price is on: a time-boxed offer (OFFERS), the launch price, or a standing sale.
export const launchPriceActive = (slug, now = Date.now()) => offerActive(slug, now) || launchOn(slug, now) || saleActive(slug, now);
// The price a buyer pays now: the offer price, else the launch price while it lasts, else the sale price, otherwise the regular one.
export const currentPrice = (slug, now = Date.now()) => (offerActive(slug, now) ? OFFERS[slug].price : launchOn(slug, now) ? LAUNCH_PRICES[slug] : saleActive(slug, now) ? SALE_PRICES[slug].price : PRICES[slug]);
// The end day of the reduced price; '' for a standing sale (it has none).
export const launchEndLabel = (slug, now = Date.now()) => (offerActive(slug, now) ? formatDay(OFFERS[slug].ends) : launchOn(slug, now) ? formatDay(LAUNCH_ENDS[slug]) : '');
// What the reduced price is called on a card: "Black Friday", "launch price", or '' for a standing sale (struck price only).
export const offerName = (slug, now = Date.now()) => (offerActive(slug, now) ? OFFERS[slug].label : launchOn(slug, now) ? 'launch price' : '');
// "Black Friday: free until 1 December 2026" / "launch price until 1 December 2026" ('' when nothing is on)
export const launchNote = (slug, now = Date.now()) => {
  if (offerActive(slug, now)) return `${OFFERS[slug].label}: ${Number(OFFERS[slug].price) === 0 ? 'free' : `$${OFFERS[slug].price}`} until ${launchEndLabel(slug, now)}`;
  return launchOn(slug, now) ? `launch price until ${launchEndLabel(slug, now)}` : '';
};
// Plain-text price for meta text and the prerendered HTML; components/LaunchPrice.jsx draws the struck price.
export const priceText = (slug, now = Date.now()) => (launchPriceActive(slug, now) ? `${priceWord(currentPrice(slug, now))} (regular $${PRICES[slug]})${launchNote(slug, now) ? `, ${launchNote(slug, now)}` : ''}` : `$${PRICES[slug]}`);

// "$19.99 until 1 November 2026"
export const FAMILY_UNTIL = familyOfferEndLabel() ? `$${FAMILY_PRICE} until ${familyOfferEndLabel()}` : `$${FAMILY_PRICE}`;
// "$103 together → $19.99"
export const FAMILY_REGULAR_PRICE = FAMILY_SINGLES_TOTAL;   // the single prices added up
// "$19.99 until 1 November 2026, or for the first 1,000 people if that comes first"
export const FAMILY_OFFER_TERMS = FAMILY_PERSON_CAP
  ? `${FAMILY_UNTIL}, or for the first ${FAMILY_PERSON_CAP.toLocaleString('en-US')} people if that comes first`
  : FAMILY_UNTIL;
export const FAMILY_NAME = 'SubverseLab plugin family';
// The family is back (owner 3 Nov 2026): the same products as the MuseHub bundle, at the MuseHub price ($39.99; the launch
// offer sold it at $19.99, which stays the price floor). No launch badge, no end date: FAMILY_RETIRED keeps the old launch
// machinery (HomeIntro opening, /launch2, the struck "regular price") switched off; FamilyBand.jsx on /plugins is the offer.
export const FAMILY_BUNDLE_ON = true;
// List price and the 50 % rule (owner 5 Nov 2026): MuseHub caps a discount at 50 % and the site follows the same rule. The
// family lists at $79.99 and sells at FAMILY_PRICE ($39.99, -50 %), the same as the MuseHub bundle (base 79.99, discount 39.99
// from 5 Nov 2026). The site never sells it for less than MuseHub; $19.99 stays the floor.
export const FAMILY_LIST_PRICE = 79.99;
export const FAMILY_DISCOUNT_PCT = Math.round((1 - PRICES.family / FAMILY_LIST_PRICE) * 100);
// The 3D box stack (subverselab-plugin-common/tools/family_card/family_stack_blender.py, round v11): [src, width, height].
export const FAMILY_STACK_IMG = [media('/plugins/family_stack_hero.webp'), 1400, 788];
export const FAMILY_STACK_CARD = media('/plugins/family_stack_card.webp');
// Upgrades to the family (owner 3-4 Nov: "satın al yerine upgrade butonu görmeliydi"): only for those who bought a family product
// on its own BEFORE the family came back (paid order dated before `before`); later single buyers get the normal Buy key.
// Each code is a one-use Lemon Squeezy discount on the family product for what that product cost (FAMKORO15, FAMYANKI9, made
// 4 Nov). The price never goes under the $19.99 floor: credit is capped at FAMILY_PRICE - 19.99. An account owning several gets
// the largest credit (Lemon Squeezy takes one code per checkout).
export const FAMILY_UPGRADES = {
  before: '2026-11-04',
  floor: 19.99,
  codes: { koro: { code: 'FAMKORO15', credit: 15 }, yanki: { code: 'FAMYANKI9', credit: 9 } },
};
// What the signed-in account may upgrade with: {slug, code, price} or null. `purchased` is /api/purchases/status's
// {slug: 'YYYY-MM-DD'} of paid orders; owning the family already means no upgrade.
export function familyUpgrade(purchased, ownsFamily, price = FAMILY_PRICE) {
  if (ownsFamily || !purchased) return null;
  let best = null;
  for (const [slug, offer] of Object.entries(FAMILY_UPGRADES.codes)) {
    const day = purchased[slug];
    if (!day || day >= FAMILY_UPGRADES.before) continue;
    if (!best || offer.credit > best.credit) best = { slug, ...offer };
  }
  if (!best) return null;
  const credit = Math.min(best.credit, Math.round((price - FAMILY_UPGRADES.floor) * 100) / 100);
  return { slug: best.slug, code: best.code, price: Math.round((price - credit) * 100) / 100 };
}
// Family visual (16:9, 1920x1080): the family block's image and the og image of /launch2.
export const FAMILY_IMAGE = '/plugins/family_7_16x9.png';
// Large web-size (<= 1400 px wide, webp) panel images for the homepage showcase: [src, width, height].
export const HERO_IMG = {
  family: [media('/plugins/family_7_hero.webp'), 1400, 788], kubbe: [media('/plugins/kubbe/hero.webp'), 1400, 551],
  kaset: [media('/plugins/kaset/hero.webp'), 964, 569], koro: [media('/plugins/koro/hero.webp'), 1400, 560],
  yanki: [media('/plugins/yanki/hero.webp'), 1400, 788], hava: [media('/plugins/hava/hero.webp'), 1400, 560],
  tutkal: [media('/plugins/tutkal/hero.webp'), 1400, 560], mihenk: [media('/plugins/mihenk/hero.webp'), 1400, 842],
  taban: [media('/plugins/taban/hero.webp'), 1400, 921],
  alev: [media('/plugins/alev/hero.webp'), 1400, 1283],
  kiyma: [media('/plugins/kiyma/hero.webp'), 1400, 933],
  adalet: [media('/plugins/adalet/hero.webp'), 1400, 630], seda: [media('/plugins/seda/hero_v2.webp'), 1400, 560],
  torna: [media('/plugins/torna/hero.webp'), 1400, 527],   // the plug-in's own snapshot (docs/ui/p2_default_2x.png)
  elek: [media('/plugins/elek/elek_ui_done.png'), 1000, 760],
  ru8: [media('/plugins/ru8/panel-cream.webp'), 1600, 1116],   // the 3D renders are for the ads, not the site (owner 17 Oct)
  jingfang: [media('/plugins/jingfang/hero.webp'), 1400, 914],   // the real panel on #033832 (store-image rule)
  ahenk: [media('/plugins/ahenk/panel-stage.webp'), 1600, 1024],   // AHENK 1.0's own ui_snapshot (stage_default 2x, full frame, 8 Nov)
};
// Showcase order on the homepage: the family slide first, then the seven paid plugins, then the three free ones,
// then the second line as "Coming soon" (no price, no buy button; owner 12 Oct).
export const SHOWCASE_SLUGS = ['kubbe', 'kaset', 'koro', 'yanki', 'hava', 'tutkal', 'mihenk'];
export const SHOWCASE_FREE_SLUGS = ['taban', 'alev', 'kiyma'];
export const SHOWCASE_SOON_SLUGS = ADALET_ON_SALE ? [] : ['adalet'];   // SEDA left this list on sale (19 Oct), ADALET with its checkout (8 Nov)
// Sold on their own at a real price (ELEK): a showcase slide with the price and a buy button.
export const SHOWCASE_SOLO_SLUGS = [...(ADALET_ON_SALE ? ['adalet'] : []), ...(AHENK_ON_SALE ? ['ahenk'] : []), ...(JINGFANG_ON_SALE ? ['jingfang'] : []), ...(RU8_ON_SALE ? ['ru8'] : []), 'elek', 'seda', 'torna'];
// Owner 19 Oct evening: nothing goes in front of the family sale ("aile satışının önüne geçecek ayrı bir şey istemiyorum"): JING FANG
// rotates with the other solo products after the family's plugins; its launch price shows on its own slide and page only. Kept empty.
export const SHOWCASE_NEW_SLUGS = [];
// The clear product box of every plug-in and app (owner 2026-10-31: /plugins shows each product as its box on the page
// ground, like the TORNA news frame). Rendered by subverselab-plugin-common/tools/box_renders.py from the panel without its
// footer band (the shipped panels still carry the old hyphenated lockup there); 1200 px wide webp with alpha.
const BOX_SLUGS = ['kubbe', 'kaset', 'koro', 'yanki', 'hava', 'mihenk', 'tutkal', 'taban', 'alev', 'kiyma', 'elek', 'ru8', 'jingfang', 'seda', 'torna', 'adalet', 'ahenk'];
export const BOX_IMG = Object.fromEntries(BOX_SLUGS.map((slug) => [slug, media(`/plugins/${slug}/box.webp`)]));
// The same box in two layers, cropped to the same frame: the page lays the lid over the body and lifts it on hover, so the
// box opens and the panel view rises from inside (owner 31 Oct: "daha iyi bir kutu açılış hissi").
export const BOX_LAYERS = Object.fromEntries(BOX_SLUGS.map((slug) => [slug, { body: media(`/plugins/${slug}/box-body.webp`), lid: media(`/plugins/${slug}/box-lid.webp`) }]));
/* The housing of the device that rises out of the box on /plugins (owner 31 Oct: "the rising panel needs a device feel"):
   each product's own panel edge colour, measured on its panel picture (mean of the outer 1 %) and darkened to 78 %, so the
   front plate sits inside a slightly darker enclosure. A catalogue plug-in without an entry gets the family green. */
export const BOX_SHELL = {
  torna: '#051411',
  jingfang: '#022b26',
  elek: '#02211e',
  seda: '#0b211e',
  ru8: '#393e39',
  kiyma: '#13100f',
  kubbe: '#122f2c',
  kaset: '#143631',
  koro: '#102a27',
  yanki: '#22362b',
  hava: '#0c2825',
  mihenk: '#0f2322',
  tutkal: '#102a27',
  alev: '#022b28',
  taban: '#052624',
  adalet: '#022421',
  ahenk: '#1c332f'   // 8 Nov 2026: its stage panel's edge (#25423d) at 78 %
};
export const BOX_SHELL_DEFAULT = '#0b2522';
// Web-size (800 px wide, webp) copies of each product's panel, used as the card background in the Price grid.
export const CARD_BG = {
  kubbe: media('/plugins/kubbe/card-bg.webp'), kaset: media('/plugins/kaset/card-bg.webp'), koro: media('/plugins/koro/card-bg.webp'),
  yanki: media('/plugins/yanki/card-bg.webp'), hava: media('/plugins/hava/card-bg.webp'), mihenk: media('/plugins/mihenk/card-bg.webp'),
  tutkal: media('/plugins/tutkal/card-bg.webp'), ru8: media('/plugins/ru8/card-bg.webp'), family: media('/plugins/family_7_card-bg.webp'),
  jingfang: media('/plugins/jingfang/card-bg.webp'), torna: media('/plugins/torna/card-bg.webp'),
  ahenk: media('/plugins/ahenk/card-bg.webp'),
};

export const FORMATS = 'VST3 and AU on macOS (Apple Silicon and Intel) · VST3 on Windows';

export const PLUGINS_INDEX = {
  title: 'Audio Plugins | SubverseLab',
  description:
    `SubverseLab audio plugins for your DAW, each sold on its own from $9. VST3 and AU.`,
  path: '/plugins',
};

export const LAUNCH = {
  path: '/launch',
  title: 'KUBBE and KASET — $9 each | SubverseLab',
  description: 'Kubbe (reverb) and Kaset (cassette colour): $9 each, VST3 and AU for macOS and Windows.',
  codesTotal: 1000,
  activationLimit: 3,
  offer: 'Kubbe and Kaset: $9 each',
  askHow: 'Buy, then sign in on subverselab.com/launch and download',
  steps: [
    ['Sign in', 'Sign in on this page with Google or with an e-mail address that can receive mail.'],
    ['Download', 'Download Kubbe and Kaset for macOS or Windows from this page, once your purchase is confirmed.'],
    ['Open in your DAW', ACTIVATION_LINE],
  ],
};

// /launch2: the Download Room of KUBBE, KASET, KORO, YANKI, HAVA, MIHENK and TUTKAL (every order that holds them).
// Owner 2026-10-28: the family is retired; this page no longer names or sells it (FAMILY_RETIRED).
export const LAUNCH2_NAME = 'SubverseLab plugins';
export const LAUNCH2 = {
  path: '/launch2',
  title: 'SubverseLab plugins — Download Room | SubverseLab',
  description: `Buy any SubverseLab plugin on its own or take a free one, then sign in with the same e-mail and download for macOS or Windows. ${UPDATES_LINE}`,
  // og image: a real plugin panel (the family store image is retired with the family).
  image: '/plugins/mihenk/og.jpg',
  codesTotal: 1000,
  activationLimit: 3,
  offer: 'Every plugin is sold on its own',
  offerNow: 'Every plugin is sold on its own',
  terms: '',
  askHow: 'Buy, then sign in on subverselab.com/launch2 and download',
  steps: [
    ['Buy', 'Buy any plugin on its own with Lemon Squeezy, or take a free one. Use the e-mail you sign in with here.'],
    ['Sign in', 'Sign in on this page with Google or with an e-mail address that can receive mail.'],
    ['Download', 'Download for macOS or Windows from this page or your Account page. A paid plugin unlocks as soon as your purchase is confirmed.'],
    ['Install', ACTIVATION_SHORT],
  ],
};

// The 100 tester seats for the launch-2 plugins (TestersPage.jsx, /api/testers/*).
export const TESTERS = {
  path: '/testers',
  title: 'Become a SubverseLab tester — 100 tester seats | SubverseLab',
  description: '100 tester seats: producers on macOS and Windows, in any DAW, test SubverseLab plugins free and tell us what breaks.',
};

export const SAMPLE_PACKS = {
  path: '/sample-packs',
  title: 'Sample packs | SubverseLab',
  description: 'Sample packs made from scratch and measured file by file by SubverseLab: drum kits and FX, 24-bit WAV, each with a preview made only from its own files.',
};

export const PRESET_PACKS = {
  path: '/preset-packs',
  title: 'Preset packs | SubverseLab',
  description: 'Preset packs made by SubverseLab for Ableton Live. The RU-8 Drum Pack: Drum Racks made from the RU-8 drum machine, with its grooves as MIDI clips. Live 12 Standard or Suite.',
};

export const KUBBE = {
  slug: 'kubbe',
  name: 'KUBBE',
  displayName: 'KUBBE',
  kind: 'Reverb',
  path: '/plugins/kubbe',
  model: 'KB-79',
  tagline: 'Three rooms, each with its own voice. Pick one by ear.',
  title: 'KUBBE: Algorithmic Reverb Plugin in Three Modes | SubverseLab',
  description: 'Algorithmic reverb plugin with three modes (Hammam, Cistern, Valley) and a decay display that is measured, not nominal. VST3 and AU for Mac, VST3 for Windows. $9.',
  og: '/plugins/kubbe/og.jpg',
  cardImage: media('/plugins/kubbe/panel-hammam.jpg'),
  imageSize: [1600, 629],
  // The macOS package installs the standalone app too (make_mac_installer.sh: kubbe STANDALONE=1); Windows is VST3 only.
  formats: FORMATS_MAC_STANDALONE,
  manual: media('/plugins/kubbe/Kubbe_Manual.pdf'),
  manualPage: '/plugins/kubbe/manual',
  // Demo clips live on YouTube (public, on the SubverseLab channel); `youtube` is the
  // video id and an empty id hides that clip. `vertical: true` marks a 9:16 Short;
  // without it the player is 16:9.
  demos: [
    { youtube: 'MAYXHzhLTMk', vertical: true, caption: 'Dry, then Hammam, Cistern and Valley on the same phrase. Headphones on.' },
  ],
  intro:
    'Most reverbs hand you a list of algorithms and leave you scrolling. KUBBE gives you three rooms, and you hear the difference the moment you switch: a bright marble dome, a long dark cistern, an open valley whose echoes can land on your beat grid. Pick the one your track is asking for, set the decay, and get back to the song. It wears the face of a 1979 rack unit as it looked the day it left the factory, and every tail is made by the engine itself: no impulse responses, nothing recorded from a real place.',
  modesLabel: 'Modes',
  defaultMode: 'cistern',
  modes: [
    {
      key: 'hammam',
      name: 'Hammam',
      image: media('/plugins/kubbe/panel-hammam.jpg'),
      text: 'Short and bright. Dense first reflections, a flutter between parallel walls, a ring in the low mids.',
    },
    {
      key: 'cistern',
      name: 'Cistern',
      image: media('/plugins/kubbe/panel-cistern.jpg'),
      text: 'Long and dark. Late, sparse early slaps and a long tail that moves slowly.',
    },
    {
      key: 'valley',
      name: 'Valley',
      image: media('/plugins/kubbe/panel-valley.jpg'),
      text: 'Open and rhythmic. Discrete echoes answer one by one, each answer darker and more blurred. With Echo Sync they land on the beat grid.',
    },
  ],
  sections: [
    {
      heading: 'Measured, not nominal',
      text: 'The decay display runs the engine on an impulse every time a setting changes. It draws the energy per 20 ms and the Schroeder curve, and prints the T60 it measures — at the default settings about 2.4 s in Hammam and about 6.6 s in Cistern. The Decay knob is scaled from that measurement.',
    },
    { heading: 'Three rooms, not a list of algorithms', text: 'Hammam is a marble dome: dense, bright first reflections, a flutter between parallel walls and a ring in the low mids. Cistern is underground: the column slaps arrive late and sparse, and the tail is long, dark and moves slowly, like water. Valley is open air: the far slopes answer one by one, each answer darker and more blurred, and with Echo Sync on the echoes land on the beat grid. Switching place lets the old tail ring out for 1.5 seconds instead of cutting it dead.' },
    { heading: 'Made to sit in a mix', text: 'Duck steps the tail back while the source plays, by up to 24 dB, and Freeze holds it about 6 dB under its level while you keep playing. Pre-delay runs from 0 to 250 ms or syncs from 1/64 to 1/4, Distance moves from near to far and darkens the tail as it goes, Width runs from mono to 150 %, and the low and high cuts shape the wet signal only.' },
  ],
  controls: [
    ['Mix', 'Dry to wet.'],
    ['Decay', 'Shown in measured seconds.'],
    ['Pre-delay', 'In milliseconds, or synced from 1/64 to 1/4.'],
    ['Distance', 'Near puts the early reflections up front; far is the room, darker.'],
    ['Low Cut · High Cut', 'Shape the wet signal only. High Cut at 20 kHz is not fully open: each room has built-in cuts and Distance adds a low-pass.'],
    ['Width', 'Stereo spread of the tail.'],
    ['Duck', 'The tail steps back while the source plays, by up to 24 dB (the full 24 dB only for input at −12 dBFS or louder). It ducks, it does not mute.'],
    ['Freeze', 'Holds the tail, about 6 dB under its level, while you keep playing. New input is not added to it.'],
    ['Echo Sync', 'Valley only: the echoes land on 3/4, 5/4, 7/4, 5/2 or 7/2 beats.'],
  ],
  controlsNote: 'When you switch mode, the old tail rings out over 1.5 seconds instead of being cut.',
  notYet: [
    'Switching mode a second time while the previous tail is still fading cuts that older tail.',
  ],
};

export const KASET = {
  slug: 'kaset',
  name: 'KASET',
  displayName: 'KASET',
  kind: 'Tape colour',
  path: '/plugins/kaset',
  model: 'KS-83',
  tagline: 'Cassette colour on a dial, from the master to the 4th dub.',
  title: 'Cassette Tape Plugin for the Mix Bus: KASET | SubverseLab',
  description: 'Cassette tape colour plugin: pick a generation from Master to 4th Dub and a tape type; every copy loses top end and gains hiss and saturation. VST3/AU, Windows VST3. $9.',
  og: '/plugins/kaset/og.jpg',
  cardImage: media('/plugins/kaset/panel.jpg'),
  imageSize: [964, 568],
  manual: media('/plugins/kaset/Kaset_Manual.pdf'),
  manualPage: '/plugins/kaset/manual',
  demos: [
    { youtube: 's_Cqb6sOp74', vertical: true, caption: 'One song, four generations: dry, 1st, 2nd and 4th dub.' },
    { youtube: '3Q_u4MX1rL8', vertical: true, caption: 'One pass, three tapes: Normal, Chrome and Metal.' },
  ],
  intro:
    'Every time a cassette was copied, it came back a little darker, a little hissier, a little more saturated. KASET puts that on a dial. Its face is a high-speed dubbing deck, and the Generation dial says how many copies away from the master you are: stay on Master for a light tape colour on the mix bus, or go down to the 4th Dub for a worn copy with the top end fallen to about 4.4 kHz. Auto Gain keeps the loudness level as you go, so you judge the colour, not the volume.',
  modesLabel: 'Generation',
  defaultMode: '2nddub',
  modes: [
    {
      key: 'master',
      name: 'Master',
      image: media('/plugins/kaset/panel-master.jpg'),
      text: 'One pass onto tape. The top end reaches to about 10 kHz.',
    },
    {
      key: '2nddub',
      name: '2nd Dub',
      image: media('/plugins/kaset/panel-2nddub.jpg'),
      text: 'A copy of a copy. Each dub is another pass through the tape model, so there is less top end and more hiss and saturation than on the master.',
    },
    {
      key: '4thdub',
      name: '4th Dub',
      image: media('/plugins/kaset/panel-4thdub.jpg'),
      text: 'Four copies down. The top end has fallen to about 4.4 kHz, and hiss and saturation have built with every copy.',
    },
  ],
  sections: [
    {
      heading: 'Generations',
      text: 'The Generation selector runs Master, 1st, 2nd, 3rd and 4th Dub. Each dub is another pass through the tape model: the top end falls from about 10 kHz on the master to about 4.4 kHz on the 4th dub, and hiss and saturation build with every copy. Speed error does not build up: it is highest on the master and falls with each dub. Auto Gain keeps the loudness level as you move between generations, so a darker copy does not simply sound quieter.',
    },
    {
      heading: 'Tape and bypass',
      text: 'The Tape selector chooses Normal, Chrome or Metal. The TAPE / BYPASS key compares against the untouched signal: bypass is latency-aligned and bit-exact. The plugin reports 15 ms of latency (720 samples at 48 kHz), which your DAW compensates. For recording through it, the TRACK switch cuts that to 1.5 ms (72 samples at 48 kHz).',
    },
    { heading: 'A dub of a dub', text: 'Each generation is one more trip onto tape and back: record pre-emphasis, saturation, playback de-emphasis, head bump, gap loss, wow and flutter, hiss and worn-oxide dropouts, run again on top of the last. Hiss builds and the top end falls with every copy, while the speed error does not pile up: each pass drifts on its own. Every random element comes from a seeded generator, so the same input and settings give the same output, bit for bit.' },
  ],
  controls: [
    ['Generation', 'Master, 1st, 2nd, 3rd or 4th Dub.'],
    ['Tape', 'Normal, Chrome or Metal.'],
    ['Input', 'Level into the tape. With Auto Gain on it changes the drive, not the output level.'],
    ['Saturation', 'How hard the tape is driven.'],
    ['Wow · Flutter', 'Slow and fast speed movement of the tape.'],
    ['Hiss', 'Tape noise.'],
    ['Wear', 'How worn the tape is.'],
    ['Mix', 'Dry to wet.'],
    ['Output', 'Level out.'],
    ['Auto Gain', 'Keeps the loudness level across generations.'],
    ['TRACK', 'Low-latency switch for recording: one moving head instead of five, the same tape colour, shallower wow at the deepest settings.'],
    ['TAPE / BYPASS', 'Bypass is latency-aligned and bit-exact.'],
  ],
  controlsNote: 'Latency is 15 ms (720 samples at 48 kHz) in the default MIX path, and 1.5 ms (72 samples at 48 kHz, 66 at 44.1 kHz) with TRACK on.',
  notYet: [],
};

// Launch 2 (out since 5 October). The products share one launch (launchId
// 'launch2': own counter, own claims, see server.js) and are sold on their own and in the plugin family.

const LAUNCH2_COMMON = {
  launchId: 'launch2',
  bundleSlug: 'family',
  titleSuffix: ' | SubverseLab',
  formats: FORMATS,
  modesLabel: 'Moods',
  // Each product sets its own `manual` (the PDF) and `manualPage` (the web page, src/data/manuals/<slug>.js).
  // Pages hide the manual block while `manual` is null.
  manual: null,
  manualPage: null,
  demos: [],
  notYet: [],
};

export const KORO = {
  ...LAUNCH2_COMMON,
  formats: FORMATS_MAC_STANDALONE,
  slug: 'koro', name: 'KORO', displayName: 'KORO', kind: 'Vocal doubler + harmonizer', path: '/plugins/koro', model: 'KR-77',
  demos: [{ youtube: '5v1AnuRmPRg', vertical: true, caption: 'One vocal: dry, doubled, then with the third harmony.' }],
  manual: media('/plugins/koro/Koro_Manual.pdf'), manualPage: '/plugins/koro/manual',
  tagline: 'Drop it on the vocal. Auto key. Never a wrong note.',
  title: 'Vocal Doubler and Harmonizer Plugin: KORO | SubverseLab',
  description: 'Vocal doubler and harmonizer plugin. It detects the key live while the singer sings, keeps to safe intervals until it is sure, and never plays a wrong note.',
  og: '/plugins/koro/koro_v2_card_4x5.png', cardImage: media('/plugins/koro/koro_v2_front.png'), imageSize: [1600, 640],
  intro: 'Backing vocals without picking a scale. Drop KORO on the lead and it listens while the singer sings, reading the key and scale as it goes. Until it is sure, it plays safe: a plain unison double, or the fifth. Thirds come in only on notes where every likely key agrees, so the harmony never lands on a wrong note. A tight double, a stack or a whole choir behind the voice, and you never open a scale menu.',
  defaultMode: 'tight',
  modes: [
    { key: 'tight', name: 'Tight Double', image: media('/plugins/koro/koro_v2_front.png'), text: 'A close vocal double. Doubling alone needs no key.' },
  ],
  sections: [
    { heading: 'Three steps', text: 'Drop it on a vocal. Let the key read-out settle while the singer sings, or press LOCK once you like the key. Pick a mood. That is the whole workflow.' },
    { heading: 'Moods', text: 'Pick a mood by ear and KORO keeps it in key: Tight Double to thicken a lead, Backing Stack and Choir to put voices behind it, Third and Fifth for a single harmony line, and Arabesk Choir.' },
    { heading: 'Never a wrong note', text: 'Fifths and octaves are consonant in every key, so KORO plays them whenever a note is clearly sung. A third depends on the key, so KORO plays one only on a note where every key it still considers likely agrees; otherwise that voice falls back to a plain unison double, or to the fifth. The key is read from the audio continuously, and LOCK keeps the one you like.' },
    { heading: 'A double and a harmony in one unit', text: 'The double adds one to three gently re-performed voices that arrive at slightly different, slowly moving times: a human timing impression, not a chorus wobble. The harmony adds pitch-shifted voices above or below the lead, snapped to the key it hears, with the singer\'s vibrato and inflection kept. Both can run together, and KORO reports one fixed latency (54.10 ms at 44.1 kHz) whatever is on, so delay compensation never has to change.' },
  ],
  controls: [
    ['DOUBLE', 'Amount of doubling. At zero the double is off.'],
    ['HARMONY', 'Amount of scale-aware harmony.'],
    ['COLOR', 'One knob that morphs the interval set: low third, high third, fifth, octave. The detected scale picks the exact notes.'],
    ['WIDTH', 'Stereo spread of the double.'],
    ['TONE', 'Brightness of the added voices.'],
    ['OUTPUT', 'Output level.'],
    ['AUTO / LOCK', 'The key is detected continuously and shown. LOCK freezes it.'],
    ['BYPASS', 'Host bypass.'],
    ['REAR', 'Per-voice level and pan (voices 2 and 3 only in CHOIR), glide, timing, manual key and scale, and MONO SAFE: the doubles go to the sides only, so a mono sum is exactly your lead.'],
  ],
  controlsNote: 'Latency is a fixed 54 ms at 44.1 kHz, with harmony on or off, and is reported to the host.',
};

export const YANKI = {
  ...LAUNCH2_COMMON,
  formats: FORMATS_MAC_STANDALONE,
  slug: 'yanki', name: 'YANKI', displayName: 'YANKI', kind: 'Tempo-synced tape echo', path: '/plugins/yanki', model: 'YK-74',
  demos: [{ youtube: 'u9vJDNo18ak', vertical: true, caption: 'Tempo-synced echo on a vocal, five presets.' }],
  manual: media('/plugins/yanki/Yanki_Manual.pdf'), manualPage: '/plugins/yanki/manual',
  tagline: 'A tape echo in time with your song, ready to swell into a loop.',
  title: 'Tape Echo Plugin, Tempo-Synced: YANKI | SubverseLab',
  description: 'Tempo-synced tape echo plugin. It opens as a plain 1/8 echo at the host tempo; moods such as Dub Spiral and Worn Loop swell the repeats into a loop.',
  og: '/plugins/yanki/yanki_v2_hero_4x5.png', cardImage: media('/plugins/yanki/yanki_v2_front.png'), imageSize: [1600, 900],
  intro: 'Drop YANKI on a vocal or a bus and it is already in time: a 1/8 echo at your host tempo, a few repeats that fade the way tape does. When the song wants more, pick a mood. Push FEEDBACK past HOLD in Dub Spiral, Worn Loop and the others, and the loop swells up to the CAP you set, so a dub throw can grow big without running away from you.',
  defaultMode: 'echo',
  modes: [
    { key: 'echo', name: 'Echo', image: media('/plugins/yanki/yanki_v2_slap.png'), text: 'Each ring is a repeat: its size is the time, its brightness the level after feedback.' },
    { key: 'dub', name: 'Swell', image: media('/plugins/yanki/yanki_v2_swell.png'), text: 'Feedback past HOLD makes the loop swell, up to CAP.' },
  ],
  sections: [
    { heading: 'Moods', text: 'From a clean repeat to a loop that keeps growing: Echo, Slapback, Three Heads, Dub Spiral, Worn Loop, Yesilcam and Ters. Each one is a starting point; every knob is still yours.' },
    { heading: 'One tape loop, three playback heads', text: 'Everything runs through a tape loop with one record head and three playback heads. Each pass loses top end, picks up a little wow and flutter and is gently saturated, so the repeats sound like tape, not a copy. TIME follows the host tempo continuously and glides to a new tempo instead of jumping; YANKI reports zero latency, so the dry signal is never delayed.' },
    { heading: 'See the repeats', text: 'The glass echo field draws one ring per repeat: the radius is the delay time, brightness and thickness are the level after feedback, warmth is the tone, and the left-right offset is the stereo spread. Drag the rings to change TIME, FEEDBACK and SPREAD; the readout below shows the repeats, the first repeat\'s level and how many bars the echo takes to die away.' },
  ],
  controls: [
    ['TIME', 'A sync ring (1/16, 1/8, dotted 1/8, 1/4, dotted 1/4, 1/2) or FREE milliseconds.'],
    ['FEEDBACK', 'Repeat level. At HOLD the repeats fade by about 1 dB each; past it, the red SWELL range, the loop swells.'],
    ['CAP', 'Ceiling for a swelling loop: off, or -12 to +12 dB over the dry signal.'],
    ['TONE', 'Tone of the repeats.'],
    ['WEAR', 'Tape wear.'],
    ['MIX', 'Dry to wet. At 100 %, Echo, Yesilcam and Ters give echo only; in Slapback, Three Heads, Dub Spiral and Worn Loop the dry stays at full level and MIX sets how much echo is added.'],
    ['OUTPUT', 'Output level.'],
    ['END', 'What happens to the loop at the end: hold, cut or dump.'],
    ['FREEZE', 'Tap to latch, hold for momentary.'],
    ['DARKEN', 'An extra high-cut in the feedback loop. It acts on the swell; below HOLD it has almost no effect.'],
    ['RISE · TEMPO LOCK · SPREAD · FINE', 'How far the swell reaches past HOLD, when it lands on the downbeat, stereo spread of the echoes, and a fine time offset on FREE.'],
  ],
  controlsNote: 'Latency is 0 ms. The display shows the host BPM and the resolved echo time. Double-click a knob to return it to its default.',
};

export const HAVA = {
  ...LAUNCH2_COMMON,
  formats: FORMATS_MAC_STANDALONE,
  slug: 'hava', name: 'HAVA', displayName: 'HAVA', kind: 'Top-end air + spring sheen', path: '/plugins/hava', model: 'HV-72',
  demos: [{ youtube: 'vmzdgI2FupQ', vertical: true, caption: 'One track, five moods.' }],
  manual: media('/plugins/hava/Hava_Manual.pdf'), manualPage: '/plugins/hava/manual',
  tagline: 'Air on top. A short spring sheen. Never a reverb.',
  title: 'Exciter and Air Plugin for Bus and Master: HAVA | SubverseLab',
  description: 'Exciter plugin for a bus or the master: a top-end air lift and a short spring sheen. A colour box with a short sheen tail (T60 0.63 s), not a reverb.',
  og: '/plugins/hava/hava_v2_card_4x5.png', cardImage: media('/plugins/hava/hava_v2_front.png'), imageSize: [1600, 640],
  intro: 'When a mix sounds right but closed, reach for air, not more reverb. Drop HAVA on the bus, turn AIR, and the top end opens with a smooth lift above 9 kHz. Add SHEEN for a short spring sparkle (a chirp, a twang, a glint on the transients) that dies away fast: a measured tail of T60 0.63 s. It brightens and glues, and it never puts your track in a room: there is no decay or size control anywhere.',
  defaultMode: 'air',
  modes: [
    { key: 'air', name: 'Air Full', image: media('/plugins/hava/hava_v2_front.png'), text: 'It opens here: a clear top-end lift with the sheen kept short.' },
    { key: 'master', name: 'Master Air', image: media('/plugins/hava/hava_v2_front_master_air.png'), text: 'Air with MASTER SAFE on, for the master bus.' },
  ],
  sections: [
    { heading: 'Moods', text: 'Air Light and Air Full for a clean top-end lift, Air + Sheen and Sheen Only when you want the spring sparkle, and Master Air, with MASTER SAFE on, for the last insert on the master.' },
    { heading: 'Air and sheen', text: 'AIR is a smooth high shelf above 9 kHz, 0.6 dB per step at 11 kHz on its 0 to 10 scale. SHEEN is a short spring: a falling chirp, a twang at 1.5 kHz and a sparkle that lights up on transients and falls away at once. A 300 Hz low cut on the spring\'s send keeps kick drums and low toms out of it, and 300 ms after an impulse the sheen is at least 25 dB below where it started: glue, not a room.' },
    { heading: 'Safe on the master', text: 'MASTER SAFE makes HAVA fit for the last insert: it processes the mid channel only, holds the loudness with an auto-gain and puts a true-peak ceiling at -0.3 dBTP. With it off HAVA has no latency; with it on it reports a constant 80 samples at 48 kHz, so your host\'s delay compensation follows.' },
  ],
  controls: [
    ['AIR', 'Top-end lift. The display shows the shelf target in dB at 11 kHz and the dB added above 8 kHz.'],
    ['SHEEN', 'Amount of the short spring colour.'],
    ['OUTPUT', 'Output level.'],
    ['MASTER SAFE', 'Mid-only processing, auto-gain and a -0.3 dBTP ceiling. With it off there is no ceiling.'],
    ['REAR', 'Twang, tension, drip and a low cut on the sheen send. They act only on the sheen spring, so they do nothing while SHEEN is 0.'],
    ['BYPASS', 'Host bypass.'],
  ],
  controlsNote: 'Latency is 80 samples with MASTER SAFE on. Sheen tail T60 0.63 s: a short colour layer, not a reverb.',
};

export const MIHENK = {
  ...LAUNCH2_COMMON,
  slug: 'mihenk', name: 'MIHENK', displayName: 'MIHENK', kind: 'Mastering app', path: '/plugins/mihenk', model: 'MH-86',
  demos: [{ youtube: 'ozOiuvdSsbc', caption: 'Measured, planned, level matched: the narrated walk-through.' }],
  manual: media('/plugins/mihenk/Mihenk_Manual.pdf'), manualPage: '/plugins/mihenk/manual',
  tagline: 'Transparent mastering. It measures first, and says why.',
  title: 'Mastering Plugin and App with Loudness Meter: MIHENK | SubverseLab',
  description: 'Transparent mastering plugin and app. It measures peaks, loudness, spectrum and phase, lists findings with a measured reason, and masters to the loudness target you pick.',
  og: '/plugins/mihenk/og.jpg', cardImage: media('/plugins/mihenk/mihenk_v10_auto.png'), imageSize: [2960, 1780],
  formats: 'Standalone app and VST3/AU on macOS · Standalone app and VST3 on Windows',
  intro: 'Mastering you can trust, because it shows you why. Load your track and MIHENK measures it first: peaks, loudness, spectrum and phase. Then it lists what it found, every finding with the measurement behind it, and masters to the loudness target you pick. Leave CHARACTER on OFF and it sets only level and ceiling; choose GENTLE or FULL when you want it to do more. One product: the same engine runs as a standalone app and inside your DAW.',
  defaultMode: 'auto',
  modes: [
    { key: 'auto', name: 'Auto', image: media('/plugins/mihenk/mihenk_v10_auto.png'), text: 'Load a track: meters show its peak straight away, and the diagnosis lists what it found.' },
    { key: 'advanced', name: 'Advanced', image: media('/plugins/mihenk/mihenk_v10_advanced.png'), text: 'The full chain with live layered views.' },
  ],
  sections: [
    { heading: 'Diagnosis and character', text: 'On load MIHENK lists findings with a severity and a measured reason, for example an input that arrives hotter than a mastering-ready level. CHARACTER decides what is done about them: OFF (the default) sets level and ceiling only, GENTLE adds a little glue and air, FULL applies EQ and compression from the diagnosis.' },
    { heading: 'Personal profile', text: 'Off by default. When you switch it on, MIHENK learns your taste from your listening notes and can propose, and lock, the settings you keep choosing. It is local, explainable and resettable.' },
  ],
  controls: [
    ['METERS', 'Input and output peak and true-peak meters, full panel height, with peak hold.'],
    ['WAVE / SPECTRUM / LOUDNESS', 'Live during playback; the spectrum is drawn in layers, before and after each stage.'],
    ['DIAGNOSIS', 'Measured findings, each with a severity and its reason; CHARACTER FULL applies what it can.'],
    ['3-BAND', 'Multiband compressor with 4th-order Linkwitz-Riley crossovers, or the wide glue mode.'],
    ['AIR', 'High shelf at 10, 15, 20 or 40 kHz, static or dynamic.'],
    ['LOW TOOLS', 'Phase-safe low mono and a low-end tightener.'],
    ['LIMITER', 'True-peak limiter with lookahead.'],
  ],
  // Owner 15 Oct: MIHENK gets no listen room; the page walks through the panel instead, one cropped section per step.
  tour: {
    heading: 'How MIHENK works',
    lead: 'Measure first, then decide. Every number on the panel is measured from your file, and every move MIHENK makes says why.',
    steps: [
      { key: 'status', img: media('/plugins/mihenk/tour/status.webp'), w: 956, h: 164, heading: 'Load a mix',
        text: 'Drop a file, or press LEARN in your DAW and play the song once. MIHENK analyses it in one pass, and the status lines say in plain words what it found and what it will do: here a mix at −9.0 LUFS, turned down 5.0 dB to reach −14.' },
      { key: 'measure', img: media('/plugins/mihenk/tour/measure.webp'), w: 590, h: 493, heading: 'Measured, side by side',
        text: 'Integrated, short-term and momentary loudness, loudness range, true peak (4× oversampled), sample peak, RMS, crest and correlation, for the input and the output. Loudness follows ITU-R BS.1770-4 and EBU Tech 3341/3342.' },
      { key: 'diagnose', img: media('/plugins/mihenk/tour/diagnose.webp'), w: 584, h: 730, heading: 'A diagnosis with reasons',
        text: 'Each finding carries the measurement behind it (too hot with no headroom, DC offset, an over-compressed mix, codec clipping risk). CHARACTER FULL applies EQ and compression from the diagnosis; OFF and GENTLE stay minimal.' },
      { key: 'target', img: media('/plugins/mihenk/tour/target.webp'), w: 584, h: 236, heading: 'Pick a target. MIHENK holds it',
        text: 'STREAM −14, APPLE −16, CLUB −8, KEEP INPUT or your own number. The target is reached within ±0.2 LU by trim and a true-peak limiter, and the status says what the ceiling costs in dB.' },
      { key: 'delivery', img: media('/plugins/mihenk/tour/delivery.webp'), w: 570, h: 710, heading: 'Delivery, and an honest A/B',
        text: 'DRIVE is solved for the target, CEILING sets the true-peak limit, and the limiter reports its gain reduction and how much of the time it works. BYPASS is an instant comparison at matched loudness, with no re-render.' },
      { key: 'advanced', img: media('/plugins/mihenk/tour/advanced.webp'), w: 1400, h: 441, heading: 'Every control, when you want it',
        text: 'The ADVANCED face opens the full chain: input, linear- or minimum-phase EQ with dynamic bands, a glue or 3-band compressor with Linkwitz-Riley crossovers, stereo and low-end tools, and a look-ahead true-peak limiter. Anything you change over the plan is marked and can be cleared.' },
      { key: 'reference', img: media('/plugins/mihenk/tour/reference.webp'), w: 1300, h: 580, heading: 'Match a reference',
        text: 'Drop a master you like. Its spectrum is drawn in gold next to yours, and MATCH TO REFERENCE matches tone and loudness in one step.' },
      { key: 'batch', img: media('/plugins/mihenk/tour/batch.webp'), w: 1400, h: 403, heading: 'A whole album at once',
        text: 'Drop a folder and keep working: songs are mastered one by one in the background, with the same settings for all, per track, or album-relative so they sit together. A CSV and JSON report lists every result.' },
    ],
    practical: [
      'The same file with the same settings gives the same master, whatever order you click in.',
      'A file that is already finished gets level and a ceiling only. MIHENK does not re-EQ or re-compress a master.',
      'One engine, as a standalone app and as a VST3/AU plugin. Latency is one fixed number: 332 ms at 48 kHz.',
      'Export writes <name>_MIHENK.wav and a plain-text report. 16-bit exports are dithered (TPDF).',
      'Undo and redo with Cmd+Z.',
    ],
  },
  controlsNote: 'In a DAW, press LEARN and play the song once; until then only the -1 dBTP limiter runs. Latency is one fixed number, 332 ms at 48 kHz in every setting, reported to the host. Parameters are automatable and the state is saved with the DAW project.',
};

export const TUTKAL = {
  ...LAUNCH2_COMMON,
  slug: 'tutkal', name: 'TUTKAL', displayName: 'TUTKAL', kind: 'Bus compressor', path: '/plugins/tutkal', model: 'TK-79',
  demos: [{ youtube: 'XWjTrKvPzzo', vertical: true, caption: 'GLUE, LA and PUMP at factory settings on raw drums.' }],
  tagline: 'Glue a bus, level a vocal, pump a pad. One switch.',
  title: 'Bus Compressor Plugin: Glue, Vocals, Sidechain | TUTKAL',
  description: 'Bus compressor plugin with three voicings: GLUE for the drum or mix bus, LA for vocals, PUMP for sidechain ducking in time with a kick.',
  og: '/plugins/tutkal/tutkal_kart_4x5.png', cardImage: media('/plugins/tutkal/front_glue.png'), imageSize: [1600, 640],
  manual: media('/plugins/tutkal/Tutkal_Manual.pdf'), manualPage: '/plugins/tutkal/manual',
  intro: 'Three compressors you reach for in every session, behind one switch. GLUE holds a drum or mix bus together so it hits as one. LA levels a vocal smoothly, without grabbing it. PUMP ducks a pad or a bass in time with the kick, in note values at your tempo. The panel shows only the controls that work in the voicing you chose, so you set it, hear it and move on.',
  defaultMode: 'glue',
  modes: [
    { key: 'glue', name: 'GLUE', image: media('/plugins/tutkal/front_glue.png'), text: 'Drum and mix bus. A slow stage does the gluing and a fast stage lets the first milliseconds of a hit through, so the mix is held as one instead of grabbed on every hit. Ratio 1.5 to 20:1, attack 0.1 to 30 ms, release 0.1 to 1.2 s or AUTO.' },
    { key: 'la', name: 'LA', image: media('/plugins/tutkal/front_la.png'), text: 'Vocal leveller. Attack follows the level and release has two stages, so the vocal stays level and is never grabbed. PEAK REDUCTION sets the amount; COMPRESS is a soft 3:1, LIMIT a tighter 12:1.' },
    { key: 'pump', name: 'PUMP', image: media('/plugins/tutkal/front_pump.png'), text: 'Sidechain duck. It listens to a kick on the sidechain (or the track itself), attacks in under 1 ms and recovers in note values from 1/16 to 1/2 at the host tempo, in three shapes: exponential, linear or swell. DEPTH goes from 0 to 24 dB.' },
  ],
  modesLabel: 'Voicings',
  sections: [
    { heading: 'Three voicings, one switch', text: 'GLUE, LA and PUMP share one measured engine. Only the controls that work in the chosen voicing are shown on the panel.' },
    { heading: 'Quick start', text: 'On a drum bus: leave GLUE on, set THRESHOLD around -18 dB until the meter swings 2 to 4 dB, keep RELEASE on AUTO. On a vocal: switch to LA and raise PEAK REDUCTION to about half. On a pad: switch to PUMP, choose the kick as the sidechain in your DAW (KEY on AUTO picks it up as soon as it carries signal) and set NOTE and DEPTH.' },
  ],
  controls: [
    ['VOICING', 'GLUE, LA or PUMP.'],
    ['THRESHOLD', 'Level above which the compressor works (GLUE and PUMP), -40 to 0 dB.'],
    ['RATIO', 'GLUE: 1.5 to 20:1.'],
    ['ATTACK · RELEASE · AUTO', 'GLUE timing. AUTO release follows how long the passage was pressed.'],
    ['PEAK REDUCTION · COMPRESS / LIMIT', 'LA: how much to level, and the 3:1 or 12:1 character.'],
    ['DEPTH · NOTE · SHAPE', 'PUMP: how deep the duck goes, how long it takes to recover, and the recovery shape.'],
    ['KEY', 'ON or AUTO (default), in every voicing. AUTO listens to the sidechain as soon as it carries signal and lets go after 4 s of silence; ON always listens to the sidechain. With no sidechain routed TUTKAL listens to the track itself.'],
    ['MAKEUP / GAIN · MIX', 'Output gain, and dry to compressed blend.'],
    ['IN', 'Bypass. It is bit-exact and delayed by the latency, so the output never shifts in time.'],
    ['REAR', 'SC HPF, a high-pass on the detector only (off by default, 20 to 300 Hz), the KEY switch and DRIVE, the output transformer.'],
  ],
  controlsNote: 'Latency is 63 samples at every sample rate and is reported to the host. Undo and redo with Cmd+Z on macOS, Ctrl+Z on Windows. Mono sidechain input, used by every voicing through KEY.',
};

// LAUNCH2_PLUGINS, FAMILY_ONLY_PLUGINS, PLUGINS, ALL_PLUGINS and FAMILY_PLUGINS are defined after SEDA (below), which joined them.

// Free plugins, free forever and not part of the family. "Get it free" opens a $0 Lemon Squeezy checkout (an
// e-mail address, no card); that order is the entitlement (server.js / entitlements.js FREE_SLUGS, download
// ticket launchId 'free') and the download then appears on /account. PluginRoom.jsx draws their pages.
export const TABAN = {
  slug: 'taban', name: 'TABAN', displayName: 'TABAN', kind: 'Reverse limiter', path: '/plugins/taban', model: 'TB-83',
  launchId: 'free', free: true, formats: FORMATS,
  tagline: 'A limiter sets a ceiling. TABAN sets a floor.',
  title: 'Free Reverse Limiter Plugin (Upward Compressor): TABAN | SubverseLab',
  description: 'Free reverse limiter plugin: audio under the FLOOR is lifted to it, audio above it is left bit for bit. One fader, zero latency. VST3 and AU for Mac, VST3 for Windows.',
  og: '/plugins/taban/taban_card_4x5.png', cardImage: media('/plugins/taban/front_lifting.png'), imageSize: [1520, 1000],
  manual: media('/plugins/taban/Taban_Manual.pdf'), manualPage: '/plugins/taban/manual', notYet: [],
  demos: [{ youtube: 'v80fQP4PZr8', vertical: true, caption: 'A quiet phrase lifted from 16.5 dB to 1.5 dB under the floor.' }],
  intro: 'A limiter keeps audio from rising above a ceiling; TABAN keeps it from falling below a floor. Raise one fader and the quiet syllables, soft notes and fading tails of a track come up to the level you set, while everything louder passes through untouched. Bring back the words a singer swallowed without riding a fader through the whole take. Zero latency, and free.',
  modesLabel: 'On the panel',
  defaultMode: 'lifting',
  modes: [
    { key: 'lifting', name: 'Holding the floor', image: media('/plugins/taban/front_lifting.png'), text: 'A −36 dBFS tone with FLOOR at −18 dB: LIFT reads 18.0 dB and the OUT bar stops at the fader cap.' },
    { key: 'off', name: 'FLOOR at OFF', image: media('/plugins/taban/front_default.png'), text: 'How TABAN opens: FLOOR at OFF, nothing is changed.' },
    { key: 'bypassed', name: 'IN off', image: media('/plugins/taban/front_bypassed.png'), text: 'IN off: the output is the input, bit for bit. LIFT reads 0.0.' },
  ],
  sections: [
    { heading: 'Never over the floor', text: 'The lift is worked out from the level of the very sample it is applied to, so a loud sound arriving after a quiet one is never boosted on its way in: no output sample is louder than the input or the floor, whichever is higher. No lookahead, so no latency.' },
    { heading: 'Silence stays silence', text: 'TABAN lifts by at most 24 dB and lets go near silence: the lift fades out between −80 and −96 dBFS, so room tone, dither and the end of a reverb tail are not dragged up. A steady note gets a steady gain, so TABAN adds no distortion to it.' },
  ],
  controls: [
    ['FLOOR', 'OFF (−60) to 0 dBFS. Audio under it is lifted to it; audio above it is left alone. Linear in dB.'],
    ['OUTPUT', '−12 to +12 dB after the floor.'],
    ['IN', 'Off = bypassed, bit for bit, with a 10 ms crossfade.'],
    ['LIFT', 'Read-out of the lift right now, in dB, with a HOLDING THE FLOOR lamp.'],
    ['IN · OUT bars', 'Levels on the fader’s own scale: the OUT bar stops at the cap.'],
  ],
  controlsNote: 'Latency is 0 samples. Undo and redo with Cmd+Z on macOS, Ctrl+Z on Windows.',
};
export const ALEV = {
  slug: 'alev', name: 'ALEV', displayName: 'ALEV', kind: '3-band saturator', path: '/plugins/alev', model: 'AL-81',
  launchId: 'free', free: true, formats: FORMATS,
  tagline: 'Three rings of heat. One ember that shows it.',
  title: 'Free Saturation Plugin, Three-Band: ALEV | SubverseLab',
  description: 'Free three-band saturation plugin, loudness-matched so you hear the heat, not the volume. 8x oversampled, no fold-back. VST3 and AU for Mac, VST3 for Windows.',
  og: '/plugins/alev/alev_card_4x5.png', cardImage: media('/plugins/alev/alev_default.png'), imageSize: [960, 880],
  manual: media('/plugins/alev/Alev_Manual.pdf'), manualPage: '/plugins/alev/manual', notYet: [],
  demos: [{ youtube: 'HCKTols07ms', vertical: true, caption: 'The three rings on a finished track, then LINK mode.' }],
  intro: 'Warmth, grit or full heat, band by band. ALEV splits the sound at 200 Hz and 3 kHz and heats each part on its own: turn a steel ring and that band saturates, from a faint warmth to a dense, driven sound. Each ring is loudness-matched, so what you hear is the colour, not a louder signal. The ember in the centre is the only light on the unit and glows with the heat of all three bands, breathing with the music. Free.',
  modesLabel: 'On the panel',
  defaultMode: 'default',
  modes: [
    { key: 'default', name: 'Default', image: media('/plugins/alev/alev_default.png'), text: 'How ALEV opens: LOW 30, MID 30, HIGH 20, DRY/WET at WET. A drum loop is playing: the ember shows the heat of each band.' },
    { key: 'hot', name: 'Hot', image: media('/plugins/alev/alev_hot.png'), text: 'LOW 90, MID 70, HIGH 100: all three zones of the ember burn.' },
    { key: 'gang', name: 'GANG', image: media('/plugins/alev/alev_gang.png'), text: 'GANG pressed: turning LOW moves all three rings together. The ember names the ring and its value.' },
  ],
  sections: [
    { heading: 'Heat, not loudness', text: 'Each ring is loudness-matched: turning one band from 0 to 100 changes the loudness of pink noise by less than 0.1 LU, so what you hear is the saturation, not a louder signal. The matching is calibrated on pink noise: on kick-heavy material LOW at 100 % comes out about 4 dB quieter (measured −4.2 dB RMS on drums, same peak). The output never passes −1 dBTP.' },
    { heading: 'No fold-back', text: 'The saturation runs 8 times oversampled with antiderivative anti-aliasing: with HIGH at 100, a 10 kHz tone leaves no fold-back above −85 dBc. DRY/WET is phase-coherent, so blending in the dry signal never thins the sound.' },
    { heading: 'Rings that move together', text: 'Three pushers on the case set how the rings move. FREE: each on its own. LINK: the heat spreads to the neighbouring bands, each step 30 % behind (turn HIGH and MID follows, then LOW). GANG: all three turn together.' },
  ],
  controls: [
    ['LOW · MID · HIGH', 'Three steel rings, 0 to 100 % heat each, a full turn. HIGH is the inner ring, LOW the outer. Crossovers at 200 Hz and 3 kHz. Defaults 30 / 30 / 20.'],
    ['DRY/WET', 'The curved fader on the left of the bezel, 0 to 100 %. Default WET (100 %).'],
    ['FREE · LINK · GANG', 'The pushers on the right of the case: how the rings move together.'],
    ['Ember', 'The heat of the three bands: HIGH in the centre, MID around it, LOW at the edge. While a ring turns it shows the ring’s name and value.'],
  ],
  controlsNote: 'Latency 92 samples (1.9 ms at 48 kHz), reported to the host. Drag up or down; Shift for fine moves; double-click to reset.',
};
// KIYMA: DSP v6 (subverselab-kiyma/docs/DSP_V6_CHOPPER.md); ranges and defaults from Source/PluginProcessor.cpp,
// the five switches from Source/Presets.h; manual subverselab-kiyma/docs/manual/Kiyma_Manual.html.
export const KIYMA = {
  slug: 'kiyma', name: 'KIYMA', displayName: 'KIYMA', kind: 'Audio mincer', path: '/plugins/kiyma', model: 'No. 001',
  launchId: 'free', free: true, formats: 'VST3, AU and standalone app on macOS · VST3 on Windows',
  tagline: 'The last phrase, minced. In time with your song.',
  title: 'Free Glitch and Stutter Plugin, Tempo-Synced: KIYMA | SubverseLab',
  description: 'Free glitch and beat-repeat plugin: it chops the last phrase into steps and replays them in a new order, locked to the bar. Zero latency. Mac and Windows.',
  og: '/plugins/kiyma/kiyma_card_4x5.png', cardImage: media('/plugins/kiyma/kiyma_mince.jpg'), imageSize: [1200, 800],
  manual: media('/plugins/kiyma/Kiyma_Manual.pdf'), manualPage: '/plugins/kiyma/manual', notYet: [],
  demos: [{ youtube: 'QuD3slq8sGk', caption: 'The five sweet-spot switches flipped live: LEAN, MINCE, CHUNK, GRISTLE, BONE.' }],
  intro: 'Glitch edits that land in time, without cutting a single clip. KIYMA listens to the channel it sits on, keeps the last complete block of bars, cuts it into steps and decides, step by step, whether to play the step that belongs there or to jump to another one nearby. The block always plays back in one bar: two bars squeezed into one come out an octave up, half a bar stretched over one an octave down. Raise a switch for a tuned starting point, or turn the knobs and make your own. Free, with zero latency.',
  modesLabel: 'On the panel',
  defaultMode: 'mince',
  modes: [
    { key: 'mince', name: 'MINCE', image: media('/plugins/kiyma/kiyma_mince.jpg'), text: 'MINCE raised: two bars squeezed into one, an octave up, with hard cuts. The sound of the original ChopperLab device.' },
    { key: 'bone', name: 'BONE', image: media('/plugins/kiyma/kiyma_bone.jpg'), text: 'BONE raised: half a bar stretched over a whole one, an octave down.' },
    { key: 'crank', name: 'The crank', image: media('/plugins/kiyma/kiyma_crank.jpg'), text: 'Turning the crank re-rolls the pattern: it adds 0 to 15 to the pattern number while the grinder spins.' },
    { key: 'default', name: 'Default', image: media('/plugins/kiyma/kiyma_default.jpg'), text: 'How KIYMA opens: DENSITY 40 %, REACH 6, PATTERN 1, LENGTH 2 bars, EDGE HARD, STEPS 16, fully WET; no switch raised.' },
  ],
  sections: [
    { heading: 'Five sweet spots', text: 'The switch bank holds five tuned settings: LEAN (no chop, one bar replayed), MINCE (two bars in one), CHUNK (eight big slices), GRISTLE (four bars in one, 32 steps) and BONE (half a bar stretched). Raise a switch and all eight knobs jump to it; turn any of them and the switch drops by itself.' },
    { heading: 'Locked to the bar, no latency', text: 'KIYMA follows the tempo, bar position and time signature of the DAW and only reads audio that has already arrived, so it adds no latency. The chop patterns are fixed tables: there is no randomness in the sound, so the same settings on the same song always give the same result, at any buffer size.' },
  ],
  controls: [
    ['DENSITY', '0 to 100 %, default 40 %: the chance per step that the step jumps to another one. 0 % plays every step in order.'],
    ['REACH', '1 to 16 steps, default 6: how far a jump can go, backwards or forwards.'],
    ['PATTERN', '1 to 16, default 1: which fixed chop pattern is used.'],
    ['LENGTH', '1/2, 1, 2 or 4 bars, default 2: how much of the past is read, always played back in one bar.'],
    ['EDGE · STEPS', 'EDGE HARD to 10 ms rounds each cut; STEPS 8, 16 or 32 slices the block.'],
    ['DRY/WET · OUTPUT', 'Blend 0 to 100 % (0 % is the input, bit for bit); output −24 to +6 dB.'],
    ['Crank', 'SHUFFLE: adds 0 to 15 to the pattern number, a quick re-roll.'],
  ],
  controlsNote: 'Latency 0 samples. Drag up or down; Shift for fine moves; double-click to reset. Undo and redo with Cmd+Z on macOS, Ctrl+Z on Windows.',
};
export const FREE_PLUGINS = [TABAN, ALEV, KIYMA];

// The second line: ADALET and SEDA. Sold on their own, not part of the plugin family, not in the testers' list.
// 12 October was dropped (owner 11 Oct: "yetiştirmeyi boşverip biraz daha sağlam bir şey yapalım", then "coming soon"):
// no date and no countdown until the owner names one. No checkout exists yet (see CHECKOUT above), so the pages read
// "Coming soon · $<price>" and render no buy button. PluginRoom.jsx draws them. To set a date: RELEASE3_AT
// (ISO, UTC) brings the countdown back, RELEASE3_LABEL ('November 1') becomes "Available November 1".
export const RELEASE3_AT = null;
export const RELEASE3_LABEL = null;

const LINE2_COMMON = {
  launchId: 'line2',
  releaseLabel: RELEASE3_LABEL,
  releaseAt: RELEASE3_AT,
  titleSuffix: ' | SubverseLab',
  formats: FORMATS,
  modesLabel: 'On the panel',
  manual: null,
  manualPage: null,
  demos: [],
  notYet: [],
};

export const ADALET = {
  ...LINE2_COMMON,
  // Owner's manual (owner 20 Oct): subverselab-dyneq/docs/manual/Adalet_Manual.html -> tools/make_manual.sh -> this PDF.
  manual: media('/plugins/adalet/Adalet_Manual.pdf'), manualPage: '/plugins/adalet/manual',
  // On sale (ADALET_CHECKOUT): sold on its own like SEDA, no licence key in the plug-in (1.0.0 is built with SVL_LICENSING=OFF).
  ...(ADALET_ON_SALE ? { launchId: 'solo', releaseLabel: null, releaseAt: null, noKey: true, trust: TRUST_LINE } : {}),
  slug: 'adalet', name: 'ADALET', displayName: 'ADALET', kind: 'Dynamic EQ', path: '/plugins/adalet', model: 'DQ-82',
  tagline: 'A dynamic EQ with zero latency, and three helpers that find the problem for you.',
  title: 'ADALET — a zero-latency dynamic EQ with TARGET, COLLIDE and SELF | SubverseLab',
  description: 'ADALET is a dynamic EQ with zero latency: six bands, any bell or shelf can be dynamic, and three helpers: TARGET cuts a named part of a sound, COLLIDE clears the room between two tracks, SELF finds resonances. VST3 and AU for macOS, VST3 for Windows.',
  // TODO(owner): a 4:5 share card. Until one exists the og image reuses the LAB panel.
  og: '/plugins/adalet/og_lab.png', cardImage: media('/plugins/adalet/lab_dynamic.webp'), imageSize: [1600, 720],
  intro: 'ADALET is a dynamic EQ with six bands and zero latency, with helpers that find the problem for you. Any bell or shelf can be made dynamic, so it cuts or lifts only while the sound needs it. TARGET cuts a named part of a sound, such as a boxy vocal or a kick’s sub; COLLIDE clears room for this track where another one is loud; SELF finds the resonances of the track it sits on. They do the finding, so you can do the deciding.',
  // Panel views (8 Nov 2026, owner: "ürün odası JING FANG gibi"): 1.0 ui_snapshot shots (subverselab-dyneq/docs/ui/1.0/p4d_*@2x.png)
  // scaled to 1600 x 720; the tour steps are crops of the same shots (public/plugins/adalet/tour/). Every number in a caption is on its picture.
  defaultMode: 'default',
  modes: [
    { key: 'default', name: 'Panel', image: media('/plugins/adalet/panel-default.webp'), text: 'How ADALET opens: six empty band slots (each with a +) above the display, TARGET and SELF off, COLLIDE lit, here with a KEY track routed. Double-click the display to add a band where you point.' },
    { key: 'dynamic', name: 'Dynamic band', image: media('/plugins/adalet/panel-dynamic.webp'), text: 'Band 4, a bell at 1.02 kHz and +3.0 dB, made dynamic: RANGE −6.0 dB from a THRESHOLD of −30.0 dB, with ATTACK 10 ms, RELEASE 100 ms and TRIGGER SELF. The line at the top right reads what the band and COLLIDE do to it now.' },
    { key: 'target', name: 'TARGET', image: media('/plugins/adalet/panel-target.webp'), text: 'TARGET on KICK · SUB: learned from 8 hits and cutting, AMOUNT 9.0 dB, WIDTH 1.00, SLOPE 48 dB/oct. No sidechain needed.' },
    { key: 'target-list', name: 'TARGET list', image: media('/plugins/adalet/panel-target-list.webp'), text: 'The instrument and part list, scrolled down: the SNARE, HATS, BASS, VOCAL and DRUMS parts, with REVERB-READY for snare and vocal. The KICK parts sit above.' },
    { key: 'collide', name: 'COLLIDE', image: media('/plugins/adalet/panel-collide.webp'), text: 'COLLIDE with a KEY track routed to the sidechain: DEPTH 6.0 dB, MARGIN 3.0 dB, SPEED MEDIUM, and KEY LISTEN to hear the key. It cuts this track only where the key is loud.' },
    { key: 'self', name: 'SELF', image: media('/plugins/adalet/panel-self.webp'), text: 'SELF on: DEPTH 6.0 dB and SENS 3.0 dB. It hunts the resonances in this track. COLLIDE and SELF share one engine, so lighting one darkens the other.' },
    { key: 'delta', name: 'DELTA', image: media('/plugins/adalet/panel-delta.webp'), text: 'DELTA held: you hear only what is being cut, and the display says so.' },
    { key: 'bake', name: 'BAKE', image: media('/plugins/adalet/panel-bake.webp'), text: 'BAKE has frozen what COLLIDE cut over 6.0 s of playing into three static bells, bands 1, 2 and 3, and switched COLLIDE off. Cmd+Z goes back to the dynamic cut.' },
  ],
  sections: [
    { heading: 'Six bands, any of them dynamic', text: 'Bell, low shelf, high shelf, notch, low cut and high cut. The cuts run at 12, 24, 36, 48 or 72 dB per octave and have a resonance control. Any bell or shelf can be dynamic: RANGE up to ±12 dB, with THRESHOLD, ATTACK and RELEASE, triggered by the band itself or by the sidechain KEY.' },
    { heading: 'TARGET: name the part', text: 'Tell ADALET the instrument and the part, and it learns where that part sits in the material from the hits and cuts it by AMOUNT. It is static and needs no sidechain. KICK: SUB, BODY, MUD, BOX, CLICK. SNARE: BODY, BOX, CRACK, SNAP/AIR, REVERB-READY. HATS: CHICK, BITE, SHIMMER. BASS: SUB, BODY, MUD, TOP. VOCAL: BOX, NASAL, HARSH, S, REVERB-READY. DRUMS: KICK BODY, SNARE BODY, HATS SHIMMER.' },
    { heading: 'COLLIDE: two sounds stop masking each other', text: 'Route a KEY track to the sidechain and COLLIDE cuts this track only where the KEY track is loud, so the two stop fighting for the same space and both come through. For kick and bass, put ADALET on the bass with the kick on KEY and FOCUS LOW at 40 Hz: only the kick itself tells where its low end sits, and the bass makes room only while it plays.' },
    { heading: 'SELF: resonances in this track', text: 'SELF finds the resonances in the track it sits on and cuts them, so a ring you can hear but cannot place stops standing out.' },
    { heading: 'It tells you what it heard', text: 'While TARGET learns, the display says where it is: listening, how many hits it has heard, how many of three it has learned, then learned and cutting. When a hit cannot be used it says why, so you know to play the part of the song where the instrument is clearest. The bands sit ready at six different frequencies, and the control row under the display holds only the selected band.' },
    { heading: 'Hear what it does', text: 'Hold DELTA to hear only what is being cut. BYPASS is level-matched, so a comparison is not decided by loudness. A live spectrum analyzer shows POST by default, or PRE, PRE+POST or nothing, and the curve on screen is the engine’s own response.' },
  ],
  // The walk through the panel (as JING FANG / MIHENK): crops of the 1.0 ui_snapshot shots, 2x, scaled to at most 1400 px wide.
  tour: {
    heading: 'How ADALET works',
    lead: 'One screen: the helpers on top, the bands on the display, the selected band in one row underneath.',
    steps: [
      { key: 'row', img: media('/plugins/adalet/tour/row.webp'), w: 1400, h: 128, heading: 'One band, one row',
        text: 'Select a band and its settings sit in one row under the display: ON, the shape, SLOPE for the cuts, FREQ, GAIN, Q, RANGE and THRESHOLD. A RANGE other than OFF makes a bell or shelf dynamic; the … key opens ATTACK, RELEASE and TRIGGER (SELF, this track, or KEY, the sidechain). Here band 4: 1.02 kHz, +3.0 dB, Q 1.20, RANGE −6.0 dB, THRESHOLD −30.0 dB.' },
      { key: 'menu', img: media('/plugins/adalet/tour/menu.webp'), w: 436, h: 786, heading: 'Six shapes, five slopes',
        text: 'A band’s menu holds the six shapes (bell, low shelf, low cut, high shelf, high cut, notch), the five slopes of the cuts (12, 24, 36, 48 and 72 dB/oct), SWITCH OFF and DELETE. A deleted band goes back to its defaults and its slot shows + again; Cmd+Z brings it back.' },
      { key: 'resonance', img: media('/plugins/adalet/tour/resonance.webp'), w: 1400, h: 443, heading: 'Steep cuts with a resonance',
        text: 'Band 1 as a LOW CUT at 140 Hz, 72 dB/oct, with Q at 6.00. On a cut, Q above 1 adds a resonant peak at the corner. Band 5 is switched off: its node stays on the display, dimmed, until you switch it on again.' },
      { key: 'readout', img: media('/plugins/adalet/tour/readout.webp'), w: 1400, h: 443, heading: 'What every band is doing',
        text: 'Point at a node and ADALET says what the band is set to and what the helpers take from it while you play: here band 5, a bell at 292 Hz set to +4.0 dB, reads −3.2 dB from COLLIDE with the KEY track playing, net −3.2 dB.' },
      { key: 'target', img: media('/plugins/adalet/tour/target.webp'), w: 804, h: 576, heading: 'TARGET learns, then cuts',
        text: 'Pick an instrument and a part, then play the track. The status line counts the hits until three are learned, then reads LEARNED FROM n HITS - CUTTING; a hit it cannot use is named with the reason. AMOUNT (0 to 60 dB), WIDTH (0.5 to 2) and SLOPE (12 to 72 dB/oct) shape the cut.' },
      { key: 'bake', img: media('/plugins/adalet/tour/bake.webp'), w: 1400, h: 255, heading: 'ADVANCED and BAKE',
        text: 'ADVANCED opens FOCUS LOW and FOCUS HIGH (bands outside them are never cut), MIX, SWEET, TILING, LEVEL MATCH and BAKE. BAKE ARM, play the part with the collisions, APPLY: what COLLIDE cut becomes static bells in the empty bands and COLLIDE switches off. Cmd+Z returns to the dynamic cut, Cmd+Shift+Z bakes again.' },
    ],
    practical: [
      'Zero latency: the dry and the processed signal line up at any MIX.',
      'Kick and bass: ADALET on the bass, the kick routed to its sidechain (KEY), COLLIDE on, FOCUS LOW at 40 Hz in ADVANCED.',
      'Double-click the display to add a band where you point; drag a node for frequency and gain, Shift for fine moves, Cmd-drag for Q; Alt-click switches a band on or off; keys 1 to 6 select a band.',
      'Hold D (or DELTA) to hear only what is being cut. Undo and redo: Cmd+Z and Cmd+Shift+Z on macOS, Ctrl on Windows.',
      'SIZE sets the window to 75, 85 or 100 %.',
    ],
  },
  controls: [
    ['Bands 1 to 6', 'Bell, low shelf, high shelf, notch, low cut, high cut. FREQ 20 Hz to 20 kHz, GAIN ±18 dB, Q 0.1 to 18. Cuts at 12, 24, 36, 48 or 72 dB/oct; on a cut, Q above 1 adds resonance. A new slot starts at 80 Hz, 200 Hz, 500 Hz, 1.2 kHz, 3 kHz or 8 kHz.'],
    ['RANGE · THRESHOLD', 'Make a bell or shelf dynamic: RANGE ±12 dB (OFF at 0) once the level passes THRESHOLD (−60 to 0 dB, default −30 dB).'],
    ['ATTACK · RELEASE · TRIGGER', 'ATTACK 1 to 100 ms (10 ms), RELEASE 10 to 1000 ms (100 ms); TRIGGER SELF (this track) or KEY (the sidechain).'],
    ['TARGET', 'An instrument and a part from the list; AMOUNT 0 to 60 dB, WIDTH 0.5 to 2, SLOPE 12 to 72 dB/oct. Learns from three hits; no sidechain.'],
    ['COLLIDE', 'Cuts this track only where a KEY track routed to the sidechain is loud. DEPTH 0 to 12 dB (6 dB), MARGIN 0 to 12 dB (3 dB), SPEED FAST, MEDIUM or SLOW, KEY LISTEN.'],
    ['SELF', 'Finds resonances in this track and cuts them. DEPTH 0 to 12 dB, SENS 0 to 12 dB.'],
    ['ADVANCED', 'FOCUS LOW and HIGH 40 Hz to 16 kHz (120 Hz and 8 kHz), MIX 0 to 100 %, SWEET, TILING, LEVEL MATCH, and BAKE: ARM, RESET, APPLY.'],
    ['DELTA · BYPASS', 'DELTA: hold to hear only what is being cut. BYPASS: level-matched while LEVEL MATCH is on (the default).'],
    ['PRE · POST · KEY', 'The analyzer: the input, the output (the default) or both, and the sidechain key as a thin line.'],
    ['OUTPUT', '−12 to +12 dB, after everything.'],
  ],
  controlsNote: 'Zero latency. VST3 and AU on macOS, VST3 on Windows. Every control with its range and default is in the manual.',
};

export const SEDA = {
  ...LINE2_COMMON,
  // On sale 19 Oct as a solo product like ELEK (owner: "sedayı da yayınlayalım"); only its own order opens it, no licence key.
  // (26 Oct it was moved into the family; owner 27 Oct reverted that: the family stays seven products.)
  launchId: 'solo', releaseLabel: null, releaseAt: null, noKey: true,
  formats: 'Standalone app, VST3 and AU on macOS (Apple Silicon and Intel); standalone app and VST3 on Windows (64-bit)',
  trust: TRUST_LINE_SEDA,
  // Owner's manual (28 Oct): subverselab-seda/docs/manual/Seda_Manual.html -> tools/make_manual.sh -> this PDF.
  manual: media('/plugins/seda/Seda_Manual.pdf'), manualPage: '/plugins/seda/manual',
  slug: 'seda', name: 'SEDA', displayName: 'SEDA', kind: 'Analog delay', path: '/plugins/seda', model: 'BD-79',
  tagline: 'A bucket-brigade delay that listens to the phrase and waits for its end.',
  title: 'BBD Analog Delay Plugin That Ducks While You Play: SEDA | SubverseLab',
  description: 'Bucket-brigade (BBD) analog delay plugin, 20 to 1200 ms, zero latency. LISTEN ducks the echo while you play and throws it at the end of the phrase. Mac and Windows.',
  // Panel images: 01_AI_Tools/subverselab-seda/docs/ui/p5_*.png (17 Oct, RUNAWAY and CHAOS). TODO(owner): a 4:5 share card; the og image reuses the default panel.
  og: '/plugins/seda/panel_default.png', cardImage: media('/plugins/seda/panel_default.png'), imageSize: [1600, 640],
  intro: 'An echo that waits for you. SEDA is a bucket-brigade analog delay: 8192 stages, companded, from 20 to 1200 ms, with feedback up to 110 % and zero latency. Switch on LISTEN and it hears the phrase: the echo ducks while you sing or play, then throws at the end of the line, in the gap where an echo belongs. The duck-and-throw you would otherwise draw by hand, done by the delay itself.',
  defaultMode: 'default',
  modes: [
    { key: 'default', name: 'Default', image: media('/plugins/seda/panel_default.png'), text: 'How SEDA opens: TIME 300 ms, FEEDBACK 30 %, MIX 50 %, LISTEN off. The VU meter shows the wet level and the red needle the duck depth.' },
    { key: 'listen', name: 'P1 VOCAL', image: media('/plugins/seda/panel_listen.png'), text: 'LISTEN on, the LED display at program P1 VOCAL: the echo ducks while you play or sing (DUCK 60 %) and is thrown at the end of the phrase (THROW 6 dB).' },
    { key: 'sync', name: 'SYNC', image: media('/plugins/seda/panel_sync.png'), text: 'SYNC and AUTO on: the delay time follows the host tempo as a NOTE value, from 1/32 to dotted 1/1. Here the LED display reads P0 MANUAL with a repeat note of 1/8.' },
    { key: 'runaway', name: 'RUNAWAY', image: media('/plugins/seda/panel_runaway.png'), text: 'RUNAWAY 70 % and CHAOS 30 % with SYNC at 1/8: the loop has gone over 100 % and the red RUNAWAY lamp is lit. Both knobs open at 0.' },
  ],
  sections: [
    { heading: 'A real bucket brigade', text: 'The delay line is a BBD with 8192 stages, companded, and it runs from 20 to 1200 ms. Feedback goes up to 110 %. AGE switches between NEW and OLD.' },
    { heading: 'LISTEN: the delay listens to the phrase', text: 'While you play or sing, SEDA ducks the echo (DUCK). At the end of the phrase it throws the echo (THROW). Programs are chosen on an LED display. An analog VU meter shows the wet level, and a red needle shows the duck depth.' },
    { heading: 'Time, loop, movement, width', text: 'TIME in milliseconds or SYNC to the host with a NOTE value (1/32 to dotted 1/1) and AUTO. LOOP: FEEDBACK, TONE, COMPANDER, AGE. MOD: RATE, DEPTH, SHAPE sine or triangle. STEREO: MONO, WIDE, PING-PONG, WIDTH and WET HP. OUT: MIX, dry to wet.' },
    { heading: 'RUNAWAY and CHAOS', text: 'RUNAWAY raises the loop gain past 100 %: the repeats grow into a steady drone that darkens with every pass and can start from the delay’s own hiss, held at a fixed level so it never runs out of control. CHAOS adds a slow random wobble to the delay clock, stronger when the loop is loud; above 50 % it also jumps the pitch by an octave, a fifth or a fourth on the beat. Both knobs open at 0, where SEDA sounds exactly as before.' },
  ],
  controls: [
    ['TIME · SYNC · NOTE · AUTO', '20 to 1200 ms, or the host tempo as a NOTE value from 1/32 to dotted 1/1.'],
    ['FEEDBACK · TONE · COMPANDER · AGE', 'The loop. Feedback up to 110 %. AGE: NEW or OLD.'],
    ['RATE · DEPTH · SHAPE', 'MOD. SHAPE is sine or triangle.'],
    ['MONO · WIDE · PING-PONG · WIDTH · WET HP', 'STEREO.'],
    ['RUNAWAY · CHAOS', 'RUNAWAY pushes the loop past 100 % into a darkening self-oscillation; a red lamp shows when it is over. CHAOS wobbles the clock, and above 50 % steps the pitch on the beat. Both open at 0.'],
    ['MIX', 'Dry to wet.'],
    ['LISTEN · DUCK · THROW', 'Ducks the echo while you play or sing and throws it at the end of the phrase; programs on an LED display.'],
    ['VU meter', 'The analog meter shows the wet level; a red needle shows the duck depth.'],
  ],
  controlsNote: 'Zero latency. Standalone app, VST3 and AU on macOS; standalone app and VST3 on Windows.',
};

// TORNA 1.0.0 (owner 28 Oct "deploy edelim", $12): a graphic equalizer sold on its own like SEDA (not in the family, owner 27 Oct;
// not a tester product; only its own order opens it, no licence key). Facts: 01_AI_Tools/subverselab-analog-eq (STATUS.md 26-28 Oct,
// Source/: PluginProcessor.cpp parameters, Presets.h, PluginEditor.cpp keys). The hardware it models is not named in copy; the panel
// prints "MODEL TR-83" and the rear label "MODELLED PART BY PART FROM A 1983 SERVICE SCHEMATIC". The reverb of the original is parked.
// Images: the plug-in's own ui_snapshot (docs/ui/p2_*_2x.png), resized to 1600 / 1400 / 800 px; og.png = the panel on #033832.
// No checkout yet (CHECKOUT.torna absent): the Buy button renders disabled as "Available shortly" until the LS product is published.
export const TORNA = {
  ...LINE2_COMMON,
  launchId: 'solo', releaseLabel: null, releaseAt: null, noKey: true,
  formats: 'Standalone app, VST3 and AU on macOS (Apple Silicon and Intel); standalone app and VST3 on Windows (64-bit)',
  trust: TRUST_LINE_TORNA,
  // Owner's manual: subverselab-analog-eq/docs/manual/Torna_Manual.html -> tools/make_manual.sh -> this PDF.
  manual: media('/plugins/torna/Torna_Manual.pdf'), manualPage: '/plugins/torna/manual',
  slug: 'torna', name: 'TORNA', displayName: 'TORNA', kind: 'Graphic equalizer', path: '/plugins/torna', model: 'TR-83',
  tagline: 'The hi-fi graphic EQ, back on your desk, with an analyzer glowing in the middle.',
  title: 'TORNA: 12-Band Graphic EQ Plugin with Spectrum Analyzer | SubverseLab',
  description: 'Graphic equalizer plugin: twelve bands from 16 Hz to 32 kHz, ±12 dB, a LEFT and a RIGHT bank, and a spectrum analyzer, modelled part by part from a 1983 service schematic. For the mix bus and the master. Mac and Windows.',
  og: '/plugins/torna/og.png', cardImage: media('/plugins/torna/panel-default.webp'), imageSize: [1600, 602],
  intro: 'Some mixes do not need surgery; they need a balance move. TORNA is a graphic equalizer modelled part by part from a 1983 service schematic: the input stage, the twelve resonators of each channel, the slide pots and the way they are wired, the output stage and its supply rails, and the analyzer’s filters and display. Its bands are broad and overlapping, as on the original, so a few sliders move the whole mix: a smile on the master, weight under the drums, a vocal brought forward. Twelve bands from 16 Hz to 32 kHz, ±12 dB, one bank for the left channel and one for the right, and a spectrum analyzer in the middle. Built for the mix bus and the master bus.',
  defaultMode: 'front',
  modesLabel: 'On the panel',
  modes: [
    { key: 'front', name: 'Front', image: media('/plugins/torna/panel-default.webp'), text: 'Both banks set, the analyzer reading the output, and the EQUALIZER GRAPHIC drawing the response of both channels as computed from the circuit: the left channel bright, the right one thinner.' },
    { key: 'preset', name: 'Preset', image: media('/plugins/torna/panel-preset.webp'), text: 'The VOCAL PRESENCE factory preset, chosen with ◀ PRESET ▶ under the EQUALIZER GRAPHIC: it sets all 24 sliders, and they glide to their new places.' },
    { key: 'rev', name: 'NOR/REV', image: media('/plugins/torna/panel-rev.webp'), text: 'NOR/REV pressed: the curve is reversed, every boost becomes the matching cut and back, and the REVERSE lamp lights.' },
    { key: 'eq-out', name: 'EQ OUT', image: media('/plugins/torna/panel-eq-out.webp'), text: 'EQ IN/OUT pressed: the equalizer is out of the path, the red windows in the slider caps go dark and the graphic draws a flat line.' },
    { key: 'rear', name: 'Rear plate', image: media('/plugins/torna/panel-rear.webp'), text: 'The REAR key turns the unit round. LINE LEVEL sets what full scale means in volts at the input (1, 2 or 4 V), which moves only where the output stage clips; CAP LIGHTS sets the red lights in the slider caps to ON, DIM or OFF.' },
  ],
  sections: [
    { heading: 'Broad bands that work on each other', text: 'The twelve bands sit at 16, 32, 63, 125, 250 and 500 Hz and 1, 2, 4, 8, 16 and 32 kHz, ±12 dB at the slider ends. They are broad and overlapping, as on the circuit they come from, so a few sliders move the whole balance of a mix. LEFT and RIGHT are separate banks; LINK moves them together, COPY L ▸ R and R ▸ L copy one bank to the other, and FLAT returns every slider to 0 dB.' },
    { heading: 'A spectrum analyzer and the true curve', text: 'In the middle sits a spectrum analyzer: twelve band columns, one per slider, and TOTAL for the whole signal. It reads the output or the input (ANALYZER OUT / IN), the left channel, the right or both, and LEVEL sets its sensitivity; it only draws and never changes the sound. Under it the EQUALIZER GRAPHIC draws the real response of both channels, computed from the circuit as you move a slider, with the moved slider’s value on its top line.' },
    { heading: 'Presets and memories', text: 'The ◀ PRESET ▶ keys step through the factory presets: FLAT, MASTER SMILE, MASTER GENTLE, MIX BUS CLEAN, LOW END WEIGHT, VOCAL PRESENCE, DRUM BUS, AIR, LOUDNESS, BRIGHT HI-FI, WARM and RADIO. Hold ▶ for one second to save the 24 sliders as your own preset (USER 01, USER 02 …), listed after the factory ones in every project. MEMORY A, B and C keep three settings with the project: press to recall, hold to store. Double-click a slider to return it to the preset or memory loaded last, or to 0 dB.' },
    { heading: 'The switches of the original', text: 'EQ IN/OUT takes the equalizer out of the path without a click. NOR/REV reverses the curve. ATT −6 dB is the input attenuator, for a hot bus that drives the output stage into its rails. INPUT and OUTPUT set the level before and after the equalizer, ±12 dB. POWER off passes the signal untouched.' },
    { heading: 'The rear plate', text: 'The REAR key at the bottom turns the unit round to its rear plate. LINE LEVEL (1, 2 or 4 V at 0 dBFS, default 2 V) moves only the point where the output stage clips: +19, +13 or +7 dB above full scale. CAP LIGHTS sets the slider-cap lights to ON, DIM or OFF.' },
  ],
  controls: [
    ['Sliders 16 Hz … 32 kHz', 'Twelve per channel, LEFT and RIGHT banks, −12 to +12 dB, default 0 dB.'],
    ['POWER · EQ IN/OUT', 'POWER off passes the signal untouched; EQ OUT takes the equalizer out of the path without a click.'],
    ['ATT −6 dB · NOR/REV · LINK', 'Input attenuator; reverse the curve; move both banks together.'],
    ['INPUT · OUTPUT', 'Level before and after the equalizer, −12 to +12 dB.'],
    ['MEMORY A · B · C', 'Press to recall all 24 sliders, hold one second to store them.'],
    ['COPY L ▸ R · R ▸ L · FLAT', 'Copy one bank to the other, or return every slider to 0 dB.'],
    ['◀ PRESET ▶', 'Step through the factory presets and your own; hold ▶ one second to save the sliders as a user preset.'],
    ['Analyzer: LEFT · RIGHT · LEVEL · ANALYZER', 'Which channel it reads, its sensitivity, and whether it reads the output or the input. Display only.'],
    ['REAR: LINE LEVEL · CAP LIGHTS', '1, 2 or 4 V at full scale (default 2 V); slider-cap lights ON, DIM or OFF.'],
    ['SIZE · ?', 'Window size 75 or 100 %; short help over the panel.'],
  ],
  controlsNote: 'Latency 64 samples at every sample rate from 44.1 to 192 kHz, reported to the host. Standalone app, VST3 and AU on macOS; standalone app and VST3 on Windows.',
};

// The first four of the testers' products (TUTKAL joined them on 2026-10-05: TestersPage uses FAMILY_ONLY_PLUGINS).
export const LAUNCH2_PLUGINS = [KORO, YANKI, HAVA, MIHENK];
// Everything delivered through /launch2 (family and singles; testers get these too): the four above and TUTKAL.
export const FAMILY_ONLY_PLUGINS = [...LAUNCH2_PLUGINS, TUTKAL];

// Launch 1 keeps its own list: PLUGINS is what /plugins, /launch, the account
// downloads and the manuals iterate over, and stays Kubbe and Kaset.
export const PLUGINS = [KUBBE, KASET];
export const ALL_PLUGINS = [...PLUGINS, ...FAMILY_ONLY_PLUGINS];
// The products of the family bundle, in the order the pages list them.
export const FAMILY_PLUGINS = FAMILY_SLUGS.map((slug) => ALL_PLUGINS.find((p) => p.slug === slug));

// RU-8 Rhythm Unit (owner 15 Oct: exempt from the freeze). Facts from 01_AI_Tools/subverselab-ru8 (SPEC.md, STATUS.md,
// media/CURRENT). Sales: RU8_CHECKOUT above (null = not listed anywhere; set = solo, like ELEK, $25).
// Owner 16 Oct: macOS and Windows at launch (the "2 years of free updates" line was dropped 7 Nov, no term is promised), copy without kit / set / preset / pad counts, leading
// with use, the interface and the sound. Images: media/CURRENT stills (16 Oct 18:07; 3D 16:05); the old silent teasers are gone.
// 1.1.0 copy (8 Nov): sample kits (job21), synth kit redesign + EDIT screen + user samples / user kits (job22), HUMAN groove;
// facts from RU-8 STATUS.md (7-8 Nov), SPEC.md and Source (Help.cpp, RU8UserSamples*.h, RU8Sequencer.h groove()). Still no counts.
export const RU8 = {
  ...LINE2_COMMON,
  launchId: 'solo', noKey: true,
  // Owner's manual (owner 20 Oct): subverselab-ru8/docs/manual/RU8_Manual.html -> tools/make_manual.sh -> this PDF.
  manual: media('/plugins/ru8/RU8_Manual.pdf'), manualPage: '/plugins/ru8/manual',
  slug: 'ru8', name: 'RU-8', displayName: 'RU-8', kind: 'Drum machine', path: '/plugins/ru8', model: 'Rhythm Unit',
  formats: 'Standalone app, VST3 and AU instrument on macOS; standalone app and VST3 on Windows',
  trust: TRUST_LINE_RU8,
  modesLabel: 'On the panel',
  tagline: 'A drum machine you play, not program. Press play and the groove is there.',
  title: 'RU-8 Drum Machine Plugin (VST3, AU) for Mac and Windows | SubverseLab',
  description: 'Drum machine plugin and app: synth kits and recorded sample kits, your own WAV or AIFF samples on any pad, an EDIT screen for every pad, a drummer’s groove, A/B rhythms with fill and auto, and MIDI drag-out.',
  og: '/plugins/ru8/og.jpg', cardImage: media('/plugins/ru8/panel-cream.webp'), imageSize: [1600, 1116],
  intro: 'Open RU-8, press play, and the groove is already running. Pick a kit and the whole machine changes its sound; pick a set and only the rhythm changes, so a trap rhythm on a lo-fi kit is one click away. Every pad carries its own steps, so you shape the beat pad by pad, by hand, and drag it into your DAW as MIDI when it feels right. Synth kits, recorded sample kits, or your own samples dropped on any pad. Strong without being pushed, clean by default.',
  defaultMode: 'cream',
  modes: [
    { key: 'cream', name: 'Cream', image: media('/plugins/ru8/panel-cream.webp'), text: 'The default face. The pad bed in the middle, the channel strip for the selected pad on the left, SPACE and ECHO on the right, the readout on top.' },
    { key: 'night', name: 'Night', image: media('/plugins/ru8/panel-night.webp'), text: 'The same machine in the dark: same sound, the panel you like to look at.' },
    { key: 'powder', name: 'Powder', image: media('/plugins/ru8/panel-powder.webp'), text: 'Powder: a soft, cool face for the same controls.' },
    { key: 'pink', name: 'Pink', image: media('/plugins/ru8/panel-pink.webp'), text: 'Pink: a warm face for the same controls.' },
    { key: 'rear', name: 'Rear panel', image: media('/plugins/ru8/panel-rear.webp'), text: 'Turn the machine around: COLOR (tape, dust and crush), the MIDI note map and the outputs.' },
  ],
  sections: [
    { heading: 'Play first, program later', text: 'Press play and RU-8 runs a full rhythm from the start. A and B switch on the next bar, FILL drops a fill on the next bar, and AUTO plays A, a fill, B and a fill by itself, so you can jam over it before you touch a single step.' },
    { heading: 'Pads that carry their own steps', text: 'Each pad holds its own pattern of steps, so the kick, the snare and the hats are written separately and layered on the grid. Notes from your DAW or a controller play the pads at the same time as the sequencer, with velocity.' },
    { heading: 'Kits bring the character, sets bring the rhythm', text: 'Pick a kit and the whole machine changes its sound: the drums, and the settings of SPACE, ECHO and GLUE that go with them. Pick a set and only the rhythm changes. Any set plays on any kit, so a trap rhythm on a lo-fi kit is a valid sound. Loading either one makes the knobs glide to their new values.' },
    { heading: 'New in 1.1', text: 'Sample kits: recorded drum kits beside the synth kits. The synth kits redesigned: a softer hit also sounds darker, and recordings sit under the synthesis on the hats, claps, shakers, tambourines, rides, the kick’s beater and the snare’s wires. The EDIT screen for every pad. Your own WAV and AIFF samples on any pad, and user kits you save. HUMAN is now a drummer’s groove.' },
    { heading: 'Synth kits and sample kits', text: 'The synth kits are drums synthesized inside RU-8, so tune, decay and level reshape the drum itself; a softer hit sounds darker as well as quieter, and LAYER mixes in the recording under the synth voice. The sample kits play recorded drums: Uptown, Basement, Sweatbox, Hallway, Cellar, Parlor, Drill, Warehouse and Hardware, from close-miked real kits to slide 808s and sampler drums. SPACE is an algorithmic reverb with ROOM, PLATE and HALL; ECHO is a tempo-synced ping-pong delay. Every pad has its own send to each, so the snare can sit in the room while the kick stays dry.' },
    { heading: 'The EDIT screen', text: 'Press EDIT and the readout shows the selected pad: its sound, the sample or the last hit, with the envelope of the next hit drawn over it. The knobs take their second names in gold: START, END, ATTACK, FINE, FILTER, RESO, DRIVE, VEL>TONE, LAYER, CHOKE and WEIGHT (SWEEP and NOISE in place of START and END on synth pads). The knob you turn shows its own picture at once: the filter curve with its resonance, the drive curve, the pan, the space tail, the echo repeats, and fades when you let go. One page, no menus; the window never changes size.' },
    { heading: 'Your own samples, your own kits', text: 'Drop WAV or AIFF files on any pad of any kit, any sample rate or bit depth, mono or stereo. Put up to 8 on one pad and they play by chance, each with its own WEIGHT, and RU-8 avoids the same one twice in a row; REVERSE plays backwards and CLEAR brings the kit’s sound back. Files longer than 20 seconds are cut at 20 seconds. RU-8 keeps a copy in its user library, so a project still opens after the originals move. The User kit starts empty; SAVE stores it as a user kit that steps after the factory kits, and you can save as many as you like.' },
    { heading: 'A drummer’s groove', text: 'HUMAN no longer just shakes the timing. At 100 % the kick stays on the grid, the snare, clap and rim lie back by up to 12, 10 and 8 ms, the off-16th hats come lazy (8 ms late) and softer, the off-8th hats a little softer, and the whole kit’s time breathes by up to ±4 ms. It is fixed by bar and step, so a bounce repeats exactly.' },
    { heading: 'Clean by default', text: 'A gentle glue on the bus and a safety limiter at −1 dBFS, nothing more. Character that needs tape saturation, dust or bit reduction comes from a kit’s COLOR on the rear panel, and most kits leave it off.' },
    { heading: 'An interface you can read', text: 'One panel, no hidden pages: the pad bed, the channel strip of the selected pad and the effects all in view. The panel scales up for large screens, “?” opens help as notes over the panel, and the moods change only the colours.' },
    { heading: 'Kits from analog to Anatolia', text: 'The synth kits run from a sine-sub Analog and a clicky Punch to Trap with a long 808, Brush with a jazz ride, FM-bell Glass, dusty Lo-fi, an acoustic Breaks kit and Anatolia with darbuka, bendir, def and zil; the sample kits follow, then the User kit for your own samples. The sets cover House, Techno, Disco, Rock, Funk, Boom bap, Trap, Lo-fi, Breakbeat, Drum & bass, Dembow, Bossa nova, Afrobeat, Ciftetelli, Jazz brush, Electro and Shuffle, plus four empty USER sets saved with your project.' },
    { heading: 'The rear panel and the MIDI map', text: 'Turn the machine round for COLOR (tape, dust and crush), the note map and the output. The pads answer General MIDI drum notes by default (C1 is the kick), or notes 36 to 51 from pad 1 up; C-1, D-1, E-1 and F-1 switch to A, B, a bar of fill and off at their exact sample, so a DAW lane or a controller can arrange RU-8.' },
    { heading: 'Take the rhythm with you', text: 'Drag the selected pad’s pattern, or the whole drum, from the panel onto a track in your DAW as a MIDI clip: standard MIDI, channel 10, with the swing written into the timing. Inside a host the steps follow the host’s timeline, so the same project plays and bounces the same way every time.' },
  ],
  controls: [
    ['KIT', 'Large readout with arrows. Loading a kit moves its channel, SPACE, ECHO and GLUE values; the knobs glide.'],
    ['SET', 'Small readout with arrows. Loads both sections, the tempo, the swing and the echo time, and lands on the next bar while playing.'],
    ['A · B · FILL · AUTO', 'Switch section, play a fill, or let RU-8 arrange them.'],
    ['TEMPO · SWING · HUMAN', 'Tempo (standalone; the plug-in follows the host), swing, and HUMAN: a drummer’s groove, the snare laid back, lazy 16th hats, the time breathing.'],
    ['GLUE · VOLUME', 'Bus compressor and master volume, before the −1 dBFS limiter.'],
    ['Channel strip', 'For the selected pad: level, tune, decay, pan, and its sends to SPACE and ECHO, plus mute and solo.'],
    ['EDIT', 'The selected pad up close: its sound and envelope in the readout, START, END, ATTACK, FINE, FILTER, RESO, DRIVE, VEL>TONE, LAYER, CHOKE and WEIGHT on the knobs; REVERSE, OPEN, CLEAR and SAVE.'],
    ['Your samples', 'Drop WAV or AIFF on any pad, up to 8 per pad played by chance; save the User kit as your own kit.'],
    ['SPACE', 'ROOM, PLATE or HALL, with size, damping, pre-delay and return.'],
    ['ECHO', 'Tempo-synced ping-pong: note value, feedback, tone and return.'],
    ['COLOR (rear)', 'TAPE, DUST and CRUSH, set per kit.'],
    ['MIDI', 'Host notes and controllers play the pads; patterns drag out as MIDI clips.'],
    ['Moods', 'Cream, Night, Powder and Pink. Colour only.'],
  ],
  controlsNote: 'Drag a knob up or down; double-click returns it to the value of the kit or set that is loaded now. “?” opens help over the panel.',
};

// JING FANG microtonal synthesizer (sold on its own, $60, like RU-8). Facts from 01_AI_Tools/subverselab-studio (SPEC.md, STATUS.md,
// marketing/social/captions.md). Copy rules (owner): the first lines say what it does to sound; no name meaning or origin story, no
// tradition / makam names, no counts of presets or products, no "AI", "beta", "coming soon" or "free". Images: the real panel on
// #033832 from the JING FANG lead session (marketing/site/), web copies in public/plugins/jingfang/.
// Not claimed: MTS-ESP (not in this version). MPE and GENERATE shipped (1.1.0 / 1.2.0, STATUS.md). Facts checked by the lead session 19 Oct, GENERATE and MIDI clips 28 Oct;
// the DAW lines (host tempo / bar lock, MIDI clip drag-out) are tested against a fake host only: verify in a real DAW before release.
// 1.4.0 (J1, 7 Nov 2026): the camera (1.3.0, tester only until now) and the sign-in (owned-only, no trial: api/trialGrant.js
// GRANT_PRODUCTS; the plug-in plays nothing until the computer is signed in with the buying account). noKey stays true: no key is
// shown or typed; the activation line says how the sign-in works.
export const JINGFANG_ACTIVATION = 'After you buy, sign in with your SubverseLab account inside JING FANG (it opens your browser); there is no key to type.';
export const JINGFANG = {
  ...LINE2_COMMON,
  launchId: 'solo', noKey: true,
  activation: JINGFANG_ACTIVATION,
  // Owner's manual (owner 20 Oct): subverselab-studio/docs/manual/JingFang_Manual.html -> tools/make_manual.sh -> this PDF.
  manual: media('/plugins/jingfang/JingFang_Manual.pdf'), manualPage: '/plugins/jingfang/manual',
  releaseLabel: null,
  releaseAt: null,
  slug: 'jingfang', name: 'JING FANG', displayName: 'JING FANG', kind: 'Microtonal synthesizer', path: '/plugins/jingfang', model: 'JF-53',   // the box mockup's model line (marketing/mockups/jingfang_box_*.png)
  formats: 'Standalone app, VST3 and AU instrument on macOS (Apple Silicon and Intel); standalone app and VST3 on Windows (64-bit)',
  trust: TRUST_LINE_JINGFANG,
  modesLabel: 'On the panel',
  tagline: 'A synthesizer that plays between the keys.',
  title: 'Microtonal Synth VST and AU with a Tuning Lab: JING FANG | SubverseLab',
  description: 'Microtonal synthesizer plugin: a 3-row keyboard on a 53-step grid (or any equal grid), a Tuning Lab that learns a tuning from a recording, Scala in and out.',
  og: '/plugins/jingfang/og.png', cardImage: media('/plugins/jingfang/card-bg.webp'), imageSize: [1400, 914],
  intro: 'JING FANG plays between the keys. Out of the box it is a normal synthesizer: every key plays its usual note, from any MIDI keyboard, your DAW or the computer keyboard. Press MICRO and the keyboard opens into three rows: the usual notes in the middle, each note one step higher above and one step lower below, on a 53-step grid (22.64 cents a step) by default or any grid from 5 to 96 steps. Now the notes of a maqam melody sit exactly where they belong. Around it is a complete instrument: three oscillators, a filter, FM, a drum mode, drive, echo and reverb, a patch bay, an arpeggiator, a step sequencer and a drum machine, with GENERATE to write their patterns for the sound you have loaded.',
  defaultMode: 'main',
  modes: [
    { key: 'main', name: 'Panel', image: media('/plugins/jingfang/panel-main.webp'), text: 'The whole synthesizer on one face: three oscillators, the filter, two envelopes, FM, drive, echo and reverb, and the 3-row keyboard.' },
    { key: 'micro', name: 'MICRO', image: media('/plugins/jingfang/panel-micro.webp'), text: 'MICRO on: the keys that sit a step higher or lower light on their rows, with their offset in cents.' },
    { key: 'patch', name: 'PATCH', image: media('/plugins/jingfang/panel-patch.webp'), text: 'The patch bay: three LFOs and cables, each cable with its own amount.' },
    { key: 'seq', name: 'SEQ', image: media('/plugins/jingfang/panel-seq.webp'), text: 'The arpeggiator and the 16-step sequencer: every step has a note, velocity, gate, probability, ratchet, row, slide and accent.' },
    { key: 'drum', name: 'DRUM', image: media('/plugins/jingfang/panel-drum.webp'), text: 'The drum machine: a sound on every track, steps with accents.' },
    { key: 'lab', name: 'LAB', image: media('/plugins/jingfang/panel-lab.webp'), text: 'The Tuning Lab: learn a tuning from a recording, morph between two tunings, see every interval you hold.' },
  ],
  sections: [
    { heading: 'A normal synthesizer until you ask for more', text: 'Every key is its usual note until you press MICRO, so any MIDI keyboard, pad controller, DAW piano roll or the computer keyboard works with no setup. In MICRO each note name sits on its low, usual or high row: click the strip above the keyboard, right- or Alt-click a key, or send keyswitches from your controller while you play. A4 sets the reference pitch (415 to 466 Hz), and the rows are part of the preset, so SAVE and your DAW project keep them. An MPE controller plays with per-note pitch bend, pressure (level) and slide (brightness).' },
    { heading: 'Learn a tuning from a recording', text: 'Give the Tuning Lab a WAV, AIFF or FLAC of a solo line and it measures the steps the player really used; a step that sounds lower on the way down than on the way up keeps both values, and DIRECTION plays the falling one when the melody comes down. Load Scala .scl / .kbm files or the built-in tunings in 53 commas, maqam tunings among them; MORPH moves every key from one tuning to another with one knob, WHAT SOUNDS shows each interval you hold with its nearest simple ratio and beat rate, adaptive just intonation settles chords on pure ratios, and EXPORT writes your tuning back out as Scala files.' },
    { heading: 'A full instrument around it', text: 'Three oscillators (saw, square with pulse width, triangle, sine, white or pink noise and a plucked string, each with unison up to 8, detune and spread), a LP / BP / HP / notch filter with drive, amp and filter envelopes with curves, FM from oscillator 2, and a drum mode with a pitch envelope, a click layer and choke groups. Every sound carries its own effects rack: EQ, a compressor, drive, chorus, flanger or phaser, a tempo-synced echo (ping-pong, stereo, mono or tape) and a reverb; and the patch bay lays cables from three LFOs, the envelopes, velocity, key, mod wheel, aftertouch and random to pitch, levels, pulse width, cutoff, resonance, drive, FM, pan and more. Every part of the panel has its own preset slot, so a sound can take its oscillators from one preset and its filter from another.' },
    { heading: 'Patterns inside, made for the DAW', text: 'An arpeggiator with chord shapes, a 16-step sequencer whose steps can sit on their high or low row and carry their own velocity, probability and ratchet, and an 8-track drum machine live inside the presets, as on a hardware synthesizer. GENERATE writes a melody, bass line, chords or arp rhythm for the loaded sound, and a beat for the drum machine; roll again for another, or step back through the last 16. Started one after the other, the sequencer and the drum machine join the same grid. In a DAW JING FANG follows the host tempo, starts and stops with it and stays locked to its bar; switch SEQ or DRUM to MIDI to play them from your own notes, or drag a sequence or a beat onto a track as a MIDI clip.' },
  ],
  // Owner 19 Oct: "ürün odasını mihenkteki gibi hazırlayalım": the room walks through the panel, one cropped part per step (as MIHENK).
  // Crops from the lead session's stills by window rects: subverselab-ru8/marketing/tools/jf_tour_images.py.
  tour: {
    heading: 'How JING FANG works',
    lead: 'A full synthesizer that plays like any other, until you open the notes between the keys.',
    steps: [
      { key: 'keys', img: media('/plugins/jingfang/tour/keys.webp'), w: 1400, h: 187, heading: 'Three rows of keys',
        text: 'Press MICRO and every note name plays on one of three rows: its usual pitch, the high row or the low row. Move a note to another row by clicking the strip above the keyboard, or with a right-click or Alt-click on a key; it moves for that note name in every octave. A key that sits off its usual pitch lights on its row while it plays, with its offset in cents.' },
      { key: 'tuning', img: media('/plugins/jingfang/tour/tuning.webp'), w: 932, h: 208, heading: 'A grid of your choice',
        text: 'The octave is divided into equal steps: 53 by default (22.64 cents a step), anything from 5 to 96. The high and the low row each sit 0 to 12 steps from the usual note, one step by default, and A4 is set between 415 and 466 Hz. With KEYSWITCH on, 24 keys from C1 (the start key can be moved) send a note to its low row (first octave) or high row (second octave) while you play, and never sound. The rows are part of the preset, so SAVE keeps them and your DAW project remembers them.' },
      { key: 'lab', img: media('/plugins/jingfang/tour/lab.webp'), w: 1400, h: 698, heading: 'The Tuning Lab',
        text: 'LAB lets the Tuning Lab decide every pitch. Give it a WAV, AIFF or FLAC of a solo line and it finds the steps the player used; when a step sounds lower on the way down than on the way up, it keeps both, and DIRECTION plays the falling value when the melody comes down. Load a Scala .scl / .kbm file, or one of the built-in tunings in 53 commas, onto card A or B; MORPH moves every key from one to the other with one knob. WHAT SOUNDS shows each interval you hold in cents, its nearest simple ratio, how far off it is and its beat rate. Adaptive just intonation settles a new note on the nearest pure ratio within a window you set, and EXPORT writes your tuning back out as .scl and .kbm.' },
      { key: 'presets', img: media('/plugins/jingfang/tour/presets.webp'), w: 1400, h: 262, heading: 'Build a sound out of other sounds',
        text: 'Every part of the panel has its own preset slot. Take the oscillators from a lead, the envelope from a pad and the filter from a bass, and save the mix as yours. The tempo sits beside the preset name; in a DAW it is the host’s.' },
      { key: 'voices', img: media('/plugins/jingfang/tour/voices.webp'), w: 1400, h: 289, heading: 'Three oscillators and a filter',
        text: 'Each oscillator has its own type, level, octave, semi, fine, pan, unison, detune and spread. The filter is low-pass, band-pass, high-pass or notch, with drive and key, envelope and velocity amounts.' },
      { key: 'shape', img: media('/plugins/jingfang/tour/shape.webp'), w: 1400, h: 165, heading: 'Envelopes, and a drum mode',
        text: 'Amp and filter envelopes with their own curves. The drum mode adds a pitch envelope and a click layer, so kicks, snares and percussion come out of the same synthesizer.' },
      { key: 'fx', img: media('/plugins/jingfang/tour/fx.webp'), w: 1400, h: 115, heading: 'An effects rack on every sound',
        text: 'Every preset carries its own drive, echo and reverb, so a sound arrives finished. FX RACK in the reverb\'s title bar opens the rest: an EQ with its curve, a compressor with its gain reduction, chorus, flanger or phaser, and the echo type (ping-pong, stereo, mono or tape).' },
      { key: 'patch', img: media('/plugins/jingfang/tour/patch.webp'), w: 1400, h: 698, heading: 'The patch bay',
        text: 'Three LFOs and cables. Drag from a source to a destination; every cable has its own amount. Pull a cable out to remove it.' },
      { key: 'seq', img: media('/plugins/jingfang/tour/seq.webp'), w: 1400, h: 698, heading: 'Arpeggiator and step sequencer',
        text: 'One key can play a whole pattern. In the step sequencer every step has a note (up to three chord notes on top), velocity, gate, slide and accent, and its own ROW switch, so a phrase can step onto the high or low row by itself. The Sequence - Micro and Sequence - Lab presets are phrases written that way: the Lab ones load a built-in tuning with them. Every step also has a velocity, a probability and a ratchet lane (up to four hits in a step), and the pattern runs forward, in reverse, back and forth or at random; a bar plays the same way on every pass, so a render matches what you heard. Press PLAY, go back to the panel and play on top.' },
      { key: 'drum', img: media('/plugins/jingfang/tour/drum.webp'), w: 1400, h: 698, heading: 'A drum machine inside',
        text: 'A sound on every track and steps with accents. Patterns live inside the presets, as on a hardware synthesizer, and drag out to your DAW as MIDI. Start the drums while the sequencer runs, or the other way round, and the second one joins the first one\'s grid.' },
    ],
    practical: [
      'Out of the box it is a normal synthesizer: every key is its usual note until you press MICRO.',
      'Labels show the note, an arrow and the cents, nothing else.',
      'In the standalone app the computer keyboard plays the rows in MICRO: the Z row is low, the A row is the usual pitch, the Q row is high (QWERTY-type layouts).',
      'A sequence or drum pattern dragged into your DAW is a MIDI clip. With no step on its high or low row it is plain notes; with raised or lowered steps every note gets its own MIDI channel and pitch bend (MPE-style), so chord notes keep their cents too. The keyboard\'s MICRO rows stay in the project, not in the clip.',
      'Standalone app, VST3 and AU instrument on macOS (Apple Silicon and Intel); standalone app and VST3 on Windows (64-bit).',
      'MPE: per-note pitch bend, pressure to level and slide (CC74) to brightness; the zones come from your controller\'s MPE setup. In LAB mode MPE notes play without per-note expression.',
      'The camera: CAMERA on the title band shows a part of the panel, closer, for a recording, a stream or a lesson. Click a module on its map, or let FOLLOW keep the open page or the module you touch in view. Only the view moves; the sound does not change.',
      'Sign in once on each of your computers with the account that bought JING FANG: the browser opens, there is no key to type. It then plays offline, and renews the sign-in by itself every few days when the computer is online.',
      'Not in this version: MTS-ESP, and free cents offsets per single key.',
    ],
  },
  controls: [
    ['OSC 1 · 2 · 3', 'Each with its own type, level, octave, semi, fine, pan, unison, detune and spread.'],
    ['FILTER', 'LP, BP, HP or notch, with cutoff, resonance, drive, key, envelope and velocity amounts.'],
    ['AMP ENV · FILTER ENV', 'Attack, decay, sustain and release, with curves.'],
    ['FM', 'Oscillator 2 modulates 1, 3 or both.'],
    ['PITCH · CLICK · DRUM', 'Drum mode: a pitch envelope and a click layer for kicks, snares and percussion.'],
    ['DRIVE · ECHO · REVERB', 'On every sound; the echo follows the tempo.'],
    ['FX RACK', 'Behind the key in the reverb title bar: EQ, compressor, chorus / flanger / phaser and the echo type.'],
    ['TUNING', 'GRID (5 to 96 steps, 53 by default), A4 (415 to 466 Hz), HIGH ROW and LOW ROW (0 to 12 steps), KEYSWITCH and its start key.'],
    ['PLAY: NORMAL · MICRO · LAB', 'Usual notes; every note name on its low, usual or high row; or the Tuning Lab deciding every pitch.'],
    ['PATCH · SEQ · DRUM', 'The patch bay, the step sequencer and the drum machine, each on its own page.'],
    ['GENERATE', 'On SEQ: ROLL, RHYTHM and NOTES write a pattern for the loaded sound; DENSITY, COMPLEX, MUTATE, RANGE, MICRO and a scale shape it. On DRUM: ROLL writes a beat, with DENSITY, COMPLEX and MUTATE. < > steps through the last 16 rolls.'],
    ['Preset slots', 'Every panel takes its settings from a preset of your choice.'],
  ],
  controlsNote: 'Drag a knob up or down; double-click returns it to the value of the preset that is loaded now. “?” opens help over the panel.',
};

// ELEK: a standalone stem separation app (plus VST3 and AU), sold on its own. Not in the family (FAMILY_SLUGS, SOLD_SINGLY),
// not a tester plugin, not in the launch2 counter; the server opens it for a paid ELEK order only (entitlements.js SOLO_SLUGS,
// download ticket launchId 'solo'). ELEK has no in-app licence check (noKey, like RU-8 / SEDA; JING FANG signs in from 1.4.0): the download is the gate.
// $25 regular, $7 until 1 December 2026 (LAUNCH_PRICES / LAUNCH_ENDS). PluginRoom.jsx draws the page.
export const ELEK = {
  launchId: 'solo', noKey: true,   // no licence check in the app (Elek_Manual, STATUS): no key is shown or asked for
  releaseLabel: null,
  releaseAt: null,
  titleSuffix: ' | SubverseLab',
  modesLabel: 'In the app',
  manual: media('/plugins/elek/Elek_Manual.pdf'),
  manualPage: '/plugins/elek/manual',
  demos: [],
  notYet: [],
  slug: 'elek', name: 'ELEK', displayName: 'ELEK', kind: 'Stem separation app', path: '/plugins/elek', model: 'EK-84',
  formats: 'Standalone app, VST3 and AU on macOS (Apple Silicon and Intel); standalone app and VST3 on Windows (64-bit).',
  tagline: 'Stems, vocal removal, key and tempo, all on your own computer.',
  title: 'Stem Splitter and Vocal Remover for Mac and Windows: ELEK | SubverseLab',
  description: 'Stem separation app: split a track into vocals, drums, bass and other, remove the vocal, or read tempo and key. It runs on your computer; nothing is uploaded.',
  // The card shows the app window, as every other card shows its panel. The launch covers (cover.png 1600x1600 for Lemon
  // Squeezy, elek_card_4x5.png for Instagram) carry their own text and price and are not used on the site; og.png is the share image.
  og: '/plugins/elek/og.png', cardImage: media('/plugins/elek/elek_ui_done.png'), imageSize: [1000, 760],
  intro: 'Need the acapella for a remix, the drums to study, or an instrumental to sing over? Drop a track into ELEK and choose: four stems (vocals, drums, bass and other), vocal removal, or just the tempo and key. It all runs on your computer, so your music never leaves it. Every result is saved in its own folder, named so you can find it, and kept in a list you can reopen.',
  defaultMode: 'library',
  modes: [
    { key: 'library', name: 'Start screen', image: media('/plugins/elek/elek_ui_empty.png'), text: 'Drop a track, or reopen an earlier separation from the list.' },
    { key: 'choose', name: 'Choose', image: media('/plugins/elek/elek_ui_ready.png'), text: 'The file is loaded; nothing runs until you choose what to do.' },
    { key: 'mixer', name: 'Mixer', image: media('/plugins/elek/elek_ui_done.png'), text: 'Four stems in the mixer, with tempo, key and Camelot on top.' },
  ],
  sections: [
    { heading: 'Three operations, one choice', text: 'Stem separation writes vocals, drums, bass and other. Vocal removal writes the vocal and the instrumental. Key & BPM reads the tempo, the musical key, its Camelot code and how sure the reading is, without separating anything. Nothing starts when you drop a file: you pick the operation first.' },
    { heading: 'Clean joins, no seams', text: 'The separation engine is HT-Demucs, run over overlapping windows with a cross-fade, so the stems have no clicks where the windows meet. The instrumental is the mix minus the vocal, so nothing that is not the voice is lost.' },
    { heading: 'Any file, lined up to the sample', text: 'WAV, AIFF, MP3 and FLAC, mono or stereo, at any sample rate. Files that are not at 44.1 kHz are converted for the engine and the stems come back aligned to the original to the sample, as 24-bit WAV at 44.1 kHz, ready to drop under the track in your DAW.' },
    { heading: 'Named so you can find them', text: 'Every run gets its own folder in Music/ELEK. Files carry the track name, the stem, the tempo and the key, for example Bir Araya Gelemeyiz_Vocals_144BPM_Bmin_ELEK.wav. The key is written into the name only when the reading is decisive; the window always shows it with its confidence.' },
    { heading: 'Earlier separations, one click away', text: 'The start screen lists your earlier runs, newest first, until you delete the files. Click one and it opens in the mixer again, with its tempo and key.' },
    { heading: 'Listen before you take it', text: 'Play all stems together, click any waveform to jump, mute, solo and set the level of each stem. Grab a stem\'s waveform and drag it onto a track in your DAW, or open the folder.' },
    { heading: 'How fast', text: 'Measured on an Apple M2 with 8 GB of memory: a four-minute track separates into four stems in about three and a half minutes; tempo and key take a few seconds. 8 GB of memory is enough; separation uses about 2.4 GB at its peak.' },
  ],
  controls: [
    ['DROP / CHOOSE FILE', 'Load a track; it is only loaded, nothing runs yet.'],
    ['KEY & BPM', 'Tempo, key, Camelot and confidence, no separation.'],
    ['VOCAL REMOVAL', 'Vocals and instrumental as WAV.'],
    ['STEM SEPARATION', 'Vocals, drums, bass and other as WAV.'],
    ['MIXER', 'Play, seek, mute, solo and level for each stem; drag a waveform into your DAW.'],
    ['WAV', 'Drag a stem into your DAW, or click to show the file.'],
    ['EARLIER SEPARATIONS', 'Reopen any earlier run that is still on disk.'],
    ['AUDIO OUTPUT', 'Choose the output device (standalone app).'],
  ],
  controlsNote: 'Everything runs on your computer. No account is needed to use the app once it is installed.',
};
// AHENK, a piano instrument (prepared 7 Nov 2026; on the site only once AHENK_CHECKOUT is set). Every fact below is from
// 01_AI_Tools/subverselab-fazilsay: docs/manual/AHENK_Manual.html and STATUS.md (7 Nov: 30-day trial, free mode, browser sign-in).
// Copy rules (root CLAUDE.md): no "AI" / "beta" / "coming soon", no counts of SubverseLab products, no name meaning or origin story.
// Not claimed (not in those files): dragging MIDI from the panel into a DAW (the MIDI button writes a .mid file), iPhone / iPad and
// the App Store (owner: not yet). Own look (owner exception, 6 Nov): no model line, its own app pictures, no family visuals.
// Trial: the full product for 30 days from the first open, no sign-in needed (api/trialGrant.js TRIAL_PRODUCTS, machine-bound); after it the free mode
// (Source/Licensing/Features.h: the upright with the LIP and LID ORTF stands). Sign-in: the browser device flow (/activate), no key.
export const AHENK_TRIAL_LINE = 'Free 30-day trial: the full AHENK for 30 days, starting the first time you open it.';
export const AHENK_FREE_AFTER_LINE = 'After the trial AHENK keeps playing for free: the upright piano with two microphones.';
export const AHENK_ONE_PURCHASE_LINE = 'One purchase opens it on Mac and Windows.';
export const AHENK_ACTIVATION = 'After you buy, sign in with your SubverseLab account inside AHENK (it opens your browser); there is no key to type.';
export const AHENK = {
  ...LINE2_COMMON,
  launchId: 'solo', noKey: true,
  activation: AHENK_ACTIVATION,
  trialLines: [AHENK_TRIAL_LINE, AHENK_FREE_AFTER_LINE, AHENK_ONE_PURCHASE_LINE],
  // The installer is a free download for any signed-in account (download ticket launchId 'trial', api/trialGrant.js TRIAL_PRODUCTS):
  // the room shows "Download free trial" next to Buy. Switches on with the room (AHENK_CHECKOUT).
  trial: true,
  releaseLabel: null,
  releaseAt: null,
  slug: 'ahenk', name: 'AHENK', displayName: 'AHENK', kind: 'Piano instrument', path: '/plugins/ahenk', model: '',   // no model line (owner exception)
  formats: 'Standalone app, VST3 and AU instrument on macOS (Apple Silicon and Intel); standalone app and VST3 instrument on Windows (64-bit)',
  trust: TRUST_LINE_AHENK,
  manual: media('/plugins/ahenk/AHENK_Manual.pdf'), manualPage: '/plugins/ahenk/manual',   // web manual: src/data/manuals/ahenk.js; AHENK manual 1.0, 19 pages, without the iPhone / iPad chapter (fazilsay docs/manual, 7 Nov)
  modesLabel: 'In the app',
  tagline: 'A sampled piano on a stage: choose the piano, place the microphones, pick the hall, and play.',
  title: 'Sampled Piano VST3 and AU with Microphones, Halls and a Score Page: AHENK | SubverseLab',
  description: 'Sampled piano instrument: four pianos, microphone positions around them, measured halls, and a score page that plays and writes MusicXML and MIDI. Free 30-day trial.',
  og: '/plugins/ahenk/og.jpg', cardImage: media('/plugins/ahenk/card-bg.webp'), imageSize: [1000, 640],
  intro: 'AHENK is a sampled piano that you place on a stage. Choose the piano, put the microphones where they really stood when it was recorded, pick the hall, and play it from a MIDI keyboard, by clicking the keys on the panel, or with the computer keys in the macOS app. Or let it play: open a MusicXML or MIDI score and the piano on stage plays it through your microphones and your hall. You can write your own notes on the same page and save them as MusicXML or MIDI.',
  defaultMode: 'stage',
  modes: [
    { key: 'stage', name: 'Stage', image: media('/plugins/ahenk/panel-stage.webp'), text: 'The concert grand on stage with two microphones: the PIANO RACK on the left, the MIC RACK on the right, the hall on top and all 88 keys below.' },
    { key: 'pianos', name: 'Pianos', image: media('/plugins/ahenk/panel-pianos.webp'), text: 'Choosing a piano, with the settings of the LID ORTF microphone open over the stage: level, room, type and its reverb, delay and echo sends.' },
    { key: 'hall', name: 'Halls', image: media('/plugins/ahenk/panel-hall.webp'), text: 'The Chamber theatre. The hall selector changes the room and the picture together, and you can change it while you play.' },
    { key: 'score', name: 'Score', image: media('/plugins/ahenk/panel-score.webp'), text: 'A score open on the SCORE page: the hands and voices as layers, the loop, the tempo and the count-in, with the piano on stage playing it.' },
  ],
  sections: [
    { heading: 'Pianos from real recordings', text: 'Every piano in AHENK comes from real recordings, note by note and at many strengths: a 274 cm concert grand with its lid fully open, a 200 cm studio grand, a felt-damped upright and a short baby grand. Each piano is a separate choice in the installer, so you install only the ones you want. Through the factory setup Stage the pianos are matched in loudness, so switching pianos does not jump in level.' },
    { heading: 'Microphones where they really stood', text: 'Around the piano stand nine microphone positions, from over the strings to a dummy head in the hall. On each piano one or two of them are the microphones it was recorded with; the others are computed from those recordings, so every position can be heard on every piano. One click sends a microphone to its place and switches it on. Each has its own level, a choice of microphone character, more of the recorded room on the LID and HOUSE stands, and its own reverb, delay and echo.' },
    { heading: 'The hall around it', text: 'Recorded is the room each piano was recorded in, nothing added. Recital room, Chamber theatre and Concert hall are measured rooms; Stone church and Live room are built. Every microphone gets the hall according to its distance from the piano, the close ones a little and the house positions more, and the change fades over in about a tenth of a second.' },
    { heading: 'Stage setups', text: 'A stage setup is everything on the stage: the microphones, their settings, OUT and the hall, and it can bring a piano. The factory setups run from close and intimate through church, live room and wide pairs to microphone colour, echo and delay, and headphones; SAVE keeps your own. When a setup loads, the knobs glide to their new values while the sound changes at once; double-click returns a knob to the value of the setup that is loaded now.' },
    { heading: 'A score page that plays', text: 'Open a MusicXML (.musicxml, .xml, .mxl) or MIDI (.mid, .midi) file, or drop it on the panel, and the piano on stage plays it. Loop the piece or whole bars, set the tempo from 50 to 150 %, count in one or two bars, and mute or solo each hand, each voice, the other parts and the pedal.' },
    { heading: 'Write notes, keep them as MusicXML or MIDI', text: 'NEW starts a blank score in any major or minor key. In WRITE the computer keys, the mouse or a MIDI keyboard write the notes: lengths from a sixty-fourth to a double whole, dots, triplets, ties and chords, both hands with up to four voices each, with undo and redo. SAVE AS writes MusicXML, which other notation programs open; MIDI writes a .mid file for your DAW, and the grip beside it drags the score straight onto a track in your DAW.' },
    { heading: 'In your DAW', text: 'AHENK is an instrument that answers the sustain, sostenuto and soft pedals of your MIDI keyboard. The DAW project keeps the piano, the stage, every microphone setting, OUT and the hall, and the microphones (under their own names), the hall and OUT are parameters your DAW can automate. AHENK adds no latency. The piano data is stored losslessly compressed (2.44 GB for all four pianos) and read from disk while it plays.' },
  ],
  controls: [
    ['Hall selector', 'Recorded, Recital room, Chamber theatre, Concert hall, Stone church, Live room; the arrows step, a click on the name opens the list.'],
    ['OUT', 'The level of the whole stage, −12 to +12 dB.'],
    ['PIANO RACK', 'The pianos you can play; click one to put it on stage.'],
    ['MIC RACK', 'The microphones that are off; click one to send it to its place on stage.'],
    ['Microphone settings', 'ON, LEVEL (−24 to 0 dB), ROOM on the LID and HOUSE stands, TYPE, and the REVERB, DELAY and ECHO sends.'],
    ['Setup · SAVE · LIST', 'Step through the factory setups and yours, save your own, open the list.'],
    ['SCORE... · STAGE · SCORE', 'Open a score; swap the stage for the SCORE page and back.'],
    ['PLAY · STOP · LOOP · TEMPO', 'Play the score, loop it or a range of bars, 50 to 150 % tempo, count-in of one or two bars.'],
    ['NEW · WRITE · SAVE AS · MIDI', 'Start a score, write notes, save as MusicXML, export as MIDI; drag the grips beside SAVE AS and MIDI into your DAW or onto the desktop.'],
    ['The keyboard', 'All 88 keys, A0 to C8; lower on a key is louder.'],
  ],
  controlsNote: 'Drag a knob up or down, Shift for finer steps; double-click returns it to the value of the setup that is loaded now. “?” opens help over the panel and never changes the window size.',
};

// Products sold on their own at a real price, outside the family, the testers and the launch counters (RU-8 joins when RU8_CHECKOUT is set).
export const SOLO_PLUGINS = [...(ADALET_ON_SALE ? [ADALET] : []), ...(AHENK_ON_SALE ? [AHENK] : []), ...(JINGFANG_ON_SALE ? [JINGFANG] : []), ...(RU8_ON_SALE ? [RU8] : []), ELEK, SEDA, TORNA];

// The second line, in page order. Kept apart from ALL_PLUGINS on purpose: ALL_PLUGINS drives the account
// downloads, the family and the testers, and none of that exists for these two yet.
export const LINE2_PLUGINS = ADALET_ON_SALE ? [] : [ADALET];   // SEDA moved to SOLO_PLUGINS when it went on sale (19 Oct), ADALET with its checkout (8 Nov)
// Every product that has a room at /plugins/<slug> (PluginRoom.jsx), in page order.
export const ROOM_PLUGINS = [...ALL_PLUGINS, ...SOLO_PLUGINS, ...LINE2_PLUGINS, ...FREE_PLUGINS];
// Every product the store lists, newest release first (root CLAUDE.md "Store order", owner 2026-10-28; dates in
// src/data/productDates.js, a new version counts as a release). /plugins, llms.txt and the prerendered pages read this order;
// ADALET (not on sale, no date) comes last.
export const STORE_PLUGINS = byLatestRelease([...FAMILY_PLUGINS, ...SOLO_PLUGINS, ...LINE2_PLUGINS, ...FREE_PLUGINS], (p) => p.slug);
// The Download Room (/launch2): every product on sale or free, in store order (ADALET waits for its checkout).
export const DOWNLOAD_ROOM_PLUGINS = STORE_PLUGINS.filter((p) => !LINE2_PLUGINS.includes(p) || CHECKOUT[p.slug]);
export const line2Price = (p) => `$${PRICES[p.slug]}`;
// No price on the pages until the checkout exists (owner 12 Oct: "şimdiden fiyat belirtmeyelim").
export const line2AvailableLine = (p) => (CHECKOUT[p.slug]
  ? `${p.releaseLabel ? `Available ${p.releaseLabel}` : 'Available now'} · ${line2Price(p)}`
  : (p.releaseLabel ? `Available ${p.releaseLabel}` : 'Coming soon'));

// Plug-ins added from /admin (the live catalogue, src/catalog/catalog.js) land here as room objects once the catalogue has
// loaded; every lookup by slug below sees them. Mutated in place by applyCatalogData, never reassigned.
export const CATALOG_PLUGIN_INDEX = {};
export const pluginBySlug = (slug) => [...ALL_PLUGINS, ...FREE_PLUGINS, ...LINE2_PLUGINS, ...SOLO_PLUGINS].find((p) => p.slug === slug) || CATALOG_PLUGIN_INDEX[slug] || undefined;

// MuseHub (owner 28 Oct: "musehub ile indir tarafını ekleyelim"). MIHENK and ELEK are on MuseHub since 26 Oct; Jeanette Kats
// (MuseHub partner team) sent these UTM links on 28 Oct, labsubverse thread "SubverseLab X MuseHub / Distribution Opportunity".
// The button art is MuseHub's own "Download with MuseHub" badge from the same thread (public/partners/musehub). A product is
// shown with the badge only once MuseHub has published it.
const MUSEHUB_UTM = 'utm_medium=PT&utm_source=WS&utm_campaign=MH_WW_PT_WS_WEB_ALL_271026_';
export const MUSEHUB = {
  mihenk: `https://www.musehub.com/plugin/mihenk?${MUSEHUB_UTM}`,
  elek: `https://www.musehub.com/plugin/elek?${MUSEHUB_UTM}`,
};
export const MUSEHUB_PARTNER_PAGE = `https://www.musehub.com/developer/subverselab?${MUSEHUB_UTM}`;
