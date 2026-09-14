<!-- GENERATED FILE — DO NOT EDIT.
     This file is a generated mirror. Canonical source (repo root):
       - Rules/01_AGENT_STARTUP.md
     Regenerate: node Scripts/sync-agent-rules.js
     Verify:     node Scripts/verify-agent-rules-sync.js
     Hand-edits here will be silently overwritten on next generation, and will fail verification until then. -->

# 01 — Agent Startup

**Read this before doing anything else in this repository.**

1. Start at [`Rules/INDEX.md`](INDEX.md). It defines the reading order and authority precedence for the whole rule set.
2. Read [`00_PLATFORM_INVARIANTS.md`](00_PLATFORM_INVARIANTS.md) in full — these rules apply regardless of what task you were given.
3. Read only as far into `02`–`08` as your task requires (see the table in `INDEX.md`).
4. If your task touches a specific deployed service (`Infrastructure/CloudRun/subverselab-v2` or `Infrastructure/MetadataSync/metadata-sync-service`), also read that service's own `.agents/rules/` directory — it is a build-bundled mirror of `05`, `06`, and `08` for that service's container, and may contain service-specific operational detail (deploy commands, known pitfalls) not repeated here.
5. If anything you read conflicts with anything else you read, do not guess which is correct. Stop and report the conflict — see `INDEX.md` §"Authority precedence" for how to reason about it, but do not act on a guess when production behavior is at stake.

Consolidated from: `Infrastructure/CloudRun/subverselab-v2/.agents/rules/operational_instructions.md`, which remains the build-bundled mirror and is otherwise unchanged in spirit — this version adds the pointer back to the root hierarchy that the original did not have.

## Applies to

- Repository-level agent instructions
- Deployment runbooks
- Maintenance, debugging, and migration prompts
- Production incident response

## Forbidden

- Inspecting, modifying, debugging, migrating, or deploying a service without first reading the rules that apply to that task.
