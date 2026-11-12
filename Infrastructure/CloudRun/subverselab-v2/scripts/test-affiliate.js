// node scripts/test-affiliate.js — src/affiliate.js: a partner's ?aff= code reaches Lemon Squeezy checkout links only;
// 30 days in local storage only with consent, else this tab only; the partner's reader discount only on its products.
import assert from 'node:assert/strict';
const fakeStorage = () => {
  const m = new Map();
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear() };
};
globalThis.sessionStorage = fakeStorage();
globalThis.localStorage = fakeStorage();
const { captureAffiliate, affiliateCode, withAffiliate, connectAffiliateConsent, _setClock, AFF_DAYS } = await import('../src/affiliate.js');
const { withBuyer, withDiscount } = await (async () => {
  // BuyButton.jsx is JSX with browser imports; its two URL helpers are mirrored here through the same affiliate module.
  const src = (await import('node:fs')).readFileSync(new URL('../src/components/BuyButton.jsx', import.meta.url), 'utf8');
  assert.ok(/export function withBuyer\(url, email, uid, product\)/.test(src), 'withBuyer takes the product');
  assert.ok(/withBuyer\(withDiscount\(CHECKOUT\[slug\], discount\)/.test(src), 'the page discount goes in before the partner one');
  return {
    withBuyer: (url, email, uid, product) => {
      const u = new URL(url);
      if (email) u.searchParams.set('checkout[email]', email);
      if (uid) u.searchParams.set('checkout[custom][uid]', uid);
      return withAffiliate(u.toString(), { product });
    },
    withDiscount: (url, code) => { const u = new URL(url); u.searchParams.set('checkout[discount_code]', code); return u.toString(); },
  };
})();
let fail = 0; let n = 0;
const t = (name, fn) => { n++; try { fn(); console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, e.message); } };
const LS = 'https://subverselab.lemonsqueezy.com/checkout/buy/7eb4adc0-a939-435f-9c9e-1b6df5e6c17c';
const reset = () => { sessionStorage.clear(); localStorage.clear(); };
let clock = Date.parse('2026-11-12T10:00:00Z');
_setClock(() => clock);
const DAY = 86_400_000;

// --- the original cases (no consent stored: this tab only)
t('no code: link unchanged', () => assert.equal(withAffiliate(LS), LS));
t('bad code ignored', () => { captureAffiliate('?aff=<x>'); assert.equal(affiliateCode(), ''); });
t('code kept from ?aff=', () => { captureAffiliate('?utm=x&aff=qbnJo'); assert.equal(affiliateCode(), 'qbnJo'); });
t('LS checkout gets aff', () => assert.equal(new URL(withAffiliate(LS)).searchParams.get('aff'), 'qbnJo'));
t('existing params kept', () => { const u = new URL(withAffiliate(LS + '?checkout%5Bdiscount_code%5D=REKKERD10')); assert.equal(u.searchParams.get('checkout[discount_code]'), 'REKKERD10'); assert.equal(u.searchParams.get('aff'), 'qbnJo'); });
t('other hosts untouched', () => assert.equal(withAffiliate('https://www.musehub.com/app/x'), 'https://www.musehub.com/app/x'));
t('lookalike host untouched', () => assert.equal(withAffiliate('https://lemonsqueezy.com.evil.test/x'), 'https://lemonsqueezy.com.evil.test/x'));
t('later page without aff keeps code', () => { captureAffiliate('?page=2'); assert.equal(affiliateCode(), 'qbnJo'); });

// --- consent and the 30-day store
t('no consent: nothing in local storage', () => { assert.equal(localStorage.getItem('svl-aff'), null); });
t('no consent: a new tab (empty session) has no code', () => { sessionStorage.clear(); assert.equal(affiliateCode(), ''); });
t('consent denied: still only the tab', () => {
  reset(); localStorage.setItem('subverselab-consent', 'denied');
  captureAffiliate('?aff=qbnJo');
  assert.equal(affiliateCode(), 'qbnJo'); assert.equal(localStorage.getItem('svl-aff'), null);
});
t('consent granted: kept 30 days in local storage', () => {
  reset(); localStorage.setItem('subverselab-consent', 'granted');
  captureAffiliate('?aff=qbnJo');
  const e = JSON.parse(localStorage.getItem('svl-aff'));
  assert.equal(e.code, 'qbnJo'); assert.equal(e.until, clock + AFF_DAYS * DAY); assert.equal(AFF_DAYS, 30);
});
t('consent granted: a reader back 29 days later in a new tab still credits the partner', () => {
  sessionStorage.clear(); clock += 29 * DAY;
  assert.equal(affiliateCode(), 'qbnJo');
  assert.equal(new URL(withAffiliate(LS)).searchParams.get('aff'), 'qbnJo');
});
t('expired entry ignored and removed', () => {
  clock += 2 * DAY;
  assert.equal(affiliateCode(), ''); assert.equal(localStorage.getItem('svl-aff'), null);
  assert.equal(withAffiliate(LS), LS);
});
t('unreadable entry removed', () => { localStorage.setItem('svl-aff', '{nope'); assert.equal(affiliateCode(), ''); assert.equal(localStorage.getItem('svl-aff'), null); });
t('last click wins (session and 30-day store)', () => {
  reset(); localStorage.setItem('subverselab-consent', 'granted');
  captureAffiliate('?aff=qbnJo'); captureAffiliate('?aff=Other123');
  assert.equal(affiliateCode(), 'Other123'); assert.equal(JSON.parse(localStorage.getItem('svl-aff')).code, 'Other123');
});
t('consent granted later in the same tab promotes the code', () => {
  reset();
  let snap = { choice: null }; const listeners = new Set();
  connectAffiliateConsent(() => snap, (l) => { listeners.add(l); return () => listeners.delete(l); });
  captureAffiliate('?aff=qbnJo');
  assert.equal(localStorage.getItem('svl-aff'), null, 'nothing before consent');
  snap = { choice: 'granted' }; listeners.forEach((l) => l());
  assert.equal(JSON.parse(localStorage.getItem('svl-aff')).code, 'qbnJo');
  sessionStorage.clear(); assert.equal(affiliateCode(), 'qbnJo', 'survives the tab');
  snap = { choice: 'denied' }; listeners.forEach((l) => l());
  assert.equal(localStorage.getItem('svl-aff'), null, 'declining removes the 30-day copy');
  assert.equal(affiliateCode(), '');
});

// --- checkout parameters
t('custom aff param for our own ledger', () => {
  reset(); captureAffiliate('?aff=qbnJo');
  assert.equal(new URL(withAffiliate(LS)).searchParams.get('checkout[custom][aff]'), 'qbnJo');
});
t('partner discount on a listed product (family)', () => {
  assert.equal(new URL(withAffiliate(LS, { product: 'family' })).searchParams.get('checkout[discount_code]'), 'REKKERD10');
});
t('no partner discount on other products', () => {
  assert.equal(new URL(withAffiliate(LS, { product: 'kubbe' })).searchParams.get('checkout[discount_code]'), null);
  assert.equal(new URL(withAffiliate(LS, { product: 'mirage' })).searchParams.get('checkout[discount_code]'), null);
});
t('no partner discount when the product is unknown', () => {
  assert.equal(new URL(withAffiliate(LS)).searchParams.get('checkout[discount_code]'), null);
});
t('an existing discount code is never replaced', () => {
  const u = new URL(withAffiliate(withDiscount(LS, 'UPGRADE5'), { product: 'family' }));
  assert.equal(u.searchParams.get('checkout[discount_code]'), 'UPGRADE5');
});
t('unknown partner code: aff passed, no discount', () => {
  reset(); captureAffiliate('?aff=Someone9');
  const u = new URL(withAffiliate(LS, { product: 'family' }));
  assert.equal(u.searchParams.get('aff'), 'Someone9'); assert.equal(u.searchParams.get('checkout[discount_code]'), null);
});
t('withBuyer: e-mail, uid, aff, custom aff and discount together', () => {
  reset(); captureAffiliate('?aff=qbnJo');
  const u = new URL(withBuyer(LS, 'a@b.c', 'uid1', 'family'));
  assert.equal(u.searchParams.get('checkout[email]'), 'a@b.c'); assert.equal(u.searchParams.get('checkout[custom][uid]'), 'uid1');
  assert.equal(u.searchParams.get('aff'), 'qbnJo'); assert.equal(u.searchParams.get('checkout[custom][aff]'), 'qbnJo');
  assert.equal(u.searchParams.get('checkout[discount_code]'), 'REKKERD10');
});
t('string code argument still works', () => {
  reset();
  assert.equal(new URL(withAffiliate(LS, 'qbnJo')).searchParams.get('aff'), 'qbnJo');
});
console.log(`SUMMARY ${n} cases, ${fail} fail`);
process.exit(fail ? 1 : 0);
