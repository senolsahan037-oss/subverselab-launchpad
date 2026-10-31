// ADALET owner's manual as a web page: /plugins/adalet/manual.
// Source: 01_AI_Tools/subverselab-dyneq/docs/manual/Adalet_Manual.html (20 Oct 2026; same text as
// public/plugins/adalet/Adalet_Manual.pdf). ADALET is not on sale: the newest build is the 0.9.1-test2 tester build
// (26 Oct, subverselab-dyneq/STATUS.md). Its parameter ranges are the ones below (checked in Source/PluginProcessor.cpp and
// ParamText.h, 28 Oct); since 20 Oct only panel wording and the drawing changed (band row ACTIVE / BYPASSED / UNUSED, BAKE
// status lines), and the manual leaves BAKE out, so this page does too. Left out: price (no checkout yet) and the manual's
// download paragraph (replaced by gettingIt()). The install table became the Installation section; the display messages,
// in italics in the manual, are set as `code`.

import { ADALET } from '../plugins.js';
import { installation, gettingIt, manualBase } from './common.js';

export const ADALET_MANUAL = {
  ...manualBase(ADALET, {
    subtitle: 'Dynamic EQ · Model DQ-82',
    description: 'The ADALET owner’s manual: six bands with zero latency, any bell or shelf dynamic, the TARGET, COLLIDE and SELF helpers, DELTA, level-matched BYPASS, the LAB and ORBIT faces, installation on macOS and Windows and the specifications.',
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
      id: 'quick-start',
      heading: 'Quick start',
      blocks: [
        {
          steps: [
            '**Put ADALET on a track.** Six bands sit ready at 80 Hz, 200 Hz, 500 Hz, 1.2 kHz, 3 kHz and 8 kHz, flat.',
            '**Shape it.** Click a band chip or drag its point on the display: left and right is frequency, up and down is gain. The control row below the display holds the selected band’s settings.',
            '**Make it dynamic.** Switch DYNAMIC on for a bell or a shelf, set RANGE and THRESHOLD: the band moves only while the sound crosses the threshold.',
            '**Let a helper find it.** Pick an instrument and a part in TARGET, or route another track to the sidechain and use COLLIDE.',
            '**Check it.** Hold DELTA to hear only what is being cut; press BYPASS to compare at the same loudness.',
          ],
        },
      ],
    },
    {
      id: 'bands',
      heading: 'The bands',
      blocks: [
        { p: 'The LAB face is one screen with numbered band chips, the display and one control row. Six bands, any of them dynamic.' },
        {
          table: {
            head: ['Control', 'Range', 'What it does'],
            rows: [
              ['ON', 'on / off', 'Each band is switched on or off on its own.'],
              ['TYPE', 'Bell, low shelf, high shelf, notch, low cut, high cut', 'The filter shape.'],
              ['FREQ', '20 Hz to 20 kHz', 'Centre or corner frequency.'],
              ['GAIN', '−18 to +18 dB', 'Static boost or cut (bell and shelves).'],
              ['Q', '0.1 to 18', 'Width of a bell or notch; resonance of a cut.'],
              ['SLOPE', '12, 24, 36, 48 or 72 dB/oct', 'Steepness of the low and high cuts.'],
              ['DYNAMIC', 'on / off', 'Makes a bell or shelf move with the level.'],
              ['RANGE', '−12 to +12 dB', 'How far the band moves when the level is over the threshold: negative cuts, positive lifts.'],
              ['THRESHOLD', '−60 to 0 dB', 'The level where the band starts to move.'],
              ['ATTACK', '1 to 100 ms', 'How fast it moves in.'],
              ['RELEASE', '10 to 1000 ms', 'How fast it returns.'],
              ['TRIGGER', 'SELF or KEY', 'SELF: the band listens to its own frequency range in this track. KEY: it listens to the same range in the sidechain.'],
            ],
          },
        },
      ],
    },
    {
      id: 'target',
      heading: 'TARGET',
      blocks: [
        { p: 'Tell ADALET the instrument and the part, and it learns where that part sits in this material from the hits, then cuts it by AMOUNT. TARGET is static once it has learned, and needs no sidechain.' },
        {
          table: {
            head: ['Instrument', 'Parts'],
            rows: [
              ['VOCAL', 'BOX, NASAL, HARSH, S, REVERB-READY'],
              ['BASS', 'SUB, BODY, TOP'],
              ['DRUMS', 'KICK BODY, SNARE BODY, HATS SHIMMER'],
              ['KICK', 'SUB, BODY, CLICK'],
              ['SNARE', 'BODY, CRACK, SNAP/AIR, REVERB-READY'],
              ['HATS', 'CHICK, SHIMMER'],
            ],
          },
        },
        {
          table: {
            head: ['Control', 'Range', 'What it does'],
            rows: [
              ['INSTRUMENT · PART', 'OFF, or the lists above', 'OFF leaves TARGET out. A new choice moves the cut at the next hit.'],
              ['AMOUNT', '0 to 60 dB', 'How much of the part is cut. A bell stops at 18 dB; the top of the range is a real high-pass or low-pass on an edge cut.'],
              ['WIDTH', '0.5 to 2', 'How wide the cut is around the part.'],
              ['SLOPE', '12, 24, 36, 48 or 72 dB/oct', 'Steepness of the edge cuts.'],
            ],
          },
        },
        { h3: 'What the display says' },
        { p: 'While it learns, the display tells you where it is: `LISTENING – PLAY THE TRACK`, then `LISTENING – N HITS HEARD, M OF 3 LEARNED`, then `LEARNED FROM N HITS – CUTTING`. When a hit cannot be used it says why: `HITS TOO CLOSE TOGETHER`, `HITS TOO SHORT`, `NO PITCHED BOOM FOUND` or `THE PART WAS NOT FOUND`. Play the part of the song where the instrument is clearest.' },
      ],
    },
    {
      id: 'collide-self',
      heading: 'COLLIDE and SELF',
      blocks: [
        { note: 'An example: band 4 made dynamic, with TARGET (KICK · SUB) and COLLIDE (KEY) on above it.' },
        { p: 'MODE chooses the helper that listens all the time: **COLLIDE** or **SELF**. Its lamp turns it off without losing its settings.' },
        { h3: 'COLLIDE: two sounds stop masking each other' },
        { p: 'Route a KEY track (the kick, the vocal) to ADALET’s sidechain input in your DAW. COLLIDE cuts this track only where the KEY track is loud, and only while it is. KEY LISTEN lets you hear the sidechain to check the routing.' },
        { h3: 'SELF: resonances in this track' },
        { p: 'SELF needs no sidechain. It finds the resonances that stick out of the track it sits on and cuts them while they ring. In SELF the MARGIN knob becomes SENS: how far a peak must stand out before it is cut.' },
        {
          table: {
            head: ['Control', 'Range', 'What it does'],
            rows: [
              ['DEPTH', '0 to 12 dB', 'The largest cut in any band.'],
              ['MARGIN / SENS', '0 to 12 dB', 'COLLIDE: how far the KEY should lead this track. SELF: how far a peak must stand out.'],
              ['FOCUS LOW · HIGH', '40 Hz to 16 kHz', 'Bands outside the focus are never cut.'],
              ['SPEED', 'FAST, MEDIUM, SLOW', 'How quickly the cut lets go.'],
              ['MIX', '0 to 100 %', 'Dry and processed together; with zero latency there is nothing to align.'],
            ],
          },
        },
      ],
    },
    {
      id: 'listening',
      heading: 'Listening and faces',
      blocks: [
        {
          table: {
            head: ['Control', 'What it does'],
            rows: [
              ['DELTA', 'Hold to hear only what is being cut.'],
              ['BYPASS', 'Level-matched: the dry signal plays at the loudness the processing has, so a comparison is not decided by loudness.'],
              ['OUTPUT', '−12 to +12 dB.'],
              ['ANALYZER', 'OFF, PRE, POST (default) or PRE+POST. The curve on screen is the engine’s own response.'],
              ['LAB · ORBIT', 'Two faces for the same settings; the choice is saved with the project.'],
            ],
          },
        },
        { p: 'The ORBIT face is a round instrument case with rings and pushers. It edits the same settings as LAB.' },
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
              ['Helpers', 'TARGET (instrument parts, learned from the hits), COLLIDE (sidechain), SELF (resonances)'],
              ['Monitoring', 'DELTA, level-matched BYPASS, analyzer PRE / POST'],
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
