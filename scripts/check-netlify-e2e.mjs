// Puzzle job end to end through the REAL Netlify bundler: npm run check:netlify-e2e
// zip-it-and-ship-it (the library `netlify deploy` / Netlify's build use; it bundles these .mjs functions with
// esbuild to CommonJS) bundles netlify/functions with netlify.toml's included_files. Then the BUNDLED
// handlers run from their own bundle directory, as on Lambda (/var/task = LAMBDA_TASK_ROOT = cwd):
// login (auth) -> start a DNA job (puzzles) -> the background function runs it (puzzle-refill-background,
// real WASM engine from the bundle) -> job status is done -> the new puzzles are served.
// Network: none, except a one-time download of zip-it-and-ship-it when it is not installed
// (it is not a dependency of this repo, so package-lock.json stays as it is).
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ZISI_VERSION = '16.6.0'; // the version netlify-cli 27.16 ships
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);

async function loadZisi() {
  try { return await import('@netlify/zip-it-and-ship-it'); } catch { /* not installed here */ }
  const dir = join(tmpdir(), `veyra-zisi-${ZISI_VERSION}`);
  const main = join(dir, 'node_modules/@netlify/zip-it-and-ship-it/dist/main.js');
  if (!existsSync(main)) execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install', '--no-save', '--no-audit', '--no-fund', '--prefix', dir, `@netlify/zip-it-and-ship-it@${ZISI_VERSION}`], { stdio: 'ignore', shell: process.platform === 'win32' });
  return import(pathToFileURL(main).href);
}

let failures = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${!ok && detail ? ` (${detail})` : ''}`); if (!ok) failures += 1; };

// 1. Bundle exactly as Netlify does, with netlify.toml's [functions] included_files.
const toml = readFileSync(join(root, 'netlify.toml'), 'utf8');
const includedFiles = JSON.parse(toml.match(/included_files\s*=\s*(\[[^\]]*\])/)[1]);
const { zipFunctions } = await loadZisi();
const dest = mkdtempSync(join(tmpdir(), 'veyra-netlify-'));
const quietWarn = console.warn; console.warn = () => {};
const fns = await zipFunctions(join(root, 'netlify/functions'), dest, { archiveFormat: 'none', basePath: root, repositoryRoot: root, config: { '*': { includedFiles } } });
console.warn = quietWarn;
const fn = (name) => fns.find((f) => f.name === name);
check('zip-it-and-ship-it bundled auth, puzzles and puzzle-refill-background', ['auth', 'puzzles', 'puzzle-refill-background'].every(fn), fns.map((f) => f.name).join(','));
check('the background function is bundled the way Netlify ships it (esbuild, CommonJS) with its included files', fn('puzzle-refill-background')?.bundler === 'esbuild' && includedFiles.every((f) => existsSync(join(fn('puzzle-refill-background').path, f))), JSON.stringify({ bundler: fn('puzzle-refill-background')?.bundler }));

// 2. Lambda environment: each function runs from its own bundle directory. Fake Supabase/chess.com over fetch.
const U = { id: crypto.randomUUID(), email: 'bundle.e2e@example.test', user_metadata: {} };
Object.assign(process.env, { SUPABASE_URL: 'https://fake-project.supabase.test', SUPABASE_ANON_KEY: crypto.randomUUID(), SUPABASE_SECRET_KEY: crypto.randomUUID(), AUTH_SESSION_SECRET: crypto.randomBytes(32).toString('base64url'), BOT_CHALLENGE_SECRET: crypto.randomBytes(32).toString('base64url'), PUZZLES_SERVER_ENABLED: '1' });
delete process.env.RESEND_API_KEY;
const { createFakeSupabase } = await import(pathToFileURL(join(root, 'scripts/lib/fake-supabase.mjs')).href);
const db = createFakeSupabase();
db.seed('user_app_state', [{ user_id: U.id, data: { usernames: { chesscom: 'Oren', lichess: '' } } }]);
const games = ['blunder_white', 'blunder_black'].map((n, i) => ({ url: `https://www.chess.com/game/live/${n}`, end_time: 1790000000 - i * 100, pgn: readFileSync(join(root, 'scripts/fixtures/puzzles', `${n}.pgn`), 'utf8') }));
const reply = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const seen = { chesscom: 0, rest: 0 };
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(String(url));
  if (u.hostname === 'api.chess.com') { seen.chesscom += 1; return reply(200, u.pathname.endsWith('/games/archives') ? { archives: ['https://api.chess.com/pub/player/oren/games/2026/10'] } : { games }); }
  if (u.pathname === '/auth/v1/token') return reply(200, { access_token: `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: U.id, session_id: crypto.randomUUID(), exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.sig`, refresh_token: crypto.randomUUID(), user: U });
  if (u.pathname === '/auth/v1/user') return reply(200, U);
  if (u.pathname === '/rest/v1/rpc/auth_session_active') return reply(200, true); // present once the logout fix (#117) is in
  if (u.pathname.startsWith('/rest/v1/')) {
    seen.rest += 1;
    try {
      const out = await db(u.pathname.slice('/rest/v1/'.length) + u.search, init);
      return reply(out === undefined ? 204 : 200, out ?? undefined);
    } catch (error) {
      if (/unknown table/.test(error.message)) return reply(200, []);
      return reply(error.status || 500, error.body || { message: error.message });
    }
  }
  return reply(404, { msg: `unexpected ${u.href}` });
};
const load = (name) => { process.env.LAMBDA_TASK_ROOT = fn(name).path; process.chdir(fn(name).path); return require(join(fn(name).path, `${name}.js`)); };
const run = async (name, event) => { const mod = load(name); return typeof mod.handler === 'function' ? mod.handler(event) : { statusCode: 0, body: `bundled ${name} exports no handler (exports: ${Object.keys(mod).join(',')})` }; };

const ORIGIN = 'https://veyra.test';
const human = `__Host-human=${load('_lib').makeHumanToken().token}`;
let ip = 0;
const ev = (method, path, { query = {}, body, cookie = '' } = {}) => ({ httpMethod: method, path, rawUrl: `${ORIGIN}${path}`, queryStringParameters: query, headers: { origin: ORIGIN, referer: `${ORIGIN}/`, host: 'veyra.test', 'sec-fetch-site': 'same-origin', cookie: [human, cookie].filter(Boolean).join('; '), 'x-nf-client-connection-ip': `198.51.100.${(ip += 1)}` }, body: body === undefined ? undefined : JSON.stringify(body) });
const parse = (res) => { try { return JSON.parse(res.body || '{}'); } catch { return {}; } };

const login = await run('auth', ev('POST', '/api/auth', { body: { action: 'login', email: U.email, password: crypto.randomUUID() } }));
const cookie = String(login.headers?.['set-cookie'] || '').split(';')[0];
check('bundled auth: login answers 200 with a session cookie', login.statusCode === 200 && cookie.startsWith('__Host-tabia_session='), `${login.statusCode} ${login.body}`);

const state0 = await run('puzzles', ev('GET', '/api/puzzles', { query: { action: 'state' }, cookie }));
check('bundled puzzles: GET state answers 200 (was 503 sync_unavailable on main)', state0.statusCode === 200, `${state0.statusCode} ${state0.body}`);

const start = await run('puzzles', ev('POST', '/api/puzzles', { query: { action: 'dna' }, body: { source: 'chesscom', limit: 2 }, cookie }));
const jobId = parse(start).jobId;
check('bundled puzzles: POST dna queues a job (202 + jobId)', start.statusCode === 202 && /^[0-9a-f-]{36}$/.test(jobId || ''), `${start.statusCode} ${start.body}`);

const t0 = Date.now();
const bg = await run('puzzle-refill-background', ev('POST', '/api/puzzle-refill-background', { body: { jobId }, cookie }));
check('bundled background function runs the job to the end (outcome done)', bg.statusCode === 200 && parse(bg).outcome === 'done', `${bg.statusCode} ${bg.body}`);
check('  ...it read the chess.com games and loaded the WASM engine from the bundle', seen.chesscom >= 2 && db.rows('puzzle_game_log').length === 2, JSON.stringify({ chesscom: seen.chesscom, gamesLogged: db.rows('puzzle_game_log').length, ms: Date.now() - t0 }));

const status = await run('puzzles', ev('GET', '/api/puzzles', { query: { action: 'job', id: jobId }, cookie }));
check('bundled puzzles: GET job reports status done with a report', status.statusCode === 200 && parse(status).job?.status === 'done' && parse(status).job?.report, `${status.statusCode} ${status.body}`);
const made = db.rows('user_puzzles').filter((r) => r.user_id === U.id);
check('the job stored puzzles for this user (one per injected blunder, at least 2)', made.length >= 2, String(made.length));
const again = await run('puzzle-refill-background', ev('POST', '/api/puzzle-refill-background', { body: { jobId }, cookie }));
check('a finished job is not run twice', parse(again).outcome === 'not_runnable', again.body);
const stranger = await run('puzzle-refill-background', ev('POST', '/api/puzzle-refill-background', { body: { jobId } }));
check('the background function refuses a call without a session (401)', stranger.statusCode === 401, `${stranger.statusCode}`);

process.chdir(root);
if (failures) { console.log(`FAIL: ${failures} Netlify bundle end-to-end check(s) failed.`); process.exit(1); }
console.log(`PASS: a puzzle job runs end to end through functions bundled by zip-it-and-ship-it ${ZISI_VERSION}, as Netlify ships them.`);
