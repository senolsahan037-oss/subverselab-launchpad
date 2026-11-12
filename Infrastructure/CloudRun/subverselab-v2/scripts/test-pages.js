// Local-only checks for the 2026-10-10 site decisions: the bare /tools redirect, the 404 fallback (site service, server.js),
// the launch counter answer (no download figure; API service, api/server.js), and the prerendered documents in dist/ (run AFTER `npm run build`).
// Run: node scripts/test-pages.js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const require = createRequire(import.meta.url);

globalThis.__pagesAdminApp = { initializeApp() {}, applicationDefault() {}, getApps: () => [] };
globalThis.__pagesAdminFirestore = { getFirestore: () => ({ collection: () => ({ doc: () => ({ get: async () => ({ exists: true, data: () => ({ claimed: 8, downloads: 2406 }) }) }) }) }), FieldValue: {} };
globalThis.__pagesAdminAuth = { getAuth: () => ({}) };
globalThis.__pagesStorage = { Storage: class {} };

const serverSource = await readFile(resolve(root, 'api/server.js'), 'utf8');
const url = (f) => pathToFileURL(resolve(root, f)).href;
const transformed = serverSource
  .replace("import express from 'express';", `import express from '${pathToFileURL(require.resolve('express')).href}';`)
  .replace("import compression from 'compression';", `import compression from '${pathToFileURL(require.resolve('compression')).href}';`)
  .replace("const __dirname = dirname(fileURLToPath(import.meta.url));", `const __dirname = ${JSON.stringify(resolve(root, 'api'))};`)
  .replace("import { createLaunchService, tokenBucket } from './launchLicence.js';", `import { createLaunchService, tokenBucket } from '${url('api/launchLicence.js')}';`)
  .replace("from './entitlements.js';", `from '${url('api/entitlements.js')}';`)
  .replace("import { createAccountDeleter, purgeResolvedReports, emailMarker, ERASED_COLLECTION } from './accountDeletion.js';", `import { createAccountDeleter, purgeResolvedReports, emailMarker, ERASED_COLLECTION } from '${url('api/accountDeletion.js')}';`)
  .replace("from './credits.js';", `from '${url('api/credits.js')}';`)
  .replace("from './catalog.js';", `from '${url('api/catalog.js')}';`)
  .replace("from './catalogSchema.js';", `from '${url('api/catalogSchema.js')}';`)
  .replace("from './agents.js';", `from '${url('api/agents.js')}';`)
  .replace("from './trialGrant.js';", `from '${url('api/trialGrant.js')}';`)
  .replace("from './partners.js';", `from '${url('api/partners.js')}';`)
  .replace("from './inbox.js';", `from '${url('api/inbox.js')}';`)
  .replace("from './stats.js';", `from '${url('api/stats.js')}';`)
  .replace('const app = express();', 'export const app = express();')
  .replace("await import('firebase-admin/app')", 'await Promise.resolve(globalThis.__pagesAdminApp)')
  .replace("await import('firebase-admin/firestore')", 'await Promise.resolve(globalThis.__pagesAdminFirestore)')
  .replace("await import('firebase-admin/auth')", 'await Promise.resolve(globalThis.__pagesAdminAuth)')
  .replace("import('@google-cloud/storage')", 'Promise.resolve(globalThis.__pagesStorage)')
  .replace(/const PORT = process\.env\.PORT \|\| 8080;[\s\S]*?\n\);\s*$/, '');
const server = await import(`data:text/javascript;base64,${Buffer.from(transformed).toString('base64')}`);
const apiStack = server.app.router.stack;
// The pages are their own service (server.js at the root); its app is imported without listening.
delete process.env.API_PROXY_ORIGIN;
const stack = (await import(pathToFileURL(resolve(root, 'server.js')).href)).app.router.stack;

let failed = 0; let passed = 0;
async function test(name, fn) {
  try { await fn(); passed += 1; console.log(`PASS ${name}`); } catch (error) { failed += 1; console.log(`FAIL ${name}: ${error.message}`); }
}
const dist = (f) => readFile(join(root, 'dist', f), 'utf8').catch(() => { throw new Error(`dist/${f} missing: run npm run build first`); });

await test('/tools is its own page (2026-10-26): no redirect, prerendered with its own title and canonical', async () => {
  assert.ok(!stack.some((l) => l.route?.path === '/tools'), 'the old /tools redirect is gone');
  assert.ok(!stack.some((l) => l.regexp && String(l.regexp).includes('tools')), 'no prefix middleware on /tools');
  const html = await dist('tools/index.html');
  assert.ok(/rel="canonical" href="https:\/\/subverselab\.com\/tools"/.test(html), 'canonical /tools');
  assert.ok(/<title[^>]*>Browser Tools for Music Producers \| SubverseLab<\/title>/.test(html), 'own title');
  const home = await dist('index.html');
  assert.ok(home.includes('19 November') && !home.includes('<h2>The tools</h2>'), 'the homepage is the news, without the tool list');
});

await test('/api/launch/codes never publishes the launch2 (paid family) count; no download figure', async () => {
  const handler = apiStack.find((l) => l.route?.path === '/api/launch/codes').route.stack.at(-1).handle;
  let body;
  await handler({ query: { launch: 'launch2' } }, { setHeader() {}, json: (b) => { body = b; } });
  assert.deepEqual(body, { available: false }, JSON.stringify(body));
  assert.ok(!('downloads' in body), JSON.stringify(body));
});

await test('unknown URL: the fallback answers 404 with dist/404.html', async () => {
  assert.ok(existsSync(join(root, 'dist', '404.html')), 'dist/404.html exists (run npm run build)');
  const handler = stack.at(-1).handle;
  const sent = {};
  const res = { status(c) { sent.status = c; return this; }, setHeader() {}, type() { return this; }, send() {}, sendFile(f) { sent.file = f; } };
  handler({ path: '/no-such-page' }, res);
  assert.equal(sent.status, 404);
  assert.ok(sent.file.endsWith('404.html'), sent.file);
});

await test('dist/404.html: right title, noindex, no canonical', async () => {
  const h = await dist('404.html');
  assert.match(h, /<title[^>]*>Page not found \| SubverseLab<\/title>/);
  assert.match(h, /name="robots" content="noindex"/);
  assert.ok(!/rel="canonical"/.test(h));
});

await test('dist/account and dist/admin: own title, noindex, no canonical, no og tags', async () => {
  for (const [f, title] of [['account/index.html', 'Account | SubverseLab'], ['admin/index.html', 'Admin | SubverseLab']]) {
    const h = await dist(f);
    assert.match(h, new RegExp(`<title[^>]*>${title.replace('|', '\\|')}</title>`));
    assert.match(h, /noindex, nofollow/);
    assert.ok(!/rel="canonical"/.test(h) && !/og:title/.test(h));
  }
});

await test('dist/forum: own title and canonical', async () => {
  const h = await dist('forum/index.html');
  assert.match(h, /<title[^>]*>Forum \| SubverseLab<\/title>/);
  assert.match(h, /rel="canonical" href="https:\/\/subverselab\.com\/forum"/);
});

await test('dist/forum/seed-topic-N: own title, own canonical, the topic text (not the homepage shell)', async () => {
  const { FORUM_SEED_TOPICS } = await import(pathToFileURL(join(root, 'src', 'data', 'forumSeed.js')).href);
  for (const t of FORUM_SEED_TOPICS) {
    const h = await dist(`forum/${t.id}/index.html`);
    assert.match(h, new RegExp(`rel="canonical" href="https://subverselab\\.com/forum/${t.id}"`));
    assert.ok(!/rel="canonical" href="https:\/\/subverselab\.com\/"/.test(h), `${t.id} still carries the homepage canonical`);
    assert.ok(h.includes(t.title.replace(/'/g, '&#39;').replace(/"/g, '&quot;').slice(0, 30)) || h.includes(t.title.slice(0, 30)), `${t.id} title missing`);
  }
});

await test('dist/learn/<slug>: carries its guide as svl-page-data JSON, outside #root', async () => {
  const { readdirSync } = await import('node:fs');
  const slugs = readdirSync(join(root, 'dist', 'learn'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  assert.ok(slugs.length > 0, 'no prerendered guides');
  for (const slug of slugs) {
    const h = await dist(`learn/${slug}/index.html`);
    const m = h.match(/<script type="application\/json" id="svl-page-data">([\s\S]*?)<\/script>/);
    assert.ok(m, `${slug}: no svl-page-data`);
    const data = JSON.parse(m[1]);
    assert.equal(data.article.slug, slug);
    assert.ok(data.article.title && data.article.body.length > 200, `${slug}: guide text missing`);
    assert.ok(h.indexOf('id="svl-page-data"') > h.indexOf('<div id="root">'), `${slug}: data block before #root`);
    assert.ok(!/<\/script>/i.test(JSON.stringify(data)), `${slug}: unescaped </script>`);
  }
});

await test('dist/testers is noindex and the sitemap does not list /testers', async () => {
  assert.match(await dist('testers/index.html'), /name="robots" content="noindex,follow"/);
  const sm = await readFile(join(root, 'public', 'sitemap.xml'), 'utf8');
  assert.ok(!sm.includes('/testers'));
});

await test('dist/launch2 names no count of people', async () => {
  const h = await dist('launch2/index.html');
  assert.ok(!/Live count|Counter:|\b\d+ people\b/i.test(h));
});

await test('product pages: one trust line, no "No key or activation is needed" anywhere in dist pages', async () => {
  const h = await dist('plugins/koro/index.html');
  assert.equal(h.split('macOS 11 or later · Windows, 64-bit').length - 1, 1);
  assert.ok(!/Windows 10/.test(h), 'no Windows version the manuals do not state');
  assert.ok(!/No key or activation is needed|No activation needed/.test(h));
  assert.ok(!/October 5/.test(h));
});

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
