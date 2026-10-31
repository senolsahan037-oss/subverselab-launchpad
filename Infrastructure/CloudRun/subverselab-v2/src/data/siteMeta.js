// The home page names the products on sale from the data (no counts, owner 17 Oct).
import { FAMILY_PLUGINS, SOLO_PLUGINS, FREE_PLUGINS } from './plugins.js';
// Static page metadata, shared by the React app and the build-time prerender
// script (scripts/prerender.js, plain Node, no bundler) — the same pattern as
// faqContent.js. A crawler reads the prerendered tags and a visitor's tab ends
// up with the Helmet-set ones; if these lived in two places they would drift,
// and the two audiences would see different titles for the same URL.
export const SITE_URL = 'https://subverselab.com';

export const HOME = {
  title: 'SubverseLab — Plugins and Tools for Music Producers',
  description:
    `Audio plugins and apps for music producers on macOS and Windows (${[...FAMILY_PLUGINS, ...SOLO_PLUGINS, ...FREE_PLUGINS].map((p) => p.displayName).join(', ')}), sample packs, Ableton Live preset packs and browser tools.`,
  path: '/',
};

// The browser tools moved from the homepage to /tools on 2026-10-26 (owner); the homepage is the news.
export const TOOLS = {
  title: 'Browser Tools for Music Producers | SubverseLab',
  description:
    'SubverseLab browser tools for arranging, generating, measuring, mixing and separating music. Nothing to install; some ask for a free account.',
  path: '/tools',
};

export const LEARN_INDEX = {
  title: 'Music Production Tool Guides | SubverseLab',
  description:
    'Written guides for every SubverseLab tool — what each one does, how to use it, and where its limits are.',
  path: '/learn',
};

export const HELP = {
  title: 'Help & FAQ | SubverseLab',
  description:
    'Answers about SubverseLab accounts, buying and downloading plugins and packs, credits, and how each tool works.',
  path: '/help',
};

// Guide bodies are markdown opening with a "## Overview" heading, so passing
// them straight into a meta description leaks "## Overview ... **bold**" into
// search snippets and link previews. scripts/prerender.js applies the same
// treatment to the prerendered tags; this keeps the client-side ones identical.
export function toMetaDescription(source, fallback = '', limit = 155) {
  const firstProse = (md = '') => {
    for (const block of String(md).split(/\n\s*\n/)) {
      const t = block.trim();
      if (!t || t.startsWith('#') || t.startsWith('|') || /^-{3,}$/.test(t)) continue;
      return t;
    }
    return '';
  };
  const strip = (md = '') => String(md)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  const text = strip(firstProse(source)) || strip(firstProse(fallback)) || strip(source);
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:]$/, '')}…`;
}
