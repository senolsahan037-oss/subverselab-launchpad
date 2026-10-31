// Store order (root CLAUDE.md, owner 2026-10-28): every list of plug-ins, sample packs and preset packs is newest first by the
// product's latest release (src/data/productDates.js; a new version counts as a release), and every listed product has a date.
// Run: node scripts/test-order.js   (the dist/ checks need `npm run build` first; they are skipped without dist/)
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const { PRODUCT_DATES, latestRelease, byLatestRelease } = await import('../src/data/productDates.js');
const pl = await import('../src/data/plugins.js');
const { SAMPLE_PACK_LIST } = await import('../src/data/samplePacks.js');
const { visiblePacks } = await import('../src/data/packFacts.js');
const { PRESET_PACK_LIST } = await import('../src/data/presetPacks.js');
const ent = await import('../api/entitlements.js');
const { llmsProductIndex } = await import('./lib/llmsProducts.js');

let failed = 0; let passed = 0;
async function test(name, fn) {
  try { await fn(); passed += 1; console.log(`PASS ${name}`); } catch (error) { failed += 1; console.log(`FAIL ${name}: ${error.message}`); }
}
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const notOnSale = (p) => pl.LINE2_PLUGINS.includes(p) && !pl.CHECKOUT[p.slug];   // ADALET: "Coming soon", no date by design
const assertNewestFirst = (ids, what) => {
  for (let i = 1; i < ids.length; i += 1) {
    assert.ok(latestRelease(ids[i - 1]) >= latestRelease(ids[i]), `${what}: ${ids[i - 1]} (${latestRelease(ids[i - 1]) || 'no date'}) before ${ids[i]} (${latestRelease(ids[i])})`);
  }
};
const src = (f) => readFile(join(root, f), 'utf8');

await test('byLatestRelease: newest first, ties keep their order, undated last, input untouched', () => {
  const items = ['taban', 'adalet', 'kubbe', 'jingfang', 'kaset', 'nope'];
  const copy = [...items];
  assert.deepEqual(byLatestRelease(items), ['jingfang', 'kubbe', 'kaset', 'taban', 'adalet', 'nope']);
  assert.deepEqual(items, copy);
  assert.deepEqual(byLatestRelease([{ s: 'kaset' }, { s: 'kubbe' }], (x) => x.s).map((x) => x.s), ['kaset', 'kubbe'], 'equal dates keep the given order');
  assert.equal(latestRelease('elek'), '2026-10-22', 'an update counts as the release');
  assert.equal(latestRelease('adalet'), '');
});

await test('every date is ISO YYYY-MM-DD and released <= updated', () => {
  for (const [id, d] of Object.entries(PRODUCT_DATES)) {
    assert.ok(ISO.test(d.released) && ISO.test(d.updated), `${id}: ${JSON.stringify(d)}`);
    assert.ok(d.released <= d.updated, `${id}: updated before released`);
  }
});

await test('every listed product has a date (plug-ins, sample packs, preset packs; server lists too); no stale ids', () => {
  const pluginIds = pl.STORE_PLUGINS.filter((p) => !notOnSale(p)).map((p) => p.slug);
  const missing = [
    ...pluginIds, ...pl.ROOM_PLUGINS.filter((p) => !notOnSale(p)).map((p) => p.slug),
    ...SAMPLE_PACK_LIST.map((p) => p.slug), ...PRESET_PACK_LIST.map((p) => p.id),
    ...ent.PLUGIN_SLUGS, ...ent.PACK_SLUGS, ...ent.MEMBER_PACK_SLUGS,
  ].filter((id) => !(id in PRODUCT_DATES));
  assert.deepEqual([...new Set(missing)], [], 'add these to src/data/productDates.js');
  const known = new Set([...ent.OWNABLE_SLUGS, ...ent.MEMBER_PACK_SLUGS, ...pl.ROOM_PLUGINS.map((p) => p.slug), ...SAMPLE_PACK_LIST.map((p) => p.slug), ...PRESET_PACK_LIST.map((p) => p.id)]);
  assert.deepEqual(Object.keys(PRODUCT_DATES).filter((id) => !known.has(id)), [], 'dated ids that no list knows');
  assert.ok(!('adalet' in PRODUCT_DATES), 'ADALET is not on sale: no date, it stays last');
});

await test('/plugins data (STORE_PLUGINS) is newest first, every store product once, ADALET last', () => {
  const ids = pl.STORE_PLUGINS.map((p) => p.slug);
  assertNewestFirst(ids, 'STORE_PLUGINS');
  const all = [...pl.FAMILY_PLUGINS, ...pl.SOLO_PLUGINS, ...pl.LINE2_PLUGINS, ...pl.FREE_PLUGINS].map((p) => p.slug);
  assert.deepEqual([...ids].sort(), [...all].sort());
  assert.equal(ids.at(-1), 'adalet');
  // Each filter group of the /plugins page is a subsequence of the dated list, so it is newest first too.
  for (const group of [pl.FREE_PLUGINS, pl.SOLO_PLUGINS, [...pl.FAMILY_PLUGINS, ...pl.SOLO_PLUGINS]]) {
    assertNewestFirst(byLatestRelease(group, (p) => p.slug).map((p) => p.slug), 'group');
  }
});

await test('/sample-packs data (visiblePacks) and /preset-packs data (PRESET_PACK_LIST) are newest first', () => {
  assertNewestFirst(visiblePacks().map((p) => p.slug), 'visiblePacks');
  assertNewestFirst(PRESET_PACK_LIST.map((p) => p.id), 'PRESET_PACK_LIST');
});

await test('pages sort with the shared helper: /plugins CARDS, /account plugins and packs, More sample packs', async () => {
  const plugins = await src('src/components/PluginsPage.jsx');
  // The cards are sorted inside the component since the live catalogue joined them (src/catalog/catalog.js): the static
  // cards and the catalogue plug-ins go through the one helper together.
  assert.ok(/const CARDS = useMemo\(\(\) => byLatestRelease\(\[\.\.\.STATIC_CARDS, \.\.\.catalogPlugins\(/.test(plugins) && plugins.includes('], (c) => c.p.slug), [cat]);'), 'PluginsPage CARDS');
  assert.ok(/shown = CARDS\.filter/.test(plugins), 'filter groups keep the sorted order');
  const account = await src('src/components/AccountPage.jsx');
  assert.ok(/const mine = byLatestRelease\(/.test(account), 'MyPlugins mine');
  assert.ok(account.includes('{byLatestRelease(packs).map((slug) => ('), 'MyPacks');
  const pack = await src('src/components/SamplePackPage.jsx');
  // `all` = the importer's packs plus the live catalogue, sorted once with the helper (src/components/SamplePackPage.jsx).
  assert.ok(pack.includes('byLatestRelease(mergeSamplePacks(visiblePacks(), cat.samplePacks), (p) => p.slug)') && pack.includes('const others = all.filter('), 'More sample packs reads the sorted list');
});

await test('llms.txt products section follows the store order', () => {
  const text = llmsProductIndex();
  const order = (ids, prefix) => ids.map((id) => text.indexOf(`subverselab.com${prefix}${id})`)).filter((i) => i >= 0);
  const pluginPos = order(pl.STORE_PLUGINS.map((p) => p.slug), '/plugins/');
  assert.equal(pluginPos.length, pl.STORE_PLUGINS.length, 'every product is in llms.txt');
  assert.deepEqual(pluginPos, [...pluginPos].sort((a, b) => a - b));
  const packPos = order(visiblePacks().map((p) => p.slug), '/sample-packs/');
  assert.deepEqual(packPos, [...packPos].sort((a, b) => a - b));
});

const hasDist = existsSync(join(root, 'dist', 'plugins', 'index.html'));
await test(`prerendered /plugins, /sample-packs, /preset-packs list newest first${hasDist ? '' : ' (SKIPPED: no dist/, run npm run build)'}`, async () => {
  if (!hasDist) return;
  const firstSeen = (html, re) => [...new Set([...html.matchAll(re)].map((m) => m[1]))];
  const plugins = await readFile(join(root, 'dist', 'plugins', 'index.html'), 'utf8');
  const pIds = firstSeen(plugins, /<h2><a href="\/plugins\/([a-z0-9]+)">/g);
  assert.deepEqual(pIds, pl.STORE_PLUGINS.map((p) => p.slug), '/plugins h2 order');
  const packs = await readFile(join(root, 'dist', 'sample-packs', 'index.html'), 'utf8');
  const sIds = firstSeen(packs, /href="\/sample-packs\/([a-z0-9-]+)"/g);
  assert.deepEqual(sIds, visiblePacks().map((p) => p.slug), '/sample-packs order');
  const presets = await readFile(join(root, 'dist', 'preset-packs', 'index.html'), 'utf8');
  const names = [...presets.matchAll(/<h2>([^<]+)<\/h2>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
  assert.deepEqual(names, PRESET_PACK_LIST.map((p) => p.name), '/preset-packs order');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
