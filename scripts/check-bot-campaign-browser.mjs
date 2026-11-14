// Browser check for the bot campaign (not part of check:release: it needs Playwright + Chromium installed).
// Plays a real game against the first bot in the local preview, wins it, leaves WITHOUT opening the review,
// and checks that the next bot unlocked, the game was saved to the account, and the game-over panel showed.
// Usage: npm run build && node scripts/check-bot-campaign-browser.mjs [--shots=prefix]   (PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs)
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const PORT = Number(process.env.PREVIEW_PORT || 4187);
const base = `http://127.0.0.1:${PORT}`;
const shots = (process.argv.find(a => a.startsWith('--shots=')) || '').slice(8);
const vw = Number(process.env.VW || 1280), vh = Number(process.env.VH || 720);
const server = process.env.PREVIEW_EXTERNAL ? null : spawn(process.execPath, ['scripts/local-preview.mjs', '--port', String(PORT)], { stdio: 'ignore' });
let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${ok ? '' : ' ' + detail}`); if (!ok) failed++; };
const browser = await chromium.launch();
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(base + '/')).ok) break; } catch {} await delay(200); }
  const page = await browser.newPage({ viewport: { width: vw, height: vh } });
  page.on('dialog', d => d.accept());
  await page.goto(base + '/');
  await page.getByRole('button', { name: 'בוטים', exact: true }).first().click();
  await page.waitForSelector('.bot-card');
  const progress = async () => Number((await page.locator('.bot-level-ring b').innerText()).trim());
  const before = await progress();
  console.log('unlocked before:', before);
  const controlsY = await page.locator('.bot-controls').evaluate(e => e.getBoundingClientRect().top + window.scrollY);
  check('start controls are on the first screen', controlsY < vh, `controls at y=${Math.round(controlsY)}`);
  await page.locator('.bot-card:not(.locked)').first().click();
  await page.locator('.bot-controls select').first().selectOption('white');
  if (shots) await page.screenshot({ path: `${shots}-bots.png` });
  await page.locator('.bot-controls button.primary').click();
  await page.waitForSelector('.bot-board-wrap g[data-piece]');
  const boardBox = await page.locator('.bot-board-wrap .board svg').first().boundingBox();
  console.log('board px:', Math.round(boardBox.width), 'x', Math.round(boardBox.height));
  check('bot board uses the screen (>= 440px)', boardBox.width >= 440, `board ${Math.round(boardBox.width)}px`);
  check('whole bot board is on screen', boardBox.y + boardBox.height <= vh + 1, `bottom at ${Math.round(boardBox.y + boardBox.height)}`);
  // Our side: mate in one if there is one, else win material, else squeeze the king. Runs in the page with the site's own rules.
  const pickMove = () => page.evaluate(async () => {
    const { Chess } = await import('/vendor/veyra-rules/chess-compat.js');
    const rows = Array.from({ length: 8 }, () => Array(8).fill(''));
    for (const g of document.querySelectorAll('.bot-board-wrap g[data-piece][data-square]')) {
      const sq = g.getAttribute('data-square'), pc = g.getAttribute('data-piece');
      const f = sq.charCodeAt(0) - 97, r = 8 - Number(sq[1]);
      rows[r][f] = pc[0] === 'w' ? pc[1].toUpperCase() : pc[1].toLowerCase();
    }
    const fen = rows.map(row => { let s = '', e = 0; for (const c of row) { if (!c) e++; else { if (e) s += e; e = 0; s += c; } } return s + (e || ''); }).join('/') + ' w - - 0 1';
    const val = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    const material = (c) => c.board().flat().filter(Boolean).reduce((s, p) => s + (p.color === 'w' ? 1 : -1) * val[p.type], 0);
    let g; try { g = new Chess(fen); } catch { return null; } // board still animating
    const seen = (window.__seen ||= new Set());
    let best = null, bestScore = -Infinity;
    const play = (fenNow, m) => { const c = new Chess(fenNow); c.move({ from: m.from, to: m.to, ...(m.promotion ? { promotion: 'q' } : {}) }); return c; };
    const mateInOne = (c) => c.moves({ verbose: true }).some(m => play(c.fen(), m).isCheckmate());
    const ahead = material(g) >= 5;
    for (const m of g.moves({ verbose: true })) {
      const c = play(fen, m);
      if (c.isCheckmate()) return { from: m.from, to: m.to };
      const rs = ahead && material(g) >= 9 ? c.moves({ verbose: true }) : [];
      if (rs.length && rs.length <= 6 && rs.every(r => mateInOne(play(c.fen(), r)))) return { from: m.from, to: m.to };
    }
    const sq = (s) => [s.charCodeAt(0) - 97, Number(s[1]) - 1];
    const kingAt = (c, color) => { for (const row of c.board()) for (const p of row) if (p && p.type === 'k' && p.color === color) return sq(p.square); return [3, 3]; };
    const squeeze = (c) => { const [bx, by] = kingAt(c, 'b'); const [wx, wy] = kingAt(c, 'w'); const edge = Math.max(Math.abs(bx - 3.5), Math.abs(by - 3.5)); return edge * 6 - (Math.abs(bx - wx) + Math.abs(by - wy)) * 2; };
    seen.add(fen.split(' ')[0]);
    for (const m of g.moves({ verbose: true })) {
      const c = play(fen, m);
      const replies = c.moves({ verbose: true });
      if (!replies.length || c.isDraw()) continue; // never stalemate / draw
      let worst = Infinity, worstPos = null;
      for (const r of replies) { const d = play(c.fen(), r); const v = material(d) * 100 + (ahead ? squeeze(d) : 0); if (v < worst) { worst = v; worstPos = d; } }
      const key = c.fen().split(' ')[0];
      const score = worst - (ahead ? replies.length * 3 : 0) + (c.inCheck() ? 2 : 0) + (ahead && m.piece === 'p' ? 4 : 0) + (m.promotion ? 3000 : 0)
        - (seen.has(key) || (worstPos && seen.has(worstPos.fen().split(' ')[0])) ? 400 : 0) + Math.random();
      if (score > bestScore) { bestScore = score; best = { from: m.from, to: m.to, key }; }
    }
    if (best) seen.add(best.key);
    return best;
  });
  const sqCenter = async (sq) => {
    const r = await page.locator(`.bot-board-wrap [data-square="${sq}"]`).first().boundingBox();
    return [r.x + r.width / 2, r.y + r.height / 2];
  };
  let plies = 0;
  while (plies < 200) {
    if (await page.locator('.result-card').count()) break;
    const turn = await page.locator('.botgame-top > span.muted').innerText().catch(() => '');
    if (!/תורך/.test(turn)) { await delay(150); continue; }
    const m = await pickMove();
    if (!m) { await delay(300); continue; }
    const before = await page.locator('.bot-board-wrap g[data-piece]').count();
    const [fx, fy] = await sqCenter(m.from); const [tx, ty] = await sqCenter(m.to);
    await page.mouse.move(fx, fy); await page.mouse.down(); await page.mouse.move(tx, ty, { steps: 4 }); await page.mouse.up();
    plies++;
    await delay(250);
  }
  await page.waitForSelector('.result-card', { timeout: 20000 });
  const result = await page.locator('.result-card h2').innerText();
  console.log('result:', result, 'after', plies, 'of our moves');
  check('we won the game', /^לבן ניצח/.test(result), result);
  if (!/^לבן ניצח/.test(result)) console.log('final position:', await page.evaluate(() => [...document.querySelectorAll('.bot-board-wrap g[data-piece][data-square]')].map(g => g.getAttribute('data-piece') + g.getAttribute('data-square')).join(' ')));
  const top = await page.locator('.botgame-top > span.muted').innerText().catch(() => '');
  check('after the game the page no longer says "your turn"', !/תורך/.test(top), top);
  check('game-over panel offers the next step', (await page.locator('.result-card button').count()) >= 2);
  check('resign / draw buttons are gone after the game', (await page.locator('.bot-side-actions button').count()) === 0);
  if (shots) await page.screenshot({ path: `${shots}-gameover.png` });
  // Leave the way the playtester did: straight back to the bots, no review.
  await page.getByRole('button', { name: /חזרה לבוטים|בוט אחר/ }).first().click();
  await page.waitForSelector('.bot-card');
  await delay(600);
  const after = await progress();
  console.log('unlocked after:', after);
  check('winning unlocks the next bot even without opening the review', after === before + 1, `before ${before}, after ${after}`);
  const newest = page.locator('.bot-card:not(.locked)').nth(after - 1);
  const nb = await newest.boundingBox();
  check('the bot list opens on the bot just unlocked', nb && nb.y >= 0 && nb.y + nb.height <= vh, JSON.stringify(nb));
  if (shots) await page.screenshot({ path: `${shots}-bots-after.png` });
  const sync = await page.evaluate(async () => (await fetch('/api/sync', { credentials: 'same-origin' })).json());
  const bot = (sync.games || []).filter(g => g.meta?.source === 'bot');
  check('the finished bot game is saved to the account', bot.length === 1, JSON.stringify(sync.games));
  check('bot progress is stored with the account', Number(sync.progress?.bot) === after - 1, JSON.stringify(sync.progress));
  // Resign asks first.
  await page.locator('.bot-card:not(.locked)').first().click();
  await page.locator('.bot-controls button.primary').click();
  await page.waitForSelector('.bot-side-actions button');
  let asked = '';
  page.removeAllListeners('dialog');
  page.once('dialog', d => { asked = d.message(); d.dismiss(); });
  await page.getByRole('button', { name: 'פרוש' }).click();
  await delay(300);
  check('resign asks "are you sure?"', /בטוח/.test(asked), asked || 'no dialog');
  check('dismissing the question keeps the game going', (await page.locator('.result-card').count()) === 0);
} finally {
  await browser.close();
  server?.kill();
}
if (failed) { console.log(`FAIL: ${failed} bot campaign browser check(s) failed.`); process.exit(1); }
console.log('PASS: bot campaign browser checks.');
