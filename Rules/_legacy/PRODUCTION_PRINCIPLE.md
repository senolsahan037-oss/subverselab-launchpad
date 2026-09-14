> **⚠ SUPERSEDED.** This file has been consolidated into [`Rules/00_PLATFORM_INVARIANTS.md`](../00_PLATFORM_INVARIANTS.md). It is kept here for historical reference only and is not authoritative — see [`Rules/INDEX.md`](../INDEX.md).

---

# Rule
Development is allowed to be flexible. Production is not.

## Reason
Every product entering production must follow the same validated pipeline regardless of who created it. Development can be messy, experimental, and fast-paced, but the production environment requires consistency, predictability, and absolute adherence to standards to ensure the end-user gets a flawless experience.

## Expected Behavior
- Any new product entering the Launchpad eventually follows the standardized internal layout (manifest.json, docs/guide.md, assets/, content/, etc.).
- Products are strictly validated against rules and checklists before deployment.

## Forbidden Behavior
- Inventing product-specific directory layouts or custom deployment workflows for individual products.
- Weakening existing rules to accommodate a non-compliant product.
- Pushing experimental code directly to production.
