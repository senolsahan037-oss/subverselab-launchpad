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
// Where this tab came from (owner 6 Nov 2026: which social channel leads to a Buy click). Set on the landing page only: the
// referring address and the link's utm_source, kept in session storage for the tab; a Buy click sends them along and the
// server keeps only a channel name (stats.js channelOfSrc / channelOfHost) or "direct" / "other". Nothing else is stored.
const VIA = 'svl-via';
function rememberVia(ref, src) {
  try { sessionStorage.setItem(VIA, JSON.stringify({ ref: String(ref || '').slice(0, 300), src: String(src || '').slice(0, 40) })); } catch { /* storage blocked */ }
}
function readVia() {
  try { const v = JSON.parse(sessionStorage.getItem(VIA) || 'null'); return v && typeof v === 'object' ? v : null; } catch { return null; }
}

function firstHitOfTab() {
  try {
    if (sessionStorage.getItem(LANDED)) return false;
    sessionStorage.setItem(LANDED, '1');
  } catch { /* storage blocked: treat as a landing */ }
  return true;
}

// The tag on the link a visitor arrived by, ?utm_source=instagram (owner 6 Nov 2026): links we post on our social accounts carry
// it, because in-app browsers often send no referrer. Only on the first page of a tab; the server keeps it only when it is one
// of our channel names (stats.js SOCIAL_CHANNELS), so nothing else from the address is stored.
function linkSource() {
  try { return (new URLSearchParams(window.location.search).get('utm_source') || '').slice(0, 40); } catch { return ''; }
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
    if (landing) rememberVia(document.referrer || '', linkSource());
    sendHit({ path: pathname, ref: landing ? document.referrer || '' : '', landing, ...(landing ? { src: linkSource() } : {}) });
  }, [pathname]);
}

// A sample-pack preview play (owner 6 Nov 2026): which pack, and where it was played (card | page | soundcloud). Sent once per
// pack and place per page load by the players themselves; nothing that identifies the visitor is sent.
export function sendPreviewPlay(slug, place) {
  if (!slug) return;
  sendHit({ preview: slug, place });
}

// A Buy button click (BuyButton): which product, on which page, in which part of the page, and whether the homepage opening
// was shown in this tab. Counted as a buy click, never as a page view; nothing that identifies the visitor is sent.
export function sendBuyClick(slug, place) {
  let intro = false;
  try { intro = window.sessionStorage.getItem(INTRO_SEEN) === '1'; } catch { /* storage blocked: unknown = no */ }
  const via = readVia();
  sendHit({ buy: slug, path: window.location.pathname, place: place || 'other', intro, ...(via ? { viaRef: via.ref, viaSrc: via.src } : {}) });
}

// A click on one of the footer's social icons (owner 6 Nov 2026): which channel, nothing else. Counted as an outbound click.
export function sendSocialClick(channel) {
  if (channel) sendHit({ out: channel });
}
