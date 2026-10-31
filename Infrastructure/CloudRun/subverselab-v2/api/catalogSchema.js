// The live catalogue's field schema: what the admin panel may write for a news item, a plug-in, a sample pack or a preset
// pack, and what the API accepts. ONE file for both sides (src/catalog/* imports it through Vite, api/catalog.js under
// Node): plain data and pure functions, no Node or browser APIs.
//
// Why a live catalogue (owner 2026-10-31): a new product, news item or pack is added from /admin and shows on the site
// within a minute; the site is not rebuilt or redeployed for it. The hand-written data files (src/data/*.js) stay the
// baseline the pages are prerendered from; the catalogue is laid over them in the browser (src/catalog/catalog.js) and
// in the API (api/catalog.js registers new slugs with the entitlements so orders, downloads and the manifest know them).

export const KINDS = ['news', 'plugins', 'samplePacks', 'presetPacks', 'publishers'];
export const COLLECTIONS = {
  news: 'catalog_news',
  plugins: 'catalog_plugins',
  samplePacks: 'catalog_sample_packs',
  presetPacks: 'catalog_preset_packs',
  publishers: 'catalog_publishers',
};
export const KIND_LABELS = { news: 'News', plugins: 'Plug-ins and apps', samplePacks: 'Sample packs', presetPacks: 'Preset packs', publishers: 'Publishers' };
// The kinds that are products (a room or a card in the store, an entry in the entitlements); publishers and news are not.
export const PRODUCT_KINDS = ['plugins', 'samplePacks', 'presetPacks'];

// Field types: text (one line), para (multi-line), url (https URL or a site path starting with /), path (site path or URL),
// money (USD, >= 0), int, bool, date (YYYY-MM-DD), datetime (ISO), enum, lines (list of one-line strings),
// pairs (list of [label, text]), sections (list of {heading, text}), size ([w, h]).
const id = (label, help) => ({ key: 'id', type: 'slug', label, help, required: true, max: 60 });
const published = { key: 'published', type: 'bool', label: 'Published', help: 'Off: hidden from the site (a static item with the same id is hidden too).', default: true };
const dates = [
  { key: 'released', type: 'date', label: 'Released', help: 'First day on sale / downloadable. Store order sorts newest first by the later of released and updated.' },
  { key: 'updated', type: 'date', label: 'Updated', help: 'Day the current version went live. A new version moves the product to the top.' },
];
// A product made by someone else (owner 31 Oct: producers and labels publish through the site, SubverseLab checks and
// packages): points at an id in the Publishers list; the pages print "by <name>" with their link. Empty = SubverseLab.
const publisher = { key: 'publisher', type: 'text', label: 'Publisher', help: 'The id of a publisher from the Publishers list (a producer, label or studio whose product this is). Empty: SubverseLab.', max: 60, pattern: '^[a-z0-9-]*$', patternHelp: 'a publisher id: lowercase letters, digits and dashes' };
const ls = [
  { key: 'price', type: 'money', label: 'Price (USD)', help: 'Empty = not sold yet (the key reads "Available soon"). Price floor: never below any earlier price.' },
  { key: 'checkout', type: 'url', label: 'Lemon Squeezy checkout URL', help: 'https://subverselab.lemonsqueezy.com/checkout/buy/<uuid>', max: 300 },
  { key: 'lsProductId', type: 'text', label: 'Lemon Squeezy product id', help: 'Digits. Maps a paid order to this product (replaces an LS_PRODUCT_SLUGS entry).', max: 20, pattern: '^[0-9]*$', patternHelp: 'digits only' },
];

export const FIELDS = {
  news: [
    id('Key', 'Lowercase letters, digits and dashes. Using an existing key (boeb, torna, jingfang, testers, elek, free-plugins, manuals, tool-credits, family-thanks) edits that frame.'),
    { key: 'kicker', type: 'text', label: 'Kicker', help: 'The small line above the title, e.g. "TORNA · graphic equalizer · out now".', max: 120 },
    { key: 'dateLabel', type: 'text', label: 'Date label', help: 'Optional, e.g. "19 November".', max: 60 },
    { key: 'title', type: 'text', label: 'Title', max: 300, required: true },
    { key: 'line', type: 'para', label: 'Line', help: 'One paragraph. Sells and stays true; no product counts, no "coming soon", no "AI".', max: 1500, required: true },
    { key: 'image', type: 'url', label: 'Picture', help: 'Upload below, or a site path like /news/torna-box.webp.', max: 500, upload: 'image' },
    { key: 'alt', type: 'text', label: 'Picture description (alt)', max: 300 },
    { key: 'bare', type: 'enum', label: 'Picture frame', options: [['', 'Window (default)'], ['bare', 'Bare: no frame, soft shadow'], ['flat', 'Flat drawing: no frame, no shadow']] },
    { key: 'to', type: 'path', label: 'Button link', help: 'A site path (/plugins/torna) or https URL.', max: 200 },
    { key: 'cta', type: 'text', label: 'Button text', max: 80 },
    { key: 'order', type: 'int', label: 'Order', help: 'Lower comes first. Static frames are 10, 20, 30 … in their current order; 15 goes between the first two.' },
    { key: 'publishAt', type: 'datetime', label: 'Show from', help: 'Optional ISO moment, e.g. 2026-11-19T00:00:00+03:00.' },
    { key: 'unpublishAt', type: 'datetime', label: 'Hide from', help: 'Optional ISO moment.' },
    published,
  ],
  plugins: [
    id('Slug', 'URL and order key: /plugins/<slug>. Lowercase letters and digits.'),
    { key: 'displayName', type: 'text', label: 'Name', help: 'As shown: TORNA. ASCII only; no brand prefix.', max: 60, required: true },
    { key: 'kind', type: 'text', label: 'Kind', help: 'e.g. Graphic equalizer', max: 80, required: true },
    { key: 'model', type: 'text', label: 'Model', help: 'e.g. TR-83', max: 40 },
    { key: 'tagline', type: 'text', label: 'Tagline', max: 300, required: true },
    { key: 'title', type: 'text', label: 'Page title', help: 'Browser title; "<Name>: … | SubverseLab" when empty.', max: 200 },
    { key: 'description', type: 'para', label: 'Meta description', max: 500 },
    { key: 'intro', type: 'para', label: 'Intro paragraph', max: 3000, required: true },
    { key: 'cardImage', type: 'url', label: 'Panel picture (card and room)', help: 'The real panel, PNG/WEBP, 16:6 or so. Upload or site path.', max: 500, upload: 'image', required: true },
    { key: 'imageSize', type: 'size', label: 'Panel picture size', help: 'width,height in pixels, e.g. 1600,602' },
    { key: 'og', type: 'url', label: 'Share picture (og)', help: '1200x630 PNG/JPG; the panel picture when empty.', max: 500, upload: 'image' },
    { key: 'boxImage', type: 'url', label: 'Box picture', help: 'The clear product box for /plugins (box_renders.py, transparent WEBP/PNG). Without one the page draws a box from the panel picture.', max: 500, upload: 'image' },
    { key: 'modes', type: 'modes', label: 'Panel views', help: 'Optional extra views: name, picture, one line each.' },
    { key: 'sections', type: 'sections', label: 'Sections', help: 'Heading + paragraph, in order.' },
    { key: 'controls', type: 'pairs', label: 'Controls', help: 'Control name + what it does.' },
    { key: 'controlsNote', type: 'para', label: 'Controls note', max: 600 },
    { key: 'formats', type: 'text', label: 'Formats line', help: 'e.g. Standalone app, VST3 and AU on macOS (Apple Silicon and Intel); standalone app and VST3 on Windows (64-bit)', max: 300 },
    { key: 'trust', type: 'para', label: 'Trust line', help: 'Under the price. Leave empty for the standard line.', max: 600 },
    { key: 'manual', type: 'url', label: 'Manual PDF', max: 500, upload: 'pdf' },
    { key: 'free', type: 'bool', label: 'Free plug-in', help: 'Free: a $0 Lemon Squeezy checkout, no card.', default: false },
    { key: 'noKey', type: 'bool', label: 'No licence key', help: 'The site never shows a key for it (every new product: on).', default: true },
    publisher,
    ...ls,
    { key: 'launchPrice', type: 'money', label: 'Launch price (USD)', help: 'Optional lower price until the date below; shown struck against the regular price.' },
    { key: 'launchEnds', type: 'date', label: 'Launch price ends' },
    { key: 'musehub', type: 'url', label: 'MuseHub page', help: 'Optional: shows the "Download with MuseHub" badge.', max: 300 },
    ...dates,
    published,
  ],
  samplePacks: [
    id('Slug', '/sample-packs/<slug>. Lowercase letters and digits.'),
    { key: 'name', type: 'text', label: 'Name', help: 'e.g. Mirage', max: 60, required: true },
    { key: 'fullName', type: 'text', label: 'Full name', help: 'e.g. SVL Mirage (the zip and product name).', max: 80 },
    { key: 'kindLine', type: 'text', label: 'Kind line', help: 'e.g. Anatolian melodic loops with drums', max: 160, required: true },
    { key: 'madeLine', type: 'para', label: 'Made line', help: 'One honest sentence on how it was made.', max: 600 },
    { key: 'summary', type: 'para', label: 'Summary', max: 1500 },
    { key: 'inside', type: 'lines', label: "What's inside", help: 'One item per line, read from the pack (counts, format, size).' },
    { key: 'cover', type: 'url', label: 'Cover', help: 'Square, 1200x1200 or more. Upload or site path.', max: 500, upload: 'image', required: true },
    { key: 'snippet', type: 'url', label: 'Preview audio', help: 'MP3 made only from the pack’s own files.', max: 500, upload: 'audio' },
    { key: 'peaks', type: 'url', label: 'Preview waveform (peaks JSON)', help: 'Written by the panel when the preview is uploaded (the store card and the pack page draw the waveform from it); from a terminal: node scripts/pack-peaks.js <mp3>.', max: 500 },
    { key: 'scenes', type: 'lines', label: 'Preview scenes', help: 'One per line: seconds and a name, e.g. "0 Intro" or "12.5 Hook". Shown as markers under the waveform.' },
    publisher,
    ...ls,
    { key: 'listedAt', type: 'datetime', label: 'On sale from', help: 'ISO moment the pack is in the store (sweep cut-off). Never moved later.', required: true },
    ...dates,
    published,
  ],
  presetPacks: [
    id('Id', '/preset-packs card key, e.g. ru8-drum-pack.'),
    { key: 'name', type: 'text', label: 'Name', max: 60, required: true },
    { key: 'kind', type: 'text', label: 'Kind', help: 'e.g. Ableton Live Drum Racks', max: 80, required: true },
    { key: 'cover', type: 'url', label: 'Cover (600x600)', max: 500, upload: 'image', required: true },
    { key: 'image', type: 'url', label: 'Card picture', help: 'The racks as Live shows them; the cover when empty.', max: 500, upload: 'image' },
    { key: 'imageAlt', type: 'text', label: 'Card picture description', max: 300 },
    { key: 'imageSize', type: 'size', label: 'Card picture size', help: 'width,height' },
    { key: 'previewAudio', type: 'url', label: 'Preview audio', max: 500, upload: 'audio' },
    { key: 'summary', type: 'para', label: 'Summary', max: 1500, required: true },
    { key: 'inside', type: 'lines', label: "What's inside", help: 'One item per line.' },
    { key: 'requirements', type: 'lines', label: 'Requirements', help: 'One per line, e.g. Ableton Live 12 Standard or Suite.' },
    { key: 'install', type: 'para', label: 'Install', max: 600 },
    { key: 'download', type: 'para', label: 'Download line', max: 300 },
    { key: 'roomTo', type: 'path', label: 'Related room link', help: 'e.g. /plugins/ru8', max: 200 },
    { key: 'roomLabel', type: 'text', label: 'Related room label', help: 'e.g. About RU-8', max: 60 },
    { key: 'free', type: 'bool', label: 'Free for members', help: 'Sign in and download; no checkout.', default: false },
    publisher,
    ...ls,
    { key: 'listedAt', type: 'datetime', label: 'On sale from', help: 'ISO moment (preset sweep cut-off).' },
    ...dates,
    published,
  ],
  publishers: [
    id('Id', 'Lowercase letters, digits and dashes: the key a product\'s Publisher field points at, e.g. babasultan.'),
    { key: 'name', type: 'text', label: 'Name', help: 'As printed on the site: "by <Name>".', max: 80, required: true },
    { key: 'role', type: 'enum', label: 'Role', options: [['producer', 'Producer'], ['label', 'Label'], ['studio', 'Studio'], ['partner', 'Partner']], default: 'producer' },
    { key: 'link', type: 'url', label: 'Link', help: 'Their page (https). The name links to it.', max: 300 },
    { key: 'avatar', type: 'url', label: 'Picture', help: 'Square. Upload or site path.', max: 500, upload: 'image' },
    { key: 'bio', type: 'para', label: 'About', help: 'One or two sentences, in their words or ours. No "AI".', max: 1500 },
    { key: 'location', type: 'text', label: 'Location', max: 80 },
    { key: 'email', type: 'text', label: 'E-mail (private)', help: 'Never shown on the site; for payouts and questions.', max: 120 },
    { key: 'status', type: 'enum', label: 'Status', options: [['active', 'Active: products may point at this publisher'], ['ended', 'Ended: existing products keep the name, nothing new']], default: 'active' },
    { key: 'joined', type: 'date', label: 'Joined' },
    published,
  ],
};

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,59}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isHttps = (s) => /^https:\/\/[^\s]+$/.test(s);
const isSitePath = (s) => /^\/[^\s]*$/.test(s);
const str = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());

// Validates and normalises one document. Returns { doc, errors }. Unknown keys are dropped; an empty optional field is
// stored as '' / null so the panel round-trips it. `partial` keeps missing fields out instead of defaulting them.
export function cleanDoc(kind, input, { partial = false } = {}) {
  const fields = FIELDS[kind];
  const errors = [];
  const doc = {};
  if (!fields) return { doc, errors: [`unknown kind ${kind}`] };
  const src = input && typeof input === 'object' ? input : {};
  for (const f of fields) {
    const has = Object.prototype.hasOwnProperty.call(src, f.key);
    if (!has && partial) continue;
    const raw = src[f.key];
    const bad = (why) => errors.push(`${f.label}: ${why}`);
    switch (f.type) {
      case 'slug': {
        const v = str(raw).toLowerCase();
        if (!SLUG_RE.test(v)) bad('lowercase letters, digits and dashes, 1-60 characters');
        doc[f.key] = v;
        break;
      }
      case 'text': case 'para': {
        const v = f.type === 'text' ? str(raw).replace(/\s+/g, ' ') : str(raw).replace(/\r\n?/g, '\n');
        if (f.required && !v) bad('required');
        if (f.max && v.length > f.max) bad(`at most ${f.max} characters`);
        if (f.pattern && v && !new RegExp(f.pattern).test(v)) bad(f.patternHelp || 'not in the right form');
        doc[f.key] = v;
        break;
      }
      case 'url': case 'path': {
        const v = str(raw);
        if (f.required && !v) bad('required');
        if (v && !(isHttps(v) || isSitePath(v))) bad('an https URL or a site path starting with /');
        if (v.length > (f.max || 500)) bad(`at most ${f.max || 500} characters`);
        doc[f.key] = v;
        break;
      }
      case 'money': {
        if (raw === '' || raw == null) { doc[f.key] = null; break; }
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0 || n > 100000) bad('a US dollar amount, 0 or more');
        doc[f.key] = Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
        break;
      }
      case 'int': {
        if (raw === '' || raw == null) { doc[f.key] = null; break; }
        const n = Number(raw);
        if (!Number.isInteger(n) || n < -100000 || n > 100000) bad('a whole number');
        doc[f.key] = Number.isInteger(n) ? n : null;
        break;
      }
      case 'bool': {
        doc[f.key] = raw == null || raw === '' ? Boolean(f.default) : raw === true || raw === 'true' || raw === 1 || raw === '1';
        break;
      }
      case 'date': {
        const v = str(raw);
        if (v && (!DATE_RE.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`)))) bad('YYYY-MM-DD');
        if (f.required && !v) bad('required');
        doc[f.key] = v;
        break;
      }
      case 'datetime': {
        const v = str(raw);
        if (v && Number.isNaN(Date.parse(v))) bad('an ISO date and time, e.g. 2026-11-01T00:00:00+03:00');
        if (f.required && !v) bad('required');
        doc[f.key] = v ? new Date(Date.parse(v)).toISOString() : '';
        break;
      }
      case 'enum': {
        const v = str(raw) || (f.default ?? '');
        if (!f.options.some(([o]) => o === v)) bad('not one of the choices');
        doc[f.key] = v;
        break;
      }
      case 'lines': {
        const list = Array.isArray(raw) ? raw : str(raw).split('\n');
        const v = list.map((x) => str(x).replace(/\s+/g, ' ')).filter(Boolean).slice(0, 40);
        if (v.some((x) => x.length > 300)) bad('each line at most 300 characters');
        doc[f.key] = v;
        break;
      }
      case 'pairs': {
        const list = Array.isArray(raw) ? raw : [];
        const v = list.map((p) => (Array.isArray(p) ? [str(p[0]), str(p[1])] : [str(p?.label ?? p?.[0]), str(p?.text ?? p?.[1])])).filter(([a, b]) => a || b).slice(0, 40);
        if (v.some(([a, b]) => !a || !b)) bad('every control needs a name and a text');
        if (v.some(([a, b]) => a.length > 120 || b.length > 600)) bad('name at most 120, text at most 600 characters');
        doc[f.key] = v;
        break;
      }
      case 'sections': {
        const list = Array.isArray(raw) ? raw : [];
        const v = list.map((s) => ({ heading: str(s?.heading).replace(/\s+/g, ' '), text: str(s?.text) })).filter((s) => s.heading || s.text).slice(0, 20);
        if (v.some((s) => !s.heading || !s.text)) bad('every section needs a heading and a text');
        if (v.some((s) => s.heading.length > 160 || s.text.length > 3000)) bad('heading at most 160, text at most 3000 characters');
        doc[f.key] = v;
        break;
      }
      case 'modes': {
        const list = Array.isArray(raw) ? raw : [];
        const v = list.map((m) => ({ key: str(m?.key || m?.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), name: str(m?.name).replace(/\s+/g, ' '), image: str(m?.image), text: str(m?.text) })).filter((m) => m.name || m.image).slice(0, 12);
        if (v.some((m) => !m.name || !m.image)) bad('every view needs a name and a picture');
        if (v.some((m) => !(isHttps(m.image) || isSitePath(m.image)))) bad('a view picture is an https URL or a site path');
        if (v.some((m) => m.text.length > 600 || m.name.length > 60)) bad('view name at most 60, text at most 600 characters');
        doc[f.key] = v;
        break;
      }
      case 'size': {
        const parts = Array.isArray(raw) ? raw : str(raw).split(/[x,×\s]+/).filter(Boolean);
        if (!parts.length) { doc[f.key] = null; break; }
        const w = Number(parts[0]); const h = Number(parts[1]);
        if (!Number.isInteger(w) || !Number.isInteger(h) || w < 16 || h < 16 || w > 10000 || h > 10000) bad('width,height in pixels');
        doc[f.key] = Number.isInteger(w) && Number.isInteger(h) ? [w, h] : null;
        break;
      }
      default:
        break;
    }
  }
  // Cross-field rules.
  if (kind !== 'news' && !partial) {
    if (doc.checkout && !isHttps(doc.checkout)) errors.push('Checkout: an https URL');
    if (doc.checkout && !/lemonsqueezy\.com\//.test(doc.checkout)) errors.push('Checkout: a Lemon Squeezy checkout URL');
    if (kind === 'plugins' && doc.launchPrice != null && doc.price != null && doc.launchPrice > doc.price) errors.push('Launch price: not above the regular price');
    if (kind === 'plugins' && doc.launchPrice != null && !doc.launchEnds) errors.push('Launch price ends: required with a launch price');
    if (doc.released && doc.updated && doc.updated < doc.released) errors.push('Updated: not before released');
  }
  return { doc, errors };
}

// The later of released / updated ('' when undated), same rule as src/data/productDates.js latestRelease.
export const latestOf = (d) => ((d?.updated || '') > (d?.released || '') ? d.updated : (d?.released || ''));

// Is this item visible at `now`? Published, and inside its optional time window.
export function liveAt(doc, now = Date.now()) {
  if (!doc || doc.published === false) return false;
  if (doc.publishAt && Date.parse(doc.publishAt) > now) return false;
  if (doc.unpublishAt && Date.parse(doc.unpublishAt) <= now) return false;
  return true;
}

// Order of the static news frames: 10, 20, 30 … so a live item can be placed between two of them.
export const staticOrder = (index) => (index + 1) * 10;
