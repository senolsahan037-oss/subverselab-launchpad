# Running VERS locally

Two surfaces, one brain. `vers_brain.py` answers; both front ends call it.

## Desktop mascot

```bash
python3 agent/desktop_vers.py
```

or double-click `VERS.command`.

A small dark widget with the five bars sits on top of everything. Drag it to move,
click it to open the dialog, Esc to close.

**Six quick-question buttons** cover what VERS can actually answer — one per rack,
plus plugins, Live version, variations and install. They are built from
`knowledge/products.json`, so adding a preset adds its button. They exist partly
because typing is unreliable here: a borderless (`overrideredirect`) window is
never a "key window" on macOS, so it may not receive keystrokes at all. Focus is
forced on open, but the buttons are what make the thing usable regardless.

If typing matters more than the borderless look, delete the `overrideredirect`
call — VERS gets a normal title bar and the keyboard works. The bars breathe while idle and move
while VERS answers — the same rule as the videos: never idle-still, and movement
in the bars means it is speaking.

**It must be started from your own session** — a Terminal window, Finder, or the
Dock. A process launched from an agent's background shell has no connection to the
window server, so nothing appears on screen even though the process runs. That was
verified rather than assumed: a plain Tk window with no custom flags is equally
invisible when launched that way.

## Website chat

```bash
python3 agent/server.py      # then http://localhost:8765
```

Standard library only, no install. This is the surface that eventually moves to
subverselab.com.

## How VERS gets taught

Every question is appended to `knowledge/questions.jsonl` with whether it could be
answered and which intent matched. The unanswered ones are the to-do list:

```bash
python3 Scripts/review_questions.py
```

To teach it something, either the fact belongs in a product file — change the
preset and re-run `Scripts/build_knowledge.py` — or it is a new kind of question,
which means a new intent in `agent/vers_brain.py`. Never type a product fact
directly into an answer.
