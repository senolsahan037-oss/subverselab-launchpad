import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ProductActions from './ProductActions';
import PageMeta from './PageMeta';
import DownloadButtons from './DownloadButtons';
import DownloadRoomReport from './DownloadRoomReport';
import {
  PLUGINS, LAUNCH2_PLUGINS,
} from '../data/plugins';

// The account page: the signed-in producer's Download Room.
//
// "My plugins" reads plugin_licenses/{lowercased e-mail}, which only server.js
// writes: from signed Lemon Squeezy webhooks (order_created,
// license_key_created, license_key_updated), and from a free launch-licence
// claim on /launch (launchLicence.js; those entries carry source "launch" and
// product "bundle", so they list under both plugins). Downloads need only a
// signed-in account; e-mail verification is deliberately not required
// (owner decision, 2026-09-30).
//
// The downloads block replaces the old "Library" concept — collecting free
// packs via /api/library and /api/purchases, which were never served. Asking
// each product whether it has a download action is correct now and correct if
// one ever ships again.

// Licence keys from paid orders: GET /api/purchases/licenses returns only this
// signed-in account's keys. Nothing is shown when there are none.
function LicenceKeys({ user }) {
  const [licenses, setLicenses] = useState([]);
  const [copied, setCopied] = useState('');
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = await user.getIdToken();
        const r = await fetch('/api/purchases/licenses', { headers: { Authorization: `Bearer ${token}` } });
        const body = await r.json().catch(() => ({}));
        if (alive && r.ok && Array.isArray(body.licenses)) setLicenses(body.licenses);
      } catch { /* no keys shown */ }
    })();
    return () => { alive = false; };
  }, [user]);
  if (licenses.length === 0) return null;
  const copy = async (l) => {
    try { await navigator.clipboard.writeText(l.key); setCopied(l.id); setTimeout(() => setCopied(''), 2000); } catch { setCopied(''); }
  };
  const nameOf = (l) => l.productName || [...PLUGINS, ...LAUNCH2_PLUGINS].find((p) => p.slug === l.product)?.name || (l.product === 'bundle' ? 'Kubbe + Kaset bundle' : 'Plugin');
  return (
    <div className="acct-help" style={{ marginBottom: '20px' }}>
      <h4>Your licence keys</h4>
      {licenses.map((l) => (
        <p key={l.id || l.key} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <strong>{nameOf(l)}</strong>
          <code style={{ wordBreak: 'break-all' }}>{l.key}</code>
          <button type="button" className="btn btn-outline acct-small-btn" onClick={() => copy(l)}>
            {copied === l.id ? 'Copied' : 'Copy'}
          </button>
        </p>
      ))}
    </div>
  );
}

function MyPlugins({ user }) {
  return (
    <div>
      <LicenceKeys user={user} />
      <div className="acct-plugin-list">
        {[...PLUGINS, ...LAUNCH2_PLUGINS].map((plugin) => (
          <article key={plugin.slug} className="acct-plugin">
            <img src={plugin.cardImage} alt="" width={plugin.imageSize[0]} height={plugin.imageSize[1]}
                 className="acct-plugin-img" loading="lazy" />
            <div className="acct-plugin-body">
              <h4>{plugin.name} <span>{plugin.kind} · Model {plugin.model}</span></h4>
              <p className="acct-note">Download access is tied to this sign-in. Purchased plugins come with a licence key, shown below.</p>
              <DownloadButtons slug={plugin.slug} launchId={plugin.launchId || 'launch'} className="acct-downloads" btnExtra="acct-small-btn" />
              {plugin.manualPage && (
                <p className="acct-manual">
                  <Link to={plugin.manualPage}>{plugin.name} manual</Link>
                  {' · '}
                  <a href={plugin.manual} target="_blank" rel="noopener noreferrer">PDF</a>
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
      <div className="acct-help">
        <h4>Moving to another computer</h4>
        <p>Downloads are tied to this sign-in. See each manual for installation.</p>
        <DownloadRoomReport />
      </div>
    </div>
  );
}

export default function AccountPage({ user, packs = [], onLogout }) {
  const downloadable = packs.filter(
    (pack) => (pack.actions || []).some((action) => action.type === 'download'),
  );

  return (
    <div style={{ paddingBottom: '80px' }}>
      <PageMeta title="Account | SubverseLab" noIndex />
      <div className="container">
        <div style={{ padding: '60px 0 40px', borderBottom: '1px solid var(--color-border)', marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem', fontWeight: '800', color: '#000'
              }}>
                {user.email[0].toUpperCase()}
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '4px' }}>Account</h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{user.email}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Link to="/" className="btn btn-outline" style={{ fontSize: '0.85rem' }}>← Back to Store</Link>
              <button className="btn btn-ghost" style={{ fontSize: '0.85rem' }} onClick={onLogout}>Sign Out</button>
            </div>
          </div>
        </div>

        <section style={{ marginBottom: '48px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>My plugins</h3>
          <MyPlugins user={user} />
        </section>

        {downloadable.length > 0 && (
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>Your downloads</h3>
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(min(420px, 100%), 1fr))' }}>
              {downloadable.map((pack) => (
                <div key={pack.id} className="pack-card">
                  <div className="pack-info">
                    <h3 className="pack-title">{pack.title}</h3>
                    {(pack.subtitle || pack.description) && (
                      <div className="pack-subtitle">{pack.subtitle || pack.description}</div>
                    )}
                    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '10px' }}>
                      <ProductActions actions={pack.actions} slug={pack.id} canDownload={true} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {downloadable.length === 0 && (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-muted)' }}>The web tools are launched straight from the storefront — there's nothing to collect for them here.</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: '20px', display: 'inline-block' }}>Browse Tools</Link>
          </div>
        )}
      </div>
    </div>
  );
}
