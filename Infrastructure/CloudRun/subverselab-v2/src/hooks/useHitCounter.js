import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Cookieless page-view counter (server side: stats.js, POST /api/hit). Sends the page address on every route change and,
// for the first page of a tab only, the referring address (the server keeps just its host). No cookie, no localStorage, no
// identifier: sessionStorage only remembers "this tab has already landed". Every storage access is wrapped, a blocked
// storage simply means every hit counts as a landing. /admin is never reported.
const LANDED = 'svl-landed';

function firstHitOfTab() {
  try {
    if (sessionStorage.getItem(LANDED)) return false;
    sessionStorage.setItem(LANDED, '1');
  } catch { /* storage blocked: treat as a landing */ }
  return true;
}

function send(payload) {
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon && navigator.sendBeacon('/api/hit', new Blob([body], { type: 'application/json' }))) return;
  } catch { /* fall through to fetch */ }
  try { fetch('/api/hit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {}); } catch { /* never breaks the page */ }
}

export default function useHitCounter() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname === '/admin' || pathname.startsWith('/admin/')) return;
    const landing = firstHitOfTab();
    send({ path: pathname, ref: landing ? document.referrer || '' : '', landing });
  }, [pathname]);
}
