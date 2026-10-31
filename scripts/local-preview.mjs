#!/usr/bin/env node
// Local review server: serves the built site (dist/) on 127.0.0.1 and answers /api/* with a fake,
// signed-in "Local preview" account so every page can be reviewed without Netlify or Supabase.
// Nothing leaves this computer: no network calls, no keys, data lives in memory until the server stops.
// Not deployed: Netlify publishes dist/ and the real functions, never this script.
// Usage: npm run build ; npm run preview:local   (optional: --port 4180, --signed-out, --seed-weekly)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';

const args = process.argv.slice(2);
const argValue = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const PORT = Number(argValue('--port', process.env.PORT || 4173));
const HOST = '127.0.0.1';
const ROOT = resolve('dist');
let signedIn = !args.includes('--signed-out');

if (!existsSync(join(ROOT, 'index.html'))) {
  console.error('dist/index.html is missing. Run `npm run build` first.');
  process.exit(1);
}

const USER = { id: 'local-preview-user', email: 'preview@localhost', metadata: { name: 'Local preview', display_name: 'Local preview' } };
const nowIso = () => new Date().toISOString();
const isoDate = (d) => d.toISOString().slice(0, 10);
const readJson = (path, fallback) => { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; } };

const store = {
  progress: {},
  appState: {},
  games: [],
  dnaGames: new Map(),
  dnaReport: null,
  streakDates: new Set(),
  attempts: 0,
};

// Dev-only: --seed-weekly saves a DNA report with games spread over the last 8 ISO weeks (some with acpl).
if (args.includes('--seed-weekly')) {
  const day = 86400000;
  const games = { bullet: [], blitz: [], rapid: [] };
  const plan = [[0, 2, 81, 24], [1, 3, 84, 22], [2, 2, 84.5, 25], [3, 0], [4, 2, 79, 31], [5, 3, 79, 27], [6, 1, 83, null], [7, 2, 80, null]];
  plan.forEach(([weeksAgo, count, accuracy, acpl]) => {
    for (let n = 0; n < count; n++) {
      const date = isoDate(new Date(Date.now() - (weeksAgo * 7 + n) * day));
      const timeClass = n % 2 ? 'rapid' : 'blitz';
      const game = { fingerprint: `seed-weekly-${weeksAgo}-${n}`, date, playerColor: n % 2 ? 'black' : 'white', result: 'win', opening: 'Seeded opening', accuracy: Math.round((accuracy + n - 0.5) * 10) / 10, userMoves: 30, clockedUserMoves: 0, lowTimeMoves: 0 };
      if (acpl != null) game.acpl = acpl + n * 2;
      games[timeClass].push(game);
    }
  });
  games.bullet.push({ fingerprint: 'seed-weekly-bullet', date: isoDate(new Date()), playerColor: 'white', result: 'loss', opening: 'Seeded opening', accuracy: 20, userMoves: 20, clockedUserMoves: 0, lowTimeMoves: 0 });
  const section = (list) => { const gameCount = list.length; return { games: list, count: gameCount, averageAccuracy: gameCount ? Math.round(list.reduce((s, g) => s + g.accuracy, 0) / gameCount * 10) / 10 : null, userMoves: list.reduce((s, g) => s + g.userMoves, 0), classificationCounts: {}, issueRatesPer100Moves: {}, openings: [], clock: {} }; };
  store.dnaReport = { schemaVersion: 2, engineVersion: 'seed-weekly', generatedAt: new Date().toISOString(), timeControls: { bullet: section(games.bullet), blitz: section(games.blitz), rapid: section(games.rapid) } };
}

const bots = readJson(join(ROOT, 'data', 'bots', 'index.json'), []);
const seed = readJson(join(ROOT, 'data', 'puzzle-seed.json'), { puzzles: [] });
const seedPuzzles = (Array.isArray(seed) ? seed : seed.puzzles || []).map((p, i) => ({
  id: String(p.id || 'seed-' + i),
  fen: p.fen,
  solution: p.solution || [],
  accepted: p.accepted || p.solution || [],
  played: p.played || '',
  motif: p.motif || 'general',
  phase: p.phase || 'middlegame',
  rating: Number(p.rating) || 1000,
  class: p.class || 'mistake',
  origin: 'seed',
  source: { date: p.source?.date || isoDate(new Date()), opponent: '', moveNumber: 0, provider: 'seed', url: '' },
}));

function kit(mode) {
  const puzzles = mode === 'rush' ? [...seedPuzzles].sort((a, b) => a.rating - b.rating) : seedPuzzles;
  return { id: 'local-' + mode + '-kit', builtAt: nowIso(), puzzles };
}
function puzzlePool() {
  const byMotif = {}; const byPhase = {};
  for (const p of seedPuzzles) { byMotif[p.motif] = (byMotif[p.motif] || 0) + 1; byPhase[p.phase] = (byPhase[p.phase] || 0) + 1; }
  return { active: seedPuzzles.length, mastered: 0, total: seedPuzzles.length, fresh: seedPuzzles.length, cap: 300, lowWater: 0, byMotif, byPhase };
}
const puzzleProfile = () => ({ puzzleElo: 1200, nextFocus: 'missed_mate' });
function puzzleState() {
  return { ok: true, serverTime: nowIso(), pool: puzzlePool(), kits: { regular: kit('regular'), rush: kit('rush') }, rushBest: 0, profile: puzzleProfile(), job: null, refillNeeded: false };
}

const MILESTONES = [7, 14, 30, 50, 100, 365];
function streakState() {
  const today = new Date(); const todayStr = isoDate(today);
  const dates = [...store.streakDates].sort();
  let current = 0;
  for (let d = new Date(today); store.streakDates.has(isoDate(d)); d.setUTCDate(d.getUTCDate() - 1)) current++;
  let longest = 0; let run = 0; let prev = null;
  for (const s of dates) { const t = Date.parse(s); run = prev !== null && t - prev === 86400000 ? run + 1 : 1; longest = Math.max(longest, run); prev = t; }
  const calendar = [];
  for (let i = 34; i >= 0; i--) { const d = new Date(today); d.setUTCDate(d.getUTCDate() - i); const s = isoDate(d); calendar.push({ date: s, qualified: store.streakDates.has(s), activityCount: store.streakDates.has(s) ? 1 : 0, isToday: s === todayStr }); }
  return {
    ok: true, serverTime: nowIso(), timezoneId: 'UTC', pendingTimezoneId: null, today: todayStr,
    currentStreak: current, longestStreak: Math.max(longest, current), lastQualifiedDate: dates.at(-1) || null,
    qualifiedDates: dates, milestonesReached: MILESTONES.filter((m) => longest >= m), calendar,
  };
}

async function body(req) {
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > 5_000_000) throw new Error('body too large'); chunks.push(c); }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}
function send(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
}

async function api(req, res, url) {
  const name = url.pathname.replace(/^\/(api|\.netlify\/functions)\//, '').replace(/\/$/, '');
  const q = url.searchParams; const action = q.get('action') || '';
  const method = req.method || 'GET';
  const b = method === 'GET' ? {} : await body(req);

  if (name === 'auth') {
    if (action === 'status') return send(res, 200, { configured: true });
    if (method === 'GET') return signedIn ? send(res, 200, { authenticated: true, user: USER }) : send(res, 200, { authenticated: false });
    if (b.action === 'logout' || b.action === 'delete') { signedIn = false; return send(res, 200, { ok: true }); }
    if (['login', 'signup', 'verify-access-code', 'request-access-code'].includes(b.action)) { signedIn = true; return send(res, 200, { ok: true, user: USER }); }
    return send(res, 200, { ok: true });
  }
  if (!signedIn && !['bots', 'telemetry'].includes(name)) return send(res, 401, { ok: false, error: 'unauthorized' });

  switch (name) {
    case 'bots': return send(res, 200, { bots });
    case 'sync': {
      if (method === 'GET' && q.get('game')) { const game = store.games.find((g) => g.id === q.get('game')); return game ? send(res, 200, { ok: true, game }) : send(res, 404, { ok: false, error: 'not_found' }); }
      if (method === 'GET') return send(res, 200, { ok: true, progress: store.progress, appState: store.appState, games: store.games.map(({ pgn, ...g }) => g) });
      if (method === 'PUT') { if (b.progress && typeof b.progress === 'object') store.progress = { ...store.progress, ...b.progress }; if (b.appState && typeof b.appState === 'object') store.appState = { ...store.appState, ...b.appState }; return send(res, 200, { ok: true }); }
      if (method === 'POST' && typeof b.pgn === 'string') { const game = { id: 'local-' + (store.games.length + 1), pgn: b.pgn, meta: b.meta || {}, created_at: nowIso() }; store.games.unshift(game); return send(res, 200, { ok: true, id: game.id }); }
      return send(res, 200, { ok: true });
    }
    case 'chess-dna': {
      if (method === 'GET' && action === 'latest') return send(res, 200, { ok: true, report: store.dnaReport ? { report_json: store.dnaReport, created_at: nowIso() } : null });
      if (method === 'GET' && action === 'games') { const fps = String(q.get('fingerprints') || '').split(',').filter(Boolean); return send(res, 200, { ok: true, games: fps.filter((f) => store.dnaGames.has(f)).map((f) => ({ fingerprint: f, game_json: store.dnaGames.get(f) })) }); }
      if (b.action === 'save-game' && b.fingerprint) { store.dnaGames.set(b.fingerprint, b.game?.analysis ?? b.game); return send(res, 200, { ok: true }); }
      if (b.action === 'save-report' && b.report) { store.dnaReport = b.report; return send(res, 200, { ok: true, reportId: b.reportId || 'local-report' }); }
      return send(res, 200, { ok: true });
    }
    case 'daily-streak': {
      if (action === 'record' && method === 'POST') store.streakDates.add(isoDate(new Date()));
      return send(res, 200, streakState());
    }
    case 'puzzles': {
      if (method === 'GET' && action === 'state') return send(res, 200, puzzleState());
      if (method === 'GET' && action === 'job') return send(res, 200, { ok: true, job: { id: q.get('id') || 'local-job', kind: 'refill', status: 'done', gamesDone: 0, gamesTotal: 0, puzzlesAdded: 0, error: null, updatedAt: nowIso() } });
      if (action === 'kit') return send(res, 200, { ok: true, kit: kit(b.mode === 'rush' ? 'rush' : 'regular') });
      if (action === 'checkpoint') { const n = Array.isArray(b.attempts) ? b.attempts.length : 0; store.attempts += n; return send(res, 200, { ok: true, accepted: n, duplicates: 0, rejected: [], state: { pool: puzzlePool(), profile: puzzleProfile(), rushBest: 0 }, refillNeeded: false }); }
      if (action === 'refill' || action === 'dna') return send(res, 200, { ok: true, started: false });
      if (action === 'remove') return send(res, 200, { ok: true, status: 'removed' });
      return send(res, 400, { ok: false, error: 'bad_request' });
    }
    case 'telemetry': case 'adaptive': case 'puzzle-refill-background': return send(res, 200, { ok: true });
    default:
      if (name.startsWith('admin')) return send(res, 503, { ok: false, error: 'admin_auth_not_configured' });
      return send(res, 404, { ok: false, error: 'not_available_in_local_preview' });
  }
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json' };

async function serveFile(res, pathname) {
  let rel = decodeURIComponent(pathname);
  let file = normalize(join(ROOT, rel));
  if (file !== ROOT && !file.startsWith(ROOT + sep)) { res.writeHead(403); return res.end('Forbidden'); }
  let info = await stat(file).catch(() => null);
  if (info?.isDirectory()) { file = join(file, 'index.html'); info = await stat(file).catch(() => null); }
  if (!info) { file = join(ROOT, 'index.html'); }
  const data = await readFile(file);
  res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(data);
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://' + HOST);
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/functions/')) return await api(req, res, url);
    return await serveFile(res, url.pathname);
  } catch (error) {
    send(res, 500, { ok: false, error: String(error?.message || error) });
  }
}).listen(PORT, HOST, () => {
  console.log('Veyra local preview: http://' + HOST + ':' + PORT + '/  (fake signed-in account "Local preview"; nothing is sent anywhere)');
  console.log('Not available locally: real sign-up and email, cross-device sync, admin. Data resets when this server stops.');
});
