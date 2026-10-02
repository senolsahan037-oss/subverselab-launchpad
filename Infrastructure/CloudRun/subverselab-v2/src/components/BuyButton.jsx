import React from 'react';
import Icon from './Icon';
import { CHECKOUT, PRICES } from '../data/plugins';

// One Lemon Squeezy checkout button. The links live in CHECKOUT in
// src/data/plugins.js; while one is empty the button is shown disabled: the
// first 1,000 people download free from /launch, and paid checkout opens after
// that, so no page ever links to a checkout that does not exist.
// `email` (optional) pre-fills Lemon Squeezy's checkout e-mail, so a paid launch-2
// order matches the signed-in account (?checkout[email]=).
function withEmail(url, email) {
  if (!url || !email) return url;
  try { const u = new URL(url); u.searchParams.set('checkout[email]', email); return u.toString(); } catch { return url; }
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
export default function BuyButton({ slug, label, email, full, className = 'btn btn-primary' }) {
  const url = full === false ? '' : withEmail(CHECKOUT[slug], email);
  const text = label || `Buy — $${PRICES[slug]}`;
  if (!url) {
    return (
      <button type="button" className={`${className} plugin-buy-closed`} disabled
              title={full ? 'The free 1,000 are gone; checkout is opening shortly' : 'Paid checkout opens after the first 1,000 free downloads'}>
        {text} · {full ? 'Opening shortly' : 'After the first 1,000'}
      </button>
    );
  }
  return (
    <a href={url} className={className} target="_blank" rel="noopener noreferrer" onClick={markCheckoutStarted}>
      <Icon name="purchase" /> {text}
    </a>
  );
}
