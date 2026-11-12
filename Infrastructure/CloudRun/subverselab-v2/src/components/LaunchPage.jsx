import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from './PageMeta';
import Icon from './Icon';
import BuyButton, { checkoutStarted } from './BuyButton';
import DownloadRoomReport from './DownloadRoomReport';
import DownloadButtons from './DownloadButtons';
import {
  LAUNCH, LAUNCH2, PLUGINS, DOWNLOAD_ROOM_PLUGINS, PRICES, FORMATS, currentPrice, priceWord,
  UPDATES_LINE, CARD_BG, ACTIVATION_LINE, TRUST_LINE, LAUNCH2_NAME,
} from '../data/plugins';
import { auth } from '../firebase';
import { SITE_URL } from '../data/siteMeta';
import { useLaunchCounter } from '../hooks/useLaunchCounter';
import { apiUrl } from '../utils/endpoints';

/* /launch and /launch2 — the gated Download Room.
 * /launch:  Kubbe and Kaset, counter launch/counter.
 * /launch2: the Download Room for every product on sale or free (DOWNLOAD_ROOM_PLUGINS, store order); the family
 *           it once sold is retired (owner 2026-10-28). Each product downloads through its own launchId, as on /account.
 * Same code path; the launchId picks the counter (GET /api/launch/codes?launch=)
 * and is sent with every download ticket request (DownloadButtons). */

// Which plugins this signed-in account has paid for (any of the seven, singly or through the family; a tester's
// plugins too), with `updatesUntil` {slug: 'YYYY-MM-DD'} and `standing` ('paid' | 'tester' | 'none').
// null = unknown / not signed in / free quota still open; [] = signed in, owns nothing.
// While the answer is empty (a buyer coming back from checkout, the webhook still
// in flight) it asks again every 4 s for up to 3 minutes, then stops and says so.
const POLL_MS = 4000;
const POLL_MAX_MS = 3 * 60 * 1000;
// `expect` is true only when a purchase is on its way (the buyer just came
// back from checkout, or clicked Buy in this session); then the status is
// polled until the webhook lands. Otherwise it is read once — a signed-in
// visitor who has not bought is not told "checking your purchase".
export function usePurchases(user, enabled, expect, refreshKey = 0) {
  const [state, setState] = useState({ owned: null, updatesUntil: {}, standing: null, polling: false, gaveUp: false });
  useEffect(() => {
    if (!enabled || !user) { setState({ owned: null, updatesUntil: {}, standing: null, polling: false, gaveUp: false }); return undefined; }
    let alive = true;
    let timer = null;
    const startedAt = Date.now();
    const check = async () => {
      let owned = null;
      let extra = { updatesUntil: {}, standing: null, unverified: false };
      try {
        const token = await user.getIdToken();
        const r = await fetch(apiUrl('/api/purchases/status'), { headers: { Authorization: `Bearer ${token}` } });
        const body = await r.json().catch(() => ({}));
        owned = r.ok && Array.isArray(body.owned) ? body.owned : null;
        if (owned) extra = { updatesUntil: body.updatesUntil || {}, standing: body.standing || null, unverified: body.unverified === true, emailOrdersWaiting: body.emailOrdersWaiting === true, packs: Array.isArray(body.packs) ? body.packs : [] };
      } catch { owned = null; }
      if (!alive) return;
      if (owned && owned.length > 0) { setState({ owned, ...extra, polling: false, gaveUp: false }); return; }
      if (!expect) { setState({ owned, ...extra, polling: false, gaveUp: false }); return; }
      if (Date.now() - startedAt >= POLL_MAX_MS) { setState({ owned, ...extra, polling: false, gaveUp: true }); return; }
      setState({ owned, ...extra, polling: true, gaveUp: false });
      timer = setTimeout(check, POLL_MS);
    };
    check();
    return () => { alive = false; clearTimeout(timer); };
  }, [user, enabled, expect, refreshKey]);
  return state;
}

function Counter({ codes, noun, showTotal = true }) {
  if (!codes) return null;
  return (
    <div className="launch-codes" role="status">
      <span className="launch-codes-num">
        {codes.claimed.toLocaleString('en-US')}{showTotal ? ` / ${codes.total.toLocaleString('en-US')}` : ''}
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
  const products = second ? DOWNLOAD_ROOM_PLUGINS : PLUGINS;
  const noun = second ? 'people' : 'producers';
  const names = products.map((p) => p.displayName);
  const codes = useLaunchCounter(second ? null : launchId);
  // Owner 2026-10-10: /launch2 shows no count of any kind (no paid-seat counter, no replacement number).
  const showCounter = !second;
  // The free quota is gone (1,000 / 1,000, ended 4 Oct, and it cannot reopen): /launch is the paid page. It never leads with "free".
  const full = !second;
  const buyStatus = second;
  // Lemon Squeezy sends the buyer back to /launch?purchased=1; the Buy button
  // also marks the session, in case the return link is not followed.
  const expectPurchase = typeof window !== 'undefined'
    && (new URLSearchParams(window.location.search).get('purchased') === '1' || checkoutStarted());
  // /launch (after the free 1,000) and /launch2 both ask which plugins this account owns.
  const { owned, polling, gaveUp } = usePurchases(user, full || buyStatus, expectPurchase);
  const buyEmail = user?.email || auth.currentUser?.email || undefined;
  const buyUid = user?.uid || auth.currentUser?.uid || undefined;

  const steps = second
    ? LAUNCH2.steps
    : [['Buy', 'Buy Kubbe or Kaset below.'], ['Sign in', 'Sign in with the e-mail you paid with.'], ['Download', 'Download for macOS or Windows.'], ['Install', 'Install the macOS package or Windows zip to Common Files\\VST3, then open Kubbe or Kaset in your DAW.']];

  return (
    <div className="plugin-page">
      <PageMeta title={launch.title} description={launch.description} path={launch.path}
                image={`${SITE_URL}${second ? LAUNCH2.image : '/plugins/kubbe/og.jpg'}`} />

      <section className="plugin-hero">
        <div className="container plugin-hero-inner">
          <Link to="/plugins" className="plugin-back">← Plugins</Link>
          <p className="plugin-kicker">SubverseLab · {second ? 'Download Room' : 'Two plugins'}</p>
          <h1 className="plugin-title launch-title">
            {second ? LAUNCH2_NAME : <>KUBBE <span>&amp;</span> KASET</>}
          </h1>
          <p className="plugin-tagline">
            {second ? names.join(', ') : `Kubbe and Kaset are $${PRICES.kubbe} each`}
          </p>

          <div className="plugin-offer">
            <div>
              <p className="plugin-offer-head">{second ? launch.offer : 'The free 1,000 have been claimed — thank you'}</p>
              <p className="plugin-offer-sub">{second ? `Buy any of them, then sign in with the same e-mail to download. ${UPDATES_LINE}` : `Already downloaded? Your copy stays yours. Now: $${PRICES.kubbe} each. ${UPDATES_LINE}`}</p>
            </div>
          </div>

          <div className="launch-claim-wrap">
            <div className="launch-claim">
              <p className="launch-claim-head">Download Room</p>
              {full ? (
                <>
                  <p>Kubbe and Kaset are available to buy below, and KORO, YANKI, HAVA, MIHENK and TUTKAL are out now.</p>
                </>
              ) : (
              <p>Buy any plugin on its own or take a free one, then sign in with the same e-mail to download.</p>
              )}
              {!user && <button type="button" className="btn plugin-btn" onClick={onLoginClick}>Sign in to download</button>}
            </div>
            {showCounter && <Counter codes={codes} noun={noun} showTotal={!second} />}
          </div>

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

      <div className="container" style={{ maxWidth: 'var(--read-max)', padding: '56px 20px 96px' }}>
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
          {showCounter && <p>Counter: {codes ? (second ? `${codes.claimed} ${noun}` : `${codes.claimed} / ${codes.total} ${noun}`) : 'available when the service responds'}.</p>}
        </section>

        <section className="plugin-section">
          <h2>Price</h2>
          <div className="launch-prices">
            {products.map((p) => (
              <div key={p.slug} className="launch-price">
                {CARD_BG[p.slug] && <img className="launch-price-bg" src={CARD_BG[p.slug]} alt="" width="800" height="320" loading="lazy" decoding="async" />}
                <strong>{p.displayName}</strong>
                <span className="launch-price-num">{p.free ? 'Free' : priceWord(second ? currentPrice(p.slug) : PRICES[p.slug])}</span>
                <span>{p.kind}</span>
                <BuyButton place="launch" slug={p.slug} email={buyEmail} uid={buyUid} full={second ? undefined : full} label={p.free ? `Get ${p.displayName} free` : undefined} className="btn btn-outline plugin-buy-single" />
              </div>
            ))}
          </div>
          {!second && <p className="plugin-trust">{TRUST_LINE}</p>}
          <p>{second ? `Every plugin is sold on its own at the price shown; the free ones cost nothing. ${UPDATES_LINE}` : UPDATES_LINE}</p>
          <p>{second ? 'Formats and system requirements are on each plugin’s page.' : `${FORMATS}. Downloads are handled by the Download Room.`}</p>
        </section>

        <section className="plugin-section" id="download">
          <h2>{second ? 'Download' : 'Download and manuals'}</h2>
          <p>
            {second ? 'Downloads unlock once your purchase is confirmed. Your licence key then shows on your Account page.' : 'Downloads unlock once your purchase is confirmed. Sign in with the e-mail you paid with.'}
          </p>
          {!user && <p><button type="button" className="btn btn-outline" onClick={onLoginClick}>Sign in to download</button></p>}
          {second && user && !(owned && owned.length > 0) && (
            <p role="status">{owned ? <>Buy to unlock. Pay with <strong>{user.email}</strong> so the purchase matches this account; it can take a minute to appear.</> : 'Checking your purchase…'}</p>
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
              {second && owned?.includes(p.slug) && (
                // Each product's own room, as on /account: KUBBE and KASET 'launch', the family's other five 'launch2', the solo
                // products 'solo', the free ones 'free' (server.js / api ticket route).
                <DownloadButtons slug={p.slug} launchId={p.launchId || 'launch'} paid />
              )}
              {second && user && owned && owned.length > 0 && !owned.includes(p.slug) && (
                <p><BuyButton place="launch" slug={p.slug} email={buyEmail} uid={buyUid} label={p.free ? `Get ${p.displayName} free` : undefined} className="btn btn-outline plugin-buy-single" /></p>
              )}
              {second ? (
                <p>
                  <Link to={p.path}>See {p.name}</Link>
                  {p.manual && <>{' · '}<a href={p.manual} target="_blank" rel="noopener noreferrer">Manual (PDF)</a></>}
                </p>
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
          <h2>Getting the plugins</h2>
          <p>Buy a plugin, then sign in on <Link to={launch.path}>subverselab.com{launch.path}</Link> and download. {ACTIVATION_LINE}</p>
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
