// DNA plan checks: npm run check:dna-plan (also run from check:openings)
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const transpile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const load = async path => import('data:text/javascript;base64,' + Buffer.from(transpile(await readFile(path, 'utf8'))).toString('base64'));
const P = await load('src/dna-plan.ts');
const { ENDGAMES } = await load('src/endgames.ts');
const { openings } = await import('../data/repertoire/index.js');
let passed = 0;
const ok = name => { passed += 1; console.log('PASS ' + name); };

// ---- matching DNA opening names (as src/game-archive.ts writes them) to repertoire ids ----
const id = name => P.matchOpening(name, openings)?.id ?? null;
assert.equal(id('Queens Gambit Declined Chigorin Defense 3.Nf3'), 'queen-s-gambit-declined');
assert.equal(id("Queen's Gambit"), 'qg');
assert.equal(id('Alekhines Defense Scandinavian Variation'), 'alekhine-defense');
assert.equal(id('Scandinavian Defense Mieses Kotrc Variation 3.Nc3'), 'scandinavian-defense');
assert.equal(id('Italian Game: Two Knights Defense'), 'italian');
assert.equal(id('French Defense Knight Variation'), 'french');
assert.equal(id('Grunfeld Defense Exchange'), 'grunfeld-defense');
assert.equal(id('Petrovs Defense'), 'petrov-defense');
assert.equal(id('Kings Pawn Opening Kings Knight Variation'), null);
assert.equal(id('פתיחה לא זוהתה'), null);
assert.equal(id(''), null);
assert.equal(id('Italiano'), null, 'a prefix must end on a word boundary');
ok('opening names map to repertoire ids by longest word prefix (apostrophes, accents, "Defence" handled); unknown = null');

// ---- a hand-made report: White player, Italian is the problem, Scandinavian is faced as White ----
const game = (opening, playerColor, result, accuracy, userMoves = 30) => ({ opening, playerColor, result, accuracy, userMoves });
const report = (games, extra = {}) => ({ timeControls: { blitz: { userMoves: 1000, classificationCounts: { blunder: 30, miss: 12 }, clock: { clockedUserMoves: 1000, lowTimeMoves: 80 }, games, ...extra } } });
const italian = [
  game('Italian Game Two Knights Defense', 'white', '0-1', 60), game('Italian Game Two Knights Defense', 'white', '0-1', 58),
  game('Italian Game Giuoco Piano', 'white', '0-1', 70), game('Italian Game', 'white', '0-1', 65),
  game('Italian Game', 'white', '1-0', 80), game('Italian Game', 'white', '1/2-1/2', 75),
];
const scandi = [game('Scandinavian Defense', 'white', '1-0', 85), game('Scandinavian Defense', 'white', '0-1', 72), game('Scandinavian Defense', 'white', '1-0', 88)];
const plan = P.buildDnaPlan({ report: report([...scandi, ...italian]), openings, endgames: ENDGAMES });
assert.equal(plan.personalised, true);
assert.equal(plan.games, 9);
const openingsInPlan = plan.steps.filter(s => s.kind === 'opening');
assert.deepEqual(openingsInPlan.map(s => [s.openingId, s.role, s.games, s.losses]), [['italian', 'play', 6, 4], ['scandinavian-defense', 'face', 3, 1]]);
assert.equal(openingsInPlan[0].averageAccuracy, 68);
assert.equal(openingsInPlan[0].reason.en, 'You played the Italian Game in 6 games and lost 4 (67%, 68% accuracy).');
assert.equal(openingsInPlan[1].reason.en, 'Opponents played the Scandinavian Defense against you in 3 games; you lost 1 (33%, 81.7% accuracy).');
assert.ok(openingsInPlan.every(s => s.reason.he && /[\u0590-\u05ff]/.test(s.reason.he)), 'every reason has a Hebrew sentence');
ok('openings ranked by damage (losses + games × (1 − accuracy)); role play/face by colour; exact reasons');

const italianOpening = openings.find(o => o.id === 'italian');
assert.ok(openingsInPlan[0].lineIds.slice(0, 2).every(l => /two knights/i.test(italianOpening.lines.find(line => line.id === l).name)), 'the variation the player meets (Two Knights) comes first: ' + openingsInPlan[0].lineIds);
assert.equal(openingsInPlan[0].lineIds.length, 2);
const italianIds = new Set(openings.find(o => o.id === 'italian').lines.map(l => l.id));
assert.ok(openingsInPlan[0].lineIds.every(l => italianIds.has(l)));
assert.deepEqual(P.pickLines(openings.find(o => o.id === 'italian'), [], 1), [openings.find(o => o.id === 'italian').lines.find(l => l.star)?.id ?? openings.find(o => o.id === 'italian').lines[0].id]);
ok('lines: variation words first, then starred, then file order; only ids of that opening');

// ---- endgames ----
assert.deepEqual(plan.steps.filter(s => s.kind === 'endgame').map(s => s.endgameId), ['kq-k', 'kr-k', 'kp-k-win'], 'short games: technique first');
assert.equal(plan.steps.find(s => s.kind === 'endgame').reason.en, 'You missed a win 1.2 times per 100 moves: converting a won ending turns those into points.');
assert.equal(plan.focus, 'openings');
assert.deepEqual(plan.steps.map(s => s.kind), ['opening', 'endgame', 'opening', 'endgame', 'endgame']);
assert.deepEqual(plan.signals, { blundersPer100: 3, missesPer100: 1.2, lowTimePer100: 8, longGameLosses: 0, longGames: 0 });
const longLosses = [...italian.slice(0, 2), ...Array.from({ length: 5 }, () => game('Kings Pawn Opening', 'white', '0-1', 70, 55)), game('Kings Pawn Opening', 'white', '1-0', 80, 60)];
const defend = P.buildDnaPlan({ report: report(longLosses), openings, endgames: ENDGAMES });
assert.deepEqual(defend.signals.longGames, 6); assert.equal(defend.signals.longGameLosses, 5);
assert.equal(defend.steps[0].kind, 'endgame'); assert.equal(defend.steps[0].endgameId, 'philidor');
assert.equal(defend.focus, 'endgames');
assert.equal(defend.steps[0].reason.en, 'You lost 5 of 6 long games (40+ of your moves): holding a worse ending saves points.');
ok('endgames: technique first by default, defence first and focus=endgames when most long games are lost');

// ---- too few games: default order, says so ----
const few = P.buildDnaPlan({ report: report(italian.slice(0, 3)), openings, endgames: ENDGAMES });
assert.equal(few.personalised, false); assert.equal(few.focus, 'balanced');
assert.deepEqual(few.steps.filter(s => s.kind === 'endgame').map(s => s.endgameId), ['kq-k', 'kr-k', 'kp-k-win']);
assert.ok(few.steps.filter(s => s.kind === 'endgame').every(s => s.reason.en.startsWith('A core endgame')));
assert.equal(few.steps.some(s => s.kind === 'opening'), false, 'no opening is diagnosed from 3 games');
assert.equal(few.next.kind, 'endgame');
const empty = P.buildDnaPlan({ report: null, openings, endgames: ENDGAMES });
assert.equal(empty.games, 0); assert.equal(empty.personalised, false); assert.equal(empty.next?.kind, 'endgame');
assert.deepEqual(empty.signals, { blundersPer100: null, missesPer100: null, lowTimePer100: null, longGameLosses: 0, longGames: 0 });
ok(`fewer than ${P.DNA_PLAN_MIN_GAMES} games or no report: default order, personalised=false, no invented numbers`);

// ---- progress and "do this next" ----
assert.deepEqual(plan.next, plan.steps[0]);
const firstLines = openingsInPlan[0].lineIds.map(l => 'italian:' + l);
const after1 = P.buildDnaPlan({ report: report([...scandi, ...italian]), openings, endgames: ENDGAMES, progress: { openingLines: firstLines } });
assert.deepEqual(after1.steps.filter(s => s.kind === 'opening').map(s => s.openingId), ['scandinavian-defense', 'italian'], 'a finished opening moves behind unfinished ones');
assert.equal(after1.next.kind, 'opening'); assert.equal(after1.next.openingId, 'scandinavian-defense');
const after2 = P.buildDnaPlan({ report: report([...scandi, ...italian]), openings, endgames: ENDGAMES, progress: { openingLines: firstLines, endgames: ['kq-k'] } });
assert.equal(after2.steps.filter(s => s.kind === 'endgame').map(s => s.endgameId).join(), 'kr-k,kp-k-win,lucena', 'finished lessons move behind unfinished ones');
const capped = P.buildDnaPlan({ report: report([...scandi, ...italian]), openings, endgames: ENDGAMES, maxOpenings: 1, progress: { openingLines: firstLines } });
assert.deepEqual(capped.steps.filter(s => s.kind === 'opening').map(s => s.openingId), ['scandinavian-defense'], 'the cap keeps unfinished work, not finished work');
const allDone = P.buildDnaPlan({ report: null, openings, endgames: ENDGAMES, progress: { endgames: ENDGAMES.map(e => e.id) } });
assert.equal(allDone.next, null);
assert.equal(P.buildDnaPlan({ report: report([...scandi, ...italian]), openings, endgames: ENDGAMES, progress: { openingLines: openingsInPlan[0].lineIds } }).next.openingId, 'italian', 'line progress must be qualified "openingId:lineId"');
ok('next = first unfinished step; finished endgames move back; everything done = null');


// ---- review follow-ups: Black results, the accuracy term, missing accuracy, messy strings, limits, frequency ----
const asBlack = P.buildDnaPlan({ report: report([
  game('Scandinavian Defense', 'black', '1-0', 70), game('Scandinavian Defense', 'black', '0-1', 80), game('Scandinavian Defense', 'black', '1/2-1/2', 75),
  game('Italian Game', 'black', '0-1', 90), game('Italian Game', 'black', '1-0', 60),
]), openings, endgames: ENDGAMES });
assert.deepEqual(asBlack.steps.filter(s => s.kind === 'opening').map(s => [s.openingId, s.role, s.games, s.losses]).sort(), [['italian', 'face', 2, 1], ['scandinavian-defense', 'play', 3, 1]].sort());
ok('Black: "1-0" is a loss, "0-1" a win; Black openings are "play", White openings "face"');

// A: 1 loss in 2 games at 95% (weight 1 + 2×0.05 = 1.1). B: 0 losses in 8 games at 70% (weight 8×0.3 = 2.4). B first.
const byAccuracy = P.buildDnaPlan({ report: report([
  game('French Defense', 'white', '0-1', 95), game('French Defense', 'white', '1-0', 95),
  ...Array.from({ length: 8 }, () => game('Caro Kann Defense', 'white', '1-0', 70)),
]), openings, endgames: ENDGAMES });
const caro = P.matchOpening('Caro Kann Defense', openings);
assert.ok(caro, 'Caro-Kann must match');
assert.deepEqual(byAccuracy.steps.filter(s => s.kind === 'opening').map(s => s.openingId), [caro.id, 'french'], 'the accuracy term decides, not losses alone');
const noAccuracy = P.buildDnaPlan({ report: report([
  game('French Defense', 'white', '0-1', 95),
  ...Array.from({ length: 8 }, () => game('Petrovs Defense', 'white', '1-0', null)),
  ...Array.from({ length: 2 }, () => game('Petrovs Defense', 'white', '1-0', '')),
]), openings, endgames: ENDGAMES });
const petrov = noAccuracy.steps.find(s => s.kind === 'opening' && s.openingId === 'petrov-defense');
assert.equal(petrov.averageAccuracy, null, 'null and "" are no accuracy, not 0%');
assert.equal(noAccuracy.steps.find(s => s.kind === 'opening').openingId, 'french', 'an opening with no losses and no accuracy data does not outrank a real loss');
ok('ranking: the accuracy term can outrank a loss; missing accuracy (null, "") adds nothing and reads as null');

const messy = P.buildDnaPlan({ report: report([...italian.map(g => ({ ...g, playerColor: ' White ', result: g.result + ' ' }))]), openings, endgames: ENDGAMES });
assert.deepEqual(messy.steps.filter(s => s.kind === 'opening').map(s => [s.openingId, s.losses]), [['italian', 4]]);
for (const bad of [NaN, Infinity, -2]) assert.equal(P.buildDnaPlan({ report: report(italian), openings, endgames: ENDGAMES, maxOpenings: bad }).steps.filter(s => s.kind === 'opening').length, bad === -2 ? 0 : 1);
assert.equal(P.buildDnaPlan({ report: null, openings, endgames: ENDGAMES, maxEndgames: 2.9 }).steps.length, 2);
ok('colour/result with spaces or capitals still count; limits: NaN/Infinity = default, negative = 0, fractions floor');

const ruy = openings.find(o => o.id === 'ruylopez');
const often = ruy.lines.find(l => /berlin/i.test(l.name || ''));
const once = ruy.lines.find(l => /marshall/i.test(l.name || ''));
assert.ok(often && once, 'Ruy Lopez has Berlin and Marshall lines');
assert.equal(P.pickLines(ruy, ['Ruy Lopez Berlin', 'Ruy Lopez Berlin', 'Ruy Lopez Berlin', 'Ruy Lopez Marshall'], 1)[0], often.id);
assert.equal(P.pickLines(ruy, ['Ruy Lopez Marshall', 'Ruy Lopez Marshall', 'Ruy Lopez Berlin'], 1)[0], once.id);
const dup = [{ id: 'b-dup', name: 'Same Name', color: 'w', lines: [] }, { id: 'a-dup', name: 'Same Name', color: 'w', lines: [] }];
assert.equal(P.matchOpening('Same Name Variation', dup).id, 'a-dup'); assert.equal(P.matchOpening('Same Name Variation', [...dup].reverse()).id, 'a-dup');
ok('lines: a variation met in more games wins; equal repertoire names resolve by id, whatever the order');

// ---- time class filter ----
const split = { timeControls: { blitz: { userMoves: 500, classificationCounts: { blunder: 50, miss: 5 }, clock: { clockedUserMoves: 500, lowTimeMoves: 100 }, games: italian }, rapid: { userMoves: 400, classificationCounts: { blunder: 4, miss: 2 }, clock: { clockedUserMoves: 200, lowTimeMoves: 2 }, games: [...scandi, ...scandi] } } };
assert.deepEqual(P.buildDnaPlan({ report: split, openings, endgames: ENDGAMES, timeClass: 'rapid' }).steps.filter(s => s.kind === 'opening').map(s => s.openingId), ['scandinavian-defense']);
assert.equal(P.buildDnaPlan({ report: split, openings, endgames: ENDGAMES, timeClass: 'rapid' }).games, 6);
assert.deepEqual(P.buildDnaPlan({ report: split, openings, endgames: ENDGAMES, timeClass: 'rapid' }).signals, { blundersPer100: 1, missesPer100: 0.5, lowTimePer100: 1, longGameLosses: 0, longGames: 0 });
assert.deepEqual(P.buildDnaPlan({ report: split, openings, endgames: ENDGAMES }).signals, { blundersPer100: 6, missesPer100: 0.8, lowTimePer100: 14.6, longGameLosses: 0, longGames: 0 });
ok('timeClass limits the plan and its signals to that time control; without it all are summed');

// ---- property: 500 random reports — deterministic, order-independent, only existing content ids, input untouched ----
let seed = 20261110;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
const pick = list => list[Math.floor(rnd() * list.length)];
const names = [...openings.slice(0, 40).map(o => o.name + ' ' + pick(['', 'Main Line', 'Exchange Variation', 'Two Knights'])), 'Kings Pawn Opening', 'פתיחה לא זוהתה', ''];
const endgameIds = new Set(ENDGAMES.map(e => e.id));
for (let i = 0; i < 500; i += 1) {
  const games = Array.from({ length: Math.floor(rnd() * 30) }, () => game(pick(names), pick(['white', 'black', 'nobody']), pick(['1-0', '0-1', '1/2-1/2', '*', 'loss']), Math.round(rnd() * 1000) / 10, Math.floor(rnd() * 80)));
  const input = { report: { timeControls: { blitz: { userMoves: Math.floor(rnd() * 2000), classificationCounts: { blunder: Math.floor(rnd() * 50), miss: Math.floor(rnd() * 20) }, games } } }, openings, endgames: ENDGAMES };
  const frozen = JSON.stringify(input.report);
  const a = P.buildDnaPlan(input);
  const b = P.buildDnaPlan({ ...input, report: { timeControls: { blitz: { ...input.report.timeControls.blitz, games: [...games].reverse() } } } });
  assert.equal(JSON.stringify(input.report), frozen, 'input mutated');
  assert.deepEqual(a, b, 'order of games changed the plan');
  assert.deepEqual(a, P.buildDnaPlan(input), 'not deterministic');
  assert.ok(a.steps.filter(s => s.kind === 'opening').length <= 3 && a.steps.filter(s => s.kind === 'endgame').length <= 3);
  for (const step of a.steps) {
    if (step.kind === 'endgame') { assert.ok(endgameIds.has(step.endgameId)); continue; }
    const opening = openings.find(o => o.id === step.openingId);
    assert.ok(opening, 'unknown opening id ' + step.openingId);
    assert.ok(step.lineIds.every(l => opening.lines.some(line => line.id === l)), 'unknown line id');
    assert.ok(step.losses <= step.games && step.reason.en && step.reason.he);
  }
  assert.ok(a.next === null || a.steps.includes(a.next));
}
ok('500 random reports: deterministic, independent of game order, only existing opening/line/endgame ids, input not mutated');

console.log(`dna-plan: ${passed} checks passed`);
