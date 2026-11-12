// Local-only tests for RU-8 on iPhone / iPad (api/appstore.js and its three routes in api/server.js): App Store purchases as
// an `ru8` entitlement, the desktop download they open, refunds through App Store Server Notifications V2, account deletion.
// The test builds its own CA chain (root -> intermediate -> leaf with Apple's OIDs, ECDSA P-256, pure node:crypto) and signs
// JWS transactions and notifications with it; the verifier trusts that root only through setAppleTestRoots (allowed only with
// APPLE_TEST_ROOTS=1, which this file sets). No Google credentials, network or deploy.  Run: node scripts/test-appstore.js
import assert from 'node:assert/strict';
import { PassThrough, Readable } from 'node:stream';
import { readFile } from 'node:fs/promises';
import { createHash, generateKeyPairSync, sign as cryptoSign } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const require = createRequire(import.meta.url);
process.env.APPLE_TEST_ROOTS = '1';
delete process.env.APPLE_ALLOW_SANDBOX;

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
function merge(a, b) {
  const out = { ...(a || {}) };
  for (const [k, v] of Object.entries(b)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' ? merge(out[k], v) : clone(v);
  }
  return out;
}
// Firestore-shaped fake: documents, sub-collections, equality queries, merge sets, serial transactions.
function fakeFirestore() {
  const docs = new Map();
  const snap = (path) => ({ exists: docs.has(path), data: () => clone(docs.get(path)), id: path.split('/').pop() });
  const ref = (path) => ({
    path, id: path.split('/').pop(),
    get: async () => snap(path),
    set: async (data, options) => { docs.set(path, options?.merge ? merge(docs.get(path), data) : clone(data)); },
    delete: async () => { docs.delete(path); },
    collection: (sub) => collection(`${path}/${sub}`),
  });
  const list = (name) => [...docs.keys()].filter((p) => p.startsWith(`${name}/`) && !p.slice(name.length + 1).includes('/'));
  const toSnap = (paths) => ({ docs: paths.map((p) => ({ ...snap(p), ref: ref(p) })) });
  function collection(name) {
    return {
      doc: (id) => ref(`${name}/${id}`),
      get: async () => toSnap(list(name)),
      where: (field, op, value) => ({ get: async () => toSnap(list(name).filter((p) => docs.get(p)?.[field] === value)) }),
    };
  }
  let queue = Promise.resolve();
  return {
    docs, collection,
    runTransaction(callback) {
      const run = queue.then(async () => {
        const writes = [];
        const tx = {
          get: async (d) => snap(d.path),
          set: (d, data, options) => writes.push(() => d.set(data, options)),
          update: (d, data) => writes.push(() => docs.set(d.path, merge(docs.get(d.path), data))),
          delete: (d) => writes.push(() => d.delete()),
        };
        const result = await callback(tx);
        for (const w of writes) await w();
        return result;
      });
      queue = run.catch(() => {});
      return run;
    },
  };
}

const MANIFEST = { ru8: { version: '1.0.0', files: {
  mac: { name: 'RU-8-1.0.0-macOS.pkg', size: 7, object: 'plugins/ru8/1.0.0/RU-8-1.0.0-macOS.pkg' },
  win: { name: 'RU-8-1.0.0-Windows.zip', size: 7, object: 'plugins/ru8/1.0.0/RU-8-1.0.0-Windows.zip' },
} } };
const fakeStorage = { bucket: () => ({ file: (object) => ({
  download: async () => [Buffer.from(JSON.stringify(MANIFEST))],
  getMetadata: async () => [{ name: object, size: 7 }],
  createReadStream: () => Readable.from(['RU8']),
}) }) };

const state = { db: fakeFirestore(), deletedUsers: new Set() };
// valid-<uid>: a Google sign-in with <uid>@example.com, signed in just now. unv-*: a password account (not proven).
state.auth = {
  verifyIdToken: async (token) => {
    if (!token.startsWith('valid-')) throw new Error('invalid token');
    const uid = token.slice(6);
    return { uid, email: `${uid}@example.com`, email_verified: !uid.startsWith('unv-'), firebase: { sign_in_provider: uid.startsWith('unv-') ? 'password' : 'google.com' }, auth_time: Math.floor(Date.now() / 1000) };
  },
  deleteUser: async (uid) => { state.deletedUsers.add(uid); },
};
globalThis.__appleTestApp = { initializeApp() {}, applicationDefault() {}, getApps: () => [] };
globalThis.__appleTestFirestore = { getFirestore: () => state.db, FieldValue: { serverTimestamp: () => '<server-time>' } };
globalThis.__appleTestAuth = { getAuth: () => state.auth };
globalThis.__appleTestStorage = { Storage: class { constructor() { return fakeStorage; } } };

const url = (f) => pathToFileURL(resolve(root, f)).href;
const transformed = (await readFile(resolve(root, 'api/server.js'), 'utf8'))
  .replace("import express from 'express';", `import express from '${pathToFileURL(require.resolve('express')).href}';`)
  .replace('const __dirname = dirname(fileURLToPath(import.meta.url));', `const __dirname = ${JSON.stringify(resolve(root, 'api'))};`)
  .replace("from './launchLicence.js';", `from '${url('api/launchLicence.js')}';`)
  .replace("from './entitlements.js';", `from '${url('api/entitlements.js')}';`)
  .replace("from './accountDeletion.js';", `from '${url('api/accountDeletion.js')}';`)
  .replace("from './credits.js';", `from '${url('api/credits.js')}';`)
  .replace("from './catalog.js';", `from '${url('api/catalog.js')}';`)
  .replace("from './catalogSchema.js';", `from '${url('api/catalogSchema.js')}';`)
  .replace("from './agents.js';", `from '${url('api/agents.js')}';`)
  .replace("from './trialGrant.js';", `from '${url('api/trialGrant.js')}';`)
  .replace("from './partners.js';", `from '${url('api/partners.js')}';`)
  .replace("from './inbox.js';", `from '${url('api/inbox.js')}';`)
  .replace("from './stats.js';", `from '${url('api/stats.js')}';`)
  .replace('const app = express();', 'export const app = express();')
  .replace("await import('firebase-admin/app')", 'await Promise.resolve(globalThis.__appleTestApp)')
  .replace("await import('firebase-admin/firestore')", 'await Promise.resolve(globalThis.__appleTestFirestore)')
  .replace("await import('firebase-admin/auth')", 'await Promise.resolve(globalThis.__appleTestAuth)')
  .replace("import('@google-cloud/storage')", 'Promise.resolve(globalThis.__appleTestStorage)')
  .replace(/const PORT = process\.env\.PORT \|\| 8080;[\s\S]*?\n\);\s*$/, '');
const server = await import(`data:text/javascript;base64,${Buffer.from(transformed).toString('base64')}`);
process.env.DOWNLOAD_TICKET_SECRET = 'apple-test-secret';
const appstore = await import(url('api/appstore.js'));
const entitlements = await import(url('api/entitlements.js'));
entitlements.setMxResolver(async (domain) => [{ exchange: `mx.${domain}`, priority: 10 }]);

const routeHandlers = new Map(server.app.router.stack.filter((l) => l.route).map((l) => [l.route.path, l.route.stack.at(-1).handle]));
class FakeResponse extends PassThrough {
  constructor() { super(); this.statusCode = 200; this.headersSent = false; this.headers = {}; this.body = undefined; }
  setHeader(n, v) { this.headers[n.toLowerCase()] = v; }
  status(c) { this.statusCode = c; return this; }
  type() { return this; }
  json(b) { this.body = b; this.headersSent = true; this.end(); return this; }
  send(b) { this.body = b; this.headersSent = true; this.end(b); return this; }
}
let ipSeq = 0;
async function call(path, { body, token } = {}) {
  const u = new URL(path, 'http://local.test');
  const headers = { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) };
  const req = { path: u.pathname, query: Object.fromEntries(u.searchParams), body: body || {}, headers, ip: `10.9.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`, get(n) { return this.headers[n.toLowerCase()]; } };
  const res = new FakeResponse();
  const handler = routeHandlers.get(u.pathname);
  assert.ok(handler, `route not found: ${u.pathname}`);
  const done = new Promise((r) => res.once('finish', r));
  await handler(req, res);
  if (!res.writableEnded) await done;
  return { status: res.statusCode, body: res.body };
}
const entitlement = (uid) => call('/api/ru8/ios/entitlement', { token: `valid-${uid}` });
const link = (uid, jws) => call('/api/ru8/ios/apple-purchase', { token: `valid-${uid}`, body: { jws } });
const notify = (signedPayload) => call('/api/apple/notifications', { body: { signedPayload } });
const ticket = (uid, platform = 'mac') => call('/api/download/ticket', { token: `valid-${uid}`, body: { slug: 'ru8', platform, launchId: 'solo' } });

// ---- A test CA in pure node:crypto: DER encoding, X.509 v3 certificates, ES256 JWS. --------------------------------
const derLen = (n) => (n < 128 ? Buffer.from([n]) : n < 256 ? Buffer.from([0x81, n]) : Buffer.from([0x82, n >> 8, n & 255]));
const der = (tag, ...parts) => { const body = Buffer.concat(parts); return Buffer.concat([Buffer.from([tag]), derLen(body.length), body]); };
const seq = (...p) => der(0x30, ...p);
function oid(s) {
  const [a, b, ...rest] = s.split('.').map(Number);
  const bytes = [40 * a + b];
  for (const n of rest) { const chunk = [n & 0x7f]; let v = Math.floor(n / 128); while (v) { chunk.unshift((v & 0x7f) | 0x80); v = Math.floor(v / 128); } bytes.push(...chunk); }
  return der(0x06, Buffer.from(bytes));
}
const int = (n) => { let h = n.toString(16); if (h.length % 2) h = `0${h}`; let b = Buffer.from(h, 'hex'); if (b[0] & 0x80) b = Buffer.concat([Buffer.from([0]), b]); return der(0x02, b); };
const utc = (d) => der(0x17, Buffer.from(`${d.toISOString().slice(2, 19).replace(/[-T:]/g, '')}Z`));
const nameOf = (cn) => seq(der(0x31, seq(oid('2.5.4.3'), der(0x0c, Buffer.from(cn)))));
const ext = (id, value, critical = false) => seq(oid(id), ...(critical ? [der(0x01, Buffer.from([0xff]))] : []), der(0x04, value));
const ECDSA_SHA256 = seq(oid('1.2.840.10045.4.3.2'));
let serial = 1000;
function makeCert({ cn, issuerCn, keys, issuerKey, ca, oids = [], from = -86400e3, to = 365 * 86400e3 }) {
  const now = Date.now();
  const exts = [ext('2.5.29.19', seq(...(ca ? [der(0x01, Buffer.from([0xff]))] : [])), true), ...oids.map((o) => ext(o, der(0x05)))];
  const tbs = seq(der(0xa0, int(2)), int(serial++), ECDSA_SHA256, nameOf(issuerCn), seq(utc(new Date(now + from)), utc(new Date(now + to))), nameOf(cn),
    keys.publicKey.export({ type: 'spki', format: 'der' }), der(0xa3, seq(...exts)));
  const sig = cryptoSign('sha256', tbs, issuerKey);
  return seq(tbs, ECDSA_SHA256, der(0x03, Buffer.from([0]), sig));
}
const ec = () => generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
function makeChain({ leafTo, leafOids = ['1.2.840.113635.100.6.11.1'], interOids = ['1.2.840.113635.100.6.2.1'] } = {}, rootPair = null) {
  const r = rootPair || (() => { const keys = ec(); return { keys, der: makeCert({ cn: 'Test Root CA - G3', issuerCn: 'Test Root CA - G3', keys, issuerKey: keys.privateKey, ca: true, to: 3650 * 86400e3 }) }; })();
  const ik = ec();
  const inter = makeCert({ cn: 'Test WWDR CA', issuerCn: 'Test Root CA - G3', keys: ik, issuerKey: r.keys.privateKey, ca: true, oids: interOids });
  const lk = ec();
  const leaf = makeCert({ cn: 'Test StoreKit Signing', issuerCn: 'Test WWDR CA', keys: lk, issuerKey: ik.privateKey, ca: false, oids: leafOids, ...(leafTo !== undefined ? { to: leafTo } : {}) });
  return { root: r, rootDer: r.der, x5c: [leaf, inter, r.der].map((d) => d.toString('base64')), leafKey: lk.privateKey };
}
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function jws(payload, chain, { alg = 'ES256', header = {} } = {}) {
  const h = b64u({ alg, x5c: chain.x5c, ...header });
  const p = b64u(payload);
  const s = cryptoSign('sha256', Buffer.from(`${h}.${p}`), { key: chain.leafKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${h}.${p}.${s}`;
}

const chain = makeChain();
appstore.setAppleTestRoots([chain.rootDer]);
let otidSeq = 2000000000000;
function txPayload(over = {}) {
  const id = String(++otidSeq);
  return { transactionId: id, originalTransactionId: id, bundleId: 'com.subverselab.ru8.app', productId: 'com.subverselab.ru8.app.full', purchaseDate: Date.parse('2026-10-20T10:00:00Z'), originalPurchaseDate: Date.parse('2026-10-20T10:00:00Z'), type: 'Non-Consumable', inAppOwnershipType: 'PURCHASED', environment: 'Production', signedDate: Date.now(), ...over };
}
let signedAt = Date.now();
function notification(type, tx, over = {}) {
  return jws({ notificationType: type, notificationUUID: `uuid-${++signedAt}`, version: '2.0', signedDate: over.signedDate ?? signedAt, data: { bundleId: 'com.subverselab.ru8.app', environment: tx.environment || 'Production', signedTransactionInfo: jws({ ...tx, ...(type === 'REFUND' || type === 'REVOKE' ? { revocationDate: signedAt, revocationReason: 0 } : {}) }, chain), ...(over.data || {}) } }, chain);
}

const results = [];
async function test(name, fn) {
  try { await fn(); results.push({ ok: true }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ ok: false }); console.log(`FAIL ${name}: ${error.message}`); if (process.env.TEST_STACK) console.log(error.stack); }
}
const reset = () => state.db.docs.clear();

await test('the pinned Apple Root CA - G3 file is in api/, matches Apple\'s published SHA-256 and is loaded', async () => {
  const file = await readFile(resolve(root, 'api/AppleRootCA-G3.cer'));
  assert.equal(createHash('sha256').update(file).digest('hex'), '63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179');
  assert.equal(appstore.APPLE_ROOT_G3_SHA256, '63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179');
  assert.equal(appstore.pinnedRootLoaded(), true);
});

await test('valid purchase links: 200 {owned, via appstore}; entitlement true; desktop ru8 tickets open on mac and win; account lists ru8', async () => {
  reset();
  const tx = txPayload();
  const r = await link('ios1', jws(tx, chain));
  assert.equal(r.status, 200, JSON.stringify(r.body)); assert.deepEqual(r.body, { owned: true, via: 'appstore' });
  const p = state.db.docs.get(`apple_purchases/${tx.originalTransactionId}`);
  assert.equal(p.uid, 'ios1'); assert.equal(p.revoked, false); assert.equal(p.environment, 'Production'); assert.equal(p.productId, 'com.subverselab.ru8.app.full');
  assert.equal(p.purchaseDate, '2026-10-20T10:00:00.000Z'); assert.ok(p.linkedAt);
  assert.ok(state.db.docs.get('apple_by_uid/ios1').transactions[tx.originalTransactionId]);
  assert.deepEqual((await entitlement('ios1')).body, { owned: true, via: 'appstore' });
  const mac = await ticket('ios1', 'mac');
  assert.equal(mac.status, 200, JSON.stringify(mac.body)); assert.equal(mac.body.name, 'RU-8-1.0.0-macOS.pkg');
  const win = await ticket('ios1', 'win');
  assert.equal(win.status, 200); assert.equal(win.body.name, 'RU-8-1.0.0-Windows.zip');
  const st = await call('/api/purchases/status', { token: 'valid-ios1' });
  assert.equal(st.status, 200); assert.deepEqual(st.body.owned, ['ru8']); assert.equal(st.body.purchased.ru8, '2026-10-20');
  // An App Store purchase opens ru8 only: not ELEK, not the Drum Pack.
  assert.equal((await call('/api/download/ticket', { token: 'valid-ios1', body: { slug: 'elek', platform: 'mac', launchId: 'solo' } })).status, 402);
});

await test('wrong bundleId and wrong productId: 400, nothing stored', async () => {
  reset();
  for (const over of [{ bundleId: 'com.example.other' }, { productId: 'com.subverselab.ru8.app.other' }]) {
    const r = await link('ios2', jws(txPayload(over), chain));
    assert.equal(r.status, 400, JSON.stringify(over)); assert.ok(r.body.error);
  }
  assert.equal([...state.db.docs.keys()].filter((k) => k.startsWith('apple_')).length, 0);
  assert.equal((await entitlement('ios2')).body.owned, false);
});

await test('a transaction with revocationDate: 403, not linked', async () => {
  reset();
  const tx = txPayload({ revocationDate: Date.now(), revocationReason: 1 });
  const r = await link('ios3', jws(tx, chain));
  assert.equal(r.status, 403); assert.equal(state.db.docs.has(`apple_purchases/${tx.originalTransactionId}`), false);
});

await test('Sandbox refused by default (400); accepted with APPLE_ALLOW_SANDBOX=1, and counts only while it is set', async () => {
  reset();
  const tx = txPayload({ environment: 'Sandbox' });
  assert.equal((await link('ios4', jws(tx, chain))).status, 400);
  for (const env of ['Xcode', 'LocalTesting']) assert.equal((await link('ios4', jws(txPayload({ environment: env }), chain))).status, 400, env);
  process.env.APPLE_ALLOW_SANDBOX = '1';
  try {
    assert.equal((await link('ios4', jws(tx, chain))).status, 200);
    assert.deepEqual((await entitlement('ios4')).body, { owned: true, via: 'appstore' });
    assert.equal((await link('ios4', jws(txPayload({ environment: 'Xcode' }), chain))).status, 400, 'Xcode stays refused');
  } finally { delete process.env.APPLE_ALLOW_SANDBOX; }
  assert.deepEqual((await entitlement('ios4')).body, { owned: false, via: null }, 'a linked Sandbox purchase stops counting when the env is unset');
  assert.equal((await ticket('ios4')).status, 402);
});

await test('tampered payload, tampered signature, garbage and missing jws: 400', async () => {
  reset();
  const good = jws(txPayload(), chain);
  const [h, , s] = good.split('.');
  const forged = `${h}.${b64u(txPayload({ productId: 'com.subverselab.ru8.app.full', originalTransactionId: '1' }))}.${s}`;
  const sig = Buffer.from(s, 'base64url'); sig[5] ^= 1;
  for (const bad of [forged, `${good.split('.').slice(0, 2).join('.')}.${sig.toString('base64url')}`, 'a.b.c', 'not-a-jws', '', undefined, 42, `${good}.x`]) {
    const r = await link('ios5', bad);
    assert.equal(r.status, 400, String(bad).slice(0, 20)); assert.equal(r.body.owned, undefined);
  }
  assert.equal([...state.db.docs.keys()].filter((k) => k.startsWith('apple_')).length, 0);
});

await test('wrong root: a chain to another CA, a chain whose x5c names our root but was signed by another, and the real pinned root alone', async () => {
  reset();
  const other = makeChain();
  const r1 = await link('ios6', jws(txPayload(), other));
  assert.equal(r1.status, 400); assert.equal(r1.body.reason, 'untrusted-root');
  // x5c[2] swapped for the trusted root: the intermediate is not issued / signed by it.
  const swapped = { ...other, x5c: [other.x5c[0], other.x5c[1], chain.x5c[2]] };
  const r2 = await link('ios6', jws(txPayload(), swapped));
  assert.equal(r2.status, 400); assert.equal(r2.body.reason, 'bad-chain');
  // Production trust (no test root): our test chain is refused against the pinned Apple root.
  appstore.setAppleTestRoots(null);
  try { const r3 = await link('ios6', jws(txPayload(), chain)); assert.equal(r3.status, 400); assert.equal(r3.body.reason, 'untrusted-root'); }
  finally { appstore.setAppleTestRoots([chain.rootDer]); }
  // Two certificates, or four: refused.
  for (const x5c of [chain.x5c.slice(0, 2), [...chain.x5c, chain.x5c[2]]]) assert.equal((await link('ios6', jws(txPayload(), { ...chain, x5c }))).body.reason, 'bad-chain');
});

await test('expired leaf, leaf without the Apple receipt OID, intermediate without the WWDR OID: 400', async () => {
  reset();
  const expired = makeChain({ leafTo: -3600e3 }, chain.root);
  assert.equal((await link('ios7', jws(txPayload(), expired))).body.reason, 'expired-certificate');
  const noLeafOid = makeChain({ leafOids: [] }, chain.root);
  assert.equal((await link('ios7', jws(txPayload(), noLeafOid))).body.reason, 'bad-leaf-oid');
  const noInterOid = makeChain({ interOids: [] }, chain.root);
  assert.equal((await link('ios7', jws(txPayload(), noInterOid))).body.reason, 'bad-intermediate-oid');
  // The same chain with valid dates passes (the checks above are about the certificates, not the root).
  assert.equal((await link('ios7', jws(txPayload(), makeChain({}, chain.root)))).status, 200);
});

await test('alg none, HS256, ES384 and alg null: 400 bad-alg', async () => {
  reset();
  for (const alg of ['none', 'HS256', 'ES384', null]) {
    const r = await link('ios8', jws(txPayload(), chain, { alg }));
    assert.equal(r.status, 400, String(alg)); assert.equal(r.body.reason, 'bad-alg');
  }
  const none = `${b64u({ alg: 'none' })}.${b64u(txPayload())}.`;
  assert.equal((await link('ios8', none)).status, 400);
});

await test('a second uid linking the same originalTransactionId: 409; the first keeps it', async () => {
  reset();
  const tx = txPayload();
  assert.equal((await link('ios9a', jws(tx, chain))).status, 200);
  const r = await link('ios9b', jws({ ...tx, transactionId: String(Number(tx.transactionId) + 7) }, chain));
  assert.equal(r.status, 409); assert.ok(r.body.error);
  assert.equal(state.db.docs.get(`apple_purchases/${tx.originalTransactionId}`).uid, 'ios9a');
  assert.equal(state.db.docs.has('apple_by_uid/ios9b'), false);
  assert.equal((await entitlement('ios9b')).body.owned, false);
  assert.equal((await entitlement('ios9a')).body.owned, true);
});

await test('the same uid linking twice (restore purchases): 200 both times, one index entry, linkedAt unchanged', async () => {
  reset();
  const tx = txPayload();
  assert.equal((await link('ios10', jws(tx, chain))).status, 200);
  const first = state.db.docs.get(`apple_purchases/${tx.originalTransactionId}`).linkedAt;
  await new Promise((r) => setTimeout(r, 5));
  const again = await link('ios10', jws(tx, chain));
  assert.equal(again.status, 200); assert.deepEqual(again.body, { owned: true, via: 'appstore' });
  assert.equal(state.db.docs.get(`apple_purchases/${tx.originalTransactionId}`).linkedAt, first);
  assert.deepEqual(Object.keys(state.db.docs.get('apple_by_uid/ios10').transactions), [tx.originalTransactionId]);
});

await test('REFUND notification revokes: entitlement false, desktop ticket 402; REFUND_REVERSED reopens; REVOKE revokes too', async () => {
  reset();
  const tx = txPayload();
  assert.equal((await link('ios11', jws(tx, chain))).status, 200);
  assert.equal((await ticket('ios11')).status, 200);
  const refund = await notify(notification('REFUND', tx));
  assert.equal(refund.status, 200); assert.equal(refund.body.result, 'revoked');
  const p = state.db.docs.get(`apple_purchases/${tx.originalTransactionId}`);
  assert.equal(p.revoked, true); assert.ok(p.revokedAt); assert.equal(p.uid, 'ios11');
  assert.deepEqual((await entitlement('ios11')).body, { owned: false, via: null });
  assert.equal((await ticket('ios11')).status, 402);
  assert.equal((await ticket('ios11', 'win')).status, 402);
  assert.deepEqual((await call('/api/purchases/status', { token: 'valid-ios11' })).body.owned, []);
  assert.equal((await link('ios11', jws(tx, chain))).status, 403, 'a refunded purchase cannot be linked open again');
  const back = await notify(notification('REFUND_REVERSED', tx));
  assert.equal(back.status, 200); assert.equal(back.body.result, 'restored');
  assert.equal(state.db.docs.get(`apple_purchases/${tx.originalTransactionId}`).revoked, false);
  assert.deepEqual((await entitlement('ios11')).body, { owned: true, via: 'appstore' });
  assert.equal((await ticket('ios11')).status, 200);
  assert.equal((await notify(notification('REVOKE', tx))).body.result, 'revoked');
  assert.equal((await entitlement('ios11')).body.owned, false);
});

await test('notifications: an older retried one does not undo a newer one; other types, apps and Sandbox are 200 and change nothing', async () => {
  reset();
  const tx = txPayload();
  await link('ios12', jws(tx, chain));
  const older = signedAt + 10;
  assert.equal((await notify(notification('REFUND', tx, { signedDate: older + 100 }))).body.result, 'revoked');
  assert.equal((await notify(notification('REFUND_REVERSED', tx, { signedDate: older }))).body.result, 'stale');
  assert.equal(state.db.docs.get(`apple_purchases/${tx.originalTransactionId}`).revoked, true);
  for (const [type, over, why] of [['TEST', {}, 'ignored:TEST'], ['CONSUMPTION_REQUEST', {}, 'ignored:CONSUMPTION_REQUEST'],
    ['REFUND_REVERSED', { data: { bundleId: 'com.example.other' } }, 'ignored:other-app'], ['REFUND_REVERSED', { data: { environment: 'Sandbox' } }, 'ignored:environment']]) {
    const r = await notify(notification(type, tx, { signedDate: older + 1000, ...over }));
    assert.equal(r.status, 200, type); assert.equal(r.body.result, why);
  }
  assert.equal(state.db.docs.get(`apple_purchases/${tx.originalTransactionId}`).revoked, true);
  // A refund for a purchase nobody linked yet is kept, so a later link with the old (pre-refund) JWS is refused.
  const unlinked = txPayload();
  assert.equal((await notify(notification('REFUND', unlinked))).body.result, 'revoked');
  assert.equal(state.db.docs.get(`apple_purchases/${unlinked.originalTransactionId}`).uid, null);
  assert.equal((await link('ios12b', jws(unlinked, chain))).status, 403);
});

await test('bad notification signature: 400 (tampered outer, untrusted chain, tampered inner transaction, missing, garbage); nothing changes', async () => {
  reset();
  const tx = txPayload();
  await link('ios13', jws(tx, chain));
  const good = notification('REFUND', tx);
  const [h, p, s] = good.split('.');
  const flipped = Buffer.from(s, 'base64url'); flipped[0] ^= 1;
  const otherChain = makeChain();
  const inner = jws({ ...tx, revocationDate: Date.now() }, chain).split('.');
  const badInner = `${inner[0]}.${inner[1]}.${Buffer.alloc(64, 1).toString('base64url')}`;
  const tamperedInner = jws({ notificationType: 'REFUND', signedDate: Date.now() + 5000, data: { bundleId: 'com.subverselab.ru8.app', environment: 'Production', signedTransactionInfo: badInner } }, chain);
  for (const bad of [`${h}.${p}.${flipped.toString('base64url')}`, notification('REFUND', tx).replace(/^[^.]+/, b64u({ alg: 'HS256', x5c: chain.x5c })),
    jws({ notificationType: 'REFUND', signedDate: Date.now(), data: { bundleId: 'com.subverselab.ru8.app', environment: 'Production', signedTransactionInfo: jws(tx, otherChain) } }, otherChain),
    tamperedInner, undefined, '', 'x.y.z']) {
    const r = await notify(bad);
    assert.equal(r.status, 400, String(bad).slice(0, 30)); assert.equal(r.body.ok, undefined);
  }
  assert.equal(state.db.docs.get(`apple_purchases/${tx.originalTransactionId}`).revoked, false);
  assert.equal((await entitlement('ios13')).body.owned, true);
});

await test('a Lemon Squeezy owner: entitlement via lemonsqueezy (by e-mail for a proven account, by uid for an unverified one)', async () => {
  reset();
  state.db.docs.set('plugin_licenses/lsbuyer@example.com', { orders: { O1: { order_id: 'O1', product: 'ru8', status: 'paid', refunded: false, created: '2026-10-18T10:00:00Z' } } });
  assert.deepEqual((await entitlement('lsbuyer')).body, { owned: true, via: 'lemonsqueezy' });
  state.db.docs.set('orders_by_uid/unv-ls', { orders: { O2: { product: 'ru8', status: 'paid', refunded: false, created: '2026-10-18T10:00:00Z', email: 'typed@example.com' } } });
  assert.deepEqual((await entitlement('unv-ls')).body, { owned: true, via: 'lemonsqueezy' });
  // An e-mail-only order does not open for a non-proven account (the download rule).
  state.db.docs.set('plugin_licenses/unv-mail@example.com', { orders: { O3: { order_id: 'O3', product: 'ru8', status: 'paid', refunded: false } } });
  assert.deepEqual((await entitlement('unv-mail')).body, { owned: false, via: null });
  // Refunded, or another product: not an owner.
  state.db.docs.set('plugin_licenses/lsref@example.com', { orders: { O4: { order_id: 'O4', product: 'ru8', status: 'refunded', refunded: true } } });
  state.db.docs.set('plugin_licenses/lsother@example.com', { orders: { O5: { order_id: 'O5', product: 'elek', status: 'paid', refunded: false } } });
  assert.equal((await entitlement('lsref')).body.owned, false);
  assert.equal((await entitlement('lsother')).body.owned, false);
  // Both stores: Lemon Squeezy is named.
  await link('lsbuyer', jws(txPayload(), chain));
  assert.equal((await entitlement('lsbuyer')).body.via, 'lemonsqueezy');
});

await test('nobody owns: {owned:false, via:null}; testers and the admin preview are not owners here', async () => {
  reset();
  assert.deepEqual((await entitlement('nobody')).body, { owned: false, via: null });
  state.db.docs.set('launch2_testers/tester1@example.com', { status: 'active', uid: 'tester1' });
  assert.deepEqual((await entitlement('tester1')).body, { owned: false, via: null });
});

await test('no token or a bad token: 401 on entitlement and apple-purchase, nothing stored', async () => {
  reset();
  for (const path of ['/api/ru8/ios/entitlement', '/api/ru8/ios/apple-purchase']) {
    assert.equal((await call(path, { body: { jws: jws(txPayload(), chain) } })).status, 401, path);
    assert.equal((await call(path, { token: 'nope', body: { jws: jws(txPayload(), chain) } })).status, 401, path);
  }
  assert.equal([...state.db.docs.keys()].filter((k) => k.startsWith('apple_')).length, 0);
});

await test('account deletion: apple_by_uid goes, the purchase keeps Apple\'s record without the uid; a new account may link it again', async () => {
  reset();
  const tx = txPayload();
  assert.equal((await link('ios14', jws(tx, chain))).status, 200);
  const del = await call('/api/account/delete', { token: 'valid-ios14', body: { confirm: 'DELETE' } });
  assert.equal(del.status, 200, JSON.stringify(del.body));
  assert.equal(state.db.docs.has('apple_by_uid/ios14'), false);
  const p = state.db.docs.get(`apple_purchases/${tx.originalTransactionId}`);
  assert.equal(p.uid, null); assert.equal(p.linkedAt, null); assert.ok(p.unlinkedAt); assert.equal(p.productId, 'com.subverselab.ru8.app.full'); assert.equal(p.revoked, false);
  assert.ok(!JSON.stringify(p).includes('ios14'));
  assert.ok(state.deletedUsers.has('ios14'));
  assert.equal((await entitlement('ios14')).body.owned, false);
  assert.equal((await link('ios14new', jws(tx, chain))).status, 200, 'the buyer signs up again and restores');
  assert.equal(state.db.docs.get(`apple_purchases/${tx.originalTransactionId}`).uid, 'ios14new');
});

await test('rate limits and body size: apple-purchase 10/min and entitlement 30/min per address; notification body limit 64 KB', async () => {
  reset();
  const fixed = (path, opts) => { const h = routeHandlers.get(path); const res = new FakeResponse(); const req = { path, query: {}, body: opts.body || {}, headers: { authorization: 'Bearer valid-rl' }, ip: '10.99.99.99', get(n) { return this.headers[n.toLowerCase()]; } }; return Promise.resolve(h(req, res)).then(() => res.statusCode); };
  const codes = [];
  for (let i = 0; i < 12; i += 1) codes.push(await fixed('/api/ru8/ios/apple-purchase', { body: { jws: 'x' } }));
  assert.ok(codes.includes(429) && codes.indexOf(429) >= 10, JSON.stringify(codes));
  const codes2 = [];
  for (let i = 0; i < 32; i += 1) codes2.push(await fixed('/api/ru8/ios/entitlement', {}));
  assert.ok(codes2.includes(429) && codes2.indexOf(429) >= 30);
  const src = await readFile(resolve(root, 'api/server.js'), 'utf8');
  assert.match(src, /const appleBody = express\.json\(\{ limit: '16kb' \}\);/);
  assert.match(src, /const appleNotifyBody = express\.json\(\{ limit: '64kb' \}\);/);
});

await test('setAppleTestRoots is refused without APPLE_TEST_ROOTS=1; firestore.rules closes both collections; Dockerfile ships appstore.js and the root', async () => {
  delete process.env.APPLE_TEST_ROOTS;
  try { assert.throws(() => appstore.setAppleTestRoots([chain.rootDer]), /refused/); } finally { process.env.APPLE_TEST_ROOTS = '1'; }
  const rules = await readFile(resolve(root, 'firestore.rules'), 'utf8');
  for (const c of ['apple_purchases', 'apple_by_uid']) assert.match(rules, new RegExp(`match /${c}/\\{document=\\*\\*\\} \\{\\s*allow read, write: if false;`));
  const docker = await readFile(resolve(root, 'api/Dockerfile'), 'utf8');
  assert.match(docker, /COPY server\.js [^\n]*appstore\.js[^\n]* \.\//);
  assert.match(docker, /COPY AppleRootCA-G3\.cer \.\//);
});

// ---- AHENK (7 Nov 2026): the same App Store table row as RU-8, slug `ahenk`; desktop sign-in through the device flow. ----
const AHENK = { bundleId: 'com.subverselab.ahenk', productId: 'com.subverselab.ahenk.full' };
const ahenkTx = (over = {}) => txPayload({ ...AHENK, ...over });
const ahenkEntitlement = (uid) => call('/api/ahenk/ios/entitlement', { token: `valid-${uid}` });
const ahenkLink = (uid, j) => call('/api/ahenk/ios/apple-purchase', { token: `valid-${uid}`, body: { jws: j } });
function ahenkNotification(type, tx, over = {}) {
  return notification(type, tx, { ...over, data: { bundleId: AHENK.bundleId, ...(over.data || {}) } });
}
{
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  process.env.GRANT_SIGNING_KEY = privateKey.export({ type: 'pkcs1', format: 'pem' });
}
state.auth.getUser = async (uid) => {
  if (state.deletedUsers.has(uid)) { const e = new Error('no user'); e.code = 'auth/user-not-found'; throw e; }
  return { uid, email: `${uid}@example.com`, emailVerified: !uid.startsWith('unv-'), providerData: [] };
};
const MACHINE = 'svl-machine:0123456789abcdef0123456789abcdef';
// Desktop sign-in for `uid`: device/start -> approve (as the signed-in buyer) -> poll. Returns {approve, poll}.
async function desktopSignIn(uid) {
  const start = await call('/api/device/start', { body: { product: 'ahenk', machine: MACHINE, name: 'Studio Mac' } });
  assert.equal(start.status, 200, JSON.stringify(start.body));
  const approve = await call('/api/device/approve', { token: `valid-${uid}`, body: { user_code: start.body.user_code } });
  const poll = await call('/api/device/poll', { body: { device_code: start.body.device_code } });
  return { approve, poll };
}
const refresh = (grant) => call('/api/grant/refresh', { body: { grant } });

await test('AHENK: an App Store purchase links (200), entitlement via appstore, ownedVia ahenk = appstore, ru8 stays not owned', async () => {
  reset();
  const tx = ahenkTx();
  const r = await ahenkLink('ah1', jws(tx, chain));
  assert.equal(r.status, 200, JSON.stringify(r.body)); assert.deepEqual(r.body, { owned: true, via: 'appstore' });
  const p = state.db.docs.get(`apple_purchases/${tx.originalTransactionId}`);
  assert.equal(p.uid, 'ah1'); assert.equal(p.productId, 'com.subverselab.ahenk.full'); assert.equal(p.bundleId, 'com.subverselab.ahenk');
  assert.deepEqual((await ahenkEntitlement('ah1')).body, { owned: true, via: 'appstore' });
  assert.deepEqual((await entitlement('ah1')).body, { owned: false, via: null }, 'an AHENK purchase does not open RU-8');
  const admin = { db: state.db, auth: state.auth };
  assert.equal(await entitlements.ownedVia(admin, { email: 'ah1@example.com', uid: 'ah1', proven: true }, 'ahenk'), 'appstore');
  assert.equal(await entitlements.ownedVia(admin, { email: 'ah1@example.com', uid: 'ah1', proven: true }, 'ru8'), null);
  const orders = await appstore.readAppleOrders(state.db, 'ah1');
  assert.deepEqual(Object.values(orders).map((o) => [o.product, o.status, o.source]), [['ahenk', 'paid', 'appstore']]);
  // A RU-8 purchase still reads as ru8 next to it.
  assert.equal((await link('ah1', jws(txPayload(), chain))).status, 200);
  assert.deepEqual(Object.values(await appstore.readAppleOrders(state.db, 'ah1')).map((o) => o.product).sort(), ['ahenk', 'ru8']);
  assert.deepEqual((await entitlement('ah1')).body, { owned: true, via: 'appstore' });
  assert.ok(entitlements.UNLISTED_SLUGS.includes('ahenk'), 'ahenk stays unlisted');
});

await test('AHENK: crossed apps and the trial item are refused (400, nothing stored); wording names the app', async () => {
  reset();
  const a = await link('ah2', jws(ahenkTx(), chain));
  assert.equal(a.status, 400); assert.equal(a.body.error, 'This purchase is not for RU-8.');
  const b = await ahenkLink('ah2', jws(txPayload(), chain));
  assert.equal(b.status, 400); assert.equal(b.body.error, 'This purchase is not for AHENK.');
  const c = await ahenkLink('ah2', jws(ahenkTx({ productId: 'com.subverselab.ahenk.trial30', price: 0 }), chain));
  assert.equal(c.status, 400); assert.equal(c.body.error, 'This purchase is not AHENK.');
  assert.equal((await ahenkLink('ah2', jws(ahenkTx({ revocationDate: Date.now() }), chain))).status, 403);
  assert.equal((await ahenkLink('ah2', jws(ahenkTx({ environment: 'Sandbox' }), chain))).status, 400);
  assert.equal([...state.db.docs.keys()].filter((k) => k.startsWith('apple_')).length, 0);
  assert.equal((await ahenkEntitlement('ah2')).body.owned, false);
});

await test('AHENK: a second uid gets 409; the same uid again (restore) 200; Sandbox only with APPLE_ALLOW_SANDBOX=1', async () => {
  reset();
  const tx = ahenkTx();
  assert.equal((await ahenkLink('ah3', jws(tx, chain))).status, 200);
  const other = await ahenkLink('ah3other', jws(tx, chain));
  assert.equal(other.status, 409); assert.match(other.body.error, /another SubverseLab account/);
  assert.equal((await ahenkLink('ah3', jws(tx, chain))).status, 200);
  assert.equal(state.db.docs.get(`apple_purchases/${tx.originalTransactionId}`).uid, 'ah3');
  assert.equal((await ahenkEntitlement('ah3other')).body.owned, false);
  const sb = ahenkTx({ environment: 'Sandbox' });
  process.env.APPLE_ALLOW_SANDBOX = '1';
  try { assert.equal((await ahenkLink('ah3sb', jws(sb, chain))).status, 200); assert.equal((await ahenkEntitlement('ah3sb')).body.via, 'appstore'); }
  finally { delete process.env.APPLE_ALLOW_SANDBOX; }
  assert.equal((await ahenkEntitlement('ah3sb')).body.owned, false, 'a Sandbox purchase stops counting when the flag goes');
});

await test('AHENK desktop sign-in for an App Store buyer: approve ok, poll gives an owned grant, refresh ok; not owned before the purchase', async () => {
  reset();
  const before = await desktopSignIn('ah4');
  assert.equal(before.approve.status, 200); assert.equal(before.approve.body.ok, false); assert.equal(before.approve.body.error, 'not owned');
  assert.deepEqual(before.poll.body, { status: 'pending' });
  const tx = ahenkTx();
  assert.equal((await ahenkLink('ah4', jws(tx, chain))).status, 200);
  const after = await desktopSignIn('ah4');
  assert.deepEqual(after.approve.body, { ok: true, product: 'ahenk', name: 'Studio Mac' });
  assert.equal(after.poll.body.status, 'approved');
  const payload = JSON.parse(after.poll.body.grant.payload);
  assert.equal(payload.kind, 'owned'); assert.equal(payload.product, 'ahenk'); assert.equal(payload.uid, 'ah4'); assert.equal(payload.machine, MACHINE);
  const r = await refresh(after.poll.body.grant);
  assert.equal(r.status, 200); assert.equal(r.body.ok, true); assert.equal(JSON.parse(r.body.grant.payload).uid, 'ah4');
});

await test('AHENK refund through a notification: entitlement false, grant refresh "not owned", new desktop sign-in refused; REFUND_REVERSED reopens', async () => {
  reset();
  const tx = ahenkTx();
  assert.equal((await ahenkLink('ah5', jws(tx, chain))).status, 200);
  const { poll } = await desktopSignIn('ah5');
  const grant = poll.body.grant;
  assert.equal((await refresh(grant)).body.ok, true);
  const refund = await notify(ahenkNotification('REFUND', tx));
  assert.equal(refund.status, 200); assert.equal(refund.body.result, 'revoked');
  assert.equal(state.db.docs.get(`apple_purchases/${tx.originalTransactionId}`).revoked, true);
  assert.deepEqual((await ahenkEntitlement('ah5')).body, { owned: false, via: null });
  assert.deepEqual((await refresh(grant)).body, { ok: false, error: 'not owned' });
  assert.equal((await desktopSignIn('ah5')).approve.body.error, 'not owned');
  assert.equal((await ahenkLink('ah5', jws(tx, chain))).status, 403);
  assert.equal((await notify(ahenkNotification('REFUND_REVERSED', tx))).body.result, 'restored');
  assert.equal((await refresh(grant)).body.ok, true);
  assert.equal((await notify(ahenkNotification('REVOKE', tx))).body.result, 'revoked');
  assert.equal((await ahenkEntitlement('ah5')).body.owned, false);
});

await test('AHENK notifications: the trial item and a RU-8 transaction inside an AHENK notification are ignored; a RU-8 refund leaves AHENK alone', async () => {
  reset();
  const tx = ahenkTx();
  const ru = txPayload();
  assert.equal((await ahenkLink('ah6', jws(tx, chain))).status, 200);
  assert.equal((await link('ah6', jws(ru, chain))).status, 200);
  const trial = ahenkTx({ productId: 'com.subverselab.ahenk.trial30' });
  assert.equal((await notify(ahenkNotification('REFUND', trial))).body.result, 'ignored:other-product');
  assert.equal((await notify(ahenkNotification('REFUND', ru))).body.result, 'ignored:other-product');
  assert.equal((await notify(notification('REFUND', ru))).body.result, 'revoked');
  assert.deepEqual((await ahenkEntitlement('ah6')).body, { owned: true, via: 'appstore' });
  assert.equal((await entitlement('ah6')).body.owned, false);
  assert.equal(state.db.docs.has(`apple_purchases/${trial.originalTransactionId}`), false);
});

await test('AHENK account deletion: the purchase loses the uid, the grant stops refreshing, a new account may link it again', async () => {
  reset();
  const tx = ahenkTx();
  assert.equal((await ahenkLink('ah7', jws(tx, chain))).status, 200);
  const { poll } = await desktopSignIn('ah7');
  const del = await call('/api/account/delete', { token: 'valid-ah7', body: { confirm: 'DELETE' } });
  assert.equal(del.status, 200, JSON.stringify(del.body));
  const p = state.db.docs.get(`apple_purchases/${tx.originalTransactionId}`);
  assert.equal(p.uid, null); assert.equal(p.productId, 'com.subverselab.ahenk.full');
  assert.equal(state.db.docs.has('apple_by_uid/ah7'), false);
  assert.deepEqual((await refresh(poll.body.grant)).body, { ok: false, error: 'not owned' });
  assert.equal((await ahenkLink('ah7new', jws(tx, chain))).status, 200);
  assert.deepEqual((await ahenkEntitlement('ah7new')).body, { owned: true, via: 'appstore' });
});

await test('AHENK iPad sign-in carries the App Store purchase: device/apple attaches it, approve links it to the account and succeeds; desktop then signs in', async () => {
  reset();
  const tx = ahenkTx();
  const start = await call('/api/device/start', { body: { product: 'ahenk', machine: MACHINE, name: 'iPad', platform: 'ios' } });
  assert.equal(start.status, 200);
  assert.equal(state.db.docs.get(`device_codes/${start.body.device_code}`).platform, 'ios');
  const att = await call('/api/device/apple', { body: { device_code: start.body.device_code, jws: jws(tx, chain) } });
  assert.equal(att.status, 200, JSON.stringify(att.body)); assert.deepEqual(att.body, { ok: true });
  assert.equal(state.db.docs.get(`device_codes/${start.body.device_code}`).apple.originalTransactionId, tx.originalTransactionId);
  const look = await call('/api/device/lookup', { token: 'valid-ah8', body: { user_code: start.body.user_code } });
  assert.equal(look.body.device, 'ios');
  const ok = await call('/api/device/approve', { token: 'valid-ah8', body: { user_code: start.body.user_code } });
  assert.deepEqual(ok.body, { ok: true, product: 'ahenk', name: 'iPad' });
  assert.equal(state.db.docs.get(`apple_purchases/${tx.originalTransactionId}`).uid, 'ah8');
  const poll = await call('/api/device/poll', { body: { device_code: start.body.device_code } });
  assert.equal(poll.body.status, 'approved'); assert.equal(JSON.parse(poll.body.grant.payload).uid, 'ah8');
  // the same account on the Mac: owned through the App Store purchase
  assert.deepEqual((await desktopSignIn('ah8')).approve.body, { ok: true, product: 'ahenk', name: 'Studio Mac' });
});

await test('device/apple: a second account approving a code that carries a linked purchase gets "linked elsewhere"; iOS "not owned" has no buy link; refused inputs', async () => {
  reset();
  const tx = ahenkTx();
  assert.equal((await ahenkLink('ah9', jws(tx, chain))).status, 200);
  const start = await call('/api/device/start', { body: { product: 'ahenk', machine: MACHINE, name: 'iPad', platform: 'ios' } });
  assert.equal((await call('/api/device/apple', { body: { device_code: start.body.device_code, jws: jws(tx, chain) } })).status, 200);
  const other = await call('/api/device/approve', { token: 'valid-ah9other', body: { user_code: start.body.user_code } });
  assert.deepEqual(other.body, { ok: false, error: 'linked elsewhere' });
  assert.equal(state.db.docs.get(`apple_purchases/${tx.originalTransactionId}`).uid, 'ah9');
  // an iOS code without a purchase, for an account that owns nothing: no buy_url
  const s2 = await call('/api/device/start', { body: { product: 'ahenk', machine: MACHINE, name: 'iPad', platform: 'ios' } });
  assert.deepEqual((await call('/api/device/approve', { token: 'valid-ah9none', body: { user_code: s2.body.user_code } })).body, { ok: false, error: 'not owned' });
  // a desktop code keeps its buy_url
  const s3 = await call('/api/device/start', { body: { product: 'ahenk', machine: MACHINE, name: 'Mac' } });
  assert.equal((await call('/api/device/approve', { token: 'valid-ah9none', body: { user_code: s3.body.user_code } })).body.buy_url, 'https://subverselab.com/plugins/ahenk');
  const dc = s2.body.device_code;
  assert.equal((await call('/api/device/apple', { body: { device_code: dc, jws: jws(ahenkTx({ productId: 'com.subverselab.ahenk.trial30' }), chain) } })).status, 400, 'the trial item');
  assert.equal((await call('/api/device/apple', { body: { device_code: dc, jws: jws(ahenkTx({ revocationDate: Date.now() }), chain) } })).status, 403, 'refunded');
  assert.equal((await call('/api/device/apple', { body: { device_code: dc, jws: jws(ahenkTx({ environment: 'Sandbox' }), chain) } })).status, 400, 'Sandbox');
  assert.equal((await call('/api/device/apple', { body: { device_code: dc, jws: 'garbage' } })).status, 400, 'garbage');
  assert.equal((await call('/api/device/apple', { body: { device_code: 'f'.repeat(48), jws: jws(ahenkTx(), chain) } })).status, 404, 'unknown code');
  assert.equal((await call('/api/device/apple', { body: { device_code: dc, jws: jws(txPayload(), chain) } })).status, 400, 'a RU-8 purchase on an AHENK code');
  assert.equal(state.db.docs.get(`device_codes/${dc}`).apple, undefined);
});

await test('both apps have both routes; no AHENK token -> 401', async () => {
  for (const slug of ['ru8', 'ahenk']) {
    assert.ok(routeHandlers.has(`/api/${slug}/ios/entitlement`)); assert.ok(routeHandlers.has(`/api/${slug}/ios/apple-purchase`));
  }
  assert.equal((await call('/api/ahenk/ios/entitlement')).status, 401);
  assert.equal((await call('/api/ahenk/ios/apple-purchase', { body: { jws: 'x' } })).status, 401);
});

const failed = results.filter((r) => !r.ok);
console.log(`SUMMARY ${results.length} cases, ${failed.length} fail`);
process.exitCode = failed.length ? 1 : 0;
