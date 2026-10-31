import React, { useState } from 'react';
import { auth } from '../firebase';
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
} from 'firebase/auth';
import { apiUrl } from '../utils/endpoints';

// Google first (owner 24 Oct 2026). A password account's e-mail can no longer be proven (no verification mail is sent),
// so its signed-out paid orders need a claim with the order number; Google brings a proven address and they open at
// once. E-mail and password stays behind a link, not removed: the 1,282 accounts made that way keep signing in, and
// people who cannot use Google (it is blocked in some countries) can still join. Free plugins open for them by e-mail
// (server freeByEmail). passwordMode: null = Google only on screen, 'login' | 'signup' = the form is open.
export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [passwordMode, setPasswordMode] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      // Local dev only (owner 28 Oct): the Claude browser pane opens popups as tabs, so the popup flow never returns there;
      // under `npm run dev` Google sign-in goes by redirect instead. The live site keeps the popup.
      if (import.meta.env.DEV) { await signInWithRedirect(auth, provider); return; }
      await signInWithPopup(auth, provider);
      if (auth.currentUser) {
        onLoginSuccess({ email: auth.currentUser.email });
        onClose();
      }
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        window.__svlLastDownloadError = `google sign-in: ${err.code || err.message}`;
        setError('Google sign-in failed: ' + err.message);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    try {
      if (passwordMode === 'signup') {
        // No verification mail is sent: the only check is that the address can receive mail. If the check itself
        // is unavailable the sign-up goes on (the server checks again wherever the account acts).
        const check = await fetch(apiUrl(`/api/email/check?email=${encodeURIComponent(email.trim())}`)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
        if (check && check.ok === false) { setError(check.error || 'This e-mail address cannot receive mail.'); return; }
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onLoginSuccess({ email });
      onClose();
    } catch (err) {
      window.__svlLastDownloadError = `sign-in: ${err.code || err.message}`;
      switch (err.code) {
        case 'auth/email-already-in-use': setError('Email already registered. Sign in instead.'); break;
        case 'auth/invalid-email': setError('Invalid email address.'); break;
        case 'auth/weak-password': setError('Password too weak (min 6 characters).'); break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential': setError('Invalid email or password.'); break;
        default: setError('Authentication failed: ' + err.message);
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content fade-in" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* The same mark as the header and the browser tab, in the same gold
            pair — a sign-in dialog that spells the name in a different face
            and colour reads as a different site, which is the last thing a
            login screen should do. */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px', gap: '10px' }}>
          <svg viewBox="0 0 64 64" width="36" height="36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect width="64" height="64" rx="14.08" fill="#C5A059" />{/* fixed brand glyph ground, as in Navbar.jsx and favicon.svg */}
            <rect x="5.60" y="24.32" width="6.72" height="15.36" rx="3.36" fill="#0A0A0A" />
            <rect x="17.12" y="16.13" width="6.72" height="31.74" rx="3.36" fill="#0A0A0A" />
            <rect x="28.64" y="8.45" width="6.72" height="47.10" rx="3.36" fill="#0A0A0A" />
            <rect x="40.16" y="16.13" width="6.72" height="31.74" rx="3.36" fill="#0A0A0A" />
            <rect x="51.68" y="24.32" width="6.72" height="15.36" rx="3.36" fill="#0A0A0A" />
          </svg>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: '600', letterSpacing: '0.06em', color: 'var(--color-text)', textTransform: 'uppercase' }}>SubverseLab</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>Browser tools for music producers</div>
          </div>
        </div>

        <>
        <p className="auth-desc">
          Sign in or create a free account with Google. Use the address you checked out with: your orders, downloads and credits show up at once.
        </p>

        {error && (
          <div style={{
            background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)',
            color: '#e74c3c', padding: '10px 14px', borderRadius: '8px',
            fontSize: '0.88rem', marginBottom: '20px', textAlign: 'center'
          }}>{error}</div>
        )}

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleGoogleSignIn}
          style={{ width: '100%', padding: '14px', gap: '10px' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.478 0-6.3-2.822-6.3-6.3s2.822-6.3 6.3-6.3c1.606 0 3.058.6 4.195 1.57l3.056-3.056C19.23 2.59 15.93.8 12.24.8c-6.19 0-11.2 5.01-11.2 11.2s5.01 11.2 11.2 11.2c5.967 0 11.08-4.243 11.08-11.2 0-.6-.054-1.2-.16-1.785H12.24z"/>
          </svg>
          Continue with Google
        </button>

        {passwordMode ? (
          <form onSubmit={handleSubmit} style={{ marginTop: '24px' }}>
            {passwordMode === 'signup' && (
              <p className="auth-desc" style={{ marginBottom: '16px' }}>
                Without Google, an order placed while signed out opens once you confirm your e-mail address (we send one link from your Account page), or with the order number from your receipt. Free plugins show up by your e-mail address.
              </p>
            )}
            <div className="input-group">
              <label>Email Address</label>
              <input type="email" className="input-field" placeholder="producer@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input type="password" className="input-field" placeholder="••••••••" autoComplete={passwordMode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-ghost" style={{ width: '100%', marginTop: '10px', padding: '12px' }}>
              {passwordMode === 'signup' ? 'Create Free Account' : 'Sign In'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {passwordMode === 'login' ? (
                <a href="#signup" onClick={(e) => { e.preventDefault(); setPasswordMode('signup'); setError(''); }} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>No account yet? Create one with e-mail</a>
              ) : (
                <a href="#login" onClick={(e) => { e.preventDefault(); setPasswordMode('login'); setError(''); }} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Already have an e-mail account? Sign in</a>
              )}
            </div>
          </form>
        ) : (
          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'grid', gap: '8px' }}>
            <span>Signed up with e-mail and password?{' '}
              <a href="#login" onClick={(e) => { e.preventDefault(); setPasswordMode('login'); setError(''); }} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                Sign in here
              </a>
            </span>
            <span>No Google account?{' '}
              <a href="#signup" onClick={(e) => { e.preventDefault(); setPasswordMode('signup'); setError(''); }} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                Use e-mail instead
              </a>
            </span>
          </div>
        )}
        </>
      </div>
    </div>
  );
}
