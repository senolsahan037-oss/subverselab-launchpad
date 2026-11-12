import React, { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PageMeta from './PageMeta';
import { css } from './SamplePacksPage';
import { ppCss } from './presetPacksCss';
import { PRESET_PACKS } from '../data/plugins';
import { PRESET_PACK_LIST, INCLUDED_PRESETS } from '../data/presetPacks';
import { packsCss } from './packs/packsCss';
import PackKey, { SweepBlock } from './packs/PackKey';
import { packOffer, priceLabel } from '../data/samplePackPrices';
import { byLatestRelease } from '../data/productDates';
import { useCatalog, mergePresetPacks, publisherOf } from '../catalog/catalog';


// Preset packs (header tab, owner 2026-10-15): for Ableton users. Store layout like /sample-packs (owner 17 Oct: "kartlar ...
// sample pack'teki gibi olmalı"): a grid of square covers, name, kind, price or "Free"; the details fold away under each card.
// Paid packs: one price each (src/data/samplePackPrices.js, null checkout = "Available soon"). Free member packs (pack.free):
// "Download free" right on the card (sign up / sign in first, then the zip; api MEMBER_PACK_SLUGS).
function PresetCard({ pack , by }) {
  const offer = packOffer(pack.id);
  return (
    <article className="st-card pp-card" aria-labelledby={`pp-${pack.id}`}>
      <div className="pk-cover">
        <img src={pack.cover} srcSet={`${pack.cover} 1x, ${pack.cover.replace(/\.jpg$/, '-1200.jpg')} 2x`} alt={pack.imageAlt} width={600} height={600} loading="lazy" />
      </div>
      <h2 className="st-name" id={`pp-${pack.id}`}>{pack.name}</h2>
      <span className="st-kind">{pack.kind}</span>
      {by && <span className="st-by">by {by.name}</span>}
      {pack.free
        ? <span className="st-price">Free with an account</span>
        : offer.buyable ? <span className="st-price">{priceLabel(offer.price)}</span> : null /* the key itself reads "Available soon" */}
      <div className="pp-key">
        <PackKey pack={{ slug: pack.id, name: pack.name, free: pack.free }} name={pack.name} small />
      </div>
      <details className="pp-more">
        <summary>What is inside</summary>
        <p>{pack.summary}</p>
        {pack.previewAudio && <audio className="pp-audio" controls preload="none" src={pack.previewAudio} />}
        <ul>{pack.inside.map((t) => <li key={t}>{t}</li>)}</ul>
        <p className="pp-req">{pack.requirements.join(' ')}</p>
        <p className="pp-req">{pack.install}</p>
        {pack.room && <Link to={pack.room.to} className="pk-link">{pack.room.label}</Link>}
      </details>
    </article>
  );
}

export default function PresetPacksPage() {
  // The hand-written packs plus the live catalogue (packs added or edited from /admin), newest release first.
  const cat = useCatalog();
  const list = useMemo(() => byLatestRelease(mergePresetPacks(PRESET_PACK_LIST, cat.presetPacks), (p) => p.id), [cat]);
  // A pack linked from the site search (#pp-<id>): bring its heading into view once the list (live packs too) is drawn.
  const { hash } = useLocation();
  useEffect(() => { if (hash.startsWith('#pp-')) requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })); }, [hash, list]);
  return (
    <div className="st-page">
      <PageMeta title={PRESET_PACKS.title} description={PRESET_PACKS.description} path={PRESET_PACKS.path} />
      <style>{css}{packsCss}{ppCss}</style>
      <header className="st-head">
        <h1 id="pp-title">Preset packs</h1>
        <p>Ableton Live racks made and checked by SubverseLab. Drop one on a track and it is already doing its job; the named macros take it from there.</p>
      </header>

      {/* Optional preset-pack sweep (owner 16 Oct: no campaign here now): renders nothing while PRESET_SWEEP has no price + checkout. */}
      <SweepBlock preset small packs={list.filter((p) => !p.free).map((p) => ({ slug: p.id, name: p.name }))} />

      <div className="st-grid">
        {list.map((pack) => <PresetCard key={pack.id} pack={pack} by={publisherOf(cat, pack.publisher)} />)}
      </div>

      <p className="st-foot">
        These plugins carry their own factory presets, included with the plugin:{' '}
        {INCLUDED_PRESETS.map((p, i) => (
          <React.Fragment key={p.name}>{i > 0 && ', '}<Link to={p.to} style={{ color: 'inherit' }}>{p.name}</Link></React.Fragment>
        ))}. Looking for sounds instead? <Link to="/sample-packs" style={{ color: 'inherit' }}>Sample packs</Link>.
      </p>
    </div>
  );
}
