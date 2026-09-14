## Overview

SynthPulse writes a 16-step synth pattern across six lanes: four lead voices and two bass voices. You choose a direction, the tool proposes a pattern, and you export it as a standard MIDI file. It writes notes, not audio. The sound you hear in the browser is a preview so you can judge the idea; what leaves the tool is MIDI, and you load your own instruments in your DAW.

## Generate

1. Choose a style, a key and a scale. Four styles are available: Dark Techno, Cyberpunk Industrial, Ambient Drift and EBM Industrial Synth. Any of the twelve root notes can be paired with Minor, Phrygian, Dorian, Pentatonic Minor or Harmonic Minor.
2. Set Tempo, Note Density and Evolution Amount.
3. Select Generate Pattern.

Generate does not return the first pattern it thinks of. It writes several candidates, rates each one, and hands over the best — with a small chance of handing over a near-miss instead, because a generator that only ever returns its highest-rated idea stops surprising you.

## Evolve

Evolve keeps the pattern you have and moves it, rather than replacing it. Evolution Amount sets how far it may travel. Use Generate when you want a different idea and Evolve when you want the same idea, further along.

## The pattern score

The number beside the transport is the model's rating of the pattern it gave you, from 0 to 100. It is a prediction of whether this is a pattern somebody would keep, not a measure of musical quality, and it is trained on exactly one signal: which patterns members download. Editing a pattern by hand clears the score rather than recalculating it, because the score belongs to what the tool proposed and you have since changed it.

## Sequencer

Tap any step to switch it on or off. Switching a step on previews that note. Each lane carries its own controls: mute, a scatter that flips steps at random, a clear, and note velocity and gate length. Lane edits are yours alone — nothing re-rates or regenerates behind you.

Undo and redo cover every edit, up to forty steps back. Space plays and stops, G generates, E evolves.

## Sound preview

Sound Character offers four voices: Analog Pulse, Solid Square, Glass FM and Soft Keys. Tone, Filter Character, Echo and Space shape the preview, and Drums adds a backing pulse to play against. None of this reaches the exported file. A MIDI file carries notes, and your DAW decides how they sound, so the preview exists to help you judge the pattern rather than to be part of it.

## Export

Export MIDI writes one standard MIDI file: a tempo track plus one track per lane that is neither muted nor empty. Lead lanes are written to a synth lead program and bass lanes to a synth bass program, so a fresh DAW project makes a recognisable sound before you choose anything. Muted lanes are left out. Velocity and gate come from each lane's own settings.

Downloading is the one signal the ranking model learns from: keeping a pattern teaches it that patterns like this one are worth proposing.

## Access

SynthPulse has no sign-in of its own. Membership is held by subverselab.com, and entering SynthPulse from the site carries that session in. The workstation, its demo pattern and the sound preview are open to anyone; generating, evolving and exporting need that session. Opening SynthPulse directly without one shows a link back to the site.

## Requirements

Playback requires a browser with Web Audio support and begins only after a user interaction. Generation, evolution and export are performed by the SynthPulse server and require a working connection.
