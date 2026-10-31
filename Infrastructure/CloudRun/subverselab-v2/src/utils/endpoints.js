// Where the site sends API calls and loads media from. Both are build-time config, so the same code runs as today's
// single service (both empty: same-origin /api and /plugins/…) or split (docs/SPLIT_CUTOVER.md):
//   VITE_API_BASE=https://api.subverselab.com           → every /api call goes to the API service
//   VITE_MEDIA_BASE=https://storage.googleapis.com/…     → screenshots, card art, manuals and the press kit come from the bucket
// Switching or rolling back is a rebuild with other values, never a code change. scripts/prerender.js imports the plugin
// data under Node, where import.meta.env does not exist, so the values are then read from the process environment.
const env = import.meta.env || globalThis.process?.env || {};
const trim = (value) => String(value || '').replace(/\/+$/, '');

export const API_BASE = trim(env.VITE_API_BASE);
export const MEDIA_BASE = trim(env.VITE_MEDIA_BASE);

// apiUrl('/api/inbox') → '/api/inbox' or 'https://api.subverselab.com/api/inbox'. Also takes the relative
// '/api/download/file?t=…' the server returns in a download ticket. Anything not starting with '/' is returned as is.
export const apiUrl = (path) => (typeof path === 'string' && path.startsWith('/') ? API_BASE + path : path);

// The absolute address of an API path, for text a person copies elsewhere (the tester agent's OpenAPI link).
export const apiAbsoluteUrl = (path) => (API_BASE ? API_BASE + path : `${window.location.origin}${path}`);

// media('/plugins/kubbe/hero.webp') → the same path on the site, or on the media bucket. Images that crawlers and link
// previews read (og images, the family image used as an og image) are NOT wrapped: they stay at fixed site URLs.
export const media = (path) => (typeof path === 'string' && path.startsWith('/') ? MEDIA_BASE + path : path);
