import React from 'react';
import { Link } from 'react-router-dom';
import PageMeta from './PageMeta';
import FamilyBand from './FamilyBand';
import PriceTag from './PriceTag';
import {
  FAMILY_PLUGINS, FAMILY_PRICE, FAMILY_LIST_PRICE, FAMILY_STACK_IMG, BOX_IMG, UPDATES_LINE, ACTIVATION_LINE,
  pluginOffer,
} from '../data/plugins';
import { byLatestRelease } from '../data/productDates';
import { SITE_URL } from '../data/siteMeta';

// The family's own room, /plugins/family (owner 14 Nov 2026: "plugin family'nin aile olarak bir ürün odası yok"). Until then the
// family lived only in the band at the top of /plugins. The top of the room is that band (FamilyBand room); under it every
// product in the family with its box, one line, its own price and a link to its room, then how buying and downloading work.
// Names, order and prices come from the data (store order, no product count in the copy). Reference price: $79.99 (owner 14 Nov).
export const FAMILY_ROOM_PATH = '/plugins/family';
export const FAMILY_ROOM_TITLE = `${FAMILY_PLUGINS.map((p) => p.displayName).join(', ')} in one purchase | SubverseLab plugin family`;
export const FAMILY_ROOM_DESCRIPTION = `The SubverseLab plugin family: ${FAMILY_PLUGINS.map((p) => p.displayName).join(', ')} for macOS and Windows in one checkout, $${FAMILY_PRICE} (list price $${FAMILY_LIST_PRICE}).`;

const abs = (src) => (/^https?:/.test(src) ? src : `${SITE_URL}${src}`);

export default function FamilyRoom() {
  const members = byLatestRelease(FAMILY_PLUGINS.filter(Boolean), (p) => p.slug);
  const [stack] = FAMILY_STACK_IMG;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'SubverseLab plugin family',
    description: FAMILY_ROOM_DESCRIPTION,
    image: abs(stack),
    url: `${SITE_URL}${FAMILY_ROOM_PATH}`,
    brand: { '@type': 'Brand', name: 'SubverseLab' },
    offers: { '@type': 'Offer', price: String(FAMILY_PRICE), priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
    isRelatedTo: members.map((p) => ({ '@type': 'SoftwareApplication', name: `SubverseLab ${p.displayName}`, url: `${SITE_URL}${p.path}` })),
  };
  return (
    <div className="container family-room" style={{ padding: '32px 20px 96px' }}>
      <PageMeta title={FAMILY_ROOM_TITLE} description={FAMILY_ROOM_DESCRIPTION} path={FAMILY_ROOM_PATH} image={abs(stack)} />
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
      <Link to="/plugins" className="family-room-back">← Plugins</Link>

      <FamilyBand room />

      <section className="family-room-section" aria-labelledby="family-members">
        <h2 id="family-members">In the family</h2>
        <ul className="family-room-grid">
          {members.map((p) => (
            <li key={p.slug} className="family-room-item">
              <Link to={p.path} className="family-room-pic" aria-label={`${p.displayName} room`}>
                <img src={BOX_IMG[p.slug] || p.cardImage} alt={`${p.displayName} in its box`} loading="lazy" decoding="async" />
              </Link>
              <h3><Link to={p.path}>{p.displayName}</Link></h3>
              <p className="family-room-kind">{p.kind}</p>
              <p className="family-room-line">{p.tagline}</p>
              <p className="family-room-own">On its own: <PriceTag offer={pluginOffer(p.slug)} size="pack" note={false} /></p>
              <Link to={p.path} className="family-room-open">Open the {p.displayName} room →</Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="family-room-section family-room-buy" aria-labelledby="family-buy">
        <h2 id="family-buy">Buying and downloading</h2>
        <p>
          Sold through Lemon Squeezy in one checkout. After you pay, sign in with the e-mail you paid with: every product in the
          family appears on your Account page, for macOS and Windows. {UPDATES_LINE} {ACTIVATION_LINE}
        </p>
        <p>
          macOS 11 or later and Windows, 64-bit. Every product comes as VST3 and AU on macOS and VST3 on Windows; some also come as a
          standalone app. Each room lists its own formats.
        </p>
        <p>Have a code from a store? <Link to="/redeem">Redeem it</Link>.</p>
      </section>
    </div>
  );
}
