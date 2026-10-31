import React from 'react';
import BuyButton from './BuyButton';
import {
  PRICES, FAMILY_REGULAR_PRICE, FAMILY_PLUGINS, FAMILY_NAME, FAMILY_PRICE, FAMILY_OFFER_TERMS, UPDATES_LINE, FAMILY_LATER, FAMILY_IMAGE, FAMILY_IMAGE_SIZE, isFamilyOfferOver,
} from '../data/plugins';

// The SubverseLab plugin family bundle: one block, used on /plugins, every
// plugin page and /launch2, so the price, the single prices, the value line
// and the limits are written in exactly one place (src/data/plugins.js).
// It shows the regular total struck through and the launch badge while the offer runs; after it (1 Nov 2026) it renders
// nothing: the family leaves the site and every plugin is sold on its own (owner 2026-10-27).
export default function FamilyOffer({ buyer = {}, style, id }) {
  if (isFamilyOfferOver()) return null;
  return (
    <section className="plugin-bundle family-offer" style={style} id={id}>
      <div>
        <img src={FAMILY_IMAGE} alt="The SubverseLab plugin family" width={FAMILY_IMAGE_SIZE[0]} height={FAMILY_IMAGE_SIZE[1]}
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
      <BuyButton place="offer" slug="family" label={`Get the family — $${FAMILY_PRICE}`} email={buyer.email} uid={buyer.uid} />
    </section>
  );
}
