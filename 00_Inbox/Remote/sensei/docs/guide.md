## Overview

Sensei creates an 8-bar, 4/4 drum pattern from a style and its generation controls. The sequencer shows all 8 bars at 16th-note resolution across six channels: Kick, Snare, Hi-hat, Open Hat, Crash and Perc. The mixer controls playback without changing snapshot or export data.

## Generate

1. Choose a style. Tempo comes from that style and the seed is drawn fresh for each generation, so both are shown as readouts rather than fields.
2. Select Generate.
3. Select Cancel to abort an active request. An aborted or failed request does not replace the current pattern or enter history.

## Density

Kick, Snare, Hi-hat and Perc each have a density knob. The knobs thin the pattern that is already loaded: they remove the least structural hits first, take effect while playback continues, and never trigger a new generation. Every generation returns the knobs to their defaults, so a fresh pattern is always heard in full before it is thinned. The thinned pattern is what plays, what the sequencer draws, and what an export writes.

## Variation and locks

Variation derives another take from the current pattern instead of generating a new one: same style, same tempo, same seed. The Amount knob beside the Variation button sets how much of the pattern may move, and the button stays inactive at zero because nothing would change. Locked channels are supplied to the engine and are left untouched by both Variation and Generate.

## Transport and mixer

Play starts the active A/B snapshot and repeats it until Stop. Stop and Restart return the playhead to the first position. Loop switches repeating on and off. Opening this Guide pauses playback.

Mute and Solo affect playback only. Multiple channels may be soloed. Mixer state does not modify history snapshots or exported MIDI data.

## History and A/B

Every successful generation creates an immutable history snapshot containing its pattern and generation settings. A selects the previous snapshot and B selects the current snapshot. Changing A/B stops playback before the selected snapshot becomes active. Restoring history does not start a generation request.

## Export

Full Pattern writes one MIDI file containing every channel. Every Channel writes a ZIP holding one MIDI file per non-empty channel. Channel MIDI on a mixer strip writes that single channel. Export follows the active A/B snapshot and the current density settings; mute does not remove MIDI events.

## MIDI mapping

Sensei uses the note mapping supplied by its drum engine. Exported files include the active snapshot BPM and use the snapshot seed and channel name in their filenames.

## Access

Sensei has no sign-in of its own. Membership is held by subverselab.com, and entering Sensei from the site carries that session in. Opening Sensei directly without a site session shows a link back to the site; pattern generation, variation and every official MIDI or ZIP export need that session.

## Requirements

Playback requires a browser with Web Audio support and begins only after a user interaction. Official exports are created through the protected Sensei export endpoint.
