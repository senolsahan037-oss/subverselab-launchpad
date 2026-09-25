import React from 'react';
import { Link } from 'react-router-dom';
import PageMeta from './PageMeta';
import LaunchCountdown from './LaunchCountdown';
import BuyButton from './BuyButton';
import { PLUGINS_INDEX, PLUGINS, PRICES, FORMATS, LAUNCH, RELEASE_LABEL } from '../data/plugins';

// The Plugins tab: software that runs inside the visitor's own DAW, as opposed
// to the browser tools on the storefront. One card per plugin in
// src/data/plugins.js — the page does not pad itself out with placeholders.

export default function PluginsPage() {
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
          Both out {RELEASE_LABEL}. <b>{LAUNCH.offer}</b> — send the plugin’s name to @subverse_lab on Instagram.
        </span>
        <LaunchCountdown compact />
        <span className="plugin-strip-go">How it works →</span>
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
        <BuyButton slug="bundle" label={`Buy both — $${PRICES.bundle}`} />
      </section>
    </div>
  );
}
