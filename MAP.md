# Repository map

Everything published under this account, grouped by what it is and where it runs.
The grouping is not only written here: every repository carries the topic
`subverselab` plus one group topic, so the same split is visible from GitHub's
own search.

---

## The spine — topic `launchpad`

| Repository | What it is |
|---|---|
| [subverselab-launchpad](https://github.com/senolsahan037-oss/subverselab-launchpad) | The rules every product is held to, the validation gate, the deployment registry, and this map. Not a product |

---

## Tools that run in a browser — topic `live-tool`

Free, no account needed, at [subverselab.com](https://subverselab.com). Six tools
across seven repositories: the splitter has both a web service and a desktop
plugin built from the same model.

| Tool | Live at | Repository | What it does |
|---|---|---|---|
| Mix Check | [/tools/subverse-mix-check](https://subverselab.com/tools/subverse-mix-check) | [subverse-mix-analyzer](https://github.com/senolsahan037-oss/subverse-mix-analyzer) | ITU-R BS.1770 LUFS, peak and crest, compared against genre profiles measured from 98 real released masters |
| Splitter | [/tools/subverse-splitter](https://subverselab.com/tools/subverse-splitter) | [subverse-splitter-web](https://github.com/senolsahan037-oss/subverse-splitter-web) · [subverselab-splitter](https://github.com/senolsahan037-oss/subverselab-splitter) | Stem separation, vocal removal and key/BPM analysis on HT-Demucs. The desktop build is JUCE/C++ with the model on-device |
| Sensei | [/tools/sensei](https://subverselab.com/tools/sensei) | [sensei-drum-generator](https://github.com/senolsahan037-oss/sensei-drum-generator) | 8-bar MIDI drum patterns in 22 genre styles, thinned by per-channel density |
| SynthPulse | [/tools/synthpulse](https://subverselab.com/tools/synthpulse) | [subverse-synthpulse](https://github.com/senolsahan037-oss/subverse-synthpulse) | 16-step patterns across four lead and two bass lanes, evolved and exported as MIDI |
| Arrangement GPS | [/tools/arrangement-gps](https://subverselab.com/tools/arrangement-gps) | [subverselab-arrangement-gps](https://github.com/senolsahan037-oss/subverselab-arrangement-gps) | Genre-aware arrangement blueprints with an in-browser Web Audio preview |
| Time & Frequency Sync | [/tools/time-frequency-sync](https://subverselab.com/tools/time-frequency-sync) | [subverselab-time-frequency-sync](https://github.com/senolsahan037-oss/subverselab-time-frequency-sync) | BPM-synced delay and reverb times, key-to-Hz harmonics and repitch math — audible before you use them |

---

## Loom and the engines that feed it — topic `mcp-tool`

Loom runs on the reader's own machine, not on a server, so there is nothing here
for the site to serve.

| Repository | What it is |
|---|---|
| [loom](https://github.com/senolsahan037-oss/loom) | A local MCP server with 45 tools for Ableton Live: reads your own `.als` archive, and writes MIDI, device chains, automation and locators into a running Live session through an Ableton Extension, verifying every write by reading it back |
| [sample-reader](https://github.com/senolsahan037-oss/sample-reader) | Measures the audio itself rather than the file name — tempo, key, brightness, analogue signature — and refuses to answer when the evidence is thin |
| [sample-chopper](https://github.com/senolsahan037-oss/sample-chopper) | Chops a recording the way it would be chopped by hand in Ableton, driven by measured numbers |
| [subverselab-sampler](https://github.com/senolsahan037-oss/subverselab-sampler) | Sliced sample packs with a waveform UI, plus a chop bench that writes into an Ableton project |
| [crate-agent](https://github.com/senolsahan037-oss/crate-agent) | Finds, downloads and screens 1968–1998 Middle Eastern source records for chopping |

---

## Its own line — topic `pipeline`

| Repository | What it is |
|---|---|
| [rap-voice-clone](https://github.com/senolsahan037-oss/rap-voice-clone) | A per-artist Turkish rap voice pipeline that trains on a free Kaggle T4: ACE-Step LoKr plus Seed-VC. Code and the mistake ledger only — no audio, no weights, no artist names |

---

## What is not here

- **Rendered media.** Renders, bounces and audio output are large and often
  unreleased. The script that makes a render is source and belongs in a
  repository; the render itself does not.
- **Datasets and model weights.** Training code is published, trained voices are
  not.
- **Commercial work.** Some of what is built here is private. This map covers the
  public account only.

The profile page itself is a repository too:
[senolsahan037-oss](https://github.com/senolsahan037-oss/senolsahan037-oss).
