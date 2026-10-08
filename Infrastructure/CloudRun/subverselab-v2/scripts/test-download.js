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
    ['plugins/tutkal/1.0.0/Tutkal-mac.zip', { name: 'Tutkal-mac.zip', body: 'TUTKAL-MAC' }],
    ['plugins/taban/1.0.0/Taban-1.0.0-macOS.pkg', { name: 'Taban-1.0.0-macOS.pkg', body: 'TABAN-MAC' }],
    ['plugins/taban/1.0.0/Taban-1.0.0-Windows-VST3.zip', { name: 'Taban-1.0.0-Windows-VST3.zip', body: 'TABAN-WIN' }],
    ['plugins/alev/1.0.0/Alev-1.0.0-macOS.pkg', { name: 'Alev-1.0.0-macOS.pkg', body: 'ALEV-MAC' }],
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
        // TUTKAL: macOS published, Windows not yet; `state.omitTutkal` drops the whole entry (manifest not yet updated).
        // TABAN: the first free plugin, both platforms published.
        taban: { version: '1.0.0', files: {
          mac: { name: 'Taban-1.0.0-macOS.pkg', size: 9, object: 'plugins/taban/1.0.0/Taban-1.0.0-macOS.pkg' },
          win: { name: 'Taban-1.0.0-Windows-VST3.zip', size: 9, object: 'plugins/taban/1.0.0/Taban-1.0.0-Windows-VST3.zip' },
        } },
        alev: { version: '1.0.0', files: {
          mac: { name: 'Alev-1.0.0-macOS.pkg', size: 8, object: 'plugins/alev/1.0.0/Alev-1.0.0-macOS.pkg' },
        } },
        ...(state.omitTutkal ? {} : { tutkal: { version: '1.0.0', files: { mac: { name: 'Tutkal-mac.zip', size: 10, object: 'plugins/tutkal/1.0.0/Tutkal-mac.zip' } } } }),
      }))],
    }) }),
  };
}

const state = { db: fakeFirestore(), storage: fakeStorage() };
state.auth = { verifyIdToken: async (token) => {
  if (!token.startsWith('valid-')) throw new Error('invalid token');
  const uid = token.slice(6);
  return { uid, email: uid.includes('admin') ? 'senolsahan037@gmail.com' : `${uid}@example.com`, email_verified: !uid.startsWith('unv-'), firebase: { sign_in_provider: uid.startsWith('google-') ? 'google.com' : 'password' } };
} };
state.FieldValue = { serverTimestamp: () => '<server-time>' };
globalThis.__downloadTestAdminApp = { initializeApp() {}, applicationDefault() {}, getApps: () => [] };
globalThis.__downloadTestAdminFirestore = { getFirestore: () => state.db, FieldValue: state.FieldValue };
globalThis.__downloadTestAdminAuth = { getAuth: () => state.auth };
globalThis.__downloadTestStorage = { Storage: class { constructor() { return state.storage; } } };

const serverSource = await readFile(resolve(root, 'server.js'), 'utf8');
const launchUrl = pathToFileURL(resolve(root, 'launchLicence.js')).href;
const entitlementsUrl = pathToFileURL(resolve(root, 'entitlements.js')).href;
const accountUrl = pathToFileURL(resolve(root, 'accountDeletion.js')).href;
const transformed = serverSource
  .replace("import express from 'express';", `import express from '${pathToFileURL(require.resolve('express')).href}';`)
  .replace("import compression from 'compression';", `import compression from '${pathToFileURL(require.resolve('compression')).href}';`)
  .replace("const __dirname = dirname(fileURLToPath(import.meta.url));", `const __dirname = ${JSON.stringify(root)};`)
  .replace("import { createLaunchService, tokenBucket } from './launchLicence.js';", `import { createLaunchService, tokenBucket } from '${launchUrl}';`)
  .replace("from './entitlements.js';", `from '${entitlementsUrl}';`)
  .replace("import { createAccountDeleter, purgeResolvedReports, emailMarker, ERASED_COLLECTION } from './accountDeletion.js';", `import { createAccountDeleter, purgeResolvedReports, emailMarker, ERASED_COLLECTION } from '${accountUrl}';`)
  .replace("from './credits.js';", `from '${pathToFileURL(resolve(root, 'credits.js')).href}';`)
  .replace('const app = express();', 'export const app = express();')
  .replace("await import('firebase-admin/app')", 'await Promise.resolve(globalThis.__downloadTestAdminApp)')
  .replace("await import('firebase-admin/firestore')", 'await Promise.resolve(globalThis.__downloadTestAdminFirestore)')
  .replace("await import('firebase-admin/auth')", 'await Promise.resolve(globalThis.__downloadTestAdminAuth)')
  .replace("import('@google-cloud/storage')", 'Promise.resolve(globalThis.__downloadTestStorage)')
  .replace(/const PORT = process\.env\.PORT \|\| 8080;[\s\S]*?\n\);\s*$/, '')
  + '\nexport const __resetManifest = () => { manifestCache = { at: 0, value: null }; };\n';
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
function orderPayload(email, { event = 'order_created', id, status = 'paid', product = 5550, uid } = {}) {
  return JSON.stringify({ meta: { event_name: event, ...(uid ? { custom_data: { uid } } : {}) }, data: { id: String(id ?? ++orderSeq), attributes: { user_email: email, status, created_at: '2026-10-05T10:00:00Z', first_order_item: { product_id: product, variant_id: 1 } } } });
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

await test('no person cap (owner 2026-10-05): the 1,001st paid family order gets its seat', async () => {
  resetDb();
  state.db.docs.set('launch2/counter', { claimed: 999, downloads: 0 });
  await hook(orderPayload('last@example.com', { id: 'L1' }));
  assert.equal(state.db.docs.get('launch2/counter').claimed, 1000);
  const late = await hook(orderPayload('late@example.com', { id: 'L2' }));
  assert.notEqual(late.body.launch2, 'over-cap');
  const purchase = state.db.docs.get('launch2_purchases/late@example.com');
  assert.equal(Boolean(purchase.overCap), false);
  assert.equal(state.db.docs.get('launch2/counter').claimed, 1001);
  assert.equal(state.db.docs.has('launch2_seats/late@example.com'), true);
  assert.equal((await ticketReq('late', '10.0.4.50', 'koro', 'launch2')).response.status, 200);
});

await test('an unverified password account gets 403 on every download/claim route; a verified one proceeds', async () => {
  resetDb();
  await hook(orderPayload('unv-gus@example.com', { id: 'U1' }));
  const one = await ticketReq('unv-gus', '10.0.4.61', 'kubbe');
  const two = await ticketReq('unv-gus', '10.0.4.60', 'koro', 'launch2');
  const claim = await call('/api/launch/claim', { method: 'POST', headers: { ...headersFor('10.0.4.62'), authorization: 'Bearer valid-unv-gus' }, body: JSON.stringify({ launchId: 'launch' }) });
  for (const r of [one, two, claim]) { assert.equal(r.response.status, 403); assert.match(r.body.error, /Verify your e-mail/); assert.equal(r.body.url, undefined); }
  assert.equal((await call('/api/launch2/status', { headers: { ...headersFor('10.0.4.63'), authorization: 'Bearer valid-unv-gus' } })).response.status, 403);
  // No seat or licence was minted for the unverified account.
  assert.equal(state.db.docs.has('launch/counter') ? state.db.docs.get('launch/counter').claimed || 0 : 0, 0);
  // The same flow for a verified password account proceeds.
  assert.equal((await ticketReq('verified-gus', '10.0.4.64', 'kubbe')).response.status, 200);
  assert.equal(state.db.docs.get('launch/counter').claimed, 1);
});

const statusReq = (uid, ip) => call('/api/launch2/status', { headers: { ...headersFor(ip), authorization: `Bearer valid-${uid}` } });

await test('uid-bound paid order unlocks launch 2 for the verified account that clicked Buy (ticket, status, claim); an unverified one still gets 403', async () => {
  resetDb();
  // The buyer typed a different e-mail at checkout: only the uid ties the order to the account.
  const w = await hook(orderPayload('someone-else@mail.test', { id: 'B1', uid: 'ida' }));
  assert.equal(w.body.launch2, 'recorded');
  assert.equal(state.db.docs.get('launch2_uids/ida').orderId, 'B1');
  assert.equal(state.db.docs.get('launch2_purchases/someone-else@mail.test').uid, 'ida');
  assert.equal(state.db.docs.get('launch2/counter').claimed, 1);
  const t = await ticketReq('ida', '10.0.8.1', 'koro', 'launch2');
  assert.equal(t.response.status, 200);
  assert.ok(t.body.url);
  const st = await statusReq('ida', '10.0.8.2');
  assert.equal(st.response.status, 200);
  assert.equal(st.body.paid, true);
  const claim = await call('/api/launch/claim', { method: 'POST', headers: { ...headersFor('10.0.8.3'), authorization: 'Bearer valid-ida' }, body: JSON.stringify({ launchId: 'launch2' }) });
  assert.equal(claim.response.status, 200);
  assert.equal(claim.body.paid, true);
  // The same purchase bound to a not-yet-verified password uid opens nothing until the address is verified.
  await hook(orderPayload('other@mail.test', { id: 'B1b', uid: 'unv-ida2' }));
  assert.equal((await ticketReq('unv-ida2', '10.0.8.4', 'koro', 'launch2')).response.status, 403);
});

await test('e-mail-only order (no uid) still needs a verified e-mail or Google', async () => {
  resetDb();
  await hook(orderPayload('unv-ivy@example.com', { id: 'B2' }));
  await hook(orderPayload('ivy@example.com', { id: 'B3' }));
  await hook(orderPayload('google-ivy@example.com', { id: 'B4' }));
  assert.equal(state.db.docs.size > 0 && [...state.db.docs.keys()].some((k) => k.startsWith('launch2_uids/')), false);
  const unv = await ticketReq('unv-ivy', '10.0.8.10', 'koro', 'launch2');
  assert.equal(unv.response.status, 403);
  assert.equal(unv.body.url, undefined);
  assert.equal((await statusReq('unv-ivy', '10.0.8.11')).response.status, 403);
  assert.equal((await ticketReq('ivy', '10.0.8.12', 'koro', 'launch2')).response.status, 200);
  assert.equal((await ticketReq('google-ivy', '10.0.8.13', 'koro', 'launch2')).response.status, 200);
});

await test('a different uid with the same e-mail but no verification gets nothing', async () => {
  resetDb();
  // Order paid by uid "jay" with e-mail unv-jay@example.com; an unverified account "unv-jay" shares that e-mail.
  await hook(orderPayload('unv-jay@example.com', { id: 'B5', uid: 'jay' }));
  const t = await ticketReq('unv-jay', '10.0.8.20', 'koro', 'launch2');
  assert.equal(t.response.status, 403);
  assert.equal(t.body.url, undefined);
  assert.equal((await statusReq('unv-jay', '10.0.8.21')).response.status, 403);
  const claim = await call('/api/launch/claim', { method: 'POST', headers: { ...headersFor('10.0.8.22'), authorization: 'Bearer valid-unv-jay' }, body: JSON.stringify({ launchId: 'launch2' }) });
  assert.equal(claim.response.status, 403);
  // A uid that never paid and is unverified, with an unrelated e-mail, also gets 403 (not a free pass via someone else's uid).
  assert.equal((await ticketReq('unv-kim', '10.0.8.23', 'koro', 'launch2')).response.status, 403);
});

await test('refund by uid denies the uid-bound account and releases no seat', async () => {
  resetDb();
  await hook(orderPayload('lee-pay@mail.test', { id: 'B6', uid: 'lee' }));
  assert.equal((await ticketReq('lee', '10.0.8.30', 'koro', 'launch2')).response.status, 200);
  const r = await hook(orderPayload('lee-pay@mail.test', { event: 'order_refunded', id: 'B6', status: 'refunded' }));
  assert.equal(r.body.launch2, 'refunded');
  const t = await ticketReq('lee', '10.0.8.31', 'koro', 'launch2');
  assert.equal(t.response.status, 402);
  assert.equal(t.body.url, undefined);
  assert.equal((await statusReq('lee', '10.0.8.32')).response.status, 200);
  assert.equal((await statusReq('lee', '10.0.8.33')).body.paid, false);
  assert.equal(state.db.docs.get('launch2/counter').claimed, 1);
  assert.equal(state.db.docs.has('launch2_seats/lee-pay@mail.test'), true);
});

await test('uid-bound orders keep cap and one-seat-per-order rules; a bad uid is ignored', async () => {
  resetDb();
  state.db.docs.set('launch2/counter', { claimed: 999, downloads: 0 });
  await hook(orderPayload('m1@mail.test', { id: 'C1', uid: 'm1uid' }));
  const late = await hook(orderPayload('m2@mail.test', { id: 'C2', uid: 'm2uid' }));
  assert.notEqual(late.body.launch2, 'over-cap');   // no person cap since 2026-10-05
  assert.equal(state.db.docs.get('launch2/counter').claimed, 1001);
  assert.equal((await ticketReq('m1uid', '10.0.8.40', 'koro', 'launch2')).response.status, 200);
  assert.equal((await ticketReq('m2uid', '10.0.8.41', 'koro', 'launch2')).response.status, 200);
  // The same order again, and a second order bound to the same uid from another e-mail: no extra seat, uid keeps its first order.
  assert.equal((await hook(orderPayload('m1@mail.test', { id: 'C1', uid: 'm1uid' }))).body.launch2, 'duplicate');
  resetDb();
  await hook(orderPayload('n1@mail.test', { id: 'D1', uid: 'nuid' }));
  await hook(orderPayload('n2@mail.test', { id: 'D2', uid: 'nuid' }));
  assert.equal(state.db.docs.get('launch2_uids/nuid').orderId, 'D1');
  assert.equal(state.db.docs.get('launch2/counter').claimed, 2);
  // A uid that is not a plain Firebase uid is not stored as a document id.
  await hook(orderPayload('p1@mail.test', { id: 'E1', uid: 'a/b' }));
  assert.equal([...state.db.docs.keys()].some((k) => k.startsWith('launch2_uids/a')), false);
  assert.equal(state.db.docs.get('launch2_purchases/p1@mail.test').uid, undefined);
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
await test('a paid family order (LS_FAMILY_* or old LS_BUNDLE4_* ids) opens Kubbe and Kaset after the free 1,000, and shows in purchases status', async () => {
  resetDb({ claimed: 1000 });
  await hook(orderPayload('fam-a@example.com', { id: 'F1' }));
  assert.equal((await shop('fam-a', 'kubbe', '10.0.6.140')).response.status, 200);
  assert.equal((await shop('fam-a', 'kaset', '10.0.6.141')).response.status, 200);
  const st = await call('/api/purchases/status', { headers: { ...headersFor('10.0.6.142'), authorization: 'Bearer valid-fam-a' } });
  // The family opens all seven; each shows the purchase date and the date its 2 years of updates end.
  assert.deepEqual(st.body.owned, ['kubbe', 'kaset', 'koro', 'yanki', 'hava', 'mihenk', 'tutkal']);
  assert.equal(st.body.standing, 'paid');
  assert.equal(st.body.purchased.koro, '2026-10-05');
  assert.equal(st.body.updatesUntil.koro, '2028-10-05');
  assert.equal(st.body.updatesUntil.kubbe, '2028-10-05');
  assert.equal((await shop('fam-nobody', 'kubbe', '10.0.6.143')).response.status, 402);
  // New env names match too.
  delete process.env.LS_BUNDLE4_PRODUCT_ID; process.env.LS_FAMILY_PRODUCT_ID = '5550';
  try {
    await hook(orderPayload('fam-b@example.com', { id: 'F2' }));
    assert.equal((await shop('fam-b', 'kubbe', '10.0.6.144')).response.status, 200);
  } finally { delete process.env.LS_FAMILY_PRODUCT_ID; process.env.LS_BUNDLE4_PRODUCT_ID = '5550'; }
});
await test('before the free 1,000 are gone a paid order is not needed and claims still count', async () => {
  resetDb({ claimed: 5 });
  assert.equal((await shop('free-one', 'kubbe', '10.0.6.120')).response.status, 200);
  assert.equal(state.db.docs.get('launch/counter').claimed, 6);
});
await test('purchases status: full flag and owned slugs follow the paid orders', async () => {
  resetDb({ claimed: 1000 });
  state.db.docs.set('plugin_licenses/buyer-k@example.com', order('kaset', { created: '2026-10-05T10:00:00Z' }));
  const s = await call('/api/purchases/status', { headers: { ...headersFor('10.0.6.130'), authorization: 'Bearer valid-buyer-k' } });
  assert.equal(s.response.status, 200);
  assert.deepEqual(s.body, { full: true, owned: ['kaset'], standing: 'none', purchased: { kaset: '2026-10-05' }, updatesUntil: { kaset: '2028-10-05' } });
  const none = await call('/api/purchases/status', { headers: { ...headersFor('10.0.6.131'), authorization: 'Bearer valid-stranger' } });
  assert.deepEqual(none.body, { full: true, owned: [], standing: 'none', purchased: {}, updatesUntil: {} });
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
  const none = { owned: [], standing: 'none', purchased: {}, updatesUntil: {} };
  assert.deepEqual((await ask('10.0.7.10')).body, { full: false, ...none });
  state.db.docs.set('launch/counter', { claimed: 1000, downloads: 0 });
  assert.deepEqual((await ask('10.0.7.11')).body, { full: true, ...none });
});

await test('TUTKAL (seventh family product): family order opens it; no order 402; refunded denied; testers get it too', async () => {
  resetDb();
  const none = await ticketReq('tk-none', '10.0.9.1', 'tutkal', 'launch2');
  assert.equal(none.response.status, 402);
  assert.equal(none.body.url, undefined);
  await hook(orderPayload('tk-fam@example.com', { id: 'TK1' }));
  const ok = await ticketReq('tk-fam', '10.0.9.2', 'tutkal', 'launch2');
  assert.equal(ok.response.status, 200);
  assert.equal(decodeTicket(ok.body.url).slug, 'tutkal');
  assert.equal(ok.body.name, 'Tutkal-mac.zip');
  assert.equal(state.db.docs.get('downloads/tk-fam').tutkal.mac.count, 1);
  // The other six stay open for the same buyer (KORO here, KUBBE through launch 1 after the free 1,000).
  assert.equal((await ticketReq('tk-fam', '10.0.9.3', 'koro', 'launch2')).response.status, 200);
  // A refund closes it.
  await hook(orderPayload('tk-fam@example.com', { event: 'order_refunded', id: 'TK1', status: 'refunded' }));
  assert.equal((await ticketReq('tk-fam', '10.0.9.4', 'tutkal', 'launch2')).response.status, 402);
  // A hand-picked tester opens the five tester products, TUTKAL included (owner decision 2026-10-05), but not Kubbe.
  state.db.docs.set('launch2_testers/tk-test@example.com', { at: '2026-10-05T10:00:00Z' });
  assert.equal((await ticketReq('tk-test', '10.0.9.5', 'koro', 'launch2')).response.status, 200);
  assert.equal((await ticketReq('tk-test', '10.0.9.6', 'tutkal', 'launch2')).response.status, 200);
  const ts = await call('/api/purchases/status', { headers: { ...headersFor('10.0.9.8'), authorization: 'Bearer valid-tk-test' } });
  assert.deepEqual(ts.body.owned, ['koro', 'yanki', 'hava', 'mihenk', 'tutkal']);
  assert.equal(ts.body.standing, 'tester');
  assert.deepEqual(ts.body.updatesUntil, {});
  // TUTKAL does not exist on launch 1.
  assert.equal((await ticketReq('tk-fam', '10.0.9.7', 'tutkal')).response.status, 400);
});

await test('TUTKAL not published for a platform or not in the manifest yet: honest 404, no ticket, manifest lists it empty', async () => {
  resetDb();
  await hook(orderPayload('tk-soon@example.com', { id: 'TK2' }));
  // Windows build not published: the manifest lists mac only, the ticket says "not available yet".
  const m1 = await call('/api/download/manifest', { headers: { 'x-forwarded-for': '10.0.9.10' } });
  assert.deepEqual(Object.keys(m1.body.tutkal.files), ['mac']);
  const win = await ticketReq('tk-soon', '10.0.9.11', 'tutkal', 'launch2', 'win');
  assert.equal(win.response.status, 404);
  assert.equal(win.body.error, 'This download is not available yet');
  assert.equal(win.body.url, undefined);
  // The whole entry missing (manifest.json not updated yet).
  state.omitTutkal = true; server.__resetManifest();
  try {
    const m2 = await call('/api/download/manifest', { headers: { 'x-forwarded-for': '10.0.9.12' } });
    assert.deepEqual(m2.body.tutkal, { version: null, files: {} });
    assert.equal(m2.body.koro.files.mac.name, 'Koro-mac.zip');
    const t = await ticketReq('tk-soon', '10.0.9.13', 'tutkal', 'launch2');
    assert.equal(t.response.status, 404);
    assert.equal(t.body.error, 'This download is not available yet');
    assert.equal(state.db.docs.get('downloads/tk-soon'), undefined, 'a refused ticket counts no download');
  } finally { state.omitTutkal = false; server.__resetManifest(); }
});


// ---- Singles: every plugin can be bought on its own (owner decision 2026-10-05) ---------------------------------
const SLUG_IDS = { kubbe: 6001, kaset: 6002, koro: 6003, yanki: 6004, hava: 6005, mihenk: 6006, tutkal: 6007, bundle: 6008, family: 5550, taban: 6009, alev: 6010 };
process.env.LS_PRODUCT_SLUGS = Object.entries(SLUG_IDS).map(([slug, id]) => `${id}:${slug}`).join(',');
const SINGLE_SLUGS = ['koro', 'yanki', 'hava', 'mihenk', 'tutkal'];
const named = (email, { id, product, name, status = 'paid', event = 'order_created', uid, created = '2026-10-05T10:00:00Z' }) => JSON.stringify({
  meta: { event_name: event, ...(uid ? { custom_data: { uid } } : {}) },
  data: { id: String(id), attributes: { user_email: email, status, refunded: status === 'refunded', created_at: created, first_order_item: { product_id: product, product_name: name || null, variant_id: 1 } } },
});
const licPayload = (email, { id, key, product, orderId, event = 'license_key_created', uid, instances = 0, limit = 5, disabled = false }) => JSON.stringify({
  meta: { event_name: event, ...(uid ? { custom_data: { uid } } : {}) },
  data: { id: String(id), attributes: { user_email: email, key, key_short: key.slice(-4), status: disabled ? 'disabled' : 'active', disabled, activation_limit: limit, instances_count: instances, product_id: product, order_id: orderId, created_at: '2026-10-05T10:01:00Z' } },
});

for (const slug of SINGLE_SLUGS) {
  await test(`single ${slug}: a paid single order opens exactly ${slug} (launch 2), nothing else`, async () => {
    resetDb({ claimed: 1000 });
    const uid = `single-${slug}`;
    assert.equal((await ticketReq(uid, '10.0.11.1', slug, 'launch2')).response.status, 402, 'no order, no ticket');
    await hook(orderPayload(`${uid}@example.com`, { id: `S-${slug}`, product: SLUG_IDS[slug] }));
    const ok = await ticketReq(uid, '10.0.11.2', slug, 'launch2');
    assert.equal(ok.response.status, 200); assert.equal(decodeTicket(ok.body.url).slug, slug);
    for (const other of SINGLE_SLUGS.filter((x) => x !== slug)) assert.equal((await ticketReq(uid, '10.0.11.3', other, 'launch2')).response.status, 402, `${other} stays closed`);
    assert.equal((await shop(uid, 'kubbe', '10.0.11.4')).response.status, 402);
    assert.equal((await shop(uid, 'kaset', '10.0.11.5')).response.status, 402);
    const st = await call('/api/purchases/status', { headers: { ...headersFor('10.0.11.6'), authorization: `Bearer valid-${uid}` } });
    assert.deepEqual(st.body.owned, [slug]); assert.equal(st.body.standing, 'none');
    assert.equal(st.body.updatesUntil[slug], '2028-10-05');
    // The single is not a family seat: the counter is untouched and the 1,000 cap is not in play.
    assert.equal(state.db.docs.get('launch2/counter').claimed, 0);
    // A refund closes it again.
    await hook(named(`${uid}@example.com`, { id: `S-${slug}`, product: SLUG_IDS[slug], status: 'refunded', event: 'order_refunded' }));
    assert.equal((await ticketReq(uid, '10.0.11.7', slug, 'launch2')).response.status, 402);
  });
}
await test('single orders: pending, unmapped and unverified accounts open nothing; Kubbe/Kaset singles still work', async () => {
  resetDb({ claimed: 1000 });
  await hook(named('pend@example.com', { id: 'P1', product: SLUG_IDS.koro, status: 'pending' }));
  assert.equal((await ticketReq('pend', '10.0.12.1', 'koro', 'launch2')).response.status, 402);
  await hook(named('unmapped@example.com', { id: 'P2', product: 424242, name: 'Something else' }));
  assert.equal((await ticketReq('unmapped', '10.0.12.2', 'koro', 'launch2')).response.status, 402);
  await hook(orderPayload('unv-sing@example.com', { id: 'P3', product: SLUG_IDS.koro }));
  assert.equal((await ticketReq('unv-sing', '10.0.12.3', 'koro', 'launch2')).response.status, 403);
  await hook(orderPayload('kk@example.com', { id: 'P4', product: SLUG_IDS.kubbe }));
  assert.equal((await shop('kk', 'kubbe', '10.0.12.4')).response.status, 200);
  assert.equal((await ticketReq('kk', '10.0.12.5', 'koro', 'launch2')).response.status, 402);
});
await test('old $15 bundle orders keep working server-side (kubbe + kaset), nothing else', async () => {
  resetDb({ claimed: 1000 });
  await hook(orderPayload('oldb@example.com', { id: 'B1', product: SLUG_IDS.bundle }));
  assert.equal((await shop('oldb', 'kubbe', '10.0.13.1')).response.status, 200);
  assert.equal((await shop('oldb', 'kaset', '10.0.13.2')).response.status, 200);
  assert.equal((await ticketReq('oldb', '10.0.13.3', 'koro', 'launch2')).response.status, 402);
  const st = await call('/api/purchases/status', { headers: { ...headersFor('10.0.13.4'), authorization: 'Bearer valid-oldb' } });
  assert.deepEqual(st.body.owned, ['kubbe', 'kaset']);
});
// ---- Free plugins (FREE_SLUGS): a $0 Lemon Squeezy order is the entitlement ------------------------------------
const freeOrder = (email, { id, uid, status = 'paid', event = 'order_created' }) => JSON.stringify({
  meta: { event_name: event, ...(uid ? { custom_data: { uid } } : {}) },
  data: { id: String(id), attributes: { user_email: email, status, refunded: status === 'refunded', created_at: '2026-10-08T10:00:00Z', currency: 'USD', total: 0, total_usd: 0, tax_usd: 0, first_order_item: { product_id: SLUG_IDS.taban, product_name: 'TABAN', variant_id: 1 } } },
});
await test('free TABAN: a $0 order opens exactly TABAN (launchId free); no order 402; family, testers and admins do not get it from the family', async () => {
  resetDb({ claimed: 1000 });
  assert.equal((await ticketReq('fr1', '10.0.15.1', 'taban', 'free')).response.status, 402, 'no order, no ticket');
  const w = await hook(freeOrder('fr1@example.com', { id: 'F1', uid: 'fr1' }));
  assert.equal(w.response.status, 200); assert.equal(w.body.credits, 'free-order');
  assert.equal(state.db.docs.get('plugin_licenses/fr1@example.com').orders.F1.product, 'taban');
  const mac = await ticketReq('fr1', '10.0.15.2', 'taban', 'free');
  assert.equal(mac.response.status, 200); assert.equal(decodeTicket(mac.body.url).slug, 'taban'); assert.equal(mac.body.name, 'Taban-1.0.0-macOS.pkg');
  const win = await ticketReq('fr1', '10.0.15.3', 'taban', 'free', 'win');
  assert.equal(win.response.status, 200); assert.equal(win.body.name, 'Taban-1.0.0-Windows-VST3.zip');
  assert.equal(state.db.docs.get('downloads/fr1').taban.mac.count, 1);
  // The free order opens nothing else, and TABAN is not reachable through the other launch ids.
  assert.equal((await ticketReq('fr1', '10.0.15.4', 'koro', 'launch2')).response.status, 402);
  assert.equal((await ticketReq('fr1', '10.0.15.5', 'koro', 'free')).response.status, 400);
  assert.equal((await ticketReq('fr1', '10.0.15.6', 'taban', 'launch2')).response.status, 400);
  assert.equal((await ticketReq('fr1', '10.0.15.7', 'taban')).response.status, 400);
  const st = await call('/api/purchases/status', { headers: { ...headersFor('10.0.15.8'), authorization: 'Bearer valid-fr1' } });
  assert.deepEqual(st.body.owned, ['taban']); assert.equal(st.body.updatesUntil.taban, undefined, 'free plugins show no update end date');
  // A family buyer without the $0 order does not own TABAN (the order is the entitlement, and the e-mail list).
  await hook(named('famfree@example.com', { id: 'F2', product: SLUG_IDS.family, name: 'SubverseLab Plugin Family (7 plugins)', uid: 'famfree' }));
  assert.equal((await ticketReq('famfree', '10.0.15.9', 'taban', 'free')).response.status, 402);
  // The manifest lists TABAN with both platforms.
  const m = await call('/api/download/manifest', { headers: headersFor('10.0.15.10') });
  assert.deepEqual(Object.keys(m.body.taban.files).sort(), ['mac', 'win']);
});
await test('free ALEV: its own $0 order opens ALEV and not TABAN; a TABAN order does not open ALEV', async () => {
  resetDb({ claimed: 1000 });
  const alevOrder = (email, id, uid) => JSON.stringify({
    meta: { event_name: 'order_created', custom_data: { uid } },
    data: { id: String(id), attributes: { user_email: email, status: 'paid', refunded: false, created_at: '2026-10-08T10:00:00Z', currency: 'USD', total: 0, total_usd: 0, tax_usd: 0, first_order_item: { product_id: SLUG_IDS.alev, product_name: 'ALEV', variant_id: 1 } } },
  });
  assert.equal((await ticketReq('al1', '10.0.17.1', 'alev', 'free')).response.status, 402, 'no order, no ticket');
  const w = await hook(alevOrder('al1@example.com', 'A1', 'al1'));
  assert.equal(w.response.status, 200); assert.equal(w.body.credits, 'free-order');
  const mac = await ticketReq('al1', '10.0.17.2', 'alev', 'free');
  assert.equal(mac.response.status, 200); assert.equal(decodeTicket(mac.body.url).slug, 'alev'); assert.equal(mac.body.name, 'Alev-1.0.0-macOS.pkg');
  assert.equal((await ticketReq('al1', '10.0.17.3', 'taban', 'free')).response.status, 402, 'ALEV order does not open TABAN');
  const st = await call('/api/purchases/status', { headers: { ...headersFor('10.0.17.4'), authorization: 'Bearer valid-al1' } });
  assert.deepEqual(st.body.owned, ['alev']);
  await hook(freeOrder('tb1@example.com', { id: 'A2', uid: 'tb1' }));
  assert.equal((await ticketReq('tb1', '10.0.17.5', 'alev', 'free')).response.status, 402, 'TABAN order does not open ALEV');
});
await test('free TABAN: an unverified password account gets 403 even with the order', async () => {
  resetDb({ claimed: 1000 });
  await hook(freeOrder('unv-free@example.com', { id: 'F3' }));
  assert.equal((await ticketReq('unv-free', '10.0.16.1', 'taban', 'free')).response.status, 403);
});
await test('product name fallback (no LS_PRODUCT_SLUGS entry): plugin name maps to its slug, the family name never to the bundle', async () => {
  resetDb({ claimed: 1000 });
  const saved = process.env.LS_PRODUCT_SLUGS; process.env.LS_PRODUCT_SLUGS = '';
  try {
    await hook(named('byname@example.com', { id: 'N1', product: 777001, name: 'TUTKAL' }));
    assert.equal(state.db.docs.get('plugin_licenses/byname@example.com').orders.N1.product, 'tutkal');
    assert.equal((await ticketReq('byname', '10.0.14.1', 'tutkal', 'launch2')).response.status, 200);
    await hook(named('byfam@example.com', { id: 'N2', product: 777002, name: 'SubverseLab Plugin Family (KUBBE, KASET, KORO, YANKI, HAVA, MIHENK, TUTKAL)' }));
    assert.equal(state.db.docs.get('plugin_licenses/byfam@example.com').orders.N2.product, 'family');
    assert.equal((await shop('byfam', 'kubbe', '10.0.14.2')).response.status, 402, 'a family-named product that is not the configured family grants nothing');
  } finally { process.env.LS_PRODUCT_SLUGS = saved; }
});

// ---- Licence keys: stored from Lemon Squeezy's license_key_* webhooks, shown on the account page ----------------
await test('family order is recorded with its date; license_key_created / updated store the key, order, uid and activation count', async () => {
  resetDb({ claimed: 1000 });
  const mail = 'keyfam@example.com';
  const r = await hook(named(mail, { id: 'K1', product: SLUG_IDS.family, name: 'SubverseLab Plugin Family (7 plugins)', uid: 'keyfam' }));
  assert.equal(r.body.launch2, 'recorded');
  const order1 = state.db.docs.get(`plugin_licenses/${mail}`).orders.K1;
  assert.equal(order1.product, 'family'); assert.equal(order1.created, '2026-10-05T10:00:00Z'); assert.equal(order1.uid, 'keyfam');
  assert.equal((await hook(licPayload(mail, { id: 'L1', key: 'FAMILY-KEY-0001', product: SLUG_IDS.family, orderId: 'K1', uid: 'keyfam' }))).body.ok, true);
  assert.equal((await hook(licPayload(mail, { id: 'L1', key: 'FAMILY-KEY-0001', product: SLUG_IDS.family, orderId: 'K1', uid: 'keyfam', event: 'license_key_updated', instances: 2 }))).body.ok, true);
  const stored = state.db.docs.get(`plugin_licenses/${mail}`).licenses.L1;
  assert.deepEqual([stored.key, stored.product, stored.order_id, stored.uid, stored.instances_count, stored.activation_limit], ['FAMILY-KEY-0001', 'family', 'K1', 'keyfam', 2, 5]);
  const out = await call('/api/purchases/licenses', { headers: { ...headersFor('10.0.15.1'), authorization: 'Bearer valid-keyfam' } });
  assert.equal(out.response.status, 200);
  assert.equal(out.body.licenses.length, 1);
  const l = out.body.licenses[0];
  assert.deepEqual([l.key, l.product, l.productName, l.instancesCount, l.activationLimit, l.orderId, l.purchased, l.updatesUntil], ['FAMILY-KEY-0001', 'family', 'SubverseLab Plugin Family (7 plugins)', 2, 5, 'K1', '2026-10-05', '2028-10-05']);
  // The family record never grants a plugin by itself (the family opens through launch2 purchases only).
  assert.deepEqual(state.db.docs.get('launch2_purchases/' + mail).orderId, 'K1');
});
await test('a refunded family order does not open anything through its plugin_licenses record; a disabled key is not shown', async () => {
  resetDb({ claimed: 1000 });
  const mail = 'keyref@example.com';
  await hook(named(mail, { id: 'K2', product: SLUG_IDS.family, name: 'Family', uid: 'keyref' }));
  await hook(licPayload(mail, { id: 'L2', key: 'FAMILY-KEY-0002', product: SLUG_IDS.family, orderId: 'K2' }));
  await hook(named(mail, { id: 'K2', product: SLUG_IDS.family, name: 'Family', status: 'refunded', event: 'order_refunded' }));
  await hook(licPayload(mail, { id: 'L2', key: 'FAMILY-KEY-0002', product: SLUG_IDS.family, orderId: 'K2', event: 'license_key_updated', disabled: true }));
  assert.equal(state.db.docs.get(`plugin_licenses/${mail}`).orders.K2.refunded, true);
  assert.equal((await shop('keyref', 'kubbe', '10.0.15.2')).response.status, 402);
  assert.equal((await ticketReq('keyref', '10.0.15.3', 'koro', 'launch2')).response.status, 402);
  const out = await call('/api/purchases/licenses', { headers: { ...headersFor('10.0.15.4'), authorization: 'Bearer valid-keyref' } });
  assert.deepEqual(out.body.licenses, []);
});
await test('single plugin key: shown with its plugin name and the 2-year updates date; another account never sees it', async () => {
  resetDb({ claimed: 1000 });
  await hook(named('keyone@example.com', { id: 'K3', product: SLUG_IDS.hava, name: 'HAVA', created: '2026-11-20T08:00:00Z' }));
  await hook(licPayload('keyone@example.com', { id: 'L3', key: 'HAVA-KEY-0003', product: SLUG_IDS.hava, orderId: 'K3' }));
  const out = await call('/api/purchases/licenses', { headers: { ...headersFor('10.0.15.5'), authorization: 'Bearer valid-keyone' } });
  assert.deepEqual(out.body.licenses.map((x) => [x.key, x.product, x.productName, x.updatesUntil]), [['HAVA-KEY-0003', 'hava', 'HAVA', '2028-11-20']]);
  const st = await call('/api/purchases/status', { headers: { ...headersFor('10.0.15.6'), authorization: 'Bearer valid-keyone' } });
  assert.equal(st.body.updatesUntil.hava, '2028-11-20');
  const other = await call('/api/purchases/licenses', { headers: { ...headersFor('10.0.15.7'), authorization: 'Bearer valid-keyother' } });
  assert.deepEqual(other.body, { licenses: [] });
});
await test('family paid under another checkout e-mail but bound to the account: that account sees the key and the plugins', async () => {
  resetDb({ claimed: 1000 });
  await hook(named('billing@example.com', { id: 'K4', product: SLUG_IDS.family, name: 'Family', uid: 'bound' }));
  await hook(licPayload('billing@example.com', { id: 'L4', key: 'FAMILY-KEY-0004', product: SLUG_IDS.family, orderId: 'K4', uid: 'bound' }));
  await hook(named('billing@example.com', { id: 'K5', product: SLUG_IDS.family, name: 'Family', uid: 'someoneelse' }));
  await hook(licPayload('billing@example.com', { id: 'L5', key: 'FAMILY-KEY-0005', product: SLUG_IDS.family, orderId: 'K5' }));
  const out = await call('/api/purchases/licenses', { headers: { ...headersFor('10.0.15.8'), authorization: 'Bearer valid-bound' } });
  assert.deepEqual(out.body.licenses.map((x) => x.key), ['FAMILY-KEY-0004'], 'only the key of the order bound to this uid');
  const st = await call('/api/purchases/status', { headers: { ...headersFor('10.0.15.9'), authorization: 'Bearer valid-bound' } });
  assert.equal(st.body.owned.length, 7); assert.equal(st.body.updatesUntil.mihenk, '2028-10-05');
  const stranger = await call('/api/purchases/licenses', { headers: { ...headersFor('10.0.15.10'), authorization: 'Bearer valid-strangerx' } });
  assert.deepEqual(stranger.body, { licenses: [] });
});
await test('updates date: purchase date + 2 years, latest purchase wins, no date when the order has none', async () => {
  resetDb({ claimed: 1000 });
  state.db.docs.set('plugin_licenses/dates@example.com', { orders: {
    a: { order_id: 'a', product: 'koro', status: 'paid', refunded: false, created: '2026-10-05T10:00:00Z' },
    b: { order_id: 'b', product: 'koro', status: 'paid', refunded: false, created: '2027-02-28T10:00:00Z' },
    c: { order_id: 'c', product: 'yanki', status: 'paid', refunded: false },
    d: { order_id: 'd', product: 'hava', status: 'paid', refunded: true, created: '2026-10-05T10:00:00Z' },
  } });
  const st = await call('/api/purchases/status', { headers: { ...headersFor('10.0.16.1'), authorization: 'Bearer valid-dates' } });
  assert.deepEqual(st.body.owned, ['koro', 'yanki']);
  assert.deepEqual(st.body.updatesUntil, { koro: '2029-02-28' });
  assert.deepEqual(st.body.purchased, { koro: '2027-02-28', yanki: null });
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

// ---- Admin preview: the owner sees what a family buyer sees; nothing is stored for it ----
const authReq = (path, uid, ip) => call(path, { headers: { 'x-forwarded-for': ip, authorization: `Bearer valid-${uid}` } });
const snapshotDocs = () => JSON.stringify([...state.db.docs.entries()].sort(([x], [y]) => x.localeCompare(y)));

await test('admin preview: verified admin gets paid status, all seven slugs, today as purchase date and a 2-year updates date', async () => {
  resetDb();
  const st = await authReq('/api/launch2/status', 'admin1', '10.9.0.1');
  assert.deepEqual([st.response.status, st.body.paid, st.body.tester, st.body.standing], [200, true, false, 'paid']);
  const ps = await authReq('/api/purchases/status', 'admin1', '10.9.0.2');
  assert.equal(ps.response.status, 200);
  assert.deepEqual(ps.body.owned, ['kubbe', 'kaset', 'koro', 'yanki', 'hava', 'mihenk', 'tutkal']);
  assert.equal(ps.body.standing, 'paid');
  const today = new Date().toISOString().slice(0, 10);
  const inTwo = `${Number(today.slice(0, 4)) + 2}${today.slice(4)}`;
  for (const slug of ps.body.owned) { assert.equal(ps.body.purchased[slug], today); assert.equal(ps.body.updatesUntil[slug], inTwo); }
  const google = await authReq('/api/purchases/status', 'google-admin2', '10.9.0.3');
  assert.equal(google.body.owned.length, 7);
});

await test('admin preview: tickets for every published platform of all seven plugins; no counter, seat or downloads doc is touched', async () => {
  resetDb({ claimed: 1000, downloads: 5 });
  const before = snapshotDocs();
  const published = { kubbe: ['mac', 'win'], kaset: ['mac', 'win'], koro: ['mac'], yanki: ['mac'], hava: ['mac'], mihenk: ['mac'], tutkal: ['mac'] };
  let n = 0;
  for (const [slug, platforms] of Object.entries(published)) {
    for (const platform of platforms) {
      const r = await ticketReq('admin3', `10.9.1.${++n}`, slug, ['kubbe', 'kaset'].includes(slug) ? 'launch' : 'launch2', platform);
      assert.equal(r.response.status, 200, `${slug} ${platform}`);
      const file = await call(r.body.url, { headers: { 'x-forwarded-for': '10.9.1.200' } });
      assert.equal(file.body, `${slug.toUpperCase()}-${platform.toUpperCase()}`);
    }
  }
  assert.equal(n, 9);
  assert.equal(snapshotDocs(), before, 'admin downloads must not write any document');
  // Kubbe/Kaset also through the launch2 room is refused only by the slug list, as for any buyer.
  assert.equal((await ticketReq('admin3', '10.9.1.250', 'koro', 'launch2', 'win')).response.status, 404);
});

await test('admin preview: licences list shows one clearly fake family entry and stores nothing', async () => {
  resetDb();
  const before = snapshotDocs();
  const r = await authReq('/api/purchases/licenses', 'admin4', '10.9.2.1');
  assert.equal(r.response.status, 200);
  assert.equal(r.body.licenses.length, 1);
  const l = r.body.licenses[0];
  assert.equal(l.key, 'ADMIN-PREVIEW (no real licence key)');
  assert.deepEqual([l.product, l.productName, l.activationLimit, l.instancesCount, l.preview], ['family', 'SubverseLab plugin family', 5, 0, true]);
  assert.ok(l.purchased && l.updatesUntil);
  assert.equal(snapshotDocs(), before);
  for (const path of state.db.docs.keys()) assert.ok(!/^(plugin_licenses|launch2_purchases|launch2_seats|launch2_uids|credits|credit)/.test(path), path);
});

await test('admin preview: an unverified admin e-mail password account gets nothing extra; a normal user is unaffected', async () => {
  resetDb();
  for (const [uid, path] of [['unv-admin5', '/api/launch2/status'], ['unv-admin5', '/api/purchases/status'], ['unv-admin5', '/api/purchases/licenses']]) {
    const r = await authReq(path, uid, `10.9.3.${path.length}`);
    assert.equal(r.response.status, 403, path);
    assert.equal(r.body.paid, undefined); assert.equal(r.body.owned, undefined); assert.equal(r.body.licenses, undefined);
  }
  const t = await ticketReq('unv-admin5', '10.9.3.90', 'koro', 'launch2');
  assert.equal(t.response.status, 403);
  assert.equal(t.body.url, undefined);
  const st = await authReq('/api/launch2/status', 'normal6', '10.9.3.91');
  assert.deepEqual([st.body.paid, st.body.standing], [false, 'none']);
  const ps = await authReq('/api/purchases/status', 'normal6', '10.9.3.92');
  assert.deepEqual(ps.body.owned, []);
  assert.equal((await authReq('/api/purchases/licenses', 'normal6', '10.9.3.93')).body.licenses.length, 0);
  assert.equal((await ticketReq('normal6', '10.9.3.94', 'koro', 'launch2')).response.status, 402);
});

await test('admin preview: an admin session does not change what another user sees or the counters', async () => {
  resetDb({ claimed: 1000, downloads: 0 });
  await authReq('/api/purchases/status', 'admin7', '10.9.4.1');
  await ticketReq('admin7', '10.9.4.2', 'tutkal', 'launch2');
  assert.deepEqual(state.db.docs.get('launch2/counter'), { claimed: 0, downloads: 0 });
  assert.deepEqual(state.db.docs.get('launch/counter'), { claimed: 1000, downloads: 0 });
  assert.deepEqual((await authReq('/api/purchases/status', 'normal8', '10.9.4.3')).body.owned, []);
});

const failed = results.filter((result) => !result.ok);
console.log(`SUMMARY ${results.length} cases, ${failed.length} fail`);
console.log(`LAST_CASE_LINES ${JSON.stringify(results.map((result) => result.last))}`);
process.exitCode = failed.length ? 1 : 0;
