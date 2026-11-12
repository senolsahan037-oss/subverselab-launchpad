// Pure merges of the live catalogue over the hand-written data (no React, no data imports: scripts/test-catalog.js runs
// them under Node). The pages call them through src/catalog/catalog.js.
import { liveAt, staticOrder } from '../../api/catalogSchema.js';
import { pluginFromDoc, samplePackFromDoc, presetPackFromDoc, newsFromDoc, overlayPlugin } from './shapes.js';

// Static news frames + live items -> the frames to draw, in order. A live item with a static frame's key edits that frame
// (only the fields it fills in) or hides it (published off); a new key is a new frame placed by `order`.
export function mergeNews(staticItems, liveItems, now = Date.now()) {
  const byKey = new Map(liveItems.map((d) => [d.id, d]));
  const out = [];
  staticItems.forEach((n, i) => {
    const live = byKey.get(n.key);
    if (live) {
      byKey.delete(n.key);
      if (!liveAt(live, now)) return;
      out.push({ ...n, ...newsFromDoc(live, { over: n }), order: live.order ?? staticOrder(i) });
    } else out.push({ ...n, order: staticOrder(i) });
  });
  for (const d of byKey.values()) if (liveAt(d, now)) out.push({ ...newsFromDoc(d), order: d.order ?? 10_000 });
  return out.map((n, i) => ({ n, i })).sort((a, b) => (a.n.order === b.n.order ? a.i - b.i : a.n.order - b.n.order)).map(({ n }) => n);
}

// The importer's packs + live docs -> one list. A live doc with a known slug edits its words, cover and preview, or hides
// it; a new slug is a pack of its own (catalogOnly: the page shows the panel's fields, no measurement plate).
export function mergeSamplePacks(staticList, liveDocs, now = Date.now()) {
  const bySlug = new Map(liveDocs.map((d) => [d.id, d]));
  const out = [];
  for (const p of staticList) {
    const live = bySlug.get(p.slug);
    if (!live) { out.push(p); continue; }
    bySlug.delete(p.slug);
    if (!liveAt(live, now)) continue;
    out.push({ ...p, ...samplePackFromDoc(live, { over: p }) });
  }
  for (const d of bySlug.values()) if (liveAt(d, now)) out.push(samplePackFromDoc(d));
  return out;
}

export function mergePresetPacks(staticList, liveDocs, now = Date.now()) {
  const byId = new Map(liveDocs.map((d) => [d.id, d]));
  const out = [];
  for (const p of staticList) {
    const live = byId.get(p.id);
    if (!live) { out.push(p); continue; }
    byId.delete(p.id);
    if (!liveAt(live, now)) continue;
    out.push({ ...p, ...presetPackFromDoc(live, { over: p }) });
  }
  for (const d of byId.values()) if (liveAt(d, now)) out.push(presetPackFromDoc(d));
  return out;
}

// Live plug-ins that are not in src/data/plugins.js, as room objects. A known slug is drawn by its own room with the live
// item laid over it (livePlugin below).
export function catalogPlugins(liveDocs, knownSlugs, now = Date.now()) {
  return liveDocs.filter((d) => liveAt(d, now) && !knownSlugs.includes(d.id)).map((d) => pluginFromDoc(d));
}

// A plug-in from src/data/plugins.js with its live catalogue item (same slug) laid over it; the plug-in itself when there
// is none or it is hidden.
export function livePlugin(p, liveDocs, now = Date.now()) {
  const d = (liveDocs || []).find((x) => x.id === p.slug);
  return d && liveAt(d, now) ? overlayPlugin(p, d) : p;
}
