#!/usr/bin/env node
// The preview waveform file for a sample pack (the same {seconds, peaks} the importer writes to public/sample-packs/<slug>/peaks.json):
//   node scripts/pack-peaks.js <snippet.mp3> [out.json]
// 800 buckets of the loudest sample, scaled so the loudest is 1. Needs ffmpeg on the PATH (it decodes to 8 kHz mono PCM).
// Catalogue packs: upload the JSON as media kind "json" (scripts/catalog-cli.js media json samplePacks <slug> peaks.json)
// and put its URL into the pack's "Preview waveform" field; the panel does both by itself when the mp3 is uploaded there.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

export function peaksOf(file, buckets = 800) {
  const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], { maxBuffer: 1 << 28 });
  const s = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2));
  const out = new Array(buckets).fill(0);
  for (let b = 0; b < buckets; b++) {
    const a = Math.floor((b * s.length) / buckets); const z = Math.max(a + 1, Math.floor(((b + 1) * s.length) / buckets));
    let m = 0; for (let i = a; i < z; i++) { const v = Math.abs(s[i]); if (v > m) m = v; }
    out[b] = m;
  }
  const top = Math.max(...out) || 1;
  return { seconds: Math.round((s.length / 8000) * 1000) / 1000, peaks: out.map((v) => Math.round((v / top) * 1000) / 1000) };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const [, , src, out] = process.argv;
  if (!src) { console.error('usage: node scripts/pack-peaks.js <snippet.mp3> [out.json]'); process.exit(2); }
  const json = JSON.stringify(peaksOf(src));
  if (out) { writeFileSync(out, json); console.log(`wrote ${out}`); } else process.stdout.write(json + '\n');
}
