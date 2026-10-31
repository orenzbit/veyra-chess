import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import ts from 'typescript';

const base = 'http://127.0.0.1:4186';
const output = process.argv.some(arg => arg.startsWith('--page=')) ? 'artifacts/ui-theme/focused' : 'artifacts/ui-theme';
const css = await readFile('public/ui-theme.css', 'utf8');
const server = spawn(process.execPath, ['scripts/local-preview.mjs', '--port', '4186'], { stdio: 'inherit' });
let browser;
const captures = [];
const gateSource = await readFile('netlify/edge-functions/gate.ts', 'utf8');
const gateJs = ts.transpileModule(gateSource + '\nexport { gatePage, humanPage, withUiTheme };', {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const gateTemplates = await import('data:text/javascript;base64,' + Buffer.from(gateJs).toString('base64'));
const scenarios = [
  ['home', 'Welcome / Home', 'welcome'],
  ['home-account', 'Cinematic Home — signed in', 'home-account'],
  ['signup', 'Create account / Access approval', 'signup'],
  ['login', 'Sign in', 'login'],
  ['verify-email', 'Email verification', 'verify-email'],
  ['archive', 'Game archive', 'archive'],
  ['review', 'Game review / Coach', 'review'],
  ['dna', 'Chess DNA', 'dna'],
  ['statistics', 'DNA statistics', 'statistics'],
  ['bots', 'Bot selection', 'bots'],
  ['bot-game', 'Game against a bot', 'bot-game'],
  ['legends', 'Legends', 'legends'],
  ['blindfold', 'Blindfold training', 'blindfold'],
  ['puzzles', 'Personal puzzles', 'puzzles'],
  ['puzzle-streak', 'Consecutive puzzle streak', 'puzzle-streak'],
  ['rush', 'Puzzle Rush', 'rush'],
  ['openings', 'Opening study', 'openings'],
  ['clock', 'Chess clock', 'clock'],
  ['adaptive', 'Adaptive preferences', 'adaptive'],
  ['windows', 'Windows in-app page', 'windows'],
  ['account', 'Account settings', 'account'],
  ['admin-login', 'Admin sign in', 'admin-login'],
  ['admin', 'Admin dashboard (fixture)', 'admin'],
  ['daily-streak', 'Daily Streak — protected / unchanged', 'daily-streak'],
  ['site-gate', 'Private-site password gate', '/__theme-gate'],
  ['human-check', 'Human verification — initial shell', '/__theme-human'],
  ...['download', 'credits'].map(name => [name, name, '/' + name + '.html']),
  ...['terms', 'privacy', 'cookies', 'refunds', 'accessibility'].map(name => [name, 'Policy: ' + name, '/legal/' + name + '.html']),
];
const selected = process.argv.find(arg => arg.startsWith('--page='))?.slice(7);
const selectedScenarios = scenarios.filter(([id]) => !selected || selected.split(',').includes(id));
assert.ok(selectedScenarios.length, 'requested page must exist');
const btn = (page, text) => page.locator('button').filter({ hasText: text }).first().click();
async function enter(page, route) {
  await page.goto(base + (route.startsWith('/') ? route : '/'));
  if (route.startsWith('/')) return;
  await page.locator('.cinematic-home').waitFor();
  await page.locator('.ch-hero-board svg').waitFor();
  if (route === 'welcome' || route === 'home-account') return;
  if (['signup', 'login', 'verify-email'].includes(route)) {
    await page.locator('[data-home-auth]').click();
    if (route === 'signup') await page.locator('.auth-card-head button').click();
    if (route === 'verify-email') {
      await page.locator('input[type=email]').fill('preview@localhost');
      await page.locator('input[type=password]').fill('local-fixture-only');
      await page.locator('.auth-card .primary').click();
      await page.locator('.auth-card.center').waitFor();
    }
    return;
  }
  await page.locator('[data-home-destination="archive"]').first().click();
  await page.locator('.archive-root').waitFor();
  if (route === 'archive') return;
  if (route === 'account') return page.locator('.account-toggle').click();
  const archiveRoutes = {
    dna: 'סקירת DNA', statistics: 'סטטיסטיקות', bots: 'בוטים', 'bot-game': 'בוטים',
    legends: 'אגדות', blindfold: 'שחמט עיוור', puzzles: 'פאזלים',
    'puzzle-streak': 'פאזלים', rush: 'פאזלים', openings: 'פתיחות', clock: 'שעון',
    'daily-streak': 'רצף יומי', admin: 'Admin',
  };
  if (archiveRoutes[route]) await btn(page, archiveRoutes[route]);
  else {
    await btn(page, 'לוח וניתוח');
    if (route === 'adaptive') await btn(page, 'Adaptive');
    if (route === 'windows') await btn(page, 'Windows');
    if (route === 'admin-login') await btn(page, 'Admin');
  }
  if (route === 'bot-game') {
    await page.locator('.bot-card:not([disabled])').first().click();
    await page.locator('.bot-controls .primary').click();
    await btn(page, 'הצע תיקו');
  }
  if (route === 'puzzle-streak') await page.locator('.puzzle-tabs button').nth(1).click();
  if (route === 'rush') await page.locator('.puzzle-tabs button').nth(2).click();
  if (route === 'openings') {
    await page.locator('.open-item').first().click();
    await page.locator('.open-board-wrap svg').waitFor();
  }
  if (route === 'clock') {
    await page.locator('.clock-box-main.white-side').click();
    await page.locator('.pause-btn').click();
  }
  if (route === 'blindfold') {
    await page.locator('.blindfold-cell[data-square="e2"]').click();
    assert.ok(await page.locator('.blindfold-cell.legal').count(), 'legal-move dots remain available');
  }
}
async function styleSnapshot(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('html,body,#root,.daily-rhythm,.daily-rhythm *')).map(element => {
    const values = {};
    for (const pseudo of [null, '::before', '::after']) {
      const style = getComputedStyle(element, pseudo);
      values[pseudo || 'self'] = Object.fromEntries(Array.from(style, name => [name, style.getPropertyValue(name)]));
    }
    return values;
  }));
}
try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(base)).ok) break; } catch (error) { if (error.cause?.code !== 'ECONNREFUSED') throw error; }
    assert.ok(i < 60, 'local test server must start');
    await delay(250);
  }
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, channel: process.argv.includes('--chrome') ? 'chrome' : undefined });
  for (const [id, title, route] of selectedScenarios) {
    for (const [size, width, lang] of [['desktop-he', 1440, 'he'], ['mobile-en', 390, 'en']]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
      if (route === 'welcome') await context.addInitScript(() => localStorage.setItem('tabia_onboarding_seen', '1'));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/ui-theme.css', request => request.fulfill({ contentType: 'text/css', body: '' }));
      await page.route('**/api/auth?*', request => {
        const action = new URL(request.request().url()).searchParams.get('action');
        if (action === 'session' && ['welcome', 'signup', 'login', 'verify-email'].includes(route)) return request.fulfill({ json: { authenticated: false } });
        return request.continue();
      });
      if (route === 'verify-email') await page.route('**/api/auth', request => request.fulfill({ json: { ok: true, emailVerificationRequired: true } }));
      if (route.startsWith('/__theme-')) {
        const html = gateTemplates.withUiTheme(route === '/__theme-gate' ? gateTemplates.gatePage() : gateTemplates.humanPage());
        await page.route('**' + route, request => request.fulfill({ contentType: 'text/html', body: html }));
        await page.route('**/vendor/human-check.js', request => request.fulfill({ contentType: 'text/javascript', body: '' }));
        await page.route('**/vendor/altcha/altcha.i18n.min.js', request => request.fulfill({ contentType: 'text/javascript', body: '' }));
      }
      await page.route('**/api/admin-auth', request => request.fulfill({
        json: { authenticated: route === 'admin', email: route === 'admin' ? 'admin@localhost' : '' },
      }));
      await page.route('**/api/sync*', request => request.fulfill({
        json: { ok: true, progress: {}, appState: {}, games: [] },
      }));
      await enter(page, route);
      await page.setViewportSize({ width, height: 1000 });
      if (lang === 'en') {
        const language = page.locator('.language-toggle,#lang-toggle');
        if (await language.count()) await language.first().click();
        else if (!route.startsWith('/__theme-')) await page.evaluate(async () => (await import('/src/i18n.js')).setLang('en'));
      }
      await page.waitForTimeout(800);
      await page.waitForFunction(() => !Array.from(document.querySelectorAll('.sync-status')).some(element => /מסנכרן|Syncing/.test(element.textContent)));
      if (!route.startsWith('/')) await page.locator('main').waitFor();
      const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }));
      const content = await page.locator('body').innerText();
      const protectedStyles = route === 'daily-streak' ? await styleSnapshot(page) : null;
      const before = `${id}-${size}-old.png`;
      await page.screenshot({ path: `${output}/${before}`, fullPage: true, animations: 'disabled' });
      await page.addStyleTag({ content: css });
      await page.waitForTimeout(100);
      if (route === 'daily-streak') assert.deepEqual(await styleSnapshot(page), protectedStyles, 'Daily Streak computed styles and pseudo-elements must remain identical');
      else {
        assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()), '#ed882d', id + ': orange accent');
        const canvas = await page.evaluate(() => ({
          color: getComputedStyle(document.body).backgroundColor,
          rootToken: getComputedStyle(document.documentElement).getPropertyValue('--canvas-parchment'),
          bodyToken: getComputedStyle(document.body).getPropertyValue('--canvas-parchment'),
          inline: document.body.getAttribute('style'),
        }));
        assert.equal(canvas.color, 'rgb(8, 7, 6)', id + ': black canvas ' + JSON.stringify(canvas));
      }
      const overflow = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        elements: Array.from(document.querySelectorAll('body *')).filter(element => {
          const rect = element.getBoundingClientRect();
          return rect.width > innerWidth && getComputedStyle(element).position !== 'fixed';
        }).slice(0, 8).map(element => ({ tag: element.tagName, class: element.getAttribute('class'), width: element.getBoundingClientRect().width })),
      }));
      assert.ok(overflow.width <= width + 1, `${id}/${size}: horizontal overflow ${JSON.stringify(overflow)}`);
      assert.equal(await page.locator('body').innerText(), content, `${id}: theme must not change text/data`);
      assert.equal(await page.evaluate(() => JSON.stringify({ ...localStorage })), storage, `${id}: theme must not change stored progress/settings`);
      assert.deepEqual(errors, [], `${id}: browser exceptions`);
      const after = `${id}-${size}-new.png`;
      await page.screenshot({ path: `${output}/${after}`, fullPage: true, animations: 'disabled' });
      captures.push({ id, title, size, language: route.startsWith('/__theme-') ? 'he' : lang, before, after });
      if (route === 'welcome' || route === 'home-account') {
        assert.equal(await page.locator('.ch-board svg').count(), 2, 'home renders both official sample boards');
        assert.match(await page.locator('.ch-hero-board').evaluate(element => getComputedStyle(element).transform), /^matrix3d\(/, 'hero retains the approved tilted-board design');
        assert.equal(await page.locator('.ch-board-frame').evaluate(element => getComputedStyle(element).transform), 'none', 'interactive sample board stays flat');
        const played = await page.locator('.ch-review-demo .ch-board').innerHTML();
        await page.locator('[data-home-move="alternative"]').click();
        await page.waitForFunction(() => document.querySelector('.ch-review-demo .ch-board').getAttribute('aria-label').includes('d4'));
        assert.notEqual(await page.locator('.ch-review-demo .ch-board').innerHTML(), played, 'alternative updates the rendered position');
        await page.locator('[data-home-move="played"]').click();
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.evaluate(() => scrollTo(0, 400));
        await page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector('.ch-hero-board')).rotate) > 0);
        await page.locator('.ch-motion').click();
        await page.evaluate(() => scrollTo(0, 400));
        await page.waitForTimeout(50);
        assert.equal(await page.locator('.ch-hero-board').evaluate(element => getComputedStyle(element).rotate), '0deg', 'manual reduced motion stops decorative rotation');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.locator('.ch-motion').click();
        await page.evaluate(() => scrollTo(0, 400));
        await page.waitForTimeout(50);
        assert.equal(await page.locator('.ch-hero-board').evaluate(element => getComputedStyle(element).rotate), '0deg', 'system reduced motion stops decorative rotation');
        if (route === 'welcome') {
          await page.locator('[data-home-destination="dna"]').first().click();
          await page.locator('.auth-card').waitFor();
          assert.equal(await page.locator('input[type=password]').count(), 1, 'signed-out tool links lead to sign in, not private tools');
          await page.route('**/api/auth', request => request.fulfill({
            json: { ok: true, user: { id: 'home-login-fixture', email: 'preview@localhost' } },
          }));
          await page.locator('input[type=email]').fill('preview@localhost');
          await page.locator('input[type=password]').fill('local-fixture-only');
          await page.locator('.auth-card .primary').click();
          await page.locator('.cinematic-home').waitFor();
          assert.equal(await page.locator('[data-home-auth]').count(), 0, 'successful sign-in lands on the authenticated homepage');
        } else {
          await page.locator('[data-home-destination="archive"]').first().click();
          await page.locator('.archive-root').waitFor();
          await page.locator('[data-home-return]').click();
          await page.locator('.cinematic-home').waitFor();
          assert.equal(await page.locator('[data-home-auth]').count(), 0, 'signed-in home retains account state on return');
          await page.locator('[data-home-destination="review"]').first().click();
          await page.locator('.board svg').first().waitFor();
          assert.equal(await page.locator('.ch-board').count(), 0, 'home boards are removed when entering the real review');
          await page.reload();
          await page.locator('.cinematic-home').waitFor();
          const request = page.waitForRequest(request => request.url().includes('/api/chess-dna?action=latest'));
          await page.locator('[data-home-destination="dna"]').first().click();
          assert.equal((await request).method(), 'GET', 'Home DNA link uses the existing saved-report loader');
          await page.locator('.dna-root').waitFor();
        }
        assert.deepEqual(errors, [], 'home interaction and navigation must not raise browser exceptions');
      }
      await context.close();
    }
    console.log('PASS:', id);
  }
  const live = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await live.goto(base);
  await live.locator('[data-home-destination="archive"]').first().click();
  await live.locator('.archive-root').waitFor();
  assert.equal(await live.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()), '#ed882d', 'production CSS import loads without test injection');
  await btn(live, /רצף יומי|Daily streak/);
  await live.locator('.rhythm-day').first().waitFor();
  assert.equal(await live.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()), '#0066cc', 'entering Daily Streak restores the original inherited tokens');
  await btn(live, /חזרה לארכיון|Back to archive/);
  await live.locator('.archive-root').waitFor();
  assert.equal(await live.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()), '#ed882d', 'leaving Daily Streak restores the new theme');
  await live.close();
  console.log('PASS: production stylesheet import and live Daily Streak navigation isolation');
  const gallery = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Veyra — old / black-orange comparison</title>
<style>body{margin:0;background:#080706;color:#f4f0e9;font:16px system-ui}header,main{max-width:1500px;margin:auto;padding:24px}header{position:sticky;top:0;background:#080706f5;z-index:2;border-bottom:1px solid #40362b}h1{margin:0;font-size:26px}p{color:#b0a79b}a{color:#ffad66}nav{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px}details{margin:16px 0;border:1px solid #40362b;border-radius:12px;padding:16px;scroll-margin-top:260px}summary{cursor:pointer;font-size:20px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:16px 0;min-width:0}figcaption{padding:12px;background:#211a14}img{width:100%;height:auto;display:block}h3{color:#ffad66}@media(max-width:650px){.pair{grid-template-columns:1fr}header{position:static}}</style>
<header><h1>Existing pages → black / orange</h1><p>Same real application, same state. Old: theme disabled. New: theme enabled. Home is a layout replacement: both Home columns show the new cinematic layout, not the removed welcome card. Local test accounts only; no live personal data. Daily Streak is unchanged. These are screenshot comparisons, not working page copies. Gates retain their existing Hebrew-only content; human verification shows the shell before the challenge starts.</p><nav>${selectedScenarios.map(([id,title])=>`<a href="#${id}" onclick="document.getElementById('${id}').open=true">${title}</a>`).join('')}</nav></header><main>
${selectedScenarios.map(([id,title])=>`<details id="${id}" ${id===selectedScenarios[0][0]?'open':''}><summary>${title}</summary>${captures.filter(item=>item.id===id).map(item=>`<h3>${item.size==='desktop-he'?'Desktop':'Mobile'} · ${item.language==='he'?'Hebrew':'English mode'}</h3><div class="pair"><figure><figcaption>OLD</figcaption><a href="${item.before}" target="_blank"><img loading="lazy" src="${item.before}" alt="${title} before"></a></figure><figure><figcaption>${id==='daily-streak'?'UNCHANGED':'NEW · BLACK / ORANGE'}</figcaption><a href="${item.after}" target="_blank"><img loading="lazy" src="${item.after}" alt="${title} after"></a></figure></div>`).join('')}</details>`).join('')}
</main></html>`;
  await writeFile(`${output}/index.html`, gallery);
  await writeFile(`${output}/results.json`, JSON.stringify({ scenarios: selectedScenarios.length, captures: captures.length, checks: 'palette, overflow, content, storage, browser exceptions, protected Daily Streak computed styles', captures }, null, 2));
  console.log(`PASS: ${selectedScenarios.length} screens, ${captures.length} old/new pairs. Gallery: ${output}/index.html`);
} finally {
  await browser?.close();
  server.kill();
}
