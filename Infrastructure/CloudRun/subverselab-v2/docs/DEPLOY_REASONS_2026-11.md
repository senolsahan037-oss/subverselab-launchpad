# What we deploy for — 1 to 14 Nov 2026

Owner 14 Nov: "en çok hangi işlemler için deploy yapıyoruz". Source: the DEPLOYED entries in `RELEASE_QUEUE.md`.

18 deploys in 14 days (incl. 14 Nov): 13 site only, 2 API only, 4 site + API (counted once each, one more on 14 Nov).
Rule in this folder's CLAUDE.md: about one batch deploy a month, never several a day. Days with several: 8 Nov (3), 12 Nov (4), 13 Nov (3), 4 Nov (2).

| Main reason | Deploys | Which |
|---|---|---|
| Prices, discounts, campaigns | 7 | 4 Nov (family back $39.99), 4 Nov b (upgrade key), 5 Nov ($79.99 -50 %), 6 Nov (JING FANG Black Friday), 7 Nov (JF $99, free days internal), 13 Nov eve (-X%, pack sales $2.99), 14 Nov (ADALET -50 %, price block, family room) |
| Store / marketplace links and codes | 4 | 8 Nov 08:05 (Redeem link), 12 Nov 03:30 (affiliates), 12 Nov 12:20 API (Loot Audio codes), 13 Nov eve + 14 Nov (MuseHub badges, counted above) |
| New product or product update content | 4 | 1 Nov (monthly batch: TORNA, 6 packs, panel), 8 Nov 05:00 (AHENK, ADALET on sale), 8 Nov 07:15 (RU-8 1.1 room), 13 Nov 00:55 API (AHENK iOS pianos) |
| Small text: contact, legal | 3 | 12 Nov 19:10 (contact block), 12 Nov eve (footer contact), 13 Nov 17:40 (privacy for iOS apps) |
| Panel features | 1 | 12 Nov 18:30 (live edit of rooms) |

## What the panel can already do without a deploy (src/catalog/data.js, api/catalogSchema.js)
For any plug-in, including the code products (an "Edits" item with the same slug): price, checkout, **launch price + end date**,
**MuseHub link**, release / update date. So the 14 Nov ADALET -50 % and the RU-8 / ADALET MuseHub badges could have been panel edits.
Sample / preset packs: price, checkout, dates.

## What still needs a deploy (and caused most of the deploys above)
- Named offers (`OFFERS`, e.g. Black Friday), standing sales (`SALE_PRICES`), pack sales (`PACK_SALES`), the family price and list price.
- Footer stores / social links, contact block (`CONTACT`), legal text.
- Offer words (`LAUNCH_LABELS`).

## Recommendation
Move the price data into the panel in one change (site + API, one deploy): per product an offer = price, regular, label, start, end
(replaces LAUNCH_*, SALE_PRICES, OFFERS, PACK_SALES and the family constants; `pluginOffer` reads it), plus footer stores and contact
as one "site settings" item. After that 9 of the 18 deploys above (the 7 price deploys and the 2 contact ones) would have been panel
edits; deploys remain for code, legal and new page types.
