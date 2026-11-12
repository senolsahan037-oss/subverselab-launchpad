// Local-only tests for store codes (api/redeem.js, POST /api/redeem in api/server.js, scripts/build-redeem-codes.js): a code
// adds its product to the account; the product then counts like a paid order for downloads, /account, the plug-in's browser
// sign-in (device approve) and grant refresh; single use, idempotent for the same account, dates, account deletion, limits.
// The flow cases run against a synthetic code table built with a test pepper (never the real one); the committed
// api/redeemCodes.json is checked for plain codes and against the stores' CSVs when they are on this Mac.
// No Google credentials, network or deploy.  Run: node scripts/test-redeem.js
import assert from 'node:assert/strict';
import { PassThrough, Readable } from 'node:stream';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const require = createRequire(import.meta.url);
const url = (f) => pathToFileURL(resolve(root, f)).href;

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

// ---- A synthetic code table (test pepper) -------------------------------------------------------------------------------
const redeem = await import(url('api/redeem.js'));
const PEPPER = 'test-pepper-not-the-real-one';
const ist = (day) => new Date(`${day}T00:00:00+03:00`).toISOString();
const CODES = {
  JF1: { code: 'LOOTJFTEST001', product: 'jingfang', store: 'Loot Audio', batch: 't', maxUses: 1 },
  JF2: { code: 'LOOTJFTEST002', product: 'jingfang', store: 'Loot Audio', batch: 't', maxUses: 1 },
  JF3: { code: 'LOOTJFTEST003', product: 'jingfang', store: 'Loot Audio', batch: 't', maxUses: 1 },
  JF4: { code: 'LOOTJFTEST004', product: 'jingfang', store: 'Loot Audio', batch: 't', maxUses: 1 },
  JF5: { code: 'LOOTJFTEST005', product: 'jingfang', store: 'Loot Audio', batch: 't', maxUses: 1 },
  EK1: { code: 'LOOTEKTEST001', product: 'elek', store: 'Loot Audio', batch: 't', maxUses: 1 },
  FM1: { code: 'LOOTFMTEST001', product: 'family', store: 'Loot Audio', batch: 't', maxUses: 1 },
  FM2: { code: 'LOOTFMTEST002', product: 'family', store: 'Loot Audio', batch: 't', maxUses: 1 },
  TEAM: { code: 'LOOTTEAMTEST01', product: 'jingfang', store: 'Loot Audio', batch: 'team', maxUses: 3 },
  TB1: { code: 'LOOTTBTEST001', product: 'taban', store: 'Loot Audio', batch: 't', maxUses: 1 },
  APD: { code: 'APDJFTEST01', product: 'jingfang', store: 'APD', batch: 'apd', maxUses: 1, validFrom: ist('2027-01-26'), validTo: ist('2027-02-12') },
  FUTURE: { code: 'APDFMFUTURE01', product: 'family', store: 'APD', batch: 'apd', maxUses: 1, validFrom: ist('2099-01-01') },
  PAST: { code: 'APDFMPAST001', product: 'family', store: 'APD', batch: 'apd', maxUses: 1, validTo: ist('2020-01-01') },
};
const table = { pepperCheck: redeem.pepperCheck(PEPPER), codes: {} };
for (const c of Object.values(CODES)) {
  const { code, ...entry } = c;
  table.codes[redeem.codeHash(code, PEPPER)] = entry;
}
const tmp = await mkdtemp(join(tmpdir(), 'svl-redeem-'));
const tablePath = join(tmp, 'redeemCodes.json');
await writeFile(tablePath, JSON.stringify(table));
process.env.REDEEM_CODES_PATH = tablePath;
process.env.REDEEM_CODE_PEPPER = PEPPER;

// ---- The API with fakes (the test-appstore.js harness) --------------------------------------------------------------------
const MANIFEST = Object.fromEntries(['jingfang', 'elek', 'kubbe', 'tutkal', 'taban'].map((slug) => [slug, { version: '1.0.0', files: {
  mac: { name: `${slug}-mac.pkg`, size: 7, object: `plugins/${slug}/1.0.0/${slug}-mac.pkg` },
  win: { name: `${slug}-win.zip`, size: 7, object: `plugins/${slug}/1.0.0/${slug}-win.zip` },
} }]));
const fakeStorage = { bucket: () => ({ file: (object) => ({
  download: async () => [Buffer.from(JSON.stringify(MANIFEST))],
  getMetadata: async () => [{ name: object, size: 7 }],
  createReadStream: () => Readable.from(['X']),
}) }) };
const state = { db: fakeFirestore(), deletedUsers: new Set() };
// valid-<uid>: a Google sign-in with <uid>@example.com. unv-*: a password account (not proven).
state.auth = {
  verifyIdToken: async (token) => {
    if (!token.startsWith('valid-')) throw new Error('invalid token');
    const uid = token.slice(6);
    return { uid, email: `${uid}@example.com`, email_verified: !uid.startsWith('unv-'), firebase: { sign_in_provider: uid.startsWith('unv-') ? 'password' : 'google.com' }, auth_time: Math.floor(Date.now() / 1000) };
  },
  deleteUser: async (uid) => { state.deletedUsers.add(uid); },
  getUser: async (uid) => {
    if (state.deletedUsers.has(uid)) { const e = new Error('no user'); e.code = 'auth/user-not-found'; throw e; }
    return { uid, email: `${uid}@example.com`, emailVerified: !uid.startsWith('unv-'), providerData: [] };
  },
};
globalThis.__redeemTestApp = { initializeApp() {}, applicationDefault() {}, getApps: () => [] };
globalThis.__redeemTestFirestore = { getFirestore: () => state.db, FieldValue: { serverTimestamp: () => '<server-time>' } };
globalThis.__redeemTestAuth = { getAuth: () => state.auth };
globalThis.__redeemTestStorage = { Storage: class { constructor() { return fakeStorage; } } };
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
  .replace("await import('firebase-admin/app')", 'await Promise.resolve(globalThis.__redeemTestApp)')
  .replace("await import('firebase-admin/firestore')", 'await Promise.resolve(globalThis.__redeemTestFirestore)')
  .replace("await import('firebase-admin/auth')", 'await Promise.resolve(globalThis.__redeemTestAuth)')
  .replace("import('@google-cloud/storage')", 'Promise.resolve(globalThis.__redeemTestStorage)')
  .replace(/const PORT = process\.env\.PORT \|\| 8080;[\s\S]*?\n\);\s*$/, '');
const server = await import(`data:text/javascript;base64,${Buffer.from(transformed).toString('base64')}`);
process.env.DOWNLOAD_TICKET_SECRET = 'redeem-test-secret';
{
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  process.env.GRANT_SIGNING_KEY = privateKey.export({ type: 'pkcs1', format: 'pem' });
}
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
async function call(path, { body, token, ip } = {}) {
  const u = new URL(path, 'http://local.test');
  const headers = { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) };
  const req = { path: u.pathname, query: Object.fromEntries(u.searchParams), body: body || {}, headers, ip: ip || `10.7.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`, get(n) { return this.headers[n.toLowerCase()]; } };
  const res = new FakeResponse();
  const handler = routeHandlers.get(u.pathname);
  assert.ok(handler, `route not found: ${u.pathname}`);
  const done = new Promise((r) => res.once('finish', r));
  await handler(req, res);
  if (!res.writableEnded) await done;
  return { status: res.statusCode, body: res.body };
}
const redeemAs = (uid, code, opts = {}) => call('/api/redeem', { token: `valid-${uid}`, body: { code }, ...opts });
const status = (uid) => call('/api/purchases/status', { token: `valid-${uid}` });
const ticket = (uid, slug, launchId, platform = 'mac') => call('/api/download/ticket', { token: `valid-${uid}`, body: { slug, platform, launchId } });
const MACHINE = 'svl-machine:0123456789abcdef0123456789abcdef';
async function desktopSignIn(uid, product = 'jingfang') {
  const start = await call('/api/device/start', { body: { product, machine: MACHINE, name: 'Studio Mac' } });
  assert.equal(start.status, 200, JSON.stringify(start.body));
  const approve = await call('/api/device/approve', { token: `valid-${uid}`, body: { user_code: start.body.user_code } });
  const poll = await call('/api/device/poll', { body: { device_code: start.body.device_code } });
  return { approve, poll };
}
const refresh = (grant) => call('/api/grant/refresh', { body: { grant } });
const admin = { db: state.db, auth: state.auth };
const hashOf = (k) => redeem.codeHash(CODES[k].code, PEPPER);

const results = [];
async function test(name, fn) {
  try { await fn(); results.push({ ok: true }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ ok: false }); console.log(`FAIL ${name}: ${error.message}`); if (process.env.TEST_STACK) console.log(error.stack); }
}
const reset = () => state.db.docs.clear();

await test('JING FANG code: 200 {ok, product, name}; stored hashed with the uid; listed on the account; solo ticket opens; ownedVia = code', async () => {
  reset();
  const r = await redeemAs('jf1', CODES.JF1.code);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body, { ok: true, product: 'jingfang', name: 'JING FANG' });
  const doc = state.db.docs.get(`redemptions/${hashOf('JF1')}`);
  assert.equal(doc.uses, 1); assert.equal(doc.maxUses, 1); assert.equal(doc.product, 'jingfang'); assert.equal(doc.store, 'Loot Audio');
  assert.equal(doc.by.jf1.email, 'jf1@example.com');
  assert.equal(state.db.docs.get('redeemed_by_uid/jf1').items[hashOf('JF1')].product, 'jingfang');
  assert.ok(![...state.db.docs.keys()].some((k) => k.includes(CODES.JF1.code)), 'no plain code in any document path');
  assert.ok(!JSON.stringify([...state.db.docs.values()]).includes(CODES.JF1.code), 'no plain code in any document');
  const s = await status('jf1');
  assert.equal(s.status, 200); assert.ok(s.body.owned.includes('jingfang')); assert.ok(!s.body.owned.includes('elek'));
  assert.equal((await ticket('jf1', 'jingfang', 'solo')).status, 200);
  assert.equal((await ticket('jf1', 'elek', 'solo')).status, 402);
  assert.equal(await entitlements.ownedVia(admin, { email: 'jf1@example.com', uid: 'jf1', proven: true }, 'jingfang'), 'code');
  assert.equal(await entitlements.ownedVia(admin, { email: 'jf1@example.com', uid: 'jf1', proven: true }, 'elek'), null);
});

await test('TABAN code (free plug-in, no licence key; owner 12 Nov 2026): added straight to the account, no checkout; its download opens', async () => {
  reset();
  const r = await redeemAs('tb1', CODES.TB1.code);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body, { ok: true, product: 'taban', name: 'TABAN' });
  assert.equal(state.db.docs.get(`redemptions/${hashOf('TB1')}`).uses, 1);
  const s = await status('tb1');
  assert.ok(s.body.owned.includes('taban'), JSON.stringify(s.body.owned)); assert.ok(!s.body.owned.includes('jingfang'));
  assert.equal(await entitlements.ownedVia(admin, { email: 'tb1@example.com', uid: 'tb1', proven: true }, 'taban'), 'code');
  assert.equal((await redeemAs('tb2', CODES.TB1.code)).status, 409, 'single use');
});

await test('ELEK code (licence-key product): not consumed here; 200 with the $0 checkout carrying the code; messy typing still matches; nothing owned yet', async () => {
  reset();
  const messy = `  ${CODES.EK1.code.toLowerCase().slice(0, 4)}-${CODES.EK1.code.toLowerCase().slice(4, 8)} ${CODES.EK1.code.toLowerCase().slice(8)} `;
  const r = await redeemAs('ek1', messy);
  assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.product, 'elek'); assert.equal(r.body.name, 'ELEK');
  assert.ok(r.body.checkout.startsWith(redeem.CHECKOUT_PRODUCTS.elek + '?'), r.body.checkout);
  assert.equal(new URL(r.body.checkout).searchParams.get('checkout[discount_code]'), CODES.EK1.code);
  assert.equal(state.db.docs.has(`redemptions/${hashOf('EK1')}`), false, 'Lemon Squeezy keeps the code single-use; nothing written here');
  assert.equal(state.db.docs.has('redeemed_by_uid/ek1'), false);
  assert.ok(!(await status('ek1')).body.owned.includes('elek'), 'owned only after the Lemon Squeezy order');
  assert.equal((await redeemAs('ek2', CODES.EK1.code)).status, 200, 'a second try gets the checkout again; LS refuses a used code there');
});

await test('family code (licence-key product): the family $0 checkout with the code; dates still apply (403 before / after)', async () => {
  reset();
  const r = await redeemAs('fm1', CODES.FM1.code);
  assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.product, 'family'); assert.equal(r.body.name, 'the Plugin Family');
  assert.equal(new URL(r.body.checkout).searchParams.get('checkout[discount_code]'), CODES.FM1.code);
  assert.ok(r.body.checkout.startsWith(redeem.CHECKOUT_PRODUCTS.family + '?'));
  assert.equal(state.db.docs.has(`redemptions/${hashOf('FM1')}`), false);
  assert.equal((await status('fm1')).body.standing === 'paid', false, 'no family access from the code itself');
});

await test('single use: a second account gets 409 "That code has already been used."; it stays the first account\'s', async () => {
  reset();
  assert.equal((await redeemAs('one', CODES.JF2.code)).status, 200);
  const r = await redeemAs('two', CODES.JF2.code);
  assert.equal(r.status, 409); assert.deepEqual(r.body, { error: 'That code has already been used.' });
  assert.equal(state.db.docs.get(`redemptions/${hashOf('JF2')}`).uses, 1);
  assert.deepEqual(Object.keys(state.db.docs.get(`redemptions/${hashOf('JF2')}`).by), ['one']);
  assert.equal(state.db.docs.has('redeemed_by_uid/two'), false);
  assert.equal((await ticket('two', 'jingfang', 'solo')).status, 402);
});

await test('the same account again is idempotent: 200 (already), uses stays 1', async () => {
  reset();
  assert.equal((await redeemAs('idem', CODES.JF3.code)).status, 200);
  const again = await redeemAs('idem', CODES.JF3.code);
  assert.equal(again.status, 200); assert.equal(again.body.ok, true); assert.equal(again.body.already, true); assert.equal(again.body.product, 'jingfang');
  assert.equal(state.db.docs.get(`redemptions/${hashOf('JF3')}`).uses, 1);
});

await test('team code: three accounts, then 409; each of the three keeps it, a repeat by one of them is not a use', async () => {
  reset();
  for (const uid of ['t1', 't2', 't3']) assert.equal((await redeemAs(uid, CODES.TEAM.code)).status, 200, uid);
  assert.equal((await redeemAs('t2', CODES.TEAM.code)).status, 200, 'repeat');
  assert.equal(state.db.docs.get(`redemptions/${hashOf('TEAM')}`).uses, 3);
  assert.equal((await redeemAs('t4', CODES.TEAM.code)).status, 409);
  for (const uid of ['t1', 't2', 't3']) assert.ok((await status(uid)).body.owned.includes('jingfang'));
});

await test('APD dates (Istanbul days, inclusive): 403 before 26 Jan 2027 and after 11 Feb 2027 naming the date; 200 on the first and last day', async () => {
  reset();
  const at = (iso) => () => iso;
  const go = (uid, iso) => redeem.redeemCode(state.db, { uid, email: `${uid}@x.com`, code: CODES.APD.code, table, pepper: PEPPER, now: at(iso) });
  const early = await go('apd0', '2027-01-25T20:59:59.000Z');   // 25 Jan 23:59:59 Istanbul
  assert.equal(early.status, 403); assert.equal(early.body.error, 'That code can be used from 26 January 2027.');
  assert.equal((await go('apd1', '2027-01-25T21:00:00.000Z')).status, 200, '26 Jan 00:00 Istanbul');
  reset();
  assert.equal((await go('apd2', '2027-02-12T20:59:59.000Z')).status, 403, '12 Feb 23:59 Istanbul');
  const late = await go('apd3', '2027-02-12T00:00:00.000Z');
  assert.equal(late.status, 403); assert.equal(late.body.error, 'That code expired on 11 February 2027.');
  assert.equal((await go('apd4', '2027-02-11T20:59:59.000Z')).status, 200, '11 Feb 23:59:59 Istanbul');
  assert.equal(state.db.docs.get(`redemptions/${hashOf('APD')}`).uses, 1, 'refused tries are not uses');
  // through the route (real clock): a code that starts in 2099 and one that ended in 2020
  const f = await redeemAs('dfut', CODES.FUTURE.code);
  assert.equal(f.status, 403); assert.match(f.body.error, /^That code can be used from 1 January 2099\.$/);
  const p = await redeemAs('dpast', CODES.PAST.code);
  assert.equal(p.status, 403); assert.match(p.body.error, /^That code expired on 31 December 2019\.$/);
  assert.equal(state.db.docs.has(`redemptions/${hashOf('FUTURE')}`), false);
});

await test('unknown, malformed, empty or oversized codes: 400 "That code is not valid."; nothing written; no token 401', async () => {
  reset();
  for (const code of ['LOOTJFNOPE999', 'abc', '', '<script>', 'LOOT JF ++ 1', 'A'.repeat(40), 12345678, null]) {
    const r = await redeemAs('bad', code);
    assert.equal(r.status, 400, `code ${String(code)}`); assert.deepEqual(r.body, { error: 'That code is not valid.' });
  }
  assert.equal(state.db.docs.size === 0 || ![...state.db.docs.keys()].some((k) => k.startsWith('redemptions/') || k.startsWith('redeemed_by_uid/')), true);
  assert.equal((await call('/api/redeem', { body: { code: CODES.JF4.code } })).status, 401);
  assert.equal((await call('/api/redeem', { token: 'nonsense', body: { code: CODES.JF4.code } })).status, 401);
});

await test('wrong or missing pepper: every code 503 (never "not valid"), nothing written', async () => {
  reset();
  const keep = process.env.REDEEM_CODE_PEPPER;
  try {
    process.env.REDEEM_CODE_PEPPER = 'another-pepper';
    assert.equal((await redeemAs('pep', CODES.JF4.code)).status, 503);
    delete process.env.REDEEM_CODE_PEPPER;
    assert.equal((await redeemAs('pep', CODES.JF4.code)).status, 503);
  } finally { process.env.REDEEM_CODE_PEPPER = keep; }
  assert.equal(state.db.docs.has(`redemptions/${hashOf('JF4')}`), false);
});

await test('unverified password account: may redeem (bound to the uid) and download; an address that cannot receive mail is refused (403) before a use', async () => {
  reset();
  const r = await redeemAs('unv-buyer', CODES.JF4.code);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.ok((await status('unv-buyer')).body.owned.includes('jingfang'));
  assert.equal((await ticket('unv-buyer', 'jingfang', 'solo')).status, 200);
  const old = entitlements.setMxResolver(async () => { const e = new Error('none'); e.code = 'ENOTFOUND'; throw e; });
  try {
    const n = await redeemAs('nomail', CODES.EK1.code);
    assert.equal(n.status, 403);
  } finally { entitlements.setMxResolver(old); }
  assert.equal(state.db.docs.has(`redemptions/${hashOf('EK1')}`), false);
});

await test('JING FANG browser sign-in: device approve refused before, ok after the code; poll grants owned; grant refresh ok', async () => {
  reset();
  const before = await desktopSignIn('dev1');
  assert.equal(before.approve.body.ok, false); assert.equal(before.approve.body.error, 'not owned');
  assert.equal((await redeemAs('dev1', CODES.JF5.code)).status, 200);
  const after = await desktopSignIn('dev1');
  assert.deepEqual(after.approve.body, { ok: true, product: 'jingfang', name: 'Studio Mac' });
  assert.equal(after.poll.body.status, 'approved');
  const payload = JSON.parse(after.poll.body.grant.payload);
  assert.equal(payload.kind, 'owned'); assert.equal(payload.product, 'jingfang'); assert.equal(payload.uid, 'dev1');
  const r = await refresh(after.poll.body.grant);
  assert.equal(r.status, 200); assert.equal(r.body.ok, true);
});

await test('account deletion: the index goes, the uid and e-mail leave the redemption, the code stays used (409 for a new account), the grant stops refreshing', async () => {
  reset();
    assert.equal((await redeemAs('del1', CODES.JF1.code)).status, 200);
  const { poll } = await desktopSignIn('del1');
  assert.equal(poll.body.status, 'approved');
  const del = await call('/api/account/delete', { token: 'valid-del1', body: { confirm: 'DELETE' } });
  assert.equal(del.status, 200, JSON.stringify(del.body));
  assert.equal(state.db.docs.has('redeemed_by_uid/del1'), false);
  for (const k of ['JF1']) {
    const d = state.db.docs.get(`redemptions/${hashOf(k)}`);
    assert.equal(d.uses, 1, `${k} stays used`); assert.deepEqual(d.by, {}, `${k}: uid removed`);
    assert.ok(!JSON.stringify(d).includes('del1@example.com'), 'no e-mail left');
  }
  assert.deepEqual((await refresh(poll.body.grant)).body, { ok: false, error: 'not owned' });
  assert.equal((await redeemAs('del1new', CODES.JF1.code)).status, 409);
  assert.equal(await entitlements.ownedVia(admin, { email: 'del1@example.com', uid: 'del1', proven: true }, 'jingfang'), null);
});

await test('rate limits: 10 a minute per address (11th 429) and per account across addresses', async () => {
  reset();
  for (let i = 0; i < 10; i += 1) assert.equal((await redeemAs(`rl-ip-${i}`, 'NOPE00000', { ip: '10.99.0.1' })).status, 400);
  assert.equal((await redeemAs('rl-ip-x', 'NOPE00000', { ip: '10.99.0.1' })).status, 429);
  for (let i = 0; i < 10; i += 1) assert.equal((await redeemAs('rl-uid', 'NOPE00000')).status, 400);
  assert.equal((await redeemAs('rl-uid', 'NOPE00000')).status, 429);
});

await test('route wiring: POST only, 2 KB body cap, collections closed in firestore.rules, Dockerfile ships redeem.js + redeemCodes.json', async () => {
  const layer = server.app.router.stack.find((l) => l.route?.path === '/api/redeem');
  assert.ok(layer?.route.methods.post);
  const src = await readFile(resolve(root, 'api/server.js'), 'utf8');
  assert.match(src, /const redeemBody = express\.json\(\{ limit: '2kb' \}\);/);
  const rules = await readFile(resolve(root, 'firestore.rules'), 'utf8');
  for (const c of ['redemptions', 'redeemed_by_uid']) assert.match(rules, new RegExp(`match /${c}/\\{document=\\*\\*\\} \\{\\s*allow read, write: if false;`));
  const docker = await readFile(resolve(root, 'api/Dockerfile'), 'utf8');
  assert.match(docker, /COPY [^\n]*\bredeem\.js\b[^\n]*\bredeemCodes\.json\b/);
});

// ---- The committed code file -----------------------------------------------------------------------------------------------
const committed = JSON.parse(await readFile(resolve(root, 'api/redeemCodes.json'), 'utf8'));
await test('api/redeemCodes.json: keys are 64-hex HMACs, every entry names a redeemable product, a pepper check, no code-shaped text anywhere', async () => {
  const keys = Object.keys(committed.codes);
  assert.ok(keys.length > 0);
  assert.ok(keys.every((k) => /^[0-9a-f]{64}$/.test(k)));
  assert.ok(Object.values(committed.codes).every((e) => e.product in redeem.REDEEM_PRODUCTS && Number(e.maxUses) >= 1));
  assert.match(committed.pepperCheck, /^[0-9a-f]{64}$/);
  const text = JSON.stringify(committed);
  assert.ok(!/\b(LOOT|APD|RKRD)[A-Z0-9]{5,}\b/.test(text), 'nothing that looks like a store code');
});

const desk = resolve(root, '../../../01_AI_Tools/instagram_2026-10/launch_desk');
if (existsSync(desk)) {
  const build = await import(url('scripts/build-redeem-codes.js'));
  await test('api/redeemCodes.json against the stores\' CSVs: no plain code and no plain SHA-256 of a code; same count per store and product', async () => {
    const plain = [];
    for (const src of build.SOURCES) for (const r of build.readRows(join(desk, src.file))) plain.push(r.code);
    for (const x of build.EXTRA) plain.push(x.code);
    const text = JSON.stringify(committed);
    for (const code of plain) {
      assert.ok(!text.includes(code), 'a plain code is in the file');
      assert.ok(!(createHash('sha256').update(code).digest('hex') in committed.codes), 'an unkeyed SHA-256 is in the file');
    }
    const { table: rebuilt, total } = build.buildTable({ desk, pepper: 'any-pepper' });
    assert.equal(Object.keys(committed.codes).length, total);
    assert.deepEqual(committed.counts, rebuilt.counts);
    assert.deepEqual(rebuilt.counts, {
      'APD / family': 501, 'APD / jingfang': 501, 'Loot Audio / alev': 501, 'Loot Audio / elek': 51, 'Loot Audio / family': 51, 'Loot Audio / jingfang': 551, 'Loot Audio / kiyma': 501, 'Loot Audio / taban': 501, 'Rekkerd / family': 1,
    });
  });
} else {
  console.log('SKIP the CSV comparison: the launch desk is not on this machine');
}

const failed = results.filter((r) => !r.ok);
console.log(`SUMMARY ${results.length} cases, ${failed.length} fail`);
process.exitCode = failed.length ? 1 : 0;
