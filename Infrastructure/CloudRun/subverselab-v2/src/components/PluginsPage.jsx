import React from 'react';
import { Link } from 'react-router-dom';
import PageMeta from './PageMeta';
import LaunchCountdown from './LaunchCountdown';
import BuyButton from './BuyButton';
import { useLaunch1Full } from '../hooks/useLaunchCounter';
import {
  PLUGINS_INDEX, PLUGINS, LAUNCH2_PLUGINS, PRICES, FORMATS, LAUNCH, LAUNCH2, RELEASE_LABEL, RELEASE2_LABEL, RELEASE2_AT,
} from '../data/plugins';

// The Plugins tab: software that runs inside the visitor's own DAW, as opposed
// to the browser tools on the storefront. One card per plugin in
// src/data/plugins.js — the page does not pad itself out with placeholders.

export default function PluginsPage() {
  const full = useLaunch1Full();
  return (
    <div className="container" style={{ padding: '40px 20px 96px' }}>
      <PageMeta title={PLUGINS_INDEX.title} description={PLUGINS_INDEX.description} path={PLUGINS_INDEX.path} />

      <header style={{ marginBottom: '28px', maxWidth: '680px' }}>
        <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: '900', margin: '0 0 10px' }}>Plugins</h1>
        <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.6', margin: 0 }}>
          Audio plugins you install in your own DAW. The web tools stay free in the browser; these
          run inside Live, Logic or any host that loads VST3 or AU. {FORMATS}.
        </p>
      </header>

      <Link to={LAUNCH.path} className="plugin-strip" style={{ marginBottom: '24px' }}>
        <span className="plugin-strip-tag">Launch</span>
        <span className="plugin-strip-text">
          {full
            ? <>Out now. <b>The free 1,000 are gone — ${PRICES.kubbe} each, ${PRICES.bundle} for both</b> — see the launch page.</>
            : <>Both out {RELEASE_LABEL}. <b>{LAUNCH.offer}</b> — enter the Download Room.</>}
        </span>
        <LaunchCountdown compact />
        <span className="plugin-strip-go">{full ? 'Buy →' : 'How it works →'}</span>
      </Link>

      <div className="plugin-card-list">
        {PLUGINS.map((p) => (
          <Link key={p.slug} to={p.path} className="plugin-card">
            <div className="plugin-card-media">
              <img src={p.cardImage} alt={`${p.name}'s front panel`} width={p.imageSize[0]}
                   height={p.imageSize[1]} loading="lazy" />
            </div>
            <div className="plugin-card-body">
              <div className="plugin-card-top">
                <span className="plugin-card-badge">${PRICES[p.slug]} · out {RELEASE_LABEL}</span>
                <LaunchCountdown compact />
              </div>
              <h2 className="plugin-card-title">{p.name} <span>{p.kind} · Model {p.model}</span></h2>
              <p className="plugin-card-text">{p.description}</p>
              <span className="plugin-card-link">See {p.name} →</span>
            </div>
          </Link>
        ))}
      </div>

      <section className="plugin-bundle">
        <div>
          <h2>Both plugins — ${PRICES.bundle}</h2>
          <p>Kubbe and Kaset together, one checkout. On their own they are ${PRICES.kubbe} each.</p>
        </div>
        <BuyButton slug="bundle" full={full} label={`Buy both — $${PRICES.bundle}`} />
      </section>

      <Link to={LAUNCH2.path} className="plugin-strip" style={{ margin: '40px 0 24px' }}>
        <span className="plugin-strip-tag">Next</span>
        <span className="plugin-strip-text">
          Four more out {RELEASE2_LABEL}. <b>{LAUNCH2.offer}</b> — enter the Download Room.
        </span>
        <LaunchCountdown compact target={RELEASE2_AT} />
        <span className="plugin-strip-go">How it works →</span>
      </Link>

      <div className="plugin-card-list">
        {LAUNCH2_PLUGINS.map((p) => (
          <Link key={p.slug} to={p.path} className="plugin-card">
            <div className="plugin-card-media">
              <img src={p.cardImage} alt={`${p.name}'s front panel`} width={p.imageSize[0]}
                   height={p.imageSize[1]} loading="lazy" />
            </div>
            <div className="plugin-card-body">
              <div className="plugin-card-top">
                <span className="plugin-card-badge">${PRICES.bundle4} bundle · out {RELEASE2_LABEL}</span>
                <LaunchCountdown compact target={RELEASE2_AT} />
              </div>
              <h2 className="plugin-card-title">{p.name} <span>{p.kind} · Model {p.model}</span></h2>
              <p className="plugin-card-text">{p.description}</p>
              <span className="plugin-card-link">See {p.name} →</span>
            </div>
          </Link>
        ))}
      </div>

      <section className="plugin-bundle" style={{ marginTop: '24px' }}>
        <div>
          <h2>All four — ${PRICES.bundle4}</h2>
          <p>KORO, YANKI, HAVA and MIHENK together, one checkout.</p>
        </div>
        <BuyButton slug="bundle4" label={`Buy all four — $${PRICES.bundle4}`} />
      </section>
    </div>
  );
}
