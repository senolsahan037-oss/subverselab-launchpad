import React from 'react';
import { Link } from 'react-router-dom';
import { timeAgo } from '../hooks/useInbox';

// The messages of one inbox: used in the bell's panel and in the Inbox section of /account.
// Opening a message's link marks it read.
export default function InboxList({ inbox, onNavigate }) {
  const { messages, loaded, unread, markRead } = inbox;
  if (!loaded) return <p className="inbox-empty">Loading messages…</p>;
  if (messages.length === 0) return <p className="inbox-empty">No messages yet. Notes from SubverseLab, like order confirmations, will appear here.</p>;
  return (
    <>
      <ul className="inbox-list">
        {messages.map((m) => {
          const open = () => { if (!m.read) markRead([m.id]); onNavigate?.(); };
          return (
            <li key={m.id} className={`inbox-item${m.read ? '' : ' inbox-unread'}`}>
              <div className="inbox-item-head">
                <strong>{m.title}</strong>
                <time dateTime={m.createdAt} title={m.createdAt}>{timeAgo(m.createdAt)}</time>
              </div>
              {m.body && <p>{m.body}</p>}
              <div className="inbox-item-actions">
                {m.link && <Link to={m.link} onClick={open}>Open</Link>}
                {!m.read && <button type="button" className="inbox-link-btn" onClick={() => markRead([m.id])}>Mark as read</button>}
              </div>
            </li>
          );
        })}
      </ul>
      {unread > 0 && <button type="button" className="inbox-link-btn inbox-markall" onClick={() => markRead('all')}>Mark all as read</button>}
    </>
  );
}
