import React from 'react';
import { PRICES, launchPriceActive, launchNote, currentPrice, priceWord } from '../data/plugins';

// "$25 $7 — launch price until 1 December 2026" with the regular price struck through. Once the end moment has
// passed (decided at render time in the browser) it is just "$25". `note={false}` leaves the words out (buttons).
export default function LaunchPrice({ slug, note = true }) {
  if (!launchPriceActive(slug)) return <>${PRICES[slug]}</>;
  return (
    <>
      <s aria-label={`regular price $${PRICES[slug]}`}>${PRICES[slug]}</s> {priceWord(currentPrice(slug))}
      {note && launchNote(slug) && <> {'—'} {launchNote(slug)}</>}
    </>
  );
}
