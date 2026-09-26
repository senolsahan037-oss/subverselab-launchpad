import React, { useEffect, useState } from 'react';
import Icon from './Icon';
import { auth } from '../firebase';
import { onAuthStateChanged, sendEmailVerification } from 'firebase/auth';
import { DOWNLOAD_PLATFORMS } from '../data/plugins';
import { useDownloads, formatSize } from '../hooks/useDownloads';

let pendingDownload = null;
export default function DownloadButtons({ slug, className = 'plugin-downloads', btnExtra = '', onLoginClick }) {
  const files = useDownloads(slug); const [message, setMessage] = useState('');
  const request = async (platform) => {
    const u = auth.currentUser;
    if (!u) { pendingDownload = { slug, platform }; window.dispatchEvent(new Event('svl-open-auth')); return; }
    if (!u.emailVerified) { setMessage('Verify your e-mail first.'); sendEmailVerification(u).catch(() => {}); return; }
    setMessage('Preparing download…');
    try { const token = await u.getIdToken(true); const r = await fetch('/api/download/ticket', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ slug, platform }) }); const body = await r.json().catch(() => ({})); if (r.status === 410) setMessage('All 1,000 free downloads are taken.'); else if (!r.ok) setMessage(body.error || 'Download unavailable.'); else window.location.assign(body.url); } catch { setMessage('Download unavailable. Check your connection and try again.'); }
  };
  useEffect(() => onAuthStateChanged(auth, (u) => { if (u && pendingDownload?.slug === slug) { const p = pendingDownload; pendingDownload = null; request(p.platform); } }), [slug]);
  return <div className={className}>{DOWNLOAD_PLATFORMS.map(([key, label]) => { const f = files[key]; const size = f && formatSize(f.size); const text = f ? `Download free for ${label}${f.version ? ` · v${f.version}` : ''}${size ? ` · ${size}` : ''}` : `Download free for ${label} · Available October 1`; return <button key={key} type="button" className={`btn ${f ? 'btn-primary' : 'btn-outline'}${btnExtra ? ` ${btnExtra}` : ''}`} disabled={!f} onClick={() => request(key)}><Icon name="download" /> {text}</button>; })}{message && <p role="status">{message}</p>}</div>;
}
