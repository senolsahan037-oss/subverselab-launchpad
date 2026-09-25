import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';
import { db } from '../firebase';
import ProductActions from './ProductActions';
import PageMeta from './PageMeta';
import Icon from './Icon';
import {
  PLUGINS, pluginBySlug, DOWNLOADS, LS_MY_ORDERS, LICENCE_FACTS, RELEASE_LABEL,
} from '../data/plugins';

// The account page: who you are, the plugins you own, and — if any product
// still offers one — your downloads.
//
// "My plugins" reads plugin_licenses/{lowercased e-mail}, which only server.js
// writes, from signed Lemon Squeezy webhooks (order_created,
// license_key_created, license_key_updated). firestore.rules lets a user read
// that one document only when Firebase has verified they own the address, so
// an unverified sign-in is asked to verify first rather than shown an empty
// list that looks like "you own nothing".
//
// The downloads block replaces the old "Library" concept — collecting free
// packs via /api/library and /api/purchases, which were never served. Asking
// each product whether it has a download action is correct now and correct if
// one ever ships again.

const KEY_MASK = '••••-••••-••••';

// One licence may be for a single plugin or for the bundle, which covers both.
function slugsFor(product) {
  if (product === 'bundle') return PLUGINS.map((p) => p.slug);
  return pluginBySlug(product) ? [product] : [];
}

function statusLabel(lic) {
  if (lic.disabled || lic.status === 'disabled') return 'Disabled';
  if (lic.status === 'expired') return 'Expired';
  if (lic.status === 'active') return 'Active';
  if (lic.status === 'inactive') return 'Not activated yet';
  return lic.status || 'Unknown';
}

function LicenceKey({ value, short }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!value) return <code className="acct-key">{short || KEY_MASK}</code>;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setShown(true);
    }
  };

  return (
    <div className="acct-key-row">
      <code className="acct-key">{shown ? value : (short || `${KEY_MASK}-${value.slice(-4)}`)}</code>
      <button type="button" className="btn btn-ghost acct-small-btn" onClick={() => setShown((s) => !s)}>
        {shown ? 'Hide' : 'Reveal'}
      </button>
      <button type="button" className="btn btn-ghost acct-small-btn" onClick={copy}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

function DownloadButtons({ slug }) {
  const links = DOWNLOADS[slug] || {};
  return (
    <div className="acct-downloads">
      {[['mac', 'macOS'], ['windows', 'Windows']].map(([k, label]) => (
        links[k]
          ? <a key={k} href={links[k]} className="btn btn-primary acct-small-btn"><Icon name="download" /> {label}</a>
          : <button key={k} type="button" className="btn btn-outline acct-small-btn" disabled>
              {label} · Available {RELEASE_LABEL}
            </button>
      ))}
    </div>
  );
}

function MyPlugins({ user }) {
  const email = (user.email || '').toLowerCase();
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [verifySent, setVerifySent] = useState(false);

  useEffect(() => {
    if (!user.emailVerified || !email) return undefined;
    let alive = true;
    getDoc(doc(db, 'plugin_licenses', email))
      .then((snap) => { if (alive) setState({ loading: false, data: snap.exists() ? snap.data() : null, error: null }); })
      .catch((err) => { if (alive) setState({ loading: false, data: null, error: err.message }); });
    return () => { alive = false; };
  }, [user.emailVerified, email]);

  const fallback = (
    <p className="acct-note">
      Bought with a different e-mail, or can’t see a purchase? Open{' '}
      <a href={LS_MY_ORDERS} target="_blank" rel="noopener noreferrer">Lemon Squeezy’s My Orders</a>{' '}
      and sign in with the address you used at checkout — every order, key and file is there too.
    </p>
  );

  if (!user.emailVerified) {
    return (
      <div className="glass-panel acct-panel">
        <p>Verify your e-mail address to see the plugins bought with it. Licence keys are only shown to the
          owner of the address they were sent to.</p>
        <button type="button" className="btn btn-primary" disabled={verifySent}
                onClick={() => sendEmailVerification(user).then(() => setVerifySent(true)).catch(() => setVerifySent(false))}>
          {verifySent ? 'Verification e-mail sent — reload after clicking the link' : 'Send verification e-mail'}
        </button>
        {fallback}
      </div>
    );
  }

  if (state.loading) return <p className="acct-note">Loading your plugins…</p>;

  const orders = state.data?.orders || {};
  const licences = Object.values(state.data?.licenses || {});
  // A licence key event carries a product id but no name; resolve its plugin
  // from the order it belongs to when the server could not.
  const withProduct = licences.map((lic) => ({
    ...lic,
    product: lic.product || orders[lic.order_id]?.product || null,
  }));

  const owned = PLUGINS.map((p) => ({
    plugin: p,
    licences: withProduct.filter((lic) => slugsFor(lic.product).includes(p.slug)),
  })).filter((row) => row.licences.length > 0);

  if (state.error) {
    return <div className="glass-panel acct-panel"><p>Your plugins could not be loaded just now.</p>{fallback}</div>;
  }

  if (owned.length === 0) {
    return (
      <div className="glass-panel acct-panel">
        <p>No plugins on <strong>{email}</strong> yet. Purchases and redeemed launch codes appear here once
          Lemon Squeezy confirms them, under the e-mail used at checkout.</p>
        <Link to="/plugins" className="btn btn-primary" style={{ display: 'inline-block' }}>See the plugins</Link>
        {fallback}
      </div>
    );
  }

  return (
    <div>
      <div className="acct-plugin-list">
        {owned.map(({ plugin, licences: lics }) => (
          <article key={plugin.slug} className="acct-plugin">
            <img src={plugin.cardImage} alt="" width={plugin.imageSize[0]} height={plugin.imageSize[1]}
                 className="acct-plugin-img" loading="lazy" />
            <div className="acct-plugin-body">
              <h4>{plugin.name} <span>{plugin.kind} · Model {plugin.model}</span></h4>
              {lics.map((lic) => (
                <div key={lic.license_id} className="acct-licence">
                  <LicenceKey value={lic.key} short={lic.key_short} />
                  <div className="acct-licence-meta">
                    <span className={`acct-status acct-status-${(statusLabel(lic)).split(' ')[0].toLowerCase()}`}>
                      {statusLabel(lic)}
                    </span>
                    <span>
                      Activations {lic.instances_count ?? 0}
                      {lic.activation_limit ? ` of ${lic.activation_limit}` : ''}
                    </span>
                    {lic.product === 'bundle' && <span>Bundle key</span>}
                    {orders[lic.order_id]?.receipt_url && (
                      <a href={orders[lic.order_id].receipt_url} target="_blank" rel="noopener noreferrer">Receipt</a>
                    )}
                  </div>
                </div>
              ))}
              <DownloadButtons slug={plugin.slug} />
              <a href={plugin.manual} target="_blank" rel="noopener noreferrer" className="acct-manual">
                {plugin.name} manual (PDF)
              </a>
            </div>
          </article>
        ))}
      </div>
      <div className="acct-help">
        <h4>Moving to another computer</h4>
        <p>{LICENCE_FACTS.oneComputer} If the old computer is no longer available, get in touch through <Link to="/help">Help</Link> from this e-mail address.</p>
      </div>
      {fallback}
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
