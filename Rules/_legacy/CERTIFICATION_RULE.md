> **⚠ SUPERSEDED.** This file has been consolidated into [`Rules/04_CERTIFICATION.md`](../04_CERTIFICATION.md). It is kept here for historical reference only and is not authoritative — see [`Rules/INDEX.md`](../INDEX.md).

---

# Rule
Products may not leave the Launchpad until every mandatory validation has passed.

## Reason
The Launchpad is the production certification layer.

Development folders are allowed to contain incomplete, experimental, or unstable work.

Only validated products are permitted to reach production.

This guarantees consistent quality, prevents incomplete deployments, and ensures every published product follows the same production pipeline.

## Expected Behavior

✓ Validation succeeds
↓
Launch Authorized
↓
Deploy
↓
Metadata Sync
↓
Publish

## Forbidden Behavior

✗ Deploying directly from a development folder
✗ Publishing without validation
✗ Skipping QA
✗ Skipping Metadata Sync
✗ Manual website configuration to compensate for missing assets
