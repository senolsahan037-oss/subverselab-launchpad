import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import BuyButton from './BuyButton';
import LaunchPrice from './LaunchPrice';
import {
  ALL_PLUGINS, FREE_PLUGINS, LINE2_PLUGINS, SOLO_PLUGINS, PRICES, HERO_IMG, SHOWCASE_SLUGS, SHOWCASE_FREE_SLUGS, SHOWCASE_SOON_SLUGS, SHOWCASE_SOLO_SLUGS,
  FAMILY_NAME, FAMILY_PRICE, FAMILY_REGULAR_PRICE, FAMILY_PLUGINS, familyOfferEndLabel, line2AvailableLine,
  launchPriceActive, launchEndLabel, currentPrice,
} from '../data/plugins';
import { useFamilyLive } from '../hooks/useFamilyLive';

const INTERVAL_MS = 5000;

// Homepage hero: "Out now" rotating showcase of the seven plugins and the family offer.
export default function PluginShowcase() {
  const familyLive = useFamilyLive();
  const slides = [
    ...(familyLive ? [{ key: 'family', family: true }] : []),
    // ELEK right behind the family offer (owner, 12 Oct), then the seven, the free two and the coming ones
    ...SHOWCASE_SOLO_SLUGS.map((slug) => ({ key: slug, solo: true, plugin: SOLO_PLUGINS.find((p) => p.slug === slug) })),
    ...SHOWCASE_SLUGS.map((slug) => ({ key: slug, plugin: ALL_PLUGINS.find((p) => p.slug === slug) })),
    ...SHOWCASE_FREE_SLUGS.map((slug) => ({ key: slug, free: true, plugin: FREE_PLUGINS.find((p) => p.slug === slug) })),
    ...SHOWCASE_SOON_SLUGS.map((slug) => ({ key: slug, soon: true, plugin: LINE2_PLUGINS.find((p) => p.slug === slug) })),
  ];
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false));
  const touchX = useRef(null);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  const go = useCallback((i) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (paused || reduced || count < 2) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => clearInterval(t);
  }, [paused, reduced, count]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
  };
  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; setPaused(true); };
  const onTouchEnd = (e) => {
    const start = touchX.current; touchX.current = null;
    if (start == null) return;
    const dx = e.changedTouches[0].clientX - start;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
  };

  const endLabel = familyOfferEndLabel();
  const current = slides[index] || slides[0];
  const currentName = current.family ? FAMILY_NAME : current.plugin.displayName;

  return (
    <section
      className={`showcase${reduced ? ' showcase-static' : ''}`}
      role="region" aria-roledescription="carousel" aria-label="Plugins out now"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false); }}
      onKeyDown={onKeyDown} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
    >
      <div className="showcase-inner">
        <p className="showcase-eyebrow">Out now &middot; seven plugins, two free ones and a stem separation app &middot; two more coming soon</p>
        <div className="showcase-stage">
          {slides.map((sl, i) => {
            const slug = sl.family ? 'family' : sl.plugin.slug;
            const [src, w, h] = HERO_IMG[slug];
            const active = i === index;
            return (
              <div key={sl.key} className={`showcase-slide${active ? ' is-active' : ''}`} role="group" aria-roledescription="slide"
                   aria-label={`${i + 1} of ${count}`} aria-hidden={!active}>
                <div className="showcase-text">
                  {sl.family ? (
                    <>
                      <h2 className="showcase-name showcase-name-family">{FAMILY_NAME}</h2>
                      <p className="showcase-line">All seven plugins. {FAMILY_PLUGINS.map((p) => p.displayName).join(', ')}.</p>
                      <p className="showcase-price">
                        <s aria-label={`regular price $${FAMILY_REGULAR_PRICE}`}>${FAMILY_REGULAR_PRICE}</s> ${FAMILY_PRICE}
                      </p>
                      <p className="showcase-note">Launch price{endLabel ? ` until ${endLabel}` : ''}</p>
                      <div className="showcase-actions">
                        <BuyButton slug="family" label={`Get the family \u2014 $${FAMILY_PRICE}`} className="btn btn-primary showcase-buy" />
                        <Link to="/plugins" className="btn btn-outline showcase-see">See all plugins</Link>
                      </div>
                    </>
                  ) : sl.solo ? (
                    <>
                      <h2 className="showcase-name">{sl.plugin.displayName}</h2>
                      <p className="showcase-kind">{sl.plugin.kind}</p>
                      <p className="showcase-line">{sl.plugin.tagline}</p>
                      {/* as the family slide: struck regular price and the launch price, the end date on its own line */}
                      <p className="showcase-price"><LaunchPrice slug={slug} note={false} /></p>
                      {launchPriceActive(slug) && <p className="showcase-note">Launch price until {launchEndLabel(slug)}</p>}
                      <div className="showcase-actions">
                        <Link to={sl.plugin.path} className="btn btn-outline showcase-see">See {sl.plugin.displayName}</Link>
                        <BuyButton slug={slug} label={`Buy \u2014 $${currentPrice(slug)}`} className="btn btn-primary showcase-buy" />
                      </div>
                    </>
                  ) : sl.soon ? (
                    <>
                      <h2 className="showcase-name">{sl.plugin.displayName}</h2>
                      <p className="showcase-kind">{sl.plugin.kind}</p>
                      <p className="showcase-line">{sl.plugin.tagline}</p>
                      <p className="showcase-price">{line2AvailableLine(sl.plugin)}</p>
                      <div className="showcase-actions">
                        <Link to={sl.plugin.path} className="btn btn-outline showcase-see">See {sl.plugin.displayName}</Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="showcase-name">{sl.plugin.displayName}</h2>
                      <p className="showcase-kind">{sl.plugin.kind}</p>
                      <p className="showcase-line">{sl.plugin.tagline}</p>
                      <p className="showcase-price">{sl.free ? 'Free' : `$${PRICES[slug]}`}</p>
                      {sl.free ? (
                        <div className="showcase-actions">
                          <Link to={sl.plugin.path} className="btn btn-primary showcase-buy">Get {sl.plugin.displayName} free</Link>
                        </div>
                      ) : (
                        <div className="showcase-actions">
                          <Link to={sl.plugin.path} className="btn btn-outline showcase-see">See {sl.plugin.displayName}</Link>
                          <BuyButton slug={slug} label={`Buy \u2014 $${PRICES[slug]}`} className="btn btn-primary showcase-buy" />
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="showcase-media">
                  <img src={src} width={w} height={h} alt={sl.family ? 'The seven SubverseLab plugins' : `${sl.plugin.displayName} front panel`}
                       loading={i === 0 ? 'eager' : 'lazy'} decoding="async" {...(i === 0 ? { fetchPriority: 'high' } : {})} draggable="false" />
                </div>
              </div>
            );
          })}
        </div>
        <div className="showcase-controls">
          <button type="button" className="showcase-arrow" aria-label="Previous plugin" onClick={() => go(index - 1)}>&#8249;</button>
          <div className="showcase-dots">
            {slides.map((sl, i) => (
              <button key={sl.key} type="button" className={`showcase-dot${i === index ? ' is-active' : ''}`}
                      aria-label={`Show ${sl.family ? FAMILY_NAME : sl.plugin.displayName}`} aria-current={i === index ? 'true' : undefined}
                      onClick={() => go(i)} />
            ))}
          </div>
          <button type="button" className="showcase-arrow" aria-label="Next plugin" onClick={() => go(index + 1)}>&#8250;</button>
        </div>
        <a href="#online-tools" className="showcase-scroll" onClick={(e) => {
          const el = document.getElementById('online-tools');
          if (!el) return;
          e.preventDefault();
          el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        }}>
          <span>Scroll for the online tools</span>
          <svg className="showcase-chevron" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 9l7 7 7-7" /></svg>
        </a>
        <p className="showcase-live" aria-live="polite" aria-atomic="true">{currentName}, {index + 1} of {count}</p>
      </div>
    </section>
  );
}
