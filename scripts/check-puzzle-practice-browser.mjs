// Browser check for "אימון אישי" puzzles (not part of check:release: it needs Playwright + Chromium installed).
// Usage: npm run build && node scripts/check-puzzle-practice-browser.mjs [--shots=prefix]   (PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs)
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const PORT = Number(process.env.PREVIEW_PORT || 4188);
const base = `http://127.0.0.1:${PORT}`;
const shots = (process.argv.find(a => a.startsWith('--shots=')) || '').slice(8);
const server = spawn(process.execPath, ['scripts/local-preview.mjs', '--port', String(PORT)], { stdio: 'ignore' });
let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${ok ? '' : ' ' + detail}`); if (!ok) failed++; };
const browser = await chromium.launch();
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(base + '/')).ok) break; } catch {} await delay(200); }
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const openPuzzles = async () => { await page.getByRole('button', { name: /פאזלים/ }).first().click(); await page.waitForSelector('.puzzle-stat'); await delay(800); };
  const state = () => page.evaluate(() => ({
    counter: document.querySelectorAll('.puzzle-stat div')[0]?.textContent || '',
    solved: document.querySelectorAll('.puzzle-stat div')[1]?.textContent || '',
    feedback: document.querySelector('.puzzle-feedback')?.textContent || '',
    pieces: [...document.querySelectorAll('.board g[data-piece][data-square]')].map(g => g.getAttribute('data-piece') + g.getAttribute('data-square')).sort().join(' '),
  }));
  const moves = (n) => page.evaluate(async (n) => {
    const { Chess } = await import('/vendor/veyra-rules/chess-compat.js');
    const s = await (await fetch('/api/puzzles?action=state', { credentials: 'same-origin' })).json();
    const p = s.kits.regular.puzzles[n];
    const accepted = new Set([...(p.accepted || []), ...(p.solution || [])].map(u => u.slice(0, 4)));
    const wrong = new Chess(p.fen).moves({ verbose: true }).find(m => !accepted.has(m.from + m.to) && !m.promotion && (() => { const c = new Chess(p.fen); c.move({ from: m.from, to: m.to }); return !c.isCheckmate(); })());
    return { right: p.solution[0], wrong: wrong.from + wrong.to };
  }, n);
  const drag = async (uci) => {
    await page.evaluate(() => { const r = document.querySelector('.board').getBoundingClientRect(); window.scrollBy(0, r.top - 20); });
    await delay(200);
    const a = await page.locator(`.board [data-square="${uci.slice(0, 2)}"]`).first().boundingBox();
    const b = await page.locator(`.board [data-square="${uci.slice(2, 4)}"]`).first().boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 5 }); await page.mouse.up();
    await delay(500);
  };
  await page.goto(base + '/');
  await openPuzzles();
  const s0 = await state();
  const m0 = await moves(0);
  // 1. One wrong move does not give the answer away; "נסה שוב" keeps the same puzzle.
  await drag(m0.wrong);
  const s1 = await state();
  if (shots) await page.screenshot({ path: `${shots}-wrong.png` });
  check('a first wrong move says "try again" without the answer', /נסה שוב/.test(s1.feedback) && !/המהלך הנכון/.test(s1.feedback), s1.feedback);
  await page.getByRole('button', { name: 'נסה שוב' }).click(); await delay(400);
  const s2 = await state();
  check('"נסה שוב" retries the same puzzle', s2.counter === s0.counter && s2.pieces === s0.pieces, JSON.stringify({ s0, s2 }));
  // 2. A correct move shows "נכון!" and it stays until the player moves on.
  await drag(m0.right);
  await delay(2000);
  const s3 = await state();
  if (shots) await page.screenshot({ path: `${shots}-correct.png` });
  check('a correct move shows "נכון!" and keeps it on screen', /^נכון!/.test(s3.feedback) && s3.counter === s0.counter, JSON.stringify(s3));
  await page.getByRole('button', { name: /פאזל הבא/ }).click(); await delay(500);
  // 3. Solve puzzle 2 on the first try, then leave the page and come back.
  const m1 = await moves(1);
  await drag(m1.right);
  await page.getByRole('button', { name: /פאזל הבא/ }).click(); await delay(500);
  const s4 = await state();
  console.log('before leaving:', s4.counter, 'solved', s4.solved);
  await page.getByRole('button', { name: 'חזרה לבית' }).click(); await delay(800);
  await openPuzzles();
  const s5 = await state();
  console.log('after coming back:', s5.counter, 'solved', s5.solved);
  check('leaving the page keeps the puzzle progress', s5.counter === s4.counter && s5.solved === s4.solved && s4.counter.startsWith('3/'), JSON.stringify({ s4, s5 }));
  await page.reload(); await delay(1000); await openPuzzles();
  const s6 = await state();
  check('a reload keeps the puzzle progress too', s6.counter === s4.counter && s6.solved === s4.solved, JSON.stringify(s6));
  if (shots) await page.screenshot({ path: `${shots}-back.png` });
} finally {
  await browser.close();
  server.kill();
}
if (failed) { console.log(`FAIL: ${failed} puzzle practice browser check(s) failed.`); process.exit(1); }
console.log('PASS: puzzle practice browser checks.');
