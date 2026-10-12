import React, { useState } from 'react';
import PageMeta from './PageMeta';
import { SAMPLE_PACKS } from '../data/plugins';

// The pack store is not open yet. Same family as the custom 404 (NotFound.jsx):
// a SubverseLab hardware plate, here with hazard tape and a work lamp, and the
// application form for producers who want to publish their packs.

const PLATE = '#0A3A35';
const CREAM = '#F2EFE7';
const GOLD = '#C5A059';
const DIM = 'rgba(242, 239, 231, 0.6)';

const KINDS = ['drum kits', 'loops', 'one-shots', 'melodic samples', 'vocals', 'presets', 'other'];
const EMPTY = { name: '', email: '', artist: '', country: '', links: '', kinds: [], storeUrl: '', message: '', rightsConfirmed: false };

const css = `
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
.sp-tape { height: 16px; margin: 18px -26px 0; background: repeating-linear-gradient(-45deg, ${GOLD} 0 16px, #1b2a27 16px 32px);
  box-shadow: 0 2px 6px rgba(0,0,0,.35); }
.sp-tape.low { margin-top: 26px; }
.sp-lamp { display: inline-flex; align-items: center; gap: 8px; margin-top: 18px; font-size: .68rem; letter-spacing: 2px; color: ${DIM}; }
.sp-lamp i { width: 9px; height: 9px; border-radius: 50%; background: ${GOLD}; box-shadow: 0 0 8px ${GOLD}; animation: sp-blink 1.6s steps(2) infinite; }
@keyframes sp-blink { 50% { opacity: .3; box-shadow: none; } }
.sp-h1 { font-size: clamp(1.6rem, 4.5vw, 2.3rem); font-weight: 900; margin: 14px 0 8px; letter-spacing: .5px; }
.sp-p { color: ${DIM}; margin: 0; max-width: 560px; line-height: 1.6; }
.sp-key { display: inline-block; padding: 12px 20px; border-radius: 6px; font-weight: 800; font-size: .8rem; letter-spacing: 1.5px; border: 0; cursor: pointer;
  text-transform: uppercase; background: linear-gradient(180deg,#e2c27e,${GOLD}); color: #16302c;
  box-shadow: 0 3px 0 #8C6F35, 0 6px 12px rgba(0,0,0,.25); transition: transform .08s, box-shadow .08s; }
.sp-key:active { transform: translateY(3px); box-shadow: 0 0 0 #8C6F35, 0 2px 4px rgba(0,0,0,.25); }
.sp-key:disabled { opacity: .6; cursor: default; }
.sp-actions { margin-top: 22px; }
.sp-small { margin: 18px 0 0; font-size: .82rem; color: ${DIM}; max-width: 560px; line-height: 1.5; }
.sp-form { margin-top: 24px; background: rgba(0,0,0,.2); border: 1px solid rgba(242,239,231,.14); border-radius: 10px; padding: 20px; }
.sp-form h2 { margin: 0 0 14px; font-size: 1.15rem; }
.sp-field { margin-bottom: 14px; }
.sp-field label, .sp-field legend { display: block; font-size: .72rem; letter-spacing: 1.5px; text-transform: uppercase; color: ${CREAM}; margin-bottom: 6px; font-weight: 700; padding: 0; }
.sp-hint { font-size: .78rem; color: ${DIM}; margin-top: 4px; }
.sp-in { width: 100%; box-sizing: border-box; background: #F4EFD9; color: #1d2b28; border: 0; border-radius: 6px; padding: 10px 12px; font: inherit; }
.sp-in:focus-visible { outline: 2px solid ${GOLD}; outline-offset: 1px; }
.sp-checks { display: flex; flex-wrap: wrap; gap: 8px 16px; }
.sp-checks label { display: inline-flex; gap: 6px; align-items: center; text-transform: none; letter-spacing: 0; font-size: .9rem; font-weight: 400; margin: 0; }
.sp-rights { display: flex; gap: 10px; align-items: flex-start; font-size: .9rem; line-height: 1.5; }
.sp-error { color: #ff9c8a; margin: 0 0 12px; }
.sp-done { margin-top: 24px; background: rgba(197,160,89,.12); border: 1px solid ${GOLD}; border-radius: 10px; padding: 18px 20px; line-height: 1.6; }
@media (prefers-reduced-motion: reduce) { .sp-lamp i { animation: none; } }
`;

function Screw({ style }) { return <span className="sp-screw" style={style} aria-hidden="true" />; }

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
      const r = await fetch('/api/packs/apply', {
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

export default function SamplePacksPage({ user }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <div className="sp-wrap">
      <PageMeta title={SAMPLE_PACKS.title} description={SAMPLE_PACKS.description} path={SAMPLE_PACKS.path} />
      <style>{css}</style>
      <section className="sp-plate" aria-labelledby="sp-title">
        <Screw style={{ left: 10, top: 10 }} /><Screw style={{ right: 10, top: 10 }} />
        <Screw style={{ left: 10, bottom: 10 }} /><Screw style={{ right: 10, bottom: 10 }} />

        <div className="sp-top">
          <span className="sp-brand">SUBVERSE-LAB</span>
          <span className="sp-model">PACK STORE · WORKSHOP</span>
        </div>
        <div className="sp-tape" aria-hidden="true" />

        <div><span className="sp-lamp"><i />WORK IN PROGRESS</span></div>
        <h1 id="sp-title" className="sp-h1">Sample packs: under construction</h1>
        <p className="sp-p">We are building the SubverseLab pack store the way we built our plugins: our own sound first, measured and finished, then the producers we believe in.</p>

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
            Thanks. We read every application. We will write to you when the store opens, and earlier if we start with your packs.
          </div>
        )}

        <p className="sp-small">Every pack is checked and packaged by SubverseLab before it is published. You keep the rights to your sounds; nothing is exclusive.</p>
        <div className="sp-tape low" aria-hidden="true" />
      </section>
    </div>
  );
}
