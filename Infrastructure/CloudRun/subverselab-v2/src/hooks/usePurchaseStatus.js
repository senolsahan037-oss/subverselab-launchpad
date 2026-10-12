import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

// What the signed-in account owns, shared by every Buy / Get-free button on the page: ONE request to
// GET /api/purchases/status for all of them (not one per button), repeated when the account changes.
// Signed-out visitors never trigger a request.
//
// Coming back from checkout: BuyButton marks the tab when a checkout opens (markCheckoutStarted). For the next
// three minutes the buttons of that product read "Order received? It appears in your account within a minute"
// and this store asks the status again every 10 s (and when the tab regains focus) until the product is owned.

const CHECKOUT_KEY = 'svl_checkout_started';
const CHECKOUT_AT_KEY = 'svl_checkout_at';
const CHECKOUT_SLUG_KEY = 'svl_checkout_slug';
export const POLL_MS = 10_000;
export const POLL_MAX_MS = 3 * 60 * 1000;
const FRESH_MS = 30_000;

const read = (key) => { try { return sessionStorage.getItem(key); } catch { return null; } };
export function checkoutStarted() { return read(CHECKOUT_KEY) === '1'; }
export function markCheckoutStarted(slug) {
  try {
    sessionStorage.setItem(CHECKOUT_KEY, '1');
    sessionStorage.setItem(CHECKOUT_AT_KEY, String(Date.now()));
    sessionStorage.setItem(CHECKOUT_SLUG_KEY, slug || '');
  } catch { /* sessionStorage can be unavailable */ }
  noteCheckout();
}
// True while a checkout for this product (or the family, which contains every product) was started in this tab
// less than three minutes ago.
function checkoutRecent(now = Date.now()) {
  if (!checkoutStarted()) return false;
  const at = Number(read(CHECKOUT_AT_KEY));
  return Number.isFinite(at) && at > 0 && now - at < POLL_MAX_MS;
}
export function expectingOrder(slug, now = Date.now()) {
  if (!checkoutRecent(now)) return false;
  const started = read(CHECKOUT_SLUG_KEY);
  return !started || started === slug || (started === 'family' && slug !== 'family');
}

const EMPTY = { loaded: false, owned: [], standing: null, unverified: false };
let user = null;
let state = { ...EMPTY };
let fetchedAt = 0;
let inflight = null;
let timer = null;
let watching = false;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(state));

async function refresh(force = false) {
  if (!user) return;
  if (inflight) return inflight;
  if (!force && state.loaded && Date.now() - fetchedAt < FRESH_MS) return;
  const forUser = user;
  inflight = (async () => {
    try {
      const token = await forUser.getIdToken();
      const r = await fetch('/api/purchases/status', { headers: { Authorization: `Bearer ${token}` } });
      const body = await r.json().catch(() => ({}));
      if (user !== forUser) return;
      fetchedAt = Date.now();
      if (r.ok && Array.isArray(body.owned)) state = { loaded: true, owned: body.owned, standing: body.standing || null, unverified: body.unverified === true };
      else state = { ...EMPTY, loaded: true };
    } catch { /* keep what we had; the buttons stay as they are */ } finally { inflight = null; }
    emit();
  })();
  return inflight;
}

function stopPolling() {
  if (timer) { clearInterval(timer); timer = null; }
  if (typeof window !== 'undefined') window.removeEventListener('focus', onFocus);
}
function onFocus() { if (checkoutStarted()) refresh(true); }
// Polls while a checkout from this tab is recent; stops when the three minutes are over and then lets the buttons
// go back to normal.
function noteCheckout() {
  if (!user || timer || typeof window === 'undefined' || !checkoutRecent()) return;
  window.addEventListener('focus', onFocus);
  refresh(true);
  timer = setInterval(() => {
    if (!checkoutRecent()) { stopPolling(); emit(); return; }
    refresh(true);
  }, POLL_MS);
  emit();
}

function watchAuth() {
  if (watching) return;
  watching = true;
  onAuthStateChanged(auth, (u) => {
    if (u?.uid === user?.uid) { user = u; return; }
    user = u;
    state = { ...EMPTY };
    fetchedAt = 0;
    inflight = null;
    stopPolling();
    emit();
    if (u) { refresh(true); noteCheckout(); }
  });
}

// {signedIn, loaded, owned: [slugs], standing, unverified, expecting(slug)}
export default function usePurchaseStatus() {
  const [, setTick] = useState(0);
  useEffect(() => {
    watchAuth();
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    if (user) { refresh(false); noteCheckout(); }
    return () => { listeners.delete(fn); };
  }, []);
  return {
    signedIn: Boolean(user),
    ...state,
    owns: (slug) => (slug === 'family' ? state.standing === 'paid' : state.owned.includes(slug)),
    expecting: (slug) => Boolean(user) && expectingOrder(slug),
  };
}
