// Checks the background bot search: time-pressure rule, untimed identity with the d5aa519 search,
// timed iterative deepening, the worker client, the real worker file and the blindfold page.
// Bots are referred to as "bot #N" (1-based position in public/data/bots/index.json).
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isMainThread, parentPort, workerData, Worker as NodeWorker } from 'node:worker_threads';

const HARNESS_ROLE = 'veyra-bot-worker-harness';
const RULES_SPECIFIER = '/vendor/veyra-rules/chess-compat.js';

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

if (!isMainThread && workerData?.role === HARNESS_ROLE) {
  // Runs dist/src/bot-worker.js the way a browser module worker would: WorkerGlobalScope `self`,
  // postMessage/onmessage, and the same absolute rules URL the page uses.
  const { registerHooks } = await import('node:module');
  if (typeof registerHooks !== 'function') throw new Error('Node with module.registerHooks (>= 22.15) is required');
  const rulesUrl = new URL('../public/vendor/veyra-rules/chess-compat.js', import.meta.url).href;
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === RULES_SPECIFIER) return { url: rulesUrl, shortCircuit: true };
      return nextResolve(specifier, context);
    },
  });
  if (typeof workerData.seed === 'number') Math.random = seededRandom(workerData.seed);
  class WorkerGlobalScope {}
  const scope = Object.create(WorkerGlobalScope.prototype);
  scope.postMessage = (message) => parentPort.postMessage(message);
  Object.defineProperty(globalThis, 'WorkerGlobalScope', { value: WorkerGlobalScope, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'self', { value: scope, configurable: true, writable: true });
  parentPort.on('message', (data) => { if (typeof scope.onmessage === 'function') scope.onmessage({ data }); });
  await import(new URL('../dist/src/bot-worker.js', import.meta.url).href);
} else {
  await runChecks();
}

async function runChecks() {
  const started = Date.now();
  const { Chess } = await import('../public/vendor/veyra-rules/chess-compat.js');
  const { chooseBotMove, chooseBotMoveTimed } = await import('../dist/src/bot-engine.js');
  const { botBudgetMs, botThinkingDelayMs, botNow } = await import('../dist/src/bot-time.js');
  const { handleBotWorkerMessage } = await import('../dist/src/bot-worker.js');
  const {
    createBotWorkerClient, chooseBotMoveAsync, cancelBotMove, isBotMoveCancelled, workerBotFields, botMoveOnPage,
    BOT_WORKER_BOT_FIELDS, BOT_WORKER_WATCHDOG_GRACE_MS, BOT_WORKER_BOOT_TIMEOUT_MS,
  } = await import('../dist/src/bot-worker-client.js');
  const manifest = JSON.parse(await readFile('public/data/bots/index.json', 'utf8'));
  const bot = (n) => manifest[n - 1];
  const maxDepthOf = (n) => { const elo = bot(n).elo || 300; return elo >= 2400 ? 4 : elo >= 1700 ? 3 : elo >= 700 ? 2 : 1; };
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const originalRandom = Math.random;

  const POSITIONS = {
    book: new Chess().fen(),
    opening: 'rnbqkbnr/1ppppppp/p7/8/8/P7/1PPPPPPP/RNBQKBNR w KQkq - 0 2',
    middlegame: 'r3k2r/ppp2ppp/2n1bn2/3qp3/3PP3/2N1BN2/PPP2PPP/R2Q1RK1 b kq - 3 12',
    endgame: '8/5pk1/6p1/8/3R4/6P1/5PKP/2r5 w - - 0 40',
    pawnEnding: '8/8/4k3/8/8/4K3/4P3/8 w - - 0 50',
  };
  for (const [label, fen] of Object.entries(POSITIONS)) assert.ok(new Chess(fen).moves().length > 0, `position ${label} has legal moves`);
  const uci = (m) => m ? m.from + m.to + (m.promotion || '') : 'none';
  const isLegal = (fen, move) => {
    if (!move) return false;
    try { return Boolean(new Chess(fen).move({ from: move.from, to: move.to, promotion: move.promotion || undefined })); } catch { return false; }
  };
  const sameMove = (a, b) => uci(a) === uci(b);
  const section = (label) => console.log(`${label} (${((Date.now() - started) / 1000).toFixed(1)} s)`);

  // 1. Time-pressure rule.
  assert.equal(botBudgetMs(300000), 15000, '5:00 left -> 15 s');
  assert.equal(botBudgetMs(60000), 3000, '1:00 left -> 3 s');
  assert.equal(botBudgetMs(10000), 500, '10 s left -> 500 ms');
  assert.equal(botBudgetMs(2100), 200, '2.1 s left -> 200 ms minimum');
  const edges = [1, 2, 199, 200, 201, 399, 400, 401, 2000, 2100, 2199, 2200, 2201, 4000, 4200, 40000, 400000];
  const sweep = [];
  for (let r = 1; r <= 5000; r++) sweep.push(r);
  for (let r = 5000; r <= 400000; r += 997) sweep.push(r);
  for (const r of [...edges, ...sweep]) {
    const b = botBudgetMs(r);
    assert.ok(b > 0 && b < r, `budget must be > 0 and < remaining (R=${r}, b=${b})`);
    if (r >= 2) assert.ok(b >= 1, `budget >= 1 ms (R=${r}, b=${b})`);
    if (r > 400) assert.ok(b >= 200, `200 ms minimum while it fits (R=${r}, b=${b})`);
    if (r >= 2200) assert.ok(b <= r - 2000, `budget never more than remaining - 2 s (R=${r}, b=${b})`);
    if (r >= 4000) assert.ok(b <= r / 20, `budget at most 1/20 of the clock (R=${r}, b=${b})`);
  }
  assert.equal(botBudgetMs(0), 0);
  assert.equal(botBudgetMs(-5), 0);
  assert.equal(botBudgetMs(NaN), Infinity, 'no usable clock -> no budget');
  assert.equal(botThinkingDelayMs(1000, botBudgetMs(NaN)), botThinkingDelayMs(1000, null), 'no usable clock -> untimed delay');
  for (let elo = 0; elo <= 3000; elo += 25) {
    const base = Math.min(4700, Math.max(350, 1200 - (elo || 300) / 4));
    assert.equal(botThinkingDelayMs(elo, null), base, 'untimed humanizing delay is unchanged');
    for (const budget of [200, 500, 3000, 15000]) {
      const d = botThinkingDelayMs(elo, budget);
      assert.ok(d <= base && d <= budget * 0.2 + 1e-9, `delay fits in 20% of the budget (elo ${elo}, budget ${budget})`);
    }
  }
  const t1 = botNow(); const t2 = botNow();
  assert.ok(Number.isFinite(t1) && t2 >= t1 && Math.abs(t1 - Date.now()) < 60000, 'botNow is epoch-like and monotonic');
  section(`PASS time-pressure rule: 4 examples, ${edges.length + sweep.length} remaining-clock values, delay inside 20% of the budget`);

  // 2a. The synchronous search is the d5aa519 code, byte for byte (the file only grew at the end),
  // and the worker message carries every bot field that code reads.
  const engineSource = (await readFile('src/bot-engine.ts', 'utf8')).replace(/\r\n/g, '\n');
  const BASE_LENGTH = 4520;
  const BASE_SHA256 = 'df33ce1e8662a9173ac977ad73c3c575bc2e56985f77aee00658a8b378a9f3b1';
  assert.equal(createHash('sha256').update(engineSource.slice(0, BASE_LENGTH)).digest('hex'), BASE_SHA256, 'src/bot-engine.ts must start with the unchanged d5aa519 search');
  const botFieldsRead = new Set([...engineSource.matchAll(/\bbot\??\.(\w+)/g)].map((m) => m[1]));
  for (const field of botFieldsRead) assert.ok(BOT_WORKER_BOT_FIELDS.includes(field), `bot.${field} is read by the search but not sent to the worker`);

  // 2b. AC1: for every bot, the new untimed path (the worker's message handler, with the bot cloned
  // as postMessage would) plays the d5aa519 move and uses the same random numbers, in a position
  // where every bot searches (no book, no random-move shortcut). Expected values were produced by
  // the d5aa519 chooseBotMove with the same seeds. If a bot's data changes, that bot is compared
  // against the (unchanged, see 2a) synchronous search instead.
  const fingerprint = (b) => createHash('sha256').update(JSON.stringify(BOT_WORKER_BOT_FIELDS.map((k) => b[k] ?? null))).digest('hex').slice(0, 12);
  const searchSeed = (n) => { let s = 100 + n; while (seededRandom(s)() < 0.22) s++; return s; };
  const D5AA519_PAWN_ENDING = [
    [1, 'e3d3', 8, '9a3eb7674bfd'], [2, 'e3d3', 8, '912ff1d0dfc8'], [3, 'e3d2', 8, '5bb62ccbffc0'], [4, 'e3e4', 8, '55ccadb60d26'],
    [5, 'e3f3', 8, 'e21470c21e76'], [6, 'e3d4', 7, '5ce8fe89e842'], [7, 'e3d4', 7, 'b8d94fd17f81'], [8, 'e3f3', 7, '94fd42d1e5e4'],
    [9, 'e3d2', 7, '445841710e70'], [10, 'e3d4', 7, '442d58a56d73'], [11, 'e3d4', 7, '30a8c004143f'], [12, 'e3e4', 7, '8b3f5f6c1650'],
    [13, 'e3f4', 7, 'd0f2eb5bee30'], [14, 'e3f3', 7, '685f0f597dd9'], [15, 'e3f2', 7, '77d93e6b666c'], [16, 'e3d2', 7, 'b412fe3d230a'],
    [17, 'e3f4', 7, '80e4c4bad62a'], [18, 'e3f3', 7, 'bffd2167bb4c'], [19, 'e3f3', 7, '42ee4bcf2007'], [20, 'e3d4', 7, 'a19d4f9ead39'],
    [21, 'e3d4', 7, '618beafdcba6'], [22, 'e3d4', 7, '0c4bc4890785'], [23, 'e3f4', 7, '10cbda5ce71d'], [24, 'e3f4', 7, 'fd0e7902dcaa'],
    [25, 'e3f2', 7, '9b98fb2b6883'], [26, 'e3e4', 7, '0dbf951b90bf'], [27, 'e3f2', 7, 'f9956124e89e'], [28, 'e3d3', 7, '3e65cbf20d02'],
    [29, 'e3e4', 7, 'cd72a555c095'], [30, 'e3e4', 7, 'cba7b9f63b49'], [31, 'e3e4', 7, 'f2b520e18192'], [32, 'e3e4', 7, '0397b527cd3a'],
    [33, 'e3f2', 7, 'd8d46e747483'], [34, 'e3e4', 7, 'd6a8bd8a79e9'], [35, 'e3d4', 7, 'a2b6863ecbc2'], [36, 'e3d4', 7, '85b1637ee6da'],
    [37, 'e3d2', 7, '8733470985df'], [38, 'e3e4', 7, '5f983f7df6ad'], [39, 'e3e4', 7, 'a807eb2eac0d'], [40, 'e3e4', 7, '2cd9904294b6'],
    [41, 'e3d4', 7, 'f7665cd45590'], [42, 'e3d4', 7, 'fd73b78373f4'], [43, 'e3d2', 7, '9872b8acfeef'], [44, 'e3e4', 7, '45efe052b444'],
    [45, 'e3f3', 7, '4a935b6b35f6'], [46, 'e3d4', 7, '7f5f275bcb5e'], [47, 'e3d4', 7, '733c611cd930'], [48, 'e3f4', 7, '96a53c9d2c73'],
    [49, 'e3e4', 7, '0384c31c4753'], [50, 'e3d3', 7, 'e6f13a6af134'], [51, 'e3d4', 7, '9ba27f57f1d4'],
  ];
  assert.equal(D5AA519_PAWN_ENDING.length, manifest.length, 'one expected value per bot');
  function counted(seed) {
    const r = seededRandom(seed);
    const rngState = { draws: 0 };
    Math.random = () => { rngState.draws++; return r(); };
    return rngState;
  }
  const legalCount = new Chess(POSITIONS.pawnEnding).moves().length;
  let liveCompared = 0;
  try {
    for (const [n, expectedUci, expectedDraws, expectedFingerprint] of D5AA519_PAWN_ENDING) {
      const seed = searchSeed(n);
      let expected = { uci: expectedUci, draws: expectedDraws };
      if (fingerprint(bot(n)) !== expectedFingerprint) {
        const rs = counted(seed);
        expected = { uci: uci(chooseBotMove(new Chess(POSITIONS.pawnEnding), bot(n), Chess)), draws: rs.draws };
        Math.random = originalRandom;
        liveCompared++;
      }
      const message = structuredClone({ type: 'choose', id: n, fen: POSITIONS.pawnEnding, bot: workerBotFields(bot(n)), deadlineAt: null });
      const rs = counted(seed);
      const reply = await handleBotWorkerMessage(message, async () => Chess);
      Math.random = originalRandom;
      assert.equal(reply.type, 'move');
      assert.equal(uci(reply.move), expected.uci, `bot #${n}: untimed worker path plays the d5aa519 move`);
      assert.equal(rs.draws, expected.draws, `bot #${n}: same random numbers used as d5aa519`);
      assert.ok(rs.draws >= legalCount, `bot #${n}: actually searched (${rs.draws} draws)`);
      const ts = counted(seed);
      const timed = chooseBotMoveTimed(new Chess(POSITIONS.pawnEnding), bot(n), Chess, { deadlineAt: botNow() + 1e9 });
      Math.random = originalRandom;
      assert.equal(uci(timed.move), expected.uci, `bot #${n}: timed search that completes plays the untimed move`);
      assert.equal(ts.draws, expected.draws, `bot #${n}: timed search uses the same random numbers`);
      assert.equal(timed.depth, maxDepthOf(n), `bot #${n}: timed search completed its full depth`);
    }
  } finally {
    Math.random = originalRandom;
  }
  section(`PASS untimed identity with d5aa519 for all ${manifest.length} bots in a searched position (${liveCompared} compared live), timed full-depth result identical`);

  // 2c. Timed search with an unreachable deadline = untimed search, on more positions.
  function compare(n, fen, seed, label) {
    Math.random = seededRandom(seed);
    const untimed = chooseBotMove(new Chess(fen), bot(n), Chess);
    const untimedNext = Math.random();
    Math.random = seededRandom(seed);
    const timed = chooseBotMoveTimed(new Chess(fen), bot(n), Chess, { deadlineAt: botNow() + 1e9 });
    const timedNext = Math.random();
    Math.random = originalRandom;
    assert.ok(sameMove(untimed, timed.move), `bot #${n} ${label} seed ${seed}: timed ${uci(timed.move)} != untimed ${uci(untimed)}`);
    assert.equal(timedNext, untimedNext, `bot #${n} ${label} seed ${seed}: RNG consumption differs`);
    return timed;
  }
  let compared = 0;
  try {
    for (let n = 1; n <= manifest.length; n++) { compare(n, POSITIONS.book, 11, 'book'); compared++; }
    for (let n = 1; n <= 24; n += 3) for (const label of ['opening', 'endgame']) { compare(n, POSITIONS[label], 1000 + n, label); compared++; }
    for (const n of [6, 13]) { compare(n, POSITIONS.middlegame, 1500 + n, 'middlegame'); compared++; }
    let randomBranch = 0, searchBranch = 0;
    for (let seed = 1; seed <= 12; seed++) {
      if (seededRandom(seed)() < 0.22) randomBranch++; else searchBranch++;
      compare(3, POSITIONS.opening, seed, 'opening'); compared++;
    }
    assert.ok(randomBranch > 0 && searchBranch > 0, 'random-move and search branches both exercised');
    // Repertoire positions at several plies (the timed book lookup against the original one).
    let inBook = 0;
    for (const n of [1, 19, 51]) {
      for (const key of ['openingsAsWhite', 'openingsAsBlack', 'gambits']) {
        for (const line of (bot(n)[key] || []).slice(0, 2)) {
          const tokens = String(line.moves || '').replace(/\d+\.(\.\.\.)?/g, ' ').split(/\s+/).filter(Boolean);
          const probe = new Chess();
          for (let ply = 0; ply < Math.min(tokens.length, 9); ply++) {
            if (ply % 2 === (key === 'openingsAsBlack' ? 1 : 0)) {
              if (compare(n, probe.fen(), 3000 + compared, 'repertoire').depth === 0) inBook++;
              compared++;
            }
            if (!probe.move(tokens[ply], { sloppy: true })) break;
          }
        }
      }
    }
    assert.ok(inBook > 20, `repertoire path exercised (${inBook} book moves)`);
  } finally {
    Math.random = originalRandom;
  }
  section(`PASS timed search with an unreachable deadline matches the untimed search (move and RNG state): ${compared} more cases`);

  // 3. Deadline is respected (bot #51, middlegame). Depth 1 is never aborted, so the bound is
  // max(budget, depth-1 time on this machine) plus a generous margin for slow shared runners.
  let depthOneMs = 0;
  {
    const start = botNow();
    const result = chooseBotMoveTimed(new Chess(POSITIONS.middlegame), bot(51), Chess, { deadlineAt: start - 5000 });
    depthOneMs = botNow() - start;
    assert.equal(result.depth, 1, 'deadline already passed -> depth 1 only');
    assert.ok(isLegal(POSITIONS.middlegame, result.move));
  }
  for (const budget of [200, 1000]) {
    const start = botNow();
    const result = chooseBotMoveTimed(new Chess(POSITIONS.middlegame), bot(51), Chess, { deadlineAt: start + budget });
    const elapsed = botNow() - start;
    assert.ok(isLegal(POSITIONS.middlegame, result.move), `budget ${budget}: legal move`);
    assert.ok(elapsed <= Math.max(budget, depthOneMs) + 1000, `budget ${budget}: returned after ${elapsed.toFixed(0)} ms (depth-1 search ${depthOneMs.toFixed(0)} ms)`);
    assert.ok(result.depth >= 1 && result.depth <= 4);
    console.log(`  bot #51 middlegame budget ${budget} ms -> ${elapsed.toFixed(0)} ms, completed depth ${result.depth} (depth-1 alone ${depthOneMs.toFixed(0)} ms)`);
  }
  section('PASS timed search returns a legal move by its deadline (plus depth 1); a passed deadline still yields a depth-1 move');

  // 4. Worker client with a scripted fake worker and a fake clock.
  function fakeClock() {
    let t = 1_000_000;
    let nextHandle = 0;
    const timers = new Map();
    return {
      now: () => t,
      setTimer: (fn, ms) => {
        const h = ++nextHandle;
        // Zero-delay timers (queued fallbacks) run on the real event loop unless cleared first.
        if (!(ms > 0)) { timers.set(h, { at: Infinity, fn }); setImmediate(() => { if (timers.delete(h)) fn(); }); return h; }
        timers.set(h, { at: t + ms, fn });
        return h;
      },
      clearTimer: (h) => { timers.delete(h); },
      advance(ms) {
        const end = t + ms;
        for (;;) {
          let due = null;
          for (const [h, timer] of timers) if (timer.at <= end && (!due || timer.at < due[1].at)) due = [h, timer];
          if (!due) break;
          timers.delete(due[0]);
          t = Math.max(t, due[1].at);
          due[1].fn();
        }
        t = end;
      },
      pending: () => timers.size,
    };
  }
  class FakeWorker {
    static all = [];
    constructor() { this.sent = []; this.terminated = false; this.onmessage = null; this.onerror = null; this.onmessageerror = null; this.throwOnPost = false; FakeWorker.all.push(this); }
    postMessage(message) { if (this.throwOnPost) throw new Error('DataCloneError'); this.sent.push(message); }
    terminate() { this.terminated = true; }
    reply(data) { if (this.onmessage) this.onmessage({ data }); }
    fail() { if (this.onerror) this.onerror({ preventDefault() {} }); }
  }
  const newClient = () => { FakeWorker.all = []; const clock = fakeClock(); return { clock, c: createBotWorkerClient({ createWorker: () => new FakeWorker(), now: clock.now, setTimer: clock.setTimer, clearTimer: clock.clearTimer }) }; };
  const fen = POSITIONS.middlegame;
  const legal = new Chess(fen).moves({ verbose: true })[0];
  const opts = { deadlineAt: null, ChessCtor: Chess };
  const outcome = (promise) => promise.then((value) => ({ value }), (error) => ({ error }));
  const settledWithin = async (promise) => { const marker = {}; return (await Promise.race([promise.then(() => true, () => true), sleep(20).then(() => marker)])) !== marker; };

  {
    const { c } = newClient();
    const p1 = c.choose(fen, bot(10), opts);
    const w = FakeWorker.all[0];
    w.reply({ type: 'ready' });
    assert.deepEqual(Object.keys(w.sent[0].bot).sort(), [...BOT_WORKER_BOT_FIELDS].sort());
    w.reply({ type: 'move', id: w.sent[0].id + 99, fen, move: legal });
    assert.equal(c.stats.staleReplies, 1, 'reply with another id is dropped');
    w.reply({ type: 'move', id: w.sent[0].id, fen, move: legal, depth: 2, complete: true });
    const r1 = await p1;
    assert.equal(r1.source, 'worker');
    assert.ok(sameMove(r1.move, legal));
    const p2 = c.choose(fen, bot(10), opts);
    assert.equal(FakeWorker.all.length, 1, 'singleton: the idle worker is reused');
    assert.ok(w.sent[1].id > w.sent[0].id, 'request ids increase');
    w.reply({ type: 'move', id: w.sent[1].id, fen, move: legal });
    await p2;
    c.cancel();
    assert.equal(w.terminated, false, 'cancel with nothing in flight is a no-op');
  }
  {
    const { c } = newClient();
    const p1 = outcome(c.choose(fen, bot(10), opts));
    const w1 = FakeWorker.all[0];
    w1.reply({ type: 'ready' });
    const p2 = c.choose(fen, bot(10), opts);
    assert.ok(isBotMoveCancelled((await p1).error), 'superseded request rejects as cancelled');
    assert.equal(w1.terminated, true, 'a busy worker is terminated when superseded');
    const w2 = FakeWorker.all[1];
    w1.reply({ type: 'move', id: w1.sent[0].id, fen, move: legal });
    assert.equal(c.state().inflight, true, 'late reply from the terminated worker is ignored');
    w2.reply({ type: 'ready' });
    w2.reply({ type: 'move', id: w2.sent[0].id, fen, move: legal });
    assert.equal((await p2).source, 'worker');
    const p3 = outcome(c.choose(fen, bot(10), opts));
    c.cancel();
    assert.ok(isBotMoveCancelled((await p3).error), 'cancel rejects the request in flight');
    assert.equal(w2.terminated, true, 'cancel terminates the busy worker');
    assert.equal(c.stats.created - c.stats.terminated, 0, 'no worker accumulation');
  }
  {
    const { c } = newClient();
    const ask = () => c.choose(fen, bot(10), opts);
    const p = ask();
    const w = FakeWorker.all[0];
    w.reply({ type: 'ready' });
    w.reply({ type: 'move', id: w.sent[0].id, fen: POSITIONS.endgame, move: legal });
    const r = await p;
    assert.equal(r.source, 'fallback', 'reply for another FEN is not applied');
    assert.ok(isLegal(fen, r.move));
    const p2 = ask();
    w.reply({ type: 'move', id: w.sent[1].id, fen, move: { from: 'a1', to: 'h8' } });
    assert.equal((await p2).source, 'fallback', 'illegal reply falls back to the page search');
    const p3 = ask();
    w.reply({ type: 'move', id: w.sent[2].id, fen, move: null });
    assert.equal((await p3).source, 'fallback', 'null reply in a position with moves falls back');
    const p4 = ask();
    w.reply({ type: 'error', id: w.sent[3].id, fatal: false, message: 'x' });
    assert.equal((await p4).source, 'fallback');
    assert.equal(c.state().disabled, false, 'one non-fatal error keeps the worker');
    const p5 = ask();
    w.reply({ type: 'error', id: w.sent[4].id, fatal: false, message: 'x' });
    assert.equal((await p5).source, 'fallback');
    assert.equal(c.state().disabled, true, 'repeated non-fatal errors count as crashes and disable the worker');
    const before = FakeWorker.all.length;
    assert.equal((await ask()).source, 'fallback');
    assert.equal(FakeWorker.all.length, before, 'sticky fallback: no new worker');
  }
  {
    const { c } = newClient();
    const p = c.choose(fen, bot(10), opts);
    FakeWorker.all[0].reply({ type: 'ready' });
    FakeWorker.all[0].reply({ type: 'error', id: FakeWorker.all[0].sent[0].id, fatal: true, message: 'rules' });
    assert.equal((await p).source, 'fallback');
    assert.equal(c.state().disabled, true, 'fatal error disables the worker');
  }
  {
    const { c } = newClient();
    const p = c.choose(fen, bot(10), opts);
    FakeWorker.all[0].fail();
    assert.equal((await p).source, 'fallback', 'worker that fails to load -> page search');
    assert.equal(c.state().disabled, true, 'load failure is sticky');
    const { c: c2 } = newClient();
    const p2 = c2.choose(fen, bot(10), opts);
    FakeWorker.all[0].reply({ type: 'boot-error' });
    assert.equal((await p2).source, 'fallback', 'rules that fail to load in the worker -> page search');
    assert.equal(c2.state().disabled, true);
  }
  {
    // Boot timeout: an untimed request to a worker that never becomes ready.
    const { c, clock } = newClient();
    const p = c.choose(fen, bot(10), opts);
    clock.advance(BOT_WORKER_BOOT_TIMEOUT_MS - 1);
    assert.equal(await settledWithin(p), false, 'still waiting before the boot timeout');
    clock.advance(1);
    const r = await p;
    assert.equal(r.source, 'fallback', 'boot timeout -> page search');
    assert.equal(FakeWorker.all[0].terminated, true);
    assert.equal(c.state().disabled, true, 'boot timeout is sticky');
    // Untimed search after a successful boot has no time cap (owner decision pending).
    const { c: c2, clock: clock2 } = newClient();
    const p2 = c2.choose(fen, bot(10), opts);
    FakeWorker.all[0].reply({ type: 'ready' });
    clock2.advance(10 * 60 * 1000);
    assert.equal(await settledWithin(p2), false, 'untimed search on a ready worker is not cut off');
    assert.equal(clock2.pending(), 0, 'no timer left for an untimed request on a ready worker');
    c2.cancel();
  }
  {
    const { c } = newClient();
    for (let i = 0; i < 2; i++) {
      const p = c.choose(fen, bot(10), opts);
      const w = FakeWorker.all[i];
      w.reply({ type: 'ready' });
      w.fail();
      assert.equal((await p).source, 'fallback', 'crash -> page search');
    }
    assert.equal(c.state().disabled, true, 'two crashes in a row disable the worker');
    const { c: c2 } = newClient();
    let p = c2.choose(fen, bot(10), opts);
    FakeWorker.all[0].reply({ type: 'ready' });
    FakeWorker.all[0].fail();
    await p;
    for (let i = 0; i < 10; i++) {
      p = c2.choose(fen, bot(10), opts);
      const ww = FakeWorker.all.at(-1);
      if (i === 0) ww.reply({ type: 'ready' });
      ww.reply({ type: 'move', id: ww.sent.at(-1).id, fen, move: legal });
      await p;
    }
    assert.equal(c2.state().crashes, 0, 'a crash is forgiven after 10 good replies');
    p = c2.choose(fen, bot(10), opts);
    FakeWorker.all.at(-1).fail();
    await p;
    assert.equal(c2.state().disabled, false, 'an isolated later crash does not disable the worker');
  }
  {
    // postMessage failure: this request falls back, the worker stays usable.
    const { c, clock } = newClient();
    const p0 = c.choose(fen, bot(10), opts);
    const w = FakeWorker.all[0];
    w.reply({ type: 'ready' });
    w.reply({ type: 'move', id: w.sent[0].id, fen, move: legal });
    await p0;
    w.throwOnPost = true;
    const p = c.choose(fen, bot(10), opts);
    clock.advance(0);
    assert.equal((await p).source, 'fallback', 'unsendable request -> page search');
    assert.equal(c.state().disabled, false, 'an unsendable request does not disable the worker');
    w.throwOnPost = false;
    const p2 = c.choose(fen, bot(10), opts);
    w.reply({ type: 'move', id: w.sent.at(-1).id, fen, move: legal });
    assert.equal((await p2).source, 'worker');
    assert.equal(FakeWorker.all.length, 1);
  }
  {
    const throwing = createBotWorkerClient({ createWorker: () => { throw new Error('no module workers'); } });
    const r = await throwing.choose(fen, bot(10), opts);
    assert.equal(r.source, 'fallback');
    assert.ok(isLegal(fen, r.move));
    const none = createBotWorkerClient({ createWorker: () => null });
    assert.equal((await none.choose(fen, bot(10), opts)).source, 'fallback');
  }
  {
    // Watchdog: a timed request whose worker never answers is served by a bounded page search.
    const { c, clock } = newClient();
    const p = c.choose(fen, bot(51), { deadlineAt: clock.now() + 100, ChessCtor: Chess });
    FakeWorker.all[0].reply({ type: 'ready' });
    clock.advance(100 + BOT_WORKER_WATCHDOG_GRACE_MS - 1);
    assert.equal(await settledWithin(p), false, 'no fallback before deadline + grace');
    clock.advance(1);
    const r = await p;
    assert.equal(r.source, 'fallback');
    assert.ok(isLegal(fen, r.move));
    assert.equal(r.depth, 1, 'deadline already passed -> depth-1 page search');
    assert.equal(FakeWorker.all[0].terminated, true, 'watchdog terminates the stuck worker');
    assert.equal(c.state().disabled, false, 'a slow ready worker is not disabled');
    const { c: c2 } = newClient();
    const p2 = c2.choose(fen, bot(10), { deadlineAt: botNow() + botBudgetMs(NaN), ChessCtor: Chess });
    assert.equal(FakeWorker.all[0].sent[0].deadlineAt, null, 'an infinite deadline is sent as untimed');
    c2.cancel();
    await outcome(p2);
  }
  {
    // Last-resort page move used when a reply has no move.
    for (const [label, f] of Object.entries(POSITIONS)) assert.ok(isLegal(f, botMoveOnPage(f, bot(51), Chess)), `botMoveOnPage legal (${label})`);
    assert.ok(isLegal(fen, botMoveOnPage(fen, {}, Chess)));
    assert.equal(botMoveOnPage('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', bot(5), Chess), null, 'no move in a finished game');
    // Page singleton in an environment without Worker: today's synchronous search, via the async API.
    assert.equal(typeof globalThis.Worker, 'undefined');
    const r = await chooseBotMoveAsync(POSITIONS.endgame, bot(19), { deadlineAt: null, ChessCtor: Chess });
    assert.equal(r.source, 'fallback');
    assert.ok(isLegal(POSITIONS.endgame, r.move));
    cancelBotMove();
  }
  section('PASS worker client: ids, stale/foreign/illegal replies, supersede/cancel, boot timeout, sticky fallback, crash limits, watchdog');

  // 5. The real worker file, run as a module worker in a Node thread.
  class ThreadWorker {
    constructor(seed) {
      this.onmessage = null; this.onerror = null; this.onmessageerror = null;
      this.thread = new NodeWorker(new URL(import.meta.url), { workerData: { role: HARNESS_ROLE, seed } });
      this.thread.on('message', (data) => { if (this.onmessage) this.onmessage({ data }); });
      this.thread.on('error', (error) => { this.lastError = error; if (this.onerror) this.onerror({ preventDefault() {} }); });
    }
    postMessage(message) { this.thread.postMessage(message); }
    terminate() { this.thread.terminate(); }
  }
  const threads = [];
  const threadClient = (seed) => createBotWorkerClient({ createWorker: () => { const t = new ThreadWorker(seed); threads.push(t); return t; } });
  try {
    for (const [n, label, seed] of [[5, 'opening', 7], [40, 'pawnEnding', 10], [51, 'book', 12]]) {
      const tc = threadClient(seed);
      const r = await tc.choose(POSITIONS[label], bot(n), { deadlineAt: null, ChessCtor: Chess });
      assert.equal(r.source, 'worker', `bot #${n} ${label}: answered by the worker ${threads.at(-1)?.lastError || ''}`);
      Math.random = seededRandom(seed);
      const expected = chooseBotMove(new Chess(POSITIONS[label]), bot(n), Chess);
      Math.random = originalRandom;
      assert.ok(sameMove(r.move, expected), `bot #${n} ${label}: worker move ${uci(r.move)} equals the page search ${uci(expected)}`);
      threads.at(-1).terminate();
    }
    const tc = threadClient(13);
    const start = botNow();
    const r = await tc.choose(POSITIONS.middlegame, bot(51), { deadlineAt: start + 300, ChessCtor: Chess });
    const elapsed = botNow() - start;
    assert.equal(r.source, 'worker', `timed request answered by the worker (${elapsed.toFixed(0)} ms incl. worker start)`);
    assert.ok(isLegal(POSITIONS.middlegame, r.move));
    const r2 = await tc.choose(POSITIONS.endgame, bot(51), { deadlineAt: botNow() + 300, ChessCtor: Chess });
    assert.equal(r2.source, 'worker');
    assert.equal(tc.stats.created, 1, 'warm worker reused');
    // Supersede a long untimed search in the real worker: it is terminated, not queued behind.
    const slow = outcome(tc.choose(POSITIONS.middlegame, bot(51), { deadlineAt: null, ChessCtor: Chess }));
    await sleep(50);
    const quick = await tc.choose(POSITIONS.endgame, bot(10), { deadlineAt: null, ChessCtor: Chess });
    assert.ok(isBotMoveCancelled((await slow).error));
    assert.equal(quick.source, 'worker');
    assert.equal(tc.stats.created, 2);
    assert.equal(tc.stats.terminated, 1);
    tc.cancel();
    section(`PASS real worker file: seeded worker moves equal the page search, timed request in ${elapsed.toFixed(0)} ms, supersede restarts the worker`);

    // 6. AC6: the blindfold page itself, player black, bot replies through the real worker.
    const page = installPageRuntime(Chess);
    const { BlindfoldTrainingPage } = await import('../dist/src/blindfold-page.js');
    const blindfoldClient = threadClient(21);
    const calls = [];
    const scenarios = [
      ['worker', (f, b, o) => { calls.push(o); return blindfoldClient.choose(f, b, o); }, 'הבוט ביצע מהלך.'],
      ['reply without a move', async () => ({ move: null, source: 'fallback', depth: null, complete: true }), 'הבוט ביצע מהלך.'],
      ['failed chooser', async () => { throw new Error('boom'); }, 'מהלך הבוט נכשל. אפשר להתחיל משחק חדש.'],
    ];
    for (const [label, chooser, expectedStatus] of scenarios) {
      const inst = page.mount(BlindfoldTrainingPage, { bots: manifest, onBack() {}, onReview() {}, chooseBotMove: chooser, initialBotId: null });
      const sideSelect = page.find(inst.tree, (n) => n.type === 'select' && page.find(n, (o) => o.type === 'option' && o.props.value === 'black').length)[0];
      sideSelect.props.onChange({ target: { value: 'black' } });
      const statusOf = () => page.find(inst.tree, (n) => String(n.props?.className || '').includes('blindfold-status-pill')).map(page.text).join('');
      const gameOf = () => inst.hooks.find((slot) => slot && slot.v && typeof slot.v.fen === 'function').v;
      const until = Date.now() + 15000;
      while (Date.now() < until && statusOf() !== expectedStatus) await sleep(25);
      assert.equal(statusOf(), expectedStatus, `blindfold (${label}): status`);
      const history = gameOf().history();
      assert.equal(history.length, expectedStatus === 'הבוט ביצע מהלך.' ? 1 : 0, `blindfold (${label}): bot moves ${history.join(' ')}`);
      if (history.length) assert.equal(gameOf().turn(), 'b', 'player (black) to move after the bot reply');
      inst.unmount();
    }
    assert.ok(calls.length >= 1 && calls.every((o) => typeof o.ChessCtor === 'function' && o.deadlineAt === null), 'blindfold passes the rules constructor and no deadline (B-01)');
    assert.equal(blindfoldClient.stats.workerReplies >= 1, true, 'blindfold reply came from the worker');
    section('PASS blindfold page (player black): bot reply through the worker, retry when a reply has no move, failure message (B-01 fixed)');
  } finally {
    Math.random = originalRandom;
    for (const t of threads) t.terminate();
  }

  // 7. Call sites use the background path.
  const main = await readFile('src/main.ts', 'utf8');
  const blindfold = await readFile('src/blindfold-page.ts', 'utf8');
  const legends = await readFile('src/legends-page.ts', 'utf8');
  assert.ok(main.includes("import { chooseBotMoveAsync as chooseBotMove, cancelBotMove, botMoveOnPage } from './bot-worker-client.js';"), 'main uses the worker client');
  assert.ok(!main.includes("from './bot-engine.js'"), 'main no longer runs the search on the page');
  assert.ok(main.includes('botBudgetMs(') && main.includes('botThinkingDelayMs(bot.elo,budget)') && main.includes('botNow()+budget'), 'bot games apply the time-pressure rule');
  assert.ok(main.includes('gameRef.current.fen()!==fen') && main.includes('  resultRef.current=result;'), 'stale bot replies are ignored; result ref is current at render');
  assert.ok(main.includes('play(botMoveOnPage(fen,bot,Chess))'), 'bot game retries once on the page when a reply has no move');
  assert.ok(!/chooseBotMove\(next, bot\)/.test(blindfold), 'blindfold no longer calls the chooser without rules (B-01)');
  assert.ok(legends.includes('chooseBotMove(request.fen, mover, { deadlineAt: null, ChessCtor: Chess })'), 'legends use the untimed background path');
  assert.ok((legends.match(/stopPendingBotMove\(\); set(White|Black)Id/g) || []).length === 2 && legends.includes('if (running) stopPendingBotMove();'), 'legends pause / bot change cancel the move in flight');
  section('PASS call sites: bot game (timed), blindfold and legends (untimed) use the background path');
}

// Minimal React-like runtime (state, refs, effects) to run a dist page component in Node.
function installPageRuntime(Chess) {
  class FakeBoard { setPosition() {} setOrientation() {} destroy() {} enableMoveInput() {} }
  globalThis.window = { ChessLib: { Chess }, ChessBoardLib: { Chessboard: FakeBoard, COLOR: { white: 'w', black: 'b' }, BORDER_TYPE: { none: 'none' } } };
  let current = null;
  const same = (a, b) => a && b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
  globalThis.React = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) }),
    useState(init) {
      const inst = current; const idx = inst.i++;
      if (!(idx in inst.hooks)) inst.hooks[idx] = { v: typeof init === 'function' ? init() : init };
      const slot = inst.hooks[idx];
      return [slot.v, (value) => { const next = typeof value === 'function' ? value(slot.v) : value; if (!Object.is(next, slot.v)) { slot.v = next; inst.rerender(); } }];
    },
    useRef(init) { const inst = current; const idx = inst.i++; if (!(idx in inst.hooks)) inst.hooks[idx] = { current: init }; return inst.hooks[idx]; },
    useEffect(fn, deps) {
      const inst = current; const idx = inst.i++;
      if (!(idx in inst.hooks)) inst.hooks[idx] = { deps: undefined, cleanup: null, first: true };
      const slot = inst.hooks[idx];
      if (slot.first || !deps || !same(deps, slot.deps)) { slot.first = false; inst.effects.push({ idx, fn, deps }); }
    },
  };
  function mount(Component, props) {
    const inst = { hooks: [], i: 0, effects: [], tree: null, scheduled: false, unmounted: false };
    inst.rerender = () => { if (inst.scheduled || inst.unmounted) return; inst.scheduled = true; queueMicrotask(() => { inst.scheduled = false; render(); }); };
    function render() {
      if (inst.unmounted) return;
      current = inst; inst.i = 0; inst.effects = [];
      inst.tree = Component(props);
      current = null;
      for (const effect of inst.effects) {
        const slot = inst.hooks[effect.idx];
        if (slot.cleanup) slot.cleanup();
        slot.cleanup = effect.fn() || null;
        slot.deps = effect.deps;
      }
    }
    inst.unmount = () => { inst.unmounted = true; for (const slot of inst.hooks) if (slot && slot.cleanup) slot.cleanup(); };
    render();
    return inst;
  }
  function find(tree, pred, acc = []) { if (!tree || typeof tree !== 'object') return acc; if (pred(tree)) acc.push(tree); for (const c of tree.children || []) find(c, pred, acc); return acc; }
  const text = (n) => !n || typeof n !== 'object' ? String(n ?? '') : (n.children || []).map(text).join('');
  return { mount, find, text };
}
