import React from 'react';
import { Link } from 'react-router-dom';
import BuyButton from './BuyButton';
import {
  FAMILY_BUNDLE_ON, FAMILY_DISCOUNT_PCT, FAMILY_LIST_PRICE, FAMILY_PLUGINS, FAMILY_PRICE, FAMILY_SINGLES_TOTAL, FAMILY_STACK_IMG, UPDATES_LINE, familyUpgrade, pluginBySlug,
} from '../data/plugins';
import usePurchaseStatus from '../hooks/usePurchaseStatus';
import { byLatestRelease } from '../data/productDates';

// The family offer (owner 3 Nov 2026: the family is back at the MuseHub price; "kampanya bilgileri nerede olacak"):
// one band at the top of /plugins (#family), the place every family link points to (the homepage news item, the rooms).
// The 3D box stack on the left; the names (store order, from the data), the price, what one purchase gives and the Buy key
// on the right. No product count in the copy (root CLAUDE.md); the names are the list.
// Upgrade (owner 4 Nov: "satın al yerine upgrade butonu görmeliydi"): a signed-in account that bought a family product on its own
// before the family came back sees "Upgrade to the family" at its own price, the discount code goes into the checkout
// (FAMILY_UPGRADES in plugins.js); nobody else sees an upgrade, and no e-mail is sent about it.
// The stage light follows the pointer (index.css .family-band-stage): only two CSS variables change, React does not re-render.
function followLight(e) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
  e.currentTarget.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
}

export default function FamilyBand({ buyer = {} }) {
  const status = usePurchaseStatus();
  if (!FAMILY_BUNDLE_ON) return null;
  const upgrade = status.loaded ? familyUpgrade(status.purchased, status.owns('family')) : null;
  const members = byLatestRelease(FAMILY_PLUGINS.filter(Boolean), (p) => p.slug);
  const [src, w, h] = FAMILY_STACK_IMG;
  const names = members.map((p) => p.displayName);
  const listWords = (a) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a.at(-1)}`);
  return (
    <section className="family-band" id="family" aria-labelledby="family-title">
      <div className="family-band-stage" onPointerMove={followLight}>
        <img className="family-band-img" src={src} width={w} height={h} loading="eager" decoding="async"
             alt={`The SubverseLab family in their boxes, stacked: ${names.join(', ')}`} />
      </div>
      <div className="family-band-text">
        <p className="family-band-kicker">Back by popular demand</p>
        <h2 id="family-title">The SubverseLab family is back: {listWords(names)}, in one purchase.</h2>
        <p className="family-band-price">
          <s aria-label={`list price $${FAMILY_LIST_PRICE}`}>${FAMILY_LIST_PRICE}</s>
          <strong>${FAMILY_PRICE}</strong>
          <em>-{FAMILY_DISCOUNT_PCT}%</em>
          <span>Bought one by one: ${FAMILY_SINGLES_TOTAL}</span>
        </p>
        <p className="family-band-line">
          One checkout, and every one of them opens on your account for macOS and Windows. {UPDATES_LINE}
        </p>
        <ul className="family-band-names" aria-label="In the family">
          {members.map((p) => <li key={p.slug}><Link to={p.path}>{p.displayName}</Link></li>)}
        </ul>
        {upgrade && (
          <p className="family-band-upgrade">
            You bought {pluginBySlug(upgrade.slug)?.displayName} before the family came back, so what you paid counts: the whole
            family is ${upgrade.price} for you.
          </p>
        )}
        <BuyButton place="offer" slug="family" email={buyer.email} uid={buyer.uid} discount={upgrade?.code}
                   label={upgrade ? `Upgrade to the family — $${upgrade.price}` : `Get the family — $${FAMILY_PRICE}`} />
      </div>
    </section>
  );
}
