import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4174;
const baseUrl = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  stdio: 'ignore', env: { ...process.env, NODE_ENV: 'test' },
});
let browser;
let page;
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { const response = await fetch(baseUrl); if (response.ok) { ready = true; break; } } catch {}
    await delay(500);
  }
  assert.ok(ready, 'Vite preview server should start');
  await mkdir('artifacts/daily-streak', { recursive: true });
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('tabia_onboarding_seen', '1'));
  await page.route('**/api/auth**', async (route) => {
    const action = new URL(route.request().url()).searchParams.get('action');
    if (action === 'status') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, configured: true, data: { configured: true } }) });
    } else if (action === 'session') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, authenticated: true, user: { id: 'browser-test-user', email: 'browser-test@example.invalid' } }) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    }
  });
  await page.route('**/api/puzzles**', async (route) => {
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'DISABLED' }) });
  });
  await page.route('**/api/daily-streak**', async (route) => {
    const request = route.request();
    const action = new URL(request.url()).searchParams.get('action');
    if (action === 'settings') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, timezoneId: 'Asia/Jerusalem', pendingTimezoneId: null, timezoneEffectiveOn: null }) });
      return;
    }
    if (action === 'state') {
      const start = new Date('2026-09-11T00:00:00Z');
      const calendar = Array.from({ length: 42 }, (_, i) => {
        const date = new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10);
        const qualified = date >= '2026-10-19' && date <= '2026-10-21';
        return { date, qualified, isToday: date === '2026-10-22', status: qualified ? 'qualified' : date === '2026-10-22' ? 'today-open' : 'missed', activityCount: qualified ? 1 : 0 };
      });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        ok: true, timezoneId: 'Asia/Jerusalem', pendingTimezoneId: null, timezoneEffectiveOn: null,
        today: '2026-10-22', currentStreak: 3, bestStreak: 7, todayQualified: false, canMaintainToday: true,
        missedYesterday: false, streakThroughDate: '2026-10-21', calendar,
        milestones: [7, 14, 30, 50, 100, 365].map((days) => ({ days, earned: days === 7 })), newlyEarned: [],
      }) });
      return;
    }
    await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'bad_request' }) });
  });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.getByRole('button', { name: '🧩 פאזלים', exact: true }).click();
  await page.getByRole('button', { name: 'רצף יומי', exact: true }).click();
  await page.getByRole('heading', { name: 'רצף יומי', exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText('42 הימים האחרונים', { exact: true }).waitFor({ state: 'visible' });
  assert.equal(await page.locator('.daily-streak-day').count(), 42, 'calendar renders all 42 days');
  assert.deepEqual(await page.locator('.daily-streak-stat strong').allTextContents(), ['3', '7', 'פתוח'], 'current streak, best and open-day state render');
  assert.equal(await page.locator('.daily-streak-milestone.is-earned').count(), 1, 'earned milestone is visible');
  assert.equal(await page.locator('.daily-streak-day.is-qualified').count(), 3, 'qualified days are visually marked');
  assert.deepEqual(pageErrors, [], 'daily streak page must not raise uncaught browser errors');
  await page.screenshot({ path: 'artifacts/daily-streak/desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  const layout = await page.locator('.daily-streak-panel').evaluate((el) => ({ width: el.clientWidth, scrollWidth: el.scrollWidth }));
  assert.ok(layout.scrollWidth <= layout.width + 2, 'daily streak layout does not overflow on a 390px viewport');
  assert.equal(await page.locator('.daily-streak-day').count(), 42, 'mobile calendar retains all days');
  await page.screenshot({ path: 'artifacts/daily-streak/mobile.png', fullPage: true });
  const report = { passed: true, calendarDays: 42, currentStreak: 3, bestStreak: 7, earnedMilestones: 1, mobileWidth: 390, layout, uncaughtPageErrors: pageErrors };
  await writeFile('artifacts/daily-streak/report.json', JSON.stringify(report, null, 2) + '\n');
  console.log('PASS: daily streak browser smoke test: ' + JSON.stringify(report));
} catch (error) {
  try {
    await mkdir('artifacts/daily-streak', { recursive: true });
    if (page) await page.screenshot({ path: 'artifacts/daily-streak/failure.png', fullPage: true });
    const body = page ? await page.locator('body').innerText().catch(() => '') : '';
    await writeFile('artifacts/daily-streak/failure.txt', String(error?.stack || error) + '\n\nBODY:\n' + body);
    console.log('DAILY_STREAK_BROWSER_FAILURE_BODY=' + body.slice(0, 2500));
  } catch {}
  throw error;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
