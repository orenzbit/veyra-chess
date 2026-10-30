// Checks weighted book-line choice and guards the ply bug (engine must not derive ply from history()).
// Needs the compiled engine: node node_modules\typescript\bin\tsc -p tsconfig.json  (writes dist/src, git-ignored).
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = process.env.VEYRA_ROOT ? resolve(process.env.VEYRA_ROOT) : resolve(dirname(fileURLToPath(import.meta.url)), '..');
const enginePath = process.env.BOT_ENGINE_JS || join(ROOT, 'dist', 'src', 'bot-engine.js');
const engineSourcePath = process.env.BOT_ENGINE_TS || join(ROOT, 'src', 'bot-engine.ts');
if (!existsSync(enginePath)) throw new Error('Missing ' + enginePath + '. Run: node node_modules\\typescript\\bin\\tsc -p tsconfig.json');
const { Chess } = await import(pathToFileURL(join(ROOT, 'public', 'vendor', 'veyra-rules', 'chess-compat.js')).href);
const { chooseBotMove, preferredOpeningMove, bookCandidates, pickBookCandidate } = await import(pathToFileURL(enginePath).href);
assert.equal(typeof preferredOpeningMove, 'function', 'preferredOpeningMove must be exported from bot-engine');
assert.equal(typeof bookCandidates, 'function', 'bookCandidates must be exported from bot-engine');
assert.equal(typeof pickBookCandidate, 'function', 'pickBookCandidate must be exported from bot-engine');

const HISTORICAL_IDS = ['anand', 'anderssen', 'capablanca', 'carlsen', 'fischer', 'karpov', 'kasparov', 'marshall', 'morphy', 'nakamura', 'polgarj', 'tal'];
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const tokensOf = (moves) => String(moves || '').replace(/\d+\.(\.\.\.)?/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
const neverCalled = () => { throw new Error('rng must not be called here'); };
// Reference copy of the original first-match algorithm, used to prove untouched behaviour.
function legacyPreferred(c, bot, Ctor) {
  const sideLines = c.turn() === 'w' ? (bot?.openingsAsWhite || []) : (bot?.openingsAsBlack || []);
  const lines = [...sideLines, ...(bot?.gambits || [])];
  const targetFen = c.fen();
  for (const line of lines) {
    try {
      const tokens = tokensOf(line.moves);
      if (!tokens.length) continue;
      const probe = new Ctor();
      for (let i = 0; i < tokens.length; i++) {
        if (probe.fen() === targetFen) {
          const match = probe.moves({ verbose: true }).find((m) => m.san === tokens[i]);
          if (match) return match;
          break;
        }
        if (!probe.move(tokens[i], { sloppy: true })) break;
      }
    } catch {}
  }
  return null;
}
function boardAfter(sans) { const board = new Chess(); for (const san of sans) assert.ok(board.move(san, { sloppy: true }), 'illegal test move ' + san); return board; }

// 1. Ply must not come from history(): that is 0 on boards built from FEN.
const engineSource = await readFile(engineSourcePath, 'utf8');
assert.ok(!/plyCount/.test(engineSource) && !/history\(\)/.test(engineSource), 'bot-engine must not compute ply from history()');

// 2. Fixed rng values select lines proportionally to their games count.
const weighted = { openingsAsWhite: [{ name: 'a', moves: '1. e4 e5', games: 70 }, { name: 'b', moves: '1. d4 d5', games: 20 }, { name: 'c', moves: '1. c4 e5', games: 10 }], openingsAsBlack: [], gambits: [] };
const fixed = [[0, 'e4'], [0.35, 'e4'], [0.69, 'e4'], [0.71, 'd4'], [0.85, 'd4'], [0.91, 'c4'], [0.999, 'c4']];
for (const [value, san] of fixed) assert.equal(preferredOpeningMove(new Chess(), weighted, Chess, () => value)?.san, san, 'rng ' + value + ' must pick ' + san);
const originalRandom = Math.random;
try {
  Math.random = () => 0.85;
  assert.equal(chooseBotMove(new Chess(), { ...weighted, elo: 2000 }, Chess)?.san, 'd4', 'chooseBotMove must use Math.random for the book choice');
} finally { Math.random = originalRandom; }

// 3. Seeded draws are reproducible and roughly proportional to games.
const draw = (seed, n) => { const rng = mulberry32(seed), out = []; for (let i = 0; i < n; i++) out.push(preferredOpeningMove(new Chess(), weighted, Chess, rng).san); return out; };
const first = draw(12345, 20000), second = draw(12345, 20000);
assert.deepEqual(first, second, 'same seed must give the same sequence');
for (const [san, share] of [['e4', 0.7], ['d4', 0.2], ['c4', 0.1]]) {
  const observed = first.filter((value) => value === san).length / first.length;
  assert.ok(Math.abs(observed - share) < 0.02, san + ' share ' + observed + ' is not close to ' + share);
}

// 4. Untouched behaviour: no match, single match and lines without a games count never consume rng.
assert.equal(preferredOpeningMove(boardAfter(['a3', 'a6', 'h3', 'h6']), weighted, Chess, neverCalled), null, 'no matching line must return null');
assert.equal(preferredOpeningMove(new Chess(), { openingsAsWhite: [{ moves: '1. e4 e5 2. Nf3', games: 5 }] }, Chess, neverCalled)?.san, 'e4', 'single match must be returned without rng');
const noGames = { openingsAsWhite: [{ name: 'x', moves: '1. e4 e5' }, { name: 'y', moves: '1. d4 d5' }] };
assert.equal(preferredOpeningMove(new Chess(), noGames, Chess, neverCalled)?.san, 'e4', 'lines without games keep first-match behaviour');
const mixed = { openingsAsWhite: [{ name: 'x', moves: '1. d4 d5', games: 4 }, { name: 'y', moves: '1. e4 e5' }] };
assert.equal(preferredOpeningMove(new Chess(), mixed, Chess, neverCalled)?.san, 'd4', 'a matching line without games keeps first-match behaviour');

// 5. Boards built from FEN (empty history) get the same book answer as boards built by moves.
const blackBot = { openingsAsWhite: [], openingsAsBlack: [{ name: 'p', moves: '1. e4 e5', games: 3 }, { name: 'q', moves: '1. e4 c5', games: 1 }], gambits: [] };
const byMoves = boardAfter(['e4']), byFen = new Chess(byMoves.fen());
assert.equal(byFen.history().length, 0, 'FEN-built board has an empty history');
for (const [value, san] of [[0.1, 'e5'], [0.9, 'c5']]) {
  assert.equal(preferredOpeningMove(byMoves, blackBot, Chess, () => value)?.san, san);
  assert.equal(preferredOpeningMove(byFen, blackBot, Chess, () => value)?.san, san, 'FEN-built board must match the book like a played board');
}
try {
  Math.random = () => 0.1;
  assert.equal(chooseBotMove(byFen, { ...blackBot, elo: 2000 }, Chess)?.san, 'e5');
} finally { Math.random = originalRandom; }

// 6. Real profiles: >= 8 lines per colour, games counts present, shares follow games.
const botDir = join(ROOT, 'public', 'data', 'bots');
const profiles = [];
for (const file of (await readdir(botDir)).filter((name) => name.endsWith('.json') && name !== 'index.json').sort()) profiles.push(JSON.parse(await readFile(join(botDir, file), 'utf8')));
const expectedShares = (lines, prefix) => {
  const shares = new Map();
  for (const line of lines) {
    const tokens = tokensOf(line.moves);
    if (tokens.length <= prefix.length || prefix.some((san, index) => tokens[index] !== san)) continue;
    if (!(Number(line.games) > 0)) return null;
    shares.set(tokens[prefix.length], (shares.get(tokens[prefix.length]) || 0) + Number(line.games));
  }
  const total = [...shares.values()].reduce((sum, value) => sum + value, 0);
  return total ? new Map([...shares].map(([san, weight]) => [san, weight / total])) : null;
};
function checkDistribution(bot, board, lines, prefix, seed) {
  const expected = expectedShares(lines, prefix);
  if (!expected) return false;
  const candidates = bookCandidates(board, bot, Chess), weights = new Map();
  for (const item of candidates) weights.set(item.move.san, (weights.get(item.move.san) || 0) + item.weight);
  const total = [...weights.values()].reduce((sum, value) => sum + value, 0);
  assert.deepEqual([...weights.keys()].sort(), [...expected.keys()].sort(), bot.id + ': book candidates differ from the profile lines');
  for (const [san, share] of expected) assert.ok(Math.abs(weights.get(san) / total - share) < 1e-9, bot.id + ': candidate weight of ' + san + ' is not the sum of games');
  const rng = mulberry32(seed), counts = new Map(), n = 20000;
  for (let i = 0; i < n; i++) { const san = pickBookCandidate(candidates, rng)?.san; counts.set(san, (counts.get(san) || 0) + 1); }
  for (const [san, share] of expected) assert.ok(Math.abs((counts.get(san) || 0) / n - share) < 0.02, bot.id + ': drawn share of ' + san + ' is not close to ' + share.toFixed(3));
  return true;
}
let distributionChecks = 0;
for (const bot of profiles.filter((item) => HISTORICAL_IDS.includes(item.id))) {
  assert.ok(bot.openingsAsWhite.length >= 8 && bot.openingsAsBlack.length >= 8, bot.id + ': fewer than 8 book lines for a colour');
  for (const line of [...bot.openingsAsWhite, ...bot.openingsAsBlack]) assert.ok(Number.isInteger(line.games) && line.games >= 1, bot.id + ': book line without a games count');
  const whiteLines = [...bot.openingsAsWhite, ...(bot.gambits || [])];
  if (checkDistribution(bot, new Chess(), whiteLines, [], 1000 + distributionChecks)) distributionChecks += 1;
  const firstMove = tokensOf(bot.openingsAsBlack[0].moves)[0];
  if (checkDistribution(bot, boardAfter([firstMove]), [...bot.openingsAsBlack, ...(bot.gambits || [])], [firstMove], 5000 + distributionChecks)) distributionChecks += 1;
}
assert.ok(distributionChecks >= 2, 'no historical profile was distribution-checked');

// 7. Bots that are not historical keep the original first-match answer.
let regularChecks = 0;
for (const bot of profiles.filter((item) => !HISTORICAL_IDS.includes(item.id))) {
  const boards = [new Chess()];
  const first = tokensOf((bot.openingsAsBlack || [])[0]?.moves)[0];
  if (first) boards.push(boardAfter([first]));
  for (const board of boards) {
    assert.equal(preferredOpeningMove(board, bot, Chess, () => 0)?.san, legacyPreferred(board, bot, Chess)?.san, bot.id + ': book answer changed');
    regularChecks += 1;
  }
}
// 8. searchDepthCap is read by the engine: source guard + a capped search on a middlegame position is fast.
assert.ok(/searchDepthCap/.test(engineSource), 'bot-engine must read searchDepthCap');
{
  const midgame = new Chess('r1bq1rk1/pp2bppp/2n1pn2/2pp4/3P1B2/2PBPN2/PP1N1PPP/R2QK2R w KQ - 0 9');
  const t0 = performance.now();
  const capped = chooseBotMove(midgame, { id: 'cap-test', elo: 2600, style: 'universal', searchDepthCap: 1 }, Chess);
  assert.ok(capped && capped.san, 'capped search must return a move');
  assert.ok(performance.now() - t0 < 15000, 'searchDepthCap 1 must make the search fast');
}
console.log('PASS: weighted book choice (seeded, proportional, FEN boards), no history()-based ply, ' + distributionChecks + ' historical distribution checks, ' + regularChecks + ' regular-bot regression positions.');
