// Local-only tests for self-service account deletion and the report purge.
// No Google credentials, network or deploy.  Run: node scripts/test-account-delete.js
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const require = createRequire(import.meta.url);

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
function merge(a, b) {
  const out = { ...(a || {}) };
  for (const [k, v] of Object.entries(b)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' ? merge(out[k], v) : clone(v);
  }
  return out;
}

// A Firestore-shaped fake with what the deletion code uses: documents,
// sub-collections, equality queries, delete, and serial transactions.
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
  function collection(name) {
    return {
      doc: (id) => ref(`${name}/${id}`),
      get: async () => toSnap(list(name)),
      where: (field, op, value) => ({ get: async () => toSnap(list(name).filter((p) => docs.get(p)?.[field] === value)) }),
    };
  }
  let queue = Promise.resolve();
  return {
    docs, collection,
    runTransaction(callback) {
      const run = queue.then(async () => {
        const writes = [];
        const tx = {
          get: async (d) => snap(d.path),
          set: (d, data, options) => writes.push(() => d.set(data, options)),
          update: (d, data) => writes.push(() => docs.set(d.path, merge(docs.get(d.path), data))),
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

const state = { db: fakeFirestore(), tokens: {}, deletedUsers: new Set() };
state.auth = {
  verifyIdToken: async (token) => {
    const t = state.tokens[token.replace(/^valid-/, '')];
    if (!token.startsWith('valid-') || !t) throw new Error('invalid token');
    return clone(t);
  },
  deleteUser: async (uid) => {
    if (state.deletedUsers.has(uid)) throw Object.assign(new Error('no user'), { code: 'auth/user-not-found' });
    state.deletedUsers.add(uid);
  },
};
state.FieldValue = { serverTimestamp: () => '<server-time>' };
globalThis.__acctTestApp = { initializeApp() {}, applicationDefault() {}, getApps: () => [] };
globalThis.__acctTestFirestore = { getFirestore: () => state.db, FieldValue: state.FieldValue };
globalThis.__acctTestAuth = { getAuth: () => state.auth };
globalThis.__acctTestStorage = { Storage: class { constructor() { return {}; } } };

const url = (f) => pathToFileURL(resolve(root, f)).href;
const transformed = (await readFile(resolve(root, 'server.js'), 'utf8'))
  .replace("import express from 'express';", `import express from '${pathToFileURL(require.resolve('express')).href}';`)
  .replace("import compression from 'compression';", `import compression from '${pathToFileURL(require.resolve('compression')).href}';`)
  .replace('const __dirname = dirname(fileURLToPath(import.meta.url));', `const __dirname = ${JSON.stringify(root)};`)
  .replace("from './launchLicence.js';", `from '${url('launchLicence.js')}';`)
  .replace("from './entitlements.js';", `from '${url('entitlements.js')}';`)
  .replace("from './accountDeletion.js';", `from '${url('accountDeletion.js')}';`)
  .replace("from './credits.js';", `from '${pathToFileURL(resolve(root, 'credits.js')).href}';`)
  .replace("from './inbox.js';", `from '${url('inbox.js')}';`)
  .replace("from './stats.js';", `from '${url('stats.js')}';`)
  .replace('const app = express();', 'export const app = express();')
  .replace("await import('firebase-admin/app')", 'await Promise.resolve(globalThis.__acctTestApp)')
  .replace("await import('firebase-admin/firestore')", 'await Promise.resolve(globalThis.__acctTestFirestore)')
  .replace("await import('firebase-admin/auth')", 'await Promise.resolve(globalThis.__acctTestAuth)')
  .replace("import('@google-cloud/storage')", 'Promise.resolve(globalThis.__acctTestStorage)')
  .replace(/const PORT = process\.env\.PORT \|\| 8080;[\s\S]*?\n\);\s*$/, '');
const server = await import(`data:text/javascript;base64,${Buffer.from(transformed).toString('base64')}`);
process.env.DOWNLOAD_TICKET_SECRET = 'acct-test-secret';
const { emailMarker } = await import(url('accountDeletion.js'));

const routeHandlers = new Map(server.app.router.stack.filter((l) => l.route).map((l) => [l.route.path, l.route.stack.at(-1).handle]));
class FakeResponse extends PassThrough {
  constructor() { super(); this.statusCode = 200; this.headersSent = false; this.headers = {}; this.body = undefined; }
  setHeader(n, v) { this.headers[n.toLowerCase()] = v; }
  status(c) { this.statusCode = c; return this; }
  type() { return this; }
  json(b) { this.body = b; this.headersSent = true; this.end(); return this; }
  send(b) { this.body = b; this.headersSent = true; this.end(b); return this; }
}
let ipCounter = 0;
async function call(path, { token, body } = {}) {
  const req = {
    path, query: {}, body: body || {}, ip: `10.9.${Math.floor(ipCounter / 250)}.${ipCounter++ % 250}`,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    get(n) { return this.headers[n.toLowerCase()]; },
  };
  const res = new FakeResponse();
  const handler = routeHandlers.get(path);
  assert.ok(handler, `route not found: ${path}`);
  await handler(req, res);
  return { status: res.statusCode, body: res.body };
}

const fresh = () => Math.floor(Date.now() / 1000);
const login = (name, uid, email, extra = {}) => {
  state.tokens[name] = { uid, email, email_verified: true, auth_time: fresh(), firebase: { sign_in_provider: 'password' }, ...extra };
  return `valid-${name}`;
};
const D = state.db.docs;
const monthsAgo = (n) => { const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString(); };
const dump = () => JSON.stringify([...D.entries()]);

function seed() {
  D.clear(); state.deletedUsers.clear();
  D.set('launch/counter', { claimed: 5, downloads: 12 });
  D.set('launch2/counter', { claimed: 3, downloads: 0 });
  D.set('launch2/testers', { approved: 7 });
  // alice: everything
  D.set('launch_claims/uid:alice', { key: 'SVL-AAAA', email: 'alice@example.com' });
  D.set('launch_claims/email:alice@example.com', { key: 'SVL-AAAA', uid: 'alice' });
  D.set('launch_keys/SVL-AAAA', { email: 'alice@example.com', uid: 'alice', product: 'bundle', status: 'active', instances: { i1: { name: 'Alice laptop' } } });
  D.set('plugin_licenses/alice@example.com', {
    email: 'alice@example.com',
    licenses: {
      'SVL-AAAA': { key: 'SVL-AAAA', source: 'launch' }, 77: { key: 'LS-KEY-77', order_id: '1001' },
      78: { key: 'LS-KEY-KORO-78', order_id: '1003', uid: 'alice', instances_count: 1 }, 79: { key: 'LS-KEY-FAM-79', order_id: '2002' },
    },
    orders: {
      1001: { order_id: '1001', product: 'kubbe', product_name: 'Kubbe', status: 'paid', refunded: false, receipt_url: 'https://ls.example/receipt/alice', created: '2026-10-01' },
      1003: { order_id: '1003', product: 'koro', product_name: 'KORO', status: 'paid', refunded: false, receipt_url: 'https://ls.example/receipt/alice2', uid: 'alice', created: '2026-10-03T09:00:00Z' },
      2002: { order_id: '2002', product: 'family', product_name: 'Family', status: 'paid', refunded: false, receipt_url: 'https://ls.example/receipt/alice3', uid: 'alice', created: '2026-10-02T09:00:00Z' },
    },
  });
  D.set('downloads/alice', { kubbe: { mac: { count: 2 } } });
  D.set('users/alice', { name: 'Alice' });
  D.set('launch2_uids/alice', { email: 'alice@example.com', orderId: '2002' });
  D.set('orders_by_uid/alice', { orders: { 1003: { product: 'koro', status: 'paid', refunded: false, created: '2026-10-03T09:00:00Z', email: 'alice@example.com' } } });
  D.set('orders_by_uid/bob', { orders: { 1500: { product: 'taban', status: 'paid', refunded: false, created: '2026-10-08T09:00:00Z', email: 'bob@example.com' } } });
  D.set('launch2_purchases/alice@example.com', { email: 'alice@example.com', orderId: '2002', paidAt: '2026-10-02', refunded: false, overCap: false, seat: true, uid: 'alice' });
  D.set('launch2_seats/alice@example.com', { orderId: '2002', at: '2026-10-02' });
  D.set('tester_applications/alice@example.com', { email: 'alice@example.com', uid: 'alice', answer: 'Alice answer', status: 'approved' });
  D.set('launch2_testers/alice@example.com', { email: 'alice@example.com', reports: 1 });
  D.set('tester_reports/r1', { email: 'alice@example.com', text: 'Alice report' });
  D.set('reports/rp1', { uid: 'alice', userEmail: 'someone@else.com', description: 'filed signed in' });
  D.set('reports/rp2', { userEmail: 'alice@example.com', description: 'typed address' });
  D.set('forum_topics/t1', { authorId: 'alice', title: 'Alice topic' });
  D.set('forum_topics/t1/replies/x1', { authorId: 'bob', body: 'Bob under Alice' });
  D.set('reports_archive/ar1', { uid: 'alice', description: 'archived', archivedAt: '2026-10-03' });
  D.set('reports_archive/ar2', { userEmail: 'alice@example.com', description: 'archived typed', archivedAt: '2026-10-03' });
  D.set('forum_topics_archive/ft1', { authorId: 'alice', title: 'Alice archived topic' });
  D.set('forum_topics/t2', { authorId: 'bob', title: 'Bob topic' });
  D.set('forum_topics/t2/replies/y1', { authorId: 'alice', body: 'Alice reply' });
  D.set('forum_topics/t2/replies/y2', { authorId: 'bob', body: 'Bob reply' });
  D.set('credits/alice', { balance: 900, granted: 1000, spent: 100, updatedAt: '2026-10-05' });
  D.set('credit_ledger/purchase_2002', { uid: 'alice', delta: 1000, reason: 'purchase', orderId: '2002', at: '2026-10-05' });
  D.set('credit_ledger/spend_splitter_j1', { uid: 'alice', delta: -50, reason: 'spend', tool: 'splitter', jobId: 'j1', at: '2026-10-05' });
  D.set('pending_credits/alice@example.com', { email: 'alice@example.com', orders: { 3003: { credits: 500, at: '2026-10-05' } } });
  D.set('credits/bob', { balance: 5, granted: 5, spent: 0 });
  D.set('credit_ledger/purchase_9', { uid: 'bob', delta: 5, reason: 'purchase', orderId: '9' });
  D.set('pending_credits/bob@example.com', { email: 'bob@example.com', orders: {} });
  D.set('inbox/alice/messages/welcome', { title: 'Welcome to SubverseLab', body: 'Account, downloads and licence keys.', link: '/account', kind: 'welcome', createdAt: '2026-10-05T10:00:00Z', read: false });
  D.set('inbox/alice/messages/order-1003', { title: 'Your KORO is ready', body: 'Find the download under Account.', link: '/account#koro', kind: 'order', createdAt: '2026-10-05T11:00:00Z', read: true });
  D.set('inbox/bob/messages/welcome', { title: 'Welcome to SubverseLab', body: 'Account, downloads and licence keys.', link: '/account', kind: 'welcome', createdAt: '2026-10-05T10:00:00Z', read: false });
  // bob: must survive untouched
  D.set('launch_claims/uid:bob', { key: 'SVL-BBBB', email: 'bob@example.com' });
  D.set('launch_claims/email:bob@example.com', { key: 'SVL-BBBB', uid: 'bob' });
  D.set('launch_keys/SVL-BBBB', { email: 'bob@example.com', uid: 'bob' });
  D.set('downloads/bob', { kaset: { win: { count: 1 } } });
  D.set('plugin_licenses/bob@example.com', { email: 'bob@example.com', orders: {} });
}

const results = [];
async function test(name, fn) {
  try { await fn(); results.push(true); console.log(`PASS ${name}`); } catch (e) { results.push(false); console.log(`FAIL ${name}: ${e.message}`); }
}

await test('unauthenticated and invalid-token calls get 401 and delete nothing', async () => {
  seed();
  const before = dump();
  assert.equal((await call('/api/account/delete', { body: { confirm: 'DELETE' } })).status, 401);
  assert.equal((await call('/api/account/delete', { token: 'valid-nobody', body: { confirm: 'DELETE' } })).status, 401);
  assert.equal(dump(), before);
});

await test('admin accounts are refused (403) and keep their data', async () => {
  seed();
  const token = login('admin', 'adm', 'info@subverselab.com');
  D.set('downloads/adm', { kubbe: { mac: { count: 1 } } });
  const out = await call('/api/account/delete', { token, body: { confirm: 'DELETE' } });
  assert.equal(out.status, 403);
  assert.ok(D.has('downloads/adm'));
  assert.equal(state.deletedUsers.size, 0);
});

await test('needs the word DELETE, and a sign-in from the last ten minutes', async () => {
  seed();
  const before = dump();
  const token = login('alice', 'alice', 'alice@example.com');
  assert.equal((await call('/api/account/delete', { token, body: { confirm: 'delete' } })).status, 400);
  state.tokens.alice.auth_time = fresh() - 3600;
  const stale = await call('/api/account/delete', { token, body: { confirm: 'DELETE' } });
  assert.equal(stale.status, 401);
  assert.equal(stale.body.code, 'requires-recent-login');
  assert.equal(dump(), before);
});

let erasedHash;
await test('deletion removes every personal document, keeps only hashed markers, counters unchanged', async () => {
  seed();
  const token = login('alice', 'alice', 'alice@example.com');
  const counters = clone([D.get('launch/counter'), D.get('launch2/counter'), D.get('launch2/testers')]);
  const bobBefore = clone([...D.entries()].filter(([p]) => /bob/i.test(p) || p === 'forum_topics/t2' || p === 'forum_topics/t2/replies/y2'));
  const out = await call('/api/account/delete', { token, body: { confirm: 'DELETE' } });
  assert.equal(out.status, 200, JSON.stringify(out.body));
  for (const gone of [
    'launch_claims/uid:alice', 'launch_claims/email:alice@example.com', 'launch_keys/SVL-AAAA', 'plugin_licenses/alice@example.com',
    'downloads/alice', 'users/alice', 'orders_by_uid/alice', 'launch2_uids/alice', 'launch2_purchases/alice@example.com', 'launch2_seats/alice@example.com',
    'tester_applications/alice@example.com', 'launch2_testers/alice@example.com', 'tester_reports/r1', 'reports/rp1', 'reports/rp2', 'reports_archive/ar1', 'reports_archive/ar2', 'forum_topics_archive/ft1',
    'forum_topics/t1', 'forum_topics/t1/replies/x1', 'forum_topics/t2/replies/y1',
    'inbox/alice/messages/welcome', 'inbox/alice/messages/order-1003',
  ]) assert.ok(!D.has(gone), `${gone} should be gone`);
  assert.deepEqual(clone([D.get('launch/counter'), D.get('launch2/counter'), D.get('launch2/testers')]), counters);
  erasedHash = emailMarker('alice@example.com');
  const kept = D.get(`erased_emails/${erasedHash}`);
  assert.equal(kept.claimed.launch, true);
  assert.deepEqual(kept.orders['1001'], { order_id: '1001', product: 'kubbe', status: 'paid', refunded: false, created: '2026-10-01' });
  // A single plugin and the family keep their purchase date (the "updates until" date), nothing else; no licence key survives.
  assert.deepEqual(kept.orders['1003'], { order_id: '1003', product: 'koro', status: 'paid', refunded: false, created: '2026-10-03T09:00:00Z' });
  assert.deepEqual(kept.orders['2002'], { order_id: '2002', product: 'family', status: 'paid', refunded: false, created: '2026-10-02T09:00:00Z' });
  for (const secret of ['LS-KEY-77', 'LS-KEY-KORO-78', 'LS-KEY-FAM-79', 'receipt']) assert.ok(!dump().includes(secret), `${secret} must not survive`);
  assert.equal(kept.purchase.orderId, '2002');
  assert.equal(kept.seat.orderId, '2002');
  assert.ok(!dump().toLowerCase().includes('alice'), 'no trace of the name or address is left anywhere');
  assert.ok(state.deletedUsers.has('alice'));
  assert.ok(D.has('inbox/bob/messages/welcome'), "another account's inbox stays");
  assert.ok(D.has('orders_by_uid/bob'), "another account's order index stays");
  assert.deepEqual(clone([...D.entries()].filter(([p]) => /bob/i.test(p) || p === 'forum_topics/t2' || p === 'forum_topics/t2/replies/y2')), bobBefore, 'other people keep their data');
});

await test('deleting twice is fine and changes nothing', async () => {
  const before = dump();
  const out = await call('/api/account/delete', { token: 'valid-alice', body: { confirm: 'DELETE' } });
  assert.equal(out.status, 200);
  assert.equal(dump(), before);
});

await test('the same e-mail signing up again cannot claim a second free licence; the counter stays', async () => {
  const token = login('alice2', 'alice-new', 'alice@example.com');
  const before = clone(D.get('launch/counter'));
  const claim = await call('/api/launch/claim', { token, body: { launchId: 'launch' } });
  assert.equal(claim.status, 409);
  assert.match(claim.body.error, /already used its free launch licence/);
  assert.deepEqual(D.get('launch/counter'), before);
  assert.ok(![...D.keys()].some((p) => p.startsWith('launch_keys/') && D.get(p).uid === 'alice-new'));
  // a different e-mail still claims normally, and the counter moves by one
  const carol = await call('/api/launch/claim', { token: login('carol', 'carol', 'carol@example.com'), body: { launchId: 'launch' } });
  assert.equal(carol.status, 200);
  assert.equal(D.get('launch/counter').claimed, before.claimed + 1);
});

await test('a paid order survives deletion in reduced form, so re-downloads still work', async () => {
  D.set('launch/counter', { claimed: 1000, downloads: 12 });
  const status = await call('/api/purchases/status', { token: 'valid-alice2' });
  assert.equal(status.status, 200);
  // alice also holds a paid family (launch-2) purchase (and a KORO single): all seven plugins open, with the kept purchase dates.
  assert.deepEqual(status.body.owned, ['kubbe', 'kaset', 'koro', 'yanki', 'hava', 'mihenk', 'tutkal']);
  assert.equal(status.body.updatesUntil.koro, '2028-10-03');
  assert.equal(status.body.updatesUntil.kubbe, '2028-10-02');
  const keys = await call('/api/purchases/licenses', { token: 'valid-alice2' });
  assert.deepEqual(keys.body, { licenses: [] }, 'deleted licence keys do not come back');
});

await test('a family order paid under another checkout e-mail but bound to the account: its key and record go, only a hashed marker stays; the rest of that e-mail\'s document stays', async () => {
  seed();
  D.delete('launch2_purchases/alice@example.com'); D.delete('launch2_seats/alice@example.com');
  D.set('launch2_uids/alice', { email: 'alice.work@example.com', orderId: '2002' });
  D.set('launch2_purchases/alice.work@example.com', { email: 'alice.work@example.com', orderId: '2002', paidAt: '2026-10-02', refunded: false, overCap: false, seat: true, uid: 'alice' });
  D.set('plugin_licenses/alice.work@example.com', {
    email: 'alice.work@example.com',
    orders: {
      2002: { order_id: '2002', product: 'family', status: 'paid', refunded: false, receipt_url: 'https://ls.example/r/work', created: '2026-10-02T09:00:00Z' },
      3003: { order_id: '3003', product: 'hava', status: 'paid', refunded: false, created: '2026-10-04T09:00:00Z' },
    },
    licenses: { 88: { key: 'FAM-KEY-WORK-88', order_id: '2002' }, 89: { key: 'HAVA-KEY-WORK-89', order_id: '3003' } },
  });
  const out = await call('/api/account/delete', { token: login('alice', 'alice', 'alice@example.com'), body: { confirm: 'DELETE' } });
  assert.equal(out.status, 200, JSON.stringify(out.body));
  const left = D.get('plugin_licenses/alice.work@example.com');
  assert.ok(left, 'the other order of that e-mail is not this account\'s and stays');
  assert.deepEqual(Object.keys(left.orders), ['3003']); assert.deepEqual(Object.keys(left.licenses), ['89']);
  assert.ok(!dump().includes('FAM-KEY-WORK-88') && !dump().includes('ls.example/r/work'));
  const marker = D.get(`erased_emails/${emailMarker('alice.work@example.com')}`);
  assert.deepEqual(marker.orders['2002'], { order_id: '2002', product: 'family', status: 'paid', refunded: false, created: '2026-10-02T09:00:00Z' });
  // With nothing else in that document it is deleted outright.
  seed();
  D.delete('launch2_purchases/alice@example.com');
  D.set('launch2_uids/alice', { email: 'solo.work@example.com', orderId: '2002' });
  D.set('launch2_purchases/solo.work@example.com', { email: 'solo.work@example.com', orderId: '2002', paidAt: '2026-10-02', refunded: false, overCap: false, seat: true, uid: 'alice' });
  D.set('plugin_licenses/solo.work@example.com', { email: 'solo.work@example.com', orders: { 2002: { order_id: '2002', product: 'family', status: 'paid', created: '2026-10-02T09:00:00Z' } }, licenses: { 90: { key: 'FAM-KEY-SOLO-90', order_id: '2002' } } });
  assert.equal((await call('/api/account/delete', { token: login('alice', 'alice', 'alice@example.com'), body: { confirm: 'DELETE' } })).status, 200);
  assert.ok(!D.has('plugin_licenses/solo.work@example.com'));
  assert.ok(!dump().includes('FAM-KEY-SOLO-90'));
});

await test('an unverified account with someone else\'s address cannot delete that person\'s records', async () => {
  seed();
  D.set('plugin_licenses/victim@example.com', { email: 'victim@example.com', orders: { 9: { order_id: '9', product: 'kaset', status: 'paid' } } });
  D.set('tester_applications/victim@example.com', { email: 'victim@example.com', uid: 'victim', status: 'pending' });
  D.set('launch_claims/email:victim@example.com', { key: 'SVL-VVVV', uid: 'victim' });
  D.set('launch_keys/SVL-VVVV', { email: 'victim@example.com', uid: 'victim' });
  const token = login('mal', 'mal', 'victim@example.com', { email_verified: false });
  const out = await call('/api/account/delete', { token, body: { confirm: 'DELETE' } });
  assert.equal(out.status, 200);
  for (const p of ['plugin_licenses/victim@example.com', 'tester_applications/victim@example.com', 'launch_claims/email:victim@example.com', 'launch_keys/SVL-VVVV']) assert.ok(D.has(p), `${p} must survive`);
  assert.ok(state.deletedUsers.has('mal'));
});

await test('account deletion removes credits, their ledger lines and e-mail-parked credits; others stay', async () => {
  seed();
  const out = await call('/api/account/delete', { token: login('alice', 'alice', 'alice@example.com'), body: { confirm: 'DELETE' } });
  assert.equal(out.status, 200);
  for (const p of ['credits/alice', 'credit_ledger/purchase_2002', 'credit_ledger/spend_splitter_j1', 'pending_credits/alice@example.com']) assert.ok(!D.has(p), `${p} must be gone`);
  for (const p of ['credits/bob', 'credit_ledger/purchase_9', 'pending_credits/bob@example.com']) assert.ok(D.has(p), `${p} must stay`);
  assert.ok(!dump().includes('"credits":500'));
});

await test('unverified account does not delete credits parked under an e-mail it does not own', async () => {
  seed();
  D.set('pending_credits/victim@example.com', { email: 'victim@example.com', orders: { 1: { credits: 100 } } });
  D.set('credits/mal', { balance: 1, granted: 1, spent: 0 });
  const out = await call('/api/account/delete', { token: login('mal', 'mal', 'victim@example.com', { email_verified: false }), body: { confirm: 'DELETE' } });
  assert.equal(out.status, 200);
  assert.ok(D.has('pending_credits/victim@example.com'));
  assert.ok(!D.has('credits/mal'));
});

await test('report purge: resolved for over 12 months go, newer stay, unstamped get a start date; admin only', async () => {
  seed();
  D.set('reports/old', { status: 'resolved', resolvedAt: monthsAgo(13), createdAt: monthsAgo(14) });
  D.set('reports/new', { status: 'resolved', resolvedAt: monthsAgo(6) });
  D.set('reports/legacy', { status: 'resolved', createdAt: monthsAgo(20) });
  D.set('reports/open', { status: 'open', createdAt: monthsAgo(30) });
  D.set('reports_archive/aold', { status: 'resolved', resolvedAt: monthsAgo(15), archivedAt: monthsAgo(1) });
  D.set('reports_archive/aold2', { archivedAt: monthsAgo(13) });
  D.set('reports_archive/anew', { archivedAt: monthsAgo(2) });
  assert.equal((await call('/api/admin/reports/purge', { token: login('alice', 'alice', 'alice@example.com') })).status, 403);
  assert.equal((await call('/api/admin/reports/purge')).status, 401);
  const out = await call('/api/admin/reports/purge', { token: login('admin', 'adm', 'info@subverselab.com') });
  assert.equal(out.status, 200);
  assert.deepEqual(out.body, { deleted: 3, stamped: 1 });
  assert.ok(!D.has('reports_archive/aold') && !D.has('reports_archive/aold2') && D.has('reports_archive/anew'));
  assert.ok(!D.has('reports/old')); assert.ok(D.has('reports/new')); assert.ok(D.has('reports/open'));
  assert.ok(D.get('reports/legacy').resolvedAt);
});

const failed = results.filter((r) => !r).length;
console.log(`SUMMARY ${results.length} cases, ${failed} fail`);
process.exit(failed ? 1 : 0);
