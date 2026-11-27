#!/usr/bin/env node
// Comprehensive automated unit test suite for Veyra Evolution features:
//  1. DNA Tilt & Clock Radar (src/dna-tilt-clock.ts)
//  2. Adaptive Oren Bot & Play Against Past-You + 20% Holdout Gate (src/past-you-bot.ts)
//  3. DNA-Driven Interactive Bot Courses — including Chess-engine validation of all 16 lessons & 48 drills (src/bot-courses.ts)
//  4. Blunder Rewind, Coach 3 Lifelines & 5-Min Daily Micro-Loop (src/training-modes.ts)
//  5. MIT-only & forbidden-brand hygiene check across all new files.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const { Chess } = await import('../public/vendor/veyra-rules/chess-compat.js');
const tiltMod = await import('../dist/src/dna-tilt-clock.js');
const pastMod = await import('../dist/src/past-you-bot.js');
const courseMod = await import('../dist/src/bot-courses.js');
const trainMod = await import('../dist/src/training-modes.js');

let passed = 0;
async function check(name, fn) {
  await fn();
  passed += 1;
  console.log('PASS:', name);
}

// ── 1. DNA TILT & CLOCK RADAR ──────────────────────────────────────────────
await check('extractPlayerClockSeconds parses [%clk] per side accurately', () => {
  const pgn = `[Event "Live Chess"]\n[Result "0-1"]\n\n1. e4 {[%clk 0:03:00]} e5 {[%clk 0:02:58]} 2. Nf3 {[%clk 0:00:45]} Nc6 {[%clk 0:02:40]} 3. Bc4 {[%clk 0:00:18]} Nf6 {[%clk 0:02:30]} 0-1`;
  const wClocks = tiltMod.extractPlayerClockSeconds(pgn, 'white');
  const bClocks = tiltMod.extractPlayerClockSeconds(pgn, 'black');
  assert.deepEqual(wClocks, [180, 45, 18]);
  assert.deepEqual(bClocks, [178, 160, 150]);
});

await check('analyzeTiltAndClock detects 30-min tilt sessions, streak buckets, Elo drop & <60s/<30s pressure', () => {
  const mkGame = (iso, result, rating, minClkSec, timeout = false) => ({
    id: iso,
    playedAt: iso,
    result,
    playerColor: 'white',
    userRating: rating,
    timeClass: 'blitz',
    finishReason: timeout ? 'נפילה בזמן' : 'מט',
    pgn: `[Event "Blitz"]\n[Result "${result === 'win' ? '1-0' : '0-1'}"]\n\n1. e4 {[%clk 0:03:00]} e5 {[%clk 0:03:00]} 2. Nf3 {[%clk 0:00:${String(minClkSec).padStart(2, '0')}]} Nc6 {[%clk 0:02:50]} ${result === 'win' ? '1-0' : '0-1'}`,
  });

  const games = [
    // Session 1: win, then 4 consecutive losses within 10-min intervals -> tilt session!
    mkGame('2026-11-20T18:00:00Z', 'win', 340, 120),
    mkGame('2026-11-20T18:08:00Z', 'loss', 332, 45),
    mkGame('2026-11-20T18:16:00Z', 'loss', 324, 22, true),
    mkGame('2026-11-20T18:24:00Z', 'loss', 315, 19, true), // priorLosses = 2 (in tilt)
    mkGame('2026-11-20T18:31:00Z', 'loss', 306, 15, true), // priorLosses = 3 (in tilt)
    // Session 2 (> 2 hours later -> streak MUST reset to 0!)
    mkGame('2026-11-20T21:00:00Z', 'win', 314, 140),
    mkGame('2026-11-20T21:09:00Z', 'win', 322, 130),
    mkGame('2026-11-20T21:18:00Z', 'loss', 314, 50),
  ];

  const report = tiltMod.analyzeTiltAndClock(games);
  assert.equal(report.totalGames, 8);
  assert.equal(report.timestampBasis, 'exact');
  assert.equal(report.tilt.tiltSessionsCount, 1);
  assert.equal(report.tilt.maxConsecutiveLosses, 4);
  assert.equal(report.tilt.gamesInTilt, 2);
  assert.equal(report.tilt.estimatedEloLostInTilt, 18); // (324-315) + (315-306)
  assert.equal(report.tilt.buckets[0].games, 5); // 1st, 2nd (after win), 6th (new session), 7th, 8th
  assert.equal(report.tilt.buckets[2].games, 1);
  assert.equal(report.tilt.buckets[3].games, 1);
  assert.equal(report.tilt.severity, 'moderate'); // 1 tilt session with 2 games in tilt -> moderate
  assert.equal(report.clock.basis, 'clock-tags');
  assert.equal(report.clock.lowClockGames, 5);
  assert.equal(report.clock.criticalClockGames, 3);
  assert.equal(report.clock.timeoutsCount, 3);
});

await check('analyzeTiltAndClock falls back honestly to time-class comparison when [%clk] tags absent, and zero-state when empty', () => {
  const empty = tiltMod.analyzeTiltAndClock([]);
  assert.equal(empty.totalGames, 0);
  assert.equal(empty.clock.basis, 'none');
  assert.equal(empty.tilt.severity, 'insufficient');

  const noClocks = [
    { date: '2026-11-10', result: 'loss', timeClass: 'bullet', pgn: '1. e4 e5 0-1' },
    { date: '2026-11-10', result: 'loss', timeClass: 'bullet', pgn: '1. d4 d5 0-1' },
    { date: '2026-11-11', result: 'win', timeClass: 'rapid', pgn: '1. e4 e5 1-0' },
  ];
  const fb = tiltMod.analyzeTiltAndClock(noClocks);
  assert.equal(fb.clock.basis, 'time-class-fallback');
  assert.ok(fb.clock.byTimeClass.length === 2);
});

// ── 2. ADAPTIVE OREN BOT & PAST-YOU ────────────────────────────────────────
const manifest = JSON.parse(await readFile('public/data/bots/index.json', 'utf8'));
const orenProfile = JSON.parse(await readFile('public/data/bots/orenzbit.json', 'utf8'));

await check('orenzbit is restored in public/data/bots/index.json (62 total bots)', () => {
  assert.equal(manifest.length, 62);
  const found = manifest.find(b => b.id === 'orenzbit');
  assert.ok(found && found.name === 'אורן' && found.elo === 201);
});

await check('recencyWeight decays monotonically & splitGamesByTimeWindow separates past (>30d) vs recent', () => {
  assert.ok(pastMod.recencyWeight(0, 30) > pastMod.recencyWeight(30, 30));
  assert.ok(pastMod.recencyWeight(30, 30) > pastMod.recencyWeight(120, 30));

  const sampleGames = [
    { date: '2026-08-01', playerColor: 'white', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3 Bc5 1-0' },
    { date: '2026-08-15', playerColor: 'white', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3 Bc5 1-0' },
    { date: '2026-09-01', playerColor: 'white', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3 Bc5 0-1' },
    { date: '2026-11-10', playerColor: 'white', pgn: '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 1-0' },
    { date: '2026-11-20', playerColor: 'white', pgn: '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 1-0' },
    { date: '2026-11-25', playerColor: 'white', pgn: '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 1-0' },
  ];
  const split = pastMod.splitGamesByTimeWindow(sampleGames, { referenceDate: '2026-11-27', cutoffDays: 30 });
  assert.equal(split.splitMethod, 'cutoff-days');
  assert.equal(split.past.length, 3);
  assert.equal(split.recent.length, 3);
});

await check('buildVersionedPlayerBot runs 20% blind holdout benchmark & checkVersionQualityGate blocks regressions', () => {
  const games = [];
  for (let i = 0; i < 10; i++) {
    games.push({
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      playerColor: 'white',
      userRating: 310 + i * 2,
      pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3 Bc5 5. O-O O-O 6. c3 d6 1-0',
    });
  }
  const snap = pastMod.buildVersionedPlayerBot(games, {
    id: 'test-v2', name: 'Test Bot', version: 'v2', eraTag: 'current', halfLifeDays: 21, holdoutRatio: 0.2, ChessCtor: Chess,
  });
  assert.equal(snap.holdout.holdoutGames, 2);
  assert.equal(snap.holdout.trainingGames, 8);
  assert.ok(snap.holdout.positionsTested > 0);
  assert.ok(snap.holdout.top1Accuracy >= 80, `Expected high holdout Top-1 on consistent repertoire, got ${snap.holdout.top1Accuracy}`);

  const passGate = pastMod.checkVersionQualityGate(
    { version: 'v2', holdout: { ...snap.holdout, top1Accuracy: 52, top3Accuracy: 78 } },
    { version: 'v1', holdout: { ...snap.holdout, top1Accuracy: 45, top3Accuracy: 70 } }
  );
  assert.equal(passGate.approved, true);

  const failGate = pastMod.checkVersionQualityGate(
    { version: 'v3', holdout: { ...snap.holdout, top1Accuracy: 41, top3Accuracy: 70 } },
    { version: 'v2', holdout: { ...snap.holdout, top1Accuracy: 52, top3Accuracy: 78 } }
  );
  assert.equal(failGate.approved, false);

  // Verify Past-You + Current-You build cleanly from orenzbit.json and generate legal moves
  const pair = pastMod.buildPastAndCurrentSnapshots(orenProfile, [], Chess);
  assert.equal(pair.dataSource, 'orenzbit-profile');
  assert.ok(pair.pastYou.holdout.positionsTested > 0 && pair.currentYou.holdout.positionsTested > 0);
  const startFen = new Chess().fen();
  const m1 = pastMod.chooseAdaptiveBotMove(startFen, pair.pastYou, Chess, () => 0.1);
  const m2 = pastMod.chooseAdaptiveBotMove(startFen, pair.currentYou, Chess, () => 0.1);
  assert.ok(m1 && m2 && m1.from && m1.to && m2.from && m2.to);
});

// ── 3. DNA-DRIVEN INTERACTIVE BOT COURSES ──────────────────────────────────
await check('buildPersonalizedBotCourses ranks dynamically by DNA + Tilt signals', () => {
  const tiltHigh = { tilt: { severity: 'high', tiltSessionsCount: 4, maxConsecutiveLosses: 5 }, clock: { lowClockLossRate: 70, timeoutsCount: 3 } };
  const courses = courseMod.buildPersonalizedBotCourses({ dnaReport: null, tiltReport: tiltHigh, bots: manifest });
  assert.equal(courses.length, 4);
  assert.equal(courses[0].id, 'clock-calm-decisions', 'High tilt should prioritize clock-calm-decisions first');

  const highBlunderDna = { timeControls: { rapid: { count: 15, issueRatesPer100Moves: { blunder: 12.5, miss: 2.0 }, clock: {} } } };
  const courses2 = courseMod.buildPersonalizedBotCourses({ dnaReport: highBlunderDna, tiltReport: null, bots: manifest });
  assert.equal(courses2[0].id, 'hanging-pieces-tactics', 'High blunders should prioritize hanging-pieces-tactics first');
});

await check('ALL 16 course lessons and ALL 48 drills have valid FENs, legal acceptedUci moves, and legal bot replies', () => {
  const courses = courseMod.buildPersonalizedBotCourses({ bots: manifest });
  let lessonCount = 0;
  let drillCount = 0;
  for (const c of courses) {
    assert.equal(c.lessons.length, 4, `Course ${c.id} should have 4 lessons`);
    assert.ok(manifest.some(b => b.id === c.teacherBotId), `Teacher bot ${c.teacherBotId} must exist in manifest`);
    for (const l of c.lessons) {
      lessonCount += 1;
      // Validate inspectFen & sparringFen
      const gInspect = new Chess(l.inspectFen);
      assert.ok(gInspect.fen(), `Invalid inspectFen in ${l.id}`);
      const gSpar = new Chess(l.sparringFen);
      assert.ok(gSpar.moves().length > 0, `Sparring FEN has no legal moves in ${l.id}`);

      assert.equal(l.drills.length, 3, `Lesson ${l.id} should have 3 drills`);
      for (const d of l.drills) {
        drillCount += 1;
        const gDrill = new Chess(d.fen);
        assert.equal(gDrill.turn(), d.playerSide === 'black' ? 'b' : 'w', `Wrong side to move in drill ${d.id}`);
        assert.ok(d.acceptedUci.length > 0, `No acceptedUci in ${d.id}`);
        for (const uci of d.acceptedUci) {
          const res = courseMod.evaluateDrillMove(d, uci, Chess);
          assert.equal(res.legal, true, `Accepted move ${uci} illegal in ${d.id} (${d.fen})`);
          assert.equal(res.correct, true, `Accepted move ${uci} not marked correct in ${d.id}`);
        }
        // Test a wrong legal move triggers teacher stop + hint
        const allLegal = gDrill.moves({ verbose: true });
        const wrong = allLegal.find(m => !d.acceptedUci.includes(`${m.from}${m.to}${m.promotion || ''}`) && !d.acceptedUci.includes(`${m.from}${m.to}`));
        if (wrong) {
          const badRes = courseMod.evaluateDrillMove(d, `${wrong.from}${wrong.to}${wrong.promotion || ''}`, Chess);
          assert.equal(badRes.legal, true);
          assert.equal(badRes.correct, false);
          assert.ok(badRes.feedbackHe.includes('עצירה מהמאמן'));
          assert.ok(badRes.arrows.length >= 2);
        }
      }
    }
  }
  assert.equal(lessonCount, 16);
  assert.equal(drillCount, 48);
});

await check('Course progress tracking updates lesson completion and percentages accurately', () => {
  const courses = courseMod.buildPersonalizedBotCourses({ bots: manifest });
  const c0 = courses[0];
  let prog = {};
  prog = courseMod.markLessonCompleted(prog, c0.id, c0.lessons[0].id, { drillsCorrect: 3, drillsMistakes: 0, sparringCompleted: true });
  const st = courseMod.courseCompletionStats(c0, prog);
  assert.equal(st.done, 1);
  assert.equal(st.total, 4);
  assert.equal(st.percent, 25);
});

// ── 4. TRAINING POWER-UPS (REWIND, 3 LIFELINES, DAILY MICRO-LOOP) ──────────
await check('Blunder Rewind rewinds 2 plies before blunder and detects material drops in PGNs', () => {
  const pgn = '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 Nf6 5. Ng5 O-O 6. Qh5 h6 7. Qg6 hxg5';
  const rew = trainMod.buildBlunderRewindFromPgn(pgn, 12, 'white', Chess);
  assert.ok(rew && rew.rewindPly <= 10 && rew.start.reviewable);
  const g = new Chess(rew.fen);
  assert.equal(g.turn(), 'w');

  const cands = trainMod.extractBlunderRewindCandidates([{ id: 'g1', opponent: 'TestOpp', date: '2026-11-26', playerColor: 'white', pgn }], Chess, 3);
  assert.ok(cands.length >= 1 && cands[0].fen);
});

await check('Coach Mode 3 Lifelines gives legal hints, decrements 3->0, and flags hanging-piece blunders', () => {
  let state = trainMod.createCoachLifelineState(true, 3);
  const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
  for (let expectedLeft = 2; expectedLeft >= 0; expectedLeft--) {
    const r = trainMod.consumeCoachLifeline(state, fen, Chess);
    assert.equal(r.allowed, true);
    assert.ok(r.hint && r.hint.san && r.hint.explanationHe.includes('קו הצלה'));
    state = r.nextState;
    assert.equal(state.remaining, expectedLeft);
  }
  const fourth = trainMod.consumeCoachLifeline(state, fen, Chess);
  assert.equal(fourth.allowed, false);

  // Hanging queen blunder test: White plays Qh5?? where Nf6 can take it!
  const blunderFen = 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 2 3';
  const warn = trainMod.checkPreBlunderWarning(blunderFen, 'd1', 'h5', Chess);
  assert.equal(warn.isBlunder, true, 'Playing Qh5 into Nxh5 must trigger pre-blunder guard');
  assert.ok(warn.dropCp >= 500 && warn.warningHe);
});

await check('5-Minute Daily Micro-Loop toggles steps, confirms 100% completion and tracks multi-day streaks', () => {
  let st = { byDate: { '2026-11-26': ['blunder-rewind', 'course-step', 'endgame-drill'] } };
  st = trainMod.toggleMicroStep(st, 'blunder-rewind', '2026-11-27', true);
  st = trainMod.toggleMicroStep(st, 'course-step', '2026-11-27', true);
  let sum = trainMod.computeMicroLoopSummary(st, '2026-11-27');
  assert.equal(sum.completedCount, 2);
  assert.equal(sum.allCompletedToday, false);
  assert.equal(sum.streakDays, 1); // yesterday still alive

  st = trainMod.toggleMicroStep(st, 'endgame-drill', '2026-11-27', true);
  sum = trainMod.computeMicroLoopSummary(st, '2026-11-27');
  assert.equal(sum.allCompletedToday, true);
  assert.equal(sum.percent, 100);
  assert.equal(sum.streakDays, 2);
});

// ── 5. LICENSE & CONTENT HYGIENE ───────────────────────────────────────────
await check('Zero forbidden brand names or Stockfish references in all new evolution files', async () => {
  const filesToScan = [
    'src/dna-tilt-clock.ts',
    'src/past-you-bot.ts',
    'src/bot-courses.ts',
    'src/training-modes.ts',
  ];
  for (const f of filesToScan) {
    const txt = await readFile(f, 'utf8');
    assert.ok(!/lotus|duolingo|stockfish/i.test(txt), `Forbidden reference found in ${f}`);
  }
});

console.log(`\nALL ${passed} EVOLUTION CHECKS PASSED.`);
