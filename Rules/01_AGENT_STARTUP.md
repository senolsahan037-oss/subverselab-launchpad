# 01 — Agent Startup

**Read this before doing anything else in this repository.**

1. Start at [`Rules/INDEX.md`](INDEX.md). It defines the reading order and authority precedence for the whole rule set.
2. Read [`00_PLATFORM_INVARIANTS.md`](00_PLATFORM_INVARIANTS.md) in full — these rules apply regardless of what task you were given.
3. Read only as far into `02`–`08` as your task requires (see the table in `INDEX.md`).
4. If your task touches a specific deployed service (`Infrastructure/CloudRun/subverselab-v2` or `Infrastructure/MetadataSync/metadata-sync-service`), also read that service's own `.agents/rules/` directory — it is a build-bundled mirror of `05`, `06`, and `08` for that service's container, and may contain service-specific operational detail (deploy commands, known pitfalls) not repeated here.
5. If your task produces anything anyone will look at — a logo, a social post, a share card, a page on subverselab.com — read [`Assets/README.md`](../Assets/README.md) first. The brand's palette, typefaces and motifs are defined once, in `Assets/Brand/_kit/brand.py`, and every asset is generated from it. Do not pick fresh colours, pull an icon pack, or hand-make a one-off image; regenerate from the kit. This sits outside the numbered chain because it is not part of the certification pipeline, but it is still the single source of truth for its own domain.
6. **Check what is live before quoting what is written.** These rules describe a platform that changes, and the gap runs both ways: a rule can be stale, and a file can be committed without ever being released. Two live examples found on 2026-09-12 — `firestore.rules` said the forum was readable while production answered 403 because the rules had never been deployed, and Loom's README said its Live acceptance was pending five days after it passed. When a rule and production disagree, find out which one is wrong before acting on either, and fix the one that is.
7. **Do not use a rule to refuse work the rules do not actually forbid.** `§5` governs product quotas; it says nothing about writing a page, documentation or a repository link. A gap in the rules is a gap, not a prohibition — if something genuinely has no rule yet, do the work and then write the rule, in the same session.
8. If anything you read conflicts with anything else you read, do not guess which is correct. Stop and report the conflict — see `INDEX.md` §"Authority precedence" for how to reason about it, but do not act on a guess when production behavior is at stake.

Consolidated from: `Infrastructure/CloudRun/subverselab-v2/.agents/rules/operational_instructions.md`, which remains the build-bundled mirror and is otherwise unchanged in spirit — this version adds the pointer back to the root hierarchy that the original did not have.

## Applies to

- Repository-level agent instructions
- Deployment runbooks
- Maintenance, debugging, and migration prompts
- Production incident response

## Forbidden

- Inspecting, modifying, debugging, migrating, or deploying a service without first reading the rules that apply to that task.

## Read the failure log before you verify

[`09_FAILURE_LOG.md`](09_FAILURE_LOG.md) lists what has actually broken in production in this repository — a blank page that reported healthy, a MIDI export nobody could reach, a robots.txt that granted access and removed protection in the same stroke. Every one of them passed the check that was performed at the time.

It is short, and it is the difference between verifying a change and verifying the thing the change was supposed to produce.
