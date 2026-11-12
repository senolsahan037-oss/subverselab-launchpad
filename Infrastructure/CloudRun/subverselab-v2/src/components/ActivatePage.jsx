import React, { useEffect, useState } from 'react';
import PageMeta from './PageMeta';
import { apiUrl } from '../utils/endpoints';
import { pluginBySlug } from '../data/plugins';

// /activate?code=ABCD-2345: a plug-in's browser sign-in (01_AI_Tools/subverselab-plugin-common/docs/TRIAL_AND_SIGNIN.md,
// "Site page"). The plug-in opens this page with its user code; the signed-in account presses one button and the plug-in,
// which polls /api/device/poll, receives its signed grant. Ownership is the download rule (api/trialGrant.js -> ownedVia).
// Not in the sitemap, noindex (scripts/prerender.js, server.js). No price on this page: the "not owned" answer links the
// product page.

const panelStyle = { background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)', borderRadius: 'var(--radius-lg)' };
// The product's own name ("JING FANG", not "JINGFANG"); a product not in the site data yet (AHENK before sale) by its slug.
const productName = (slug) => pluginBySlug(slug)?.displayName || String(slug || '').toUpperCase();

// The answer body when it is JSON, else null (a plain-text 503/429 means "try again").
async function call(user, path, body) {
  const token = await user.getIdToken();
  const r = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => null);
  return { status: r.status, data };
}

export default function ActivatePage({ user, onLoginClick }) {
  const code = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('code') || '' : '';
  // state: loading | ready | expired | error | busy | notOwned | elsewhere | done
  const [state, setState] = useState('loading');
  const [info, setInfo] = useState(null);
  const [buyUrl, setBuyUrl] = useState('');

  useEffect(() => {
    if (!user || !code) return undefined;
    let alive = true;
    setState('loading');
    call(user, '/api/device/lookup', { user_code: code })
      .then(({ status, data }) => {
        if (!alive) return;
        if (status === 200 && data?.ok) { setInfo(data); setState(data.approved ? 'done' : 'ready'); }
        else if (status === 404) setState('expired');
        else setState('error');
      })
      .catch(() => alive && setState('error'));
    return () => { alive = false; };
  }, [user, code]);

  const approve = async () => {
    setState('busy');
    try {
      const { status, data } = await call(user, '/api/device/approve', { user_code: code });
      if (status === 200 && data?.ok) setState('done');
      else if (status === 200 && data?.error === 'not owned') { setBuyUrl(data.buy_url || ''); setState('notOwned'); }
      else if (status === 200 && data?.error === 'linked elsewhere') setState('elsewhere');
      else if (status === 404) setState('expired');
      else setState('error');
    } catch { setState('error'); }
  };

  const name = productName(info?.product);
  // A code from the iPhone / iPad app: "device", and no buy link (the server sends none for it either).
  const ios = info?.device === 'ios';
  const thing = ios ? 'device' : 'computer';
  let content;
  if (!code) {
    content = (<><h1 style={{ marginTop: 0 }}>Activate a plugin</h1>
      <p>Open this page from the plugin: press Sign in with SubverseLab in the plugin and it brings you here with its code.</p></>);
  } else if (!user) {
    content = (<><h1 style={{ marginTop: 0 }}>Sign in to activate</h1>
      <p>Sign in with the account you bought with. Code <strong>{code.toUpperCase()}</strong>.</p>
      <button type="button" className="btn btn-primary" onClick={onLoginClick}>Sign in</button></>);
  } else if (state === 'loading') {
    content = <p>Checking the code…</p>;
  } else if (state === 'expired') {
    content = (<><h1 style={{ marginTop: 0 }}>This code has expired</h1>
      <p>Codes last ten minutes. Press Sign in with SubverseLab in the plugin again for a new one.</p></>);
  } else if (state === 'error') {
    content = (<><h1 style={{ marginTop: 0 }}>Something went wrong</h1>
      <p>The activation service did not answer. Wait a moment and reload this page.</p></>);
  } else if (state === 'elsewhere') {
    content = (<><h1 style={{ marginTop: 0 }}>This purchase belongs to another account</h1>
      <p>The App Store purchase on this device is already linked to another SubverseLab account. Sign in with that account and press the button again.</p></>);
  } else if (state === 'notOwned' && (ios || !buyUrl)) {
    content = (<><h1 style={{ marginTop: 0 }}>You do not own {name} yet</h1>
      <p>This account ({user.email}) has no order for {name}. Sign in with the account you bought with and press the button again: the code stays open for ten minutes.</p>
      <p><button type="button" className="btn" onClick={approve}>Activate this {thing}</button></p></>);
  } else if (state === 'notOwned') {
    content = (<><h1 style={{ marginTop: 0 }}>You do not own {name} yet</h1>
      <p>This account ({user.email}) has no order for {name}. Buy it, then come back and press the button again: the code stays open for ten minutes.</p>
      <p style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {buyUrl && <a className="btn btn-primary" href={buyUrl}>Buy {name}</a>}
        <button type="button" className="btn" onClick={approve}>Activate this computer</button>
      </p></>);
  } else if (state === 'done') {
    content = (<><h1 style={{ marginTop: 0 }}>Done. Go back to {name}.</h1>
      <p>{info?.name ? `${info.name} is activated.` : `This ${thing} is activated.`} You can close this page.</p></>);
  } else {
    content = (<><h1 style={{ marginTop: 0 }}>Activate {name}</h1>
      <p>Product: <strong>{name}</strong><br />{ios ? 'Device' : 'Computer'}: <strong>{info?.name || `this ${thing}`}</strong><br />Account: {user.email}</p>
      <button type="button" className="btn btn-primary" onClick={approve} disabled={state === 'busy'}>
        {state === 'busy' ? 'Activating…' : `Activate this ${thing}`}
      </button></>);
  }

  return (
    <div className="container" style={{ maxWidth: 'var(--read-max)', padding: '56px 20px 96px' }}>
      <PageMeta title="Activate | SubverseLab" noIndex />
      <div className="acct-panel" style={panelStyle} role="status" aria-live="polite">{content}</div>
    </div>
  );
}
