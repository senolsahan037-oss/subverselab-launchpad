# Account, admin, guides and product rooms: the improvement plan (owner 31 Oct 2026, for the next session)

Owner's brief: "launchpad hem kullanıcı, tester, prodüktör ya da admin için verimli ve her adımı kaliteden ödün vermeyen bir yapıya
bürünmeli; tekrar eden bilgiler olmamalı." This is the plan, written before the work so the next session starts from it. Every
item is local-only until the owner's go; the gate for each step is the usual one (lint 0, build, every test, RELEASE_QUEUE entry).

## The end goal: one maintenance deploy a month
Everything that changes often (products, news, packs, people, prices, dates, manuals) is data the panel or an agent writes;
code ships once a month with what accumulated. A feature counts as done when the next change of that kind needs no deploy.

## 0. One principle for all four areas: one fact, one place
- Every piece of text or data the site shows has exactly one source: product words in `plugins.js` / the catalogue, delivery and
  licence rules in `docs/PACK_DELIVERY.md` and the Help page, install steps in the manual. A page that needs the fact links to it or
  renders it from the source; it never retypes it. The audit in §5 lists the repeats found today.
- Four readers, one layout grammar: the same fold/key/plate components for the buyer's Account, the tester's space, the publisher's
  page and the admin panel, so a change in one place carries to the others.

## 1. Account page (`src/components/AccountPage.jsx`)
What is there: welcome plate (greeting, plug-in and credit counts), My plugins (cards with per-platform downloads, manual PDF, "read
online"), My packs, Your downloads, folds (Inbox, Licence keys, Tool credits, Updates, Downloads and installing, Something not right?,
Delete my account). Problems seen: the install text in the "Downloads and installing" fold repeats the manual's install page and the
Help page; "Updates" repeats what the plug-in card already says; a buyer with nothing sees the same long page as a buyer with twelve
products; the tester's space is a different page (`/testers`) with its own download list.
Plan:
1. **One product row, everywhere.** A `ProductRow` component (name, model, version, platform keys, manual link, update date) used by
   My plugins, My packs, the tester space and the admin Members detail. The row reads the manifest once (`/api/download/manifest`)
   and the entitlement status once; no page keeps its own copy of the version or the install line.
2. **Install and licence text come from the manual.** The "Downloads and installing" fold becomes two links: the product's manual
   install page (`/plugins/<slug>/manual#install`) and the Help page; the fold's own paragraphs go.
3. **Empty states by reader.** No purchases: the free plug-ins and the two newest packs as direct keys, one line each, nothing else.
   Tester: the tester panel lives inside Account as a fold ("Testing"), not a second page; `/testers` keeps only the public
   application page.
4. **Inbox messages are the one place for order facts.** The purchase thank-you, the version note and the refund note are inbox
   messages; the cards stop repeating them.
5. Numbers in the welcome plate come from the same ownership call the rows use (one request, not two).

## 2. Admin panel (`src/components/AdminPanel.jsx`, `admin/*`)
What is there: Stats, Catalogue (news, plug-ins, sample packs, preset packs, publishers, files, agents), Members, Store items,
Reports, Testers, Pack applications, SEO. Problems: **Store items** and **Catalogue → Plug-ins/Sample packs** show the same products
from two sources; **Pack applications** (producers who offered packs) and **Catalogue → Publishers** are the same people in two
lists; Testers and Members both show a tester's record; the tab bar grows sideways with every feature.
Plan:
1. **Three sections, not nine tabs:** *Store* (Catalogue as it is + Files + the Store items view folded into the product lists as a
   "Live / In code / Orders" status column), *People* (Members, Testers, Publishers, Pack applications: one search box, one person
   = one row with their roles — buyer, tester, publisher — and the actions each role allows), *Site* (Stats, Reports, SEO, Agents).
2. **Pack applications become publisher candidates.** An application row gets "Make a publisher" (pre-fills the Publishers form
   with name, link, e-mail) and "Decline"; the list is the Publishers list filtered to *candidate*. One collection, one status field.
3. **Every write shows what the visitor sees.** The news preview exists; add the same for a plug-in (the room hero), a sample pack
   (the sleeve card + the price line) and a publisher (the "by" line), rendered with the real components.
4. **Agent parity.** Everything a tab can do has a route the agent key can call, and `scripts/catalog-cli.js` has the command;
   `GET /api/catalog/schema` grows a `routes` list so an agent reads the whole contract from one answer.
5. **Quality gates inside the panel, not in a doc:** price-floor check against earlier prices (Lemon Squeezy orders + `RELEASE_QUEUE`
   history), public-copy check (no counts, no "coming soon", no "AI", ASCII names), release-date sanity, missing-asset warnings
   (no cover, no preview, no manifest file) before *Published* can be turned on.

## 3. Guides and manuals (`src/data/pluginManuals.js`, `manuals/`, `learnContent.js`, `/help`, the rooms' sections)
What is there: a web manual per product (`/plugins/<slug>/manual`) plus a PDF, tool guides under `/learn/<slug>`, a Help & FAQ page,
and each room's sections and controls. Problems: install steps live in the manual, in Account and in Help; the controls table in the
room repeats the manual's controls chapter; the tool guides are a separate system from the plug-in manuals with another layout;
the PDF is generated from a different source than the web manual on some products.
Plan:
1. **One manual source per product**, structured (sections, controls, install, requirements, troubleshooting) in `pluginManuals.js`
   or the catalogue item; the web manual, the PDF (built by `scripts/`) and the room's controls table all render from it.
2. **Help page = rules only** (buying, refunds, accounts, licences, updates), each rule once, linking to the manual for anything
   product-specific; the FAQ entries that restate a manual chapter go.
3. **Tool guides join the manuals**: same layout component, same table of contents, same "Open the room / Open the tool" key; `/learn`
   becomes the index of every guide and manual, grouped (plug-ins, apps, browser tools), fed from the data, not hand-written.
4. **Catalogue products get manuals too**: the plug-in item's *Manual PDF* field is joined by structured manual fields, so a
   publisher's product has the same web manual as ours.
5. A guide quality list: every manual states requirements, install per OS, the first thing to try, every control, and where help
   is; a test (`scripts/test-manuals.js`) checks the list for every product so a thin manual cannot ship.

## 4. Product rooms (`PluginRoom.jsx`, `CatalogPluginRoom.jsx`, `SamplePackPage.jsx`, preset pack cards)
What is there: a room per plug-in (hero with panel views, intro, sections, controls, buy, manual link), a page per sample pack
(cover, kind line, made line, what's inside, buy, Listen strip, more packs), preset packs as cards with a fold. Problems: the room
repeats the manual's controls; the trust line and formats line are typed per product; the pack page has no "how it was made" depth
for catalogue packs; preset packs have no room at all; the box view on /plugins and the room hero show different pictures.
Plan:
1. **Room = sell, manual = teach.** The room keeps the hero, the sound (views, a short audio or film), three to five sections, the
   price plate and the manual link; the controls table moves to the manual (one place), the room shows the three controls that
   matter with a line each.
2. **Shared plates**: price/trust/formats/updates plate from one component fed by `PRICES`, the manifest and the catalogue; no
   per-product strings for formats or the trust line unless the product differs.
3. **Pack pages get the same depth as rooms**: made line, three "listen for" notes with timestamps (the scenes), the publisher's
   note when there is one, the licence summary once (from Help), and the sweep plate; preset packs get a page of their own with the
   rack list and a short film or audio.
4. **Box and hero agree**: the room hero's panel view is the same picture the box prints on its lid and the panel that rises out of
   the box; one `BOX_LAYERS`/`modes` entry feeds both.
5. **Owner's own check per room**: a per-room `ROOM_CHECKS` list (sound heard, numbers verified, manual complete, box rendered,
   checkout live) shown in the admin Store list, so a room is "ready" by a list, not by feel.

## 4b. Password accounts: the whole journey without Google (owner 31 Oct: "gmail adresini vermek istemeyen kullanıcı şifreyle giriş
yapabilir, satın alabilir, fatura, lisans anahtarı ve indirme kapılarına Google olmadan erişebilir olmalı")
What is there: `AuthModal.jsx` already creates and signs in e-mail + password accounts; the API treats an unconfirmed password
account as "not proven": a paid order placed under that e-mail is not opened until the account confirms the address
(`emailOrdersWaiting` → Firebase `sendEmailVerification`) or claims it with the order number; a uid-bound order (bought while
signed in) opens at once. The confirmation and reset mails go out through Firebase with the owner's Gmail as SMTP (the
CUSTOM_SMTP decision), the same account that hit its sending limit today. The modal leads with Google; the password form is
second and says nothing about what happens next.
Plan:
1. **Two equal doors.** The sign-in modal shows "Continue with Google" and "E-mail and password" side by side, with one line each
   ("No Google needed. We send one confirmation link."). Sign-up asks e-mail + password only; no name, no marketing box.
2. **Confirmation that arrives.** Auth mail leaves the owner's Gmail: Firebase's own sender for the free tier, or a transactional
   sender on the subverselab.com domain (SPF/DKIM) when the volume needs it; measured by a weekly probe. Until confirmed the
   account can browse, buy and see its inbox; download, keys and receipts open on confirmation or on a claim with the order
   number, exactly the rule the API already has. The account page shows that state in one sentence with the one button that
   clears it (resend / claim).
3. **Buying signed in binds the order.** The Buy key passes the uid to Lemon Squeezy for every product (today: plug-ins, packs,
   the family); a password account that buys while signed in needs no confirmation to download, as the uid-bound rule says.
4. **Receipts and invoices on the account.** Every order on the account page gets its Lemon Squeezy receipt link (the webhook
   stores `receipt_url`/`urls.receipt`) and the order number; a "Need an invoice with a company name?" line points at the
   Lemon Squeezy receipt page, where the buyer adds it. No PDF of our own, no second record.
5. **Keys and downloads identical for both doors.** The licence-key fold and every download ticket read the same ownership
   call; nothing checks "is Google" anywhere but the delete-account re-authentication. Password reset and e-mail change from
   the account page, with the same mail path as confirmation.
6. **A test that walks the whole journey** (`scripts/test-password-journey.js`): sign up with a password, buy signed out and claim
   with the order number, buy signed in and download, confirm the address and see the key and the receipt, reset the password,
   delete the account; plus the Google account doing the same, so both doors are proven equal on every build.
7. Public copy: the Help page's account section says the two doors in two sentences; the tester and publisher flows accept a
   password account like any other.

## 5. Repeats found today (to remove, each to its one place)
| Repeat | Where it appears | One place |
|---|---|---|
| Install steps | Account fold, Help, manual install page | manual install page |
| Controls table | room, manual | manual |
| Formats / trust / updates line | per-product strings in `plugins.js`, room, card, account card | one plate component fed by data |
| Licence summary | pack page, Help, preset fold | Help (linked) |
| Product list | Catalogue (code + live), Store items tab, Members' purchases | Catalogue lists |
| Producer records | Pack applications, Publishers | Publishers (candidate → active) |
| Tester record | Testers tab, Members tab, `/testers` space | People row; Account "Testing" fold |
| Preview length / version | card label, strip, account row, manifest | manifest + peaks JSON |
| Delivery rules | RELEASE_QUEUE notes, packs STATUS, CATALOG.md | `docs/PACK_DELIVERY.md` |

## 6. Order of work (each step its own RELEASE_QUEUE entry and gate)
1. §2.1–2.2 admin sections and the People row (removes two duplicate tabs).
2. §1.1–1.3 Account rows, empty states, tester fold.
3. §3.1–3.2 one manual source, Help trimmed to rules; `test-manuals.js`.
4. §4.1–4.2 rooms slimmed, shared plates; §4.4 box/hero picture agreement.
5. §3.3–3.4 guides index and catalogue manuals; §4.3 pack and preset pages.
6. §2.3–2.5 previews in the panel, agent parity, quality gates.
7. §4b password journey: 4b.1–4b.3 first (doors, mail path, uid-bound buying), then 4b.4–4b.5, then the journey test 4b.6.
Nothing here changes prices, campaigns or public claims; nothing deploys before the owner's go.
