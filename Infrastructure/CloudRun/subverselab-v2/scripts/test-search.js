// The site search (owner 6 Nov 2026): names, questions, licence keys, order numbers. `node scripts/test-search.js`.
import { searchSite, looksLikeKey, looksLikeOrder, isPrivateQuery, fold, KEY_ANSWER } from '../src/search/siteSearch.js';
import { ALL_FAQ } from '../src/data/faqContent.js';
import { ACTIVATION_SHORT } from '../src/data/plugins.js';

let pass = 0, fail = 0;
const check = (ok, label) => { if (ok) pass++; else { fail++; console.log('FAIL', label); } };
const first = (q, cat = null) => searchSite(q, cat).groups[0]?.items[0];
const firstIn = (q, group) => searchSite(q, null).groups.find((g) => g.id === group)?.items[0];

// Names, however they are typed.
check(first('kubbe')?.to === '/plugins/kubbe', 'kubbe -> KUBBE room');
check(first('YANKI')?.to === '/plugins/yanki' && first('yankı')?.to === '/plugins/yanki', 'yanki with and without the dotless i');
check(first('ru8')?.to === '/plugins/ru8' && first('RU-8')?.to === '/plugins/ru8', 'ru8 / RU-8');
check(first('jingfang')?.to === '/plugins/jingfang' && first('jing fang')?.to === '/plugins/jingfang', 'jing fang / jingfang');
check(first('is kubbe a reverb')?.to === '/plugins/kubbe', 'a name inside a sentence');
check(first('mirage')?.to === '/sample-packs/mirage', 'a sample pack');
check(first('drum racks')?.to === '/preset-packs#pp-racks-drums', 'a preset pack');
check(first('mix check')?.to === '/tools/subverse-mix-check', 'a browser tool');
check(searchSite('kubbe', null).total === 1, 'a name does not drag in every page that mentions it');

// Questions.
check(first('where is my licence key?')?.to === '/account#keys', 'licence key question');
check(first('license key')?.to === '/account#keys' && first('lisans anahtarı')?.to === '/account#keys', 'licence key, US spelling and Turkish');
check(first('can I get my money back')?.to === `/help#faq-${ALL_FAQ.findIndex((f) => /refund/i.test(f.q))}`, 'refund in other words');
check(first('how do I install on windows')?.to === '/account#install', 'install question');
check(first('does it work in ableton')?.to === '/plugins', 'DAW question');
check(!searchSite('what key is mirage in', null).groups.some((g) => g.items.some((i) => i.to === '/account#keys')), 'a musical key is not a licence key');
check(firstIn('splitter remove vocals', 'tools')?.to === '/tools/subverse-splitter', 'splitter');
check(KEY_ANSWER.startsWith(ACTIVATION_SHORT), 'the key answer is the rooms\' own sentence');

// Help links point at real answers.
for (const g of searchSite('daily limit account refund loom contact', null, { perGroup: 30 }).groups) {
  for (const it of g.items) {
    const m = it.to.match(/^\/help#faq-(\d+)$/);
    if (m) check(ALL_FAQ[Number(m[1])]?.q === it.title, `help link ${it.to} is "${it.title}"`);
  }
}

// Special inputs.
const KEY = 'ABCD1234-EF56-7890-ABCD-1234567890EF';
check(looksLikeKey(KEY) && looksLikeKey(KEY.toLowerCase()), 'a Lemon Squeezy style key');
check(!looksLikeKey('jing-fang') && !looksLikeKey('ru-8') && !looksLikeKey('8-bit-orchestral'), 'dashed names are not keys');
check(searchSite(KEY, null).special === 'licence-key' && first(KEY)?.to === '/account#keys', 'a key answers with the Account page');
check(looksLikeOrder('#12345') && looksLikeOrder('1234') && !looksLikeOrder('808'.repeat(4)), 'order numbers');
check(searchSite('#1498221', null).special === 'order-number', 'an order number answer');
check(isPrivateQuery(KEY) && isPrivateQuery('me@example.com') && !isPrivateQuery('kubbe'), 'keys and e-mails never go into a URL');
check(fold('İPEK Şahan') === 'ipek sahan', 'fold');

// A product added from the panel is found too.
const cat = { loaded: true, plugins: [{ id: 'testverb', name: 'TESTVERB', kind: 'Reverb', status: 'live' }], samplePacks: [], presetPacks: [], news: [], publishers: [] };
const live = searchSite('testverb', cat).groups.flatMap((g) => g.items);
check(live.some((i) => i.to === '/plugins/testverb'), 'a live catalogue plugin');
check(searchSite('', null).total === 0 && searchSite('zzqxw', null).total === 0, 'empty and nonsense');

console.log(`test-search: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
