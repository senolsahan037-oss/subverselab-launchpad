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
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { fetchContent, ROOT, SITE_URL } from './lib/fetchContent.js';
import { GENERAL_FAQ, TOOL_FAQ, LOOM_FAQ, CONTACT_FAQ, ALL_FAQ } from '../src/data/faqContent.js';
import { HOME, LEARN_INDEX, HELP } from '../src/data/siteMeta.js';

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

function buildHead({ title, description, canonical, image, icon, type = 'website', jsonLd = [] }) {
  const t = escapeHtml(title);
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
    <link${RH} rel="canonical" href="${canonical}" />
    <meta name="theme-color" media="(prefers-color-scheme: light)" content="#F2EFE7" />
    <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#032825" />
    <meta${RH} property="og:site_name" content="SubverseLab" />
    <meta${RH} property="og:title" content="${t}" />
    <meta${RH} property="og:description" content="${d}" />
    <meta${RH} property="og:type" content="${type}" />
    <meta${RH} property="og:url" content="${canonical}" />${img}
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
  description: 'Free, browser-based AI tools for music producers.',
  sameAs: [
    'https://www.youtube.com/@SubverseLab',
    'https://www.instagram.com/subverse_lab/',
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
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
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
// than "Open Subverse Mix Check". Naming the job is what turns a link into
// a reason to click, and keeping the prerendered copy identical to the button
// the app renders means a crawler and a visitor read the same invitation.
function primaryAction(product) {
  const label = product.actions?.[0]?.label;
  return label || `Open ${product.title}`;
}

function buildHomeBody(products, articleBySlug) {
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
      <h1>SubverseLab: Free AI Tools for Music Producers</h1>
      <p>SubverseLab builds free, browser-based AI tools for arranging, generating, analyzing, mixing and separating music. Everything runs in the browser with nothing to install, and everything below is free to use; some tools ask for a free account.</p>
      ${siteNav()}
      <h2>The tools</h2>${toolSections}
      <section>
        <h2>Guides</h2>
        <p>Every tool has a written guide explaining what it does, how to use it, and what its limits are. <a href="/learn">Browse all guides</a> or read the <a href="/help">help and FAQ</a>.</p>
      </section>`);
}

function buildLearnIndexBody(articles) {
  const items = articles.map((a) => `
      <section>
        <h2><a href="/learn/${a.slug}">${escapeHtml(a.title)}</a></h2>
        <p>${escapeHtml(toMetaDescription(a.body, a.answer, 220))}</p>
      </section>`).join('');

  return page(`
      <h1>AI Music Production Guides</h1>
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
      <p>Common questions about accounts, downloads, and how each tool works.</p>
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
  const fetched = await fetchContent();
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

  function writePage(routePath, head, bodyHtml) {
    const html = bodyHtml ? renderPageWithBody(template, head, bodyHtml) : renderPage(template, head);
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
      description: 'Free, browser-based AI tools for music producers.',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'SubverseLab AI tools',
      itemListElement: products.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: p.title,
        url: `${SITE_URL}/tools/${p.slug || p.id}`,
      })),
    },
  ];
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
      buildHomeBody(products, articleBySlug)
    )
  );

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
        author: { '@type': 'Person', name: 'Şenol Şahan' },
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
    }), buildArticleBody(a, product));
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
}

main().catch((err) => {
  console.error('prerender failed:', err);
  process.exit(1);
});
