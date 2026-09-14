## Overview

Subverse Splitter is a member-only web tool for analysing music and separating a track into stems. It offers three operations:

- **Key and BPM** estimates tempo, musical key, Camelot code, and key confidence. It does not use the daily separation allowance.
- **Vocal removal** returns the vocal and an instrumental version.
- **Stem separation** returns drums, bass, vocals, and other instruments.

Vocal removal and stem separation use the same HT-Demucs model and therefore cost the same daily separation run.

## Requirements

- A free SubverseLab account.
- A current desktop or mobile browser with JavaScript enabled.
- A supported audio file up to **300 MB**.
- A stable connection while the file uploads and while results are downloaded.

Common WAV, MP3, FLAC, M4A, AAC and OGG files are accepted. Other formats that FFmpeg can decode may also work, but the listed formats are the supported choices.

## Limits and daily allowance

- Key and BPM analysis: tracks up to **10 minutes**; no separation allowance is used.
- Vocal removal: tracks up to **6 minutes**; uses one daily separation run.
- Stem separation: tracks up to **6 minutes**; uses one daily separation run.
- The separation allowance is enforced once per member and once per network address each day.

People sharing the same public network address, such as an office or campus, share that network's daily separation run. Administrators are exempt from this product quota.

A run is reserved when separation starts and marked used only after the job completes. If processing fails, the reservation is released automatically.

## How to use it

1. Sign in on SubverseLab and open Subverse Splitter from its product page.
2. Choose one of the three operations: Key and BPM, Vocal removal, or Stem separation.
3. Drop an audio file onto the file area or choose one from your device.
4. Select the Run button.
5. Keep the page open while the progress bar and elapsed time update.
6. When separation completes, audition the result in the synchronized mixer.
7. Each stem row carries an M button to mute it and an S button to solo it, alongside that stem's volume control. Soloing one or more stems silences the rest; with nothing soloed, the muted stems are the silent ones.
8. Download an individual 24-bit WAV, or choose Download all for a ZIP archive.

The operation cards and file chooser stay locked while a job is active, preventing an accidental second upload from replacing the running job.

## Results

### Key and BPM

The result displays:

- BPM
- musical key and major/minor scale
- Camelot code
- key-confidence percentage
- uploaded audio duration

Tempo can be rhythmically ambiguous at half-time or double-time. Key confidence indicates how strongly the material matches the reported tonal profile. Silence and material without a reliable tonal centre are reported with low confidence rather than treated as certain.

### Vocal removal

The mixer contains:

- **Vocals**
- **Instrumental**

The instrumental is calculated from the mix minus the vocal estimate.

### Stem separation

The mixer contains:

- **Drums**
- **Bass**
- **Vocals**
- **Other**

The browser uses compact protected previews for synchronized playback. Downloads remain lossless 24-bit WAV files.

## Processing and privacy

Uploaded audio is processed by the dedicated Subverse Splitter Cloud Run service. Audio, previews, and downloads stay in the accepting instance's temporary workspace and are not written to the product database. Completed workspaces expire automatically, normally within 30 minutes, and may be removed earlier when the bounded job store needs space.

The main SubverseLab website supplies the existing member session to the tool through a short-lived, exact-origin Firebase handoff. The tool has no separate login form. Job status and every preview, WAV, and ZIP request are checked by the tool server against the signed-in member.

## Error behaviour

- Files larger than 300 MB are rejected before processing.
- Tracks over the selected operation's duration limit are rejected without silent truncation.
- Unsupported or damaged audio returns a decode error.
- A full queue returns a retry message instead of accepting work that cannot be held safely.
- An expired or unknown job returns a not-found message.
- A failed separation restores the daily run.

If a separation fails, retry after checking the source file. If the same file fails repeatedly, convert it to WAV or FLAC and try again.

## Quality notes

Stem separation is an estimate. Bleed, reverb, doubled vocals, dense mastering, and instruments with overlapping frequency ranges can remain across stems. The tool preserves model window continuity with overlapping crossfades, but it cannot recreate sources that are not recoverable from the mixed recording.

## Version

- Tool version: **2.0.0**
- Guide version: **2.0.0**
- Updated: **26 August 2026**

