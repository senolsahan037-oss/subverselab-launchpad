// MIHENK owner's manual as a web page: /plugins/mihenk/manual.
// Source: 01_AI_Tools/subverselab-mihenk/docs/manual/Mihenk_Manual.html (13 Oct 2026, MIHENK 1.0.2, the version the site
// sells; same text as public/plugins/mihenk/Mihenk_Manual.pdf). Checked against subverselab-mihenk/STATUS.md (1.0.2 released
// 12 Oct: type-in values, double-click = the parameter default; fixed latency 15926 samples / 332 ms at 48 kHz, as the manual says).
// Left out: the "Download: sign in at subverselab.com/launch" and "License" rows (the download and licence sentence come from
// gettingIt()), the version row, the footer slogan, "Windows 10" (written as Windows, 64-bit). Not in the manual and so not
// here: the SIMPLE face's macro knobs and the command-line / JSON access that plugins.js mentions.

import { MIHENK } from '../plugins.js';
import { installation, gettingIt, manualBase } from './common.js';

export const MIHENK_MANUAL = {
  ...manualBase(MIHENK, {
    subtitle: 'Digital Mastering Processor · Model MH-86',
    description: 'The MIHENK owner’s manual: the three-step flow, the panel, how MIHENK decides, every control with its range and default, MIHENK in your DAW, targets, reports, the personal profile, installation on macOS and Windows and specifications.',
  }),
  sections: [
    {
      id: 'introduction',
      heading: 'What MIHENK is',
      blocks: [
        { p: 'MIHENK is a mastering application. Load a finished mix, choose a loudness target, and MIHENK brings it there with EQ, glue compression, stereo control, and a true-peak limiter. Three ideas run through it.' },
        {
          list: [
            '**Transparent** — the chain is built to leave the mix as it is: neutral settings are bit-exact, the EQ is a linear-phase or minimum-phase FIR filter, and the limiter looks ahead instead of clipping. Finished masters skip processing entirely.',
            '**Measured** — loudness follows ITU-R BS.1770-4 (K-weighting and gating), EBU Tech 3341 and 3342; true peak is read with a 4x oversampled meter and limited with an 8x detector. Numbers on the panel are measured on the rendered samples, not estimated. Limiter cost is shown in dB: average gain reduction, severity, and what it means.',
            '**Decisive** — MIHENK reads your mix and lists what it finds (DC offset, over-compression, clipping risk, frequency imbalances). CHARACTER FULL applies them; OFF and GENTLE are minimal. The status tells you what the master is and why.',
          ],
        },
        { p: 'MIHENK is one product in three forms: a standalone app, a VST3 plug-in and an Audio Unit plug-in on macOS, and a standalone app and a VST3 plug-in on Windows, all the same engine and the same panel.' },
      ],
    },
    {
      id: 'flow',
      heading: 'The three-step flow',
      blocks: [
        {
          steps: [
            '**Load.** Drag a WAV or AIFF file (mono or stereo) onto the left half of the panel, or press **OPEN**. MIHENK measures the file once and fills in the INPUT column and diagnosis. The waveform appears.',
            '**Choose intent.** Pick a target (STREAM -14, APPLE -16, CLUB -8, KEEP INPUT, ALBUM, or turn the TARGET knob for a custom value). The SIMPLE face shows it in plain words: what the plan does, in dB and limiter cost. Press **PLAY** and use **A / B** to listen; A is level-matched to B so comparison is fair.',
            '**Export.** Choose 24-BIT or 16-BIT and press **EXPORT**. MIHENK writes `<name>_MIHENK.wav` and a report next to it, `<name>_MIHENK.mihenk.txt`.',
          ],
        },
        { p: 'The SIMPLE face (target, character, and the delivery pair) is the default. ADVANCED shows every stage with override rings. This flow is for the standalone app; inside a DAW, see In your DAW below.' },
      ],
    },
    {
      id: 'panel',
      heading: 'Panel tour',
      blocks: [
        { p: 'The ADVANCED face, part by part:' },
        {
          list: [
            '**Header display** — source file, measured loudness, what the plan does (trim, stages applied, limiter cost), and warnings, in plain words.',
            '**Transport keys** — OPEN, REF, PLAY, STOP, LOOP, A/B, EXPORT, BATCH, AUDIO.',
            '**CRT scope** — the WAVE, SPECTRUM and LOUDNESS views. Drag on the overview to set a loop region.',
            '**Measurement table** — INPUT and OUTPUT columns: integrated, short-term max, momentary max, loudness range, true peak, sample peak, RMS, crest factor, correlation.',
            '**Diagnosis** — what MIHENK found in the mix (for reference when CHARACTER is FULL).',
            '**Target and character block** — target keys (STREAM −14, APPLE −16, CLUB −8, KEEP INPUT, ALBUM, CUSTOM), CHARACTER (OFF / GENTLE / FULL), and the plan readout in dB.',
            '**Stages** — INPUT, EQUALIZER, COMPRESSOR, STEREO / LOW END, LIMITER, REFERENCE. In ADVANCED each stage shows its plan and override ring (if adjusted).',
            '**Meters** — live IN, L, R, M, C and LIMIT meters with true-peak and loudness read-outs.',
          ],
        },
        { h3: 'Scope views' },
        {
          list: [
            '**WAVE** — the scrolling waveform with the compressor (teal) and limiter (gold) gain reduction, and a whole-track overview. Drag on the overview to set a loop region.',
            '**SPECTRUM** — whole-track or live spectrum in 1/6 octave, level-aligned, input dimmed against output, with the EQ curve below.',
            '**LOUDNESS** — live momentary and short-term loudness against the target.',
            '**LAYERS** — IN, EQ, COMP and OUT switch the drawn layers on and off. They change the display only.',
          ],
        },
      ],
    },
    {
      id: 'how-it-decides',
      heading: 'How MIHENK decides',
      blocks: [
        { p: 'MIHENK follows a simple rule: **master = f(measurements, intent)**. The same file with the same intent always produces the same master, in any order of button clicks.' },
        { h3: 'Measurements' },
        { p: 'When you load a file, MIHENK measures it once: loudness (integrated, short-term, momentary), true peak, spectrum, dynamics (crest, range), correlation, and what it found (DC offset, over-compression, clipping risk, presence peaks). These measurements are frozen and never change. In the DAW plug-in, a LEARN button lets you measure without loading audio.' },
        { h3: 'Intent' },
        { p: 'Buttons change your intent: target (STREAM −14, APPLE −16, CLUB −8, KEEP INPUT, ALBUM, or custom), character (OFF, GENTLE, FULL), optional reference master, and overrides (if you adjust a knob in ADVANCED). Nothing else is stored. Load a preset, bypass/un-bypass, or change the target ten times: the master is recomputed from measurements + intent every time, and you always get the same result.' },
        { h3: 'The plan' },
        { p: 'From measurements + intent, MIHENK computes a plan: what trim, EQ, compression, and limiter drive it will apply to reach the target. Knobs display the plan. In ADVANCED mode, if you adjust a knob, a gold ring shows the delta over the plan (e.g., “+1.2 dB over plan”). Press RESET OVERRIDES to clear deltas and trust the plan again.' },
        { h3: 'Finished masters' },
        { p: 'If your mix is already compressed, loud, and dynamic (peaks near −3 dBFS, loudness close to the target), MIHENK skips stages and applies level and ceiling only. The status says why. CHARACTER setting is ignored; the mix is treated as finished.' },
      ],
    },
    {
      id: 'controls',
      heading: 'Controls',
      blocks: [
        { h3: 'Keys and switches' },
        { p: 'OPEN, PLAY, STOP, LOOP, EXPORT, BATCH and AUDIO belong to the standalone app. The plug-in has LEARN, A/B and REF in their place (see In your DAW).' },
        {
          table: {
            head: ['Control', 'Range / default', 'What it does'],
            rows: [
              ['OPEN', 'key (app)', 'Loads the source (WAV / AIFF, mono or stereo). Dropping a file on the left half does the same.'],
              ['REF', 'key', 'Loads a reference master (drop on the right half also works). Shows the REFERENCE module controls.'],
              ['PLAY / STOP / LOOP', 'keys', 'Transport. Space bar toggles play. LOOP loops the region set on the overview.'],
              ['A / B', 'toggle · B', 'A is the original input, B the master. Both are level-matched for fair comparison.'],
              ['EXPORT', 'key', 'Renders and writes the master and its report. Disabled while the RENDER lamp is lit.'],
              ['24-BIT / 16-BIT', 'toggle · 24', 'Export bit depth. 24-bit is rounded, no dither; 16-bit uses TPDF dither.'],
              ['BATCH', 'key', 'Opens the batch / album panel: drop several files or a folder, choose ALBUM mode, output folder, START / CANCEL.'],
              ['AUDIO', 'key', 'Opens the audio-device settings.'],
              ['BYPASS', 'toggle · off', 'Instant level-matched A/B switch. Plays the rendered buffers as they were without re-solving or re-rendering.'],
              ['SIMPLE / ADVANCED', 'face', 'Switches the panel face; the setting is remembered. SIMPLE is the default.'],
              ['SAVE / LOAD / DELETE', 'preset keys', 'Saves and loads `.mihenkpreset` files; factory presets are read-only.'],
            ],
          },
        },
        { h3: 'Target and character' },
        {
          table: {
            head: ['Control', 'Range / default', 'What it does'],
            rows: [
              ['TARGET', '−30 to −4 LUFS · −14', 'Loudness target for CUSTOM mode. Turning it selects CUSTOM and sets the value; the master reaches this loudness within ±0.2 LU.'],
              ['STREAM -14 / APPLE -16 / CLUB -8 / KEEP INPUT / ALBUM / CUSTOM', 'keys · STREAM -14', 'Target presets. STREAM/APPLE/CLUB/CUSTOM are reached by trim and the limiter. KEEP INPUT holds the source’s own loudness (never louder). ALBUM sets equal loudness across tracks.'],
              ['CHARACTER', 'OFF / GENTLE / FULL · OFF', 'OFF (default): level and ceiling only. GENTLE: adds broadband glue ≤1 dB and air boost ≤1.5 dB. FULL: applies EQ and compression from the diagnosis. Finished masters always use level-only regardless.'],
            ],
          },
        },
        { h3: 'Input' },
        {
          table: {
            head: ['Control', 'Range / default', 'What it does'],
            rows: [
              ['TRIM', '±24 dB · 0', 'Pre-gain. Its AUTO lamp (headroom assistant) solves the trim from the mix; turning the knob takes over.'],
              ['BALANCE', '±3 dB · 0', 'Left/right balance.'],
              ['DC FILTER', 'switch', 'Removes DC offset.'],
            ],
          },
        },
        { h3: 'Equalizer' },
        {
          table: {
            head: ['Control', 'Range / default', 'What it does'],
            rows: [
              ['IN / LOW CUT / 24 DB / LINEAR', 'switches', 'EQ in/out, low-cut on/off, 24 dB or 12 dB slope, linear or minimum phase.'],
              ['LOW CUT', '10–200 Hz · 25', 'High-pass frequency.'],
              ['LOW SHELF / SHELF FREQ', '±6 dB · 0 / 30–400 Hz', 'Low shelf gain and frequency.'],
              ['BELL 1 / FREQ / Q', '±8 dB · 40–16000 Hz · Q 0.3–6', 'First bell.'],
              ['BELL 2 / FREQ / Q', '±8 dB · 40–16000 Hz · Q 0.3–6', 'Second bell.'],
              ['TILT', '±1.5 dB/oct · 0', 'Spectral tilt around the mid range.'],
              ['HIGH SHELF / SHELF FREQ', '±6 dB · 0 / 2–16 kHz', 'High shelf.'],
              ['AIR / AIR DYN / DE-HARSH', '0–6 dB · DE-HARSH 0–8 dB', 'Top-end air shelf; AIR DYN makes it follow the material and DE-HARSH sets how far it backs off.'],
              ['AIR FREQ', '4-position switch: 10 / 15 / 20 / 40 kHz', 'Where the air shelf sits. Drag in four equal steps, or click the value for the next step. It does nothing while AIR is at 0 dB, so it is dimmed and reads “SET AIR” until AIR is raised.'],
              ['LOW-MID DYN, UPPER-MID DYN, TIGHTEN', 'switches + FREQ / CUT', 'Three dynamic bands: they cut only while the band is over its threshold, up to the CUT amount (0–4 dB).'],
            ],
          },
        },
        { h3: 'Compressor' },
        {
          table: {
            head: ['Control', 'Range / default', 'What it does'],
            rows: [
              ['IN / 3-BAND', 'switches', 'Compressor on/off; WIDE (one band) or 3-BAND (BAND caps pick low, mid, high; SOLO and BYPASS per band; crossovers).'],
              ['GLUE', '0–4 dB · 1.2', 'How much gain reduction the loud part gets. Setting it re-solves AUTO threshold. In the plug-in it acts after LEARN.'],
              ['THRESHOLD', '−60 to 0 dBFS · AUTO', 'Solved from the mix by default; turning it switches AUTO off.'],
              ['RATIO / ATTACK / RELEASE', '1–8:1 · 1–200 ms · 20–1500 ms', 'Standard compressor timing. RELEASE has an AUTO (program-dependent) lamp.'],
              ['SC HPF / RMS-PEAK / KNEE / MIX', '20–300 Hz / 0–100 % / 0–12 dB / 0–100 %', 'Sidechain high-pass, detector blend, knee, parallel mix.'],
              ['XOVER LOW / HIGH', '3-BAND only', 'Band crossover frequencies.'],
            ],
          },
        },
        { h3: 'Stereo / low end' },
        {
          table: {
            head: ['Control', 'Range / default', 'What it does'],
            rows: [
              ['WIDTH / HIGH WIDTH / HIGH FROM', '0–200 % · 100', 'Overall width, and a separate width above the HIGH FROM frequency.'],
              ['MONO BELOW / PHASE-SAFE', 'OFF–300 Hz', 'Sums everything below the frequency to mono with a zero-phase split.'],
            ],
          },
        },
        { h3: 'Limiter' },
        {
          table: {
            head: ['Control', 'Range / default', 'What it does'],
            rows: [
              ['DRIVE', '−24 to +36 dB · AUTO', 'Gain into the limiter. Set from the measurements to reach the target. In ADVANCED, drag to override (shown as a delta over the plan).'],
              ['CEILING', '−3 to −0.1 dBTP · −1', 'True-peak hard ceiling. Tone matching and EQ operate under it; the limiter ensures no sample exceeds it.'],
              ['RELEASE / LOOK-AHEAD', '10–1000 ms / 0.5–5 ms', 'Limiter timing. Higher release (faster return to gain) is faster but can overshoot; look-ahead is how much the limiter reads ahead to catch peaks.'],
            ],
          },
        },
        { h3: 'Reference' },
        {
          table: {
            head: ['Control', 'Range / default', 'What it does'],
            rows: [
              ['MATCH TO REFERENCE', 'key', 'Applies a tone-match curve and the reference’s loudness as the target.'],
              ['TONE AMOUNT / SMOOTH', '0–100 % / 0.33–3 oct', 'How much of the curve is applied, and how smooth it is.'],
              ['CLEAR', 'key', 'Removes the reference.'],
            ],
          },
        },
        { h3: 'Controls that are dimmed, and why' },
        {
          list: [
            'A frequency or Q knob is dimmed while its band’s gain is 0, because it can do nothing then (SHELF FREQ, BELL 1 and BELL 2 FREQ and Q).',
            'EQ, compressor, stereo and reference knobs are dimmed on a finished master: the plan refuses them there (“Finished master: not applied”), so they would do nothing.',
            'A knob you turn by hand is yours: TRIM and DRIVE set by hand are not pulled back to the plan, and an IN switch you turn off stays off.',
          ],
        },
        { h3: 'Undo and redo' },
        {
          list: [
            '**App:** Edit menu (Undo / Redo, with the name of the step), Cmd+Z and Cmd+Shift+Z on macOS; on Windows Ctrl+Z, and Ctrl+Y or Ctrl+Shift+Z for redo. While you type in a value box, the key goes to the box.',
            'One step is one change of your intent: a knob drag (however long), a target, a character, a ceiling, a preset, a reference, MATCH TO REFERENCE, RESET OVERRIDES, RESET ALL. Undo puts the intent back and MIHENK solves the master again from the same measurements, so the result is exactly the earlier one.',
            'Loading a new file (or a LEARN, or restoring a project) starts a new history, because the old steps belong to other measurements. In the batch panel the mode toggles and STORE PANEL SETTINGS can be undone; adding and removing queue entries cannot.',
            '**Plug-in:** the parameters your DAW owns (target, ceiling, every override) are undone by the DAW’s own undo. MIHENK’s Cmd+Z / Ctrl+Z takes back what the host does not own: CHARACTER, the reference and tone match, and profile locks. With nothing of its own to undo, MIHENK passes the key on to the DAW. Click the panel first so it has the keyboard.',
          ],
        },
      ],
    },
    {
      id: 'daw',
      heading: 'In your DAW',
      blocks: [
        {
          list: [
            '**Insert it last** on the master (or on the bus you want to master).',
            '**Press LEARN** and play the song once from the start. The key reads LEARN ARMED, then LISTENING while the host plays. Stop the host (or press LEARN again) to solve; capture also ends after 20 minutes. Less than a second of audio learns nothing.',
            '**MIHENK measures what it heard**, diagnoses it and solves the AUTO values and the target for the whole song, then runs the chain in real time. While the learned audio is in memory every change re-solves, as in the app. If you reopen a project and change settings, the display reads SETTINGS CHANGED: LEARN AGAIN TO RE-SOLVE.',
            '**A / B** compares the input (delayed like the output) with the master, level-matched.',
            '**Before LEARN**, TARGET, TARGET LUFS, TARGET LOCK, AUTO TRIM and GLUE do nothing in the plug-in: the level is untouched and only the −1 dBTP limiter runs. They act after LEARN.',
            '**Latency** is reported to the host and shown on the panel. It is one fixed number: every delaying stage is always in the path (a switched-out stage passes its input with the same delay), so switching a stage never moves the timing and never clicks. Measured at 48 kHz: 15926 samples, 332 ms, in every setting. Use plug-in delay compensation; for live monitoring, bypass MIHENK in the host while you record.',
            '**Automation:** the stage controls are automatable parameters. A knob drag is one automation gesture.',
            '**Saving:** the project stores the parameters and what LEARN found (plan, measurements, diagnosis), not audio. Presets are the same `.mihenkpreset` files as in the app.',
          ],
        },
      ],
    },
    {
      id: 'targets',
      heading: 'Targets',
      blocks: [
        {
          table: {
            head: ['Key', 'Integrated loudness', 'Limiter cost', 'Use'],
            rows: [
              ['STREAM -14', '−14 LUFS', 'shown in status', 'Streaming services that normalise around −14 (default).'],
              ['APPLE -16', '−16 LUFS', 'shown in status', 'Quieter, more dynamic delivery (Apple-style normalisation).'],
              ['CLUB -8', '−8 LUFS', 'shown in status', 'Loud club master. The limiter cost is shown in dB; expect more processing on the loudest peaks.'],
              ['CUSTOM', 'any −30 to −4', 'shown in status', 'Turn the TARGET knob to set any value. No dedicated key needed for −11, −9.5, etc.'],
              ['KEEP INPUT', 'the source’s own', 'none (if applied)', 'Applies the chain without changing loudness; never louder than the mix.'],
              ['ALBUM', 'per track (relative offsets)', 'per track, shown in batch', 'Equal loudness across multiple tracks. Each reaches its place within the album; loudest track sets the bar.'],
            ],
          },
        },
        { p: 'The target is reached within ±0.2 LU by trim and the limiter. The status bar shows the limiter’s cost in dB: average GR ≤2 dB is fine; 2–4 dB warns; >4 dB strongly warns (but the target is still reached). The true-peak ceiling always holds.' },
      ],
    },
    {
      id: 'reports',
      heading: 'Reports',
      blocks: [
        { p: 'Every export writes a plain-text report beside the WAV (`.mihenk.txt`). It contains the date, source and master names, the format, a table of INPUT and OUTPUT measurements (integrated, short-term max, momentary max, loudness range, true peak, sample peak, RMS, crest, correlation), the target and ceiling, the loudness story, the trim, EQ, compressor, stereo and limiter settings (drive, gain reduction max / mean, active time), any warnings, and the method cited (BS.1770-4, Tech 3341 / 3342, 4x true peak). Values are measured on the exported samples before quantisation. Batch runs add `MIHENK_batch_report.csv` and `.json`.' },
      ],
    },
    {
      id: 'profile',
      heading: 'Personal profile',
      blocks: [
        { p: 'Opt-in, and stored on this computer.' },
        {
          list: [
            '**Off by default.** Turn PERSONAL PROFILE on in the profile panel (NOTE key).',
            '**Listening notes:** after a master, pick quick tags (top too harsh, not enough air, low end loose, vocal buried, too squashed, too wide, perfect) and add free text if you like. Each note is saved with the measurements, the settings and the result.',
            '**What it learns:** plain statistics from your notes on similar tracks. A setting is only proposed after at least three notes that agree; notes that disagree lock nothing.',
            '**Locks:** a learned value appears as a locked knob with a small padlock and the reason (“Locked from 4 of your notes on similar tracks”). Locks are overrides on top of the plan: click the padlock or turn the knob to release it.',
            '**Your data:** notes stay in `~/Library/Application Support/SubverseLab/MIHENK/Profile/`. Delete single rules, reset all, export or import from the panel.',
          ],
        },
      ],
    },
    {
      id: 'scope',
      heading: 'Scope and limits',
      blocks: [
        {
          list: [
            '**Input and output:** WAV or AIFF, mono or stereo. Export: WAV, 24-bit or 16-bit.',
            '**Loudness:** MIHENK reaches a target by solving trim and limiter drive from the measurements. It does not ask you to raise the mix; the target is reached within ±0.2 LU, and if even the limiter cannot get there the status line says so.',
            '**Finished masters:** If the input is already compressed, loud, and dynamic (peak loudness close to −3 dBFS, integrated loudness within 3 LU of the target), MIHENK applies level and ceiling only, regardless of CHARACTER setting. The status says why.',
            '**Tone matching:** does not model the compressor’s and limiter’s own spectral effect; matching is applied before stages.',
            '**ALBUM offsets:** half the loudness distance between each track and the loudest, capped at 3 LU per track. A brick-walled outlier pulls the rest down; this is the intended rule.',
            '**Platform:** macOS 11 or later (Apple Silicon and Intel, universal): standalone app, VST3 and Audio Unit. Windows (64-bit): standalone app (`MIHENK.exe`) and VST3.',
          ],
        },
      ],
    },
    {
      id: 'installation',
      heading: 'Installation',
      blocks: installation('MIHENK', {
        standalone: true,
        winStandalone: true,
        macSteps: [
          'Run the installer package (`.pkg`) you downloaded. It is signed with a Developer ID and notarised by Apple.',
          'Choose what to install: the VST3 (`/Library/Audio/Plug-Ins/VST3/MIHENK.vst3`), the Audio Unit (`/Library/Audio/Plug-Ins/Components/MIHENK.component`) and the standalone app (`/Applications/MIHENK.app`).',
          'Restart your DAW or rescan.',
        ],
        winSteps: [
          'If Windows blocks the downloaded files: right-click the zip, choose **Properties**, tick **Unblock**, then extract.',
          'Copy `MIHENK.vst3` to `C:\\Program Files\\Common Files\\VST3\\`.',
          'The standalone app is `MIHENK.exe` in the zip.',
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
              ['Formats', 'macOS 11 or later (Apple Silicon and Intel, universal): standalone app, VST3, AU · Windows (64-bit): standalone app and VST3'],
              ['Files', 'Input WAV or AIFF, mono or stereo; export WAV, 24-bit (rounded) or 16-bit (TPDF dither)'],
              ['Loudness', 'ITU-R BS.1770-4, EBU Tech 3341 and 3342; targets −30 to −4 LUFS, reached within ±0.2 LU'],
              ['True peak', '4x oversampled meter; limited with an 8x detector; ceiling −3 to −0.1 dBTP'],
              ['Latency (plug-in)', '15926 samples, 332 ms at 48 kHz, in every setting; reported to the host'],
              ['Undo / redo', 'Cmd+Z / Cmd+Shift+Z (macOS); Ctrl+Z, and Ctrl+Y or Ctrl+Shift+Z (Windows)'],
              ['State', 'Saved with the DAW project (parameters and what LEARN found, not audio); stage controls can be automated'],
            ],
          },
        },
      ],
    },
    { id: 'download', heading: 'Getting MIHENK', blocks: gettingIt(MIHENK) },
  ],
};
