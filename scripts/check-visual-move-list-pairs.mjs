#!/usr/bin/env node
// Visual check: the game-review move list reads like a score sheet.
// After a game is loaded and analysed, at 1440x900 and 1280x720:
//  - White's move and Black's reply sit on the same row (1. e4 | e5), White first in reading order (right side, RTL);
//  - the next move number starts a new row;
//  - each move's classification mark sits right next to the move (not at the far end of a wide row);
//  - the notation reads left to right inside the RTL page ("9. Nxf6+", not "+Nxf6 .9");
//  - at least 10 full moves (20 half-moves) are visible in the list without scrolling it.
// Usage: npm run build && node scripts/check-visual-move-list-pairs.mjs   (PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs, PORT=4620, PGN_FILE=...)
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const port = Number(process.env.PORT || 4620);
const base = `http://127.0.0.1:${port}/`;
// A legal 26-move game (Italian opening), written for this check; any PGN with 20+ moves works.
const pgn = process.env.PGN_FILE ? readFileSync(process.env.PGN_FILE, 'utf8') : `[Event "Live Chess"]
[White "orenzbit"]
[Black "opponent"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 Nxe4 8. O-O Bxc3 9. d5 Bf6 10. Re1 Ne7 11. Rxe4 d6 12. Bg5 Bxg5 13. Nxg5 h6 14. Qe2 hxg5 15. Re1 Be6 16. dxe6 f6 17. Re3 c6 18. Rh3 Rxh3 19. gxh3 g6 20. Qf3 Qa5 21. Rd1 Qf5 22. Qxf5 Nxf5 23. Bd3 Ke7 24. Bxf5 gxf5 25. Rxd6 Kxd6 26. e7 Kxe7 1-0`;
const server = spawn(process.execPath, ['scripts/local-preview.mjs', '--port', String(port)], { stdio: 'ignore' });
let failures = 0;
const check = (ok, label) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failures++; };
let browser;
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(base)).ok) break; } catch {} await delay(200); }
  browser = await chromium.launch();
  for (const [w, h] of [[1440, 900], [1280, 720]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(base, { waitUntil: 'load' });
    await page.getByRole('button', { name: 'סקירה', exact: true }).first().click();
    await page.locator('textarea').first().fill(pgn);
    await page.getByRole('button', { name: 'טען משחק' }).click();
    await page.getByRole('button', { name: 'נתח משחק' }).click();
    await page.waitForFunction(() => document.querySelector('.panel-title .muted')?.textContent?.includes('הניתוח הסתיים'), null, { timeout: 300000 });
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const items = [...document.querySelectorAll('.moves-list > .move-item')];
      const list = document.querySelector('.moves-list').getBoundingClientRect();
      const rect = (e) => e.getBoundingClientRect();
      const gap = items.slice(0, 20).map((it) => {
        const label = it.querySelector('.move-label > span');
        const badge = it.querySelector('.classification-icon');
        if (!label || !badge) return null;
        // In RTL the badge follows the move to its left: the gap is label.left - badge.right.
        const range = document.createRange(); range.selectNodeContents(label); const t = range.getBoundingClientRect();
        const b = rect(badge);
        return Math.round(Math.max(t.left - b.right, b.left - t.right));
      }).filter((g) => g != null);
      // "9. Nxf6+" must read left-to-right: the move number is drawn to the left of the move (also for "... e5").
      const ltr = items.slice(0, 20).every((it) => {
        const span = it.querySelector('.move-label > span'); const txt = span?.firstChild; if (!txt || txt.nodeType !== 3) return false;
        const s = txt.textContent; const k = s.search(/[A-Za-z]/); if (k <= 0) return false;
        const a = document.createRange(); a.setStart(txt, 0); a.setEnd(txt, 1);
        const z = document.createRange(); z.setStart(txt, k); z.setEnd(txt, k + 1);
        return a.getBoundingClientRect().left < z.getBoundingClientRect().left;
      });
      const visible = items.filter((it) => { const r = rect(it); return r.top >= list.top - 1 && r.bottom <= list.bottom + 1; }).length;
      return { ltr, n: items.length, r0: rect(items[0]), r1: rect(items[1]), r2: rect(items[2]), maxGap: Math.max(...gap), gaps: gap.length, visible, overflow: items.some((it) => it.scrollWidth > it.clientWidth + 1) };
    });
    const tag = `${w}x${h}`;
    console.log(tag, JSON.stringify({ moves: m.n, visible: m.visible, maxGapToMark: m.maxGap, row1: [Math.round(m.r0.top), Math.round(m.r1.top)], row2: Math.round(m.r2.top) }));
    check(Math.abs(m.r0.top - m.r1.top) < 2, `${tag} 1. White's move and Black's reply are on the same row`);
    check(m.r0.left > m.r1.left, `${tag} White's move comes first in reading order (right, RTL)`);
    check(m.r2.top >= m.r0.bottom - 1, `${tag} move 2 starts a new row`);
    check(m.gaps >= 10 && m.maxGap <= 16, `${tag} each move's mark sits next to the move (largest gap ${m.maxGap}px <= 16px, ${m.gaps} marks measured)`);
    check(m.visible >= 20, `${tag} at least 10 full moves visible without scrolling the list (${m.visible} half-moves)`);
    check(m.ltr, `${tag} move notation reads left to right ("9. Nxf6+", not "+Nxf6 .9")`);
    check(!m.overflow, `${tag} no move is cut off inside its cell`);
    await page.close();
  }
} finally {
  await browser?.close();
  server.kill();
}
console.log(failures ? `${failures} check(s) failed` : 'all checks passed');
process.exit(failures ? 1 : 0);
