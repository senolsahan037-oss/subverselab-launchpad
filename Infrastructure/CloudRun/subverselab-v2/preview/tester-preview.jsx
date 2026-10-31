// Local design preview of the integrated tester space: AccountPage for an approved tester (the tester space with the normal
// account content as its "Orders & keys" section). Mock data only: nothing here talks to Firestore, GCS or the live site.
// Run `npx vite` in subverselab-v2 and open /preview/tester.html. Not part of the build (vite builds index.html only).
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '../src/index.css';
import AccountPage from '../src/components/AccountPage';

const now = new Date();
const iso = (d) => new Date(now.getTime() - d * 86400000).toISOString();
const month = now.toISOString().slice(0, 7);
let messages = [
  { id: 'm1', from: 'staff', kind: 'message', body: 'Welcome to the lab, Andre. Your first test build is in the Test area, with its manual and three things we would like you to try.', at: iso(0.2), read: false },
];
const state = {
  panel: {
    status: 'active',
    welcome: { name: 'Andre', production: 'Bigdre Productions' },
    messages: { unread: 1 },
    agreement: { version: '1.1', acceptedAt: '2026-10-14T17:04:22Z' },
    downloads: ['kubbe', 'kaset', 'koro', 'yanki', 'hava', 'mihenk', 'tutkal', 'alev', 'taban', 'kiyma', 'elek'],
    credits: { month, monthly: 2000, left: 1650 },
    reports: { month, sent: 2, cap: 50 },
  },
  builds: [
  {
    id: 'b1', slug: 'seda', name: 'SEDA', version: '0.9.0', platform: 'mac', notes: 'First test build. Audio Unit and VST3, Apple Silicon.',
    createdAt: iso(0.3), releasedAt: null,
    brief: {
      "goal": "SEDA is an analog-style delay built around the sound of a bucket-brigade (BBD) delay line: the warm, darkening, slightly smeared repeats of classic analog pedals, with built-in modulation that can go from a gentle chorus shimmer to vibrato. On top of the plain delay sits one button, LISTEN: when it is on, SEDA listens to what you play and moves the repeats out of the way while the source is busy, letting them bloom in the gaps. When LISTEN is off, SEDA is a plain, hands-on analog delay.",
      "reference": "Think of the classic BBD pedals: Electro-Harmonix Memory Man / Deluxe Memory Man, Boss DM-2, MXR Carbon Copy. What makes them special: every repeat gets darker and softer than the one before, the clock noise and the compander \"bloom\" on transients, the pitch bend when you turn the time knob, and the way feedback above 100 % turns into a controlled, singing self-oscillation. SEDA should sit in that family, clearly apart from tape echo (our YANKI is the tape-loop one).",
      "strengths": [
            "The delay is clean and stable: no clicks when you turn knobs, no runaway feedback; above 100 % it self-oscillates into a soft limiter and never hits digital full scale.",
            "Each repeat gets darker than the one before, like a real BBD line (the filters follow the delay clock), and turning TIME bends the pitch of the repeats instead of jumping.",
            "Modulation runs from a light chorus shimmer to vibrato, with a slow random drift; stereo modes MONO, WIDE and PING-PONG; tempo sync with dotted and triplet notes.",
            "LISTEN (one button) ducks the repeats while you play and lets them bloom in the gaps; it was checked on 95 automated cases with no failures.",
            "Loads as AU and VST3 at 44.1 and 48 kHz and restores its state after save and reopen in our host tests."
      ],
      "knownIssues": [
            "Our own verdict, honestly: the overall sound is not yet the BBD pedal we are aiming for. Side by side with a real Memory Man or DM-2 it sounds too polite and too digital. We are reworking the delay engine; your comparisons will guide that work.",
            "In one of our own sessions in Ableton Live the repeats felt late; our host tests do not reproduce it, so we do not know yet whether it happens in Logic. Please tell us if anything feels late.",
            "The panel and some control ranges may still change."
      ],
      "focus": "How close SEDA feels to those devices, in your own words and in plug-in terms: where it sounds like a BBD and where it sounds digital or flat; whether the repeats darken and smear the way you expect; how the modulation feels; whether LISTEN helps a real mix or gets in the way. If you know the real pedals or other BBD plug-ins, comparisons are very welcome. This build is early: the delay engine itself is still being reworked, so honest \"this does not sound like a BBD because ...\" notes are exactly what we need."
},
    licence: { product: 'seda', key: 'SVL-7K2M-9QXD-4RTA-HB3N', status: 'active' },
    manuals: [{ title: 'SEDA owner\'s manual (draft)', index: 0, url: null }],
    tasks: [
      {
            "id": "t1",
            "title": "Mono and stereo in Logic",
            "detail": "insert SEDA (AU) on a mono and on a stereo track. Does it appear in both menus and pass audio?"
      },
      {
            "id": "t2",
            "title": "BBD character",
            "detail": "play a short vocal or guitar phrase with TIME around 350 ms and FEEDBACK around 50 %. Describe the repeats: how dark, how smeared, how they compare with a BBD pedal you know."
      },
      {
            "id": "t3",
            "title": "Time knob",
            "detail": "turn TIME while the repeats ring. Do you hear the pitch bend of an analog delay, and is it free of clicks?"
      },
      {
            "id": "t4",
            "title": "Self-oscillation",
            "detail": "push FEEDBACK past 100 % for a few seconds. Does it sing and stay under control?"
      },
      {
            "id": "t5",
            "title": "LISTEN",
            "detail": "turn it on with a vocal or lead line. Do the repeats duck while you play and come back in the gaps? Does it feel natural?"
      },
      {
            "id": "t6",
            "title": "Save, quit, reopen",
            "detail": "do all settings come back?"
      }
],
    result: null,
  },
  {
    id: 'b2', slug: 'adalet', name: 'ADALET', version: '0.9.0', platform: 'mac', notes: 'First test build. Audio Unit and VST3, Apple Silicon.',
    createdAt: iso(0.4), releasedAt: null,
    brief: {
      "goal": "ADALET is a dynamic EQ built to make one everyday job easy: keeping two sounds from fighting for the same space. Put it on one track (a beat, a synth, a guitar bus, a bass), feed it the other through the sidechain (the vocal, the kick), and it cuts the first track only where and only while the two collide in frequency. You do not hunt for frequencies or draw bands: it listens to both and shows the collisions on its screen. When there is no collision it does nothing at all. Next to that it is a complete dynamic EQ: six free bands, a SELF mode that finds and calms resonances on a single track, and BAKE, which freezes what it learned into a static EQ.",
      "reference": "The job people usually do by hand with sidechained EQ or with tools such as Trackspacer, Soothe or a manually automated dynamic EQ (FabFilter Pro-Q dynamic bands). Our aim is ease of use: fewer decisions, a clear picture of what is being cut and why, and results that sound natural without fine-tuning.",
      "strengths": [
            "The main idea works: on a vocal-over-beat mix it cuts the beat only where and while the two collide, and when nothing collides the signal passes untouched (bit for bit).",
            "Zero latency, no pre-ringing, and cuts are smoothed so they do not click or whistle.",
            "One screen (LAB) shows what is being cut and why, live.",
            "Six free dynamic bands, SELF mode for resonances on a single track, and BAKE to freeze the result into a static EQ.",
            "Stable in our tests: 271 plug-in checks and 691 automated variations pass; AU validation passes; a host reset now fully clears it."
      ],
      "knownIssues": [
            "Kick and bass: keyed by the kick, it can cut the bass above the kick (around 120-170 Hz) instead of at the kick's fundamental (around 40-60 Hz), and the low FOCUS limit (40 Hz) does not move that cut. We know why and are changing the rule; tell us what you hear.",
            "TARGET learning on drums can miss a snare that always lands on a kick (four on the floor).",
            "In one rare corner (DELTA on with KEY LISTEN on a chord) the output can peak too loud; keep your monitors down when you try DELTA.",
            "Some advanced controls may still be renamed or removed after your feedback."
      ],
      "focus": "Whether it really saves you work: how quickly you get a clean result, whether the screen makes clear what is happening, which controls you never touch and which you miss, and where the result sounds unnatural (pumping, a hollow sound, a cut in the wrong place). Plain words are enough; tell us what you tried and what you heard."
},
    licence: { product: 'adalet', key: 'SVL-3H8W-2NPC-6VYE-KD5Q', status: 'active' },
    manuals: [{ title: 'ADALET owner\'s manual (draft)', index: 0, url: null }],
    tasks: [
      {
            "id": "t1",
            "title": "Vocal over a beat",
            "detail": "ADALET on the beat, the vocal on the sidechain (Logic: side chain menu in the plug-in header). Does the vocal come forward without the beat sounding hollow?"
      },
      {
            "id": "t2",
            "title": "Kick and bass",
            "detail": "ADALET on the bass, keyed by the kick. Does the low end tighten? Note the frequency it cuts and whether it matches the kick."
      },
      {
            "id": "t3",
            "title": "Readability",
            "detail": "without the manual, can you tell from the screen what is being cut and why? What was unclear?"
      },
      {
            "id": "t4",
            "title": "SELF mode on a single resonant track (a boomy guitar or vocal)",
            "detail": "does it calm the resonances without dulling the sound?"
      },
      {
            "id": "t5",
            "title": "BAKE",
            "detail": "freeze a result into the static EQ. Is the result what you heard before baking?"
      },
      {
            "id": "t6",
            "title": "Save, quit, reopen",
            "detail": "do all settings and the learned state come back?"
      }
],
    result: null,
  },
  ],
  reports: [
    { id: 'r2', plugin: 'tutkal', kind: 'works', os: 'macOS Apple Silicon', daw: 'Logic Pro', dawVersion: '12.3.1', text: 'Sidechain keys instantly from a bus send. Works fine here.', at: iso(1) },
    { id: 'r1', plugin: '', kind: 'panel', os: '', daw: '', dawVersion: '', text: 'Could the panel remember which section I had open last?', at: iso(2) },
  ],
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const realFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  const path = url.replace(location.origin, '').split('?')[0];
  const method = (init.method || 'GET').toUpperCase();
  const body = init.body ? JSON.parse(init.body) : {};
  if (path === '/api/testers/me') return json({ status: 'approved' });
  if (path === '/api/purchases/status') return json({ full: true, owned: ['koro', 'tutkal'], standing: 'tester', purchased: {}, updatesUntil: {}, unverified: false });
  if (path === '/api/purchases/licenses') return json({ licenses: [] });
  if (path === '/api/credits/balance') return json({ balance: 1650, tester: { month, monthly: 2000, left: 1650 }, costs: { splitter: 50, visualizer: 50, mixcheck: 100, 'arrangement-gps': 25 }, recent: [{ delta: 2000, reason: 'tester-grant', tool: null, at: iso(3) }, { delta: -350, reason: 'spend', tool: 'mixcheck', at: iso(1) }] });
  if (path === '/api/inbox') return json({ messages: [], unread: 0 });
  if (path === '/api/testers/agent-token' && method === 'GET') return json({ exists: false, createdAt: null, lastUsedAt: null });
  if (path === '/api/testers/agent-token') return json({ token: 'svlt_' + '0123456789abcdef'.repeat(3), createdAt: new Date().toISOString() });
  if (path === '/api/testers/seats') return json({ total: 100, approved: 1 });
  if (path === '/api/testers/panel') return json({ ...state.panel, messages: { unread: messages.filter((m) => m.from === 'staff' && !m.read).length } });
  if (path === '/api/testers/builds') return json({ builds: state.builds });
  if (path === '/api/testers/reports') return json({ reports: state.reports });
  if (path === '/api/testers/report') { state.reports.unshift({ id: 'r' + Date.now(), plugin: body.plugin || '', kind: body.kind, os: body.os || '', daw: body.daw || '', dawVersion: body.dawVersion || '', text: body.text, at: new Date().toISOString() }); state.panel.reports.sent += 1; return json({ ok: true, left: 50 - state.panel.reports.sent }); }
  if (path === '/api/testers/builds/result') { const b = state.builds.find((x) => x.id === body.buildId); b.result = { tasks: body.tasks, summary: body.summary, updatedAt: new Date().toISOString() }; return json({ ok: true }); }
  if (path === '/api/testers/messages' && method === 'GET') return json({ messages, unread: messages.filter((m) => m.from === 'staff' && !m.read).length });
  if (path === '/api/testers/messages') { messages = [...messages, { id: 'm' + Date.now(), from: 'tester', kind: body.kind || 'message', body: body.body, at: new Date().toISOString(), read: false }]; return json({ ok: true }); }
  if (path === '/api/testers/messages/read') { messages = messages.map((m) => (m.from === 'staff' ? { ...m, read: true } : m)); return json({ ok: true, changed: 1 }); }
  if (path === '/api/testers/agreement') return realFetch('/01_agreement_preview.html').catch(() => new Response('<p>Agreement v1.1 (preview)</p>', { headers: { 'Content-Type': 'text/html' } }));
  if (path === '/api/download/ticket') return json({ error: 'Preview: downloads are disabled' }, 403);
  if (path === '/api/download/manifest') return json({});
  if (path.startsWith('/api/')) return json({});
  return realFetch(input, init);
};

const user = { email: 'bigdre45@gmail.com', uid: 'preview', emailVerified: true, providerData: [{ providerId: 'google.com' }], getIdToken: async () => 'preview' };
createRoot(document.getElementById('root')).render(
  <BrowserRouter><AccountPage user={user} packs={[]} onLogout={() => {}} onDeleted={() => {}} /></BrowserRouter>,
);
