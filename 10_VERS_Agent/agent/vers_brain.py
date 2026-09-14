"""VERS's answering brain — grounded, and unable to invent.

There is no local LLM on this machine and no API key for one, but that constraint
pushed the design somewhere better than it would have gone anyway: **facts come
from files, never from a model.** Every sentence VERS says about a product is
composed here out of `knowledge/products.json`, which is itself generated from the
`.adg` files. There is no path by which a feature can be made up.

If a model is added later it goes *on top* as a phrasing layer over facts already
retrieved — never as the source of them.

The other half of the job is knowing when to stop. Anything outside the knowledge
base returns a hand-over, and the question is logged. That log is how VERS gets
taught: unanswered questions accumulate, a human answers them, the intents grow.
"""

import json
import os
import re
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KNOWLEDGE = os.path.join(ROOT, "knowledge", "products.json")
QUESTION_LOG = os.path.join(ROOT, "knowledge", "questions.jsonl")

HANDOVER = ("I do not know that one. Şenol will answer it — "
            "write to us and it gets a real reply rather than a guess.")

# Subjects VERS must never answer even if it could guess. From VERS_AGENT.md.
HUMAN_ONLY = {
    "price": ("price", "pricing", "cost", "how much", "ücret", "fiyat", "buy",
              "purchase", "refund", "licence", "license", "discount"),
    "roadmap": ("roadmap", "when will", "release date", "coming soon", "next version",
                "ne zaman", "upcoming"),
    "other product": ("serum", "fabfilter", "waves", "izotope", "logic", "fl studio",
                      "cubase", "pro tools", "reaper", "studio one"),
}


def load():
    with open(KNOWLEDGE) as handle:
        return json.load(handle)["products"]


def _find(products, text):
    """Which product is being asked about, if any."""
    low = text.lower()
    for product in products:
        if product["name"].lower() in low:
            return product
        # tolerate partial names: "percussion", "drum buss"
        first = product["name"].split()[0].lower()
        if len(first) > 4 and first in low:
            return product
    return None


def _chain_line(product):
    return " → ".join(product["chain"])


def _describe(product):
    return (f"{product['name']} is an {product['kind']}: {_chain_line(product)}. "
            f"{product['macro_count']} macros, {product['macro_variations']} saved "
            f"macro variations. Built in {product['made_with']}.")


# (matchers, answer). Order matters: the first match wins, so put the specific
# questions above the general ones.
def build_intents(products):
    names = ", ".join(p["name"] for p in products)

    def all_products(_):
        return f"Two racks right now: {names}. Ask about either by name."

    def plugins(_):
        return ("No third-party plugins and no Max for Live. Every device in every "
                "rack ships with Ableton Live, which is why the download works on "
                "your machine and not only on ours.")

    def version(text):
        product = _find(products, text)
        if product:
            return (f"{product['name']} was built in {product['made_with']}. "
                    f"It will not open in a Live older than that.")
        return ("; ".join(f"{p['name']}: {p['made_with']}" for p in products)
                + ". A rack will not open in a Live older than the one that saved it.")

    def chain(text):
        product = _find(products, text)
        if not product:
            return None
        return f"{product['name']}: {_chain_line(product)}."

    def macros(text):
        product = _find(products, text)
        if not product:
            return None
        return (f"{product['name']} has {product['macro_count']} macros and "
                f"{product['macro_variations']} saved macro variations.")

    def variations(_):
        return ("A macro variation is a saved position of all eight macros at once. "
                "Switching between them gives a different treatment of the same "
                "material without touching a knob.")

    def install(_):
        return ("Drop the .adg anywhere in Live's browser, or into your User "
                "Library, then drag it onto an audio track.")

    def what_is_vers(_):
        return ("I am VERS, the voice of SubverseLab. I answer what is readable out "
                "of the products themselves, and hand over what is not.")

    def describe(text):
        product = _find(products, text)
        return _describe(product) if product else None

    return [
        (("what is vers", "who are you", "are you a bot", "are you human", "kimsin"),
         what_is_vers),
        (("max for live", "m4l", "third party", "third-party", "plugin", "plugins",
          "eklenti"), plugins),
        (("which version", "what version", "live version", "ableton version",
          "compatible", "sürüm", "hangi ableton"), version),
        (("what is in", "what's in", "chain", "devices", "signal", "içinde ne",
          "zincir"), chain),
        (("how many macro", "macro count", "macros", "makro"), macros),
        (("variation", "snapshot", "varyasyon"), variations),
        (("install", "how do i use", "where do i put", "import", "kurulum",
          "nasıl yükle"), install),
        (("what racks", "what products", "what do you sell", "what do you have",
          "list", "neler var"), all_products),
        (("what is", "tell me about", "explain", "nedir", "anlat"), describe),
    ]


def log_question(question, answered, matched):
    os.makedirs(os.path.dirname(QUESTION_LOG), exist_ok=True)
    with open(QUESTION_LOG, "a") as handle:
        handle.write(json.dumps({
            "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "question": question,
            "answered": answered,
            "intent": matched,
        }) + "\n")


def answer(question):
    """Return (text, answered, intent). Never invents; logs everything."""
    products = load()
    text = question.strip()
    low = text.lower()

    for subject, needles in HUMAN_ONLY.items():
        if any(n in low for n in needles):
            log_question(text, False, f"human-only:{subject}")
            return HANDOVER, False, f"human-only:{subject}"

    for needles, handler in build_intents(products):
        if any(n in low for n in needles):
            result = handler(text)
            if result:
                name = handler.__name__
                log_question(text, True, name)
                return result, True, name

    log_question(text, False, None)
    return HANDOVER, False, None
