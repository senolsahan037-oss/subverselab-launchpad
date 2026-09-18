## What this does

You upload a song and its cover. The tool measures the audio, takes the three
colours the video will use from the cover itself, and animates one to the other.
What comes out is a 1920x1080 mp4 at 30 frames a second, ready to upload.

There is nothing to install and nothing to configure. The only decision you make
is which style to use, and you make it after seeing each one running on your own
track.

---

## Preview first, render once

Every style is previewed before anything long starts. Five seconds of each, on
your audio and your cover, and it costs nothing — you can rebuild the previews
as often as you like.

Only the full render is rationed: one a day, per account and per network.

The reason for that split is worth stating. Rendering a three-minute track takes
about six minutes of machine time. Choosing a style from a description, or from
a sample made with somebody else's music, means finding out afterwards that it
was the wrong choice. So looking is free and the choosing is where the care goes.

The preview is not taken from the opening of the song. Tracks tend to start
quiet, and five seconds of an intro shows a still image and a flat line, which
says nothing about the style. The tool finds the most energetic stretch of the
track and previews that.

---

## The styles

| Style | What it looks like |
|---|---|
| Radial | The cover at the centre, inside a ring of spectrum bars that reacts to the track. At thumbnail size it reads as a record. |
| Marquee | The cover high in the frame with the spectrum mirrored along a lit baseline below it. At thumbnail size it reads as a stage. |

The two are deliberately opposite compositions rather than two colour schemes.
Which one suits a release depends on the cover, which is why you look at both.

---

## What it accepts

| | Limit | Why |
|---|---|---|
| Audio size | 40 MB | Three and a half minutes of 16-bit stereo WAV is 37 MB |
| Audio length | 6 minutes | Rendering costs roughly twice the length of the track |
| Audio length, minimum | 5 seconds | Below that there is no video to make |
| Cover size | 8 MB | It is scaled to 820 pixels; nothing above that is used |
| Cover dimensions | 600 to 6000 pixels | Below 600 the cover is enlarged and the video shows it |

Accepted audio formats are wav, mp3, flac, aiff and m4a. Accepted covers are
png, jpg and webp.

The binding limit is length, not size. A 40 MB WAV is three and a half minutes;
a 40 MB MP3 can be half an hour, which is why the two are capped separately.

---

## How to use it

1. Drop in your audio and your cover. The tool reads both and tells you what it
   found — the length, the frame count, the three colours it took from the
   artwork, and how long a render will take.
2. Build the previews. Every style appears, looping, taken from the busiest part
   of the song. This step is free.
3. Click the style you want. It is marked as chosen.
4. Render. The progress bar is real, not an animation, and the tab can be left
   open or closed and reopened while it runs.
5. Download the mp4.

---

## What it does not do

It does not choose a style for you. Two styles look different on different
covers and that judgement belongs to whoever made the record.

It does not upload anything anywhere. It writes a file you download.

It does not write a title, a description or tags. That is a different job.

Nothing is kept. Your audio, your cover and the finished video are deleted from
the machine that made them when the job ages out.

---

## If something goes wrong

A render that fails gives your daily render back. You are never charged for a
video you did not receive, and the message says so when it happens.

If the tool says your files could not be read, the message names which of the
two and why. A cover under 600 pixels and a track over six minutes are the two
most common, and both are stated before anything long starts rather than after.
