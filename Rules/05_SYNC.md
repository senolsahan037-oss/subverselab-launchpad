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

## Editing a synced product by hand

Firestore is downstream of the manifest, not a place to author. Editing `products/{slug}` directly without changing the manifest that produced it creates drift with a delayed cost: the manifest still holds the old value, and the next sync of that product writes it straight back over the edit.

When a field genuinely has to change by hand, change it in **both** places in the same sitting:

1. Every `manifest.json` carrying that `slug` — there can be more than one copy in the repository, and a stale copy is what re-introduces the old value later.
2. The Firestore document.

For `actions` specifically, also recompute `actionsHash` exactly as the service does — `sha256(JSON.stringify(actions))`. That hash is what step 3 above compares against to decide a sync is a no-op. Leaving it stale means the next sync of an otherwise-unchanged manifest either does needless work or, worse, reports "already up to date" about a document that no longer matches its manifest.

## Firebase's role after sync

- Firestore stores: product info (`products/{slug}`), guide content (`seo_articles/{slug}`), image reference, version, guide version, last-synced time. `seo_articles` is the **only** documentation collection MetadataSync writes to and the frontend (`ArticlePage.jsx`/`seoService.js`, the admin SEO review tab) reads from — do not reintroduce a second one. A synced guide's `answer` field is a mechanically-derived plain-text excerpt of the guide body, not separately authored content; `status` starts at `draft` and follows the same admin publish/unpublish review workflow as hand-authored articles — a synced guide is not automatically public.
- The website never depends on Cloud Run at page-render time — after sync, the website serves its own stored Firestore/Storage data.
- Cover images are downloaded and re-hosted in Firebase Storage during sync — the website never hotlinks images from Cloud Run, so a tool going offline or redeploying doesn't break its product card.
- `guide.md` content is sanitized (HTML tag/attribute allowlist) and stored as-is; it is not re-fetched from Cloud Run during normal page views.

## Collections a tool owns

Sync writes `products/{slug}` and `seo_articles/{slug}` and nothing else. A remote tool may own further collections in the data project, written by its own server with the Admin SDK — these are outside sync, are never touched by it, and must be documented in that tool's canonical document rather than here. Today: Sensei writes `sensei_generations` (what the engine proposed) and `sensei_exports` (what a member kept, and the settings that produced it); SynthPulse writes `synthpulse_generations`, `synthpulse_exports` and `synthpulse_model/ranking-v1`, the shared ranking model its downloads train. Subverse Splitter writes `daily_separation_quotas` — one document per member and one per network address per day, keyed by a day-salted HMAC so the address itself is never stored, carrying an `expires_at` eight days out. It is the first quota collection on the platform, and unlike the others it is not analytics: a write there is load-bearing, since a lost document hands someone a second free separation and a stuck one denies them their first. Reserved before work starts, marked completed only on success, deleted on failure. All pseudonymous; the others fail-soft, this one does not.

The reason to write it down: a tool hosted in one GCP project can write Firestore in another, so "where does this product's data live" is not answerable from the service's own project. Sensei is exactly that case — see `08_DEPLOYMENT_REGISTRY.md`.

The website owns collections of its own, outside sync entirely: `forum_topics`
and its `replies` subcollection, written by visitors through the client SDK
under `firestore.rules` — public to read, authored only by the signed-in member
whose `authorId` matches. Sync never touches them. They are listed here because
"where does this data live" has to be answerable from one place, and because a
collection nothing on the server writes is easy to forget when rules are
released (`06_DEPLOYMENT.md`).

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
