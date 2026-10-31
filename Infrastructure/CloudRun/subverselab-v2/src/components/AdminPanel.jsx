import React, { useState, useEffect } from 'react';
import { collection, doc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ProductForm from './ProductForm';
import SEOAdminTab from './admin/SEOAdminTab';
import StatsTab from './admin/StatsTab';
import MembersTab from './admin/MembersTab';
import CatalogTab from './admin/CatalogTab';
import PageMeta from './PageMeta';
import { apiUrl } from '../utils/endpoints';

// Same normalization the Storefront uses: `category`/`displayCategory` are
// optional UI-only fields that synced tools never set, so falling back to
// the always-present `content_type` (and turning its raw `ai_tool` enum into
// "Ai Tool") is what keeps this column from being blank for most products.
const categoryLabel = (p) => {
  const raw = (p.displayCategory || p.category || p.content_type || '').replace(/_/g, ' ').trim();
  return raw.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());
};

// Take a tester on without an application (owner 31 Oct): the same seat cap and agreement record as an approval;
// POST /api/admin/testers/invite. An agent can do the same with its key (scripts/catalog-cli.js testers invite).
const INVITE_OS = ['macOS Apple Silicon', 'macOS Intel', 'Windows 11', 'Windows 10'];
const INVITE_DAWS = ['Ableton Live', 'FL Studio', 'Logic Pro', 'Cubase', 'Studio One', 'Reaper', 'Pro Tools', 'Bitwig Studio'];
function InviteTester({ adminFetch, onDone }) {
  const [f, setF] = useState({ email: '', os: INVITE_OS[0], daws: [], agreementVersion: '1.1', acceptedAt: '', production: '' });
  const [state, setState] = useState({ busy: false, msg: '', error: '' });
  const go = async (e) => {
    e.preventDefault();
    setState({ busy: true, msg: '', error: '' });
    try {
      const out = await adminFetch('/api/admin/testers/invite', { ...f, acceptedAt: f.acceptedAt ? new Date(f.acceptedAt).toISOString() : '' });
      setState({ busy: false, msg: `${f.email}: ${out.result}${out.invited ? ' (new record)' : ''}; ${out.approved} seats taken.`, error: '' });
      setF((x) => ({ ...x, email: '', production: '' }));
      onDone();
    } catch (err) { setState({ busy: false, msg: '', error: err.message }); }
  };
  const toggleDaw = (d) => setF((x) => ({ ...x, daws: x.daws.includes(d) ? x.daws.filter((y) => y !== d) : [...x.daws, d] }));
  return (
    <form onSubmit={go} className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
      <h2 style={{ margin: '0 0 6px', fontSize: '1.4rem' }}>Invite a tester</h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 14px', lineHeight: 1.5 }}>
        Takes a seat at once, like an approval: the address, their system and the agreement they accepted by e-mail (version and moment). They sign in with that address and find their panel on /testers.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'end' }}>
        <div><label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>E-mail</label>
          <input className="input-field" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></div>
        <div><label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>System</label>
          <select className="input-field" value={f.os} onChange={(e) => setF({ ...f, os: e.target.value })}>{INVITE_OS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
        <div><label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>Agreement version</label>
          <input className="input-field" value={f.agreementVersion} onChange={(e) => setF({ ...f, agreementVersion: e.target.value })} placeholder="1.1" required /></div>
        <div><label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>Accepted at</label>
          <input className="input-field" type="datetime-local" value={f.acceptedAt} onChange={(e) => setF({ ...f, acceptedAt: e.target.value })} required /></div>
        <div><label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>What they make (optional)</label>
          <input className="input-field" value={f.production} onChange={(e) => setF({ ...f, production: e.target.value })} placeholder="e.g. hip hop beats, mixing" /></div>
        <div><button type="submit" className="btn btn-primary" disabled={state.busy}>{state.busy ? 'Inviting…' : 'Invite and approve'}</button></div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
        {INVITE_DAWS.map((d) => <button key={d} type="button" className={`plugin-filter-chip${f.daws.includes(d) ? ' active' : ''}`} aria-pressed={f.daws.includes(d)} onClick={() => toggleDaw(d)}>{d}</button>)}
      </div>
      {state.msg && <p role="status" style={{ color: 'var(--color-accent)', fontSize: '0.88rem', margin: '12px 0 0' }}>{state.msg}</p>}
      {state.error && <p role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.88rem', margin: '12px 0 0' }}>{state.error}</p>}
    </form>
  );
}

export default function AdminPanel({ user, packs, packsLoading, refreshProducts }) {
  const [activeTab, setActiveTab] = useState('stats');
  const [usersList, setUsersList] = useState([]);
  const [usersError, setUsersError] = useState(null);
  const [reports, setReports] = useState([]);
  const [reportsError, setReportsError] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [testers, setTesters] = useState(null);
  const [packApps, setPackApps] = useState(null);
  const [packAppsError, setPackAppsError] = useState(null);
  const [testerReports, setTesterReports] = useState([]);
  const [testersError, setTestersError] = useState(null);
  const [testerBusy, setTesterBusy] = useState('');
  const [builds, setBuilds] = useState([]);
  const [buildForm, setBuildForm] = useState(null); // null = closed, else the build being created or edited
  const [buildBusy, setBuildBusy] = useState('');
  const [buildResults, setBuildResults] = useState({}); // buildId -> the testers' results, loaded on demand
  const [threads, setThreads] = useState({ threads: [], unread: 0 });
  const [uploadMsg, setUploadMsg] = useState('');
  const [openThread, setOpenThread] = useState(null); // {email, messages}
  const [replyText, setReplyText] = useState('');

  // Product Management reads the same Firestore-backed `packs` state App.jsx
  // already loads for the Storefront/ToolRoom — one source of truth, no
  // second product query. It never depends on the dashboard data below.
  const products = packs || [];

  // Admin-only dashboard data. Each source is fetched and isolated
  // independently so a failure here can never block Product Management,
  // which reads Firestore `packs` from props and doesn't touch any of this.
  //
  // Members: Firebase Auth's own account list (through the server), with each
  // account's plugin download count joined in.
  //
  // There used to be an "Analytics" tab above this one, fed by an
  // `analytics/global` Firestore document. It was removed: nothing writes to
  // that document any more, so it had frozen into a fossil (its per-product
  // download counters still named packs that were deleted from the store,
  // and no counter existed for any tool added since). Real traffic is
  // measured by GA4 — wired up for real in firebase.js via getAnalytics() —
  // so the honest thing is to link out to it rather than show a stale local
  // copy that looks live but isn't.
  //
  // Reports: a real, working source. The Storefront's report form writes
  // straight to the `reports` collection with addDoc (firestore.rules allows
  // `create: if true` there, and read/update/delete to any signed-in user),
  // so submissions land here. The collection reads empty simply because
  // nobody has filed a report yet — not because anything is broken.
  useEffect(() => {
    if (!user) return;

    // Members come from Firebase Auth via the admin-only /api/admin/members,
    // not the Firestore `users` collection: nothing writes that collection any
    // more, so it froze at 11 members while real sign-ups kept arriving.
    user.getIdToken()
      .then((token) => fetch(apiUrl('/api/admin/members'), { headers: { Authorization: `Bearer ${token}` } }))
      .then(async (r) => { const body = await r.json().catch(() => ({})); if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`); return body; })
      .then((body) => setUsersList(body.members || []))
      .catch((err) => setUsersError('Member list is unavailable right now: ' + err.message));

    // Problem reports are kept 12 months after they are resolved. There is no
    // scheduler, so opening the panel runs the purge (admin-only endpoint).
    user.getIdToken()
      .then((token) => fetch(apiUrl('/api/admin/reports/purge'), { method: 'POST', headers: { Authorization: `Bearer ${token}` } }))
      .catch(() => {});

    getDocs(collection(db, 'reports'))
      .then((snapshot) => {
        const fetchedReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fetchedReports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setReports(fetchedReports);
      })
      .catch((err) => setReportsError('Reports are unavailable right now: ' + err.message));
  }, [user]);

  // The 100-tester programme: applications and reports come from the
  // admin-only /api/admin/testers* routes (server.js), not from Firestore
  // directly — those collections have no client access in firestore.rules.
  const adminFetch = async (path, body) => {
    const token = await user.getIdToken();
    const r = await fetch(apiUrl(path), {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  };
  const loadPackApps = () => adminFetch('/api/admin/pack-applications')
    .then((d) => { setPackApps(d.applications || []); setPackAppsError(null); })
    .catch((err) => setPackAppsError('Pack applications are unavailable right now: ' + err.message));
  const loadTesters = () => Promise.all([adminFetch('/api/admin/testers'), adminFetch('/api/admin/testers/reports'), adminFetch('/api/admin/testers/builds'), adminFetch('/api/admin/testers/messages')])
    .then(([t, r, b, m]) => { setTesters(t); setTesterReports(r.reports || []); setBuilds(b.builds || []); setThreads(m); setTestersError(null); })
    .catch((err) => setTestersError('Testers are unavailable right now: ' + err.message));

  // The new-messages count on the Testers tab label is there from the start, not only after the tab has been opened.
  useEffect(() => {
    if (user) adminFetch('/api/admin/testers/messages').then(setThreads).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (user && activeTab === 'testers') loadTesters();
    if (user && activeTab === 'packs') loadPackApps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab]);

  // Approving records the Tester Agreement the person accepted by e-mail (version + when); the server refuses without it.
  const askAgreement = () => {
    const agreementVersion = window.prompt('Agreement version the tester accepted (for example 1.1):', '1.1');
    if (!agreementVersion) return null;
    const when = window.prompt('When did they accept it by e-mail? Date and time, for example 2026-10-14 10:30 (your local time):', new Date().toISOString().slice(0, 10) + ' 12:00');
    if (!when) return null;
    const at = new Date(when.trim().replace(' ', 'T'));
    if (Number.isNaN(at.getTime())) { alert('That date and time was not understood.'); return null; }
    return { agreementVersion: agreementVersion.trim(), acceptedAt: at.toISOString() };
  };
  const decideTester = async (email, decision) => {
    let extra = {};
    if (decision === 'approve') { extra = askAgreement(); if (!extra) return; }
    if (decision === 'end' && !window.confirm(`End testing for ${email}? Credits, new builds and reports stop; released products and what they own stay.`)) return;
    if (decision === 'revoke' && !window.confirm(`Revoke ${email}? All access is withdrawn, including products they own, and the seat is freed.`)) return;
    setTesterBusy(email);
    try {
      await adminFetch('/api/admin/testers/decide', { email, decision, ...extra });
      await loadTesters();
    } catch (err) {
      alert(err.message);
    } finally {
      setTesterBusy('');
    }
  };

  const emptyBuild = { id: '', slug: '', name: '', version: '', platform: 'mac', objectPath: '', notes: '', assignedTo: '', manuals: [], tasks: [], brief: { goal: '', reference: '', strengths: '', knownIssues: '', focus: '' }, licenceProduct: '' };
  // The form edits manuals as {title, value, isUrl} and tasks as {id, title, detail} (the id is kept so saved results stay attached).
  const buildToForm = (b) => ({ ...b, assignedTo: (b.assignedTo || []).join('\n'), manuals: (b.manuals || []).map((m) => ({ title: m.title, value: m.url || m.objectPath, isUrl: Boolean(m.url), size: m.size, sha256: m.sha256 })), tasks: b.tasks || [], brief: { goal: '', reference: '', focus: '', ...(b.brief || {}), strengths: (b.brief?.strengths || []).join('\n'), knownIssues: (b.brief?.knownIssues || []).join('\n') }, licenceProduct: b.licence?.product || '' });
  const editRows = (key, index, patch) => setBuildForm((f) => ({ ...f, [key]: f[key].map((row, i) => (i === index ? { ...row, ...patch } : row)) }));
  const dropRow = (key, index) => setBuildForm((f) => ({ ...f, [key]: f[key].filter((_, i) => i !== index) }));
  const editProfile = async (email, tester) => {
    const displayName = window.prompt(`First name or name to greet ${email} with (empty = from the e-mail):`, tester.displayName || '');
    if (displayName === null) return;
    const production = window.prompt('Studio / production name (may be empty):', tester.production || '');
    if (production === null) return;
    try { await adminFetch('/api/admin/testers/profile', { email, displayName, production }); await loadTesters(); } catch (err) { alert(err.message); }
  };
  // Uploads a file straight into the private bucket: signed URL from the server, PUT from the browser, then the server reads back
  // size (and sha256 for a manual). → {objectPath, size, sha256}
  const uploadFile = async (kind, file) => {
    setUploadMsg(`Uploading ${file.name}…`);
    try {
      const u = await adminFetch('/api/admin/testers/uploads', { kind, filename: file.name, buildId: buildForm?.id || undefined });
      const put = await fetch(u.uploadUrl, { method: 'PUT', headers: u.headers, body: file });
      if (!put.ok) throw new Error(`The upload was refused (${put.status})`);
      const info = await adminFetch('/api/admin/testers/uploads/complete', { objectPath: u.objectPath });
      setUploadMsg(`Uploaded ${file.name} (${Math.round(info.size / 1048576)} MB).`);
      return info;
    } catch (err) { setUploadMsg(err.message); return null; }
  };
  const pickInstaller = async (file) => {
    if (!file) return;
    const info = await uploadFile('installer', file);
    if (info) setBuildForm((f) => ({ ...f, objectPath: info.objectPath, size: info.size, sha256: info.sha256 || undefined }));
  };
  const pickManual = async (index, file) => {
    if (!file) return;
    const info = await uploadFile('manual', file);
    if (info) editRows('manuals', index, { value: info.objectPath, isUrl: false, size: info.size, sha256: info.sha256 || undefined, title: buildForm.manuals[index].title || file.name.replace(/\.pdf$/i, '') });
  };
  const setKey = async (email, product, status) => {
    try { await adminFetch('/api/admin/testers/keys', { email, product, status }); await loadTesters(); } catch (err) { alert(err.message); }
  };
  const unbindTester = async (email) => {
    if (!window.confirm(`Unbind ${email} from its account? The agent key is closed. A Google (or verified) account with this e-mail binds itself on its next sign-in; any other account needs Bind here.`)) return;
    try { await adminFetch('/api/admin/testers/uid', { email, clear: true }); await loadTesters(); } catch (err) { alert(err.message); }
  };
  const bindTester = async (email) => {
    if (!window.confirm(`Bind ${email} to the account that signs in with this e-mail now? Only do this when you know it is the tester's own account.`)) return;
    try { await adminFetch('/api/admin/testers/uid', { email, bind: true }); await loadTesters(); } catch (err) { alert(err.message); }
  };
  const revokeAgentKey = async (email) => {
    if (!window.confirm(`Revoke the agent key of ${email}?`)) return;
    try { await adminFetch('/api/admin/testers/agent-token/revoke', { email }); await loadTesters(); } catch (err) { alert(err.message); }
  };
  const showResults = async (id) => {
    try { const d = await adminFetch(`/api/admin/testers/builds/results?id=${encodeURIComponent(id)}`); setBuildResults((old) => ({ ...old, [id]: d.results })); } catch (err) { alert(err.message); }
  };
  const openThreadFor = async (email) => {
    try {
      const d = await adminFetch(`/api/admin/testers/messages?email=${encodeURIComponent(email)}`);
      setOpenThread({ email, messages: d.messages });
      await adminFetch('/api/admin/testers/messages/read', { email });
      setThreads(await adminFetch('/api/admin/testers/messages'));
    } catch (err) { alert(err.message); }
  };
  const sendReply = async (e) => {
    e.preventDefault();
    try {
      await adminFetch('/api/admin/testers/messages/reply', { email: openThread.email, body: replyText });
      setReplyText('');
      await openThreadFor(openThread.email);
    } catch (err) { alert(err.message); }
  };
  const saveBuild = async (e) => {
    e.preventDefault();
    setBuildBusy('save');
    try {
      await adminFetch('/api/admin/testers/builds', {
        ...buildForm, id: buildForm.id || undefined, assignedTo: buildForm.assignedTo.split(/[\s,;]+/).filter(Boolean),
        manuals: buildForm.manuals.map((m) => (m.isUrl ? { title: m.title, url: m.value } : { title: m.title, objectPath: m.value, size: m.size, sha256: m.sha256 })),
        licence: buildForm.licenceProduct ? { product: buildForm.licenceProduct } : null,
      });
      setBuildForm(null);
      await loadTesters();
    } catch (err) { alert(err.message); } finally { setBuildBusy(''); }
  };
  const releaseBuild = async (b) => {
    if (!window.confirm(`Mark ${b.name} as released? Every assigned tester then owns ${b.slug} for good (it survives End testing).`)) return;
    setBuildBusy(b.id);
    try { await adminFetch('/api/admin/testers/builds/release', { id: b.id }); await loadTesters(); } catch (err) { alert(err.message); } finally { setBuildBusy(''); }
  };

  const handleSaveProduct = async (savedProduct) => {
    await refreshProducts?.();
    setEditingProduct(null);
    setIsAdding(false);
  };

  // Both of these used to PATCH/DELETE `/api/admin/reports/:id`. This service
  // has no backend at all (server.js is a static file server), so those calls
  // always failed silently — the button appeared to do nothing. Reports live
  // in Firestore and the rules already permit a signed-in user to update and
  // delete them, so they are written directly, exactly like the submission
  // form on the Storefront does.
  const handleUpdateReportStatus = async (reportId, newStatus) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status: newStatus, resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : null });
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
    } catch (err) {
      console.error('Could not update report status', err);
      alert('Could not update this report.');
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      await deleteDoc(doc(db, 'reports', reportId));
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (err) {
      console.error('Could not delete report', err);
      alert('Could not delete this report.');
    }
  };

  return (
    <div className="container" style={{ padding: '40px 20px', margin: '0 auto' }}>
      <PageMeta title="Admin Dashboard | SubverseLab" noIndex />
      <h1 style={{ marginBottom: '30px', fontSize: '2.5rem', fontWeight: '800', color: 'var(--color-primary)' }}>Admin Dashboard</h1>
      
      <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', borderBottom: '1px solid var(--color-border)', paddingBottom: '15px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('stats')}
          className={`btn ${activeTab === 'stats' ? 'btn-primary' : 'btn-outline'}`}
        >
          Stats
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`btn ${activeTab === 'catalog' ? 'btn-primary' : 'btn-outline'}`}
        >
          Catalogue
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`btn ${activeTab === 'members' ? 'btn-primary' : 'btn-outline'}`}
        >
          Members ({usersList.filter((m) => m.hasAccount !== false).length})
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`btn ${activeTab === 'products' ? 'btn-primary' : 'btn-outline'}`}
        >
          Store items
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`btn ${activeTab === 'reports' ? 'btn-primary' : 'btn-outline'}`}
        >
          Reports ({reports.filter(r => r.status === 'open').length > 0 ? `${reports.filter(r => r.status === 'open').length} open` : reports.length})
        </button>
        <button
          onClick={() => setActiveTab('testers')}
          className={`btn ${activeTab === 'testers' ? 'btn-primary' : 'btn-outline'}`}
        >
          Testers{testers ? ` (${testers.approved} / ${testers.total})` : ''}{threads.unread > 0 ? ` · ${threads.unread} new` : ''}
        </button>
        <button
          onClick={() => setActiveTab('packs')}
          className={`btn ${activeTab === 'packs' ? 'btn-primary' : 'btn-outline'}`}
        >
          Pack applications{packApps ? ` (${packApps.length})` : ''}
        </button>
        <button
          onClick={() => setActiveTab('seo')}
          className={`btn ${activeTab === 'seo' ? 'btn-primary' : 'btn-outline'}`}
        >
          SEO
        </button>
      </div>

      {activeTab === 'stats' && <StatsTab user={user} />}
      {activeTab === 'catalog' && <CatalogTab user={user} />}

      {activeTab === 'members' && <MembersTab members={usersList} error={usersError} />}

      {activeTab === 'packs' && (
        <>
          {packAppsError && (
            <div className="glass-panel" style={{ padding: '16px', marginBottom: '16px', color: 'var(--color-text-muted)' }}>{packAppsError}</div>
          )}
          {packApps && (
            <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
              <h2 style={{ marginBottom: '16px', fontSize: '1.4rem' }}>Pack applications ({packApps.length})</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {['Name', 'Artist', 'Links', 'Makes', 'Date'].map((h) => (
                      <th key={h} style={{ padding: '12px', color: 'var(--color-text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {packApps.map((a) => (
                    <tr key={a.email} style={{ borderBottom: '1px solid var(--color-border)', verticalAlign: 'top' }}>
                      <td style={{ padding: '12px', fontWeight: '600', color: 'var(--color-accent)' }}>
                        {a.name}
                        <div style={{ fontWeight: '400', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{a.email}{a.country ? ` · ${a.country}` : ''}</div>
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.9rem' }}>{a.artist}</td>
                      <td style={{ padding: '12px', fontSize: '0.85rem', maxWidth: '280px', wordBreak: 'break-all' }}>
                        {(a.links || []).map((l) => <div key={l}><a href={l} target="_blank" rel="noopener noreferrer">{l}</a></div>)}
                        {a.storeUrl && <div style={{ color: 'var(--color-text-muted)' }}>Sells: <a href={a.storeUrl} target="_blank" rel="noopener noreferrer">{a.storeUrl}</a></div>}
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.9rem' }}>{(a.kinds || []).join(', ') || '—'}</td>
                      <td style={{ padding: '12px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-GB') : ''}</td>
                    </tr>
                  ))}
                  {packApps.length === 0 && (
                    <tr><td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>No applications yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {!packApps && !packAppsError && <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading applications…</div>}
        </>
      )}

      {activeTab === 'testers' && (
        <>
          {testersError && (
            <div className="glass-panel" style={{ padding: '16px', marginBottom: '16px', color: 'var(--color-text-muted)' }}>{testersError}</div>
          )}
          {testers && (
            <>
              <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
                <h2 style={{ margin: '0 0 12px', fontSize: '1.4rem' }}>Coverage — {testers.approved} / {testers.total} seats approved</h2>
                {[['Operating system', testers.coverage.os], ['DAW', testers.coverage.daws]].map(([label, counts]) => (
                  <p key={label} style={{ margin: '0 0 8px', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    <strong style={{ color: 'var(--color-text)' }}>{label}:</strong>{' '}
                    {Object.entries(counts).map(([name, n]) => (
                      <span key={name} style={{ marginRight: '14px', color: n === 0 ? 'var(--color-text-muted)' : 'var(--color-text)' }}>{name} <strong>{n}</strong></span>
                    ))}
                  </p>
                ))}
              </div>

              <InviteTester adminFetch={adminFetch} onDone={loadTesters} />
              <h2 style={{ marginBottom: '16px', fontSize: '1.4rem' }}>Applications ({testers.applications.length})</h2>
              <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto', marginBottom: '32px' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '1000px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      {['Applicant', 'System', 'DAWs', 'Years', 'Link', 'Bug answer', 'Agreement', 'Status'].map((h) => (
                        <th key={h} style={{ padding: '12px', color: 'var(--color-text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {testers.applications.map((a) => (
                      <tr key={a.email} style={{ borderBottom: '1px solid var(--color-border)', verticalAlign: 'top' }}>
                        <td style={{ padding: '12px', fontWeight: '600', color: 'var(--color-accent)' }}>
                          {a.email}
                          <div style={{ fontWeight: '400', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{a.at ? new Date(a.at).toLocaleDateString('en-GB') : ''}</div>
                        </td>
                        <td style={{ padding: '12px', fontSize: '0.9rem' }}>{a.os}<div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{a.osVersion} · {(a.formats || []).join(', ')}</div></td>
                        <td style={{ padding: '12px', fontSize: '0.9rem' }}>{(a.daws || []).map((d) => (d === 'Other' && a.dawOther ? `Other: ${a.dawOther}` : d)).join(', ')}</td>
                        <td style={{ padding: '12px', fontSize: '0.9rem' }}>{a.years}</td>
                        <td style={{ padding: '12px', fontSize: '0.85rem', maxWidth: '180px', wordBreak: 'break-all' }}>
                          {a.link ? <a href={a.link} target="_blank" rel="noopener noreferrer">{a.link}</a> : '—'}
                        </td>
                        <td style={{ padding: '12px', fontSize: '0.85rem', maxWidth: '340px', whiteSpace: 'pre-wrap', color: 'var(--color-text-muted)' }}>{a.answer}{a.heard && <div style={{ marginTop: '6px', fontStyle: 'italic' }}>Heard via: {a.heard}</div>}</td>
                        <td style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                          {a.tester?.agreementVersion
                            ? <>v{a.tester.agreementVersion}<div>{a.tester.agreementAcceptedAt ? new Date(a.tester.agreementAcceptedAt).toLocaleString('en-GB') : ''}</div><div>via {a.tester.agreementVia || 'e-mail'}</div></>
                            : (a.tester ? 'not recorded' : '—')}
                          {a.tester && <div style={{ marginBottom: '6px' }}>Greeting: <strong style={{ color: 'var(--color-text)' }}>{a.tester.displayName || '(from e-mail)'}</strong>{a.tester.production ? ` · ${a.tester.production}` : ''} <button type="button" className="btn btn-outline" style={{ fontSize: '0.7rem', padding: '2px 8px' }} onClick={() => editProfile(a.email, a.tester)}>Edit</button></div>}
                          {a.tester && <div style={{ marginBottom: '6px' }}>Account: {a.tester.bound ? <>bound <button type="button" className="btn btn-outline" style={{ fontSize: '0.7rem', padding: '2px 8px' }} onClick={() => unbindTester(a.email)}>Unbind</button></> : <>not bound (a Google or verified account binds itself) <button type="button" className="btn btn-outline" style={{ fontSize: '0.7rem', padding: '2px 8px' }} onClick={() => bindTester(a.email)}>Bind</button></>}</div>}
                          {a.tester && <div style={{ marginBottom: '6px' }}>Agent key: {a.tester.agentToken ? <>yes{a.tester.agentToken.lastUsedAt ? `, last used ${new Date(a.tester.agentToken.lastUsedAt).toLocaleDateString('en-GB')}` : ', unused'} <button type="button" className="btn btn-outline" style={{ fontSize: '0.7rem', padding: '2px 8px' }} onClick={() => revokeAgentKey(a.email)}>Revoke</button></> : 'none'}</div>}
                          {a.tester && Object.keys(a.tester.owned || {}).length > 0 && <div style={{ marginTop: '6px' }}>Owns: {Object.entries(a.tester.owned).map(([slug, day]) => `${slug} (${day})`).join(', ')}</div>}
                        </td>
                        <td style={{ padding: '12px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          <div style={{ marginBottom: '8px', color: a.status === 'approved' ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>{a.tester ? a.tester.status : a.status}</div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {(!a.tester || a.tester.status !== 'active') && <button className="btn btn-primary" style={{ fontSize: '0.8rem' }} disabled={testerBusy === a.email} onClick={() => decideTester(a.email, 'approve')}>{a.tester ? 'Re-open' : 'Approve'}</button>}
                            {a.tester?.status === 'active' && <button className="btn btn-outline" style={{ fontSize: '0.8rem' }} disabled={testerBusy === a.email} onClick={() => decideTester(a.email, 'end')}>End testing</button>}
                            {a.tester && a.tester.status !== 'revoked' && <button className="btn btn-outline" style={{ fontSize: '0.8rem' }} disabled={testerBusy === a.email} onClick={() => decideTester(a.email, 'revoke')}>Revoke</button>}
                            {!a.tester && a.status !== 'declined' && <button className="btn btn-outline" style={{ fontSize: '0.8rem' }} disabled={testerBusy === a.email} onClick={() => decideTester(a.email, 'decline')}>Decline</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {testers.applications.length === 0 && (
                      <tr><td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>No applications yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <h2 style={{ marginBottom: '16px', fontSize: '1.4rem' }}>Test builds ({builds.length})</h2>
              <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
                {builds.map((b) => (
                  <div key={b.id} className="glass-panel" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                      <div>
                        <strong>{b.name}</strong> · {b.slug} v{b.version} · {b.platform === 'mac' ? 'macOS' : 'Windows'} · {b.releasedAt ? `released ${new Date(b.releasedAt).toLocaleDateString('en-GB')}` : 'not released'}
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', wordBreak: 'break-all' }}>{b.objectPath}</div>
                        <div style={{ fontSize: '0.85rem', marginTop: '6px', color: 'var(--color-text-muted)' }}>Assigned to {(b.assignedTo || []).length}: {(b.assignedTo || []).join(', ') || '—'}</div>
                        {b.notes && <div style={{ fontSize: '0.85rem', marginTop: '6px', whiteSpace: 'pre-wrap' }}>{b.notes}</div>}
                        <div style={{ fontSize: '0.85rem', marginTop: '6px', color: 'var(--color-text-muted)' }}>{(b.manuals || []).length} manuals · {(b.tasks || []).length} tasks{b.licence ? ` · licence: ${b.licence.product.toUpperCase()}` : ''}</div>
                        {(b.keys || []).map((k) => (
                          <div key={k.email} style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                            {k.email} · <code>{k.key}</code> · {k.status}{' '}
                            <button type="button" className="btn btn-outline" style={{ fontSize: '0.7rem', padding: '2px 8px' }} onClick={() => setKey(k.email, b.licence.product, k.status === 'active' ? 'disabled' : 'active')}>{k.status === 'active' ? 'Disable key' : 'Enable key'}</button>
                          </div>
                        ))}
                        {buildResults[b.id] && (
                          <div style={{ marginTop: '10px', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                            <strong>Results ({buildResults[b.id].length})</strong>
                            {buildResults[b.id].length === 0 && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Nobody has saved results yet.</div>}
                            {buildResults[b.id].map((r) => (
                              <div key={r.email} style={{ fontSize: '0.85rem', marginTop: '8px' }}>
                                <strong>{r.email}</strong> · {r.updatedAt ? new Date(r.updatedAt).toLocaleString('en-GB') : ''}
                                {(b.tasks || []).map((t) => (r.tasks?.[t.id] ? <div key={t.id}>{t.title}: <em>{r.tasks[t.id].status}</em>{r.tasks[t.id].note ? ` — ${r.tasks[t.id].note}` : ''}</div> : null))}
                                {r.summary && <div style={{ whiteSpace: 'pre-wrap', marginTop: '4px' }}>{r.summary}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <button className="btn btn-outline" style={{ fontSize: '0.8rem' }} onClick={() => setBuildForm(buildToForm(b))}>Edit</button>
                        <button className="btn btn-outline" style={{ fontSize: '0.8rem' }} onClick={() => showResults(b.id)}>Results</button>
                        {!b.releasedAt && <button className="btn btn-primary" style={{ fontSize: '0.8rem' }} disabled={buildBusy === b.id} onClick={() => releaseBuild(b)}>Mark released</button>}
                      </div>
                    </div>
                  </div>
                ))}
                {builds.length === 0 && <div className="glass-panel" style={{ padding: '20px', color: 'var(--color-text-muted)' }}>No test builds yet.</div>}
              </div>
              {!buildForm && <p style={{ marginBottom: '32px' }}><button className="btn btn-primary" onClick={() => setBuildForm(emptyBuild)}>Add a test build</button></p>}
              {buildForm && (
                <form onSubmit={saveBuild} className="glass-panel" style={{ padding: '20px', marginBottom: '32px', display: 'grid', gap: '12px' }}>
                  <h3 style={{ margin: 0 }}>{buildForm.id ? 'Edit test build' : 'New test build'}</h3>
                  {[['slug', 'Product slug (for example koro)'], ['name', 'Name shown to the tester'], ['version', 'Version'], ['objectPath', 'Installer: pick a file below, or type its path in the downloads bucket']].map(([key, label]) => (
                    <label key={key} style={{ display: 'grid', gap: '4px', fontSize: '0.9rem' }}>{label}
                      <input className="input-field" value={buildForm[key]} required onChange={(e) => setBuildForm({ ...buildForm, [key]: e.target.value })} />
                    </label>
                  ))}
                  <label style={{ display: 'grid', gap: '4px', fontSize: '0.9rem' }}>Upload the installer (.pkg, .zip or .dmg, up to 1.5 GB)
                    <input type="file" accept=".pkg,.zip,.dmg" onChange={(e) => pickInstaller(e.target.files[0])} />
                  </label>
                  {buildForm.size ? <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Installer: {Math.round(buildForm.size / 1048576)} MB{buildForm.sha256 ? ` · sha256 ${buildForm.sha256.slice(0, 12)}…` : ''}</div> : null}
                  {uploadMsg && <div role="status" style={{ fontSize: '0.85rem' }}>{uploadMsg}</div>}
                  <label style={{ display: 'grid', gap: '4px', fontSize: '0.9rem' }}>Platform
                    <select className="input-field" value={buildForm.platform} onChange={(e) => setBuildForm({ ...buildForm, platform: e.target.value })}>
                      <option value="mac">macOS</option>
                      <option value="win">Windows</option>
                    </select>
                  </label>
                  <label style={{ display: 'grid', gap: '4px', fontSize: '0.9rem' }}>Licence key for this build
                    <select className="input-field" value={buildForm.licenceProduct} onChange={(e) => setBuildForm({ ...buildForm, licenceProduct: e.target.value })}>
                      <option value="">None</option>
                      <option value="seda">SEDA</option>
                      <option value="adalet">ADALET</option>
                    </select>
                  </label>
                  {[['goal', 'What this plug-in is for'], ['reference', 'Reference (devices, sound)'], ['strengths', 'What already works well (one line per item)'], ['knownIssues', 'What we know is not right yet (one line per item)'], ['focus', 'What we want to learn from the tester']].map(([key, label]) => (
                    <label key={key} style={{ display: 'grid', gap: '4px', fontSize: '0.9rem' }}>{label}
                      <textarea className="input-field" rows={3} value={buildForm.brief[key]} onChange={(e) => setBuildForm({ ...buildForm, brief: { ...buildForm.brief, [key]: e.target.value } })} />
                    </label>
                  ))}
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <strong style={{ fontSize: '0.9rem' }}>Manuals (a file in the downloads bucket, or an https link)</strong>
                    {buildForm.manuals.map((m, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <input className="input-field" style={{ flex: '1 1 140px' }} placeholder="Title" value={m.title} onChange={(e) => editRows('manuals', i, { title: e.target.value })} />
                        <input className="input-field" style={{ flex: '2 1 240px' }} placeholder={m.isUrl ? 'https://…' : 'testbuilds/koro/0.9.1/Koro-manual.pdf'} value={m.value} onChange={(e) => editRows('manuals', i, { value: e.target.value })} />
                        {!m.isUrl && <input type="file" accept=".pdf" aria-label="Upload the manual (PDF, up to 50 MB)" onChange={(e) => pickManual(i, e.target.files[0])} />}
                        <label style={{ fontSize: '0.85rem' }}><input type="checkbox" checked={m.isUrl} onChange={(e) => editRows('manuals', i, { isUrl: e.target.checked })} /> link</label>
                        <button type="button" className="btn btn-outline" style={{ fontSize: '0.8rem' }} onClick={() => dropRow('manuals', i)}>Remove</button>
                      </div>
                    ))}
                    <div><button type="button" className="btn btn-outline" style={{ fontSize: '0.8rem' }} onClick={() => setBuildForm({ ...buildForm, manuals: [...buildForm.manuals, { title: '', value: '', isUrl: false }] })}>Add a manual</button></div>
                  </div>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <strong style={{ fontSize: '0.9rem' }}>Tasks (what we ask the tester to try before release)</strong>
                    {buildForm.tasks.map((t, i) => (
                      <div key={t.id || i} style={{ display: 'grid', gap: '6px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                        <input className="input-field" placeholder="Task title" value={t.title} onChange={(e) => editRows('tasks', i, { title: e.target.value })} />
                        <textarea className="input-field" rows={2} placeholder="Detail (optional)" value={t.detail || ''} onChange={(e) => editRows('tasks', i, { detail: e.target.value })} />
                        <div><button type="button" className="btn btn-outline" style={{ fontSize: '0.8rem' }} onClick={() => dropRow('tasks', i)}>Remove task</button></div>
                      </div>
                    ))}
                    <div><button type="button" className="btn btn-outline" style={{ fontSize: '0.8rem' }} onClick={() => setBuildForm({ ...buildForm, tasks: [...buildForm.tasks, { title: '', detail: '' }] })}>Add a task</button></div>
                  </div>
                  <label style={{ display: 'grid', gap: '4px', fontSize: '0.9rem' }}>Notes for the tester
                    <textarea className="input-field" rows={3} value={buildForm.notes} onChange={(e) => setBuildForm({ ...buildForm, notes: e.target.value })} />
                  </label>
                  <label style={{ display: 'grid', gap: '4px', fontSize: '0.9rem' }}>Assigned testers (e-mail addresses, one per line)
                    <textarea className="input-field" rows={4} value={buildForm.assignedTo} onChange={(e) => setBuildForm({ ...buildForm, assignedTo: e.target.value })} />
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" className="btn btn-primary" disabled={buildBusy === 'save'}>{buildBusy === 'save' ? 'Saving…' : 'Save build'}</button>
                    <button type="button" className="btn btn-outline" onClick={() => setBuildForm(null)}>Cancel</button>
                  </div>
                </form>
              )}

              <h2 style={{ marginBottom: '16px', fontSize: '1.4rem' }}>Tester messages{threads.unread > 0 ? ` (${threads.unread} new)` : ''}</h2>
              <div className="glass-panel" style={{ padding: '16px', marginBottom: '32px' }}>
                {threads.threads.length === 0 && <div style={{ color: 'var(--color-text-muted)' }}>No messages yet.</div>}
                {threads.threads.map((t) => (
                  <div key={t.email} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <div><strong>{t.email}</strong>{t.unread > 0 && <span style={{ marginLeft: '8px', color: 'var(--color-accent)' }}>{t.unread} new</span>}
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{t.last.from === 'staff' ? 'You: ' : ''}{t.last.body}</div></div>
                    <button className="btn btn-outline" style={{ fontSize: '0.8rem' }} onClick={() => openThreadFor(t.email)}>Open</button>
                  </div>
                ))}
                {openThread && (
                  <div style={{ marginTop: '16px' }}>
                    <h3 style={{ margin: '0 0 8px' }}>{openThread.email}</h3>
                    {openThread.messages.map((m) => (
                      <div key={m.id} style={{ margin: '6px 0', padding: '8px 12px', borderRadius: '8px', background: m.from === 'staff' ? 'rgba(197,160,89,0.16)' : 'var(--color-surface-2)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{m.from === 'staff' ? 'SubverseLab' : 'Tester'}{m.kind === 'panel' ? ' · panel request' : ''} · {new Date(m.at).toLocaleString('en-GB')}</div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
                      </div>
                    ))}
                    <form onSubmit={sendReply} style={{ display: 'grid', gap: '8px', marginTop: '10px' }}>
                      <textarea className="input-field" rows={3} required placeholder="Reply (shown in the tester's panel, not e-mailed)" value={replyText} onChange={(e) => setReplyText(e.target.value)} />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="submit" className="btn btn-primary">Reply</button>
                        <button type="button" className="btn btn-outline" onClick={() => setOpenThread(null)}>Close</button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              <h2 style={{ marginBottom: '16px', fontSize: '1.4rem' }}>Tester reports ({testerReports.length})</h2>
              <div style={{ display: 'grid', gap: '12px' }}>
                {testerReports.map((r) => (
                  <div key={r.id} className="glass-panel" style={{ padding: '16px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                      <strong style={{ color: 'var(--color-text)' }}>{r.plugin || 'idea'}</strong> · {r.kind}{r.os ? ` · ${r.os}` : ''}{r.daw ? ` · ${r.daw}${r.dawVersion ? ` ${r.dawVersion}` : ''}` : ''} · {r.email} · {r.at ? new Date(r.at).toLocaleString('en-GB') : ''}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{r.text}</div>
                  </div>
                ))}
                {testerReports.length === 0 && <div className="glass-panel" style={{ padding: '20px', color: 'var(--color-text-muted)' }}>No reports yet.</div>}
              </div>
            </>
          )}
          {!testers && !testersError && <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading testers…</div>}
        </>
      )}

      {activeTab === 'products' && packsLoading && (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Loading products…
        </div>
      )}

      {activeTab === 'products' && !packsLoading && (
        <div>
          {isAdding || editingProduct ? (
            <ProductForm 
              product={editingProduct} 
              onSave={handleSaveProduct} 
              onCancel={() => { setIsAdding(false); setEditingProduct(null); }} 
            />
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: 'var(--color-text)' }}>Product Catalog</h2>
                <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
                  + Add New Product
                </button>
              </div>
              
              <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <th style={{ padding: '12px', color: 'var(--color-text-muted)' }}>ID</th>
                      <th style={{ padding: '12px', color: 'var(--color-text-muted)' }}>Title</th>
                      <th style={{ padding: '12px', color: 'var(--color-text-muted)' }}>Category</th>
                      <th style={{ padding: '12px', color: 'var(--color-text-muted)' }}>Links / URLs</th>
                      <th style={{ padding: '12px', color: 'var(--color-text-muted)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '12px', color: 'var(--color-accent)' }}>{p.id}</td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {p.image ? (
                              <img src={p.image} alt={p.title} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                            ) : (
                              <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--color-surface)', borderRadius: '4px', border: '1px solid var(--color-border)' }}></div>
                            )}
                            <span style={{ fontWeight: '500' }}>{p.title}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px', color: 'var(--color-text)' }}>{categoryLabel(p)}</td>
                        <td style={{ padding: '12px', fontSize: '0.85rem', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.externalUrl && (
                            <div style={{ marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              <span style={{ color: 'var(--color-text-muted)' }}>App: </span>
                              <a href={p.externalUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>{p.externalUrl}</a>
                            </div>
                          )}
                          {p.fileUrl && (
                            <div style={{ marginBottom: '4px' }}>
                              <span style={{ color: 'var(--color-text-muted)' }}>File: </span>
                              <a href={p.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>Download Link</a>
                            </div>
                          )}
                          {p.fileUrlMac && (
                            <div style={{ marginBottom: '4px' }}>
                              <span style={{ color: 'var(--color-text-muted)' }}>Mac: </span>
                              <a href={p.fileUrlMac} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>Download Link</a>
                            </div>
                          )}
                          {p.fileUrlWin && (
                            <div>
                              <span style={{ color: 'var(--color-text-muted)' }}>Win: </span>
                              <a href={p.fileUrlWin} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>Download Link</a>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                          {/* No Delete button: /products is read-only to the
                              client SDK (firestore.rules) and no delete
                              endpoint exists on metadata-sync-service, which
                              only exposes the two sync routes. The button that
                              used to sit here called a route that was never
                              implemented and failed on every click. Removing a
                              product is done through the sync pipeline. */}
                          <button onClick={() => setEditingProduct(p)} style={{ background: 'transparent', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>Edit</button>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>No products found. Add one above.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <div>
          <h2 style={{ marginBottom: '20px', fontSize: '1.8rem', color: 'var(--color-text)' }}>Broken Links & User Reports</h2>
          {reportsError && (
            <div className="glass-panel" style={{ padding: '16px', marginBottom: '16px', color: 'var(--color-text-muted)' }}>{reportsError}</div>
          )}
          <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px', color: 'var(--color-text-muted)' }}>Date</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-muted)' }}>Product / Source</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-muted)' }}>OS</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-muted)' }}>User Email</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-muted)' }}>Issue Description</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-muted)' }}>Status</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-muted)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {new Date(r.createdAt).toLocaleString('tr-TR')}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--color-accent)' }}>{r.productTitle}</td>
                    <td style={{ padding: '12px', textTransform: 'capitalize', fontWeight: 'bold' }}>{r.os || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>{r.userEmail}</td>
                    <td style={{ padding: '12px', maxWidth: '250px', wordBreak: 'break-word' }}>{r.description}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '0.8rem', 
                        fontWeight: 'bold',
                        backgroundColor: 'var(--tint-soft)',
                        color: r.status === 'open' ? 'var(--color-danger)' : 'var(--color-accent)',
                        border: `1px solid ${r.status === 'open' ? 'var(--color-danger)' : 'var(--color-accent)'}`
                      }}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                      {r.status === 'open' ? (
                        <button 
                          onClick={() => handleUpdateReportStatus(r.id, 'resolved')}
                          style={{ marginRight: '8px', background: 'var(--color-primary)', border: 'none', color: 'var(--color-on-primary)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          Mark Resolved
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleUpdateReportStatus(r.id, 'open')}
                          style={{ marginRight: '8px', background: 'transparent', border: '1px solid var(--color-text-muted)', color: 'var(--color-text)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          Reopen
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteReport(r.id)}
                        style={{ background: 'transparent', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>No user reports found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeTab === 'seo' && (
        <SEOAdminTab packs={products} />
      )}
    </div>
  );
}
