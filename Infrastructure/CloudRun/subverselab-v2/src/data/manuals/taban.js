// TABAN owner's manual as a web page: /plugins/taban/manual.
// Source: 01_AI_Tools/subverselab-taban/docs/manual/Taban_Manual.html (8 Oct 2026, TABAN 1.0.0, the version the site
// sells; same text as public/plugins/taban/Taban_Manual.pdf). Left out: the line on what the name means (public copy rule).

import { TABAN } from '../plugins.js';
import { installation, gettingIt, manualBase } from './common.js';

export const TABAN_MANUAL = {
  ...manualBase(TABAN, {
    subtitle: 'Reverse Limiter · Minimum Level Floor · Model TB-83',
    description: 'The TABAN owner’s manual: what a reverse limiter does, quick start, the front panel with every range and default, recipes, how it works, installation on macOS and Windows, specifications and the measured self-test.',
  }),
  sections: [
    {
      id: 'introduction',
      heading: 'What TABAN is',
      blocks: [
        { p: 'A limiter sets a ceiling the signal cannot rise above. TABAN sets a floor it cannot fall below. Anything under the FLOOR is lifted to it; anything at or above the FLOOR is left exactly as it was.' },
        { h3: 'One job' },
        { p: 'Put TABAN on a track and raise one fader. Quiet syllables, soft notes, the end of a phrase and the gaps between hits come up to the level you set. Loud parts are not touched at all: above the floor the gain is exactly 1, and the output is the input bit for bit.' },
        { h3: 'It never pushes a peak over the floor' },
        { p: 'The lift is worked out from the level of the very sample it is applied to, and that level never reads lower than the sample itself. So when a loud sound arrives straight after a quiet one, it is not boosted on its way in: the output is never louder than the input or the floor, whichever is higher. TABAN does not need lookahead for this, so it has no latency.' },
        { h3: 'Silence stays silence' },
        { p: 'TABAN lifts by at most 24 dB. Near silence it lets go: the lift fades out between −80 and −96 dBFS, so room tone, dither and the last tail of a reverb are not dragged up to the floor. Digital silence comes out as digital silence.' },
      ],
    },
    {
      id: 'quick-start',
      heading: 'Quick start',
      blocks: [
        {
          steps: [
            'Put TABAN on the track. It opens with FLOOR at OFF: it does nothing yet.',
            'Play the track and raise FLOOR until the quiet parts you want to hear sit where you want them. Watch the OUT bar: it stops at the fader cap.',
            'Read LIFT. It shows how many dB TABAN is adding right now. If it keeps showing a lot of lift, the floor may be higher than the track needs.',
            'Trim with OUTPUT if the track now feels louder in the mix.',
            'Flip IN to compare with the untouched track. The switch crossfades, so there is no click.',
          ],
        },
      ],
    },
    {
      id: 'controls',
      heading: 'The front panel',
      blocks: [
        { note: 'An example: a −36 dBFS tone with FLOOR at −18 dB. The IN bar sits at −36, the OUT bar stops at the fader cap (−18), and LIFT reads 18.0 dB.' },
        {
          table: {
            head: ['Control', 'Range · default', 'What it does'],
            rows: [
              ['FLOOR', 'OFF (−60) to 0 dBFS · OFF', 'The floor. Audio under it is lifted to it, by up to 24 dB; audio above it is left alone. The fader is linear in dB: every 6 dB is the same length of travel. At OFF TABAN does nothing. Double-click resets to OFF.'],
              ['OUTPUT', '−12 to +12 dB · 0 dB', 'Level after the floor. Double-click resets to 0 dB.'],
              ['IN', 'On / off · on', 'Off bypasses TABAN: the output is the input, bit for bit, OUTPUT included. Switching crossfades over 10 ms.'],
            ],
          },
        },
        { h3: 'Reading the face' },
        {
          list: [
            '**LIFT** — the most TABAN lifted during the last moment, in dB. It holds a peak for 0.4 s so it can be read. 0.0 means nothing is being lifted.',
            '**HOLDING THE FLOOR** — the lamp lights while TABAN is lifting.',
            '**IN and OUT bars** — the level going in and coming out, drawn on the same scale as the FLOOR fader. While TABAN works, the OUT bar stops at the fader cap. With OUTPUT away from 0 dB, the OUT bar moves by that amount.',
            '**Value windows** — the FLOOR and OUTPUT settings in numbers.',
          ],
        },
        { note: 'With IN off the same tone reads LIFT 0.0, the lamp is dark and the OUT bar follows the IN bar.' },
      ],
    },
    {
      id: 'recipes',
      heading: 'Where to use it',
      blocks: [
        {
          recipes: [
            {
              name: 'Vocal: keep the quiet words',
              settings: 'FLOOR about 18 dB under the loud words · OUTPUT 0',
              text: 'Put TABAN after your compressor. Breathy endings and soft words come up to the floor; the loud lines go through untouched. Breaths come up too: if they get loud, lower FLOOR a little or edit them out first.',
            },
            {
              name: 'Pads and textures: a steady bed',
              settings: 'FLOOR just under the pad’s average level',
              text: 'A pad that swells and dips holds a steady minimum, so it never disappears behind the drums.',
            },
            {
              name: 'Bass: notes that do not drop out',
              settings: 'FLOOR 6 to 12 dB under the loudest notes',
              text: 'Soft notes and long decays stay present. A steady note sees a constant gain, so TABAN adds no distortion to it.',
            },
            {
              name: 'Room and ambience tracks',
              settings: 'FLOOR where you want the room to sit',
              text: 'The tail of the room is held up to the floor until it falls below about −80 dBFS, then it is let go smoothly.',
            },
          ],
        },
        { h3: 'What TABAN is not' },
        { p: 'It is not a compressor: it does not turn loud parts down. If a track has both peaks that are too loud and quiet parts that are too quiet, use a compressor or limiter for the peaks and TABAN for the floor.' },
      ],
    },
    {
      id: 'how-it-works',
      heading: 'How it works',
      blocks: [
        { p: 'A peak detector follows the level of the track: it rises with the signal at once, holds for 20 ms, and then falls with a 60 ms release. Left and right are linked, so the stereo image never moves. The 20 ms hold is longer than half a period of a 25 Hz tone, which is why a steady note gets a steady gain and is not distorted.' },
        { p: 'Where the detector reads under the floor, the gain is the floor divided by that level, capped at 24 dB and faded out near silence. When the track gets quiet again after a loud passage, TABAN takes about a quarter of a second to bring it back up to the floor. FLOOR and OUTPUT are smoothed over 20 ms so automation does not click.' },
      ],
    },
    {
      id: 'installation',
      heading: 'Installation',
      blocks: installation('TABAN', {
        macSteps: [
          'Open the installer package (`.pkg`) you downloaded and follow the installer. It puts `TABAN.vst3` in `/Library/Audio/Plug-Ins/VST3` and `TABAN.component` (Audio Unit) in `/Library/Audio/Plug-Ins/Components`. The installer is signed and notarised by Apple.',
          'Rescan plug-ins in your DAW if TABAN does not appear.',
        ],
        winSteps: [
          'If Windows blocks the downloaded files: right-click the zip, choose **Properties**, tick **Unblock**, then extract.',
          'Copy the `TABAN.vst3` folder to `C:\\Program Files\\Common Files\\VST3\\`.',
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
              ['Channels', 'Mono or stereo; stereo is linked'],
              ['Latency', '0 samples at every sample rate'],
              ['Most lift', '24 dB; faded out between −80 and −96 dBFS'],
              ['Detector', 'Sample peak, instant attack, 20 ms hold, 60 ms release'],
              ['Bypass', 'IN off: bit-identical to the input; 10 ms crossfade when switching'],
              ['Undo / redo', 'Cmd+Z / Cmd+Shift+Z (macOS); Ctrl+Z / Ctrl+Shift+Z or Ctrl+Y (Windows)'],
              ['State', 'Saved with the DAW project; every control can be automated'],
              ['Price', 'Free, forever'],
            ],
          },
        },
        { h3: 'Measured, not guessed' },
        { p: 'Every TABAN build runs the same self-test on macOS and on Windows. The numbers below are from that test at 48 kHz.' },
        {
          list: [
            '**Lift** — a −36 dBFS tone with FLOOR at −18 comes out at −18.00 dBFS at 40 Hz, 100 Hz, 1 kHz and 10 kHz; the distortion added is below −150 dB.',
            '**Never over the floor** — over six seconds of loud bursts after quiet passages, sweeps and noise, at five floor settings, no output sample is louder than the input or the floor, whichever is higher (worst case +0.0000 dB).',
            '**Untouched** — with FLOOR at OFF, with IN off, and wherever the signal is above the floor, the output is bit-identical to the input.',
            '**Cap and gate** — a −70 dBFS tone with FLOOR at 0 is lifted by exactly 24 dB; at −88 dBFS it is lifted by 12 dB; at −100 dBFS not at all. Silence stays zero.',
            '**Recovery** — after half a second at −6 dBFS, a −40 dBFS passage is back within 1 dB of a −20 dB floor after 249 ms.',
            '**No clicks** — moving FLOOR from OFF to −10, OUTPUT to +12 and IN on all at once produces no step larger than the tone itself.',
          ],
        },
      ],
    },
    { id: 'download', heading: 'Getting TABAN', blocks: gettingIt(TABAN) },
  ],
};
