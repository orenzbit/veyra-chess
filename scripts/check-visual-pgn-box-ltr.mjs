#!/usr/bin/env node
// Visual check: the PGN box on game review shows PGN left to right inside the RTL page.
// Before the fix the box inherited RTL, so a pasted game read right-aligned with its punctuation flipped
// (e.g. "[Event "Live Chess"]" drawn as "[Live Chess" Event"]" at the right edge). At 1440x900 and 1280x720:
//  - with a PGN pasted, the first line is drawn from the box's left edge (ink near the left padding, none at the far right);
//  - with the box empty, the Hebrew placeholder is still drawn from the right edge.
// Reads the real pixels of a screenshot of the box, plus its computed styles.
// Usage: npm run build && node scripts/check-visual-pgn-box-ltr.mjs   (PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs, PORT=4640)
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const port = Number(process.env.PORT || 4640);
const base = `http://127.0.0.1:${port}/`;
const pgn = '[Event "Live Chess"]\n[White "orenzbit"]\n[Black "opponent"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 1-0\n';
const server = spawn(process.execPath, ['scripts/local-preview.mjs', '--port', String(port)], { stdio: 'ignore' });
let failures = 0;
const check = (ok, label) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failures++; };
// Columns of the first text line that hold dark ink, as fractions of the box's inner width.
async function inkSpan(page, box) {
  return page.evaluate(async ({ png, padding }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const y0 = padding, y1 = Math.min(img.height, padding + 18);
    const data = g.getImageData(0, y0, img.width, y1 - y0).data;
    // The box's own background, read inside its padding; text is any pixel clearly different from it (light or dark theme).
    const bg = g.getImageData(padding, Math.max(2, padding - 6), 1, 1).data;
    let min = Infinity, max = -Infinity;
    for (let y = 0; y < y1 - y0; y++) for (let x = padding; x < img.width - padding; x++) {
      const i = (y * img.width + x) * 4;
      const diff = Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]);
      if (diff > 90) { min = Math.min(min, x); max = Math.max(max, x); }
    }
    const inner = img.width - 2 * padding;
    return min === Infinity ? null : { left: (min - padding) / inner, right: (max - padding) / inner };
  }, box);
}
let browser;
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await delay(200); }
  browser = await chromium.launch();
  for (const [w, h] of [[1440, 900], [1280, 720]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(base, { waitUntil: 'load' });
    await page.getByRole('button', { name: 'סקירה', exact: true }).first().click();
    const ta = page.locator('.import-grid textarea').first();
    await ta.waitFor();
    const tag = `${w}x${h}`;
    const padding = await ta.evaluate((e) => Math.ceil(parseFloat(getComputedStyle(e).paddingTop)) + 1);
    const shoot = async () => (await ta.screenshot()).toString('base64');
    const empty = await inkSpan(page, { png: await shoot(), padding });
    await ta.fill(pgn);
    await ta.evaluate((e) => { e.blur(); e.scrollTop = 0; });
    const full = await inkSpan(page, { png: await shoot(), padding });
    console.log(tag, JSON.stringify({ placeholder: empty, pgnFirstLine: full }));
    check(!!full && full.left < 0.05, `${tag} the pasted PGN starts at the box's left edge (ink from ${full ? (full.left * 100).toFixed(1) : '-'}% of the width)`);
    check(!!full && full.right < 0.6, `${tag} the first PGN line does not run to the right edge (ink to ${full ? (full.right * 100).toFixed(1) : '-'}%)`);
    check(!!empty && empty.right > 0.9 && empty.left > 0.5, `${tag} the Hebrew placeholder stays right-aligned (ink ${empty ? (empty.left * 100).toFixed(1) + '-' + (empty.right * 100).toFixed(1) : '-'}%)`);
    await page.close();
  }
} finally {
  await browser?.close();
  server.kill();
}
console.log(failures ? `${failures} check(s) failed` : 'all checks passed');
process.exit(failures ? 1 : 0);
