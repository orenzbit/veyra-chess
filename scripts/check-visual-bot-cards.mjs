#!/usr/bin/env node
// Visual check: the bot campaign page does not drown the player in identical locked cards.
// With a new player (one bot open), at 1440x900 and 1280x720:
//  - the open bot keeps its full card (name, Elo, flavour lines);
//  - the next bot to unlock keeps a full-size card that still shows the unlock hint, and stands out from the rest
//    (dashed accent border);
//  - every later locked bot is a compact tile (<= 64px tall) that still says "הבוט נעול", with nothing clipped;
//  - the whole grid of bots is at most 1300px tall (it was ~2700px).
// Usage: npm run build && node scripts/check-visual-bot-cards.mjs   (PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs, PORT=4650)
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const port = Number(process.env.PORT || 4650);
const base = `http://127.0.0.1:${port}/`;
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
    await page.getByRole('button', { name: 'בוטים', exact: true }).first().click();
    await page.waitForSelector('.bot-grid .bot-card.locked');
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.bot-grid .bot-card')];
      const open = cards.filter((c) => !c.classList.contains('locked'));
      const locked = cards.filter((c) => c.classList.contains('locked'));
      const next = locked[0], later = locked.slice(1);
      const vis = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
      const clipped = (c) => [...c.querySelectorAll('b,span,small')].some((e) => vis(e) && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible');
      const cs = (c) => getComputedStyle(c);
      return {
        total: cards.length, open: open.length,
        openH: Math.round(open[0].getBoundingClientRect().height), openLines: [...open[0].querySelectorAll('.bot-meta > *')].filter(vis).length,
        nextH: Math.round(next.getBoundingClientRect().height), nextHint: vis([...next.querySelectorAll('.bot-meta small')].find((s) => s.textContent.includes('נצח את הבוט'))),
        nextBorder: cs(next).borderTopStyle, laterBorder: cs(later[0]).borderTopStyle,
        laterMaxH: Math.round(Math.max(...later.map((c) => c.getBoundingClientRect().height))),
        laterSayLocked: later.every((c) => vis([...c.querySelectorAll('.bot-meta span')].find((s) => s.textContent.includes('הבוט נעול')))),
        clipped: cards.some(clipped),
        gridH: Math.round(document.querySelector('.bot-grid').getBoundingClientRect().height),
      };
    });
    const tag = `${w}x${h}`;
    console.log(tag, JSON.stringify(m));
    check(m.open >= 1 && m.openH >= 120 && m.openLines >= 4, `${tag} the open bot keeps its full card (${m.openH}px, ${m.openLines} lines)`);
    check(m.nextH >= 120 && m.nextHint, `${tag} the next bot to unlock keeps a full card with the unlock hint (${m.nextH}px)`);
    check(m.nextBorder === 'dashed' && m.laterBorder !== 'dashed', `${tag} the next bot to unlock stands out from the later locked bots (${m.nextBorder} vs ${m.laterBorder})`);
    check(m.laterMaxH <= 64, `${tag} later locked bots are compact tiles (tallest ${m.laterMaxH}px <= 64px)`);
    check(m.laterSayLocked, `${tag} every compact tile still says "הבוט נעול"`);
    check(!m.clipped, `${tag} no card text is clipped`);
    check(m.gridH <= 1300, `${tag} the bot grid is at most 1300px tall (${m.gridH}px for ${m.total} bots)`);
    await page.close();
  }
} finally {
  await browser?.close();
  server.kill();
}
console.log(failures ? `${failures} check(s) failed` : 'all checks passed');
process.exit(failures ? 1 : 0);
