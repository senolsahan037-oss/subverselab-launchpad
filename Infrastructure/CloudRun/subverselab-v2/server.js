// subverselab-site: the pages. Static host for the prerendered SPA. Replaces `serve -s dist`, whose
// single-page mode rewrote every request to the root index.html and whose
// serve.json rewrites beat real files — both defeat scripts/prerender.js,
// which writes a real dist/{route}/index.html per route with that route's own
// content, title, canonical and JSON-LD.
// No Firestore, no secrets: every /api route is the separate subverselab-api service (api/server.js). This server only
// forwards /api/* to it when API_PROXY_ORIGIN is set (below), and answers 404 to /api/* when it is not.
import express from 'express';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { createHash } from 'crypto';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, 'dist');
const CANONICAL_HOST = 'subverselab.com';

export const app = express();

// Express advertises itself in a response header by default. It tells an
// attacker which stack to target and does nothing for anyone else.
app.disable('x-powered-by');

// Behind Cloud Run's front end the client address is the last entry Google appends to X-Forwarded-For; trusting exactly
// one hop makes req.ip that address. Only the /api proxy uses it (X-SVL-Client-IP).
app.set('trust proxy', 1);

// index.html carries one inline script — the pre-paint theme read, which has
// to run before the first paint or the page visibly flashes the wrong palette.
// Its hash is computed from the built file at startup rather than pasted in,
// so editing that script can never silently break the policy.
function inlineScriptHashes() {
  try {
    const html = readFileSync(join(DIST_DIR, 'index.html'), 'utf8');
    return [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
      // Skip anything with a src (covered by 'self') and the JSON-LD blocks
      // prerender.js emits — those are data, not code, they differ per route,
      // and hashing them here would only ever match the homepage's set.
      .filter(([, attrs]) => !/\bsrc=/.test(attrs) && !/application\/ld\+json/.test(attrs))
      .map(([, , body]) => `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  } catch {
    return [];
  }
}

const SCRIPT_HASHES = inlineScriptHashes();

// Where this build sends its API calls and loads its media from (scripts/split-media.js writes dist/.split.json from
// VITE_API_BASE and VITE_MEDIA_BASE). Empty in the same-origin build, so the policy is then exactly the monolith's.
function buildOrigins() {
  try {
    const { apiBase = '', mediaBase = '' } = JSON.parse(readFileSync(join(DIST_DIR, '.split.json'), 'utf8'));
    const origin = (u) => { try { return u ? new URL(u).origin : ''; } catch { return ''; } };
    return { api: origin(apiBase), media: origin(mediaBase) };
  } catch {
    return { api: '', media: '' };
  }
}
const BUILD_ORIGINS = buildOrigins();

// Every host the app genuinely talks to, enumerated rather than wildcarded at
// the scheme level. Firebase Auth runs on the custom auth.subverselab.com
// domain; tools are embedded from Cloud Run; fonts come from Google Fonts;
// GA4 is wired up in firebase.js via getAnalytics().
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  `script-src 'self' ${SCRIPT_HASHES.join(' ')} https://www.googletagmanager.com https://apis.google.com https://w.soundcloud.com`.trim(),
  // React styles components through the style attribute throughout, which the
  // spec counts as inline; there is no nonce that covers it.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  `img-src 'self' ${BUILD_ORIGINS.media} data: https://firebasestorage.googleapis.com https://*.googleusercontent.com https://i.ytimg.com https://*.google-analytics.com`.replace(/ {2,}/g, ' '),
  // Preview audio of packs added from /admin (the live catalogue) streams from the Firebase bucket; the rooms' players
  // fetch() theirs through connect-src below.
  `media-src 'self' ${BUILD_ORIGINS.media} https://firebasestorage.googleapis.com https://storage.googleapis.com`.replace(/ {2,}/g, ' '),
  // media too: the rooms' "Hear it first" player fetch()es its audio from the media origin (src/data/listen.js).
  `connect-src 'self' ${BUILD_ORIGINS.api} ${BUILD_ORIGINS.media} https://*.googleapis.com https://*.google-analytics.com https://*.analytics.google.com https://auth.subverselab.com https://*.run.app`.replace(/ {2,}/g, ' '),
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://w.soundcloud.com https://auth.subverselab.com https://accounts.google.com https://*.run.app",
  "upgrade-insecure-requests",
].join('; ');

app.use((req, res, next) => {
  // Cloud Run maps both subverselab.com and www.subverselab.com to this
  // service, so the site was reachable at two hosts that each returned 200.
  // The canonical tags said the right thing, but a duplicate is still a
  // duplicate — this makes the apex the only address that ever answers.
  const host = (req.headers.host || '').toLowerCase().split(':')[0];
  if (host === `www.${CANONICAL_HOST}`) {
    return res.redirect(301, `https://${CANONICAL_HOST}${req.originalUrl}`);
  }

  // Cloud Run terminates TLS, so the real scheme arrives in the header. HSTS
  // is only meaningful — and only safe — on a connection that is already
  // secure, which is why it is not sent during local development.
  if (req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()');
  // robots.txt keeps crawlers off /admin and /account, but Disallow only stops
  // fetching — it does not stop a URL being indexed from an inbound link, and
  // these two routes are client-rendered so they carry no <meta name="robots">
  // of their own. This header is the part that actually says "do not index",
  // and unlike a meta tag it works whether or not the crawler runs JavaScript.
  if (/^\/(admin|account|search|activate|redeem|partners)(\/|$)/.test(req.path)) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }

  next();
});

/* ---- /api on subverselab.com ----------------------------------------------
   The API is its own service. subverselab.com/api/* still has to answer: the plug-ins call
   https://subverselab.com/api/license/ (compiled into the binaries), and until the cut-over so do the Lemon Squeezy webhook,
   the tool services' credit calls, tester agents and any page loaded before the switch. With API_PROXY_ORIGIN set
   (e.g. https://api.subverselab.com) every /api/* request is streamed there unchanged — raw body, so the webhook signature
   still matches; responses streamed back, so a 500 MB installer is never held in memory. The caller's address goes along
   in X-SVL-Client-IP with this service's Google identity token (metadata server, audience API_PROXY_AUDIENCE) so the
   API can keep its per-address limits per caller; locally there is no metadata server and the token is simply left out.
   Without API_PROXY_ORIGIN, /api/* is a JSON 404: the site never handles an API route itself. */
const API_PROXY_ORIGIN = (process.env.API_PROXY_ORIGIN || '').replace(/\/$/, '');
const API_PROXY_AUDIENCE = process.env.API_PROXY_AUDIENCE || 'https://api.subverselab.com';
const HOP_BY_HOP = ['connection', 'keep-alive', 'proxy-connection', 'transfer-encoding', 'upgrade', 'te', 'trailer', 'host'];
let identity = { token: '', until: 0, failedAt: 0 };
async function proxyIdentityToken() {
  if (identity.token && identity.until > Date.now()) return identity.token;
  if (identity.failedAt && Date.now() - identity.failedAt < 60_000) return '';
  try {
    const url = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(API_PROXY_AUDIENCE)}`;
    const r = await fetch(url, { headers: { 'Metadata-Flavor': 'Google' }, signal: AbortSignal.timeout(2000) });
    if (!r.ok) throw new Error(`metadata ${r.status}`);
    // Google identity tokens live an hour; take a fresh one after 45 minutes.
    identity = { token: (await r.text()).trim(), until: Date.now() + 45 * 60_000, failedAt: 0 };
    return identity.token;
  } catch (err) {
    if (!identity.failedAt) console.error('api proxy: no identity token (expected outside Cloud Run):', err.message);
    identity = { token: '', until: 0, failedAt: Date.now() };
    return '';
  }
}
if (API_PROXY_ORIGIN) {
  const target = new URL(API_PROXY_ORIGIN);
  const send = target.protocol === 'https:' ? httpsRequest : httpRequest;
  app.use('/api', async (req, res) => {
    const headers = { ...req.headers };
    for (const h of HOP_BY_HOP) delete headers[h];
    delete headers['x-svl-proxy-token'];
    delete headers['x-svl-client-ip'];
    headers.host = target.host;
    headers['x-forwarded-host'] = req.headers.host || CANONICAL_HOST;
    headers['x-svl-client-ip'] = req.ip || '';
    const token = await proxyIdentityToken();
    if (token) headers['x-svl-proxy-token'] = token;
    const upstream = send({
      protocol: target.protocol, hostname: target.hostname, port: target.port || undefined,
      method: req.method, path: req.originalUrl, headers,
    }, (answer) => {
      const out = { ...answer.headers };
      for (const h of HOP_BY_HOP) delete out[h];
      res.writeHead(answer.statusCode || 502, out);
      answer.pipe(res);
    });
    upstream.on('error', (err) => {
      console.error('api proxy:', err.message);
      if (!res.headersSent) res.status(502).json({ error: 'API unavailable' });
      else res.destroy(err);
    });
    req.pipe(upstream);
  });
} else {
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
}

// Nothing was compressing responses before this: the main bundle went out as
// ~890 KB of raw JavaScript on every request. gzip takes it to ~268 KB.
app.use(compression());

// RFC 9116 security contact. Served explicitly, before express.static, whose
// default dotfiles policy would otherwise hide the .well-known path. The file
// is copied out of public/ into dist/ at build.
app.get('/.well-known/security.txt', (req, res) => {
  res.type('text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(join(DIST_DIR, '.well-known', 'security.txt'), { dotfiles: 'allow' }, (err) => {
    if (err && !res.headersSent) res.status(404).type('text/plain').send('Not found');
  });
});

app.get('/sitemap.xml', async (req, res, next) => {
  const file = join(DIST_DIR, 'sitemap.xml');
  if (!existsSync(file)) { next(); return; }
  const cat = await liveCatalog().catch(() => null);
  res.type('application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(sitemapWithCatalog(readFileSync(file, 'utf8'), cat));
});

app.use(express.static(DIST_DIR, {
  // Without this, /learn/sensei gets a 301 to /learn/sensei/ before the file
  // is served. Every canonical URL on the site is the no-trailing-slash form,
  // so that redirect put a hop in front of every content page and pointed
  // crawlers at a URL whose own canonical points back at the redirect.
  redirect: false,
  setHeaders: (res, path) => {
    if (path.includes('/assets/')) {
      // Vite fingerprints these with a content hash, so a given URL's bytes
      // can never change — a returning visitor should not re-download them.
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', htmlCacheControl());
    } else {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  },
}));

// HTML is rewritten on every deploy and must revalidate, or visitors keep
// seeing stale pages and stale asset URLs after a release. s-maxage lets a
// shared cache in front of this serve for a few minutes, and
// stale-while-revalidate lets it answer instantly from a slightly old copy
// while it refreshes in the background — which is what actually removes the
// cold-start delay from the visitor's first byte.
function htmlCacheControl() {
  return 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400, must-revalidate';
}

const LOOKS_LIKE_A_FILE = /\.[a-z0-9]{2,5}$/i;

// Real app routes that are rendered entirely in the browser and so have no
// prerendered dist/{route}/index.html of their own: the signed-in pages, and
// the forum (its topics are read from Firestore at runtime). They must answer
// 200 with the SPA shell. Every path that is neither one of these NOR a
// prerendered file is a genuine unknown URL and must 404 — otherwise the shell
// goes back under a 200, which is the "soft 404" Google penalises and which
// hides broken links from the logs.
// /account, /admin and /forum now have a small prerendered document of their own (scripts/prerender.js: right
// title, noindex on the private two, no homepage canonical); they stay listed so a build without them still answers 200.
// /search (owner 6 Nov 2026): the results are drawn in the browser from the query; never indexed (header above).
// /activate (7 Nov 2026): a plug-in's browser sign-in (TRIAL_AND_SIGNIN.md); private, never indexed (header above).
// /redeem (7 Nov 2026): store codes (api/redeem.js); private, never indexed (header above).
// /partners/report (12 Nov 2026): an affiliate partner's sales report (token in the URL fragment); private, never indexed.
const CLIENT_ONLY_ROUTES = new Set(['/account', '/admin', '/forum', '/search', '/activate', '/redeem', '/partners/report']);
function isKnownClientRoute(path) {
  return CLIENT_ONLY_ROUTES.has(path) || path.startsWith('/forum/');
}

// Products added from /admin (the live catalogue, api/catalog.js) have no prerendered file: /plugins/<slug> and
// /sample-packs/<slug> are asked of the API (GET /api/catalog/slugs, cached a minute) and answer 200 with the shell when
// the slug is live, 404 otherwise. Without an API origin (a local `node server.js`) the two patterns are let through.
const CATALOG_ROUTE = /^\/(plugins|sample-packs)\/([a-z0-9][a-z0-9-]{0,59})$/;
let catalogSlugs = { at: 0, value: null };
async function liveCatalogSlugs() {
  if (catalogSlugs.value && Date.now() - catalogSlugs.at < 60_000) return catalogSlugs.value;
  if (!API_PROXY_ORIGIN) return null;
  try {
    const r = await fetch(`${API_PROXY_ORIGIN}/api/catalog/slugs`, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) throw new Error(`catalog slugs ${r.status}`);
    const value = await r.json();
    catalogSlugs = { at: Date.now(), value };
    return value;
  } catch (err) {
    console.error('catalog slugs:', err.message);
    return catalogSlugs.value;   // the last good answer, or null (then the slug is treated as unknown: a real 404)
  }
}
async function isLiveCatalogRoute(path) {
  const m = CATALOG_ROUTE.exec(path);
  if (!m) return false;
  const slugs = await liveCatalogSlugs();
  if (!slugs) return false;
  const list = m[1] === 'plugins' ? slugs.plugins : slugs.samplePacks;
  return Array.isArray(list) && list.includes(m[2]);
}

// What a product added from /admin looks like to a crawler and a link preview (owner 5 Nov 2026: a pack published from the
// panel must not wait for the next deploy to get its title, description, picture and sitemap line). The public catalogue
// (GET /api/catalog, cached a minute like the slugs) is read here and its facts are written into the page head:
//   - a catalogue-only product (no prerendered file): the shell's title, description, canonical, og/twitter tags and a
//     Product JSON-LD are replaced with the item's own;
//   - a prerendered pack or plug-in page whose item sets a picture in the panel: og:image / twitter:image / the JSON-LD image
//     follow the panel, so the panel is the one source for the picture a link shows;
//   - /sitemap.xml lists the catalogue-only products after the built ones.
const SITE_ORIGIN = `https://${CANONICAL_HOST}`;
let catalogDocs = { at: 0, value: null };
export async function liveCatalog() {
  if (catalogDocs.value && Date.now() - catalogDocs.at < 60_000) return catalogDocs.value;
  if (!API_PROXY_ORIGIN) return catalogDocs.value;
  try {
    const r = await fetch(`${API_PROXY_ORIGIN}/api/catalog`, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) throw new Error(`catalog ${r.status}`);
    catalogDocs = { at: Date.now(), value: await r.json() };
  } catch (err) {
    console.error('catalog:', err.message);
  }
  return catalogDocs.value;
}
// For scripts/test-pages.js: a fixed catalogue instead of the API.
export function setCatalogForTests(value) { catalogDocs = { at: value ? Date.now() + 1e12 : 0, value }; catalogSlugs = { at: value ? Date.now() + 1e12 : 0, value: value ? { plugins: (value.plugins || []).map((d) => d.id), samplePacks: (value.samplePacks || []).map((d) => d.id) } : null }; }

const escAttr = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const absolute = (u) => (!u ? '' : /^https:\/\//.test(u) ? u : u.startsWith('/') ? `${SITE_ORIGIN}${u}` : '');
const clip = (t, n = 300) => { const v = String(t || '').replace(/\s+/g, ' ').trim(); return v.length > n ? `${v.slice(0, n - 1).trimEnd()}…` : v; };

// The head facts of a catalogue item: { title, description, image, url, product }.
export function catalogHead(kind, doc) {
  if (kind === 'sample-packs') {
    const name = doc.name || doc.id;
    const kindLine = doc.kindLine || 'sample pack';
    const description = clip(doc.summary || `${doc.fullName || `SVL ${name}`}: ${kindLine}. Listen to the preview first.`);
    return { title: `${name} — ${kindLine} | SubverseLab sample packs`, description, image: absolute(doc.cover), url: `${SITE_ORIGIN}/sample-packs/${doc.id}`,
      product: { name: doc.fullName || `SVL ${name}`, price: doc.price } };
  }
  const name = doc.displayName || doc.id;
  const description = clip(doc.description || doc.tagline || doc.intro || '');
  return { title: doc.title || `${name}: ${doc.kind || 'plug-in'} | SubverseLab`, description, image: absolute(doc.og || doc.cardImage), url: `${SITE_ORIGIN}/plugins/${doc.id}`,
    product: { name, price: doc.price } };
}

function setMeta(html, attr, key, value) {
  const re = new RegExp(`(<meta[^>]*${attr}="${key}"[^>]*content=")[^"]*(")`);
  return re.test(html) ? html.replace(re, `$1${escAttr(value)}$2`) : html.replace('</head>', `<meta ${attr}="${key}" content="${escAttr(value)}" />\n</head>`);
}
// The shell with one catalogue item's head.
export function shellWithHead(html, head) {
  let out = html.replace(/<title[^>]*>[^<]*<\/title>/, `<title data-rh="true">${escAttr(head.title)}</title>`);
  out = out.replace(/(<link[^>]*rel="canonical"[^>]*href=")[^"]*(")/, `$1${escAttr(head.url)}$2`);
  out = setMeta(out, 'name', 'description', head.description);
  out = setMeta(out, 'property', 'og:title', head.title);
  out = setMeta(out, 'property', 'og:description', head.description);
  out = setMeta(out, 'property', 'og:url', head.url);
  out = setMeta(out, 'property', 'og:type', 'product');
  out = setMeta(out, 'name', 'twitter:title', head.title);
  out = setMeta(out, 'name', 'twitter:description', head.description);
  if (head.image) { out = setMeta(out, 'property', 'og:image', head.image); out = setMeta(out, 'name', 'twitter:image', head.image); }
  // The homepage's Organization / WebSite blocks are not this page's; one Product block takes their place.
  out = out.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, '');
  const ld = { '@context': 'https://schema.org', '@type': 'Product', name: head.product.name, description: head.description, url: head.url,
    brand: { '@type': 'Organization', name: 'SubverseLab', url: SITE_ORIGIN },
    ...(head.image ? { image: head.image } : {}),
    ...(head.product.price != null ? { offers: { '@type': 'Offer', price: String(head.product.price), priceCurrency: 'USD', availability: 'https://schema.org/InStock' } } : {}) };
  return out.replace('</head>', `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n</head>`);
}
// A prerendered page with the panel's picture (only the image tags; the rest of the prerendered head stays).
export function pageWithImage(html, image) {
  if (!image) return html;
  let out = setMeta(html, 'property', 'og:image', image);
  out = setMeta(out, 'name', 'twitter:image', image);
  return out.replace(/("@type":"Product"[^<]*?"image":")[^"]*(")/, `$1${image.replace(/"/g, '\\"')}$2`);
}
const catalogDocFor = (cat, kind, slug) => (cat?.[kind === 'plugins' ? 'plugins' : 'samplePacks'] || []).find((d) => d.id === slug) || null;

// Catalogue-only products for the sitemap: every live item with no prerendered page of its own.
export function sitemapWithCatalog(xml, cat) {
  if (!cat) return xml;
  const lines = [];
  for (const [kind, key] of [['plugins', 'plugins'], ['sample-packs', 'samplePacks']]) {
    for (const d of cat[key] || []) {
      if (!/^[a-z0-9][a-z0-9-]{0,59}$/.test(String(d.id || '')) || d.edits) continue;
      if (existsSync(join(DIST_DIR, kind, d.id, 'index.html'))) continue;
      const loc = `${SITE_ORIGIN}/${kind}/${d.id}`;
      if (xml.includes(`<loc>${loc}</loc>`)) continue;
      const lastmod = d.updated || d.released || '';
      lines.push(`  <url>\n    <loc>${loc}</loc>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ''}    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
    }
  }
  return lines.length ? xml.replace('</urlset>', `${lines.join('\n')}\n</urlset>`) : xml;
}

// /tools is a real page since 2026-10-26 (the tools left the homepage, which is the news): dist/tools/index.html is
// prerendered and served by the fallback below like every other page. Until then it was a 301 to /#online-tools.

// The in-app 404 page under a real 404 status (dist/404.html carries its own title and noindex).
function sendNotFound(res) {
  const notFoundPage = join(DIST_DIR, '404.html');
  res.status(404).sendFile(existsSync(notFoundPage) ? notFoundPage : join(DIST_DIR, 'index.html'));
}

app.use((req, res) => {
  // A request for a file that isn't there must 404, not hand back the SPA
  // shell under a 200 — that is the "soft 404" Google penalises, and it hides
  // broken asset links from logs.
  if (LOOKS_LIKE_A_FILE.test(req.path)) {
    res.status(404).type('text/plain').send('Not found');
    return;
  }

  res.setHeader('Cache-Control', htmlCacheControl());

  // A prerendered route is served at its canonical, slash-free URL with a 200.
  const candidate = join(DIST_DIR, req.path, 'index.html');
  if (candidate.startsWith(DIST_DIR) && existsSync(candidate)) {
    const m = CATALOG_ROUTE.exec(req.path);
    if (m && (API_PROXY_ORIGIN || catalogDocs.value)) {
      // A product page the panel may have given a new picture: the link preview follows the panel.
      liveCatalog().then((cat) => {
        const doc = catalogDocFor(cat, m[1], m[2]);
        const image = doc ? catalogHead(m[1], doc).image : '';
        if (!image) { res.sendFile(candidate); return; }
        res.type('html').send(pageWithImage(readFileSync(candidate, 'utf8'), image));
      }, () => res.sendFile(candidate));
      return;
    }
    res.sendFile(candidate);
    return;
  }

  // A real client-rendered route with no prerendered file still answers 200;
  // the SPA paints it.
  if (isKnownClientRoute(req.path)) {
    res.sendFile(join(DIST_DIR, 'index.html'));
    return;
  }
  // A product that lives in the catalogue only (added from /admin after this build): asked of the API, answered
  // asynchronously; every other path is decided synchronously (scripts/test-pages.js calls this handler directly).
  if (CATALOG_ROUTE.test(req.path)) {
    isLiveCatalogRoute(req.path).then(async (live) => {
      if (!live) { sendNotFound(res); return; }
      const m = CATALOG_ROUTE.exec(req.path);
      const doc = catalogDocFor(await liveCatalog().catch(() => null), m[1], m[2]);
      if (!doc) { res.sendFile(join(DIST_DIR, 'index.html')); return; }
      res.type('html').send(shellWithHead(readFileSync(join(DIST_DIR, 'index.html'), 'utf8'), catalogHead(m[1], doc)));
    }).catch(() => sendNotFound(res));
    return;
  }

  // Anything else is an unknown URL. The SPA shell is still sent so the
  // in-app 404 page renders for a visitor, but under a real 404 status so
  // crawlers — and the access logs — see it for what it is.
  // dist/404.html (scripts/prerender.js) carries its own title, noindex and no canonical, so link previews and
  // crawlers do not read the homepage's; the same app shell boots in the browser and paints the in-app 404 page.
  sendNotFound(res);
});

// Listens only when started as the program (node server.js); scripts/test-split.js and test-pages.js import the app.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () =>
    console.log(`subverselab-site serving dist/ on port ${PORT} (${SCRIPT_HASHES.length} inline script hash(es) in CSP; /api ${API_PROXY_ORIGIN ? `→ ${API_PROXY_ORIGIN}` : 'not served'})`)
  );
}
