// Time-boxed store offers (src/data/plugins.js OFFERS; owner 6 Nov 2026: JING FANG free for Black Friday).
// Checks the moments (00:00 Istanbul), the words every price spot uses, and that other products are untouched.
// Run: node scripts/test-offers.js
import assert from 'node:assert/strict';
import * as p from '../src/data/plugins.js';

const results = [];
async function test(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log(`PASS ${name}`); } catch (err) { results.push({ name, ok: false }); console.log(`FAIL ${name}: ${err.message}`); }
}
const at = (iso) => Date.parse(iso);
const o = p.OFFERS.jingfang;

await test('JING FANG offer: free, called Black Friday, inside the launch window', () => {
  assert.equal(o.price, 0);
  assert.equal(o.label, 'Black Friday');
  assert.ok(o.starts < o.ends);
  assert.ok(o.ends <= p.LAUNCH_ENDS.jingfang, 'the offer never outlives the launch window it replaces');
});

await test('moments: on from starts 00:00 Istanbul, off at ends 00:00 Istanbul', () => {
  const from = at(`${o.starts}T00:00:00+03:00`); const to = at(`${o.ends}T00:00:00+03:00`);
  assert.equal(p.offerActive('jingfang', from - 1), false);
  assert.equal(p.offerActive('jingfang', from), true);
  assert.equal(p.offerActive('jingfang', to - 1), true);
  assert.equal(p.offerActive('jingfang', to), false);
});

await test('prices: launch price before, free during, regular after (launch ends the same moment)', () => {
  const from = at(`${o.starts}T00:00:00+03:00`); const to = at(`${o.ends}T00:00:00+03:00`);
  assert.equal(p.currentPrice('jingfang', from - 1), p.LAUNCH_PRICES.jingfang);
  assert.equal(p.currentPrice('jingfang', from), 0);
  assert.equal(p.currentPrice('jingfang', to), to >= at(`${p.LAUNCH_ENDS.jingfang}T00:00:00+03:00`) ? p.SALE_PRICES.jingfang.price : p.LAUNCH_PRICES.jingfang);
  // owner 7 Nov: from 1 Dec $99 with the regular $150 struck, no end date, no launch words
  assert.equal(p.priceText('jingfang', to), '$99 (regular $150)');
  assert.equal(p.launchEndLabel('jingfang', to), '');
  assert.equal(p.currentPrice('jingfang', at('2027-06-01T12:00:00+03:00')), 99);
  assert.equal(p.launchPriceActive('jingfang', from), true);
});

await test('words: "Free", never "$0"; the note names the offer and its end', () => {
  const during = at(`${o.starts}T12:00:00+03:00`);
  assert.equal(p.priceWord(0), 'Free'); assert.equal(p.priceWord(60), '$60');
  assert.equal(p.priceText('jingfang', during), `Free (regular $${p.PRICES.jingfang}), Black Friday: free until ${p.formatDay(o.ends)}`);
  assert.equal(p.offerName('jingfang', during), 'Black Friday');
  assert.equal(p.offerName('jingfang', at(`${o.starts}T00:00:00+03:00`) - 1), 'launch price');
  assert.doesNotMatch(p.priceText('jingfang', during), /\$0\b/);
});

await test('other products: no offer, prices unchanged', () => {
  const during = at(`${o.starts}T12:00:00+03:00`);
  for (const slug of Object.keys(p.PRICES)) {
    if (slug in p.OFFERS) continue;
    assert.equal(p.offerActive(slug, during), false, slug);
  }
  assert.equal(p.currentPrice('elek', during), p.LAUNCH_PRICES.elek);
  assert.equal(p.currentPrice('mihenk', during), p.PRICES.mihenk);
});

// AHENK (prepared 7 Nov 2026, switched off): $49 regular, $29.99 launch price until 1 January 2027 00:00 Istanbul.
const AHENK_END = at('2027-01-01T00:00:00+03:00');
await test('AHENK: $29.99 with $49 struck until 1 January 2027 00:00 Istanbul', () => {
  assert.equal(AHENK_END, at('2026-12-31T21:00:00Z'), '00:00 Istanbul = 21:00 UTC the day before');
  for (const now of [at('2026-11-07T12:00:00+03:00'), AHENK_END - 1]) {
    assert.equal(p.currentPrice('ahenk', now), 29.99);
    assert.equal(p.launchPriceActive('ahenk', now), true);
    assert.equal(p.launchNote('ahenk', now), 'launch price until 1 January 2027');
    assert.equal(p.launchEndLabel('ahenk', now), '1 January 2027');
    assert.equal(p.offerName('ahenk', now), 'launch price');
    assert.equal(p.priceWord(p.currentPrice('ahenk', now)), '$29.99');
    assert.equal(p.priceText('ahenk', now), '$29.99 (regular $49), launch price until 1 January 2027');
  }
});
await test('AHENK: from 1 January 2027 00:00 Istanbul $49 alone, no note, no struck price', () => {
  for (const now of [AHENK_END, AHENK_END + 1, at('2027-06-01T12:00:00+03:00')]) {
    assert.equal(p.isLaunchOver('ahenk', now), true);
    assert.equal(p.currentPrice('ahenk', now), 49);
    assert.equal(p.launchPriceActive('ahenk', now), false);
    assert.equal(p.launchNote('ahenk', now), '');
    assert.equal(p.launchEndLabel('ahenk', now), '');
    assert.equal(p.priceText('ahenk', now), '$49');
  }
  assert.ok(!(p.OFFERS.ahenk) && !(p.SALE_PRICES.ahenk), 'no offer or standing sale for AHENK');
});
await test('AHENK: trust line names macOS 11, Apple Silicon and Intel (1.0.0 pkg checked universal 8 Nov); copy without banned words', () => {
  const t = p.trustLineFor('ahenk');
  assert.equal(t, p.TRUST_LINE_AHENK);
  assert.match(t, /^macOS 11 or later, Apple Silicon and Intel · Windows, 64-bit · /);
  const a = p.AHENK;
  const copy = JSON.stringify([a.tagline, a.title, a.description, a.intro, a.modes, a.sections, a.controls, a.controlsNote, a.trialLines, a.activation, a.formats]);
  assert.doesNotMatch(copy, /\bAI\b|machine learning|neural|\bbeta\b|coming soon|App Store|iPhone|iPad/i);
  assert.ok(a.trialLines.includes('After the trial AHENK keeps playing for free: the upright piano with two microphones.'));
  assert.match(a.trialLines[0], /^Free 30-day trial/);
  assert.equal(a.model, '', 'no model line (owner exception)');
});
await test('AHENK switched on (8 Nov 2026): its checkout, its room, its showcase line', () => {
  assert.equal(p.AHENK_CHECKOUT, 'https://subverselab.lemonsqueezy.com/checkout/buy/c37f6acf-46d9-4032-94a4-32eb1ecaad83');
  assert.equal(p.AHENK_ON_SALE, true);
  assert.equal(p.CHECKOUT.ahenk, p.AHENK_CHECKOUT);
  assert.ok(p.ROOM_PLUGINS.some((x) => x.slug === 'ahenk'), 'ROOM_PLUGINS');
  assert.ok(p.SHOWCASE_SOLO_SLUGS.includes('ahenk'));
  assert.equal(p.pluginBySlug('ahenk')?.path, '/plugins/ahenk');
  assert.match(p.TRUST_LINE_AHENK, /Apple Silicon and Intel/);
  assert.match(p.AHENK.manual, /\/plugins\/ahenk\/AHENK_Manual\.pdf$/);
});

const failed = results.filter((r) => !r.ok);
console.log(`SUMMARY ${results.length} cases, ${failed.length} fail`);
process.exitCode = failed.length ? 1 : 0;
