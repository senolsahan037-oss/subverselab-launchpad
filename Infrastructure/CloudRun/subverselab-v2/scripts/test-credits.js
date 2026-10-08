// Local-only tests for the tool-credit ledger (credits.js + its routes and the webhook grant/refund).
// Stubbed Firestore / Firebase auth / Google OIDC; no network, no credentials, no deploy.
// Run: node scripts/test-credits.js
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { PassThrough } from 'node:stream';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
function merge(a, b) {
  const out = { ...(a || {}) };
  for (const [k, v] of Object.entries(b)) out[k] = v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' ? merge(out[k], v) : clone(v);
  return out;
}

// Firestore-shaped fake: documents, equality + orderBy + limit queries, serial transactions with get/set/delete.
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
  function query(name, filters = [], order = null, max = Infinity) {
    const run = () => {
      let paths = list(name).filter((p) => filters.every(([f, v]) => docs.get(p)?.[f] === v));
      if (order) paths = paths.sort((x, y) => String(docs.get(y)[order]).localeCompare(String(docs.get(x)[order])));
      return toSnap(paths.slice(0, max));
    };
    return {
      where: (f, op, v) => query(name, [...filters, [f, v]], order, max),
      orderBy: (f) => query(name, filters, f, max),
      limit: (n) => query(name, filters, order, n),
      get: async () => run(),
    };
  }
  function collection(name) { return { doc: (id) => ref(`${name}/${id}`), ...query(name) }; }
  let queue = Promise.resolve();
  return {
    docs, collection,
    runTransaction(callback) {
      const run = queue.then(async () => {
        const writes = []; let wrote = false;
        const tx = {
          get: async (d) => { assert.ok(!wrote, 'transaction read after a write'); return snap(d.path); },
          set: (d, data, options) => { wrote = true; writes.push(() => d.set(data, options)); },
          delete: (d) => { wrote = true; writes.push(() => d.delete()); },
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

const state = { db: fakeFirestore(), tokens: {} };
state.auth = { verifyIdToken: async (token) => {
  const t = state.tokens[token.replace(/^valid-/, '')];
  if (!token.startsWith('valid-') || !t) throw new Error('invalid token');
  return clone(t);
} };
state.FieldValue = { serverTimestamp: () => '<server-time>' };
globalThis.__crTestApp = { initializeApp() {}, applicationDefault() {}, getApps: () => [] };
globalThis.__crTestFirestore = { getFirestore: () => state.db, FieldValue: state.FieldValue };
globalThis.__crTestAuth = { getAuth: () => state.auth };
globalThis.__crTestStorage = { Storage: class { constructor() { return {}; } } };
// Stand-in for Google's OIDC verification: 'oidc|<email>|<audience>|<email_verified>'. Like the real
// OAuth2Client.verifyIdToken it rejects a token minted for another audience.
const oidcCalls = [];
globalThis.__crTestOidc = async (token, audience) => {
  oidcCalls.push(audience);
  const [kind, email, aud, verified] = token.split('|');
  if (kind !== 'oidc') throw new Error('Wrong number of segments in token');
  if (aud !== audience) throw new Error(`Wrong recipient, payload audience != requiredAudience`);
  return { email, email_verified: verified !== 'false', aud };
};

const url = (f) => pathToFileURL(resolve(root, f)).href;
const transformed = (await readFile(resolve(root, 'server.js'), 'utf8'))
  .replace("import express from 'express';", `import express from '${pathToFileURL(require.resolve('express')).href}';`)
  .replace("import compression from 'compression';", `import compression from '${pathToFileURL(require.resolve('compression')).href}';`)
  .replace('const __dirname = dirname(fileURLToPath(import.meta.url));', `const __dirname = ${JSON.stringify(root)};`)
  .replace("from './launchLicence.js';", `from '${url('launchLicence.js')}';`)
  .replace("from './entitlements.js';", `from '${url('entitlements.js')}';`)
  .replace("from './accountDeletion.js';", `from '${url('accountDeletion.js')}';`)
  .replace("from './credits.js';", `from '${url('credits.js')}';`)
  .replace('createCreditsService({ getAdmin: adminFirestore })', 'createCreditsService({ getAdmin: adminFirestore, verifyOidc: globalThis.__crTestOidc })')
  .replace('const app = express();', 'export const app = express();')
  .replace("await import('firebase-admin/app')", 'await Promise.resolve(globalThis.__crTestApp)')
  .replace("await import('firebase-admin/firestore')", 'await Promise.resolve(globalThis.__crTestFirestore)')
  .replace("await import('firebase-admin/auth')", 'await Promise.resolve(globalThis.__crTestAuth)')
  .replace("import('@google-cloud/storage')", 'Promise.resolve(globalThis.__crTestStorage)')
  .replace(/const PORT = process\.env\.PORT \|\| 8080;[\s\S]*?\n\);\s*$/, '');
assert.ok(transformed.includes('__crTestOidc'), 'server.js no longer builds the credits service the way this test expects');
const server = await import(`data:text/javascript;base64,${Buffer.from(transformed).toString('base64')}`);
const { orderAmount } = await import(url('credits.js'));
const WH_SECRET = 'credits-test-webhook-secret';
process.env.LEMONSQUEEZY_WEBHOOK_SECRET = WH_SECRET;
process.env.LS_FAMILY_PRODUCT_ID = '7777';
delete process.env.CREDITS_ALLOWED_CALLERS;
delete process.env.CREDITS_AUDIENCE;

const routeHandlers = new Map(server.app.router.stack.filter((l) => l.route).map((l) => [`${Object.keys(l.route.methods)[0]} ${l.route.path}`, l.route.stack.at(-1).handle]));
class FakeResponse extends PassThrough {
  constructor() { super(); this.statusCode = 200; this.headers = {}; this.body = undefined; }
  setHeader(n, v) { this.headers[n.toLowerCase()] = v; }
  status(c) { this.statusCode = c; return this; }
  type() { return this; }
  json(b) { this.body = b; this.end(); return this; }
  send(b) { this.body = b; this.end(b); return this; }
}
let ip = 0;
async function call(method, path, { token, body, raw, headers = {} } = {}) {
  const req = {
    path, query: {}, body: raw !== undefined ? raw : body || {}, ip: `10.8.${Math.floor(ip / 250)}.${ip++ % 250}`,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    get(n) { return this.headers[n.toLowerCase()]; },
  };
  const res = new FakeResponse();
  const handler = routeHandlers.get(`${method} ${path}`);
  assert.ok(handler, `route not found: ${method} ${path}`);
  await handler(req, res);
  return { status: res.statusCode, body: res.body };
}

const D = state.db.docs;
const login = (name, uid, email, extra = {}) => { state.tokens[name] = { uid, email, email_verified: true, firebase: { sign_in_provider: 'password' }, ...extra }; return `valid-${name}`; };
let seq = 0;
function order(email, { event = 'order_created', id, status = 'paid', product = 100, uid, total_usd, total, currency = 'USD', extra = {} } = {}) {
  const attributes = { user_email: email, status, created_at: '2026-10-05T10:00:00Z', first_order_item: { product_id: product, variant_id: 1 }, currency, ...extra };
  if (total_usd !== undefined) attributes.total_usd = total_usd;
  if (total !== undefined) attributes.total = total;
  return JSON.stringify({ meta: { event_name: event, ...(uid ? { custom_data: { uid } } : {}) }, data: { id: String(id ?? ++seq), attributes } });
}
const hook = (raw) => call('post', '/api/lemonsqueezy/webhook', { raw: Buffer.from(raw), headers: { 'x-signature': createHmac('sha256', WH_SECRET).update(raw).digest('hex') } });
const bal = async (uid) => D.get(`credits/${uid}`)?.balance;
const ledger = (uid) => [...D.entries()].filter(([p, v]) => p.startsWith('credit_ledger/') && v.uid === uid).map(([, v]) => v);
const caller = (aud = 'https://subverselab.com', email = 'splitter@proj.iam.gserviceaccount.com', verified = true) => `oidc|${email}|${aud}|${verified}`;
const enableApi = () => { process.env.CREDITS_ALLOWED_CALLERS = 'splitter@proj.iam.gserviceaccount.com, Visualizer@proj.iam.gserviceaccount.com'; };
const spend = (tool, jobId, userToken, token = caller()) => call('post', '/api/credits/spend', { token, body: { tool, jobId, userIdToken: userToken } });
const release = (tool, jobId, token = caller()) => call('post', '/api/credits/release', { token, body: { tool, jobId } });

const results = [];
async function test(name, fn) {
  try { D.clear(); Object.keys(state.tokens).forEach((k) => delete state.tokens[k]); await fn(); results.push(true); console.log(`PASS ${name}`); }
  catch (e) { results.push(false); console.log(`FAIL ${name}: ${e.message}`); }
}

await test('orderAmount: total_usd wins, USD total is the fallback, other currencies give nothing', async () => {
  assert.deepEqual(orderAmount({ total_usd: 1999, total: 1800, currency: 'eur' }), { amount_usd_cents: 1999, currency: 'EUR', total: 1800, credits: 1999 });
  assert.equal(orderAmount({ total: 900, currency: 'USD' }).credits, 900);
  assert.equal(orderAmount({ total: 900, currency: 'EUR' }).credits, 0);
  assert.equal(orderAmount({ total: 900, currency: 'EUR' }).amount_usd_cents, null);
  assert.equal(orderAmount({}).credits, 0);
  // tax-free (owner 2026-10-05): $19.99 + $4.00 VAT gives 1999 credits, not 2399
  assert.equal(orderAmount({ total_usd: 2399, tax_usd: 400, currency: 'EUR' }).credits, 1999);
  assert.equal(orderAmount({ total_usd: 2399, tax_usd: 400 }).amount_usd_cents, 1999);
  assert.equal(orderAmount({ total: 1080, tax: 180, currency: 'USD' }).credits, 900);
  assert.equal(orderAmount({ total_usd: 900, tax_usd: 0 }).credits, 900);
  assert.equal(orderAmount({ total_usd: 'x', total: 12.5, currency: 'USD' }).credits, 0);
});

await test('paid order grants floor(total_usd cents) credits to its uid and records the amount on the order', async () => {
  login('alice', 'alice', 'alice@example.com');
  const out = await hook(order('alice@example.com', { id: 500, uid: 'alice', total_usd: 1999, total: 1800, currency: 'EUR' }));
  assert.equal(out.status, 200);
  assert.equal(out.body.credits, 'granted');
  assert.deepEqual(D.get('credits/alice'), { balance: 1999, granted: 1999, spent: 0, updatedAt: D.get('credits/alice').updatedAt });
  const rec = D.get('plugin_licenses/alice@example.com').orders['500'];
  assert.equal(rec.amount_usd_cents, 1999); assert.equal(rec.currency, 'EUR'); assert.equal(rec.total, 1800);
  assert.equal(D.get('credit_ledger/purchase_500').reason, 'purchase');
});

await test('family order: amount also stored on the family purchase record, credits granted', async () => {
  const out = await hook(order('fam@example.com', { id: 501, uid: 'fam', product: 7777, total_usd: 1999 }));
  assert.equal(out.status, 200);
  assert.equal(D.get('launch2_purchases/fam@example.com').amountUsdCents, 1999);
  assert.equal(await bal('fam'), 1999);
});

await test('webhook re-delivery grants once', async () => {
  const raw = order('alice@example.com', { id: 502, uid: 'alice', total_usd: 900 });
  await hook(raw); const again = await hook(raw);
  assert.equal(again.body.credits, 'duplicate');
  assert.equal(await bal('alice'), 900);
  assert.equal(ledger('alice').length, 1);
});

await test('missing amount fields or a non-USD total grant nothing, answer 200 and are recorded as null', async () => {
  const warn = console.warn; const lines = []; console.warn = (m) => lines.push(m);
  try {
    const a = await hook(order('a@example.com', { id: 503, uid: 'alice' }));
    const b = await hook(order('a@example.com', { id: 504, uid: 'alice', total: 900, currency: 'EUR' }));
    assert.equal(a.status, 200); assert.equal(b.status, 200);
    assert.equal(a.body.credits, 'no-amount');
  } finally { console.warn = warn; }
  assert.equal(D.has('credits/alice'), false);
  assert.ok(lines.some((l) => /order 503 has no usable USD amount/.test(l)));
  assert.equal(D.get('plugin_licenses/a@example.com').orders['503'].amount_usd_cents, null);
});

await test('an unpaid order grants nothing', async () => {
  await hook(order('alice@example.com', { id: 505, uid: 'alice', status: 'pending', total_usd: 900 }));
  assert.equal(D.has('credits/alice'), false);
});

await test('refund removes the order credits, once', async () => {
  await hook(order('alice@example.com', { id: 510, uid: 'alice', total_usd: 1000 }));
  await hook(order('alice@example.com', { id: 511, uid: 'alice', total_usd: 500 }));
  const raw = order('alice@example.com', { event: 'order_refunded', id: 510, status: 'refunded', total_usd: 1000, extra: { refunded: true } });
  const out = await hook(raw);
  assert.equal(out.body.credits, 'removed');
  assert.equal(await bal('alice'), 500);
  assert.equal((await hook(raw)).body.credits, 'duplicate');
  assert.equal(await bal('alice'), 500);
  assert.equal(D.get('credits/alice').granted, 500);
});

await test('refund after some credits were spent: balance floors at 0, shortfall is on the ledger, the refund is not blocked', async () => {
  enableApi(); const tok = login('alice', 'alice', 'alice@example.com');
  await hook(order('alice@example.com', { id: 520, uid: 'alice', total_usd: 120 }));
  assert.equal((await spend('mixcheck', 'j1', tok)).body.balance, 20);
  const out = await hook(order('alice@example.com', { event: 'order_refunded', id: 520, status: 'refunded', total_usd: 120, extra: { refunded: true } }));
  assert.equal(out.status, 200);
  assert.equal(out.body.credits, 'removed');
  assert.equal(await bal('alice'), 0);
  const line = ledger('alice').find((l) => l.reason === 'refund');
  assert.equal(line.delta, -20); assert.equal(line.shortfall, 100);
  assert.equal(D.get('plugin_licenses/alice@example.com').orders['520'].refunded, true);
});

await test('partial refund removes the same share, and only the new part on a second event', async () => {
  await hook(order('alice@example.com', { id: 530, uid: 'alice', total_usd: 1000 }));
  const part = (usd) => order('alice@example.com', { event: 'order_refunded', id: 530, status: 'partial_refund', total_usd: 1000, extra: { refunded_amount_usd: usd } });
  await hook(part(250)); assert.equal(await bal('alice'), 750);
  await hook(part(250)); assert.equal(await bal('alice'), 750);
  await hook(part(500)); assert.equal(await bal('alice'), 500);
  const unknown = await hook(order('alice@example.com', { event: 'order_refunded', id: 530, status: 'partial_refund', total_usd: 1000 }));
  assert.equal(unknown.body.credits, 'partial-unknown'); assert.equal(await bal('alice'), 500);
});

await test('order without a uid is parked under the e-mail; a refund before the claim drops it', async () => {
  const out = await hook(order('guest@example.com', { id: 540, total_usd: 900 }));
  assert.equal(out.body.credits, 'pending');
  assert.equal(D.get('pending_credits/guest@example.com').orders['540'].credits, 900);
  assert.equal((await hook(order('guest@example.com', { id: 540, total_usd: 900 }))).body.credits, 'duplicate');
  await hook(order('guest@example.com', { id: 541, total_usd: 100 }));
  await hook(order('guest@example.com', { event: 'order_refunded', id: 540, status: 'refunded', total_usd: 900, extra: { refunded: true } }));
  assert.deepEqual(Object.keys(D.get('pending_credits/guest@example.com').orders), ['541']);
});

await test('parked credits are claimed by a VERIFIED account with that e-mail only, once', async () => {
  await hook(order('guest@example.com', { id: 550, total_usd: 900 }));
  const unverified = login('mal', 'mal', 'guest@example.com', { email_verified: false });
  const m = await call('get', '/api/credits/balance', { token: unverified });
  assert.equal(m.status, 200); assert.equal(m.body.balance, 0);
  assert.ok(D.has('pending_credits/guest@example.com'));
  const other = login('bob', 'bob', 'bob@example.com');
  assert.equal((await call('get', '/api/credits/balance', { token: other })).body.balance, 0);
  assert.ok(D.has('pending_credits/guest@example.com'));
  const owner = login('guest', 'guest', 'Guest@Example.com');
  const g = await call('get', '/api/credits/balance', { token: owner });
  assert.equal(g.body.balance, 900);
  assert.equal(D.has('pending_credits/guest@example.com'), false);
  assert.equal((await call('get', '/api/credits/balance', { token: owner })).body.balance, 900);
  assert.equal(ledger('guest').filter((l) => l.reason === 'purchase').length, 1);
});

await test('a Google account claims parked credits through /api/purchases/status too', async () => {
  await hook(order('g@example.com', { id: 560, total_usd: 300 }));
  const tok = login('google-g', 'google-g', 'g@example.com', { firebase: { sign_in_provider: 'google.com' }, email_verified: true });
  D.set('launch/counter', { claimed: 0, downloads: 0 });
  const out = await call('get', '/api/purchases/status', { token: tok });
  assert.equal(out.status, 200);
  assert.equal(await bal('google-g'), 300);
});

await test('GET /api/credits/balance: needs a sign-in, returns balance, fixed costs and the last 20 lines', async () => {
  assert.equal((await call('get', '/api/credits/balance')).status, 401);
  assert.equal((await call('get', '/api/credits/balance', { token: 'valid-nobody' })).status, 401);
  const tok = login('alice', 'alice', 'alice@example.com');
  D.set('credits/alice', { balance: 7, granted: 7, spent: 0 });
  for (let i = 0; i < 25; i += 1) D.set(`credit_ledger/x${i}`, { uid: 'alice', delta: 1, reason: 'admin', at: `2026-10-05T10:00:${String(i).padStart(2, '0')}Z` });
  D.set('credit_ledger/other', { uid: 'bob', delta: 99, reason: 'admin', at: '2026-10-05T11:00:00Z' });
  const out = await call('get', '/api/credits/balance', { token: tok });
  assert.equal(out.status, 200);
  assert.equal(out.body.balance, 7);
  assert.deepEqual(out.body.costs, { splitter: 50, visualizer: 50, mixcheck: 100 });
  assert.equal(out.body.recent.length, 20);
  assert.equal(out.body.recent[0].at, '2026-10-05T10:00:24Z');
  assert.ok(out.body.recent.every((l) => l.delta === 1 && !('uid' in l)));
});

await test('caller auth: disabled API 503, no token 401, bad token 401, wrong audience 401, unlisted caller 403, unverified caller 401', async () => {
  delete process.env.CREDITS_ALLOWED_CALLERS;
  const user = login('alice', 'alice', 'alice@example.com'); D.set('credits/alice', { balance: 500, granted: 500, spent: 0 });
  assert.equal((await spend('splitter', 'a1', user)).status, 503);
  assert.equal((await release('splitter', 'a1')).status, 503);
  enableApi();
  assert.equal((await call('post', '/api/credits/spend', { body: { tool: 'splitter', jobId: 'a1', userIdToken: user } })).status, 401);
  assert.equal((await spend('splitter', 'a1', user, 'garbage')).status, 401);
  assert.equal((await spend('splitter', 'a1', user, caller('https://evil.example'))).status, 401);
  assert.equal((await spend('splitter', 'a1', user, caller('https://subverselab.com', 'stranger@proj.iam.gserviceaccount.com'))).status, 403);
  assert.equal((await spend('splitter', 'a1', user, caller('https://subverselab.com', 'splitter@proj.iam.gserviceaccount.com', false))).status, 401);
  assert.equal((await release('splitter', 'a1', caller('https://subverselab.com', 'stranger@proj.iam.gserviceaccount.com'))).status, 403);
  assert.equal(await bal('alice'), 500);
  assert.ok(oidcCalls.every((a) => ['https://subverselab.com', 'https://evil.example'].includes(a)));
  // allow-list match is case-insensitive; CREDITS_AUDIENCE overrides the default
  assert.equal((await spend('splitter', 'a1', user, caller('https://subverselab.com', 'visualizer@proj.iam.gserviceaccount.com'))).status, 200);
  process.env.CREDITS_AUDIENCE = 'https://staging.example';
  assert.equal((await spend('splitter', 'a2', user)).status, 401);
  assert.equal((await spend('splitter', 'a2', user, caller('https://staging.example'))).status, 200);
  delete process.env.CREDITS_AUDIENCE;
});

await test('a browser (a Firebase ID token, no Google OIDC token) cannot spend or release', async () => {
  enableApi();
  const user = login('alice', 'alice', 'alice@example.com'); D.set('credits/alice', { balance: 500, granted: 500, spent: 0 });
  assert.equal((await spend('splitter', 'b1', user, user)).status, 401);
  assert.equal((await release('splitter', 'b1', user)).status, 401);
  assert.equal(await bal('alice'), 500);
});

await test('spend: ok debits the fixed cost, insufficient gives 402 without a debit, same jobId is charged once', async () => {
  enableApi();
  const user = login('alice', 'alice', 'alice@example.com'); D.set('credits/alice', { balance: 220, granted: 220, spent: 0 });
  const a = await spend('splitter', 'job-1', user);
  assert.equal(a.status, 200); assert.deepEqual(a.body, { ok: true, balance: 170, cost: 50 });
  const again = await spend('splitter', 'job-1', user);
  assert.equal(again.status, 200); assert.equal(again.body.balance, 170); assert.equal(again.body.duplicate, true);
  assert.equal((await spend('mixcheck', 'job-1', user)).body.balance, 70);
  assert.equal((await spend('visualizer', 'job-1', user)).body.balance, 20);
  const no = await spend('mixcheck', 'job-2', user);
  assert.equal(no.status, 402); assert.deepEqual(no.body, { ok: false, reason: 'insufficient', balance: 20, cost: 100 });
  assert.equal(await bal('alice'), 20);
  assert.equal(D.get('credits/alice').spent, 200);
  assert.equal(D.has('credit_ledger/spend_mixcheck_job-2'), false);
});

await test('spend: costs are fixed server-side, an amount or unknown tool from the caller is ignored or refused', async () => {
  enableApi();
  const user = login('alice', 'alice', 'alice@example.com'); D.set('credits/alice', { balance: 1000, granted: 1000, spent: 0 });
  const out = await call('post', '/api/credits/spend', { token: caller(), body: { tool: 'mixcheck', jobId: 'c1', userIdToken: user, cost: 1, amount: 1, price: 1 } });
  assert.equal(out.body.cost, 100); assert.equal(await bal('alice'), 900);
  for (const body of [{ tool: 'sensei', jobId: 'c2', userIdToken: user }, { tool: 'arrangementgps', jobId: 'c2', userIdToken: user }, { tool: '__proto__', jobId: 'c2', userIdToken: user }, { tool: 'splitter', jobId: '', userIdToken: user }, { tool: 'splitter', jobId: 'a/b', userIdToken: user }, { tool: 'splitter', userIdToken: user }]) {
    assert.equal((await call('post', '/api/credits/spend', { token: caller(), body })).status, 400);
  }
  assert.equal((await spend('splitter', 'c3', undefined)).status, 401);
  assert.equal((await spend('splitter', 'c3', 'valid-nobody')).status, 401);
  assert.equal(await bal('alice'), 900);
});

await test('spend: another account cannot reuse a jobId; no credits at all is insufficient', async () => {
  enableApi();
  const alice = login('alice', 'alice', 'alice@example.com'); const bob = login('bob', 'bob', 'bob@example.com');
  D.set('credits/alice', { balance: 100, granted: 100, spent: 0 });
  await spend('splitter', 'shared', alice);
  const clash = await spend('splitter', 'shared', bob);
  assert.equal(clash.status, 409); assert.equal(clash.body.reason, 'job-conflict');
  const none = await spend('splitter', 'n1', bob);
  assert.equal(none.status, 402); assert.equal(none.body.balance, 0);
  assert.equal(D.has('credits/bob'), false);
});

await test('release: refunds a spend exactly once; unknown job 404; a released job cannot be spent again', async () => {
  enableApi();
  const user = login('alice', 'alice', 'alice@example.com'); D.set('credits/alice', { balance: 200, granted: 200, spent: 0 });
  assert.equal((await release('splitter', 'r1')).status, 404);
  await spend('mixcheck', 'r1', user);
  assert.equal(await bal('alice'), 100);
  assert.equal((await release('splitter', 'r1')).status, 404);
  const first = await release('mixcheck', 'r1');
  assert.equal(first.status, 200); assert.deepEqual(first.body, { ok: true, released: true, balance: 200 });
  const second = await release('mixcheck', 'r1');
  assert.equal(second.status, 200); assert.equal(second.body.released, false); assert.equal(second.body.balance, 200);
  assert.equal(await bal('alice'), 200); assert.equal(D.get('credits/alice').spent, 0);
  const respend = await spend('mixcheck', 'r1', user);
  assert.equal(respend.status, 409); assert.equal(respend.body.reason, 'released');
  assert.equal(await bal('alice'), 200);
  assert.equal((await release('nope', 'r1')).status, 400);
  assert.equal(ledger('alice').filter((l) => l.reason === 'release').length, 1);
});

await test('concurrent spends of one job charge once; concurrent spends cannot overdraw', async () => {
  enableApi();
  const user = login('alice', 'alice', 'alice@example.com'); D.set('credits/alice', { balance: 100, granted: 100, spent: 0 });
  const same = await Promise.all([1, 2, 3].map(() => spend('splitter', 'same', user)));
  assert.equal(same.filter((r) => r.body.duplicate).length, 2); assert.equal(await bal('alice'), 50);
  const many = await Promise.all(['p1', 'p2', 'p3'].map((j) => spend('splitter', j, user)));
  assert.equal(many.filter((r) => r.status === 200).length, 1); assert.equal(await bal('alice'), 0);
});

await test('clients cannot write credit collections (rules text) and a user may read only their own balance', async () => {
  const rules = await readFile(resolve(root, 'firestore.rules'), 'utf8');
  assert.match(rules, /match \/credits\/\{uid\} \{\s*allow read: if request\.auth != null && request\.auth\.uid == uid;\s*allow write: if false;/);
  assert.match(rules, /match \/credit_ledger\/\{document=\*\*\} \{\s*allow read, write: if false;/);
  assert.match(rules, /match \/pending_credits\/\{document=\*\*\} \{\s*allow read, write: if false;/);
});

await test('account deletion removes credits/{uid}, its ledger and parked credits', async () => {
  const tok = login('alice', 'alice', 'alice@example.com', { auth_time: Math.floor(Date.now() / 1000) });
  state.auth.deleteUser = async () => {};
  await hook(order('alice@example.com', { id: 570, uid: 'alice', total_usd: 500 }));
  await hook(order('alice@example.com', { id: 571, total_usd: 100 }));
  const out = await call('post', '/api/account/delete', { token: tok, body: { confirm: 'DELETE' } });
  assert.equal(out.status, 200);
  assert.equal(D.has('credits/alice'), false); assert.equal(ledger('alice').length, 0); assert.equal(D.has('pending_credits/alice@example.com'), false);
});

const failed = results.filter((r) => !r).length;
console.log(`SUMMARY ${results.length} cases, ${failed} fail`);
process.exit(failed ? 1 : 0);
