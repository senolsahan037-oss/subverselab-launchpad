import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GoogleAuthProvider, EmailAuthProvider, reauthenticateWithPopup, reauthenticateWithCredential,
} from 'firebase/auth';
import ProductActions from './ProductActions';
import PageMeta from './PageMeta';
import DownloadButtons from './DownloadButtons';
import DownloadRoomReport from './DownloadRoomReport';
import BuyButton from './BuyButton';
import { usePurchases } from './LaunchPage';
import {
  ALL_PLUGINS, FREE_PLUGINS, FAMILY_PRICE, FAMILY_UNTIL, PRICES, UPDATES_LINE, formatDay,
} from '../data/plugins';

// The account page: the signed-in producer's Download Room.
//
// "My plugins" asks GET /api/purchases/status which plugins this account owns
// (single orders, the family, a tester's plugins) and until when its 2 years of
// updates run; the licence keys come from GET /api/purchases/licenses, which
// reads plugin_licenses/{lowercased e-mail}, written only by server.js from
// signed Lemon Squeezy webhooks (order_created, license_key_created,
// license_key_updated) and from a free launch-licence claim on /launch
// (launchLicence.js; those entries carry source "launch" and product "bundle").
// Keys therefore appear here by themselves after a purchase; nothing is typed in.
//
// The downloads block replaces the old "Library" concept — collecting free
// packs via /api/library and /api/purchases, which were never served. Asking
// each product whether it has a download action is correct now and correct if
// one ever ships again.

// Licence keys from paid orders: GET /api/purchases/licenses returns only this
// signed-in account's keys, each with the product it belongs to, how many
// computers have activated it and when its 2 years of updates end. They show up
// by themselves after a purchase (the Lemon Squeezy webhook writes them, which
// can take a minute); `expectKeys` is true when this account owns something paid.
function LicenceKeys({ user, expectKeys }) {
  const [licenses, setLicenses] = useState(null);
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
  if (!licenses) return null;
  if (licenses.length === 0) {
    return expectKeys
      ? <div className="acct-help" style={{ marginBottom: '20px' }}><h4>Your licence keys</h4><p>Your licence key appears here automatically after a purchase. If you just paid, it can take a minute: reload this page.</p></div>
      : null;
  }
  const copy = async (l) => {
    try { await navigator.clipboard.writeText(l.key); setCopied(l.id || l.key); setTimeout(() => setCopied(''), 2000); } catch { setCopied(''); }
  };
  const nameOf = (l) => l.productName || [...ALL_PLUGINS, ...FREE_PLUGINS].find((p) => p.slug === l.product)?.name || (l.product === 'bundle' ? 'KUBBE + KASET' : l.product === 'family' || l.product === 'bundle4' ? 'SubverseLab plugin family' : 'Plugin');
  return (
    <div className="acct-help" style={{ marginBottom: '20px' }}>
      <h4>Your licence keys</h4>
      {licenses.map((l) => (
        <div key={l.id || l.key} style={{ marginBottom: '12px' }}>
          <p style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', margin: 0 }}>
            <strong>{nameOf(l)}</strong>
            <code style={{ wordBreak: 'break-all' }}>{l.key}</code>
            <button type="button" className="btn btn-outline acct-small-btn" onClick={() => copy(l)}>
              {copied === (l.id || l.key) ? 'Copied' : 'Copy'}
            </button>
          </p>
          <p className="acct-note" style={{ margin: '4px 0 0' }}>
            {l.activationLimit != null ? `Activations: ${l.instancesCount ?? 0} of ${l.activationLimit}` : `Activations: ${l.instancesCount ?? 0}`}
            {l.purchased ? ` · Bought ${formatDay(l.purchased)}` : ''}
            {l.updatesUntil ? ` · Updates until ${formatDay(l.updatesUntil)}` : ''}
          </p>
        </div>
      ))}
    </div>
  );
}

// Tool credits: GET /api/credits/balance (credits.js). Every $1 spent on plugins adds 100 credits; the online
// tools keep their daily free use, and credits are spent only after it is used up (the tool service asks
// POST /api/credits/spend, server to server). Costs come from the server, never from this page.
const TOOL_NAMES = { splitter: 'Splitter', visualizer: 'Visualizer', mixcheck: 'Mix Check' };
const REASON_TEXT = { purchase: 'Plugin purchase', refund: 'Refund', spend: 'Tool use', release: 'Returned (job failed)', admin: 'Adjustment' };
function ToolCredits({ user }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = await user.getIdToken();
        const r = await fetch('/api/credits/balance', { headers: { Authorization: `Bearer ${token}` } });
        const body = await r.json().catch(() => ({}));
        if (!alive) return;
        if (r.ok && typeof body.balance === 'number') setData(body); else setFailed(true);
      } catch { if (alive) setFailed(true); }
    })();
    return () => { alive = false; };
  }, [user]);
  const unverified = !user?.emailVerified && (user?.providerData || []).some((d) => d.providerId === 'password');
  return (
    <section style={{ marginBottom: '48px' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '16px' }}>Tool credits</h3>
      <div className="glass-panel acct-credits">
        {!data && <p className="acct-note" style={{ marginTop: 0 }}>{failed ? 'Your credits could not be loaded right now. Reload the page in a minute.' : 'Loading your credits…'}</p>}
        {data && (
          <>
            <p className="acct-credits-balance"><strong>{data.balance.toLocaleString('en-US')}</strong> credits</p>
            <p className="acct-note" style={{ marginTop: 0 }}>Every $1 you spend on plugins adds 100 credits. Your daily free use comes first; credits are used after it.</p>
            {unverified && <p className="acct-note">Verify your e-mail address to receive credits from purchases made without signing in.</p>}
            {data.costs && (
              <ul className="acct-credits-costs">
                {Object.entries(data.costs).map(([tool, cost]) => <li key={tool}><span>{TOOL_NAMES[tool] || tool}</span><span>{cost} credits per use</span></li>)}
              </ul>
            )}
            {data.recent?.length > 0 && (
              <div className="acct-help">
                <h4>Recent activity</h4>
                <ul className="acct-credits-recent">
                  {data.recent.map((l, i) => (
                    <li key={`${l.at}-${i}`}>
                      <span>{formatDay(String(l.at).slice(0, 10))}</span>
                      <span>{REASON_TEXT[l.reason] || l.reason}{l.tool ? ` · ${TOOL_NAMES[l.tool] || l.tool}` : ''}</span>
                      <span className={l.delta < 0 ? 'acct-credits-out' : 'acct-credits-in'}>{l.delta > 0 ? '+' : ''}{l.delta}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="acct-note">Credits come with plugin purchases. <Link to="/plugins">See the plugins</Link>.</p>
          </>
        )}
      </div>
    </section>
  );
}

// Only what this account has paid for (or holds as an approved tester) is listed:
// the free launch is over, so an earlier free download shows nothing here and no
// download button appears for it (the server refuses those tickets anyway).
function MyPlugins({ user }) {
  const { owned, updatesUntil, standing } = usePurchases(user, true, false);
  // Free plugins (a $0 order) are listed with their downloads, never offered for sale below.
  const mine = [...ALL_PLUGINS, ...FREE_PLUGINS].filter((p) => owned?.includes(p.slug));
  const others = owned ? ALL_PLUGINS.filter((p) => !owned.includes(p.slug)) : [];
  const unverified = !user?.emailVerified && (user?.providerData || []).some((d) => d.providerId === 'password');
  const checking = !unverified && owned === null;
  const hasPaid = mine.length > 0 && standing !== 'tester';
  return (
    <div>
      <LicenceKeys user={user} expectKeys={hasPaid} />
      {mine.length === 0 && (
        <p className="acct-note">{unverified ? 'Verify your e-mail address to see your purchases — check your inbox for the link.' : checking ? 'Checking your purchases…' : <>No purchased plugins on this account yet. <Link to="/plugins">See the plugins</Link>.</>}</p>
      )}
      {hasPaid && <p className="acct-note">{UPDATES_LINE}</p>}
      <div className="acct-plugin-list">
        {mine.map((plugin) => (
          <article key={plugin.slug} className="acct-plugin">
            <img src={plugin.cardImage} alt="" width={plugin.imageSize[0]} height={plugin.imageSize[1]}
                 className="acct-plugin-img" loading="lazy" />
            <div className="acct-plugin-body">
              <h4>{plugin.name} <span>{plugin.kind} · Model {plugin.model}</span></h4>
              <p className="acct-note">
                Download access is tied to this sign-in. Purchased plugins come with a licence key, shown above.
                {updatesUntil?.[plugin.slug] ? ` Updates until ${formatDay(updatesUntil[plugin.slug])}.` : ''}
              </p>
              <DownloadButtons slug={plugin.slug} launchId={plugin.launchId || 'launch'} paid className="acct-downloads" btnExtra="acct-small-btn" />
              {plugin.manualPage ? (
                <p className="acct-manual">
                  <Link to={plugin.manualPage}>{plugin.name} manual</Link>
                  {' · '}
                  <a href={plugin.manual} target="_blank" rel="noopener noreferrer">PDF</a>
                </p>
              ) : plugin.manual && (
                <p className="acct-manual">
                  <a href={plugin.manual} target="_blank" rel="noopener noreferrer">{plugin.name} manual (PDF)</a>
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
      {others.length > 0 && !unverified && (
        <div className="acct-help">
          <h4>{mine.length ? 'Get more plugins' : 'Buy a plugin'}</h4>
          <p>Each plugin on its own, or all seven in the family: {FAMILY_UNTIL}. {UPDATES_LINE}</p>
          <div className="plugin-buy-row">
            {others.length > 1 && <BuyButton slug="family" email={user.email} uid={user.uid} label={`Get the family — $${FAMILY_PRICE}`} />}
            {others.map((p) => (
              <BuyButton key={p.slug} slug={p.slug} email={user.email} uid={user.uid}
                         label={`Buy ${p.displayName} — $${PRICES[p.slug]}`} className="btn btn-outline plugin-buy-single" />
            ))}
          </div>
        </div>
      )}
      <div className="acct-help">
        <h4>Moving to another computer</h4>
        <p>Downloads are tied to this sign-in. See each manual for installation.</p>
        <DownloadRoomReport />
      </div>
    </div>
  );
}

// Self-service deletion: POST /api/account/delete (accountDeletion.js has the
// rules). The server wants a sign-in from the last ten minutes and answers
// code "requires-recent-login" otherwise; Firebase's own
// auth/requires-recent-login is handled the same way. The person signs in
// again here (Google popup, or their password) and the deletion is retried.
function DeleteAccount({ user, onDeleted }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needReauth, setNeedReauth] = useState(false);
  const [password, setPassword] = useState('');
  const isGoogle = user.providerData?.some((p) => p.providerId === 'google.com');

  const send = async () => {
    const token = await user.getIdToken(true);
    const r = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'DELETE' }),
    });
    const body = await r.json().catch(() => ({}));
    if (r.ok) { await onDeleted(); return; }
    if (body.code === 'requires-recent-login') { setNeedReauth(true); setError('For your safety, sign in again before deleting your account.'); return; }
    setError(body.error || 'The account could not be deleted. Try again, or write to info@subverselab.com.');
  };

  const run = async (step) => {
    setBusy(true); setError('');
    try { await step(); } catch (err) {
      if (err?.code === 'auth/requires-recent-login') { setNeedReauth(true); setError('For your safety, sign in again before deleting your account.'); }
      else if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') setError('That password is not right.');
      else if (err?.code === 'auth/popup-closed-by-user') setError('The sign-in window was closed.');
      else setError('Something went wrong. Try again, or write to info@subverselab.com.');
    } finally { setBusy(false); }
  };

  const reauth = () => run(async () => {
    if (isGoogle) await reauthenticateWithPopup(user, new GoogleAuthProvider());
    else await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    setNeedReauth(false); setPassword('');
    await send();
  });

  return (
    <section className="acct-danger" aria-labelledby="delete-account-h">
      <h3 id="delete-account-h">Delete my account</h3>
      <p>This removes your sign-in and, straight away:</p>
      <ul>
        <li>your free launch licence key and its activations, your download counters and your profile;</li>
        <li>your tester application and tester reports, if you sent any;</li>
        <li>problem reports you filed while signed in or with your e-mail address;</li>
        <li>your forum topics and replies.</li>
      </ul>
      <p>
        What stays: a one-way hash of your e-mail address, so the free launch licence stays one per person and the public
        count does not go down; and, for paid orders, only the order ID, product, status, order date and that hash, so refunds and
        re-downloads still work. Your invoices stay with Lemon Squeezy. Licence keys from paid orders are removed here; they
        remain in your Lemon Squeezy receipt. This cannot be undone. See the <Link to="/privacy#keep">Privacy Policy</Link>.
      </p>
      <label htmlFor="delete-confirm" style={{ display: 'block', marginTop: '14px', fontWeight: 700 }}>Type DELETE to confirm</label>
      <div className="acct-danger-row">
        <input id="delete-confirm" className="input-field" value={typed} autoComplete="off"
               onChange={(e) => setTyped(e.target.value)} disabled={busy} />
        <button type="button" className="btn btn-danger" disabled={busy || typed !== 'DELETE'} onClick={() => run(send)}>
          {busy ? 'Working…' : 'Delete my account'}
        </button>
      </div>
      {needReauth && (
        <div className="acct-danger-row">
          {!isGoogle && (
            <input type="password" className="input-field" placeholder="Your password" autoComplete="current-password"
                   value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} />
          )}
          <button type="button" className="btn btn-outline" disabled={busy || (!isGoogle && !password)} onClick={reauth}>
            {isGoogle ? 'Sign in with Google again' : 'Confirm password and delete'}
          </button>
        </div>
      )}
      {error && <p className="acct-danger-error" role="alert">{error}</p>}
    </section>
  );
}

export default function AccountPage({ user, packs = [], onLogout, onDeleted }) {
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

        <ToolCredits user={user} />

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

        <DeleteAccount user={user} onDeleted={onDeleted || onLogout} />
      </div>
    </div>
  );
}
