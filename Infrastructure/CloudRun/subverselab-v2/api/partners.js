// Affiliate partners: the sales ledger and the partner's own report (owner 12 Nov 2026: one permanent, honest setup for every
// partner; Rekkerd first). The public part (aff code, reader discount code) is src/data/partners.js; this is the server part.
//
// Firestore (Admin SDK only; firestore.rules deny every client read and write):
//   partners/{id}        { name, aff, lsAffiliateId (optional, Lemon Squeezy's affiliate id), discountCode, commissionPct,
//                          reportTokenHash (sha256 hex of the report token), active }
//                        written by scripts/partner-cli.js; the token itself is shown once and never stored.
//   partner_sales/{orderId}
//                        { partnerId, source: 'link' | 'code', product, created, amountUsdCents, commissionPct,
//                          commissionUsdCents, paidBy: 'lemonsqueezy' | 'subverselab', lsAffiliateId, lsReferralCents,
//                          refunded, status, refundedUsdCents, recordedAt, refundedAt }
//                        No buyer e-mail, name, uid or receipt URL: the partner reads this through its report.
//
// Attribution of a Lemon Squeezy order (webhook order_created with status paid, and order_refunded):
//   1. meta.custom_data.aff (the site puts checkout[custom][aff] into every checkout link while a partner code is active,
//      src/affiliate.js) names an active partner -> source 'link'. Also 'link': the order's own attributes.affiliate_id
//      (Lemon Squeezy's affiliate on the order) equals a partner's lsAffiliateId (optional field in partners/{id}). Lemon Squeezy credits the same sale to the affiliate
//      through ?aff= and pays that commission itself, so paidBy 'lemonsqueezy'.
//   2. else the order's discount code is a partner's reader code -> source 'code'. Lemon Squeezy does not tie a discount code
//      to an affiliate, so SubverseLab pays that commission (paidBy 'subverselab'). The code is not in the webhook's order
//      attributes; it is read from GET /v1/discount-redemptions?filter[order_id]=<id> (attributes.discount_code; field names
//      checked by the lead against the live API, 12 Nov 2026) with LS_API_KEY (Secret Manager `ls-api-key`). Without LS_API_KEY this step is skipped (logged once).
// Amount: the order's price without tax (credits.js orderAmount, discounts already taken off). Commission = round(amount * pct / 100).
// Idempotent per order: a repeated order_created leaves the document as it is; order_refunded updates the same document.
import { createHash, randomBytes } from 'node:crypto';
import { orderAmount } from './credits.js';

export const PARTNERS = 'partners';
export const PARTNER_SALES = 'partner_sales';
export const TOKEN_PREFIX = 'svlp_';
export const LS_API = 'https://api.lemonsqueezy.com/v1';
const AFF_RE = /^[A-Za-z0-9]{3,32}$/;
const ORDER_RE = /^[0-9]{1,20}$/;

export const hashReportToken = (token) => createHash('sha256').update(String(token)).digest('hex');
export const newReportToken = () => `${TOKEN_PREFIX}${randomBytes(24).toString('base64url')}`;
const looksLikeToken = (t) => typeof t === 'string' && t.startsWith(TOKEN_PREFIX) && t.length >= 20 && t.length <= 100;
const usd = (cents) => Math.round(Number(cents) || 0) / 100;
export const commissionCents = (amountCents, pct) => Math.round((Number(amountCents) || 0) * (Number(pct) || 0) / 100);

/**
 * @param {object} o
 * @param {() => Promise<{db}>} o.getAdmin   Firestore (Admin SDK) like server.js adminFirestore
 * @param {typeof fetch} [o.fetchImpl]       injectable for tests
 * @param {() => string|undefined} [o.apiKey] the Lemon Squeezy API key (default: process.env.LS_API_KEY at call time)
 */
export function createPartnerService({ getAdmin, fetchImpl = (...a) => globalThis.fetch(...a), apiKey = () => process.env.LS_API_KEY, now = () => new Date(), log = console, cacheMs = 60_000 } = {}) {
  let cache = null;   // { at, list }
  let warnedNoKey = false;

  async function partners() {
    const t = now().getTime();
    if (cache && t - cache.at < cacheMs) return cache.list;
    const { db } = await getAdmin();
    const snap = await db.collection(PARTNERS).get();
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    cache = { at: t, list };
    return list;
  }

  // The discount codes used on one order (upper case), from Lemon Squeezy's discount redemptions. [] when there is none or no key.
  async function orderDiscountCodes(orderId) {
    const key = apiKey();
    if (!key) {
      if (!warnedNoKey) { warnedNoKey = true; log.warn?.('partners: LS_API_KEY not set; sales through a partner discount code are not attributed'); }
      return null;
    }
    if (!ORDER_RE.test(String(orderId))) return [];
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 5000) : null;
    try {
      const r = await fetchImpl(`${LS_API}/discount-redemptions?filter[order_id]=${encodeURIComponent(String(orderId))}`, {
        headers: { Accept: 'application/vnd.api+json', Authorization: `Bearer ${key}` },
        signal: ctrl?.signal,
      });
      if (!r.ok) { log.warn?.(`partners: discount-redemptions for order ${orderId} answered ${r.status}`); return []; }
      const body = await r.json();
      const rows = Array.isArray(body?.data) ? body.data : [];
      return rows.map((row) => String(row?.attributes?.discount_code || '').trim().toUpperCase()).filter(Boolean);
    } finally { if (timer) clearTimeout(timer); }
  }

  async function attribute(list, { orderId, aff, affiliateId }) {
    const active = list.filter((p) => p.active !== false);
    const byLink = AFF_RE.test(String(aff || '')) ? active.find((p) => p.aff === aff) : null;
    if (byLink) return { partner: byLink, source: 'link' };
    // Lemon Squeezy's own affiliate on the order (attributes.affiliate_id), matched to partners/{id}.lsAffiliateId.
    const byLsAffiliate = affiliateId != null && affiliateId !== '' ? active.find((p) => p.lsAffiliateId != null && String(p.lsAffiliateId) === String(affiliateId)) : null;
    if (byLsAffiliate) return { partner: byLsAffiliate, source: 'link' };
    const withCode = active.filter((p) => p.discountCode);
    if (!withCode.length) return null;
    const codes = await orderDiscountCodes(orderId);
    if (!codes?.length) return null;
    const byCode = withCode.find((p) => codes.includes(String(p.discountCode).toUpperCase()));
    return byCode ? { partner: byCode, source: 'code' } : null;
  }

  /**
   * One webhook event. Never throws on bad input; Firestore / network errors do throw (the caller logs them).
   * @param {{ event: string, orderId: string, attrs: object, customData: object, product: string|null }} o
   * @returns {Promise<{ result: string, partnerId?: string, source?: string }>}
   */
  async function recordOrder({ event, orderId, attrs = {}, customData = {}, product = null }) {
    if (event !== 'order_created' && event !== 'order_refunded') return { result: 'ignored' };
    const id = String(orderId || '');
    if (!ORDER_RE.test(id)) return { result: 'no order id' };
    if (event === 'order_created' && attrs.status !== 'paid') return { result: `status ${attrs.status || 'unknown'}` };
    const list = await partners();
    if (!list.length) return { result: 'no partners' };
    const { db } = await getAdmin();
    const ref = db.collection(PARTNER_SALES).doc(id);
    const existing = await ref.get();
    // Lemon Squeezy: refunded = true only for a full refund; a partial one is status 'partial_refund' (the sale still counts,
    // its refunded share is kept as refundedUsdCents for the owner to settle by hand).
    const refunded = event === 'order_refunded' ? (attrs.status === 'partial_refund' ? false : attrs.refunded !== false) : attrs.refunded === true;
    const refundedUsdCents = Number.isInteger(attrs.refunded_amount_usd) ? attrs.refunded_amount_usd : null;
    if (existing.exists) {
      if (event === 'order_created') return { result: 'exists', partnerId: existing.data().partnerId };
      await ref.set({ refunded, status: attrs.status || 'refunded', refundedUsdCents, refundedAt: now().toISOString() }, { merge: true });
      return { result: 'refund recorded', partnerId: existing.data().partnerId };
    }
    const hit = await attribute(list, { orderId: id, aff: customData?.aff, affiliateId: attrs.affiliate_id });
    if (!hit) return { result: 'no partner' };
    const amount = orderAmount(attrs).amount_usd_cents ?? 0;
    const pct = Number(hit.partner.commissionPct) || 0;
    const doc = {
      partnerId: hit.partner.id,
      source: hit.source,
      product: product || null,
      created: attrs.created_at || now().toISOString(),
      amountUsdCents: amount,
      commissionPct: pct,
      commissionUsdCents: commissionCents(amount, pct),
      // Lemon Squeezy pays only what it credited itself (an affiliate on the order); everything else is ours to pay (lead 12 Nov:
      // a link sale Lemon Squeezy did not credit must not look paid in the partner's report).
      paidBy: hit.source === 'link' && attrs.affiliate_id != null && attrs.affiliate_id !== '' ? 'lemonsqueezy' : 'subverselab',
      // What Lemon Squeezy itself recorded: its affiliate id and referral (commission) amount in cents, null when it credited
      // no affiliate. A link sale with lsAffiliateId null is one Lemon Squeezy did not credit: the owner settles it by hand.
      lsAffiliateId: attrs.affiliate_id != null ? String(attrs.affiliate_id) : null,
      lsReferralCents: Number.isInteger(attrs.referral_amount) ? attrs.referral_amount : null,
      refunded,
      status: attrs.status || null,
      recordedAt: now().toISOString(),
      refundedUsdCents: event === 'order_refunded' ? refundedUsdCents : null,
      refundedAt: event === 'order_refunded' ? now().toISOString() : null,
    };
    await ref.set(doc);
    return { result: 'recorded', partnerId: hit.partner.id, source: hit.source };
  }

  /** The partner's report for a token, or null (unknown token). */
  async function report(token) {
    if (!looksLikeToken(token)) return null;
    const hash = hashReportToken(token);
    let partner = (await partners()).find((p) => p.reportTokenHash === hash);
    if (!partner) {
      // A token made a moment ago (or just rotated) may not be in the cached list yet.
      cache = null;
      partner = (await partners()).find((p) => p.reportTokenHash === hash);
    }
    if (!partner) return null;
    const { db } = await getAdmin();
    const snap = await db.collection(PARTNER_SALES).where('partnerId', '==', partner.id).get();
    const rows = snap.docs.map((d) => d.data()).sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
    const sales = rows.map((s) => ({
      date: s.created || null,
      product: s.product || null,
      amountUsd: usd(s.amountUsdCents),
      commissionUsd: usd(s.commissionUsdCents),
      source: s.source,
      paidBy: s.paidBy,
      refunded: Boolean(s.refunded),
    }));
    const byMonth = new Map();
    for (const s of rows) {
      if (s.refunded) continue;
      const month = String(s.created || '').slice(0, 7) || 'unknown';
      const m = byMonth.get(month) || { month, orders: 0, amount: 0, commission: 0, owed: 0, byLs: 0 };
      m.orders += 1;
      m.amount += Number(s.amountUsdCents) || 0;
      m.commission += Number(s.commissionUsdCents) || 0;
      if (s.paidBy === 'subverselab') m.owed += Number(s.commissionUsdCents) || 0;
      else m.byLs += Number(s.commissionUsdCents) || 0;
      byMonth.set(month, m);
    }
    const months = [...byMonth.values()].sort((a, b) => b.month.localeCompare(a.month)).map((m) => ({
      month: m.month, orders: m.orders, amountUsd: usd(m.amount), commissionUsd: usd(m.commission),
      owedBySubverselabUsd: usd(m.owed), paidByLemonSqueezyUsd: usd(m.byLs),
    }));
    return {
      partner: { name: partner.name || partner.id, commissionPct: Number(partner.commissionPct) || 0, discountCode: partner.discountCode || null },
      sales,
      months,
    };
  }

  return { recordOrder, report, partners, clearCache: () => { cache = null; } };
}
