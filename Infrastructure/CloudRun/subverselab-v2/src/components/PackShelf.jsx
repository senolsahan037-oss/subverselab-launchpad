import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { visiblePacks } from '../data/packFacts';
import { media } from '../utils/endpoints';
import { useCatalog, mergeSamplePacks } from '../catalog/catalog';

// Sample and preset packs in the gaps between the homepage news (owner 2026-10-28: "sample ve preset infoları kaydırdıkça
// boşluklarda kenarlarda beliriyor, aşağı yukarı gidiş dönüş tamamlayıcı olmalı"; then "sürekli ekrandalar, sadece boşluklarda
// çıkmaları gerekiyor ve haberleri küçültmemeliler"). Each gap between two news frames holds two packs, one from each edge. They
// slide in while that gap passes the middle of the screen and slide back out after it, up and down alike: the position comes from
// the scroll offset. The news keeps its full width; the cards sit on the gap's divider line, clear of the copy and the panels.
// From 900 px wide; with prefers-reduced-motion they are simply shown in place.
// Owner 30 Oct: sparser, "tüm kaydırma boyunca sadece 2 tane açılsın": two cards on the whole page, one from the left edge at
// about a third of the way down, one from the right edge at about two thirds; a card is only its cover, name and play button.
const SHOWN = 2;
const MIN_WIDTH = 900;

// Owner 28 Oct: "burada saf davul ve fx paketlerini sergileyelim, madem sayı az": the gaps show the drum kits and the FX pack only
// (the melodic loop packs have the store and the news). A kit is a pack with one-shot folders and no "loops with" in its line.
const isDrumOrFx = (p) => (p.folders || []).some((f) => /^One Shots\//.test(f.folder) || /^(Atmospheres|Risers|Impacts|Downlifters)/.test(f.folder))
  && !/loops with/i.test(p.kindLine || '');

function shelfItems(packs) {
  return packs.filter(isDrumOrFx).map((p) => ({
    key: `s-${p.slug}`, name: p.name, to: `/sample-packs/${p.slug}`, img: p.cover?.small || p.cover?.webp || p.cover?.jpg,
    audio: p.snippet?.src,
  })).filter((x) => x.img);
}

// One shared player: a card's play button plays that pack's own preview (the snippet the pack page plays); a second press or
// another card stops it, and it stops by itself when its card slides out.
let player = null;
let playingKey = null;
const listeners = new Set();
const notify = () => listeners.forEach((f) => f(playingKey));
function stopPreview() { if (player) { player.pause(); player.currentTime = 0; } playingKey = null; notify(); }
function togglePreview(key, src) {
  if (playingKey === key) { stopPreview(); return; }
  if (!player) { player = new Audio(); player.addEventListener('ended', () => { playingKey = null; notify(); }); }
  player.src = media(src); player.currentTime = 0;
  player.play().then(() => { playingKey = key; notify(); }).catch(() => { playingKey = null; notify(); });
}

export default function PackShelf({ feedRef }) {
  const cat = useCatalog();
  const items = useMemo(() => shelfItems(mergeSamplePacks(visiblePacks(), cat.samplePacks)), [cat]);
  const [playing, setPlaying] = useState(null);
  useEffect(() => { listeners.add(setPlaying); return () => { listeners.delete(setPlaying); stopPreview(); }; }, []);
  const [gaps, setGaps] = useState([]);   // [{ top }] one per gap between news frames, in feed coordinates
  const cards = useRef([]);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const measure = () => {
      // The shelf spans the window (index.css .pack-gaps); 100vw counts a classic scrollbar, so the CSS subtracts its width.
      document.documentElement.style.setProperty('--sbw', `${window.innerWidth - document.documentElement.clientWidth}px`);
      if (window.innerWidth < MIN_WIDTH) { setGaps([]); return; }
      const frames = [...feed.querySelectorAll('.news-frame')];
      setGaps(frames.slice(0, -1).map((f) => ({ top: f.offsetTop + f.offsetHeight })));
    };
    const draw = () => {
      frame = 0;
      const h = window.innerHeight;
      cards.current.forEach((el) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        // Owner 28 Oct: opens on the way down and stays open, closes on the way back up. So it is tied to position, not to the
        // middle of the screen: a card slides in as its gap rises from 85 % to 65 % of the window and stays out above that.
        const c = r.top + r.height / 2;
        const t = reduce?.matches ? 1 : Math.max(0, Math.min(1, (h * 0.85 - c) / (h * 0.2)));
        const left = el.classList.contains('is-left');
        el.style.opacity = String(t);
        el.style.transform = `translate3d(${(1 - t) * (left ? -110 : 110)}%, 0, 0)`;
        el.style.pointerEvents = t > 0.6 ? 'auto' : 'none';
        if (t < 0.25 && playingKey && el.dataset.key === playingKey) stopPreview();
        el.tabIndex = t > 0.6 ? 0 : -1;
      });
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(draw); };
    const onResize = () => { measure(); onScroll(); };
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    ro?.observe(feed);
    onResize();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => { ro?.disconnect(); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize); if (frame) cancelAnimationFrame(frame); };
  }, [feedRef]);

  useEffect(() => { if (gaps.length) window.dispatchEvent(new Event('scroll')); }, [gaps]);

  if (!gaps.length || !items.length) return null;
  const at = Array.from({ length: Math.min(SHOWN, gaps.length) }, (_, i) => Math.round(((i + 1) * gaps.length) / (SHOWN + 1) - 0.5));
  const slots = at.map((gi, i) => ({ g: gaps[gi], x: items[i % items.length], side: i % 2 ? 'right' : 'left' }));
  let k = 0;
  const card = (x, side) => {
    const idx = k++;
    return (
      <Link key={`${x.key}-${idx}`} ref={(el) => { cards.current[idx] = el; }} to={x.to} data-key={`${x.key}-${idx}`}
            className={`pack-gap-card is-${side}`} style={{ opacity: 0 }}>
        <span className="pack-gap-cover">
          <img src={media(x.img)} alt="" loading="lazy" decoding="async" />
          {x.audio && (
            <button type="button" className={`pack-gap-play${playing === `${x.key}-${idx}` ? ' is-on' : ''}`}
                    aria-label={playing === `${x.key}-${idx}` ? `Stop ${x.name} preview` : `Play ${x.name} preview`}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePreview(`${x.key}-${idx}`, x.audio); }}>
              {playing === `${x.key}-${idx}` ? '❚❚' : '▶'}
            </button>
          )}
        </span>
        <span className="pack-gap-text">
          <span className="pack-gap-name">{x.name}</span>
        </span>
      </Link>
    );
  };
  return (
    <div className="pack-gaps" aria-label="Sample and preset packs">
      {slots.map(({ g, x, side }) => (
        <div key={g.top} className="pack-gap" style={{ top: `${g.top}px` }}>
          {card(x, side)}
        </div>
      ))}
    </div>
  );
}
