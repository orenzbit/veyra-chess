// Pure clock logic, extracted from the React page so it can be tested without a browser.
// Two behaviours matter for fairness: elapsed time must be measured from timestamps (a
// throttled background tab must not gain time), and a single tap must move the clock once.

export type ClockSide = 'white' | 'black';
export type ClockStatus = 'idle' | 'running' | 'paused' | 'flagged';

export const TAP_DEBOUNCE_MS = 120;

// A side below this remaining time is highlighted as low on time and warned once.
export const LOW_TIME_MS = 20_000;

export interface LowTimeDecision {
  warn: boolean;
  armed: boolean;
}

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

/**
 * Decide whether one side's clock has just crossed below LOW_TIME_MS.
 * It warns once per crossing: `armed` is cleared by a warning and set again only when the
 * side's time is back at LOW_TIME_MS or more (increment or reset). A side that is not running
 * and a side at zero never warn.
 */
export function shouldWarnLowTime(prevMs: number, nextMs: number, running: boolean, armed: boolean): LowTimeDecision {
  if (!Number.isFinite(nextMs)) return { warn: false, armed };
  if (nextMs >= LOW_TIME_MS) return { warn: false, armed: true };
  const crossed = running && armed && nextMs > 0 && prevMs >= LOW_TIME_MS;
  return crossed ? { warn: true, armed: false } : { warn: false, armed };
}

export interface LowTimeState {
  prevWhite: number;
  prevBlack: number;
  armedWhite: boolean;
  armedBlack: boolean;
}

export interface LowTimeFrame {
  whiteMs: number;
  blackMs: number;
  state: string;
  activeSide: ClockSide;
}

export interface LowTimeStep {
  next: LowTimeState;
  beepSide: ClockSide | null;
}

export function initialLowTimeState(whiteMs: number, blackMs: number): LowTimeState {
  return { prevWhite: whiteMs, prevBlack: blackMs, armedWhite: true, armedBlack: true };
}

/**
 * One render of the clock page. Only the side on the move can warn, so at most one beep is
 * returned per frame. Any state other than 'running' (idle, paused, flagged) resyncs the stored
 * times and re-arms both sides, so resuming can never beep for time that was already announced.
 */
export function stepLowTime(prev: LowTimeState, frame: LowTimeFrame): LowTimeStep {
  if (frame.state !== 'running') {
    return { next: initialLowTimeState(frame.whiteMs, frame.blackMs), beepSide: null };
  }
  const white = shouldWarnLowTime(prev.prevWhite, frame.whiteMs, frame.activeSide === 'white', prev.armedWhite);
  const black = shouldWarnLowTime(prev.prevBlack, frame.blackMs, frame.activeSide === 'black', prev.armedBlack);
  const next = {
    prevWhite: frame.whiteMs,
    prevBlack: frame.blackMs,
    armedWhite: white.armed,
    armedBlack: black.armed,
  };
  const beepSide = white.warn ? 'white' : black.warn ? 'black' : null;
  return { next, beepSide };
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
