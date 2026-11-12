// Bakes real, JS-free HTML into dist/, one file per known public route:
// per-route <title>/<meta description>/<link canonical>/OG/Twitter tags,
// JSON-LD structured data, AND the page's actual visible content.
//
// The content part is the whole point. This service ships a Vite SPA whose
// index.html has an empty <div id="root"> — every word on the site is
// painted by JavaScript at runtime. Googlebot renders JS eventually, but the
// AI crawlers that increasingly answer questions about a site (GPTBot,
// ClaudeBot, PerplexityBot, CCBot and friends) do not execute JS at all.
// Before this, everything except /help served ~1.4KB of markup with a title,
// a description, and literally nothing else — which is exactly why asking an
// AI assistant about subverselab.com produced "it doesn't seem to have much
// information." The guides in Firestore run 2,000–8,700 characters each and
// were completely invisible. Now each route is written out with its real
// text baked in.
//
// Runs after `vite build` (it needs dist/index.html as a template — the
// built, correctly-hashed <script>/<link> tags already live there) and
// writes dist/learn/{slug}/index.html, dist/tools/{slug}/index.html,
// dist/learn/index.html, dist/help/index.html, and overwrites the root
// dist/index.html with real homepage meta and content. server.js serves a
// real file at those paths before falling back to the SPA shell, so a
// crawler hitting /learn/sensei gets fully-formed HTML with no JS needed.
//
// Injecting body content is safe because main.jsx mounts via
// ReactDOM.createRoot(...).render(...), not hydrateRoot() — React fully
// replaces #root's children on load rather than reconciling against them.
// A real visitor's browser overwrites all of this a moment later with the
// identical live content, so there is no hydration mismatch and nothing a
// crawler sees differs from what a user sees. react-helmet-async likewise
// re-sets the same head tags client-side.
//
// This is a static snapshot, not live SSR: like sitemap.xml, it's only as
// fresh as the last subverselab-v2 deploy. Content synced straight to
// Firestore (the normal path — see Rules/05_SYNC.md) won't get its own
// prerendered page until this service is next rebuilt.
import { writeFileSync, mkdirSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { fetchContent, ROOT, SITE_URL } from './lib/fetchContent.js';
import { GENERAL_FAQ, TOOL_FAQ, LOOM_FAQ, CONTACT_FAQ, ALL_FAQ } from '../src/data/faqContent.js';
import { stripToolPrefix } from '../src/utils/toolName.js';
import {
  PLUGINS_INDEX, PLUGINS, LAUNCH, LAUNCH2, TESTERS, SAMPLE_PACKS, PRESET_PACKS, LAUNCH2_PLUGINS, FAMILY_ONLY_PLUGINS, FAMILY_PLUGINS, FREE_PLUGINS, LINE2_PLUGINS, SOLO_PLUGINS, line2AvailableLine, PRICES, FORMATS, CHECKOUT,
  FAMILY_NAME, FAMILY_PRICE, FAMILY_OFFER_TERMS, FAMILY_IMAGE, UPDATES_LINE, isFamilyOfferOver, LAUNCH2_NAME,
  ALL_PLUGINS, FAMILY_REGULAR_PRICE, familyOfferEndLabel, SHOWCASE_SLUGS, SHOWCASE_FREE_SLUGS, SHOWCASE_SOON_SLUGS, SHOWCASE_SOLO_SLUGS, SHOWCASE_NEW_SLUGS,
  priceText, currentPrice, priceWord, launchPriceActive, launchNote, ACTIVATION_SHORT, ACTIVATION_NO_KEY,
  ACTIVATION_LINE, ACTIVATION_LINE_FREE, TRUST_LINE, TRUST_LINE_FREE, trustLineFor, RU8_ON_SALE, JINGFANG_ON_SALE, AHENK_ON_SALE, STORE_PLUGINS, DOWNLOAD_ROOM_PLUGINS,
} from '../src/data/plugins.js';
import { byLatestRelease } from '../src/data/productDates.js';
// Store order (root CLAUDE.md, owner 2026-10-28): every product list newest release first (src/data/productDates.js).
const newestFirst = (slugs) => byLatestRelease(slugs);
import { MANUALS } from '../src/data/pluginManuals.js';
import { visiblePacks, packPath, packTitle, packDescription, plateRows, specList, contentsLine, formatLine, folderLabel, mmss, HONESTY_LINE } from '../src/data/packFacts.js';
import { packOffer, priceLabel } from '../src/data/samplePackPrices.js';
import { PRESET_PACK_LIST } from '../src/data/presetPacks.js';
import { HOME, TOOLS, LEARN_INDEX, HELP } from '../src/data/siteMeta.js';
import { liveNews } from '../src/data/news.js';
import { LEGAL_PAGES, LEGAL_UPDATED, LEGAL_EMAIL } from '../src/data/legalContent.js';
import { FORUM_SEED_TOPICS } from '../src/data/forumSeed.js';

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Markdown ───────────────────────────────────────────────────────────────
// The guide bodies use a deliberately small subset (verified across every
// published article): ## / ### headings, numbered lists, | tables, **bold**,
// --- rules, and plain paragraphs. No bullets, blockquotes, code fences or
// LaTeX — the site's own client-side renderer doesn't support those either,
// so authors don't write them. This mirrors that subset rather than pulling
// in a full markdown dependency for six documents.

function renderInline(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

// Strips markdown down to plain prose — used for meta descriptions, where a
// raw body would otherwise leak "## Overview ..." into the search snippet.
function stripMarkdown(md = '') {
  return String(md)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*\|.*$/gm, '')
    .replace(/^\s*-{3,}\s*$/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// Guide bodies open with a "## Overview" heading, so naively stripping
// markdown yields a description starting with the dead word "Overview".
// Take the first real paragraph instead — that's the sentence an author
// actually wrote to explain the thing.
function firstProse(md = '') {
  for (const block of String(md).split(/\n\s*\n/)) {
    const t = block.trim();
    if (!t || t.startsWith('#') || t.startsWith('|') || /^-{3,}$/.test(t)) continue;
    return t;
  }
  return '';
}

// Meta descriptions want ~155 chars, cut on a word boundary so the snippet
// doesn't end mid-word.
function toMetaDescription(source, fallback = '', limit = 155) {
  const text = stripMarkdown(firstProse(source)) || stripMarkdown(firstProse(fallback));
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:]$/, '')}…`;
}

function renderTable(rows) {
  // A markdown table's second row is the |---|---| separator, not data.
  const cells = (row) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const [header, ...rest] = rows;
  const bodyRows = rest.filter((r) => !/^\s*\|?[\s:-]+\|[\s|:-]*$/.test(r));
  const head = cells(header).map((c) => `<th>${renderInline(c)}</th>`).join('');
  const body = bodyRows
    .map((r) => `<tr>${cells(r).map((c) => `<td>${renderInline(c)}</td>`).join('')}</tr>`)
    .join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function mdToHtml(md = '') {
  const lines = String(md).split('\n');
  const out = [];
  let listBuffer = [];
  let tableBuffer = [];

  const flushList = () => {
    if (!listBuffer.length) return;
    out.push(`<ol>${listBuffer.map((i) => `<li>${renderInline(i)}</li>`).join('')}</ol>`);
    listBuffer = [];
  };
  const flushTable = () => {
    if (!tableBuffer.length) return;
    out.push(renderTable(tableBuffer));
    tableBuffer = [];
  };
  const flushAll = () => { flushList(); flushTable(); };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) { flushAll(); continue; }

    if (line.startsWith('|')) { flushList(); tableBuffer.push(line); continue; }
    flushTable();

    const orderedItem = line.match(/^\d+\.\s+(.*)$/);
    if (orderedItem) { listBuffer.push(orderedItem[1]); continue; }
    flushList();

    if (/^-{3,}$/.test(line)) { out.push('<hr />'); continue; }
    if (line.startsWith('### ')) { out.push(`<h3>${renderInline(line.slice(4))}</h3>`); continue; }
    if (line.startsWith('## ')) { out.push(`<h2>${renderInline(line.slice(3))}</h2>`); continue; }
    if (line.startsWith('# ')) { out.push(`<h2>${renderInline(line.slice(2))}</h2>`); continue; }

    out.push(`<p>${renderInline(line)}</p>`);
  }

  flushAll();
  return out.join('\n      ');
}

// ── Head ───────────────────────────────────────────────────────────────────

// Share cards. A link with no og:image renders as a bare grey box everywhere
// it gets posted, and AI answer surfaces increasingly show one too.
//
// Brand-level pages (home, guide index, help) get cards generated by the
// brand kit in Assets/Brand/_kit — cream ground, dark-green ink, the house
// visual language. Tool and guide pages keep their own product cover
// instead: a share card showing the actual tool is worth more than a generic
// brand card, and per-product art is deliberately not forced into the house
// style (see Assets/README.md).
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;
const LEARN_OG_IMAGE = `${SITE_URL}/og-learn.jpg`;
const HELP_OG_IMAGE = `${SITE_URL}/og-help.jpg`;

// react-helmet-async claims a tag only if it carries data-rh="true". Without
// it, Helmet appends its own copy on client-side navigation and the
// prerendered one stays behind — the page then serves two <link rel=canonical>
// and two descriptions, with the stale homepage values listed first. Marking
// them here hands ownership over, so Helmet replaces these tags instead of
// duplicating them.
const RH = ' data-rh="true"';

// Pages that must stay out of search results but whose links may still be followed.
const NOINDEX = 'noindex,follow';

// `canonical` is optional (the 404 page and the private pages carry none: a canonical on them would point crawlers
// at a URL that is not that page). `bare: true` writes only the title, robots and theme-colour tags: no
// description, no Open Graph, no Twitter card (/account, /admin).
function buildHead({ title, description, canonical, image, icon, type = 'website', jsonLd = [], robots, bare = false }) {
  const t = escapeHtml(title);
  if (bare) {
    return `<title${RH}>${t}</title>${robots ? `\n    <meta${RH} name="robots" content="${escapeHtml(robots)}" />` : ''}
    <meta name="theme-color" content="#F2EFE7" />`;
  }
  const d = escapeHtml(description);
  const ogImage = image || DEFAULT_OG_IMAGE;
  // Dimensions are declared only for the brand cards, which really are 1200x630.
  // Product covers are whatever size their tool's own art happens to be — 1600x900
  // for Sensei, 1024x1024 for the Splitter — and stating 1200x630 for those told
  // every crawler a measurable lie, which is worse than saying nothing: og:image
  // width and height are optional, and a scraper that trusts them mis-crops the
  // card it renders.
  const isBrandCard = [DEFAULT_OG_IMAGE, LEARN_OG_IMAGE, HELP_OG_IMAGE].includes(ogImage);
  const img = `\n    <meta${RH} property="og:image" content="${escapeHtml(ogImage)}" />${
    isBrandCard
      ? `\n    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />`
      : ''
  }`;
  const schema = jsonLd
    .map((obj) => `\n    <script type="application/ld+json">${JSON.stringify(obj)}</script>`)
    .join('');
  return `<title${RH}>${t}</title>
    ${icon ? `<link${RH} rel="icon" type="image/svg+xml" href="${escapeHtml(icon)}" />` : ''}
    <meta${RH} name="description" content="${d}" />
    ${canonical ? `<link${RH} rel="canonical" href="${canonical}" />` : ''}${
    robots ? `\n    <meta${RH} name="robots" content="${escapeHtml(robots)}" />` : ''
  }
    <meta name="theme-color" content="#F2EFE7" />
    <meta${RH} property="og:site_name" content="SubverseLab" />
    <meta${RH} property="og:title" content="${t}" />
    <meta${RH} property="og:description" content="${d}" />
    <meta${RH} property="og:type" content="${type}" />
    ${canonical ? `<meta${RH} property="og:url" content="${canonical}" />` : ''}${img}
    <meta${RH} name="twitter:card" content="summary_large_image" />
    <meta${RH} name="twitter:image" content="${escapeHtml(ogImage)}" />
    <meta${RH} name="twitter:title" content="${t}" />
    <meta${RH} name="twitter:description" content="${d}" />${schema}`;
}

function renderPage(template, head) {
  // The template's own <title>…</title> is the only tag guaranteed to exist
  // in dist/index.html (Vite doesn't add meta/canonical/OG on its own) —
  // replacing it in place is enough to swap in the full block after it.
  return template.replace(/<title>.*?<\/title>/s, head);
}

function renderPageWithBody(template, head, bodyHtml) {
  return renderPage(template, head).replace(
    '<div id="root"></div>',
    `<div id="root">${bodyHtml}</div>`
  );
}

// Prerendered markup is a crawler-facing snapshot that React discards on
// mount, so it carries no classes — just one wrapper keeping it readable in
// the split second before the app takes over, and for anyone reading with
// JS disabled.
function page(inner) {
  return `
    <div style="max-width:820px;margin:0 auto;padding:64px 20px 96px;line-height:1.65;">${inner}
    </div>`;
}

function siteNav() {
  return `
      <nav><a href="/">Tools</a> · <a href="/learn">Guides</a> · <a href="/help">Help and FAQ</a></nav>`;
}

// ── Structured data ────────────────────────────────────────────────────────

const ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'SubverseLab',
  url: `${SITE_URL}/`,
  description: 'Browser tools for music producers, free to start.',
  sameAs: [
    'https://www.youtube.com/@SubverseLab',
    'https://www.instagram.com/subverse_lab/',
    'https://soundcloud.com/subverselab',
    'https://www.tiktok.com/@subverselab',
    'https://mastodon.social/@SubverseLab',
    'https://bsky.app/profile/subverselab.bsky.social',
    'https://ko-fi.com/subverselab',
    'https://x.com/SubverseLab',
  ],
};

function softwareApplicationSchema(product, canonical) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: product.title,
    url: canonical,
    description: stripMarkdown(product.description || ''),
    applicationCategory: 'MultimediaApplication',
    operatingSystem: product.id === 'subverse-splitter' ? 'macOS, Windows' : 'Any (web browser)',
    ...(product.coverImage ? { image: product.coverImage } : {}),
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
    publisher: { '@type': 'Organization', name: 'SubverseLab', url: `${SITE_URL}/` },
  };
}

function articleSchema(article, canonical, description) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: article.title,
    url: canonical,
    description,
    ...(article.updatedAt?.toDate ? { dateModified: article.updatedAt.toDate().toISOString() } : {}),
    author: { '@type': 'Organization', name: 'SubverseLab' },
    publisher: { '@type': 'Organization', name: 'SubverseLab', url: `${SITE_URL}/` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
  };
}

function breadcrumbSchema(trail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ── Page bodies ────────────────────────────────────────────────────────────

// The call to action a product declares for itself — "Analyze a Mix" rather
// than "Open Mix Check". Naming the job is what turns a link into
// a reason to click, and keeping the prerendered copy identical to the button
// the app renders means a crawler and a visitor read the same invitation.
function primaryAction(product) {
  const label = product.actions?.[0]?.label;
  return label || `Open ${product.title}`;
}

// MIHENK-style panel tour (plugin.tour): the same steps as PanelTour.jsx, as plain HTML for crawlers.
function tourHtml(pl) {
  if (!pl.tour) return '';
  const steps = pl.tour.steps.map((st, i) => `<li><h3>${i + 1}. ${escapeHtml(st.heading)}</h3><p>${escapeHtml(st.text)}</p></li>`).join('');
  const practical = (pl.tour.practical || []).map((t) => `<li>${escapeHtml(t)}</li>`).join('');
  return `\n      <h2>${escapeHtml(pl.tour.heading)}</h2>\n      <p>${escapeHtml(pl.tour.lead)}</p>\n      <ol>${steps}</ol>${practical ? `\n      <h3>In practice</h3><ul>${practical}</ul>` : ''}`;
}

// "A", "A and B", "A, B and C" — the free plug-ins named from the data, never a hand-kept list.
const listText = (names) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

// The homepage is the news since 2026-10-26 (owner); the tool list moved to /tools (buildToolsBody).
function buildHomeBody() {
  return page(`
      <h1>SubverseLab: Plugins and Tools for Music Producers</h1>
      <p>SubverseLab builds plugins for macOS and Windows (VST3 and AU; ${escapeHtml(listText(newestFirst(SHOWCASE_FREE_SLUGS).map((slug) => FREE_PLUGINS.find((x) => x.slug === slug).displayName)))} ${SHOWCASE_FREE_SLUGS.length === 1 ? 'is' : 'are'} free) and browser tools for arranging, generating, measuring, mixing and separating music. The tools run in the browser with nothing to install and are free to start; some ask for a free account. Where a tool has a daily limit, the credits that come with any plugin purchase pay for more.</p>
      ${siteNav()}
      <section>
        <h2>News</h2>
        ${liveNews().map((n) => `<article><h3>${escapeHtml([n.kicker, n.date].filter(Boolean).join(' · '))}</h3><p><strong>${escapeHtml(n.title)}</strong> ${escapeHtml(n.line)}</p>${n.to ? `<p><a href="${n.to}">${escapeHtml(n.cta)}</a></p>` : ''}</article>`).join('')}
      </section>
      <section>
        <h2>Audio plugins</h2>
        <p>VST3 and AU plugins from SubverseLab. Each is sold on its own.</p>
        <ul>${newestFirst(SHOWCASE_SLUGS).map((slug) => { const pl = ALL_PLUGINS.find((x) => x.slug === slug); return `<li><a href="${pl.path}">${escapeHtml(pl.displayName)}</a>: ${escapeHtml(pl.tagline)} ($${PRICES[slug]})</li>`; }).join('')}</ul>
        <p>Also free, forever:</p>
        <ul>${newestFirst(SHOWCASE_FREE_SLUGS).map((slug) => { const pl = FREE_PLUGINS.find((x) => x.slug === slug); return `<li><a href="${pl.path}">${escapeHtml(pl.displayName)}</a>: ${escapeHtml(pl.tagline)} (free)</li>`; }).join('')}</ul>
        <p>Sold on their own:</p>
        <ul>${newestFirst([...SHOWCASE_NEW_SLUGS, ...SHOWCASE_SOLO_SLUGS]).map((slug) => { const pl = SOLO_PLUGINS.find((x) => x.slug === slug); return `<li><a href="${pl.path}">${escapeHtml(pl.displayName)}</a>: ${escapeHtml(pl.tagline)} (${escapeHtml(priceText(slug))})</li>`; }).join('')}</ul>
        <p>Coming soon:</p>
        <ul>${newestFirst(SHOWCASE_SOON_SLUGS).map((slug) => { const pl = LINE2_PLUGINS.find((x) => x.slug === slug); return `<li><a href="${pl.path}">${escapeHtml(pl.displayName)}</a>: ${escapeHtml(pl.tagline)} (${escapeHtml(line2AvailableLine(pl))})</li>`; }).join('')}</ul>
        <p><a href="/plugins">See all plugins</a></p>
      </section>
      <section>
        <h2>Guides</h2>
        <p>Every tool has a written guide explaining what it does, how to use it, and what its limits are. <a href="/learn">Browse all guides</a> or read the <a href="/help">help and FAQ</a>.</p>
      </section>`);
}

// /tools (2026-10-26): the browser tools, which used to sit on the homepage.
function buildToolsBody(products, articleBySlug) {
  const toolSections = products.map((p) => {
    const guide = articleBySlug.get(p.id);
    const links = [
      `<a href="/tools/${p.slug || p.id}">${escapeHtml(primaryAction(p))}</a>`,
      guide ? `<a href="/learn/${guide.slug}">Read the ${escapeHtml(p.title)} guide</a>` : null,
    ].filter(Boolean).join(' · ');
    return `
      <section>
        <h2>${escapeHtml(p.title)}</h2>
        ${p.subtitle ? `<p><strong>${escapeHtml(p.subtitle)}</strong></p>` : ''}
        <p>${escapeHtml(stripMarkdown(p.description || ''))}</p>
        ${links ? `<p>${links}</p>` : ''}
      </section>`;
  }).join('');

  return page(`
      <h1>Browser tools for music producers</h1>
      <p>Sketch an arrangement, write a drum pattern, check your mix against a reference or split a song into stems, right in your browser. Each one does one job, with nothing to install, and every one is free to start; some ask for a free account. Where a tool has a daily limit, the credits that come with any plugin purchase pay for more.</p>
      ${siteNav()}
      ${toolSections}
      <p><a href="/learn">Every tool has a guide</a> &middot; <a href="/plugins">Plugins</a> &middot; <a href="/">News</a></p>`);
}

function buildLearnIndexBody(articles) {
  const items = articles.map((a) => `
      <section>
        <h2><a href="/learn/${a.slug}">${escapeHtml(a.title)}</a></h2>
        <p>${escapeHtml(toMetaDescription(a.body, a.answer, 220))}</p>
      </section>`).join('');

  return page(`
      <h1>Music Production Tool Guides</h1>
      <p>Written guides for every SubverseLab tool — what each one measures or generates, how to use it, and where its limits are.</p>
      ${siteNav()}${items}`);
}

function buildArticleBody(article, product) {
  const launch = product
    ? `<p><a href="/tools/${product.slug || product.id}">${escapeHtml(primaryAction(product))}</a></p>`
    : '';
  return page(`
      <nav><a href="/">Home</a> · <a href="/learn">Guides</a></nav>
      <h1>${escapeHtml(article.title)}</h1>
      ${launch}
      <article>
      ${mdToHtml(article.body || article.answer || '')}
      </article>`);
}

function buildToolBody(product, article) {
  const guideLink = article
    ? `<p><a href="/learn/${article.slug}">Read the full ${escapeHtml(product.title)} guide</a></p>`
    : '';
  // The tool page carries a real summary rather than the whole guide — the
  // guide has its own indexable URL, and duplicating 5KB of text across two
  // pages would just make them compete with each other.
  const summary = article ? mdToHtml(String(article.body || '').split(/\n##\s/)[0]) : '';
  return page(`
      <nav><a href="/">Home</a> · <a href="/learn">Guides</a></nav>
      <h1>${escapeHtml(product.title)}</h1>
      ${product.subtitle ? `<p><strong>${escapeHtml(product.subtitle)}</strong></p>` : ''}
      <p>${escapeHtml(stripMarkdown(product.description || ''))}</p>
      ${product.metrics ? `<p>${escapeHtml(product.metrics.replace(/\s*•\s*/g, ' · '))}</p>` : ''}
      ${summary}
      ${guideLink}`);
}

function renderFaqSection(title, items) {
  const rows = items.map((item) => `
      <details>
        <summary>${escapeHtml(item.q)}</summary>
        <p>${escapeHtml(item.a)}</p>
      </details>`).join('');
  return `<section><h2>${escapeHtml(title)}</h2>${rows}\n    </section>`;
}

function buildHelpPageBody() {
  return page(`
      <h1>Help and FAQ</h1>
      <p>Questions before you buy, or stuck after? Here is how accounts, buying, downloads and credits work, and how each tool works.</p>
      ${siteNav()}
      ${renderFaqSection('General', GENERAL_FAQ)}
      ${renderFaqSection('Tools', TOOL_FAQ)}
      ${renderFaqSection('Loom', LOOM_FAQ)}
      ${renderFaqSection('Contact', CONTACT_FAQ)}`);
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const templatePath = join(ROOT, 'dist', 'index.html');
  const template = readFileSync(templatePath, 'utf8');
  const fetched = stripToolPrefix(await fetchContent());
  const localMixGuide = readFileSync(join(ROOT, 'src', 'data', 'mix-check-guide.md'), 'utf8');
  const articles = fetched.articles.map((a) => a.slug === 'subverse-mix-check' ? {
    ...a,
    body: localMixGuide,
    answer: 'Evidence-first audio measurement for your mix or master, with direct loudness, level, spectral, and mono fold-down evidence.',
  } : a);
  const products = fetched.products.map((p) => (p.slug === 'subverse-mix-check' || p.id === 'subverse-mix-check')
    ? { ...p, coverImage: '/subverse-mix-check-cover.jpg' }
    : p);
  let written = 0;

  // Guides key off the product id they document (relatedProductId, which
  // equals the slug for every current article), so each tool can be linked
  // to its guide and vice versa.
  const articleBySlug = new Map();
  for (const a of articles) {
    if (a.slug) articleBySlug.set(a.relatedProductId || a.slug, a);
  }
  const productById = new Map(products.map((p) => [p.id, p]));

  // Plugin and launch pages carry the free-tools links too, so crawlers that
  // land there (most launch traffic) can reach every tool page.
  // The "Browser tools for producers" strip left /plugins, the rooms and the Download Room on 31 Oct (owner: the header links to
  // /tools, it need not appear everywhere); the prerendered pages follow.
  // `data` (optional) goes into the page as <script type="application/json" id="svl-page-data">, outside #root, so the
  // React page can paint from it at once instead of waiting on Firestore. A data block is never executed, so the CSP
  // script hashes in server.js are not involved.
  function writePage(routePath, head, bodyHtml, data) {
    let html = bodyHtml ? renderPageWithBody(template, head, bodyHtml) : renderPage(template, head);
    if (data) {
      const json = JSON.stringify(data).replace(/</g, '\\u003c');
      html = html.replace('</body>', `<script type="application/json" id="svl-page-data">${json}</script>\n  </body>`);
    }
    const dir = join(ROOT, 'dist', routePath);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), html);
    written += 1;
  }

  // Homepage — dist/index.html itself, not a subdirectory.
  const homeSchema = [
    ORGANIZATION,
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'SubverseLab',
      url: `${SITE_URL}/`,
      description: 'Audio plugins, packs and browser tools for music producers.',
    },
  ];
  // The tool list moved with the tools to /tools (2026-10-26).
  const toolsList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'SubverseLab production tools',
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.title,
      url: `${SITE_URL}/tools/${p.slug || p.id}`,
    })),
  };
  writeFileSync(
    templatePath,
    renderPageWithBody(
      template,
      buildHead({
        title: HOME.title,
        description: HOME.description,
        canonical: `${SITE_URL}/`,
        jsonLd: homeSchema,
      }),
      buildHomeBody()
    )
  );

  // Browser tools (/tools, its own page since 2026-10-26).
  writePage('tools', buildHead({
    title: TOOLS.title,
    description: TOOLS.description,
    canonical: `${SITE_URL}${TOOLS.path}`,
    jsonLd: [toolsList],
  }), buildToolsBody(products, articleBySlug));

  // Guide index.
  writePage('learn', buildHead({
    title: LEARN_INDEX.title,
    description: LEARN_INDEX.description,
    canonical: `${SITE_URL}/learn`,
    image: LEARN_OG_IMAGE,
    jsonLd: [breadcrumbSchema([
      { name: 'Home', url: `${SITE_URL}/` },
      { name: 'Guides', url: `${SITE_URL}/learn` },
    ])],
  }), buildLearnIndexBody(articles));

  // Help / FAQ.
  writePage('help', buildHead({
    title: HELP.title,
    description: HELP.description,
    canonical: `${SITE_URL}/help`,
    image: HELP_OG_IMAGE,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: ALL_FAQ.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
      breadcrumbSchema([
        { name: 'Home', url: `${SITE_URL}/` },
        { name: 'Help and FAQ', url: `${SITE_URL}/help` },
      ]),
    ],
  }), buildHelpPageBody());

  // Loom. Prerendered for the same reason /help is: someone arriving from a
  // citation — in a paper, a repository, or the _source line under a tool
  // answer — should read what Loom is without waiting on a bundle, and a
  // crawler that never runs JS should index the real text rather than an
  // empty shell.
  writePage('loom', buildHead({
    title: 'Loom — measurement-based production for Ableton Live | SubverseLab',
    description: 'A local MCP server that reads your own Ableton projects and library, answers with counts instead of guesses, and writes MIDI, device chains, automation and markers into a running Live session.',
    canonical: `${SITE_URL}/loom`,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Loom',
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'macOS',
        url: `${SITE_URL}/loom`,
        codeRepository: 'https://github.com/senolsahan037-oss/loom',
        author: { '@type': 'Organization', name: 'SubverseLab', url: 'https://subverselab.com' },
        publisher: { '@type': 'Organization', name: 'SubverseLab', url: SITE_URL },
      },
      breadcrumbSchema([
        { name: 'Home', url: `${SITE_URL}/` },
        { name: 'Loom', url: `${SITE_URL}/loom` },
      ]),
    ],
  }), `<h1>Loom</h1>
      <p>Measurement-based production for Ableton Live.</p>
      <p>Loom is a local MCP server that reads your own <code>.als</code> projects and your own
      Ableton library, answers with counts instead of guesses, and writes MIDI, device chains,
      automation and arrangement markers into a running Live session &mdash; verifying every write
      by reading it back. It is open source and free: no account, no upload, no server.</p>
      <p>Seven engines under one tool namespace &mdash; Sensei, ArrangementGPS, AIMixMaster,
      Presetor, AISoundDesigner, MusicalIntelligence and the Loom extension &mdash; exposed as 45
      MCP tools. <code>python3 install.py</code> registers it with Claude Desktop, Claude Code and
      Antigravity; Live&rsquo;s own step is to add the extension package under Extensions in Live
      12.4 beta and restart.</p>
      <p>The single connection to Live is the Loom extension. There is no Control Surface, no
      automatic fallback and no second writer, and an extension too old to publish a protocol is
      read but never written to.</p>
      <h2>Where the SDK stops</h2>
      <p>Ableton&rsquo;s extension SDK opens some doors and not others, and most of what Loom does
      lies past the ones it leaves shut. The SDK cannot load a <code>.adg</code> or
      <code>.adv</code>, so Loom reads the preset&rsquo;s own XML, resolves the sample files on the
      machine and rebuilds the pads in Live as chain, Simpler and sample &mdash; then names what did
      not carry across. Device chains are harvested from <code>.als</code> and <code>.adv</code>
      files and load with no repairs. Live stores a drum pad&rsquo;s <code>ReceivingNote</code>
      inverted, as 128 minus the note; nothing documents that, it was measured on real pads and
      confirmed 16 of 16. Live&rsquo;s audio output has no SDK route, so Loom takes a Core Audio
      process tap. Gain staging, clip alignment and automation writing happen on the
      <code>.als</code> file itself, outside the SDK entirely.</p>
      <p>Source: <a href="https://github.com/senolsahan037-oss/loom">github.com/senolsahan037-oss/loom</a>.
      &copy; &#350;enol &#350;ahan / SubverseLab.</p>
      <nav><a href="/">Tools</a> &middot; <a href="/learn">Guides</a> &middot; <a href="/help">Help and FAQ</a></nav>`);

  // Plugins. Pages, not synced products (Rules/02): the index, one page per
  // plugin and the launch page, all written from src/data/plugins.js so the
  // crawler reads what the visitor reads. No codes-left number is written
  // here — that one is only ever read live, in the browser.
  const pluginsCrumb = { name: 'Plugins', url: `${SITE_URL}${PLUGINS_INDEX.path}` };
  const homeCrumb = { name: 'Home', url: `${SITE_URL}/` };

  // The plugin family ran 5 Oct - 1 Nov 2026 and is retired (FAMILY_RETIRED, owner 2026-10-28): every product is sold on its own.
  const ownLine = (pl) => `$${PRICES[pl.slug]}. ${escapeHtml(UPDATES_LINE)}`;
  // One route for every room (PluginRoom.jsx, owner decision 2026-10-15).
  const BUY_SENTENCE = 'Sold through Lemon Squeezy. After you pay, sign in with the e-mail you paid with: the download appears on this page and on your Account page, with your licence key.';
  writePage('plugins', buildHead({
    title: PLUGINS_INDEX.title,
    description: PLUGINS_INDEX.description,
    canonical: `${SITE_URL}${PLUGINS_INDEX.path}`,
    jsonLd: [breadcrumbSchema([homeCrumb, pluginsCrumb])],
  }), `<h1>Plugins</h1>
      <p>Plugins and apps for macOS and Windows, each made for one job in your track. Open one to meet it: the real panel, what every control does, and how to make it yours.</p>
      ${STORE_PLUGINS.map((pl) => (FAMILY_PLUGINS.includes(pl)
    ? `<h2><a href="${pl.path}">${escapeHtml(pl.name)}</a> &mdash; $${PRICES[pl.slug]}</h2>
      <p>${escapeHtml(pl.tagline)}</p>`
    : LINE2_PLUGINS.includes(pl)
      ? `<h2><a href="${pl.path}">${escapeHtml(pl.displayName)}</a> &mdash; ${escapeHtml(line2AvailableLine(pl))}</h2>
      <p>${escapeHtml(pl.description)}</p>`
      : FREE_PLUGINS.includes(pl)
        ? `<h2><a href="${pl.path}">${escapeHtml(pl.displayName)}</a> &mdash; free</h2>
      <p>${escapeHtml(pl.description)}</p>`
        : `<h2><a href="${pl.path}">${escapeHtml(pl.displayName)}</a> &mdash; ${escapeHtml(priceText(pl.slug))}</h2>
      <p>${escapeHtml(pl.description)}</p>`)).join('\n      ')}
      <p>${escapeHtml(TRUST_LINE)}</p>
      <nav><a href="/">Tools</a> &middot; <a href="/loom">Loom</a> &middot; <a href="/help">Help and FAQ</a></nav>`);

  for (const pl of PLUGINS) {
    writePage(pl.path.slice(1), buildHead({
      title: pl.title,
      description: pl.description,
      canonical: `${SITE_URL}${pl.path}`,
      image: `${SITE_URL}${pl.og}`,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: `SubverseLab ${pl.name}`,
          applicationCategory: 'MultimediaApplication',
          operatingSystem: 'macOS, Windows',
          url: `${SITE_URL}${pl.path}`,
          image: `${SITE_URL}${pl.og}`,
          offers: { '@type': 'Offer', price: String(PRICES[pl.slug]), priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
          author: { '@type': 'Organization', name: 'SubverseLab', url: 'https://subverselab.com' },
          publisher: { '@type': 'Organization', name: 'SubverseLab', url: SITE_URL },
        },
        breadcrumbSchema([homeCrumb, pluginsCrumb, { name: pl.name, url: `${SITE_URL}${pl.path}` }]),
      ],
    }), `<h1>${escapeHtml(pl.name)}</h1>
      <p>${escapeHtml(pl.tagline.replace(/\.$/, ''))}. $${PRICES[pl.slug]} &middot; ${escapeHtml(FORMATS)}.</p>
      <p>${escapeHtml(pl.intro)}</p>
      <h2>${escapeHtml(pl.modesLabel)}</h2>
      ${pl.modes.map((m) => `<h3>${escapeHtml(m.name)}</h3>\n      <p>${escapeHtml(m.text)}</p>`).join('\n      ')}
      ${pl.sections.map((sec) => `<h2>${escapeHtml(sec.heading)}</h2>\n      <p>${escapeHtml(sec.text)}</p>`).join('\n      ')}${tourHtml(pl)}
      <h2>The controls</h2>
      <ul>${pl.controls.map(([n, w]) => `<li><strong>${escapeHtml(n)}</strong> &mdash; ${escapeHtml(w)}</li>`).join('')}</ul>
      <h2>Buying and downloading</h2>
      <p>${ownLine(pl)}</p>
      <p>${escapeHtml(trustLineFor(pl.slug))}</p>
      <p>${BUY_SENTENCE} ${escapeHtml(ACTIVATION_LINE)}</p>
      <p><a href="${pl.manualPage}">${escapeHtml(pl.name)} manual</a> &middot; <a href="${pl.manual}">PDF</a></p>
      <nav><a href="/plugins">Plugins</a> &middot; <a href="/">Tools</a> &middot; <a href="/help">Help and FAQ</a></nav>`);
  }

  // Owner's manuals, from src/data/pluginManuals.js — the same blocks the
  // React page renders. Inline markup there is only `code` and **bold**.
  const manualInline = (t) => escapeHtml(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const manualBlock = (b) => {
    if (b.h3) return `<h3>${escapeHtml(b.h3)}</h3>`;
    if (b.p) return `<p>${manualInline(b.p)}</p>`;
    if (b.note) return `<p>${manualInline(b.note)}</p>`;
    if (b.list) return `<ul>${b.list.map((t) => `<li>${manualInline(t)}</li>`).join('')}</ul>`;
    if (b.steps) return `<ol>${b.steps.map((t) => `<li>${manualInline(t)}</li>`).join('')}</ol>`;
    if (b.img) {
      return `<figure><img src="${escapeHtml(b.img)}" width="${b.w}" height="${b.h}" alt="${escapeHtml(b.alt || '')}" loading="lazy">${b.caption ? `<figcaption>${manualInline(b.caption)}</figcaption>` : ''}</figure>`;
    }
    if (b.table) {
      return `<table><thead><tr>${b.table.head.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${
        b.table.rows.map((r) => `<tr>${r.map((c) => `<td>${manualInline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }
    if (b.recipes) {
      return b.recipes.map((r) => `<h3>${escapeHtml(r.name)}</h3><p>${escapeHtml(r.settings)}</p><p>${escapeHtml(r.text)}</p>`).join('');
    }
    return '';
  };
  for (const m of MANUALS) {
    const pl = m.plugin;
    writePage(m.path.slice(1), buildHead({
      title: m.title,
      description: m.description,
      canonical: `${SITE_URL}${m.path}`,
      image: `${SITE_URL}${pl.og}`,
      jsonLd: [
        breadcrumbSchema([
          homeCrumb, pluginsCrumb,
          { name: pl.name, url: `${SITE_URL}${pl.path}` },
          { name: 'Manual', url: `${SITE_URL}${m.path}` },
        ]),
      ],
    }), `<h1>${escapeHtml(pl.name)} &mdash; owner&rsquo;s manual</h1>
      <p>${escapeHtml(m.subtitle)}. <a href="${m.pdf}">Manual as PDF</a>.</p>
      ${m.sections.map((sec, i) => `<h2 id="${sec.id}">${i + 1}. ${escapeHtml(sec.heading)}</h2>
      ${sec.blocks.map(manualBlock).join('\n      ')}`).join('\n      ')}
      <nav><a href="${pl.path}">${escapeHtml(pl.name)}</a> &middot; <a href="/plugins">Plugins</a> &middot; <a href="/help">Help and FAQ</a></nav>`);
  }

  writePage('launch', buildHead({
    title: LAUNCH.title,
    description: LAUNCH.description,
    canonical: `${SITE_URL}${LAUNCH.path}`,
    image: `${SITE_URL}/plugins/kubbe/og.jpg`,
    jsonLd: [breadcrumbSchema([homeCrumb, pluginsCrumb, { name: 'Launch', url: `${SITE_URL}${LAUNCH.path}` }])],
  }), `<h1>Kubbe and Kaset</h1>
      <p>The free first ${LAUNCH.codesTotal.toLocaleString('en-US')} are claimed &mdash; thank you. Kubbe and Kaset are $${PRICES.kubbe} each. ${escapeHtml(UPDATES_LINE)}</p>
      ${PLUGINS.map((pl) => `<h2><a href="${pl.path}">${escapeHtml(pl.name)}</a> &mdash; $${PRICES[pl.slug]}</h2>
      <p>${escapeHtml(pl.description)}</p>`).join('\n      ')}
      <p>${escapeHtml(FORMATS)}.</p>
      <p>${escapeHtml(TRUST_LINE)}</p>
      <h2>Download Room</h2>
      <ol><li><strong>Buy.</strong> Buy with Lemon Squeezy.</li><li><strong>Sign in.</strong> Sign in on this page with the e-mail you paid with.</li><li><strong>Download.</strong> Download Kubbe and Kaset for macOS or Windows.</li><li><strong>Install.</strong> ${escapeHtml(ACTIVATION_LINE)}</li></ol>
      <h2>Manuals</h2>
      <ul>${PLUGINS.map((pl) => `<li><a href="${pl.manualPage}">${escapeHtml(pl.name)} manual</a> (<a href="${pl.manual}">PDF</a>)</li>`).join('')}</ul>
      <h2>Getting the plugins</h2>
      <p>Buy, then sign in on subverselab.com/launch with the same e-mail and download. ${escapeHtml(ACTIVATION_LINE)}</p>
      <nav><a href="/plugins">Plugins</a> &middot; <a href="/">Tools</a> &middot; <a href="/help">Help and FAQ</a></nav>`);

  // The manual line of a room: the web manual and the PDF, as PluginRoom.jsx shows them.
  const manualHtml = (pl) => (!pl.manual ? '' : `<h2>Manual</h2>
      <p>${pl.manualPage ? `<a href="${pl.manualPage}">${escapeHtml(pl.displayName)} manual</a> &middot; <a href="${pl.manual}">PDF</a>` : `<a href="${pl.manual}">${escapeHtml(pl.displayName)} manual (PDF)</a>`}</p>`);

  // Launch 2: KORO, YANKI, HAVA, MIHENK and TUTKAL, sold on their own and in the family, own counter.
  // Same rule as above: no codes-left number is written here.
  for (const pl of FAMILY_ONLY_PLUGINS) {
    writePage(pl.path.slice(1), buildHead({
      title: pl.title,
      description: pl.description,
      canonical: `${SITE_URL}${pl.path}`,
      image: `${SITE_URL}${pl.og}`,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: `SubverseLab ${pl.name}`,
          applicationCategory: 'MultimediaApplication',
          operatingSystem: 'macOS, Windows',
          url: `${SITE_URL}${pl.path}`,
          image: `${SITE_URL}${pl.og}`,
          offers: { '@type': 'Offer', price: String(PRICES[pl.slug]), priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
          author: { '@type': 'Organization', name: 'SubverseLab', url: 'https://subverselab.com' },
          publisher: { '@type': 'Organization', name: 'SubverseLab', url: SITE_URL },
        },
        breadcrumbSchema([homeCrumb, pluginsCrumb, { name: pl.name, url: `${SITE_URL}${pl.path}` }]),
      ],
    }), `<h1>${escapeHtml(pl.name)}</h1>
      <p>${escapeHtml(pl.tagline)} $${PRICES[pl.slug]} &middot; ${escapeHtml(pl.formats)}.</p>
      <p>${escapeHtml(pl.intro)}</p>
      <h2>${escapeHtml(pl.modesLabel)}</h2>
      ${pl.modes.map((m) => `<h3>${escapeHtml(m.name)}</h3>\n      <p>${escapeHtml(m.text)}</p>`).join('\n      ')}
      ${pl.sections.map((sec) => `<h2>${escapeHtml(sec.heading)}</h2>\n      <p>${escapeHtml(sec.text)}</p>`).join('\n      ')}${tourHtml(pl)}
      <h2>The controls</h2>
      <ul>${pl.controls.map(([n, w]) => `<li><strong>${escapeHtml(n)}</strong> &mdash; ${escapeHtml(w)}</li>`).join('')}</ul>
      <h2>Buying and downloading</h2>
      <p>${ownLine(pl)}</p>
      <p>${escapeHtml(trustLineFor(pl.slug))}</p>
      <p>${BUY_SENTENCE} ${escapeHtml(ACTIVATION_LINE)}</p>
      ${manualHtml(pl)}
      <nav><a href="/plugins">Plugins</a> &middot; <a href="/">Tools</a> &middot; <a href="/help">Help and FAQ</a></nav>`);
  }

  // The second line (LINE2_PLUGINS): ADALET and SEDA, sold on their own, no date and no checkout yet ("Coming soon").
  for (const pl of LINE2_PLUGINS) {
    writePage(pl.path.slice(1), buildHead({
      title: pl.title,
      description: pl.description,
      canonical: `${SITE_URL}${pl.path}`,
      image: `${SITE_URL}${pl.og}`,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: `SubverseLab ${pl.displayName}`,
          applicationCategory: 'MultimediaApplication',
          operatingSystem: pl.os || 'macOS, Windows',
          url: `${SITE_URL}${pl.path}`,
          image: `${SITE_URL}${pl.og}`,
          // No price until the checkout exists (owner 12 Oct).
          ...(CHECKOUT[pl.slug] ? { offers: { '@type': 'Offer', price: String(PRICES[pl.slug]), priceCurrency: 'USD', availability: 'https://schema.org/InStock' } } : {}),
          author: { '@type': 'Organization', name: 'SubverseLab', url: 'https://subverselab.com' },
          publisher: { '@type': 'Organization', name: 'SubverseLab', url: SITE_URL },
        },
        breadcrumbSchema([homeCrumb, pluginsCrumb, { name: pl.displayName, url: `${SITE_URL}${pl.path}` }]),
      ],
    }), `<h1>${escapeHtml(pl.displayName)}</h1>
      <p>${escapeHtml(pl.tagline)} ${escapeHtml(line2AvailableLine(pl))} &middot; ${escapeHtml(pl.formats)}.</p>
      <p>${escapeHtml(pl.intro)}</p>
      <h2>${escapeHtml(pl.modesLabel)}</h2>
      ${pl.modes.map((m) => `<h3>${escapeHtml(m.name)}</h3>\n      <p>${escapeHtml(m.text)}</p>`).join('\n      ')}
      ${pl.sections.map((sec) => `<h2>${escapeHtml(sec.heading)}</h2>\n      <p>${escapeHtml(sec.text)}</p>`).join('\n      ')}${tourHtml(pl)}
      <h2>The controls</h2>
      <ul>${pl.controls.map(([n, w]) => `<li><strong>${escapeHtml(n)}</strong> &mdash; ${escapeHtml(w)}</li>`).join('')}</ul>
      <h2>Price and availability</h2>
      <p>${escapeHtml(line2AvailableLine(pl))}. ${escapeHtml(pl.updatesNote ?? UPDATES_LINE)}</p>
      <p>${escapeHtml(trustLineFor(pl.slug))}</p>
      ${manualHtml(pl)}
      <nav><a href="/plugins">Plugins</a> &middot; <a href="/">Tools</a> &middot; <a href="/help">Help and FAQ</a></nav>`);
  }

  // Products sold on their own at a real price (SOLO_PLUGINS: ELEK). The launch price is decided here at BUILD time
  // (src/data/plugins.js launchPriceActive); the React page re-decides in the browser, so rebuild and deploy after the end moment.
  for (const pl of SOLO_PLUGINS) {
    writePage(pl.path.slice(1), buildHead({
      title: pl.title,
      description: pl.description,
      canonical: `${SITE_URL}${pl.path}`,
      image: `${SITE_URL}${pl.og}`,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: `SubverseLab ${pl.displayName}`,
          applicationCategory: 'MultimediaApplication',
          operatingSystem: 'macOS, Windows',
          url: `${SITE_URL}${pl.path}`,
          image: `${SITE_URL}${pl.og}`,
          offers: { '@type': 'Offer', price: String(currentPrice(pl.slug)), priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
          author: { '@type': 'Organization', name: 'SubverseLab', url: 'https://subverselab.com' },
          publisher: { '@type': 'Organization', name: 'SubverseLab', url: SITE_URL },
        },
        breadcrumbSchema([homeCrumb, pluginsCrumb, { name: pl.displayName, url: `${SITE_URL}${pl.path}` }]),
      ],
    }), `<h1>${escapeHtml(pl.displayName)}</h1>
      <p>${escapeHtml(pl.tagline)} ${escapeHtml(priceText(pl.slug))} &middot; ${escapeHtml(pl.formats)}</p>
      <p>${escapeHtml(pl.intro)}</p>
      <h2>${escapeHtml(pl.modesLabel)}</h2>
      ${pl.modes.map((m) => `<h3>${escapeHtml(m.name)}</h3>\n      <p>${escapeHtml(m.text)}</p>`).join('\n      ')}
      ${pl.sections.map((sec) => `<h2>${escapeHtml(sec.heading)}</h2>\n      <p>${escapeHtml(sec.text)}</p>`).join('\n      ')}${tourHtml(pl)}
      <h2>The controls</h2>
      <ul>${pl.controls.map(([n, w]) => `<li><strong>${escapeHtml(n)}</strong> &mdash; ${escapeHtml(w)}</li>`).join('')}</ul>
      <p>${escapeHtml(pl.controlsNote)}</p>
      <h2>Price and download</h2>
      <p>${launchPriceActive(pl.slug) ? `<s>$${PRICES[pl.slug]}</s> ${priceWord(currentPrice(pl.slug))} ${launchNote(pl.slug) ? ` &mdash; ${escapeHtml(launchNote(pl.slug))}` : ''}` : `$${PRICES[pl.slug]}`}. ${escapeHtml(UPDATES_LINE)} ${escapeHtml(pl.activation || (pl.noKey ? ACTIVATION_NO_KEY : ACTIVATION_SHORT))}</p>${pl.trialLines?.length ? `
      <p>${escapeHtml(pl.trialLines.join(' '))}</p>` : ''}
      <p>${escapeHtml(trustLineFor(pl.slug))}</p>
      ${manualHtml(pl)}
      <nav><a href="/plugins">Plugins</a> &middot; <a href="/">Tools</a> &middot; <a href="/help">Help and FAQ</a></nav>`);
  }

  // Free plugins (FREE_PLUGINS): free forever, a $0 Lemon Squeezy checkout, the download on /account.
  for (const pl of FREE_PLUGINS) {
    writePage(pl.path.slice(1), buildHead({
      title: pl.title,
      description: pl.description,
      canonical: `${SITE_URL}${pl.path}`,
      image: `${SITE_URL}${pl.og}`,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: `SubverseLab ${pl.displayName}`,
          applicationCategory: 'MultimediaApplication',
          operatingSystem: 'macOS, Windows',
          url: `${SITE_URL}${pl.path}`,
          image: `${SITE_URL}${pl.og}`,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
          author: { '@type': 'Organization', name: 'SubverseLab', url: 'https://subverselab.com' },
          publisher: { '@type': 'Organization', name: 'SubverseLab', url: SITE_URL },
        },
        breadcrumbSchema([homeCrumb, pluginsCrumb, { name: pl.displayName, url: `${SITE_URL}${pl.path}` }]),
      ],
    }), `<h1>${escapeHtml(pl.displayName)}</h1>
      <p>${escapeHtml(pl.tagline)} Free, forever &middot; ${escapeHtml(pl.formats)}.</p>
      <p>${escapeHtml(pl.intro)}</p>
      ${pl.sections.map((sec) => `<h2>${escapeHtml(sec.heading)}</h2>\n      <p>${escapeHtml(sec.text)}</p>`).join('\n      ')}${tourHtml(pl)}
      <h2>The controls</h2>
      <ul>${pl.controls.map(([n, w]) => `<li><strong>${escapeHtml(n)}</strong> &mdash; ${escapeHtml(w)}</li>`).join('')}</ul>
      <h2>Get it free</h2>
      <p>Sign in first so the order lands on your account; the checkout asks only for an e-mail address, no card. The download then appears on this page and on your Account page. ${escapeHtml(ACTIVATION_LINE_FREE)}</p>
      <p>${escapeHtml(TRUST_LINE_FREE)}</p>
      ${manualHtml(pl)}
      <nav><a href="/plugins">Plugins</a> &middot; <a href="/">Tools</a> &middot; <a href="/help">Help and FAQ</a></nav>`);
  }

  const roomPrice = (pl) => (pl.free || Number(currentPrice(pl.slug)) === 0 ? 'free' : `$${currentPrice(pl.slug)}`);
  writePage('launch2', buildHead({
    title: LAUNCH2.title,
    description: LAUNCH2.description,
    canonical: `${SITE_URL}${LAUNCH2.path}`,
    image: `${SITE_URL}${LAUNCH2.image}`,
    jsonLd: [breadcrumbSchema([homeCrumb, pluginsCrumb, { name: LAUNCH2_NAME, url: `${SITE_URL}${LAUNCH2.path}` }])],
  }), `<h1>${escapeHtml(LAUNCH2_NAME)} &mdash; Download Room</h1>
      <p>${escapeHtml(LAUNCH2.offerNow)}. ${escapeHtml(UPDATES_LINE)}</p>
      <p>${escapeHtml(LAUNCH2.askHow)}.</p>
      ${DOWNLOAD_ROOM_PLUGINS.map((pl) => `<h2><a href="${pl.path}">${escapeHtml(pl.name)}</a> &mdash; ${roomPrice(pl)}</h2>
      <p>${escapeHtml(pl.description)}</p>`).join('\n      ')}
      <h2>Download Room</h2>
      <ol>${LAUNCH2.steps.map(([h, t]) => `<li><strong>${escapeHtml(h)}.</strong> ${escapeHtml(t)}</li>`).join('')}</ol>
      <nav><a href="/plugins">Plugins</a> &middot; <a href="/">Tools</a> &middot; <a href="/help">Help and FAQ</a></nav>`);

  writePage('testers', buildHead({
    title: TESTERS.title,
    description: TESTERS.description,
    canonical: `${SITE_URL}${TESTERS.path}`,
    image: `${SITE_URL}${LAUNCH2_PLUGINS[0].og}`,
    // Out of the index until the owner opens the call (decisions 2026-10-10); the URL keeps working.
    robots: NOINDEX,
    jsonLd: [breadcrumbSchema([homeCrumb, pluginsCrumb, { name: 'Testers', url: `${SITE_URL}${TESTERS.path}` }])],
  }), `<h1>Become a SubverseLab tester</h1>
      <p>100 producers test our plugins free, chosen so that every operating system and DAW is covered. 100 seats. Applications are read by hand; you hear back by e-mail.</p>
      <h2>What you get</h2>
      <p>The plugins under test, for macOS and Windows, free, from the Download Room, for as long as you test. Testers get the same builds buyers get. Which plugins they are comes with your seat.</p>
      <h2>What we ask in return</h2>
      <ul><li>Install the plugins.</li><li>Use them in real sessions.</li><li>Report what breaks, and on which operating system and DAW.</li><li>Tell us where you heard about SubverseLab.</li></ul>
      <nav><a href="/plugins">Plugins</a> &middot; <a href="/">Tools</a> &middot; <a href="/help">Help and FAQ</a></nav>`);

  // Sample packs: the catalogue and one page per pack, every fact from src/data/samplePacks.js (scripts/import-sample-packs.js).
  const packs = visiblePacks();
  const packLine = (p) => {
    const o = packOffer(p);
    return `${escapeHtml(p.kindLine)}. ${escapeHtml(contentsLine(p))}, ${escapeHtml(formatLine(p))}.${o.buyable ? ` ${escapeHtml(priceLabel(o.price))}.` : ' Available soon.'}`;
  };
  writePage('sample-packs', buildHead({
    title: SAMPLE_PACKS.title,
    description: SAMPLE_PACKS.description,
    canonical: `${SITE_URL}${SAMPLE_PACKS.path}`,
    jsonLd: [breadcrumbSchema([homeCrumb, { name: 'Sample packs', url: `${SITE_URL}${SAMPLE_PACKS.path}` }])],
  }), `<h1>Sample packs</h1>
      <p>Drum kits, loops, FX and MIDI made at SubverseLab, mixed and finished so they sit in a beat as they are. Press play on any cover: every preview is made only from the files in that pack, so what you hear is what you get.</p>
      <ul>${packs.map((p) => `<li><a href="${packPath(p)}">${escapeHtml(p.name)}</a>: ${packLine(p)}</li>`).join('')}</ul>
      <p>Buy a pack once and it is yours: no subscription. Producers who want to publish their packs with us can apply on this page.</p>
      <nav><a href="/plugins">Plugins</a> &middot; <a href="/preset-packs">Preset packs</a> &middot; <a href="/help">Help and FAQ</a></nav>`);
  for (const p of packs) {
    const o = packOffer(p);
    writePage(`sample-packs/${p.slug}`, buildHead({
      title: packTitle(p),
      description: packDescription(p),
      canonical: `${SITE_URL}${packPath(p)}`,
      image: `${SITE_URL}${p.cover.jpg}`,
      jsonLd: [
        breadcrumbSchema([homeCrumb, { name: 'Sample packs', url: `${SITE_URL}${SAMPLE_PACKS.path}` }, { name: p.name, url: `${SITE_URL}${packPath(p)}` }]),
        { '@context': 'https://schema.org', '@type': 'Product', name: p.fullName, description: packDescription(p), image: `${SITE_URL}${p.cover.jpg}`, url: `${SITE_URL}${packPath(p)}`,
          brand: { '@type': 'Organization', name: 'SubverseLab', url: SITE_URL },
          ...(o.buyable ? { offers: { '@type': 'Offer', price: String(o.price), priceCurrency: 'USD', availability: 'https://schema.org/InStock' } } : {}) },
      ],
    }), `<h1>${escapeHtml(p.name)}</h1>
      <p>${packLine(p)}</p>
      <ul>${specList(p).map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
      <h2>Listen</h2>
      <p>A ${Math.round(p.snippet.seconds)}-second preview. ${escapeHtml(HONESTY_LINE)}</p>
      <ol>${p.scenes.map((sc) => `<li>${escapeHtml(mmss(sc.t))} ${escapeHtml(sc.label)}</li>`).join('')}</ol>
      <h2>Technical details</h2>
      <dl>${plateRows(p).map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join('')}</dl>
      <h2>Inside the folder</h2>
      <ul>${p.docs.map((d) => `<li>${escapeHtml(d)}</li>`).join('')}${p.folders.map((f) => `<li>${escapeHtml(folderLabel(f.folder))}/ (${f.count} files)</li>`).join('')}</ul>
      ${p.licence ? `<h2>Licence summary${p.licence.draft ? ' (draft)' : ''}</h2><ol>${p.licence.clauses.map((c) => `<li>${c.title ? `<strong>${escapeHtml(c.title)}.</strong> ` : ''}${escapeHtml(c.text)}</li>`).join('')}</ol>` : ''}
      <nav><a href="/sample-packs">Sample packs</a> &middot; <a href="/plugins">Plugins</a> &middot; <a href="/help">Help and FAQ</a></nav>`);
  }

  writePage('preset-packs', buildHead({
    title: PRESET_PACKS.title,
    description: PRESET_PACKS.description,
    canonical: `${SITE_URL}${PRESET_PACKS.path}`,
    jsonLd: [breadcrumbSchema([homeCrumb, { name: 'Preset packs', url: `${SITE_URL}${PRESET_PACKS.path}` }])],
  }), `<h1>Preset packs</h1>
      <p>Ableton Live racks made and checked by SubverseLab. Drop one on a track and it is already doing its job; the named macros take it from there.</p>
      ${PRESET_PACK_LIST.map((pk) => `<h2>${escapeHtml(pk.name)}</h2>
      <p>${escapeHtml(pk.kind)}. ${escapeHtml(pk.summary)}</p>
      <ul>${pk.inside.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
      <p>Requirements: ${escapeHtml(pk.requirements.join('; '))}. ${pk.free ? 'Free with a SubverseLab account' : packOffer(pk.id).buyable ? escapeHtml(priceLabel(packOffer(pk.id).price)) : 'Available soon'}.</p>`).join('\n      ')}
      <nav>${RU8_ON_SALE ? '<a href="/plugins/ru8">RU-8</a> &middot; ' : ''}<a href="/sample-packs">Sample packs</a> &middot; <a href="/help">Help and FAQ</a></nav>`);

  // Forum (public, in the footer): its own title/description/canonical instead of the homepage shell's. /forum/<id> stays client-only.
  writePage('forum', buildHead({
    title: 'Forum | SubverseLab',
    description: 'Questions and answers about SubverseLab plugins and browser tools, from producers and from us.',
    canonical: `${SITE_URL}/forum`,
    jsonLd: [breadcrumbSchema([homeCrumb, { name: 'Forum', url: `${SITE_URL}/forum` }])],
  }), `<h1>SubverseLab Forum</h1>
      <p>Ask a clear question, share what you tried, and add an answer when you know one.</p>
      <ul>${FORUM_SEED_TOPICS.map((t) => `<li><a href="/forum/${t.id}">${escapeHtml(t.title)}</a></li>`).join('')}</ul>
      <nav><a href="/plugins">Plugins</a> &middot; <a href="/">Tools</a> &middot; <a href="/help">Help and FAQ</a></nav>`);

  // The seed topics (src/data/forumSeed.js) are static, so each gets its own document. Before this, /forum/<id> was
  // served the homepage shell, whose canonical is the homepage: Search Console reported /forum/seed-topic-3 as
  // "Duplicate, Google chose different canonical than user" (22 Oct 2026). Topics people post stay client-only.
  for (const t of FORUM_SEED_TOPICS) {
    const canonical = `${SITE_URL}/forum/${t.id}`;
    writePage(`forum/${t.id}`, buildHead({
      title: `${t.title} | SubverseLab Forum`,
      description: toMetaDescription(t.body),
      canonical,
      type: 'article',
      jsonLd: [breadcrumbSchema([homeCrumb, { name: 'Forum', url: `${SITE_URL}/forum` }, { name: t.title, url: canonical }])],
    }), `<h1>${escapeHtml(t.title)}</h1>
      <p>${escapeHtml(t.category)} &middot; ${escapeHtml(t.authorName)}</p>
      <p>${escapeHtml(t.body)}</p>
      <h2>Answers</h2>
      ${t.replies.length ? `<ul>${t.replies.map((r) => `<li>${escapeHtml(r.body)}</li>`).join('')}</ul>` : '<p>No answers yet.</p>'}
      <nav><a href="/forum">Forum</a> &middot; <a href="/plugins">Plugins</a> &middot; <a href="/help">Help and FAQ</a></nav>`);
  }

  // Private pages: never the homepage title or canonical, never indexed (robots.txt already disallows them).
  writePage('account', buildHead({ title: 'Account | SubverseLab', robots: 'noindex, nofollow', bare: true }),
    '<h1>Your account</h1>\n      <p>Sign in to see your plugins, downloads, licence keys and credits.</p>');
  writePage('admin', buildHead({ title: 'Admin | SubverseLab', robots: 'noindex, nofollow', bare: true }),
    '<h1>Admin</h1>\n      <p>Sign in with an admin account.</p>');
  // A plug-in's browser sign-in (TRIAL_AND_SIGNIN.md): private, not in the sitemap.
  writePage('activate', buildHead({ title: 'Activate | SubverseLab', robots: 'noindex, nofollow', bare: true }),
    '<h1>Activate a plugin</h1>\n      <p>Sign in with your SubverseLab account to activate the plugin on this computer.</p>');
  // Store codes (api/redeem.js): private, not in the sitemap. Stores may link /redeem?code=XXXX.
  writePage('redeem', buildHead({ title: 'Redeem a code | SubverseLab', robots: 'noindex, nofollow', bare: true }),
    '<h1>Redeem a code</h1>\n      <p>Bought a SubverseLab product from a store? Sign in and enter your code to add the product to your account.</p>');

  // dist/404.html: served by server.js with status 404 for unknown URLs. Same app shell (the in-app 404 page paints
  // after load), but no canonical and noindex, so previews and crawlers do not read the homepage's head.
  {
    const html = renderPageWithBody(template, buildHead({
      title: 'Page not found | SubverseLab',
      description: 'That page is not on subverselab.com.',
      robots: 'noindex',
    }), `<h1>The signal stops here.</h1>
      <p><a href="/plugins">Plugins</a> &middot; <a href="/">Tools</a> &middot; <a href="/help">Help</a></p>`);
    writeFileSync(join(ROOT, 'dist', '404.html'), html);
    written += 1;
  }

  // Privacy Policy and Terms of Use: same text as LegalPage.jsx, from legalContent.js.
  const legalMail = (t) => escapeHtml(t).split(LEGAL_EMAIL).join(`<a href="mailto:${LEGAL_EMAIL}">${LEGAL_EMAIL}</a>`);
  for (const doc of LEGAL_PAGES) {
    writePage(doc.path.slice(1), buildHead({
      title: doc.title,
      description: doc.description,
      canonical: `${SITE_URL}${doc.path}`,
      jsonLd: [breadcrumbSchema([homeCrumb, { name: doc.h1, url: `${SITE_URL}${doc.path}` }])],
    }), `<h1>${escapeHtml(doc.h1)}</h1>
      <p>Last updated: ${doc.updated || LEGAL_UPDATED}</p>
      <p>${escapeHtml(doc.intro)}</p>
      ${doc.sections.map((sec) => `<h2>${escapeHtml(sec.h)}</h2>
      ${sec.blocks.map((b) => (Array.isArray(b) ? `<ul>${b.map((li) => `<li>${legalMail(li)}</li>`).join('')}</ul>` : `<p>${legalMail(b)}</p>`)).join('\n      ')}`).join('\n      ')}
      <nav><a href="/plugins">Plugins</a> &middot; <a href="/">Tools</a> &middot; <a href="/help">Help and FAQ</a> &middot; <a href="/privacy">Privacy Policy</a> &middot; <a href="/terms">Terms of Use</a></nav>`);
  }

  // Published guides — the site's real long-form content.
  for (const a of articles) {
    if (!a.slug) continue;
    const canonical = `${SITE_URL}/learn/${a.slug}`;
    const description = a.metaDescription || toMetaDescription(a.answer, a.body);
    const product = productById.get(a.relatedProductId || a.slug);
    writePage(`learn/${a.slug}`, buildHead({
      title: a.metaTitle || `${a.title} | SubverseLab`,
      description,
      canonical,
      // Sensei's guide is kept out of search results (Search Console cleanup, 2026-10-07).
      robots: a.slug === 'sensei' ? NOINDEX : undefined,
      type: 'article',
      image: product?.coverImage || undefined,
      jsonLd: [
        articleSchema(a, canonical, description),
        breadcrumbSchema([
          { name: 'Home', url: `${SITE_URL}/` },
          { name: 'Guides', url: `${SITE_URL}/learn` },
          { name: a.title, url: canonical },
        ]),
      ],
    }), buildArticleBody(a, product), {
      // ArticlePage paints from this. Google's renderer (Search Console live test, 22 Oct 2026) never got the
      // Firestore answer and saw an empty page, which Search Console reported as "Soft 404" for these guides.
      article: {
        slug: a.slug, title: a.title, body: a.body || '', answer: a.answer || '', category: a.category || '',
        keywords: a.keywords || [], metaTitle: a.metaTitle || '', metaDescription: a.metaDescription || '',
        type: a.type || '', updatedAt: a.updatedAt && !Number.isNaN(Date.parse(a.updatedAt)) ? new Date(a.updatedAt).toISOString() : null,
      },
    });
  }

  // Tool Room pages for every remote tool. Member-gated ones are included
  // because ToolRoom.jsx now shows their real description and guide link to
  // signed-out visitors too (see generate-sitemap.js for the full note) —
  // the prerendered body below is exactly what such a visitor sees.
  for (const p of products) {
    if (p.source_type === 'remote' && p.slug) {
      const canonical = `${SITE_URL}/tools/${p.slug}`;
      const article = articleBySlug.get(p.id);
      writePage(`tools/${p.slug}`, buildHead({
        title: `${p.title} | SubverseLab`,
        description: toMetaDescription(p.description),
        canonical,
        // Tool pages are kept out of the index; crawlers may still follow their links.
        robots: NOINDEX,
        image: p.coverImage || undefined,
        icon: p.slug === 'subverse-mix-check' ? '/subverse-mix-check-mark.svg' : undefined,
        jsonLd: [
          softwareApplicationSchema(p, canonical),
          breadcrumbSchema([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: p.title, url: canonical },
          ]),
        ],
      }), buildToolBody(p, article));
    }
  }

  console.log(`prerender: wrote ${written} route(s) plus the homepage`);
  // JING FANG's images live in public/plugins/jingfang/ for the local preview (npm run dev); they ship only once it is on sale.
  if (!JINGFANG_ON_SALE) {
    rmSync(join(ROOT, 'dist', 'plugins', 'jingfang'), { recursive: true, force: true });
    console.log('prerender: JING FANG is not on sale, dist/plugins/jingfang removed');
  }
  // AHENK the same way (src/data/plugins.js AHENK_CHECKOUT): no page is written above, and its images stay out of dist.
  if (!AHENK_ON_SALE) {
    rmSync(join(ROOT, 'dist', 'plugins', 'ahenk'), { recursive: true, force: true });
    console.log('prerender: AHENK is not on sale, dist/plugins/ahenk removed');
  }
}

main().catch((err) => {
  console.error('prerender failed:', err);
  process.exit(1);
});
