// ADALET owner's manual as a web page: /plugins/adalet/manual.
// Source: 01_AI_Tools/subverselab-dyneq/docs/manual/Adalet_Manual.html (same text and pictures as
// public/plugins/adalet/Adalet_Manual.pdf). 8 Nov 2026 (1.0.0, LAB is the only panel): rewritten against the 1.0 source
// (Source/PluginProcessor.cpp parameter list, DyneqEngine.h defaults and the TARGET part table, PanelModel.h, the panel's own
// help texts in LabPanels.h / PanelPanels.h, PluginEditor.cpp mouse and keys) and docs/CONTROL_PROOF.md (95 parameters).
// Pictures: the 1.0 ui_snapshot shots on the site (public/plugins/adalet/panel-*.webp and tour/*.webp, the room's views).
// SWEET is listed as it is: in 1.0 the engine does not read it (STATUS C11, open with the owner).

import { ADALET } from '../plugins.js';
import { media } from '../../utils/endpoints.js';
import { installation, gettingIt, manualBase } from './common.js';

const pic = (file, w, h, alt, caption) => ({ img: media(`/plugins/adalet/${file}`), w, h, alt, caption });

export const ADALET_MANUAL = {
  ...manualBase(ADALET, {
    subtitle: 'Dynamic EQ · Model DQ-82',
    description: 'The ADALET owner’s manual: six bands with zero latency, any bell or shelf dynamic, the TARGET, COLLIDE and SELF helpers, ADVANCED and BAKE, DELTA, level-matched BYPASS, kick and bass through the sidechain, every control with its range and default, mouse and keys, installation on macOS and Windows and the specifications.',
  }),
  sections: [
    {
      id: 'introduction',
      heading: 'Welcome',
      blocks: [
        { p: 'ADALET is a dynamic EQ with six bands and zero latency, and three helpers that do the finding, so you can do the deciding.' },
        { p: 'Any bell or shelf can be made dynamic, so it cuts or lifts only while the sound needs it. On top sit three helpers: **TARGET** cuts a named part of a sound, **COLLIDE** clears the room between two tracks, and **SELF** finds resonances in the track it sits on. Because ADALET has no latency, the dry and processed signals line up at any MIX setting.' },
      ],
    },
    {
      id: 'installation',
      heading: 'Installation',
      blocks: installation('ADALET', {
        macSteps: [
          'Run the installer package (`.pkg`) you downloaded: VST3 and AU in one signed installer. It puts the VST3 in `/Library/Audio/Plug-Ins/VST3` and the AU in `/Library/Audio/Plug-Ins/Components`.',
          'Let your DAW rescan its plug-ins; ADALET appears as an audio effect.',
        ],
        winSteps: [
          'If Windows blocks the downloaded files: right-click the zip, choose **Properties**, tick **Unblock**, then extract.',
          'Copy the `.vst3` folder to `C:\\Program Files\\Common Files\\VST3\\`.',
          'Let your DAW rescan its plug-ins; ADALET appears as an audio effect.',
        ],
      }),
    },
    {
      id: 'quick-start',
      heading: 'Quick start',
      blocks: [
        {
          steps: [
            '**Put ADALET on a track.** It opens with six empty band slots; an empty slot does not touch the audio.',
            '**Add a band.** Double-click the display where you hear the problem, or select an empty slot and press ON. Drag the node: left and right is frequency, up and down is gain. The row under the display holds the selected band’s settings.',
            '**Make it dynamic.** On a bell or shelf, set RANGE (anything but OFF) and THRESHOLD: the band moves only while the sound passes the threshold.',
            '**Let a helper find it.** Pick an instrument and a part in TARGET, or route another track to the sidechain and use COLLIDE.',
            '**Check it.** Hold DELTA (or the D key) to hear only what is being cut; press BYPASS to compare at the same loudness.',
          ],
        },
      ],
    },
    {
      id: 'panel',
      heading: 'The panel',
      blocks: [
        pic('panel-default.webp', 1600, 720, 'ADALET as it opens: six empty band slots above an empty display',
          'How ADALET opens: six empty slots above the display, TARGET and SELF off, COLLIDE lit (here with a KEY track routed).'),
        {
          table: {
            head: ['Area', 'What it holds'],
            rows: [
              ['Top row', 'The three helpers, each with its lamp and what it is doing (TARGET, COLLIDE, SELF); click one to open its settings. IN and OUT meters; PRE, POST and KEY for the analyzer; DELTA; BYPASS.'],
              ['Band row', 'Six slots, numbered 1 to 6. A used slot shows its shape, frequency and gain or slope; an empty one shows **+**. SIZE at the right sets the window to 75, 85 or 100 %.'],
              ['Display', 'The response curve the engine really applies, the nodes of the bands, the helpers’ cuts and the analyzer. Point at a node to read what the band does now.'],
              ['Control row', 'The selected band: ON, shape, SLOPE, FREQ, GAIN, Q, RANGE, THRESHOLD, the **…** key (ATTACK, RELEASE, TRIGGER) and DELETE. With no band selected it says what to do.'],
              ['Bottom right', 'ADVANCED (focus, MIX, SWEET, TILING, LEVEL MATCH, BAKE) and OUTPUT. The SubverseLab mark opens subverselab.com.'],
            ],
          },
        },
        pic('tour/readout.webp', 1400, 443, 'The display with band 5 pointed at, showing its own gain, the COLLIDE cut and the net',
          'Point at a node: band 5, a bell at 292 Hz set to +4.0 dB, reads −3.2 dB from COLLIDE with the KEY track playing, net −3.2 dB.'),
      ],
    },
    {
      id: 'bands',
      heading: 'The bands',
      blocks: [
        { p: 'Six bands, any bell or shelf of them dynamic. A slot that has never been used is UNUSED and does not touch the audio; ON starts it as a bell at 0 dB. Each slot starts at its own frequency (80 Hz, 200 Hz, 500 Hz, 1.2 kHz, 3 kHz, 8 kHz), so a new band never hides under another.' },
        pic('panel-dynamic.webp', 1600, 720, 'Band 4 selected and made dynamic, with its control row and the dynamic settings open',
          'Band 4, a bell at 1.02 kHz and +3.0 dB, made dynamic: RANGE −6.0 dB from THRESHOLD −30.0 dB; the **…** key shows ATTACK 10 ms, RELEASE 100 ms and TRIGGER SELF.'),
        {
          table: {
            head: ['Control', 'Range', 'Default', 'What it does'],
            rows: [
              ['ON', 'on / off', 'off (unused)', 'Switches the band on or off without losing its settings. Alt-click on a node does the same.'],
              ['Shape', 'Bell, low shelf, low cut, high shelf, high cut, notch', 'Bell', 'The filter shape. Picking a shape switches the band on.'],
              ['FREQ', '20 Hz to 20 kHz', '80 Hz … 8 kHz by slot', 'Centre or corner frequency.'],
              ['GAIN', '−18 to +18 dB', '0 dB', 'Static boost or cut (bell and shelves).'],
              ['Q', '0.1 to 18', '1.0', 'Width of a bell or notch. On a cut, Q above 1 adds a resonant peak at the corner.'],
              ['SLOPE', '12, 24, 36, 48 or 72 dB/oct', '12 dB/oct', 'Steepness of the low and high cuts.'],
              ['RANGE', '−12 to +12 dB', 'OFF (0 dB)', 'Anything but OFF makes a bell or shelf dynamic: how far it moves once the level is over the threshold. Negative cuts, positive lifts.'],
              ['THRESHOLD', '−60 to 0 dB', '−30 dB', 'The level where the band starts to move.'],
              ['ATTACK', '1 to 100 ms', '10 ms', 'How fast it moves in.'],
              ['RELEASE', '10 to 1000 ms', '100 ms', 'How fast it returns.'],
              ['TRIGGER', 'SELF or KEY', 'SELF', 'SELF: the band listens to its own range in this track. KEY: to the same range in the sidechain.'],
              ['DELETE', '–', '–', 'Sets every value of the band back to its default; the slot shows **+** again. Cmd+Z brings it back.'],
            ],
          },
        },
        pic('tour/menu.webp', 436, 786, 'A band’s menu: shape, slope, switch off and delete',
          'A band’s menu (right-click its node): the six shapes, the five slopes, SWITCH OFF and DELETE.'),
        pic('tour/resonance.webp', 1400, 443, 'Band 1 as a 72 dB/oct low cut at 140 Hz with a resonant peak',
          'Band 1 as a LOW CUT at 140 Hz, 72 dB/oct, Q 6.00: the resonant peak at the corner. Band 5 is switched off and its node is dimmed.'),
      ],
    },
    {
      id: 'target',
      heading: 'TARGET',
      blocks: [
        { p: 'Tell ADALET the instrument and the part, and it learns where that part sits in this material from the hits, then cuts it by AMOUNT. TARGET is static once it has learned, and needs no sidechain. To balance a kick against a bass, use COLLIDE with the kick on KEY instead (see Kick and bass).' },
        pic('panel-target.webp', 1600, 720, 'TARGET open on KICK - SUB, learned from 8 hits and cutting',
          'TARGET on KICK · SUB, learned from 8 hits and cutting: AMOUNT 9.0 dB, WIDTH 1.00, SLOPE 48 dB/oct.'),
        {
          table: {
            head: ['Instrument', 'Parts'],
            rows: [
              ['KICK', 'SUB, BODY, MUD, BOX, CLICK'],
              ['SNARE', 'BODY, BOX, CRACK, SNAP/AIR, REVERB-READY'],
              ['HATS', 'CHICK, BITE, SHIMMER'],
              ['BASS', 'SUB, BODY, MUD, TOP'],
              ['VOCAL', 'BOX, NASAL, HARSH, S, REVERB-READY'],
              ['DRUMS', 'KICK BODY, SNARE BODY, HATS SHIMMER'],
            ],
          },
        },
        pic('panel-target-list.webp', 1600, 720, 'The TARGET list of instruments and parts, scrolled down',
          'The list, scrolled down past the KICK parts. REVERB-READY (snare, vocal) replaces the part cut by a static band-limit learned from the body.'),
        {
          table: {
            head: ['Control', 'Range', 'Default', 'What it does'],
            rows: [
              ['TARGET ON', 'on / off', 'off', 'The lamp. Off leaves TARGET out completely.'],
              ['INSTRUMENT · PART', 'OFF, or the list above', 'OFF', 'A new choice moves the cut at the next hit.'],
              ['AMOUNT', '0 to 60 dB', '6 dB', 'How much of the part is cut. A bell stops at 18 dB; the top of the range is a real high-pass or low-pass on an edge cut.'],
              ['WIDTH', '0.5 to 2', '1.00', 'How wide the cut is around the part.'],
              ['SLOPE', '12, 24, 36, 48 or 72 dB/oct', '24 dB/oct', 'Steepness of the edge cuts (SUB, CLICK and REVERB-READY).'],
            ],
          },
        },
        { h3: 'What the display says' },
        { p: 'While it learns, the status line says where it is: `LISTENING - PLAY THE TRACK: NO HIT HEARD YET`, then `LISTENING - N HITS HEARD, M OF 3 LEARNED`, then `LEARNED FROM N HITS - CUTTING`. Until three hits are learned it cuts nothing. When a hit cannot be used it says why: `HITS TOO CLOSE TOGETHER`, `HITS TOO SHORT`, `NO PITCHED BOOM FOUND` or `THE PART WAS NOT FOUND`. Play the part of the song where the instrument is clearest.' },
      ],
    },
    {
      id: 'collide-self',
      heading: 'COLLIDE and SELF',
      blocks: [
        { p: 'COLLIDE and SELF share one engine: lighting one darkens the other. Click its name in the top row to open its settings; the lamp switches it off without losing them.' },
        { h3: 'COLLIDE: two sounds stop masking each other' },
        pic('panel-collide.webp', 1600, 720, 'COLLIDE open with a KEY routed: KEY LISTEN, DEPTH, MARGIN and SPEED',
          'COLLIDE with a KEY track routed: DEPTH 6.0 dB, MARGIN 3.0 dB, SPEED MEDIUM.'),
        { p: 'Route a KEY track (the kick, the vocal) to ADALET’s sidechain input in your DAW. COLLIDE cuts this track only where the KEY track is loud, and only while it is. KEY LISTEN lets you hear the sidechain to check the routing; with no key routed the top row reads NO KEY.' },
        { h3: 'Kick and bass: use the sidechain' },
        { p: 'Put ADALET on the bass, route the kick to KEY, turn COLLIDE on and set FOCUS LOW (in ADVANCED) to 40 Hz. Only the kick itself can tell ADALET where its low end sits, and it differs from kick to kick; with the kick on KEY the bass makes room where the two meet, and only while the kick plays. FOCUS LOW 40 Hz lets the cut reach down to the kick’s fundamental. The KICK and BASS parts of TARGET shape one track on its own and do not know where the other one sits.' },
        { h3: 'SELF: resonances in this track' },
        pic('panel-self.webp', 1600, 720, 'SELF open: DEPTH and SENS',
          'SELF on: DEPTH 6.0 dB, SENS 3.0 dB.'),
        { p: 'SELF needs no sidechain. It finds the resonances that stick out of the track it sits on and cuts them while they ring. In SELF the MARGIN knob becomes SENS: how far a peak must stand out before it is cut.' },
        {
          table: {
            head: ['Control', 'Range', 'Default', 'What it does'],
            rows: [
              ['COLLIDE ON · SELF ON', 'one of the two', 'COLLIDE', 'Which helper listens all the time; its lamp turns it off.'],
              ['DEPTH', '0 to 12 dB', '6 dB', 'The largest cut in any band.'],
              ['MARGIN / SENS', '0 to 12 dB', '3 dB', 'COLLIDE: how far the KEY should lead this track. SELF: how far a peak must stand out.'],
              ['SPEED', 'FAST, MEDIUM, SLOW', 'MEDIUM', 'How quickly the cut lets go: a release of 40, 120 or 300 ms.'],
              ['KEY LISTEN', 'on / off', 'off', 'Plays the sidechain alone, to check the routing (COLLIDE).'],
            ],
          },
        },
      ],
    },
    {
      id: 'advanced',
      heading: 'ADVANCED and BAKE',
      blocks: [
        { p: 'ADVANCED, bottom right, opens a strip over the display with the settings you set once per track, and BAKE.' },
        pic('panel-bake.webp', 1600, 720, 'ADVANCED open after a BAKE: three static bells and COLLIDE switched off',
          'After APPLY: what COLLIDE cut over 6.0 s of playing is now three static bells, bands 1, 2 and 3, and COLLIDE is off.'),
        {
          table: {
            head: ['Control', 'Range', 'Default', 'What it does'],
            rows: [
              ['FOCUS LOW · HIGH', '40 Hz to 16 kHz', '120 Hz · 8 kHz', 'COLLIDE and SELF never cut outside the focus.'],
              ['MIX', '0 to 100 %', '100 %', 'Dry and processed together; with zero latency there is nothing to align.'],
              ['SWEET', '20 to 400 ms', '120 ms', 'Saved with the session; in this version it does not change the sound.'],
              ['TILING', 'on / off', 'off', 'COLLIDE’s analysis bands meet at −3 dB instead of −12 dB: harder carve edges. Off is soft.'],
              ['LEVEL MATCH', 'on / off', 'on', 'BYPASS plays the unprocessed track at the loudness of the processed one.'],
              ['BAKE ARM · RESET · APPLY', '–', '–', 'Freeze what COLLIDE cuts into static bells, below.'],
            ],
          },
        },
        { h3: 'BAKE: freeze COLLIDE into static bands' },
        {
          steps: [
            '**BAKE ARM.** BAKE starts listening. While COLLIDE cuts (its lamp on, a key routed) and the track plays, it adds up where and how deep it cut. Arming again starts from zero; RESET forgets what it has heard without touching the bands.',
            '**Play the part with the collisions.** The BAKE line counts the seconds heard and the bells ready, and names what APPLY will write.',
            '**APPLY.** The bells go into the empty bands and COLLIDE switches off, so you hear the static EQ. Cmd+Z returns to the dynamic cut, Cmd+Shift+Z bakes again.',
          ],
        },
        pic('tour/bake.webp', 1400, 255, 'The ADVANCED strip with the BAKE line and the APPLY help',
          'The ADVANCED strip after APPLY, with the help for step 3 open.'),
      ],
    },
    {
      id: 'listening',
      heading: 'Listening',
      blocks: [
        pic('panel-delta.webp', 1600, 720, 'DELTA held: the display reads DELTA - ONLY WHAT IS CUT',
          'DELTA held: you hear only what is being cut.'),
        {
          table: {
            head: ['Control', 'Range', 'What it does'],
            rows: [
              ['DELTA', 'hold', 'Hear only what is being cut. Holding the D key does the same.'],
              ['BYPASS', 'on / off', 'With LEVEL MATCH on (the default) the dry signal plays at the loudness the processing has, so a comparison is not decided by loudness.'],
              ['OUTPUT', '−12 to +12 dB (0 dB)', 'A gain after everything.'],
              ['PRE · POST', 'off, PRE, POST, both', 'The analyzer: the input, the output (POST, the default) or both. It never changes the sound.'],
              ['KEY', 'on / off', 'Draws the sidechain as a thin line while COLLIDE is on and a key is routed.'],
              ['IN · OUT', '–', 'Level meters.'],
            ],
          },
        },
      ],
    },
    {
      id: 'mouse-keys',
      heading: 'Mouse and keys',
      blocks: [
        {
          table: {
            head: ['Do', 'To'],
            rows: [
              ['Double-click the display', 'Add a band at that frequency and gain.'],
              ['Drag a node', 'Frequency and gain (on a notch or cut: frequency and Q). Shift for fine moves, Alt for one axis, Cmd for Q.'],
              ['Double-click a node', 'Type its frequency.'],
              ['Alt-click a node', 'Switch the band on or off.'],
              ['Right-click a node', 'Its menu: shape, slope, switch off, delete.'],
              ['Wheel over a node', 'Q; on a cut, the slope (Shift + wheel for Q); Alt + wheel for RANGE.'],
              ['Keys 1 to 6', 'Select a band. Esc closes a popover, then deselects.'],
              ['Arrow keys', 'Left / right: frequency (Shift: a semitone); up / down: gain (Shift: 1 dB).'],
              ['Delete or Backspace', 'Delete the selected band. B switches it on or off; Return types its frequency (or starts an empty slot); Tab steps through the row.'],
              ['Hold D', 'DELTA.'],
              ['Cmd+Z · Cmd+Shift+Z', 'Undo and redo (Ctrl on Windows, where Ctrl+Y also redoes).'],
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
            head: ['Item', 'ADALET'],
            rows: [
              ['Formats', 'macOS 11 or later (Apple Silicon and Intel): VST3, AU · Windows (64-bit): VST3'],
              ['Latency', 'Zero'],
              ['Bands', '6: bell, low shelf, high shelf, notch, low cut, high cut; cuts 12 to 72 dB/oct'],
              ['Dynamics', 'Per bell or shelf: range ±12 dB, threshold, attack, release, self or sidechain trigger'],
              ['Helpers', 'TARGET (instrument parts, learned from the hits), COLLIDE (sidechain), SELF (resonances); BAKE freezes COLLIDE into static bells'],
              ['Monitoring', 'DELTA, level-matched BYPASS, analyzer PRE / POST / KEY'],
              ['Window', '75, 85 or 100 %'],
            ],
          },
        },
        { h3: 'Help and support' },
        { p: 'Downloads and updates: **subverselab.com → Account**. Something wrong? Reply to your receipt e-mail, or use **Report a problem** on the Account page. Tell us your system, your DAW and what you did; we read every report.' },
        { p: 'ADALET, the DQ-82 model plate and the panel design are SubverseLab’s. VST is a registered trademark of Steinberg Media Technologies GmbH. Audio Units and macOS are trademarks of Apple Inc. Windows is a trademark of Microsoft Corporation.' },
      ],
    },
    { id: 'download', heading: 'Getting ADALET', blocks: gettingIt(ADALET) },
  ],
};
