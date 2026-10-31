// Page-local styles for /preset-packs: the store grid of /sample-packs (.st-*, packsCss) plus the key and the folded details.
export const ppCss = `
.pp-card .pk-cover img { display: block; width: 100%; height: auto; aspect-ratio: 1 / 1; object-fit: cover; }
.pp-key { margin-top: 10px; }
.pp-key .sp-key, .pp-key .sp-key.small { width: 100%; padding: 10px 12px; font-size: .74rem; letter-spacing: 1px; white-space: normal; text-align: center; }
.pp-key .pk-dl { align-items: stretch; }
.pp-more { margin-top: 10px; font-size: .86rem; color: var(--color-text-muted); }
.pp-more summary { cursor: pointer; font-size: .72rem; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700; color: var(--color-text); }
.pp-more p { margin: 8px 0 0; line-height: 1.55; }
.pp-more ul { margin: 8px 0 0; padding-left: 18px; line-height: 1.55; }
.pp-more .pp-req { font-size: .8rem; color: var(--color-text-muted); }
.pp-more .pp-audio { width: 100%; margin-top: 8px; }
.pp-card, .pp-card * { overflow-wrap: anywhere; }
`;
