// The live catalogue (api/catalog.js, api/catalogSchema.js, src/catalog/catalog.js merges): the schema accepts and
// rejects what it should, new products register with the entitlements, the public view hides what is not live, the
// Lemon Squeezy id map resolves, the manifest publish writes what publish_download.sh writes, and the browser merges lay
// live items over the static data without touching the hand-written ones.
// Run: node scripts/test-catalog.js
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const { cleanDoc, liveAt, FIELDS, KINDS } = await import('../api/catalogSchema.js');
const ent = await import('../api/entitlements.js');
const { createCatalogService } = await import('../api/catalog.js');
void root;

let failed = 0; let passed = 0;
async function test(name, fn) {
  try { await fn(); passed += 1; console.log(`PASS ${name}`); } catch (error) { failed += 1; console.log(`FAIL ${name}: ${error.message}`); }
}

// ---- A tiny Firestore and Storage ------------------------------------------------------------------------------------
function fakeDb() {
  const store = new Map();   // "collection/id" -> data
  const col = (name) => ({
    get: async () => ({ docs: [...store.entries()].filter(([k]) => k.startsWith(`${name}/`)).map(([k, v]) => ({ id: k.slice(name.length + 1), data: () => ({ ...v }) })) }),
    doc: (id) => ({
      get: async () => { const v = store.get(`${name}/${id}`); return { exists: v !== undefined, data: () => (v ? { ...v } : undefined) }; },
      set: async (data, opts) => { const clean = JSON.parse(JSON.stringify(data)); store.set(`${name}/${id}`, opts?.merge ? { ...(store.get(`${name}/${id}`) || {}), ...clean } : clean); },
      delete: async () => { store.delete(`${name}/${id}`); },
    }),
  });
  return { db: { collection: col }, store };
}
function fakeStorage() {
  const objects = new Map();   // bucket/path -> { data, meta }
  const bucket = (b) => ({
    file: (path) => {
      const key = `${b}/${path}`;
      return {
        getSignedUrl: async () => [`https://signed.example/${key}`],
        getMetadata: async () => { const o = objects.get(key); if (!o) throw new Error('No such object'); return [{ size: String(o.data.length), contentType: o.meta.contentType, metadata: o.meta.metadata || {} }]; },
        setMetadata: async (m) => { const o = objects.get(key); o.meta = { ...o.meta, ...m, metadata: { ...(o.meta.metadata || {}), ...(m.metadata || {}) } }; },
        download: async () => { const o = objects.get(key); if (!o) throw new Error('No such object'); return [Buffer.from(o.data)]; },
        save: async (data, opts) => { objects.set(key, { data: String(data), meta: { contentType: opts?.contentType, metadata: opts?.metadata || {} } }); },
      };
    },
  });
  return { storage: { bucket }, objects, put: (b, path, data, contentType = 'application/octet-stream') => objects.set(`${b}/${path}`, { data, meta: { contentType, metadata: {} } }) };
}

// ---- Schema ------------------------------------------------------------------------------------------------------------
await test('schema: every kind has an id, a published flag and the fields the pages read', () => {
  for (const kind of KINDS) {
    const keys = FIELDS[kind].map((f) => f.key);
    assert.ok(keys.includes('id') && keys.includes('published'), kind);
  }
  assert.ok(FIELDS.plugins.map((f) => f.key).includes('cardImage'));
  assert.ok(FIELDS.samplePacks.map((f) => f.key).includes('listedAt'));
});
await test('schema: a good news item passes, a bad one names every problem', () => {
  const ok = cleanDoc('news', { id: 'Seda-Update', title: 'SEDA 1.1', line: 'A new version.', bare: 'bare', order: '15', to: '/plugins/seda', cta: 'See SEDA', image: 'https://firebasestorage.googleapis.com/x.webp' });
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.doc.id, 'seda-update'); assert.equal(ok.doc.order, 15); assert.equal(ok.doc.published, true);
  const bad = cleanDoc('news', { id: 'Bad Key!', line: '', to: 'javascript:alert(1)', image: 'ftp://x', bare: 'huge' });
  assert.ok(bad.errors.some((e) => e.startsWith('Key:')));
  assert.ok(bad.errors.some((e) => e.startsWith('Title:')));
  assert.ok(bad.errors.some((e) => e.startsWith('Line:')));
  assert.ok(bad.errors.some((e) => e.startsWith('Button link:')));
  assert.ok(bad.errors.some((e) => e.startsWith('Picture:')));
  assert.ok(bad.errors.some((e) => e.startsWith('Picture frame:')));
});
await test('schema: plug-in money rules', () => {
  const r = cleanDoc('plugins', { id: 'harmony', displayName: 'HARMONY', kind: 'Harmonizer', tagline: 'x', intro: 'y', cardImage: '/plugins/harmony/panel.webp', price: 12, launchPrice: 15, checkout: 'https://example.com/buy' });
  assert.ok(r.errors.some((e) => e.startsWith('Launch price:')));
  assert.ok(r.errors.some((e) => e.includes('Lemon Squeezy')));
  const ok = cleanDoc('plugins', { id: 'harmony', displayName: 'HARMONY', kind: 'Harmonizer', tagline: 'x', intro: 'y', cardImage: '/plugins/harmony/panel.webp', price: '12', launchPrice: 7, launchEnds: '2026-12-01', checkout: 'https://subverselab.lemonsqueezy.com/checkout/buy/abc', lsProductId: '1499999', imageSize: '1600,602', controls: [['POWER', 'On and off']], sections: [{ heading: 'A', text: 'B' }] });
  assert.deepEqual(ok.errors, []);
  assert.deepEqual(ok.doc.imageSize, [1600, 602]); assert.equal(ok.doc.price, 12); assert.equal(ok.doc.noKey, true);
});
await test('schema: sample pack listedAt is normalised to ISO and required', () => {
  const r = cleanDoc('samplePacks', { id: 'dunes', name: 'Dunes', kindLine: 'desert loops', cover: '/x.jpg', listedAt: '2026-11-05T00:00:00+03:00' });
  assert.deepEqual(r.errors, []); assert.equal(r.doc.listedAt, '2026-11-04T21:00:00.000Z');
  assert.ok(cleanDoc('samplePacks', { id: 'dunes', name: 'Dunes', kindLine: 'x', cover: '/x.jpg' }).errors.some((e) => e.startsWith('On sale from:')));
});
await test('liveAt: published flag and time window', () => {
  const t = Date.parse('2026-11-10T12:00:00Z');
  assert.equal(liveAt({ published: true }, t), true);
  assert.equal(liveAt({ published: false }, t), false);
  assert.equal(liveAt({ published: true, publishAt: '2026-11-11T00:00:00Z' }, t), false);
  assert.equal(liveAt({ published: true, unpublishAt: '2026-11-10T12:00:00Z' }, t), false);
  assert.equal(liveAt({ published: true, publishAt: '2026-11-01T00:00:00Z', unpublishAt: '2026-12-01T00:00:00Z' }, t), true);
});

// ---- Entitlement registration ----------------------------------------------------------------------------------------------
await test('registerCatalogProducts: new slugs join every list in place; known slugs are untouched', () => {
  const packsBefore = [...ent.PACK_SLUGS]; const pluginsBefore = [...ent.PLUGIN_SLUGS];
  const keepMirage = ent.SAMPLE_PACK_LISTED.mirage;
  const changed = ent.registerCatalogProducts({
    samplePacks: [{ slug: 'dunes', listedAt: '2026-11-05T00:00:00Z' }, { slug: 'mirage', listedAt: '2020-01-01T00:00:00Z' }, { slug: 'Bad Slug' }],
    presetPacks: [{ slug: 'racks-piano', free: true }, { slug: 'ru8-fx-pack', listedAt: '2026-11-06T00:00:00Z' }],
    plugins: [{ slug: 'harmony' }, { slug: 'gift', free: true }, { slug: 'kubbe' }],
  });
  assert.equal(changed, true);
  assert.equal(ent.SAMPLE_PACK_LISTED.mirage, keepMirage, 'a known pack keeps its listing moment');
  assert.ok(!('bad slug' in ent.SAMPLE_PACK_LISTED));
  assert.ok(ent.PACK_SLUGS.includes('dunes') && ent.PACK_SLUGS.includes('ru8-fx-pack'));
  for (const s of packsBefore) assert.ok(ent.PACK_SLUGS.includes(s), `${s} still listed`);
  assert.equal(ent.PACK_SLUGS.length, packsBefore.length + 2);
  assert.ok(ent.SAMPLE_PACK_SLUGS.includes('dunes') && ent.PRESET_PACK_SLUGS.includes('ru8-fx-pack'));
  assert.ok(ent.SWEEP_SLUGS.includes('dunes') && !ent.SWEEP_SLUGS.includes('ru8-fx-pack'));
  assert.ok(ent.MEMBER_PACK_SLUGS.includes('racks-piano'));
  assert.ok(ent.SOLO_SLUGS.includes('harmony') && ent.FREE_SLUGS.includes('gift'));
  assert.equal(ent.PLUGIN_SLUGS.length, pluginsBefore.length + 2);
  assert.deepEqual(ent.PLUGIN_SLUGS.slice(0, ent.ALL_SLUGS.length), ent.ALL_SLUGS, 'the paid singles still come first');
  assert.ok(ent.OWNABLE_SLUGS.includes('dunes') && ent.OWNABLE_SLUGS.includes('harmony'));
  assert.equal(ent.registerCatalogProducts({ plugins: [{ slug: 'harmony' }] }), false, 'a second call with known slugs changes nothing');
});
await test('a paid order for a catalogue pack opens it; a sweep bought after its listing includes it, before does not', () => {
  const orders = (created) => ({ 1: { product: 'sweep', status: 'paid', refunded: false, created, amount_usd_cents: 2500 } });
  assert.ok(ent.ownedFromOrders(orders('2026-11-06T00:00:00Z')).includes('dunes'));
  assert.ok(!ent.ownedFromOrders(orders('2026-11-04T00:00:00Z')).includes('dunes'));
  assert.deepEqual(ent.ownedFromOrders({ 2: { product: 'dunes', status: 'paid', refunded: false, created: '2026-11-07T00:00:00Z', amount_usd_cents: 500 } }), ['dunes']);
  assert.deepEqual(ent.ownedFromOrders({ 3: { product: 'dunes', status: 'paid', refunded: false, created: '2026-11-07T00:00:00Z', amount_usd_cents: 0 } }), [], 'no free path for a pack');
  assert.deepEqual(ent.ownedFromOrders({ 4: { product: 'harmony', status: 'paid', refunded: false, created: '2026-11-07T00:00:00Z' } }), ['harmony']);
});

// ---- The service -----------------------------------------------------------------------------------------------------------
const { db, store } = fakeDb();
const st = fakeStorage();
let clock = Date.parse('2026-11-10T12:00:00Z');
const svc = createCatalogService({ getAdmin: async () => ({ db }), getStorage: async () => st.storage, now: () => clock });

await test('service: save validates, stamps and reloads; the public view hides unpublished and future items', async () => {
  const bad = await svc.save('news', { id: 'x!', title: 'T', line: 'L' });
  assert.equal(bad.status, 400); assert.ok(bad.errors.length);
  const ok = await svc.save('news', { id: 'seda-update', title: 'SEDA 1.1', line: 'New.', order: 15 });
  assert.equal(ok.ok, true); assert.equal(store.get('catalog_news/seda-update').title, 'SEDA 1.1'); assert.ok(store.get('catalog_news/seda-update').createdAt);
  await svc.save('news', { id: 'hidden', title: 'H', line: 'L', published: false });
  await svc.save('news', { id: 'later', title: 'F', line: 'L', publishAt: '2026-12-01T00:00:00Z' });
  await svc.save('plugins', { id: 'harmony2', displayName: 'HARMONY', kind: 'Harmonizer', tagline: 't', intro: 'i', cardImage: '/p.webp', price: 12, checkout: 'https://subverselab.lemonsqueezy.com/checkout/buy/h', lsProductId: '1499001' });
  await svc.save('samplePacks', { id: 'dunes2', name: 'Dunes', kindLine: 'k', cover: '/c.jpg', listedAt: '2026-11-05T00:00:00Z', lsProductId: '1499002', price: 5, checkout: 'https://subverselab.lemonsqueezy.com/checkout/buy/d' });
  const cat = await svc.load({ force: true });
  const pub = svc.publicView(cat, clock);
  assert.deepEqual(pub.news.map((n) => n.id), ['seda-update']);
  assert.equal(pub.plugins[0].lsProductId, undefined, 'product ids are not public');
  assert.deepEqual(svc.slugs(cat, clock), { plugins: ['harmony2'], samplePacks: ['dunes2'] });
  assert.equal(svc.slugFor('1499001'), 'harmony2'); assert.equal(svc.slugFor(1499002), 'dunes2'); assert.equal(svc.slugFor('1'), null);
  assert.ok(ent.SOLO_SLUGS.includes('harmony2') && ent.SAMPLE_PACK_SLUGS.includes('dunes2'), 'saved products are registered');
  const edit = await svc.save('news', { id: 'seda-update', title: 'SEDA 1.1 is out', line: 'New.', order: 15 });
  assert.equal(store.get('catalog_news/seda-update').createdAt, ok.doc.createdAt, 'an edit keeps createdAt');
  assert.ok(edit.ok);
  await svc.remove('news', 'hidden');
  assert.ok(!store.has('catalog_news/hidden'));
});
await test('service: the cache answers for a minute, then reloads; a failing Firestore keeps the last copy', async () => {
  const a = await svc.load();
  store.set('catalog_news/direct', { title: 'D', line: 'L', published: true });
  assert.ok(!(await svc.load()).news.some((n) => n.id === 'direct'), 'cached');
  clock += 61_000;
  assert.ok((await svc.load()).news.some((n) => n.id === 'direct'), 'reloaded after a minute');
  const broken = createCatalogService({ getAdmin: async () => { throw new Error('UNAVAILABLE'); }, getStorage: async () => st.storage, now: () => clock });
  const e = await broken.load();
  assert.deepEqual(e.news, []);
  void a;
});
await test('service: media upload URL is scoped to catalog/<kind>/<slug>/, complete adds the download token', async () => {
  const u = await svc.mediaUploadUrl({ kind: 'image', filename: '../../My Cover (1).PNG', group: 'samplePacks', slug: 'dunes2' });
  assert.ok(u.uploadUrl && u.objectPath.startsWith('catalog/samplePacks/dunes2/') && u.objectPath.endsWith('My-Cover-1-.PNG'), u.objectPath);
  assert.equal(u.headers['Content-Type'], 'image/png');
  assert.equal((await svc.mediaUploadUrl({ kind: 'image', filename: 'x.exe' })).status, 400);
  assert.equal((await svc.mediaUploadUrl({ kind: 'zip', filename: 'x.zip' })).status, 400, 'sold files do not go to the media bucket');
  st.put('project-62238635-aae4-41f4-880.firebasestorage.app', u.objectPath, 'PNGDATA', 'image/png');
  const done = await svc.mediaComplete({ objectPath: u.objectPath });
  assert.ok(done.ok && done.url.startsWith('https://firebasestorage.googleapis.com/v0/b/project-62238635-aae4-41f4-880.firebasestorage.app/o/catalog%2FsamplePacks%2Fdunes2%2F') && done.url.includes('alt=media&token='), done.url);
  assert.equal((await svc.mediaComplete({ objectPath: 'plugins/x/1.0.0/a.pkg' })).status, 400);
  assert.equal((await svc.mediaComplete({ objectPath: 'catalog/misc/shared/missing.png' })).status, 404);
});
await test('service: publishFile writes the manifest entry publish_download.sh writes, and removeFile takes it out', async () => {
  const u = await svc.fileUploadUrl({ slug: 'dunes2', version: '1.0.0', filename: 'SVL_Dunes.zip' });
  assert.equal(u.objectPath, 'plugins/dunes2/1.0.0/SVL_Dunes.zip');
  assert.equal((await svc.fileUploadUrl({ slug: 'dunes2', version: '1.0.0', filename: 'SVL Dunes.exe' })).status, 400);
  assert.equal((await svc.fileUploadUrl({ slug: 'dunes2', version: '1.0 0', filename: 'a.zip' })).status, 400);
  st.put('subverselab-downloads', 'plugins/kubbe/1.1.0/Kubbe-1.1.0-macOS.pkg', 'PKG');
  st.put('subverselab-downloads', 'plugins/manifest.json', JSON.stringify({ kubbe: { version: '1.1.0', files: { mac: { url: 'u', size: 3, name: 'Kubbe-1.1.0-macOS.pkg', version: '1.1.0', object: 'plugins/kubbe/1.1.0/Kubbe-1.1.0-macOS.pkg' } } } }));
  assert.equal((await svc.publishFile({ slug: 'dunes2', platform: 'zip', version: '1.0.0', objectPath: u.objectPath })).status, 404, 'nothing uploaded yet');
  st.put('subverselab-downloads', u.objectPath, 'Z'.repeat(1234), 'application/zip');
  const pub = await svc.publishFile({ slug: 'dunes2', platform: 'zip', version: '1.0.0', objectPath: u.objectPath });
  assert.ok(pub.ok);
  const m = JSON.parse(st.objects.get('subverselab-downloads/plugins/manifest.json').data);
  assert.deepEqual(Object.keys(m), ['dunes2', 'kubbe'], 'sorted keys');
  assert.deepEqual(m.dunes2, { version: '1.0.0', files: { zip: { url: 'https://storage.googleapis.com/subverselab-downloads/plugins/dunes2/1.0.0/SVL_Dunes.zip', size: 1234, name: 'SVL_Dunes.zip', version: '1.0.0', object: 'plugins/dunes2/1.0.0/SVL_Dunes.zip' } } });
  assert.equal(st.objects.get('subverselab-downloads/plugins/manifest.json').meta.metadata.cacheControl, 'no-cache, max-age=0');
  assert.equal((await svc.publishFile({ slug: 'dunes2', platform: 'zip', version: '1.0.1', objectPath: u.objectPath })).status, 400, 'version must match the path');
  assert.equal((await svc.publishFile({ slug: 'kubbe', platform: 'mac', version: '1.0.0', objectPath: 'plugins/dunes2/1.0.0/SVL_Dunes.zip' })).status, 400, 'slug must match the path');
  await svc.removeFile({ slug: 'dunes2', platform: 'zip' });
  const m2 = JSON.parse(st.objects.get('subverselab-downloads/plugins/manifest.json').data);
  assert.equal(m2.dunes2.version, null); assert.deepEqual(m2.dunes2.files, {});
  await svc.removeFile({ slug: 'dunes2' });
  assert.ok(!('dunes2' in JSON.parse(st.objects.get('subverselab-downloads/plugins/manifest.json').data)));
});

await test('service: direct uploads store the body with the right type, token and path; signing failures are named', async () => {
  const m = await svc.mediaDirect({ kind: 'image', filename: 'Cover.webp', group: 'news', slug: 'seda-update', body: Buffer.from('WEBP') });
  assert.ok(m.ok && m.url.includes('alt=media&token=') && m.objectPath.startsWith('catalog/news/seda-update/'));
  assert.equal(st.objects.get(`project-62238635-aae4-41f4-880.firebasestorage.app/${m.objectPath}`).meta.contentType, 'image/webp');
  assert.equal((await svc.mediaDirect({ kind: 'image', filename: 'x.webp', body: Buffer.alloc(0) })).status, 400);
  assert.equal((await svc.mediaDirect({ kind: 'audio', filename: 'x.exe', body: Buffer.from('x') })).status, 400);
  const f = await svc.fileDirect({ slug: 'dunes2', version: '1.0.1', filename: 'SVL Dunes v2.zip', body: Buffer.from('ZIP') });
  assert.equal(f.objectPath, 'plugins/dunes2/1.0.1/SVL-Dunes-v2.zip');
  const pub = await svc.publishFile({ slug: 'dunes2', platform: 'zip', version: '1.0.1', objectPath: f.objectPath });
  assert.ok(pub.ok && pub.entry.version === '1.0.1');
  const noSign = createCatalogService({ getAdmin: async () => ({ db }), getStorage: async () => ({ bucket: () => ({ file: () => ({ getSignedUrl: async () => { throw new Error('Cannot sign data without `client_email`.'); } }) }) }), now: () => clock });
  const r = await noSign.mediaUploadUrl({ kind: 'image', filename: 'a.png' });
  assert.equal(r.status, 501); assert.equal(r.code, 'cannot-sign');
  assert.equal((await noSign.fileUploadUrl({ slug: 'x', version: '1.0.0', filename: 'a.zip' })).code, 'cannot-sign');
});

// ---- The browser merges (pure functions; the module also imports React and the data, which load under Node) ------------------
const merges = { ...(await import('../src/catalog/merge.js')), ...(await import('../src/catalog/data.js')) };
await test('mergeNews: a live key edits or hides a static frame, a new key is placed by order', () => {
  const statics = [{ key: 'a', title: 'A', line: 'la', kicker: 'ka' }, { key: 'b', title: 'B', line: 'lb' }, { key: 'c', title: 'C', line: 'lc' }];
  const live = [
    { id: 'b', published: false },
    { id: 'a', title: 'A edited', line: '', published: true },
    { id: 'new', title: 'N', line: 'ln', order: 15, published: true },
    { id: 'tail', title: 'T', line: 'lt', published: true },
    { id: 'future', title: 'F', line: 'lf', publishAt: '2099-01-01T00:00:00Z', published: true },
  ];
  const out = merges.mergeNews(statics, live, Date.parse('2026-11-10T00:00:00Z'));
  assert.deepEqual(out.map((n) => n.key), ['a', 'new', 'c', 'tail']);
  assert.equal(out[0].title, 'A edited'); assert.equal(out[0].line, 'la', 'an empty live field keeps the static value'); assert.equal(out[0].kicker, 'ka');
  assert.equal(out[1].live, true);
});
await test('mergeSamplePacks / mergePresetPacks / catalogPlugins: edits over known slugs, new slugs as catalogOnly', () => {
  const statics = [{ slug: 'brickyard', name: 'Brickyard', kindLine: 'kit', cover: { jpg: '/b.jpg', webp: '/b.webp', small: '/b-600.webp' }, snippet: { src: '/b.mp3', seconds: 30 } }];
  const out = merges.mergeSamplePacks(statics, [{ id: 'brickyard', kindLine: 'hip hop drum kit', cover: 'https://x/c.png', published: true }, { id: 'dunes', name: 'Dunes', kindLine: 'k', cover: 'https://x/d.png', snippet: 'https://x/d.mp3', listedAt: '2026-11-05T00:00:00Z', published: true }, { id: 'gone', name: 'G', kindLine: 'k', cover: '/g.jpg', published: false }]);
  assert.equal(out.length, 2);
  assert.equal(out[0].kindLine, 'hip hop drum kit'); assert.equal(out[0].cover.jpg, 'https://x/c.png'); assert.equal(out[0].snippet.seconds, 30); assert.equal(out[0].catalogOnly, undefined);
  assert.equal(out[1].catalogOnly, true); assert.equal(out[1].snippet.src, 'https://x/d.mp3'); assert.equal(out[1].fullName, 'SVL Dunes');
  const pp = merges.mergePresetPacks([{ id: 'ru8-drum-pack', name: 'RU-8 Drum Pack', inside: ['a'] }], [{ id: 'racks-piano', name: 'Piano Racks', kind: 'Racks', cover: '/p.jpg', summary: 's', free: true, published: true }]);
  assert.equal(pp.length, 2); assert.equal(pp[1].free, true); assert.equal(pp[1].image, '/p.jpg'); assert.deepEqual(pp[1].imageSize, [600, 600]);
  const pl = merges.catalogPlugins([{ id: 'harmony', displayName: 'HARMONY', kind: 'Harmonizer', tagline: 't', intro: 'i', cardImage: '/h.webp', published: true }, { id: 'kubbe', displayName: 'X', published: true }], ['kubbe']);
  assert.equal(pl.length, 1); assert.equal(pl[0].path, '/plugins/harmony'); assert.equal(pl[0].launchId, 'solo'); assert.equal(pl[0].modes[0].image, '/h.webp'); assert.equal(pl[0].title, 'HARMONY: Harmonizer | SubverseLab');
});
await test('applyCatalogData: prices, checkouts, dates and the plug-in index take the live values', async () => {
  const { PRICES, CHECKOUT, LAUNCH_PRICES, CATALOG_PLUGIN_INDEX, pluginBySlug, MUSEHUB } = await import('../src/data/plugins.js');
  const { PACK_PRICES, PACK_CHECKOUT } = await import('../src/data/samplePackPrices.js');
  const { PRODUCT_DATES, latestRelease } = await import('../src/data/productDates.js');
  const kubbe = PRICES.kubbe;
  merges.applyCatalogData({
    plugins: [{ id: 'harmony', displayName: 'HARMONY', kind: 'k', tagline: 't', intro: 'i', cardImage: '/h.webp', price: 12, launchPrice: 7, launchEnds: '2026-12-01', checkout: 'https://subverselab.lemonsqueezy.com/checkout/buy/h', released: '2026-11-10', musehub: 'https://www.musehub.com/plugin/harmony', published: true }, { id: 'kubbe', price: 11, published: false }],
    samplePacks: [{ id: 'dunes', price: 5, checkout: 'https://subverselab.lemonsqueezy.com/checkout/buy/d', released: '2026-11-05', published: true }],
    presetPacks: [], news: [],
  });
  assert.equal(PRICES.harmony, 12); assert.equal(LAUNCH_PRICES.harmony, 7); assert.ok(CHECKOUT.harmony.endsWith('/h'));
  assert.equal(PRICES.kubbe, kubbe, 'a hidden live item changes nothing');
  assert.equal(PACK_PRICES.dunes, 5); assert.ok(PACK_CHECKOUT.dunes.endsWith('/d'));
  assert.deepEqual(PRODUCT_DATES.dunes, { released: '2026-11-05', updated: '2026-11-05' }); assert.equal(latestRelease('harmony'), '2026-11-10');
  assert.equal(pluginBySlug('harmony').displayName, 'HARMONY'); assert.equal(CATALOG_PLUGIN_INDEX.harmony.path, '/plugins/harmony');
  assert.equal(MUSEHUB.harmony, 'https://www.musehub.com/plugin/harmony');
});

// ---- Publishers, preview scenes, agent keys (owner 31 Oct: "tester ya da yayıncı almak için … agentlar dahi bu paneli kullanmalı") ----
await test('publishers: a kind of its own; products point at one; the public view never carries the e-mail', async () => {
  const { KINDS, cleanDoc, PRODUCT_KINDS } = await import(new URL('../api/catalogSchema.js', import.meta.url));
  assert.ok(KINDS.includes('publishers') && !PRODUCT_KINDS.includes('publishers'));
  const good = cleanDoc('publishers', { id: 'babasultan', name: 'BabaSultan', link: 'https://babasultan.art', email: 'x@y.z' });
  assert.deepEqual(good.errors, []); assert.equal(good.doc.role, 'producer'); assert.equal(good.doc.status, 'active');
  assert.ok(cleanDoc('publishers', { id: 'Bad Id', name: '' }).errors.length >= 2);
  const pack = cleanDoc('samplePacks', { id: 'p1', name: 'P', kindLine: 'k', cover: '/c.jpg', listedAt: '2026-11-05', publisher: 'babasultan', scenes: ['0 Intro', '12.5 Hook'], peaks: '/sample-packs/p1/peaks.json' });
  assert.deepEqual(pack.errors, []); assert.equal(pack.doc.publisher, 'babasultan'); assert.deepEqual(pack.doc.scenes, ['0 Intro', '12.5 Hook']);
  assert.ok(cleanDoc('samplePacks', { id: 'p1', name: 'P', kindLine: 'k', cover: '/c.jpg', listedAt: '2026-11-05', publisher: 'Not A Slug' }).errors.some((e) => /publisher id/i.test(e)));
  for (const kind of ['plugins', 'presetPacks']) assert.ok(cleanDoc(kind, {}).doc.publisher === '', `${kind} has a publisher field`);
  const { createCatalogService } = await import(new URL('../api/catalog.js', import.meta.url));
  const { db, store } = fakeDb();
  const svc2 = createCatalogService({ getAdmin: async () => ({ db }), getStorage: async () => fakeStorage().storage, now: () => Date.parse('2026-11-10T12:00:00Z') });
  const saved = await svc2.save('publishers', { id: 'babasultan', name: 'BabaSultan', link: 'https://babasultan.art', email: 'secret@example.com' });
  assert.ok(saved.ok); assert.equal(store.get('catalog_publishers/babasultan').email, 'secret@example.com');
  const pub = svc2.publicView(await svc2.load({ force: true }));
  assert.equal(pub.publishers.length, 1); assert.equal(pub.publishers[0].email, undefined, 'e-mail is private'); assert.equal(pub.publishers[0].name, 'BabaSultan');
});
await test('shapes: scene lines become markers; a catalogue pack carries peaks, scenes and its publisher; publisherOf resolves it', async () => {
  const { parseScenes, samplePackFromDoc, presetPackFromDoc, pluginFromDoc } = await import(new URL('../src/catalog/shapes.js', import.meta.url));
  assert.deepEqual(parseScenes(['12.5 - Hook', '0 Intro', 'nonsense', '30']), [{ t: 0, label: 'Intro' }, { t: 12.5, label: 'Hook' }, { t: 30, label: '' }]);
  const pack = samplePackFromDoc({ id: 'p1', name: 'P', kindLine: 'k', cover: '/c.jpg', snippet: '/s.mp3', peaks: '/p.json', scenes: ['0 A'], publisher: 'babasultan' });
  assert.equal(pack.peaks, '/p.json'); assert.deepEqual(pack.scenes, [{ t: 0, label: 'A' }]); assert.equal(pack.publisher, 'babasultan'); assert.equal(pack.snippet.src, '/s.mp3');
  const edit = samplePackFromDoc({ id: 'mirage', scenes: ['3 B'] }, { over: { slug: 'mirage', snippet: { src: '/m.mp3' } } });
  assert.deepEqual(edit.scenes, [{ t: 3, label: 'B' }]); assert.equal(edit.publisher, undefined, 'an empty field does not overwrite');
  assert.equal(presetPackFromDoc({ id: 'x', name: 'X', kind: 'k', cover: '/c.jpg', publisher: 'lab1' }).publisher, 'lab1');
  assert.equal(pluginFromDoc({ id: 'h', displayName: 'H', cardImage: '/h.png', publisher: 'lab1' }).publisher, 'lab1');
  const { publisherOf } = await import(new URL('../src/catalog/catalog.js', import.meta.url));
  const cat = { publishers: [{ id: 'babasultan', name: 'BabaSultan', link: 'https://babasultan.art', role: 'producer' }] };
  assert.deepEqual(publisherOf(cat, 'babasultan'), { id: 'babasultan', name: 'BabaSultan', link: 'https://babasultan.art', role: 'producer' });
  assert.equal(publisherOf(cat, ''), null); assert.equal(publisherOf(cat, 'nobody'), null);
});
await test('agent keys: made once, found by hash, revoked for good; a bad label or id is refused', async () => {
  const { createAgentStore, hashAgentKey, isAgentKey } = await import(new URL('../api/agents.js', import.meta.url));
  const { db, store } = fakeDb();
  const agents = createAgentStore(db, () => new Date('2026-10-31T12:00:00Z'));
  assert.equal((await agents.create({ label: 'bad/label' })).status, 400);
  const made = await agents.create({ label: 'claude-packs', by: 'info@subverselab.com' });
  assert.ok(made.ok && isAgentKey(made.key) && made.key.startsWith('svla_'));
  assert.ok(store.has(`catalog_agents/${hashAgentKey(made.key)}`), 'only the hash is stored');
  assert.equal(JSON.stringify([...store.values()]).includes(made.key), false, 'the key itself is never written');
  const found = await agents.find(made.key);
  assert.equal(found.label, 'claude-packs'); assert.equal(found.id, made.id);
  assert.equal(await agents.find('svla_not-a-real-key-at-all'), null); assert.equal(await agents.find('valid-owner'), null);
  assert.equal((await agents.list())[0].label, 'claude-packs');
  assert.equal((await agents.revoke('zz')).status, 400); assert.equal((await agents.revoke('0'.repeat(64))).status, 404);
  assert.ok((await agents.revoke(made.id)).ok);
  assert.equal(await agents.find(made.key), null, 'a revoked key opens nothing');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
