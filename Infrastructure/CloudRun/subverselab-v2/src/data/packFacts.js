// Words and numbers for the pack pages, built ONLY from src/data/samplePacks.js (the importer's measured data).
// Shared by the React pages and scripts/prerender.js (plain Node), so the crawler and the visitor read the same facts.
import { SAMPLE_PACK_LIST } from './samplePacks.js';
import { SHOW_REBUILD_PENDING } from './samplePackPrices.js';
import { byLatestRelease } from './productDates.js';

export const SAMPLE_PACKS_PATH = '/sample-packs';
export const HONESTY_LINE = 'Every sound you hear is in this pack. Nothing added.';

// Packs shown on the site (rebuild-pending ones only while SHOW_REBUILD_PENDING), newest release first (root CLAUDE.md
// "Store order"; src/data/productDates.js): the catalogue, "More sample packs", the sweep list, prerender, llms.txt and the sitemap.
export const visiblePacks = () => byLatestRelease(SAMPLE_PACK_LIST.filter((p) => SHOW_REBUILD_PENDING || p.status !== 'rebuild-pending'), (p) => p.slug);
export const visiblePackBySlug = (slug) => visiblePacks().find((p) => p.slug === slug) || null;

const minus = (n) => String(n).replace(/^-/, '−');
export const db = (n, digits = 1) => minus(Number(n).toFixed(digits));
export const mb = (bytes) => `${(bytes / 1e6).toFixed(1)} MB`;
export const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const listWords = (a) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a.at(-1)}`);

export function formatLine(p) {
  const f = p.format[0];
  if (!f) return '';
  const ch = f.channels === 2 ? 'stereo' : f.channels === 1 ? 'mono' : `${f.channels} channels`;
  return `${f.bits}-bit / ${(f.sampleRate / 1000).toString()} kHz WAV, ${ch}`;
}

// "154 one-shots, 21 loops and 32 MIDI files"; a melodic pack: "12 loops, 38 stems and 38 MIDI files"
export function contentsLine(p) {
  const c = p.counts;
  return listWords([
    c.oneShots ? `${c.oneShots} ${c.oneShotWord}` : null,
    c.loops ? `${c.loops} loops` : null,
    c.stems ? `${c.stems} stems` : null,
    c.midi ? `${c.midi} MIDI files` : null,
  ].filter(Boolean));
}

// The short "what's inside" list at the top of a pack page (store style), every item read from the pack data.
export function specList(p) {
  const c = p.counts;
  const bpm = p.bpms.length ? (p.bpms.length === 1 ? `${p.bpms[0]} BPM` : `${p.bpms[0]}–${p.bpms.at(-1)} BPM`) : null;
  return [
    c.loops ? (c.stems ? `${c.loops} loops, each with its stems (${c.stems} stems)` : `${c.loops} loops`) : null,
    c.oneShots ? `${c.oneShots} ${c.oneShotWord}` : null,
    c.midi ? `${c.midi} MIDI files` : null,
    bpm,
    p.loopKeys.length ? `Keys: ${p.loopKeys.join(', ')}` : null,
    formatLine(p) || null,
    `${mb(p.zipBytes)} download`,
    'Royalty-free in your own music',
  ].filter(Boolean);
}

export const packTitle = (p) => `${p.name} — ${p.kindLine} | SubverseLab sample packs`;
export const packDescription = (p) => `${p.fullName}: ${p.kindLine}. ${contentsLine(p)}, ${formatLine(p)}. Every file measured; listen to the preview first.`;
export const packPath = (p) => `${SAMPLE_PACKS_PATH}/${p.slug}`;
export const folderLabel = (f) => f.replace(/^One Shots\//, 'One Shots / ');

// The measurement plate: [label, value] rows, every value read from the pack's own files.
export function plateRows(p) {
  const rows = [];
  rows.push(['Files in the zip', `${p.counts.total} (${p.folders.map((f) => `${folderLabel(f.folder)} ${f.count}`).join(' · ')} · documents ${p.counts.docs})`]);
  const f = p.format[0];
  const wavs = p.format.reduce((s, x) => s + x.count, 0);
  if (f) rows.push(['Audio format', p.format.length === 1 ? `${formatLine(p)} — all ${wavs} WAV files` : p.format.map((x) => `${x.bits}-bit / ${x.sampleRate / 1000} kHz, ${x.channels} ch: ${x.count}`).join(' · ')]);
  if (p.peakDbfs) rows.push(['Sample peak', p.peakDbfs[0] === p.peakDbfs[1] ? `${db(p.peakDbfs[0], 2)} dBFS on every file` : `${db(p.peakDbfs[0], 2)} to ${db(p.peakDbfs[1], 2)} dBFS`]);
  if (p.truePeakDbtp) rows.push(['True peak', p.truePeakDbtp[0] === p.truePeakDbtp[1] ? `${db(p.truePeakDbtp[0])} dBTP on every file` : `${db(p.truePeakDbtp[0])} to ${db(p.truePeakDbtp[1])} dBTP`]);
  if (p.loudness?.lufs) rows.push([p.loudness.of === 'loops' ? 'Loudness, loops' : 'Loudness, all files', `${db(p.loudness.lufs[0])} to ${db(p.loudness.lufs[1])} LUFS integrated (${p.loudness.count} ${p.loudness.of})`]);
  if (p.bpms.length) rows.push([p.counts.loops ? 'Tempos' : 'Tempo-synced files', `${p.bpms.join(', ')} BPM`]);
  if (p.loopKeys.length) rows.push(['Loop keys', p.loopKeys.join(', ')]);
  if (p.notes.length) rows.push(['Tuned one-shots', p.notes.join(', ')]);
  if (p.counts.midi) rows.push(['MIDI', `${p.counts.midi} Standard MIDI files (.mid)`]);
  rows.push(['Download', `${mb(p.zipBytes)} zip, ${mb(p.unzippedBytes)} unzipped${p.docs.includes('SHA256SUMS.txt') ? ', SHA-256 checksums inside' : ''}`]);
  return rows;
}
