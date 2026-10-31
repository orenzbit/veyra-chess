// Checks the secondary statistics: ACPL (per-move centipawn loss) and win rate per opening.
// Covers the cpLoss/ACPL math on a stub engine, the real engine worker's cp fields, server-side persistence of the
// new optional fields, the opening aggregation, the DNA report hand-off and the rendered "—" for older analyses.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { Chess } from '../rules-src/chess-compat.mjs';
import {
  analyzeGameMoves, averageCentipawnLoss, computeCentipawnLoss, computeReviewSummary, CP_LOSS_CAP
} from '../src/review-metrics.ts';
import { buildOpeningStats, OPENING_DEFAULT_ROWS } from '../src/stats-openings.ts';
import { buildAcplStats, formatAcpl } from '../src/stats-acpl.ts';
import { buildDnaReport } from '../src/chess-dna.ts';
import { _test } from '../netlify/functions/chess-dna.mjs';
import { createEngine } from './review-benchmark.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = path => readFile(resolve(root, path), 'utf8');
const MATE = 99990;

// ---- 1. computeCentipawnLoss: convention -------------------------------------------------------------------
const base = { playedUci: 'e2e4', bestUci: 'd2d4', isBookMove: false, legalMoveCount: 30 };
assert.equal(computeCentipawnLoss({ ...base, moverColor: 'w', bestScore: 30, afterScore: 10 }), 20, 'white: best - played');
assert.equal(computeCentipawnLoss({ ...base, moverColor: 'b', bestScore: -50, afterScore: 20 }), 70, 'black: perspective is flipped');
assert.equal(computeCentipawnLoss({ ...base, moverColor: 'w', bestScore: 10, afterScore: 80 }), 0, 'better than the best line is never negative');
assert.equal(computeCentipawnLoss({ ...base, moverColor: 'b', bestScore: 10, afterScore: -80 }), 0, 'black better than best is never negative');
assert.equal(computeCentipawnLoss({ ...base, moverColor: 'w', bestScore: 50, afterScore: -1500 }), CP_LOSS_CAP, 'white loss is capped at 1000');
assert.equal(computeCentipawnLoss({ ...base, moverColor: 'b', bestScore: -50, afterScore: 1500 }), CP_LOSS_CAP, 'black loss is capped at 1000');
assert.equal(computeCentipawnLoss({ ...base, moverColor: 'w', bestScore: 1000, afterScore: 0 }), 1000, 'a loss of exactly 1000 stays 1000');
assert.equal(computeCentipawnLoss({ ...base, moverColor: 'w', bestScore: MATE, afterScore: 300 }), 700, 'white mate score maps to +1000 before the difference');
assert.equal(computeCentipawnLoss({ ...base, moverColor: 'b', bestScore: -MATE, afterScore: -300 }), 700, 'black mate score maps to the mover\'s +1000');
assert.equal(computeCentipawnLoss({ ...base, moverColor: 'w', bestScore: 100, afterScore: -MATE }), CP_LOSS_CAP, 'walking into mate: 100 - (-1000) is capped');
assert.equal(computeCentipawnLoss({ ...base, moverColor: 'w', bestScore: 600, afterScore: -MATE }), CP_LOSS_CAP);
assert.equal(computeCentipawnLoss({ ...base, moverColor: 'b', bestScore: -400, afterScore: MATE }), CP_LOSS_CAP, 'black walking into mate');
assert.equal(computeCentipawnLoss({ ...base, moverColor: 'w', bestScore: -MATE, afterScore: -MATE }), 0, 'already lost either way');
assert.equal(computeCentipawnLoss({ ...base, moverColor: 'w', bestScore: MATE, afterScore: 200 }), 800, 'mate mapped exactly to 1000, not to the raw engine value');
assert.equal(computeCentipawnLoss({ ...base, moverColor: 'w', bestScore: 30, afterScore: -20, isBookMove: true }), null, 'book moves are excluded');
assert.equal(computeCentipawnLoss({ ...base, moverColor: 'w', bestScore: 30, afterScore: -20, legalMoveCount: 1 }), null, 'forced moves are excluded');
assert.equal(computeCentipawnLoss({ ...base, moverColor: 'w', bestScore: 30, afterScore: -200, playedUci: 'd2d4' }), 0, 'playing the engine best move is a loss of 0');
assert.equal(computeCentipawnLoss({ ...base, moverColor: 'w', bestScore: 30, afterScore: -200, isMateMove: true }), 0, 'delivering mate is a loss of 0');
assert.equal(computeCentipawnLoss({ ...base, moverColor: 'w', bestScore: undefined, afterScore: 5 }), null, 'no best score: no value');
assert.equal(computeCentipawnLoss({ ...base, moverColor: 'w', bestScore: 5, afterScore: null }), null, 'no after score: no value');
assert.equal(computeCentipawnLoss({ ...base, moverColor: 'w', bestScore: NaN, afterScore: 5 }), null, 'NaN score: no value');
assert.equal(averageCentipawnLoss([{ cpLoss: 10 }, {}, { cpLoss: 25 }]), 17.5, 'average skips moves without a value');
assert.equal(averageCentipawnLoss([{}, {}]), null);
console.log('PASS: cpLoss convention (own moves, max(0, best - played), cap 1000, mate -> +/-1000, book/forced excluded, both colors).');

// ---- 2. analyzeGameMoves on a stub engine sequence ---------------------------------------------------------
const GAME = ['a3', 'a6', 'e3', 'f6', 'Qh5+', 'g6'];
const parsed = new Chess();
for (const san of GAME) assert.ok(parsed.move(san), 'fixture move is legal: ' + san);
const history = (() => { const c = new Chess(); return GAME.map(san => c.move(san)); })();
const forcedCheck = new Chess();
for (const san of GAME.slice(0, 5)) forcedCheck.move(san);
assert.equal(forcedCheck.moves().length, 1, 'g6 is the only legal reply to Qh5+');
// White-perspective centipawns; the played move is never the stub's best move unless stated.
const SCRIPT = [
  { bestScore: 20, afterScore: 15 },        // a3  white, book
  { bestScore: 15, afterScore: 10 },        // a6  black, book
  { bestScore: 30, afterScore: 10 },        // e3  white: loss 20
  { bestScore: 10, afterScore: 1500 },      // f6  black: 1510 -> capped 1000
  { bestScore: MATE, afterScore: 300 },     // Qh5+ white: mate 1000 - 300 = 700
  { bestScore: -300, afterScore: -250 }     // g6  black, forced
];
function stubEngine(withScores) {
  let call = 0;
  return async (fen, afterFen, mover) => {
    const row = SCRIPT[call++];
    const raw = {
      bestUci: 'zzzz', whiteChanceBest: 50, whiteChanceAfter: 40, drop: 0.1, isMateMove: false,
      afterBestUci: null, afterDepth: 1, moverSecondBestChance: null
    };
    return withScores ? { ...raw, ...row } : raw;
  };
}
const options = engine => ({ Chess, analyzePosition: engine, openingLines: new Set(['a3 a6']) });
const rows = await analyzeGameMoves(history, options(stubEngine(true)));
assert.deepEqual(rows.map(row => row.cpLoss), [undefined, undefined, 20, 1000, 700, undefined], 'per-move cpLoss: book/forced absent, others per the convention');
assert.equal(rows[0].classification, 'book');
assert.equal(rows[5].classification, 'forced');
const summary = computeReviewSummary(rows);
assert.equal(summary.whiteAcpl, 360, 'white ACPL = (20 + 700) / 2');
assert.equal(summary.blackAcpl, 1000, 'black ACPL = the single eligible black move');

// Identical classifications, accuracy and rating with or without the new fields.
const legacyRows = await analyzeGameMoves(history, options(stubEngine(false)));
assert.ok(legacyRows.every(row => !('cpLoss' in row)), 'no cp scores from the engine: no cpLoss at all');
const legacySummary = computeReviewSummary(legacyRows);
assert.ok(!('whiteAcpl' in legacySummary) && !('blackAcpl' in legacySummary), 'an analysis without cpLoss keeps the old summary shape');
assert.deepEqual(rows.map(row => row.classification), legacyRows.map(row => row.classification), 'classifications are identical');
const { whiteAcpl, blackAcpl, ...summaryWithoutAcpl } = summary;
assert.deepEqual(summaryWithoutAcpl, legacySummary, 'accuracy, rating and counts are identical');
console.log('PASS: stub engine sequence gives the expected cpLoss/ACPL and leaves classifications, accuracy and rating unchanged.');

// ---- 3. The real engine worker reports the cp values and the review loop uses them ------------------------
const workerSource = await read('public/engine-worker.js');
assert.ok(workerSource.includes('bestScore:best.score'), 'the worker reports the best-line centipawn score');
const sendEngine = await createEngine(root);
let requestId = 0;
const realRows = await analyzeGameMoves(history, {
  Chess, openingLines: new Set(['a3 a6']),
  analyzePosition: (fen, afterFen, mover, cachedBefore, alternatives) => sendEngine({
    id: 'acpl-' + requestId++, fen, afterFen, mover: { from: mover.from, to: mover.to, promotion: mover.promotion || null }, cachedBefore, alternatives
  })
});
realRows.forEach((row, index) => {
  assert.ok(Number.isFinite(row.bestScore) && Number.isFinite(row.afterScore), 'ply ' + (index + 1) + ': real engine returns bestScore and afterScore');
  if (row.classification === 'book' || row.classification === 'forced') assert.equal(row.cpLoss, undefined, 'ply ' + (index + 1) + ' has no cpLoss');
  else {
    assert.ok(Number.isInteger(row.cpLoss) && row.cpLoss >= 0 && row.cpLoss <= CP_LOSS_CAP, 'ply ' + (index + 1) + ' cpLoss in 0..1000');
    if (row.bestUci === row.playedUci) assert.equal(row.cpLoss, 0, 'best move costs nothing');
  }
});
const realSummary = computeReviewSummary(realRows);
assert.ok(realSummary.whiteAcpl >= 0 && realSummary.blackAcpl >= 0 && realSummary.whiteAcpl <= CP_LOSS_CAP);
console.log('PASS: real engine worker supplies bestScore/afterScore; review rows carry cpLoss (white ' + realSummary.whiteAcpl + ', black ' + realSummary.blackAcpl + ').');

// ---- 4. Persistence: the optional fields are validated and preserved by the DNA endpoint ------------------
const analysisWith = (extraMove = {}, extraSummary = {}) => ({
  moves: [
    { index: 0, classification: 'best', whiteChanceBefore: 50, whiteChanceAfter: 52, cpLoss: 12.5, ...extraMove },
    { index: 1, classification: 'mistake', whiteChanceBefore: 52, whiteChanceAfter: 47 }
  ],
  summary: { whiteAcc: 91.5, blackAcc: 84.2, whiteAcpl: 12.5, ...extraSummary }
});
assert.equal(_test.validateAnalysis(analysisWith()), true, 'analysis with cpLoss and ACPL is accepted');
assert.equal(_test.validateAnalysis({ moves: analysisWith().moves.map(({ cpLoss, ...rest }) => rest), summary: { whiteAcc: 91.5, blackAcc: 84.2 } }), true, 'older analysis without the fields is accepted');
for (const bad of [-1, 1001, NaN, '12', null]) {
  assert.equal(_test.validateAnalysis(analysisWith({ cpLoss: bad })), false, 'bad cpLoss rejected: ' + String(bad));
  assert.equal(_test.validateAnalysis(analysisWith({}, { whiteAcpl: bad })), false, 'bad whiteAcpl rejected: ' + String(bad));
}
assert.equal(_test.validateAnalysis(analysisWith({}, { blackAcpl: 2000 })), false, 'bad blackAcpl rejected');

const FP = 'b'.repeat(64);
const stored = [{ fingerprint: FP, game_json: { timeClass: 'blitz', playerColor: 'white', date: '2026-03-01', analysis: analysisWith() } }];
const counts = { best: 1, brilliant: 0, great: 0, excellent: 0, good: 0, book: 0, forced: 0, inaccuracy: 0, mistake: 0, miss: 0, blunder: 0 };
const emptySection = { count: 0, games: [], averageAccuracy: null, userMoves: 0, classificationCounts: {}, issueRatesPer100Moves: { inaccuracy: 0, mistake: 0, miss: 0, blunder: 0 } };
const reportWith = acpl => ({
  schemaVersion: 2, engineVersion: 'chessy-ai-fast-v2-depth16-node250000-scoring-2026-10-26',
  timeControls: {
    bullet: emptySection,
    blitz: {
      count: 1, games: [{ fingerprint: FP, playerColor: 'white', date: '2026-03-01', ...(acpl === undefined ? {} : { acpl }) }],
      averageAccuracy: 91.5, userMoves: 1, classificationCounts: counts, issueRatesPer100Moves: { inaccuracy: 0, mistake: 0, miss: 0, blunder: 0 }
    },
    rapid: emptySection
  }
});
const verify = report => _test.validateReportAgainstSavedGames(report, stored, _test.validateReportStructure(report));
assert.equal(verify(reportWith(12.5)), true, 'report ACPL equal to the stored summary is accepted');
assert.equal(verify(reportWith(undefined)), true, 'report without ACPL is accepted');
assert.equal(verify(reportWith(99)), false, 'fabricated report ACPL is rejected');
assert.equal(verify(reportWith(-3)), false);
console.log('PASS: server validates and preserves optional cpLoss / whiteAcpl / blackAcpl; fabricated report ACPL is rejected.');

// ---- 5. buildDnaReport hands the user\'s ACPL to the report --------------------------------------------------
const dnaGame = (id, playerColor, summaryExtra, extra = {}) => ({
  id, fingerprint: id.padEnd(64, '0'), source: 'chesscom', date: '2026-03-0' + id.length, timeClass: 'blitz', timeControlLabel: '5:00', playerColor,
  pgn: '1. e4 e5', result: 'win', opening: 'Italian Game',
  analysis: { moves: [{ index: 0, classification: 'best' }, { index: 1, classification: 'best' }], summary: { whiteAcc: 90, blackAcc: 80, ...summaryExtra } }, ...extra
});
const dna = buildDnaReport([
  dnaGame('a', 'white', { whiteAcpl: 30, blackAcpl: 90 }),
  dnaGame('bb', 'black', { whiteAcpl: 30, blackAcpl: 90 }),
  dnaGame('ccc', 'white', {}),
  dnaGame('dddd', 'white', { whiteAcpl: 5000 })
]);
const dnaGames = dna.timeControls.blitz.games;
assert.deepEqual(dnaGames.map(game => game.acpl), [30, 90, undefined, undefined], 'report games carry the user side\'s ACPL only; missing/invalid -> absent');
assert.ok(dnaGames.every(game => typeof game.opening === 'string' && ['win', 'loss', 'draw', 'unknown'].includes(game.result)), 'report games keep opening name and result');
assert.equal(dna.schemaVersion, 2, 'report schema version is unchanged');
console.log('PASS: Chess DNA report copies the user\'s ACPL per game and keeps the schema version.');

// ---- 6. Opening aggregation --------------------------------------------------------------------------------
const og = (opening, result, accuracy, playerColor = 'white') => ({ opening, result, accuracy, playerColor });
const openingReport = {
  timeControls: {
    bullet: { games: [og('Caro-Kann Defense', 'win', 70), og('Caro-Kann Defense', 'unknown', 50), og('French Defense', 'loss', 60)] },
    blitz: {
      games: [
        og('Italian Game', 'win', 90, 'black'), og('Italian Game', 'draw', 80), og('Italian Game', 'loss', 70),
        og('Sicilian Defense', 'win', 80), og('Sicilian Defense', 'win', undefined, 'black'),
        og(undefined, 'loss', 40), og('', 'draw', 60)
      ]
    },
    rapid: { games: [og('  italian   game ', 'win', 60), og('פתיחה לא זוהתה', 'win', 50), null, 'junk'] }
  }
};
const opening = buildOpeningStats(openingReport);
assert.deepEqual(opening.map(row => [row.isUnknown ? 'Unknown' : row.name, row.games]),
  [['Italian Game', 4], ['Unknown', 3], ['Caro-Kann Defense', 2], ['Sicilian Defense', 2]],
  'min 2 games, sorted by games then name, unknown grouped, one-game openings hidden');
const italian = opening[0];
assert.deepEqual([italian.wins, italian.draws, italian.losses, italian.decided], [2, 1, 1, 4]);
assert.deepEqual([italian.winPct, italian.drawPct, italian.lossPct], [50, 25, 25], 'W/D/L from the user\'s side regardless of colour');
assert.equal(italian.averageAccuracy, 75);
const unknown = opening[1];
assert.deepEqual([unknown.wins, unknown.draws, unknown.losses], [1, 1, 1]);
assert.equal(unknown.averageAccuracy, 50);
const caro = opening[2];
assert.deepEqual([caro.games, caro.decided, caro.winPct, caro.drawPct, caro.lossPct], [2, 1, 100, 0, 0], 'unknown results count as games but not toward percentages');
assert.equal(opening[3].averageAccuracy, 80, 'accuracy averages only games that have one');
assert.deepEqual(buildOpeningStats(null), []);
assert.deepEqual(buildOpeningStats({ timeControls: { blitz: { games: 'nope' } } }), []);
assert.equal(buildOpeningStats({ timeControls: { blitz: { games: [og('X', 'win', 1)] } } }).length, 0, 'a single game is never shown');
const many = { timeControls: { blitz: { games: Array.from({ length: 24 }, (_, i) => og('Opening ' + String(Math.floor(i / 2)).padStart(2, '0'), 'win', 50)) } } };
assert.equal(buildOpeningStats(many).length, 12);
console.log('PASS: opening aggregation (user-side W/D/L, min 2 games, sorting, Unknown grouping, accuracy average).');

// ---- 7. ACPL aggregation and rendering ---------------------------------------------------------------------
const acplReport = { timeControls: { blitz: { games: [{ acpl: 40 }, { acpl: 60 }, {}, { acpl: -1 }, { acpl: 5000 }, { acpl: '50' }, { acpl: NaN }] }, rapid: { games: [{ acpl: 0 }] } } };
assert.deepEqual(buildAcplStats(acplReport), { average: 33.3, games: 3, totalGames: 8 }, 'average over games that have a valid ACPL');
assert.deepEqual(buildAcplStats({ timeControls: { blitz: { games: [{}, { accuracy: 80 }] } } }), { average: null, games: 0, totalGames: 2 });
assert.deepEqual(buildAcplStats(null), { average: null, games: 0, totalGames: 0 });
assert.equal(formatAcpl(undefined), '—');
assert.equal(formatAcpl(null), '—');
assert.equal(formatAcpl(NaN), '—');
assert.equal(formatAcpl(33.333), '33.3');
assert.equal(formatAcpl(0), '0.0');

const transpile = source => {
  const output = ts.transpileModule(source, { reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
  assert.equal(output.diagnostics.length, 0, 'no syntax errors: ' + output.diagnostics.map(item => ts.flattenDiagnosticMessageText(item.messageText, ' ')).join('; '));
  return output.outputText;
};
const dataUrl = js => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const openingsUrl = dataUrl(transpile(await read('src/stats-openings.ts')));
const acplUrl = dataUrl(transpile(await read('src/stats-acpl.ts')));
const uiSource = await read('src/stats-secondary-ui.ts');
const uiJs = transpile(uiSource).replace(/(['"])\.\/stats-openings\.js\1/, JSON.stringify(openingsUrl)).replace(/(['"])\.\/stats-acpl\.js\1/, JSON.stringify(acplUrl));
assert.ok(!uiJs.includes('./stats-'), 'UI module imports were rewritten for the test');
let stateSlots = [];
let slot = 0;
globalThis.React = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter(child => child !== false && child != null) }),
  Fragment: 'fragment',
  useState: initial => {
    const index = slot++;
    if (!(index in stateSlots)) stateSlots[index] = initial;
    return [stateSlots[index], value => { stateSlots[index] = value; }];
  }
};
const { OpeningWinRateTable, AcplCard } = await import(dataUrl(uiJs));
const render = (component, props) => { slot = 0; return component(props); };
const flatten = node => typeof node === 'object' && node ? [node, ...node.children.flatMap(flatten)] : [node];
const textOf = node => flatten(node).filter(item => typeof item !== 'object').join(' ');
const find = (node, predicate) => flatten(node).filter(item => typeof item === 'object' && predicate(item));
const HEBREW = /[\u0590-\u05FF]/;

// Old analyses (no ACPL anywhere): "—", zero counted games, and the bilingual note.
const oldReport = { timeControls: { blitz: { games: [{ opening: 'Italian Game', result: 'win', accuracy: 80 }, { opening: 'Italian Game', result: 'loss', accuracy: 70 }] } } };
const oldHe = textOf(render(AcplCard, { report: oldReport, lang: 'he' }));
const oldEn = textOf(render(AcplCard, { report: oldReport, lang: 'en' }));
assert.ok(oldHe.includes('—') && oldHe.includes('0 מתוך 2') && oldHe.includes('ACPL זמין למשחקים שנותחו מעכשיו') && oldHe.includes('ACPL ממוצע'), oldHe);
assert.ok(oldEn.includes('—') && oldEn.includes('0 of 2') && oldEn.includes('ACPL is available for games analyzed from now on') && oldEn.includes('Average ACPL'), oldEn);
assert.ok(!HEBREW.test(oldEn), 'English ACPL card contains no Hebrew');
assert.equal(render(AcplCard, { report: oldReport, lang: 'en' }).props.dir, 'ltr', 'English cards force LTR (the statistics page container is RTL)');
assert.equal(render(AcplCard, { report: oldReport, lang: 'he' }).props.dir, 'rtl');
assert.equal(render(OpeningWinRateTable, { report: oldReport, lang: 'en' }).props.dir, 'ltr');
const mixedEn = textOf(render(AcplCard, { report: acplReport, lang: 'en' }));
assert.ok(mixedEn.includes('33.3') && mixedEn.includes('3 of 8') && mixedEn.includes('available for games analyzed from now on'), mixedEn);
const fullEn = textOf(render(AcplCard, { report: { timeControls: { blitz: { games: [{ acpl: 20 }, { acpl: 40 }] } } }, lang: 'en' }));
assert.ok(fullEn.includes('30.0') && fullEn.includes('2 of 2') && !fullEn.includes('from now on'), 'no note when every game has ACPL');

// Opening table: top 10 by default, "show all" toggle, localized labels.
stateSlots = [];
const shown = () => find(render(OpeningWinRateTable, { report: many, lang: 'en' }), item => item.type === 'tbody')[0].children.length;
assert.equal(shown(), OPENING_DEFAULT_ROWS, 'top 10 by default');
const toggle = find(render(OpeningWinRateTable, { report: many, lang: 'en' }), item => item.type === 'button')[0];
assert.ok(toggle && textOf(toggle).includes('Show all (12)'));
toggle.props.onClick();
assert.equal(shown(), 12, 'show all reveals every qualifying opening');
assert.ok(textOf(find(render(OpeningWinRateTable, { report: many, lang: 'en' }), item => item.type === 'button')[0]).includes('Show top 10 only'));
stateSlots = [];
const fewHe = render(OpeningWinRateTable, { report: openingReport, lang: 'he' });
assert.equal(find(fewHe, item => item.type === 'button').length, 0, 'no toggle when 10 or fewer openings');
assert.ok(textOf(fewHe).includes('לא ידוע') && textOf(fewHe).includes('Italian Game') && textOf(fewHe).includes('50%'));
const fewEn = render(OpeningWinRateTable, { report: openingReport, lang: 'en' });
assert.ok(textOf(fewEn).includes('Unknown') && !HEBREW.test(textOf(fewEn)), 'English table has no Hebrew (unknown row localized)');
const emptyEn = textOf(render(OpeningWinRateTable, { report: { timeControls: {} }, lang: 'en' }));
assert.ok(emptyEn.includes('No opening has at least 2 games') && !HEBREW.test(emptyEn));
const emptyHe = textOf(render(OpeningWinRateTable, { report: { timeControls: {} }, lang: 'he' }));
assert.ok(emptyHe.includes('עדיין אין פתיחה עם לפחות 2 משחקים'));
console.log('PASS: ACPL and opening components render "—" for old analyses, both languages, top-10 and show-all.');

// ---- 8. Wiring ---------------------------------------------------------------------------------------------
const main = await read('src/main.ts');
assert.ok(main.includes("import { OpeningWinRateTable, AcplCard } from './stats-secondary-ui.js';"));
assert.ok(main.includes("h(OpeningWinRateTable,{report:dnaReport,lang:getLang()}),h(AcplCard,{report:dnaReport,lang:getLang()})"), 'statistics page hooks');
const css = await read('public/styles.css');
assert.ok(/\.stats-table-scroll\{[^}]*overflow-x:auto/.test(css), 'the table scrolls inside its card instead of overflowing the page');
assert.ok(/\.stats-secondary\{[^}]*min-width:0/.test(css));
const preview = await read('scripts/local-preview.mjs');
assert.ok(preview.includes("--seed-stats"), 'local preview can seed statistics');
console.log('PASS: statistics page hooks, mobile CSS and preview seed flag.');
