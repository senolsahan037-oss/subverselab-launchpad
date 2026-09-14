# 03 — Validation

Remote-tool manifests and folder-product manifests are validated by **two separate functions** in `Infrastructure/MetadataSync/metadata-sync-service/server.js` — they are no longer one shared base schema with per-type extensions, because their shapes have genuinely diverged. This file documents each separately.

**If this file and `server.js` ever disagree, `server.js` is what's actually running.** Report the mismatch rather than trusting this file blindly — see `INDEX.md` §"Authority precedence."

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
- **`deployment.iframe_compatible`** — required boolean. **Certification metadata, not a live check.** It records what whoever validated the product observed by inspecting the tool's actual response headers (`X-Frame-Options`, `Content-Security-Policy`) at registration time — see `02_PRODUCT_CREATION.md`. MetadataSync does not probe the tool's headers itself; introducing automatic header probing is an explicit non-goal for this phase, since it would change sync's behavior and add network validation exactly when the priority is a stable first production sync. If the tool's headers change after registration, `iframe_compatible` is only as current as the last time someone re-checked it.
- **`access.level`** — required, must be `"public"` or `"member"`. `"member"` means **SubverseLab route/UI access gating only** — the `/tools/:slug` route (see `05_SYNC.md`, `F` below) declines to render the Tool Room for a signed-out user. It is **not, and cannot be, a hard security boundary on the raw tool URL**: `deployment.tool_url` is a real, independently reachable address, and nothing stops someone who obtains it from opening it directly, bypassing the website entirely. A signed-in visitor's session **is** handed to the tool, by the one approved mechanism described under "Session handoff to a member remote tool" below — a short-lived custom token posted to the tool's exact origin and verified on the tool's own server. That handoff is what keeps a member from being asked to sign in twice; it does not make `access.level` a security boundary. Enforcing membership on its own protected operations remains the tool's responsibility, same as its quota.
- **`access.policy`** — optional. The only approved value is `"member_no_product_quota"`, valid only for `slug: "sensei"` with `access.level: "member"`. Sensei must enforce Firebase membership on its own protected operations and must not create product quota/credit counters. Cross-origin token forwarding remains forbidden. Other tools retain their existing access and quota behavior. See `00_PLATFORM_INVARIANTS.md` §5 for what the policy asserts and who may hold it.
- **`access.public_shell`** — optional boolean, required when `access.policy` is set. `true` states that the tool's shell may render for a signed-out visitor while every productive operation stays gated.
- **`access.member_required_for`** — optional array of strings, required when `access.policy` is set. Names the operations that require membership, so the gate is a declared contract rather than an implementation detail. Sensei declares `["generate", "variation", "export"]`.
- **`access.enforcement`** — optional, required when `access.policy` is set. Must be `"tool_server"`: membership is verified on the tool's own server, before the work is done. There is no value meaning "the frontend hides the button."
- **`access.self_authenticated`** — optional boolean, required when `access.policy` is set. `true` states the tool verifies membership on its own server rather than trusting the website's gate. It does **not** mean the tool runs its own login: identity always originates on subverselab.com and reaches the tool through the approved session handoff below.

**Quota and credit fields are forbidden alongside `access.policy`.** A manifest declaring `member_no_product_quota` may not also carry `quota`, `daily_limit`, `monthly_limit`, `credits`, `rate_limit`, or any similarly named field, at the top level or inside `access` — a manifest that says both "no quota" and "5 per day" has no single meaning, and the validator rejects it rather than picking one.

- **`actions`** — non-empty array; each entry's `type` must be one of `launch`, `download`, `purchase`, `external`, and may optionally carry a `label` (string — human-readable button text; the frontend falls back to a default label when absent). Schema-optional, but in practice always set it: the label is the storefront's call to action, and `02_PRODUCT_CREATION.md` defines how to word it. **A `launch` action must not carry a `url` field.** The public launch URL is always `/tools/:slug`, derived by the frontend from `slug` — it is never stored in the manifest or in Firestore, and `deployment.tool_url` must never be used as a launch destination directly.

**Guide and cover are supplied directly at sync time** (as an uploaded file and a JSON field, not fetched from any URL) — see `05_SYNC.md`. There is no `guide_url`/`cover_url`/`cover_path`/`guide_path`/`content_path` concept for remote products; those belong only to the folder schema below. `/api/manifest` on the tool itself is optional — this manifest may be authored entirely by whoever is registering the product (see `02_PRODUCT_CREATION.md`).

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
