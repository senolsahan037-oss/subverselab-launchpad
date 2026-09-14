import React, { useState } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      if (auth.currentUser) {
        onLoginSuccess({ email: auth.currentUser.email });
        onClose();
      }
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Google sign-in failed: ' + err.message);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    try {
      if (activeTab === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onLoginSuccess({ email });
      onClose();
    } catch (err) {
      switch (err.code) {
        case 'auth/email-already-in-use': setError('Email already registered.'); break;
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
            <rect width="64" height="64" rx="14.08" fill="var(--color-primary)" />
            <rect x="5.60" y="24.32" width="6.72" height="15.36" rx="3.36" fill="var(--color-on-primary)" />
            <rect x="17.12" y="16.13" width="6.72" height="31.74" rx="3.36" fill="var(--color-on-primary)" />
            <rect x="28.64" y="8.45" width="6.72" height="47.10" rx="3.36" fill="var(--color-on-primary)" />
            <rect x="40.16" y="16.13" width="6.72" height="31.74" rx="3.36" fill="var(--color-on-primary)" />
            <rect x="51.68" y="24.32" width="6.72" height="15.36" rx="3.36" fill="var(--color-on-primary)" />
          </svg>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: '600', letterSpacing: '0.06em', color: 'var(--color-text)', textTransform: 'uppercase' }}>SubverseLab</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>Free AI tools for music producers</div>
          </div>
        </div>

        <div className="auth-tabs">
          <div className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`} onClick={() => { setActiveTab('login'); setError(''); }}>Sign In</div>
          <div className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`} onClick={() => { setActiveTab('signup'); setError(''); }}>Join Free</div>
        </div>

        <p className="auth-desc">
          {activeTab === 'login'
            ? 'Sign in to use the member tools.'
            : 'Create a free account to unlock every tool. No payment, no card.'}
        </p>

        {error && (
          <div style={{
            background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)',
            color: '#e74c3c', padding: '10px 14px', borderRadius: '8px',
            fontSize: '0.88rem', marginBottom: '20px', textAlign: 'center'
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email Address</label>
            <input type="email" className="input-field" placeholder="producer@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input type="password" className="input-field" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px', padding: '14px' }}>
            {activeTab === 'login' ? 'Sign In' : 'Create Free Account'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }}></div>
          <span style={{ padding: '0 12px' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }}></div>
        </div>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleGoogleSignIn}
          style={{ width: '100%', padding: '12px', gap: '10px' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.478 0-6.3-2.822-6.3-6.3s2.822-6.3 6.3-6.3c1.606 0 3.058.6 4.195 1.57l3.056-3.056C19.23 2.59 15.93.8 12.24.8c-6.19 0-11.2 5.01-11.2 11.2s5.01 11.2 11.2 11.2c5.967 0 11.08-4.243 11.08-11.2 0-.6-.054-1.2-.16-1.785H12.24z"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          {activeTab === 'login' ? (
            <span>New to SubverseLab?{' '}
              <a href="#signup" onClick={(e) => { e.preventDefault(); setActiveTab('signup'); setError(''); }} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                Create a free account
              </a>
            </span>
          ) : (
            <span>Already have an account?{' '}
              <a href="#login" onClick={(e) => { e.preventDefault(); setActiveTab('login'); setError(''); }} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                Sign In
              </a>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
