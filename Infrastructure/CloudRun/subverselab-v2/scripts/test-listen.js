// Checks for the "Hear it first" rooms (src/data/listen.js, ListenHero, /lab/<slug>), 2026-10-15.
// Run: node scripts/test-listen.js   (needs ffprobe on PATH for the duration checks)
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const { LISTEN } = await import(pathToFileURL(resolve(root, 'src/data/listen.js')).href);
const pluginsSource = await readFile(resolve(root, 'src/data/plugins.js'), 'utf8');

let pass = 0; let fail = 0;
async function test(name, fn) {
  try { await fn(); pass += 1; console.log(`PASS ${name}`); } catch (e) { fail += 1; console.log(`FAIL ${name}\n     ${e.message}`); }
}

const duration = (file) => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  assert.equal(r.status, 0, `ffprobe failed on ${file}`);
  return Number(r.stdout.trim());
};

for (const [slug, room] of Object.entries(LISTEN)) {
  await test(`${slug}: is a real room in plugins.js`, () => {
    assert.ok(new RegExp(`slug: '${slug}'`).test(pluginsSource), `no slug '${slug}' in plugins.js`);
  });
  await test(`${slug}: start button exists, keys unique, at least two buttons`, () => {
    const keys = room.buttons.map((b) => b.key);
    assert.ok(keys.length >= 2);
    assert.equal(new Set(keys).size, keys.length);
    assert.ok(keys.includes(room.start), `start '${room.start}' is not a button`);
  });
  await test(`${slug}: every audio file and panel image is in public/`, () => {
    for (const b of room.buttons) {
      for (const p of [b.file, b.panel.src]) assert.ok(existsSync(join(root, 'public', p.replace(/^https?:\/\/[^/]+/, ''))), `missing public${p}`);
      assert.ok(b.panel.w > 0 && b.panel.h > 0, `${b.key}: panel size`);
    }
  });
  await test(`${slug}: all renders have the same length within 1 ms (the switch keeps the position)`, () => {
    const files = [...new Set(room.buttons.map((b) => join(root, 'public', b.file.replace(/^https?:\/\/[^/]+/, ''))))];
    const lengths = files.map(duration);
    const spread = Math.max(...lengths) - Math.min(...lengths);
    assert.ok(spread <= 0.001, `lengths ${lengths.map((l) => l.toFixed(4)).join(' / ')} s differ by ${(spread * 1000).toFixed(1)} ms`);
  });
  await test(`${slug}: every button has a readout (a number or a text), a line and four colours`, () => {
    for (const b of room.buttons) {
      assert.ok(b.readout && b.readout.label && (typeof b.readout.value === 'number' || typeof b.readout.text === 'string'), `${b.key}: readout`);
      assert.ok(b.line && b.line.length > 10, `${b.key}: line`);
      for (const k of ['deep', 'mid', 'accent', 'glow']) assert.ok(b.colors?.[k], `${b.key}: colors.${k}`);
    }
  });
  await test(`${slug}: copy has no "AI", "machine learning", "neural" or "beta"`, () => {
    const text = [room.headline, room.accent, room.note, ...room.buttons.flatMap((b) => [b.name, b.line, b.readout.label, b.readout.text || ''])].join(' ');
    assert.ok(!/\bAI\b|machine learning|neural|\bbeta\b/i.test(text), text);
  });
}

await test('listen.js wraps every path in media() (split-ready); ListenHero does not wrap twice and fetches each shared file once', async () => {
  const data = await readFile(resolve(root, 'src/data/listen.js'), 'utf8');
  assert.ok(!/(file|src): '\//.test(data), 'a bare /plugins path in listen.js');
  const src = await readFile(resolve(root, 'src/components/listen/ListenHero.jsx'), 'utf8');
  assert.ok(!/media\(/.test(src), 'ListenHero calls media() on paths that are already wrapped');
  assert.ok(/new Set\(buttons\.map\(\(b\) => b\.file\)\)/.test(src));
});

await test('keyboard: only real digits pick a button (space must not become button 0) and space plays', async () => {
  const src = await readFile(resolve(root, 'src/components/listen/ListenHero.jsx'), 'utf8');
  assert.ok(/\/\^\[0-9\]\$\/\.test\(e\.key\)/.test(src), 'digit check must be /^[0-9]$/ (Number(" ") is 0)');
  assert.ok(!/Number\.isInteger\(i\)/.test(src), 'the old Number(e.key) check is back');
  assert.ok(/e\.key === ' '[^\n]*preventDefault|e\.key === ' '[\s\S]{0,160}preventDefault/.test(src), 'space must preventDefault so the page does not scroll');
});

await test('the looping player pauses when the page goes to the background (visibilitychange)', async () => {
  const src = await readFile(resolve(root, 'src/components/listen/ListenHero.jsx'), 'utf8');
  assert.ok(/visibilitychange/.test(src) && /document\.hidden && nodesRef\.current\) pause\(\)/.test(src));
});

await test('rooms with a LISTEN entry open with ListenHero; /lab/:slug only redirects to the room and is in no sitemap or prerender list', async () => {
  const room = await readFile(resolve(root, 'src/components/PluginRoom.jsx'), 'utf8');
  assert.ok(/LISTEN\[plugin\.slug\] && \(\s*<ListenHero/.test(room), 'PluginRoom does not use LISTEN');
  assert.ok(/actions=\{/.test(room) && /offer=\{owned/.test(room), 'PluginRoom must pass its own buy / download action into ListenHero');
  const lab = await readFile(resolve(root, 'src/components/lab/LabRoom.jsx'), 'utf8');
  assert.ok(/<Navigate to=\{slug \? `\/plugins\/\$\{slug\}`/.test(lab), 'LabRoom must redirect to the room');
  for (const f of ['scripts/generate-sitemap.js', 'scripts/prerender.js']) {
    const s = await readFile(resolve(root, f), 'utf8');
    assert.ok(!/\/lab\//.test(s), `${f} mentions /lab/`);
  }
  if (existsSync(resolve(root, 'public/sitemap.xml'))) {
    const sm = await readFile(resolve(root, 'public/sitemap.xml'), 'utf8');
    assert.ok(!/\/lab\//.test(sm), 'sitemap.xml lists a /lab/ page');
  }
});

await test('MIHENK has no listen room; its page walks through cropped panel sections (PanelTour), each image on disk', async () => {
  const { LISTEN } = await import('../src/data/listen.js');
  const { MIHENK } = await import('../src/data/plugins.js');
  assert.ok(!LISTEN.mihenk, 'MIHENK must not have a LISTEN entry');
  assert.ok(MIHENK.tour && MIHENK.tour.steps.length >= 6, 'MIHENK.tour missing');
  for (const st of MIHENK.tour.steps) {
    const f = resolve(root, 'public' + st.img.replace(/^https?:\/\/[^/]+/, ''));
    assert.ok(existsSync(f), `missing ${st.img}`);
  }
  const room = await readFile(resolve(root, 'src/components/PluginRoom.jsx'), 'utf8');
  assert.ok(/plugin\.tour && <PanelTour/.test(room), 'PluginRoom does not render PanelTour');
  const pre = await readFile(resolve(root, 'scripts/prerender.js'), 'utf8');
  assert.ok(/tourHtml\(pl\)/.test(pre), 'prerender does not include the tour');
});

await test('The homepage is the news, read by scrolling; the tools are on /tools (owner 2026-10-26)', async () => {
  const app = await readFile(resolve(root, 'src/App.jsx'), 'utf8');
  assert.ok(/path="\/" element={<HomePage \/>}/.test(app), '/ must render HomePage');
  assert.ok(/path="\/tools" element={<Storefront/.test(app), '/tools must render the tools (Storefront)');
  const home = await readFile(resolve(root, 'src/components/HomePage.jsx'), 'utf8');
  assert.ok(home.indexOf('<HomeIntro />') < home.indexOf('<NewsFeed />'), 'order must be intro, news');
  const store = await readFile(resolve(root, 'src/components/Storefront.jsx'), 'utf8');
  assert.ok(!/<HomeIntro|<NewsFeed|<PluginShowcase/.test(store), 'the tools page carries no intro, news or showcase');
  const nav = await readFile(resolve(root, 'src/components/Navbar.jsx'), 'utf8');
  assert.ok(/<Link to="\/tools"[\s\S]{0,200}>Tools<\/Link>/.test(nav), 'the Tools tab leads to /tools');
  const pre = await readFile(resolve(root, 'scripts/prerender.js'), 'utf8');
  const homeBody = pre.slice(pre.indexOf('function buildHomeBody'), pre.indexOf('function buildToolsBody'));
  assert.ok(homeBody.includes('liveNews()') && !homeBody.includes('toolSections'), 'prerendered home: news, no tool list');
  assert.ok(!/\b(seven|six|eight|nine|ten|three|four|five)\b[^<]{0,20}plugins/i.test(homeBody), 'a product count in the prerendered home');
  const { NEWS, liveNews } = await import('../src/data/news.js');
  // owner 30 Oct: the JING FANG launch price and GENERATE are one item
  assert.deepEqual(NEWS.map((n) => n.key), ['jingfang-bf', 'boeb', 'torna', 'family', 'jingfang', 'testers', 'elek', 'free-plugins', 'manuals', 'tool-credits']);
  assert.equal(NEWS[1].date, '19 November');
  const during = liveNews(Date.parse('2026-11-02T12:00:00Z')).find((n) => n.key === 'jingfang');
  const after = liveNews(Date.parse('2026-12-15T12:00:00Z')).find((n) => n.key === 'jingfang');
  assert.ok(/instead of/.test(during.title) && /Launch price until/.test(during.line) && /GENERATE/.test(during.line), 'JING FANG during the launch price');
  // owner 7 Nov: from 1 Dec the standing sale ($99, regular $150, no end date) leads the title; no launch-price words in the line
  assert.ok(after && after.title === '$99 instead of $150.' && !/Launch price/.test(after.line) && /GENERATE/.test(after.line), 'JING FANG after the launch price: the standing sale, no launch words');
  // owner 7 Nov: the free days are internal. Before the offer nothing announces it (no item, no date anywhere in the news);
  // while it runs the Black Friday item leads, with no start date, and replaces the older JING FANG frame.
  const before = liveNews(Date.parse('2026-11-26T20:59:00Z'));
  assert.ok(!before.some((n) => n.key === 'jingfang-bf'), 'no Black Friday item before the offer starts');
  assert.ok(!before.some((n) => /27 November|Black Friday|free instead/i.test(`${n.title} ${n.line} ${n.date || ''} ${n.kicker || ''}`)), 'no free days announced before the offer');
  const bf = liveNews(Date.parse('2026-11-28T12:00:00Z'));
  assert.ok(!/27 November|\d{1,2} (November|December)/.test(`${bf[0].line} ${bf[0].date}`), 'the Black Friday item names no dates');
  assert.ok(bf[0].key === 'jingfang-bf' && !bf.some((n) => n.key === 'jingfang'), 'during Black Friday one JING FANG frame');
  assert.ok(!liveNews(Date.parse('2026-12-02T12:00:00Z')).some((n) => n.key === 'jingfang-bf'), 'the Black Friday frame leaves with the offer');
  for (const n of [...liveNews(Date.parse('2026-11-02T12:00:00Z')), after]) {
    await readFile(resolve(root, 'public' + n.image));   // throws if the frame's panel is missing
    const text = [n.kicker, n.date, n.title, n.line, n.cta].filter(Boolean).join(' ');
    assert.ok(!/coming soon/i.test(text), `"coming soon" in ${n.key}`);
    assert.ok(!/\b(two|three|four|five|six|seven|eight|nine|ten)\s+(new\s+)?(plugins?|members|products)/i.test(text), `a product count in ${n.key}`);
    assert.ok(!/\bADALET\b/.test(text), `ADALET is not part of the family news (owner 2026-10-26) in ${n.key}`);
  }
});

await test('The family (owner 27 Oct): seven products as sold, SEDA and ADALET on their own; the launch offer retired 28 Oct (FAMILY_RETIRED); back 3 Nov at $39.99; its own room /plugins/family and a line in each of its rooms since 14 Nov', async () => {
  const pl = await import('../src/data/plugins.js');
  assert.ok(!pl.FAMILY_SLUGS.includes('adalet'), 'ADALET stays out of the family');
  assert.ok(pl.SOLO_PLUGINS.some((p) => p.slug === 'seda'), 'SEDA is sold on its own (owner 27 Oct)');
  assert.equal(pl.SOLO_PLUGINS.find((p) => p.slug === 'seda').launchId, 'solo');
  assert.equal(pl.FAMILY_SINGLES_TOTAL, 115);
  // owner 2026-10-28: "plugin family ibarelerini her yerden kaldır" — the family is retired at once, before and after 1 Nov
  assert.equal(pl.FAMILY_RETIRED, true);
  assert.equal(pl.FAMILY_ON_SALE, false);
  assert.equal(pl.familyOnSale(Date.parse('2026-10-28T12:00:00Z')), false);
  assert.equal(pl.familyOnSale(Date.parse('2026-10-31T20:59:59Z')), false);
  assert.equal(pl.familyOnSale(Date.parse('2026-10-31T21:00:00Z')), false);
  // nothing on a public page names the family any more (src, build-time scripts included)
  // owner 2026-11-03: the family is back, at the MuseHub price, in one place: FamilyBand.jsx on /plugins (+ the news item)
  assert.equal(pl.FAMILY_BUNDLE_ON, true); assert.equal(pl.PRICES.family, 39.99);
  assert.ok(pl.PRICES.family >= 19.99, 'price floor: never below the $19.99 earlier buyers paid');
  // PluginRoom.jsx names it again since 14 Nov (owner: the family room, and one line in each family product's room).
  for (const f of ['src/components/LaunchPage.jsx', 'src/components/HomeIntro.jsx', 'src/components/Footer.jsx', 'src/components/InfoFigures.jsx', 'src/components/BuyButton.jsx', 'src/data/legalContent.js', 'src/data/faqContent.js']) {   // news.js: the owner's 28 Oct thank-you item names it on purpose
    const text = (await readFile(new URL(`../${f}`, import.meta.url), 'utf8')).split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).join('\n');
    assert.ok(!/plugin family|whole family|Get the family|In the family|own the family|refunded family|Plugin family/i.test(text), `${f} still names the family`);
  }
  for (const route of ['launch2', 'launch', 'help', 'terms', 'refunds']) {
    const html = await readFile(new URL(`../dist/${route}/index.html`, import.meta.url), 'utf8').catch(() => '');
    assert.ok(!/\bfamily\b/i.test(html.replace(/font-family/gi, '')), `dist/${route} still names the family`);
  }
  assert.equal(pl.FAMILY_PRICE, pl.PRICES.family);
  assert.deepEqual(pl.FAMILY_SLUGS, ['kubbe', 'kaset', 'koro', 'yanki', 'hava', 'mihenk', 'tutkal'], 'the family stays the seven products it was sold as');
  const ent = await import('../api/entitlements.js');
  assert.ok(!ent.ALL_SLUGS.includes('seda') && ent.SOLO_SLUGS.includes('seda'), 'server: only its own order opens SEDA');
});

await test('One price block (owner 14 Nov 2026): pluginOffer feeds every price; the family is measured against $79.99 only', async () => {
  const pl = await import('../src/data/plugins.js');
  const fam = pl.pluginOffer('family');
  assert.deepEqual(fam, { price: 39.99, regular: 79.99, pct: 50, label: '', ends: '' });
  const nov14 = Date.parse('2026-11-14T12:00:00+03:00');
  const adalet = pl.pluginOffer('adalet', nov14);
  assert.equal(adalet.price, 7.49); assert.equal(adalet.regular, 15); assert.equal(adalet.pct, 50);
  assert.equal(adalet.label, '', 'ADALET was sold at $15 before: no "launch price" word');
  assert.equal(adalet.ends, '4 January 2027');
  assert.equal(pl.pluginOffer('ahenk', nov14).label, 'launch price');
  assert.deepEqual(pl.pluginOffer('kubbe', nov14), { price: 9, regular: null, pct: 0, label: '', ends: '' });
  assert.equal(pl.pluginOffer('jingfang', Date.parse('2026-11-28T12:00:00+03:00')).label, 'Black Friday');
  assert.equal(pl.pluginOffer('jingfang', Date.parse('2026-12-02T12:00:00+03:00')).label, '', 'the standing sale has no name');
  assert.equal(pl.pluginOffer('jingfang', Date.parse('2026-12-02T12:00:00+03:00')).price, 99);
  const { readFile: rf } = await import('node:fs/promises');
  const band = await rf(new URL('../src/components/FamilyBand.jsx', import.meta.url), 'utf8');
  assert.ok(!/FAMILY_SINGLES_TOTAL|one by one/.test(band), 'the band shows one reference price');
  const news = await rf(new URL('../src/data/news.js', import.meta.url), 'utf8');
  assert.ok(news.includes("to: '/plugins/family'"), 'the family news item opens the family room');
  for (const f of ['src/components/PluginsPage.jsx', 'src/components/PluginRoom.jsx', 'src/components/FamilyBand.jsx', 'src/components/packs/PackPrice.jsx']) {
    assert.ok((await rf(new URL(`../${f}`, import.meta.url), 'utf8')).includes('PriceTag'), `${f} draws its price with PriceTag`);
  }
  const html = await rf(new URL('../dist/plugins/family/index.html', import.meta.url), 'utf8').catch(() => '');
  if (html) assert.ok(html.includes('$39.99') && html.includes('$79.99') && !html.includes('$115'), 'prerendered family room');
});

await test('RU-8: one rhythm on several kits — no bypass button, a measured readout each, files matched within 0.5 LU and at most -1 dBTP', async () => {
  const room = LISTEN.ru8;
  assert.ok(room, 'no ru8 entry');
  assert.ok(room.buttons.length >= 4 && room.buttons.length <= 8, 'four to eight kits (1.1: five synth + three sample kits, 8 Nov)');
  assert.ok(room.buttons.every((b) => !b.bypass), 'an instrument has no dry / bypass button');
  assert.ok(room.buttons.every((b) => /measured/.test(b.readout.label) && typeof b.readout.value === 'number'), 'every readout is a measurement');
  assert.equal(new Set(room.buttons.map((b) => b.panel.src)).size, room.buttons.length, 'one panel per kit');
  assert.ok(!/coming soon/i.test(JSON.stringify(room)), '"coming soon" in the RU-8 room');
  const levels = room.buttons.map((b) => {
    const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', join(root, 'public', b.file.replace(/^https?:\/\/[^/]+/, '')),
      '-filter_complex', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
    assert.equal(r.status, 0, `ffmpeg failed on ${b.file}`);
    const s = r.stderr.slice(r.stderr.lastIndexOf('Summary:'));
    return { key: b.key, lufs: Number(s.split('I:')[1].trim().split(/\s/)[0]), tp: Number(s.split('Peak:')[1].trim().split(/\s/)[0]) };
  });
  const l = levels.map((v) => v.lufs);
  assert.ok(Math.max(...l) - Math.min(...l) <= 0.5, `loudness ${JSON.stringify(levels)}`);
  assert.ok(levels.every((v) => v.tp <= -1.0), `true peak ${JSON.stringify(levels)}`);
});

await test('room colours come only from the brand system (no orange)', async () => {
  const src = await readFile(resolve(root, 'src/data/listen.js'), 'utf8');
  const allowed = new Set(['#F2EFE7', '#032825', '#022421', '#033733', '#0A524B', '#1B655C', '#0E302C', '#C5A059', '#D9B978', '#3BBFAF', '#2A9D8F', '#CFE0DC']);
  const used = [...src.matchAll(/'(#[0-9A-Fa-f]{6})'/g)].map((m) => m[1].toUpperCase());
  const bad = used.filter((c) => !allowed.has(c));
  assert.deepEqual([...new Set(bad)], [], `colours outside the brand system: ${bad.join(', ')}`);
});

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
