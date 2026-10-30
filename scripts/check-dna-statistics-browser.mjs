import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4176;
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'inherit' });
let browser;
const report = {
  schemaVersion: 2,
  engineVersion: 'browser-fixture',
  timeControls: {
    blitz: { count: 2, averageAccuracy: 85, userMoves: 40, classificationCounts: { miss: 2, mistake: 1, best: 30 } },
  },
};
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { ready = (await fetch(baseUrl)).ok; } catch (error) {
      if (error.cause?.code !== 'ECONNREFUSED') throw error;
    }
    if (ready) break;
    await delay(250);
  }
  assert.ok(ready, 'preview server must start');
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  const dnaRequests = [];
  const pending = [];
  let mode = 'saved';
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('tabia_onboarding_seen', '1'));
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const action = url.searchParams.get('action');
    let body = { ok: true };
    if (url.pathname === '/api/auth' && action === 'status') body = { ok: true, configured: true, data: { configured: true } };
    if (url.pathname === '/api/auth' && action === 'session') body = { ok: true, authenticated: true, user: { id: 'stats-test-user', email: 'stats@example.invalid' } };
    if (url.pathname === '/api/chess-dna') {
      dnaRequests.push({ method: route.request().method(), action });
      if (mode === 'pending') { pending.push(route); return; }
      if (mode === 'error') {
        await route.fulfill({ status: 503, json: { ok: false, error: 'Test storage unavailable' } });
        return;
      }
      body = { ok: true, report: mode === 'empty' ? null : { report_json: report } };
    }
    await route.fulfill({ status: 200, json: body });
  });
  const openStats = () => page.getByRole('button', { name: '📊 סטטיסטיקות', exact: true }).click();
  const returnToArchive = () => page.getByRole('button', { name: 'חזרה לארכיון', exact: true }).click();
  const overview = page.locator('.dna-overview-card');
  const waitPending = async count => {
    for (let i = 0; i < 80 && pending.length < count; i++) await delay(50);
    assert.equal(pending.length, count, 'expected pending report requests');
  };
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await openStats();
  await overview.waitFor();
  assert.equal(await overview.locator('.dna-stat').filter({ hasText: 'Misses' }).locator('strong').innerText(), '5');
  assert.equal(await page.locator('.dna-classification-row').filter({ hasText: /^miss2$/ }).count(), 1);

  mode = 'error';
  await page.getByRole('button', { name: 'רענון סטטיסטיקות', exact: true }).click();
  await page.getByRole('alert').waitFor();
  assert.equal(await overview.count(), 0, 'failed refresh clears old metrics');
  assert.equal(await page.getByRole('heading', { name: 'אין עדיין נתוני DNA שמורים', exact: true }).count(), 0, 'error is not an empty report');
  assert.equal(await page.locator('main[aria-busy]').getAttribute('aria-busy'), 'false');
  mode = 'saved';
  await page.getByRole('button', { name: 'נסה שוב', exact: true }).click();
  await overview.waitFor();

  mode = 'pending';
  await page.getByRole('button', { name: 'רענון סטטיסטיקות', exact: true }).click();
  await waitPending(1);
  assert.equal(await page.locator('main[aria-busy]').getAttribute('aria-busy'), 'true');
  assert.equal(await overview.count(), 0);
  assert.equal(await page.getByRole('heading', { name: 'אין עדיין נתוני DNA שמורים', exact: true }).count(), 0, 'loading is not an empty report');
  await returnToArchive();
  mode = 'empty';
  await openStats();
  await page.getByRole('heading', { name: 'אין עדיין נתוני DNA שמורים', exact: true }).waitFor();
  await pending[0].fulfill({ status: 200, json: { ok: true, report: { report_json: report } } });
  await page.waitForLoadState('networkidle');
  assert.equal(await overview.count(), 0, 'late saved response cannot replace newer empty report');

  mode = 'saved';
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'רענון סטטיסטיקות', exact: true }).click();
  await overview.waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'statistics fit mobile viewport');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await page.getByRole('heading', { name: 'Your statistics', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Refresh statistics', exact: true }).waitFor();
  assert.ok(!/[\u0590-\u05ff]/.test(await page.locator('main').innerText()), 'statistics content is translated into English');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'English statistics fit mobile viewport');
  assert.ok(dnaRequests.length >= 5);
  assert.ok(dnaRequests.every(request => request.method === 'GET' && request.action === 'latest'), 'statistics only reads saved reports');
  assert.deepEqual(errors, []);
  console.log('PASS: statistics browser saved/empty/loading/error/retry states, late responses, miss count and 390px layout.');
} finally {
  if (browser) await browser.close();
  server.kill();
}
