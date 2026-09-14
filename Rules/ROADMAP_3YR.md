# 3-Year Roadmap — Multi-Creator Marketplace

**Status: aspirational, not enforced.** Everything in this file describes where the platform owner intends to take SubverseLab over roughly the next three years. Nothing here is built, and nothing here overrides `00_PLATFORM_INVARIANTS.md` through `08_DEPLOYMENT_REGISTRY.md`. Those files describe what the platform actually does today and remain the only enforced authority. When a section below is actually implemented, the relevant numbered rule file must be updated to reflect it, and this file's entry should be marked `Done` with a date and a pointer to the rule that now governs it.

This file exists so the direction does not have to be re-litigated every time it comes up. Recorded from a planning conversation on 2026-08-11.

## Why this exists

The platform owner has put substantial, hard-to-reverse effort into SubverseLab and intends to keep investing in it regardless of near-term traffic — expectations for the next year are modest, but the long-term target is deliberately larger, and the owner does not want the architecture rewritten every time this comes up ("yazboz" — no more back-and-forth). Get the target shape agreed once, then build toward it incrementally, at whatever pace traffic actually justifies.

## The target: a multi-creator marketplace, not a single-owner showcase

Today, `00_PLATFORM_INVARIANTS.md` describes a platform where the owner is the only one who creates and registers products; every product currently on the site was registered by the owner or on the owner's explicit instruction (`08_DEPLOYMENT_REGISTRY.md`'s current registry).

The three-year target adds independent creators who register and sell their own products through the same platform, without the owner engineering each submission by hand:

- **Producers** — publish and sell their own sample packs, MIDI packs, presets.
- **Vibecoders / tool developers** — publish their own AI tools as independently deployed remote services (same shape as Sensei, SynthPulse, Subverse Mix Check today, but deployed and owned by someone other than the platform owner).
- **Plugin developers** — publish their own downloadable plugins.

Each creator gets a personal page at a vanity path off the root domain (`subverselab.com/xproducer`, `subverselab.com/xdeveloper` — exact routing scheme not yet decided), showing their bio and their own product catalog. Revenue share with creators is already conceptually present on the site today (the existing "Publish Your Sample Pack" card advertises a 70/30 split) — the roadmap below is what actually has to exist for that promise to be real and safe to operate.

## Non-negotiable extension of an existing invariant

`00_PLATFORM_INVARIANTS.md` §1 already states: "Every product entering production must follow the same validated pipeline regardless of who created it." The three-year target does not weaken this — it generalizes "who created it" to include external, unvetted creators, which makes the existing pipeline discipline more important, not less. Concretely:

**A third-party submission must never reach public production directly from the creator's own upload or the creator's own infrastructure.** It always lands in a quarantined, not-yet-public area first; only an approved, repackaged copy — hosted and served under the Launchpad's own pipeline (the same shape `02_PRODUCT_CREATION.md` already describes for owner-created products) — ever becomes publicly reachable. This applies identically to all three content types below, even though what "repackage" means differs per type.

## Workstream 1 — Creator identity

A new first-class entity, separate from a regular consumer account: a creator profile (working shape: a `creators/{handle}` record — handle, display name, bio, avatar, which `products/{slug}` documents belong to them, payout/revenue-share terms). Personal pages render from this record the same way `guide.md` content renders product pages today — the page shows only what the creator record actually states, never anything inferred.

Lowest-risk workstream to build first: it has no code-execution or file-trust surface by itself, it is additive to the existing `products` collection rather than a change to it, and it can exist before self-service submission does (the owner can seed the first creator records by hand, the same way every product on the site is registered by hand today).

## Workstream 2 — Self-service submission pipeline

Today, turning a verified tool/pack into a registered product is a manual process the owner (or an agent acting for the owner) performs by hand, end to end: write the manifest, write the guide, prepare a cover, run the sync. `05_SYNC.md`'s `/api/admin/sync-remote-metadata` endpoint already exists for this but has never actually been used by an authenticated admin caller in practice — every registration so far has gone through direct, faithfully-replicated Firestore writes as a stopgap, specifically because no one has held a working admin-claimed Firebase token.

The target: a creator-facing dashboard where a creator submits a manifest, guide, and assets themselves, and the submission lands in a `submitted` / `pending_review` state — never live — until reviewed (Workstream 3). This requires first fixing the admin-token gap so there is a real authenticated path into the sync service, rather than building creator self-service on top of a workaround.

## Workstream 3 — Trust and review, by content type

This is where "moderator" stops meaning a person the owner has hired (the owner does not expect to need to hire one soon, and may never) and starts meaning: a review gate that can be satisfied by an automated check, an AI agent's first-pass judgment, the owner's own manual review, or some combination — the point is the gate exists and nothing skips it, not who or what staffs it.

The risk profile is different per content type, so the review step is not one-size-fits-all:

| Content type | Primary risk | Review before publish |
| --- | --- | --- |
| Remote AI tool | Runs the creator's own live code inside an iframe on subverselab.com; the creator's URL is arbitrary infrastructure the owner does not control | Manual/agent review of the actual running tool at that specific URL; the URL is allow-listed individually per approved tool, never trusted by domain pattern the way `isSafeUrl()` currently trusts `*.run.app` for owner-deployed tools |
| Plugin (downloadable binary) | Unsigned executable — a real malware distribution vector if published unchecked | Automated scan (e.g. VirusTotal or equivalent) before the file is copied into Launchpad-owned storage; never link directly to a creator-hosted binary |
| Sample pack / MIDI pack / preset | Below-standard audio quality, corrupt files, unclear licensing/copyright — reputational and legal risk, not a code-execution risk | Automated QC (sample rate/bit depth/integrity, silence/clipping sanity check) plus an explicit licensing declaration from the creator |

None of these automated checks need to exist yet. What needs to exist first is the state machine every submission moves through, so today's fully-manual review (the owner, or an agent, looking at a submission by hand — exactly what this session has been doing for every product registered so far) already lives inside the right shape, and a scanner or an agent can be dropped into the `pending_review` step later without a schema migration:

`submitted → pending_review → approved (repackaged, published) | rejected (reason recorded, creator notified)`

## Workstream 4 — Payments and revenue share

Splitting a sale between the platform and a creator (Stripe Connect or an equivalent) is its own substantial project — real money, tax/reporting obligations, payout timing, refund/chargeback handling. Deliberately sequenced last: none of Workstreams 1–3 depend on it, and the site already advertises a 70/30 split with zero creators actually onboarded, so there is no live promise being broken by building this last.

## Sequencing note

Suggested order — creator identity, then the submission pipeline, then per-type review, then payments — follows dependency, not urgency. Given the stated one-year traffic outlook, none of this needs to be built ahead of demand. What this file is actually for is making sure that when demand does show up, the next piece slots into an already-agreed shape instead of triggering a redesign.
