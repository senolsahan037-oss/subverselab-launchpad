# SubverseLab Launchpad

The spine of [subverselab.com](https://subverselab.com): the rules the work is held to, the website and the services
that publish it, and the registry of where everything runs.

The plug-ins and the browser tools are built in their own folders and repositories, not here. The public ones are listed
in **[MAP.md](MAP.md)**.

## What SubverseLab is

A one-person music-production company with three lines:

- **Plug-ins** for macOS and Windows: analog-style effects and two standalone apps, sold through Lemon Squeezy at
  [subverselab.com/plugins](https://subverselab.com/plugins). Most are sold singly and as one family; some
  are free.
- **Browser tools** for producers: arranging, measuring, mixing and stem separation, at
  [subverselab.com](https://subverselab.com).
- **[Loom](https://subverselab.com/loom)**, a measurement-based production system for Ableton Live that runs on the
  user's own machine.

The organising principle across all of it: **do not report what has not been measured.** A tool that cannot determine
a key returns no key; a release that has not been heard is not "ready".

## What is in this repository

```
CLAUDE.md         The standing rules for every agent and every change. Read first
Rules/            Reference: site runbook, deployment registry, failure log, browser-tool pipeline
Infrastructure/   The deployed services (below)
Templates/        Manifest and guide templates for the browser tools
00_Inbox/         Where a browser tool's manifest, guide and cover enter
Scripts/          Maintenance scripts
10_VERS_Agent/    VERS, the house voice used in site copy, Help and FAQ
_arsiv/           Retired documents, kept rather than deleted
```

### Infrastructure

| Path | What it is |
|---|---|
| `CloudRun/subverselab-v2` | The website: React/Vite pages served by an Express app on Cloud Run, which also carries the site's API (downloads, licences, the Lemon Squeezy webhook, credits, testers). Its `RELEASE_QUEUE.md` lists every change waiting for a deploy |
| `MetadataSync/metadata-sync-service` | Validates and syncs the browser tools' manifests into Firestore (`/tools/<slug>`) |
| `ToolAuthBridge` | Carries a signed-in session from the website into a browser tool |
| `SocialPublish` | A YouTube + Instagram posting adapter that was never deployed; posting runs through Metricool |

## How things reach the site

- **A plug-in:** its room is a page in `src/data/plugins.js`; the installer is built, signed and notarised in its own
  folder and published to a private download bucket. Buyers download from the plug-in's room or their account page.
- **A browser tool:** manifest + guide + cover → validation in `metadata-sync-service` → Firestore → `/tools/<slug>`.
- **Either way:** a site change is made locally, tested, queued in `RELEASE_QUEUE.md`, and deployed only when the owner
  says so. The steps are in [`Rules/SITE_RUNBOOK.md`](Rules/SITE_RUNBOOK.md).

## Rules

`CLAUDE.md` is authoritative. `Rules/README.md` lists the reference files; the most useful one is
[`Rules/FAILURE_LOG.md`](Rules/FAILURE_LOG.md), where each failure is described by the mechanism that hid it.

## Secrets

No credentials are committed. `.env` is ignored everywhere and the deployed services read their configuration from
Cloud Run. Project ids, service URLs and the Firebase auth domain do appear in configuration and documentation; those
are public identifiers, visible in any visitor's network tab, not secrets.

## Licence

Source-available, all rights reserved — see [LICENSE](LICENSE). Published for reference; no licence to use, copy or
distribute is granted by its publication here.
