import React from 'react';
import Icon from './Icon';
import { CHECKOUT, PRICES, RELEASE_LABEL } from '../data/plugins';

// One Lemon Squeezy checkout button. The links live in CHECKOUT in
// src/data/plugins.js; while one is empty the button is shown disabled with
// the opening date, so no page ever links to a checkout that does not exist.
export default function BuyButton({ slug, label, className = 'btn btn-primary' }) {
  const url = CHECKOUT[slug];
  const text = label || `Buy — $${PRICES[slug]}`;
  if (!url) {
    return (
      <button type="button" className={`${className} plugin-buy-closed`} disabled
              title={`Checkout opens ${RELEASE_LABEL}`}>
        {text} · Opens {RELEASE_LABEL}
      </button>
    );
  }
  return (
    <a href={url} className={className} target="_blank" rel="noopener noreferrer">
      <Icon name="purchase" /> {text}
    </a>
  );
}
