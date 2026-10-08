#!/usr/bin/env node
// Small admin switches that need no deploy. They change data only (a Firebase
// custom claim or Firestore documents), never code.
//
//   node scripts/admin-mode.js status
//   node scripts/admin-mode.js buyer     tools treat the admin like a buyer: daily free use, then credits
//   node scripts/admin-mode.js admin     back to unlimited tool use
//   node scripts/admin-mode.js credits <n>   set the admin's credit balance to n (ledger line 'admin-adjust')
//
// The tools (Splitter, Visualizer, Mix Check) decide "admin" from the `admin`
// custom claim; the site decides it from ADMIN_EMAILS, so `buyer` changes
// nothing on subverselab.com. A claim change reaches a tool when its ID token
// refreshes: sign out and in again on the site, or wait up to an hour.
import admin from 'firebase-admin';

const ADMIN_EMAIL = 'senolsahan037@gmail.com';
admin.initializeApp({ projectId: 'project-62238635-aae4-41f4-880' });
const db = admin.firestore();

const [cmd, arg] = process.argv.slice(2);
const user = await admin.auth().getUserByEmail(ADMIN_EMAIL);
const claims = user.customClaims || {};
const creditRef = db.collection('credits').doc(user.uid);

async function show() {
  const fresh = (await admin.auth().getUser(user.uid)).customClaims || {};
  const c = (await creditRef.get()).data() || {};
  console.log(`${ADMIN_EMAIL}: tools see ${fresh.admin === true ? 'ADMIN (unlimited)' : 'BUYER (free use, then credits)'} · credits ${c.balance ?? 0}`);
}

if (cmd === 'buyer' || cmd === 'admin') {
  const next = { ...claims };
  if (cmd === 'admin') next.admin = true; else delete next.admin;
  await admin.auth().setCustomUserClaims(user.uid, next);
  await show();
  console.log('Sign out and in on subverselab.com for the tools to notice.');
} else if (cmd === 'credits') {
  const target = Number(arg);
  if (!Number.isInteger(target) || target < 0) { console.error('credits needs a whole number >= 0'); process.exit(1); }
  const at = new Date().toISOString();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(creditRef);
    const c = snap.exists ? snap.data() : {};
    const balance = Number.isFinite(c.balance) ? c.balance : 0;
    const delta = target - balance;
    if (delta === 0) return;
    tx.set(db.collection('credit_ledger').doc(`admin_adjust_${Date.now()}`), { uid: user.uid, delta, reason: 'admin-adjust', at });
    tx.set(creditRef, { balance: target, granted: (c.granted || 0) + Math.max(delta, 0), spent: c.spent || 0, updatedAt: at });
  });
  await show();
} else if (cmd === 'status' || !cmd) {
  await show();
} else {
  console.error('usage: admin-mode.js status | buyer | admin | credits <n>');
  process.exit(1);
}
