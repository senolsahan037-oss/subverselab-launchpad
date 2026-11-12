// From a catalogue document (api/catalogSchema.js fields) to the object shape the pages already draw: a PluginRoom plug-in
// (src/data/plugins.js), an importer sample pack (src/data/samplePacks.js), a preset pack (src/data/presetPacks.js), a news
// frame (src/data/news.js). `over` is the static object being edited: only fields the panel filled in replace its own.
import { videosToDemos } from '../../api/catalogSchema.js';

const set = (v) => v !== undefined && v !== null && v !== '';
const pick = (doc, keys, over) => {
  const out = {};
  for (const [from, to] of keys) if (set(doc[from]) || !over) out[to || from] = doc[from];
  return out;
};

export function newsFromDoc(d, { over } = {}) {
  const out = pick(d, [['kicker'], ['dateLabel', 'date'], ['title'], ['line'], ['image'], ['alt'], ['to'], ['cta']], over);
  if (set(d.bare) || !over) out.bare = d.bare === 'bare' ? true : d.bare === 'flat' ? 'flat' : false;
  return { key: d.id, ...out, live: true };
}

const coverOf = (url) => ({ jpg: url, webp: url, small: url });

// "12.5 Hook" lines from the panel -> the scene markers the preview strip draws ({ t: seconds, label }).
export function parseScenes(lines) {
  if (!Array.isArray(lines)) return [];
  return lines.map((l) => { const m = String(l).trim().match(/^(\d+(?:\.\d+)?)\s*[:\-–]?\s*(.*)$/); return m ? { t: Number(m[1]), label: m[2] || '' } : null; })
    .filter((x) => x && Number.isFinite(x.t)).sort((a, b) => a.t - b.t).slice(0, 40);
}

export function samplePackFromDoc(d, { over } = {}) {
  const out = pick(d, [['name'], ['fullName'], ['kindLine'], ['madeLine'], ['summary'], ['inside'], ['publisher'], ['peaks'], ['technical'], ['folders', 'folderRows'], ['soundcloud']], over);
  if (set(d.licence)) out.licenceMode = d.licence;
  if (set(d.cover)) out.cover = coverOf(d.cover);
  if (set(d.snippet)) out.snippet = { ...(over?.snippet || {}), src: d.snippet };
  if (Array.isArray(d.scenes) && d.scenes.length) out.scenes = parseScenes(d.scenes);
  if (over) return { ...out, live: true };
  return {
    slug: d.id, status: 'approved', catalogOnly: true, live: true,
    name: d.name, fullName: d.fullName || `SVL ${d.name}`, kindLine: d.kindLine, madeLine: d.madeLine || '', summary: d.summary || '',
    inside: Array.isArray(d.inside) ? d.inside : [],
    cover: coverOf(d.cover), snippet: d.snippet ? { src: d.snippet } : null, peaks: d.peaks || null, scenes: parseScenes(d.scenes), publisher: d.publisher || '',
    technical: Array.isArray(d.technical) ? d.technical : [], folderRows: Array.isArray(d.folders) ? d.folders : [], licenceMode: d.licence || 'standard', soundcloud: d.soundcloud || '',
    counts: null, folders: [], docs: [], format: [], bpms: [], loopKeys: [], notes: [], zipBytes: 0, unzippedBytes: 0, licence: null,
  };
}

export function presetPackFromDoc(d, { over } = {}) {
  const out = pick(d, [['name'], ['kind'], ['cover'], ['image'], ['imageAlt'], ['imageSize'], ['previewAudio'], ['summary'], ['inside'], ['requirements'], ['install'], ['download'], ['free'], ['publisher']], over);
  if (set(d.roomTo)) out.room = { label: d.roomLabel || 'Open the room', to: d.roomTo };
  if (over) return { ...out, live: true };
  return {
    id: d.id, catalogOnly: true, live: true,
    name: d.name, kind: d.kind, cover: d.cover, image: d.image || d.cover, imageAlt: d.imageAlt || `${d.name} cover`, imageSize: d.imageSize || [600, 600],
    previewAudio: d.previewAudio || null, summary: d.summary || '', inside: Array.isArray(d.inside) ? d.inside : [],
    requirements: Array.isArray(d.requirements) ? d.requirements : [], install: d.install || '', download: d.download || (d.free ? 'One zip, free with a SubverseLab account.' : 'One zip; it downloads from your Account page after purchase.'),
    free: Boolean(d.free), room: d.roomTo ? { label: d.roomLabel || 'Open the room', to: d.roomTo } : null, publisher: d.publisher || '',
  };
}

const STANDARD_FORMATS = 'VST3 and AU on macOS (Apple Silicon and Intel) · VST3 on Windows';

export function pluginFromDoc(d) {
  const name = d.displayName || d.name || d.id.toUpperCase();
  const size = Array.isArray(d.imageSize) && d.imageSize.length === 2 ? d.imageSize : [1600, 600];
  const modes = [{ key: 'front', name: 'Front', image: d.cardImage, text: d.tagline || '' }, ...(Array.isArray(d.modes) ? d.modes : []).filter((m) => m.image && m.name)];
  return {
    slug: d.id, path: `/plugins/${d.id}`, catalogOnly: true, live: true,
    name, displayName: name, kind: d.kind || 'Plug-in', model: d.model || '', tagline: d.tagline || '',
    title: d.title || `${name}: ${d.kind || 'plug-in'} | SubverseLab`,
    description: d.description || d.tagline || '',
    og: d.og || d.cardImage, cardImage: d.cardImage, boxImage: d.boxImage || null, imageSize: size,
    intro: d.intro || '', defaultMode: 'front', modesLabel: 'On the panel', modes,
    sections: Array.isArray(d.sections) ? d.sections : [],
    controls: Array.isArray(d.controls) ? d.controls : [],
    controlsNote: d.controlsNote || '',
    formats: d.formats || STANDARD_FORMATS, trust: d.trust || '',
    manual: d.manual || null, manualPage: null,
    free: Boolean(d.free), noKey: d.noKey !== false, launchId: d.free ? 'free' : 'solo',
    musehub: d.musehub || null, publisher: d.publisher || '',
    demos: videosToDemos(d.videos),
  };
}

// A live item that edits a plug-in already in the site code (`edits`, or simply the same slug): its filled-in fields
// replace the room's own, field by field; empty fields and the flags (free, noKey) keep the code's values. Its videos come
// first under "Hear it", then the room's own demos (an id in both is shown once). Prices, checkouts and dates are written
// into the data objects by applyCatalogData, as for every live item.
const ROOM_TEXT = ['kind', 'model', 'tagline', 'title', 'description', 'intro', 'cardImage', 'og', 'boxImage', 'controlsNote', 'formats', 'trust', 'manual'];
export function overlayPlugin(p, d) {
  if (!p || !d) return p;
  const out = { ...p };
  for (const k of ROOM_TEXT) if (set(d[k])) out[k] = d[k];
  if (set(d.displayName)) { out.name = d.displayName; out.displayName = d.displayName; }
  if (Array.isArray(d.imageSize) && d.imageSize.length === 2) out.imageSize = d.imageSize;
  if (Array.isArray(d.sections) && d.sections.length) out.sections = d.sections;
  if (Array.isArray(d.controls) && d.controls.length) out.controls = d.controls;
  if (set(d.musehub)) out.musehub = d.musehub;
  if (set(d.publisher)) out.publisher = d.publisher;
  const live = videosToDemos(d.videos);
  if (live.length) out.demos = [...live, ...(p.demos || []).filter((x) => !live.some((l) => l.youtube === x.youtube))];
  return out;
}
