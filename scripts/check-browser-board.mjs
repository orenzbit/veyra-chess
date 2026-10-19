import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4173;
const baseUrl = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  stdio: 'ignore',
  env: { ...process.env, NODE_ENV: 'test' },
});
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) { ready = true; break; }
    } catch {}
    await delay(500);
  }
  assert.ok(ready, 'Vite preview server should start');
  await mkdir('artifacts/chess-board', { recursive: true });
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('tabia_onboarding_seen', '1'));
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 45000 });
  await page.getByRole('heading', { name: 'מאמן שחמט' }).waitFor({ state: 'visible', timeout: 20000 });
  await page.getByRole('button', { name: 'סקירה', exact: true }).click();
  const pgn = '[Event "Browser board smoke test"]\n[White "Test White"]\n[Black "Test Black"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 *';
  await page.getByPlaceholder('הדבק PGN כאן').fill(pgn);
  await page.getByRole('button', { name: 'טען משחק', exact: true }).click();
  await page.getByText('נטען 10 מהלכים.').waitFor({ state: 'visible', timeout: 10000 });
  const board = page.locator('.board');
  await board.locator('svg').first().waitFor({ state: 'visible', timeout: 15000 });
  const svgCount = await board.locator('svg').count();
  const svgNodeCount = await board.locator('svg *').count();
  assert.ok(svgCount >= 1, 'chessboard SVG should render');
  assert.ok(svgNodeCount >= 40, 'chessboard should render squares and pieces, not an empty container');
  await page.screenshot({ path: 'artifacts/chess-board/01-board-loaded.png', fullPage: true });
  const initialSelected = page.locator('.move-item.selected');
  await initialSelected.waitFor({ state: 'visible' });
  await page.locator('.move-item').nth(4).click();
  await page.locator('.move-item').nth(4).waitFor({ state: 'visible' });
  assert.ok(await page.locator('.move-item').nth(4).evaluate(el => el.classList.contains('selected')), 'selecting a move should update selected move state');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'artifacts/chess-board/02-board-after-move-selection.png', fullPage: true });
  assert.deepEqual(pageErrors, [], 'browser must not raise uncaught page errors');
  const report = {
    passed: true,
    pgnLoaded: true,
    moveCount: 10,
    boardSvgCount: svgCount,
    boardSvgNodeCount: svgNodeCount,
    moveSelectionUpdates: true,
    uncaughtPageErrors: pageErrors,
    screenshots: ['artifacts/chess-board/01-board-loaded.png', 'artifacts/chess-board/02-board-after-move-selection.png'],
  };
  await (await import('node:fs/promises')).writeFile('artifacts/chess-board/report.json', JSON.stringify(report, null, 2) + '\n');
  console.log('PASS: browser board smoke test: ' + JSON.stringify(report));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
