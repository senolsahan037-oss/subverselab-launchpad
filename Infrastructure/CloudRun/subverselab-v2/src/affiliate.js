// Lemon Squeezy affiliate referrals, without Lemon Squeezy's tracking script (owner 6 Nov 2026: Rekkerd is our first affiliate;
// 12 Nov 2026: 30-day tracking and a partner report for every partner).
// A partner links to any page of subverselab.com with ?aff=<their code> (Lemon Squeezy gives each affiliate one).
//   - Always: the code is kept for this tab in session storage (svl-aff).
//   - Only after the visitor accepted cookies (src/consent.js, "granted"): the code is also kept for 30 days in local storage
//     (svl-aff: {"code","until"}), so a reader who comes back days later still credits the partner. Accepting later in the
//     same tab moves the tab's code there; declining removes it. An expired entry is ignored and removed. A new ?aff= replaces
//     the old one (last click wins).
// Every Lemon Squeezy checkout link the site builds (withBuyer in components/BuyButton.jsx) then carries:
//   aff=<code>                      Lemon Squeezy credits the sale to the affiliate (and pays the commission itself)
//   checkout[custom][aff]=<code>    comes back in the webhook as meta.custom_data.aff: our own ledger (api/partners.js)
//   checkout[discount_code]=<code>  the partner's reader discount (src/data/partners.js), only for the products it applies to
//                                   and only when the link carries no discount code already
// No cookie, no third-party script, no identifier of the visitor: only the partner's public code. Listed in the privacy policy
// (legalContent.js, "Cookies and browser storage").
import { partnerByAff } from './data/partners.js';

const KEY = 'svl-aff';
const CODE = /^[A-Za-z0-9]{3,32}$/;
export const AFF_DAYS = 30;
const DAY_MS = 86_400_000;

// Consent: main.jsx connects src/consent.js (connectAffiliateConsent). Until then (and in tests) the stored choice is read
// directly from the same localStorage key consent.js writes.
let consentGranted = () => {
  try { return localStorage.getItem('subverselab-consent') === 'granted'; } catch { return false; }
};
let now = () => Date.now();
export function _setClock(fn) { now = fn; }   // tests only

function readLocal() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return '';
    let entry = null;
    try { entry = JSON.parse(raw); } catch { entry = null; }
    if (!entry || !CODE.test(String(entry.code || '')) || !(Number(entry.until) > now())) {
      localStorage.removeItem(KEY);   // expired or unreadable: gone
      return '';
    }
    return entry.code;
  } catch { return ''; }
}
function writeLocal(code) {
  try { localStorage.setItem(KEY, JSON.stringify({ code, until: now() + AFF_DAYS * DAY_MS })); } catch { /* not kept */ }
}
function removeLocal() {
  try { localStorage.removeItem(KEY); } catch { /* storage blocked */ }
}
function readSession() {
  try {
    const code = sessionStorage.getItem(KEY);
    return code && CODE.test(code) ? code : '';
  } catch { return ''; }
}

export function captureAffiliate(search = typeof window !== 'undefined' ? window.location.search : '') {
  let code = null;
  try { code = new URLSearchParams(search).get('aff'); } catch { code = null; }
  if (!code || !CODE.test(code)) return;
  try { sessionStorage.setItem(KEY, code); } catch { /* storage blocked: kept nowhere */ }
  if (consentGranted()) writeLocal(code);
}

// The partner code of this visit: this tab's own click first, else a 30-day one from an earlier visit (consent only).
export function affiliateCode() {
  const session = readSession();
  if (session) return session;
  return consentGranted() ? readLocal() : '';
}

// Connects the consent module (src/consent.js) once at start: getSnapshot() -> { choice }, subscribe(listener) -> unsubscribe.
// Granted later in this tab: the tab's code moves to the 30-day store. Denied: the 30-day entry is removed.
export function connectAffiliateConsent(getSnapshot, subscribe) {
  consentGranted = () => { try { return getSnapshot()?.choice === 'granted'; } catch { return false; } };
  const sync = () => {
    const choice = (() => { try { return getSnapshot()?.choice; } catch { return null; } })();
    if (choice === 'granted') {
      const session = readSession();
      if (session && readLocal() !== session) writeLocal(session);
      else readLocal();   // drops an expired entry
    } else if (choice === 'denied') removeLocal();
  };
  sync();
  return subscribe ? subscribe(sync) : () => {};
}

const isLemonSqueezy = (u) => /(^|\.)lemonsqueezy\.com$/.test(u.hostname);

// Adds the partner parameters to a Lemon Squeezy checkout URL when a partner code is active; any other URL is returned as is.
// `opts`: a code string (older calls), or { code, product } where product is the slug the checkout sells ('family', 'kubbe', …).
// Without a known product the partner's discount is never added.
export function withAffiliate(url, opts) {
  const { code = affiliateCode(), product = '' } = typeof opts === 'string' ? { code: opts } : (opts || {});
  if (!url || !code || !CODE.test(code)) return url;
  try {
    const u = new URL(url);
    if (!isLemonSqueezy(u)) return url;
    u.searchParams.set('aff', code);
    u.searchParams.set('checkout[custom][aff]', code);
    const partner = partnerByAff(code);
    if (partner?.discountCode && product && (partner.discountProducts || []).includes(product) && !u.searchParams.get('checkout[discount_code]')) {
      u.searchParams.set('checkout[discount_code]', partner.discountCode);
    }
    return u.toString();
  } catch { return url; }
}
