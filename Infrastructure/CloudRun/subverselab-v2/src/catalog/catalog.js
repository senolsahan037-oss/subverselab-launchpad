// The live catalogue in the browser (owner 2026-10-31: new products, news and packs are added from /admin and show on the
// site without a deploy). GET /api/catalog is fetched once per page load and laid over the hand-written data:
//   - news: a live item with a static frame's key edits or hides that frame; new keys are new frames; `order` sorts them;
//   - sample packs, preset packs, plug-ins: a live item with a known slug edits its price, checkout and dates (and, for a
//     plug-in, the room's texts, pictures and videos it fills in: livePlugin); a new slug is a new product, drawn by the same pages from the fields the panel filled in (src/catalog/shapes.js);
//   - prices, checkouts, launch prices and release dates of live items are written into the data objects the buttons and
//     the store order read (src/catalog/data.js), so every button sees them.
// The prerendered HTML carries the static baseline only; a crawler sees the live items once the page's script runs.
import { useEffect, useState } from 'react';
import { apiUrl } from '../utils/endpoints.js';
import { applyCatalogData } from './data.js';

export { mergeNews, mergeSamplePacks, mergePresetPacks, catalogPlugins, livePlugin } from './merge.js';
export { applyCatalogData };

export const EMPTY_CATALOG = Object.freeze({ news: [], plugins: [], samplePacks: [], presetPacks: [], publishers: [], loaded: false });

let pending = null;
let current = null;
const listeners = new Set();

const normalize = (raw) => ({
  news: Array.isArray(raw?.news) ? raw.news : [],
  plugins: Array.isArray(raw?.plugins) ? raw.plugins : [],
  samplePacks: Array.isArray(raw?.samplePacks) ? raw.samplePacks : [],
  presetPacks: Array.isArray(raw?.presetPacks) ? raw.presetPacks : [],
  publishers: Array.isArray(raw?.publishers) ? raw.publishers : [],
  loaded: true,
});

export function loadCatalog() {
  if (typeof fetch === 'undefined') return Promise.resolve(EMPTY_CATALOG);
  if (!pending) {
    pending = fetch(apiUrl('/api/catalog'), { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((raw) => {
        const cat = normalize(raw);
        applyCatalogData(cat);
        current = cat;
        listeners.forEach((f) => f(cat));
        return cat;
      });
  }
  return pending;
}

// Forces the next read to fetch again (the admin panel after a save).
export function refreshCatalog() { pending = null; return loadCatalog(); }

// The catalogue as a hook: EMPTY_CATALOG (loaded: false) until the fetch answers, then the live items.
export function useCatalog() {
  const [cat, setCat] = useState(current || EMPTY_CATALOG);
  useEffect(() => {
    let alive = true;
    const onChange = (c) => { if (alive) setCat(c); };
    listeners.add(onChange);
    loadCatalog().then(onChange);
    return () => { alive = false; listeners.delete(onChange); };
  }, []);
  return cat;
}

// The publisher a product points at (its `publisher` id), as the pages print it: { id, name, link, role } or null for
// SubverseLab's own. An ended publisher keeps the name on the products it already has.
export function publisherOf(cat, id) {
  if (!id) return null;
  const p = (cat?.publishers || []).find((d) => d.id === id);
  return p ? { id: p.id, name: p.name, link: p.link || '', role: p.role || 'producer' } : null;
}
