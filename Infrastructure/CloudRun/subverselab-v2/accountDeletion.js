// Self-service account deletion and the report-retention purge.
//
// Plain logic over a Firestore-shaped `db` (the Admin SDK's, or the in-memory
// fake in scripts/test-account-delete.js); server.js does the HTTP and the
// token checks, this file decides what goes and what stays.
//
// What stays after a deletion is exactly this, in `erased_emails/{marker}`
// where marker = emailMarker(address), an HMAC-SHA256 that cannot be turned
// back into the address:
//   claimed   {launch: true, launch2: true}  the free launch licence was used,
//             so signing up again with the same address cannot claim another
//             (launchLicence.js claim() reads it). No counter is touched, so
//             the public "claimed" number never goes down.
//   orders    {orderId: {order_id, product, status, refunded, created}}  paid
//             Lemon Squeezy orders, reduced to what refunds and re-downloads
//             need (entitlements.js and the webhook read it).
//   purchase / seat   the launch-2 purchase and its seat, reduced the same way.
// No e-mail address, name, receipt link or licence key is kept. The privacy
// text (src/data/legalContent.js, "How long we keep it") describes this; change
// both together.

import { createHmac } from 'crypto';

export const ERASED_COLLECTION = 'erased_emails';
export const LAUNCH_IDS = ['launch', 'launch2'];
export const REPORT_RETENTION_MONTHS = 12;
// The owner moved old reports and forum topics into *_archive collections (Admin SDK only, no client access).
const REPORT_COLLECTIONS = ['reports', 'reports_archive'];
const FORUM_COLLECTIONS = ['forum_topics', 'forum_topics_archive'];

// Keyed with ACCOUNT_HASH_SECRET when the service has one. Set it before the
// first deletion and never change it: markers made under another key no longer
// match. Without it a fixed label is used, which still keeps the address out of
// the database in readable form.
export function emailMarker(email) {
  const secret = process.env.ACCOUNT_HASH_SECRET || 'subverselab-erased-email-v1';
  return createHmac('sha256', secret).update(String(email || '').trim().toLowerCase()).digest('hex');
}

const normMail = (value) => {
  const m = String(value || '').trim().toLowerCase();
  return m && !m.includes('/') ? m : null;
};

const keptOrder = (o) => ({
  order_id: o.order_id ?? null,
  product: o.product ?? null,
  status: o.status ?? null,
  refunded: Boolean(o.refunded),
  created: o.created ?? null,
});

/**
 * @param {() => Promise<{db, auth}>} getAdmin
 * @param {() => string} now  ISO timestamp source (tests pin it)
 */
export function createAccountDeleter({ getAdmin, now = () => new Date().toISOString() }) {
  /**
   * Finds everything that holds this person, writes the hashed markers, then
   * deletes. Markers go first so a crash half way can never lose one; running
   * it again finds what is left and finishes (idempotent).
   *
   * emailOwned: the e-mail address is verified for this account (Google, or a
   * password account that clicked its link). Only then are documents keyed by
   * the plain address treated as this person's own — otherwise anyone could
   * register somebody else's address and delete that person's licence. An
   * unverified account is deleted by account id and by the records that carry
   * its own account id.
   */
  async function deleteData({ uid, email, emailOwned }) {
    const { db } = await getAdmin();
    const mail = normMail(email);
    const rawMail = String(email || '').trim();
    const counts = {};
    const bump = (key, n = 1) => { counts[key] = (counts[key] || 0) + n; };
    const doomed = new Map(); // path -> {ref, key}
    const planDelete = (ref, key) => { if (!doomed.has(ref.path)) doomed.set(ref.path, { ref, key }); };
    const markers = new Map(); // hash -> patch for erased_emails/{hash}
    const markerFor = (address) => {
      const h = emailMarker(address);
      if (!markers.has(h)) markers.set(h, { erasedAt: now() });
      return markers.get(h);
    };
    const ownKeys = new Set();

    // 1. Free launch licences: claims, keys, and the marker that stops a second claim.
    for (const launchId of LAUNCH_IDS) {
      const claims = db.collection(`${launchId}_claims`);
      const uidClaim = await claims.doc(`uid:${uid}`).get();
      const mailClaim = mail ? await claims.doc(`email:${mail}`).get() : null;
      const mailClaimIsMine = Boolean(mailClaim?.exists && (emailOwned || mailClaim.data().uid === uid));
      const keyDocs = new Map();
      for (const d of (await db.collection(`${launchId}_keys`).where('uid', '==', uid).get()).docs) keyDocs.set(d.ref.path, d);
      if (mail && emailOwned) {
        for (const d of (await db.collection(`${launchId}_keys`).where('email', '==', mail).get()).docs) keyDocs.set(d.ref.path, d);
      }
      for (const d of keyDocs.values()) { ownKeys.add(d.id); planDelete(d.ref, `${launchId}_keys`); }
      if (uidClaim.exists) planDelete(claims.doc(`uid:${uid}`), `${launchId}_claims`);
      if (mailClaimIsMine) planDelete(claims.doc(`email:${mail}`), `${launchId}_claims`);
      if (mail && (uidClaim.exists || mailClaimIsMine || keyDocs.size)) {
        markerFor(mail).claimed = { ...(markerFor(mail).claimed || {}), [launchId]: true };
      }
    }

    // 2. The dashboard document, keyed by e-mail: paid orders shrink to markers.
    if (mail) {
      const ref = db.collection('plugin_licenses').doc(mail);
      const snap = await ref.get();
      if (snap.exists) {
        const data = snap.data() || {};
        if (emailOwned) {
          for (const o of Object.values(data.orders || {})) {
            if (!o || !o.order_id) continue;
            markerFor(mail).orders = { ...(markerFor(mail).orders || {}), [String(o.order_id)]: keptOrder(o) };
          }
          planDelete(ref, 'plugin_licenses');
        } else {
          // Not verified: only take out the licences that were minted for this account.
          const licences = { ...(data.licenses || {}) };
          let changed = false;
          for (const [id, l] of Object.entries(licences)) {
            if (ownKeys.has(l?.key) || ownKeys.has(id)) { delete licences[id]; changed = true; }
          }
          if (changed) {
            if (!Object.keys(licences).length && !Object.keys(data.orders || {}).length) planDelete(ref, 'plugin_licenses');
            else await ref.set({ ...data, licenses: licences });
          }
        }
      }
    }

    // 3. Launch 2: the paid purchase and its seat shrink to markers; the uid binding goes.
    const uidBindRef = db.collection('launch2_uids').doc(uid);
    const uidBind = await uidBindRef.get();
    if (uidBind.exists) planDelete(uidBindRef, 'launch2_uids');
    const purchaseMails = new Set();
    if (mail) purchaseMails.add(mail);
    if (uidBind.exists && normMail(uidBind.data().email)) purchaseMails.add(normMail(uidBind.data().email));
    for (const address of purchaseMails) {
      const purchaseRef = db.collection('launch2_purchases').doc(address);
      const purchase = await purchaseRef.get();
      if (!purchase.exists) continue;
      const p = purchase.data() || {};
      const bound = uidBind.exists && normMail(uidBind.data().email) === address && uidBind.data().orderId === p.orderId;
      const mine = (address === mail && emailOwned) || p.uid === uid || bound;
      if (!mine) continue;
      const patch = markerFor(address);
      patch.purchase = { orderId: p.orderId ?? null, paidAt: p.paidAt ?? null, refunded: Boolean(p.refunded), overCap: Boolean(p.overCap), seat: Boolean(p.seat) };
      planDelete(purchaseRef, 'launch2_purchases');
      const seatRef = db.collection('launch2_seats').doc(address);
      const seat = await seatRef.get();
      if (seat.exists) {
        patch.seat = { orderId: seat.data().orderId ?? null, at: seat.data().at ?? null };
        planDelete(seatRef, 'launch2_seats');
      }
    }

    // 4. Tester programme. The seat counter (launch2/testers) is left alone.
    if (mail) {
      const appRef = db.collection('tester_applications').doc(mail);
      const app = await appRef.get();
      if (app.exists && (emailOwned || app.data().uid === uid)) planDelete(appRef, 'tester_applications');
      if (emailOwned) {
        const testerRef = db.collection('launch2_testers').doc(mail);
        if ((await testerRef.get()).exists) planDelete(testerRef, 'launch2_testers');
        for (const d of (await db.collection('tester_reports').where('email', '==', mail).get()).docs) planDelete(d.ref, 'tester_reports');
      }
    }

    // 5. Download counters per account and the old profile document.
    for (const [collection, key] of [['downloads', 'downloads'], ['users', 'users']]) {
      const ref = db.collection(collection).doc(uid);
      if ((await ref.get()).exists) planDelete(ref, key);
    }

    // 6. Problem reports: filed with the account id, or with this address typed in.
    // Archived copies (reports_archive) hold the same fields and go the same way.
    const reportDocs = new Map();
    for (const col of REPORT_COLLECTIONS) {
      for (const d of (await db.collection(col).where('uid', '==', uid).get()).docs) reportDocs.set(d.ref.path, d);
      if (emailOwned) {
        for (const address of new Set([mail, rawMail].filter(Boolean))) {
          for (const d of (await db.collection(col).where('userEmail', '==', address).get()).docs) reportDocs.set(d.ref.path, d);
        }
      }
    }
    for (const d of reportDocs.values()) planDelete(d.ref, 'reports');

    // 7. Forum: their topics (with every reply under them) and their replies elsewhere.
    for (const col of FORUM_COLLECTIONS) {
      for (const topic of (await db.collection(col).get()).docs) {
        const replies = topic.ref.collection('replies');
        if (topic.data().authorId === uid) {
          for (const r of (await replies.get()).docs) planDelete(r.ref, 'forum_replies');
          planDelete(topic.ref, col);
        } else {
          for (const r of (await replies.where('authorId', '==', uid).get()).docs) planDelete(r.ref, 'forum_replies');
        }
      }
    }

    // Markers first, then the deletions.
    for (const [hash, patch] of markers) await db.collection(ERASED_COLLECTION).doc(hash).set(patch, { merge: true });
    for (const { ref, key } of doomed.values()) { await ref.delete(); bump(key); }
    return counts;
  }

  /** Data first, the sign-in last; an account that is already gone counts as done. */
  async function deleteAccount({ uid, email, emailOwned }) {
    const counts = await deleteData({ uid, email, emailOwned });
    const { auth } = await getAdmin();
    try {
      await auth.deleteUser(uid);
      counts.auth_user = 1;
    } catch (err) {
      if (err?.code !== 'auth/user-not-found') throw err;
    }
    return counts;
  }

  return { deleteData, deleteAccount };
}

/**
 * Deletes problem reports resolved, or archived (reports_archive), more than 12 months ago. A
 * resolved report without a `resolvedAt` (marked resolved before the admin
 * panel stamped it) gets one now, so its 12 months start today.
 */
export async function purgeResolvedReports(db, nowMs = Date.now()) {
  const cutoff = new Date(nowMs);
  cutoff.setMonth(cutoff.getMonth() - REPORT_RETENTION_MONTHS);
  let deleted = 0;
  let stamped = 0;
  const handle = async (d, field) => {
    const at = Date.parse(d.data()[field] || '');
    if (Number.isNaN(at)) {
      await d.ref.set({ [field]: new Date(nowMs).toISOString() }, { merge: true });
      stamped += 1;
    } else if (at < cutoff.getTime()) {
      await d.ref.delete();
      deleted += 1;
    }
  };
  for (const d of (await db.collection('reports').where('status', '==', 'resolved').get()).docs) await handle(d, 'resolvedAt');
  // Archived reports: the clock is resolvedAt if they were resolved, else archivedAt.
  for (const d of (await db.collection('reports_archive').get()).docs) await handle(d, d.data().resolvedAt ? 'resolvedAt' : 'archivedAt');
  return { deleted, stamped };
}
