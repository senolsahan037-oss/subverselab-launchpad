import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import InboxList from './InboxList';
import useInbox from '../hooks/useInbox';

// The bell in the header: unread count on a badge, a panel with the latest messages.
export default function InboxBell({ user }) {
  const inbox = useInbox(user);
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  if (!user) return null;
  const label = inbox.unread > 0 ? `Inbox, ${inbox.unread} unread` : 'Inbox';
  return (
    <div className="inbox-bell" ref={box}>
      <button type="button" className="inbox-bell-btn" aria-label={label} aria-expanded={open} aria-haspopup="true"
              title={label} onClick={() => { setOpen((v) => !v); if (!open) inbox.reload(); }}>
        <Icon name="bell" size={18} />
        {inbox.unread > 0 && <span className="inbox-badge" aria-hidden="true">{inbox.unread > 9 ? '9+' : inbox.unread}</span>}
      </button>
      {open && (
        <div className="inbox-panel" role="region" aria-label="Inbox">
          <div className="inbox-panel-head">
            <strong>Inbox</strong>
            {inbox.unread > 0 && <button type="button" className="inbox-link-btn" onClick={() => inbox.markRead('all')}>Mark all as read</button>}
          </div>
          <InboxList inbox={{ ...inbox, unread: 0 }} onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
