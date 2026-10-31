// Follow-up for the 25 Oct deploy of `freeByEmail` (RELEASE_QUEUE "DEPLOYED 25 Oct"). Read-only: writes nothing to Firestore.
// Before the deploy, an unproven password account could not see the $0 TABAN / ALEV / KIYMA order its e-mail placed signed
// out (report Up8eNlOJAUB6DU2Uz5n2, KIYMA, 23 Oct). Baseline 25 Oct, just before the switch: 107 such orders on 64 e-mails,
// never downloaded (TABAN 46, ALEV 34, KIYMA 27). This lists, for the same rule, how many are still not downloaded.
//   node scripts/followup-free-by-email.js            counts only
//   node scripts/followup-free-by-email.js --uids     also the uids still waiting (no e-mails printed)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

const FREE = ['taban', 'alev', 'kiyma'];
const SWITCH = '2026-10-25';
admin.initializeApp({ projectId: 'project-62238635-aae4-41f4-880' });
const db = admin.firestore();

const [lic, byUid, dls] = await Promise.all(['plugin_licenses', 'orders_by_uid', 'downloads'].map((c) => db.collection(c).get()));
const uidOrders = new Map(byUid.docs.map((d) => [d.id, d.data().orders || {}]));
const downloads = new Map(dls.docs.map((d) => [d.id, d.data()]));
const users = new Map();
let token;
do {
  const r = await admin.auth().listUsers(1000, token);
  for (const u of r.users) if (u.email) { const k = u.email.toLowerCase(); users.set(k, [...(users.get(k) || []), u]); }
  token = r.pageToken;
} while (token);

const rows = [];
for (const d of lic.docs) {
  const live = Object.entries(d.data().orders || {}).filter(([, o]) => o && o.status === 'paid' && !o.refunded && FREE.includes(o.product));
  for (const u of users.get(d.id) || []) {
    if (u.emailVerified || u.providerData.some((p) => p.providerId === 'google.com')) continue;
    const mine = uidOrders.get(u.uid) || {};
    for (const [id, o] of live) {
      if (id in mine) continue;
      const first = Object.values(downloads.get(u.uid)?.[o.product] || {}).map((p) => p?.first).filter(Boolean).sort()[0] || null;
      rows.push({ uid: u.uid, product: o.product, first });
    }
  }
}
const waiting = rows.filter((r) => !r.first);
const since = rows.filter((r) => r.first && String(r.first).slice(0, 10) >= SWITCH);
const by = (a) => a.reduce((m, r) => ((m[r.product] = (m[r.product] || 0) + 1), m), {});
console.log(`e-mail-only free orders on unproven accounts: ${rows.length}`);
console.log(`first download on/after ${SWITCH}: ${since.length} ${JSON.stringify(by(since))}`);
console.log(`still not downloaded: ${waiting.length} on ${new Set(waiting.map((r) => r.uid)).size} accounts ${JSON.stringify(by(waiting))}`);
if (process.argv.includes('--uids')) for (const r of waiting) console.log(r.product, r.uid);
process.exit(0);
