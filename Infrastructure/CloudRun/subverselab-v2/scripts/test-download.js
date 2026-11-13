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
    id: path.split('/').pop(),
    get: async () => snap(path),
    set: async (data, options) => docs.set(path, options?.merge ? merge(docs.get(path), data) : clone(data)),
    delete: async () => docs.delete(path),
    collection: (sub) => collection(`${path}/${sub}`),
  });
  // A collection: doc(), and orderBy(field, dir).limit(n).get() over the documents directly under it.
  const collection = (name) => {
    const query = (order, max) => ({
      orderBy: (field, dir) => query({ field, dir }, max),
      limit: (n) => query(order, n),
      get: async () => {
        let paths = [...docs.keys()].filter((p) => p.startsWith(`${name}/`) && !p.slice(name.length + 1).includes('/'));
        if (order) paths.sort((a, b) => String(docs.get(a)[order.field]).localeCompare(String(docs.get(b)[order.field])) * (order.dir === 'desc' ? -1 : 1));
        if (max) paths = paths.slice(0, max);
        return { docs: paths.map((p) => ({ ...snap(p), id: p.split('/').pop(), ref: ref(p) })) };
      },
    });
    // where(field, '==', value).get(): equality only (trialGrant.js looks device codes up by user_code).
    const where = (field, op, value) => ({ get: async () => ({ docs: [...docs.keys()].filter((p) => p.startsWith(`${name}/`) && !p.slice(name.length + 1).includes('/') && docs.get(p)?.[field] === value).map((p) => ({ ...snap(p), id: p.split('/').pop(), ref: ref(p) })) }) });
    return { doc: (id) => ref(`${name}/${id}`), where, ...query(null, null) };
  };
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
    ['plugins/kiyma/1.0.0/Kiyma-1.0.0-macOS.pkg', { name: 'Kiyma-1.0.0-macOS.pkg', body: 'KIYMA-MAC' }],
    ['plugins/kiyma/1.0.0/Kiyma-1.0.0-Windows-VST3.zip', { name: 'Kiyma-1.0.0-Windows-VST3.zip', body: 'KIYMA-WIN' }],
    ['plugins/elek/1.0.0/Elek-1.0.0-macOS.zip', { name: 'Elek-1.0.0-macOS.zip', body: 'ELEK-MAC' }],
    ['plugins/ahenk/1.0.0/AHENK-1.0.0-macOS.pkg', { name: 'AHENK-1.0.0-macOS.pkg', body: 'AHENK-MAC' }],
    ['plugins/ahenk/1.0.0/AHENK-1.0.0-Windows.zip', { name: 'AHENK-1.0.0-Windows.zip', body: 'AHENK-WIN' }],
    ['plugins/elek/1.0.0/Elek-1.0.0-big.pkg', { name: 'plugins/elek/1.0.0/Elek-1.0.0-macOS.pkg', body: 'ELEK-BIG', size: 680334241 }],
    ['ahenk/pianos/v1/manifest.json', { name: 'ahenk/pianos/v1/manifest.json', body: '{"format":1,"packs":[]}' }],
    ['ahenk/pianos/v1/core/core-01.zip', { name: 'ahenk/pianos/v1/core/core-01.zip', body: 'CORE-PART' }],
    ['ahenk/pianos/v1/upright/upright-01.zip', { name: 'ahenk/pianos/v1/upright/upright-01.zip', body: 'UPRIGHT-PART', size: 63709168 }],
    ['plugins/ahenk/secret.zip', { name: 'plugins/ahenk/secret.zip', body: 'PAID' }],
  ]);
  return {
    bucket: () => ({ file: (object) => ({
      getMetadata: async () => {
        const file = files.get(object);
        if (!file) throw new Error('not found');
        return [{ name: file.name, size: file.size ?? file.body.length }];
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
        // KIYMA: the third free plugin (15 Oct 2026), both platforms.
        kiyma: { version: '1.0.0', files: {
          mac: { name: 'Kiyma-1.0.0-macOS.pkg', size: 9, object: 'plugins/kiyma/1.0.0/Kiyma-1.0.0-macOS.pkg' },
          win: { name: 'Kiyma-1.0.0-Windows-VST3.zip', size: 9, object: 'plugins/kiyma/1.0.0/Kiyma-1.0.0-Windows-VST3.zip' },
        } },
        // AHENK (7 Nov 2026): a trial product (trialGrant.js TRIAL_PRODUCTS); its installer is free for any signed-in account.
        ahenk: { version: '1.0.0', files: {
          mac: { name: 'AHENK-1.0.0-macOS.pkg', size: 9, object: 'plugins/ahenk/1.0.0/AHENK-1.0.0-macOS.pkg' },
          win: { name: 'AHENK-1.0.0-Windows.zip', size: 9, object: 'plugins/ahenk/1.0.0/AHENK-1.0.0-Windows.zip' },
        } },
        elek: { version: '1.0.0', files: { mac: { name: 'Elek-1.0.0-macOS.zip', size: 8, object: 'plugins/elek/1.0.0/Elek-1.0.0-macOS.zip' } } },
        // RU-8 (16 Oct): macOS and Windows at launch. Packs: one zip each (platform 'zip').
        ru8: { version: '1.0.0', files: {
          mac: { name: 'RU-8-1.0.0-macOS.pkg', size: 7, object: 'plugins/ru8/1.0.0/RU-8-1.0.0-macOS.pkg' },
          win: { name: 'RU-8-1.0.0-Windows.zip', size: 7, object: 'plugins/ru8/1.0.0/RU-8-1.0.0-Windows.zip' },
        } },
        brickyard: { version: '1.0.0', files: { zip: { name: 'SVL_Brickyard.zip', size: 5, object: 'plugins/brickyard/1.0.0/SVL_Brickyard.zip' } } },
        kerbstone: { version: '1.0.0', files: { zip: { name: 'SVL_Kerbstone.zip', size: 5, object: 'plugins/kerbstone/1.0.0/SVL_Kerbstone.zip' } } },
        squall: { version: '1.0.0', files: { zip: { name: 'SVL_Squall.zip', size: 5, object: 'plugins/squall/1.0.0/SVL_Squall.zip' } } },
        'ru8-drum-pack': { version: '1.0.0', files: { zip: { name: 'RU-8_Drum_Pack.zip', size: 5, object: 'plugins/ru8-drum-pack/1.0.0/RU-8_Drum_Pack.zip' } } },
        'racks-drums': { version: '1.0.0', files: { zip: { name: 'SubverseLab_Drum_Racks.zip', size: 5, object: 'plugins/racks-drums/1.0.0/SubverseLab_Drum_Racks.zip' } } },
        ...(state.omitTutkal ? {} : { tutkal: { version: '1.0.0', files: { mac: { name: 'Tutkal-mac.zip', size: 10, object: 'plugins/tutkal/1.0.0/Tutkal-mac.zip' } } } }),
      }))],
    }) }),
  };
}

const state = { db: fakeFirestore(), storage: fakeStorage() };
// tokenAs: tests that need a token unlike the uid-derived default (an e-mail other than <uid>@example.com, or the same
// password account before and after it confirmed its e-mail) put the decoded token here, keyed by the uid.
state.tokenAs = new Map();
state.auth = { verifyIdToken: async (token) => {
  if (!token.startsWith('valid-')) throw new Error('invalid token');
  if (state.tokenAs.has(token.slice(6))) return clone(state.tokenAs.get(token.slice(6)));
  const uid = token.slice(6);
  return { uid, email: uid.includes('admin') ? 'senolsahan037@gmail.com' : uid.includes('nomx') ? `${uid}@nomx.invalid` : uid.includes('flaky') ? `${uid}@flaky.example` : `${uid}@example.com`, email_verified: !uid.startsWith('unv-'), firebase: { sign_in_provider: uid.startsWith('google-') ? 'google.com' : 'password' } };
} };
state.users = new Map(); // e-mail -> uid, for getUserByEmail
state.auth.getUserByEmail = async (email) => {
  if (!state.users.has(email)) throw Object.assign(new Error('no user'), { code: 'auth/user-not-found' });
  return { uid: state.users.get(email) };
};
state.FieldValue = { serverTimestamp: () => '<server-time>' };
globalThis.__downloadTestAdminApp = { initializeApp() {}, applicationDefault() {}, getApps: () => [] };
globalThis.__downloadTestAdminFirestore = { getFirestore: () => state.db, FieldValue: state.FieldValue };
globalThis.__downloadTestAdminAuth = { getAuth: () => state.auth };
globalThis.__downloadTestStorage = { Storage: class { constructor() { return state.storage; } } };

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

// No test touches DNS: every domain has a mail server unless it is listed here.
const entitlements = await import(entitlementsUrl);
const noMx = new Set(['nomx.invalid']);
entitlements.setMxResolver(async (domain) => {
  if (noMx.has(domain)) throw Object.assign(new Error('queryMx ENODATA'), { code: 'ENODATA' });
  if (domain === 'flaky.example') throw Object.assign(new Error('queryMx ETIMEOUT'), { code: 'ETIMEOUT' });
  return [{ exchange: `mx.${domain}`, priority: 10 }];
});

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
  catch (error) { results.push({ name, ok: false, last: `FAIL ${name}: ${error.message}` }); console.log(`FAIL ${name}: ${error.message}`); if (process.env.TEST_STACK) console.log(error.stack); }
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

await test('a file over 30 MiB streams without Content-Length (Cloud Run 32 MiB limit); a small one keeps it', async () => {
  resetDb();
  const exp = Math.floor(Date.now() / 1000) + 300;
  const big = await call(`/api/download/file?t=${encodeURIComponent(signedTicket({ uid: 'alice', slug: 'elek', platform: 'mac', object: 'plugins/elek/1.0.0/Elek-1.0.0-big.pkg', exp }))}`);
  assert.equal(big.response.status, 200);
  assert.equal(big.body, 'ELEK-BIG');
  assert.equal(big.response.headers['content-length'], undefined);
  assert.match(big.response.headers['content-disposition'], /Elek-1\.0\.0-macOS\.pkg/);
  assert.equal(big.response.headers['content-disposition'], 'attachment; filename="Elek-1.0.0-macOS.pkg"');
  const small = await call(`/api/download/file?t=${encodeURIComponent(signedTicket({ uid: 'alice', slug: 'kubbe', platform: 'mac', object: 'plugins/kubbe/1.2.3/Kubbe-mac.zip', exp }))}`);
  assert.equal(String(small.response.headers['content-length']), String('KUBBE-MAC'.length));
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

await test('no verification mail: an address that cannot receive mail gets 403 on every route; a password account with a real address is not blocked', async () => {
  resetDb();
  await hook(orderPayload('unv-gus@example.com', { id: 'U1' }));
  // No MX record for the domain: 403 everywhere the account acts, nothing minted.
  const one = await ticketReq('unv-nomx', '10.0.4.61', 'kubbe');
  const two = await ticketReq('unv-nomx', '10.0.4.60', 'koro', 'launch2');
  const claim = await call('/api/launch/claim', { method: 'POST', headers: { ...headersFor('10.0.4.62'), authorization: 'Bearer valid-unv-nomx' }, body: JSON.stringify({ launchId: 'launch' }) });
  for (const r of [one, two, claim]) { assert.equal(r.response.status, 403); assert.match(r.body.error, /cannot receive mail/); assert.equal(r.body.url, undefined); }
  assert.equal((await call('/api/launch2/status', { headers: { ...headersFor('10.0.4.63'), authorization: 'Bearer valid-unv-nomx' } })).response.status, 403);
  assert.equal(state.db.docs.get('launch/counter').claimed || 0, 0);
  // A real address that never verified: the e-mail-only family order asks for a claim, the status answers 200 without it.
  const gus = await ticketReq('unv-gus', '10.0.4.65', 'koro', 'launch2');
  assert.equal(gus.response.status, 403); assert.match(gus.body.error, /Claim it with the order number/);
  const gst = await call('/api/launch2/status', { headers: { ...headersFor('10.0.4.66'), authorization: 'Bearer valid-unv-gus' } });
  assert.equal(gst.response.status, 200); assert.equal(gst.body.paid, false);
  assert.equal((await ticketReq('verified-gus', '10.0.4.64', 'kubbe')).response.status, 200);
  assert.equal(state.db.docs.get('launch/counter').claimed, 1);
});

const statusReq = (uid, ip) => call('/api/launch2/status', { headers: { ...headersFor(ip), authorization: `Bearer valid-${uid}` } });

await test('uid-bound paid order unlocks launch 2 for the verified account that clicked Buy (ticket, status, claim); an unverified one opens it too (uid-bound, owner 9 Oct)', async () => {
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
  // Owner 9 Oct: the order is bound to the uid, so an unverified account opens it too (an order found only by e-mail would not).
  assert.equal((await ticketReq('unv-ida2', '10.0.8.4', 'koro', 'launch2')).response.status, 200);
});

await test('e-mail-only order (no uid) needs a proven e-mail (Google or email_verified) or a claim with the order number', async () => {
  resetDb();
  await hook(orderPayload('unv-ivy@example.com', { id: 'B2' }));
  await hook(orderPayload('ivy@example.com', { id: 'B3' }));
  await hook(orderPayload('google-ivy@example.com', { id: 'B4' }));
  assert.equal(state.db.docs.size > 0 && [...state.db.docs.keys()].some((k) => k.startsWith('launch2_uids/')), false);
  const unv = await ticketReq('unv-ivy', '10.0.8.10', 'koro', 'launch2');
  assert.equal(unv.response.status, 403);
  assert.match(unv.body.error, /Claim it with the order number/);
  assert.equal(unv.body.url, undefined);
  const ust = await statusReq('unv-ivy', '10.0.8.11');
  assert.equal(ust.response.status, 200); assert.equal(ust.body.paid, false);
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
  const jst = await statusReq('unv-jay', '10.0.8.21');
  assert.equal(jst.response.status, 200); assert.equal(jst.body.paid, false);
  const claim = await call('/api/launch/claim', { method: 'POST', headers: { ...headersFor('10.0.8.22'), authorization: 'Bearer valid-unv-jay' }, body: JSON.stringify({ launchId: 'launch2' }) });
  assert.equal(claim.response.status, 402);
  // A uid that never paid and is unproven, with an unrelated e-mail, is simply not a buyer: 402 (not a free pass via someone else's uid).
  assert.equal((await ticketReq('unv-kim', '10.0.8.23', 'koro', 'launch2')).response.status, 402);
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
    // Owner's rule (8 Oct, replaces 4 Oct): one of the first 1,000 keeps downloading after the free 1,000, without a new seat.
    assert.equal(existing.response.status, 200);
    assert.ok(existing.body.url);
    assert.equal(state.db.docs.get('launch/counter').claimed, 1000);
    assert.equal(state.db.docs.get('launch/counter').downloads, expectedTickets + 1);
  });
}

// After the free 1,000: paid orders (written by the webhook into plugin_licenses) open the room, nothing else does.
const shop = (uid, slug, ip) => ticketReq(uid, ip, slug, 'launch');
const authReq = (path, uid, ip) => call(path, { headers: { 'x-forwarded-for': ip, authorization: `Bearer valid-${uid}` } });
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
await test('after the free 1,000 a launch claim (one of the first 1,000) keeps Kubbe and Kaset; unverified, other plugins and strangers stay out', async () => {
  resetDb({ claimed: 1000 });
  state.db.docs.set('launch_claims/uid:early', { key: 'SVL-EARLY', email: 'early@example.com' });
  state.db.docs.set('launch_claims/email:early-mail@example.com', { key: 'SVL-EARLY2', uid: 'old-uid' });
  state.db.docs.set('launch_claims/uid:unv-early', { key: 'SVL-UNV', email: 'unv-early@example.com' });
  assert.equal((await shop('early', 'kubbe', '10.0.6.150')).response.status, 200);
  assert.equal((await shop('early', 'kaset', '10.0.6.151')).response.status, 200);
  assert.equal((await shop('early-mail', 'kaset', '10.0.6.152')).response.status, 200, 'claim found by e-mail');
  assert.equal((await ticketReq('early', '10.0.6.153', 'koro', 'launch2')).response.status, 402, 'a launch claim opens no family plugin');
  // Owner 9 Oct: a claim held BY UID keeps working with an unverified e-mail (see the tests below for the limits).
  assert.equal((await shop('unv-early', 'kubbe', '10.0.6.154')).response.status, 200, 'unverified uid claimant keeps KUBBE');
  assert.equal((await shop('late', 'kubbe', '10.0.6.155')).response.status, 402);
  assert.equal(state.db.docs.get('launch/counter').claimed, 1000);
  const st = await call('/api/purchases/status', { headers: { ...headersFor('10.0.6.156'), authorization: 'Bearer valid-early' } });
  assert.deepEqual(st.body, { full: true, owned: ['kubbe', 'kaset'], packs: [], standing: 'none', purchased: {}, updatesUntil: {}, unverified: false, emailOrdersWaiting: false });
  const unv = await call('/api/purchases/status', { headers: { ...headersFor('10.0.6.157'), authorization: 'Bearer valid-unv-early' } });
  assert.equal(unv.response.status, 200);
  assert.deepEqual(unv.body, { full: true, owned: ['kubbe', 'kaset'], packs: [], standing: 'none', purchased: {}, updatesUntil: {}, unverified: true, emailOrdersWaiting: false });
});
await test('first-1,000 rule (9 Oct): unverified uid claimant gets KUBBE/KASET only; e-mail-only claim, bounced and no-MX stay at 403', async () => {
  resetDb({ claimed: 1000 });
  const claim = (uid, email) => state.db.docs.set(`launch_claims/uid:${uid}`, { key: `SVL-${uid}`, email });
  claim('unv-ok', 'unv-ok@example.com');
  claim('unv-bounce', 'unv-bounce@example.com');
  claim('unv-nomx', 'unv-nomx@nomx.invalid');
  claim('unv-flaky', 'unv-flaky@flaky.example');
  state.db.docs.set('launch_claims/email:unv-mailonly@example.com', { key: 'SVL-MAIL', uid: 'someone-else' });
  state.db.docs.set('bounced_emails/unv-bounce@example.com', { at: '2026-10-05T00:00:00Z' });
  assert.equal((await shop('unv-ok', 'kubbe', '10.0.20.1')).response.status, 200);
  assert.equal((await shop('unv-ok', 'kaset', '10.0.20.2')).response.status, 200);
  for (const [slug, launchId] of [['koro', 'launch2'], ['taban', 'free'], ['yanki', 'launch2']]) {
    const r = await ticketReq('unv-ok', '10.0.20.3', slug, launchId);
    assert.equal(r.response.status, 402, `${slug} stays closed`);
    assert.equal(r.body.url, undefined);
  }
  assert.equal((await call('/api/launch/claim', { method: 'POST', headers: { ...headersFor('10.0.20.4'), authorization: 'Bearer valid-unv-ok' }, body: JSON.stringify({}) })).response.status, 200, 'its own uid claim answers with the same key (rule b)');
  const lic = await authReq('/api/purchases/licenses', 'unv-ok', '10.0.20.5');
  assert.equal(lic.response.status, 200); assert.deepEqual(lic.body.licenses, []);
  const l2 = await authReq('/api/launch2/status', 'unv-ok', '10.0.20.6');
  assert.equal(l2.response.status, 200); assert.equal(l2.body.paid, false);
  // A claim found only by e-mail needs a proven e-mail: anyone could register someone else's address. 403 asks for an order claim.
  assert.equal((await shop('unv-mailonly', 'kubbe', '10.0.20.7')).response.status, 403);
  const mo = await authReq('/api/purchases/status', 'unv-mailonly', '10.0.20.8');
  assert.equal(mo.response.status, 200); assert.deepEqual(mo.body.owned, []); assert.equal(mo.body.unverified, true);
  // Hard-bounced address and a domain without MX: out, even with a uid claim.
  assert.equal((await shop('unv-bounce', 'kubbe', '10.0.20.9')).response.status, 403);
  assert.equal((await authReq('/api/purchases/status', 'unv-bounce', '10.0.20.10')).response.status, 403);
  assert.equal((await shop('unv-nomx', 'kubbe', '10.0.20.11')).response.status, 403);
  assert.equal((await authReq('/api/purchases/status', 'unv-nomx', '10.0.20.12')).response.status, 403);
  // A lookup that fails for another reason than "no such domain / no MX data" allows.
  assert.equal((await shop('unv-flaky', 'kubbe', '10.0.20.14')).response.status, 200, 'a DNS timeout allows');
  // A stranger without any claim: nothing to claim, so buy.
  assert.equal((await shop('unv-nobody', 'kubbe', '10.0.20.13')).response.status, 402);
  assert.equal(state.db.docs.get('launch/counter').claimed, 1000, 'no seat claimed');
});
await test('MX lookups are cached for an hour', async () => {
  let calls = 0;
  const old = entitlements.setMxResolver(async () => { calls += 1; return [{ exchange: 'mx', priority: 1 }]; });
  try {
    const t0 = Date.parse('2026-10-09T10:00:00Z');
    assert.equal(await entitlements.domainHasMx('cache-test.example', t0), true);
    assert.equal(await entitlements.domainHasMx('cache-test.example', t0 + 59 * 60 * 1000), true);
    assert.equal(calls, 1);
    assert.equal(await entitlements.domainHasMx('cache-test.example', t0 + 61 * 60 * 1000), true);
    assert.equal(calls, 2);
    entitlements.setMxResolver(async () => []);
    assert.equal(await entitlements.domainHasMx('empty.example'), false, 'an empty MX answer means no mail server');
  } finally { entitlements.setMxResolver(old); }
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
  assert.deepEqual(s.body, { full: true, owned: ['kaset'], packs: [], standing: 'none', purchased: { kaset: '2026-10-05' }, updatesUntil: { kaset: '2028-10-05' }, unverified: false, emailOrdersWaiting: false });
  const none = await call('/api/purchases/status', { headers: { ...headersFor('10.0.6.131'), authorization: 'Bearer valid-stranger' } });
  assert.deepEqual(none.body, { full: true, owned: [], packs: [], standing: 'none', purchased: {}, updatesUntil: {}, unverified: false, emailOrdersWaiting: false });
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
  // Keys found only by e-mail stay hidden from a non-proven account (same e-mail as a real buyer's record).
  state.db.docs.set('plugin_licenses/unv-lic-a@example.com', { orders: { o1: { order_id: 'o1', product: 'kubbe', status: 'paid' } }, licenses: { l1: licenceDoc('l1', 'AAAA-1111-AAAA', 'o1') } });
  const unvLic = await call('/api/purchases/licenses', { headers: { ...headersFor('10.0.7.6'), authorization: 'Bearer valid-unv-lic-a' } });
  assert.equal(unvLic.response.status, 200); assert.deepEqual(unvLic.body, { licenses: [] });
});
await test('purchases status: full flips with the counter (999 open, 1000 full)', async () => {
  const ask = (ip) => call('/api/purchases/status', { headers: { ...headersFor(ip), authorization: 'Bearer valid-flip' } });
  resetDb({ claimed: 999 });
  const none = { owned: [], packs: [], standing: 'none', purchased: {}, updatesUntil: {}, unverified: false, emailOrdersWaiting: false };
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
  // A hand-picked tester opens TUTKAL too (owner decision 2026-10-05); since 2026-10-14 every released product (agreement 4.2).
  state.db.docs.set('launch2_testers/tk-test@example.com', { at: '2026-10-05T10:00:00Z' });
  assert.equal((await ticketReq('tk-test', '10.0.9.5', 'koro', 'launch2')).response.status, 200);
  assert.equal((await ticketReq('tk-test', '10.0.9.6', 'tutkal', 'launch2')).response.status, 200);
  const ts = await call('/api/purchases/status', { headers: { ...headersFor('10.0.9.8'), authorization: 'Bearer valid-tk-test' } });
  assert.deepEqual(ts.body.owned, ['kubbe', 'kaset', 'koro', 'yanki', 'hava', 'mihenk', 'tutkal', 'adalet', 'ahenk', 'elek', 'ru8', 'jingfang', 'seda', 'torna', 'taban', 'alev', 'kiyma']);
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
const SLUG_IDS = { kubbe: 6001, kaset: 6002, koro: 6003, yanki: 6004, hava: 6005, mihenk: 6006, tutkal: 6007, bundle: 6008, family: 5550, taban: 6009, alev: 6010, elek: 6011, kiyma: 6012, ru8: 6013,
  brickyard: 6020, kerbstone: 6021, squall: 6025, sweep: 6030, 'ru8-drum-pack': 6040, 'preset-sweep': 6041 };
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
// ---- ELEK (SOLO_SLUGS): sold on its own, outside the family; only a paid ELEK order opens it (launchId solo) ----------
await test('ELEK: a paid ELEK order opens exactly elek (launchId solo), nothing else; refund closes it; launch2 counter untouched', async () => {
  resetDb({ claimed: 1000 });
  const before = state.db.docs.get('launch2/counter').claimed;
  assert.equal((await ticketReq('ek1', '10.0.18.1', 'elek', 'solo')).response.status, 402, 'no order, no ticket');
  const w = await hook(named('ek1@example.com', { id: 'EK1', product: SLUG_IDS.elek, name: 'ELEK', uid: 'ek1' }));
  assert.equal(w.response.status, 200);
  assert.equal(state.db.docs.get('plugin_licenses/ek1@example.com').orders.EK1.product, 'elek');
  const ok = await ticketReq('ek1', '10.0.18.2', 'elek', 'solo');
  assert.equal(ok.response.status, 200); assert.equal(decodeTicket(ok.body.url).slug, 'elek'); assert.equal(ok.body.name, 'Elek-1.0.0-macOS.zip');
  assert.equal(state.db.docs.get('downloads/ek1').elek.mac.count, 1);
  // Nothing else opens: not a family plugin, not Kubbe/Kaset, and elek is unreachable through the other launch ids.
  for (const other of SINGLE_SLUGS) assert.equal((await ticketReq('ek1', '10.0.18.3', other, 'launch2')).response.status, 402, `${other} stays closed`);
  assert.equal((await shop('ek1', 'kubbe', '10.0.18.4')).response.status, 402);
  assert.equal((await ticketReq('ek1', '10.0.18.5', 'koro', 'solo')).response.status, 400, 'solo only knows elek');
  assert.equal((await ticketReq('ek1', '10.0.18.6', 'elek', 'launch2')).response.status, 400);
  assert.equal((await ticketReq('ek1', '10.0.18.7', 'elek')).response.status, 400);
  assert.equal((await ticketReq('ek1', '10.0.18.8', 'elek', 'free')).response.status, 400);
  const st = await call('/api/purchases/status', { headers: { ...headersFor('10.0.18.9'), authorization: 'Bearer valid-ek1' } });
  assert.deepEqual(st.body.owned, ['elek']); assert.equal(st.body.standing, 'none'); assert.equal(st.body.updatesUntil.elek, '2028-10-05');
  assert.equal(state.db.docs.get('launch2/counter').claimed, before, 'an ELEK order is not a family seat');
  const m = await call('/api/download/manifest', { headers: headersFor('10.0.18.10') });
  assert.deepEqual(Object.keys(m.body.elek.files), ['mac']);
  await hook(named('ek1@example.com', { id: 'EK1', product: SLUG_IDS.elek, name: 'ELEK', status: 'refunded', event: 'order_refunded' }));
  assert.equal((await ticketReq('ek1', '10.0.18.11', 'elek', 'solo')).response.status, 402);
});
await test('ELEK: a family buyer without an ELEK order is refused elek; an ELEK order does not make a family seat', async () => {
  resetDb({ claimed: 1000 });
  await hook(named('ekfam@example.com', { id: 'EK2', product: SLUG_IDS.family, name: 'SubverseLab Plugin Family (7 plugins)', uid: 'ekfam' }));
  assert.equal((await ticketReq('ekfam', '10.0.18.20', 'koro', 'launch2')).response.status, 200, 'the family buyer opens the family');
  assert.equal((await ticketReq('ekfam', '10.0.18.21', 'elek', 'solo')).response.status, 402, 'but not ELEK');
  const st = await call('/api/purchases/status', { headers: { ...headersFor('10.0.18.22'), authorization: 'Bearer valid-ekfam' } });
  assert.equal(st.body.owned.includes('elek'), false); assert.equal(st.body.owned.length, 7);
  // An ELEK-only order is not a family seat.
  await hook(orderPayload('ekonly@example.com', { id: 'EK3', product: SLUG_IDS.elek }));
  const claimedBefore = state.db.docs.get('launch2/counter').claimed;
  assert.equal((await ticketReq('ekonly', '10.0.18.23', 'koro', 'launch2')).response.status, 402, 'an ELEK buyer is not a family buyer');
  assert.equal(state.db.docs.get('launch2/counter').claimed, claimedBefore);
});
// ---- Testers (agreement v1.1): every released product, by the tester record's status ------------------------------

// ---- RU-8 (SOLO_SLUGS, 16 Oct): cases copied from ELEK's; macOS AND Windows at launch -------------------------------------
await test('RU-8: a paid RU-8 order opens exactly ru8 via solo on mac and win; refund closes it; family, admin preview and launch2 do not open it', async () => {
  resetDb({ claimed: 1000 });
  const before = state.db.docs.get('launch2/counter').claimed;
  assert.equal((await ticketReq('ru1', '10.0.19.1', 'ru8', 'solo')).response.status, 402, 'no order, no ticket');
  const w = await hook(named('ru1@example.com', { id: 'RU1', product: SLUG_IDS.ru8, name: 'RU-8 Rhythm Unit', uid: 'ru1' }));
  assert.equal(w.response.status, 200);
  assert.equal(state.db.docs.get('plugin_licenses/ru1@example.com').orders.RU1.product, 'ru8');
  const mac = await ticketReq('ru1', '10.0.19.2', 'ru8', 'solo');
  assert.equal(mac.response.status, 200); assert.equal(decodeTicket(mac.body.url).slug, 'ru8'); assert.equal(mac.body.name, 'RU-8-1.0.0-macOS.pkg');
  const win = await ticketReq('ru1', '10.0.19.3', 'ru8', 'solo', 'win');
  assert.equal(win.response.status, 200); assert.equal(win.body.name, 'RU-8-1.0.0-Windows.zip');
  assert.equal((await ticketReq('ru1', '10.0.19.4', 'elek', 'solo')).response.status, 402, 'an RU-8 order is not an ELEK order');
  assert.equal((await ticketReq('ru1', '10.0.19.5', 'ru8', 'launch2')).response.status, 400);
  assert.equal((await ticketReq('ru1', '10.0.19.6', 'ru8-drum-pack', 'pack', 'zip')).response.status, 402, 'RU-8 does not include the Drum Pack (paid separately)');
  const st = await call('/api/purchases/status', { headers: { ...headersFor('10.0.19.7'), authorization: 'Bearer valid-ru1' } });
  assert.deepEqual(st.body.owned, ['ru8']); assert.deepEqual(st.body.packs, []); assert.equal(st.body.updatesUntil.ru8, '2028-10-05');
  assert.equal(state.db.docs.get('launch2/counter').claimed, before, 'an RU-8 order is not a family seat');
  const m = await call('/api/download/manifest', { headers: headersFor('10.0.19.8') });
  assert.deepEqual(Object.keys(m.body.ru8.files).sort(), ['mac', 'win']);
  await hook(named('ru1@example.com', { id: 'RU1', product: SLUG_IDS.ru8, name: 'RU-8 Rhythm Unit', status: 'refunded', event: 'order_refunded' }));
  assert.equal((await ticketReq('ru1', '10.0.19.9', 'ru8', 'solo')).response.status, 402);
  // family buyer and admin preview: not RU-8
  await hook(orderPayload('rufam@example.com', { id: 'RUF', uid: 'rufam' }));
  assert.equal((await ticketReq('rufam', '10.0.19.10', 'ru8', 'solo')).response.status, 402);
  assert.equal((await ticketReq('admin-ru', '10.0.19.11', 'ru8', 'solo')).response.status, 402, 'the admin preview does not open RU-8');
});
await test('RU-8: product name fallback "RU-8 ..." maps to ru8; "RU-8 Drum Pack" maps to the pack, never to the instrument', async () => {
  resetDb({ claimed: 1000 });
  await hook(named('ru2@example.com', { id: 'RU2', product: 99901, name: 'RU-8 Rhythm Unit' }));
  assert.equal(state.db.docs.get('plugin_licenses/ru2@example.com').orders.RU2.product, 'ru8');
  await hook(named('ru2@example.com', { id: 'RU3', product: 99902, name: 'RU-8 Drum Pack' }));
  assert.equal(state.db.docs.get('plugin_licenses/ru2@example.com').orders.RU3.product, 'ru8-drum-pack');
  await hook(named('ru2@example.com', { id: 'RU4', product: 99903, name: 'Sweep the store bundle' }));
  assert.equal(state.db.docs.get('plugin_licenses/ru2@example.com').orders.RU4.product, 'sweep', 'never the old KUBBE + KASET bundle');
  await hook(named('ru2@example.com', { id: 'RU5', product: 99904, name: 'SVL Kerbstone' }));
  assert.equal(state.db.docs.get('plugin_licenses/ru2@example.com').orders.RU5.product, 'kerbstone');
});

// ---- Packs (PACK_SLUGS, 16 Oct): paid only; per-pack orders, the sample-pack sweep, the preset-pack sweep -----------------
const paidOrder = (email, { id, product, name = null, cents = 500, status = 'paid', event = 'order_created', uid, created = '2026-10-17T02:00:00Z' }) => JSON.stringify({
  meta: { event_name: event, ...(uid ? { custom_data: { uid } } : {}) },
  data: { id: String(id), attributes: { user_email: email, status, refunded: status === 'refunded', created_at: created, total: cents, total_usd: cents, currency: 'USD', first_order_item: { product_id: product, product_name: name, variant_id: 1 } } },
});
await test('packs: a paid pack order opens exactly that pack (launchId pack, platform zip); refund closes it; nothing else opens', async () => {
  resetDb({ claimed: 1000 });
  assert.equal((await ticketReq('pk1', '10.0.40.1', 'brickyard', 'pack', 'zip')).response.status, 402, 'no order, no ticket');
  await hook(paidOrder('pk1@example.com', { id: 'PK1', product: SLUG_IDS.brickyard, uid: 'pk1' }));
  const ok = await ticketReq('pk1', '10.0.40.2', 'brickyard', 'pack', 'zip');
  assert.equal(ok.response.status, 200); assert.equal(ok.body.name, 'SVL_Brickyard.zip'); assert.equal(decodeTicket(ok.body.url).slug, 'brickyard');
  assert.equal((await ticketReq('pk1', '10.0.40.3', 'kerbstone', 'pack', 'zip')).response.status, 402, 'another pack stays closed');
  assert.equal((await ticketReq('pk1', '10.0.40.4', 'brickyard', 'pack', 'mac')).response.status, 400, 'packs have only the zip platform');
  assert.equal((await ticketReq('pk1', '10.0.40.5', 'brickyard', 'solo', 'zip')).response.status, 400, 'packs only through launchId pack');
  assert.equal((await ticketReq('pk1', '10.0.40.6', 'koro', 'pack', 'zip')).response.status, 400, 'pack does not know plugins');
  const st = await call('/api/purchases/status', { headers: { ...headersFor('10.0.40.7'), authorization: 'Bearer valid-pk1' } });
  assert.deepEqual(st.body.packs, ['brickyard']); assert.deepEqual(st.body.owned, [], 'a pack is not a plugin'); assert.equal(st.body.updatesUntil.brickyard, undefined, 'no updates term on packs');
  const m = await call('/api/download/manifest', { headers: headersFor('10.0.40.8') });
  assert.deepEqual(Object.keys(m.body.brickyard.files), ['zip']);
  await hook(paidOrder('pk1@example.com', { id: 'PK1', product: SLUG_IDS.brickyard, status: 'refunded', event: 'order_refunded' }));
  assert.equal((await ticketReq('pk1', '10.0.40.9', 'brickyard', 'pack', 'zip')).response.status, 402);
});
await test('packs: no free path — a $0 pack order, a family order, a free plugin, an active tester and the admin preview open no pack', async () => {
  resetDb({ claimed: 1000 });
  await hook(paidOrder('pk0@example.com', { id: 'PK0', product: SLUG_IDS.kerbstone, cents: 0, uid: 'pk0' }));
  assert.equal((await ticketReq('pk0', '10.0.41.1', 'kerbstone', 'pack', 'zip')).response.status, 402, 'a $0 order opens nothing');
  await hook(paidOrder('pk0@example.com', { id: 'PK0S', product: SLUG_IDS.sweep, cents: 0, uid: 'pk0' }));
  assert.equal((await ticketReq('pk0', '10.0.41.2', 'kerbstone', 'pack', 'zip')).response.status, 402, 'a $0 sweep opens nothing');
  await hook(orderPayload('pkfam@example.com', { id: 'PKF', uid: 'pkfam' }));
  assert.equal((await ticketReq('pkfam', '10.0.41.3', 'brickyard', 'pack', 'zip')).response.status, 402, 'family');
  await hook(named('pkfree@example.com', { id: 'PKT', product: SLUG_IDS.taban, name: 'TABAN', uid: 'pkfree' }));
  assert.equal((await ticketReq('pkfree', '10.0.41.4', 'brickyard', 'pack', 'zip')).response.status, 402, 'free plugin');
  state.db.docs.set('launch2_testers/pktest@example.com', { email: 'pktest@example.com', status: 'active', agreementVersion: '1.1', agreementAcceptedAt: '2026-10-14T08:30:00.000Z', agreementVia: 'email' });
  assert.equal((await ticketReq('pktest', '10.0.41.5', 'brickyard', 'pack', 'zip')).response.status, 402, 'tester');
  assert.equal((await ticketReq('admin-pk', '10.0.41.6', 'brickyard', 'pack', 'zip')).response.status, 402, 'admin preview');
  const st = await call('/api/purchases/status', { headers: { ...headersFor('10.0.41.7'), authorization: 'Bearer valid-pktest' } });
  assert.deepEqual(st.body.packs, []);
});
await test('sweep: one paid sweep opens every sample pack listed when it was bought (SWEEPS.sweep), not the preset pack, not a pack listed later', async () => {
  resetDb({ claimed: 1000 });
  const { SAMPLE_PACK_LISTED, SAMPLE_PACK_SLUGS } = await import(entitlementsUrl);
  await hook(paidOrder('sw1@example.com', { id: 'SW1', product: SLUG_IDS.sweep, cents: 2500, uid: 'sw1' }));
  for (const [i, slug] of ['brickyard', 'kerbstone', 'squall'].entries()) {
    const r = await ticketReq('sw1', `10.0.42.${i + 1}`, slug, 'pack', 'zip');
    assert.equal(r.response.status, 200, slug);
  }
  assert.equal((await ticketReq('sw1', '10.0.42.9', 'ru8-drum-pack', 'pack', 'zip')).response.status, 402, 'the sample-pack sweep does not include preset packs');
  const st = await call('/api/purchases/status', { headers: { ...headersFor('10.0.42.10'), authorization: 'Bearer valid-sw1' } });
  // The order is dated 17 Oct (paidOrder): it opens the packs listed by then; the six listed on 1 Nov are not in it.
  const listedBy = (iso) => SAMPLE_PACK_SLUGS.filter((s) => Date.parse(SAMPLE_PACK_LISTED[s]) <= Date.parse(iso));
  assert.deepEqual(st.body.packs, listedBy('2026-10-17T02:00:00Z'), 'every sample pack listed when it was bought'); assert.deepEqual(st.body.owned, []);
  assert.ok(!st.body.packs.includes('mirage') && SAMPLE_PACK_SLUGS.includes('mirage'), 'a pack listed on 1 Nov is not in a 17 Oct sweep');
  // A pack listed after the order is not part of it; a sweep bought after the listing is.
  SAMPLE_PACK_LISTED.laterpack = '2026-12-01T00:00:00Z';
  try {
    const { sweepSlugs } = await import(entitlementsUrl);
    assert.equal(sweepSlugs('sweep', '2026-10-17T02:00:00Z').includes('laterpack'), false);
    assert.equal(sweepSlugs('sweep', '2026-12-02T00:00:00Z').includes('laterpack'), true);
    assert.equal(sweepSlugs('sweep', null).includes('laterpack'), false, 'no date: only the first listing');
  } finally { delete SAMPLE_PACK_LISTED.laterpack; }
  await hook(paidOrder('sw1@example.com', { id: 'SW1', product: SLUG_IDS.sweep, cents: 2500, status: 'refunded', event: 'order_refunded' }));
  assert.equal((await ticketReq('sw1', '10.0.42.11', 'brickyard', 'pack', 'zip')).response.status, 402, 'refund closes every pack');
});
await test('preset packs: a Drum Pack order opens only the Drum Pack; the optional preset-sweep opens preset packs only', async () => {
  resetDb({ claimed: 1000 });
  await hook(paidOrder('pp1@example.com', { id: 'PP1', product: SLUG_IDS['ru8-drum-pack'], cents: 900, uid: 'pp1' }));
  const ok = await ticketReq('pp1', '10.0.43.1', 'ru8-drum-pack', 'pack', 'zip');
  assert.equal(ok.response.status, 200); assert.equal(ok.body.name, 'RU-8_Drum_Pack.zip');
  assert.equal((await ticketReq('pp1', '10.0.43.2', 'ru8', 'solo')).response.status, 402, 'the Drum Pack is not RU-8');
  await hook(paidOrder('pp2@example.com', { id: 'PP2', product: SLUG_IDS['preset-sweep'], cents: 900, uid: 'pp2' }));
  assert.equal((await ticketReq('pp2', '10.0.43.3', 'ru8-drum-pack', 'pack', 'zip')).response.status, 200);
  assert.equal((await ticketReq('pp2', '10.0.43.4', 'brickyard', 'pack', 'zip')).response.status, 402, 'the preset sweep is not the sample-pack sweep');
});
await test('free rack packs (owner 17 Oct, launchId member): any signed-in deliverable account downloads, no order; nothing else opens', async () => {
  resetDb({ claimed: 1000 });
  const ok = await ticketReq('mem1', '10.0.44.1', 'racks-drums', 'member', 'zip');
  assert.equal(ok.response.status, 200); assert.equal(ok.body.name, 'SubverseLab_Drum_Racks.zip');
  assert.equal((await ticketReq('mem1', '10.0.44.2', 'racks-bass', 'member', 'zip')).response.status, 404, 'not published yet: honest 404');
  assert.equal((await ticketReq('mem1', '10.0.44.3', 'racks-drums', 'pack', 'zip')).response.status, 400, 'not a paid pack');
  assert.equal((await ticketReq('mem1', '10.0.44.4', 'ru8-drum-pack', 'member', 'zip')).response.status, 400, 'member opens no paid pack');
  assert.equal((await ticketReq('mem1', '10.0.44.5', 'koro', 'member', 'mac')).response.status, 400, 'member opens no plugin');
  const anon = await call('/api/download/ticket', { method: 'POST', headers: headersFor('10.0.44.6'), body: JSON.stringify({ slug: 'racks-drums', platform: 'zip', launchId: 'member' }) });
  assert.equal(anon.response.status, 401, 'sign in first');
  state.db.docs.set('bounced_emails/mem2@example.com', { at: '2026-10-05T00:00:00Z' });
  assert.equal((await ticketReq('mem2', '10.0.44.7', 'racks-drums', 'member', 'zip')).response.status, 403, 'an address that cannot receive mail gets nothing');
  assert.ok(!entitlements.PACK_SLUGS.includes('racks-drums'), 'free packs are not sold packs');
});
await test('trial installer (owner 7 Nov, launchId trial): any signed-in deliverable account gets AHENK without owning it; no other product', async () => {
  resetDb({ claimed: 1000 });
  const mac = await ticketReq('tr1', '10.0.45.1', 'ahenk', 'trial', 'mac');
  assert.equal(mac.response.status, 200); assert.equal(mac.body.name, 'AHENK-1.0.0-macOS.pkg'); assert.equal(mac.body.version, '1.0.0');
  assert.equal((await call(mac.body.url, { headers: { 'x-forwarded-for': '10.0.45.1' } })).body, 'AHENK-MAC');
  const win = await ticketReq('tr1', '10.0.45.2', 'ahenk', 'trial', 'win');
  assert.equal(win.response.status, 200); assert.equal(win.body.name, 'AHENK-1.0.0-Windows.zip');
  assert.equal(decodeTicket(win.body.url).object, 'plugins/ahenk/1.0.0/AHENK-1.0.0-Windows.zip');
  assert.equal(state.db.docs.get('trial/counter').downloads, 2, 'counted like every other download');
  assert.equal(state.db.docs.get('downloads/tr1').ahenk.mac.count, 1);
  assert.equal((await ticketReq('unv-tr2', '10.0.45.3', 'ahenk', 'trial', 'mac')).response.status, 200, 'an unverified password account whose address receives mail');
  assert.equal((await ticketReq('tr1', '10.0.45.4', 'ahenk', 'trial', 'zip')).response.status, 400, 'mac / win only');
  for (const [slug, ip] of [['jingfang', '10.0.45.5'], ['elek', '10.0.45.6'], ['ru8', '10.0.45.7'], ['koro', '10.0.45.8'], ['taban', '10.0.45.9'], ['racks-drums', '10.0.45.10']]) {
    assert.equal((await ticketReq('tr1', ip, slug, 'trial', 'mac')).response.status, 400, `${slug} has no trial`);
  }
  assert.equal((await ticketReq('tr1', '10.0.45.11', 'jingfang', 'solo')).response.status, 402, 'JING FANG stays owned-only');
  assert.equal((await ticketReq('tr1', '10.0.45.12', 'elek', 'solo')).response.status, 402, 'ELEK stays owned-only');
  assert.ok([400, 402].includes((await ticketReq('tr1', '10.0.45.13', 'ahenk', 'solo')).response.status), 'the owned route still needs an order');
  const anon = await call('/api/download/ticket', { method: 'POST', headers: headersFor('10.0.45.14'), body: JSON.stringify({ slug: 'ahenk', platform: 'mac', launchId: 'trial' }) });
  assert.equal(anon.response.status, 401, 'sign in first'); assert.equal(anon.body.url, undefined);
  const expired = await call('/api/download/ticket', { method: 'POST', headers: { ...headersFor('10.0.45.15'), authorization: 'Bearer invalid' }, body: JSON.stringify({ slug: 'ahenk', platform: 'mac', launchId: 'trial' }) });
  assert.equal(expired.response.status, 401);
  state.db.docs.set('bounced_emails/tr3@example.com', { at: '2026-11-07T00:00:00Z' });
  assert.equal((await ticketReq('tr3', '10.0.45.16', 'ahenk', 'trial', 'mac')).response.status, 403, 'an address that cannot receive mail gets nothing');
  assert.equal((await ticketReq('tr4-nomx', '10.0.45.17', 'ahenk', 'trial', 'mac')).response.status, 403, 'a domain without a mail server gets nothing');
  const codes = [];
  for (let i = 0; i < 31; i += 1) codes.push((await ticketReq('tr5', '10.0.45.99', 'ahenk', 'trial', 'mac')).response.status);
  assert.deepEqual(codes.slice(0, 30), Array(30).fill(200), '30 a minute per IP, like every ticket');
  assert.equal(codes[30], 429);
  assert.equal((await ticketReq('tr5', '10.0.45.98', 'ahenk', 'trial', 'mac')).response.status, 200, 'another IP is not limited');
  const manifest = await call('/api/download/manifest');
  assert.equal('ahenk' in manifest.body, entitlements.PLUGIN_SLUGS.includes('ahenk'), 'the public manifest lists AHENK only once it is on sale');
});
await test('inbox: pack, sweep and RU-8 order messages point to Account -> Packs / RU-8, with no licence-key or plug-in install line for packs', async () => {
  const { orderMessage } = await import(pathToFileURL(resolve(root, 'api/inbox.js')).href);
  const pack = orderMessage('kerbstone', { orderNumber: 7 });
  assert.match(pack.title, /Kerbstone sample pack/); assert.equal(pack.link, '/account#packs'); assert.doesNotMatch(pack.body, /licence key|VST3/);
  assert.match(orderMessage('sweep').title, /Sweep the store/);
  assert.equal(orderMessage('ru8').title, 'Your RU-8 is ready');
});

await test('testers: active opens the family, free and ELEK tickets without a seat or order; ended keeps only owned; revoked keeps nothing', async () => {
  resetDb({ claimed: 1000 });
  const claimedBefore = state.db.docs.get('launch2/counter').claimed;
  state.db.docs.set('launch2_testers/tt1@example.com', { email: 'tt1@example.com', status: 'active', agreementVersion: '1.1', agreementAcceptedAt: '2026-10-14T08:30:00.000Z', agreementVia: 'email' });
  assert.equal((await ticketReq('tt1', '10.0.30.1', 'koro', 'launch2')).response.status, 200);
  const elek = await ticketReq('tt1', '10.0.30.2', 'elek', 'solo');
  assert.equal(elek.response.status, 200); assert.equal(decodeTicket(elek.body.url).slug, 'elek');
  assert.equal((await ticketReq('tt1', '10.0.30.3', 'taban', 'free')).response.status, 200);
  assert.equal((await ticketReq('tt1', '10.0.30.4', 'kubbe')).response.status, 200, 'launch 1 products too, without taking a free seat');
  assert.equal(state.db.docs.get('launch2/counter').claimed, claimedBefore, 'no paid seat');
  assert.equal(state.db.docs.get('launch/counter').claimed, 1000, 'no launch-1 seat either');
  const st = await call('/api/purchases/status', { headers: { ...headersFor('10.0.30.5'), authorization: 'Bearer valid-tt1' } });
  assert.deepEqual(st.body.owned, ['kubbe', 'kaset', 'koro', 'yanki', 'hava', 'mihenk', 'tutkal', 'adalet', 'ahenk', 'elek', 'ru8', 'jingfang', 'seda', 'torna', 'taban', 'alev', 'kiyma']);
  assert.equal(st.body.standing, 'tester');
  // Ended: only what the owned map lists.
  state.db.docs.set('launch2_testers/tt1@example.com', { ...state.db.docs.get('launch2_testers/tt1@example.com'), status: 'ended', owned: { elek: '2026-10-14' } });
  assert.equal((await ticketReq('tt1', '10.0.30.6', 'elek', 'solo')).response.status, 200, 'owned');
  assert.equal((await ticketReq('tt1', '10.0.30.7', 'koro', 'launch2')).response.status, 402);
  assert.equal((await ticketReq('tt1', '10.0.30.8', 'taban', 'free')).response.status, 402);
  const ended = await call('/api/purchases/status', { headers: { ...headersFor('10.0.30.9'), authorization: 'Bearer valid-tt1' } });
  assert.deepEqual(ended.body.owned, ['elek']); assert.equal(ended.body.standing, 'none');
  // Revoked: owned is ignored.
  state.db.docs.set('launch2_testers/tt1@example.com', { ...state.db.docs.get('launch2_testers/tt1@example.com'), status: 'revoked' });
  assert.equal((await ticketReq('tt1', '10.0.30.10', 'elek', 'solo')).response.status, 402);
  assert.equal((await ticketReq('tt1', '10.0.30.11', 'koro', 'launch2')).response.status, 402);
  assert.deepEqual((await call('/api/purchases/status', { headers: { ...headersFor('10.0.30.12'), authorization: 'Bearer valid-tt1' } })).body.owned, []);
  // A paid order still works for a revoked tester: the tester record never takes away what was bought.
  await hook(named('tt1@example.com', { id: 'TT1', product: SLUG_IDS.elek, name: 'ELEK', uid: 'tt1' }));
  assert.equal((await ticketReq('tt1', '10.0.30.13', 'elek', 'solo')).response.status, 200);
});
await test('testers: a test-build ticket is closed to buyers, applicants and unassigned testers; only an active assigned tester gets it', async () => {
  resetDb({ claimed: 1000 });
  state.db.docs.set('launch2_testers/tb1@example.com', { email: 'tb1@example.com', status: 'active' });
  state.db.docs.set('tester_builds/b1', { slug: 'koro', name: 'Koro test', version: '0.9.1', platform: 'mac', objectPath: 'plugins/koro/1.0.0/Koro-mac.zip', notes: '', assignedTo: ['tb1@example.com'], createdAt: '2026-10-14T00:00:00Z', releasedAt: null });
  const req = (uid, ip, body) => call('/api/download/ticket', { method: 'POST', headers: { ...headersFor(ip), ...(uid ? { authorization: `Bearer valid-${uid}` } : {}) }, body: JSON.stringify(body) });
  const ok = await req('tb1', '10.0.31.1', { kind: 'test-build', buildId: 'b1' });
  assert.equal(ok.response.status, 200);
  const data = decodeTicket(ok.body.url);
  assert.equal(data.object, 'plugins/koro/1.0.0/Koro-mac.zip'); assert.equal(data.slug, 'koro'); assert.equal(data.platform, 'mac');
  assert.equal(state.db.docs.get('downloads/tb1'), undefined, 'a test build is not counted as a product download');
  // A family buyer is not a tester.
  await hook(orderPayload('tb2@example.com', { id: 'TB2' }));
  assert.equal((await req('tb2', '10.0.31.2', { kind: 'test-build', buildId: 'b1' })).response.status, 403);
  assert.equal((await req('tb1', '10.0.31.3', { kind: 'test-build', buildId: 'nosuch' })).response.status, 403);
  assert.equal((await req(undefined, '10.0.31.4', { kind: 'test-build', buildId: 'b1' })).response.status, 401);
  // The product ticket route never reads a build id as a product: a plain koro ticket for the same tester is the product gate.
  state.db.docs.set('launch2_testers/tb1@example.com', { email: 'tb1@example.com', status: 'ended' });
  assert.equal((await req('tb1', '10.0.31.5', { kind: 'test-build', buildId: 'b1' })).response.status, 403, 'ended');
  state.db.docs.set('launch2_testers/tb1@example.com', { email: 'tb1@example.com', status: 'revoked' });
  assert.equal((await req('tb1', '10.0.31.6', { kind: 'test-build', buildId: 'b1' })).response.status, 403, 'revoked');
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
await test('free by e-mail (owner 24 Oct): an unproven password account opens the free plugin its e-mail took signed out; a paid e-mail-only order still needs the claim', async () => {
  resetDb({ claimed: 1000 });
  // $0 TABAN placed signed out (no uid) with the address the password account later signs up with.
  await hook(freeOrder('unv-fe@example.com', { id: 'FE1' }));
  const t = await ticketReq('unv-fe', '10.0.19.1', 'taban', 'free');
  assert.equal(t.response.status, 200); assert.equal(decodeTicket(t.body.url).slug, 'taban');
  const st = await authReq('/api/purchases/status', 'unv-fe', '10.0.19.2');
  assert.deepEqual(st.body.owned, ['taban']); assert.equal(st.body.unverified, true); assert.equal(st.body.updatesUntil.taban, undefined);
  // Only the plugin its own e-mail took: ALEV stays closed, and nobody else's $0 order counts.
  assert.equal((await ticketReq('unv-fe', '10.0.19.3', 'alev', 'free')).response.status, 402);
  await hook(freeOrder('other@example.com', { id: 'FE2' }));
  assert.equal((await ticketReq('unv-fe2', '10.0.19.4', 'taban', 'free')).response.status, 402);
  // A paid order matched only by the e-mail keeps the proven rule: 403 asks for the order-number claim, not listed.
  await hook(named('unv-fe@example.com', { id: 'FE3', product: SLUG_IDS.koro, name: 'KORO' }));
  assert.equal((await ticketReq('unv-fe', '10.0.19.5', 'koro', 'launch2')).response.status, 403);
  assert.deepEqual((await authReq('/api/purchases/status', 'unv-fe', '10.0.19.6')).body.owned, ['taban']);
  // A refunded $0 order opens nothing.
  await hook(freeOrder('unv-fr@example.com', { id: 'FE4', status: 'refunded', event: 'order_refunded' }));
  assert.equal((await ticketReq('unv-fr', '10.0.19.7', 'taban', 'free')).response.status, 402);
});
await test('free KIYMA: its own $0 order opens KIYMA on both platforms and nothing else; ALEV and TABAN orders do not open it', async () => {
  resetDb({ claimed: 1000 });
  const kiymaOrder = (email, id, uid) => JSON.stringify({
    meta: { event_name: 'order_created', custom_data: { uid } },
    data: { id: String(id), attributes: { user_email: email, status: 'paid', refunded: false, created_at: '2026-10-15T10:00:00Z', currency: 'USD', total: 0, total_usd: 0, tax_usd: 0, first_order_item: { product_id: SLUG_IDS.kiyma, product_name: 'KIYMA', variant_id: 1 } } },
  });
  assert.equal((await ticketReq('ky1', '10.0.18.1', 'kiyma', 'free')).response.status, 402, 'no order, no ticket');
  const w = await hook(kiymaOrder('ky1@example.com', 'K1', 'ky1'));
  assert.equal(w.response.status, 200); assert.equal(w.body.credits, 'free-order');
  const mac = await ticketReq('ky1', '10.0.18.2', 'kiyma', 'free');
  assert.equal(mac.response.status, 200); assert.equal(decodeTicket(mac.body.url).slug, 'kiyma'); assert.equal(mac.body.name, 'Kiyma-1.0.0-macOS.pkg');
  const win = await ticketReq('ky1', '10.0.18.3', 'kiyma', 'free', 'win');
  assert.equal(win.response.status, 200); assert.equal(win.body.name, 'Kiyma-1.0.0-Windows-VST3.zip');
  assert.equal((await ticketReq('ky1', '10.0.18.4', 'alev', 'free')).response.status, 402, 'KIYMA order does not open ALEV');
  assert.equal((await ticketReq('ky1', '10.0.18.5', 'taban', 'free')).response.status, 402, 'KIYMA order does not open TABAN');
  const st = await call('/api/purchases/status', { headers: { ...headersFor('10.0.18.6'), authorization: 'Bearer valid-ky1' } });
  assert.deepEqual(st.body.owned, ['kiyma']);
  await hook(freeOrder('tb2@example.com', { id: 'K2', uid: 'tb2' }));
  assert.equal((await ticketReq('tb2', '10.0.18.7', 'kiyma', 'free')).response.status, 402, 'TABAN order does not open KIYMA');
});
await test('free TABAN: an unverified password account opens it with its e-mail\'s $0 order (owner 24 Oct; was 403)', async () => {
  resetDb({ claimed: 1000 });
  await hook(freeOrder('unv-free@example.com', { id: 'F3' }));
  assert.equal((await ticketReq('unv-free', '10.0.16.1', 'taban', 'free')).response.status, 200);
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
await test('licences: a free plugin key has no updatesUntil (null); a paid plugin key keeps its 2-year date', async () => {
  resetDb({ claimed: 1000 });
  const paid = (orderId, product) => ({ order_id: orderId, product, product_name: product.toUpperCase(), status: 'paid', created: '2026-10-05T10:00:00Z' });
  state.db.docs.set('plugin_licenses/lic-free@example.com', {
    orders: { F9: paid('F9', 'taban'), P8: paid('P8', 'hava') },
    licenses: { L9: licenceDoc('L9', 'TABAN-KEY-0009', 'F9', { product: 'taban' }), L8: licenceDoc('L8', 'HAVA-KEY-0008', 'P8', { product: 'hava' }) },
  });
  const out = await call('/api/purchases/licenses', { headers: { ...headersFor('10.0.15.11'), authorization: 'Bearer valid-lic-free' } });
  assert.equal(out.response.status, 200);
  const byKey = Object.fromEntries(out.body.licenses.map((l) => [l.key, l]));
  assert.equal(byKey['TABAN-KEY-0009'].updatesUntil, null, 'free plugin: no updates date');
  assert.equal(byKey['HAVA-KEY-0008'].updatesUntil, '2028-10-05', 'paid plugin keeps its updates date');
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
  // Not proven (password, email_verified false): the admin address opens nothing extra and sees nothing of the family.
  for (const [path, key] of [['/api/launch2/status', 'paid'], ['/api/purchases/status', 'owned'], ['/api/purchases/licenses', 'licenses']]) {
    const r = await authReq(path, 'unv-admin5', `10.9.3.${path.length}`);
    assert.equal(r.response.status, 200, path);
    assert.ok([false, 0].includes(r.body[key]?.length ?? r.body[key]), path);
    assert.notEqual(r.body.standing, 'paid');
  }
  const t = await ticketReq('unv-admin5', '10.9.3.90', 'koro', 'launch2');
  assert.equal(t.response.status, 402);
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

const ORDER_TAIL = [
  'Your licence key is on the same card (Account \u2192 Licence keys).',
  'After installing, rescan plug-ins in your DAW: VST3 in /Library/Audio/Plug-Ins/VST3 (macOS) or C:\\Program Files\\Common Files\\VST3 (Windows); AU in /Library/Audio/Plug-Ins/Components.',
  'Stuck? Reply to your receipt e-mail or use \u201cReport a problem\u201d on the Account page.',
];
// orderPayload carries no order number, so the first line falls back to "Your order, DATE.".
const ORDER_BODY_KUBBE = ['Your order, 2026-10-05.', 'Download: Account \u2192 KUBBE \u2192 Download for macOS / Windows.', ...ORDER_TAIL].join('\n');
// ---- Inbox (9 Oct) -----------------------------------------------------------------------------------------------
const inboxOf = (uid) => [...state.db.docs.keys()].filter((p) => p.startsWith(`inbox/${uid}/messages/`));
const postRead = (uid, body, ip) => call('/api/inbox/read', { method: 'POST', headers: { ...headersFor(ip), authorization: `Bearer valid-${uid}` }, body: JSON.stringify(body) });
await test('inbox: welcome is written once, on the first successful /api/purchases/status', async () => {
  resetDb({ claimed: 1000 });
  assert.equal(inboxOf('wel').length, 0);
  assert.equal((await authReq('/api/purchases/status', 'wel', '10.0.30.1')).response.status, 200);
  await authReq('/api/purchases/status', 'wel', '10.0.30.2');
  const docs = inboxOf('wel');
  assert.deepEqual(docs, ['inbox/wel/messages/welcome']);
  const m = state.db.docs.get(docs[0]);
  assert.equal(m.title, 'Welcome to SubverseLab');
  assert.equal(m.read, false);
  assert.equal(m.link, '/account');
  // A non-proven account with a real address is answered too (no verification mail any more) and gets its welcome.
  assert.equal((await authReq('/api/purchases/status', 'unv-wel', '10.0.30.3')).response.status, 200);
  assert.deepEqual(inboxOf('unv-wel'), ['inbox/unv-wel/messages/welcome']);
  // A 403 (address cannot receive mail) writes nothing.
  assert.equal((await authReq('/api/purchases/status', 'unv-nomx', '10.0.30.4')).response.status, 403);
  assert.equal(inboxOf('unv-nomx').length, 0);
});
await test('inbox: a paid order writes one message; a twice-delivered webhook still gives one', async () => {
  resetDb({ claimed: 1000 });
  const raw = orderPayload('ord1@example.com', { id: 'I1', product: 1402269, uid: 'ord1' });
  const saved = process.env.LS_PRODUCT_SLUGS; process.env.LS_PRODUCT_SLUGS = '1402269:kubbe';
  try {
    const first = await hook(raw);
    assert.equal(first.response.status, 200);
    assert.equal(first.body.inbox, 'created');
    state.db.docs.set('inbox/ord1/messages/order-I1', { ...state.db.docs.get('inbox/ord1/messages/order-I1'), read: true });
    const second = await hook(raw);
    assert.equal(second.body.inbox, 'exists');
    assert.deepEqual(inboxOf('ord1'), ['inbox/ord1/messages/order-I1']);
    const m = state.db.docs.get('inbox/ord1/messages/order-I1');
    assert.deepEqual([m.title, m.body, m.link, m.kind, m.read], ['Your KUBBE is ready', ORDER_BODY_KUBBE, '/account#kubbe', 'order', true], 'a re-delivery does not reset the read flag');
  } finally { process.env.LS_PRODUCT_SLUGS = saved; }
});
await test('inbox: family order title, $0 free order, refunds and unpaid orders', async () => {
  resetDb({ claimed: 1000 });
  await hook(orderPayload('fam1@example.com', { id: 'I2', product: 5550, uid: 'fam1' }));
  assert.equal(state.db.docs.get('inbox/fam1/messages/order-I2').title, 'Your SubverseLab plugin family is ready');
  assert.equal(state.db.docs.get('inbox/fam1/messages/order-I2').link, '/account');
  // A $0 free plugin order (TABAN), uid from custom data.
  const saved = process.env.LS_PRODUCT_SLUGS; process.env.LS_PRODUCT_SLUGS = '1422884:taban';
  try {
    const free = JSON.stringify({ meta: { event_name: 'order_created', custom_data: { uid: 'free1' } }, data: { id: 'I3', attributes: { user_email: 'free1@example.com', status: 'paid', total: 0, total_usd: 0, currency: 'USD', created_at: '2026-10-05T10:00:00Z', first_order_item: { product_id: 1422884, variant_id: 2 } } } });
    assert.equal((await hook(free)).body.inbox, 'created');
    assert.equal(state.db.docs.get('inbox/free1/messages/order-I3').title, 'Your TABAN is ready');
    assert.equal(state.db.docs.get('inbox/free1/messages/order-I3').link, '/account#taban');
  } finally { process.env.LS_PRODUCT_SLUGS = saved; }
  // Pending / refund events do not write a message.
  await hook(orderPayload('pend1@example.com', { id: 'I4', status: 'pending', uid: 'pend1' }));
  await hook(orderPayload('ref1@example.com', { id: 'I5', event: 'order_refunded', uid: 'ref1' }));
  assert.equal(inboxOf('pend1').length + inboxOf('ref1').length, 0);
});
await test('inbox: without custom data the account is found by the order e-mail; an unknown e-mail is ignored; failures never fail the webhook', async () => {
  resetDb({ claimed: 1000 });
  state.users.set('byme@example.com', 'uid-byme');
  const saved = process.env.LS_PRODUCT_SLUGS; process.env.LS_PRODUCT_SLUGS = '1402277:kaset';
  try {
    const found = await hook(orderPayload('byme@example.com', { id: 'I6', product: 1402277 }));
    assert.equal(found.body.inbox, 'created');
    assert.equal(state.db.docs.get('inbox/uid-byme/messages/order-I6').link, '/account#kaset');
    const unknown = await hook(orderPayload('ghost@example.com', { id: 'I7', product: 1402277 }));
    assert.equal(unknown.response.status, 200);
    assert.equal(unknown.body.inbox, 'no-account');
    assert.equal([...state.db.docs.keys()].filter((p) => p.startsWith('inbox/') && p.includes('I7')).length, 0);
    // The inbox write blows up: the webhook still answers 200 and the order is stored.
    const origCollection = state.db.collection;
    state.db.collection = (name) => { if (name === 'inbox') throw new Error('inbox down'); return origCollection(name); };
    const errors = []; const origError = console.error; console.error = (...a) => errors.push(a.join(' '));
    try {
      state.users.set('boom@example.com', 'uid-boom');
      const boom = await hook(orderPayload('boom@example.com', { id: 'I8', product: 1402277 }));
      assert.equal(boom.response.status, 200);
      assert.equal(boom.body.inbox, 'error');
      assert.ok(state.db.docs.get('plugin_licenses/boom@example.com').orders.I8, 'order stored');
    } finally { state.db.collection = origCollection; console.error = origError; }
    assert.ok(errors.some((e) => /inbox order message: inbox down/.test(e)));
  } finally { process.env.LS_PRODUCT_SLUGS = saved; }
});
await test('inbox: GET lists newest first with the unread count; read marks ids or all; another user sees and changes nothing', async () => {
  resetDb({ claimed: 1000 });
  const put = (uid, id, createdAt, extra = {}) => state.db.docs.set(`inbox/${uid}/messages/${id}`, { title: `T ${id}`, body: 'b', link: '/account', kind: 'info', createdAt, read: false, ...extra });
  put('ann', 'm1', '2026-10-01T10:00:00Z'); put('ann', 'm2', '2026-10-03T10:00:00Z'); put('ann', 'm3', '2026-10-02T10:00:00Z', { read: true });
  put('bob', 'b1', '2026-10-04T10:00:00Z');
  const list = await authReq('/api/inbox', 'ann', '10.0.31.1');
  assert.equal(list.response.status, 200);
  assert.deepEqual(list.body.messages.map((m) => m.id), ['m2', 'm3', 'm1']);
  assert.equal(list.body.unread, 2);
  assert.equal(list.body.messages[0].title, 'T m2');
  // Bob only ever sees his own.
  assert.deepEqual((await authReq('/api/inbox', 'bob', '10.0.31.2')).body.messages.map((m) => m.id), ['b1']);
  // Bob cannot mark Ann's message by id.
  const evil = await postRead('bob', { ids: ['m1'] }, '10.0.31.3');
  assert.equal(evil.body.changed, 0);
  assert.equal(state.db.docs.get('inbox/ann/messages/m1').read, false);
  const one = await postRead('ann', { ids: ['m1', '../x', 5, 'nope'] }, '10.0.31.4');
  assert.equal(one.body.changed, 1);
  assert.equal(state.db.docs.get('inbox/ann/messages/m1').read, true);
  assert.equal((await authReq('/api/inbox', 'ann', '10.0.31.5')).body.unread, 1);
  const all = await postRead('ann', { all: true }, '10.0.31.6');
  assert.equal(all.body.changed, 1);
  assert.equal((await authReq('/api/inbox', 'ann', '10.0.31.7')).body.unread, 0);
  assert.equal(state.db.docs.get('inbox/bob/messages/b1').read, false, 'all:true touches only the caller');
  // No token / bad token.
  assert.equal((await call('/api/inbox', { headers: headersFor('10.0.31.8') })).response.status, 401);
  assert.equal((await call('/api/inbox/read', { method: 'POST', headers: headersFor('10.0.31.9'), body: '{}' })).response.status, 401);
  assert.equal((await call('/api/inbox', { headers: { ...headersFor('10.0.31.10'), authorization: 'Bearer junk' } })).response.status, 401);
});
await test('inbox: an unverified password account may read and mark its inbox; only 50 messages come back', async () => {
  resetDb({ claimed: 1000 });
  for (let i = 0; i < 55; i += 1) state.db.docs.set(`inbox/unv-box/messages/n${String(i).padStart(2, '0')}`, { title: `N${i}`, body: '', link: '', kind: 'info', createdAt: `2026-10-01T10:${String(i).padStart(2, '0')}:00Z`, read: false });
  const list = await authReq('/api/inbox', 'unv-box', '10.0.32.1');
  assert.equal(list.response.status, 200);
  assert.equal(list.body.messages.length, 50);
  assert.equal(list.body.messages[0].id, 'n54');
  assert.equal((await postRead('unv-box', { all: true }, '10.0.32.2')).response.status, 200);
  assert.equal((await authReq('/api/inbox', 'unv-box', '10.0.32.3')).body.unread, 0);
});
await test('inbox: requests are rate limited like the other routes', async () => {
  resetDb({ claimed: 1000 });
  let limited = 0;
  for (let i = 0; i < 40; i += 1) if ((await authReq('/api/inbox', 'rl', '10.0.33.1')).response.status === 429) limited += 1;
  assert.ok(limited > 0);
});

// ---- Orders bound to the account (orders_by_uid, owner 9 Oct): the uid finds the order, not the checkout e-mail -------
const unvStatus = (uid, ip) => call('/api/purchases/status', { headers: { ...headersFor(ip), authorization: `Bearer valid-${uid}` } });
await test('uid-bound TABAN order with a different checkout e-mail: 200 for the verified and the unverified account; index doc written', async () => {
  resetDb({ claimed: 1000 });
  const w = await hook(freeOrder('typed-elsewhere@mail.test', { id: 'UB1', uid: 'ub1' }));
  assert.equal(w.response.status, 200);
  assert.deepEqual(state.db.docs.get('orders_by_uid/ub1'), { orders: { UB1: { product: 'taban', status: 'paid', refunded: false, created: '2026-10-08T10:00:00Z', email: 'typed-elsewhere@mail.test' } } });
  const ok = await ticketReq('ub1', '10.0.40.1', 'taban', 'free');
  assert.equal(ok.response.status, 200); assert.equal(decodeTicket(ok.body.url).slug, 'taban');
  // The unverified password account (same uid, e-mail never verified) gets it as well.
  await hook(freeOrder('typed-elsewhere2@mail.test', { id: 'UB1u', uid: 'unv-ub1' }));
  const unv = await ticketReq('unv-ub1', '10.0.40.2', 'taban', 'free');
  assert.equal(unv.response.status, 200); assert.equal(decodeTicket(unv.body.url).slug, 'taban');
  assert.equal((await ticketReq('unv-ub1', '10.0.40.3', 'alev', 'free')).response.status, 402, 'only the plugin of the bound order');
  assert.equal((await ticketReq('unv-ub1', '10.0.40.4', 'koro', 'launch2')).response.status, 402, 'nothing else opens');
  const st = await unvStatus('unv-ub1', '10.0.40.5');
  assert.equal(st.response.status, 200); assert.deepEqual(st.body.owned, ['taban']); assert.equal(st.body.unverified, true); assert.equal(st.body.standing, 'none');
  const vst = await unvStatus('ub1', '10.0.40.6');
  assert.deepEqual(vst.body.owned, ['taban']); assert.equal(vst.body.unverified, false);
  // Same e-mail twice: a second order from the verified e-mail adds to, not replaces, the union.
  await hook(freeOrder('ub1@example.com', { id: 'UB1b' }));
  assert.deepEqual((await unvStatus('ub1', '10.0.40.7')).body.owned, ['taban']);
});
await test('uid-bound paid single (KORO) with a different checkout e-mail: 200 also when unverified; the licence key is shown for exactly that order', async () => {
  resetDb({ claimed: 1000 });
  await hook(named('buyer-other@mail.test', { id: 'UB2', product: SLUG_IDS.koro, uid: 'unv-ub2' }));
  await hook(named('buyer-other@mail.test', { id: 'UB2x', product: SLUG_IDS.yanki }));   // same e-mail, another order, no uid: not this account's
  await hook(licPayload('buyer-other@mail.test', { id: 'K2', key: 'KEY-KORO-UB2', product: SLUG_IDS.koro, orderId: 'UB2', uid: 'unv-ub2' }));
  await hook(licPayload('buyer-other@mail.test', { id: 'K2x', key: 'KEY-YANKI-X', product: SLUG_IDS.yanki, orderId: 'UB2x' }));
  assert.equal(state.db.docs.get('orders_by_uid/unv-ub2').orders.UB2.product, 'koro');
  const t = await ticketReq('unv-ub2', '10.0.41.1', 'koro', 'launch2');
  assert.equal(t.response.status, 200); assert.equal(decodeTicket(t.body.url).slug, 'koro');
  assert.equal((await ticketReq('unv-ub2', '10.0.41.2', 'yanki', 'launch2')).response.status, 402);
  const st = await unvStatus('unv-ub2', '10.0.41.3');
  assert.deepEqual(st.body.owned, ['koro']); assert.equal(st.body.unverified, true); assert.equal(st.body.purchased.koro, '2026-10-05');
  const lic = await authReq('/api/purchases/licenses', 'unv-ub2', '10.0.41.4');
  assert.equal(lic.response.status, 200);
  assert.deepEqual(lic.body.licenses.map((l) => l.key), ['KEY-KORO-UB2']);
  // The same account verified sees the same single key (union with the e-mail record of the account itself, which is empty).
  await hook(named('buyer-other@mail.test', { id: 'UB2v', product: SLUG_IDS.koro, uid: 'ub2v' }));
  await hook(licPayload('buyer-other@mail.test', { id: 'K2v', key: 'KEY-KORO-UB2V', product: SLUG_IDS.koro, orderId: 'UB2v', uid: 'ub2v' }));
  assert.deepEqual((await authReq('/api/purchases/licenses', 'ub2v', '10.0.41.5')).body.licenses.map((l) => l.key), ['KEY-KORO-UB2V']);
  assert.equal((await ticketReq('ub2v', '10.0.41.6', 'koro', 'launch2')).response.status, 200);
});
await test('uid-bound KUBBE single opens KUBBE through the launch room when the free 1,000 are gone, also unverified; no seat is claimed', async () => {
  resetDb({ claimed: 1000 });
  await hook(named('else@mail.test', { id: 'UB3', product: SLUG_IDS.kubbe, uid: 'unv-ub3' }));
  assert.equal((await shop('unv-ub3', 'kubbe', '10.0.42.1')).response.status, 200);
  assert.equal((await shop('unv-ub3', 'kaset', '10.0.42.2')).response.status, 402);
  assert.deepEqual((await unvStatus('unv-ub3', '10.0.42.3')).body.owned, ['kubbe']);
  assert.equal(state.db.docs.get('launch/counter').claimed, 1000);
  resetDb({ claimed: 10 });
  await hook(named('else@mail.test', { id: 'UB3b', product: SLUG_IDS.kubbe, uid: 'unv-ub3b' }));
  assert.equal((await shop('unv-ub3b', 'kubbe', '10.0.42.4')).response.status, 200);
  assert.equal(state.db.docs.get('launch/counter').claimed, 10, 'an unverified buyer does not take a free seat');
});
await test('a paid order found only by e-mail needs a proven e-mail: a non-proven account gets 403 (single, kubbe) and no keys; the $0 one opens (owner 24 Oct)', async () => {
  resetDb({ claimed: 1000 });
  await hook(freeOrder('unv-eo@example.com', { id: 'EO1' }));
  await hook(named('unv-eo@example.com', { id: 'EO2', product: SLUG_IDS.koro }));
  await hook(named('unv-eo@example.com', { id: 'EO3', product: SLUG_IDS.kubbe }));
  state.db.docs.set('plugin_licenses/unv-eo@example.com', { ...state.db.docs.get('plugin_licenses/unv-eo@example.com'), licenses: { L1: { license_id: 'L1', key: 'KEY-EO-1', order_id: 'EO2', product: 'koro', status: 'active' } } });
  assert.equal(state.db.docs.has('orders_by_uid/unv-eo'), false, 'no uid, no index');
  assert.equal((await ticketReq('unv-eo', '10.0.43.1', 'taban', 'free')).response.status, 200, 'free plugin opens by e-mail');
  for (const [slug, launchId, ip] of [['koro', 'launch2', '10.0.43.2'], ['kubbe', 'launch', '10.0.43.3']]) {
    const r = await ticketReq('unv-eo', ip, slug, launchId);
    assert.equal(r.response.status, 403, slug); assert.match(r.body.error, /Claim it with the order number/); assert.equal(r.body.url, undefined);
  }
  const st = await unvStatus('unv-eo', '10.0.43.4');
  assert.equal(st.response.status, 200); assert.deepEqual(st.body.owned, ['taban']); assert.equal(st.body.unverified, true);
  const lic = await authReq('/api/purchases/licenses', 'unv-eo', '10.0.43.5');
  assert.equal(lic.response.status, 200); assert.deepEqual(lic.body.licenses, []); assert.equal(JSON.stringify(lic.body).includes('KEY-EO-1'), false);
  // The same orders under a proven e-mail (email_verified true, or Google) open without a claim.
  await hook(freeOrder('eo-ok@example.com', { id: 'EO4' }));
  await hook(freeOrder('google-eo@example.com', { id: 'EO5' }));
  assert.equal((await ticketReq('eo-ok', '10.0.43.6', 'taban', 'free')).response.status, 200);
  assert.equal((await ticketReq('google-eo', '10.0.43.7', 'taban', 'free')).response.status, 200);
});
await test('a refunded uid-bound order: 402 (verified and unverified), the index follows the refund, even when the refund carries no uid', async () => {
  resetDb({ claimed: 1000 });
  await hook(freeOrder('r@mail.test', { id: 'RF1', uid: 'rf1' }));
  await hook(named('r@mail.test', { id: 'RF2', product: SLUG_IDS.koro, uid: 'unv-rf2' }));
  assert.equal((await ticketReq('rf1', '10.0.44.1', 'taban', 'free')).response.status, 200);
  assert.equal((await ticketReq('unv-rf2', '10.0.44.2', 'koro', 'launch2')).response.status, 200);
  await hook(freeOrder('r@mail.test', { id: 'RF1', uid: 'rf1', status: 'refunded', event: 'order_refunded' }));
  await hook(named('r@mail.test', { id: 'RF2', product: SLUG_IDS.koro, status: 'refunded', event: 'order_refunded' }));   // no custom_data on the refund
  assert.equal(state.db.docs.get('orders_by_uid/rf1').orders.RF1.refunded, true);
  assert.equal(state.db.docs.get('orders_by_uid/unv-rf2').orders.RF2.refunded, true);
  assert.equal((await ticketReq('rf1', '10.0.44.3', 'taban', 'free')).response.status, 402);
  assert.equal((await ticketReq('unv-rf2', '10.0.44.4', 'koro', 'launch2')).response.status, 402);
  const rfSt = await unvStatus('unv-rf2', '10.0.44.5');
  assert.equal(rfSt.response.status, 200); assert.deepEqual(rfSt.body.owned, [], 'nothing left to show');
  const rfLic = await authReq('/api/purchases/licenses', 'unv-rf2', '10.0.44.6');
  assert.equal(rfLic.response.status, 200); assert.deepEqual(rfLic.body.licenses, []);
  // A refund for an account whose index is gone (deleted) does not re-create it.
  state.db.docs.delete('orders_by_uid/rf1');
  await hook(freeOrder('r@mail.test', { id: 'RF1', uid: 'rf1', status: 'refunded', event: 'order_refunded' }));
  assert.equal(state.db.docs.has('orders_by_uid/rf1'), false);
});
await test('another uid gets nothing from a uid-bound order, even with the buyer\'s checkout e-mail as its own', async () => {
  resetDb({ claimed: 1000 });
  await hook(freeOrder('shared-ub5@example.com', { id: 'UB5', uid: 'owner-ub5' }));
  await hook(named('shared-ub5@example.com', { id: 'UB5k', product: SLUG_IDS.koro, uid: 'owner-ub5' }));
  assert.equal((await ticketReq('stranger', '10.0.45.1', 'taban', 'free')).response.status, 402);
  assert.equal((await ticketReq('unv-stranger', '10.0.45.2', 'taban', 'free')).response.status, 402);
  assert.equal((await ticketReq('unv-stranger', '10.0.45.3', 'koro', 'launch2')).response.status, 402);
  assert.deepEqual((await unvStatus('unv-stranger', '10.0.45.4')).body.owned, []);
  assert.deepEqual((await authReq('/api/purchases/licenses', 'unv-stranger', '10.0.45.5')).body.licenses, []);
  assert.deepEqual((await unvStatus('stranger', '10.0.45.6')).body.owned, []);
  assert.equal((await ticketReq('owner-ub5', '10.0.45.7', 'taban', 'free')).response.status, 200);
  // A bad uid (not a doc id) is ignored: no index document is created for it.
  await hook(freeOrder('bad-uid@example.com', { id: 'UB5b', uid: 'a/b' }));
  assert.equal([...state.db.docs.keys()].some((k) => k.startsWith('orders_by_uid/') && k !== 'orders_by_uid/owner-ub5'), false);
});
await test('uid-bound family (launch2_uids) opens an unverified account: all seven plugins, status 200 unverified', async () => {
  resetDb({ claimed: 1000 });
  await hook(named('fam-else@mail.test', { id: 'UB6', product: SLUG_IDS.family, name: 'SubverseLab Plugin Family (7 plugins)', uid: 'unv-ub6' }));
  assert.equal((await ticketReq('unv-ub6', '10.0.46.1', 'hava', 'launch2')).response.status, 200);
  const st = await unvStatus('unv-ub6', '10.0.46.2');
  assert.equal(st.response.status, 200); assert.equal(st.body.unverified, true); assert.equal(st.body.standing, 'paid');
  assert.deepEqual(st.body.owned, ['kubbe', 'kaset', 'koro', 'yanki', 'hava', 'mihenk', 'tutkal']);
  assert.equal((await ticketReq('unv-ub6', '10.0.46.3', 'taban', 'free')).response.status, 402, 'free plugins are not in the family');
});

// ---- Backfill script: dry run by default, --write applies -----------------------------------------------------------
await test('backfill-orders-by-uid: the dry run lists the right documents and writes nothing; --write builds them', async () => {
  const { backfillOrdersByUid, buildOrdersByUid } = await import(pathToFileURL(resolve(root, 'scripts/backfill-orders-by-uid.js')).href);
  resetDb();
  const lic = (email, orders) => state.db.docs.set(`plugin_licenses/${email}`, { email, orders });
  lic('a@mail.test', { O1: { order_id: 'O1', product: 'taban', status: 'paid', refunded: false, created: '2026-10-08T10:00:00Z', uid: 'uidA' }, O2: { order_id: 'O2', product: 'koro', status: 'paid', refunded: true, created: '2026-10-09T10:00:00Z', uid: 'uidA' }, O3: { order_id: 'O3', product: 'hava', status: 'paid', created: '2026-10-09T10:00:00Z' } });
  lic('b@mail.test', { O4: { order_id: 'O4', product: 'family', status: 'paid', refunded: false, created: '2026-10-07T10:00:00Z', uid: 'uidB' }, O5: { order_id: 'O5', product: 'alev', status: 'paid', created: '2026-10-07T11:00:00Z', uid: 'uidA' }, O6: { order_id: 'O6', product: 'x', status: 'paid', uid: 'a/b' } });
  lic('c@mail.test', { O7: { order_id: 'O7', product: 'kubbe', status: 'paid', created: '2026-10-01T10:00:00Z' } });
  const before = clone([...state.db.docs.entries()]);
  const lines = [];
  const dry = await backfillOrdersByUid(state.db, { log: (l) => lines.push(l) });
  assert.deepEqual([...dry.docs.keys()].sort(), ['uidA', 'uidB']);
  assert.equal(dry.written, 0);
  assert.deepEqual(clone([...state.db.docs.entries()]), before, 'dry run writes nothing');
  assert.ok(lines.some((l) => l.startsWith('DRY') && l.includes('orders_by_uid/uidA') && l.includes('3 order(s)') && l.includes('O1=taban') && l.includes('O2=koro(refunded)') && l.includes('O5=alev')));
  assert.ok(lines.some((l) => l.startsWith('DRY') && l.includes('orders_by_uid/uidB') && l.includes('O4=family')));
  assert.ok(lines.some((l) => l.includes('would write 2') && l.includes('3 plugin_licenses')));
  assert.ok(!lines.some((l) => l.includes('uid=') || l.includes('a/b')), 'orders without a usable uid are skipped');
  const real = await backfillOrdersByUid(state.db, { write: true, log: () => {} });
  assert.equal(real.written, 2);
  assert.deepEqual(state.db.docs.get('orders_by_uid/uidB'), { orders: { O4: { product: 'family', status: 'paid', refunded: false, created: '2026-10-07T10:00:00Z', email: 'b@mail.test' } } });
  assert.deepEqual(Object.keys(state.db.docs.get('orders_by_uid/uidA').orders).sort(), ['O1', 'O2', 'O5']);
  assert.equal(state.db.docs.get('orders_by_uid/uidA').orders.O5.email, 'b@mail.test');
  assert.equal(buildOrdersByUid([]).size, 0);
  // Rerun is idempotent, and what the backfill built opens the download like the webhook's own index.
  await backfillOrdersByUid(state.db, { write: true, log: () => {} });
  assert.deepEqual(Object.keys(state.db.docs.get('orders_by_uid/uidA').orders).sort(), ['O1', 'O2', 'O5']);
  assert.equal((await ticketReq('uidA', '10.0.47.1', 'taban', 'free')).response.status, 200);
  assert.equal((await ticketReq('uidA', '10.0.47.2', 'alev', 'free')).response.status, 200);
  assert.equal((await ticketReq('uidA', '10.0.47.3', 'koro', 'launch2')).response.status, 402, 'the refunded order stays closed');
});
// ---- Claim an order placed without signing in (9 Oct) -----------------------------------------------------------
function claimHook(email, { id, number, product = 1402269, event = 'order_created', status = 'paid', total = 1500, refunded = false } = {}) {
  return JSON.stringify({ meta: { event_name: event }, data: { id: String(id), attributes: { user_email: email, order_number: number, status, refunded, total, total_usd: total, currency: 'USD', created_at: '2026-10-05T10:00:00Z', first_order_item: { product_id: product, variant_id: 1 } } } });
}
const claimReq = (uid, body, ip, headers = {}) => call('/api/orders/claim', { method: 'POST', headers: { ...headersFor(ip), authorization: `Bearer valid-${uid}`, ...headers }, body: JSON.stringify(body) });
const withSlugs = async (map, fn) => { const saved = process.env.LS_PRODUCT_SLUGS; process.env.LS_PRODUCT_SLUGS = map; try { await fn(); } finally { process.env.LS_PRODUCT_SLUGS = saved; } };
await test('claim: a single order placed without an account moves to an unverified account; keys, index, inbox and the ticket route follow', async () => {
  resetDb({ claimed: 1000 });
  await withSlugs('1402269:kubbe', async () => {
    assert.equal((await hook(claimHook('Buyer1@Other.test', { id: 'C1', number: 4001 }))).response.status, 200);
    state.db.docs.set('plugin_licenses/buyer1@other.test', { ...state.db.docs.get('plugin_licenses/buyer1@other.test'), licenses: { L1: { license_id: 'L1', key: 'KEY-1', order_id: 'C1', status: 'active' }, L2: { license_id: 'L2', key: 'KEY-2', order_id: 'OTHER', status: 'active' } } });
    assert.equal((await ticketReq('unv-cl1', '10.0.60.1', 'kubbe', 'launch')).response.status, 402, 'before the claim an unverified account gets nothing');
    const r = await claimReq('unv-cl1', { orderNumber: '#4001', email: ' BUYER1@other.test ' }, '10.0.60.2');
    assert.equal(r.response.status, 200);
    assert.deepEqual(r.body, { slugs: ['kubbe'] });
    const lic = state.db.docs.get('plugin_licenses/buyer1@other.test');
    assert.equal(lic.orders.C1.uid, 'unv-cl1');
    assert.equal(lic.licenses.L1.uid, 'unv-cl1');
    assert.equal(lic.licenses.L2.uid, undefined, 'another order of the same e-mail is not touched');
    assert.deepEqual(state.db.docs.get('orders_by_uid/unv-cl1').orders.C1, { product: 'kubbe', status: 'paid', refunded: false, created: '2026-10-05T10:00:00Z', email: 'buyer1@other.test' });
    const m = state.db.docs.get('inbox/unv-cl1/messages/order-C1');
    assert.equal(m.title, 'Your KUBBE is ready');
    assert.equal(m.body, ['Order #4001, 2026-10-05.', 'Download: Account \u2192 KUBBE \u2192 Download for macOS / Windows.', ...ORDER_TAIL].join('\n'));
    assert.equal(m.link, '/account#kubbe');
    assert.equal((await ticketReq('unv-cl1', '10.0.60.3', 'kubbe', 'launch')).response.status, 200, 'the ticket route opens the plugin for the unverified account');
    assert.equal((await ticketReq('unv-cl1', '10.0.60.4', 'kaset', 'launch')).response.status, 402, 'only that plugin');
    assert.deepEqual((await authReq('/api/purchases/status', 'unv-cl1', '10.0.60.5')).body.owned, ['kubbe']);
    const keys = (await authReq('/api/purchases/licenses', 'unv-cl1', '10.0.60.6')).body.licenses;
    assert.deepEqual(keys.map((k) => k.key), ['KEY-1']);
    // Claiming the same order again from the same account is harmless.
    assert.equal((await claimReq('unv-cl1', { orderNumber: '4001', email: 'buyer1@other.test' }, '10.0.60.7')).response.status, 200);
    assert.equal(inboxOf('unv-cl1').filter((p) => p.includes('order-')).length, 1);
  });
});
await test('claim: a free $0 order, and the order message says Free', async () => {
  resetDb({ claimed: 1000 });
  await withSlugs('1422884:taban', async () => {
    await hook(claimHook('free@other.test', { id: 'C2', number: 4002, product: 1422884, total: 0 }));
    const r = await claimReq('unv-cl2', { orderNumber: 4002, email: 'free@other.test' }, '10.0.61.1');
    assert.equal(r.response.status, 200);
    assert.deepEqual(r.body, { slugs: ['taban'] });
    const m = state.db.docs.get('inbox/unv-cl2/messages/order-C2');
    assert.equal(m.title, 'Your TABAN is ready');
    assert.equal(m.body.split('\n')[0], 'Order #4002, 2026-10-05. Free');
    assert.equal((await ticketReq('unv-cl2', '10.0.61.2', 'taban', 'free')).response.status, 200);
  });
});
await test('claim: the family order writes launch2_uids like the webhook and opens the family for an unverified account', async () => {
  resetDb({ claimed: 1000 });
  assert.equal((await hook(claimHook('fam@other.test', { id: 'C3', number: 4003, product: 5550, total: 1999 }))).response.status, 200);
  assert.equal(state.db.docs.get('launch2_purchases/fam@other.test').uid, undefined);
  assert.equal((await ticketReq('unv-cl3', '10.0.62.1', 'koro', 'launch2')).response.status, 402);
  const r = await claimReq('unv-cl3', { orderNumber: '4003', email: 'fam@other.test' }, '10.0.62.2');
  assert.equal(r.response.status, 200);
  assert.deepEqual(r.body.slugs, ['kubbe', 'kaset', 'koro', 'yanki', 'hava', 'mihenk', 'tutkal']);
  assert.deepEqual(state.db.docs.get('launch2_uids/unv-cl3'), { email: 'fam@other.test', orderId: 'C3', at: '2026-10-05T10:00:00Z' });
  assert.equal(state.db.docs.get('launch2_purchases/fam@other.test').uid, 'unv-cl3');
  assert.equal(state.db.docs.get('inbox/unv-cl3/messages/order-C3').title, 'Your SubverseLab plugin family is ready');
  assert.match(state.db.docs.get('inbox/unv-cl3/messages/order-C3').body, /Account \u2192 each plugin \u2192 Download/);
  assert.equal((await ticketReq('unv-cl3', '10.0.62.3', 'koro', 'launch2')).response.status, 200);
  assert.equal((await authReq('/api/purchases/status', 'unv-cl3', '10.0.62.4')).body.standing, 'paid', 'status shows the family');
  // Another account cannot take the same family order.
  assert.equal((await claimReq('cl3-thief', { orderNumber: '4003', email: 'fam@other.test' }, '10.0.62.5')).response.status, 409);
});
await test('claim: wrong e-mail or number 404, bad input 400, refunded 402, taken by another account 409, no token 401', async () => {
  resetDb({ claimed: 1000 });
  await withSlugs('1402269:kubbe', async () => {
    await hook(claimHook('real@other.test', { id: 'C4', number: 4004 }));
    const wrongMail = await claimReq('cl4a', { orderNumber: '4004', email: 'someone-else@other.test' }, '10.0.63.1');
    assert.equal(wrongMail.response.status, 404);
    assert.match(wrongMail.body.error, /No order with this number/);
    assert.equal((await claimReq('cl4a', { orderNumber: '9999', email: 'real@other.test' }, '10.0.63.2')).response.status, 404);
    assert.equal((await claimReq('cl4a', { orderNumber: 'abc', email: 'real@other.test' }, '10.0.63.3')).response.status, 400);
    assert.equal((await claimReq('cl4a', { orderNumber: '4004', email: 'a/b@x.test' }, '10.0.63.4')).response.status, 400);
    assert.deepEqual([...state.db.docs.keys()].filter((k) => k.startsWith('orders_by_uid/')), [], 'nothing was bound by the failed tries');
    assert.equal((await call('/api/orders/claim', { method: 'POST', headers: headersFor('10.0.63.5'), body: JSON.stringify({ orderNumber: '4004', email: 'real@other.test' }) })).response.status, 401);
    // Refunded.
    await hook(claimHook('refd@other.test', { id: 'C5', number: 4005 }));
    await hook(claimHook('refd@other.test', { id: 'C5', number: 4005, event: 'order_refunded', status: 'refunded', refunded: true }));
    const refunded = await claimReq('cl5', { orderNumber: '4005', email: 'refd@other.test' }, '10.0.63.6');
    assert.equal(refunded.response.status, 402);
    assert.match(refunded.body.error, /refunded/);
    assert.equal(state.db.docs.has('orders_by_uid/cl5'), false);
    // Pending (not paid yet).
    await hook(claimHook('pend@other.test', { id: 'C6', number: 4006, status: 'pending' }));
    assert.equal((await claimReq('cl5', { orderNumber: '4006', email: 'pend@other.test' }, '10.0.63.7')).response.status, 402);
    // Bound to another uid (the order carries a uid from the webhook, or from an earlier claim).
    assert.equal((await claimReq('cl4b', { orderNumber: '4004', email: 'real@other.test' }, '10.0.63.8')).response.status, 200);
    const taken = await claimReq('cl4c', { orderNumber: '4004', email: 'real@other.test' }, '10.0.63.9');
    assert.equal(taken.response.status, 409);
    assert.match(taken.body.error, /already claimed/);
    assert.equal(state.db.docs.has('orders_by_uid/cl4c'), false);
    assert.equal(state.db.docs.get('plugin_licenses/real@other.test').orders.C4.uid, 'cl4b');
  });
});
await test('claim: 5 tries per hour per account, then 429; another account is not affected', async () => {
  resetDb({ claimed: 1000 });
  for (let i = 0; i < 5; i += 1) assert.equal((await claimReq('cl-rate', { orderNumber: '777', email: 'none@other.test' }, `10.0.64.${i + 1}`)).response.status, 404);
  const sixth = await claimReq('cl-rate', { orderNumber: '777', email: 'none@other.test' }, '10.0.64.9');
  assert.equal(sixth.response.status, 429);
  assert.match(sixth.body.error, /Too many tries/);
  assert.equal((await claimReq('cl-rate2', { orderNumber: '777', email: 'none@other.test' }, '10.0.64.10')).response.status, 404);
});
await test('inbox copy: welcome is three lines; order message lines for a plugin, the family and the bundle', async () => {
  const inbox = await import(pathToFileURL(resolve(root, 'api/inbox.js')).href);
  assert.deepEqual(inbox.welcomeMessage.body.split('\n'), [
    'Your downloads, licence keys and tool credits live on the Account page.',
    'Free plugins: get them on their page, they appear here right after.',
    'Messages about your orders arrive in this inbox.',
  ]);
  const fam = inbox.orderMessage('family', { orderNumber: 12, created: '2026-10-09T08:00:00Z' });
  assert.equal(fam.title, 'Your SubverseLab plugin family is ready');
  assert.equal(fam.link, '/account');
  assert.equal(fam.body.split('\n')[0], 'Order #12, 2026-10-09.');
  assert.equal(fam.body.split('\n')[1], 'Download: Account \u2192 each plugin \u2192 Download.');
  assert.equal(inbox.orderMessage('koro').link, '/account#koro');
  assert.ok(inbox.orderMessage('koro', { orderNumber: 3, created: '2026-10-09T08:00:00Z' }).body.length <= 900, 'the body fits the stored limit');
  assert.equal(inbox.orderMessage(null).title, 'Your order is ready');
});

// ---- No verification mail (owner 9 Oct): proof of ownership = the order is bound to the account ------------------------
await test('non-proven account + e-mail-only order: 403 with the claim hint, then a claim with the order number gives 200 (ticket, status, keys)', async () => {
  resetDb({ claimed: 1000 });
  await withSlugs('1402269:kubbe', async () => {
    await hook(claimHook('unv-np1@example.com', { id: 'NP1', number: 5001 }));
    state.db.docs.set('plugin_licenses/unv-np1@example.com', { ...state.db.docs.get('plugin_licenses/unv-np1@example.com'), licenses: { L1: { license_id: 'L1', key: 'KEY-NP1', order_id: 'NP1', product: 'kubbe', status: 'active' } } });
    const before = await shop('unv-np1', 'kubbe', '10.0.70.1');
    assert.equal(before.response.status, 403); assert.match(before.body.error, /Claim it with the order number/);
    assert.deepEqual((await unvStatus('unv-np1', '10.0.70.2')).body.owned, []);
    assert.deepEqual((await authReq('/api/purchases/licenses', 'unv-np1', '10.0.70.3')).body.licenses, []);
    assert.equal((await claimReq('unv-np1', { orderNumber: '5001', email: 'unv-np1@example.com' }, '10.0.70.4')).response.status, 200);
    assert.equal((await shop('unv-np1', 'kubbe', '10.0.70.5')).response.status, 200);
    const st = await unvStatus('unv-np1', '10.0.70.6');
    assert.deepEqual(st.body.owned, ['kubbe']); assert.equal(st.body.unverified, true);
    assert.deepEqual((await authReq('/api/purchases/licenses', 'unv-np1', '10.0.70.7')).body.licenses.map((l) => l.key), ['KEY-NP1']);
    // Proven e-mail (email_verified true) with the same kind of order: 200 without a claim.
    await hook(claimHook('np1-ok@example.com', { id: 'NP1b', number: 5002 }));
    assert.equal((await shop('np1-ok', 'kubbe', '10.0.70.8')).response.status, 200);
    const ok = await unvStatus('np1-ok', '10.0.70.9');
    assert.deepEqual(ok.body.owned, ['kubbe']); assert.equal(ok.body.unverified, false);
  });
});
await test('bounced and no-MX addresses get 403 on tickets, status, keys and claims, whatever the order says; a DNS timeout allows', async () => {
  resetDb({ claimed: 1000 });
  await hook(orderPayload('bounced-b@example.com', { id: 'BN1', uid: 'bounced-b' }));
  state.db.docs.set('bounced_emails/bounced-b@example.com', { at: '2026-10-05T00:00:00Z' });
  await hook(orderPayload('np2-nomx@nomx.invalid', { id: 'BN2', uid: 'np2-nomx' }));
  for (const [uid, ip] of [['bounced-b', '10.0.71.1'], ['np2-nomx', '10.0.71.2']]) {
    const t = await ticketReq(uid, ip, 'koro', 'launch2');
    assert.equal(t.response.status, 403); assert.match(t.body.error, /cannot receive mail/);
    for (const path of ['/api/purchases/status', '/api/purchases/licenses', '/api/launch2/status']) assert.equal((await authReq(path, uid, `${ip}0`)).response.status, 403, `${uid} ${path}`);
  }
  await hook(orderPayload('np2-flaky@flaky.example', { id: 'BN3', uid: 'np2-flaky' }));
  assert.equal((await ticketReq('np2-flaky', '10.0.71.3', 'koro', 'launch2')).response.status, 200);
});
await test('non-proven account mints no new free seat (e-mail records could be taken for someone else\'s address); a seat its uid holds stays', async () => {
  resetDb({ claimed: 10 });
  const t = await shop('unv-seat', 'kubbe', '10.0.72.1');
  assert.equal(t.response.status, 402);
  const c = await call('/api/launch/claim', { method: 'POST', headers: { ...headersFor('10.0.72.2'), authorization: 'Bearer valid-unv-seat' }, body: JSON.stringify({}) });
  assert.equal(c.response.status, 403);
  assert.equal(state.db.docs.get('launch/counter').claimed, 10);
  assert.equal(state.db.docs.has('launch_claims/uid:unv-seat'), false);
  assert.equal((await shop('seat-ok', 'kubbe', '10.0.72.3')).response.status, 200, 'a proven e-mail still takes a seat');
});
await test('GET /api/email/check: syntax, bounced, no MX, a fine address; a DNS timeout allows; rate-limited', async () => {
  resetDb();
  state.db.docs.set('bounced_emails/gone@example.com', { at: '2026-10-05T00:00:00Z' });
  const check = (email, ip) => call(`/api/email/check?email=${encodeURIComponent(email)}`, { headers: headersFor(ip) });
  const ok = await check('Fine@Example.com', '10.0.73.1');
  assert.equal(ok.response.status, 200); assert.deepEqual(ok.body, { ok: true });
  for (const bad of ['', 'nobody', 'a@', '@b.com', 'a b@example.com', 'a/b@example.com', 'a@@example.com']) {
    const r = await check(bad, '10.0.73.2');
    assert.equal(r.body.ok, false, bad); assert.equal(r.body.reason, 'syntax', bad); assert.ok(r.body.error);
  }
  const bounced = await check('gone@example.com', '10.0.73.3');
  assert.equal(bounced.body.ok, false); assert.equal(bounced.body.reason, 'bounced'); assert.match(bounced.body.error, /cannot receive mail/);
  const nomx = await check('x@nomx.invalid', '10.0.73.4');
  assert.equal(nomx.body.ok, false); assert.equal(nomx.body.reason, 'no-mx'); assert.match(nomx.body.error, /domain/);
  assert.deepEqual((await check('x@flaky.example', '10.0.73.5')).body, { ok: true });
  let limited = 0;
  for (let i = 0; i < 30; i += 1) if ((await check('fine@example.com', '10.0.73.99')).response.status === 429) limited += 1;
  assert.ok(limited > 0);
});

// ---- Confirm the e-mail to open signed-out orders (owner bug 25 Oct 2026) ------------------------------------------
// A paid order placed signed out (no uid) + a password account with the same e-mail: before, the account saw nothing until
// the order number was typed. Now /api/purchases/status says emailOrdersWaiting, the account page sends Firebase's
// confirmation link, and once email_verified is true the same account opens the order by e-mail. A second account made
// with the same address (it never gets the link) still opens nothing.
const pwToken = (uid, email, verified = false) => state.tokenAs.set(uid, { uid, email, email_verified: verified, firebase: { sign_in_provider: 'password' } });
await test('confirm e-mail (owner 25 Oct): a signed-out RU-8 order waits for an unconfirmed password account, opens once it confirms, never for a squatter', async () => {
  resetDb({ claimed: 1000 });
  state.tokenAs.clear();
  // RU-8 order without a uid (paid signed out), checkout e-mail buyer25@example.com.
  assert.equal((await hook(named('Buyer25@Example.com', { id: 'CE1', product: SLUG_IDS.ru8, name: 'RU-8' }))).response.status, 200);
  pwToken('pw-ce1', 'buyer25@example.com');
  const before = await authReq('/api/purchases/status', 'pw-ce1', '10.0.80.1');
  assert.equal(before.response.status, 200);
  assert.deepEqual(before.body.owned, [], 'unconfirmed: the paid order is not opened by the e-mail');
  assert.equal(before.body.unverified, true);
  assert.equal(before.body.emailOrdersWaiting, true, 'the page is told to offer the confirmation link');
  assert.equal(JSON.stringify(before.body).includes('ru8'), false, 'what was bought is not revealed before the e-mail is proven');
  const t1 = await ticketReq('pw-ce1', '10.0.80.2', 'ru8', 'solo');
  assert.equal(t1.response.status, 403);
  assert.match(t1.body.error, /confirm your e-mail on your Account page/);
  assert.equal((await authReq('/api/ru8/ios/entitlement', 'pw-ce1', '10.0.80.3')).body.owned, false);
  // The link was opened: the same uid, email_verified true (fresh token). No order number, no write needed.
  pwToken('pw-ce1', 'buyer25@example.com', true);
  const after = await authReq('/api/purchases/status', 'pw-ce1', '10.0.80.4');
  assert.deepEqual(after.body.owned, ['ru8']);
  assert.equal(after.body.unverified, false);
  assert.equal(after.body.emailOrdersWaiting, false);
  const t2 = await ticketReq('pw-ce1', '10.0.80.5', 'ru8', 'solo');
  assert.equal(t2.response.status, 200); assert.equal(decodeTicket(t2.body.url).slug, 'ru8');
  assert.deepEqual((await authReq('/api/ru8/ios/entitlement', 'pw-ce1', '10.0.80.6')).body, { owned: true, via: 'lemonsqueezy' });
  // A second password account with the same address that never confirmed it: told the order waits, opens nothing.
  pwToken('pw-ce1-squat', 'buyer25@example.com');
  const squat = await authReq('/api/purchases/status', 'pw-ce1-squat', '10.0.80.7');
  assert.deepEqual(squat.body.owned, []); assert.equal(squat.body.emailOrdersWaiting, true);
  assert.equal((await ticketReq('pw-ce1-squat', '10.0.80.8', 'ru8', 'solo')).response.status, 403);
  assert.deepEqual((await authReq('/api/purchases/licenses', 'pw-ce1-squat', '10.0.80.9')).body.licenses, []);
});
await test('confirm e-mail: emailOrdersWaiting is false when nothing paid waits (no order, a free order, an order bound to the uid, Google), true for a family or pack bought by e-mail', async () => {
  resetDb({ claimed: 1000 });
  state.tokenAs.clear();
  pwToken('pw-ce2', 'none25@example.com');
  assert.equal((await authReq('/api/purchases/status', 'pw-ce2', '10.0.81.1')).body.emailOrdersWaiting, false, 'no order');
  // A $0 free plugin opens by e-mail already (freeByEmail): nothing to confirm for it.
  await hook(freeOrder('free25@example.com', { id: 'CE2' }));
  pwToken('pw-ce3', 'free25@example.com');
  const free = await authReq('/api/purchases/status', 'pw-ce3', '10.0.81.2');
  assert.deepEqual(free.body.owned, ['taban']); assert.equal(free.body.emailOrdersWaiting, false);
  // A paid order that carries this account's uid is already on the account.
  await hook(named('bound25@example.com', { id: 'CE3', product: SLUG_IDS.koro, name: 'KORO', uid: 'pw-ce4' }));
  pwToken('pw-ce4', 'bound25@example.com');
  const bound = await authReq('/api/purchases/status', 'pw-ce4', '10.0.81.3');
  assert.deepEqual(bound.body.owned, ['koro']); assert.equal(bound.body.emailOrdersWaiting, false);
  // ...but a second, signed-out order under the same e-mail waits.
  await hook(named('bound25@example.com', { id: 'CE4', product: SLUG_IDS.hava, name: 'HAVA' }));
  const more = await authReq('/api/purchases/status', 'pw-ce4', '10.0.81.4');
  assert.deepEqual(more.body.owned, ['koro']); assert.equal(more.body.emailOrdersWaiting, true);
  // The family paid signed out.
  assert.equal((await hook(claimHook('fam25@example.com', { id: 'CE5', number: 4025, product: 5550, total: 1999 }))).response.status, 200);
  pwToken('pw-ce5', 'fam25@example.com');
  const fam = await authReq('/api/purchases/status', 'pw-ce5', '10.0.81.5');
  assert.equal(fam.body.standing, 'none'); assert.equal(fam.body.emailOrdersWaiting, true);
  pwToken('pw-ce5', 'fam25@example.com', true);
  const famAfter = await authReq('/api/purchases/status', 'pw-ce5', '10.0.81.6');
  assert.equal(famAfter.body.standing, 'paid'); assert.equal(famAfter.body.emailOrdersWaiting, false);
  // A paid sample pack bought signed out.
  await hook(paidOrder('pack25@example.com', { id: 'CE6', product: SLUG_IDS.brickyard, name: 'Brickyard' }));
  pwToken('pw-ce6', 'pack25@example.com');
  const pack = await authReq('/api/purchases/status', 'pw-ce6', '10.0.81.7');
  assert.deepEqual(pack.body.packs, []); assert.equal(pack.body.emailOrdersWaiting, true);
  // A Google account reads its e-mail's orders directly: nothing waits.
  await hook(named('google-ce7@example.com', { id: 'CE7', product: SLUG_IDS.koro, name: 'KORO' }));
  const g = await authReq('/api/purchases/status', 'google-ce7', '10.0.81.8');
  assert.deepEqual(g.body.owned, ['koro']); assert.equal(g.body.emailOrdersWaiting, false);
  state.tokenAs.clear();
});
await test('confirm e-mail: the account page sends Firebase\'s own link to the account\'s address only when the server says an order waits', async () => {
  const page = await readFile(resolve(root, 'src/components/AccountPage.jsx'), 'utf8');
  const hook = await readFile(resolve(root, 'src/components/LaunchPage.jsx'), 'utf8');
  assert.match(hook, /emailOrdersWaiting: body\.emailOrdersWaiting === true/);
  assert.match(page, /\{emailOrdersWaiting && <ConfirmEmail user=\{user\}/);
  assert.match(page, /sendEmailVerification\(user, \{ url: `\$\{window\.location\.origin\}\/account` \}\)/, 'the link goes to the signed-in user\'s own address, back to /account');
  assert.match(page, /await user\.reload\(\);\s*if \(user\.emailVerified\) \{ await user\.getIdToken\(true\);/, 'a fresh token carries email_verified to the server');
  const block = page.slice(page.indexOf('function ConfirmEmail'), page.indexOf('// Sample packs and preset packs'));
  for (const banned of [/\bAI\b/, /beta/i, /coming soon/i, /machine learning/i]) assert.doesNotMatch(block, banned);
});

await test('firestore.rules: orders_by_uid is closed to every client; Dockerfile copies every server file server.js imports', async () => {
  const rules = await readFile(resolve(root, 'firestore.rules'), 'utf8');
  assert.match(rules, /match \/orders_by_uid\/\{document=\*\*\} \{\s*allow read, write: if false;/);
  const docker = await readFile(resolve(root, 'api/Dockerfile'), 'utf8');
  const copied = new Set(docker.match(/COPY server\.js ([^.\n]*\.js[^\n]*) \.\//)?.[0].split(/\s+/).filter((x) => x.endsWith('.js')));
  const src = await readFile(resolve(root, 'api/server.js'), 'utf8');
  for (const m of src.matchAll(/from '\.\/([A-Za-z0-9_-]+\.js)'/g)) assert.ok(copied.has(m[1]), `${m[1]} missing from the Dockerfile COPY line`);
  for (const f of copied) for (const m of (await readFile(resolve(root, 'api', f), 'utf8')).matchAll(/from '\.\/([A-Za-z0-9_-]+\.js)'/g)) assert.ok(copied.has(m[1]), `${m[1]} (imported by ${f}) missing from the Dockerfile COPY line`);
});

// ---- Plug-in trial + browser sign-in routes (api/trialGrant.js; logic cases in scripts/test-trial.js) -------------------
{
  const { generateKeyPairSync } = await import('crypto');
  const tg = await import(pathToFileURL(resolve(root, 'api/trialGrant.js')).href);
  const MACH = 'svl-machine:0123456789abcdef0123456789abcdef';
  const post = (path, ip, body, token) => call(path, { method: 'POST', headers: { ...headersFor(ip), ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  await test('trial routes: no GRANT_SIGNING_KEY -> 503 plain text on every route', async () => {
    resetDb();
    delete process.env.GRANT_SIGNING_KEY;
    for (const [i, path] of ['/api/trial/start', '/api/device/start', '/api/device/poll', '/api/device/approve', '/api/device/lookup', '/api/grant/refresh'].entries()) {
      const r = await post(path, `10.9.0.${i + 1}`, { product: 'ahenk', machine: MACH }, 'valid-bob');
      assert.equal(r.response.status, 503, path);
      assert.equal(r.body, 'Service not configured', path);
    }
    assert.equal(state.db.docs.size, 2, 'nothing written');
  });
  const pem = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' });
  const KEY = tg.loadSigningKey(pem);
  await test('trial routes: trial/start signs a 30-day trial grant; unknown product 400', async () => {
    resetDb();
    process.env.GRANT_SIGNING_KEY = pem.replace(/\n/g, '\\n'); // the one-line form an env var may carry
    const r = await post('/api/trial/start', '10.9.1.1', { product: 'ahenk', machine: MACH, name: 'Studio' });
    assert.equal(r.response.status, 200);
    assert.equal(r.response.headers['cache-control'], 'no-store');
    const p = tg.verifyGrant(r.body.grant, KEY);
    assert.equal(p.kind, 'trial');
    assert.equal(p.ends - p.starts, tg.TRIAL_MS);
    assert.ok(state.db.docs.has(`trials/ahenk__${MACH.slice(12)}`));
    const again = await post('/api/trial/start', '10.9.1.1', { product: 'ahenk', machine: MACH });
    assert.equal(tg.verifyGrant(again.body.grant, KEY).starts, p.starts);
    const u = await post('/api/trial/start', '10.9.1.1', { product: 'kubbe', machine: MACH });
    assert.deepEqual([u.response.status, u.body], [400, { ok: false, error: 'unknown product' }]);
  });
  await test('trial routes: device start -> approve (401 / not owned / owned) -> poll once -> refresh owned / refunded / bad', async () => {
    resetDb();
    const s = await post('/api/device/start', '10.9.2.1', { product: 'ahenk', machine: MACH, name: 'Studio' });
    assert.equal(s.response.status, 200);
    const { device_code: dc, user_code: uc } = s.body;
    assert.equal((await post('/api/device/approve', '10.9.2.2', { user_code: uc })).response.status, 401);
    assert.equal((await post('/api/device/approve', '10.9.2.2', { user_code: uc }, 'invalid')).response.status, 401);
    const look = await post('/api/device/lookup', '10.9.2.2', { user_code: uc }, 'valid-bob');
    assert.deepEqual(look.body, { ok: true, product: 'ahenk', name: 'Studio', user_code: uc, approved: false });
    const no = await post('/api/device/approve', '10.9.2.2', { user_code: uc }, 'valid-bob');
    assert.deepEqual([no.response.status, no.body], [200, { ok: false, error: 'not owned', buy_url: tg.BUY_URLS.ahenk }]);
    assert.deepEqual((await post('/api/device/poll', '10.9.2.1', { device_code: dc })).body, { status: 'pending' });
    // bob buys AHENK (the order the webhook would bind to his uid)
    state.db.docs.set('orders_by_uid/bob', { orders: { 'ls-1': { product: 'ahenk', status: 'paid', refunded: false, created: '2026-11-07T10:00:00Z', email: 'bob@example.com' } } });
    const ok = await post('/api/device/approve', '10.9.2.2', { user_code: uc }, 'valid-bob');
    assert.deepEqual([ok.response.status, ok.body], [200, { ok: true, product: 'ahenk', name: 'Studio' }]);
    const poll = await post('/api/device/poll', '10.9.2.1', { device_code: dc });
    const g = tg.verifyGrant(poll.body.grant, KEY);
    assert.deepEqual([poll.body.status, g.kind, g.uid, g.ends - g.issued], ['approved', 'owned', 'bob', tg.OWNED_GRACE_MS]);
    assert.deepEqual((await post('/api/device/poll', '10.9.2.1', { device_code: dc })).body, { status: 'expired' });
    const hadGetUser = 'getUser' in state.auth;
    state.auth.getUser = async (uid) => { if (uid !== 'bob') throw Object.assign(new Error('no user'), { code: 'auth/user-not-found' }); return { uid, email: 'bob@example.com', emailVerified: true, providerData: [] }; };
    try {
      const rf = await post('/api/grant/refresh', '10.9.2.3', { grant: poll.body.grant });
      assert.equal(rf.body.ok, true);
      assert.equal(tg.verifyGrant(rf.body.grant, KEY).uid, 'bob');
      state.db.docs.set('orders_by_uid/bob', { orders: { 'ls-1': { product: 'ahenk', status: 'refunded', refunded: true, created: '2026-11-07T10:00:00Z' } } });
      assert.deepEqual((await post('/api/grant/refresh', '10.9.2.3', { grant: poll.body.grant })).body, { ok: false, error: 'not owned' });
      const bad = await post('/api/grant/refresh', '10.9.2.3', { grant: { ...poll.body.grant, sig: poll.body.grant.sig.replace(/.$/, (c) => (c === '0' ? '1' : '0')) } });
      assert.deepEqual([bad.response.status, bad.body], [400, { ok: false, error: 'bad grant' }]);
    } finally { if (!hadGetUser) delete state.auth.getUser; }
  });
  await test('trial routes: 30 a minute per IP, then 429 plain text', async () => {
    resetDb();
    const codes = [];
    for (let i = 0; i < 31; i += 1) codes.push((await post('/api/device/poll', '10.9.3.1', { device_code: 'x' })).response.status);
    assert.deepEqual(codes.slice(0, 30), Array(30).fill(200));
    const last = await post('/api/device/poll', '10.9.3.1', { device_code: 'x' });
    assert.deepEqual([last.response.status, last.body], [429, 'Too many requests']);
  });
  delete process.env.GRANT_SIGNING_KEY;
}

{
  // AHENK iPhone / iPad piano packs (owner 12 Nov, route b): public, streamed from the private bucket, only packer-shaped names.
  const routes = new Map(server.app.router.stack.filter((l) => l.route).map((l) => [l.route.path, l.route.stack.at(-1).handle]));
  async function piano(path, ip = '10.7.0.1') {
    const m = path.match(/^\/api\/ahenk\/pianos\/v1\/(.+)$/);
    const rel = m ? m[1] : '';
    const parts = rel.split('/');
    const handler = rel === 'manifest.json' ? routes.get('/api/ahenk/pianos/v1/manifest.json') : routes.get('/api/ahenk/pianos/v1/:pack/:file');
    const req = { path, query: {}, params: parts.length === 2 ? { pack: parts[0], file: parts[1] } : {}, headers: {}, ip, get() { return undefined; } };
    const res = new FakeResponse();
    const done = new Promise((r) => res.once('finish', r));
    await handler(req, res);
    if (!res.writableEnded) await done;
    const chunks = [];
    if (res.body === undefined) { for await (const c of res) chunks.push(c); res.body = Buffer.concat(chunks).toString('utf8'); }
    return { status: res.statusCode, headers: res.headers, body: res.body };
  }
  await test('ahenk pianos: the manifest is public, JSON, never cached', async () => {
    const r = await piano('/api/ahenk/pianos/v1/manifest.json');
    assert.deepEqual([r.status, r.body, r.headers['content-type'], r.headers['cache-control']], [200, '{"format":1,"packs":[]}', 'application/json', 'no-cache, max-age=0']);
  });
  await test('ahenk pianos: a small part streams with its length, immutable', async () => {
    const r = await piano('/api/ahenk/pianos/v1/core/core-01.zip');
    assert.deepEqual([r.status, r.body, r.headers['content-type'], r.headers['content-length']], [200, 'CORE-PART', 'application/zip', 9]);
    assert.match(r.headers['cache-control'], /immutable/);
  });
  await test('ahenk pianos: a 64 MB part goes out chunked (no Content-Length, Cloud Run 32 MiB rule)', async () => {
    const r = await piano('/api/ahenk/pianos/v1/upright/upright-01.zip');
    assert.equal(r.status, 200);
    assert.equal(r.headers['content-length'], undefined);
  });
  await test('ahenk pianos: other names never reach the bucket (no paid installers, no traversal)', async () => {
    for (const bad of ['plugins/secret.zip', 'core/..%2Fsecret.zip', 'Core/core-01.zip', 'core/core-1.zip', 'core/core-01.pkg', 'x/y-01.zip/z']) {
      const parts = bad.split('/');
      if (parts.length !== 2) continue;
      const r = await piano(`/api/ahenk/pianos/v1/${bad}`, '10.7.0.2');
      assert.equal(r.status, 404, bad);
    }
    const missing = await piano('/api/ahenk/pianos/v1/concert/concert-99.zip', '10.7.0.2');
    assert.equal(missing.status, 404);
  });
  await test('ahenk pianos: 30 a minute per address, then 429', async () => {
    const codes = [];
    for (let i = 0; i < 31; i += 1) codes.push((await piano('/api/ahenk/pianos/v1/manifest.json', '10.7.0.9')).status);
    assert.deepEqual([codes.slice(0, 30).every((c) => c === 200), codes[30]], [true, 429]);
  });
}

const failed = results.filter((result) => !result.ok);
console.log(`SUMMARY ${results.length} cases, ${failed.length} fail`);
console.log(`LAST_CASE_LINES ${JSON.stringify(results.map((result) => result.last))}`);
process.exitCode = failed.length ? 1 : 0;
