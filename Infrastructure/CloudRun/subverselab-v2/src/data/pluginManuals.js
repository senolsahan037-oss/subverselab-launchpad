// The owner's manuals as web pages: /plugins/kubbe/manual, /plugins/kaset/manual.
//
// Shared by PluginManualPage.jsx and scripts/prerender.js (plain Node), like
// plugins.js, so the crawler and the visitor read the same words.
//
// Source: the manuals in the plugins' own repositories
// (01_AI_Tools/subverselab-reverb/docs/manual/Kubbe_Manual.html,
// 01_AI_Tools/subverselab-kaset/docs/manual/Kaset_Manual.html). The licence
// section is taken from subverselab-plugin-common/Licensing/License.h and
// LicenseOverlay.h. Kubbe is algorithmic: nothing in it is recorded or
// measured from a real place, and the manual's older "built from three real
// places" wording is not repeated here.
//
// Text may use `code` and **bold**; both renderers understand only those two.
// Block types: { p }, { list }, { steps }, { table: { head, rows } },
// { note }, { recipes: [{ name, settings, text }] }, { h3 }.

import { KUBBE, KASET, LICENCE_FACTS } from './plugins.js';

const installation = (name, { standalone = false } = {}) => [
  {
    p: standalone
      ? `${name} installs as an Audio Unit (AU) and a VST3 plug-in on macOS (Apple Silicon and Intel), and also runs there as a Standalone application. On Windows (64-bit) it installs as a VST3 plug-in.`
      : `${name} installs as an Audio Unit (AU) and a VST3 plug-in on macOS (Apple Silicon and Intel). On Windows (64-bit) it installs as a VST3 plug-in.`,
  },
  { h3: 'macOS' },
  {
    steps: [
      'Copy the `.component` (AU) into `~/Library/Audio/Plug-Ins/Components/`, or the `.vst3` into `~/Library/Audio/Plug-Ins/VST3/`.',
      'Restart your DAW, or make it rescan its plug-in list.',
    ],
  },
  { h3: 'macOS — first launch' },
  {
    p: `This build is not yet code-signed or notarised, so macOS Gatekeeper refuses to open it on a first double-click. To get past that once: in Finder, right-click (or Control-click) the plug-in${standalone ? ' or the Standalone app' : ''} and choose **Open**, then confirm **Open** in the dialog that follows. macOS remembers the choice for that file.`,
  },
  { h3: 'Windows' },
  {
    steps: [
      'If Windows blocks the downloaded files: right-click the zip, choose **Properties**, tick **Unblock**, then extract.',
      'Copy the `.vst3` folder to `C:\\Program Files\\Common Files\\VST3\\`.',
      'Rescan plug-ins in your DAW.',
    ],
  },
];

const licence = (name) => [
  { p: LICENCE_FACTS.noDemo },
  { h3: 'Activate' },
  {
    steps: [
      'After checkout, Lemon Squeezy e-mails the licence key; a free launch licence is claimed on subverselab.com/launch. Signed in here with the same e-mail, the key is also under My plugins on your account page.',
      `Open ${name} in your DAW. The activation card covers the panel.`,
      'Paste the key and press **Activate**. This needs an internet connection once.',
    ],
  },
  {
    p: 'The activation is then stored on the computer and works offline. The plugin checks it again in the background about once a week; only a clear answer that the key is disabled, expired or released turns it off — a missing connection never does.',
  },
  {
    table: {
      head: ['System', 'Where the activation is stored'],
      rows: [
        ['macOS', '`~/Library/Application Support/SubverseLab/Licenses/`'],
        ['Windows', '`%APPDATA%\\SubverseLab\\Licenses\\`'],
      ],
    },
  },
  { h3: 'Moving to another computer' },
  { p: LICENCE_FACTS.oneComputer },
  {
    steps: [
      `On the old computer, open ${name} and click the **LICENSE** label on the panel.`,
      'Choose **Release this computer**.',
      'On the new computer, paste the same key into the activation card.',
    ],
  },
  {
    p: 'If the old computer is no longer available, write through the Help page from the e-mail address used at checkout.',
  },
];

export const KUBBE_MANUAL = {
  slug: KUBBE.slug,
  plugin: KUBBE,
  path: `${KUBBE.path}/manual`,
  title: 'Kubbe manual — installation, controls and licence | SubverseLab',
  description:
    'The Kubbe owner’s manual: installing on macOS (VST3, AU) and Windows (VST3), the three rooms, every control with its range and default, recipes, specifications and licence activation.',
  subtitle: 'Digital Reverberation System · Model KB-79',
  image: '/plugins/kubbe/manual/panel.jpg',
  imageSize: [1600, 628],
  imageAlt: 'Kubbe’s front panel',
  pdf: KUBBE.manual,
  sections: [
    {
      id: 'introduction',
      heading: 'Introduction',
      blocks: [
        {
          p: 'Kubbe is an algorithmic reverb with three rooms instead of a list of algorithms: Hammam, Cistern and Valley. Each room is a fixed character — its own reflection timing, decay and colour — inspired by a kind of space. Nothing in it is recorded or measured from a real place; there are no impulse responses. You pick a room, not an algorithm.',
        },
        { p: 'It ships as VST3, AU and Standalone on macOS (Apple Silicon and Intel), and as VST3 on Windows (64-bit).' },
        { h3: 'The three rooms' },
        {
          list: [
            '**Hammam** — inspired by a marble dome. Dense, bright first reflections, a flutter between parallel walls, a ring in the low mids.',
            '**Cistern** — inspired by an underground cistern. The column slaps arrive late and sparse, and the tail is long, dark, and moves slowly, like water.',
            '**Valley** — inspired by open air. The far slopes answer one by one, each answer darker and more blurred. With Echo Sync on, the echoes land on the beat grid.',
          ],
        },
      ],
    },
    { id: 'installation', heading: 'Installation', blocks: installation('Kubbe', { standalone: true }) },
    {
      id: 'panel',
      heading: 'Panel tour',
      blocks: [
        {
          p: 'The panel reads left to right, the way it was laid out on the rack unit: name and model plate, then PLACE, then the display cluster, then the control groups, then the switches.',
        },
        {
          steps: [
            '**Name block** — KUBBE, “Digital Reverberation System”, and the MODEL KB-79 plate.',
            '**PLACE** — three lit selector keys for the rooms: Hammam, Cistern, Valley. Switching room lets the old tail ring out for 1.5 seconds instead of cutting it.',
            '**Decay display (scope)** — the energy per 20 ms and the Schroeder decay curve, measured live on an impulse run through the engine, with the T60 it reads printed on screen.',
            '**VFD readout** — shows the value of the control you last touched for two seconds, then falls back to the measured T60 of the current room.',
            '**DUCK meter** — a VU-style needle showing how far the tail is ducked right now, in dB.',
            '**LEVEL group** — Mix.',
            '**TIME group** — Decay, Pre-delay, Pre-delay Sync.',
            '**SPACE group** — Distance, Width.',
            '**TONE group** — Low Cut, High Cut.',
            '**DYNAMICS group** — Duck.',
            '**FREEZE** and **ECHO SYNC** switches. Echo Sync is only enabled when Valley is selected.',
          ],
        },
      ],
    },
    {
      id: 'controls',
      heading: 'Controls',
      blocks: [
        {
          table: {
            head: ['Control', 'Range · default', 'What it does'],
            rows: [
              ['Place', 'Hammam / Cistern / Valley · Hammam', 'Selects which of the three rooms the engine runs. Everything else shapes that room; it does not blend between rooms.'],
              ['Mix', '0–100 % · 30 %', 'Dry/wet balance, equal-power law.'],
              ['Decay', '×0.25–×3.00 · ×1.00', 'Multiplies the room’s own decay time (RT60). The scope always shows the measured result, not a nominal number.'],
              ['Pre-delay', '0–250 ms · 0 ms', 'Added on top of the room’s own pre-delay (Hammam 7 ms, Cistern 42 ms, Valley 0 ms). Disabled when Sync is on.'],
              ['Pre-delay Sync', 'Off, 1/64–1/4 · off', 'Replaces the Pre-delay knob with a value synced to the host tempo.'],
              ['Distance', '0–100 % · 50 %', 'Near (0 %): early reflections up front. Far (100 %): more room, darker, less of the direct reflections.'],
              ['Width', '0–150 % · 100 %', '0 % collapses the wet signal to mono; 100 % is the room as built; up to 150 % widens it further.'],
              ['Low Cut', '20–1000 Hz · 20 Hz', 'High-pass on the wet signal only.'],
              ['High Cut', '1000–20000 Hz · 20000 Hz', 'Low-pass on the wet signal only.'],
              ['Duck', '0–100 % · 0 %', 'Follows the plugin’s own input — not an external sidechain. The tail steps back while that input plays, by up to 24 dB at full input level and full Duck. It ducks; it does not mute.'],
              ['Freeze', 'On / off · off', 'Holds the tail indefinitely, level within about 3 dB, while input keeps playing. Shown as “FREEZE HOLD” on the VFD.'],
              ['Echo Sync', 'On / off · off, Valley only', 'Valley’s five slope echoes land on the beat grid — 3/4, 5/4, 7/4, 5/2, 7/2 beats — instead of fixed millisecond spacing.'],
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
            {
              name: 'Vocal air (Hammam)',
              settings: 'Place: Hammam · Mix: 15–20 % · Decay: ×0.8 · Distance: 30 % · High Cut: 8 kHz · Duck: 40 %',
              text: 'Keeps the dome’s bright, dense early reflections up front without smearing diction; Duck lets the tail breathe between phrases.',
            },
            {
              name: 'Dark sustain (Cistern)',
              settings: 'Place: Cistern · Mix: 25 % · Decay: ×1.2 · Pre-delay: 60 ms · Low Cut: 120 Hz · Width: 120 %',
              text: 'Lets the late column slaps arrive on their own before the long, dark tail fills in — good for pads and slow synth lines.',
            },
            {
              name: 'Rhythmic slope echoes (Valley)',
              settings: 'Place: Valley · Echo Sync: on · Mix: 30 % · Decay: ×1.0 · Distance: 60 %',
              text: 'The five slope answers land on 3/4, 5/4, 7/4, 5/2 and 7/2 beats against the host tempo — a rhythmic, self-darkening echo rather than a straight delay.',
            },
            {
              name: 'Freeze pad',
              settings: 'Any room · Mix: 100 % · Freeze: on · Width: 130 %',
              text: 'Holds whatever is in the tail as a sustained drone while you play or automate over it; unfreeze to let it fall away.',
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
              ['Formats', 'macOS (Apple Silicon and Intel): VST3, AU, Standalone · Windows (64-bit): VST3'],
              ['Channel layouts', 'Mono → Stereo, Stereo → Stereo'],
              ['Code signing', 'macOS build not yet signed or notarised — see Installation'],
            ],
          },
        },
        { h3: 'The three rooms (nominal, Decay at ×1.00)' },
        {
          table: {
            head: ['Room', 'Built-in pre-delay', 'Nominal RT60 (mid)', 'Low cut', 'High cut'],
            rows: [
              ['Hammam', '7 ms', '≈ 3.0 s', '170 Hz', '11.5 kHz'],
              ['Cistern', '42 ms', '≈ 6.8 s', '85 Hz', '6.2 kHz'],
              ['Valley', '0 ms', '≈ 1.9 s', '240 Hz', '8.2 kHz'],
            ],
          },
        },
        {
          note: 'These are each room’s built-in numbers at Decay ×1.00. The Decay knob scales them directly; the scope always shows the T60 actually measured for the current settings, not this nominal table.',
        },
        { h3: 'Measured behaviour (self-test)' },
        {
          list: [
            'Decay: each room’s T60 lands within range of its nominal value; Decay ×0.5 gives a shorter tail; output is finite and silent 24 s after an impulse.',
            'Echo Sync: Valley’s first echo lands on the 3/4 beat at 90, 120 and 140 BPM, within 3 ms.',
            'Freeze: the tail holds within 3 dB for 4 s while input keeps playing.',
            'Duck: at 100 % the wet signal drops 12–26 dB. It ducks; it does not mute.',
            'Determinism: identical output, bit for bit, across runs and across block sizes 512 and 97.',
            'Level: the three rooms sit within 4 dB of each other at full wet.',
            'Room switch: no output step larger than the signal already has.',
          ],
        },
        { h3: 'Not done yet' },
        {
          list: [
            'Code signing and notarisation on macOS.',
            'Switching room again while the previous tail is still fading cuts that older tail.',
          ],
        },
      ],
    },
    { id: 'licence', heading: 'Licence', blocks: licence('Kubbe') },
  ],
};

export const KASET_MANUAL = {
  slug: KASET.slug,
  plugin: KASET,
  path: `${KASET.path}/manual`,
  title: 'Kaset manual — installation, controls and licence | SubverseLab',
  description:
    'The Kaset owner’s manual: installing on macOS (VST3, AU) and Windows (VST3), generations and tape types, every control with its range and default, recipes, specifications and licence activation.',
  subtitle: 'High Speed Dubbing System · Model KS-83',
  image: '/plugins/kaset/manual/panel.jpg',
  imageSize: [1600, 931],
  imageAlt: 'Kaset’s front panel',
  pdf: KASET.manual,
  sections: [
    {
      id: 'introduction',
      heading: 'Introduction',
      blocks: [
        {
          p: 'Kaset is a double cassette deck, modelled as generations rather than a single “tape” effect. Each generation is one more trip onto tape and back — record pre-emphasis, saturation, playback de-emphasis, head bump, gap loss, wow and flutter, hiss and worn-oxide dropouts — run again on top of the last, the way a mixtape dubbed from a dub of a dub sounded.',
        },
        { p: 'It ships as VST3 and AU on macOS (Apple Silicon and Intel), and as VST3 on Windows (64-bit).' },
        { h3: 'Generations' },
        {
          list: [
            '**Master** — one trip onto tape.',
            '**1st Dub** to **4th Dub** — two to five trips, each a copy of the one before. The top end falls and hiss builds with every generation; speed error (wow and flutter) is heaviest through the 2nd dub and then levels off.',
          ],
        },
        {
          note: 'Every “random” element in the engine — drift, hiss, dropout timing — comes from a seeded generator: identical input and settings give identical output, bit for bit.',
        },
      ],
    },
    { id: 'installation', heading: 'Installation', blocks: installation('Kaset') },
    {
      id: 'panel',
      heading: 'Panel tour',
      blocks: [
        {
          p: 'Laid out as a double deck: transport and dub-generation controls along the top strip, the knob row across the middle, and the two cassette wells — record side (A) and dub side (B) — across the bottom, with the tape counter and record-level ladder between them.',
        },
        {
          steps: [
            '**TAPE / BYPASS** — piano keys under the “SIGNAL PATH” bracket. TAPE runs the signal through the engine; BYPASS is a complete, bit-exact dry bypass.',
            '**AUTO GAIN** — piano key, turns automatic level compensation on and off.',
            '**DUB / COPIES dial** — the generation selector: Master, 1st, 2nd, 3rd, 4th Dub, shown as a tuner-style scale with a pointer.',
            '**TAPE SELECTOR** — three buttons: Normal, Chrome, Metal.',
            '**RECORD group** — Input, Saturation.',
            '**TRANSPORT group** — Wow, Flutter.',
            '**TAPE group** — Hiss, Wear.',
            '**OUTPUT group** — Mix, Output.',
            '**Deck A** (record / play back, gold badge) and **Deck B** (play back, teal badge) — cassette wells showing the tape type and hub position.',
            '**TAPE COUNTER** — a three-drum mechanical counter; click to zero it.',
            '**REC LEVEL** — a segmented L/R level ladder, 0 at −18 dBFS RMS.',
          ],
        },
      ],
    },
    {
      id: 'controls',
      heading: 'Controls',
      blocks: [
        {
          table: {
            head: ['Control', 'Range · default', 'What it does'],
            rows: [
              ['Generation', 'Master–4th Dub · 2nd Dub', 'How many trips onto tape and back the signal takes. Each generation runs the full chain again on top of the last, so top end loss, hiss and speed error accumulate.'],
              ['Tape', 'Normal / Chrome / Metal · Normal', 'Normal is Type I. Chrome and Metal hold more top end and headroom before the tape compresses, and have quieter hiss (see Specifications).'],
              ['Input', '−12 to +12 dB · 0 dB', 'Gain into the tape path only; the dry path is unaffected.'],
              ['Saturation', '0–100 % · 55 %', 'How hard the tape is driven — a soft, slightly asymmetric curve. Reduced automatically past the 2nd dub so it does not keep piling up.'],
              ['Wow', '0–100 % · 50 %', 'Slow speed drift, up to 0.35 % of head travel per pass at 0.55–0.8 Hz. Heaviest through the 2nd dub, then eases off.'],
              ['Flutter', '0–100 % · 50 %', 'Fast speed wobble, up to 0.12 % of head travel per pass at 6.5–9.5 Hz.'],
              ['Hiss', '0–100 % · 50 %', 'Band-shaped tape noise, roughly 900 Hz–7.5 kHz, added once per generation.'],
              ['Wear', '0–100 % · 25 %', 'Worn-oxide dropouts: brief level sags of 20–90 ms, at random (seeded) intervals that scale with this control.'],
              ['Mix', '0–100 % · 100 %', 'Dry/wet balance. Also scaled by the TAPE / BYPASS state.'],
              ['Output', '−12 to +12 dB · 0 dB', 'Final output trim, after the mix and after Auto Gain. Out of the path in BYPASS.'],
              ['Auto Gain', 'On / off · on', 'Matches the tape path’s loudness to the input over about 1.5 s, within a ±12 dB range; holds level within ±0.1 dB in tests. Tracks average loudness, not peaks.'],
              ['TAPE / BYPASS', 'Default: TAPE', 'TAPE runs the engine. BYPASS is a complete bypass — every knob including Output is out of the path, and the signal leaves bit-exact and latency-aligned. Fades over about 20 ms; latency stays fixed either way.'],
            ],
          },
        },
        {
          note: 'In BYPASS the knobs dim and the DUB / COPIES dial reads “BYPASS — tape is out of the signal path.” The knobs still move while dimmed; they have no audible effect until TAPE is pressed again.',
        },
        { h3: 'Troubleshooting' },
        {
          list: [
            '**I turn knobs and hear nothing** — check that TAPE is lit. In BYPASS the tape path, and every knob on it including Output, is out of circuit by design.',
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
              name: 'Mix-bus warmth (starting point)',
              settings: 'Generation: 2nd Dub · Tape: Normal · Auto Gain: on · Mix: 15–25 % · Saturation: 40–55 %',
              text: 'A starting point for a mix bus: enough generation loss to feel like tape, with Auto Gain keeping the level steady so you judge the effect by ear, not by a jump in level.',
            },
            {
              name: 'Lo-fi vocal dub',
              settings: 'Generation: 4th Dub · Tape: Normal · Wow: 70 % · Flutter: 60 % · Hiss: 60 % · Mix: 100 %',
              text: 'Heavy top-end loss (down toward 4.4 kHz) and audible hiss for a deliberately worn, dubbed-cassette vocal.',
            },
            {
              name: 'Clean chrome pass',
              settings: 'Generation: 1st Dub · Tape: Chrome · Saturation: 35 % · Wear: 0 % · Auto Gain: on',
              text: 'Chrome’s extra headroom and quieter hiss keep this pass close to the source — tape colour without much degradation.',
            },
            {
              name: 'A/B against dry',
              settings: 'TAPE / BYPASS: BYPASS',
              text: 'Check the untouched dry signal. BYPASS is bit-exact and the plugin’s latency does not change, so the comparison stays time-aligned.',
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
              ['Formats', 'macOS (Apple Silicon and Intel): VST3, AU · Windows (64-bit): VST3'],
              ['Channel layouts', 'Mono → Stereo, Stereo → Stereo'],
              ['Latency', 'Fixed 720 samples at 48 kHz (15 ms), the same for every generation'],
              ['Code signing', 'macOS build not yet signed or notarised — see Installation'],
            ],
          },
        },
        { h3: 'Top end per generation (Tape: Normal, white-noise response, −3 dB point)' },
        {
          table: {
            head: ['Generation', 'Top end (approx.)'],
            rows: [
              ['Master', '≈ 10 kHz'],
              ['1st Dub', '≈ 8.4 kHz'],
              ['2nd Dub', '≈ 6.4 kHz'],
              ['4th Dub', '≈ 4.4 kHz'],
            ],
          },
        },
        { h3: 'Tape types' },
        {
          table: {
            head: ['Type', 'Top end', 'Hiss', 'Headroom'],
            rows: [
              ['Normal (Type I)', 'baseline', 'baseline', 'baseline'],
              ['Chrome (Type II)', '× 1.18', '−4 dB', 'more'],
              ['Metal (Type IV)', '× 1.3', '−6 dB', 'most'],
            ],
          },
        },
        { h3: 'Transport and noise' },
        {
          list: [
            'Wow: up to 0.35 % of head travel per pass, at 0.55–0.8 Hz.',
            'Flutter: up to 0.12 % of head travel per pass, at 6.5–9.5 Hz.',
            'Wear: dropouts of 20–90 ms, at random (seeded) intervals.',
            'Hiss: band-shaped noise, roughly 900 Hz–7.5 kHz.',
            'Auto Gain: ±12 dB range; holds level within ±0.1 dB in tests.',
            'Bypass: bit-exact dry.',
          ],
        },
      ],
    },
    { id: 'licence', heading: 'Licence', blocks: licence('Kaset') },
  ],
};

export const MANUALS = [KUBBE_MANUAL, KASET_MANUAL];

export const manualBySlug = (slug) => MANUALS.find((m) => m.slug === slug);
