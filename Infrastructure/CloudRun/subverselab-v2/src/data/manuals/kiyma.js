// KIYMA owner's manual as a web page: /plugins/kiyma/manual.
// Source: 01_AI_Tools/subverselab-kiyma/docs/manual/Kiyma_Manual.html (14 Oct 2026, KIYMA 1.0.0, the version the site
// sells; same text as public/plugins/kiyma/Kiyma_Manual.pdf). Checked against subverselab-kiyma/STATUS.md (1.0.0 release,
// 14 Oct: selftest 72 checks, pluginval 8) and Source (latency 0, tail 8 s, host tempo 20–999 BPM). Left out: the line on
// what the name means (public copy rule), "KIYMA grew out of" (origin story; the ChopperLab sound reference is kept, as on
// the product page), the "BabaSultan Edition" wording on the model plate and the seal (not on the product page), the
// versioned installer file names and the Windows "More info / Run anyway" line (a copied VST3 folder is not run).

import { KIYMA } from '../plugins.js';
import { installation, gettingIt, manualBase } from './common.js';

export const KIYMA_MANUAL = {
  ...manualBase(KIYMA, {
    subtitle: 'Audio Mincer · No. 001',
    description: 'The KIYMA owner’s manual: how the step chopper reads the channel, quick start, the front panel with every range and default, the five sweet spots with their settings, how it works, installation on macOS and Windows, specifications and the measured self-test.',
  }),
  sections: [
    {
      id: 'introduction',
      heading: 'What KIYMA is',
      blocks: [
        { p: 'A cast-iron grinder for the track. KIYMA takes the last phrase that came in, cuts it into steps and plays the steps back in a new order, in time with your song.' },
        { h3: 'A step chopper that reads the channel' },
        { p: 'KIYMA listens to the channel it sits on and keeps the last complete block of bars: one, two or four bars, or half a bar (LENGTH). It cuts that block into 8, 16 or 32 steps (STEPS) and, step by step, decides whether to play the step that belongs there or to jump to another one nearby. The result is a re-chopped version of your own material, locked to the bar grid of the DAW.' },
        { h3: 'Squeezed into one bar' },
        { p: 'Whatever LENGTH is set to, the block is played back in one bar. Two bars squeezed into one play twice as fast, one octave up; four bars play two octaves up; half a bar stretched over one plays an octave down. One bar plays at its own speed and pitch. This is the sound of the original ChopperLab device: the MINCE switch is exactly that sound.' },
        { h3: 'Five sweet spots' },
        { p: 'The switch bank at the top right holds five tuned settings: LEAN, MINCE, CHUNK, GRISTLE and BONE. Raise a switch and all eight knobs jump to it. Turn any knob afterwards and the switch drops: you are on your own settings now.' },
      ],
    },
    {
      id: 'quick-start',
      heading: 'Quick start',
      blocks: [
        {
          steps: [
            'Insert KIYMA on a drum loop, a break, a vocal phrase or a whole bus.',
            'Press play in the DAW. KIYMA follows the song’s tempo and bar position. Until it has heard one whole block (two bars at the default LENGTH), the dry sound passes through.',
            'Raise **MINCE** on the switch bank: two bars squeezed into one, chopped hard.',
            'Try the other switches one by one. Each one is a different way of mincing the same material.',
            'Turn the **crank** on the grinder to re-roll the pattern, or pull **DRY/WET** down to blend the original back in.',
          ],
        },
      ],
    },
    {
      id: 'controls',
      heading: 'The front panel',
      blocks: [
        { note: 'KIYMA opens with the knobs at the defaults below and no switch raised.' },
        {
          table: {
            head: ['Control', 'Range · default', 'What it does'],
            rows: [
              ['DENSITY', '0–100 % · 40 %', 'The chance, per step, that the step jumps to another one. 0 % = every step plays in order (no chop).'],
              ['REACH', '1–16 steps · 6', 'How far a jump can go, backwards or forwards, in steps.'],
              ['PATTERN', '1–16 · 1', 'Which chop pattern is used. Each number is a fixed pattern: the same number always gives the same chop.'],
              ['LENGTH', '1/2, 1, 2, 4 bars · 2 bars', 'How much of the past is read, played back in one bar (and so its speed and pitch: see Squeezed into one bar).'],
              ['EDGE', 'HARD–10 ms · HARD', 'The cut at each step. HARD = a clean hard cut; up to 10 ms rounds every cut with a short fade.'],
              ['STEPS', '8, 16, 32 · 16', 'How many steps the block is cut into.'],
              ['DRY/WET', '0–100 % · 100 %', 'The blend of the original and the minced sound. 0 % is the input, bit for bit.'],
              ['OUTPUT', '−24 to +6 dB · 0 dB', 'Level after the blend.'],
              ['Crank', 'SHUFFLE · 0', 'The handle on the grinder. Turning it adds 0 to 15 to the pattern number: a quick re-roll without touching PATTERN.'],
              ['Sweet spots', 'five switches', 'LEAN, MINCE, CHUNK, GRISTLE, BONE (see The sweet spots). Click a switch to raise it and recall its settings; click a raised switch to drop it.'],
              ['Seal', 'link', 'The seal at the top left opens subverselab.com.'],
            ],
          },
        },
        { h3: 'Handling' },
        { p: 'Drag a knob up to turn it up, down to turn it down; hold Shift for fine moves. Double-click a knob to return it to its default. The mouse wheel moves a knob too. While a knob is under the mouse its brass tag shows the value. Undo and redo with Cmd+Z and Cmd+Shift+Z on macOS, Ctrl+Z and Ctrl+Shift+Z on Windows; a switch recall is one undo step.' },
        { note: 'When the crank is turned, the pattern re-rolls while the grinder spins.' },
      ],
    },
    {
      id: 'sweet-spots',
      heading: 'The sweet spots',
      blocks: [
        { p: 'Raising a switch sets the eight knobs and returns the crank to 0. If any of the eight knobs is then moved, the switch drops by itself: the settings are no longer that sweet spot.' },
        {
          recipes: [
            {
              name: 'LEAN — no chop',
              settings: 'DENSITY 0 · REACH 6 · PATTERN 1 · LENGTH 1 bar · EDGE 2 ms · STEPS 16 · WET 100 · OUT 0 dB',
              text: 'One bar replayed on the grid, in order, with soft edges. The cleanest setting: a bar-long stutter of what just played.',
            },
            {
              name: 'MINCE — the KIYMA sound',
              settings: 'DENSITY 40 · REACH 6 · PATTERN 1 · LENGTH 2 bars · EDGE HARD · STEPS 16 · WET 100 · OUT 0 dB',
              text: 'A two-bar phrase squeezed into one bar, an octave up, with hard cuts. The sound of the original ChopperLab device.',
            },
            {
              name: 'CHUNK — big slices',
              settings: 'DENSITY 40 · REACH 6 · PATTERN 3 · LENGTH 1 bar · EDGE 1 ms · STEPS 8 · WET 100 · OUT 0 dB',
              text: 'Eight big slices of one bar, rearranged. Rhythmic, still recognisable.',
            },
            {
              name: 'GRISTLE — four bars in one',
              settings: 'DENSITY 60 · REACH 4 · PATTERN 5 · LENGTH 4 bars · EDGE HARD · STEPS 32 · WET 100 · OUT −1 dB',
              text: 'Four bars crammed into one, two octaves up, in 32 fast steps.',
            },
            {
              name: 'BONE — half a bar, stretched',
              settings: 'DENSITY 50 · REACH 8 · PATTERN 2 · LENGTH 1/2 bar · EDGE HARD · STEPS 16 · WET 100 · OUT −1 dB',
              text: 'Half a bar stretched over a whole one, an octave down: heavy and slow.',
            },
          ],
        },
        { note: 'A raised switch lights its lamp, and the knobs show its settings.' },
      ],
    },
    {
      id: 'how-it-works',
      heading: 'How it works',
      blocks: [
        { p: '**Read.** KIYMA keeps the last complete block of LENGTH bars on the song’s bar grid (blocks start at bar 1 of the song), like a sample that always starts at the top of a phrase. It only reads audio that has already arrived, so it adds no latency.' },
        { p: '**Map.** For each block of STEPS steps a step map is made from PATTERN (plus the crank): each step, with a DENSITY chance, jumps up to REACH steps forwards or backwards. The maps are fixed tables: there is no randomness in the sound, so the same settings on the same song always give the same result, at any buffer size.' },
        { p: '**Play.** The mapped steps are read back across one bar with linear interpolation; EDGE rounds each cut with a raised-cosine fade of up to 10 ms.' },
        { p: '**Blend.** DRY/WET mixes the minced sound with the input; OUTPUT sets the level.' },
        { p: '**Tempo.** Tempo, bar position and time signature come from the DAW. Without them (for example in the standalone app) KIYMA runs at 120 BPM.' },
      ],
    },
    {
      id: 'installation',
      heading: 'Installation',
      blocks: installation('KIYMA', {
        standalone: true,
        macSteps: [
          'Open the installer package (`.pkg`) you downloaded and follow the installer. It puts `KIYMA.vst3` in `/Library/Audio/Plug-Ins/VST3`, `KIYMA.component` (Audio Unit) in `/Library/Audio/Plug-Ins/Components` and the standalone `KIYMA.app` in `/Applications`. The installer is signed and notarised by Apple.',
          'Rescan plug-ins in your DAW if KIYMA does not appear.',
        ],
        winSteps: [
          'If Windows blocks the downloaded files: right-click the zip, choose **Properties**, tick **Unblock**, then extract.',
          'Copy the `KIYMA.vst3` folder to `C:\\Program Files\\Common Files\\VST3\\`.',
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
              ['Formats', 'macOS 11 or later (Apple Silicon and Intel): VST3, AU, standalone app · Windows (64-bit): VST3'],
              ['Channels', 'Mono or stereo'],
              ['Latency', '0 samples (KIYMA reads only audio that has already arrived)'],
              ['Tail', '8 seconds reported to the DAW (the wet path replays up to 4 bars of the past)'],
              ['Steps · length', '8, 16 or 32 steps · 1/2, 1, 2 or 4 bars, always played back in one bar'],
              ['Patterns', '16 fixed patterns, +0 to 15 with the crank; no randomness in the audio path'],
              ['Tempo', 'From the DAW (20 to 999 BPM); 120 BPM without a host tempo'],
              ['Undo / redo', 'Cmd+Z / Cmd+Shift+Z (macOS); Ctrl+Z / Ctrl+Shift+Z (Windows)'],
              ['State', 'Saved with the DAW project; every knob and the crank can be automated'],
              ['Price', 'Free, forever'],
            ],
          },
        },
        { h3: 'Measured, not guessed' },
        { p: 'Every KIYMA build runs the same self-test (72 checks) on macOS and on Windows.' },
        {
          list: [
            '**The original sound** — the step maps for patterns 1 to 8 are identical to the original ChopperLab device’s; a looped two-bar phrase comes out sample for sample as the device made it. The plug-in on a loop at 86 BPM correlates 0.996 with the device.',
            '**Speed and pitch** — a 500 Hz tone comes out at 250, 500, 1000 and 2000 Hz for LENGTH 1/2, 1, 2 and 4 bars.',
            '**No chop is no chop** — LENGTH 1 bar with DENSITY 0 gives the input exactly one bar late.',
            '**Dry is dry** — DRY/WET at 0 % returns the input bit for bit.',
            '**Deterministic** — buffers of 64 and 1013 samples give identical output.',
            '**Host check** — the VST3 passes pluginval at strictness level 8.',
          ],
        },
      ],
    },
    { id: 'download', heading: 'Getting KIYMA', blocks: gettingIt(KIYMA) },
  ],
};
