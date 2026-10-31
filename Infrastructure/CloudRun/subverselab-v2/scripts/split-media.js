// Last build step (after vite build and prerender). Two jobs, both driven by the same two values the bundle was built with:
//
// 1. dist/.split.json = { apiBase, mediaBase }. server.js reads it to add the API and media origins to its CSP, so the
//    policy and the bundle can never disagree. A dotfile: express.static does not serve it.
// 2. With VITE_MEDIA_BASE set, the media that now comes from the bucket is removed from dist/, so the site image carries
//    pages only. What stays is decided by the build itself: every /plugins/…, /social/…, /press/… file that a page, the
//    bundle or a text file still names by its site path (og images, the family image used as an og image) is kept;
//    everything else under those folders goes. Every bucket URL the build names must exist in public/, or the build
//    fails — that is the list `gsutil rsync` uploads (docs/SPLIT_CUTOVER.md).
// With VITE_MEDIA_BASE empty nothing is removed: the same-origin build is exactly the monolith's dist.
//
// The two values are read from the process environment (Docker build args). scripts/prerender.js reads the plugin data
// under plain Node, where only the process environment exists, so a value set in .env alone would reach the bundle and
// not the prerendered HTML; that case stops the build here.
import { readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const publicDir = join(root, 'public');
const MEDIA_DIRS = ['plugins', 'social', 'press'];
const trim = (v) => String(v || '').replace(/\/+$/, '');

const fileEnv = loadEnv('production', root, 'VITE_');
for (const key of ['VITE_API_BASE', 'VITE_MEDIA_BASE']) {
  if (fileEnv[key] && fileEnv[key] !== process.env[key]) {
    console.error(`split-media: ${key} is set in an .env file but not in the process environment. Pass it as an environment variable (or Docker build arg), so the bundle and the prerendered pages use the same value.`);
    process.exit(1);
  }
}
const apiBase = trim(process.env.VITE_API_BASE);
const mediaBase = trim(process.env.VITE_MEDIA_BASE);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}
const mb = (bytes) => (bytes / 1048576).toFixed(1);
const sizeOf = async (files) => (await Promise.all(files.map((f) => stat(f).then((s) => s.size)))).reduce((a, b) => a + b, 0);

if (!existsSync(join(dist, 'index.html'))) {
  console.error('split-media: dist/index.html missing; run vite build first');
  process.exit(1);
}
await writeFile(join(dist, '.split.json'), `${JSON.stringify({ apiBase, mediaBase }, null, 2)}\n`);

const all = await walk(dist);
const distBefore = await sizeOf(all);
if (!mediaBase) {
  console.log(`split-media: same-origin media (VITE_MEDIA_BASE empty), dist ${mb(distBefore)} MB kept as built; api ${apiBase || 'same origin'}`);
  process.exit(0);
}

// What stays on the site: the og images and the family image (left unwrapped on purpose in src/data/plugins.js, because
// link previews and crawlers fetch them from fixed site URLs), plus any media path the prerendered pages and text files
// still name by its site path. The JS bundle is not scanned: after minifying, media('/plugins/x.png') still holds the
// literal '/plugins/x.png', so the bundle cannot tell a wrapped path from an unwrapped one. scripts/test-split.js checks
// the source instead: every media path in src/ is either wrapped in media() or one of these fixed ones.
// The look-behind skips the same path inside a bucket URL (…/subverselab-media/plugins/x.png).
const SITE_PATH = new RegExp(`(?<![A-Za-z0-9_.:/-])/(?:${MEDIA_DIRS.join('|')})/[A-Za-z0-9_./%-]+\\.[A-Za-z0-9]{2,5}`, 'g');
const pluginsSource = await readFile(join(root, 'src/data/plugins.js'), 'utf8');
const keep = new Set([...pluginsSource.matchAll(/\bog: '(\/[^']+)'|FAMILY_IMAGE = '(\/[^']+)'/g)].map((m) => m[1] || m[2]));
for (const file of all.filter((f) => /\.(html|txt|xml)$/i.test(f))) {
  for (const m of (await readFile(file, 'utf8')).matchAll(SITE_PATH)) keep.add(decodeURI(m[0]));
}

// Every path the source loads through media() must be in public/, or the upload would miss it.
const srcFiles = (await walk(join(root, 'src'))).filter((f) => /\.(js|jsx)$/.test(f));
const fromBucket = new Set();
for (const file of srcFiles) {
  for (const m of (await readFile(file, 'utf8')).matchAll(/\bmedia\('(\/[^']+)'\)/g)) fromBucket.add(m[1]);
}
const missing = [...fromBucket].filter((p) => !existsSync(join(publicDir, p)));
if (missing.length) {
  console.error(`split-media: ${missing.length} media path(s) the site loads from the bucket are not in public/ (so they would not be uploaded):\n  ${missing.join('\n  ')}`);
  process.exit(1);
}

const candidates = all.filter((f) => {
  const rel = `/${relative(dist, f).split(sep).join('/')}`;
  return MEDIA_DIRS.some((d) => rel.startsWith(`/${d}/`)) && !rel.endsWith('.html');
});
const removed = candidates.filter((f) => !keep.has(`/${relative(dist, f).split(sep).join('/')}`));
const removedBytes = await sizeOf(removed);
for (const f of removed) await rm(f);
// Folders left empty (social/…, press/) go too; a prerendered page keeps its folder.
async function pruneEmpty(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (entry.isDirectory()) await pruneEmpty(join(dir, entry.name));
  }
  if (existsSync(dir) && !(await readdir(dir)).length) await rm(dir, { recursive: true });
}
for (const d of MEDIA_DIRS) await pruneEmpty(join(dist, d));
const kept = candidates.length - removed.length;
const distAfter = await sizeOf(await walk(dist));
console.log(`split-media: media from ${mediaBase}; removed ${removed.length} files (${mb(removedBytes)} MB) from dist, kept ${kept} named by site path (og images); media() paths in src: ${fromBucket.size}, all present in public/; dist ${mb(distBefore)} → ${mb(distAfter)} MB; api ${apiBase || 'same origin'}`);
