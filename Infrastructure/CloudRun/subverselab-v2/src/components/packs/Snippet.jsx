import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HONESTY_LINE, mmss } from '../../data/packFacts';
import { sendPreviewPlay } from '../../hooks/useHitCounter';

// Pack previews. Rules (UX spec 2026-10-16 §d): one snippet per pack, never autoplay (sound starts only on a tap),
// ONE snippet plays at a time on the page, the browser preloads nothing on the catalogue and only the metadata on a
// pack page, and a page left in the background stops (the rooms' rule, 15 Oct).
let current = null;
function claim(audio) {
  if (current && current !== audio) current.pause();
  current = audio;
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.hidden && current) current.pause(); });
}

// `count` = {slug, place}: the first play of this player is reported once (stats.js preview plays); a pause and resume is not a new play.
export function useSnippet(count) {
  const ref = useRef(null);
  const counted = useRef(false);
  const countRef = useRef(count);
  countRef.current = count;
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  useEffect(() => {
    const a = ref.current;
    if (!a) return undefined;
    const on = () => {
      claim(a); setPlaying(true);
      const c = countRef.current;
      if (c?.slug && !counted.current) { counted.current = true; sendPreviewPlay(c.slug, c.place); }
    };
    const off = () => setPlaying(false);
    const tick = () => setTime(a.currentTime);
    const meta = () => setDuration(Number.isFinite(a.duration) ? a.duration : 0);
    a.addEventListener('play', on); a.addEventListener('pause', off); a.addEventListener('ended', off);
    a.addEventListener('timeupdate', tick); a.addEventListener('loadedmetadata', meta);
    return () => {
      a.pause();
      a.removeEventListener('play', on); a.removeEventListener('pause', off); a.removeEventListener('ended', off);
      a.removeEventListener('timeupdate', tick); a.removeEventListener('loadedmetadata', meta);
      if (current === a) current = null;
    };
  }, []);
  const play = () => { const a = ref.current; if (a) { claim(a); a.play().catch(() => setPlaying(false)); } };
  const toggle = () => { const a = ref.current; if (!a) return; if (a.paused) play(); else a.pause(); };
  const seek = (t, andPlay = false) => { const a = ref.current; if (!a) return; a.currentTime = Math.max(0, t); setTime(a.currentTime); if (andPlay) play(); };
  return { ref, playing, time, duration, toggle, seek };
}

const PlayIcon = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor" /></svg>;
const StopIcon = () => <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="3" width="3.2" height="10" fill="currentColor" /><rect x="9.3" y="3" width="3.2" height="10" fill="currentColor" /></svg>;

// The round gold key on a catalogue cover. `onState` (optional) tells the card whether the snippet is playing (the record
// card spins its disc while it plays).
export function CoverPlay({ pack, onState }) {
  const s = useSnippet({ slug: pack.slug, place: 'card' });
  useEffect(() => { onState?.(s.playing); }, [s.playing, onState]);
  return (
    <>
      <audio ref={s.ref} src={pack.snippet.src} preload="none" />
      <button type="button" className="pk-play" onClick={s.toggle} aria-pressed={s.playing}
        aria-label={`${s.playing ? 'Pause' : 'Play'} the ${pack.name} preview${Number.isFinite(pack.snippet.seconds) ? ` (${Math.round(pack.snippet.seconds)} s)` : ''}`}>
        {s.playing ? <StopIcon /> : <PlayIcon />}
      </button>
    </>
  );
}

// Drag the preview out of the browser into a DAW or Finder. Chromium browsers (Chrome, Edge, Brave, Arc) read
// `DownloadURL` ("mime:filename:absolute url") and hand the dropped app a real file; others get the plain link.
const DragIcon = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5v9M4.5 7 8 10.5 11.5 7M2.5 12.5v2h11v-2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
export function previewFileName(pack) {
  const base = String(pack.fullName || pack.name || pack.slug || 'preview').replace(/[^A-Za-z0-9 _-]+/g, '').trim().replace(/\s+/g, '_');
  const ext = (String(pack.snippet?.src || '').split('?')[0].match(/\.(mp3|wav|ogg|flac|m4a|aiff?)$/i) || [, 'mp3'])[1].toLowerCase();
  return `${base}_Preview.${ext}`;
}
const MIME = { mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac', m4a: 'audio/mp4', aif: 'audio/aiff', aiff: 'audio/aiff' };
export function DragOut({ pack }) {
  const onDragStart = (e) => {
    const url = new URL(pack.snippet.src, window.location.href).href;
    const name = previewFileName(pack);
    const mime = MIME[name.split('.').pop()] || 'application/octet-stream';
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('DownloadURL', `${mime}:${name}:${url}`);
    e.dataTransfer.setData('text/uri-list', url);
    e.dataTransfer.setData('text/plain', url);
  };
  return (
    <a className="pk-drag" href={pack.snippet.src} download={previewFileName(pack)} draggable="true" onDragStart={onDragStart}
      title="Drag into your DAW (Chrome, Edge) or click to save" aria-label={`Drag or save the ${pack.name} preview`}>
      <DragIcon /><span>Drag to DAW</span>
    </a>
  );
}

// The preview strip on a pack page: play key, waveform (the snippet's own peaks) with a gold needle, scene markers.
export function PreviewStrip({ pack }) {
  const s = useSnippet({ slug: pack.slug, place: 'page' });
  const [peaks, setPeaks] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch(pack.peaks).then((r) => (r.ok ? r.json() : null)).then((j) => { if (alive && j?.peaks) setPeaks(j.peaks); }).catch(() => {});
    return () => { alive = false; };
  }, [pack.peaks]);
  const total = s.duration || pack.snippet.seconds;
  const bars = useMemo(() => {
    if (!peaks) return [];
    const n = 160;
    return Array.from({ length: n }, (_, i) => {
      const a = Math.floor((i * peaks.length) / n); const b = Math.max(a + 1, Math.floor(((i + 1) * peaks.length) / n));
      return Math.max(...peaks.slice(a, b));
    });
  }, [peaks]);
  const frac = total ? Math.min(1, s.time / total) : 0;
  const scenes = pack.scenes || [];
  const active = scenes.reduce((k, sc, i) => (s.time >= sc.t ? i : k), -1);
  const onWave = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    s.seek(((e.clientX - r.left) / r.width) * total, s.playing);
  };
  const onKey = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); s.seek(Math.min(total, s.time + 5), s.playing); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); s.seek(s.time - 5, s.playing); }
  };
  return (
    <div className="pk-strip">
      <audio ref={s.ref} src={pack.snippet.src} preload="metadata" />
      <div className="pk-strip-row">
        <button type="button" className="pk-play" style={{ position: 'static', flex: '0 0 auto' }} onClick={s.toggle} aria-pressed={s.playing}
          aria-label={`${s.playing ? 'Pause' : 'Play'} the ${pack.name} preview`}>
          {s.playing ? <StopIcon /> : <PlayIcon />}
        </button>
        <div className="pk-wave" role="slider" tabIndex={0} aria-label="Preview position" aria-valuemin={0} aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(s.time)} aria-valuetext={`${mmss(s.time)} of ${mmss(total)}`} onClick={onWave} onKeyDown={onKey}>
          <svg viewBox={`0 0 ${bars.length || 1} 100`} preserveAspectRatio="none" aria-hidden="true">
            {bars.map((v, i) => {
              const h = Math.max(2, v * 96);
              return <rect key={i} x={i + 0.15} width={0.7} y={50 - h / 2} height={h} style={{ fill: i / bars.length <= frac ? 'var(--color-gold)' : 'var(--color-text-dim)' }} />;
            })}
            {scenes.map((sc) => <rect key={`m${sc.t}`} x={(sc.t / total) * bars.length} width={0.25} y={0} height={100} fill="rgba(197,160,89,.6)" />)}
          </svg>
          <span className="pk-needle" style={{ left: `calc(${(frac * 100).toFixed(3)}% - 1px)` }} />
        </div>
        <span className="pk-time">{mmss(s.time)} / {mmss(total)}</span>
        <DragOut pack={pack} />
      </div>
      {scenes.length > 0 && (
        <ol className="pk-scenes" aria-label="Scenes in the preview">
          {scenes.map((sc, i) => (
            <li key={sc.t}>
              <button type="button" className={`pk-scene${i === active ? ' on' : ''}`} onClick={() => s.seek(sc.t, true)}>
                <b>{mmss(sc.t)}</b>{sc.label}
              </button>
            </li>
          ))}
        </ol>
      )}
      <p className="pk-honest">{HONESTY_LINE}</p>
    </div>
  );
}
