import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PageMeta from './PageMeta';
import BuyButton from './BuyButton';
import MuseHubButton from './MuseHubButton';
import DownloadButtons from './DownloadButtons';
import PluginDemos from './PluginDemos';
import LaunchPrice from './LaunchPrice';
import LaunchCountdown from './LaunchCountdown';
import usePurchaseStatus from '../hooks/usePurchaseStatus';
import ListenHero from './listen/ListenHero';
import PanelTour from './PanelTour';
import { LISTEN } from '../data/listen';
import {
  CHECKOUT, PRICES, FORMATS, PRESS_KIT, RELEASE3_AT, UPDATES_LINE,
  ACTIVATION_LINE, ACTIVATION_SHORT, ACTIVATION_NO_KEY, ACTIVATION_LINE_FREE, TRUST_LINE_FREE, currentPrice,
  line2AvailableLine, line2Price, trustLineFor,
} from '../data/plugins';
import { SITE_URL } from '../data/siteMeta';

/*  One room for every product: /plugins/<slug> (owner decision 2026-10-15, "Option B").
 *
 *  Replaces PluginPage (the seven family products), NewLinePluginPage (ELEK, ADALET, SEDA) and FreePluginPage
 *  (TABAN, ALEV, KIYMA), which had drifted apart: three different download instructions on one page, demos on
 *  some rooms only, the trust line twice. Now every room has the same order and ONE action:
 *    paid   → Buy <name> (the family line under it was removed with the family, owner 2026-10-28)
 *    free   → Get <name> free ($0 Lemon Squeezy checkout, e-mail only)
 *    owned  → Download for macOS / Windows, inline, from the same /api/download/ticket the Account page uses
 *    soon   → a closed "Coming soon" button, no checkout link
 *  The "Buy and download" section repeats that action with one paragraph and one route (the Account page).
 *  A page, not a synced product: the checkout, licence key and files are Lemon Squeezy's and the download bucket's.
 */

function kindOf(plugin) {
  if (plugin.free) return 'free';
  if (plugin.launchId === 'solo') return 'solo';
  if (plugin.launchId === 'line2') return CHECKOUT[plugin.slug] ? 'line2' : 'soon';
  return 'family';
}

// The download ticket route decides by launch: KUBBE and KASET have no launchId and use 'launch' (as on /account).
const ticketLaunch = (plugin) => plugin.launchId || 'launch';

function openSignIn() {
  window.dispatchEvent(new Event('svl-open-auth'));
}

// Rooms with a "Hear it first" entry in src/data/listen.js open with ListenHero (sync-switched dry / wet player);
// the others keep the panel hero below. `hero` (optional) overrides both.
export default function PluginRoom({ plugin, hero = null, meta = null }) {
  const [modeKey, setModeKey] = useState(plugin.defaultMode);
  const mode = plugin.modes.find((m) => m.key === modeKey) || plugin.modes[0];
  const [w, h] = plugin.imageSize;
  const kind = kindOf(plugin);
  const status = usePurchaseStatus();
  const owned = status.signedIn && status.loaded && status.owns(plugin.slug);
  const trust = kind === 'free' ? TRUST_LINE_FREE : trustLineFor(plugin.slug);
  const name = plugin.displayName;
  const location = useLocation();

  // /plugins cards link owners to <room>#buy; the router does not scroll to a hash by itself.
  useEffect(() => {
    if (location.hash === '#buy') document.getElementById('buy')?.scrollIntoView({ block: 'start' });
  }, [location.hash, owned]);

  const priceHead = {
    family: `$${PRICES[plugin.slug]}`,
    solo: <LaunchPrice slug={plugin.slug} />,
    line2: line2Price(plugin),
    soon: line2AvailableLine(plugin),
    free: 'Free · forever',
  }[kind];

  const action = (where) => {
    if (owned) {
      return <DownloadButtons slug={plugin.slug} launchId={ticketLaunch(plugin)} paid className={where === 'hero' ? 'plugin-downloads plugin-cta-downloads' : 'plugin-downloads'} />;
    }
    if (kind === 'soon') {
      return <button type="button" className="btn plugin-btn plugin-buy-closed" disabled>{line2AvailableLine(plugin)}</button>;
    }
    if (kind === 'free') return <BuyButton place="room" slug={plugin.slug} className="btn plugin-btn" label={`Get ${name} free`} />;
    return <><BuyButton place="room" slug={plugin.slug} className="btn plugin-btn" /><MuseHubButton slug={plugin.slug} /></>;
  };

  // Shown under the action, never as a second button: how to get in if you already paid.
  const already = !owned && kind !== 'soon' && (
    <button type="button" className="plugin-link-btn" onClick={openSignIn}>
      {kind === 'free' ? 'Got it already? Sign in to download' : 'Bought it already? Sign in to download'}
    </button>
  );

  const buyText = {
    family: `Sold through Lemon Squeezy. After you pay, sign in with the e-mail you paid with: the download appears here and on your Account page, with your licence key. ${UPDATES_LINE} ${ACTIVATION_LINE}`,
    solo: `Sold through Lemon Squeezy. After you pay, sign in with the e-mail you paid with: the download appears here and on your Account page. ${UPDATES_LINE} ${plugin.noKey ? ACTIVATION_NO_KEY : ACTIVATION_SHORT}`,
    line2: `Sold through Lemon Squeezy. After you pay, sign in with the e-mail you paid with: the download appears here and on your Account page. ${UPDATES_LINE}`,
    soon: `${line2AvailableLine(plugin)}.${(plugin.updatesNote ?? UPDATES_LINE) ? ` ${plugin.updatesNote ?? UPDATES_LINE}` : ''}`,
    free: `Free, forever. Sign in first so the order lands on your account; the checkout asks only for an e-mail address, no card. The download then appears here and on your Account page. Used another e-mail at the checkout? Claim the order on your Account page with the order number from the receipt. ${ACTIVATION_LINE_FREE}`,
  }[kind];

  const schemaPrice = kind === 'free' ? '0' : kind === 'solo' ? String(currentPrice(plugin.slug)) : PRICES[plugin.slug] == null ? null : String(PRICES[plugin.slug]);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `SubverseLab ${name}`,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: plugin.os || 'macOS, Windows',
    url: `${SITE_URL}${plugin.path}`,
    image: `${SITE_URL}${plugin.og}`,
    ...(kind === 'soon' || schemaPrice == null ? {} : { offers: { '@type': 'Offer', price: schemaPrice, priceCurrency: 'USD', availability: 'https://schema.org/InStock' } }),
    author: { '@type': 'Organization', name: 'SubverseLab', url: 'https://subverselab.com' },
    publisher: { '@type': 'Organization', name: 'SubverseLab', url: SITE_URL },
    description: plugin.description,
  };

  return (
    <div className="plugin-page">
      {meta || <PageMeta title={plugin.title} description={plugin.description} path={plugin.path} image={`${SITE_URL}${plugin.og}`} />}
      {!meta && <script type="application/ld+json">{JSON.stringify(schema)}</script>}

      {hero || (LISTEN[plugin.slug] && (
        <ListenHero key={plugin.slug} plugin={plugin} listen={LISTEN[plugin.slug]}
          offer={owned ? `You own ${name}` : priceHead}
          actions={(
            <>
              <div className="plugin-cta-row">
                {action('hero')}
                {kind === 'free' && !owned && <span className="plugin-cta-note">An e-mail address, no card.</span>}
              </div>
            </>
          )}
          trust={trust} />
      )) || <section className="plugin-hero">
        <div className="container plugin-hero-inner">
          <Link to="/plugins" className="plugin-back">← Plugins</Link>
          <p className="plugin-kicker">{plugin.publisherName ? <>by {plugin.publisherLink ? <a href={plugin.publisherLink} target="_blank" rel="noopener noreferrer">{plugin.publisherName}</a> : plugin.publisherName} · </> : 'SubverseLab · '}{plugin.kind}{plugin.model ? ` · Model ${plugin.model}` : ''}</p>
          <h1 className="plugin-title">{name}</h1>
          <p className="plugin-tagline">{plugin.tagline}</p>

          <div className="plugin-offer">
            <div>
              <p className="plugin-offer-head">{owned ? `You own ${name}` : priceHead}</p>
              <p className="plugin-offer-sub">{plugin.formats || FORMATS}</p>
            </div>
            {kind === 'soon' && RELEASE3_AT && <LaunchCountdown target={RELEASE3_AT} hideWhenOut />}
          </div>

          <div className="plugin-cta-row">
            {action('hero')}
            {kind === 'free' && !owned && <span className="plugin-cta-note">An e-mail address, no card.</span>}
          </div>
          <p className="plugin-trust">{trust}</p>

          <figure className="plugin-panel">
            <img src={mode.image} alt={`${name}'s front panel: ${mode.name}`} width={w} height={h} />
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
      </section>}

      {plugin.tour && <PanelTour name={name} tour={plugin.tour} />}

      <div className="container" style={{ maxWidth: 'var(--read-max)', padding: '56px 20px 96px' }}>
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
            {plugin.controls.map(([n, what]) => (
              <div key={n} className="plugin-control">
                <strong>{n}</strong>
                <span>{what}</span>
              </div>
            ))}
          </div>
          {plugin.controlsNote && <p style={{ marginTop: '16px' }}>{plugin.controlsNote}</p>}
        </section>

        {plugin.notYet?.length > 0 && (
          <section className="plugin-section">
            <h2>Not done yet</h2>
            <ul>
              {plugin.notYet.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </section>
        )}

        <section className="plugin-section" id="buy">
          <h2>{kind === 'soon' ? 'Price and availability' : kind === 'free' ? 'Get it and download' : 'Buy and download'}</h2>
          <p>{owned ? `You own ${name}. Download it for macOS or Windows; it is also on your Account page.` : buyText}</p>
          <div className="plugin-buy-row">{action('section')}</div>
          {already && <p className="plugin-already">{already}</p>}
        </section>

        {plugin.manual && (
          <section className="plugin-section">
            <h2>Manual</h2>
            <p>
              Installation on macOS and Windows, every control with its range and default, specifications.
              {' '}{plugin.manualPage
                ? <><Link to={plugin.manualPage}>Read the {name} manual</Link>{' · '}<a href={plugin.manual} target="_blank" rel="noopener noreferrer">PDF</a></>
                : <a href={plugin.manual} target="_blank" rel="noopener noreferrer">Read the {name} manual (PDF)</a>}
            </p>
            {plugin.manualPage && PRESS_KIT && (
              <p>Writing about {name}? <a href={PRESS_KIT}>Press kit</a>: screenshots, demo video links, logos and a fact sheet (zip, 5 MB).</p>
            )}
          </section>
        )}

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
          <Link to="/plugins" className="btn btn-outline">See every plugin</Link>
        </div>
      </div>
    </div>
  );
}
