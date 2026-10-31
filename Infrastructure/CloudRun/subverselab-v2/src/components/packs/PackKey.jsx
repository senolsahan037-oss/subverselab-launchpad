import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import { withBuyer } from '../BuyButton';
import usePurchaseStatus, { markCheckoutStarted } from '../../hooks/usePurchaseStatus';
import { useDownloads, formatSize } from '../../hooks/useDownloads';
import { apiUrl } from '../../utils/endpoints';
import { packOffer, priceLabel, SWEEP, PRESET_SWEEP, sweepLive, presetSweepLive, packOfferEndLabel } from '../../data/samplePackPrices';

// One key per pack, three states:
//   owned (a paid order of the pack, or a sweep)  -> "Download <pack> (zip)" through /api/download/ticket (launchId 'pack')
//   buyable (price AND checkout set)               -> "Buy <pack> — $x", the Lemon Squeezy checkout, bound to the account
//   otherwise                                      -> a closed "Available soon" key; no price, no link
// Paid packs have no free path: no $0 checkout, no taster, no tester or family access (api/entitlements.js PACK_SLUGS).
// Free member packs (pack.free, api/entitlements.js MEMBER_PACK_SLUGS, owner 17 Oct): "Download free"; signed out it opens
// sign-up / sign-in first and downloads right after (launchId 'member', no order).

let pending = null;
export function PackDownload({ slug, name, className = 'sp-key', launchId = 'pack', free = false }) {
  const files = useDownloads(slug);
  const f = files.zip;
  const [msg, setMsg] = useState('');
  const request = async () => {
    const u = auth.currentUser;
    if (!u) { pending = slug; window.dispatchEvent(new Event('svl-open-auth')); return; }
    setMsg('Preparing download…');
    try {
      const token = await u.getIdToken(true);
      const r = await fetch(apiUrl('/api/download/ticket'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ slug, platform: 'zip', launchId }) });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) setMsg(body.error || 'Download unavailable.'); else { setMsg(''); window.location.assign(apiUrl(body.url)); }
    } catch { setMsg('Download unavailable. Check your connection and try again.'); }
  };
  useEffect(() => onAuthStateChanged(auth, (u) => { if (u && pending === slug) { pending = null; request(); } }), [slug]); // eslint-disable-line react-hooks/exhaustive-deps
  const size = f && formatSize(f.size);
  return (
    <div className="pk-dl">
      <button type="button" className={className} disabled={!f} onClick={request}>
        {f ? `${free ? 'Download free: ' : 'Download '}${name} (zip${size ? `, ${size}` : ''})` : `${name}: download available shortly`}
      </button>
      {msg && <p role="status">{msg}</p>}
    </div>
  );
}

export default function PackKey({ pack, name, small = false }) {
  const [user, setUser] = useState(() => auth.currentUser);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  const status = usePurchaseStatus();
  const slug = typeof pack === 'string' ? pack : pack.slug;
  const label = name || pack.name;
  const offer = packOffer(pack);
  const cls = `sp-key${small ? ' small' : ''}`;
  if (pack.free) return <PackDownload slug={slug} name={label} className={cls} launchId="member" free />;
  if (user && status.loaded && status.owns(slug)) return <PackDownload slug={slug} name={label} />;
  if (!offer.buyable) return <button type="button" className={cls} disabled aria-disabled="true">Available soon</button>;
  const url = withBuyer(offer.checkout, user?.email, user?.uid);
  return (
    <a href={url} className={cls} target="_blank" rel="noopener noreferrer" onClick={() => markCheckoutStarted(slug)}>
      Buy {label} &mdash; {priceLabel(offer.price)}
    </a>
  );
}

// "Sweep the store" — sample packs only (owner 16 Oct). Renders NOTHING until SWEEP has a price and a checkout (and before
// SWEEP.endsAt). `packs` = the sample packs on sale right now, named in the block; the value line only when every one of
// them has a price, so the comparison is always a real sum.
export function SweepBlock({ packs, small = false, preset = false }) {
  const [user, setUser] = useState(() => auth.currentUser);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  const s = preset ? PRESET_SWEEP : SWEEP;
  if (!(preset ? presetSweepLive() : sweepLive())) return null;
  const prices = packs.map((p) => packOffer(p).price);
  const sum = prices.every((x) => x != null) ? prices.reduce((a, b) => a + b, 0) : null;
  const end = packOfferEndLabel(s.endsAt);
  const what = preset ? 'preset pack' : 'sample pack';
  return (
    <section className={`pk-sweep${small ? ' small' : ''}`} aria-labelledby={`sweep-${small ? 's' : 'l'}`}>
      <h2 id={`sweep-${small ? 's' : 'l'}`}>{preset ? 'Every preset pack, one price' : 'Sweep the store: every sample pack, one price'}</h2>
      <p><span className="pk-sweep-price">{priceLabel(s.price)}</span>{sum != null && sum > s.price ? <> instead of {priceLabel(sum)} one by one</> : null}</p>
      {!small && <p>One order, every {what} in the store today: {packs.map((p) => p.name).join(', ')}. Each one downloads from your Account page.</p>}
      {end && <p>Until {end}.</p>}
      <a className="pk-sweep-key" href={withBuyer(s.checkout, user?.email, user?.uid)} target="_blank" rel="noopener noreferrer"
        onClick={() => markCheckoutStarted(preset ? 'preset-sweep' : 'sweep')}>
        {preset ? 'Get every preset pack' : 'Sweep the store'}
      </a>
    </section>
  );
}
