# TASK: clearer inbox messages + "claim an order" (owner approved 9 Oct)

Same folder and rules as TASK_ORDER_BINDING.md (read it):
- No deploy, no commit, no gcloud/firebase writes.
- Every test passes, and new changes come with new tests.
- New server files go into the Dockerfile COPY line, and you boot-check the server.

## 1. Inbox copy (inbox.js)
The owner wants the messages to explain themselves.

**Order message**, one per order, idempotent as today:
- Title: "Your NAME is ready" (family: "Your SubverseLab plugin family is ready (7 plugins)").
- Body: plain text with line breaks, rendered as separate lines in InboxList:
  - "Order #<order_number>, <date>." Free orders add "Free".
  - "Download: Account → NAME → Download for macOS / Windows." For the family: "Account → each plugin → Download".
  - "Your licence key is on the same card (Account → Licence keys)."
  - "After installing, rescan plug-ins in your DAW: VST3 in /Library/Audio/Plug-Ins/VST3 (macOS) or C:\Program Files\Common Files\VST3 (Windows); AU in /Library/Audio/Plug-Ins/Components."
  - "Stuck? Reply to your receipt e-mail or use “Report a problem” on the Account page."
- Link: "/account#<slug>" (family: "/account").

**Welcome message:** three short lines.
- "Your downloads, licence keys and tool credits live on the Account page."
- "Free plugins: get them on their page, they appear here right after."
- "Messages about your orders arrive in this inbox."

InboxList must render the line breaks (`white-space: pre-line`). Keep it tidy on mobile.

## 2. Claim an order (for orders placed without signing in)
21 of 107 recent buyers ordered without a site session, so their orders carry no uid and no matching e-mail.

**Account page, new small card "Bought without signing in?":** an order number field, the checkout e-mail field, and a "Claim" button.

**New endpoint `POST /api/orders/claim` {orderNumber, email}:**
- Bearer token required. Rate limit: 5 per hour per uid.
- Find the order in Firestore `plugin_licenses/{email}.orders` whose `order_number` matches, with status paid and not refunded. If the order is already bound to another uid, refuse with 409.
- Bind it: set the uid on the order and on its keys, and write `orders_by_uid/{uid}` (the same structure TASK_ORDER_BINDING created).
- Answer 200 {slugs}. For the family product, also write the `launch2_uids/{uid}` binding the way the webhook does for a uid-bound family order (reuse that code).
- Error messages are clear: not found, already claimed, refunded.
- Knowing the order number plus the checkout e-mail is the proof. It is printed only on the receipt sent to that e-mail.

After a claim, the inbox gets an order message as in §1, and the page refreshes the owned list.

**Tests:** claim success for a single, a free order and the family; wrong e-mail 404; refunded 402; already bound to another uid 409; rate limit; after a claim the ticket route opens the plugin for an unverified account.

## Finish
Run lint, build, and all `scripts/test-*.js`, then paste the SUMMARY lines. Boot-check `server.js`. Add a RELEASE_QUEUE entry. Report the files changed, the outputs verbatim, and anything NOT RUN.
