## Overview

Arrangement GPS is an idea-to-project learning tool: it builds a full, playable arrangement blueprint from a genre and a few style choices, lets you audition it as a schematic preview, and then explains section-by-section why the arrangement is shaped the way it is and how to actually rebuild it in your DAW.

It is not a sample or project generator. Nothing produced here is a finished sound — it is a structural starting point and a teaching layer on top of it. Nothing you build is saved on SubverseLab's side; a finished idea can be downloaded as a text Project Recipe, a multi-track MIDI file, or a JSON file.

## Signing in

Arrangement GPS requires a free SubverseLab account, and subverselab.com is the only place you sign in. Opened from the tools page, your session comes with you and the tool is already signed in. Opened directly by its own URL without that session, it shows a link back to the site rather than a sign-in form — the tool has no account system of its own and never asks for a password.

## Shaping the starting idea

Choose a Genre (House, Techno, Hip-Hop, Pop, R and B, or Cinematic), a Subgenre specific to that genre, a Mood (Dark, Energetic, Chill, Melancholic, or Aggressive), and a Type (Beat, Radio Edit, Extended Mix, or Short Loop). An example arrangement is already visible before you generate anything, so you can explore the interface freely without spending your daily quota.

Four variation controls shape how a generated idea plays out, independent of genre and mood: Energy Curve (Balanced, Slow Burn, Peak Early, or Double Peak) controls where the arrangement's intensity builds and peaks. Density (Minimal, Balanced, or Layered) controls how many layers are active at once. Structure (Original, Hook First, Short Form, or Extended Arc) reshapes the section order and length. Transition Intensity (Subtle, Standard, or Dramatic) controls how much ear-catching effect work happens at section boundaries.

Every press picks three things for the new variation. A **song form** typical for the subgenre: Tech House can come out as a DJ tool with 32-bar ends or as a hook loop, Melodic Techno as one long breakdown, Drill as a short sprint, a Trailer as three acts. A **key and a chord progression** from that genre's own vocabulary, with major or minor following the mood (Dark, Melancholic and Aggressive are always minor). And a **layer plan**, sometimes with an arrangement move such as a staggered intro, a kick-less breakdown before a hook, or an outro that mirrors the intro. The bass follows the chord roots and the chords, keys, pads and lead follow the progression.

Selecting **Build starting point** generates a new variation and consumes one daily generation. Playback, section selection, mute, solo, and the guide panel never consume quota — only pressing Build starting point does.

## Reading the arrangement

The timeline shows each section as a proportional block, with a transition cue badge between sections summarizing the effect move into the next one. Below it, each instrument role (drums, bass, harmony, lead, transitions/FX, and others depending on genre) gets its own row, showing exactly which sections it's active in as colored blocks. Each active block contains a small MIDI-style pattern visualizer showing the actual rhythmic pattern for that role in that section — this is a real generated pattern, not decoration. Where a drum layer is active going into a transition, a small BS badge marks a suggested beat-switch point.

The header shows the tempo and the key of the current variation.

Playback is a synthesized structural preview, not finished production audio — it demonstrates pulse, density, and section contrast so you can hear the shape of the arrangement, not a mix you'd ship.

## The build guide

Opened with the Open Guide toggle next to the transport controls. It has three parts.

Subgenre DNA summarizes the selected subgenre itself: its typical tempo range, how its groove moves, what its sonic signature actually sounds like, its arrangement rule of thumb, a concrete first move to make in your DAW, and — distinctly useful — a stated common mistake to avoid for that subgenre specifically.

Project principles lists the general structural reasoning behind the whole generated arrangement, not just one section — why it's built the way it is at a project level.

The variation recipe shows which Energy Curve, Density, and Structure were used to generate the current version, the chord progression in both numerals and chord names (for example i–VI–III–VII · Am–F–C–G), the arrangement moves the variation made, and a short list of notes explaining what the form, the key and that combination of settings change about the result. Each Build starting point press gets its own numbered variation.

Selecting a section tab below these opens a lesson for that specific section: why the section exists, its main arrangement move, what layers enter and leave at that point, and — where the section begins with a transition — the transition's purpose, its FX cues, its suggested beat-switch instruction, a numbered list of steps to build that exact transition in a DAW, and a **Preview this boundary** button that plays just the join between the previous section and this one. Every section lesson ends with a specific listening question to check your own mix against before moving on.

## Downloading the idea

Four downloads sit next to the transport, and every layer row has its own. All three are generated on the spot from what's currently on screen; nothing is stored server-side to produce them later.

**Recipe** is a text file: BPM, key and chord progression, the variation seed, the song form and its moves, section lengths, which layers are active where, the transition choices, beat-switch points, and DAW build steps.

**MIDI** is a multi-track MIDI file of the whole arrangement. It carries the tempo, a marker at the start of every section, and one track per instrument with the notes the preview plays, already in the variation's key. Drums are on channel 10 with General MIDI notes (kick on C1 in Ableton's naming), so they land on a Drum Rack. Drag the file into your DAW to get the full skeleton on the timeline.

**MIDI tracks** saves every instrument as its own MIDI file, plus the full arrangement, as plain uncompressed files. In Chrome and Edge, when the tool is opened on its own page, it asks for a folder and writes them into a new folder there; everywhere else they download one after another into your downloads folder, and the browser may ask once whether the site may download several files. Each file keeps the tempo and the section markers, so it lands in the right place on its own. The download button at the end of a layer row saves just that instrument as one MIDI file.

**JSON** is the same arrangement in a machine-readable form, for scripts and other tools: song settings, form, key and chords, every section with its layers and guide text, and every note as start tick, length, pitch and velocity (480 ticks per beat). The format is versioned as **subverselab.arrangement-gps/v1**, and the same settings and seed always give the same file.

## Controls

Play, Pause, Stop, and Restart control the schematic preview. The timeline is click- and keyboard-seekable. S and M solo or mute an individual layer row. Open Guide and Hide Guide show or hide the learning panel. Sign out ends your session in the tool.

## Access and daily limit

Five new arrangements a day are free (per network address, per UTC calendar day). After that, a new arrangement costs 25 credits, taken from your balance when you press Build starting point; the header shows how many free arrangements are left today and your credit balance, and the button shows the cost once the free ones are used. Credits come with any plugin purchase: every dollar you pay for a plugin gives you 100 credits.

The free limit is tracked per network address, not per account — on a shared or public network, the five free arrangements are shared with everyone using that same connection. Only Build starting point counts; playback, the guide and the three downloads never do.

## Privacy

Only the minimum record needed to enforce the daily limit is stored — a hashed, non-reversible version of your network address, not the address itself. Credit spends are recorded in your account's credit history on subverselab.com. Generated arrangements are never saved.
