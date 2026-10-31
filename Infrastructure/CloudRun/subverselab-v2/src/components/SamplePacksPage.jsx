import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from './PageMeta';
import { packsCss } from './packs/packsCss';
import { CoverPlay } from './packs/Snippet';
import { SweepBlock } from './packs/PackKey';
import { visiblePacks, packPath } from '../data/packFacts';
import { packOffer, priceLabel } from '../data/samplePackPrices';
import { SAMPLE_PACKS } from '../data/plugins';
import { apiUrl } from '../utils/endpoints';
import { byLatestRelease } from '../data/productDates';
import { useCatalog, mergeSamplePacks, publisherOf } from '../catalog/catalog';

// The pack store catalogue (owner 16 Oct; UX spec research_notes/sample_pack_store_ux_2026-10-16.md §e). Same workshop
// plate as before; the packs come from src/data/samplePacks.js (scripts/import-sample-packs.js), prices from
// src/data/samplePackPrices.js. The producer application form stays below the grid.

const PLATE = '#0A3A35';
const CREAM = '#F2EFE7';
const GOLD = '#C5A059';
const DIM = 'rgba(242, 239, 231, 0.6)';

const KINDS = ['drum kits', 'loops', 'one-shots', 'melodic samples', 'vocals', 'presets', 'other'];
const EMPTY = { name: '', email: '', artist: '', country: '', links: '', kinds: [], storeUrl: '', message: '', rightsConfirmed: false };

// Shared with PresetPacksPage (same workshop plate).
export const css = `
.sp-wrap { padding: 72px 16px 96px; display: flex; justify-content: center; }
.sp-plate { width: 100%; max-width: 760px; background: linear-gradient(180deg, #0D4640 0%, ${PLATE} 60%, #072E2A 100%);
  border-radius: 14px; color: ${CREAM}; box-shadow: 0 18px 40px rgba(3,40,37,.35), inset 0 1px 0 rgba(255,255,255,.08);
  padding: 22px 26px 28px; position: relative; overflow: hidden; }
.sp-screw { position: absolute; width: 10px; height: 10px; border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #e9e4d6, #8f8a7c 60%, #5d594f); }
.sp-screw::after { content: ''; position: absolute; left: 2px; right: 2px; top: 4.5px; height: 1px; background: #4a463e; transform: rotate(35deg); }
.sp-top { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.sp-brand { font-weight: 800; letter-spacing: 3px; font-size: .78rem; }
.sp-model { font-size: .66rem; letter-spacing: 2px; color: ${GOLD}; border: 1px solid ${GOLD}; padding: 2px 8px; border-radius: 3px; }
.sp-tape { height: 1px; margin: 18px -26px 0; background: ${GOLD}; opacity: .45; }  /* was a construction stripe; the store is open (owner 17 Oct) */
.sp-tape.low { margin-top: 26px; }
.sp-lamp { display: inline-flex; align-items: center; gap: 8px; margin-top: 18px; font-size: .68rem; letter-spacing: 2px; color: ${DIM}; }
.sp-lamp i { width: 9px; height: 9px; border-radius: 50%; background: ${GOLD}; box-shadow: 0 0 8px ${GOLD}; animation: sp-blink 1.6s steps(2) infinite; }
@keyframes sp-blink { 50% { opacity: .3; box-shadow: none; } }
.sp-h1 { font-size: clamp(1.6rem, 4.5vw, 2.3rem); font-weight: 900; margin: 14px 0 8px; letter-spacing: .5px; }
.sp-p { color: var(--color-text-muted); margin: 0; max-width: 560px; line-height: 1.6; }
.sp-key { display: inline-block; padding: 12px 20px; border-radius: 6px; font-weight: 800; font-size: .8rem; letter-spacing: 1.5px; border: 0; cursor: pointer;
  text-transform: uppercase; background: linear-gradient(180deg,#e2c27e,${GOLD}); color: #16302c;
  box-shadow: 0 3px 0 #8C6F35, 0 6px 12px rgba(0,0,0,.25); transition: transform .08s, box-shadow .08s; }
.sp-key:active { transform: translateY(3px); box-shadow: 0 0 0 #8C6F35, 0 2px 4px rgba(0,0,0,.25); }
.sp-key:disabled { opacity: .6; cursor: default; }
.sp-actions { margin-top: 22px; }
.sp-small { margin: 18px 0 0; font-size: .82rem; color: var(--color-text-muted); max-width: 560px; line-height: 1.5; }
.sp-form { margin-top: 24px; background: var(--tint-soft); border: 1px solid var(--color-border); border-radius: 10px; padding: 20px; }
.sp-form h2 { margin: 0 0 14px; font-size: 1.15rem; }
.sp-field { margin-bottom: 14px; }
.sp-field label, .sp-field legend { display: block; font-size: .72rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--color-text); margin-bottom: 6px; font-weight: 700; padding: 0; }
.sp-hint { font-size: .78rem; color: var(--color-text-muted); margin-top: 4px; }
.sp-in { width: 100%; box-sizing: border-box; background: #F4EFD9; color: #1d2b28; border: 1px solid var(--color-border); border-radius: 6px; padding: 10px 12px; font: inherit; }
.sp-in:focus-visible { outline: 2px solid var(--color-gold); outline-offset: 1px; }
.sp-checks { display: flex; flex-wrap: wrap; gap: 8px 16px; }
.sp-checks label { display: inline-flex; gap: 6px; align-items: center; text-transform: none; letter-spacing: 0; font-size: .9rem; font-weight: 400; margin: 0; }
.sp-rights { display: flex; gap: 10px; align-items: flex-start; font-size: .9rem; line-height: 1.5; }
.sp-error { color: var(--color-danger); margin: 0 0 12px; }
.sp-done { margin-top: 24px; background: rgba(197,160,89,.12); border: 1px solid ${GOLD}; border-radius: 10px; padding: 18px 20px; line-height: 1.6; }
@media (prefers-reduced-motion: reduce) { .sp-lamp i { animation: none; } }
`;

export function Screw({ style }) { return <span className="sp-screw" style={style} aria-hidden="true" />; }

function Field({ id, label, hint, children }) {
  return (
    <div className="sp-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <div className="sp-hint">{hint}</div>}
    </div>
  );
}

function ApplicationForm({ user, onSent }) {
  const [f, setF] = useState({ ...EMPTY, email: user?.email || '' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const set = (patch) => setF((old) => ({ ...old, ...patch }));
  const toggleKind = (k) => setF((old) => ({ ...old, kinds: old.kinds.includes(k) ? old.kinds.filter((x) => x !== k) : [...old.kinds, k] }));

  const submit = async (e) => {
    e.preventDefault();
    setSending(true); setError('');
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
      const r = await fetch(apiUrl('/api/packs/apply'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...f, links: f.links.split(/\r?\n/).map((l) => l.trim()).filter(Boolean) }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      onSent();
    } catch (err) { setError(err.message); } finally { setSending(false); }
  };

  return (
    <form id="sp-form" className="sp-form" onSubmit={submit}>
      <h2>Publish your sample packs on SubverseLab</h2>
      <Field id="sp-name" label="Your name *">
        <input id="sp-name" className="sp-in" value={f.name} maxLength={100} required autoComplete="name" onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <Field id="sp-email" label="E-mail *">
        <input id="sp-email" type="email" className="sp-in" value={f.email} maxLength={254} required autoComplete="email" onChange={(e) => set({ email: e.target.value })} />
      </Field>
      <Field id="sp-artist" label="Artist / producer name *">
        <input id="sp-artist" className="sp-in" value={f.artist} maxLength={100} required onChange={(e) => set({ artist: e.target.value })} />
      </Field>
      <Field id="sp-country" label="Country">
        <input id="sp-country" className="sp-in" value={f.country} maxLength={80} autoComplete="country-name" onChange={(e) => set({ country: e.target.value })} />
      </Field>
      <Field id="sp-links" label="Links *" hint="One per line: Instagram, YouTube, Spotify, SoundCloud, BeatStars or your own store. At least one.">
        <textarea id="sp-links" className="sp-in" rows={3} value={f.links} placeholder="https://" required onChange={(e) => set({ links: e.target.value })} />
      </Field>
      <fieldset className="sp-field" style={{ border: 0, padding: 0, margin: '0 0 14px' }}>
        <legend>What you make</legend>
        <div className="sp-checks">
          {KINDS.map((k) => (
            <label key={k}><input type="checkbox" checked={f.kinds.includes(k)} onChange={() => toggleKind(k)} />{k}</label>
          ))}
        </div>
      </fieldset>
      <Field id="sp-store" label="Packs you already sell (optional)">
        <input id="sp-store" type="url" className="sp-in" value={f.storeUrl} maxLength={300} placeholder="https://" onChange={(e) => set({ storeUrl: e.target.value })} />
      </Field>
      <Field id="sp-message" label="Short message" hint={`${f.message.length} / 1000`}>
        <textarea id="sp-message" className="sp-in" rows={4} value={f.message} maxLength={1000} onChange={(e) => set({ message: e.target.value })} />
      </Field>
      <div className="sp-field">
        <label className="sp-rights" htmlFor="sp-rights" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, fontSize: '.9rem' }}>
          <input id="sp-rights" type="checkbox" checked={f.rightsConfirmed} required onChange={(e) => set({ rightsConfirmed: e.target.checked })} />
          <span>I made these sounds myself or hold the rights to every sample in them (no uncleared samples).</span>
        </label>
      </div>
      {error && <p className="sp-error" role="alert">{error}</p>}
      <button type="submit" className="sp-key" disabled={sending}>{sending ? 'Sending…' : 'Send application'}</button>
    </form>
  );
}

// Owner 31 Oct: a pack is a record in its sleeve. The cover is the sleeve; the record behind it slides up when the pointer is
// over the card, and while the preview plays it stays half out and turns. The record is drawn in CSS (grooves, a label cut
// from the cover, the spindle hole); nothing is rendered per pack. Keyboard focus on the card counts as hover.
function PackCard({ pack, by }) {
  const offer = packOffer(pack);
  const [playing, setPlaying] = useState(false);
  return (
    <article className={`st-card vinyl${playing ? ' is-playing' : ''}`} aria-labelledby={`pk-${pack.slug}`}>
      <div className="vinyl-stage">
        <div className="vinyl-disc" aria-hidden="true">
          <span className="vinyl-label" style={{ backgroundImage: `url(${pack.cover.small})` }} />
        </div>
        <div className="pk-cover vinyl-sleeve">
          <Link to={packPath(pack)} tabIndex={-1} aria-hidden="true">
            <img src={pack.cover.small} alt="" width={600} height={600} loading="lazy" />
          </Link>
          {pack.snippet?.src && <CoverPlay pack={pack} onState={setPlaying} />}
        </div>
      </div>
      <h2 className="st-name" id={`pk-${pack.slug}`}><Link to={packPath(pack)}>{pack.name}</Link></h2>
      <span className="st-kind">{pack.kindLine}</span>
      {by && <span className="st-by">by {by.name}</span>}
      {offer.price != null ? <span className="st-price">{priceLabel(offer.price)}</span> : <span className="st-soon">Available soon</span>}
    </article>
  );
}

// Store layout (owner 17 Oct: the workshop plate with screws and a nameplate is the plugin product room, not a pack store).
export default function SamplePacksPage({ user }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  // The importer's packs plus the live catalogue (packs added or edited from /admin), newest release first.
  const cat = useCatalog();
  const packs = useMemo(() => byLatestRelease(mergeSamplePacks(visiblePacks(), cat.samplePacks), (p) => p.slug), [cat]);

  return (
    <div className="st-page">
      <PageMeta title={SAMPLE_PACKS.title} description={SAMPLE_PACKS.description} path={SAMPLE_PACKS.path} />
      <style>{css}{packsCss}</style>
      <header className="st-head">
        <h1 id="sp-title">Sample packs</h1>
        <p>Drum kits, loops, FX and MIDI made at SubverseLab, mixed and finished so they sit in a beat as they are. Press play on any cover: every preview is made only from the files in that pack, so what you hear is what you get.</p>
      </header>

      <SweepBlock packs={packs} />

      <div className="st-grid">
        {packs.map((p) => <PackCard key={p.slug} pack={p} by={publisherOf(cat, p.publisher)} />)}
      </div>

      <p className="st-foot">Buy a pack once and it is yours: no subscription. Royalty-free use in your own music; the licence summary is on each pack&rsquo;s page.</p>

      <section className="st-producers" aria-labelledby="sp-make">
        <h2 id="sp-make">Make packs yourself?</h2>
        <p>We are opening the store to producers we believe in. Every pack is checked and packaged by SubverseLab before it is published; you keep the rights to your sounds and nothing is exclusive.</p>
        {!sent && (
          <div className="sp-actions">
            <button type="button" className="sp-key" aria-expanded={open} aria-controls="sp-form"
              onClick={() => { setOpen(true); setTimeout(() => document.getElementById('sp-name')?.focus(), 0); }}>
              Publish your sample packs on SubverseLab
            </button>
          </div>
        )}
        {open && !sent && <ApplicationForm user={user} onSent={() => setSent(true)} />}
        {sent && (
          <div className="sp-done" role="status">
            Thanks. We read every application. We will write to you when we can take your packs on.
          </div>
        )}
      </section>
    </div>
  );
}
