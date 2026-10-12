import React, { useEffect, useState } from 'react';
import ToolsStrip from './ToolsStrip';
import { Link } from 'react-router-dom';
import PageMeta from './PageMeta';
import Icon from './Icon';
import LaunchCountdown from './LaunchCountdown';
import BuyButton, { checkoutStarted } from './BuyButton';
import DownloadRoomReport from './DownloadRoomReport';
import DownloadButtons from './DownloadButtons';
import {
  LAUNCH, LAUNCH2, PLUGINS, LAUNCH2_PLUGINS, FAMILY_PLUGINS, PRICES, FORMATS, INSTAGRAM_DM, RELEASE2_AT,
  FAMILY_NAME, FAMILY_PRICE, FAMILY_LATER, FAMILY_IMAGE, UPDATES_LINE,
  FAMILY_REGULAR_PRICE, CARD_BG, familyOfferEndLabel, ACTIVATION_LINE, TRUST_LINE,
} from '../data/plugins';
import { auth } from '../firebase';
import { SITE_URL } from '../data/siteMeta';
import { useLaunchCounter } from '../hooks/useLaunchCounter';
import { useFamilyLive } from '../hooks/useFamilyLive';

/* /launch and /launch2 — the gated Download Room.
 * /launch:  Kubbe and Kaset, counter launch/counter.
 * /launch2: the plugin family (seven products) and every plugin on its own, counter launch2/counter = paid seats.
 * Same code path; the launchId picks the counter (GET /api/launch/codes?launch=)
 * and is sent with every download ticket request (DownloadButtons). */

// Launch 2 (the plugin family) is paid: ask the server whether the signed-in account holds a paid,
// non-refunded purchase (or was approved as a tester). null = unknown / not signed in, true / false = answer.
export function useLaunch2Paid(user, enabled) {
  const standing = useLaunch2Standing(user, enabled);
  return standing === null ? null : standing !== false;
}
// 'paid' | 'tester' | false (signed in, neither) | null (unknown / not signed in). TUTKAL is a family
// product only: testers are not offered it (the ticket route refuses them too).
export function useLaunch2Standing(user, enabled) {
  const [paid, setPaid] = useState(null);
  useEffect(() => {
    if (!enabled || !user) { setPaid(null); return undefined; }
    let alive = true;
    (async () => {
      try {
        const token = await user.getIdToken();
        const r = await fetch('/api/launch2/status', { headers: { Authorization: `Bearer ${token}` } });
        const body = await r.json().catch(() => ({}));
        if (alive) setPaid(r.ok ? (body.paid === true ? 'paid' : body.tester === true ? 'tester' : false) : null);
      } catch { if (alive) setPaid(null); }
    })();
    return () => { alive = false; };
  }, [user, enabled]);
  return paid;
}

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
        const r = await fetch('/api/purchases/status', { headers: { Authorization: `Bearer ${token}` } });
        const body = await r.json().catch(() => ({}));
        owned = r.ok && Array.isArray(body.owned) ? body.owned : null;
        if (owned) extra = { updatesUntil: body.updatesUntil || {}, standing: body.standing || null, unverified: body.unverified === true };
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
  const familyLive = useFamilyLive();
  const products = second ? (familyLive ? FAMILY_PLUGINS : LAUNCH2_PLUGINS) : PLUGINS;
  const noun = second ? 'people' : 'producers';
  const names = products.map((p) => p.displayName);
  const codes = useLaunchCounter(second ? null : launchId);
  // Owner 2026-10-10: /launch2 shows no count of any kind (no paid-seat counter, no replacement number).
  const showCounter = !second;
  // The free quota is gone (1,000 / 1,000, and it cannot reopen): /launch is the paid page, also while
  // the counter is loading or unreadable. It never leads with "free".
  const full = !second && (!codes || codes.claimed >= codes.total);
  const buyStatus = second && familyLive;
  // Lemon Squeezy sends the buyer back to /launch?purchased=1; the Buy button
  // also marks the session, in case the return link is not followed.
  const expectPurchase = typeof window !== 'undefined'
    && (new URLSearchParams(window.location.search).get('purchased') === '1' || checkoutStarted());
  // /launch (after the free 1,000) and /launch2 both ask which plugins this account owns.
  const { owned, polling, gaveUp } = usePurchases(user, full || buyStatus, expectPurchase);
  const buyEmail = user?.email || auth.currentUser?.email || undefined;
  const buyUid = user?.uid || auth.currentUser?.uid || undefined;

  const steps = second
    ? (familyLive ? LAUNCH2.steps : [['Out October 5', 'KORO, YANKI, HAVA and MIHENK open on October 5.'], ['Sign in', 'Sign in on this page with Google or with an e-mail address.'], ['Download', 'Download for macOS or Windows from this page.'], ['Install', 'Install the plugins or the MIHENK standalone app. Your licence key is on your Account page.']])
    : [['Sign in', 'Sign in on this page.'], ['Download', 'Download both plugins for macOS or Windows.'], ['Install', 'Install the macOS package or Windows zip to Common Files\\VST3.'], ['Open in your DAW', 'Open Kubbe or Kaset in your DAW.']];

  return (
    <div className="plugin-page">
      <PageMeta title={launch.title} description={launch.description} path={launch.path}
                image={`${SITE_URL}${second ? (familyLive ? FAMILY_IMAGE : products[0].og) : '/plugins/kubbe/og.jpg'}`} />

      <section className="plugin-hero">
        <div className="container plugin-hero-inner">
          <Link to="/plugins" className="plugin-back">← Plugins</Link>
          <p className="plugin-kicker">SubverseLab · {second ? (familyLive ? 'Seven products' : 'Four products') : 'Two plugins'} · {second && !familyLive ? 'Out October 5' : 'Launch'}</p>
          <h1 className="plugin-title launch-title">
            {second ? (familyLive ? FAMILY_NAME : names.join(' · ')) : <>KUBBE <span>&amp;</span> KASET</>}
          </h1>
          <p className="plugin-tagline">
            {second
              ? (familyLive ? names.join(', ') : 'Four new products — out October 5')
              : full
                ? `Kubbe and Kaset are now $${PRICES.kubbe} each`
                : 'Free for the first 1,000 producers — sign in and download both plugins'}
          </p>

          <div className="plugin-offer">
            <div>
              <p className="plugin-offer-head">{full ? 'The free 1,000 have been claimed — thank you' : second && !familyLive ? 'KORO, YANKI, HAVA and MIHENK — out October 5' : launch.offer}</p>
              <p className="plugin-offer-sub">{second ? (familyLive ? `Launch price until ${familyOfferEndLabel()} · regular $${FAMILY_REGULAR_PRICE}. ${UPDATES_LINE}` : 'Price and checkout open with the release.') : full ? `Already downloaded? Your copy stays yours. Now: $${PRICES.kubbe} each. ${UPDATES_LINE}` : `${launch.askHow}.`}</p>
            </div>
            {second ? <LaunchCountdown target={RELEASE2_AT} /> : <LaunchCountdown />}
          </div>

          <div className="launch-claim-wrap">
            <div className="launch-claim">
              <p className="launch-claim-head">Download Room</p>
              {full ? (
                <>
                  <p>Free downloads are closed. Kubbe and Kaset are available to buy below, and KORO, YANKI, HAVA, MIHENK and TUTKAL are out now.</p>
                  <p><Link to="/launch2" className="btn plugin-btn">{familyLive ? `See the ${FAMILY_NAME} — $${FAMILY_PRICE}` : 'See the four new products — out October 5'}</Link></p>
                </>
              ) : (
              <p>{second ? (familyLive ? 'Buy the family or any plugin on its own, then sign in with the same e-mail to download.' : 'KORO, YANKI, HAVA and MIHENK open on October 5. Come back then to buy and download.') : <>Sign in to download Kubbe and Kaset. Your downloads are counted automatically.</>}</p>
              )}
              {!full && !user && !(second && !familyLive) && <button type="button" className="btn plugin-btn" onClick={onLoginClick}>Sign in to download</button>}
              {full && !user && <button type="button" className="btn plugin-btn" onClick={onLoginClick}>Sign in to download</button>}
            </div>
            {showCounter && !(second && !familyLive) && <Counter codes={codes} noun={noun} showTotal={!second} />}
          </div>
          {!second && !full && (
            <p className="launch-insta">
              {launch.instagram}{' '}
              <a href={INSTAGRAM_DM} target="_blank" rel="noopener noreferrer">Instagram <Icon name="external" /></a>
            </p>
          )}

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
          {showCounter && !(second && !familyLive) && <p>Counter: {codes ? (second ? `${codes.claimed} ${noun}` : `${codes.claimed} / ${codes.total} ${noun}`) : 'available when the service responds'}.</p>}
        </section>

        <section className="plugin-section">
          <h2>Price</h2>
          <div className="launch-prices">
            {(!second || familyLive) && products.map((p) => (
              <div key={p.slug} className="launch-price">
                {CARD_BG[p.slug] && <img className="launch-price-bg" src={CARD_BG[p.slug]} alt="" width="800" height="320" loading="lazy" decoding="async" />}
                <strong>{p.displayName}</strong>
                <span className="launch-price-num">${PRICES[p.slug]}</span>
                <span>{p.kind}</span>
                <BuyButton slug={p.slug} email={buyEmail} uid={buyUid} full={second ? undefined : full} className="btn btn-outline plugin-buy-single" />
              </div>
            ))}
            {familyLive && (
              <div className="launch-price launch-price-bundle">
                <img className="launch-price-bg" src={CARD_BG.family} alt="" width="800" height="450" loading="lazy" decoding="async" />
                <strong>{FAMILY_NAME}</strong>
                <span className="launch-price-num">
                  <s className="launch-price-was" aria-label={`regular price $${FAMILY_REGULAR_PRICE}`}>${FAMILY_REGULAR_PRICE}</s> ${FAMILY_PRICE}
                </span>
                <span>{FAMILY_PLUGINS.map((p) => p.displayName).join(', ')}</span>
                <span>Launch price{familyOfferEndLabel() ? ` until ${familyOfferEndLabel()}` : ''}</span>
                <BuyButton slug="family" email={buyEmail} uid={buyUid} label={`Get the family — $${FAMILY_PRICE}`} />
              </div>
            )}
          </div>
          <p className="plugin-trust">{TRUST_LINE}</p>
          {second && familyLive && (
            <p>Every plugin is sold on its own at the price shown, or all seven in the family. {UPDATES_LINE} {FAMILY_LATER}</p>
          )}
          {!second && familyLive && <p>{UPDATES_LINE}</p>}
          {second && !familyLive && <p>KORO, YANKI, HAVA and MIHENK go on sale on October 5.</p>}
          <p>{second ? `${familyLive ? 'KUBBE, KASET, ' : ''}KORO, YANKI, HAVA and TUTKAL: VST3 and AU on macOS, VST3 on Windows. MIHENK: standalone app plus VST3/AU on macOS, standalone app plus VST3 on Windows. KORO, YANKI, HAVA, MIHENK and TUTKAL are out now.` : `${FORMATS}. Downloads are handled by the Download Room.`}</p>
        </section>

        <section className="plugin-section" id="download">
          <h2>{second ? 'Download' : 'Download and manuals'}</h2>
          <p>
            {second ? (familyLive ? 'Downloads unlock once your purchase (the family or a single plugin) is confirmed. Your licence key then shows on your Account page.' : 'Downloads open on October 5. Your licence key then shows on your Account page.') : full ? 'Downloads unlock once your purchase is confirmed. Sign in with the e-mail you paid with.' : `Sign in to enter the Download Room. ${ACTIVATION_LINE}`}
          </p>
          {((second && familyLive) || full) && !user && <p><button type="button" className="btn btn-outline" onClick={onLoginClick}>Sign in to download</button></p>}
          {second && familyLive && user && !(owned && owned.length > 0) && (
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
              {!full && !second && <DownloadButtons slug={p.slug} launchId={launchId} />}
              {second && familyLive && owned?.includes(p.slug) && (
                // KUBBE and KASET download through the launch-1 room; a paid family order opens them there (server.js).
                PLUGINS.includes(p) ? <DownloadButtons slug={p.slug} launchId="launch" paid /> : <DownloadButtons slug={p.slug} launchId={launchId} />
              )}
              {second && familyLive && user && owned && owned.length > 0 && !owned.includes(p.slug) && (
                <p><BuyButton slug={p.slug} email={buyEmail} uid={buyUid} className="btn btn-outline plugin-buy-single" /></p>
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
          <h2>{second ? (familyLive ? 'Getting the family' : 'Getting the products') : 'Getting the plugins'}</h2>
          <p>{second ? (familyLive ? 'Buy the family or a plugin on its own, then sign in' : 'From October 5, sign in') : 'Sign in'} on <Link to={launch.path}>subverselab.com{launch.path}</Link> and download. {ACTIVATION_LINE}</p>
        </section>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
          {products.map((p) => (
            <Link key={p.slug} to={p.path} className="btn btn-outline">See {p.name}</Link>
          ))}
        </div>
        <ToolsStrip />
      </div>
    </div>
  );
}
