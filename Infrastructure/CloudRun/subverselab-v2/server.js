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
import { ownedLaunch1Slugs } from './entitlements.js';

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
     LS_BUNDLE4_PRODUCT_ID / LS_BUNDLE4_VARIANT_ID   the $20 launch-2 bundle (either one matches)
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
const launch2 = createLaunchService({ getAdmin: adminFirestore, launchId: 'launch2', product: 'bundle4', productId: 9015 });
const launches = { launch, launch2 };
const validLaunchId = (value) => value === 'launch2' ? 'launch2' : value === 'launch' ? 'launch' : null;
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
    for (const slug of ['kubbe', 'kaset', 'koro', 'yanki', 'hava', 'mihenk']) {
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

/* ---- Launch 2 is PAID: $20 through Lemon Squeezy --------------------------
   launch2_purchases/{lowercased e-mail} {orderId, paidAt, refunded, overCap, seat}
   launch2_seats/{lowercased e-mail}     {orderId, at}   one seat per buyer
   launch2/counter                       {claimed, downloads}  claimed = paid seats
   The webhook is the only writer; the ticket route only reads. */
const LAUNCH2_CAP = 1000;
const launch2Email = (value) => { const e = String(value || '').trim().toLowerCase(); return e && !e.includes('/') ? e : null; };
function isBundle4Order(item) {
  const product = process.env.LS_BUNDLE4_PRODUCT_ID, variant = process.env.LS_BUNDLE4_VARIANT_ID;
  return Boolean((product && String(item?.product_id) === String(product)) || (variant && String(item?.variant_id) === String(variant)));
}
async function launch2Purchase(admin, email) {
  const mail = launch2Email(email);
  if (!mail) return null;
  const snap = await admin.db.collection('launch2_purchases').doc(mail).get();
  return snap.exists ? snap.data() : null;
}
// 'paid' | 'refunded' | 'oversold' | 'none'
const launch2Standing = (purchase) => !purchase ? 'none' : purchase.refunded ? 'refunded' : purchase.overCap ? 'oversold' : 'paid';
// A hand-picked tester (launch2_testers/{e-mail}, see the testers block below)
// opens the same gate as a paid purchase but is never a paid seat: nothing here
// touches launch2/counter.claimed. A real purchase keeps its own standing.
async function launch2Access(admin, email) {
  const standing = launch2Standing(await launch2Purchase(admin, email));
  if (standing === 'paid') return standing;
  const mail = launch2Email(email);
  if (mail && (await admin.db.collection('launch2_testers').doc(mail).get()).exists) return 'tester';
  return standing;
}
const launch2Open = (standing) => standing === 'paid' || standing === 'tester';
const launch2Denied = (standing) => standing === 'oversold'
  ? { error: 'The 1,000 seats were already taken when your payment arrived — your order will be refunded' }
  : { error: 'Purchase required' };

async function recordLaunch2Order(admin, { email, orderId, paidAt }) {
  const { db } = admin;
  return db.runTransaction(async (tx) => {
    const purchaseRef = db.collection('launch2_purchases').doc(email);
    const seatRef = db.collection('launch2_seats').doc(email);
    const counterRef = db.collection('launch2').doc('counter');
    const [purchaseSnap, seatSnap, counterSnap] = await Promise.all([tx.get(purchaseRef), tx.get(seatRef), tx.get(counterRef)]);
    const purchase = purchaseSnap.exists ? purchaseSnap.data() : null;
    if (purchase && purchase.orderId === orderId) return { result: 'duplicate' };
    if (purchase && !purchase.refunded) {
      // A second paid order from the same e-mail: keep the first, note the second so it can be refunded.
      tx.set(purchaseRef, { extraOrders: { [orderId]: { paidAt } } }, { merge: true });
      return { result: 'extra-order' };
    }
    const claimed = counterSnap.exists ? Number(counterSnap.data().claimed) || 0 : 0;
    let overCap = false, seat = true;
    if (!seatSnap.exists) {
      if (claimed >= LAUNCH2_CAP) { overCap = true; seat = false; }
      else {
        tx.set(seatRef, { orderId, at: paidAt });
        tx.set(counterRef, { claimed: claimed + 1 }, { merge: true });
      }
    }
    tx.set(purchaseRef, { email, orderId, paidAt, refunded: false, overCap, seat }, { merge: true });
    return { result: overCap ? 'over-cap' : 'recorded' };
  });
}
async function refundLaunch2Order(admin, { email, orderId, at }) {
  const { db } = admin;
  return db.runTransaction(async (tx) => {
    const ref = db.collection('launch2_purchases').doc(email);
    const snap = await tx.get(ref);
    if (!snap.exists) return { result: 'unknown-order' };
    const purchase = snap.data();
    if (purchase.orderId !== orderId) return { result: 'other-order' };
    // The seat is deliberately NOT released: the owner decides what to do with it.
    tx.set(ref, { refunded: true, refundedAt: at }, { merge: true });
    return { result: 'refunded' };
  });
}
app.post('/api/download/ticket', smallBody, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.DOWNLOAD_TICKET_SECRET) return res.status(503).json({ error: 'Download room is not configured' });
  if (!downloadLimit(req.ip)) return res.status(429).json({ error: 'Too many requests' });
  const token = (req.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'Sign in first' });
  let admin, decoded;
  try { admin = await adminFirestore(); decoded = await admin.auth.verifyIdToken(token); } catch (err) { return res.status(serviceDown(err) ? 503 : 401).json({ error: serviceDown(err) ? 'Download service unavailable' : 'Your sign-in has expired — sign in again' }); }
  const { slug, platform } = req.body || {};
  const launchId = validLaunchId(req.body?.launchId) || 'launch';
  if (!decoded.email || (launchId === 'launch2' && emailVerificationRequired(decoded) && decoded.email_verified !== true)) return res.status(403).json({ error: 'Verify your e-mail address first' });
  const launchService = launches[launchId];
  const launchSlugs = launchId === 'launch2' ? ['koro', 'yanki', 'hava', 'mihenk'] : ['kubbe', 'kaset'];
  if (!launchSlugs.includes(slug) || !['mac', 'win'].includes(platform)) return res.status(400).json({ error: 'Invalid plugin or platform' });
  try {
    // Launch 2 is paid: the seat was claimed by the payment webhook, so here
    // we only check that this e-mail holds a paid, non-refunded purchase — or
    // has been approved as a tester.
    if (launchId === 'launch2') {
      const standing = await launch2Access(admin, decoded.email);
      if (!launch2Open(standing)) return res.status(402).json(launch2Denied(standing));
    }
    const manifest = await withTimeout(downloadManifest(), 8000);
    const file = manifest?.[slug]?.files?.[platform];
    if (!file?.name) return res.status(404).json({ error: 'This download is not available yet' });
    if (launchId !== 'launch2') {
      // While the free 1,000 last, the first download claims a seat. Once they
      // are gone the room is a shop: only a paid, non-refunded order for this
      // plugin (or the bundle) opens it — an earlier free download does not.
      const { claimed, total } = await withTimeout(launchService.readCounter(), 8000);
      if (claimed >= total) {
        const owned = await withTimeout(ownedLaunch1Slugs(admin, decoded.email), 8000);
        if (!owned.includes(slug)) return res.status(402).json({ error: 'The free 1,000 are gone. Buy this plugin to download it.' });
      } else {
        const claim = await withTimeout(launchService.claim({ uid: decoded.uid, email: decoded.email }), 15000);
        if (claim.status === 410) return res.status(410).json(claim.body);
        if (claim.status !== 200) return res.status(claim.status).json(claim.body);
      }
    }
    const now = new Date().toISOString();
    await admin.db.runTransaction(async (tx) => {
      const counter = admin.db.collection(launchId).doc('counter');
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

// Firebase already verifies the address for federated providers such as
// Google. Requiring the password-provider flag for those accounts blocked the
// launch download room after the payment-gate work. Password/email accounts
// still need the normal verification link.
function emailVerificationRequired(decoded) {
  const provider = decoded?.firebase?.sign_in_provider;
  return provider === 'password' || provider === 'email' || !provider;
}

// GET /api/launch2/status   Authorization: Bearer <Firebase ID token>
// → {paid, tester, standing}. Lets the page show the download buttons or "Buy to unlock".
// standing 'tester' = approved for the 100 tester seats, not a paid seat.
app.get('/api/launch2/status', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!downloadLimit(req.ip)) return res.status(429).json({ error: 'Too many requests' });
  const token = (req.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'Sign in first' });
  try {
    const admin = await adminFirestore();
    const decoded = await admin.auth.verifyIdToken(token);
    if (!decoded.email || (emailVerificationRequired(decoded) && decoded.email_verified !== true)) return res.status(403).json({ error: 'Verify your e-mail address first' });
    const standing = await launch2Access(admin, decoded.email);
    return res.json({ paid: standing === 'paid', tester: standing === 'tester', standing });
  } catch (err) {
    return res.status(serviceDown(err) ? 503 : 401).json({ error: serviceDown(err) ? 'Service unavailable' : 'Your sign-in has expired — sign in again' });
  }
});

// GET /api/purchases/status   Authorization: Bearer <Firebase ID token>
// → {full, owned:[slugs]}. After the free 1,000 the page shows the download
// buttons only for the plugins this e-mail has paid for.
app.get('/api/purchases/status', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!downloadLimit(req.ip)) return res.status(429).json({ error: 'Too many requests' });
  const token = (req.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'Sign in first' });
  try {
    const admin = await adminFirestore();
    const decoded = await admin.auth.verifyIdToken(token);
    if (!decoded.email || (emailVerificationRequired(decoded) && decoded.email_verified !== true)) return res.status(403).json({ error: 'Verify your e-mail address first' });
    const { claimed, total } = await withTimeout(launch.readCounter(), 8000);
    return res.json({ full: claimed >= total, owned: await withTimeout(ownedLaunch1Slugs(admin, decoded.email), 8000) });
  } catch (err) {
    return res.status(serviceDown(err) ? 503 : 401).json({ error: serviceDown(err) ? 'Service unavailable' : 'Your sign-in has expired — sign in again' });
  }
});

// GET /api/purchases/licenses   Authorization: Bearer <Firebase ID token>
// → {licenses:[{id, product, productName, key, keyShort, status, disabled, activationLimit, instancesCount, orderId, created}]}
// The signed-in caller's own licence keys from plugin_licenses/{their e-mail}.licenses
// (written by the Lemon Squeezy webhook). Keys are returned to that caller only and are never logged.
app.get('/api/purchases/licenses', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!downloadLimit(req.ip)) return res.status(429).json({ error: 'Too many requests' });
  const token = (req.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'Sign in first' });
  try {
    const admin = await adminFirestore();
    const decoded = await admin.auth.verifyIdToken(token);
    if (!decoded.email || (emailVerificationRequired(decoded) && decoded.email_verified !== true)) return res.status(403).json({ error: 'Verify your e-mail address first' });
    const mail = String(decoded.email).trim().toLowerCase();
    if (mail.includes('/')) return res.json({ licenses: [] });
    const snap = await withTimeout(admin.db.collection('plugin_licenses').doc(mail).get(), 8000);
    const data = snap.exists ? snap.data() : {};
    const orders = data.orders || {};
    const licenses = Object.values(data.licenses || {})
      .filter((l) => l && l.key && !l.disabled)
      .map((l) => ({
        id: String(l.license_id || ''),
        product: l.product || orders[l.order_id]?.product || null,
        productName: orders[l.order_id]?.product_name || null,
        key: l.key,
        keyShort: l.key_short || null,
        status: l.status || null,
        activationLimit: l.activation_limit ?? null,
        instancesCount: l.instances_count ?? 0,
        orderId: l.order_id || null,
        created: l.created || null,
      }))
      .sort((x, y) => String(y.created || '').localeCompare(String(x.created || '')));
    return res.json({ licenses });
  } catch (err) {
    return res.status(serviceDown(err) ? 503 : 401).json({ error: serviceDown(err) ? 'Service unavailable' : 'Your sign-in has expired — sign in again' });
  }
});

const CODES_CACHE_MS = 30_000;
const codesCache = new Map();

// GET /api/launch/codes?launch=launch2 → {total, claimed} or {available:false}.
// Read from launch/counter, the one counter every claim increments — the
// /launch button and the Instagram DMs both end up there. Any failure answers
// {available:false} and the page shows no number, never a guess.
app.get('/api/launch/codes', async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=30');
  const launchId = validLaunchId(req.query.launch) || 'launch';
  const launchService = launches[launchId];
  const cached = codesCache.get(launchId);
  if (cached?.body && Date.now() - cached.at < CODES_CACHE_MS) return res.json(cached.body);
  let body;
  try {
    body = await withTimeout(launchService.readCounter(), 5000);
  } catch (err) {
    console.error('launch codes:', err.message);
    body = { available: false };
  }
  // Failures are cached too, so an outage is asked about twice a minute rather
  // than once per visitor.
  codesCache.set(launchId, { at: Date.now(), body });
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
// One free launch licence per e-mail and per Firebase account, while
// the 1,000 last; asking again returns the same key.
app.post('/api/launch/claim', smallBody, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!claimLimit(req.ip)) return res.status(429).json({ error: 'Too many requests — try again in a minute' });

  const token = (req.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'Sign in first' });

  const launchId = validLaunchId(req.body?.launchId) || 'launch';
  const launchService = launches[launchId];
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
  if (!decoded.email || (launchId === 'launch2' && emailVerificationRequired(decoded) && decoded.email_verified !== true)) {
    return res.status(403).json({ error: 'Verify your e-mail address first' });
  }

  // Launch 2 seats are sold, not given (testers are let in, not counted): nothing is minted here.
  if (launchId === 'launch2') {
    try {
      const standing = await launch2Access(admin, decoded.email);
      if (!launch2Open(standing)) return res.status(402).json(launch2Denied(standing));
      return res.json({ paid: standing === 'paid', tester: standing === 'tester', ...(await withTimeout(launchService.readCounter(), 5000)) });
    } catch (err) {
      console.error('launch2 claim:', err.message);
      return res.status(503).json({ error: 'The licence service is not available right now' });
    }
  }

  try {
    const { status, body } = await withTimeout(launchService.claim({ uid: decoded.uid, email: decoded.email }), 15000);
    if (status === 200 || status === 410) codesCache.set(launchId, { at: Date.now(), body: { total: body.total, claimed: body.claimed } });
    res.status(status).json(body);
  } catch (err) {
    console.error('launch claim:', err.message);
    const busy = /ABORTED|contention/i.test(err.message) || err.code === 10;
    res.status(503).json({ error: busy ? 'Many people are claiming right now — try again in a few seconds'
      : 'The licence service is not available right now' });
  }
});

// GET /api/admin/members   Authorization: Bearer <Firebase ID token>
// The admin panel's member list, read from Firebase Auth itself (the old
// Firestore `users` collection stopped being written and froze at 11), joined
// with the per-account download counts from `downloads`. Admin only, and only
// for a *verified* admin address: sign-up no longer requires verification, so
// an unverified account holding an admin address must not get in.
const ADMIN_EMAILS = ['info@subverselab.com', 'senolsahan037@gmail.com'];
const adminLimit = tokenBucket({ perMinute: 20 });
app.get('/api/admin/members', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!adminLimit(req.ip)) return res.status(429).json({ error: 'Too many requests' });
  const token = (req.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'Sign in first' });
  let admin, decoded;
  try { admin = await adminFirestore(); decoded = await admin.auth.verifyIdToken(token); } catch (err) { return res.status(serviceDown(err) ? 503 : 401).json({ error: serviceDown(err) ? 'Member service unavailable' : 'Your sign-in has expired — sign in again' }); }
  if (decoded.email_verified !== true || !ADMIN_EMAILS.includes(String(decoded.email || '').toLowerCase())) return res.status(403).json({ error: 'Admins only' });
  try {
    const members = [];
    let pageToken;
    do {
      const page = await withTimeout(admin.auth.listUsers(1000, pageToken), 15000);
      for (const u of page.users) {
        members.push({
          uid: u.uid, email: u.email || '', displayName: u.displayName || '',
          provider: u.providerData.map((p) => p.providerId).join(', ') || 'none',
          createdAt: u.metadata.creationTime, lastSignInAt: u.metadata.lastSignInTime,
          downloads: 0,
        });
      }
      pageToken = page.pageToken;
    } while (pageToken);
    const byUid = new Map(members.map((m) => [m.uid, m]));
    const snap = await withTimeout(admin.db.collection('downloads').get(), 15000);
    for (const d of snap.docs) {
      const m = byUid.get(d.id);
      if (!m) continue;
      const v = d.data() || {};
      for (const slug of ['kubbe', 'kaset', 'koro', 'yanki', 'hava', 'mihenk']) for (const platform of ['mac', 'win']) m.downloads += Number(v?.[slug]?.[platform]?.count) || 0;
    }
    const counter = await admin.db.collection('launch').doc('counter').get();
    return res.json({ members, launch: counter.exists ? counter.data() : null });
  } catch (err) {
    console.error('admin members:', err.message);
    return res.status(503).json({ error: 'Member service unavailable' });
  }
});

/* ---- The 100 testers --------------------------------------------------------
   Launch 2 is given free to 100 hand-picked testers, chosen so that operating
   systems and DAWs are covered and the people know enough to report bugs.
   tester_applications/{lowercased e-mail} {status, os, osVersion, daws, dawOther,
                                            formats, years, link, answer, at, decidedAt}
   launch2_testers/{lowercased e-mail}     {approvedAt, os, daws, reports}  the gate
   launch2/testers                         {approved}  seats taken, max TESTER_CAP
   tester_reports/{auto id}                {email, plugin, os, daw, dawVersion, kind, text, at}
   Testers are never paid seats: launch2/counter.claimed is not touched. */
const TESTER_CAP = 100;
const TESTER_REPORT_CAP = 50;
const TESTER_OS = ['macOS Apple Silicon', 'macOS Intel', 'Windows 11', 'Windows 10'];
const TESTER_DAWS = ['Ableton Live', 'FL Studio', 'Logic Pro', 'Cubase', 'Studio One', 'Reaper', 'Pro Tools', 'Bitwig Studio', 'Other'];
const TESTER_FORMATS = ['VST3', 'AU'];
const TESTER_PLUGINS = ['koro', 'yanki', 'hava', 'mihenk'];
const TESTER_KINDS = ['bug', 'sound', 'ui', 'works'];
const testerBody = express.json({ limit: '16kb' });
const testerLimit = tokenBucket({ perMinute: 20 });
const testerSeatsLimit = tokenBucket({ perMinute: 30 });
const cleanText = (value, max) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const cleanParagraph = (value, max) => (typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim().slice(0, max) : '');

// Authenticates a tester-programme request exactly like the download ticket
// (verified e-mail), or — with adminOnly — exactly like /api/admin/members.
// Answers the error itself and returns null, so callers just `if (!caller) return`.
async function testerCaller(req, res, { adminOnly = false } = {}) {
  res.setHeader('Cache-Control', 'no-store');
  if (!(adminOnly ? adminLimit : testerLimit)(req.ip)) { res.status(429).json({ error: 'Too many requests' }); return null; }
  const token = (req.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) { res.status(401).json({ error: 'Sign in first' }); return null; }
  let admin, decoded;
  try { admin = await adminFirestore(); decoded = await admin.auth.verifyIdToken(token); } catch (err) {
    res.status(serviceDown(err) ? 503 : 401).json({ error: serviceDown(err) ? 'Tester service unavailable' : 'Your sign-in has expired — sign in again' });
    return null;
  }
  if (adminOnly) {
    if (decoded.email_verified !== true || !ADMIN_EMAILS.includes(String(decoded.email || '').toLowerCase())) { res.status(403).json({ error: 'Admins only' }); return null; }
  } else if (!decoded.email || decoded.email_verified !== true) { res.status(403).json({ error: 'Verify your e-mail address first' }); return null; }
  const email = launch2Email(decoded.email);
  if (!email && !adminOnly) { res.status(403).json({ error: 'Verify your e-mail address first' }); return null; }
  return { admin, decoded, email };
}

// Every field is checked and clamped here; the page's own checks are only a courtesy.
function readApplication(body) {
  const b = body && typeof body === 'object' ? body : {};
  const os = TESTER_OS.includes(b.os) ? b.os : null;
  if (!os) return { error: 'Choose your operating system' };
  const osVersion = cleanText(b.osVersion, 40);
  if (!osVersion) return { error: 'Enter your operating system version' };
  const daws = [...new Set(Array.isArray(b.daws) ? b.daws.filter((d) => TESTER_DAWS.includes(d)) : [])];
  if (!daws.length) return { error: 'Choose at least one DAW' };
  const dawOther = daws.includes('Other') ? cleanText(b.dawOther, 60) : '';
  if (daws.includes('Other') && !dawOther) return { error: 'Name the other DAW you use' };
  const formats = [...new Set(Array.isArray(b.formats) ? b.formats.filter((f) => TESTER_FORMATS.includes(f)) : [])];
  if (!formats.length) return { error: 'Choose VST3, AU or both' };
  if (os.startsWith('Windows') && formats.includes('AU')) return { error: 'AU is a macOS format' };
  const years = Number(b.years);
  if (b.years === '' || b.years == null || !Number.isFinite(years) || years < 0) return { error: 'Enter how many years you have been producing' };
  let link = '';
  if (typeof b.link === 'string' && b.link.trim()) {
    link = b.link.trim().slice(0, 300);
    try { if (!/^https?:$/.test(new URL(link).protocol)) throw new Error('scheme'); } catch { return { error: 'The link must start with http:// or https://' }; }
  }
  const answer = cleanParagraph(b.answer, 1200);
  if (answer.length < 40) return { error: 'Describe the bug in at least 40 characters' };
  return { value: { os, osVersion, daws, dawOther, formats, years: Math.min(60, Math.floor(years)), link, answer } };
}

// GET /api/testers/seats → {total, approved}. Public: the page shows the seats left.
app.get('/api/testers/seats', async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=30');
  if (!testerSeatsLimit(req.ip)) return res.status(429).json({ error: 'Too many requests' });
  try {
    const admin = await adminFirestore();
    const snap = await withTimeout(admin.db.collection('launch2').doc('testers').get(), 5000);
    return res.json({ total: TESTER_CAP, approved: snap.exists ? Number(snap.data().approved) || 0 : 0 });
  } catch (err) {
    console.error('testers seats:', err.message);
    return res.status(503).json({ error: 'Seat count unavailable' });
  }
});

// GET /api/testers/me → {status: 'none' | 'pending' | 'approved' | 'declined'}
app.get('/api/testers/me', async (req, res) => {
  const caller = await testerCaller(req, res);
  if (!caller) return;
  try {
    const snap = await caller.admin.db.collection('tester_applications').doc(caller.email).get();
    return res.json({ status: snap.exists && ['pending', 'approved', 'declined'].includes(snap.data().status) ? snap.data().status : 'none' });
  } catch (err) {
    console.error('testers me:', err.message);
    return res.status(503).json({ error: 'Tester service unavailable' });
  }
});

// POST /api/testers/apply   one application per e-mail. Sending it again while
// it is still pending replaces it; once the owner has decided it is locked.
app.post('/api/testers/apply', testerBody, async (req, res) => {
  const caller = await testerCaller(req, res);
  if (!caller) return;
  const { value, error } = readApplication(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const { db } = caller.admin;
    const ref = db.collection('tester_applications').doc(caller.email);
    const out = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists && snap.data().status !== 'pending') return { status: snap.data().status };
      tx.set(ref, { email: caller.email, uid: caller.decoded.uid, ...value, status: 'pending', at: new Date().toISOString() });
      return { status: 'pending' };
    });
    if (out.status !== 'pending') return res.status(409).json({ error: 'Your application has already been decided', status: out.status });
    return res.json({ status: 'pending' });
  } catch (err) {
    console.error('testers apply:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});

// POST /api/testers/report   approved testers only; TESTER_REPORT_CAP reports each.
app.post('/api/testers/report', testerBody, async (req, res) => {
  const caller = await testerCaller(req, res);
  if (!caller) return;
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const os = TESTER_OS.includes(b.os) ? b.os : null;
  const daw = cleanText(b.daw, 60);
  const text = cleanParagraph(b.text, 4000);
  if (!TESTER_PLUGINS.includes(b.plugin)) return res.status(400).json({ error: 'Choose a plugin' });
  if (!os) return res.status(400).json({ error: 'Choose your operating system' });
  if (!daw) return res.status(400).json({ error: 'Name the DAW you were using' });
  if (!TESTER_KINDS.includes(b.kind)) return res.status(400).json({ error: 'Choose what kind of report this is' });
  if (text.length < 20) return res.status(400).json({ error: 'Write at least 20 characters' });
  try {
    const { db } = caller.admin;
    const testerRef = db.collection('launch2_testers').doc(caller.email);
    const out = await db.runTransaction(async (tx) => {
      const snap = await tx.get(testerRef);
      if (!snap.exists) return { status: 403, error: 'Tester reports are for approved testers' };
      const sent = Number(snap.data().reports) || 0;
      if (sent >= TESTER_REPORT_CAP) return { status: 429, error: `You have sent the maximum of ${TESTER_REPORT_CAP} reports` };
      tx.set(testerRef, { reports: sent + 1 }, { merge: true });
      tx.set(db.collection('tester_reports').doc(), {
        email: caller.email, plugin: b.plugin, os, daw, dawVersion: cleanText(b.dawVersion, 40), kind: b.kind, text, at: new Date().toISOString(),
      });
      return { status: 200, left: TESTER_REPORT_CAP - sent - 1 };
    });
    return out.status === 200 ? res.json({ ok: true, left: out.left }) : res.status(out.status).json({ error: out.error });
  } catch (err) {
    console.error('testers report:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});

// GET /api/admin/testers → every application, newest first, and how well the
// approved testers cover the operating systems and DAWs.
app.get('/api/admin/testers', async (req, res) => {
  const caller = await testerCaller(req, res, { adminOnly: true });
  if (!caller) return;
  try {
    const { db } = caller.admin;
    const [apps, counter] = await withTimeout(Promise.all([db.collection('tester_applications').get(), db.collection('launch2').doc('testers').get()]), 15000);
    const applications = apps.docs.map((d) => ({ email: d.id, ...d.data() })).sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
    const coverage = { os: Object.fromEntries(TESTER_OS.map((o) => [o, 0])), daws: Object.fromEntries(TESTER_DAWS.map((d) => [d, 0])) };
    for (const a of applications) {
      if (a.status !== 'approved') continue;
      if (a.os in coverage.os) coverage.os[a.os] += 1;
      for (const d of a.daws || []) if (d in coverage.daws) coverage.daws[d] += 1;
    }
    return res.json({ applications, coverage, approved: counter.exists ? Number(counter.data().approved) || 0 : 0, total: TESTER_CAP });
  } catch (err) {
    console.error('admin testers:', err.message);
    return res.status(503).json({ error: 'Tester service unavailable' });
  }
});

// POST /api/admin/testers/decide {email, decision: 'approve' | 'decline'}
// Approving takes a seat in one transaction and is refused at TESTER_CAP;
// declining an approved tester gives the seat back and closes the gate.
app.post('/api/admin/testers/decide', smallBody, async (req, res) => {
  const caller = await testerCaller(req, res, { adminOnly: true });
  if (!caller) return;
  const email = launch2Email(req.body?.email);
  const decision = req.body?.decision;
  if (!email || !['approve', 'decline'].includes(decision)) return res.status(400).json({ error: 'Send an e-mail and a decision (approve or decline)' });
  try {
    const { db } = caller.admin;
    const appRef = db.collection('tester_applications').doc(email);
    const testerRef = db.collection('launch2_testers').doc(email);
    const counterRef = db.collection('launch2').doc('testers');
    const out = await db.runTransaction(async (tx) => {
      const [appSnap, testerSnap, counterSnap] = await Promise.all([tx.get(appRef), tx.get(testerRef), tx.get(counterRef)]);
      if (!appSnap.exists) return { status: 404, error: 'No application from this e-mail' };
      const approved = counterSnap.exists ? Number(counterSnap.data().approved) || 0 : 0;
      const now = new Date().toISOString();
      if (decision === 'approve') {
        if (testerSnap.exists) return { status: 200, result: 'already-approved', approved };
        if (approved >= TESTER_CAP) return { status: 409, error: `All ${TESTER_CAP} tester seats are taken` };
        const a = appSnap.data();
        tx.set(testerRef, { email, approvedAt: now, os: a.os || null, daws: a.daws || [], reports: 0 });
        tx.set(counterRef, { approved: approved + 1 }, { merge: true });
        tx.set(appRef, { status: 'approved', decidedAt: now }, { merge: true });
        return { status: 200, result: 'approved', approved: approved + 1 };
      }
      if (testerSnap.exists) {
        tx.delete(testerRef);
        tx.set(counterRef, { approved: Math.max(0, approved - 1) }, { merge: true });
      }
      tx.set(appRef, { status: 'declined', decidedAt: now }, { merge: true });
      return { status: 200, result: 'declined', approved: testerSnap.exists ? Math.max(0, approved - 1) : approved };
    });
    return out.status === 200 ? res.json({ ok: true, result: out.result, approved: out.approved }) : res.status(out.status).json({ error: out.error });
  } catch (err) {
    console.error('admin testers decide:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});

// GET /api/admin/testers/reports → the newest 500 reports, newest first.
app.get('/api/admin/testers/reports', async (req, res) => {
  const caller = await testerCaller(req, res, { adminOnly: true });
  if (!caller) return;
  try {
    const snap = await withTimeout(caller.admin.db.collection('tester_reports').orderBy('at', 'desc').limit(500).get(), 15000);
    return res.json({ reports: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (err) {
    console.error('admin tester reports:', err.message);
    return res.status(503).json({ error: 'Tester service unavailable' });
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

  // Launch 2 ($20 bundle of four): order_created (paid) records the purchase and
  // claims a seat; order_refunded flags it. Handled here and nowhere else.
  if ((event === 'order_created' || event === 'order_refunded') && isBundle4Order(a.first_order_item)) {
    const orderId = String(data.id);
    try {
      const admin = await adminFirestore();
      const mail = launch2Email(email);
      if (!mail) return res.json({ ok: true, ignored: 'no usable e-mail' });
      if (event === 'order_refunded') {
        const out = await refundLaunch2Order(admin, { email: mail, orderId, at: new Date().toISOString() });
        console.warn(`launch2 refund: order ${orderId} ${out.result}; seat not released — owner decides`);
        return res.json({ ok: true, launch2: out.result });
      }
      if (a.status !== 'paid') return res.json({ ok: true, ignored: `status ${a.status || 'unknown'}` });
      const out = await recordLaunch2Order(admin, { email: mail, orderId, paidAt: a.created_at || new Date().toISOString() });
      if (out.result === 'over-cap') console.warn(`launch2 OVER CAP: order ${orderId} paid but all ${LAUNCH2_CAP} seats are taken — refund it`);
      if (out.result === 'extra-order') console.warn(`launch2 extra order ${orderId} from an e-mail that already paid — refund it`);
      return res.json({ ok: true, launch2: out.result });
    } catch (err) {
      console.error('launch2 webhook:', err.message);
      return res.status(500).json({ error: 'write failed' });
    }
  }

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
