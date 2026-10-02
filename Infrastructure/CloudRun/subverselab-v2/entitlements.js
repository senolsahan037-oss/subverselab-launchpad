// Who may download Kubbe and Kaset once the free 1,000 are gone: a verified
// e-mail that holds a paid, non-refunded Lemon Squeezy order for that plugin
// or for the bundle. plugin_licenses/{lowercased e-mail}.orders is written by
// the webhook in server.js and by nothing else; this file only reads it.
// An earlier free download is deliberately NOT an entitlement.

export const LAUNCH1_SLUGS = ['kubbe', 'kaset'];

export function ownedFromOrders(orders) {
  const owned = new Set();
  for (const order of Object.values(orders || {})) {
    if (!order || order.refunded || order.status !== 'paid') continue;
    if (order.product === 'bundle') LAUNCH1_SLUGS.forEach((s) => owned.add(s));
    else if (LAUNCH1_SLUGS.includes(order.product)) owned.add(order.product);
  }
  return LAUNCH1_SLUGS.filter((s) => owned.has(s));
}

export async function ownedLaunch1Slugs(admin, email) {
  const mail = String(email || '').trim().toLowerCase();
  if (!mail || mail.includes('/')) return [];
  const snap = await admin.db.collection('plugin_licenses').doc(mail).get();
  return snap.exists ? ownedFromOrders(snap.data().orders) : [];
}
