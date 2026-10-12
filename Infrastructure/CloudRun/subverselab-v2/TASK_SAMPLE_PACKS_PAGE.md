# TASK: /sample-packs — "under construction" page + "apply to publish your packs" (owner, 9 Oct)

Same folder and rules as TASK_ORDER_BINDING.md (read it, and `/Users/senolsahan/Desktop/SubverseLab-Launchpad/CLAUDE.md`):
- No deploy, no commit, no gcloud/firebase writes.
- Every test passes; new code comes with new tests.
- New server files go into the Dockerfile COPY line. Boot-check the server.
- Add a dated entry at the top of RELEASE_QUEUE.md "NEXT DEPLOY".
- UI strings are English. Never write "AI", "beta" or "coming soon™" hype.

## Owner's words
"Put a sample pack page into the next deploy, with an 'under construction' notice, like our custom 404 page. Right under it, an 'Apply to publish your packs' button. Producers never go where nobody is, so here too, as with the plugins, we have to build our own core and our own model first."

## Page: `/sample-packs`
- **Look:** follow `src/components/NotFound.jsx` (the custom 404): same layout family, palette #033733 / #F2EFE7 / #C5A059, and a construction motif. Keep it calm, not cartoonish, in the SubverseLab brand style.
- **Copy** (keep it short; edit freely for tone, keep the facts):
  - Title: "Sample packs: under construction"
  - Line: "We are building the SubverseLab pack store the way we built our plugins: our own sound first, measured and finished, then the producers we believe in."
  - Primary button: **"Apply to publish your packs"** opens the form below (same page; a modal or an inline section).
  - Small print: "Every pack is checked and packaged by SubverseLab before it is published. You keep the rights to your sounds; nothing is exclusive."
- **Links:** add the page to the Footer, the sitemap (`scripts/generate-sitemap.js`) and the prerender list (`scripts/prerender.js`), with its own title and meta description, and a route in `src/App.jsx`.

## Application form
**Fields:**
- name *
- e-mail *
- artist / producer name *
- country
- links * (at least one: Instagram, YouTube, Spotify, SoundCloud, BeatStars, own store)
- what you make (checkboxes: drum kits, loops, one-shots, melodic samples, vocals, presets, other)
- packs you already sell (optional URL)
- short message (≤ 1,000 characters)
- **required checkbox:** "I made these sounds myself or hold the rights to every sample in them (no uncleared samples)."

**Rules:**
- A signed-in user is optional. Pre-fill the e-mail when signed in.
- After sending, show: "Thanks. We read every application. We will write to you when the store opens, and earlier if we start with your packs."

## Server: `POST /api/packs/apply`
**Validation:**
- The body is validated, with lengths capped.
- `addressExists(email)` must pass, else 403 with the existing "cannot receive mail" text.
- Rate limit: 5 per hour per IP.
- One application per e-mail: sending again updates it and keeps `createdAt`.

**Storage:** write `pack_applications/{lowercased e-mail}` with:
- `{name, email, artist, country, links[], kinds[], storeUrl, message, rightsConfirmed: true, uid|null, createdAt, updatedAt, status: 'new'}`.
- No e-mail is sent: we have no transactional mail provider yet.

**Admin:** a small read-only list in the existing admin page, if `src/components/AdminPanel*` makes that easy: name, artist, links, kinds, date. Otherwise `GET /api/admin/pack-applications`, admin-only, same guard as the other admin routes.

**`firestore.rules`:** clients can neither read nor write `pack_applications`.

## Tests
New file `scripts/test-packs.js`, in the style of `test-testers.js`. Cover:
- a valid application → 200 and a stored doc;
- a missing required field → 400;
- rights unchecked → 400;
- a bounced or no-MX address → 403;
- sending again updates the doc and keeps `createdAt`;
- the rate limit → 429;
- the admin list: an admin gets the list, a non-admin is refused.

Also run all other `scripts/test-*.js`, lint and build, and paste the SUMMARY lines.

## Finish
Report: files changed, test outputs verbatim, the boot check, and anything NOT RUN. Open the page in a local preview if you can, and save a screenshot of only that page to `TASK_SAMPLE_PACKS_screens/`.
