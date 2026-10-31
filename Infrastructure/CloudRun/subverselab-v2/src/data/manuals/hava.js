// HAVA owner's manual as a web page: /plugins/hava/manual.
// Source: 01_AI_Tools/subverselab-hava/docs/manual/Hava_Manual.html (12 Oct 2026, corrected after the October audit;
// same text as public/plugins/hava/Hava_Manual.pdf). Describes HAVA 1.0.1, the version the site sells (released 12 Oct:
// rear-plate footer reads the real defaults, spring knobs dimmed while SHEEN is 0 — both already in the manual text).
// Left out: the "subverselab.com/launch … no activation needed" lines (the licence sentence comes from gettingIt()),
// the self-test check count (80), the picture captions (their content is folded into the panel tour).
// The standalone app is kept: the 1.0.1 macOS installer installs it (make_mac_installer.sh, STANDALONE=1).

import { HAVA } from '../plugins.js';
import { installation, gettingIt, manualBase } from './common.js';

export const HAVA_MANUAL = {
  ...manualBase(HAVA, {
    subtitle: 'Top-End Air · Spring Sheen · Model HV-72',
    description: 'The HAVA owner’s manual: the three-step flow, installation on macOS and Windows, the front panel and rear plate with every range and default, measured AIR gain, the moods, MASTER SAFE and the sheen, recipes and the measured specifications.',
  }),
  sections: [
    {
      id: 'introduction',
      heading: 'What HAVA is',
      blocks: [
        { p: 'HAVA lifts the top of a sound and leaves a short spring sheen on its transients: a snare that sticks to the floor from the air, like two glued sheets of paper being peeled apart.' },
        { h3: 'Three steps — that is the whole flow' },
        {
          steps: [
            '**Drop it on the bus.** It opens on the AIR FULL mood.',
            '**Turn AIR.** AIR is a high shelf. Its gain at 11 kHz is 0.6 dB per step on the 0–10 scale.',
            '**Pick a mood.** SHEEN and OUTPUT are optional. Use MASTER AIR on the master: it turns on MASTER SAFE.',
          ],
        },
        { p: 'HAVA HV-72 is a colour box. It adds two things on top of an untouched dry signal: **AIR**, a smooth lift above 9 kHz with a very short bright wash, and **SHEEN**, a short spring: a falling chirp, a twang at 1.5 kHz and a sparkle that lights up on transients and falls away at once. A high-pass on the spring’s send (LOW CUT, 300 Hz in every mood) keeps kick drums and low toms out of the spring. It is not a reverb. It is glue, not a room, and that is a measured statement: 300 ms after an impulse the sheen has dropped at least 25 dB below where it started (see “MASTER SAFE and the sheen”).' },
        { p: '**MASTER SAFE** makes it fit for the last insert on a bus or a master: it processes the mid channel only, holds loudness with an auto-gain, and puts a true-peak ceiling at −0.3 dBTP. It costs latency; with it off there is none.' },
        { h3: 'Latency: 0, or 80 samples with MASTER SAFE' },
        { p: 'With MASTER SAFE off HAVA reports **0** latency and the dry signal is never delayed. With MASTER SAFE on it reports **80 samples at 48 kHz** (74 at 44.1 kHz), constant including when bypassed. The number is sent to the host again whenever you switch MASTER SAFE, so plug-in delay compensation follows.' },
      ],
    },
    {
      id: 'installation',
      heading: 'Installation',
      blocks: installation('HAVA', {
        standalone: true,
        macSteps: [
          'Run the installer package (`.pkg`) you downloaded. It is signed with a Developer ID and notarised by Apple, so macOS opens it without any extra step.',
          'Choose what to install: the VST3 plug-in (`/Library/Audio/Plug-Ins/VST3/HAVA.vst3`), the Audio Unit (`/Library/Audio/Plug-Ins/Components/HAVA.component`) and the standalone app (`/Applications/HAVA.app`, the same panel outside a DAW). An older bundle named “SubverseLab Hava” is removed by the VST3 package.',
          'Restart your DAW, or make it rescan its plug-in list.',
        ],
        extra: [
          { p: 'Channel layouts: mono → mono, mono → stereo, stereo → stereo. Any host that loads VST3 or AU effects.' },
        ],
      }),
    },
    {
      id: 'panel',
      heading: 'Panel tour',
      blocks: [
        { p: 'The face reads left to right: name, model plate and five MOOD keys; the cream display window with four sections (AIR, SHEEN, MASTER SAFE and AUTO-GAIN); then BYPASS and REAR on the right. Along the bottom, MASTER SAFE at the left, then three large knobs: AIR, SHEEN and OUTPUT. AIR and SHEEN sit under the display sections they move.' },
        { p: 'HAVA opens on AIR FULL (AIR 8.0, SHEEN 2.5) with MASTER SAFE off. With MASTER AIR selected, MASTER SAFE is on, so the ceiling lamp, MID ONLY, CEILING and LATENCY are lit and the auto-gain reads its correction.' },
        {
          list: [
            '**Name block and MOOD keys** — HAVA, “Top-End Air · Spring Sheen”, the **MODEL HV-72** plate, and five keys: AIR LIGHT, AIR FULL, AIR + SHEEN, SHEEN ONLY, MASTER AIR.',
            '**AIR section** — a red 7-segment readout of the shelf target in dB at 11 kHz (6 × AIR ÷ 10, so 3.0 at AIR 5), a LIFT lamp, and a live 0–6 dB ladder of the dB actually added above 8 kHz.',
            '**SHEEN section** — a SHEEN ON lamp and two activity ladders (L and R, −30 to 0 dB) showing the spring return against the input. The fine print reads “lights on transients, falls away at once”.',
            '**MASTER SAFE section** — MID ONLY, CEILING −0.3 dBTP and LATENCY lamps, and a 7-segment AUTO-GAIN readout (±12 dB range, 1.5 s window; dark when MASTER SAFE is off).',
            '**BYPASS** toggle and **REAR** key.',
            '**MASTER SAFE** toggle (bottom left) with its red lamp “CEILING −0.3 dBTP · 80 SMP”.',
            '**AIR, SHEEN, OUTPUT** knobs.',
          ],
        },
        { p: 'The rear plate holds the four spring controls. A mood loads them (values under Moods); change them only to override. The gold marks on the rear plate show the defaults.' },
      ],
    },
    {
      id: 'controls',
      heading: 'Controls',
      blocks: [
        { h3: 'Front panel' },
        {
          table: {
            head: ['Control', 'Range · default', 'What it does'],
            rows: [
              ['MOOD', '5 keys · AIR FULL', 'Recalls AIR, SHEEN and MASTER SAFE, and sets the four rear controls (TWANG, TENSION, DRIP, LOW CUT) to the values listed under Moods. OUTPUT and BYPASS are left alone.'],
              ['AIR', '0–10 · 8.0', 'A high shelf with its corner at 9 kHz, calibrated so its gain at 11 kHz is 0.6 dB per step: +6 dB at 10. It is joined by a very short, bright two-lane spring wash (T60 0.15 s) whose amount follows AIR. Measured gain figures are in the table below.'],
              ['SHEEN', '0–10 · 2.5', 'The short spring. It is added on top of a dry signal that stays at unity at every setting, in both modes. Its level rises with the knob: the colour gain is 0.6 × SHEEN ÷ 10 at full. At 10 the dry is still there.'],
              ['OUTPUT', '−12 to +12 dB · 0 dB', 'Final gain. With MASTER SAFE on it comes before the ceiling, so the ceiling always has the last word.'],
              ['MASTER SAFE', 'On/off · off', 'On: only the mid channel is processed; the side channel passes untouched. A K-weighted auto-gain holds the loudness of the output to that of the input, and a look-ahead true-peak ceiling sits at −0.3 dBTP. Off: plain stereo, zero latency, and no ceiling: at the default AIR a master peaking at −3 dBFS comes out at about +0.5 dBFS. Switching crossfades between the two paths, and the reported latency follows.'],
              ['BYPASS', 'On/off · off', 'Dry out. With MASTER SAFE off, bypass is bit-exact dry. With MASTER SAFE on, the dry is delayed by the same latency, so bypass never moves the signal in time.'],
              ['REAR', 'Key', 'Shows the rear plate.'],
            ],
          },
        },
        { h3: 'Rear plate' },
        {
          table: {
            head: ['Control', 'Range · default', 'What it does'],
            rows: [
              ['TWANG', '0–10 · 7.0', 'The spring’s resonance: a peak at 1.5 kHz (Q 1.2), from 0 to +10 dB at full.'],
              ['TENSION', '0–10 · 5.5', 'Dispersion of the spring, which sets the length of the falling chirp. Higher TENSION gives a longer chirp.'],
              ['DRIP', '0–10 · 5.0 (AIR FULL); 0 in the other four moods', 'Emphasis on transient drip going into the spring: how strongly the attack of a sound lights the sheen.'],
              ['LOW CUT', '20–300 Hz · 300 Hz', 'A 2nd-order high-pass on the sheen send only. The dry signal is never filtered. At 300 Hz kick drums and low toms stay out of the spring; lower it to let more of the body into the sheen.'],
            ],
          },
        },
        { note: 'TWANG, TENSION, DRIP and LOW CUT act only on the SHEEN spring, so they do nothing while SHEEN is 0 (for example in MASTER AIR). The panel dims them then.' },
        { h3: 'Undo and redo' },
        {
          list: [
            '**macOS:** Cmd+Z undoes, Cmd+Shift+Z redoes. **Windows:** Ctrl+Z undoes; Ctrl+Shift+Z or Ctrl+Y redoes.',
            'One knob move is one step, from the moment you press the mouse button to the moment you let go. Several controls moved together (an X/Y drag, a mood key, a preset) are one step too.',
            'Click the plug-in window first so it has the keyboard. If your DAW takes the key before the plug-in does, use the DAW’s own undo.',
            'Moves made by host automation are not in the plug-in’s history: the DAW’s own undo takes those back. Loading a project, a preset file or a saved state starts a new history. The last 200 steps or more are kept.',
          ],
        },
        { h3: 'AIR: measured gain against the dry (SHEEN 0)' },
        {
          table: {
            head: ['AIR', '1 kHz', '5 kHz', '8 kHz', '11 kHz', '16 kHz'],
            rows: [
              ['2.5', '+0.08 dB', '+0.13 dB', '+1.07 dB', '+1.41 dB', '+1.69 dB'],
              ['5.0', '+0.18 dB', '+0.29 dB', '+2.19 dB', '+2.87 dB', '+3.44 dB'],
              ['10', '+0.44 dB', '+0.73 dB', '+4.43 dB', '+5.88 dB', '+7.13 dB'],
            ],
          },
        },
        { p: 'The 11 kHz readout on the panel is the shelf’s target (6 × AIR ÷ 10). The values above include the wash. The LIFT ladder shows the lift actually measured above 8 kHz on the live signal.' },
      ],
    },
    {
      id: 'moods',
      heading: 'Moods',
      blocks: [
        { p: 'A mood sets AIR, SHEEN and MASTER SAFE, and loads the four rear controls: TWANG 7.0 and TENSION 5.5 in every mood, LOW CUT 300 Hz in every mood, and DRIP 0 (5.0 in AIR FULL). The low cut and the low DRIP keep the kick drum out of the spring, and the SHEEN amounts are modest, so drums stay solid. The “Change vs dry” column is how much the mood changes a music-like test signal: the difference between output and dry, measured against the dry.' },
        {
          table: {
            head: ['Mood', 'AIR', 'SHEEN', 'MASTER SAFE', 'Change vs dry', 'Character'],
            rows: [
              ['AIR LIGHT', '3.5', '0.8', 'Off', '−25.7 dB', 'A light lift and a hint of spring. For vocals, stems, anything that is already bright.'],
              ['AIR FULL', '8.0', '2.5', 'Off', '−17.9 dB', 'The opening state: a full lift and a light sheen, with DRIP 5.0. The default colour of HAVA.'],
              ['AIR + SHEEN', '5.0', '3.0', 'Off', '−22.2 dB', 'A moderate lift with a little more spring than AIR FULL’s.'],
              ['SHEEN ONLY', '0', '2.5', 'Off', '−37.8 dB', 'No shelf; only the spring, kept low. A subtle glue on a snare or a clap.'],
              ['MASTER AIR', '8.0', '0', 'On', '−19.3 dB', 'The AIR FULL lift with no spring, made safe for a master or a mix bus.'],
            ],
          },
        },
      ],
    },
    {
      id: 'master-safe-and-sheen',
      heading: 'MASTER SAFE and the sheen',
      blocks: [
        { h3: 'MASTER SAFE' },
        {
          list: [
            '**Mid only.** The signal is split into mid and side. AIR and the sheen go on the mid; the side passes clean (the side residual measures −139 dB against the input side).',
            '**Auto-gain.** A K-weighted loudness match on the mid holds the output level of the effect to the input’s. On pink noise the output is within +0.008 LU of the input; on a music-like signal, −0.009 LU.',
            '**Ceiling.** A look-ahead true-peak limiter at −0.3 dBTP. On a test signal peaking at −0.09 dBTP, the output peaked at −0.37 dBTP; with MASTER SAFE off, the same input reaches +0.12 dBTP.',
            '**Latency.** 1.5 ms plus 8 samples: 74 samples at 44.1 kHz, 80 at 48 kHz, 140 at 88.2 kHz, 152 at 96 kHz.',
          ],
        },
        { h3: 'The sheen is glue, not a room' },
        { p: 'The spring is a short tank of four dispersive lanes. Its reverberation time (T60) is 0.63 s, measured. It does not read as a room because of what it does in between: it lights on a transient, then falls very fast. Measured 300–320 ms after an impulse, the energy of the sheen is at least 25 dB below the first 20 ms of the sheen:' },
        {
          list: [
            'SHEEN ONLY: −26.6 dB',
            'AIR + SHEEN at full (AIR 10, SHEEN 10): −45.7 dB',
            'AIR + SHEEN mood: −48.9 dB',
            'AIR FULL mood: −55.2 dB',
          ],
        },
        { p: 'There is no decay or time control anywhere on HAVA, and none is needed: the tail is the colour.' },
        { h3: 'The spring itself' },
        { p: 'The send is the mono sum of the input through a high-pass (LOW CUT), a drip emphasis, and the tank. The return passes an 80 Hz high-pass, a 7 kHz low-pass and the TWANG peak, and joins both channels. The chirp falls in pitch: at TENSION 5 the 3–5 kHz part arrives about 5.6 ms after the click and the 300–700 Hz part about 22.5 ms after; at TENSION 10 the sweep between them stretches from 17 ms to 25 ms.' },
      ],
    },
    {
      id: 'recipes',
      heading: 'Recipes',
      blocks: [
        {
          recipes: [
            {
              name: 'Master bus finish',
              settings: 'Mood: MASTER AIR · AIR 4 · put it last in the chain',
              text: 'MASTER AIR has no spring (SHEEN 0). Turn AIR down from the mood’s 8 for a gentle top end. The auto-gain keeps the level honest, so you are judging the tone, not the loudness. Use plug-in delay compensation.',
            },
            {
              name: 'Snare that sticks to the floor',
              settings: 'Mood: SHEEN ONLY · TWANG 7',
              text: 'All spring, no shelf. The chirp lights on the crack and falls away at once. LOW CUT is already at 300 Hz, which keeps the body of the drum out of the spring. Keep SHEEN low: the more spring, the more a drum can start to sound plastic.',
            },
            {
              name: 'Vocal air',
              settings: 'Mood: AIR LIGHT · AIR 4',
              text: 'A lift above 9 kHz with a hint of sheen and no low-mid change (+0.2 dB at 1 kHz at AIR 5).',
            },
            {
              name: 'Drum bus glue',
              settings: 'Mood: AIR + SHEEN · LOW CUT 300 Hz',
              text: 'The spring answers the transients, and the 300 Hz LOW CUT keeps the kick out of the tank. DRIP is 0 in this mood; raise it only if you want the attack to light the sheen harder.',
            },
            {
              name: 'A darker, shorter sheen',
              settings: 'Any mood · TENSION 2 · TWANG 4',
              text: 'Less resonance and a shorter chirp. Same 0.63 s tank, but less of it is heard.',
            },
          ],
        },
      ],
    },
    {
      id: 'specifications',
      heading: 'Specifications',
      blocks: [
        {
          table: {
            head: ['Item', 'Value'],
            rows: [
              ['Formats', 'macOS 11 or later (Apple Silicon and Intel): VST3, AU, Standalone · Windows (64-bit): VST3'],
              ['Channel layouts', 'Mono → mono, mono → stereo, stereo → stereo'],
              ['Latency', '0 with MASTER SAFE off · with it on, 74 samples at 44.1 kHz, 80 at 48 kHz, 152 at 96 kHz'],
              ['AIR', 'High shelf, corner 9 kHz; +2.87 dB at 11 kHz at AIR 5, +5.88 dB at AIR 10; wash T60 0.150 s'],
              ['SHEEN tank', 'Four lanes of dispersive allpass sections, T60 0.63 s (measured 0.630 s)'],
              ['Ceiling (MASTER SAFE)', '−0.3 dBTP, look-ahead true peak; measured −0.37 dBTP'],
              ['CPU (engine self-test)', '60 s of stereo at 48 kHz in about 1.3 s (1.5 s with MASTER SAFE) on the development machine'],
              ['Undo / redo', 'Cmd+Z / Cmd+Shift+Z (macOS); Ctrl+Z / Ctrl+Shift+Z or Ctrl+Y (Windows)'],
              ['Code signing', 'macOS installer signed with a Developer ID and notarised by Apple'],
            ],
          },
        },
        { h3: 'Measured behaviour (self-test, all checks pass)' },
        {
          list: [
            'Determinism: identical output, bit for bit, across runs.',
            'All controls at maximum for 60 s: finite and bounded; with MASTER SAFE on the peak stays at −1.97 dBFS.',
            'No artefacts on any mood: the largest sample-to-sample step is 0.044–0.062 of full scale (limit 0.8).',
            'MASTER SAFE holds loudness within ±0.5 LU on pink noise and on music, in each mood tested (MASTER AIR, AIR FULL, AIR + SHEEN).',
            'The panel’s AIR and SHEEN ladders read the real signal: AIR FULL adds +5.98 dB above 8 kHz and MASTER AIR +5.99 dB.',
          ],
        },
        { h3: 'Good to know' },
        {
          list: [
            'The gold marks on the rear plate show the defaults. The moods load the values listed under Moods.',
            'HAVA is a colour: it adds air and a short spring, and it is not a reverb. There is no decay or time control.',
          ],
        },
      ],
    },
    { id: 'download', heading: 'Getting HAVA', blocks: gettingIt(HAVA) },
  ],
};
