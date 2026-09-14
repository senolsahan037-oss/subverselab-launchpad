# Assets

- **`Brand/`** — Finished, approved brand assets only (logos, wordmarks, official emblems, generated brand surfaces). When something here is "the real one," it lives here in its original/highest-quality form — not just as a reference screenshot buried in some other project. Before recreating or hunting for a brand asset, check here first.
- **`Media/`** — General dropbox for everything else: assets found while browsing that might be useful later, and produced media (generated images/videos, drafts, one-off outputs) from work sessions. Less curated than `Brand/` — this is a working archive, not a polished library. Filenames are prefixed with the date they were added (`YYYY-MM-DD_description.ext`).

Not part of the Rules-governed product certification pipeline (see `Rules/INDEX.md`) — this is just persistent storage so assets stop getting lost in whatever tool or folder happened to create them.

## Brand visual language

`Brand/_kit/` holds the system every brand asset is generated from:

- **`brand.py`** — the visual language itself: palette, type, and the three motifs. Nothing else defines these.
- **`generate.py`** — rebuilds every asset. `python3 generate.py` writes `Brand/logo/`, `Brand/social/` and `Brand/web/`, plus a `contact-sheet.jpg` showing the whole system on one page.

```
cd Assets/Brand/_kit
python3 generate.py                              # rebuild everything
python3 generate.py post "Your headline here"    # one-off Instagram post
```

**Palette — emblem-led.** `subverse-lab-golden-ratio-emblem.png` is the approved mark and it is cream + dark green, while the website UI is black/gold/teal. Those were two identities; the emblem wins for brand and marketing surfaces.

| Role | Hex | Use |
|---|---|---|
| Ground | `#F2EFE7` | cream, every brand surface |
| Ink | `#033733` | all type and linework |
| Accent | `#C5A059` | one gold highlight per composition — the only colour shared with the website |
| Secondary text | `#496C68` | captions, URLs |
| Inverted ground | `#032825` | the occasional dark asset |

The website stays dark. That is the product UI, a different job — gold is what keeps the two visibly related.

**Type.** DIN Condensed Bold for display (the industrial-measurement voice, which is the point of tools that measure rather than guess); Avenir Next for running text. Both ship with macOS, so this reproduces on any Mac with no font install.

**Motifs — all three come from the emblem, none are invented.** A summed-sine waveform band (three non-harmonic sines with a `sin^0.7` envelope, so it reads as real audio rather than noise); the fader/tick rule, which is what makes a layout read as an instrument panel; and the golden-ratio spiral for large quiet areas.

**The emblem is never redrawn.** `brand.py` loads the PNG, splits it on its horizontal gutters into mark / wordmark / fader-bar, and re-tints those as alpha masks. Approximating a finished brand asset in code produces a near-copy that slowly replaces the real one — extracting it keeps exactly one canonical drawing.

**Scope.** This governs SubverseLab's own brand surfaces: social accounts, website share cards, logo lockups. It deliberately does *not* govern per-tool product ads — those are still built from each tool's own project folder, as before.
