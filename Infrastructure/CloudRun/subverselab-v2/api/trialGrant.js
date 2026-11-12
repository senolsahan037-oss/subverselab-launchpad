// Plug-in trial + browser sign-in (AHENK first). The contract is
// 01_AI_Tools/subverselab-plugin-common/docs/TRIAL_AND_SIGNIN.md ("Signed grants", "Endpoints"); the C++ side
// (Source/Licensing/) is written against the same text, so field order, signature maths and response shapes here
// follow it to the letter.
//
// Plain logic over an injected Firestore-shaped `db`, clock and signing key (like launchLicence.js), so
// scripts/test-trial.js runs it with an in-memory fake and a throwaway key. server.js does HTTP; this file decides.
//
// Firestore (Admin SDK only; firestore.rules gives clients no access):
//   trials/{product}__{machineHash}   {product, machine, name, started}   created once, never deleted by this code
//   device_codes/{device_code}         {status: pending|approved|consumed, user_code, product, machine, name, expires,
//                                       created, platform?, apple?, uid?, approved?, consumed?}
//     platform 'ios': the code came from the iPhone / iPad app (the "not owned" answer then carries no buy link: App Review 3.1.1).
//     apple: an App Store purchase (a verified StoreKit 2 transaction, attached by POST /api/device/apple) that is linked to the
//     approving account before ownership is checked (TRIAL_AND_SIGNIN.md "App Store").
// Ownership is entitlements.js ownedVia (the download rule), injected so the tests can stub it.

import { createHash, createPrivateKey, createPublicKey, privateEncrypt, publicDecrypt, constants, randomBytes } from 'crypto';

// Products with a 30-day trial. Not a store list. The download ticket (server.js, launchId 'trial') reads it: the installer of a
// trial product is a free download for any signed-in account (owner 7 Nov 2026); the plug-in decides trial / owned / free mode.
export const TRIAL_PRODUCTS = ['ahenk'];
// Products that sign in through the browser and get an owned grant (device flow + refresh). JING FANG is owned-only
// (owner 7 Nov 2026: "sadece satın alanlar kullansın"): sign-in yes, trial no.
export const GRANT_PRODUCTS = ['ahenk', 'jingfang'];
// The product page the "not owned" answer points at (no price on the activate page).
export const BUY_URLS = { ahenk: 'https://subverselab.com/plugins/ahenk', jingfang: 'https://subverselab.com/plugins/jingfang' };
export const VERIFY_URL = 'https://subverselab.com/activate';
export const DAY_MS = 24 * 60 * 60 * 1000;
export const TRIAL_MS = 30 * DAY_MS;
export const OWNED_GRACE_MS = 45 * DAY_MS;
export const DEVICE_TTL_S = 600;
export const POLL_INTERVAL_S = 3;
export const NAME_MAX = 64;

const MACHINE_RE = /^svl-machine:([0-9a-f]{32})$/;
// Crockford base32: no I, L, O or U.
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const DEVICE_CODE_RE = /^[0-9a-f]{32,128}$/;

export const machineHash = (machine) => (typeof machine === 'string' ? MACHINE_RE.exec(machine)?.[1] || null : null);
export const cleanName = (name) => String(name ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, NAME_MAX);

/** "ABCD-2345": 8 Crockford characters from 40 random bits. */
export function generateUserCode(bytes = randomBytes(8)) {
  const chars = [...bytes.subarray(0, 8)].map((b) => CROCKFORD[b & 31]).join('');
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}
/** What someone typed or the link carried -> "ABCD-2345", or null. Case, spaces and the dash do not matter; O reads as 0, I/L as 1. */
export function normaliseUserCode(input) {
  if (typeof input !== 'string') return null;
  const s = input.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  if (s.length !== 8 || [...s].some((c) => !CROCKFORD.includes(c))) return null;
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}
export const generateDeviceCode = () => randomBytes(24).toString('hex'); // 48 hex chars, 192 bits

// ---------------------------------------------------------------- grants

/** The payload string, fields in the contract's order, no spaces. */
export function buildPayload({ product, machine, kind, uid = '', issued, starts, ends }) {
  return JSON.stringify({
    v: 1,
    product: String(product),
    machine: String(machine),
    kind: String(kind),
    uid: String(uid ?? ''),
    issued: Math.trunc(Number(issued)),
    starts: Math.trunc(Number(starts)),
    ends: Math.trunc(Number(ends)),
  });
}

/** A PEM string or KeyObject -> {privateKey, publicKey, modulusBytes}. Throws on anything that is not an RSA private key. */
export function loadSigningKey(pem) {
  const privateKey = typeof pem === 'string' ? createPrivateKey(pem) : pem;
  if (privateKey.asymmetricKeyType !== 'rsa') throw new Error('grant signing key is not RSA');
  const publicKey = createPublicKey(privateKey);
  const modulusBytes = Math.ceil(publicKey.asymmetricKeyDetails.modulusLength / 8);
  return { privateKey, publicKey, modulusBytes };
}

/** The plug-in's compiled-in key: "e,n" in lowercase hex (juce::RSAKey's string form). */
export function publicKeyJuce(publicKey) {
  const jwk = publicKey.export({ format: 'jwk' });
  const hex = (b64) => Buffer.from(b64, 'base64url').toString('hex').replace(/^0+/, '') || '0';
  return `${hex(jwk.e)},${hex(jwk.n)}`;
}

const sha256 = (s) => createHash('sha256').update(Buffer.from(s, 'utf8')).digest();

/** Textbook RSA over SHA-256: m^d mod n as lowercase hex without leading zeros. */
export function signPayload(payload, key) {
  const m = Buffer.alloc(key.modulusBytes);
  sha256(payload).copy(m, key.modulusBytes - 32);
  const sig = privateEncrypt({ key: key.privateKey, padding: constants.RSA_NO_PADDING }, m);
  return sig.toString('hex').replace(/^0+/, '') || '0';
}

export const makeGrant = (fields, key) => {
  const payload = buildPayload(fields);
  return { payload, sig: signPayload(payload, key) };
};

/** -> the parsed payload when the signature and the canonical form hold, else null. */
export function verifyGrant(grant, key) {
  let g = grant;
  if (typeof g === 'string') { try { g = JSON.parse(g); } catch { return null; } }
  if (!g || typeof g.payload !== 'string' || typeof g.sig !== 'string') return null;
  if (g.payload.length > 1024 || !/^[0-9a-f]{1,1024}$/.test(g.sig)) return null;
  const sigBytes = Buffer.from(g.sig.length % 2 ? `0${g.sig}` : g.sig, 'hex');
  if (sigBytes.length > key.modulusBytes) return null;
  const padded = Buffer.alloc(key.modulusBytes);
  sigBytes.copy(padded, key.modulusBytes - sigBytes.length);
  let m;
  try { m = publicDecrypt({ key: key.publicKey, padding: constants.RSA_NO_PADDING }, padded); } catch { return null; }
  const want = Buffer.alloc(key.modulusBytes);
  sha256(g.payload).copy(want, key.modulusBytes - 32);
  if (!m.equals(want)) return null;
  let p;
  try { p = JSON.parse(g.payload); } catch { return null; }
  if (!p || buildPayload(p) !== g.payload || p.v !== 1) return null;
  return p;
}

// ---------------------------------------------------------------- service

export class NotConfigured extends Error {}

/**
 * @param getAdmin   () => Promise<{db, ...}>   the Admin SDK handle (passed on to ownedVia / lookupUser)
 * @param getKey     () => loaded signing key or null (null -> NotConfigured, the route answers 503)
 * @param ownedVia   (admin, {email, uid, proven}, slug) => Promise<string|null>  (entitlements.js)
 * @param lookupUser (admin, uid) => Promise<{email, proven}|null>  for grant refresh (no ID token there)
 * @param linkApple  (admin, uid, tx) => Promise<{status}>  links an attached App Store purchase (appstore.js linkApplePurchase);
 *                   optional: without it an attached purchase is ignored
 * @param now        () => ms (server time, the only clock that counts)
 */
export function createTrialService({ getAdmin, getKey, ownedVia, lookupUser, linkApple = null, now = () => Date.now(), newDeviceCode = generateDeviceCode, newUserCode = generateUserCode }) {
  const key = () => { const k = getKey(); if (!k) throw new NotConfigured('GRANT_SIGNING_KEY is not set'); return k; };
  const unknownProduct = { status: 400, body: { ok: false, error: 'unknown product' } };
  const badRequest = { status: 400, body: { ok: false, error: 'bad request' } };
  const expired404 = { status: 404, body: { ok: false, error: 'expired' } };

  function ownedGrant({ product, machine, uid }, k) {
    const issued = now();
    return makeGrant({ product, machine, kind: 'owned', uid, issued, starts: issued, ends: issued + OWNED_GRACE_MS }, k);
  }

  async function trialStart({ product, machine, name }) {
    if (!TRIAL_PRODUCTS.includes(product)) return unknownProduct;
    const hash = machineHash(machine);
    if (!hash) return badRequest;
    const k = key();
    const { db } = await getAdmin();
    const ref = db.collection('trials').doc(`${product}__${hash}`);
    const t = now();
    const started = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const prev = snap.exists ? Number(snap.data().started) : NaN;
      if (Number.isFinite(prev)) return prev;
      tx.set(ref, { product, machine, name: cleanName(name), started: t });
      return t;
    });
    const grant = makeGrant({ product, machine, kind: 'trial', uid: '', issued: t, starts: started, ends: started + TRIAL_MS }, k);
    return { status: 200, body: { ok: true, now: t, grant } };
  }

  async function deviceStart({ product, machine, name, platform }) {
    if (!GRANT_PRODUCTS.includes(product)) return unknownProduct;
    if (!machineHash(machine)) return badRequest;
    key(); // a code that can never be turned into a grant is no use: refuse before writing anything
    const { db } = await getAdmin();
    const t = now();
    let userCode = null;
    for (let i = 0; i < 5 && !userCode; i += 1) {
      const candidate = newUserCode();
      const live = (await db.collection('device_codes').where('user_code', '==', candidate).get()).docs
        .some((d) => Number(d.data().expires) > t && d.data().status !== 'consumed');
      if (!live) userCode = candidate;
    }
    if (!userCode) throw new Error('could not mint a unique user code');
    const deviceCode = newDeviceCode();
    await db.collection('device_codes').doc(deviceCode).set({
      status: 'pending', user_code: userCode, product, machine, name: cleanName(name), expires: t + DEVICE_TTL_S * 1000, created: t,
      ...(platform === 'ios' ? { platform: 'ios' } : {}),
    });
    return {
      status: 200,
      body: { ok: true, device_code: deviceCode, user_code: userCode, verify_url: `${VERIFY_URL}?code=${userCode}`, interval: POLL_INTERVAL_S, expires_in: DEVICE_TTL_S },
    };
  }

  // The live (unexpired, not consumed) device code with this user code, or null.
  async function findLive(db, userCode, t) {
    const snap = await db.collection('device_codes').where('user_code', '==', userCode).get();
    return snap.docs.find((d) => Number(d.data().expires) > t && ['pending', 'approved'].includes(d.data().status)) || null;
  }

  /** Site page only (not part of the plug-in contract): what the code is for, so the page can show product + computer. */
  async function deviceLookup({ user_code }) {
    const code = normaliseUserCode(user_code);
    if (!code) return expired404;
    const { db } = await getAdmin();
    const doc = await findLive(db, code, now());
    if (!doc) return expired404;
    const d = doc.data();
    return { status: 200, body: { ok: true, product: d.product, name: d.name || '', user_code: code, approved: d.status === 'approved', ...(d.platform === 'ios' ? { device: 'ios' } : {}) } };
  }

  async function deviceApprove({ user_code, caller }) {
    const code = normaliseUserCode(user_code);
    if (!code) return expired404;
    const admin = await getAdmin();
    const { db } = admin;
    const found = await findLive(db, code, now());
    if (!found) return expired404;
    const d = found.data();
    if (d.status === 'approved') {
      return d.uid === caller.uid ? { status: 200, body: { ok: true, product: d.product, name: d.name || '' } } : expired404;
    }
    if (d.apple && linkApple) {
      // The App Store purchase that came with this code becomes this account's (one purchase, one account: 409 = another one has it).
      const linked = await linkApple(admin, caller.uid, d.apple);
      if (linked?.status === 409) return { status: 200, body: { ok: false, error: 'linked elsewhere' } };
    }
    const via = await ownedVia(admin, { email: caller.email, uid: caller.uid, proven: caller.proven }, d.product);
    if (!via) {
      return { status: 200, body: { ok: false, error: 'not owned', ...(d.platform === 'ios' ? {} : { buy_url: BUY_URLS[d.product] || 'https://subverselab.com/plugins' }) } };
    }
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(found.ref);
      const cur = snap.exists ? snap.data() : null;
      const t = now();
      if (!cur || Number(cur.expires) <= t || !['pending', 'approved'].includes(cur.status)) return expired404;
      if (cur.status === 'approved' && cur.uid !== caller.uid) return expired404;
      if (cur.status === 'pending') tx.update(found.ref, { status: 'approved', uid: caller.uid, approved: t });
      return { status: 200, body: { ok: true, product: cur.product, name: cur.name || '' } };
    });
  }

  /** POST /api/device/apple: attach a verified App Store transaction (server.js checks the JWS and the product) to a pending code. */
  async function deviceAttachApple({ device_code, tx }) {
    if (typeof device_code !== 'string' || !DEVICE_CODE_RE.test(device_code) || !tx) return expired404;
    const { db } = await getAdmin();
    const ref = db.collection('device_codes').doc(device_code);
    return db.runTransaction(async (t) => {
      const snap = await t.get(ref);
      const d = snap.exists ? snap.data() : null;
      if (!d || d.status !== 'pending' || Number(d.expires) <= now()) return expired404;
      if (tx.product !== d.product) return { status: 400, body: { ok: false, error: 'other product' } };
      t.update(ref, { apple: tx });
      return { status: 200, body: { ok: true } };
    });
  }

  async function devicePoll({ device_code }) {
    const expired = { status: 200, body: { status: 'expired' } };
    if (typeof device_code !== 'string' || !DEVICE_CODE_RE.test(device_code)) return expired;
    const k = key();
    const { db } = await getAdmin();
    const ref = db.collection('device_codes').doc(device_code);
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return expired;
      const d = snap.data();
      const t = now();
      if (d.status === 'consumed' || Number(d.expires) <= t) return expired;
      if (d.status === 'pending') return { status: 200, body: { status: 'pending' } };
      if (d.status !== 'approved' || !d.uid) return expired;
      tx.update(ref, { status: 'consumed', consumed: t });
      return { status: 200, body: { status: 'approved', grant: ownedGrant(d, k) } };
    });
  }

  async function grantRefresh({ grant }) {
    const k = key();
    const p = verifyGrant(grant, k);
    if (!p || p.kind !== 'owned' || !p.uid || !machineHash(p.machine)) return { status: 400, body: { ok: false, error: 'bad grant' } };
    if (!GRANT_PRODUCTS.includes(p.product)) return unknownProduct;
    const admin = await getAdmin();
    const user = await lookupUser(admin, p.uid);
    const via = user ? await ownedVia(admin, { email: user.email, uid: p.uid, proven: user.proven }, p.product) : null;
    if (!via) return { status: 200, body: { ok: false, error: 'not owned' } };
    return { status: 200, body: { ok: true, grant: ownedGrant(p, k) } };
  }

  return { trialStart, deviceStart, deviceLookup, deviceApprove, deviceAttachApple, devicePoll, grantRefresh };
}
