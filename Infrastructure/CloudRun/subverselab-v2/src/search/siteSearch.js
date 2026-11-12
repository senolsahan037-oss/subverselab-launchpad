// One search for the whole site (owner 6 Nov 2026: "arama alanını genel arama alanı yapalım ... lisans anahtarı, herhangi bir
// plugin ismi yazabilir, hatta direkt soru sorabilir"). Plain data in, plain results out: no JSX, no fetch, so the navbar box,
// the /search page and scripts/test-search.js all run the same code.
//
//   searchSite(query, catalog) -> { query, special, groups: [{ id, title, items: [{ title, sub, to, answer?, score }] }], total }
//
// `special` is set when the text is not a word search at all:
//   - 'licence-key': a Lemon Squeezy style key (8-4-4-4-12) or any long dashed code. The key itself goes nowhere: no URL, no
//     request, no analytics. The answer says where keys live and that the current builds do not ask for one.
//   - 'order-number': digits only (with or without #), the number on a receipt e-mail. The answer points at the claim form.
//   - 'email': an e-mail address; never put into a URL.
// Every answer sentence is taken from the site's own data (src/data), never written here, so search cannot say something the
// product pages do not.
import { ALL_PLUGINS, FREE_PLUGINS, SOLO_PLUGINS, ACTIVATION_SHORT, ACTIVATION_LINE_FREE, TRUST_LINE } from '../data/plugins.js';
import { CUSTOMER_LEARN } from '../data/learnContent.js';
import { visiblePacks, packPath } from '../data/packFacts.js';
import { PRESET_PACK_LIST } from '../data/presetPacks.js';
import { FREE_TOOLS } from '../data/tools.js';
import { ALL_FAQ } from '../data/faqContent.js';
import { mergeSamplePacks, mergePresetPacks, catalogPlugins } from '../catalog/merge.js';

// The licence sentences the plug-in rooms print (src/data/plugins.js), and the Account page's own help texts.
export const KEY_ANSWER = `${ACTIVATION_SHORT} Free plugins: ${ACTIVATION_LINE_FREE}`;
const learn = (id) => (CUSTOMER_LEARN.find((i) => i.id === id)?.body || []).join(' ');
export const ORDER_ANSWER = 'Bought without signing in? On your Account page, choose “Bought without signing in? Add the order” and enter the order number from your receipt e-mail with the e-mail address you used at checkout.';

// Fold accents and the dotless i so "yankı", "YANKI" and "yanki" meet; "RU-8"/"ru8" and "JING FANG"/"jingfang" too.
export function fold(s) {
  return String(s || '')
    .toLocaleLowerCase('en-US')
    .replace(/ı/g, 'i').replace(/İ/g, 'i')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9#@.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
const squash = (s) => fold(s).replace(/[\s.-]/g, '');

const STOP = new Set(('a an the and or of to in on for with from at by is are was be do does did can could should would i me my we our you your it its '
  + 'this that what why how where when which who whom am have has had not no yes there here get got about into than then so if '
  + 'just any some please hi hello thanks thank') .split(' '));

// Words a visitor uses for the same thing. Each row folds onto its first word.
const SYNONYMS = [
  ['licence', 'license', 'licences', 'licenses', 'serial', 'activation', 'activate', 'activated', 'unlock', 'lisans', 'anahtar', 'anahtari'],
  ['download', 'downloads', 'downloading', 'install', 'installer', 'installing', 'installation', 'setup', 'indir', 'kurulum'],
  ['refund', 'refunds', 'money', 'return', 'cancel', 'iade'],
  ['price', 'prices', 'cost', 'costs', 'cheap', 'buy', 'buying', 'purchase', 'pay', 'paid', 'fiyat'],
  ['free', 'gratis', 'ucretsiz'],
  ['account', 'login', 'signin', 'sign', 'signed', 'password', 'hesap'],
  ['update', 'updates', 'upgrade', 'version', 'guncelleme'],
  ['mac', 'macos', 'osx', 'apple'],
  ['windows', 'win', 'pc'],
  ['daw', 'ableton', 'logic', 'fl', 'cubase', 'reaper', 'bitwig', 'studio'],
  ['plugin', 'plugins', 'plug', 'vst', 'vst3', 'au', 'eklenti'],
  ['contact', 'support', 'email', 'mail', 'help', 'destek'],
  ['limit', 'limits', 'daily', 'credits', 'credit', 'quota'],
  ['reverb', 'room', 'hall', 'space'],
  ['delay', 'echo', 'tape'],
  ['compressor', 'compression', 'glue', 'bus'],
  ['eq', 'equalizer', 'equaliser', 'filter'],
  ['master', 'mastering', 'loudness', 'lufs', 'limiter'],
  ['drum', 'drums', 'beat', 'beats', 'kit', 'davul'],
  ['vocal', 'vocals', 'voice', 'singer', 'vokal'],
  ['synth', 'synthesizer', 'synthesiser'],
  ['stem', 'stems', 'split', 'splitter', 'separate', 'separation'],
  ['sample', 'samples', 'loop', 'loops', 'pack', 'packs', 'kit'],
  ['preset', 'presets', 'rack', 'racks'],
];
const CANON = new Map();
for (const row of SYNONYMS) for (const w of row) if (!CANON.has(w)) CANON.set(w, row[0]);

export function tokens(s) {
  const t = fold(s).split(/[\s.-]+/).filter((w) => w && !STOP.has(w)).map((w) => CANON.get(w) || w);
  // "licence key", "activation code": next to a licence word, key/code mean the licence, not a musical key.
  return t.includes('licence') ? t.filter((w) => w !== 'key' && w !== 'keys' && w !== 'code') : t;
}

// ---- special inputs --------------------------------------------------------------------------------------------------
const KEY_RE = /^[A-Z0-9]{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{12}$/i;
export function looksLikeKey(q) {
  const t = String(q || '').trim();
  if (KEY_RE.test(t)) return true;
  const parts = t.split('-');
  return !/\s/.test(t) && parts.length >= 3 && t.replace(/-/g, '').length >= 16 && /^[A-Z0-9-]+$/i.test(t) && /\d/.test(t);
}
export const looksLikeOrder = (q) => /^#?\s?\d{3,9}$/.test(String(q || '').trim());
export const looksLikeEmail = (q) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(q || '').trim());
// Text that must never go into a URL (the /search?q= address, and so analytics page views).
export const isPrivateQuery = (q) => looksLikeKey(q) || looksLikeEmail(q);

// ---- the index -------------------------------------------------------------------------------------------------------
const pluginKind = (p) => p.kind || '';
const firstSentence = (s) => { const t = String(s || '').trim(); const m = t.match(/^(.{20,200}?[.!?])(\s|$)/); return m ? m[1] : t.slice(0, 200); };

export function buildIndex(catalog = {}) {
  const docs = [];
  const seen = new Set();
  const add = (d) => { if (!d.to || seen.has(d.group + d.to)) return; seen.add(d.group + d.to); docs.push(d); };

  const known = [...ALL_PLUGINS, ...FREE_PLUGINS, ...SOLO_PLUGINS].filter(Boolean);
  const knownSlugs = known.map((p) => p.slug);
  const live = catalogPlugins(catalog.plugins || [], knownSlugs);
  for (const p of [...known, ...live]) {
    const name = p.displayName || p.name;
    add({ group: 'plugins', title: name, sub: [pluginKind(p), p.free ? 'Free' : ''].filter(Boolean).join(' · ') || 'Plugin',
      to: p.path || `/plugins/${p.slug}`, names: [name, p.name, p.slug], text: [pluginKind(p), p.tagline, p.oneLine, p.description].filter(Boolean).join(' ') });
  }
  for (const p of mergeSamplePacks(visiblePacks(), catalog.samplePacks || [])) {
    add({ group: 'samples', title: p.name, sub: p.kindLine || 'Sample pack', to: packPath(p), names: [p.name, p.fullName, p.slug],
      text: [p.kindLine, p.fullName, (p.bpms || []).join(' ')].filter(Boolean).join(' ') + ' sample' });
  }
  for (const p of mergePresetPacks(PRESET_PACK_LIST, catalog.presetPacks || [])) {
    add({ group: 'presets', title: p.name, sub: [p.kind, p.free ? 'Free' : ''].filter(Boolean).join(' · ') || 'Preset pack',
      to: `/preset-packs#pp-${p.id}`, names: [p.name, p.id], text: [p.kind, p.tagline, p.blurb].filter(Boolean).join(' ') + ' preset' });
  }
  for (const [slug, name, line] of FREE_TOOLS) {
    add({ group: 'tools', title: name, sub: line, to: `/tools/${slug}`, names: [name, slug], text: line + ' tool browser' });
  }
  ALL_FAQ.forEach((f, i) => {
    add({ group: 'answers', title: f.q, sub: '', answer: firstSentence(f.a), full: f.a, to: `/help#faq-${i}`, names: [], text: `${f.q} ${f.q} ${f.a}` });
  });
  // Answers the Help page does not hold as a question, from the product data.
  add({ group: 'answers', title: 'Where is my licence key?', answer: KEY_ANSWER, to: '/account#keys', names: [],
    text: 'where is my licence key activate activation serial unlock code plugin asks', sub: '' });
  add({ group: 'answers', title: 'How do I download what I bought?', answer: `${learn('downloads')} ${learn('install')}`, to: '/account#install', names: [],
    text: 'how download install installer bought purchase plugin account mac windows', sub: '' });
  // The systems and formats line every paid room prints (src/data/plugins.js TRUST_LINE), up to the licence part.
  add({ group: 'answers', title: 'Which systems and DAWs do the plugins run in?', answer: TRUST_LINE.split(' · ').slice(0, 3).join(' · ') + '.', to: '/plugins', names: [],
    text: 'which system systems daw work works compatible compatibility run runs support supported mac windows vst3 au format formats', sub: '' });
  add({ group: 'answers', title: 'Do updates cost anything?', answer: learn('updates'), to: '/account#updates', names: [], text: 'update updates version new free cost plugin years', sub: '' });

  const df = new Map();
  for (const d of docs) {
    d.nameKeys = d.names.filter(Boolean).map(squash);
    d.nameTokens = new Set(d.names.flatMap(tokens));
    d.titleTokens = new Set(tokens(`${d.title} ${d.sub || ''}`));
    d.textTokens = new Set(tokens(`${d.title} ${d.sub || ''} ${d.text || ''}`));
    for (const t of d.textTokens) df.set(t, (df.get(t) || 0) + 1);
  }
  // A word few documents carry says more than one most of them carry ("licence" vs "plugin").
  const n = docs.length;
  docs.weight = (t) => 1 + Math.log(n / (df.get(t) || n));
  return docs;
}

// ---- scoring ---------------------------------------------------------------------------------------------------------
function score(d, qs, qt, weight) {
  let s = 0;
  for (const k of d.nameKeys) {
    if (!k) continue;
    if (k === qs) s = Math.max(s, 100);
    else if (qs.length >= 2 && k.startsWith(qs)) s = Math.max(s, 80);
    else if (qs.length >= 3 && k.includes(qs)) s = Math.max(s, 60);
    else if (k.length >= 3 && qs.includes(k)) s = Math.max(s, 70);   // "is kubbe a reverb" finds KUBBE
  }
  if (!qt.length) return s;
  let hit = 0;
  let matched = 0;
  for (const w of qt) {
    const k = weight(w);
    if (d.nameTokens.has(w)) { hit += 3 * k; matched += 1; continue; }
    if (d.titleTokens.has(w)) { hit += 2 * k; matched += 1; continue; }
    if (d.textTokens.has(w)) { hit += k; matched += 1; continue; }
    if (w.length >= 4 && [...d.textTokens].some((t) => t.startsWith(w))) { hit += 0.5 * k; matched += 0.5; }
  }
  return s + (hit ? 6 * hit + 30 * (matched / qt.length) : 0);
}

const GROUPS = [
  ['answers', 'Answers'],
  ['plugins', 'Plugins'],
  ['samples', 'Sample packs'],
  ['presets', 'Preset packs'],
  ['tools', 'Browser tools'],
];

let cache = { key: null, docs: null };
function indexFor(catalog) {
  const key = catalog && catalog.loaded ? catalog : 'static';
  if (cache.key !== key) cache = { key, docs: buildIndex(catalog && catalog.loaded ? catalog : {}) };
  return cache.docs;
}

export function searchSite(query, catalog, { perGroup = 6 } = {}) {
  const q = String(query || '').trim();
  const empty = { query: q, special: null, groups: [], total: 0 };
  if (!q) return empty;

  if (looksLikeKey(q)) {
    return { query: q, special: 'licence-key', total: 1, groups: [{ id: 'answers', title: 'Answers', items: [
      { title: 'That looks like a licence key', answer: KEY_ANSWER, to: '/account#keys', sub: '' },
    ] }] };
  }
  if (looksLikeOrder(q)) {
    return { query: q, special: 'order-number', total: 1, groups: [{ id: 'answers', title: 'Answers', items: [
      { title: 'That looks like an order number', answer: ORDER_ANSWER, to: '/account', sub: '' },
    ] }] };
  }

  const docs = indexFor(catalog);
  const qs = squash(q);
  const qt = [...new Set(tokens(q))];
  const question = /\?$/.test(q) || qt.length >= 3;
  const all = docs.map((d) => ({ d, s: score(d, qs, qt, docs.weight) }));
  const top = Math.max(0, ...all.map((x) => x.s));
  // Only what is close to the best match: a product name does not drag in every page that mentions it.
  const scored = all.filter((x) => x.s >= Math.max(x.d.group === 'answers' ? 24 : 18, top * 0.3));
  const groups = [];
  for (const [id, title] of GROUPS) {
    const items = scored.filter((x) => x.d.group === id).sort((a, b) => b.s - a.s).slice(0, id === 'answers' ? Math.min(perGroup, 4) : perGroup)
      .map(({ d, s }) => ({ title: d.title, sub: d.sub || '', to: d.to, answer: d.answer, score: Math.round(s) }));
    if (items.length) groups.push({ id, title, items, best: items[0].score });
  }
  // A question puts its answers first; a name puts the product it names first.
  groups.sort((a, b) => (question && a.id === 'answers' ? -1 : question && b.id === 'answers' ? 1 : b.best - a.best));
  return { query: q, special: looksLikeEmail(q) ? 'email' : null, groups, total: groups.reduce((n, g) => n + g.items.length, 0) };
}
