// Phase 1 audit (2026-10-15): screenshots + WCAG contrast for every main route,
// light and dark, 1440 and 375. Read-only: blocks every non-GET /api call
// (page-view beacons) and all analytics so the live counters are not touched.
// Usage: node docs/audit_2026-10-15/audit.mjs http://127.0.0.1:5197 [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import puppeteer from 'puppeteer-core';

const ORIGIN = process.argv[2] || 'http://127.0.0.1:5197';
const OUT = process.argv[3] || new URL('.', import.meta.url).pathname;
const ROOMS = ['kubbe', 'kaset', 'koro', 'yanki', 'hava', 'mihenk', 'tutkal', 'taban', 'alev', 'kiyma', 'adalet', 'seda', 'elek'];
const ALL = ['/', '/plugins', ...ROOMS.map((s) => `/plugins/${s}`), '/account', '/launch', '/learn'];
const ROUTES = process.env.ONLY ? process.env.ONLY.split(',') : ALL;
const THEMES = ['light', 'dark'];
const WIDTHS = process.env.WIDTHS ? process.env.WIDTHS.split(',').map(Number) : [1440, 375];

function measure() {
  const parse = (s) => {
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (top, under) => {
    const a = top.a + under.a * (1 - top.a);
    if (!a) return { r: 0, g: 0, b: 0, a: 0 };
    const mix = (k) => (top[k] * top.a + under[k] * under.a * (1 - top.a)) / a;
    return { r: mix('r'), g: mix('g'), b: mix('b'), a };
  };
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  const sel = (el) => {
    const one = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + [...e.classList].slice(0, 3).map((c) => '.' + c).join('');
    const parts = [one(el)];
    let p = el.parentElement;
    while (p && parts.length < 3 && p !== document.body) { if (p.classList.length || p.id) parts.unshift(one(p)); p = p.parentElement; }
    return parts.join(' > ');
  };
  const out = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('body *')) {
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own) continue;
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height || cs.visibility === 'hidden' || cs.display === 'none') continue;
    let fg = parse(cs.color);
    if (!fg) continue;
    let op = 1;
    let image = null; // 'gradient' | 'url'
    // Each layer is a list of candidate colours: one for a flat background,
    // the opaque stops for a gradient (worst case is reported).
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      op *= Number(s.opacity);
      const b = parse(s.backgroundColor);
      const bi = s.backgroundImage;
      if (bi && bi !== 'none') {
        if (bi.includes('url(')) { image = image || 'url'; }
        const stops = (bi.match(/rgba?\([^)]+\)/g) || []).map(parse).filter((c) => c.a >= 0.5);
        if (stops.length) { image = image === 'url' ? 'url' : 'gradient'; layers.push(stops.map((c) => ({ ...c, a: 1 }))); if (!b || b.a === 0) break; }
      }
      if (b && b.a > 0) layers.push([b]);
      if (b && b.a >= 0.999) break;
    }
    if (op < 0.05) continue;
    // Composite bottom-up for every candidate of the first opaque layer.
    const flatten = (cand) => {
      let bg = { r: 255, g: 255, b: 255, a: 1 };
      for (let i = layers.length - 1; i >= 0; i--) bg = over(i === cand.i ? cand.c : layers[i][0], bg);
      return bg;
    };
    const cands = [];
    layers.forEach((l, i) => { if (l.length > 1) l.forEach((c) => cands.push({ i, c })); });
    if (!cands.length) cands.push({ i: -1, c: null });
    fg = { ...fg, a: fg.a * op };
    let ratio = Infinity, bg = null, fgFlat = null;
    for (const cand of cands) {
      const b2 = flatten(cand);
      const f2 = over(fg, b2);
      const L1 = lum(f2), L2 = lum(b2);
      const r2 = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      if (r2 < ratio) { ratio = r2; bg = b2; fgFlat = f2; }
    }
    const size = parseFloat(cs.fontSize);
    const weight = Number(cs.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    const text = el.textContent.trim().replace(/\s+/g, ' ').slice(0, 50);
    const key = sel(el) + hex(fgFlat) + hex(bg);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ sel: sel(el), text, fg: hex(fgFlat), bg: hex(bg), ratio: Math.round(ratio * 100) / 100, need, size, image, fail: ratio < need });
  }
  return out;
}

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-first-run', '--no-default-browser-check'],
});
mkdirSync(OUT, { recursive: true });
const report = [];
for (const theme of THEMES) {
  for (const width of WIDTHS) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: width < 800 ? 812 : 900, deviceScaleFactor: 1, isMobile: width < 800 });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await page.evaluateOnNewDocument((t) => {
      try { localStorage.setItem('subverselab-consent', 'denied'); if (t === 'dark') localStorage.setItem('subverselab-theme', 'dark'); else localStorage.removeItem('subverselab-theme'); } catch {}
    }, theme);
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const u = req.url();
      if (/google-analytics|googletagmanager|doubleclick/.test(u)) return req.abort();
      if (u.includes('/api/') && req.method() !== 'GET') return req.abort();
      return req.continue();
    });
    for (const route of ROUTES) {
      const name = `${route === '/' ? 'home' : route.slice(1).replace(/\//g, '_')}_${theme}_${width}`;
      try {
        await page.goto(ORIGIN + route, { waitUntil: 'networkidle2', timeout: 45000 });
        await page.evaluate(async () => {
          await document.fonts.ready;
          for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
          // loading="lazy" images: force them and wait, or full-page captures show empty boxes.
          const imgs = [...document.images];
          imgs.forEach((i) => { i.loading = 'eager'; });
          await Promise.race([Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })))), new Promise((r) => setTimeout(r, 8000))]);
          window.scrollTo(0, 0);
        });
        await sleep(700);
        const rows = await page.evaluate(measure);
        const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
        await page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 78, fullPage: true });
        report.push({ route, theme, width, shot: `${name}.jpg`, overflow, rows });
        const fails = rows.filter((r) => r.fail);
        console.log(`${name}: ${rows.length} text elements, ${fails.length} below AA, overflow ${overflow}px`);
      } catch (e) {
        console.log(`${name}: ERROR ${e.message}`);
        report.push({ route, theme, width, error: e.message, rows: [] });
      }
    }
    await page.close();
  }
}
await browser.close();
writeFileSync(`${OUT}/contrast.json`, JSON.stringify(report, null, 1));
