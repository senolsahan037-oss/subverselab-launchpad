# Tool credits: API contract for the tool services

Code: `credits.js` (logic), `server.js` (routes, webhook), tests `scripts/test-credits.js`.

Rule: every paid $1 on a plugin order = 100 credits (1 US cent = 1 credit, from the order's price WITHOUT tax: `total_usd - tax_usd`).
The online tools keep their daily free use; a tool service asks for credits only after the user's free use is used up.

| Tool | Cost per use |
|---|---|
| `splitter` | 50 |
| `visualizer` | 50 |
| `mixcheck` | 100 |
| `arrangement-gps` | 25 |

Costs are fixed in `credits.js` (`CREDIT_COSTS`); any amount in a request is ignored. Sensei stays free (no call). Arrangement GPS spends only (no `release`): the arrangement is built in the browser after the spend, so nothing can fail afterwards.

## Calling convention (server to server only)

Both routes need `Authorization: Bearer <Google OIDC identity token>` of the calling Cloud Run service's service account,
audience = this site (`https://subverselab.com`, or `CREDITS_AUDIENCE`). The service account e-mail must be listed in
`CREDITS_ALLOWED_CALLERS`. A browser cannot call these routes: it has no such token.

Body is JSON (`Content-Type: application/json`), max 8 KB.

### POST /api/credits/spend
Body: `{"tool": "splitter", "jobId": "<unique per job>", "userIdToken": "<the user's Firebase ID token>"}`
`jobId`: 1-128 characters of `A-Za-z0-9 _ . : -`. A new job needs a new jobId.

| Status | Body | Meaning |
|---|---|---|
| 200 | `{ok:true, balance, cost}` | debited; run the job |
| 200 | `{ok:true, balance, cost, duplicate:true}` | this (tool, jobId) was already charged; NOT charged again |
| 402 | `{ok:false, reason:'insufficient', balance, cost}` | not enough credits, nothing debited |
| 409 | `{ok:false, reason:'released'}` | that job was already released; use a new jobId |
| 409 | `{ok:false, reason:'job-conflict'}` | the jobId belongs to another account |
| 400 | `{ok:false, error}` | unknown tool or bad jobId |
| 401 | `{ok:false, reason:'bad-user-token'}` / caller token errors | user token or caller token not accepted |
| 403 | `{ok:false, error:'Caller not allowed'}` | service account not in the allow-list |
| 503 | | API disabled (`CREDITS_ALLOWED_CALLERS` empty) or Google/Firestore unreachable |

### POST /api/credits/release
Body: `{"tool": "splitter", "jobId": "<same jobId>"}`. Call it when a job that was charged fails. Refunds that spend exactly once.

| Status | Body |
|---|---|
| 200 | `{ok:true, released:true, balance}` first call |
| 200 | `{ok:true, released:false, duplicate:true, balance}` repeat call, nothing refunded |
| 404 | `{ok:false, reason:'no-such-spend'}` that (tool, jobId) was never charged |
| 400/401/403/503 | as above |

Recommended flow in a tool: use the free daily use first; if used up, `spend`; if `402` show "Not enough credits"
(link to https://subverselab.com/plugins); run the job; if it fails, `release`. Retry `spend`/`release` on network errors with the same jobId: both are idempotent.

## Getting the OIDC token on Cloud Run

Metadata server: `http://metadata/computeMetadata/v1/instance/service-accounts/default/identity?audience=https://subverselab.com`
with header `Metadata-Flavor: Google`. The response body is the token (valid ~1 hour; cache it for a few minutes).
The service must run as the service account that is listed in `CREDITS_ALLOWED_CALLERS`.

Python:
```python
import requests

AUDIENCE = "https://subverselab.com"
META = "http://metadata/computeMetadata/v1/instance/service-accounts/default/identity"

def caller_token():
    r = requests.get(META, params={"audience": AUDIENCE}, headers={"Metadata-Flavor": "Google"}, timeout=3)
    r.raise_for_status()
    return r.text

def spend(tool, job_id, user_id_token):
    r = requests.post(f"{AUDIENCE}/api/credits/spend",
                      headers={"Authorization": f"Bearer {caller_token()}"},
                      json={"tool": tool, "jobId": job_id, "userIdToken": user_id_token}, timeout=10)
    return r.status_code, r.json()   # 200 ok / 402 insufficient
```

Node 18+:
```js
const AUDIENCE = 'https://subverselab.com';
async function callerToken() {
  const r = await fetch(`http://metadata/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(AUDIENCE)}`,
    { headers: { 'Metadata-Flavor': 'Google' } });
  if (!r.ok) throw new Error(`metadata ${r.status}`);
  return r.text();
}
async function spend(tool, jobId, userIdToken) {
  const r = await fetch(`${AUDIENCE}/api/credits/spend`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await callerToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, jobId, userIdToken }),
  });
  return { status: r.status, body: await r.json() };   // 200 ok / 402 insufficient
}
```
(Locally, `gcloud auth print-identity-token --impersonate-service-account=<sa> --audiences=https://subverselab.com` gives a test token.)

## Env vars on the subverselab-site Cloud Run service

| Name | Value |
|---|---|
| `CREDITS_ALLOWED_CALLERS` | comma list of the tool services' service-account e-mails (Splitter, Visualizer, Mix Check, Arrangement GPS runtime SAs). Empty or unset = API off (503). |
| `CREDITS_AUDIENCE` | optional; default `https://subverselab.com`. Must equal the `audience` the tools put in the metadata request. |

No secrets. The tool services need no extra role to fetch an identity token for their own service account.

## Data (Firestore, Admin SDK only; `firestore.rules`)

- `credits/{uid}` `{balance, granted, spent, updatedAt, tester?: {month, remaining}}`; a signed-in user may read only their own document.
- `credit_ledger/{id}` `{uid, delta, reason: purchase|refund|spend|release|admin|tester-grant|tester-expire, orderId?, tool?, jobId?, shortfall?, at}`; ids are deterministic
  (`purchase_{orderId}`, `refund_{orderId}_{n}`, `spend_{tool}_{jobId}`, `release_{tool}_{jobId}`, `tester_{YYYY-MM}_{uid}`, `tester_expire_{YYYY-MM}_{uid}`) so a repeat can never write twice. Needs the composite index (uid ASC, at DESC) in `firestore.indexes.json` (without it the balance route falls back to an unindexed read).
- `pending_credits/{email}`: paid orders that carried no account id; claimed by the account whose sign-in e-mail is that e-mail (proven or not, owner 2026-10-18) on `/api/credits/balance` or `/api/purchases/status`, and by the account that claims the order with its order number (`/api/orders/claim`, that order's credits only).
- Order amounts: `plugin_licenses/{email}.orders[orderId]` gets `amount_usd_cents` (= `total_usd - tax_usd`, or `total - tax` when the currency is USD), `currency`, `total`; family orders also `launch2_purchases/{email}.amountUsdCents/currency/total`.
- Refund (`order_refunded`): the order's credits are removed (balance never below 0; the part that was already spent is recorded as `shortfall`, the refund is never blocked). A partial refund removes the same share.

## Tester credits (Tester Agreement v1.1, section 4.5)

An active tester (`launch2_testers/{e-mail}.status` is `active`, or missing on an old record) gets **2,000 credits per calendar month (UTC)**.
Unused tester credits do not carry over. The tool services change nothing: they still call `spend` / `release` and see one `balance`.

Design (credits.js): one pool, one tracked slice. `credits/{uid}.tester = {month, remaining}` says how much of `balance` is this month's tester grant;
the rest of `balance` is purchased (or admin) credits, which tester handling never touches. Nothing runs on a timer: the first `spend` or balance read of a
uid in a new month does the work, in the same Firestore transaction as the spend.

1. Expiry: the previous month's `remaining` (or all of it when the tester is ended / revoked, or the e-mail is not proven) is removed with ledger line
   `tester_expire_{YYYY-MM}_{uid}` (delta = -remaining). `balance` and `granted` both drop, so `balance = granted - spent` still holds.
2. Grant: an active tester gets ledger line `tester_{YYYY-MM}_{uid}` (delta +2000, `granted` +2000). The id is deterministic, so a month can never be granted twice,
   even if the slice marker were lost; re-activating a tester in the same month does not grant again.
3. Spend takes tester credits first (`fromTester` and `testerMonth` are stored on the `spend_*` line), then purchased ones. A `402` still persists the expiry / grant.
4. Refund of an order removes purchased credits only (`balance - tester.remaining` at most). Release returns the tester part only while that month's slice is
   still the one on the account; after a rollover those credits have expired like the rest (`granted` drops by the expired part).

The uid's e-mail must be proven (Google sign-in or verified), the same rule as every e-mail-matched entitlement: `server.js` passes `testerEmail` to
`spend` / `readBalance` only then. `GET /api/credits/balance` returns `tester: {month, monthly, left}` (or `null`). Tests: `scripts/test-credits.js`
("tester credits ..." cases).
