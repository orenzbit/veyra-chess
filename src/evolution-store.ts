// Per-user Evolution State Store: connects confirmed DNA scans -> personal learning bot
// (candidate/active/past) + hybrid personal course mistakes + 5-game follow-up tracker
// + daily micro-loop + cross-device sync + offline queue.
// Pure MIT TypeScript; zero external deps; safe to import in Node tests.

import {
  buildVersionedPlayerBot,
  checkVersionQualityGate,
  diffBotSnapshots,
  evaluateSnapshotOnHoldout,
  splitGamesByTimeWindow,
  splitSharedHoldout,
  type AdaptiveBotSnapshot,
  type BotSnapshotDiff,
  type PersonalPgnGame,
  type QualityGateResult,
} from './past-you-bot.js';
import type { DailyMicroLoopState } from './training-modes.js';

export type WeaknessCategoryId =
  | 'hanging-pieces-tactics'
  | 'endgame-conversion'
  | 'opening-traps-personal'
  | 'clock-tilt-discipline';

export interface PersonalMistakeRecord {
  id: string;
  fen: string;
  bestUci: string;
  playedUci: string;
  playedSan?: string;
  bestSan?: string;
  playerSide: 'white' | 'black';
  kind: 'blunder' | 'miss' | 'mistake';
  weaknessTag: WeaknessCategoryId;
  ply: number;
  dropCp: number;
  gameFingerprint: string;
  gameDate: string;
  sourceLabelHe: string;
}

export interface LessonFollowUpTracker {
  lessonId: string;
  courseId: string;
  weaknessTag: WeaknessCategoryId;
  completedAt: string;
  targetGames: number;
  trackedFingerprints: string[];
  cleanGamesCount: number;
  mistakeGamesCount: number;
}

export interface InProgressLessonSnapshot {
  courseId: string;
  lessonId: string;
  stage: 'inspect' | 'drills' | 'sparring';
  drillIdx: number;
  savedAt: string;
  lessonTitleHe: string;
}

export interface PersonalBotLifecycle {
  versionNumber: number;
  active: AdaptiveBotSnapshot | null;
  past: AdaptiveBotSnapshot | null;
  candidate: AdaptiveBotSnapshot | null;
  blockedCandidate: AdaptiveBotSnapshot | null;
  lastGate: QualityGateResult | null;
  lastDiff: BotSnapshotDiff | null;
  lastScanId: string | null;
  lastScanTimestampMs: number;
  lastScanStatusHe: string;
  processedFingerprints: string[];
  analyzedGamesCount: number;
  buildMs: number;
}

export interface UserEvolutionState {
  schemaVersion: 2;
  userId: string;
  revision: number;
  lastScanTimestampMs: number;
  personalBot: PersonalBotLifecycle;
  /** Compact deduplicated archive of confirmed DNA-scanned games (capped to latest 60 for fast incremental learning). */
  learnedGames: PersonalPgnGame[];
  /** Personal mistakes from analyzed games driving hybrid bot courses. */
  personalMistakes: PersonalMistakeRecord[];
  /** Occurrence counts per weakness category (used to distinguish "חולשה חוזרת" >=2 vs single mistake). */
  weaknessCounts: Record<WeaknessCategoryId, number>;
  /** Preserved across DNA scans so an in-progress lesson is never overwritten mid-way (decision 4א). */
  inProgressLesson: InProgressLessonSnapshot | null;
  /** Lesson completion progress keyed by `${courseId}:${lessonId}`. */
  courseProgress: Record<string, {
    completedAt: string;
    drillsCorrect: number;
    drillsMistakes: number;
    sparringCompleted: boolean;
  }>;
  /** Real 5-game follow-up trackers populated after lesson completions and evaluated on subsequent DNA scans. */
  lessonFollowUps: LessonFollowUpTracker[];
  /** Per-user daily micro-loop state. */
  microLoop: DailyMicroLoopState;
  updatedAt: string;
}

export interface DnaIngestionInput {
  scanId: string;
  scanTimestampMs: number;
  source?: { provider?: string; username?: string };
  analyzedGames: PersonalPgnGame[];
  dnaReport?: any;
  extraMistakes?: Array<{
    id?: string;
    fen: string;
    best: string;
    played: string;
    kind: 'blunder' | 'miss' | 'mistake';
    gameDate?: string;
    gameFingerprint?: string;
  }>;
  /** Optional deterministic override for testing a forced gate rejection without mutating production math. */
  forceCandidateSnapshot?: AdaptiveBotSnapshot | null;
}

export interface DnaIngestionOutcome {
  status: 'updated' | 'blocked_by_gate' | 'no_new_games' | 'ignored_out_of_order' | 'insufficient_games';
  state: UserEvolutionState;
  newGamesCount: number;
  gate: QualityGateResult | null;
  diff: BotSnapshotDiff | null;
  messageHe: string;
  shouldPublishPublicOren: boolean;
}

export const EVOLUTION_STATE_KEY_PREFIX = 'veyra_evolution_state_v2:';
export const EVOLUTION_OUTBOX_KEY_PREFIX = 'veyra_evolution_outbox_v2:';

export function createEmptyEvolutionState(userId: string): UserEvolutionState {
  return {
    schemaVersion: 2,
    userId,
    revision: 0,
    lastScanTimestampMs: 0,
    personalBot: {
      versionNumber: 0,
      active: null,
      past: null,
      candidate: null,
      blockedCandidate: null,
      lastGate: null,
      lastDiff: null,
      lastScanId: null,
      lastScanTimestampMs: 0,
      lastScanStatusHe: '',
      processedFingerprints: [],
      analyzedGamesCount: 0,
      buildMs: 0,
    },
    learnedGames: [],
    personalMistakes: [],
    weaknessCounts: {
      'hanging-pieces-tactics': 0,
      'endgame-conversion': 0,
      'opening-traps-personal': 0,
      'clock-tilt-discipline': 0,
    },
    inProgressLesson: null,
    courseProgress: {},
    lessonFollowUps: [],
    microLoop: { byDate: {} },
    updatedAt: new Date().toISOString(),
  };
}

function stableGameFingerprint(g: PersonalPgnGame): string {
  if (g.fingerprint && String(g.fingerprint).trim()) return String(g.fingerprint).trim();
  if (g.id && String(g.id).trim()) return `id:${String(g.id).trim()}`;
  const raw = String(g.pgn || '').replace(/\s+/g, ' ').trim();
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `pgn:${(h >>> 0).toString(16)}`;
}

function classifyWeaknessFromContext(ply: number, fen: string, clockSec: number | null): WeaknessCategoryId {
  if (clockSec != null && clockSec < 45) return 'clock-tilt-discipline';
  if (ply <= 14) return 'opening-traps-personal';
  const boardPart = String(fen || '').split(' ')[0] || '';
  const nonKingPieces = (boardPart.match(/[qrbnQRBN]/g) || []).length;
  if (ply >= 46 || nonKingPieces <= 6) return 'endgame-conversion';
  return 'hanging-pieces-tactics';
}

/** Extracts real, legal mistake positions from confirmed analyzed DNA games. */
export function extractPersonalMistakesFromGames(
  games: PersonalPgnGame[],
  ChessCtor: any
): PersonalMistakeRecord[] {
  const out: PersonalMistakeRecord[] = [];
  const seen = new Set<string>();

  for (const g of games || []) {
    if (!g?.pgn || !ChessCtor) continue;
    const fp = stableGameFingerprint(g);
    const side: 'white' | 'black' = g.playerColor === 'black' ? 'black' : 'white';
    const sideChar = side === 'black' ? 'b' : 'w';
    const gameDate = g.date || (g.playedAt ? String(g.playedAt).slice(0, 10) : 'משחק אחרון');

    let hist: any[] = [];
    try {
      const c = new ChessCtor();
      if (typeof c.loadPgn === 'function') c.loadPgn(g.pgn);
      else if (typeof c.load_pgn === 'function') c.load_pgn(g.pgn);
      hist = c.history({ verbose: true }) || [];
    } catch {
      continue;
    }
    if (hist.length < 4) continue;

    // Replay to capture FEN before every ply
    const fens: string[] = [];
    const replay = new ChessCtor();
    for (const mv of hist) {
      fens.push(replay.fen());
      try {
        if (!replay.move({ from: mv.from, to: mv.to, promotion: mv.promotion || undefined })) break;
      } catch {
        break;
      }
    }

    const analyzedMoves = g.analysis?.moves;
    if (Array.isArray(analyzedMoves) && analyzedMoves.length > 0) {
      for (const row of analyzedMoves) {
        const idx = Number(row?.index);
        const kind = row?.classification;
        if (!Number.isInteger(idx) || idx < 2 || !fens[idx]) continue;
        if (kind !== 'blunder' && kind !== 'miss' && kind !== 'mistake') continue;
        const mv = hist[idx];
        if (!mv || mv.color !== sideChar) continue;
        const playedUci = `${mv.from}${mv.to}${mv.promotion || ''}`;
        const bestUci = String(row.bestUci || row.best || '').trim();
        if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(bestUci) || bestUci === playedUci) continue;

        // Verify bestUci is legal in fens[idx]
        let bestSan = bestUci;
        try {
          const check = new ChessCtor(fens[idx]);
          const bm = check.move({ from: bestUci.slice(0, 2), to: bestUci.slice(2, 4), promotion: bestUci.slice(4) || undefined });
          if (!bm) continue;
          bestSan = bm.san || bestUci;
        } catch {
          continue;
        }

        const id = `${fp}:${idx}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const clockSec = typeof (row as any).clockSeconds === 'number' ? (row as any).clockSeconds : null;
        out.push({
          id,
          fen: fens[idx],
          bestUci,
          playedUci,
          playedSan: mv.san,
          bestSan,
          playerSide: side,
          kind,
          weaknessTag: classifyWeaknessFromContext(idx, fens[idx], clockSec),
          ply: idx,
          dropCp: Number(row.drop ?? row.cpl ?? 220),
          gameFingerprint: fp,
          gameDate,
          sourceLabelHe: `מתוך המשחק שלך (${gameDate}, מהלך ${Math.floor(idx / 2) + 1}: שיחקת ${mv.san}, העדיף ${bestSan})`,
        });
      }
    }
  }

  out.sort((a, b) => (b.kind === 'blunder' ? 1 : 0) - (a.kind === 'blunder' ? 1 : 0) || b.dropCp - a.dropCp);
  return out.slice(0, 40);
}

/** Updates 5-game post-lesson follow-up trackers with newly analyzed games. */
export function evaluateLessonFollowUps(
  trackers: LessonFollowUpTracker[],
  newGames: PersonalPgnGame[],
  newMistakes: PersonalMistakeRecord[]
): LessonFollowUpTracker[] {
  if (!Array.isArray(trackers) || !trackers.length || !newGames.length) return trackers || [];
  const mistakeTagsByGame = new Map<string, Set<WeaknessCategoryId>>();
  for (const m of newMistakes) {
    let s = mistakeTagsByGame.get(m.gameFingerprint);
    if (!s) { s = new Set(); mistakeTagsByGame.set(m.gameFingerprint, s); }
    s.add(m.weaknessTag);
  }

  return trackers.map(tr => {
    if (tr.trackedFingerprints.length >= tr.targetGames) return tr;
    const seen = new Set(tr.trackedFingerprints);
    let clean = tr.cleanGamesCount;
    let withMistake = tr.mistakeGamesCount;
    const added: string[] = [];

    for (const g of newGames) {
      if (seen.size + added.length >= tr.targetGames) break;
      const fp = stableGameFingerprint(g);
      if (seen.has(fp)) continue;
      added.push(fp);
      const tags = mistakeTagsByGame.get(fp);
      if (tags && tags.has(tr.weaknessTag)) withMistake += 1;
      else clean += 1;
    }

    if (!added.length) return tr;
    return {
      ...tr,
      trackedFingerprints: [...tr.trackedFingerprints, ...added],
      cleanGamesCount: clean,
      mistakeGamesCount: withMistake,
    };
  });
}

function compactGameForStorage(g: PersonalPgnGame): PersonalPgnGame {
  return {
    id: g.id,
    fingerprint: stableGameFingerprint(g),
    pgn: g.pgn,
    date: g.date,
    playedAt: g.playedAt,
    playerColor: g.playerColor,
    result: g.result,
    userRating: g.userRating ?? null,
    timeClass: g.timeClass,
    source: g.source,
    analysis: g.analysis ? { summary: g.analysis.summary } : undefined,
  };
}

function mergeGamesAndMistakes(prev: UserEvolutionState, newGames: PersonalPgnGame[], extraMistakes: DnaIngestionInput['extraMistakes'], ChessCtor: any) {
  const combinedMap = new Map<string, PersonalPgnGame>();
  for (const g of prev.learnedGames || []) combinedMap.set(stableGameFingerprint(g), g);
  for (const g of newGames) combinedMap.set(stableGameFingerprint(g), compactGameForStorage(g));
  const combinedGames = [...combinedMap.values()].slice(-60);
  const allFingerprints = [...new Set([...(prev.personalBot.processedFingerprints || []), ...newGames.map(g => stableGameFingerprint(g))])];

  const extracted = extractPersonalMistakesFromGames(newGames, ChessCtor);
  const extraParsed: PersonalMistakeRecord[] = [];
  for (const em of extraMistakes || []) {
    if (!em?.fen || !em?.best || !em?.played) continue;
    const side: 'white' | 'black' = String(em.fen).split(' ')[1] === 'b' ? 'black' : 'white';
    extraParsed.push({
      id: em.id || `extra:${em.fen.slice(0, 20)}:${em.played}`,
      fen: em.fen, bestUci: em.best, playedUci: em.played, playerSide: side, kind: em.kind,
      weaknessTag: classifyWeaknessFromContext(18, em.fen, null), ply: 18, dropCp: em.kind === 'blunder' ? 300 : 160,
      gameFingerprint: em.gameFingerprint || 'extra', gameDate: em.gameDate || 'משחק אחרון',
      sourceLabelHe: `מטעות אמיתית במשחק שלך (${em.gameDate || 'משחק אחרון'})`,
    });
  }
  const mistakeMap = new Map<string, PersonalMistakeRecord>();
  for (const m of prev.personalMistakes || []) mistakeMap.set(m.id, m);
  for (const m of [...extracted, ...extraParsed]) mistakeMap.set(m.id, m);
  const mergedMistakes = [...mistakeMap.values()].slice(-60);
  const weaknessCounts: Record<WeaknessCategoryId, number> = {
    'hanging-pieces-tactics': 0, 'endgame-conversion': 0, 'opening-traps-personal': 0, 'clock-tilt-discipline': 0,
  };
  for (const m of mergedMistakes) weaknessCounts[m.weaknessTag] = (weaknessCounts[m.weaknessTag] || 0) + 1;
  const updatedFollowUps = evaluateLessonFollowUps(prev.lessonFollowUps, newGames, extracted);
  return { combinedGames, allFingerprints, mergedMistakes, weaknessCounts, updatedFollowUps };
}

function buildAndGatePersonalBot(
  prev: UserEvolutionState,
  userId: string,
  input: DnaIngestionInput,
  combinedGames: PersonalPgnGame[],
  allFingerprints: string[],
  ChessCtor: any
) {
  const t0 = Date.now();
  const { trainGames, holdoutGames } = splitSharedHoldout(combinedGames, 0.2);
  const nextVersionNum = (prev.personalBot.versionNumber || 0) + 1;
  const candidateVersion = `v${nextVersionNum}`;

  const candidateSnapshot: AdaptiveBotSnapshot = input.forceCandidateSnapshot
    ? { ...input.forceCandidateSnapshot, version: candidateVersion, ownerUserId: userId }
    : buildVersionedPlayerBot(trainGames, {
        id: `personal-bot-${userId.slice(0, 8)}-${candidateVersion}`,
        name: 'הבוט הלומד שלך', version: candidateVersion, eraTag: 'current', halfLifeDays: 21,
        explicitHoldoutGames: holdoutGames, ownerUserId: userId,
        sourceLabelHe: `עודכן מסקירת DNA (${allFingerprints.length} משחקים · נבדק על ${holdoutGames.length} משחקי Holdout עיוורים)`,
        ChessCtor,
      });

  const prevActive = prev.personalBot.active;
  const prevActiveEval = prevActive
    ? {
        version: prevActive.version,
        holdout: input.forceCandidateSnapshot
          ? prevActive.holdout
          : evaluateSnapshotOnHoldout(prevActive, holdoutGames, ChessCtor, prevActive.holdout.trainingGames, 0.2),
      }
    : null;

  const gate = checkVersionQualityGate(candidateSnapshot, prevActiveEval);
  const { past: pastSlice } = splitGamesByTimeWindow(trainGames, { cutoffDays: 30 });
  const pastSnapshot: AdaptiveBotSnapshot | null = pastSlice.length >= 1
    ? buildVersionedPlayerBot(pastSlice, {
        id: `past-you-${userId.slice(0, 8)}`, name: 'אתה מלפני חודש',
        version: prev.personalBot.past?.version || 'v1-past', eraTag: 'past', halfLifeDays: 120,
        explicitHoldoutGames: holdoutGames, ownerUserId: userId,
        sourceLabelHe: `גרסת עבר היסטורית (${pastSlice.length} משחקים קודמים · נבדק על אותו Holdout)`,
        ChessCtor,
      })
    : prev.personalBot.past;

  return { nextVersionNum, candidateSnapshot, prevActive, gate, pastSnapshot, buildMs: Math.max(0, Date.now() - t0) };
}

/**
 * Core DNA -> Learning Bot -> Courses ingestion pipeline.
 * Out-of-order scans never overwrite newer versions; 0 new games is a no-op; blocked candidates never replace active.
 */
export function ingestDnaScanIntoEvolutionState(
  prevInput: UserEvolutionState | null | undefined,
  userId: string,
  input: DnaIngestionInput,
  ChessCtor: any
): DnaIngestionOutcome {
  const prev = prevInput && prevInput.userId === userId ? prevInput : createEmptyEvolutionState(userId);
  const nowIso = new Date().toISOString();

  if (prev.lastScanTimestampMs > 0 && input.scanTimestampMs < prev.lastScanTimestampMs) {
    return {
      status: 'ignored_out_of_order', state: prev, newGamesCount: 0,
      gate: prev.personalBot.lastGate, diff: prev.personalBot.lastDiff,
      messageHe: 'סקירה ישנה יותר הסתיימה מאוחר יותר — נשמרה הגרסה העדכנית יותר בלי דריסה.',
      shouldPublishPublicOren: false,
    };
  }

  const existingFpSet = new Set(prev.personalBot.processedFingerprints || []);
  const newGames: PersonalPgnGame[] = [];
  const seenInBatch = new Set<string>();
  for (const g of (input.analyzedGames || [])) {
    if (!g?.pgn || g.pgn.trim().length <= 10 || g.source === 'demo') continue;
    const fp = stableGameFingerprint(g);
    if (existingFpSet.has(fp) || seenInBatch.has(fp)) continue;
    seenInBatch.add(fp);
    newGames.push({ ...g, fingerprint: fp });
  }

  if (newGames.length === 0 && !input.forceCandidateSnapshot) {
    const msg = 'אין משחקים חדשים מאז העדכון האחרון — הבוט הפעיל נשמר ללא שינוי.';
    return {
      status: 'no_new_games',
      state: { ...prev, personalBot: { ...prev.personalBot, lastScanId: input.scanId, lastScanStatusHe: msg }, updatedAt: nowIso },
      newGamesCount: 0, gate: prev.personalBot.lastGate, diff: prev.personalBot.lastDiff,
      messageHe: msg, shouldPublishPublicOren: false,
    };
  }

  const { combinedGames, allFingerprints, mergedMistakes, weaknessCounts, updatedFollowUps } =
    mergeGamesAndMistakes(prev, newGames, input.extraMistakes, ChessCtor);

  if (combinedGames.length < 2 && !input.forceCandidateSnapshot) {
    const msg = 'נשמר משחק אחד (נדרשים לפחות 2 משחקים לבניית הבוט האישי; טעויות מהמשחק כבר זמינות לתרגול בקורסים).';
    const nextState: UserEvolutionState = {
      ...prev, revision: prev.revision + 1, lastScanTimestampMs: input.scanTimestampMs,
      learnedGames: combinedGames, personalMistakes: mergedMistakes, weaknessCounts, lessonFollowUps: updatedFollowUps,
      personalBot: { ...prev.personalBot, lastScanId: input.scanId, lastScanTimestampMs: input.scanTimestampMs, processedFingerprints: allFingerprints, analyzedGamesCount: allFingerprints.length, lastScanStatusHe: msg },
      updatedAt: nowIso,
    };
    return { status: 'insufficient_games', state: nextState, newGamesCount: newGames.length, gate: prev.personalBot.lastGate, diff: prev.personalBot.lastDiff, messageHe: msg, shouldPublishPublicOren: false };
  }

  const { nextVersionNum, candidateSnapshot, prevActive, gate, pastSnapshot, buildMs } =
    buildAndGatePersonalBot(prev, userId, input, combinedGames, allFingerprints, ChessCtor);

  const sharedBase = {
    ...prev, revision: prev.revision + 1, lastScanTimestampMs: input.scanTimestampMs,
    learnedGames: combinedGames, personalMistakes: mergedMistakes, weaknessCounts,
    lessonFollowUps: updatedFollowUps, inProgressLesson: prev.inProgressLesson, updatedAt: nowIso,
  };

  if (gate.approved) {
    const diff = diffBotSnapshots(prevActive, candidateSnapshot, newGames.length, gate);
    return {
      status: 'updated',
      state: {
        ...sharedBase,
        personalBot: {
          versionNumber: nextVersionNum, active: candidateSnapshot, past: pastSnapshot, candidate: candidateSnapshot,
          blockedCandidate: null, lastGate: gate, lastDiff: diff, lastScanId: input.scanId,
          lastScanTimestampMs: input.scanTimestampMs, lastScanStatusHe: gate.reasonHe,
          processedFingerprints: allFingerprints, analyzedGamesCount: allFingerprints.length, buildMs,
        },
      },
      newGamesCount: newGames.length, gate, diff, messageHe: gate.reasonHe, shouldPublishPublicOren: true,
    };
  }

  return {
    status: 'blocked_by_gate',
    state: {
      ...sharedBase,
      personalBot: {
        ...prev.personalBot, active: prevActive, past: pastSnapshot, candidate: candidateSnapshot,
        blockedCandidate: candidateSnapshot, lastGate: gate, lastScanId: input.scanId,
        lastScanTimestampMs: input.scanTimestampMs, lastScanStatusHe: gate.reasonHe,
        processedFingerprints: allFingerprints, analyzedGamesCount: allFingerprints.length, buildMs,
      },
    },
    newGamesCount: newGames.length, gate, diff: prev.personalBot.lastDiff, messageHe: gate.reasonHe, shouldPublishPublicOren: false,
  };
}

// --- Per-User Local Persistence + Idempotent Offline Sync Queue (5א) ---

export function loadLocalEvolutionState(userId: string | null | undefined): UserEvolutionState | null {
  if (!userId) return null;
  try {
    const raw = (globalThis as any).localStorage?.getItem(EVOLUTION_STATE_KEY_PREFIX + userId);
    if (!raw) return createEmptyEvolutionState(userId);
    const parsed = JSON.parse(raw);
    if (parsed && parsed.schemaVersion === 2 && parsed.userId === userId) return parsed;
  } catch {}
  return createEmptyEvolutionState(userId);
}

export function saveLocalEvolutionState(state: UserEvolutionState): void {
  if (!state?.userId) return;
  try {
    (globalThis as any).localStorage?.setItem(EVOLUTION_STATE_KEY_PREFIX + state.userId, JSON.stringify(state));
  } catch {}
}

export interface OfflineSyncJob {
  id: string;
  userId: string;
  queuedAt: string;
  revision: number;
  state: UserEvolutionState;
}

export function enqueueOfflineEvolutionSync(state: UserEvolutionState): void {
  if (!state?.userId) return;
  try {
    const key = EVOLUTION_OUTBOX_KEY_PREFIX + state.userId;
    const job: OfflineSyncJob = {
      id: `sync-${state.userId}-${state.revision}`,
      userId: state.userId,
      queuedAt: new Date().toISOString(),
      revision: state.revision,
      state,
    };
    // Latest full state supersedes older queued snapshots idempotently
    (globalThis as any).localStorage?.setItem(key, JSON.stringify(job));
  } catch {}
}

export function readOfflineEvolutionJob(userId: string | null | undefined): OfflineSyncJob | null {
  if (!userId) return null;
  try {
    const raw = (globalThis as any).localStorage?.getItem(EVOLUTION_OUTBOX_KEY_PREFIX + userId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearOfflineEvolutionJob(userId: string | null | undefined): void {
  if (!userId) return;
  try {
    (globalThis as any).localStorage?.removeItem(EVOLUTION_OUTBOX_KEY_PREFIX + userId);
  } catch {}
}

/** Merges server state and local state deterministically (higher revision / newer scan wins, preserving local offline progress). */
export function mergeEvolutionStates(local: UserEvolutionState | null, server: UserEvolutionState | null, userId: string): UserEvolutionState {
  if (!local && !server) return createEmptyEvolutionState(userId);
  if (!server) return local!;
  if (!local) return server;
  const base = (local.revision || 0) > (server.revision || 0) || (local.lastScanTimestampMs || 0) > (server.lastScanTimestampMs || 0)
    ? local
    : server;
  const other = base === local ? server : local;

  // Union completed course progress & daily micro-loop days so offline progress never vanishes on reconnect
  const mergedCourses = { ...(other.courseProgress || {}), ...(base.courseProgress || {}) };
  const mergedMicroByDate: Record<string, any> = { ...(other.microLoop?.byDate || {}) };
  for (const [day, entry] of Object.entries(base.microLoop?.byDate || {})) {
    const prevDay = mergedMicroByDate[day] || {};
    mergedMicroByDate[day] = {
      'blunder-rewind': Boolean(prevDay['blunder-rewind'] || (entry as any)['blunder-rewind']),
      'course-step': Boolean(prevDay['course-step'] || (entry as any)['course-step']),
      'endgame-drill': Boolean(prevDay['endgame-drill'] || (entry as any)['endgame-drill']),
    };
  }
  const followUpMap = new Map<string, LessonFollowUpTracker>();
  for (const fu of [...(other.lessonFollowUps || []), ...(base.lessonFollowUps || [])]) {
    const ex = followUpMap.get(`${fu.courseId}:${fu.lessonId}`);
    if (!ex || fu.trackedFingerprints.length >= ex.trackedFingerprints.length) {
      followUpMap.set(`${fu.courseId}:${fu.lessonId}`, fu);
    }
  }
  return {
    ...base,
    courseProgress: mergedCourses,
    microLoop: { byDate: mergedMicroByDate },
    lessonFollowUps: [...followUpMap.values()],
  };
}

export async function fetchPublicOrenBotFromServer(): Promise<{
  ok: boolean;
  bot: { activeSnapshot?: AdaptiveBotSnapshot | null; pastSnapshot?: AdaptiveBotSnapshot | null; updatedAt?: string | null } | null;
}> {
  try {
    const r = await fetch('/api/evolution-state?action=public-oren', { credentials: 'same-origin' });
    if (!r.ok) return { ok: false, bot: null };
    const data = await r.json();
    return { ok: Boolean(data?.ok), bot: data?.bot || null };
  } catch {
    return { ok: false, bot: null };
  }
}

export async function fetchMyEvolutionStateFromServer(): Promise<{
  ok: boolean;
  isOwner: boolean;
  state: UserEvolutionState | null;
  revision: number;
}> {
  try {
    const r = await fetch('/api/evolution-state?action=mine', { credentials: 'same-origin' });
    if (!r.ok) return { ok: false, isOwner: false, state: null, revision: 0 };
    const data = await r.json();
    return {
      ok: Boolean(data?.ok),
      isOwner: Boolean(data?.isOwner),
      state: data?.state || null,
      revision: Number(data?.revision || 0),
    };
  } catch {
    return { ok: false, isOwner: false, state: null, revision: 0 };
  }
}

export async function syncEvolutionStateToServer(state: UserEvolutionState): Promise<{ ok: boolean; queuedOffline: boolean; status?: number }> {
  saveLocalEvolutionState(state);
  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
  if (!isOnline) {
    enqueueOfflineEvolutionSync(state);
    return { ok: false, queuedOffline: true };
  }
  try {
    const r = await fetch('/api/evolution-state', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'save-mine', state, revision: state.revision }),
    });
    if (r.ok) {
      clearOfflineEvolutionJob(state.userId);
      return { ok: true, queuedOffline: false, status: r.status };
    }
    if (r.status === 0 || r.status >= 500) enqueueOfflineEvolutionSync(state);
    return { ok: false, queuedOffline: r.status === 0 || r.status >= 500, status: r.status };
  } catch {
    enqueueOfflineEvolutionSync(state);
    return { ok: false, queuedOffline: true };
  }
}

export async function flushOfflineEvolutionQueue(userId: string | null | undefined): Promise<boolean> {
  const job = readOfflineEvolutionJob(userId);
  if (!job?.state) return false;
  const res = await syncEvolutionStateToServer(job.state);
  return res.ok;
}

export async function publishPublicOrenBotToServer(
  activeSnapshot: AdaptiveBotSnapshot,
  pastSnapshot: AdaptiveBotSnapshot | null,
  qualityGate: QualityGateResult
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const r = await fetch('/api/evolution-state', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        action: 'publish-public-oren',
        activeSnapshot,
        pastSnapshot,
        qualityGate,
      }),
    });
    const data = await r.json().catch(() => ({}));
    return { ok: Boolean(r.ok && data?.ok), status: r.status, error: data?.error };
  } catch (err: any) {
    return { ok: false, error: String(err?.message || 'network_error') };
  }
}

/** Runs post-DNA-save evolution ingestion, server sync, and owner-only public Oren Bot publish. */
export async function applyConfirmedDnaScanUpdate(params: {
  runOwnerId: string;
  currentEvolution: UserEvolutionState | null;
  reportId: string;
  report: any;
  analyzedGames: PersonalPgnGame[];
  scanMistakes: any[];
  isOwnerAccount: boolean;
  ChessCtor: any;
  onStateUpdated: (next: UserEvolutionState) => void;
  onPublicOrenUpdated: (pub: { activeSnapshot: AdaptiveBotSnapshot; pastSnapshot: AdaptiveBotSnapshot | null; updatedAt: string }) => void;
}): Promise<string> {
  try {
    const curEvo = params.currentEvolution && params.currentEvolution.userId === params.runOwnerId
      ? params.currentEvolution
      : loadLocalEvolutionState(params.runOwnerId);
    const ingestion = ingestDnaScanIntoEvolutionState(curEvo, params.runOwnerId, {
      scanId: params.reportId,
      scanTimestampMs: Date.now(),
      source: params.report?.source,
      analyzedGames: params.analyzedGames,
      dnaReport: params.report,
      extraMistakes: params.scanMistakes,
    }, params.ChessCtor);
    params.onStateUpdated(ingestion.state);
    await syncEvolutionStateToServer(ingestion.state);
    let note = ' · ' + ingestion.messageHe;
    if (params.isOwnerAccount && ingestion.shouldPublishPublicOren && ingestion.state.personalBot.active && ingestion.gate?.approved) {
      const pub = await publishPublicOrenBotToServer(
        ingestion.state.personalBot.active,
        ingestion.state.personalBot.past,
        ingestion.gate
      );
      if (pub.ok) {
        params.onPublicOrenUpdated({
          activeSnapshot: ingestion.state.personalBot.active,
          pastSnapshot: ingestion.state.personalBot.past,
          updatedAt: new Date().toISOString(),
        });
        note += ' · בוט אורן הציבורי עודכן.';
      }
    }
    return note;
  } catch {
    return ' · עדכון הבוט האישי נכשל (הגרסה הקודמת נשמרה זמינה).';
  }
}
