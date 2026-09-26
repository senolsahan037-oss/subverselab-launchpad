import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from './PageMeta';
import Icon from './Icon';
import LaunchCountdown from './LaunchCountdown';
import BuyButton from './BuyButton';
import DownloadButtons from './DownloadButtons';
import {
  INSTAGRAM_DM, LAUNCH, PRICES, FORMATS, RELEASE_LABEL, LICENCE_FACTS, PLUGINS,
} from '../data/plugins';
import { SITE_URL } from '../data/siteMeta';

/*  One plugin's page — /plugins/kubbe, /plugins/kaset.
 *
 *  Driven entirely by the plugin's entry in src/data/plugins.js, so the two
 *  pages cannot drift apart in structure and prerender.js reads the same
 *  words. A page, not a synced product (Rules/02): the checkout, the licence
 *  key and the download are Lemon Squeezy's; this page links to the checkout
 *  and explains the launch code.
 */

export default function PluginPage({ plugin }) {
  const [modeKey, setModeKey] = useState(plugin.defaultMode);
  const mode = plugin.modes.find((m) => m.key === modeKey) || plugin.modes[0];
  const other = PLUGINS.find((p) => p.slug !== plugin.slug);
  const [w, h] = plugin.imageSize;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `SubverseLab ${plugin.name}`,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'macOS, Windows',
    url: `${SITE_URL}${plugin.path}`,
    image: `${SITE_URL}${plugin.og}`,
    offers: { '@type': 'Offer', price: String(PRICES[plugin.slug]), priceCurrency: 'USD' },
    author: { '@type': 'Person', name: 'Şenol Şahan' },
    publisher: { '@type': 'Organization', name: 'SubverseLab', url: SITE_URL },
    description: plugin.description,
  };

  return (
    <div className="plugin-page">
      <PageMeta title={plugin.title} description={plugin.description} path={plugin.path}
                image={`${SITE_URL}${plugin.og}`} />
      <script type="application/ld+json">{JSON.stringify(schema)}</script>

      <section className="plugin-hero">
        <div className="container plugin-hero-inner">
          <Link to="/plugins" className="plugin-back">← Plugins</Link>
          <p className="plugin-kicker">SubverseLab · {plugin.kind} · Model {plugin.model}</p>
          <h1 className="plugin-title">{plugin.displayName}</h1>
          <p className="plugin-tagline">{plugin.tagline}</p>

          <div className="plugin-offer">
            <div>
              <p className="plugin-offer-head">${PRICES[plugin.slug]} · out {RELEASE_LABEL}</p>
              <p className="plugin-offer-sub">{FORMATS}</p>
            </div>
            <LaunchCountdown />
          </div>

          <div className="plugin-cta-row">
            <BuyButton slug={plugin.slug} className="btn plugin-btn" />
            <Link to={LAUNCH.path} className="plugin-cta-note">
              {LAUNCH.offer} — how the launch code works →
            </Link>
          </div>

          <figure className="plugin-panel">
            <img src={mode.image} alt={`${plugin.name}'s front panel with ${mode.name} selected`}
                 width={w} height={h} />
          </figure>

          <div className="plugin-places" role="tablist" aria-label={plugin.modesLabel}>
            {plugin.modes.map((m, i) => (
              <button key={m.key} role="tab" aria-selected={m.key === mode.key}
                      className={`plugin-place ${m.key === mode.key ? 'active' : ''}`}
                      onClick={() => setModeKey(m.key)}>
                <span className="plugin-place-num">{i + 1}</span>{m.name}
              </button>
            ))}
          </div>
          <p className="plugin-place-text" aria-live="polite">{mode.text}</p>
        </div>
      </section>

      <div className="container" style={{ maxWidth: '820px', padding: '56px 20px 96px' }}>
        <p className="plugin-lead">{plugin.intro}</p>

        {plugin.sections.map((s) => (
          <section key={s.heading} className="plugin-section">
            <h2>{s.heading}</h2>
            <p>{s.text}</p>
          </section>
        ))}

        <section className="plugin-section">
          <h2>The controls</h2>
          <div className="plugin-controls">
            {plugin.controls.map(([name, what]) => (
              <div key={name} className="plugin-control">
                <strong>{name}</strong>
                <span>{what}</span>
              </div>
            ))}
          </div>
          {plugin.controlsNote && <p style={{ marginTop: '16px' }}>{plugin.controlsNote}</p>}
        </section>

        <section className="plugin-section">
          <h2>Price and licence</h2>
          <p>
            ${PRICES[plugin.slug]} on its own, or ${PRICES.bundle} together with {other.name}.
            Sold through Lemon Squeezy, which e-mails the licence key and the download after checkout.
          </p>
          <p>{LICENCE_FACTS.noDemo}</p>
          <p>{LICENCE_FACTS.oneComputer} <Link to={`${plugin.manualPage}#licence`}>Activation step by step.</Link></p>
          <div className="plugin-buy-row">
            <BuyButton slug={plugin.slug} />
            <BuyButton slug="bundle" label={`Both plugins — $${PRICES.bundle}`} className="btn btn-outline" />
          </div>
        </section>

        <section className="plugin-section">
          <h2>Free launch code</h2>
          <p>
            {LAUNCH.askHow}. The first {LAUNCH.codesTotal.toLocaleString('en-US')} people get a code that
            takes the price to zero at checkout. <Link to={LAUNCH.path}>The four steps are on the launch page.</Link>
          </p>
        </section>

        {plugin.notYet.length > 0 && (
          <section className="plugin-section">
            <h2>Not done yet</h2>
            <ul>
              {plugin.notYet.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </section>
        )}

        <section className="plugin-section">
          <h2>Download</h2>
          <p>
            The installers are free to download: without a licence the plugin shows its activation card and
            passes audio through untouched. Installation steps are in the manual.
          </p>
          <DownloadButtons slug={plugin.slug} />
        </section>

        <section className="plugin-section">
          <h2>Manual</h2>
          <p>
            Installation on macOS and Windows, every control with its range and default, recipes,
            specifications and licence activation.
          </p>
          <p>
            <Link to={plugin.manualPage}>Read the {plugin.name} manual</Link>
            {' · '}
            <a href={plugin.manual} target="_blank" rel="noopener noreferrer">PDF</a>
          </p>
        </section>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
          <a href={INSTAGRAM_DM} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            <Icon name="external" /> Ask for a code on Instagram
          </a>
          <Link to={other.path} className="btn btn-outline">See {other.name}</Link>
        </div>
      </div>
    </div>
  );
}
