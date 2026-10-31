// Checks the Legends "Bot vs bot results" table: the export script, the loader/empty state and the rendered strings.
// Needs the compiled modules: npm run build  (or tsc -p tsconfig.json) writes dist/src, which is git-ignored.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const exporter = await import(pathToFileURL(join(ROOT, 'scripts', 'export-tournament-results.mjs')).href);
const resultsModule = await import(pathToFileURL(join(ROOT, 'dist', 'src', 'tournament-results.js')).href);

// Bot ids in the roster are internal (they equal real surnames for the legends), so the fixture uses them on purpose:
// the UI must show the roster display names, never the ids.
const g = (white, black, result, status = 'completed') => ({ white: { id: white }, black: { id: black }, result, status, reason: result ? 'checkmate' : null });
const fixture = [
  g('kasparov', 'carlsen', '1-0'), g('carlsen', 'kasparov', '1/2-1/2'),
  g('kasparov', 'fischer', '0-1'), g('fischer', 'kasparov', '1-0'),
  g('carlsen', 'fischer', '1/2-1/2'), g('fischer', 'carlsen', '0-1'),
  g('carlsen', 'fischer', null, 'failed'), g('fischer', 'carlsen', '*'),
];

// 1. Export script: W/D/L, points, pair symmetry.
const exported = exporter.buildResultsFromGames(fixture, { generatedAt: '2026-01-01T00:00:00.000Z' });
assert.equal(exported.games, 6, 'failed and unfinished games must not be counted');
assert.equal(exported.skipped, 2);
const stat = (id) => exported.bots.find((bot) => bot.id === id);
assert.deepEqual(stat('kasparov'), { id: 'kasparov', wins: 1, draws: 1, losses: 2, points: 1.5 });
assert.deepEqual(stat('carlsen'), { id: 'carlsen', wins: 1, draws: 2, losses: 1, points: 2 });
assert.deepEqual(stat('fischer'), { id: 'fischer', wins: 2, draws: 1, losses: 1, points: 2.5 });
assert.deepEqual(exported.bots.map((bot) => bot.id), ['fischer', 'carlsen', 'kasparov'], 'bots are ordered by points');
assert.deepEqual(exported.pairs, [
  { a: 'carlsen', b: 'fischer', aWins: 1, draws: 1, bWins: 0 },
  { a: 'carlsen', b: 'kasparov', aWins: 0, draws: 1, bWins: 1 },
  { a: 'fischer', b: 'kasparov', aWins: 2, draws: 0, bWins: 0 },
]);
assert.deepEqual(Object.keys(exported).sort(), ['bots', 'games', 'generatedAt', 'pairs'], 'real exports carry no demo flag');
exporter.assertConsistent(exported);

// Reference run: same counting as scripts/aggregate-tournament-shards.mjs on a pseudo-random round robin.
const ids = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot'];
let seed = 12345;
const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const many = [];
for (const x of ids) for (const y of ids) if (x !== y) many.push(g(x, y, ['1-0', '0-1', '1/2-1/2'][Math.floor(rand() * 3)]));
const reference = Object.fromEntries(ids.map((id) => [id, { wins: 0, draws: 0, losses: 0, points: 0 }]));
for (const record of many) {
  const white = reference[record.white.id], black = reference[record.black.id];
  if (record.result === '1-0') { white.wins += 1; black.losses += 1; white.points += 1; }
  else if (record.result === '0-1') { black.wins += 1; white.losses += 1; black.points += 1; }
  else { white.draws += 1; black.draws += 1; white.points += 0.5; black.points += 0.5; }
}
const big = exporter.buildResultsFromGames(many);
assert.equal(big.games, 30);
for (const bot of big.bots) assert.deepEqual({ wins: bot.wins, draws: bot.draws, losses: bot.losses, points: bot.points }, reference[bot.id], 'bot ' + bot.id);
assert.equal(big.pairs.length, 15);
const bigResults = resultsModule.normalizeTournamentResults(big);
assert.ok(bigResults, 'exported data must pass the UI validator');
for (const pair of big.pairs) {
  assert.ok(pair.a < pair.b, 'pairs are stored once, smaller id first');
  assert.equal(pair.aWins + pair.draws + pair.bWins, 2, 'both colours were played');
  const forward = resultsModule.headToHead(bigResults, pair.a).find((row) => row.opponentId === pair.b);
  const backward = resultsModule.headToHead(bigResults, pair.b).find((row) => row.opponentId === pair.a);
  assert.deepEqual([forward.wins, forward.draws, forward.losses], [backward.losses, backward.draws, backward.wins], 'head-to-head is symmetric');
}
for (const bot of big.bots) {
  const rows = resultsModule.headToHead(bigResults, bot.id);
  assert.equal(rows.length, ids.length - 1);
  assert.deepEqual([rows.reduce((s, r) => s + r.wins, 0), rows.reduce((s, r) => s + r.draws, 0), rows.reduce((s, r) => s + r.losses, 0)], [bot.wins, bot.draws, bot.losses], 'pair rows add up to the standings');
}

// summary.json input (aggregate shape: bots is an object keyed by id, no pairs).
const summary = { finishedAt: '2026-02-02T00:00:00.000Z', completedGames: 6, bots: Object.fromEntries(exported.bots.map((bot) => [bot.id, { games: 4, wins: bot.wins, draws: bot.draws, losses: bot.losses, points: bot.points }])) };
const fromSummary = exporter.buildResultsFromSummary(summary);
assert.deepEqual(fromSummary.bots, exported.bots);
assert.deepEqual(fromSummary.pairs, []);
assert.equal(fromSummary.games, 6);
assert.equal(fromSummary.generatedAt, '2026-02-02T00:00:00.000Z');
exporter.assertConsistent(fromSummary);

// CLI round trip (scratch files live in dist/, which is git-ignored) and refusal to write an empty file.
const scratch = join(ROOT, 'dist', '.bot-table-check');
await rm(scratch, { recursive: true, force: true });
await mkdir(scratch, { recursive: true });
try {
  const jsonl = (records) => records.map((record) => JSON.stringify(record)).join('\n') + '\n';
  const run = (...args) => spawnSync(process.execPath, [join(ROOT, 'scripts', 'export-tournament-results.mjs'), ...args], { encoding: 'utf8' });
  await writeFile(join(scratch, 'games.jsonl'), jsonl(fixture));
  await writeFile(join(scratch, 'summary.json'), JSON.stringify({ ...summary, completedGames: 6 }));
  const out = join(scratch, 'results.json');
  const ok = run(scratch, '--out', out);
  assert.equal(ok.status, 0, ok.stderr);
  const written = JSON.parse(readFileSync(out, 'utf8'));
  assert.deepEqual(written.bots, exported.bots);
  assert.deepEqual(written.pairs, exported.pairs);
  assert.equal(written.generatedAt, '2026-02-02T00:00:00.000Z', 'generatedAt follows summary.finishedAt');
  const emptyDir = join(scratch, 'empty');
  await mkdir(emptyDir);
  await writeFile(join(emptyDir, 'games.jsonl'), jsonl([g('a', 'b', null, 'failed')]));
  assert.notEqual(run(emptyDir, '--out', join(emptyDir, 'results.json')).status, 0, 'no completed games must not produce a results file');
  assert.ok(!existsSync(join(emptyDir, 'results.json')));
  const badDir = join(scratch, 'bad');
  await mkdir(badDir);
  await writeFile(join(badDir, 'games.jsonl'), jsonl(fixture));
  await writeFile(join(badDir, 'summary.json'), JSON.stringify({ ...summary, bots: { ...summary.bots, fischer: { games: 4, wins: 0, draws: 0, losses: 4 } } }));
  assert.notEqual(run(badDir, '--out', join(badDir, 'results.json')).status, 0, 'a summary that disagrees with games.jsonl must fail');
  // summary.json as written by run-legends-tournament.mjs: per-bot game counts only, no wins/draws/losses.
  const runSummary = {
    status: 'passed', finishedAt: '2026-03-03T00:00:00.000Z', completedGames: 6, naturalResults: { white: 3, black: 1, draw: 2 },
    bots: Object.fromEntries(['kasparov', 'carlsen', 'fischer'].map((id) => [id, { name: id, games: 4, completed: 4, failures: 0, capped: 0 }])),
  };
  const runDir = join(scratch, 'run');
  await mkdir(runDir);
  await writeFile(join(runDir, 'games.jsonl'), jsonl(fixture));
  await writeFile(join(runDir, 'summary.json'), JSON.stringify(runSummary));
  const runOut = join(runDir, 'results.json');
  const fromRun = run(runDir, '--out', runOut);
  assert.equal(fromRun.status, 0, 'folder with a run-legends summary must export from games.jsonl: ' + fromRun.stderr);
  const runWritten = JSON.parse(readFileSync(runOut, 'utf8'));
  assert.deepEqual(runWritten.bots, exported.bots);
  assert.deepEqual(runWritten.pairs, exported.pairs);
  assert.equal(runWritten.generatedAt, '2026-03-03T00:00:00.000Z');
  const summaryOnlyDir = join(scratch, 'summary-only');
  await mkdir(summaryOnlyDir);
  await writeFile(join(summaryOnlyDir, 'summary.json'), JSON.stringify(runSummary));
  for (const target of [summaryOnlyDir, join(summaryOnlyDir, 'summary.json')]) {
    const failed = run(target, '--out', join(summaryOnlyDir, 'results.json'));
    assert.notEqual(failed.status, 0, 'a summary without results must not export');
    assert.match(failed.stderr, /no wins\/draws\/losses.*games\.jsonl/s, 'the error must point to games.jsonl');
  }
  assert.ok(!existsSync(join(summaryOnlyDir, 'results.json')));
  assert.throws(() => exporter.buildResultsFromSummary(runSummary), /games\.jsonl/);
} finally {
  await rm(scratch, { recursive: true, force: true });
}

// 2. Loader: a missing, broken or empty file means "no results yet", never an error.
const response = (ok, body) => async () => ({ ok, json: async () => { if (body instanceof Error) throw body; return body; } });
assert.equal(await resultsModule.loadTournamentResults(response(false, null)), null, '404');
assert.equal(await resultsModule.loadTournamentResults(async () => { throw new TypeError('network down'); }), null, 'network failure');
assert.equal(await resultsModule.loadTournamentResults(response(true, new SyntaxError('Unexpected token <'))), null, 'SPA fallback HTML served as 200');
assert.equal(await resultsModule.loadTournamentResults(response(true, {})), null, 'empty object');
assert.equal(await resultsModule.loadTournamentResults(response(true, { generatedAt: 'x', games: 0, bots: [], pairs: [] })), null, 'zero games');
assert.equal(await resultsModule.loadTournamentResults(response(true, { games: 3, bots: [{ id: 'x', wins: -1, draws: 0, losses: 0 }], pairs: [] })), null, 'invalid bot rows');
assert.equal(await resultsModule.loadTournamentResults(undefined), null, 'no fetch available');
let requested = null;
const loaded = await resultsModule.loadTournamentResults(async (url) => { requested = url; return { ok: true, json: async () => exported }; });
assert.equal(requested, '/data/tournament/results.json');
assert.equal(loaded.games, 6);
assert.equal(loaded.bots.length, 3);

// 3. Rendered strings (the section is a pure view, so a tiny React stand-in is enough).
const flatten = (items) => items.flat(Infinity).filter((item) => item !== null && item !== undefined && item !== false);
globalThis.React = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children: flatten(children) }),
  Fragment: 'fragment', useState: (value) => [value, () => {}], useEffect: () => {},
};
globalThis.window = globalThis.window || { addEventListener() {}, removeEventListener() {} };
const view = await import(pathToFileURL(join(ROOT, 'dist', 'src', 'bot-results-table.js')).href);
const walk = (node, visit) => { if (node && typeof node === 'object') { visit(node); node.children.forEach((child) => walk(child, visit)); } };
const strings = (node) => {
  const found = [];
  const collect = (value) => { if (typeof value === 'string') found.push(value); };
  const visit = (value) => { if (typeof value === 'string' || typeof value === 'number') collect(String(value)); else walk(value, (n) => { collect(n.props['aria-label']); n.children.forEach((c) => { if (typeof c === 'string') found.push(c); }); }); };
  visit(node);
  return found;
};
const find = (node, predicate) => { const hits = []; walk(node, (n) => { if (predicate(n)) hits.push(n); }); return hits; };

const roster = [{ id: 'kasparov', name: 'The Dynamic Storm' }, { id: 'carlsen', name: 'The Best of All Time' }, { id: 'fischer', name: 'The Precision Machine' }, { id: 'bystander', name: 'Never Played' }];
const base = { bots: roster, selectedId: '', onSelect: () => {} };
for (const lang of ['he', 'en']) {
  const emptyText = lang === 'he' ? 'עדיין אין תוצאות טורניר' : 'No tournament results yet';
  for (const status of ['empty']) {
    const tree = view.botResultsView({ ...base, lang, status, results: null });
    assert.ok(strings(tree).includes(emptyText), lang + ' empty state text');
    assert.equal(find(tree, (n) => n.type === 'table').length, 0, 'no table in the empty state');
  }
  const loading = view.botResultsView({ ...base, lang, status: 'loading', results: null });
  assert.equal(find(loading, (n) => n.type === 'table').length, 0);
  assert.ok(!strings(loading).includes(emptyText), 'loading must not claim there are no results');
  // results that match no roster bot also mean nothing to show
  const orphan = view.botResultsView({ ...base, bots: [], lang, status: 'ready', results: loaded });
  assert.ok(strings(orphan).includes(emptyText));

  const tree = view.botResultsView({ ...base, lang, status: 'ready', results: loaded });
  assert.equal(tree.props.dir, lang === 'he' ? 'rtl' : 'ltr');
  const heading = lang === 'he' ? 'טבלת בוטים מול בוטים' : 'Bot vs bot results';
  assert.ok(strings(tree).includes(heading));
  const tables = find(tree, (n) => n.type === 'table');
  assert.equal(tables.length, 2, 'standings and head-to-head');
  assert.equal(find(tree, (n) => n.props.className === 'bot-results-scroll').length, 2, 'each table sits in a scroll container');
  assert.ok(!strings(tree).includes('Never Played'), 'bots without games are not listed');
  const rows = find(tables[0], (n) => n.type === 'tr').slice(1).map((tr) => strings(tr));
  assert.deepEqual(rows, [['1', 'The Precision Machine', '2', '1', '1', '2.5'], ['2', 'The Best of All Time', '1', '2', '1', '2'], ['3', 'The Dynamic Storm', '1', '1', '2', '1.5']]);
  const versus = find(tables[1], (n) => n.type === 'tr').slice(1).map((tr) => strings(tr));
  assert.deepEqual(versus, [['The Best of All Time', '0', '1', '1', '2'], ['The Dynamic Storm', '2', '0', '0', '2']], 'head-to-head of the top bot');
  const picked = view.botResultsView({ ...base, lang, status: 'ready', results: loaded, selectedId: 'kasparov' });
  const pickedRows = find(find(picked, (n) => n.type === 'table')[1], (n) => n.type === 'tr').slice(1).map((tr) => strings(tr));
  assert.deepEqual(pickedRows, [['The Precision Machine', '0', '0', '2', '2'], ['The Best of All Time', '1', '1', '0', '2']], 'selected bot row against each opponent');
  assert.ok(!strings(tree).some((text) => /demo/i.test(text) || /הדגמה/.test(text)), 'real data carries no demo banner');
  const demo = view.botResultsView({ ...base, lang, status: 'ready', results: { ...loaded, demo: true } });
  assert.equal(find(demo, (n) => n.props.className === 'bot-results-demo').length, 1, 'demo data is labelled');
  const noPairs = view.botResultsView({ ...base, lang, status: 'ready', results: { ...loaded, pairs: [] } });
  assert.equal(find(noPairs, (n) => n.type === 'table').length, 1, 'summary-only data shows standings and a note');
  const onClickTargets = find(tree, (n) => n.type === 'button');
  assert.equal(onClickTargets.length, 3);
  assert.ok(onClickTargets.every((button) => typeof button.props.onClick === 'function'));
}

// Real roster: only display names are rendered, never ids or the real names behind the legends.
const roster61 = JSON.parse(read('public/data/bots/index.json'));
const allResults = resultsModule.normalizeTournamentResults(exporter.buildResultsFromGames(
  roster61.flatMap((x, i) => roster61.slice(i + 1).flatMap((y) => [g(x.id, y.id, '1-0'), g(y.id, x.id, '1/2-1/2')]))));
assert.equal(allResults.bots.length, roster61.length);
const realNames = ['Kasparov', 'Carlsen', 'Fischer', 'Karpov', 'Anand', 'Nakamura', 'Polgar', 'Morphy', 'Marshall', 'Anderssen', 'Capablanca', 'Magnus', 'Garry', 'Bobby', 'Mikhail', 'Judit', 'Hikaru', 'Viswanathan', 'Anatoly', 'Paul ', 'Adolf', 'Frank '];
// One pre-existing roster entry (capablanca) is named after the player in public/data/bots/index.json and in the
// existing simulator selectors; the table shows roster names as-is, so that single label is the only allowed match.
const rosterNames = new Set(roster61.map((bot) => bot.name));
const knownRosterRealName = roster61.filter((bot) => realNames.some((name) => bot.name.includes(name)));
assert.deepEqual(knownRosterRealName.map((bot) => bot.id), ['capablanca'], 'the roster has exactly one pre-existing real-name label');
for (const lang of ['he', 'en']) {
  for (const status of ['empty', 'loading', 'ready']) {
    const tree = view.botResultsView({ bots: roster61, selectedId: 'tal', onSelect: () => {}, lang, status, results: status === 'ready' ? allResults : null });
    for (const text of strings(tree)) {
      assert.ok(!roster61.some((bot) => text === bot.id), 'bot id rendered as text: ' + text);
      if (rosterNames.has(text) && knownRosterRealName.some((bot) => bot.name === text)) continue;
      assert.ok(!realNames.some((name) => text.includes(name)), 'real name rendered: ' + text);
    }
  }
}
const rendered = strings(view.botResultsView({ bots: roster61, selectedId: 'tal', onSelect: () => {}, lang: 'en', status: 'ready', results: allResults }));
assert.ok(rendered.includes('The Magician from Riga') && rendered.includes('The Dynamic Storm'), 'legend nicknames come from the roster');

// Source-level guards: no real names in the new UI/data code, wiring, styling, preview-only seed, no fabricated results.
for (const file of ['src/bot-results-table.ts', 'src/tournament-results.ts']) {
  const source = read(file);
  assert.ok(!realNames.some((name) => source.includes(name)), file + ' contains a real name');
}
const legends = read('src/legends-page.ts');
assert.ok(legends.includes("from './bot-results-table.js'") && legends.includes('h(BotResultsSection, { bots: safeBots })'), 'Legends page must render the results section');
const css = read('public/styles.css');
assert.match(css, /\.bot-results-scroll\{[^}]*max-width:100%[^}]*overflow:auto/, 'results tables scroll inside their container');
assert.match(css, /\.legends-bot-results\{[^}]*min-width:0/, 'section must be able to shrink to 360px');
const preview = read('scripts/local-preview.mjs');
assert.ok(preview.includes("args.includes('--seed-tournament')") && preview.includes('if (seedTournamentBody && url.pathname'), 'preview seed is behind --seed-tournament');
assert.ok(!existsSync(join(ROOT, 'public', 'data', 'tournament', 'results.json')) || (() => {
  const committed = JSON.parse(read('public/data/tournament/results.json'));
  exporter.assertConsistent(committed);
  return committed.demo !== true;
})(), 'a committed results.json must be real, consistent data (never demo)');
console.log('PASS: bot-vs-bot export (W/D/L, points, pair symmetry), missing-file empty state, Hebrew/English views and no real names validated.');
