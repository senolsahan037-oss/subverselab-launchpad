# Rules — reference files

**Read `CLAUDE.md` at the repository root first.** It holds the standing rules (owner, publishing, money, the release
freeze, the plug-in release gate, the interface signature, working style) and it wins over every file here. These are
reference files: the detail behind a rule, the data a deploy needs, and the record of what has broken.

| File | Answers |
|---|---|
| [SITE_RUNBOOK.md](SITE_RUNBOOK.md) | Who decides a deploy, the gate before it, the rollout, what is checked afterwards, and the serving-layer behaviour that must not regress |
| [DEPLOYMENT_REGISTRY.md](DEPLOYMENT_REGISTRY.md) | Exact production targets: Google Cloud projects, Cloud Run services, regions, URLs, the downloads bucket, Lemon Squeezy, the licence API |
| [FAILURE_LOG.md](FAILURE_LOG.md) | What has broken in production, why it looked healthy, and the check that catches it now. Read before verifying anything |
| [BROWSER_TOOLS.md](BROWSER_TOOLS.md) | The seven `/tools/<slug>` products only: manifest, validation, sync, quotas, session handoff. Not plug-ins |

Brand surfaces (logo, palette, share cards) are governed by [`Assets/README.md`](../Assets/README.md); plug-in panels by
`01_AI_Tools/subverselab-plugin-common/docs/UI_SIGNATURE_STANDARD.md`.

## Where the old numbered files went (2026-10-15)

The `00`–`09` set, `INDEX.md`, `ROADMAP_3YR.md`, `_legacy/` and `_sync/` were written in August for a platform whose
products all passed through a manifest pipeline. The plug-ins never did, so the set no longer described how things ship.
Nothing was deleted; the originals are in `_arsiv/rules_2026-10/`. Code comments that still cite an old file resolve here:

| Old reference | Now |
|---|---|
| `00_PLATFORM_INVARIANTS.md` | §3–5 and §12 → `BROWSER_TOOLS.md` Part 1. §4 secrets, §6b no invented people, §7 data protection → `CLAUDE.md`. §2, §8–§11 retired (they described the site as a presentation layer with no API and required `.agents/rules` in every container) |
| `01_AGENT_STARTUP.md` | `CLAUDE.md` ("Claims and verification") |
| `02_PRODUCT_CREATION.md` | `BROWSER_TOOLS.md` Part 2 |
| `03_VALIDATION.md` | `BROWSER_TOOLS.md` Part 3 |
| `04_CERTIFICATION.md` | retired; the plug-in release gate is in `CLAUDE.md`, the site gate in `SITE_RUNBOOK.md` |
| `05_SYNC.md` | `BROWSER_TOOLS.md` Part 4 |
| `06_DEPLOYMENT.md`, `07_POST_DEPLOY_VERIFICATION.md` | `SITE_RUNBOOK.md` |
| `08_DEPLOYMENT_REGISTRY.md` | `DEPLOYMENT_REGISTRY.md` |
| `09_FAILURE_LOG.md`, root `PLATFORM_INCIDENTS.md` | `FAILURE_LOG.md` (October incidents: section O) |
| `INDEX.md`, `ROADMAP_3YR.md`, `_legacy/`, `_sync/` | archive only |

The `.agents/rules/` copies under `Infrastructure/*/` were generated from the old set by `Scripts/sync-agent-rules.js`
(manifest in `_sync/`, now archived) and had drifted 15 of 15. They are no longer shipped in the site's container
(Dockerfile change queued 2026-10-15). On 2026-10-15 the copies and both sync scripts were moved to `_arsiv/rules_2026-10/agents/` and `_arsiv/rules_2026-10/scripts/`.
