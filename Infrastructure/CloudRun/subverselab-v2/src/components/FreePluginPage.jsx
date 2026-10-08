import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ToolsStrip from './ToolsStrip';
import PageMeta from './PageMeta';
import BuyButton from './BuyButton';
import DownloadButtons from './DownloadButtons';
import { FORMATS } from '../data/plugins';
import { SITE_URL } from '../data/siteMeta';

/*  A free plugin's page (/plugins/taban), driven by its entry in FREE_PLUGINS (src/data/plugins.js).
 *
 *  Same look as PluginPage, without the launch, price and family logic: the plugin is free forever.
 *  "Get it free" opens a $0 Lemon Squeezy checkout (an e-mail address, no card). That order is what
 *  opens the download: the buttons below use the 'free' ticket route (server.js), and the same
 *  download sits on /account.
 */
export const FREE_NOTE = 'Free, forever. The checkout asks for an e-mail address, no card. The download then appears here and on your account page.';

export default function FreePluginPage({ plugin }) {
  const [modeKey, setModeKey] = useState(plugin.defaultMode);
  const mode = plugin.modes.find((m) => m.key === modeKey) || plugin.modes[0];
  const [w, h] = plugin.imageSize;
  const getLabel = `Get ${plugin.displayName} free`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `SubverseLab ${plugin.displayName}`,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'macOS, Windows',
    url: `${SITE_URL}${plugin.path}`,
    image: `${SITE_URL}${plugin.og}`,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: { '@type': 'Person', name: 'Şenol Şahan' },
    publisher: { '@type': 'Organization', name: 'SubverseLab', url: SITE_URL },
    description: plugin.description,
  };

  return (
    <div className="plugin-page">
      <PageMeta title={plugin.title} description={plugin.description} path={plugin.path} image={`${SITE_URL}${plugin.og}`} />
      <script type="application/ld+json">{JSON.stringify(schema)}</script>

      <section className="plugin-hero">
        <div className="container plugin-hero-inner">
          <Link to="/plugins" className="plugin-back">← Plugins</Link>
          <p className="plugin-kicker">SubverseLab · {plugin.kind} · Model {plugin.model}</p>
          <h1 className="plugin-title">{plugin.displayName}</h1>
          <p className="plugin-tagline">{plugin.tagline}</p>

          <div className="plugin-offer">
            <div>
              <p className="plugin-offer-head">Free · forever</p>
              <p className="plugin-offer-sub">{plugin.formats || FORMATS}</p>
            </div>
          </div>

          <div className="plugin-cta-row">
            <BuyButton slug={plugin.slug} className="btn plugin-btn" label={getLabel} />
            <span className="plugin-cta-note">An e-mail address, no card.</span>
          </div>

          <figure className="plugin-panel">
            <img src={mode.image} alt={`${plugin.displayName}'s front panel: ${mode.name}`} width={w} height={h} />
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
          <h2>Get it free</h2>
          <p>{FREE_NOTE}</p>
          <div className="plugin-buy-row">
            <BuyButton slug={plugin.slug} label={getLabel} />
          </div>
        </section>

        <section className="plugin-section">
          <h2>Download</h2>
          <p>
            Got it free already? Sign in with the e-mail you used at the checkout and download. Installation steps are in the manual.
          </p>
          <DownloadButtons slug={plugin.slug} launchId="free" paid />
        </section>

        {plugin.manual && (
          <section className="plugin-section">
            <h2>Manual</h2>
            <p>
              Every control with its range and default, recipes, how it works, specifications and installation.
              {' '}<a href={plugin.manual} target="_blank" rel="noopener noreferrer">Read the {plugin.displayName} manual (PDF)</a>
            </p>
          </section>
        )}

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
          <Link to="/plugins" className="btn btn-outline">See every plugin</Link>
        </div>
        <ToolsStrip />
      </div>
    </div>
  );
}
