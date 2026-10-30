import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { coreLines } from '../src/opening-core.mjs';
import { buildCalendar, calculateStreak, addDateDays } from '../netlify/functions/lib/daily-streak.mjs';

const port = 4178;
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'inherit' });
const userId = 'opening-browser-user';
const repertoire = JSON.parse(await readFile('public/data/repertoire.json', 'utf8'));
const opening = repertoire[0];
const required = coreLines(opening);
const last = required.at(-1);
let progress = {
  done: Object.fromEntries(required.slice(0, -1).map(line => [opening.id + '/' + line.id, 100])),
  completed: { 'existing-opening': 100 }, bot: 4,
};
let browser;
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
  browser = await chromium.launch({ headless: true, channel: process.argv.includes('--chrome') ? 'chrome' : undefined });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  const submitted = [];
  let mode = 'pending';
  let credited = false;
  const today = '2026-10-30';
  const savedDates = [
    ...Array.from({ length: 28 }, (_, i) => addDateDays(today, i - 70)),
    ...Array.from({ length: 14 }, (_, i) => addDateDays(today, i - 14)),
  ];
  const state = () => {
    const dates = credited ? [...savedDates, today] : savedDates;
    return { ok: true, timezoneId: 'UTC', pendingTimezoneId: null, today, ...calculateStreak(dates, today),
      calendar: buildCalendar(dates.map(local_date => ({ local_date })), today, 35) };
  };
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ userId, progress }) => {
    localStorage.setItem('tabia_onboarding_seen', '1');
    if (localStorage.getItem('opening-test-initialized')) return;
    localStorage.setItem('opening-test-initialized', '1');
    localStorage.setItem('veyra_sync_owner_v1', userId);
    localStorage.setItem('veyra_progress_v1', JSON.stringify(progress));
    localStorage.setItem('veyra_puzzle_best_streak_v1', '28');
    localStorage.setItem('veyra_daily_streak_outbox_v1:' + userId, '[]');
  }, { userId, progress });
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const action = url.searchParams.get('action');
    let body = { ok: true };
    if (url.pathname === '/api/auth' && action === 'status') body = { ok: true, configured: true };
    if (url.pathname === '/api/auth' && action === 'session') body = { ok: true, authenticated: true, user: { id: userId, email: 'preview@example.invalid' } };
    if (url.pathname === '/api/sync') {
      if (route.request().method() === 'PUT') progress = route.request().postDataJSON().progress || progress;
      body = { ok: true, progress };
    }
    if (url.pathname === '/api/puzzles' && action === 'state') body = {
      ok: true, serverTime: today + 'T12:00:00Z',
      pool: { active: 0, mastered: 0, total: 0, fresh: 0, cap: 500, lowWater: 20, byMotif: {}, byPhase: {} },
      kits: { regular: null, rush: null }, rushBest: 0,
      profile: { puzzleElo: 1000, nextFocus: 'general' }, job: null, refillNeeded: false,
    };
    if (url.pathname === '/api/daily-streak') {
      if (action === 'record') {
        submitted.push(route.request().postDataJSON());
        if (mode === 'pending') { await route.fulfill({ status: 503, json: { ok: false, error: 'streak_unavailable' } }); return; }
        credited = true;
        body = { ...state(), accepted: true, duplicate: submitted.length > 2 };
      } else body = state();
    }
    await route.fulfill({ status: 200, json: body });
  });
  await page.goto(baseUrl);
  await page.getByRole('button', { name: '📚 פתיחות', exact: true }).click();
  await page.locator('.open-item').filter({ hasText: opening.name }).click();
  await page.locator('.open-line').filter({ hasText: last.name }).click();
  await page.getByRole('button', { name: 'תרגל את הקו', exact: true }).click();
  const mine = opening.color === 'w' ? 0 : 1;
  for (let ply = mine; ply < last.moves.length; ply += 2) {
    await page.locator('.row .muted').filter({ hasText: new RegExp(`^${ply}/${last.moves.length}$`) }).waitFor();
    await page.getByPlaceholder('המהלך שלך (למשל Nf3)').fill(last.moves[ply][0]);
    await page.getByRole('button', { name: 'שחק', exact: true }).click();
  }
  await page.locator('[data-opening-streak="pending"]').waitFor();
  assert.equal(credited, false, 'pending activity cannot qualify a day');
  assert.equal(submitted.length, 1, 'completion submits once');
  assert.equal(submitted[0].ownerId, userId);
  assert.equal(submitted[0].openingId, opening.id);
  assert.deepEqual(submitted[0].completedLines, required.map(line => ({ lineId: line.id, moves: line.moves.map(move => move[0]) })));
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('veyra_progress_v1')).completed['existing-opening']), 100);
  assert.equal(await page.evaluate(() => localStorage.getItem('veyra_puzzle_best_streak_v1')), '28');
  assert.equal(await page.evaluate(id => localStorage.getItem('veyra_daily_streak_outbox_v1:' + id), userId), '[]');
  mode = 'accepted';
  await page.getByRole('button', { name: 'נסה אימות שוב', exact: true }).click();
  await page.locator('[data-opening-streak="accepted"]').waitFor();
  assert.equal(submitted[1].eventId, submitted[0].eventId);
  assert.equal(await page.evaluate(id => JSON.parse(localStorage.getItem('veyra_opening_streak_outbox_v1:' + id)).length, userId), 0);

  await page.goto(baseUrl);
  await page.getByRole('button', { name: '📚 פתיחות', exact: true }).click();
  await page.locator('.open-item').filter({ hasText: opening.name }).click();
  await page.waitForLoadState('networkidle');
  assert.equal(submitted.length, 2, 'opening an already-completed trainer cannot award it again');
  await page.goto(baseUrl);
  await page.getByRole('button', { name: '🧩 פאזלים', exact: true }).click();
  await page.locator('#ptab-streak').click();
  await page.locator('.daily-streak-numbers').waitFor();
  assert.deepEqual(await page.locator('.daily-streak-numbers b').allTextContents(), ['15', '28']);
  assert.equal(await page.locator('.daily-streak-day').count(), 35);
  assert.equal(await page.locator('.puzzle-stat').filter({ hasText: 'שיא' }).locator('div').innerText(), '28');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'existing streak page fits mobile');
  assert.deepEqual(errors, [], 'production browser has no page errors');

  const preview = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const network = [];
  preview.on('pageerror', error => errors.push(error.message));
  preview.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
  await preview.goto(pathToFileURL(resolve('design-preview/daily-streak.html')).href);
  assert.equal(await preview.locator('#calendar [role=listitem]').count(), 35);
  assert.equal(await preview.locator('.day.done').count(), 20);
  assert.equal(await preview.locator('#goal').evaluate(element => getComputedStyle(element).direction), 'ltr', 'progress fractions retain numeric reading order in RTL');
  await mkdir('artifacts/daily-streak', { recursive: true });
  await preview.screenshot({ path: 'artifacts/daily-streak/preview-desktop.png', fullPage: true });
  await preview.locator('#offline').click();
  assert.equal(await preview.locator('#current').innerText(), '14');
  await preview.locator('#complete').click();
  await preview.waitForFunction(() => document.getElementById('current').textContent === '15');
  assert.equal(await preview.locator('#best').innerText(), '28');
  assert.equal(await preview.locator('.day.done').count(), 21);
  for (const state of ['error', 'disabled']) {
    await preview.locator(`[data-state="${state}"]`).click();
    assert.equal(await preview.locator('#current').innerText(), '—');
    assert.equal(await preview.locator('.stats > div:last-child strong').innerText(), '—', 'unavailable data does not show stale milestones');
  }
  await preview.locator('[data-state="open"]').click();
  for (const tab of ['puzzles', 'openings', 'daily']) {
    await preview.locator(`[data-tab="${tab}"]`).click();
    assert.equal(await preview.locator(`#${tab}`).isVisible(), true);
  }
  await preview.setViewportSize({ width: 390, height: 844 });
  assert.ok(await preview.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Hebrew preview fits mobile');
  await preview.screenshot({ path: 'artifacts/daily-streak/preview-mobile-he.png', fullPage: true });
  await preview.locator('#language').click();
  assert.ok(!/[\u0590-\u05ff]/.test(await preview.locator('main').innerText()), 'English preview is translated');
  assert.ok(await preview.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'English preview fits mobile');
  assert.deepEqual(network, [], 'local HTML does not contact external systems');
  assert.deepEqual(errors, []);
  console.log('PASS: real trainer completion, pending/retry, preserved progress/best, existing 35-day UI, no duplicate awards; offline bilingual HTML preview states and mobile.');
} finally {
  if (browser) await browser.close();
  server.kill();
}
