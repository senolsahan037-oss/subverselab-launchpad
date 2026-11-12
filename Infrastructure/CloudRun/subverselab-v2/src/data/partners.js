// Affiliate partners, the public part (owner 12 Nov 2026: one permanent setup for every partner, Rekkerd first).
// Keyed by the partner's Lemon Squeezy affiliate code (the `aff` in their links, public by design). Only public facts here:
// the reader discount code is printed in the partner's own article. Commission, report token and payout facts live on the
// server only (Firestore partners/{id}, api/partners.js; scripts/partner-cli.js adds a partner).
//   id               the partner's id on the server (partners/{id})
//   discountCode     the Lemon Squeezy discount code the partner gives its readers ('' = none)
//   discountProducts the product slugs that code applies to in Lemon Squeezy; the site puts the code into those checkouts only
export const PARTNERS = {
  qbnJo: { id: 'rekkerd', name: 'Rekkerd.org', discountCode: 'REKKERD10', discountProducts: ['family'] },
};

export const partnerByAff = (code) => (code && Object.prototype.hasOwnProperty.call(PARTNERS, code) ? PARTNERS[code] : null);
