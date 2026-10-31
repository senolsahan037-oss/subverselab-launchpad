import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from './PageMeta';
import LaunchPrice from './LaunchPrice';
import BuyButton from './BuyButton';
import {
  PLUGINS_INDEX, FAMILY_PLUGINS, FREE_PLUGINS, LINE2_PLUGINS, SOLO_PLUGINS, CHECKOUT, PRICES, TRUST_LINE, BOX_IMG,
  line2AvailableLine, launchPriceActive, launchEndLabel, BOX_LAYERS, BOX_SHELL, BOX_SHELL_DEFAULT,
} from '../data/plugins';
import { byLatestRelease } from '../data/productDates';
import { useCatalog, catalogPlugins } from '../catalog/catalog';
import { ROOM_PLUGINS } from '../data/plugins';

// The Plugins tab (owner decision 2026-10-15, "Option B"): one grid of cards that are links only, the family as the
// one offer at the top, and buying and downloading in the room (PluginRoom.jsx). A card never carries a Buy button;
// the only button a card can show is Download, for a signed-in owner, and it opens the room's download section.

const GROUPS = [
  { key: 'all', label: 'All' },
  { key: 'solo', label: 'Sold on their own' },
  { key: 'free', label: 'Free' },
  { key: 'soon', label: 'Coming soon' },
];

// Page order (root CLAUDE.md "Store order", owner 2026-10-28): newest first by each product's latest release or update
// (src/data/productDates.js), in "All" and inside every filter group; ADALET (no date, "Coming soon") goes last.
// The list below only names the groups; ties keep this order.
const STATIC_CARDS = [
  // The family is retired (FAMILY_RETIRED, owner 2026-10-28): its products are cards sold on their own.
  ...FAMILY_PLUGINS.map((p) => ({ p, group: 'solo' })),
  ...SOLO_PLUGINS.map((p) => ({ p, group: 'solo' })),
  ...LINE2_PLUGINS.map((p) => ({ p, group: CHECKOUT[p.slug] ? 'solo' : 'soon' })),
  ...FREE_PLUGINS.map((p) => ({ p, group: 'free' })),
];
const KNOWN_SLUGS = ROOM_PLUGINS.map((p) => p.slug);

// The hover view (owner 31 Oct, after three bubbles and one round one were tried): a second panel view that slides up out of
// the box like a record out of its sleeve. The box and the view open the room; the key under the box buys.
function bubble(p) {
  const view = (p.modes || []).find((m) => m.key !== p.defaultMode && m.image) || (p.modes || [])[0];
  return { image: view?.image || p.cardImage, text: 'View' };
}

function badge({ p, group }) {
  if (group === 'free') return 'Free';
  if (group === 'soon') return line2AvailableLine(p);
  if (p.launchId === 'solo') return <><LaunchPrice slug={p.slug} note={false} />{launchPriceActive(p.slug) ? ' · launch price' : ''}</>;
  return `$${PRICES[p.slug]}`;
}

export default function PluginsPage() {
  const [group, setGroup] = useState('all');
  // Plus the plug-ins added from /admin (the live catalogue), in the same store order.
  const cat = useCatalog();
  const CARDS = useMemo(() => byLatestRelease([...STATIC_CARDS, ...catalogPlugins(cat.plugins, KNOWN_SLUGS).map((p) => ({ p, group: p.free ? 'free' : 'solo' }))], (c) => c.p.slug), [cat]);
  const shown = CARDS.filter((c) => group === 'all' || c.group === group);
  const count = (key) => CARDS.filter((c) => c.group === key).length;

  return (
    <div className="container" style={{ padding: '40px 20px 96px' }}>
      <PageMeta title={PLUGINS_INDEX.title} description={PLUGINS_INDEX.description} path={PLUGINS_INDEX.path} />

      <header style={{ marginBottom: '24px', maxWidth: '680px' }}>
        <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: '900', margin: '0 0 10px' }}>Plugins</h1>
        <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.6', margin: 0 }}>
          {/* No product counts in public copy (owner rule 2026-10-17); same sentence as the prerendered page (scripts/prerender.js). */}
          Plugins and apps for macOS and Windows, each made for one job in your track. Open one to meet it: the real panel, what every control does, and how to make it yours.
        </p>
      </header>

      <div className="plugin-filter" role="group" aria-label="Show">
        {GROUPS.filter((g) => g.key === 'all' || count(g.key) > 0).map((g) => (
          <button key={g.key} type="button" aria-pressed={group === g.key}
                  className={`plugin-filter-chip${group === g.key ? ' active' : ''}`} onClick={() => setGroup(g.key)}>
            {g.label}
          </button>
        ))}
      </div>

      {/* Owner 31 Oct: every product as its box on the page ground (the TORNA news frame's look), the lines under it; panels,
          videos and the rest live in the room. A catalogue plug-in without a box picture gets a box drawn from its panel. */}
      <div className="box-grid">
        {shown.map((c) => {
          const { p } = c;
          const box = BOX_IMG[p.slug] || p.boxImage;
          const layers = BOX_LAYERS[p.slug];
          return (
            <article key={p.slug} className="box-item">
              <Link to={p.path} className="box-link" aria-label={`${p.displayName}, ${p.kind}`}>
                {/* On hover / focus (owner 31 Oct) a second panel view slides up out of the box like a record out of its sleeve. */}
                <span className="box-pops" aria-hidden="true">
                  <span className="box-device" style={{ '--shell': BOX_SHELL[p.slug] || BOX_SHELL_DEFAULT }}>
                    <img className="box-pop" src={bubble(p).image} alt="" loading="lazy" decoding="async" />
                  </span>
                </span>
                {layers
                  ? (
                    <>
                      {/* The lid, hinged at its back edge (the frame's top), lifts on hover; the body stays; the view rises between them. */}
                      <img className="box-img box-lid" src={layers.lid} alt="" aria-hidden="true" loading={shown.indexOf(c) < 3 ? 'eager' : 'lazy'} decoding="async" />
                      <img className="box-img box-body" src={layers.body} alt={`${p.displayName} in its box`} loading={shown.indexOf(c) < 3 ? 'eager' : 'lazy'} decoding="async" />
                    </>
                  )
                  : box
                  ? <img className="box-img" src={box} alt={`${p.displayName} in its box`} loading={shown.indexOf(c) < 3 ? 'eager' : 'lazy'} decoding="async" />
                  : (
                    <span className="box-drawn" aria-hidden="true">
                      <span className="box-drawn-side"><span>{p.model}</span></span>
                      <span className="box-drawn-front">
                        <span className="box-drawn-model">{p.model}</span>
                        <img src={p.cardImage} alt="" width={p.imageSize[0]} height={p.imageSize[1]} loading="lazy" />
                        <span className="box-drawn-name">{p.displayName}</span>
                        <span className="box-drawn-kind">{p.kind}</span>
                      </span>
                    </span>
                  )}
              </Link>
              {/* Owner 31 Oct: the box and its bubbles lead into the room; the key under the box goes straight to the checkout
                  (BuyButton: owned -> Download, free -> Get free, a product without a checkout -> a closed key). The name still
                  opens the room, so nobody lands in a checkout by reading. */}
              <div className="box-lines">
                <h2 className="box-name"><Link to={p.path}>{p.displayName}</Link></h2>
                <span className="box-kind">{p.kind}</span>
                <span className="box-price">{badge(c)}</span>
                {c.group !== 'soon' && (
                  <span className="box-buy-row">
                    <BuyButton place="showcase" slug={p.slug} className="btn btn-primary box-buy"
                      label={c.group === 'free' ? `Get ${p.displayName} free` : `Buy ${p.displayName}`} />
                    {p.launchId === 'solo' && launchPriceActive(p.slug) && <span className="box-until">until {launchEndLabel(p.slug)}</span>}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <p className="plugin-trust" style={{ marginTop: '28px' }}>{TRUST_LINE}</p>
    </div>
  );
}
