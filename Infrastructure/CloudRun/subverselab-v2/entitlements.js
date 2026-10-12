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

export { ORDERS_BY_UID };
export const LAUNCH1_SLUGS = ['kubbe', 'kaset'];
// Every plugin that can be bought on its own, in the order the site lists them.
export const ALL_SLUGS = ['kubbe', 'kaset', 'koro', 'yanki', 'hava', 'mihenk', 'tutkal'];
// Free plugins: a $0 Lemon Squeezy order (no card needed) is the entitlement, exactly like a paid single
// order, but they are not in the family, not for testers and not in the admin preview: only the order opens them.
export const FREE_SLUGS = ['taban', 'alev'];
// Products sold on their own only, outside the family, the testers and the launch counters (ELEK, $25). A paid order for
// the product is the only entitlement: a family order, a tester seat and the admin preview do not open it (ALL_SLUGS
// does not list it). Downloads use the ticket route launchId 'solo'.
export const SOLO_SLUGS = ['elek'];
// Every plugin an order can open (paid singles first, then the solo products, then the free ones), in the order the account lists them.
export const PLUGIN_SLUGS = [...ALL_SLUGS, ...SOLO_SLUGS, ...FREE_SLUGS];
// Every purchase includes this many years of updates (src/data/plugins.js UPDATE_YEARS says the same).
// Not enforced on downloads yet: the account page only shows the date.
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
    else if (PLUGIN_SLUGS.includes(order.product)) add(order.product, order.created);
  }
  return out;
}

export function ownedFromOrders(orders) {
  const bought = purchasedFromOrders(orders);
  return PLUGIN_SLUGS.filter((s) => s in bought);
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

// Orders of this e-mail UNION orders bound to this uid.
async function readAllOrders(admin, email, uid) {
  const [byMail, byUid] = await Promise.all([readOrders(admin, email), readUidOrders(admin, uid)]);
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
  return purchasedFromOrders(await readUidOrders(admin, uid));
}
export async function ownedUidOrderSlugs(admin, uid) {
  return ownedFromOrders(await readUidOrders(admin, uid));
}
// True when a refunded / unpaid order bound to the uid covers this plugin (the answer is "refunded", not "verify").
export async function uidHadOrderFor(admin, uid, slug) {
  return Object.values(await readUidOrders(admin, uid)).some((o) => o && !orderLive(o) && (o.product === slug || (o.product === 'bundle' && LAUNCH1_SLUGS.includes(slug))));
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
export async function ownedLaunch1Slugs(admin, email, uid) {
  return (await ownedOrderSlugs(admin, email, uid)).filter((s) => LAUNCH1_SLUGS.includes(s));
}
