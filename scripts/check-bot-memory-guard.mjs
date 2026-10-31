// Checks the bot search resource limits (src/bot-engine.ts): the replayed book-line cache is bounded
// without changing book moves, the timed search stops at its node cap even if the clock never advances,
// and the untimed path plays chooseBotMove's move in normal positions but cannot run without a bound.
// Bots are referred to as "bot #N" (1-based position in public/data/bots/index.json).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const { Chess } = await import('../public/vendor/veyra-rules/chess-compat.js');
const {
  chooseBotMove, chooseBotMoveTimed, bookCandidates, bookLineCacheSize,
  MAX_TIMED_NODES, MAX_UNTIMED_NODES, BOT_BOOK_LINE_CACHE_MAX,
} = await import('../dist/src/bot-engine.js');
const { handleBotWorkerMessage } = await import('../dist/src/bot-worker.js');
const manifest = JSON.parse(await readFile('public/data/bots/index.json', 'utf8'));
const bot = (n) => manifest[n - 1];
const started = Date.now();
const section = (label) => console.log(`${label} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
const originalRandom = Math.random;

function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const uci = (m) => (m ? m.from + m.to + (m.promotion || '') : 'none');
const isLegal = (fen, move) => {
  if (!move) return false;
  try { return Boolean(new Chess(fen).move({ from: move.from, to: move.to, promotion: move.promotion || undefined })); } catch { return false; }
};
// Runs fn with a seeded Math.random and also returns the next draw, so RNG consumption is compared too.
function seeded(seed, fn) {
  Math.random = seededRandom(seed);
  try {
    const value = fn();
    return { value, next: Math.random() };
  } finally {
    Math.random = originalRandom;
  }
}

// Minimal chess-like class for the engine: `branching` moves in every position, pseudo-random pieces per square, never mate or draw.
function makeWideGame(branching) {
  const SQUARES = [...'abcdefgh'].flatMap((f) => [...'12345678'].map((r) => f + r));
  const mix = (a, b) => { let h = Math.imul(a ^ Math.imul(b + 0x9E3779B9, 0x85EBCA6B), 0xC2B2AE35); h ^= h >>> 15; return Math.imul(h, 0x27D4EB2F) >>> 15 ^ h; };
  return class WideGame {
    constructor(fen) { const [s, t] = String(fen || '1|w').split('|'); this.s = Number(s) >>> 0; this.t = t; }
    fen() { return `${this.s}|${this.t}`; }
    turn() { return this.t; }
    moves() { return Array.from({ length: branching }, (_, i) => ({ from: 'a1', to: 'a2', san: `m${i}`, idx: i, color: this.t })); }
    move(m) { this.s = mix(this.s, m.idx + 1) >>> 0; this.t = this.t === 'w' ? 'b' : 'w'; return { ...m }; }
    get(square) { const h = mix(this.s, SQUARES.indexOf(square) + 1) >>> 0; return h % 7 < 5 ? { type: 'pnbrq'[h % 7], color: h & 256 ? 'w' : 'b' } : null; }
    isCheck() { return false; }
    isCheckmate() { return false; }
    isDraw() { return false; }
  };
}

// Stand-in for the rules in book lookups: any token is a legal move, `branching` placeholder moves everywhere, counts constructions.
function makeLineGame(branching) {
  return class LineGame {
    static built = 0;
    constructor() { LineGame.built++; this.played = []; }
    turn() { return this.played.length % 2 === 0 ? 'w' : 'b'; }
    fen() { return `${this.played.join('/') || 'start'} ${this.turn()} - - 0 ${Math.floor(this.played.length / 2) + 1}`; }
    move(token) { this.played.push(token); return { san: token }; }
    moves() { return Array.from({ length: branching }, (_, i) => ({ from: 'a1', to: 'a2', san: `m${i}` })); }
  };
}

const POSITIONS = {
  start: new Chess().fen(),
  opening: 'rnbqkbnr/1ppppppp/p7/8/8/P7/1PPPPPPP/RNBQKBNR w KQkq - 0 2',
  middlegame: 'r3k2r/ppp2ppp/2n1bn2/3qp3/3PP3/2N1BN2/PPP2PPP/R2Q1RK1 b kq - 3 12',
  endgame: '8/5pk1/6p1/8/3R4/6P1/5PKP/2r5 w - - 0 40',
  pawnEnding: '8/8/4k3/8/8/4K3/4P3/8 w - - 0 50',
};
for (const [label, fen] of Object.entries(POSITIONS)) assert.ok(new Chess(fen).moves().length > 0, `position ${label} has legal moves`);

// 0. The limits are exported with their documented values.
assert.equal(MAX_TIMED_NODES, 400000);
assert.equal(MAX_UNTIMED_NODES, 3000000);
assert.equal(BOT_BOOK_LINE_CACHE_MAX, 2000);
assert.ok(MAX_UNTIMED_NODES > MAX_TIMED_NODES, 'the untimed budget is the more generous one');

// 1. Book-line cache: bounded, and the book moves of real profiles do not change.
{
  const repertoirePositions = [];
  for (const n of [1, 19, 51]) {
    for (const key of ['openingsAsWhite', 'openingsAsBlack', 'gambits']) {
      for (const line of (bot(n)[key] || []).slice(0, 3)) {
        const tokens = String(line.moves || '').replace(/\d+\.(\.\.\.)?/g, ' ').split(/\s+/).filter(Boolean);
        const probe = new Chess();
        for (let ply = 0; ply < Math.min(tokens.length, 8); ply++) {
          if (ply % 2 === (key === 'openingsAsBlack' ? 1 : 0)) repertoirePositions.push([n, probe.fen()]); // only positions where this line's side is to move
          if (!probe.move(tokens[ply], { sloppy: true })) break;
        }
      }
    }
  }
  assert.ok(repertoirePositions.length > 30, `enough repertoire positions (${repertoirePositions.length})`);
  // The untimed chooseBotMove does not use the cache (bookCandidates replays the line), so it is the reference.
  const reference = repertoirePositions.map(([n, fen], i) => seeded(500 + i, () => uci(chooseBotMove(new Chess(fen), bot(n), Chess))));
  const timedBookMoves = () => repertoirePositions.map(([n, fen], i) => seeded(500 + i, () => {
    const r = chooseBotMoveTimed(new Chess(fen), bot(n), Chess, { deadlineAt: Date.now() + 1e9, now: () => 0 });
    assert.equal(r.depth, 0, `bot #${n}: ${fen} is answered from the book`);
    return uci(r.move);
  }));
  const compareBookMoves = (label) => {
    const got = timedBookMoves();
    got.forEach((g, i) => {
      assert.equal(g.value, reference[i].value, `${label}: bot #${repertoirePositions[i][0]} book move at ${repertoirePositions[i][1]}`);
      assert.equal(g.next, reference[i].next, `${label}: same random numbers at position ${i}`);
    });
  };
  compareBookMoves('empty cache');
  assert.ok(bookLineCacheSize() > 0 && bookLineCacheSize() <= BOT_BOOK_LINE_CACHE_MAX);

  // More distinct lines than the cap, on a cheap stand-in for the rules (real replays cost milliseconds each).
  // Lines are 4 plies from the start, made of 20 placeholder moves; the stand-in counts its constructions:
  // a cache miss builds 2 (the line's replay board and the candidate board), a hit builds 1.
  const Lines = makeLineGame(20);
  const makeLines = (count, seed) => {
    const rng = seededRandom(seed);
    const lines = new Map();
    while (lines.size < count) {
      const sans = [];
      for (let ply = 0; ply < 4; ply++) {
        const san = `m${Math.floor(rng() * 20)}`;
        sans.push(ply % 2 === 0 ? `${ply / 2 + 1}. ${san}` : san);
      }
      lines.set(sans.join(' '), { moves: sans.join(' ') });
    }
    return [...lines.values()];
  };
  const extra = BOT_BOOK_LINE_CACHE_MAX + 600;
  const floodA = makeLines(extra, 7);
  const floodB = makeLines(extra, 8);
  assert.equal(new Set(floodA.map((l) => l.moves)).size, extra, 'flood lines are distinct');
  const floodBot = (lines) => ({ id: 'flood', elo: 2000, style: 'universal', openingsAsWhite: lines });
  const askBook = (lines) => {
    const root = new Lines();
    const before = Lines.built;
    const result = chooseBotMoveTimed(root, floodBot(lines), Lines, { deadlineAt: Date.now() + 1e9, now: () => 0 });
    assert.equal(result.depth, 0, 'answered from the book');
    return { built: Lines.built - before, result };
  };
  for (const [label, lines] of [['flood A', floodA], ['flood B', floodB]]) {
    const { result } = askBook(lines);
    const expected = seeded(3, () => bookCandidates(new Lines(), floodBot(lines), Lines)[0]?.move?.san);
    assert.equal(result.move.san, expected.value, `${label}: first line's move, as without a cache`);
    assert.equal(bookLineCacheSize(), BOT_BOOK_LINE_CACHE_MAX, `${label}: ${extra} lines inserted, cache held at its cap`);
  }
  // Least recently used goes first: refill with exactly cap lines, touch the oldest, add one new line.
  const fill = floodA.slice(0, BOT_BOOK_LINE_CACHE_MAX);
  const fresh = floodA[BOT_BOOK_LINE_CACHE_MAX];
  askBook(fill);
  assert.equal(bookLineCacheSize(), BOT_BOOK_LINE_CACHE_MAX);
  assert.equal(askBook([fill[0]]).built, 1, 'oldest line is still cached');
  assert.equal(askBook([fresh]).built, 2, 'a new line is a miss');
  assert.equal(bookLineCacheSize(), BOT_BOOK_LINE_CACHE_MAX, 'the new line evicted one line');
  assert.equal(askBook([fill[0]]).built, 1, 'the line used most recently survived');
  assert.equal(askBook([fill[1]]).built, 2, 'the least recently used line was evicted');
  assert.ok(bookLineCacheSize() <= BOT_BOOK_LINE_CACHE_MAX);
  // After everything was evicted and refilled, the real profiles give the same moves again.
  compareBookMoves('after eviction');
  assert.ok(bookLineCacheSize() <= BOT_BOOK_LINE_CACHE_MAX);
  section(`PASS book-line cache: ${BOT_BOOK_LINE_CACHE_MAX} cap holds after ${extra * 2} line insertions, least recently used line evicted first, ${repertoirePositions.length} repertoire moves of bots #1/#19/#51 unchanged (moves and RNG state)`);
}

// 2. Timed search: the node cap stops it even when the clock never advances.
{
  const strong = { id: 'guard-strong', elo: 2600, style: 'universal' }; // depth 4 in the middlegame is far beyond the cap
  const frozenNow = () => 0;
  const farDeadline = 1e12;
  const fen = POSITIONS.middlegame;

  // Real chess runs about 1-3 ms per node, so the default cap cannot be reached in a few seconds with the real rules.
  // A wide synthetic game (120 moves everywhere, pseudo-random material) reaches it fast through the engine's own search.
  const Wide = makeWideGame(120);
  const rootMoves = new Wide().moves().map((m) => m.san);
  {
    const start = Date.now();
    const capped = seeded(41, () => chooseBotMoveTimed(new Wide(), strong, Wide, { deadlineAt: farDeadline, now: frozenNow })).value;
    const elapsed = Date.now() - start;
    assert.equal(capped.nodeCapped, true, 'default cap reached');
    assert.equal(capped.complete, false, 'a capped search is not complete');
    assert.equal(capped.nodes, MAX_TIMED_NODES + 1, `stopped exactly at the cap (${capped.nodes} nodes)`);
    assert.ok(capped.depth >= 1 && capped.depth < 4, `kept a completed depth (${capped.depth})`);
    assert.ok(rootMoves.includes(capped.move?.san), 'capped timed search returns one of the root moves');
    console.log(`  default cap: ${capped.nodes} nodes, completed depth ${capped.depth}, ${elapsed} ms with a frozen clock`);
  }
  // A tiny cap falls back to the depth-1 move, which is exactly what a depth-1 bot plays with the same noise.
  const tiny = seeded(41, () => chooseBotMoveTimed(new Chess(fen), strong, Chess, { deadlineAt: farDeadline, now: frozenNow, maxNodes: 50 }));
  assert.equal(tiny.value.nodeCapped, true);
  assert.equal(tiny.value.depth, 1, 'cap hit inside depth 2 -> depth-1 move');
  assert.ok(tiny.value.nodes <= 51, `tiny cap stops at ${tiny.value.nodes} nodes`);
  assert.ok(isLegal(fen, tiny.value.move));
  const depthOne = seeded(41, () => chooseBotMove(new Chess(fen), { ...strong, searchDepthCap: 1 }, Chess));
  assert.equal(uci(tiny.value.move), uci(depthOne.value), 'depth-1 fallback equals the depth-1 search');
  assert.equal(tiny.next, depthOne.next, 'depth-1 fallback uses the same random numbers');

  // A cap that is not reached changes nothing: full depth, same move and RNG use as the untimed search.
  for (const [n, label] of [[51, 'endgame'], [19, 'pawnEnding'], [6, 'opening']]) {
    const plain = seeded(77 + n, () => chooseBotMove(new Chess(POSITIONS[label]), bot(n), Chess));
    const roomy = seeded(77 + n, () => chooseBotMoveTimed(new Chess(POSITIONS[label]), bot(n), Chess, { deadlineAt: farDeadline, now: frozenNow }));
    assert.equal(roomy.value.nodeCapped, false, `bot #${n} ${label}: cap not reached`);
    assert.equal(uci(roomy.value.move), uci(plain.value), `bot #${n} ${label}: same move below the cap`);
    assert.equal(roomy.next, plain.next, `bot #${n} ${label}: same random numbers below the cap`);
  }
  section(`PASS timed search: stops at ${MAX_TIMED_NODES} nodes with a frozen clock, keeps the last completed depth, depth-1 fallback, no change below the cap`);
}

// 3. Untimed path: same move in normal positions, bounded in extreme ones.
{
  let compared = 0;
  for (const [n, label] of [[1, 'opening'], [6, 'endgame'], [13, 'pawnEnding'], [19, 'endgame'], [30, 'opening'], [45, 'pawnEnding'], [51, 'endgame'], [61, 'pawnEnding']]) {
    for (const seed of [5, 6]) {
      const fen = POSITIONS[label];
      const before = seeded(seed * 1000 + n, () => chooseBotMove(new Chess(fen), bot(n), Chess));
      for (const deadlineAt of seed === 5 ? [null, undefined, NaN] : [null]) {
        const after = seeded(seed * 1000 + n, () => chooseBotMoveTimed(new Chess(fen), bot(n), Chess, { deadlineAt }));
        assert.equal(uci(after.value.move), uci(before.value), `bot #${n} ${label} seed ${seed}: untimed move unchanged`);
        assert.equal(after.next, before.next, `bot #${n} ${label} seed ${seed}: same random numbers`);
        assert.equal(after.value.depth, null, 'untimed result keeps depth null');
        assert.equal(after.value.complete, true);
        assert.equal(after.value.nodeCapped, false);
        assert.ok(after.value.nodes < MAX_UNTIMED_NODES, `normal position is far below the untimed budget (${after.value.nodes} nodes)`);
      }
      const message = structuredClone({ type: 'choose', id: 1, fen, bot: bot(n), deadlineAt: null });
      Math.random = seededRandom(seed * 1000 + n);
      const reply = await handleBotWorkerMessage(message, async () => Chess);
      Math.random = originalRandom;
      assert.equal(reply.type, 'move');
      assert.equal(uci(reply.move), uci(before.value), `bot #${n} ${label}: worker untimed path plays the same move`);
      compared++;
    }
  }

  const strong = { id: 'guard-strong', elo: 2600, style: 'universal' };
  const fen = POSITIONS.middlegame;
  const guarded = seeded(9, () => chooseBotMoveTimed(new Chess(fen), strong, Chess, { deadlineAt: null, maxNodes: 1500 }));
  assert.equal(guarded.value.nodeCapped, true, 'a small untimed budget is enforced');
  assert.equal(guarded.value.complete, false);
  assert.ok(guarded.value.nodes <= 1501, `untimed search stopped at ${guarded.value.nodes} nodes`);
  assert.ok(guarded.value.depth >= 1 && guarded.value.depth < 4);
  assert.ok(isLegal(fen, guarded.value.move), 'capped untimed search returns a legal move');

  // The default untimed budget, on the wide synthetic game (see section 2). The worker handler and the page fallback
  // both reach this through chooseBotMoveTimed (src/bot-worker.ts, src/bot-worker-client.ts).
  const Huge = makeWideGame(300);
  const huge = seeded(9, () => chooseBotMoveTimed(new Huge(), strong, Huge, { deadlineAt: null })).value;
  assert.equal(huge.nodeCapped, true, 'default untimed budget reached');
  assert.equal(huge.nodes, MAX_UNTIMED_NODES + 1, 'stopped exactly at the untimed budget');
  assert.equal(huge.complete, false);
  assert.ok(huge.depth >= 1 && huge.depth < 4, `fell back to a completed depth (${huge.depth})`);
  assert.ok(new Huge().moves().some((m) => m.san === huge.move?.san), 'returns one of the root moves');
  const sources = await Promise.all(['src/bot-worker.ts', 'src/bot-worker-client.ts'].map((f) => readFile(f, 'utf8')));
  for (const source of sources) assert.ok(/chooseBotMoveTimed\(/.test(source) && !/chooseBotMove\(/.test(source), 'worker and fallback never call the unbounded chooseBotMove');
  section(`PASS untimed path: ${compared} bot/position/seed cases give chooseBotMove's move and RNG state (direct and through the worker handler); a small budget returns a legal depth-${guarded.value.depth} move; the ${MAX_UNTIMED_NODES}-node budget stops a runaway search at depth ${huge.depth}`);
}

console.log('PASS bot memory guard');
