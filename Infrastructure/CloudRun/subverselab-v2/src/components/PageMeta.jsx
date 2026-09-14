import React from 'react';
import { Helmet } from 'react-helmet-async';
import { SITE_URL } from '../data/siteMeta';

// Sets the tab title, description and canonical for one route.
//
// Every route needs one. react-helmet-async only changes what a mounted
// Helmet tells it to, so a page with no Helmet simply inherits whatever the
// last page set — which is why navigating from a guide back to the storefront
// left "Arrangement GPS | SubverseLab" in the tab until a full reload. The
// prerendered HTML was always correct; only client-side navigation drifted.
export default function PageMeta({ title, description, path, image, noIndex = false }) {
  const canonical = path ? `${SITE_URL}${path}` : undefined;
  return (
    <Helmet>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      {canonical && <link rel="canonical" href={canonical} />}
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      {canonical && <meta property="og:url" content={canonical} />}
      {image && <meta property="og:image" content={image} />}
      {/* Account and admin are behind a sign-in and carry nothing worth
          indexing; robots.txt disallows them too, but a crawler that reaches
          them by another route should be told plainly. */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
    </Helmet>
  );
}
