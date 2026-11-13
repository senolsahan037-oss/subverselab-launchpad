// Pack prices and Lemon Squeezy checkout links — HAND-EDITED (the importer never touches this file).
//
// Every value is null until the owner sets it (16 Oct night). null renders correctly everywhere:
//   price or checkout null -> the pack's key reads "Available soon" (disabled), no price is shown, no JSON-LD offer.
//   both set               -> "Buy <pack> — $<price>" opens the Lemon Squeezy checkout (uid/e-mail added like the plugins).
// Owner's pricing policy: sample packs sit below the market and below the site's $9 DSP plug-ins
// ("12 dollars is too much in a store that sells a DSP engine for 9"). Price floor (root CLAUDE.md): no later promotion,
// code or bundle may go under the lowest per-pack price any buyer has paid (the sweep included).
//
// Server side, for every product created in Lemon Squeezy: add "<productId>:<slug>" to the Cloud Run env LS_PRODUCT_SLUGS
// (api/server.js productSlugFor), and publish the zip with
//   01_AI_Tools/subverselab-plugin-common/tools/publish_download.sh <slug> zip <file.zip> 1.0.0
// so the paid download appears on /account (api/entitlements.js PACK_SLUGS, SAMPLE_PACK_LISTED).

// US dollars. Owner 16 Oct (packs KNOWLEDGE B9, APPROVED): $5 per sample pack, $25 for the sweep. These are PERMANENT FLOORS
// under the price-floor rule (root CLAUDE.md): no later promotion, code, bundle or gift may sell a sample pack below $5,
// or the sample packs of a sweep below $25 for the set. RU-8 Drum Pack $10 (owner 17 Oct). The free rack packs (api/entitlements.js
// MEMBER_PACK_SLUGS) are not sold: no price, no checkout.
export const PACK_PRICES = {
  brickyard: 5,
  kerbstone: 5,
  stepwell: 5,
  lampglass: 5,
  slagworks: 5,
  squall: 5,
  lowlight: 5,
  ironmere: 5,
  palmglow: 5,
  mirage: 5,   // same $5 as every sample pack (B9 floor)
  kotoflux: 5,
  saffron: 5,
  solstice: 5,
  velvetroom: 5,
  nightgrid: 5,
  'ru8-drum-pack': 10,   // owner 17 Oct: "10 dolar koyalım"; the first price of this pack is its floor
};

// https://subverselab.lemonsqueezy.com/checkout/buy/<uuid>  (no discount code; licence keys OFF for packs)
export const PACK_CHECKOUT = {
  brickyard: 'https://subverselab.lemonsqueezy.com/checkout/buy/7c183c37-695e-49a5-af53-2e0e8bd64185',
  kerbstone: 'https://subverselab.lemonsqueezy.com/checkout/buy/2e9cde90-beda-407a-8ad1-6e4a3b413c4a',
  stepwell: 'https://subverselab.lemonsqueezy.com/checkout/buy/90b3e4f0-7fb1-43de-a361-553e680278f9',
  lampglass: 'https://subverselab.lemonsqueezy.com/checkout/buy/84b27a5a-c80b-4bee-9654-953bdf70b896',
  slagworks: 'https://subverselab.lemonsqueezy.com/checkout/buy/d473ff10-e069-4fb0-8d2a-ed6527f9a99c',
  squall: 'https://subverselab.lemonsqueezy.com/checkout/buy/b8c9033a-19d7-4f69-bf2f-1479698cc8c8',
  lowlight: 'https://subverselab.lemonsqueezy.com/checkout/buy/8d3356af-958d-4ac4-a1fd-a82454a59768',
  ironmere: 'https://subverselab.lemonsqueezy.com/checkout/buy/420c27e1-6d22-4e64-84f7-727e08d794c5',
  palmglow: 'https://subverselab.lemonsqueezy.com/checkout/buy/bae2d831-e220-4aa8-ba59-3657b011fa03',
  'ru8-drum-pack': 'https://subverselab.lemonsqueezy.com/checkout/buy/1035db4e-ffcc-4126-82dc-75336370c0d2',   // LS product 1446505, $10, created 17 Oct
  // The six JING FANG packs, published on Lemon Squeezy 29 Oct 2026 (owner's go), $5 each.
  mirage: 'https://subverselab.lemonsqueezy.com/checkout/buy/afcdafe3-40c7-48dc-a647-efbaed96d362',       // LS 1480722
  kotoflux: 'https://subverselab.lemonsqueezy.com/checkout/buy/b93a9ac4-6873-4109-b5c8-da981204caae',     // LS 1481075
  saffron: 'https://subverselab.lemonsqueezy.com/checkout/buy/86c10c22-8885-45c6-aa33-b0425fffd82b',      // LS 1481389
  solstice: 'https://subverselab.lemonsqueezy.com/checkout/buy/a49864c1-2b03-4441-9a61-1836dbaf5882',     // LS 1481392
  velvetroom: 'https://subverselab.lemonsqueezy.com/checkout/buy/1ce3b779-3aa9-4fc2-b3ac-39932d3ec0c3',   // LS 1481394
  nightgrid: 'https://subverselab.lemonsqueezy.com/checkout/buy/14c5ee0a-d9f5-4f15-8f5e-16df091f9b34',    // LS 1481396
};

// Packs being regenerated (status 'rebuild-pending' in src/data/samplePacks.js): listed on the site (true) or hidden (false),
// and sold (true) or kept at "Available soon" (false) until the importer has read their new zips.
export const SHOW_REBUILD_PENDING = true;
export const SELL_REBUILD_PENDING = false;

// "Sweep the store" (launch campaign, SAMPLE PACKS ONLY; owner 16 Oct): one fixed price opens every sample pack that is in
// the store at the moment of purchase (server: api/entitlements.js SWEEPS.sweep, by listing date).
// Shown only when BOTH price and checkout are set (a campaign without a price is not shown at all: no "coming soon" teaser).
// endsAt: 'YYYY-MM-DD' (00:00 Istanbul, UTC+3) — from that moment the block disappears; null = no end date is printed.
// Lemon Squeezy product name must contain "Sweep" (name fallback) and its id goes into LS_PRODUCT_SLUGS as "<id>:sweep".
export const SWEEP = { price: 25, checkout: null, endsAt: null };   // $25: permanent floor (see PACK_PRICES)

// Optional preset-pack sweep, for later (owner 16 Oct: /preset-packs gets no campaign now). Hidden while price or checkout
// is null. LS_PRODUCT_SLUGS "<id>:preset-sweep".
export const PRESET_SWEEP = { price: null, checkout: null, endsAt: null };

const sweepOver = (s, now) => {
  if (!s.endsAt) return false;
  const end = Date.parse(`${s.endsAt}T00:00:00+03:00`);
  return Number.isFinite(end) && now >= end;
};
export const sweepLive = (now = Date.now()) => Boolean(SWEEP.price != null && SWEEP.checkout) && !sweepOver(SWEEP, now);
export const presetSweepLive = (now = Date.now()) => Boolean(PRESET_SWEEP.price != null && PRESET_SWEEP.checkout) && !sweepOver(PRESET_SWEEP, now);

// Time-boxed pack sales (owner 13 Nov 2026: "aynı sample paketlerini de 2.99 indirimle sunalım"): the two packs that were free
// from 6 Nov sell at $2.99 against the regular $5, the same 2.99 as on MuseHub (MuseHub caps a discount at 50 % and has no 2.49
// tier, so 2.99 is its deepest allowed price; −40 % on the site). starts / ends: 'YYYY-MM-DD', 00:00 Istanbul (UTC+3).
// While a sale is on it replaces the pack's own price (PACK_PRICES or the panel's) wherever a price is shown; the struck regular
// price and "-40%" show beside it. Like OFFERS for plug-ins, the server never reads this: the Lemon Squeezy price is set to
// $2.99 by hand on the deploy day and back to $5 on 4 Jan 2027 (RELEASE_QUEUE). Price floor: these two were free from 6 Nov,
// so $2.99 undercuts no buyer.
export const PACK_SALES = {
  woodpanel: { price: 2.99, regular: 5, starts: '2026-11-13', ends: '2027-01-04' },
  '8bitorchestral': { price: 2.99, regular: 5, starts: '2026-11-13', ends: '2027-01-04' },
};
const packSaleOn = (slug, now) => {
  const s = PACK_SALES[slug];
  if (!s) return false;
  const from = Date.parse(`${s.starts}T00:00:00+03:00`); const to = Date.parse(`${s.ends}T00:00:00+03:00`);
  return Number.isFinite(from) && Number.isFinite(to) && now >= from && now < to;
};

// What a pack's key can do now: { price, checkout, buyable, regular, off, saleEnds }. `regular` is set (with `off`, whole per cent)
// only while a sale is on.
export function packOffer(pack, now = Date.now()) {
  const slug = typeof pack === 'string' ? pack : pack.slug;
  const pending = typeof pack === 'object' && pack.status === 'rebuild-pending';
  const sale = packSaleOn(slug, now) ? PACK_SALES[slug] : null;
  const price = sale ? sale.price : (PACK_PRICES[slug] ?? null);
  const checkout = PACK_CHECKOUT[slug] ?? null;
  const regular = sale ? sale.regular : null;
  const off = sale ? Math.round((1 - sale.price / sale.regular) * 100) : 0;
  return { price, checkout, buyable: price != null && Boolean(checkout) && (!pending || SELL_REBUILD_PENDING), regular, off, saleEnds: sale ? sale.ends : null };
}
export const priceLabel = (price) => (price == null ? '' : `$${Number.isInteger(price) ? price : price.toFixed(2)}`);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// 'YYYY-MM-DD' -> '1 November 2026' ('' when no date); printed as "Until <date>", the site's convention for FAMILY_OFFER_ENDS_AT.
export function packOfferEndLabel(endsAt) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(endsAt || '');
  if (!m || +m[2] < 1 || +m[2] > 12) return '';
  return `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}`;
}
