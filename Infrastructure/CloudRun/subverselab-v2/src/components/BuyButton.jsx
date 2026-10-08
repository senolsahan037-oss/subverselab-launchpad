import React, { useEffect, useState } from 'react';
import Icon from './Icon';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import VerifyEmailNotice from './VerifyEmailNotice';
import { CHECKOUT, PRICES, pluginBySlug } from '../data/plugins';

// One Lemon Squeezy checkout button. The links live in CHECKOUT in
// src/data/plugins.js; while one is empty the button is shown disabled as
// "Available shortly" (the single checkouts of KORO, YANKI, HAVA, TUTKAL and
// MIHENK are still to be created), so no page ever links to a checkout that
// does not exist. Only Kubbe and Kaset pass `full`: while their free 1,000 last
// (full === false) the button reads "After the first 1,000".
// `email` (optional) pre-fills Lemon Squeezy's checkout e-mail, so a paid launch-2
// order matches the signed-in account (?checkout[email]=).
// `uid` (optional) is the signed-in Firebase uid, passed as checkout[custom][uid]:
// Lemon Squeezy returns it as meta.custom_data.uid in the webhook, so the paid
// order is bound to the account that clicked Buy and needs no e-mail round trip.
function withBuyer(url, email, uid) {
  if (!url || (!email && !uid)) return url;
  try {
    const u = new URL(url);
    if (email) u.searchParams.set('checkout[email]', email);
    if (uid) u.searchParams.set('checkout[custom][uid]', uid);
    return u.toString();
  } catch { return url; }
}
// Remembered for this tab when a checkout opens, so /launch knows a purchase
// may be on its way and polls for it. sessionStorage can be unavailable.
const CHECKOUT_KEY = 'svl_checkout_started';
export function checkoutStarted() { try { return sessionStorage.getItem(CHECKOUT_KEY) === '1'; } catch { return false; } }
function markCheckoutStarted() { try { sessionStorage.setItem(CHECKOUT_KEY, '1'); } catch { /* ignored */ } }

// `full` is the launch-1 counter: false while the free 1,000 are still
// going, true once they are gone, undefined for products that have no free
// period. While the free period runs the button stays closed even though the
// checkout exists: the launch sells nothing it is giving away.
export default function BuyButton({ slug, label, email, uid, full, className = 'btn btn-primary' }) {
  // Pages that pass no buyer still bind the order to whoever is signed in.
  const [signedIn, setSignedIn] = useState(() => auth.currentUser);
  useEffect(() => onAuthStateChanged(auth, setSignedIn), []);
  const url = full === false ? '' : withBuyer(CHECKOUT[slug], email || signedIn?.email, uid || signedIn?.uid);
  const text = label || `Buy ${pluginBySlug(slug)?.displayName || ''} — $${PRICES[slug]}`.replace('Buy  —', 'Buy —');
  // An e-mail/password account must verify its address before it can buy (the order is matched to it).
  const unverified = Boolean(signedIn) && !signedIn.emailVerified && signedIn.providerData?.some((p) => p.providerId === 'password') && url;
  if (unverified) {
    return (
      <span className="plugin-buy-unverified" role="status">
        <strong>Check your inbox to verify your e-mail</strong> before buying ({signedIn.email}). Then reload this page.
        <VerifyEmailNotice />
      </span>
    );
  }
  if (!url) {
    // Only a product with a free period (full === false) waits for the 1,000; every other empty link is "available shortly".
    const soon = full !== false;
    return (
      <button type="button" className={`${className} plugin-buy-closed`} disabled
              title={soon ? 'Available shortly' : 'Paid checkout opens after the first 1,000 free downloads'}>
        {text} · {soon ? 'Available shortly' : 'After the first 1,000'}
      </button>
    );
  }
  return (
    <a href={url} className={className} target="_blank" rel="noopener noreferrer" onClick={markCheckoutStarted}>
      <Icon name="purchase" /> {text}
    </a>
  );
}
