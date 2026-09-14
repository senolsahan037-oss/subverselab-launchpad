# 07 — Post-Deploy Verification

Canonical for: what must be checked after a deployment before it counts as complete.
Source: `Infrastructure/CloudRun/subverselab-v2/.agents/rules/deployment.md` §8–9 (and its identical mirror), extracted here so it's discoverable without reading the entire deployment file.

## Deployment verification is not optional

Deployment completion does not equal production success. A mandatory verification phase follows every deployment.

The full pipeline is:

```
Build → Deploy → Deployment Verification → Metadata Verification → Production Verification → Release Complete
```

Deployment is considered successful only if every verification step passes.

## Production verification checklist

At minimum, verify:

- [ ] Cloud Run revision deployed successfully.
- [ ] Production URL responds successfully.
- [ ] Custom domain resolves correctly.
- [ ] Metadata Sync API responds.
- [ ] Firebase connection succeeds.
- [ ] Firestore connection succeeds.
- [ ] Storage connection succeeds.
- [ ] Website loads without a runtime crash.
- [ ] Browser console contains no critical errors.
- [ ] Authentication initializes correctly.
- [ ] At least one synchronized product loads correctly.
- [ ] Manifest synchronization remains functional.

If any check fails: **RELEASE FAILED**. The deployment must not be considered complete, regardless of whether the build itself succeeded.

## Frontend-specific checks

- Correct Google Cloud project and Cloud Run service.
- Correct custom domain mapping.
- Vite environment variables were injected — build contains no `undefined` `VITE_*` values.

## Public-surface checks (subverselab-v2)

These are the checks that catch the failures a browser smoke test does not. Each one exists because the corresponding defect shipped to production at least once. All are verifiable with `curl` and the browser console — none require a person to eyeball anything.

**Serving layer**

- [ ] `https://www.subverselab.com/` returns `301` to the apex, and the apex returns `200`. Both hostnames are mapped to the service, so a regression here silently restores a duplicate site.
- [ ] A known-missing file (`/nonexistent.png`) returns `404`, not `200` with HTML.
- [ ] A canonical content URL (`/learn/{slug}`, no trailing slash) returns `200` directly — not a `301` to a slash variant.
- [ ] Response headers include HSTS, `X-Content-Type-Options`, `Referrer-Policy`, and a CSP; `x-powered-by` is absent.
- [ ] A hashed asset carries `immutable`; HTML revalidates.

**Crawlability — verify with JavaScript disabled, since AI crawlers never run it**

- [ ] `/`, `/learn/{slug}` and `/tools/{slug}` each return real body content, not an empty `<div id="root">`.
- [ ] `sitemap.xml`, `robots.txt`, `llms.txt` and `llms-full.txt` all return `200`, and the sitemap's URL count matches the number of published guides and registered tools.
- [ ] Every route serves **exactly one** `<title>`, one `<link rel="canonical">` and one `<meta name="description">`.
- [ ] No meta description begins with Markdown syntax (`## `, `**`) — that means a raw guide body reached a description field.

**Client-side navigation** — the prerendered HTML being correct does not mean the app is:

- [ ] Navigating between routes updates the tab title, including on browser Back. A route whose component sets no metadata inherits the previous page's title.
- [ ] After navigating, the counts above are still exactly one each. React 19 hoists its own `<title>`/`<meta>`/`<link>` and knows nothing about the prerendered tags, so anything that stops `main.jsx` from removing them reintroduces duplicates.
- [ ] The browser console reports no CSP violations after exercising the auth modal and a Tool Room iframe — the two flows that reach the most external origins.

## Backend-specific checks

- `env.yaml` loaded successfully.
- `FIREBASE_STORAGE_BUCKET` exists.
- Metadata Sync starts correctly.
- Required environment variables are present.
- Service account permissions are valid.

Backend startup failures must immediately fail the deployment — do not treat a running-but-misconfigured backend as a successful release.

## Remote tool checks

- Fetch one CSS and one JS asset **with an `Origin` header set to the tool's own production URL**. Expect `200` and `text/css` / `text/javascript`. A `500` returning `text/html` is the global-CORS bug in `06_DEPLOYMENT.md` — the tool will render a blank page while every plain `curl` reports it healthy.
- Load the tool's page and confirm `document.getElementById('root').children.length > 0`. A `200` on the HTML says nothing about whether the app mounted.
- Confirm each member-gated endpoint returns `401` without a token.

## Responsive checks

For the website this is automated: `npm run check:responsive` (see `06_DEPLOYMENT.md`). Run it before deploying rather than checking by eye.

Remote tools are not covered by it — they are separate services on their own origins — so each is still verified by hand at **320, 375, 768, 1024 and 1366 px**. The check is objective, not a glance:

```js
document.documentElement.scrollWidth - document.documentElement.clientWidth  // must be 0
```

Anything above 0 means the page scrolls sideways, which on a phone puts controls out of reach with no way to get to them. Content that is *meant* to scroll horizontally — a sequencer grid, a wide table — must do so inside its own `overflow-x` container, so the document total stays 0.

Two failures cause almost all of it:

- **A flex row with no wrap.** The site header was one nowrap row of brand, a 400 px search field, four links, a theme toggle and a button, with 40 px side padding. At 375 px it ran 309 px past the viewport and everything after the first link was unreachable.
- **`minmax(<fixed>, 1fr)` in a grid.** The track never shrinks below its floor, so a 480 px minimum inside a 295 px column overflows by 145 px. Write `minmax(min(480px, 100%), 1fr)`.

Checking only at desktop width is how both shipped. The tools were fine; the website was not, and nobody could have known from a 1440 px screen.

## Crawler surface checks

- **robots.txt groups do not inherit.** A crawler obeys only the single most specific `User-agent` group that matches it (RFC 9309 §2.2.1). Naming a bot to grant it access also releases it from every `Disallow` under `*`. Each `Disallow` must therefore be repeated in every group. This site named fifteen AI crawlers to welcome them and, in doing so, told all fifteen that `/admin` and `/account` were open — the one thing the file was meant to prevent. Verify with:

  ```bash
  curl -s https://subverselab.com/robots.txt | grep -c '^User-agent:'   # groups
  curl -s https://subverselab.com/robots.txt | grep -c '^Disallow:'     # must be groups × disallowed paths
  ```

- **`Disallow` is not `noindex`.** It stops fetching, not indexing from an inbound link. Client-rendered private routes carry no `<meta name="robots">` a non-JS crawler can see, so `/admin` and `/account` are served with `X-Robots-Tag: noindex, nofollow` from `server.js`. Confirm the header is present on those two and absent everywhere else.

- Every `<loc>` in `sitemap.xml` must return 200, and each public page must carry exactly one `<link rel="canonical">` pointing at itself.

## Before trusting a verification

`09_FAILURE_LOG.md` records every failure that reached production here, and each one passed the verification that was actually run. Three questions from it apply to any check written below:

1. **What does this look like when it fails?** If failing looks the same as "no data", a fallback is hiding it — check the output, not the status code.
2. **Does the instrument send what a real client sends?** `curl` sends no `Origin`, so it cannot see a CORS fault. A desktop window cannot see a mobile overflow. A `200` does not mean the app mounted.
3. **Is the other side of the contract implemented?** Grep the counterpart's shipped build for the message type or field before believing a handshake exists.
