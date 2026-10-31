import React, { useEffect } from 'react';
import PageMeta from './PageMeta';

// /account for a signed-out visitor. Lemon Squeezy sends every buyer here after checkout ("Go to your downloads",
// receipt: "Sign in or create an account at subverselab.com/account"), and most free ALEV / TABAN orders are placed
// signed out. This page used to redirect to the homepage, so those buyers never saw a sign-in step and ~43 % of the
// free orders were never downloaded (admin stats, 13 Oct 2026). Now it opens the sign-in window and says what to do;
// once signed in, App.jsx renders AccountPage in its place.
export default function AccountSignIn({ onLoginClick }) {
  useEffect(() => { onLoginClick(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="container" style={{ maxWidth: 'var(--read-max)', padding: '56px 20px 96px' }}>
      <PageMeta title="Account | SubverseLab" noIndex />
      <div className="acct-panel" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
        <h1 style={{ marginTop: 0 }}>Your downloads are in your account</h1>
        <p>Continue with Google using the e-mail address you checked out with. Your plugins, downloads and licence keys are on this page once you are in.</p>
        <ul>
          <li><strong>Google</strong> with the checkout address: your order shows up right away. A new account is made the first time.</li>
          <li><strong>E-mail and password:</strong> free plugins show up by your e-mail address. A paid order placed while signed out opens once you confirm your e-mail address with the link your Account page sends, or with &ldquo;Bought without signing in?&rdquo; and the order number from your receipt.</li>
        </ul>
        <button type="button" className="btn btn-primary" onClick={onLoginClick}>Continue with Google</button>
      </div>
    </div>
  );
}
