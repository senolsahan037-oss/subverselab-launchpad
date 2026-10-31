import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FORMATS } from '../../data/plugins';
import './listen.css';

/*  "Hear it first" hero for a plug-in room (prototype, /lab/<slug>, 2026-10-15).
 *
 *  Why (reference sites, _legacy/docs/LAB_KUBBE_2026-10-15.md): Baby Audio and Denise put dry → wet players next to the copy,
 *  Denise paints the page in the product's colour, the livelier sites show the interface moving.
 *  Here: one play button and one button per render. Every render of a room is the same source and the same length, so
 *  all of them run in sync and a switch keeps the position. The hero takes the colour of the button being heard, the
 *  panel follows, and the readout glides with the plug-ins' own knob glide (30 % per 30 Hz tick).
 *  Config: src/data/listen.js.
 */

const FADE = 0.03; // s, crossfade time constant on a switch

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// The plug-ins' knob glide: 30 % of the remaining distance per 30 Hz tick, at least one grid step.
function useGlide(target, step) {
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

function useSyncPlayer(buttons, initialKey) {
  const ctxRef = useRef(null);
  const buffersRef = useRef(null);
  const nodesRef = useRef(null); // { sources, gains }
  const analyserRef = useRef(null);
  const startedAtRef = useRef(0);
  const offsetRef = useRef(0);
  const currentRef = useRef(initialKey);
  const [state, setState] = useState('idle'); // idle | loading | playing | paused | error
  const [duration, setDuration] = useState(0);

  const ensure = useCallback(async () => {
    if (buffersRef.current) return true;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) { setState('error'); return false; }
    const ctx = ctxRef.current || new Ctx();
    ctxRef.current = ctx;
    setState('loading');
    try {
      // The dry file is shared between rooms; fetch each distinct file once.
      const files = [...new Set(buttons.map((b) => b.file))];
      const decoded = await Promise.all(files.map(async (file) => {
        const res = await fetch(file);
        if (!res.ok) throw new Error(`${file}: ${res.status}`);
        return ctx.decodeAudioData(await res.arrayBuffer());
      }));
      const byFile = Object.fromEntries(files.map((f, i) => [f, decoded[i]]));
      buffersRef.current = Object.fromEntries(buttons.map((b) => [b.key, byFile[b.file]]));
      setDuration(Math.min(...decoded.map((d) => d.duration)));
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
      return true;
    } catch {
      setState('error');
      return false;
    }
  }, [buttons]);

  const stopSources = () => {
    nodesRef.current?.sources.forEach((s) => { try { s.stop(); } catch { /* already stopped */ } });
    nodesRef.current = null;
  };

  const startAt = useCallback((offset) => {
    const ctx = ctxRef.current;
    stopSources();
    const sources = []; const gains = {};
    const when = ctx.currentTime + 0.02;
    buttons.forEach((b) => {
      const src = ctx.createBufferSource();
      src.buffer = buffersRef.current[b.key];
      src.loop = true;
      src.loopEnd = Math.min(src.buffer.duration, duration || src.buffer.duration);
      const g = ctx.createGain();
      g.gain.value = b.key === currentRef.current ? 1 : 0;
      src.connect(g).connect(analyserRef.current);
      src.start(when, offset);
      sources.push(src); gains[b.key] = g;
    });
    nodesRef.current = { sources, gains };
    startedAtRef.current = when - offset;
    setState('playing');
  }, [buttons, duration]);

  const position = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx || !nodesRef.current || !duration) return offsetRef.current;
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
    if (!duration) return;
    offsetRef.current = Math.min(Math.max(fraction, 0), 0.999) * duration;
    if (nodesRef.current) startAt(offsetRef.current);
  }, [duration, startAt]);

  const select = useCallback((key) => {
    currentRef.current = key;
    const n = nodesRef.current;
    if (!n) return;
    const t = ctxRef.current.currentTime;
    Object.entries(n.gains).forEach(([k, g]) => {
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(k === key ? 1 : 0, t, FADE);
    });
  }, []);

  useEffect(() => () => { stopSources(); ctxRef.current?.close?.(); }, []);

  // The player loops; when the page goes to the background (another tab, minimised window) it pauses, so it never
  // keeps playing out of sight (owner 2026-10-15: a room left open kept sounding).
  useEffect(() => {
    const onHide = () => { if (document.hidden && nodesRef.current) pause(); };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [pause]);

  return { state, play, pause, seek, select, position, duration, analyserRef };
}

// Energy per 20 ms, like KUBBE's decay display: a rolling three-second strip in the room's colour.
function EnergyStrip({ analyserRef, playing, echoes }) {
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
    <div className="lh-strip">
      <canvas ref={canvasRef} width="600" height="120" aria-hidden="true" />
      {echoes && (
        <div className="lh-echoes" aria-label="First echoes">
          {echoes.map((ms) => <span key={ms} style={{ left: `${(ms / 500) * 100}%` }}>{ms}</span>)}
          <em>first echoes, ms</em>
        </div>
      )}
    </div>
  );
}

function Progress({ player }) {
  const [p, setP] = useState(0);
  const { position, duration, seek } = player;
  useEffect(() => {
    let raf = 0;
    const tick = () => { setP(duration ? position() / duration : 0); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [position, duration]);
  const onClick = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    seek((e.clientX - r.left) / r.width);
  };
  const fmt = (s) => `0:${String(Math.floor(s)).padStart(2, '0')}`;
  return (
    <div className="lh-progress-row">
      <button type="button" className="lh-progress" onClick={onClick} aria-label="Jump to a point in the clip">
        <span style={{ width: `${p * 100}%` }} />
      </button>
      <span className="lh-time">{duration ? `${fmt(p * duration)} / ${fmt(duration)}` : '0:00'}</span>
    </div>
  );
}

function Readout({ readout }) {
  const glided = useGlide(readout.value ?? null, readout.digits >= 2 ? 0.01 : 0.1);
  let text = readout.text;
  if (readout.value != null) {
    const v = glided.toFixed(readout.digits ?? 1);
    text = `${readout.sign && glided >= 0 ? '+' : ''}${v}${readout.unit ? ` ${readout.unit}` : ''}`;
  }
  return (
    <div className="lh-vfd" aria-live="polite">
      <span className="lh-vfd-label">{readout.label}</span>
      <span className="lh-vfd-num">{text}</span>
    </div>
  );
}

// The buy / download / coming-soon action comes from PluginRoom (`actions`, `offer`, `trust`), so an owner sees Download
// here exactly as in the panel hero; this component only plays.
export default function ListenHero({ plugin, listen, offer, actions, trust }) {
  const { buttons } = listen;
  const [key, setKey] = useState(listen.start || buttons[0].key);
  const player = useSyncPlayer(buttons, key);
  const current = buttons.find((b) => b.key === key) || buttons[0];
  const playing = player.state === 'playing';
  const panels = useMemo(() => [...new Map(buttons.map((b) => [b.panel.src, b.panel])).values()], [buttons]);
  const name = plugin.displayName;

  const choose = useCallback((k) => { setKey(k); player.select(k); }, [player]);

  // Number keys pick a button (0 = the first), space plays or pauses.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
      // Only real digits: Number(' ') is 0, which turned the space bar into "Dry".
      if (/^[0-9]$/.test(e.key) && Number(e.key) < buttons.length) { choose(buttons[Number(e.key)].key); return; }
      // Space plays unless a control has focus (a focused button or link keeps its own space behaviour).
      if (e.key === ' ' && !e.target.closest?.('button, a, [role="button"], [role="tab"]')) {
        e.preventDefault();
        if (playing) player.pause(); else player.play();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [buttons, choose, playing, player]);

  const c = current.colors;
  const style = { '--room-deep': c.deep, '--room-mid': c.mid, '--room-accent': c.accent, '--room-glow': c.glow };

  return (
    <section className="lh" style={style}>
      <div className="container lh-inner">
        <Link to="/plugins" className="plugin-back">← Plugins</Link>
        <p className="plugin-kicker">SubverseLab · {plugin.kind}{plugin.model ? ` · Model ${plugin.model}` : ''}</p>
        <h1 className="plugin-title">{name}</h1>
        <p className="lh-headline">{listen.headline} <span>{listen.accent}</span></p>

        <div className="lh-stage">
          <figure className="lh-panel" style={{ aspectRatio: `${current.panel.w} / ${current.panel.h}` }}>
            {panels.map((pn) => {
              const on = pn.src === current.panel.src;
              return (
                <img key={pn.src} src={pn.src} alt={on ? `${name}'s front panel` : ''} aria-hidden={!on}
                     width={pn.w} height={pn.h} className={`${on ? 'on' : ''} ${on && current.bypass ? 'bypass' : ''}`} />
              );
            })}
            {current.bypass && <span className="lh-bypass">BYPASS</span>}
          </figure>

          <div className="lh-player">
            <div className="lh-top">
              <button type="button" className={`lh-play ${playing ? 'is-playing' : ''}`}
                      onClick={() => (playing ? player.pause() : player.play())}
                      aria-label={playing ? 'Pause' : 'Play'} disabled={player.state === 'loading'}>
                {player.state === 'loading' ? <span className="lh-spin" /> : playing ? <span className="lh-pause" /> : <span className="lh-tri" />}
              </button>
              <Readout key={current.readout.label} readout={current.readout} />
            </div>

            <div className="lh-buttons" role="group" aria-label="Listen to" style={{ gridTemplateColumns: `repeat(${buttons.length}, 1fr)` }}>
              {buttons.map((b, i) => (
                <button key={b.key} type="button" aria-pressed={b.key === key}
                        className={`lh-button ${b.key === key ? 'active' : ''}`} onClick={() => choose(b.key)}>
                  <kbd>{i}</kbd>{b.name}
                </button>
              ))}
            </div>

            <EnergyStrip analyserRef={player.analyserRef} playing={playing} echoes={current.echoes} />
            <Progress player={player} />
            <p className="lh-line" aria-live="polite">{current.line}</p>
            {player.state === 'error' && <p className="lh-error">This browser could not load the audio.</p>}
            <p className="lh-note">{listen.note}</p>
          </div>
        </div>

        <div className="lh-buy">
          {offer && <p className="lh-offer">{offer} <span>· {plugin.formats || FORMATS}</span></p>}
          {actions}
          {trust && <p className="lh-trust">{trust}</p>}
        </div>
      </div>
    </section>
  );
}
