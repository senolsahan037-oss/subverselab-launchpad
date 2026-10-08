// Who may download a plugin after a purchase: a verified e-mail that holds a
// paid, non-refunded Lemon Squeezy order for that plugin, or for the old
// KUBBE + KASET bundle (no longer offered, orders already placed keep working).
// plugin_licenses/{lowercased e-mail}.orders is written by the webhook in
// server.js and by nothing else; this file only reads it.
// An earlier free download is deliberately NOT an entitlement.
//
// The plugin family ($19.99) is NOT decided here: it lives in launch2_purchases
// (server.js launch2Access), because it has a seat counter and a 1,000 cap. A
// family order is also recorded in `orders` (product 'family') but only for the
// purchase date and the licence key's name; ownedFromOrders ignores it.

import { emailMarker, ERASED_COLLECTION } from './accountDeletion.js';

export const LAUNCH1_SLUGS = ['kubbe', 'kaset'];
// Every plugin that can be bought on its own, in the order the site lists them.
export const ALL_SLUGS = ['kubbe', 'kaset', 'koro', 'yanki', 'hava', 'mihenk', 'tutkal'];
// Free plugins: a $0 Lemon Squeezy order (no card needed) is the entitlement, exactly like a paid single
// order, but they are not in the family, not for testers and not in the admin preview: only the order opens them.
export const FREE_SLUGS = ['taban', 'alev'];
// Every plugin an order can open (paid singles first, then the free ones), in the order the account lists them.
export const PLUGIN_SLUGS = [...ALL_SLUGS, ...FREE_SLUGS];
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
// the download ticket). Same rule as the admin routes: a verified e-mail from this list; a password account that
// has not verified its address is not an admin (a Google sign-in carries email_verified true).
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

// Purchase date per plugin from this e-mail's orders (single orders and the old bundle).
export async function purchasedByOrders(admin, email) {
  return purchasedFromOrders(await readOrders(admin, email));
}

// Every plugin this e-mail bought on its own (or through the old bundle).
export async function ownedOrderSlugs(admin, email) {
  return ownedFromOrders(await readOrders(admin, email));
}

// Kubbe / Kaset only (the launch-1 download room).
export async function ownedLaunch1Slugs(admin, email) {
  return (await ownedOrderSlugs(admin, email)).filter((s) => LAUNCH1_SLUGS.includes(s));
}
