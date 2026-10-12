# TASK: drop the verification MAIL, keep ownership proof (owner 9 Oct; revised by Opus after the first run)

The first run stopped halfway. The tree is broken: `accountEntitlements` still calls the removed `unverifiedLaunch1Claimant`, and `/api/launch2/status` still checks the removed `unverified` standing.

It also raised a correct security point. If orders matched ONLY by e-mail stop needing proof, anyone who signs up with a buyer's address sees that buyer's keys and downloads. The design below keeps that locked. It is NOT a security relaxation: every grant still needs proof of ownership. Only the proof changes, from "clicked the verification mail" to "the order is bound to this account".

Same folder and rules as TASK_ORDER_BINDING.md:
- No deploy, no commit, no gcloud/firebase writes.
- Every test passes, with new tests for each rule.
- New server files go into the Dockerfile COPY line, and you boot-check the server.

## Rules (the whole access model)
**Who is "proven" for an e-mail:**
- a Google sign-in; or
- `email_verified` true (old accounts that already verified).

Nobody becomes proven any other way, because no verification mail is sent any more.

**What a NON-proven password account may access:**
- **(a)** Orders bound to its uid: `custom_data.uid` at checkout, the `orders_by_uid` index, `launch2_uids`, or an order claimed with its order number via `/api/orders/claim`. That means downloads, the account cards and the licence keys of exactly those orders.
- **(b)** Its own uid launch claim, KUBBE + KASET (today's rule).
- **(c)** Buying: BuyButton no longer waits for verification. The checkout carries the uid, so the order binds to this account.

**What still needs a proven e-mail:**
- **(d)** Orders and keys matched ONLY by e-mail.
- **(e)** Admin preview.
- **(f)** Parked credits.
- **(g)** Tool custom-token sign-in (keep the 00200 rule).

For (d), the account page shows: "Have an order under this e-mail? Claim it with the order number from your receipt" (the existing claim card).

**Everywhere a password account acts,** `addressExists(email)` (already added to entitlements.js: syntax, `bounced_emails`, MX) must pass. Otherwise answer 403 "This e-mail address cannot receive mail. Sign in with a working address."

## Do
1. **Server:** finish the migration with these rules. Fix the broken references. Check `/api/launch/*`, `/api/testers/*` (apply/report: allow with `addressExists`, no proof needed) and account delete (allow; it acts on the caller's own uid). `/api/purchases/status` returns `{owned (a+b+proven-d), unverified: !proven}`.
2. **`GET /api/email/check?email=`:** syntax + bounced + MX, rate-limited. The sign-up form calls it before creating the account and shows the reason inline.
3. **Client:**
   - sign-up sends NO verification mail and has no "check your inbox" step;
   - BuyButton is not gated;
   - DownloadButtons and AccountPage follow the server's answer;
   - for a non-proven account, the e-mail-matched orders are hidden behind the claim card;
   - remove VerifyEmailNotice and the resend button. Nobody can receive the mail now.
4. **Tests:**
   - non-proven + uid-bound order: 200;
   - non-proven + e-mail-only order: 403, then a claim gives 200;
   - proven + e-mail-only order: 200;
   - bounced and no-MX: 403;
   - `/api/email/check`;
   - admin preview and parked credits are unchanged.
5. Lint, build, all `scripts/test-*.js`, boot-check, RELEASE_QUEUE entry. Report the outputs verbatim and anything NOT RUN.
