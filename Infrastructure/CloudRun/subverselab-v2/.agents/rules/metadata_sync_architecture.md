<!-- GENERATED FILE — DO NOT EDIT.
     This file is a generated mirror. Canonical source (repo root):
       - Rules/05_SYNC.md
     Regenerate: node Scripts/sync-agent-rules.js
     Verify:     node Scripts/verify-agent-rules-sync.js
     Hand-edits here will be silently overwritten on next generation, and will fail verification until then. -->

# 05 — Sync

Canonical for: how a certified product's metadata reaches Firebase and the website.
Source: `Infrastructure/CloudRun/subverselab-v2/.agents/rules/metadata_sync_architecture.md` (and its identical mirror in `Infrastructure/MetadataSync/metadata-sync-service/.agents/rules/`), which remain the build-bundled copies for those two services. Sections on repository/file structure moved to `02_PRODUCT_CREATION.md`; the "Final Architecture Invariant" moved to `00_PLATFORM_INVARIANTS.md` §12 to avoid stating it twice.

## Purpose

Synchronization exists to eliminate hallucinated product data by making every product describe itself once — via its manifest, guide, and assets — before it ever reaches the website. The website never analyzes source code, guesses features from an interface, or generates documentation from a product's name. **The product's own manifest and guide are always the single source of truth.**

## How sync actually runs

There are two sync paths, matching the two `source_type` values in `03_VALIDATION.md`:

- **Remote sync** (`POST /api/admin/sync-remote-metadata`) — for AI Tools. Manifest, guide, and cover are supplied directly at sync time — as a JSON field and two uploaded files — by whoever is registering the product. `/api/manifest` on the tool itself is optional; when present it can be used as the source for that JSON, but the sync service never fetches guide or cover content from the tool's own origin. `deployment.tool_url` is checked for SSRF safety (it will be rendered in an iframe on the live site) but is never fetched from and never stored as a downloadable asset — no content ZIP is created for remote products, ever.
- **Folder sync** (`POST /api/admin/sync-folder-metadata`) — for static content packs. The service reads `manifest.json` out of an uploaded ZIP, along with the guide, cover, and content files it points to. Unchanged by the remote-tool architecture. **Remote AI tools must never use this path** — see `03_VALIDATION.md`.

Both are triggered from the Admin Panel's Product Form (manifest + guide + cover upload for remote products, or `Select ZIP File` + `Sync & Publish` for folder products).

Both paths perform a similar sequence:

1. Validate the manifest — against `validateRemoteToolManifest()` for remote products, `validateManifestSchema()` for folder products (`03_VALIDATION.md`).
2. Obtain guide and cover content — fetched from the tool's own origin only for a self-describing remote tool; uploaded directly by whoever is registering the product for folder products and for admin-authored remote products (the common case for remote).
3. Hash each asset (guide, cover, actions, and — folder only — preview/content) to detect no-op syncs — if every hash and version field is unchanged from what's stored, sync exits early without writing anything.
4. Upload changed assets to Firebase Storage. For remote products this is the cover image only — never the tool itself.
5. Write the product to `products/{slug}` and its guide article to `seo_articles/{slug}` — the **single canonical documentation collection** — inside one transaction. If the transaction fails, any newly-uploaded assets are rolled back.
6. Report success or a specific validation error back to the Admin Panel.

Sync ends at Firestore/Storage. How the website subsequently discovers, gates, and renders a remote product — including the `/tools/:slug` route and its iframe rendering of `deployment.tool_url` — is the website's own responsibility, not part of sync itself.

## Synchronization rules

- Existing products are updated in place; duplicate products must never be created (`slug` is the Firestore document ID).
- Synchronization is idempotent — running it multiple times with unchanged source data always produces the same result and no-ops after the first run.
- Only administrators may perform synchronization (enforced via Firebase Admin token verification on both endpoints).

## Firebase's role after sync

- Firestore stores: product info (`products/{slug}`), guide content (`seo_articles/{slug}`), image reference, version, guide version, last-synced time. `seo_articles` is the **only** documentation collection MetadataSync writes to and the frontend (`ArticlePage.jsx`/`seoService.js`, the admin SEO review tab) reads from — do not reintroduce a second one. A synced guide's `answer` field is a mechanically-derived plain-text excerpt of the guide body, not separately authored content; `status` starts at `draft` and follows the same admin publish/unpublish review workflow as hand-authored articles — a synced guide is not automatically public.
- The website never depends on Cloud Run at page-render time — after sync, the website serves its own stored Firestore/Storage data.
- Cover images are downloaded and re-hosted in Firebase Storage during sync — the website never hotlinks images from Cloud Run, so a tool going offline or redeploying doesn't break its product card.
- `guide.md` content is sanitized (HTML tag/attribute allowlist) and stored as-is; it is not re-fetched from Cloud Run during normal page views.

## Security rules for the sync service

- HTTPS only for all fetched URLs.
- Remote fetch targets are checked against an SSRF-safe allowlist (protocol, domain allowlist, DNS resolution against a private-IP blocklist) before being requested.
- Folder ZIP paths are checked for path traversal before extraction.
- Malformed or schema-invalid manifests are rejected outright — nothing partial is written.
- Guide Markdown is sanitized before storage.

## Hallucination prevention policy

The website must never inspect source code, infer capabilities, guess features, generate technical documentation, invent supported formats, or auto-generate usage instructions. Only information explicitly written by the product's own manifest and `guide.md` may appear on the website. See `00_PLATFORM_INVARIANTS.md` §12 for the binding statement of this rule.

## Versioning

Every deployment increments `version`, `guide_version`, and `updated_at` in the manifest. Sync compares these (plus content hashes) against what's stored before doing any work — see step 3 above.
