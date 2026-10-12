import React from 'react';
import BuyButton from './BuyButton';
import { useFamilyLive } from '../hooks/useFamilyLive';
import {
  PRICES, FAMILY_REGULAR_PRICE, FAMILY_PLUGINS, FAMILY_NAME, FAMILY_PRICE, FAMILY_OFFER_TERMS, UPDATES_LINE, FAMILY_LATER, FAMILY_IMAGE, FAMILY_IMAGE_SIZE, isFamilyOfferOver,
} from '../data/plugins';

// The SubverseLab plugin family bundle: one block, used on /plugins, every
// plugin page and /launch2, so the price, the single prices, the value line
// and the limits are written in exactly one place (src/data/plugins.js).
// Renders nothing before FAMILY_STARTS_AT or once the launch price has ended (isFamilyOfferOver). Every plugin is also sold on its own (the single prices are listed here);
// the family is the highlighted best-value offer.
export default function FamilyOffer({ buyer = {}, style }) {
  const live = useFamilyLive();
  if (!live || isFamilyOfferOver()) return null;
  return (
    <section className="plugin-bundle family-offer" style={style}>
      <div>
        <img src={FAMILY_IMAGE} alt="The seven products of the SubverseLab plugin family" width={FAMILY_IMAGE_SIZE[0]} height={FAMILY_IMAGE_SIZE[1]}
             loading="lazy" style={{ width: '100%', height: 'auto', borderRadius: '8px', marginBottom: '12px' }} />
        <h2>{FAMILY_NAME} — <s className="family-regular" aria-label={`regular price $${FAMILY_REGULAR_PRICE}`}>${FAMILY_REGULAR_PRICE}</s> ${FAMILY_PRICE}</h2>
        <p className="family-launch-badge"><b>Launch price</b> until {FAMILY_OFFER_TERMS.replace(/^\$[\d.]+ until /, '')}</p>
        <p>
          {FAMILY_PLUGINS.map((p) => p.displayName).join(', ')}. {FAMILY_LATER}
        </p>
        <p className="family-singles">
          Each on its own: {FAMILY_PLUGINS.map((p) => `${p.displayName} $${PRICES[p.slug]}`).join(' · ')}
        </p>
        <p>{UPDATES_LINE}</p>
      </div>
      <BuyButton slug="family" label={`Get the family — $${FAMILY_PRICE}`} email={buyer.email} uid={buyer.uid} />
    </section>
  );
}
