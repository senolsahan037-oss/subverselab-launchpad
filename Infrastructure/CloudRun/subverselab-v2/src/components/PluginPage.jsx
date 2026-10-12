import React, { useState } from 'react';
import ToolsStrip from './ToolsStrip';
import { Link } from 'react-router-dom';
import PageMeta from './PageMeta';
import Icon from './Icon';
import LaunchCountdown from './LaunchCountdown';
import BuyButton from './BuyButton';
import { useFamilyLive } from '../hooks/useFamilyLive';
import DownloadButtons from './DownloadButtons';
import PluginDemos from './PluginDemos';
import {
  INSTAGRAM_DM, LAUNCH, LAUNCH2, PRICES, FORMATS, PLUGINS, PRESS_KIT, RELEASE2_AT,
  FAMILY_NAME, FAMILY_PRICE, FAMILY_REGULAR_PRICE, UPDATES_LINE, ACTIVATION_LINE, trustLineFor, familyOfferEndLabel,
} from '../data/plugins';
import { SITE_URL } from '../data/siteMeta';
import { useLaunch1Full } from '../hooks/useLaunchCounter';

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
  // Free 1,000 of launch 1 gone (counter read and full): Kubbe/Kaset pages show the buy call.
  const full = useLaunch1Full() && plugin.launchId !== 'launch2';
  const familyLive = useFamilyLive();
  const mode = plugin.modes.find((m) => m.key === modeKey) || plugin.modes[0];
  // Launch 2 products (KORO, YANKI, HAVA, MIHENK, TUTKAL) are sold on their own
  // and in the plugin family and download through /launch2; Kubbe and Kaset are
  // sold the same way and keep their own launch page.
  const second = plugin.launchId === 'launch2';
  const launch = second ? LAUNCH2 : LAUNCH;
  const other = PLUGINS.find((p) => p.slug !== plugin.slug) || PLUGINS[0];
  const releaseLabel = second && !familyLive ? plugin.releaseLabel : 'now';
  // One price block per page (decisions 2026-10-10): the head names the price and the family; the note under the
  // buttons carries the end date, the regular price and the updates line, once.
  const headPrice = second && !familyLive
    ? null
    : familyLive ? `$${PRICES[plugin.slug]} · or all seven for $${FAMILY_PRICE}` : `$${PRICES[plugin.slug]}`;
  const trust = trustLineFor(plugin.slug);
  const offerPrice = PRICES[plugin.slug];
  const [w, h] = plugin.imageSize;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `SubverseLab ${plugin.name}`,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'macOS, Windows',
    url: `${SITE_URL}${plugin.path}`,
    image: `${SITE_URL}${plugin.og}`,
    ...(offerPrice == null ? {} : { offers: { '@type': 'Offer', price: String(offerPrice), priceCurrency: 'USD' } }),
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
              <p className="plugin-offer-head">{headPrice || `Out ${releaseLabel}`}</p>
              <p className="plugin-offer-sub">{plugin.formats || FORMATS}</p>
            </div>
            {second ? <LaunchCountdown target={RELEASE2_AT} hideWhenOut /> : <LaunchCountdown hideWhenOut />}
          </div>

          <div className="plugin-cta-row">
            {/* The family is the highlighted best-value offer; the single is the quieter button beside it. */}
            {familyLive && <BuyButton slug="family" className="btn plugin-btn" label={`Get the family — $${FAMILY_PRICE}`} />}
            <BuyButton slug={plugin.slug} className={familyLive ? 'btn btn-outline plugin-buy-single' : 'btn plugin-btn'} full={second ? undefined : full} />
            <Link to={familyLive ? LAUNCH2.path : launch.path} className="plugin-cta-note">
              {familyLive
                ? `Launch price $${FAMILY_PRICE} until ${familyOfferEndLabel()} (regular $${FAMILY_REGULAR_PRICE}). ${UPDATES_LINE}`
                : second
                  ? `Out ${releaseLabel} — see the launch page`
                  : full
                    ? `$${PRICES.kubbe} each — see the launch page`
                    : `${launch.offer} — enter the Download Room`} →
            </Link>
          </div>
          <p className="plugin-trust">{trust}</p>

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

        <PluginDemos plugin={plugin} />

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

        {plugin.notYet.length > 0 && (
          <section className="plugin-section">
            <h2>Not done yet</h2>
            <ul>
              {plugin.notYet.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </section>
        )}

        <section className="plugin-section">
          <h2>Buying and downloading</h2>
          <p className="plugin-trust">{trust}</p>
          <p>Sold through Lemon Squeezy; the download and your licence key appear on your Account page within a minute.</p>
        </section>

        <section className="plugin-section">
          <h2>{second ? 'Download Room' : full ? 'Download Room' : 'Free Download Room'}</h2>
          {second && !familyLive ? (
            <p>
              {plugin.displayName} is out {plugin.releaseLabel}. Downloads open from that day on <Link to={launch.path}>the launch page</Link>.
            </p>
          ) : second ? (
            <p>
              Buy {plugin.displayName} or the family, then sign in on <Link to={launch.path}>the family page</Link> with the e-mail you paid with and download.
            </p>
          ) : full ? (
            <p>
              Bought it? Sign in on <Link to={launch.path}>the launch page</Link> with your order e-mail and download.
            </p>
          ) : (
            <p>
              {launch.askHow}. The first {launch.codesTotal.toLocaleString('en-US')} producers can download both plugins. <Link to={launch.path}>The steps are on the launch page.</Link>
            </p>
          )}
        </section>

        <section className="plugin-section">
          <h2>Download</h2>
          {second && !familyLive ? (
            <p>Downloads open on {plugin.releaseLabel}.</p>
          ) : second ? (
            <p>
              Downloads open once your family purchase is confirmed. Buy above, then sign in on <Link to={launch.path}>the family page</Link> with the e-mail you paid with. Installation steps are in the manual.
            </p>
          ) : full ? (
            <p>
              Downloads open once your purchase is confirmed. Buy above, then sign in on <Link to={launch.path}>the launch page</Link> with the e-mail you paid with. Installation steps are in the manual.
            </p>
          ) : (
            <>
              <p>
                Sign in to enter the Download Room. {ACTIVATION_LINE} Installation steps are in the manual.
              </p>
              <DownloadButtons slug={plugin.slug} launchId={plugin.launchId || 'launch'} />
            </>
          )}
        </section>

        {plugin.manual && !plugin.manualPage && (
          <section className="plugin-section">
            <h2>Manual</h2>
            <p>
              Every control with its range and default, quick-start recipes, specifications and installation.
              {' '}<a href={plugin.manual} target="_blank" rel="noopener noreferrer">Read the {plugin.name} manual (PDF)</a>
            </p>
          </section>
        )}

        {plugin.manualPage && (
          <section className="plugin-section">
            <h2>Manual</h2>
            <p>
              Installation on macOS and Windows, every control with its range and default, recipes,
              specifications and installation.
            </p>
            <p>
              <Link to={plugin.manualPage}>Read the {plugin.name} manual</Link>
              {' · '}
              <a href={plugin.manual} target="_blank" rel="noopener noreferrer">PDF</a>
            </p>
            <p>
              Writing about {plugin.name}? <a href={PRESS_KIT}>Press kit</a> — screenshots, demo
              video links, logos and a fact sheet (zip, 5 MB).
            </p>
          </section>
        )}

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
          {!second && !full && (
            <a href={INSTAGRAM_DM} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              <Icon name="external" /> DM “{plugin.name.toUpperCase()}” on Instagram
            </a>
          )}
          <Link to={second ? LAUNCH2.path : other.path} className="btn btn-outline">{second ? (familyLive ? `See the ${FAMILY_NAME}` : 'See the launch') : `See ${other.name}`}</Link>
        </div>
        <ToolsStrip />
      </div>
    </div>
  );
}
