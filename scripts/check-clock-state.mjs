// Clock integrity checks: elapsed time must come from timestamps, and one physical
// press must move the clock exactly once. Both live in src/clock-engine.ts.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile('src/clock-engine.ts', 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { applyElapsed, resolveTap, TAP_DEBOUNCE_MS } = await import(
  'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
);

let checks = 0;
const test = (name, fn) => {
  fn();
  checks += 1;
};

// --- elapsed time -----------------------------------------------------------

test('normal tick subtracts the elapsed delta', () => {
  assert.deepEqual(applyElapsed(180_000, 40), { remainingMs: 179_960, flagged: false });
});

test('a throttled background tab loses time instead of gaining it', () => {
  // A 60 s gap between interval callbacks (timer throttling, tab hidden, machine sleep)
  // must be applied in full: the player on the clock does not get the time back.
  const tick = applyElapsed(180_000, 60_000);
  assert.deepEqual(tick, { remainingMs: 120_000, flagged: false });
  const many = applyElapsed(180_000, 3 * 60_000);
  assert.deepEqual(many, { remainingMs: 0, flagged: true }, 'long throttling flags the side');
});

test('reaching exactly zero flags without going negative', () => {
  assert.deepEqual(applyElapsed(10_000, 10_000), { remainingMs: 0, flagged: true });
  assert.deepEqual(applyElapsed(10_000, 10_001), { remainingMs: 0, flagged: true });
  assert.deepEqual(applyElapsed(0, 40), { remainingMs: 0, flagged: true });
});

test('elapsed time is never negative and malformed values cannot corrupt the clock', () => {
  assert.deepEqual(applyElapsed(5_000, -500), { remainingMs: 5_000, flagged: false });
  assert.deepEqual(applyElapsed(5_000, Number.NaN), { remainingMs: 5_000, flagged: false });
  assert.deepEqual(applyElapsed(Number.NaN, 40), { remainingMs: 0, flagged: false });
  assert.deepEqual(applyElapsed(Number.POSITIVE_INFINITY, 40), { remainingMs: 0, flagged: false });
});

test('fractional milliseconds are preserved', () => {
  assert.deepEqual(applyElapsed(1_000.5, 0.5), { remainingMs: 1_000, flagged: false });
});

// --- tap resolution ---------------------------------------------------------

test('white starts the game, a black tap while idle is ignored', () => {
  assert.deepEqual(resolveTap({ status: 'idle', activeSide: 'white', side: 'white' }), {
    type: 'start',
    side: 'white',
    incrementMs: 0,
  });
  assert.deepEqual(resolveTap({ status: 'idle', activeSide: 'white', side: 'black' }), { type: 'ignore' });
});

test('only the side on the move may hand over the clock', () => {
  assert.deepEqual(resolveTap({ status: 'running', activeSide: 'white', side: 'white' }), {
    type: 'switch',
    from: 'white',
    to: 'black',
    incrementMs: 0,
  });
  assert.deepEqual(resolveTap({ status: 'running', activeSide: 'white', side: 'black' }), { type: 'ignore' });
  assert.deepEqual(resolveTap({ status: 'running', activeSide: 'black', side: 'black' }), {
    type: 'switch',
    from: 'black',
    to: 'white',
    incrementMs: 0,
  });
  assert.deepEqual(resolveTap({ status: 'running', activeSide: 'black', side: 'white' }), { type: 'ignore' });
});

test('a double tap inside the debounce window is one press', () => {
  const first = resolveTap({ status: 'running', activeSide: 'white', side: 'white', now: 10_000 });
  assert.equal(first.type, 'switch');
  assert.equal(TAP_DEBOUNCE_MS, 120);
  const early = resolveTap({
    status: 'running',
    activeSide: 'black',
    side: 'black',
    now: 10_000 + TAP_DEBOUNCE_MS - 1,
    lastTapAt: 10_000,
  });
  assert.deepEqual(early, { type: 'ignore' }, 'second press of a bounce is dropped');
  const later = resolveTap({
    status: 'running',
    activeSide: 'black',
    side: 'black',
    now: 10_000 + TAP_DEBOUNCE_MS,
    lastTapAt: 10_000,
  });
  assert.equal(later.type, 'switch', 'a deliberate press after the window still works');
  const custom = resolveTap({
    status: 'running',
    activeSide: 'black',
    side: 'black',
    now: 10_050,
    lastTapAt: 10_000,
    debounceMs: 40,
  });
  assert.equal(custom.type, 'switch', 'debounce window is configurable');
});

test('a paused clock resumes on tap, a flagged clock ignores taps', () => {
  assert.deepEqual(resolveTap({ status: 'paused', activeSide: 'white', side: 'white' }), { type: 'resume' });
  assert.deepEqual(resolveTap({ status: 'paused', activeSide: 'white', side: 'black' }), { type: 'resume' });
  assert.deepEqual(resolveTap({ status: 'flagged', activeSide: 'white', side: 'white' }), { type: 'ignore' });
  assert.deepEqual(resolveTap({ status: 'flagged', activeSide: 'white', side: 'black' }), { type: 'ignore' });
});

test('the increment belongs to the player who just moved', () => {
  assert.deepEqual(resolveTap({ status: 'idle', activeSide: 'white', side: 'white', incrementMs: 2_000 }), {
    type: 'start',
    side: 'white',
    incrementMs: 2_000,
  });
  assert.deepEqual(resolveTap({ status: 'running', activeSide: 'black', side: 'black', incrementMs: 5_000 }), {
    type: 'switch',
    from: 'black',
    to: 'white',
    incrementMs: 5_000,
  });
});

test('a full game sequence alternates sides exactly once per press', () => {
  let action = resolveTap({ status: 'idle', activeSide: 'white', side: 'white', now: 1_000 });
  assert.equal(action.type, 'start');
  let status = 'running';
  let activeSide = 'black';
  let lastTapAt = 1_000;
  let moves = 1;

  for (let press = 0; press < 6; press += 1) {
    const now = lastTapAt + 500;
    const side = activeSide;
    action = resolveTap({ status, activeSide, side, now, lastTapAt });
    if (action.type === 'switch') {
      assert.equal(action.from, side);
      assert.equal(action.to, side === 'white' ? 'black' : 'white');
      activeSide = action.to;
      lastTapAt = now;
      moves += 1;
    }
  }
  assert.equal(moves, 7, 'start plus six presses advance the move counter by seven');
  assert.equal(activeSide, 'black');

  // Every press also costs time on the side that moved.
  const spent = applyElapsed(300_000, 6 * 500);
  assert.equal(spent.remainingMs, 297_000);
  assert.equal(spent.flagged, false);
});

console.log(`PASS: chess clock state and tap handling (${checks} suites).`);
