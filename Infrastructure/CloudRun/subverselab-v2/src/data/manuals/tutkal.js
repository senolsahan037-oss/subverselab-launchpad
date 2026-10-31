// TUTKAL owner's manual as a web page: /plugins/tutkal/manual.
// Source: 01_AI_Tools/subverselab-tutkal/docs/manual/Tutkal_Manual.html (12 Oct 2026, 14:09). On 28 Oct that HTML and
// public/plugins/tutkal/Tutkal_Manual.pdf were brought in line with this page (the 1.0.3 changes below). The 12 Oct text predated TUTKAL 1.0.3 (released the evening of 12 Oct), the version
// the site sells. Changed here to follow 1.0.3 (STATUS.md 12 Oct entries, Source/PluginEditor.cpp, PluginProcessor.cpp):
//   - the EXT switch is now KEY (ON / AUTO, default AUTO) on the front of every voicing and on the rear; AUTO picks up a
//     routed sidechain as soon as it carries signal and lets go after 4 s of silence; PUMP has no EXT switch of its own;
//   - the display's KEY row (KEY SIDECHAIN / KEY SELF) in every voicing; SC HPF reads OFF (not AUTO) and is off by default;
//   - "Measured, not guessed": the old calibration figures were taken with the former 200 Hz detector filter and the
//     11.6 dB steady-tone figure is no longer true; replaced by the 1.0.3 release gates in tools/measure.py (G8: within
//     1.5 dB of a peak bus compressor at −12/−18/−24 dB; K3: steady tones within 0.22 dB of the static rule);
//   - DRIVE: the 1.0.3 measured distortion figure (0 to about 10 % on a −12 dBFS tone) instead of "a few tenths of a percent".
// Fixed: the GLUE quick start had the threshold direction backwards (it said raise THRESHOLD when the meter swings too little).
// Left out: the line on what the name means (public copy rule), the "subverselab.com/launch … no activation needed"
// lines (the licence sentence comes from gettingIt()), the picture captions (their control rows are folded into the text).

import { TUTKAL } from '../plugins.js';
import { installation, gettingIt, manualBase } from './common.js';

export const TUTKAL_MANUAL = {
  ...manualBase(TUTKAL, {
    subtitle: 'Bus Glue · Vocal Leveller · Sidechain Pump · Model TK-79',
    description: 'The TUTKAL owner’s manual: the three voicings, quick starts for drum bus, vocal and sidechain pump, every control with its range and default, the KEY switch and sidechain filter, the meters, recipes, installation on macOS and Windows, specifications and the measured calibration.',
  }),
  sections: [
    {
      id: 'introduction',
      heading: 'What TUTKAL is',
      blocks: [
        { p: 'TUTKAL is one compressor with three faces. Switch between GLUE (drum and mix bus, a gripping leveller that holds elements together), LA (vocal leveller, program-dependent and smooth, never snatching), and PUMP (sidechain ducking in time with a kick, obvious and musical).' },
        { h3: 'On the drum bus: glue' },
        { p: 'GLUE uses a detector that blends the peak with a rolling average, so the mix is held as one instead of grabbed on every hit. A slow stage does the gluing; a fast stage adds a tiny controlled snap so the first millisecond of a transient passes through and the body sits lower. With AUTO RELEASE the glue lets go in about 1.4 s after a busy passage; the RELEASE knob sets it by hand. The threshold at −18 dB compresses as hard as a classic bus compressor at the same setting.' },
        { h3: 'On a vocal: LA' },
        { p: 'LA is an opto-style leveller. Attack speeds up as the vocal gets louder, from about 19 ms on a light touch to about 7 ms when pushed hard. Release is two stages: a fast decay for the snap, then a slow tail that learns how long you are singing. Soft knee, smooth colour. COMPRESS gives a gentle 3:1 knee, LIMIT a tighter 12:1. The vocal stays level, never grabbed.' },
        { h3: 'On a pad with a kick sidechain: pump' },
        { p: 'PUMP is a hard duck. It listens to the kick (or any track you route to the sidechain), attacks in less than 1 millisecond, and releases in time: 1/16 to 1/2 note values at the host tempo, with three shapes (exponential, linear, or swell). The same kick triggers the pump over and over, on the beat, obvious.' },
      ],
    },
    {
      id: 'quick-start',
      heading: 'Quick start',
      blocks: [
        { h3: 'GLUE on the drum bus' },
        {
          steps: [
            '**Put TUTKAL on the drum bus.** It opens in GLUE mode.',
            '**Set THRESHOLD to −18 dB.** Look at the GR meter (centre of the face, left side).',
            '**Watch the needle.** On a drum loop it should swing 2–4 dB. If it swings less, lower THRESHOLD (more compression); if it swings more, raise it (less).',
            '**Set RATIO to 4:1 or higher if the drums need more grip.** Higher ratio = more gain reduction at the same threshold.',
            '**Leave ATTACK at 10 ms and RELEASE on AUTO.** The compressor will remember how long the notes are and release accordingly.',
          ],
        },
        { h3: 'LA on a vocal' },
        {
          steps: [
            '**Put TUTKAL on the vocal track and switch to LA.**',
            '**Turn PEAK REDUCTION to about 0.5 (halfway).** The GR meter shows how much it is levelling.',
            '**Listen: the vocal should be more even, not grabbed.** If it is too tame, raise PEAK REDUCTION; if it is too tight, lower it.',
            '**Switch between COMPRESS and LIMIT:** COMPRESS for a lighter touch, LIMIT for a hard ceiling on the peaks.',
          ],
        },
        { h3: 'PUMP on a pad with a kick sidechain' },
        {
          steps: [
            '**Put TUTKAL on the pad track and switch to PUMP.**',
            '**Route the kick to TUTKAL’s sidechain in your DAW.** In Ableton Live: open the device’s Sidechain section and choose the kick track. With KEY on AUTO (the default), TUTKAL picks up the key as soon as it carries signal; set KEY to ON to force it.',
            '**Set NOTE to 1/8 (one-eighth note).** The pad will duck and recover in time over one-eighth note.',
            '**Turn DEPTH to 10 dB.** The pad will sink by 10 dB when the kick hits.',
            '**Pick a SHAPE: EXP (smooth curve), LINEAR (straight), or SWELL (slow rise).** Each is a different feeling of the pump.',
          ],
        },
      ],
    },
    {
      id: 'front-panel',
      heading: 'The front panel',
      blocks: [
        { p: 'The face shows TUTKAL on the left, the voicing selector (GLUE, LA, PUMP), a big gain-reduction meter in the centre, and the controls below. Only the controls that work in each voicing are shown. On the right: the KEY switch, IN (bypass), and REAR (the back panel).' },
        { h3: 'GLUE controls' },
        { p: 'In GLUE the control row is THRESHOLD, RATIO, ATTACK, RELEASE, MAKEUP and MIX, with the AUTO RELEASE switch.' },
        {
          table: {
            head: ['Control', 'Range · default', 'What it does'],
            rows: [
              ['THRESHOLD', '−40 to 0 dB · −18 dB', 'The level above which the compressor starts to grab. Lower = more compression. Set it so the GR meter swings 2–4 dB on your source. At −18 dB it compresses like a classic bus compressor at the same setting.'],
              ['RATIO', '1.5 to 20:1 · 4:1', 'How hard the compressor grabs once the threshold is crossed. Higher ratio = more gain reduction at the same level. At 1.5:1 it barely squeezes; at 20:1 it is a limiter.'],
              ['ATTACK', '0.1 to 30 ms · 10 ms', 'How fast the compressor reacts. Lower = quicker (0.1 ms catches every transient). Higher = slower (30 ms lets the attack through). At 10 ms the first 1–3 ms of a hit passes, the body sits lower.'],
              ['RELEASE', '0.1 to 1.2 s · 0.3 s', 'How fast the compressor lets go. Lower = quicker (0.1 s = 100 ms, snappy). Higher = slower (1.2 s = 1200 ms, breath). Only used if AUTO RELEASE is off.'],
              ['AUTO RELEASE', 'On / off · on', 'When on, the compressor learns: a short hit releases fast, a long squeeze releases slow, like a classic bus compressor. Off: the RELEASE knob is always used.'],
              ['MAKEUP', '0 to +20 dB · 0 dB', 'Output gain, to bring the level back after compression. Turn it up to keep the bus as loud as it was before TUTKAL.'],
              ['MIX', '0 to 100 % · 100 %', 'Blend between dry (0 %) and compressed (100 %). At 50 % the compressor hits half as hard; useful for a gentle touch.'],
            ],
          },
        },
        { h3: 'LA controls' },
        { p: 'In LA the control row is PEAK REDUCTION, the COMPRESS / LIMIT switch, GAIN and MIX.' },
        {
          table: {
            head: ['Control', 'Range · default', 'What it does'],
            rows: [
              ['PEAK REDUCTION', '0 to 1 (100 %) · 0.5', 'How much to level the vocal. Higher = more compression (more gain reduction). At 0.5 the vocal swings less; at 0.9 it is nearly flat. The attack accelerates as you push harder, staying smooth.'],
              ['COMPRESS / LIMIT', 'Two modes · COMPRESS', 'COMPRESS: a soft 3:1 ratio, gentle enough for talking and singing. LIMIT: a hard 12:1 ratio with a tighter knee, a ceiling for screams and shouts. Switch between them to hear the difference.'],
              ['GAIN', '0 to +20 dB · 0 dB', 'Output gain (same as MAKEUP in GLUE). Bring the vocal back to its original level if compression made it quieter.'],
              ['MIX', '0 to 100 % · 100 %', 'Blend between dry and compressed. At 50 % the vocal is half as compressed; useful if LA is too much.'],
            ],
          },
        },
        { h3: 'PUMP controls' },
        { p: 'In PUMP the control row is DEPTH, NOTE, SHAPE, THRESHOLD and MIX.' },
        {
          table: {
            head: ['Control', 'Range · default', 'What it does'],
            rows: [
              ['DEPTH', '0 to 24 dB · 10 dB', 'How hard the pad sinks when the kick hits. Higher = deeper duck. 10 dB is obvious; 24 dB is a hard crash; 0 dB is no pump at all.'],
              ['NOTE', '1/16, 1/8, 1/4, 1/2 · 1/8', 'Recovery length as a note value at the host tempo. 1/16 = quick and tight, 1/8 = snappy, 1/4 = laid-back, 1/2 = long and slow. Change it to feel.'],
              ['SHAPE', 'EXP, LINEAR, SWELL · EXP', 'How the pad bounces back. EXP (exponential): smooth curve. LINEAR: straight line. SWELL: rises fast then settles, like an air rise.'],
              ['THRESHOLD', '−40 to 0 dB · −18 dB', 'The key level at which the pump triggers. Lower it (for example to −30 dB) if the kick is quiet and does not trigger the pump.'],
              ['MIX', '0 to 100 % · 100 %', 'Blend between dry and pumped. At 50 % the duck is half as deep.'],
            ],
          },
        },
        { h3: 'KEY and IN (every voicing)' },
        {
          table: {
            head: ['Control', 'Range · default', 'What it does'],
            rows: [
              ['KEY', 'ON / AUTO · AUTO', 'Where the detector listens. AUTO: as soon as a sidechain is routed and carries signal, the detector hears only the sidechain; it lets go again after 4 s of silence on the sidechain, and a silent sidechain never engages it. ON: the detector always hears only the sidechain. With no sidechain routed, TUTKAL listens to the track itself (self-keyed). Keyed by a sidechain, GLUE ducks on the key’s peaks.'],
              ['IN', 'On / off · on', 'Off is bypass: the dry signal, bit-exact and delayed by the latency, so the output never shifts in time.'],
            ],
          },
        },
      ],
    },
    {
      id: 'rear-panel',
      heading: 'The rear panel',
      blocks: [
        { p: 'The set-up: the sidechain filter, the key source, and the output transformer. These work in every voicing.' },
        {
          table: {
            head: ['Control', 'Range · default', 'What it does'],
            rows: [
              ['SC HPF', 'OFF, 20–300 Hz · OFF', 'A 12 dB/octave high-pass on the sidechain detector only (the dry signal is never filtered). Off until you set a frequency, in every voicing. Raise it to keep low rumble and bass out of the detector.'],
              ['KEY', 'ON / AUTO · AUTO', 'The same switch as on the front. ON: only the sidechain is heard by the detector. AUTO: as soon as the sidechain carries signal.'],
              ['DRIVE', '0 to 100 % · 0 %', 'Output transformer saturation, weighted toward low frequencies. At 0 % it is off and the output path is bit-exact. Raise it to add warmth and harmonics (2nd and 3rd order); on a −12 dBFS tone the distortion rises from 0 to about 10 % at 100 %.'],
            ],
          },
        },
        { h3: 'SC HPF on a drum bus: 200 Hz' },
        { p: 'SC HPF is off until you set it. On a drum bus in GLUE, 200 Hz is the measured point where a kick alone drives the detector to 69 % of the bus compression and a snare alone to 41 %; with no high-pass the kick alone drives it to 93 %. Do not use it when a kick on the sidechain is the key: the kick lives below 200 Hz and the detector would barely hear it.' },
      ],
    },
    {
      id: 'meters',
      heading: 'The meters',
      blocks: [
        { h3: 'Gain reduction (GR) meter' },
        { p: 'The needle on the left half of the window shows how much the compressor is pulling the signal down, in dB. A steady 2–4 dB on the drum bus is GLUE working. On a vocal in COMPRESS mode, swings of 0–12 dB are normal. On a pad being pumped, 10–14 dB at the kick hits is the duck. The needle has ballistics (it moves in real time and falls a little slower, so you can see the shape).' },
        { h3: 'Right-side display (per voicing)' },
        {
          list: [
            '**GLUE:** the SC HPF row (OFF, or the frequency set on the rear plate), the AUTO RELEASE lamp (lit if on), and the KEY row.',
            '**LA:** COMPRESS / LIMIT lamps (one lights to show the mode), and the KEY row.',
            '**PUMP:** the NOTE value (1/16, 1/8, 1/4, 1/2) with the host tempo in BPM (120 when the host gives none), the KEY row, and the SHAPE lamps (EXP, LINEAR, SWELL).',
            '**KEY row:** reads KEY SIDECHAIN when the detector hears the sidechain and KEY SELF when it hears the track itself, with a line saying why (for example “AUTO: SIDECHAIN HEARD” or “NO SIDECHAIN: SELF-KEYED”).',
          ],
        },
      ],
    },
    {
      id: 'recipes',
      heading: 'Where to use each voicing',
      blocks: [
        {
          recipes: [
            {
              name: 'Drum bus: steady glue',
              settings: 'GLUE · THRESHOLD −15 to −22 dB · RATIO 4:1 to 10:1 · ATTACK 3–10 ms · RELEASE 0.3–0.6 s · AUTO on',
              text: 'Lower THRESHOLD for more glue (the elements sit tighter); raise RATIO if they still feel loose. ATTACK at 3 ms lets the kick’s snap through, ATTACK at 10 ms more hidden. Longer RELEASE (0.6 s) breathes with the bar; shorter (0.3 s) snaps back fast. AUTO RELEASE is the default; turn it off only if you want the RELEASE knob to rule everything.',
            },
            {
              name: 'Mix bus: gentle ride',
              settings: 'GLUE · THRESHOLD −24 dB · RATIO 2:1 · MAKEUP +4 to +6 dB',
              text: 'A gentler setting than the drum bus. The 2:1 ratio barely squeezes; at −24 dB the threshold is low enough to catch small movements without sounding compressed. Use MAKEUP to bring the level back. Turn MIX to 50 % if even this is too much.',
            },
            {
              name: 'Vocal: even and smooth',
              settings: 'LA · PEAK REDUCTION 0.4–0.6 · COMPRESS mode · GAIN +2 to +4 dB',
              text: 'Start at 0.5 and adjust by ear. COMPRESS is the softer mode; use LIMIT (by toggling COMPRESS/LIMIT) if peaks are still breaking through. The attack is automatic and fast, the release is a two-stage tail (fast snap, slow fade). GAIN brings the vocal back to reference level.',
            },
            {
              name: 'Pad pump with kick sidechain',
              settings: 'PUMP · DEPTH 12 dB · NOTE 1/8 · SHAPE EXP · KEY AUTO (sidechain routed to the kick)',
              text: 'The pad sinks 12 dB when the kick hits and recovers over one-eighth note. Try SHAPE LINEAR for a straight pull, or SWELL for a late, rising return. Raise DEPTH to 16–20 dB if you want a hard crash; lower it to 6–8 dB for a subtle swell. Change NOTE to 1/4 for a longer release, 1/16 for a quick snap.',
            },
            {
              name: 'SC HPF: taming a loud bass or kick',
              settings: 'Any voicing · SC HPF 100–200 Hz',
              text: 'If the kick or bass is driving the detector too hard (the GR meter bounces wildly), raise SC HPF to 100, 150, or 200 Hz. This keeps the lowest frequencies out of the compressor’s ear. OFF is the default in every voicing. A vocal with lots of low rumble also benefits from a high-pass on the sidechain.',
            },
          ],
        },
      ],
    },
    {
      id: 'installation',
      heading: 'Installation',
      blocks: installation('TUTKAL', {
        macSteps: [
          'Run the installer package (`.pkg`) you downloaded. It is signed with a Developer ID and notarised by Apple, so macOS opens it without any extra step.',
          'Choose what to install: the VST3 plug-in (`TUTKAL.vst3` in `/Library/Audio/Plug-Ins/VST3`) and the Audio Unit (`TUTKAL.component` in `/Library/Audio/Plug-Ins/Components`).',
          'Restart your DAW, or make it rescan its plug-in list.',
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
              ['Channel layouts', 'Mono to mono, mono to stereo, stereo to stereo; mono sidechain input'],
              ['Latency', '63 samples at every sample rate (44.1 kHz, 48 kHz, 96 kHz, 192 kHz)'],
              ['Bypass', 'Bit-exact dry, delayed by the latency so the output never shifts in time'],
              ['Undo / redo', 'Cmd+Z / Cmd+Shift+Z (macOS); Ctrl+Z / Ctrl+Shift+Z (Windows); Ctrl+Y (Windows, forward only)'],
              ['State saved', 'With the project file; presets are not included in this release'],
              ['Processor usage', 'One minute of 48 kHz stereo renders in about 2.6 s on our test Mac (Apple silicon; machine dependent)'],
              ['Code signing', 'macOS installer signed with a Developer ID and notarised by Apple'],
            ],
          },
        },
        { h3: 'Measured, not guessed' },
        { p: '**GLUE calibration:** a threshold means what it means on a classic bus compressor. Measured against a classic stereo-linked peak bus compressor at the same settings (4:1, attack 10 ms, AUTO release), GLUE’s mean gain reduction on a drum bus and on a full mix sits within 1.5 dB of it at thresholds of −12, −18 and −24 dB.' },
        { p: '**On steady tones:** GLUE follows the textbook rule, gain reduction = (level − threshold) × (1 − 1/ratio), to within 0.22 dB across 50 Hz, 100 Hz and 1 kHz tones and the timing settings tested.' },
        { p: '**LA release:** The first half of the gain reduction (from max down to 50 %) takes about 60 milliseconds after the vocal stops. The tail (50 % to 10 %) takes 1–15 seconds depending on how long you were singing (longer play = longer tail). This opto-style memory is by design, not a bug.' },
        { p: '**Latency:** The fixed latency is 63 samples at every sample rate. With IN on (the default), the output is compressed but delayed by 63 samples, and the host is told so. With IN off (bypass), the input is also delayed by 63 samples, so the timing never moves. Hosts with plug-in delay compensation follow it automatically.' },
      ],
    },
    { id: 'download', heading: 'Getting TUTKAL', blocks: gettingIt(TUTKAL) },
  ],
};
