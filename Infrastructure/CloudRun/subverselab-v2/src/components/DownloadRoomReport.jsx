import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { auth, db } from '../firebase';
import Icon from './Icon';

// "Something went wrong?" for the Download Room. Signed-up producers were
// coming back without ever downloading, and a sign-up failure could only reach
// us by e-mail, so the room gets its own report form. It writes to the same
// `reports` collection as the Storefront form (firestore.rules: create is open,
// so a visitor who cannot sign in can still report), and the admin panel's
// Reports tab lists it with no change there: the step, DAW and the last
// download error are folded into `description`.
const STEPS = ['Creating an account or signing in', 'Clicking a download button', 'Installing', 'The plugin does not show up in my DAW', 'Something else'];

export default function DownloadRoomReport() {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  const user = auth.currentUser;

  const submit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const lastError = window.__svlLastDownloadError || '';
    setSending(true); setError('');
    try {
      await addDoc(collection(db, 'reports'), {
        productId: 'download-room',
        productTitle: `Download Room · ${f.plugin.value}`,
        os: f.os.value,
        userEmail: f.userEmail.value || 'Anonymous',
        description: `[Step: ${f.step.value}]${f.daw.value ? ` [DAW: ${f.daw.value}]` : ''}\n${f.description.value}${lastError ? `\n[Last download message: ${lastError}]` : ''}`,
        source: 'download-room',
        uid: user?.uid || null,
        userAgent: navigator.userAgent.slice(0, 300),
        page: window.location.pathname,
        createdAt: new Date().toISOString(),
        status: 'Pending',
      });
      setDone('Thank you — your report reached us. We will reply by e-mail.');
    } catch {
      setError('Could not send the report. Please e-mail info@subverselab.com instead.');
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <p className="dl-report-open">
        <button type="button" className="btn btn-ghost" style={{ fontSize: '0.85rem' }} onClick={() => { setOpen(true); setDone(''); }}>
          <Icon name="warning" /> Problem signing in, downloading or installing? Report it
        </button>
      </p>
    );
  }

  return (
    <div className="glass-panel dl-report" style={{ padding: '20px', marginTop: '16px' }}>
      <h3 style={{ marginBottom: '6px', fontSize: '1.1rem' }}>Report a problem</h3>
      {done ? (
        <p role="status" style={{ color: 'var(--color-accent)' }}>{done}</p>
      ) : (
        <form onSubmit={submit}>
          <div className="input-group">
            <label htmlFor="dlr-step">Where did it go wrong?</label>
            <select id="dlr-step" name="step" className="input-field" defaultValue={user ? STEPS[1] : STEPS[0]}>
              {STEPS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="dlr-plugin">Plugin</label>
            <select id="dlr-plugin" name="plugin" className="input-field" defaultValue="Both">
              <option>Both</option><option>Kubbe</option><option>Kaset</option>
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="dlr-os">Computer</label>
            <select id="dlr-os" name="os" className="input-field" defaultValue="macOS (Apple Silicon)">
              <option>macOS (Apple Silicon)</option><option>macOS (Intel)</option><option>Windows</option><option>Other</option>
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="dlr-daw">DAW (optional)</label>
            <input id="dlr-daw" name="daw" className="input-field" placeholder="e.g. Ableton Live 12, FL Studio 2025" maxLength={80} />
          </div>
          <div className="input-group">
            <label htmlFor="dlr-email">Your e-mail, so we can reply</label>
            <input id="dlr-email" type="email" name="userEmail" className="input-field" defaultValue={user?.email || ''} placeholder="you@example.com" required />
          </div>
          <div className="input-group">
            <label htmlFor="dlr-desc">What happened?</label>
            <textarea id="dlr-desc" name="description" className="input-field" rows={4} required maxLength={2000}
                      placeholder="e.g. I clicked Create Free Account and nothing happened" />
          </div>
          {error && <p role="alert">{error}</p>}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={sending}>{sending ? 'Sending…' : 'Send report'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
