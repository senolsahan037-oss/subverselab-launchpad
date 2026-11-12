// Sample-pack store checks (16 Oct): the importer's helpers, the generated data against its own zips, the server and site
// slug lists agreeing, prices null/set rendering, and the prerendered pages (run AFTER `npm run build`).
// Run: node scripts/test-sample-packs.js
import assert from 'node:assert/strict';
import { existsSync, readFileSync, mkdtempSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const imp = await import('./import-sample-packs.js');
const { openZip, wavInfo } = await import('./lib/zip-read.js');
const { SAMPLE_PACK_LIST } = await import('../src/data/samplePacks.js');
const prices = await import('../src/data/samplePackPrices.js');
const facts = await import('../src/data/packFacts.js');
const { PRESET_PACK_LIST } = await import('../src/data/presetPacks.js');
const ent = await import('../api/entitlements.js');

let passed = 0; let failed = 0; const warnings = [];
async function test(name, fn) {
  try { await fn(); passed += 1; console.log(`PASS ${name}`); } catch (e) { failed += 1; console.log(`FAIL ${name}: ${e.message}`); }
}
const BANNED = /\b(AI|machine learning|neural|beta)\b/i;

await test('parseCsv: quoted cells with commas, empty cells, CRLF', () => {
  const rows = imp.parseCsv('file,folder,loudness_method\r\na.mid,MIDI,"MIDI, 60 notes"\r\nb.wav,Loops,\r\n');
  assert.deepEqual(rows, [{ file: 'a.mid', folder: 'MIDI', loudness_method: 'MIDI, 60 notes' }, { file: 'b.wav', folder: 'Loops', loudness_method: '' }]);
});
await test('keyLabel / notePitch: Fsmin -> F# minor, Fs1 -> F#1, A#1 sorts below C2, junk -> null', () => {
  assert.equal(imp.keyLabel('Fsmin'), 'F# minor'); assert.equal(imp.keyLabel('Cmin'), 'C minor'); assert.equal(imp.keyLabel('Fs1'), 'F#1');
  assert.equal(imp.keyLabel('A#1'), 'A#1'); assert.equal(imp.keyLabel('MIDI'), null); assert.equal(imp.keyLabel(''), null);
  assert.ok(imp.notePitch('A#1') < imp.notePitch('C2')); assert.equal(imp.notePitch('C4'), 60);
});
await test('parseLicence: DRAFT flag, titled clauses, an untitled last clause keeps its sentence', () => {
  const l = imp.parseLicence('DRAFT — review.\n\nSVL X - Licence (draft)\n===\n\n1. Grant. You may use\n   the sounds.\n\n2. All rights are reserved by SubverseLab.\n');
  assert.equal(l.draft, true); assert.equal(l.title, 'SVL X - Licence');
  assert.deepEqual(l.clauses, [{ title: 'Grant', text: 'You may use the sounds.' }, { title: null, text: 'All rights are reserved by SubverseLab.' }]);
});
await test('zip-read: lists entries and reads a WAV header (stored and deflated) from a real zip', () => {
  const dir = mkdtempSync(join(tmpdir(), 'svl-zip-'));
  try {
    const wav = Buffer.alloc(44 + 4000);
    wav.write('RIFF', 0); wav.writeUInt32LE(36 + 4000, 4); wav.write('WAVE', 8); wav.write('fmt ', 12); wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(44100, 24); wav.writeUInt32LE(44100 * 6, 28); wav.writeUInt16LE(6, 32); wav.writeUInt16LE(24, 34);
    wav.write('data', 36); wav.writeUInt32LE(4000, 40);
    writeFileSync(join(dir, 'a.wav'), wav); writeFileSync(join(dir, 'b.txt'), 'hello');
    execFileSync('zip', ['-q', '-X', 'p.zip', 'a.wav', 'b.txt'], { cwd: dir });
    const z = openZip(join(dir, 'p.zip'));
    assert.deepEqual(z.entries.map((e) => e.name).sort(), ['a.wav', 'b.txt']);
    assert.deepEqual(wavInfo(z.read('a.wav', 4096)), { format: 1, channels: 2, sampleRate: 44100, bits: 24 });
    assert.equal(z.read('b.txt').toString(), 'hello');
    z.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

await test(`data: ${SAMPLE_PACK_LIST.length} packs; folder counts + documents = files in the zip; measured rows = sounds + loops + MIDI`, () => {
  assert.ok(SAMPLE_PACK_LIST.length >= 1, 'at least one pack imported');
  for (const p of SAMPLE_PACK_LIST) {
    const inFolders = p.folders.reduce((s, f) => s + f.count, 0);
    assert.equal(inFolders + p.counts.docs, p.counts.total, `${p.slug} sum`);
    assert.equal(p.counts.oneShots + p.counts.loops + (p.counts.stems || 0) + p.counts.midi, p.measuredRows, `${p.slug} measured rows`);
    assert.ok(['approved', 'rebuild-pending', 'rebuilt', 'new'].includes(p.status), `${p.slug} status ${p.status}`);
    assert.ok(p.format.length >= 1 && p.format[0].bits && p.format[0].sampleRate, `${p.slug} format measured`);
    assert.ok(p.zipBytes > 0 && p.unzippedBytes >= p.zipBytes * 0.5, `${p.slug} sizes`);
    assert.ok(p.snippet.seconds > 10 && p.snippet.seconds < 120, `${p.slug} snippet length ${p.snippet.seconds}`);
  }
});
await test('data: public files exist (snippet, peaks, scenes, covers); scenes sorted and inside the snippet', () => {
  for (const p of SAMPLE_PACK_LIST) {
    for (const f of [p.snippet.src, p.peaks, p.cover.jpg, p.cover.webp, p.cover.small]) assert.ok(existsSync(join(root, 'public', f)), `${p.slug}: ${f}`);
    assert.equal(statSync(join(root, 'public', p.snippet.src)).size, p.snippet.bytes, `${p.slug}: snippet bytes`);
    const peaks = JSON.parse(readFileSync(join(root, 'public', p.peaks), 'utf8'));
    assert.ok(peaks.peaks.length >= 100 && Math.max(...peaks.peaks) === 1, `${p.slug}: peaks normalised`);
    p.scenes.forEach((s, i) => { assert.ok(s.t < p.snippet.seconds, `${p.slug} scene ${i}`); if (i) assert.ok(s.t > p.scenes[i - 1].t, `${p.slug} scenes sorted`); });
  }
});
await test('data: every listed pack is approved and sellable (owner 17 Oct night: all nine on sale at $5, the customer judges)', () => {
  for (const p of SAMPLE_PACK_LIST) {
    assert.equal(p.status, 'approved', `${p.slug}: ${p.status}`);
    assert.ok(prices.packOffer(p).buyable, `${p.slug}: not buyable`);
  }
});
await test('data vs zips on disk: each imported pack still matches its zip (size, files); a changed zip means: re-run the importer', async () => {
  for (const p of SAMPLE_PACK_LIST) {
    const zip = join(imp.PACKS_OUT, p.source.zip);
    if (!existsSync(zip)) { warnings.push(`${p.slug}: ${p.source.zip} not on this machine (data not re-checked)`); continue; }
    const size = statSync(zip).size;
    if (size !== p.zipBytes) { warnings.push(`STALE ${p.slug}: zip is now ${size} bytes, data says ${p.zipBytes} — re-run node scripts/import-sample-packs.js`); continue; }
    const r = await imp.readPack(imp.resolveSource(imp.PACK_SOURCES.find((s) => s.slug === p.slug || s.work === p.source.work)));
    if (!r.pack) { warnings.push(`${p.slug}: work folder not readable on this machine (${r.skipped || 'no pack'}); zip size matches, data not re-checked`); continue; }   // 22 Oct: preview stems were removed in the 21 Oct disk cleanup; the zips stay
    assert.equal(r.pack.counts.total, p.counts.total, p.slug);
    assert.deepEqual(r.pack.peakDbfs, p.peakDbfs, p.slug);
  }
});
await test('slugs: site packs ⊆ server SAMPLE_PACK_LISTED; preset ids = PRESET_PACK_LISTED; every pack has a price and checkout key', () => {
  for (const p of SAMPLE_PACK_LIST) assert.ok(p.slug in ent.SAMPLE_PACK_LISTED, `${p.slug} missing on the server`);
  assert.deepEqual(PRESET_PACK_LIST.filter((p) => !p.free).map((p) => p.id).sort(), Object.keys(ent.PRESET_PACK_LISTED).sort());
  assert.deepEqual(PRESET_PACK_LIST.filter((p) => p.free).map((p) => p.id).sort(), [...ent.MEMBER_PACK_SLUGS].sort(), 'free packs = MEMBER_PACK_SLUGS');
  for (const s of ent.MEMBER_PACK_SLUGS) { assert.ok(!(s in prices.PACK_PRICES) && !(s in prices.PACK_CHECKOUT), `${s} is not sold`); assert.ok(!ent.PACK_SLUGS.includes(s)); }
  for (const s of [...ent.SAMPLE_PACK_SLUGS, ...ent.PRESET_PACK_SLUGS]) {
    assert.ok(s in prices.PACK_PRICES, `PACK_PRICES.${s}`); assert.ok(s in prices.PACK_CHECKOUT, `PACK_CHECKOUT.${s}`);
  }
  assert.deepEqual([...ent.SWEEP_SLUGS], ent.SAMPLE_PACK_SLUGS, 'the sweep = sample packs only');
  assert.ok(!ent.SWEEP_SLUGS.includes('ru8-drum-pack'));
  for (const s of ent.PACK_SLUGS) assert.ok(!ent.PLUGIN_SLUGS.includes(s), `${s} is not a plugin slug`);
});
await test('entitlements: per-pack order, sweep by listing date, $0 orders and refunds open nothing, plugin orders open no pack', () => {
  const o = (product, extra = {}) => ({ x: { product, status: 'paid', refunded: false, created: '2026-10-17T01:00:00Z', amount_usd_cents: 500, ...extra } });
  assert.deepEqual(ent.ownedFromOrders(o('kerbstone')), ['kerbstone']);
  assert.deepEqual(ent.ownedFromOrders(o('kerbstone', { amount_usd_cents: 0, total: 0 })), [], '$0');
  assert.deepEqual(ent.ownedFromOrders(o('kerbstone', { amount_usd_cents: null })), [], 'no amount at all');
  assert.deepEqual(ent.ownedFromOrders(o('kerbstone', { refunded: true })), []);
  // A sweep opens the packs listed when it was bought: one from 17 Oct has the first packs, one from 2 Nov all of them.
  const listedBy = (iso) => ent.SAMPLE_PACK_SLUGS.filter((s) => Date.parse(ent.SAMPLE_PACK_LISTED[s]) <= Date.parse(iso));
  assert.deepEqual(ent.ownedFromOrders(o('sweep', { amount_usd_cents: 2500 })), listedBy('2026-10-17T01:00:00Z'));
  assert.ok(!ent.ownedFromOrders(o('sweep', { amount_usd_cents: 2500 })).includes('mirage'), 'a 17 Oct sweep does not open a pack listed on 1 Nov');
  assert.deepEqual(ent.ownedFromOrders(o('sweep', { created: '2026-11-02T10:00:00Z', amount_usd_cents: 2500 })), ent.SAMPLE_PACK_SLUGS, 'a sweep bought after 1 Nov opens every listed pack');
  assert.deepEqual(ent.ownedFromOrders(o('sweep', { created: '2026-10-15T00:00:00Z', amount_usd_cents: 2500 })), [], 'bought before any pack was listed');
  assert.deepEqual(ent.ownedFromOrders(o('preset-sweep', { amount_usd_cents: 900 })), ent.PRESET_PACK_SLUGS);
  for (const plugin of ['family', 'bundle', 'ru8', 'elek', 'taban', 'kubbe']) assert.ok(!ent.ownedFromOrders(o(plugin)).some((s) => ent.PACK_SLUGS.includes(s)), plugin);
  assert.equal(ent.uidOrderEntry({ product: 'sweep', status: 'paid', amount_usd_cents: 2500, total: 2500 }, 'a@b.c').amount_usd_cents, 2500, 'amount kept on the uid index for packs');
  assert.equal('amount_usd_cents' in ent.uidOrderEntry({ product: 'kubbe', amount_usd_cents: 900 }, 'a@b.c'), false, 'plugin entries unchanged');
});
await test('prices: $5 per sample pack and a $25 sweep (owner, permanent floors); null checkout keeps every key closed and hides the sweep', () => {
  for (const s of ent.SAMPLE_PACK_SLUGS) assert.equal(prices.PACK_PRICES[s], 5, s);
  assert.equal(prices.SWEEP.price, 25);
  assert.equal(prices.PACK_PRICES['ru8-drum-pack'], 10, 'RU-8 Drum Pack $10 (owner 17 Oct)');
  for (const p of SAMPLE_PACK_LIST) if (!prices.PACK_CHECKOUT[p.slug]) assert.equal(prices.packOffer(p).buyable, false, p.slug);
  if (!prices.SWEEP.checkout) assert.equal(prices.sweepLive(), false);
  assert.equal(prices.presetSweepLive(), prices.PRESET_SWEEP.price != null && Boolean(prices.PRESET_SWEEP.checkout));
  // With values set (simulated): buyable, except a rebuild-pending pack while SELL_REBUILD_PENDING is false.
  const saved = { ...prices.PACK_CHECKOUT }; const sw = { ...prices.SWEEP };
  try {
    prices.PACK_CHECKOUT.kerbstone = 'https://subverselab.lemonsqueezy.com/checkout/buy/test';
    assert.deepEqual(prices.packOffer({ slug: 'kerbstone', status: 'approved' }), { price: 5, checkout: prices.PACK_CHECKOUT.kerbstone, buyable: true });
    prices.PACK_CHECKOUT.stepwell = 'https://x';
    assert.equal(prices.packOffer({ slug: 'stepwell', status: 'rebuild-pending' }).buyable, prices.SELL_REBUILD_PENDING);
    prices.SWEEP.checkout = 'https://x';
    assert.equal(prices.sweepLive(Date.parse('2026-10-17T00:00:00Z')), true);
    prices.SWEEP.endsAt = '2026-11-01';
    assert.equal(prices.sweepLive(Date.parse('2026-11-01T00:00:00+03:00')), false, 'over at 00:00 Istanbul');
    assert.equal(prices.packOfferEndLabel('2026-11-01'), '1 November 2026');
  } finally { Object.assign(prices.PACK_CHECKOUT, saved); Object.assign(prices.SWEEP, sw); }
});
await test('facts: plate rows carry only measured values (no invented numbers), no banned words in any pack text', () => {
  for (const p of facts.visiblePacks()) {
    const rows = facts.plateRows(p);
    const text = [facts.packTitle(p), facts.packDescription(p), ...rows.flat(), ...p.scenes.map((s) => s.label), ...(p.licence?.clauses || []).map((c) => `${c.title || ''} ${c.text}`)].join(' \n');
    assert.doesNotMatch(text, BANNED, p.slug);
    const files = rows.find(([k]) => k === 'Files in the zip')[1];
    assert.ok(files.startsWith(`${p.counts.total} (`), `${p.slug} total first`);
    const nums = [...files.slice(files.indexOf('(')).matchAll(/ (\d+)(?= ·|\))/g)].map((m) => Number(m[1]));
    assert.equal(nums.reduce((a, b) => a + b, 0), p.counts.total, `${p.slug}: the folder numbers on the plate add up to the total`);
  }
});

const distFile = (f) => join(root, 'dist', f);
if (!existsSync(distFile('index.html'))) {
  console.log('SKIP prerendered pages: dist/ missing (run npm run build first)');
} else {
  await test('prerender: /sample-packs lists every visible pack; each pack page has its specs, technical details, scenes, honesty line, licence (never marked draft) and no offer while the checkout is null', () => {
    const cat = readFileSync(distFile('sample-packs/index.html'), 'utf8');
    for (const p of facts.visiblePacks()) {
      assert.ok(cat.includes(`href="/sample-packs/${p.slug}"`), `catalogue links ${p.slug}`);
      const html = readFileSync(distFile(`sample-packs/${p.slug}/index.html`), 'utf8');
      assert.match(html, /Technical details/); assert.match(html, /Listen/); assert.ok(html.includes('Every sound you hear is in this pack. Nothing added.'));
      assert.ok(html.includes(`canonical" href="https://subverselab.com/sample-packs/${p.slug}"`), "canonical");
      if (!prices.packOffer(p).buyable) { assert.doesNotMatch(html, /"offers"/, `${p.slug} no offer`); assert.match(html, /Available soon/); }
      assert.doesNotMatch(html, /Licence summary \(draft\)|Draft wording/);
      assert.doesNotMatch(html.replace(/<script[\s\S]*?<\/script>/g, ''), BANNED, p.slug);
    }
  });
  await test('sitemap lists the catalogue, every visible pack page and /preset-packs', () => {
    const xml = readFileSync(join(root, 'public', 'sitemap.xml'), 'utf8');
    for (const p of facts.visiblePacks()) assert.ok(xml.includes(`https://subverselab.com/sample-packs/${p.slug}<`), p.slug);
    assert.ok(xml.includes('https://subverselab.com/preset-packs<'));
  });
  await test('prerender: /preset-packs names the requirements, has no sweep while PRESET_SWEEP is unset; "free" only on the free member packs (owner 17 Oct), never on a paid pack', () => {
    const html = readFileSync(distFile('preset-packs/index.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    assert.match(html, /Live 12 Standard or Suite/);
    // the sweep block's own lines (a rack's "Sweep" macro may be named in its description)
    assert.doesNotMatch(html, /Sweep the store|Every preset pack, one price|Get every preset pack/);
    const sections = html.split('<h2>').slice(1);
    for (const p of PRESET_PACK_LIST) {
      const sec = sections.find((x) => x.startsWith(p.name.replace(/&/g, '&amp;')));
      assert.ok(sec, p.name);
      if (p.free) assert.match(sec, /Free with a SubverseLab account/, p.name);
      else assert.doesNotMatch(sec, /\bfree\b/i, p.name);
    }
  });
  const { RU8_ON_SALE } = await import('../src/data/plugins.js');
  if (!RU8_ON_SALE) {
    await test('RU-8 is not on the site until it is on sale (owner 17 Oct: no "Coming soon"): no prerendered page, no link on /preset-packs', () => {
      assert.equal(existsSync(distFile('plugins/ru8/index.html')), false);
      assert.doesNotMatch(readFileSync(distFile('preset-packs/index.html'), 'utf8'), /href="\/plugins\/ru8"/);
    });
  } else {
    await test('prerender: /plugins/ru8 has no counts of kits/sets/presets/pads, no teaser video, no "Windows: download available shortly"', () => {
    const html = readFileSync(distFile('plugins/ru8/index.html'), 'utf8');
    const body = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
    assert.doesNotMatch(body, /\b\d+\s+(kits?|sets?|presets?|pads?|moods?|grooves?)\b/i);
    assert.doesNotMatch(body, /\b(two|three|four|five|six|seven|eight|nine|ten|twelve|fourteen|sixteen)\s+(kits?|sets?|presets?|pads?|moods?)\b/i);
    assert.doesNotMatch(html, /teaser|\.mp4/); assert.doesNotMatch(body, /download available shortly/i); assert.doesNotMatch(body, BANNED);
  });
  }
}

for (const w of warnings) console.log(`WARN ${w}`);
console.log(`SUMMARY ${passed + failed} cases, ${failed} fail`);
process.exit(failed ? 1 : 0);
