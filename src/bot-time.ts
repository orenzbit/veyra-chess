// Time-pressure rules for bots that play with a clock.
// Budget per move: 1/20 of the bot's remaining clock, at most (remaining - 2 s), at least 200 ms,
// and always strictly below the remaining time.
export const BOT_MIN_BUDGET_MS = 200;
export const BOT_CLOCK_RESERVE_MS = 2000;
export const BOT_BUDGET_FRACTION = 20;
export const BOT_DELAY_BUDGET_SHARE = 0.2;

// Epoch-like milliseconds from the monotonic clock, so a system clock change does not move a deadline.
// Page and worker share the time origin semantics of performance.timeOrigin.
export function botNow(): number {
  const perf: any = typeof performance !== 'undefined' ? performance : null;
  return perf && typeof perf.now === 'function' && Number.isFinite(perf.timeOrigin) ? perf.timeOrigin + perf.now() : Date.now();
}

// No usable clock (NaN/Infinity) means no budget: Infinity, which the search treats as untimed.
export function botBudgetMs(remainingMs: number): number {
  const remaining = Number(remainingMs);
  if (!Number.isFinite(remaining)) return Infinity;
  if (remaining <= 0) return 0;
  let budget = Math.max(BOT_MIN_BUDGET_MS, Math.min(Math.floor(remaining / BOT_BUDGET_FRACTION), remaining - BOT_CLOCK_RESERVE_MS));
  if (budget >= remaining) budget = remaining / 2;
  return budget;
}

// The pre-move "humanizing" pause. Untimed: unchanged. Timed: at most 20% of the budget,
// and it is part of the budget (the search deadline is turn start + budget).
export function botThinkingDelayMs(elo: number, budgetMs?: number | null): number {
  const base = Math.min(4700, Math.max(350, 1200 - (elo || 300) / 4));
  if (budgetMs == null || !Number.isFinite(budgetMs)) return base;
  return Math.max(0, Math.min(base, budgetMs * BOT_DELAY_BUDGET_SHARE));
}
