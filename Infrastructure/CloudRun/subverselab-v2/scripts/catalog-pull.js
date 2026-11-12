#!/usr/bin/env node
// The live catalogue, copied into this tree (owner 2026-11-12: "panelden yüklediklerimizin lokalde karşılığı olmuyor").
// What /admin → Catalogue holds lives only in Firestore and the Firebase bucket; this writes it to catalog-snapshot/ so it
// can be read, diffed, committed and restored. Read-only: nothing is written to the live site.
//
//   node scripts/catalog-pull.js            pull; prints what changed since the last pull
//   node scripts/catalog-pull.js --check    no writes; exit 1 when the snapshot is behind the live catalogue
//
// With an agent key (SVL_AGENT_KEY or ~/.config/subverselab/agent_key) the admin view is read: hidden and scheduled items
// and the download manifest too. Without one, the public GET /api/catalog (what visitors see).
//
// catalog-snapshot/
//   <kind>/<id>.json     one file per item, keys sorted (a panel edit is a small diff)
//   manifest.json        the sold files' names, sizes and versions (the files themselves stay in the downloads bucket)
//   media/<bucket path>  every picture, preview, peaks file and PDF an item points at
//   PULLED.json          when, from where, which view, counts
// A file no item points at any more is listed, never deleted here.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'catalog-snapshot');
const API = (process.env.SVL_API || 'https://subverselab.com').replace(/\/$/, '');
const CHECK = process.argv.includes('--check');
const KINDS = ['news', 'plugins', 'samplePacks', 'presetPacks', 'publishers'];
const PRIVATE_FIELDS = new Set(['email']);            // a publisher's e-mail never goes into the tree
const MEDIA_HOST = 'firebasestorage.googleapis.com';

const keyFromFile = () => { try { return readFileSync(join(homedir(), '.config', 'subverselab', 'agent_key'), 'utf8').trim(); } catch { return ''; } };
const KEY = process.env.SVL_AGENT_KEY || keyFromFile();

const sorted = (v) => {
  if (Array.isArray(v)) return v.map(sorted);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().filter((k) => !PRIVATE_FIELDS.has(k)).map((k) => [k, sorted(v[k])]));
  return v;
};
const stable = (v) => JSON.stringify(sorted(v), null, 2) + '\n';
const idOf = (it) => String(it.id || it.slug || it.key || '').replace(/[^a-zA-Z0-9._-]/g, '_');
const urlsIn = (v, out = new Set()) => {
  if (typeof v === 'string') { for (const m of v.matchAll(/https:\/\/[^\s"'<>)]+/g)) if (new URL(m[0]).host === MEDIA_HOST) out.add(m[0]); }
  else if (v && typeof v === 'object') for (const x of Object.values(v)) urlsIn(x, out);
  return out;
};
// https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encoded path>?alt=media&token=… -> the object path
const mediaPath = (url) => { const m = new URL(url).pathname.match(/\/o\/(.+)$/); return m ? decodeURIComponent(m[1]).replace(/\.\.+/g, '.') : null; };
const walk = (dir) => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])) : []);

async function readCatalog() {
  if (KEY) {
    const r = await fetch(`${API}/api/admin/catalog?fresh=1`, { headers: { Authorization: `Bearer ${KEY}` } });
    if (r.ok) return { view: 'admin', cat: await r.json() };
    console.error(`admin view refused (${r.status}); reading the public catalogue instead`);
  }
  const r = await fetch(`${API}/api/catalog`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`GET /api/catalog answered ${r.status}`);
  const cat = await r.json();
  const m = await fetch(`${API}/api/download/manifest`).then((x) => (x.ok ? x.json() : null)).catch(() => null);
  return { view: 'public', cat: { ...cat, manifest: m || undefined } };
}

const { view, cat } = await readCatalog();
const changes = { added: [], changed: [], gone: [], media: [], unused: [] };
const write = (file, text) => { if (!CHECK) { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text); } };

for (const kind of KINDS) {
  const items = Array.isArray(cat[kind]) ? cat[kind] : [];
  const dir = join(OUT, kind);
  const seen = new Set();
  for (const it of items) {
    const id = idOf(it);
    if (!id) continue;
    seen.add(`${id}.json`);
    const file = join(dir, `${id}.json`);
    const text = stable(it);
    if (!existsSync(file)) { changes.added.push(`${kind}/${id}`); write(file, text); }
    else if (readFileSync(file, 'utf8') !== text) { changes.changed.push(`${kind}/${id}`); write(file, text); }
  }
  // An item that left the live catalogue leaves the snapshot too (git keeps the old file); the public view cannot tell
  // "deleted" from "hidden", so it only reports.
  for (const f of existsSync(dir) ? readdirSync(dir) : []) {
    if (!f.endsWith('.json') || seen.has(f)) continue;
    changes.gone.push(`${kind}/${f.replace(/\.json$/, '')}${view === 'admin' ? '' : ' (not in the public view: hidden or deleted; file kept)'}`);
    if (view === 'admin' && !CHECK) unlinkSync(join(dir, f));
  }
}

if (cat.manifest) {
  const file = join(OUT, 'manifest.json');
  const text = stable(cat.manifest);
  if (!existsSync(file) || readFileSync(file, 'utf8') !== text) { changes.changed.push('manifest'); write(file, text); }
}

const wanted = new Map();
for (const url of urlsIn(KINDS.map((k) => cat[k]))) { const p = mediaPath(url); if (p) wanted.set(p, url); }
let mediaBytes = 0;
for (const [p, url] of wanted) {
  const file = join(OUT, 'media', p);
  if (existsSync(file) && statSync(file).size > 0) { mediaBytes += statSync(file).size; continue; }   // bucket names are unique per upload
  changes.media.push(p);
  if (CHECK) continue;
  const r = await fetch(url);
  if (!r.ok) { console.error(`media ${r.status}: ${p}`); process.exitCode = 2; continue; }
  const buf = Buffer.from(await r.arrayBuffer());
  write(file, buf);
  mediaBytes += buf.length;
}
for (const f of walk(join(OUT, 'media'))) { const p = relative(join(OUT, 'media'), f); if (!wanted.has(p) && !p.endsWith('.DS_Store')) changes.unused.push(p); }

const counts = Object.fromEntries(KINDS.map((k) => [k, (cat[k] || []).length]));
const dirty = changes.added.length + changes.changed.length + changes.gone.length + changes.media.length;
if (!CHECK && (dirty || !existsSync(join(OUT, 'PULLED.json')))) {
  write(join(OUT, 'PULLED.json'), JSON.stringify({ pulledAt: new Date().toISOString(), from: API, view, counts, media: { files: wanted.size, bytes: mediaBytes } }, null, 2) + '\n');
}

console.log(`${view} view of ${API}: ${KINDS.map((k) => `${counts[k]} ${k}`).join(', ')}; ${wanted.size} media files (${(mediaBytes / 1048576).toFixed(1)} MB local)`);
for (const [label, list] of [['new', changes.added], ['changed', changes.changed], ['gone', changes.gone], [CHECK ? 'media missing' : 'media fetched', changes.media], ['media no item uses (kept)', changes.unused]]) {
  if (list.length) console.log(`  ${label} (${list.length}): ${list.slice(0, 40).join(', ')}${list.length > 40 ? ' …' : ''}`);
}
if (!dirty) console.log('  the snapshot is up to date');
if (CHECK && dirty) process.exit(1);
