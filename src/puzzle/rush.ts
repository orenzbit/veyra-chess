// Puzzle Rush state machine: pure functions, injected time, no DOM. Rules (plan appendix F):
// 3:00 clock that keeps running during feedback, 3 strikes, hidden tab pauses, kit refill when puzzles run out.
import type { PuzzleDto } from './api.js';

export const RUSH_DURATION_MS = 180000;
export const RUSH_STRIKES = 3;
export const COUNTDOWN_MS = 3000;
export const CORRECT_DELAY_MS = 300;
export const FEEDBACK_MS = 1200;

export type RushPhase = 'idle' | 'countdown' | 'playing' | 'feedback' | 'paused' | 'finished';
export type FinishReason = 'time' | 'strikes' | 'no_puzzles';
export interface RushAnswer { puzzleId: string; solved: boolean; move: string; ms: number; at: number; motif: string }
export interface RushState {
  phase: RushPhase; kit: PuzzleDto[]; index: number; score: number; strikes: number; remainingMs: number;
  countdownEndsAt: number; lastTick: number; startedAt: number; endedAt: number; lockUntil: number; feedbackEndsAt: number;
  puzzleStartedAt: number; pausedFrom: 'playing' | 'feedback' | null; pausedAt: number; needMore: boolean;
  answers: RushAnswer[]; finishReason: FinishReason | null;
}

export function createRush(kit: PuzzleDto[]): RushState {
  return {
    phase: 'idle', kit: kit.slice(), index: 0, score: 0, strikes: 0, remainingMs: RUSH_DURATION_MS, countdownEndsAt: 0, lastTick: 0,
    startedAt: 0, endedAt: 0, lockUntil: 0, feedbackEndsAt: 0, puzzleStartedAt: 0, pausedFrom: null, pausedAt: 0, needMore: false,
    answers: [], finishReason: null,
  };
}

export const currentPuzzle = (s: RushState): PuzzleDto | null => (s.phase === 'playing' || s.phase === 'feedback' ? s.kit[s.index] || null : null);

function finish(s: RushState, now: number, reason: FinishReason): RushState {
  return { ...s, phase: 'finished', endedAt: now, finishReason: reason, needMore: false };
}

export function start(s: RushState, now: number): RushState {
  if (s.phase !== 'idle') return s;
  if (!s.kit.length) return finish({ ...s, startedAt: now }, now, 'no_puzzles');
  return { ...s, phase: 'countdown', countdownEndsAt: now + COUNTDOWN_MS };
}

/** Whole seconds left of the 3-2-1 countdown (0 when it is over). */
export const countdownSeconds = (s: RushState, now: number) => Math.max(0, Math.ceil((s.countdownEndsAt - now) / 1000));

function advance(s: RushState, now: number): RushState {
  const index = s.index + 1;
  if (index >= s.kit.length) return { ...s, index, needMore: true, puzzleStartedAt: now };
  return { ...s, index, puzzleStartedAt: now };
}

export function tick(s: RushState, now: number): RushState {
  if (s.phase === 'countdown') {
    if (now < s.countdownEndsAt) return s;
    // The clock starts when the countdown ends, not when the button was pressed.
    const live = { ...s, phase: 'playing' as const, startedAt: s.countdownEndsAt, lastTick: s.countdownEndsAt, puzzleStartedAt: s.countdownEndsAt };
    return tick(live, now);
  }
  if (s.phase !== 'playing' && s.phase !== 'feedback') return s;
  const clocked = { ...s, ...tickClock(s, now) };
  if (clocked.remainingMs <= 0) return finish(clocked, s.lastTick + s.remainingMs, 'time');
  if (clocked.phase === 'feedback' && now >= clocked.feedbackEndsAt) {
    if (clocked.strikes >= RUSH_STRIKES) return finish(clocked, clocked.feedbackEndsAt, 'strikes');
    return advance({ ...clocked, phase: 'playing' }, clocked.feedbackEndsAt);
  }
  return clocked;
}
function tickClock(s: RushState, now: number): { remainingMs: number; lastTick: number } {
  const remaining = Math.max(0, s.remainingMs - Math.max(0, now - s.lastTick));
  return { remainingMs: remaining, lastTick: now };
}

/** `correct` is the verdict of the caller (move in `accepted`, or mate). */
export function answer(s: RushState, now: number, move: string, correct: boolean): RushState {
  const ticked = tick(s, now);
  if (ticked.phase !== 'playing' || now < ticked.lockUntil || ticked.needMore) return ticked;
  const p = ticked.kit[ticked.index];
  if (!p) return ticked;
  const entry: RushAnswer = { puzzleId: p.id, solved: correct, move, ms: Math.max(0, Math.min(600000, now - ticked.puzzleStartedAt)), at: now, motif: p.motif };
  if (correct) {
    const next = advance({ ...ticked, score: ticked.score + 1, answers: ticked.answers.concat(entry), lockUntil: now + CORRECT_DELAY_MS }, now);
    return next;
  }
  const strikes = ticked.strikes + 1;
  return { ...ticked, strikes, phase: 'feedback', feedbackEndsAt: now + FEEDBACK_MS, answers: ticked.answers.concat(entry) };
}

/** The kit ran out: continue with more puzzles, or end the run when none are available. */
export function appendKit(s: RushState, puzzles: PuzzleDto[], now: number): RushState {
  if (!s.needMore) return s;
  const have = new Set(s.kit.map((p) => p.id));
  const extra = puzzles.filter((p) => !have.has(p.id));
  if (!extra.length) return finish(s, now, 'no_puzzles');
  return { ...s, kit: s.kit.concat(extra), needMore: false, puzzleStartedAt: now };
}

export function hide(s: RushState, now: number): RushState {
  const t = tick(s, now);
  if (t.phase !== 'playing' && t.phase !== 'feedback') return t;
  return { ...t, phase: 'paused', pausedFrom: t.phase, pausedAt: now };
}
export function show(s: RushState, now: number): RushState {
  if (s.phase !== 'paused' || !s.pausedFrom) return s;
  const gap = Math.max(0, now - s.pausedAt);
  return {
    ...s, phase: s.pausedFrom, pausedFrom: null, lastTick: now, feedbackEndsAt: s.feedbackEndsAt + gap,
    puzzleStartedAt: s.puzzleStartedAt + gap, lockUntil: s.lockUntil + gap,
  };
}

export interface RushResult {
  score: number; strikes: number; durationMs: number; puzzleIds: string[]; startedAt: number; endedAt: number;
  accuracy: number; byMotif: Record<string, { seen: number; solved: number }>; reason: FinishReason | null;
}
export function result(s: RushState): RushResult {
  const byMotif: RushResult['byMotif'] = {};
  for (const a of s.answers) { const m = (byMotif[a.motif] ||= { seen: 0, solved: 0 }); m.seen += 1; if (a.solved) m.solved += 1; }
  const durationMs = Math.max(0, Math.min(RUSH_DURATION_MS, RUSH_DURATION_MS - s.remainingMs));
  return {
    score: s.score, strikes: s.strikes, durationMs, puzzleIds: s.answers.map((a) => a.puzzleId), startedAt: s.startedAt, endedAt: s.endedAt,
    accuracy: s.answers.length ? Math.round((s.score / s.answers.length) * 100) : 0, byMotif, reason: s.finishReason,
  };
}
