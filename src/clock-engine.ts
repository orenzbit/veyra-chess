// Pure clock logic, extracted from the React page so it can be tested without a browser.
// Two behaviours matter for fairness: elapsed time must be measured from timestamps (a
// throttled background tab must not gain time), and a single tap must move the clock once.

export type ClockSide = 'white' | 'black';
export type ClockStatus = 'idle' | 'running' | 'paused' | 'flagged';

export const TAP_DEBOUNCE_MS = 120;

export interface TickResult {
  remainingMs: number;
  flagged: boolean;
}

/**
 * Subtract the elapsed wall-clock time from the running side.
 * A large delta (tab throttling, sleep, background timer) is applied in full, so the
 * clock never drifts in the player's favour; reaching zero flags the side.
 */
export function applyElapsed(remainingMs: number, elapsedMs: number): TickResult {
  const remaining = Number(remainingMs);
  const elapsed = Number(elapsedMs);
  if (!Number.isFinite(remaining) || !Number.isFinite(elapsed)) {
    return { remainingMs: Number.isFinite(remaining) ? Math.max(0, remaining) : 0, flagged: false };
  }
  const next = remaining - Math.max(0, elapsed);
  if (next <= 0) return { remainingMs: 0, flagged: true };
  return { remainingMs: next, flagged: false };
}

export type TapAction =
  | { type: 'ignore' }
  | { type: 'resume' }
  | { type: 'start'; side: 'white'; incrementMs: number }
  | { type: 'switch'; from: ClockSide; to: ClockSide; incrementMs: number };

export interface TapContext {
  status: ClockStatus;
  activeSide: ClockSide;
  side: ClockSide;
  incrementMs?: number;
  lastTapAt?: number;
  now?: number;
  debounceMs?: number;
}

/**
 * Decide what a tap on one side means. The caller applies the returned action to its state.
 * - white starts the game; a black tap while idle is ignored (white moves first)
 * - only the side that is on the move may hand over the clock
 * - taps within the debounce window are treated as one physical press
 * - a paused or flagged clock never switches sides
 */
export function resolveTap(context: TapContext): TapAction {
  const {
    status,
    activeSide,
    side,
    incrementMs = 0,
    lastTapAt = 0,
    now = Date.now(),
    debounceMs = TAP_DEBOUNCE_MS,
  } = context;
  if (status === 'flagged') return { type: 'ignore' };
  if (now - lastTapAt < debounceMs) return { type: 'ignore' };
  if (status === 'paused') return { type: 'resume' };
  if (status === 'idle') {
    return side === 'white' ? { type: 'start', side: 'white', incrementMs } : { type: 'ignore' };
  }
  if (side !== activeSide) return { type: 'ignore' };
  return { type: 'switch', from: activeSide, to: activeSide === 'white' ? 'black' : 'white', incrementMs };
}
