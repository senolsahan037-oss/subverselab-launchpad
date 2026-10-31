import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from '../PageMeta';
import DownloadButtons from '../DownloadButtons';
import { ALL_PLUGINS, SOLO_PLUGINS, FREE_PLUGINS } from '../../data/plugins';
import { VISION, TESTER_LEARN } from '../../data/learnContent';
import { api, Field, OS_LIST, dayOf } from './common';
import { buildCopyText, allBuildsCopyText, parseResults } from './agentText';
import { apiUrl, apiAbsoluteUrl } from '../../utils/endpoints';

/* The tester's own space. It is shown by /account (AccountPage.jsx) for an approved or ended tester, as the whole page:
 * a dark-green header band with the greeting and a side menu with
 *   Overview       welcome, the vision, tool credits, counts          GET /api/testers/panel
 *   Downloads      every released product, free to explore: no obligation, no tasks (replaces the plain owned-plugins list)
 *   Test area      assigned builds with their manuals, tasks, licence key and the tester's results
 *                  GET /api/testers/builds, POST /api/testers/builds/result, manuals via POST /api/download/ticket {kind: 'test-build'}
 *   Messages       the thread with SubverseLab, no e-mail                GET/POST /api/testers/messages
 *   Reports        optional reports + the tester's own list            POST /api/testers/report, GET /api/testers/reports
 *   Learn          how it works, the vision, the accepted agreement     GET /api/testers/agreement
 *   Orders & keys  the normal account content (orders, licence keys, credits, delete account), passed in as `accountSection`
 * Every field is checked again on the server. */

const KINDS = [['bug', 'Something breaks'], ['sound', 'Something sounds wrong'], ['ui', 'Interface problem'], ['works', 'Works fine here'], ['idea', 'An idea for a new online tool or plug-in'], ['panel', 'Panel and permissions request']];
const TEXT_ONLY = ['idea', 'panel'];
const KIND_LABEL = Object.fromEntries(KINDS);
// Every product a tester can be offered, in the order of the account page; the server decides which of them are open.
const RELEASED = [...ALL_PLUGINS, ...SOLO_PLUGINS, ...FREE_PLUGINS];

function ReportForm({ user, plugins, sent, cap, onSent }) {
  const [f, setF] = useState({ plugin: plugins[0]?.slug || '', os: '', daw: '', dawVersion: '', kind: 'works', text: '' });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  const set = (patch) => setF((old) => ({ ...old, ...patch }));
  const textOnly = TEXT_ONLY.includes(f.kind);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true); setError(''); setDone('');
    try {
      await api(user, '/api/testers/report', textOnly ? { kind: f.kind, text: f.text } : f);
      setDone('Thank you — the report reached us.');
      set({ text: '' });
      onSent();
    } catch (err) { setError(err.message); } finally { setSending(false); }
  };

  return (
    <form onSubmit={submit} className="tp-card">
      <h3>Send a report</h3>
      <p>Reports are optional. Nothing here is owed for the released products. Write in plain words and in plug-in terms; you can describe what you hear and see in words, and screenshots are welcome but not required. Name your system and DAW when it matters. You can send {cap} reports a month; {Math.max(0, cap - sent)} left this month.</p>
      <Field id="tr-kind" label="What kind of report is it?">
        <select id="tr-kind" className="input-field" value={f.kind} onChange={(e) => set({ kind: e.target.value })}>
          {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Field>
      {!textOnly && (
        <>
          <Field id="tr-plugin" label="Product">
            <select id="tr-plugin" className="input-field" value={f.plugin} onChange={(e) => set({ plugin: e.target.value })}>
              {plugins.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
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
        </>
      )}
      <Field id="tr-text" label={f.kind === 'idea' ? 'Your idea' : f.kind === 'panel' ? 'What would you like changed?' : 'What happened?'}
             hint={`${f.text.trim().length} / 4000 — at least 20 characters.${f.kind === 'idea' ? ' Say what the tool or plug-in would do and when you would reach for it.' : f.kind === 'panel' ? ' A change to this panel, to your permissions on the website, or a suggestion about the panel itself.' : ' Say what you did, what you expected and what you got.'}`}>
        <textarea id="tr-text" className="input-field" rows={6} value={f.text} minLength={20} maxLength={4000} required onChange={(e) => set({ text: e.target.value })} />
      </Field>
      {error && <p role="alert">{error}</p>}
      {done && <p role="status" className="tp-ok">{done}</p>}
      <button type="submit" className="btn btn-primary" disabled={sending || sent >= cap}>{sending ? 'Sending…' : 'Send report'}</button>
    </form>
  );
}

// The test build's licence key (our own SVL key, closable). The one line says what it is and that we may switch it off.
function LicenceKey({ licence }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(licence.key); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* the key is also selectable */ }
  };
  return (
    <div className="tp-key">
      <h4>Licence key</h4>
      <p><code>{licence.key}</code> <button type="button" className="btn btn-outline" style={{ fontSize: '0.8rem' }} onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>{licence.status === 'disabled' ? <strong> · switched off</strong> : null}</p>
      <p>This key unlocks the test build on up to 2 computers. We may switch it off when testing ends.</p>
    </div>
  );
}

const STATUS_LABEL = { todo: 'Not started', done: 'Done', problem: 'Problem found' };

// One test build: its files, its manuals, the tasks we ask for and the tester's own results for it.
// Downloads and manual files go through POST /api/download/ticket with {kind: 'test-build'}.
// Copies text and says so; the text is also left selectable in a textarea when the clipboard is not available.
function CopyButton({ text, label }) {
  const [state, setState] = useState('');
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setState('Copied.'); } catch { setState('Copying is not available here.'); }
    setTimeout(() => setState(''), 2500);
  };
  return <><button type="button" className="btn btn-outline" onClick={copy}>{label}</button>{state && <span role="status" style={{ marginLeft: '8px' }}>{state}</span>}</>;
}

// "Paste results from your assistant": reads the answer, shows what will be saved per task, saves through the results route.
function PasteResults({ build, tasks, summary, save }) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState(null);
  const preview = () => setParsed(parseResults(text, build.tasks));
  const apply = () => {
    const nextTasks = { ...tasks };
    for (const r of parsed.rows) nextTasks[r.id] = { status: r.status, note: r.note };
    save(nextTasks, parsed.summary ?? summary);
    setParsed(null); setText('');
  };
  const title = (id) => build.tasks.find((t) => t.id === id)?.title;
  return (
    <div className="tp-paste">
      <h4>Paste results from your assistant</h4>
      <Field id={`paste-${build.id}`} label="Your assistant's answer" hint="One line per task like T1 | done | note, then SUMMARY | text. Case and spacing do not matter.">
        <textarea id={`paste-${build.id}`} className="input-field" rows={5} value={text} onChange={(e) => { setText(e.target.value); setParsed(null); }} />
      </Field>
      <button type="button" className="btn btn-outline" disabled={!text.trim()} onClick={preview}>Preview</button>
      {parsed && (
        <div role="region" aria-label="Preview of the pasted results">
          <h4>What will be saved</h4>
          {parsed.rows.length === 0 && parsed.summary === null && <p>Nothing could be read from this text.</p>}
          <ul className="tp-list">
            {parsed.rows.map((r) => <li key={r.ref}>{r.ref} {title(r.id)}: {STATUS_LABEL[r.status]}{r.note ? ` — ${r.note}` : ''}</li>)}
            {parsed.summary !== null && <li>Overall result: {parsed.summary}</li>}
          </ul>
          {parsed.unknown.length > 0 && <p role="alert">Not saved, no such task on this build: {parsed.unknown.join(', ')}.</p>}
          {parsed.bad.length > 0 && <p role="alert">Could not read these lines, not saved: {parsed.bad.join(' / ')}</p>}
          <button type="button" className="btn btn-primary" disabled={parsed.rows.length === 0 && parsed.summary === null} onClick={apply}>Save these results</button>
        </div>
      )}
    </div>
  );
}

function TestBuild({ user, build, onSaved }) {
  const [message, setMessage] = useState('');
  const [tasks, setTasks] = useState(() => Object.fromEntries(build.tasks.map((t) => [t.id, { status: build.result?.tasks?.[t.id]?.status || 'todo', note: build.result?.tasks?.[t.id]?.note || '' }])));
  const [summary, setSummary] = useState(build.result?.summary || '');
  const [saving, setSaving] = useState('');
  const ticket = async (extra, label) => {
    setMessage(label);
    try {
      const token = await user.getIdToken(true);
      const r = await fetch(apiUrl('/api/download/ticket'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ kind: 'test-build', buildId: build.id, ...extra }) });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) { setMessage(body.error || 'Download unavailable.'); return; }
      setMessage('');
      window.location.assign(apiUrl(body.url));
    } catch { setMessage('Download unavailable. Check your connection and try again.'); }
  };
  const saveWith = async (nextTasks, nextSummary) => {
    setSaving('Saving…');
    try { await api(user, '/api/testers/builds/result', { buildId: build.id, tasks: nextTasks, summary: nextSummary }); setSaving('Saved.'); onSaved(); } catch (err) { setSaving(err.message); }
  };
  const save = (e) => { e.preventDefault(); saveWith(tasks, summary); };
  const setTask = (id, patch) => setTasks((old) => ({ ...old, [id]: { ...old[id], ...patch } }));
  return (
    <article className="tp-card tp-build">
      <h3>{build.name} <small>v{build.version} · {build.platform === 'mac' ? 'macOS' : 'Windows'}{build.releasedAt ? ` · released ${dayOf(build.releasedAt)}` : ''}</small></h3>
      {build.notes && <p style={{ whiteSpace: 'pre-wrap' }}>{build.notes}</p>}
      {(build.brief.goal || build.brief.reference || build.brief.strengths.length || build.brief.knownIssues.length || build.brief.focus) && (
        <div className="tp-brief">
          {build.brief.goal && <><h4>What this plug-in is for</h4><p style={{ whiteSpace: 'pre-wrap' }}>{build.brief.goal}</p></>}
          {build.brief.reference && <><h4>Reference</h4><p style={{ whiteSpace: 'pre-wrap' }}>{build.brief.reference}</p></>}
          {(build.brief.strengths.length > 0 || build.brief.knownIssues.length > 0) && (
            <div className="tp-proscons">
              {build.brief.strengths.length > 0 && <section><h4>What already works well</h4><ul>{build.brief.strengths.map((l) => <li key={l}>{l}</li>)}</ul></section>}
              {build.brief.knownIssues.length > 0 && <section><h4>What we know is not right yet</h4><ul>{build.brief.knownIssues.map((l) => <li key={l}>{l}</li>)}</ul></section>}
            </div>
          )}
          {build.brief.focus && <><h4>What we want to learn from you</h4><p style={{ whiteSpace: 'pre-wrap' }}>{build.brief.focus}</p></>}
        </div>
      )}
      <p><button type="button" className="btn btn-primary" onClick={() => ticket({}, 'Preparing download…')}>Download this build</button></p>
      {build.licence && <LicenceKey licence={build.licence} />}
      {build.manuals.length > 0 && (
        <>
          <h4>Manuals</h4>
          <ul className="tp-list">
            {build.manuals.map((m) => (
              <li key={m.index}>{m.url
                ? <a href={m.url} target="_blank" rel="noopener noreferrer">{m.title}</a>
                : <button type="button" className="tp-link" onClick={() => ticket({ manual: m.index }, 'Preparing manual…')}>{m.title}</button>}</li>
            ))}
          </ul>
        </>
      )}
      {message && <p role="status">{message}</p>}
      <p><CopyButton text={buildCopyText({ ...build, result: { tasks, summary } })} label="Copy for your assistant" /></p>
      <form onSubmit={save}>
        {build.tasks.length > 0 && (
          <>
            <h4>Things we would like you to try</h4>
            {build.tasks.map((t) => (
              <div key={t.id} className="tp-task">
                <strong>{t.title}</strong>
                {t.detail && <p style={{ whiteSpace: 'pre-wrap' }}>{t.detail}</p>}
                <div className="tp-task-row">
                  <select className="input-field" aria-label={`Status of ${t.title}`} value={tasks[t.id].status} onChange={(e) => setTask(t.id, { status: e.target.value })}>
                    {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <textarea className="input-field" rows={2} maxLength={1500} aria-label={`Notes on ${t.title}`} placeholder="What you heard and saw, in your own words" value={tasks[t.id].note} onChange={(e) => setTask(t.id, { note: e.target.value })} />
                </div>
              </div>
            ))}
          </>
        )}
        <Field id={`sum-${build.id}`} label="Your results for this build" hint="Free-form, in plain words and plug-in terms. Screenshots are welcome but not required; you can describe what you hear and see in words.">
          <textarea id={`sum-${build.id}`} className="input-field" rows={5} maxLength={4000} value={summary} onChange={(e) => setSummary(e.target.value)} />
        </Field>
        <button type="submit" className="btn btn-primary">Save my results</button>
        {saving && <span role="status" style={{ marginLeft: '12px' }}>{saving}</span>}
      </form>
      {build.tasks.length > 0 && <PasteResults build={build} tasks={tasks} summary={summary} save={saveWith} />}
    </article>
  );
}

function Messages({ user, onChange }) {
  const [thread, setThread] = useState(null);
  const [text, setText] = useState('');
  const [kind, setKind] = useState('message');
  const [error, setError] = useState('');
  const load = () => api(user, '/api/testers/messages').then(async (d) => {
    setThread(d.messages);
    if (d.unread > 0) { await api(user, '/api/testers/messages/read', {}).catch(() => {}); onChange(); }
  }).catch((err) => setError(err.message));
  useEffect(() => { load(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  const send = async (e) => {
    e.preventDefault();
    setError('');
    try { await api(user, '/api/testers/messages', { body: text, kind }); setText(''); await load(); } catch (err) { setError(err.message); }
  };
  return (
    <div className="tp-card">
      <h3>Messages</h3>
      <p>Write to us here; we answer here. Nothing is sent by e-mail.</p>
      {!thread && !error && <p role="status">Loading…</p>}
      {thread?.length === 0 && <p>No messages yet.</p>}
      <div className="tp-thread">
        {(thread || []).map((m) => (
          <div key={m.id} className={`tp-msg ${m.from === 'staff' ? 'tp-msg-staff' : 'tp-msg-me'}`}>
            <small>{m.from === 'staff' ? 'SubverseLab' : 'You'}{m.kind === 'panel' ? ' · Panel and permissions request' : ''} · {dayOf(m.at)}</small>
            <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
          </div>
        ))}
      </div>
      <form onSubmit={send}>
        <Field id="tm-kind" label="About">
          <select id="tm-kind" className="input-field" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="message">A message</option>
            <option value="panel">Panel and permissions request</option>
          </select>
        </Field>
        <Field id="tm-text" label="Your message">
          <textarea id="tm-text" className="input-field" rows={4} maxLength={2000} required value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        {error && <p role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary">Send</button>
      </form>
    </div>
  );
}

// The agreement text is only served to signed-in testers, so the link fetches it with the token and opens it as a page.
// The personal agent key: create (shown once), revoke, and the copy-paste setup steps.
function AgentKey({ user }) {
  const [info, setInfo] = useState(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const load = () => api(user, '/api/testers/agent-token').then(setInfo).catch((err) => setError(err.message));
  useEffect(() => { load(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  const create = async () => { setError(''); try { const d = await api(user, '/api/testers/agent-token', {}); setToken(d.token); await load(); } catch (err) { setError(err.message); } };
  const revoke = async () => { setError(''); try { await api(user, '/api/testers/agent-token/revoke', {}); setToken(''); await load(); } catch (err) { setError(err.message); } };
  const spec = apiAbsoluteUrl('/api/testers/agent/openapi.json');
  return (
    <section className="tp-card" id="learn-agent">
      <h3>Connect your assistant</h3>
      <p>A personal agent key lets an assistant that can call web APIs read your test tasks and write your results, reports and messages. It cannot reach your account, credits, licence keys or downloads. You can have one key at a time, and revoke it whenever you like.</p>
      <ol className="tp-list">
        <li>Create your key below and copy it now: it is shown once.</li>
        <li>In ChatGPT, create a custom GPT and add an action. Import the schema from this address: <code>{spec}</code></li>
        <li>For authentication choose API key, type Bearer, and paste your key. Other agents: send the key as an Authorization: Bearer header to the same routes.</li>
        <li>Ask the assistant to list your builds, then to save results task by task.</li>
      </ol>
      {error && <p role="alert">{error}</p>}
      {info?.exists
        ? <p>You have an agent key (made {dayOf(info.createdAt)}{info.lastUsedAt ? `, last used ${dayOf(info.lastUsedAt)}` : ', not used yet'}). <button type="button" className="btn btn-outline" onClick={revoke}>Revoke key</button> <button type="button" className="btn btn-outline" onClick={create}>Replace key</button></p>
        : <p><button type="button" className="btn btn-primary" onClick={create}>Create agent key</button></p>}
      {token && <div role="status"><p>Your new key. Copy it now, it will not be shown again:</p><p><code style={{ wordBreak: 'break-all' }}>{token}</code></p><CopyButton text={token} label="Copy key" /></div>}
    </section>
  );
}

function AgreementLink({ user, version }) {
  const [error, setError] = useState('');
  const open = async () => {
    setError('');
    try {
      const token = await user.getIdToken();
      const r = await fetch(apiUrl(`/api/testers/agreement?v=${encodeURIComponent(version)}`), { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error('The agreement text could not be loaded.');
      window.open(URL.createObjectURL(new Blob([await r.text()], { type: 'text/html' })), '_blank', 'noopener');
    } catch (err) { setError(err.message); }
  };
  return <><button type="button" className="tp-link" onClick={open}>Read the agreement (v{version})</button>{error && <span role="alert"> {error}</span>}</>;
}

const TABS = [['home', 'Overview'], ['downloads', 'Downloads'], ['builds', 'Test area'], ['messages', 'Messages'], ['reports', 'Reports'], ['learn', 'Learn'], ['account', 'Orders & keys']];

// The tester's own space (see the header comment). Its look is deliberately not the plain account look.
export default function TesterSpace({ user, accountSection = null }) {
  const [tab, setTab] = useState('home');
  const [panel, setPanel] = useState(null);
  const [builds, setBuilds] = useState([]);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');
  const load = () => Promise.all([api(user, '/api/testers/panel'), api(user, '/api/testers/builds'), api(user, '/api/testers/reports')])
    .then(([p, b, r]) => { setPanel(p); setBuilds(b.builds || []); setReports(r.reports || []); setError(''); })
    .catch((err) => setError(err.message));
  useEffect(() => { load(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = panel?.status === 'active';
  const open = panel ? RELEASED.filter((p) => panel.downloads.includes(p.slug)) : [];
  const unread = panel?.messages?.unread || 0;
  return (
    <div className="tp-page">
      <PageMeta title="Your SubverseLab panel | SubverseLab" noIndex />
      <header className="tp-band">
        <div className="container tp-band-inner">
          <h1 className="tp-welcome">Welcome{panel ? `, ${panel.welcome.name}` : ''}{panel?.welcome.production ? <span> · {panel.welcome.production}</span> : null}</h1>
          <p className="tp-vision">{VISION}</p>
        </div>
      </header>
      <div className="container tp-layout">
        <nav className="tp-nav" aria-label="Panel">
          {TABS.filter(([id]) => id !== 'account' || accountSection).map(([id, label]) => (
            <button key={id} type="button" className={`tp-tab${tab === id ? ' tp-tab-on' : ''}`} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
              {label}{id === 'messages' && unread > 0 ? <span className="tp-count">{unread}</span> : null}
            </button>
          ))}
        </nav>
        <main className="tp-main">
          {error && <p role="alert">{error}</p>}
          {!panel && !error && <p role="status">Opening your tester panel…</p>}
          {tab === 'account' && accountSection}
          {panel && !active && tab !== 'account' && <p className="tp-card" role="status">Your testing period has ended. The products you already hold stay available under Downloads; thank you for testing.</p>}

          {panel && tab === 'home' && (
            <>
              <section className="tp-card">
                <h3>How this works</h3>
                <p><strong>Released products</strong> are yours to download and explore as you like. There is no reporting obligation and there are no tasks for them.</p>
                <p><strong>Test builds</strong> are early versions we assign to you. They appear under Test area with their manuals, and we may ask you to try a few specific things before release.</p>
              </section>
              {active && (
                <section className="tp-card">
                  <h3>Tool credits</h3>
                  {panel.credits
                    ? (
                      <>
                        <p className="tp-big"><strong>{panel.credits.left.toLocaleString('en-US')}</strong> of {panel.credits.monthly.toLocaleString('en-US')} left this month</p>
                        <p>Testers get {panel.credits.monthly.toLocaleString('en-US')} tool credits every calendar month. Credits you do not use do not carry over. Credits you bought are kept apart and used after these.</p>
                      </>
                    )
                    : <p>Your tester credits for this month could not be loaded right now. Reload the page in a minute.</p>}
                </section>
              )}
              <section className="tp-card">
                <h3>At a glance</h3>
                <ul className="tp-list">
                  <li>{open.length} released products to download</li>
                  <li>{active ? builds.length : 0} test builds assigned to you</li>
                  <li>{unread} new messages</li>
                  <li>{reports.length} reports sent</li>
                </ul>
              </section>
            </>
          )}

          {panel && tab === 'downloads' && (
            <>
              <section className="tp-card">
                <h3>Released products</h3>
                <p>Free to download and explore as you like. No reporting obligation and no tasks for released products; a report about one is always optional.</p>
              </section>
              {open.length === 0 && <p>Nothing to download.</p>}
              {open.map((p) => (
                <div key={p.slug} className="tp-card">
                  <h3>{p.name}</h3>
                  <DownloadButtons slug={p.slug} launchId={p.launchId || 'launch'} paid />
                  <p><Link to={p.path}>See {p.name}</Link></p>
                </div>
              ))}
            </>
          )}

          {panel && tab === 'builds' && (
            <>
              <section className="tp-card">
                <h3>Test area</h3>
                <p>Early builds assigned to you, each with its manuals. Tasks and results here are for test builds only. Write in plain words; you can describe what you hear and see, and screenshots are welcome but not required.</p>
                {builds.length > 0 && <p><CopyButton text={allBuildsCopyText(builds)} label="Copy for your assistant" /> <small>Copies every build below; answer each build on its own.</small></p>}
              </section>
              {!active || builds.length === 0
                ? <p>No builds are assigned to you right now. When we open one to you it appears here, with its manuals, and only on your account.</p>
                : builds.map((b) => <TestBuild key={`${b.id}-${b.result?.updatedAt || ''}`} user={user} build={b} onSaved={load} />)}
            </>
          )}

          {panel && tab === 'messages' && <Messages user={user} onChange={load} />}

          {panel && tab === 'reports' && (
            <>
              {active && <ReportForm user={user} plugins={open} sent={panel.reports.sent} cap={panel.reports.cap} onSent={load} />}
              <section className="tp-card">
                <h3>My reports</h3>
                {reports.length === 0 && <p>You have not sent a report yet.</p>}
                {reports.map((r) => (
                  <div key={r.id} className="tp-report">
                    <small><strong>{KIND_LABEL[r.kind] || r.kind}</strong>{r.plugin ? ` · ${r.plugin}` : ''}{r.os ? ` · ${r.os}` : ''}{r.daw ? ` · ${r.daw}${r.dawVersion ? ` ${r.dawVersion}` : ''}` : ''} · {dayOf(r.at)}</small>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{r.text}</div>
                  </div>
                ))}
              </section>
            </>
          )}

          {panel && tab === 'learn' && (
            <>
              <section className="tp-card">
                <h3>What we care about</h3>
                <p>{VISION}</p>
              </section>
              {TESTER_LEARN.map((item) => (
                <section key={item.id} className="tp-card" id={`learn-${item.id}`}>
                  <h3>{item.title}</h3>
                  {item.body.map((para) => <p key={para}>{para}</p>)}
                </section>
              ))}
              <AgentKey user={user} />
              <section className="tp-card">
                <h3>Your agreement</h3>
                {panel.agreement
                  ? <p>You accepted the Tester Agreement v{panel.agreement.version} by e-mail{panel.agreement.acceptedAt ? ` on ${dayOf(panel.agreement.acceptedAt)}` : ''}. <AgreementLink user={user} version={panel.agreement.version} /></p>
                  : <p>Your acceptance of the Tester Agreement is on file with us.</p>}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

