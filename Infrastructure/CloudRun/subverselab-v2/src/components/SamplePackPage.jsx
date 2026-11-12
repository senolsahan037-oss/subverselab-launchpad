import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageMeta from './PageMeta';
import NotFound from './NotFound';
import { css } from './SamplePacksPage';
import { packsCss } from './packs/packsCss';
import { DragOut, PreviewStrip } from './packs/Snippet';
import PackKey, { SweepBlock } from './packs/PackKey';
import { SITE_URL } from '../data/siteMeta';
import {
  visiblePacks, visiblePackBySlug, packTitle, packDescription, packPath, detailRows, packLicence, specList, folderLabel,
} from '../data/packFacts';
import { packOffer, priceLabel } from '../data/samplePackPrices';
import { PACK_MADE_LINES } from '../data/packMadeLines';
import { byLatestRelease } from '../data/productDates';
import { useCatalog, mergeSamplePacks, publisherOf } from '../catalog/catalog';

// /sample-packs/<slug> — one pack, store style (owner 17 Oct: a sample pack page is a store page, not a product room).
// Order: cover + name + what's inside + price/buy, the preview, then technical details, folder and licence folded away,
// more packs. Every number comes from src/data/samplePacks.js (the importer read it from the zip that is sold); prices
// from src/data/samplePackPrices.js, null = "Available soon".
export default function SamplePackPage() {
  const { slug } = useParams();
  // The importer's packs plus the live catalogue; a pack that exists only in the catalogue (added from /admin) is drawn
  // from the fields the panel filled in (catalogOnly: no measurement plate, no folder tree).
  const cat = useCatalog();
  const all = useMemo(() => byLatestRelease(mergeSamplePacks(visiblePacks(), cat.samplePacks), (p) => p.slug), [cat]);
  const pack = all.find((p) => p.slug === slug) || (cat.loaded ? null : visiblePackBySlug(slug));
  if (!pack) return cat.loaded ? <NotFound /> : null;
  const offer = packOffer(pack);
  const others = all.filter((p) => p.slug !== pack.slug);
  const madeLine = pack.madeLine || PACK_MADE_LINES[pack.slug];
  const by = publisherOf(cat, pack.publisher);   // a producer's or label's pack (owner 31 Oct): "by <name>" under the kind line
  const specs = pack.catalogOnly ? (pack.inside || []) : specList(pack);
  // the folded sections: a catalogue pack draws them from its panel fields (owner 3 Nov), an importer pack from its measurements
  const rows = detailRows(pack);
  const folderRows = pack.catalogOnly ? (pack.folderRows || []) : null;
  const licence = packLicence(pack);
  const hasDetails = rows.length > 0 || (folderRows ? folderRows.length > 0 : true) || Boolean(licence);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: pack.fullName,
    description: pack.catalogOnly ? (pack.summary || `${pack.fullName}: ${pack.kindLine}.`) : packDescription(pack),
    image: pack.cover.jpg.startsWith('http') ? pack.cover.jpg : `${SITE_URL}${pack.cover.jpg}`,
    url: `${SITE_URL}${packPath(pack)}`,
    brand: { '@type': 'Organization', name: 'SubverseLab', url: SITE_URL },
    ...(offer.buyable ? { offers: { '@type': 'Offer', price: String(offer.price), priceCurrency: 'USD', availability: 'https://schema.org/InStock' } } : {}),
  };
  return (
    <div className="st-page">
      <PageMeta title={packTitle(pack)} description={schema.description} path={packPath(pack)} image={schema.image} />
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
      <style>{css}{packsCss}</style>

      <Link to="/sample-packs" className="st-crumb">&larr; Sample packs</Link>
      <section className="st-hero" aria-labelledby="pk-title">
        <div className="st-cover">
          <img src={pack.cover.webp} alt={`${pack.name} cover`} width={1200} height={1200} />
        </div>
        <div>
          <h1 id="pk-title">{pack.name}</h1>
          <p className="st-tagline">{pack.kindLine}</p>
          {by && <p className="st-by">by {by.link ? <a href={by.link} target="_blank" rel="noopener noreferrer">{by.name}</a> : by.name}</p>}
          {madeLine && <p className="st-made">{madeLine}</p>}
          {pack.catalogOnly && pack.summary && <p className="st-made">{pack.summary}</p>}
          {specs.length > 0 && (
            <ul className="st-specs" aria-label="What's inside">
              {specs.map((s) => <li key={s}>{s}</li>)}
            </ul>
          )}
          <div className="st-buy" id="buy">
            {offer.price != null && <span className="st-big-price">{priceLabel(offer.price)}</span>}   {/* owner 28 Oct: the price shows before the checkout exists */}
            <PackKey pack={pack} />
            <p className="st-small">
              {offer.buyable ? 'Paid through Lemon Squeezy in US dollars; the zip downloads from your Account page. ' : ''}
              <a href="#licence">Licence summary</a>
            </p>
          </div>
        </div>
      </section>

      {pack.snippet?.src && (
        <section className="st-section" aria-labelledby="pk-prev">
          <h2 id="pk-prev">Listen</h2>
          {pack.catalogOnly && !pack.peaks   /* a catalogue pack without its waveform file yet: a plain player; with one, the same strip as the importer's packs */
            ? <div className="pk-strip-row"><audio className="pp-audio" controls preload="none" src={pack.snippet.src} style={{ flex: 1, minWidth: 0 }} /><DragOut pack={pack} /></div>
            : <PreviewStrip key={pack.slug} pack={pack} />}
          {pack.soundcloud && <p className="st-small"><a href={pack.soundcloud} target="_blank" rel="noopener noreferrer">Also on SoundCloud</a></p>}
        </section>
      )}

      <SweepBlock packs={all} small />

      {hasDetails && <section className="st-section" aria-label="Details">
        {rows.length > 0 && <details className="st-fold">
          <summary>Technical details</summary>
          <div>
            <dl className="st-rows">
              {rows.map(([k, v]) => (
                <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>
              ))}
            </dl>
            <p className="st-small" style={{ marginTop: 10 }}>Our own measurements of every file in the zip. The full table, file by file, is inside the pack as measurements.csv{pack.catalogOnly ? '' : ' and measurements.html'}.</p>
          </div>
        </details>}
        {folderRows ? (folderRows.length > 0 && <details className="st-fold">
          <summary>Inside the folder</summary>
          <div className="pk-tree">
            <div>{pack.fullName ? pack.fullName.replace(/\s+/g, '_') : `SVL_${pack.name}`}/</div>
            <ul>{folderRows.map(([f, what]) => <li key={f}>{f}/ <span className="ex">({what})</span></li>)}</ul>
          </div>
        </details>) : <details className="st-fold">
          <summary>Inside the folder</summary>
          <div className="pk-tree">
            <div>SVL_{pack.name}/</div>
            <ul>
              {pack.docs.map((d) => <li key={d}>{d}</li>)}
              {pack.folders.map((f) => (
                <li key={f.folder}>
                  <details>
                    <summary>{folderLabel(f.folder)}/ <span className="ex">({f.count} files)</span></summary>
                    <ul>{f.examples.map((e) => <li key={e} className="ex">{e}</li>)}{f.count > f.examples.length && <li className="ex">…</li>}</ul>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        </details>}
        {licence && (
          <details className="st-fold" id="licence">
            {/* owner 4 Nov 2026: no draft / review wording ever reaches a buyer */}
            <summary>Licence summary</summary>
            <div>
              <ol className="pk-lic">
                {licence.clauses.map((c) => <li key={c.text}>{c.title && <strong>{c.title}. </strong>}{c.text}</li>)}
              </ol>
            </div>
          </details>
        )}
      </section>}

      {others.length > 0 && (
        <section className="st-section" aria-labelledby="pk-more">
          <h2 id="pk-more">More sample packs</h2>
          <div className="st-more">
            {others.map((p) => (
              <Link key={p.slug} to={packPath(p)}><img src={p.cover.small} alt="" width={600} height={600} loading="lazy" />{p.name}</Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
