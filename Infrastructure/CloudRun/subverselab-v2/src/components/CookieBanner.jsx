import React, { useEffect, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import {
  subscribeConsent, getConsentSnapshot, initConsent,
  acceptAnalytics, declineAnalytics, closeConsentSettings,
} from '../consent';

// The analytics consent banner. Fixed to the bottom of the screen, so it never
// pushes the page content (and the buy and download buttons) around; it only
// covers the bottom strip until the visitor chooses. Both buttons are the same
// style on purpose. The footer's "Cookie settings" link reopens it.
export default function CookieBanner() {
  const { choice, open } = useSyncExternalStore(subscribeConsent, getConsentSnapshot, getConsentSnapshot);

  useEffect(() => { initConsent(); }, []);

  useEffect(() => {
    if (!open || !choice) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') closeConsentSettings(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, choice]);

  if (!open) return null;
  return (
    <div className="cookie-banner" role="region" aria-label="Cookie settings">
      <p className="cookie-banner-text">
        {choice ? `Analytics is currently ${choice === 'granted' ? 'on' : 'off'}. ` : ''}
        Accept to let Google Analytics count visits; nothing is set before you choose, and there are no advertising cookies.{' '}
        <Link to="/privacy#storage">Privacy Policy</Link>
      </p>
      <div className="cookie-banner-actions">
        <button type="button" className="btn btn-outline" onClick={acceptAnalytics}>Accept analytics</button>
        <button type="button" className="btn btn-outline" onClick={declineAnalytics}>Decline</button>
      </div>
    </div>
  );
}
