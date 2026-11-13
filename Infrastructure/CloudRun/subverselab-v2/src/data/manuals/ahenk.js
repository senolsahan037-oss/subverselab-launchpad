// AHENK owner's manual as a web page: /plugins/ahenk/manual.
// Source: 01_AI_Tools/subverselab-fazilsay/docs/manual/AHENK_Manual.html (AHENK 1.0, 7 Nov 2026; the same text as
// public/plugins/ahenk/AHENK_Manual.pdf, 19 pages). The iPhone / iPad chapter is not in that manual (it waits in
// _ios_section_for_later.html) and is not here either: no iOS or App Store text until the owner says so.
// Left out: the pictures (the manual blocks have no picture type; the page image is AHENK's stage panel, HERO_IMG), the chapter
// table, the number of factory setups (no preset counts, as RU-8; the setups are still named), "ORIGINAL and 8 others" (the types
// are named instead), the trademark footer. "Getting AHENK" uses the room's own buy and sign-in words (gettingIt(), AHENK_ACTIVATION)
// plus the trial lines from plugins.js; its steps name the Windows setup program instead of gettingIt()'s "Windows zip".
// The credits stay: the recordings are CC BY and must be named.

import { AHENK, AHENK_TRIAL_LINE, AHENK_FREE_AFTER_LINE } from '../plugins.js';
import { media } from '../../utils/endpoints.js';
import { installation, gettingIt, manualBase } from './common.js';

const pic = (file, w, h, alt, caption) => ({ img: media(`/plugins/ahenk/${file}`), w, h, alt, caption });

export const AHENK_MANUAL = {
  ...manualBase(AHENK, {
    subtitle: 'Sampled Piano on a Stage',
    description: 'The AHENK owner’s manual: installing on macOS and Windows and choosing the pianos, the 30-day trial and free mode, signing in, the panel, the pianos, the nine microphone positions, the halls, stage setups, playing with MIDI, pedals and computer keys, the SCORE page, writing notes, troubleshooting, specifications and credits.',
    imageAlt: 'AHENK’s stage: the concert grand with two microphones, the PIANO RACK, the MIC RACK and the keyboard',
  }),
  sections: [
    {
      id: 'introduction',
      heading: 'Welcome',
      blocks: [
        { p: 'AHENK is a sampled piano that you place on a stage. You choose the piano, put microphones where they were really recorded, pick the hall, and play it, or let it play a score.' },
        { p: 'Every piano in AHENK comes from real recordings, note by note and at many strengths. Around the piano stand nine microphone positions. Some of them are the microphones the piano was recorded with; the others are computed from those recordings, so every position can be heard on every piano. Each microphone has its own level, a choice of microphone character, and its own reverb, delay and echo. Behind everything sits the hall: the room the piano was recorded in, three measured rooms or two built ones.' },
        { p: 'The **SCORE** page opens a sheet of music saved as MusicXML or MIDI and plays it on the piano that is on stage, with loop, tempo, count-in and a mute or solo for each hand. You can also write your own notes there, from the computer keyboard, the mouse or a MIDI keyboard, and save them as MusicXML or MIDI.' },
      ],
    },
    {
      id: 'installation',
      heading: 'Installation',
      blocks: installation('AHENK', {
        standalone: true,
        winStandalone: true,
        instrument: true,
        macSteps: [
          'Needs macOS 11 or later. Run the installer package (`.pkg`) you downloaded. It holds the standalone app, the VST3 and the Audio Unit instrument and the piano data, and is universal: it runs natively on Apple Silicon and Intel Macs.',
          'To leave out pianos you do not want, click **Customize** (see Choosing the pianos below).',
          'It puts the app in `/Applications/AHENK.app`, the VST3 in `/Library/Audio/Plug-Ins/VST3/AHENK.vst3` and the AU in `/Library/Audio/Plug-Ins/Components/AHENK.component`.',
          'Let your DAW rescan its plug-ins; AHENK appears as an instrument.',
        ],
        winSteps: [
          'Needs Windows 10 or 11, 64-bit. Run the setup program you downloaded. It installs the standalone app and the VST3 instrument, and comes with an uninstaller.',
          'Pick **Everything**, or **Choose the pianos** to leave some out (see below).',
          'The VST3 goes to `C:\\Program Files\\Common Files\\VST3\\AHENK.vst3`, the app to `C:\\Program Files\\SubverseLab\\AHENK\\AHENK.exe`, with a Start menu entry.',
          'Let your DAW rescan its plug-ins; AHENK appears as an instrument.',
        ],
        extra: [
          { note: 'There is no licence key to type. See Trial and purchase.' },
          { h3: 'Choosing the pianos' },
          { p: 'The installer carries the program and the piano data together. Each piano is a separate choice, so you can leave out the ones you do not want and save disk space. On macOS click **Customize** in the installer; on Windows pick **Choose the pianos** instead of **Everything**. Every choice is on unless you switch it off.' },
          {
            table: {
              head: ['Choice in the installer', 'What it holds', 'On disk'],
              rows: [
                ['Microphone models and hall images', 'Needed for the computed microphone positions and the hall pictures. Install it with any piano.', '31 MB'],
                ['Concert grand', 'Two recorded microphone positions (LIP and LID ORTF).', '1.42 GB'],
                ['Studio grand', 'One recorded pair (LID ORTF).', '563 MB'],
                ['Upright', 'One recorded pair (LID ORTF); a felt-damped upright.', '224 MB'],
                ['Baby grand', 'One recorded pair (LIP).', '202 MB'],
                ['All of it', '', '2.44 GB'],
              ],
            },
          },
          { p: 'The installer’s own titles name the source recordings of the studio grand, the upright and the baby grand (Salamander, Meta Piano, City Piano); see Credits and licences.' },
          { h3: 'Where the piano data lives' },
          {
            table: {
              head: ['System', 'Data folder'],
              rows: [
                ['macOS', '`~/Library/Application Support/SubverseLab/AHENK` (in your user Library; the installer moves the data there for the user who is logged in)'],
                ['Windows', '`%LOCALAPPDATA%\\SubverseLab\\AHENK` (for the account that runs the setup)'],
              ],
            },
          },
          { p: 'Inside it, `Samples` holds the pianos, the microphone models and the hall images, and `Setups` holds the stage setups you save. The piano data is stored losslessly compressed (FLAC). AHENK reads it from the disk while it plays, so a fast internal disk is best.' },
          { note: '**Uninstalling on Windows:** Settings → Apps → AHENK. It removes what the setup installed, the piano data included, and keeps your Setups folder.' },
        ],
      }),
    },
    {
      id: 'trial',
      heading: 'Trial and purchase',
      blocks: [
        { h3: 'The 30-day trial' },
        { p: 'The installer is a free download from the AHENK page on subverselab.com: sign in with a free SubverseLab account (no card) and choose **Download free trial** for macOS or Windows. Buying AHENK, or signing in with the account you bought it with, opens everything at any time.' },
        { p: 'The first time AHENK opens on a computer, its 30-day trial starts: everything in AHENK is open, nothing is marked. The line under the name counts down (`TRIAL: 23 DAYS LEFT`). AHENK confirms the trial with subverselab.com when it is online; if the first start is offline, the trial starts on that day and is confirmed the next time AHENK is online. Installing again does not start a new trial.' },
        { h3: 'After the trial: free mode' },
        { p: 'When the trial is over and AHENK is not bought, it keeps playing for free. The line under the name reads `FREE MODE: UNLOCK`; a click on it, or on anything that is locked, opens the **FULL VERSION** box.' },
        {
          table: {
            head: ['Stays free', 'Opens with the purchase'],
            rows: [
              ['The upright, played from the panel keys, a MIDI keyboard (with the pedals) or the computer keys', 'The concert grand, the studio grand and the baby grand'],
              ['Two microphones, LIP and LID ORTF, with their LEVEL; OUT', 'The other seven microphones, TYPE, ROOM, REVERB, DELAY and ECHO'],
              ['The recorded room and the factory setup Stage', 'The other halls, the other factory setups, LIST and SAVE'],
              ['', 'The SCORE page: opening, playing and writing scores, SAVE AS, MIDI export and drag'],
            ],
          },
        },
        { p: 'A project or setup that uses locked settings keeps them: in free mode they are not applied, and they come back as they were once AHENK is unlocked.' },
        pic('manual/unlock-box.webp', 920, 460, 'The FULL VERSION box with the buttons SIGN IN WITH SUBVERSELAB, BUY AHENK and CLOSE', 'The **FULL VERSION** box in free mode on the Mac.'),
        { h3: 'Sign in with SubverseLab' },
        { p: 'There is no licence key to type. Your purchase belongs to your subverselab.com account:' },
        {
          steps: [
            'Click the line under the name (or a locked control), then **SIGN IN WITH SUBVERSELAB**.',
            'Your browser opens subverselab.com with a short code, the same code AHENK shows. Sign in with the account you bought AHENK with and press **Activate this computer**.',
            'AHENK unlocks within a few seconds, and the line under the name disappears.',
          ],
        },
        { p: '**BUY AHENK** opens the AHENK page on subverselab.com. If you buy after the sign-in has started, press the button on the browser page again.' },
        { h3: 'One purchase, Mac and Windows' },
        { p: 'One AHENK purchase on subverselab.com opens AHENK on your Mac and your Windows PC. AHENK checks the purchase now and then when it is online; an unlocked computer keeps working offline for up to 45 days between checks.' },
      ],
    },
    {
      id: 'quick-start',
      heading: 'Quick start',
      blocks: [
        {
          steps: [
            '**Open it.** Start the AHENK app, or put AHENK on an instrument track in your DAW. A new AHENK opens with the setup Stage: two microphones in front of the piano, in the room it was recorded in.',
            '**Pick a piano.** Click a piano in the **PIANO RACK** on the left of the stage. It loads and goes on stage; the one that was there goes back to the rack. While it loads the stage reads `LOADING THE PIANO`.',
            '**Play.** Use a MIDI keyboard, click the keys on the panel (lower on a key is louder), or in the macOS app use the computer keys: A S D F G H J K are white keys, W E T Y U O P black keys, Z / X move the octave, C / V play softer or harder.',
            '**Move the microphones.** Click a microphone in the **MIC RACK** on the right: it walks to its place on stage and switches on. Click a microphone on the stage to send it back. Click the gear beside a microphone for its level, type, room and effects.',
            '**Change the room, keep the result.** The arrows of the hall selector at the top step through the halls. The setup selector at the bottom left steps through stage setups; **SAVE** keeps yours.',
          ],
        },
        { note: '**Lost?** Press **?** at the top right. Numbered boxes open over the panel, each pointing to its part, with the SCORE / WRITE key map and the credits of the recordings. Click anywhere or press Esc to close it. It never changes the window size.' },
        pic('manual/panel-help.webp', 1600, 1024, 'The help over the AHENK panel: seven numbered boxes pointing to the hall and setup selector, OUT, the MIC RACK, the settings gear, the piano and keys, SCORE and the WRITE keys', 'The **?** help: seven boxes over the panel, the credits on the band at the bottom.'),
      ],
    },
    {
      id: 'panel',
      heading: 'The panel',
      blocks: [
        { p: 'One window, 1000 × 640.' },
        pic('manual/panel-stage.webp', 1600, 1024, 'The AHENK panel: the concert grand on stage with two microphones, the PIANO RACK on the left, the MIC RACK on the right, the keyboard below', 'The concert grand on stage with two microphones, the **PIANO RACK** on the left, the **MIC RACK** on the right, the keyboard below.'),
        {
          table: {
            head: ['Part', 'What it does'],
            rows: [
              ['AHENK', 'The name, top left.'],
              ['Hall selector', 'Top centre. Recorded is the room the piano was recorded in; the arrows step through the halls, a click on the name opens the list. See Halls.'],
              ['OUT', 'The level of the whole stage, −12 to +12 dB. Double-click returns it to the loaded setup’s value.'],
              ['?', 'The help over the panel.'],
              ['The stage', 'The piano that is playing and the microphones that are on. A gear beside each microphone opens its settings.'],
              ['PIANO RACK', 'Left of the stage. The pianos you can play; the one on stage shows ON STAGE. A piano whose data is not installed is shown faint with (NOT INSTALLED) and cannot be chosen.'],
              ['MIC RACK', 'Right of the stage. The microphones that are off, with their names. Faint ones are not installed for this piano.'],
              ['Setup selector · SAVE · LIST', 'Bottom left. The stage setup; a `*` after its name means it was changed since it was loaded.'],
              ['SCORE... · STAGE · SCORE', 'SCORE... opens a score file. STAGE and SCORE swap the stage area for the SCORE page and back; the keyboard stays.'],
              ['PLAY · STOP · LOOP · TEMPO', 'Appear once a score is open, with the title, the time and a progress bar (click it to jump).'],
              ['The keyboard', 'All 88 keys, A0 to C8.'],
              ['Footer', 'The piano, its size and how many microphones are on stage; messages such as `SCORE LOADED` or `SETUP SAVED`. The SubverseLab mark at the bottom right opens subverselab.com.'],
            ],
          },
        },
        { p: 'The window has one fixed size, in the app and in a DAW. The four pianos are matched in loudness through the factory setup Stage, so switching pianos does not make a jump in level.' },
      ],
    },
    {
      id: 'pianos',
      heading: 'The pianos',
      blocks: [
        { p: 'Click a piano in the PIANO RACK to put it on stage. While it loads, the stage reads `LOADING THE PIANO`. The stage setup, the hall and the score stay as they are.' },
        pic('manual/piano-concert.webp', 800, 268, 'The concert grand on stage', '`CONCERT GRAND`, 274 cm.'),
        pic('manual/piano-studio.webp', 800, 268, 'The studio grand on stage', '`STUDIO GRAND`, 200 cm.'),
        pic('manual/piano-upright.webp', 800, 268, 'The upright on stage', '`UPRIGHT`, felt damped.'),
        pic('manual/piano-baby.webp', 800, 268, 'The baby grand on stage', '`BABY GRAND`, short grand.'),
        {
          table: {
            head: ['Piano', 'What it is', 'Recorded position', 'Data'],
            rows: [
              ['CONCERT GRAND', 'A 274 cm concert grand, lid fully open, 16 strengths per note.', 'LIP, LID ORTF', '1.42 GB'],
              ['STUDIO GRAND', 'A 200 cm grand, 16 strengths per note.', 'LID ORTF', '563 MB'],
              ['UPRIGHT', 'A felt-damped upright, every key of the 88 recorded, 4 strengths per note.', 'LID ORTF', '224 MB'],
              ['BABY GRAND', 'A short grand, 4 strengths per note, with key-release sounds.', 'LIP', '202 MB'],
            ],
          },
        },
        { p: 'On every piano the other microphone positions are computed from its recorded one(s), so all nine positions can be used with each piano (see Microphones).' },
      ],
    },
    {
      id: 'microphones',
      heading: 'Microphones',
      blocks: [
        { p: 'Every microphone has a fixed place: the place where a microphone stood when the pianos were recorded. One click in the MIC RACK sends it to that place and switches it on; one click on it on the stage sends it back to the rack and switches it off. There is no free dragging: the sound of each position is the sound of that real place.' },
        {
          table: {
            head: ['Rack name', 'Where it stands', 'ROOM'],
            rows: [
              ['HARP', 'Over the strings, mid piano', '—'],
              ['HAMMERS', 'Across the harp near the hammers', '—'],
              ['LIP', 'At the lid lip, audience side', '—'],
              ['LID ORTF', 'On stage in front of the open lid', 'yes'],
              ['LID OMNI', 'On stage in front of the open lid, wider', 'yes'],
              ['HOUSE', 'Further out, towards the hall', 'yes'],
              ['HOUSE WIDE', 'Wide pair at keyboard height, towards the hall', 'yes'],
              ['TAIL', 'Behind the tail of the piano', '—'],
              ['BINAURAL', 'A dummy head in the hall; its type stays ORIGINAL', '—'],
            ],
          },
        },
        { p: '**Recorded and modelled.** On each piano, one or two positions are the real recording: LIP and LID ORTF on the concert grand, LID ORTF on the studio grand and the upright, LIP on the baby grand. The other positions are computed from those recordings (they need the installer’s Microphone models and hall images). Hold the pointer over a microphone to see which it is.' },
        { h3: 'The settings gear' },
        { p: 'Click the gear beside a microphone on the stage. Its settings open over the stage; the cross, Esc or a click elsewhere closes them. Switching the microphone off closes them too.' },
        pic('manual/mic-settings.webp', 556, 1220, 'The settings of the LID ORTF microphone: ON, LEVEL, ROOM, TYPE, RECORDED or MODELLED, REVERB, DELAY and ECHO', 'The settings of **LID ORTF**: `ON`, `LEVEL`, `ROOM`, `TYPE` and the three sends.'),
        {
          table: {
            head: ['Control', 'What it does'],
            rows: [
              ['ON', 'Switches the microphone on or off.'],
              ['LEVEL', 'Its level, −24 to 0 dB.'],
              ['ROOM', 'On the LID and HOUSE stands only: more of the recorded room on that microphone, OFF to 100 %.'],
              ['TYPE', 'The character of the microphone. The arrows step, a click on the name opens the list. ORIGINAL is the recording as it is.'],
              ['RECORDED · MODELLED', 'RECORDED: you hear the recording itself. MODELLED: the position is computed, or a TYPE or ROOM is applied.'],
              ['REVERB · DELAY · ECHO', 'How much of this microphone goes to the reverb, the delay and the echo, 0 to 100 %. The factory setups send a little reverb, more from the distant positions; delay and echo start at 0.'],
            ],
          },
        },
        { h3: 'Microphone types' },
        { p: 'ORIGINAL, LARGE COND A, LARGE COND B, SMALL BRIGHT, RIBBON, RIBBON DARK, DYNAMIC, DYNAMIC WARM and DYNAMIC WIDE. They are drawn from measurements of real microphones (see Credits and licences) and change the tone colour of the position, not its place.' },
        { note: '**Many microphones at once.** Each microphone adds its own sound to the stage. With several of them on at high levels the stage gets loud; lower the LEVELs or OUT. AHENK does not limit the output for you.' },
      ],
    },
    {
      id: 'halls',
      heading: 'Halls',
      blocks: [
        { p: 'The hall selector at the top changes the room and the picture together. The arrows step through the halls; a click on the name opens the list. The change fades over in about a tenth of a second, so it can be done while playing. Every microphone gets the hall according to its distance from the piano: the close ones a little, the house positions and the binaural head more.' },
        pic('manual/hall-recorded.webp', 800, 320, 'The Recorded hall with the concert grand and the hall selector', '`Recorded`'),
        pic('manual/hall-recital.webp', 800, 320, 'The Recital room with the microphone settings open', '`Recital room`'),
        pic('manual/hall-theatre.webp', 800, 320, 'The Chamber theatre with the microphone settings open', '`Chamber theatre`'),
        pic('manual/hall-concert.webp', 800, 320, 'The Concert hall with the microphone settings open', '`Concert hall`'),
        pic('manual/hall-church.webp', 800, 320, 'The Stone church with the microphone settings open', '`Stone church`'),
        pic('manual/hall-live.webp', 800, 320, 'The Live room with the microphone settings open', '`Live room`'),
        {
          table: {
            head: ['Hall', 'What it is'],
            rows: [
              ['Recorded', 'The room each piano was recorded in, nothing added. The default.'],
              ['Recital room', 'A small chamber-music room, about 100 seats. Measured in a real room.'],
              ['Chamber theatre', 'A theatre of about 300 seats. Measured in a real room.'],
              ['Concert hall', 'A concert hall of about 600 seats. Measured in a real room.'],
              ['Stone church', 'A long, stone-walled church sound. Built, not measured in any real venue.'],
              ['Live room', 'A studio live room. Built, not measured in any real venue.'],
            ],
          },
        },
      ],
    },
    {
      id: 'setups',
      heading: 'Stage setups',
      blocks: [
        { p: 'A stage setup is everything on the stage: which microphones are on, their LEVEL, TYPE, ROOM and effect sends, OUT and the hall. A setup can also bring a piano. When it does, loading it puts that piano on stage (if the piano is not installed, the piano you have stays and the rest is applied); when it does not, the piano that is loaded stays. SAVE keeps the piano that is on stage with your setup.' },
        pic('manual/setup-list.webp', 512, 540, 'The top of the setup list: the factory setups Close, Stage, Hall, Upright Close, Felt Room and more, each marked FACTORY', '`LIST`, the top of it: the factory setups come first, yours follow with an **X**.'),
        {
          table: {
            head: ['Control', 'What it does'],
            rows: [
              ['< name >', 'The arrows step through all setups, the factory ones and yours. A click on the name opens the list. A `*` after the name: changed since it was loaded.'],
              ['SAVE', 'On one of your own setups, saves it again under its name (`SETUP SAVED`). On a factory setup, asks for a new name in the selector: type it and press Return. A factory name cannot be reused (`CHOOSE ANOTHER NAME`).'],
              ['LIST', 'All setups. Click one to load it. Your own setups have an **X**: click it, then `DELETE?`, to delete. Esc or a click outside closes the list. A long list makes more columns; the window never grows.'],
            ],
          },
        },
        { h3: 'The factory setups' },
        { p: 'They start with **Close** (LIP and LID ORTF, close), **Stage** (the same two, the piano a little further away, some room; what a new AHENK opens with) and **Hall** (LIP, LID ORTF and HOUSE). These three keep the piano that is loaded and use the recorded room. After them come setups that combine a piano, microphones, a hall and the effect sends, in groups:' },
        {
          table: {
            head: ['Group', 'Setups'],
            rows: [
              ['Intimate', '**Upright Close** (upright, HAMMERS and LIP), **Felt Room** (upright, recital room), **Soft Ballad** and **Grand Ballad** (concert grand, concert hall), **Recital Studio** (studio grand, recital room), **Chamber Evening** (baby grand, chamber theatre).'],
              ['Church and ambience', '**Stone Church** and **Cathedral Wash** (concert grand, stone church, more reverb and a little delay), **Church Upright**.'],
              ['Live room and pop', '**Live Room Pop** (baby grand), **Bright Upright** (small bright microphone on LIP), **Tight Studio** (studio grand, HAMMERS and LIP, large condenser).'],
              ['Wide pairs', '**Wide House Pair** (HOUSE WIDE with room) and **Tail Wide** (HOUSE WIDE and TAIL), concert grand.'],
              ['Microphone colour', '**Ribbon Jazz** (ribbon dark on LID ORTF) and **Jazz Club** (dynamic warm on LIP), baby grand in the live room.'],
              ['Echo and delay', '**Tape Echo** (upright, echo), **Delay Wash** (concert grand, delay and reverb) and **Slap Delay** (studio grand).'],
              ['Headphones', '**Binaural Grand** (BINAURAL in the concert hall) and **Headphone Close** (HAMMERS and LIP, close, dry).'],
            ],
          },
        },
        { p: 'The factory setups are levelled against Stage: the same six-note chord is within 3 dB of it in each. Your setups are files in the Setups folder of the data folder (`<name>.setup.xml`); a file from an earlier version, without a piano, loads and keeps the piano that is loaded.' },
      ],
    },
    {
      id: 'playing',
      heading: 'Playing',
      blocks: [
        { h3: 'Note names' },
        { p: 'AHENK uses pianists’ note names: the keys run from **A0** to **C8**, and middle C (MIDI note 60) is **C4**, on the panel and on the SCORE page alike. Some DAWs call middle C “C3”; it is the same key. Notes outside A0 to C8 do not sound.' },
        pic('manual/keys.webp', 970, 322, 'The lower half of the panel keyboard from A0 to C4', 'The lower half of the keyboard: `A0`, then `C1`, `C2`, `C3` and middle C, `C4`.'),
        { h3: 'Three ways to play' },
        {
          table: {
            head: ['Input', 'How'],
            rows: [
              ['MIDI keyboard', 'Any MIDI keyboard, with its pedals (below). In the app choose the MIDI input under **Audio → Audio Settings...**; in a DAW the track’s MIDI plays AHENK. The panel keys light up as you play.'],
              ['Mouse', 'Click the keys on the panel. The lower you click on a key, the louder the note.'],
              ['Computer keys', 'In the macOS app (not in a DAW): A S D F G H J K white keys and W E T Y U O P black keys, from C; the letters are drawn on the keys they play. Z / X octave down / up (A0 to C8 is reachable), C / V softer / harder. At the start A plays C4. The **Keys** menu of the app lists them.'],
            ],
          },
        },
        { h3: 'Pedals' },
        {
          table: {
            head: ['Pedal (MIDI)', 'What it does'],
            rows: [
              ['Sustain (CC 64)', 'Holds every note after its key comes up, until the pedal comes up. Down and up are switches at the middle of the pedal’s travel (no half-pedal). Where the piano was recorded with them, the pedal makes its own sound going down and up; a fast stomp plays the quicker variant.'],
              ['Sostenuto (CC 66)', 'Holds only the notes whose keys are down (or that the sustain pedal holds) at the moment it is pressed; notes played afterwards are damped as usual. Released, it lets them go, unless the sustain pedal is down.'],
              ['Soft (CC 67)', 'Una corda: every note struck while it is down plays at 80 % of its velocity, so a softer and darker layer of the piano sounds. Notes that already ring do not change.'],
            ],
          },
        },
        { p: 'A key that comes up also sounds its key-release noise, quieter after a soft note; where the piano was recorded with it, the release resonance of the strings follows when the damper lands.' },
        { note: '**A chord from the computer keys misses a note?** Many computer keyboards cannot report every combination of three or more keys held at once. That note never reaches AHENK; a MIDI keyboard does not have this limit.' },
        { h3: 'Knobs' },
        {
          list: [
            'Drag a knob up or down; hold Shift for finer steps. The mouse wheel turns it too.',
            '**Double-click** returns a knob to its value in the setup that is loaded now.',
            'When a setup loads, the knob drawings glide to their new values in about half a second; the sound changes at once. A knob you are holding does not glide.',
          ],
        },
        { h3: 'In a DAW' },
        {
          list: [
            'The DAW project keeps the piano, the stage, every microphone setting, OUT and the hall. Each microphone’s ON, LEVEL, TYPE, ROOM and sends, the hall and OUT are plug-in parameters your DAW can automate; they carry the microphones’ names (Lid Ortf Level, House Reverb send, Hall, Out).',
            'AHENK adds no latency (0 samples) and plays at the session’s sample rate, 44.1 to 96 kHz.',
            'A score you open or write can go to a MIDI track: drag it out of the SCORE page (see Drag into your DAW).',
            'The project keeps the path of the score that was open, or of the last one you saved with SAVE AS. Edits that were not saved are not kept: save the score before you close the project.',
            'In a DAW the computer keys belong to the DAW. The SCORE page’s writing keys reach AHENK only while its window has the keyboard focus (click into the score first).',
          ],
        },
      ],
    },
    {
      id: 'score',
      heading: 'The SCORE page',
      blocks: [
        { h3: 'Opening a score' },
        { p: 'Click **SCORE...** and choose a file, or drop the file anywhere on the panel. AHENK reads MusicXML (`.musicxml`, `.xml`, `.mxl`) and MIDI (`.mid`, `.midi`). The piano that is on stage plays it, through the microphones and the hall you set. Click **SCORE** to see the notes: they are drawn as bars on a piano roll, the pitch from the keys on the left, the bars on the ruler at the top.' },
        pic('manual/score-play.webp', 1600, 720, 'The SCORE page with a MusicXML song open: the buttons, the LAYERS row, the ruler, the notes, the PED and DYN lanes and the player', 'A MusicXML song open on the **SCORE** page: the buttons and **LAYERS** row, the ruler, the notes, the `PED` and `DYN` lanes, and the player below.'),
        {
          table: {
            head: ['Control', 'What it does'],
            rows: [
              ['PLAY / PAUSE · STOP', 'Start and pause; STOP returns to the start. Space plays and pauses too.'],
              ['The ruler · the progress bar', 'Click or drag on the ruler of the SCORE page, or click the progress bar in the keyboard header, to jump.'],
              ['LOOP', 'Plays the piece, or the loop range, over and over.'],
              ['SET LOOP · CLEAR LOOP', 'Drag a box around notes on the SCORE page, then SET LOOP: the loop runs from the start of the first of those bars to the end of the last, whole bars, and LOOP switches on. With no notes selected the key reads CLEAR LOOP and removes the range.'],
              ['TEMPO − +', 'Slower or faster in steps of 5 %, from 50 % to 150 % of the score’s tempo.'],
              ['COUNT-IN', 'Each click: off, 1 bar, 2 bars. A click counts you in before the music starts.'],
            ],
          },
        },
        { p: 'Mouse on the SCORE page: click a note to select it (Shift adds), drag on empty space for a box, the wheel scrolls in time, Cmd (Ctrl on Windows) + wheel zooms.' },
        { h3: 'Layers: hands and voices' },
        { p: 'Under the buttons, the **LAYERS** row shows what the score holds: **RH** and **LH** (right and left hand), the voices of each hand (**RH-1**, **RH-2**, **LH-1** and so on, up to four per hand), **OTHER** for parts that are not the piano, and **PEDAL**. Click one to mute it; its notes go dim and are not played. **Alt-click** plays it solo. Click again to bring it back.' },
        pic('manual/score-layers.webp', 1600, 600, 'The SCORE page with the left hand muted and COUNT-IN 2 BARS lit', 'The left hand muted (`LH`, `LH-1` and `LH-2` dark, its notes dim) and a two-bar count-in.'),
      ],
    },
    {
      id: 'writing',
      heading: 'Writing notes',
      blocks: [
        { p: '**NEW** starts a blank score: choose the key (C major, A minor or any other major or minor key) and you get 16 empty bars in 4/4, with WRITE on. You can also write into a MusicXML or MIDI file you opened. A few files can be played but not changed; AHENK then says `THIS FILE CAN BE PLAYED BUT NOT EDITED`.' },
        { p: '**WRITE** (or the key N) switches writing on; N or Esc switches it off. While it is on, the computer keys write notes instead of playing them. A cream line, the caret, shows where the next note goes, with a tab naming the layer (RH-1 and so on); the header shows the note length, the layer, the bar (M) and the beat (B). On Windows, Ctrl works wherever Cmd is written.' },
        pic('manual/score-write.webp', 1600, 600, 'The SCORE page with WRITE on, the caret at bar 11 and a loop range shaded from bar 7 to bar 10', '`WRITE` on: the caret at bar 11 in `RH-1`, the next note a quarter; a loop range from bar 7 to bar 10 shaded gold.'),
        { h3: 'The keys in WRITE' },
        {
          table: {
            head: ['Key', 'What it does in WRITE'],
            rows: [
              ['A – G', 'Writes that note at the caret, with the key signature’s sharp or flat, in the octave nearest the note before. **Shift** + letter adds the note to the chord just written.'],
              ['1 – 8', 'The length of the next notes: 1 sixty-fourth, 2 thirty-second, **3 sixteenth, 4 eighth, 5 quarter, 6 half, 7 whole**, 8 double whole.'],
              ['.', 'Dot: each press adds a dot (up to three), the fourth press removes them.'],
              ['Shift+3', 'Triplets on / off.'],
              ['0', 'A rest of the current length.'],
              ['- + =', 'Flat, sharp, natural for the next letter you type (- then B = B flat).'],
              ['J', 'Spells the last note the other way (C sharp or D flat).'],
              ['T', 'Tie: ties the last note to the next note of the same pitch.'],
              ['R', 'Repeats the last note or chord.'],
              ['Up · Down', 'The last note (or the selected notes) a semitone up or down; with Cmd, an octave.'],
              ['Left · Right', 'Move the caret; with Cmd, a whole bar. With Shift, select; Shift+Cmd selects by bars.'],
              ['Shift+Space', 'Moves the caret on by the current length without writing.'],
              ['H', 'The other hand (right or left).'],
              ['Cmd 1–4', 'Voice 1 to 4 in this hand.'],
              ['Backspace', 'Takes back the note before the caret (it becomes a rest) and steps back.'],
              ['Delete', 'Deletes the selected notes, or the note at the caret.'],
              ['Cmd C X V', 'Copy, cut, paste at the caret.'],
              ['Cmd Z · Shift Cmd Z', 'Undo · redo (also UNDO / REDO on the page).'],
              ['Cmd S', 'SAVE AS.'],
            ],
          },
        },
        { note: 'An example: a new score in F major, typed with 5 A B C D 6 Shift+A F 4 G A B C 5 D, gives quarters, a half with a chord note, then eighths, and leaves the caret in bar 3.' },
        { h3: 'With the mouse' },
        {
          list: [
            'In WRITE, a click on empty space in the notes writes a note there, at that pitch, with the current length; the note sounds. A click where a note of that hand already starts adds the new pitch to its chord.',
            'A click on a note puts the caret on it.',
            'Drag a box around notes and press **Delete** or **Backspace**: all of them are deleted in one step (`N NOTES DELETED`); Cmd+Z brings them back. The same box sets the loop with SET LOOP.',
          ],
        },
        { h3: 'With a MIDI keyboard' },
        {
          list: [
            'In WRITE, every key you press writes a note at the caret with the current length. Keys pressed together (within about 60 ms) become one chord.',
            'The hand follows the split point: notes from middle C (C4) up go to the right hand, notes below it to the left hand.',
            'The sustain pedal moves the caret on without writing, for a rest or to step past a note.',
            'The panel keyboard writes the same way when you click its keys in WRITE.',
          ],
        },
        pic('manual/score-new.webp', 1600, 920, 'A new score in F major with a few notes written and the caret in bar 3', 'A new score in F major: quarters, a half with a chord note, eighths, and the caret in bar 3.'),
        { h3: 'Saving and export' },
        {
          table: {
            head: ['Button', 'What it writes'],
            rows: [
              ['SAVE AS', 'The score as MusicXML (`.musicxml`, or `.mxl` compressed), which other notation programs open. The header shows EDITED while there are unsaved changes.'],
              ['MIDI', 'The score as a MIDI file (`.mid`), for a DAW or any MIDI program: the title, tempo and time signatures on the first track, then each hand (and each other part) on a track of its own, with the sustain pedal.'],
            ],
          },
        },
        { p: 'Before NEW, SCORE... or a dropped file replaces a score with unsaved edits, AHENK asks once: do the same again within four seconds to throw the edits away, or SAVE AS first.' },
        { h3: 'Drag into your DAW' },
        { p: 'Beside **MIDI** and beside **SAVE AS** sits a small grip of six dots. Press it and drag: the grip beside MIDI carries the score as a MIDI file, the one beside SAVE AS as MusicXML. Drop it on a track in your DAW, on the desktop or in a Finder or Explorer window. The file is the same as MIDI or SAVE AS would write; it is named after the score’s title, and the score you are working on stays as it is. A click on a grip without dragging tells you what it does.' },
        pic('manual/score-drag.webp', 828, 64, 'The buttons NEW, SAVE AS with its drag grip, MIDI with its drag grip, UNDO, REDO and WRITE', 'The grips beside `SAVE AS` and `MIDI`.'),
      ],
    },
    {
      id: 'troubleshooting',
      heading: 'Troubleshooting',
      blocks: [
        {
          table: {
            head: ['You see', 'Why, and what to do'],
            rows: [
              ['A piano with (NOT INSTALLED)', 'Its data is not in the data folder. Run the installer again and choose that piano. Data folder: macOS `~/Library/Application Support/SubverseLab/AHENK/Samples`, Windows `%LOCALAPPDATA%\\SubverseLab\\AHENK\\Samples`.'],
              ['`NO PIANO LOADED`', 'No piano is installed for this user, or none was chosen yet. Click a piano in the PIANO RACK; if all of them are faint, install at least one.'],
              ['Faint microphones in the rack', 'Not installed for this piano. The computed positions need Microphone models and hall images; install it from the installer.'],
              ['The data was installed but AHENK does not find it', 'The data goes to the user who installs it. If another account installed AHENK, the data is in that account’s folder: run the installer from your own account.'],
              ['`THIS FILE CAN BE PLAYED BUT NOT EDITED`', 'AHENK could play the file but not turn it into an editable score. Play it as it is, or start from NEW.'],
              ['`NOT A SCORE`', 'The file could not be read as MusicXML or MIDI.'],
              ['`UNSAVED EDITS: ... AGAIN TO DISCARD THEM`', 'The open score has changes. Do the same action again within four seconds to drop them, or SAVE AS first.'],
              ['The letters do not play', 'Computer keys play only in the macOS app, and not while WRITE is on (then they write notes) or while you type a setup name.'],
              ['It gets very loud', 'Many microphones add up. Lower their LEVELs or OUT.'],
              ['`FREE MODE: UNLOCK`', 'The trial is over and this computer is not signed in. Click the line, then SIGN IN WITH SUBVERSELAB with the account you bought AHENK with. See Trial and purchase.'],
              ['The browser says you do not own AHENK', 'You are signed in with another account than the one that bought AHENK, or the purchase is not done yet. Sign in with the buying account, or buy, and press the button on the page again.'],
              ['The app makes no sound', 'Choose the output under **Audio → Audio Settings...**. The app plays only; it does not ask for a microphone.'],
            ],
          },
        },
        { p: 'Setups you saved stay in the Setups folder when you install again.' },
      ],
    },
    {
      id: 'specifications',
      heading: 'Specifications',
      blocks: [
        {
          table: {
            head: ['Item', 'AHENK 1.0'],
            rows: [
              ['Formats', 'macOS: standalone app, VST3, Audio Unit instrument (universal: Apple Silicon and Intel). Windows 64-bit: standalone app and VST3.'],
              ['Systems', 'macOS 11 or later (Apple Silicon or Intel); Windows 10 or 11, 64-bit.'],
              ['Pianos', 'Concert grand (274 cm), studio grand (200 cm), upright (felt damped), baby grand.'],
              ['Keys', '88, A0 to C8; middle C = C4.'],
              ['Pedals', 'Sustain (CC 64, with pedal noises), sostenuto (CC 66), soft (CC 67).'],
              ['Audio', 'Stereo out, 0 samples latency, 44.1 to 96 kHz.'],
              ['Microphone positions', 'HARP, HAMMERS, LIP, LID ORTF, LID OMNI, HOUSE, HOUSE WIDE, TAIL, BINAURAL; recorded or computed per piano.'],
              ['Microphone types', 'ORIGINAL, LARGE COND A, LARGE COND B, SMALL BRIGHT, RIBBON, RIBBON DARK, DYNAMIC, DYNAMIC WARM, DYNAMIC WIDE.'],
              ['Per microphone', 'ON, LEVEL −24 to 0 dB, TYPE, ROOM (LID and HOUSE stands), REVERB, DELAY and ECHO sends.'],
              ['Halls', 'Recorded, Recital room, Chamber theatre, Concert hall (measured); Stone church, Live room (built).'],
              ['Output', 'OUT −12 to +12 dB.'],
              ['Stage setups', 'Factory setups (Close, Stage, Hall first), and your own (XML files).'],
              ['Scores in', 'MusicXML (`.musicxml`, `.xml`, `.mxl`), MIDI (`.mid`, `.midi`), by file or drop.'],
              ['Scores out', 'MusicXML (`.musicxml`, `.mxl`), MIDI (`.mid`); both also by dragging out of the SCORE page (Mac and Windows).'],
              ['Playback', 'Loop of the piece or of whole bars, tempo 50 to 150 %, count-in 1 or 2 bars, mute / solo per hand, voice, other parts and pedal.'],
              ['Writing', 'Computer keys, mouse, MIDI keyboard (split at C4, chords, pedal advances); lengths from 1/64 to the double whole, dots, triplets, ties; undo and redo.'],
              ['Data', '2.44 GB for all four pianos (FLAC), installed per piano.'],
              ['Licence', 'Free download; 30-day trial from the first start, then free mode (the upright, two microphones). One purchase opens AHENK on Mac and Windows; sign in with your SubverseLab account, no licence key to type.'],
            ],
          },
        },
        { h3: 'Help and support' },
        { p: 'Questions, problems and wishes: **info@subverselab.com**. Tell us your system, your DAW (or the app) and what you did; we read every message.' },
      ],
    },
    {
      id: 'credits',
      heading: 'Credits and licences',
      blocks: [
        { p: 'AHENK is built on recordings that their makers share under open licences. We thank them, and we are required to name them. Every set was converted, indexed, level-matched and processed by SubverseLab for AHENK; nobody named here endorses AHENK.' },
        { h3: 'Pianos' },
        {
          list: [
            '**Concert grand.** “The bitKlavier Grand” sample library by Dan Trueman, Matthew Wang, Andres Villalta, Jeffrey Gordon, Katie Chou and Christien Ayers, Princeton University (bitKlavier). Licensed CC BY 4.0, https://creativecommons.org/licenses/by/4.0/. Source: https://doi.org/10.34770/xm18-yr83 and its sister records for each microphone image. Resampled, edited and processed by SubverseLab.',
            '**Studio grand.** Salamander Grand Piano V3 by Alexander Holm. Licensed CC BY 3.0, http://creativecommons.org/licenses/by/3.0/. Source: https://archive.org/details/SalamanderGrandPianoV3. Converted to FLAC, indexed and processed by SubverseLab.',
            '**Upright.** Meta Piano from Meta’s open sound collection, github.com/facebookincubator/Meta-open-sound. Released under CC0 (public domain dedication); no credit is required, it is given with thanks.',
            '**Baby grand.** City Piano by Bigcat Instruments, bigcatinstruments.blogspot.com. The author states that it is free and public domain; no other licence is on record.',
          ],
        },
        { h3: 'Microphones' },
        { p: 'Microphone impulse responses: J. Franco, T. Brookes, E. De Sena (Institute of Sound Recording, University of Surrey), “Multi-Angle, Multi-Distance Microphone Impulse Response Dataset”, doi 10.5281/zenodo.4633508. Licensed CC BY 4.0. Processed by SubverseLab into the microphone types.' },
        { h3: 'Halls' },
        { p: 'Recital room, Chamber theatre and Concert hall: room impulse responses from the Detmold Open Database of Spatial Room Impulse Responses, Detmold University of Music (Brahmssaal, Sommertheater, Konzerthaus), doi 10.5281/zenodo.4007388. Licensed CC BY 4.0. Changed by SubverseLab: direct sound removed, cut, normalised and resampled. Stone church and Live room are built by SubverseLab and are not recordings of any real venue.' },
        { h3: 'Fonts' },
        { p: 'TeX Gyre Heros and TeX Gyre Pagella (GUST Font License), DejaVu Sans Mono (DejaVu fonts licence).' },
      ],
    },
    {
      id: 'download',
      heading: 'Getting AHENK',
      blocks: [
        { p: `Try it first: on subverselab.com${AHENK.path}, sign in with a free SubverseLab account (no card) and choose **Download free trial** for macOS or Windows. ${AHENK_TRIAL_LINE} ${AHENK_FREE_AFTER_LINE}` },
        gettingIt(AHENK)[0],
        {
          steps: [
            'Sign in on subverselab.com with the e-mail address you paid with (or any SubverseLab account for the trial).',
            `Open your Account page, or subverselab.com${AHENK.path}, and download the macOS installer (\`.pkg\`) or the Windows setup program.`,
            'Install it as described under Installation, open AHENK and sign in as described under Trial and purchase.',
          ],
        },
      ],
    },
  ],
};
