import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { DNA_END_FIXTURES, DNA_END_PARSER_FIXTURES } from './lib/dna-end-fixtures.mjs';

const source = await readFile('src/chess-dna.ts', 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const url = 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const { classifyDnaGameEnd, selectLatestDnaGames, DNA_MIN_PLIES } = await import(url);

assert.equal(DNA_MIN_PLIES, 12, 'short means fewer than 12 plies (six full moves)');

for (const fixture of DNA_END_FIXTURES) {
  assert.deepEqual(classifyDnaGameEnd(fixture.pgn), { plies: fixture.plies, endCause: fixture.endCause }, fixture.name);
}
console.log('PASS: plies and end cause match hand-checked fixtures (boundaries 5/6/7 moves, mate at 4 plies, resignation at 3 moves, unknown results, no termination header, comments/variations/NAGs, CRLF).');

for (const fixture of DNA_END_PARSER_FIXTURES) {
  assert.deepEqual(classifyDnaGameEnd(fixture.pgn), { plies: fixture.plies, endCause: fixture.endCause }, fixture.name);
}
console.log('PASS: nested variations, comment parentheses, glued annotation glyphs and non-breaking spaces are tokenised as expected.');

const excludedFixtures = DNA_END_FIXTURES.filter(f => f.plies < 12 && f.endCause === 'other');
const keptFixtures = DNA_END_FIXTURES.filter(f => !(f.plies < 12 && f.endCause === 'other'));
assert.ok(excludedFixtures.length >= 5 && keptFixtures.length >= 10, 'fixture set covers both sides of the rule');

const candidate = (id, date, pgn, extra = {}) => ({ id, source: 'chesscom', date, pgn, timeClass: 'rapid', playerColorKnown: true, ...extra });
const byName = (name) => DNA_END_FIXTURES.find(f => f.name === name);
const shortOther = byName('five full moves, time forfeit, decisive result (10 plies)').pgn;
const boundary = selectLatestDnaGames([
  candidate('eleven-plies-other', '2026-03-01', byName('eleven plies (six moves not yet complete), time forfeit').pgn),
  candidate('twelve-plies-other', '2026-03-02', byName('twelve plies (six full moves), time forfeit is kept').pgn),
  candidate('five-moves-resign', '2026-03-03', byName('three moves, chess.com resignation').pgn),
], 25);
assert.equal(boundary.counts.excludedShortUnfinished, 1, '11 plies with a time forfeit is excluded');
assert.deepEqual(boundary.selected.rapid.map(g => g.id), ['five-moves-resign', 'twelve-plies-other'], '12 plies with a time forfeit is kept');
console.log('PASS: selection boundary: 11 plies excluded, 12 plies kept, short resignation kept.');
const shortUnknown = byName('short game with no Termination header but decisive result').pgn;
const mateFour = byName('mate in two full moves (four plies) with contradicting time forfeit header').pgn;
const resignThree = byName('three moves, chess.com resignation').pgn;

const mixed = [
  candidate('short-other', '2026-03-01', shortOther),
  candidate('short-unknown', '2026-03-02', shortUnknown),
  candidate('mate-four', '2026-03-03', mateFour),
  candidate('resign-three', '2026-03-04', resignThree),
  candidate('short-other-invalid-date', '2026-02-31', shortOther + ' {a}'),
  candidate('short-other-classical', '2026-03-05', shortOther + ' {b}', { timeClass: 'classical' }),
  candidate('short-other-demo', '2026-03-06', shortOther + ' {c}', { source: 'demo' }),
  candidate('short-other-dup', '2026-03-07', shortOther),
];
const before = JSON.stringify(mixed);
const selection = selectLatestDnaGames(mixed, 25);
assert.equal(JSON.stringify(mixed), before, 'selection must not mutate or delete the archived input games');
assert.equal(mixed.length, 8);

assert.equal(selection.counts.excludedShortUnfinished, 1, 'only the short unfinished game without mate/resignation is excluded');
assert.equal(selection.counts.shortUnknownEnd, 1, 'short unknown-end game is kept and counted');
assert.equal(selection.counts.excludedInvalid, 1, 'invalid date stays an invalid exclusion, not a short one');
assert.equal(selection.counts.excludedUnknownTimeClass, 1, 'classical stays a time-class exclusion');
assert.equal(selection.counts.excludedDemo, 1, 'demo stays a demo exclusion');
assert.equal(selection.counts.duplicates, 1, 'a duplicate of an excluded short game is counted as a duplicate');
assert.deepEqual(selection.selected.rapid.map(g => g.id), ['resign-three', 'mate-four', 'short-unknown'], 'newest first among eligible games');
const identity = selection.counts.excludedDemo + selection.counts.excludedUnknownTimeClass + selection.counts.excludedInvalid
  + selection.counts.duplicates + selection.counts.excludedShortUnfinished + selection.counts.eligible;
assert.equal(identity, selection.counts.fetched, 'every fetched game falls into exactly one bucket');
console.log('PASS: short unfinished games are excluded, unknown-end short games are kept and counted, other exclusions keep their precedence, and the sum of buckets equals fetched.');

const shortNewest = Array.from({ length: 26 }, (_, i) =>
  candidate('short-' + i, '2026-03-' + String(i + 1).padStart(2, '0'), shortOther + ' {s' + i + '}'));
const longOlder = Array.from({ length: 25 }, (_, i) =>
  candidate('mate-' + i, '2026-01-' + String(i + 1).padStart(2, '0'), mateFour + ' {m' + i + '}'));
const capped = selectLatestDnaGames([...shortNewest, ...longOlder], 25);
assert.equal(capped.counts.excludedShortUnfinished, 26);
assert.equal(capped.selected.rapid.length, 25, 'the 25-game cap is applied after the short-game filter');
assert.ok(capped.selected.rapid.every(g => g.id.startsWith('mate-')), 'excluded short games never take a sample slot');
console.log('PASS: the short-game filter runs before the per-class cap, so excluded games do not use sample slots.');

const emptyPgn = candidate('no-moves', '2026-03-10', byName('headers only, no moves, time forfeit').pgn);
const noMoves = selectLatestDnaGames([emptyPgn], 25);
assert.equal(noMoves.counts.excludedShortUnfinished, 1, 'a game with zero plies and a classifiable other end is excluded');
console.log('PASS: zero-ply game with a classifiable end is excluded instead of aborting the run.');

const rules = await import('../public/vendor/veyra-rules/chess-compat.js');
for (const fixture of DNA_END_FIXTURES.filter(f => f.plies > 0)) {
  const board = new rules.Chess();
  board.loadPgn(fixture.pgn, { sloppy: true });
  assert.equal(board.history().length, fixture.plies, 'repo rules engine ply count: ' + fixture.name);
  assert.equal(board.isCheckmate(), fixture.endCause === 'checkmate', 'repo rules engine checkmate flag: ' + fixture.name);
}
console.log('PASS: plies and checkmate flags agree with the repo rules engine (public/vendor/veyra-rules) on every fixture.');
