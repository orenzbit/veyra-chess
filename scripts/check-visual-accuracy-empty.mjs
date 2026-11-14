#!/usr/bin/env node
// Visual check: the Accuracy ring at the top of game review does not show "0" before any game is analysed.
// "0 Accuracy" on a fresh page reads like a score of zero. At 1440x900 and 1280x720:
//  - on a fresh review page, and after loading a game but before analysing it, the ring shows a muted dash ("—"),
//    drawn lighter than the number would be;
//  - after "נתח משחק" finishes, the ring shows the player's accuracy as a number from 0 to 100, in full ink.
// Usage: npm run build && node scripts/check-visual-accuracy-empty.mjs   (PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs, PORT=4660)
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const port = Number(process.env.PORT || 4660);
const base = `http://127.0.0.1:${port}/`;
const pgn = '[Event "Check"]\n[White "orenzbit"]\n[Black "opponent"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 Nxe4 8. O-O Bxc3 9. d5 Bf6 10. Re1 Ne7 11. Rxe4 d6 12. Bg5 Bxg5 1-0\n';
const server = spawn(process.execPath, ['scripts/local-preview.mjs', '--port', String(port)], { stdio: 'ignore' });
let failures = 0;
const check = (ok, label) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failures++; };
const ring = (page) => page.evaluate(() => {
  const b = document.querySelector('.hero-row .metric-ring b');
  const lum = (c) => { const [r, g, bl] = c.match(/\d+(\.\d+)?/g).map(Number); return 0.299 * r + 0.587 * g + 0.114 * bl; };
  const bg = getComputedStyle(document.querySelector('.hero-row .metric-ring')).backgroundColor;
  // Effective contrast against the ring: colour difference times the element's opacity.
  return { text: b.textContent.trim(), contrast: Math.abs(lum(getComputedStyle(b).color) - lum(bg)) * Number(getComputedStyle(b).opacity) };
});
let browser;
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await delay(200); }
  browser = await chromium.launch();
  for (const [w, h] of [[1440, 900], [1280, 720]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(base, { waitUntil: 'load' });
    await page.getByRole('button', { name: 'סקירה', exact: true }).first().click();
    await page.waitForSelector('.hero-row .metric-ring b');
    const tag = `${w}x${h}`;
    const fresh = await ring(page);
    await page.locator('textarea').first().fill(pgn);
    await page.getByRole('button', { name: 'טען משחק' }).click();
    await page.waitForTimeout(400);
    const loaded = await ring(page);
    await page.getByRole('button', { name: 'נתח משחק' }).click();
    await page.waitForFunction(() => document.querySelector('.panel-title .muted')?.textContent?.includes('הניתוח הסתיים'), null, { timeout: 300000 });
    await page.waitForTimeout(300);
    const done = await ring(page);
    console.log(tag, JSON.stringify({ fresh, loaded, done }));
    check(fresh.text === '—', `${tag} fresh review page: the ring shows "—" (it shows "${fresh.text}")`);
    check(loaded.text === '—', `${tag} game loaded but not analysed: the ring shows "—" (it shows "${loaded.text}")`);
    const n = Number(done.text);
    check(Number.isFinite(n) && n >= 0 && n <= 100 && done.text !== '—', `${tag} after analysis the ring shows the accuracy number (${done.text})`);
    check(fresh.contrast < done.contrast, `${tag} the empty dash is drawn lighter than the number (contrast ${fresh.contrast.toFixed(0)} < ${done.contrast.toFixed(0)})`);
    await page.close();
  }
} finally {
  await browser?.close();
  server.kill();
}
console.log(failures ? `${failures} check(s) failed` : 'all checks passed');
process.exit(failures ? 1 : 0);
