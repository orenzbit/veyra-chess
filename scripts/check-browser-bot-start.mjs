// Browser check for starting a bot game from a chosen opening at a chosen strength level.
// Uses the test entry ?botgame=<bot>&moves=...|&fen=...&level=1..4&side=white|black on the production build.
// Requires a production build in dist/ (npm run build) and Playwright with Chromium installed.
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const OUT_DIR = 'artifacts/bot-start';
// A historical (sourceFile) bot with native depth 4, so levels 1-3 really cap the search.
const manifest = JSON.parse(await readFile('public/data/bots/index.json', 'utf8'));
const botId = manifest.find(b => b.sourceFile && b.elo >= 2400)?.id;
assert.ok(botId, 'the manifest has a historical 2400+ bot');
const port = 4175;
const baseUrl = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  stdio: 'ignore',
  env: { ...process.env, NODE_ENV: 'test' },
});
let browser;
let page;
const report = { passed: false, cases: [] };
const pageErrors = [];

async function openPage(url) {
  if (page) await page.close();
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('tabia_onboarding_seen', '1'));
  // Same signed-in stub as check-browser-board.mjs; other API calls get a neutral reply (the bot list falls back to the manifest).
  await page.route('**/api/**', async route => {
    const requestUrl = new URL(route.request().url());
    const action = requestUrl.searchParams.get('action');
    let body = { ok: true };
    if (requestUrl.pathname.endsWith('/api/auth') && action === 'status') body = { ok: true, configured: true, data: { configured: true } };
    if (requestUrl.pathname.endsWith('/api/auth') && action === 'session') body = { ok: true, authenticated: true, user: { id: 'browser-test-user', email: 'browser-test@example.invalid' } };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
}

async function expectBoard(label) {
  const board = page.locator('.botgame-page .board');
  await board.locator('svg').first().waitFor({ state: 'visible', timeout: 20000 });
  const nodes = await board.locator('svg *').count();
  assert.ok(nodes >= 40, `${label}: the board renders squares and pieces`);
  return nodes;
}

async function shot(name) {
  await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: true });
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      if ((await fetch(baseUrl)).ok) { ready = true; break; }
    } catch {}
    await delay(500);
  }
  assert.ok(ready, 'Vite preview server should start');
  await mkdir(OUT_DIR, { recursive: true });
  browser = await chromium.launch({ headless: true });

  // 1. SAN start, the bot (white) moves first at level 1: Scholar's mate in one.
  await openPage(`${baseUrl}/?botgame=${botId}&moves=${encodeURIComponent('e4,e5,Qh5,Nc6,Bc4,Nf6')}&level=1&side=black`);
  await expectBoard('SAN start');
  assert.equal(await page.locator('.botgame-page').getAttribute('data-bot-cap'), '1', 'level 1 sets the search depth cap 1');
  const mate = page.locator('.result-card h2');
  await mate.waitFor({ state: 'visible', timeout: 40000 });
  assert.equal((await mate.innerText()).trim(), 'לבן ניצח במט', 'the bot played the mating move from the chosen opening');
  assert.equal(await page.getByRole('button', { name: 'העבר לסקירה', exact: true }).count(), 1, 'a SAN start can go to review');
  await shot('01-san-start-bot-mates');
  await page.getByRole('button', { name: 'העבר לסקירה', exact: true }).click();
  await page.locator('.move-item').first().waitFor({ state: 'visible', timeout: 15000 });
  assert.ok(await page.locator('.move-item').count() >= 4, 'review shows the game including the opening moves');
  await shot('02-san-start-review');
  report.cases.push({ name: 'san-start-level-1-bot-mates', passed: true });

  // 2. FEN start, the bot (white) moves first at level 3: back-rank mate in one. No review button for FEN starts.
  const mateFen = '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1';
  await openPage(`${baseUrl}/?botgame=${botId}&fen=${encodeURIComponent(mateFen)}&level=3&side=black`);
  await expectBoard('FEN start');
  assert.equal(await page.locator('.botgame-page').getAttribute('data-bot-cap'), '3');
  const fenResult = page.locator('.result-card h2');
  await fenResult.waitFor({ state: 'visible', timeout: 40000 });
  assert.equal((await fenResult.innerText()).trim(), 'לבן ניצח במט');
  assert.equal(await page.getByRole('button', { name: 'העבר לסקירה', exact: true }).count(), 0, 'a FEN start does not offer the review hand-off');
  assert.equal(await page.getByRole('button', { name: 'בוט אחר', exact: true }).count(), 1);
  await shot('03-fen-start-bot-mates');
  report.cases.push({ name: 'fen-start-level-3-bot-mates', passed: true });

  // 3. SAN start with the player to move: the game waits for the player, no result.
  await openPage(`${baseUrl}/?botgame=${botId}&moves=${encodeURIComponent('e4,e5')}&level=2&side=white`);
  const nodes = await expectBoard('player to move');
  assert.equal(await page.locator('.botgame-page').getAttribute('data-bot-cap'), '2');
  await page.getByText('תורך', { exact: true }).waitFor({ state: 'visible', timeout: 20000 });
  await delay(1500);
  assert.equal(await page.locator('.result-card').count(), 0, 'no result while the player thinks');
  assert.equal(await page.getByText('תורך', { exact: true }).count(), 1, 'still the player\'s turn');
  await shot('04-san-start-player-to-move');
  report.cases.push({ name: 'san-start-player-to-move', passed: true, boardSvgNodeCount: nodes });

  // 4. Invalid or hostile requests are ignored: the normal app opens.
  for (const query of ['moves=e5', 'moves=' + encodeURIComponent('<img src=x onerror=alert(1)>'), 'fen=' + encodeURIComponent('8/8/8/8/8/8/8/8 w - - 0 1')]) {
    await openPage(`${baseUrl}/?botgame=${botId}&${query}`);
    await page.getByRole('button', { name: 'לוח וניתוח', exact: true }).waitFor({ state: 'visible', timeout: 20000 });
    await delay(1500);
    assert.equal(await page.locator('.botgame-page').count(), 0, `invalid request ignored: ${query.slice(0, 30)}`);
  }
  await openPage(`${baseUrl}/?botgame=nobody&moves=e4`);
  await page.getByRole('button', { name: 'לוח וניתוח', exact: true }).waitFor({ state: 'visible', timeout: 20000 });
  await delay(1500);
  assert.equal(await page.locator('.botgame-page').count(), 0, 'unknown bot ignored');
  report.cases.push({ name: 'invalid-requests-ignored', passed: true });

  // 5. A normal game from the bots page is unchanged: standard start, no cap, player (white) to move.
  await openPage(baseUrl);
  await page.getByRole('button', { name: 'בוטים', exact: true }).first().click();
  const firstBot = page.locator('.bot-card:not(.locked)').first();
  await firstBot.waitFor({ state: 'visible', timeout: 20000 });
  await firstBot.click();
  await page.getByRole('button', { name: 'התחל משחק', exact: true }).click();
  await expectBoard('normal game');
  assert.equal(await page.locator('.botgame-page').getAttribute('data-bot-cap'), '', 'a normal game has no cap');
  await page.getByText('תורך', { exact: true }).waitFor({ state: 'visible', timeout: 20000 });
  await shot('05-normal-game');
  report.cases.push({ name: 'normal-game-unchanged', passed: true });

  assert.deepEqual(pageErrors, [], 'browser must not raise uncaught page errors');
  report.passed = true;
  report.uncaughtPageErrors = pageErrors;
  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log('PASS: browser bot-start check: ' + JSON.stringify(report));
} catch (error) {
  try {
    await mkdir(OUT_DIR, { recursive: true });
    if (page) await page.screenshot({ path: `${OUT_DIR}/failure.png`, fullPage: true });
    const bodyText = page ? await page.locator('body').innerText().catch(() => '') : '';
    console.log('BROWSER_FAILURE_BODY=' + bodyText.slice(0, 2500));
    console.log('BROWSER_FAILURE_ERRORS=' + JSON.stringify(pageErrors));
    await writeFile(`${OUT_DIR}/failure.txt`, String(error?.stack || error) + '\n\nBODY:\n' + bodyText + '\n');
  } catch {}
  throw error;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
