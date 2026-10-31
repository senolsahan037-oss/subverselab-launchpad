import { useCallback, useEffect, useRef, useState } from 'react';
import { apiUrl } from '../utils/endpoints';

// The signed-in account's inbox (GET /api/inbox, POST /api/inbox/read; messages are written by the server only).
// Loaded when the account is known, then every 60 s and whenever the window regains focus. When any component
// marks something read, the others reload through the `svl-inbox-changed` event, so the bell and the /account
// list never disagree.
const REFRESH_MS = 60_000;
const CHANGED = 'svl-inbox-changed';

export default function useInbox(user) {
  const [state, setState] = useState({ messages: [], unread: 0, loaded: false });
  const alive = useRef(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const r = await fetch(apiUrl('/api/inbox'), { headers: { Authorization: `Bearer ${token}` } });
      const body = await r.json().catch(() => ({}));
      if (alive.current && r.ok && Array.isArray(body.messages)) setState({ messages: body.messages, unread: Number(body.unread) || 0, loaded: true });
    } catch { /* the bell keeps what it had */ }
  }, [user]);

  useEffect(() => {
    alive.current = true;
    if (!user) { setState({ messages: [], unread: 0, loaded: false }); return undefined; }
    load();
    const timer = setInterval(load, REFRESH_MS);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    window.addEventListener(CHANGED, onFocus);
    return () => { alive.current = false; clearInterval(timer); window.removeEventListener('focus', onFocus); window.removeEventListener(CHANGED, onFocus); };
  }, [user, load]);

  // ids: array of message ids, or 'all'.
  const markRead = useCallback(async (ids) => {
    if (!user) return;
    const all = ids === 'all';
    setState((s) => {
      const messages = s.messages.map((m) => (all || ids.includes(m.id) ? { ...m, read: true } : m));
      return { ...s, messages, unread: messages.filter((m) => !m.read).length };
    });
    try {
      const token = await user.getIdToken();
      await fetch(apiUrl('/api/inbox/read'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(all ? { all: true } : { ids }),
      });
      window.dispatchEvent(new Event(CHANGED));
    } catch { /* the next refresh shows the truth */ }
  }, [user]);

  return { ...state, reload: load, markRead };
}

// "just now", "5 min ago", "3 h ago", "2 d ago", then the date.
export function timeAgo(iso, now = Date.now()) {
  const t = Date.parse(iso || '');
  if (Number.isNaN(t)) return '';
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return new Date(t).toISOString().slice(0, 10);
}
