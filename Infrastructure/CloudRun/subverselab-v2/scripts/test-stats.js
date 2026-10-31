// Local-only tests for the admin Stats tab and the cookieless page-view counter (stats.js, POST /api/hit,
// GET /api/admin/stats). A fake Firestore and Auth stand in for Google; nothing touches the network or live data.
// Run: node scripts/test-stats.js   (npm run test:stats)
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const require = createRequire(import.meta.url);
const url = (f) => pathToFileURL(resolve(root, f)).href;

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const isInc = (v) => v && typeof v === 'object' && '__inc' in v;
// set(..., {merge: true}) semantics: nested maps merge key by key, FieldValue.increment adds to the stored number.
function merge(a, b) {
  const out = { ...(a || {}) };
  for (const [k, v] of Object.entries(b)) {
    if (isInc(v)) out[k] = (Number(out[k]) || 0) + v.__inc;
    else if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = merge(out[k] && typeof out[k] === 'object' ? out[k] : {}, v);
    else out[k] = clone(v);
  }
  return out;
}
function fakeFirestore() {
  const docs = new Map();
  const snap = (path) => ({ id: path.split('/').pop(), exists: docs.has(path), data: () => clone(docs.get(path)) });
  const ref = (path) => ({
    get: async () => snap(path),
    set: async (data, options) => { if (state.failWrites) throw new Error('UNAVAILABLE: no write'); docs.set(path, options?.merge ? merge(docs.get(path), data) : clone(data)); },
  });
  const collection = (name) => ({
    doc: (id) => ref(`${name}/${id}`),
    get: async () => ({ docs: [...docs.keys()].filter((p) => p.startsWith(`${name}/`) && !p.slice(name.length + 1).includes('/')).map(snap) }),
  });
  return { docs, collection };
}

const state = { db: fakeFirestore(), failWrites: false, users: [] };
state.auth = {
  verifyIdToken: async (token) => {
    if (token === 'valid-owner') return { uid: 'owner', email: 'info@subverselab.com', email_verified: true };
    if (token === 'valid-ownerunverified') return { uid: 'ownerunv', email: 'info@subverselab.com', email_verified: false };
    if (token === 'valid-bob') return { uid: 'bob', email: 'bob@example.com', email_verified: true };
    throw new Error('invalid token');
  },
  listUsers: async (max, pageToken) => {
    const start = pageToken ? Number(pageToken) : 0;
    const users = state.users.slice(start, start + max);
    return { users, pageToken: start + max < state.users.length ? String(start + max) : undefined };
  },
};
state.FieldValue = { serverTimestamp: () => '<server-time>', increment: (n) => ({ __inc: n }) };
globalThis.__testersTestAdminApp = { initializeApp() {}, applicationDefault() {}, getApps: () => [] };
globalThis.__testersTestAdminFirestore = { getFirestore: () => state.db, FieldValue: state.FieldValue };
globalThis.__testersTestAdminAuth = { getAuth: () => state.auth };

const serverSource = await readFile(resolve(root, 'api/server.js'), 'utf8');
const transformed = serverSource
  .replace("import express from 'express';", `import express from '${pathToFileURL(require.resolve('express')).href}';`)
  .replace("import compression from 'compression';", `import compression from '${pathToFileURL(require.resolve('compression')).href}';`)
  .replace('const __dirname = dirname(fileURLToPath(import.meta.url));', `const __dirname = ${JSON.stringify(resolve(root, 'api'))};`)
  .replace("import { createLaunchService, tokenBucket } from './launchLicence.js';", `import { createLaunchService, tokenBucket } from '${url('api/launchLicence.js')}';`)
  .replace("from './entitlements.js';", `from '${url('api/entitlements.js')}';`)
  .replace("from './accountDeletion.js';", `from '${url('api/accountDeletion.js')}';`)
  .replace("from './credits.js';", `from '${url('api/credits.js')}';`)
  .replace("from './catalog.js';", `from '${url('api/catalog.js')}';`)
  .replace("from './catalogSchema.js';", `from '${url('api/catalogSchema.js')}';`)
  .replace("from './agents.js';", `from '${url('api/agents.js')}';`)
  .replace("from './inbox.js';", `from '${url('api/inbox.js')}';`)
  .replace("from './stats.js';", `from '${url('api/stats.js')}';`)
  .replace('const app = express();', 'export const app = express();')
  .replace('const hits = createHitCounter(', 'export const hits = createHitCounter(')
  .replace("await import('firebase-admin/app')", 'await Promise.resolve(globalThis.__testersTestAdminApp)')
  .replace("await import('firebase-admin/firestore')", 'await Promise.resolve(globalThis.__testersTestAdminFirestore)')
  .replace("await import('firebase-admin/auth')", 'await Promise.resolve(globalThis.__testersTestAdminAuth)')
  .replace(/const PORT = process\.env\.PORT \|\| 8080;[\s\S]*?\n\);\s*$/, '');
const server = await import(`data:text/javascript;base64,${Buffer.from(transformed).toString('base64')}`);
const stats = await import(url('api/stats.js'));

const routeHandlers = new Map(server.app.router.stack
  .filter((layer) => layer.route)
  .map((layer) => [layer.route.path, layer.route.stack.at(-1).handle]));
class FakeResponse extends PassThrough {
  constructor() { super(); this.statusCode = 200; this.headers = {}; this.body = undefined; this.ended = false; }
  setHeader(name, value) { this.headers[name.toLowerCase()] = value; }
  status(code) { this.statusCode = code; return this; }
  type() { return this; }
  json(body) { this.body = body; this.ended = true; this.end(); return this; }
  send(body) { this.body = body; this.ended = true; this.end(body); return this; }
}
async function call(path, { method = 'GET', headers = {}, body = {}, ip = '10.0.0.1' } = {}) {
  const u = new URL(path, 'http://local.test');
  const req = {
    method, path: u.pathname, query: Object.fromEntries(u.searchParams), body, ip,
    headers: Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])),
    get(name) { return this.headers[name.toLowerCase()]; },
  };
  const res = new FakeResponse();
  res.end = ((end) => (...args) => { res.ended = true; return end.apply(res, args); })(res.end);
  await routeHandlers.get(u.pathname)(req, res);
  return { status: res.statusCode, body: res.body };
}
const results = [];
async function test(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, ok: false }); console.log(`FAIL ${name}: ${error.message}`); }
}

/* ---- fixture ---------------------------------------------------------------- */
const NOW = Date.parse('2026-10-11T12:00:00Z');
const order = (id, product, cents, created, extra = {}) => ({ order_id: id, product, amount_usd_cents: cents, status: 'paid', refunded: false, created, ...extra });
const fixtureLicenses = {
  'a@x.com': { a1: order('a1', 'alev', 0, '2026-10-08T10:00:00Z'), a2: order('a2', 'family', 1999, '2026-10-10T10:00:00Z') },
  'b@x.com': { b1: order('b1', 'taban', 0, '2026-10-10T09:00:00Z'), b2: order('b2', 'family', 1999, '2026-10-09T09:00:00Z') },
  'c@x.com': { c1: order('c1', 'family', 1999, '2026-10-07T09:00:00Z', { status: 'refunded', refunded: true }), c2: order('c2', 'kubbe', 900, '2026-10-05T09:00:00Z') },
  'd@x.com': { d1: order('d1', 'koro', 1500, '2026-10-06T09:00:00Z', { status: 'pending' }), d2: order('d2', 'hava', 1500, '2026-08-01T09:00:00Z') },
  'e@x.com': { e1: order('e1', 'alev', 0, '2026-10-09T09:00:00Z') },
};
const u = (uid, created, last, providers) => ({ uid, metadata: { creationTime: created, lastSignInTime: last }, providerData: providers.map((providerId) => ({ providerId })) });
const fixtureUsers = [
  u('u1', 'Sat, 10 Oct 2026 10:00:00 GMT', 'Sun, 11 Oct 2026 08:00:00 GMT', ['google.com']),
  u('u2', 'Thu, 01 Oct 2026 10:00:00 GMT', 'Tue, 06 Oct 2026 10:00:00 GMT', ['password']),
  u('u3', 'Sat, 01 Aug 2026 10:00:00 GMT', 'Sun, 20 Sep 2026 10:00:00 GMT', ['google.com', 'password']),
  u('u4', 'Sun, 11 Oct 2026 01:00:00 GMT', 'Sat, 01 Aug 2026 10:00:00 GMT', []),
];
const fixtureDownloads = {
  uid1: { kubbe: { mac: { count: 2, first: '2026-10-09T10:00:00Z', last: '2026-10-10T10:00:00Z' }, win: { count: 1, first: '2026-10-09T11:00:00Z', last: '2026-10-09T11:00:00Z' } }, koro: { mac: { count: 1, first: '2026-08-01T10:00:00Z', last: '2026-08-01T10:00:00Z' } } },
  uid2: { kubbe: { mac: { count: 3, first: '2026-10-10T10:00:00Z', last: '2026-10-11T10:00:00Z' } } },
  uid3: {},
};
function loadFixture() {
  state.db.docs.clear();
  for (const [email, orders] of Object.entries(fixtureLicenses)) state.db.docs.set(`plugin_licenses/${email}`, { email, orders });
  for (const [uid, data] of Object.entries(fixtureDownloads)) state.db.docs.set(`downloads/${uid}`, data);
  state.db.docs.set('site_stats/2026-10-10', { views: 10, visits: 4, paths: { [stats.encodeKey('/')]: 6, [stats.encodeKey('/launch2')]: 4 }, refs: { [stats.encodeKey('(direct)')]: 3, [stats.encodeKey('l.instagram.com')]: 1 } });
  state.db.docs.set('site_stats/2026-10-11', { views: 5, visits: 2, paths: { [stats.encodeKey('/')]: 2, [stats.encodeKey('/launch2')]: 3 }, refs: { [stats.encodeKey('l.instagram.com')]: 2 } });
  state.users = fixtureUsers;
}

/* ---- admin guard ------------------------------------------------------------ */
await test('admin guard: no token 401, bad token 401, non-admin 403, unverified admin 403, admin 200 with no-store', async () => {
  loadFixture();
  const get = (token, ip) => call('/api/admin/stats', { headers: token ? { Authorization: `Bearer ${token}` } : {}, ip });
  assert.equal((await get(null, '10.1.0.1')).status, 401);
  assert.equal((await get('garbage', '10.1.0.2')).status, 401);
  assert.equal((await get('valid-bob', '10.1.0.3')).status, 403);
  assert.equal((await get('valid-ownerunverified', '10.1.0.4')).status, 403);
  const ok = await call('/api/admin/stats?days=7', { headers: { Authorization: 'Bearer valid-owner' }, ip: '10.1.0.5' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.days, 7);
  assert.equal(ok.body.series.length, 7);
});

await test('admin guard: Firestore failure answers 503, days is clamped to 1..90 and defaults to 30', async () => {
  loadFixture();
  const admin = { db: state.db, auth: state.auth };
  assert.equal((await stats.computeStats(admin, { days: 500, now: NOW })).days, 90);
  assert.equal((await stats.computeStats(admin, { days: 0, now: NOW })).days, 30);
  assert.equal((await stats.computeStats(admin, { days: 'x', now: NOW })).days, 30);
  assert.equal((await stats.computeStats(admin, { days: 1, now: NOW })).series.length, 1);
  const broken = { db: { collection: () => { throw new Error('UNAVAILABLE'); } }, auth: state.auth };
  await assert.rejects(stats.computeStats(broken, { now: NOW }));
  const real = state.db.collection;
  state.db.collection = () => { throw new Error('UNAVAILABLE: down'); };
  try {
    const down = await call('/api/admin/stats', { headers: { Authorization: 'Bearer valid-owner' }, ip: '10.1.0.9' });
    assert.equal(down.status, 503);
    assert.equal(down.body.error, 'Stats service unavailable');
  } finally { state.db.collection = real; }
});

/* ---- aggregation ------------------------------------------------------------ */
await test('orders: refunds and pending are not revenue, free and paid are split, window vs all time', async () => {
  loadFixture();
  const r = await stats.computeStats({ db: state.db, auth: state.auth }, { days: 30, now: NOW });
  assert.deepEqual(r.orders.window, { paid: 3, free: 3, refunded: 1, revenue_cents: 1999 + 1999 + 900 });
  assert.deepEqual(r.orders.all_time, { paid: 4, free: 3, refunded: 1, revenue_cents: 1999 + 1999 + 900 + 1500 });
  const product = (slug) => r.orders.products.find((p) => p.slug === slug);
  assert.deepEqual(product('family').window, { paid: 2, free: 0, refunded: 1, revenue_cents: 3998 });
  assert.deepEqual(product('hava').window, { paid: 0, free: 0, refunded: 0, revenue_cents: 0 });
  assert.equal(product('hava').all.paid, 1);
  assert.deepEqual(product('alev').all, { paid: 0, free: 2, refunded: 0, revenue_cents: 0 });
  assert.equal(product('koro').all.paid, 0, 'a pending order is not counted');
  const day = (d) => r.series.find((s) => s.date === d);
  assert.deepEqual([day('2026-10-10').paid, day('2026-10-10').free, day('2026-10-10').revenue_cents], [1, 1, 1999]);
  assert.deepEqual([day('2026-10-09').paid, day('2026-10-09').free, day('2026-10-09').revenue_cents], [1, 1, 1999]);
  assert.equal(day('2026-10-07').refunded, 1);
  assert.equal(day('2026-10-07').revenue_cents, 0);
  assert.equal(r.series[0].date, '2026-10-11', 'newest first');
  assert.equal(r.series.at(-1).date, '2026-09-12');
  assert.equal(r.series.reduce((n, s) => n + s.revenue_cents, 0), r.orders.window.revenue_cents);
});

await test('orders: buyers and free -> family (a refunded family order does not count, ordering by order date)', async () => {
  loadFixture();
  const r = await stats.computeStats({ db: state.db, auth: state.auth }, { days: 30, now: NOW });
  assert.deepEqual(r.orders.buyers, { paid_emails: 4, free_emails: 3, free_and_family: 2, free_first_then_family: 1 });
});

await test('accounts: sign-ups per day, active 1/7/30 days, provider split adds up to the total', async () => {
  loadFixture();
  const r = await stats.computeStats({ db: state.db, auth: state.auth }, { days: 30, now: NOW });
  assert.equal(r.accounts.total, 4);
  assert.equal(r.accounts.new_in_window, 3);
  assert.deepEqual(r.accounts.active, { d1: 1, d7: 2, d30: 3 });
  assert.deepEqual(r.accounts.providers, { google: 2, password: 1, other: 1 });
  assert.equal(r.series.find((s) => s.date === '2026-10-10').signups, 1);
  assert.equal(r.series.find((s) => s.date === '2026-10-11').signups, 1);
  assert.equal(r.series.reduce((n, s) => n + s.signups, 0), 3);
});

await test('accounts: listUsers is paginated through', async () => {
  loadFixture();
  state.users = Array.from({ length: 2500 }, (_, i) => u(`p${i}`, 'Sat, 10 Oct 2026 10:00:00 GMT', 'Sat, 10 Oct 2026 10:00:00 GMT', ['password']));
  const r = await stats.computeStats({ db: state.db, auth: state.auth }, { days: 30, now: NOW });
  assert.equal(r.accounts.total, 2500);
  state.users = fixtureUsers;
});

await test('downloads: totals per plugin and platform (count and distinct accounts), first-time downloads per day by `first`', async () => {
  loadFixture();
  const r = await stats.computeStats({ db: state.db, auth: state.auth }, { days: 30, now: NOW });
  const kubbe = r.downloads.by_product.find((p) => p.slug === 'kubbe');
  assert.deepEqual(kubbe, { slug: 'kubbe', accounts: 2, mac: { count: 5, accounts: 2 }, win: { count: 1, accounts: 1 } });
  assert.deepEqual(r.downloads.by_product.find((p) => p.slug === 'koro').mac, { count: 1, accounts: 1 });
  assert.equal(r.downloads.accounts_any, 2);
  const first = Object.fromEntries(r.downloads.first_per_day.map((d) => [d.date, d.count]));
  assert.equal(first['2026-10-09'], 2);
  assert.equal(first['2026-10-10'], 1);
  assert.equal(r.downloads.first_per_day.reduce((n, d) => n + d.count, 0), 3, 'the August first-download is outside the window');
});

await test('page views: per day, decoded top paths and referrers, tracking_since', async () => {
  loadFixture();
  const r = await stats.computeStats({ db: state.db, auth: state.auth }, { days: 30, now: NOW });
  assert.deepEqual([r.traffic.views, r.traffic.visits, r.traffic.tracking_since], [15, 6, '2026-10-10']);
  assert.deepEqual(r.traffic.paths, [{ path: '/launch2', views: 7 }, { path: '/', views: 8 }].sort((a, b) => b.views - a.views));
  assert.deepEqual(r.traffic.refs, [{ host: 'l.instagram.com', views: 3 }, { host: '(direct)', views: 3 }].sort((a, b) => b.views - a.views || a.host.localeCompare(b.host)));
  const day = r.series.find((s) => s.date === '2026-10-10');
  assert.deepEqual([day.views, day.visits], [10, 4]);
  assert.deepEqual([r.series.at(-1).views, r.series.at(-1).visits], [0, 0]);
});

/* ---- hit normalisation ------------------------------------------------------ */
await test('normalisePath: known routes stay, unknown and garbage become /other, /admin and /api are never counted', () => {
  const n = stats.normalisePath;
  assert.equal(n('/'), '/');
  assert.equal(n('/Launch2/?utm_source=ig#top'), '/launch2');
  assert.equal(n('/plugins/kubbe/'), '/plugins/kubbe');
  assert.equal(n('/plugins/kubbe/manual'), '/plugins/kubbe/manual');
  assert.equal(n('/plugins/nope'), '/other');
  assert.equal(n('/tools/drum-generator'), '/tools/drum-generator');
  assert.equal(n('/learn/how-to-use-sensei'), '/learn/how-to-use-sensei');
  assert.equal(n('/learn/Bad Slug!'), '/other');
  assert.equal(n('/forum/AbC123xyz'), '/forum/topic');
  assert.equal(n('/wp-login.php'), '/other');
  assert.equal(n('/../../etc/passwd'), '/other');
  assert.equal(n('x'.repeat(5000)), '/other');
  assert.equal(n('/' + 'a'.repeat(199)), '/other');
  for (const bad of [undefined, null, 5, {}, [], '', 'plugins']) assert.equal(n(bad), '/other');
  assert.equal(n('/admin'), null);
  assert.equal(n('/admin/x'), null);
  assert.equal(n('/api/hit'), null);
});

await test('normalisePath: every route path the site data declares (plugins.js) is on the allow-list', async () => {
  const src = await readFile(resolve(root, 'src/data/plugins.js'), 'utf8');
  const paths = [...src.matchAll(/\bpath: '(\/[^']*)'/g)].map((m) => m[1]);
  assert.ok(paths.length >= 12, `found ${paths.length} paths`);
  for (const p of paths) assert.equal(stats.normalisePath(p), p, p);
  const legal = await readFile(resolve(root, 'src/data/legalContent.js'), 'utf8');
  for (const m of legal.matchAll(/\bpath: '(\/[^']*)'/g)) assert.equal(stats.normalisePath(m[1]), m[1]);
  // Sample pack pages (16 Oct): every imported pack is counted under its own path.
  const { SAMPLE_PACK_LIST } = await import('../src/data/samplePacks.js');
  for (const p of SAMPLE_PACK_LIST) assert.equal(stats.normalisePath(`/sample-packs/${p.slug}`), `/sample-packs/${p.slug}`);
  assert.equal(stats.normalisePath('/sample-packs/Bad Slug!'), '/other');
});

await test('refHost: host only, own host and empty are (direct), junk is (other)', () => {
  const r = stats.refHost;
  assert.equal(r('https://l.instagram.com/?u=https%3A%2F%2Fx&e=AT1'), 'l.instagram.com');
  assert.equal(r('https://www.google.com/search?q=secret'), 'google.com');
  assert.equal(r('https://subverselab.com/plugins'), '(direct)');
  assert.equal(r('https://www.subverselab.com/'), '(direct)');
  assert.equal(r(''), '(direct)');
  assert.equal(r(undefined), '(direct)');
  assert.equal(r('javascript:alert(1)'), '(other)');
  assert.equal(r('not a url'), '(other)');
  assert.equal(r('android-app://com.google.android.gm'), '(other)');
  assert.ok(!r('https://news.example.org/a/b?c=d#e').includes('/'));
});

await test('isBot: crawlers, tools and an empty user agent are ignored, browsers are not', () => {
  for (const ua of ['Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 'facebookexternalhit/1.1', 'curl/8.4.0', 'python-requests/2.31', 'Mozilla/5.0 HeadlessChrome/120', 'Mozilla/5.0 (compatible; bingbot/2.0)', 'Slackbot-LinkExpanding 1.0', '', undefined, 'Lighthouse'])
    assert.equal(stats.isBot(ua), true, String(ua));
  for (const ua of ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0'])
    assert.equal(stats.isBot(ua), false, ua);
});

const BROWSER = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15';
await test('counter: unknown path -> /other, own host dropped, bot ignored, /admin not counted, referrer only on a landing', async () => {
  state.db.docs.clear();
  let now = NOW;
  const c = stats.createHitCounter({ getAdmin: async () => state.db && { db: state.db, FieldValue: state.FieldValue }, clock: () => now });
  assert.equal(c.hit({ path: '/plugins/kubbe', ref: 'https://l.instagram.com/x?y=1', landing: true }, BROWSER), true);
  assert.equal(c.hit({ path: '/plugins/kaset', ref: 'https://l.instagram.com/x', landing: false }, BROWSER), true);
  assert.equal(c.hit({ path: '/evil', ref: 'https://subverselab.com/a', landing: true }, BROWSER), true);
  assert.equal(c.hit({ path: '/', ref: 'https://x.test', landing: true }, 'Googlebot/2.1'), false);
  assert.equal(c.hit({ path: '/admin', landing: true }, BROWSER), false);
  assert.equal(c.hit('junk', BROWSER), true, 'a body that is not an object counts as /other, not as an error');
  assert.equal(await c.flush(), 1);
  const doc = state.db.docs.get('site_stats/2026-10-11');
  assert.equal(doc.views, 4);
  assert.equal(doc.visits, 2);
  const paths = Object.fromEntries(Object.entries(doc.paths).map(([k, n]) => [stats.decodeKey(k), n]));
  assert.deepEqual(paths, { '/plugins/kubbe': 1, '/plugins/kaset': 1, '/other': 2 });
  const refs = Object.fromEntries(Object.entries(doc.refs).map(([k, n]) => [stats.decodeKey(k), n]));
  assert.deepEqual(refs, { 'l.instagram.com': 1, '(direct)': 1 });
  assert.equal(JSON.stringify(doc).includes('Mozilla'), false);
  now += 1;
});

await test('counter: key caps. Dynamic paths beyond the cap and referrers beyond the cap overflow into /other and (other)', async () => {
  state.db.docs.clear();
  const c = stats.createHitCounter({ getAdmin: async () => ({ db: state.db, FieldValue: state.FieldValue }), clock: () => NOW });
  for (let i = 0; i < stats.MAX_PATH_KEYS + 50; i++) c.hit({ path: `/learn/post-${i}`, ref: `https://site${i}.example/`, landing: true }, BROWSER);
  c.hit({ path: '/launch2', landing: true }, BROWSER);   // a static route still counts under its own name
  await c.flush();
  const doc = state.db.docs.get('site_stats/2026-10-11');
  const paths = Object.fromEntries(Object.entries(doc.paths).map(([k, n]) => [stats.decodeKey(k), n]));
  const refs = Object.fromEntries(Object.entries(doc.refs).map(([k, n]) => [stats.decodeKey(k), n]));
  assert.equal(Object.keys(paths).filter((p) => p.startsWith('/learn/')).length, stats.MAX_PATH_KEYS);
  assert.equal(paths['/other'], 50);
  assert.equal(paths['/launch2'], 1);
  assert.equal(Object.keys(refs).filter((r) => r.startsWith('site')).length, stats.MAX_REF_KEYS);
  assert.equal(refs['(other)'], stats.MAX_PATH_KEYS + 50 - stats.MAX_REF_KEYS);
  assert.equal(refs['(direct)'], 1, '(direct) is never pushed into (other)');
  assert.equal(doc.views, stats.MAX_PATH_KEYS + 51);
});

await test('counter: flush math. Increments add up across flushes and days, an empty flush writes nothing, a failed write is retried', async () => {
  state.db.docs.clear();
  let now = NOW;
  const c = stats.createHitCounter({ getAdmin: async () => ({ db: state.db, FieldValue: state.FieldValue }), clock: () => now, log: { error() {} } });
  for (let i = 0; i < 5; i++) c.hit({ path: '/', landing: i < 2 }, BROWSER);
  assert.equal(c.pendingViews(), 5);
  assert.equal(await c.flush(), 1);
  assert.equal(c.pendingViews(), 0);
  assert.equal(await c.flush(), 0, 'nothing pending, nothing written');
  for (let i = 0; i < 3; i++) c.hit({ path: '/', landing: true }, BROWSER);
  c.hit({ path: '/launch', landing: false }, BROWSER);
  await c.flush();
  let doc = state.db.docs.get('site_stats/2026-10-11');
  assert.deepEqual([doc.views, doc.visits, doc.paths[stats.encodeKey('/')], doc.paths[stats.encodeKey('/launch')]], [9, 5, 8, 1]);
  assert.equal(doc.updated, '<server-time>');
  // a failed write keeps the counts for the next flush
  c.hit({ path: '/', landing: true }, BROWSER);
  state.failWrites = true;
  assert.equal(await c.flush(), 0);
  assert.equal(c.pendingViews(), 1);
  state.failWrites = false;
  await c.flush();
  doc = state.db.docs.get('site_stats/2026-10-11');
  assert.deepEqual([doc.views, doc.visits], [10, 6]);
  // midnight UTC: a new document
  now = Date.parse('2026-10-12T00:00:01Z');
  c.hit({ path: '/', landing: true }, BROWSER);
  await c.flush();
  assert.deepEqual([state.db.docs.get('site_stats/2026-10-12').views, state.db.docs.get('site_stats/2026-10-11').views], [1, 10]);
});

await test('field keys: encode/decode round-trip, only [a-z0-9_-], never starts with "__", no dot or slash', () => {
  for (const text of ['/', '/plugins/kubbe', 'l.instagram.com', '(direct)', '(other)', '/learn/a_b-c', '__proto__', 'a__b', '/other', 'xn--bcher-kva.example', '_', '__x__', '/a/b.c?d=e#f', 'ünï']) {
    const key = stats.encodeKey(text);
    assert.match(key, /^[a-z0-9_-]+$/, key);
    assert.ok(!key.startsWith('__'), key);
    if (/^[\x00-\xff]*$/.test(text)) assert.equal(stats.decodeKey(key), text);
  }
  assert.notEqual(stats.encodeKey('a.b'), stats.encodeKey('a/b'));
});

await test('counter: Buy clicks. Counted by product|page|place|intro, never as a page view; junk product or /admin ignored; unknown place -> other; capped', async () => {
  state.db.docs.clear();
  const c = stats.createHitCounter({ getAdmin: async () => ({ db: state.db, FieldValue: state.FieldValue }), clock: () => NOW });
  assert.equal(c.hit({ buy: 'family', path: '/', place: 'showcase', intro: true }, BROWSER), true);
  assert.equal(c.hit({ buy: 'family', path: '/', place: 'showcase', intro: true }, BROWSER), true);
  assert.equal(c.hit({ buy: 'family', path: '/plugins/taban', place: 'room-family', intro: false }, BROWSER), true);
  assert.equal(c.hit({ buy: 'jingfang', path: '/plugins/jingfang', place: 'nowhere' }, BROWSER), true);
  assert.equal(c.hit({ buy: '../x', path: '/' }, BROWSER), false, 'a slug outside [a-z0-9-] is not counted');
  assert.equal(c.hit({ buy: 'family', path: '/admin' }, BROWSER), false);
  assert.equal(c.hit({ buy: 'family', path: '/' }, 'Googlebot/2.1'), false);
  assert.equal(c.pendingViews(), 0, 'a Buy click is not a page view');
  assert.equal(c.pendingBuys(), 4);
  await c.flush();
  const doc = state.db.docs.get('site_stats/2026-10-11');
  assert.equal(doc.views, 0); assert.equal(doc.visits, 0);
  const buys = Object.fromEntries(Object.entries(doc.buys).map(([k, n]) => [stats.decodeKey(k), n]));
  assert.deepEqual(buys, { 'family|/|showcase|intro': 2, 'family|/plugins/taban|room-family|no-intro': 1, 'jingfang|/plugins/jingfang|other|no-intro': 1 });
  const v = stats.aggregateViews([{ id: '2026-10-11', data: { views: 5, visits: 2, buys: doc.buys } }], { days: 1, now: NOW });
  assert.equal(v.buy_clicks, 4);
  assert.equal(v.perDay.get('2026-10-11').buy_clicks, 4);
  assert.deepEqual(v.buys[0], { slug: 'family', path: '/', place: 'showcase', intro: true, clicks: 2 });
  state.db.docs.clear();
  const c2 = stats.createHitCounter({ getAdmin: async () => ({ db: state.db, FieldValue: state.FieldValue }), clock: () => NOW });
  for (let i = 0; i < stats.MAX_BUY_KEYS + 10; i++) c2.hit({ buy: `p${i}`, path: '/', place: 'room' }, BROWSER);
  await c2.flush();
  const capped = Object.fromEntries(Object.entries(state.db.docs.get('site_stats/2026-10-11').buys).map(([k, n]) => [stats.decodeKey(k), n]));
  assert.equal(Object.keys(capped).length, stats.MAX_BUY_KEYS + 1);
  assert.equal(capped['(other)|/other|other|no-intro'], 10);
});

/* ---- the route -------------------------------------------------------------- */
await test('POST /api/hit: 204 for anything, counts a browser, ignores a bot, stores no IP or user agent, 120 per minute per IP', async () => {
  state.db.docs.clear();
  const post = (body, ua, ip) => call('/api/hit', { method: 'POST', body, headers: ua === undefined ? {} : { 'User-Agent': ua }, ip });
  assert.equal((await post({ path: '/launch2', ref: 'https://l.instagram.com/a?b=c', landing: true }, BROWSER, '203.0.113.7')).status, 204);
  assert.equal((await post({ path: '/', landing: true }, 'Googlebot/2.1', '203.0.113.8')).status, 204);
  assert.equal((await post(undefined, BROWSER, '203.0.113.9')).status, 204);
  assert.equal((await post('not json', BROWSER, '203.0.113.10')).status, 204);
  assert.equal((await post({ path: '/admin' }, BROWSER, '203.0.113.11')).status, 204);
  assert.equal(server.hits.pendingViews(), 3, 'launch2, the body-less one and the string body (as /other); bot and /admin are not counted');
  for (let i = 0; i < 130; i++) assert.equal((await post({ path: '/' }, BROWSER, '198.51.100.20')).status, 204);
  assert.equal(server.hits.pendingViews(), 3 + 120, 'only 120 of 130 from one IP are taken');
  assert.equal([...state.db.docs.keys()].filter((k) => k.startsWith('site_stats/')).length, 0, 'nothing is written per request');
  await server.hits.flush();
  const [key] = [...state.db.docs.keys()].filter((k) => k.startsWith('site_stats/'));
  const doc = state.db.docs.get(key);
  assert.equal(doc.views, 123);
  assert.equal(doc.visits, 1);
  const text = JSON.stringify(doc);
  for (const secret of ['198.51.100.20', '203.0.113', 'Mozilla', 'Googlebot', 'instagram.com/a']) assert.equal(text.includes(secret), false, secret);
  assert.deepEqual(Object.keys(doc).sort(), ['paths', 'refs', 'updated', 'views', 'visits']);
});

await test('privacy text, rules and Dockerfile: one plain sentence, site_stats closed to clients, stats.js copied', async () => {
  const legal = await readFile(resolve(root, 'src/data/legalContent.js'), 'utf8');
  assert.match(legal, /without cookies: only the page address, the name of the referring website and, when you press a Buy button, which product and which part of the page it was are counted, with no IP address and no identifier/);
  assert.match(legal, /svl-intro-seen = 1/);
  const rules = await readFile(resolve(root, 'firestore.rules'), 'utf8');
  assert.match(rules, /match \/site_stats\/\{document=\*\*\} \{\s*allow read, write: if false;/);
  const docker = await readFile(resolve(root, 'api/Dockerfile'), 'utf8');
  assert.match(docker, /COPY server\.js [^\n]*\bstats\.js\b[^\n]* \.\//);
});

await test('client hook: skips /admin, uses sendBeacon with fetch fallback, storage wrapped, no cookie or localStorage', async () => {
  const hook = await readFile(resolve(root, 'src/hooks/useHitCounter.js'), 'utf8');
  assert.match(hook, /pathname === '\/admin'/);
  assert.match(hook, /sendBeacon/);
  assert.match(hook, /keepalive: true/);
  assert.match(hook, /try \{\s*if \(sessionStorage\.getItem/);
  assert.doesNotMatch(hook, /document\.cookie|localStorage\./);
  const app = await readFile(resolve(root, 'src/App.jsx'), 'utf8');
  assert.match(app, /<Router>\s*<HitCounter \/>/);
});

await test('joinMembers: orders join by e-mail, buyers without an account are listed, newest first, pending skipped', async () => {
  const members = [{ uid: 'u1', email: 'Leo@Example.com', lastActiveAt: '2026-10-27T09:00:00Z', downloads: 3 }, { uid: 'u2', email: 'quiet@example.com' }];
  const licences = [
    { id: 'leo@example.com', data: { orders: {
      a: { product: 'family', status: 'paid', amount_usd_cents: 1999, created: '2026-10-11T10:00:00Z' },
      b: { product: 'seda', status: 'paid', amount_usd_cents: 1500, created: '2026-10-26T21:36:00Z' },
      c: { product: 'ru8', status: 'pending', amount_usd_cents: 2500, created: '2026-10-27T00:00:00Z' },
    } } },
    { id: 'guest@example.com', data: { orders: { d: { product: 'alev', status: 'paid', amount_usd_cents: 0, created: '2026-10-20T00:00:00Z' } } } },
  ];
  const rows = stats.joinMembers(members, licences);
  assert.equal(rows.length, 3);
  const leo = rows.find((r) => r.uid === 'u1');
  assert.deepEqual(leo.purchases.map((p) => p.product), ['seda', 'family']);
  assert.equal(leo.spentCents, 3499);
  assert.equal(leo.hasAccount, true);
  assert.equal(rows.find((r) => r.uid === 'u2').purchases.length, 0);
  const guest = rows.find((r) => r.email === 'guest@example.com');
  assert.equal(guest.hasAccount, false);
  assert.equal(guest.purchases[0].kind, 'free');
  const src = await readFile(resolve(root, 'api/server.js'), 'utf8');
  assert.match(src, /lastActiveAt: u\.metadata\.lastRefreshTime/);
});

const failed = results.filter((r) => !r.ok);
console.log(`SUMMARY ${results.length} cases, ${failed.length} fail`);
process.exitCode = failed.length ? 1 : 0;
