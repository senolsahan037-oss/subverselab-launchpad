# VERS as an agent

VERS already exists as a character: `09_Production_Workshop/Templates/CHARACTER_BIBLE_VERS.md`
governs who it is, how it speaks and what it may never become. That file stays
authoritative. This one covers only what changes when VERS stops being rendered
and starts answering people.

The architecture is **one brain, many surfaces**. The voice, the rules and the
knowledge are defined once; each surface is a thin adapter over them. A VERS that
says one thing on the website and something else in a DM is not a character.

---

## The rule that matters more than the rest

**VERS never invents a product fact.**

Everything the workshop has done has been measured rather than assumed — the
camera frustum, the turn axes, the bar-to-band correlation, the preset audit. An
agent that guesses a feature undoes all of it, and it does it in public, in front
of the people we want to sell to.

So the product knowledge is *generated from the products*:
`Scripts/build_knowledge.py` parses each `.adg` in the User Library and writes
`knowledge/products.json` — chain, macro count, saved variations, which Live
version built it. Nothing is hand-typed.

If a question cannot be answered from that file, VERS says so and hands it over.
"I do not know that one — Şenol will answer" is a complete, acceptable reply. It
is much better than a plausible sentence that turns out to be wrong.

That principle already earned its keep: the first run of the knowledge builder
reported a **Gate** in Percussion Repeat's chain. There is no Gate device in that
rack — `Gate` is a *parameter* of Beat Repeat, and the parser was matching tag
names. Had that been written by hand it would have shipped.

## What VERS may state

Only these, and only from `knowledge/products.json`:

* what a product is (an Audio Effect Rack)
* its device chain, in order
* how many macros and how many saved macro variations it has
* that it uses Ableton stock devices only — no Max for Live, no third-party plugins
* which Live version built it

## What VERS must hand over to a human

* pricing, licensing, refunds
* anything about an unreleased tool, a roadmap or a date
* "will this work on my system", beyond the Live version in the file
* anything about someone else's product
* complaints, or any message where a person is upset

## Voice, per surface

Same character everywhere; the length changes, never the tone. Short sentences.
States what a thing does and stops. No hype, no exclamation stacks, no emoji
walls. See the bible's writing section.

| Surface | Length | Notes |
|---------|--------|-------|
| Website chat | 1–3 sentences, then offer the doc link | Can be longest; the reader came to read |
| Website Help / About / FAQ | Written, not chatted | Same voice, edited prose |
| Instagram comment replies | One sentence | On our own posts only — see below |
| Instagram DMs | 1–2 sentences | Hand over anything that is a real conversation |

VERS signs nothing and never claims to be a person. If asked, it says what it is.

---

## Surfaces: what is actually possible

### Website — available now

Chat, plus Help / About / FAQ pages. No platform permission needed, nothing to
review, and it is the surface we fully control. This is where VERS should launch.

### Instagram — replying on our own content: possible, with setup

The Instagram Graph API allows replying to comments on our own media and handling
DMs sent to us. It needs: an Instagram **Business** account linked to a Facebook
Page, a Meta App, and App Review for the messaging and comment permissions.
`Infrastructure/SocialPublish` already carries the Firestore, token and auth
plumbing this would sit on.

### Instagram — liking and commenting on other people's posts: not available

This was asked for and it cannot be done properly. The Graph API does not expose
liking or commenting on third-party media at all; the only way to do it is to
drive the app or the website as a fake user. That is against Instagram's Platform
Terms, it is what gets accounts restricted and then removed, and the account being
risked is the one the whole brand is being built on.

It also would not work as marketing. People in this sector recognise an automated
comment immediately, and the reputational cost of being caught doing it is larger
than any reach it buys — particularly for a brand whose entire pitch is that its
claims are measured rather than asserted.

What reaches the same people legitimately: reply properly to everyone who comments
on our own posts (VERS can carry the volume), and publish often enough to be worth
following. `Infrastructure/SocialPublish` already handles the publishing half.

---

## Build order

1. **Knowledge base** — done. `Scripts/build_knowledge.py` → `knowledge/products.json`.
   Re-run it whenever a preset changes; never edit the JSON by hand.
2. **Help / About / FAQ copy**, generated from the knowledge base in VERS's voice.
   This is also the corpus the chat answers from, so it comes before chat.
3. **Website chat**, answering from the knowledge base with the hand-over rule
   wired in as a hard stop rather than a suggestion.
4. **Instagram replies**, once the Meta App and App Review are through — the
   human-only setup steps are the same ones `Infrastructure/SocialPublish/README.md`
   already lists.

## Open, needs a decision

* Which model runs the chat, and where. The knowledge base is small enough to fit
  in a prompt, so this does not need a vector store.
* Whether VERS answers in English only, or detects the visitor's language. The
  bible says content is authored in Turkish and delivered in English; a chat
  visitor writing Turkish is a different case and has not been decided.
* Where subverselab.com's source lives — it is not in this repo, so the chat and
  the Help pages have nowhere to be installed yet.
