<!-- GENERATED FILE — DO NOT EDIT.
     This file is a generated mirror. Canonical source (repo root):
       - Rules/03_VALIDATION.md
     Regenerate: node Scripts/sync-agent-rules.js
     Verify:     node Scripts/verify-agent-rules-sync.js
     Hand-edits here will be silently overwritten on next generation, and will fail verification until then. -->

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
- **`access.level`** — required, must be `"public"` or `"member"`. `"member"` means **SubverseLab route/UI access gating only** — the `/tools/:slug` route (see `05_SYNC.md`, `F` below) declines to render the Tool Room for a signed-out user. It is **not, and cannot be, a hard security boundary on the raw tool URL**: `deployment.tool_url` is a real, independently reachable address, and nothing stops someone who obtains it from opening it directly, bypassing the website entirely. No auth token, session, or identity is forwarded from the website into the iframe or across that origin boundary — that would require cross-origin auth/token forwarding, which is explicitly out of scope for this phase. If a tool needs real access control, that is the tool's own responsibility to implement, same as its quota.
- **`actions`** — non-empty array; each entry's `type` must be one of `launch`, `download`, `purchase`, `external`, and may optionally carry a `label` (string — human-readable button text; the frontend falls back to a default label when absent). **A `launch` action must not carry a `url` field.** The public launch URL is always `/tools/:slug`, derived by the frontend from `slug` — it is never stored in the manifest or in Firestore, and `deployment.tool_url` must never be used as a launch destination directly.

**Guide and cover are supplied directly at sync time** (as an uploaded file and a JSON field, not fetched from any URL) — see `05_SYNC.md`. There is no `guide_url`/`cover_url`/`cover_path`/`guide_path`/`content_path` concept for remote products; those belong only to the folder schema below. `/api/manifest` on the tool itself is optional — this manifest may be authored entirely by whoever is registering the product (see `02_PRODUCT_CREATION.md`).

No content ZIP is ever created or uploaded for a remote product. Storage holds only the cover image.

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
