# Browser tools — what a /tools product is, how it is validated and synced

Scope: the seven browser tools at `subverselab.com/tools/<slug>` (and their guides at `/learn/<slug>`), which are
registered through a manifest, validated by `metadata-sync-service` and rendered from Firestore. **Plug-ins are not
products in this sense**: their rooms are pages driven by `Infrastructure/CloudRun/subverselab-v2/src/data/plugins.js`,
sold through Lemon Squeezy and downloaded from `gs://subverselab-downloads` (see `DEPLOYMENT_REGISTRY.md` and `CLAUDE.md`).
Nothing below applies to them.

Written 2026-10-15 from `00_PLATFORM_INVARIANTS.md` (§3–5, §12), `02_PRODUCT_CREATION.md`, `03_VALIDATION.md` and
`05_SYNC.md` (all archived in `_arsiv/rules_2026-10/`). The text is theirs; only file references changed. The separate
certification step (`04_CERTIFICATION.md`) is retired: a tool is registered once validation passes and the owner says go.
`CLAUDE.md` is authoritative over this file. If this file and `metadata-sync-service/server.js` disagree, the code is
what runs: report the mismatch.

# Part 1 — Platform rules for tools

## Database (Firebase / Firestore)

- The frontend accesses Firestore directly only for essential collections (e.g., Auth, product listings).
- Quota tracking, rate limits, and usage statistics are strictly written and managed by the backend (Cloud Run), never by the client.
- The client application must never be allowed to modify quota documents or rate-limit counters.

## Security

- API keys and third-party credentials are never exposed in frontend code.
- Google Cloud Service Accounts are only used inside backend Cloud Run environments.
- Firestore Security Rules must be strict enough to prevent users from bypassing backend logic or altering limits. They are versioned at `Infrastructure/CloudRun/subverselab-v2/firestore.rules`. *(An earlier note here said no `.rules` file existed anywhere in the repository; that stopped being true and the note was left standing — corrected 2026-08-24.)*
- **Composite indexes are versioned too**, at `Infrastructure/CloudRun/subverselab-v2/firestore.indexes.json`, referenced from `firebase.json`. A Firestore query needing a composite index fails at runtime until one exists, and `seoService.js` catches that failure and returns an empty array — so a missing index does not look like an error, it looks like there is no content. Every guide page silently lost its "Related Guides" section this way, which is also every internal link between guides. When you add a query with a `where` plus an `orderBy` on a different field, add its index to that file in the same change.

## Rate limits (critical)

- IP/User limits (e.g., 1 free analysis per IP per day) are unchangeable business rules enforced in the backend.
- Terms like "temporarily disable," "bypass limit for testing" (in production), or "remove quota" are forbidden. Limits must be enforced at all times.

**This default does not change.** A product has a quota unless it appears by name in the exception below.

### Approved product-policy exception

Remote manifests may explicitly declare `access.policy: "member_no_product_quota"` for approved products only. This is not a global quota relaxation: member authentication remains required for every protected operation, and timeout, cancellation, concurrency, and abuse protections remain mandatory. No manifest outside the approved list may use this policy.

Declaring the policy asserts all of the following at once. No part of it may be adopted on its own:

- **Access level is `member`.** Whether the shell is public is a per-product decision, stated in `access.public_shell` — but nothing productive is ever public either way.

### Where the gate sits

Decided 2026-08-25, and it turns on one question: **does the tool hand the visitor a file?**

| | Gate | Products |
|---|---|---|
| Carries a download or export | At the door — `public_shell: false`. The Tool Room shows the product page and the tool itself does not open. | `sensei`, `synthpulse`, `arrangement-gps`, `subverse-mix-check`, `subverse-splitter` |
| Hands over nothing to keep | No gate — the tool opens for anyone. | `time-frequency-sync` |

The reasoning is that a download is the product. A tool a visitor can only look at and learn from costs nothing to give away and is the better advertisement for the ones that do produce something.

`subverse-splitter` is the first product in that row that also carries a quota, which is why it does **not** declare `access.policy`. That field accepts exactly one value, `member_no_product_quota`, and only for slugs on an approved list held by the validator rather than by the manifest — a product must not be able to grant itself the exception. A tool with a daily allowance simply omits the field; claiming the policy while metering usage is a contradiction the validator rejects by name.

Check the actual buttons before placing a product in a row. Arrangement GPS reads as a teaching tool and was nearly filed as one — it has a **Download Project Recipe** button, and Mix Check writes out a `subverse-mix-analysis-*.json`. Both belong in the first row on the evidence, not on the impression.
- **Membership is required for every productive operation** — generation, variation, and every export or download path, individually and in bulk.
- **There is no product quota** — no daily, monthly, or lifetime cap for a signed-in member.
- **There are no credits, balances, remaining-use figures, reset times, or counters**, in the backend, the manifest, or the UI.
- **Enforcement is server-side, on the tool's own origin** — see the self-authenticated contract in Part 3 below. Hiding a button does not satisfy it.
- **The absence of a limit is never advertised.** "Unlimited," "no limits," "unlimited generation," or any equivalent is forbidden in UI copy, manifest text, and guides. The product does not discuss quotas at all.
- **Site-wide copy must not assert a quota on the product's behalf.** A page that tells every visitor "each tool enforces its own daily quota" states something false about a product under this exception, and the product cannot correct it without discussing quotas — which the line above forbids. Shared surfaces (the Help/FAQ page, `llms.txt`, meta descriptions) say that a limit applies *where* one applies and point to the individual guide, never that one applies everywhere.

A manifest cannot grant itself this policy: the approved list lives in the validator, and a manifest declaring the policy without being on it is rejected. Migrating a product onto the policy is a separate explicit decision, never a judgement call made while editing a manifest.

The list maps each approved slug to **its own** productive operations, because no two tools share a vocabulary — Sensei varies a pattern, SynthPulse evolves one — and every one of a product's productive operations must appear in `access.member_required_for`:

| Slug | Productive operations | Approved |
|---|---|---|
| `sensei` | `generate`, `variation`, `export` | 2026-08-23 |
| `synthpulse` | `generate`, `evolve`, `export` | 2026-08-24 |

A single shared operation list was the earlier shape and was wrong in both directions: it would have rejected SynthPulse for not declaring a `variation` it does not have, and it would have accepted a future tool that never declared its own gated paths.

### Technical protections are not quotas

These bound a request or a burst and are permitted on every product, including one under the exception above: request timeouts; one generation at a time per session, with a second concurrent request rejected or queued; cancelling an in-flight operation; payload-size limits and input validation; and abuse or security controls such as bot mitigation, anomaly detection, and blocking a specific abusive actor.

A quota is different in kind: it is a **budget a legitimate, well-behaved user spends and eventually exhausts**. A protection never accumulates against a user across a day or a month. A protection must not be reshaped into a per-user daily or monthly allowance, and calling a quota "abuse protection" does not turn it into one.

## The site never invents a tool's behaviour

- For a browser tool, any feature that is not explicitly declared in its synchronized manifest must not exist on the public website.
- The website is prohibited from inferring, reconstructing, guessing, or synthesizing product behavior from any other source.


# Part 2 — Creating a tool product

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
thinnest layer. Do not quote the rate-limit rules (Part 1) at a documentation page.

What a page still owes: English (`CLAUDE.md`), a `PageMeta` with a canonical path, a
route **above** the catch-all in `App.jsx`, an entry in `generate-sitemap.js`,
and a body in `prerender.js` so a crawler and anyone following a citation sees
real text rather than an empty shell.

## Remote products (browser tools)

`GET /api/manifest` on the tool itself is **optional, not mandatory**. Two supported ways to register a remote tool:

- **Self-describing tool** — if the tool exposes `GET /api/manifest` returning the shape in Part 3 below, plus a reachable guide and cover at the same origin, sync can read them directly from the tool.
- **Admin-authored metadata** — most tools, including simple client-only apps with no backend of their own, cannot serve `/api/manifest` at all. For these, whoever registers the product supplies the manifest, guide, and cover directly to the sync service (see Part 4). This is a first-class path, not a fallback — it does not require touching the tool's own application code.

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

### The shop window does not discuss the daily limit

A product's `description`, `subtitle` and `metrics` are advertising. They reach
people who have not arrived yet, and a limit stated there reads as the first
thing the tool wants from a visitor rather than the last thing it asks. Every
tool is free; where a daily allowance exists, the visitor meets it inside the
tool, which shows the remaining run and the reset time as a matter of course.

So these three fields state what the tool does and never how often it may be
run. "one a day", "one per member", "unlimited", "free previews" and "requires a
free account" are all out, including the generous halves — "unlimited" only
means something next to a limit, and naming one implies the other.

This is not the `member_no_product_quota` rule in Part 1,
which forbids a quota existing at all for the products on that list. This applies
to every product, quota or not, and only to the copy. The limit stays documented
where someone goes to understand it: the tool's own interface, its guide, and the
Help/FAQ answer for the question it actually answers. Those surfaces explain;
the card sells.

Applied 2026-09-18 to `subverse-visualizer`, `subverse-splitter` and
`subverse-mix-check`, whose descriptions each ended on their daily allowance. The
manifest and the Firestore document were changed together — `description` is not
in sync's no-op comparison, so editing only the manifest leaves the storefront
showing the old sentence until some unrelated version bump happens to carry it.

## Folder products (Presets, Sample Packs, MIDI Packs, Instrument Racks, Projects)

Package the product as a ZIP containing:

- `manifest.json` at the ZIP root (or inside a single top-level folder)
- A cover image
- A guide file
- A content folder containing the actual deliverable files

The exact required fields and paths are defined in Part 3 below and demonstrated in [`Templates/Manifest/folder_manifest_template.json`](../Templates/Manifest/folder_manifest_template.json).

## Before moving to validation

- [ ] Manifest fields match Part 3 below exactly — not a prior version of any schema, not a guess.
- [ ] `guide.md` is complete and accurate — no placeholder text, no invented features.
- [ ] Cover image and (optional) preview asset exist and are the correct type.
- [ ] For remote products: `deployment.tool_url` is live and reachable over HTTPS, regardless of whether the tool exposes `/api/manifest`.
- [ ] For remote products: `deployment.iframe_compatible` has been determined by actually checking the tool's response headers (`X-Frame-Options`, `Content-Security-Policy`) — set `true` only if neither header blocks framing. This is a one-time certification check performed by whoever registers the product, not an automated probe run by MetadataSync.
- [ ] For folder products: the ZIP has no path traversal (`..`, absolute paths) and is under the service's size/file-count limits.

Once these are true, proceed to Part 3 below.

# Part 3 — Validation

Remote-tool manifests and folder-product manifests are validated by **two separate functions** in `Infrastructure/MetadataSync/metadata-sync-service/server.js` — they are no longer one shared base schema with per-type extensions, because their shapes have genuinely diverged. This file documents each separately.

**If this file and `server.js` ever disagree, `server.js` is what's actually running.** Report the mismatch rather than trusting this file blindly — see `Rules/README.md`.

Machine-readable twin: [`Templates/Universal_Schema.json`](../Templates/Universal_Schema.json). Worked examples: [`Templates/Manifest/remote_manifest_template.json`](../Templates/Manifest/remote_manifest_template.json), [`Templates/Manifest/folder_manifest_template.json`](../Templates/Manifest/folder_manifest_template.json).

## Remote-type manifest (`source_type: "remote"`)

Source: `validateRemoteToolManifest()` and `POST /api/admin/sync-remote-metadata`, `server.js`.

```json
{
  "slug": "synthpulse",
  "name": "Subverse SynthPulse",
  "description": "...",
  "content_type": "ai_tool",
  "source_type": "remote",
  "version": "1.0.0",
  "guide_version": "1.0.0",

  "deployment": {
    "provider": "cloud_run",
    "tool_url": "https://synthpulse-....run.app",
    "iframe_compatible": true
  },

  "access": {
    "level": "member"
  },

  "actions": [
    { "type": "launch" }
  ]
}
```

Required top-level fields: `slug`, `name`, `description`, `content_type` (must be one of `ai_tool`, `workflow`, `preset`, `pack`, `project`, `instrument_rack`, `midi_pack`, `sample_pack`), `source_type` (must equal `"remote"` exactly), `version`, `guide_version`, `deployment`, `access`, `actions`.

- **`deployment.provider`** — required string (e.g. `"cloud_run"`).
- **`deployment.tool_url`** — required. The tool's real, independently-deployed URL. Checked against the same SSRF-safety rule as everywhere else in this service (HTTPS only, allowed-domain list, resolves to a non-private IP) because it will be rendered inside an iframe on the production site — but it is **never fetched from**. Nothing about manifest, guide, or cover content is read from this URL.
- **`deployment.iframe_compatible`** — required boolean. **Certification metadata, not a live check.** It records what whoever validated the product observed by inspecting the tool's actual response headers (`X-Frame-Options`, `Content-Security-Policy`) at registration time — see Part 2. MetadataSync does not probe the tool's headers itself; introducing automatic header probing is an explicit non-goal for this phase, since it would change sync's behavior and add network validation exactly when the priority is a stable first production sync. If the tool's headers change after registration, `iframe_compatible` is only as current as the last time someone re-checked it.
- **`access.level`** — required, must be `"public"` or `"member"`. `"member"` means **SubverseLab route/UI access gating only** — the `/tools/:slug` route (see Part 4, `F` below) declines to render the Tool Room for a signed-out user. It is **not, and cannot be, a hard security boundary on the raw tool URL**: `deployment.tool_url` is a real, independently reachable address, and nothing stops someone who obtains it from opening it directly, bypassing the website entirely. A signed-in visitor's session **is** handed to the tool, by the one approved mechanism described under "Session handoff to a member remote tool" below — a short-lived custom token posted to the tool's exact origin and verified on the tool's own server. That handoff is what keeps a member from being asked to sign in twice; it does not make `access.level` a security boundary. Enforcing membership on its own protected operations remains the tool's responsibility, same as its quota.
- **`access.policy`** — optional. The only approved value is `"member_no_product_quota"`, valid only for `slug: "sensei"` with `access.level: "member"`. Sensei must enforce Firebase membership on its own protected operations and must not create product quota/credit counters. Cross-origin token forwarding remains forbidden. Other tools retain their existing access and quota behavior. See Part 1, "Rate limits", for what the policy asserts and who may hold it.
- **`access.public_shell`** — optional boolean, required when `access.policy` is set. `true` states that the tool's shell may render for a signed-out visitor while every productive operation stays gated.
- **`access.member_required_for`** — optional array of strings, required when `access.policy` is set. Names the operations that require membership, so the gate is a declared contract rather than an implementation detail. Sensei declares `["generate", "variation", "export"]`.
- **`access.enforcement`** — optional, required when `access.policy` is set. Must be `"tool_server"`: membership is verified on the tool's own server, before the work is done. There is no value meaning "the frontend hides the button."
- **`access.self_authenticated`** — optional boolean, required when `access.policy` is set. `true` states the tool verifies membership on its own server rather than trusting the website's gate. It does **not** mean the tool runs its own login: identity always originates on subverselab.com and reaches the tool through the approved session handoff below.

**Quota and credit fields are forbidden alongside `access.policy`.** A manifest declaring `member_no_product_quota` may not also carry `quota`, `daily_limit`, `monthly_limit`, `credits`, `rate_limit`, or any similarly named field, at the top level or inside `access` — a manifest that says both "no quota" and "5 per day" has no single meaning, and the validator rejects it rather than picking one.

- **`actions`** — non-empty array; each entry's `type` must be one of `launch`, `download`, `purchase`, `external`, and may optionally carry a `label` (string — human-readable button text; the frontend falls back to a default label when absent). Schema-optional, but in practice always set it: the label is the storefront's call to action, and Part 2 defines how to word it. **A `launch` action must not carry a `url` field.** The public launch URL is always `/tools/:slug`, derived by the frontend from `slug` — it is never stored in the manifest or in Firestore, and `deployment.tool_url` must never be used as a launch destination directly.

**Guide and cover are supplied directly at sync time** (as an uploaded file and a JSON field, not fetched from any URL) — see Part 4. There is no `guide_url`/`cover_url`/`cover_path`/`guide_path`/`content_path` concept for remote products; those belong only to the folder schema below. `/api/manifest` on the tool itself is optional — this manifest may be authored entirely by whoever is registering the product (see Part 2).

No content ZIP is ever created or uploaded for a remote product. Storage holds only the cover image.

## Session handoff to a member remote tool

**Superseded the earlier "self-authenticated" contract.** That version required the tool to authenticate independently and forbade any handoff, which meant a member who had already signed in on subverselab.com was asked to sign in a second time the moment they opened a tool. The product decision is that this is unacceptable: the website is the identity provider, and a tool never runs its own login.

### The model

1. **subverselab.com is the only place anyone signs in.** A remote tool has no login form, no email/password field, and no social sign-in of its own.
2. **Entering a tool from the website never asks again.** If the visitor has a website session, the Tool Room hands it to the tool and the tool comes up signed in.
3. **Entering a tool directly still requires the website session.** Opening the raw `deployment.tool_url` may load the application shell; every productive operation stays gated, and the tool's prompt is "sign in on subverselab.com", not a form.
4. **The tool trusts nothing it is told.** The handed-over credential is verified against Firebase on the tool's own server before any protected work runs.

### The approved handoff

Exactly one mechanism is permitted:

- The Tool Room requests a **short-lived Firebase custom token** for the already-signed-in user from the auth bridge. The bridge mints it server-side; the browser never sees a long-lived credential.
- It is delivered by `postMessage` to the **exact tool origin**, derived from `deployment.tool_url`. A `'*'` target is forbidden — that would broadcast the token to whatever happens to be framed.
- The tool checks `event.origin` against the website origin before accepting anything, exchanges the custom token via `signInWithCustomToken`, and from then on holds its own Firebase session.
- Every protected request carries the resulting **Firebase ID token in the `Authorization` header**, verified server-side with `verifyIdToken`.
- Unauthorised protected requests return `401` (absent or invalid token) or `403` (authenticated but not a member).
- Membership is never enforced by hiding a button or by client state alone. Client-side gating is presentation; the server decision is the gate.

### Still prohibited

The handoff above is the only route. None of these may be introduced:

- A token in a query string, a URL fragment, or an iframe `src`.
- A `postMessage` sent to `'*'`, or accepted without an `event.origin` check.
- Copying Launchpad `localStorage`, `sessionStorage` or cookie data to another origin.
- A long-lived credential, refresh token, or password crossing the boundary — the minted custom token is short-lived by construction.
- Logging a token, or returning one in a response body outside the bridge's own authenticated response.
- A second, tool-local login form as a "fallback".

## Folder-type manifest (`source_type: "folder"`) — unchanged

Source: `validateManifestSchema()` and `POST /api/admin/sync-folder-metadata`, `server.js`. This schema and its handler are unchanged by the remote-tool architecture above.

Required fields: `name`, `slug`, `content_type`, `version`, `guide_version`, `updated_at`, `source_type` (must equal `"folder"` exactly), `actions`, and one of `preview_audio_url`/`preview_audio_path` (key must be present, value may be `null`).

- `cover_path`, `guide_path`, and `content_path` are required — relative paths inside the uploaded ZIP.
- Every path must pass a safe-path check: no `..` segments, no absolute paths.
- `manifest.json` must be present in the ZIP (at the root or inside a single top-level folder).
- The ZIP must contain no more than 10,000 entries and no more than 2 GB of extracted content.
- Cover/preview content-type is inferred from file extension: `.png` → `image/png`, `.webp` → `image/webp`, anything else → `image/jpeg` for covers; `.wav` → `audio/wav`, `.mp3` → `audio/mpeg`, anything else → `audio/mp4` for previews.
- A `download` action may have `url: null` in the source manifest — the service fills it in with the uploaded content's storage URL after sync.

**Remote AI tools must never use folder sync.** Folder sync uploads and stores a content ZIP by design — an independently deployed tool has no content to upload, and forcing one through this path (as the original SynthPulse pilot package did) mischaracterizes a live service as a downloadable pack.

## What this replaces

This file replaces the independent authority previously claimed by `Templates/Universal_Schema.json` and `Templates/Manifest/*.json` — both rewritten in place to match. Do not hand-author a remote manifest against the old flat `cover_url`/`guide_url`/`preview_audio_url` shape, or against `00_Inbox/Folder/synthpulse/`'s manifest — that package used the folder schema and has been retired precisely because it used the wrong pattern for a live tool.

# Part 4 — Sync

## Purpose

Synchronization exists to eliminate hallucinated product data by making every product describe itself once — via its manifest, guide, and assets — before it ever reaches the website. The website never analyzes source code, guesses features from an interface, or generates documentation from a product's name. **The product's own manifest and guide are always the single source of truth.**

## How sync actually runs

There are two sync paths, matching the two `source_type` values in Part 3 below:

- **Remote sync** (`POST /api/admin/sync-remote-metadata`) — for AI Tools. Manifest, guide, and cover are supplied directly at sync time — as a JSON field and two uploaded files — by whoever is registering the product. `/api/manifest` on the tool itself is optional; when present it can be used as the source for that JSON, but the sync service never fetches guide or cover content from the tool's own origin. `deployment.tool_url` is checked for SSRF safety (it will be rendered in an iframe on the live site) but is never fetched from and never stored as a downloadable asset — no content ZIP is created for remote products, ever.
- **Folder sync** (`POST /api/admin/sync-folder-metadata`) — for static content packs. The service reads `manifest.json` out of an uploaded ZIP, along with the guide, cover, and content files it points to. Unchanged by the remote-tool architecture. **Remote AI tools must never use this path** — see Part 3 below.

Both are triggered from the Admin Panel's Product Form (manifest + guide + cover upload for remote products, or `Select ZIP File` + `Sync & Publish` for folder products).

Both paths perform a similar sequence:

1. Validate the manifest — against `validateRemoteToolManifest()` for remote products, `validateManifestSchema()` for folder products (Part 3 below).
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

Sync writes `products/{slug}` and `seo_articles/{slug}` and nothing else. A remote tool may own further collections in the data project, written by its own server with the Admin SDK — these are outside sync, are never touched by it, and must be documented in that tool's canonical document rather than here. Today: Sensei writes `sensei_generations` (what the engine proposed) and `sensei_exports` (what a member kept, and the settings that produced it); SynthPulse writes `synthpulse_generations`, `synthpulse_exports` and `synthpulse_model/ranking-v1`, the shared ranking model its downloads train. Subverse Splitter writes `daily_separation_quotas` — one document per member and one per network address per day, keyed by a day-salted HMAC so the address itself is never stored, carrying an `expires_at` eight days out. It is the first quota collection on the platform, and unlike the others it is not analytics: a write there is load-bearing, since a lost document hands someone a second free separation and a stuck one denies them their first. Reserved before work starts, marked completed only on success, deleted on failure. All pseudonymous; the others fail-soft, this one does not. Subverse Visualizer writes `daily_video_quotas` on the same shape and for the same reason — one render per member and per network per day, day-salted HMAC keys, reserved before the render and completed only on success. Two differences worth stating: it lives in `project-62238635-aae4-41f4-880` rather than `subverselab-project`, and **previews are outside the quota entirely**, because the tool asks the visitor to look at every style before spending the render and a charge for looking would defeat that. Its `expires_at` TTL policy was enabled 2026-09-18; before that it would have accumulated forever, which is the failure `FAILURE_LOG.md` I4 describes — writing the field is not enabling the policy, and `gcloud firestore fields ttls list` is the only way to know.

The reason to write it down: a tool hosted in one GCP project can write Firestore in another, so "where does this product's data live" is not answerable from the service's own project. Sensei is exactly that case — see `DEPLOYMENT_REGISTRY.md`.

The website owns collections of its own, outside sync entirely: `forum_topics`
and its `replies` subcollection, written by visitors through the client SDK
under `firestore.rules` — public to read, authored only by the signed-in member
whose `authorId` matches. Sync never touches them. They are listed here because
"where does this data live" has to be answerable from one place, and because a
collection nothing on the server writes is easy to forget when rules are
released (`SITE_RUNBOOK.md`).

## Security rules for the sync service

- HTTPS only for all fetched URLs.
- Remote fetch targets are checked against an SSRF-safe allowlist (protocol, domain allowlist, DNS resolution against a private-IP blocklist) before being requested.
- Folder ZIP paths are checked for path traversal before extraction.
- Malformed or schema-invalid manifests are rejected outright — nothing partial is written.
- Guide Markdown is sanitized before storage.

## Hallucination prevention policy

The website must never inspect source code, infer capabilities, guess features, generate technical documentation, invent supported formats, or auto-generate usage instructions. Only information explicitly written by the product's own manifest and `guide.md` may appear on the website. See "The site never invents a tool's behaviour" (Part 1) for the binding statement of this rule.

## Versioning

Every deployment increments `version`, `guide_version`, and `updated_at` in the manifest. Sync compares these (plus content hashes) against what's stored before doing any work — see step 3 above.
