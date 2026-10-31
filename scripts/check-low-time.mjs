// Low-time warning checks: the threshold is one constant, and the beep fires once per crossing
// below it on the running side only. The decision lives in src/clock-engine.ts.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile('src/clock-engine.ts', 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { LOW_TIME_MS, initialLowTimeState, shouldWarnLowTime, stepLowTime } = await import(
  'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
);

let checks = 0;
const test = (name, fn) => {
  fn();
  checks += 1;
};

test('the low-time threshold is 20 seconds', () => {
  assert.equal(LOW_TIME_MS, 20_000);
});

test('crossing from 20 s to just under warns once', () => {
  const first = shouldWarnLowTime(20_000, 19_900, true, true);
  assert.deepEqual(first, { warn: true, armed: false });
  const next = shouldWarnLowTime(19_900, 19_800, true, first.armed);
  assert.deepEqual(next, { warn: false, armed: false }, 'a later tick below 20 s does not beep again');
});

test('a clock that is already below 20 s on resume never warns on its own', () => {
  assert.deepEqual(shouldWarnLowTime(19_900, 19_860, true, true), { warn: false, armed: true });
});

test('a single large drop across the threshold still warns once', () => {
  assert.deepEqual(shouldWarnLowTime(20_500, 19_000, true, true), { warn: true, armed: false });
});

test('exactly 20 s is not yet low; the first millisecond under it is', () => {
  assert.deepEqual(shouldWarnLowTime(20_040, 20_000, true, true), { warn: false, armed: true });
  assert.deepEqual(shouldWarnLowTime(20_000, 19_999, true, true), { warn: true, armed: false });
});

test('a side that is not running never warns', () => {
  assert.deepEqual(shouldWarnLowTime(20_000, 19_900, false, true), { warn: false, armed: true });
  assert.deepEqual(shouldWarnLowTime(20_000, 19_900, false, false), { warn: false, armed: false });
});

test('time at zero or a game that is over never warns', () => {
  assert.deepEqual(shouldWarnLowTime(20_000, 0, true, true), { warn: false, armed: true });
  assert.deepEqual(shouldWarnLowTime(1_000, 0, true, true), { warn: false, armed: true });
  assert.deepEqual(shouldWarnLowTime(20_000, 19_900, false, true), { warn: false, armed: true }, 'flagged clocks are not running');
});

test('the warning re-arms only when the side is back at 20 s or more', () => {
  const warned = shouldWarnLowTime(20_000, 19_900, true, true);
  assert.equal(warned.armed, false);
  const incremented = shouldWarnLowTime(19_900, 20_900, true, warned.armed);
  assert.deepEqual(incremented, { warn: false, armed: true }, 'an increment re-arms');
  const again = shouldWarnLowTime(20_900, 19_900, true, incremented.armed);
  assert.deepEqual(again, { warn: true, armed: false }, 'a second crossing warns again');
});

test('a reset to a full clock re-arms the warning', () => {
  assert.deepEqual(shouldWarnLowTime(19_900, 180_000, true, false), { warn: false, armed: true });
});

test('malformed time values neither warn nor change the armed state', () => {
  assert.deepEqual(shouldWarnLowTime(20_000, Number.NaN, true, true), { warn: false, armed: true });
  assert.deepEqual(shouldWarnLowTime(20_000, Number.NaN, true, false), { warn: false, armed: false });
});

// --- realistic replays through stepLowTime (the function the page's effect calls) ----------

const KEY = { white: 'whiteMs', black: 'blackMs' };
const other = (side) => (side === 'white' ? 'black' : 'white');
const FULL_MS = 180_000;

// A small driver for one game: every change is one render frame fed through stepLowTime.
// Beeps are checked as they happen: only a running clock beeps, and only for the side on the move.
function game(whiteMs, blackMs) {
  let clock = { whiteMs, blackMs, state: 'idle', activeSide: 'white' };
  let low = initialLowTimeState(whiteMs, blackMs);
  const beeps = [];
  const feed = (patch) => {
    clock = { ...clock, ...patch };
    const { next, beepSide } = stepLowTime(low, clock);
    low = next;
    if (beepSide) {
      assert.equal(clock.state, 'running', 'a beep needs a running clock');
      assert.equal(beepSide, clock.activeSide, 'a beep is only for the side on the move');
      beeps.push(beepSide);
    }
  };
  const api = {
    get beeps() {
      return [...beeps];
    },
    // White's first press starts the game: its increment goes to white and black is on the move.
    start(incrementMs = 0) {
      feed({ state: 'running', activeSide: 'black', whiteMs: clock.whiteMs + incrementMs });
      return api;
    },
    // The side on the move presses; its increment goes to the side that just moved.
    press(side, incrementMs = 0) {
      assert.equal(clock.activeSide, side, 'only the side on the move can press');
      feed({ activeSide: other(side), [KEY[side]]: clock[KEY[side]] + incrementMs });
      return api;
    },
    // The running side loses 40 ms per frame, like the page's timer, until it reaches toMs.
    countdown(side, toMs) {
      assert.equal(clock.activeSide, side, 'only the running side loses time');
      assert.equal(clock.state, 'running', 'the clock must be running to count down');
      while (clock[KEY[side]] > toMs) feed({ [KEY[side]]: Math.max(toMs, clock[KEY[side]] - 40) });
      return api;
    },
    pause() {
      feed({ state: 'paused' });
      return api;
    },
    resume() {
      feed({ state: 'running' });
      return api;
    },
    reset(ms = FULL_MS) {
      feed({ state: 'idle', whiteMs: ms, blackMs: ms, activeSide: 'white' });
      return api;
    },
    flag(side) {
      feed({ [KEY[side]]: 0, state: 'flagged' });
      return api;
    },
    set(patch) {
      feed(patch);
      return api;
    },
  };
  return api;
}

test('starting under 20 s does not beep', () => {
  const g = game(19_000, 19_000).start().countdown('black', 18_000);
  assert.deepEqual(g.beeps, []);
});

test('starting a full clock does not beep until a side crosses', () => {
  const g = game(FULL_MS, FULL_MS).start().countdown('black', 60_000).press('black').countdown('white', 60_000);
  assert.deepEqual(g.beeps, []);
});

test('white running crosses below 20 s: exactly one beep, for white', () => {
  const g = game(FULL_MS, FULL_MS).start().countdown('black', 60_000).press('black').countdown('white', 19_000);
  assert.deepEqual(g.beeps, ['white']);
});

test('a side switch while black is above 20 s does not beep', () => {
  const g = game(FULL_MS, FULL_MS)
    .start()
    .countdown('black', 25_000)
    .press('black')
    .countdown('white', 21_000)
    .press('white')
    .countdown('black', 21_000)
    .press('black')
    .countdown('white', 20_000);
  assert.deepEqual(g.beeps, []);
});

test('pausing and resuming below 20 s does not beep again', () => {
  const g = game(FULL_MS, FULL_MS).start().countdown('black', 19_500);
  assert.deepEqual(g.beeps, ['black']);
  g.pause().resume().countdown('black', 18_000);
  assert.deepEqual(g.beeps, ['black'], 'resume under 20 s is not a new crossing');
});

test('pausing and resuming a clock that started under 20 s does not beep', () => {
  const g = game(19_000, 19_000).start().pause().resume().countdown('black', 18_000);
  assert.deepEqual(g.beeps, []);
});

test('an increment back to 20 s or more re-arms, so the next crossing beeps again', () => {
  const g = game(FULL_MS, FULL_MS).start().countdown('black', 19_500);
  assert.deepEqual(g.beeps, ['black']);
  g.press('black', 1_000).countdown('white', 175_000).press('white').countdown('black', 19_000);
  assert.deepEqual(g.beeps, ['black', 'black']);
});

test('reset re-arms the warning for the next game', () => {
  const g = game(FULL_MS, FULL_MS).start().countdown('black', 19_500);
  assert.deepEqual(g.beeps, ['black']);
  g.reset().start().countdown('black', 19_000);
  assert.deepEqual(g.beeps, ['black', 'black']);
});

test('a flagged clock or a game over never beeps', () => {
  const flagged = game(FULL_MS, FULL_MS).start().countdown('black', 20_500).flag('black');
  assert.deepEqual(flagged.beeps, []);

  const zeroWhileRunning = game(FULL_MS, FULL_MS).start().countdown('black', 20_500).set({ blackMs: 0 });
  assert.deepEqual(zeroWhileRunning.beeps, [], 'zero time never beeps');

  const jumpedToLow = game(FULL_MS, FULL_MS).start().countdown('black', 20_500).set({ blackMs: 19_000, state: 'flagged' });
  assert.deepEqual(jumpedToLow.beeps, [], 'a non-running clock never beeps');
});

test('swapping sides never beeps for the side that is not on the move', () => {
  const g = game(60_000, 60_000)
    .start()
    .countdown('black', 20_300)
    .press('black')
    .countdown('white', 20_200)
    .press('white')
    .countdown('black', 19_900)
    .press('black')
    .countdown('white', 19_900)
    .press('white')
    .countdown('black', 19_500)
    .press('black')
    .countdown('white', 19_000);
  assert.deepEqual(g.beeps, ['black', 'white']);
});

// The page must compare against the constant in both highlight checks (black and white side).
const pageSource = await readFile('src/chess-clock.ts', 'utf8');
assert.equal((pageSource.match(/< LOW_TIME_MS && state === 'running'/g) || []).length, 2, 'both side highlights use LOW_TIME_MS');
assert.equal(/< 30000 && state/.test(pageSource), false, 'no 30-second highlight threshold remains');
assert.ok(/stepLowTime\(lowTimeRef\.current,/.test(pageSource), 'the page effect calls stepLowTime');
assert.equal(/shouldWarnLowTime\(/.test(pageSource), false, 'the page does not duplicate the crossing rule');

console.log(`PASS: low-time warning (${checks} suites).`);
