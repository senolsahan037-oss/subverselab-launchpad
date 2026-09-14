> **⚠ SUPERSEDED.** This file has been consolidated into [`Rules/04_CERTIFICATION.md`](../04_CERTIFICATION.md). It is kept here for historical reference only and is not authoritative — see [`Rules/INDEX.md`](../INDEX.md). It previously lived at the repository root as `LAUNCH_CHECKLIST.md`.

---

# SubverseLab Launchpad QA Checklist

Every product entering the Launchpad must pass this checklist before being deployed to production.
No product proceeds unless every mandatory item passes.

## Prerequisites
- [ ] Rule compliance: Product has been checked against the centralized `Rules/` directory.

## Validation
- [ ] Required files exist: Manifest, Guide, Cover, and content assets are present.
- [ ] Manifest validation: `manifest.json` is properly structured and contains all required fields.
- [ ] Guide validation: `guide.md` is complete, accurate, and matches the manifest.
- [ ] Assets validate: Covers and media files meet dimension and quality standards.
- [ ] Actions validate: Product-specific actions work as intended.
- [ ] Previews validate: Optional previews (audio/video) are verified.
- [ ] Metadata validates: Metadata structure is sound and strictly non-inferred.

## Testing & Deployment
- [ ] QA passes: All local testing and QA checks are complete.
- [ ] Security passes: Security validation and technical debt reports are clear.
- [ ] Deployment validation passes: Deployment readiness confirmed.

## Launch Authorization
If **every** mandatory validation succeeds:
```text
LAUNCH AUTHORIZED
```

If **any** mandatory validation fails:
```text
LAUNCH DENIED
```

**CRITICAL:** Deployment, Metadata Sync, Preview, and Publish must not continue if launch is denied.
