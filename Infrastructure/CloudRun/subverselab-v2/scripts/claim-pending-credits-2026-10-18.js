// One-off (owner go 2026-10-18): moves the parked purchase credits of two buyers into their accounts.
// Ed (ecoutts@gmail.com, LS order 9767925) and Jimmy (jimmytaberner@outlook.com, LS order 9734889) bought the family
// without signing in, so the webhook parked 1,999 credits each in pending_credits/{e-mail}. Both later opened an
// e-mail/password account with the same address, but such accounts are never "proven" since e-mail verification was
// dropped (3 Oct), so claimPending never ran for them. This calls the same credits.claimPending() the site uses
// (one transaction: ledger purchase_{orderId} via 'pending', credits/{uid} balance + granted, pending doc deleted;
// skips any order that already has a ledger line). Nothing else changes.
// Dry run by default; `--write` applies it.  Run: node scripts/claim-pending-credits-2026-10-18.js [--write]
import { pathToFileURL } from 'node:url';
import { createCreditsService, PENDING_COLLECTION, CREDITS_COLLECTION, LEDGER_COLLECTION } from '../api/credits.js';

export const TARGETS = Object.freeze([
  Object.freeze({ email: 'ecoutts@gmail.com', orderId: '9767925' }),
  Object.freeze({ email: 'jimmytaberner@outlook.com', orderId: '9734889' }),
]);

export async function run({ db, auth, write = false, log = () => {} }) {
  const credits = createCreditsService({ getAdmin: async () => ({ db }) });
  const out = [];
  for (const t of TARGETS) {
    const user = await auth.getUserByEmail(t.email).catch(() => null);
    if (!user) { log(`SKIP ${t.email}: no account`); out.push({ ...t, result: 'no account' }); continue; }
    if (String(user.email || '').toLowerCase() !== t.email) { log(`SKIP ${t.email}: account e-mail ${user.email}`); continue; }
    const pend = await db.collection(PENDING_COLLECTION).doc(t.email).get();
    const orders = pend.exists ? pend.data().orders || {} : {};
    if (!orders[t.orderId]) { log(`SKIP ${t.email}: order ${t.orderId} not pending`); out.push({ ...t, result: 'not pending' }); continue; }
    const line = await db.collection(LEDGER_COLLECTION).doc(`purchase_${t.orderId}`).get();
    const cred = await db.collection(CREDITS_COLLECTION).doc(user.uid).get();
    const c = cred.exists ? cred.data() : {};
    log(`${write ? 'WRITE' : 'DRY  '} ${t.email} uid=${user.uid} pending=${JSON.stringify(orders)} ledger purchase_${t.orderId}=${line.exists ? 'EXISTS' : 'none'} credits now balance=${c.balance ?? 0} granted=${c.granted ?? 0} spent=${c.spent ?? 0}`);
    if (write) {
      const r = await credits.claimPending({ uid: user.uid, email: t.email });
      log(`      claimed ${JSON.stringify(r)}`);
      out.push({ ...t, uid: user.uid, result: r });
    } else out.push({ ...t, uid: user.uid, result: 'dry' });
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const write = process.argv.includes('--write');
  const { initializeApp, applicationDefault, getApps } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const { getAuth } = await import('firebase-admin/auth');
  if (!getApps().length) initializeApp({ credential: applicationDefault(), projectId: process.env.GOOGLE_CLOUD_PROJECT || 'project-62238635-aae4-41f4-880' });
  await run({ db: getFirestore(), auth: getAuth(), write, log: console.log });
}
