// Generates public/sitemap.xml, public/robots.txt, public/llms.txt and
// public/llms-full.txt from live Firestore data before every build. This
// service is a static file server (see Dockerfile / server.js — no backend
// routes at all), so there's no request-time hook that could generate these;
// freshness is tied to deploys. Content added straight to Firestore (the
// normal path for this site — see Rules/05_SYNC.md) won't appear here until
// subverselab-v2 is next rebuilt and deployed.
import { visiblePacks, packPath } from '../src/data/packFacts.js';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { fetchContent, isoDate, ROOT, SITE_URL } from './lib/fetchContent.js';
import { stripToolPrefix } from '../src/utils/toolName.js';
import { REFUNDS } from '../src/data/legalContent.js';
import { RU8_ON_SALE, JINGFANG_ON_SALE } from '../src/data/plugins.js';
import { MANUALS } from '../src/data/pluginManuals.js';
import { llmsProductIndex, llmsProductSections } from './lib/llmsProducts.js';

function urlEntry(loc, lastmod, priority) {
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${priority}</priority>\n  </url>`;
}

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

// Skip the leading "## Overview" heading so a summary starts with real prose.
function firstProse(md = '') {
  for (const block of String(md).split(/\n\s*\n/)) {
    const t = block.trim();
    if (!t || t.startsWith('#') || t.startsWith('|') || /^-{3,}$/.test(t)) continue;
    return t;
  }
  return '';
}

function summarize(text, limit) {
  const t = stripMarkdown(firstProse(text)) || stripMarkdown(text);
  if (t.length <= limit) return t;
  const cut = t.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return `${lastSpace > 60 ? cut.slice(0, lastSpace) : cut}…`;
}

// Crawlers that read the site to answer questions about it. They are already
// covered by `User-agent: *`, but several of these operators document that
// they look for their own token, and an explicit Allow removes any question
// about whether this site wants to be quoted — which is the entire point of
// publishing free tools nobody has heard of yet. Listed rather than assumed
// so that turning any single one off later is a one-line, obvious change.
const AI_CRAWLERS = [
  'GPTBot',            // OpenAI — model training + ChatGPT browsing index
  'OAI-SearchBot',     // OpenAI — ChatGPT search results
  'ChatGPT-User',      // OpenAI — live fetch when a user asks about a URL
  'ClaudeBot',         // Anthropic — index
  'Claude-Web',        // Anthropic — live fetch
  'anthropic-ai',      // Anthropic — legacy token
  'PerplexityBot',     // Perplexity — index
  'Perplexity-User',   // Perplexity — live fetch
  'Google-Extended',   // Google — Gemini / AI Overviews grounding
  'Applebot-Extended', // Apple Intelligence
  'CCBot',             // Common Crawl — feeds many downstream models
  'Amazonbot',
  'meta-externalagent',
  'cohere-ai',
  'DuckAssistBot',
];

// Paths no crawler should fetch. They must be repeated in every group: a
// robots.txt group is not additive. A crawler picks the single most specific
// user-agent group that matches it and obeys only that one — rules under `*`
// are not inherited (RFC 9309 §2.2.1). Naming GPTBot to grant it access
// therefore also released it from the `*` group's Disallow lines, so all
// fifteen named AI crawlers were being told, explicitly, that /admin and
// /account were fair game. The intent was "allow the AI crawlers"; the effect
// was "allow the AI crawlers everywhere, including the two places nobody
// should be".
const DISALLOWED = ['/admin', '/account'];

function group(userAgent) {
  const disallow = DISALLOWED.map((path) => `Disallow: ${path}`).join('\n');
  return `User-agent: ${userAgent}\nAllow: /\n${disallow}`;
}

function buildRobots() {
  const groups = ['*', ...AI_CRAWLERS].map(group).join('\n\n');

  return `# SubverseLab — plug-ins, sample packs and tools for music producers
# Full text of every product page and tool guide is available at ${SITE_URL}/llms-full.txt
#
# Every group repeats the Disallow lines on purpose. robots.txt groups do not
# inherit from one another — a crawler obeys only its own most specific group.

${groups}

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

// llms.txt — the emerging convention (llmstxt.org) for handing an AI agent a
// clean, plain-text map of a site instead of making it reconstruct one from
// rendered HTML. llms.txt is the index; llms-full.txt carries every guide in
// full, so an agent can answer detailed questions from a single fetch.
function buildLlmsTxt(articles, products) {
  const toolLines = products.map((p) => {
    const url = `${SITE_URL}/tools/${p.slug || p.id}`;
    return `- [${p.title}](${url}): ${summarize(p.description, 200)}`;
  }).join('\n');

  const guideLines = articles
    .filter((a) => a.slug)
    .map((a) => `- [${a.title}](${SITE_URL}/learn/${a.slug}): ${summarize(a.body || a.answer, 200)}`)
    .join('\n');

  return `# SubverseLab

> Audio plug-ins and apps for macOS and Windows, sample packs, Ableton Live preset packs, and browser tools for music producers. The plug-ins, packs and the open-source Loom server are listed first, from the same data the store pages use; the browser tools and their guides follow. Every browser tool runs in the browser; nothing to install. Every tool is free to start; some require a free account. Where a tool has a daily limit, its own guide states it, and the credits that come with any plugin purchase (every dollar is 100 credits) pay for more.

${llmsProductIndex()}
SubverseLab also publishes single-purpose browser tools. Each tool has a written guide describing exactly what it does, how to use it, and what its limits are. The tools do not fabricate measurements or scores: where a tool reports a number, that number is measured from the audio or derived from a stated formula.

## Tools

${toolLines}

## Guides

${guideLines}

## Optional

- [Help and FAQ](${SITE_URL}/help): accounts, sign-in, downloads, and per-tool questions.
- [Purchases and Refunds](${SITE_URL}/refunds): how buying works, how to ask for a refund (within 18 days of the purchase, info@subverselab.com, order number + checkout e-mail), Lemon Squeezy as merchant of record deciding refunds case by case, and what a refund changes (licence, downloads, credits).
- [Terms of Use](${SITE_URL}/terms) and [Privacy Policy](${SITE_URL}/privacy).
- [Full text](${SITE_URL}/llms-full.txt): every plug-in page and every guide above, in full, as plain text.
`;
}

// The refund policy in full, from the same data as the /refunds page.
function refundsText() {
  return [`# ${REFUNDS.h1}`, `Source: ${SITE_URL}${REFUNDS.path} (last updated ${REFUNDS.updated})`, '', REFUNDS.intro,
    ...REFUNDS.sections.flatMap((sc) => ['', `## ${sc.h}`, ...sc.blocks.map((b) => `- ${b}`)])].join('\n');
}

function buildLlmsFullTxt(articles) {
  const products = llmsProductSections();
  const sections = articles
    .filter((a) => a.slug)
    .map((a) => `# ${a.title}\nSource: ${SITE_URL}/learn/${a.slug}\n\n${String(a.body || a.answer || '').trim()}`)
    .join('\n\n---\n\n');

  return `# SubverseLab — products and tool guides

> Every plug-in and app as its page describes it, then the full text of every published browser-tool guide. Index: ${SITE_URL}/llms.txt

${products}

---

${refundsText()}

---

${sections}
`;
}

async function main() {
  const { articles, products } = stripToolPrefix(await fetchContent());

  const entries = [
    urlEntry(`${SITE_URL}/`, new Date().toISOString().slice(0, 10), '1.0'),
    urlEntry(`${SITE_URL}/learn`, new Date().toISOString().slice(0, 10), '0.8'),
    urlEntry(`${SITE_URL}/help`, new Date().toISOString().slice(0, 10), '0.6'),
    // Loom's canonical home. Named in CITATION.cff, NOTICE, the MCP server's
    // serverInfo and 215 published source files, so it is cited from outside
    // the site far more than it is navigated to from inside it.
    urlEntry(`${SITE_URL}/loom`, new Date().toISOString().slice(0, 10), '0.8'),
    urlEntry(`${SITE_URL}/forum`, new Date().toISOString().slice(0, 10), '0.7'),
    urlEntry(`${SITE_URL}/tools`, new Date().toISOString().slice(0, 10), '0.7'),   // its own page since 2026-10-26
    urlEntry(`${SITE_URL}/plugins`, new Date().toISOString().slice(0, 10), '0.7'),
    urlEntry(`${SITE_URL}/plugins/kubbe`, new Date().toISOString().slice(0, 10), '0.8'),
    urlEntry(`${SITE_URL}/plugins/kaset`, new Date().toISOString().slice(0, 10), '0.8'),
    // Every owner's manual page (src/data/pluginManuals.js MANUALS, the same list App.jsx routes and prerender.js writes).
    ...MANUALS.map((m) => urlEntry(`${SITE_URL}${m.path}`, new Date().toISOString().slice(0, 10), '0.6')),
    urlEntry(`${SITE_URL}/launch`, new Date().toISOString().slice(0, 10), '0.8'),
    urlEntry(`${SITE_URL}/plugins/koro`, new Date().toISOString().slice(0, 10), '0.8'),
    urlEntry(`${SITE_URL}/plugins/yanki`, new Date().toISOString().slice(0, 10), '0.8'),
    urlEntry(`${SITE_URL}/plugins/hava`, new Date().toISOString().slice(0, 10), '0.8'),
    urlEntry(`${SITE_URL}/plugins/mihenk`, new Date().toISOString().slice(0, 10), '0.8'),
    urlEntry(`${SITE_URL}/plugins/tutkal`, new Date().toISOString().slice(0, 10), '0.8'),
    urlEntry(`${SITE_URL}/plugins/taban`, new Date().toISOString().slice(0, 10), '0.8'),
    urlEntry(`${SITE_URL}/plugins/alev`, new Date().toISOString().slice(0, 10), '0.8'),
    urlEntry(`${SITE_URL}/plugins/kiyma`, new Date().toISOString().slice(0, 10), '0.8'),
    ...(RU8_ON_SALE ? [urlEntry(`${SITE_URL}/plugins/ru8`, new Date().toISOString().slice(0, 10), '0.8')] : []),
    ...(JINGFANG_ON_SALE ? [urlEntry(`${SITE_URL}/plugins/jingfang`, new Date().toISOString().slice(0, 10), '0.8')] : []),   // only once on sale   // RU-8 only once on sale
    urlEntry(`${SITE_URL}/plugins/adalet`, new Date().toISOString().slice(0, 10), '0.8'),
    urlEntry(`${SITE_URL}/plugins/seda`, new Date().toISOString().slice(0, 10), '0.8'),
    urlEntry(`${SITE_URL}/plugins/torna`, new Date().toISOString().slice(0, 10), '0.8'),
    urlEntry(`${SITE_URL}/plugins/elek`, new Date().toISOString().slice(0, 10), '0.8'),
    urlEntry(`${SITE_URL}/launch2`, new Date().toISOString().slice(0, 10), '0.8'),
    // /testers is noindex until the owner opens the call (prerender.js); no sitemap entry for a noindex page.
    urlEntry(`${SITE_URL}/sample-packs`, new Date().toISOString().slice(0, 10), '0.5'),
    urlEntry(`${SITE_URL}/preset-packs`, new Date().toISOString().slice(0, 10), '0.5'),
    // One URL per pack shown in the store (src/data/packFacts.js visiblePacks; scripts/import-sample-packs.js).
    ...visiblePacks().map((p) => urlEntry(`${SITE_URL}${packPath(p)}`, new Date().toISOString().slice(0, 10), '0.6')),
    urlEntry(`${SITE_URL}/privacy`, '2026-10-02', '0.3'),
    urlEntry(`${SITE_URL}/terms`, '2026-10-02', '0.3'),
    urlEntry(`${SITE_URL}/refunds`, '2026-10-19', '0.3'),
  ];

  // Published guides — the real, fully public, keyword-rich SEO content.
  for (const a of articles) {
    if (!a.slug) continue;
    // /learn/sensei is noindex until Sensei ships (prerender.js); no sitemap entry for a noindex page.
    if (a.slug === 'sensei') continue;
    entries.push(urlEntry(`${SITE_URL}/learn/${a.slug}`, isoDate(a.updatedAt), '0.7'));
  }

  // Tool Room pages (/tools/*) are deliberately NOT listed: they carry
  // <meta name="robots" content="noindex,follow"> (see prerender.js), and a
  // sitemap entry for a noindex page sends crawlers mixed signals. Search
  // Console cleanup, 2026-10-07.

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
  writeFileSync(join(ROOT, 'public', 'sitemap.xml'), xml);
  console.log(`sitemap.xml written with ${entries.length} URLs`);

  writeFileSync(join(ROOT, 'public', 'robots.txt'), buildRobots());
  console.log(`robots.txt written (${AI_CRAWLERS.length} AI crawlers explicitly allowed)`);

  writeFileSync(join(ROOT, 'public', 'llms.txt'), buildLlmsTxt(articles, products));
  const full = buildLlmsFullTxt(articles);
  writeFileSync(join(ROOT, 'public', 'llms-full.txt'), full);
  console.log(`llms.txt + llms-full.txt written (${(full.length / 1024).toFixed(1)} KB of guide text)`);
}

main().catch((err) => {
  console.error('generate-sitemap failed:', err);
  process.exit(1);
});
