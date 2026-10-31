// TORNA owner's manual as a web page: /plugins/torna/manual.
// Source: 01_AI_Tools/subverselab-analog-eq/docs/manual/Torna_Manual.html (28 Oct 2026, TORNA 1.0.0; same text as
// public/plugins/torna/Torna_Manual.pdf), checked against the plug-in itself: Source/PluginProcessor.cpp (parameters, ranges,
// defaults, memories, LINK, user presets), Presets.h (factory presets), PluginEditor.cpp (keys, double-click, SIZE, REAR),
// CMakeLists.txt (Standalone + VST3 + AU on macOS, Standalone + VST3 on Windows) and STATUS.md (26-28 Oct measurements).
// Left out: the name of the hardware it models (the panel prints MODEL TR-83 and "a 1983 service schematic"), the parked
// reverb section, the PDF's CPU row (development machine) and "Getting the plugin" row (gettingIt() says it).

import { TORNA } from '../plugins.js';
import { installation, gettingIt, manualBase } from './common.js';

export const TORNA_MANUAL = {
  ...manualBase(TORNA, {
    subtitle: 'Graphic Equalizer · Spectrum Analyzer · Model TR-83',
    description: 'The TORNA owner’s manual: the twelve-band graphic equalizer and its spectrum analyzer, every control with its range and default, presets and memories, the rear plate, recipes for the mix bus and the master, installation on macOS and Windows and measured specifications.',
  }),
  sections: [
    {
      id: 'introduction',
      heading: 'What TORNA is',
      blocks: [
        { p: 'TORNA is a twelve-band graphic equalizer for each channel, with a spectrum analyzer in the middle. It is modelled part by part from a 1983 service schematic: the input stage, the twelve resonators of each channel, the slide pots and the way they are wired, the output stage and its supply rails, and the analyzer’s twelve filters, detectors and display ladder. It is built for the mix bus and the master bus.' },
        { note: 'The bands are broad, overlapping and work on each other, so a few sliders move the whole balance of a mix. What a parametric EQ does with ten numbers, TORNA does with a hand on the faders.' },
        { h3: 'Three steps' },
        {
          steps: [
            '**Insert TORNA on a bus or the master** and watch the analyzer: it reads the output.',
            '**Move the sliders.** LEFT and RIGHT are separate banks; press LINK to move them together, or start from a preset with ◀ PRESET ▶.',
            '**Press EQ IN/OUT to compare,** and trim the level with OUTPUT.',
          ],
        },
        { h3: 'Latency: 64 samples' },
        { p: 'TORNA runs inside at four times the session rate and reports 64 samples of latency to the host at every sample rate from 44.1 to 192 kHz. With EQ OUT and with POWER off the signal takes the same time, so the delay never changes.' },
      ],
    },
    {
      id: 'panel',
      heading: 'The panel',
      blocks: [
        {
          list: [
            '**LEFT bank:** twelve sliders, 16 Hz to 32 kHz, ±12 dB. The red window in each cap lights while EQ is IN.',
            '**Spectrum analyzer:** the LEFT and RIGHT keys choose which channel it reads, LEVEL sets its sensitivity; twelve band columns and TOTAL.',
            '**EQUALIZER GRAPHIC:** the true response of both channels, computed from the circuit as you move a slider (left bright, right thinner), with the moved slider’s value on its top line. Under it, the ◀ PRESET ▶ keys.',
            '**RIGHT bank:** the right channel’s twelve sliders.',
            '**Left key strip:** POWER, EQ IN/OUT, ATT −6 dB, NOR/REV, LINK.',
            '**INPUT and OUTPUT:** level before and after the equalizer, ±12 dB.',
            '**Right key strip:** MEMORY A, B, C; COPY L ▸ R, R ▸ L, FLAT; ANALYZER (reads OUT or IN); SIZE.',
            '**Footer:** ? opens short help over the panel; REAR turns the unit round to its rear plate; the SubverseLab mark opens subverselab.com.',
          ],
        },
        {
          list: [
            'Drag a slider up or down. Double-click a slider to return it to the preset or memory loaded last, or to 0 dB.',
            'When a preset, a memory, COPY or FLAT sets new values, the sliders glide there; the sound changes at once.',
            'Undo and redo: Cmd+Z / Cmd+Shift+Z on macOS; Ctrl+Z / Ctrl+Shift+Z or Ctrl+Y on Windows. A preset, a memory, COPY or FLAT is one undo step.',
            'SIZE switches the window between 75 % and 100 %; the ? help opens over the panel and never makes the window taller.',
          ],
        },
      ],
    },
    {
      id: 'controls',
      heading: 'The controls',
      blocks: [
        {
          table: {
            head: ['Control', 'Range · default', 'What it does'],
            rows: [
              ['Sliders 16 Hz … 32 kHz', '−12 to +12 dB · 0 dB', 'The panel marks, in 0.1 dB steps. The ends are the pots’ ends; a mark in between gives that share of the end’s gain at the band’s centre. The sliders work on each other, as on the circuit they come from.'],
              ['POWER', 'On / off · on', 'Off passes the signal untouched, with the same 64 samples of delay.'],
              ['EQ IN/OUT', 'In / out · in', 'Out takes the equalizer out of the path; every cap light goes dark. The change is a short crossfade, so it does not click.'],
              ['ATT −6 dB', 'Off / on · off', 'The input attenuator: −5.65 dB, flat. Use it when a hot bus drives the output stage into its rails.'],
              ['NOR/REV', 'NOR / REV · NOR', 'Reverses the curve: every boost becomes the matching cut and back. The REVERSE lamp lights.'],
              ['LINK', 'Off / on · off', 'On: the right bank takes the left bank’s settings and the two move together.'],
              ['INPUT', '−12 to +12 dB · 0 dB', 'Level into the equalizer.'],
              ['OUTPUT', '−12 to +12 dB · 0 dB', 'Level after the equalizer.'],
              ['LEVEL (analyzer)', 'LOW to HIGH', 'The band columns’ sensitivity. It changes the display only, never the sound.'],
              ['LEFT · RIGHT (analyzer)', 'On / off · both on', 'Which channel the analyzer reads; with both pressed it reads both together.'],
              ['ANALYZER', 'OUT / IN · OUT', 'Read the signal after the equalizer (OUT) or before it (IN).'],
              ['MEMORY A · B · C', '—', 'Press to recall all 24 sliders; hold for one second to store the current ones (pressing an empty memory stores too). The memories are saved with the project.'],
              ['COPY L ▸ R · R ▸ L · FLAT', '—', 'Copy one bank to the other, or return every slider to 0 dB.'],
              ['◀ PRESET ▶', '—', 'Step through the factory presets, then your own. Hold ▶ for one second to save the 24 sliders as a user preset.'],
              ['SIZE', '75 % / 100 % · 75 %', 'Window size.'],
            ],
          },
        },
      ],
    },
    {
      id: 'presets',
      heading: 'Presets and memories',
      blocks: [
        { p: 'A preset sets all 24 sliders, the same on both banks; the sliders glide to their new places and the preset’s name shows in the top line of the EQUALIZER GRAPHIC. The bands overlap, so the real curve in the graphic can rise above the slider marks.' },
        { p: 'Factory presets: FLAT, MASTER SMILE, MASTER GENTLE, MIX BUS CLEAN, LOW END WEIGHT, VOCAL PRESENCE, DRUM BUS, AIR, LOUDNESS, BRIGHT HI-FI, WARM, RADIO.' },
        { h3: 'Your own presets' },
        { p: 'Hold ▶ for one second: the current sliders are saved as USER 01, USER 02 and so on, and the graphic reads SAVED with the name. User presets come after the factory ones and are shared by every project. They are files in `~/Library/SubverseLab/TORNA/Presets` on macOS and `%APPDATA%\\SubverseLab\\TORNA\\Presets` on Windows; to delete one, delete its file there.' },
        { h3: 'Memories' },
        { p: 'MEMORY A, B and C hold three settings of all 24 sliders inside the project, for comparing versions of a mix: hold a key for one second to store, press it to recall.' },
      ],
    },
    {
      id: 'analyzer',
      heading: 'The spectrum analyzer',
      blocks: [
        { p: 'Twelve band-pass filters with a Q of about 10, one per slider, each followed by a peak detector and read in turn by the display. The ten segments are marked −24, −18, −15, −12, −9, −6, −3, 0, +3 and +6; from −18 to 0 each segment lights within 0.3 dB of its mark. A column falls back with a time constant of about a quarter of a second.' },
        {
          list: [
            '**TOTAL** is the whole signal, unfiltered, and LEVEL does not move it: it shows the bus’s level, not its balance.',
            '**LEVEL** sets the band columns’ sensitivity. Set it so the loudest columns of your mix reach 0 at its loudest passage.',
            'The 32 kHz column reads what lies above the audible band. At 44.1 and 48 kHz there is little there, and it mostly stays dark.',
            'The analyzer only draws: LEVEL, LEFT, RIGHT and ANALYZER never change the sound.',
          ],
        },
      ],
    },
    {
      id: 'rear',
      heading: 'The rear plate',
      blocks: [
        { p: 'The REAR key in the footer turns the unit round; FRONT turns it back. The window keeps its size. Two slide switches work:' },
        {
          table: {
            head: ['Switch', 'Positions · default', 'What it does'],
            rows: [
              ['LINE LEVEL', '1 V / 2 V / 4 V · 2 V', 'What 0 dBFS means in volts at the input. The circuit is linear up to its rails, so this only moves the point where the output stage clips: +19, +13 or +7 dB above full scale. Below that point the sound is the same in every position.'],
              ['CAP LIGHTS', 'ON / DIM / OFF · ON', 'The red lights in the slider caps. Panel only; saved with the project.'],
            ],
          },
        },
      ],
    },
    {
      id: 'recipes',
      heading: 'Recipes',
      blocks: [
        {
          recipes: [
            { name: 'Master: the eighties smile', settings: '16 Hz → 32 kHz: +3, +4, +3, +1, −1, −2, −2, −1, +1, +3, +4, +3', text: 'Low end and top lifted, the middle eased. Trim OUTPUT so EQ IN and EQ OUT are equally loud before you judge it.' },
            { name: 'Mix bus: less mud', settings: '125 Hz −2 · 250 Hz −3 · 4 kHz +1.5', text: 'The broad low-mid bands take out the boxy part of a dense mix without thinning the bass.' },
            { name: 'Vocal bus: presence', settings: '125 Hz −3 · 250 Hz −2 · 2 kHz +2 · 4 kHz +4 · 8 kHz +2', text: 'The low mids eased under the voice, the presence range lifted.' },
            { name: 'Drum bus: body, less box', settings: '63 Hz +6 · 125 Hz +2 · 500 Hz −4 · 4 kHz +3 · 8 kHz +2', text: 'Weight at 63 Hz, the boxy 500 Hz band down, the attack range lifted.' },
            { name: 'Finding a problem band', settings: 'One slider to +12, NOR/REV to compare', text: 'Push a slider up to hear where a resonance lives, then press NOR/REV: the same slider now cuts by the same amount.' },
          ],
        },
      ],
    },
    {
      id: 'installation',
      heading: 'Installation',
      blocks: installation('TORNA', {
        standalone: true,
        winStandalone: true,
        macSteps: [
          'Run the installer package (`.pkg`) you downloaded. It is signed with a Developer ID and notarised by Apple, so macOS opens it without any extra step.',
          'Choose what to install: the VST3 plug-in (`/Library/Audio/Plug-Ins/VST3/TORNA.vst3`), the Audio Unit (`/Library/Audio/Plug-Ins/Components/TORNA.component`) and the standalone app (`/Applications/TORNA.app`).',
          'Restart your DAW, or make it rescan its plug-in list.',
        ],
        winSteps: [
          'If Windows blocks the downloaded files: right-click the zip, choose **Properties**, tick **Unblock**, then extract.',
          'Copy the `.vst3` folder to `C:\\Program Files\\Common Files\\VST3\\`.',
          'Put the standalone app (`TORNA.exe`) in any folder you like and start it from there.',
          'Rescan plug-ins in your DAW.',
        ],
        extra: [
          { p: 'Channel layouts: mono to mono, stereo to stereo. On a mono track the LEFT bank shapes the signal.' },
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
              ['Bands', '12 per channel: 16, 32, 63, 125, 250, 500 Hz, 1, 2, 4, 8, 16, 32 kHz; ±12 dB at the slider ends'],
              ['Latency', '64 samples at every sample rate, reported to the host'],
              ['Sample rates', '44.1 to 192 kHz; the curve stays within 0.2 dB of the circuit model at every rate'],
              ['At flat', '−0.18 dB at 1 kHz, 0.14 dB of ripple from 20 Hz to 20 kHz: the circuit’s own; OUTPUT trims it'],
              ['EQ OUT', 'Within 0.002 dB of the input from 20 Hz to 20 kHz at 44.1, 48 and 96 kHz'],
              ['Output stage', 'Clips like the circuit’s ±13.3 V rails, about 13 dB above full scale at LINE LEVEL 2 V; the clip is anti-aliased (inharmonic products 78 dB below the signal)'],
              ['Switches', 'EQ IN/OUT, NOR/REV and ATT change without a click (residue 65–84 dB below the signal)'],
              ['DC', 'Removed at the input, as by the circuit’s coupling capacitors'],
              ['Analyzer', '12 band-pass filters (Q ≈ 10) and TOTAL, 10 segments −24 … +6, fall time constant 0.26 s'],
              ['Undo / redo', 'Cmd+Z / Cmd+Shift+Z (macOS); Ctrl+Z / Ctrl+Shift+Z or Ctrl+Y (Windows)'],
              ['State saved', 'With the project file, memories included; parameters can be automated'],
              ['Code signing', 'macOS installer signed with a Developer ID and notarised by Apple'],
            ],
          },
        },
      ],
    },
    { id: 'download', heading: 'Getting TORNA', blocks: gettingIt(TORNA) },
  ],
};
