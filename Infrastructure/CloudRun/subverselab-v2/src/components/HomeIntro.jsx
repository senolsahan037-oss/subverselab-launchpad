import React, { useCallback, useEffect, useRef, useState } from 'react';
import { media } from '../utils/endpoints';
import { INTRO_SEEN } from '../hooks/useHitCounter';

// Homepage opening: full-screen for a few seconds with our own lines, then it fades into the site. Once per browser session
// per opening; skipped with prefers-reduced-motion. Rendered only after mount, so the prerendered homepage and crawlers never
// see it.
// History: RU-8 opened the site from 17 Oct (Blender pull-back, public/plugins/ru8/intro/). Owner 19 Oct: RU-8 out; then
// "plugin family kampanyasını intro ya çekelim. sayac koyalım son kaç gün kaldıysa bunu gösteren bir sayac". So while the
// family offer runs, the opening is the family: the store image (the real panels on #033832) and a day counter to the
// offer's end. Owner 2026-10-28: the family is retired (FAMILY_RETIRED), so its opening is removed; nothing opens until
// JING FANG is released.
// JING FANG's opening (a 6 s Blender film of the 3D device playing a Hicaz phrase on the microtonal rows, media in
// public/plugins/jingfang/intro/) is ready and waits for JING FANG's release deploy: set JF_LIVE to true then.
// Owner 2026-10-28: the new film (the device with its two dragons, made in Flow with the panel as reference; the title
// "JING FANG / Microtonal synthesizer · SubverseLab" is part of the film) opens the site. Source:
// 01_AI_Tools/subverselab-studio/branding/teasers/JingFang_intro_b.mp4 (9.5 s); tall = the same film centred on ink.
const JF_LIVE = true;

const JF = {
  key: 'svl-jf-intro',
  label: 'JING FANG Microtonal Synthesizer',
  video: '/plugins/jingfang/intro/jf-intro',        // -wide / -tall . webm / .mp4 / .webp (poster)
  baked: true,                                       // the title is in the film: no text layer, no scrim
  showMs: 11500,                                     // 9.5 s film + hold, before the fallback closes it
  lines: [],
};

const pickIntro = () => (JF_LIVE ? JF : null);

const HOLD_MS = 1200;      // the last frame stays this long after the video ends
const FADE_MS = 700;
const FALLBACK_MS = 7500;  // closes even if the video never plays (autoplay blocked, low-power mode, slow network)

const shouldShow = (intro) => {
  if (!intro || typeof window === 'undefined') return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  try { return !window.sessionStorage.getItem(intro.key); } catch { return false; }
};

export default function HomeIntro() {
  const [intro] = useState(pickIntro);
  // Decided in the first render (the app mounts with createRoot, not hydration), so the homepage never flashes before it.
  const [phase, setPhase] = useState(() => (shouldShow(intro) ? 'on' : 'off'));   // off | on | out
  const [tall] = useState(() => typeof window !== 'undefined' && window.innerHeight > window.innerWidth);
  const timers = useRef([]);
  const skipRef = useRef(null);

  const close = useCallback(() => {
    setPhase((p) => (p === 'on' ? 'out' : p));
  }, []);

  useEffect(() => {
    if (phase !== 'off') { try { window.sessionStorage.setItem(intro.key, '1'); window.sessionStorage.setItem(INTRO_SEEN, '1'); } catch { /* private mode: shown, not remembered */ } }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const list = timers.current;
    if (phase === 'on') {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      skipRef.current?.focus({ preventScroll: true });
      const onKey = (e) => { if (e.key === 'Escape') close(); };
      window.addEventListener('keydown', onKey);
      list.push(setTimeout(close, intro.showMs || FALLBACK_MS + HOLD_MS));
      return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    }
    if (phase === 'out') {
      list.push(setTimeout(() => setPhase('off'), FADE_MS));
    }
    return undefined;
  }, [phase, close, intro]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  if (phase === 'off') return null;
  const v = tall ? 'tall' : 'wide';
  return (
    <div className={`hi hi-${v}${intro.image ? ' hi-still' : ''}${phase === 'out' ? ' is-out' : ''}`} role="dialog" aria-modal="true"
         aria-label={intro.label} onClick={close}>
      <style>{CSS}</style>
      {intro.video ? (
        // Always the wide film. The -tall files are the same 16:9 film boxed on a 9:16 ink frame, so on a portrait window they
        // played as a small box with hard edges in the middle of the screen (owner 28 Oct); the tall layout below sizes the
        // wide film to the window's width and feathers its top and bottom into the ink instead.
        <video className="hi-video" autoPlay muted playsInline preload="auto" aria-hidden="true" poster={media(`${intro.video}-wide.webp`)}
               onEnded={() => timers.current.push(setTimeout(close, HOLD_MS))}
               onError={() => timers.current.push(setTimeout(close, 6500))}>
          <source src={media(`${intro.video}-wide.webm`)} type="video/webm" />
          <source src={media(`${intro.video}-wide.mp4`)} type="video/mp4" />
        </video>
      ) : (
        <div className="hi-frame" aria-hidden="true"><img className="hi-image" src={media(intro.image)} alt="" /></div>
      )}
      {!intro.baked && <div className="hi-scrim" aria-hidden="true" />}
      {intro.video && !intro.baked ? (
        <div className="hi-text">
          {intro.lines.map((l) => (
            <p key={l.text} className={`hi-in ${l.cls}`} style={{ animationDelay: `${l.delay}s` }}>{l.text}</p>
          ))}
          <span className="hi-rule" aria-hidden="true" />
        </div>
      ) : null}
      <button ref={skipRef} type="button" className="hi-skip" onClick={(e) => { e.stopPropagation(); close(); }}>Skip</button>
    </div>
  );
}

// Brand kit only: ink #032825, cream #F2EFE7, gold #C5A059 (no orange). Type: the site's Oswald display + Inter.
const CSS = `
.hi { position: fixed; inset: 0; z-index: 2000; background: #032825; overflow: hidden; cursor: pointer;
  opacity: 1; transition: opacity ${FADE_MS}ms ease; }
.hi.is-out { opacity: 0; pointer-events: none; }
.hi-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.hi-tall .hi-video { inset: auto 0; top: 50%; height: auto; aspect-ratio: 16 / 9; transform: translateY(-50%); object-fit: cover;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 22%, #000 78%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0, #000 22%, #000 78%, transparent 100%); }
.hi-frame { position: absolute; overflow: hidden; border-radius: 10px; box-shadow: 0 30px 80px rgba(0,0,0,.45); }
.hi-wide .hi-frame { right: 4vw; top: 50%; width: 56vw; aspect-ratio: 16 / 9; transform: translateY(-50%); }
.hi-tall .hi-frame { left: 16px; right: 16px; top: 9vh; aspect-ratio: 16 / 9; }
.hi-image { display: block; width: 100%; height: 100%; object-fit: cover; animation: hi-drift 6.5s ease-out both; }
@keyframes hi-drift { from { transform: scale(1.12) translateY(2%); opacity: 0; } 12% { opacity: 1; } to { transform: scale(1); opacity: 1; } }
.hi-scrim { position: absolute; inset: 0; pointer-events: none; }
.hi-wide .hi-scrim { background: linear-gradient(90deg, rgba(3,40,37,.92) 0%, rgba(3,40,37,.72) 30%, rgba(3,40,37,0) 58%); }
.hi-tall .hi-scrim { background: linear-gradient(0deg, rgba(3,40,37,.95) 0%, rgba(3,40,37,.75) 34%, rgba(3,40,37,0) 58%); }
.hi-still .hi-scrim { display: none; }
.hi-text { position: absolute; color: #F2EFE7; display: flex; flex-direction: column; }
.hi-wide .hi-text { left: 7vw; top: 50%; transform: translateY(-50%); max-width: 38vw; }
.hi-wide.hi-still .hi-text { left: 5vw; max-width: 32vw; }
.hi-tall .hi-text { left: 16px; right: 16px; bottom: 9vh; }
.hi-text p { margin: 0; }
.hi-in { opacity: 0; animation: hi-up .8s cubic-bezier(.2,.7,.2,1) both; }
@keyframes hi-up { from { opacity: 0; transform: translateY(18px); filter: blur(4px); } to { opacity: 1; transform: none; filter: none; } }
.hi-name { order: 0; font-family: var(--font-display, 'Oswald', sans-serif); font-weight: 600; line-height: .95; letter-spacing: .04em;
  font-size: clamp(3.2rem, 8.5vw, 7.5rem); }
.hi-model { order: 1; margin-top: .35em !important; font-family: var(--font-display, 'Oswald', sans-serif); text-transform: uppercase;
  letter-spacing: .42em; color: #C5A059; font-size: clamp(.95rem, 1.6vw, 1.35rem); }
.hi-still .hi-model { order: -1; margin: 0 0 .5em !important; letter-spacing: .3em; }
.hi-was { font-size: .42em; font-weight: 400; color: rgba(242,239,231,.55); vertical-align: .55em; margin-right: .15em; }
.hi-rule { order: 2; display: block; height: 2px; width: 0; background: #C5A059; margin: 1.4em 0 1.2em;
  animation: hi-rule .9s cubic-bezier(.2,.7,.2,1) 1.5s both; }
@keyframes hi-rule { to { width: min(220px, 40vw); } }
.hi-line { order: 3; font-family: var(--font, 'Inter', sans-serif); font-size: clamp(1.05rem, 1.9vw, 1.6rem); line-height: 1.45; color: #E6EEE9; }
.hi-still .hi-line { font-family: var(--font-display, 'Oswald', sans-serif); letter-spacing: .12em; font-size: clamp(.95rem, 1.5vw, 1.25rem); color: #C5A059; }
.hi-count { order: 4; margin-top: 1.1em !important; font-family: var(--font, 'Inter', sans-serif); font-size: clamp(1.05rem, 1.7vw, 1.45rem);
  color: #F2EFE7; display: flex; align-items: baseline; flex-wrap: wrap; gap: .35em; }
.hi-days { font-family: var(--font-display, 'Oswald', sans-serif); font-weight: 600; font-size: 2.1em; line-height: 1; color: #F2EFE7; }
.hi-until { flex-basis: 100%; font-size: .78em; color: rgba(242,239,231,.7); letter-spacing: .04em; }
.hi-skip { position: absolute; right: 24px; bottom: 22px; z-index: 1; padding: 8px 16px; border-radius: 999px; cursor: pointer;
  font: 600 .85rem/1 var(--font, 'Inter', sans-serif); letter-spacing: .08em; text-transform: uppercase;
  color: #F2EFE7; background: rgba(3,40,37,.55); border: 1px solid rgba(242,239,231,.35); }
.hi-skip:hover, .hi-skip:focus-visible { border-color: #C5A059; color: #C5A059; outline: none; }
.hi-tall .hi-skip { right: 16px; top: 16px; bottom: auto; }
`;
