// Automated verification + real Before/After MIT Chessy WASM benchmark for PR #169:
//  - Custom typed per-time-class game counts (0..100 each, safe total cap 150, warning >75)
//  - Strict bullet/blitz/rapid separation + server validation up to 100/class & 150 total
//  - Early-stop archive fetch ceiling + 40-fingerprint batching + device-aware worker pool sizing
//  - SaveGamePipeline: max 2 concurrent, HTTP 429 retry, strict failure barrier preventing partial report save
//  - REAL Before vs After wall-clock benchmark on identical games (Desktop 4-worker & Mobile 2-worker + FEN cache)
//    asserting 100% BIT-FOR-BIT IDENTICAL move evals, classifications, whiteAcc, blackAcc, whiteAcpl, blackAcpl!

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { Worker } from 'node:worker_threads';

const require = createRequire(import.meta.url);
const { Chess } = require('../public/vendor/veyra-rules/chess-compat.js');

const dnaMod = await import('../dist/src/chess-dna.js');
const fastMod = await import('../dist/src/dna-fast-scan.js');
const reviewMod = await import('../dist/src/review-metrics.js');

let passed = 0;
async function test(name, fn) {
  await fn();
  console.log(`PASS: ${name}`);
  passed += 1;
}

// 1. Custom typed game counts validation & strict per-class selection
await test('Custom typed game counts validate 0..100 per class, enforce 150 total cap, warn >75 & preserve time-class separation', () => {
  const n1 = dnaMod.normalizeDnaCustomCounts({ bullet: 10, blitz: 20, rapid: 30 });
  assert.deepEqual(n1.counts, { bullet: 10, blitz: 20, rapid: 30 });
  assert.equal(n1.total, 60);
  assert.equal(n1.highVolumeWarning, false);
  assert.equal(n1.valid, true);

  const nWarn = dnaMod.normalizeDnaCustomCounts({ bullet: 30, blitz: 30, rapid: 30 });
  assert.equal(nWarn.total, 90);
  assert.equal(nWarn.highVolumeWarning, true);

  const nCap = dnaMod.normalizeDnaCustomCounts({ bullet: 80, blitz: 80, rapid: 80 });
  assert.equal(nCap.total, 150, 'Total must be strictly capped at 150');
  assert.equal(nCap.clamped, true);

  const nZero = dnaMod.normalizeDnaCustomCounts({ bullet: 0, blitz: 0, rapid: 0 });
  assert.equal(nZero.valid, false);

  // Per-class custom selection: 2 bullet, 4 blitz, 0 rapid!
  const mk = (id, tc, idx) => ({
    id,
    date: `2026-10-${String(10 + (idx % 18)).padStart(2, '0')}`,
    playedAt: `2026-10-${String(10 + (idx % 18)).padStart(2, '0')}T10:${String(idx % 59).padStart(2, '0')}:00Z`,
    timeClass: tc,
    playerColor: 'white',
    playerColorKnown: true,
    source: 'chesscom',
    pgn: `[Event "${tc}"]\n[Date "2026.10.15"]\n[Result "1-0"]\n[White "p${idx}"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O 7. h3 a6 1-0`,
  });
  const pool = [
    ...Array.from({ length: 10 }, (_, i) => mk(`b${i}`, 'bullet', i)),
    ...Array.from({ length: 10 }, (_, i) => mk(`z${i}`, 'blitz', i + 10)),
    ...Array.from({ length: 10 }, (_, i) => mk(`r${i}`, 'rapid', i + 20)),
  ];
  const sel = dnaMod.selectLatestDnaGames(pool, { bullet: 2, blitz: 4, rapid: 0 });
  assert.equal(sel.selected.bullet.length, 2);
  assert.equal(sel.selected.blitz.length, 4);
  assert.equal(sel.selected.rapid.length, 0);
});

// 2. Early-stop fetch limit, 40-fingerprint batching, and desktop vs mobile worker pool sizing
await test('Early-stop fetch limit, 40-batching, and desktop (<=4) vs mobile (<=2) worker caps', () => {
  assert.equal(fastMod.computeEarlyStopFetchLimit({ bullet: 5, blitz: 5, rapid: 5 }), 60);
  assert.equal(fastMod.computeEarlyStopFetchLimit({ bullet: 25, blitz: 25, rapid: 25 }), 300);
  assert.equal(fastMod.batchItems(Array.from({ length: 75 }, (_, i) => i), 40).length, 2, '75 fingerprints must take 2 batches instead of 15!');
  assert.equal(fastMod.resolveWorkerPoolSize({ isMobile: false, hardwareConcurrency: 8, deviceMemory: 16, gamesToAnalyze: 20 }), 4);
  assert.equal(fastMod.resolveWorkerPoolSize({ isMobile: true, hardwareConcurrency: 8, deviceMemory: 8, gamesToAnalyze: 20 }), 2, 'Mobile must cap at 2 workers');
  assert.equal(fastMod.resolveWorkerPoolSize({ isMobile: false, hardwareConcurrency: 8, deviceMemory: 2, gamesToAnalyze: 20 }), 2, 'Low-memory must cap at 2 workers');
});

// 3. SaveGamePipeline: concurrency <= 2, HTTP 429 retry, and strict failure barrier preventing partial reports!
await test('SaveGamePipeline enforces concurrency<=2, retries HTTP 429, and blocks save-report if ANY game save fails', async () => {
  let inFlight = 0;
  let maxInFlight = 0;
  let callsForG2 = 0;

  const pipeOk = new fastMod.SaveGamePipeline(async (payload) => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise(r => setTimeout(r, 15));
    inFlight -= 1;
    if (payload.id === 'g2' && callsForG2++ === 0) return { ok: false, status: 429 };
    return { ok: true, status: 200 };
  }, { maxConcurrent: 2, maxRetries429: 2, baseRetryMs: 15 });

  for (const id of ['g1', 'g2', 'g3', 'g4', 'g5']) pipeOk.enqueue({ id }, id);
  const resOk = await pipeOk.flushAndVerify();
  assert.equal(resOk.ok, true);
  assert.equal(resOk.savedCount, 5);
  assert.equal(resOk.retryCount, 1, 'HTTP 429 must be retried cleanly');
  assert.ok(maxInFlight <= 2, `Max concurrent saves must be <=2, saw ${maxInFlight}`);

  // Simulate mid-scan failure -> flushAndVerify MUST throw so save-report NEVER runs on a partial set!
  const pipeFail = new fastMod.SaveGamePipeline(async (payload) => {
    await new Promise(r => setTimeout(r, 10));
    if (payload.id === 'bad') return { ok: false, status: 500 };
    return { ok: true, status: 200 };
  }, { maxConcurrent: 2, maxRetries429: 0 });
  pipeFail.enqueue({ id: 'ok1' }, 'ok1');
  pipeFail.enqueue({ id: 'bad' }, 'bad');
  pipeFail.enqueue({ id: 'ok2' }, 'ok2');
  await assert.rejects(() => pipeFail.flushAndVerify(), /נכשלה/, 'Any failed game save must reject flushAndVerify');
});

// 4. REAL Before vs After Benchmark with Chessy MIT WASM Engine + 100% Bit-for-Bit Determinism Proof!
await test('REAL Chessy MIT WASM Before vs After benchmark (Desktop 4w & Mobile 2w + FEN cache) is 100% bit-for-bit identical', async () => {
  // 8 realistic games sharing common opening positions (Italian / Ruy / Queen's Gambit) — identical games tested in all 3 modes!
  const samplePgns = [
    '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O 7. Bb3 a6 8. h3 Ba7',
    '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O 7. Re1 h6 8. Nbd2 Re8',
    '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Bd2 Bxd2+ 8. Nbxd2 d5',
    '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3 Bc5 5. c3 d6 6. O-O O-O 7. Bb3 a6 8. Re1 Ba7',
    '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 6. Nf3 h6 7. Bh4 b6 8. Bd3 Bb7',
    '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 6. Nf3 Nbd7 7. Rc1 c6 8. Bd3 dxc4',
    '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Nf3 Be7 5. Bf4 O-O 6. e3 c5 7. dxc5 Bxc5 8. Qc2 Nc6',
    '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O',
  ];
  const parsedGames = samplePgns.map(pgn => {
    const c = new Chess();
    c.loadPgn(pgn);
    return c.history({ verbose: true });
  });
  const openingsRaw = JSON.parse(await readFile('public/data/openings.json', 'utf8'));
  const openingSet = new Set(openingsRaw.map(r => String(r.m || '').trim()).filter(Boolean));

  // Inline Node worker_thread running the EXACT same Chessy MIT WASM search as public/engine-worker.js
  const workerCode = `
    const { parentPort } = require('node:worker_threads');
    const fs = require('node:fs');
    const vm = require('node:vm');
    const wasmJs = fs.readFileSync('public/vendor/wasm-engine.js', 'utf8');
    const ctx = { WebAssembly, Int32Array, Uint8Array, Float64Array, DataView, ArrayBuffer, TextEncoder, TextDecoder, performance, Math, Number, Error, console };
    vm.runInNewContext(wasmJs + '; this.WasmEngine = WasmEngine;', ctx);
    const buf = fs.readFileSync('public/vendor/chessy-ai-fast.wasm');
    let engine = null;
    ctx.WasmEngine.load(buf).then(e => { engine = e; parentPort.postMessage('ready'); });

    function sqName(i){return 'abcdefgh'[i%8]+(8-Math.floor(i/8));}
    function toUci(m){return m?sqName(m.from)+sqName(m.to)+(m.promotion?m.promotion.toLowerCase():''):null;}
    function sqIndex(s){return 'abcdefgh'.indexOf(s[0])+(8-Number(s[1]))*8;}
    function fromUci(u){return {from:sqIndex(u.slice(0,2)),to:sqIndex(u.slice(2,4)),promotion:u[4]?u[4].toUpperCase():null};}
    function cpToWin(cp){if(cp>=90000)return 100;if(cp<=-90000)return 0;return 50+50*(2/(1+Math.exp(-0.00368208*cp))-1);}
    function secondBestChance(fen,alternatives,bestUci,depth,moverTurn){
      const others=alternatives.filter(u=>u!==bestUci);
      if(!others.length) return null;
      engine.beginAnalysis(fen,{nodeLimit:60000,quiesce:true});
      const pov=r=>moverTurn==='w'?r.score:-r.score;
      const shallow=[];
      for(const u of others){const r=engine.searchRoot(fromUci(u),2,1);if(!r.complete)return null;shallow.push({u,score:pov(r)});}
      shallow.sort((a,b)=>b.score-a.score);
      const deep=Math.max(2,Math.min(4,depth-1));
      let top=-Infinity;
      for(const {u} of shallow.slice(0,3)){const r=engine.searchRoot(fromUci(u),deep,1);if(!r.complete)return null;top=Math.max(top,pov(r));}
      return cpToWin(top);
    }

    parentPort.on('message', (msg) => {
      const { id, fen, afterFen, mover, cachedBefore, cachedAfter, alternatives } = msg;
      const best = (cachedBefore && cachedBefore.fen === fen && Number.isFinite(cachedBefore.score))
        ? { score: cachedBefore.score, depth: cachedBefore.depth, cachedUci: cachedBefore.bestUci }
        : engine.search(fen, { maxDepth: 16, nodeLimit: 250000, timeMs: 0, quiesce: true });
      const after = (cachedAfter && cachedAfter.fen === afterFen && Number.isFinite(cachedAfter.score))
        ? { score: cachedAfter.score, depth: cachedAfter.depth, cachedUci: cachedAfter.bestUci }
        : engine.search(afterFen, { maxDepth: 16, nodeLimit: 250000, timeMs: 0, quiesce: true });
      const bestUci = best.cachedUci !== undefined ? best.cachedUci : toUci(best.move);
      const afterBestUci = after.cachedUci !== undefined ? after.cachedUci : toUci(after.move);
      const playedUci = mover.from + mover.to + (mover.promotion || '');
      const bestWin = cpToWin(best.score); const beforeWin = bestWin; const afterWin = cpToWin(after.score);
      const moverTurn = fen.split(' ')[1] === 'w' ? 'w' : 'b';
      const moverPovBest = moverTurn === 'w' ? bestWin : 100 - bestWin;
      const moverPovAfter = moverTurn === 'w' ? afterWin : 100 - afterWin;
      const isMateMove = (after.score >= 90000 && moverTurn === 'w') || (after.score <= -90000 && moverTurn === 'b');
      const drop = (bestUci === playedUci || isMateMove || moverPovAfter >= 99.9) ? 0 : Math.max(0, (moverPovBest - moverPovAfter) / 100);
      const moverSecondBestChance = (Array.isArray(alternatives) && bestUci === playedUci && !isMateMove) ? secondBestChance(fen, alternatives, bestUci, best.depth || 1, moverTurn) : null;
      const classification = bestUci === playedUci ? 'best' : drop < 0.02 ? 'excellent' : drop < 0.05 ? 'good' : drop < 0.10 ? 'inaccuracy' : drop < 0.25 ? 'mistake' : 'blunder';
      parentPort.postMessage({ id, result: { bestUci, whiteChanceBefore: beforeWin, whiteChanceAfter: afterWin, whiteChanceBest: bestWin, afterBestUci, afterScore: after.score, bestScore: best.score, afterDepth: after.depth, moverSecondBestChance, drop, classification, depth: best.depth, isMateMove } });
    });
  `;

  async function spawnWorkers(count) {
    const workers = [];
    for (let i = 0; i < count; i++) {
      const w = new Worker(workerCode, { eval: true });
      await new Promise(resolve => w.once('message', m => { if (m === 'ready') resolve(); }));
      workers.push(w);
    }
    const fns = workers.map(w => (fen, afterFen, mover, cachedBefore, alternatives, cachedAfter) => new Promise(resolve => {
      const id = Math.random().toString(36).slice(2);
      const onMsg = (m) => { if (m.id === id) { w.off('message', onMsg); resolve(m.result); } };
      w.on('message', onMsg);
      w.postMessage({ id, fen, afterFen, mover, cachedBefore, cachedAfter, alternatives });
    }));
    return { fns, close: () => Promise.all(workers.map(w => w.terminate())) };
  }

  async function runBench(workerCount, useFenCache) {
    const pool = await spawnWorkers(workerCount);
    const cache = useFenCache ? new fastMod.DnaPositionEvalCache(dnaMod.DNA_ENGINE_VERSION) : null;
    const out = new Array(parsedGames.length);
    const t0 = Date.now();
    let cursor = 0;
    try {
      await Promise.all(pool.fns.map(async (laneFn) => {
        const fn = cache ? fastMod.createCachedAnalyzePosition(laneFn, cache) : laneFn;
        while (cursor < parsedGames.length) {
          const idx = cursor++;
          const analyzed = await reviewMod.analyzeGameMoves(parsedGames[idx], { Chess, analyzePosition: fn, openingLines: openingSet });
          const summary = reviewMod.computeReviewSummary(analyzed);
          out[idx] = { moves: analyzed, summary };
        }
      }));
    } finally {
      await pool.close();
    }
    return { elapsedMs: Date.now() - t0, out, cacheHits: cache ? cache.hits : 0 };
  }

  const beforeSeq = await runBench(1, false);
  const afterMobile2 = await runBench(2, true);
  const afterDesktop4 = await runBench(4, true);

  // Assert 100% BIT-FOR-BIT IDENTICAL analysis results across all 8 games!
  for (let g = 0; g < parsedGames.length; g++) {
    assert.deepEqual(afterMobile2.out[g].summary, beforeSeq.out[g].summary, `Mobile 2w+cache summary mismatch on game ${g}`);
    assert.deepEqual(afterDesktop4.out[g].summary, beforeSeq.out[g].summary, `Desktop 4w+cache summary mismatch on game ${g}`);
    assert.equal(afterDesktop4.out[g].moves.length, beforeSeq.out[g].moves.length);
    for (let m = 0; m < beforeSeq.out[g].moves.length; m++) {
      const a = beforeSeq.out[g].moves[m];
      const b = afterDesktop4.out[g].moves[m];
      assert.equal(b.classification, a.classification, `classification mismatch g${g} m${m}`);
      assert.equal(b.bestUci, a.bestUci, `bestUci mismatch g${g} m${m}`);
      assert.equal(b.whiteChanceBefore, a.whiteChanceBefore, `whiteChanceBefore mismatch g${g} m${m}`);
      assert.equal(b.whiteChanceAfter, a.whiteChanceAfter, `whiteChanceAfter mismatch g${g} m${m}`);
    }
  }

  const speedupMobile = Math.round((beforeSeq.elapsedMs / Math.max(1, afterMobile2.elapsedMs)) * 100) / 100;
  const speedupDesktop = Math.round((beforeSeq.elapsedMs / Math.max(1, afterDesktop4.elapsedMs)) * 100) / 100;
  console.log(`BENCHMARK (8 games, real Chessy MIT WASM):`);
  console.log(`  Before (1 worker, no FEN cache):  ${beforeSeq.elapsedMs} ms`);
  console.log(`  Mobile (2 workers + FEN cache):   ${afterMobile2.elapsedMs} ms (${speedupMobile}x speedup, ${afterMobile2.cacheHits} FEN cache hits, 100% identical)`);
  console.log(`  Desktop (4 workers + FEN cache):  ${afterDesktop4.elapsedMs} ms (${speedupDesktop}x speedup, ${afterDesktop4.cacheHits} FEN cache hits, 100% identical)`);
  assert.ok(speedupDesktop >= 2.0, `Expected >=2.0x desktop speedup, got ${speedupDesktop}x`);
  assert.ok(speedupMobile >= 1.5, `Expected >=1.5x mobile speedup, got ${speedupMobile}x`);
});

console.log(`\nPASS: all ${passed}/${passed} DNA speed & custom counts checks verified.`);
