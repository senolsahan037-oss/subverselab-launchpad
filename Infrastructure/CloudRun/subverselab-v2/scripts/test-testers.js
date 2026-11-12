// Local-only tests for the 100-tester programme (applications, approval, the
// launch-2 gate, reports). No Google credentials, network, or deploy.
// Run: node scripts/test-testers.js (or npm run test:testers)
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
    id: path.split('/').pop(),
    get: async () => snap(path),
    set: async (data, options) => docs.set(path, options?.merge ? merge(docs.get(path), data) : clone(data)),
    delete: async () => docs.delete(path),
    collection: (sub) => collection(`${path}/${sub}`),
  });
  const query = (name, order, max, filters = []) => ({
    where: (field, op, value) => query(name, order, max, [...filters, [field, value]]),
    orderBy: (field, dir) => query(name, { field, dir }, max, filters),
    limit: (n) => query(name, order, n, filters),
    get: async () => {
      let paths = [...docs.keys()].filter((p) => p.startsWith(`${name}/`) && !p.slice(name.length + 1).includes('/') && filters.every(([f, v]) => docs.get(p)?.[f] === v));
      if (order) paths.sort((a, b) => String(docs.get(a)[order.field]).localeCompare(String(docs.get(b)[order.field])) * (order.dir === 'desc' ? -1 : 1));
      if (max) paths = paths.slice(0, max);
      return { docs: paths.map((p) => ({ ...snap(p), ref: ref(p) })) };
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
          update: (document, data) => writes.push(() => document.set(data, { merge: true })),
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
    ['plugins/taban/1.0.0/Taban-mac.zip', { name: 'Taban-mac.zip', body: 'TABAN-MAC' }],
    ['plugins/elek/1.0.0/Elek-mac.pkg', { name: 'Elek-mac.pkg', body: 'ELEK-MAC' }],
    ['testbuilds/koro/0.9.1/Koro-test-mac.pkg', { name: 'Koro-test-mac.pkg', body: 'KORO-TEST' }],
    ['testbuilds/koro/0.9.1/Koro-manual.pdf', { name: 'Koro-manual.pdf', body: 'KORO-MANUAL' }],
  ]);
  return {
    files,
    signCalls: [],
    bucket: () => ({ file: (object) => ({
      getMetadata: async () => {
        const file = files.get(object);
        if (!file) throw new Error('not found');
        return [{ name: file.name, size: file.body.length, md5Hash: 'MD5OF' + file.body.length }];
      },
      getSignedUrl: async (opts) => { state.storage.signCalls.push({ object, ...opts }); return [`https://signed.test/${object}?v=${opts.version}&a=${opts.action}`]; },
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
        taban: { version: '1.0.0', files: { mac: { name: 'Taban-mac.zip', size: 9, object: 'plugins/taban/1.0.0/Taban-mac.zip' } } },
        elek: { version: '1.0.0', files: { mac: { name: 'Elek-mac.pkg', size: 8, object: 'plugins/elek/1.0.0/Elek-mac.pkg' } } },
      }))],
    }) }),
  };
}

const state = { db: fakeFirestore(), storage: fakeStorage() };
state.auth = { verifyIdToken: async (token) => {
  if (!token.startsWith('valid-')) throw new Error('invalid token');
  const uid = token.slice(6);
  if (state.extraTokens?.[uid]) return { ...state.extraTokens[uid] };
  return { uid, email: uid === 'owner' ? 'info@subverselab.com' : uid.includes('nomx') ? `${uid}@nomx.invalid` : `${uid}@Example.com`, email_verified: !uid.startsWith('unv-') };
}, getUserByEmail: async (email) => {
  // the account that holds this address now: the newest extra token with it (a tester who moved to a new account)
  const hit = Object.values(state.extraTokens || {}).filter((t) => t.email.toLowerCase() === String(email).toLowerCase()).at(-1);
  if (!hit) throw new Error('auth/user-not-found');
  return { uid: hit.uid, email: hit.email };
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
  .flatMap((layer) => Object.keys(layer.route.methods).map((method) => [`${method} ${layer.route.path}`, layer.route.stack.at(-1).handle])));
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
  const handler = routeHandlers.get(`${(options.method || 'GET').toLowerCase()} ${url.pathname}`);
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
const GOOD = {
  os: 'macOS Apple Silicon', osVersion: '15.2', daws: ['Ableton Live', 'Other'], dawOther: 'Maschine', formats: ['VST3', 'AU'], years: 6,
  link: 'https://soundcloud.com/someone', answer: 'Live dropped the sidechain on a compressor after a save and reload; I sent the .als to the vendor with steps.',
};
const apply = (uid, patch = {}) => as(uid, 'POST', '/api/testers/apply', { ...GOOD, ...patch });
// Approving needs the agreement record (version + the time the tester accepted it by e-mail).
const AGREEMENT = { agreementVersion: '1.1', acceptedAt: '2026-10-14T08:30:00.000Z' };
const decide = (uid, email, decision, extra = decision === 'approve' ? AGREEMENT : {}) => as(uid, 'POST', '/api/admin/testers/decide', { email, decision, ...extra });
const LAUNCH_OF = { koro: 'launch2', yanki: 'launch2', hava: 'launch2', mihenk: 'launch2', tutkal: 'launch2', kubbe: 'launch', kaset: 'launch', taban: 'free', alev: 'free', kiyma: 'free', elek: 'solo' };
const ticket = (uid, slug = 'koro', launchId = LAUNCH_OF[slug] || 'launch2') => as(uid, 'POST', '/api/download/ticket', { slug, platform: 'mac', launchId });
const approve = async (uid) => { await apply(uid); return decide('owner', `${uid}@example.com`, 'approve'); };
const claimed = () => state.db.docs.get('launch2/counter').claimed;

await test('apply validation: bad OS, short answer, bad DAW/format/link/years; no proof of the e-mail needed, but it must be able to receive mail', async () => {
  resetDb();
  assert.equal((await apply('a1', { os: 'Linux' })).response.status, 400);
  assert.equal((await apply('a2', { answer: 'too short' })).response.status, 400);
  assert.equal((await apply('a3', { answer: 'x'.repeat(40) + ' ' })).response.status, 200, '40 characters is enough');
  assert.equal((await apply('a4', { daws: ['Notepad'] })).response.status, 400);
  assert.equal((await apply('a5', { daws: ['Other'], dawOther: '' })).response.status, 400);
  assert.equal((await apply('a6', { formats: [] })).response.status, 400);
  assert.equal((await apply('a7', { os: 'Windows 11', formats: ['AU'] })).response.status, 400);
  assert.equal((await apply('a8', { link: 'javascript:alert(1)' })).response.status, 400);
  assert.equal((await apply('a9', { years: 'lots' })).response.status, 400);
  assert.equal((await apply('a10', { osVersion: '   ' })).response.status, 400);
  // No verification mail any more (owner 9 Oct): an unproven password account may apply; an address without a mail server may not.
  assert.equal((await apply('unv-bob')).response.status, 200);
  assert.equal(state.db.docs.get('tester_applications/unv-bob@example.com').status, 'pending');
  const nomx = await apply('unv-nomx');
  assert.equal(nomx.response.status, 403); assert.match(nomx.body.error, /cannot receive mail/);
  state.db.docs.set('bounced_emails/bounced-c@example.com', { at: '2026-10-05T00:00:00Z' });
  assert.equal((await apply('bounced-c')).response.status, 403);
  assert.equal(state.db.docs.has('tester_applications/unv-nomx@nomx.invalid'), false);
  assert.equal(state.db.docs.has('tester_applications/bounced-c@example.com'), false);
  assert.equal((await apply(undefined)).response.status, 401);
  assert.equal(state.db.docs.has('tester_applications/a1@example.com'), false);
});

await test('apply stores the optional MuseHub e-mail: valid accepted, malformed rejected, empty allowed', async () => {
  assert.equal((await apply('m1', { musehubEmail: ' Muse.User@Example.com ' })).response.status, 200);
  assert.equal(state.db.docs.get('tester_applications/m1@example.com').musehubEmail, 'muse.user@example.com');
  for (const bad of ['not-an-email', 'a@b', 'a b@c.com', `${'x'.repeat(250)}@e.com`]) {
    assert.equal((await apply('m2', { musehubEmail: bad })).response.status, 400, bad);
  }
  assert.equal(state.db.docs.get('tester_applications/m2@example.com'), undefined);
  assert.equal((await apply('m3')).response.status, 200);
  assert.equal(state.db.docs.get('tester_applications/m3@example.com').musehubEmail, '');
  assert.equal((await apply('m4', { musehubEmail: '   ' })).response.status, 200);
  assert.equal(state.db.docs.get('tester_applications/m4@example.com').musehubEmail, '');
});

await test('apply stores the optional "heard" line, clamped to 120 characters', async () => {
  resetDb();
  assert.equal((await apply('h1', { heard: 'From a friend' })).response.status, 200);
  assert.equal(state.db.docs.get('tester_applications/h1@example.com').heard, 'From a friend');
  assert.equal((await apply('h2', { heard: 'z'.repeat(500) })).response.status, 200);
  assert.equal(state.db.docs.get('tester_applications/h2@example.com').heard.length, 120);
  assert.equal((await apply('h3')).response.status, 200);
  assert.equal(state.db.docs.get('tester_applications/h3@example.com').heard, '');
});

await test('apply clamps: answer capped at 1200, years at 60, link optional, e-mail stored lower-case', async () => {
  resetDb();
  const r = await apply('Carol', { answer: 'y'.repeat(5000), years: 400, link: '', osVersion: 'v'.repeat(200) });
  assert.equal(r.response.status, 200);
  const doc = state.db.docs.get('tester_applications/carol@example.com');
  assert.equal(doc.answer.length, 1200);
  assert.equal(doc.years, 60);
  assert.equal(doc.link, '');
  assert.equal(doc.osVersion.length, 40);
  assert.equal(doc.status, 'pending');
});

await test('one application per e-mail: pending is overwritten, decided is locked', async () => {
  resetDb();
  assert.equal((await apply('dora')).response.status, 200);
  assert.equal((await apply('dora', { os: 'Windows 11', formats: ['VST3'] })).response.status, 200);
  assert.equal(state.db.docs.get('tester_applications/dora@example.com').os, 'Windows 11');
  assert.equal([...state.db.docs.keys()].filter((k) => k.startsWith('tester_applications/')).length, 1);
  assert.equal((await as('dora', 'GET', '/api/testers/me')).body.status, 'pending');
  assert.equal((await decide('owner', 'dora@example.com', 'decline')).response.status, 200);
  const again = await apply('dora');
  assert.equal(again.response.status, 409);
  assert.equal(state.db.docs.get('tester_applications/dora@example.com').status, 'declined');
  assert.equal((await as('dora', 'GET', '/api/testers/me')).body.status, 'declined');
  assert.equal((await as('nobody', 'GET', '/api/testers/me')).body.status, 'none');
});

await test('approve opens the launch-2 ticket without a purchase; a non-tester still gets 402', async () => {
  resetDb();
  assert.equal((await ticket('erin')).response.status, 402);
  assert.equal((await approve('erin')).response.status, 200);
  assert.equal((await as('erin', 'GET', '/api/testers/me')).body.status, 'approved');
  for (const slug of ['koro', 'yanki', 'hava', 'mihenk', 'tutkal']) {
    const t = await ticket('erin', slug);
    assert.equal(t.response.status, 200, slug);
    assert.ok(t.body.url);
  }
  // Agreement 4.2 (owner 2026-10-14): every released product, TUTKAL, the free ones and ELEK included, and the account lists them.
  const mine = await as('erin', 'GET', '/api/purchases/status');
  assert.deepEqual(mine.body.owned, ['kubbe', 'kaset', 'koro', 'yanki', 'hava', 'mihenk', 'tutkal', 'adalet', 'ahenk', 'elek', 'ru8', 'jingfang', 'seda', 'torna', 'taban', 'alev', 'kiyma']);
  assert.equal((await ticket('erin', 'kubbe', 'launch2')).response.status, 400, 'launch 2 ticket never hands out Kubbe');
  assert.equal((await ticket('frank')).response.status, 402, 'someone who neither paid nor was approved');
  assert.equal((await ticket('frank', 'tutkal')).response.status, 402, 'TUTKAL stays closed for a non-tester');
  assert.equal((await apply('gina')).response.status, 200);
  assert.equal((await ticket('gina')).response.status, 402, 'a pending application opens nothing');
  assert.equal((await ticket('gina', 'elek')).response.status, 402);
  assert.equal((await ticket('gina', 'taban')).response.status, 402);
  const doc = state.db.docs.get('launch2_testers/erin@example.com');
  assert.equal(doc.os, 'macOS Apple Silicon');
  assert.deepEqual(doc.daws, ['Ableton Live', 'Other']);
  // The agreement record (agreement section 3): version, acceptance time, channel, active status.
  assert.equal(doc.status, 'active');
  assert.equal(doc.agreementVersion, '1.1');
  assert.equal(doc.agreementAcceptedAt, '2026-10-14T08:30:00.000Z');
  assert.equal(doc.agreementVia, 'email');
});

await test('status and claim report standing tester; a paid buyer stays paid', async () => {
  resetDb();
  await approve('hana');
  const status = await as('hana', 'GET', '/api/launch2/status');
  assert.equal(status.body.standing, 'tester');
  assert.equal(status.body.tester, true);
  assert.equal(status.body.paid, false);
  const claim = await as('hana', 'POST', '/api/launch/claim', { launchId: 'launch2' });
  assert.equal(claim.response.status, 200);
  assert.equal(claim.body.tester, true);
  assert.equal((await as('ivan', 'GET', '/api/launch2/status')).body.standing, 'none');
  assert.equal((await as('ivan', 'POST', '/api/launch/claim', { launchId: 'launch2' })).response.status, 402);
  state.db.docs.set('launch2_purchases/jo@example.com', { orderId: '1', refunded: false, overCap: false });
  state.db.docs.set('launch2_testers/jo@example.com', { email: 'jo@example.com' });
  assert.equal((await as('jo', 'GET', '/api/launch2/status')).body.standing, 'paid');
  assert.equal((await ticket('jo')).response.status, 200);
});

await test('a tester does not change launch2/counter.claimed (paid seats only)', async () => {
  resetDb();
  assert.equal(claimed(), 3);
  await approve('kim');
  assert.equal((await ticket('kim')).response.status, 200);
  assert.equal((await as('kim', 'POST', '/api/launch/claim', { launchId: 'launch2' })).response.status, 200);
  assert.equal(claimed(), 3);
  assert.equal(state.db.docs.get('launch2/testers').approved, 1);
  assert.equal(state.db.docs.has('launch2_seats/kim@example.com'), false);
  await decide('owner', 'kim@example.com', 'decline');
  assert.equal(claimed(), 3);
});

await test('the 101st approval is refused and a declined seat can be reused', async () => {
  resetDb();
  for (let i = 0; i < 101; i++) await apply(`seat${i}`);
  state.db.docs.set('launch2/testers', { approved: 99 });
  assert.equal((await decide('owner', 'seat0@example.com', 'approve')).response.status, 200);
  const full = await decide('owner', 'seat1@example.com', 'approve');
  assert.equal(full.response.status, 409);
  assert.equal(state.db.docs.has('launch2_testers/seat1@example.com'), false);
  assert.equal(state.db.docs.get('launch2/testers').approved, 100);
  assert.equal(state.db.docs.get('tester_applications/seat1@example.com').status, 'pending');
  assert.equal((await ticket('seat1')).response.status, 402);
  const seats = await call('/api/testers/seats', { headers: { 'x-forwarded-for': nextIp() } });
  assert.deepEqual(seats.body, { total: 100, approved: 100 });
  // Approving the same person twice takes one seat, not two.
  assert.equal((await decide('owner', 'seat0@example.com', 'approve')).response.status, 200);
  assert.equal(state.db.docs.get('launch2/testers').approved, 100);
  assert.equal((await decide('owner', 'seat0@example.com', 'decline')).response.status, 200);
  assert.equal((await decide('owner', 'seat1@example.com', 'approve')).response.status, 200);
  assert.equal(state.db.docs.get('launch2/testers').approved, 100);
});

await test('concurrent approvals at 99 take exactly one seat', async () => {
  resetDb();
  for (let i = 0; i < 5; i++) await apply(`race${i}`);
  state.db.docs.set('launch2/testers', { approved: 99 });
  const out = await Promise.all(Array.from({ length: 5 }, (_, i) => decide('owner', `race${i}@example.com`, 'approve')));
  assert.equal(out.filter((r) => r.response.status === 200).length, 1);
  assert.equal(out.filter((r) => r.response.status === 409).length, 4);
  assert.equal(state.db.docs.get('launch2/testers').approved, 100);
});

await test('declining an approved tester closes the gate again and frees the seat', async () => {
  resetDb();
  await approve('lena');
  assert.equal((await ticket('lena')).response.status, 200);
  assert.equal(state.db.docs.get('launch2/testers').approved, 1);
  const out = await decide('owner', 'lena@example.com', 'decline');
  assert.equal(out.response.status, 200);
  assert.equal(out.body.approved, 0);
  assert.equal(state.db.docs.get('launch2/testers').approved, 0);
  assert.equal(state.db.docs.has('launch2_testers/lena@example.com'), false);
  assert.equal((await ticket('lena')).response.status, 402);
  assert.equal((await as('lena', 'GET', '/api/launch2/status')).body.standing, 'none');
  assert.equal((await as('lena', 'GET', '/api/testers/me')).body.status, 'declined');
  // Declining a pending applicant takes nothing from the counter.
  await apply('mo');
  await decide('owner', 'mo@example.com', 'decline');
  assert.equal(state.db.docs.get('launch2/testers').approved, 0);
  assert.equal((await decide('owner', 'ghost@example.com', 'approve')).response.status, 404);
  assert.equal((await decide('owner', 'mo@example.com', 'maybe')).response.status, 400);
});

await test('admin endpoints are closed to everyone but a verified admin', async () => {
  resetDb();
  await apply('ned');
  for (const [method, path, body] of [
    ['GET', '/api/admin/testers'], ['GET', '/api/admin/testers/reports'],
    ['POST', '/api/admin/testers/decide', { email: 'ned@example.com', decision: 'approve' }],
  ]) {
    assert.equal((await as('ned', method, path, body)).response.status, 403, `${path} as a member`);
    assert.equal((await as(undefined, method, path, body)).response.status, 401, `${path} signed out`);
    assert.equal((await as('unv-owner', method, path, body)).response.status, 403, `${path} unverified admin address`);
  }
  assert.equal(state.db.docs.get('tester_applications/ned@example.com').status, 'pending');
  assert.equal(state.db.docs.has('launch2_testers/ned@example.com'), false);
});

await test('admin list is newest first and the coverage counts approved testers only', async () => {
  resetDb();
  await apply('p1', { os: 'Windows 11', formats: ['VST3'], daws: ['FL Studio', 'Reaper'] });
  await new Promise((r) => setTimeout(r, 5));
  await apply('p2', { os: 'macOS Intel', formats: ['AU'], daws: ['Logic Pro'] });
  await new Promise((r) => setTimeout(r, 5));
  await apply('p3');
  await decide('owner', 'p1@example.com', 'approve');
  await decide('owner', 'p2@example.com', 'approve');
  await decide('owner', 'p2@example.com', 'decline');
  const list = await as('owner', 'GET', '/api/admin/testers');
  assert.equal(list.response.status, 200);
  assert.deepEqual(list.body.applications.map((a) => a.email), ['p3@example.com', 'p2@example.com', 'p1@example.com']);
  assert.equal(list.body.approved, 1);
  assert.equal(list.body.total, 100);
  assert.equal(list.body.coverage.os['Windows 11'], 1);
  assert.equal(list.body.coverage.os['macOS Intel'], 0);
  assert.equal(list.body.coverage.daws['FL Studio'], 1);
  assert.equal(list.body.coverage.daws['Logic Pro'], 0);
});

const REPORT = { plugin: 'hava', os: 'Windows 11', daw: 'FL Studio', dawVersion: '24.1', kind: 'bug', text: 'The tail clicks when I automate the size knob.' };
const report = (uid, patch = {}) => as(uid, 'POST', '/api/testers/report', { ...REPORT, ...patch });

await test('reports are rejected for non-testers, pending applicants and declined testers', async () => {
  resetDb();
  assert.equal((await report('oz')).response.status, 403);
  await apply('pat');
  assert.equal((await report('pat')).response.status, 403);
  await approve('quin');
  assert.equal((await report('quin')).response.status, 200);
  await decide('owner', 'quin@example.com', 'decline');
  assert.equal((await report('quin')).response.status, 403);
  assert.equal((await report(undefined)).response.status, 401);
  assert.equal((await report('unv-rex')).response.status, 403);
  assert.equal([...state.db.docs.keys()].filter((k) => k.startsWith('tester_reports/')).length, 1);
});

await test('reports are validated, stored, listed newest first and capped at 50 per tester', async () => {
  resetDb();
  await approve('sam');
  for (const patch of [{ plugin: 'nosuchthing' }, { os: 'BeOS' }, { daw: '' }, { kind: 'rant' }, { text: 'short' }]) {
    assert.equal((await report('sam', patch)).response.status, 400, JSON.stringify(patch));
  }
  assert.equal((await report('sam', { text: 'z'.repeat(9000) })).response.status, 200);
  const stored = [...state.db.docs].find(([k]) => k.startsWith('tester_reports/'))[1];
  assert.equal(stored.text.length, 4000);
  assert.equal(stored.email, 'sam@example.com');
  assert.ok(stored.at);
  await new Promise((r) => setTimeout(r, 5));
  assert.equal((await report('sam', { plugin: 'tutkal', kind: 'sound', text: 'GLUE at 2:1 is the right amount on my drum bus.' })).response.status, 200);
  await new Promise((r) => setTimeout(r, 5));
  assert.equal((await report('sam', { plugin: 'koro', kind: 'works', text: 'Runs fine in Live 12 on the M2 mini.' })).response.status, 200);
  const list = await as('owner', 'GET', '/api/admin/testers/reports');
  assert.equal(list.response.status, 200);
  assert.deepEqual(list.body.reports.map((r) => r.plugin), ['koro', 'tutkal', 'hava']);
  for (let i = 3; i < 50; i++) assert.equal((await report('sam')).response.status, 200, `report ${i + 1}`);
  const over = await report('sam');
  assert.equal(over.response.status, 429);
  assert.equal([...state.db.docs.keys()].filter((k) => k.startsWith('tester_reports/')).length, 50);
  // The cap is per calendar month: a record whose counter belongs to an earlier month starts again at zero.
  state.db.docs.set('launch2_testers/sam@example.com', { ...state.db.docs.get('launch2_testers/sam@example.com'), reportMonth: { month: '2026-09', count: 50 } });
  assert.equal((await report('sam')).response.status, 200);
  assert.equal(state.db.docs.get('launch2_testers/sam@example.com').reportMonth.count, 1);
});

await test('seats endpoint starts at zero approved', async () => {
  resetDb();
  const seats = await call('/api/testers/seats', { headers: { 'x-forwarded-for': nextIp() } });
  assert.deepEqual(seats.body, { total: 100, approved: 0 });
});


// ---- Tester agreement v1.1: agreement record, all released products, end / revoke, test builds, panel ----------------
const doc = (path) => state.db.docs.get(path);
const decideRaw = (body) => as('owner', 'POST', '/api/admin/testers/decide', body);
const buildBody = (patch = {}) => ({ slug: 'koro', name: 'Koro test 0.9.1', version: '0.9.1', platform: 'mac', objectPath: 'testbuilds/koro/0.9.1/Koro-test-mac.pkg', notes: 'Check the new glue stage.', assignedTo: [], ...patch });
const saveBuild = (patch) => as('owner', 'POST', '/api/admin/testers/builds', buildBody(patch));
const releaseBuild = (id) => as('owner', 'POST', '/api/admin/testers/builds/release', { id });
const buildTicket = (uid, buildId) => as(uid, 'POST', '/api/download/ticket', { kind: 'test-build', buildId });

await test('approval is refused without the agreement version and the acceptance time; nothing is written and no seat is taken', async () => {
  resetDb();
  await apply('ag1');
  const cases = [
    {}, { agreementVersion: '1.1' }, { acceptedAt: '2026-10-14T08:30:00Z' },
    { agreementVersion: 'v1.1', acceptedAt: '2026-10-14T08:30:00Z' }, { agreementVersion: '1.1', acceptedAt: 'yesterday' },
    { agreementVersion: '1.1', acceptedAt: '2099-01-01T00:00:00Z' }, { agreementVersion: 1.1, acceptedAt: '2026-10-14T08:30:00Z' },
  ];
  for (const extra of cases) {
    const r = await decideRaw({ email: 'ag1@example.com', decision: 'approve', ...extra });
    assert.equal(r.response.status, 400, JSON.stringify(extra));
  }
  assert.equal(doc('launch2_testers/ag1@example.com'), undefined);
  assert.equal(doc('launch2/testers'), undefined);
  assert.equal(doc('tester_applications/ag1@example.com').status, 'pending');
  const ok = await decideRaw({ email: 'ag1@example.com', decision: 'approve', agreementVersion: '1.1', acceptedAt: '2026-10-14T10:30:00+02:00' });
  assert.equal(ok.response.status, 200);
  assert.equal(doc('launch2_testers/ag1@example.com').agreementAcceptedAt, '2026-10-14T08:30:00.000Z', 'stored as ISO UTC');
});

await test('admin list carries each tester\'s agreement record, status and owned products', async () => {
  resetDb();
  await approve('ag2');
  await apply('ag3');
  const list = (await as('owner', 'GET', '/api/admin/testers')).body.applications;
  const t = list.find((a) => a.email === 'ag2@example.com').tester;
  assert.deepEqual({ ...t, endedAt: null }, { status: 'active', agreementVersion: '1.1', agreementAcceptedAt: '2026-10-14T08:30:00.000Z', displayName: '', production: '', agentToken: null, bound: true, agreementVia: 'email', owned: {}, endedAt: null, revokedAt: null });
  assert.equal(list.find((a) => a.email === 'ag3@example.com').tester, null);
});

await test('an active tester downloads every released product (family, free, ELEK); an applicant or stranger gets nothing', async () => {
  resetDb();
  await approve('rel1');
  for (const slug of ['koro', 'tutkal', 'kubbe', 'kaset', 'taban', 'elek']) {
    const t = await ticket('rel1', slug);
    assert.equal(t.response.status, 200, slug);
  }
  assert.equal((await ticket('rel1', 'elek', 'launch2')).response.status, 400, 'the product still has to match its ticket kind');
  assert.equal((await ticket('rel1', 'alev')).response.status, 404, 'released product without a published file: not available yet, not refused');
  for (const slug of ['koro', 'taban', 'elek']) assert.equal((await ticket('nobody', slug)).response.status, 402, `stranger ${slug}`);
  assert.equal((await ticket('unv-rel1', 'elek')).response.status, 402, 'an unproven account of the same name never gets the e-mail-matched tester entry');
  // The seat counters of the products are untouched: testers are not paid or launch seats.
  assert.equal(doc('launch/counter').claimed, 0);
  assert.equal(claimed(), 3);
});

await test('End testing: released products stay only if owned, credits / builds / reports stop, nothing is deleted, seat is kept', async () => {
  resetDb();
  await approve('end1');
  await apply('end2');
  assert.equal((await ticket('end1', 'elek')).response.status, 200);
  const made = await saveBuild({ assignedTo: ['end1@example.com'] });
  assert.equal((await as('end1', 'GET', '/api/testers/builds')).body.builds.length, 1);
  assert.equal((await decideRaw({ email: 'end1@example.com', decision: 'end' })).response.status, 200);
  const rec = doc('launch2_testers/end1@example.com');
  assert.equal(rec.status, 'ended');
  assert.ok(rec.endedAt);
  assert.equal(rec.agreementVersion, '1.1', 'the record stays');
  assert.equal(doc('tester_applications/end1@example.com').status, 'ended');
  assert.equal(doc('launch2/testers').approved, 1, 'an ended tester keeps its seat');
  for (const slug of ['koro', 'elek', 'taban']) assert.equal((await ticket('end1', slug)).response.status, 402, `ended, nothing owned: ${slug}`);
  assert.deepEqual((await as('end1', 'GET', '/api/purchases/status')).body.owned, []);
  assert.deepEqual((await as('end1', 'GET', '/api/testers/builds')).body.builds, []);
  assert.equal((await buildTicket('end1', made.body.id)).response.status, 403);
  assert.equal((await report('end1')).response.status, 403);
  assert.equal((await as('end1', 'GET', '/api/launch2/status')).body.standing, 'none');
  const panel = await as('end1', 'GET', '/api/testers/panel');
  assert.equal(panel.response.status, 200);
  assert.equal(panel.body.status, 'ended');
  assert.deepEqual(panel.body.downloads, []);
  assert.equal(panel.body.credits, null);
  assert.equal((await as('end1', 'GET', '/api/testers/me')).body.status, 'ended');
  // End only applies to an active tester; an applicant is not one.
  assert.equal((await decideRaw({ email: 'end1@example.com', decision: 'end' })).response.status, 409);
  assert.equal((await decideRaw({ email: 'end2@example.com', decision: 'end' })).response.status, 409);
  // Re-approving re-opens it without a second seat.
  assert.equal((await decide('owner', 'end1@example.com', 'approve')).response.status, 200);
  assert.equal(doc('launch2/testers').approved, 1);
  assert.equal((await ticket('end1', 'elek')).response.status, 200);
});

await test('Revoke: all access gone even for owned products, seat freed, documents kept, repeatable, re-approval takes a seat', async () => {
  resetDb();
  await approve('rv1');
  const made = await saveBuild({ assignedTo: ['rv1@example.com'] });
  await releaseBuild(made.body.id);
  assert.equal(doc('launch2_testers/rv1@example.com').owned.koro, doc('tester_builds/' + made.body.id).releasedAt.slice(0, 10));
  assert.equal((await ticket('rv1', 'elek')).response.status, 200);
  const out = await decideRaw({ email: 'rv1@example.com', decision: 'revoke' });
  assert.equal(out.response.status, 200);
  assert.equal(out.body.approved, 0);
  assert.equal(doc('launch2/testers').approved, 0, 'the seat is free again');
  const rec = doc('launch2_testers/rv1@example.com');
  assert.equal(rec.status, 'revoked');
  assert.ok(rec.revokedAt);
  assert.ok(rec.owned.koro, 'the owned record is kept as a record, but ignored');
  assert.ok(doc('tester_builds/' + made.body.id));
  for (const slug of ['koro', 'elek', 'taban']) assert.equal((await ticket('rv1', slug)).response.status, 402, slug);
  assert.deepEqual((await as('rv1', 'GET', '/api/purchases/status')).body.owned, []);
  assert.equal((await buildTicket('rv1', made.body.id)).response.status, 403);
  assert.equal((await as('rv1', 'GET', '/api/testers/panel')).response.status, 403);
  assert.equal((await as('rv1', 'GET', '/api/testers/reports')).response.status, 403);
  assert.equal((await report('rv1')).response.status, 403);
  assert.equal((await decideRaw({ email: 'rv1@example.com', decision: 'revoke' })).body.result, 'already-revoked');
  assert.equal(doc('launch2/testers').approved, 0, 'a second revoke frees nothing more');
  // Declining a revoked tester does not free a seat twice either.
  state.db.docs.set('launch2/testers', { approved: 5 });
  await decide('owner', 'rv1@example.com', 'decline');
  assert.equal(doc('launch2/testers').approved, 5);
  await apply('rv2'); // different tester: revoke works after an end as well
  await decide('owner', 'rv2@example.com', 'approve');
  await decideRaw({ email: 'rv2@example.com', decision: 'end' });
  assert.equal((await decideRaw({ email: 'rv2@example.com', decision: 'revoke' })).body.approved, 5);
  assert.equal((await decideRaw({ email: 'nobody@example.com', decision: 'revoke' })).response.status, 404);
});

await test('revoked tester can be approved again (takes a seat, refused at the cap)', async () => {
  resetDb();
  await approve('rv3');
  await decideRaw({ email: 'rv3@example.com', decision: 'revoke' });
  state.db.docs.set('launch2/testers', { approved: 100 });
  assert.equal((await decide('owner', 'rv3@example.com', 'approve')).response.status, 409);
  assert.equal(doc('launch2_testers/rv3@example.com').status, 'revoked');
  state.db.docs.set('launch2/testers', { approved: 99 });
  assert.equal((await decide('owner', 'rv3@example.com', 'approve', { agreementVersion: '1.2', acceptedAt: '2026-10-14T09:00:00Z' })).response.status, 200);
  assert.equal(doc('launch2/testers').approved, 100);
  assert.equal(doc('launch2_testers/rv3@example.com').status, 'active');
  assert.equal(doc('launch2_testers/rv3@example.com').agreementVersion, '1.2');
  assert.equal((await ticket('rv3', 'koro')).response.status, 200);
});

await test('test builds: admin-only routes, validation, create / edit / assign', async () => {
  resetDb();
  await approve('tb1');
  for (const [method, path, body] of [['GET', '/api/admin/testers/builds'], ['POST', '/api/admin/testers/builds', buildBody()], ['POST', '/api/admin/testers/builds/release', { id: 'x' }]]) {
    assert.equal((await as('tb1', method, path, body)).response.status, 403, `${path} as a tester`);
    assert.equal((await as(undefined, method, path, body)).response.status, 401, `${path} signed out`);
  }
  for (const patch of [{ slug: 'Bad Slug' }, { name: '' }, { version: ' ' }, { platform: 'linux' }, { objectPath: '' }, { objectPath: '/abs/path.pkg' }, { objectPath: 'testbuilds/../plugins/koro/x' }, { objectPath: 'a//b' }]) {
    assert.equal((await saveBuild(patch)).response.status, 400, JSON.stringify(patch));
  }
  assert.equal([...state.db.docs.keys()].filter((k) => k.startsWith('tester_builds/')).length, 0);
  const made = await saveBuild({ assignedTo: ['TB1@Example.com', 'tb1@example.com', 'x/y@example.com', 'not-an-address'], notes: 'n'.repeat(5000) });
  assert.equal(made.response.status, 200);
  const stored = doc(`tester_builds/${made.body.id}`);
  assert.deepEqual(stored.assignedTo, ['tb1@example.com']);
  assert.equal(stored.notes.length, 2000);
  assert.equal(stored.releasedAt, null);
  assert.ok(stored.createdAt);
  // Edit keeps createdAt and releasedAt, replaces the assignment.
  const edited = await as('owner', 'POST', '/api/admin/testers/builds', { ...buildBody({ version: '0.9.2', assignedTo: ['tb1@example.com', 'tb2@example.com'] }), id: made.body.id });
  assert.equal(edited.body.id, made.body.id);
  assert.equal(doc(`tester_builds/${made.body.id}`).version, '0.9.2');
  assert.equal(doc(`tester_builds/${made.body.id}`).createdAt, stored.createdAt);
  assert.deepEqual(doc(`tester_builds/${made.body.id}`).assignedTo, ['tb1@example.com', 'tb2@example.com']);
  assert.equal((await as('owner', 'POST', '/api/admin/testers/builds', { ...buildBody(), id: 'nosuch' })).response.status, 404);
  const list = await as('owner', 'GET', '/api/admin/testers/builds');
  assert.equal(list.body.builds.length, 1);
  assert.equal(list.body.builds[0].objectPath, 'testbuilds/koro/0.9.1/Koro-test-mac.pkg', 'the admin sees the object path');
});

await test('test area: an active tester sees and downloads only the builds assigned to it', async () => {
  resetDb();
  await approve('ta1'); await approve('ta2'); await apply('ta3');
  const mine = await saveBuild({ assignedTo: ['ta1@example.com'] });
  const other = await saveBuild({ name: 'Other', assignedTo: ['ta2@example.com'] });
  const seen = (await as('ta1', 'GET', '/api/testers/builds')).body.builds;
  assert.deepEqual(seen.map((b) => b.id), [mine.body.id]);
  assert.equal(seen[0].objectPath, undefined, 'the object path never reaches a tester');
  assert.equal(seen[0].assignedTo, undefined, 'nor the other testers');
  const t = await buildTicket('ta1', mine.body.id);
  assert.equal(t.response.status, 200);
  assert.equal(t.body.name, 'Koro-test-mac.pkg');
  assert.equal(t.body.version, '0.9.1');
  const file = await call(t.body.url, { headers: { 'x-forwarded-for': nextIp() } });
  assert.equal(file.response.status, 200);
  assert.equal(String(file.body), 'KORO-TEST');
  assert.equal((await buildTicket('ta1', other.body.id)).response.status, 403, 'a build assigned to someone else');
  assert.equal((await buildTicket('ta3', mine.body.id)).response.status, 403, 'an applicant');
  assert.equal((await buildTicket('stranger', mine.body.id)).response.status, 403);
  assert.equal((await buildTicket('unv-ta1', mine.body.id)).response.status, 403, 'unproven account of the same name');
  assert.equal((await buildTicket(undefined, mine.body.id)).response.status, 401);
  assert.equal((await buildTicket('ta1', 'nosuch')).response.status, 403);
  assert.equal((await buildTicket('ta1', '../x')).response.status, 400);
  assert.equal((await as('ta3', 'GET', '/api/testers/builds')).response.status, 403);
  // The download counters of the products are not touched by a test build.
  assert.equal(doc('launch2/counter').downloads, 0);
  assert.equal(doc('downloads/ta1'), undefined);
});

await test('releasing a build gives every assigned tester a permanent owned record: it survives End testing, not Revoke', async () => {
  resetDb();
  await approve('own1'); await approve('own2'); await approve('own3'); await apply('own4');
  const made = await saveBuild({ assignedTo: ['own1@example.com', 'own2@example.com', 'own4@example.com', 'ghost@example.com'] });
  assert.equal(doc('launch2_testers/own1@example.com').owned, undefined, 'nothing owned before the release');
  await decideRaw({ email: 'own1@example.com', decision: 'end' });
  assert.equal((await ticket('own1', 'koro')).response.status, 402, 'ended before the release: nothing owned');
  const rel = await releaseBuild(made.body.id);
  assert.equal(rel.response.status, 200);
  assert.equal(rel.body.granted, 2, 'testers without a record (an applicant, a ghost) get nothing');
  const day = rel.body.releasedAt.slice(0, 10);
  assert.deepEqual(doc('launch2_testers/own1@example.com').owned, { koro: day });
  assert.deepEqual(doc('launch2_testers/own2@example.com').owned, { koro: day });
  assert.equal(doc('launch2_testers/own3@example.com').owned, undefined, 'not assigned');
  assert.equal(doc(`tester_builds/${made.body.id}`).releasedAt, rel.body.releasedAt);
  // own1 is ended and still owns KORO; own2 is revoked afterwards and owns nothing.
  assert.equal((await ticket('own1', 'koro')).response.status, 200, 'owned after End testing');
  assert.equal((await ticket('own1', 'yanki')).response.status, 402, 'other products are not');
  assert.deepEqual((await as('own1', 'GET', '/api/purchases/status')).body.owned, ['koro']);
  assert.deepEqual((await as('own1', 'GET', '/api/testers/panel')).body.downloads, ['koro']);
  await decideRaw({ email: 'own2@example.com', decision: 'revoke' });
  assert.equal((await ticket('own2', 'koro')).response.status, 402, 'owned is ignored once revoked');
  // Idempotent; the release date does not move.
  const again = await releaseBuild(made.body.id);
  assert.equal(again.body.releasedAt, rel.body.releasedAt);
  assert.equal(again.body.granted, 0);
  // A tester assigned to an already released build gets the record on save.
  await saveBuild({ assignedTo: ['own1@example.com', 'own3@example.com'], id: made.body.id });
  const edit = await as('owner', 'POST', '/api/admin/testers/builds', { ...buildBody({ assignedTo: ['own1@example.com', 'own3@example.com'] }), id: made.body.id });
  assert.equal(edit.response.status, 200);
  assert.deepEqual(doc('launch2_testers/own3@example.com').owned, { koro: day });
  assert.equal(doc(`tester_builds/${made.body.id}`).releasedAt, rel.body.releasedAt);
  assert.equal((await releaseBuild('nosuch')).response.status, 404);
  assert.equal((await releaseBuild('../x')).response.status, 400);
});

await test('owned never opens a product that is not a released one, and a pre-agreement record (no status) is an active tester', async () => {
  resetDb();
  state.db.docs.set('launch2_testers/old1@example.com', { email: 'old1@example.com', approvedAt: '2026-10-01T00:00:00Z', reports: 2 });
  assert.equal((await ticket('old1', 'elek')).response.status, 200);
  assert.equal((await ticket('old1', 'koro')).response.status, 200);
  const panel = (await as('old1', 'GET', '/api/testers/panel')).body;
  assert.equal(panel.status, 'active');
  assert.equal(panel.agreement, null, 'no agreement recorded yet');
  state.db.docs.set('launch2_testers/old2@example.com', { email: 'old2@example.com', status: 'ended', owned: { nope: '2026-10-14', koro: '2026-10-14' } });   // nope: no such released product (ADALET went on sale 8 Nov, SEDA 19 Oct)
  assert.deepEqual((await as('old2', 'GET', '/api/purchases/status')).body.owned, ['koro']);
});

await test('panel: agreement line, downloads, this month\'s tester credits and the report quota', async () => {
  resetDb();
  await approve('pn1');
  const panel = await as('pn1', 'GET', '/api/testers/panel');
  assert.equal(panel.response.status, 200);
  assert.equal(panel.body.status, 'active');
  assert.deepEqual(panel.body.agreement, { version: '1.1', acceptedAt: '2026-10-14T08:30:00.000Z' });
  assert.deepEqual(panel.body.downloads, ['kubbe', 'kaset', 'koro', 'yanki', 'hava', 'mihenk', 'tutkal', 'taban', 'alev', 'kiyma', 'adalet', 'ahenk', 'elek', 'ru8', 'jingfang', 'seda', 'torna']);
  assert.equal(panel.body.credits.left, 2000);
  assert.equal(panel.body.credits.monthly, 2000);
  assert.equal(panel.body.credits.month, new Date().toISOString().slice(0, 7));
  assert.deepEqual({ sent: panel.body.reports.sent, cap: panel.body.reports.cap }, { sent: 0, cap: 50 });
  await report('pn1');
  assert.equal((await as('pn1', 'GET', '/api/testers/panel')).body.reports.sent, 1);
  assert.equal((await as('nobody', 'GET', '/api/testers/panel')).response.status, 403);
  assert.equal((await as('unv-pn1', 'GET', '/api/testers/panel')).response.status, 403);
  assert.equal((await as(undefined, 'GET', '/api/testers/panel')).response.status, 401);
  // Opening the panel grants the month once: a second read does not grant again.
  await as('pn1', 'GET', '/api/testers/panel');
  assert.equal((await as('pn1', 'GET', '/api/testers/panel')).body.credits.left, 2000);
  assert.equal([...state.db.docs.keys()].filter((k) => k.startsWith('credit_ledger/tester_')).length, 1);
});

await test('reports: kind idea needs only the text; the tester lists its own reports, newest first, and nobody else\'s', async () => {
  resetDb();
  await approve('id1'); await approve('id2');
  const idea = await report('id1', { kind: 'idea', plugin: '', os: '', daw: '', text: 'An online tool that matches loudness between two takes would save me an hour a week.' });
  assert.equal(idea.response.status, 200);
  const stored = [...state.db.docs].find(([k]) => k.startsWith('tester_reports/'))[1];
  assert.equal(stored.kind, 'idea');
  assert.equal(stored.plugin, null);
  assert.equal((await report('id1', { kind: 'idea', text: 'short' })).response.status, 400);
  assert.equal((await report('id1', { kind: 'bug', plugin: '' })).response.status, 400, 'a bug still names the plugin');
  assert.equal((await report('id1', { kind: 'ui', os: '' })).response.status, 400);
  await new Promise((r) => setTimeout(r, 5));
  assert.equal((await report('id1', { plugin: 'elek', kind: 'works', text: 'ELEK runs fine in Live 12 on my machine.' })).response.status, 200);
  await report('id2', { text: 'Another tester\'s private report about the sidechain.' });
  const mine = await as('id1', 'GET', '/api/testers/reports');
  assert.equal(mine.response.status, 200);
  assert.deepEqual(mine.body.reports.map((r) => r.kind), ['works', 'idea']);
  assert.equal(mine.body.reports[0].email, undefined);
  assert.equal(JSON.stringify(mine.body).includes('private report'), false);
  assert.equal((await as('nobody', 'GET', '/api/testers/reports')).response.status, 403);
  assert.equal((await as(undefined, 'GET', '/api/testers/reports')).response.status, 401);
  // The ended tester can still read what it sent, but cannot send more.
  await decideRaw({ email: 'id1@example.com', decision: 'end' });
  assert.equal((await as('id1', 'GET', '/api/testers/reports')).body.reports.length, 2);
  assert.equal((await report('id1')).response.status, 403);
});


// ---- Round 2: welcome fields, manuals, tasks + results, messages, kind 'panel', agreement text, Learn ---------------------
const profile = (body) => as('owner', 'POST', '/api/admin/testers/profile', body);
const result = (uid, body) => as(uid, 'POST', '/api/testers/builds/result', body);
const readAdminResults = (id) => as('owner', 'GET', `/api/admin/testers/builds/results?id=${id}`);
const send = (uid, body, kind) => as(uid, 'POST', '/api/testers/messages', { body, ...(kind ? { kind } : {}) });
const reply = (email, body) => as('owner', 'POST', '/api/admin/testers/messages/reply', { email, body });

await test('welcome: the application takes an optional production name; the panel greets by display name, production or the e-mail\'s first word', async () => {
  resetDb();
  assert.equal((await apply('andre.k', { production: 'Bigdre Productions' })).response.status, 200);
  assert.equal(doc('tester_applications/andre.k@example.com').production, 'Bigdre Productions');
  assert.equal((await apply('plain')).response.status, 200);
  assert.equal(doc('tester_applications/plain@example.com').production, '', 'optional');
  assert.equal((await apply('long1', { production: 'p'.repeat(300) })).response.status, 200);
  assert.equal(doc('tester_applications/long1@example.com').production.length, 80);
  await decide('owner', 'andre.k@example.com', 'approve');
  await decide('owner', 'plain@example.com', 'approve');
  assert.equal(doc('launch2_testers/andre.k@example.com').production, 'Bigdre Productions');
  assert.deepEqual((await as('andre.k', 'GET', '/api/testers/panel')).body.welcome, { name: 'Andre', production: 'Bigdre Productions' }, 'first word of the e-mail');
  assert.deepEqual((await as('plain', 'GET', '/api/testers/panel')).body.welcome, { name: 'Plain', production: '' });
  // The admin sets or edits both; clamped; admin only; a stranger has no record.
  assert.equal((await profile({ email: 'andre.k@example.com', displayName: 'Andre', production: 'Bigdre Productions Ltd' })).response.status, 200);
  assert.deepEqual((await as('andre.k', 'GET', '/api/testers/panel')).body.welcome, { name: 'Andre', production: 'Bigdre Productions Ltd' });
  await profile({ email: 'plain@example.com', displayName: 'N'.repeat(200), production: '' });
  assert.equal(doc('launch2_testers/plain@example.com').displayName.length, 60);
  assert.equal((await profile({ email: 'ghost@example.com', displayName: 'x' })).response.status, 404);
  assert.equal((await as('plain', 'POST', '/api/admin/testers/profile', { email: 'plain@example.com', displayName: 'Me' })).response.status, 403);
  const list = (await as('owner', 'GET', '/api/admin/testers')).body.applications.find((a) => a.email === 'andre.k@example.com');
  assert.equal(list.tester.displayName, 'Andre'); assert.equal(list.tester.production, 'Bigdre Productions Ltd');
  // Legacy record without the fields still gets a greeting.
  state.db.docs.set('launch2_testers/bea_x@example.com', { email: 'bea_x@example.com', approvedAt: 'x' });
  assert.deepEqual((await as('bea_x', 'GET', '/api/testers/panel')).body.welcome, { name: 'Bea', production: '' });
});

await test('builds carry manuals and tasks: validated, ids kept across edits, bucket paths never shown to a tester', async () => {
  resetDb();
  await approve('mb1');
  for (const patch of [
    { manuals: [{ title: '', objectPath: 'testbuilds/koro/m.pdf' }] }, { manuals: [{ title: 'M', url: 'http://x.example/m.pdf' }] },
    { manuals: [{ title: 'M', url: 'javascript:alert(1)' }] }, { manuals: [{ title: 'M' }] }, { manuals: [{ title: 'M', objectPath: '../x' }] },
    { tasks: [{ title: '' }] },
  ]) assert.equal((await saveBuild(patch)).response.status, 400, JSON.stringify(patch));
  const made = await saveBuild({
    assignedTo: ['mb1@example.com'],
    manuals: [{ title: 'Quick start', objectPath: 'testbuilds/koro/0.9.1/Koro-manual.pdf' }, { title: 'Online manual', url: 'https://subverselab.com/learn' }],
    tasks: [{ title: 'Load a preset', detail: 'Any preset from the browser.' }, { id: 'glue', title: 'Glue stage', detail: 'Push it hard on drums.' }],
  });
  assert.equal(made.response.status, 200);
  const stored = doc(`tester_builds/${made.body.id}`);
  assert.equal(stored.tasks.length, 2);
  assert.equal(stored.tasks[1].id, 'glue');
  assert.match(stored.tasks[0].id, /^[a-z0-9]{1,12}$/);
  assert.notEqual(stored.tasks[0].id, stored.tasks[1].id);
  const seen = (await as('mb1', 'GET', '/api/testers/builds')).body.builds[0];
  assert.deepEqual(seen.manuals, [{ title: 'Quick start', index: 0, url: null }, { title: 'Online manual', index: 1, url: 'https://subverselab.com/learn' }]);
  assert.equal(seen.tasks.length, 2);
  assert.equal(JSON.stringify(seen).includes('testbuilds/'), false, 'no bucket path reaches a tester');
  // Editing with the ids returned keeps them.
  const keep = stored.tasks.map((t) => ({ ...t, title: t.title + '!' }));
  await as('owner', 'POST', '/api/admin/testers/builds', { ...buildBody({ assignedTo: ['mb1@example.com'], tasks: keep }), id: made.body.id });
  assert.deepEqual(doc(`tester_builds/${made.body.id}`).tasks.map((t) => t.id), stored.tasks.map((t) => t.id));
});

await test('build manuals: the ticket is checked like the build: only an assigned, active tester; the link manual has no file', async () => {
  resetDb();
  await approve('mt1'); await approve('mt2'); await apply('mt3');
  const made = await saveBuild({ assignedTo: ['mt1@example.com'], manuals: [{ title: 'Quick start', objectPath: 'testbuilds/koro/0.9.1/Koro-manual.pdf' }, { title: 'Online', url: 'https://subverselab.com/learn' }] });
  const id = made.body.id;
  const ok = await as('mt1', 'POST', '/api/download/ticket', { kind: 'test-build', buildId: id, manual: 0 });
  assert.equal(ok.response.status, 200);
  assert.equal(ok.body.name, 'Koro-manual.pdf');
  const file = await call(ok.body.url, { headers: { 'x-forwarded-for': nextIp() } });
  assert.equal(String(file.body), 'KORO-MANUAL');
  for (const [who, label] of [['mt2', 'another tester'], ['mt3', 'an applicant'], ['stranger', 'a stranger'], ['unv-mt1', 'an unproven account']]) {
    assert.equal((await as(who, 'POST', '/api/download/ticket', { kind: 'test-build', buildId: id, manual: 0 })).response.status, 403, label);
  }
  assert.equal((await as(undefined, 'POST', '/api/download/ticket', { kind: 'test-build', buildId: id, manual: 0 })).response.status, 401);
  assert.equal((await as('mt1', 'POST', '/api/download/ticket', { kind: 'test-build', buildId: id, manual: 1 })).response.status, 404, 'a link manual has no file');
  assert.equal((await as('mt1', 'POST', '/api/download/ticket', { kind: 'test-build', buildId: id, manual: 9 })).response.status, 404);
  assert.equal((await as('mt1', 'POST', '/api/download/ticket', { kind: 'test-build', buildId: id, manual: '0' })).response.status, 404);
  await decideRaw({ email: 'mt1@example.com', decision: 'end' });
  assert.equal((await as('mt1', 'POST', '/api/download/ticket', { kind: 'test-build', buildId: id, manual: 0 })).response.status, 403, 'ended');
});

await test('results: a tester writes status + notes per task and a summary for its own assigned build; each sees only its own; admin reads all', async () => {
  resetDb();
  await approve('rs1'); await approve('rs2'); await approve('rs3'); await apply('rs4');
  const made = await saveBuild({ assignedTo: ['rs1@example.com', 'rs2@example.com', 'rs4@example.com'], tasks: [{ id: 'a1', title: 'Load a preset' }, { id: 'b2', title: 'Glue stage' }] });
  const id = made.body.id;
  assert.equal((await as('rs1', 'GET', '/api/testers/builds')).body.builds[0].result, null);
  const out = await result('rs1', { buildId: id, tasks: { a1: { status: 'done', note: 'Presets load fine.' }, b2: { status: 'problem', note: 'Crackle at 4:1 on the kick.'.repeat(100) }, zz: { status: 'done', note: 'not a task' } }, summary: 'Sounds warm. I could not tell what the attack does.' });
  assert.equal(out.response.status, 200);
  await result('rs2', { buildId: id, tasks: { a1: { status: 'todo', note: '' } }, summary: 'Only started.' });
  const mine = (await as('rs1', 'GET', '/api/testers/builds')).body.builds[0].result;
  assert.deepEqual(Object.keys(mine.tasks).sort(), ['a1', 'b2']);
  assert.equal(mine.tasks.a1.status, 'done');
  assert.equal(mine.tasks.b2.note.length, 1500);
  assert.equal(mine.summary, 'Sounds warm. I could not tell what the attack does.');
  assert.equal((await as('rs2', 'GET', '/api/testers/builds')).body.builds[0].result.summary, 'Only started.', 'its own result only');
  assert.equal(JSON.stringify((await as('rs2', 'GET', '/api/testers/builds')).body).includes('Sounds warm'), false);
  // Saving again replaces.
  await result('rs1', { buildId: id, tasks: { a1: { status: 'done', note: 'ok' } }, summary: 'Second pass.' });
  assert.deepEqual(Object.keys(doc(`tester_build_results/${id}_rs1@example.com`).tasks), ['a1']);
  // Gates and validation.
  assert.equal((await result('rs3', { buildId: id, tasks: {}, summary: 'x' })).response.status, 403, 'not assigned');
  assert.equal((await result('rs4', { buildId: id, tasks: {}, summary: 'x' })).response.status, 403, 'an applicant');
  assert.equal((await result('rs1', { buildId: id, tasks: { a1: { status: 'great' } } })).response.status, 400);
  assert.equal((await result('rs1', { buildId: 'nosuch', tasks: {} })).response.status, 403);
  assert.equal((await result('rs1', { buildId: '../x', tasks: {} })).response.status, 400);
  assert.equal((await result(undefined, { buildId: id, tasks: {} })).response.status, 401);
  assert.equal((await result('unv-rs1', { buildId: id, tasks: {} })).response.status, 403);
  // Admin sees every tester's result for the build; a tester does not.
  const all = await readAdminResults(id);
  assert.deepEqual(all.body.results.map((r) => r.email), ['rs1@example.com', 'rs2@example.com']);
  assert.equal((await as('rs1', 'GET', `/api/admin/testers/builds/results?id=${id}`)).response.status, 403);
  assert.equal((await readAdminResults('../x')).response.status, 400);
  // An ended tester can no longer write.
  await decideRaw({ email: 'rs2@example.com', decision: 'end' });
  assert.equal((await result('rs2', { buildId: id, tasks: {}, summary: 'late' })).response.status, 403);
});

await test('messages: a tester sees and writes only its own thread; staff replies; unread counts on both sides; no e-mail is involved', async () => {
  resetDb();
  await approve('ms1'); await approve('ms2'); await apply('ms3');
  assert.equal((await send('ms1', 'Hello, can I get a second Mac build?')).response.status, 200);
  assert.equal((await send('ms1', 'Also: could the panel show my OS?', 'panel')).response.status, 200);
  await send('ms2', 'A private question from ms2.');
  const t1 = (await as('ms1', 'GET', '/api/testers/messages')).body;
  assert.deepEqual(t1.messages.map((m) => [m.from, m.kind]), [['tester', 'message'], ['tester', 'panel']]);
  assert.equal(t1.unread, 0);
  assert.equal(JSON.stringify(t1).includes('ms2'), false, 'nothing of another thread');
  assert.equal(t1.messages[0].email, undefined);
  // Admin: threads, per-thread unread, total.
  const threads = (await as('owner', 'GET', '/api/admin/testers/messages')).body;
  assert.equal(threads.unread, 3);
  assert.deepEqual(threads.threads.map((t) => [t.email, t.unread]).sort(), [['ms1@example.com', 2], ['ms2@example.com', 1]]);
  assert.equal((await as('owner', 'GET', '/api/admin/testers/messages?email=ms1@example.com')).body.messages.length, 2);
  // Reply, then the tester's unread count and the panel count follow; reading clears it.
  assert.equal((await reply('ms1@example.com', 'Yes, it is in your Test area now.')).response.status, 200);
  assert.equal((await as('ms1', 'GET', '/api/testers/panel')).body.messages.unread, 1);
  assert.equal((await as('ms2', 'GET', '/api/testers/panel')).body.messages.unread, 0);
  const after = (await as('ms1', 'GET', '/api/testers/messages')).body;
  assert.equal(after.unread, 1);
  assert.deepEqual(after.messages.map((m) => m.from), ['tester', 'tester', 'staff']);
  assert.equal((await as('ms1', 'POST', '/api/testers/messages/read', {})).body.changed, 1);
  assert.equal((await as('ms1', 'GET', '/api/testers/messages')).body.unread, 0);
  assert.equal((await as('owner', 'POST', '/api/admin/testers/messages/read', { email: 'ms1@example.com' })).body.changed, 2);
  assert.equal((await as('owner', 'GET', '/api/admin/testers/messages')).body.unread, 1);
  // Validation and gates.
  assert.equal((await send('ms1', ' ')).response.status, 400);
  assert.equal((await send('ms1', 'z'.repeat(5000))).response.status, 200);
  assert.equal(Math.max(...[...state.db.docs].filter(([k]) => k.startsWith('tester_messages/')).map(([, v]) => v.body.length)), 2000);
  assert.equal((await send('ms3', 'I am only an applicant.')).response.status, 403);
  assert.equal((await as('ms3', 'GET', '/api/testers/messages')).response.status, 403);
  assert.equal((await send('unv-ms1', 'Not proven.')).response.status, 403);
  assert.equal((await send(undefined, 'No sign-in.')).response.status, 401);
  for (const [method, path, body] of [['GET', '/api/admin/testers/messages'], ['POST', '/api/admin/testers/messages/reply', { email: 'ms1@example.com', body: 'hi' }], ['POST', '/api/admin/testers/messages/read', { email: 'ms1@example.com' }]]) {
    assert.equal((await as('ms1', method, path, body)).response.status, 403, `${path} as a tester`);
  }
  assert.equal((await reply('ghost@example.com', 'hello')).response.status, 404);
  assert.equal((await reply('ms1@example.com', '')).response.status, 400);
  // An ended tester keeps the thread; a revoked one loses it.
  await decideRaw({ email: 'ms2@example.com', decision: 'end' });
  assert.equal((await send('ms2', 'One more question after the end.')).response.status, 200);
  await decideRaw({ email: 'ms2@example.com', decision: 'revoke' });
  assert.equal((await send('ms2', 'Still here?')).response.status, 403);
  assert.equal((await as('ms2', 'GET', '/api/testers/messages')).response.status, 403);
});

await test('report kind panel (Panel & permissions request) needs only the text, like idea', async () => {
  resetDb();
  await approve('pk1');
  const r = await report('pk1', { kind: 'panel', plugin: '', os: '', daw: '', text: 'Please show my Windows builds first and let me open the Learn page in a new tab.' });
  assert.equal(r.response.status, 200);
  const stored = [...state.db.docs].find(([k]) => k.startsWith('tester_reports/'))[1];
  assert.equal(stored.kind, 'panel'); assert.equal(stored.plugin, null);
  assert.equal((await report('pk1', { kind: 'panel', text: 'short' })).response.status, 400);
  assert.deepEqual((await as('pk1', 'GET', '/api/testers/reports')).body.reports.map((x) => x.kind), ['panel']);
  assert.equal((await report('pk1', { kind: 'nonsense' })).response.status, 400);
});

await test('the agreement text is served to a tester who is not revoked, for a real version only', async () => {
  resetDb();
  await approve('gr1'); await apply('gr2'); await approve('gr3');
  const ok = await as('gr1', 'GET', '/api/testers/agreement?v=1.1');
  assert.equal(ok.response.status, 200);
  assert.match(String(ok.body), /SubverseLab Tester Agreement/);
  assert.match(String(ok.body), /Version 1\.1/);
  assert.equal((await as('gr1', 'GET', '/api/testers/agreement?v=9.9')).response.status, 404);
  assert.equal((await as('gr1', 'GET', '/api/testers/agreement?v=../server')).response.status, 404);
  assert.equal((await as('gr2', 'GET', '/api/testers/agreement?v=1.1')).response.status, 403);
  assert.equal((await as(undefined, 'GET', '/api/testers/agreement?v=1.1')).response.status, 401);
  await decideRaw({ email: 'gr3@example.com', decision: 'end' });
  assert.equal((await as('gr3', 'GET', '/api/testers/agreement?v=1.1')).response.status, 200, 'an ended tester may still read what it accepted');
  await decideRaw({ email: 'gr3@example.com', decision: 'revoke' });
  assert.equal((await as('gr3', 'GET', '/api/testers/agreement?v=1.1')).response.status, 403);
});

await test('Learn content: the customer Learn states the updates line (UPDATES_LINE, no term promised); the tester Learn says released products carry no obligation', async () => {
  const plugins = await import(pathToFileURL(resolve(root, 'src/data/plugins.js')).href);
  const learn = await import(pathToFileURL(resolve(root, 'src/data/learnContent.js')).href);
  const customer = learn.CUSTOMER_LEARN.map((i) => i.body.join(' ')).join(' ');
  assert.ok(customer.includes('keeps working forever'), 'the update promise (owner 28 Oct: said once, in the Help block)');
  assert.ok(customer.includes(plugins.UPDATES_LINE));
  assert.doesNotMatch(customer, /\d+ years?/, 'no updates term is promised (owner 7 Nov 2026)');
  assert.ok(customer.includes('rescan'));
  assert.ok(customer.includes(learn.VISION_SHORT));
  const tester = learn.TESTER_LEARN.map((i) => `${i.title} ${i.body.join(' ')}`).join(' ');
  assert.match(tester, /no reporting obligation and there are no tasks for released products/);
  assert.match(tester, /screenshots are welcome but not required/);
  assert.match(tester, /2,000 tool credits/);
  for (const text of [customer, tester, learn.VISION]) assert.equal(/\b(beta|AI|neural|machine learning)\b/.test(text), false);
  assert.ok(learn.VISION.split(/[.!?]\s/).length <= 4 && learn.VISION.includes('we'), 'two to four sentences, first person plural');
  // The pages draw them.
  const account = await readFile(resolve(root, 'src/components/AccountPage.jsx'), 'utf8');
  const space = await readFile(resolve(root, 'src/components/tester/TesterSpace.jsx'), 'utf8');
  assert.ok(account.includes('CUSTOMER_LEARN') && space.includes('TESTER_LEARN') && space.includes('VISION'));
});

await test('firestore.rules close tester_builds, tester_build_results and tester_messages to every client; the Dockerfile ships the agreement texts', async () => {
  const rules = await readFile(resolve(root, 'firestore.rules'), 'utf8');
  for (const name of ['tester_builds', 'tester_build_results', 'tester_messages', 'tester_keys', 'launch2_testers']) {
    assert.match(rules, new RegExp(`match /${name}/\\{document=\\*\\*\\} \\{\\s*allow read, write: if false;`), name);
  }
  assert.match(await readFile(resolve(root, 'api/Dockerfile'), 'utf8'), /COPY tester-agreements \.\/tester-agreements/);
});

// ---- Round 3: briefs, revocable test-build licence keys, launch-over copy --------------------------------------------
const setKeyStatus = (email, product, status) => as('owner', 'POST', '/api/admin/testers/keys', { email, product, status });
const keyDocs = () => [...state.db.docs].filter(([k]) => k.startsWith('launch_keys/')).map(([k, v]) => ({ id: k.slice(12), ...v }));
const validateKey = (key) => call('/api/license/validate', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': nextIp() }, body: JSON.stringify({ license_key: key }) });

await test('build brief (goal, reference, focus) is stored, clamped, edited with the build and shown to the assigned tester', async () => {
  resetDb();
  await approve('br1');
  const made = await saveBuild({ assignedTo: ['br1@example.com'], brief: { goal: 'A plug-in for the body of a sound.', reference: 'r'.repeat(5000), strengths: ['Clean and stable', '  ', 'x'.repeat(500)], knownIssues: 'Sounds too polite\nPanel may change', focus: 'Is it quick to dial in?' } });
  assert.equal(made.response.status, 200);
  const stored = doc(`tester_builds/${made.body.id}`).brief;
  assert.equal(stored.goal, 'A plug-in for the body of a sound.');
  assert.equal(stored.reference.length, 1500);
  const seen = (await as('br1', 'GET', '/api/testers/builds')).body.builds[0];
  assert.deepEqual(stored.strengths, ['Clean and stable', 'x'.repeat(240)], 'blank lines dropped, lines clamped');
  assert.deepEqual(stored.knownIssues, ['Sounds too polite', 'Panel may change'], 'a text with one line per item is split');
  assert.deepEqual(seen.brief, { goal: 'A plug-in for the body of a sound.', reference: stored.reference, strengths: stored.strengths, knownIssues: stored.knownIssues, focus: 'Is it quick to dial in?' });
  await as('owner', 'POST', '/api/admin/testers/builds', { ...buildBody({ assignedTo: ['br1@example.com'], brief: { goal: 'Changed', focus: '' } }), id: made.body.id });
  assert.deepEqual(doc(`tester_builds/${made.body.id}`).brief, { goal: 'Changed', reference: '', strengths: [], knownIssues: [], focus: '' });
  // A build saved without a brief still reads fine.
  const plain = await saveBuild({ assignedTo: ['br1@example.com'], name: 'Plain' });
  assert.deepEqual((await as('br1', 'GET', '/api/testers/builds')).body.builds.find((b) => b.name === 'Plain').brief, { goal: '', reference: '', strengths: [], knownIssues: [], focus: '' });
  assert.equal(plain.response.status, 200);
});

await test('licence builds: assigning issues one key per tester (idempotent), shown to that tester only; no key without a licence or for a non-tester', async () => {
  resetDb();
  await approve('lk1'); await approve('lk2'); await apply('lk3');
  assert.equal((await saveBuild({ licence: { product: 'kubbe' } })).response.status, 400);
  const made = await saveBuild({ assignedTo: ['lk1@example.com', 'lk3@example.com', 'ghost@example.com'], licence: { product: 'seda' } });
  assert.equal(made.response.status, 200);
  assert.equal(made.body.keysIssued, 1, 'lk1 only: an applicant and a stranger have no tester record');
  const [k1] = keyDocs();
  assert.deepEqual({ email: k1.email, product: k1.product, id: k1.product_id, status: k1.status, limit: k1.activation_limit, source: k1.source, uid: k1.uid }, { email: 'lk1@example.com', product: 'seda', id: 9021, status: 'active', limit: 2, source: 'tester', uid: null });
  const seen = (await as('lk1', 'GET', '/api/testers/builds')).body.builds[0];
  assert.deepEqual(seen.licence, { product: 'seda', key: k1.id, status: 'active' });
  // Saving again, or assigning another tester, never mints a second key for lk1.
  await as('owner', 'POST', '/api/admin/testers/builds', { ...buildBody({ assignedTo: ['lk1@example.com', 'lk2@example.com'], licence: { product: 'seda' } }), id: made.body.id });
  assert.equal(keyDocs().length, 2);
  assert.equal(keyDocs().filter((k) => k.email === 'lk1@example.com').length, 1);
  const second = (await as('lk2', 'GET', '/api/testers/builds')).body.builds[0].licence;
  assert.notEqual(second.key, k1.id);
  assert.equal(JSON.stringify((await as('lk2', 'GET', '/api/testers/builds')).body).includes(k1.id), false, "another tester's key is never shown");
  // A build without a licence issues nothing and shows none.
  const none = await saveBuild({ assignedTo: ['lk1@example.com'], name: 'No licence' });
  assert.equal(none.body.keysIssued, 0);
  assert.equal((await as('lk1', 'GET', '/api/testers/builds')).body.builds.find((b) => b.name === 'No licence').licence, null);
  // Not a purchase and not a seat: nothing on /account, no counter, no claim.
  assert.deepEqual((await as('lk1', 'GET', '/api/purchases/licenses')).body.licenses, []);
  assert.equal(doc('plugin_licenses/lk1@example.com'), undefined);
  assert.equal(doc('launch/counter').claimed, 0);
  assert.equal([...state.db.docs.keys()].some((k) => k.startsWith('launch_claims/')), false);
  // SEDA is released (19 Oct): an active tester owns it through the release (TESTER_RELEASED_SLUGS), never through the key above.
  assert.equal((await as('lk1', 'GET', '/api/purchases/status')).body.owned.includes('seda'), true);
  // Admin sees the keys per build.
  const list = (await as('owner', 'GET', '/api/admin/testers/builds')).body.builds.find((b) => b.id === made.body.id);
  assert.deepEqual(list.keys.map((k) => [k.email, k.status]).sort(), [['lk1@example.com', 'active'], ['lk2@example.com', 'active']]);
  assert.deepEqual(list.licence, { product: 'seda', productId: 9021 });
});

await test('tester keys: the plugin API sees them (own product id), Disable / Enable close and reopen, admin only', async () => {
  resetDb();
  await approve('lv1');
  await saveBuild({ assignedTo: ['lv1@example.com'], licence: { product: 'adalet' } });
  const key = keyDocs()[0].id;
  const act = await call('/api/license/activate', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': nextIp() }, body: JSON.stringify({ license_key: key, instance_name: 'Mac A' }) });
  assert.equal(act.response.status, 200);
  assert.equal(act.body.meta.product_id, 9022);
  assert.equal(doc('plugin_licenses/lv1@example.com'), undefined);
  assert.equal((await validateKey(key)).body.valid, true);
  for (const [who, code] of [['lv1', 403], [undefined, 401]]) assert.equal((await as(who, 'POST', '/api/admin/testers/keys', { email: 'lv1@example.com', product: 'adalet', status: 'disabled' })).response.status, code);
  assert.equal((await setKeyStatus('lv1@example.com', 'banana', 'disabled')).response.status, 400);
  assert.equal((await setKeyStatus('lv1@example.com', 'adalet', 'paused')).response.status, 400);
  const off = await setKeyStatus('lv1@example.com', 'adalet', 'disabled');
  assert.deepEqual([off.response.status, off.body.changed], [200, 1]);
  const closed = await validateKey(key);
  assert.deepEqual([closed.body.valid, closed.body.error], [false, 'This license key is disabled.']);
  assert.equal((await as('lv1', 'GET', '/api/testers/builds')).body.builds[0].licence.status, 'disabled');
  assert.equal((await as('owner', 'GET', '/api/admin/testers/builds')).body.builds[0].keys[0].status, 'disabled');
  assert.equal((await setKeyStatus('lv1@example.com', 'adalet', 'active')).body.changed, 1);
  assert.equal((await validateKey(key)).body.valid, true);
});

await test('End testing leaves the tester keys; Revoke disables all of them (and a revoked tester\'s key cannot be re-enabled)', async () => {
  resetDb();
  await approve('ek1'); await approve('ek2');
  await saveBuild({ assignedTo: ['ek1@example.com', 'ek2@example.com'], licence: { product: 'seda' } });
  await saveBuild({ assignedTo: ['ek2@example.com'], licence: { product: 'adalet' }, name: 'Adalet build' });
  const keyOf = (email, product) => keyDocs().find((k) => k.email === email && k.product === product);
  await decideRaw({ email: 'ek1@example.com', decision: 'end' });
  assert.equal(keyOf('ek1@example.com', 'seda').status, 'active', 'End testing leaves the key (decided per key by the owner)');
  assert.equal((await validateKey(keyOf('ek1@example.com', 'seda').id)).body.valid, true);
  await decideRaw({ email: 'ek2@example.com', decision: 'revoke' });
  assert.equal(keyOf('ek2@example.com', 'seda').status, 'disabled');
  assert.equal(keyOf('ek2@example.com', 'adalet').status, 'disabled');
  assert.equal((await validateKey(keyOf('ek2@example.com', 'seda').id)).body.error, 'This license key is disabled.');
  assert.equal(keyOf('ek1@example.com', 'seda').status, 'active', "another tester's key is untouched");
  assert.equal((await setKeyStatus('ek2@example.com', 'seda', 'active')).response.status, 409);
  // A repeated revoke finishes a half-done one.
  await setKeyStatus('ek1@example.com', 'seda', 'active');
  await decideRaw({ email: 'ek1@example.com', decision: 'revoke' });
  assert.equal(keyOf('ek1@example.com', 'seda').status, 'disabled');
  state.db.docs.set(`launch_keys/${keyOf('ek1@example.com', 'seda').id}`, { ...keyOf('ek1@example.com', 'seda'), id: undefined, status: 'active' });
  await decideRaw({ email: 'ek1@example.com', decision: 'revoke' });
  assert.equal(keyOf('ek1@example.com', 'seda').status, 'disabled');
});

await test('launch-over copy: DownloadButtons says "Download free" only for the free plug-ins and "download available shortly" without a manifest entry; no launch dates in the buttons', async () => {
  const src = await readFile(resolve(root, 'src/components/DownloadButtons.jsx'), 'utf8');
  assert.ok(src.includes("FREE_PLUGINS.some((p) => p.slug === slug) ? 'Download free' : 'Download'"));
  assert.ok(src.includes('download available shortly'));
  for (const stale of ['Available October', 'RELEASE2_AT', "'Download free' : 'Download'} for ${label}${f.version ? ` · v${f.version}` : ''}${size ? ` · ${size}` : ''}` : ((launchId"]) assert.equal(src.includes(stale), false, stale);
  const buy = await readFile(resolve(root, 'src/components/BuyButton.jsx'), 'utf8');
  assert.equal(buy.includes('After the first 1,000'), false);
  const panel = await readFile(resolve(root, 'src/components/tester/TesterSpace.jsx'), 'utf8');
  assert.equal(/tp-badge|>Tester</.test(panel), false, 'no Tester badge in the panel header');
  assert.ok(panel.includes('Your SubverseLab panel'));
  assert.ok(panel.includes('This key unlocks the test build on up to 2 computers. We may switch it off when testing ends.'));
  const lic = await import(pathToFileURL(resolve(root, 'api/launchLicence.js')).href);
  assert.deepEqual({ seda: lic.PRODUCT_IDS.seda, adalet: lic.PRODUCT_IDS.adalet }, { seda: 9021, adalet: 9022 });
  assert.ok((await readFile(resolve(root, 'api/server.js'), 'utf8')).includes("const PRODUCT_IDS_TESTER = { seda: 9021, adalet: 9022 }"));
});

// ---- Round 4: the tester space lives on /account; assistant door (copy / paste text, personal agent key) -----------------
const readSrc = (f) => readFile(resolve(root, f), 'utf8');
const agentCall = (token, method, path, body) => call(path, {
  method, headers: { 'content-type': 'application/json', 'x-forwarded-for': nextIp(), ...(token ? { authorization: `Bearer ${token}` } : {}) },
  body: body === undefined ? undefined : JSON.stringify(body),
});
const makeToken = async (uid) => (await as(uid, 'POST', '/api/testers/agent-token', {})).body.token;
const sha256 = async (t) => (await import('node:crypto')).createHash('sha256').update(t).digest('hex');
const tokenDocs = () => [...state.db.docs].filter(([k]) => k.startsWith('tester_agent_tokens/'));

await test('wiring: /account renders the tester space for an approved or ended tester, the banner is gone, /testers sends them to /account, non-testers keep the plain page', async () => {
  const account = await readSrc('src/components/AccountPage.jsx');
  assert.match(account, /import TesterSpace from '\.\/tester\/TesterSpace'/);
  assert.match(account, /testerStatus === 'approved' \|\| testerStatus === 'ended'/);
  assert.match(account, /<TesterSpace user=\{user\} accountSection=/);
  assert.equal(account.includes('TesterBanner'), false);
  assert.equal(account.includes('Open your tester panel'), false);
  assert.match(account, /compact=\{tester\}/, 'the plain owned-plugins list is not repeated beside the tester Downloads');
  assert.match(account, /testerStatus === 'revoked' && /, 'a revoked tester sees a one-line notice on the normal page');
  assert.match(account, /<div className="acct-page">\s*<PageMeta title="Account \| SubverseLab" noIndex \/>/, 'the plain account page is unchanged');
  const page = await readSrc('src/components/TestersPage.jsx');
  assert.match(page, /<Navigate to="\/account" replace \/>/);
  assert.equal(page.includes('import TesterSpace'), false);
  const space = await readSrc('src/components/tester/TesterSpace.jsx');
  assert.ok(space.includes("['account', 'Orders & keys']") && space.includes('{tab === \'account\' && accountSection}'));
  for (const section of ['Overview', 'Downloads', 'Test area', 'Messages', 'Reports', 'Learn']) assert.ok(space.includes(`'${section}'`), section);
  const preview = await readSrc('preview/tester-preview.jsx');
  assert.ok(preview.includes('AccountPage'), 'the preview renders the integrated page');
});

await test('assistant text: the copy block lists brief, tasks as T1…, current results and the fixed answer format, and no licence key', async () => {
  const { buildCopyText, allBuildsCopyText, parseResults } = await import(pathToFileURL(resolve(root, 'src/components/tester/agentText.js')).href);
  const build = { id: 'b1', name: 'SEDA', version: '0.9.0', platform: 'mac', notes: 'First build.', licence: { key: 'SVL-SECRET-KEY' },
    brief: { goal: 'A delay.', reference: 'BBD pedals.', strengths: ['Stable'], knownIssues: ['Sounds polite'], focus: 'Does it feel analog?' },
    tasks: [{ id: 'x1', title: 'Mono and stereo', detail: 'Insert on both.' }, { id: 'x2', title: 'Save and reopen', detail: '' }],
    result: { tasks: { x1: { status: 'done', note: 'Fine.' } }, summary: 'So far good.' } };
  const text = buildCopyText(build);
  for (const part of ['# SEDA v0.9.0', '## What this plug-in is for', 'A delay.', '- Stable', '- Sounds polite', 'T1. Mono and stereo: Insert on both.', 'Current: done | Fine.', 'T2. Save and reopen', 'Current: not-started', 'SUMMARY | your overall results', 'T1 | done | what you heard and saw', 'done, problem, not-started']) assert.ok(text.includes(part), part);
  assert.equal(text.includes('SVL-SECRET-KEY'), false);
  assert.ok(allBuildsCopyText([build, { ...build, name: 'ADALET' }]).includes('# ADALET'));
  const tasks = build.tasks;
  const ok = parseResults('Here you go:\n- **T1** | Done | Presets load fine\n2) t2: problem found: crackle at 4:1\n`SUMMARY | warm sound`\nsummary: and more\n\nthanks', tasks);
  assert.deepEqual(ok.rows, [{ ref: 'T1', id: 'x1', status: 'done', note: 'Presets load fine' }, { ref: 'T2', id: 'x2', status: 'problem', note: 'crackle at 4:1' }]);
  assert.equal(ok.summary, 'warm sound\nand more');
  assert.deepEqual([ok.unknown, ok.bad], [[], []]);
  const odd = parseResults('T1 | not started\nT2: NOT-STARTED: later\nT7 | done | no such task\nT1 | maybe | unclear\nT2 -', tasks);
  assert.deepEqual(odd.rows.map((r) => [r.ref, r.status, r.note]), [['T1', 'todo', ''], ['T2', 'todo', 'later']]);
  assert.deepEqual(odd.unknown, ['T7']);
  assert.equal(odd.bad.length, 2, 'unreadable status and a line without a status');
  assert.equal(odd.summary, null);
  assert.deepEqual(parseResults('nothing useful here', tasks), { rows: [], unknown: [], bad: [], summary: null });
});

await test('agent key: created once by an active tester, only its SHA-256 is stored, a new key replaces the old, revoke closes it', async () => {
  resetDb();
  await approve('ak1'); await apply('ak2');
  assert.equal((await as('ak2', 'POST', '/api/testers/agent-token', {})).response.status, 403, 'an applicant');
  assert.equal((await as(undefined, 'POST', '/api/testers/agent-token', {})).response.status, 401);
  assert.equal((await as('unv-ak1', 'POST', '/api/testers/agent-token', {})).response.status, 403);
  const made = await as('ak1', 'POST', '/api/testers/agent-token', {});
  assert.equal(made.response.status, 200);
  assert.match(made.body.token, /^svlt_[0-9a-f]{48}$/);
  const docs = tokenDocs();
  assert.equal(docs.length, 1);
  assert.equal(docs[0][0], `tester_agent_tokens/${await sha256(made.body.token)}`);
  assert.deepEqual(Object.keys(docs[0][1]).sort(), ['createdAt', 'email', 'lastUsedAt']);
  assert.equal(JSON.stringify([...state.db.docs]).includes(made.body.token), false, 'the token itself is stored nowhere');
  const info = await as('ak1', 'GET', '/api/testers/agent-token');
  assert.deepEqual([info.body.exists, Object.keys(info.body).includes('token')], [true, false]);
  assert.equal((await agentCall(made.body.token, 'GET', '/api/testers/agent/builds')).response.status, 200);
  const second = await makeToken('ak1');
  assert.notEqual(second, made.body.token);
  assert.equal(tokenDocs().length, 1, 'one key per tester');
  assert.equal((await agentCall(made.body.token, 'GET', '/api/testers/agent/builds')).response.status, 401, 'the replaced key is dead');
  assert.equal((await agentCall(second, 'GET', '/api/testers/agent/builds')).response.status, 200);
  assert.ok(tokenDocs()[0][1].lastUsedAt, 'last use is recorded');
  assert.equal((await as('ak1', 'POST', '/api/testers/agent-token/revoke', {})).body.removed, 1);
  assert.equal((await agentCall(second, 'GET', '/api/testers/agent/builds')).response.status, 401);
  assert.equal((await as('ak1', 'GET', '/api/testers/agent-token')).body.exists, false);
});

await test('agent key: wrong, malformed and missing tokens are 401; ended and revoked testers are 403; Revoke deletes the key; admin sees and revokes it', async () => {
  resetDb();
  await approve('au1'); await approve('au2'); await approve('au3');
  const t1 = await makeToken('au1'); const t2 = await makeToken('au2'); const t3 = await makeToken('au3');
  for (const bad of [undefined, 'svlt_' + '0'.repeat(48), 'svlt_short', 'valid-au1', 'Bearer']) assert.equal((await agentCall(bad, 'GET', '/api/testers/agent/builds')).response.status, 401, String(bad));
  const list = (await as('owner', 'GET', '/api/admin/testers')).body.applications;
  assert.ok(list.find((a) => a.email === 'au1@example.com').tester.agentToken.createdAt);
  assert.equal(list.find((a) => a.email === 'au1@example.com').tester.agentToken.hash, undefined);
  assert.equal((await as('au1', 'POST', '/api/admin/testers/agent-token/revoke', { email: 'au2@example.com' })).response.status, 403);
  assert.equal((await as('owner', 'POST', '/api/admin/testers/agent-token/revoke', { email: 'au1@example.com' })).body.removed, 1);
  assert.equal((await agentCall(t1, 'GET', '/api/testers/agent/builds')).response.status, 401);
  await decideRaw({ email: 'au2@example.com', decision: 'end' });
  assert.equal((await agentCall(t2, 'GET', '/api/testers/agent/builds')).response.status, 403, 'ended');
  assert.equal((await as('au2', 'POST', '/api/testers/agent-token', {})).response.status, 403, 'an ended tester cannot make a new key');
  await decide('owner', 'au2@example.com', 'approve');
  assert.equal((await agentCall(t2, 'GET', '/api/testers/agent/builds')).response.status, 200, 're-opened: the same key works again');
  await decideRaw({ email: 'au3@example.com', decision: 'revoke' });
  assert.equal((await agentCall(t3, 'GET', '/api/testers/agent/builds')).response.status, 401);
  assert.equal(tokenDocs().filter(([, v]) => v.email === 'au3@example.com').length, 0, 'revoking the tester deletes its key');
});

await test('agent scope: builds as JSON without licence keys, tickets, manuals paths or other testers; the key opens nothing else', async () => {
  resetDb();
  await approve('sc1'); await approve('sc2');
  await saveBuild({ assignedTo: ['sc1@example.com', 'sc2@example.com'], licence: { product: 'seda' }, brief: { goal: 'G', strengths: ['S'], knownIssues: ['K'], focus: 'F' },
    manuals: [{ title: 'Manual', objectPath: 'testbuilds/koro/0.9.1/Koro-manual.pdf' }], tasks: [{ id: 'a1', title: 'First' }, { id: 'b2', title: 'Second', detail: 'More' }] });
  await saveBuild({ assignedTo: ['sc2@example.com'], name: 'Not for sc1' });
  const tok = await makeToken('sc1');
  const out = await agentCall(tok, 'GET', '/api/testers/agent/builds');
  assert.equal(out.body.builds.length, 1);
  const b = out.body.builds[0];
  assert.deepEqual(b.tasks.map((t) => [t.ref, t.id, t.title]), [['T1', 'a1', 'First'], ['T2', 'b2', 'Second']]);
  assert.deepEqual(b.brief, { goal: 'G', reference: '', strengths: ['S'], knownIssues: ['K'], focus: 'F' });
  const dump = JSON.stringify(out.body);
  for (const secret of ['SVL-', 'testbuilds/', 'licence', 'sc2@example.com', 'objectPath', 'Not for sc1']) assert.equal(dump.includes(secret), false, secret);
  assert.equal(b.manuals, undefined);
  // The key is not a sign-in: every other route refuses it.
  for (const [method, path, body] of [['GET', '/api/testers/builds'], ['GET', '/api/testers/panel'], ['POST', '/api/download/ticket', { kind: 'test-build', buildId: 'x' }], ['POST', '/api/download/ticket', { slug: 'koro', platform: 'mac', launchId: 'launch2' }], ['GET', '/api/purchases/status'], ['GET', '/api/purchases/licenses'], ['GET', '/api/credits/balance'], ['GET', '/api/testers/messages'], ['POST', '/api/testers/report', REPORT]]) {
    assert.equal((await agentCall(tok, method, path, body)).response.status, 401, path);
  }
  // And the admin routes.
  assert.equal((await agentCall(tok, 'GET', '/api/admin/testers')).response.status, 401);
});

await test('agent writes: results by task ref (merged, unknown refs reported), report and messages with the panel\'s rules', async () => {
  resetDb();
  await approve('aw1'); await approve('aw2');
  const made = await saveBuild({ assignedTo: ['aw1@example.com'], tasks: [{ id: 'a1', title: 'First' }, { id: 'b2', title: 'Second' }] });
  const id = made.body.id;
  const tok = await makeToken('aw1');
  const r1 = await agentCall(tok, 'POST', '/api/testers/agent/builds/result', { buildId: id, tasks: { T1: { status: 'done', note: 'Fine.' }, T9: { status: 'done', note: 'ghost' } }, summary: 'Sounds warm.' });
  assert.deepEqual([r1.response.status, r1.body.ok, r1.body.unknown], [200, true, ['T9']]);
  let saved = doc(`tester_build_results/${id}_aw1@example.com`);
  assert.deepEqual(saved.tasks, { a1: { status: 'done', note: 'Fine.' } });
  // A second call with another task keeps the first and the summary.
  await agentCall(tok, 'POST', '/api/testers/agent/builds/result', { buildId: id, tasks: { b2: { status: 'problem', note: 'Crackle.' } } });
  saved = doc(`tester_build_results/${id}_aw1@example.com`);
  assert.deepEqual(Object.keys(saved.tasks).sort(), ['a1', 'b2']);
  assert.equal(saved.summary, 'Sounds warm.');
  await agentCall(tok, 'POST', '/api/testers/agent/builds/result', { buildId: id, tasks: { T1: { status: 'not-started', note: '' } } });
  assert.equal(doc(`tester_build_results/${id}_aw1@example.com`).tasks.a1.status, 'todo');
  assert.equal((await agentCall(tok, 'POST', '/api/testers/agent/builds/result', { buildId: id, tasks: { T1: { status: 'great' } } })).response.status, 400);
  assert.equal((await agentCall(tok, 'POST', '/api/testers/agent/builds/result', { buildId: 'nosuch', tasks: {} })).response.status, 403);
  const mine = (await agentCall(tok, 'GET', '/api/testers/agent/builds')).body.builds[0].myResults;
  assert.equal(mine.tasks.b2.note, 'Crackle.');
  assert.equal((await as('aw1', 'GET', '/api/testers/builds')).body.builds[0].result.tasks.b2.status, 'problem', 'the panel sees what the agent wrote');
  assert.equal(JSON.stringify((await as('aw2', 'GET', '/api/testers/builds')).body).includes('Crackle'), false);
  // Report: same validation, same monthly cap.
  assert.equal((await agentCall(tok, 'POST', '/api/testers/agent/report', { ...REPORT, text: 'short' })).response.status, 400);
  assert.equal((await agentCall(tok, 'POST', '/api/testers/agent/report', REPORT)).response.status, 200);
  assert.equal((await agentCall(tok, 'POST', '/api/testers/agent/report', { kind: 'idea', text: 'A tool that matches loudness between takes.' })).response.status, 200);
  assert.equal(doc('launch2_testers/aw1@example.com').reportMonth.count, 2);
  state.db.docs.set('launch2_testers/aw1@example.com', { ...doc('launch2_testers/aw1@example.com'), reportMonth: { month: new Date().toISOString().slice(0, 7), count: 50 } });
  assert.equal((await agentCall(tok, 'POST', '/api/testers/agent/report', REPORT)).response.status, 429);
  // Messages: the panel's thread.
  assert.equal((await agentCall(tok, 'POST', '/api/testers/agent/messages', { body: 'Hello from my assistant.' })).response.status, 200);
  assert.equal((await agentCall(tok, 'POST', '/api/testers/agent/messages', { body: ' ' })).response.status, 400);
  await reply('aw1@example.com', 'Thanks, noted.');
  const thread = (await agentCall(tok, 'GET', '/api/testers/agent/messages')).body.messages;
  assert.deepEqual(thread.map((m) => m.from), ['tester', 'staff']);
  assert.equal((await as('aw1', 'GET', '/api/testers/messages')).body.messages.length, 2, 'the panel shows the same thread');
});

await test('agent key: rate limited per token; the OpenAPI description is public and covers exactly the agent routes', async () => {
  resetDb();
  await approve('rl1'); await approve('rl2');
  const t1 = await makeToken('rl1'); const t2 = await makeToken('rl2');
  const codes = [];
  for (let i = 0; i < 32; i += 1) codes.push((await agentCall(t1, 'GET', '/api/testers/agent/messages')).response.status);
  assert.equal(codes.filter((c) => c === 200).length, 30);
  assert.deepEqual(codes.slice(30), [429, 429]);
  assert.equal((await agentCall(t2, 'GET', '/api/testers/agent/messages')).response.status, 200, 'another token has its own bucket');
  const spec = await agentCall(undefined, 'GET', '/api/testers/agent/openapi.json');
  assert.equal(spec.response.status, 200);
  assert.equal(spec.body.openapi, '3.1.0');
  assert.deepEqual(Object.keys(spec.body.paths).sort(), ['/api/testers/agent/builds', '/api/testers/agent/builds/result', '/api/testers/agent/messages', '/api/testers/agent/report']);
  assert.equal(spec.body.components.securitySchemes.agentKey.scheme, 'bearer');
  assert.equal(JSON.stringify(spec.body).includes('svlt_' + '0'), false);
});

await test('agent key: firestore.rules close tester_agent_tokens; the Learn text explains the assistant door', async () => {
  const rules = await readSrc('firestore.rules');
  assert.match(rules, /match \/tester_agent_tokens\/\{document=\*\*\} \{\s*allow read, write: if false;/);
  const learn = await import(pathToFileURL(resolve(root, 'src/data/learnContent.js')).href);
  const text = learn.TESTER_LEARN.map((i) => i.body.join(' ')).join(' ');
  assert.match(text, /Copy for your assistant/); assert.match(text, /personal agent key/);
  assert.equal(/\bAI\b/.test(text), false);
  const space = await readSrc('src/components/tester/TesterSpace.jsx');
  assert.ok(space.includes('Connect your assistant') && space.includes('/api/testers/agent/openapi.json') && space.includes('Paste results from your assistant') && space.includes('Copy for your assistant'));
});

// ---- Round 5: no verified e-mail needed; the tester record belongs to the uid that applied -------------------------------
await test('uid binding: an unverified password account that applied gets panel, downloads, credits, builds, keys, messages and reports; another uid with the same e-mail gets 403 everywhere', async () => {
  resetDb();
  // "unv-" accounts have email_verified false in this harness: the applicant is such an account.
  await apply('unv-andre');
  assert.equal(doc('tester_applications/unv-andre@example.com').uid, 'unv-andre');
  assert.equal((await decide('owner', 'unv-andre@example.com', 'approve')).response.status, 200);
  assert.equal(doc('launch2_testers/unv-andre@example.com').uid, 'unv-andre', 'the applicant uid is copied on approval');
  const made = await saveBuild({ assignedTo: ['unv-andre@example.com'], licence: { product: 'seda' }, tasks: [{ id: 'a1', title: 'First' }] });
  const panel = await as('unv-andre', 'GET', '/api/testers/panel');
  assert.equal(panel.response.status, 200);
  assert.equal(panel.body.credits.left, 2000);
  assert.equal((await ticket('unv-andre', 'elek')).response.status, 200);
  assert.equal((await ticket('unv-andre', 'koro')).response.status, 200);
  assert.ok((await as('unv-andre', 'GET', '/api/purchases/status')).body.owned.includes('taban'));
  const builds = (await as('unv-andre', 'GET', '/api/testers/builds')).body.builds;
  assert.match(builds[0].licence.key, /^SVL-/);
  assert.equal((await as('unv-andre', 'POST', '/api/download/ticket', { kind: 'test-build', buildId: made.body.id })).response.status, 200);
  assert.equal((await result('unv-andre', { buildId: made.body.id, tasks: { a1: { status: 'done', note: 'ok' } }, summary: 's' })).response.status, 200);
  assert.equal((await send('unv-andre', 'Hello from an unverified password account.')).response.status, 200);
  assert.equal((await report('unv-andre')).response.status, 200);
  assert.equal((await as('unv-andre', 'POST', '/api/testers/agent-token', {})).response.status, 200);
  assert.equal((await as('unv-andre', 'GET', '/api/launch2/status')).body.standing, 'tester');
  // Same e-mail, another account: nothing, on every tester route and entitlement.
  const other = 'other-andre';
  state.extraTokens = { ...(state.extraTokens || {}), [other]: { uid: other, email: 'unv-andre@Example.com', email_verified: true } };
  for (const [method, path, body] of [['GET', '/api/testers/panel'], ['GET', '/api/testers/builds'], ['GET', '/api/testers/reports'], ['GET', '/api/testers/messages'], ['POST', '/api/testers/messages', { body: 'let me in please' }], ['POST', '/api/testers/report', REPORT], ['POST', '/api/testers/agent-token', {}], ['GET', '/api/testers/agreement?v=1.1'], ['POST', '/api/testers/builds/result', { buildId: made.body.id, tasks: {} }]]) {
    assert.equal((await as(other, method, path, body)).response.status, 403, `${method} ${path}`);
  }
  assert.equal((await as(other, 'POST', '/api/download/ticket', { kind: 'test-build', buildId: made.body.id })).response.status, 403);
  assert.equal((await ticket(other, 'elek')).response.status, 402);
  assert.equal((await ticket(other, 'koro')).response.status, 402);
  assert.deepEqual((await as(other, 'GET', '/api/purchases/status')).body.owned, []);
  assert.equal((await as(other, 'GET', '/api/launch2/status')).body.standing, 'none');
  assert.equal(doc('launch2_testers/unv-andre@example.com').uid, 'unv-andre', 'the record stays bound to the first account');
});

await test('uid binding: a record without a uid binds on the first signed-in request with its e-mail and then rejects other accounts; credits follow the same rule', async () => {
  resetDb();
  state.db.docs.set('launch2_testers/old1@example.com', { email: 'old1@example.com', status: 'active', approvedAt: '2026-10-01T00:00:00Z' });
  state.extraTokens = { ...(state.extraTokens || {}), 'imposter': { uid: 'imposter', email: 'old1@example.com', email_verified: false } };
  // The first account to ask (an unverified one) takes the record.
  assert.equal((await as('old1', 'GET', '/api/testers/panel')).response.status, 200);
  assert.equal(doc('launch2_testers/old1@example.com').uid, 'old1');
  assert.equal((await as('imposter', 'GET', '/api/testers/panel')).response.status, 403);
  assert.equal((await ticket('imposter', 'elek')).response.status, 402);
  // Binding also happens on an entitlement check, not only on the panel.
  state.db.docs.set('launch2_testers/old2@example.com', { email: 'old2@example.com', status: 'active' });
  assert.equal((await ticket('old2', 'koro')).response.status, 200);
  assert.equal(doc('launch2_testers/old2@example.com').uid, 'old2');
  assert.equal((await ticket('old2', 'koro')).response.status, 200);
});

await test('admin rebind: Unbind clears the uid and closes the agent key; an unproven account does not take the record by itself (audit F4), Bind gives it to the current account; a proven one binds itself; admin only', async () => {
  resetDb();
  await approve('rb1');
  const tok = await makeToken('rb1');
  state.extraTokens = { ...(state.extraTokens || {}), 'newrb1': { uid: 'newrb1', email: 'rb1@example.com', email_verified: false } };
  assert.equal((await as('newrb1', 'GET', '/api/testers/panel')).response.status, 403);
  for (const [who, code] of [['rb1', 403], [undefined, 401]]) assert.equal((await as(who, 'POST', '/api/admin/testers/uid', { email: 'rb1@example.com', clear: true })).response.status, code);
  assert.equal((await as('owner', 'POST', '/api/admin/testers/uid', { email: 'rb1@example.com' })).response.status, 400);
  assert.equal((await as('owner', 'POST', '/api/admin/testers/uid', { email: 'ghost@example.com', clear: true })).response.status, 404);
  const list = (await as('owner', 'GET', '/api/admin/testers')).body.applications.find((a) => a.email === 'rb1@example.com');
  assert.equal(list.tester.bound, true);
  assert.equal('uid' in list.tester, false, 'the record\'s uid is not listed, only whether it is bound');
  assert.equal((await as('owner', 'POST', '/api/admin/testers/uid', { email: 'rb1@example.com', clear: true })).response.status, 200);
  assert.equal(doc('launch2_testers/rb1@example.com').uid, null);
  assert.equal((await agentCall(tok, 'GET', '/api/testers/agent/builds')).response.status, 401, 'the old agent key is closed');
  assert.equal((await as('newrb1', 'GET', '/api/testers/panel')).response.status, 403, 'an unproven password account does not claim an unbound record (F4)');
  assert.equal(doc('launch2_testers/rb1@example.com').uid, null);
  for (const [who, code] of [['rb1', 403], [undefined, 401]]) assert.equal((await as(who, 'POST', '/api/admin/testers/uid', { email: 'rb1@example.com', bind: true })).response.status, code);
  assert.equal((await as('owner', 'POST', '/api/admin/testers/uid', { email: 'nobody-yet@example.com', bind: true })).response.status, 404);
  assert.equal((await as('owner', 'POST', '/api/admin/testers/uid', { email: 'rb1@example.com', bind: true })).response.status, 200);
  assert.equal(doc('launch2_testers/rb1@example.com').uid, 'newrb1', 'Bind gives the record to the account that holds the e-mail now');
  assert.equal((await as('newrb1', 'GET', '/api/testers/panel')).response.status, 200, 'the bound account is the tester');
  assert.equal((await as('rb1', 'GET', '/api/testers/panel')).response.status, 403, 'the old account is out');
  // a proven account (Google / email_verified) still binds an unbound record by itself
  assert.equal((await as('owner', 'POST', '/api/admin/testers/uid', { email: 'rb1@example.com', clear: true })).response.status, 200);
  state.extraTokens.provenrb1 = { uid: 'provenrb1', email: 'rb1@example.com', email_verified: true };
  assert.equal((await as('provenrb1', 'GET', '/api/testers/panel')).response.status, 200, 'a proven account binds itself');
  assert.equal(doc('launch2_testers/rb1@example.com').uid, 'provenrb1');
});

await test('the tester rule stays tester-only: orders and launch claims still need a proven e-mail', async () => {
  const src = await readSrc('api/server.js');
  assert.ok(src.includes('async function testerOwn('));
  const tester = src.slice(src.indexOf('async function testerOwn('), src.indexOf('async function testerSlugsFor('));
  // audit F4: emailProven appears in testerOwn only to guard the self-binding of an unbound record, never for a bound one
  assert.equal((tester.match(/emailProven/g) || []).length, 1);
  assert.ok(tester.indexOf('emailProven') > tester.indexOf('fresh.data().uid'), 'a bound record is decided by its uid alone');
  const record = src.slice(src.indexOf('async function testerRecord('), src.indexOf('// GET /api/testers/panel'));
  assert.equal(record.includes('emailProven'), false);
  assert.ok(src.includes('function emailProven(decoded)'));
  assert.ok(src.includes("ownedOrderSlugs(admin, decoded.email, decoded.uid) : ownedUidOrderSlugs(admin, decoded.uid)"), 'orders keep the proven-e-mail rule');
});

// ---- Round 6: message caps, admin uploads, no-flash account, launch-over copy ------------------------------------------
const uploadReq = (body) => as('owner', 'POST', '/api/admin/testers/uploads', body);

await test('message caps: 30 an hour and 200 a day per tester, on the panel and on the agent routes, with a clear error; other testers and staff replies are not counted', async () => {
  resetDb();
  await approve('mc1'); await approve('mc2');
  const t = await makeToken('mc1');
  const nowIso = new Date().toISOString();
  const old = (hoursAgo) => new Date(Date.now() - hoursAgo * 3600000).toISOString();
  // 29 in the last hour: the 30th goes through (panel), the 31st (agent) is refused.
  for (let i = 0; i < 29; i += 1) state.db.docs.set(`tester_messages/h${i}`, { email: 'mc1@example.com', from: 'tester', kind: 'message', body: 'x', at: nowIso, read: false });
  assert.equal((await send('mc1', 'The thirtieth message this hour.')).response.status, 200);
  const hourly = await send('mc1', 'The thirty-first.');
  assert.equal(hourly.response.status, 429);
  assert.match(hourly.body.error, /30 messages in the last hour/);
  assert.equal((await agentCall(t, 'POST', '/api/testers/agent/messages', { body: 'Through the agent as well.' })).response.status, 429);
  assert.equal((await send('mc2', 'Another tester is not affected.')).response.status, 200);
  await reply('mc1@example.com', 'Staff replies are not counted and still arrive.');
  assert.equal((await as('mc1', 'GET', '/api/testers/messages')).response.status, 200, 'reading is never limited');
  // The hour passes (the messages are 2 hours old): the day cap is next. 200 in the last day, none in the last hour.
  for (let i = 0; i < 30; i += 1) state.db.docs.set(`tester_messages/h${i}`, { email: 'mc1@example.com', from: 'tester', kind: 'message', body: 'x', at: old(2), read: false });
  for (const [k, v] of [...state.db.docs]) if (k.startsWith('tester_messages/') && v.email === 'mc1@example.com' && v.from === 'tester' && k.startsWith('tester_messages/auto')) state.db.docs.set(k, { ...v, at: old(2) });
  assert.equal((await send('mc1', 'Allowed again once the hour is over.')).response.status, 200);
  for (let i = 30; i < 200; i += 1) state.db.docs.set(`tester_messages/h${i}`, { email: 'mc1@example.com', from: 'tester', kind: 'message', body: 'x', at: old(5), read: false });
  const daily = await send('mc1', 'Over the day cap.');
  assert.equal(daily.response.status, 429);
  assert.match(daily.body.error, /200 messages in the last 24 hours/);
  assert.equal((await agentCall(t, 'POST', '/api/testers/agent/messages', { body: 'Agent over the day cap.' })).response.status, 429);
  // Older than a day no longer counts.
  for (const [k, v] of [...state.db.docs]) if (k.startsWith('tester_messages/') && v.from === 'tester' && v.email === 'mc1@example.com') state.db.docs.set(k, { ...v, at: old(30) });
  assert.equal((await send('mc1', 'A day later.')).response.status, 200);
});

await test('admin upload: a signed V4 PUT address into test-builds/ only, type and size fixed by the extension, admin only; complete reads size and checksum back', async () => {
  resetDb();
  await approve('up1');
  for (const [who, code] of [['up1', 403], [undefined, 401]]) assert.equal((await as(who, 'POST', '/api/admin/testers/uploads', { kind: 'installer', filename: 'Koro.pkg' })).response.status, code);
  assert.equal((await as('up1', 'POST', '/api/admin/testers/uploads/complete', { objectPath: 'test-builds/x/Koro.pkg' })).response.status, 403);
  for (const body of [{ kind: 'video', filename: 'a.pkg' }, { kind: 'installer', filename: 'Koro.exe' }, { kind: 'installer', filename: 'manual.pdf' }, { kind: 'manual', filename: 'Koro.pkg' }, { kind: 'installer', filename: '.pkg' }, { kind: 'installer' }]) {
    assert.equal((await uploadReq(body)).response.status, 400, JSON.stringify(body));
  }
  const inst = await uploadReq({ kind: 'installer', filename: '../../plugins/koro/Koro Mac (1).pkg', buildId: 'b123' });
  assert.equal(inst.response.status, 200);
  assert.equal(inst.body.objectPath, 'test-builds/b123/Koro-Mac-1-.pkg', 'a folder in the filename cannot leave the private prefix');
  assert.equal(inst.body.uploadUrl, 'https://signed.test/test-builds/b123/Koro-Mac-1-.pkg?v=v4&a=write');
  assert.deepEqual(inst.body.headers, { 'Content-Type': 'application/octet-stream', 'x-goog-content-length-range': `0,${1.5 * 1024 * 1024 * 1024}` });
  const call1 = state.storage.signCalls.at(-1);
  assert.deepEqual([call1.version, call1.action, call1.contentType], ['v4', 'write', 'application/octet-stream']);
  assert.deepEqual(call1.extensionHeaders, { 'x-goog-content-length-range': `0,${1.5 * 1024 * 1024 * 1024}` });
  assert.ok(call1.expires - Date.now() <= 15 * 60 * 1000 && call1.expires > Date.now(), 'short lived');
  const man = await uploadReq({ kind: 'manual', filename: 'Quick Start.PDF' });
  assert.match(man.body.objectPath, /^test-builds\/[0-9a-f]{16}\/Quick-Start\.PDF$/);
  assert.equal(man.body.headers['Content-Type'], 'application/pdf');
  assert.equal(man.body.headers['x-goog-content-length-range'], `0,${50 * 1024 * 1024}`);
  assert.equal((await uploadReq({ kind: 'installer', filename: 'a.zip' })).body.headers['Content-Type'], 'application/zip');
  assert.equal((await uploadReq({ kind: 'installer', filename: 'a.dmg' })).body.headers['Content-Type'], 'application/x-apple-diskimage');
  // Complete: nothing there yet, then the file arrives.
  assert.equal((await as('owner', 'POST', '/api/admin/testers/uploads/complete', { objectPath: inst.body.objectPath })).response.status, 404);
  for (const bad of ['plugins/koro/1.0.0/Koro-mac.zip', 'test-builds/../plugins/x.pkg', 'test-builds/b/notes.txt', '']) assert.equal((await as('owner', 'POST', '/api/admin/testers/uploads/complete', { objectPath: bad })).response.status, 400, bad);
  state.storage.files.set(inst.body.objectPath, { name: 'Koro-Mac-1-.pkg', body: 'PKGBYTES' });
  state.storage.files.set('test-builds/b123/Guide.pdf', { name: 'Guide.pdf', body: 'PDFBYTES' });
  const done = await as('owner', 'POST', '/api/admin/testers/uploads/complete', { objectPath: inst.body.objectPath });
  assert.deepEqual(done.body, { objectPath: inst.body.objectPath, size: 8, sha256: null, md5: 'MD5OF8' }, 'an installer: size and md5');
  const sha = (await import('node:crypto')).createHash('sha256').update('PDFBYTES').digest('hex');
  assert.deepEqual((await as('owner', 'POST', '/api/admin/testers/uploads/complete', { objectPath: 'test-builds/b123/Guide.pdf' })).body, { objectPath: 'test-builds/b123/Guide.pdf', size: 8, sha256: sha, md5: 'MD5OF8' }, 'a manual: size, md5 and sha256');
  // The recorded size / sha256 stay with the build and the manual; the file is handed out only through the ticket check.
  await approve('up2');
  const made = await saveBuild({ assignedTo: ['up2@example.com'], objectPath: inst.body.objectPath, size: 8, sha256: 'a'.repeat(64), manuals: [{ title: 'Guide', objectPath: 'test-builds/b123/Guide.pdf', size: 8, sha256: sha }] });
  const stored = doc(`tester_builds/${made.body.id}`);
  assert.deepEqual([stored.size, stored.sha256, stored.manuals[0].size, stored.manuals[0].sha256], [8, 'a'.repeat(64), 8, sha]);
  assert.equal((await saveBuild({ size: -5, sha256: 'nothex' })).response.status, 200);
  assert.equal(doc(`tester_builds/${(await saveBuild({ size: -5, sha256: 'nothex' })).body.id}`).size, undefined, 'malformed size / sha256 are dropped');
  const seen = (await as('up2', 'GET', '/api/testers/builds')).body.builds[0];
  assert.equal(JSON.stringify(seen).includes('test-builds/'), false, 'no bucket path reaches the tester');
  const ticketOut = await as('up2', 'POST', '/api/download/ticket', { kind: 'test-build', buildId: made.body.id, manual: 0 });
  assert.equal(ticketOut.response.status, 200);
  assert.equal(String((await call(ticketOut.body.url, { headers: { 'x-forwarded-for': nextIp() } })).body), 'PDFBYTES');
});

await test('wiring (round 6): no flash of the plain account for a tester, the admin message count loads with the panel, the dead launch branches are gone', async () => {
  const account = await readSrc('src/components/AccountPage.jsx');
  assert.match(account, /if \(testerStatus === null\) \{[\s\S]*Loading your account[\s\S]*<div hidden>\{content\}<\/div>/);
  assert.ok(account.indexOf('testerStatus === null') < account.indexOf('if (tester) return <TesterSpace'));
  assert.match(account, /setStatus\(r\.ok \? body\.status : 'none'\)/, 'a failed status call falls back to the normal page');
  const admin = await readSrc('src/components/AdminPanel.jsx');
  assert.match(admin, /if \(user\) adminFetch\('\/api\/admin\/testers\/messages'\)\.then\(setThreads\)/);
  assert.ok(admin.includes('/api/admin/testers/uploads') && admin.includes('type="file"'));
  for (const f of ['src/components/LaunchPage.jsx', 'src/components/PluginRoom.jsx', 'src/components/PluginsPage.jsx', 'src/components/DownloadButtons.jsx', 'src/components/BuyButton.jsx', 'src/data/plugins.js', 'scripts/prerender.js']) {
    const text = await readSrc(f);
    for (const stale of ['October 1', 'October 5', 'Available October', 'out October', 'Out October', 'familyLive', 'useFamilyLive', 'FAMILY_STARTS_AT', 'isFamilyLive', 'RELEASE2_LABEL', 'RELEASE_LABEL', 'All 1,000 free downloads', 'After the first 1,000', 'Free for the first 1,000']) {
      assert.equal(text.includes(stale), false, `${f} still has "${stale}"`);
    }
  }
  const preview = await readSrc('preview/tester-preview.jsx');
  assert.equal(/macOS may ask|Privacy & Security/.test(preview), false);
  for (const f of ['src/components/tester/TesterSpace.jsx', 'src/data/learnContent.js']) assert.equal(/macOS may ask|signed for testing only/.test(await readSrc(f)), false, f);
});

// ---- Invites and admin agent keys (owner 31 Oct) -------------------------------------------------------------------------
const { hashAgentKey } = await import(pathToFileURL(resolve(root, 'api/agents.js')).href);
const AGENT_KEY = 'svla_test-agent-key-0123456789abcdef';
const seedAgent = (revoked = false) => state.db.docs.set(`catalog_agents/${hashAgentKey(AGENT_KEY)}`, { label: 'claude-test', createdAt: '2026-10-31T12:00:00Z', lastUsedAt: null, revokedAt: revoked ? '2026-10-31T13:00:00Z' : null });
const bodyOf = (r) => (typeof r.body === 'string' ? JSON.parse(r.body) : r.body);
const asAgent = (method, path, body, key = AGENT_KEY) => call(path, { method, headers: { ...headersFor(nextIp()), authorization: `Bearer ${key}` }, body: body === undefined ? undefined : JSON.stringify(body) });
const INVITE = { email: 'guest@example.com', os: 'Windows 11', daws: ['FL Studio'], agreementVersion: '1.1', acceptedAt: '2026-10-30T10:00:00.000Z', production: 'trap beats' };
await test('invite: an admin takes a tester on without an application; the record, the seat and the agreement are the same as an approval', async () => {
  resetDb();
  const bad = await as('owner', 'POST', '/api/admin/testers/invite', { ...INVITE, acceptedAt: '' });
  assert.equal(bad.response.status, 400);
  const r = await as('owner', 'POST', '/api/admin/testers/invite', INVITE);
  assert.equal(r.response.status, 200, JSON.stringify(r.body)); const out = bodyOf(r);
  assert.equal(out.result, 'approved'); assert.equal(out.invited, true);
  const app = state.db.docs.get('tester_applications/guest@example.com');
  assert.equal(app.source, 'invite'); assert.equal(app.os, 'Windows 11'); assert.deepEqual(app.daws, ['FL Studio']); assert.equal(app.status, 'approved');
  const rec = state.db.docs.get('launch2_testers/guest@example.com');
  assert.equal(rec.status, 'active'); assert.equal(rec.agreementVersion, '1.1'); assert.equal(rec.production, 'trap beats');
  assert.equal(state.db.docs.get('launch2/testers').approved, 1);
  const again = bodyOf(await as('owner', 'POST', '/api/admin/testers/invite', INVITE));
  assert.equal(again.result, 'already-approved'); assert.equal(again.invited, false);
  assert.equal((await as('user1', 'POST', '/api/admin/testers/invite', INVITE)).response.status, 403, 'not for a plain account');
  assert.equal((await as(null, 'POST', '/api/admin/testers/invite', INVITE)).response.status, 401);
});
await test('agent key: lists, invites and decides like an admin; a revoked or unknown key is 401; keys are made by humans only', async () => {
  resetDb(); seedAgent();
  assert.equal((await asAgent('GET', '/api/admin/testers')).response.status, 200);
  const inv = await asAgent('POST', '/api/admin/testers/invite', { ...INVITE, email: 'bot-guest@example.com' });
  assert.equal(inv.response.status, 200, JSON.stringify(inv.body));
  assert.equal(state.db.docs.get('tester_applications/bot-guest@example.com').invitedBy, 'agent:claude-test');
  assert.equal((await asAgent('POST', '/api/admin/testers/decide', { email: 'bot-guest@example.com', decision: 'end' })).response.status, 200);
  assert.equal(state.db.docs.get('launch2_testers/bot-guest@example.com').status, 'ended');
  assert.ok(state.db.docs.get(`catalog_agents/${hashAgentKey(AGENT_KEY)}`).lastUsedAt, 'use is stamped');
  assert.equal((await asAgent('POST', '/api/admin/catalog/agents', { label: 'another' })).response.status, 403, 'an agent cannot make keys');
  assert.equal((await asAgent('GET', '/api/admin/catalog/agents')).response.status, 403);
  assert.equal((await asAgent('GET', '/api/admin/testers', undefined, 'svla_unknown-key-00000000000000')).response.status, 401);
  seedAgent(true);
  assert.equal((await asAgent('GET', '/api/admin/testers')).response.status, 401, 'revoked');
  assert.equal((await asAgent('POST', '/api/testers/apply', GOOD)).response.status, 401, 'an agent key is not a tester sign-in');
});
await test('agent key: makes, lists and revokes through the admin routes as a signed-in admin', async () => {
  resetDb();
  const made = await as('owner', 'POST', '/api/admin/catalog/agents', { label: 'claude-packs' });
  assert.equal(made.response.status, 200, JSON.stringify(made.body)); const key = bodyOf(made).key;
  assert.ok(key.startsWith('svla_'));
  const list = bodyOf(await as('owner', 'GET', '/api/admin/catalog/agents')).agents;
  assert.equal(list.length, 1); assert.equal(list[0].label, 'claude-packs'); assert.equal(list[0].key, undefined, 'the key is not listed');
  assert.equal((await asAgent('GET', '/api/admin/testers', undefined, key)).response.status, 200, 'the new key works');
  assert.equal((await as('owner', 'POST', '/api/admin/catalog/agents/revoke', { id: list[0].id })).response.status, 200);
  assert.equal((await asAgent('GET', '/api/admin/testers', undefined, key)).response.status, 401, 'and stops when revoked');
  assert.equal((await as('user1', 'POST', '/api/admin/catalog/agents', { label: 'x' })).response.status, 403);
});

const failed = results.filter((result) => !result.ok);
console.log(`SUMMARY ${results.length} cases, ${failed.length} fail`);
process.exitCode = failed.length ? 1 : 0;
