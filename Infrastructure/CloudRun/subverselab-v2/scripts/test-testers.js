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
    get: async () => snap(path),
    set: async (data, options) => docs.set(path, options?.merge ? merge(docs.get(path), data) : clone(data)),
    delete: async () => docs.delete(path),
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
  let queue = Promise.resolve();
  return {
    docs,
    collection: (name) => ({ doc: (id = `auto${++autoId}`) => ref(`${name}/${id}`), ...query(name) }),
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
  return { uid, email: uid === 'owner' ? 'info@subverselab.com' : `${uid}@Example.com`, email_verified: !uid.startsWith('unv-') };
} };
state.FieldValue = { serverTimestamp: () => '<server-time>' };
globalThis.__testersTestAdminApp = { initializeApp() {}, applicationDefault() {}, getApps: () => [] };
globalThis.__testersTestAdminFirestore = { getFirestore: () => state.db, FieldValue: state.FieldValue };
globalThis.__testersTestAdminAuth = { getAuth: () => state.auth };
globalThis.__testersTestStorage = { Storage: class { constructor() { return state.storage; } } };

const serverSource = await readFile(resolve(root, 'server.js'), 'utf8');
const launchUrl = pathToFileURL(resolve(root, 'launchLicence.js')).href;
const transformed = serverSource
  .replace("import express from 'express';", `import express from '${pathToFileURL(require.resolve('express')).href}';`)
  .replace("import compression from 'compression';", `import compression from '${pathToFileURL(require.resolve('compression')).href}';`)
  .replace("const __dirname = dirname(fileURLToPath(import.meta.url));", `const __dirname = ${JSON.stringify(root)};`)
  .replace("import { createLaunchService, tokenBucket } from './launchLicence.js';", `import { createLaunchService, tokenBucket } from '${launchUrl}';`)
  .replace('const app = express();', 'export const app = express();')
  .replace("await import('firebase-admin/app')", 'await Promise.resolve(globalThis.__testersTestAdminApp)')
  .replace("await import('firebase-admin/firestore')", 'await Promise.resolve(globalThis.__testersTestAdminFirestore)')
  .replace("await import('firebase-admin/auth')", 'await Promise.resolve(globalThis.__testersTestAdminAuth)')
  .replace("import('@google-cloud/storage')", 'Promise.resolve(globalThis.__testersTestStorage)')
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
const decide = (uid, email, decision) => as(uid, 'POST', '/api/admin/testers/decide', { email, decision });
const ticket = (uid, slug = 'koro') => as(uid, 'POST', '/api/download/ticket', { slug, platform: 'mac', launchId: 'launch2' });
const approve = async (uid) => { await apply(uid); return decide('owner', `${uid}@example.com`, 'approve'); };
const claimed = () => state.db.docs.get('launch2/counter').claimed;

await test('apply validation: bad OS, short answer, unverified e-mail, bad DAW/format/link/years', async () => {
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
  assert.equal((await apply('unv-bob')).response.status, 403);
  assert.equal((await apply(undefined)).response.status, 401);
  assert.equal(state.db.docs.has('tester_applications/unv-bob@example.com'), false);
  assert.equal(state.db.docs.has('tester_applications/a1@example.com'), false);
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
  for (const slug of ['koro', 'yanki', 'hava', 'mihenk']) {
    const t = await ticket('erin', slug);
    assert.equal(t.response.status, 200, slug);
    assert.ok(t.body.url);
  }
  assert.equal((await ticket('frank')).response.status, 402, 'someone who neither paid nor was approved');
  assert.equal((await apply('gina')).response.status, 200);
  assert.equal((await ticket('gina')).response.status, 402, 'a pending application opens nothing');
  const doc = state.db.docs.get('launch2_testers/erin@example.com');
  assert.equal(doc.os, 'macOS Apple Silicon');
  assert.deepEqual(doc.daws, ['Ableton Live', 'Other']);
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
  for (const patch of [{ plugin: 'kubbe' }, { os: 'BeOS' }, { daw: '' }, { kind: 'rant' }, { text: 'short' }]) {
    assert.equal((await report('sam', patch)).response.status, 400, JSON.stringify(patch));
  }
  assert.equal((await report('sam', { text: 'z'.repeat(9000) })).response.status, 200);
  const stored = [...state.db.docs].find(([k]) => k.startsWith('tester_reports/'))[1];
  assert.equal(stored.text.length, 4000);
  assert.equal(stored.email, 'sam@example.com');
  assert.ok(stored.at);
  await new Promise((r) => setTimeout(r, 5));
  assert.equal((await report('sam', { plugin: 'koro', kind: 'works', text: 'Runs fine in Live 12 on the M2 mini.' })).response.status, 200);
  const list = await as('owner', 'GET', '/api/admin/testers/reports');
  assert.equal(list.response.status, 200);
  assert.deepEqual(list.body.reports.map((r) => r.plugin), ['koro', 'hava']);
  for (let i = 2; i < 50; i++) assert.equal((await report('sam')).response.status, 200, `report ${i + 1}`);
  const over = await report('sam');
  assert.equal(over.response.status, 429);
  assert.equal([...state.db.docs.keys()].filter((k) => k.startsWith('tester_reports/')).length, 50);
});

await test('seats endpoint starts at zero approved', async () => {
  resetDb();
  const seats = await call('/api/testers/seats', { headers: { 'x-forwarded-for': nextIp() } });
  assert.deepEqual(seats.body, { total: 100, approved: 0 });
});

const failed = results.filter((result) => !result.ok);
console.log(`SUMMARY ${results.length} cases, ${failed.length} fail`);
process.exitCode = failed.length ? 1 : 0;
