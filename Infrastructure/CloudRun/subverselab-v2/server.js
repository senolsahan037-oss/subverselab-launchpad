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
import { ownedLaunch1Slugs, ownedOrderSlugs, purchasedByOrders, addYears, ALL_SLUGS, FREE_SLUGS, PLUGIN_SLUGS, UPDATE_YEARS, ADMIN_EMAILS, ADMIN_PREVIEW_KEY, isAdminPreview } from './entitlements.js';
import { createAccountDeleter, purgeResolvedReports, emailMarker, ERASED_COLLECTION } from './accountDeletion.js';
import { createCreditsService, orderAmount, CREDIT_COSTS } from './credits.js';

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
     LS_FAMILY_PRODUCT_ID / LS_FAMILY_VARIANT_ID     the $19.99 plugin-family bundle, seven products (either one matches)
     LS_BUNDLE4_PRODUCT_ID / LS_BUNDLE4_VARIANT_ID   old names of the same two settings, still accepted
     LS_PRODUCT_SLUGS   "productId:slug,…": which Lemon Squeezy product opens which plugin. A paid single order opens
                        exactly the plugin named here. Slugs: kubbe, kaset, koro, yanki, hava, mihenk, tutkal (singles), taban and alev (free, $0 products),
                        bundle (the old $15 KUBBE + KASET order: opens both), family (the $19.99 family, informational:
                        its access comes from LS_FAMILY_PRODUCT_ID / LS_FAMILY_VARIANT_ID). Example:
                        "1402269:kubbe,1402277:kaset,1402289:bundle,1414121:family,AAA:koro,BBB:yanki,CCC:hava,DDD:tutkal,EEE:mihenk"
                        A product missing here falls back to its product NAME (contains the plugin name), so name each
                        Lemon Squeezy product after its plugin; the explicit id list is still the safe way.
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
const credits = createCreditsService({ getAdmin: adminFirestore });
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
    for (const slug of PLUGIN_SLUGS) {
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

/* ---- Launch 2 (the plugin family, $19.99) is PAID through Lemon Squeezy --------------------------
   launch2_purchases/{lowercased e-mail} {orderId, paidAt, refunded, overCap, seat}
   launch2_seats/{lowercased e-mail}     {orderId, at}   one seat per buyer
   launch2_uids/{Firebase uid}           {email, orderId, at}  the account that clicked Buy
     (checkout[custom][uid] -> meta.custom_data.uid). It points at the purchase above, so a
     refund / over-cap on the purchase applies to the uid too. A bound uid needs no verified e-mail.
   launch2/counter                       {claimed, downloads}  claimed = paid seats
   The webhook is the only writer; the ticket route only reads. */
// Owner 2026-10-05: no person cap on the family; the launch price ends on a date (src/data/plugins.js FAMILY_OFFER_ENDS_AT).
// The counter still counts paid seats. LAUNCH2_CAP env can re-impose a cap (tests use it).
const LAUNCH2_CAP = Number(process.env.LAUNCH2_CAP) || Infinity;
const launch2Email = (value) => { const e = String(value || '').trim().toLowerCase(); return e && !e.includes('/') ? e : null; };
// The family bundle (KUBBE, KASET, KORO, YANKI, HAVA, MIHENK, TUTKAL). The LS_FAMILY_* names are
// the current ones; LS_BUNDLE4_* (the old four-product bundle) keep working.
function isFamilyOrder(item) {
  const products = [process.env.LS_FAMILY_PRODUCT_ID, process.env.LS_BUNDLE4_PRODUCT_ID].filter(Boolean).map(String);
  const variants = [process.env.LS_FAMILY_VARIANT_ID, process.env.LS_BUNDLE4_VARIANT_ID].filter(Boolean).map(String);
  return products.includes(String(item?.product_id)) || variants.includes(String(item?.variant_id));
}
// Firebase uids are up to 128 chars of [A-Za-z0-9] (custom-token uids may add _ and -); anything else is not a usable doc id here.
const launch2Uid = (value) => { const u = String(value || '').trim(); return /^[A-Za-z0-9_-]{1,128}$/.test(u) ? u : null; };
async function launch2Purchase(admin, email) {
  const mail = launch2Email(email);
  if (!mail) return null;
  const snap = await admin.db.collection('launch2_purchases').doc(mail).get();
  if (snap.exists) return snap.data();
  // After an account deletion only the hashed, reduced purchase is left (accountDeletion.js).
  const kept = await admin.db.collection(ERASED_COLLECTION).doc(emailMarker(mail)).get();
  return kept.exists && kept.data().purchase ? kept.data().purchase : null;
}
// 'paid' | 'refunded' | 'oversold' | 'none'
const launch2Standing = (purchase) => !purchase ? 'none' : purchase.refunded ? 'refunded' : purchase.overCap ? 'oversold' : 'paid';
// Standing of the purchase bound to this Firebase uid (the account that paid).
async function launch2UidStanding(admin, uid) {
  const id = launch2Uid(uid);
  if (!id) return 'none';
  const snap = await admin.db.collection('launch2_uids').doc(id).get();
  if (!snap.exists) return 'none';
  const bind = snap.data();
  const purchase = await launch2Purchase(admin, bind.email);
  if (!purchase || purchase.orderId !== bind.orderId) return 'none';
  return launch2Standing(purchase);
}
// A hand-picked tester (launch2_testers/{e-mail}, see the testers block below)
// opens the same gate as a paid purchase but is never a paid seat: nothing here
// touches launch2/counter.claimed. A real purchase keeps its own standing.
// `decoded` is the verified ID token. Rules:
//  1. a paid order bound to this uid opens it, verified e-mail or not (the
//     account that paid is the account that clicked Buy);
//  2. otherwise the e-mail-matched purchase / tester entry counts only when the
//     e-mail is verified (or a federated sign-in such as Google);
//  3. an unverified account with no uid-bound paid order gets 'unverified'.
// A refunded / oversold uid-bound order is reported as such, never as 'unverified'.
async function launch2Access(admin, decoded) {
  if (isAdminPreview(decoded)) return 'paid'; // admin preview: behaves like a family buyer, nothing is stored
  const uidStanding = await launch2UidStanding(admin, decoded.uid);
  if (uidStanding === 'paid') return uidStanding;
  const verified = !emailVerificationRequired(decoded) || decoded.email_verified === true;
  if (!verified) return uidStanding === 'none' ? 'unverified' : uidStanding;
  const standing = launch2Standing(await launch2Purchase(admin, decoded.email));
  if (standing === 'paid') return standing;
  const mail = launch2Email(decoded.email);
  if (mail && (await admin.db.collection('launch2_testers').doc(mail).get()).exists) return 'tester';
  // A refunded / oversold order bound to this uid (checkout e-mail differs) is reported as such, not as 'none'.
  return standing === 'none' ? uidStanding : standing;
}
const launch2Open = (standing) => standing === 'paid' || standing === 'tester';
const launch2Denied = (standing) => standing === 'unverified'
  ? { error: 'Verify your e-mail address first' }
  : standing === 'oversold'
  ? { error: 'The 1,000 seats were already taken when your payment arrived — your order will be refunded' }
  : { error: 'Purchase required' };
const launch2DeniedStatus = (standing) => standing === 'unverified' ? 403 : 402;

async function recordLaunch2Order(admin, { email, uid, orderId, paidAt, amount = null }) {
  const { db } = admin;
  return db.runTransaction(async (tx) => {
    const purchaseRef = db.collection('launch2_purchases').doc(email);
    const seatRef = db.collection('launch2_seats').doc(email);
    const counterRef = db.collection('launch2').doc('counter');
    const uidRef = launch2Uid(uid) ? db.collection('launch2_uids').doc(launch2Uid(uid)) : null;
    const erasedRef = db.collection(ERASED_COLLECTION).doc(emailMarker(email));
    const [purchaseSnap, seatSnap, counterSnap, uidSnap, erasedSnap] = await Promise.all([tx.get(purchaseRef), tx.get(seatRef), tx.get(counterRef), uidRef ? tx.get(uidRef) : null, tx.get(erasedRef)]);
    const purchase = purchaseSnap.exists ? purchaseSnap.data() : null;
    // A purchase or seat that survives an account deletion only as a hashed marker still counts.
    const erased = erasedSnap.exists ? erasedSnap.data() : {};
    if (!purchase && erased.purchase?.orderId === orderId) return { result: 'duplicate' };
    // A uid already bound to a live (paid, not refunded) order of another purchase keeps it; the new
    // order stays e-mail matched only. Read here, before any write.
    let bindUid = Boolean(uidRef);
    if (uidRef && uidSnap.exists) {
      const bound = uidSnap.data();
      if (bound.orderId !== orderId && bound.email !== email) {
        const otherSnap = await tx.get(db.collection('launch2_purchases').doc(bound.email));
        const other = otherSnap.exists ? otherSnap.data() : null;
        if (other && other.orderId === bound.orderId && !other.refunded) bindUid = false;
      }
    }
    if (purchase && purchase.orderId === orderId) return { result: 'duplicate' };
    if (purchase && !purchase.refunded) {
      // A second paid order from the same e-mail: keep the first, note the second so it can be refunded.
      tx.set(purchaseRef, { extraOrders: { [orderId]: { paidAt } } }, { merge: true });
      return { result: 'extra-order' };
    }
    const claimed = counterSnap.exists ? Number(counterSnap.data().claimed) || 0 : 0;
    let overCap = false, seat = true;
    if (!seatSnap.exists && !erased.seat) {
      if (claimed >= LAUNCH2_CAP) { overCap = true; seat = false; }
      else {
        tx.set(seatRef, { orderId, at: paidAt });
        tx.set(counterRef, { claimed: claimed + 1 }, { merge: true });
      }
    }
    tx.set(purchaseRef, { email, orderId, paidAt, refunded: false, overCap, seat, ...(amount ? { amountUsdCents: amount.amount_usd_cents, currency: amount.currency, total: amount.total } : {}), ...(bindUid ? { uid: launch2Uid(uid) } : {}) }, { merge: true });
    if (bindUid) tx.set(uidRef, { email, orderId, at: paidAt });
    return { result: overCap ? 'over-cap' : 'recorded' };
  });
}
async function refundLaunch2Order(admin, { email, orderId, at }) {
  const { db } = admin;
  return db.runTransaction(async (tx) => {
    const ref = db.collection('launch2_purchases').doc(email);
    const erasedRef = db.collection(ERASED_COLLECTION).doc(emailMarker(email));
    const [snap, erasedSnap] = await Promise.all([tx.get(ref), tx.get(erasedRef)]);
    if (!snap.exists) {
      // The buyer deleted their account: the reduced purchase lives in the hashed marker.
      if (erasedSnap.exists && erasedSnap.data().purchase?.orderId === orderId) {
        tx.set(erasedRef, { purchase: { refunded: true, refundedAt: at } }, { merge: true });
        return { result: 'refunded' };
      }
      return { result: 'unknown-order' };
    }
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
  // 'free' (download ticket only): the free plugins (FREE_SLUGS). Only an order for that plugin, a $0 one included,
  // opens them; no seat, no counter claim. The other launch routes do not know 'free'.
  const launchId = req.body?.launchId === 'free' ? 'free' : validLaunchId(req.body?.launchId) || 'launch';
  // launch2: the verification rule lives in launch2Access (a uid-bound paid order needs none).
  // An e-mail/password account must have verified its address before anything is handed out (before any claim or entitlement logic).
  if (!decoded.email || (emailVerificationRequired(decoded) && decoded.email_verified !== true)) return res.status(403).json({ error: 'Verify your e-mail address first' });
  const launchService = launches[launchId];
  const launchSlugs = launchId === 'launch2' ? ['koro', 'yanki', 'hava', 'mihenk', 'tutkal'] : launchId === 'free' ? FREE_SLUGS : ['kubbe', 'kaset'];
  if (!launchSlugs.includes(slug) || !['mac', 'win'].includes(platform)) return res.status(400).json({ error: 'Invalid plugin or platform' });
  try {
    // Launch 2 is paid: the seat was claimed by the payment webhook, so here
    // we only check that this account holds a paid, non-refunded purchase — or
    // has been approved as a tester.
    if (launchId === 'launch2') {
      const standing = await launch2Access(admin, decoded);
      if (!launch2Open(standing)) {
        // Not a family buyer or tester: a paid single order for exactly this plugin still opens it.
        const singles = await withTimeout(ownedOrderSlugs(admin, decoded.email), 8000);
        if (!singles.includes(slug)) return res.status(launch2DeniedStatus(standing)).json(launch2Denied(standing));
      }
    }
    // A free plugin opens for the e-mail that placed a $0 order for it (Lemon Squeezy, no card). Nothing else opens it.
    if (launchId === 'free') {
      const owned = await withTimeout(ownedOrderSlugs(admin, decoded.email), 8000);
      if (!owned.includes(slug)) return res.status(402).json({ error: 'Get it free first: the checkout takes an e-mail address, no card.' });
    }
    const manifest = await withTimeout(downloadManifest(), 8000);
    const file = manifest?.[slug]?.files?.[platform];
    if (!file?.name) return res.status(404).json({ error: 'This download is not available yet' });
    const preview = isAdminPreview(decoded); // admin preview: no seat claim, no counters, no downloads doc
    if (launchId === 'launch' && !preview) {
      // While the free 1,000 last, the first download claims a seat. Once they
      // are gone the room is a shop: only a paid, non-refunded order for this
      // plugin (or the bundle) opens it — an earlier free download does not.
      const { claimed, total } = await withTimeout(launchService.readCounter(), 8000);
      if (claimed >= total) {
        const owned = await withTimeout(ownedLaunch1Slugs(admin, decoded.email), 8000);
        // The family bundle (paid, not refunded) also opens Kubbe and Kaset.
        if (!owned.includes(slug) && !(await withTimeout(launch2Access(admin, decoded), 8000) === 'paid')) return res.status(402).json({ error: 'The free 1,000 are gone. Buy this plugin to download it.' });
      } else {
        const claim = await withTimeout(launchService.claim({ uid: decoded.uid, email: decoded.email }), 15000);
        if (claim.status === 410) return res.status(410).json(claim.body);
        if (claim.status !== 200) return res.status(claim.status).json(claim.body);
      }
    }
    const now = new Date().toISOString();
    if (!preview) await admin.db.runTransaction(async (tx) => {
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
// still need the normal verification link. So does a 'custom' sign-in: the
// tool iframes sign in with a custom token from tool-auth-bridge whatever the
// account's provider, and the token's email_verified (copied from the user
// record) is the only proof of the address there. Without this an unverified
// account opened a tool and claimed credits parked under its e-mail.
function emailVerificationRequired(decoded) {
  const provider = decoded?.firebase?.sign_in_provider;
  return provider === 'password' || provider === 'email' || provider === 'custom' || !provider;
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
    const standing = await launch2Access(admin, decoded);
    if (standing === 'unverified') return res.status(403).json(launch2Denied(standing));
    return res.json({ paid: standing === 'paid', tester: standing === 'tester', standing });
  } catch (err) {
    return res.status(serviceDown(err) ? 503 : 401).json({ error: serviceDown(err) ? 'Service unavailable' : 'Your sign-in has expired — sign in again' });
  }
});

// Everything this signed-in account may download, and since when:
//   owned      slugs: single orders (and the old bundle) + the whole family when a family order is paid
//              + the tester plugins for a hand-picked tester
//   purchased  {slug: 'YYYY-MM-DD'} latest purchase date of a paid order covering it (testers have none)
//   updatesUntil {slug: 'YYYY-MM-DD'} purchase date + UPDATE_YEARS years (shown only; downloads are not gated by it yet)
async function launch2PurchaseFor(admin, decoded) {
  const id = launch2Uid(decoded.uid);
  if (id) {
    const bound = await admin.db.collection('launch2_uids').doc(id).get();
    if (bound.exists) {
      const p = await launch2Purchase(admin, bound.data().email);
      if (p && p.orderId === bound.data().orderId) return p;
    }
  }
  return launch2Purchase(admin, decoded.email);
}
async function accountEntitlements(admin, decoded) {
  const [bought, standing] = await Promise.all([purchasedByOrders(admin, decoded.email), launch2Access(admin, decoded)]);
  const purchased = { ...bought };
  const owned = new Set(Object.keys(bought));
  if (standing === 'paid') {
    const day = isAdminPreview(decoded) ? new Date().toISOString().slice(0, 10) : addYears((await launch2PurchaseFor(admin, decoded))?.paidAt, 0);
    for (const slug of ALL_SLUGS) {
      owned.add(slug);
      if (day && (!purchased[slug] || day > purchased[slug])) purchased[slug] = day;
      else if (!(slug in purchased)) purchased[slug] = null;
    }
  } else if (standing === 'tester') {
    TESTER_PLUGINS.forEach((slug) => owned.add(slug));
  }
  const updatesUntil = {};
  // Free plugins get every update; no end date is shown for them.
  for (const [slug, day] of Object.entries(purchased)) if (day && !FREE_SLUGS.includes(slug)) updatesUntil[slug] = addYears(day, UPDATE_YEARS);
  return { owned: PLUGIN_SLUGS.filter((s) => owned.has(s)), standing, purchased, updatesUntil };
}

// GET /api/purchases/status   Authorization: Bearer <Firebase ID token>
// → {full, owned:[slugs], standing, purchased, updatesUntil}. The page shows download
// buttons only for the plugins this account has paid for (or tests).
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
    const ent = await withTimeout(accountEntitlements(admin, decoded), 8000);
    // Credits bought without an account id are parked under the checkout e-mail; this account owns that e-mail (verified above).
    await withTimeout(credits.claimPending({ uid: decoded.uid, email: decoded.email }), 8000).catch((err) => console.error('credits claim:', err.message));
    return res.json({ full: claimed >= total, owned: ent.owned, standing: ent.standing, purchased: ent.purchased, updatesUntil: ent.updatesUntil });
  } catch (err) {
    return res.status(serviceDown(err) ? 503 : 401).json({ error: serviceDown(err) ? 'Service unavailable' : 'Your sign-in has expired — sign in again' });
  }
});

// GET /api/purchases/licenses   Authorization: Bearer <Firebase ID token>
// → {licenses:[{id, product, productName, key, keyShort, status, activationLimit, instancesCount, orderId, created, purchased, updatesUntil}]}
// The signed-in caller's own licence keys from plugin_licenses/{their e-mail}.licenses
// (written by the Lemon Squeezy webhook: license_key_created / license_key_updated). When the family order was
// paid under another checkout e-mail but bound to this account's uid (launch2_uids), that e-mail's record is read too.
// Keys are returned to that caller only and are never logged. purchased / updatesUntil are 'YYYY-MM-DD' (order date, +2 years).
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
    // Admin preview: one family entry shaped like a real family key, plainly fake, never stored.
    const previewLicence = isAdminPreview(decoded) ? [{
      id: 'admin-preview', product: 'family', productName: 'SubverseLab plugin family', purchased: purchaseDay(new Date().toISOString()),
      updatesUntil: addYears(new Date().toISOString(), UPDATE_YEARS), key: ADMIN_PREVIEW_KEY, keyShort: null, status: 'active',
      activationLimit: 5, instancesCount: 0, orderId: null, created: null, preview: true,
    }] : [];
    const docs = [(await withTimeout(admin.db.collection('plugin_licenses').doc(mail).get(), 8000)).data() || {}];
    const bound = launch2Uid(decoded.uid) ? await withTimeout(admin.db.collection('launch2_uids').doc(launch2Uid(decoded.uid)).get(), 8000) : null;
    const boundMail = bound?.exists ? launch2Email(bound.data().email) : null;
    if (boundMail && boundMail !== mail) {
      const other = await withTimeout(admin.db.collection('plugin_licenses').doc(boundMail).get(), 8000);
      const od = other.exists ? other.data() : {};
      // Only the keys of the order that this uid is bound to.
      docs.push({ orders: od.orders || {}, licenses: Object.fromEntries(Object.entries(od.licenses || {}).filter(([, l]) => String(l?.order_id) === String(bound.data().orderId))) });
    }
    const orders = Object.assign({}, ...docs.map((d) => d.orders || {}));
    const licenses = docs.flatMap((d) => Object.values(d.licenses || {}))
      .filter((l) => l && l.key && !l.disabled)
      .map((l) => ({
        id: String(l.license_id || ''),
        product: l.product || orders[l.order_id]?.product || null,
        productName: orders[l.order_id]?.product_name || null,
        purchased: purchaseDay(orders[l.order_id]?.created || l.created),
        updatesUntil: addYears(orders[l.order_id]?.created || l.created, UPDATE_YEARS),
        key: l.key,
        keyShort: l.key_short || null,
        status: l.status || null,
        activationLimit: l.activation_limit ?? null,
        instancesCount: l.instances_count ?? 0,
        orderId: l.order_id || null,
        created: l.created || null,
      }))
      .sort((x, y) => String(y.created || '').localeCompare(String(x.created || '')));
    return res.json({ licenses: [...previewLicence, ...licenses] });
  } catch (err) {
    return res.status(serviceDown(err) ? 503 : 401).json({ error: serviceDown(err) ? 'Service unavailable' : 'Your sign-in has expired — sign in again' });
  }
});

const purchaseDay = (iso) => (Number.isNaN(Date.parse(iso || '')) ? null : addYears(iso, 0));

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
  // Verified e-mail first (Google sign-in is verified by the provider), before any claim or entitlement logic.
  if (!decoded.email || (emailVerificationRequired(decoded) && decoded.email_verified !== true)) {
    return res.status(403).json({ error: 'Verify your e-mail address first' });
  }

  // Launch 2 seats are sold, not given (testers are let in, not counted): nothing is minted here.
  if (launchId === 'launch2') {
    try {
      const standing = await launch2Access(admin, decoded);
      if (!launch2Open(standing)) return res.status(launch2DeniedStatus(standing)).json(launch2Denied(standing));
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
      for (const slug of PLUGIN_SLUGS) for (const platform of ['mac', 'win']) m.downloads += Number(v?.[slug]?.[platform]?.count) || 0;
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
// TUTKAL joined the testers' list on 2026-10-05 (owner decision).
const TESTER_PLUGINS = ['koro', 'yanki', 'hava', 'mihenk', 'tutkal'];
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

// POST /api/admin/reports/purge   Authorization: admin ID token
// Problem reports are kept 12 months after they are marked resolved, then
// deleted (privacy text, "How long we keep it"). There is no scheduler in this
// service, so the admin panel calls this each time it opens: it deletes the
// expired ones and starts the clock on resolved reports that have no
// resolvedAt yet. → {deleted, stamped}
app.post('/api/admin/reports/purge', smallBody, async (req, res) => {
  const caller = await testerCaller(req, res, { adminOnly: true });
  if (!caller) return;
  try {
    const out = await withTimeout(purgeResolvedReports(caller.admin.db), 30000);
    if (out.deleted) console.log(`reports purge: deleted ${out.deleted} resolved report(s) older than 12 months`);
    return res.json(out);
  } catch (err) {
    console.error('reports purge:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Report service unavailable' });
  }
});

// POST /api/account/delete   Authorization: Bearer <Firebase ID token>   body {confirm: "DELETE"}
// Self-service account deletion (accountDeletion.js has the rules: what is
// deleted, and the hashed markers that stay). Refused for the admin accounts,
// and for a sign-in older than ten minutes, with code "requires-recent-login"
// so the page asks the person to sign in again. Idempotent. The log line has
// no e-mail address.
const accountDeleter = createAccountDeleter({ getAdmin: adminFirestore });
const deleteLimit = tokenBucket({ perMinute: 5 });
const RECENT_LOGIN_SECONDS = 600;
app.post('/api/account/delete', smallBody, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!deleteLimit(req.ip)) return res.status(429).json({ error: 'Too many requests — try again in a minute' });
  const token = (req.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'Sign in first' });
  let admin, decoded;
  try { admin = await adminFirestore(); decoded = await admin.auth.verifyIdToken(token); } catch (err) {
    return res.status(serviceDown(err) ? 503 : 401).json({ error: serviceDown(err) ? 'Account service unavailable' : 'Your sign-in has expired — sign in again' });
  }
  const mail = String(decoded.email || '').trim().toLowerCase();
  if (ADMIN_EMAILS.includes(mail)) return res.status(403).json({ error: 'Admin accounts cannot be deleted here' });
  if (req.body?.confirm !== 'DELETE') return res.status(400).json({ error: 'Type DELETE to confirm' });
  const authTime = Number(decoded.auth_time);
  if (!authTime || Date.now() / 1000 - authTime > RECENT_LOGIN_SECONDS) {
    return res.status(401).json({ error: 'Sign in again to delete your account', code: 'requires-recent-login' });
  }
  const emailOwned = Boolean(mail) && (!emailVerificationRequired(decoded) || decoded.email_verified === true);
  try {
    const counts = await withTimeout(accountDeleter.deleteAccount({ uid: decoded.uid, email: mail, emailOwned }), 90000);
    console.log(`account delete: uid ${String(decoded.uid).slice(0, 6)}… done ${JSON.stringify(counts)}`);
    return res.json({ ok: true });
  } catch (err) {
    console.error('account delete:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'The account could not be deleted right now — try again, or write to info@subverselab.com' });
  }
});

// Tool credits (credits.js, CREDITS.md). Costs are fixed here, never taken from a request.
// GET /api/credits/balance   Authorization: Bearer <Firebase ID token>
// → {balance, costs, recent:[{delta, reason, tool, at}]}. A verified (or Google) e-mail also claims credits that
// were bought without an account id.
// Limited per account, not per IP: the tool services call this for their users from shared egress addresses.
const creditsBalanceLimit = tokenBucket({ perMinute: 30 });
app.get('/api/credits/balance', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const token = (req.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'Sign in first' });
  let decoded;
  try { decoded = await (await adminFirestore()).auth.verifyIdToken(token); } catch (err) {
    return res.status(serviceDown(err) ? 503 : 401).json({ error: serviceDown(err) ? 'Service unavailable' : 'Your sign-in has expired — sign in again' });
  }
  if (!creditsBalanceLimit(`uid:${decoded.uid}`)) return res.status(429).json({ error: 'Too many requests' });
  try {
    if (decoded.email && (!emailVerificationRequired(decoded) || decoded.email_verified === true)) {
      await withTimeout(credits.claimPending({ uid: decoded.uid, email: decoded.email }), 8000);
    }
    const { balance, recent } = await withTimeout(credits.readBalance(decoded.uid), 8000);
    return res.json({ balance, costs: CREDIT_COSTS, recent });
  } catch (err) {
    console.error('credits balance:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Service unavailable' });
  }
});

// Server-to-server, called by the tool services (Cloud Run) with a Google OIDC identity token.
// POST /api/credits/spend    {tool, jobId, userIdToken}  → 200 {ok:true, balance, cost} | 402 {ok:false, reason:'insufficient', balance, cost}
// POST /api/credits/release  {tool, jobId}               → 200 {ok:true, released, balance}  (refunds that job's spend once)
const creditsBody = [express.json({ limit: '8kb' })];
async function creditsCaller(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const caller = await credits.authenticateCaller(req.get('Authorization'));
  if (!caller.ok) { res.status(caller.status).json({ ok: false, error: caller.error }); return null; }
  return caller;
}
app.post('/api/credits/spend', creditsBody, async (req, res) => {
  if (!(await creditsCaller(req, res))) return;
  const { tool, jobId, userIdToken } = req.body || {};
  if (typeof tool !== 'string' || !Object.hasOwn(CREDIT_COSTS, tool) || typeof jobId !== 'string' || !/^[A-Za-z0-9_.:-]{1,128}$/.test(jobId)) {
    return res.status(400).json({ ok: false, error: 'tool and jobId are required' });
  }
  if (typeof userIdToken !== 'string' || !userIdToken) return res.status(401).json({ ok: false, reason: 'no-user', error: 'userIdToken is required' });
  let decoded;
  try { decoded = await (await adminFirestore()).auth.verifyIdToken(userIdToken); } catch (err) {
    return res.status(serviceDown(err) ? 503 : 401).json({ ok: false, reason: serviceDown(err) ? 'unavailable' : 'bad-user-token', error: 'User token not accepted' });
  }
  try {
    const { status, ...body } = await withTimeout(credits.spend({ uid: decoded.uid, tool, jobId }), 10000);
    return res.status(status).json(body);
  } catch (err) {
    console.error('credits spend:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ ok: false, error: 'Credits unavailable' });
  }
});
app.post('/api/credits/release', creditsBody, async (req, res) => {
  if (!(await creditsCaller(req, res))) return;
  const { tool, jobId } = req.body || {};
  try {
    const { status, ...body } = await withTimeout(credits.release({ tool, jobId }), 10000);
    return res.status(status).json(body);
  } catch (err) {
    console.error('credits release:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ ok: false, error: 'Credits unavailable' });
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
  if (isFamilyOrder({ product_id: productId })) return 'family';
  // Fallback by product name. The family is checked first: its name may list the plugins.
  const n = String(productName || '').toLowerCase();
  if (/\bfamily\b/.test(n)) return 'family';
  if (n.includes('bundle') || (n.includes('kubbe') && n.includes('kaset'))) return 'bundle';
  return PLUGIN_SLUGS.find((slug) => new RegExp(`\\b${slug}\\b`).test(n)) || null;
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

  // Launch 2 (plugin family bundle, seven products): order_created (paid) records the purchase and
  // claims a seat; order_refunded flags it. Handled here and nowhere else.
  // The order is then ALSO written to plugin_licenses.orders below (product 'family': purchase date,
  // receipt, and the name shown next to the licence key); that record never grants access by itself.
  let launch2Result = null;
  if ((event === 'order_created' || event === 'order_refunded') && isFamilyOrder(a.first_order_item)) {
    const orderId = String(data.id);
    try {
      const admin = await adminFirestore();
      const mail = launch2Email(email);
      if (!mail) return res.json({ ok: true, ignored: 'no usable e-mail' });
      if (event === 'order_refunded') {
        const out = await refundLaunch2Order(admin, { email: mail, orderId, at: new Date().toISOString() });
        console.warn(`launch2 refund: order ${orderId} ${out.result}; seat not released — owner decides`);
        launch2Result = out.result;
      } else {
        if (a.status !== 'paid') return res.json({ ok: true, ignored: `status ${a.status || 'unknown'}` });
        const out = await recordLaunch2Order(admin, { email: mail, uid: payload?.meta?.custom_data?.uid, orderId, paidAt: a.created_at || new Date().toISOString(), amount: orderAmount(a) });
        if (out.result === 'over-cap') console.warn(`launch2 OVER CAP: order ${orderId} paid but all ${LAUNCH2_CAP} seats are taken — refund it`);
        if (out.result === 'extra-order') console.warn(`launch2 extra order ${orderId} from an e-mail that already paid — refund it`);
        launch2Result = out.result;
      }
    } catch (err) {
      console.error('launch2 webhook:', err.message);
      return res.status(500).json({ error: 'write failed' });
    }
  }

  try {
    const { db, FieldValue } = await adminFirestore();
    // A refund of an order whose buyer deleted their account updates the
    // reduced, hashed record instead of re-creating a plain-text document.
    if (event === 'order_refunded') {
      const erasedRef = db.collection(ERASED_COLLECTION).doc(emailMarker(email));
      const erasedSnap = await erasedRef.get();
      if (erasedSnap.exists && erasedSnap.data().orders?.[String(data.id)]) {
        await erasedRef.set({ orders: { [String(data.id)]: { status: a.status || null, refunded: Boolean(a.refunded) } } }, { merge: true });
        return res.json({ ok: true, erased: true, ...(launch2Result ? { launch2: launch2Result } : {}) });
      }
    }
    const ref = db.collection('plugin_licenses').doc(email);
    const update = { email, updated: FieldValue.serverTimestamp() };
    // The account that clicked Buy (checkout[custom][uid] comes back as meta.custom_data.uid); kept next to the order and the
    // key so a purchase is traceable to the account it was bound to. Never used to grant access by itself.
    const boundUid = launch2Uid(payload?.meta?.custom_data?.uid);
    const amount = orderAmount(a);

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
          product: isFamilyOrder(item) ? 'family' : productSlugFor(item.product_id, item.product_name),
          ...(boundUid ? { uid: boundUid } : {}),
          amount_usd_cents: amount.amount_usd_cents,
          currency: amount.currency,
          total: amount.total,
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
          ...(boundUid ? { uid: boundUid } : {}),
          expires_at: a.expires_at || null,
          created: a.created_at || null,
        },
      };
    }
    // merge: true merges nested maps, so each order and key is its own entry.
    await ref.set(update, { merge: true });
    // Tool credits: 100 per paid dollar (credits.js). Idempotent per order, so a Lemon Squeezy retry after a failure is safe.
    let creditsResult = null;
    if (event === 'order_created' && a.status === 'paid') {
      if (amount.credits > 0) {
        creditsResult = (await credits.grantOrder({ email, uid: boundUid, orderId: data.id, credits: amount.credits })).result;
      } else if (Number(a.total_usd) === 0 || Number(a.total) === 0) {
        creditsResult = 'free-order';   // a $0 order (a free plugin): nothing to grant, nothing to warn about
      } else {
        creditsResult = 'no-amount';
        console.warn(`credits: order ${data.id} has no usable USD amount (total_usd=${a.total_usd ?? 'missing'}, total=${a.total ?? 'missing'}, currency=${a.currency ?? 'missing'}); no credits granted`);
      }
    } else if (event === 'order_refunded') {
      const full = a.status !== 'partial_refund' || a.refunded === true;
      const out = await credits.refundOrder({ email, orderId: data.id, full, refundedUsdCents: Number(a.refunded_amount_usd), totalUsdCents: Number(a.total_usd) });
      creditsResult = out.result;
      if (out.shortfall) console.warn(`credits refund: order ${data.id} short by ${out.shortfall} credits (already spent); refund not blocked`);
      if (out.result === 'partial-unknown') console.warn(`credits refund: order ${data.id} partial refund without refunded_amount_usd/total_usd; credits unchanged`);
    }
    res.json({ ok: true, ...(launch2Result ? { launch2: launch2Result } : {}), ...(creditsResult ? { credits: creditsResult } : {}) });
  } catch (err) {
    // A 5xx makes Lemon Squeezy retry (up to three more times).
    console.error('lemonsqueezy webhook:', err.message);
    res.status(500).json({ error: 'write failed' });
  }
});

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
const CLIENT_ONLY_ROUTES = new Set(['/account', '/admin', '/forum']);
function isKnownClientRoute(path) {
  return CLIENT_ONLY_ROUTES.has(path) || path.startsWith('/forum/');
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
    res.sendFile(candidate);
    return;
  }

  // A real client-rendered route with no prerendered file still answers 200;
  // the SPA paints it.
  if (isKnownClientRoute(req.path)) {
    res.sendFile(join(DIST_DIR, 'index.html'));
    return;
  }

  // Anything else is an unknown URL. The SPA shell is still sent so the
  // in-app 404 page renders for a visitor, but under a real 404 status so
  // crawlers — and the access logs — see it for what it is.
  res.status(404).sendFile(join(DIST_DIR, 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log(`subverselab-v2 serving dist/ on port ${PORT} (${SCRIPT_HASHES.length} inline script hash(es) in CSP)`)
);
