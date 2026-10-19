// Optional browser check for the personal-puzzle screens (not part of check:release: needs Playwright + chromium).
// Serves dist/ statically, mocks /api/*, and drives the real UI. Usage:
//   REACT_UMD_DIR=<dir with react@18.2.0 + react-dom@18.2.0 node_modules> node scripts/e2e-puzzles.mjs
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const req = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/home/claude/.npm-global/lib/node_modules/playwright']) { try { ({ chromium } = req(p)); break; } catch { /* next */ } }
if (!chromium) { console.log('SKIP: playwright not available'); process.exit(0); }
const reactDir = process.env.REACT_UMD_DIR;
if (!reactDir) { console.log('SKIP: set REACT_UMD_DIR'); process.exit(0); }
const reactJs = await readFile(join(reactDir, 'node_modules/react/umd/react.production.min.js'), 'utf8');
const reactDomJs = await readFile(join(reactDir, 'node_modules/react-dom/umd/react-dom.production.min.js'), 'utf8');

const seeds = JSON.parse(await readFile(join(root, 'data/puzzle-seed.json'), 'utf8')).puzzles;
const dto = (p, i) => ({ id: p.id, fen: p.fen, solution: p.solution, accepted: p.solution, played: '', motif: p.motif || 'general', phase: 'middlegame', rating: p.rating || 800, class: 'mistake', origin: 'harvest', source: { date: '2026-10-01', opponent: 'rival' + i, moveNumber: 20 + i, provider: 'chesscom', url: '' } });
const all = seeds.map(dto);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.wasm': 'application/wasm' };
const server = http.createServer(async (rq, rs) => {
  let path = decodeURIComponent(new URL(rq.url, 'http://x').pathname);
  if (path.endsWith('/')) path += 'index.html';
  try {
    const f = join(root, 'dist', path);
    if (!(await stat(f)).isFile()) throw 0;
    rs.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' });
    rs.end(await readFile(f));
  } catch { rs.writeHead(404); rs.end('nf'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port;

const json = (status, body) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });
const results = [];
function check(name, ok, detail = '') { results.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  -> ' + detail)); }

function makeState(mode) {
  const pool = { active: 40, mastered: 2, total: 42, fresh: 30, cap: 150, lowWater: 45, byMotif: {}, byPhase: {} };
  return {
    ok: true, serverTime: new Date().toISOString(), pool,
    kits: { regular: { id: 'kr1', builtAt: new Date().toISOString(), puzzles: all.slice(0, 15) }, rush: { id: 'ku1', builtAt: new Date().toISOString(), puzzles: all.slice(0, 24) } },
    rushBest: 3, profile: { puzzleElo: 900, nextFocus: 'hanging_piece' }, job: null, refillNeeded: false,
  };
}

async function newPage(browser, opts = {}) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: opts.viewport || { width: 1200, height: 1400 }, locale: 'he-IL' });
  const page = await ctx.newPage();
  const log = { posts: [], errors: [], state: opts.state || makeState(), auth: opts.auth !== false, dnaStarted: false, mode: opts.mode || 'ok', jobPolls: 0 };
  page.on('pageerror', (e) => log.errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) log.errors.push(m.text()); });
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === 'cdnjs.cloudflare.com') {
      if (/react-dom/.test(url.pathname)) return route.fulfill({ status: 200, contentType: 'text/javascript', body: reactDomJs });
      if (/react/.test(url.pathname)) return route.fulfill({ status: 200, contentType: 'text/javascript', body: reactJs });
    }
    if (url.hostname !== '127.0.0.1') return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const action = url.searchParams.get('action');
    if (url.pathname === '/api/auth') {
      if (action === 'status') return route.fulfill(json(200, { configured: true }));
      if (action === 'session') return route.fulfill(log.auth ? json(200, { authenticated: true, user: { id: 'u1', email: 'oren@example.com' } }) : json(200, { authenticated: false }));
      return route.fulfill(json(200, { ok: true }));
    }
    if (url.pathname === '/api/puzzles') {
      if (log.mode === 'offline') return route.abort('failed');
      if (log.mode === 'html') return route.fulfill({ status: 200, contentType: 'text/html', body: '<html>offline</html>' });
      if (log.mode === 'auth401') return route.fulfill(json(401, { ok: false, error: 'UNAUTHENTICATED' }));
      if (log.mode === 'disabled') return route.fulfill(json(404, { ok: false, error: 'DISABLED' }));
      if (action === 'state') return route.fulfill(json(200, { ...log.state, job: log.state.job && log.state.job.status === 'running' ? log.state.job : null }));
      if (action === 'checkpoint') {
        const body = JSON.parse(route.request().postData() || '{}');
        log.posts.push(body);
        return route.fulfill(json(200, { ok: true, accepted: (body.attempts || []).length, duplicates: 0, rejected: [], state: { pool: log.state.pool, profile: log.state.profile, rushBest: Math.max(log.state.rushBest, body.rushRun ? body.rushRun.score : 0) }, refillNeeded: false }));
      }
      if (action === 'dna') {
        log.dnaStarted = true;
        log.state = { ...log.state, job: { id: 'j1', kind: 'dna', status: 'running', gamesDone: 4, gamesTotal: 10, puzzlesAdded: 6, error: null, updatedAt: new Date().toISOString() } };
        return route.fulfill(json(202, { ok: true, job: log.state.job }));
      }
      if (action === 'job') {
        log.jobPolls++;
        const j = { ...log.state.job, gamesDone: Math.min(10, 4 + log.jobPolls * 3), status: log.jobPolls >= 2 ? 'done' : 'running', puzzlesAdded: 6 + log.jobPolls * 5 };
        log.state = { ...log.state, job: j };
        return route.fulfill(json(200, { ok: true, job: j }));
      }
      return route.fulfill(json(200, { ok: true }));
    }
    return route.fulfill(json(200, { ok: true }));
  });
  await page.goto(base + '/');
  return { ctx, page, log };
}

// Drag a piece on the cm-chessboard svg. Orientation follows the side to move (white at the bottom).
async function dragMove(page, fen, uci) {
  const white = fen.split(' ')[1] === 'w';
  const box = await page.locator('.board svg').first().boundingBox();
  const sq = (s) => {
    const f = s.charCodeAt(0) - 97, r = Number(s[1]) - 1;
    const col = white ? f : 7 - f, row = white ? 7 - r : r;
    return { x: box.x + (col + 0.5) * box.width / 8, y: box.y + (row + 0.5) * box.height / 8 };
  };
  const a = sq(uci.slice(0, 2)), b = sq(uci.slice(2, 4));
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await page.mouse.up();
}
async function openPuzzles(page) {
  await page.getByRole('button', { name: /פאזלים/ }).first().click();
  await page.waitForSelector('.puzzle-tabs', { timeout: 8000 });
}
const hasHorizontalScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

const browser = await chromium.launch();
try {
  // 1. Training: all 15 puzzles solved, hint, wrong move, checkpoint and summary.
  {
    const { ctx, page, log } = await newPage(browser);
    await openPuzzles(page);
    await page.waitForSelector('.puzzle-dna', { timeout: 8000 });
    check('training tab shows DNA panel and board', await page.locator('.board svg').count() > 0);
    const kit = log.state.kits.regular.puzzles;
    const p0 = kit[0];
    await dragMove(page, p0.fen, p0.solution[0]);
    const fb = await page.locator('.puzzle-feedback').first().innerText({ timeout: 2000 }).catch(() => '');
    check('correct move shows positive feedback', /נכון/.test(fb), fb);
    for (let i = 1; i < 15; i++) {
      await page.waitForFunction((n) => [...document.querySelectorAll('.puzzle-stat div')].some((d) => d.textContent === n + '/15'), i + 1, { timeout: 6000 });
      await page.waitForTimeout(150);
      await dragMove(page, kit[i].fen, kit[i].solution[0]);
    }
    await page.waitForTimeout(1200);
    const summary = await page.locator('.puzzle-summary').count();
    check('15-puzzle kit ends with a summary card', summary === 1, 'summary=' + summary + ' posts=' + log.posts.length);
    const solvedTxt = summary ? await page.locator('.puzzle-summary').innerText() : '';
    check('summary says all 15 solved', /15/.test(solvedTxt), solvedTxt.replace(/\n/g, ' | '));
    await page.waitForTimeout(1500);
    check('results were sent to the server (checkpoint)', log.posts.length >= 1, 'posts=' + log.posts.length);
    const sent = log.posts.flatMap((p) => p.attempts || []);
    check('checkpoint carries attempts with ids', sent.length >= 1 && sent.every((a) => a.id && a.puzzleId), JSON.stringify(sent[0] || {}));
    check('no page errors in training', log.errors.length === 0, log.errors.join(' | '));
    await ctx.close();
  }
  // 2. DNA start and progress.
  {
    const { ctx, page, log } = await newPage(browser);
    await openPuzzles(page);
    await page.waitForSelector('.puzzle-dna');
    await page.locator('.puzzle-dna button.primary').click();
    await page.waitForSelector('.puzzle-progress', { timeout: 8000 });
    check('DNA starts a job and shows progress', log.dnaStarted);
    await page.waitForTimeout(11500);
    const res = await page.locator('.puzzle-dna').innerText();
    check('DNA reaches done state with a result line', log.jobPolls >= 2 && !(await page.locator('.puzzle-progress').count()), res.replace(/\n/g, ' | '));
    check('no page errors in DNA', log.errors.length === 0, log.errors.join(' | '));
    await ctx.close();
  }
  // 3. Rush: countdown, solve a few, three strikes end the run and it saves.
  {
    const { ctx, page, log } = await newPage(browser);
    await openPuzzles(page);
    await page.locator('#ptab-rush').click();
    await page.getByRole('button', { name: 'התחל' }).click();
    await page.waitForSelector('.rush-countdown', { timeout: 4000 });
    check('Rush shows a countdown', true);
    await page.waitForSelector('[role=timer]', { timeout: 6000 });
    await page.waitForFunction(() => !document.querySelector('.rush-countdown'), null, { timeout: 8000 });
    const rk = log.state.kits.rush.puzzles;
    const placement = (fen) => fen.split(' ')[0];
    const boardPlacement = () => page.evaluate(() => {
      const rows = Array.from({ length: 8 }, () => Array(8).fill(''));
      document.querySelectorAll('.board svg [data-piece]').forEach((g) => {
        const sq = g.getAttribute('data-square'); const pc = g.getAttribute('data-piece');
        rows[8 - Number(sq[1])][sq.charCodeAt(0) - 97] = pc[0] === 'w' ? pc[1].toUpperCase() : pc[1];
      });
      return rows.map((r) => r.join('').replace(/(\s*)/g, '').split('').length ? r.map((c) => c || '1').join('').replace(/1+/g, (m) => m.length).replace(/^$/, '8') : '8').join('/');
    });
    const findCur = async () => { const pl = await boardPlacement(); return rk.find((p) => placement(p.fen) === pl) || null; };
    async function wrongMove(fen, accepted) {
      return page.evaluate(([f, acc]) => {
        const C = window.ChessLib.Chess; const g = new C(f);
        for (const m of g.moves({ verbose: true })) { const u = m.from + m.to + (m.promotion || ''); if (acc.includes(u)) continue; const t = new C(f); t.move({ from: m.from, to: m.to, promotion: m.promotion }); if (t.isCheckmate()) continue; return u; }
        return null;
      }, [fen, accepted]);
    }
    await page.waitForTimeout(500);
    const c1 = await findCur();
    check('Rush board shows a puzzle from the kit', !!c1, 'board did not match any kit FEN');
    if (c1) {
      await dragMove(page, c1.fen, c1.solution[0]);
      await page.waitForFunction(() => [...document.querySelectorAll('.puzzle-stat div')].some((d) => d.textContent === '1'), null, { timeout: 4000 }).catch(() => {});
      const score1 = await page.locator('.puzzle-stat div').nth(1).innerText();
      check('Rush counts a correct answer', score1.trim() === '1', 'score=' + score1);
      for (let strike = 1; strike <= 4; strike++) {
        if (await page.locator('.rush-end').count()) break;
        await page.waitForTimeout(600);
        const c = await findCur();
        if (!c) { check('Rush shows puzzle before strike ' + strike, false, 'no match'); break; }
        const w = await wrongMove(c.fen, c.accepted);
        await dragMove(page, c.fen, w);
        await page.waitForFunction((n) => document.querySelectorAll('.rush-strike.on').length >= n || !!document.querySelector('.rush-end'), strike, { timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(1500);
        if (process.env.E2E_DEBUG) console.log('strike', strike, 'move', w, 'strikes on', await page.locator('.rush-strike.on').count(), 'phase text', (await page.locator('.rush-layout').innerText().catch(() => '')).replace(/\n/g, ' | ').slice(0, 160));
      }
      await page.waitForSelector('.rush-end', { timeout: 8000 }).catch(() => {});
      check('Rush ends after three strikes', await page.locator('.rush-end').count() === 1);
      await page.waitForTimeout(1800);
      const run = log.posts.map((p) => p.rushRun).filter(Boolean)[0];
      check('Rush run was saved with score 1 and 3 strikes', run && run.score === 1 && run.strikes === 3, JSON.stringify(run || null));
      const endTxt = await page.locator('.rush-end').innerText().catch(() => '');
      check('Rush end screen says saved', /נשמרה/.test(endTxt), endTxt.replace(/\n/g, ' | '));
    }
    await page.getByRole('button', { name: 'שחק שוב' }).click().catch(() => {});
    await page.waitForSelector('[role=timer]', { timeout: 8000 });
    await page.waitForFunction(() => !document.querySelector('.rush-countdown'), null, { timeout: 8000 });
    const t0 = await page.locator('[role=timer]').innerText();
    await page.waitForTimeout(2200);
    const t1 = await page.locator('[role=timer]').innerText();
    check('Rush clock counts down', t0 !== t1, t0 + ' -> ' + t1);
    await page.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }));
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForTimeout(400);
    const paused = await page.getByText('מושהה').count();
    check('hidden tab pauses Rush', paused > 0);
    await page.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }));
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    check('no page errors in Rush', log.errors.length === 0, log.errors.join(' | '));
    await ctx.close();
  }
  // 4. Offline, html (service worker), 401, disabled, signed out.
  for (const [mode, re, label] of [['offline', /אין חיבור/, 'offline'], ['html', /אין חיבור/, 'html instead of json'], ['auth401', /ההתחברות פגה/, '401'], ['disabled', /עוד לא נפתחו/, 'disabled']]) {
    const { ctx, page, log } = await newPage(browser, { mode });
    await openPuzzles(page);
    await page.waitForTimeout(1200);
    const body = await page.locator('main').innerText();
    check('screen for ' + label, re.test(body), body.slice(0, 160).replace(/\n/g, ' | '));
    check('no page errors for ' + label, log.errors.length === 0, log.errors.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page } = await newPage(browser, { auth: false });
    await page.getByRole('button', { name: /פאזלים/ }).first().click().catch(() => {});
    await page.waitForTimeout(1200);
    const body = await page.locator('body').innerText();
    check('signed-out user is not stuck (page renders)', body.length > 20);
    await ctx.close();
  }
  // 5. Phone width.
  {
    const { ctx, page, log } = await newPage(browser, { viewport: { width: 390, height: 800 } });
    await openPuzzles(page);
    await page.waitForSelector('.puzzle-dna');
    check('no horizontal scroll at 390px (training)', !(await hasHorizontalScroll(page)));
    await page.locator('#ptab-rush').click();
    await page.waitForTimeout(300);
    check('no horizontal scroll at 390px (rush)', !(await hasHorizontalScroll(page)));
    const small = await page.evaluate(() => [...document.querySelectorAll('.puzzle-page button')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height < 40; }).map((b) => b.textContent).slice(0, 5));
    check('puzzle buttons are at least 40px tall on phone', small.length === 0, small.join(','));
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `FAILED ${failed.length}/${results.length}` : `PASS: ${results.length}/${results.length} browser checks`);
process.exit(failed.length ? 1 : 0);
