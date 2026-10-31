import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { apiUrl } from '../utils/endpoints';

// Cookieless page-view counter (server side: stats.js, POST /api/hit). Sends the page address on every route change and,
// for the first page of a tab only, the referring address (the server keeps just its host). No cookie, no localStorage, no
// identifier: sessionStorage only remembers "this tab has already landed". Every storage access is wrapped, a blocked
// storage simply means every hit counts as a landing. /admin is never reported.
const LANDED = 'svl-landed';
// Set by HomeIntro when the homepage opening was shown in this tab; a Buy click reports it (intro: true).
export const INTRO_SEEN = 'svl-intro-seen';

function firstHitOfTab() {
  try {
    if (sessionStorage.getItem(LANDED)) return false;
    sessionStorage.setItem(LANDED, '1');
  } catch { /* storage blocked: treat as a landing */ }
  return true;
}

export function sendHit(payload) {
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon && navigator.sendBeacon(apiUrl('/api/hit'), new Blob([body], { type: 'text/plain' }))) return;
  } catch { /* fall through to fetch */ }
  try { fetch(apiUrl('/api/hit'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {}); } catch { /* never breaks the page */ }
}

export default function useHitCounter() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname === '/admin' || pathname.startsWith('/admin/')) return;
    const landing = firstHitOfTab();
    sendHit({ path: pathname, ref: landing ? document.referrer || '' : '', landing });
  }, [pathname]);
}

// A Buy button click (BuyButton): which product, on which page, in which part of the page, and whether the homepage opening
// was shown in this tab. Counted as a buy click, never as a page view; nothing that identifies the visitor is sent.
export function sendBuyClick(slug, place) {
  let intro = false;
  try { intro = window.sessionStorage.getItem(INTRO_SEEN) === '1'; } catch { /* storage blocked: unknown = no */ }
  sendHit({ buy: slug, path: window.location.pathname, place: place || 'other', intro });
}
