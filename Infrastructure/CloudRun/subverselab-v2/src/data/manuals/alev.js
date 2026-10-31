// ALEV owner's manual as a web page: /plugins/alev/manual.
// Source: 01_AI_Tools/subverselab-kor/docs/manual/Alev_Manual.html (12 Oct 2026, written for ALEV 1.0.0, corrected after the
// 12 Oct audit; same text as public/plugins/alev/Alev_Manual.pdf). The site sells 1.0.1 (12 Oct): the same sound bit for bit
// (subverselab-kor/STATUS.md), with typed values fixed and the ring labels moved clear of the pointer; nothing in the manual
// text changes. Left out: the line on what the name means (public copy rule), the versioned installer file names, the
// Windows "More info / Run anyway" line (a copied VST3 folder is not run), "Windows 10" (Windows 64-bit instead), and the
// manual's own "Getting ALEV" paragraph (replaced by gettingIt()).

import { ALEV } from '../plugins.js';
import { installation, gettingIt, manualBase } from './common.js';

export const ALEV_MANUAL = {
  ...manualBase(ALEV, {
    subtitle: 'Three-Band Saturator · Heat Rings and Ember · Model AL-81',
    description: 'The ALEV owner’s manual: three loudness-matched saturation bands, quick start, the front panel with every range and default, the FREE, LINK and GANG pushers, recipes, how it works, installation on macOS and Windows, specifications and the measured numbers.',
  }),
  sections: [
    {
      id: 'introduction',
      heading: 'What ALEV is',
      blocks: [
        { p: 'Three steel rings heat three parts of the sound: the lows, the mids and the highs. The ember in the centre is the only light on the unit and glows with that heat.' },
        { h3: 'Saturation you can feel, still clean' },
        { p: 'ALEV splits the signal at 200 Hz and 3 kHz and drives each band into a soft saturation curve of its own. A little heat adds density and warmth; a lot gives a thick, driven sound. Because each band is heated alone, the lows can be fattened without the cymbals turning harsh, or the top can be given bite without the bass breaking up.' },
        { h3: 'Heat, not loudness' },
        { p: 'Saturation makes a sound louder, and louder always sounds “better” for a moment. ALEV takes that trick away: every ring is loudness-matched, so turning a band from 0 to 100 leaves the loudness where it was. What changes is the character. The loudness trims are calibrated on pink noise; on kick-heavy material LOW at 100 % comes out about 4 dB quieter (measured −4.2 dB RMS on drums, same peak). The output never passes −1 dBTP.' },
        { h3: 'No other knobs' },
        { p: 'There is nothing else to set: the crossovers, the curve and the output ceiling are fixed and tuned. Three rings, one DRY/WET fader, three pushers.' },
      ],
    },
    {
      id: 'quick-start',
      heading: 'Quick start',
      blocks: [
        {
          steps: [
            'Insert ALEV on a drum bus, a bass, a vocal or the master. It opens at LOW 30, MID 30, HIGH 20, fully WET: a gentle warmth.',
            'Turn one ring at a time: drag up or down on it. Listen to what the band does, not to how loud it is — the level stays the same.',
            'Watch the ember: HIGH lights the centre, MID the middle ring, LOW the edge. It breathes with the music.',
            'Pull DRY/WET down to blend the clean signal back in (parallel saturation).',
            'Press LINK or GANG on the right of the case to move several rings with one hand.',
          ],
        },
      ],
    },
    {
      id: 'controls',
      heading: 'The front panel',
      blocks: [
        { note: 'An example: LOW 90, MID 70, HIGH 100 with a drum loop playing: all three zones of the ember burn.' },
        {
          table: {
            head: ['Control', 'Range · default', 'What it does'],
            rows: [
              ['HIGH ring (inner)', '0–100 % · 20 %', 'Heat above 3 kHz: bite, air and edge.'],
              ['MID ring', '0–100 % · 30 %', 'Heat between 200 Hz and 3 kHz: body, presence, density.'],
              ['LOW ring (outer)', '0–100 % · 30 %', 'Heat below 200 Hz: weight and roundness.'],
              ['DRY/WET', '0–100 % · 100 %', 'The curved fader on the left of the bezel. DRY at the bottom, WET at the top. Phase-coherent: blending never thins the sound.'],
              ['FREE · LINK · GANG', 'pushers · FREE', 'How the rings move together (below). The pressed pusher stays in and its name turns gold.'],
              ['Ember', 'display', 'The heat of each band: HIGH in the centre, MID around it, LOW at the edge. At rest it shows the rings’ settings and flares with the music; while a ring turns it names the ring and shows its value. DRY/WET dims it.'],
            ],
          },
        },
        { h3: 'Handling' },
        { p: 'Drag up to turn a ring or the fader up, down to turn it down. Hold Shift for fine moves. Double-click a control to return it to its default. The mouse wheel moves a control in 1 % steps. A ring turns a full circle: its black pointer bar shows where it is, 0 % and 100 % both at 12 o’clock.' },
        { h3: 'The pushers' },
        {
          list: [
            '**FREE** — each ring turns on its own.',
            '**LINK** — the heat spreads to the neighbouring bands, each step 30 % behind the one before. Turn HIGH and MID follows at 70 % of the move, LOW at 49 %. Turn LOW and MID follows at 70 %, HIGH at 49 %. Turn MID and both HIGH and LOW follow at 70 %.',
            '**GANG** — all three rings turn together by the same amount.',
          ],
        },
        { p: 'The pushers only change how the panel moves the rings; they change no sound and are saved with the project.' },
        { note: 'With GANG pressed and LOW being turned, all three rings move and the ember names the ring.' },
      ],
    },
    {
      id: 'recipes',
      heading: 'Where to use it',
      blocks: [
        {
          recipes: [
            {
              name: 'Drum bus: thicker, not louder',
              settings: 'LOW 40 · MID 45 · HIGH 20 · WET 100',
              text: 'The kick and snare gain body and the transients round off a little; the cymbals stay smooth.',
            },
            {
              name: 'Bass: weight without mud',
              settings: 'LOW 55 · MID 35 · HIGH 0 · WET 100',
              text: 'Harmonics from the low band help the bass read on small speakers; HIGH at 0 keeps fizz away.',
            },
            {
              name: 'Vocal: presence',
              settings: 'LOW 0 · MID 35 · HIGH 25 · WET 60',
              text: 'Heat in the mids and highs, blended with the dry voice, brings it forward without a harsh edge.',
            },
            {
              name: 'Master: glue',
              settings: 'LOW 20 · MID 20 · HIGH 15 · WET 100',
              text: 'A light, even heat across the mix. Use GANG to move all three together and stop where it starts to feel dense.',
            },
            {
              name: 'Parallel drive',
              settings: 'all rings 80–100 · WET 25–40',
              text: 'Burn the wet signal hard and tuck it under the dry one.',
            },
          ],
        },
      ],
    },
    {
      id: 'how-it-works',
      heading: 'How it works',
      blocks: [
        { p: '**Split.** Linkwitz-Riley crossovers (24 dB/octave) at 200 Hz and 3 kHz divide the signal into three bands that sum back flat.' },
        { p: '**Heat.** Each ring sets the drive into its band from −18 dB (clean) to +24 dB on a curve shaped so the whole turn is useful: 10 % is just audible, the default 30 % is a clear warmth.' },
        { p: '**Saturate.** Each band runs 8 times oversampled through a soft curve between a round tape-like shape and a firmer knee, with antiderivative anti-aliasing, so even high drive on high notes does not fold back into the audible range.' },
        { p: '**Match.** A fixed loudness compensation per band keeps the level the same at any heat on pink noise (see Heat, not loudness).' },
        { p: '**Blend and protect.** The dry signal runs through the same filters and delay, so DRY/WET blends without phase trouble. A true-peak limiter with lookahead keeps the output at or under −1 dBTP.' },
        { p: '**Bypass.** When the DAW bypasses ALEV, the signal is passed through delayed by the same latency, with a 20 ms crossfade, so nothing jumps in time and nothing clicks.' },
      ],
    },
    {
      id: 'installation',
      heading: 'Installation',
      blocks: installation('ALEV', {
        macSteps: [
          'Open the installer package (`.pkg`) you downloaded and follow the installer. It puts `ALEV.vst3` in `/Library/Audio/Plug-Ins/VST3` and `ALEV.component` (Audio Unit) in `/Library/Audio/Plug-Ins/Components`. The installer is signed and notarised by Apple.',
          'Rescan plug-ins in your DAW if ALEV does not appear.',
        ],
        winSteps: [
          'If Windows blocks the downloaded files: right-click the zip, choose **Properties**, tick **Unblock**, then extract.',
          'Copy the `ALEV.vst3` folder to `C:\\Program Files\\Common Files\\VST3\\`.',
          'Rescan plug-ins in your DAW.',
        ],
      }),
    },
    {
      id: 'specifications',
      heading: 'Specifications',
      blocks: [
        {
          table: {
            head: ['Item', 'Value'],
            rows: [
              ['Formats', 'macOS 11 or later (Apple Silicon and Intel): VST3, AU · Windows (64-bit): VST3'],
              ['Channels', 'Mono or stereo'],
              ['Latency', '92 samples at every sample rate (1.9 ms at 48 kHz), reported to the DAW'],
              ['Bands', 'LOW < 200 Hz · MID 200 Hz–3 kHz · HIGH > 3 kHz (Linkwitz-Riley, 24 dB/oct)'],
              ['Saturation', '8× oversampling, antiderivative anti-aliasing; drive −18 to +24 dB per band'],
              ['Output', 'Loudness-matched per band on pink noise (drums with LOW at 100 %: −4.2 dB RMS); true-peak ceiling −1 dBTP'],
              ['Bypass', 'Latency-aligned, 20 ms crossfade'],
              ['State', 'Saved with the DAW project; LOW, MID, HIGH and DRY/WET can be automated'],
              ['Price', 'Free, forever'],
            ],
          },
        },
        { h3: 'Measured, not guessed' },
        { p: 'Every ALEV build is measured by the same test set at 48 kHz.' },
        {
          list: [
            '**Flat when cold** — all rings at 0, the response is flat within 0.12 dB from 20 Hz to 20 kHz, at WET and at 50 % DRY/WET.',
            '**Loudness held** — pink noise at −18 dBFS RMS, one ring 0 → 100: the loudness moves +0.09 LU (LOW), −0.02 LU (MID), −0.03 LU (HIGH).',
            '**Clean** — a 10 kHz tone at −6 dBFS with HIGH at 100 leaves no fold-back above −85 dBc.',
            '**Ceiling** — over drums, noise and sweeps at 27 ring combinations, the highest true peak is −2.05 dBTP (ceiling −1).',
            '**Bands stay apart** — a 1 kHz tone gains no distortion when LOW goes to 100 (change 0.0 dB).',
            '**Latency** — the reported 92 samples match the measured delay at 44.1, 48, 96 and 192 kHz.',
            '**Bypass** — the bypassed output equals the input delayed by 92 samples, error 0.',
          ],
        },
      ],
    },
    { id: 'download', heading: 'Getting ALEV', blocks: gettingIt(ALEV) },
  ],
};
