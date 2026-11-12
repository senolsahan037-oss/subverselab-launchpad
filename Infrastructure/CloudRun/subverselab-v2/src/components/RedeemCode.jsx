import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from './PageMeta';
import { apiUrl } from '../utils/endpoints';

// "Redeem a code" (owner 7 Nov 2026): a code from a store (Loot Audio, Audio Plugin Deals, ...) adds the product to this account.
// POST /api/redeem (api/redeem.js). Used on /redeem (noindex, not in the sitemap; stores may link /redeem?code=XXXX) and as a
// block on /account. Signed out, the field keeps the code through the sign-in (sessionStorage), then the button redeems it.

const STORE_KEY = 'svl-redeem-code';
const remember = (code) => { try { if (code) sessionStorage.setItem(STORE_KEY, code); else sessionStorage.removeItem(STORE_KEY); } catch { /* storage blocked */ } };
const remembered = () => { try { return sessionStorage.getItem(STORE_KEY) || ''; } catch { return ''; } };
function startingCode() {
  if (typeof window === 'undefined') return '';
  return (new URLSearchParams(window.location.search).get('code') || remembered()).trim().slice(0, 40);
}
// Where the product shows on /account: its own card, or the plug-in list for the family.
const accountLink = (product) => (product === 'family' ? '/account#plugins' : `/account#${product}`);

export function RedeemForm({ user, onLoginClick, onRedeemed, inAccount = false }) {
  const [code, setCode] = useState(startingCode);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);   // {ok, text, product?}
  useEffect(() => { remember(code.trim()); }, [code]);

  const submit = async (e) => {
    e.preventDefault();
    if (!user) { onLoginClick?.(); return; }
    setBusy(true); setMsg(null);
    try {
      const token = await user.getIdToken();
      const r = await fetch(apiUrl('/api/redeem'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const body = await r.json().catch(() => ({}));
      if (r.ok && body.ok && body.checkout) {
        // ELEK and the family still unlock with a licence key, which only a Lemon Squeezy order creates: the code opens that
        // product's checkout already at $0, with this account's e-mail and uid, so the order lands on this account.
        let to = body.checkout;
        try {
          const u = new URL(body.checkout);
          if (user.email) u.searchParams.set('checkout[email]', user.email);
          u.searchParams.set('checkout[custom][uid]', user.uid);
          to = u.toString();
        } catch { /* keep the server's link */ }
        setMsg({ ok: true, text: `Code accepted for ${body.name}. Confirm the free order on the next page (no payment); your licence key and downloads then appear on your account.` });
        remember('');
        window.location.assign(to);
      } else if (r.ok && body.ok) {
        setMsg({ ok: true, product: body.product, text: `${body.name} is now on your account.` });
        setCode('');
        remember('');
        onRedeemed?.(body.product);
      } else {
        setMsg({ ok: false, text: body.error || 'That code could not be checked right now. Try again in a minute.' });
      }
    } catch {
      setMsg({ ok: false, text: 'That code could not be checked right now. Try again in a minute.' });
    }
    setBusy(false);
  };

  return (
    <>
      <form className="acct-claim-row" onSubmit={submit}>
        <input className="input-field" placeholder="Your code" aria-label="Code" autoComplete="off" autoCapitalize="characters"
               spellCheck={false} maxLength={40} value={code} onChange={(e) => setCode(e.target.value)} disabled={busy} />
        <button type="submit" className="btn btn-primary acct-small-btn" disabled={busy || (user && !code.trim())}>
          {!user ? 'Sign in to redeem' : busy ? 'Redeeming…' : 'Redeem'}
        </button>
      </form>
      {msg && (
        <p className={`acct-note acct-claim-msg${msg.ok ? '' : ' acct-claim-error'}`} role={msg.ok ? 'status' : 'alert'}>
          {msg.text}{' '}
          {msg.ok && <Link to={accountLink(msg.product)}>{inAccount ? 'See its downloads' : 'Go to its downloads'}</Link>}
        </p>
      )}
    </>
  );
}

const panelStyle = { background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)', borderRadius: 'var(--radius-lg)' };

export default function RedeemPage({ user, onLoginClick }) {
  return (
    <div className="container" style={{ maxWidth: 'var(--read-max)', padding: '56px 20px 96px' }}>
      <PageMeta title="Redeem a code | SubverseLab" noIndex />
      <div className="acct-panel" style={panelStyle}>
        <h1 style={{ marginTop: 0 }}>Redeem a code</h1>
        <p>Bought a SubverseLab product from a store? Enter the code you received and the product is added to your account.</p>
        {user
          ? <p className="acct-note">Signed in as {user.email}.</p>
          : <p className="acct-note">Sign in or create a free account first. Your code stays in the field.</p>}
        <RedeemForm user={user} onLoginClick={onLoginClick} />
        <p className="acct-note" style={{ marginTop: 20 }}>
          Then download it from <Link to="/account">your account</Link>. Each code works once.
        </p>
      </div>
    </div>
  );
}
