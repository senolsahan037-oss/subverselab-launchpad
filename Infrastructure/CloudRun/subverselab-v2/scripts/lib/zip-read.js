// Minimal read-only zip reader (no dependency): the central directory (names, sizes, method) and the start or the whole
// of one entry. Enough for scripts/import-sample-packs.js to read a pack's docs and its WAV headers straight from the zip
// that is sold, so the page describes exactly that file. Zip64 is not supported (a pack zip is far below 4 GB); an
// archive that needs it fails loudly instead of being misread.
import { openSync, readSync, closeSync, fstatSync } from 'node:fs';
import { inflateRawSync, constants as zc } from 'node:zlib';

function readAt(fd, pos, len) {
  const buf = Buffer.alloc(len);
  let got = 0;
  while (got < len) {
    const n = readSync(fd, buf, got, len - got, pos + got);
    if (n === 0) break;
    got += n;
  }
  return buf.subarray(0, got);
}

export function openZip(path) {
  const fd = openSync(path, 'r');
  const size = fstatSync(fd).size;
  const tailLen = Math.min(size, 65557);
  const tail = readAt(fd, size - tailLen, tailLen);
  let eocd = -1;
  for (let i = tail.length - 22; i >= 0; i -= 1) {
    if (tail.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) { closeSync(fd); throw new Error(`${path}: not a zip (no end of central directory)`); }
  const count = tail.readUInt16LE(eocd + 10);
  const cdSize = tail.readUInt32LE(eocd + 12);
  const cdOffset = tail.readUInt32LE(eocd + 16);
  if (count === 0xffff || cdOffset === 0xffffffff) { closeSync(fd); throw new Error(`${path}: zip64 is not supported`); }
  const cd = readAt(fd, cdOffset, cdSize);
  const entries = [];
  let p = 0;
  for (let i = 0; i < count; i += 1) {
    if (cd.readUInt32LE(p) !== 0x02014b50) { closeSync(fd); throw new Error(`${path}: bad central directory at entry ${i}`); }
    const method = cd.readUInt16LE(p + 10);
    const compressedSize = cd.readUInt32LE(p + 20);
    const size = cd.readUInt32LE(p + 24);
    const nameLen = cd.readUInt16LE(p + 28);
    const extraLen = cd.readUInt16LE(p + 30);
    const commentLen = cd.readUInt16LE(p + 32);
    const localOffset = cd.readUInt32LE(p + 42);
    const name = cd.subarray(p + 46, p + 46 + nameLen).toString('utf8');
    entries.push({ name, method, compressedSize, size, localOffset, dir: name.endsWith('/') });
    p += 46 + nameLen + extraLen + commentLen;
  }

  const dataStart = (e) => {
    const h = readAt(fd, e.localOffset, 30);
    if (h.readUInt32LE(0) !== 0x04034b50) throw new Error(`${path}: bad local header for ${e.name}`);
    return e.localOffset + 30 + h.readUInt16LE(26) + h.readUInt16LE(28);
  };

  // The first `want` bytes of an entry (the whole entry when want is omitted).
  const read = (name, want = Infinity) => {
    const e = typeof name === 'string' ? entries.find((x) => x.name === name) : name;
    if (!e) throw new Error(`${path}: no entry ${name}`);
    const start = dataStart(e);
    if (e.method === 0) return readAt(fd, start, Math.min(e.size, want));
    if (e.method !== 8) throw new Error(`${path}: ${e.name} uses compression method ${e.method}`);
    if (want === Infinity || want >= e.size) return inflateRawSync(readAt(fd, start, e.compressedSize));
    // Partial: inflate a slice of the compressed stream and keep what came out (sync flush tolerates the cut).
    const slice = readAt(fd, start, Math.min(e.compressedSize, Math.max(4096, want * 2)));
    return inflateRawSync(slice, { finishFlush: zc.Z_SYNC_FLUSH }).subarray(0, want);
  };

  return { path, size, entries, read, close: () => closeSync(fd) };
}

// RIFF/WAVE header → { format, channels, sampleRate, bits } (null when it is not a PCM/float WAV header).
export function wavInfo(buf) {
  if (buf.length < 12 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') return null;
  let p = 12;
  while (p + 8 <= buf.length) {
    const id = buf.toString('ascii', p, p + 4);
    const len = buf.readUInt32LE(p + 4);
    if (id === 'fmt ' && p + 24 <= buf.length) {
      return { format: buf.readUInt16LE(p + 8), channels: buf.readUInt16LE(p + 10), sampleRate: buf.readUInt32LE(p + 12), bits: buf.readUInt16LE(p + 22) };
    }
    p += 8 + len + (len % 2);
  }
  return null;
}
