// ELEK owner's manual as a web page: /plugins/elek/manual.
// Source: 01_AI_Tools/subverselab-splitter-desktop/docs/manual/Elek_Manual.html (22 Oct 2026, updated for ELEK 1.0.3 on macOS;
// the site sells 1.0.3 on macOS and 1.0.1 on Windows). subverselab-splitter-desktop/STATUS.md: 1.0.2 and 1.0.3 change only the
// macOS build (macOS 11 target, universal); stem peaks are equal to 1.0.0 / 1.0.1, so the measured numbers still hold.
// Left out: the line on what the name means (public copy rule), versioned file names, the "Updates" row (the update and
// licence sentences come from gettingIt()), the PDF cover picture. The four window pictures are the PDF's, cropped above the footer (the old hyphenated lockup sits there).

import { ELEK } from '../plugins.js';
import { media } from '../../utils/endpoints.js';
import { installation, gettingIt, manualBase } from './common.js';

const pic = (file, w, h, alt, caption) => ({ img: media(`/plugins/elek/manual/${file}`), w, h, alt, caption });

export const ELEK_MANUAL = {
  ...manualBase(ELEK, {
    subtitle: 'Stem Separation · Vocal Removal · Key & Tempo · Model EK-84',
    description: 'The ELEK owner’s manual: the three operations, quick start, the window and every control, where the files go, recipes, how the engine works, installation on macOS and Windows, specifications and the measured release tests.',
    imageAlt: 'ELEK’s window with four stems in the mixer',
  }),
  sections: [
    {
      id: 'introduction',
      heading: 'What ELEK is',
      blocks: [
        { p: 'ELEK takes a finished track apart. It writes the vocals, drums, bass and everything else as separate files, takes the vocal out of a song, or tells you its tempo and key.' },
        { h3: 'Three operations, one choice' },
        { p: '**Stem separation** writes four files: vocals, drums, bass and other. **Vocal removal** writes two: the vocal and the instrumental. **Key & BPM** reads the tempo, the key, its Camelot code and how sure the reading is, without separating anything. Dropping a file only loads it; nothing runs until you choose an operation and press Run.' },
        { h3: 'Everything stays on your computer' },
        { p: 'The separation runs on your own processor. No file is uploaded, no account is needed to use the app, and it works offline.' },
        { h3: 'Every result is kept' },
        { p: 'Each run gets its own folder in Music/ELEK, with the track name, tempo and key in the file names. The start screen lists your earlier runs, so a separation you made last week opens again with one click.' },
      ],
    },
    {
      id: 'quick-start',
      heading: 'Quick start',
      blocks: [
        {
          steps: [
            '**Open ELEK**: the app, or the plug-in on any track in your DAW. Both show the same window.',
            '**Drop a track** on the window, or click Choose file. WAV, AIFF, MP3 and FLAC all work.',
            '**Choose an operation**: Key & BPM, Vocal removal or Stem separation.',
            '**Press Run.** The progress bar shows how far it is. Key & BPM takes a few seconds; a separation takes a little less than the length of the track on an Apple M2.',
            '**Listen in the mixer**, then grab a stem’s waveform (or its WAV button) and drag it onto a track in your DAW, or press Show files.',
          ],
        },
      ],
    },
    {
      id: 'window',
      heading: 'The window',
      blocks: [
        { p: 'ELEK has four views:' },
        {
          list: [
            '**Start screen** — the drop zone, and under it the earlier separations still on disk, newest first.',
            '**Choose** — the file is loaded and you pick an operation. Nothing has run yet: Run starts it.',
            '**Key & BPM** — tempo, key, Camelot code and key confidence, measured on the whole mix.',
            '**Mixer** — the stems with their waveforms; the tiles on top carry the tempo and key.',
          ],
        },
        pic('window-empty.webp', 1000, 712, 'ELEK start screen with the drop zone and the earlier separations', '**Start screen.** The drop zone, and under it the earlier separations still on disk, newest first.'),
        pic('window-ready.webp', 1000, 712, 'ELEK with a file loaded and Stem separation chosen', '**Choose.** The file is loaded and Stem separation is chosen. Nothing has run yet: Run starts it.'),
        pic('window-keybpm.webp', 1000, 712, 'ELEK showing tempo, key, Camelot code and key confidence', '**Key & BPM.** Tempo, key, Camelot code and key confidence, measured on the whole mix.'),
        pic('window-done.webp', 1000, 712, 'ELEK mixer with four stems and their waveforms', '**Mixer.** Four stems with their waveforms; the tiles on top carry the tempo and key.'),
        {
          table: {
            head: ['Control', 'Where', 'What it does'],
            rows: [
              ['Choose file', 'Start screen', 'Loads a track. Dropping a file on the window does the same. Nothing runs yet.'],
              ['Key & BPM', 'Choose', 'Reads tempo, key, Camelot and confidence. No separation, no files written.'],
              ['Vocal removal', 'Choose', 'Writes Vocals and Instrumental.'],
              ['Stem separation', 'Choose', 'Writes Vocals, Drums, Bass and Other, plus the Instrumental.'],
              ['Run', 'Choose', 'Starts the chosen operation. It stays grey until one is chosen.'],
              ['Play / seek', 'Mixer', 'Plays all stems together. Click any waveform or the bar on top to jump.'],
              ['Drag a stem', 'Mixer', 'Grab a stem’s waveform and pull it onto a track in your DAW: the stem’s WAV lands there. A click on the waveform still jumps.'],
              ['M / S', 'Mixer', 'Mute or solo a stem while you listen. The files are not changed.'],
              ['Level', 'Mixer', 'Playback level of each stem, 0 to 100. The files are not changed.'],
              ['WAV', 'Mixer', 'Drag it into your DAW, like the waveform, or click to show the file.'],
              ['Show files', 'Mixer', 'Opens the run’s folder.'],
              ['Other operation', 'Results', 'Back to the three operations with the same file loaded.'],
              ['New file', 'Results', 'Back to the start screen.'],
            ],
          },
        },
      ],
    },
    {
      id: 'files',
      heading: 'Where the files go',
      blocks: [
        { p: 'Every separation writes a new folder in your Music folder (macOS: `~/Music/ELEK`; Windows: `Music\\ELEK` in your user folder). Nothing is ever overwritten.' },
        {
          table: {
            head: ['What', 'Example'],
            rows: [
              ['Folder', '`Bir Araya Gelemeyiz_144BPM_Bmin_2026-10-12 1729`'],
              ['Stem file', '`Bir Araya Gelemeyiz_Vocals_144BPM_Bmin_ELEK.wav`'],
              ['Run record', '`elek.json`: source file, operation, date, tempo, key and the file list'],
            ],
          },
        },
        {
          list: [
            '**Short names:** ELEK drops the extension, track numbers and tags in brackets, and cuts long names at a word: “01 - Bir Araya Gelemeyiz (Official Video) [HQ].wav” becomes “Bir Araya Gelemeyiz”.',
            '**The key only when it is sure:** the key goes into the names only when its confidence is 50% or more. The window always shows the key with its confidence.',
            '**Earlier separations:** the start screen lists every run whose files are all still there. Delete or move the files and the run leaves the list. “Open ELEK folder” shows the whole library.',
          ],
        },
      ],
    },
    {
      id: 'recipes',
      heading: 'Getting the best results',
      blocks: [
        {
          recipes: [
            {
              name: 'Start from the best copy you have',
              settings: 'Any operation',
              text: 'A WAV or a high-bitrate file separates more cleanly than a small MP3. The encoder’s artefacts are spread across all the stems.',
            },
            {
              name: 'Instrumental for a cover or a karaoke track',
              settings: 'Vocal removal',
              text: 'The instrumental is the mix minus the separated vocal, so everything that is not the voice stays in it, effects included.',
            },
            {
              name: 'Sampling and remixing',
              settings: 'Stem separation',
              text: 'Take the drums for a break, the bass for a groove, or Other for the chords and leads. The stems line up with the original to the sample, so they drop straight under the track in your DAW.',
            },
            {
              name: 'DJ preparation',
              settings: 'Key & BPM',
              text: 'Read the tempo and the Camelot code before you build a set. A slow track can read at half its felt tempo or a busy one at double; ELEK folds tempos into 70–180 BPM, so check by ear when a number looks odd.',
            },
          ],
        },
        { h3: 'What ELEK cannot do' },
        { p: 'No separation is perfect: a little of one instrument can be heard in another stem, most often in Other. Tempo and key need at least 6 seconds of music; on shorter files, or on silence, ELEK says so instead of guessing.' },
      ],
    },
    {
      id: 'how-it-works',
      heading: 'How it works',
      blocks: [
        { p: 'The separation engine is HT-Demucs, a hybrid model that works on the waveform and on the spectrum at the same time. ELEK runs it over overlapping windows of the track with a 25% overlap and cross-fades the windows into each other, so there is no click or level jump where they meet.' },
        { p: 'The engine works at 44.1 kHz. Files at other sample rates are converted with a windowed-sinc resampler, and the converter’s delay is removed, so the stems come back aligned to the original to the sample. Stems are written as 24-bit WAV at 44.1 kHz.' },
        { p: 'Tempo comes from the onsets of the whole mix; the key from its chroma against the Krumhansl–Schmuckler major and minor profiles. The confidence says how far the winning key stands above the next one.' },
      ],
    },
    {
      id: 'installation',
      heading: 'Installation',
      blocks: installation('ELEK', {
        standalone: true,
        winStandalone: true,
        macSteps: [
          'Open the installer package (`.pkg`) you downloaded and follow it. It puts the ELEK app in `/Applications`, `ELEK.vst3` in `/Library/Audio/Plug-Ins/VST3` and `ELEK.component` (Audio Unit) in `/Library/Audio/Plug-Ins/Components`. The installer is signed and notarised by Apple.',
          'ELEK runs natively on Apple Silicon and Intel Macs (macOS 11 or later). Rescan plug-ins in your DAW if ELEK does not appear.',
        ],
        winSteps: [
          'Unzip the Windows zip you downloaded. If Windows blocks the files: right-click the zip, choose **Properties**, tick **Unblock**, then extract.',
          'Copy the `ELEK.vst3` folder to `C:\\Program Files\\Common Files\\VST3\\` and rescan plug-ins in your DAW.',
          'The app is in the “ELEK App” folder: keep `ELEK.exe`, `onnxruntime.dll` and `htdemucs.onnx` together and start `ELEK.exe`.',
          'Windows may warn that the publisher is unrecognised the first time; choose “More info”, then “Run anyway”.',
        ],
        extra: [
          { h3: 'Audio output (app)' },
          { p: 'The app plays through your default output. To choose another device, press **Audio output** in the window. The plug-in plays through your DAW.' },
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
              ['Formats / platform', 'macOS 11 or later, Apple Silicon and Intel: standalone app, VST3, AU · Windows (64-bit): standalone app, VST3'],
              ['Input files', 'WAV, AIFF, MP3, FLAC; mono or stereo; any sample rate'],
              ['Output files', '24-bit WAV, 44.1 kHz, aligned to the original to the sample'],
              ['Stem separation', 'Vocals, Drums, Bass, Other (+ Instrumental)'],
              ['Vocal removal', 'Vocals, Instrumental'],
              ['Key & BPM', 'Tempo (70–180 BPM), key, Camelot code, key confidence; needs 6 s or more'],
              ['Engine', 'HT-Demucs, overlapping windows (25%) with cross-fades'],
              ['Memory', 'About 2.4 GB at the peak of a separation; 8 GB computers are enough'],
              ['Speed', 'A 4-minute track: about 3.5 minutes on an Apple M2 with 8 GB'],
              ['Network', 'None needed; nothing is uploaded'],
            ],
          },
        },
        { h3: 'Measured, not guessed' },
        { p: 'Numbers from the release tests of ELEK 1.0.0; the separation is unchanged in later versions (same stem peaks on the release test file).' },
        {
          list: [
            '**Speed and memory:** a 4-minute track separated into four stems in 215 s on an Apple M2 with 8 GB; the highest memory use was 2.35 GB.',
            '**Alignment:** a 48 kHz copy of a test song came back with 0 samples of delay against the original (92 before the converter delay was removed), and the stems matched the 44.1 kHz run to within 43–51 dB.',
            '**Odd files:** FLAC at 48 kHz, a 10 s mono file, a 22.05 kHz mono MP3, a 1 s file, 5 s of digital silence and a Turkish file name all separated and wrote their stems.',
            '**No guessing:** on 5 s of silence and on a 1 s file, Key & BPM reports that there is nothing to measure instead of a tempo and key.',
            '**Same on both systems:** on the release test file the Windows build wrote stems with the same peak levels as the Mac build (Vocals 0.0192, Drums 0.7876, Bass 0.4578, Other 0.4176).',
          ],
        },
      ],
    },
    { id: 'download', heading: 'Getting ELEK', blocks: gettingIt(ELEK) },
  ],
};
