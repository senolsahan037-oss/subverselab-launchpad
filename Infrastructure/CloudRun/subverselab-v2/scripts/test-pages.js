// Local-only checks for the 2026-10-10 site decisions: the bare /tools redirect, the 404 fallback, the launch counter
// answer (no download figure), and the prerendered documents in dist/ (run AFTER `npm run build`).
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

const serverSource = await readFile(resolve(root, 'server.js'), 'utf8');
const url = (f) => pathToFileURL(resolve(root, f)).href;
const transformed = serverSource
  .replace("import express from 'express';", `import express from '${pathToFileURL(require.resolve('express')).href}';`)
  .replace("import compression from 'compression';", `import compression from '${pathToFileURL(require.resolve('compression')).href}';`)
  .replace("const __dirname = dirname(fileURLToPath(import.meta.url));", `const __dirname = ${JSON.stringify(root)};`)
  .replace("import { createLaunchService, tokenBucket } from './launchLicence.js';", `import { createLaunchService, tokenBucket } from '${url('launchLicence.js')}';`)
  .replace("from './entitlements.js';", `from '${url('entitlements.js')}';`)
  .replace("import { createAccountDeleter, purgeResolvedReports, emailMarker, ERASED_COLLECTION } from './accountDeletion.js';", `import { createAccountDeleter, purgeResolvedReports, emailMarker, ERASED_COLLECTION } from '${url('accountDeletion.js')}';`)
  .replace("from './credits.js';", `from '${url('credits.js')}';`)
  .replace("from './inbox.js';", `from '${url('inbox.js')}';`)
  .replace("from './stats.js';", `from '${url('stats.js')}';`)
  .replace('const app = express();', 'export const app = express();')
  .replace("await import('firebase-admin/app')", 'await Promise.resolve(globalThis.__pagesAdminApp)')
  .replace("await import('firebase-admin/firestore')", 'await Promise.resolve(globalThis.__pagesAdminFirestore)')
  .replace("await import('firebase-admin/auth')", 'await Promise.resolve(globalThis.__pagesAdminAuth)')
  .replace("import('@google-cloud/storage')", 'Promise.resolve(globalThis.__pagesStorage)')
  .replace(/const PORT = process\.env\.PORT \|\| 8080;[\s\S]*?\n\);\s*$/, '');
const server = await import(`data:text/javascript;base64,${Buffer.from(transformed).toString('base64')}`);
const stack = server.app.router.stack;

let failed = 0; let passed = 0;
async function test(name, fn) {
  try { await fn(); passed += 1; console.log(`PASS ${name}`); } catch (error) { failed += 1; console.log(`FAIL ${name}: ${error.message}`); }
}
const dist = (f) => readFile(join(root, 'dist', f), 'utf8').catch(() => { throw new Error(`dist/${f} missing: run npm run build first`); });

await test('/tools is a 301 to /#online-tools, and only the bare path is routed', async () => {
  const layer = stack.find((l) => l.route?.path === '/tools');
  assert.ok(layer, 'route /tools exists');
  let got;
  layer.route.stack.at(-1).handle({}, { redirect: (code, to) => { got = [code, to]; } });
  assert.deepEqual(got, [301, '/#online-tools']);
  assert.ok(!stack.some((l) => l.route && /^\/tools\/.+/.test(l.route.path)), 'no /tools/<slug> route is redirected');
  assert.ok(!stack.some((l) => l.regexp && String(l.regexp).includes('tools')), 'no prefix middleware on /tools');
});

await test('/api/launch/codes never publishes the launch2 (paid family) count; no download figure', async () => {
  const handler = stack.find((l) => l.route?.path === '/api/launch/codes').route.stack.at(-1).handle;
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
