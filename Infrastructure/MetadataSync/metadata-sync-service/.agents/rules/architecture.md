<!-- GENERATED FILE — DO NOT EDIT.
     This file is a generated mirror. Canonical source (repo root):
       - Rules/00_PLATFORM_INVARIANTS.md
     Regenerate: node Scripts/sync-agent-rules.js
     Verify:     node Scripts/verify-agent-rules-sync.js
     Hand-edits here will be silently overwritten on next generation, and will fail verification until then. -->

# 00 — Platform Invariants

These rules do not change based on which task you are doing. They apply everywhere, at all times, for every service.

Canonical for: architectural invariants, security boundaries, and the development-vs-production distinction.
Consolidated from: `Rules/_legacy/PRODUCTION_PRINCIPLE.md` and the invariant sections of `Infrastructure/CloudRun/subverselab-v2/.agents/rules/architecture.md` (§1, 3–13), which remains the build-bundled mirror for the CloudRun and MetadataSync services.

---

## 1. Development vs. Production

Development is allowed to be flexible. Production is not.

- Development folders may contain incomplete, experimental, or unstable work.
- Every product entering production must follow the same validated pipeline regardless of who created it.
- Inventing product-specific directory layouts or custom deployment workflows for individual products is forbidden.
- Weakening existing rules to accommodate a non-compliant product is forbidden.
- Pushing experimental code directly to production is forbidden.

## 2. Architecture

- The website (`subverselab-v2`) is a presentation layer only — a frontend/showcase.
- Every AI tool is an independent repository, or at minimum a separately deployable service.
- Services must never depend on each other's codebase. Communication is strictly via HTTP API.
- Every AI tool/service must have independent versioning (e.g., `mix-analyzer:v1`, `synthpulse:v2`).
- Deploying or updating one tool/service must not break or implicitly redeploy another tool/service or the main website.
- Version identity is explicit per tool/service — never inferred from the repository as a whole.
- New AI tools are never added to the existing website project. A new tool requires a new repository and a new Cloud Run service.
- AI tools must never modify the core website architecture. If a new feature requires backend logic, it must be implemented as an independent service and integrated through APIs or external links.

## 3. Database (Firebase / Firestore)

- The frontend accesses Firestore directly only for essential collections (e.g., Auth, product listings).
- Quota tracking, rate limits, and usage statistics are strictly written and managed by the backend (Cloud Run), never by the client.
- The client application must never be allowed to modify quota documents or rate-limit counters.

## 4. Security

- API keys and third-party credentials are never exposed in frontend code.
- Google Cloud Service Accounts are only used inside backend Cloud Run environments.
- Firestore Security Rules must be strict enough to prevent users from bypassing backend logic or altering limits. *(As of this restructure, no `.rules` files were found versioned anywhere in this repository — this is a known gap, not something this restructure resolves.)*

## 5. Rate Limits (Critical)

- IP/User limits (e.g., 1 free analysis per IP per day) are unchangeable business rules enforced in the backend.
- Terms like "temporarily disable," "bypass limit for testing" (in production), or "remove quota" are forbidden. Limits must be enforced at all times.

## 6. Language

- All UI text, logs, system warnings, error messages, and quota notifications must be in English.
- Code comments must be in English.

## 7. Data Protection

- Bulk deleting collections (e.g., Users, Products) is prohibited.
- Database schemas cannot be changed without an explicit migration script.
- Manual deletion operations on the production Firestore database are never performed.

## 8. Admin Panel Scope

- The admin panel is strictly for managing metadata, external Cloud Run URLs (`externalUrl`), and file download links.
- The actual code of AI tools is never embedded into the main website's codebase.
- Tools connect to the frontend via an "Iframe or New Tab" policy — never by inlining their code.

## 9. Deployed Rule Integrity

- Every deployable SubverseLab service must carry its own `.agents/rules/` directory inside its production container.
- Any agent or automated process entering a local repository or deployed container must read the applicable rules before inspecting, modifying, debugging, migrating, or deploying the service.
- The absence of `.agents/rules/` inside a production container is a deployment compliance failure.

## 10. Architecture Integrity

- If implementation and architecture documentation ever conflict, the architecture documentation is authoritative — the implementation must be corrected, not the documentation, unless a human explicitly decides otherwise.

## 11. Independent Tool Deployment

A tool is an independently deployable system. SubverseLab discovers, certifies, and launches tools, but never hosts, bundles, or executes tool application code.

## 12. Final Architecture Invariant

- Any feature that is not explicitly declared in the synchronized manifest must not exist on the public website.
- The website is prohibited from inferring, reconstructing, guessing, or synthesizing product behavior from any other source.

*(This invariant is also referenced from `05_SYNC.md` — it lives here as the single canonical statement; `05_SYNC.md` points back to this section rather than restating it.)*
