import React from 'react';
import { Link } from 'react-router-dom';
import PageMeta from './PageMeta';
import { FAMILY_PLUGINS, SOLO_PLUGINS, LINE2_PLUGINS, FREE_PLUGINS, CHECKOUT } from '../data/plugins';
import { byLatestRelease } from '../data/productDates';

// Every plugin on sale or free, newest first like the store (the family is retired; its products are sold on their own).
const JACKS = byLatestRelease([...FAMILY_PLUGINS, ...SOLO_PLUGINS, ...LINE2_PLUGINS.filter((p) => p && CHECKOUT[p.slug]), ...FREE_PLUGINS].filter(Boolean), (p) => p.slug);

// The site's own 404. The server already answers unknown URLs with a real 404
// status (see server.js); this is what a visitor who lands on one sees: a
// piece of SubverseLab hardware with no signal on its input. Tape counter
// stopped at 404, VU needle resting on the left stop, a flat trace with one
// dropout, and a patch bay with the plugins to plug back into.

const PLATE = '#0A3A35';
const CREAM = '#F2EFE7';
const GOLD = '#C5A059';
const DIM = 'rgba(242, 239, 231, 0.55)';

const css = `
.nf-wrap { padding: 72px 16px 96px; display: flex; justify-content: center; }
.nf-plate { width: 100%; max-width: 760px; background: linear-gradient(180deg, #0D4640 0%, ${PLATE} 60%, #072E2A 100%);
  border-radius: 14px; color: ${CREAM}; box-shadow: 0 18px 40px rgba(3,40,37,.35), inset 0 1px 0 rgba(255,255,255,.08);
  padding: 22px 26px 26px; position: relative; }
.nf-screw { position: absolute; width: 10px; height: 10px; border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #e9e4d6, #8f8a7c 60%, #5d594f); }
.nf-screw::after { content: ''; position: absolute; left: 2px; right: 2px; top: 4.5px; height: 1px; background: #4a463e; transform: rotate(35deg); }
.nf-top { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.nf-brand { font-weight: 800; letter-spacing: 3px; font-size: .78rem; }
.nf-model { font-size: .66rem; letter-spacing: 2px; color: ${GOLD}; border: 1px solid ${GOLD}; padding: 2px 8px; border-radius: 3px; }
.nf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 18px; }
@media (max-width: 620px) { .nf-row { grid-template-columns: 1fr; } }
.nf-window { background: #F4EFD9; color: #1d2b28; border-radius: 6px; padding: 12px 14px; box-shadow: inset 0 2px 6px rgba(0,0,0,.35); }
.nf-label { font-size: .6rem; letter-spacing: 2px; color: #6b6a5f; text-transform: uppercase; }
.nf-counter { display: flex; gap: 6px; margin-top: 8px; justify-content: center; }
.nf-drum { width: 54px; height: 70px; border-radius: 6px; background: linear-gradient(180deg,#1a1a17,#2d2d28 45%,#1a1a17);
  color: #f2efe7; display: grid; place-items: center; font: 700 2.6rem/1 ui-monospace, Menlo, monospace; overflow: hidden; position: relative; }
.nf-drum span { display: block; animation: nf-roll 1.6s cubic-bezier(.2,.8,.2,1) both; }
.nf-drum:nth-child(2) span { animation-delay: .15s; } .nf-drum:nth-child(3) span { animation-delay: .3s; }
@keyframes nf-roll { 0% { transform: translateY(-260%); filter: blur(2px); } 80% { transform: translateY(6%); filter: none; } 100% { transform: translateY(0); } }
.nf-vu svg { width: 100%; height: auto; display: block; }
.nf-needle { transform-origin: 120px 118px; animation: nf-drop 2.2s ease-out both; }
@keyframes nf-drop { 0% { transform: rotate(38deg); } 30% { transform: rotate(-30deg); } 50% { transform: rotate(-38deg); } 62% { transform: rotate(-35deg); } 100% { transform: rotate(-40deg); } }
.nf-trace { margin-top: 18px; background: #071f1c; border-radius: 6px; padding: 10px 12px; box-shadow: inset 0 2px 8px rgba(0,0,0,.5); }
.nf-trace path { stroke: ${GOLD}; stroke-width: 2; fill: none; stroke-dasharray: 900; stroke-dashoffset: 900; animation: nf-draw 2.4s .4s ease-out forwards; }
@keyframes nf-draw { to { stroke-dashoffset: 0; } }
.nf-lamp { display: inline-flex; align-items: center; gap: 8px; font-size: .68rem; letter-spacing: 2px; color: ${DIM}; }
.nf-lamp i { width: 9px; height: 9px; border-radius: 50%; background: #d1462f; box-shadow: 0 0 8px #d1462f; animation: nf-blink 1.4s steps(2) infinite; }
@keyframes nf-blink { 50% { opacity: .25; box-shadow: none; } }
.nf-h1 { font-size: clamp(1.6rem, 4.5vw, 2.3rem); font-weight: 900; margin: 22px 0 6px; letter-spacing: .5px; }
.nf-p { color: ${DIM}; margin: 0; max-width: 520px; }
.nf-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; }
.nf-key { display: inline-block; padding: 10px 16px; border-radius: 6px; font-weight: 800; font-size: .78rem; letter-spacing: 1.5px;
  text-transform: uppercase; text-decoration: none; background: linear-gradient(180deg,#f6f2e6,#d9d3c3); color: #16302c;
  box-shadow: 0 3px 0 #9d9686, 0 6px 12px rgba(0,0,0,.25); transition: transform .08s, box-shadow .08s; }
.nf-key:active { transform: translateY(3px); box-shadow: 0 0 0 #9d9686, 0 2px 4px rgba(0,0,0,.25); }
.nf-key.gold { background: linear-gradient(180deg,#e2c27e,${GOLD}); box-shadow: 0 3px 0 #8C6F35, 0 6px 12px rgba(0,0,0,.25); }
.nf-bay { margin-top: 24px; border-top: 1px solid rgba(242,239,231,.14); padding-top: 14px; }
.nf-jacks { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px 8px; margin-top: 10px; }
.nf-jacks .nf-jack { flex: 0 0 calc((100% - 56px) / 8); }
@media (max-width: 620px) { .nf-jacks .nf-jack { flex-basis: calc((100% - 24px) / 4); } }
.nf-jack { text-align: center; text-decoration: none; color: ${CREAM}; font-size: .62rem; letter-spacing: 1.5px; font-weight: 700; }
.nf-jack b { display: block; width: 26px; height: 26px; margin: 0 auto 6px; border-radius: 50%;
  background: radial-gradient(circle, #050c0b 0 34%, #b9b3a3 36% 52%, #6f6a5e 54% 100%); box-shadow: 0 2px 4px rgba(0,0,0,.4); transition: box-shadow .15s; }
.nf-jack:hover b, .nf-jack:focus-visible b { box-shadow: 0 0 0 3px ${GOLD}, 0 2px 4px rgba(0,0,0,.4); }
@media (prefers-reduced-motion: reduce) { .nf-drum span, .nf-needle, .nf-trace path, .nf-lamp i { animation: none; stroke-dashoffset: 0; } }
`;

function Screw({ style }) { return <span className="nf-screw" style={style} aria-hidden="true" />; }

export default function NotFound() {
  return (
    <div className="nf-wrap">
      <PageMeta
        title="Page not found | SubverseLab"
        description="This page does not exist. Go back to the SubverseLab plugins and tools."
        noIndex
      />
      <style>{css}</style>
      <section className="nf-plate" aria-labelledby="nf-title">
        <Screw style={{ left: 10, top: 10 }} /><Screw style={{ right: 10, top: 10 }} />
        <Screw style={{ left: 10, bottom: 10 }} /><Screw style={{ right: 10, bottom: 10 }} />

        <div className="nf-top">
          <span className="nf-brand">SUBVERSELAB</span>
          <span className="nf-model">ERROR UNIT · MODEL NF-404</span>
        </div>

        <div className="nf-row">
          <div className="nf-window">
            <div className="nf-label">Tape counter</div>
            <div className="nf-counter" aria-label="404">
              {['4', '0', '4'].map((d, i) => <div className="nf-drum" key={i}><span>{d}</span></div>)}
            </div>
          </div>
          <div className="nf-window nf-vu">
            <div className="nf-label">Input · VU</div>
            <svg viewBox="0 0 240 130" role="img" aria-label="VU meter reading no signal">
              <path d="M30 110 A100 100 0 0 1 210 110" stroke="#1d2b28" strokeWidth="1.5" fill="none" />
              <path d="M168 44 A100 100 0 0 1 210 110" stroke="#c0392b" strokeWidth="5" fill="none" />
              {[-40, -26, -13, 0, 13, 26, 40].map((a) => (
                <line key={a} x1="120" y1="18" x2="120" y2="28" stroke="#1d2b28" strokeWidth="1.5" transform={`rotate(${a} 120 118)`} />
              ))}
              <text x="34" y="124" fontSize="9" fill="#6b6a5f">-20</text>
              <text x="120" y="88" fontSize="11" fontWeight="700" textAnchor="middle" fill="#6b6a5f">VU</text>
              <text x="196" y="124" fontSize="9" fill="#c0392b">+3</text>
              <g className="nf-needle"><line x1="120" y1="118" x2="120" y2="22" stroke="#1d2b28" strokeWidth="2" /></g>
              <circle cx="120" cy="118" r="5" fill="#1d2b28" />
            </svg>
          </div>
        </div>

        <div className="nf-trace" aria-hidden="true">
          <svg viewBox="0 0 700 60" width="100%" height="60" preserveAspectRatio="none">
            <path d="M0 30 C 40 10, 60 50, 100 30 S 160 12, 200 30 S 250 46, 290 30 L 330 30 L 335 30 L 700 30" />
          </svg>
        </div>

        <div style={{ marginTop: 14 }}><span className="nf-lamp"><i />NO SIGNAL AT THIS ADDRESS</span></div>
        <h1 id="nf-title" className="nf-h1">The signal stops here.</h1>
        <p className="nf-p">This page doesn&rsquo;t exist, or it moved. Rewind to the start, or patch into one of the plugins below.</p>

        <div className="nf-actions">
          <Link to="/" className="nf-key gold">&#9664;&#9664; Rewind to home</Link>
          <Link to="/plugins" className="nf-key">Plugins</Link>
          <Link to="/help" className="nf-key">Help</Link>
        </div>

        <nav className="nf-bay" aria-label="Plugins">
          <div className="nf-label" style={{ color: DIM }}>Patch bay</div>
          <div className="nf-jacks">
            {JACKS.map((p) => (
              <Link key={p.slug} to={p.path} className="nf-jack"><b />{p.name}</Link>
            ))}
          </div>
        </nav>
      </section>
    </div>
  );
}
