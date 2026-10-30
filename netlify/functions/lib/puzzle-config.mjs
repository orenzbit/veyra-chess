// Single place for every tunable number of the personal puzzle engine (server side).
// Values come from PLAN_puzzle_engine.md appendix D/E/F. Change them here only.

export const ENGINE_VERSION = 1;

// Engine search budgets (see wasm-engine.js: search(fen,{maxDepth,nodeLimit})).
export const STAGE1 = Object.freeze({ maxDepth: 14, nodeLimit: 100000 });
export const STAGE2 = Object.freeze({ maxDepth: 16, nodeLimit: 300000 });
export const SCREEN = Object.freeze({ maxDepth: 10, nodeLimit: 30000 });
export const ALT_VERIFY = Object.freeze({ maxDepth: 14, nodeLimit: 100000 }); // alternatives found by the shallow screen are re-checked this deep
export const MATE_RESCREEN = Object.freeze({ maxDepth: 14, nodeLimit: 100000 }); // deeper pass for mate puzzles only
export const CANDIDATES_STAGE2 = 6;

// Which moves count as "also correct".
export const ALT_CP = 30;            // centipawns from the best move
export const MATE_CP = 900000;       // scores at or above this are treated as mate
export const AMBIGUOUS_MIN = 3;      // see ambiguousLimit()
export const AMBIGUOUS_RATIO = 0.15;

// What counts as a puzzle-worthy mistake (win-chance percent scale 0..100, drop on 0..1).
export const BOOK_PLIES = 8;
export const MIN_GAME_PLIES = 12;
export const MAX_PLIES = 200;
export const DROP_MIN = 0.10;
export const BLUNDER = 0.25;
export const BEST_WIN_MIN = 15;
export const AFTER_WIN_MAX = 85;
export const MAX_PER_GAME = 5;
export const TIME_BUDGET_MS = 540000; // 9 minutes of the 15 allowed for a background function

// Pool and kits.
export const POOL_TARGET = 100;
export const POOL_CAP = 150;
export const POOL_LOW_WATER = 45;     // fresh puzzles below this => refillNeeded
export const KIT_REGULAR = 15;
export const KIT_RUSH = 30;
export const MAX_PER_MOTIF = 4;
export const MAX_PER_GAME_IN_KIT = 3;
export const RUSH_MAX_MOTIF_SHARE = 0.4;

// Spaced repetition.
export const SR_STEPS_DAYS = Object.freeze([1, 3, 7, 14, 30]);
export const MASTERED_STREAK = 5;

// Limits and abuse protection.
export const MAX_ATTEMPTS_PER_USER = 5000;
export const MAX_CHECKPOINT_ATTEMPTS = 100;
export const MAX_RUSH_RUNS_PER_USER = 200;
export const MAX_FINISHED_JOBS_PER_USER = 30;
export const MAX_BODY_BYTES = 30 * 1024;
export const MAX_DNA_GAMES = 40;
export const DAILY_GAMES_CAP = 120;
export const JOB_LEASE_MS = 11 * 60 * 1000;
export const RATE_LIMIT_PER_MIN = 60;

// Puzzle Rush.
export const RUSH_DURATION_MS = 180000;
export const RUSH_GRACE_MS = 5000;
export const RUSH_MAX_STRIKES = 3;

// Feature flag: server side only; the client learns about it via DISABLED responses.
export function puzzlesEnabledFor(userId, env = process.env) {
  const flag = String(env.PUZZLES_SERVER_ENABLED || '').trim().toLowerCase();
  if (flag !== '1' && flag !== 'true' && flag !== 'on') return false;
  const allow = String(env.PUZZLES_ALLOWLIST || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!allow.length) return true;
  return allow.includes('*') || allow.includes(String(userId || '').toLowerCase());
}

export function ambiguousLimit(legalMoves) {
  return Math.max(AMBIGUOUS_MIN, Math.ceil(AMBIGUOUS_RATIO * Math.max(0, Number(legalMoves) || 0)));
}
