import React, { useEffect, useState } from 'react';
import Icon from './Icon';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import VerifyEmailNotice, { sendVerificationMail, cooldownLeft } from './VerifyEmailNotice';
import { DOWNLOAD_PLATFORMS } from '../data/plugins';
import { useDownloads, formatSize } from '../hooks/useDownloads';

let pendingDownload = null;
export default function DownloadButtons({ slug, launchId = 'launch', paid = false, className = 'plugin-downloads', btnExtra = '', onLoginClick }) {
  const files = useDownloads(slug); const [message, setMsg] = useState(''); const [needVerify, setNeedVerify] = useState(false);
  // The report form (DownloadRoomReport) attaches the last message shown here.
  const setMessage = (m) => { if (m && m !== 'Preparing download…') window.__svlLastDownloadError = m; setMsg(m); };
  const request = async (platform) => {
    const u = auth.currentUser;
    if (!u) { pendingDownload = { slug, platform, launchId }; window.dispatchEvent(new Event('svl-open-auth')); return; }
    // No client-side verification wall: the server decides. A paid launch-2 order
    // bound to this account opens without a verified e-mail; otherwise it answers
    // 403 'Verify your e-mail address first' and the resend button appears below.
    setNeedVerify(false);
    setMessage('Preparing download…');
    try { const token = await u.getIdToken(true); const r = await fetch('/api/download/ticket', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ slug, platform, launchId }) }); const body = await r.json().catch(() => ({})); if (r.status === 410) setMessage('All 1,000 free downloads are taken.'); else if (r.status === 402) setMessage(body.error || 'Purchase required.'); else if (r.status === 403 && /verify/i.test(body.error || '')) { setNeedVerify(true); if (cooldownLeft() > 0) setMessage(`${body.error}. Use the button below to resend the link.`); else { const out = await sendVerificationMail(u); setMessage(`${body.error}. ${out.message}`); } } else if (!r.ok) setMessage(body.error || 'Download unavailable.'); else window.location.assign(body.url); } catch { setMessage('Download unavailable. Check your connection and try again.'); }
  };
  useEffect(() => onAuthStateChanged(auth, (u) => { if (u && pendingDownload?.slug === slug && pendingDownload?.launchId === launchId) { const p = pendingDownload; pendingDownload = null; request(p.platform); } }), [slug, launchId]);
  return <div className={className}>{DOWNLOAD_PLATFORMS.map(([key, label]) => { const f = files[key]; const size = f && formatSize(f.size); const text = f ? `${launchId === 'launch2' || paid ? 'Download' : 'Download free'} for ${label}${f.version ? ` · v${f.version}` : ''}${size ? ` · ${size}` : ''}` : `${launchId === 'launch2' ? 'Download' : 'Download free'} for ${label} · Available ${launchId === 'launch2' ? 'October 5' : 'October 1'}`; return <button key={key} type="button" className={`btn ${f ? 'btn-primary' : 'btn-outline'}${btnExtra ? ` ${btnExtra}` : ''}`} disabled={!f} onClick={() => request(key)}><Icon name="download" /> {text}</button>; })}{message && <p role="status">{message}</p>}{needVerify && <VerifyEmailNotice />}</div>;
}
