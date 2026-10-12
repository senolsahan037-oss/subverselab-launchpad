import React from 'react';
import ToolsStrip from './ToolsStrip';
import { Link } from 'react-router-dom';
import PageMeta from './PageMeta';
import FamilyOffer from './FamilyOffer';
import BuyButton from './BuyButton';
import LaunchPrice from './LaunchPrice';
import { useFamilyLive } from '../hooks/useFamilyLive';
import { useLaunch1Full } from '../hooks/useLaunchCounter';
import {
  PLUGINS_INDEX, PLUGINS, FAMILY_ONLY_PLUGINS, FREE_PLUGINS, LINE2_PLUGINS, SOLO_PLUGINS, line2AvailableLine, PRICES, FORMATS, LAUNCH2, RELEASE2_LABEL, RELEASE3_LABEL,
  FAMILY_PRICE, UPDATES_LINE, TRUST_LINE, launchPriceActive, launchNote,
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
      <span className="plugin-card-buy-note">{UPDATES_LINE}</span>
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
                <span className="plugin-card-badge">${PRICES[p.slug]} · or in the family</span>
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
          {familyLive ? <>All seven are out. <b>{LAUNCH2.offerNow}</b></> : <>Four more out {RELEASE2_LABEL}. <b>{LAUNCH2.offerBefore}</b>.</>}
        </span>
        <span className="plugin-strip-go">{familyLive ? 'How the family works →' : 'See the four →'}</span>
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
                <span className="plugin-card-badge">${PRICES[p.slug]}{familyLive ? ' · or in the family' : ` · Out ${RELEASE2_LABEL}`}</span>
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

      {/* The family offer right under the seven, then ELEK (sold on its own) under it, then the coming ones (owner, 12 Oct) */}
      <FamilyOffer style={{ marginTop: '24px' }} />

      {SOLO_PLUGINS.length > 0 && (
        <>
          <div className="plugin-strip" style={{ margin: '40px 0 24px' }}>
            <span className="plugin-strip-tag">New</span>
            <span className="plugin-strip-text"><b>Out now, sold on its own.</b> {SOLO_PLUGINS.map((p) => p.displayName).join(', ')}: stems, vocal removal, key and tempo, on your Mac.</span>
          </div>
          <div className="plugin-card-list">
        {SOLO_PLUGINS.map((p) => (
          <div key={p.slug} className="plugin-card-item">
          <Link to={p.path} className="plugin-card">
            <div className="plugin-card-media">
              <img src={p.cardImage} alt={`${p.displayName}'s window`} width={p.imageSize[0]}
                   height={p.imageSize[1]} loading="lazy" />
            </div>
            <div className="plugin-card-body">
              <div className="plugin-card-top">
                <span className="plugin-card-badge"><LaunchPrice slug={p.slug} note={false} />{launchPriceActive(p.slug) ? ' · launch price' : ''}</span>
              </div>
              <h2 className="plugin-card-title">{p.displayName} <span>{p.kind} · Model {p.model}</span></h2>
              <p className="plugin-card-text">{p.description}</p>
              <span className="plugin-card-link">See {p.displayName} →</span>
            </div>
          </Link>
          <div className="plugin-card-buy">
            <BuyButton slug={p.slug} className="btn btn-outline plugin-buy-single" />
            <span className="plugin-card-buy-note">{launchPriceActive(p.slug) ? `${launchNote(p.slug)[0].toUpperCase()}${launchNote(p.slug).slice(1)}. ` : ''}{UPDATES_LINE}</span>
          </div>
          </div>
        ))}
          </div>
        </>
      )}

      <div className="plugin-strip" style={{ margin: '40px 0 24px' }}>
        <span className="plugin-strip-tag">Soon</span>
        <span className="plugin-strip-text"><b>Two more, {RELEASE3_LABEL ? `out ${RELEASE3_LABEL}` : 'coming soon'}.</b> Sold on their own.</span>
      </div>
      <div className="plugin-card-list">
        {LINE2_PLUGINS.map((p) => (
          <div key={p.slug} className="plugin-card-item">
          <Link to={p.path} className="plugin-card">
            <div className="plugin-card-media">
              <img src={p.cardImage} alt={`${p.displayName}'s front panel`} width={p.imageSize[0]}
                   height={p.imageSize[1]} loading="lazy" />
            </div>
            <div className="plugin-card-body">
              <div className="plugin-card-top">
                <span className="plugin-card-badge">{line2AvailableLine(p)}</span>
              </div>
              <h2 className="plugin-card-title">{p.displayName} <span>{p.kind} · Model {p.model}</span></h2>
              <p className="plugin-card-text">{p.description}</p>
              <span className="plugin-card-link">See {p.displayName} →</span>
            </div>
          </Link>
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

      <p className="plugin-trust">{TRUST_LINE}</p>
      <ToolsStrip />
    </div>
  );
}
