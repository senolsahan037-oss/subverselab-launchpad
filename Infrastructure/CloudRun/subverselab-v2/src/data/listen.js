/*  "Hear it first" sections for the plug-in rooms (prototype on /lab/<slug>, 2026-10-15; local only).
 *
 *  One entry per room. Every button is one render of the SAME source, all the same length, so the player can run
 *  them in sync and a switch keeps the position. Readout values are measurements, never adjectives:
 *    KUBBE  — T60 as KUBBE's own display shows it on the panel images.
 *    drums  — 01_AI_Tools/subverselab-plugin-common/demos/drums_2026-10-15/SOURCE.md (TUTKAL)
 *    synth  — 01_AI_Tools/subverselab-plugin-common/demos/synth_2026-10-15/SOURCE.md (TABAN, KIYMA)
 *  Audio is royalty-free and made by us (owner rule 15 Oct: never the owner's own tracks):
 *    KUBBE  — 01_AI_Tools/subverselab-reverb/demos/public/site_2026-10-15/SOURCE.md (synth phrase, KUBBE 1.1.0)
 *    drums  — Ableton Session Drums Club "Kit-BigPunchy" + our own 8-bar pattern, 95 BPM.
 *    RU-8   — 01_AI_Tools/subverselab-ru8/marketing/listen/SOURCE.md (RU-8's own output, Boom bap set, one file per kit)
 *  The files are matched in loudness within a room, so a switch is a fair A/B.
 *
 *  Shape:
 *    { headline, accent, note, start, buttons: [{ key, name, file, panel, bypass?, line, readout, colors }] }
 *    readout: { label, value?, digits?, unit?, text? } — `value` glides like the plug-ins' knobs, `text` is shown as is.
 *    colors:  { deep, mid, accent, glow } — the hero takes the colour of the button being heard.
 *    panel:   { src, w, h }. Paths go through media() here, like plugins.js, so a split build loads them from the bucket.
 */

import { media } from '../utils/endpoints.js';

// Room colours come only from the brand kit (Assets/Brand/_kit/brand.py) and the site's dark theme (index.css):
// cream #F2EFE7, ink ground #032825 / #022421, ink #033733 / #0A524B / #1B655C, gold #C5A059 / #D9B978, teal #3BBFAF.
// Owner 15 Oct: no colours outside the brand system.
const GREY = { deep: '#032825', mid: '#0E302C', accent: '#F2EFE7', glow: 'rgba(242, 239, 231, .06)' };
const GOLD = { deep: '#022421', mid: '#0A524B', accent: '#D9B978', glow: 'rgba(217, 185, 120, .16)' };
const TEAL = { deep: '#032825', mid: '#1B655C', accent: '#3BBFAF', glow: 'rgba(59, 191, 175, .16)' };
const MIST = { deep: '#022421', mid: '#033733', accent: '#CFE0DC', glow: 'rgba(207, 224, 220, .12)' };
const DRUMS_DRY = media('/plugins/_shared/audio/drums_dry.m4a');
const DRUM_NOTE = 'The same 23-second kit (an Ableton Session Drums kit, our own pattern at 95 BPM), dry and through';
// TABAN and KIYMA are shown on synth lines made for them (owner 15 Oct: drums do not show what these two do).
const VOCAL_NOTE = 'The same 22-second vocal (“daydream sunglasses” by Emilija L. Ducks, CC0, from Freesound), dry and through';
const SYNTH_NOTE = 'The same 23-second phrase (a synth line made for this demo, 95 BPM), dry and through';

export const LISTEN = {
  kubbe: {
    headline: 'One phrase. Three rooms.',
    accent: 'Switch while it plays.',
    note: 'The same 24-second phrase through KUBBE in each room at Mix 40 %, all four at the same loudness. Headphones on.',
    start: 'cistern',
    buttons: [
      { key: 'dry', name: 'Dry', file: media('/plugins/kubbe/audio/dry.m4a'), panel: { src: media('/plugins/kubbe/panel-hammam.jpg'), w: 1600, h: 629 }, bypass: true,
        line: 'The phrase on its own. Nothing added.', readout: { label: 'Reverb off', text: '— — —' }, colors: GREY },
      { key: 'hammam', name: 'Hammam', file: media('/plugins/kubbe/audio/hammam.m4a'), panel: { src: media('/plugins/kubbe/panel-hammam.jpg'), w: 1600, h: 629 },
        line: 'Short and bright: dense first reflections and a flutter.', readout: { label: 'T60 · measured', value: 2.4, digits: 2, unit: 's' },
        colors: GOLD },
      { key: 'cistern', name: 'Cistern', file: media('/plugins/kubbe/audio/cistern.m4a'), panel: { src: media('/plugins/kubbe/panel-cistern.jpg'), w: 1600, h: 629 },
        line: 'Long and dark: late slaps and a tail that drifts.', readout: { label: 'T60 · measured', value: 6.8, digits: 2, unit: 's' },
        colors: TEAL },
      { key: 'valley', name: 'Valley', file: media('/plugins/kubbe/audio/valley.m4a'), panel: { src: media('/plugins/kubbe/panel-valley.jpg'), w: 1600, h: 629 },
        line: 'Open and rhythmic: echoes answer one by one, each one darker.', readout: { label: 'T60 · measured', value: 2.48, digits: 2, unit: 's' },
        echoes: [32, 86, 201, 353, 469],
        colors: MIST },
    ],
  },

  tutkal: {
    headline: 'Same kit.',
    accent: 'Glued.',
    note: `${DRUM_NOTE} TUTKAL, both at the same loudness. Headphones on.`,
    start: 'tutkal',
    buttons: [
      { key: 'dry', name: 'Dry', file: DRUMS_DRY, panel: { src: media('/plugins/tutkal/front_glue.png'), w: 1600, h: 640 }, bypass: true,
        line: 'The kit as it was played: loud backbeats, ghost notes far below them.',
        readout: { label: 'Loudness range', value: 4.1, digits: 1, unit: 'LU' }, colors: GREY },
      { key: 'tutkal', name: 'TUTKAL', file: media('/plugins/tutkal/audio/tutkal.m4a'), panel: { src: media('/plugins/tutkal/front_glue.png'), w: 1600, h: 640 },
        line: 'GLUE, threshold lowered. The kit sits together and the hits keep their snap.',
        readout: { label: 'Loudness range', value: 2.7, digits: 1, unit: 'LU' },
        colors: GOLD },
    ],
  },

  taban: {
    headline: 'A floor,',
    accent: 'not a ceiling.',
    note: `${SYNTH_NOTE} TABAN, both at the same loudness. Headphones on.`,
    start: 'taban',
    buttons: [
      { key: 'dry', name: 'Dry', file: media('/plugins/taban/audio/taban_dry.m4a'), panel: { src: media('/plugins/taban/front_bypassed.png'), w: 1520, h: 1000 },
        line: 'Loud pad chords, then soft plucked notes far below them.',
        readout: { label: 'Quiet parts lifted', value: 0, digits: 1, unit: 'dB', sign: true }, colors: GREY },
      { key: 'taban', name: 'TABAN', file: media('/plugins/taban/audio/taban.m4a'), panel: { src: media('/plugins/taban/front_lifting.png'), w: 1520, h: 1000 },
        line: 'FLOOR at −27 dBFS. The soft notes come up; the loud chords pass through unchanged.',
        readout: { label: 'Quiet parts lifted', value: 7.7, digits: 1, unit: 'dB', sign: true },
        colors: GOLD },
    ],
  },

  kiyma: {
    headline: 'The last phrase,',
    accent: 'minced.',
    note: `${SYNTH_NOTE} KIYMA, both at the same loudness. Headphones on.`,
    start: 'kiyma',
    buttons: [
      { key: 'dry', name: 'Dry', file: media('/plugins/kiyma/audio/kiyma_dry.m4a'), panel: { src: media('/plugins/kiyma/kiyma_default.jpg'), w: 1200, h: 800 },
        line: 'A riff that runs up and down, note by note, over a steady bass.',
        readout: { label: 'Grinder', text: 'OFF' }, colors: GREY },
      { key: 'kiyma', name: 'KIYMA', file: media('/plugins/kiyma/audio/kiyma.m4a'), panel: { src: media('/plugins/kiyma/kiyma_mince.jpg'), w: 1200, h: 800 },
        line: 'Glitch 60 %, Brutal 30 %, Crank 50 %. The same riff, its steps cut and re-ordered in time.',
        readout: { label: 'Grinder', text: 'G60 B30 C50' },
        colors: GOLD },
    ],
  },

  // KASET: owner 15 Oct — only the copy (dub generation) feature, on a finished song mastered with MIHENK (the owner's
  // own master, used by the owner's explicit instruction). Readout: level above 10 kHz against the source, measured.
  kaset: {
    headline: 'Copy it.',
    accent: 'Hear every generation.',
    note: 'A 22-second excerpt of a finished, mastered song: the source, then copied through KASET on NORMAL tape, all at the same loudness. Headphones on.',
    start: 'dub2',
    buttons: [
      { key: 'dry', name: 'Source', file: media('/plugins/kaset/audio/kaset_dry.m4a'), panel: { src: media('/plugins/kaset/panel.jpg'), w: 938, h: 553 }, bypass: true,
        line: 'The finished master on its own.', readout: { label: 'Above 10 kHz', value: 0, digits: 1, unit: 'dB', sign: true }, colors: GREY },
      { key: 'master', name: 'Master', file: media('/plugins/kaset/audio/kaset_master.m4a'), panel: { src: media('/plugins/kaset/panel-master.jpg'), w: 964, h: 568 },
        line: 'The first pass onto tape: a little warmth, the top barely touched. Wow 2.3 cents rms.',
        readout: { label: 'Above 10 kHz', value: -2.4, digits: 1, unit: 'dB', sign: true }, colors: GOLD },
      { key: 'dub2', name: '2nd dub', file: media('/plugins/kaset/audio/kaset_2nddub.m4a'), panel: { src: media('/plugins/kaset/panel-2nddub.jpg'), w: 964, h: 568 },
        line: 'A copy of a copy: the top softens, the pitch starts to sway. Wow 3.6 cents rms.',
        readout: { label: 'Above 10 kHz', value: -10.0, digits: 1, unit: 'dB', sign: true }, colors: TEAL },
      { key: 'dub4', name: '4th dub', file: media('/plugins/kaset/audio/kaset_4thdub.m4a'), panel: { src: media('/plugins/kaset/panel-4thdub.jpg'), w: 964, h: 568 },
        line: 'Four copies down: dark, worn, floating. Wow 4.4 cents rms.',
        readout: { label: 'Above 10 kHz', value: -19.4, digits: 1, unit: 'dB', sign: true }, colors: MIST },
    ],
  },

  // HAVA: the passage from HAVA's own video (owner 15 Oct). Readout: level above 10 kHz added by HAVA, before level matching.
  hava: {
    headline: 'Air on top.',
    accent: 'Never a reverb.',
    note: 'The same 23-second passage as in HAVA’s video, dry and through three HAVA presets, all at the same loudness. Headphones on.',
    start: 'airfull',
    buttons: [
      { key: 'dry', name: 'Dry', file: media('/plugins/hava/audio/hava_dry.m4a'), panel: { src: media('/plugins/hava/hava_v2_front.png'), w: 1600, h: 640 }, bypass: true,
        line: 'The passage on its own.', readout: { label: 'Above 10 kHz', value: 0, digits: 1, unit: 'dB', sign: true }, colors: GREY },
      { key: 'airlight', name: 'Air light', file: media('/plugins/hava/audio/hava_airlight.m4a'), panel: { src: media('/plugins/hava/hava_v2_front.png'), w: 1600, h: 640 },
        line: 'AIR LIGHT: a little more top, nothing else moves.', readout: { label: 'Above 10 kHz', value: 2.1, digits: 1, unit: 'dB', sign: true }, colors: MIST },
      { key: 'airfull', name: 'Air full', file: media('/plugins/hava/audio/hava_airfull.m4a'), panel: { src: media('/plugins/hava/hava_v2_front.png'), w: 1600, h: 640 },
        line: 'AIR FULL: the whole top end opens.', readout: { label: 'Above 10 kHz', value: 4.8, digits: 1, unit: 'dB', sign: true }, colors: GOLD },
      { key: 'airsheen', name: 'Air + sheen', file: media('/plugins/hava/audio/hava_airsheen.m4a'), panel: { src: media('/plugins/hava/hava_v2_front.png'), w: 1600, h: 640 },
        line: 'AIR + SHEEN: air plus a short spring shimmer, 0.63 s, gone before the next note.',
        readout: { label: 'Above 10 kHz', value: 3.0, digits: 1, unit: 'dB', sign: true }, colors: TEAL },
    ],
  },

  // YANKI and KORO: a royalty-free female vocal (owner 15 Oct). "daydream sunglasses" by Emilija L. Ducks, Freesound #784179, CC0.
  yanki: {
    headline: 'One voice.',
    accent: 'Three tape echoes.',
    note: `${VOCAL_NOTE} YANKI in three moods, all at the same loudness. Headphones on.`,
    start: 'echo',
    buttons: [
      { key: 'dry', name: 'Dry', file: media('/plugins/yanki/audio/yanki_dry.m4a'), panel: { src: media('/plugins/yanki/yanki_v2_front.png'), w: 1600, h: 900 }, bypass: true,
        line: 'The voice on its own: a phrase, a gap, a phrase.', readout: { label: 'Delay', text: '— — —' }, colors: GREY },
      { key: 'echo', name: 'Echo', file: media('/plugins/yanki/audio/yanki_echo.m4a'), panel: { src: media('/plugins/yanki/yanki_v2_front.png'), w: 1600, h: 900 },
        line: 'ECHO: a plain quarter-note tape echo that fills the gap.', readout: { label: 'Delay · measured', value: 882, digits: 0, unit: 'ms' }, colors: GOLD },
      { key: 'yesilcam', name: 'Yesilcam', file: media('/plugins/yanki/audio/yanki_yesilcam.m4a'), panel: { src: media('/plugins/yanki/yanki_v2_swell.png'), w: 1600, h: 900 },
        line: 'YESILCAM: a dotted-eighth echo with a worn, wide tail.', readout: { label: 'Delay · measured', value: 690, digits: 0, unit: 'ms' }, colors: TEAL },
      { key: 'ters', name: 'Ters', file: media('/plugins/yanki/audio/yanki_ters.m4a'), panel: { src: media('/plugins/yanki/yanki_v2_slap.png'), w: 1600, h: 900 },
        line: 'TERS: the repeats come back reversed, swelling into each word.', readout: { label: 'Delay · set', value: 441, digits: 0, unit: 'ms' }, colors: MIST },
    ],
  },

  koro: {
    headline: 'One voice.',
    accent: 'A choir behind it.',
    note: `${VOCAL_NOTE} KORO in three moods, all at the same loudness. Headphones on.`,
    start: 'third',
    buttons: [
      { key: 'dry', name: 'Dry', file: media('/plugins/koro/audio/koro_dry.m4a'), panel: { src: media('/plugins/koro/koro_v2_front.png'), w: 1600, h: 640 }, bypass: true,
        line: 'The lead vocal on its own.', readout: { label: 'Voices added', text: '— — —' }, colors: GREY },
      { key: 'double', name: 'Tight double', file: media('/plugins/koro/audio/koro_double.m4a'), panel: { src: media('/plugins/koro/koro_v2_front.png'), w: 1600, h: 640 },
        line: 'TIGHT DOUBLE: a second take in unison, 14 dB under the lead.', readout: { label: 'Voices added', text: 'UNISON' }, colors: MIST },
      { key: 'third', name: 'Third', file: media('/plugins/koro/audio/koro_third.m4a'), panel: { src: media('/plugins/koro/koro_v2_front.png'), w: 1600, h: 640 },
        line: 'THIRD: a harmony a third above, always in key.', readout: { label: 'Voices added', text: '3RD UP' }, colors: GOLD },
      { key: 'choir', name: 'Choir', file: media('/plugins/koro/audio/koro_choir.m4a'), panel: { src: media('/plugins/koro/koro_v2_front.png'), w: 1600, h: 640 },
        line: 'CHOIR: a third below, a third above and a fifth above, spread wide.', readout: { label: 'Voices added', text: '3↓ 3↑ 5↑' }, colors: TEAL },
    ],
  },

  // ALEV: our own synth riff. The dry is ALEV at MIX 0 so the crossover's phase is the same in every file (a DAW bypass
  // comparison hears the same). Readout: THD on a 440 Hz test tone at -12 dBFS, measured.
  alev: {
    headline: 'Three rings of heat.',
    accent: 'Turn it up.',
    note: `${SYNTH_NOTE} ALEV at its default and pushed hot, all at the same loudness. Headphones on.`,
    start: 'hot',
    buttons: [
      { key: 'dry', name: 'Dry', file: media('/plugins/alev/audio/alev_dry.m4a'), panel: { src: media('/plugins/alev/alev_default.png'), w: 960, h: 880 }, bypass: true,
        line: 'The riff, clean.', readout: { label: 'THD · 440 Hz tone', value: 0, digits: 1, unit: '%' }, colors: GREY },
      { key: 'warm', name: 'Default', file: media('/plugins/alev/audio/alev_warm.m4a'), panel: { src: media('/plugins/alev/alev_default.png'), w: 960, h: 880 },
        line: 'The default, LOW 30 %, MID 30 %, HIGH 20 %: a touch of warmth, the riff barely changed.', readout: { label: 'THD · 440 Hz tone', value: 2.0, digits: 1, unit: '%' }, colors: GOLD },
      { key: 'hot', name: 'Hot', file: media('/plugins/alev/audio/alev_hot.m4a'), panel: { src: media('/plugins/alev/alev_hot.png'), w: 960, h: 880 },
        line: 'LOW 90 %, MID 70 %, HIGH 100 %: driven hard, peaks pressed 7.3 dB closer to the body.', readout: { label: 'THD · 440 Hz tone', value: 19.6, digits: 1, unit: '%' }, colors: TEAL },
    ],
  },

  // RU-8: kits bring the character, sets bring the rhythm. Every button is the same Boom bap set (90 BPM, A, fill, B, fill)
  // on another kit, rendered by RU-8's own processor; no dry button (an instrument has no dry). Readout: the time for the
  // kick on each downbeat to fall 20 dB, measured on the file (an isolated kick of each kit agrees within 6 ms).
  ru8: {
    headline: 'One rhythm.',
    accent: 'Change the kit.',
    note: 'The same 21-second rhythm (the Boom bap set at 90 BPM: A, a fill, B, a fill) on each kit, all at the same loudness. Headphones on.',
    start: 'lofi',
    buttons: [
      { key: 'analog', name: 'Analog', file: media('/plugins/ru8/audio/analog.m4a'), panel: { src: media('/plugins/ru8/panel-kit-analog.webp'), w: 1600, h: 1116 },
        line: 'A sine-sub kick, square-cluster hats and round toms, in a small room.', readout: { label: 'Kick decay · measured', value: 166, digits: 0, unit: 'ms' }, colors: TEAL },
      { key: 'lofi', name: 'Lo-fi', file: media('/plugins/ru8/audio/lofi.m4a'), panel: { src: media('/plugins/ru8/panel-kit-lofi.webp'), w: 1600, h: 1116 },
        line: 'Dusty tape, a soft kick and a muted snare: the peaks sit 6.3 dB closer to the body than on Analog.', readout: { label: 'Kick decay · measured', value: 144, digits: 0, unit: 'ms' }, colors: GOLD },
      { key: 'steel', name: 'Industrial', file: media('/plugins/ru8/audio/steel.m4a'), panel: { src: media('/plugins/ru8/panel-kit-steel.webp'), w: 1600, h: 1116 },
        line: 'Metal hits, grit and a long hall: the spectral centre sits at 0.94 kHz, Analog’s at 0.29 kHz.', readout: { label: 'Kick decay · measured', value: 100, digits: 0, unit: 'ms' }, colors: MIST },
      { key: 'trap', name: 'Trap', file: media('/plugins/ru8/audio/trap.m4a'), panel: { src: media('/plugins/ru8/panel-kit-trap.webp'), w: 1600, h: 1116 },
        line: 'A long 808 under a tight snare and fast hats: 97 % of the energy sits below 150 Hz.', readout: { label: 'Kick decay · measured', value: 254, digits: 0, unit: 'ms' }, colors: TEAL },
      { key: 'dry', name: 'Dry', file: media('/plugins/ru8/audio/dry.m4a'), panel: { src: media('/plugins/ru8/panel-kit-dry.webp'), w: 1600, h: 1116 },
        line: 'Short and close: clicks, a small room and no tail; the peaks stand 23.3 dB above the body.', readout: { label: 'Kick decay · measured', value: 72, digits: 0, unit: 'ms' }, colors: GREY },
    ],
  },
};
