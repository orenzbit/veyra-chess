// Start a bot game from a chosen opening at a chosen strength: module rules, engine cap, worker path
// and the minimal src/main.ts wiring. Run after `npx tsc -p tsconfig.json` (check:bot-start does it).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const { Chess } = await import('../public/vendor/veyra-rules/chess-compat.js');
const mod = await import('../dist/src/bot-start-position.js');
const { chooseBotMoveTimed } = await import('../dist/src/bot-engine.js');
const { handleBotWorkerMessage } = await import('../dist/src/bot-worker.js');
const { workerBotFields, BOT_WORKER_BOT_FIELDS } = await import('../dist/src/bot-worker-client.js');
const { botNow } = await import('../dist/src/bot-time.js');
const {
  parseStartPosition, startingGame, botAtLevel, normalizeBotLevel, rankBotsForPicker, resolveBotStart, botStartFromQuery,
  BOT_LEVELS, STANDARD_START_FEN, MAX_START_PLIES, MAX_START_TEXT,
} = mod;
const bots = JSON.parse(await readFile('public/data/bots/index.json', 'utf8'));
const section = (text) => console.log(text);

// 1. SAN lists.
const sans = parseStartPosition({ moves: '1.e4 e5 2.Nf3 Nc6' }, Chess);
assert.ok(sans.ok && sans.start.moves.join(' ') === 'e4 e5 Nf3 Nc6' && sans.start.fen.split(' ')[1] === 'w' && sans.start.reviewable);
assert.equal(sans.start.fen, 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3');
const odd = parseStartPosition({ moves: ['e4', 'e5', 'Nf3'] }, Chess);
assert.ok(odd.ok && odd.start.fen.split(' ')[1] === 'b', 'array input, odd ply count: black to move');
for (const text of ['1. e4 e5 2. Nf3 Nc6 *', '1.e4, e5, 2.Nf3, Nc6', 'e4 e5 Nf3 Nc6', '1. e4 e5 2. Nf3 Nc6 3. Bb5!? a6?']) {
  const r = parseStartPosition({ moves: text }, Chess);
  assert.ok(r.ok && r.start.moves.slice(0, 4).join(' ') === 'e4 e5 Nf3 Nc6', `accepted: ${text}`);
}
const castles = parseStartPosition({ moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 O-O' }, Chess);
assert.ok(castles.ok && castles.start.moves.at(-1) === 'O-O');
const promo = parseStartPosition({ fen: '8/P6k/8/8/8/8/8/K7 w - - 0 1', moves: 'a8=Q' }, Chess);
assert.ok(promo.ok && promo.start.moves[0] === 'a8=Q' && !promo.start.reviewable);
assert.ok(parseStartPosition({ moves: '' }, Chess).ok && parseStartPosition({}, Chess).ok && parseStartPosition(null, Chess).ok, 'no moves/FEN = standard start');
assert.equal(parseStartPosition({}, Chess).start.fen, STANDARD_START_FEN);
const fullCap = parseStartPosition({ moves: Array(MAX_START_PLIES + 1).fill('Nf3') }, Chess);
assert.equal(fullCap.ok, false);
for (const bad of ['1.e5', 'e4 e5 e5', 'e4 Zz9', 'xyz', 'e4 e5 Nf3 Nc7', '<script>alert(1)</script>', 'e4;e5', 'e4\u0000e5', 'a'.repeat(MAX_START_TEXT + 1), 'e4 e5 O-O-O', 42, {}]) {
  const r = parseStartPosition({ moves: bad }, Chess);
  assert.equal(r.ok, false, `rejected: ${JSON.stringify(bad).slice(0, 40)}`);
  assert.ok(typeof r.error === 'string' && r.error.length > 0);
}
section('PASS SAN lists: numbering, results, annotations, castling, promotion; bad / hostile / oversized input rejected without throwing');

// 2. FEN.
const fen = parseStartPosition({ fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1' }, Chess);
assert.ok(fen.ok && fen.start.fen.split(' ')[1] === 'b' && fen.start.moves.length === 0 && !fen.start.reviewable);
assert.ok(parseStartPosition({ fen: STANDARD_START_FEN }, Chess).start.reviewable, 'the standard FEN is the ordinary game');
for (const bad of ['', 'garbage', '8/8/8/8/8/8/8/8 w - - 0 1', 'K7/8/8/8/8/8/8/KK6k w - - 0 1', '4k3/4R3/8/8/8/8/8/4K3 w - - 0 1', '4k3/8/8/8/8/8/8/P3K3 w - - 0 1',
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq', '<b>' + STANDARD_START_FEN, STANDARD_START_FEN + ' ' + 'x'.repeat(200), 7]) {
  if (bad === '') continue; // an empty FEN means "no FEN"
  assert.equal(parseStartPosition({ fen: bad }, Chess).ok, false, `FEN rejected: ${String(bad).slice(0, 40)}`);
}
const ended = [
  ['checkmate', 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'],
  ['stalemate', '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'],
  ['insufficient material', '8/8/8/4k3/8/8/3K4/8 w - - 0 1'],
];
for (const [label, f] of ended) assert.equal(parseStartPosition({ fen: f }, Chess).ok, false, `finished position rejected: ${label}`);
assert.equal(parseStartPosition({ moves: 'f3 e5 g4 Qh4' }, Chess).ok, false, 'a SAN line that ends the game is rejected');
section('PASS FEN: valid / invalid / finished positions; FEN starts are marked not reviewable, SAN starts reviewable');

// 3. startingGame.
const plain = startingGame(null, Chess);
assert.equal(plain.fen(), STANDARD_START_FEN);
assert.equal(plain.pgn().includes('[SetUp'), false, 'ordinary game is unchanged (no SetUp header)');
assert.equal(startingGame(undefined, Chess).fen(), STANDARD_START_FEN);
const fromSan = startingGame(sans.start, Chess);
assert.equal(fromSan.fen(), sans.start.fen);
assert.equal(fromSan.history().join(' '), 'e4 e5 Nf3 Nc6', 'history keeps the opening moves (repetition, PGN, review)');
assert.equal(startingGame(promo.start, Chess).fen(), promo.start.fen);
assert.equal(startingGame(fen.start, Chess).fen(), fen.start.fen);
assert.ok(startingGame(fen.start, Chess).pgn().includes('[FEN '), 'FEN start is recorded in the PGN header');
assert.equal(startingGame({ baseFen: 'broken', moves: [], fen: 'broken', reviewable: true }, Chess).fen(), STANDARD_START_FEN, 'corrupt start falls back to the ordinary game');
section('PASS startingGame: ordinary game unchanged, SAN start keeps history, FEN start sets the position, corrupt start falls back');

// 4. Levels.
assert.deepEqual(BOT_LEVELS.map((l) => [l.id, l.cap]), [[1, 1], [2, 2], [3, 3], [4, null]]);
for (const bad of [0, 5, -1, NaN, null, undefined, 'x', '', '9', {}, [], 2.5]) assert.equal(normalizeBotLevel(bad), 4, `bad level ${String(bad)} = full`);
assert.deepEqual([1, 2, 3, 4, '1', '2', '3', '4', ' 3 '].map(normalizeBotLevel), [1, 2, 3, 4, 1, 2, 3, 4, 3]);
const capSource = bots.find((b) => b.sourceFile && b.elo >= 2400); // a historical (sourceFile) bot with native depth 4
assert.ok(capSource, 'the manifest has a historical 2400+ bot');
const { searchDepthCap: _ownCap, ...cap } = capSource, HID = cap.id; // the cases below need a bot WITHOUT its own cap, whatever the roster holds
assert.equal(botAtLevel(cap, undefined), cap, 'no level: same object');
assert.equal(botAtLevel(cap, 4), cap, 'full: same object');
const lvl2 = botAtLevel(cap, 2);
assert.equal(lvl2.searchDepthCap, 2); assert.equal(cap.searchDepthCap, undefined, 'original bot is not changed'); assert.notEqual(lvl2, cap);
assert.equal(botAtLevel({ ...cap, searchDepthCap: 2 }, 3).searchDepthCap, 2, 'a level never raises the bot\'s own cap');
assert.equal(botAtLevel({ ...cap, searchDepthCap: 3 }, 1).searchDepthCap, 1);
assert.equal(botAtLevel({ ...cap, searchDepthCap: 3 }, 4).searchDepthCap, 3);
assert.equal(botAtLevel(null, 1), null);
assert.ok(BOT_WORKER_BOT_FIELDS.includes('searchDepthCap') && workerBotFields(lvl2).searchDepthCap === 2, 'the cap reaches the worker');
section('PASS levels: 1/2/3/full, invalid = full, cap only lowers, original bot untouched, cap is sent to the worker');

// 5. Picker and generic bots.
const ranked = rankBotsForPicker(bots);
assert.equal(ranked.length, bots.length);
assert.deepEqual([...ranked].map((b) => b.id).sort(), bots.map((b) => b.id).sort());
const firstPlain = ranked.findIndex((b) => !b.sourceFile);
assert.ok(ranked.slice(0, firstPlain).every((b) => b.sourceFile) && ranked.slice(firstPlain).every((b) => !b.sourceFile), 'historical bots (sourceFile) come first');
assert.ok(ranked[0].sourceFile && ranked[0].elo === Math.max(...bots.filter((b) => b.sourceFile).map((b) => b.elo)), 'the strongest historical bot is first');
const mixed = [{ id: 'a', elo: 900 }, { id: 'b', elo: 800, sourceFile: 'x.pgn' }, { id: 'c', elo: 2000 }, { id: 'd', elo: 700, sourceFile: 'y.pgn' }];
assert.deepEqual(rankBotsForPicker(mixed).map((b) => b.id), ['b', 'd', 'c', 'a']);
assert.deepEqual(mixed.map((b) => b.id), ['a', 'b', 'c', 'd'], 'input order not changed');
assert.deepEqual(rankBotsForPicker(null), []);
for (const bot of bots) {
  const r = resolveBotStart({ botId: bot.id, moves: 'e4 e5', level: 2, side: 'black' }, bots, Chess);
  assert.ok(r.ok && r.bot === bot && r.side === 'black' && r.level === 2, `any bot can start: ${bot.id}`);
}
assert.equal(resolveBotStart({ botId: 'nobody', moves: 'e4' }, bots, Chess).ok, false);
assert.equal(resolveBotStart({ botId: '../x', moves: 'e4' }, bots, Chess).ok, false);
assert.equal(resolveBotStart({ botId: HID, moves: 'e5' }, bots, Chess).ok, false);
assert.equal(resolveBotStart({ botId: HID, moves: 'e4', side: 'purple', level: 'x' }, bots, Chess).side, 'white');
assert.equal(resolveBotStart({ botId: HID, moves: 'e4', level: 'x' }, bots, Chess).level, 4);
section(`PASS picker order and generic use: ${bots.length} bots resolve, unknown / malformed bot ids rejected`);

// 6. Query entry.
assert.equal(botStartFromQuery('', bots, Chess), null);
assert.equal(botStartFromQuery('?x=1', bots, Chess), null);
const q = botStartFromQuery(`?botgame=${HID}&moves=e4,e5,Nf3&level=2&side=black`, bots, Chess);
assert.ok(q.ok && q.bot.id === HID && q.start.moves.join(' ') === 'e4 e5 Nf3' && q.level === 2 && q.side === 'black');
assert.ok(botStartFromQuery(`?botgame=${HID}&moves=e4+e5+Nf3`, bots, Chess).ok, '+ is a space');
assert.equal(botStartFromQuery(`?botgame=${HID}&moves=e5`, bots, Chess).ok, false);
assert.equal(botStartFromQuery('?botgame=<img>', bots, Chess).ok, false);
assert.equal(botStartFromQuery(`?botgame=${HID}&fen=` + encodeURIComponent('8/8/8/8/8/8/8/8 w - - 0 1'), bots, Chess).ok, false);
assert.ok(botStartFromQuery(`?botgame=${HID}&fen=` + encodeURIComponent('6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1'), bots, Chess).ok);
assert.equal(botStartFromQuery(`?botgame=${HID}&moves=` + 'e4%20'.repeat(2000), bots, Chess).ok, false);
section('PASS query entry: valid link, plus-as-space, hostile / oversized / invalid values rejected');

// 7. Engine: the cap limits the search depth; no cap keeps today's depth.
const farDeadline = () => botNow() + 600000;
const quiet = parseStartPosition({ fen: '6k1/5p1p/6p1/8/8/6P1/5PKP/3R4 w - - 0 1' }, Chess).start;
const searchDepth = (bot, startFen = quiet.fen) => {
  const r = chooseBotMoveTimed(new Chess(startFen), bot, Chess, { deadlineAt: farDeadline() });
  return { depth: r.depth, complete: r.complete, move: r.move };
};
const noBook = { ...cap, openingsAsWhite: [], openingsAsBlack: [], gambits: [] };
const t0 = Date.now();
for (const level of [1, 2, 3]) {
  const r = searchDepth(botAtLevel(noBook, level));
  assert.equal(r.depth, level, `level ${level}: completed depth is exactly the cap`);
  assert.equal(r.complete, true, `level ${level}: the capped search counts as complete`);
  assert.ok(r.move && new Chess(quiet.fen).move({ from: r.move.from, to: r.move.to, promotion: r.move.promotion }), 'legal move');
}
const full = searchDepth(noBook);
assert.equal(full.depth, 4, 'no cap: a 2400+ bot still searches 4');
assert.equal(botAtLevel(noBook, 4), noBook);
section(`PASS engine: caps 1/2/3 stop at depth 1/2/3, uncapped 2400+ bot searches depth 4 (${((Date.now() - t0) / 1000).toFixed(1)} s)`);

const low = { ...bots.find((b) => b.elo === 800), openingsAsWhite: [], openingsAsBlack: [], gambits: [] };
assert.equal(searchDepth(botAtLevel(low, 3)).depth, 2, 'a native depth-2 bot is not raised by level 3');
assert.equal(searchDepth({ ...noBook, searchDepthCap: 'x' }).depth, 4, 'a malformed cap is ignored');
assert.equal(searchDepth({ ...noBook, searchDepthCap: 0 }).depth, 4, 'cap 0 is ignored (no cap)');
section('PASS engine: levels never raise a lower-rated bot; malformed / zero cap ignored');

// 8. Worker path with the cap, and a forced mate from a chosen start.
const reply = await handleBotWorkerMessage({ type: 'choose', id: 7, fen: quiet.fen, bot: workerBotFields(botAtLevel(noBook, 2)), deadlineAt: farDeadline() }, async () => Chess);
assert.equal(reply.type, 'move'); assert.equal(reply.depth, 2); assert.equal(reply.complete, true);
const mateFen = '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1';
const mateStart = parseStartPosition({ fen: mateFen }, Chess).start;
const mateReply = await handleBotWorkerMessage({ type: 'choose', id: 8, fen: mateStart.fen, bot: workerBotFields(botAtLevel(cap, 1)), deadlineAt: farDeadline() }, async () => Chess);
assert.equal(`${mateReply.move.from}${mateReply.move.to}`, 'a1a8', 'bot moves first from a FEN start and mates in one at level 1');
const scholar = parseStartPosition({ moves: 'e4 e5 Qh5 Nc6 Bc4 Nf6' }, Chess).start;
const scholarReply = await handleBotWorkerMessage({ type: 'choose', id: 9, fen: scholar.fen, bot: workerBotFields(botAtLevel(cap, 1)), deadlineAt: farDeadline() }, async () => Chess);
assert.equal(`${scholarReply.move.from}${scholarReply.move.to}`, 'h5f7', 'bot continues from a SAN start and mates in one');
section('PASS worker: cap respected through the worker message; bot answers from FEN and SAN starts');

// 9. src/main.ts wiring (the page cannot run here: React loads from a CDN, so CI covers the browser).
const main = (await readFile('src/main.ts', 'utf8')).replace(/\r\n/g, '\n');
const need = [
  "import { startingGame, botAtLevel, botStartFromQuery } from './bot-start-position.js';",
  'function BotGame({bot,botIndex,sideChoice,minutes,start,level,onReview,onBack,onGameFinished}){\n  bot=botAtLevel(bot,level);\n  const [game,setGame]=useState(()=>startingGame(start,Chess));',
  "start:botStart?.start,level:botStart?.level",
  'if(won&&!botStart){recordBotWin(botIndex);}',
  "(!start||start.reviewable)&&h('button',{className:'primary',onClick:finishText},'העבר לסקירה')",
  'botStartFromQuery(location.search,bots,Chess)',
  "if(page!=='botgame')setBotStart(null);",
];
for (const text of need) assert.ok(main.includes(text), `main.ts wiring: ${text.slice(0, 70)}`);
assert.ok(!main.includes('useState(()=>new Chess());\n  const [playerSide]'), 'BotGame no longer hard-codes the start');
const engine = await readFile('src/bot-engine.ts', 'utf8');
assert.ok(engine.includes('Math.max(1,Math.min(configuredDepth,Number(bot.searchDepthCap)||5))'));
section('PASS main.ts wiring: props, start position, level, practice wins skip the campaign, FEN starts skip review, query entry');

console.log('PASS: bot start position checks completed.');
