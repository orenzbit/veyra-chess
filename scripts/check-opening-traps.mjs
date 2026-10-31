// Check of the opening-trap data and matcher (src/opening-traps.ts, src/opening-trap-card.ts).
// Verifies: every trap line replays legally with the site's rules engine and stored SAN is canonical; the lines the
// plan marks MATE end in checkmate (and no others do); victimPly is in range and victim colour is the side that played it;
// matchTrap positive/negative cases incl. annotated SAN and near-miss prefixes; HE and EN strings exist for every trap.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from '../rules-src/chess-compat.mjs';
import { OPENING_TRAPS, matchTrap, normalizeSan } from '../src/opening-traps.ts';

const MATE_IDS = new Set(['fools-mate', 'scholars-mate', 'queen-sac-knight-mate', 'shilling-gambit', 'englund-gambit-trap', 'morra-queen-trap', 'budapest-smothered']);
const CHECK_IDS = new Set(['albin-knight-promotion', 'berlin-queen-fork']);
const EXPECTED_IDS = ['fools-mate', 'scholars-mate', 'queen-sac-knight-mate', 'shilling-gambit', 'elephant-trap', 'englund-gambit-trap', 'albin-knight-promotion', 'noahs-ark', 'morra-queen-trap', 'fishing-pole', 'berlin-queen-fork', 'budapest-smothered', 'sicilian-f7-queen'];

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log(`ok - ${name}`); }
  catch (error) { console.error(`FAIL - ${name}\n  ${error.message}`); process.exitCode = 1; }
}

test('exactly the 13 planned traps, unique ids', () => {
  assert.deepEqual(OPENING_TRAPS.map(trap => trap.id), EXPECTED_IDS);
  assert.equal(new Set(OPENING_TRAPS.map(trap => trap.id)).size, OPENING_TRAPS.length);
});

for (const trap of OPENING_TRAPS) {
  test(`${trap.id}: legal canonical line, victim ply and colour`, () => {
    const chess = new Chess();
    trap.moves.forEach((san, index) => {
      const move = chess.move(san);
      assert.ok(move, `ply ${index + 1} ${san} is illegal`);
      assert.equal(move.san, san, `ply ${index + 1} stored as ${san} but canonical SAN is ${move.san}`);
    });
    assert.equal(chess.isCheckmate(), MATE_IDS.has(trap.id), `${trap.id} checkmate flag`);
    if (CHECK_IDS.has(trap.id)) assert.ok(chess.isCheck() && !chess.isCheckmate(), `${trap.id} should end in check`);
    assert.ok(Number.isInteger(trap.victimPly) && trap.victimPly >= 1 && trap.victimPly <= trap.moves.length, 'victimPly in range');
    assert.equal(trap.victim, trap.victimPly % 2 === 1 ? 'w' : 'b', 'victim colour is the side that played victimPly');
    const replay = new Chess();
    trap.moves.slice(0, trap.victimPly - 1).forEach(san => replay.move(san));
    assert.equal(replay.turn(), trap.victim, 'victim is to move before the victim ply');
  });

  test(`${trap.id}: Hebrew and English strings`, () => {
    for (const field of ['opening', 'name', 'explanation', 'punishment']) {
      for (const lang of ['he', 'en']) {
        assert.ok(typeof trap[field]?.[lang] === 'string' && trap[field][lang].trim().length > 0, `${field}.${lang} missing`);
      }
      assert.match(trap[field].he, /[\u0590-\u05FF]/, `${field}.he has Hebrew text`);
      assert.doesNotMatch(trap[field].en, /[\u0590-\u05FF]/, `${field}.en is English`);
    }
  });
}

test('normalizeSan strips + # ! ?', () => {
  assert.equal(normalizeSan('Nf6?!'), 'Nf6');
  assert.equal(normalizeSan('Qxf7#'), 'Qxf7');
  assert.equal(normalizeSan('Bxf7+!!'), 'Bxf7');
  assert.equal(normalizeSan('0-0'), 'O-O');
});

test('matchTrap: full line, victim ply and beyond match', () => {
  for (const trap of OPENING_TRAPS) {
    const atVictim = matchTrap(trap.moves.slice(0, trap.victimPly));
    assert.ok(atVictim && atVictim.reached, `${trap.id} reached at victim ply`);
    assert.equal(atVictim.trap.victimPly, trap.victimPly);
    const full = matchTrap(trap.moves);
    assert.ok(full && full.reached && full.trap.id === atVictim.trap.id, `${trap.id} full line`);
    const longer = matchTrap([...trap.moves, 'a3']);
    assert.ok(longer && longer.reached, `${trap.id} continues past the line`);
  }
});

test('matchTrap: annotated SAN matches', () => {
  const scholars = ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6?!', 'Qxf7#'];
  const m = matchTrap(scholars);
  assert.equal(m.trap.id, 'scholars-mate');
  assert.equal(m.reached, true);
  const annotated = matchTrap(['e4!', 'e5', 'Bc4', 'Nc6', 'Qh5?', 'Nf6??']);
  assert.equal(annotated.trap.id, 'scholars-mate');
  assert.equal(annotated.reached, true);
  assert.equal(matchTrap(['f3', 'e5', 'g4+', 'Qh4#']).trap.id, 'fools-mate');
});

test('matchTrap: history before the victim ply is not reached', () => {
  const before = matchTrap(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5']);
  assert.ok(before && before.trap.id === 'scholars-mate' && before.reached === false);
  assert.equal(matchTrap(['f3', 'e5']).reached, false);
});

test('matchTrap: negatives and near-miss prefixes', () => {
  assert.equal(matchTrap([]), null);
  assert.equal(matchTrap(['d4', 'd5', 'c4', 'c6']), null);
  assert.equal(matchTrap(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'g6']), null);
  assert.equal(matchTrap(['e4', 'e5', 'Bc4', 'Nc6', 'Qe2', 'Nf6']), null);
  // near miss: one move off at the very last compared ply, and swapped move order
  assert.equal(matchTrap(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf3']), null);
  assert.equal(matchTrap(['e4', 'e5', 'Nc6', 'Bc4', 'Qh5', 'Nf6']), null);
  // the victim ply of the Berlin line is 9; changing ply 9 breaks it
  assert.equal(matchTrap(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'd3', 'Ne7', 'Nc3']), null);
  assert.equal(matchTrap(null), null);
});

test('matchTrap: longest prefix wins when several traps match', () => {
  const scholars = OPENING_TRAPS.find(trap => trap.id === 'scholars-mate');
  const shorter = { ...scholars, id: 'temp-shorter', victimPly: 4, victim: 'b' };
  const index = OPENING_TRAPS.push(shorter) - 1;
  try {
    assert.equal(matchTrap(scholars.moves.slice(0, 6)).trap.id, 'scholars-mate', 'later victim ply wins among reached');
    assert.equal(matchTrap(scholars.moves.slice(0, 4)).trap.id, 'temp-shorter', 'reached trap beats a pending one');
    assert.equal(matchTrap(scholars.moves.slice(0, 4)).reached, true);
  } finally { OPENING_TRAPS.splice(index, 1); }
  assert.equal(matchTrap(scholars.moves.slice(0, 4)).reached, false, 'temporary trap removed');
  const shared = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6'];
  assert.equal(matchTrap(shared).reached, false);
});

test('UI wiring: main.ts hooks and CSS exist', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  for (const needle of ["from './opening-trap-card.js'", 'trapMoveMark(history,i)', 'h(OpeningTrapCard,{history,selected})', 'noteTrapMove(mv.san)', 'noteTrapMove(applied.san)', 'h(OpeningTrapBanner,']) {
    assert.ok(main.includes(needle), `main.ts missing ${needle}`);
  }
  const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
  for (const selector of ['.trap-mark', '.trap-card', '.trap-banner']) assert.ok(css.includes(selector), `styles.css missing ${selector}`);
  const card = readFileSync(new URL('../src/opening-trap-card.ts', import.meta.url), 'utf8');
  for (const text of ['מלכודת פתיחה / Opening trap', 'נפלת במלכודת', 'You walked into a trap', 'הבוט נפל במלכודת', 'The bot fell into a trap', 'look for the punishment', 'חפש את העונש']) {
    assert.ok(card.includes(text), `opening-trap-card.ts missing "${text}"`);
  }
});

console.log(`${passed} checks passed`);
if (process.exitCode) console.error('opening-traps check FAILED');
