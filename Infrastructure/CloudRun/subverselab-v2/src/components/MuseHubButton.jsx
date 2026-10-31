import React from 'react';
import { MUSEHUB } from '../data/plugins';

// MuseHub's own "Download with MuseHub" badge, next to our checkout, for the products MuseHub sells (MUSEHUB in plugins.js).
export default function MuseHubButton({ slug, className = '' }) {
  const href = MUSEHUB[slug];
  if (!href) return null;
  return (
    <a href={href} className={`musehub-btn ${className}`.trim()} target="_blank" rel="noopener" aria-label="Download with MuseHub">
      {/* MuseHub's two official versions: the light one on the cream theme, the black one on the dark theme (index.css tokens). */}
      <img className="musehub-on-light" src="/partners/musehub/download-with-musehub-grey.svg" alt="Download with MuseHub" width="142" height="47" loading="lazy" />
      <img className="musehub-on-dark" src="/partners/musehub/download-with-musehub.svg" alt="" aria-hidden="true" width="142" height="47" loading="lazy" />
    </a>
  );
}
