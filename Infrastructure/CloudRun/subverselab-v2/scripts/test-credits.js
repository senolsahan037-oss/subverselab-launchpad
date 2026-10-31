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
}, getUserByEmail: async () => { throw Object.assign(new Error('no user'), { code: 'auth/user-not-found' }); } };
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
const transformed = (await readFile(resolve(root, 'api/server.js'), 'utf8'))
  .replace("import express from 'express';", `import express from '${pathToFileURL(require.resolve('express')).href}';`)
  .replace("import compression from 'compression';", `import compression from '${pathToFileURL(require.resolve('compression')).href}';`)
  .replace('const __dirname = dirname(fileURLToPath(import.meta.url));', `const __dirname = ${JSON.stringify(resolve(root, 'api'))};`)
  .replace("from './launchLicence.js';", `from '${url('api/launchLicence.js')}';`)
  .replace("from './entitlements.js';", `from '${url('api/entitlements.js')}';`)
  .replace("from './accountDeletion.js';", `from '${url('api/accountDeletion.js')}';`)
  .replace("from './credits.js';", `from '${url('api/credits.js')}';`)
  .replace("from './catalog.js';", `from '${url('api/catalog.js')}';`)
  .replace("from './catalogSchema.js';", `from '${url('api/catalogSchema.js')}';`)
  .replace("from './agents.js';", `from '${url('api/agents.js')}';`)
  .replace("from './inbox.js';", `from '${url('api/inbox.js')}';`)
  .replace("from './stats.js';", `from '${url('api/stats.js')}';`)
  .replace('createCreditsService({ getAdmin: adminFirestore })', 'createCreditsService({ getAdmin: adminFirestore, verifyOidc: globalThis.__crTestOidc })')
  .replace('const app = express();', 'export const app = express();')
  .replace("await import('firebase-admin/app')", 'await Promise.resolve(globalThis.__crTestApp)')
  .replace("await import('firebase-admin/firestore')", 'await Promise.resolve(globalThis.__crTestFirestore)')
  .replace("await import('firebase-admin/auth')", 'await Promise.resolve(globalThis.__crTestAuth)')
  .replace("import('@google-cloud/storage')", 'Promise.resolve(globalThis.__crTestStorage)')
  .replace(/const PORT = process\.env\.PORT \|\| 8080;[\s\S]*?\n\);\s*$/, '');
assert.ok(transformed.includes('__crTestOidc'), 'server.js no longer builds the credits service the way this test expects');
const server = await import(`data:text/javascript;base64,${Buffer.from(transformed).toString('base64')}`);
// No test touches DNS: every domain has a mail server.
(await import(pathToFileURL(resolve(root, 'api/entitlements.js')).href)).setMxResolver(async (domain) => [{ exchange: `mx.${domain}`, priority: 10 }]);
const { orderAmount, createCreditsService, TESTER_MONTHLY_CREDITS } = await import(url('api/credits.js'));
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

await test('parked credits are claimed by the account with that e-mail (proven or not, owner 2026-10-18), once; another e-mail gets nothing', async () => {
  await hook(order('guest@example.com', { id: 550, total_usd: 900 }));
  const other = login('bob', 'bob', 'bob@example.com');
  assert.equal((await call('get', '/api/credits/balance', { token: other })).body.balance, 0);
  assert.ok(D.has('pending_credits/guest@example.com'));
  const unverified = login('mal', 'mal', 'Guest@Example.com', { email_verified: false });
  const m = await call('get', '/api/credits/balance', { token: unverified });
  assert.equal(m.status, 200); assert.equal(m.body.balance, 900);
  assert.equal(D.has('pending_credits/guest@example.com'), false);
  assert.equal((await call('get', '/api/credits/balance', { token: unverified })).body.balance, 900);
  const second = login('guest', 'guest', 'guest@example.com');
  assert.equal((await call('get', '/api/credits/balance', { token: second })).body.balance, 0, 'a second account with the same e-mail gets nothing twice');
  assert.equal(ledger('mal').filter((l) => l.reason === 'purchase').length, 1);
});

await test('claimPending with orderIds moves only those orders; the rest stays parked', async () => {
  await hook(order('two@example.com', { id: 551, total_usd: 300 }));
  await hook(order('two@example.com', { id: 552, total_usd: 200 }));
  const svc = createCreditsService({ getAdmin: async () => ({ db: state.db }) });
  assert.deepEqual(await svc.claimPending({ uid: 'two-a', email: 'two@example.com', orderIds: ['551'] }), { claimed: 300 });
  assert.deepEqual(Object.keys(D.get('pending_credits/two@example.com').orders), ['552']);
  assert.deepEqual(await svc.claimPending({ uid: 'two-a', email: 'two@example.com', orderIds: ['551'] }), { claimed: 0 });
  assert.deepEqual(await svc.claimPending({ uid: 'two-a', email: 'two@example.com', orderIds: [] }), { claimed: 0 });
  assert.equal(await bal('two-a'), 300);
  assert.deepEqual(await svc.claimPending({ uid: 'two-a', email: 'two@example.com' }), { claimed: 200 });
  assert.equal(D.has('pending_credits/two@example.com'), false);
  assert.equal(await bal('two-a'), 500);
});

await test('a Google account claims parked credits through /api/purchases/status too', async () => {
  await hook(order('g@example.com', { id: 560, total_usd: 300 }));
  const tok = login('google-g', 'google-g', 'g@example.com', { firebase: { sign_in_provider: 'google.com' }, email_verified: true });
  D.set('launch/counter', { claimed: 0, downloads: 0 });
  const out = await call('get', '/api/purchases/status', { token: tok });
  assert.equal(out.status, 200);
  assert.equal(await bal('google-g'), 300);
});

await test('/api/purchases/status: a non-proven password account with the checkout e-mail collects parked credits (owner 2026-10-18)', async () => {
  await hook(order('park2@example.com', { id: 570, total_usd: 400 }));
  D.set('launch/counter', { claimed: 0, downloads: 0 });
  const np = login('np-park', 'np-park', 'park2@example.com', { email_verified: false });
  const out = await call('get', '/api/purchases/status', { token: np });
  assert.equal(out.status, 200); assert.equal(out.body.unverified, true);
  assert.equal(await bal('np-park'), 400);
  assert.equal(D.has('pending_credits/park2@example.com'), false);
});

await test('/api/orders/claim: the order number moves the parked credits of that order to the claiming account, whatever its e-mail', async () => {
  await hook(order('buyer@shop.test', { id: 580, total_usd: 1999, extra: { order_number: 4867700 } }));
  await hook(order('buyer@shop.test', { id: 581, total_usd: 500, extra: { order_number: 4867701 } }));
  const acct = login('claimer', 'claimer', 'someone-else@example.com', { email_verified: false });
  const wrong = await call('post', '/api/orders/claim', { token: acct, body: { orderNumber: '4867799', email: 'buyer@shop.test' } });
  assert.equal(wrong.status, 404); assert.equal((await bal('claimer')) || 0, 0);
  const ok = await call('post', '/api/orders/claim', { token: acct, body: { orderNumber: '#4867700', email: 'Buyer@Shop.test' } });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal(await bal('claimer'), 1999);
  assert.deepEqual(Object.keys(D.get('pending_credits/buyer@shop.test').orders), ['581'], 'the other order stays parked');
  assert.equal(ledger('claimer').filter((l) => l.reason === 'purchase' && l.via === 'pending').length, 1);
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
  assert.deepEqual(out.body.costs, { splitter: 50, visualizer: 50, mixcheck: 100, 'arrangement-gps': 25 });
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

// ---- Tester credits (Tester Agreement 4.5): 2,000 per calendar month, no carry-over, purchased credits intact -------
let clock = '2026-10-14T09:00:00.000Z';
const tsvc = createCreditsService({ getAdmin: async () => ({ db: state.db }), now: () => clock });
const setTester = (email, status = 'active') => D.set(`launch2_testers/${email}`, { email, ...(status ? { status } : {}), approvedAt: '2026-10-01T00:00:00Z' });
const testerLines = (uid) => ledger(uid).filter((l) => /^tester/.test(String(l.reason)) || l.reason === 'tester-grant' || l.reason === 'tester-expire');
const invariant = (uid) => { const c = D.get(`credits/${uid}`); assert.equal(c.balance, c.granted - c.spent, `balance = granted - spent for ${uid}`); };

await test('tester credits: the first spend of an active tester grants the month once (2,000) and spends from it', async () => {
  clock = '2026-10-14T09:00:00.000Z';
  setTester('t1@example.com');
  const out = await tsvc.spend({ uid: 't1', tool: 'splitter', jobId: 'a', testerEmail: 't1@example.com' });
  assert.deepEqual(out, { ok: true, status: 200, balance: 1950, cost: 50 });
  assert.equal(TESTER_MONTHLY_CREDITS, 2000);
  const grant = D.get('credit_ledger/tester_2026-10_t1');
  assert.deepEqual({ delta: grant.delta, reason: grant.reason, uid: grant.uid, month: grant.month }, { delta: 2000, reason: 'tester-grant', uid: 't1', month: '2026-10' });
  assert.deepEqual(D.get('credits/t1').tester, { month: '2026-10', remaining: 1950 });
  assert.deepEqual({ granted: D.get('credits/t1').granted, spent: D.get('credits/t1').spent }, { granted: 2000, spent: 50 });
  assert.equal(D.get('credit_ledger/spend_splitter_a').fromTester, 50);
  invariant('t1');
});

await test('tester credits: the same month never grants twice (spends, reads, a repeated job, a lost slice)', async () => {
  clock = '2026-10-14T09:00:00.000Z';
  setTester('t2@example.com');
  await tsvc.spend({ uid: 't2', tool: 'mixcheck', jobId: 'a', testerEmail: 't2@example.com' });
  await tsvc.spend({ uid: 't2', tool: 'mixcheck', jobId: 'b', testerEmail: 't2@example.com' });
  const dup = await tsvc.spend({ uid: 't2', tool: 'mixcheck', jobId: 'b', testerEmail: 't2@example.com' });
  assert.equal(dup.duplicate, true);
  const read = await tsvc.readBalance('t2', { testerEmail: 't2@example.com' });
  assert.equal(read.balance, 1800);
  assert.deepEqual(read.tester, { month: '2026-10', monthly: 2000, left: 1800 });
  assert.equal(testerLines('t2').filter((l) => l.reason === 'tester-grant').length, 1);
  // Even if the account's slice marker were lost, the ledger key stops a second grant for the month.
  D.set('credits/t2', { balance: 1800, granted: 2000, spent: 200, updatedAt: clock });
  await tsvc.spend({ uid: 't2', tool: 'splitter', jobId: 'c', testerEmail: 't2@example.com' });
  assert.equal(testerLines('t2').filter((l) => l.reason === 'tester-grant').length, 1);
  assert.equal(D.get('credits/t2').balance, 1750);
  assert.equal(D.get('credits/t2').tester.month, '2026-10');
  invariant('t2');
  // Concurrent first spends grant once.
  setTester('t2b@example.com');
  await Promise.all(['x', 'y', 'z'].map((j) => tsvc.spend({ uid: 't2b', tool: 'splitter', jobId: j, testerEmail: 't2b@example.com' })));
  assert.equal(testerLines('t2b').filter((l) => l.reason === 'tester-grant').length, 1);
  assert.equal(D.get('credits/t2b').balance, 1850);
  invariant('t2b');
});

await test('tester credits: next month the unused rest expires and a new 2,000 is granted; nothing carries over', async () => {
  clock = '2026-10-20T09:00:00.000Z';
  setTester('t3@example.com');
  await tsvc.spend({ uid: 't3', tool: 'mixcheck', jobId: 'a', testerEmail: 't3@example.com' });
  assert.equal(D.get('credits/t3').balance, 1900);
  clock = '2026-11-02T09:00:00.000Z';
  const out = await tsvc.spend({ uid: 't3', tool: 'splitter', jobId: 'b', testerEmail: 't3@example.com' });
  assert.equal(out.balance, 1950, 'a full new month minus this spend: the 1,900 left over from October are gone');
  const exp = D.get('credit_ledger/tester_expire_2026-10_t3');
  assert.deepEqual({ delta: exp.delta, reason: exp.reason }, { delta: -1900, reason: 'tester-expire' });
  assert.equal(D.get('credit_ledger/tester_2026-11_t3').delta, 2000);
  assert.deepEqual(D.get('credits/t3').tester, { month: '2026-11', remaining: 1950 });
  invariant('t3');
  // A read in the next month alone does the same housekeeping, once.
  clock = '2026-12-01T00:00:00.000Z';
  const read = await tsvc.readBalance('t3', { testerEmail: 't3@example.com' });
  assert.equal(read.balance, 2000);
  assert.deepEqual(read.tester, { month: '2026-12', monthly: 2000, left: 2000 });
  await tsvc.readBalance('t3', { testerEmail: 't3@example.com' });
  assert.equal(testerLines('t3').length, 5, 'grant Oct, grant Nov, expire Oct, expire Nov, grant Dec');
  invariant('t3');
  // A year boundary: December to January.
  clock = '2027-01-01T00:00:00.000Z';
  assert.equal((await tsvc.readBalance('t3', { testerEmail: 't3@example.com' })).balance, 2000);
  assert.ok(D.get('credit_ledger/tester_expire_2026-12_t3'));
  invariant('t3');
});

await test('tester credits: credits bought with orders are never touched (spent last, kept at rollover, kept by a refund of tester credits)', async () => {
  clock = '2026-10-14T09:00:00.000Z';
  setTester('t4@example.com');
  assert.equal((await tsvc.grantOrder({ email: 't4@example.com', uid: 't4', orderId: 'P1', credits: 500 })).result, 'granted');
  await tsvc.spend({ uid: 't4', tool: 'mixcheck', jobId: 'a', testerEmail: 't4@example.com' });
  // 2,500 total, 100 spent from the tester slice: 1,900 tester + 500 purchased.
  assert.deepEqual({ b: D.get('credits/t4').balance, t: D.get('credits/t4').tester.remaining }, { b: 2400, t: 1900 });
  invariant('t4');
  // Tester credits used up: the purchased ones are spent next (a 30-credit slice left, 50-credit job).
  D.set('credits/t4', { ...D.get('credits/t4'), balance: 530, granted: 2530, spent: 2000, tester: { month: '2026-10', remaining: 30 } });
  const out = await tsvc.spend({ uid: 't4', tool: 'splitter', jobId: 'b', testerEmail: 't4@example.com' });
  assert.equal(out.balance, 480);
  assert.deepEqual(D.get('credits/t4').tester, { month: '2026-10', remaining: 0 });
  assert.equal(D.get('credit_ledger/spend_splitter_b').fromTester, 30);
  // A full refund of the order removes only purchased credits, never the tester slice (no tester credits left here: 480 purchased).
  D.set('credits/t4', { ...D.get('credits/t4'), balance: 700, granted: 2730, spent: 2030, tester: { month: '2026-10', remaining: 200 } });
  const refund = await tsvc.refundOrder({ email: 't4@example.com', orderId: 'P1', full: true });
  assert.equal(refund.removed, 500, 'exactly the purchased 500 (700 - 200 tester)');
  assert.equal(D.get('credits/t4').tester.remaining, 200);
  assert.equal(D.get('credits/t4').balance, 200);
  invariant('t4');
  // Rollover keeps purchased credits: 300 purchased + 100 unused tester credits -> 300 + 2,000.
  D.set('credits/t5', { balance: 400, granted: 2300, spent: 1900, tester: { month: '2026-10', remaining: 100 } });
  setTester('t5@example.com');
  clock = '2026-11-03T00:00:00.000Z';
  const read = await tsvc.readBalance('t5', { testerEmail: 't5@example.com' });
  assert.equal(read.balance, 2300, '300 purchased + the new 2,000');
  assert.equal(D.get('credit_ledger/tester_expire_2026-10_t5').delta, -100);
  invariant('t5');
  // And once the tester ends, only the purchased 300 remain.
  setTester('t5@example.com', 'ended');
  assert.equal((await tsvc.readBalance('t5', { testerEmail: 't5@example.com' })).balance, 300);
  invariant('t5');
});

await test('tester credits: release gives the tester part back in the same month, and drops it when the month has rolled over', async () => {
  clock = '2026-10-14T09:00:00.000Z';
  setTester('t6@example.com');
  await tsvc.spend({ uid: 't6', tool: 'mixcheck', jobId: 'a', testerEmail: 't6@example.com' });
  assert.equal(D.get('credits/t6').tester.remaining, 1900);
  const rel = await tsvc.release({ tool: 'mixcheck', jobId: 'a' });
  assert.equal(rel.balance, 2000);
  assert.deepEqual(D.get('credits/t6').tester, { month: '2026-10', remaining: 2000 });
  invariant('t6');
  // A job spent in October from the tester slice, released in November after the rollover: the credits are gone like the rest.
  await tsvc.spend({ uid: 't6', tool: 'mixcheck', jobId: 'b', testerEmail: 't6@example.com' });
  clock = '2026-11-02T09:00:00.000Z';
  await tsvc.readBalance('t6', { testerEmail: 't6@example.com' });
  assert.equal(D.get('credits/t6').balance, 2000);
  const late = await tsvc.release({ tool: 'mixcheck', jobId: 'b' });
  assert.equal(late.balance, 2000, 'nothing returns: those credits had expired');
  assert.deepEqual(D.get('credits/t6').tester, { month: '2026-11', remaining: 2000 });
  invariant('t6');
  // A purchased-credit job releases fully, as before.
  D.set('credits/t7', { balance: 100, granted: 100, spent: 0 });
  await tsvc.spend({ uid: 't7', tool: 'splitter', jobId: 'p', testerEmail: null });
  assert.equal((await tsvc.release({ tool: 'splitter', jobId: 'p' })).balance, 100);
  invariant('t7');
});

await test('tester credits: ended, revoked, unknown and unproven accounts get nothing; an ended tester loses the unused rest', async () => {
  clock = '2026-10-14T09:00:00.000Z';
  setTester('e1@example.com', 'ended');
  const ended = await tsvc.spend({ uid: 'e1', tool: 'splitter', jobId: 'a', testerEmail: 'e1@example.com' });
  assert.deepEqual([ended.ok, ended.status, ended.balance], [false, 402, 0]);
  setTester('e2@example.com', 'revoked');
  assert.equal((await tsvc.spend({ uid: 'e2', tool: 'splitter', jobId: 'a', testerEmail: 'e2@example.com' })).status, 402);
  assert.equal((await tsvc.spend({ uid: 'e3', tool: 'splitter', jobId: 'a', testerEmail: 'nobody@example.com' })).status, 402, 'no tester record');
  setTester('e4@example.com');
  assert.equal((await tsvc.spend({ uid: 'e4', tool: 'splitter', jobId: 'a', testerEmail: null })).status, 402, 'an account whose e-mail is not proven gets no grant');
  assert.equal((await tsvc.readBalance('e1', { testerEmail: 'e1@example.com' })).tester, null);
  for (const uid of ['e1', 'e2', 'e3', 'e4']) assert.equal(testerLines(uid).length, 0, `no ledger line for ${uid}`);
  assert.equal(D.has('credits/e1'), false, 'nothing is even created for them');
  // An active tester who is then ended loses what was left of the month at the next spend / read.
  setTester('e5@example.com');
  await tsvc.spend({ uid: 'e5', tool: 'splitter', jobId: 'a', testerEmail: 'e5@example.com' });
  setTester('e5@example.com', 'ended');
  const after = await tsvc.spend({ uid: 'e5', tool: 'splitter', jobId: 'b', testerEmail: 'e5@example.com' });
  assert.deepEqual([after.status, after.balance], [402, 0]);
  assert.equal(D.get('credit_ledger/tester_expire_2026-10_e5').delta, -1950);
  invariant('e5');
  // Re-activated in the same month: the month is not granted again.
  setTester('e5@example.com', 'active');
  assert.equal((await tsvc.spend({ uid: 'e5', tool: 'splitter', jobId: 'c', testerEmail: 'e5@example.com' })).status, 402);
  assert.equal(testerLines('e5').filter((l) => l.reason === 'tester-grant').length, 1);
  // A legacy tester record without a status counts as active.
  setTester('e6@example.com', null);
  assert.equal((await tsvc.spend({ uid: 'e6', tool: 'splitter', jobId: 'f6', testerEmail: 'e6@example.com' })).balance, 1950);
});

await test('tester credits over HTTP: balance and spend routes grant for the active tester\'s own account only (no verified e-mail needed); the cost list is unchanged', async () => {
  enableApi();
  const month = new Date().toISOString().slice(0, 7);
  D.set('launch2_testers/ht1@example.com', { email: 'ht1@example.com', status: 'active' });
  D.set('launch2_testers/ht2@example.com', { email: 'ht2@example.com', status: 'active' });
  const proven = login('ht1', 'ht1', 'ht1@example.com');
  const bal1 = await call('get', '/api/credits/balance', { token: proven });
  assert.equal(bal1.status, 200);
  assert.equal(bal1.body.balance, 2000);
  assert.deepEqual(bal1.body.tester, { month, monthly: 2000, left: 2000 });
  assert.deepEqual(bal1.body.costs, { splitter: 50, visualizer: 50, mixcheck: 100, 'arrangement-gps': 25 });
  const sp = await spend('mixcheck', 'job1', proven);
  assert.deepEqual([sp.status, sp.body.balance], [200, 1900]);
  assert.equal((await call('get', '/api/credits/balance', { token: proven })).body.tester.left, 1900);
  assert.equal([...D.keys()].filter((k) => k.startsWith('credit_ledger/tester_')).length, 1);
  // Owner 2026-10-14: no verified e-mail is needed. The record belongs to the uid that applied (copied on approval): an
  // unverified password account gets the grant, a second account with the same e-mail gets nothing.
  // Security audit 2026-10-17 F4: an UNBOUND record is not taken by an unproven account by itself (the admin binds it).
  const unproven = login('ht2', 'ht2', 'ht2@example.com', { email_verified: false });
  const bal0 = await call('get', '/api/credits/balance', { token: unproven });
  assert.deepEqual([bal0.body.balance, bal0.body.tester], [0, null], 'unbound record + unproven account: no grant');
  assert.equal(D.get('launch2_testers/ht2@example.com').uid, undefined);
  D.set('launch2_testers/ht2@example.com', { email: 'ht2@example.com', status: 'active', uid: 'ht2' });   // as approval writes it
  const bal2 = await call('get', '/api/credits/balance', { token: unproven });
  assert.deepEqual([bal2.body.balance, bal2.body.tester.left], [2000, 2000]);
  assert.equal(D.get('launch2_testers/ht2@example.com').uid, 'ht2');
  assert.equal((await spend('splitter', 'job2', unproven)).body.balance, 1950);
  const twin = login('ht2b', 'ht2b', 'ht2@example.com', { email_verified: true });
  const bal3 = await call('get', '/api/credits/balance', { token: twin });
  assert.deepEqual([bal3.body.balance, bal3.body.tester], [0, null]);
  assert.equal((await spend('splitter', 'job3', twin)).status, 402);
  // An ordinary account: no tester record, no grant, no transaction needed.
  const plain = login('pl1', 'pl1', 'pl1@example.com');
  assert.deepEqual((await call('get', '/api/credits/balance', { token: plain })).body.tester, null);
  assert.equal(D.has('credits/pl1'), false);
});

await test('firestore.rules: tester_builds is closed to every client', async () => {
  const rules = await readFile(resolve(root, 'firestore.rules'), 'utf8');
  assert.match(rules, /match \/tester_builds\/\{document=\*\*\} \{\s*allow read, write: if false;/);
  assert.match(rules, /match \/launch2_testers\/\{document=\*\*\} \{\s*allow read, write: if false;/);
});

const failed = results.filter((r) => !r).length;
console.log(`SUMMARY ${results.length} cases, ${failed} fail`);
process.exit(failed ? 1 : 0);
