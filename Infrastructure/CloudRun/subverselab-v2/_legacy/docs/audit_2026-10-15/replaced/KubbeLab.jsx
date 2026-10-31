import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PluginRoom from '../PluginRoom';
import PageMeta from '../PageMeta';
import BuyButton from '../BuyButton';
import { KUBBE, FAMILY_PRICE, PRICES } from '../../data/plugins';
import { media } from '../../utils/endpoints';
import './kubbe-lab.css';

/*  /lab/kubbe — prototype of a livelier KUBBE room (2026-10-15, local only, noindex, not in the sitemap).
 *
 *  What the reference sites do that our rooms did not (Baby Audio, Denise Audio, Teenage Engineering, Klevgrand):
 *    1. You hear it before you read: dry → wet players on the product page (Baby Audio 12 clips, Denise 12).
 *    2. Each product has its own colour world (Denise paints the whole page in the product's colour).
 *    3. The interface is shown moving, not as a still.
 *    4. Short, playful headlines instead of spec headings.
 *  Here: one phrase, four buttons. Press play, then switch rooms while it plays — all four renders run in
 *  sync, so a switch keeps the position. The page takes the room's colour, the panel follows, and the
 *  T60 readout glides to the measured value with the plug-ins' own knob glide (30 % per 30 Hz tick).
 *
 *  Audio: royalty-free, made by us — a synthesised pluck phrase (01_AI_Tools/subverselab-reverb/tools/make_site_demo.py)
 *  rendered through KUBBE 1.1.0 at Mix 40 %, trimmed to 24 s, loudness matched to −24 LUFS, AAC 160k.
 *  Source and numbers: 01_AI_Tools/subverselab-reverb/demos/public/site_2026-10-15/SOURCE.md. Never the owner's own tracks.
 *  T60 readout glides to the measured value with the plug-ins' own knob glide (30 % per 30 Hz tick).
 *
 *  Audio: 01_AI_Tools/subverselab-reverb/demos/{0_kuru_referans,1_hamam,2_sarnic,3_yayla}.wav, 25.0 s each,
 *  −15.3 / −14.3 / −15.2 / −15.0 LUFS, encoded to AAC 160k. Rendered 25 Sep (before release) — re-render
 *  with the shipping build before this goes live.
 *  T60 readout = what KUBBE's own decay display shows on the panel images (2.40 / 6.80 / 2.48 s), so the page
 *  never shows two numbers at once. The click measurement in docs/AUDIT_2026-10.md (Mix 100) is 2.78 / 6.45 / 2.50 s;
 *  Valley's discrete echoes at 32, 86, 201, 353, 469 ms come from that audit.
 */

const ROOMS = [
  { key: 'dry', name: 'Dry', file: '/plugins/kubbe/audio/dry.m4a', t60: null, line: 'The phrase on its own. Nothing added.' },
  { key: 'hammam', name: 'Hammam', file: '/plugins/kubbe/audio/hammam.m4a', t60: 2.4, line: 'Marble dome. Bright, dense, a flutter between the walls.' },
  { key: 'cistern', name: 'Cistern', file: '/plugins/kubbe/audio/cistern.m4a', t60: 6.8, line: 'Underground water. Late slaps, a long dark tail that drifts.' },
  { key: 'valley', name: 'Valley', file: '/plugins/kubbe/audio/valley.m4a', t60: 2.48, line: 'Open air. The far slopes answer one by one, each one darker.' },
];
const VALLEY_ECHOES_MS = [32, 86, 201, 353, 469];
const PANEL = { dry: 'hammam', hammam: 'hammam', cistern: 'cistern', valley: 'valley' };
const FADE = 0.03; // s, crossfade time constant on a room switch

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// The plug-ins' knob glide: 30 % of the remaining distance per 30 Hz tick, at least one grid step.
function useGlide(target, step = 0.01) {
  const [value, setValue] = useState(target ?? 0);
  useEffect(() => {
    if (target == null) return undefined;
    if (reducedMotion()) { setValue(target); return undefined; }
    const id = setInterval(() => {
      setValue((v) => {
        const d = target - v;
        if (Math.abs(d) <= step) { clearInterval(id); return target; }
        return v + Math.sign(d) * Math.max(step, Math.abs(d) * 0.3);
      });
    }, 1000 / 30);
    return () => clearInterval(id);
  }, [target, step]);
  return value;
}

function useRoomPlayer() {
  const ctxRef = useRef(null);
  const buffersRef = useRef(null);
  const nodesRef = useRef(null); // { sources, gains }
  const analyserRef = useRef(null);
  const startedAtRef = useRef(0);
  const offsetRef = useRef(0);
  const roomRef = useRef('hammam');
  const [state, setState] = useState('idle'); // idle | loading | playing | paused | error
  const [duration, setDuration] = useState(24);

  const ensure = useCallback(async () => {
    if (buffersRef.current) return true;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) { setState('error'); return false; }
    const ctx = ctxRef.current || new Ctx();
    ctxRef.current = ctx;
    setState('loading');
    try {
      const decoded = await Promise.all(ROOMS.map(async (r) => {
        const res = await fetch(media(r.file));
        if (!res.ok) throw new Error(`${r.file}: ${res.status}`);
        return ctx.decodeAudioData(await res.arrayBuffer());
      }));
      buffersRef.current = Object.fromEntries(ROOMS.map((r, i) => [r.key, decoded[i]]));
      setDuration(decoded[0].duration);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
      return true;
    } catch {
      setState('error');
      return false;
    }
  }, []);

  const stopSources = () => {
    nodesRef.current?.sources.forEach((s) => { try { s.stop(); } catch { /* already stopped */ } });
    nodesRef.current = null;
  };

  const startAt = useCallback((offset) => {
    const ctx = ctxRef.current;
    stopSources();
    const sources = []; const gains = {};
    const when = ctx.currentTime + 0.02;
    ROOMS.forEach((r) => {
      const src = ctx.createBufferSource();
      src.buffer = buffersRef.current[r.key];
      src.loop = true;
      const g = ctx.createGain();
      g.gain.value = r.key === roomRef.current ? 1 : 0;
      src.connect(g).connect(analyserRef.current);
      src.start(when, offset);
      sources.push(src); gains[r.key] = g;
    });
    nodesRef.current = { sources, gains };
    startedAtRef.current = when - offset;
    setState('playing');
  }, []);

  const position = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx || !buffersRef.current) return offsetRef.current;
    if (!nodesRef.current) return offsetRef.current;
    return Math.max(0, ctx.currentTime - startedAtRef.current) % duration;
  }, [duration]);

  const play = useCallback(async () => {
    if (!(await ensure())) return;
    if (ctxRef.current.state === 'suspended') await ctxRef.current.resume();
    startAt(offsetRef.current);
  }, [ensure, startAt]);

  const pause = useCallback(() => {
    offsetRef.current = position();
    stopSources();
    setState('paused');
  }, [position]);

  const seek = useCallback((fraction) => {
    offsetRef.current = Math.min(Math.max(fraction, 0), 0.999) * duration;
    if (nodesRef.current) startAt(offsetRef.current);
  }, [duration, startAt]);

  const setRoom = useCallback((key) => {
    roomRef.current = key;
    const n = nodesRef.current;
    if (!n) return;
    const t = ctxRef.current.currentTime;
    Object.entries(n.gains).forEach(([k, g]) => {
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(k === key ? 1 : 0, t, FADE);
    });
  }, []);

  useEffect(() => () => { stopSources(); ctxRef.current?.close?.(); }, []);

  return { state, play, pause, seek, setRoom, position, duration, analyserRef };
}

// Energy per 20 ms like the plug-in's decay display: a rolling three-second strip in the room's colour.
function EnergyStrip({ analyserRef, playing, room }) {
  const canvasRef = useRef(null);
  const historyRef = useRef([]);
  useEffect(() => {
    const canvas = canvasRef.current;
    const g = canvas.getContext('2d');
    const data = new Float32Array(2048);
    let raf = 0; let last = 0;
    const draw = (now) => {
      raf = requestAnimationFrame(draw);
      if (now - last < 20) return;
      last = now;
      const a = analyserRef.current;
      let db = -90;
      if (a && playing) {
        a.getFloatTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) sum += data[i] * data[i];
        db = Math.max(-90, 10 * Math.log10(sum / data.length + 1e-12));
      }
      const h = historyRef.current;
      h.push(db);
      if (h.length > 150) h.shift();
      const { width, height } = canvas;
      const color = getComputedStyle(canvas).getPropertyValue('--room-accent').trim() || '#5FE3C7';
      g.clearRect(0, 0, width, height);
      g.strokeStyle = 'rgba(242,239,231,0.10)';
      g.lineWidth = 1;
      [-20, -40, -60].forEach((lvl) => {
        const y = height * (-lvl / 80);
        g.beginPath(); g.moveTo(0, y); g.lineTo(width, y); g.stroke();
      });
      const bw = width / 150;
      g.fillStyle = color;
      h.forEach((v, i) => {
        const bh = height * Math.max(0, (v + 80) / 80);
        g.globalAlpha = 0.35 + 0.65 * (i / h.length);
        g.fillRect(i * bw, height - bh, Math.max(1, bw - 1), bh);
      });
      g.globalAlpha = 1;
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [analyserRef, playing]);
  return (
    <div className="klab-strip">
      <canvas ref={canvasRef} width="600" height="120" aria-hidden="true" />
      {room === 'valley' && (
        <div className="klab-echoes" aria-label="Valley's first echoes">
          {VALLEY_ECHOES_MS.map((ms) => (
            <span key={ms} style={{ left: `${(ms / 500) * 100}%` }}>{ms}</span>
          ))}
          <em>first echoes, ms</em>
        </div>
      )}
    </div>
  );
}

function Progress({ player }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => { setP(player.position() / player.duration); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [player]);
  const onClick = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    player.seek((e.clientX - r.left) / r.width);
  };
  const s = Math.floor(p * player.duration);
  return (
    <div className="klab-progress-row">
      <button type="button" className="klab-progress" onClick={onClick} aria-label="Jump to a point in the phrase">
        <span style={{ width: `${p * 100}%` }} />
      </button>
      <span className="klab-time">0:{String(s).padStart(2, '0')} / 0:{String(Math.round(player.duration)).padStart(2, '0')}</span>
    </div>
  );
}

function Hero() {
  const [room, setRoomState] = useState('cistern');
  const player = useRoomPlayer();
  const current = ROOMS.find((r) => r.key === room);
  const t60 = useGlide(current.t60);
  const playing = player.state === 'playing';

  const choose = useCallback((key) => { setRoomState(key); player.setRoom(key); }, [player]);
  useEffect(() => { player.setRoom(room); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 0–3 (or 1–4 on the rooms) and space, like the plug-in's own keyboard habit in a DAW.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
      const i = ['0', '1', '2', '3'].indexOf(e.key);
      if (i >= 0) { choose(ROOMS[i].key); return; }
      if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        if (playing) player.pause(); else player.play();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose, playing, player]);

  return (
    <section className="klab" data-room={room}>
      <div className="container klab-inner">
        <Link to="/plugins" className="plugin-back">← Plugins</Link>
        <p className="plugin-kicker">SubverseLab · Reverb · Model KB-79</p>
        <h1 className="plugin-title">KUBBE</h1>
        <p className="klab-headline">One phrase. Three rooms. <span>Switch while it plays.</span></p>

        <div className="klab-stage">
          <figure className="klab-panel">
            {['hammam', 'cistern', 'valley'].map((k) => (
              <img key={k} src={media(`/plugins/kubbe/panel-${k}.jpg`)} alt={k === PANEL[room] ? `KUBBE's front panel in ${current.name}` : ''}
                   width="1600" height="629" className={k === PANEL[room] ? 'on' : ''} aria-hidden={k !== PANEL[room]} />
            ))}
            {room === 'dry' && <span className="klab-bypass">BYPASS</span>}
          </figure>

          <div className="klab-player">
            <div className="klab-top">
              <button type="button" className={`klab-play ${playing ? 'is-playing' : ''}`}
                      onClick={() => (playing ? player.pause() : player.play())}
                      aria-label={playing ? 'Pause' : 'Play the phrase'} disabled={player.state === 'loading'}>
                {player.state === 'loading' ? <span className="klab-spin" /> : playing ? <span className="klab-pause" /> : <span className="klab-tri" />}
              </button>
              <div className="klab-vfd" aria-live="polite">
                <span className="klab-vfd-label">{current.t60 ? 'T60 · measured' : 'Reverb off'}</span>
                <span className="klab-vfd-num">{current.t60 ? `${t60.toFixed(2)} s` : '— — —'}</span>
              </div>
            </div>

            <div className="klab-rooms" role="group" aria-label="Room">
              {ROOMS.map((r, i) => (
                <button key={r.key} type="button" aria-pressed={r.key === room}
                        className={`klab-room ${r.key === room ? 'active' : ''}`} onClick={() => choose(r.key)}>
                  <kbd>{i}</kbd>{r.name}
                </button>
              ))}
            </div>

            <EnergyStrip analyserRef={player.analyserRef} playing={playing} room={room} />
            <Progress player={player} />
            <p className="klab-line" aria-live="polite">{current.line}</p>
            {player.state === 'error' && <p className="klab-error">This browser could not load the audio.</p>}
            <p className="klab-note">The same 24-second phrase through KUBBE in each room at Mix 40 %, all four at the same loudness. Headphones on.</p>
          </div>
        </div>

        <div className="klab-buy">
          <BuyButton slug="kubbe" className="btn plugin-btn" />
          <BuyButton slug="family" className="plugin-family-link" label={`Or all seven in the family for $${FAMILY_PRICE} →`} />
          <span className="klab-buy-note">${PRICES.kubbe} · VST3 and AU on macOS, VST3 on Windows</span>
        </div>
      </div>
    </section>
  );
}

export default function KubbeLab() {
  return (
    <PluginRoom
      plugin={KUBBE}
      hero={<Hero />}
      meta={<PageMeta title="KUBBE (prototype) | SubverseLab" description={KUBBE.description} path="/lab/kubbe" noIndex />}
    />
  );
}
