// Tests api/trialGrant.js (plug-in trial + browser sign-in, 01_AI_Tools/subverselab-plugin-common/docs/TRIAL_AND_SIGNIN.md)
// against an in-memory Firestore and a throwaway RSA key made here. No Google credentials, no network.
// Run: node scripts/test-trial.js
// Also checks api/testdata/grant_fixture.json (the C++ side's fixture) still verifies; `--write-fixture` rewrites it.
import assert from 'assert/strict';
import { createHash, generateKeyPairSync } from 'crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  createTrialService, buildPayload, loadSigningKey, publicKeyJuce, signPayload, makeGrant, verifyGrant, NotConfigured,
  normaliseUserCode, generateUserCode, TRIAL_MS, OWNED_GRACE_MS, DEVICE_TTL_S, TRIAL_PRODUCTS, BUY_URLS,
} from '../api/trialGrant.js';
import * as ent from '../api/entitlements.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = join(ROOT, 'api', 'testdata', 'grant_fixture.json');

// ------------------------------------------------------------ fake Firestore (as scripts/test-launch-licence.js)
function fakeFirestore() {
  const docs = new Map();
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const snap = (path) => ({ exists: docs.has(path), data: () => clone(docs.get(path)) });
  const ref = (path) => ({
    path,
    get: async () => snap(path),
    set: async (data, opt) => { docs.set(path, opt?.merge ? { ...(docs.get(path) || {}), ...clone(data) } : clone(data)); },
  });
  let queue = Promise.resolve();
  return {
    docs,
    collection: (c) => ({
      doc: (id) => ref(`${c}/${id}`),
      where: (field, op, value) => ({
        get: async () => ({ docs: [...docs.keys()].filter((p) => p.startsWith(`${c}/`) && docs.get(p)?.[field] === value).map((p) => ({ ...snap(p), ref: ref(p) })) }),
      }),
    }),
    runTransaction(fn) {
      const run = queue.then(async () => {
        const writes = [];
        const tx = {
          get: async (r) => snap(r.path),
          set: (r, data, opt) => writes.push(() => r.set(data, opt)),
          update: (r, data) => writes.push(() => { assert.ok(docs.has(r.path), 'update of a missing doc'); docs.set(r.path, { ...docs.get(r.path), ...clone(data) }); }),
        };
        const result = await fn(tx);
        for (const w of writes) await w();
        return result;
      });
      queue = run.catch(() => {});
      return run;
    },
  };
}

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try { await fn(); passed += 1; console.log(`  ok  ${name}`); } catch (err) { failed += 1; console.error(`FAIL  ${name}\n${err.stack}`); process.exitCode = 1; }
}

// One throwaway key for the whole run (RSA 2048, as in production).
const { privateKey: pem } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const KEY = loadSigningKey(pem);
const OTHER = loadSigningKey(generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey);

const MACHINE = `svl-machine:${createHash('sha256').update('test-device-id').digest('hex').slice(0, 32)}`;
const MACHINE2 = `svl-machine:${'b'.repeat(32)}`;
const T0 = Date.UTC(2026, 10, 7, 12, 0, 0);

// Ownership stub: {uid: [slugs]}; records every call so the tests can see what was asked.
function setup({ owners = {}, users = {}, key = KEY } = {}) {
  const db = fakeFirestore();
  const clock = { t: T0 };
  const calls = [];
  let n = 0;
  const svc = createTrialService({
    getAdmin: async () => ({ db }),
    getKey: () => key,
    now: () => clock.t,
    ownedVia: async (admin, who, slug) => { calls.push({ who, slug }); return (owners[who.uid] || []).includes(slug) ? 'lemonsqueezy' : null; },
    lookupUser: async (admin, uid) => (uid in users ? users[uid] : null),
    newDeviceCode: () => `${(n += 1).toString(16).padStart(4, '0')}${'d'.repeat(44)}`,
  });
  return { db, clock, calls, svc };
}

// m^e mod n == sha256 with BigInt, exactly what juce::RSAKey::applyToValue does on the plug-in side.
function bigVerify(payload, sigHex, juceKey) {
  const [eHex, nHex] = juceKey.split(',');
  const e = BigInt(`0x${eHex}`);
  const n = BigInt(`0x${nHex}`);
  let base = BigInt(`0x${sigHex}`) % n;
  let exp = e;
  let r = 1n;
  while (exp > 0n) { if (exp & 1n) r = (r * base) % n; base = (base * base) % n; exp >>= 1n; }
  return r === BigInt(`0x${createHash('sha256').update(Buffer.from(payload, 'utf8')).digest('hex')}`);
}

console.log('trial grants');

await test('payload: exact field order, no spaces', () => {
  const p = buildPayload({ ends: 3, starts: 2, issued: 1, uid: '', kind: 'trial', machine: MACHINE, product: 'ahenk' });
  assert.equal(p, `{"v":1,"product":"ahenk","machine":"${MACHINE}","kind":"trial","uid":"","issued":1,"starts":2,"ends":3}`);
  assert.ok(!p.includes(' '));
});

await test('signature: lowercase hex, no leading zeros, verifies in Node and as m^e mod n (BigInt)', () => {
  const juce = publicKeyJuce(KEY.publicKey);
  assert.match(juce, /^[0-9a-f]+,[0-9a-f]+$/);
  assert.equal(juce.split(',')[0], '10001');
  for (let i = 0; i < 20; i += 1) {
    const g = makeGrant({ product: 'ahenk', machine: MACHINE, kind: 'owned', uid: `u${i}`, issued: T0 + i, starts: T0 + i, ends: T0 + i + OWNED_GRACE_MS }, KEY);
    assert.match(g.sig, /^[1-9a-f][0-9a-f]*$/);
    assert.ok(bigVerify(g.payload, g.sig, juce), 'BigInt check');
    assert.ok(verifyGrant(g, KEY));
  }
});

await test('verifyGrant: edited payload, other key, extra field, junk -> null', () => {
  const g = makeGrant({ product: 'ahenk', machine: MACHINE, kind: 'owned', uid: 'u1', issued: T0, starts: T0, ends: T0 + 1 }, KEY);
  assert.equal(verifyGrant({ ...g, payload: g.payload.replace(`"ends":${T0 + 1}`, `"ends":${T0 + 9e12}`) }, KEY), null);
  assert.equal(verifyGrant(g, OTHER), null);
  const extra = g.payload.replace('}', ',"x":1}');
  assert.equal(verifyGrant({ payload: extra, sig: signPayload(extra, KEY) }, KEY), null, 'non-canonical payload refused');
  for (const bad of [null, {}, 'x', { payload: g.payload, sig: 'zz' }, { payload: g.payload, sig: 'f'.repeat(600) }]) assert.equal(verifyGrant(bad, KEY), null);
  assert.ok(verifyGrant(JSON.stringify(g), KEY), 'a JSON string of the wire form is accepted');
});

await test('fixture for the C++ side verifies (api/testdata/grant_fixture.json)', () => {
  if (process.argv.includes('--write-fixture')) {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const k = loadSigningKey(privateKey);
    const g = makeGrant({ product: 'ahenk', machine: MACHINE, kind: 'owned', uid: 'fixture-uid', issued: T0, starts: T0, ends: T0 + OWNED_GRACE_MS }, k);
    const t = makeGrant({ product: 'ahenk', machine: MACHINE, kind: 'trial', uid: '', issued: T0, starts: T0, ends: T0 + TRIAL_MS }, k);
    mkdirSync(dirname(FIXTURE), { recursive: true });
    writeFileSync(FIXTURE, `${JSON.stringify({
      _note: 'TEST KEY ONLY. Made by scripts/test-trial.js --write-fixture with a throwaway RSA 2048 key whose private half was never saved. Not the production key; never compile it into a release.',
      deviceId: 'test-device-id',
      publicKeyJuce: publicKeyJuce(k.publicKey),
      payload: g.payload, sig: g.sig,
      trial: t,
      tampered: { payload: g.payload.replace('"fixture-uid"', '"fixture-uiX"'), sig: g.sig },
    }, null, 2)}\n`);
  }
  const f = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  assert.ok(bigVerify(f.payload, f.sig, f.publicKeyJuce));
  assert.ok(bigVerify(f.trial.payload, f.trial.sig, f.publicKeyJuce));
  assert.ok(!bigVerify(f.tampered.payload, f.tampered.sig, f.publicKeyJuce));
  assert.equal(f.payload.split('"machine":"')[1].split('"')[0], `svl-machine:${createHash('sha256').update(f.deviceId).digest('hex').slice(0, 32)}`);
});

console.log('trial start');

await test('unknown product -> 400 {ok:false,error:"unknown product"}; bad machine -> 400', async () => {
  const { svc } = setup();
  assert.deepEqual(await svc.trialStart({ product: 'kubbe', machine: MACHINE, name: 'Mac' }), { status: 400, body: { ok: false, error: 'unknown product' } });
  assert.deepEqual(await svc.trialStart({ product: undefined, machine: MACHINE }), { status: 400, body: { ok: false, error: 'unknown product' } });
  assert.equal((await svc.trialStart({ product: 'ahenk', machine: 'svl-machine:XYZ' })).status, 400);
  assert.equal((await svc.trialStart({ product: 'ahenk', machine: `${MACHINE}/x` })).status, 400);
  assert.deepEqual(TRIAL_PRODUCTS, ['ahenk']);
});

await test('first call starts the trial: 30 days, server time, trial grant, doc written', async () => {
  const { svc, db } = setup();
  const r = await svc.trialStart({ product: 'ahenk', machine: MACHINE, name: '  Studio Mac\n' });
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.now, T0);
  const p = verifyGrant(r.body.grant, KEY);
  assert.deepEqual(p, { v: 1, product: 'ahenk', machine: MACHINE, kind: 'trial', uid: '', issued: T0, starts: T0, ends: T0 + 30 * 86400000 });
  const doc = db.docs.get(`trials/ahenk__${MACHINE.slice(12)}`);
  assert.deepEqual(doc, { product: 'ahenk', machine: MACHINE, name: 'Studio Mac', started: T0 });
});

await test('later calls keep the first start (reinstall does not reset); another machine gets its own', async () => {
  const { svc, clock, db } = setup();
  await svc.trialStart({ product: 'ahenk', machine: MACHINE, name: 'A' });
  clock.t = T0 + 40 * 86400000;
  const r = await svc.trialStart({ product: 'ahenk', machine: MACHINE, name: 'B' });
  const p = verifyGrant(r.body.grant, KEY);
  assert.equal(p.starts, T0);
  assert.equal(p.ends, T0 + TRIAL_MS);
  assert.equal(p.issued, clock.t);
  assert.ok(p.ends < r.body.now, 'trial over: ends is in the past');
  assert.equal(db.docs.get(`trials/ahenk__${MACHINE.slice(12)}`).name, 'A', 'never rewritten');
  const other = verifyGrant((await svc.trialStart({ product: 'ahenk', machine: MACHINE2 })).body.grant, KEY);
  assert.equal(other.starts, clock.t);
});

await test('no signing key -> NotConfigured (route answers 503 plain text), nothing written', async () => {
  const { svc, db } = setup({ key: null });
  await assert.rejects(svc.trialStart({ product: 'ahenk', machine: MACHINE }), NotConfigured);
  await assert.rejects(svc.deviceStart({ product: 'ahenk', machine: MACHINE }), NotConfigured);
  await assert.rejects(svc.grantRefresh({ grant: {} }), NotConfigured);
  assert.equal(db.docs.size, 0);
});

console.log('device flow');

await test('user codes: ABCD-2345 shape, Crockford only; normaliser', () => {
  for (let i = 0; i < 200; i += 1) assert.match(generateUserCode(), /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
  assert.equal(normaliseUserCode('abcd 2345'), 'ABCD-2345');
  assert.equal(normaliseUserCode('ABCD-23O5'), 'ABCD-2305');
  assert.equal(normaliseUserCode('ilcd-2345'), '11CD-2345');
  assert.equal(normaliseUserCode('ABCU-2345'), null);
  assert.equal(normaliseUserCode('ABC-2345'), null);
  assert.equal(normaliseUserCode(42), null);
});

async function started(svc) {
  const r = await svc.deviceStart({ product: 'ahenk', machine: MACHINE, name: 'Studio Mac' });
  assert.equal(r.status, 200);
  return r.body;
}

await test('start: shape, verify_url, doc pending with expiry', async () => {
  const { svc, db } = setup();
  const b = await started(svc);
  assert.deepEqual(Object.keys(b), ['ok', 'device_code', 'user_code', 'verify_url', 'interval', 'expires_in']);
  assert.ok(b.device_code.length >= 32);
  assert.match(b.user_code, /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
  assert.equal(b.verify_url, `https://subverselab.com/activate?code=${b.user_code}`);
  assert.equal(b.interval, 3);
  assert.equal(b.expires_in, 600);
  assert.deepEqual(db.docs.get(`device_codes/${b.device_code}`), { status: 'pending', user_code: b.user_code, product: 'ahenk', machine: MACHINE, name: 'Studio Mac', expires: T0 + 600000, created: T0 });
  assert.deepEqual(await svc.deviceStart({ product: 'nope', machine: MACHINE }), { status: 400, body: { ok: false, error: 'unknown product' } });
});

await test('happy path: pending -> lookup -> approve -> poll gives an owned grant once -> consumed', async () => {
  const { svc, clock, calls, db } = setup({ owners: { u1: ['ahenk'] } });
  const b = await started(svc);
  assert.deepEqual((await svc.devicePoll({ device_code: b.device_code })).body, { status: 'pending' });
  const look = await svc.deviceLookup({ user_code: b.user_code.toLowerCase() });
  assert.deepEqual(look, { status: 200, body: { ok: true, product: 'ahenk', name: 'Studio Mac', user_code: b.user_code, approved: false } });
  clock.t += 20000;
  const ap = await svc.deviceApprove({ user_code: b.user_code, caller: { uid: 'u1', email: 'a@b.c', proven: true } });
  assert.deepEqual(ap, { status: 200, body: { ok: true, product: 'ahenk', name: 'Studio Mac' } });
  assert.deepEqual(calls.at(-1), { who: { email: 'a@b.c', uid: 'u1', proven: true }, slug: 'ahenk' });
  assert.equal(db.docs.get(`device_codes/${b.device_code}`).status, 'approved');
  assert.deepEqual(await svc.deviceApprove({ user_code: b.user_code, caller: { uid: 'u1' } }), ap, 'pressing again is fine');
  assert.equal((await svc.deviceApprove({ user_code: b.user_code, caller: { uid: 'u2' } })).status, 404, 'another account cannot take an approved code');
  clock.t += 3000;
  const poll = await svc.devicePoll({ device_code: b.device_code });
  assert.equal(poll.body.status, 'approved');
  assert.deepEqual(Object.keys(poll.body), ['status', 'grant']);
  const p = verifyGrant(poll.body.grant, KEY);
  assert.deepEqual(p, { v: 1, product: 'ahenk', machine: MACHINE, kind: 'owned', uid: 'u1', issued: clock.t, starts: clock.t, ends: clock.t + 45 * 86400000 });
  assert.ok(bigVerify(poll.body.grant.payload, poll.body.grant.sig, publicKeyJuce(KEY.publicKey)));
  // consume-once
  assert.deepEqual((await svc.devicePoll({ device_code: b.device_code })).body, { status: 'expired' });
  assert.equal(db.docs.get(`device_codes/${b.device_code}`).status, 'consumed');
  assert.equal((await svc.deviceApprove({ user_code: b.user_code, caller: { uid: 'u1' } })).status, 404);
  assert.equal((await svc.deviceLookup({ user_code: b.user_code })).status, 404);
});

await test('not owned: 200 {ok:false,"not owned",buy_url}, code stays pending; buying then pressing again works', async () => {
  const owners = {};
  const { svc, db } = setup({ owners });
  const b = await started(svc);
  const r = await svc.deviceApprove({ user_code: b.user_code, caller: { uid: 'u9', email: 'x@y.z', proven: false } });
  assert.deepEqual(r, { status: 200, body: { ok: false, error: 'not owned', buy_url: BUY_URLS.ahenk } });
  assert.equal(db.docs.get(`device_codes/${b.device_code}`).status, 'pending');
  assert.deepEqual((await svc.devicePoll({ device_code: b.device_code })).body, { status: 'pending' });
  owners.u9 = ['ahenk'];
  assert.equal((await svc.deviceApprove({ user_code: b.user_code, caller: { uid: 'u9' } })).body.ok, true);
  assert.equal((await svc.devicePoll({ device_code: b.device_code })).body.status, 'approved');
});

await test('expiry: after 600 s approve/lookup 404 {ok:false,"expired"}, poll "expired"; an approved but unpolled code expires too', async () => {
  const { svc, clock } = setup({ owners: { u1: ['ahenk'] } });
  const b = await started(svc);
  clock.t = T0 + DEVICE_TTL_S * 1000;
  assert.deepEqual(await svc.deviceApprove({ user_code: b.user_code, caller: { uid: 'u1' } }), { status: 404, body: { ok: false, error: 'expired' } });
  assert.deepEqual(await svc.deviceLookup({ user_code: b.user_code }), { status: 404, body: { ok: false, error: 'expired' } });
  assert.deepEqual((await svc.devicePoll({ device_code: b.device_code })).body, { status: 'expired' });
  clock.t = T0;
  const b2 = await started(svc);
  await svc.deviceApprove({ user_code: b2.user_code, caller: { uid: 'u1' } });
  clock.t = T0 + 601000;
  assert.deepEqual((await svc.devicePoll({ device_code: b2.device_code })).body, { status: 'expired' });
});

await test('unknown codes: approve 404 expired, poll expired (also junk device codes)', async () => {
  const { svc } = setup();
  assert.deepEqual(await svc.deviceApprove({ user_code: 'ZZZZ-9999', caller: { uid: 'u1' } }), { status: 404, body: { ok: false, error: 'expired' } });
  assert.deepEqual(await svc.deviceApprove({ user_code: 'not a code', caller: { uid: 'u1' } }), { status: 404, body: { ok: false, error: 'expired' } });
  for (const dc of ['f'.repeat(48), '', 'short', '../../x', 7, undefined]) assert.deepEqual((await svc.devicePoll({ device_code: dc })).body, { status: 'expired' });
});

await test('two polls at once: only one gets the grant', async () => {
  const { svc } = setup({ owners: { u1: ['ahenk'] } });
  const b = await started(svc);
  await svc.deviceApprove({ user_code: b.user_code, caller: { uid: 'u1' } });
  const rs = await Promise.all([1, 2, 3].map(() => svc.devicePoll({ device_code: b.device_code })));
  assert.equal(rs.filter((r) => r.body.status === 'approved').length, 1);
});

console.log('grant refresh');

function ownedGrantFor(uid, key = KEY, extra = {}) {
  return makeGrant({ product: 'ahenk', machine: MACHINE, kind: 'owned', uid, issued: T0, starts: T0, ends: T0 + OWNED_GRACE_MS, ...extra }, key);
}

await test('still owned -> {ok:true, grant} with new issued / ends; ownership asked with the account record', async () => {
  const { svc, clock, calls } = setup({ owners: { u1: ['ahenk'] }, users: { u1: { email: 'a@b.c', proven: true } } });
  clock.t = T0 + 10 * 86400000;
  const r = await svc.grantRefresh({ grant: ownedGrantFor('u1') });
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  const p = verifyGrant(r.body.grant, KEY);
  assert.deepEqual(p, { v: 1, product: 'ahenk', machine: MACHINE, kind: 'owned', uid: 'u1', issued: clock.t, starts: clock.t, ends: clock.t + OWNED_GRACE_MS });
  assert.deepEqual(calls.at(-1), { who: { email: 'a@b.c', uid: 'u1', proven: true }, slug: 'ahenk' });
});

await test('refunded / no longer owned / deleted account -> 200 {ok:false,"not owned"}', async () => {
  const { svc } = setup({ owners: {}, users: { u1: { email: 'a@b.c', proven: true } } });
  assert.deepEqual(await svc.grantRefresh({ grant: ownedGrantFor('u1') }), { status: 200, body: { ok: false, error: 'not owned' } });
  assert.deepEqual(await svc.grantRefresh({ grant: ownedGrantFor('gone') }), { status: 200, body: { ok: false, error: 'not owned' } });
});

await test('bad signature / edited / trial grant / junk -> 400 {ok:false,"bad grant"}', async () => {
  const { svc } = setup({ owners: { u1: ['ahenk'] }, users: { u1: { email: 'a@b.c', proven: true } } });
  const bad = { status: 400, body: { ok: false, error: 'bad grant' } };
  assert.deepEqual(await svc.grantRefresh({ grant: ownedGrantFor('u1', OTHER) }), bad);
  const g = ownedGrantFor('u1');
  assert.deepEqual(await svc.grantRefresh({ grant: { ...g, payload: g.payload.replace('"u1"', '"u2"') } }), bad);
  const trial = makeGrant({ product: 'ahenk', machine: MACHINE, kind: 'trial', uid: '', issued: T0, starts: T0, ends: T0 + TRIAL_MS }, KEY);
  assert.deepEqual(await svc.grantRefresh({ grant: trial }), bad);
  for (const junk of [undefined, null, 'x', {}, { payload: 1, sig: 2 }]) assert.deepEqual(await svc.grantRefresh({ grant: junk }), bad);
});

await test('validly signed grant for a product without a trial -> 400 unknown product', async () => {
  const { svc } = setup({ owners: { u1: ['kubbe'] }, users: { u1: { email: 'a@b.c', proven: true } } });
  assert.deepEqual(await svc.grantRefresh({ grant: ownedGrantFor('u1', KEY, { product: 'kubbe' }) }), { status: 400, body: { ok: false, error: 'unknown product' } });
});

await test('JING FANG is owned-only (owner 7 Nov): no trial; sign-in gives an owned grant to an owner, the buy link to others; refresh works', async () => {
  const owners = {};
  const { svc, db } = setup({ owners, users: { u7: { email: 'j@f.c', proven: true } } });
  assert.deepEqual(await svc.trialStart({ product: 'jingfang', machine: MACHINE, name: 'Mac' }), { status: 400, body: { ok: false, error: 'unknown product' } });
  assert.equal([...db.docs.keys()].filter((k) => k.startsWith('trials/')).length, 0, 'no trial record written');
  const s = await svc.deviceStart({ product: 'jingfang', machine: MACHINE, name: 'Mac' });
  assert.equal(s.status, 200);
  const no = await svc.deviceApprove({ user_code: s.body.user_code, caller: { uid: 'u7', email: 'j@f.c', proven: true } });
  assert.deepEqual(no, { status: 200, body: { ok: false, error: 'not owned', buy_url: BUY_URLS.jingfang } });
  owners.u7 = ['jingfang'];
  assert.equal((await svc.deviceApprove({ user_code: s.body.user_code, caller: { uid: 'u7', email: 'j@f.c', proven: true } })).body.ok, true);
  const poll = await svc.devicePoll({ device_code: s.body.device_code });
  const p = verifyGrant(poll.body.grant, KEY);
  assert.equal(p.product, 'jingfang'); assert.equal(p.kind, 'owned'); assert.equal(p.uid, 'u7');
  const r = await svc.grantRefresh({ grant: poll.body.grant });
  assert.equal(r.body.ok, true);
  owners.u7 = [];
  assert.deepEqual((await svc.grantRefresh({ grant: poll.body.grant })).body, { ok: false, error: 'not owned' });
});

console.log('entitlements');

await test('ahenk is ownable (ownedVia) and on sale (SOLO_SLUGS since 8 Nov), never free or a pack', async () => {
  assert.ok(ent.OWNABLE_SLUGS.includes('ahenk'));
  assert.equal(ent.OWNABLE_SLUGS.filter((s) => s === 'ahenk').length, 1);
  assert.ok(ent.SOLO_SLUGS.includes('ahenk'), 'SOLO_SLUGS');
  for (const list of ['FREE_SLUGS', 'PACK_SLUGS']) assert.ok(!ent[list].includes('ahenk'), list);
  const orders = { o1: { product: 'ahenk', status: 'paid', refunded: false, created: '2026-11-07T00:00:00Z' } };
  const docs = { 'orders_by_uid/u1': { orders } };
  const admin = { db: { collection: (c) => ({ doc: (id) => ({ get: async () => ({ exists: `${c}/${id}` in docs, data: () => docs[`${c}/${id}`] }) }), where: () => ({ get: async () => ({ docs: [] }) }) }) } };
  assert.equal(await ent.ownedVia(admin, { email: '', uid: 'u1', proven: false }, 'ahenk'), 'lemonsqueezy');
  docs['orders_by_uid/u1'] = { orders: { o1: { ...orders.o1, refunded: true } } };
  assert.equal(await ent.ownedVia(admin, { email: '', uid: 'u1', proven: false }, 'ahenk'), null);
  // A catalogue registration later (when it goes on sale) does not duplicate it.
  ent.registerCatalogProducts({ plugins: [{ slug: 'ahenk' }] });
  assert.ok(ent.SOLO_SLUGS.includes('ahenk'));
  assert.equal(ent.OWNABLE_SLUGS.filter((s) => s === 'ahenk').length, 1);
});

console.log(`\n${passed} passed, ${failed} failed`);
