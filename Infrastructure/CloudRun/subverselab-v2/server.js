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
   Plugin sales API — Lemon Squeezy
   Two endpoints, both server-side because they need secrets the browser must
   never see. Env names only; values live in Cloud Run:
     LEMONSQUEEZY_API_KEY          read-only use: discount redemption counts
     LS_DISCOUNT_IDS               comma list of the launch discount ids
     LEMONSQUEEZY_WEBHOOK_SECRET   the webhook's signing secret
     LS_PRODUCT_SLUGS (optional)   "productId:slug,…" e.g. "111:kubbe,222:kaset,333:bundle"
   Field names checked against https://docs.lemonsqueezy.com/api on 2026-09-26.
   ============================================================ */

const LS_API = 'https://api.lemonsqueezy.com/v1';
const LAUNCH_CODES_TOTAL = 1000;
const CODES_CACHE_MS = 60_000;
let codesCache = { at: 0, body: null };

// GET /api/launch/codes → {total, redeemed} or {available:false}.
// Redeemed = the sum, over every launch discount, of the discount-redemptions
// list's meta.page.total for filter[discount_id]. One page of size 1 per
// discount is enough, because only the total is read. Any failure or missing
// env answers {available:false} and the page shows no number — never a guess.
async function readRedeemedCodes() {
  const key = process.env.LEMONSQUEEZY_API_KEY;
  const ids = (process.env.LS_DISCOUNT_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!key || ids.length === 0) return { available: false };
  let redeemed = 0;
  for (const id of ids) {
    const url = `${LS_API}/discount-redemptions?filter[discount_id]=${encodeURIComponent(id)}&page[size]=1`;
    const r = await fetch(url, {
      headers: { Accept: 'application/vnd.api+json', Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) throw new Error(`Lemon Squeezy ${r.status}`);
    const total = (await r.json())?.meta?.page?.total;
    if (!Number.isInteger(total)) throw new Error('No meta.page.total');
    redeemed += total;
  }
  return { total: LAUNCH_CODES_TOTAL, redeemed: Math.min(redeemed, LAUNCH_CODES_TOTAL) };
}

app.get('/api/launch/codes', async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60');
  if (codesCache.body && Date.now() - codesCache.at < CODES_CACHE_MS) {
    return res.json(codesCache.body);
  }
  let body;
  try {
    body = await readRedeemedCodes();
  } catch (err) {
    console.error('launch codes:', err.message);
    body = { available: false };
  }
  // Failures are cached too, so a Lemon Squeezy outage is asked about once a
  // minute rather than once per visitor.
  codesCache = { at: Date.now(), body };
  res.json(body);
});

// Firebase Admin is loaded on first use, not at startup: the static site must
// keep serving even where no Google credentials exist (local preview), and
// only a correctly signed webhook ever needs Firestore. On Cloud Run the
// service's own identity is picked up by application-default credentials —
// the same pattern as metadata-sync-service and ToolAuthBridge.
let firestorePromise = null;
function adminFirestore() {
  if (!firestorePromise) {
    firestorePromise = (async () => {
      const { initializeApp, applicationDefault, getApps } = await import('firebase-admin/app');
      const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
      if (!getApps().length) {
        initializeApp({
          credential: applicationDefault(),
          projectId: process.env.GOOGLE_CLOUD_PROJECT || 'project-62238635-aae4-41f4-880',
        });
      }
      return { db: getFirestore(), FieldValue };
    })();
    firestorePromise.catch(() => { firestorePromise = null; });
  }
  return firestorePromise;
}

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
