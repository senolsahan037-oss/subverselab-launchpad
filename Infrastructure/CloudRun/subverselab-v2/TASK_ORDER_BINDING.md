# TASK: orders bound to the account open downloads (owner approved 9 Oct)

Work in this folder (`Infrastructure/CloudRun/subverselab-v2`). Read `/Users/senolsahan/Desktop/SubverseLab-Launchpad/CLAUDE.md` first.

Rules:
- No deploy, no commit, no gcloud/firebase writes.
- Keep every test passing, and add tests for every change.

## Measured problem (9 Oct)
107 e-mails ordered since 8 Oct:
- 21 have NO site account with that e-mail. They paid or ordered under another address, so `ownedOrderSlugs(email)` never matches.
- 13 are unverified password accounts. The verification mail never arrives, so they get 403.

## Change
1. **Ownership by uid.**
   - The webhook already stores `uid` (`meta.custom_data.uid`) on orders and keys in `plugin_licenses/{email}`. Make the uid findable: when an order carries a uid, also write an index doc `orders_by_uid/{uid}` holding `{orders: {<orderId>: {product, status, refunded, created, email}}}`, kept in sync on refund. Check how the family is already bound through `launch2_uids` and follow that pattern.
   - `ownedOrderSlugs` / `purchasedByOrders` / the ticket route / `/api/purchases/status` / `/api/purchases/licenses` then use orders by e-mail UNION orders by uid.
   - Backfill: write `scripts/backfill-orders-by-uid.js`, a dry run by default with `--write` to apply. It scans `plugin_licenses` and builds `orders_by_uid` from orders that carry a uid. Do NOT run it with `--write`; Opus runs it.
2. **No verification needed for a uid-bound order.**
   - An unverified password account may download, see on `/account`, and see the licence keys for exactly the plugins of orders bound to its uid: paid singles, the family (already true via `launch2_uids`) and free $0 orders.
   - Everything else still needs a verified e-mail. That covers orders found only by e-mail, buying, and launch claims (which keep today's uid rule).
   - `/api/purchases/status` returns 200 with those owned slugs and `unverified: true`.
3. **Account page.** For an unverified account with uid-bound plugins, show the plugin cards with downloads, plus the verify notice for the rest. Today's launch-claimant branch is the model.
4. **Tests** (`scripts/test-download.js`):
   - uid-bound TABAN order with a different checkout e-mail: 200, also when unverified;
   - the same for a paid single;
   - an order by e-mail only, unverified: 403;
   - a refunded uid-bound order: 402;
   - another uid gets nothing;
   - the backfill dry run lists the right docs;
   - the account-delete test removes `orders_by_uid/{uid}`.
5. **Dockerfile.** Any new server file must be added to the COPY line. Last time `inbox.js` was missing and the container failed to start. After building, run `node -e "import('./server.js')"` or start the server locally on a free port with fake env, and confirm it boots.
6. **firestore.rules.** Clients cannot read or write `orders_by_uid`.

## Finish
- Run: `npx eslint .` (0 errors), `npm run build`, and all `scripts/test-*.js`. Paste the SUMMARY lines.
- Add a dated entry at the top of `RELEASE_QUEUE.md` (NEXT DEPLOY).
- Report the files changed, the test output verbatim, and anything NOT RUN.
