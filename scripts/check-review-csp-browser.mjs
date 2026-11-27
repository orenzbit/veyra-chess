// Exercise production review with the CSP Netlify serves (Vite alone ignores _headers).
// npm run build first; Playwright required. Optional --chrome uses system Chromium.
// REACT_UMD_DIR may point at a node_modules directory for offline CDN fixtures.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:4189';
const headers = await readFile('dist/_headers', 'utf8');
const policy = headers.split('\n').find(line => line.startsWith('Content-Security-Policy:'))?.slice('Content-Security-Policy:'.length).trim();
assert.ok(policy, 'built Netlify CSP exists');
const server = spawn(process.execPath, ['scripts/local-preview.mjs', '--port', '4189'], { stdio: 'ignore' });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base)).ok) { ready = true; break; } } catch {}
    await delay(250);
  }
  assert.ok(ready, 'local preview starts');
  browser = await chromium.launch(process.argv.includes('--chrome') ? { executablePath: process.env.CHROME_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] } : {});
  const context = await browser.newContext();
  // Match production headers on documents AND worker scripts: workers have their own CSP.
  await context.route(base + '/**', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': policy } });
  });
  if (process.env.REACT_UMD_DIR) {
    await context.route('https://cdnjs.cloudflare.com/ajax/libs/**', async route => {
      const name = route.request().url().includes('/react-dom/') ? 'react-dom' : 'react';
      await route.fulfill({ contentType: 'application/javascript', body: await readFile(`${process.env.REACT_UMD_DIR}/${name}/umd/${name}.production.min.js`) });
    });
  }
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  const boot = await page.evaluate(() => new Promise(resolve => {
    const worker = new Worker('/engine-worker.js');
    const timer = setTimeout(() => { worker.terminate(); resolve('timeout'); }, 12000);
    worker.onmessage = event => { clearTimeout(timer); worker.terminate(); resolve(event.data); };
    worker.onerror = event => { clearTimeout(timer); worker.terminate(); resolve(event.message); };
  }));
  assert.equal(boot, 'ready', 'real WASM worker boots under production CSP: ' + JSON.stringify(boot));
  await page.locator('[data-home-destination="archive"]').first().click();
  await page.getByRole('button', { name: 'לוח וניתוח', exact: true }).click();
  const pgn = process.env.REVIEW_PGN_FILE ? await readFile(process.env.REVIEW_PGN_FILE, 'utf8') : '1. e4 Nf6 2. e5 Nd5 3. Nf3 Nc6 *';
  await page.getByPlaceholder('הדבק PGN כאן').fill(pgn);
  await page.getByRole('button', { name: 'טען משחק', exact: true }).click();
  await page.getByRole('button', { name: 'נתח משחק', exact: true }).click();
  await page.getByText('הניתוח הסתיים.', { exact: true }).waitFor({ timeout: 180000 });
  assert.match(await page.locator('.metric-ring b').innerText(), /^\d+(\.\d+)?$/, 'Accuracy is populated');
  for (let ply = 1; ply <= 6; ply++) {
    if (ply > 1) await page.getByRole('button', { name: '→', exact: true }).click();
    await page.locator('.coach-header small').filter({ hasText: `מהלך ${ply} מתוך` }).waitFor();
    assert.ok((await page.locator('.coach-header .coach-classification-icon').count()) > 0, 'move classification displayed');
    assert.match(await page.locator('.eval-panel > span').innerText(), /^\d+(\.\d+)?%$/, 'evaluation displayed');
  }
  assert.deepEqual(errors, []);
  console.log('PASS: production CSP boots WASM; review completes, Accuracy and per-move evaluation/classification display');
} finally {
  await browser?.close();
  server.kill();
}
