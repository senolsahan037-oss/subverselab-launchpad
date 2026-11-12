// iPhone / iPad apps: App Store purchases as site entitlements (contracts:
// 01_AI_Tools/subverselab-ru8/docs/api_runs/contract_ru8_ios_unlock.md, 01_AI_Tools/subverselab-plugin-common/docs/TRIAL_AND_SIGNIN.md
// "App Store"). One purchase = the product on Mac, Windows and iOS. APPLE_APPS below lists each app (bundle id, the one
// non-consumable that is ownership, the site slug it opens): RU-8 (`ru8`) and AHENK (`ahenk`, 7 Nov 2026).
//
// Plain logic over a Firestore-shaped `db`; server.js does the HTTP, the token checks and the rate limits.
//   apple_purchases/{originalTransactionId}  {uid|null, productId, bundleId, environment, purchaseDate, transactionId,
//                                             revoked, revokedAt, revocationReason, stateAt, linkedAt, updatedAt}
//   apple_by_uid/{uid}                       {transactions: {originalTransactionId: {linkedAt}}}
// Both are written by this file only (server-side, Admin SDK; firestore.rules closes them to every client).
// One originalTransactionId belongs to the first uid that links it; a second uid gets 409. An account deletion sets the
// purchase's uid to null and deletes apple_by_uid/{uid} (accountDeletion.js), so the buyer can link it again after signing up.
//
// Signatures: StoreKit 2 transactions and App Store Server Notifications V2 are JWS (ES256) whose x5c header carries
// leaf -> Apple WWDR intermediate -> Apple Root CA - G3. Verified with node:crypto only (no JWT library):
//   alg ES256 only; exactly three certificates; the third byte-equal to the PINNED root below; each certificate issued and
//   signed by the next; every certificate valid now; intermediate is a CA carrying OID 1.2.840.113635.100.6.2.1; leaf is
//   not a CA, carries OID 1.2.840.113635.100.6.11.1 and holds a P-256 key; the JWS signature verifies under the leaf key.
// Not done: OCSP / CRL checks of the leaf (Apple's own library makes them optional). A revoked purchase is told apart by
// the transaction's revocationDate and by the REFUND / REVOKE notifications.

import { X509Certificate, createHash, verify as cryptoVerify } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const APPLE_PURCHASES = 'apple_purchases';
export const APPLE_BY_UID = 'apple_by_uid';
// One row per iOS app. `productId` is the non-consumable that means "owns the product"; any other in-app item of the app
// (AHENK's free 30-day trial item com.subverselab.ahenk.trial30) is not ownership: it is refused by the link route and
// ignored by notifications. `slug` is the site product it opens (downloads, desktop sign-in) like a paid Lemon Squeezy order.
export const APPLE_APPS = Object.freeze([
  Object.freeze({ slug: 'ru8', name: 'RU-8', bundleId: 'com.subverselab.ru8.app', productId: 'com.subverselab.ru8.app.full' }),
  Object.freeze({ slug: 'ahenk', name: 'AHENK', bundleId: 'com.subverselab.ahenk', productId: 'com.subverselab.ahenk.full' }),
]);
export const appleAppBySlug = (slug) => APPLE_APPS.find((a) => a.slug === slug) || null;
const appByBundle = (bundleId) => APPLE_APPS.find((a) => a.bundleId === bundleId) || null;
const appByProduct = (productId) => APPLE_APPS.find((a) => a.productId === productId) || null;
// RU-8's names, kept for the callers and tests written before the table.
export const APPLE_BUNDLE_ID = APPLE_APPS[0].bundleId;
export const APPLE_PRODUCT_ID = APPLE_APPS[0].productId;
export const APPLE_SLUG = APPLE_APPS[0].slug;

const LEAF_OID = '1.2.840.113635.100.6.11.1';         // Apple Mac App Store and iTunes Store receipt signing
const INTERMEDIATE_OID = '1.2.840.113635.100.6.2.1';  // Apple Worldwide Developer Relations intermediate
const MAX_JWS = 64 * 1024;

// Apple Root CA - G3, downloaded 2026-10-17 from https://www.apple.com/certificateauthority/AppleRootCA-G3.cer
// (583 bytes, valid 2014-04-30 .. 2039-04-30). SHA-256 of the DER file:
//   63 34 3A BF B8 9A 6A 03 EB B5 7E 9B 3F 5F A7 BE 7C 4F 5C 75 6F 30 17 B3 A8 C4 88 C3 65 3E 91 79
// = the fingerprint Apple publishes for "Apple Root CA - G3" in its root certificate list
//   (https://support.apple.com/en-am/121672, checked 2026-10-17). The file is checked against it on every start;
// a missing or different file leaves no trusted root, so every App Store signature is refused (fail closed).
export const APPLE_ROOT_G3_SHA256 = '63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179';
let pinnedRoot = null;
try {
  const der = readFileSync(new URL('./AppleRootCA-G3.cer', import.meta.url));
  if (createHash('sha256').update(der).digest('hex') === APPLE_ROOT_G3_SHA256) pinnedRoot = der;
  else console.error('appstore: AppleRootCA-G3.cer does not match the pinned fingerprint; App Store signatures are refused');
} catch (err) {
  console.error('appstore: AppleRootCA-G3.cer not readable; App Store signatures are refused:', err.message);
}
export const pinnedRootLoaded = () => Boolean(pinnedRoot);

// Tests only (scripts/test-appstore.js): trust a test root instead of Apple's. Refused unless the process was started with
// APPLE_TEST_ROOTS=1, which no deploy sets. Pass null to go back to the pinned root.
let testRoots = null;
export function setAppleTestRoots(roots) {
  if (process.env.APPLE_TEST_ROOTS !== '1') throw new Error('test roots are refused outside the tests');
  testRoots = roots ? roots.map((r) => Buffer.from(r)) : null;
}
const trustedRoots = () => testRoots || (pinnedRoot ? [pinnedRoot] : []);

export const sandboxAllowed = () => process.env.APPLE_ALLOW_SANDBOX === '1';

export class AppleJwsError extends Error {
  constructor(reason) { super(reason); this.reason = reason; }
}
const fail = (reason) => { throw new AppleJwsError(reason); };

// ---- Minimal DER reading: just enough to list a certificate's extension OIDs. -------------------------------------
function tlv(buf, at) {
  if (at + 2 > buf.length) fail('bad-certificate');
  const tag = buf[at];
  let len = buf[at + 1];
  let start = at + 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    if (!n || n > 4 || start + n > buf.length) fail('bad-certificate');
    len = 0;
    for (let i = 0; i < n; i += 1) len = len * 256 + buf[start + i];
    start += n;
  }
  if (start + len > buf.length) fail('bad-certificate');
  return { tag, start, end: start + len };
}
function children(buf, { start, end }) {
  const out = [];
  for (let at = start; at < end;) { const t = tlv(buf, at); out.push(t); at = t.end; }
  return out;
}
function oidString(buf, { start, end }) {
  const parts = [];
  let v = 0;
  for (let i = start; i < end; i += 1) {
    v = v * 128 + (buf[i] & 0x7f);
    if (!(buf[i] & 0x80)) { parts.push(v); v = 0; }
  }
  if (!parts.length) return '';
  const first = parts[0] < 80 ? [Math.floor(parts[0] / 40), parts[0] % 40] : [2, parts[0] - 80];
  return [...first, ...parts.slice(1)].join('.');
}
export function extensionOids(der) {
  const cert = tlv(der, 0);
  const tbs = children(der, cert)[0];
  const ext = children(der, tbs).find((c) => c.tag === 0xa3);
  if (!ext) return [];
  const list = children(der, ext)[0];
  return children(der, list).map((e) => children(der, e)[0]).filter((o) => o?.tag === 0x06).map((o) => oidString(der, o));
}

const B64URL = /^[A-Za-z0-9_-]+$/;
const json = (part) => { try { return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')); } catch { return fail('bad-jws'); } };
const validAt = (cert, now) => Date.parse(cert.validFrom) <= now && now <= Date.parse(cert.validTo);

/**
 * Verifies an Apple-signed JWS and returns its payload; throws AppleJwsError(reason) otherwise.
 * `now` (ms) is the moment every certificate must be valid at.
 */
export function verifyAppleJws(jws, { now = Date.now() } = {}) {
  if (typeof jws !== 'string' || !jws || jws.length > MAX_JWS) fail('bad-jws');
  const parts = jws.split('.');
  if (parts.length !== 3 || !parts.every((p) => B64URL.test(p))) fail('bad-jws');
  const header = json(parts[0]);
  if (header?.alg !== 'ES256') fail('bad-alg');
  const x5c = header.x5c;
  if (!Array.isArray(x5c) || x5c.length !== 3 || !x5c.every((c) => typeof c === 'string' && c.length < 8192)) fail('bad-chain');
  const ders = x5c.map((c) => Buffer.from(c, 'base64'));
  let certs;
  try { certs = ders.map((d) => new X509Certificate(d)); } catch { return fail('bad-chain'); }
  const [leaf, intermediate, root] = certs;
  const roots = trustedRoots();
  if (!roots.some((r) => r.equals(ders[2]))) fail('untrusted-root');
  if (!root.checkIssued(root) || !root.verify(root.publicKey)) fail('bad-chain');
  if (!intermediate.checkIssued(root) || !intermediate.verify(root.publicKey)) fail('bad-chain');
  if (!leaf.checkIssued(intermediate) || !leaf.verify(intermediate.publicKey)) fail('bad-chain');
  if (!intermediate.ca || leaf.ca) fail('bad-chain');
  if (!certs.every((c) => validAt(c, now))) fail('expired-certificate');
  if (!extensionOids(ders[1]).includes(INTERMEDIATE_OID)) fail('bad-intermediate-oid');
  if (!extensionOids(ders[0]).includes(LEAF_OID)) fail('bad-leaf-oid');
  const key = leaf.publicKey;
  if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') fail('bad-leaf-key');
  const signature = Buffer.from(parts[2], 'base64url');
  if (signature.length !== 64) fail('bad-signature');
  const ok = cryptoVerify('sha256', Buffer.from(`${parts[0]}.${parts[1]}`), { key, dsaEncoding: 'ieee-p1363' }, signature);
  if (!ok) fail('bad-signature');
  const payload = json(parts[1]);
  if (!payload || typeof payload !== 'object') fail('bad-jws');
  return payload;
}

// ---- Transactions ------------------------------------------------------------------------------------------------
const OTID = /^[0-9]{1,32}$/;
const isoMs = (ms) => (Number.isFinite(Number(ms)) && Number(ms) > 0 ? new Date(Number(ms)).toISOString() : null);

// null when the decoded transaction is a live purchase of `slug` (default RU-8) this server may accept; otherwise {status, error}.
export function transactionProblem(tx, { allowSandbox = sandboxAllowed(), slug = APPLE_SLUG } = {}) {
  const app = appleAppBySlug(slug);
  if (!app) return { status: 400, error: 'Unknown product.' };
  if (tx?.bundleId !== app.bundleId) return { status: 400, error: `This purchase is not for ${app.name}.` };
  if (tx?.productId !== app.productId) return { status: 400, error: `This purchase is not ${app.name}.` };
  if (!OTID.test(String(tx?.originalTransactionId ?? ''))) return { status: 400, error: 'This purchase has no transaction id.' };
  if (tx.environment !== 'Production' && !(tx.environment === 'Sandbox' && allowSandbox)) return { status: 400, error: 'Test purchases are not accepted.' };
  if (tx.revocationDate) return { status: 403, error: 'Apple refunded this purchase.' };
  return null;
}

// POST /api/<slug>/ios/apple-purchase after the signature check and transactionProblem. Returns {status, body}.
export async function linkApplePurchase(db, { uid, tx, now = () => new Date().toISOString() }) {
  const otid = String(tx.originalTransactionId);
  const purchaseRef = db.collection(APPLE_PURCHASES).doc(otid);
  const byUidRef = db.collection(APPLE_BY_UID).doc(uid);
  return db.runTransaction(async (t) => {
    const snap = await t.get(purchaseRef);
    const old = snap.exists ? snap.data() || {} : null;
    if (old?.uid && old.uid !== uid) return { status: 409, body: { error: 'This App Store purchase is already linked to another SubverseLab account.' } };
    if (old?.revoked) return { status: 403, body: { error: 'Apple refunded this purchase.' } };
    const at = now();
    const linkedAt = old?.uid === uid && old.linkedAt ? old.linkedAt : at;
    t.set(purchaseRef, {
      uid,
      productId: tx.productId,
      bundleId: tx.bundleId,
      environment: tx.environment,
      purchaseDate: isoMs(tx.originalPurchaseDate) || isoMs(tx.purchaseDate),
      transactionId: tx.transactionId != null ? String(tx.transactionId) : null,
      revoked: false,
      linkedAt,
      updatedAt: at,
    }, { merge: true });
    t.set(byUidRef, { transactions: { [otid]: { linkedAt } } }, { merge: true });
    return { status: 200, body: { owned: true, via: 'appstore' } };
  });
}

// ---- Notifications (App Store Server Notifications V2) -----------------------------------------------------------
const REVOKING = new Set(['REFUND', 'REVOKE']);
const RESTORING = new Set(['REFUND_REVERSED']);

/**
 * `payload` is the verified signedPayload. Returns {result} ('revoked' | 'restored' | 'ignored:<why>' | 'stale');
 * throws AppleJwsError when the transaction inside does not verify (the route answers 400).
 */
export async function handleAppleNotification(db, payload, { now = () => new Date().toISOString(), verifyNow = Date.now(), allowSandbox = sandboxAllowed() } = {}) {
  const type = String(payload?.notificationType || '');
  const data = payload?.data || {};
  if (!REVOKING.has(type) && !RESTORING.has(type)) return { result: `ignored:${type || 'no-type'}` };
  const app = appByBundle(data.bundleId);
  if (!app) return { result: 'ignored:other-app' };
  if (data.environment !== 'Production' && !(data.environment === 'Sandbox' && allowSandbox)) return { result: 'ignored:environment' };
  const tx = verifyAppleJws(data.signedTransactionInfo, { now: verifyNow });
  if (tx.bundleId !== app.bundleId || tx.productId !== app.productId || !OTID.test(String(tx.originalTransactionId ?? ''))) return { result: 'ignored:other-product' };
  const otid = String(tx.originalTransactionId);
  const signedAt = Number(payload.signedDate) || 0;
  const ref = db.collection(APPLE_PURCHASES).doc(otid);
  return db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    const old = snap.exists ? snap.data() || {} : null;
    // Apple may deliver a retried, older notification after a newer one: the newest signedDate decides.
    if (old && Number(old.stateAt) > signedAt) return { result: 'stale' };
    const revoked = REVOKING.has(type);
    t.set(ref, {
      ...(old ? {} : { uid: null, productId: tx.productId, bundleId: tx.bundleId, environment: tx.environment, purchaseDate: isoMs(tx.originalPurchaseDate) || isoMs(tx.purchaseDate) }),
      revoked,
      revokedAt: revoked ? isoMs(tx.revocationDate) || now() : null,
      revocationReason: revoked && tx.revocationReason != null ? Number(tx.revocationReason) : null,
      stateAt: signedAt,
      lastNotification: { type, uuid: String(payload.notificationUUID || '').slice(0, 64) || null, at: now() },
      updatedAt: now(),
    }, { merge: true });
    return { result: revoked ? 'revoked' : 'restored' };
  });
}

// ---- Ownership ---------------------------------------------------------------------------------------------------
// The App Store purchases linked to this uid, in the shape of orders_by_uid entries (entitlements.js merges them), keyed
// 'apple:<originalTransactionId>', each with the slug of its app (APPLE_APPS). A refunded one reads as refunded; a Sandbox one counts only while APPLE_ALLOW_SANDBOX=1.
export async function readAppleOrders(db, uid, { allowSandbox = sandboxAllowed() } = {}) {
  const index = await db.collection(APPLE_BY_UID).doc(uid).get();
  if (!index.exists) return {};
  const ids = Object.keys(index.data()?.transactions || {}).filter((id) => OTID.test(id)).slice(0, 20);
  const snaps = await Promise.all(ids.map((id) => db.collection(APPLE_PURCHASES).doc(id).get()));
  const out = {};
  snaps.forEach((snap, i) => {
    const p = snap.exists ? snap.data() : null;
    const app = p ? appByProduct(p.productId) : null;
    if (!app || p.uid !== uid || (p.bundleId && p.bundleId !== app.bundleId)) return;
    if (p.environment !== 'Production' && !(p.environment === 'Sandbox' && allowSandbox)) return;
    out[`apple:${ids[i]}`] = { product: app.slug, status: p.revoked ? 'refunded' : 'paid', refunded: Boolean(p.revoked), created: p.purchaseDate || null, source: 'appstore' };
  });
  return out;
}
