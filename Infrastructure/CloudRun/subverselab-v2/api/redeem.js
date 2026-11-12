// Store codes: "Redeem a code" on subverselab.com (owner 7 Nov 2026). Stores that resell our products (Loot Audio, Audio Plugin
// Deals, ...) hand each buyer a single-use code; the buyer signs in on our site, types the code on /redeem (or in the /account
// block) and the product is added to the account, like Arturia's "Register a product" or Native Instruments' "Add a serial".
// Downloads and the plug-in's browser sign-in (JING FANG, AHENK) then work from that account. A code is a voucher typed on the
// website once, not a licence key in a product (root CLAUDE.md "no manual licence keys" is about the products).
//
// The code list is baked into the API image: api/redeemCodes.json, written by scripts/build-redeem-codes.js from the stores' CSV
// files. The repository is public, so the file holds no plain code and no plain hash either: every key is
//   HMAC-SHA256(REDEEM_CODE_PEPPER, normalised code)   (hex)
// with a secret pepper that lives only in Secret Manager (env REDEEM_CODE_PEPPER on subverselab-api) and on the owner's Mac
// (~/.config/subverselab/redeem_code_pepper, 600). A short code under a plain SHA-256 could be found by brute force from a
// public file; under the pepper it cannot. The file also carries pepperCheck = HMAC(pepper, PEPPER_CHECK_LABEL): a server
// whose pepper does not match the file refuses every code with 503 (fail closed), never "not valid".
//
// Plain logic over a Firestore-shaped `db`; server.js does the HTTP, the token check and the rate limits.
//   redemptions/{codeHash}       {product, store, batch, uses, maxUses, by: {uid: {at, email}}, updatedAt}
//   redeemed_by_uid/{uid}        {items: {codeHash: {product, at}}}
// Both written by this file only (Admin SDK); firestore.rules closes them to every client. Single use is enforced in one
// transaction (uses < maxUses); the same uid redeeming the same code again is an idempotent 200, not a second use.
// Account deletion (accountDeletion.js) deletes redeemed_by_uid/{uid} and takes the uid (and its e-mail) out of `by`; the code
// stays used.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const REDEMPTIONS = 'redemptions';
export const REDEEMED_BY_UID = 'redeemed_by_uid';
export const PEPPER_CHECK_LABEL = 'subverselab-redeem-pepper-check-v1';
// What a code may open. `family` = what a paid Lemon Squeezy family order opens (server.js launch2Access answers 'paid', so
// every family plug-in and the launch-1 rooms open exactly as for a paid family seat); the others are site slugs that count
// like a paid order of that product (entitlements.js readUidOwnership / ownedVia).
export const REDEEM_PRODUCTS = Object.freeze({
  jingfang: 'JING FANG',
  elek: 'ELEK',
  family: 'the Plugin Family',
  // Free plug-ins (owner 12 Nov 2026: Loot Audio gives them away as a gift with purchase and hands each buyer a code). No licence
  // key in these plug-ins, so a code adds them to the account directly, like JING FANG.
  taban: 'TABAN',
  alev: 'ALEV',
  kiyma: 'KIYMA',
});

// Trim, upper-case, drop inner spaces and dashes (a code read aloud or copied from a mail with a line break still matches).
export function normaliseCode(value) {
  return String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '');
}
// A well-formed code: letters and digits only, 6..32 of them. Anything else is answered "not valid" without a lookup.
export const codeShapeOk = (code) => /^[A-Z0-9]{6,32}$/.test(code);
export const codeHash = (code, pepper) => createHmac('sha256', String(pepper)).update(normaliseCode(code)).digest('hex');
export const pepperCheck = (pepper) => createHmac('sha256', String(pepper)).update(PEPPER_CHECK_LABEL).digest('hex');

// The code table: {pepperCheck, codes: {hash: {product, store, batch, validFrom?, validTo?, maxUses}}}. A file that cannot be
// read or parsed loads as an empty table (every code then reads "not valid"; the log says why).
export function loadRedeemCodes(path = new URL('./redeemCodes.json', import.meta.url)) {
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'));
    return { pepperCheck: String(data?.pepperCheck || ''), codes: data?.codes && typeof data.codes === 'object' ? data.codes : {} };
  } catch (err) {
    console.error('redeem: redeemCodes.json not readable; every code is refused:', err.message);
    return { pepperCheck: '', codes: {} };
  }
}
// True when this pepper is the one the table was built with.
export function pepperMatches(table, pepper) {
  if (!pepper || !table?.pepperCheck) return false;
  const a = Buffer.from(pepperCheck(pepper));
  const b = Buffer.from(String(table.pepperCheck));
  return a.length === b.length && timingSafeEqual(a, b);
}

// 'D Month YYYY' in Istanbul time (the stores' windows are written in Istanbul days).
const dayLabel = (ms) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' });
// null when the code may be used at `nowMs`; otherwise the 403 message naming the date. validTo is the first moment it no
// longer works (exclusive), so the last valid day is the day before it.
export function windowProblem(entry, nowMs) {
  const from = Date.parse(entry?.validFrom || '');
  const to = Date.parse(entry?.validTo || '');
  if (!Number.isNaN(from) && nowMs < from) return `That code can be used from ${dayLabel(from)}.`;
  if (!Number.isNaN(to) && nowMs >= to) return `That code expired on ${dayLabel(to - 1)}.`;
  return null;
}

// Products whose plug-ins unlock with a Lemon Squeezy licence key (plugin-common/Licensing/License.h: ELEK and the family) until
// they sign in with the account like JING FANG 1.4.0 and AHENK. Their codes are NOT consumed here: /redeem sends the buyer to that
// product's $0 checkout with the code already applied (one confirmation, no payment), Lemon Squeezy keeps the code single-use and
// issues the key, and the order opens the downloads as today (lead, 7 Nov 2026: one entry point for every store code).
export const CHECKOUT_PRODUCTS = Object.freeze({
  elek: 'https://subverselab.lemonsqueezy.com/checkout/buy/2ac19e8b-4a26-4b68-bdb1-55390e4957de',
  family: 'https://subverselab.lemonsqueezy.com/checkout/buy/7eb4adc0-a939-435f-9c9e-1b6df5e6c17c',
});
export const checkoutFor = (product, code) => `${CHECKOUT_PRODUCTS[product]}?checkout%5Bdiscount_code%5D=${encodeURIComponent(code)}`;

export const NOT_VALID = 'That code is not valid.';
export const USED = 'That code has already been used.';

/**
 * POST /api/redeem after the token check. Returns {status, body}.
 *   200 {ok, product, name, already?}   400 not valid   403 outside its dates   409 used up   503 pepper missing / wrong
 */
export async function redeemCode(db, { uid, email, code, table, pepper, now = () => new Date().toISOString() }) {
  const clean = normaliseCode(code);
  if (!codeShapeOk(clean)) return { status: 400, body: { error: NOT_VALID } };
  if (!pepperMatches(table, pepper)) return { status: 503, body: { error: 'Redeeming is not available right now. Try again later.' } };
  const hash = codeHash(clean, pepper);
  const entry = Object.prototype.hasOwnProperty.call(table.codes, hash) ? table.codes[hash] : null;
  if (!entry || !(entry.product in REDEEM_PRODUCTS)) return { status: 400, body: { error: NOT_VALID } };
  const maxUses = Math.max(1, Number(entry.maxUses) || 1);
  const name = REDEEM_PRODUCTS[entry.product];
  if (entry.product in CHECKOUT_PRODUCTS) {
    const problem = windowProblem(entry, Date.parse(now()));
    if (problem) return { status: 403, body: { error: problem } };
    return { status: 200, body: { ok: true, product: entry.product, name, checkout: checkoutFor(entry.product, clean) } };
  }
  const ref = db.collection(REDEMPTIONS).doc(hash);
  const indexRef = db.collection(REDEEMED_BY_UID).doc(uid);
  return db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    const old = snap.exists ? snap.data() || {} : {};
    const by = old.by && typeof old.by === 'object' ? old.by : {};
    if (by[uid]) {
      // Already this account's: answer as before and make sure the index still says so.
      t.set(indexRef, { items: { [hash]: { product: entry.product, at: by[uid].at || now() } } }, { merge: true });
      return { status: 200, body: { ok: true, product: entry.product, name, already: true } };
    }
    const problem = windowProblem(entry, Date.parse(now()));
    if (problem) return { status: 403, body: { error: problem } };
    const uses = Number(old.uses) || 0;
    if (uses >= maxUses) return { status: 409, body: { error: USED } };
    const at = now();
    t.set(ref, {
      product: entry.product, store: entry.store || null, batch: entry.batch || null, maxUses,
      uses: uses + 1,
      by: { [uid]: { at, email: String(email || '').trim().toLowerCase() || null } },
      updatedAt: at,
    }, { merge: true });
    t.set(indexRef, { items: { [hash]: { product: entry.product, at } } }, { merge: true });
    return { status: 200, body: { ok: true, product: entry.product, name } };
  });
}

// The codes redeemed by this uid, in the shape of orders_by_uid entries (entitlements.js merges them), keyed 'code:<hash>'.
// A `family` entry has product 'family': ownedFromOrders ignores it (as it ignores a Lemon Squeezy family order) and
// server.js launch2Access reads it through redeemedFamilyAt. An entry whose redemption no longer names this uid does not count.
export async function readCodeOrders(db, uid) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(String(uid || ''))) return {};
  const index = await db.collection(REDEEMED_BY_UID).doc(uid).get();
  if (!index.exists) return {};
  const items = Object.entries(index.data()?.items || {}).filter(([h]) => /^[0-9a-f]{64}$/.test(h)).slice(0, 50);
  const snaps = await Promise.all(items.map(([h]) => db.collection(REDEMPTIONS).doc(h).get()));
  const out = {};
  snaps.forEach((snap, i) => {
    const r = snap.exists ? snap.data() : null;
    const [h, item] = items[i];
    if (!r?.by?.[uid] || !(r.product in REDEEM_PRODUCTS)) return;
    out[`code:${h}`] = { product: r.product, status: 'paid', refunded: false, created: r.by[uid].at || item?.at || null, source: 'code' };
  });
  return out;
}

// The date (ISO) this uid redeemed a family code, or null.
export async function redeemedFamilyAt(db, uid) {
  const family = Object.values(await readCodeOrders(db, uid)).filter((o) => o.product === 'family');
  if (!family.length) return null;
  return family.map((o) => o.created).filter(Boolean).sort()[0] || new Date(0).toISOString();
}
