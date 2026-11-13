import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PageMeta from './PageMeta';
import BuyButton from './BuyButton';
import MuseHubButton from './MuseHubButton';
import DownloadButtons from './DownloadButtons';
import PluginDemos from './PluginDemos';
import PriceTag from './PriceTag';
import LaunchCountdown from './LaunchCountdown';
import usePurchaseStatus from '../hooks/usePurchaseStatus';
import ListenHero from './listen/ListenHero';
import PanelTour from './PanelTour';
import { LISTEN } from '../data/listen';
import {
  CHECKOUT, PRICES, FORMATS, PRESS_KIT, RELEASE3_AT, UPDATES_LINE,
  ACTIVATION_LINE, ACTIVATION_SHORT, ACTIVATION_NO_KEY, ACTIVATION_LINE_FREE, TRUST_LINE_FREE, currentPrice,
  line2AvailableLine, line2Price, trustLineFor, pluginOffer, FAMILY_SLUGS, FAMILY_PRICE, FAMILY_NAME,
} from '../data/plugins';
import { SITE_URL } from '../data/siteMeta';
import { Editable, EditBar, EditChip, PictureButton } from '../liveEdit/liveEdit';

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
// `edit` is the live edit handle of an admin (src/liveEdit/liveEdit.jsx), null for every visitor.
export default function PluginRoom({ plugin, hero = null, meta = null, edit = null }) {
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
    family: <PriceTag offer={pluginOffer(plugin.slug)} size="room" />,
    solo: <PriceTag offer={pluginOffer(plugin.slug)} size="room" />,
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
    return (
      <>
        <BuyButton place="room" slug={plugin.slug} className="btn plugin-btn" /><MuseHubButton slug={plugin.slug} />
        {/* A product with a free trial (AHENK): its installer is free for any signed-in account (ticket launchId 'trial');
            signed out, the button opens sign-in / a free account and the download starts after it. */}
        {plugin.trial && kind === 'solo' && (
          <DownloadButtons slug={plugin.slug} launchId="trial" verb="Download free trial" outline
            className={where === 'hero' ? 'plugin-downloads plugin-cta-downloads' : 'plugin-downloads'} />
        )}
      </>
    );
  };

  // A family product's room points to the family room (owner 14 Nov 2026: the family needs a room of its own, and its
  // products' rooms said nothing about it since 28 Oct). One line under the keys, not a second Buy key.
  const familyLine = FAMILY_SLUGS.includes(plugin.slug) && !(status.loaded && status.owns('family')) && (
    <p className="plugin-family-line">
      Also in the <Link to="/plugins/family">{FAMILY_NAME}</Link>: {name} and the others together for ${FAMILY_PRICE}.
    </p>
  );

  // Shown under the action, never as a second button: how to get in if you already paid.
  // Paid rooms also point store buyers (Loot Audio, Audio Plugin Deals, ...) to /redeem (owner 8 Nov: nowhere linked it).
  const already = !owned && kind !== 'soon' && (
    <>
      <button type="button" className="plugin-link-btn" onClick={openSignIn}>
        {kind === 'free' ? 'Got it already? Sign in to download' : 'Bought it already? Sign in to download'}
      </button>
      {kind !== 'free' && <Link to="/redeem" className="plugin-link-btn">Have a code from a store? Redeem it</Link>}
    </>
  );

  const buyText = {
    family: `Sold through Lemon Squeezy. After you pay, sign in with the e-mail you paid with: the download appears here and on your Account page, with your licence key. ${UPDATES_LINE} ${ACTIVATION_LINE}`,
    solo: `Sold through Lemon Squeezy. After you pay, sign in with the e-mail you paid with: the download appears here and on your Account page. ${UPDATES_LINE} ${plugin.activation || (plugin.noKey ? ACTIVATION_NO_KEY : ACTIVATION_SHORT)}`,
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
              {familyLine}
            </>
          )}
          trust={trust} />
      )) || <section className="plugin-hero">
        <div className="container plugin-hero-inner">
          <Link to="/plugins" className="plugin-back">← Plugins</Link>
          <p className="plugin-kicker">{plugin.publisherName ? <>by {plugin.publisherLink ? <a href={plugin.publisherLink} target="_blank" rel="noopener noreferrer">{plugin.publisherName}</a> : plugin.publisherName} · </> : 'SubverseLab · '}{plugin.kind}{plugin.model ? ` · Model ${plugin.model}` : ''}</p>
          <h1 className="plugin-title">{name}</h1>
          <Editable edit={edit} as="p" className="plugin-tagline" label="Tagline" value={plugin.tagline} onChange={(v) => edit.text('tagline', v)} />

          <div className="plugin-offer">
            <div>
              <p className="plugin-offer-head">{owned ? `You own ${name}` : priceHead}</p>
              <Editable edit={edit} as="p" className="plugin-offer-sub" label="Formats line" value={plugin.formats || FORMATS} onChange={(v) => edit.text('formats', v)} />
              {/* A product with a free trial (AHENK): the trial and what stays free after it, under the price, in plain words. */}
              {!owned && plugin.trialLines?.length > 0 && <p className="plugin-offer-sub">{plugin.trialLines.join(' ')}</p>}
            </div>
            {kind === 'soon' && RELEASE3_AT && <LaunchCountdown target={RELEASE3_AT} hideWhenOut />}
          </div>

          <div className="plugin-cta-row">
            {action('hero')}
            {kind === 'free' && !owned && <span className="plugin-cta-note">An e-mail address, no card.</span>}
            {plugin.trial && !owned && <span className="plugin-cta-note">Free trial: a free SubverseLab account, no card.</span>}
          </div>
          {familyLine}
          <p className="plugin-trust">{trust}</p>

          <figure className="plugin-panel">
            <img src={mode.image} alt={`${name}'s front panel: ${mode.name}`} width={w} height={h} />
            <PictureButton edit={edit} onFile={(f) => edit.picture(plugin.modes.indexOf(mode), f)} />
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
          {edit?.on && <p className="live-edit-row">View name: <Editable edit={edit} as="strong" label="View name" value={mode.name} onChange={(v) => edit.mode(plugin.modes.indexOf(mode), 'name', v)} /></p>}
          <Editable edit={edit} as="p" className="plugin-place-text" aria-live="polite" label="View line" value={mode.text} onChange={(v) => edit.mode(plugin.modes.indexOf(mode), 'text', v)} />
        </div>
      </section>}

      {plugin.tour && <PanelTour name={name} tour={plugin.tour} />}

      <div className="container" style={{ maxWidth: 'var(--read-max)', padding: '56px 20px 96px' }}>
        <Editable edit={edit} as="p" className="plugin-lead" label="Intro" value={plugin.intro} onChange={(v) => edit.text('intro', v)} />

        <PluginDemos plugin={plugin} />

        {plugin.sections.map((s, i) => (
          <section key={edit?.on ? i : s.heading} className="plugin-section">
            <Editable edit={edit} as="h2" label="Section heading" value={s.heading} onChange={(v) => edit.section(i, 'heading', v)} />
            <Editable edit={edit} as="p" label="Section text" value={s.text} onChange={(v) => edit.section(i, 'text', v)} />
            <EditChip edit={edit} onClick={() => edit.removeSection(i)}>Remove this section</EditChip>
          </section>
        ))}
        <EditChip edit={edit} onClick={edit?.addSection}>+ Add a section</EditChip>

        <section className="plugin-section">
          <h2>The controls</h2>
          <div className="plugin-controls">
            {plugin.controls.map(([n, what], i) => (
              <div key={edit?.on ? i : n} className="plugin-control">
                <Editable edit={edit} as="strong" label="Control name" value={n} onChange={(v) => edit.control(i, 0, v)} />
                <Editable edit={edit} as="span" label="What the control does" value={what} onChange={(v) => edit.control(i, 1, v)} />
                <EditChip edit={edit} onClick={() => edit.removeControl(i)}>Remove</EditChip>
              </div>
            ))}
          </div>
          <EditChip edit={edit} onClick={edit?.addControl}>+ Add a control</EditChip>
          {(plugin.controlsNote || edit?.on) && <Editable edit={edit} as="p" style={{ marginTop: '16px' }} label="Controls note" value={plugin.controlsNote || (edit?.on ? 'Controls note (optional)' : '')} onChange={(v) => edit.text('controlsNote', v)} />}
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
          {!owned && plugin.trialLines?.length > 0 && <p>{plugin.trialLines.join(' ')}</p>}
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
      <EditBar edit={edit} name={name} />
    </div>
  );
}
