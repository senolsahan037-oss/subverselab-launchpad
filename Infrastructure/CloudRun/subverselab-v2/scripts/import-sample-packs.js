// Sample pack importer: the ONLY way pack facts reach the site.
//
//   node scripts/import-sample-packs.js            (re-run whenever a pack zip or snippet changes)
//   SVL_PACKS_OUT=/path/to/out node scripts/import-sample-packs.js
//
// Reads 01_AI_Tools/subverselab-packs/out/:
//   <work>/Preview/*_snippet.mp3 + snippet_scenes.json   the page preview (not in the zip)
//   SVL_<Name>.zip                                         the file that is sold; everything else is read FROM THE ZIP
//                                                          (folder counts, WAV headers, measurements.csv, README.txt,
//                                                          LICENCE_DRAFT.txt), so the page describes exactly what a buyer gets.
// A pack counts only when both its zip and its snippet exist. Writes:
//   src/data/samplePacks.js                 generated data (do not edit by hand)
//   public/sample-packs/<slug>/             snippet.mp3, scenes.json, peaks.json, cover.jpg + cover.webp (+ cover-600.webp)
// Prices and checkout links are NOT here: src/data/samplePackPrices.js (hand-edited).
// Nothing is invented: a value that cannot be read from the files is left out, and a zip whose files disagree with
// its own measurements.csv stops the import.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync, statSync, rmSync, createReadStream, mkdtempSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { openZip, wavInfo } from './lib/zip-read.js';
import { SAMPLE_PACK_LISTED } from '../api/entitlements.js';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');
const LAUNCHPAD = resolve(ROOT, '..', '..', '..');
export const PACKS_OUT = process.env.SVL_PACKS_OUT || join(LAUNCHPAD, '01_AI_Tools', 'subverselab-packs', 'out');
const PUBLIC_DIR = join(ROOT, 'public', 'sample-packs');
const DATA_FILE = join(ROOT, 'src', 'data', 'samplePacks.js');

// The packs, in catalogue order. The store grows to ten sample packs (melodic ones as they are finished): a new pack is ONE
// line here (plus its listing date in api/entitlements.js SAMPLE_PACK_LISTED, checked by scripts/test-sample-packs.js). A pack
// whose zip or snippet does not exist yet is simply not listed; an SVL_*.zip that is not in this list is reported, never published. `work` = the rig's working folder (out/<work>), `name` = SVL_<name>.zip.
// approved: the owner listened and froze the pack (STATUS.md, 16 Oct; only Kerbstone since Brickyard was unfrozen 16 Oct evening). rebuild: being regenerated (shorter drum tails,
// 16 Oct evening); a zip older than REBUILD_STARTED is the old build -> status 'rebuild-pending'; a newer zip -> 'rebuilt'
// (new files, the owner's ear still to come). Re-run this script when the new zips land; nothing else changes.
export const PACK_SOURCES = [
  { slug: 'brickyard', work: 'pack1', name: 'Brickyard', approved: true },   // owner 17 Oct night: on sale, the customer judges
  { slug: 'kerbstone', work: 'drill', name: 'Kerbstone', approved: true },
  { slug: 'stepwell', work: 'garage', name: 'Stepwell', approved: true },   // owner 17 Oct night: on sale, the customer judges
  { slug: 'lampglass', work: 'house', name: 'Lampglass', approved: true },   // owner 17 Oct night: on sale, the customer judges
  { slug: 'slagworks', work: 'techno', name: 'Slagworks', approved: true },   // owner 17 Oct night: on sale, the customer judges
  { slug: 'squall', work: 'fx', name: 'Squall', approved: true },   // owner 17 Oct night: on sale, the customer judges
  // New packs (store target: ten sample packs, KNOWLEDGE B8). Name and slug are read from out/<work>/Preview/[SVL_]<Name>_snippet.mp3
  // when the pack is finished; until then (no zip, no snippet) they are simply not listed.
  { work: 'trap' },
  { work: 'boombap' },
  // melemo (Rainlamp) and melhype (Flarestack) were rejected by the owner 17 Oct ("satılabilir ya da sergilenebilir değil"): not sources.
  { slug: 'lowlight', work: 'surge_pack', name: 'Lowlight', approved: true },   // v2 with drums (owner 17 Oct night)
  { slug: 'ironmere', work: 'surge_pack_cinematic', name: 'Ironmere', approved: true },   // cinematic loops with drums (owner 17 Oct night)
  { slug: 'palmglow', work: 'surge_pack_house', name: 'Palmglow', approved: true },   // melodic house loops with drums (owner 17 Oct night)
  { slug: 'mirage', work: 'surge_pack_anatolian', name: 'Mirage', approved: true },   // Anatolian loops on JING FANG (owner 28 Oct: "paketleyelim", for the 1 Nov deploy)
  { slug: 'kotoflux', work: 'surge_pack_eastasian', name: 'Kotoflux', approved: true },   // East Asian loops on JING FANG (owner 28 Oct: "kotuflux geldi iyi görünüyor bunu da sar")
  // Owner 28 Oct: "saffronu onayladım", "hepsi onaylı geçir ve samplepacklere ekle" (JING FANG builds).
  { slug: 'saffron', work: 'surge_pack_indian', name: 'Saffron', approved: true },
  { slug: 'solstice', work: 'surge_pack_afrolatin', name: 'Solstice', approved: true },
  { slug: 'velvetroom', work: 'surge_pack_soulrnb', name: 'Velvetroom', approved: true },
  { slug: 'nightgrid', work: 'surge_pack_synthwave', name: 'Nightgrid', approved: true },
];
export const REBUILD_STARTED = '2026-10-16T18:50:00+03:00';

// ---------- small helpers (exported for scripts/test-sample-packs.js) ----------
export function parseCsv(text) {
  const rows = [];
  let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i += 1; } else if (c === '"') q = false; else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1 || r[0]);
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

const NOTE_INDEX = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
// 'Fsmin' / 'F#min' -> 'F# minor', 'Cmaj' -> 'C major', 'Fs1' -> 'F#1', 'A#1' -> 'A#1'; null when it is not a key/note.
export function keyLabel(k) {
  const m = /^([A-G])(s|#|b)?(min|maj|m)?(-?\d)?$/.exec(String(k || '').trim());
  if (!m) return null;
  const acc = m[2] === 's' || m[2] === '#' ? '#' : m[2] === 'b' ? 'b' : '';
  if (m[3] && m[4] == null) return `${m[1]}${acc} ${m[3] === 'maj' ? 'major' : 'minor'}`;
  if (!m[3] && m[4] != null) return `${m[1]}${acc}${m[4]}`;
  if (!m[3] && m[4] == null) return `${m[1]}${acc}`;
  return null;
}
export function notePitch(label) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(label || '');
  if (!m) return null;
  let n = NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return (Number(m[3]) + 1) * 12 + n;
}
const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
const range = (vals) => {
  const v = vals.filter((x) => x != null);
  return v.length ? [Math.min(...v), Math.max(...v)] : null;
};
const uniq = (a) => [...new Set(a)];

// LICENCE_DRAFT.txt -> { draft, title, clauses: [{ title, text }] }
export function parseLicence(text) {
  const lines = text.replace(/\r/g, '').split('\n');
  const draft = /^DRAFT\b/i.test(lines[0] || '');
  // Owner 4 Nov 2026: no draft wording reaches a buyer, so a trailing "(draft)" leaves the title (re-applied 6 Nov: the 4 Nov edit was lost).
  const title = (lines.find((l) => /licence/i.test(l) && !/^DRAFT/i.test(l)) || '').trim().replace(/\s*\(draft\)\s*$/i, '');
  const clauses = [];
  let cur = null;
  for (const l of lines) {
    const m = /^(\d+)\.\s+([^.]+)\.\s*(.*)$/.exec(l.trim());
    if (m) { cur = m[3].trim() ? { title: m[2].trim(), text: m[3].trim() } : { title: null, text: `${m[2].trim()}.` }; clauses.push(cur); } else if (cur && l.trim()) cur.text += ` ${l.trim()}`;
    else if (!l.trim()) cur = null;
  }
  return { draft, title, clauses };
}

// The order folders are listed in: one-shot/sound folders, Loops, MIDI, Demo.
// A melodic pack keeps one folder per loop (Loops/<Loop>/ with Full + stems + MIDI, Lowlight 17 Oct): those count as Loops.
export const isLoopFolder = (f) => f === 'Loops' || String(f || '').startsWith('Loops/');
const folderRank = (f) => (isLoopFolder(f) ? 2 : f === 'MIDI' ? 3 : f === 'Demo' ? 4 : 1);
export function sortFolders(a, b) { return folderRank(a) - folderRank(b) || a.localeCompare(b); }

function sha256File(path) {
  return new Promise((ok, bad) => {
    const h = createHash('sha256');
    createReadStream(path).on('data', (d) => h.update(d)).on('end', () => ok(h.digest('hex'))).on('error', bad);
  });
}

function snippetPeaks(mp3, buckets = 800) {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', mp3, '-ac', '1', '-ar', '8000', '-f', 'f32le', '-'], { maxBuffer: 256 * 1024 * 1024 });
  const s = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4));
  const per = Math.max(1, Math.floor(s.length / buckets));
  const out = [];
  let top = 0;
  for (let i = 0; i < buckets; i += 1) {
    let m = 0;
    for (let j = i * per; j < Math.min(s.length, (i + 1) * per); j += 1) m = Math.max(m, Math.abs(s[j]));
    out.push(m); top = Math.max(top, m);
  }
  return { seconds: s.length / 8000, peaks: out.map((v) => Math.round((top ? v / top : 0) * 1000) / 1000) };
}

function probeSeconds(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:format=bit_rate', '-of', 'json', file]).toString();
  const f = JSON.parse(out).format || {};
  return { seconds: Number(f.duration), kbps: f.bit_rate ? Math.round(Number(f.bit_rate) / 1000) : null };
}

// ---------- one pack ----------
// A source without a name (a new pack): its name from the snippet file, its slug = the name in lower case.
export function resolveSource(src, outDir = PACKS_OUT) {
  if (src.name) return src;
  const dir = join(outDir, src.work, 'Preview');
  const f = existsSync(dir) ? readdirSync(dir).find((x) => /_snippet\.mp3$/.test(x)) : null;
  const name = f ? f.replace(/^SVL_/, '').replace(/_snippet\.mp3$/, '') : null;
  if (!name || !/^[A-Z][A-Za-z0-9]+$/.test(name)) return null;
  return { ...src, name, slug: name.toLowerCase(), isNew: true };
}

export async function readPack(src, outDir = PACKS_OUT) {
  const zipPath = join(outDir, `SVL_${src.name}.zip`);
  const previewDir = join(outDir, src.work, 'Preview');
  const snippetFile = existsSync(previewDir) ? readdirSync(previewDir).find((f) => /_snippet\.mp3$/.test(f)) : null;
  if (!existsSync(zipPath) || !snippetFile) return { skipped: `${src.slug}: ${!existsSync(zipPath) ? `no ${basename(zipPath)}` : `no Preview/*_snippet.mp3 in out/${src.work}`}` };

  const zip = openZip(zipPath);
  try {
    const top = `SVL_${src.name}/`;
    const files = zip.entries.filter((e) => !e.dir && !/(^|\/)(__MACOSX|\.DS_Store)/.test(e.name));
    const outside = files.filter((e) => !e.name.startsWith(top));
    if (outside.length) throw new Error(`${src.slug}: ${outside.length} entries outside ${top} (e.g. ${outside[0].name})`);
    const rel = (e) => e.name.slice(top.length);
    const folderOf = (e) => (rel(e).includes('/') ? rel(e).slice(0, rel(e).lastIndexOf('/')) : '');
    const byFolder = new Map();
    for (const e of files) {
      const f = folderOf(e);
      if (!byFolder.has(f)) byFolder.set(f, []);
      byFolder.get(f).push(e);
    }
    const docs = (byFolder.get('') || []).map((e) => rel(e)).sort();
    const folders = [...byFolder.keys()].filter(Boolean).sort(sortFolders).map((f) => {
      const list = byFolder.get(f).map((e) => basename(e.name)).sort();
      return { folder: f, count: list.length, examples: list.filter((n) => /\.(wav|mid)$/i.test(n)).slice(0, 3) };
    });
    const total = files.length;
    const inFolders = folders.reduce((s, f) => s + f.count, 0);
    if (inFolders + docs.length !== total) throw new Error(`${src.slug}: folder counts ${inFolders} + docs ${docs.length} != ${total}`);

    const read = (name) => zip.read(`${top}${name}`).toString('utf8');
    for (const need of ['measurements.csv', 'README.txt']) if (!docs.includes(need)) throw new Error(`${src.slug}: ${need} missing in the zip`);
    const rows = parseCsv(read('measurements.csv'));
    const readme = read('README.txt');
    const licenceName = docs.find((d) => /^LICEN[CS]E/i.test(d));
    const licence = licenceName ? { file: licenceName, ...parseLicence(read(licenceName)) } : null;

    // Every measured file is in the zip, and every WAV / MIDI outside Demo/ is measured.
    const zipContent = new Set(files.filter((e) => /\.(wav|mid)$/i.test(e.name) && folderOf(e) !== 'Demo').map((e) => `${folderOf(e)}/${basename(e.name)}`));
    const csvContent = new Set(rows.map((r) => `${r.folder}/${r.file}`));
    const notInZip = [...csvContent].filter((x) => !zipContent.has(x));
    const notMeasured = [...zipContent].filter((x) => !csvContent.has(x));
    if (notInZip.length || notMeasured.length) {
      throw new Error(`${src.slug}: measurements.csv and zip disagree (${notInZip.length} measured but not in zip, e.g. ${notInZip[0] || '-'}; ${notMeasured.length} in zip but not measured, e.g. ${notMeasured[0] || '-'})`);
    }

    // WAV format: read from every WAV header in the zip (Demo included).
    const formats = new Map();
    for (const e of files.filter((x) => /\.wav$/i.test(x.name))) {
      const info = wavInfo(zip.read(e, 4096));
      const key = info ? `${info.bits}|${info.sampleRate}|${info.channels}|${info.format}` : 'unreadable';
      formats.set(key, (formats.get(key) || 0) + 1);
    }
    const wavFormats = [...formats.entries()].map(([k, count]) => {
      if (k === 'unreadable') return { count, unreadable: true };
      const [bits, sampleRate, channels, fmt] = k.split('|').map(Number);
      return { bits, sampleRate, channels, float: fmt === 3, count };
    }).sort((a, b) => b.count - a.count);
    if (wavFormats.some((f) => f.unreadable)) throw new Error(`${src.slug}: unreadable WAV header(s)`);

    const audio = rows.filter((r) => /\.wav$/i.test(r.file));
    const midi = rows.filter((r) => /\.mid$/i.test(r.file));
    const loops = audio.filter((r) => isLoopFolder(r.folder));
    const loudCol = 'loudness_lufs' in (rows[0] || {}) ? 'loudness_lufs' : 'loudness';
    const integrated = (r) => (loudCol === 'loudness_lufs' ? true : /integrated/i.test(r.loudness_method || '') && /LUFS/i.test(r.loudness_method || ''));
    // Per-loop folders hold a Full mix + its stems: a loop is its Full; the stems are counted (and measured) apart.
    const nested = loops.some((r) => r.folder.startsWith('Loops/'));
    const fulls = nested ? loops.filter((r) => /_Full\.wav$/i.test(r.file)) : loops;
    const loudnessRows = fulls.length ? fulls.filter(integrated) : audio.filter(integrated);
    const keyed = (list, col) => uniq(list.map((r) => keyLabel(r[col])).filter(Boolean));
    const loopKeys = keyed(audio.filter((r) => isLoopFolder(r.folder) || r.bars), 'key').filter((k) => /major|minor/.test(k));
    const notes = keyed(audio.filter((r) => !isLoopFolder(r.folder)), 'key').filter((k) => notePitch(k) != null)
      .sort((a, b) => notePitch(a) - notePitch(b));
    const bpms = uniq(rows.map((r) => num(r.bpm)).filter((b) => b != null)).sort((a, b) => a - b);

    const kindLine = (/^SVL [^-]+ - (.+)$/m.exec(readme) || [])[1]?.trim() || null;
    const demoFolder = folders.find((f) => f.folder === 'Demo');
    const soundFolders = folders.filter((f) => !isLoopFolder(f.folder) && !['MIDI', 'Demo'].includes(f.folder));
    const oneShotWord = soundFolders.every((f) => f.folder.startsWith('One Shots/')) ? 'one-shots' : 'sounds';

    const zipStat = statSync(zipPath);
    const status = src.approved ? 'approved' : src.isNew ? 'new' : (zipStat.mtime < new Date(REBUILD_STARTED) ? 'rebuild-pending' : 'rebuilt');
    return {
      pack: {
        slug: src.slug,
        name: src.name,
        fullName: `SVL ${src.name}`,
        kindLine,
        // README.txt states the sounds were made from scratch by SubverseLab with no third-party samples.
        madeFromScratch: /made by SubverseLab from scratch/i.test(readme) && /No third-party samples/i.test(readme),
        status,
        counts: {
          total,
          oneShots: soundFolders.reduce((s, f) => s + f.count, 0),
          oneShotWord,
          loops: fulls.length,
          stems: loops.length - fulls.length,
          midi: midi.length,
          demo: demoFolder?.count || 0,
          docs: docs.length,
        },
        folders,
        docs,
        format: wavFormats,
        peakDbfs: range(audio.map((r) => num(r.peak_dbfs))),
        truePeakDbtp: range(audio.map((r) => num(r.true_peak_dbtp))),
        loudness: loudnessRows.length ? { of: loops.length ? 'loops' : 'files', count: loudnessRows.length, lufs: range(loudnessRows.map((r) => num(r[loudCol]))) } : null,
        bpms,
        loopKeys,
        notes,
        measuredRows: rows.length,
        zipBytes: zipStat.size,
        unzippedBytes: files.reduce((s, e) => s + e.size, 0),
        licence: licence && { draft: licence.draft, title: licence.title, clauses: licence.clauses },
      },
      zipPath,
      zipMtime: zipStat.mtime.toISOString(),
      snippetPath: join(previewDir, snippetFile),
      scenesPath: join(previewDir, 'snippet_scenes.json'),
    };
  } finally { zip.close(); }
}

function formatLineOf(pack) {
  const f = pack.format[0];
  if (!f) return '';
  return `${f.bits}-bit / ${(f.sampleRate / 1000).toString().replace(/\.0$/, '')} kHz WAV`;
}

function writeCover(pack, peaks, dir) {
  const tmp = mkdtempSync(join(tmpdir(), 'svl-cover-'));
  const png = join(tmp, 'cover.png');
  const spec = join(tmp, 'spec.json');
  const tag = /drum|drums/i.test(pack.kindLine || '') ? 'Drum kit' : /fx/i.test(pack.kindLine || '') ? 'FX' : 'Sample pack';
  writeFileSync(spec, JSON.stringify({
    name: pack.name, tag, kindLine: pack.kindLine || '', size: 1200, out: png, peaks,
    formatLine: `${formatLineOf(pack)} · ${pack.counts.total} files`,
  }));
  execFileSync('python3', ['-I', join(here, 'lib', 'pack-cover.py'), spec], { stdio: ['ignore', 'ignore', 'inherit'] });
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '86', png, '--out', join(dir, 'cover.jpg')], { stdio: 'ignore' });
  execFileSync('cwebp', ['-quiet', '-q', '84', png, '-o', join(dir, 'cover.webp')]);
  execFileSync('cwebp', ['-quiet', '-q', '82', '-resize', '600', '600', png, '-o', join(dir, 'cover-600.webp')]);
  rmSync(tmp, { recursive: true, force: true });
}

// An approved cover, when one exists: out/<work>/cover.(png|jpg) or out/SVL_<Name>/cover.(png|jpg). None exist yet.
function findCover(src, outDir) {
  for (const d of [join(outDir, src.work), join(outDir, `SVL_${src.name}`)]) {
    for (const f of ['cover.png', 'cover.jpg']) if (existsSync(join(d, f))) return join(d, f);
  }
  return null;
}

async function main() {
  if (!existsSync(PACKS_OUT)) throw new Error(`packs folder not found: ${PACKS_OUT}`);
  mkdirSync(PUBLIC_DIR, { recursive: true });
  const packs = [];
  const skipped = [];
  for (const raw of PACK_SOURCES) {
    const src = resolveSource(raw);
    if (!src) { skipped.push(`out/${raw.work}: not finished (no Preview/*_snippet.mp3)`); continue; }
    // The server must know a pack before the site lists it (sales, downloads and the sweep all read SAMPLE_PACK_LISTED).
    if (!(src.slug in SAMPLE_PACK_LISTED)) { skipped.push(`${src.slug}: not in api/entitlements.js SAMPLE_PACK_LISTED (add "${src.slug}: '<ISO listing time>'" the day it goes on sale)`); continue; }
    const r = await readPack(src);
    if (r.skipped) { skipped.push(r.skipped); continue; }
    const { pack } = r;
    const dir = join(PUBLIC_DIR, pack.slug);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });

    copyFileSync(r.snippetPath, join(dir, 'snippet.mp3'));
    const probe = probeSeconds(join(dir, 'snippet.mp3'));
    const { peaks } = snippetPeaks(join(dir, 'snippet.mp3'));
    writeFileSync(join(dir, 'peaks.json'), JSON.stringify({ seconds: Math.round(probe.seconds * 1000) / 1000, peaks }));
    let scenes = [];
    if (existsSync(r.scenesPath)) {
      scenes = JSON.parse(readFileSync(r.scenesPath, 'utf8'))
        .map((s) => ({ t: Number(s.t), label: String(s.label || '').trim() }))
        .filter((s) => Number.isFinite(s.t) && s.t >= 0 && s.t < probe.seconds && s.label)
        .sort((a, b) => a.t - b.t);
      writeFileSync(join(dir, 'scenes.json'), JSON.stringify(scenes, null, 1));
    }
    const ownCover = findCover(src, PACKS_OUT);
    if (ownCover) {
      execFileSync('sips', ['-s', 'format', 'jpeg', '-Z', '1200', ownCover, '--out', join(dir, 'cover.jpg')], { stdio: 'ignore' });
      execFileSync('cwebp', ['-quiet', '-q', '84', '-resize', '1200', '0', ownCover, '-o', join(dir, 'cover.webp')]);
      execFileSync('cwebp', ['-quiet', '-q', '82', '-resize', '600', '0', ownCover, '-o', join(dir, 'cover-600.webp')]);
    } else writeCover(pack, peaks, dir);

    packs.push({
      ...pack,
      base: `/sample-packs/${pack.slug}`,
      snippet: { src: `/sample-packs/${pack.slug}/snippet.mp3`, seconds: Math.round(probe.seconds * 10) / 10, kbps: probe.kbps, bytes: statSync(join(dir, 'snippet.mp3')).size },
      peaks: `/sample-packs/${pack.slug}/peaks.json`,
      scenes,
      cover: { jpg: `/sample-packs/${pack.slug}/cover.jpg`, webp: `/sample-packs/${pack.slug}/cover.webp`, small: `/sample-packs/${pack.slug}/cover-600.webp`, size: [1200, 1200], placeholder: !ownCover },
      source: { work: src.work, zip: basename(r.zipPath), zipMtime: r.zipMtime, zipSha256: await sha256File(r.zipPath) },
    });
    console.log(`${pack.slug}: ${pack.status}, ${pack.counts.total} files in zip, ${pack.measuredRows} measured, snippet ${probe.seconds.toFixed(1)} s, ${scenes.length} scenes`);
  }
  const known = new Set(packs.map((p) => `SVL_${p.name}.zip`));
  const unlisted = readdirSync(PACKS_OUT).filter((f) => /^SVL_[A-Za-z0-9]+\.zip$/.test(f) && !known.has(f));
  if (unlisted.length) console.log(`not listed (add to PACK_SOURCES when the owner approves it for the store): ${unlisted.join(', ')}`);
  // Folders of packs that no longer count are removed, so a stale snippet is never served.
  for (const d of readdirSync(PUBLIC_DIR)) if (!packs.some((p) => p.slug === d)) rmSync(join(PUBLIC_DIR, d), { recursive: true, force: true });

  const header = `// GENERATED by scripts/import-sample-packs.js on ${new Date().toISOString()} — do not edit by hand; re-run the importer.
// Source: ${PACKS_OUT.replace(LAUNCHPAD, '<Launchpad>')} (each pack's zip, its measurements.csv, README.txt, LICENCE file and Preview snippet).
// status: 'approved' (owner listened, frozen) · 'rebuild-pending' (old build; a new one is being made) · 'rebuilt' (new build, owner's ear pending) · 'new' (a new pack).
// Prices and checkout links: src/data/samplePackPrices.js.
`;
  writeFileSync(DATA_FILE, `${header}export const SAMPLE_PACK_LIST = ${JSON.stringify(packs, null, 2)};\n\nexport const SKIPPED_PACKS = ${JSON.stringify(skipped, null, 2)};\n\nexport const samplePackBySlug = (slug) => SAMPLE_PACK_LIST.find((p) => p.slug === slug) || null;\n`);
  console.log(`wrote ${DATA_FILE.replace(ROOT + '/', '')}: ${packs.length} packs${skipped.length ? `; skipped: ${skipped.join('; ')}` : ''}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => { console.error(`import-sample-packs failed: ${err.message}`); process.exit(1); });
}
