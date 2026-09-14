// Generates public/sitemap.xml, public/robots.txt, public/llms.txt and
// public/llms-full.txt from live Firestore data before every build. This
// service is a static file server (see Dockerfile / server.js — no backend
// routes at all), so there's no request-time hook that could generate these;
// freshness is tied to deploys. Content added straight to Firestore (the
// normal path for this site — see Rules/05_SYNC.md) won't appear here until
// subverselab-v2 is next rebuilt and deployed.
import { writeFileSync } from 'fs';
import { join } from 'path';
import { fetchContent, isoDate, ROOT, SITE_URL } from './lib/fetchContent.js';

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

  return `# SubverseLab — free AI tools for music producers
# Full guide text for every tool is available at ${SITE_URL}/llms-full.txt
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

> Free, browser-based AI tools for music producers — drum and MIDI generation, arrangement planning, mix measurement, BPM/frequency math, and stem separation. Every tool runs in the browser; nothing to install. Every tool is free; some require a free account, and where a tool applies a daily limit its own guide states it.

SubverseLab publishes independent, single-purpose production tools. Each tool has a written guide describing exactly what it does, how to use it, and what its limits are. The tools do not fabricate measurements or scores: where a tool reports a number, that number is measured from the audio or derived from a stated formula.

## Tools

${toolLines}

## Guides

${guideLines}

## Optional

- [Help and FAQ](${SITE_URL}/help): accounts, sign-in, downloads, and per-tool questions.
- [Full guide text](${SITE_URL}/llms-full.txt): every guide above, in full, as plain text.
`;
}

function buildLlmsFullTxt(articles) {
  const sections = articles
    .filter((a) => a.slug)
    .map((a) => `# ${a.title}\nSource: ${SITE_URL}/learn/${a.slug}\n\n${String(a.body || a.answer || '').trim()}`)
    .join('\n\n---\n\n');

  return `# SubverseLab — complete tool guides

> Full text of every published SubverseLab guide. Index: ${SITE_URL}/llms.txt

${sections}
`;
}

async function main() {
  const { articles, products } = await fetchContent();

  const entries = [
    urlEntry(`${SITE_URL}/`, new Date().toISOString().slice(0, 10), '1.0'),
    urlEntry(`${SITE_URL}/learn`, new Date().toISOString().slice(0, 10), '0.8'),
    urlEntry(`${SITE_URL}/help`, new Date().toISOString().slice(0, 10), '0.6'),
    // Loom's canonical home. Named in CITATION.cff, NOTICE, the MCP server's
    // serverInfo and 215 published source files, so it is cited from outside
    // the site far more than it is navigated to from inside it.
    urlEntry(`${SITE_URL}/loom`, new Date().toISOString().slice(0, 10), '0.8'),
    urlEntry(`${SITE_URL}/forum`, new Date().toISOString().slice(0, 10), '0.7'),
  ];

  // Published guides — the real, fully public, keyword-rich SEO content.
  for (const a of articles) {
    if (!a.slug) continue;
    entries.push(urlEntry(`${SITE_URL}/learn/${a.slug}`, isoDate(a.updatedAt), '0.7'));
  }

  // Every remote tool gets a Tool Room page. Member-gated ones used to be
  // excluded because a signed-out visitor (and therefore a crawler) saw only
  // a bare "Sign In Required" wall — genuinely thin content. ToolRoom.jsx
  // now renders the tool's real title, description and guide link to
  // everyone, gating only the tool itself, so these pages carry the same
  // content for a crawler as for a signed-out human and belong in the index.
  for (const p of products) {
    if (p.source_type === 'remote' && p.slug) {
      entries.push(urlEntry(`${SITE_URL}/tools/${p.slug}`, isoDate(p.updatedAt), '0.6'));
    }
  }

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
