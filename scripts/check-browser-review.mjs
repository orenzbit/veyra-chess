// Browser parity check for game review: the production build, running in Chromium, must produce the
// same accuracy, rating and per-label counts as the Node benchmark (scripts/review-benchmark.mjs).
// Engine search is node-limited and deterministic, so any difference points at a build/runtime gap.
//
// Requires a production build in dist/ (npm run build) and Playwright with Chromium installed.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import { runBenchmark } from './review-benchmark.mjs';

const SUMMARY_ROWS = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'forced', 'inaccuracy', 'mistake', 'miss', 'blunder'];
const OUT_DIR = 'artifacts/review-browser';
const port = 4174;
const baseUrl = 'http://127.0.0.1:' + port;

const expected = await runBenchmark({ root: process.cwd(), fixtures: 'scripts/fixtures/review-benchmark/games.json' });
const { games } = JSON.parse(await (await import('node:fs/promises')).readFile('scripts/fixtures/review-benchmark/games.json', 'utf8'));

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  stdio: 'ignore',
  env: { ...process.env, NODE_ENV: 'test' },
});
let browser;
let page;
const report = { passed: false, games: [] };
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

  for (const game of games) {
    const want = expected.games.find(g => g.id === game.id);
    page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('tabia_onboarding_seen', '1'));
    // Same signed-in stub as check-browser-board.mjs; other API calls (telemetry, sync) get a neutral reply.
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      const action = url.searchParams.get('action');
      let body = { ok: true };
      if (url.pathname.endsWith('/api/auth') && action === 'status') body = { ok: true, configured: true, data: { configured: true } };
      if (url.pathname.endsWith('/api/auth') && action === 'session') body = { ok: true, authenticated: true, user: { id: 'browser-test-user', email: 'browser-test@example.invalid' } };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.locator('[data-home-destination="archive"]').first().click();
    await page.getByRole('button', { name: 'לוח וניתוח', exact: true }).click();
    await page.getByPlaceholder('הדבק PGN כאן').fill('[Event "Review benchmark"]\n[White "' + game.white + '"]\n[Black "' + game.black + '"]\n[Result "' + game.result + '"]\n\n' + game.pgn);
    await page.getByRole('button', { name: 'טען משחק', exact: true }).click();
    await page.getByText('נטען ' + game.plies.length + ' מהלכים.').waitFor({ state: 'visible', timeout: 15000 });

    const started = Date.now();
    await page.getByRole('button', { name: 'נתח משחק', exact: true }).click();
    const summaryButton = page.getByRole('button', { name: 'סיכום Review', exact: true });
    await summaryButton.waitFor({ state: 'visible', timeout: game.plies.length * 9000 + 30000 });
    const analysisMs = Date.now() - started;
    const statusText = await page.locator('.panel-title .muted').first().innerText().catch(() => '');
    assert.ok(!statusText.includes('הניתוח נעצר'), game.id + ': browser analysis stopped early: ' + statusText);

    await summaryButton.click();
    await page.locator('.summary-modal').waitFor({ state: 'visible', timeout: 10000 });
    const stats = await page.locator('.summary-modal .summary-stat').allInnerTexts();
    const countTexts = await page.locator('.summary-modal .summary-count').allInnerTexts();
    await page.screenshot({ path: OUT_DIR + '/' + game.id + '-summary.png', fullPage: true });

    // The review screen defaults to White as "me", so the first column is White and the second Black.
    const number = text => Number(String(text).split(':').pop().trim());
    const got = {
      accuracy: { white: number(stats[0]), black: number(stats[2]) },
      rating: { white: number(stats[1]), black: number(stats[3]) },
      counts: { white: {}, black: {} },
    };
    SUMMARY_ROWS.forEach((key, i) => {
      const [white, black] = String(countTexts[i] || '').split('/').map(part => Number(part.trim()));
      got.counts.white[key] = white;
      got.counts.black[key] = black;
    });
    const wantCounts = { white: {}, black: {} };
    for (const side of ['white', 'black']) {
      for (const key of Object.keys(want.counts[side])) assert.ok(SUMMARY_ROWS.includes(key), game.id + ': label ' + key + ' is not shown in the summary modal');
      for (const key of SUMMARY_ROWS) wantCounts[side][key] = want.counts[side][key] || 0;
    }
    const entry = { id: game.id, analysisMs, browser: got, node: { accuracy: want.accuracy, rating: want.rating, counts: wantCounts }, pageErrors };
    report.games.push(entry);

    assert.equal(got.accuracy.white.toFixed(1), Number(want.accuracy.white).toFixed(1), game.id + ': White accuracy differs between browser and Node');
    assert.equal(got.accuracy.black.toFixed(1), Number(want.accuracy.black).toFixed(1), game.id + ': Black accuracy differs between browser and Node');
    assert.equal(got.rating.white, want.rating.white, game.id + ': White rating differs between browser and Node');
    assert.equal(got.rating.black, want.rating.black, game.id + ': Black rating differs between browser and Node');
    assert.deepEqual(got.counts, wantCounts, game.id + ': label counts differ between browser and Node');
    assert.deepEqual(pageErrors, [], game.id + ': browser must not raise uncaught page errors');
    console.log('PASS: ' + game.id + ' — browser matches Node: accuracy ' + got.accuracy.white + '/' + got.accuracy.black +
      ', rating ' + got.rating.white + '/' + got.rating.black + ', all label counts equal; browser analysis took ' + analysisMs + ' ms.');
    await page.close();
    page = null;
  }
  report.passed = true;
} catch (error) {
  report.error = String(error?.stack || error);
  if (page) await page.screenshot({ path: OUT_DIR + '/failure.png', fullPage: true }).catch(() => {});
  throw error;
} finally {
  await mkdir(OUT_DIR, { recursive: true }).catch(() => {});
  await writeFile(OUT_DIR + '/report.json', JSON.stringify(report, null, 2) + '\n').catch(() => {});
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
