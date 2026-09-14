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
- Firestore Security Rules must be strict enough to prevent users from bypassing backend logic or altering limits. They are versioned at `Infrastructure/CloudRun/subverselab-v2/firestore.rules`. *(An earlier note here said no `.rules` file existed anywhere in the repository; that stopped being true and the note was left standing — corrected 2026-08-24.)*
- **Composite indexes are versioned too**, at `Infrastructure/CloudRun/subverselab-v2/firestore.indexes.json`, referenced from `firebase.json`. A Firestore query needing a composite index fails at runtime until one exists, and `seoService.js` catches that failure and returns an empty array — so a missing index does not look like an error, it looks like there is no content. Every guide page silently lost its "Related Guides" section this way, which is also every internal link between guides. When you add a query with a `where` plus an `orderBy` on a different field, add its index to that file in the same change.

## 5. Rate Limits (Critical)

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
- **Enforcement is server-side, on the tool's own origin** — see the self-authenticated contract in `03_VALIDATION.md`. Hiding a button does not satisfy it.
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

## 6. Language

- All UI text, logs, system warnings, error messages, and quota notifications must be in English.
- Code comments must be in English.

## 6b. Seeded and placeholder content

Added 2026-09-12, from something found live.

A new forum, an empty list, a section with nothing in it yet — seeding them is
normal and often necessary, because nobody posts first into silence. **What is
seeded is published by SubverseLab, under its own name.**

Never invent people. The forum shipped with fifty topics generated from ten
templates, attributed to ten fabricated members — Mert, Derya, Can and the rest
— with invented replies agreeing with each other and "Bölüm 2, 3, 4" appended to
pad the count. It was only invisible because a permissions bug was hiding the
whole forum; the moment that was fixed, a public site was telling visitors that
people who do not exist had said things they never said.

The line is not about tone. Content authored by the platform and signed by the
platform is an invitation. The same content signed by a person who does not
exist is a claim about the world that is false, and it is the kind of false that
destroys the thing it was meant to build: a visitor who spots one invented
member has reason to doubt every real one afterwards.

Applies to testimonials, reviews, star ratings, usage figures, member counts and
activity indicators equally. If the number is zero, the honest move is to show
zero or to say nothing — not to manufacture a number.

Seeded content still has to be **true**. The forum's replacement topics answer
real questions with measured facts — why a separation takes minutes, how the
daily allowance is counted, what a low key-confidence figure means — so a
visitor who acts on one finds it holds. Filler that is merely inoffensive is
still filler.

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
