// Tests launchLicence.js against an in-memory Firestore — no Google
// credentials, no network. Run: node scripts/test-launch-licence.js
//
// Covers the key format and normaliser, the one-per-account / one-per-e-mail
// claim, the 1,000 cap, the three-computer limit, and that every licence
// response has the Lemon Squeezy shape the plugins' shared parser reads
// (01_AI_Tools/subverselab-plugin-common/Licensing/License.h).
import assert from 'assert/strict';
import {
  createLaunchService, generateKey, normaliseKey, tokenBucket,
  LAUNCH_TOTAL, SOLD_OUT, STORE_ID, PRODUCT_IDS,
} from '../launchLicence.js';

// ------------------------------------------------------------ fake Firestore
function fakeFirestore() {
  const docs = new Map();
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const merge = (a, b) => {
    const out = { ...(a || {}) };
    for (const [k, v] of Object.entries(b)) {
      out[k] = v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object'
        ? merge(out[k], v) : v;
    }
    return out;
  };
  const snap = (path) => ({ exists: docs.has(path), data: () => clone(docs.get(path)) });
  const ref = (path) => ({
    path,
    get: async () => snap(path),
    set: async (data, opt) => { docs.set(path, opt?.merge ? merge(docs.get(path), clone(data)) : clone(data)); },
  });
  let queue = Promise.resolve();
  const db = {
    docs,
    collection: (c) => ({ doc: (id) => ref(`${c}/${id}`) }),
    // Transactions run one at a time and commit their writes at the end,
    // which is the guarantee the real one gives for these access patterns.
    runTransaction(fn) {
      const run = queue.then(async () => {
        const writes = [];
        const tx = {
          get: async (r) => snap(r.path),
          set: (r, data, opt) => writes.push(() => r.set(data, opt)),
          update: (r, data) => writes.push(() => {
            assert.ok(docs.has(r.path), 'update of a missing doc');
            docs.set(r.path, { ...docs.get(r.path), ...clone(data) });
          }),
        };
        const result = await fn(tx);
        for (const w of writes) await w();
        return result;
      });
      queue = run.catch(() => {});
      return run;
    },
  };
  return db;
}
const FieldValue = { serverTimestamp: () => '<server-time>' };

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}\n${err.stack}`);
    process.exitCode = 1;
  }
}

function service(db = fakeFirestore()) {
  let n = 0;
  const svc = createLaunchService({
    getAdmin: async () => ({ db, FieldValue }),
    now: () => '2026-10-01T00:00:00.000Z',
    newId: () => `inst-${++n}`,
  });
  return { db, svc };
}

// Every key and field License.h reads, with the right types.
function assertActivateShape(body) {
  assert.equal(typeof body.activated, 'boolean');
  assert.ok('error' in body);
  assert.equal(typeof body.meta, 'object');
  if (body.activated) {
    assert.equal(body.error, null);
    assert.equal(typeof body.instance.id, 'string');
    assert.equal(typeof body.instance.name, 'string');
    assert.equal(body.license_key.status, 'active');
    assert.equal(typeof body.license_key.activation_limit, 'number');
    assert.equal(typeof body.license_key.activation_usage, 'number');
    assert.deepEqual(body.meta, { store_id: STORE_ID, product_id: PRODUCT_IDS.bundle, product_name: 'SubverseLab Launch Bundle' });
  } else {
    assert.equal(typeof body.error, 'string');
  }
}

console.log('launchLicence.js');

await test('key format: SVL- + 4×4 Crockford base32', () => {
  for (let i = 0; i < 2000; i += 1) {
    assert.match(generateKey(), /^SVL-[0-9ABCDEFGHJKMNPQRSTVWXYZ]{4}(-[0-9ABCDEFGHJKMNPQRSTVWXYZ]{4}){3}$/);
  }
  assert.equal(generateKey(Buffer.alloc(16, 0)), 'SVL-0000-0000-0000-0000');
  assert.equal(generateKey(Buffer.alloc(16, 255)), 'SVL-ZZZZ-ZZZZ-ZZZZ-ZZZZ');
  const seen = new Set(Array.from({ length: 5000 }, () => generateKey()));
  assert.equal(seen.size, 5000);
});

await test('normaliser: case, spaces, missing dashes, O→0 and I/L→1', () => {
  const k = 'SVL-7K2M-9QXD-4RTA-HB3N';
  for (const v of [k, k.toLowerCase(), ` ${k} `, 'svl 7k2m 9qxd 4rta hb3n', 'SVL7K2M9QXD4RTAHB3N', 'svl-7k2m-9qxd-4rta-hb3n\n']) {
    assert.equal(normaliseKey(v), k, v);
  }
  assert.equal(normaliseKey('SVL-O0IL-0000-0000-0000'), 'SVL-0011-0000-0000-0000');
  for (const bad of ['', 'SVL-', 'SVL-7K2M-9QXD-4RTA', 'SVL-7K2M-9QXD-4RTA-HB3NX', 'ABC-7K2M-9QXD-4RTA-HB3N',
    'SVL-7K2M-9QXD-4RTA-HB3U', null, undefined, 42, { k }]) {
    assert.equal(normaliseKey(bad), null, String(bad));
  }
});

await test('claim: creates the key, the dashboard entry and bumps the counter', async () => {
  const { db, svc } = service();
  const r = await svc.claim({ uid: 'u1', email: 'A@Example.com' });
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.body).sort(), ['claimed', 'key', 'total']);
  assert.equal(r.body.claimed, 1);
  assert.equal(r.body.total, LAUNCH_TOTAL);
  const key = r.body.key;
  assert.equal(normaliseKey(key), key);
  const rec = db.docs.get(`launch_keys/${key}`);
  assert.deepEqual(rec, {
    email: 'a@example.com', uid: 'u1', product: 'bundle', product_id: 9003, status: 'active',
    activation_limit: 3, instances: {}, created: '2026-10-01T00:00:00.000Z',
  });
  const lic = db.docs.get('plugin_licenses/a@example.com').licenses[key];
  assert.equal(lic.product, 'bundle');
  assert.equal(lic.key_short, key.slice(-4));
  assert.equal(lic.source, 'launch');
  assert.equal(lic.activation_limit, 3);
  assert.equal(lic.instances_count, 0);
  assert.equal(db.docs.get('launch/counter').claimed, 1);
  assert.deepEqual(await svc.readCounter(), { total: 1000, claimed: 1 });
});

await test('claim: idempotent per account and per e-mail, and keeps LS entries', async () => {
  const { db, svc } = service();
  db.docs.set('plugin_licenses/a@example.com', { email: 'a@example.com', licenses: { 123: { license_id: '123', product: 'kubbe' } } });
  const first = await svc.claim({ uid: 'u1', email: 'a@example.com' });
  const again = await svc.claim({ uid: 'u1', email: 'a@example.com' });
  const sameMailOtherAccount = await svc.claim({ uid: 'u2', email: 'A@EXAMPLE.COM' });
  const sameAccountOtherMail = await svc.claim({ uid: 'u1', email: 'b@example.com' });
  for (const r of [again, sameMailOtherAccount, sameAccountOtherMail]) {
    assert.equal(r.status, 200);
    assert.equal(r.body.key, first.body.key);
    assert.equal(r.body.claimed, 1);
  }
  assert.equal(db.docs.get('launch/counter').claimed, 1);
  assert.ok(db.docs.get('plugin_licenses/a@example.com').licenses['123'], 'the webhook entry survives the merge');
});

await test('claim: concurrent requests from one person still make one key', async () => {
  const { db, svc } = service();
  const rs = await Promise.all(Array.from({ length: 10 }, () => svc.claim({ uid: 'u1', email: 'a@example.com' })));
  assert.equal(new Set(rs.map((r) => r.body.key)).size, 1);
  assert.equal(db.docs.get('launch/counter').claimed, 1);
});

await test('claim: refuses with 410 at 1,000 but still returns existing keys', async () => {
  const { db, svc } = service();
  const early = await svc.claim({ uid: 'early', email: 'early@example.com' });
  db.docs.set('launch/counter', { claimed: 1000 });
  const late = await svc.claim({ uid: 'late', email: 'late@example.com' });
  assert.equal(late.status, 410);
  assert.equal(late.body.error, SOLD_OUT);
  assert.equal(late.body.error, 'All 1,000 launch licences are taken');
  const again = await svc.claim({ uid: 'early', email: 'early@example.com' });
  assert.equal(again.status, 200);
  assert.equal(again.body.key, early.body.key);
  assert.equal(db.docs.get('launch/counter').claimed, 1000);
});

await test('claim: the 1,000th is the last (runs 1,005 claims)', async () => {
  const { db, svc } = service();
  let ok = 0; let gone = 0;
  for (let i = 0; i < 1005; i += 1) {
    const r = await svc.claim({ uid: `u${i}`, email: `p${i}@example.com` });
    if (r.status === 200) ok += 1; else if (r.status === 410) gone += 1;
  }
  assert.equal(ok, 1000);
  assert.equal(gone, 5);
  assert.equal(db.docs.get('launch/counter').claimed, 1000);
});

await test('claim: rejects a missing uid or e-mail', async () => {
  const { svc } = service();
  assert.equal((await svc.claim({ uid: '', email: 'a@example.com' })).status, 400);
  assert.equal((await svc.claim({ uid: 'u', email: '' })).status, 400);
});

await test('activate: three computers, then the limit; LS shape throughout', async () => {
  const { db, svc } = service();
  const { key } = (await svc.claim({ uid: 'u1', email: 'a@example.com' })).body;
  const ids = [];
  for (let i = 1; i <= 3; i += 1) {
    const r = await svc.activate({ licenseKey: key.toLowerCase().replace(/-/g, ' '), instanceName: `Mac ${i}` });
    assert.equal(r.status, 200);
    assertActivateShape(r.body);
    assert.equal(r.body.activated, true);
    assert.equal(r.body.license_key.key_short, key.slice(-4));
    assert.equal(r.body.license_key.activation_limit, 3);
    assert.equal(r.body.license_key.activation_usage, i);
    assert.equal(r.body.instance.name, `Mac ${i}`);
    ids.push(r.body.instance.id);
  }
  const fourth = await svc.activate({ licenseKey: key, instanceName: 'Mac 4' });
  assert.equal(fourth.status, 400);
  assertActivateShape(fourth.body);
  assert.equal(fourth.body.error, 'This license key has reached the activation limit.');
  assert.equal(fourth.body.license_key.activation_usage, 3);
  assert.deepEqual(fourth.body.meta, {});
  assert.equal(db.docs.get('plugin_licenses/a@example.com').licenses[key].instances_count, 3);

  // Releasing one computer frees a slot.
  const d = await svc.deactivate({ licenseKey: key, instanceId: ids[0] });
  assert.equal(d.status, 200);
  assert.equal(d.body.deactivated, true);
  assert.equal(d.body.error, null);
  assert.equal(db.docs.get('plugin_licenses/a@example.com').licenses[key].instances_count, 2);
  const again = await svc.activate({ licenseKey: key, instanceName: 'Mac 4' });
  assert.equal(again.body.activated, true);
});

await test('activate: unknown, malformed and disabled keys', async () => {
  const { db, svc } = service();
  const unknown = await svc.activate({ licenseKey: 'SVL-0000-0000-0000-0000', instanceName: 'Mac' });
  assert.equal(unknown.status, 404);
  assertActivateShape(unknown.body);
  assert.equal(unknown.body.error, 'This license key was not found.');
  assert.equal(unknown.body.license_key, undefined);
  const junk = await svc.activate({ licenseKey: 'hello', instanceName: 'Mac' });
  assert.equal(junk.body.error, 'This license key was not found.');

  const { key } = (await svc.claim({ uid: 'u1', email: 'a@example.com' })).body;
  db.docs.get(`launch_keys/${key}`).status = 'disabled';
  const disabled = await svc.activate({ licenseKey: key, instanceName: 'Mac' });
  assert.equal(disabled.status, 400);
  assert.equal(disabled.body.activated, false);
  assert.equal(disabled.body.error, 'This license key is disabled.');
  assert.equal(disabled.body.license_key.status, 'disabled');
});

await test('validate: valid instance, gone instance, disabled key, unknown key', async () => {
  const { db, svc } = service();
  const { key } = (await svc.claim({ uid: 'u1', email: 'a@example.com' })).body;
  const { instance } = (await svc.activate({ licenseKey: key, instanceName: 'Studio' })).body;

  const ok = await svc.validate({ licenseKey: key, instanceId: instance.id });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.valid, true);
  assert.equal(ok.body.error, null);
  assert.equal(ok.body.license_key.status, 'active');
  assert.deepEqual(ok.body.instance, { id: instance.id, name: 'Studio', created_at: '2026-10-01T00:00:00.000Z' });
  assert.equal(ok.body.meta.store_id, 1);
  assert.equal(ok.body.meta.product_id, 9003);

  const keyOnly = await svc.validate({ licenseKey: key });
  assert.equal(keyOnly.body.valid, true);
  assert.equal(keyOnly.body.instance, null);

  const gone = await svc.validate({ licenseKey: key, instanceId: 'nope' });
  assert.equal(gone.body.valid, false);
  assert.equal(typeof gone.body.error, 'string');

  const unknown = await svc.validate({ licenseKey: 'SVL-0000-0000-0000-0000', instanceId: instance.id });
  assert.equal(unknown.status, 404);
  assert.equal(unknown.body.valid, false);
  assert.equal(unknown.body.instance, null);

  db.docs.get(`launch_keys/${key}`).status = 'disabled';
  const disabled = await svc.validate({ licenseKey: key, instanceId: instance.id });
  assert.equal(disabled.body.valid, false);
  assert.equal(disabled.body.error, 'This license key is disabled.');
  assert.equal(disabled.body.license_key.status, 'disabled');
});

await test('deactivate: unknown key, missing and unknown instance', async () => {
  const { svc } = service();
  const { key } = (await svc.claim({ uid: 'u1', email: 'a@example.com' })).body;
  for (const [args, status] of [
    [{ licenseKey: 'SVL-0000-0000-0000-0000', instanceId: 'x' }, 404],
    [{ licenseKey: key, instanceId: '' }, 400],
    [{ licenseKey: key, instanceId: 'x' }, 404],
  ]) {
    const r = await svc.deactivate(args);
    assert.equal(r.status, status);
    assert.equal(r.body.deactivated, false);
    assert.equal(typeof r.body.error, 'string');
  }
});

await test('token bucket: 30 a minute per IP, refills', () => {
  let t = 0;
  const take = tokenBucket({ perMinute: 30, clock: () => t });
  for (let i = 0; i < 30; i += 1) assert.equal(take('1.2.3.4'), true);
  assert.equal(take('1.2.3.4'), false);
  assert.equal(take('5.6.7.8'), true, 'another IP has its own bucket');
  t += 2000; // two seconds = one token
  assert.equal(take('1.2.3.4'), true);
  assert.equal(take('1.2.3.4'), false);
});

console.log(`${passed} passed${process.exitCode ? ', some FAILED' : ''}`);
