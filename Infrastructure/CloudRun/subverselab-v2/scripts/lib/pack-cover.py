"""Cover for a sample pack (used while the pack has no approved cover of its own).

Called by scripts/import-sample-packs.js:  python3 -I pack-cover.py <spec.json>
spec = {name, tag, kindLine, formatLine, peaks: [0..1, ...], out: '/abs/cover.png', size: 1200}

Owner 17 Oct: the old cover was the plugin product room (screws, nameplate, hazard tape) and every pack looked the same.
Now a store cover: one bold motif drawn from the pack's own snippet peaks (real audio), the pack name large, a small
SUBVERSELAB mark and the kind. Each pack has its own motif + ground (STYLE below; a new pack falls back to its name's
hash). Brand kit colours only (ink, cream, gold; Assets/Brand/_kit/brand.py), no other colour.
"""
import json
import math
import os
import sys
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..', '..', 'Assets', 'Brand', '_kit'))
sys.path.insert(0, KIT)
import brand  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

spec = json.load(open(sys.argv[1]))
OUT_S = int(spec.get('size', 1200))
S = OUT_S * 2                                    # drawn at 2x, scaled down for clean edges
INK = (3, 55, 51)
CREAM = brand.CREAM
GOLD = brand.GOLD

MOTIFS = ['rings', 'sun', 'ridges', 'dots']
# One motif + ground per pack, so no two covers in the store share both (7 packs, 8 combinations).
STYLE = {'Brickyard': ('dots', True), 'Kerbstone': ('ridges', True), 'Stepwell': ('rings', False), 'Lampglass': ('sun', True),
         'Slagworks': ('ridges', False), 'Squall': ('rings', True), 'Lowlight': ('sun', False)}
h = zlib.crc32(spec['name'].encode())
motif, dark = STYLE.get(spec['name'], (MOTIFS[h % len(MOTIFS)], (h >> 3) % 2 == 0))
GROUND, FG, SOFT = (INK, CREAM, (60, 100, 94)) if dark else (CREAM, INK, (210, 205, 190))

peaks = [float(v) for v in (spec.get('peaks') or [])] or [0.5] * 200


def peak_at(frac, width=0.004):
    n = len(peaks)
    a = int(frac * n) % n
    b = max(a + 1, int((frac + width) * n))
    return max(peaks[a:min(b, n)] or [peaks[a]])


img = Image.new('RGB', (S, S), GROUND)
d = ImageDraw.Draw(img)
m = round(S * 0.07)
art_box = (m, m + round(S * 0.07), S - m, round(S * 0.64))   # motif area (top two thirds)
cx, cy = (art_box[0] + art_box[2]) / 2, (art_box[1] + art_box[3]) / 2
R = min(art_box[2] - art_box[0], art_box[3] - art_box[1]) / 2
lw = max(2, S // 500)

if motif == 'rings':
    n = 22
    for i in range(n):
        f = i / n
        r = R * (0.18 + 0.82 * f) * (0.9 + 0.12 * peak_at(f))
        gold = i in (n // 3, 2 * n // 3)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=GOLD if gold else FG, width=lw * (3 if gold else 1))
elif motif == 'sun':
    n = 180
    r0 = R * 0.26
    d.ellipse([cx - r0 * 0.78, cy - r0 * 0.78, cx + r0 * 0.78, cy + r0 * 0.78], fill=GOLD)
    for i in range(n):
        a = 2 * math.pi * i / n - math.pi / 2
        L = r0 + (R - r0) * (0.25 + 0.75 * peak_at(i / n))
        d.line([(cx + r0 * math.cos(a), cy + r0 * math.sin(a)), (cx + L * math.cos(a), cy + L * math.sin(a))], fill=FG, width=lw * 2)
elif motif == 'ridges':
    rows = 24
    x0, x1 = art_box[0], art_box[2]
    top, bot = art_box[1] + R * 0.35, art_box[3]
    pts_n = 160
    for j in range(rows):
        y = top + (bot - top) * j / (rows - 1)
        pts = []
        for k in range(pts_n + 1):
            u = k / pts_n
            env = math.sin(math.pi * u) ** 2                     # tall in the middle, flat at the edges
            v = peak_at((u * 0.5 + j / rows * 0.5) % 1.0, 0.012)
            pts.append((x0 + (x1 - x0) * u, y - env * v * R * 0.26))
        d.polygon(pts + [(x1, bot + R), (x0, bot + R)], fill=GROUND)   # the ridge hides the ones behind it
        gold = j == rows // 2
        d.line(pts, fill=GOLD if gold else FG, width=lw * (3 if gold else 1))
    d.rectangle([0, bot + lw * 2, S, art_box[3] + R], fill=GROUND)
else:  # dots
    cols, rows = 24, 15
    x0, x1, y0, y1 = art_box[0], art_box[2], art_box[1], art_box[3]
    cw, ch = (x1 - x0) / cols, (y1 - y0) / rows
    for j in range(rows):
        for i in range(cols):
            v = peak_at(((i / cols) + j * 0.137) % 1.0)
            level = abs(j - (rows - 1) / 2) / ((rows - 1) / 2)    # 0 centre row .. 1 edge rows
            on = v > level * 0.95
            r = min(cw, ch) * (0.36 if on else 0.12)
            col = GOLD if on and v > 0.92 else (FG if on else SOFT)
            x, y = x0 + cw * (i + 0.5), y0 + ch * (j + 0.5)
            d.ellipse([x - r, y - r, x + r, y + r], fill=col)

# small mark + kind tag, top
f_mark = brand.font('body_bold', round(S * 0.024))
brand.draw_tracked(d, (m, m), 'SUBVERSELAB', f_mark, FG, tracking=round(S * 0.006))
tag = spec['tag'].upper()
tw, _ = brand.text_size(d, tag, f_mark, tracking=round(S * 0.005))
brand.draw_tracked(d, (S - m - tw, m), tag, f_mark, GOLD, tracking=round(S * 0.005))

# pack name, large, bottom; the kind under it
f_name = brand.font('display', round(S * 0.205))
name = spec['name'].upper()
nw, nh = brand.text_size(d, name, f_name)
while nw > S - 2 * m and f_name.size > 40:
    f_name = brand.font('display', f_name.size - 8)
    nw, nh = brand.text_size(d, name, f_name)
f_kind = brand.font('body', round(S * 0.034))
kind = brand.wrap(d, spec['kindLine'], f_kind, S - 2 * m)[:1]
y_kind = S - m - round(f_kind.size * 1.1)
y_name = y_kind - round(S * 0.012) - f_name.size
d.text((m, y_name), name, font=f_name, fill=FG)
if kind:
    d.text((m, y_kind), kind[0], font=f_kind, fill=GOLD if dark else INK)

img.resize((OUT_S, OUT_S), Image.LANCZOS).save(spec['out'])
print(spec['out'], motif, 'ink' if dark else 'cream')
