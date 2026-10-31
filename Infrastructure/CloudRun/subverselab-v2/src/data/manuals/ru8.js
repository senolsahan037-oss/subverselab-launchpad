// RU-8 owner's manual as a web page: /plugins/ru8/manual.
// Source: 01_AI_Tools/subverselab-ru8/docs/manual/RU8_Manual.html (20 Oct 2026, RU-8 1.0.0, the version the site sells; same
// text as public/plugins/ru8/RU8_Manual.pdf). subverselab-ru8/STATUS.md lists no later desktop release (1.0.0 shipped 17 Oct).
// Left out: "two per kit" in the presets row (no preset counts), the licence row and "no licence key" sentence (gettingIt()),
// the support / trademark footer. The Windows file names are not named: STATUS says the zip's contents were not checked
// when the manual was written.

import { RU8 } from '../plugins.js';
import { installation, gettingIt, manualBase } from './common.js';

export const RU8_MANUAL = {
  ...manualBase(RU8, {
    subtitle: 'Rhythm Unit · Drum machine',
    description: 'The RU-8 owner’s manual: quick start, the readout, pads and steps, kits and sets, the channel and master strips, SPACE and ECHO, the rear panel and MIDI map, RU-8 in your DAW, shortcuts, installation and specifications.',
  }),
  sections: [
    {
      id: 'introduction',
      heading: 'Welcome',
      blocks: [
        { p: 'Open RU-8, press play, and you have a groove. RU-8 is a drum machine you play, not program.' },
        { p: 'Pick a **kit** and the whole machine changes its sound: the drums, and the space, echo and glue settings they were voiced with. Pick a **set** and only the rhythm changes. Any set plays on any kit. Every pad is a drum synthesized inside RU-8 with its own pattern of steps, so you shape a beat pad by pad, by hand, and drag it into your DAW as MIDI when it is right.' },
        { p: 'The sound promise: strong without being pushed, clean by default. A gentle glue on the bus and a safety limiter at −1 dBFS, nothing more. Character that needs tape, dust or bit reduction comes from a kit’s COLOR on the rear panel.' },
      ],
    },
    {
      id: 'installation',
      heading: 'Installation',
      blocks: installation('RU-8', {
        standalone: true,
        winStandalone: true,
        instrument: true,
        macSteps: [
          'Run the installer package (`.pkg`) you downloaded. It is signed and notarised, and holds the standalone app, the VST3 and the AU instrument.',
          'It puts the app in `/Applications`, the VST3 in `/Library/Audio/Plug-Ins/VST3` and the AU in `/Library/Audio/Plug-Ins/Components`.',
          'Let your DAW rescan its plug-ins; RU-8 appears as an instrument.',
        ],
        winSteps: [
          'If Windows blocks the downloaded files: right-click the zip, choose **Properties**, tick **Unblock**, then extract.',
          'Copy the `.vst3` folder to `C:\\Program Files\\Common Files\\VST3\\`.',
          'Put the standalone app in any folder you like and start it from there.',
          'Let your DAW rescan its plug-ins; RU-8 appears as an instrument.',
        ],
      }),
    },
    {
      id: 'quick-start',
      heading: 'Quick start',
      blocks: [
        {
          steps: [
            '**Press PLAY** (standalone: Space). A full rhythm runs from the first bar.',
            '**Change the kit** with the arrows beside the kit name, or click the name for the list. The knobs glide to the new kit.',
            '**Change the set** the same way. While playing, the new set waits for the next bar.',
            '**Play the arrangement:** A and B switch on the next bar, FILL drops a fill on the next bar, AUTO plays A ×3, fill, B ×3, fill by itself.',
            '**Make it yours:** point at a pad to open its 16 steps and click them. When it is right, drag the MIDI key onto a track in your DAW.',
          ],
        },
        { note: '**Lost?** Press **?**: notes appear over the panel, one per part. Arrow keys step through them, Esc closes. Double-click any knob to return it to the value of the kit or set that is loaded now.' },
      ],
    },
    {
      id: 'panel',
      heading: 'The panel',
      blocks: [
        { p: 'One panel, no hidden pages: the readout on top, the pad bed in the middle, the channel and master strips on the left, SPACE and ECHO on the right.' },
        { h3: 'The readout' },
        {
          table: {
            head: ['Part', 'What it does'],
            rows: [
              ['KIT', 'The sound of all pads, and the space, echo and channel settings it was voiced with. Arrows step through the kits; click the name for the list.'],
              ['SET', 'A ready rhythm with its own tempo, swing and echo time. While playing, the change waits for the next bar and the readout says Next. USER 1–4 start empty and are saved with your project.'],
              ['SET / MIDI', 'In a DAW: SET lets RU-8 play its set with the host; MIDI silences the set and lets only incoming notes play the pads (see In your DAW). The standalone app always plays its set.'],
              ['A · B · FILL · AUTO', 'Two sections, a fill on the next bar, and an automatic arrangement (A ×3, fill, B ×3, fill). A lit lamp is playing; a blinking one waits for the next bar. Section and Auto are also automation lanes.'],
              ['Position · BPM', 'Bar and beat while playing, four beat lamps; the tempo playing now. In a DAW the BPM shows HOST with a lock.'],
            ],
          },
        },
        { h3: 'Transport and presets' },
        {
          table: {
            head: ['Control', 'What it does'],
            rows: [
              ['PLAY', 'Standalone: starts and stops. In a DAW: a preview on RU-8’s own clock at the host’s tempo while the host is stopped; when the host starts RU-8 carries on in step with its bar, without a break.'],
              ['TEMPO · TAP', 'Standalone only: 50 to 200 BPM, drag (Shift for fine steps) or wheel, double-click returns to the set’s tempo; tap two or more times (T). In a DAW they rest: the host’s tempo rules.'],
              ['Presets', 'Factory presets: a kit’s sound with a set’s groove, grouped by kit in the list. A gold dot means something changed since the preset loaded. In a DAW they are its program list.'],
              ['Pattern keys', 'Clear the whole section, clear only the selected pad, copy this section to the other one, copy the selected pad’s steps and paste them on another pad (Cmd C / Cmd V in the standalone).'],
            ],
          },
        },
      ],
    },
    {
      id: 'pads',
      heading: 'Pads and steps',
      blocks: [
        { p: 'Play first, program later. Sixteen pads, laid out like hardware: pad 1 is bottom left. Click a pad to play it. In the standalone app the computer keys match the layout: Z X C V on the bottom row, then A S D F, Q W E R and 1 2 3 4 on top; Shift plays soft. In a DAW the computer keys stay the host’s; play the pads with MIDI notes. The bottom two rows are the core kit (kick, snare, clap, rim, closed and open hat, low and high tom); the top two rows change with the kit.' },
        { h3: 'Steps' },
        { p: 'Point at a pad to open its 16 steps; each row of four is one beat. Click a step: off → on (ink) → accent (gold) → ghost (dot). While playing, the current step has a gold ring. Every pad holds its own steps, so the kick, the snare and the hats are written separately and layered on the grid. Notes from your DAW or a controller play the pads on top of the sequencer, with velocity.' },
        { h3: 'Kits' },
        {
          table: {
            head: ['Kit', 'Character'],
            rows: [
              ['Analog', 'Sine sub, square-cluster hats, round toms'],
              ['Punch', 'Short click kick, bright snare, tight room'],
              ['Boom', 'Round heavy kick, fat snare, shakers'],
              ['Dry', 'Short and close, clicks, no tail'],
              ['Deep', 'Long sub, soft clicks, wide space'],
              ['Tape', 'Soft transients, dark top, rounded'],
              ['Industrial', 'Metal hits, grit, long tails'],
              ['Anatolia', 'Darbuka, bendir, def, zil'],
              ['Trap', 'Long 808, tight snare, fast hats'],
              ['Brush', 'Brushes, soft kick, jazz ride'],
              ['Electro', 'Zaps, hard snare, robot'],
              ['Glass', 'FM bells, crystal hats, clean'],
              ['Lo-fi', 'Dusty tape, soft kick, muted snare'],
              ['Breaks', 'Acoustic crack, room, tape glue'],
            ],
          },
        },
        { h3: 'Sets' },
        { p: 'House, Techno, Disco, Rock, Funk, Boom bap, Trap, Lo-fi, Breakbeat, Drum & bass, Dembow, Bossa nova, Afrobeat, Ciftetelli, Jazz brush, Electro, Shuffle, and USER 1–4. Each brings two sections (A and B), a fill, its tempo, swing and echo time.' },
      ],
    },
    {
      id: 'strips',
      heading: 'Strips and effects',
      blocks: [
        {
          table: {
            head: ['Strip', 'Controls', 'Range'],
            rows: [
              ['Channel (the pad you played last)', 'Level, tune, decay, pan, SPACE send, ECHO send; mute, solo (several can be soloed), reset to the kit', 'Level −40 to +6 dB · tune ±12 semitones · decay ×0.3 to ×2 · pan L100 to R100 · sends 0 to 100 %'],
              ['Master', 'Output meter (dBFS), GR (how much the glue presses), swing, human, glue, volume', 'Swing 0 to 80 % · human 0 to 100 % (small random timing and level) · glue 0 to 100 % · volume −40 to +3 dB, before the −1 dBFS limiter'],
              ['SPACE', 'Algorithmic reverb: ROOM, PLATE or HALL; size, damping, pre-delay, return', 'Size 30 to 96 % · damping 1 to 12 kHz (how fast the highs fade) · pre-delay 0 to 60 ms'],
              ['ECHO', 'Tempo-synced ping-pong delay: time, feedback, tone, return', 'Time 1/16 D, 1/8, 1/8 D, 1/4 (D = dotted) · feedback 0 to 78 % · tone 0.8 to 12 kHz'],
            ],
          },
        },
        { p: 'Every pad has its own send to SPACE and ECHO, so the snare can sit in the room while the kick stays dry. Every sound is synthesized by RU-8 itself, so tune, decay and level reshape the drum rather than stretch a recording.' },
        { h3: 'Knobs' },
        { p: 'Drag up or down; Shift for fine steps; the wheel works too. Double-click returns a knob to the kit’s value. When a kit or set is chosen, the knobs glide to their new places; the sound changes at once.' },
        { h3: 'The water' },
        { p: 'The body of the machine is a water tank behind the pads and knobs. Each pad has its shape in it; a shape rises when the pad plays, as high as it was hit, and sinks back. While playing, every finished bar drops a ring on its post (A, B or fill), so you can see where the arrangement is. REDUCED MOTION on the rear panel stills the water; RU-8 also follows the system’s Reduce motion setting.' },
        { h3: 'Moods' },
        { p: 'The drop at the base steps through the panel colours: Cream, Night, Powder and Pink (M in the standalone). Only the look changes; the sound, the layout and your project stay the same.' },
      ],
    },
    {
      id: 'rear-panel',
      heading: 'Rear panel',
      blocks: [
        { p: 'Turn the machine round with the flip key at the base (B in the standalone).' },
        {
          table: {
            head: ['Part', 'What it does'],
            rows: [
              ['COLOR', 'TAPE, DUST and CRUSH, 0 to 100 % each: the character each kit brings. Most kits leave it off.'],
              ['MIDI note map', '**GM drums** (default): the pads answer and send General MIDI drum notes, C1 = kick. **Pads 36–51**: the 16 pads answer notes 36 to 51, C1 up, pad 1 first.'],
              ['Section trigger notes', 'C−1 = A, D−1 = B, E−1 = one bar of fill, F−1 = off. They play at their exact sample.'],
              ['Output', 'Stereo out. REDUCED MOTION for the water.'],
            ],
          },
        },
        {
          table: {
            head: ['Pad', 'Core sound', 'GM note out'],
            rows: [
              ['1', 'Kick', '36'],
              ['2', 'Snare', '38'],
              ['3', 'Clap', '39'],
              ['4', 'Rim', '37'],
              ['5', 'Closed hat', '42'],
              ['6', 'Open hat', '46'],
              ['7', 'Low tom', '45'],
              ['8', 'High tom', '50'],
            ],
          },
        },
        { p: 'Pads 9 to 16 change with the kit (congas, bongos, shakers, bells, cymbals and more); in GM drums they send 64, 63, 70, 56, 75, 49, 51 and 54.' },
      ],
    },
    {
      id: 'daw',
      heading: 'In your DAW',
      blocks: [
        { p: 'The DAW is the boss.' },
        {
          table: {
            head: ['Topic', 'How RU-8 behaves'],
            rows: [
              ['Tempo', 'The host’s tempo, always (HOST with a lock). TEMPO and TAP rest.'],
              ['Transport', 'RU-8 plays its set with the host’s transport and stays on the host’s timeline, so the same project plays and bounces the same way every time. PLAY previews while the host is stopped.'],
              ['SET / MIDI', 'SET: RU-8 plays its set with the host, so you can try sets in your song. MIDI: its set is silent and only incoming notes play the pads. Drag a clip out and the lamp blinks; when the clip’s notes reach RU-8 while the host plays, it switches to MIDI. Click to switch back. Saved with the project; each RU-8 has its own switch.'],
              ['MIDI clips out', 'Drag the pad key (the selected pad alone) or the full-drum key onto a MIDI track. With AUTO off you get one bar of the section you see; with AUTO on, the whole arrangement (A ×3, fill, B ×3, fill: 8 bars). A click on the save arrow writes both clips to files. Notes follow the note map on the rear panel, channel 10, swing written into the timing.'],
              ['Notes in', 'Notes from the piano roll or a controller always play the pads on top of the sequencer, with velocity. The section trigger notes switch A, B, fill and off.'],
              ['Keyboard', 'In a DAW the computer keys stay the host’s; use MIDI notes (for example your DAW’s computer MIDI keyboard).'],
            ],
          },
        },
        { h3: 'Standalone shortcuts' },
        {
          table: {
            head: ['Key', 'Does'],
            rows: [
              ['Space', 'Play / stop'],
              ['5 6 7 8', 'A, B, fill, auto'],
              ['T', 'Tap tempo'],
              ['B', 'Rear panel'],
              ['M', 'Next mood'],
              ['Cmd C / V', 'Copy / paste the selected pad’s steps'],
              ['Z X C V … 1 2 3 4', 'Play the pads (Shift: soft)'],
              ['Cmd Z', 'Undo'],
            ],
          },
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
              ['Formats', 'macOS: standalone app, VST3, AU instrument (Apple Silicon and Intel). Windows (64-bit): standalone app and VST3.'],
              ['Systems', 'macOS 11 or later; Windows, 64-bit.'],
              ['Pads', '16 synthesized drums, each with level, tune, decay, pan, two sends, mute and solo'],
              ['Sequencer', '16 steps per pad (off, on, accent, ghost), sections A and B, fill, auto arrangement'],
              ['Tempo', '50 to 200 BPM (standalone), host tempo in a DAW; swing 0 to 80 %'],
              ['Effects', 'SPACE (room, plate, hall), ECHO (tempo-synced ping-pong), GLUE bus compressor, COLOR (tape, dust, crush), −1 dBFS safety limiter'],
              ['MIDI', 'GM drums or pads 36–51 in and out; section trigger notes; clip drag-out on channel 10'],
            ],
          },
        },
        { h3: 'Help and support' },
        { p: 'Something wrong? Reply to your receipt e-mail, or use **Report a problem** on the Account page. Tell us your system, your DAW and what you did; we read every report.' },
      ],
    },
    { id: 'download', heading: 'Getting RU-8', blocks: gettingIt(RU8) },
  ],
};
