// Analytics consent. Google Analytics 4 (through Firebase) is opt-in: until the
// visitor presses "Accept analytics" nothing from it is loaded, no script, no
// cookie, no request. "Decline" (or a later switch to Decline) stops collection
// and removes the _ga cookies this site can reach.
//
// The choice is kept in localStorage under KEY ("granted" | "denied"); if
// storage is blocked the banner simply shows on every visit and nothing is
// remembered. The banner (CookieBanner.jsx) and the footer's "Cookie settings"
// link both talk to this module.
import { app, MEASUREMENT_ID } from './firebase';

const KEY = 'subverselab-consent';

function readStored() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

function writeStored(value) {
  try { localStorage.setItem(KEY, value); } catch { /* not remembered */ }
}

// Immutable snapshot for useSyncExternalStore: replaced, never mutated.
let snapshot = { choice: readStored(), open: readStored() === null };
const listeners = new Set();
function emit(next) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((l) => l());
}

export const subscribeConsent = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
export const getConsentSnapshot = () => snapshot;

// ---------------------------------------------------------------- analytics

let started = null; // Promise<{ analytics, mod } | null>

function startAnalytics() {
  if (!MEASUREMENT_ID) return;
  delete window[`ga-disable-${MEASUREMENT_ID}`];
  if (started) {
    started.then((a) => { if (a) a.mod.setAnalyticsCollectionEnabled(a.analytics, true); });
    return;
  }
  // A dynamic import: the analytics code is its own chunk and is only fetched
  // once somebody accepts.
  started = import('firebase/analytics')
    .then(async (mod) => {
      if (!(await mod.isSupported())) return null;
      return { analytics: mod.getAnalytics(app), mod };
    })
    .catch(() => null);
}

function deleteGaCookies() {
  try {
    const names = document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter((n) => /^(_ga|_gid|_gat|_gac_)/.test(n));
    if (!names.length) return;
    const host = window.location.hostname;
    const parent = host.split('.').slice(-2).join('.');
    const domains = [null, host, `.${host}`, `.${parent}`];
    for (const name of names) {
      for (const domain of domains) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;${domain ? ` domain=${domain};` : ''}`;
      }
    }
  } catch { /* cookies unavailable */ }
}

function stopAnalytics() {
  if (MEASUREMENT_ID) window[`ga-disable-${MEASUREMENT_ID}`] = true;
  if (started) started.then((a) => { if (a) a.mod.setAnalyticsCollectionEnabled(a.analytics, false); });
  try { window.gtag?.('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }); } catch { /* gtag not loaded */ }
  deleteGaCookies();
}

// ---------------------------------------------------------------- actions

/** Call once when the app starts: a remembered "granted" starts analytics. */
export function initConsent() {
  if (snapshot.choice === 'granted') startAnalytics();
}

export function acceptAnalytics() {
  writeStored('granted');
  emit({ choice: 'granted', open: false });
  startAnalytics();
}

export function declineAnalytics() {
  writeStored('denied');
  emit({ choice: 'denied', open: false });
  stopAnalytics();
}

/** Reopens the banner (footer "Cookie settings"). */
export const openConsentSettings = () => emit({ open: true });
export const closeConsentSettings = () => { if (snapshot.choice) emit({ open: false }); };
