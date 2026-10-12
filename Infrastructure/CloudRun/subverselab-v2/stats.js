// Own traffic and sales numbers for the admin Stats tab, independent of Google Analytics (which only loads after the
// cookie banner's "Accept" and so sees a small part of the real traffic).
//   1. A cookieless page-view counter: POST /api/hit lands in createHitCounter(), counted in memory and flushed to
//      site_stats/{YYYY-MM-DD} with FieldValue.increment. Nothing personal is stored or even kept in memory beyond the
//      decision to count: no IP, no user agent, no uid, no identifier.
//   2. computeStats(): orders, accounts, downloads and page views, read from data that already exists.
// Pure helpers are exported for scripts/test-stats.js.

export const SITE_STATS = 'site_stats';
export const OWN_HOSTS = ['subverselab.com', 'www.subverselab.com'];
export const MAX_PATH_KEYS = 300;   // distinct dynamic paths per day (static routes are always allowed)
export const MAX_REF_KEYS = 200;    // distinct referrer hosts per day, the rest go into (other)
const DAY_MS = 86_400_000;
const PRODUCTS = ['family', 'kubbe', 'kaset', 'koro', 'yanki', 'hava', 'tutkal', 'mihenk', 'elek', 'alev', 'taban'];
const PLATFORMS = ['mac', 'win'];
const FREE_PLUGINS = ['alev', 'taban'];

/* ---- Field-key encoding ------------------------------------------------------
   A path like /plugins/kubbe or a host like l.instagram.com cannot be a Firestore field-path segment (dots and slashes
   split it, "__x__" is reserved). Every character outside [a-z0-9-] becomes "_" + two hex digits, "_" itself included,
   so the result is [a-z0-9_-] only, never starts with "__" and decodes back exactly. */
export function encodeKey(text) {
  return String(text).replace(/[^a-z0-9-]/g, (c) => `_${(c.charCodeAt(0) & 0xff).toString(16).padStart(2, '0')}`) || '_00';
}
export function decodeKey(key) {
  return String(key).replace(/_([0-9a-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/* ---- Page address → a known route ---------------------------------------------
   The allow-list mirrors the routes of src/App.jsx. Unknown or garbage input becomes /other, so nobody can fill the
   day's map with arbitrary keys. /tools/<slug> and /learn/<slug> have dynamic slugs (Firestore), so they pass a strict
   slug pattern and are additionally capped per day by the counter. /admin and /api are never counted (null). */
const STATIC_PATHS = new Set([
  '/', '/plugins', '/launch', '/launch2', '/testers', '/sample-packs', '/privacy', '/terms', '/help', '/loom', '/learn',
  '/forum', '/account',
  '/plugins/kubbe', '/plugins/kaset', '/plugins/koro', '/plugins/yanki', '/plugins/hava', '/plugins/mihenk', '/plugins/tutkal',
  '/plugins/taban', '/plugins/alev', '/plugins/adalet', '/plugins/seda', '/plugins/elek', '/plugins/kubbe/manual', '/plugins/kaset/manual',
]);
const SLUG = /^[a-z0-9][a-z0-9-]{0,59}$/;
export function normalisePath(raw) {
  if (typeof raw !== 'string') return '/other';
  let p = raw.trim().slice(0, 200).split('#')[0].split('?')[0].toLowerCase();
  if (!p.startsWith('/')) return '/other';
  if (p.length > 1) p = p.replace(/\/+$/, '');
  if (p === '/admin' || p.startsWith('/admin/') || p === '/api' || p.startsWith('/api/')) return null;
  if (STATIC_PATHS.has(p)) return p;
  const m = p.match(/^\/(tools|learn)\/([^/]+)$/);
  if (m && SLUG.test(m[2])) return p;
  if (/^\/forum\/[^/]{1,80}$/.test(p)) return '/forum/topic';   // topic ids are random; one bucket
  return '/other';
}

/** Referrer → host only. Our own host and an empty value are (direct); anything unparseable is (other). */
export function refHost(raw, ownHosts = OWN_HOSTS) {
  if (typeof raw !== 'string' || !raw.trim()) return '(direct)';
  try {
    const u = new URL(raw.trim().slice(0, 500));
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '(other)';
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    if (!host || host.length > 100) return '(other)';
    if (ownHosts.some((h) => h.replace(/^www\./, '') === host) || host === 'localhost') return '(direct)';
    return host;
  } catch { return '(other)'; }
}

/** Used for the decision only, never stored. An empty user agent is treated as a bot. */
const BOT = /bot\b|bot[/;_ -]|crawl|spider|slurp|facebookexternalhit|headless|lighthouse|pagespeed|preview|monitor|uptime|pingdom|curl\/|wget|python|java\/|go-http|httpclient|scrapy|axios|node-fetch|okhttp|libwww|phantom|selenium|puppeteer|playwright/i;
export function isBot(ua) { return typeof ua !== 'string' || !ua.trim() || BOT.test(ua); }

export const dayKey = (ms) => new Date(ms).toISOString().slice(0, 10);

/* ---- The counter -----------------------------------------------------------------
   hit() only touches memory. flush() (every ~60 s and on SIGTERM) turns the deltas into one write per day:
   views/visits and each path/ref as FieldValue.increment. The per-day key sets are kept after a flush so the caps hold for
   the whole day of this instance (another instance has its own caps; the worst case is a few hundred extra keys). */
export function createHitCounter({ getAdmin, clock = () => Date.now(), ownHosts = OWN_HOSTS, log = console } = {}) {
  const days = new Map();
  const stateFor = (key) => {
    if (!days.has(key)) days.set(key, { views: 0, visits: 0, paths: new Map(), refs: new Map(), pathKeys: new Set(), refKeys: new Set() });
    return days.get(key);
  };
  let timer = null;

  /** body = {path, ref, landing}; ua only decides bot/not. Returns true when the hit was counted. */
  function hit(body, ua) {
    if (isBot(ua)) return false;
    const b = body && typeof body === 'object' ? body : {};
    const path = normalisePath(b.path);
    if (path === null) return false;
    const d = stateFor(dayKey(clock()));
    let p = path;
    if (!d.pathKeys.has(p)) {
      if (d.pathKeys.size >= MAX_PATH_KEYS && !STATIC_PATHS.has(p) && p !== '/other') p = '/other';
      d.pathKeys.add(p);
    }
    d.views += 1;
    d.paths.set(p, (d.paths.get(p) || 0) + 1);
    if (b.landing === true) {
      d.visits += 1;
      let host = refHost(b.ref, ownHosts);
      if (!d.refKeys.has(host)) {
        if (d.refKeys.size >= MAX_REF_KEYS && host !== '(direct)' && host !== '(other)') host = '(other)';
        d.refKeys.add(host);
      }
      d.refs.set(host, (d.refs.get(host) || 0) + 1);
    }
    return true;
  }

  async function flush() {
    const pending = [];
    for (const [key, d] of days) {
      if (!d.views && !d.visits) continue;
      pending.push([key, { views: d.views, visits: d.visits, paths: new Map(d.paths), refs: new Map(d.refs) }]);
      d.views = 0; d.visits = 0; d.paths = new Map(); d.refs = new Map();
    }
    if (!pending.length) return 0;
    try {
      const { db, FieldValue } = await getAdmin();
      for (const [key, taken] of pending) {
        const inc = (n) => FieldValue.increment(n);
        const data = { views: inc(taken.views), visits: inc(taken.visits), updated: FieldValue.serverTimestamp() };
        if (taken.paths.size) data.paths = Object.fromEntries([...taken.paths].map(([k, n]) => [encodeKey(k), inc(n)]));
        if (taken.refs.size) data.refs = Object.fromEntries([...taken.refs].map(([k, n]) => [encodeKey(k), inc(n)]));
        await db.collection(SITE_STATS).doc(key).set(data, { merge: true });
        taken.done = true;
      }
    } catch (err) {
      // Put back what was not written, so the next flush retries it.
      for (const [key, taken] of pending) {
        if (taken.done) continue;
        const d = stateFor(key);
        d.views += taken.views; d.visits += taken.visits;
        for (const [k, n] of taken.paths) d.paths.set(k, (d.paths.get(k) || 0) + n);
        for (const [k, n] of taken.refs) d.refs.set(k, (d.refs.get(k) || 0) + n);
      }
      log.error('site stats flush:', err.message);
      return 0;
    }
    // Forget days other than today and yesterday once they are written.
    const keep = new Set([dayKey(clock()), dayKey(clock() - DAY_MS)]);
    for (const [key, d] of days) if (!keep.has(key) && !d.views && !d.visits) days.delete(key);
    return pending.length;
  }

  function start(everyMs = 60_000) {
    if (!timer) { timer = setInterval(() => { flush().catch(() => {}); }, everyMs); timer.unref?.(); }
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  return { hit, flush, start, stop, pendingViews: () => [...days.values()].reduce((n, d) => n + d.views, 0) };
}

/* ---- The report ------------------------------------------------------------------ */
const toMs = (v) => {
  if (v == null) return NaN;
  if (typeof v.toDate === 'function') return v.toDate().getTime();
  if (typeof v === 'object' && v._seconds != null) return v._seconds * 1000;
  const t = typeof v === 'number' ? v : new Date(v).getTime();
  return Number.isFinite(t) ? t : NaN;
};
const emptyTotals = () => ({ paid: 0, free: 0, refunded: 0, revenue_cents: 0 });

/**
 * amount_usd_cents (credits.js orderAmount) is what Lemon Squeezy charged in USD cents WITHOUT tax:
 * total_usd minus tax_usd, discounts already inside total_usd. So revenue here is net of tax but not of Lemon Squeezy's
 * fee, and a partial refund is not subtracted (the stored order keeps no refunded amount): a partial_refund order counts
 * as paid at full price. Only status paid / partial_refund / refunded count; pending and failed are skipped.
 */
export function classifyOrder(order) {
  const status = order?.status || '';
  const refunded = order?.refunded === true || status === 'refunded';
  if (!refunded && status !== 'paid' && status !== 'partial_refund') return null;
  if (refunded) return 'refunded';
  const cents = order.amount_usd_cents;
  if (cents === 0) return 'free';
  if (typeof cents === 'number' && cents > 0) return 'paid';
  // Amount unknown (no usable USD amount at the webhook): the two free plugins are free, anything else is not guessed.
  return FREE_PLUGINS.includes(order.product) ? 'free' : null;
}

export function windowDays(now, days) {
  const out = [];
  const today = Date.parse(`${dayKey(now)}T00:00:00Z`);
  for (let i = days - 1; i >= 0; i--) out.push(dayKey(today - i * DAY_MS));
  return out;
}

/** Orders. `licenseDocs` = [{id: e-mail, data}] of plugin_licenses. */
export function aggregateOrders(licenseDocs, { days, now }) {
  const inWindow = new Set(windowDays(now, days));
  const byDay = new Map([...inWindow].map((d) => [d, { ...emptyTotals() }]));
  const allProducts = {};
  const winProducts = {};
  const total = emptyTotals();
  const win = emptyTotals();
  const buyersPaid = new Set();
  const buyersFree = new Set();
  const people = new Map();   // e-mail → {firstFree, firstFamily}
  for (const { id, data } of licenseDocs) {
    const email = String(id || '').toLowerCase();
    for (const o of Object.values(data?.orders || {})) {
      const kind = classifyOrder(o);
      if (!kind) continue;
      const slug = PRODUCTS.includes(o.product) ? o.product : (o.product || 'other');
      const ms = toMs(o.created);
      const day = Number.isNaN(ms) ? null : dayKey(ms);
      const cents = kind === 'paid' ? o.amount_usd_cents : 0;
      const bump = (t) => { t[kind] += 1; t.revenue_cents += cents; };
      bump(total);
      bump(allProducts[slug] ||= emptyTotals());
      if (kind === 'paid') buyersPaid.add(email);
      if (kind === 'free') buyersFree.add(email);
      if (day && inWindow.has(day)) {
        bump(win); bump(winProducts[slug] ||= emptyTotals()); bump(byDay.get(day));
      }
      const person = people.get(email) || {};
      if (kind === 'free' && FREE_PLUGINS.includes(slug) && !Number.isNaN(ms)) person.firstFree = Math.min(person.firstFree ?? Infinity, ms);
      if (kind === 'paid' && slug === 'family' && !Number.isNaN(ms)) person.firstFamily = Math.min(person.firstFamily ?? Infinity, ms);
      people.set(email, person);
    }
  }
  let both = 0; let freeFirst = 0;
  for (const p of people.values()) {
    if (p.firstFree != null && p.firstFamily != null) { both += 1; if (p.firstFree < p.firstFamily) freeFirst += 1; }
  }
  const slugs = [...new Set([...PRODUCTS, ...Object.keys(allProducts)])];
  return {
    byDay, total, win,
    products: slugs.map((slug) => ({ slug, all: allProducts[slug] || emptyTotals(), window: winProducts[slug] || emptyTotals() })),
    buyers: { paid_emails: buyersPaid.size, free_emails: buyersFree.size, free_and_family: both, free_first_then_family: freeFirst },
  };
}

/** Accounts. `users` = Firebase Auth user records. */
export function aggregateAccounts(users, { days, now }) {
  const inWindow = new Set(windowDays(now, days));
  const signups = new Map([...inWindow].map((d) => [d, 0]));
  const active = { d1: 0, d7: 0, d30: 0 };
  const providers = { google: 0, password: 0, other: 0 };
  let newInWindow = 0;
  for (const u of users) {
    const created = toMs(u.metadata?.creationTime);
    if (!Number.isNaN(created)) { const k = dayKey(created); if (signups.has(k)) { signups.set(k, signups.get(k) + 1); newInWindow += 1; } }
    const seen = toMs(u.metadata?.lastSignInTime);
    if (!Number.isNaN(seen)) {
      const age = now - seen;
      if (age <= DAY_MS) active.d1 += 1;
      if (age <= 7 * DAY_MS) active.d7 += 1;
      if (age <= 30 * DAY_MS) active.d30 += 1;
    }
    const ids = (u.providerData || []).map((p) => p.providerId);
    // Google wins when an account has both, so the three numbers add up to the total.
    if (ids.includes('google.com')) providers.google += 1;
    else if (ids.includes('password')) providers.password += 1;
    else providers.other += 1;
  }
  return { signups, accounts: { total: users.length, new_in_window: newInWindow, active, providers } };
}

/**
 * Downloads. `docs` = [{id: uid, data}] of downloads/{uid} = {[slug]: {[platform]: {count, first, last}}}.
 * `last` is overwritten on every download, so it cannot give a history; only `first` (set once) does. The per-day series is
 * therefore "accounts' first download of a product/platform, by day", not a count of all downloads per day.
 */
export function aggregateDownloads(docs, { days, now }) {
  const inWindow = new Set(windowDays(now, days));
  const firstPerDay = new Map([...inWindow].map((d) => [d, 0]));
  const by = {};
  let accountsAny = 0;
  for (const { data } of docs) {
    let any = false;
    for (const [slug, perPlatform] of Object.entries(data || {})) {
      if (!perPlatform || typeof perPlatform !== 'object') continue;
      const row = by[slug] ||= { slug, accounts: 0, mac: { count: 0, accounts: 0 }, win: { count: 0, accounts: 0 } };
      let slugAny = false;
      for (const platform of PLATFORMS) {
        const e = perPlatform[platform];
        const count = Number(e?.count) || 0;
        if (!count) continue;
        row[platform].count += count; row[platform].accounts += 1; slugAny = true;
        const ms = toMs(e.first);
        if (!Number.isNaN(ms)) { const k = dayKey(ms); if (firstPerDay.has(k)) firstPerDay.set(k, firstPerDay.get(k) + 1); }
      }
      if (slugAny) { row.accounts += 1; any = true; }
    }
    if (any) accountsAny += 1;
  }
  return { firstPerDay, accounts_any: accountsAny, by_product: Object.values(by).sort((a, b) => (b.mac.count + b.win.count) - (a.mac.count + a.win.count)) };
}

/** Page views. `docs` = [{id: 'YYYY-MM-DD', data}] of site_stats. */
export function aggregateViews(docs, { days, now }) {
  const inWindow = new Set(windowDays(now, days));
  const perDay = new Map([...inWindow].map((d) => [d, { views: 0, visits: 0 }]));
  const paths = new Map(); const refs = new Map();
  let since = null;
  for (const { id, data } of docs) {
    if (!data || !inWindow.has(id)) continue;
    perDay.set(id, { views: Number(data.views) || 0, visits: Number(data.visits) || 0 });
    if (!since || id < since) since = id;
    for (const [k, n] of Object.entries(data.paths || {})) { const key = decodeKey(k); paths.set(key, (paths.get(key) || 0) + (Number(n) || 0)); }
    for (const [k, n] of Object.entries(data.refs || {})) { const key = decodeKey(k); refs.set(key, (refs.get(key) || 0) + (Number(n) || 0)); }
  }
  const top = (map, name) => [...map].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).slice(0, 20).map(([k, views]) => ({ [name]: k, views }));
  let views = 0; let visits = 0;
  for (const v of perDay.values()) { views += v.views; visits += v.visits; }
  return { perDay, since, views, visits, paths: top(paths, 'path'), refs: top(refs, 'host') };
}

/**
 * The whole report for GET /api/admin/stats. `admin` = {db, auth}; `run(promise, ms)` is server.js's withTimeout.
 * Reads every plugin_licenses and downloads doc and every account, like /api/admin/members does.
 */
export async function computeStats(admin, { days = 30, now = Date.now(), run = (p) => p } = {}) {
  const n = Math.min(90, Math.max(1, Math.floor(Number(days)) || 30));
  const list = windowDays(now, n);
  const users = [];
  const readUsers = async () => {
    let pageToken;
    do {
      const page = await run(admin.auth.listUsers(1000, pageToken), 15000);
      users.push(...page.users);
      pageToken = page.pageToken;
    } while (pageToken);
  };
  const docsOf = (snap) => snap.docs.map((d) => ({ id: d.id, data: d.data() || {} }));
  const [licenses, downloads, views] = await Promise.all([
    run(admin.db.collection('plugin_licenses').get(), 20000).then(docsOf),
    run(admin.db.collection('downloads').get(), 20000).then(docsOf),
    Promise.all(list.map((k) => run(admin.db.collection(SITE_STATS).doc(k).get(), 10000))).then((snaps) => snaps.map((s, i) => ({ id: list[i], data: s.exists ? s.data() : null }))),
    readUsers(),
  ]);
  const o = aggregateOrders(licenses, { days: n, now });
  const a = aggregateAccounts(users, { days: n, now });
  const d = aggregateDownloads(downloads, { days: n, now });
  const v = aggregateViews(views, { days: n, now });
  return {
    generated_at: new Date(now).toISOString(),
    days: n, from: list[0], to: list[list.length - 1],
    series: list.map((date) => ({
      date, visits: v.perDay.get(date).visits, views: v.perDay.get(date).views, signups: a.signups.get(date),
      paid: o.byDay.get(date).paid, free: o.byDay.get(date).free, refunded: o.byDay.get(date).refunded, revenue_cents: o.byDay.get(date).revenue_cents,
    })).reverse(),
    orders: { all_time: o.total, window: o.win, products: o.products, buyers: o.buyers },
    accounts: a.accounts,
    downloads: { accounts_any: d.accounts_any, by_product: d.by_product, first_per_day: list.map((date) => ({ date, count: d.firstPerDay.get(date) })).reverse() },
    traffic: { tracking_since: v.since, views: v.views, visits: v.visits, paths: v.paths, refs: v.refs },
  };
}
