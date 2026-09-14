import React from 'react';
import { Link } from 'react-router-dom';
import ProductActions from './ProductActions';
import PageMeta from './PageMeta';

// Replaces the old "Library" concept — collecting free packs into a
// personal library, tracked via /api/library and /api/purchases, neither of
// which this static-only service (see Dockerfile — no backend at all) has
// ever actually served, so that state was always empty for every user. This
// is a plain account view instead: who you are, and — if you have it — your
// downloads, if any product still offers one. Tools aren't listed here at
// all; they're launched from the storefront, not collected.
//
// This used to look up 'subverse-splitter' by name, because that slug was the
// one piece of owned software on the platform. It stopped being one in August
// 2026 when the Splitter became a web tool, and a hardcoded lookup would have
// put an "Open the Splitter" button under a "Your downloads" heading. Asking
// each product whether it actually has a download action is both correct now
// and correct if one ever ships again.
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
          <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-muted)' }}>Tools are launched straight from the storefront — there's nothing to collect here.</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: '20px', display: 'inline-block' }}>Browse Tools</Link>
          </div>
        )}
      </div>
    </div>
  );
}
