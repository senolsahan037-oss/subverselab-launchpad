import React, { useEffect, useRef, useState } from 'react';
import { sendPreviewPlay } from '../../hooks/useHitCounter';

// Every pack demo in one player (owner 5 Nov 2026). The list is built here from each pack's SoundCloud link (the panel field
// "SoundCloud track", api/catalogSchema.js) in the order the page already sorts the packs (newest first, productDates.js), so a
// pack added from /admin joins the playlist in its place without a deploy and without editing anything on SoundCloud.
// One SoundCloud widget plays the current track; when it finishes, the next pack loads (SoundCloud's Widget API, loaded only on
// this page). Without the API script the rows still switch the track; only the automatic next is lost.

const WIDGET_API = 'https://w.soundcloud.com/player/api.js';
const OPTIONS = { color: '#c5a059', hide_related: true, show_comments: false, show_user: true, show_reposts: false, show_teaser: false, visual: false };
export const ACCOUNT_URL = 'https://soundcloud.com/subverselab';

export function widgetSrc(trackUrl, autoPlay = false) {
  const q = Object.entries({ ...OPTIONS, auto_play: autoPlay }).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(trackUrl)}&${q}`;
}

let apiPromise = null;
function loadWidgetApi() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.SC?.Widget) return Promise.resolve(window.SC);
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = WIDGET_API;
      s.async = true;
      s.onload = () => resolve(window.SC?.Widget ? window.SC : null);
      s.onerror = () => { apiPromise = null; resolve(null); };
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}

export default function SoundCloudPlaylist({ packs }) {
  const tracks = (packs || []).filter((p) => p.soundcloud);
  const frame = useRef(null);
  const widget = useRef(null);
  const [current, setCurrent] = useState(0);
  const [src, setSrc] = useState('');
  const index = useRef(0);
  const playedSlugs = useRef(new Set());
  const list = useRef(tracks);
  list.current = tracks;

  const first = tracks[0]?.soundcloud || '';
  useEffect(() => { if (first && !src) setSrc(widgetSrc(first)); }, [first, src]);

  // Bind the widget once its iframe is there: FINISH plays the next pack in the list.
  useEffect(() => {
    if (!src || widget.current) return undefined;
    let alive = true;
    loadWidgetApi().then((SC) => {
      if (!alive || !SC || !frame.current) return;
      const w = SC.Widget(frame.current);
      widget.current = w;
      // A play in the widget (a row, the widget's own key, or the next pack after FINISH): reported once per pack per page load.
      w.bind(SC.Widget.Events.PLAY, () => {
        const t = list.current[index.current];
        if (t?.slug && !playedSlugs.current.has(t.slug)) { playedSlugs.current.add(t.slug); sendPreviewPlay(t.slug, 'soundcloud'); }
      });
      w.bind(SC.Widget.Events.FINISH, () => {
        const next = index.current + 1;
        if (next < list.current.length) play(next);
      });
    });
    return () => { alive = false; };
  }, [src]);

  function play(i) {
    const t = list.current[i];
    if (!t) return;
    index.current = i;
    setCurrent(i);
    if (widget.current) widget.current.load(t.soundcloud, { ...OPTIONS, auto_play: true });
    else {
      // The widget is not bound yet, so its first PLAY could come before the listener: count this pack on the click.
      if (t.slug && !playedSlugs.current.has(t.slug)) { playedSlugs.current.add(t.slug); sendPreviewPlay(t.slug, 'soundcloud'); }
      setSrc(widgetSrc(t.soundcloud, true));
    }
  }

  if (!tracks.length) return null;
  return (
    <section className="st-listen" aria-labelledby="sp-listen">
      <h2 id="sp-listen">Every preview in one playlist</h2>
      <p>Play the packs back to back, newest first. The same previews are on <a href={ACCOUNT_URL} target="_blank" rel="noopener noreferrer">SubverseLab on SoundCloud</a>.</p>
      <div className="st-listen-box">
        {src && <iframe ref={frame} className="st-listen-player" title="SubverseLab sample pack previews on SoundCloud" src={src} loading="lazy" allow="autoplay" height="166" />}
        <ol className="st-listen-list">
          {tracks.map((p, i) => (
            <li key={p.slug}>
              <button type="button" className={`st-listen-row${i === current ? ' on' : ''}`} aria-current={i === current ? 'true' : undefined} onClick={() => play(i)}>
                <img src={p.cover?.small || p.cover?.jpg} alt="" width="40" height="40" loading="lazy" />
                <span className="st-listen-name">{p.name}</span>
                <span className="st-listen-kind">{p.kindLine}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
