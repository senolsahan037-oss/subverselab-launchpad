// SEDA owner's manual as a web page: /plugins/seda/manual.
// Source: 01_AI_Tools/subverselab-seda/docs/manual/Seda_Manual.html (28 Oct 2026, SEDA 1.0.0, the version the site sells; same
// text as public/plugins/seda/Seda_Manual.pdf). Written from the plug-in itself: Source/PluginProcessor.cpp (parameters, ranges,
// defaults), SedaEngine.h (LISTEN constants, RUNAWAY / CHAOS), Programs.h (P0-P4), PluginEditor.cpp (panel, display, dimming, SIZE),
// ParamText.h (typed values) and STATUS.md (17 Oct RUNAWAY / CHAOS measurements, UI signature fixes).
// Left out: the reserved VOICE values (DIGITAL, CLEAN: not built, the panel does not show them), the PDF's "Getting the plugin" row
// (the download and licence sentence come from gettingIt()), anything not confirmed in the source (no hiss figures, no CPU figures).

import { SEDA } from '../plugins.js';
import { installation, gettingIt, manualBase } from './common.js';

export const SEDA_MANUAL = {
  ...manualBase(SEDA, {
    subtitle: 'BBD Analog Delay · Listening Echo · Model BD-79',
    description: 'The SEDA owner’s manual: the bucket-brigade delay, quick starts, every control with its range and default, LISTEN (duck, throw, guard and the programs), RUNAWAY and CHAOS, the display, installation on macOS and Windows and specifications.',
  }),
  sections: [
    {
      id: 'introduction',
      heading: 'What SEDA is',
      blocks: [
        { p: 'SEDA is a bucket-brigade (BBD) analog delay: 8192 stages, companded, from 20 to 1200 ms, with feedback up to 110 % and zero latency. LISTEN is what sets it apart: the delay listens to the phrase, ducks the echo while you play or sing, and throws it at the end of the phrase.' },
        { h3: 'A real bucket brigade' },
        { p: 'The echo runs through a modelled BBD line: the signal is compressed 2:1 and pre-emphasised on the way in, sampled through the stages at a clock that sets the delay time, filtered on the way out and expanded 1:2 again. COMPANDER sets how much of that compander is in the path; AGE switches between NEW (8192 stages) and OLD (4096 stages, darker). TIME moves the clock, so a turn of TIME bends the pitch of the repeats on their way, as on a hardware unit.' },
        { h3: 'LISTEN' },
        { p: 'With LISTEN on, the repeats sit down while the source plays (DUCK) and come up at the end of a phrase (THROW). Four programs on the LED display (VOCAL, DRUMS, BASS, KEYS) set the note value, the wet high-pass, DUCK and THROW for that kind of source. With LISTEN off, SEDA is a plain delay and none of the LISTEN code touches the signal.' },
        { h3: 'RUNAWAY and CHAOS' },
        { p: 'Two knobs above the TIME section make the delay lose control on purpose: RUNAWAY pushes the loop past 100 % into a darkening drone, CHAOS makes the delay clock wander and, above 50 %, step the pitch on the beat. Both open at 0, where they do nothing.' },
      ],
    },
    {
      id: 'quick-start',
      heading: 'Quick start',
      blocks: [
        { h3: 'A plain echo' },
        {
          steps: [
            '**Put SEDA on a track.** It opens at TIME 300 ms, FEEDBACK 30 %, MIX 50 %, LISTEN off.',
            '**Set the time.** Turn TIME, or press SYNC and pick a NOTE value (1/32 to dotted 1/1) at the host tempo.',
            '**Set how long it rings.** FEEDBACK sets the level of each repeat; past 100 % the loop keeps itself going.',
            '**Set the blend.** MIX goes from DRY to WET. On a send or return track, set it to WET so only the echo is heard.',
          ],
        },
        { h3: 'A vocal echo that waits for the phrase' },
        {
          steps: [
            '**Turn LISTEN on** (the lever at the top right).',
            '**Press the right PROGRAM STEP key until the display reads P1 VOCAL.** SEDA syncs to a dotted 1/4, sets WET HP to 250 Hz, DUCK to 60 % and THROW to 6 dB; the knobs glide to their new places.',
            '**Play the vocal.** The red needle shows how far the echo is ducked while the singer sings; at the end of a phrase the THROW lamp lights and the echo comes up.',
            '**Adjust by ear.** More DUCK keeps the echo further down under the words; more THROW makes the phrase ends bigger.',
          ],
        },
      ],
    },
    {
      id: 'panel',
      heading: 'The panel',
      blocks: [
        { p: 'The top band holds the name and model plate, RUNAWAY and CHAOS, the display (the ECHO meter on the left, the LISTEN display on the right), and in the right column the LISTEN lever, the IN lever and the SIZE key. Below sit six sections: TIME, LOOP, MOD, STEREO, LISTEN and OUT. A control that does nothing in the current setting is dimmed, and its value window says why (for example SYNC ON under TIME, or LISTEN OFF under DUCK).' },
        {
          list: [
            'Drag a knob up or down. Double-click a knob to return it to the value of the program that is loaded now (for NOTE, WET HP, DUCK, THROW and the MIX cap of P3 BASS) or else to its factory default.',
            'Double-click a value window to type a value: `300`, `0.3 s`, `1/8`, `1/4d` or `1/8t`, `OFF` for WET HP. Text it cannot read changes nothing.',
            'When a program sets new values the knob drawings glide there; the sound changes at once.',
            'Undo and redo: Cmd+Z / Cmd+Shift+Z on macOS; Ctrl+Z / Ctrl+Shift+Z or Ctrl+Y on Windows.',
            'SIZE scales the window: 60, 75 or 100 %.',
            'The SubverseLab lockup at the bottom right opens subverselab.com.',
          ],
        },
      ],
    },
    {
      id: 'controls',
      heading: 'The controls',
      blocks: [
        { h3: 'TIME' },
        {
          table: {
            head: ['Control', 'Range · default', 'What it does'],
            rows: [
              ['TIME', '20 to 1200 ms · 300 ms', 'The delay time, when SYNC is off. Turning it moves the BBD clock, so the repeats already in the line change pitch as they go.'],
              ['SYNC', 'On / off · off', 'On: the time follows the host tempo as a NOTE value, and TIME is dimmed.'],
              ['NOTE', '1/32 to 1/1, straight, triplet (t) or dotted (d) · 1/4d', 'The note value with SYNC on. Dimmed with SYNC off.'],
              ['AUTO', 'On / off · off', 'NOTE AUTO: with SYNC and LISTEN on, the note value follows how busy the source is, and changes only at bar lines: a second line takes over with a short crossfade while the old one rings out, so there is no pitch glide. The AUTO NOTE lamp shows it is in force.'],
            ],
          },
        },
        { h3: 'LOOP' },
        {
          table: {
            head: ['Control', 'Range · default', 'What it does'],
            rows: [
              ['FEEDBACK', '0 to 110 % · 30 %', 'How much of each repeat goes round again. Over 100 % the loop sustains itself; a level control in the loop holds it at a steady level instead of letting it grow without end.'],
              ['TONE', '−100 to +100 % · 0 %', 'A tilt in the feedback path, −6 to +6 dB: positive makes each pass brighter, negative darker.'],
              ['COMPANDER', '0 to 100 % · 100 %', 'How much of the BBD compander (2:1 in, 1:2 out, with pre- and de-emphasis) is in the path. 0 is a clean line with no compander; 100 % is the full compander, which keeps the line’s hiss down.'],
              ['AGE', 'NEW / OLD · NEW', 'NEW: 8192 stages. OLD: 4096 stages, darker. The footer of the display names the stages and whether the compander is on.'],
            ],
          },
        },
        { h3: 'MOD' },
        {
          table: {
            head: ['Control', 'Range · default', 'What it does'],
            rows: [
              ['RATE', '0.05 to 8 Hz · 0.50 Hz', 'Speed of the modulation of the delay clock.'],
              ['DEPTH', '0 to 100 % · 0 %', 'Amount: 100 % moves the delay time by ±3 %. It also scales a slow drift. At 0 the clock is steady.'],
              ['SHAPE', 'SINE / TRI · SINE', 'Sine or triangle.'],
            ],
          },
        },
        { h3: 'STEREO' },
        {
          table: {
            head: ['Control', 'Range · default', 'What it does'],
            rows: [
              ['MONO · WIDE · PING-PONG', 'One of three · MONO', 'MONO: one echo in both channels. WIDE: the right channel’s echo is offset in time by WIDTH. PING-PONG: the repeats alternate between left and right.'],
              ['WIDTH', '0 to 20 ms · 0 ms', 'The time offset between the channels. Dimmed in MONO.'],
              ['WET HP', 'OFF to 1 kHz · OFF', 'A 6 dB/octave high-pass on the echo, inside the feedback loop, so every pass loses a little more low end. It works with LISTEN on (dimmed with LISTEN off).'],
            ],
          },
        },
        { p: 'On a mono output bus SEDA plays MONO whatever STEREO says: WIDE and PING-PONG stay clickable but are drawn dimmed, and WIDTH reads MONO BUS.' },
        { h3: 'LISTEN' },
        {
          table: {
            head: ['Control', 'Range · default', 'What it does'],
            rows: [
              ['DUCK', '0 to 100 % · 50 %', 'How far the repeats sit down while the source plays: 100 % is 12 dB. Dimmed with LISTEN off.'],
              ['THROW', '0 to 12 dB · 0 dB', 'How much the echo comes up at the end of a phrase. 0 is no throw. Dimmed with LISTEN off.'],
            ],
          },
        },
        { h3: 'OUT and the right column' },
        {
          table: {
            head: ['Control', 'Range · default', 'What it does'],
            rows: [
              ['MIX', 'DRY to WET (0 to 100 %) · 50 %', 'Dry to wet. At WET only the echo is heard.'],
              ['LISTEN', 'On / off · off', 'Turns the listening layer on: DUCK, THROW, the programs, NOTE AUTO, WET HP and the feedback guard. Off: a plain delay; none of the listening code touches the signal.'],
              ['IN', 'On / off · on', 'Off = bypassed: a bit-exact copy of the input.'],
              ['SIZE', '60 / 75 / 100 %', 'Window size.'],
            ],
          },
        },
        { h3: 'RUNAWAY and CHAOS' },
        {
          table: {
            head: ['Control', 'Range · default', 'What it does'],
            rows: [
              ['RUNAWAY', '0 to 100 % · 0 %', 'Raises the loop gain over FEEDBACK, up to 1.2 at 100 %. With FEEDBACK at 30 % the loop crosses 100 % at about 70 %. A low-pass in the loop darkens every pass (6 kHz down to 2.2 kHz as RUNAWAY rises) and the line’s hiss rises with it, so a running-away loop can start from its own noise. The level is held steady, as with FEEDBACK over 100 %.'],
              ['CHAOS', '0 to 100 % · 0 %', '0 to 50 %: a slow random wobble of the delay clock, up to 1.2 % of the delay time, strongest when the loop is loud. Over 50 %: also a random pitch step on each beat, by an octave, a fifth or a fourth up or down, more often the higher CHAOS goes. The beats are the host’s quarter notes while the host plays; otherwise one per delay time.'],
            ],
          },
        },
        { p: 'While a knob in this pair is held, its label shows the value. The red RUNAWAY lamp on the display lights while the loop gain is over 100 %, whether FEEDBACK or RUNAWAY put it there.' },
      ],
    },
    {
      id: 'listen',
      heading: 'LISTEN',
      blocks: [
        { h3: 'Duck' },
        { p: 'While the source plays, the repeats (the echo at the output, not the loop itself) sit down by up to 12 dB, set by DUCK. They go down in about 30 ms; when the source stops they wait 120 ms and come back with a smooth 300 ms release. A gap shorter than 250 ms counts as a breath and the echo stays down, so it does not chatter between syllables. Because only the output is ducked, the tail keeps circulating and blooms when the phrase ends.' },
        { h3: 'Throw' },
        { p: 'After at least 1.2 s of material, a gap longer than 250 ms (or half the repeat time, whichever is longer) counts as the end of a phrase. The echo then rises towards +3 dB over its un-ducked level, THROW deciding how far, and FEEDBACK rises by up to 15 %, for one note value; then both fall back over two. If the source comes back, the throw is cancelled. The THROW lamp lights while it happens.' },
        { h3: 'Guard' },
        { p: 'With LISTEN on and FEEDBACK at 100 % or less, a loop whose level keeps growing for 2 s with no input is pulled down until it decays. The GUARD lamp shows when it is working. A loop over 100 % on purpose (FEEDBACK over 100 % or RUNAWAY) is left alone.' },
        { h3: 'Programs' },
        { p: 'The PROGRAM STEP keys under the display step through five programs. A program writes its values into the real knobs (one undo step, and the host sees them); from then on the knobs are yours. While LISTEN is off the display is dimmed and reads NEEDS LISTEN: DUCK, THROW and WET HP act only with LISTEN on.' },
        {
          table: {
            head: ['Program', 'SYNC · NOTE', 'WET HP', 'DUCK', 'THROW', 'Also'],
            rows: [
              ['P0 MANUAL', 'unchanged', 'unchanged', 'unchanged', 'unchanged', 'writes nothing'],
              ['P1 VOCAL', 'on · 1/4 dotted', '250 Hz', '60 %', '6 dB', '—'],
              ['P2 DRUMS', 'on · 1/16', '400 Hz', '30 %', '0 dB', '—'],
              ['P3 BASS', 'unchanged', '150 Hz', '50 %', '0 dB', 'MIX above 20 % is lowered to 20 %'],
              ['P4 KEYS', 'on · 1/8', 'OFF', '50 %', '0 dB', 'STEREO PING-PONG'],
            ],
          },
        },
      ],
    },
    {
      id: 'display',
      heading: 'The display',
      blocks: [
        {
          list: [
            '**ECHO meter:** the needle shows the wet level after the duck, −36 to 0 dB. The PEAK lamp lights when the wet signal reaches −3 dB.',
            '**Red inner scale and needle:** the duck depth, 0 to 12 dB, while LISTEN is on.',
            '**LED display:** the program on the left (P0 MANUAL to P4 KEYS); on the right the repeat time in ms, or the NOTE value with SYNC on.',
            '**Lamps:** THROW (a throw is happening), GUARD (the guard is pulling the loop down), AUTO NOTE (NOTE AUTO is in force), RUNAWAY (the loop is over 100 %).',
            '**Footer:** the BBD stages (8192 or 4096) and whether the compander is on.',
          ],
        },
      ],
    },
    {
      id: 'installation',
      heading: 'Installation',
      blocks: installation('SEDA', {
        standalone: true,
        winStandalone: true,
        macSteps: [
          'Run the installer package (`.pkg`) you downloaded. It is signed with a Developer ID and notarised by Apple, so macOS opens it without any extra step.',
          'Choose what to install: the VST3 plug-in (`/Library/Audio/Plug-Ins/VST3`), the Audio Unit (`/Library/Audio/Plug-Ins/Components`) and the standalone app (`/Applications`).',
          'Restart your DAW, or make it rescan its plug-in list.',
        ],
        winSteps: [
          'If Windows blocks the downloaded files: right-click the zip, choose **Properties**, tick **Unblock**, then extract.',
          'Copy the `.vst3` folder to `C:\\Program Files\\Common Files\\VST3\\`.',
          'Put the standalone app (`SEDA.exe`) in any folder you like and start it from there.',
          'Rescan plug-ins in your DAW.',
        ],
        extra: [
          { p: 'The standalone app takes its input and output from Options → Audio/MIDI Settings. With no input device it still runs, so RUNAWAY can start from the line’s own hiss.' },
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
              ['Formats', 'macOS 11 or later (Apple Silicon and Intel): standalone app, VST3, AU · Windows (64-bit): standalone app, VST3'],
              ['Channel layouts', 'Mono to mono, stereo to stereo'],
              ['Latency', '0 samples at every sample rate; the dry signal is never delayed'],
              ['Delay', 'BBD line, 8192 stages (NEW) or 4096 (OLD), companded; 20 to 1200 ms, or a NOTE value from 1/32 to dotted 1/1 at the host tempo'],
              ['Feedback', '0 to 110 %; the echo has a soft ceiling at −3 dBFS'],
              ['Bypass', 'IN off: a bit-exact copy of the input'],
              ['Undo / redo', 'Cmd+Z / Cmd+Shift+Z (macOS); Ctrl+Z / Ctrl+Shift+Z or Ctrl+Y (Windows)'],
              ['State saved', 'With the project file; parameters can be automated'],
              ['Code signing', 'macOS installer signed with a Developer ID and notarised by Apple'],
            ],
          },
        },
        { h3: 'Measured, not guessed' },
        {
          list: [
            'With RUNAWAY and CHAOS at 0 the output is bit-identical to SEDA before they were added, at every setting tested.',
            'RUNAWAY 100 %, TIME 150 ms, silence in, at 44.1, 48 and 96 kHz and block sizes 32 and 512: the drone settles at −13.5 dB RMS with peaks around −4.4 dBFS in every case.',
            'The output is the same at any block size: everything is computed per sample.',
          ],
        },
      ],
    },
    { id: 'download', heading: 'Getting SEDA', blocks: gettingIt(SEDA) },
  ],
};
