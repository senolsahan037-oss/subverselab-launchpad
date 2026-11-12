// Local-only checks for the site / api / media split (docs/SPLIT_CUTOVER.md). No Google credentials, network or deploy:
// both apps run on ephemeral 127.0.0.1 ports, the API with fake Firebase modules like the other tests.
// Run AFTER `npm run build` (the site part serves dist/): node scripts/test-split.js
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const api = resolve(root, 'api');
const require = createRequire(import.meta.url);
const url = (f) => pathToFileURL(resolve(root, f)).href;

let passed = 0; let failed = 0;
async function test(name, fn) {
  try { await fn(); passed += 1; console.log(`PASS ${name}`); } catch (error) { failed += 1; console.log(`FAIL ${name}: ${error.message}`); }
}
const listen = (app) => new Promise((ok) => { const s = app.listen(0, '127.0.0.1', () => ok(s)); });
const base = (server) => `http://127.0.0.1:${server.address().port}`;

/* ---- the API service, with fake Firebase and a fake proxy-token verifier ---- */
const noDoc = { get: async () => ({ exists: false, data: () => undefined }), set: async () => {} };
globalThis.__splitAdminApp = { initializeApp() {}, applicationDefault() {}, getApps: () => [] };
globalThis.__splitAdminFirestore = { getFirestore: () => ({ collection: () => ({ doc: () => noDoc }), runTransaction: async (fn) => fn({ get: async () => ({ exists: false }), set() {} }) }), FieldValue: { serverTimestamp: () => 0 } };
globalThis.__splitAdminAuth = { getAuth: () => ({ verifyIdToken: async () => { throw new Error('invalid token'); } }) };
globalThis.__splitStorage = { Storage: class {} };
globalThis.__splitVerifyProxy = async (token, audience) => {
  if (audience !== 'https://api.subverselab.com') throw new Error(`audience ${audience}`);
  if (token === 'good-site-token') return { email: 'site@example.iam.gserviceaccount.com', email_verified: true, exp: Math.floor(Date.now() / 1000) + 3600 };
  if (token === 'other-sa-token') return { email: 'someone@else.iam.gserviceaccount.com', email_verified: true, exp: Math.floor(Date.now() / 1000) + 3600 };
  throw new Error('bad signature');
};
process.env.SITE_PROXY_CALLERS = 'site@example.iam.gserviceaccount.com';
process.env.CORS_ORIGINS = 'https://tag---subverselab-site-abc.a.run.app/';
process.env.PUBLIC_API_ORIGIN = 'https://api.subverselab.com';

const apiSource = await readFile(join(api, 'server.js'), 'utf8');
const apiTransformed = apiSource
  .replace("import express from 'express';", `import express from '${pathToFileURL(require.resolve('express')).href}';`)
  .replace('const __dirname = dirname(fileURLToPath(import.meta.url));', `const __dirname = ${JSON.stringify(api)};`)
  .replace("from './launchLicence.js';", `from '${url('api/launchLicence.js')}';`)
  .replace("from './entitlements.js';", `from '${url('api/entitlements.js')}';`)
  .replace("from './accountDeletion.js';", `from '${url('api/accountDeletion.js')}';`)
  .replace("from './credits.js';", `from '${url('api/credits.js')}';`)
  .replace("from './catalog.js';", `from '${url('api/catalog.js')}';`)
  .replace("from './catalogSchema.js';", `from '${url('api/catalogSchema.js')}';`)
  .replace("from './agents.js';", `from '${url('api/agents.js')}';`)
  .replace("from './trialGrant.js';", `from '${url('api/trialGrant.js')}';`)
  .replace("from './partners.js';", `from '${url('api/partners.js')}';`)
  .replace("from './inbox.js';", `from '${url('api/inbox.js')}';`)
  .replace("from './stats.js';", `from '${url('api/stats.js')}';`)
  .replace('const app = express();', 'export const app = express();')
  .replace('const verifySiteProxy = verifyGoogleOidc;', 'const verifySiteProxy = globalThis.__splitVerifyProxy;')
  .replace("await import('firebase-admin/app')", 'await Promise.resolve(globalThis.__splitAdminApp)')
  .replace("await import('firebase-admin/firestore')", 'await Promise.resolve(globalThis.__splitAdminFirestore)')
  .replace("await import('firebase-admin/auth')", 'await Promise.resolve(globalThis.__splitAdminAuth)')
  .replace("import('@google-cloud/storage')", 'Promise.resolve(globalThis.__splitStorage)')
  .replace(/const PORT = process\.env\.PORT \|\| 8080;[\s\S]*?\n\);\s*$/, '');
assert.ok(apiTransformed.includes('globalThis.__splitVerifyProxy'), 'api/server.js no longer declares verifySiteProxy the way this test expects');
const apiModule = await import(`data:text/javascript;base64,${Buffer.from(apiTransformed).toString('base64')}`);
const apiServer = await listen(apiModule.app);
const API = base(apiServer);
const SITE_ORIGIN = 'https://subverselab.com';

await test('CORS: an allowed origin gets its own origin back (no credentials), Vary: Origin', async () => {
  const r = await fetch(`${API}/api/testers/agent/openapi.json`, { headers: { Origin: SITE_ORIGIN } });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('access-control-allow-origin'), SITE_ORIGIN);
  assert.equal(r.headers.get('access-control-allow-credentials'), null);
  assert.match(r.headers.get('vary') || '', /Origin/);
  for (const o of ['https://www.subverselab.com', 'http://localhost:5173', 'http://127.0.0.1:8080', 'https://tag---subverselab-site-abc.a.run.app']) {
    const x = await fetch(`${API}/api/testers/agent/openapi.json`, { headers: { Origin: o } });
    assert.equal(x.headers.get('access-control-allow-origin'), o, o);
  }
});

await test('CORS: a foreign origin is refused with 403 and no allow-origin header, on GET, POST and preflight', async () => {
  for (const o of ['https://evil.example', 'http://localhost:9999', 'null', 'https://subverselab.com.evil.example']) {
    const g = await fetch(`${API}/api/testers/agent/openapi.json`, { headers: { Origin: o } });
    assert.equal(g.status, 403, o);
    assert.equal(g.headers.get('access-control-allow-origin'), null, o);
  }
  const p = await fetch(`${API}/api/account/delete`, { method: 'POST', headers: { Origin: 'https://evil.example', Authorization: 'Bearer x' } });
  assert.equal(p.status, 403);
  const pre = await fetch(`${API}/api/account/delete`, { method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization' } });
  assert.equal(pre.status, 403);
  assert.equal(pre.headers.get('access-control-allow-origin'), null);
});

await test('CORS: preflight for Authorization + JSON POST from the site answers 204 with methods, headers and max-age', async () => {
  const r = await fetch(`${API}/api/download/ticket`, { method: 'OPTIONS', headers: { Origin: SITE_ORIGIN, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization, content-type' } });
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('access-control-allow-origin'), SITE_ORIGIN);
  assert.match(r.headers.get('access-control-allow-methods'), /\bPOST\b/);
  assert.match(r.headers.get('access-control-allow-headers'), /Authorization/);
  assert.match(r.headers.get('access-control-allow-headers'), /Content-Type/);
  assert.equal(r.headers.get('access-control-max-age'), '600');
});

await test('no Origin (webhook, tool services, plug-ins, agents) passes the CORS gate unchanged', async () => {
  delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  const w = await fetch(`${API}/api/lemonsqueezy/webhook`, { method: 'POST', body: '{}' });
  assert.equal(w.status, 503); // reached the route: "not configured" here, not a CORS 403
  const l = await fetch(`${API}/api/license/validate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.notEqual(l.status, 403);
});

await test('the API has no pages: unknown path → JSON 404; noindex and a deny-all CSP on every answer', async () => {
  const r = await fetch(`${API}/plugins/kubbe`);
  assert.equal(r.status, 404);
  assert.deepEqual(await r.json(), { error: 'Not found' });
  assert.match(r.headers.get('x-robots-tag'), /noindex/);
  assert.match(r.headers.get('content-security-policy'), /default-src 'none'/);
  assert.ok(!apiModule.app.router.stack.some((l) => l.route && !l.route.path.startsWith('/api/')), 'every API route is under /api/');
});

await test('agent OpenAPI names the API address from PUBLIC_API_ORIGIN', async () => {
  const spec = await (await fetch(`${API}/api/testers/agent/openapi.json`)).json();
  assert.deepEqual(spec.servers, [{ url: 'https://api.subverselab.com' }]);
});

await test('page-view beacon: text/plain body is accepted (cross-origin beacon without preflight)', async () => {
  assert.match(apiSource, /const hitJson = express\.json\(\{ limit: '1kb', type: \['application\/json', 'text\/plain'\] \}\);/);
  const r = await fetch(`${API}/api/hit`, { method: 'POST', headers: { 'Content-Type': 'text/plain', Origin: SITE_ORIGIN }, body: JSON.stringify({ path: '/', ref: '', landing: true }) });
  assert.equal(r.status, 204);
});

// The licence limit is 30 a minute per address. Through the site proxy every call arrives from the site, so the API
// believes X-SVL-Client-IP only with a verified site token.
const licence = (headers) => fetch(`${API}/api/license/validate`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: '{}' }).then((r) => r.status);
await test('site proxy: a verified site token makes X-SVL-Client-IP the caller (limits stay per caller)', async () => {
  const a = { 'X-SVL-Proxy-Token': 'good-site-token', 'X-SVL-Client-IP': '198.51.100.7' };
  const statuses = []; for (let i = 0; i < 31; i += 1) statuses.push(await licence(a));
  assert.ok(statuses.slice(0, 30).every((s) => s !== 429), statuses.join(','));
  assert.equal(statuses[30], 429);
  assert.notEqual(await licence({ 'X-SVL-Proxy-Token': 'good-site-token', 'X-SVL-Client-IP': '198.51.100.8' }), 429, 'another caller has its own bucket');
});

await test('site proxy: an unverified or foreign token, or a bad address, leaves req.ip as the connection', async () => {
  // These all fall into the connection's own bucket (127.0.0.1), which earlier tests used a little; 30 more must trip it.
  const mixed = [
    { 'X-SVL-Proxy-Token': 'forged', 'X-SVL-Client-IP': '203.0.113.1' },
    { 'X-SVL-Proxy-Token': 'other-sa-token', 'X-SVL-Client-IP': '203.0.113.2' },
    { 'X-SVL-Proxy-Token': 'good-site-token', 'X-SVL-Client-IP': 'not-an-ip' },
    { 'X-SVL-Client-IP': '203.0.113.3' },
  ];
  let limited = 0;
  for (let i = 0; i < 32; i += 1) if ((await licence(mixed[i % mixed.length])) === 429) limited += 1;
  assert.ok(limited > 0, 'spoofed addresses did not each get a fresh bucket');
});

/* ---- the site service ---- */
await test('site build is present (run npm run build first)', async () => {
  assert.ok(existsSync(join(root, 'dist', 'index.html')));
  assert.ok(existsSync(join(root, 'dist', '.split.json')), 'dist/.split.json (scripts/split-media.js) missing');
});
delete process.env.API_PROXY_ORIGIN;
const site = await import(`${url('server.js')}?plain`);
const siteServer = await listen(site.app);
const SITE = base(siteServer);
const split = JSON.parse(await readFile(join(root, 'dist', '.split.json'), 'utf8'));

await test('site: unknown URL answers a real 404 with the 404 page', async () => {
  const r = await fetch(`${SITE}/no-such-page`);
  assert.equal(r.status, 404);
  assert.match(await r.text(), /<title[^>]*>Page not found \| SubverseLab<\/title>/);
  assert.equal((await fetch(`${SITE}/no-such-file.png`)).status, 404);
});

// AHENK (src/data/plugins.js AHENK_CHECKOUT): while switched off the production build has no page, no images and no mention of it.
await test('site: AHENK switched off = no /plugins/ahenk page, no dist/plugins/ahenk, not on /plugins, the homepage or llms.txt', async () => {
  const { AHENK_ON_SALE } = await import('../src/data/plugins.js');
  if (AHENK_ON_SALE) return;   // switched on: the sitemap test above covers the page
  assert.equal(existsSync(join(root, 'dist', 'plugins', 'ahenk')), false, 'dist/plugins/ahenk must not ship');
  assert.equal((await fetch(`${SITE}/plugins/ahenk`)).status, 404);
  for (const p of ['/', '/plugins', '/launch2', '/llms.txt', '/llms-full.txt', '/sitemap.xml']) {
    assert.doesNotMatch(await (await fetch(`${SITE}${p}`)).text(), /\/plugins\/ahenk|\bAHENK\b/, p);
  }
});

await test('site: security.txt, robots, llms.txt and llms-full.txt answer 200; sitemap lists 34 URLs (32 + /refunds + /tools; /plugins/torna joined 28 Oct) + one per manual page + /plugins/ru8 only while RU-8 is on sale + one per visible sample pack', async () => {
  const sec = await fetch(`${SITE}/.well-known/security.txt`);
  assert.equal(sec.status, 200);
  assert.match(sec.headers.get('content-type'), /text\/plain/);
  assert.match(await sec.text(), /Contact:/);
  for (const p of ['/robots.txt', '/llms.txt', '/llms-full.txt', '/favicon.ico', '/og-image.jpg']) assert.equal((await fetch(`${SITE}${p}`)).status, 200, p);
  const sm = await (await fetch(`${SITE}/sitemap.xml`)).text();
  const { visiblePacks } = await import('../src/data/packFacts.js');
  const { RU8_ON_SALE, JINGFANG_ON_SALE, AHENK_ON_SALE } = await import('../src/data/plugins.js');   // RU-8, JING FANG and AHENK are on the site only once on sale
  const { MANUALS } = await import('../src/data/pluginManuals.js');   // every owner's manual page, KUBBE and KASET included
  assert.equal(sm.match(/<loc>/g).length, 34 + MANUALS.length + (RU8_ON_SALE ? 1 : 0) + (JINGFANG_ON_SALE ? 1 : 0) + (AHENK_ON_SALE ? 1 : 0) + visiblePacks().length);
  assert.equal(/\/plugins\/ru8</.test(sm), RU8_ON_SALE);
  assert.equal(/\/plugins\/jingfang</.test(sm), JINGFANG_ON_SALE);
  assert.equal(/\/plugins\/ahenk</.test(sm), AHENK_ON_SALE);
});

await test('site: prerendered pages are crawlable HTML with their own title (home, a plugin room, /plugins)', async () => {
  for (const [p, re] of [['/', /SubverseLab/], ['/plugins/kubbe', /KUBBE/], ['/plugins', /plugin/i]]) {
    const r = await fetch(`${SITE}${p}`);
    assert.equal(r.status, 200, p);
    const h = await r.text();
    assert.match(h, re, p);
    assert.match(h, /rel="canonical"/, p);
  }
});

await test('site: no /api route is handled — /api/* is a JSON 404 without API_PROXY_ORIGIN', async () => {
  for (const p of ['/api/download/manifest', '/api/license/validate', '/api/lemonsqueezy/webhook']) {
    const r = await fetch(`${SITE}${p}`, { method: p.endsWith('manifest') ? 'GET' : 'POST' });
    assert.equal(r.status, 404, p);
    assert.deepEqual(await r.json(), { error: 'Not found' }, p);
  }
  assert.ok(!site.app.router.stack.some((l) => l.route?.path?.startsWith('/api')), 'no /api route on the site');
});

await test('site: no Firestore admin, no secrets, no API modules in the site server or its image', async () => {
  const src = await readFile(join(root, 'server.js'), 'utf8');
  for (const bad of ['firebase-admin', 'google-auth-library', '@google-cloud/storage', 'LEMONSQUEEZY', 'DOWNLOAD_TICKET_SECRET', './entitlements.js', './credits.js']) assert.ok(!src.includes(bad), bad);
  const docker = await readFile(join(root, 'Dockerfile'), 'utf8');
  assert.match(docker, /^COPY server\.js \.\/$/m);
  assert.ok(!/launchLicence|entitlements|tester-agreements/.test(docker));
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  assert.deepEqual(Object.keys(pkg.dependencies).sort(), ['compression', 'express'], 'site runtime installs only the static server');
  const apiPkg = JSON.parse(await readFile(join(api, 'package.json'), 'utf8'));
  for (const d of ['express', 'firebase-admin', 'google-auth-library', '@google-cloud/storage']) assert.ok(apiPkg.dependencies[d], d);
  // api/ stays out of the site upload except the catalogue schema the pages import (build stage only; the runtime image
  // copies server.js and dist).
  for (const f of ['.dockerignore', '.gcloudignore']) {
    const ignore = await readFile(join(root, f), 'utf8');
    assert.match(ignore, /^api\/\*$/m, f);
    assert.deepEqual(ignore.match(/^!api\/.*$/gm), ['!api/catalogSchema.js'], f);
  }
  assert.match(await readFile(join(root, '.dockerignore'), 'utf8'), /^docs$/m);
  assert.ok(!/^\.env$/m.test(await readFile(join(root, '.dockerignore'), 'utf8')), '.env must reach the site build (VITE_FIREBASE_*)');
});

await test('site: CSP names exactly the API and media origins this build uses', async () => {
  const csp = (await fetch(`${SITE}/`)).headers.get('content-security-policy');
  const connect = csp.split('; ').find((d) => d.startsWith('connect-src'));
  const img = csp.split('; ').find((d) => d.startsWith('img-src'));
  if (split.apiBase) assert.ok(connect.includes(new URL(split.apiBase).origin), connect);
  if (split.mediaBase) assert.ok(img.includes(new URL(split.mediaBase).origin), img);
  assert.ok(!/ {2}/.test(csp), 'no double spaces');
  assert.match(connect, /^connect-src 'self' /);
});

await test('site proxy: /api/* streamed to API_PROXY_ORIGIN — raw body, status, headers; client cannot inject the trust headers', async () => {
  const seen = [];
  const upstream = createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      seen.push({ method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(chunks) });
      if (req.url.startsWith('/api/big')) { res.writeHead(200, { 'Content-Type': 'application/octet-stream' }); for (let i = 0; i < 40; i += 1) res.write(Buffer.alloc(1 << 20, i)); res.end(); return; }
      res.writeHead(201, { 'Content-Type': 'application/json', 'X-Upstream': 'yes' });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  await new Promise((ok) => upstream.listen(0, '127.0.0.1', ok));
  process.env.API_PROXY_ORIGIN = `http://127.0.0.1:${upstream.address().port}/`;
  const proxied = await import(`${url('server.js')}?proxy`);
  delete process.env.API_PROXY_ORIGIN;
  const proxyServer = await listen(proxied.app);
  try {
    const raw = Buffer.from('{"meta":{"event_name":"order_created"},"data":{"id":"1"}}  \n');
    const r = await fetch(`${base(proxyServer)}/api/lemonsqueezy/webhook?x=1`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Signature': 'abc', 'X-SVL-Client-IP': '6.6.6.6', 'X-SVL-Proxy-Token': 'forged' }, body: raw });
    assert.equal(r.status, 201);
    assert.equal(r.headers.get('x-upstream'), 'yes');
    assert.deepEqual(await r.json(), { ok: true });
    const got = seen.at(-1);
    assert.equal(got.method, 'POST');
    assert.equal(got.url, '/api/lemonsqueezy/webhook?x=1');
    assert.ok(got.body.equals(raw), 'webhook body reached the API byte for byte');
    assert.equal(got.headers['x-signature'], 'abc');
    assert.equal(got.headers.host, `127.0.0.1:${upstream.address().port}`);
    assert.notEqual(got.headers['x-svl-client-ip'], '6.6.6.6', 'client-supplied X-SVL-Client-IP replaced by the real caller');
    assert.notEqual(got.headers['x-svl-proxy-token'], 'forged', 'client-supplied proxy token dropped');
    const big = await fetch(`${base(proxyServer)}/api/big`);
    assert.equal(big.status, 200);
    assert.equal((await big.arrayBuffer()).byteLength, 40 << 20, '40 MiB streamed through');
  } finally {
    proxyServer.close(); upstream.close();
  }
});

/* ---- frontend: one helper for /api, media through media() ---- */
await test('endpoints.js: empty = same origin; set = absolute API and media URLs; non-path values untouched', async () => {
  process.env.VITE_API_BASE = 'https://api.subverselab.com/';
  process.env.VITE_MEDIA_BASE = 'https://storage.googleapis.com/subverselab-media';
  const set = await import(`${url('src/utils/endpoints.js')}?set`);
  assert.equal(set.apiUrl('/api/inbox'), 'https://api.subverselab.com/api/inbox');
  assert.equal(set.apiUrl('/api/download/file?t=a.b'), 'https://api.subverselab.com/api/download/file?t=a.b');
  assert.equal(set.apiUrl('https://elsewhere.example/x'), 'https://elsewhere.example/x');
  assert.equal(set.media('/plugins/kubbe/hero.webp'), 'https://storage.googleapis.com/subverselab-media/plugins/kubbe/hero.webp');
  delete process.env.VITE_API_BASE; delete process.env.VITE_MEDIA_BASE;
  const plain = await import(`${url('src/utils/endpoints.js')}?plain`);
  assert.equal(plain.apiUrl('/api/inbox'), '/api/inbox');
  assert.equal(plain.media('/plugins/kubbe/hero.webp'), '/plugins/kubbe/hero.webp');
});

function srcFiles(dir) {
  return readdirSync(dir).flatMap((n) => { const f = join(dir, n); return statSync(f).isDirectory() ? srcFiles(f) : /\.(js|jsx)$/.test(n) ? [f] : []; });
}
const sources = await Promise.all(srcFiles(join(root, 'src')).map(async (f) => [f.slice(root.length + 1), await readFile(f, 'utf8')]));

await test('frontend: every /api call goes through apiUrl() (no bare fetch, beacon or download redirect to /api)', async () => {
  const bad = [];
  for (const [f, s] of sources) {
    for (const m of s.matchAll(/(fetch|sendBeacon)\(\s*['`]\/api\//g)) bad.push(`${f}: ${m[0]}`);
    if (/location\.assign\(body\.url\)/.test(s)) bad.push(`${f}: location.assign(body.url)`);
    if (/window\.location\.origin\}\/api\//.test(s)) bad.push(`${f}: window.location.origin/api`);
  }
  assert.deepEqual(bad, []);
  const helpers = sources.filter(([, s]) => /const r = await fetch\(path, \{/.test(s)).map(([f]) => f);
  assert.deepEqual(helpers, [], 'shared fetch helpers wrap path in apiUrl()');
  const hook = sources.find(([f]) => f.endsWith('useHitCounter.js'))[1];
  assert.match(hook, /sendBeacon\(apiUrl\('\/api\/hit'\), new Blob\(\[body\], \{ type: 'text\/plain' \}\)\)/);
});

await test('frontend: media paths are wrapped in media(), except the og images and the family image (fixed site URLs)', async () => {
  // The same "stays on the site" set scripts/split-media.js keeps in dist/.
  const pluginsSource = sources.find(([f]) => f === 'src/data/plugins.js')[1];
  const fixed = new Set([...pluginsSource.matchAll(/\bog: '(\/[^']+)'|FAMILY_IMAGE = '(\/[^']+)'/g)].map((m) => m[1] || m[2]));
  assert.ok(fixed.size >= 13, `og images found: ${fixed.size}`);
  const bad = [];
  for (const [f, s] of sources) {
    for (const m of s.matchAll(/(?<!media\()['`](\/(?:plugins|social|press)\/[^'`]*\.(?:png|jpe?g|webp|pdf|zip|mp4|gif|svg))['`]/g)) {
      if (!fixed.has(m[1])) bad.push(`${f}: ${m[1]}`);
    }
  }
  assert.deepEqual(bad, []);
});

await test('build: split-media runs last in npm run build; build.env feeds the Docker build and is empty (same origin) in this tree', async () => {
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  assert.match(pkg.scripts.build, /node scripts\/prerender\.js && node scripts\/split-media\.js$/);
  const docker = await readFile(join(root, 'Dockerfile'), 'utf8');
  assert.match(docker, /\. \.\/build\.env && set \+a && npm run build/);
  const env = await readFile(join(root, 'build.env'), 'utf8');
  assert.match(env, /^VITE_API_BASE=$/m);
  assert.match(env, /^VITE_MEDIA_BASE=$/m);
});

apiServer.close(); siteServer.close();
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
