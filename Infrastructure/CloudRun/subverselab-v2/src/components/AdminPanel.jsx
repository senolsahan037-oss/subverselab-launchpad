import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ProductForm from './ProductForm';
import SEOAdminTab from './admin/SEOAdminTab';
import PageMeta from './PageMeta';

// Same normalization the Storefront uses: `category`/`displayCategory` are
// optional UI-only fields that synced tools never set, so falling back to
// the always-present `content_type` (and turning its raw `ai_tool` enum into
// "Ai Tool") is what keeps this column from being blank for most products.
const categoryLabel = (p) => {
  const raw = (p.displayCategory || p.category || p.content_type || '').replace(/_/g, ' ').trim();
  return raw.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());
};

export default function AdminPanel({ user, packs, packsLoading, refreshProducts }) {
  const [activeTab, setActiveTab] = useState('members');
  const [usersList, setUsersList] = useState([]);
  const [usersError, setUsersError] = useState(null);
  const [launchStats, setLaunchStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [reportsError, setReportsError] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [testers, setTesters] = useState(null);
  const [testerReports, setTesterReports] = useState([]);
  const [testersError, setTestersError] = useState(null);
  const [testerBusy, setTesterBusy] = useState('');

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
      .then((token) => fetch('/api/admin/members', { headers: { Authorization: `Bearer ${token}` } }))
      .then(async (r) => { const body = await r.json().catch(() => ({})); if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`); return body; })
      .then((body) => { setUsersList(body.members || []); setLaunchStats(body.launch || null); })
      .catch((err) => setUsersError('Member list is unavailable right now: ' + err.message));

    getDocs(collection(db, 'reports'))
      .then((snapshot) => {
        const fetchedReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fetchedReports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setReports(fetchedReports);
      })
      .catch((err) => setReportsError('Reports are unavailable right now: ' + err.message));
  }, [user]);

  // Everything below is derived from the live `users` documents only —
  // no counter is stored anywhere, so these can never drift out of date the
  // way the old analytics document did.
  const memberStats = useMemo(() => {
    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    // A sign-in recorded within a few minutes of account creation is the
    // sign-up itself, not a return visit — worth separating, since "signed
    // up once and never came back" is the number that actually matters.
    const RETURN_THRESHOLD = 5 * 60 * 1000;

    let newLast30 = 0;
    let activeLast30 = 0;
    let neverReturned = 0;
    let latestSignup = null;

    for (const u of usersList) {
      const created = u.createdAt ? new Date(u.createdAt).getTime() : NaN;
      const lastSeen = u.lastSignInAt ? new Date(u.lastSignInAt).getTime() : NaN;

      if (!Number.isNaN(created)) {
        if (now - created <= THIRTY_DAYS) newLast30++;
        if (latestSignup === null || created > latestSignup) latestSignup = created;
      }
      if (!Number.isNaN(lastSeen) && now - lastSeen <= THIRTY_DAYS) activeLast30++;
      if (!Number.isNaN(created) && !Number.isNaN(lastSeen) && lastSeen - created <= RETURN_THRESHOLD) {
        neverReturned++;
      }
    }

    const daysSinceSignup = latestSignup === null
      ? null
      : Math.floor((now - latestSignup) / (24 * 60 * 60 * 1000));

    return { total: usersList.length, newLast30, activeLast30, neverReturned, daysSinceSignup };
  }, [usersList]);

  const sortedMembers = useMemo(
    () => [...usersList].sort((a, b) => new Date(b.lastSignInAt || 0) - new Date(a.lastSignInAt || 0)),
    [usersList]
  );

  // The 100-tester programme: applications and reports come from the
  // admin-only /api/admin/testers* routes (server.js), not from Firestore
  // directly — those collections have no client access in firestore.rules.
  const adminFetch = async (path, body) => {
    const token = await user.getIdToken();
    const r = await fetch(path, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  };
  const loadTesters = () => Promise.all([adminFetch('/api/admin/testers'), adminFetch('/api/admin/testers/reports')])
    .then(([t, r]) => { setTesters(t); setTesterReports(r.reports || []); setTestersError(null); })
    .catch((err) => setTestersError('Testers are unavailable right now: ' + err.message));

  useEffect(() => {
    if (user && activeTab === 'testers') loadTesters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab]);

  const decideTester = async (email, decision) => {
    setTesterBusy(email);
    try {
      await adminFetch('/api/admin/testers/decide', { email, decision });
      await loadTesters();
    } catch (err) {
      alert(err.message);
    } finally {
      setTesterBusy('');
    }
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
      await updateDoc(doc(db, 'reports', reportId), { status: newStatus });
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
    <div className="container" style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      <PageMeta title="Admin Dashboard | SubverseLab" noIndex />
      <h1 style={{ marginBottom: '30px', fontSize: '2.5rem', fontWeight: '800', color: 'var(--color-primary)' }}>Admin Dashboard</h1>
      
      <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', borderBottom: '1px solid var(--color-border)', paddingBottom: '15px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('members')}
          className={`btn ${activeTab === 'members' ? 'btn-primary' : 'btn-outline'}`}
        >
          Members ({usersList.length})
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`btn ${activeTab === 'products' ? 'btn-primary' : 'btn-outline'}`}
        >
          Products Management
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`btn ${activeTab === 'reports' ? 'btn-primary' : 'btn-outline'}`}
        >
          Reports & Broken Links ({reports.filter(r => r.status === 'open').length > 0 ? `${reports.filter(r => r.status === 'open').length} open` : reports.length})
        </button>
        <button
          onClick={() => setActiveTab('testers')}
          className={`btn ${activeTab === 'testers' ? 'btn-primary' : 'btn-outline'}`}
        >
          Testers{testers ? ` (${testers.approved} / ${testers.total})` : ''}
        </button>
        <button
          onClick={() => setActiveTab('seo')}
          className={`btn ${activeTab === 'seo' ? 'btn-primary' : 'btn-outline'}`}
        >
          SEO Content
        </button>
      </div>

      {activeTab === 'members' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
              <h3 style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: '10px' }}>Total Members</h3>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{memberStats.total}</div>
            </div>
            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
              <h3 style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: '10px' }}>New (Last 30 Days)</h3>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--color-accent)' }}>{memberStats.newLast30}</div>
            </div>
            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
              <h3 style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: '10px' }}>Signed In (Last 30 Days)</h3>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#ffb347' }}>{memberStats.activeLast30}</div>
            </div>
            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
              <h3 style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: '10px' }}>Signed Up, Never Returned</h3>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--color-danger)' }}>{memberStats.neverReturned}</div>
            </div>
          </div>

          {launchStats && (
            <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Launch: <strong style={{ color: 'var(--color-text)' }}>{launchStats.claimed ?? 0} / 1,000</strong> producers claimed · <strong style={{ color: 'var(--color-text)' }}>{launchStats.downloads ?? 0}</strong> plugin downloads in total.
            </div>
          )}

          {memberStats.daysSinceSignup !== null && (
            <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Most recent sign-up was <strong style={{ color: 'var(--color-text)' }}>{memberStats.daysSinceSignup} day{memberStats.daysSinceSignup === 1 ? '' : 's'} ago</strong>.
            </div>
          )}

          {/* Sign-ups are only the slice of the audience that chose to create
              an account — most visitors use the free tools without ever
              signing in, so this page deliberately does not pretend to be a
              traffic report. GA4 is the real one. */}
          <div className="glass-panel" style={{ padding: '20px', marginBottom: '32px' }}>
            <h3 style={{ marginBottom: '8px', fontSize: '1.05rem' }}>Looking for traffic numbers?</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0 0 14px', lineHeight: '1.6' }}>
              These cards count registered members only. Most visitors use the free tools without ever signing in, so they never appear here. Visits, sessions, countries and page views are measured by Google Analytics.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <a className="btn btn-outline" style={{ fontSize: '0.85rem' }} href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">Google Analytics</a>
              <a className="btn btn-outline" style={{ fontSize: '0.85rem' }} href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">Search Console</a>
            </div>
          </div>

          <h2 style={{ marginBottom: '20px', fontSize: '1.8rem', color: 'var(--color-text)' }}>All Members ({usersList.length})</h2>
          {usersError && (
            <div className="glass-panel" style={{ padding: '16px', marginBottom: '16px', color: 'var(--color-text-muted)' }}>{usersError}</div>
          )}
          <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px', color: 'var(--color-text-muted)' }}>Email</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-muted)' }}>Display Name</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-muted)' }}>Joined</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-muted)' }}>Last Sign In</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-muted)' }}>Returned?</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-muted)' }}>Sign-in</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-muted)' }}>Downloads</th>
                </tr>
              </thead>
              <tbody>
                {sortedMembers.map(u => {
                  const created = u.createdAt ? new Date(u.createdAt).getTime() : NaN;
                  const lastSeen = u.lastSignInAt ? new Date(u.lastSignInAt).getTime() : NaN;
                  const returned = !Number.isNaN(created) && !Number.isNaN(lastSeen)
                    && lastSeen - created > 5 * 60 * 1000;
                  return (
                    <tr key={u.uid} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px', color: 'var(--color-accent)', fontWeight: '600' }}>{u.email}</td>
                      <td style={{ padding: '12px' }}>{u.displayName}</td>
                      <td style={{ padding: '12px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('tr-TR') : 'N/A'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                        {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleString('tr-TR') : 'N/A'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.85rem', color: returned ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                        {returned ? 'Yes' : 'Sign-up only'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{u.provider === 'google.com' ? 'Google' : u.provider === 'password' ? 'E-mail' : u.provider}</td>
                      <td style={{ padding: '12px', fontSize: '0.9rem' }}>{u.downloads || 0}</td>
                    </tr>
                  );
                })}
                {usersList.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>No registered members found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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

              <h2 style={{ marginBottom: '16px', fontSize: '1.4rem' }}>Applications ({testers.applications.length})</h2>
              <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto', marginBottom: '32px' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '900px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      {['Applicant', 'System', 'DAWs', 'Years', 'Link', 'Bug answer', 'Status'].map((h) => (
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
                        <td style={{ padding: '12px', fontSize: '0.85rem', maxWidth: '340px', whiteSpace: 'pre-wrap', color: 'var(--color-text-muted)' }}>{a.answer}</td>
                        <td style={{ padding: '12px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          <div style={{ marginBottom: '8px', color: a.status === 'approved' ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>{a.status}</div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {a.status !== 'approved' && <button className="btn btn-primary" style={{ fontSize: '0.8rem' }} disabled={testerBusy === a.email} onClick={() => decideTester(a.email, 'approve')}>Approve</button>}
                            {a.status !== 'declined' && <button className="btn btn-outline" style={{ fontSize: '0.8rem' }} disabled={testerBusy === a.email} onClick={() => decideTester(a.email, 'decline')}>Decline</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {testers.applications.length === 0 && (
                      <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>No applications yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <h2 style={{ marginBottom: '16px', fontSize: '1.4rem' }}>Tester reports ({testerReports.length})</h2>
              <div style={{ display: 'grid', gap: '12px' }}>
                {testerReports.map((r) => (
                  <div key={r.id} className="glass-panel" style={{ padding: '16px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                      <strong style={{ color: 'var(--color-text)' }}>{r.plugin}</strong> · {r.kind} · {r.os} · {r.daw}{r.dawVersion ? ` ${r.dawVersion}` : ''} · {r.email} · {r.at ? new Date(r.at).toLocaleString('en-GB') : ''}
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
                        backgroundColor: r.status === 'open' ? 'rgba(139, 0, 0, 0.2)' : 'rgba(0, 95, 86, 0.2)',
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
                          style={{ marginRight: '8px', background: 'var(--color-accent)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
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
