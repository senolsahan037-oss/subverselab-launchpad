// Styles for the pack store (/sample-packs, /sample-packs/<slug>, pack keys on /preset-packs and /account).
// Builds on the shared workshop plate (.sp-*) in SamplePacksPage.jsx. Text, lines and wells use the theme tokens (index.css):
// these pages sit on the site background, which is cream in the light theme. Fixed cream text here was invisible there (22 Oct).
// Fixed colours remain only where the ground is fixed too: covers, the gold keys, the dark button, the cream plate.
export const packsCss = `
.sp-plate.wide { max-width: var(--page-max); }
.pk-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin-top: 24px; }
@media (max-width: 900px) { .pk-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 420px) { .pk-grid { gap: 12px; } }
.pk-card { background: var(--tint-softer); border: 0; box-shadow: var(--shadow-card); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; min-width: 0; }
.pk-cover { position: relative; display: block; aspect-ratio: 1 / 1; background: #033733; }
.pk-cover img { display: block; width: 100%; height: 100%; object-fit: cover; }
.pk-play { position: absolute; right: 10px; bottom: 16px; width: 48px; height: 48px; border-radius: 50%; border: 0; cursor: pointer;
  background: linear-gradient(180deg,#e2c27e,#C5A059); color: #16302c; box-shadow: 0 3px 0 #8C6F35, 0 6px 12px rgba(0,0,0,.3);
  display: inline-flex; align-items: center; justify-content: center; }
.pk-play:focus-visible, .pk-scene:focus-visible, .pk-wave:focus-visible { outline: 2px solid var(--color-text); outline-offset: 2px; }
.pk-play svg { width: 18px; height: 18px; }
.pk-body { padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.pk-name { margin: 0; font-size: 1.15rem; font-weight: 900; letter-spacing: .5px; }
.pk-name a { color: inherit; text-decoration: none; }
.pk-kind { font-size: .8rem; color: var(--color-text-muted); line-height: 1.4; }
.pk-facts { font-size: .74rem; color: var(--color-text-muted); line-height: 1.45; }
.pk-price { font-weight: 800; color: var(--color-gold); font-size: .95rem; margin-top: 4px; }
.pk-cardfoot { margin-top: auto; padding-top: 10px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.pk-link { color: var(--color-text); font-size: .8rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; text-decoration: underline; text-underline-offset: 3px; }
.pk-soon { font-size: .72rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--color-text-muted); }
.sp-key.small { padding: 8px 12px; font-size: .7rem; }
.sp-key[aria-disabled="true"], .sp-key:disabled { opacity: .55; cursor: default; box-shadow: none; transform: none; }
a.sp-key { text-decoration: none; }

.pk-hero { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); gap: 26px; margin-top: 22px; align-items: start; }
@media (max-width: 760px) { .pk-hero { grid-template-columns: minmax(0, 1fr); } }
.pk-hero-cover { border-radius: 10px; overflow: hidden; background: #033733; aspect-ratio: 1 / 1; }
.pk-hero-cover img { display: block; width: 100%; height: 100%; object-fit: cover; }
.pk-crumb { font-size: .78rem; color: var(--color-text-muted); text-decoration: none; letter-spacing: 1px; }
.pk-crumb:hover { color: var(--color-text); }
.pk-offer { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.pk-note { font-size: .8rem; color: var(--color-text-muted); line-height: 1.5; margin: 0; }
.pk-note a { color: inherit; }

.pk-section { margin-top: 30px; }
.pk-h2 { margin: 0 0 10px; font-size: .74rem; letter-spacing: 2px; text-transform: uppercase; font-weight: 800; color: var(--color-gold); }
.pk-strip { background: var(--tint-softer); border: 0; box-shadow: var(--shadow-card); border-radius: 10px; padding: 14px; }
.pk-strip-row { display: flex; gap: 12px; align-items: center; min-width: 0; }
.pk-wave { position: relative; flex: 1; min-width: 0; height: 64px; cursor: pointer; touch-action: manipulation; }
.pk-wave svg { display: block; width: 100%; height: 100%; }
.pk-needle { position: absolute; top: 0; bottom: 0; width: 2px; background: #C5A059; box-shadow: 0 0 6px rgba(197,160,89,.7); pointer-events: none; }
.pk-drag { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 999px; font-size: .76rem; font-weight: 700; color: var(--color-text); background: var(--color-surface); box-shadow: var(--shadow-card); text-decoration: none; cursor: grab; user-select: none; -webkit-user-drag: element; }
.pk-drag:hover { box-shadow: var(--shadow-card-hover); color: var(--color-gold); }
.pk-drag:active { cursor: grabbing; }
.pk-drag svg { width: 14px; height: 14px; }
.pk-time { font-variant-numeric: tabular-nums; font-size: .78rem; color: var(--color-text-muted); min-width: 82px; text-align: right; }
@media (max-width: 560px) { .pk-strip-row { flex-wrap: wrap; } .pk-wave { flex: 1 0 100%; order: 3; } .pk-time { min-width: 0; text-align: left; } }
.pk-scenes { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
.pk-scene { background: var(--tint-soft); color: var(--color-text); border: 1px solid var(--color-control-border); border-radius: 4px; padding: 5px 9px;
  font: inherit; font-size: .74rem; text-align: left; cursor: pointer; line-height: 1.35; max-width: 100%; }
.pk-scene b { color: var(--color-text); font-weight: 700; margin-right: 6px; font-variant-numeric: tabular-nums; }
.pk-scene.on { border-color: var(--color-gold); background: rgba(197,160,89,.16); }
.pk-honest { margin: 12px 0 0; font-size: .86rem; font-weight: 700; color: var(--color-text); }

.pk-plate { background: linear-gradient(180deg, #e9e4d6, #F2EFE7); color: #16302c; border-radius: 8px; padding: 16px 18px; position: relative;
  box-shadow: inset 0 0 0 1px rgba(3,55,51,.25); }
.pk-plate-head { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; font-size: .66rem; letter-spacing: 2px; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid rgba(3,55,51,.3); padding-bottom: 8px; margin-bottom: 4px; }
.pk-plate dl { margin: 0; display: grid; grid-template-columns: minmax(120px, 190px) minmax(0, 1fr); }
.pk-plate dt, .pk-plate dd { margin: 0; padding: 8px 0; border-bottom: 1px dashed rgba(3,55,51,.22); font-size: .86rem; line-height: 1.45; }
.pk-plate dt { font-weight: 800; letter-spacing: .5px; padding-right: 12px; }
.pk-plate dd { font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
@media (max-width: 560px) { .pk-plate dl { grid-template-columns: minmax(0, 1fr); } .pk-plate dt { border-bottom: 0; padding-bottom: 0; } }
.pk-plate-foot { font-size: .74rem; margin: 10px 0 0; color: #3d5450; line-height: 1.5; }

.pk-tree { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: .8rem; line-height: 1.6; background: var(--tint-softer); border-radius: 8px; padding: 12px 14px; overflow-x: auto; }
.pk-tree details summary { cursor: pointer; }
.pk-tree ul { list-style: none; margin: 0; padding-left: 18px; }
.pk-tree .ex { color: var(--color-text-muted); }
.pk-lic { margin: 0; padding-left: 18px; line-height: 1.6; font-size: .9rem; color: var(--color-text-muted); }
.pk-lic li { margin-bottom: 6px; }
.pk-draft { display: inline-block; font-size: .64rem; letter-spacing: 1.5px; font-weight: 800; text-transform: uppercase; color: #16302c; background: #C5A059; border-radius: 3px; padding: 2px 6px; margin-left: 8px; vertical-align: middle; }
.pk-more { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
.pk-more a { color: inherit; text-decoration: none; font-size: .8rem; font-weight: 700; }
.pk-more img { display: block; width: 100%; height: auto; aspect-ratio: 1 / 1; border-radius: 6px; margin-bottom: 6px; }

.pk-sweep { margin-top: 22px; border-radius: 12px; padding: 20px 22px; color: #16302c; position: relative; overflow: hidden;
  background: linear-gradient(135deg, #e2c27e 0%, #C5A059 55%, #b08c48 100%); box-shadow: 0 10px 26px rgba(0,0,0,.3); }
.pk-sweep::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 1px; background: #D9B978; opacity: .35; }
.pk-sweep h2 { margin: 0 0 6px; font-size: clamp(1.3rem, 3.6vw, 1.9rem); font-weight: 900; letter-spacing: .5px; }
.pk-sweep p { margin: 0 0 6px; line-height: 1.5; }
.pk-sweep .pk-sweep-price { font-size: 1.4rem; font-weight: 900; }
.pk-sweep a.pk-sweep-key { display: inline-block; margin-top: 8px; background: #16302c; color: #F2EFE7; text-decoration: none; padding: 12px 20px; border-radius: 6px;
  font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; font-size: .82rem; box-shadow: 0 3px 0 #0b1b19; }
.pk-sweep.small { padding: 14px 16px 18px; }
.pk-sweep.small h2 { font-size: 1.1rem; }
.pk-dl { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.pk-dl p { margin: 0; font-size: .82rem; }

/* Store layout for /sample-packs and /sample-packs/<slug> (owner 17 Oct: a sample pack is not a product room — no plate,
   screws or nameplate here; cover, name, what is inside, price and the preview lead, measurements fold away). */
.st-page { max-width: var(--page-max); margin: 0 auto; padding: 56px 16px 96px; color: var(--color-text); }
.st-head h1 { margin: 0; font-size: clamp(2rem, 6vw, 3.2rem); font-weight: 900; letter-spacing: -.5px; line-height: 1.05; }
.st-head p { margin: 10px 0 0; max-width: 620px; color: var(--color-text-muted); line-height: 1.6; font-size: 1rem; }
.st-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(230px, 40vw), 1fr)); gap: 40px 20px; margin-top: 36px; }
@media (max-width: 700px) { .st-grid { gap: 22px 14px; } }
.st-card { display: flex; flex-direction: column; min-width: 0; }
.st-card .pk-cover { border-radius: 8px; overflow: hidden; box-shadow: var(--shadow-card-hover); transition: transform .15s; }
.st-card:hover .pk-cover { transform: translateY(-3px); }
.st-card .pk-play { right: 10px; bottom: auto; top: 14%; width: 44px; height: 44px; }  /* upper right, clear of the name and kind printed low on the cover */
/* The record in its sleeve (owner 31 Oct). The stage is the sleeve's square; the disc sits behind it and rises on hover /
   focus (38 %), and while the preview plays it stays half out (52 %, the label's top half showing) and turns. The hovered card comes to the front so the
   disc may pass over the row above. Reduced motion: the disc rises without easing and does not turn. */
.st-card.vinyl { position: relative; }
.st-card.vinyl:hover, .st-card.vinyl:focus-within, .st-card.vinyl.is-playing { z-index: 3; }
.vinyl-stage { position: relative; }
.vinyl-sleeve { position: relative; z-index: 2; background: #033733; }
.st-card.vinyl .pk-cover { box-shadow: 0 1px 0 rgba(255,255,255,.35) inset, var(--shadow-card-hover); }
.st-card.vinyl:hover .pk-cover { transform: none; }
.vinyl-disc { position: absolute; left: 4%; top: 4%; width: 92%; aspect-ratio: 1 / 1; border-radius: 50%; z-index: 1;
  background:
    radial-gradient(circle at 50% 50%, #0b0b0b 0 2.4%, #2a2a2a 2.6% 3.2%, transparent 3.4%),
    radial-gradient(circle at 50% 50%, transparent 0 32%, rgba(255,255,255,.06) 32.4% 33%, transparent 33.6%),
    repeating-radial-gradient(circle at 50% 50%, #141414 0 1.6px, #1e1e1e 1.6px 3.2px),
    #161616;
  box-shadow: 0 0 0 1px rgba(0,0,0,.6), 0 18px 30px rgba(3, 55, 51, .28);
  transform: translateY(0) rotate(0deg); transition: transform .55s cubic-bezier(.2,.8,.2,1); will-change: transform; }
.vinyl-disc::after { content: ''; position: absolute; inset: 0; border-radius: 50%; pointer-events: none;
  background: conic-gradient(from 210deg, rgba(255,255,255,0) 0deg, rgba(255,255,255,.14) 22deg, rgba(255,255,255,0) 60deg, rgba(255,255,255,0) 180deg, rgba(255,255,255,.1) 204deg, rgba(255,255,255,0) 240deg); }
.vinyl-label { position: absolute; left: 50%; top: 50%; width: 36%; aspect-ratio: 1 / 1; border-radius: 50%; transform: translate(-50%, -50%);
  background-size: cover; background-position: center; box-shadow: 0 0 0 1px rgba(0,0,0,.5), inset 0 0 0 2px rgba(242,239,231,.18); }
.vinyl-label::after { content: ''; position: absolute; left: 50%; top: 50%; width: 9%; aspect-ratio: 1 / 1; border-radius: 50%; transform: translate(-50%, -50%); background: #F2EFE7; box-shadow: 0 0 0 1px rgba(0,0,0,.6); }
.st-card.vinyl:hover .vinyl-disc, .st-card.vinyl:focus-within .vinyl-disc { transform: translateY(-38%) rotate(-6deg); }
.st-card.vinyl.is-playing .vinyl-disc { animation: vinyl-spin 1.8s linear infinite; }
@keyframes vinyl-spin { from { transform: translateY(-52%) rotate(0deg); } to { transform: translateY(-52%) rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .vinyl-disc { transition: none; }
  .st-card.vinyl.is-playing .vinyl-disc { animation: none; transform: translateY(-52%); }
}
@media (hover: none) { .st-card.vinyl.is-playing .vinyl-disc { animation: vinyl-spin 1.8s linear infinite; } }
.st-name { margin: 12px 0 2px; font-size: 1.05rem; font-weight: 900; letter-spacing: .3px; }
.st-name a { color: inherit; text-decoration: none; }
.st-kind { font-size: .84rem; color: var(--color-text-muted); line-height: 1.4; }
.st-price { margin-top: 6px; font-weight: 800; color: var(--color-gold); font-size: .95rem; }
.st-soon { margin-top: 6px; font-size: .72rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--color-text-muted); }
.st-foot { margin: 40px 0 0; font-size: .86rem; color: var(--color-text-muted); line-height: 1.6; max-width: 640px; }
.st-producers { margin-top: 64px; padding-top: 32px; border-top: 1px solid var(--color-border); max-width: 760px; }
.st-producers h2 { margin: 0 0 6px; font-size: 1.4rem; font-weight: 900; }
.st-producers p { margin: 0; color: var(--color-text-muted); line-height: 1.6; }

.st-crumb { display: inline-block; font-size: .8rem; color: var(--color-text-muted); text-decoration: none; letter-spacing: .5px; margin-bottom: 18px; }
.st-crumb:hover { color: var(--color-text); }
.st-hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 40px; align-items: start; }
@media (max-width: 800px) { .st-hero { grid-template-columns: minmax(0, 1fr); gap: 24px; } }
.st-cover { border-radius: 10px; overflow: hidden; aspect-ratio: 1 / 1; background: #033733; box-shadow: var(--shadow-card-hover); }
.st-cover img { display: block; width: 100%; height: 100%; object-fit: cover; }
.st-hero h1 { margin: 0; font-size: clamp(2.2rem, 6vw, 3.4rem); font-weight: 900; line-height: 1; letter-spacing: -.5px; }
.st-tagline { margin: 10px 0 0; font-size: 1.1rem; font-weight: 700; color: var(--color-gold); }
.st-specs { list-style: none; margin: 22px 0 0; padding: 0; display: grid; gap: 8px; }
.st-specs li { display: flex; gap: 10px; align-items: baseline; font-size: .95rem; line-height: 1.45; }
.st-specs li::before { content: ''; flex: 0 0 6px; height: 6px; border-radius: 50%; background: #C5A059; transform: translateY(-2px); }
.st-buy { margin-top: 26px; display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
.st-buy .st-big-price { font-size: 1.8rem; font-weight: 900; }
.st-buy .sp-key { padding: 15px 26px; font-size: .9rem; }
.st-made { margin: 6px 0 14px; font-size: .95rem; line-height: 1.6; color: var(--color-text-muted); max-width: 52ch; }
.st-small { font-size: .82rem; color: var(--color-text-muted); line-height: 1.5; margin: 0; }
.st-small a { color: inherit; }
.st-section { margin-top: 48px; }
.st-section > h2 { margin: 0 0 14px; font-size: 1.25rem; font-weight: 900; }
.st-fold { margin-top: 14px; border-top: 1px solid var(--color-border); }
.st-fold > summary { cursor: pointer; list-style: none; padding: 16px 0; font-weight: 800; font-size: 1rem; display: flex; justify-content: space-between; }
.st-fold > summary::-webkit-details-marker { display: none; }
.st-fold > div { padding-bottom: 18px; }
.st-rows { margin: 0; display: grid; grid-template-columns: minmax(120px, 200px) minmax(0, 1fr); }
.st-rows dt, .st-rows dd { margin: 0; padding: 7px 0; border-bottom: 1px solid var(--color-border); font-size: .88rem; line-height: 1.45; }
.st-rows dt { color: var(--color-text-muted); padding-right: 12px; }
.st-rows dd { font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
@media (max-width: 560px) { .st-rows { grid-template-columns: minmax(0, 1fr); } .st-rows dt { border-bottom: 0; padding-bottom: 0; } }
.st-more { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; }
@media (max-width: 800px) { .st-more { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.st-more a { color: inherit; text-decoration: none; font-size: .85rem; font-weight: 700; }
/* height: auto — the img's height="600" attribute otherwise beats aspect-ratio and stretches each cover to 600 px tall (22 Oct) */
.st-more img { display: block; width: 100%; height: auto; aspect-ratio: 1 / 1; border-radius: 6px; margin-bottom: 6px; }
`;
