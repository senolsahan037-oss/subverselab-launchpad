// Who may download a plugin after a purchase: a verified e-mail that holds a
// paid, non-refunded Lemon Squeezy order for that plugin, or for the old
// KUBBE + KASET bundle (no longer offered, orders already placed keep working).
// plugin_licenses/{lowercased e-mail}.orders is written by the webhook in
// server.js and by nothing else; this file only reads it. The same orders are indexed by account in
// orders_by_uid/{uid} (webhook, when the order carries the uid of the account that clicked Buy): ownership is the
// union of both, and the uid index needs no verified e-mail (the account that paid is the account that clicked Buy).
// The first 1,000 (free launch, 30 Sep - 4 Oct) are the one exception: their claim (launch_claims, written by
// launchLicence.js) keeps KUBBE + KASET downloadable for them (owner, 8 Oct). Nothing else free opens a paid plugin.
//
// The plugin family ($19.99) is NOT decided here: it lives in launch2_purchases
// (server.js launch2Access), because it has a seat counter and a 1,000 cap. A
// family order is also recorded in `orders` (product 'family') but only for the
// purchase date and the licence key's name; ownedFromOrders ignores it.

import { promises as dnsPromises } from 'node:dns';
import { emailMarker, ERASED_COLLECTION, ORDERS_BY_UID } from './accountDeletion.js';
import { readAppleOrders } from './appstore.js';
import { readCodeOrders } from './redeem.js';

export { ORDERS_BY_UID };
// RU-8 and AHENK on iPhone / iPad (appstore.js): server.js takes the App Store pieces from here, so it keeps one entitlement import.
// Store codes (redeem.js, /redeem): the same single-import rule.
export { redeemCode, readCodeOrders, redeemedFamilyAt, loadRedeemCodes, REDEMPTIONS, REDEEMED_BY_UID, REDEEM_PRODUCTS } from './redeem.js';
export { APPLE_APPS, APPLE_BUNDLE_ID, APPLE_PRODUCT_ID, APPLE_PURCHASES, APPLE_BY_UID, AppleJwsError, verifyAppleJws, transactionProblem, linkApplePurchase, handleAppleNotification, readAppleOrders } from './appstore.js';
export const LAUNCH1_SLUGS = ['kubbe', 'kaset'];
// Every plugin that can be bought on its own, in the order the site lists them.
export const ALL_SLUGS = ['kubbe', 'kaset', 'koro', 'yanki', 'hava', 'mihenk', 'tutkal'];
// Free plugins: a $0 Lemon Squeezy order (no card needed) is the entitlement, exactly like a paid single
// order, but they are not in the family, not for testers and not in the admin preview: only the order opens them.
export const FREE_SLUGS = ['taban', 'alev', 'kiyma'];
// Products sold on their own only, outside the family, the testers and the launch counters (ELEK, $25). A paid order for
// the product is the only entitlement: a family order, a tester seat and the admin preview do not open it (ALL_SLUGS
// does not list it). Downloads use the ticket route launchId 'solo'.
// RU-8 (owner 16 Oct): sold on its own like ELEK, $25, not in the family; its Lemon Squeezy product id goes into LS_PRODUCT_SLUGS as "<id>:ru8".
// JING FANG (owner 19 Oct: $60, sold on its own like RU-8): "<id>:jingfang" in LS_PRODUCT_SLUGS once its Lemon Squeezy product exists.
// SEDA (owner 19 Oct, $15): "1453230:seda" in LS_PRODUCT_SLUGS. (Moved to the family on 26 Oct; owner 27 Oct reverted it.)
// TORNA (owner 28 Oct, $12): "1481039:torna" in LS_PRODUCT_SLUGS once its Lemon Squeezy product is published.
export const SOLO_SLUGS = ['adalet', 'ahenk', 'elek', 'ru8', 'jingfang', 'seda', 'torna'];   // adalet: on sale 8 Nov ($15, LS 1509139)   // ahenk on sale (lead 8 Nov, AHENK launch; stays in UNLISTED_SLUGS too, de-duplicated)
// Every plugin an order can open (paid singles first, then the solo products, then the free ones), in the order the account lists them.
export const PLUGIN_SLUGS = [...ALL_SLUGS, ...SOLO_SLUGS, ...FREE_SLUGS];
// Sample packs and preset packs (owner 16 Oct): paid only, no free path of any kind. A pack opens for a paid, non-refunded
// order of that pack (Lemon Squeezy product id -> slug in LS_PRODUCT_SLUGS) or of a sweep (below). Not for testers, not in the
// family, not in the admin preview, not opened by any plugin order. Downloads: ticket launchId 'pack', platform 'zip'.
// The slugs equal src/data/samplePacks.js / presetPacks.js (scripts/test-sample-packs.js checks that they agree).
//
// <slug>: the moment the pack went on sale (ISO, UTC). A pack is added here the day it is listed, never earlier, and a date is
// never moved later. The store grows (owner: ten sample packs in all, melodic ones as they are finished).
export const SAMPLE_PACK_LISTED = {
  brickyard: '2026-10-16T00:00:00Z',
  kerbstone: '2026-10-16T00:00:00Z',
  stepwell: '2026-10-16T00:00:00Z',
  lampglass: '2026-10-16T00:00:00Z',
  slagworks: '2026-10-16T00:00:00Z',
  squall: '2026-10-16T00:00:00Z',
  lowlight: '2026-10-17T00:00:00Z',
  ironmere: '2026-10-17T00:00:00Z',
  palmglow: '2026-10-17T00:00:00Z',
  mirage: '2026-11-01T00:00:00Z',
  kotoflux: '2026-11-01T00:00:00Z',
  saffron: '2026-11-01T00:00:00Z',
  solstice: '2026-11-01T00:00:00Z',
  velvetroom: '2026-11-01T00:00:00Z',
  nightgrid: '2026-11-01T00:00:00Z',
};
export const PRESET_PACK_LISTED = {
  'ru8-drum-pack': '2026-10-16T00:00:00Z',
};
// Free packs for members (owner 2026-10-17: "basic presetleri 5li paketler halinde ücretsiz ... üye ol indir"): any signed-in
// account whose e-mail can receive mail downloads them; no order, no Lemon Squeezy, not part of any sweep or ownership list.
// Download ticket launchId 'member', platform 'zip'. Source: 03_Presets/SubverseLab Effect Racks (tools/make_packs.py).
export const MEMBER_PACK_SLUGS = ['racks-drums', 'racks-bass', 'racks-vocals', 'racks-instruments', 'racks-bus', 'racks-fx'];
export const SAMPLE_PACK_SLUGS = Object.keys(SAMPLE_PACK_LISTED);
export const PRESET_PACK_SLUGS = Object.keys(PRESET_PACK_LISTED);
export const PACK_SLUGS = [...SAMPLE_PACK_SLUGS, ...PRESET_PACK_SLUGS];
// Sweeps: ONE order opens every pack of its kind that was IN THE STORE WHEN IT WAS BOUGHT (listed at or before the order's
// created time). 'sweep' = "Sweep the store", sample packs only (launch campaign); 'preset-sweep' = the optional preset-pack
// sweep (hidden on the site until it has a price). Why by listing date and not "every pack, always": a pack listed after the
// order is not part of what the buyer paid for, so a sweep never hands later packs to earlier buyers for nothing, and later
// buyers never pay more for less. An order without a usable date opens only the packs listed at the first listing moment.
// Price floor (root CLAUDE.md): the sweep price divided by its packs is the lowest per-pack price any buyer has paid; no later
// promotion, bundle or code may go under it.
export const SWEEPS = { sweep: SAMPLE_PACK_LISTED, 'preset-sweep': PRESET_PACK_LISTED };
export function sweepSlugs(sweep, created) {
  const listed = SWEEPS[sweep];
  if (!listed) return [];
  const first = Math.min(...Object.values(listed).map((d) => Date.parse(d)));
  const at = Date.parse(created || '');
  const cut = Number.isNaN(at) ? first : at;
  return Object.entries(listed).filter(([, d]) => Date.parse(d) <= cut).map(([slug]) => slug);
}
// The packs a sweep bought today opens (what the page may promise): every listed pack of that kind.
export const SWEEP_SLUGS = Object.keys(SAMPLE_PACK_LISTED);   // live: registerCatalogProducts keeps it equal to SAMPLE_PACK_SLUGS
// Products an order can open that are NOT on sale on the site yet (owner 7 Nov 2026: AHENK, the trial + browser sign-in of
// api/trialGrant.js). Deliberately not in SOLO_SLUGS / PLUGIN_SLUGS: those feed the download manifest, the download ticket,
// the tester list and the account's plug-in list, and a product appears only when it is on sale (root CLAUDE.md). Here it
// only counts for ownership (ownedVia), so a paid order (LS_PRODUCT_SLUGS "<id>:ahenk") opens the plug-in's sign-in.
// When it goes on sale (from /admin -> Catalogue or by hand into SOLO_SLUGS) it may stay here: OWNABLE_SLUGS is de-duplicated.
export const UNLISTED_SLUGS = ['ahenk'];
// Every slug an order can open.
const ownableList = () => [...new Set([...PLUGIN_SLUGS, ...UNLISTED_SLUGS, ...PACK_SLUGS])];
export const OWNABLE_SLUGS = ownableList();

// ---- The live catalogue (api/catalog.js, owner 2026-10-31) ---------------------------------------------------------------
// Products added from /admin (catalog_* collections) are registered here at request time, so every rule above also knows
// them: a paid order opens the pack or plug-in, the download ticket accepts the slug, the manifest lists it, a sweep bought
// after its listing moment includes it. The exported arrays are mutated IN PLACE (never reassigned), so every importer sees
// the same lists. A slug the code already knows is never changed by the catalogue: the hand-written lists win.
function replaceInPlace(arr, items) { arr.splice(0, arr.length, ...items); }
function syncDerivedLists() {
  replaceInPlace(SAMPLE_PACK_SLUGS, Object.keys(SAMPLE_PACK_LISTED));
  replaceInPlace(PRESET_PACK_SLUGS, Object.keys(PRESET_PACK_LISTED));
  replaceInPlace(PACK_SLUGS, [...SAMPLE_PACK_SLUGS, ...PRESET_PACK_SLUGS]);
  replaceInPlace(PLUGIN_SLUGS, [...ALL_SLUGS, ...SOLO_SLUGS, ...FREE_SLUGS]);
  replaceInPlace(SWEEP_SLUGS, [...SAMPLE_PACK_SLUGS]);
  replaceInPlace(OWNABLE_SLUGS, ownableList());
}
const knownSlug = (slug) => PLUGIN_SLUGS.includes(slug) || PACK_SLUGS.includes(slug) || MEMBER_PACK_SLUGS.includes(slug) || slug in SWEEPS || ['family', 'bundle'].includes(slug);
const slugOk = (slug) => /^[a-z0-9][a-z0-9-]{0,59}$/.test(String(slug || ''));
export function registerCatalogProducts({ samplePacks = [], presetPacks = [], plugins = [] } = {}) {
  let changed = false;
  for (const p of samplePacks) {
    if (!slugOk(p?.slug) || knownSlug(p.slug)) continue;
    const at = Date.parse(p.listedAt || '');
    SAMPLE_PACK_LISTED[p.slug] = Number.isNaN(at) ? new Date().toISOString() : new Date(at).toISOString();
    changed = true;
  }
  for (const p of presetPacks) {
    if (!slugOk(p?.slug) || knownSlug(p.slug)) continue;
    if (p.free) MEMBER_PACK_SLUGS.push(p.slug);
    else { const at = Date.parse(p.listedAt || ''); PRESET_PACK_LISTED[p.slug] = Number.isNaN(at) ? new Date().toISOString() : new Date(at).toISOString(); }
    changed = true;
  }
  for (const p of plugins) {
    if (!slugOk(p?.slug) || knownSlug(p.slug)) continue;
    (p.free ? FREE_SLUGS : SOLO_SLUGS).push(p.slug);
    changed = true;
  }
  if (changed) syncDerivedLists();
  return changed;
}

// The record of a purchase's updates date (purchase + 2 years). Since 7 Nov 2026 no term is promised or shown
// anywhere on the site (owner: a plugin reaches its last version); the API still returns it, nothing gates on it.
export const UPDATE_YEARS = 2;

// 'YYYY-MM-DD' of the date `years` after `iso`; null when `iso` is not a date.
export function addYears(iso, years = UPDATE_YEARS) {
  const t = Date.parse(iso || '');
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

// Admin preview: the owner sees the site exactly as a family buyer does. ONE helper decides it, and the
// server applies it only in the entitlement layer (launch2Access, accountEntitlements, the licences list and
// the download ticket). Same rule as the admin routes: a verified e-mail from this list (Google sign-in, or a password
// account that verified it); an account that never verified its address is not an admin.
// Nothing is written for it: no order, no seat, no credits, no counters.
export const ADMIN_EMAILS = ['info@subverselab.com', 'senolsahan037@gmail.com'];
export const ADMIN_PREVIEW_KEY = 'ADMIN-PREVIEW (no real licence key)';
export function isAdminPreview(decoded) {
  return Boolean(decoded) && decoded.email_verified === true && ADMIN_EMAILS.includes(String(decoded.email || '').trim().toLowerCase());
}

const isPackProduct = (product) => PACK_SLUGS.includes(product) || product in SWEEPS;
// True when the order carries a positive amount (USD cents from Lemon Squeezy, or the order total).
export const paidMoney = (o) => Number(o?.amount_usd_cents) > 0 || Number(o?.total) > 0;

// {slug: latest purchase date ('YYYY-MM-DD', or null when the order has no date)}
// for every plugin a paid, non-refunded order covers.
export function purchasedFromOrders(orders) {
  const out = {};
  const add = (slug, created) => {
    const day = Number.isNaN(Date.parse(created || '')) ? null : new Date(Date.parse(created)).toISOString().slice(0, 10);
    if (!(slug in out) || (day && (!out[slug] || day > out[slug]))) out[slug] = day;
  };
  for (const order of Object.values(orders || {})) {
    if (!order || order.refunded || order.status !== 'paid') continue;
    if (order.product === 'bundle') LAUNCH1_SLUGS.forEach((s) => add(s, order.created));
    else if (order.product in SWEEPS) { if (paidMoney(order)) sweepSlugs(order.product, order.created).forEach((s) => add(s, order.created)); }
    // Packs: no free path, so a $0 order (a misconfigured "lead magnet" product, a 100 % code) never opens one.
    else if (PACK_SLUGS.includes(order.product)) { if (paidMoney(order)) add(order.product, order.created); }
    else if (OWNABLE_SLUGS.includes(order.product)) add(order.product, order.created);
  }
  return out;
}

export function ownedFromOrders(orders) {
  const bought = purchasedFromOrders(orders);
  return OWNABLE_SLUGS.filter((s) => s in bought);
}

async function readOrders(admin, email) {
  const mail = String(email || '').trim().toLowerCase();
  if (!mail || mail.includes('/')) return {};
  const [snap, kept] = await Promise.all([
    admin.db.collection('plugin_licenses').doc(mail).get(),
    admin.db.collection(ERASED_COLLECTION).doc(emailMarker(mail)).get(),
  ]);
  // Orders kept in reduced form after an account deletion (accountDeletion.js)
  // still count, so a buyer who signs up again can download again.
  return { ...(kept.exists ? kept.data().orders : {}), ...(snap.exists ? snap.data().orders : {}) };
}

// Firebase uids are [A-Za-z0-9_-], up to 128 characters; anything else is not a usable doc id.
export const orderUid = (value) => { const u = String(value || '').trim(); return /^[A-Za-z0-9_-]{1,128}$/.test(u) ? u : null; };

// The shape stored in orders_by_uid/{uid}.orders[orderId] (written by the webhook, scripts/backfill-orders-by-uid.js).
export const uidOrderEntry = (order, email) => ({
  product: order?.product ?? null,
  status: order?.status ?? null,
  refunded: Boolean(order?.refunded),
  created: order?.created ?? null,
  email: String(email || '').trim().toLowerCase() || null,
  // Packs and sweeps: the amount travels with the uid index too, so the "no free pack" rule (paidMoney) holds on both sides.
  ...(isPackProduct(order?.product) && order?.amount_usd_cents != null ? { amount_usd_cents: order.amount_usd_cents } : {}),
  ...(isPackProduct(order?.product) && order?.total != null ? { total: order.total } : {}),
});

// Orders bound to this account (orders_by_uid/{uid}): found by uid, whatever e-mail the buyer typed at checkout.
export async function readUidOrders(admin, uid) {
  const id = orderUid(uid);
  if (!id) return {};
  const snap = await admin.db.collection(ORDERS_BY_UID).doc(id).get();
  return snap.exists ? snap.data().orders || {} : {};
}

const orderLive = (o) => Boolean(o) && !o.refunded && o.status === 'paid';
// Union by order id; when both sides know the order, a refunded / unpaid state wins.
function mergeOrders(...maps) {
  const out = {};
  for (const map of maps) for (const [id, o] of Object.entries(map || {})) if (!(id in out) || (orderLive(out[id]) && !orderLive(o))) out[id] = o;
  return out;
}

// What is bound to this account for ownership: its Lemon Squeezy orders (orders_by_uid) plus its linked App Store
// purchases (apple_purchases via apple_by_uid, shaped as orders 'apple:<id>' of their app's slug, ru8 or ahenk; a refunded one reads as refunded).
// readUidOrders above stays Lemon Squeezy only: the licences list reads it, and an App Store purchase has no licence key.
// Store codes redeemed on /redeem (redeem.js, 'code:<hash>' entries) count here too, bound to the uid like an App Store purchase.
async function readUidOwnership(admin, uid) {
  const id = orderUid(uid);
  if (!id) return {};
  const [orders, apple, codes] = await Promise.all([readUidOrders(admin, id), readAppleOrders(admin.db, id), readCodeOrders(admin.db, id)]);
  return { ...orders, ...apple, ...codes };
}

// Orders of this e-mail UNION orders bound to this uid.
async function readAllOrders(admin, email, uid) {
  const [byMail, byUid] = await Promise.all([readOrders(admin, email), readUidOwnership(admin, uid)]);
  return mergeOrders(byMail, byUid);
}

// Purchase date per plugin from this e-mail's orders and this uid's orders (single orders and the old bundle).
export async function purchasedByOrders(admin, email, uid) {
  return purchasedFromOrders(await readAllOrders(admin, email, uid));
}

// Every plugin this e-mail or this uid bought on its own (or through the old bundle).
export async function ownedOrderSlugs(admin, email, uid) {
  return ownedFromOrders(await readAllOrders(admin, email, uid));
}

// ONLY what orders bound to the uid open (no e-mail lookup): what an unverified password account may use.
export async function purchasedByUidOrders(admin, uid) {
  return purchasedFromOrders(await readUidOwnership(admin, uid));
}
export async function ownedUidOrderSlugs(admin, uid) {
  return ownedFromOrders(await readUidOwnership(admin, uid));
}
// GET /api/<slug>/ios/entitlement, device approve, grant refresh: does this account own `slug`, and through which store? Lemon Squeezy orders follow the
// download rules (by e-mail AND uid for a proven e-mail, by uid alone otherwise); App Store purchases are bound to the uid.
// -> 'lemonsqueezy' | 'appstore' | 'code' | null (a Lemon Squeezy order wins, then the App Store, then a redeemed store code).
export async function ownedVia(admin, { email, uid, proven }, slug) {
  const id = orderUid(uid);
  const [lsOrders, apple, codes] = await Promise.all([
    proven ? mergeOrders(await readOrders(admin, email), await readUidOrders(admin, id)) : readUidOrders(admin, id),
    id ? readAppleOrders(admin.db, id) : {},
    id ? readCodeOrders(admin.db, id) : {},
  ]);
  if (ownedFromOrders(lsOrders).includes(slug)) return 'lemonsqueezy';
  if (ownedFromOrders(apple).includes(slug)) return 'appstore';
  if (ownedFromOrders(codes).includes(slug)) return 'code';
  return null;
}
// True when a refunded / unpaid order bound to the uid covers this plugin (the answer is "refunded", not "verify").
export async function uidHadOrderFor(admin, uid, slug) {
  return Object.values(await readUidOwnership(admin, uid)).some((o) => o && !orderLive(o) && (o.product === slug || (o.product === 'bundle' && LAUNCH1_SLUGS.includes(slug)) || (o.product in SWEEPS && sweepSlugs(o.product, o.created).includes(slug))));
}

// True when this account or e-mail is one of the first 1,000 (a launch_claims record by uid or by e-mail).
export async function holdsLaunch1Claim(admin, uid, email) {
  const mail = String(email || '').trim().toLowerCase();
  const reads = [];
  if (uid && !String(uid).includes('/')) reads.push(admin.db.collection('launch_claims').doc(`uid:${uid}`).get());
  if (mail && !mail.includes('/')) reads.push(admin.db.collection('launch_claims').doc(`email:${mail}`).get());
  return (await Promise.all(reads)).some((snap) => snap.exists);
}

// True when launch_claims/uid:<uid> exists. Unlike a claim found by e-mail, this one cannot belong to somebody else's
// address: the account itself claimed it.
export async function holdsLaunch1UidClaim(admin, uid) {
  if (!uid || String(uid).includes('/')) return false;
  return (await admin.db.collection('launch_claims').doc(`uid:${uid}`).get()).exists;
}

// ---- Address check (replaces e-mail verification) -------------------------------------------------------------
// An address does not exist when it hard-bounced (bounced_emails/{lowercased e-mail}) or its domain has no MX record.
let mxResolver = (domain) => dnsPromises.resolveMx(domain);
// Tests pass a stub so nothing touches DNS. Returns the previous resolver.
export function setMxResolver(fn) { const old = mxResolver; mxResolver = fn; mxCache.clear(); return old; }
const MX_CACHE_MS = 60 * 60 * 1000;
const mxCache = new Map();
// false only when the domain certainly has no mail server (ENOTFOUND / ENODATA / an empty answer); any other lookup
// error (timeout, SERVFAIL, no network) allows. Cached for an hour either way.
export async function domainHasMx(domain, now = Date.now()) {
  const d = String(domain || '').trim().toLowerCase();
  if (!d || d.includes('/')) return false;
  const hit = mxCache.get(d);
  if (hit && now - hit.at < MX_CACHE_MS) return hit.ok;
  let ok;
  try {
    const records = await mxResolver(d);
    ok = Array.isArray(records) && records.length > 0;
  } catch (err) {
    ok = !['ENOTFOUND', 'ENODATA'].includes(err?.code);
  }
  mxCache.set(d, { at: now, ok });
  return ok;
}

export async function isBouncedEmail(admin, email) {
  const mail = String(email || '').trim().toLowerCase();
  if (!mail || mail.includes('/')) return false;
  return (await admin.db.collection('bounced_emails').doc(mail).get()).exists;
}

// The ONE e-mail rule (owner 9 Oct: "remove verification, only block addresses that do not exist"): the address is not in
// bounced_emails/{e-mail} and its domain has a mail server. A lookup error other than "no such domain" allows.
export async function addressExists(admin, email) {
  return (await addressProblem(admin, email)) === null;
}

// null when the address can receive mail; otherwise why not: 'syntax' | 'bounced' | 'no-mx'.
export async function addressProblem(admin, email) {
  const mail = String(email || '').trim().toLowerCase();
  const at = mail.lastIndexOf('@');
  if (!mail || mail.length > 254 || at < 1 || at === mail.length - 1 || mail.includes('/') || /\s/.test(mail) || mail.indexOf('@') !== at) return 'syntax';
  if (await isBouncedEmail(admin, mail)) return 'bounced';
  return (await domainHasMx(mail.slice(at + 1))) ? null : 'no-mx';
}

// Kubbe / Kaset only (the launch-1 download room).
