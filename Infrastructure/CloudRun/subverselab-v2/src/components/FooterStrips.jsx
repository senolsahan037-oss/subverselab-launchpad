import React, { useEffect, useState } from 'react';

// Two strips that drift across the footer's empty middle (owner 29 Oct: "2 şerit kuralım logolar transparan bir şekilde yüzsün,
// birinde dawları koyalım diğerinde mağazaları, kvr'yi de koyabilirsin").
// Owner 29 Oct, second pass: "runs in ve also on yazılarını kaldır, dawları logoları ile birlikte ekle". Host marks: Ableton Live,
// Bitwig, Cubase and Logic Pro from Wikimedia Commons (public domain), FL Studio's fruit lockup from image-line.com, PreSonus
// from presonus.com, REAPER from reaper.fm (its JPEG turned into an alpha mark). Only hosts that load VST3 or AU ("bizde aax
// formatı yok"): no Pro Tools; GarageBand has no usable mark.
const HOSTS = [
  { name: 'Ableton Live', mark: '/partners/daws/ableton-live.svg', w: 178, h: 20 },
  { name: 'Logic Pro', img: '/partners/daws/logic-pro.png', w: 34, h: 34, label: 'Logic Pro' },
  { name: 'FL Studio', mark: '/partners/daws/fl-studio.png', w: 133, h: 33 },
  { name: 'Cubase', mark: '/partners/daws/cubase.svg', w: 107, h: 30 },
  { name: 'Studio One', mark: '/partners/daws/presonus.svg', w: 122, h: 20, label: 'Studio One' },
  { name: 'REAPER', mark: '/partners/daws/reaper.png', w: 38, h: 34, label: 'REAPER' },
  { name: 'Bitwig Studio', mark: '/partners/daws/bitwig.svg', w: 45, h: 34 },
];

// The list follows 01_AI_Tools/instagram_2026-10/launch_desk/STORES.md (rows with FOOTER: yes); change both together.
// Stores that list SubverseLab now. Not links (owner 29 Oct: "tıklanabilir olmaması daha iyi, kullanıcı sayfada kalır"). Marks: MuseHub's from musehub.com, Gumroad and itch.io
// from simple-icons (CC0), KVR's from kvraudio.com. All are drawn as one-colour masks in the footer's ink, like the emblem.
const STORES = [
  { name: 'MuseHub', mark: '/partners/stores/musehub.svg', w: 146, h: 42 },
  { name: 'KVR Audio', mark: '/partners/stores/kvr.png', w: 90, h: 37 },
  { name: 'Gumroad', mark: '/partners/stores/gumroad.svg', w: 32, h: 32, label: 'Gumroad' },
  { name: 'itch.io', mark: '/partners/stores/itchio.svg', w: 32, h: 32, label: 'itch.io' },
  // Owner 6 Nov 2026 ("yeni anlaştığımız mağazaların logolarını filigrana ekle"): agreements signed / features booked that day.
  // Loot Audio's mark from the lootaudio.com header (inline SVG, viewBox cropped to the lockup); Audio Plugin Deals' from audioplugin.deals.
  { name: 'Loot Audio', mark: '/partners/stores/lootaudio.svg', w: 67, h: 36 },
  { name: 'Audio Plugin Deals', mark: '/partners/stores/audioplugindeals.png', w: 149, h: 26 },
  // Owner 7 Nov 2026 ("alt filigrana ekipboardı da ekle"): Equipboard lists our plug-ins; mark from the equipboard.com header, made a mask.
  { name: 'Equipboard', mark: '/partners/stores/equipboard.svg', w: 110, h: 30 },
];

// A mark is painted in the footer's ink through a CSS mask; a full-colour app icon (img) is shown greyed instead.
function Logo({ x }) {
  return (
    <>
      {x.img
        ? <img className="footer-strip-icon" src={x.img} alt="" width={x.w} height={x.h} loading="lazy" />
        : <span className="footer-strip-mark" style={{ width: x.w, height: x.h, WebkitMaskImage: `url(${x.mark})`, maskImage: `url(${x.mark})` }} />}
      {x.label && <span className="footer-strip-name">{x.label}</span>}
    </>
  );
}

// A run must be wider than the widest window, or the loop shows a gap; a short list is repeated inside its run.
function Strip({ name, repeat = 1, children }) {
  // Repeats are inert: readers meet each logo once.
  const run = Array.from({ length: repeat }, (_, i) => (i === 0
    ? <React.Fragment key={i}>{children}</React.Fragment>
    : <span key={i} className="footer-strip-repeat" aria-hidden="true" inert>{children}</span>));
  return (
    <div className="footer-strip" role="group" aria-label={name}>
      <div className="footer-strip-window">
        {/* The run is drawn twice and slides by half its width, so it loops without a seam; the copy is hidden from readers. */}
        <div className="footer-strip-track">
          <div className="footer-strip-run">{run}</div>
          <div className="footer-strip-run" aria-hidden="true" inert>{run}</div>
        </div>
      </div>
    </div>
  );
}

// Owner 31 Oct: one slow, faint line of the seven hosts. Owner 5 Nov: the stores left this line for the footer's empty middle,
// where they take turns through a glitch (FooterStores below); the loop repeats the whole line once.
export default function FooterStrips() {
  return (
    <div className="footer-strips">
      <Strip name="Works in Ableton Live, Logic Pro, FL Studio, Cubase, Studio One, REAPER and Bitwig Studio" repeat={1}>
        {HOSTS.map((h) => <span key={h.name} className="footer-strip-host" role="img" aria-label={h.name} title={h.name}><Logo x={h} /></span>)}
      </Strip>
    </div>
  );
}

// Owner 5 Nov ("ortadaki boşlukta glitch efektiyle döndürelim"): the stores, one at a time, in the gap between the brand
// column and the link columns. Every few seconds the mark tears into two colour channels and slices, and the next one lands.
// Still a colophon, not links. With reduced motion they stand side by side, without the glitch.
const STORE_HOLD_MS = 3400;
const GLITCH_SWAP_MS = 190;
const GLITCH_MS = 460;

export function FooterStores() {
  const [index, setIndex] = useState(0);
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timers = [];
    const tick = setInterval(() => {
      if (document.hidden) return;
      setGlitch(true);
      timers.push(setTimeout(() => setIndex((n) => (n + 1) % STORES.length), GLITCH_SWAP_MS));
      timers.push(setTimeout(() => setGlitch(false), GLITCH_MS));
    }, STORE_HOLD_MS);
    return () => { clearInterval(tick); timers.forEach(clearTimeout); };
  }, []);

  const s = STORES[index];
  return (
    <div className="footer-stores" role="img" aria-label={`Also on ${STORES.map((x) => x.name).join(', ')}`}>
      <div className={`footer-stores-stage${glitch ? ' is-glitch' : ''}`} aria-hidden="true">
        <span className="footer-stores-layer footer-stores-base"><Logo x={s} /></span>
        <span className="footer-stores-layer footer-stores-ch1"><Logo x={s} /></span>
        <span className="footer-stores-layer footer-stores-ch2"><Logo x={s} /></span>
      </div>
      <div className="footer-stores-still" aria-hidden="true">
        {STORES.map((x) => <span key={x.name} className="footer-stores-item"><Logo x={x} /></span>)}
      </div>
    </div>
  );
}
