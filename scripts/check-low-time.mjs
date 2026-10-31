// Low-time warning checks: the threshold is one constant, and the beep fires once per crossing
// below it on the running side only. The decision lives in src/clock-engine.ts.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile('src/clock-engine.ts', 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { LOW_TIME_MS, shouldWarnLowTime } = await import(
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

test('a simulated 40 ms tick sequence beeps exactly once while the clock runs', () => {
  let armed = true;
  let prev = 20_500;
  let beeps = 0;
  for (let ms = 20_460; ms >= 19_000; ms -= 40) {
    const decision = shouldWarnLowTime(prev, ms, true, armed);
    if (decision.warn) beeps += 1;
    armed = decision.armed;
    prev = ms;
  }
  assert.equal(beeps, 1);
});

test('pausing below 20 s and resuming does not beep again', () => {
  let armed = true;
  let beeps = 0;
  const sequence = [
    [20_000, 19_900, true],
    [19_900, 19_860, true],
    [19_860, 19_860, false],
    [19_860, 19_820, true],
  ];
  for (const [prev, next, running] of sequence) {
    const decision = shouldWarnLowTime(prev, next, running, armed);
    if (decision.warn) beeps += 1;
    armed = decision.armed;
  }
  assert.equal(beeps, 1);
});

// The page must compare against the constant in both highlight checks (black and white side).
const pageSource = await readFile('src/chess-clock.ts', 'utf8');
assert.equal((pageSource.match(/< LOW_TIME_MS && state === 'running'/g) || []).length, 2, 'both side highlights use LOW_TIME_MS');
assert.equal(/< 30000 && state/.test(pageSource), false, 'no 30-second highlight threshold remains');

console.log(`PASS: low-time warning (${checks} suites).`);
