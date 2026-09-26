import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from './PageMeta';
import Icon from './Icon';
import LaunchCountdown from './LaunchCountdown';
import BuyButton from './BuyButton';
import DownloadButtons from './DownloadButtons';
import {
  LAUNCH, PLUGINS, PRICES, FORMATS, RELEASE_LABEL, INSTAGRAM_DM,
} from '../data/plugins';
import { SITE_URL } from '../data/siteMeta';

/* /launch — the gated Download Room for Kubbe and Kaset. */

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
        producers
        <small>Live count · updates every 30 seconds</small>
      </span>
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
          <p className="plugin-tagline">Free for the first 1,000 producers — sign in and download both plugins</p>

          <div className="plugin-offer">
            <div>
              <p className="plugin-offer-head">{LAUNCH.offer}</p>
              <p className="plugin-offer-sub">{LAUNCH.askHow}.</p>
            </div>
            <LaunchCountdown />
          </div>

          <div className="launch-claim-wrap"><div className="launch-claim"><p className="launch-claim-head">Download Room</p><p>Sign in to download Kubbe and Kaset. Your downloads are counted automatically.</p>{!user && <button type="button" className="btn plugin-btn" onClick={onLoginClick}>Sign in to download</button>}</div><Counter codes={codes} /></div>
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
          <h2>Download Room</h2>
          <ol className="launch-steps">
            {[['Sign in', 'Sign in on this page.'], ['Download', 'Download both plugins for macOS or Windows.'], ['Install', 'Install the macOS package or Windows zip to Common Files\\VST3.'], ['Open in your DAW', 'Open Kubbe or Kaset in your DAW.']].map(([head, text], i) => (
              <li key={head}>
                <span className="launch-step-num">{i + 1}</span>
                <div><strong>{head}</strong><p>{text}</p></div>
              </li>
            ))}
          </ol>
          <p>Counter: {codes ? `${codes.claimed} / ${codes.total} producers` : 'available when the service responds'}.</p>
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
          <p>{FORMATS}. Downloads are handled by the verified Download Room.</p>
        </section>

        <section className="plugin-section" id="download">
          <h2>Download and manuals</h2>
          <p>
            Sign in to enter the Download Room. No key or activation is needed.
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
          <h2>Getting the plugins</h2><p>Sign in on <Link to="/launch">subverselab.com/launch</Link> and download. No activation needed.</p>
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
