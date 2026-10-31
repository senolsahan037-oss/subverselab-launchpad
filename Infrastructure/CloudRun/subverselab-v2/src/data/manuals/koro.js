// KORO owner's manual as a web page: /plugins/koro/manual.
// Source: 01_AI_Tools/subverselab-koro/docs/manual/Koro_Manual.html (12 Oct 2026, corrected after the October audit;
// same text as public/plugins/koro/Koro_Manual.pdf). Describes KORO 1.0.1, the version the site sells (released 12 Oct:
// type-in values, the MONO SAFE redesign the manual already describes, LEVEL/PAN 2–3 dimmed outside CHOIR).
// Left out: the "subverselab.com/launch … no activation needed" lines (the licence sentence comes from gettingIt()),
// the self-test check counts (51 + 55 in the manual; the 1.0.1 build runs more checks), the picture captions.
// The standalone app is kept: the 1.0.1 macOS installer installs it (make_mac_installer.sh, STANDALONE=1).

import { KORO } from '../plugins.js';
import { installation, gettingIt, manualBase } from './common.js';

export const KORO_MANUAL = {
  ...manualBase(KORO, {
    subtitle: 'Vocal Doubler · Harmonizer · Model KR-77',
    description: 'The KORO owner’s manual: the three-step flow, installation on macOS and Windows, the front panel and rear plate with every range and default, the moods, how the key and the safe rule decide each note, recipes and the measured specifications.',
  }),
  sections: [
    {
      id: 'introduction',
      heading: 'What KORO is',
      blocks: [
        { p: 'KORO makes one singer sound like a small group, and it will not sing a note the key cannot back up.' },
        { h3: 'Three steps — that is the whole flow' },
        {
          steps: [
            '**Drop it on the vocal.** It opens on the TIGHT DOUBLE mood: a two-voice double, no harmony. Doubling needs no key.',
            '**Sing.** The key is read from the audio continuously while the singer sings. There is nothing to press and nothing to choose; the panel shows what it heard.',
            '**Pick a mood**, or raise HARMONY and turn COLOR to choose the interval.',
          ],
        },
        { p: 'KORO KR-77 is two effects in one unit. The **double** adds one to three gently re-performed voices that arrive at slightly different, slowly moving times: a human timing impression, not a chorus wobble. The **harmony** adds pitch-shifted voices above or below the lead, snapped to the key it hears, with the singer’s vibrato and inflection kept. Both can run together.' },
        { p: 'The one rule that shapes everything else: **a harmony voice must never be a wrong note.** Fifths and octaves are consonant in every mode, so KORO plays them whenever a note is clearly sung. A third depends on the mode, so KORO plays one only on a note where every key it still considers likely agrees on it; otherwise that voice falls back to a plain unison double (or, with COLOR near the fifth, to the fifth). It is never replaced by an octave. The section “The key and the safe rule” explains the rule, and what was measured.' },
        { h3: 'Latency: fixed 54 ms' },
        { p: 'KORO reports a fixed latency of **54.10 ms at 44.1 kHz** (2386 samples) to the host at all times, with HARMONY on or off. The doubler alone is delayed by the same amount so the host never sees the number change. Use your host’s plug-in delay compensation. The figures at other sample rates are under Specifications.' },
      ],
    },
    {
      id: 'installation',
      heading: 'Installation',
      blocks: installation('KORO', {
        standalone: true,
        macSteps: [
          'Run the installer package (`.pkg`) you downloaded. It is signed with a Developer ID and notarised by Apple, so macOS opens it without any extra step.',
          'Choose what to install: the VST3 plug-in (`/Library/Audio/Plug-Ins/VST3/KORO.vst3`), the Audio Unit (`/Library/Audio/Plug-Ins/Components/KORO.component`) and the standalone app (`/Applications/KORO.app`, the same panel outside a DAW). An older bundle named “SubverseLab Koro” is removed by the VST3 package.',
          'Restart your DAW, or make it rescan its plug-in list.',
        ],
        extra: [
          { p: 'Channel layouts: mono → mono, mono → stereo, stereo → stereo. Any host that loads VST3 or AU effects.' },
        ],
      }),
    },
    {
      id: 'panel',
      heading: 'Panel tour',
      blocks: [
        { p: 'The face reads left to right: name and model plate with the MOOD keys, then the display window, then the VU meter and the LOCK and REAR controls. Along the bottom, three groups of knobs: DOUBLE, HARMONY and OUT.' },
        {
          list: [
            '**Name block and MOOD keys** — KORO, “Vocal Doubler · Harmonizer”, the **MODEL KR-77** plate, and six keys: TIGHT DOUBLE, ARABESK CHOIR, BACKING STACK, THIRD, FIFTH, CHOIR. A mood writes the knobs and the rear plate; you can move any of them afterwards.',
            '**KEY display** — a red 7-segment digit shows the detected key note. Five scale lamps (MAJOR, MINOR, NIHAVENT, HICAZ, RAST) show the detected scale. They are a read-out, not a selector. Four confidence lamps show how sure the detector is. AUTO and LOCK lamps show whether the key is following the singer or held. The note “TO OVERRIDE: REAR KEY / SCALE” points to the rear plate.',
            '**HARMONY lamp and LATENCY 54 MS** — lit while HARMONY is above 0. The latency is reported to the host at all times; the lamp lights only when HARMONY is above 0, because only then is it audible.',
            '**COLOR annunciators** — LOW 3RD, HIGH 3RD, 5TH, OCT: the interval the COLOR knob currently points at. **SAFE UNISON** lights when a third was withheld on the note being sung (see “The key and the safe rule”). The COLOR lamps follow the knob, not the decision made on each note.',
            '**PITCH bar** — 48 lamps, 25 cents per lamp, covering one octave from the detected key. **IN** marks the sung note; **OUT** marks the first harmony voice. Both are driven by the tracker, not drawn for effect.',
            '**VU meter** — output level, left and right.',
            '**LOCK** toggle — holds the detected key. **REAR** key — turns the unit around to the set-up panel.',
            '**DOUBLE group** — DOUBLE, WIDTH, TONE.',
            '**HARMONY group** — HARMONY, COLOR.',
            '**OUT group** — OUTPUT, BYPASS, and the LATENCY 54 MS lamp.',
          ],
        },
        { p: 'The rear plate is the set-up panel. The front MOOD writes its values; change them only to override it.' },
      ],
    },
    {
      id: 'controls',
      heading: 'Controls',
      blocks: [
        { h3: 'Front panel' },
        {
          table: {
            head: ['Control', 'Range · default', 'What it does'],
            rows: [
              ['MOOD', '6 keys · TIGHT DOUBLE', 'Recalls a complete set of settings (see Moods). Also supplies what has no knob: the doubler’s timing character and the number of harmony voices.'],
              ['DOUBLE', '0–10, 0 = OFF · 5.6', 'Amount of doubling, and how many voices. 0–3.0 gives 1 voice, above 3.0 to 6.5 gives 2, above 6.5 gives 3. The dry/wet balance of the double rises to 0.75 at 10. The voices start 8, 21 and 34 ms behind the lead; the mood shortens that (TIGHT DOUBLE brings it to about 3, 8 and 12 ms) and sets a slow drift of up to ±12 ms (0.55, 0.93 and 1.31 Hz, one rate per voice).'],
              ['WIDTH', '0–10 · 3.8', 'Stereo spread. On the double: voice 1 goes left, voice 2 right, voice 3 sits centre-back. It also scales the harmony voices’ pan positions.'],
              ['TONE', 'DARK–BRIGHT, 3–16 kHz · 11.1 kHz', 'High-cut on the doubled voices and on the harmony sum. The display value follows the cut-off in Hz.'],
              ['HARMONY', '0–10, 0 = OFF · OFF', 'Amount of harmony. Dry gain is min(1, 2(1−h)) and harmony gain is min(1, 2h), with h = knob ÷ 10: at 5 the lead and the harmony are both at full level, at 10 you hear the harmony voices alone. The harmony is built from the dry input, so it works alongside DOUBLE.'],
              ['COLOR', 'LOW 3RD · HIGH 3RD · 5TH · OCT · set by mood', 'One knob for the interval. With one harmony voice the detents are a low third (−2 scale steps), a high third (+2), a fifth (+4) and an octave (+7), and the positions between them crossfade two neighbouring intervals at equal power. With two or three voices, each voice glides from the set −2 / +2 / +4 (COLOR at LOW 3RD) to +2 / +4 / +7 (at OCT). The detected key decides the exact notes; in Chromatic the steps are semitones.'],
              ['OUTPUT', '−12 to +12 dB · 0 dB', 'Final gain, applied after the double and harmony.'],
              ['LOCK', 'On/off · off', 'Freezes the detected key and its confidence while the singer keeps going. Has no effect while a KEY or SCALE override is set on the rear plate.'],
              ['BYPASS', 'On/off · off', 'Crossfades (20 ms) to the dry signal. The dry path is delayed by the same 54 ms, so bypassing never moves the vocal in time.'],
              ['REAR', 'Key', 'Shows the rear plate. Changes nothing by itself.'],
            ],
          },
        },
        { h3: 'Rear plate' },
        {
          table: {
            head: ['Control', 'Range · default', 'What it does'],
            rows: [
              ['LEVEL 1 · 2 · 3', '0–10 · set by mood', 'Level of each harmony voice relative to the dry lead (linear: 10 = equal to the dry). The voice’s level is matched to the singer by a 40 ms envelope follower, so LEVEL stays relative as the singer moves. LEVEL 2 and LEVEL 3 act only in CHOIR, the only mood with three harmony voices; in the other five moods there is one harmony voice and they do nothing.'],
              ['PAN 1 · 2 · 3', 'L 100 – C – R 100 · set by mood', 'Position of each harmony voice (balance law; centre is unity on both sides). WIDTH multiplies these. PAN 2 and PAN 3 act only in CHOIR (see LEVEL).'],
              ['GLIDE', '0–120 ms · 40 ms', 'Portamento of the interval between notes. 0 snaps; higher values slide the harmony voice from one target to the next.'],
              ['TIMING', '0–30 ms · 6 ms', 'Late entry of the harmony voices behind the lead (voice 1 ×1.0, voice 2 ×0.55, voice 3 ×0.8).'],
              ['KEY', 'AUTO, C, C#, D … B · AUTO', 'AUTO follows the detector. Any note fixes the root.'],
              ['SCALE / MAKAM', 'AUTO, MAJOR, MINOR, NIHAVENT, HICAZ, RAST, CHROM · AUTO', 'AUTO follows the detector. Any other setting fixes the scale. If either KEY or SCALE is set, KORO switches to a manual key: whatever is left on AUTO still follows the detector, and every interval is a plain scale degree with no safety gate (you have told it the key).'],
              ['MONO SAFE', 'On/off · off', 'Puts the doubled voices on the sides only (left plus, right minus) and leaves the middle as your lead, so a mono sum is exactly the input: no comb filtering when the mix is summed to mono (measured: mono response ripple 0.05 dB, against 4.4 dB with MONO SAFE off at DOUBLE 10 / WIDTH 10). WIDTH sets how much of the doubles goes to the sides. Harmony voices are not affected.'],
            ],
          },
        },
        { h3: 'Undo and redo' },
        {
          list: [
            '**macOS:** Cmd+Z undoes, Cmd+Shift+Z redoes. **Windows:** Ctrl+Z undoes; Ctrl+Shift+Z or Ctrl+Y redoes.',
            'One knob move is one step, from the moment you press the mouse button to the moment you let go. Several controls moved together (an X/Y drag, a mood key, a preset) are one step too.',
            'Click the plug-in window first so it has the keyboard. If your DAW takes the key before the plug-in does, use the DAW’s own undo.',
            'Moves made by host automation are not in the plug-in’s history: the DAW’s own undo takes those back. Loading a project, a preset file or a saved state starts a new history. The last 200 steps or more are kept.',
            'A mood key is one step, including everything the mood writes to the rear plate.',
          ],
        },
      ],
    },
    {
      id: 'moods',
      heading: 'Moods',
      blocks: [
        { p: 'A mood is a stored set of settings, recalled when you press its key. Key detection is always automatic in every mood. Pressing a mood overwrites the front knobs and the rear plate with its values; after that, everything is yours to move. The first three are doubler-only; the last three add harmony.' },
        {
          table: {
            head: ['Mood', 'Double', 'Harmony', 'Character'],
            rows: [
              ['TIGHT DOUBLE', 'DOUBLE 5.6 (2 voices) · WIDTH 3.8 · TONE 11.1 kHz', 'Off', 'Two close, tight voices. Thickens a lead without announcing itself.'],
              ['ARABESK CHOIR', 'DOUBLE 7.3 (3 voices) · WIDTH 9.2 · TONE 7.9 kHz', 'Off', 'Three loose, wide voices with a lot of timing drift.'],
              ['BACKING STACK', 'DOUBLE 8.3 (3 voices) · WIDTH 7.0 · TONE 6.1 kHz', 'Off', 'A darker three-voice stack for backing vocals.'],
              ['THIRD', 'Off · WIDTH 10 · TONE 12.4 kHz', 'HARMONY 5 · COLOR HIGH 3RD · 1 voice at level 6.3, pan R 35', 'One voice a third above. Falls back to a plain unison double (3 dB quieter) when the key is not certain on that note.'],
              ['FIFTH', 'Off · WIDTH 10 · TONE 12.4 kHz', 'HARMONY 5 · COLOR 5TH · 1 voice at level 6.3, pan L 35', 'One voice a perfect fifth above. Needs no key knowledge at all.'],
              ['CHOIR', 'DOUBLE 4.0 (2 voices) · WIDTH 10 · TONE 9.7 kHz', 'HARMONY 5 · COLOR LOW 3RD · 3 voices, levels 5.6 / 5.6 / 4.5, pans L 60 / R 60 / R 25, TIMING 12 ms', 'Three harmony voices (−2, +2, +4) plus a light double of the lead.'],
            ],
          },
        },
        { p: 'Every mood loads GLIDE 40 ms, TIMING 6 ms (CHOIR: 12 ms) and MONO SAFE off, with the key on AUTO.' },
      ],
    },
    {
      id: 'key-and-safe-rule',
      heading: 'The key and the safe rule',
      blocks: [
        { h3: 'Key detection: always on' },
        { p: 'A pitch tracker (YIN, 5 ms steps, 70–1000 Hz, mono sum of the input) follows the singer. KORO collects steady voiced notes into a pitch-class histogram with an 8-second memory, removes the singer’s own tuning offset, and scores 48 candidates: 12 roots × MAJOR, MINOR, HICAZ, RAST. NIHAVENT and CHROM are never chosen automatically; they exist as manual overrides. A first key appears after at least one second of steady singing with a clear leader. To change an established key, a challenger must lead continuously for 1.5 seconds, so a passing note does not flip it.' },
        { h3: 'The safe rule: per note' },
        {
          list: [
            '**One decision per note.** A new note starts after 60 ms without voice, or when the pitch moves more than 80 cents away from the held note. The interval for that note is decided 70 ms after the onset and held until the next note, so the harmony never changes interval inside a held note. Before the first decision the voice stays at unison. Breaths and consonants pass through unshifted.',
            '**Fifth and octave.** Once a note is clearly sung, a perfect fifth (±702 cents) and an octave (±1200 cents) are always allowed, whatever the key.',
            '**Thirds.** KORO keeps every key whose score is within 0.08 of the best (between 1 and 6 keys). It plays a third only if all of them give the same third for the note being sung. If they disagree, the third is withheld and the SAFE UNISON lamp lights. The voice then plays a plain unison double, 3 dB quieter, when COLOR is at or below the midpoint between HIGH 3RD and 5TH, and the perfect fifth when COLOR is above that midpoint (up to just before OCT). A withheld third is never replaced by an octave; the octave sounds only where COLOR points at it.',
            '**No hard switches.** Each harmony voice fades between intervals over 250 ms at constant power, so COLOR moves and key changes never click.',
          ],
        },
        { p: 'The confidence lamps show how sure the detector is, but the safe rule above is what protects the note, not a threshold on that number.' },
        { h3: 'What was measured' },
        {
          list: [
            'Synthetic vocals with known keys: C Major found at 3.01 s, D Hicaz at 2.06 s, A Minor at 1.54 s after the start.',
            'Noise: no key is claimed and the harmony voice stays at unison. Input with no voice in it passes through at gain 1.0000, with a residual of −240 dB.',
            'A real female pop vocal, 20 s (2651 voiced frames): a third was played on 31.5 % of them and unison on the rest; the SAFE lamp was lit on 65.2 % of the voiced frames. No third was ever played without every plausible key agreeing on it at that moment (0 exceptions), and 5 of 834 third frames (0.6 %) disagreed with the key KORO finally settled on (F Major).',
            'The honest limit: a Major key and its relative Minor share every note. When the singer never sings the note that tells them apart (B versus B-flat in F Major or D Minor, for example), KORO cannot know which key it is in, and it withholds thirds on the notes where the answer would differ. It would rather sing a plain unison than a wrong third.',
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
              name: 'Lead thickener',
              settings: 'Mood: TIGHT DOUBLE · DOUBLE 5.6 · HARMONY off',
              text: 'The opening state. Two close voices behind the lead, with slow drift. Turn DOUBLE below 3.0 for a single voice.',
            },
            {
              name: 'A quiet third',
              settings: 'Mood: THIRD · HARMONY 3.5',
              text: 'At 3.5 the lead stays at full level and the harmony sits at 0.7 of its level. Where the key is unsure on a note, that voice plays a plain unison double instead, and the SAFE UNISON lamp shows it.',
            },
            {
              name: 'Backing choir',
              settings: 'Mood: CHOIR · COLOR LOW 3RD → OCT (move slowly) · WIDTH 10',
              text: 'Three harmony voices and a light double. Sweeping COLOR moves each voice from the set −2 / +2 / +4 to +2 / +4 / +7 without a click.',
            },
            {
              name: 'When you already know the key',
              settings: 'REAR: KEY = D · SCALE = HICAZ · then any harmony mood',
              text: 'A manual key is trusted: every interval becomes a scale degree of D Hicaz, with no safe-rule gate. Leave SCALE on AUTO to fix only the root, or KEY on AUTO to fix only the scale.',
            },
            {
              name: 'Stable harmony over a long take',
              settings: 'Sing a verse, then press LOCK',
              text: 'LOCK holds the key the detector reached, so a long note or a modal turn cannot move it. Release it to follow the singer again.',
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
              ['Formats', 'macOS 11 or later (Apple Silicon and Intel): VST3, AU, Standalone · Windows (64-bit): VST3'],
              ['Channel layouts', 'Mono → mono, mono → stereo, stereo → stereo'],
              ['Latency (fixed, HARMONY on or off)', '2386 samples at 44.1 kHz (54.10 ms) · 2596 at 48 kHz (54.08 ms) · 5179 at 96 kHz (53.95 ms)'],
              ['Pitch tracker', 'YIN, 5 ms hop, 70–1000 Hz; tracks one voice at a time. Vibrato tracking error: mean 0.94 cents, 95th percentile 2.02 cents'],
              ['Harmony accuracy', 'Sine test, +2 (third): 277.18 Hz against a 277.18 Hz target; +4 (fifth): 329.62 Hz against 329.63 Hz. On a real vocal 99.5 % of voiced frames follow the target within 30 cents'],
              ['Double pitch drift', '−7.9 cents at worst in the self-test (limit ±15 cents)'],
              ['CPU (engine self-test)', '60 s of audio with double and harmony in about 2 s on the development machine'],
              ['Undo / redo', 'Cmd+Z / Cmd+Shift+Z (macOS); Ctrl+Z / Ctrl+Shift+Z or Ctrl+Y (Windows)'],
              ['Code signing', 'macOS installer signed with a Developer ID and notarised by Apple'],
            ],
          },
        },
        { h3: 'Measured behaviour (self-test, all checks pass)' },
        {
          list: [
            'Determinism: identical output, bit for bit, across runs.',
            'Double and harmony are independent: the difference between “both” and “double only” equals the harmony part to within 6e-8.',
            'Latency: reported equals measured (impulse and voiced cross-correlation) at 44.1, 48 and 96 kHz.',
            'No clicks or discontinuities during COLOR sweeps, manual key changes, or an automatic key change mid-phrase (largest step 1.82× the largest step of the dry vocal).',
            'Unvoiced passthrough: gain 1.0000, residual −240 dB.',
          ],
        },
        { h3: 'Limits' },
        {
          list: [
            'Monophonic material only: the tracker follows one voice. A group recording or a chord will not be harmonised correctly.',
            'Latency is 54 ms by design, not zero. Use plug-in delay compensation.',
          ],
        },
      ],
    },
    { id: 'download', heading: 'Getting KORO', blocks: gettingIt(KORO) },
  ],
};
