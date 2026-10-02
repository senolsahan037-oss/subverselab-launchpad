// Local-only download-room tests. No Google credentials, network, or deploy.
// Run: node scripts/test-download.js
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { PassThrough, Readable } from 'node:stream';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const require = createRequire(import.meta.url);
const SECRET = 'local-download-test-secret';

function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
function merge(a, b) {
  const out = { ...(a || {}) };
  for (const [key, value] of Object.entries(b)) {
    out[key] = value && typeof value === 'object' && !Array.isArray(value) && out[key] && typeof out[key] === 'object'
      ? merge(out[key], value) : clone(value);
  }
  return out;
}

// Firestore's transaction contract is modelled by a serial commit queue. A
// transaction reads a coherent snapshot and all writes commit before the next
// transaction starts, which is the needed optimistic-retry outcome here.
function fakeFirestore() {
  const docs = new Map();
  const snap = (path) => ({ exists: docs.has(path), data: () => clone(docs.get(path)) });
  const ref = (path) => ({
    path,
    get: async () => snap(path),
    set: async (data, options) => docs.set(path, options?.merge ? merge(docs.get(path), data) : clone(data)),
  });
  let queue = Promise.resolve();
  return {
    docs,
    collection: (name) => ({ doc: (id) => ref(`${name}/${id}`) }),
    runTransaction(callback) {
      const run = queue.then(async () => {
        const writes = [];
        const tx = {
          get: async (document) => snap(document.path),
          set: (document, data, options) => writes.push(() => document.set(data, options)),
          update: (document, data) => writes.push(() => {
            assert.ok(docs.has(document.path), `update of missing ${document.path}`);
            docs.set(document.path, merge(docs.get(document.path), data));
          }),
        };
        const result = await callback(tx);
        for (const write of writes) await write();
        return result;
      });
      queue = run.catch(() => {});
      return run;
    },
  };
}

function fakeStorage() {
  const files = new Map([
    ['plugins/kubbe/1.2.3/Kubbe-mac.zip', { name: 'Kubbe-mac.zip', body: 'KUBBE-MAC' }],
    ['plugins/kubbe/1.2.3/Kubbe-win.zip', { name: 'Kubbe-win.zip', body: 'KUBBE-WIN' }],
    ['plugins/kaset/4.5.6/Kaset-mac.zip', { name: 'Kaset-mac.zip', body: 'KASET-MAC' }],
    ['plugins/kaset/4.5.6/Kaset-win.zip', { name: 'Kaset-win.zip', body: 'KASET-WIN' }],
    ['plugins/koro/1.0.0/Koro-mac.zip', { name: 'Koro-mac.zip', body: 'KORO-MAC' }],
    ['plugins/yanki/1.0.0/Yanki-mac.zip', { name: 'Yanki-mac.zip', body: 'YANKI-MAC' }],
    ['plugins/hava/1.0.0/Hava-mac.zip', { name: 'Hava-mac.zip', body: 'HAVA-MAC' }],
    ['plugins/mihenk/1.0.0/Mihenk-mac.zip', { name: 'Mihenk-mac.zip', body: 'MIHENK-MAC' }],
  ]);
  return {
    bucket: () => ({ file: (object) => ({
      getMetadata: async () => {
        const file = files.get(object);
        if (!file) throw new Error('not found');
        return [{ name: file.name, size: file.body.length }];
      },
      createReadStream: () => Readable.from([files.get(object)?.body || '']),
      download: async () => [Buffer.from(JSON.stringify({
        kubbe: { version: '1.2.3', files: {
          mac: { name: 'Kubbe-mac.zip', size: 10, object: 'plugins/kubbe/1.2.3/Kubbe-mac.zip' },
          win: { name: 'Kubbe-win.zip', size: 10, object: 'plugins/kubbe/1.2.3/Kubbe-win.zip' },
        } },
        kaset: { version: '4.5.6', files: {
          mac: { name: 'Kaset-mac.zip', size: 10, object: 'plugins/kaset/4.5.6/Kaset-mac.zip' },
          win: { name: 'Kaset-win.zip', size: 10, object: 'plugins/kaset/4.5.6/Kaset-win.zip' },
        } },
        koro: { version: '1.0.0', files: { mac: { name: 'Koro-mac.zip', size: 9, object: 'plugins/koro/1.0.0/Koro-mac.zip' } } },
        yanki: { version: '1.0.0', files: { mac: { name: 'Yanki-mac.zip', size: 10, object: 'plugins/yanki/1.0.0/Yanki-mac.zip' } } },
        hava: { version: '1.0.0', files: { mac: { name: 'Hava-mac.zip', size: 9, object: 'plugins/hava/1.0.0/Hava-mac.zip' } } },
        mihenk: { version: '1.0.0', files: { mac: { name: 'Mihenk-mac.zip', size: 10, object: 'plugins/mihenk/1.0.0/Mihenk-mac.zip' } } },
      }))],
    }) }),
  };
}

const state = { db: fakeFirestore(), storage: fakeStorage() };
state.auth = { verifyIdToken: async (token) => {
  if (!token.startsWith('valid-')) throw new Error('invalid token');
  const uid = token.slice(6);
  return { uid, email: `${uid}@example.com`, email_verified: !uid.startsWith('unv-'), firebase: { sign_in_provider: uid.startsWith('google-') ? 'google.com' : 'password' } };
} };
state.FieldValue = { serverTimestamp: () => '<server-time>' };
globalThis.__downloadTestAdminApp = { initializeApp() {}, applicationDefault() {}, getApps: () => [] };
globalThis.__downloadTestAdminFirestore = { getFirestore: () => state.db, FieldValue: state.FieldValue };
globalThis.__downloadTestAdminAuth = { getAuth: () => state.auth };
globalThis.__downloadTestStorage = { Storage: class { constructor() { return state.storage; } } };

const serverSource = await readFile(resolve(root, 'server.js'), 'utf8');
const launchUrl = pathToFileURL(resolve(root, 'launchLicence.js')).href;
const entitlementsUrl = pathToFileURL(resolve(root, 'entitlements.js')).href;
const transformed = serverSource
  .replace("import express from 'express';", `import express from '${pathToFileURL(require.resolve('express')).href}';`)
  .replace("import compression from 'compression';", `import compression from '${pathToFileURL(require.resolve('compression')).href}';`)
  .replace("const __dirname = dirname(fileURLToPath(import.meta.url));", `const __dirname = ${JSON.stringify(root)};`)
  .replace("import { createLaunchService, tokenBucket } from './launchLicence.js';", `import { createLaunchService, tokenBucket } from '${launchUrl}';`)
  .replace("import { ownedLaunch1Slugs } from './entitlements.js';", `import { ownedLaunch1Slugs } from '${entitlementsUrl}';`)
  .replace('const app = express();', 'export const app = express();')
  .replace("await import('firebase-admin/app')", 'await Promise.resolve(globalThis.__downloadTestAdminApp)')
  .replace("await import('firebase-admin/firestore')", 'await Promise.resolve(globalThis.__downloadTestAdminFirestore)')
  .replace("await import('firebase-admin/auth')", 'await Promise.resolve(globalThis.__downloadTestAdminAuth)')
  .replace("import('@google-cloud/storage')", 'Promise.resolve(globalThis.__downloadTestStorage)')
  .replace(/const PORT = process\.env\.PORT \|\| 8080;[\s\S]*?\n\);\s*$/, '');
const server = await import(`data:text/javascript;base64,${Buffer.from(transformed).toString('base64')}`);
process.env.DOWNLOAD_TICKET_SECRET = SECRET;
const WH_SECRET = 'local-webhook-secret';
process.env.LEMONSQUEEZY_WEBHOOK_SECRET = WH_SECRET;
process.env.LS_BUNDLE4_PRODUCT_ID = '5550';

const routeHandlers = new Map(server.app.router.stack
  .filter((layer) => layer.route)
  .map((layer) => [layer.route.path, layer.route.stack.at(-1).handle]));
class FakeResponse extends PassThrough {
  constructor() { super(); this.statusCode = 200; this.headersSent = false; this.headers = {}; this.body = undefined; }
  setHeader(name, value) { this.headers[name.toLowerCase()] = value; }
  status(code) { this.statusCode = code; return this; }
  type() { return this; }
  json(body) { this.body = body; this.headersSent = true; this.end(); return this; }
  send(body) { this.body = body; this.headersSent = true; this.end(body); return this; }
}
const headersFor = (ip) => ({ 'content-type': 'application/json', 'x-forwarded-for': ip });
async function call(path, options = {}) {
  const url = new URL(path, 'http://local.test');
  const req = {
    path: url.pathname, query: Object.fromEntries(url.searchParams), body: options.raw !== undefined ? options.raw : options.body ? JSON.parse(options.body) : {},
    headers: Object.fromEntries(Object.entries(options.headers || {}).map(([key, value]) => [key.toLowerCase(), value])),
    ip: options.headers?.['x-forwarded-for'] || '127.0.0.1',
    get(name) { return this.headers[name.toLowerCase()]; },
  };
  const res = new FakeResponse();
  const handler = routeHandlers.get(url.pathname);
  if (!handler) throw new Error(`route not found: ${url.pathname}`);
  assert.ok(handler, `route not found: ${url.pathname}`);
  const done = new Promise((resolveDone) => res.once('finish', resolveDone));
  await handler(req, res);
  if (!res.writableEnded) await done;
  const chunks = [];
  if (res.body === undefined) {
    for await (const chunk of res) chunks.push(chunk);
    res.body = Buffer.concat(chunks).toString('utf8');
  }
  return { response: { status: res.statusCode, headers: res.headers }, body: res.body };
}
function resetDb({ claimed = 0, downloads = 0 } = {}) {
  state.db.docs.clear();
  state.db.docs.set('launch/counter', { claimed, downloads });
  state.db.docs.set('launch2/counter', { claimed: 0, downloads: 0 });
}
function signedTicket(data) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature = createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
function decodeTicket(url) {
  const token = new URL(url, 'http://local.test').searchParams.get('t');
  return JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'));
}

const results = [];
async function test(name, fn) {
  try { await fn(); results.push({ name, ok: true, last: `PASS ${name}` }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, ok: false, last: `FAIL ${name}: ${error.message}` }); console.log(`FAIL ${name}: ${error.message}`); }
}

await test('signed-in ticket and stubbed file download', async () => {
  resetDb();
  const ticket = await call('/api/download/ticket', { method: 'POST', headers: { ...headersFor('10.0.0.1'), authorization: 'Bearer valid-alice' }, body: JSON.stringify({ slug: 'kubbe', platform: 'mac' }) });
  assert.equal(ticket.response.status, 200);
  const file = await call(ticket.body.url, { headers: { 'x-forwarded-for': '10.0.0.1' } });
  assert.equal(file.response.status, 200);
  assert.equal(file.body, 'KUBBE-MAC');
});

await test('missing and invalid ID token yield no ticket', async () => {
  resetDb();
  for (const authorization of [undefined, 'Bearer invalid']) {
    const headers = { ...headersFor(`10.0.0.${authorization ? 3 : 2}`) };
    if (authorization) headers.authorization = authorization;
    const result = await call('/api/download/ticket', { method: 'POST', headers, body: JSON.stringify({ slug: 'kubbe', platform: 'mac' }) });
    assert.ok([401, 403].includes(result.response.status));
    assert.equal(result.body.url, undefined);
  }
});

await test('tampered and expired tickets yield 403', async () => {
  resetDb();
  const valid = signedTicket({ uid: 'alice', slug: 'kubbe', platform: 'mac', object: 'plugins/kubbe/1.2.3/Kubbe-mac.zip', exp: Math.floor(Date.now() / 1000) + 300 });
  const tampered = `${valid.slice(0, -1)}${valid.endsWith('A') ? 'B' : 'A'}`;
  const expired = signedTicket({ uid: 'alice', slug: 'kubbe', platform: 'mac', object: 'plugins/kubbe/1.2.3/Kubbe-mac.zip', exp: Math.floor(Date.now() / 1000) - 1 });
  for (const token of [tampered, expired]) assert.equal((await call(`/api/download/file?t=${encodeURIComponent(token)}`)).response.status, 403);
});

await test('a Kubbe ticket cannot fetch Kaset or another platform', async () => {
  resetDb();
  const a = signedTicket({ uid: 'alice', slug: 'kubbe', platform: 'mac', object: 'plugins/kubbe/1.2.3/Kubbe-mac.zip', exp: Math.floor(Date.now() / 1000) + 300 });
  const result = await call(`/api/download/file?t=${encodeURIComponent(a)}`);
  assert.equal(result.response.status, 200);
  assert.equal(result.body, 'KUBBE-MAC');
  assert.notEqual(result.body, 'KASET-MAC');
  assert.notEqual(result.body, 'KUBBE-WIN');
});

await test('first download counts exactly once across repeat/plugin/platform', async () => {
  resetDb();
  const request = (uid, slug, platform, ip) => call('/api/download/ticket', { method: 'POST', headers: { ...headersFor(ip), authorization: `Bearer valid-${uid}` }, body: JSON.stringify({ slug, platform }) });
  const tickets = [];
  for (const [uid, slug, platform] of [['alice', 'kubbe', 'mac'], ['alice', 'kubbe', 'mac'], ['alice', 'kaset', 'mac'], ['alice', 'kubbe', 'win']]) {
    const result = await request(uid, slug, platform, `10.0.1.${Math.random().toString().slice(2, 8)}`);
    assert.equal(result.response.status, 200);
    assert.ok(result.body.url);
    tickets.push(result.body.url);
  }
  assert.equal(tickets.length, 4);
  assert.equal(state.db.docs.get('launch/counter').claimed, 1);
  assert.equal(state.db.docs.get('launch/counter').downloads, 4);
});

const ticketReq = (uid, ip, slug, launchId, platform = 'mac') => call('/api/download/ticket', { method: 'POST', headers: { ...headersFor(ip), authorization: `Bearer valid-${uid}` }, body: JSON.stringify({ slug, platform, launchId }) });
let orderSeq = 0;
function orderPayload(email, { event = 'order_created', id, status = 'paid', product = 5550 } = {}) {
  return JSON.stringify({ meta: { event_name: event }, data: { id: String(id ?? ++orderSeq), attributes: { user_email: email, status, created_at: '2026-10-05T10:00:00Z', first_order_item: { product_id: product, variant_id: 1 } } } });
}
const hook = (raw, sig) => call('/api/lemonsqueezy/webhook', { method: 'POST', raw: Buffer.from(raw), headers: { 'x-signature': sig ?? createHmac('sha256', WH_SECRET).update(raw).digest('hex') } });
const payFor = async (uid, opts) => (await hook(orderPayload(`${uid}@example.com`, opts))).body;

await test('launch2 unpaid gets 402; launch 1 is unaffected', async () => {
  resetDb();
  const unpaid = await ticketReq('nopay', '10.0.4.1', 'koro', 'launch2');
  assert.equal(unpaid.response.status, 402);
  assert.equal(unpaid.body.error, 'Purchase required');
  assert.equal(unpaid.body.url, undefined);
  assert.equal(state.db.docs.get('launch2/counter').claimed, 0);
  const claim = await call('/api/launch/claim', { method: 'POST', headers: { ...headersFor('10.0.4.9'), authorization: 'Bearer valid-nopay' }, body: JSON.stringify({ launchId: 'launch2' }) });
  assert.equal(claim.response.status, 402);
  assert.equal((await ticketReq('nopay', '10.0.4.2', 'kubbe')).response.status, 200);
  assert.equal(state.db.docs.get('launch/counter').claimed, 1);
  assert.equal(state.db.docs.get('launch2/counter').claimed, 0);
});

await test('webhook with a bad or missing signature records nothing', async () => {
  resetDb();
  const raw = orderPayload('bad@example.com');
  for (const sig of ['deadbeef', '', createHmac('sha256', 'wrong').update(raw).digest('hex')]) {
    const r = await hook(raw, sig);
    assert.ok([401, 403].includes(r.response.status), `status ${r.response.status}`);
  }
  assert.equal(state.db.docs.has('launch2_purchases/bad@example.com'), false);
  assert.equal(state.db.docs.get('launch2/counter').claimed, 0);
  assert.equal((await ticketReq('bad', '10.0.4.3', 'koro', 'launch2')).response.status, 402);
});

await test('paid order records purchase, claims one seat, and unlocks all four slugs', async () => {
  resetDb();
  const r = await hook(orderPayload('Carol@Example.com', { id: 'A1' }));
  assert.equal(r.response.status, 200);
  const purchase = state.db.docs.get('launch2_purchases/carol@example.com');
  assert.equal(purchase.orderId, 'A1');
  assert.equal(purchase.refunded, false);
  assert.equal(purchase.overCap, false);
  assert.ok(purchase.paidAt);
  assert.equal(state.db.docs.get('launch2/counter').claimed, 1);
  const status = await call('/api/launch2/status', { headers: { ...headersFor('10.0.4.20'), authorization: 'Bearer valid-carol' } });
  assert.equal(status.body.paid, true);
  for (const slug of ['koro', 'yanki', 'hava', 'mihenk']) {
    const t = await ticketReq('carol', `10.0.4.${slug.length}${slug.charCodeAt(0) % 90}`, slug, 'launch2');
    assert.equal(t.response.status, 200, slug);
    assert.equal(decodeTicket(t.body.url).slug, slug);
  }
  assert.equal(state.db.docs.get('launch2/counter').claimed, 1);
  assert.equal(state.db.docs.get('launch2/counter').downloads, 4);
  // Slugs still cannot cross launches; other products' orders are ignored.
  assert.equal((await ticketReq('carol', '10.0.4.30', 'kubbe', 'launch2')).response.status, 400);
  const other = await hook(orderPayload('dave@example.com', { product: 777 }));
  assert.equal(state.db.docs.has('launch2_purchases/dave@example.com'), false);
  assert.equal(other.response.status, 200);
  // Pending/unpaid orders record nothing.
  await hook(orderPayload('erin@example.com', { status: 'pending' }));
  assert.equal(state.db.docs.has('launch2_purchases/erin@example.com'), false);
});

await test('the same order twice takes one seat', async () => {
  resetDb();
  await hook(orderPayload('twice@example.com', { id: 'T1' }));
  const again = await hook(orderPayload('twice@example.com', { id: 'T1' }));
  assert.equal(again.body.launch2, 'duplicate');
  assert.equal(state.db.docs.get('launch2/counter').claimed, 1);
  await Promise.all([hook(orderPayload('race@example.com', { id: 'R1' })), hook(orderPayload('race@example.com', { id: 'R1' }))]);
  assert.equal(state.db.docs.get('launch2/counter').claimed, 2);
});

await test('refund denies tickets and releases nothing', async () => {
  resetDb();
  await hook(orderPayload('fay@example.com', { id: 'F1' }));
  assert.equal((await ticketReq('fay', '10.0.4.40', 'koro', 'launch2')).response.status, 200);
  const r = await hook(orderPayload('fay@example.com', { event: 'order_refunded', id: 'F1', status: 'refunded' }));
  assert.equal(r.body.launch2, 'refunded');
  assert.equal(state.db.docs.get('launch2_purchases/fay@example.com').refunded, true);
  assert.equal((await ticketReq('fay', '10.0.4.41', 'koro', 'launch2')).response.status, 402);
  assert.equal(state.db.docs.get('launch2/counter').claimed, 1);
  assert.equal(state.db.docs.has('launch2_seats/fay@example.com'), true);
});

await test('cap: 1,000 paid, the 1,001st is recorded overCap and gets no ticket', async () => {
  resetDb();
  state.db.docs.set('launch2/counter', { claimed: 999, downloads: 0 });
  await hook(orderPayload('last@example.com', { id: 'L1' }));
  assert.equal(state.db.docs.get('launch2/counter').claimed, 1000);
  const late = await hook(orderPayload('late@example.com', { id: 'L2' }));
  assert.equal(late.body.launch2, 'over-cap');
  const purchase = state.db.docs.get('launch2_purchases/late@example.com');
  assert.equal(purchase.overCap, true);
  assert.equal(purchase.orderId, 'L2');
  assert.equal(state.db.docs.get('launch2/counter').claimed, 1000);
  assert.equal(state.db.docs.has('launch2_seats/late@example.com'), false);
  const t = await ticketReq('late', '10.0.4.50', 'koro', 'launch2');
  assert.equal(t.response.status, 402);
  assert.equal(t.body.url, undefined);
  assert.equal((await ticketReq('last', '10.0.4.51', 'koro', 'launch2')).response.status, 200);
  // The public counter is the paid count.
  const codes = await call('/api/launch/codes?launch=launch2', { headers: { 'x-forwarded-for': '10.0.4.52' } });
  assert.equal(codes.body.claimed, 1000);
});

await test('unverified e-mail is allowed on launch 1 but denied on paid launch 2', async () => {
  resetDb();
  const one = await ticketReq('unv-gus', '10.0.4.61', 'kubbe');
  await hook(orderPayload('unv-gus@example.com', { id: 'U1' }));
  const two = await ticketReq('unv-gus', '10.0.4.60', 'koro', 'launch2');
  const claim = await call('/api/launch/claim', { method: 'POST', headers: { ...headersFor('10.0.4.62'), authorization: 'Bearer valid-unv-gus' }, body: JSON.stringify({ launchId: 'launch' }) });
  assert.equal(one.response.status, 200);
  assert.equal(two.response.status, 403);
  assert.equal(claim.response.status, 200);
  assert.equal(state.db.docs.get('launch/counter').claimed, 1);
});

await test('Google sign-in bypasses e-mail verification but keeps the launch gate', async () => {
  resetDb();
  const one = await ticketReq('google-gus', '10.0.4.70', 'kubbe');
  assert.equal(one.response.status, 200);
  assert.equal(state.db.docs.get('launch/counter').claimed, 1);
});

await test('launch 1: one person claims once, unknown launchId means launch 1, counters are read separately', async () => {
  resetDb();
  const ask = ticketReq;
  assert.equal((await ask('dana', '10.0.5.1', 'kubbe')).response.status, 200);
  assert.equal((await ask('dana', '10.0.5.2', 'kaset')).response.status, 200);
  assert.equal(state.db.docs.get('launch/counter').claimed, 1);
  assert.ok(state.db.docs.has('launch_claims/uid:dana'));
  assert.equal((await ask('frank', '10.0.5.6', 'koro')).response.status, 400);
  assert.equal((await ask('frank', '10.0.5.7', 'koro', 'launch3')).response.status, 400);
  assert.equal((await ask('gina', '10.0.5.8', 'kubbe', undefined, 'linux')).response.status, 400);
  // (/api/launch/codes is cached 30 s per launch; the cap test already read launch 2's paid count.)
  const one = await call('/api/launch/codes', { headers: { 'x-forwarded-for': '10.0.5.9' } });
  assert.equal(one.body.total, 1000);
  assert.notEqual(one.body.claimed, 1000);
});

for (const start of [998, 999]) {
  await test(`20-way race at ${start} claims only remaining licences and preserves existing claim`, async () => {
    resetDb({ claimed: start });
    const requests = Array.from({ length: 20 }, (_, i) => call('/api/download/ticket', { method: 'POST', headers: { ...headersFor(`10.0.2.${i + 1}`), authorization: `Bearer valid-race-${start}-${i}` }, body: JSON.stringify({ slug: 'kubbe', platform: 'mac' }) }));
    const responses = await Promise.all(requests);
    const expectedTickets = 1000 - start;
    assert.equal(state.db.docs.get('launch/counter').claimed, 1000);
    assert.equal(responses.filter(({ response }) => response.status === 200).length, expectedTickets);
    // The losers see either a full claim (410) or, once the counter already reads 1,000, the shop (402).
    assert.equal(responses.filter(({ response }) => response.status === 410 || response.status === 402).length, 20 - expectedTickets);
    assert.equal(state.db.docs.get('launch/counter').downloads, expectedTickets);
    for (const result of responses) {
      if (result.response.status === 200) assert.ok(result.body.url);
      else assert.equal(result.body.url, undefined);
    }

    state.db.docs.set('launch_claims/uid:already-claimed', { key: 'SVL-EXISTING-KEY' });
    state.db.docs.set('launch_claims/email:already-claimed@example.com', { key: 'SVL-EXISTING-KEY' });
    const existing = await call('/api/download/ticket', { method: 'POST', headers: { ...headersFor(`10.0.2.250`), authorization: 'Bearer valid-already-claimed' }, body: JSON.stringify({ slug: 'kubbe', platform: 'mac' }) });
    // Owner's rule: after the free 1,000 an earlier free claim no longer downloads again.
    assert.equal(existing.response.status, 402);
    assert.equal(existing.body.url, undefined);
    assert.equal(state.db.docs.get('launch/counter').claimed, 1000);
    assert.equal(state.db.docs.get('launch/counter').downloads, expectedTickets);
  });
}

// After the free 1,000: paid orders (written by the webhook into plugin_licenses) open the room, nothing else does.
const shop = (uid, slug, ip) => ticketReq(uid, ip, slug, 'launch');
const order = (product, extra = {}) => ({ orders: { o1: { order_id: 'o1', product, status: 'paid', refunded: false, ...extra } } });
await test('after the free 1,000 a paid Kubbe order opens Kubbe only, without touching the free counter', async () => {
  resetDb({ claimed: 1000 });
  state.db.docs.set('plugin_licenses/buyer-k@example.com', order('kubbe'));
  const kubbe = await shop('buyer-k', 'kubbe', '10.0.6.1');
  const kaset = await shop('buyer-k', 'kaset', '10.0.6.2');
  assert.equal(kubbe.response.status, 200); assert.ok(kubbe.body.url);
  assert.equal(kaset.response.status, 402);
  assert.equal(state.db.docs.get('launch/counter').claimed, 1000);
  assert.equal(state.db.docs.has('launch_claims/uid:buyer-k'), false);
});
await test('after the free 1,000 a paid bundle order opens both plugins', async () => {
  resetDb({ claimed: 1000 });
  state.db.docs.set('plugin_licenses/buyer-b@example.com', order('bundle'));
  assert.equal((await shop('buyer-b', 'kubbe', '10.0.6.3')).response.status, 200);
  assert.equal((await shop('buyer-b', 'kaset', '10.0.6.4')).response.status, 200);
});
await test('after the free 1,000 refunded, pending, unmapped and launch-2 orders open nothing', async () => {
  resetDb({ claimed: 1000 });
  const cases = { 'r1': order('bundle', { refunded: true, status: 'refunded' }), 'r2': order('kubbe', { status: 'pending' }), 'r3': order(null), 'r4': order('koro') };
  for (const [uid, doc] of Object.entries(cases)) state.db.docs.set(`plugin_licenses/${uid}@example.com`, doc);
  let ip = 10;
  for (const uid of Object.keys(cases)) assert.equal((await shop(uid, 'kubbe', `10.0.6.${ip += 1}`)).response.status, 402, uid);
  assert.equal((await shop('nobody', 'kubbe', '10.0.6.99')).response.status, 402);
});
await test('before the free 1,000 are gone a paid order is not needed and claims still count', async () => {
  resetDb({ claimed: 5 });
  assert.equal((await shop('free-one', 'kubbe', '10.0.6.120')).response.status, 200);
  assert.equal(state.db.docs.get('launch/counter').claimed, 6);
});
await test('purchases status: full flag and owned slugs follow the paid orders', async () => {
  resetDb({ claimed: 1000 });
  state.db.docs.set('plugin_licenses/buyer-k@example.com', order('kaset'));
  const s = await call('/api/purchases/status', { headers: { ...headersFor('10.0.6.130'), authorization: 'Bearer valid-buyer-k' } });
  assert.equal(s.response.status, 200); assert.deepEqual(s.body, { full: true, owned: ['kaset'] });
  const none = await call('/api/purchases/status', { headers: { ...headersFor('10.0.6.131'), authorization: 'Bearer valid-stranger' } });
  assert.deepEqual(none.body, { full: true, owned: [] });
  const unauth = await call('/api/purchases/status', { headers: headersFor('10.0.6.132') });
  assert.equal(unauth.response.status, 401);
});

const licenceDoc = (id, key, orderId, extra = {}) => ({ license_id: id, product: 'kubbe', key, key_short: key.slice(0, 4), status: 'active', disabled: false, order_id: orderId, created: '2026-10-05T10:00:00Z', ...extra });
await test('purchases licenses: caller gets only their own keys; 401 without a token', async () => {
  resetDb({ claimed: 1000 });
  state.db.docs.set('plugin_licenses/lic-a@example.com', { orders: { o1: { order_id: 'o1', product: 'kubbe', product_name: 'Kubbe', status: 'paid' } }, licenses: { l1: licenceDoc('l1', 'AAAA-1111-AAAA', 'o1'), l2: licenceDoc('l2', 'DEAD-0000-DEAD', 'o1', { disabled: true }) } });
  state.db.docs.set('plugin_licenses/lic-b@example.com', { licenses: { l3: licenceDoc('l3', 'BBBB-2222-BBBB', 'o9', { product: 'kaset' }) } });
  const a = await call('/api/purchases/licenses', { headers: { ...headersFor('10.0.7.1'), authorization: 'Bearer valid-lic-a' } });
  assert.equal(a.response.status, 200);
  assert.deepEqual(a.body.licenses.map((l) => l.key), ['AAAA-1111-AAAA']);
  assert.equal(a.body.licenses[0].productName, 'Kubbe');
  assert.equal(JSON.stringify(a.body).includes('BBBB-2222'), false);
  const b = await call('/api/purchases/licenses', { headers: { ...headersFor('10.0.7.2'), authorization: 'Bearer valid-lic-b' } });
  assert.deepEqual(b.body.licenses.map((l) => l.key), ['BBBB-2222-BBBB']);
  const none = await call('/api/purchases/licenses', { headers: { ...headersFor('10.0.7.3'), authorization: 'Bearer valid-lic-nobody' } });
  assert.deepEqual(none.body, { licenses: [] });
  assert.equal((await call('/api/purchases/licenses', { headers: headersFor('10.0.7.4') })).response.status, 401);
  assert.equal((await call('/api/purchases/licenses', { headers: { ...headersFor('10.0.7.5'), authorization: 'Bearer invalid' } })).response.status, 401);
  assert.equal((await call('/api/purchases/licenses', { headers: { ...headersFor('10.0.7.6'), authorization: 'Bearer valid-unv-lic-a' } })).response.status, 403);
});
await test('purchases status: full flips with the counter (999 open, 1000 full)', async () => {
  const ask = (ip) => call('/api/purchases/status', { headers: { ...headersFor(ip), authorization: 'Bearer valid-flip' } });
  resetDb({ claimed: 999 });
  assert.deepEqual((await ask('10.0.7.10')).body, { full: false, owned: [] });
  state.db.docs.set('launch/counter', { claimed: 1000, downloads: 0 });
  assert.deepEqual((await ask('10.0.7.11')).body, { full: true, owned: [] });
});

await test('manifest contains no file URL or bucket path', async () => {
  resetDb();
  const result = await call('/api/download/manifest', { headers: { 'x-forwarded-for': '10.0.3.1' } });
  assert.equal(result.response.status, 200);
  const text = JSON.stringify(result.body);
  assert.equal(text.includes('http'), false);
  assert.equal(text.includes('bucket'), false);
  assert.equal(text.includes('object'), false);
  assert.equal(text.includes('plugins/'), false);
});

const failed = results.filter((result) => !result.ok);
console.log(`SUMMARY ${results.length} cases, ${failed.length} fail`);
console.log(`LAST_CASE_LINES ${JSON.stringify(results.map((result) => result.last))}`);
process.exitCode = failed.length ? 1 : 0;
