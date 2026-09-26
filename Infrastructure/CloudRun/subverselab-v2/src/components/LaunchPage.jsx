import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../firebase';
import PageMeta from './PageMeta';
import Icon from './Icon';
import LaunchCountdown from './LaunchCountdown';
import BuyButton from './BuyButton';
import DownloadButtons from './DownloadButtons';
import {
  LAUNCH, PLUGINS, PRICES, FORMATS, RELEASE_LABEL, INSTAGRAM_DM, LICENCE_FACTS, LS_MY_ORDERS,
} from '../data/plugins';
import { SITE_URL } from '../data/siteMeta';

/*  /launch — the October 1 campaign for Kubbe and Kaset.
 *
 *  The free launch licences are SubverseLab's own (server.js →
 *  launchLicence.js): sign in, verify the e-mail, press Claim, and
 *  POST /api/launch/claim returns one key for both plugins — the same key again
 *  on every later press. Instagram DMs are answered with a link here, so the
 *  one counter below is the whole campaign.
 *
 *  The number, "N / 1,000 claimed", is read live from GET /api/launch/codes.
 *  When the server says {available:false} the number is simply not shown. It
 *  is never estimated and never hard-coded.
 */

function useLaunchCounter() {
  const [codes, setCodes] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch('/api/launch/codes')
      .then((r) => (r.ok ? r.json() : { available: false }))
      .then((body) => { if (alive) setCodes(body); })
      .catch(() => { if (alive) setCodes({ available: false }); });
    return () => { alive = false; };
  }, []);
  const known = codes && codes.available !== false && Number.isInteger(codes.claimed) && Number.isInteger(codes.total);
  return [known ? codes : null, setCodes];
}

function Counter({ codes }) {
  if (!codes) return null;
  return (
    <div className="launch-codes" role="status">
      <span className="launch-codes-num">
        {codes.claimed.toLocaleString('en-US')} / {codes.total.toLocaleString('en-US')}
      </span>
      <span className="launch-codes-label">
        free licences claimed
        <small>Live count · updates every 30 seconds</small>
      </span>
    </div>
  );
}

function KeyCard({ licenceKey }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(licenceKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="launch-key-card">
      <p className="launch-key-label">Your licence key · Kubbe and Kaset · up to {LAUNCH.activationLimit} computers</p>
      <div className="launch-key-row">
        <code className="launch-key">{licenceKey}</code>
        <button type="button" className="btn plugin-btn" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <ol className="launch-key-steps">
        <li><a href="#download">Download</a> Kubbe and Kaset and install them.</li>
        <li>Open either plugin in your DAW — the activation card covers the panel.</li>
        <li>Paste this key and press <strong>Activate</strong>. Do the same in the other plugin.</li>
      </ol>
      <p className="launch-key-links">
        Step by step: {PLUGINS.map((p, i) => (
          <React.Fragment key={p.slug}>{i > 0 && ' · '}<Link to={`${p.manualPage}#licence`}>{p.name} manual</Link></React.Fragment>
        ))}
        {' · '}The key is also saved on <Link to="/account">your account</Link>.
      </p>
    </div>
  );
}

// Everything between "signed out" and "here is your key".
function ClaimLicence({ user, onLoginClick, codes, setCodes }) {
  const [state, setState] = useState({ busy: false, key: null, error: null, soldOut: false });
  const [verifySent, setVerifySent] = useState(false);
  // user.reload() updates the same object in place, so a counter forces the
  // re-render that shows the verified state.
  const [, setReloaded] = useState(0);

  const soldOut = state.soldOut || (codes && codes.claimed >= codes.total);

  if (state.key) return <KeyCard licenceKey={state.key} />;

  if (!user) {
    return (
      <div className="launch-claim">
        <p className="launch-claim-head">Get your free licence</p>
        {soldOut ? (
          <p>All {LAUNCH.codesTotal.toLocaleString('en-US')} launch licences are taken. Claimed one earlier? Sign in to see it again.</p>
        ) : (
          <p>One key for both plugins, on up to {LAUNCH.activationLimit} computers. Sign in with Google or an e-mail address to claim it.</p>
        )}
        <button type="button" className="btn plugin-btn" onClick={onLoginClick}>
          {soldOut ? 'Sign in' : 'Sign in to claim'}
        </button>
      </div>
    );
  }

  if (!user.emailVerified) {
    return (
      <div className="launch-claim">
        <p className="launch-claim-head">Verify your e-mail first</p>
        <p>One licence per person means one per verified address. Open the link we sent to <strong>{user.email}</strong>, then come back here.</p>
        <div className="launch-claim-row">
          <button type="button" className="btn plugin-btn"
                  onClick={() => user.reload().then(() => setReloaded((n) => n + 1)).catch(() => {})}>
            I’ve verified — continue
          </button>
          <button type="button" className="btn btn-ghost" disabled={verifySent}
                  onClick={() => sendEmailVerification(user).then(() => setVerifySent(true)).catch(() => setVerifySent(false))}>
            {verifySent ? 'Link sent — check your inbox' : 'Send the link again'}
          </button>
        </div>
      </div>
    );
  }

  const claim = async () => {
    setState((s) => ({ ...s, busy: true, error: null }));
    try {
      // Force a fresh token: one issued before the e-mail was verified still
      // says email_verified:false.
      const token = await (auth.currentUser || user).getIdToken(true);
      const r = await fetch('/api/launch/claim', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await r.json().catch(() => ({}));
      if (Number.isInteger(body.claimed) && Number.isInteger(body.total)) {
        setCodes({ total: body.total, claimed: body.claimed });
      }
      if (r.ok && body.key) {
        setState({ busy: false, key: body.key, error: null, soldOut: false });
      } else if (r.status === 410) {
        setState({ busy: false, key: null, error: null, soldOut: true });
      } else {
        setState({ busy: false, key: null, error: body.error || 'The licence could not be claimed just now. Try again in a minute.', soldOut: false });
      }
    } catch {
      setState({ busy: false, key: null, error: 'The licence could not be claimed just now. Check your connection and try again.', soldOut: false });
    }
  };

  return (
    <div className="launch-claim">
      <p className="launch-claim-head">{soldOut ? 'All launch licences are taken' : 'Get your free licence'}</p>
      {soldOut ? (
        <p>All {LAUNCH.codesTotal.toLocaleString('en-US')} launch licences have been claimed. The plugins are still on sale below. If you claimed one earlier, the button shows it again.</p>
      ) : (
        <p>Signed in as <strong>{user.email}</strong>. One key for both plugins, on up to {LAUNCH.activationLimit} computers. Already claimed? The same button shows your key again.</p>
      )}
      <button type="button" className="btn plugin-btn" onClick={claim} disabled={state.busy}>
        {state.busy ? 'Claiming…' : (soldOut ? 'Show my key' : 'Claim my licence')}
      </button>
      {state.error && <p className="launch-claim-error" role="alert">{state.error}</p>}
    </div>
  );
}

export default function LaunchPage({ user, onLoginClick }) {
  const [codes, setCodes] = useLaunchCounter();
  return (
    <div className="plugin-page">
      <PageMeta title={LAUNCH.title} description={LAUNCH.description} path={LAUNCH.path}
                image={`${SITE_URL}/plugins/kubbe/og.jpg`} />

      <section className="plugin-hero">
        <div className="container plugin-hero-inner">
          <Link to="/plugins" className="plugin-back">← Plugins</Link>
          <p className="plugin-kicker">SubverseLab · Two plugins · Launch</p>
          <h1 className="plugin-title launch-title">KUBBE <span>&amp;</span> KASET</h1>
          <p className="plugin-tagline">Out {RELEASE_LABEL}</p>

          <div className="plugin-offer">
            <div>
              <p className="plugin-offer-head">{LAUNCH.offer}</p>
              <p className="plugin-offer-sub">{LAUNCH.askHow}.</p>
            </div>
            <LaunchCountdown />
          </div>

          <div className="launch-claim-wrap">
            <ClaimLicence user={user} onLoginClick={onLoginClick} codes={codes} setCodes={setCodes} />
            <Counter codes={codes} />
          </div>
          <p className="launch-insta">
            {LAUNCH.instagram}{' '}
            <a href={INSTAGRAM_DM} target="_blank" rel="noopener noreferrer">Instagram <Icon name="external" /></a>
          </p>

          <div className="launch-duo">
            {PLUGINS.map((p) => (
              <Link key={p.slug} to={p.path} className="launch-duo-item">
                <img src={p.cardImage} alt={`${p.name}'s front panel`} width={p.imageSize[0]}
                     height={p.imageSize[1]} loading="lazy" />
                <span className="launch-duo-name">{p.displayName}</span>
                <span className="launch-duo-text">{p.tagline} · Model {p.model}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="container" style={{ maxWidth: '820px', padding: '56px 20px 96px' }}>
        <section className="plugin-section">
          <h2>How to get a free licence</h2>
          <ol className="launch-steps">
            {LAUNCH.steps.map(([head, text], i) => (
              <li key={head}>
                <span className="launch-step-num">{i + 1}</span>
                <div><strong>{head}</strong><p>{text}</p></div>
              </li>
            ))}
          </ol>
          <p>
            {LICENCE_FACTS.launch} Licences go to the first {LAUNCH.codesTotal.toLocaleString('en-US')} people
            who claim one, one per person. After that the plugins are still on sale at the prices below.
          </p>
        </section>

        <section className="plugin-section">
          <h2>Price</h2>
          <div className="launch-prices">
            {PLUGINS.map((p) => (
              <div key={p.slug} className="launch-price">
                <strong>{p.name}</strong>
                <span className="launch-price-num">${PRICES[p.slug]}</span>
                <span>{p.kind}</span>
                <BuyButton slug={p.slug} />
              </div>
            ))}
            <div className="launch-price launch-price-bundle">
              <strong>Both</strong>
              <span className="launch-price-num">${PRICES.bundle}</span>
              <span>Kubbe and Kaset</span>
              <BuyButton slug="bundle" label={`Buy both — $${PRICES.bundle}`} />
            </div>
          </div>
          <p>{FORMATS}. Checkout, licence key and download are handled by Lemon Squeezy.</p>
        </section>

        <section className="plugin-section" id="download">
          <h2>Download and manuals</h2>
          <p>
            The installers are free to download; without a licence the plugin shows its activation card and
            passes audio through untouched.
          </p>
          {PLUGINS.map((p) => (
            <div key={p.slug} className="launch-download">
              <h3>{p.name}</h3>
              <DownloadButtons slug={p.slug} />
              <p>
                <Link to={p.manualPage}>{p.name} manual</Link>
                {' · '}
                <a href={p.manual} target="_blank" rel="noopener noreferrer">PDF</a>
              </p>
            </div>
          ))}
        </section>

        <section className="plugin-section">
          <h2>Licence</h2>
          <p>{LICENCE_FACTS.noDemo}</p>
          <p>{LICENCE_FACTS.oneComputer}</p>
          <p>
            Lost the e-mail? Sign in here with the same address to see your keys on <Link to="/account">your
            account</Link>, or open <a href={LS_MY_ORDERS} target="_blank" rel="noopener noreferrer">Lemon
            Squeezy’s My Orders</a> with the e-mail you used at checkout.
          </p>
        </section>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
          {PLUGINS.map((p) => (
            <Link key={p.slug} to={p.path} className="btn btn-outline">See {p.name}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
