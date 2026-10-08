// Tool credits (phase 1a). Plain logic over a Firestore-shaped `db`; server.js does the HTTP.
//
// Every paid $1 on a plugin order = 100 credits (1 US cent = 1 credit). The online tools keep their daily
// free use; when it is used up a tool service (Splitter, Visualizer, Mix Check on other Cloud Run
// services) asks THIS service to spend credits, server to server (see CREDITS.md).
//
// Collections (Admin SDK only; firestore.rules lets a signed-in user read only their own credits/{uid}):
//   credits/{uid}              {balance, granted, spent, updatedAt}
//   credit_ledger/{id}         {uid, delta, reason, orderId?, tool?, jobId?, cost?, shortfall?, at}
//        id is deterministic so a retry can never write twice:
//          purchase_{orderId}  refund_{orderId}_{target}  spend_{tool}_{jobId}  release_{tool}_{jobId}
//        (reason 'admin' lines use an auto id)
//   pending_credits/{email}    {email, orders: {orderId: {credits, at}}}  paid orders that carried no uid;
//        claimed into credits/{uid} when a VERIFIED (or Google) account with that e-mail asks.
// Every balance change is one Firestore transaction (reads first, then writes).
//
// balance = granted - spent always holds: a refund lowers `granted` by what it could remove (never below a
// zero balance; the rest is recorded as `shortfall` on the ledger line and never blocks the refund), a
// release lowers `spent`.

export const CREDIT_COSTS = Object.freeze({ splitter: 50, visualizer: 50, mixcheck: 100 });
export const CREDITS_PER_USD_CENT = 1; // 100 credits per dollar
export const LEDGER_COLLECTION = 'credit_ledger';
export const CREDITS_COLLECTION = 'credits';
export const PENDING_COLLECTION = 'pending_credits';
const DEFAULT_AUDIENCE = 'https://subverselab.com';
const JOB_ID = /^[A-Za-z0-9_.:-]{1,128}$/;

const nowIso = () => new Date().toISOString();
const int = (v) => (Number.isInteger(v) ? v : null);
const mailKey = (value) => { const m = String(value || '').trim().toLowerCase(); return m && !m.includes('/') ? m : null; };

/**
 * What an order paid, from a Lemon Squeezy order object's attributes
 * (https://docs.lemonsqueezy.com/api/orders/the-order-object, checked 2026-10-05): total, total_usd,
 * subtotal_usd, tax_usd, refunded_amount, refunded_amount_usd are integers in CENTS; currency is ISO 4217;
 * status is pending | failed | paid | refunded | partial_refund | fraudulent.
 * amount_usd_cents = total_usd - tax_usd (tax-free, owner 2026-10-05); when total_usd is missing, `total - tax` counts only if currency is USD. Anything else
 * leaves amount_usd_cents null: no credits are granted and the caller logs it.
 */
export function orderAmount(attrs) {
  const a = attrs || {};
  const total = int(a.total);
  const totalUsd = int(a.total_usd);
  const currency = typeof a.currency === 'string' ? a.currency.toUpperCase() : null;
  const taxUsd = int(a.tax_usd);
  const tax = int(a.tax);
  // Owner 2026-10-05: credits follow the price WITHOUT tax (total minus tax; discounts already in total).
  let cents = null;
  if (totalUsd !== null && totalUsd >= 0) cents = Math.max(0, totalUsd - (taxUsd !== null && taxUsd > 0 ? taxUsd : 0));
  else if (total !== null && total >= 0 && currency === 'USD') cents = Math.max(0, total - (tax !== null && tax > 0 ? tax : 0));
  return { amount_usd_cents: cents, currency, total, credits: cents === null ? 0 : Math.floor(cents * CREDITS_PER_USD_CENT) };
}

async function defaultVerifyOidc(idToken, audience) {
  const { OAuth2Client } = await import('google-auth-library');
  const client = defaultVerifyOidc.client || (defaultVerifyOidc.client = new OAuth2Client());
  const ticket = await client.verifyIdToken({ idToken, audience });
  return ticket.getPayload();
}

/**
 * @param {() => Promise<{db}>} getAdmin
 * @param {(idToken: string, audience: string) => Promise<object>} verifyOidc  Google-signed OIDC check (tests inject a fake)
 */
export function createCreditsService({ getAdmin, verifyOidc = defaultVerifyOidc, now = nowIso }) {
  const refs = async () => {
    const { db } = await getAdmin();
    return {
      db,
      credit: (uid) => db.collection(CREDITS_COLLECTION).doc(uid),
      line: (id) => db.collection(LEDGER_COLLECTION).doc(id),
      pending: (email) => db.collection(PENDING_COLLECTION).doc(email),
    };
  };
  const num = (v) => (Number.isFinite(v) ? v : 0);

  // A paid order: grant to its uid, or park it under the e-mail until a verified account claims it.
  async function grantOrder({ email, uid, orderId, credits }) {
    const id = String(orderId);
    if (!(credits > 0)) return { result: 'none' };
    const r = await refs();
    const at = now();
    return r.db.runTransaction(async (tx) => {
      const lineRef = r.line(`purchase_${id}`);
      const mail = mailKey(email);
      if (uid) {
        const [lineSnap, credSnap] = await Promise.all([tx.get(lineRef), tx.get(r.credit(uid))]);
        if (lineSnap.exists) return { result: 'duplicate' };
        const c = credSnap.exists ? credSnap.data() : {};
        tx.set(lineRef, { uid, delta: credits, reason: 'purchase', orderId: id, at });
        tx.set(r.credit(uid), { balance: num(c.balance) + credits, granted: num(c.granted) + credits, spent: num(c.spent), updatedAt: at });
        return { result: 'granted', credits };
      }
      if (!mail) return { result: 'no-owner' };
      const [lineSnap, pendSnap] = await Promise.all([tx.get(lineRef), tx.get(r.pending(mail))]);
      if (lineSnap.exists || pendSnap.data()?.orders?.[id]) return { result: 'duplicate' };
      const orders = { ...(pendSnap.exists ? pendSnap.data().orders || {} : {}), [id]: { credits, at } };
      tx.set(r.pending(mail), { email: mail, orders, updatedAt: at });
      return { result: 'pending', credits };
    });
  }

  // Moves the credits parked under this e-mail into credits/{uid}. Call only for an owned (verified / Google) e-mail.
  async function claimPending({ uid, email }) {
    const mail = mailKey(email);
    if (!uid || !mail) return { claimed: 0 };
    const r = await refs();
    if (!(await r.pending(mail).get()).exists) return { claimed: 0 };
    const at = now();
    return r.db.runTransaction(async (tx) => {
      const [pendSnap, credSnap] = await Promise.all([tx.get(r.pending(mail)), tx.get(r.credit(uid))]);
      if (!pendSnap.exists) return { claimed: 0 };
      const orders = pendSnap.data().orders || {};
      const ids = Object.keys(orders);
      const lines = await Promise.all(ids.map((id) => tx.get(r.line(`purchase_${id}`))));
      const c = credSnap.exists ? credSnap.data() : {};
      let total = 0;
      ids.forEach((id, i) => {
        if (lines[i].exists) return; // already granted to an account
        const credits = num(orders[id]?.credits);
        if (credits <= 0) return;
        total += credits;
        tx.set(r.line(`purchase_${id}`), { uid, delta: credits, reason: 'purchase', orderId: id, via: 'pending', at });
      });
      if (total > 0) tx.set(r.credit(uid), { balance: num(c.balance) + total, granted: num(c.granted) + total, spent: num(c.spent), updatedAt: at });
      tx.delete(r.pending(mail));
      return { claimed: total };
    });
  }

  // order_refunded: take the order's credits back. `full` removes all of them; a partial refund removes the same
  // share (refundedUsdCents / totalUsdCents). Idempotent per (order, level). Never below a zero balance.
  async function refundOrder({ email, orderId, full, refundedUsdCents, totalUsdCents }) {
    const id = String(orderId);
    const r = await refs();
    const at = now();
    return r.db.runTransaction(async (tx) => {
      const purchaseRef = r.line(`purchase_${id}`);
      const mail = mailKey(email);
      const purchaseSnap = await tx.get(purchaseRef);
      if (!purchaseSnap.exists) {
        const pendSnap = mail ? await tx.get(r.pending(mail)) : null;
        if (!pendSnap?.exists || !pendSnap.data().orders?.[id]) return { result: 'nothing' };
        const orders = { ...pendSnap.data().orders };
        delete orders[id];
        if (Object.keys(orders).length) tx.set(r.pending(mail), { email: mail, orders, updatedAt: at });
        else tx.delete(r.pending(mail));
        return { result: 'pending-removed' };
      }
      const purchase = purchaseSnap.data();
      const granted = num(purchase.delta);
      let target = granted;
      if (!full) {
        if (!(refundedUsdCents > 0) || !(totalUsdCents > 0)) return { result: 'partial-unknown' };
        target = Math.min(granted, Math.floor((granted * refundedUsdCents) / totalUsdCents));
      }
      const prior = num(purchase.refundedTarget);
      const need = target - prior;
      if (need <= 0) return { result: 'duplicate' };
      const lineRef = r.line(`refund_${id}_${target}`);
      const [lineSnap, credSnap] = await Promise.all([tx.get(lineRef), tx.get(r.credit(purchase.uid))]);
      if (lineSnap.exists) return { result: 'duplicate' };
      if (!credSnap.exists) return { result: 'no-account' };
      const c = credSnap.data();
      const removed = Math.min(need, Math.max(0, num(c.balance)));
      const shortfall = need - removed;
      tx.set(lineRef, { uid: purchase.uid, delta: -removed, reason: 'refund', orderId: id, ...(shortfall ? { shortfall } : {}), at });
      tx.set(r.credit(purchase.uid), { balance: num(c.balance) - removed, granted: num(c.granted) - removed, spent: num(c.spent), updatedAt: at });
      tx.set(purchaseRef, { refundedTarget: target }, { merge: true });
      return { result: 'removed', removed, shortfall };
    });
  }

  const cleanJob = (tool, jobId) => (Object.hasOwn(CREDIT_COSTS, tool) && typeof jobId === 'string' && JOB_ID.test(jobId));

  async function spend({ uid, tool, jobId }) {
    if (!cleanJob(tool, jobId)) return { ok: false, status: 400, reason: 'bad-request' };
    const cost = CREDIT_COSTS[tool];
    const r = await refs();
    const at = now();
    return r.db.runTransaction(async (tx) => {
      const spendRef = r.line(`spend_${tool}_${jobId}`);
      const [spendSnap, releaseSnap, credSnap] = await Promise.all([tx.get(spendRef), tx.get(r.line(`release_${tool}_${jobId}`)), tx.get(r.credit(uid))]);
      const c = credSnap.exists ? credSnap.data() : {};
      const balance = num(c.balance);
      if (spendSnap.exists) {
        if (spendSnap.data().uid !== uid) return { ok: false, status: 409, reason: 'job-conflict', cost };
        if (releaseSnap.exists) return { ok: false, status: 409, reason: 'released', balance, cost };
        return { ok: true, status: 200, balance, cost, duplicate: true };
      }
      if (balance < cost) return { ok: false, status: 402, reason: 'insufficient', balance, cost };
      tx.set(spendRef, { uid, delta: -cost, cost, reason: 'spend', tool, jobId, at });
      tx.set(r.credit(uid), { balance: balance - cost, granted: num(c.granted), spent: num(c.spent) + cost, updatedAt: at });
      return { ok: true, status: 200, balance: balance - cost, cost };
    });
  }

  async function release({ tool, jobId }) {
    if (!cleanJob(tool, jobId)) return { ok: false, status: 400, reason: 'bad-request' };
    const r = await refs();
    const at = now();
    return r.db.runTransaction(async (tx) => {
      const releaseRef = r.line(`release_${tool}_${jobId}`);
      const [spendSnap, releaseSnap] = await Promise.all([tx.get(r.line(`spend_${tool}_${jobId}`)), tx.get(releaseRef)]);
      if (!spendSnap.exists) return { ok: false, status: 404, reason: 'no-such-spend' };
      const { uid, cost } = spendSnap.data();
      const credSnap = await tx.get(r.credit(uid));
      const c = credSnap.exists ? credSnap.data() : {};
      if (releaseSnap.exists) return { ok: true, status: 200, released: false, duplicate: true, balance: num(c.balance) };
      tx.set(releaseRef, { uid, delta: cost, cost, reason: 'release', tool, jobId, at });
      tx.set(r.credit(uid), { balance: num(c.balance) + cost, granted: num(c.granted), spent: Math.max(0, num(c.spent) - cost), updatedAt: at });
      return { ok: true, status: 200, released: true, balance: num(c.balance) + cost };
    });
  }

  // {balance, granted, spent, recent: last 20 lines, newest first}. No uid in the lines.
  async function readBalance(uid) {
    const r = await refs();
    const c = (await r.credit(uid).get()).data() || {};
    const base = r.db.collection(LEDGER_COLLECTION).where('uid', '==', uid);
    let docs;
    try {
      docs = (await base.orderBy('at', 'desc').limit(20).get()).docs;
    } catch (err) {
      // Composite index (uid, at) not deployed yet: fall back to an unordered read, sorted here.
      if (err?.code !== 9 && !/index/i.test(String(err?.message))) throw err;
      docs = (await base.limit(200).get()).docs;
    }
    const recent = docs.map((d) => d.data())
      .sort((x, y) => String(y.at).localeCompare(String(x.at))).slice(0, 20)
      .map((l) => ({ delta: l.delta, reason: l.reason, tool: l.tool || null, at: l.at }));
    return { balance: num(c.balance), granted: num(c.granted), spent: num(c.spent), recent };
  }

  // Server-to-server caller check: a Google-signed OIDC identity token, audience = this site, e-mail on the allow-list.
  async function authenticateCaller(authorization) {
    const allowed = String(process.env.CREDITS_ALLOWED_CALLERS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (!allowed.length) return { ok: false, status: 503, error: 'Credits API is not enabled' };
    const token = String(authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return { ok: false, status: 401, error: 'Missing caller token' };
    const audience = process.env.CREDITS_AUDIENCE || DEFAULT_AUDIENCE;
    let payload;
    try {
      payload = await verifyOidc(token, audience);
    } catch (err) {
      const down = /certificates|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN/i.test(String(err?.message));
      return { ok: false, status: down ? 503 : 401, error: down ? 'Caller check unavailable' : 'Invalid caller token' };
    }
    const email = String(payload?.email || '').trim().toLowerCase();
    if (!email || payload?.email_verified !== true) return { ok: false, status: 401, error: 'Invalid caller token' };
    if (!allowed.includes(email)) return { ok: false, status: 403, error: 'Caller not allowed' };
    return { ok: true, email };
  }

  return { grantOrder, claimPending, refundOrder, spend, release, readBalance, authenticateCaller };
}
