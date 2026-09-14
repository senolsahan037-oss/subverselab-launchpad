"""What VERS could not answer — the teaching list.

Run:  python3 Scripts/review_questions.py
"""

import json
import os
from collections import Counter

LOG = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "knowledge", "questions.jsonl")

if not os.path.exists(LOG):
    raise SystemExit("no questions logged yet")

rows = [json.loads(line) for line in open(LOG) if line.strip()]
answered = [r for r in rows if r["answered"]]
missed = [r for r in rows if not r["answered"]]

print(f"{len(rows)} questions — {len(answered)} answered, {len(missed)} handed over\n")

if missed:
    print("HANDED OVER (teach these):")
    for question, count in Counter(r["question"].strip().lower() for r in missed).most_common(30):
        reasons = {r["intent"] for r in missed if r["question"].strip().lower() == question}
        why = next((r for r in reasons if r), None)
        print(f"  {count:3d}x  {question}" + (f"   [{why}]" if why else "   [no intent matched]"))

if answered:
    print("\nintents actually used:")
    for intent, count in Counter(r["intent"] for r in answered).most_common():
        print(f"  {count:3d}x  {intent}")
