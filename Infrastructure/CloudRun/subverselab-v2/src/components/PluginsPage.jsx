import React from 'react';
import ToolsStrip from './ToolsStrip';
import { Link } from 'react-router-dom';
import PageMeta from './PageMeta';
import LaunchCountdown from './LaunchCountdown';
import FamilyOffer from './FamilyOffer';
import BuyButton from './BuyButton';
import { useFamilyLive } from '../hooks/useFamilyLive';
import { useLaunch1Full } from '../hooks/useLaunchCounter';
import {
  PLUGINS_INDEX, PLUGINS, FAMILY_ONLY_PLUGINS, FREE_PLUGINS, PRICES, FORMATS, LAUNCH, LAUNCH2, RELEASE_LABEL, RELEASE2_LABEL, RELEASE2_AT,
  FAMILY_VALUE_LINE, FAMILY_PRICE, FAMILY_UNTIL, UPDATES_LINE,
} from '../data/plugins';

// The Plugins tab: software that runs inside the visitor's own DAW, as opposed
// to the browser tools on the storefront. One card per plugin in
// src/data/plugins.js — the page does not pad itself out with placeholders.

// Buy row under a plugin card (a button must not sit inside the card's link): the family is the highlighted
// best-value button, the single the quieter one beside it.
function CardBuy({ slug, full, familyLive }) {
  return (
    <div className="plugin-card-buy">
      {familyLive && <BuyButton slug="family" label={`Get the family — $${FAMILY_PRICE}`} />}
      <BuyButton slug={slug} full={full} className={familyLive ? 'btn btn-outline plugin-buy-single' : 'btn btn-primary'} />
      <span className="plugin-card-buy-note">{familyLive ? `${FAMILY_UNTIL}, all seven. ` : ''}{UPDATES_LINE}</span>
    </div>
  );
}

export default function PluginsPage() {
  const full = useLaunch1Full();
  const familyLive = useFamilyLive();
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
            ? <>Out now. <b>The free 1,000 are gone — Kubbe and Kaset are ${PRICES.kubbe} each</b> — see the launch page.</>
            : <>Both out {RELEASE_LABEL}. <b>{LAUNCH.offer}</b> — enter the Download Room.</>}
        </span>
        <LaunchCountdown compact />
        <span className="plugin-strip-go">{full ? 'Buy →' : 'How it works →'}</span>
      </Link>

      <div className="plugin-card-list">
        {PLUGINS.map((p) => (
          <div key={p.slug} className="plugin-card-item">
          <Link to={p.path} className="plugin-card">
            <div className="plugin-card-media">
              <img src={p.cardImage} alt={`${p.name}'s front panel`} width={p.imageSize[0]}
                   height={p.imageSize[1]} loading="lazy" />
            </div>
            <div className="plugin-card-body">
              <div className="plugin-card-top">
                <span className="plugin-card-badge">${PRICES[p.slug]} · out now</span>
                <LaunchCountdown compact />
              </div>
              <h2 className="plugin-card-title">{p.name} <span>{p.kind} · Model {p.model}</span></h2>
              <p className="plugin-card-text">{p.description}</p>
              <span className="plugin-card-link">See {p.name} →</span>
            </div>
          </Link>
          <CardBuy slug={p.slug} full={full} familyLive={familyLive} />
          </div>
        ))}
      </div>

      <Link to={LAUNCH2.path} className="plugin-strip" style={{ margin: '40px 0 24px' }}>
        <span className="plugin-strip-tag">Next</span>
        <span className="plugin-strip-text">
          {familyLive ? 'Five more' : 'Four more'} out {RELEASE2_LABEL}. <b>{familyLive ? LAUNCH2.offerNow : LAUNCH2.offerBefore}</b>{familyLive ? <> — {FAMILY_VALUE_LINE}.</> : '.'}
        </span>
        <LaunchCountdown compact target={RELEASE2_AT} />
        <span className="plugin-strip-go">{familyLive ? 'How it works →' : 'See the four →'}</span>
      </Link>

      <div className="plugin-card-list">
        {FAMILY_ONLY_PLUGINS.map((p) => (
          <div key={p.slug} className="plugin-card-item">
          <Link to={p.path} className="plugin-card">
            <div className="plugin-card-media">
              <img src={p.cardImage} alt={`${p.name}'s front panel`} width={p.imageSize[0]}
                   height={p.imageSize[1]} loading="lazy" />
            </div>
            <div className="plugin-card-body">
              <div className="plugin-card-top">
                <span className="plugin-card-badge">${PRICES[p.slug]}{familyLive ? ' · or in the family' : ''} · Out {RELEASE2_LABEL}</span>
                <LaunchCountdown compact target={RELEASE2_AT} />
              </div>
              <h2 className="plugin-card-title">{p.name} <span>{p.kind} · Model {p.model}</span></h2>
              <p className="plugin-card-text">{p.description}</p>
              <span className="plugin-card-link">See {p.name} →</span>
            </div>
          </Link>
          <CardBuy slug={p.slug} familyLive={familyLive} />
          </div>
        ))}
      </div>

      {FREE_PLUGINS.length > 0 && (
        <>
          <div className="plugin-strip" style={{ margin: '40px 0 24px' }}>
            <span className="plugin-strip-tag">Free</span>
            <span className="plugin-strip-text"><b>Free, forever.</b> The checkout asks for an e-mail address, no card.</span>
          </div>
          <div className="plugin-card-list">
            {FREE_PLUGINS.map((p) => (
              <div key={p.slug} className="plugin-card-item">
              <Link to={p.path} className="plugin-card">
                <div className="plugin-card-media">
                  <img src={p.cardImage} alt={`${p.displayName}'s front panel`} width={p.imageSize[0]}
                       height={p.imageSize[1]} loading="lazy" />
                </div>
                <div className="plugin-card-body">
                  <div className="plugin-card-top">
                    <span className="plugin-card-badge">Free · out now</span>
                  </div>
                  <h2 className="plugin-card-title">{p.displayName} <span>{p.kind} · Model {p.model}</span></h2>
                  <p className="plugin-card-text">{p.description}</p>
                  <span className="plugin-card-link">See {p.displayName} →</span>
                </div>
              </Link>
              <div className="plugin-card-buy">
                <BuyButton slug={p.slug} label={`Get ${p.displayName} free`} />
              </div>
              </div>
            ))}
          </div>
        </>
      )}

      <FamilyOffer style={{ marginTop: '24px' }} />
      <ToolsStrip />
    </div>
  );
}
