# Changelog

All notable changes to the SubverseLab Launchpad workspace and rules will be documented in this file.

## [1.2.0] - Multi-Creator Marketplace Roadmap
### Added
- `Rules/ROADMAP_3YR.md`, recording the platform owner's 3-year direction (creator profiles, self-service submission, per-content-type trust/review, revenue share). Explicitly aspirational — does not override `00_PLATFORM_INVARIANTS.md`–`08_DEPLOYMENT_REGISTRY.md` and is not part of the `Rules/_sync/service-manifest.json` mirror set shipped into production containers.
- `Rules/INDEX.md` updated with a pointer to the roadmap, outside the numbered authority chain.

## [1.1.0] - Rule Hierarchy Consolidation (Phase 1)
### Added
- `Rules/INDEX.md` and a numbered `Rules/00`–`08` hierarchy defining reading order and authority precedence.
- `Rules/03_VALIDATION.md`, a manifest schema rewritten to match `validateManifestSchema()` in `metadata-sync-service/server.js` exactly.
- `Rules/02_PRODUCT_CREATION.md`, documenting the previously-undocumented product-creation step.

### Changed
- `Templates/Universal_Schema.json`, `Templates/Manifest/folder_manifest_template.json`, and `Templates/Manifest/remote_manifest_template.json` rewritten to match the schema actually enforced in production (previous versions used field names — `id`, `title`, `product_id` — that the validator has never accepted).
- `README.md` and `launchpad.json` corrected to reference `Infrastructure/` instead of a `Deploy/` folder that never existed.

### Moved
- `Rules/CERTIFICATION_RULE.md`, `Rules/LAUNCH_AUTHORIZATION.md`, `Rules/PRODUCTION_PRINCIPLE.md`, and `LAUNCH_CHECKLIST.md` moved to `Rules/_legacy/`, superseded by `Rules/04_CERTIFICATION.md` and `Rules/00_PLATFORM_INVARIANTS.md`.

### Not changed
- No application code, Dockerfiles, `.env` files, or deployment configuration were modified. `Infrastructure/*/.agents/rules/` remain untouched, build-bundled mirrors.

## [1.0.0] - Initial Production Release
### Added
- Official directory structure (Inbox, Rules, Templates, QA, Deploy, etc.)
- Strict `Rules` directory containing certification, launch authorization, and production principles.
- `launchpad.json` for AI agent context.
- `LAUNCH_CHECKLIST.md` for strict launch gating.
- Standardized templates for manifests, guides, and reports.
