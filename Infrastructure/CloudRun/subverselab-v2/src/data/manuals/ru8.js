// RU-8 owner's manual as a web page: /plugins/ru8/manual.
// Source: 01_AI_Tools/subverselab-ru8/docs/manual/RU8_Manual.html (8 Nov 2026, RU-8 1.1.0; same text as
// public/plugins/ru8/RU8_Manual.pdf). 1.1 adds sample kits, the synth kit redesign, the EDIT screen, your samples / user kits and
// the HUMAN groove (RU-8 STATUS.md 7-8 Nov). Ship with the 1.1.0 installers, not before (RELEASE_QUEUE).
// Left out: "two per synth kit" in the presets row (no preset counts), the licence row and "no licence key" sentence (gettingIt()),
// the support / trademark footer. The Windows file names are not named: STATUS says the zip's contents were not checked
// when the manual was written.

import { RU8 } from '../plugins.js';
import { media } from '../../utils/endpoints.js';
import { installation, gettingIt, manualBase } from './common.js';

const pic = (file, w, h, alt, caption) => ({ img: media(`/plugins/ru8/manual/${file}`), w, h, alt, caption });

export const RU8_MANUAL = {
  ...manualBase(RU8, {
    subtitle: 'Rhythm Unit · Drum machine',
    description: 'The RU-8 owner’s manual: quick start, the readout, pads and steps, synth and sample kits, sets, the channel and master strips, the HUMAN groove, SPACE and ECHO, the EDIT screen, your own samples and user kits, the rear panel and MIDI map, RU-8 in your DAW, shortcuts, installation and specifications.',
  }),
  sections: [
    {
      id: 'introduction',
      heading: 'Welcome',
      blocks: [
        { p: 'Open RU-8, press play, and you have a groove. RU-8 is a drum machine you play, not program.' },
        { p: 'Pick a **kit** and the whole machine changes its sound: the drums, and the space, echo and glue settings they were voiced with. Pick a **set** and only the rhythm changes. Any set plays on any kit. Every pad has its own pattern of steps, so you shape a beat pad by pad, by hand, and drag it into your DAW as MIDI when it is right.' },
        { p: 'The **synth kits** are drums synthesized inside RU-8; the **sample kits** play recorded drum kits. Drop your own WAV or AIFF files on any pad, and the **EDIT** key opens the selected pad: its sound in the readout, and a second set of knobs to shape it.' },
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
        { note: '**New in 1.1:** sample kits; the synth kits redesigned (velocity moves the tone, recorded layers under hats, claps, shakers, rides and more); the EDIT screen; your own samples on any pad and your own user kits; HUMAN is now a drummer’s groove.' },
        { note: '**Lost?** Press **?**: notes appear over the panel, one per part. Arrow keys step through them, Esc closes. Double-click any knob to return it to the value of the kit or set that is loaded now.' },
      ],
    },
    {
      id: 'panel',
      heading: 'The panel',
      blocks: [
        { p: 'One panel, no hidden pages: the readout on top, the pad bed in the middle, the channel and master strips on the left, SPACE and ECHO on the right.' },
        pic('panel.webp', 1600, 1116, 'The RU-8 front panel on the ANALOG kit: readout on top, sixteen pads in the middle, channel and master strips on the left, SPACE and ECHO on the right', 'The whole front panel: **readout**, **pads**, **CHANNEL** and **MASTER** on the left, **SPACE** and **ECHO** on the right.'),
        { h3: 'The readout' },
        pic('readout.webp', 910, 175, 'The readout showing kit ANALOG, set HOUSE 124, the A, B, fill and AUTO keys and the bar position', 'The readout: kit on top, set, section keys and bar position below, tempo at the right.'),
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
        pic('pads.webp', 920, 830, 'The pad bed: sixteen pads with their computer keys, and the row of pattern and MIDI keys above them', 'The pad bed: pad 1 is bottom left; the keys above hold the MIDI drag, the set arrows and the copy keys.'),
        { h3: 'Steps' },
        { p: 'Point at a pad to open its 16 steps; each row of four is one beat. Click a step: off → on (ink) → accent (gold) → ghost (dot). While playing, the current step has a gold ring. Every pad holds its own steps, so the kick, the snare and the hats are written separately and layered on the grid. Notes from your DAW or a controller play the pads on top of the sequencer, with velocity.' },
        { h3: 'Kits' },
        { p: 'The kit arrows step through the synth kits, then the sample kits, then the User kit and your saved user kits. Click the name for the list.' },
        { p: '**Synth kits.** Synthesized inside RU-8. In 1.1 they were redesigned: a softer hit also sounds darker (less click, less noise, as on a real drum), and recordings sit under the synthesis where it needs them: closed and open hats, claps, shakers, tambourines, rides, the kick’s beater and the snare’s wires. Anatolia stays synthesis only. LAYER in the EDIT screen sets the mix of synth voice and recording per pad.' },
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
        { p: '**Sample kits.** Recorded drum kits. Where the recordings have them, a pad plays different takes for soft and hard hits and alternates takes, so repeated hits do not sound the same. A sample kit names every pad by what it plays.' },
        {
          table: {
            head: ['Kit', 'Character'],
            rows: [
              ['Uptown', 'Real kit, close mics and room, tambourine'],
              ['Basement', '24-inch kick, big snare, ride, small room'],
              ['Sweatbox', 'Tight 20-inch kit, overheads, cowbell'],
              ['Hallway', 'Open kick, wet hats, bongos and congas'],
              ['Cellar', 'Dirty kick, 12-bit, claps and tambourine'],
              ['Parlor', 'Rimshot snare, shaker, congas, 12-bit'],
              ['Drill', 'Slide 808s, sharp hats, hard claps'],
              ['Warehouse', 'Rumble kick, steel snare, metal'],
              ['Hardware', 'Sampler kicks and snares, folded 808s'],
              ['User', 'Empty: your own samples (see Your samples)'],
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
              ['Master', 'Output meter (dBFS), GR (how much the glue presses), swing, human, glue, volume', 'Swing 0 to 80 % · human 0 to 100 % (a drummer’s groove: the snare up to 12 ms behind, lazy 16th hats, softer off-beat hats, the time breathing by up to 4 ms) · glue 0 to 100 % · volume −40 to +3 dB, before the −1 dBFS limiter'],
              ['SPACE', 'Algorithmic reverb: ROOM, PLATE or HALL; size, damping, pre-delay, return', 'Size 30 to 96 % · damping 1 to 12 kHz (how fast the highs fade) · pre-delay 0 to 60 ms'],
              ['ECHO', 'Tempo-synced ping-pong delay: time, feedback, tone, return', 'Time 1/16 D, 1/8, 1/8 D, 1/4 (D = dotted) · feedback 0 to 78 % · tone 0.8 to 12 kHz'],
            ],
          },
        },
        { p: 'Every pad has its own send to SPACE and ECHO, so the snare can sit in the room while the kick stays dry. On a synth kit, tune, decay and level reshape the drum itself rather than stretch a recording.' },
        pic('strips.webp', 330, 840, 'The CHANNEL strip with six knobs and mute, solo and reset keys, and the MASTER strip with its meter and four knobs', 'The **CHANNEL** strip for the pad played last, and the **MASTER** strip below it.'),
        pic('fx.webp', 310, 720, 'The SPACE section with ROOM, PLATE and HALL keys and four knobs, and the ECHO section with four time keys and three knobs', '**SPACE** (ROOM, PLATE, HALL) and **ECHO** (time keys, feedback, tone, return).'),
        { h3: 'Human: the groove' },
        { p: 'HUMAN plays the steps the way a drummer would, not at random. At 100 %:' },
        {
          table: {
            head: ['Part', 'At 100 %'],
            rows: [
              ['Kick', 'On the grid.'],
              ['Snare · clap · rim', 'Laid back: up to 12, 10 and 8 ms behind the grid. Toms 5 ms.'],
              ['Hats and the upper pads', 'On the quarter: on time. The off 8th: 3 ms late and a little softer. The off 16ths: 8 ms late and softer still (lazy 16ths).'],
              ['The kit’s time', 'Breathes together by up to ±4 ms, smoothly from beat to beat; each hit adds ±1.5 ms of its own and up to 12 % less level.'],
            ],
          },
        },
        { p: 'Lower values scale all of it down; the default is 12 %. The groove is fixed by bar and step, so the same project plays and bounces exactly the same every time. MIDI clips you drag out carry the swing, not the groove. A project saved with 1.0 sounds slightly different with 1.1 at the same HUMAN value.' },
        { h3: 'Knobs' },
        { p: 'Drag up or down; Shift for fine steps; the wheel works too. Double-click returns a knob to the kit’s value. When a kit or set is chosen, the knobs glide to their new places; the sound changes at once.' },
        { h3: 'The water' },
        { p: 'The body of the machine is a water tank behind the pads and knobs. Each pad has its shape in it; a shape rises when the pad plays, as high as it was hit, and sinks back. While playing, every finished bar drops a ring on its post (A, B or fill), so you can see where the arrangement is. REDUCED MOTION on the rear panel stills the water; RU-8 also follows the system’s Reduce motion setting.' },
        { h3: 'Moods' },
        { p: 'The drop at the base steps through the panel colours: Cream, Night, Powder and Pink (M in the standalone). Only the look changes; the sound, the layout and your project stay the same.' },
      ],
    },
    {
      id: 'edit',
      heading: 'The EDIT screen',
      blocks: [
        { p: 'Press EDIT (beside TAP) and the readout shows the selected pad. Play a pad to choose it. Press EDIT again to go back to the kit, set and arranger view.' },
        { h3: 'The readout in EDIT' },
        {
          table: {
            head: ['Part', 'What it shows'],
            rows: [
              ['Head', 'EDIT, the pad number and name, and where its sound comes from: synth voice, synth + recording, recorded sample, your sample, several samples by chance, file missing, or empty.'],
              ['Waveform', 'The pad’s sound: the sample, or the last hit of a synth voice. Over it, the envelope the next hit will have with the values set now: the ATTACK ramp, the DECAY fade and, on samples, START and END with the part outside dimmed.'],
              ['Knob picture', 'The knob you turn shows its own picture and value at once, and the picture fades after you let go: level, pitch, the filter curve with its resonance, the drive curve, pan, the SPACE tail, the ECHO repeats, the pitch sweep, the noise share, the synth / recording layer.'],
              ['VEL', 'Dots for the velocity layers; the lit one played last.'],
              ['Samples row', 'The pad’s samples with their weights; click one to select it. Drop files here to add them to the pad.'],
              ['Keys', 'REVERSE plays the sample backwards. OPEN adds files from a list. CLEAR removes the pad’s samples: the kit’s sound comes back. SAVE stores the User kit.'],
            ],
          },
        },
        { h3: 'The knobs in EDIT' },
        { p: 'The knobs of MASTER, SPACE and ECHO keep their places and take their second names, in gold. The CHANNEL strip keeps level, tune, decay, pan and the sends. A function that does not apply to the pad is faint and takes no clicks; the SPACE type and ECHO time keys rest while EDIT is on.' },
        {
          table: {
            head: ['Knob', 'What it does'],
            rows: [
              ['START · END', 'Where a sample starts and stops playing (it stops with a short fade, no click).'],
              ['SWEEP · NOISE', 'On synth pads in place of START and END: how far the voice’s pitch falls at the hit; the noise part (the kick’s click, the snare’s wires, the hats’ noise, a hand drum’s slap).'],
              ['ATTACK', 'Fades each hit in, from 0 to 200 ms.'],
              ['FINE', 'Fine tuning in cents, on top of the pad’s tune.'],
              ['FILTER · RESO', 'One knob: to the left a low-pass (darker), to the right a high-pass (thinner), off in the middle. RESO is its resonance.'],
              ['DRIVE', 'A soft clip after the filter: more weight and grit.'],
              ['VEL>TONE', 'How much a soft hit also sounds darker, with less click. At 0, velocity changes only the level.'],
              ['LAYER', 'Synth kit pads with a recorded layer: the synth voice to the left, the recording to the right, both in the middle.'],
              ['CHOKE', 'Pads in the same group silence each other, like an open and a closed hat. Off, or group 1 to 4.'],
              ['WEIGHT', 'With several samples on a pad: how often the selected one plays.'],
            ],
          },
        },
        { p: 'The EDIT values are saved with your project. Loading a kit sets them to the kit’s values (pads holding your samples keep theirs); double-click returns a knob to the loaded kit’s value, or the dropped sample’s. RESET on the CHANNEL strip also resets the pad’s EDIT values. EDIT values are not automation lanes, and Undo does not cover them, drops or CLEAR.' },
      ],
    },
    {
      id: 'samples',
      heading: 'Your samples',
      blocks: [
        { p: 'Drop WAV or AIFF files on any pad of any kit, or press OPEN in the EDIT screen. The pad plays your sound from then on.' },
        {
          table: {
            head: ['Topic', 'How it works'],
            rows: [
              ['Files', 'WAV or AIFF, any sample rate and bit depth, mono or stereo. A file longer than 20 seconds is cut at 20 seconds.'],
              ['Several per pad', 'Up to 8 samples on one pad, played by chance; RU-8 avoids the same one twice in a row. Each has a WEIGHT: how often it plays. A drop on the pad replaces its sound; a drop on the EDIT samples row adds to it.'],
              ['Per kit', 'Samples belong to the kit you dropped them on, in this project. Another kit has its own pads; step back and your samples are there again.'],
              ['Library copy', 'RU-8 keeps a copy of every file in its user library, so a project still opens after the original moves or is deleted. macOS: `~/Library/Application Support/SubverseLab/RU-8/User Library`. Windows: `%APPDATA%\\SubverseLab\\RU-8\\User Library`.'],
              ['Missing', 'If neither the library copy nor the original can be found, the pad shows Missing and stays silent.'],
              ['CLEAR · REVERSE', 'CLEAR removes the pad’s samples and the kit’s sound comes back. REVERSE plays the sample backwards.'],
            ],
          },
        },
        { h3: 'User kits' },
        { p: 'The **User** kit, after the sample kits, starts empty: silent pads waiting for your files. When it is right, press **SAVE** in the EDIT screen: RU-8 stores it as a user kit file (with the samples, the EDIT values and the channel values) in the `User Kits` folder next to the user library. Saved kits step after the User kit with the kit arrows, like the factory kits, and are listed under User kits in the kit list. There is no limit on how many you save. They are named User kit 1, 2 and so on; rename or delete the files in the folder.' },
      ],
    },
    {
      id: 'rear-panel',
      heading: 'Rear panel',
      blocks: [
        { p: 'Turn the machine round with the flip key at the base (B in the standalone).' },
        pic('rear.webp', 1180, 823, 'The RU-8 rear panel: COLOR knobs, the MIDI note map and the stereo output', 'The rear panel: **COLOR**, the **MIDI** note map and the **OUT** section.'),
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
              ['Pads', '16 pads, each with level, tune, decay, pan, two sends, mute and solo, and the EDIT functions (start / end or sweep / noise, attack, fine, filter, resonance, drive, velocity to tone, layer, choke, weight)'],
              ['Kits', 'Synth kits, sample kits, the User kit and your saved user kits'],
              ['Your samples', 'WAV or AIFF, any rate and bit depth, mono or stereo, up to 20 s; up to 8 per pad, played by weighted chance'],
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
