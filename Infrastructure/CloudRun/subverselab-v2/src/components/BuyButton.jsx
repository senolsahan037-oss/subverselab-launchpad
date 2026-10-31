import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { CHECKOUT, pluginBySlug, currentPrice } from '../data/plugins';
import usePurchaseStatus, { checkoutStarted, markCheckoutStarted } from '../hooks/usePurchaseStatus';
import { sendBuyClick } from '../hooks/useHitCounter';

// One Lemon Squeezy checkout button. The links live in CHECKOUT in
// src/data/plugins.js; while one is empty the button is shown disabled as
// "Available shortly" (the single checkouts of KORO, YANKI, HAVA, TUTKAL and
// MIHENK are still to be created), so no page ever links to a checkout that
// does not exist.
// `email` (optional) pre-fills Lemon Squeezy's checkout e-mail, so a paid launch-2
// order matches the signed-in account (?checkout[email]=).
// `uid` (optional) is the signed-in Firebase uid, passed as checkout[custom][uid]:
// Lemon Squeezy returns it as meta.custom_data.uid in the webhook, so the paid
// order is bound to the account that clicked Buy and needs no e-mail round trip.
export function withBuyer(url, email, uid) {
  if (!url || (!email && !uid)) return url;
  try {
    const u = new URL(url);
    if (email) u.searchParams.set('checkout[email]', email);
    if (uid) u.searchParams.set('checkout[custom][uid]', uid);
    return u.toString();
  } catch { return url; }
}
// Remembered for this tab when a checkout opens (src/hooks/usePurchaseStatus.js), so /launch knows a purchase
// may be on its way and polls for it, and so the buttons can tell the buyer the order is on its way.
export { checkoutStarted };

// A signed-in account that already owns the product never sees a Buy button for it: the button becomes a link to
// its card on /account (a family owner: to the downloads). Right after a checkout was started in this tab and
// until the product shows up as owned (at most three minutes), it says the order is on its way instead.

// `full` is the launch-1 counter: false while the free 1,000 are still
// going, true once they are gone, undefined for products that have no free
// period. While the free period runs the button stays closed even though the
// checkout exists: the launch sells nothing it is giving away.
// `place` says which part of the page the button sits in (stats.js BUY_PLACES: showcase, offer, room, room-family, account,
// launch); a click is counted by the cookieless counter with the page and whether the homepage opening was seen.
export default function BuyButton({ slug, label, email, uid, full, place, className = 'btn btn-primary' }) {
  // Pages that pass no buyer still bind the order to whoever is signed in.
  const [signedIn, setSignedIn] = useState(() => auth.currentUser);
  useEffect(() => onAuthStateChanged(auth, setSignedIn), []);
  const status = usePurchaseStatus();
  const name = pluginBySlug(slug)?.displayName || '';
  const url = full === false ? '' : withBuyer(CHECKOUT[slug], email || signedIn?.email, uid || signedIn?.uid);
  // The label carries the price a buyer pays now (ELEK: the launch price); the struck regular price lives next to the button, as the family's does.
  const text = label || `Buy ${pluginBySlug(slug)?.displayName || ''} \u2014 $${currentPrice(slug)}`;
  if (signedIn && status.loaded && status.owns(slug)) {
    return (
      <Link to={slug === 'family' ? '/account' : `/account#${slug}`} className={`${className} plugin-buy-owned`}>
        <Icon name="download" /> {slug === 'family' ? 'You own this \u2014 go to your downloads' : `You own ${name} \u2014 Download`}
      </Link>
    );
  }
  if (signedIn && status.expecting(slug)) {
    return (
      <span className="plugin-buy-pending" role="status">
        <span>Order received? It appears in your account within a minute.</span>
        <Link to="/account" className="btn btn-primary">Open account</Link>
        {url && <a href={url} className="plugin-buy-pending-back" target="_blank" rel="noopener noreferrer">Not finished? Back to checkout</a>}
      </span>
    );
  }
  if (!url) {
    // The free 1,000 are over: an empty checkout link is always "available shortly".
    return (
      <button type="button" className={`${className} plugin-buy-closed`} disabled title="Available shortly">
        {text} · Available shortly
      </button>
    );
  }
  return (
    <a href={url} className={className} target="_blank" rel="noopener noreferrer" onClick={() => { markCheckoutStarted(slug); sendBuyClick(slug, place); }}>
      <Icon name="purchase" /> {text}
    </a>
  );
}
