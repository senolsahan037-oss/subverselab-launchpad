// SubverseLab's own launch licences: the first 1,000 free keys, handed out
// from /launch and activated by the plugins without Lemon Squeezy.
//
// Everything here is plain logic over a Firestore-shaped `db` (the Admin SDK's,
// or the in-memory fake in scripts/test-launch-licence.js), so the rules — one
// key per account and per e-mail, 1,000 in total, three computers per key —
// can be tested without Google credentials. server.js does HTTP; this file
// decides.
//
// The licence endpoints answer in Lemon Squeezy's License API shapes
// (https://docs.lemonsqueezy.com/api/license-api), because the plugins share
// one parser for both (01_AI_Tools/subverselab-plugin-common/Licensing/License.h).
// The contract is written down in
// 01_AI_Tools/subverselab-plugin-common/docs/LAUNCH_LICENCE_API.md.
//
// Firestore layout (no client access at all — see firestore.rules):
//   launch/counter              {claimed}
//   launch_keys/{key}           {email, uid, product, product_id, status,
//                                activation_limit, instances:{id:{name,created}}, created}
//   launch_claims/uid:{uid}     {key, email}   one per Firebase account
//   launch_claims/email:{email} {key, uid}     one per e-mail address
//   plugin_licenses/{email}     .licenses[key] — the same document the Lemon
//                                Squeezy webhook writes, so /account shows it.

import { randomBytes, randomUUID } from 'crypto';

export const LAUNCH_TOTAL = 1000;
export const STORE_ID = 1;
export const PRODUCT_IDS = { kubbe: 9001, kaset: 9002, bundle: 9003 };
export const BUNDLE_NAME = 'SubverseLab Launch Bundle';
export const ACTIVATION_LIMIT = 3;
export const SOLD_OUT = 'All 1,000 launch licences are taken';

// Crockford base32: no I, L, O or U, so a key read aloud or typed from a
// screenshot has no 1/I/L or 0/O confusion.
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** "SVL-" + four groups of four, e.g. SVL-7K2M-9QXD-4RTA-HB3N (80 random bits). */
export function generateKey(bytes = randomBytes(16)) {
  // 256 is a multiple of 32, so the low five bits of a byte are uniform.
  const chars = [...bytes.subarray(0, 16)].map((b) => CROCKFORD[b & 31]).join('');
  return `SVL-${chars.match(/.{4}/g).join('-')}`;
}

/**
 * The canonical form of whatever someone pasted, or null if it cannot be one
 * of our keys. Case and spaces never matter; dashes are optional; and, as
 * Crockford intends, O reads as 0 and I or L as 1 — after the SVL prefix,
 * which itself has an L.
 */
export function normaliseKey(input) {
  if (typeof input !== 'string') return null;
  const s = input.toUpperCase().replace(/\s+/g, '');
  const m = s.match(/^SVL-?(.*)$/);
  if (!m) return null;
  const body = m[1].replace(/-/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  if (body.length !== 16 || [...body].some((c) => !CROCKFORD.includes(c))) return null;
  return `SVL-${body.match(/.{4}/g).join('-')}`;
}

export const keyShort = (key) => key.slice(-4);

// ---------------------------------------------------------------- responses
// Lemon Squeezy's field names. Customer e-mail and name, which Lemon Squeezy
// puts in meta, are left out: whoever holds a key would otherwise read its
// owner's address.

function licenceKeyView(key, doc) {
  return {
    id: key,
    status: doc.status,
    key,
    key_short: keyShort(key),
    activation_limit: doc.activation_limit,
    activation_usage: Object.keys(doc.instances || {}).length,
    created_at: doc.created || null,
    expires_at: null,
  };
}

const instanceView = (id, inst) => ({ id, name: inst.name, created_at: inst.created || null });

const metaFull = () => ({ store_id: STORE_ID, product_id: PRODUCT_IDS.bundle, product_name: BUNDLE_NAME });

// A disabled or expired key is not "found but unusable" for validation: the
// plugin must hear a clear no and drop its activation.
function unusableReason(doc) {
  if (doc.status === 'disabled') return 'This license key is disabled.';
  if (doc.status === 'expired') return 'This license key has expired.';
  if (doc.status !== 'active') return 'This license key is not active.';
  return null;
}

// HTTP status codes follow Lemon Squeezy's: 404 for an unknown key, 400 for
// any other refusal. The body is what the plugin reads.

// ---------------------------------------------------------------- service

/**
 * @param {() => Promise<{db, FieldValue}>} getAdmin  lazy Firestore handle
 * @param {() => string} now                          ISO timestamp source (tests pin it)
 */
export function createLaunchService({ getAdmin, now = () => new Date().toISOString(), newKey = generateKey, newId = randomUUID }) {
  async function readCounter() {
    const { db } = await getAdmin();
    const snap = await db.collection('launch').doc('counter').get();
    const claimed = snap.exists ? Number(snap.data().claimed) || 0 : 0;
    return { total: LAUNCH_TOTAL, claimed: Math.min(claimed, LAUNCH_TOTAL) };
  }

  /**
   * One key per verified account and per e-mail, while the 1,000 last.
   * → {status, body}. An existing key is returned before the counter is
   * looked at, so someone who claimed early can always see theirs again.
   */
  async function claim({ uid, email }) {
    const { db, FieldValue } = await getAdmin();
    const mail = String(email || '').trim().toLowerCase();
    if (!uid || !mail || mail.includes('/')) return { status: 400, body: { error: 'This account has no usable e-mail address' } };

    const counterRef = db.collection('launch').doc('counter');
    const byUid = db.collection('launch_claims').doc(`uid:${uid}`);
    const byEmail = db.collection('launch_claims').doc(`email:${mail}`);

    return db.runTransaction(async (tx) => {
      const [counterSnap, uidSnap, emailSnap] = await Promise.all([tx.get(counterRef), tx.get(byUid), tx.get(byEmail)]);
      const claimed = counterSnap.exists ? Number(counterSnap.data().claimed) || 0 : 0;
      const existing = (uidSnap.exists && uidSnap.data().key) || (emailSnap.exists && emailSnap.data().key);
      if (existing) {
        return { status: 200, body: { key: existing, claimed: Math.min(claimed, LAUNCH_TOTAL), total: LAUNCH_TOTAL, existing: true } };
      }
      if (claimed >= LAUNCH_TOTAL) {
        return { status: 410, body: { error: SOLD_OUT, claimed: LAUNCH_TOTAL, total: LAUNCH_TOTAL } };
      }

      // 80 random bits make a collision absurd, but checking costs one read.
      let key;
      for (let i = 0; i < 5 && !key; i += 1) {
        const candidate = newKey();
        if (!(await tx.get(db.collection('launch_keys').doc(candidate))).exists) key = candidate;
      }
      if (!key) throw new Error('could not mint a unique key');

      const created = now();
      tx.set(db.collection('launch_keys').doc(key), {
        email: mail,
        uid,
        product: 'bundle',
        product_id: PRODUCT_IDS.bundle,
        status: 'active',
        activation_limit: ACTIVATION_LIMIT,
        instances: {},
        created,
      });
      tx.set(byUid, { key, email: mail, created });
      tx.set(byEmail, { key, uid, created });
      tx.set(counterRef, { claimed: claimed + 1, updated: created }, { merge: true });
      // The dashboard's shape (see the Lemon Squeezy webhook in server.js).
      tx.set(db.collection('plugin_licenses').doc(mail), {
        email: mail,
        updated: FieldValue.serverTimestamp(),
        licenses: {
          [key]: {
            license_id: key,
            product: 'bundle',
            product_id: PRODUCT_IDS.bundle,
            key,
            key_short: keyShort(key),
            status: 'active',
            disabled: false,
            activation_limit: ACTIVATION_LIMIT,
            instances_count: 0,
            order_id: null,
            expires_at: null,
            source: 'launch',
            created,
          },
        },
      }, { merge: true });
      return { status: 200, body: { key, claimed: claimed + 1, total: LAUNCH_TOTAL } };
    });
  }

  // Keep the dashboard's activation count in step with the key.
  function mirrorCount(tx, db, FieldValue, doc, key, count) {
    tx.set(db.collection('plugin_licenses').doc(doc.email), {
      updated: FieldValue.serverTimestamp(),
      licenses: { [key]: { instances_count: count, status: doc.status } },
    }, { merge: true });
  }

  async function activate({ licenseKey, instanceName }) {
    const key = normaliseKey(licenseKey);
    const name = String(instanceName || '').trim().slice(0, 100);
    if (!key) return { status: 404, body: { activated: false, error: 'This license key was not found.', meta: {} } };
    if (!name) return { status: 400, body: { activated: false, error: 'The instance name is missing.', meta: {} } };

    const { db, FieldValue } = await getAdmin();
    const ref = db.collection('launch_keys').doc(key);
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return { status: 404, body: { activated: false, error: 'This license key was not found.', meta: {} } };
      const doc = snap.data();
      const instances = { ...(doc.instances || {}) };
      const refusal = unusableReason(doc)
        || (Object.keys(instances).length >= doc.activation_limit ? 'This license key has reached the activation limit.' : null);
      if (refusal) {
        return { status: 400, body: { activated: false, error: refusal, license_key: licenceKeyView(key, doc), meta: {} } };
      }
      const id = newId();
      instances[id] = { name, created: now() };
      tx.update(ref, { instances });
      const after = { ...doc, instances };
      mirrorCount(tx, db, FieldValue, after, key, Object.keys(instances).length);
      return {
        status: 200,
        body: {
          activated: true,
          error: null,
          license_key: licenceKeyView(key, after),
          instance: instanceView(id, instances[id]),
          meta: metaFull(),
        },
      };
    });
  }

  async function validate({ licenseKey, instanceId }) {
    const key = normaliseKey(licenseKey);
    const notFound = { status: 404, body: { valid: false, error: 'This license key was not found.', license_key: null, instance: null, meta: {} } };
    if (!key) return notFound;
    const { db } = await getAdmin();
    const snap = await db.collection('launch_keys').doc(key).get();
    if (!snap.exists) return notFound;
    const doc = snap.data();
    const view = licenceKeyView(key, doc);
    const id = String(instanceId || '').trim();
    const inst = id ? (doc.instances || {})[id] : null;
    if (id && !inst) {
      return { status: 404, body: { valid: false, error: 'This instance was not found for this license key.', license_key: view, instance: null, meta: metaFull() } };
    }
    const reason = unusableReason(doc);
    return {
      status: 200,
      body: {
        valid: !reason,
        error: reason,
        license_key: view,
        instance: inst ? instanceView(id, inst) : null,
        meta: metaFull(),
      },
    };
  }

  async function deactivate({ licenseKey, instanceId }) {
    const key = normaliseKey(licenseKey);
    const id = String(instanceId || '').trim();
    if (!key) return { status: 404, body: { deactivated: false, error: 'This license key was not found.' } };
    if (!id) return { status: 400, body: { deactivated: false, error: 'The instance id is missing.' } };
    const { db, FieldValue } = await getAdmin();
    const ref = db.collection('launch_keys').doc(key);
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return { status: 404, body: { deactivated: false, error: 'This license key was not found.' } };
      const doc = snap.data();
      const instances = { ...(doc.instances || {}) };
      if (!instances[id]) {
        return { status: 404, body: { deactivated: false, error: 'This instance was not found for this license key.' } };
      }
      delete instances[id];
      tx.update(ref, { instances });
      const after = { ...doc, instances };
      mirrorCount(tx, db, FieldValue, after, key, Object.keys(instances).length);
      return { status: 200, body: { deactivated: true, error: null, license_key: licenceKeyView(key, after), meta: metaFull() } };
    });
  }

  return { readCounter, claim, activate, validate, deactivate };
}

// ---------------------------------------------------------------- rate limit

/**
 * Per-IP token bucket: `perMinute` requests, refilled continuously. In-memory,
 * so each Cloud Run instance counts on its own — enough to stop a script
 * guessing keys, which is all it is for (80 random bits already make guessing
 * hopeless).
 */
export function tokenBucket({ perMinute = 30, clock = () => Date.now() } = {}) {
  const buckets = new Map();
  const rate = perMinute / 60_000;
  return function take(ip) {
    const t = clock();
    const b = buckets.get(ip) || { tokens: perMinute, at: t };
    b.tokens = Math.min(perMinute, b.tokens + (t - b.at) * rate);
    b.at = t;
    const ok = b.tokens >= 1;
    if (ok) b.tokens -= 1;
    buckets.set(ip, b);
    // A full bucket is the same as no bucket; drop them so the map stays small.
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.tokens + (t - v.at) * rate >= perMinute) buckets.delete(k);
    }
    return ok;
  };
}
