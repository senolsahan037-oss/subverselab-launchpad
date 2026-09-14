# SubverseLab Launchpad

The spine of [subverselab.com](https://subverselab.com) — the rules every
product is held to, the services that publish it, and the staging directories it
passes through on the way out.

The tools themselves are not in this repository. Each one has its own, listed
below.

## What SubverseLab is

A one-person music-production platform: browser tools for producers, an Ableton
Live production system, and the research layer that feeds both. Everything here
is built and run by one person, and the rules in `Rules/` exist because of that
— they are the substitute for a second pair of eyes.

The organising principle across every repository is the same: **do not report
what has not been measured.** A tool that cannot determine a key returns no key;
a chopper that cannot find the tempo skips the grid technique and writes down
why. Most of the design notes in the individual READMEs are records of that rule
being enforced against a tempting shortcut.

## The repositories

**Live browser tools** — each deploys to Cloud Run and is framed by the
subverselab.com Tool Room:

| Repository | What it does |
|---|---|
| [subverse-splitter-web](https://github.com/senolsahan037-oss/subverse-splitter-web) | Stem separation, vocal removal and key/BPM analysis on HT-Demucs, with overlap-add reconstruction |
| [subverse-mix-analyzer](https://github.com/senolsahan037-oss/subverse-mix-analyzer) | Mix Check — ITU-R BS.1770 LUFS, peak, crest, compared against 98 real released masters |
| [sensei-drum-generator](https://github.com/senolsahan037-oss/sensei-drum-generator) | 8-bar MIDI drum patterns in 22 genre styles, exported for any DAW |
| [subverse-synthpulse](https://github.com/senolsahan037-oss/subverse-synthpulse) | 16-step synth patterns across four lead and two bass lanes |
| [subverselab-arrangement-gps](https://github.com/senolsahan037-oss/subverselab-arrangement-gps) | Genre-aware arrangement blueprints with a Web Audio preview |
| [subverselab-time-frequency-sync](https://github.com/senolsahan037-oss/subverselab-time-frequency-sync) | BPM-synced delay and reverb times, key-to-Hz harmonics, repitch math |

**Desktop / Ableton Live:**

| Repository | What it does |
|---|---|
| [loom](https://github.com/senolsahan037-oss/loom) | The measurement-based production system for Ableton Live — an MCP server plus a Live extension. 45 tools |
| [subverselab-splitter](https://github.com/senolsahan037-oss/subverselab-splitter) | The JUCE/C++ stem separator — standalone, VST3 and AU, ONNX HT-Demucs on-device |

**Research and production line** — not products; the layer that decides what is
worth making:

| Repository | What it does |
|---|---|
| [crate-agent](https://github.com/senolsahan037-oss/crate-agent) | Finds and screens 1968–1998 Middle Eastern source records |
| [sample-reader](https://github.com/senolsahan037-oss/sample-reader) | Measures the audio itself, not the filename |
| [sample-chopper](https://github.com/senolsahan037-oss/sample-chopper) | Chops the way it would be done by hand in Ableton |
| [subverselab-sampler](https://github.com/senolsahan037-oss/subverselab-sampler) | Sample packs from YouTube or local audio, plus a chop bench that writes into a Live project |

## What is in this repository

```
Rules/            The production constitution — 00 through 09, start at INDEX.md
Templates/        Manifest and guide templates a product is validated against
Infrastructure/   The deployed services (see below)
00_Inbox/         Where a product enters: manifest, guide, cover, assets
02_ – 06_         Staging directories for folder products (presets, packs, racks)
Scripts/          Agent-rule sync and verification, Social Publish OAuth setup
10_VERS_Agent/    VERS, the house voice used across site chat, Help and FAQ
```

### Infrastructure

| Path | What it is |
|---|---|
| `CloudRun/subverselab-v2` | The website — React/Vite, served by Express, deployed to Cloud Run, domain-mapped |
| `MetadataSync/metadata-sync-service` | The validation gate. `validateManifestSchema()` in its `server.js` is the behaviour every product is actually held to |
| `SocialPublish` | YouTube + Instagram cross-posting adapter |
| `ToolAuthBridge` | The handoff that carries a signed-in session from the website into a tool |

## How a product reaches the site

```
00_Inbox/<product>/      manifest.json + guide + cover + content
        ↓
Rules/03_VALIDATION      schema, guide Markdown subset, required fields
        ↓
Metadata Sync Service    validateManifestSchema() — the real gate
        ↓
Firestore                one document per product
        ↓
subverselab.com          /tools/:slug and /learn/:slug render synced metadata
```

The website never infers anything about a product. Products describe themselves,
the sync service validates the description, and the site renders what survived.

## Not everything published is a product

`/loom` is a page, not a product — Loom runs on the reader's own machine and is
distributed from GitHub, so there is nothing for the site to serve or gate.
`Rules/02` carries the test that decides which one a thing is, and
`Rules/INDEX.md` lists what each surface publishes today.

## Rules

`Rules/INDEX.md` defines the reading order and which files are authoritative.
Two of them are worth naming here:

- **`00_PLATFORM_INVARIANTS.md`** — where the gate sits, and §6b: seeded content
  is SubverseLab-signed. No invented people, testimonials, ratings or activity
  figures, ever.
- **`09_FAILURE_LOG.md`** — the failure classes, each one written after it
  actually happened in production. It is the most useful file in the directory.

## Secrets

No credentials are committed. `.env` is ignored everywhere and the deployed
services read their configuration from Cloud Run. The Google Cloud project id,
Cloud Run service URLs and Firebase auth domain do appear in configuration and
documentation — those are public identifiers, visible to anyone who opens the
site's network tab, not secrets.

## Licence

Source-available, all rights reserved — see [LICENSE](LICENSE). Published for
reference; no licence to use, copy or distribute is granted by its publication
here.
