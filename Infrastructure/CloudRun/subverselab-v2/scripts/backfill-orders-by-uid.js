// Builds orders_by_uid/{uid} from plugin_licenses: every order that carries a uid (written by the Lemon Squeezy webhook).
// Dry run by default (reads only, lists what it would write); `--write` applies it. Idempotent: merges per order id.
// Run: node scripts/backfill-orders-by-uid.js [--write]   (needs Google credentials for project subverselab; the owner runs --write)
import { pathToFileURL } from 'node:url';
import { ORDERS_BY_UID, orderUid, uidOrderEntry } from '../entitlements.js';

// Pure part: Map<uid, {orders:{orderId: entry}}> from plugin_licenses documents ([{id: e-mail, data}]).
export function buildOrdersByUid(licenceDocs) {
  const out = new Map();
  for (const { id, data } of licenceDocs) {
    const email = String(data?.email || id || '').trim().toLowerCase();
    for (const [orderId, order] of Object.entries(data?.orders || {})) {
      const uid = orderUid(order?.uid);
      if (!uid) continue;
      if (!out.has(uid)) out.set(uid, { orders: {} });
      out.get(uid).orders[String(order.order_id || orderId)] = uidOrderEntry(order, email);
    }
  }
  return out;
}

// db: Firestore-shaped. Returns {docs: Map, written}.
export async function backfillOrdersByUid(db, { write = false, log = () => {} } = {}) {
  const snap = await db.collection('plugin_licenses').get();
  const docs = buildOrdersByUid(snap.docs.map((d) => ({ id: d.id, data: d.data() })));
  let written = 0;
  for (const [uid, doc] of docs) {
    const ids = Object.keys(doc.orders);
    log(`${write ? 'WRITE' : 'DRY  '} ${ORDERS_BY_UID}/${uid}  ${ids.length} order(s): ${ids.map((id) => `${id}=${doc.orders[id].product}${doc.orders[id].refunded ? '(refunded)' : ''}`).join(', ')}`);
    if (write) { await db.collection(ORDERS_BY_UID).doc(uid).set(doc, { merge: true }); written += 1; }
  }
  log(`${write ? 'written' : 'would write'} ${docs.size} orders_by_uid document(s) from ${snap.docs.length} plugin_licenses document(s)${write ? '' : ' (dry run; pass --write to apply)'}`);
  return { docs, written };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const write = process.argv.includes('--write');
  const { initializeApp, applicationDefault, getApps } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  if (!getApps().length) initializeApp({ credential: applicationDefault(), projectId: process.env.GOOGLE_CLOUD_PROJECT || 'project-62238635-aae4-41f4-880' });
  await backfillOrdersByUid(getFirestore(), { write, log: console.log });
}
