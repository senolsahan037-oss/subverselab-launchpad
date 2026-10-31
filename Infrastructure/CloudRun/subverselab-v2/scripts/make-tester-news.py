"""Tester news frame (owner 28 Oct: "tester haberi için daha spesifik bir görsel"): the real selection grid of the tester
programme, every operating system against every DAW the application form offers (src/components/TestersPage.jsx DAWS,
tester/common.jsx OS_LIST), drawn in the brand colours. No numbers: the frame shows the coverage idea, not seat counts.
Run: python3 -I scripts/make-tester-news.py  ->  public/news/testers.webp (1280 x 680)."""
import os, sys
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'public', 'news', 'testers.webp')
INK_GROUND, PANEL, CREAM, GOLD, MUTED = (3, 40, 37), (3, 56, 50), (242, 239, 231), (197, 160, 89), (150, 170, 166)
OS = ['macOS Apple Silicon', 'macOS Intel', 'Windows 11', 'Windows 10']
DAWS = ['Ableton Live', 'FL Studio', 'Logic Pro', 'Cubase', 'Studio One', 'Reaper', 'Pro Tools', 'Bitwig Studio']
FONTS = os.path.join(HERE, '..', 'public', 'fonts')
def font(names, size):
    for n in names:
        for d in (FONTS, '/System/Library/Fonts/Supplemental', '/System/Library/Fonts'):
            p = os.path.join(d, n)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()
HEAD = ['Oswald-Bold.ttf', 'DIN Condensed Bold.ttf', 'Arial Bold.ttf']
BODY = ['Inter-Regular.ttf', 'Arial.ttf']
BOLD = ['Inter-Bold.ttf', 'Arial Bold.ttf']

W, H = 1280, 680
im = Image.new('RGB', (W, H), INK_GROUND)
d = ImageDraw.Draw(im)
d.rounded_rectangle((28, 28, W - 28, H - 28), 22, fill=PANEL, outline=(25, 80, 72), width=2)
d.text((64, 62), 'TESTER SEATS', font=font(HEAD, 22), fill=GOLD)
d.text((64, 92), 'Every system, every DAW', font=font(HEAD, 54), fill=CREAM)
x0, y0, cw, rh = 300, 210, 112, 92
for j, daw in enumerate(DAWS):
    cx = x0 + j * cw + cw // 2
    f = font(BOLD, 15)
    for k, part in enumerate(daw.split(' ', 1)):
        tw = d.textlength(part, font=f)
        d.text((cx - tw / 2, y0 - 50 + k * 19), part, font=f, fill=MUTED)
for i, os_name in enumerate(OS):
    cy = y0 + i * rh + rh // 2
    d.text((64, cy - 11), os_name, font=font(BOLD, 19), fill=CREAM)
    for j in range(len(DAWS)):
        cx = x0 + j * cw + cw // 2
        if os_name.startswith('Windows') and DAWS[j] == 'Logic Pro':   # Logic runs on macOS only
            d.line((cx - 9, cy, cx + 9, cy), fill=(60, 95, 90), width=2)
            continue
        d.rounded_rectangle((cx - 34, cy - 26, cx + 34, cy + 26), 12, outline=GOLD, width=2, fill=(10, 70, 62))
        d.ellipse((cx - 6, cy - 6, cx + 6, cy + 6), fill=GOLD)
d.text((64, H - 78), 'We pick testers so that every system and DAW is covered. Applications are read by hand.', font=font(BODY, 18), fill=MUTED)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
im.save(OUT, 'WEBP', quality=88)
print(OUT, os.path.getsize(OUT))
