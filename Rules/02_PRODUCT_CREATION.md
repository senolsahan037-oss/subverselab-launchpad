# 02 — Product Creation

This is what must exist before a product is ready to be validated (`03_VALIDATION.md`) and certified (`04_CERTIFICATION.md`). It applies to both kinds of products the Launchpad supports:

- **Remote products** — an independently deployed AI tool (its own Cloud Run service). The tool stays completely independent of the Launchpad: its own deployment, its own backend, its own quota, its own bug-fix/redeploy cycle (`00_PLATFORM_INVARIANTS.md` §11).
- **Folder products** — static content (presets, sample packs, MIDI packs, instrument racks, projects) packaged and uploaded as a ZIP.

Extracted from: the "Repository Structure," "README.md," and "guide.md" sections of `Infrastructure/CloudRun/subverselab-v2/.agents/rules/metadata_sync_architecture.md`, which previously mixed product-creation concerns with sync mechanics. Sync mechanics now live in `05_SYNC.md`.

## Not everything published is a product

Added 2026-09-12, because the rules had no room for the thing that was being
built and the gap read as a prohibition.

A page can exist on subverselab.com without being a product. Loom is the case
that forced it: an MCP server and an Ableton extension, both running on the
reader's own machine and distributed from GitHub. There is no iframe to frame
and no ZIP to download, so the product system would have had to call it one or
the other and both are false. It lives at `/loom` as its own route and component
— no manifest, no sync, no Firestore record, no gate.

The test is what the visitor gets, not how interesting the thing is:

| It is a product when | It is a page when |
|---|---|
| The visitor uses it or downloads it here | The visitor reads about it and leaves for somewhere else |
| It has a manifest, a guide and a cover | It has none of those and does not need them |
| Sync writes `products/{slug}` | Nothing is written to Firestore at all |

A page is not a lesser thing and does not need permission from the quota rules,
the gate table, or `member_no_product_quota`. Those govern products. Writing
documentation, a capabilities page or a repository link for work in progress is
not "building product surface" — the user settled this on 2026-09-12:
development and productisation run in parallel, and community is the platform's
thinnest layer. Do not quote §5 at a documentation page.

What a page still owes: English (§6), a `PageMeta` with a canonical path, a
route **above** the catch-all in `App.jsx`, an entry in `generate-sitemap.js`,
and a body in `prerender.js` so a crawler and anyone following a citation sees
real text rather than an empty shell.

## Remote products (AI Tools)

`GET /api/manifest` on the tool itself is **optional, not mandatory**. Two supported ways to register a remote tool:

- **Self-describing tool** — if the tool exposes `GET /api/manifest` returning the shape in `03_VALIDATION.md`, plus a reachable guide and cover at the same origin, sync can read them directly from the tool.
- **Admin-authored metadata** — most tools, including simple client-only apps with no backend of their own, cannot serve `/api/manifest` at all. For these, whoever registers the product supplies the manifest, guide, and cover directly to the sync service (see `05_SYNC.md`). This is a first-class path, not a fallback — it does not require touching the tool's own application code.

Either way, the manifest carries the tool's live URL as `deployment.tool_url` — **internal registration metadata only**. It is never the public launch URL. The public launch URL is always `/tools/:slug` on the website, derived from the product's `slug` at render time — it is never stored anywhere and never read from the manifest.

`guide.md` is the official product documentation — written from what can actually be verified about the tool (its own visible UI, its own on-page text, direct observation), not from its source code or its name. It becomes the public documentation shown on the website. **Everything visible on the website originates from this document.**

Use [`Templates/Guide/guide_template.md`](../Templates/Guide/guide_template.md) as the starting structure.

### The guide's Markdown subset is narrower than Markdown

`ArticlePage.jsx` renders guides with a small hand-written renderer, not a Markdown library. Anything outside the subset below is printed to the live page as literal characters — a guide that looks fine in an editor can ship with visible `##`, backticks, or `\(x\)` on it. Verify a published guide by reading the rendered page, not the source file.

**Supported:** `##` and `###` headings, `---` horizontal rules, numbered lists, `**bold**`, and `|`-delimited tables.

**Not supported — never use:**

- A single `#` heading. The page already renders the title as its `h1`.
- Bullet lists (`-` or `*`). Write prose or a numbered list instead.
- Backticks, code fences, blockquotes (`>`), and LaTeX (`\(…\)`, `\[…\]`).
- A literal `&`. Sanitisation escapes it to `&amp;` on the way in and the renderer never decodes it, so "R&B" reaches the page as "R&amp;B". Write "and".

### Calls to action name the job, not the tool

`actions[].label` becomes the button on the product card and the link text on the prerendered page. Name the task the person is about to perform, verb first — **`Analyze a Mix`**, not `Launch Subverse Mix Check`. "Launch X" only speaks to someone who already knows what X is, which excludes every visitor the storefront is trying to reach.

Two tools must not share a label. Where products overlap, the label is what separates them: Sensei is `Generate a Drum Pattern` and SynthPulse is `Generate a MIDI Pattern` — both generate, and the label says what.

### Card fields the schema does not require

`subtitle`, `metrics`, and `size` are UI-only fields. They are not part of the manifest schema and sync never writes them, so a product registered purely through sync arrives with none of them and its card renders thinner than a hand-curated one. `subtitle` falls back to `description` and the row is hidden when `size` and price are both absent, so nothing breaks — but set them deliberately rather than discovering the gap on the live storefront.

## Folder products (Presets, Sample Packs, MIDI Packs, Instrument Racks, Projects)

Package the product as a ZIP containing:

- `manifest.json` at the ZIP root (or inside a single top-level folder)
- A cover image
- A guide file
- A content folder containing the actual deliverable files

The exact required fields and paths are defined in `03_VALIDATION.md` and demonstrated in [`Templates/Manifest/folder_manifest_template.json`](../Templates/Manifest/folder_manifest_template.json).

## Before moving to validation

- [ ] Manifest fields match `03_VALIDATION.md` exactly — not a prior version of any schema, not a guess.
- [ ] `guide.md` is complete and accurate — no placeholder text, no invented features.
- [ ] Cover image and (optional) preview asset exist and are the correct type.
- [ ] For remote products: `deployment.tool_url` is live and reachable over HTTPS, regardless of whether the tool exposes `/api/manifest`.
- [ ] For remote products: `deployment.iframe_compatible` has been determined by actually checking the tool's response headers (`X-Frame-Options`, `Content-Security-Policy`) — set `true` only if neither header blocks framing. This is a one-time certification check performed by whoever registers the product, not an automated probe run by MetadataSync.
- [ ] For folder products: the ZIP has no path traversal (`..`, absolute paths) and is under the service's size/file-count limits.

Once these are true, proceed to `03_VALIDATION.md`.
