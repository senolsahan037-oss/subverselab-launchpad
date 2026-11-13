// JING FANG owner's manual as a web page: /plugins/jingfang/manual.
// 1.4.0 (7 Nov 2026, J1): the Sign in section and the camera (top-bar row + 'The camera'), from the 1.4 PDF manual
// (subverselab-studio/docs/manual/JingFang_Manual.html) and the 1.4.0 code (Source/plugin/SignIn.cpp, Camera.cpp).
// Source: 01_AI_Tools/subverselab-studio/docs/manual/JingFang_Manual.html (22 Oct 2026, written for JING FANG 1.1.0; updated 28 Oct to
// the 1.2 text below, with new SEQ / DRUM pictures, and public/plugins/jingfang/JingFang_Manual.pdf rebuilt from it). The site
// sells 1.2.0 (released 27 Oct, subverselab-studio/STATUS.md), which adds GENERATE and changes the SEQ page and the MIDI clips;
// those parts follow the shipped 1.2.0 code instead of the manual (Source/plugin/GenPanel.cpp, PluginGenerate.cpp,
// engine/SvlGen.h, MidiClip.cpp; front_seq.png snapshot):
//   - SEQ page: GENERATE strip (ROLL / RHYTHM / NOTES, DENSITY, COMPLEX, MUTATE, RANGE, MICRO, scale, history, WRITES / SEED
//     readout), a piano roll instead of the 16 step knobs, the selected step's NOTE / VEL / GATE / PROB / RATCH / ROW / SLIDE / ACC
//     in a column (the manual's VEL / PROB / RATCH lane selector is gone), chord notes per step (Shift-click).
//   - DRUM page: a GENERATE line (ROLL, < >, DENSITY, COMPLEX, MUTATE, WRITES / SEED).
//   - MIDI clips: plain notes when no step is raised or lowered; with raised or lowered steps MPE-style (a channel per note with
//     its own bend). The manual's "written as a pitch bend at JING FANG's bend range" described 1.1.0.
// Left out: the line on the Han-dynasty theorist the grid is named after (no name meaning / origin), versioned file names,
// the licence row and "no licence key" sentence (gettingIt()), the support / trademark footer, the chapter table.

import { JINGFANG } from '../plugins.js';
import { media } from '../../utils/endpoints.js';
import { installation, gettingIt, manualBase } from './common.js';

const pic = (file, w, h, alt, caption) => ({ img: media(`/plugins/jingfang/${file}`), w, h, alt, caption });

export const JINGFANG_MANUAL = {
  ...manualBase(JINGFANG, {
    subtitle: 'Microtonal Synthesizer · Model JF-53',
    description: 'The JING FANG owner’s manual: quick start, the panel and the preset synthesizer, every section of the sound, the three rows and the tuning grid, the Tuning Lab, PATCH, SEQ with GENERATE, DRUM, JING FANG in your DAW, installation and specifications.',
  }),
  sections: [
    {
      id: 'introduction',
      heading: 'Welcome',
      blocks: [
        { p: 'JING FANG is a full synthesizer that plays like any other, until you open the notes between the keys.' },
        { p: 'Out of the box every key plays its usual note, from a MIDI keyboard, a pad controller, your DAW’s piano roll or the computer keyboard. Nothing has to be set up. Press **MICRO** and every note name can sit on one of three rows: its usual pitch, a step higher or a step lower on a fine grid. Press **LAB** and the Tuning Lab decides every pitch: a tuning learned from a recording, a Scala file, or one of the built-in tunings.' },
        { p: 'Around that sits a complete instrument: three oscillators, a filter, two envelopes, FM, a drum mode, drive, echo and reverb, a patch bay with three LFOs, an arpeggiator, a step sequencer with GENERATE and a drum machine. Every part of the panel takes its settings from a preset of your choice, so new sounds are built out of the ones you already like.' },
      ],
    },
    {
      id: 'installation',
      heading: 'Installation',
      blocks: installation('JING FANG', {
        standalone: true,
        winStandalone: true,
        instrument: true,
        macSteps: [
          'Run the installer package (`.pkg`) you downloaded. It is signed and notarised, and holds the standalone app, the VST3 and the AU instrument.',
          'It puts the app in `/Applications`, the VST3 in `/Library/Audio/Plug-Ins/VST3` and the AU in `/Library/Audio/Plug-Ins/Components`.',
          'Let your DAW rescan its plug-ins; JING FANG appears as an instrument.',
        ],
        winSteps: [
          'If Windows blocks the downloaded files: right-click the zip, choose **Properties**, tick **Unblock**, then extract.',
          'Copy the `.vst3` folder to `C:\\Program Files\\Common Files\\VST3\\`.',
          'Put the standalone app (`JING FANG.exe`) in any folder you like and start it from there.',
          'Let your DAW rescan its plug-ins; JING FANG appears as an instrument.',
        ],
      }),
    },
    {
      id: 'sign-in',
      heading: 'Sign in',
      blocks: [
        { p: 'The first time JING FANG opens on a computer, it asks you to sign in. There is no licence key to type.' },
        pic('manual/signin.webp', 1568, 1024, 'The JING FANG sign-in screen: a code in the middle, CANCEL and OPEN THE PAGE AGAIN under it', 'The sign-in screen while the browser page is open. The code is the one to check on the page.'),
        {
          steps: [
            'Press **SIGN IN WITH SUBVERSELAB**. Your browser opens subverselab.com and the panel shows a short code.',
            'Sign in there with the account that bought JING FANG and check that the code on the page is the one on the panel.',
            'Press **Activate this computer**. A few seconds later the panel opens by itself.',
          ],
        },
        {
          list: [
            '**One purchase, one account.** JING FANG belongs to the subverselab.com account that bought it. Sign in each of your own computers with that account.',
            '**Offline.** After the sign-in JING FANG needs no connection to play. When the computer is online it renews the sign-in by itself every few days; without a connection it keeps playing for 45 days after the last renewal.',
            '**Until it is signed in** the window shows only the sign-in and JING FANG makes no sound. A project keeps every setting meanwhile; nothing in it is lost.',
          ],
        },
      ],
    },
    {
      id: 'quick-start',
      heading: 'Quick start',
      blocks: [
        {
          steps: [
            '**Open it.** Start the standalone app, or put JING FANG on an instrument track in your DAW. A preset is loaded and every key plays its usual note.',
            '**Pick a sound.** The arrows beside the preset name step through whole presets. Click the name for the list.',
            '**Play.** Use a MIDI keyboard, the DAW, the three rows on screen, or the computer keys (standalone): A W S E D F T G Y H U J K, Z / X for the octave.',
            '**Go between the keys.** Press **MICRO**. Click the strip above the keyboard over a note name: that note moves to its high row, again to its low row, again back. Play it: it now sounds one grid step away, in every octave. With the computer keys in MICRO, the Z row plays low, the A row the usual pitch, the Q row high.',
            '**Keep it.** SAVE stores the sound with its rows as your own preset. In a DAW, the project remembers everything with the plug-in.',
          ],
        },
        { note: '**Lost?** Press **?** on the top bar. Numbered markers appear over the panel; each opens a short help beside its section. Esc closes it. Double-click any knob to return it to the value of the preset that is loaded now.' },
        { h3: 'The computer keyboard (standalone app)' },
        {
          list: [
            '**NORMAL:** as in Live: A W S E D F T G Y H U J K play an octave, Z / X move the octave.',
            '**MICRO:** three letter rows play the three rows: Z row low, A row usual, Q row high. The letters are the white keys, Shift sharpens, the left / right arrows move the octave.',
            'Works on QWERTY-type layouts (US, ABC, British, Turkish-QWERTY and similar). In a DAW JING FANG takes no computer keys and asks for no focus.',
          ],
        },
        { p: 'With MICRO on, the keys that sit off their usual pitch light on their row while they play, with their offset in cents.' },
        pic('manual/micro.webp', 1568, 1024, 'The whole JING FANG panel with MICRO on and three note names moved to other rows', 'MICRO on: the keys that sit off their usual pitch light on their row while they play, with their offset in cents.'),
      ],
    },
    {
      id: 'panel',
      heading: 'The panel',
      blocks: [
        { h3: 'The top bar' },
        {
          table: {
            head: ['Control', 'What it does'],
            rows: [
              ['SAVE', 'Saves the sound as your own preset, with its arps, sequences, beats and rows. It offers the preset family of what is loaded.'],
              ['?', 'Help over the panel, one popover per section. It never changes the window size.'],
              ['BPM', 'The tempo. In the standalone app drag or use the wheel; double-click returns to 120. In a DAW it shows the host’s tempo with HOST and a lock, and cannot be changed here.'],
              ['< preset >', 'Loads whole presets. The preset family and name show in the middle.'],
              ['PATCH · SEQ · DRUM', 'Open the patch bay, the arpeggiator and sequencer, and the drum machine, each on its own page. CLOSE returns to the panel.'],
              ['CAMERA', 'On the title band, right of the name. Opens the camera controls (Cmd / Ctrl + K in the standalone app); see below.'],
            ],
          },
        },
        { h3: 'The camera' },
        { p: 'For a recording, a stream or a lesson the window can show a part of the device, closer, instead of all of it. **CAMERA** opens a small set of controls that floats over the panel: a map of the device with a gold frame for what the window shows, **WHOLE**, **FOLLOW**, - and + and the zoom.' },
        { p: 'On the map, click a module to go there, drag the frame to move the view, use the wheel to zoom (up to 4 x). **FOLLOW** moves the camera on its own: to the page that is open (PATCH, SEQ, DRUM, LAB, FX RACK), else to the module you touch. The view glides like the knobs. Drag the title of the controls to put them anywhere; x hides them and the view stays where it is. Only the view moves: every control keeps working where it is, and the sound does not change.' },
        pic('manual/camera.webp', 1400, 392, 'The window zoomed on OSC 1 at 3.9 x, with the camera controls at the top right', 'The camera on OSC 1 at 3.9 x; the controls float at the top right.'),
        { h3: 'The preset synthesizer' },
        pic('manual/presets.webp', 1400, 262, 'The top bar and the strip of preset slots, one slot for every part of the panel', 'One slot for every part of the panel, under the top bar.'),
        { p: 'Under the top bar is a strip of slots, one for each part of the synth: OSC 1, OSC 2, OSC 3, FILTER, AMP ENV, FLT ENV, PITCH, DRIFT, VOICE, FM, TUNING, FX, SEQ and DRUMS. Loading a whole preset fills every slot with its name. Give one slot another preset and **only that part** takes that preset’s settings: the oscillators from a lead, the envelope from a pad, the filter from a bass. Click the left or right of a slot to step, the middle for the list, or use the mouse wheel. A mixed sound shows as Preset synth / Mix; SAVE keeps it as your own preset, with where each part came from.' },
        { p: 'The factory presets come in families: Bass, Bass - 808, Keys - E-Piano, Piano, Organ, Pad, Strings, Choir, Winds, Brass, Guitar, Pluck, Mallet, Bell, Lead, FX, the Drums families (Kick, Snare, Clap, Hat, Perc), Drum Machine, the Arp families (Classic, Chord, Rhythmic, Wide), the Sequence families (Acid, Bass, Drums, Melodic, Pulse, Micro, Lab), and Init.' },
      ],
    },
    {
      id: 'sound',
      heading: 'The sound',
      blocks: [
        pic('manual/voices.webp', 1400, 289, 'OSC 1, OSC 2, OSC 3 and the FILTER section side by side', 'The oscillators and the filter: **LEVEL**, **OCT**, **SEMI**, **FINE** and the second row of each oscillator, **CUTOFF**, **RESO** and **DRIVE** in the filter.'),
        {
          table: {
            head: ['Section', 'Controls', 'What they do'],
            rows: [
              ['OSC 1 · 2 · 3', 'Type, LEVEL, OCT, SEMI, FINE, PAN, PW, DECAY, UNISON, DETUNE, SPREAD, RING, BRIGHT', 'Saw, square (PW sets the width), triangle, sine, white or pink noise, and string, a plucked string: RING is how long it rings, BRIGHT how bright. DECAY fades the oscillator on its own after the note starts (0 = no fade). UNISON stacks up to 8 copies of a saw, square, triangle or sine; DETUNE spreads their pitch, SPREAD their place left to right.'],
              ['FILTER', 'LP · BP · HP · NOTCH, CUTOFF, RESO, DRIVE, KEY, ENV, VEL', 'DRIVE saturates the signal before the filter. KEY makes the cutoff follow the key; ENV moves it with the filter envelope and VEL with velocity, both in octaves.'],
              ['AMP ENVELOPE · FILTER ENVELOPE', 'ATTACK, DECAY, SUSTAIN, RELEASE, three CURVE knobs', 'The level and the filter over time. The curve knobs bend the attack, decay and release stages.'],
              ['PITCH · CLICK · DRUM', 'PITCH, P DEC, P VEL, CLICK, C DEC, C TONE, C VEL, DRUM, D KEY, CHOKE, GATE', 'PITCH adds a falling pitch at the start of every note (kicks, 808s, toms); P DEC is how fast it falls. CLICK is a short noise burst through a high-pass (C TONE). DRUM plays every key at the DRUM pitch; D KEY brings the key back in. CHOKE: a new note cuts the notes of the same group.'],
              ['DRIFT · FLOOR', 'PITCH, LEVEL, RATE, FLOOR', 'Slow random movement of pitch and level for every voice, the life inside a held note. FLOOR puts quiet pink noise under the note.'],
              ['VOICE · OUTPUT', 'POLY · MONO · LEGATO, VOICES, GLIDE, VEL, BEND, LEVEL', 'POLY plays chords (up to 16 voices); MONO and LEGATO play one note, LEGATO without restarting the envelopes. GLIDE slides between notes. VEL: how much velocity changes the level. BEND: the pitch-wheel range in semitones.'],
              ['FM', 'Target 1 · 3 · 1+3, amount', 'Oscillator 2 bends the phase of oscillator 1, 3 or both: a bell, a tine, a growl. Turn oscillator 2’s level down to hear only what it does to the others.'],
              ['DRIVE', 'AMOUNT, TONE, MIX', 'Warms and pushes the sound; TONE darkens or brightens it.'],
              ['ECHO', 'TIME (note length), FEEDBACK, DAMP, MIX; type in FX RACK', 'Repeats in time with the song. FEEDBACK is how many repeats, DAMP darkens each repeat. The type is ping-pong, stereo, mono or tape (a slow wobble and a darker loop).'],
              ['REVERB', 'SIZE, DECAY, PRE, DAMP, MIX', 'A room or a hall. PRE is the gap before the room answers.'],
            ],
          },
        },
        { h3: 'FX RACK' },
        { p: 'The **FX RACK** key in the REVERB title bar opens the rest of the effects. The order is EQ → COMP → DRIVE → MOD → ECHO → REVERB. At their defaults EQ, COMP and MOD do nothing, so a preset or project from an earlier version sounds exactly as before.' },
        {
          table: {
            head: ['Section', 'Controls', 'What it does'],
            rows: [
              ['EQ', 'Low shelf (120 Hz), peak (200 Hz to 8 kHz), high shelf (6 kHz); ±12 dB each', 'Shapes the tone; its curve is drawn live.'],
              ['COMP', 'THRESHOLD (−40 to 0 dB), RATIO (1 to 20), ATTACK (0.5 to 100 ms), RELEASE (20 ms to 1 s), MAKEUP (0 to 24 dB)', 'Evens out the level, both channels together; the transfer curve and the gain reduction are shown.'],
              ['MOD', 'Type (chorus, flanger, phaser), RATE, DEPTH, FDBK, MIX', 'Movement and width in stereo. Changing the type fades over, without a click.'],
            ],
          },
        },
        pic('manual/fx.webp', 1400, 115, 'The DRIVE, ECHO and REVERB sections side by side', 'The three effects on the panel: **DRIVE**, **ECHO** and **REVERB**.'),
        { p: 'The FX slot of the preset synthesizer takes the effects together from one preset.' },
      ],
    },
    {
      id: 'between-the-keys',
      heading: 'Between the keys',
      blocks: [
        { h3: 'Three play modes' },
        {
          table: {
            head: ['Mode', 'What plays'],
            rows: [
              ['NORMAL', 'Every key plays its usual note, from any MIDI keyboard, the host or the computer keys. The default.'],
              ['MICRO', 'Each of the twelve note names plays on its row: low, usual or high, as shown on the strip above the keyboard.'],
              ['LAB', 'The Tuning Lab decides every pitch (next chapter).'],
            ],
          },
        },
        { h3: 'The three rows' },
        { p: 'The keyboard has three rows: the high row on top, the usual keys in the middle, the low row at the bottom.' },
        pic('manual/keys.webp', 1400, 187, 'The three rows of the keyboard with the PLAY mode keys on the left', 'Top: the high row. Middle: the usual keys. Bottom: the low row. Note names above the rows show where each one sits.'),
        { p: 'Rows are set per note name, not per key: moving C moves every C. Click the strip above the keyboard over a note name, or right-click or Alt-click a key, and that note name moves one row (low → usual → high). In MICRO a key that sits off its usual pitch lights on its row while it plays, with its offset in cents. Labels show the note, an arrow and the cents, nothing else.' },
        { p: 'In NORMAL a click on the outer rows sounds one row away; in MICRO a click plays the note where its row puts it.' },
        { h3: 'The TUNING section' },
        pic('manual/tuning.webp', 932, 208, 'The TUNING section: GRID, A4, HIGH ROW, LOW ROW and KEYSWITCH knobs with the step readout', 'The TUNING section with its readout: the grid step in cents and the offsets of the high and low rows.'),
        {
          table: {
            head: ['Control', 'Range', 'What it does'],
            rows: [
              ['GRID', '5 to 96 steps, default 53', 'Divides the octave into equal steps. At 53, one step is 22.64 cents.'],
              ['HIGH ROW · LOW ROW', '0 to 12 steps, default 1', 'How many grid steps the high and the low row are away from the usual note.'],
              ['A4', '415 to 466 Hz, default 440', 'The reference pitch.'],
              ['KEYSWITCH', 'start key MIDI 0 to 104, default C1', 'With KEYSWITCH on, in MICRO, 24 keys from the start key move a note name while you play: the first octave sends it to the low row, the second octave to the high row, pressing again returns it to the usual row. Keyswitches never sound.'],
            ],
          },
        },
        { p: '**Saved with the sound.** Rows, grid, row steps, A4 and keyswitches are preset parameters. SAVE keeps them in your preset, and your DAW project keeps them with the plug-in.' },
      ],
    },
    {
      id: 'tuning-lab',
      heading: 'The Tuning Lab',
      blocks: [
        { p: 'Press **LAB**. While the Lab is on it decides every pitch. It holds two tunings on two cards, **A** and **B**, with the morph between them and the intervals you hold.' },
        pic('manual/lab.webp', 1568, 1024, 'The Tuning Lab: tuning cards A and B, the pitch wheel, the LAB controls and WHAT SOUNDS', 'The Tuning Lab: two cards, A and B, the morph between them and the intervals you hold.'),
        {
          table: {
            head: ['Control', 'What it does'],
            rows: [
              ['LEARN', 'Give it a WAV, AIFF or FLAC recording of a solo line (it reads the first three minutes). It finds the steps the player really used and puts them on the card. When a step sounds lower on the way down than on the way up, it keeps both values. While LEARN is working the other pages wait; the page keys only show their names until it is done. A successful learn switches the Lab on, so the learned tuning plays at once.'],
              ['LOAD', 'Reads Scala files (`.scl`, `.kbm`), or opens the list of built-in 12-key tunings in 53 commas (A4 = 440), maqam tunings among them. A pick puts the tuning on that card and turns the Lab on. Files can also be dropped on a card.'],
              ['DIRECTION', 'Plays a step’s falling value when the melody comes down onto it, and its rising value on the way up.'],
              ['MORPH', 'One knob moves every key from tuning A to tuning B.'],
              ['WHAT SOUNDS', 'For the notes you hold: each interval in cents, the nearest simple ratio (odd limit 15), how far off it is, and how fast it beats, in Hz.'],
              ['ADAPTIVE', 'Lets each new note settle on the 5-limit ratio closest to its tuned pitch, within the WINDOW (default 20 cents). HOME PULL brings chords back toward the tuning; a drift meter shows how far it has moved.'],
              ['EXPORT', 'Writes the tuning back out as `.scl` + `.kbm`, plus a second `_fall.scl` when the tuning is directional.'],
            ],
          },
        },
        { p: '**Presets that use it.** The Sequence - Lab presets each load a built-in tuning onto card A and turn the Lab on. The next ordinary preset turns the Lab off again. The Sequence - Micro presets play phrases that step onto the high and low rows by themselves.' },
      ],
    },
    {
      id: 'patch',
      heading: 'PATCH: three LFOs and cables',
      blocks: [
        { p: 'PATCH opens the cable compartment: three LFOs, the sources on the top row and the destinations below. Drag from a source to a destination to lay a cable; every cable has its own amount. Pull a cable out to move it; drop it anywhere else to remove it. Up to 16 cables.' },
        pic('manual/patch.webp', 1568, 1024, 'The patch bay: three LFOs on the left, sources and destinations with cables, and one amount knob per cable', 'The patch bay: three LFOs, the sources on the top row, the destinations below and one amount knob for every cable.'),
        {
          table: {
            head: ['LFO control', 'Range'],
            rows: [
              ['SHAPE', 'Sine, triangle, saw, square, sample & hold'],
              ['RATE', '0.01 to 100 Hz (free)'],
              ['SYNC', 'Free, or to the tempo: 4/1, 2/1, 1/1, 1/2, 1/4, 1/8, 1/16, 1/32, triplets 1/4T 1/8T 1/16T, dotted 1/4D 1/8D 1/16D'],
              ['RETRIGGER', 'Restarts the LFO with every note'],
              ['FADE', '0 to 10 s fade-in'],
            ],
          },
        },
        {
          table: {
            head: ['Cables', 'What they connect'],
            rows: [
              ['Sources', 'LFO 1, LFO 2, LFO 3, amp envelope, filter envelope, velocity, key, mod wheel, aftertouch, random'],
              ['Destinations', 'Pitch; oscillator 1 / 2 / 3 pitch, level and pulse width; cutoff, resonance, drive, FM, pan, amp; LFO 1 / 2 / 3 rate; unison detune'],
            ],
          },
        },
      ],
    },
    {
      id: 'seq',
      heading: 'SEQ: arpeggiator, sequencer and GENERATE',
      blocks: [
        pic('manual/seq.webp', 1568, 1024, 'The SEQ page: arpeggiator, sequence controls, the GENERATE strip, the piano roll and the selected step column', 'SEQ: the arpeggiator, the SEQUENCE controls, the **GENERATE** strip, the piano roll and the selected step’s column.'),
        { h3: 'Arpeggiator' },
        {
          table: {
            head: ['Control', 'Choices'],
            rows: [
              ['MODE', 'Up, down, up-down, down-up, random, chord, as played'],
              ['OCTAVES', '1 to 4'],
              ['RATE', '1/4, 1/8, 1/8T, 1/16, 1/16T, 1/32'],
              ['GATE · SWING', 'Note length of each step; SWING delays every second step (0.667 is a triplet feel)'],
              ['LATCH', 'Keeps playing after you let go of the keys'],
              ['CHORD', 'One key plays a chord shape: oct, 5th, maj, min, sus2, sus4, maj7, min7, dom7, add9, min9'],
            ],
          },
        },
        { h3: 'Step sequencer' },
        { p: 'Sixteen steps; STEPS sets 1 to 16 of them, RATE as the arpeggiator, plus SWING. PATTERN, CLIP, PLAY and CLEAR sit in the SEQUENCE title bar.' },
        { p: 'The steps are drawn as a piano roll: piano keys on the left, a bar.beat ruler on top, one note per step and a velocity lane underneath. Click an empty step at a key to switch it on with that note; click another key, or drag up and down, to move its note; drag in the VEL lane to set its velocity; double-click a step to switch it off; the mouse wheel scrolls the keys. **Shift-click** above a step’s note adds a chord note to that step, up to three; Shift-click it again to take it out.' },
        { p: 'The column on the right holds the selected step (STEP 1 to 16 and its note): **NOTE**, **VEL**, **GATE**, **PROB** and **RATCH** knobs and **ROW**, **SLIDE** and **ACC** switches. ROW puts that step on the low, usual or high row, so a phrase can step between the keys by itself. PROB is the chance that a step plays; RATCH plays 1 to 4 even hits inside the step. The selector under GENERATE sets the direction: FORWARD, REVERSE, BOUNCE or RANDOM. Random and probability repeat the same way on every pass of a bar, so a bounce or render plays what you heard, and a dragged-out clip contains the ratchets.' },
        {
          list: [
            '**HOLD:** the sequence plays while you hold a key, transposed by it.',
            '**FREE:** it runs on its own; PLAY starts it, again stops it. Go back to the panel and play on top.',
            'Arpeggiator and sequencer together: the arpeggiator gives the note order, the sequencer the rhythm, rests, velocity, gate, slide and accent, and transposes each arp note by the step’s note. With arp mode chord, every step that is on plays all held keys.',
            'CLEAR wipes the steps. On an instrument preset SEQ opens on an empty grid; on an Arp or Sequence preset it edits that preset’s pattern.',
          ],
        },
        { h3: 'GENERATE' },
        { p: 'GENERATE writes a pattern into the sequencer’s steps for the sound that is loaded. What it writes follows the preset: the **WRITES** readout shows MELODY, BASS, CHORDS or ARP RHYTHM (with the arpeggiator on, the arp gives the notes and GENERATE writes the rhythm), and the scale it used. A generated pattern is ordinary steps: edit it in the piano roll, SAVE keeps it in your preset, and CLIP drags it out like any other.' },
        {
          table: {
            head: ['Control', 'What it does'],
            rows: [
              ['ROLL', 'A new pattern for this sound: new rhythm and new notes. It never repeats one of your last 16 rolls.'],
              ['RHYTHM', 'A new rhythm, the same notes (the NOTES seed stays).'],
              ['NOTES', 'New notes, the same rhythm (the RHYTHM seed stays).'],
              ['DENSITY', 'How many steps play. Turning it after a roll adds or removes notes of the same pattern.'],
              ['COMPLEX', 'Off-beats, leaps, ratchets, chance and slides.'],
              ['MUTATE', 'How much of the pattern the next roll changes (1 = all of it, 0.2 = about 3 of 16 steps).'],
              ['RANGE', 'How many keys the line may span.'],
              ['MICRO', 'How often the raised and lowered notes come. It works with the keyboard on MICRO; on NORMAL it is greyed and GENERATE writes whole keys only.'],
              ['Scale', 'AUTO (each roll picks one) or a fixed scale: minor, dorian, phrygian, major, mixolydian, harmonic minor, minor pentatonic, major pentatonic. With the Tuning Lab on, the Lab’s own degrees are used.'],
              ['< >', 'The roll before, and the next one after stepping back.'],
              ['SEED', 'The two seeds of the roll on view, R (rhythm) and N (notes).'],
            ],
          },
        },
      ],
    },
    {
      id: 'drum',
      heading: 'DRUM: the drum machine',
      blocks: [
        pic('manual/drum.webp', 1568, 1024, 'The DRUM page: eight tracks with their sounds and sixteen steps, and the GENERATE line above the step keys', 'DRUM: eight tracks, their sounds and steps, and the **GENERATE** line above the step keys.'),
        { p: 'Eight tracks, each playing a drum sound you pick from the drum presets, with 16 steps. Click a step: on; again: accent; right-click: off. Hold a key to play the beat, or PLAY to run it on its own. RATE as the sequencer. CLEAR wipes the steps.' },
        { p: 'A GENERATE line sits above the step keys: **ROLL** writes a new beat for this kit (never one of your last 16), **< >** steps back and forward through the beats you rolled, **DENSITY** sets how many hits (turning it after a roll adds or removes hits of the same beat), **COMPLEX** adds ghost notes, busier hats and a fill at the end, and **MUTATE** sets how much of the beat the next roll changes. The readout shows the style it wrote (four on the floor, backbeat, breakbeat, half time, three-three-two or sparse) and its seed.' },
        { p: 'On JING FANG’s own clock, start the drums while the sequencer runs (or the other way round) and the second one joins the first one’s grid at its next step. With the host playing, both follow the host’s bar.' },
        { p: 'Arps, sequences and beats are part of a preset, as on a hardware synthesizer. SAVE keeps yours, and the SEQ and DRUMS slots of the preset synthesizer take them from any preset.' },
      ],
    },
    {
      id: 'daw',
      heading: 'In your DAW',
      blocks: [
        { p: 'The DAW is the boss.' },
        {
          table: {
            head: ['Topic', 'How JING FANG behaves'],
            rows: [
              ['Tempo', 'Every BPM readout (panel, SEQ, DRUM) shows the host’s tempo, with HOST and a lock. Its own tempo exists only in the standalone app.'],
              ['PLAY with the host stopped', 'PLAY on SEQ or DRUM previews the pattern. When the host starts, it carries on locked to the host’s bar; when the host stops, it stops.'],
              ['PATTERN · MIDI', 'Each of SEQ and DRUM has a source. PATTERN plays the device’s own pattern. MIDI lets only your DAW’s notes play: on SEQ the notes go straight to the voices; on DRUM, notes 36 to 43 (C1 to G1) hit tracks 1 to 8 and the pattern is silent. One click returns to PATTERN. The choice is saved in the project.'],
              ['MIDI clips out', 'SEQ and DRUM each have a **CLIP** key. Drag it onto a DAW track: the pattern arrives as a MIDI clip (whole bars, at least one; swing and accents written in; chord notes included; DRUM on notes 36 to 43, accent velocity 127, hit 89). Click it instead: the clip is saved to `~/Music/JING FANG/MIDI` and never overwrites a file. A dragged clip arms its unit: the first note that arrives while the host plays switches it to MIDI.'],
              ['Rows in a clip', 'A sequence with no step on its high or low row is written as plain notes, with no pitch bend. With raised or lowered steps the clip is written MPE-style: every note on its own MIDI channel with its own pitch bend, so each note, chord notes too, keeps its cents. The keyboard’s MICRO rows are not in the clip: they live in the project, so the clip played back into JING FANG sounds right.'],
              ['MPE', 'An MPE controller plays with per-note pitch bend, pressure (to level) and slide, CC74 (to brightness). The zones come from the controller’s MPE Configuration Message. A normal note and an MPE note at rest sound the same. In LAB mode MPE notes play without per-note expression.'],
              ['Keyboard and window', 'In a DAW JING FANG takes no computer keys and asks for no focus. The window never changes size.'],
            ],
          },
        },
        { h3: 'Knobs' },
        { p: 'Drag a knob up or down. When a preset or a slot sets new values, the knob drawings glide there in about half a second; the sound changes at once. Double-click returns a knob to the value of the preset that is loaded now.' },
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
              ['Voices', 'Up to 16 (POLY), or MONO / LEGATO with GLIDE'],
              ['Oscillators', '3: saw, square with PW, triangle, sine, white noise, pink noise, plucked string; unison up to 8'],
              ['Filter', 'LP, BP, HP, notch, with drive'],
              ['Modulation', '3 LFOs, 16 cables, 10 sources'],
              ['Tuning', 'Equal grid of 5 to 96 steps (53 default), rows 0 to 12 steps, A4 415 to 466 Hz, 24 keyswitches'],
              ['Tuning Lab', 'Learn from WAV / AIFF / FLAC; Scala .scl / .kbm in and out; built-in tunings in 53 commas; morph A ↔ B; direction; adaptive 5-limit intonation'],
              ['Effects', 'EQ, compressor, drive, chorus / flanger / phaser, echo (ping-pong, stereo, mono, tape), reverb'],
              ['Patterns', 'Arpeggiator, 16-step sequencer with chord notes, VEL / PROB / RATCH and four directions, 8-track × 16-step drum machine, GENERATE for both; MIDI clip drag-out'],
              ['MPE', 'Per-note pitch bend, pressure, slide (CC74)'],
            ],
          },
        },
        { h3: 'Not in this version' },
        { p: 'MTS-ESP, free cents offsets for a single key, a separate sound for each row, and more than 16 sequencer steps.' },
        { h3: 'Help and support' },
        { p: 'Something wrong? Reply to your receipt e-mail, or use **Report a problem** on the Account page. Tell us your system, your DAW and what you did; we read every report.' },
      ],
    },
    { id: 'download', heading: 'Getting JING FANG', blocks: gettingIt(JINGFANG) },
  ],
};
