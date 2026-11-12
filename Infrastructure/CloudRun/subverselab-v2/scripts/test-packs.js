// Local-only tests for the sample-pack applications (POST /api/packs/apply and the
// admin list). No Google credentials, network, or deploy.
// Run: node scripts/test-packs.js
import assert from 'node:assert/strict';
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

// Firestore's transaction contract is modelled by a serial commit queue, as in
// test-download.js, plus what the tester routes need: delete, listing a
// collection, orderBy/limit and auto-id documents.
function fakeFirestore() {
  const docs = new Map();
  let autoId = 0;
  const snap = (path) => ({ id: path.split('/').pop(), exists: docs.has(path), data: () => clone(docs.get(path)) });
  const ref = (path) => ({
    path,
    get: async () => snap(path),
    set: async (data, options) => docs.set(path, options?.merge ? merge(docs.get(path), data) : clone(data)),
    delete: async () => docs.delete(path),
    collection: (sub) => collection(`${path}/${sub}`),
  });
  const query = (name, order, max) => ({
    orderBy: (field, dir) => query(name, { field, dir }, max),
    limit: (n) => query(name, order, n),
    get: async () => {
      let paths = [...docs.keys()].filter((p) => p.startsWith(`${name}/`) && !p.slice(name.length + 1).includes('/'));
      if (order) paths.sort((a, b) => String(docs.get(a)[order.field]).localeCompare(String(docs.get(b)[order.field])) * (order.dir === 'desc' ? -1 : 1));
      if (max) paths = paths.slice(0, max);
      return { docs: paths.map(snap) };
    },
  });
  const collection = (name) => ({ doc: (id = `auto${++autoId}`) => ref(`${name}/${id}`), ...query(name) });
  let queue = Promise.resolve();
  return {
    docs,
    collection,
    runTransaction(callback) {
      const run = queue.then(async () => {
        const writes = [];
        const tx = {
          get: async (document) => snap(document.path),
          set: (document, data, options) => writes.push(() => document.set(data, options)),
          delete: (document) => writes.push(() => document.delete()),
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
        tutkal: { version: '1.0.0', files: { mac: { name: 'Tutkal-mac.zip', size: 10, object: 'plugins/tutkal/1.0.0/Tutkal-mac.zip' } } },
      }))],
    }) }),
  };
}

const state = { db: fakeFirestore(), storage: fakeStorage() };
state.auth = { verifyIdToken: async (token) => {
  if (!token.startsWith('valid-')) throw new Error('invalid token');
  const uid = token.slice(6);
  return { uid, email: uid === 'owner' ? 'info@subverselab.com' : uid.includes('nomx') ? `${uid}@nomx.invalid` : `${uid}@Example.com`, email_verified: !uid.startsWith('unv-') };
} };
state.FieldValue = { serverTimestamp: () => '<server-time>' };
globalThis.__testersTestAdminApp = { initializeApp() {}, applicationDefault() {}, getApps: () => [] };
globalThis.__testersTestAdminFirestore = { getFirestore: () => state.db, FieldValue: state.FieldValue };
globalThis.__testersTestAdminAuth = { getAuth: () => state.auth };
globalThis.__testersTestStorage = { Storage: class { constructor() { return state.storage; } } };

const serverSource = await readFile(resolve(root, 'api/server.js'), 'utf8');
const launchUrl = pathToFileURL(resolve(root, 'api/launchLicence.js')).href;
const entitlementsUrl = pathToFileURL(resolve(root, 'api/entitlements.js')).href;
const accountUrl = pathToFileURL(resolve(root, 'api/accountDeletion.js')).href;
const transformed = serverSource
  .replace("import express from 'express';", `import express from '${pathToFileURL(require.resolve('express')).href}';`)
  .replace("import compression from 'compression';", `import compression from '${pathToFileURL(require.resolve('compression')).href}';`)
  .replace("const __dirname = dirname(fileURLToPath(import.meta.url));", `const __dirname = ${JSON.stringify(resolve(root, 'api'))};`)
  .replace("import { createLaunchService, tokenBucket } from './launchLicence.js';", `import { createLaunchService, tokenBucket } from '${launchUrl}';`)
  .replace("from './entitlements.js';", `from '${entitlementsUrl}';`)
  .replace("import { createAccountDeleter, purgeResolvedReports, emailMarker, ERASED_COLLECTION } from './accountDeletion.js';", `import { createAccountDeleter, purgeResolvedReports, emailMarker, ERASED_COLLECTION } from '${accountUrl}';`)
  .replace("from './credits.js';", `from '${pathToFileURL(resolve(root, 'api/credits.js')).href}';`)
  .replace("from './inbox.js';", `from '${pathToFileURL(resolve(root, 'api/inbox.js')).href}';`)
  .replace("from './stats.js';", `from '${pathToFileURL(resolve(root, 'api/stats.js')).href}';`)
  .replace("from './catalog.js';", `from '${pathToFileURL(resolve(root, 'api/catalog.js')).href}';`)
  .replace("from './catalogSchema.js';", `from '${pathToFileURL(resolve(root, 'api/catalogSchema.js')).href}';`)
  .replace("from './agents.js';", `from '${pathToFileURL(resolve(root, 'api/agents.js')).href}';`)
  .replace("from './trialGrant.js';", `from '${pathToFileURL(resolve(root, 'api/trialGrant.js')).href}';`)
  .replace("from './partners.js';", `from '${pathToFileURL(resolve(root, 'api/partners.js')).href}';`)
  .replace('const app = express();', 'export const app = express();')
  .replace("await import('firebase-admin/app')", 'await Promise.resolve(globalThis.__testersTestAdminApp)')
  .replace("await import('firebase-admin/firestore')", 'await Promise.resolve(globalThis.__testersTestAdminFirestore)')
  .replace("await import('firebase-admin/auth')", 'await Promise.resolve(globalThis.__testersTestAdminAuth)')
  .replace("import('@google-cloud/storage')", 'Promise.resolve(globalThis.__testersTestStorage)')
  .replace(/const PORT = process\.env\.PORT \|\| 8080;[\s\S]*?\n\);\s*$/, '');
const server = await import(`data:text/javascript;base64,${Buffer.from(transformed).toString('base64')}`);
// No test touches DNS: every domain has a mail server unless it is nomx.invalid.
const entitlements = await import(entitlementsUrl);
entitlements.setMxResolver(async (domain) => {
  if (domain === 'nomx.invalid') throw Object.assign(new Error('queryMx ENODATA'), { code: 'ENODATA' });
  return [{ exchange: `mx.${domain}`, priority: 10 }];
});
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
function resetDb() {
  state.db.docs.clear();
  state.db.docs.set('launch/counter', { claimed: 0, downloads: 0 });
  state.db.docs.set('launch2/counter', { claimed: 3, downloads: 0 });
}
const results = [];
async function test(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, ok: false }); console.log(`FAIL ${name}: ${error.message}`); }
}

// Every call gets its own IP so the per-IP rate limits never interfere.
let ipCounter = 0;
const nextIp = () => `10.9.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
const as = (uid, method, path, body) => call(path, {
  method,
  headers: { ...headersFor(nextIp()), ...(uid ? { authorization: `Bearer valid-${uid}` } : {}) },
  body: body === undefined ? undefined : JSON.stringify(body),
});
const IP = '10.77.0.1';
const GOOD = {
  name: 'Ada Kaya', email: 'Ada@Example.com', artist: 'Ada K', country: 'Turkey',
  links: ['https://instagram.com/adak', 'https://adak.beatstars.com'], kinds: ['drum kits', 'loops'],
  storeUrl: 'https://adak.gumroad.com/l/kit', message: 'Three kits ready.', rightsConfirmed: true,
};
const apply = (patch = {}, { uid, ip = nextIp() } = {}) => call('/api/packs/apply', {
  method: 'POST',
  headers: { ...headersFor(ip), ...(uid ? { authorization: `Bearer valid-${uid}` } : {}) },
  body: JSON.stringify({ ...GOOD, ...patch }),
});
const list = (uid) => as(uid, 'GET', '/api/admin/pack-applications');
const stored = (email) => state.db.docs.get(`pack_applications/${email}`);

await test('a valid application: 200 and a stored doc keyed by the lower-cased e-mail', async () => {
  resetDb();
  const r = await apply();
  assert.equal(r.response.status, 200);
  assert.deepEqual(r.body, { ok: true });
  const doc = stored('ada@example.com');
  assert.ok(doc, 'doc stored');
  assert.equal(doc.email, 'ada@example.com');
  assert.equal(doc.name, 'Ada Kaya');
  assert.equal(doc.artist, 'Ada K');
  assert.equal(doc.country, 'Turkey');
  assert.deepEqual(doc.links, GOOD.links);
  assert.deepEqual(doc.kinds, ['drum kits', 'loops']);
  assert.equal(doc.storeUrl, GOOD.storeUrl);
  assert.equal(doc.rightsConfirmed, true);
  assert.equal(doc.uid, null);
  assert.equal(doc.status, 'new');
  assert.ok(doc.createdAt && doc.updatedAt);
});

await test('a signed-in caller adds the uid; optional fields may be empty; message is capped at 1,000', async () => {
  resetDb();
  const r = await apply({ email: 'bo@example.com', country: '', kinds: [], storeUrl: '', message: 'm'.repeat(3000) }, { uid: 'bo' });
  assert.equal(r.response.status, 200);
  const doc = stored('bo@example.com');
  assert.equal(doc.uid, 'bo');
  assert.equal(doc.message.length, 1000);
  assert.deepEqual(doc.kinds, []);
  assert.equal(doc.storeUrl, '');
  const bad = await apply({ email: 'cy@example.com' }, { uid: undefined });
  assert.equal(bad.response.status, 200);
  assert.equal(stored('cy@example.com').uid, null);
});

await test('a missing required field is 400 and stores nothing', async () => {
  resetDb();
  for (const patch of [{ name: '  ' }, { email: '' }, { artist: '' }, { links: [] }, { links: ['   '] }, { links: undefined }, { links: ['javascript:alert(1)'] }, { storeUrl: 'ftp://x' }]) {
    const r = await apply(patch);
    assert.equal(r.response.status, 400, JSON.stringify(patch));
  }
  assert.equal([...state.db.docs.keys()].filter((k) => k.startsWith('pack_applications/')).length, 0);
});

await test('rights not confirmed is 400, including a truthy non-true value', async () => {
  resetDb();
  assert.equal((await apply({ rightsConfirmed: false })).response.status, 400);
  assert.equal((await apply({ rightsConfirmed: 'true' })).response.status, 400);
  assert.equal((await apply({ rightsConfirmed: undefined })).response.status, 400);
  assert.equal(stored('ada@example.com'), undefined);
});

await test('a bounced or no-MX address is 403 with the "cannot receive mail" text', async () => {
  resetDb();
  const nomx = await apply({ email: 'who@nomx.invalid' });
  assert.equal(nomx.response.status, 403);
  assert.match(nomx.body.error, /cannot receive mail/);
  state.db.docs.set('bounced_emails/gone@example.com', { at: '2026-10-05T00:00:00Z' });
  const bounced = await apply({ email: 'gone@example.com' });
  assert.equal(bounced.response.status, 403);
  assert.match(bounced.body.error, /cannot receive mail/);
  assert.equal([...state.db.docs.keys()].filter((k) => k.startsWith('pack_applications/')).length, 0);
});

await test('sending again updates the doc and keeps createdAt', async () => {
  resetDb();
  assert.equal((await apply()).response.status, 200);
  const first = stored('ada@example.com');
  state.db.docs.get('pack_applications/ada@example.com').createdAt = '2026-01-01T00:00:00.000Z';
  const r = await apply({ email: 'ADA@example.com', artist: 'Ada K (new name)', kinds: ['vocals'] });
  assert.equal(r.response.status, 200);
  const doc = stored('ada@example.com');
  assert.equal(doc.createdAt, '2026-01-01T00:00:00.000Z');
  assert.notEqual(doc.updatedAt, '2026-01-01T00:00:00.000Z');
  assert.equal(doc.artist, 'Ada K (new name)');
  assert.deepEqual(doc.kinds, ['vocals']);
  assert.equal(doc.status, 'new');
  assert.equal([...state.db.docs.keys()].filter((k) => k.startsWith('pack_applications/')).length, 1);
  assert.ok(first.createdAt);
});

await test('rate limit: the sixth application from one IP within the hour is 429, another IP is unaffected', async () => {
  resetDb();
  for (let i = 1; i <= 5; i++) assert.equal((await apply({ email: `rl${i}@example.com` }, { ip: IP })).response.status, 200, `try ${i}`);
  const sixth = await apply({ email: 'rl6@example.com' }, { ip: IP });
  assert.equal(sixth.response.status, 429);
  assert.equal(stored('rl6@example.com'), undefined);
  assert.equal((await apply({ email: 'rl7@example.com' }, { ip: '10.77.0.2' })).response.status, 200);
});

await test('admin list: an admin gets the list newest first; a non-admin and no token are refused', async () => {
  resetDb();
  state.db.docs.set('pack_applications/old@example.com', { name: 'Old', artist: 'O', links: ['https://o.example'], kinds: [], createdAt: '2026-10-01T00:00:00.000Z' });
  state.db.docs.set('pack_applications/new@example.com', { name: 'New', artist: 'N', links: ['https://n.example'], kinds: ['loops'], createdAt: '2026-10-09T00:00:00.000Z' });
  const ok = await list('owner');
  assert.equal(ok.response.status, 200);
  assert.deepEqual(ok.body.applications.map((a) => a.email), ['new@example.com', 'old@example.com']);
  assert.equal((await list('someone')).response.status, 403);
  assert.equal((await list(undefined)).response.status, 401);
});

await test('firestore.rules: pack_applications has no client access', async () => {
  const rules = await readFile(resolve(root, 'firestore.rules'), 'utf8');
  assert.match(rules, /match \/pack_applications\/\{document=\*\*\} \{\s*allow read, write: if false;/);
});

const failed = results.filter((result) => !result.ok);
console.log(`SUMMARY ${results.length} cases, ${failed.length} fail`);
process.exitCode = failed.length ? 1 : 0;
