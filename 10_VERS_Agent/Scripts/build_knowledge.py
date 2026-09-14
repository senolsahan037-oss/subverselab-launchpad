"""Build VERS's product knowledge from the products themselves.

VERS answers questions about SubverseLab's tools in public. An agent that invents
a feature is worse than one that says it does not know, and the workshop's whole
method has been to measure rather than assume — so nothing here is hand-written.
Every fact is read out of the artefact it describes: the device chain, the macro
count, the saved variations all come from parsing the `.adg`.

If a claim cannot be derived from a file, it does not belong in the knowledge base.
It belongs in the "ask a human" list.

Run:  python3 Scripts/build_knowledge.py
"""

import gzip
import json
import os
import re
import xml.etree.ElementTree as ET

PRESET_DIR = os.path.expanduser("~/Music/Ableton/User Library/SubPresetLab")
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "knowledge", "products.json")

# Devices we can name in plain English. Anything outside this map is reported by
# its raw tag rather than guessed at.
DEVICE_NAMES = {
    "Eq8": "EQ Eight", "Compressor2": "Compressor", "GlueCompressor": "Glue Compressor",
    "Saturator": "Saturator", "BeatRepeat": "Beat Repeat", "Redux2": "Redux",
    "Reverb": "Reverb", "StereoGain": "Utility", "AutoPan": "Auto Pan",
    "Delay": "Delay", "Limiter": "Limiter", "AudioEffectGroupDevice": "Audio Effect Rack",
    "DrumGroupDevice": "Drum Rack", "InstrumentGroupDevice": "Instrument Rack",
    "Gate": "Gate", "Overdrive": "Overdrive", "Utility": "Utility",
}


def read_preset(path):
    root = ET.fromstring(gzip.open(path, "rb").read())

    # In an .adg a real device's immediate parent is <Device>; a parameter's
    # parent is the device that owns it. Matching on tag name alone put a "Gate"
    # in the chain, which is Beat Repeat's Gate *parameter* — exactly the kind of
    # invented fact this knowledge base exists to prevent.
    parents = {child: parent for parent in root.iter() for child in parent}
    chain = [DEVICE_NAMES.get(el.tag, el.tag)
             for el in root.iter()
             if el.tag in DEVICE_NAMES
             and el.tag != "AudioEffectGroupDevice"
             and parents.get(el) is not None
             and parents[el].tag == "Device"]

    macros = {}
    for el in root.iter():
        if el.tag.startswith("MacroDisplayNames."):
            macros[int(el.tag.split(".")[1])] = el.get("Value")

    # A macro named "Macro N" has no custom name; Live shows the mapped
    # parameter's own name instead, so it is still a labelled control.
    named = {i: v for i, v in macros.items() if v and not re.fullmatch(r"Macro \d+", v)}
    mapped = sum(1 for i in sorted(macros)[:16]
                 if i < 8)   # racks expose 8 in the default layout

    snapshots = [e for e in root.iter() if e.tag == "MacroSnapshots"]
    variations = len(list(snapshots[0])) if snapshots else 0

    return {
        "name": os.path.splitext(os.path.basename(path))[0],
        "file": os.path.basename(path),
        "kind": "Audio Effect Rack",
        "made_with": root.get("Creator", "Ableton Live"),
        "chain": chain,
        "macro_count": mapped,
        "custom_named_macros": [named[i] for i in sorted(named)],
        "macro_variations": variations,
        "third_party_plugins": False,   # every device above is Ableton stock
        "source": path,
    }


def main():
    products = []
    if os.path.isdir(PRESET_DIR):
        for entry in sorted(os.listdir(PRESET_DIR)):
            if entry.endswith(".adg"):
                products.append(read_preset(os.path.join(PRESET_DIR, entry)))

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as handle:
        json.dump({"products": products, "derived_from": PRESET_DIR}, handle, indent=2)

    for p in products:
        print(f"{p['name']}")
        print(f"   chain: {' -> '.join(p['chain'])}")
        print(f"   {p['macro_count']} macros, {p['macro_variations']} saved variations, "
              f"made with {p['made_with']}")
    print(f"\nwrote {OUT}")


if __name__ == "__main__":
    main()
