// One-off (owner go 2026-10-18): adds the paid amount to the one order the webhook stored without it.
// LS order #4867641 (order id 9664822, Joshua Rivers, family, 5 Oct 2026 20:08 UTC) was written before orderAmount()
// existed, so it has no amount_usd_cents and admin Stats (api/stats.js classifyOrder) skipped it: admin showed 18 family
// orders, Lemon Squeezy 19. Verified 2026-10-18 in the Lemon Squeezy dashboard (Paid, $19.99) and the sale e-mail
// (Subtotal $19.99, no tax, Total $19.99), so amount_usd_cents = 1999, total = 1999, currency USD.
// Writes ONLY those three fields of that one order (field-path update; nothing else in the document changes) and only
// while they are still missing. Credits are NOT touched here.
// Dry run by default; `--write` applies it.  Run: node scripts/backfill-order-amount-4867641.js [--write]
import { pathToFileURL } from 'node:url';

export const TARGET = Object.freeze({
  email: 'svenowemusic@gmail.com',
  orderId: '9664822',
  orderNumber: 4867641,
  productId: 1414121,
  amount: Object.freeze({ amount_usd_cents: 1999, total: 1999, currency: 'USD' }),
});

// Pure check: what to write for this document, or why not.
export function planBackfill(data, t = TARGET) {
  const order = data?.orders?.[t.orderId];
  if (!order) return { write: false, reason: 'order not found' };
  if (Number(order.order_number) !== t.orderNumber) return { write: false, reason: `order_number ${order.order_number}` };
  if (Number(order.product_id) !== t.productId || order.product !== 'family') return { write: false, reason: 'not the family order' };
  if (order.status !== 'paid' || order.refunded === true) return { write: false, reason: `status ${order.status}` };
  if (typeof order.amount_usd_cents === 'number') return { write: false, reason: `already has amount_usd_cents ${order.amount_usd_cents}` };
  const fields = {};
  for (const [k, v] of Object.entries(t.amount)) fields[`orders.${t.orderId}.${k}`] = v;
  return { write: true, fields };
}

export async function backfill(db, { write = false, log = () => {} } = {}) {
  const ref = db.collection('plugin_licenses').doc(TARGET.email);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const plan = planBackfill(snap.exists ? snap.data() : null);
    if (!plan.write) { log(`SKIP plugin_licenses/${TARGET.email}: ${plan.reason}`); return plan; }
    log(`${write ? 'WRITE' : 'DRY  '} plugin_licenses/${TARGET.email} ${JSON.stringify(plan.fields)}`);
    if (write) tx.update(ref, plan.fields);
    return plan;
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const write = process.argv.includes('--write');
  const { initializeApp, applicationDefault, getApps } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  if (!getApps().length) initializeApp({ credential: applicationDefault(), projectId: process.env.GOOGLE_CLOUD_PROJECT || 'project-62238635-aae4-41f4-880' });
  await backfill(getFirestore(), { write, log: console.log });
}
