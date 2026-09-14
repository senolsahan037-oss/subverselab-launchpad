import React from 'react';

// The site's icon set, drawn for this brand rather than pulled from a pack.
//
// Every glyph sits on the same 24-unit grid with a 1.8 stroke, round caps and
// round joins — the line character of the emblem itself, so an icon beside a
// button reads as part of the same drawing as the mark in the header. They
// inherit `currentColor`, which means a single definition works on cream and
// on the dark green without a second set.
//
// This replaces the emoji that used to sit in these positions (🚀 📖 ⬇️ 🔒 🔗).
// Emoji are rendered by the operating system, so they arrived in a different
// style on every machine, ignored the palette entirely, and read as a toy
// next to a measurement tool.

const PATHS = {
  // A play mark inside a frame: run this tool, here, on the site.
  launch: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M10.4 8.9 15.6 12l-5.2 3.1Z" fill="currentColor" stroke="none" />
    </>
  ),
  // A written document, not an open book — a book turns to mush at 16px.
  guide: (
    <>
      <path d="M5 5.5A1.5 1.5 0 0 1 6.5 4H15l4 4v11.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5Z" />
      <path d="M15 4v4h4" />
      <path d="M8.5 12.5h7M8.5 16.5h4.5" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v10.5" />
      <path d="M8 11l4 4 4-4" />
      <path d="M5 17.5v1.5A1.5 1.5 0 0 0 6.5 20.5h11a1.5 1.5 0 0 0 1.5-1.5v-1.5" />
    </>
  ),
  locked: (
    <>
      <path d="M8.25 10.5V7.75a3.75 3.75 0 0 1 7.5 0V10.5" />
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" />
    </>
  ),
  // Distinct from `launch` on purpose: this one leaves subverselab.com.
  external: (
    <>
      <path d="M18.5 13.5v5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5v-11A1.5 1.5 0 0 1 6 6h5" />
      <path d="M14.5 3.5H20.5v6" />
      <path d="M20.5 3.5 12 12" />
    </>
  ),
  purchase: (
    <>
      <path d="M4 11.2V5.5A1.5 1.5 0 0 1 5.5 4h5.7a1.5 1.5 0 0 1 1.06.44l7.3 7.3a1.5 1.5 0 0 1 0 2.12l-5.7 5.7a1.5 1.5 0 0 1-2.12 0l-7.3-7.3A1.5 1.5 0 0 1 4 11.2Z" />
      <circle cx="8.2" cy="8.2" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
  warning: (
    <>
      <path d="M12 4.2 21 19.6H3Z" />
      <path d="M12 10.2v4.1" />
      <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
};

export default function Icon({ name, size = 16, style, className }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ flexShrink: 0, ...style }}
    >
      {d}
    </svg>
  );
}
