# Rules Index — Canonical Authority

This directory is the single source of truth for how a product moves through the SubverseLab Launchpad, from creation to production. If any other document in this repository (including files inside `Infrastructure/*/.agents/rules/`) disagrees with what's here, **this hierarchy wins** and the other document is stale and needs to be fixed.

## Reading order

An AI agent or developer entering this repository should read these files in order, only as deep as the task requires. **09 is the exception to "only as deep as the task requires"** — read it before verifying anything, because every failure in it passed the verification that was actually performed.

| # | File | Answers |
|---|---|---|
| 00 | [00_PLATFORM_INVARIANTS.md](00_PLATFORM_INVARIANTS.md) | What must never change, regardless of task |
| 01 | [01_AGENT_STARTUP.md](01_AGENT_STARTUP.md) | Where to start, what to read before touching anything |
| 02 | [02_PRODUCT_CREATION.md](02_PRODUCT_CREATION.md) | How a new product should be structured before it enters the Launchpad |
| 03 | [03_VALIDATION.md](03_VALIDATION.md) | The exact manifest schema that will be accepted or rejected |
| 04 | [04_CERTIFICATION.md](04_CERTIFICATION.md) | What "certified" means and the launch gate |
| 05 | [05_SYNC.md](05_SYNC.md) | How a certified product's metadata reaches the website |
| 06 | [06_DEPLOYMENT.md](06_DEPLOYMENT.md) | How and where services are deployed |
| 07 | [07_POST_DEPLOY_VERIFICATION.md](07_POST_DEPLOY_VERIFICATION.md) | What must be checked after a deployment before it counts as done |
| 08 | [08_DEPLOYMENT_REGISTRY.md](08_DEPLOYMENT_REGISTRY.md) | The exact production targets (projects, services, domains) |
| 09 | [09_FAILURE_LOG.md](09_FAILURE_LOG.md) | What has actually broken in production, why it looked healthy, and the check that catches it now |

## What the site publishes today

Kept here because "is this a product?" is the first question in half the tasks
that touch subverselab.com, and the answer is no longer always yes.

| Surface | What it is | Governed by |
|---|---|---|
| `/tools/:slug` | Products — a manifest, a guide, a cover, synced to Firestore | 02, 03, 04, 05 |
| `/learn/:slug` | A product's guide, written by sync | 05 |
| `/loom` | A page, not a product: Loom runs on the reader's machine and is distributed from GitHub | 02 §"Not everything published is a product", 08 |
| `/help` | FAQ, including a Loom section, from `src/data/faqContent.js` | 00 §6 |
| `/forum` | Visitor-written topics in `forum_topics`, seeded by SubverseLab | 00 §6b, 05, 06 |

Outside the numbered chain: [ROADMAP_3YR.md](ROADMAP_3YR.md) answers "where is this platform headed" — it is aspirational, not enforced, and never overrides 00–08. See its own status note before reading it as current policy.

Also outside the chain, and enforced within its own domain: [`Assets/README.md`](../Assets/README.md) answers "what does SubverseLab look like" — the palette, typefaces, motifs and logo system, all generated from `Assets/Brand/_kit/brand.py`. It governs brand surfaces (social accounts, share cards, logo lockups, the website's own look). It deliberately does **not** govern per-tool product cover art, which stays in each tool's own folder.

## Authority precedence

1. **This hierarchy (`Rules/00`–`09`) is canonical** for platform rules, product creation, validation, certification, sync, deployment, and verification policy.
2. **`Infrastructure/CloudRun/subverselab-v2/.agents/rules/` and `Infrastructure/MetadataSync/metadata-sync-service/.agents/rules/` are build-bundled mirrors**, not independent authorities. They exist because each service's Docker image packages its own `.agents/rules/` directory for in-container agent context (see that service's `Dockerfile`). Their content should track `Rules/05_SYNC.md`, `06_DEPLOYMENT.md`, and `08_DEPLOYMENT_REGISTRY.md`, but they are copies, not the source. As of this restructure they have not been edited to point back here — treat any conflict as the mirror being stale, not as a real disagreement to resolve by guessing.
3. **The actual enforced validation behavior is the code**, specifically `validateManifestSchema()` in `Infrastructure/MetadataSync/metadata-sync-service/server.js`. `03_VALIDATION.md` is written to match it exactly. If the two ever disagree, the code is what's really running — report the mismatch rather than editing the running service without explicit instruction.
4. **`Rules/_legacy/` is historical, not authoritative.** It exists so nothing was deleted during this restructure. Nothing in `_legacy/` should be read as current policy.

## What changed

This numbered structure replaces three previously separate, overlapping files: `CERTIFICATION_RULE.md`, `LAUNCH_AUTHORIZATION.md`, and `PRODUCTION_PRINCIPLE.md` (now in `Rules/_legacy/`), plus the root-level `LAUNCH_CHECKLIST.md` (also moved to `Rules/_legacy/`). Their content has been consolidated, not discarded — each numbered file above states which legacy file(s) it replaces.
