# Security Audit — 2026-10-17 (`subverselab-v2` & live `subverselab.com`)

Scope: Read-only security review of `Infrastructure/CloudRun/subverselab-v2` (`firestore.rules`, `server.js`, `api/*.js`, `src/`) and passive HTTP header verification of `https://www.subverselab.com` and `https://subverselab.com`.
**No product, rule, or source file was modified.**

---

## 1. Findings & Proposed Remediations for Claude

### F1 [Moderate] — `firestore.rules`: `/users/{userId}` allows any signed-in user to read all user documents
- **Location:** `Infrastructure/CloudRun/subverselab-v2/firestore.rules:17-20`
- **Current code:**
  ```javascript
  match /users/{userId} {
    allow read: if request.auth != null;
    allow write: if request.auth != null && request.auth.uid == userId;
  }
  ```
- **Issue:** Any authenticated user (`request.auth != null`) can read or list `/users/{userId}` documents belonging to other users. Furthermore, `allow write` has no field or size bounds, allowing a user to store up to 1 MiB of arbitrary fields in their own document. Note: `src/` currently makes no client reads/writes to `users` (only `api/accountDeletion.js:219` deletes `users/{uid}`).
- **Proposed Fix:**
  - If client access to `users/{userId}` is no longer used by the web app, close it (`allow read, write: if false;`) or restrict read to the owner only (`allow read: if request.auth != null && request.auth.uid == userId;`) with field/size validation on `write`.

---

### F2 [Moderate] — `firestore.rules`: `/forum_topics` and `/replies` allow `authorId` tampering on `update` and lack size/type limits
- **Location:** `Infrastructure/CloudRun/subverselab-v2/firestore.rules:150-159`, `src/components/ForumPage.jsx:92-96,115-118,150,167`
- **Current code:**
  ```javascript
  match /forum_topics/{topicId} {
    allow read: if true;
    allow create: if request.auth != null && request.resource.data.authorId == request.auth.uid;
    allow update, delete: if request.auth != null && resource.data.authorId == request.auth.uid;
    match /replies/{replyId} {
      allow read: if true;
      allow create: if request.auth != null && request.resource.data.authorId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.authorId == request.auth.uid;
    }
  }
  ```
- **Issue:**
  1. **Update Bypass (Impersonation / Ownership Transfer):** `allow update` checks `resource.data.authorId == request.auth.uid` (existing document) but does not verify `request.resource.data.authorId == resource.data.authorId` (incoming document). A user can create a topic or reply and then update `authorId` and `authorName` to another user's UID/name.
  2. **Storage Abuse / Missing Schema Validation:** Neither `create` nor `update` checks field types (`is string`) or string lengths (`size()`), allowing 1 MiB payloads or non-string fields that could break rendering in `ForumPage.jsx`.
- **Proposed Fix:**
  - On `forum_topics/{topicId}`:
    - `create`: require `request.resource.data.keys().hasOnly(['title', 'body', 'category', 'authorId', 'authorName', 'createdAt'])`, `request.resource.data.authorId == request.auth.uid`, `title is string && title.size() >= 1 && title.size() <= 300`, `body is string && body.size() >= 1 && body.size() <= 10000`, `category is string && category.size() <= 80`, `authorName is string && authorName.size() <= 120`.
    - `update`: require `resource.data.authorId == request.auth.uid`, `request.resource.data.authorId == resource.data.authorId`, `request.resource.data.authorName == resource.data.authorName`, `request.resource.data.createdAt == resource.data.createdAt`, and validate `title`, `body`, `category` lengths.
  - On `replies/{replyId}`:
    - `create`: require `request.resource.data.keys().hasOnly(['body', 'authorId', 'authorName', 'createdAt'])`, `request.resource.data.authorId == request.auth.uid`, `body is string && body.size() >= 1 && body.size() <= 10000`, `authorName is string && authorName.size() <= 120`.
    - `update`: disallow if UI does not edit replies (`ForumPage.jsx` only edits topics), or enforce `request.resource.data.authorId == resource.data.authorId`.

---

### F3 [Moderate] — `firestore.rules`: `/reports/{document=**}` allows unauthenticated unbounded writes (Storage Abuse / DoS)
- **Location:** `Infrastructure/CloudRun/subverselab-v2/firestore.rules:142-149`, `src/components/DownloadRoomReport.jsx:28-40`, `src/components/Storefront.jsx:337-345`
- **Current code:**
  ```javascript
  match /reports/{document=**} {
    allow create: if true;
    allow read, update, delete: if request.auth != null
      && request.auth.token.email_verified == true
      && request.auth.token.email in ['info@subverselab.com', 'senolsahan037@gmail.com'];
  }
  ```
- **Issue:**
  1. Using `{document=**}` instead of `{reportId}` allows creating arbitrary nested subcollections under `/reports`.
  2. `allow create: if true;` without schema or size checks lets any unauthenticated caller write arbitrary 1 MiB documents directly via the Firestore REST/Web SDK, bypassing the client-side `maxLength={2000}` constraint.
- **Proposed Fix:**
  - Change match path from `/reports/{document=**}` to `/reports/{reportId}`.
  - Restrict allowed keys to the union of fields written by `Storefront.jsx` and `DownloadRoomReport.jsx`:
    `['productId', 'productTitle', 'os', 'userEmail', 'description', 'source', 'uid', 'userAgent', 'page', 'createdAt', 'status']`
  - Enforce `request.resource.data.description is string && request.resource.data.description.size() >= 1 && request.resource.data.description.size() <= 4000`, `request.resource.data.userEmail is string && request.resource.data.userEmail.size() <= 254`, `request.resource.data.status == 'Pending'`, and if `uid` is non-null, `request.auth != null && request.resource.data.uid == request.auth.uid`.
  - Alternatively, move report submission behind an IP-rate-limited `/api/reports` endpoint using the Admin SDK and set `allow create: if false;` in `firestore.rules`.

---

### F4 [Moderate] — `api/server.js`: `testerOwn()` auto-binds unbound tester records without checking `emailProven(decoded)`
- **Location:** `Infrastructure/CloudRun/subverselab-v2/api/server.js:1279-1293`
- **Current code:**
  ```javascript
  async function testerOwn(admin, decoded) {
    const mail = launch2Email(decoded.email);
    if (!mail || !decoded.uid) return null;
    const ref = admin.db.collection('launch2_testers').doc(mail);
    const snap = await ref.get();
    if (!snap.exists) return null;
    if (snap.data().uid) return snap.data().uid === decoded.uid ? snap.data() : null;
    return admin.db.runTransaction(async (tx) => {
      const fresh = await tx.get(ref);
      if (!fresh.exists) return null;
      if (fresh.data().uid) return fresh.data().uid === decoded.uid ? fresh.data() : null;
      tx.set(ref, { uid: decoded.uid }, { merge: true });
      return { ...fresh.data(), uid: decoded.uid };
    });
  }
  ```
- **Issue:** When `launch2_testers/{mail}.uid` is `null` (either a legacy tester record or after an admin calls `POST /api/admin/testers/uid` with `{ clear: true }` at `api/server.js:1996-2012`), the first signed-in account with that e-mail binds its `uid` to the tester record. Because password sign-ups do not verify e-mail ownership (`emailProven` is not required here), if an admin clears a tester's `uid` (or if a record has `uid: null`), an attacker who registers an unverified password account with that tester's e-mail before the real tester signs in will permanently bind the tester's entitlement (`TESTER_RELEASED_SLUGS` + assigned `tester_builds`) to the attacker's `uid`.
- **Proposed Fix:**
  - Require `emailProven(decoded)` when auto-binding a `uid: null` record in `testerOwn()`, OR require the admin rebind endpoint (`POST /api/admin/testers/uid`) to take the target `uid` explicitly rather than setting `uid: null` for first-come auto-binding.

---

### F5 [Low] — `firestore.rules`: `/analytics/{document=**}` is readable by any signed-in user
- **Location:** `Infrastructure/CloudRun/subverselab-v2/firestore.rules:139-141`
- **Current code:**
  ```javascript
  match /analytics/{document=**} {
    allow read: if request.auth != null;
  }
  ```
- **Issue:** Any signed-in member can read all documents under `/analytics`. `src/` has zero references to the `analytics` collection (site stats now live in `site_stats`, which is closed at line 130).
- **Proposed Fix:**
  - Change to `allow read, write: if false;` (or restrict to admin claim / verified admin e-mails if still used).

---

### F6 [Low] — `api/accountDeletion.js`: `emailMarker()` falls back to a hardcoded HMAC secret
- **Location:** `Infrastructure/CloudRun/subverselab-v2/api/accountDeletion.js:44-47`
- **Current code:**
  ```javascript
  export function emailMarker(email) {
    const secret = process.env.ACCOUNT_HASH_SECRET || 'subverselab-erased-email-v1';
    return createHmac('sha256', secret).update(String(email || '').trim().toLowerCase()).digest('hex');
  }
  ```
- **Issue:** If `ACCOUNT_HASH_SECRET` is ever omitted on a Cloud Run revision, `emailMarker()` silently falls back to the public string `'subverselab-erased-email-v1'`, which makes `erased_emails/{marker}` hashes reversible via rainbow/dictionary lookup and breaks consistency with markers hashed under a real secret.
- **Proposed Fix:**
  - Verify whether `ACCOUNT_HASH_SECRET` is set in production Cloud Run; if set, require it in production and allow the fallback only in test environments.

---

## 2. Verified Controls (Passing)

- **Canonical Host & TLS:** `https://www.subverselab.com` returns `HTTP/2 301` to `https://subverselab.com/`. `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` is served.
- **CSP & Framing:** `Content-Security-Policy` sets `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'self'`, and uses a SHA-256 hash for the pre-paint theme script without `'unsafe-inline'` or `'unsafe-eval'` in `script-src`.
- **Additional Headers:** `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=()`, `X-Powered-By` disabled, `X-Robots-Tag: noindex, nofollow` on `/admin` and `/account`.
- **Webhook & Ticket Cryptography:** Lemon Squeezy webhook (`api/server.js:2567-2572`) and download tickets (`api/server.js:183-190`) verify HMAC-SHA256 signatures with `crypto.timingSafeEqual` and length checks.
- **App Store JWS Verification:** `api/appstore.js` pins `AppleRootCA-G3.cer` by SHA-256 (`63343abf…653e9179`), enforces `ES256`, checks the 3-certificate chain, verifies Apple leaf/intermediate OIDs, and fails closed.
- **Proxy Spoofing Protection:** `server.js` strips client-supplied `x-svl-proxy-token` and `x-svl-client-ip` headers (`server.js:153-154`), and `api/server.js:69-88` only trusts `X-SVL-Client-IP` when `X-SVL-Proxy-Token` passes Google OIDC signature verification for `SITE_PROXY_AUDIENCE` and `SITE_PROXY_CALLERS`.
- **Sensitive Firestore Collections Closed:** `plugin_licenses` requires `email_verified == true && request.auth.token.email.lower() == email` (read-only); `launch_keys`, `launch2`, `launch2_uids`, `orders_by_uid`, `apple_purchases`, `apple_by_uid`, `erased_emails`, `credit_ledger`, `pending_credits`, `tester_*`, and the catch-all `/{document=**}` are all closed (`allow read, write: if false`).
