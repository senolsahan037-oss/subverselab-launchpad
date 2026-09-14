"""VERS on the desktop — a small device that sits there and answers when clicked.

No server, no browser, no install: this imports the brain directly, so the same
grounded answers and the same question log apply. `agent/server.py` stays for the
website surface later; this is the one that runs while you work.

The window is deliberately a small dark object rather than a floating cartoon.
VERS is hardware — a machined housing with a teal light channel — so a compact
dark widget with five lit bars is the character, not a compromise for the desktop.

Run:  python3 agent/desktop_vers.py
Drag to move it. Click the bars to open and close the dialog. Esc closes.
"""

import math
import os
import queue
import sys
import threading
import tkinter as tk

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vers_brain import answer, load  # noqa: E402


def quick_questions():
    """The buttons are built from the products, so they cannot go stale.

    They also do a second job: they show a visitor what VERS can actually answer,
    which is more useful than an empty field that invites questions it will only
    hand over.
    """
    chips = []
    for product in load():
        chips.append((product["name"], f"what is in {product['name']}"))
    chips += [
        ("Plugins?", "do i need any plugins"),
        ("Live version", "which ableton version do i need"),
        ("Variations", "what is a macro variation"),
        ("Install", "how do i install it"),
    ]
    return chips

BG = "#0a0c0f"
PANEL = "#12151a"
LINE = "#1e232b"
TEAL = "#05c7d1"
GOLD = "#d9a72e"
TEXT = "#c9d3da"
DIM = "#6d7a85"

# The favicon's proportions, so the desktop VERS is the same character.
BAR_HEIGHTS = (15, 32, 47, 32, 15)
COLLAPSED = (150, 74)
EXPANDED = (380, 540)
HEADER_H = 74        # the bars strip; the rest is conversation
PROMPT = "Ask about a rack…"


class DesktopVers:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("VERS")
        self.root.configure(bg=BG)
        self.root.geometry(f"{COLLAPSED[0]}x{COLLAPSED[1]}+80+120")
        # On macOS, setting overrideredirect before the window is mapped leaves it
        # never drawn: the process runs and nothing appears. Map first, then strip
        # the title bar, then raise it.
        self.root.update_idletasks()
        self.root.deiconify()
        self.root.update()
        self.root.overrideredirect(True)          # no title bar: it is an object
        self.root.attributes("-topmost", True)
        self.root.lift()

        self.expanded = False
        self.phase = 0.0
        self.speaking = False
        self.replies = queue.Queue()

        self.canvas = tk.Canvas(self.root, width=COLLAPSED[0], height=HEADER_H,
                                bg=BG, highlightthickness=1,
                                highlightbackground=LINE, cursor="hand2")
        self.canvas.pack(fill="x")
        self.bars = [self.canvas.create_rectangle(0, 0, 0, 0, fill=TEAL, width=0)
                     for _ in BAR_HEIGHTS]

        self.panel = tk.Frame(self.root, bg=BG)
        self.log = tk.Text(self.panel, bg=PANEL, fg=TEXT, bd=0, wrap="word",
                           font=("Helvetica", 12), padx=12, pady=10,
                           height=15, state="disabled")
        self.log.pack(fill="both", expand=True, padx=8, pady=(0, 6))
        self.log.tag_configure("you", foreground=DIM, spacing1=8)
        self.log.tag_configure("vers", foreground=TEXT, spacing1=4, spacing3=6)
        self.log.tag_configure("handover", foreground=GOLD, spacing1=4, spacing3=6)

        chips = tk.Frame(self.panel, bg=BG)
        chips.pack(fill="x", padx=8, pady=(0, 8))
        row = tk.Frame(chips, bg=BG)
        row.pack(fill="x")
        for index, (label, question) in enumerate(quick_questions()):
            if index and index % 2 == 0:
                row = tk.Frame(chips, bg=BG)
                row.pack(fill="x", pady=(5, 0))
            tk.Button(row, text=label, command=lambda q=question: self.ask_text(q),
                      bg=PANEL, fg=TEXT, activebackground=TEAL,
                      activeforeground="#04191b", relief="flat", bd=0,
                      highlightthickness=0, font=("Helvetica", 11),
                      padx=10, pady=6, cursor="hand2").pack(side="left", padx=(0, 5))

        field = tk.Frame(self.panel, bg=TEAL)          # a 1px teal rule as the border
        field.pack(fill="x", padx=8, pady=(0, 10))
        self.entry = tk.Entry(field, bg=PANEL, fg=DIM, bd=0,
                              insertbackground=TEAL, font=("Helvetica", 12))
        self.entry.pack(fill="x", padx=1, pady=1, ipady=8, ipadx=8)
        self.entry.insert(0, PROMPT)
        self.entry.bind("<Return>", self.ask)
        self.entry.bind("<FocusIn>", self.clear_prompt)
        self.entry.bind("<FocusOut>", self.restore_prompt)

        # Dragging: the window has no title bar, so it moves by its own body.
        for widget in (self.canvas,):
            widget.bind("<Button-1>", self.press)
            widget.bind("<B1-Motion>", self.drag)
            widget.bind("<ButtonRelease-1>", self.release)
        self.root.bind("<Escape>", lambda _: self.collapse())

        self.say("I am VERS. Ask about a rack.", False)
        self.tick()
        self.pump()

    def clear_prompt(self, _=None):
        if self.entry.get() == PROMPT:
            self.entry.delete(0, "end")
        self.entry.config(fg=TEXT)

    def restore_prompt(self, _=None):
        if not self.entry.get().strip():
            self.entry.delete(0, "end")
            self.entry.insert(0, PROMPT)
            self.entry.config(fg=DIM)

    # -- window ------------------------------------------------------------
    def press(self, event):
        self._start = (event.x_root, event.y_root)
        self._origin = (self.root.winfo_x(), self.root.winfo_y())
        self._moved = False

    def drag(self, event):
        dx = event.x_root - self._start[0]
        dy = event.y_root - self._start[1]
        if abs(dx) > 3 or abs(dy) > 3:
            self._moved = True
        self.root.geometry(f"+{self._origin[0] + dx}+{self._origin[1] + dy}")

    def release(self, _):
        # A drag must not count as a click, or VERS opens every time it is moved.
        if not self._moved:
            self.toggle()

    def toggle(self):
        self.collapse() if self.expanded else self.expand()

    def expand(self):
        self.expanded = True
        self.root.geometry(f"{EXPANDED[0]}x{EXPANDED[1]}")
        self.canvas.config(width=EXPANDED[0])
        self.panel.pack(fill="both", expand=True)
        # A borderless (overrideredirect) window is not a "key window" on macOS,
        # so it never receives keystrokes and the field looks dead. Forcing focus
        # is the only way to type into it — and if it still refuses on some
        # machines, the quick-question buttons keep it fully usable.
        self.root.focus_force()
        self.entry.focus_force()

    def collapse(self):
        self.expanded = False
        self.panel.pack_forget()
        self.canvas.config(width=COLLAPSED[0])
        self.root.geometry(f"{COLLAPSED[0]}x{COLLAPSED[1]}")

    # -- the bars ----------------------------------------------------------
    def tick(self):
        width = EXPANDED[0] if self.expanded else COLLAPSED[0]
        centre_y = HEADER_H / 2
        bar_w, gap = 7, 6
        total = len(BAR_HEIGHTS) * bar_w + (len(BAR_HEIGHTS) - 1) * gap
        x = (width - total) / 2
        self.phase += 0.16

        for index, rect in enumerate(self.bars):
            base = BAR_HEIGHTS[index] * 0.62
            if self.speaking:
                # Speaking moves every bar differently, the way a meter does.
                amount = 0.55 + 0.85 * abs(math.sin(self.phase * (1.7 + index * 0.4)))
            else:
                # Never idle-still: a slow breath, centre-weighted.
                amount = 1.0 + 0.12 * math.sin(self.phase * 0.5 + index * 0.6)
            half = max(3, base * amount) / 2
            left = x + index * (bar_w + gap)
            self.canvas.coords(rect, left, centre_y - half, left + bar_w, centre_y + half)

        self.root.after(60, self.tick)

    # -- talking -----------------------------------------------------------
    def say(self, text, handover):
        self.log.config(state="normal")
        self.log.insert("end", text + "\n", "handover" if handover else "vers")
        self.log.see("end")
        self.log.config(state="disabled")

    def ask(self, _=None):
        question = self.entry.get().strip()
        if not question or question == PROMPT:
            return
        self.entry.delete(0, "end")
        self.ask_text(question)

    def ask_text(self, question):
        """Used by the buttons and by the entry — one path, so both behave alike."""
        self.log.config(state="normal")
        self.log.insert("end", "› " + question + "\n", "you")
        self.log.see("end")
        self.log.config(state="disabled")
        self.speaking = True
        # The brain reads files; keep it off the UI thread so the bars keep moving.
        threading.Thread(target=self._answer, args=(question,), daemon=True).start()

    def _answer(self, question):
        try:
            text, answered, _intent = answer(question)
        except Exception as error:
            text, answered = f"Something broke reading the knowledge base: {error}", False
        self.replies.put((text, answered))

    def pump(self):
        try:
            while True:
                text, answered = self.replies.get_nowait()
                self.speaking = False
                self.say(text, not answered)
        except queue.Empty:
            pass
        self.root.after(80, self.pump)

    def run(self):
        self.root.mainloop()


def bring_to_front():
    """A plain python process starts behind everything on macOS."""
    if sys.platform != "darwin":
        return
    import subprocess
    subprocess.run(["osascript", "-e",
                    'tell application "System Events" to set frontmost of the '
                    'first process whose unix id is %d to true' % os.getpid()],
                   capture_output=True)


if __name__ == "__main__":
    app = DesktopVers()
    app.root.after(200, bring_to_front)
    app.run()
