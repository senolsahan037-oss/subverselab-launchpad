import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ToolsStrip from './ToolsStrip';
import PageMeta from './PageMeta';
import BuyButton from './BuyButton';
import LaunchCountdown from './LaunchCountdown';
import LaunchPrice from './LaunchPrice';
import {
  CHECKOUT, FORMATS, RELEASE3_AT, UPDATES_LINE, ACTIVATION_SHORT, currentPrice,
  line2AvailableLine, line2Price, trustLineFor,
} from '../data/plugins';
import { SITE_URL } from '../data/siteMeta';

/*  A page of the second line (/plugins/adalet, /plugins/seda), driven by LINE2_PLUGINS in src/data/plugins.js.
 *
 *  Same look as PluginPage, without the family and launch logic: these two are sold on their own and are not in the
 *  family. While CHECKOUT has no entry for the slug the buy area is a closed button reading
 *  "Coming soon" (no price until the checkout exists) and nothing links to a checkout. Paste the checkout URL into CHECKOUT (plugins.js)
 *  and the real BuyButton takes its place; the downloads, licence key and account wiring are still to be done
 *  (RELEASE_QUEUE.md) and are NOT part of this page.
 *
 *  SOLO_PLUGINS (ELEK, launchId 'solo') use the same page but are already on sale: the BuyButton is always drawn (disabled as
 *  "Available shortly" while CHECKOUT has no entry), the price is shown with its launch price (LaunchPrice) and the download
 *  is on the Account page.
 */
export default function NewLinePluginPage({ plugin }) {
  const [modeKey, setModeKey] = useState(plugin.defaultMode);
  const mode = plugin.modes.find((m) => m.key === modeKey) || plugin.modes[0];
  const [w, h] = plugin.imageSize;
  const open = Boolean(CHECKOUT[plugin.slug]);
  const solo = plugin.launchId === 'solo';
  const availableLine = line2AvailableLine(plugin);
  const trust = trustLineFor(plugin.slug);
  // JSON-LD: the price a buyer pays now (the launch price while it lasts).
  const schemaPrice = solo ? String(currentPrice(plugin.slug)) : line2Price(plugin).slice(1);

  const buy = solo
    ? <BuyButton slug={plugin.slug} className="btn plugin-btn" />
    : open
    ? <BuyButton slug={plugin.slug} className="btn plugin-btn" />
    : <button type="button" className="btn plugin-btn plugin-buy-closed" disabled>{availableLine}</button>;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `SubverseLab ${plugin.displayName}`,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: solo ? 'macOS' : 'macOS, Windows',
    url: `${SITE_URL}${plugin.path}`,
    image: `${SITE_URL}${plugin.og}`,
    ...(open || solo ? { offers: { '@type': 'Offer', price: schemaPrice, priceCurrency: 'USD', availability: 'https://schema.org/InStock' } } : {}),
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
          <p className="plugin-kicker">SubverseLab · {plugin.kind}{plugin.model ? ` · Model ${plugin.model}` : ''}</p>
          <h1 className="plugin-title">{plugin.displayName}</h1>
          <p className="plugin-tagline">{plugin.tagline}</p>

          <div className="plugin-offer">
            <div>
              <p className="plugin-offer-head">{solo ? <LaunchPrice slug={plugin.slug} /> : open ? line2Price(plugin) : availableLine}</p>
              <p className="plugin-offer-sub">{plugin.formats || FORMATS}</p>
            </div>
            {!solo && RELEASE3_AT && <LaunchCountdown target={RELEASE3_AT} hideWhenOut />}
          </div>

          <div className="plugin-cta-row">
            {buy}
          </div>
          <p className="plugin-trust">{trust}</p>

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
          <h2>{solo ? 'Price and download' : 'Price and availability'}</h2>
          {solo
            ? <p><LaunchPrice slug={plugin.slug} />. {UPDATES_LINE} After you buy, the download and your licence key appear on your <Link to="/account">Account page</Link>; sign in with the e-mail you paid with. {ACTIVATION_SHORT}</p>
            : <p>{availableLine}. {UPDATES_LINE}</p>}
          <div className="plugin-buy-row">{buy}</div>
          <p className="plugin-trust">{trust}</p>
        </section>

        {plugin.manual && (
          <section className="plugin-section">
            <h2>Manual</h2>
            <p>
              The operations, the window, where the files go, specifications and installation.
              {' '}<a href={plugin.manual} target="_blank" rel="noopener noreferrer">Read the {plugin.name} manual (PDF)</a>
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
