import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from './PageMeta';
import Icon from './Icon';
import LaunchCountdown from './LaunchCountdown';
import BuyButton from './BuyButton';
import {
  LAUNCH, PLUGINS, PRICES, FORMATS, RELEASE_LABEL, INSTAGRAM_DM, LICENCE_FACTS, LS_MY_ORDERS,
} from '../data/plugins';
import { SITE_URL } from '../data/siteMeta';

/*  /launch — the October 1 campaign for Kubbe and Kaset.
 *
 *  The one number on this page, codes left, is read live from
 *  GET /api/launch/codes (server.js → Lemon Squeezy discount redemptions).
 *  When the server says {available:false} — no API key, no discount ids, or
 *  Lemon Squeezy did not answer — the number is simply not shown. It is never
 *  estimated and never hard-coded.
 */

function CodesLeft() {
  const [codes, setCodes] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/launch/codes')
      .then((r) => (r.ok ? r.json() : { available: false }))
      .then((body) => { if (alive) setCodes(body); })
      .catch(() => { if (alive) setCodes({ available: false }); });
    return () => { alive = false; };
  }, []);

  if (!codes || codes.available === false || !Number.isInteger(codes.redeemed)) return null;
  const left = Math.max(0, codes.total - codes.redeemed);
  return (
    <div className="launch-codes" role="status">
      <span className="launch-codes-num">{left.toLocaleString('en-US')}</span>
      <span className="launch-codes-label">
        of {codes.total.toLocaleString('en-US')} free codes left
        <small>Counted from redemptions at checkout · updates every minute</small>
      </span>
    </div>
  );
}

export default function LaunchPage() {
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

          <div className="plugin-cta-row">
            <a href={INSTAGRAM_DM} target="_blank" rel="noopener noreferrer" className="btn plugin-btn">
              <Icon name="external" /> Ask for a code on Instagram
            </a>
            <CodesLeft />
          </div>

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
          <h2>How to get a free code</h2>
          <ol className="launch-steps">
            {LAUNCH.steps.map(([head, text], i) => (
              <li key={head}>
                <span className="launch-step-num">{i + 1}</span>
                <div><strong>{head}</strong><p>{text}</p></div>
              </li>
            ))}
          </ol>
          <p>
            Codes go to the first {LAUNCH.codesTotal.toLocaleString('en-US')} people who ask. After that the
            plugins are still on sale at the prices below.
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
