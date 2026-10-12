import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from './PageMeta';
import DownloadButtons from './DownloadButtons';
import { FAMILY_ONLY_PLUGINS as TESTER_PLUGINS, TESTERS } from '../data/plugins';
import { SITE_URL } from '../data/siteMeta';

/* /testers — the 100 tester seats. The public part names no plugin (owner 12 Oct); an approved tester sees
 * the plugins under test (TESTER_PLUGINS) with their downloads.
 * Application: POST /api/testers/apply. State: GET /api/testers/me. Once
 * approved the page shows the same launch-2 download buttons as /launch2 (the
 * server lets an approved tester through the ticket gate) and a report form
 * (POST /api/testers/report). Every field is checked again on the server. */

const OS_LIST = ['macOS Apple Silicon', 'macOS Intel', 'Windows 11', 'Windows 10'];
const DAWS = ['Ableton Live', 'FL Studio', 'Logic Pro', 'Cubase', 'Studio One', 'Reaper', 'Pro Tools', 'Bitwig Studio', 'Other'];
const KINDS = [['bug', 'Something breaks'], ['sound', 'Something sounds wrong'], ['ui', 'Interface problem'], ['works', 'Works fine here']];
// The seat counter comes back once this many seats are approved (decisions 2026-10-10); until then it would only show an empty room.
const TESTER_COUNTER_MIN = 25;
const EMPTY = { os: '', osVersion: '', daws: [], dawOther: '', formats: [], years: '', link: '', answer: '', heard: '' };

function useSeats() {
  const [seats, setSeats] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch('/api/testers/seats')
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => { if (alive && body && Number.isInteger(body.approved) && Number.isInteger(body.total)) setSeats(body); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return seats;
}

async function api(user, path, body) {
  const token = await user.getIdToken();
  const r = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}

function Field({ id, label, hint, children }) {
  return (
    <div className="input-group">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <small style={{ color: 'var(--color-text-muted)' }}>{hint}</small>}
    </div>
  );
}

function Choices({ options, value, onToggle, type = 'checkbox', name }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
      {options.map((o) => (
        <label key={o} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 400 }}>
          <input type={type} name={name} checked={value.includes(o)} onChange={() => onToggle(o)} /> {o}
        </label>
      ))}
    </div>
  );
}

function ApplicationForm({ user, onSent, replacing }) {
  const [f, setF] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const set = (patch) => setF((old) => ({ ...old, ...patch }));
  const toggle = (key) => (item) => setF((old) => ({ ...old, [key]: old[key].includes(item) ? old[key].filter((x) => x !== item) : [...old[key], item] }));
  const windows = f.os.startsWith('Windows');

  const submit = async (e) => {
    e.preventDefault();
    setSending(true); setError('');
    try {
      await api(user, '/api/testers/apply', { ...f, years: f.years === '' ? '' : Number(f.years), formats: windows ? f.formats.filter((x) => x !== 'AU') : f.formats });
      onSent();
    } catch (err) { setError(err.message); } finally { setSending(false); }
  };

  return (
    <form onSubmit={submit} className="glass-panel" style={{ padding: '24px' }}>
      <h3 style={{ marginTop: 0 }}>{replacing ? 'Replace your application' : 'Apply for a tester seat'}</h3>
      <Field id="tp-os" label="Operating system">
        <Choices type="radio" name="os" options={OS_LIST} value={[f.os]} onToggle={(o) => set({ os: o, formats: o.startsWith('Windows') ? f.formats.filter((x) => x !== 'AU') : f.formats })} />
      </Field>
      <Field id="tp-osv" label="Operating system version" hint="For example 15.2 or 23H2.">
        <input id="tp-osv" className="input-field" value={f.osVersion} maxLength={40} required onChange={(e) => set({ osVersion: e.target.value })} />
      </Field>
      <Field id="tp-daws" label="DAWs you use" hint="Choose every DAW you work in.">
        <Choices options={DAWS} value={f.daws} onToggle={toggle('daws')} />
      </Field>
      {f.daws.includes('Other') && (
        <Field id="tp-other" label="Which other DAW?">
          <input id="tp-other" className="input-field" value={f.dawOther} maxLength={60} required onChange={(e) => set({ dawOther: e.target.value })} />
        </Field>
      )}
      <Field id="tp-fmt" label="Plugin format you use">
        <Choices options={windows ? ['VST3'] : ['VST3', 'AU']} value={f.formats} onToggle={toggle('formats')} />
      </Field>
      <Field id="tp-years" label="Years producing">
        <input id="tp-years" type="number" min="0" max="60" className="input-field" value={f.years} required onChange={(e) => set({ years: e.target.value })} />
      </Field>
      <Field id="tp-link" label="A link to your music or profile (optional)" hint="SoundCloud, Bandcamp, YouTube, a website — anything that shows your work.">
        <input id="tp-link" type="url" className="input-field" value={f.link} maxLength={300} placeholder="https://" onChange={(e) => set({ link: e.target.value })} />
      </Field>
      <Field id="tp-answer" label="Describe a bug you found in a plugin or DAW and how you reported it" hint={`${f.answer.trim().length} / 1200 — at least 40 characters.`}>
        <textarea id="tp-answer" className="input-field" rows={6} value={f.answer} minLength={40} maxLength={1200} required onChange={(e) => set({ answer: e.target.value })} />
      </Field>
      <Field id="tp-heard" label="Where did you hear about SubverseLab? (optional)">
        <input id="tp-heard" className="input-field" value={f.heard} maxLength={120} onChange={(e) => set({ heard: e.target.value })} />
      </Field>
      {error && <p role="alert">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={sending || !f.os || !f.daws.length || !f.formats.length}>{sending ? 'Sending…' : 'Send application'}</button>
    </form>
  );
}

function ReportForm({ user }) {
  const [f, setF] = useState({ plugin: TESTER_PLUGINS[0].slug, os: '', daw: '', dawVersion: '', kind: 'bug', text: '' });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  const set = (patch) => setF((old) => ({ ...old, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    setSending(true); setError(''); setDone('');
    try {
      await api(user, '/api/testers/report', f);
      setDone('Thank you — the report reached us.');
      set({ text: '' });
    } catch (err) { setError(err.message); } finally { setSending(false); }
  };

  return (
    <form onSubmit={submit} className="glass-panel" style={{ padding: '24px' }}>
      <h3 style={{ marginTop: 0 }}>Send a report</h3>
      <p>One report per finding, with the operating system and DAW it happened in. Reports that say everything works are welcome too.</p>
      <Field id="tr-plugin" label="Plugin">
        <select id="tr-plugin" className="input-field" value={f.plugin} onChange={(e) => set({ plugin: e.target.value })}>
          {TESTER_PLUGINS.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
        </select>
      </Field>
      <Field id="tr-kind" label="What kind of report is it?">
        <select id="tr-kind" className="input-field" value={f.kind} onChange={(e) => set({ kind: e.target.value })}>
          {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Field>
      <Field id="tr-os" label="Operating system">
        <select id="tr-os" className="input-field" value={f.os} required onChange={(e) => set({ os: e.target.value })}>
          <option value="">Choose…</option>
          {OS_LIST.map((o) => <option key={o}>{o}</option>)}
        </select>
      </Field>
      <Field id="tr-daw" label="DAW">
        <input id="tr-daw" className="input-field" value={f.daw} maxLength={60} required placeholder="e.g. Ableton Live" onChange={(e) => set({ daw: e.target.value })} />
      </Field>
      <Field id="tr-dawv" label="DAW version">
        <input id="tr-dawv" className="input-field" value={f.dawVersion} maxLength={40} placeholder="e.g. 12.1" onChange={(e) => set({ dawVersion: e.target.value })} />
      </Field>
      <Field id="tr-text" label="What happened?" hint={`${f.text.trim().length} / 4000 — at least 20 characters. Say what you did, what you expected and what you got.`}>
        <textarea id="tr-text" className="input-field" rows={6} value={f.text} minLength={20} maxLength={4000} required onChange={(e) => set({ text: e.target.value })} />
      </Field>
      {error && <p role="alert">{error}</p>}
      {done && <p role="status" style={{ color: 'var(--color-accent)' }}>{done}</p>}
      <button type="submit" className="btn btn-primary" disabled={sending}>{sending ? 'Sending…' : 'Send report'}</button>
    </form>
  );
}

export default function TestersPage({ user, onLoginClick }) {
  const seats = useSeats();
  const [status, setStatus] = useState(null); // null = unknown, else none | pending | approved | declined
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const left = seats ? Math.max(0, seats.total - seats.approved) : null;

  useEffect(() => {
    if (!user) { setStatus(null); return undefined; }
    let alive = true;
    api(user, '/api/testers/me')
      .then((body) => { if (alive) { setStatus(body.status); setError(''); } })
      .catch((err) => { if (alive) setError(err.message); });
    return () => { alive = false; };
  }, [user]);

  return (
    <div className="plugin-page">
      <PageMeta title={TESTERS.title} description={TESTERS.description} path={TESTERS.path} robots="noindex,follow"
                image={`${SITE_URL}${TESTER_PLUGINS[0].og}`} />

      <section className="plugin-hero">
        <div className="container plugin-hero-inner">
          <Link to="/plugins" className="plugin-back">← Plugins</Link>
          <p className="plugin-kicker">SubverseLab · 100 tester seats</p>
          <h1 className="plugin-title launch-title">Become a SubverseLab tester</h1>
          <p className="plugin-tagline">
            100 producers test our plugins free — chosen so that every operating system and DAW is covered. Applications are read by hand; you hear back by e-mail.
          </p>
          {left !== null && seats.approved >= TESTER_COUNTER_MIN && (
            <div className="launch-codes" role="status">
              <span className="launch-codes-num">{left} / {seats.total}</span>
              <span className="launch-codes-label">tester seats left<small>Live count</small></span>
            </div>
          )}
        </div>
      </section>

      <div className="container" style={{ maxWidth: '820px', padding: '56px 20px 96px' }}>
        <section className="plugin-section">
          <h2>What you get</h2>
          <p>The plugins under test, for macOS and Windows, free, from the Download Room on this page, for as long as you test. Testers get the same builds buyers get. Which plugins they are comes with your seat.</p>
        </section>

        <section className="plugin-section">
          <h2>What we ask in return</h2>
          <ul>
            <li>Install the plugins.</li>
            <li>Use them in real sessions, not only to open and close them.</li>
            <li>Report what breaks — and on which operating system and DAW it happened.</li>
            <li>Tell us where you heard about SubverseLab.</li>
          </ul>
          <p>We choose testers by the systems and DAWs they use and by how well they describe a problem, so the application asks about both.</p>
        </section>

        <section className="plugin-section" id="apply">
          <h2>{status === 'approved' ? 'Your tester seat' : 'Apply'}</h2>
          {!user && (
            <>
              <p>Sign in with your account to apply.</p>
              <p><button type="button" className="btn plugin-btn" onClick={onLoginClick}>Sign in to apply</button></p>
            </>
          )}
          {user && error && <p role="alert">{error}</p>}
          {user && !error && status === null && <p role="status">Checking your application…</p>}
          {user && status === 'none' && <ApplicationForm user={user} onSent={() => setStatus('pending')} />}
          {user && status === 'pending' && (
            editing
              ? <ApplicationForm user={user} replacing onSent={() => setEditing(false)} />
              : (
                <>
                  <p role="status">Your application is in. We will pick testers as applications arrive; come back to this page and the downloads appear here once you are chosen.</p>
                  <p><button type="button" className="btn btn-outline" onClick={() => setEditing(true)}>Replace my application</button></p>
                </>
              )
          )}
          {user && status === 'declined' && <p role="status">We could not offer you a seat this time. Thank you for applying.</p>}
          {user && status === 'approved' && (
            <>
              <p role="status">You are a tester. Download the plugins below, use them in your sessions, and send a report for anything that breaks.</p>
              {TESTER_PLUGINS.map((p) => (
                <div key={p.slug} className="launch-download">
                  <h3>{p.name}</h3>
                  <DownloadButtons slug={p.slug} launchId="launch2" />
                  <p><Link to={p.path}>See {p.name}</Link></p>
                </div>
              ))}
              <ReportForm user={user} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
