import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from './PageMeta';
import Icon from './Icon';
import LaunchCountdown from './LaunchCountdown';
import BuyButton, { checkoutStarted } from './BuyButton';
import DownloadRoomReport from './DownloadRoomReport';
import DownloadButtons from './DownloadButtons';
import {
  LAUNCH, LAUNCH2, PLUGINS, LAUNCH2_PLUGINS, PRICES, FORMATS, INSTAGRAM_DM, RELEASE2_AT,
} from '../data/plugins';
import { auth } from '../firebase';
import { SITE_URL } from '../data/siteMeta';
import { useLaunchCounter } from '../hooks/useLaunchCounter';

/* /launch and /launch2 — the gated Download Room.
 * /launch:  Kubbe and Kaset, counter launch/counter.
 * /launch2: KORO, YANKI, HAVA and MIHENK for $20, counter launch2/counter.
 * Same code path; the launchId picks the counter (GET /api/launch/codes?launch=)
 * and is sent with every download ticket request (DownloadButtons). */

// Launch 2 is paid: ask the server whether the signed-in account holds a paid,
// non-refunded purchase (or was approved as a tester). null = unknown / not signed in, true / false = answer.
function useLaunch2Paid(user, enabled) {
  const [paid, setPaid] = useState(null);
  useEffect(() => {
    if (!enabled || !user) { setPaid(null); return undefined; }
    let alive = true;
    (async () => {
      try {
        const token = await user.getIdToken();
        const r = await fetch('/api/launch2/status', { headers: { Authorization: `Bearer ${token}` } });
        const body = await r.json().catch(() => ({}));
        if (alive) setPaid(r.ok ? body.paid === true || body.tester === true : null);
      } catch { if (alive) setPaid(null); }
    })();
    return () => { alive = false; };
  }, [user, enabled]);
  return paid;
}

// After the free 1,000: which of Kubbe / Kaset this signed-in account has paid for.
// null = unknown / not signed in / free quota still open; [] = signed in, owns nothing.
// While the answer is empty (a buyer coming back from checkout, the webhook still
// in flight) it asks again every 4 s for up to 3 minutes, then stops and says so.
const POLL_MS = 4000;
const POLL_MAX_MS = 3 * 60 * 1000;
// `expect` is true only when a purchase is on its way (the buyer just came
// back from checkout, or clicked Buy in this session); then the status is
// polled until the webhook lands. Otherwise it is read once — a signed-in
// visitor who has not bought is not told "checking your purchase".
function usePurchases(user, enabled, expect) {
  const [state, setState] = useState({ owned: null, polling: false, gaveUp: false });
  useEffect(() => {
    if (!enabled || !user) { setState({ owned: null, polling: false, gaveUp: false }); return undefined; }
    let alive = true;
    let timer = null;
    const startedAt = Date.now();
    const check = async () => {
      let owned = null;
      try {
        const token = await user.getIdToken();
        const r = await fetch('/api/purchases/status', { headers: { Authorization: `Bearer ${token}` } });
        const body = await r.json().catch(() => ({}));
        owned = r.ok && Array.isArray(body.owned) ? body.owned : null;
      } catch { owned = null; }
      if (!alive) return;
      if (owned && owned.length > 0) { setState({ owned, polling: false, gaveUp: false }); return; }
      if (!expect) { setState({ owned, polling: false, gaveUp: false }); return; }
      if (Date.now() - startedAt >= POLL_MAX_MS) { setState({ owned, polling: false, gaveUp: true }); return; }
      setState({ owned, polling: true, gaveUp: false });
      timer = setTimeout(check, POLL_MS);
    };
    check();
    return () => { alive = false; clearTimeout(timer); };
  }, [user, enabled, expect]);
  return state;
}

function Counter({ codes, noun }) {
  if (!codes) return null;
  return (
    <div className="launch-codes" role="status">
      <span className="launch-codes-num">
        {codes.claimed.toLocaleString('en-US')} / {codes.total.toLocaleString('en-US')}
      </span>
      <span className="launch-codes-label">
        {noun}
        <small>Live count · updates every 30 seconds</small>
      </span>
    </div>
  );
}

export default function LaunchPage({ user, onLoginClick, launchId = 'launch' }) {
  const second = launchId === 'launch2';
  const launch = second ? LAUNCH2 : LAUNCH;
  const products = second ? LAUNCH2_PLUGINS : PLUGINS;
  const bundleSlug = second ? 'bundle4' : 'bundle';
  const noun = second ? 'people' : 'producers';
  const names = products.map((p) => p.displayName);
  const codes = useLaunchCounter(launchId);
  // The free quota is gone: the page turns into the paid page by itself, no deploy needed.
  const full = !second && !!codes && codes.claimed >= codes.total;
  const paid = useLaunch2Paid(user, second);
  // Lemon Squeezy sends the buyer back to /launch?purchased=1; the Buy button
  // also marks the session, in case the return link is not followed.
  const expectPurchase = typeof window !== 'undefined'
    && (new URLSearchParams(window.location.search).get('purchased') === '1' || checkoutStarted());
  const { owned, polling, gaveUp } = usePurchases(user, full, expectPurchase);
  const buyEmail = user?.email || auth.currentUser?.email || undefined;

  const steps = second
    ? LAUNCH2.steps
    : [['Sign in', 'Sign in on this page.'], ['Download', 'Download both plugins for macOS or Windows.'], ['Install', 'Install the macOS package or Windows zip to Common Files\\VST3.'], ['Open in your DAW', 'Open Kubbe or Kaset in your DAW.']];

  return (
    <div className="plugin-page">
      <PageMeta title={launch.title} description={launch.description} path={launch.path}
                image={`${SITE_URL}${second ? products[0].og : '/plugins/kubbe/og.jpg'}`} />

      <section className="plugin-hero">
        <div className="container plugin-hero-inner">
          <Link to="/plugins" className="plugin-back">← Plugins</Link>
          <p className="plugin-kicker">SubverseLab · {second ? 'Four products' : 'Two plugins'} · Launch</p>
          <h1 className="plugin-title launch-title">
            {second ? names.join(' · ') : <>KUBBE <span>&amp;</span> KASET</>}
          </h1>
          <p className="plugin-tagline">
            {second
              ? `${launch.offer} — sign in and enter the Download Room`
              : full
                ? 'The free 1,000 are gone — Kubbe and Kaset are now $9 each, $15 for both'
                : 'Free for the first 1,000 producers — sign in and download both plugins'}
          </p>

          <div className="plugin-offer">
            <div>
              <p className="plugin-offer-head">{full ? 'The free 1,000 have been claimed — thank you' : launch.offer}</p>
              <p className="plugin-offer-sub">{full ? 'Already downloaded? Your copy stays yours. New: $9 each, $15 for both.' : `${launch.askHow}.`}</p>
            </div>
            {second ? <LaunchCountdown target={RELEASE2_AT} /> : <LaunchCountdown />}
          </div>

          <div className="launch-claim-wrap">
            <div className="launch-claim">
              <p className="launch-claim-head">Download Room</p>
              {full ? (
                <>
                  <p>Free downloads are closed. Kubbe and Kaset are available to buy below, and the next four plugins arrive October 5.</p>
                  <p><Link to="/launch2" className="btn plugin-btn">See the four-plugin set — $20</Link></p>
                </>
              ) : (
              <p>{second ? 'Buy all four for $20, then sign in with the same e-mail to download. Each paid seat is counted automatically.' : <>Sign in to download Kubbe and Kaset. Your downloads are counted automatically.</>}</p>
              )}
              {!full && !user && <button type="button" className="btn plugin-btn" onClick={onLoginClick}>Sign in to download</button>}
            </div>
            <Counter codes={codes} noun={noun} />
          </div>
          <p className="launch-insta">
            {launch.instagram}{' '}
            <a href={INSTAGRAM_DM} target="_blank" rel="noopener noreferrer">Instagram <Icon name="external" /></a>
          </p>

          <div className="launch-duo">
            {products.map((p) => (
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
          <h2>Download Room</h2>
          <ol className="launch-steps">
            {steps.map(([head, text], i) => (
              <li key={head}>
                <span className="launch-step-num">{i + 1}</span>
                <div><strong>{head}</strong><p>{text}</p></div>
              </li>
            ))}
          </ol>
          <p>Counter: {codes ? `${codes.claimed} / ${codes.total} ${noun}` : 'available when the service responds'}.</p>
        </section>

        <section className="plugin-section">
          <h2>Price</h2>
          <div className="launch-prices">
            {!second && products.map((p) => (
              <div key={p.slug} className="launch-price">
                <strong>{p.name}</strong>
                <span className="launch-price-num">${PRICES[p.slug]}</span>
                <span>{p.kind}</span>
                <BuyButton slug={p.slug} email={buyEmail} full={full} />
              </div>
            ))}
            <div className="launch-price launch-price-bundle">
              <strong>{second ? 'All four' : 'Both'}</strong>
              <span className="launch-price-num">${PRICES[bundleSlug]}</span>
              <span>{second ? 'KORO, YANKI, HAVA and MIHENK' : 'Kubbe and Kaset'}</span>
              <BuyButton slug={bundleSlug} email={buyEmail} full={full} label={second ? `Buy all four — $${PRICES.bundle4}` : `Buy both — $${PRICES.bundle}`} />
            </div>
          </div>
          <p>{second ? 'KORO, YANKI and HAVA: VST3 and AU on macOS, VST3 on Windows. MIHENK: standalone app plus VST3/AU on macOS, VST3 on Windows.' : `${FORMATS}. Downloads are handled by the Download Room.`}</p>
        </section>

        <section className="plugin-section" id="download">
          <h2>{second ? 'Download' : 'Download and manuals'}</h2>
          <p>
            {second ? 'Downloads unlock once your $20 purchase is confirmed. No key or activation is needed.' : full ? 'Downloads unlock once your purchase is confirmed. Sign in with the e-mail you paid with.' : 'Sign in to enter the Download Room. No key or activation is needed.'}
          </p>
          {(second || full) && !user && <p><button type="button" className="btn btn-outline" onClick={onLoginClick}>Sign in to download</button></p>}
          {second && user && paid !== true && (
            <p role="status">{paid === false ? <>Buy to unlock. Pay with <strong>{user.email}</strong> so the purchase matches this account; it can take a minute to appear.</> : 'Checking your purchase…'}</p>
          )}
          {full && user && polling && (
            <p role="status">Checking your purchase… The e-mail on your order must be the one you sign in with ({user.email}). This page checks every few seconds for up to 3 minutes.</p>
          )}
          {full && user && gaveUp && (
            <p role="status">No purchase found for {user.email} yet. Make sure the order e-mail matches this sign-in e-mail, then reload this page. If you just paid, it can take a few more minutes.</p>
          )}
          {products.map((p) => (
            <div key={p.slug} className="launch-download">
              <h3>{p.name}</h3>
              {full && (owned?.includes(p.slug)
                ? <DownloadButtons slug={p.slug} launchId={launchId} paid />
                : <p role="status">{!user ? 'The free 1,000 are gone. Buy this plugin, then sign in with the e-mail you paid with to download.' : owned === null ? 'Checking your purchase…' : `Buy to unlock. Pay with ${user.email} so the purchase matches this account; it can take a minute to appear.`}</p>)}
              {!full && (!second || paid === true) && <DownloadButtons slug={p.slug} launchId={launchId} />}
              {second ? (
                <p><Link to={p.path}>See {p.name}</Link></p>
              ) : (
                <p>
                  <Link to={p.manualPage}>{p.name} manual</Link>
                  {' · '}
                  <a href={p.manual} target="_blank" rel="noopener noreferrer">PDF</a>
                </p>
              )}
            </div>
          ))}
          <DownloadRoomReport />
        </section>

        <section className="plugin-section">
          <h2>{second ? 'Getting the products' : 'Getting the plugins'}</h2>
          <p>Sign in on <Link to={launch.path}>subverselab.com{launch.path}</Link> and download. No activation needed.</p>
        </section>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
          {products.map((p) => (
            <Link key={p.slug} to={p.path} className="btn btn-outline">See {p.name}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
