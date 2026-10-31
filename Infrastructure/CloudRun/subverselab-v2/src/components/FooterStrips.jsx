import React from 'react';

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

// Stores that list SubverseLab now. Not links (owner 29 Oct: "tıklanabilir olmaması daha iyi, kullanıcı sayfada kalır"). Marks: MuseHub's from musehub.com, Gumroad and itch.io
// from simple-icons (CC0), KVR's from kvraudio.com. All are drawn as one-colour masks in the footer's ink, like the emblem.
const STORES = [
  { name: 'MuseHub', mark: '/partners/stores/musehub.svg', w: 146, h: 42 },
  { name: 'KVR Audio', mark: '/partners/stores/kvr.png', w: 90, h: 37 },
  { name: 'Gumroad', mark: '/partners/stores/gumroad.svg', w: 32, h: 32, label: 'Gumroad' },
  { name: 'itch.io', mark: '/partners/stores/itchio.svg', w: 32, h: 32, label: 'itch.io' },
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

// Owner 31 Oct: one slow, faint line instead of two: the seven hosts, a dot, the four stores; the loop repeats the whole line
// once, so no mark shows twice in one window on a wide screen. A quiet colophon, not a "trusted by" band.
export default function FooterStrips() {
  return (
    <div className="footer-strips">
      <Strip name="Works in Ableton Live, Logic Pro, FL Studio, Cubase, Studio One, REAPER and Bitwig Studio; also on MuseHub, KVR Audio, Gumroad and itch.io" repeat={1}>
        {HOSTS.map((h) => <span key={h.name} className="footer-strip-host" role="img" aria-label={h.name} title={h.name}><Logo x={h} /></span>)}
        <span className="footer-strip-dot" aria-hidden="true" />
        {STORES.map((s) => (
          <span key={s.name} className="footer-strip-store" role="img" aria-label={s.name} title={s.name}><Logo x={s} /></span>
        ))}
      </Strip>
    </div>
  );
}
