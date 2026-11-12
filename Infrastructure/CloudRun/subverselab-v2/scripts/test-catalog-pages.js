// A product added from /admin gets its own head and sitemap line from the site server without a deploy (owner 5 Nov 2026):
// title, description, canonical, og/twitter tags and a Product JSON-LD for a catalogue-only pack or plug-in; the panel's
// picture on a prerendered pack page; catalogue-only products in /sitemap.xml; an unknown slug stays a 404.
// Run AFTER `npm run build`: node scripts/test-catalog-pages.js
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (!existsSync(join(root, 'dist', 'index.html'))) { console.log('dist/ missing: run npm run build first'); process.exit(1); }
delete process.env.API_PROXY_ORIGIN;
const site = await import(pathToFileURL(join(root, 'server.js')).href);

let failed = 0; let passed = 0;
async function test(name, fn) {
  try { await fn(); passed += 1; console.log(`PASS ${name}`); } catch (error) { failed += 1; console.log(`FAIL ${name}: ${error.message}`); }
}

const COVER = 'https://firebasestorage.googleapis.com/v0/b/x/o/catalog%2FsamplePacks%2Fnewpack%2Fc.jpg?alt=media&token=t';
const PANEL_MIRAGE = 'https://firebasestorage.googleapis.com/v0/b/x/o/catalog%2FsamplePacks%2Fmirage%2Fnew.jpg?alt=media&token=t';
site.setCatalogForTests({
  samplePacks: [
    { id: 'newpack', name: 'Newpack', fullName: 'SVL Newpack', kindLine: 'Dusty soul loops with drums', summary: 'Soul loops "with" <drums>.', cover: COVER, price: 5, released: '2026-11-06' },
    { id: 'mirage', cover: PANEL_MIRAGE },
  ],
  plugins: [{ id: 'harmony', displayName: 'HARMONY', kind: 'Harmonizer', tagline: 'Four voices from one.', cardImage: '/plugins/harmony/panel.webp', price: 12 }],
});

const server = site.app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const get = async (path) => { const r = await fetch(base + path); return { status: r.status, text: await r.text(), type: r.headers.get('content-type') || '' }; };

await test('a catalogue-only pack page carries its own title, description, canonical, picture and Product JSON-LD', async () => {
  const { status, text } = await get('/sample-packs/newpack');
  assert.equal(status, 200);
  assert.match(text, /<title data-rh="true">Newpack — Dusty soul loops with drums \| SubverseLab sample packs<\/title>/);
  assert.match(text, /rel="canonical" href="https:\/\/subverselab\.com\/sample-packs\/newpack"/);
  assert.ok(text.includes('name="description" content="Soul loops &quot;with&quot; &lt;drums&gt;."'), 'description escaped');
  assert.ok(text.includes(`property="og:image" content="${COVER.replace(/&/g, '&amp;')}"`), 'og:image is the panel cover');
  assert.ok(text.includes('"@type":"Product"') && text.includes('"name":"SVL Newpack"') && text.includes('"price":"5"'));
  assert.ok(!text.includes('"@type":"Organization","name":"SubverseLab","url":"https://subverselab.com/","description"'), 'the homepage blocks are gone');
  assert.ok(!text.includes('SubverseLab — Plugins and Tools for Music Producers'), 'no homepage title left');
});
await test('a catalogue-only plug-in page carries its own head', async () => {
  const { status, text } = await get('/plugins/harmony');
  assert.equal(status, 200);
  assert.match(text, /<title data-rh="true">HARMONY: Harmonizer \| SubverseLab<\/title>/);
  assert.ok(text.includes('property="og:image" content="https://subverselab.com/plugins/harmony/panel.webp"'));
});
await test('a prerendered pack page shows the panel picture in its link preview, the rest of its head unchanged', async () => {
  const { status, text } = await get('/sample-packs/mirage');
  assert.equal(status, 200);
  const amp = PANEL_MIRAGE.replace(/&/g, '&amp;');
  assert.ok(text.includes(`property="og:image" content="${amp}"`) && text.includes(`name="twitter:image" content="${amp}"`));
  assert.ok(text.includes(`"image":"${PANEL_MIRAGE}"`), 'JSON-LD image follows');
  assert.match(text, /<title[^>]*>Mirage — /, 'own prerendered title kept');
});
await test('an unknown slug is still a 404', async () => {
  assert.equal((await get('/sample-packs/nopack')).status, 404);
  assert.equal((await get('/plugins/nothing-here')).status, 404);
});
await test('/sitemap.xml lists the catalogue-only products once, after the built ones', async () => {
  const { status, text, type } = await get('/sitemap.xml');
  assert.equal(status, 200); assert.match(type, /xml/);
  assert.equal(text.split('<loc>https://subverselab.com/sample-packs/newpack</loc>').length - 1, 1);
  assert.ok(text.includes('<lastmod>2026-11-06</lastmod>'));
  assert.equal(text.split('<loc>https://subverselab.com/plugins/harmony</loc>').length - 1, 1);
  assert.equal(text.split('<loc>https://subverselab.com/sample-packs/mirage</loc>').length - 1, 1, 'a built page is not listed twice');
  assert.ok(text.trim().endsWith('</urlset>'));
});

server.close();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
