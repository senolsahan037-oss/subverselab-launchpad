import React from 'react';
import { priceWord } from '../data/plugins';

// The one price block of the site (owner 14 Nov 2026: four places drew a discount four ways). `offer` is
// { price, regular, pct, label, ends } (plugins.js pluginOffer, or packs/PackPrice.jsx for a pack):
// the price a buyer pays now large, the regular price struck beside it, the share off as one stamp, and the offer's
// name and end date on one line under it. Without a reduction it is just the price.
// `size`: card (/plugins shelf, centred), room (product rooms), band (the family band), pack (record cards), packpage.
const money = (v) => (Number(v) === 0 ? 'Free' : `$${Number.isInteger(Number(v)) ? Number(v) : Number(v).toFixed(2)}`);

export default function PriceTag({ offer, size = 'card', note = true }) {
  if (!offer || offer.price == null) return null;
  const reduced = offer.regular != null && Number(offer.regular) !== Number(offer.price);
  return (
    <span className={`price-tag price-tag--${size}`}>
      <span className="price-tag-row">
        <span className="price-tag-now">{Number(offer.price) === 0 ? priceWord(0) : money(offer.price)}</span>
        {reduced && <s className="price-tag-was" aria-label={`regular price ${money(offer.regular)}`}>{money(offer.regular)}</s>}
        {reduced && offer.pct > 0 && <span className="price-tag-off">-{offer.pct}%</span>}
      </span>
      {note && reduced && (offer.label || offer.ends) && (
        <span className="price-tag-note">
          {offer.label && <span className="price-tag-name">{offer.label}</span>}
          {offer.label && offer.ends && ' · '}
          {offer.ends && `until ${offer.ends}`}
        </span>
      )}
    </span>
  );
}
