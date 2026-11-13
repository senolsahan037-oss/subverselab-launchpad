# Research: the family has no room, discounts look different everywhere (14 Nov 2026)

Owner 14 Nov: "plugin family'nin aile olarak bir ürün odası yok, indirimlerin görseli hâlâ kötü, karmaşa var gibi".
Research only, nothing changed. Looked at in Chrome on localhost:5181 (1440x900, dark theme) and in the source.

## 1. The family has no room
- `/plugins/family` answers the 404 page. The family exists only as the band at the top of /plugins (`FamilyBand.jsx`, `#family`).
- The news item "family" links to `/plugins#family`, not to a room. MuseHub has a bundle page (`bundle/subverselab-plugin-family`); we do not.
- The seven member rooms (KUBBE, KASET, KORO, YANKI, HAVA, MIHENK, TUTKAL) do not mention the family at all: the family line under
  Buy was removed on 28 Oct when the family was retired (`PluginRoom.jsx` header comment), and was not put back when it returned on 4 Nov.
- No sitemap line, no prerendered page, no link preview of its own, no room-level FAQ/requirements for the bundle.

## 2. The family has two "regular" prices on the same line
- Band: `$79.99` struck → `$39.99` `-50%` and next to it "Bought one by one: $115".
- `FAMILY_LIST_PRICE = 79.99` (MuseHub base, 5 Nov) and `FAMILY_SINGLES_TOTAL = 115` (9+9+15+9+12+49+12) are both shown.
  Against $115 the saving is 65 %, against $79.99 it is 50 %: the buyer sees two different reference prices. One must go (owner).

## 3. Four different ways to draw a discount
| Place | Component | Order | -X% | Date line |
|---|---|---|---|---|
| /plugins card | `PluginsPage.jsx` `OfferPrice` | new price large, then struck | gold stamp | "LAUNCH PRICE · until …" under it |
| /plugins family band | `FamilyBand.jsx` | struck first, then price | small plain text | none |
| Product room | `LaunchPrice.jsx` | struck first, small, one gold line | plain text | same line, then the platform text runs on |
| Sample packs | `packs/PackPrice.jsx` | struck first, tiny under the cover | plain text | none |
- The 13 Nov card design (not deployed) is the only one that reads as an offer. In the room (where the buyer decides) the price is a
  small line that runs into "Standalone app, VST3 and AU …" (AHENK: "$49 $29.99 -39% — LAUNCH PRICE UNTIL 1 JANUARY 2027 · Standalone app …").
  A room without an offer (KUBBE, MIHENK) shows "$9" / "$49" as a line above Buy, so offer and no-offer rooms look nearly the same.

## 4. Price data in many places
- Plug-ins: `PRICES`, `LAUNCH_PRICES` + `LAUNCH_ENDS`, `SALE_PRICES`, `OFFERS` (Black Friday), catalogue overrides (`catalog/data.js`
  writes into `LAUNCH_PRICES`), family: `FAMILY_LIST_PRICE`, `FAMILY_SINGLES_TOTAL`, `FAMILY_UPGRADES`. Packs: `PACK_SALES` (separate file).
- Each has its own label word ("LAUNCH PRICE", "Black Friday", sale with no word), its own end-date rule, and its own render.
- Retired machinery still in the code while the family is on sale: `FAMILY_RETIRED = true`, `FAMILY_OFFER_ENDS_AT`, `FAMILY_UNTIL`,
  `LAUNCH` / `LAUNCH2` family texts, the HomeIntro family counter, NotFound's "the family is retired" comment. It works today only
  because `FAMILY_RETIRED` switches the old offer off; anyone reading the code meets two opposite family states.

## 5. Smaller points
- "LAUNCH PRICE" on ADALET, sold at $15 since 8 Nov: a -50 % from 14 Nov is not a launch price. The word should come from the offer.
- End dates differ without a reason a buyer can see: AHENK 1 Jan 2027, ADALET / packs / MuseHub bundle 4 Jan 2027.

## Recommendation (for the owner to decide)
1. One price block used in all four places: new price large, struck regular, one -X% stamp, one line with the offer's own name and end
   date. Fed by one function `offerFor(slug, now)` → `{ price, regular, pct, label, ends }` over all the tables above (and packs).
2. A family room `/plugins/family` on the existing room template: the stack picture, the seven products with one line and a link each,
   the price block, Buy + MuseHub badge, requirements. The band on /plugins and the news link point to it; each member room gets one
   line "Also in the SubverseLab plugin family — $39.99" under Buy.
3. One reference price for the family (owner: $79.99 list or $115 one-by-one).
4. Remove the retired family machinery in the same change.
Site change: local, gate, NEXT DEPLOY; deploy on the owner's go.
