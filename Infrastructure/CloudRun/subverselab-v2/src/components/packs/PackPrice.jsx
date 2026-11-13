import React from 'react';
import PriceTag from '../PriceTag';
import { packOfferEndLabel } from '../../data/samplePackPrices';

// A pack's price as packOffer() gives it, drawn by the site's one price block (PriceTag, owner 14 Nov 2026): "$5", or during
// a sale "$2.99 $5 -40%" with "until 4 January 2027" under it. `className` is the caller's own price class: st-price on the
// record cards (small block), st-big-price on the pack page (large block).
export default function PackPrice({ offer, className }) {
  if (offer.price == null) return null;
  const sale = offer.regular != null && offer.off > 0;
  const tag = { price: offer.price, regular: sale ? offer.regular : null, pct: sale ? offer.off : 0, label: '', ends: sale ? packOfferEndLabel(offer.saleEnds) : '' };
  return (
    <span className={className}>
      <PriceTag offer={tag} size={className === 'st-big-price' ? 'packpage' : 'pack'} />
    </span>
  );
}
