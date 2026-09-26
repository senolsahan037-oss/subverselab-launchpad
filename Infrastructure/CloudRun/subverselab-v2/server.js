// Static host for the prerendered SPA. Replaces `serve -s dist`, whose
// single-page mode rewrote every request to the root index.html and whose
// serve.json rewrites beat real files — both defeat scripts/prerender.js,
// which writes a real dist/{route}/index.html per route with that route's own
// content, title, canonical and JSON-LD.
import express from 'express';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { createLaunchService, tokenBucket } from './launchLicence.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, 'dist');
const CANONICAL_HOST = 'subverselab.com';

const app = express();

// Express advertises itself in a response header by default. It tells an
// attacker which stack to target and does nothing for anyone else.
app.disable('x-powered-by');

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
  `script-src 'self' ${SCRIPT_HASHES.join(' ')} https://www.googletagmanager.com https://apis.google.com`.trim(),
  // React styles components through the style attribute throughout, which the
  // spec counts as inline; there is no nonce that covers it.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://firebasestorage.googleapis.com https://*.googleusercontent.com https://i.ytimg.com https://*.google-analytics.com",
  "connect-src 'self' https://*.googleapis.com https://*.google-analytics.com https://*.analytics.google.com https://auth.subverselab.com https://*.run.app",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://auth.subverselab.com https://accounts.google.com https://*.run.app",
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
  if (/^\/(admin|account)(\/|$)/.test(req.path)) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }

  next();
});

/* ============================================================
   Plugin sales API — Lemon Squeezy webhook, and SubverseLab's own launch
   licences (launchLicence.js).
   Env names only; values live in Cloud Run:
     LEMONSQUEEZY_WEBHOOK_SECRET   the webhook's signing secret
     LS_PRODUCT_SLUGS (optional)   "productId:slug,…" e.g. "111:kubbe,222:kaset,333:bundle"
   Field names checked against https://docs.lemonsqueezy.com/api on 2026-09-26.
   ============================================================ */

// Firebase Admin is loaded on first use, not at startup: the static site must
// keep serving even where no Google credentials exist (local preview), and
// only the webhook and the launch-licence routes ever need it. On Cloud Run
// the service's own identity is picked up by application-default credentials
// — the same pattern as metadata-sync-service and ToolAuthBridge.
let firestorePromise = null;
function adminFirestore() {
  if (!firestorePromise) {
    firestorePromise = (async () => {
      const { initializeApp, applicationDefault, getApps } = await import('firebase-admin/app');
      const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
      const { getAuth } = await import('firebase-admin/auth');
      if (!getApps().length) {
        initializeApp({
          credential: applicationDefault(),
          projectId: process.env.GOOGLE_CLOUD_PROJECT || 'project-62238635-aae4-41f4-880',
        });
      }
      return { db: getFirestore(), FieldValue, auth: getAuth() };
    })();
    firestorePromise.catch(() => { firestorePromise = null; });
  }
  return firestorePromise;
}

// Behind Cloud Run's front end the client address is the last entry Google
// appends to X-Forwarded-For; trusting exactly one hop makes req.ip that
// address instead of anything a client wrote into the header itself.
app.set('trust proxy', 1);

const launch = createLaunchService({ getAdmin: adminFirestore });
const smallBody = [express.urlencoded({ extended: false, limit: '4kb' }), express.json({ limit: '4kb' })];

let storagePromise = null;
function downloadStorage() {
  if (!storagePromise) storagePromise = import('@google-cloud/storage').then(({ Storage }) => new Storage());
  return storagePromise;
}
let manifestCache = { at: 0, value: null };
async function downloadManifest() {
  if (manifestCache.value && Date.now() - manifestCache.at < 60_000) return manifestCache.value;
  const storage = await downloadStorage();
  const [buf] = await storage.bucket('subverselab-downloads').file('plugins/manifest.json').download();
  const value = JSON.parse(buf.toString('utf8'));
  manifestCache = { at: Date.now(), value };
  return value;
}
function ticketSign(payload) {
  return createHmac('sha256', process.env.DOWNLOAD_TICKET_SECRET).update(payload).digest('base64url');
}
function ticketMake(data) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  return `${payload}.${ticketSign(payload)}`;
}
function ticketRead(token) {
  if (!process.env.DOWNLOAD_TICKET_SECRET || typeof token !== 'string') return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = ticketSign(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try { const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); return data.exp > Math.floor(Date.now() / 1000) ? data : null; } catch { return null; }
}
// GET /api/download/manifest → what is published, without any file URL: the
// bucket is private, so the buttons learn names, sizes and versions here and
// the files themselves only come through a signed ticket.
app.get('/api/download/manifest', async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60');
  try {
    const manifest = await withTimeout(downloadManifest(), 8000);
    const out = {};
    for (const slug of ['kubbe', 'kaset']) {
      const entry = manifest?.[slug] || {};
      out[slug] = { version: entry.version || null, files: {} };
      for (const [platform, f] of Object.entries(entry.files || {})) {
        if (f?.name) out[slug].files[platform] = { name: f.name, size: f.size || null, version: f.version || entry.version || null };
      }
    }
    res.json(out);
  } catch (err) {
    console.error('download manifest:', err.message);
    res.json({});
  }
});
const downloadLimit = tokenBucket({ perMinute: 30 });
app.post('/api/download/ticket', smallBody, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.DOWNLOAD_TICKET_SECRET) return res.status(503).json({ error: 'Download room is not configured' });
  if (!downloadLimit(req.ip)) return res.status(429).json({ error: 'Too many requests' });
  const token = (req.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'Sign in first' });
  let admin, decoded;
  try { admin = await adminFirestore(); decoded = await admin.auth.verifyIdToken(token); } catch (err) { return res.status(serviceDown(err) ? 503 : 401).json({ error: serviceDown(err) ? 'Download service unavailable' : 'Your sign-in has expired — sign in again' }); }
  if (!decoded.email || decoded.email_verified !== true) return res.status(403).json({ error: 'Verify your e-mail address first' });
  const { slug, platform } = req.body || {};
  if (!['kubbe', 'kaset'].includes(slug) || !['mac', 'win'].includes(platform)) return res.status(400).json({ error: 'Invalid plugin or platform' });
  try {
    const manifest = await withTimeout(downloadManifest(), 8000);
    const file = manifest?.[slug]?.files?.[platform];
    if (!file?.name) return res.status(404).json({ error: 'This download is not available yet' });
    const claim = await withTimeout(launch.claim({ uid: decoded.uid, email: decoded.email }), 15000);
    if (claim.status === 410) return res.status(410).json(claim.body);
    if (claim.status !== 200) return res.status(claim.status).json(claim.body);
    const now = new Date().toISOString();
    await admin.db.runTransaction(async (tx) => {
      const counter = admin.db.collection('launch').doc('counter');
      const downloads = admin.db.collection('downloads').doc(decoded.uid);
      const [snap, downloadSnap] = await Promise.all([tx.get(counter), tx.get(downloads)]);
      const total = snap.exists ? Number(snap.data().downloads) || 0 : 0;
      const old = downloadSnap.exists ? downloadSnap.data()?.[slug]?.[platform] || {} : {};
      tx.set(downloads, { [slug]: { [platform]: { count: (Number(old.count) || 0) + 1, first: old.first || now, last: now } } }, { merge: true });
      tx.set(counter, { downloads: total + 1, updated: now }, { merge: true });
    });
    // The manifest is authoritative for the published filename; accept its
    // public URL as the compatibility shape written by publish_download.sh.
    const object = file.object || (() => {
      try { return decodeURIComponent(new URL(file.url).pathname.replace(/^\//, '')); } catch { return `plugins/${slug}/${manifest[slug].version}/${file.name}`; }
    })();
    const ticket = ticketMake({ uid: decoded.uid, slug, platform, object, exp: Math.floor(Date.now() / 1000) + 300 });
    return res.json({ url: `/api/download/file?t=${encodeURIComponent(ticket)}`, name: file.name, size: file.size, version: file.version || manifest[slug].version });
  } catch (err) { console.error('download ticket:', err.message); return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Download service unavailable' }); }
});
app.get('/api/download/file', async (req, res) => {
  const data = ticketRead(req.query.t);
  if (!data) return res.status(403).type('text/plain').send('Invalid or expired download ticket');
  try {
    const storage = await downloadStorage();
    const file = storage.bucket('subverselab-downloads').file(data.object);
    const [meta] = await file.getMetadata();
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${String(meta.name || data.object.split('/').pop()).replace(/"/g, '')}"`);
    if (meta.size) res.setHeader('Content-Length', meta.size);
    file.createReadStream().on('error', () => { if (!res.headersSent) res.status(404).end(); }).pipe(res);
  } catch { res.status(404).type('text/plain').send('Download not found'); }
});

// A Firestore call that fails because this process has no Google credentials
// (local preview) or cannot reach Google answers 503, not a stack trace.
function serviceDown(err) {
  const m = String(err?.message || '');
  return /public keys|default credentials|metadata|ENOTFOUND|ECONNREFUSED|UNAVAILABLE|DEADLINE|ETIMEDOUT|PERMISSION_DENIED|ABORTED|contention/i.test(m)
    || [4, 7, 10, 14, 16].includes(err?.code);
}

const CODES_CACHE_MS = 30_000;
let codesCache = { at: 0, body: null };

// GET /api/launch/codes → {total, claimed} or {available:false}.
// Read from launch/counter, the one counter every claim increments — the
// /launch button and the Instagram DMs both end up there. Any failure answers
// {available:false} and the page shows no number, never a guess.
app.get('/api/launch/codes', async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=30');
  if (codesCache.body && Date.now() - codesCache.at < CODES_CACHE_MS) {
    return res.json(codesCache.body);
  }
  let body;
  try {
    body = await withTimeout(launch.readCounter(), 5000);
  } catch (err) {
    console.error('launch codes:', err.message);
    body = { available: false };
  }
  // Failures are cached too, so an outage is asked about twice a minute rather
  // than once per visitor.
  codesCache = { at: Date.now(), body };
  res.json(body);
});

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('DEADLINE: no answer')), ms); }),
  ]).finally(() => clearTimeout(timer));
}

const claimLimit = tokenBucket({ perMinute: 10 });
const licenceLimit = tokenBucket({ perMinute: 30 });
// The plugins post form fields (JUCE's URL::withParameter); anything else may
// send JSON. Either way a licence request is a few hundred bytes.

// POST /api/launch/claim   Authorization: Bearer <Firebase ID token>
// One free launch licence per verified e-mail and per Firebase account, while
// the 1,000 last; asking again returns the same key.
app.post('/api/launch/claim', smallBody, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!claimLimit(req.ip)) return res.status(429).json({ error: 'Too many requests — try again in a minute' });

  const token = (req.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'Sign in first' });

  let admin;
  try {
    admin = await adminFirestore();
  } catch (err) {
    console.error('launch claim (admin):', err.message);
    return res.status(503).json({ error: 'The licence service is not available right now' });
  }

  let decoded;
  try {
    decoded = await admin.auth.verifyIdToken(token);
  } catch (err) {
    if (serviceDown(err)) {
      console.error('launch claim (verify):', err.message);
      return res.status(503).json({ error: 'The licence service is not available right now' });
    }
    return res.status(401).json({ error: 'Your sign-in has expired — sign in again' });
  }
  if (!decoded.email || decoded.email_verified !== true) {
    return res.status(403).json({ error: 'Verify your e-mail address first' });
  }

  try {
    const { status, body } = await withTimeout(launch.claim({ uid: decoded.uid, email: decoded.email }), 15000);
    if (status === 200 || status === 410) codesCache = { at: Date.now(), body: { total: body.total, claimed: body.claimed } };
    res.status(status).json(body);
  } catch (err) {
    console.error('launch claim:', err.message);
    const busy = /ABORTED|contention/i.test(err.message) || err.code === 10;
    res.status(503).json({ error: busy ? 'Many people are claiming right now — try again in a few seconds'
      : 'The licence service is not available right now' });
  }
});

// Licence API for the plugins, in Lemon Squeezy's License API shapes.
// When the service itself is down the answer is deliberately NOT JSON: the
// plugin treats a non-object body as "could not ask" and keeps its activation,
// whereas {valid:false} would make it forget a perfectly good licence.
function licenceRoute(fn, pick) {
  return [smallBody, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!licenceLimit(req.ip)) return res.status(429).type('text/plain').send('Too many requests');
    try {
      const { status, body } = await withTimeout(fn(pick(req.body || {})), 10000);
      res.status(status).json(body);
    } catch (err) {
      console.error(`licence ${req.path}:`, err.message);
      res.status(503).type('text/plain').send('Licence service unavailable');
    }
  }];
}

app.post('/api/license/activate', licenceRoute(launch.activate,
  (b) => ({ licenseKey: b.license_key, instanceName: b.instance_name })));
app.post('/api/license/validate', licenceRoute(launch.validate,
  (b) => ({ licenseKey: b.license_key, instanceId: b.instance_id })));
app.post('/api/license/deactivate', licenceRoute(launch.deactivate,
  (b) => ({ licenseKey: b.license_key, instanceId: b.instance_id })));

// A body over the cap or unparseable JSON. Express's default handler would
// answer with an HTML stack trace (NODE_ENV is not set on Cloud Run); this
// says only the status. Plain text, for the same reason as above.
app.use('/api', (err, req, res, next) => {
  if (!err?.type || !err.status) return next(err);
  res.status(err.status).type('text/plain').send(err.status === 413 ? 'Request too large' : 'Bad request');
});

function productSlugFor(productId, productName = '') {
  const map = Object.fromEntries(
    (process.env.LS_PRODUCT_SLUGS || '').split(',')
      .map((pair) => pair.split(':').map((s) => s.trim()))
      .filter(([id, slug]) => id && slug),
  );
  if (map[String(productId)]) return map[String(productId)];
  const n = productName.toLowerCase();
  if (n.includes('bundle') || (n.includes('kubbe') && n.includes('kaset'))) return 'bundle';
  if (n.includes('kubbe')) return 'kubbe';
  if (n.includes('kaset')) return 'kaset';
  return null;
}

// POST /api/lemonsqueezy/webhook
// X-Signature is the hex HMAC-SHA256 of the raw request body under the
// webhook's signing secret (docs.lemonsqueezy.com/help/webhooks/signing-requests),
// so the body must be read raw — parsing it first would change the bytes.
// Writes one document per buyer, plugin_licenses/{lowercased e-mail}, with
// maps of orders and licence keys; firestore.rules lets only the signed-in
// owner of a verified matching e-mail read it, and no client write at all.
app.post('/api/lemonsqueezy/webhook', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ error: 'not configured' });

  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const digest = Buffer.from(createHmac('sha256', secret).update(raw).digest('hex'), 'utf8');
  const signature = Buffer.from(req.get('X-Signature') || '', 'utf8');
  if (signature.length !== digest.length || !timingSafeEqual(digest, signature)) {
    return res.status(401).json({ error: 'invalid signature' });
  }

  let payload;
  try {
    payload = JSON.parse(raw.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'invalid json' });
  }

  const event = payload?.meta?.event_name;
  const data = payload?.data || {};
  const a = data.attributes || {};
  const handled = ['order_created', 'order_refunded', 'license_key_created', 'license_key_updated'];
  // Anything else is acknowledged, so Lemon Squeezy does not retry it.
  if (!handled.includes(event)) return res.json({ ok: true, ignored: event || null });

  const email = String(a.user_email || '').trim().toLowerCase();
  if (!email || !data.id) return res.json({ ok: true, ignored: 'no e-mail' });

  try {
    const { db, FieldValue } = await adminFirestore();
    const ref = db.collection('plugin_licenses').doc(email);
    const update = { email, updated: FieldValue.serverTimestamp() };

    if (event === 'order_created' || event === 'order_refunded') {
      const item = a.first_order_item || {};
      update.orders = {
        [String(data.id)]: {
          order_id: String(data.id),
          order_number: a.order_number ?? null,
          status: a.status || null,
          refunded: Boolean(a.refunded),
          product_id: item.product_id ?? null,
          product_name: item.product_name || null,
          variant_name: item.variant_name || null,
          product: productSlugFor(item.product_id, item.product_name),
          receipt_url: a.urls?.receipt || null,
          created: a.created_at || null,
        },
      };
    } else {
      // A licence key carries product_id but no product name; the slug comes
      // from LS_PRODUCT_SLUGS, or the dashboard resolves it from the order
      // with the same order_id.
      update.licenses = {
        [String(data.id)]: {
          license_id: String(data.id),
          product: productSlugFor(a.product_id),
          product_id: a.product_id ?? null,
          key: a.key || null,
          key_short: a.key_short || null,
          status: a.status || null,
          disabled: Boolean(a.disabled),
          activation_limit: a.activation_limit ?? null,
          instances_count: a.instances_count ?? 0,
          order_id: a.order_id != null ? String(a.order_id) : null,
          expires_at: a.expires_at || null,
          created: a.created_at || null,
        },
      };
    }
    // merge: true merges nested maps, so each order and key is its own entry.
    await ref.set(update, { merge: true });
    res.json({ ok: true });
  } catch (err) {
    // A 5xx makes Lemon Squeezy retry (up to three more times).
    console.error('lemonsqueezy webhook:', err.message);
    res.status(500).json({ error: 'write failed' });
  }
});

// Nothing was compressing responses before this: the main bundle went out as
// ~890 KB of raw JavaScript on every request. gzip takes it to ~268 KB.
app.use(compression());

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
    res.sendFile(candidate);
    return;
  }
  res.sendFile(join(DIST_DIR, 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log(`subverselab-v2 serving dist/ on port ${PORT} (${SCRIPT_HASHES.length} inline script hash(es) in CSP)`)
);
