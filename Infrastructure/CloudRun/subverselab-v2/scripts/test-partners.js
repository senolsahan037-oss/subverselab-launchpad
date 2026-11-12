// Local-only tests for affiliate partners (api/partners.js, the webhook hook in api/server.js, GET /api/partner-report,
// scripts/partner-cli.js). A fake Firestore and a fake Lemon Squeezy API; nothing touches the network or live data.
// Run: node scripts/test-partners.js
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { PassThrough } from 'node:stream';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const url = (f) => pathToFileURL(resolve(root, f)).href;
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
function merge(a, b) {
  const out = { ...(a || {}) };
  for (const [k, v] of Object.entries(b)) out[k] = v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' ? merge(out[k], v) : clone(v);
  return out;
}
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
  function query(name, filters = [], max = Infinity) {
    return {
      where: (f, op, v) => query(name, [...filters, [f, v]], max),
      orderBy: () => query(name, filters, max),
      limit: (n) => query(name, filters, n),
      get: async () => ({ docs: list(name).filter((p) => filters.every(([f, v]) => docs.get(p)?.[f] === v)).slice(0, max).map((p) => ({ ...snap(p), ref: ref(p) })) }),
    };
  }
  function collection(name) { return { doc: (id) => ref(`${name}/${id}`), ...query(name) }; }
  let queue = Promise.resolve();
  return {
    docs, collection,
    runTransaction(callback) {
      const run = queue.then(async () => {
        const writes = [];
        const tx = { get: async (d) => snap(d.path), set: (d, data, o) => writes.push(() => d.set(data, o)), delete: (d) => writes.push(() => d.delete()) };
        const result = await callback(tx);
        for (const w of writes) await w();
        return result;
      });
      queue = run.catch(() => {});
      return run;
    },
  };
}

const { createPartnerService, hashReportToken, newReportToken, commissionCents } = await import(url('api/partners.js'));
const cli = await import(url('scripts/partner-cli.js'));

const results = [];
async function test(name, fn) {
  try { await fn(); results.push(true); console.log(`PASS ${name}`); } catch (e) { results.push(false); console.log(`FAIL ${name}: ${e.message}`); }
}

// ---- the service on its own
const TOKEN = newReportToken();
function setup({ key = 'ls-test-key', redemptions = {} } = {}) {
  const db = fakeFirestore();
  db.docs.set('partners/rekkerd', { name: 'Rekkerd.org', aff: 'qbnJo', discountCode: 'REKKERD10', commissionPct: 30, reportTokenHash: hashReportToken(TOKEN), active: true });
  db.docs.set('partners/other', { name: 'Other', aff: 'Other123', discountCode: 'OTHER5', commissionPct: 20, reportTokenHash: hashReportToken('svlp_other_token_xxxxxxxx'), active: true });
  const fetchCalls = [];
  const warnings = [];
  const fetchImpl = async (u, init) => {
    fetchCalls.push({ u, init });
    const id = new URL(u).searchParams.get('filter[order_id]');
    return { ok: true, status: 200, json: async () => ({ data: (redemptions[id] || []).map((code) => ({ type: 'discount-redemptions', id: '1', attributes: { order_id: Number(id), discount_code: code, discount_name: 'x', amount: 400 } })) }) };
  };
  const svc = createPartnerService({ getAdmin: async () => ({ db }), fetchImpl, apiKey: () => key, log: { warn: (m) => warnings.push(m) }, now: () => new Date('2026-11-12T12:00:00Z') });
  return { db, svc, fetchCalls, warnings };
}
const attrs = (extra = {}) => ({ status: 'paid', created_at: '2026-11-10T09:00:00Z', total_usd: 3999, tax_usd: 0, currency: 'USD', user_email: 'buyer@example.com', user_name: 'Buyer Name',
  urls: { receipt: 'https://app.lemonsqueezy.com/my-orders/abc' }, first_order_item: { product_id: 7777 }, ...extra });

await test('commission math: round(amount * pct / 100)', async () => {
  assert.equal(commissionCents(3999, 30), 1200);   // 1199.7
  assert.equal(commissionCents(3599, 30), 1080);   // 1079.7
  assert.equal(commissionCents(500, 30), 150);
  assert.equal(commissionCents(999, 0), 0);
});

await test('link attribution: custom aff -> source link, paid by Lemon Squeezy, no API call', async () => {
  const { db, svc, fetchCalls } = setup();
  const out = await svc.recordOrder({ event: 'order_created', orderId: '5001', attrs: attrs({ affiliate_id: 424242 }), customData: { aff: 'qbnJo', uid: 'u1' }, product: 'family' });
  assert.equal(out.result, 'recorded'); assert.equal(out.source, 'link');
  const d = db.docs.get('partner_sales/5001');
  assert.equal(d.partnerId, 'rekkerd'); assert.equal(d.source, 'link'); assert.equal(d.paidBy, 'lemonsqueezy');
  assert.equal(d.product, 'family'); assert.equal(d.amountUsdCents, 3999); assert.equal(d.commissionUsdCents, 1200);
  assert.equal(d.created, '2026-11-10T09:00:00Z'); assert.equal(d.refunded, false);
  assert.equal(fetchCalls.length, 0);
});

await test('amount is without tax (orderAmount)', async () => {
  const { db, svc } = setup();
  await svc.recordOrder({ event: 'order_created', orderId: '5002', attrs: attrs({ total_usd: 4399, tax_usd: 400 }), customData: { aff: 'qbnJo' }, product: 'family' });
  assert.equal(db.docs.get('partner_sales/5002').amountUsdCents, 3999);
});

await test('code attribution: discount code from discount-redemptions -> source code, paid by SubverseLab', async () => {
  const { db, svc, fetchCalls } = setup({ redemptions: { 5003: ['rekkerd10'] } });
  const out = await svc.recordOrder({ event: 'order_created', orderId: '5003', attrs: attrs({ total_usd: 3599 }), customData: {}, product: 'family' });
  assert.equal(out.result, 'recorded'); assert.equal(out.source, 'code');
  const d = db.docs.get('partner_sales/5003');
  assert.equal(d.partnerId, 'rekkerd'); assert.equal(d.paidBy, 'subverselab'); assert.equal(d.commissionUsdCents, 1080);
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].u, 'https://api.lemonsqueezy.com/v1/discount-redemptions?filter[order_id]=5003');
  assert.equal(fetchCalls[0].init.headers.Authorization, 'Bearer ls-test-key');
});

await test('Lemon Squeezy affiliate_id alone -> source link; affiliate id and referral stored', async () => {
  const { db, svc, fetchCalls } = setup({ redemptions: { 5020: ['OTHER5'] } });
  db.docs.set('partners/rekkerd', { ...db.docs.get('partners/rekkerd'), lsAffiliateId: '424242' });
  svc.clearCache();
  const out = await svc.recordOrder({ event: 'order_created', orderId: '5020', attrs: attrs({ affiliate_id: 424242, referral_amount: 1200 }), customData: {}, product: 'family' });
  assert.equal(out.source, 'link');
  const d = db.docs.get('partner_sales/5020');
  assert.equal(d.partnerId, 'rekkerd'); assert.equal(d.paidBy, 'lemonsqueezy'); assert.equal(d.lsAffiliateId, '424242'); assert.equal(d.lsReferralCents, 1200);
  assert.equal(fetchCalls.length, 0);
  // an unknown affiliate_id credits nobody by link (falls through to the code check)
  const out2 = await svc.recordOrder({ event: 'order_created', orderId: '5021', attrs: attrs({ affiliate_id: 999 }), customData: {}, product: 'family' });
  assert.equal(out2.result, 'no partner'); assert.equal(db.docs.has('partner_sales/5021'), false);
});

await test('link sale without a Lemon Squeezy affiliate on the order keeps lsAffiliateId null', async () => {
  const { db, svc } = setup();
  await svc.recordOrder({ event: 'order_created', orderId: '5022', attrs: attrs({ affiliate_id: null, referral_amount: null }), customData: { aff: 'qbnJo' }, product: 'family' });
  assert.equal(db.docs.get('partner_sales/5022').lsAffiliateId, null); assert.equal(db.docs.get('partner_sales/5022').lsReferralCents, null);
  // Lemon Squeezy credited no affiliate: the commission is ours to pay, never shown as paid by Lemon Squeezy
  assert.equal(db.docs.get('partner_sales/5022').paidBy, 'subverselab');
});

await test('link wins over code', async () => {
  const { db, svc, fetchCalls } = setup({ redemptions: { 5004: ['OTHER5'] } });
  await svc.recordOrder({ event: 'order_created', orderId: '5004', attrs: attrs(), customData: { aff: 'qbnJo' }, product: 'family' });
  assert.equal(db.docs.get('partner_sales/5004').partnerId, 'rekkerd'); assert.equal(fetchCalls.length, 0);
});

await test('no LS_API_KEY: no code attribution, one warning, no fetch', async () => {
  const { db, svc, fetchCalls, warnings } = setup({ key: '', redemptions: { 5005: ['REKKERD10'], 5006: ['REKKERD10'] } });
  assert.equal((await svc.recordOrder({ event: 'order_created', orderId: '5005', attrs: attrs(), product: 'family' })).result, 'no partner');
  await svc.recordOrder({ event: 'order_created', orderId: '5006', attrs: attrs(), product: 'family' });
  assert.equal(db.docs.has('partner_sales/5005'), false); assert.equal(fetchCalls.length, 0); assert.equal(warnings.length, 1);
  // a link sale still records without a key
  assert.equal((await svc.recordOrder({ event: 'order_created', orderId: '5007', attrs: attrs(), customData: { aff: 'qbnJo' }, product: 'family' })).result, 'recorded');
});

await test('no partner: unrelated code, unknown aff, unpaid order', async () => {
  const { db, svc } = setup({ redemptions: { 5008: ['JINGFANGLAUNCH'] } });
  assert.equal((await svc.recordOrder({ event: 'order_created', orderId: '5008', attrs: attrs(), customData: { aff: 'nobody1' }, product: 'family' })).result, 'no partner');
  assert.equal((await svc.recordOrder({ event: 'order_created', orderId: '5009', attrs: attrs({ status: 'pending' }), customData: { aff: 'qbnJo' } })).result, 'status pending');
  assert.equal([...db.docs.keys()].filter((k) => k.startsWith('partner_sales/')).length, 0);
});

await test('inactive partner is not credited', async () => {
  const { db, svc } = setup();
  db.docs.set('partners/rekkerd', { ...db.docs.get('partners/rekkerd'), active: false });
  assert.equal((await svc.recordOrder({ event: 'order_created', orderId: '5010', attrs: attrs(), customData: { aff: 'qbnJo' } })).result, 'no partner');
});

await test('idempotent per order: a repeated order_created changes nothing', async () => {
  const { db, svc } = setup();
  await svc.recordOrder({ event: 'order_created', orderId: '5011', attrs: attrs(), customData: { aff: 'qbnJo' }, product: 'family' });
  const before = clone(db.docs.get('partner_sales/5011'));
  assert.equal((await svc.recordOrder({ event: 'order_created', orderId: '5011', attrs: attrs({ total_usd: 1 }), customData: { aff: 'qbnJo' } })).result, 'exists');
  assert.deepEqual(db.docs.get('partner_sales/5011'), before);
});

await test('refund updates the same document', async () => {
  const { db, svc } = setup();
  await svc.recordOrder({ event: 'order_created', orderId: '5012', attrs: attrs(), customData: { aff: 'qbnJo' }, product: 'family' });
  const out = await svc.recordOrder({ event: 'order_refunded', orderId: '5012', attrs: attrs({ status: 'refunded', refunded: true, refunded_amount_usd: 3999 }), customData: { aff: 'qbnJo' } });
  assert.equal(out.result, 'refund recorded');
  const d = db.docs.get('partner_sales/5012');
  assert.equal(d.refunded, true); assert.equal(d.status, 'refunded'); assert.equal(d.refundedUsdCents, 3999); assert.equal(d.amountUsdCents, 3999);
  assert.equal([...db.docs.keys()].filter((k) => k.startsWith('partner_sales/')).length, 1);
});

await test('partial refund keeps the sale counted', async () => {
  const { db, svc } = setup();
  await svc.recordOrder({ event: 'order_created', orderId: '5013', attrs: attrs(), customData: { aff: 'qbnJo' }, product: 'family' });
  await svc.recordOrder({ event: 'order_refunded', orderId: '5013', attrs: attrs({ status: 'partial_refund', refunded: false, refunded_amount_usd: 1000 }) });
  assert.equal(db.docs.get('partner_sales/5013').refunded, false); assert.equal(db.docs.get('partner_sales/5013').refundedUsdCents, 1000);
});

await test('no PII stored: no e-mail, name, uid or receipt URL', async () => {
  const { db, svc } = setup({ redemptions: { 5015: ['REKKERD10'] } });
  await svc.recordOrder({ event: 'order_created', orderId: '5014', attrs: attrs(), customData: { aff: 'qbnJo', uid: 'firebaseUid123' }, product: 'family' });
  await svc.recordOrder({ event: 'order_created', orderId: '5015', attrs: attrs(), customData: { uid: 'firebaseUid123' }, product: 'kubbe' });
  await svc.recordOrder({ event: 'order_refunded', orderId: '5015', attrs: attrs({ status: 'refunded', refunded: true }) });
  const allowed = new Set(['partnerId', 'source', 'product', 'created', 'amountUsdCents', 'commissionPct', 'commissionUsdCents', 'paidBy', 'lsAffiliateId', 'lsReferralCents', 'refunded', 'status', 'recordedAt', 'refundedUsdCents', 'refundedAt']);
  for (const id of ['5014', '5015']) {
    const d = db.docs.get(`partner_sales/${id}`);
    for (const k of Object.keys(d)) assert.ok(allowed.has(k), `unexpected field ${k}`);
    const text = JSON.stringify(d);
    for (const bad of ['buyer@example.com', 'Buyer Name', 'firebaseUid123', 'my-orders']) assert.ok(!text.includes(bad), `${bad} stored`);
  }
});

await test('report: newest first, monthly totals without refunds, split by payer', async () => {
  const { db, svc } = setup({ redemptions: { 6002: ['REKKERD10'], 6003: ['REKKERD10'] } });
  await svc.recordOrder({ event: 'order_created', orderId: '6001', attrs: attrs({ created_at: '2026-11-03T10:00:00Z', total_usd: 3999, affiliate_id: 424242 }), customData: { aff: 'qbnJo' }, product: 'family' });
  await svc.recordOrder({ event: 'order_created', orderId: '6002', attrs: attrs({ created_at: '2026-11-20T10:00:00Z', total_usd: 3599 }), product: 'family' });
  await svc.recordOrder({ event: 'order_created', orderId: '6003', attrs: attrs({ created_at: '2026-11-21T10:00:00Z', total_usd: 3599 }), product: 'family' });
  await svc.recordOrder({ event: 'order_refunded', orderId: '6003', attrs: attrs({ status: 'refunded', refunded: true }) });
  await svc.recordOrder({ event: 'order_created', orderId: '6004', attrs: attrs({ created_at: '2026-12-01T10:00:00Z', total_usd: 3999, affiliate_id: 424242 }), customData: { aff: 'qbnJo' }, product: 'family' });
  await svc.recordOrder({ event: 'order_created', orderId: '6005', attrs: attrs({ created_at: '2026-12-02T10:00:00Z' }), customData: { aff: 'Other123' }, product: 'family' });
  const r = await svc.report(TOKEN);
  assert.deepEqual(r.partner, { name: 'Rekkerd.org', commissionPct: 30, discountCode: 'REKKERD10' });
  assert.deepEqual(r.sales.map((s) => s.date.slice(0, 10)), ['2026-12-01', '2026-11-21', '2026-11-20', '2026-11-03']);
  assert.deepEqual(r.sales[1], { date: '2026-11-21T10:00:00Z', product: 'family', amountUsd: 35.99, commissionUsd: 10.8, source: 'code', paidBy: 'subverselab', refunded: true });
  assert.deepEqual(r.months, [
    { month: '2026-12', orders: 1, amountUsd: 39.99, commissionUsd: 12, owedBySubverselabUsd: 0, paidByLemonSqueezyUsd: 12 },
    { month: '2026-11', orders: 2, amountUsd: 75.98, commissionUsd: 22.8, owedBySubverselabUsd: 10.8, paidByLemonSqueezyUsd: 12 },
  ]);
  assert.ok(!JSON.stringify(r).includes('5001') && !JSON.stringify(r).includes('6001'), 'no order ids in the report');
});

await test('report: unknown / malformed token -> null', async () => {
  const { svc } = setup();
  assert.equal(await svc.report('svlp_wrong_token_aaaaaaaaaaaa'), null);
  assert.equal(await svc.report(''), null);
  assert.equal(await svc.report(hashReportToken(TOKEN)), null);   // the stored hash is not a token
});

// ---- the routes in api/server.js
const state = { db: fakeFirestore() };
globalThis.__ptApp = { initializeApp() {}, applicationDefault() {}, getApps: () => [] };
globalThis.__ptFirestore = { getFirestore: () => state.db, FieldValue: { serverTimestamp: () => '<server-time>', increment: (n) => n } };
globalThis.__ptAuth = { getAuth: () => ({ verifyIdToken: async () => { throw new Error('no'); }, getUserByEmail: async () => { throw Object.assign(new Error('no user'), { code: 'auth/user-not-found' }); } }) };
globalThis.__ptStorage = { Storage: class { constructor() { return {}; } } };
globalThis.__ptFetch = async (u) => ({ ok: true, status: 200, json: async () => ({ data: new URL(u).searchParams.get('filter[order_id]') === '7002' ? [{ attributes: { discount_code: 'REKKERD10' } }] : [] }) });
const source = await readFile(resolve(root, 'api/server.js'), 'utf8');
const transformed = source
  .replace("import express from 'express';", `import express from '${pathToFileURL(require.resolve('express')).href}';`)
  .replace("import compression from 'compression';", `import compression from '${pathToFileURL(require.resolve('compression')).href}';`)
  .replace('const __dirname = dirname(fileURLToPath(import.meta.url));', `const __dirname = ${JSON.stringify(resolve(root, 'api'))};`)
  .replace(/from '\.\/([a-zA-Z]+\.js)';/g, (m, f) => `from '${url(`api/${f}`)}';`)
  .replace('createPartnerService({ getAdmin: adminFirestore })', 'createPartnerService({ getAdmin: adminFirestore, fetchImpl: globalThis.__ptFetch })')
  .replace('const app = express();', 'export const app = express();')
  .replace("await import('firebase-admin/app')", 'await Promise.resolve(globalThis.__ptApp)')
  .replace("await import('firebase-admin/firestore')", 'await Promise.resolve(globalThis.__ptFirestore)')
  .replace("await import('firebase-admin/auth')", 'await Promise.resolve(globalThis.__ptAuth)')
  .replace("import('@google-cloud/storage')", 'Promise.resolve(globalThis.__ptStorage)')
  .replace(/const PORT = process\.env\.PORT \|\| 8080;[\s\S]*?\n\);\s*$/, '');
assert.ok(transformed.includes('__ptFetch'), 'server.js no longer builds the partner service the way this test expects');
const WH = 'partners-test-webhook-secret';
process.env.LEMONSQUEEZY_WEBHOOK_SECRET = WH;
process.env.LS_FAMILY_PRODUCT_ID = '7777';
process.env.LS_API_KEY = 'ls-test-key';
const server = await import(`data:text/javascript;base64,${Buffer.from(transformed).toString('base64')}`);
(await import(url('api/entitlements.js'))).setMxResolver(async (domain) => [{ exchange: `mx.${domain}`, priority: 10 }]);
const handlers = new Map(server.app.router.stack.filter((l) => l.route).map((l) => [`${Object.keys(l.route.methods)[0]} ${l.route.path}`, l.route.stack.at(-1).handle]));
class FakeResponse extends PassThrough {
  constructor() { super(); this.statusCode = 200; this.headers = {}; this.body = undefined; }
  setHeader(n, v) { this.headers[n.toLowerCase()] = v; }
  status(c) { this.statusCode = c; return this; }
  type() { return this; }
  json(b) { this.body = b; this.end(); return this; }
  send(b) { this.body = b; this.end(b); return this; }
}
let ipSeq = 0;
async function call(method, path, { raw, headers = {}, ip } = {}) {
  const req = { path, query: {}, body: raw, ip: ip || `10.9.0.${ipSeq++ % 250}`, headers: Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])), get(n) { return this.headers[n.toLowerCase()]; } };
  const res = new FakeResponse();
  const h = handlers.get(`${method} ${path}`);
  assert.ok(h, `route not found: ${method} ${path}`);
  await h(req, res);
  return { status: res.statusCode, body: res.body, headers: res.headers };
}
const hook = (obj) => { const raw = JSON.stringify(obj); return call('post', '/api/lemonsqueezy/webhook', { raw: Buffer.from(raw), headers: { 'x-signature': createHmac('sha256', WH).update(raw).digest('hex') } }); };
const order = (id, { event = 'order_created', product = 7777, custom = {}, extra = {} } = {}) => ({
  meta: { event_name: event, custom_data: custom },
  data: { id: String(id), attributes: { user_email: 'buyer@example.com', user_name: 'Buyer', status: 'paid', created_at: '2026-11-11T10:00:00Z', total_usd: 3999, tax_usd: 0, currency: 'USD', first_order_item: { product_id: product, variant_id: 1, product_name: 'SubverseLab plugin family' }, ...extra } },
});
const ROUTE_TOKEN = newReportToken();
state.db.docs.set('partners/rekkerd', { name: 'Rekkerd.org', aff: 'qbnJo', discountCode: 'REKKERD10', commissionPct: 30, reportTokenHash: hashReportToken(ROUTE_TOKEN), active: true });

await test('webhook: a family order through the link is recorded (before the family branch)', async () => {
  const r = await hook(order(7001, { custom: { aff: 'qbnJo', uid: 'u1' }, extra: { affiliate_id: 424242 } }));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const d = state.db.docs.get('partner_sales/7001');
  assert.ok(d, 'partner sale written'); assert.equal(d.product, 'family'); assert.equal(d.source, 'link'); assert.equal(d.commissionUsdCents, 1200);
  assert.ok(state.db.docs.has('launch2_purchases/buyer@example.com'), 'the family branch still ran');
});

await test('webhook: a code-only family order is recorded through discount-redemptions', async () => {
  const r = await hook(order(7002, { extra: { user_email: 'other@example.com', total_usd: 3599 } }));
  assert.equal(r.status, 200);
  const d = state.db.docs.get('partner_sales/7002');
  assert.equal(d.source, 'code'); assert.equal(d.paidBy, 'subverselab'); assert.equal(d.commissionUsdCents, 1080);
});

await test('webhook: refund of a single-product order updates the ledger; answer unchanged', async () => {
  process.env.LS_PRODUCT_SLUGS = '1402269:kubbe';
  await hook(order(7003, { product: 1402269, custom: { aff: 'qbnJo' }, extra: { user_email: 'k@example.com', total_usd: 900, first_order_item: { product_id: 1402269, variant_id: 2, product_name: 'KUBBE' } } }));
  assert.equal(state.db.docs.get('partner_sales/7003').product, 'kubbe');
  const r = await hook(order(7003, { event: 'order_refunded', product: 1402269, extra: { user_email: 'k@example.com', status: 'refunded', refunded: true, first_order_item: { product_id: 1402269, variant_id: 2, product_name: 'KUBBE' } } }));
  assert.equal(r.status, 200);
  assert.equal(state.db.docs.get('partner_sales/7003').refunded, true);
});

await test('webhook: a ledger failure never changes the webhook answer', async () => {
  const realCollection = state.db.collection;
  state.db.collection = (name) => { if (name === 'partners' || name === 'partner_sales') throw new Error('UNAVAILABLE'); return realCollection(name); };
  const errors = []; const origErr = console.error; console.error = (...a) => errors.push(a.join(' '));
  try {
    const r = await hook(order(7004, { product: 1402269, custom: { aff: 'qbnJo' }, extra: { user_email: 'k2@example.com', first_order_item: { product_id: 1402269, variant_id: 2, product_name: 'KUBBE' } } }));
    assert.equal(r.status, 200); assert.ok(r.body.ok);
  } finally { state.db.collection = realCollection; console.error = origErr; }
  assert.ok(errors.some((e) => e.includes('partners webhook')), 'logged');
  assert.ok(!state.db.docs.has('partner_sales/7004'));
});

await test('GET /api/partner-report: bad or missing token -> 401 with no detail', async () => {
  for (const headers of [{}, { authorization: 'Bearer svlp_nope_nope_nope_nope_nope' }, { authorization: ROUTE_TOKEN }]) {
    const r = await call('get', '/api/partner-report', { headers });
    assert.equal(r.status, 401); assert.deepEqual(r.body, { error: 'unauthorized' });
  }
});

await test('GET /api/partner-report: the right token -> the report, no-store', async () => {
  const r = await call('get', '/api/partner-report', { headers: { authorization: `Bearer ${ROUTE_TOKEN}` } });
  assert.equal(r.status, 200); assert.equal(r.headers['cache-control'], 'no-store');
  assert.equal(r.body.partner.name, 'Rekkerd.org');
  assert.equal(r.body.sales.length, 3);
  assert.equal(r.body.months[0].month, '2026-11'); assert.equal(r.body.months[0].orders, 2);   // 7003 refunded
  assert.equal(r.body.months[0].paidByLemonSqueezyUsd, 12); assert.equal(r.body.months[0].owedBySubverselabUsd, 10.8);
  assert.ok(!JSON.stringify(r.body).includes('example.com'));
});

await test('GET /api/partner-report: rate limited per IP', async () => {
  let last;
  for (let i = 0; i < 12; i++) last = await call('get', '/api/partner-report', { ip: '10.99.0.1', headers: { authorization: 'Bearer x' } });
  assert.equal(last.status, 429);
});

// ---- the CLI against the fake Firestore
await test('partner-cli add: stores only the hash, prints the link once; refuses duplicates', async () => {
  const db = fakeFirestore();
  const out = await cli.run(db, ['add', '--id', 'rekkerd', '--name', 'Rekkerd.org', '--aff', 'qbnJo', '--code', 'rekkerd10', '--pct', '30']);
  const link = out.find((l) => l.startsWith('https://subverselab.com/partners/report#svlp_'));
  assert.ok(link, 'link printed');
  const token = link.split('#')[1];
  const d = db.docs.get('partners/rekkerd');
  assert.equal(d.reportTokenHash, hashReportToken(token)); assert.equal(d.discountCode, 'REKKERD10'); assert.equal(d.commissionPct, 30); assert.equal(d.active, true);
  assert.ok(!JSON.stringify(d).includes(token), 'token not stored');
  await assert.rejects(cli.run(db, ['add', '--id', 'rekkerd', '--name', 'X', '--aff', 'abcd', '--pct', '10']), /exists/);
  await assert.rejects(cli.run(db, ['add', '--id', 'second', '--name', 'X', '--aff', 'qbnJo', '--pct', '10']), /already belongs/);
  await assert.rejects(cli.run(db, ['add', '--id', 'third', '--name', 'X', '--aff', 'abcd', '--pct', '150']), /pct/);
  const rotated = await cli.run(db, ['rotate-token', '--id', 'rekkerd']);
  const token2 = rotated.find((l) => l.includes('#')).split('#')[1];
  assert.notEqual(token2, token); assert.equal(db.docs.get('partners/rekkerd').reportTokenHash, hashReportToken(token2));
  const svc = createPartnerService({ getAdmin: async () => ({ db }), apiKey: () => '' });
  assert.equal(await svc.report(token), null, 'old token dead'); assert.ok(await svc.report(token2), 'new token works');
  assert.ok((await cli.run(db, ['list']))[0].includes('rekkerd'));
  assert.ok(!(await cli.run(db, ['list']))[0].includes(hashReportToken(token2)), 'list shows no hash');
});

const failed = results.filter((x) => !x).length;
console.log(`SUMMARY ${results.length} cases, ${failed} fail`);
process.exit(failed ? 1 : 0);
