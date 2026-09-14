// Fails the build when any route scrolls sideways at any supported width.
//
// This exists because the site shipped with exactly one media query and nobody
// noticed. At 375 px the header alone ran 309 px past the viewport: everything
// after the first nav link was off-screen with no way to reach it. The bug was
// not subtle and it was not new — it was simply never looked at, because the
// person looking always had a 1440 px window open.
//
// A check that depends on remembering to look is not a check. This one runs on
// every build, so the answer to "did anyone try it on a phone" is yes, always,
// without anyone trying.
//
// puppeteer-core, not puppeteer: it drives the Chrome already on the machine
// rather than downloading a second ~170 MB copy into node_modules. If Chrome is
// missing the check reports that and passes, because a missing local browser is
// a workstation problem and must never be able to block a deploy on its own.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import puppeteer from 'puppeteer-core';

const PORT = 8099;
const ORIGIN = `http://127.0.0.1:${PORT}`;

// 320 is the narrowest phone still in use; 1366 is the most common laptop.
// Everything between them is where the two failure modes live — a nowrap flex
// row, and a grid track with a fixed minmax floor.
const WIDTHS = [320, 375, 414, 768, 1024, 1366];

const ROUTES = ['/', '/learn', '/help', '/tools/sensei', '/tools/synthpulse'];

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].filter(Boolean);

function findChrome() {
  return CHROME_CANDIDATES.find(path => existsSync(path)) || null;
}

// Measured in the page, not inferred from CSS. The only question that matters
// is whether the document is wider than the window it has to fit in.
function measure() {
  const de = document.documentElement;
  const overflow = Math.max(0, Math.round(de.scrollWidth - de.clientWidth));
  if (!overflow) return { overflow, culprits: [] };

  const vw = de.clientWidth;
  const culprits = [];
  for (const el of document.querySelectorAll('body *')) {
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;
    const past = Math.round(rect.right - vw);
    if (past <= 2) continue;
    // Content that scrolls inside its own box is deliberate — a sequencer grid,
    // a wide table. It is only a fault when the document itself grows.
    const style = getComputedStyle(el);
    const scrollsItself = el.scrollWidth > el.clientWidth + 2 && /auto|scroll/.test(style.overflowX);
    if (scrollsItself) continue;
    const cls = typeof el.className === 'string' && el.className
      ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
      : '';
    culprits.push({ selector: el.tagName.toLowerCase() + cls, past, width: Math.round(rect.width) });
  }
  culprits.sort((a, b) => b.past - a.past);
  return { overflow, culprits: culprits.slice(0, 3) };
}

async function waitForServer(attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(ORIGIN, { signal: AbortSignal.timeout(1000) });
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  return false;
}

async function main() {
  const chrome = findChrome();
  if (!chrome) {
    console.log('check-responsive: no local Chrome found — skipping.');
    console.log('  Set CHROME_PATH to run it. A missing browser must not fail a build.');
    return;
  }

  const server = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore'
  });

  let failures = [];
  let browser;
  try {
    if (!await waitForServer()) throw new Error(`server did not start on ${ORIGIN}`);
    browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    for (const route of ROUTES) {
      const results = [];
      for (const width of WIDTHS) {
        await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
        await page.goto(ORIGIN + route, { waitUntil: 'networkidle2', timeout: 30000 });
        // The storefront paints its cards from Firestore after first render.
        await sleep(400);
        const { overflow, culprits } = await page.evaluate(measure);
        results.push(overflow);
        if (overflow > 0) failures.push({ route, width, overflow, culprits });
      }
      const line = results.map((n, i) => `${WIDTHS[i]}:${n}`).join('  ');
      console.log(`  ${overflowMark(results)} ${route.padEnd(20)} ${line}`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }

  if (failures.length) {
    console.error('\ncheck-responsive: horizontal overflow found\n');
    for (const f of failures) {
      console.error(`  ${f.route} at ${f.width}px overflows by ${f.overflow}px`);
      for (const c of f.culprits) {
        console.error(`      ${c.selector} — ${c.width}px wide, ${c.past}px past the viewport`);
      }
    }
    console.error('\n  A nowrap flex row and `minmax(<fixed>, 1fr)` cause almost all of this.');
    console.error('  Use `minmax(min(<fixed>, 100%), 1fr)` and let rows wrap.\n');
    process.exit(1);
  }

  console.log(`check-responsive: ${ROUTES.length} routes clean at ${WIDTHS.join(', ')} px`);
}

const overflowMark = results => (results.some(n => n > 0) ? 'FAIL' : ' ok ');

main().catch((error) => {
  console.error('check-responsive failed to run:', error.message);
  process.exit(1);
});
