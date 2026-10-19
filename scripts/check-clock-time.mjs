import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile('src/clock-time.ts', 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { formatTimeDisplay } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

const cases = [
  [180000, '3:00'],
  [60000, '1:00'],
  [10000, '0:10'],
  [9999, '0:09.9'],
  [8400, '0:08.4'],
  [1000, '0:01.0'],
  [100, '0:00.1'],
  [1, '0:00.0'],
  [0, '0:00'],
  [-1, '0:00'],
  [Number.NaN, '0:00'],
  [Number.POSITIVE_INFINITY, '0:00'],
];

for (const [input, expected] of cases) {
  assert.equal(formatTimeDisplay(input), expected, `formatTimeDisplay(${input})`);
}

console.log(`PASS: chess clock formatting (${cases.length} cases).`);
