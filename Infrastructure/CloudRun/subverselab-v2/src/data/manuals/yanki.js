// YANKI owner's manual as a web page: /plugins/yanki/manual.
// Source: 01_AI_Tools/subverselab-yanki/docs/manual/Yanki_Manual.html (12 Oct 2026, corrected after the October audit;
// same text as public/plugins/yanki/Yanki_Manual.pdf, regenerated 28 Oct with the tape line below and without the check counts). Describes YANKI 1.0.1, the version the site sells (released 12 Oct:
// type-in values, double-click = parameter default, the tape-length fix, the readCubic bound fix).
// Changed to follow 1.0.1: the manual's last line said a sync division that needs the longer 6.2 s tape clears the tape;
// in 1.0.1 the tape is kept (STATUS 2026-10-10 / 12 Oct release, YankiEngine.h ensureTape()), so that line now says so.
// Left out: the "subverselab.com/launch … no activation needed" lines (the licence sentence comes from gettingIt()),
// the self-test check counts (75 + 74 in the manual; the 1.0.1 build runs more), the picture captions.
// The standalone app is kept: the 1.0.1 macOS installer installs it (make_mac_installer.sh, STANDALONE=1).

import { YANKI } from '../plugins.js';
import { installation, gettingIt, manualBase } from './common.js';

export const YANKI_MANUAL = {
  ...manualBase(YANKI, {
    subtitle: 'Tape Echo · Tempo Synced · Model YK-74',
    description: 'The YANKI owner’s manual: quick start, installation on macOS and Windows, the echo field and every control with its range and default, sync divisions, the presets, how the swell works, tips, recipes and the measured specifications.',
  }),
  sections: [
    {
      id: 'introduction',
      heading: 'What YANKI is',
      blocks: [
        { p: 'YANKI is a tape echo. Its glass echo field shows one ring per repeat: ring radius = delay time, brightness and thickness = level after feedback, warmth = tone darkening, left/right offset = stereo spread. Drag on the rings to change TIME, FEEDBACK and SPREAD. Below the glass sit six knobs that mirror the same parameters.' },
        { h3: 'The quick start' },
        {
          steps: [
            '**Drop it on a bus.** Nothing has to be set first. It opens in its own starting state (the preset bar reads ECHO · INIT): a plain 1/8 note echo at the host tempo, single head, FEEDBACK 34 % of hold, MIX 30 %. The preset “Eighth clean” is its closest relative.',
            '**Move the WET knob left.** YANKI’s sweet spot lives in the first 10–25 % of travel. One hand, one gesture.',
            '**Drag the rings or the knobs to taste.** Pick a preset from the menu (top bar) for a different character.',
          ],
        },
        { p: 'YANKI YK-74 is one echo, not a bank of algorithms. Everything runs through a tape loop with one record head and three playback heads. Each pass through the loop loses top end, picks up a little wow and flutter, and is gently saturated, so repeats sound like a tape, not a copy.' },
        { p: '**It reads the host tempo.** TIME follows the project’s BPM continuously. If the host gives no tempo (a standalone or a host without transport), YANKI falls back to 120 BPM. When the tempo changes, the delay time glides to the new value instead of jumping, so there are no clicks.' },
        { h3: 'Latency: none' },
        { p: 'YANKI reports zero latency. It is an echo: the dry signal is never delayed.' },
      ],
    },
    {
      id: 'installation',
      heading: 'Installation',
      blocks: installation('YANKI', {
        standalone: true,
        macSteps: [
          'Run the installer package (`.pkg`) you downloaded. It is signed with a Developer ID and notarised by Apple, so macOS opens it without any extra step.',
          'Choose what to install: the VST3 plug-in (`/Library/Audio/Plug-Ins/VST3/YANKI.vst3`), the Audio Unit (`/Library/Audio/Plug-Ins/Components/YANKI.component`) and the standalone app (`/Applications/YANKI.app`, the same panel outside a DAW). An older bundle named “SubverseLab Yanki” is removed by the VST3 package.',
          'Restart your DAW, or make it rescan its plug-in list.',
        ],
        extra: [
          { p: 'Channel layouts: mono → mono, mono → stereo, stereo → stereo. Any host that loads VST3 or AU effects.' },
        ],
      }),
    },
    {
      id: 'face',
      heading: 'Face tour',
      blocks: [
        { p: 'The editor opens at 1280×720 (resizable 800×450 to 2400×1350, fixed 16:9). The glass echo field sits in the centre and shows the repeats as rings. Below and around it are the controls. In a stereo echo — 1/8 dotted at 120 BPM = 375 ms, FEEDBACK 19.5 % of hold, SPREAD 90 %, HEADS 2 — three rings are visible.' },
        {
          list: [
            '**Wordmark, preset browser, BPM and BYPASS (top bar)** — YANKI name, a menu to pick one of 10 presets (shows the name, group, preset number, and whether it is unedited or has been modified), a 7-segment BPM display with a HOST lamp (lit when the host supplies the tempo), and a BYPASS toggle.',
            '**Echo field (centre)** — a glass display with concentric rings. Each ring is one repeat at a multiple of TIME: the radius grows with time, brightness and thickness show the level after feedback (decay is visible), warmth (colour temperature) shows TONE and WEAR darkening. Left/right offset of the rings shows SPREAD, and appears only in the stereo voicings (Three Heads, Dub Spiral, Worn Loop with HEADS 2 or higher). The display also shows: TIME, repeat count, first repeat level in dB, decay to −60 dB in musical bars (or “HOLDS AT CAP” / “SWELLS”), TONE and WEAR values, and the L/R correlation of the wet signal. Below it sits a readout: TIME, repeats visible, first repeat level, decay time in bars.',
            '**Three gold drag handles on the field** — drag outward/inward to change TIME (snaps to note value when synced, continuous ms when on FREE), drag edge up/down to change FEEDBACK, drag sideways to change SPREAD. Double-click a knob or handle to return it to its default.',
            '**WET hero (left of the knobs)** — the MIX parameter as a large knob. Below it: “MIX n % · FIRST REPEAT −x dB”, live. The first 3 % of the knob is a ramp to ensure the first touch does not click.',
            '**SWELL section (right of the knobs)** — SWELL toggle (ON puts FEEDBACK just past HOLD, OFF puts it back and clears TEMPO LOCK), RISE curve knob (Slow, Med, Fast: how far FEEDBACK reaches past HOLD), CAP knob (off, or −12 to +12 dB), END mode (HOLD / CUT / DUMP) with a status lamp and line showing the loop state (OPEN / ARMED / DUMPED), FREEZE key, TEMPO LOCK keys (Off, 1, 2, 4 bars), DARKEN knob, FINE knob.',
            '**Six knobs below the echo field** — TIME (with a sync-division ring that snaps when synced, and a FREE cap for milliseconds), FEEDBACK (with a red arc past HOLD), TONE, WEAR, SPREAD, OUTPUT. Each knob shows a live value line and numerical readout.',
            '**HEADS keys** — below the WET hero: “HEADS” and three keys (1 / 2 / 3). The lit key shows which is active; with no key lit, the preset’s own heads play; a line beneath reads “ONE HEAD” or “TWO HEADS · LEFT/RIGHT” or “THREE HEADS · L/R/L”. Changes which playback heads are active (overrides the preset’s voicing).',
          ],
        },
      ],
    },
    {
      id: 'sync',
      heading: 'Sync divisions',
      blocks: [
        { p: 'When TIME is set to a sync value, the delay time is calculated from the host tempo in real time. The values are:' },
        {
          table: {
            head: ['Sync value', 'At 120 BPM', 'At 100 BPM'],
            rows: [
              ['1/16', '125 ms', '150 ms'],
              ['1/8', '250 ms', '300 ms'],
              ['1/8 dotted', '375 ms', '450 ms'],
              ['1/4', '500 ms', '600 ms'],
              ['1/4 dotted', '750 ms', '900 ms'],
              ['1/2', '1000 ms', '1200 ms'],
              ['FREE', 'Manual: 50–700 ms + FINE', '—'],
            ],
          },
        },
      ],
    },
    {
      id: 'controls',
      heading: 'Controls',
      blocks: [
        { h3: 'Front-panel knobs and keys' },
        {
          table: {
            head: ['Control', 'Range · default', 'What it does'],
            rows: [
              ['TIME (knob + sync ring)', 'Sync: 1/16, 1/8, 1/8., 1/4, 1/4., 1/2, FREE · Free: 50–700 ms + FINE · 1/8', 'The delay time as a note value of the host tempo, or free milliseconds. The ring snaps to the sync division when synced; when on FREE the inner cap shows milliseconds. At 120 BPM, 1/8 = 250 ms. FINE adds up to ±10 ms when on FREE.'],
              ['FEEDBACK (knob)', '0 … HOLD … RISE · 34 % of hold', 'One knob, two zones. Below HOLD (12 o’clock) the repeats decay to silence. At HOLD the repeats fade slowly, about 1 dB per repeat, rather than holding exactly. Past HOLD the loop swells, controlled by RISE CURVE. The display reads “n % of hold” below HOLD, then “Swell n %” above.'],
              ['TONE (knob)', '1–8 kHz · 4500 Hz', 'The high-cut applied inside the loop on every pass. Lower values darken the repeats.'],
              ['WEAR (knob)', '0–10 · 2.5', 'Tape age: wow and flutter on the playback heads. At 10 the delay moves by roughly 1 to 2 ms, depending on the voicing.'],
              ['SPREAD (knob)', '0–100 % · 30 %', 'Stereo width of the echoes. In single-head voicings, SPREAD pans the head left/right; in stereo voicings (Three Heads, Dub Spiral, Worn Loop with HEADS 2 or 3), head 2 sits opposite. Below 70 % is linear; above 70 % compresses to keep the echo audible in mono.'],
              ['MIX (knob, WET hero)', '0–100 % · 30 %', 'Dry/wet balance. 0 % is bit-exact dry and 50 % is dry at unity plus full echo. At 100 %, Echo, Yesilcam and Ters give echo only; in Slapback, Three Heads, Dub Spiral and Worn Loop the dry stays at full level and MIX sets how much echo is added. The sweet spot lives in the first 10–25 % of travel.'],
              ['OUTPUT (knob)', '−12 to +12 dB · 0 dB', 'Final gain, post-echo.'],
              ['CAP (knob, SWELL section)', 'OFF, −12 to +12 dB · OFF', 'The level ceiling for a swell, relative to the dry phrase. Needs SWELL ON. OFF means no limit.'],
              ['RISE (knob, SWELL section)', 'Slow / Med / Fast · Med', 'How fast FEEDBACK reaches past HOLD when swelling. Slow reaches 1.7× the hold gain at the end, Med reaches 2.6×, Fast reaches 4×.'],
              ['SWELL (toggle, SWELL section)', 'OFF / ON · OFF', 'ON: FEEDBACK moves just past HOLD. OFF: FEEDBACK returns to below HOLD and TEMPO LOCK clears. The loop lamp shows the state.'],
              ['END (toggle, SWELL section)', 'HOLD / CUT / DUMP · HOLD', 'HOLD does nothing. CUT mutes the loop, feedback included, over 30 ms on press. DUMP plays the last 1.9 s of the loop backwards, once, then mutes. A new phrase onset (≥1 s silence then above −40 dBFS) re-arms CUT or DUMP back to HOLD.'],
              ['FREEZE (key, SWELL section)', 'Tap = latch, hold = momentary · OFF', 'Stops recording new input. The first active head holds what is on the tape at unity gain (tanh-bounded).'],
              ['TEMPO LOCK (keys, SWELL section)', 'OFF / 1 bar / 2 bars / 4 bars · OFF', 'Arranges the swell to reach CAP on the downbeat that many bars after the phrase starts. Works without CAP switched on: it uses the CAP dB value, 0 dB if untouched. Needs SWELL ON. Only affects the swell block, not the echo.'],
              ['DARKEN (knob, SWELL section)', '0–10 · 0', 'An extra high-cut in the feedback loop. At 0, no extra cut. At 10, about 500 Hz. Darkens each repeat more than TONE alone. It acts on the swell (past HOLD); below HOLD it has almost no effect.'],
              ['FINE (knob, SWELL section)', '±10 ms · 0', 'Added to TIME when the ring is on FREE. No effect on sync divisions.'],
              ['HEADS (keys, left of knobs)', '(preset) / 1 / 2 / 3 · preset', 'With no key lit, the preset’s own heads play; choosing a preset clears the keys. A key overrides: 1 head plays only head 1; 2 heads plays heads 1 and 2 (left/right); 3 heads plays all three (L/R/L).'],
              ['BYPASS (toggle, top bar)', 'OFF / ON · OFF', 'Dry out. Latency is zero, so bypass never moves anything.'],
            ],
          },
        },
        { h3: 'Undo and redo' },
        {
          list: [
            '**macOS:** Cmd+Z undoes, Cmd+Shift+Z redoes. **Windows:** Ctrl+Z undoes; Ctrl+Shift+Z or Ctrl+Y redoes.',
            'One knob move is one step, from the moment you press the mouse button to the moment you let go. Several controls moved together (an X/Y drag, a mood key, a preset) are one step too.',
            'Click the plug-in window first so it has the keyboard. If your DAW takes the key before the plug-in does, use the DAW’s own undo.',
            'Moves made by host automation are not in the plug-in’s history: the DAW’s own undo takes those back. Loading a project, a preset file or a saved state starts a new history. The last 200 steps or more are kept.',
            'A preset is one step, even though it writes a dozen controls. The END key, which only fires a moment, is not part of the history.',
          ],
        },
      ],
    },
    {
      id: 'presets',
      heading: 'Presets',
      blocks: [
        { p: 'The presets sit on the plug-in’s seven voicings, a MOOD parameter that a host can automate (Echo, Slapback, Three Heads, Dub Spiral, Worn Loop, Yesilcam, Ters); automating MOOD recalls that mood’s knob values. Presets 1 to 7 use Echo, preset 8 Three Heads, presets 9 and 10 Dub Spiral. Each preset is voiced by measurement, not taste. The table shows: preset number, name, group (voicing category), time at 120 BPM, decay time (how long repeats take to fall to −60 dB), and first repeat level (dB below the dry signal). Pick one from the menu (top bar). Move any knob to edit; the preset name changes to show EDITED.' },
        {
          table: {
            head: ['No', 'Preset name', 'Group', 'Time', 'Decay', 'First repeat', 'Character'],
            rows: [
              ['1', 'Slap 80 ms', 'SLAP', '80 ms', '0.53 bars', '−12 dB', 'Fast single slap, tight transients.'],
              ['2', 'Sixteenth tight', 'TIGHT', '125 ms', '1.06 bars', '−12 dB', '1/16 note: quick double slapback.'],
              ['3', 'Eighth clean', 'CLASSIC', '250 ms', '2.08 bars', '−12 dB', '1/8 note: the plain echo, good for everything.'],
              ['4', 'Dotted eighth lift', 'CLASSIC', '375 ms', '2.07 bars', '−9 dB', '1/8 dotted: a brighter, denser echo.'],
              ['5', 'Quarter open', 'SPACE', '500 ms', '4.15 bars', '−12 dB', '1/4 note: spacious decay, long tail.'],
              ['6', 'Dotted eighth behind', 'SPACE', '375 ms', '2.09 bars', '−15 dB', '1/8 dotted, low in the mix: sits behind the vocal.'],
              ['7', 'Half note long', 'SPACE', '1000 ms', '4.16 bars', '−15 dB', '1/2 note: deep space, melancholic.'],
              ['8', 'Dotted eighth wide', 'WIDE', '375 ms', '2.09 bars', '−12 dB', '1/8 dotted, three heads, stereo: ping-pong character.'],
              ['9', 'Swell build', 'SWELL', '375 ms', 'holds at CAP', 'n/a', '1/8 dotted, DUB SPIRAL voicing: loop swells and holds at +2.8 dB.'],
              ['10', 'Swell four-bar arrival', 'SWELL', '375 ms', 'holds at CAP', 'n/a', '1/8 dotted, DUB SPIRAL voicing with TEMPO LOCK 4 bars: loop reaches −5.5 dB on the downbeat.'],
            ],
          },
        },
      ],
    },
    {
      id: 'swell',
      heading: 'How the swell works',
      blocks: [
        { p: 'The loop has a **hold point**: the loop gain at which repeats fade only slowly, about 1 dB per repeat. It was measured on the loop, not guessed, and it differs per preset/voicing. FEEDBACK below HOLD scales the loop gain from zero to that point. Past HOLD, RISE takes over: the loop gain is 2^(2 × RISE) times the hold gain.' },
        {
          list: [
            'Turn SWELL ON to put FEEDBACK just past HOLD and enable the swell block (RISE, CAP, DARKEN, END, TEMPO LOCK).',
            'Turn SWELL OFF to return FEEDBACK below HOLD and clear TEMPO LOCK.',
            'CAP is measured against the dry phrase: the RMS of the input above −50 dBFS since the last onset (after at least 1 s of quiet). With CAP set, the loop parks at that ceiling; it does not pump.',
            'TEMPO LOCK works without CAP switched on (it uses the CAP dB value, 0 dB if untouched). The swell is arranged to reach CAP on the downbeat after 1, 2 or 4 bars.',
            'RISE CURVE (Slow / Med / Fast) sets the end of the swell arc. At Slow, the loop reaches 1.7× the hold gain; Med reaches 2.6×; Fast reaches 4×.',
            'END CUT mutes the loop over 30 ms on press. END DUMP plays the last ~2 s of the loop backwards, once, then mutes. Both fire on press and re-arm after a new phrase (≥1 s silence then above −40 dBFS).',
            'FREEZE stops recording new input and holds the tape as it is, recirculating at the loop’s current level.',
          ],
        },
        { h3: 'Measured behaviour' },
        {
          list: [
            'CAP −3 dB on a DUB SPIRAL swell: the loop peaks at −3.05 dB; uncapped, the same loop reaches +15.6 dB.',
            'TEMPO LOCK 2 bars at 120 BPM: the loop reaches 95 % of CAP at 4.10 s against a 4.00 s downbeat.',
            'END CUT: the loop is silent below −60 dB within 50–150 ms of press.',
            'The FIRST REPEAT readout matches the measured level to 0.55 dB (limit 1.2 dB).',
          ],
        },
      ],
    },
    {
      id: 'tips',
      heading: 'Tips',
      blocks: [
        {
          list: [
            '**The sweet spot comes in the first 10–25 % of WET.** The knob is linear, but the musical range concentrates at the start: YANKI’s taper puts the wet-to-dry balance most sensitive where it sounds best. Move the knob slowly near the bottom.',
            '**SPREAD past 70 % moves more gently on single-head voicings (and HEADS 1).** The knob stays smooth, but the engine compresses above 70 % to keep the echo audible in mono. On stereo voicings (HEADS 2 or 3), SPREAD is linear across the full range.',
            '**Double-click a knob or handle to reset it.** A double-click returns it to its default.',
            '**For TEMPO LOCK the phrase must start on a bar line.** Start recording/playing on a downbeat. The loop reaches CAP on the downbeat that many bars later.',
            '**END CUT fires instantly; DUMP plays the tail backwards.** Both take a new phrase onset to re-arm (≥1 s silence, then above −40 dBFS). A momentary press fires; holding the key keeps it pressed until release.',
          ],
        },
      ],
    },
    {
      id: 'recipes',
      heading: 'Recipes',
      blocks: [
        {
          recipes: [
            {
              name: 'Plain vocal echo',
              settings: 'Preset: Eighth clean · MIX 20–25 % · TIME 1/4',
              text: 'A quarter-note echo that decays and darkens naturally. Leave FEEDBACK and TONE alone.',
            },
            {
              name: 'Swell that lands on the downbeat',
              settings: 'Preset: Swell four-bar arrival',
              text: 'Start the phrase on a bar line. Four bars later the loop reaches its ceiling on the downbeat. No adjustments needed; use as is.',
            },
            {
              name: 'Dub throw on the last word',
              settings: 'Preset: Swell build · END: DUMP',
              text: 'The loop swells and holds. Press END DUMP on the last word to play the tail backwards once and clear the loop for the next phrase.',
            },
            {
              name: 'Ping-pong slapback',
              settings: 'Preset: Dotted eighth wide · MIX 15–20 %',
              text: 'Three heads with hard stereo spread. The repeats bounce left-right-left. Adjust MIX to sit in the mix.',
            },
            {
              name: 'Hold a chord',
              settings: 'Any preset · FREEZE (hold key to momentary)',
              text: 'Freezes the tape as it is and recirculates the loop. Release to return to normal echo.',
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
              ['Latency', '0 samples'],
              ['Tape loop', '2 s nominal (6.2 s for divisions that need longer at low tempos); one record head, three cubic-interpolated playback heads at 1×, 2×, 3× TIME'],
              ['Sync divisions', '1/16, 1/8, 1/8 dotted, 1/4, 1/4 dotted, 1/2, FREE (50–700 ms ± 10 ms fine)'],
              ['Host BPM range', '20–400 BPM; falls back to 120 when the host gives none'],
              ['Wow / flutter', 'Slow wow plus faster flutter on the playback heads; roughly 1 to 2 ms of delay movement at WEAR 10, depending on the voicing'],
              ['Tone range', '1–8 kHz high-cut per pass; default 4.5 kHz'],
              ['Undo / redo', 'Cmd+Z / Cmd+Shift+Z (macOS); Ctrl+Z / Ctrl+Shift+Z or Ctrl+Y (Windows)'],
              ['Code signing', 'macOS installer signed with a Developer ID and notarised by Apple'],
            ],
          },
        },
        { h3: 'Measured validation (self-test, all checks pass)' },
        {
          list: [
            'Determinism: identical output bit-for-bit across runs.',
            'All 10 presets render bit-identical to the approved measured set (MD5-checked on vocal and pluck).',
            'MIX 0 is bit-exact dry pass-through.',
            'All presets stay finite at extreme settings; no NaN or clipping on test sources.',
            'The echo-field ring model’s decay prediction is within 4.5 % and first-repeat estimate within 0.55 dB of the real engine across all presets.',
            'HEADS parameter switch (1 / 2 / 3 heads) produces no audible step or click.',
            'SPREAD 100 % keeps the dry signal unchanged (0.0 dB) and the wet mono-sum loss ≤ 0.99 dB.',
          ],
        },
        { h3: 'Good to know' },
        {
          list: [
            'After you undo a preset the preset bar reads EDITED: the bar’s name is not part of the undo history, the settings are.',
            'Switching to a sync division that needs the longer 6.2 s tape (for example 1/2 below about 100 BPM), or back, keeps what is on the tape: the newest 2 s carry on ringing. Repeats further back than that start silent, as on a tape not yet recorded that far.',
          ],
        },
      ],
    },
    { id: 'download', heading: 'Getting YANKI', blocks: gettingIt(YANKI) },
  ],
};
