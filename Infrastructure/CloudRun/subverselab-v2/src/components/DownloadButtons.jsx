import React, { useEffect, useState } from 'react';
import Icon from './Icon';
import { auth } from '../firebase';
import { onAuthStateChanged, sendEmailVerification } from 'firebase/auth';
import { DOWNLOAD_PLATFORMS } from '../data/plugins';
import { useDownloads, formatSize } from '../hooks/useDownloads';

let pendingDownload = null;
export default function DownloadButtons({ slug, launchId = 'launch', paid = false, className = 'plugin-downloads', btnExtra = '', onLoginClick }) {
  const files = useDownloads(slug); const [message, setMsg] = useState('');
  // The report form (DownloadRoomReport) attaches the last message shown here.
  const setMessage = (m) => { if (m && m !== 'Preparing download…') window.__svlLastDownloadError = m; setMsg(m); };
  const request = async (platform) => {
    const u = auth.currentUser;
    if (!u) { pendingDownload = { slug, platform, launchId }; window.dispatchEvent(new Event('svl-open-auth')); return; }
    // Google has already authenticated the address. Firebase can still expose
    // emailVerified=false for some Google sessions; do not turn that provider
    // state into a download block. Password/email accounts keep the existing
    // verification gate.
    // The first launch is sign-in-only and sends no confirmation mail.
    // Keep the verification gate for the paid launch-2 flow.
    const googleSignedIn = u.providerData?.some((p) => p.providerId === 'google.com');
    if (launchId !== 'launch' && !googleSignedIn && !u.emailVerified) { setMessage('Verify your e-mail first.'); sendEmailVerification(u).catch(() => {}); return; }
    setMessage('Preparing download…');
    try { const token = await u.getIdToken(true); const r = await fetch('/api/download/ticket', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ slug, platform, launchId }) }); const body = await r.json().catch(() => ({})); if (r.status === 410) setMessage('All 1,000 free downloads are taken.'); else if (r.status === 402) setMessage(body.error || 'Purchase required.'); else if (!r.ok) setMessage(body.error || 'Download unavailable.'); else window.location.assign(body.url); } catch { setMessage('Download unavailable. Check your connection and try again.'); }
  };
  useEffect(() => onAuthStateChanged(auth, (u) => { if (u && pendingDownload?.slug === slug && pendingDownload?.launchId === launchId) { const p = pendingDownload; pendingDownload = null; request(p.platform); } }), [slug, launchId]);
  return <div className={className}>{DOWNLOAD_PLATFORMS.map(([key, label]) => { const f = files[key]; const size = f && formatSize(f.size); const text = f ? `${launchId === 'launch2' || paid ? 'Download' : 'Download free'} for ${label}${f.version ? ` · v${f.version}` : ''}${size ? ` · ${size}` : ''}` : `${launchId === 'launch2' ? 'Download' : 'Download free'} for ${label} · Available ${launchId === 'launch2' ? 'October 5' : 'October 1'}`; return <button key={key} type="button" className={`btn ${f ? 'btn-primary' : 'btn-outline'}${btnExtra ? ` ${btnExtra}` : ''}`} disabled={!f} onClick={() => request(key)}><Icon name="download" /> {text}</button>; })}{message && <p role="status">{message}</p>}</div>;
}
