// Automated verification suite for PR #168 Evolution features (100% MIT, Node-only + server contract tests).
// Covers: Tilt/Clock radar (exact & day-only sessions, move-aligned [%clk] parity), connected DNA->Bot loop,
// shared blind holdout, style vs strength separation, gate enforcement, 0-new-games & out-of-order idempotency,
// owner-only public Oren bot server guard, per-user isolation, hybrid real-mistake courses (<5 games vs recurring),
// bot-first sparring initialization (oren-2, oren-3, karpov-4), real sparring chess goal, 5-game follow-ups,
// Blunder Rewind example badging, shallow pre-blunder guard, real Daily Micro-Loop completion, and 61-bot ladder integrity.

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Chess } = require('../public/vendor/veyra-rules/chess-compat.js');

const tiltMod = await import('../dist/src/dna-tilt-clock.js');
const pastYouMod = await import('../dist/src/past-you-bot.js');
const evoStoreMod = await import('../dist/src/evolution-store.js');
const coursesMod = await import('../dist/src/bot-courses.js');
const trainMod = await import('../dist/src/training-modes.js');

let passed = 0;
async function test(name, fn) {
  await fn();
  console.log(`PASS: ${name}`);
  passed += 1;
}

// 1. Tilt Radar: exact timestamps (>30 min breaks session) + date-only 6 losses on 6 days = 6 sessions, 0 tilt streaks!
await test('Tilt Radar splits exact >30m gaps AND separates 6 date-only losses across 6 calendar days', () => {
  const exactGames = [
    { id: 'e1', playedAt: '2026-10-01T10:00:00Z', result: 'loss', playerColor: 'white', userRating: 1200, timeClass: 'blitz', pgn: '1. e4 e5 2. Nf3 Nc6 0-1' },
    { id: 'e2', playedAt: '2026-10-01T10:10:00Z', result: 'loss', playerColor: 'white', userRating: 1190, timeClass: 'blitz', pgn: '1. e4 e5 2. Nf3 Nc6 0-1' },
    { id: 'e3', playedAt: '2026-10-01T10:20:00Z', result: 'loss', playerColor: 'white', userRating: 1180, timeClass: 'blitz', pgn: '1. e4 e5 2. Nf3 Nc6 0-1' },
    // >30 min gap breaks session!
    { id: 'e4', playedAt: '2026-10-01T11:05:00Z', result: 'win',  playerColor: 'white', userRating: 1190, timeClass: 'blitz', pgn: '1. e4 e5 2. Nf3 Nc6 1-0' },
  ];
  const rExact = tiltMod.analyzeTiltAndClock(exactGames);
  assert.equal(rExact.sessionsCount, 2, 'exact >30m gap must create 2 sessions');
  assert.equal(rExact.tilt.tiltSessionsCount, 1);
  assert.equal(rExact.tilt.maxConsecutiveLosses, 3);
  assert.equal(rExact.tilt.buckets[0].games, 2, 'game after >30m break must be fresh (0 prior losses)');

  const sixDaysGames = [1, 2, 3, 4, 5, 6].map(day => ({
    id: `d${day}`,
    date: `2026-10-0${day}`,
    result: 'loss',
    playerColor: 'white',
    timeClass: 'rapid',
    pgn: `[Date "2026.10.0${day}"]\n[Result "0-1"]\n\n1. e4 e5 2. Nf3 Nc6 0-1`,
  }));
  const rDays = tiltMod.analyzeTiltAndClock(sixDaysGames);
  assert.equal(rDays.sessionsCount, 6, '6 date-only games on 6 consecutive days must be 6 separate sessions');
  assert.equal(rDays.tilt.tiltSessionsCount, 0, '6 losses on 6 different days must produce 0 tilt sessions');
  assert.equal(rDays.tilt.maxConsecutiveLosses, 1, 'max consecutive losses per day must be 1');
  assert.equal(rDays.tilt.buckets[0].games, 6, 'all 6 daily games must be fresh (bucket 0)');
});

// 2. Clock Radar: move-aligned [%clk ...] binds to exact move & side even when a tag is missing!
await test('Clock Radar binds [%clk] to exact move/color even when a move is missing its clock tag', () => {
  // White ply 0 missing [%clk], Black ply 1 has 0:04:50, White ply 2 has 0:00:25, Black ply 3 has 0:04:40
  const pgnMissingWhiteTag = '[Event "Blitz"]\n[Result "0-1"]\n\n1. e4 e5 {[%clk 0:04:50]} 2. Nf3 {[%clk 0:00:25]} Nc6 {[%clk 0:04:40]} 0-1';
  const whiteClocks = tiltMod.extractPlayerClockSeconds(pgnMissingWhiteTag, 'white');
  const blackClocks = tiltMod.extractPlayerClockSeconds(pgnMissingWhiteTag, 'black');
  assert.deepEqual(whiteClocks, [25], 'White must only get ply 2 clock (25s), never Black clock!');
  assert.deepEqual(blackClocks, [290, 280], 'Black must get ply 1 (290s) and ply 3 (280s)');

  // Also test variation comments ignored and demo games excluded
  const pgnWithVar = '1. e4 {[%clk 0:05:00]} (1. d4 {[%clk 0:00:05]}) 1... e5 {[%clk 0:04:55]} 2. Nf3 {[%clk 0:00:20]} Nc6 {[%clk 0:04:50]} *';
  assert.deepEqual(tiltMod.extractPlayerClockSeconds(pgnWithVar, 'white'), [300, 20]);
  assert.deepEqual(tiltMod.extractPlayerClockSeconds(pgnWithVar, 'black'), [295, 290]);

  const demoFiltered = tiltMod.collectTiltClockGames([{ id: 'demo', source: 'demo', result: 'loss', pgn: '1. e4 e5 0-1' }], null);
  assert.equal(demoFiltered.length, 0, 'Demo games must not pollute tilt/clock radar');
});

// 3. Connected DNA -> Bot Loop: Before -> After diff, shared holdout, style vs strength, 0-new-games, out-of-order, blocked gate!
await test('Connected DNA->Bot loop: Before->After diff, shared holdout, gate enforcement, idempotency & out-of-order safety', () => {
  const mkGame = (id, date, pgn, side = 'white', acpl = 65, extraMoves = []) => ({
    id,
    fingerprint: `fp-${id}`,
    date,
    playerColor: side,
    result: 'win',
    userRating: 1150,
    timeClass: 'rapid',
    pgn: `[Event "Rapid"]\n[Date "${date.replace(/-/g, '.')}"]\n[Result "1-0"]\n\n${pgn} 1-0`,
    analysis: {
      summary: { acpl: { white: acpl, black: 80 }, accuracy: { white: 82, black: 74 } },
      moves: extraMoves,
    },
  });

  // Scan 1: 6 older Italian/e4 games
  const scan1Games = [
    mkGame('g1', '2026-09-01', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6'),
    mkGame('g2', '2026-09-03', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. O-O O-O'),
    mkGame('g3', '2026-09-05', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3 Bc5 5. O-O d6'),
    mkGame('g4', '2026-09-08', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 Nf6 5. Nc3 d6'),
    mkGame('g5', '2026-09-10', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4'),
    mkGame('g6', '2026-09-12', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. O-O d6'),
  ];

  const empty = evoStoreMod.createEmptyEvolutionState('user-test-1');
  const res1 = evoStoreMod.ingestDnaScanIntoEvolutionState(empty, 'user-test-1', {
    scanId: 'scan-1',
    scanTimestampMs: 1000,
    analyzedGames: scan1Games,
  }, Chess);
  assert.equal(res1.status, 'updated');
  assert.ok(res1.state.personalBot.active, 'active bot must be created after scan 1');
  assert.equal(res1.state.personalBot.active.version, 'v1');
  assert.equal(res1.state.personalBot.active.holdout.metricKind, 'style-mimicry');
  assert.ok(res1.state.personalBot.active.strengthMetric?.avgAcpl === 65, 'strength metric must come strictly from real analyzed ACPL');

  // Repeat scan with ZERO new games -> must be no_new_games and keep v1!
  const resRepeat = evoStoreMod.ingestDnaScanIntoEvolutionState(res1.state, 'user-test-1', {
    scanId: 'scan-1-repeat',
    scanTimestampMs: 1500,
    analyzedGames: scan1Games,
  }, Chess);
  assert.equal(resRepeat.status, 'no_new_games');
  assert.equal(resRepeat.state.personalBot.active.version, 'v1');
  assert.match(resRepeat.messageHe, /אין משחקים חדשים/);

  // Out-of-order scan (older timestamp 500 < 1000) -> ignored, keeps v1!
  const resOld = evoStoreMod.ingestDnaScanIntoEvolutionState(res1.state, 'user-test-1', {
    scanId: 'scan-old',
    scanTimestampMs: 500,
    analyzedGames: [mkGame('g-stale', '2026-08-01', '1. d4 d5 2. c4 e6 3. Nc3 Nf6')],
  }, Chess);
  assert.equal(resOld.status, 'ignored_out_of_order');
  assert.equal(resOld.state.personalBot.active.version, 'v1');

  // Set an inProgressLesson to verify continuity (decision 4א) across Scan 2!
  const stateWithInProgress = {
    ...res1.state,
    inProgressLesson: {
      courseId: 'endgame-conversion',
      lessonId: 'capa-1-king-activity',
      stage: 'drills',
      drillIdx: 1,
      savedAt: '2026-10-15T10:00:00Z',
      lessonTitleHe: 'פעילות המלך בסיום',
    },
  };

  // Scan 2: Add recent Queen's Gambit / d4 games + a real hanging-piece blunder!
  const scan2Games = [
    mkGame('g7', '2026-10-18', '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O', 'white', 55),
    mkGame('g8', '2026-10-19', '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Nf3 Be7 5. Bf4 O-O', 'white', 52),
    mkGame('g9', '2026-10-20', '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Nf3 Be7 5. e3 O-O', 'white', 50),
    mkGame(
      'g10',
      '2026-10-21',
      '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Nf3 Be7 5. Bg5 O-O 6. e3 h6 7. Bh4 b6 8. Qa4 Bb7',
      'white',
      60,
      [{ index: 14, classification: 'blunder', bestUci: 'c4d5', drop: 310 }]
    ),
  ];
  const res2 = evoStoreMod.ingestDnaScanIntoEvolutionState(stateWithInProgress, 'user-test-1', {
    scanId: 'scan-2',
    scanTimestampMs: 2000,
    analyzedGames: scan2Games,
  }, Chess);
  assert.ok(res2.status === 'updated' || res2.status === 'blocked_by_gate');
  assert.equal(res2.state.inProgressLesson?.lessonId, 'capa-1-king-activity', 'In-progress lesson MUST survive a new DNA scan (4א)');
  assert.ok(res2.state.personalMistakes.length >= 1, 'Real blunder from scan 2 must be extracted into personalMistakes');
  assert.ok(res2.state.personalBot.past, 'Past-You historical snapshot must exist');

  // Force a blocked candidate (lower Top-1) and verify Play button resolution strictly launches ACTIVE, never blockedCandidate!
  const worseCandidate = {
    ...res1.state.personalBot.active,
    version: 'v99-bad',
    holdout: { ...res1.state.personalBot.active.holdout, top1Accuracy: 0, top3Accuracy: 0 },
  };
  const resBlocked = evoStoreMod.ingestDnaScanIntoEvolutionState(res1.state, 'user-test-1', {
    scanId: 'scan-blocked',
    scanTimestampMs: 3000,
    analyzedGames: [mkGame('g-new-block', '2026-10-25', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5')],
    forceCandidateSnapshot: worseCandidate,
  }, Chess);
  assert.equal(resBlocked.status, 'blocked_by_gate');
  assert.ok(resBlocked.state.personalBot.blockedCandidate, 'blockedCandidate must be recorded');
  const playable = pastYouMod.resolvePlayableActiveBot(resBlocked.state.personalBot);
  assert.equal(playable.version, res1.state.personalBot.active.version, 'Play button MUST launch last approved active version, NEVER blocked candidate!');
});

// 4. Server Contract: Owner-only public Oren bot publish guard + private per-user isolation + stale scan rejection
await test('Server evolution-state.mjs enforces owner-only public Oren publish, private user_id isolation & stale scan guard', async () => {
  process.env.ADMIN_EMAIL = 'owner@veyra.test';
  process.env.AUTH_SESSION_SECRET = 'evo-test-session-secret';
  process.env.SUPABASE_URL = 'https://supabase.test';
  process.env.SUPABASE_SECRET_KEY = 'service-role-key';
  delete process.env.ADMIN_USER_EMAILS;
  delete process.env.ADMIN_USER_IDS;

  const b64url = (b) => Buffer.from(b).toString('base64url');
  const makeUserCookie = (userId, email) => {
    const key = crypto.createHash('sha256').update(process.env.AUTH_SESSION_SECRET).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const token = `h.${b64url(JSON.stringify({ sub: userId, session_id: crypto.randomUUID() }))}.s`;
    const enc = Buffer.concat([cipher.update(JSON.stringify({ user_id: userId, email, access_token: token, exp: Math.floor(Date.now() / 1000) + 3600 })), cipher.final()]);
    return `__Host-tabia_session=${Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64url')}`;
  };

  const OWNER_COOKIE = makeUserCookie('11111111-1111-4111-8111-111111111111', 'owner@veyra.test');
  const PLAYER_COOKIE = makeUserCookie('22222222-2222-4222-8222-222222222222', 'player@veyra.test');

  const dbMine = new Map();
  let dbPublicOren = null;
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const target = String(url).replace('https://supabase.test/rest/v1/', '');
    const method = opts.method || 'GET';
    const body = opts.body ? JSON.parse(opts.body) : null;
    if (target === 'rpc/auth_session_active') return new Response('true', { status: 200 });
    if (target.startsWith('public_oren_bot_versions')) {
      if (method === 'GET') return new Response(JSON.stringify(dbPublicOren ? [dbPublicOren] : []), { status: 200 });
      dbPublicOren = body;
      return new Response('', { status: 201 });
    }
    if (target.startsWith('user_evolution_state')) {
      if (method === 'GET') {
        const m = /user_id=eq\.([^&]+)/.exec(target);
        const uid = m ? decodeURIComponent(m[1]) : '';
        const row = dbMine.get(uid);
        return new Response(JSON.stringify(row ? [row] : []), { status: 200 });
      }
      dbMine.set(body.user_id, body);
      return new Response('', { status: 201 });
    }
    return new Response('[]', { status: 200 });
  };

  try {
    const { handler } = await import('../netlify/functions/evolution-state.mjs');
    let ipN = 1;
    const req = ({ method = 'GET', query = {}, cookie = '', body } = {}) => handler({
      httpMethod: method,
      rawUrl: 'https://veyra.example/api/evolution-state',
      queryStringParameters: query,
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        origin: 'https://veyra.example',
        'x-nf-client-connection-ip': `198.51.100.${++ipN}`,
        ...(cookie ? { cookie } : {}),
      },
    });

    // Guest can read public-oren, cannot read mine
    const rPubGuest = await req({ query: { action: 'public-oren' } });
    assert.equal(rPubGuest.statusCode, 200);
    const rMineGuest = await req({ query: { action: 'mine' } });
    assert.equal(rMineGuest.statusCode, 401);

    // Normal player CANNOT publish public Oren bot even if passing spoofed client fields!
    const validSnap = { version: 'v2', positionBook: { 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': [] }, holdout: { top1Accuracy: 42 } };
    const rSpoof = await req({
      method: 'POST',
      cookie: PLAYER_COOKIE,
      body: { action: 'publish-public-oren', isOwner: true, activeSnapshot: validSnap, qualityGate: { approved: true } },
    });
    assert.equal(rSpoof.statusCode, 403, 'Non-owner MUST be blocked with 403 owner_only');

    // Owner with UNAPPROVED quality gate MUST be rejected (400)!
    const rUnapproved = await req({
      method: 'POST',
      cookie: OWNER_COOKIE,
      body: { action: 'publish-public-oren', activeSnapshot: validSnap, qualityGate: { approved: false } },
    });
    assert.equal(rUnapproved.statusCode, 400);

    // Owner with APPROVED quality gate publishes cleanly!
    const rPublish = await req({
      method: 'POST',
      cookie: OWNER_COOKIE,
      body: { action: 'publish-public-oren', activeSnapshot: validSnap, qualityGate: { approved: true } },
    });
    assert.equal(rPublish.statusCode, 200);
    assert.equal(dbPublicOren.active_version, 'v2');

    // Private save + stale scan rejection (409) + user isolation
    const rSave1 = await req({
      method: 'POST',
      cookie: PLAYER_COOKIE,
      body: { action: 'save-mine', revision: 1, state: { schemaVersion: 2, lastScanTimestampMs: 5000, personalBot: { versionNumber: 1 } } },
    });
    assert.equal(rSave1.statusCode, 200);
    const rStale = await req({
      method: 'POST',
      cookie: PLAYER_COOKIE,
      body: { action: 'save-mine', revision: 2, state: { schemaVersion: 2, lastScanTimestampMs: 3000, personalBot: { versionNumber: 1 } } },
    });
    assert.equal(rStale.statusCode, 409, 'Older scan timestamp must be rejected with 409 stale_scan_order');

    const rOwnerMine = await req({ query: { action: 'mine' }, cookie: OWNER_COOKIE });
    const ownerBody = JSON.parse(rOwnerMine.body);
    assert.equal(ownerBody.isOwner, true);
    assert.equal(ownerBody.state, null, 'Owner private state must never leak Player private state');
  } finally {
    globalThis.fetch = origFetch;
  }
});

// 5. Hybrid Bot Courses: real mistake injection (<5 games vs recurring), bot-first sparring fix (oren-2, oren-3, karpov-4), real chess goal, 5-game follow-ups!
await test('Hybrid Bot Courses inject real mistakes (<5 games vs recurring), fix all 3 bot-first sparring lessons & enforce real sparring goal', () => {
  // Single mistake in 1 game (<5 games): MUST inject personal lesson badged "מטעות במשחק שלך" (NOT "חולשה חוזרת")!
  const singleMistake = {
    id: 'm1',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    bestUci: 'g8f6',
    playedUci: 'd7d6',
    playedSan: 'd6',
    bestSan: 'Nf6',
    playerSide: 'black',
    kind: 'mistake',
    weaknessTag: 'opening-traps-personal',
    ply: 5,
    dropCp: 190,
    gameFingerprint: 'fp-1',
    gameDate: '2026-10-20',
    sourceLabelHe: 'מתוך המשחק שלך (2026-10-20)',
  };
  const cSingle = coursesMod.buildPersonalizedBotCourses({ personalMistakes: [singleMistake], ChessCtor: Chess });
  const openCourse1 = cSingle.find(c => c.id === 'opening-traps-control');
  assert.equal(openCourse1.lessons[0].originKind, 'real-game-mistake', '1 mistake (<5 games) must open on real-game-mistake');
  assert.equal(openCourse1.lessons[0].inspectFen, singleMistake.fen);
  assert.ok(!openCourse1.lessons[0].originBadgeHe.includes('חולשה חוזרת'), 'Single occurrence must NOT claim recurring weakness');

  // 2 occurrences of same weakness -> MUST badge "חולשה חוזרת"!
  const cRecur = coursesMod.buildPersonalizedBotCourses({
    personalMistakes: [singleMistake, { ...singleMistake, id: 'm2', gameFingerprint: 'fp-2' }],
    ChessCtor: Chess,
  });
  const openCourse2 = cRecur.find(c => c.id === 'opening-traps-control');
  assert.equal(openCourse2.lessons[0].originKind, 'recurring-weakness');
  assert.match(openCourse2.lessons[0].originBadgeHe, /חולשה חוזרת/);

  // Verify ALL 3 previously-broken bot-first sparring lessons + all 16 base lessons!
  const allBase = coursesMod.buildPersonalizedBotCourses({ ChessCtor: Chess });
  const targetIds = new Set(['oren-2-center-control', 'oren-3-fried-liver-defense', 'karpov-4-prophylaxis-endgame']);
  let foundTargets = 0;
  for (const course of allBase) {
    for (const lesson of course.lessons) {
      assert.ok(new Chess(lesson.inspectFen), `legal inspectFen for ${lesson.id}`);
      assert.ok(new Chess(lesson.sparringFen), `legal sparringFen for ${lesson.id}`);
      const init = coursesMod.initSparringPosition(lesson.sparringFen, lesson.playerSide, course.teacherNameHe, Chess);
      const afterInit = new Chess(init.fen);
      const wantTurn = lesson.playerSide === 'black' ? 'b' : 'w';
      assert.equal(afterInit.turn(), wantTurn, `After initSparringPosition for ${lesson.id}, it MUST be player's turn (${wantTurn})!`);
      if (targetIds.has(lesson.id)) {
        assert.ok(init.botOpeningSan, `${lesson.id} must auto-play bot opening move!`);
        foundTargets += 1;
      }
      for (const drill of lesson.drills) {
        const okRes = coursesMod.evaluateDrillMove(drill, drill.acceptedUci[0], Chess);
        assert.equal(okRes.legal, true, `Drill ${drill.id} accepted move must be legal`);
        assert.equal(okRes.correct, true, `Drill ${drill.id} accepted move must be correct`);
      }
    }
  }
  assert.equal(foundTargets, 3, 'All 3 known bot-first lessons must be verified');

  // Verify real sparring chess goal blocks a hanging-queen blunder instead of blindly counting it!
  const queenHangFen = '4k3/8/8/4r3/8/8/4Q3/4K3 w - - 0 1';
  const blunderRes = coursesMod.evaluateSparringMove({
    fen: queenHangFen,
    from: 'e2',
    to: 'e4',
    playerSide: 'white',
    baselineMaterial: coursesMod.evaluateMaterialForSide(queenHangFen, 'white'),
    cleanMovesSoFar: 0,
    targetMoves: 3,
    goalKind: 'keep-material',
    teacherNameHe: 'טל',
    ChessCtor: Chess,
  });
  assert.equal(blunderRes.accepted, false, 'Hanging queen in sparring MUST be blocked by real chess goal');
  assert.equal(blunderRes.blunderBlocked, true);
  assert.equal(blunderRes.cleanMoves, 0);

  // 5-game follow-up tracker evaluates subsequent games accurately
  const fu = coursesMod.createLessonFollowUpEvent('hanging-pieces-tactics', 'tal-1', 'hanging-pieces-tactics');
  const updatedFu = evoStoreMod.evaluateLessonFollowUps(
    [fu],
    [{ fingerprint: 'ng1', pgn: '1. e4 e5 *' }, { fingerprint: 'ng2', pgn: '1. d4 d5 *' }],
    [{ ...singleMistake, weaknessTag: 'hanging-pieces-tactics', gameFingerprint: 'ng2' }]
  );
  assert.equal(updatedFu[0].trackedFingerprints.length, 2);
  assert.equal(updatedFu[0].cleanGamesCount, 1);
  assert.equal(updatedFu[0].mistakeGamesCount, 1);
});

// 6. Training modes + 61-bot ladder preservation + Code Guardian & MIT compliance
await test('Training modes (Blunder Rewind example badge, shallow Coach guard, real Micro-Loop completion) & 61-bot ladder integrity', async () => {
  const fallbacks = trainMod.extractBlunderRewindCandidates([], Chess, 3);
  assert.equal(fallbacks.length, 3);
  assert.ok(fallbacks.every(c => c.isExample === true && c.goalHe.length > 5), 'Fallback rewinds must be badged isExample=true with goalHe');

  // Shallow pre-blunder guard helper catches hanging queen
  const lifelines = trainMod.createCoachLifelineState(true, 3);
  const guard = trainMod.evaluateBotMoveGuard(lifelines, false, '4k3/8/8/4r3/8/8/4Q3/4K3 w - - 0 1', 'e2', 'e4', undefined, Chess);
  assert.equal(guard.allowMove, false);
  assert.ok(guard.warning?.text);

  // Real Micro-Loop completion (NOT click-only!)
  const endgameMission = { stepId: 'endgame-drill', titleHe: 'סיום', goalHe: 'מט', targetCleanMoves: 1, requiresWin: true };
  assert.equal(trainMod.isMicroMissionCompleted(endgameMission, { won: false, cleanMoves: 0 }), false);
  assert.equal(trainMod.isMicroMissionCompleted(endgameMission, { won: false, cleanMoves: 5, resigned: true }), false);
  assert.equal(trainMod.isMicroMissionCompleted(endgameMission, { won: true, cleanMoves: 1 }), true);

  const rewindMission = { stepId: 'blunder-rewind', titleHe: 'חזרה', goalHe: '3 מהלכים', targetCleanMoves: 3, requiresWin: false };
  assert.equal(trainMod.isMicroMissionCompleted(rewindMission, { won: false, cleanMoves: 2 }), false);
  assert.equal(trainMod.isMicroMissionCompleted(rewindMission, { won: false, cleanMoves: 3 }), true);

  // 61-bot ladder integrity + no forbidden words + no click-only completion in src/main.ts
  const manifest = JSON.parse(await readFile('public/data/bots/index.json', 'utf8'));
  assert.equal(manifest.length, 61, 'Tournament ladder must remain strictly 61 bots with untouched indices');
  assert.equal(manifest.some(b => b.id === 'orenzbit'), false, 'orenzbit must live outside the 61 ladder indices');

  const mainSrc = await readFile('src/main.ts', 'utf8');
  assert.ok(!mainSrc.includes("handleToggleMicroStep('endgame-drill',true)"), 'Clicking endgame drill must NOT mark it completed immediately');
  assert.ok(!mainSrc.includes("handleToggleMicroStep('blunder-rewind',true)"), 'Clicking blunder rewind must NOT mark it completed immediately');
  assert.ok(mainSrc.includes('setBotCoachDefault(false)'), 'Coach mode must reset cleanly so it never leaks into normal bot games');

  for (const file of ['src/dna-tilt-clock.ts', 'src/past-you-bot.ts', 'src/evolution-store.ts', 'src/bot-courses.ts', 'src/bot-courses-ui.ts', 'src/training-modes.ts', 'netlify/functions/evolution-state.mjs']) {
    const content = await readFile(file, 'utf8');
    assert.ok(!/stockfish|duolingo|lotus/i.test(content), `Forbidden word found in ${file}`);
  }
});

console.log(`\nPASS: all ${passed}/${passed} evolution feature checks verified.`);
