// subverselab-api: every /api/* route of subverselab.com — downloads, licences, the Lemon Squeezy webhook, credits,
// testers, admin, inbox, stats, account delete. The pages are a separate service (../server.js serves dist/);
// The split was cut over on 25 Oct 2026 (runbook kept in _legacy/docs/SPLIT_CUTOVER_2026-10.md). The same routes also answer on
// subverselab.com through the site's optional /api proxy (API_PROXY_ORIGIN), so nothing here assumes its host.
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { isIP } from 'net';
import { createLaunchService, tokenBucket } from './launchLicence.js';
import { holdsLaunch1Claim, holdsLaunch1UidClaim, addressExists, addressProblem, LAUNCH1_SLUGS, ownedOrderSlugs, purchasedByOrders, purchasedByUidOrders, ownedUidOrderSlugs, uidHadOrderFor, uidOrderEntry, ownedFromOrders, ORDERS_BY_UID, readUidOrders, addYears, ALL_SLUGS, FREE_SLUGS, SOLO_SLUGS, PLUGIN_SLUGS, PACK_SLUGS, MEMBER_PACK_SLUGS, SWEEP_SLUGS, UPDATE_YEARS, ADMIN_EMAILS, ADMIN_PREVIEW_KEY, isAdminPreview, ownedVia, AppleJwsError, verifyAppleJws, transactionProblem, linkApplePurchase, handleAppleNotification, APPLE_APPS, redeemCode, redeemedFamilyAt, loadRedeemCodes } from './entitlements.js';
import { createAccountDeleter, purgeResolvedReports, emailMarker, ERASED_COLLECTION } from './accountDeletion.js';
import { addMessage, listMessages, markRead, welcomeMessage, orderMessage } from './inbox.js';
import { createCreditsService, orderAmount, CREDIT_COSTS, verifyGoogleOidc } from './credits.js';
import { createHitCounter, computeStats, joinMembers, countDownloads } from './stats.js';
import { createCatalogService, MEDIA_KINDS, FILE_PLATFORMS } from './catalog.js';
import { KINDS as CATALOG_KINDS, KIND_LABELS as CATALOG_KIND_LABELS, FIELDS as CATALOG_FIELDS, PRODUCT_KINDS as CATALOG_PRODUCT_KINDS } from './catalogSchema.js';
import { createAgentStore, isAgentKey } from './agents.js';
import { createTrialService, loadSigningKey, NotConfigured, TRIAL_PRODUCTS } from './trialGrant.js';
import { createPartnerService } from './partners.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

// Express advertises itself in a response header by default. It tells an
// attacker which stack to target and does nothing for anyone else.
app.disable('x-powered-by');

/* ---- CORS ------------------------------------------------------------------
   The site calls this service from another origin (subverselab.com → api.subverselab.com) with the Firebase ID token in
   the Authorization header; no cookie is ever read, so no credentials mode. Allowed: the two site hosts and the local
   dev/preview ports, plus CORS_ORIGINS ("https://a,https://b") for a tagged revision during the cut-over.
   A request that carries an Origin which is not on the list is refused with 403 before any route runs. Requests with no
   Origin (the Lemon Squeezy webhook, the tool services' server-to-server credit calls, tester agents, a download link
   opened by navigation) are not browser cross-origin calls and pass unchanged. */
const DEV_PORTS = [5173, 5174, 5181, 4173, 8080, 8081];
export const CORS_ORIGINS = new Set([
  'https://subverselab.com',
  'https://www.subverselab.com',
  ...DEV_PORTS.flatMap((port) => [`http://localhost:${port}`, `http://127.0.0.1:${port}`]),
  ...String(process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean),
]);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.setHeader('Vary', 'Origin');
  if (origin !== undefined) {
    if (!CORS_ORIGINS.has(origin)) return res.status(403).type('text/plain').send('Origin not allowed');
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Max-Age', '600');
      return res.status(204).end();
    }
  }
  next();
});

/* ---- Calls forwarded by the site --------------------------------------------
   subverselab.com keeps answering /api/* by forwarding it here (../server.js, API_PROXY_ORIGIN): the plug-ins carry
   https://subverselab.com/api/license/ in their binaries (plugin-common Licensing/License.h), and old pages, the tool
   services and the Lemon Squeezy webhook use that address until the cut-over. Forwarded, every caller would arrive from the
   site's address and the per-address limits (licence 30 a minute) would trip for all of them at once. So the site sends
   the caller's address in X-SVL-Client-IP together with its own Google identity token in X-SVL-Proxy-Token (from the
   metadata server; nothing stored). The address is believed only when that token is Google-signed for SITE_PROXY_AUDIENCE
   and its e-mail is on SITE_PROXY_CALLERS; otherwise req.ip stays the connection's own, as before. */
const SITE_PROXY_CALLERS = new Set(String(process.env.SITE_PROXY_CALLERS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
const SITE_PROXY_AUDIENCE = process.env.SITE_PROXY_AUDIENCE || 'https://api.subverselab.com';
const verifySiteProxy = verifyGoogleOidc;
const siteProxyTokens = new Map(); // sha256(token) → expiry (ms): one signature check per token, not per request
async function trustedSiteProxy(token) {
  if (!SITE_PROXY_CALLERS.size) return false;
  const key = createHash('sha256').update(token).digest('base64url');
  const until = siteProxyTokens.get(key);
  if (until && until > Date.now()) return true;
  const payload = await verifySiteProxy(token, SITE_PROXY_AUDIENCE);
  const email = String(payload?.email || '').toLowerCase();
  if (!payload?.email_verified || !SITE_PROXY_CALLERS.has(email)) return false;
  if (siteProxyTokens.size > 100) siteProxyTokens.clear();
  siteProxyTokens.set(key, Math.min(Number(payload.exp || 0) * 1000, Date.now() + 3_600_000));
  return true;
}
app.use(async (req, res, next) => {
  const token = req.get('X-SVL-Proxy-Token');
  const clientIp = req.get('X-SVL-Client-IP');
  if (token && clientIp && isIP(clientIp)) {
    try {
      if (await trustedSiteProxy(token)) Object.defineProperty(req, 'ip', { value: clientIp, configurable: true });
    } catch { /* a token that does not verify is simply not believed */ }
  }
  next();
});

app.use((req, res, next) => {
  // Cloud Run terminates TLS, so the real scheme arrives in the header. HSTS
  // is only meaningful — and only safe — on a connection that is already
  // secure, which is why it is not sent during local development.
  if (req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // JSON and file streams only: nothing here is a page, so nothing may run, frame it or be indexed.
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
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
                        exactly the plugin named here. Slugs: kubbe, kaset, koro, yanki, hava, mihenk, tutkal (singles), elek and ru8 (sold on their own, outside the family), taban, alev and kiyma (free, $0 products),
                        brickyard, kerbstone, stepwell, lampglass, slagworks, squall, ru8-drum-pack (paid packs; the free rack packs have no Lemon Squeezy product), sweep (launch "Sweep the store": every sample pack listed when it was bought, entitlements.js SWEEPS), preset-sweep (optional, preset packs),
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
// Affiliate partners (api/partners.js): the sales ledger the webhook writes and the partner's own report.
const partnerService = createPartnerService({ getAdmin: adminFirestore });
const validLaunchId = (value) => value === 'launch2' ? 'launch2' : value === 'launch' ? 'launch' : null;
const smallBody = [express.urlencoded({ extended: false, limit: '4kb' }), express.json({ limit: '4kb' })];

let storagePromise = null;
function downloadStorage() {
  if (!storagePromise) storagePromise = import('@google-cloud/storage').then(({ Storage }) => new Storage());
  return storagePromise;
}
// The live catalogue (api/catalog.js): products and news added from /admin. Loaded (and cached a minute) before any route
// that decides by product slug, so a pack or plug-in created an hour ago is already a known slug here: the manifest lists
// it, a paid order opens it, the download ticket accepts it. load() never throws (an outage answers the last good copy).
const catalog = createCatalogService({ getAdmin: adminFirestore, getStorage: downloadStorage });
const CATALOG_ROUTES = /^\/api\/(download|purchases|orders|lemonsqueezy|catalog|ru8|launch|admin\/catalog)(\/|$)/;
app.use(async (req, res, next) => {
  if (CATALOG_ROUTES.test(req.path)) await catalog.load();
  next();
});
// Local admin work without Google sign-in (owner 2026-10-28 / 31: the dev preview signs in as the owner with the token
// 'dev-preview'). Only when SVL_DEV_ADMIN=1 is set by hand on a developer machine, never on Cloud Run (K_SERVICE is set
// there), and only for the catalogue routes below. Logged at start so it can never be on unnoticed.
const DEV_ADMIN = process.env.SVL_DEV_ADMIN === '1' && !process.env.K_SERVICE;
if (DEV_ADMIN) console.warn('SVL_DEV_ADMIN=1: the catalogue admin routes accept the local preview token (development only)');
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
    for (const slug of [...PLUGIN_SLUGS, ...PACK_SLUGS, ...MEMBER_PACK_SLUGS]) {
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
//  2. otherwise the e-mail-matched purchase / tester entry counts, but ONLY for a proven e-mail (Google sign-in or
//     email_verified): nobody can prove a password address any more, so for the rest an order must be bound to the
//     uid (or claimed with its order number). `proven` is passed explicitly only to ask "would the e-mail alone open it?".
async function launch2Access(admin, decoded, proven = emailProven(decoded)) {
  if (isAdminPreview(decoded)) return 'paid'; // admin preview: behaves like a family buyer, nothing is stored
  const uidStanding = await launch2UidStanding(admin, decoded.uid);
  if (uidStanding === 'paid') return uidStanding;
  // A family code redeemed on /redeem (redeem.js) is bound to the uid like a paid family order: same answer, no seat counted.
  if (launch2Uid(decoded.uid) && await redeemedFamilyAt(admin.db, decoded.uid)) return 'paid';
  const standing = proven ? launch2Standing(await launch2Purchase(admin, decoded.email)) : 'none';
  if (standing === 'paid') return standing;
  // The tester record does not need a proven e-mail: it is bound to the uid that applied (testerOwn).
  const own = await testerOwn(admin, decoded);
  if (own && testerStatus(own) === 'active') return 'tester';
  // A refunded / oversold order bound to this uid (checkout e-mail differs) is reported as such, not as 'none'.
  return !proven || standing === 'none' ? uidStanding : standing;
}
const launch2Open = (standing) => standing === 'paid' || standing === 'tester';
const launch2Denied = (standing) => standing === 'oversold'
  ? { error: 'The 1,000 seats were already taken when your payment arrived — your order will be refunded' }
  : { error: 'Purchase required' };
const launch2DeniedStatus = () => 402;

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
  // 'solo' (download ticket only): products sold on their own outside the family (SOLO_SLUGS, ELEK). Only a paid, non-refunded
  // order for that exact product opens it; the family and the admin preview do not (a tester does, TESTER_RELEASED_SLUGS).
  // 'pack' (download ticket only): sample packs and preset packs (PACK_SLUGS), one zip each (platform 'zip'). Only a paid,
  // non-refunded order for that pack or the launch sweep (SWEEP_SLUGS) opens it; no tester, family, admin-preview or free path.
  // 'member' (download ticket only): the free rack packs (MEMBER_PACK_SLUGS, platform 'zip'). Any signed-in account whose e-mail
  // passes requireDeliverable opens them; no order (owner 17 Oct: "üye ol indir"). Downloads are counted like every other.
  // 'trial' (download ticket only, owner 7 Nov 2026): the installer of a product with a 30-day trial (trialGrant.js TRIAL_PRODUCTS,
  // AHENK) for any signed-in account whose e-mail passes requireDeliverable; no order (the Pianoteq / Arturia / NI model: the
  // installer is free, the plug-in itself decides trial / owned / free mode through its server-signed grants). Products without a
  // trial (JING FANG, ELEK, ...) are not in TRIAL_PRODUCTS and stay owned-only. Counted in trial/counter + downloads/{uid}.
  const launchId = req.body?.launchId === 'free' ? 'free' : req.body?.launchId === 'solo' ? 'solo' : req.body?.launchId === 'pack' ? 'pack' : req.body?.launchId === 'member' ? 'member' : req.body?.launchId === 'trial' ? 'trial' : validLaunchId(req.body?.launchId) || 'launch';
  // No e-mail verification (owner 9 Oct): the only e-mail rule is addressExists (not bounced, domain has a mail server).
  try { if (!(await requireDeliverable(admin, decoded, res))) return; } catch (err) { return res.status(503).json({ error: 'Download service unavailable' }); }
  // A test build assigned to this tester (tester_builds): its own kind, its own gate (testBuildTicket in the testers block).
  if (req.body?.kind === 'test-build') return testBuildTicket(admin, decoded, req.body, res);
  const launchService = launches[launchId];
  const launchSlugs = launchId === 'launch2' ? LAUNCH2_SLUGS : launchId === 'free' ? FREE_SLUGS : launchId === 'solo' ? SOLO_SLUGS : launchId === 'pack' ? PACK_SLUGS : launchId === 'member' ? MEMBER_PACK_SLUGS : launchId === 'trial' ? TRIAL_PRODUCTS : ['kubbe', 'kaset'];
  const platforms = launchId === 'pack' || launchId === 'member' ? ['zip'] : ['mac', 'win'];
  if (!launchSlugs.includes(slug) || !platforms.includes(platform)) return res.status(400).json({ error: 'Invalid plugin or platform' });
  try {
    // Tester agreement 4.2 / 9.1: an active tester opens every released product, an ended one only what it owns (the
    // owned map), a revoked one nothing. The tester record decides, whatever the product's own gate would say.
    const testerOpens = TESTER_RELEASED_SLUGS.includes(slug) && (await withTimeout(testerSlugsFor(admin, decoded), 8000)).includes(slug);
    // Launch 2 is paid: the seat was claimed by the payment webhook, so here
    // we only check that this account holds a paid, non-refunded purchase — or
    // has been approved as a tester.
    if (launchId === 'launch2' && !testerOpens) {
      const standing = await launch2Access(admin, decoded);
      if (!launch2Open(standing)) {
        // Not a family buyer or tester: a paid single order for exactly this plugin still opens it.
        const singles = await withTimeout(ownedSlugsFor(admin, decoded), 8000);
        if (!singles.includes(slug)) {
          if (await withTimeout(emailOnlyOpens(admin, decoded, slug, launchId), 8000)) return res.status(403).json({ error: CLAIM_HINT });
          return res.status(launch2DeniedStatus(standing)).json(launch2Denied(standing));
        }
      }
    }
    // A free plugin opens for the e-mail that placed a $0 order for it (Lemon Squeezy, no card). Nothing else opens it.
    if (launchId === 'free' && !testerOpens) {
      const owned = await withTimeout(ownedSlugsFor(admin, decoded), 8000);
      if (!owned.includes(slug) && !(slug in await withTimeout(freeByEmail(admin, decoded), 8000))) return res.status(402).json({ error: 'Get it free first: the checkout takes an e-mail address, no card.' });
    }
    if (launchId === 'pack') {
      // Packs: an order only. testerOpens is never true here (packs are not in TESTER_RELEASED_SLUGS).
      const owned = await withTimeout(ownedSlugsFor(admin, decoded), 8000);
      if (!owned.includes(slug)) {
        if (await withTimeout(emailOnlyOpens(admin, decoded, slug, launchId), 8000)) return res.status(403).json({ error: CLAIM_HINT });
        return res.status(402).json({ error: 'Buy this pack to download it.' });
      }
    }
    if (launchId === 'solo' && !testerOpens) {
      const owned = await withTimeout(ownedSlugsFor(admin, decoded), 8000);
      if (!owned.includes(slug)) {
        if (await withTimeout(emailOnlyOpens(admin, decoded, slug, launchId), 8000)) return res.status(403).json({ error: CLAIM_HINT });
        return res.status(402).json({ error: 'Buy this app to download it.' });
      }
    }
    const manifest = await withTimeout(downloadManifest(), 8000);
    const file = manifest?.[slug]?.files?.[platform];
    if (!file?.name) return res.status(404).json({ error: 'This download is not available yet' });
    const preview = isAdminPreview(decoded); // admin preview: no seat claim, no counters, no downloads doc
    if (launchId === 'launch' && !preview && !testerOpens) {
      // While the free 1,000 last, the first download claims a seat. Once they
      // are gone the room is a shop: only a paid, non-refunded order for this
      // plugin (or the bundle) opens it — an earlier free download does not.
      const { claimed, total } = await withTimeout(launchService.readCounter(), 8000);
      // A free seat is minted only for a proven e-mail (an e-mail claim record could otherwise be taken for someone else's
      // address); a non-proven account keeps what its uid already holds, like a gone-1,000 shop.
      if (claimed >= total || !emailProven(decoded)) {
        const owned = (await withTimeout(ownedSlugsFor(admin, decoded), 8000)).filter((s) => LAUNCH1_SLUGS.includes(s));
        // The family bundle (paid, not refunded) also opens Kubbe and Kaset, and so does a claim among the first 1,000.
        if (!owned.includes(slug) && !(await withTimeout(launch1ClaimFor(admin, decoded), 8000))
          && !(await withTimeout(launch2Access(admin, decoded), 8000) === 'paid')) {
          if (await withTimeout(emailOnlyOpens(admin, decoded, slug, launchId), 8000)) return res.status(403).json({ error: CLAIM_HINT });
          return res.status(402).json({ error: claimed >= total ? 'The free 1,000 are gone. Buy this plugin to download it.' : 'Sign in with Google to take a free launch seat, or buy this plugin.' });
        }
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
const LENGTH_HEADER_MAX = 30 * 1024 * 1024;   // under Cloud Run's 32 MiB HTTP/1 limit for a response with a length
app.get('/api/download/file', async (req, res) => {
  const data = ticketRead(req.query.t);
  if (!data) return res.status(403).type('text/plain').send('Invalid or expired download ticket');
  try {
    const storage = await downloadStorage();
    const file = storage.bucket('subverselab-downloads').file(data.object);
    const [meta] = await file.getMetadata();
    res.setHeader('Content-Type', 'application/octet-stream');
    // meta.name is the object path (plugins/elek/1.0.1/Elek-1.0.1-macOS.pkg); browsers turned the slashes into
    // "plugins_elek_1.0.1_..." file names. Only the file's own name goes to the browser.
    res.setHeader('Content-Disposition', `attachment; filename="${String(meta.name || data.object).split('/').pop().replace(/"/g, '')}"`);
    // Cloud Run refuses an HTTP/1 response over 32 MiB that declares its length ("Response size was too large", a 500
    // after ~2 s: every ELEK download, 443-680 MB, 14 Oct). Without Content-Length the body goes out chunked, which has
    // no size limit; the service timeout (3600 s) bounds the transfer instead. Small installers keep their length so
    // the browser shows progress.
    if (meta.size && Number(meta.size) <= LENGTH_HEADER_MAX) res.setHeader('Content-Length', meta.size);
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

// The one e-mail rule (owner 9 Oct, replaces e-mail verification): the address must be able to receive mail
// (not in bounced_emails, domain has an MX record). Answers 403 and returns false when it cannot.
const NO_MAIL_ERROR = 'This e-mail address cannot receive mail. Sign in with a working address.';
async function requireDeliverable(admin, decoded, res) {
  if (decoded.email && await addressExists(admin, decoded.email)) return true;
  res.status(403).json({ error: NO_MAIL_ERROR });
  return false;
}

// GET /api/email/check?email=  → 200 {ok:true} | 200 {ok:false, reason, error}. The sign-up form asks before it creates the
// account, so a mistyped or non-existent address is refused with the reason shown inline. Same rule as requireDeliverable.
// Public and rate-limited per IP. A failed lookup is a 503 and the form lets the sign-up go on.
const emailCheckLimit = tokenBucket({ perMinute: 20 });
const EMAIL_PROBLEMS = {
  syntax: 'This does not look like an e-mail address.',
  bounced: NO_MAIL_ERROR,
  'no-mx': 'The domain of this e-mail address cannot receive mail. Check the spelling after the @.',
};
app.get('/api/email/check', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!emailCheckLimit(req.ip)) return res.status(429).json({ error: 'Too many requests — try again in a minute' });
  try {
    const reason = await withTimeout(addressProblem(await adminFirestore(), req.query.email), 8000);
    return res.json(reason ? { ok: false, reason, error: EMAIL_PROBLEMS[reason] } : { ok: true });
  } catch (err) {
    return res.status(503).json({ error: 'E-mail check unavailable' });
  }
});

// Proof of ownership is NOT the same as an address that exists. A Google sign-in is verified by the provider; a password
// account needs email_verified (no mail is sent any more, so only old accounts have it); a 'custom' sign-in (the tool iframes,
// custom token from tool-auth-bridge, 00200 rule) carries email_verified copied from the user record and is the only proof there.
// emailProven() below is the one question the entitlement code asks.
function emailVerificationRequired(decoded) {
  const provider = decoded?.firebase?.sign_in_provider;
  return provider === 'password' || provider === 'email' || provider === 'custom' || !provider;
}
// "Proven" e-mail (owner 9 Oct): a Google sign-in, or email_verified true (accounts that verified before the mail was dropped).
// Nobody becomes proven any other way. A proven e-mail may also use what is matched ONLY by e-mail (orders, keys, tester entry,
// admin preview, tool custom-token sign-in); every other password account is limited to what is bound to its uid.
// Exception (owner 2026-10-18): parked purchase credits go to any account with the checkout e-mail, or with the order number.
function emailProven(decoded) {
  return !emailVerificationRequired(decoded) || decoded.email_verified === true;
}
// A password account becomes proven again on request (owner bug 25 Oct 2026: a signed-out paid order did not appear for a
// password account with the same e-mail): when emailOrdersWaiting (below) says its e-mail holds something its uid does not,
// the account page offers Firebase's own confirmation link (sendEmailVerification, sent to that address only). Opening it
// sets email_verified, so emailProven() is true and every rule above opens the e-mail's orders. Someone who signed up
// with another person's address never receives the link, so nothing opens for them; nothing else changes.
const CLAIM_HINT = 'This order is under your e-mail address but not on your account yet. Claim it with the order number from your receipt, or confirm your e-mail on your Account page.';
// Slugs of the orders this account may use: by e-mail AND uid when proven, by uid alone when not.
const ownedSlugsFor = (admin, decoded) => emailProven(decoded) ? ownedOrderSlugs(admin, decoded.email, decoded.uid) : ownedUidOrderSlugs(admin, decoded.uid);
const launch1ClaimFor = (admin, decoded) => emailProven(decoded) ? holdsLaunch1Claim(admin, decoded.uid, decoded.email) : holdsLaunch1UidClaim(admin, decoded.uid);
// A non-proven account was refused: would its e-mail alone have opened this plugin? Then the answer is "claim it", not "buy it".
// A free plugin opens by the e-mail of its $0 order for an unproven password account too (owner 24 Oct 2026): nothing
// was paid, so signing up with someone else's address takes nothing. Paid orders, packs and keys keep the proven rule.
// -> { slug: day } for the free plugins only; {} for a proven account (its e-mail orders are already counted).
async function freeByEmail(admin, decoded) {
  if (emailProven(decoded) || !decoded.email) return {};
  const byMail = await purchasedByOrders(admin, decoded.email, decoded.uid);
  return Object.fromEntries(Object.entries(byMail).filter(([slug]) => FREE_SLUGS.includes(slug)));
}

async function emailOnlyOpens(admin, decoded, slug, launchId) {
  if (emailProven(decoded)) return false;
  if ((await ownedOrderSlugs(admin, decoded.email, decoded.uid)).includes(slug)) return true;
  if (launchId === 'free' || launchId === 'solo' || launchId === 'pack' || launchId === 'member' || launchId === 'trial') return false;
  const standing = await launch2Access(admin, decoded, true);
  if (standing === 'paid') return true;
  return launchId === 'launch' && holdsLaunch1Claim(admin, decoded.uid, decoded.email);
}

// An unproven account: does its e-mail alone hold a paid order or pack, a family order or a first-1,000 claim that its uid
// does not? Then /api/purchases/status says emailOrdersWaiting and the account page offers the confirmation link. Only
// yes / no goes back, never what was bought: that stays hidden until the e-mail is proven. Free plugins open by e-mail
// already (freeByEmail), so they do not count.
async function emailOrdersWaiting(admin, decoded) {
  if (emailProven(decoded) || !decoded.email) return false;
  const [byMail, byUid, family, familyUid, launch1, launch1Uid] = await Promise.all([
    ownedOrderSlugs(admin, decoded.email, decoded.uid), ownedUidOrderSlugs(admin, decoded.uid),
    launch2Access(admin, decoded, true), launch2Access(admin, decoded),
    holdsLaunch1Claim(admin, decoded.uid, decoded.email), holdsLaunch1UidClaim(admin, decoded.uid),
  ]);
  if (byMail.some((slug) => !byUid.includes(slug) && !FREE_SLUGS.includes(slug))) return true;
  return (family === 'paid' && familyUid !== 'paid') || (launch1 && !launch1Uid);
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
    if (!(await requireDeliverable(admin, decoded, res))) return;
    const standing = await launch2Access(admin, decoded);
    return res.json({ paid: standing === 'paid', tester: standing === 'tester', standing });
  } catch (err) {
    return res.status(serviceDown(err) ? 503 : 401).json({ error: serviceDown(err) ? 'Service unavailable' : 'Your sign-in has expired — sign in again' });
  }
});

// Everything this signed-in account may download, and since when:
//   owned      slugs: single orders (and the old bundle) + the whole family when a family order is paid
//              + the released products a tester may download (TESTER_RELEASED_SLUGS, or its owned map once ended)
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
// A non-proven account (see emailProven) counts only what is bound to its uid (orders_by_uid, launch2_uids) plus its own
// first-1,000 uid claim; what is matched only by e-mail waits for a claim with the order number.
async function accountEntitlements(admin, decoded) {
  const proven = emailProven(decoded);
  const [bought, free, standing, launch1] = await Promise.all([
    proven ? purchasedByOrders(admin, decoded.email, decoded.uid) : purchasedByUidOrders(admin, decoded.uid),
    freeByEmail(admin, decoded),
    launch2Access(admin, decoded),
    launch1ClaimFor(admin, decoded),
  ]);
  const purchased = { ...free, ...bought };
  const owned = new Set(Object.keys(purchased));
  // One of the first 1,000: KUBBE + KASET stay on the account (no purchase date, so no updates line).
  if (launch1) for (const slug of ['kubbe', 'kaset']) owned.add(slug);
  if (standing === 'paid') {
    const day = isAdminPreview(decoded) ? new Date().toISOString().slice(0, 10) : addYears((await launch2PurchaseFor(admin, decoded))?.paidAt || await redeemedFamilyAt(admin.db, decoded.uid), 0);
    for (const slug of ALL_SLUGS) {
      owned.add(slug);
      if (day && (!purchased[slug] || day > purchased[slug])) purchased[slug] = day;
      else if (!(slug in purchased)) purchased[slug] = null;
    }
  }
  // A tester's record (testerSlugsFor): every released product while active, what it owns once ended, nothing when revoked.
  (await testerSlugsFor(admin, decoded)).forEach((slug) => owned.add(slug));
  const updatesUntil = {};
  // Free plugins get every update; no end date is shown for them.
  for (const [slug, day] of Object.entries(purchased)) if (day && !FREE_SLUGS.includes(slug) && !PACK_SLUGS.includes(slug)) updatesUntil[slug] = addYears(day, UPDATE_YEARS);
  // packs: sample and preset packs this account bought (on their own or through the sweep). Kept apart from `owned` (plugins).
  return { owned: PLUGIN_SLUGS.filter((s) => owned.has(s)), packs: PACK_SLUGS.filter((s) => owned.has(s)), standing, purchased, updatesUntil };
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
    if (!(await requireDeliverable(admin, decoded, res))) return;
    const proven = emailProven(decoded);
    const { claimed, total } = await withTimeout(launch.readCounter(), 8000);
    const [ent, waiting] = await withTimeout(Promise.all([accountEntitlements(admin, decoded), emailOrdersWaiting(admin, decoded)]), 8000);
    // Credits bought without an account id are parked under the checkout e-mail; the account with that e-mail collects them
    // (owner 2026-10-18: proven or not; credits only, orders and keys keep the proven rule).
    if (decoded.email) await withTimeout(credits.claimPending({ uid: decoded.uid, email: decoded.email }), 8000).catch((err) => console.error('credits claim:', err.message));
    await sendWelcome(admin, decoded.uid);
    return res.json({ full: claimed >= total, owned: ent.owned, packs: ent.packs, standing: ent.standing, purchased: ent.purchased, updatesUntil: ent.updatesUntil, unverified: !proven, emailOrdersWaiting: waiting });
  } catch (err) {
    return res.status(serviceDown(err) ? 503 : 401).json({ error: serviceDown(err) ? 'Service unavailable' : 'Your sign-in has expired — sign in again' });
  }
});

/* ---- Store codes: POST /api/redeem (redeem.js; owner 7 Nov 2026) ------------------------------------------------------------
   A buyer who got a single-use code from a store (Loot Audio, Audio Plugin Deals, ...) signs in and types it on /redeem or in the
   /account block; the product is added to the account (redemptions/{hash}, redeemed_by_uid/{uid}) and then counts like a paid
   order of that product (entitlements.js readUidOwnership / ownedVia 'code'; a family code through launch2Access).
   Unverified e-mail: a redeemed code is bound to the uid, like orders_by_uid and App Store purchases, so no proven e-mail is
   needed; the address must still be able to receive mail (requireDeliverable), the same rule as every download ticket, so a
   code is never spent on an account that could not download it. Env: REDEEM_CODE_PEPPER (Secret Manager); without it, or with
   a pepper that does not match api/redeemCodes.json, every code answers 503 (never "not valid").
   -> 200 {ok, product, name} | 400 not valid | 401 not signed in | 403 outside its dates (names the date) | 409 used | 429 */
const redeemTable = loadRedeemCodes(process.env.REDEEM_CODES_PATH || join(__dirname, 'redeemCodes.json'));
const redeemIpLimit = tokenBucket({ perMinute: 10 });
const redeemUidLimit = tokenBucket({ perMinute: 10 });
const redeemBody = express.json({ limit: '2kb' });
app.post('/api/redeem', redeemBody, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!redeemIpLimit(req.ip)) return res.status(429).json({ error: 'Too many tries. Wait a minute and try again.' });
  const token = (req.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'Sign in first.' });
  let admin, decoded;
  try { admin = await adminFirestore(); decoded = await admin.auth.verifyIdToken(token); } catch (err) {
    return res.status(serviceDown(err) ? 503 : 401).json({ error: serviceDown(err) ? 'Service unavailable' : 'Your sign-in has expired — sign in again' });
  }
  const uid = launch2Uid(decoded.uid);
  if (!uid) return res.status(400).json({ error: 'This account cannot hold a purchase' });
  if (!redeemUidLimit(`uid:${uid}`)) return res.status(429).json({ error: 'Too many tries. Wait a minute and try again.' });
  try {
    if (!(await requireDeliverable(admin, decoded, res))) return;
    const { status, body } = await withTimeout(redeemCode(admin.db, { uid, email: decoded.email, code: req.body?.code, table: redeemTable, pepper: process.env.REDEEM_CODE_PEPPER }), 8000);
    if (status === 200 && !body.already) console.log(`redeem: ${body.product} for uid ${uid.slice(0, 6)}…`);
    if (status === 503) console.error('redeem: REDEEM_CODE_PEPPER missing or does not match redeemCodes.json');
    return res.status(status).json(body);
  } catch (err) {
    console.error('redeem:', err.message);
    return res.status(503).json({ error: 'Service unavailable' });
  }
});

/* ---- RU-8 and AHENK on iPhone / iPad (appstore.js; contracts 01_AI_Tools/subverselab-ru8/docs/api_runs/contract_ru8_ios_unlock.md
   and 01_AI_Tools/subverselab-plugin-common/docs/TRIAL_AND_SIGNIN.md "App Store") ----
   One $25 purchase = RU-8 on Mac, Windows and iOS. The iOS app asks whether a signed-in account owns RU-8 (a Lemon Squeezy order
   or a linked App Store purchase), links an App Store purchase to the account (which then opens the desktop downloads through
   the 'solo' ticket like a paid order), and Apple tells us about refunds. Env: APPLE_ALLOW_SANDBOX=1 accepts Sandbox
   transactions and notifications (TestFlight / Xcode testing); unset in production. No other setting: the Apple root is pinned. */
const iosLimit = tokenBucket({ perMinute: 30 });
const applePurchaseLimit = tokenBucket({ perMinute: 10 });
const appleNotifyLimit = tokenBucket({ perMinute: 120 });
// A StoreKit 2 signedTransaction is ~4 KB (three certificates in its header); a notification nests one or two more JWS.
const appleBody = express.json({ limit: '16kb' });
const appleNotifyBody = express.json({ limit: '64kb' });
async function iosCaller(req, res) {
  const token = (req.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) { res.status(401).json({ error: 'Sign in first' }); return null; }
  try {
    const admin = await adminFirestore();
    return { admin, decoded: await admin.auth.verifyIdToken(token) };
  } catch (err) {
    res.status(serviceDown(err) ? 503 : 401).json({ error: serviceDown(err) ? 'Service unavailable' : 'Your sign-in has expired — sign in again' });
    return null;
  }
}

// The same two routes for every iOS app in appstore.js APPLE_APPS: /api/ru8/ios/... (RU-8) and /api/ahenk/ios/... (AHENK,
// 7 Nov 2026; TRIAL_AND_SIGNIN.md "App Store"). Rate limits are per address and shared by the apps.
for (const { slug } of APPLE_APPS) {
  // GET /api/<slug>/ios/entitlement   Authorization: Bearer <Firebase ID token>  -> {owned, via: 'lemonsqueezy' | 'appstore' | null}
  // The same order rules as the download ticket (by e-mail and uid for a proven e-mail, by uid otherwise) plus App Store
  // purchases linked to this uid. Testers and the admin preview are not owners here (the iOS app is sold, not tested, this way).
  app.get(`/api/${slug}/ios/entitlement`, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!iosLimit(req.ip)) return res.status(429).json({ error: 'Too many requests' });
    const caller = await iosCaller(req, res);
    if (!caller) return;
    const { admin, decoded } = caller;
    try {
      const via = await withTimeout(ownedVia(admin, { email: decoded.email, uid: decoded.uid, proven: emailProven(decoded) }, slug), 8000);
      return res.json({ owned: Boolean(via), via });
    } catch (err) {
      console.error('ios entitlement:', err.message);
      return res.status(503).json({ error: 'Service unavailable' });
    }
  });

  // POST /api/<slug>/ios/apple-purchase   Authorization: Bearer <Firebase ID token>   body {jws: <StoreKit 2 signedTransaction>}
  // -> 200 {owned: true, via: 'appstore'} | 400 bad signature / not this app's full purchase / Sandbox | 403 refunded |
  // 409 linked to another account.
  app.post(`/api/${slug}/ios/apple-purchase`, appleBody, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!applePurchaseLimit(req.ip)) return res.status(429).json({ error: 'Too many requests' });
    const caller = await iosCaller(req, res);
    if (!caller) return;
    const { admin, decoded } = caller;
    const uid = launch2Uid(decoded.uid);
    if (!uid) return res.status(400).json({ error: 'This account cannot hold a purchase' });
    let tx;
    try { tx = verifyAppleJws(req.body?.jws); } catch (err) {
      if (err instanceof AppleJwsError) return res.status(400).json({ error: 'This is not a valid App Store purchase.', reason: err.reason });
      throw err;
    }
    const problem = transactionProblem(tx, { slug });
    if (problem) return res.status(problem.status).json({ error: problem.error });
    try {
      const { status, body } = await withTimeout(linkApplePurchase(admin.db, { uid, tx }), 8000);
      if (status === 200) console.log(`apple purchase linked (${slug}): uid ${uid.slice(0, 6)}… env ${tx.environment}`);
      return res.status(status).json(body);
    } catch (err) {
      console.error('apple purchase:', err.message);
      return res.status(503).json({ error: 'Service unavailable' });
    }
  });
}

// POST /api/apple/notifications   App Store Server Notifications V2, body {signedPayload}. No account: the signature is the proof.
// 400 when a signature does not verify; 200 for every verified notification, handled or not (REFUND / REVOKE close the
// purchase, REFUND_REVERSED reopens it, everything else is ignored); 503 only when Firestore fails, so Apple retries.
app.post('/api/apple/notifications', appleNotifyBody, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!appleNotifyLimit(req.ip)) return res.status(429).json({ error: 'Too many requests' });
  let payload;
  try { payload = verifyAppleJws(req.body?.signedPayload); } catch (err) {
    if (err instanceof AppleJwsError) return res.status(400).json({ error: 'Bad signature', reason: err.reason });
    throw err;
  }
  try {
    const admin = await adminFirestore();
    const { result } = await withTimeout(handleAppleNotification(admin.db, payload), 8000);
    console.log(`apple notification ${String(payload.notificationType || '').slice(0, 40)}: ${result}`);
    return res.json({ ok: true, result });
  } catch (err) {
    if (err instanceof AppleJwsError) return res.status(400).json({ error: 'Bad signature', reason: err.reason });
    console.error('apple notification:', err.message);
    return res.status(503).json({ error: 'Service unavailable' });
  }
});

// ---- Inbox: messages from the platform (inbox.js). Only the server writes them. ------------------------------------
// The welcome message goes out the first time /api/purchases/status succeeds for an account. An inbox failure
// never fails the request it rides on.
async function sendWelcome(admin, uid) {
  try { await withTimeout(addMessage(admin.db, uid, 'welcome', welcomeMessage), 5000); } catch (err) { console.error('inbox welcome:', err.message); }
}

// GET /api/inbox   Authorization: Bearer <Firebase ID token>  → {messages:[{id,title,body,link,kind,createdAt,read}], unread}
// Latest 50, newest first. An unverified password account may read its inbox (it holds no licence key).
app.get('/api/inbox', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!downloadLimit(req.ip)) return res.status(429).json({ error: 'Too many requests' });
  const token = (req.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'Sign in first' });
  try {
    const admin = await adminFirestore();
    const decoded = await admin.auth.verifyIdToken(token);
    return res.json(await withTimeout(listMessages(admin.db, decoded.uid), 8000));
  } catch (err) {
    return res.status(serviceDown(err) ? 503 : 401).json({ error: serviceDown(err) ? 'Service unavailable' : 'Your sign-in has expired — sign in again' });
  }
});

// POST /api/inbox/read   {ids:[…]} or {all:true}   → {changed}
app.post('/api/inbox/read', smallBody, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!downloadLimit(req.ip)) return res.status(429).json({ error: 'Too many requests' });
  const token = (req.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'Sign in first' });
  try {
    const admin = await adminFirestore();
    const decoded = await admin.auth.verifyIdToken(token);
    const changed = await withTimeout(markRead(admin.db, decoded.uid, { ids: req.body?.ids, all: req.body?.all === true }), 8000);
    return res.json({ changed });
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
    if (!(await requireDeliverable(admin, decoded, res))) return;
    // A non-proven password account sees only the keys of orders bound to its uid (owner 9 Oct); nothing found by e-mail.
    const unverified = !emailProven(decoded);
    const mail = String(decoded.email).trim().toLowerCase();
    if (mail.includes('/')) return res.json({ licenses: [] });
    // Admin preview: one family entry shaped like a real family key, plainly fake, never stored.
    const previewLicence = isAdminPreview(decoded) ? [{
      id: 'admin-preview', product: 'family', productName: 'SubverseLab plugin family', purchased: purchaseDay(new Date().toISOString()),
      updatesUntil: addYears(new Date().toISOString(), UPDATE_YEARS), key: ADMIN_PREVIEW_KEY, keyShort: null, status: 'active',
      activationLimit: 5, instancesCount: 0, orderId: null, created: null, preview: true,
    }] : [];
    const docs = unverified ? [] : [(await withTimeout(admin.db.collection('plugin_licenses').doc(mail).get(), 8000)).data() || {}];
    const bound = launch2Uid(decoded.uid) ? await withTimeout(admin.db.collection('launch2_uids').doc(launch2Uid(decoded.uid)).get(), 8000) : null;
    const boundMail = bound?.exists ? launch2Email(bound.data().email) : null;
    const familyBound = Boolean(boundMail) && (!unverified || await withTimeout(launch2UidStanding(admin, decoded.uid), 8000) === 'paid');
    if (familyBound && (boundMail !== mail || unverified)) {
      const other = await withTimeout(admin.db.collection('plugin_licenses').doc(boundMail).get(), 8000);
      const od = other.exists ? other.data() : {};
      // Only the keys of the order that this uid is bound to.
      docs.push({ orders: od.orders || {}, licenses: Object.fromEntries(Object.entries(od.licenses || {}).filter(([, l]) => String(l?.order_id) === String(bound.data().orderId))) });
    }
    // Orders bound to this uid (orders_by_uid), paid under any checkout e-mail: that e-mail's record is read for exactly those
    // orders' keys. An unverified account gets only the live ones (paid, not refunded).
    const uidOrders = Object.entries(await withTimeout(readUidOrders(admin, decoded.uid), 8000)).filter(([, o]) => o && o.email && !String(o.email).includes('/') && (!unverified || (o.status === 'paid' && !o.refunded)));
    const fetched = new Map();
    for (const [orderId, o] of uidOrders) {
      if (!fetched.has(o.email)) fetched.set(o.email, (await withTimeout(admin.db.collection('plugin_licenses').doc(o.email).get(), 8000)).data() || {});
      const od = fetched.get(o.email);
      docs.push({ orders: od.orders || {}, licenses: Object.fromEntries(Object.entries(od.licenses || {}).filter(([, l]) => String(l?.order_id) === String(orderId))) });
    }
    const orders = Object.assign({}, ...docs.map((d) => d.orders || {}));
    const seenKey = new Set();
    const licenses = docs.flatMap((d) => Object.entries(d.licenses || {}).map(([id, l]) => ({ id, l })))
      .filter(({ id, l }) => { const k = String(l?.license_id || id); if (seenKey.has(k)) return false; seenKey.add(k); return true; })
      .map(({ l }) => l)
      .filter((l) => l && l.key && !l.disabled)
      .map((l) => ({
        id: String(l.license_id || ''),
        product: l.product || orders[l.order_id]?.product || null,
        productName: orders[l.order_id]?.product_name || null,
        purchased: purchaseDay(orders[l.order_id]?.created || l.created),
        // Free plugins (FREE_SLUGS) get every update and show no end date: null, so the page renders no line.
        updatesUntil: FREE_SLUGS.includes(l.product || orders[l.order_id]?.product) ? null : addYears(orders[l.order_id]?.created || l.created, UPDATE_YEARS),
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

// POST /api/orders/claim   Authorization: Bearer <Firebase ID token>   {orderNumber, email}  → 200 {slugs}
// For an order placed without signing in (no uid on it, or a checkout e-mail that is not this account's). The order number is
// printed only on the receipt sent to the checkout e-mail, so number + e-mail together are the proof. Binds the order and its
// keys to the caller's uid, writes orders_by_uid/{uid} and, for the family, launch2_uids/{uid} (the webhook's binding rule).
// Unverified password accounts may claim: what they get is exactly what a uid-bound order opens for them.
// 404 not found (also a wrong e-mail), 402 refunded / not paid, 409 bound to another account, 429 after 5 tries per hour per uid.
const CLAIMS_PER_HOUR = 5;
const claimTries = new Map(); // uid -> timestamps (ms) of the attempts in the last hour
function claimAllowed(uid, now = Date.now()) {
  const recent = (claimTries.get(uid) || []).filter((t) => now - t < 3_600_000);
  if (recent.length >= CLAIMS_PER_HOUR) { claimTries.set(uid, recent); return false; }
  recent.push(now);
  claimTries.set(uid, recent);
  if (claimTries.size > 10_000) for (const [k, v] of claimTries) if (!v.some((t) => now - t < 3_600_000)) claimTries.delete(k);
  return true;
}
async function claimOrder(admin, { uid, mail, number }) {
  const { db } = admin;
  return db.runTransaction(async (tx) => {
    const licRef = db.collection('plugin_licenses').doc(mail);
    const data = (await tx.get(licRef)).data() || {};
    const found = Object.entries(data.orders || {}).find(([, o]) => o && String(o.order_number) === number);
    if (!found) return { status: 404, error: 'No order with this number and e-mail was found. Use the order number and the e-mail address from your receipt.' };
    const [orderId, order] = found;
    if (order.refunded || order.status === 'refunded') return { status: 402, error: 'This order was refunded, so it cannot be claimed.' };
    if (order.status !== 'paid') return { status: 402, error: 'This order is not paid yet.' };
    if (order.uid && order.uid !== uid) return { status: 409, error: 'This order is already claimed by another account.' };
    const family = order.product === 'family';
    let purchaseRef = null, purchase = null, uidRef = null, bindFamily = false;
    if (family) {
      purchaseRef = db.collection('launch2_purchases').doc(mail);
      uidRef = db.collection('launch2_uids').doc(uid);
      const [purchaseSnap, uidSnap] = await Promise.all([tx.get(purchaseRef), tx.get(uidRef)]);
      purchase = purchaseSnap.exists ? purchaseSnap.data() : null;
      if (purchase && purchase.orderId === orderId) {
        if (purchase.refunded) return { status: 402, error: 'This order was refunded, so it cannot be claimed.' };
        if (purchase.uid && purchase.uid !== uid) return { status: 409, error: 'This order is already claimed by another account.' };
        bindFamily = true;
        // Same rule as recordLaunch2Order: a uid that already holds another live family order keeps it.
        if (uidSnap.exists) {
          const bound = uidSnap.data();
          if (bound.orderId !== orderId && bound.email !== mail) {
            const other = (await tx.get(db.collection('launch2_purchases').doc(bound.email))).data();
            if (other && other.orderId === bound.orderId && !other.refunded) return { status: 409, error: 'This account already holds another family order.' };
          }
        }
      }
    }
    tx.set(licRef, {
      orders: { [orderId]: { uid } },
      licenses: Object.fromEntries(Object.entries(data.licenses || {}).filter(([, l]) => l && String(l.order_id) === orderId).map(([id]) => [id, { uid }])),
    }, { merge: true });
    tx.set(db.collection(ORDERS_BY_UID).doc(uid), { orders: { [orderId]: uidOrderEntry(order, mail) } }, { merge: true });
    if (bindFamily) {
      tx.set(purchaseRef, { uid }, { merge: true });
      tx.set(uidRef, { email: mail, orderId, at: purchase.paidAt });
    }
    return { status: 200, orderId, order, slugs: bindFamily ? [...ALL_SLUGS] : ownedFromOrders({ [orderId]: { ...order, uid } }) };
  });
}
app.post('/api/orders/claim', smallBody, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!downloadLimit(req.ip)) return res.status(429).json({ error: 'Too many requests' });
  const token = (req.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'Sign in first' });
  let admin, decoded;
  try { admin = await adminFirestore(); decoded = await admin.auth.verifyIdToken(token); } catch (err) { return res.status(serviceDown(err) ? 503 : 401).json({ error: serviceDown(err) ? 'Service unavailable' : 'Your sign-in has expired — sign in again' }); }
  const uid = launch2Uid(decoded.uid);
  if (!uid) return res.status(401).json({ error: 'Your sign-in has expired — sign in again' });
  if (!claimAllowed(uid)) return res.status(429).json({ error: 'Too many tries. Wait an hour and try again, or use “Report a problem” on this page.' });
  const number = String(req.body?.orderNumber ?? '').trim().replace(/^#/, '');
  const mail = launch2Email(req.body?.email);
  if (!/^\d{1,12}$/.test(number)) return res.status(400).json({ error: 'Enter the order number from your receipt (digits only).' });
  if (!mail || mail.length > 254 || !/^[^@\s]+@[^@\s]+$/.test(mail)) return res.status(400).json({ error: 'Enter the e-mail address you used at checkout.' });
  try {
    const out = await withTimeout(claimOrder(admin, { uid, mail, number }), 10000);
    if (out.status !== 200) return res.status(out.status).json({ error: out.error });
    // The order number proves the purchase: its parked credits (if any) go to this account too (owner 2026-10-18).
    try { await withTimeout(credits.claimPending({ uid, email: mail, orderIds: [out.orderId] }), 8000); } catch (err) { console.error('credits claim (order):', err.message); }
    // The same message the webhook writes (same id), so a claim after a bound webhook adds nothing twice.
    try {
      const o = out.order;
      await withTimeout(addMessage(admin.db, uid, `order-${out.orderId}`, orderMessage(o.product, { orderNumber: o.order_number, created: o.created, free: o.amount_usd_cents === 0 || o.total === 0 })), 5000);
    } catch (err) { console.error('inbox claim message:', err.message); }
    return res.json({ slugs: out.slugs });
  } catch (err) {
    console.error('order claim:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Service unavailable. Try again in a minute.' });
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
  // Owner 2026-10-10: the paid family seat count (launch2) is never published, not even as JSON.
  if (launchId !== 'launch') return res.json({ available: false });
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
  // The address must be able to receive mail (no verification any more), before any claim or entitlement logic.
  try { if (!(await requireDeliverable(admin, decoded, res))) return; } catch (err) { return res.status(503).json({ error: 'The licence service is not available right now' }); }

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
    // A non-proven account may read the seat its uid already holds, not mint a new one (see the ticket route).
    if (launchId === 'launch' && !emailProven(decoded) && !(await withTimeout(holdsLaunch1UidClaim(admin, decoded.uid), 8000))) {
      return res.status(403).json({ error: 'Sign in with Google to take a free launch seat.' });
    }
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
          // lastSignInTime only moves on an explicit sign-in; a member who stays signed in refreshes the token
          // instead, so lastRefreshTime is the real "last seen".
          createdAt: u.metadata.creationTime, lastSignInAt: u.metadata.lastSignInTime,
          lastActiveAt: u.metadata.lastRefreshTime || u.metadata.lastSignInTime || null,
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
      m.downloads += countDownloads(d.data());
    }
    const licences = await withTimeout(admin.db.collection('plugin_licenses').get(), 15000);
    const rows = joinMembers(members, licences.docs.map((d) => ({ id: d.id, data: d.data() })));
    const counter = await admin.db.collection('launch').doc('counter').get();
    return res.json({ members: rows, launch: counter.exists ? counter.data() : null });
  } catch (err) {
    console.error('admin members:', err.message);
    return res.status(503).json({ error: 'Member service unavailable' });
  }
});

/* ---- Own traffic numbers (stats.js) -----------------------------------------
   POST /api/hit {path, ref, landing, src}: a cookieless page-view counter. The page address is mapped to a known route, the
   referrer to its host, src (the landing link's utm_source) to one of our social channel names or nothing; nothing identifying is stored (no IP, no user agent, no uid). The IP only feeds the in-memory
   rate limit, the user agent only decides "bot or not". Counted in memory, flushed to site_stats/{day} about every minute
   and on SIGTERM. Always answers 204: a counter must never break a page. */
const hits = createHitCounter({ getAdmin: adminFirestore });
const hitLimit = tokenBucket({ perMinute: 120 });
// text/plain too: the site sends the beacon as text/plain, which a browser may send cross-origin without a preflight
// (an application/json beacon to api.subverselab.com would need one, and sendBeacon cannot do it).
const hitJson = express.json({ limit: '1kb', type: ['application/json', 'text/plain'] });
// The flush timer and the SIGTERM flush are armed by the first hit, so an instance that never counts anything has neither.
let hitsArmed = false;
function armHits() {
  if (hitsArmed) return;
  hitsArmed = true;
  hits.start();
  process.on('SIGTERM', () => {
    Promise.race([hits.flush(), new Promise((resolve) => setTimeout(resolve, 5000))]).finally(() => process.exit(0));
  });
}
app.post('/api/hit', (req, res, next) => hitJson(req, res, (err) => (err ? res.status(204).end() : next())), (req, res) => {
  try { if (hitLimit(req.ip)) { armHits(); hits.hit(req.body, req.get('User-Agent')); } } catch { /* never reaches the visitor */ }
  res.status(204).end();
});

// GET /api/admin/stats?days=30   Authorization: Bearer <Firebase ID token>
// Orders, accounts, downloads and page views from our own data (no Google Analytics). Same guard as /api/admin/members.
app.get('/api/admin/stats', async (req, res) => {
  const caller = await testerCaller(req, res, { adminOnly: true });
  if (!caller) return;
  try {
    return res.json(await computeStats(caller.admin, { days: req.query.days, run: withTimeout }));
  } catch (err) {
    console.error('admin stats:', err.message);
    return res.status(503).json({ error: 'Stats service unavailable' });
  }
});

/* ---- Sample-pack applications -----------------------------------------------
   /sample-packs is an "under construction" page with a form for producers who
   want to publish packs once the store opens. pack_applications/{lowercased e-mail}
   {name, email, artist, country, links[], kinds[], storeUrl, message, rightsConfirmed,
    uid|null, createdAt, updatedAt, status}. One per e-mail: sending again updates it
   and keeps createdAt. No mail is sent (no transactional provider yet). */
const PACK_KINDS = ['drum kits', 'loops', 'one-shots', 'melodic samples', 'vocals', 'presets', 'other'];
const PACK_APPLY_PER_HOUR = 5;
const packBody = express.json({ limit: '16kb' });
// 5 per hour per IP: a sliding window of timestamps (tokenBucket cannot express a rate below one a minute).
const packApplyHits = new Map();
function packApplyAllowed(ip, now = Date.now()) {
  const recent = (packApplyHits.get(ip) || []).filter((t) => now - t < 3_600_000);
  if (recent.length >= PACK_APPLY_PER_HOUR) { packApplyHits.set(ip, recent); return false; }
  recent.push(now);
  packApplyHits.set(ip, recent);
  if (packApplyHits.size > 10_000) for (const [k, v] of packApplyHits) if (!v.some((t) => now - t < 3_600_000)) packApplyHits.delete(k);
  return true;
}
function httpUrl(value) {
  const text = typeof value === 'string' ? value.trim().slice(0, 300) : '';
  try { return /^https?:$/.test(new URL(text).protocol) ? text : null; } catch { return null; }
}
function readPackApplication(body) {
  const b = body && typeof body === 'object' ? body : {};
  const name = cleanText(b.name, 100);
  if (!name) return { error: 'Enter your name' };
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase().slice(0, 254) : '';
  if (!email) return { error: 'Enter your e-mail address' };
  const artist = cleanText(b.artist, 100);
  if (!artist) return { error: 'Enter your artist or producer name' };
  const rawLinks = (Array.isArray(b.links) ? b.links : []).filter((l) => typeof l === 'string' && l.trim()).slice(0, 8);
  const links = [];
  for (const l of rawLinks) {
    const url = httpUrl(l);
    if (!url) return { error: 'Every link must start with http:// or https://' };
    if (!links.includes(url)) links.push(url);
  }
  if (!links.length) return { error: 'Add at least one link to your music or store' };
  const kinds = [...new Set(Array.isArray(b.kinds) ? b.kinds.filter((k) => PACK_KINDS.includes(k)) : [])];
  let storeUrl = '';
  if (typeof b.storeUrl === 'string' && b.storeUrl.trim()) {
    storeUrl = httpUrl(b.storeUrl);
    if (!storeUrl) return { error: 'The link to your packs must start with http:// or https://' };
  }
  if (b.rightsConfirmed !== true) return { error: 'Confirm that you made these sounds or hold the rights to every sample in them' };
  return { value: { name, email, artist, country: cleanText(b.country, 80), links, kinds, storeUrl, message: cleanParagraph(b.message, 1000) } };
}

// POST /api/packs/apply   public; a signed-in user only pre-fills the e-mail and adds the uid.
app.post('/api/packs/apply', packBody, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!packApplyAllowed(req.ip)) return res.status(429).json({ error: 'Too many applications from this connection — try again in an hour' });
  const { value, error } = readPackApplication(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const admin = await adminFirestore();
    if (!(await withTimeout(addressExists(admin, value.email), 8000))) return res.status(403).json({ error: NO_MAIL_ERROR });
    let uid = null;
    const token = (req.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
    if (token) { try { uid = (await admin.auth.verifyIdToken(token)).uid || null; } catch { uid = null; } }
    const ref = admin.db.collection('pack_applications').doc(value.email);
    const now = new Date().toISOString();
    await admin.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const createdAt = snap.exists && snap.data().createdAt ? snap.data().createdAt : now;
      tx.set(ref, { ...value, rightsConfirmed: true, uid, createdAt, updatedAt: now, status: 'new' });
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error('packs apply:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'The application service is not available right now' });
  }
});

// GET /api/admin/pack-applications → newest first. Same guard as the other admin routes.
app.get('/api/admin/pack-applications', async (req, res) => {
  const caller = await testerCaller(req, res, { adminOnly: true });
  if (!caller) return;
  try {
    const snap = await withTimeout(caller.admin.db.collection('pack_applications').get(), 15000);
    const applications = snap.docs.map((d) => ({ email: d.id, ...d.data() })).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return res.json({ applications });
  } catch (err) {
    console.error('admin pack applications:', err.message);
    return res.status(503).json({ error: 'Application service unavailable' });
  }
});

/* ---- The 100 testers --------------------------------------------------------
   Launch 2 is given free to 100 hand-picked testers, chosen so that operating
   systems and DAWs are covered and the people know enough to report bugs.
   tester_applications/{lowercased e-mail} {status, os, osVersion, daws, dawOther,
                                            formats, years, link, answer, heard, production, musehubEmail (optional), at, decidedAt}
   launch2_testers/{lowercased e-mail}     {approvedAt, os, daws, reports, reportMonth: {month, count},
                                            status: 'active' | 'ended' | 'revoked', agreementVersion,
                                            agreementAcceptedAt, agreementVia: 'email', endedAt?, revokedAt?,
                                            owned?: {slug: 'YYYY-MM-DD'}}  the gate. A record without status is an
                                            old, active tester. active = every released product (TESTER_RELEASED_SLUGS),
                                            test builds, monthly tool credits, reports; ended = no new builds, no
                                            credits, no reports, but owned products stay downloadable (agreement 9.1);
                                            revoked = nothing, owned ignored, seat freed. Nothing here is deleted by
                                            End / Revoke.
   launch2/testers                         {approved}  seats taken (active + ended), max TESTER_CAP; revoke frees one
   tester_reports/{auto id}                {email, plugin|null, os, daw, dawVersion, kind, text, at}
   tester_builds/{auto id}                 {slug, name, version, platform: 'mac' | 'win', objectPath (downloads bucket),
                                            notes, assignedTo: [e-mails], createdAt, releasedAt | null}  the per-account test
                                            area (agreement 4.3-4.4). Download: ticket kind 'test-build', only for an
                                            ACTIVE tester listed in assignedTo. Releasing a build writes
                                            launch2_testers/{e-mail}.owned[slug] for everyone assigned.
                                            Also {manuals: [{title, objectPath | url}], tasks: [{id, title, detail}]}: the
                                            user manuals and the things we ask the tester to try before release; also
                                            {brief: {goal, reference, strengths[], knownIssues[], focus}} (plain paragraphs shown at the top of the build
                                            card) and an optional {licence: {product: 'seda' | 'adalet', productId}}: assigning
                                            such a build issues each assigned tester ONE revocable SVL key for that product
                                            (launchLicence.js issueTesterKey: launch_keys with source 'tester', 2 computers,
                                            tester_keys/{product}:{e-mail} as the index). Admin can disable / enable a key;
                                            Revoke disables all of a tester's keys; End testing leaves them. Never touches
                                            launch/counter and never appears in plugin_licenses (not a purchase).
   launch2_testers/{e-mail}.uid is the Firebase uid the record belongs to (copied from tester_applications.uid on approval; an
   old record binds on the first signed-in tester request with that e-mail; admin can clear it). The tester programme never
   asks for a proven e-mail, it asks for this uid. launch2_testers also holds the optional {displayName, production} the panel greets the tester with.
   tester_build_results/{buildId}_{e-mail} {buildId, email, tasks: {taskId: {status: 'todo' | 'done' | 'problem', note}},
                                            summary, updatedAt}  one tester's results for one build (own, written by
                                            the tester only; admin reads all of a build).
   tester_messages/{auto id}               {email, from: 'tester' | 'staff', kind: 'message' | 'panel', body, at, read}
                                            the thread between a tester and SubverseLab inside the panel (no e-mail is
                                            sent); `read` = the recipient has opened it.
   tester_agent_tokens/{sha256(token)}     {email, createdAt, lastUsedAt}  a tester's personal agent key ("svlt_…", shown once,
                                            one per tester); works only on /api/testers/agent/* while the tester is active.
   Tool credits of testers (2,000 a month) live in credits.js (credits/{uid}.tester, credit_ledger tester_*).
   Testers are never paid seats: launch2/counter.claimed is not touched. */
const TESTER_CAP = 100;
const TESTER_REPORT_CAP = 50; // per calendar month (UTC)
const TESTER_OS = ['macOS Apple Silicon', 'macOS Intel', 'Windows 11', 'Windows 10'];
const TESTER_DAWS = ['Ableton Live', 'FL Studio', 'Logic Pro', 'Cubase', 'Studio One', 'Reaper', 'Pro Tools', 'Bitwig Studio', 'Other'];
const TESTER_FORMATS = ['VST3', 'AU'];
// Launch 2 family: the slugs of the launch2 download ticket.
const LAUNCH2_SLUGS = ['koro', 'yanki', 'hava', 'mihenk', 'tutkal'];
// What an active tester may download (agreement 4.2, owner 2026-10-14): every released product. One line to change.
const TESTER_RELEASED_SLUGS = [...ALL_SLUGS, ...FREE_SLUGS, ...SOLO_SLUGS];
// 'idea' (a new online tool or plug-in) and 'panel' (a change to the panel or to website permissions) need only the text.
const TESTER_KINDS = ['bug', 'sound', 'ui', 'works', 'idea', 'panel'];
const TEXT_ONLY_KINDS = ['idea', 'panel'];
const BUILD_STATUSES = ['todo', 'done', 'problem'];
// The name the panel greets a tester with when the admin has not set one: the first word of the e-mail's local part.
const nameFromEmail = (email) => {
  const word = String(email || '').split('@')[0].split(/[^A-Za-z]+/).find(Boolean) || 'tester';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
};
const AGREEMENT_VERSION = /^\d{1,2}\.\d{1,2}$/;
const monthNow = () => new Date().toISOString().slice(0, 7);
// A record written before the agreement existed has no status: it is an active tester.
const testerStatus = (data) => (['active', 'ended', 'revoked'].includes(data?.status) ? data.status : 'active');
// Slugs a tester record opens: all released products while active, only the owned map once ended, none when revoked.
function testerSlugsOf(data) {
  if (!data) return [];
  const status = testerStatus(data);
  if (status === 'revoked') return [];
  if (status === 'active') return [...TESTER_RELEASED_SLUGS];
  return Object.keys(data.owned || {}).filter((slug) => TESTER_RELEASED_SLUGS.includes(slug));
}
// The tester record is looked up by e-mail but belongs to ONE Firebase uid, not to a proven e-mail (owner 2026-10-14: accounts
// get no verification mail, an existing account counts as verified; this holds for the tester programme only, orders and
// launch claims keep emailProven). The record gets its uid when the owner approves (copied from the application). A record
// without one (approved before this rule, or unbound by the admin) is bound to the first signed-in tester request whose
// e-mail matches AND is proven (Google, or email_verified), and keeps that uid from then on. Security audit 2026-10-17 F4:
// an unproven password account could otherwise claim an unbound record by signing up with the tester's address first;
// such an account is bound by the admin instead (POST /api/admin/testers/uid {bind: true}). → the record's data, or null.
async function testerOwn(admin, decoded) {
  const mail = launch2Email(decoded.email);
  if (!mail || !decoded.uid) return null;
  const ref = admin.db.collection('launch2_testers').doc(mail);
  const snap = await ref.get();
  if (!snap.exists) return null;
  if (snap.data().uid) return snap.data().uid === decoded.uid ? snap.data() : null;
  return admin.db.runTransaction(async (tx) => {
    const fresh = await tx.get(ref);
    if (!fresh.exists) return null;
    if (fresh.data().uid) return fresh.data().uid === decoded.uid ? fresh.data() : null;
    if (!emailProven(decoded)) return null;   // audit F4: only a proven e-mail binds an unbound record by itself
    tx.set(ref, { uid: decoded.uid }, { merge: true });
    return { ...fresh.data(), uid: decoded.uid };
  });
}
async function testerSlugsFor(admin, decoded) {
  const own = await testerOwn(admin, decoded);
  return own ? testerSlugsOf(own) : [];
}
const testerBody = express.json({ limit: '16kb' });
const testerLimit = tokenBucket({ perMinute: 20 });
const testerSeatsLimit = tokenBucket({ perMinute: 30 });
const cleanText = (value, max) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const cleanParagraph = (value, max) => (typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim().slice(0, max) : '');

// Authenticates a tester-programme request exactly like the download ticket
// (verified e-mail), or — with adminOnly — exactly like /api/admin/members.
// Answers the error itself and returns null, so callers just `if (!caller) return`.
// An admin agent key in place of a Google sign-in (api/agents.js). Answers 401 when the key is unknown or revoked.
async function adminAgentCaller(token, res, downMessage) {
  let admin;
  try { admin = await adminFirestore(); } catch (err) { res.status(serviceDown(err) ? 503 : 500).json({ error: downMessage }); return null; }
  let agent;
  try { agent = await createAgentStore(admin.db).find(token); } catch (err) { res.status(serviceDown(err) ? 503 : 500).json({ error: downMessage }); return null; }
  if (!agent) { res.status(401).json({ error: 'This agent key is not valid (unknown or revoked)' }); return null; }
  return { admin, email: `agent:${agent.label}`, uid: `agent:${agent.id.slice(0, 12)}`, agent: true, label: agent.label, id: agent.id };
}

async function testerCaller(req, res, { adminOnly = false } = {}) {
  res.setHeader('Cache-Control', 'no-store');
  if (!(adminOnly ? adminLimit : testerLimit)(req.ip)) { res.status(429).json({ error: 'Too many requests' }); return null; }
  const token = (req.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) { res.status(401).json({ error: 'Sign in first' }); return null; }
  if (adminOnly && DEV_ADMIN && token === 'dev-preview') {   // the local owner preview (SVL_DEV_ADMIN=1, never on Cloud Run), as on the catalogue routes
    try { return { admin: await adminFirestore(), decoded: { email: ADMIN_EMAILS[0], email_verified: true }, email: null, dev: true }; } catch (err) { res.status(503).json({ error: 'Tester service unavailable' }); return null; }
  }
  if (adminOnly && isAgentKey(token)) {   // an admin agent key (api/agents.js) may do what an admin does on these routes
    const who = await adminAgentCaller(token, res, 'Tester service unavailable');
    return who ? { admin: who.admin, decoded: { email: who.email, email_verified: true }, email: null, agent: who } : null;
  }
  let admin, decoded;
  try { admin = await adminFirestore(); decoded = await admin.auth.verifyIdToken(token); } catch (err) {
    res.status(serviceDown(err) ? 503 : 401).json({ error: serviceDown(err) ? 'Tester service unavailable' : 'Your sign-in has expired — sign in again' });
    return null;
  }
  if (adminOnly) {
    if (decoded.email_verified !== true || !ADMIN_EMAILS.includes(String(decoded.email || '').toLowerCase())) { res.status(403).json({ error: 'Admins only' }); return null; }
  } else {
    // No proof needed (owner 9 Oct): applying and reporting only need an address that can receive mail.
    try { if (!(await requireDeliverable(admin, decoded, res))) return null; } catch { res.status(503).json({ error: 'Tester service unavailable' }); return null; }
  }
  const email = launch2Email(decoded.email);
  if (!email && !adminOnly) { res.status(403).json({ error: NO_MAIL_ERROR }); return null; }
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
  // Optional, one line: where the applicant heard about SubverseLab (cheap attribution data).
  const heard = cleanText(b.heard, 120);
  // Optional: the studio / production name the tester panel greets them with.
  const production = cleanText(b.production, 80);
  // Optional: the e-mail of the tester's MuseHub account, for beta builds on MuseHub (same check as the other e-mail fields).
  let musehubEmail = '';
  if (typeof b.musehubEmail === 'string' && b.musehubEmail.trim()) {
    musehubEmail = b.musehubEmail.trim().toLowerCase();
    if (musehubEmail.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(musehubEmail)) return { error: 'Enter a valid MuseHub account e-mail address, or leave it empty' };
  }
  return { value: { os, osVersion, daws, dawOther, formats, years: Math.min(60, Math.floor(years)), link, answer, heard, production, musehubEmail } };
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

// GET /api/testers/me → {status: 'none' | 'pending' | 'approved' | 'declined' | 'ended' | 'revoked'}
app.get('/api/testers/me', async (req, res) => {
  const caller = await testerCaller(req, res);
  if (!caller) return;
  try {
    const snap = await caller.admin.db.collection('tester_applications').doc(caller.email).get();
    return res.json({ status: snap.exists && ['pending', 'approved', 'declined', 'ended', 'revoked'].includes(snap.data().status) ? snap.data().status : 'none' });
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

// The tester's own record for the panel routes below. Answers the error itself and returns null.
// `activeOnly`: the route is for testers who are testing now (an ended or revoked tester gets 403).
async function testerRecord(caller, res, { activeOnly = false } = {}) {
  const data = await withTimeout(testerOwn(caller.admin, caller.decoded), 8000);
  const status = data ? testerStatus(data) : null;
  if (!data || status === 'revoked' || (activeOnly && status !== 'active')) {
    res.status(403).json({ error: !data ? 'The tester panel is for approved testers' : status === 'revoked' ? 'Your tester access has been withdrawn' : 'Your testing period has ended' });
    return null;
  }
  return { data, status };
}

// GET /api/testers/panel → {status, agreement:{version, acceptedAt}, downloads:[slugs], credits:{month, monthly, left} | null,
//   reports:{month, sent, cap}}. The page's Downloads, Tool credits and agreement line. Any tester but a revoked one.
app.get('/api/testers/panel', async (req, res) => {
  const caller = await testerCaller(req, res);
  if (!caller) return;
  try {
    const rec = await testerRecord(caller, res);
    if (!rec) return;
    const month = monthNow();
    const bal = await withTimeout(credits.readBalance(caller.decoded.uid, { testerEmail: caller.decoded.email }), 8000);
    const rm = rec.data.reportMonth;
    return res.json({
      status: rec.status,
      welcome: { name: rec.data.displayName || nameFromEmail(caller.email), production: rec.data.production || '' },
      messages: { unread: await withTimeout(unreadFor(caller.admin.db, caller.email, 'staff'), 8000) },
      agreement: rec.data.agreementVersion ? { version: rec.data.agreementVersion, acceptedAt: rec.data.agreementAcceptedAt || null } : null,
      downloads: testerSlugsOf(rec.data),
      credits: rec.status === 'active' ? bal.tester : null,
      reports: { month, sent: rm?.month === month ? Number(rm.count) || 0 : 0, cap: TESTER_REPORT_CAP },
    });
  } catch (err) {
    console.error('testers panel:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});

// POST /api/testers/report   active testers only; TESTER_REPORT_CAP reports each calendar month.
// Kinds 'idea' and 'panel' need only the text; the other kinds name the plugin, system and DAW.
// Reports about released products are optional: nothing here is an obligation.
// The report rules, shared by the panel route and the agent route: → {status, body}.
async function sendReport(db, email, b) {
  const idea = TEXT_ONLY_KINDS.includes(b.kind);
  const os = TESTER_OS.includes(b.os) ? b.os : null;
  const daw = cleanText(b.daw, 60);
  const text = cleanParagraph(b.text, 4000);
  if (!TESTER_KINDS.includes(b.kind)) return { status: 400, body: { error: 'Choose what kind of report this is' } };
  if (!idea) {
    if (!TESTER_RELEASED_SLUGS.includes(b.plugin)) return { status: 400, body: { error: 'Choose a plugin' } };
    if (!os) return { status: 400, body: { error: 'Choose your operating system' } };
    if (!daw) return { status: 400, body: { error: 'Name the DAW you were using' } };
  }
  if (text.length < 20) return { status: 400, body: { error: 'Write at least 20 characters' } };
  const testerRef = db.collection('launch2_testers').doc(email);
  const month = monthNow();
  const out = await db.runTransaction(async (tx) => {
    const snap = await tx.get(testerRef);
    if (!snap.exists || testerStatus(snap.data()) !== 'active') return { status: 403, error: 'Tester reports are for active testers' };
    const rm = snap.data().reportMonth;
    const sent = rm?.month === month ? Number(rm.count) || 0 : 0;
    if (sent >= TESTER_REPORT_CAP) return { status: 429, error: `You have sent the maximum of ${TESTER_REPORT_CAP} reports this month` };
    tx.set(testerRef, { reports: (Number(snap.data().reports) || 0) + 1, reportMonth: { month, count: sent + 1 } }, { merge: true });
    tx.set(db.collection('tester_reports').doc(), {
      email, plugin: idea ? null : b.plugin, os, daw, dawVersion: cleanText(b.dawVersion, 40), kind: b.kind, text, at: new Date().toISOString(),
    });
    return { status: 200, left: TESTER_REPORT_CAP - sent - 1 };
  });
  return out.status === 200 ? { status: 200, body: { ok: true, left: out.left } } : { status: out.status, body: { error: out.error } };
}
app.post('/api/testers/report', testerBody, async (req, res) => {
  const caller = await testerCaller(req, res);
  if (!caller) return;
  try {
    if (!(await testerRecord(caller, res, { activeOnly: true }))) return;
    const out = await sendReport(caller.admin.db, caller.email, req.body && typeof req.body === 'object' ? req.body : {});
    return res.status(out.status).json(out.body);
  } catch (err) {
    console.error('testers report:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});

// GET /api/testers/reports → this tester's own reports, newest first (up to 200).
app.get('/api/testers/reports', async (req, res) => {
  const caller = await testerCaller(req, res);
  if (!caller) return;
  try {
    if (!(await testerRecord(caller, res))) return;
    const snap = await withTimeout(caller.admin.db.collection('tester_reports').where('email', '==', caller.email).get(), 8000);
    const reports = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 200)
      .map(({ id, plugin, kind, os, daw, dawVersion, text, at }) => ({ id, plugin, kind, os, daw, dawVersion, text, at }));
    return res.json({ reports });
  } catch (err) {
    console.error('testers reports:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});

// The test area: builds assigned to this tester (tester_builds.assignedTo). Never lists other testers or the object path.
// `result` is this tester's own saved result for the build (or null). Manuals come without their bucket path: a file manual
// is fetched through the ticket route ({kind: 'test-build', buildId, manual: index}), a link manual carries its url.
const buildView = (id, b, result = null, key = null) => ({
  id, slug: b.slug, name: b.name, version: b.version, platform: b.platform, notes: b.notes || '', createdAt: b.createdAt, releasedAt: b.releasedAt || null,
  manuals: (b.manuals || []).map((m, index) => ({ title: m.title, index, url: m.url || null })),
  tasks: b.tasks || [],
  brief: { goal: b.brief?.goal || '', reference: b.brief?.reference || '', strengths: b.brief?.strengths || [], knownIssues: b.brief?.knownIssues || [], focus: b.brief?.focus || '' },
  licence: b.licence && key ? { product: b.licence.product, key: key.key, status: key.status } : null,
  result: result ? { tasks: result.tasks || {}, summary: result.summary || '', updatedAt: result.updatedAt || null } : null,
});
// GET /api/testers/builds → {builds:[{id, slug, name, version, platform, notes, createdAt, releasedAt}]}; active testers only
// (agreement 9.1: an ended tester gets no new builds).
app.get('/api/testers/builds', async (req, res) => {
  const caller = await testerCaller(req, res);
  if (!caller) return;
  try {
    const rec = await testerRecord(caller, res);
    if (!rec) return;
    if (rec.status !== 'active') return res.json({ builds: [] });
    const [snap, results] = await withTimeout(Promise.all([
      caller.admin.db.collection('tester_builds').get(),
      caller.admin.db.collection('tester_build_results').where('email', '==', caller.email).get(),
    ]), 8000);
    const mine = new Map(results.docs.map((d) => [d.data().buildId, d.data()]));
    const keys = await withTimeout(launch.testerKeysFor(caller.email), 8000);
    const builds = snap.docs.filter((d) => (d.data().assignedTo || []).includes(caller.email)).map((d) => buildView(d.id, d.data(), mine.get(d.id), keys[d.data().licence?.product]))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return res.json({ builds });
  } catch (err) {
    console.error('testers builds:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});

// Download ticket for a test build ({kind: 'test-build', buildId} on /api/download/ticket, called with a verified token).
// Allowed ONLY for the account the tester record is bound to, while ACTIVE, AND listed in the build's assignedTo.
async function testBuildTicket(admin, decoded, body, res) {
  try {
    const mail = launch2Email(decoded.email);
    const buildId = typeof body.buildId === 'string' && /^[A-Za-z0-9]{1,64}$/.test(body.buildId) ? body.buildId : null;
    if (!buildId) return res.status(400).json({ error: 'Invalid build' });
    const [own, buildSnap] = await withTimeout(Promise.all([
      testerOwn(admin, decoded),
      admin.db.collection('tester_builds').doc(buildId).get(),
    ]), 8000);
    if (!own || testerStatus(own) !== 'active') return res.status(403).json({ error: 'Test builds are for active testers' });
    const b = buildSnap.exists ? buildSnap.data() : null;
    if (!b || !(b.assignedTo || []).includes(mail)) return res.status(403).json({ error: 'This build is not assigned to you' });
    // A manual of the build goes through the same check: only an active tester the build is assigned to gets a ticket for it.
    let object = b.objectPath;
    if (body.manual !== undefined) {
      object = Number.isInteger(body.manual) ? (b.manuals || [])[body.manual]?.objectPath : null;
      if (!object) return res.status(404).json({ error: 'This manual is not available as a file' });
    }
    const name = String(object).split('/').pop();
    const ticket = ticketMake({ uid: decoded.uid, slug: b.slug, platform: b.platform, object, exp: Math.floor(Date.now() / 1000) + 300 });
    return res.json({ url: `/api/download/file?t=${encodeURIComponent(ticket)}`, name, version: b.version });
  } catch (err) { console.error('test build ticket:', err.message); return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Download service unavailable' }); }
}

// GET /api/admin/testers → every application, newest first (each with its tester record: status, agreement, owned), and
// how well the active testers cover the operating systems and DAWs.
app.get('/api/admin/testers', async (req, res) => {
  const caller = await testerCaller(req, res, { adminOnly: true });
  if (!caller) return;
  try {
    const { db } = caller.admin;
    const [apps, records, counter, agentTokens] = await withTimeout(Promise.all([db.collection('tester_applications').get(), db.collection('launch2_testers').get(), db.collection('launch2').doc('testers').get(), db.collection('tester_agent_tokens').get()]), 15000);
    const agentByMail = new Map(agentTokens.docs.map((d) => [d.data().email, { createdAt: d.data().createdAt, lastUsedAt: d.data().lastUsedAt || null }]));
    const byMail = new Map(records.docs.map((d) => [d.id, d.data()]));
    const applications = apps.docs.map((d) => {
      const r = byMail.get(d.id);
      return { email: d.id, ...d.data(), tester: r ? {
        status: testerStatus(r), agreementVersion: r.agreementVersion || null, agreementAcceptedAt: r.agreementAcceptedAt || null,
        displayName: r.displayName || '', production: r.production || '', agentToken: agentByMail.get(d.id) || null, bound: Boolean(r.uid), agreementVia: r.agreementVia || null, owned: r.owned || {}, endedAt: r.endedAt || null, revokedAt: r.revokedAt || null,
      } : null };
    }).sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
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

// POST /api/admin/testers/decide {email, decision: 'approve' | 'decline' | 'end' | 'revoke', agreementVersion?, acceptedAt?}
// approve: needs the agreement record (version like "1.1" and the ISO time the tester accepted it by e-mail) and is
//   refused without it; takes a seat in one transaction (refused at TESTER_CAP); approving an ended tester re-opens it,
//   approving a revoked one takes a seat again.
// decline: an approved tester's record is deleted and the seat given back (the old behaviour, for mistakes).
// end ("End testing"): status 'ended'. Credits, new builds and reports stop; released products and `owned` stay. Seat kept.
// revoke: status 'revoked'. All access gone, `owned` ignored, seat freed. Neither end nor revoke deletes anything.
app.post('/api/admin/testers/decide', smallBody, async (req, res) => {
  const caller = await testerCaller(req, res, { adminOnly: true });
  if (!caller) return;
  const email = launch2Email(req.body?.email);
  const decision = req.body?.decision;
  if (!email || !['approve', 'decline', 'end', 'revoke'].includes(decision)) return res.status(400).json({ error: 'Send an e-mail and a decision (approve, decline, end or revoke)' });
  let agreement = null;
  if (decision === 'approve') {
    const version = typeof req.body.agreementVersion === 'string' ? req.body.agreementVersion.trim() : '';
    const acceptedMs = Date.parse(req.body.acceptedAt);
    if (!AGREEMENT_VERSION.test(version) || typeof req.body.acceptedAt !== 'string' || Number.isNaN(acceptedMs) || acceptedMs > Date.now() + 86400000) {
      return res.status(400).json({ error: 'Approval needs the agreement version (like 1.1) and the date and time the tester accepted it' });
    }
    agreement = { agreementVersion: version, agreementAcceptedAt: new Date(acceptedMs).toISOString(), agreementVia: 'email' };
  }
  try {
    const out = await decideTester(caller.admin.db, email, decision, agreement);
    return out.status === 200 ? res.json({ ok: true, result: out.result, approved: out.approved }) : res.status(out.status).json({ error: out.error });
  } catch (err) {
    console.error('admin testers decide:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});
// The decision itself (shared by /decide and /invite): the transaction over the application, the tester record and the
// seat counter, then the key and agent-token clean-up a revoke needs.
async function decideTester(db, email, decision, agreement) {
    const appRef = db.collection('tester_applications').doc(email);
    const testerRef = db.collection('launch2_testers').doc(email);
    const counterRef = db.collection('launch2').doc('testers');
    const out = await db.runTransaction(async (tx) => {
      const [appSnap, testerSnap, counterSnap] = await Promise.all([tx.get(appRef), tx.get(testerRef), tx.get(counterRef)]);
      if (!appSnap.exists) return { status: 404, error: 'No application from this e-mail' };
      const approved = counterSnap.exists ? Number(counterSnap.data().approved) || 0 : 0;
      const now = new Date().toISOString();
      const before = testerSnap.exists ? testerStatus(testerSnap.data()) : null;
      if (decision === 'approve') {
        if (before === 'active') return { status: 200, result: 'already-approved', approved };
        const needsSeat = before === null || before === 'revoked';
        if (needsSeat && approved >= TESTER_CAP) return { status: 409, error: `All ${TESTER_CAP} tester seats are taken` };
        const a = appSnap.data();
        if (before === null) tx.set(testerRef, { email, approvedAt: now, os: a.os || null, daws: a.daws || [], reports: 0, status: 'active', displayName: '', production: a.production || '', uid: a.uid || null, ...agreement });
        else tx.set(testerRef, { status: 'active', ...agreement, reactivatedAt: now }, { merge: true });
        if (needsSeat) tx.set(counterRef, { approved: approved + 1 }, { merge: true });
        tx.set(appRef, { status: 'approved', decidedAt: now }, { merge: true });
        return { status: 200, result: 'approved', approved: approved + (needsSeat ? 1 : 0) };
      }
      if (decision === 'end' || decision === 'revoke') {
        if (before === null) return { status: 409, error: 'This e-mail is not an approved tester' };
        if (decision === 'end' && before !== 'active') return { status: 409, error: `This tester is already ${before}` };
        if (decision === 'revoke' && before === 'revoked') return { status: 200, result: 'already-revoked', approved };
        const freed = decision === 'revoke' ? 1 : 0; // a revoked tester gives its seat back (an ended one keeps it)
        tx.set(testerRef, decision === 'end' ? { status: 'ended', endedAt: now } : { status: 'revoked', revokedAt: now }, { merge: true });
        if (freed) tx.set(counterRef, { approved: Math.max(0, approved - 1) }, { merge: true });
        tx.set(appRef, { status: decision === 'end' ? 'ended' : 'revoked', decidedAt: now }, { merge: true });
        return { status: 200, result: decision === 'end' ? 'ended' : 'revoked', approved: Math.max(0, approved - freed) };
      }
      // A revoked tester's seat was already given back.
      const frees = testerSnap.exists && before !== 'revoked';
      if (testerSnap.exists) tx.delete(testerRef);
      if (frees) tx.set(counterRef, { approved: Math.max(0, approved - 1) }, { merge: true });
      tx.set(appRef, { status: 'declined', decidedAt: now }, { merge: true });
      return { status: 200, result: 'declined', approved: frees ? Math.max(0, approved - 1) : approved };
    });
    // Revoke closes every key of the tester (also on a repeat, so a half-done revoke can be finished). End testing leaves them.
    if (out.status === 200 && (out.result === 'revoked' || out.result === 'already-revoked')) await withTimeout(launch.setTesterKeyStatus({ email, status: 'disabled' }), 8000);
    if (out.status === 200 && (out.result === 'revoked' || out.result === 'already-revoked')) await withTimeout(deleteAgentTokens(db, email), 8000);
  return out;
}

// POST /api/admin/testers/invite {email, os, daws?, osVersion?, formats?, production?, agreementVersion, acceptedAt}
// (owner 31 Oct: testers are taken on from the panel, by a person or an agent, without an application form): writes the
// application the owner would otherwise wait for (status 'invited', source 'invite') and approves it in the same breath,
// under the same seat cap and agreement rules as /decide. An address that already applied is approved as it is.
app.post('/api/admin/testers/invite', smallBody, async (req, res) => {
  const caller = await testerCaller(req, res, { adminOnly: true });
  if (!caller) return;
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const email = launch2Email(b.email);
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Send the tester\'s e-mail address' });
  const os = TESTER_OS.includes(b.os) ? b.os : null;
  if (!os) return res.status(400).json({ error: `Operating system: one of ${TESTER_OS.join(', ')}` });
  const daws = (Array.isArray(b.daws) ? b.daws : String(b.daws || '').split(',')).map((d) => String(d).trim()).filter((d) => TESTER_DAWS.includes(d)).slice(0, 9);
  const version = typeof b.agreementVersion === 'string' ? b.agreementVersion.trim() : '';
  const acceptedMs = Date.parse(b.acceptedAt);
  if (!AGREEMENT_VERSION.test(version) || Number.isNaN(acceptedMs) || acceptedMs > Date.now() + 86400000) {
    return res.status(400).json({ error: 'Approval needs the agreement version (like 1.1) and the date and time the tester accepted it' });
  }
  const agreement = { agreementVersion: version, agreementAcceptedAt: new Date(acceptedMs).toISOString(), agreementVia: 'email' };
  try {
    const { db } = caller.admin;
    const appRef = db.collection('tester_applications').doc(email);
    const existing = await withTimeout(appRef.get(), 8000);
    if (!existing.exists) {
      await withTimeout(appRef.set({
        at: new Date().toISOString(), os, osVersion: String(b.osVersion || '').slice(0, 60), formats: Array.isArray(b.formats) ? b.formats.map(String).slice(0, 4) : os.startsWith('Windows') ? ['VST3'] : ['VST3', 'AU'],
        daws, dawOther: '', years: null, link: String(b.link || '').slice(0, 200), answer: '', heard: '', production: String(b.production || '').slice(0, 200),
        status: 'invited', source: 'invite', invitedBy: caller.agent ? caller.agent.email : String(caller.decoded.email || ''),
      }), 8000);
    }
    const out = await decideTester(db, email, 'approve', agreement);
    return out.status === 200 ? res.json({ ok: true, result: out.result, approved: out.approved, invited: !existing.exists }) : res.status(out.status).json({ error: out.error });
  } catch (err) {
    console.error('admin testers invite:', err.message);
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

// ---- Test builds (admin). Same guard as /api/admin/testers. ---------------------------------------------------------
// GET /api/admin/testers/builds → {builds:[{id, slug, name, version, platform, objectPath, notes, assignedTo, manuals, tasks, brief, licence, keys, createdAt, releasedAt}]}
app.get('/api/admin/testers/builds', async (req, res) => {
  const caller = await testerCaller(req, res, { adminOnly: true });
  if (!caller) return;
  try {
    const snap = await withTimeout(caller.admin.db.collection('tester_builds').get(), 15000);
    // Each build with a licence also lists the keys of its assigned testers: [{email, key, status}].
    const keysByProduct = {};
    for (const product of launch.testerProducts) keysByProduct[product] = await withTimeout(launch.testerKeysOfProduct(product), 15000);
    const builds = snap.docs.map((d) => {
      const b = { id: d.id, ...d.data() };
      return { ...b, keys: b.licence ? (keysByProduct[b.licence.product] || []).filter((k) => (b.assignedTo || []).includes(k.email)) : [] };
    }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return res.json({ builds });
  } catch (err) {
    console.error('admin tester builds:', err.message);
    return res.status(503).json({ error: 'Tester service unavailable' });
  }
});

// Size and checksum recorded after an upload (see the uploads routes below); optional, kept as sent when well formed.
const fileInfo = (o) => ({
  ...(Number.isInteger(o?.size) && o.size >= 0 ? { size: o.size } : {}),
  ...(typeof o?.sha256 === 'string' && /^[0-9a-f]{64}$/.test(o.sha256) ? { sha256: o.sha256 } : {}),
});
const PRODUCT_IDS_TESTER = { seda: 9021, adalet: 9022 }; // = launchLicence.js PRODUCT_IDS; test-testers.js checks they agree
const validObjectPath = (p) => typeof p === 'string' && p.length > 0 && p.length <= 300 && !p.startsWith('/') && !p.split('/').some((part) => !part || part === '..' || part === '.');
// Every field is checked and clamped here. `assignedTo`: lower-case e-mails, at most TESTER_CAP of them.
function readBuild(body) {
  const b = body && typeof body === 'object' ? body : {};
  const slug = cleanText(b.slug, 40).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(slug)) return { error: 'The product slug is a short lower-case name like "koro"' };
  const name = cleanText(b.name, 80);
  if (!name) return { error: 'Name the build' };
  const version = cleanText(b.version, 40);
  if (!version) return { error: 'Enter the build version' };
  if (!['mac', 'win'].includes(b.platform)) return { error: 'Choose macOS or Windows' };
  const objectPath = typeof b.objectPath === 'string' ? b.objectPath.trim() : '';
  if (!validObjectPath(objectPath)) return { error: 'The object path is the file\'s path in the downloads bucket, like testbuilds/koro/0.9.1/Koro-mac.pkg' };
  // Manuals: a file in the bucket (downloaded through the ticket check) or an https link.
  const manuals = [];
  for (const m of (Array.isArray(b.manuals) ? b.manuals : []).slice(0, 10)) {
    const title = cleanText(m?.title, 80);
    const url = typeof m?.url === 'string' ? m.url.trim() : '';
    const path = typeof m?.objectPath === 'string' ? m.objectPath.trim() : '';
    if (!title) return { error: 'Name every manual' };
    if (url) {
      try { if (new URL(url).protocol !== 'https:' || url.length > 300) throw new Error('scheme'); } catch { return { error: 'A manual link must start with https://' }; }
      manuals.push({ title, url });
    } else if (validObjectPath(path)) manuals.push({ title, objectPath: path, ...fileInfo(m) });
    else return { error: `The manual "${title}" needs an https link or a file path in the downloads bucket` };
  }
  // Tasks: what we ask the tester to try before release. An id is kept across edits so saved results keep their task.
  const tasks = [];
  for (const t of (Array.isArray(b.tasks) ? b.tasks : []).slice(0, 30)) {
    const title = cleanText(t?.title, 120);
    if (!title) return { error: 'Give every task a title' };
    let id = typeof t?.id === 'string' && /^[a-z0-9]{1,12}$/.test(t.id) ? t.id : '';
    while (!id || tasks.some((x) => x.id === id)) id = randomBytes(4).toString('hex');
    tasks.push({ id, title, detail: cleanParagraph(t?.detail, 600) });
  }
  const assignedTo = [...new Set((Array.isArray(b.assignedTo) ? b.assignedTo : []).map(launch2Email).filter((e) => e && e.includes('@')))];
  if (assignedTo.length > TESTER_CAP) return { error: `At most ${TESTER_CAP} testers per build` };
  // strengths / knownIssues: short lines (an array of strings, or one text with a line per item), at most 12 of 240 characters.
  const lines = (v) => (Array.isArray(v) ? v : typeof v === 'string' ? v.split(/\r?\n/) : []).map((l) => cleanText(l, 240)).filter(Boolean).slice(0, 12);
  const brief = { goal: cleanParagraph(b.brief?.goal, 1500), reference: cleanParagraph(b.brief?.reference, 1500), strengths: lines(b.brief?.strengths), knownIssues: lines(b.brief?.knownIssues), focus: cleanParagraph(b.brief?.focus, 1500) };
  const product = b.licence?.product || '';
  if (product && !launch.testerProducts.includes(product)) return { error: 'The licence product is none, seda or adalet' };
  const licence = product ? { product, productId: PRODUCT_IDS_TESTER[product] } : null;
  return { value: { slug, name, version, platform: b.platform, objectPath, ...fileInfo(b), notes: cleanParagraph(b.notes, 2000), assignedTo, manuals, tasks, brief, licence } };
}

// Releasing a build (or assigning a tester to an already released one) records the product as the tester's for good:
// launch2_testers/{e-mail}.owned[slug] = 'YYYY-MM-DD' (agreement 9.1). Testers without a record are skipped. Reads first.
async function grantOwned(tx, db, build, emails, day) {
  const snaps = await Promise.all(emails.map((e) => tx.get(db.collection('launch2_testers').doc(e))));
  let granted = 0;
  snaps.forEach((snap, i) => {
    if (!snap.exists || snap.data().owned?.[build.slug]) return;
    tx.set(db.collection('launch2_testers').doc(emails[i]), { owned: { [build.slug]: day } }, { merge: true });
    granted += 1;
  });
  return granted;
}

// ---- Admin upload of test builds and manuals straight into the private downloads bucket -------------------------------
// POST /api/admin/testers/uploads {kind: 'installer' | 'manual', filename, buildId?} → {uploadUrl, headers, objectPath, expiresIn}
//   A short-lived V4 signed URL for ONE PUT into test-builds/{buildId or a fresh id}/{filename}. The content type is fixed by the
//   extension (installers .pkg .zip .dmg, manuals .pdf) and signed, and the size limit (installer 1.5 GB, manual 50 MB) is signed as
//   x-goog-content-length-range, so the browser must send exactly the returned `headers`. Nothing under plugins/ can be written.
// POST /api/admin/testers/uploads/complete {objectPath} → {objectPath, size, sha256 | null, md5}
//   Reads the object back: size and md5 from its metadata, sha256 by streaming when the file is a manual (installers are large, so
//   size and md5 only). The build form stores size + sha256 with the build; the file stays private and is only handed out through
//   the ticket routes.
const UPLOAD_KINDS = {
  installer: { types: { '.pkg': 'application/octet-stream', '.zip': 'application/zip', '.dmg': 'application/x-apple-diskimage' }, max: 1.5 * 1024 * 1024 * 1024 },
  manual: { types: { '.pdf': 'application/pdf' }, max: 50 * 1024 * 1024 },
};
const UPLOAD_URL_SECONDS = 15 * 60;
const TEST_BUILD_PREFIX = 'test-builds/';
const uploadExt = (name) => (String(name).toLowerCase().match(/\.[a-z0-9]+$/) || [''])[0];
const uploadKindOf = (objectPath) => Object.keys(UPLOAD_KINDS).find((k) => uploadExt(objectPath) in UPLOAD_KINDS[k].types);
app.post('/api/admin/testers/uploads', smallBody, async (req, res) => {
  const caller = await testerCaller(req, res, { adminOnly: true });
  if (!caller) return;
  const kind = UPLOAD_KINDS[req.body?.kind];
  if (!kind) return res.status(400).json({ error: 'kind is installer or manual' });
  const safe = String(req.body?.filename || '').split(/[\\/]/).pop().replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[.-]+/, '').slice(-120);
  const ext = uploadExt(safe);
  if (!safe || !(ext in kind.types)) return res.status(400).json({ error: `Allowed file types for this upload: ${Object.keys(kind.types).join(', ')}` });
  const given = typeof req.body?.buildId === 'string' && /^[A-Za-z0-9]{1,64}$/.test(req.body.buildId) ? req.body.buildId : null;
  const folder = given || randomBytes(8).toString('hex');
  const objectPath = `${TEST_BUILD_PREFIX}${folder}/${safe}`;
  const contentType = kind.types[ext];
  const headers = { 'Content-Type': contentType, 'x-goog-content-length-range': `0,${kind.max}` };
  try {
    const storage = await downloadStorage();
    const [uploadUrl] = await withTimeout(storage.bucket('subverselab-downloads').file(objectPath).getSignedUrl({
      version: 'v4', action: 'write', expires: Date.now() + UPLOAD_URL_SECONDS * 1000, contentType, extensionHeaders: { 'x-goog-content-length-range': headers['x-goog-content-length-range'] },
    }), 10000);
    return res.json({ uploadUrl, headers, objectPath, expiresIn: UPLOAD_URL_SECONDS, maxBytes: kind.max });
  } catch (err) {
    console.error('admin tester upload url:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'The upload address could not be made right now' });
  }
});
app.post('/api/admin/testers/uploads/complete', smallBody, async (req, res) => {
  const caller = await testerCaller(req, res, { adminOnly: true });
  if (!caller) return;
  const objectPath = typeof req.body?.objectPath === 'string' ? req.body.objectPath : '';
  const kindName = uploadKindOf(objectPath);
  if (!objectPath.startsWith(TEST_BUILD_PREFIX) || !validObjectPath(objectPath) || !kindName) return res.status(400).json({ error: 'That is not an uploaded test build file' });
  try {
    const storage = await downloadStorage();
    const file = storage.bucket('subverselab-downloads').file(objectPath);
    const [meta] = await withTimeout(file.getMetadata(), 10000);
    const size = Number(meta.size);
    if (!Number.isFinite(size) || size <= 0) return res.status(404).json({ error: 'No file arrived at that path yet' });
    if (size > UPLOAD_KINDS[kindName].max) return res.status(413).json({ error: 'The file is larger than allowed' });
    let sha256 = null;
    if (kindName === 'manual') {
      const hash = createHash('sha256');
      await withTimeout(new Promise((resolveHash, rejectHash) => file.createReadStream().on('data', (c) => hash.update(c)).on('end', resolveHash).on('error', rejectHash)), 60000);
      sha256 = hash.digest('hex');
    }
    return res.json({ objectPath, size, sha256, md5: meta.md5Hash || null });
  } catch (err) {
    console.error('admin tester upload complete:', err.message);
    return res.status(serviceDown(err) ? 503 : 404).json({ error: 'No file arrived at that path yet' });
  }
});

// POST /api/admin/testers/builds {id?, slug, name, version, platform, objectPath, notes, assignedTo}
// Creates a build, or edits the one named by id (an edit never changes releasedAt). → {ok, id}
app.post('/api/admin/testers/builds', testerBody, async (req, res) => {
  const caller = await testerCaller(req, res, { adminOnly: true });
  if (!caller) return;
  const { value, error } = readBuild(req.body);
  if (error) return res.status(400).json({ error });
  const id = typeof req.body?.id === 'string' && /^[A-Za-z0-9]{1,64}$/.test(req.body.id) ? req.body.id : null;
  try {
    const { db } = caller.admin;
    const ref = id ? db.collection('tester_builds').doc(id) : db.collection('tester_builds').doc();
    const out = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (id && !snap.exists) return { status: 404, error: 'No such build' };
      const old = snap.exists ? snap.data() : null;
      const next = { ...value, createdAt: old?.createdAt || new Date().toISOString(), releasedAt: old?.releasedAt || null };
      // A released build keeps its product record: whoever is assigned later gets it too.
      if (next.releasedAt) await grantOwned(tx, db, next, next.assignedTo, next.releasedAt.slice(0, 10));
      tx.set(ref, next);
      return { status: 200, id: ref.id };
    });
    if (out.status !== 200) return res.status(out.status).json({ error: out.error });
    // A build with a licence: every assigned tester that has a (not revoked) tester record gets its ONE key for the product.
    // Idempotent, so saving the build again never mints a second key.
    let issued = 0;
    if (value.licence) {
      for (const email of value.assignedTo) {
        const rec = await withTimeout(db.collection('launch2_testers').doc(email).get(), 8000);
        if (!rec.exists || testerStatus(rec.data()) === 'revoked') continue;
        if ((await withTimeout(launch.issueTesterKey({ email, product: value.licence.product }), 8000)).created) issued += 1;
      }
    }
    return res.json({ ok: true, id: out.id, keysIssued: issued });
  } catch (err) {
    console.error('admin tester build save:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});

// POST /api/admin/testers/keys {email, product, status: 'disabled' | 'active'} → {ok, changed}
// "Disable key" / "Enable key" for one tester's key of one product. validate then answers disabled / valid.
app.post('/api/admin/testers/keys', smallBody, async (req, res) => {
  const caller = await testerCaller(req, res, { adminOnly: true });
  if (!caller) return;
  const email = launch2Email(req.body?.email);
  const { product, status } = req.body || {};
  if (!email || !launch.testerProducts.includes(product) || !['disabled', 'active'].includes(status)) return res.status(400).json({ error: 'Send an e-mail, a product (seda or adalet) and a status (disabled or active)' });
  try {
    const rec = await withTimeout(caller.admin.db.collection('launch2_testers').doc(email).get(), 8000);
    // A revoked tester's keys stay closed: enabling one needs the tester re-approved first.
    if (status === 'active' && rec.exists && testerStatus(rec.data()) === 'revoked') return res.status(409).json({ error: 'This tester is revoked; re-open the tester first' });
    return res.json({ ok: true, changed: await withTimeout(launch.setTesterKeyStatus({ email, product, status }), 8000) });
  } catch (err) {
    console.error('admin tester keys:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});

// POST /api/admin/testers/builds/release {id}  The product of this build is released: releasedAt is set and every
// assigned tester gets owned[slug] (it survives "End testing", not "Revoke"). Idempotent. → {ok, releasedAt, granted}
app.post('/api/admin/testers/builds/release', smallBody, async (req, res) => {
  const caller = await testerCaller(req, res, { adminOnly: true });
  if (!caller) return;
  const id = typeof req.body?.id === 'string' && /^[A-Za-z0-9]{1,64}$/.test(req.body.id) ? req.body.id : null;
  if (!id) return res.status(400).json({ error: 'Send the build id' });
  try {
    const { db } = caller.admin;
    const ref = db.collection('tester_builds').doc(id);
    const out = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return { status: 404, error: 'No such build' };
      const b = snap.data();
      const releasedAt = b.releasedAt || new Date().toISOString();
      const granted = await grantOwned(tx, db, b, b.assignedTo || [], releasedAt.slice(0, 10));
      if (!b.releasedAt) tx.set(ref, { releasedAt }, { merge: true });
      return { status: 200, releasedAt, granted };
    });
    return out.status === 200 ? res.json({ ok: true, releasedAt: out.releasedAt, granted: out.granted }) : res.status(out.status).json({ error: out.error });
  } catch (err) {
    console.error('admin tester build release:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});

// POST /api/testers/builds/result {buildId, tasks: {taskId: {status: 'todo' | 'done' | 'problem', note}}, summary}
// The tester's results for one build, in plain words (screenshots are welcome, never required). Active testers the build is
// assigned to only; saving again replaces the earlier result. Tasks that are not on the build are ignored.
// Saves one tester's results for one build: → {status, body}. `byRef`: the keys of b.tasks may also be the stable refs T1, T2…
// (the order of the build's tasks); `merge`: keep what is already saved for tasks / summary the request does not mention
// (an agent may send one task at a time). Task ids that are not on the build are reported in `unknown`, never saved.
async function saveBuildResult(db, email, b, { byRef = false, merge = false } = {}) {
  const buildId = typeof b.buildId === 'string' && /^[A-Za-z0-9]{1,64}$/.test(b.buildId) ? b.buildId : null;
  if (!buildId) return { status: 400, body: { error: 'Invalid build' } };
  const build = await withTimeout(db.collection('tester_builds').doc(buildId).get(), 8000);
  if (!build.exists || !(build.data().assignedTo || []).includes(email)) return { status: 403, body: { error: 'This build is not assigned to you' } };
  const buildTasks = build.data().tasks || [];
  const given = b.tasks && typeof b.tasks === 'object' ? b.tasks : {};
  const idOf = (key) => buildTasks.find((t, i) => t.id === key || (byRef && String(key).toUpperCase() === `T${i + 1}`))?.id;
  const resultRef = db.collection('tester_build_results').doc(`${buildId}_${email}`);
  const old = merge ? (await withTimeout(resultRef.get(), 8000)) : null;
  const tasks = merge && old.exists ? { ...(old.data().tasks || {}) } : {};
  const unknown = [];
  for (const [key, g] of Object.entries(given)) {
    const id = idOf(key);
    if (!id) { unknown.push(key); continue; }
    const status = g?.status === 'not-started' ? 'todo' : g?.status;
    if (!BUILD_STATUSES.includes(status)) return { status: 400, body: { error: 'Choose not started, done or problem found for each task' } };
    tasks[id] = { status, note: cleanParagraph(g.note, 1500) };
  }
  const summary = merge && typeof b.summary !== 'string' ? (old.exists ? old.data().summary || '' : '') : cleanParagraph(b.summary, 4000);
  await withTimeout(resultRef.set({ buildId, email, tasks, summary, updatedAt: new Date().toISOString() }), 8000);
  return { status: 200, body: { ok: true, ...(unknown.length ? { unknown } : {}) } };
}
app.post('/api/testers/builds/result', testerBody, async (req, res) => {
  const caller = await testerCaller(req, res);
  if (!caller) return;
  try {
    if (!(await testerRecord(caller, res, { activeOnly: true }))) return;
    const out = await saveBuildResult(caller.admin.db, caller.email, req.body && typeof req.body === 'object' ? req.body : {});
    return res.status(out.status).json(out.body);
  } catch (err) {
    console.error('testers build result:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});

// GET /api/admin/testers/builds/results?id=<buildId> → every tester's results for that build.
app.get('/api/admin/testers/builds/results', async (req, res) => {
  const caller = await testerCaller(req, res, { adminOnly: true });
  if (!caller) return;
  const id = typeof req.query?.id === 'string' && /^[A-Za-z0-9]{1,64}$/.test(req.query.id) ? req.query.id : null;
  if (!id) return res.status(400).json({ error: 'Send the build id' });
  try {
    const snap = await withTimeout(caller.admin.db.collection('tester_build_results').where('buildId', '==', id).get(), 15000);
    return res.json({ results: snap.docs.map((d) => d.data()).sort((a, b) => String(a.email).localeCompare(String(b.email))) });
  } catch (err) {
    console.error('admin tester build results:', err.message);
    return res.status(503).json({ error: 'Tester service unavailable' });
  }
});

// POST /api/admin/testers/profile {email, displayName, production} → the name the panel greets a tester with (both optional, may be empty).
app.post('/api/admin/testers/profile', smallBody, async (req, res) => {
  const caller = await testerCaller(req, res, { adminOnly: true });
  if (!caller) return;
  const email = launch2Email(req.body?.email);
  if (!email) return res.status(400).json({ error: 'Send an e-mail' });
  try {
    const ref = caller.admin.db.collection('launch2_testers').doc(email);
    if (!(await withTimeout(ref.get(), 8000)).exists) return res.status(404).json({ error: 'This e-mail is not an approved tester' });
    await withTimeout(ref.set({ displayName: cleanText(req.body?.displayName, 60), production: cleanText(req.body?.production, 80) }, { merge: true }), 8000);
    return res.json({ ok: true });
  } catch (err) {
    console.error('admin tester profile:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});

// POST /api/admin/testers/uid {email, clear: true} → unbinds the tester record from its account (a tester who moves to a new
// account); the agent key is closed too. A proven account with that e-mail then binds itself on its first tester request.
// {email, bind: true} → binds the record to the Firebase account that holds this e-mail now (audit F4: the way an unproven
// password account is bound; the admin has checked who it is). 404 when no account has the address.
app.post('/api/admin/testers/uid', smallBody, async (req, res) => {
  const caller = await testerCaller(req, res, { adminOnly: true });
  if (!caller) return;
  const email = launch2Email(req.body?.email);
  const bind = req.body?.bind === true;
  if (!email || (req.body?.clear !== true && !bind)) return res.status(400).json({ error: 'Send an e-mail and clear: true or bind: true' });
  try {
    const { db } = caller.admin;
    const ref = db.collection('launch2_testers').doc(email);
    if (!(await withTimeout(ref.get(), 8000)).exists) return res.status(404).json({ error: 'This e-mail is not an approved tester' });
    if (bind) {
      const user = await withTimeout(caller.admin.auth.getUserByEmail(email), 8000).catch(() => null);
      if (!user?.uid) return res.status(404).json({ error: 'No account signs in with this e-mail yet' });
      await withTimeout(ref.set({ uid: user.uid }, { merge: true }), 8000);
      return res.json({ ok: true, bound: true });
    }
    await withTimeout(ref.set({ uid: null }, { merge: true }), 8000);
    await withTimeout(deleteAgentTokens(db, email), 8000);
    return res.json({ ok: true });
  } catch (err) {
    console.error('admin tester unbind:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});

// ---- Messages: the thread between a tester and SubverseLab, inside the panel (nothing is e-mailed). --------------------
// tester_messages/{id} {email, from: 'tester' | 'staff', kind, body, at, read}; `read` = the recipient has opened it.
const MESSAGE_KINDS = ['message', 'panel'];
// How many messages from `from` this tester's thread holds that the other side has not read.
async function unreadFor(db, email, from) {
  const snap = await db.collection('tester_messages').where('email', '==', email).get();
  return snap.docs.filter((d) => d.data().from === from && d.data().read !== true).length;
}
const threadOf = async (db, email) => (await db.collection('tester_messages').where('email', '==', email).get()).docs
  .map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.at).localeCompare(String(b.at))).slice(-200);
// Message caps per tester (the panel and the agent routes share them): MESSAGE_PER_HOUR in any hour, MESSAGE_PER_DAY in any day.
const MESSAGE_PER_HOUR = 30;
const MESSAGE_PER_DAY = 200;
// → null when the tester may write, else the error text for a 429.
async function messageLimitError(db, email) {
  const snap = await db.collection('tester_messages').where('email', '==', email).get();
  const mine = snap.docs.map((d) => d.data()).filter((m) => m.from === 'tester').map((m) => Date.parse(m.at)).filter(Number.isFinite);
  const now = Date.now();
  if (mine.filter((t) => t > now - 3600000).length >= MESSAGE_PER_HOUR) return `You have sent ${MESSAGE_PER_HOUR} messages in the last hour. Please wait a little before writing again.`;
  if (mine.filter((t) => t > now - 86400000).length >= MESSAGE_PER_DAY) return `You have sent ${MESSAGE_PER_DAY} messages in the last 24 hours. Please try again tomorrow.`;
  return null;
}
const messageView = ({ id, from, kind, body, at, read }) => ({ id, from, kind, body, at, read: read === true });

// GET /api/testers/messages → {messages: [oldest first, up to 200], unread: staff messages not yet opened}. Any tester but a revoked one.
app.get('/api/testers/messages', async (req, res) => {
  const caller = await testerCaller(req, res);
  if (!caller) return;
  try {
    if (!(await testerRecord(caller, res))) return;
    const messages = await withTimeout(threadOf(caller.admin.db, caller.email), 8000);
    return res.json({ messages: messages.map(messageView), unread: messages.filter((m) => m.from === 'staff' && m.read !== true).length });
  } catch (err) {
    console.error('testers messages:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});

// POST /api/testers/messages {body, kind?: 'message' | 'panel'} → writes to this tester's own thread only.
app.post('/api/testers/messages', testerBody, async (req, res) => {
  const caller = await testerCaller(req, res);
  if (!caller) return;
  const body = cleanParagraph(req.body?.body, 2000);
  const kind = MESSAGE_KINDS.includes(req.body?.kind) ? req.body.kind : 'message';
  if (body.length < 2) return res.status(400).json({ error: 'Write your message first' });
  try {
    if (!(await testerRecord(caller, res))) return;
    const limited = await withTimeout(messageLimitError(caller.admin.db, caller.email), 8000);
    if (limited) return res.status(429).json({ error: limited });
    await withTimeout(caller.admin.db.collection('tester_messages').doc().set({ email: caller.email, from: 'tester', kind, body, at: new Date().toISOString(), read: false }), 8000);
    return res.json({ ok: true });
  } catch (err) {
    console.error('testers message send:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});

// POST /api/testers/messages/read → marks the staff messages of this tester's own thread as read.
app.post('/api/testers/messages/read', testerBody, async (req, res) => {
  const caller = await testerCaller(req, res);
  if (!caller) return;
  try {
    if (!(await testerRecord(caller, res))) return;
    const snap = await withTimeout(caller.admin.db.collection('tester_messages').where('email', '==', caller.email).get(), 8000);
    let changed = 0;
    for (const d of snap.docs) if (d.data().from === 'staff' && d.data().read !== true) { await d.ref.set({ read: true }, { merge: true }); changed += 1; }
    return res.json({ ok: true, changed });
  } catch (err) {
    console.error('testers messages read:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});

// GET /api/admin/testers/messages → {threads: [{email, displayName, production, last, unread}] newest first, unread: total}
// GET /api/admin/testers/messages?email=<e-mail> → {messages: that tester's whole thread}
app.get('/api/admin/testers/messages', async (req, res) => {
  const caller = await testerCaller(req, res, { adminOnly: true });
  if (!caller) return;
  try {
    const { db } = caller.admin;
    const one = launch2Email(req.query?.email);
    if (req.query?.email) {
      if (!one) return res.status(400).json({ error: 'Send an e-mail' });
      return res.json({ messages: (await withTimeout(threadOf(db, one), 15000)).map(messageView) });
    }
    const snap = await withTimeout(db.collection('tester_messages').get(), 15000);
    const byMail = new Map();
    for (const d of snap.docs) {
      const m = d.data();
      const t = byMail.get(m.email) || { email: m.email, last: null, unread: 0 };
      if (!t.last || String(m.at) > String(t.last.at)) t.last = { from: m.from, body: String(m.body).slice(0, 140), at: m.at };
      if (m.from === 'tester' && m.read !== true) t.unread += 1;
      byMail.set(m.email, t);
    }
    const threads = [...byMail.values()].sort((a, b) => String(b.last.at).localeCompare(String(a.last.at)));
    return res.json({ threads, unread: threads.reduce((n, t) => n + t.unread, 0) });
  } catch (err) {
    console.error('admin tester messages:', err.message);
    return res.status(503).json({ error: 'Tester service unavailable' });
  }
});

// POST /api/admin/testers/messages/reply {email, body} and POST /api/admin/testers/messages/read {email} (the tester's messages are read).
app.post('/api/admin/testers/messages/reply', testerBody, async (req, res) => {
  const caller = await testerCaller(req, res, { adminOnly: true });
  if (!caller) return;
  const email = launch2Email(req.body?.email);
  const body = cleanParagraph(req.body?.body, 2000);
  if (!email || body.length < 2) return res.status(400).json({ error: 'Send an e-mail and a message' });
  try {
    const { db } = caller.admin;
    if (!(await withTimeout(db.collection('launch2_testers').doc(email).get(), 8000)).exists) return res.status(404).json({ error: 'This e-mail is not a tester' });
    await withTimeout(db.collection('tester_messages').doc().set({ email, from: 'staff', kind: 'message', body, at: new Date().toISOString(), read: false }), 8000);
    return res.json({ ok: true });
  } catch (err) {
    console.error('admin tester reply:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});
app.post('/api/admin/testers/messages/read', testerBody, async (req, res) => {
  const caller = await testerCaller(req, res, { adminOnly: true });
  if (!caller) return;
  const email = launch2Email(req.body?.email);
  if (!email) return res.status(400).json({ error: 'Send an e-mail' });
  try {
    const snap = await withTimeout(caller.admin.db.collection('tester_messages').where('email', '==', email).get(), 15000);
    let changed = 0;
    for (const d of snap.docs) if (d.data().from === 'tester' && d.data().read !== true) { await d.ref.set({ read: true }, { merge: true }); changed += 1; }
    return res.json({ ok: true, changed });
  } catch (err) {
    console.error('admin tester messages read:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});

// GET /api/testers/agreement?v=1.1 → the agreement text (tester-agreements/v{version}.html) for a tester who is not revoked.
// It is served to signed-in testers only; the page opens it from the panel.
app.get('/api/testers/agreement', async (req, res) => {
  const caller = await testerCaller(req, res);
  if (!caller) return;
  const v = String(req.query?.v || '');
  const file = join(__dirname, 'tester-agreements', `v${v}.html`);
  try {
    if (!(await testerRecord(caller, res))) return;
    if (!AGREEMENT_VERSION.test(v) || !existsSync(file)) return res.status(404).json({ error: 'Agreement text not found' });
    return res.type('html').send(readFileSync(file, 'utf8'));
  } catch (err) {
    console.error('testers agreement:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});

// ---- Personal agent key: lets a tester's reading / writing assistant (a custom GPT action or another agent that can call web APIs)
// read the test tasks and write results. tester_agent_tokens/{sha256 of the token} {email, createdAt, lastUsedAt}: only the hash
// is stored, the token ("svlt_" + 48 hex) is shown once. One token per tester (creating a new one replaces the old). The token works
// ONLY on /api/testers/agent/* below and only while the tester is ACTIVE: no account, credits, licence keys, downloads, manual
// tickets or bucket paths go through it. Ended / revoked testers get 403; Revoke also deletes the token.
const AGENT_TOKEN = /^svlt_[0-9a-f]{48}$/;
const agentIpLimit = tokenBucket({ perMinute: 60 });
const agentLimit = tokenBucket({ perMinute: 30 }); // per token
const hashToken = (token) => createHash('sha256').update(token).digest('hex');
async function deleteAgentTokens(db, email) {
  const snap = await db.collection('tester_agent_tokens').where('email', '==', email).get();
  for (const d of snap.docs) await d.ref.delete();
  return snap.docs.length;
}
async function agentCaller(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!agentIpLimit(req.ip)) { res.status(429).json({ error: 'Too many requests' }); return null; }
  const token = (req.get('Authorization') || '').match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token || !AGENT_TOKEN.test(token)) { res.status(401).json({ error: 'Send your agent key as a Bearer token' }); return null; }
  const hash = hashToken(token);
  if (!agentLimit(hash)) { res.status(429).json({ error: 'Too many requests' }); return null; }
  try {
    const admin = await adminFirestore();
    const ref = admin.db.collection('tester_agent_tokens').doc(hash);
    const t = await withTimeout(ref.get(), 8000);
    if (!t.exists) { res.status(401).json({ error: 'This agent key is not valid (it may have been revoked)' }); return null; }
    const email = t.data().email;
    const rec = await withTimeout(admin.db.collection('launch2_testers').doc(email).get(), 8000);
    if (!rec.exists || testerStatus(rec.data()) !== 'active') { res.status(403).json({ error: 'Your testing period has ended' }); return null; }
    if (!t.data().lastUsedAt || Date.parse(t.data().lastUsedAt) < Date.now() - 60000) await ref.set({ lastUsedAt: new Date().toISOString() }, { merge: true });
    return { admin, email };
  } catch (err) {
    console.error('agent caller:', err.message);
    res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
    return null;
  }
}

// POST /api/testers/agent-token (create, shown once), GET (does one exist), POST /revoke. Panel sign-in, active testers only to create.
app.post('/api/testers/agent-token', testerBody, async (req, res) => {
  const caller = await testerCaller(req, res);
  if (!caller) return;
  try {
    if (!(await testerRecord(caller, res, { activeOnly: true }))) return;
    const { db } = caller.admin;
    await withTimeout(deleteAgentTokens(db, caller.email), 8000);
    const token = `svlt_${randomBytes(24).toString('hex')}`;
    const createdAt = new Date().toISOString();
    await withTimeout(db.collection('tester_agent_tokens').doc(hashToken(token)).set({ email: caller.email, createdAt, lastUsedAt: null }), 8000);
    return res.json({ token, createdAt });
  } catch (err) {
    console.error('agent token create:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});
app.get('/api/testers/agent-token', async (req, res) => {
  const caller = await testerCaller(req, res);
  if (!caller) return;
  try {
    if (!(await testerRecord(caller, res))) return;
    const snap = await withTimeout(caller.admin.db.collection('tester_agent_tokens').where('email', '==', caller.email).get(), 8000);
    const t = snap.docs[0]?.data();
    return res.json({ exists: Boolean(t), createdAt: t?.createdAt || null, lastUsedAt: t?.lastUsedAt || null });
  } catch (err) {
    console.error('agent token read:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});
app.post('/api/testers/agent-token/revoke', testerBody, async (req, res) => {
  const caller = await testerCaller(req, res);
  if (!caller) return;
  try {
    return res.json({ ok: true, removed: await withTimeout(deleteAgentTokens(caller.admin.db, caller.email), 8000) });
  } catch (err) {
    console.error('agent token revoke:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});
// POST /api/admin/testers/agent-token/revoke {email}: the admin closes a tester's agent key.
app.post('/api/admin/testers/agent-token/revoke', smallBody, async (req, res) => {
  const caller = await testerCaller(req, res, { adminOnly: true });
  if (!caller) return;
  const email = launch2Email(req.body?.email);
  if (!email) return res.status(400).json({ error: 'Send an e-mail' });
  try {
    return res.json({ ok: true, removed: await withTimeout(deleteAgentTokens(caller.admin.db, email), 8000) });
  } catch (err) {
    console.error('admin agent token revoke:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});

// What an agent may read of a build: the brief, the tasks (with stable refs T1, T2…) and this tester's own results.
// No licence key, no manual or download ticket, no bucket path, no other testers.
const agentBuildView = (id, b, result) => ({
  id, name: b.name, version: b.version, platform: b.platform, notes: b.notes || '',
  brief: { goal: b.brief?.goal || '', reference: b.brief?.reference || '', strengths: b.brief?.strengths || [], knownIssues: b.brief?.knownIssues || [], focus: b.brief?.focus || '' },
  tasks: (b.tasks || []).map((t, i) => ({ ref: `T${i + 1}`, id: t.id, title: t.title, detail: t.detail || '' })),
  myResults: { tasks: result?.tasks || {}, summary: result?.summary || '', updatedAt: result?.updatedAt || null },
});

// GET /api/testers/agent/builds → {builds: [...]}  (same content as the panel's "Copy for your assistant", as JSON)
app.get('/api/testers/agent/builds', async (req, res) => {
  const caller = await agentCaller(req, res);
  if (!caller) return;
  try {
    const [snap, results] = await withTimeout(Promise.all([
      caller.admin.db.collection('tester_builds').get(),
      caller.admin.db.collection('tester_build_results').where('email', '==', caller.email).get(),
    ]), 8000);
    const mine = new Map(results.docs.map((d) => [d.data().buildId, d.data()]));
    return res.json({ builds: snap.docs.filter((d) => (d.data().assignedTo || []).includes(caller.email)).map((d) => agentBuildView(d.id, d.data(), mine.get(d.id))) });
  } catch (err) {
    console.error('agent builds:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});
// POST /api/testers/agent/builds/result {buildId, tasks: {T1: {status: 'done' | 'problem' | 'not-started', note}}, summary?}
// Same validation as the panel; refs or ids; only what is sent is changed; unknown tasks come back in `unknown`.
app.post('/api/testers/agent/builds/result', testerBody, async (req, res) => {
  const caller = await agentCaller(req, res);
  if (!caller) return;
  try {
    const out = await saveBuildResult(caller.admin.db, caller.email, req.body && typeof req.body === 'object' ? req.body : {}, { byRef: true, merge: true });
    return res.status(out.status).json(out.body);
  } catch (err) {
    console.error('agent result:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});
// POST /api/testers/agent/report: the panel's report route (same kinds, same monthly cap).
app.post('/api/testers/agent/report', testerBody, async (req, res) => {
  const caller = await agentCaller(req, res);
  if (!caller) return;
  try {
    const out = await sendReport(caller.admin.db, caller.email, req.body && typeof req.body === 'object' ? req.body : {});
    return res.status(out.status).json(out.body);
  } catch (err) {
    console.error('agent report:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});
// GET /api/testers/agent/messages and POST (the same thread as the panel's Messages).
app.get('/api/testers/agent/messages', async (req, res) => {
  const caller = await agentCaller(req, res);
  if (!caller) return;
  try {
    return res.json({ messages: (await withTimeout(threadOf(caller.admin.db, caller.email), 8000)).map(messageView) });
  } catch (err) {
    console.error('agent messages:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});
app.post('/api/testers/agent/messages', testerBody, async (req, res) => {
  const caller = await agentCaller(req, res);
  if (!caller) return;
  const body = cleanParagraph(req.body?.body, 2000);
  if (body.length < 2) return res.status(400).json({ error: 'Write your message first' });
  try {
    const limited = await withTimeout(messageLimitError(caller.admin.db, caller.email), 8000);
    if (limited) return res.status(429).json({ error: limited });
    await withTimeout(caller.admin.db.collection('tester_messages').doc().set({ email: caller.email, from: 'tester', kind: 'message', body, at: new Date().toISOString(), read: false }), 8000);
    return res.json({ ok: true });
  } catch (err) {
    console.error('agent message send:', err.message);
    return res.status(serviceDown(err) ? 503 : 500).json({ error: 'Tester service unavailable' });
  }
});

// GET /api/testers/agent/openapi.json: public, no data. An OpenAPI 3.1 description of the agent routes, for a custom GPT action or any agent.
const AGENT_OPENAPI = {
  openapi: '3.1.0',
  info: { title: 'SubverseLab tester agent API', version: '1.0.0', description: 'Read your test tasks and write your results, reports and messages. Authenticate with your personal agent key (Bearer svlt_…). Nothing else on the site is reachable with it.' },
  // The address agents call. Stays subverselab.com (answered through the site's /api proxy) until the cut-over sets
  // PUBLIC_API_ORIGIN=https://api.subverselab.com on this service.
  servers: [{ url: (process.env.PUBLIC_API_ORIGIN || 'https://subverselab.com').replace(/\/$/, '') }],
  security: [{ agentKey: [] }],
  components: {
    securitySchemes: { agentKey: { type: 'http', scheme: 'bearer', description: 'Your personal agent key from the tester panel (starts with svlt_).' } },
    schemas: {
      TaskResult: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['done', 'problem', 'not-started'] }, note: { type: 'string', maxLength: 1500 } } },
    },
  },
  paths: {
    '/api/testers/agent/builds': { get: { operationId: 'listBuilds', summary: 'Your assigned test builds: brief, tasks (T1, T2…) and your current results', responses: { 200: { description: 'The builds' } } } },
    '/api/testers/agent/builds/result': { post: {
      operationId: 'saveResults', summary: 'Save results for tasks of one build; only the tasks you send are changed',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['buildId'], properties: {
        buildId: { type: 'string' }, tasks: { type: 'object', description: 'Keys are task refs like T1', additionalProperties: { $ref: '#/components/schemas/TaskResult' } }, summary: { type: 'string', maxLength: 4000 },
      } } } } },
      responses: { 200: { description: 'Saved; `unknown` lists task refs that were not on the build' }, 400: { description: 'Invalid' } },
    } },
    '/api/testers/agent/report': { post: {
      operationId: 'sendReport', summary: 'Send a report (optional; 50 a month)',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['kind', 'text'], properties: {
        kind: { type: 'string', enum: ['bug', 'sound', 'ui', 'works', 'idea', 'panel'] }, text: { type: 'string', minLength: 20, maxLength: 4000 },
        plugin: { type: 'string' }, os: { type: 'string' }, daw: { type: 'string' }, dawVersion: { type: 'string' },
      } } } } },
      responses: { 200: { description: 'Sent' }, 400: { description: 'Invalid' }, 429: { description: 'Monthly limit reached' } },
    } },
    '/api/testers/agent/messages': {
      get: { operationId: 'readMessages', summary: 'Your message thread with SubverseLab', responses: { 200: { description: 'Messages, oldest first' } } },
      post: { operationId: 'sendMessage', summary: 'Write to SubverseLab', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['body'], properties: { body: { type: 'string', maxLength: 2000 } } } } } }, responses: { 200: { description: 'Sent' } } },
    },
  },
};
app.get('/api/testers/agent/openapi.json', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  if (!testerSeatsLimit(req.ip)) return res.status(429).json({ error: 'Too many requests' });
  return res.json(AGENT_OPENAPI);
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
  const emailOwned = Boolean(mail) && emailProven(decoded);
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
// → {balance, costs, recent:[{delta, reason, tool, at}]}. The account with the checkout e-mail also claims credits that
// were bought without an account id (owner 2026-10-18: proven or not).
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
    // Owner 2026-10-18: parked credits go to the account with the checkout e-mail, proven or not.
    if (decoded.email) {
      await withTimeout(credits.claimPending({ uid: decoded.uid, email: decoded.email }), 8000);
    }
    const { balance, tester, recent } = await withTimeout(credits.readBalance(decoded.uid, { testerEmail: (await testerOwn(await adminFirestore(), decoded)) ? decoded.email : null }), 8000);
    return res.json({ balance, tester, costs: CREDIT_COSTS, recent });
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
    const { status, ...body } = await withTimeout(credits.spend({ uid: decoded.uid, tool, jobId, testerEmail: (await testerOwn(await adminFirestore(), decoded)) ? decoded.email : null }), 10000);
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

/* ---- Plug-in trial + browser sign-in (AHENK first) ------------------------------------------------------------
   Contract: 01_AI_Tools/subverselab-plugin-common/docs/TRIAL_AND_SIGNIN.md; logic in trialGrant.js (tests:
   scripts/test-trial.js). Grants are signed with GRANT_SIGNING_KEY (RSA 2048 PEM, Secret Manager on the owner's go);
   without it every route below answers 503 plain text. A service failure is plain text 503/429/413, never {ok:false},
   so the plug-in keeps what it has. Firestore trials/ and device_codes/ are Admin SDK only (firestore.rules). */
// Parsed once per value of the variable (a Secret Manager env var is fixed for the revision; tests change it).
let grantKeyCache = { env: undefined, key: null };
function grantSigningKey() {
  const env = process.env.GRANT_SIGNING_KEY || '';
  if (grantKeyCache.env === env) return grantKeyCache.key;
  const pem = env.replace(/\\n/g, '\n').trim();
  let key = null;
  try { key = pem ? loadSigningKey(pem) : null; } catch (err) { console.error('GRANT_SIGNING_KEY is not a usable RSA private key:', err.message); }
  grantKeyCache = { env, key };
  return key;
}
// Grant refresh has no ID token: the account is read by uid and "proven" is decided as close to emailProven() as a user
// record allows (a verified address, or a Google sign-in linked to the account). A deleted account owns nothing.
async function grantAccount(admin, uid) {
  try {
    const u = await admin.auth.getUser(uid);
    return { email: u.email || '', proven: u.emailVerified === true || (u.providerData || []).some((p) => p.providerId === 'google.com') };
  } catch (err) {
    if (err?.code === 'auth/user-not-found') return null;
    throw err;
  }
}
// An App Store purchase attached to a device code (POST /api/device/apple) is linked to the approving account like
// POST /api/<slug>/ios/apple-purchase would (the AHENK iOS app signs in through the browser and has no Firebase token).
async function grantLinkApple(admin, uid, tx) {
  const id = launch2Uid(uid);
  if (!id) return { status: 400 };
  const { status } = await linkApplePurchase(admin.db, { uid: id, tx });
  if (status === 200) console.log(`apple purchase linked via device code (${tx.product}): uid ${id.slice(0, 6)}… env ${tx.environment}`);
  return { status };
}
const trials = createTrialService({ getAdmin: adminFirestore, getKey: grantSigningKey, ownedVia, lookupUser: grantAccount, linkApple: grantLinkApple });
const trialLimit = tokenBucket({ perMinute: 30 });
const deviceStartLimit = tokenBucket({ perMinute: 30 });
const devicePollLimit = tokenBucket({ perMinute: 30 });
const deviceApproveLimit = tokenBucket({ perMinute: 30 });
const grantRefreshLimit = tokenBucket({ perMinute: 30 });
function grantRoute(limit, fn, { signedIn = false } = {}) {
  return [smallBody, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!limit(req.ip)) return res.status(429).type('text/plain').send('Too many requests');
    if (!grantSigningKey()) return res.status(503).type('text/plain').send('Service not configured');
    let caller = null;
    if (signedIn) {
      const token = (req.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
      if (!token) return res.status(401).json({ ok: false, error: 'sign in' });
      try {
        const admin = await adminFirestore();
        const decoded = await admin.auth.verifyIdToken(token);
        caller = { uid: decoded.uid, email: decoded.email || '', proven: emailProven(decoded) };
      } catch (err) {
        if (serviceDown(err)) return res.status(503).type('text/plain').send('Service unavailable');
        return res.status(401).json({ ok: false, error: 'sign in' });
      }
    }
    try {
      const { status, body } = await withTimeout(fn(req.body || {}, caller), 10000);
      res.status(status).json(body);
    } catch (err) {
      if (!(err instanceof NotConfigured)) console.error(`grant ${req.path}:`, err.message);
      res.status(503).type('text/plain').send(err instanceof NotConfigured ? 'Service not configured' : 'Service unavailable');
    }
  }];
}
const pickDevice = (b) => ({ product: b.product, machine: b.machine, name: b.name, platform: b.platform === 'ios' ? 'ios' : undefined });
app.post('/api/trial/start', grantRoute(trialLimit, (b) => trials.trialStart(pickDevice(b))));
app.post('/api/device/start', grantRoute(deviceStartLimit, (b) => trials.deviceStart(pickDevice(b))));
app.post('/api/device/poll', grantRoute(devicePollLimit, (b) => trials.devicePoll({ device_code: b.device_code })));
app.post('/api/device/approve', grantRoute(deviceApproveLimit, (b, caller) => trials.deviceApprove({ user_code: b.user_code, caller }), { signedIn: true }));
// For the /activate page only (not part of the plug-in contract): product + computer name before the button is pressed.
app.post('/api/device/lookup', grantRoute(deviceApproveLimit, (b) => trials.deviceLookup({ user_code: b.user_code }), { signedIn: true }));
app.post('/api/grant/refresh', grantRoute(grantRefreshLimit, (b) => trials.grantRefresh({ grant: b.grant })));
// POST /api/device/apple {device_code, jws}: the iOS app attaches its App Store purchase (StoreKit 2 signed transaction) to a
// pending sign-in code; /api/device/approve then links it to the account that approves (TRIAL_AND_SIGNIN.md "App Store").
// 200 {ok:true} | 400 bad signature / not the full purchase of an app in APPLE_APPS / Sandbox | 403 refunded | 404 expired code.
const deviceAppleLimit = tokenBucket({ perMinute: 10 });
app.post('/api/device/apple', appleBody, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!deviceAppleLimit(req.ip)) return res.status(429).type('text/plain').send('Too many requests');
  let tx;
  try { tx = verifyAppleJws(req.body?.jws); } catch (err) {
    if (err instanceof AppleJwsError) return res.status(400).json({ ok: false, error: 'bad purchase', reason: err.reason });
    throw err;
  }
  const appRow = APPLE_APPS.find((a) => a.bundleId === tx.bundleId);
  const problem = appRow ? transactionProblem(tx, { slug: appRow.slug }) : { status: 400, error: 'Unknown app.' };
  if (problem) return res.status(problem.status).json({ ok: false, error: problem.error });
  const summary = {
    product: appRow.slug, originalTransactionId: String(tx.originalTransactionId), transactionId: tx.transactionId != null ? String(tx.transactionId) : null,
    productId: tx.productId, bundleId: tx.bundleId, environment: tx.environment,
    originalPurchaseDate: Number(tx.originalPurchaseDate) || null, purchaseDate: Number(tx.purchaseDate) || null,
  };
  try {
    const { status, body } = await withTimeout(trials.deviceAttachApple({ device_code: req.body?.device_code, tx: summary }), 8000);
    return res.status(status).json(body);
  } catch (err) {
    console.error('device apple:', err.message);
    return res.status(503).type('text/plain').send('Service unavailable');
  }
});

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
  // A product created from /admin carries its Lemon Squeezy product id in the catalogue (api/catalog.js), no env change.
  const live = catalog.slugFor(productId);
  if (live) return live;
  if (isFamilyOrder({ product_id: productId })) return 'family';
  // Fallback by product name. The family is checked first: its name may list the plugins.
  const n = String(productName || '').toLowerCase();
  if (/\bfamily\b/.test(n)) return 'family';
  // The sweep before 'bundle': a product named "Sweep the store bundle" must never open KUBBE + KASET.
  if (/\bsweep\b/.test(n)) return /\bpreset/.test(n) ? 'preset-sweep' : 'sweep';
  if (n.includes('bundle') || (n.includes('kubbe') && n.includes('kaset'))) return 'bundle';
  // Packs before plugins: "RU-8 Drum Pack" must never open the RU-8 instrument.
  if (/\bru-?8 drum pack\b/.test(n)) return 'ru8-drum-pack';
  const pack = PACK_SLUGS.find((slug) => new RegExp(`\\b${slug}\\b`).test(n));
  if (pack) return pack;
  const name = n.replace(/\bru-8\b/g, 'ru8').replace(/\bjing fang\b/g, 'jingfang');
  return PLUGIN_SLUGS.find((slug) => new RegExp(`\\b${slug}\\b`).test(name)) || null;
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

  // Affiliate partners (api/partners.js): an order that came through a partner's link (meta.custom_data.aff) or with a
  // partner's reader discount code is written to partner_sales. Before every early return below (the family branch returns
  // early, and Rekkerd's product is the family). Never changes this answer: an error is only logged.
  if (event === 'order_created' || event === 'order_refunded') {
    try {
      const item = a.first_order_item || {};
      const product = isFamilyOrder(item) ? 'family' : productSlugFor(item.product_id ?? a.product_id, item.product_name);
      const out = await partnerService.recordOrder({ event, orderId: data.id, attrs: a, customData: payload?.meta?.custom_data || {}, product });
      if (out.partnerId) console.log(`partners: order ${data.id} ${out.result} (${out.partnerId}${out.source ? `, ${out.source}` : ''})`);
    } catch (err) {
      console.error('partners webhook:', err.message);
    }
  }

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
    // Index by account: orders_by_uid/{uid}.orders[orderId], so ownership can be found by uid whatever e-mail the buyer typed.
    // A refund keeps it in sync; it never re-creates the index of an account that was deleted (the doc is gone then).
    if (event === 'order_created' || event === 'order_refunded') {
      const orderId = String(data.id);
      const uid = boundUid || launch2Uid((await ref.get()).data()?.orders?.[orderId]?.uid);
      if (uid) {
        const indexRef = db.collection(ORDERS_BY_UID).doc(uid);
        if (event === 'order_created' || (await indexRef.get()).exists) {
          await indexRef.set({ orders: { [orderId]: uidOrderEntry(update.orders[orderId], email) } }, { merge: true });
        }
      }
    }
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
    // Inbox: "your order is ready" for the account that placed a paid order ($0 included). Never fails the webhook.
    let inboxResult = null;
    if (event === 'order_created' && a.status === 'paid') {
      try {
        const admin = await adminFirestore();
        let uid = boundUid;
        if (!uid) uid = (await admin.auth.getUserByEmail(email).catch(() => null))?.uid || null;
        if (uid) {
          const item = a.first_order_item || {};
          const slug = isFamilyOrder(item) ? 'family' : productSlugFor(item.product_id, item.product_name);
          inboxResult = await addMessage(admin.db, uid, `order-${data.id}`, orderMessage(slug, { orderNumber: a.order_number, created: a.created_at, free: amount.amount_usd_cents === 0 || amount.total === 0 }));
        } else inboxResult = 'no-account';
      } catch (err) { console.error('inbox order message:', err.message); inboxResult = 'error'; }
    }
    res.json({ ok: true, ...(launch2Result ? { launch2: launch2Result } : {}), ...(creditsResult ? { credits: creditsResult } : {}), ...(inboxResult ? { inbox: inboxResult } : {}) });
  } catch (err) {
    // A 5xx makes Lemon Squeezy retry (up to three more times).
    console.error('lemonsqueezy webhook:', err.message);
    res.status(500).json({ error: 'write failed' });
  }
});

/* ---- The live catalogue: GET /api/catalog for the pages, /api/admin/catalog/* for the panel (api/catalog.js) ------------
   Public: published items only, cached a minute (the pages fetch it once per load and lay it over src/data/*).
   Admin: a verified admin address, exactly like /api/admin/members (or the local preview token under SVL_DEV_ADMIN). */
// GET /api/partner-report  (Authorization: Bearer svlp_…)
// An affiliate partner's own sales: every order credited to it (no buyer data), newest first, and monthly totals without
// refunded orders. The token is made by scripts/partner-cli.js and only its hash is stored. A bad token is a bare 401.
const partnerReportLimit = tokenBucket({ perMinute: 10 });
app.get('/api/partner-report', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!partnerReportLimit(req.ip)) return res.status(429).json({ error: 'Too many requests' });
  const m = /^Bearer\s+(\S+)$/.exec(req.get('Authorization') || '');
  try {
    const out = m ? await partnerService.report(m[1]) : null;
    if (!out) return res.status(401).json({ error: 'unauthorized' });
    return res.json(out);
  } catch (err) {
    console.error('partner report:', err.message);
    return res.status(503).json({ error: 'unavailable' });
  }
});

app.get('/api/catalog', async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60');
  const cat = await catalog.load();
  res.json({ ...catalog.publicView(cat), at: new Date().toISOString() });
});
// For the site server (../server.js): which /plugins/<slug> and /sample-packs/<slug> exist only in the catalogue.
app.get('/api/catalog/slugs', async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json(catalog.slugs(await catalog.load()));
});
const catalogBody = express.json({ limit: '256kb' });
async function catalogAdmin(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!adminLimit(req.ip)) { res.status(429).json({ error: 'Too many requests' }); return null; }
  const token = (req.get('Authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) { res.status(401).json({ error: 'Sign in first' }); return null; }
  if (DEV_ADMIN && token === 'dev-preview') return { email: ADMIN_EMAILS[0], uid: 'dev-preview-owner', dev: true };
  if (isAgentKey(token)) return adminAgentCaller(token, res, 'Catalogue service unavailable');
  let admin, decoded;
  try { admin = await adminFirestore(); decoded = await admin.auth.verifyIdToken(token); } catch (err) {
    res.status(serviceDown(err) ? 503 : 401).json({ error: serviceDown(err) ? 'Catalogue service unavailable' : 'Your sign-in has expired — sign in again' });
    return null;
  }
  if (decoded.email_verified !== true || !ADMIN_EMAILS.includes(String(decoded.email || '').toLowerCase())) { res.status(403).json({ error: 'Admins only' }); return null; }
  return { email: String(decoded.email).toLowerCase(), uid: decoded.uid };
}
const answer = (res, out) => (out?.error ? res.status(out.status || 400).json({ error: out.error, ...(out.errors ? { errors: out.errors } : {}), ...(out.code ? { code: out.code } : {}) }) : res.json(out));
const catalogFail = (res, what, err) => { console.error(`catalog ${what}:`, err.message); res.status(serviceDown(err) ? 503 : 500).json({ error: `The catalogue could not ${what} right now` }); };
app.get('/api/admin/catalog', async (req, res) => {
  if (!(await catalogAdmin(req, res))) return;
  try {
    const cat = await catalog.load({ force: req.query.fresh === '1' });
    res.json({ ...cat, manifest: await withTimeout(downloadManifest(), 8000).catch(() => ({})) });
  } catch (err) { catalogFail(res, 'be read', err); }
});
// What a form or an agent needs to write a valid item: the kinds and their fields (the same list the panel renders).
app.get('/api/catalog/schema', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json({ kinds: CATALOG_KINDS, productKinds: CATALOG_PRODUCT_KINDS, labels: CATALOG_KIND_LABELS, fields: CATALOG_FIELDS, filePlatforms: FILE_PLATFORMS, media: Object.fromEntries(Object.entries(MEDIA_KINDS).map(([k, v]) => [k, { types: Object.keys(v.types), max: v.max }])) });
});
// Admin agent keys (api/agents.js): list, make (the key is in this one answer only), revoke. Humans only, never an agent.
const humanAdmin = async (req, res) => { const who = await catalogAdmin(req, res); if (!who) return null; if (who.agent) { res.status(403).json({ error: 'Agent keys are made and revoked by a signed-in admin' }); return null; } return who; };
app.get('/api/admin/catalog/agents', async (req, res) => {
  const who = await humanAdmin(req, res);
  if (!who) return;
  try { const admin = await adminFirestore(); res.json({ agents: await withTimeout(createAgentStore(admin.db).list(), 8000) }); } catch (err) { catalogFail(res, 'list agent keys', err); }
});
app.post('/api/admin/catalog/agents', catalogBody, async (req, res) => {
  const who = await humanAdmin(req, res);
  if (!who) return;
  try { const admin = await adminFirestore(); answer(res, await withTimeout(createAgentStore(admin.db).create({ label: req.body?.label, by: who.email }), 8000)); } catch (err) { catalogFail(res, 'make an agent key', err); }
});
app.post('/api/admin/catalog/agents/revoke', catalogBody, async (req, res) => {
  const who = await humanAdmin(req, res);
  if (!who) return;
  try { const admin = await adminFirestore(); answer(res, await withTimeout(createAgentStore(admin.db).revoke(req.body?.id), 8000)); } catch (err) { catalogFail(res, 'revoke an agent key', err); }
});
app.post('/api/admin/catalog/upload', catalogBody, async (req, res) => {
  if (!(await catalogAdmin(req, res))) return;
  try { answer(res, await withTimeout(catalog.mediaUploadUrl(req.body || {}), 10000)); } catch (err) { catalogFail(res, 'make the upload address', err); }
});
app.post('/api/admin/catalog/upload/complete', catalogBody, async (req, res) => {
  if (!(await catalogAdmin(req, res))) return;
  try { answer(res, await withTimeout(catalog.mediaComplete(req.body || {}), 15000)); } catch (err) { catalogFail(res, 'read the uploaded file', err); }
});
// Direct uploads through the API (no signed URL): PUT with the file as the body. Pictures, audio and PDFs always go this way
// (small files); a sold file goes this way when the API cannot sign (a developer machine; Cloud Run takes up to 32 MB).
const rawUpload = (limit) => express.raw({ type: () => true, limit });
app.put('/api/admin/catalog/media', rawUpload('80mb'), async (req, res) => {
  if (!(await catalogAdmin(req, res))) return;
  const q = req.query || {};
  try { answer(res, await withTimeout(catalog.mediaDirect({ kind: q.kind, filename: q.filename, group: q.group, slug: q.slug, body: req.body, contentType: req.get('Content-Type') }), 60000)); } catch (err) { catalogFail(res, 'store the file', err); }
});
app.put('/api/admin/catalog/file/direct', rawUpload('1600mb'), async (req, res) => {
  const who = await catalogAdmin(req, res);
  if (!who) return;
  const q = req.query || {};
  try {
    const out = await withTimeout(catalog.fileDirect({ slug: q.slug, version: q.version, filename: q.filename, body: req.body }), 15 * 60000);
    if (out.ok) console.log(`catalog: ${who.email} uploaded ${out.objectPath} (${out.size} B)`);
    answer(res, out);
  } catch (err) { catalogFail(res, 'store the file', err); }
});
app.post('/api/admin/catalog/file', catalogBody, async (req, res) => {
  if (!(await catalogAdmin(req, res))) return;
  try { answer(res, await withTimeout(catalog.fileUploadUrl(req.body || {}), 10000)); } catch (err) { catalogFail(res, 'make the upload address', err); }
});
app.post('/api/admin/catalog/file/publish', catalogBody, async (req, res) => {
  const who = await catalogAdmin(req, res);
  if (!who) return;
  try {
    const out = await withTimeout(catalog.publishFile(req.body || {}), 30000);
    if (out.ok) { manifestCache = { at: 0, value: null }; console.log(`catalog: ${who.email} published ${out.slug} ${out.platform} ${out.version}`); }
    answer(res, out);
  } catch (err) { catalogFail(res, 'publish the file', err); }
});
app.post('/api/admin/catalog/file/remove', catalogBody, async (req, res) => {
  const who = await catalogAdmin(req, res);
  if (!who) return;
  try {
    const out = await withTimeout(catalog.removeFile(req.body || {}), 15000);
    if (out.ok) { manifestCache = { at: 0, value: null }; console.log(`catalog: ${who.email} removed ${out.slug} ${out.platform || ''} from the manifest`); }
    answer(res, out);
  } catch (err) { catalogFail(res, 'change the manifest', err); }
});
app.post('/api/admin/catalog/:kind/delete', catalogBody, async (req, res) => {
  const who = await catalogAdmin(req, res);
  if (!who) return;
  try {
    const out = await withTimeout(catalog.remove(req.params.kind, req.body?.id), 15000);
    if (out.ok) console.log(`catalog: ${who.email} deleted ${req.params.kind}/${out.id}`);
    answer(res, out);
  } catch (err) { catalogFail(res, 'delete the item', err); }
});
app.post('/api/admin/catalog/:kind', catalogBody, async (req, res) => {
  const who = await catalogAdmin(req, res);
  if (!who) return;
  try {
    const out = await withTimeout(catalog.save(req.params.kind, req.body || {}), 15000);
    if (out.ok) console.log(`catalog: ${who.email} saved ${req.params.kind}/${out.id}`);
    answer(res, out);
  } catch (err) { catalogFail(res, 'save the item', err); }
});
// Everything that is not an /api route above: this service has no pages. A JSON 404, so a mistyped call is never
// mistaken for a page (the site answers its own 404 with the HTML 404 page).
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 8080;
// HOST is set only for a local run (127.0.0.1: the preview configs); Cloud Run leaves it unset and the service listens on every address.
app.listen(PORT, process.env.HOST || undefined, () =>
  console.log(`subverselab-api on port ${PORT} (${CORS_ORIGINS.size} allowed origins)`)
);
