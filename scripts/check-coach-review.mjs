// The coach's review: npm run check:coach-review (also run from check:review-determinism).
// What the player did WELL on a strong move (coach-good.ts): the category, the move, the square and the piece, and
// why it was good, with the engine's line after the move as the evidence. Each fixture is a real position from
// orenzbit's own games in this repo (one is built, and says so) and the move he played; the review's own
// classification and the engine worker's line are computed exactly as game review does, and the category and both
// sentences are asserted. Then the look-ahead (coach-lookahead.ts): a 6-ply line with its Hebrew captions, the line
// continued to 8 plies with its time measured, and the review summary (3 best moves, 3 biggest mistakes).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Chess } from '../rules-src/chess-compat.mjs';
import { engineLine, lineSteps } from '../src/coach-explain.ts';
import { analyzeGameMoves } from '../src/review-metrics.ts';
import { diagnoseGood, goodCandidate, summarizeReview, GOOD_CLASSES, GOOD_LABEL } from '../src/coach-good.ts';
import { GOOD_WHAT, GOOD_WHY } from '../src/coach-good-he.ts';
import { extendLine, lookaheadLine, LOOKAHEAD_PLIES } from '../src/coach-lookahead.ts';
import { summarizeGame } from '../src/coach-words.ts';

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed += 1; console.log(`ok - ${name}`); } catch (error) { console.error(`FAIL - ${name}\n  ${error.message}`); process.exitCode = 1; }
}

async function loadWorker() {
  const wasm = readFileSync('public/vendor/chessy-ai-fast.wasm'); const loader = readFileSync('public/vendor/wasm-engine.js', 'utf8');
  const source = readFileSync('public/engine-worker.js', 'utf8'); const messages = []; let ok, bad; const ready = new Promise((a, b) => { ok = a; bad = b; });
  let context;
  const sandbox = { console, WebAssembly, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, DataView, BigInt, performance, setTimeout, clearTimeout,
    fetch: async () => ({ arrayBuffer: async () => wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) }),
    postMessage: m => { if (m === 'ready') ok(); else if (m?.type === 'boot-error') bad(new Error(m.error)); else messages.push(m); },
    importScripts: () => vm.runInContext(loader, context) };
  sandbox.self = sandbox; context = vm.createContext(sandbox); vm.runInContext(source, context); await ready;
  let n = 0;
  return async (req) => { messages.length = 0; const id = 'r' + (++n); await context.self.onmessage({ data: { id, ...req } }); const r = messages.find(m => m && m.id === id); if (!r) throw new Error('no response'); if (r.error) throw new Error(r.error); return r.result; };
}
const ask = await loadWorker();

// The review's own classification for the move (analyzeGameMoves, the same code game review runs), then the
// opponent's best line after it from the engine worker.
async function goodAt(fen, uci, previous = null, variant = 0) {
  const c = new Chess(fen); const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  assert.ok(mv, `${uci} is legal in ${fen}`);
  const history = [{ from: mv.from, to: mv.to, san: mv.san, promotion: mv.promotion || null, captured: mv.captured || null, before: fen }];
  const [a] = await analyzeGameMoves(history, { Chess, openingLines: new Set(), analyzePosition: (f, af, m, cb, alt) => ask({ fen: f, afterFen: af, mover: { from: m.from, to: m.to, promotion: m.promotion || null }, cachedBefore: cb, alternatives: alt }) });
  const replyLine = c.isGameOver() ? [] : await engineLine(Chess, c.fen(), ask);
  const me = fen.split(' ')[1];
  const input = { fenBefore: fen, played: { from: mv.from, to: mv.to, promotion: mv.promotion }, classification: a.classification,
    moverChanceBest: me === 'w' ? a.whiteChanceBest : 100 - a.whiteChanceBest, moverChanceAfter: me === 'w' ? a.whiteChanceAfter : 100 - a.whiteChanceAfter,
    afterScore: a.afterScore, moverSecondBestChance: a.moverSecondBestChance ?? null, sacrificed: a.sacrifice?.material ?? null, replyLine, previous, variant };
  return { d: diagnoseGood(Chess, input), a, replyLine, input };
}

const FIXTURES = [
 {
  "expect": "best_move.brilliant",
  "source": "orenzbit-2026-09.pgn game 45, ply 43",
  "fen": "r3k1nr/p5pp/8/1N6/4q3/8/1P2R3/R3K3 b Qkq - 1 22",
  "move": "e4e2",
  "previous": {
   "to": "e2",
   "captured": null
  },
  "text": [
   "ב-22...Qxe2+ הקרבת את המלכה, וזה מהלך מבריק.",
   "גם בלי החומר, המנוע מעריך את העמדה כיתרון גדול שלך. השורה שלו: Qxe2+ Kxe2 Kf7 Nd6+."
  ]
 },
 {
  "expect": "best_move.only",
  "source": "orenzbit-2026-10.pgn game 14, ply 36",
  "fen": "r3k3/ppp3pp/2n5/2Q5/3P2n1/8/P4PqP/RNB1K2R w KQ - 1 19",
  "move": "h1f1",
  "previous": {
   "to": "g2",
   "captured": null
  },
  "text": [
   "ב-19.Rf1 מצאת את המהלך היחיד ששומר על העמדה.",
   "לפי הבדיקה של המנוע, המהלך החלופי הכי טוב היה מוריד לך 28% מסיכויי הניצחון. השורה: Rf1 Qe4+ Kd2 Qxd4+ Qxd4."
  ]
 },
 {
  "expect": "defended.mate",
  "source": "orenzbit-2026-09.pgn game 4, ply 27",
  "fen": "r1b2k1r/ppp3pp/2nb1N2/5pNB/3P4/8/PPP2PPP/R1B1R1K1 b - - 0 14",
  "move": "g7f6",
  "previous": {
   "to": "f6",
   "captured": "n"
  },
  "text": [
   "ב-14...gxf6 עצרת איום מט: היריב איים לשחק Re8#.",
   "אחרי המהלך שלך אין ליריב מט במהלך אחד. השורה של המנוע: gxf6 Nf7 Rg8 Nxd6."
  ]
 },
 {
  "expect": "defended.piece",
  "source": "orenzbit-2026-09.pgn game 22, ply 8",
  "fen": "rn1qkb1r/ppp1nppp/3pb3/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R w KQkq - 4 5",
  "move": "g5e6",
  "previous": {
   "to": "e6",
   "captured": null
  },
  "text": [
   "ב-5.Nxe6 ראית שהרץ ב-c4 מותקף, ולקחת את הכלי שאיים עליו.",
   "אחרי המהלך שלך ליריב אין דרך לזכות בחומר. השורה של המנוע: Nxe6 fxe6 Bxe6 Nec6."
  ]
 },
 {
  "expect": "endgame_technique.king",
  "source": "orenzbit-2026-10.pgn game 48, ply 64",
  "fen": "4r3/2RRb3/4rkpp/4p3/8/5P2/7P/6K1 w - - 1 33",
  "move": "g1f2",
  "previous": {
   "to": "f6",
   "captured": null
  },
  "text": [
   "בסיום המלך הוא כלי לוחם, וב-33.Kf2 הבאת אותו קדימה, מ-g1 ל-f2.",
   "המנוע מסכים שזה המהלך הנכון, ומעריך את העמדה כקשה. ההמשך: Kf2 Rb6 Ke3 Rb2."
  ]
 },
 {
  "expect": "endgame_technique.rook_behind",
  "source": "orenzbit-2026-10.pgn game 48, ply 82",
  "fen": "4r3/3kb3/7p/4R3/5K2/7p/8/8 w - - 0 42",
  "move": "e5h5",
  "previous": {
   "to": "d7",
   "captured": "r"
  },
  "text": [
   "ב-42.Rh5 העמדת את הצריח ב-h5 מאחורי הרגלי החופשי ב-h3, בדיוק לפי הכלל.",
   "המנוע מסכים שזה המהלך הנכון, ומעריך את העמדה כקשה. ההמשך: Rh5 Bd6+ Kf3 h2 Rxh6."
  ]
 },
 {
  "expect": "fork",
  "source": "orenzbit-2026-09.pgn game 27, ply 38",
  "fen": "4r3/ppk3p1/4pn2/n1b1p1p1/4P1P1/2P2P2/PP2K2P/3R3R w - - 1 20",
  "move": "b2b4",
  "previous": {
   "to": "a5",
   "captured": null
  },
  "text": [
   "ב-20.b4 עשית מזלג עם הרגלי ב-b4: הוא תוקף גם את הפרש ב-a5 וגם את הרץ ב-c5.",
   "היריב לא יכול להציל את החומר: בשורה של המנוע (b4 Bb6 bxa5 Bxa5 Rc1 Rd8) אתה מרוויח 2 נקודות חומר."
  ]
 },
 {
  "expect": "fork.check",
  "source": "orenzbit-2026-08.pgn game 14, ply 13",
  "fen": "r1bq1b2/pp1kp1pB/3p4/2p5/3nP3/8/PPPP1PPP/RNB1K1NR b KQ - 0 7",
  "move": "d4c2",
  "previous": {
   "to": "h7",
   "captured": "p"
  },
  "text": [
   "ב-7...Nxc2+ הפרש ב-c2 נותן שח, ובאותו זמן תוקף את הצריח ב-a1.",
   "היריב לא יכול להציל את החומר: בשורה של המנוע (Nxc2+ Kd1 Nxa1 Nc3 Kc6 Bg6) אתה מרוויח 6 נקודות חומר."
  ]
 },
 {
  "expect": "good_trade",
  "source": "orenzbit-2026-08.pgn game 25, ply 48",
  "fen": "7r/3NR1pp/5nk1/1q3p2/8/1P1P4/2P1QPPP/BN4K1 w - - 0 25",
  "move": "d7f6",
  "previous": {
   "to": "b5",
   "captured": "p"
  },
  "text": [
   "ב-25.Nxf6 החלפת כלים כשאתה ביתרון של 9 נקודות חומר. כל חילוף כזה מקרב אותך לסיום מנצח.",
   "החומר נשאר לטובתך, והמנוע מעריך את העמדה כמנצחת. השורה: Nxf6 gxf6 Qe6."
  ]
 },
 {
  "expect": "good_trade.queens",
  "source": "orenzbit-2026-10.pgn game 57, ply 32",
  "fen": "r1b1k2r/ppp1bp2/8/3P3p/3P1p1q/2PB2Q1/PP1N3P/R1B2RK1 w kq - 0 17",
  "move": "g3h4",
  "previous": {
   "to": "f4",
   "captured": null
  },
  "text": [
   "ב-17.Qxh4 הורדת את המלכות מהלוח כשאתה ביתרון של 3 נקודות חומר.",
   "החומר נשאר לטובתך, והמנוע מעריך את העמדה כיתרון גדול שלך. השורה: Qxh4 Bxh4 Rxf4."
  ]
 },
 {
  "expect": "mate_found.line",
  "source": "orenzbit-2026-10.pgn game 15, ply 75",
  "fen": "8/1k2pp1p/1q6/p7/8/8/K7/8 b - - 1 38",
  "move": "a5a4",
  "previous": {
   "to": "a2",
   "captured": null
  },
  "text": [
   "ב-38...a4 מצאת את הדרך למט: מכאן היריב כבר לא יכול להציל את המלך.",
   "השורה של המנוע: a4 Ka1 a3 Ka2 Qb2#. היריב לא יכול לעצור את המט."
  ]
 },
 {
  "expect": "mate_found.mate",
  "source": "orenzbit-2026-10.pgn game 53, ply 76",
  "fen": "1Q6/2R5/8/k7/3P4/pP3P2/1P5P/2R3K1 w - - 2 39",
  "move": "c7a7",
  "previous": {
   "to": "a5",
   "captured": null
  },
  "text": [
   "ב-39.Ra7# נתת מט! הצריח ב-a7 סוגר את המלך של היריב, ואין לו לאן לברוח.",
   "המשחק נגמר: אין מהלך שמציל את המלך."
  ]
 },
 {
  "expect": "pawn_push.break",
  "source": "orenzbit-2026-10.pgn game 16, ply 5",
  "fen": "rnbqkbnr/pp1p1ppp/4p3/2p5/4P3/3B4/PPPP1PPP/RNBQK1NR b KQkq - 1 3",
  "move": "d7d5",
  "previous": {
   "to": "d3",
   "captured": null
  },
  "text": [
   "ב-3...d5 פרצת עם הרגלי ל-d5, ועכשיו הוא תוקף את הרגלי של היריב ב-e4.",
   "המנוע מסכים שזה המהלך הנכון, ומעריך את העמדה כשקולה. ההמשך: d5 c4 dxe4 Bxe4 Nf6."
  ]
 },
 {
  "expect": "pawn_push.passer",
  "source": "orenzbit-2026-09.pgn game 9, ply 88",
  "fen": "2r5/pk6/1p6/1R6/3K2P1/7P/8/8 w - - 7 45",
  "move": "g4g5",
  "previous": {
   "to": "b7",
   "captured": null
  },
  "text": [
   "ב-45.g5 דחפת את הרגלי החופשי ל-g5. נשארו לו 3 משבצות עד ההכתרה, ואף רגלי של היריב לא יכול לעצור אותו.",
   "המנוע מסכים שזה המהלך הנכון, ומעריך את העמדה כשקולה. ההמשך: g5 a5 Rf5 a4 g6."
  ]
 },
 {
  "expect": "pawn_push.promote",
  "source": "orenzbit-2026-05.pgn game 24, ply 85",
  "fen": "8/p1ppk3/b4r2/3K4/8/8/1p6/4q3 b - - 1 43",
  "move": "b2b1q",
  "previous": {
   "to": "d5",
   "captured": null
  },
  "text": [
   "ב-43...b1=Q הכתרת את הרגלי למלכה ב-b1.",
   "עכשיו יש לך מלכה חדשה על הלוח, והמנוע מעריך את העמדה כמנצחת."
  ]
 },
 {
  "expect": "pawn_push.to_queen",
  "source": "orenzbit-2026-08.pgn game 31, ply 63",
  "fen": "6nN/3k3p/K3p3/8/6p1/3P1q2/8/8 b - - 0 32",
  "move": "g4g3",
  "previous": {
   "to": "a6",
   "captured": "p"
  },
  "text": [
   "ב-32...g3 דחפת את הרגלי ל-g3, ובשורה של המנוע הוא מגיע עד ההכתרה.",
   "השורה של המנוע: g3 Kb5 g2 Kc5 g1=Q+."
  ]
 },
 {
  "expect": "pin.absolute",
  "source": "orenzbit-2026-09.pgn game 45, ply 53",
  "fen": "2k2r2/p6p/4Nn2/8/8/8/1P2K3/R7 b - - 2 27",
  "move": "f8e8",
  "previous": {
   "to": "e6",
   "captured": null
  },
  "text": [
   "ב-27...Re8 ריתקת את הפרש ב-e6 אל המלך: הוא לא יכול לזוז בכלל.",
   "היריב לא יכול להציל את החומר: בשורה של המנוע (Re8 Ra6 Kd7 Kd3 Rxe6 Rxa7+) אתה מרוויח 2 נקודות חומר."
  ]
 },
 {
  "expect": "skewer",
  "source": "orenzbit-2026-08.pgn game 31, ply 37",
  "fen": "2r1kbnr/Np3ppp/4p3/4q3/1B6/3PP3/P3NPPP/R2K3R b k - 3 19",
  "move": "e5a1",
  "previous": {
   "to": "a7",
   "captured": null
  },
  "text": [
   "ב-19...Qxa1+ עשית שיפוד: המלכה ב-a1 תוקפת את המלך, ומאחוריו עומד הצריח ב-h1.",
   "היריב לא יכול להציל את החומר: בשורה של המנוע (Qxa1+ Nc1 Rxc1+ Ke2 Rxh1 Kf3) אתה מרוויח 13 נקודות חומר."
  ]
 },
 {
  "expect": "won_material.capture",
  "source": "orenzbit-2026-07.pgn game 9, ply 25",
  "fen": "r1bqk2r/ppp2p2/2n4p/8/4P3/2P1b3/PP2B1PP/2RQK2R b Kkq - 1 13",
  "move": "e3c1",
  "previous": {
   "to": "e2",
   "captured": null
  },
  "text": [
   "ב-13...Bxc1 לקחת את הצריח ב-c1. היריב מחזיר חלק מהחומר, אבל אתה נשאר ביתרון.",
   "היריב לא יכול להציל את החומר: בשורה של המנוע (Bxc1 Qxc1 Qh4+ Kf1 Be6 Qe3) אתה מרוויח את האיכות (צריח תמורת כלי קל)."
  ]
 },
 {
  "expect": "won_material.free",
  "source": "orenzbit-2026-08.pgn game 31, ply 41",
  "fen": "2N1kbnr/1p3ppp/4p3/8/1B6/3PP3/P2KNPPP/7q b k - 0 21",
  "move": "f8b4",
  "previous": {
   "to": "c8",
   "captured": "r"
  },
  "text": [
   "ב-21...Bxb4+ לקחת את הרץ ב-b4, והיריב לא יכול להחזיר את החומר.",
   "היריב לא יכול להציל את החומר: בשורה של המנוע (Bxb4+ Kc2 Qe1 Nd4 Qc3+ Kb1) אתה מרוויח רץ."
  ]
 },
 {
  "expect": "won_material.later",
  "source": "orenzbit-2026-05.pgn game 24, ply 59",
  "fen": "8/p1ppk1p1/bp5p/7N/r7/3p4/8/3K4 b - - 1 30",
  "move": "a4a2",
  "previous": {
   "to": "h5",
   "captured": null
  },
  "text": [
   "אחרי 30...Ra2 השורה של המנוע זוכה בחומר: בהמשך אתה משחק Bxd3 ולוקח את הפרש ב-d3.",
   "היריב לא יכול להציל את החומר: בשורה של המנוע (Ra2 Nf4 Kd6 Nxd3 Bxd3 Kc1) אתה מרוויח 2 נקודות חומר."
  ]
 },
 {
  "expect": "won_material.line",
  "source": "orenzbit-2026-10.pgn game 42, ply 10",
  "fen": "rn2kbnr/pbpp1ppp/1p2p1q1/4P3/3P4/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 1 6",
  "move": "f3h4",
  "previous": {
   "to": "g6",
   "captured": null
  },
  "text": [
   "המהלך 6.Nh4 מכין לקיחה: אחרי Be7 אתה משחק Nxg6 ולוקח את המלכה ב-g6.",
   "היריב לא יכול להציל את החומר: בשורה של המנוע (Nh4 Be7 Nxg6 hxg6 d5 Rh4) אתה מרוויח 6 נקודות חומר."
  ]
 },
 {
  "expect": "endgame_technique.opposition",
  "source": "constructed position (no real example of the opposition in his games)",
  "fen": "8/8/4k3/8/8/3K4/4P3/8 w - - 0 1",
  "move": "d3e4",
  "previous": null,
  "text": [
   "ב-1.Ke4 תפסת אופוזיציה: המלכים ב-e4 וב-e6 עומדים זה מול זה עם משבצת אחת ביניהם, והיריב הוא שצריך לזוז.",
   "המנוע מסכים שזה המהלך הנכון, ומעריך את העמדה כיתרון גדול שלך. ההמשך: Ke4 Kf6 Kd5 Kf7."
  ]
 }
];

for (const f of FIXTURES) {
  await test(`${f.expect}: ${f.move} in ${f.source}`, async () => {
    const { d } = await goodAt(f.fen, f.move, f.previous);
    assert.ok(d, 'a good-move explanation');
    assert.equal(d.category + (d.sub ? '.' + d.sub : ''), f.expect);
    assert.deepEqual(d.text, f.text);
  });
}

const CATEGORIES = ['mate_found', 'best_move', 'won_material', 'fork', 'pin', 'skewer', 'defended', 'good_trade', 'pawn_push', 'endgame_technique'];
await test('every good-move category has a fixture, a label, and 2-3 variants per phrase', async () => {
  for (const c of CATEGORIES) {
    assert.ok(GOOD_LABEL[c], `label for ${c}`);
    assert.ok(FIXTURES.some(f => f.expect.split('.')[0] === c), `fixture for ${c}`);
  }
  for (const [k, v] of Object.entries(GOOD_WHAT)) assert.ok(v.length >= 2 && v.length <= 3, `${k} has ${v.length} variants`);
  for (const [k, v] of Object.entries(GOOD_WHY)) assert.ok(v.length >= 2 && v.length <= 3, `${k} has ${v.length} variants`);
});

await test('every variant fills with the same facts, and another variant says it differently', async () => {
  for (const f of FIXTURES.slice(0, 8)) {
    const { input } = await goodAt(f.fen, f.move, f.previous);
    const texts = [0, 1, 2].map(v => diagnoseGood(Chess, { ...input, variant: v }));
    for (const t of texts) { assert.ok(t); assert.equal(t.category, texts[0].category); assert.ok(!/\{\w+\}/.test(t.text.join(' '))); }
    assert.notEqual(texts[0].what, texts[1].what, `${f.expect} variants differ`);
  }
});

await test('agreement: the queen is feminine ("המלכה שלך תוקפת"), the knight masculine ("הפרש ... נותן")', async () => {
  const { d } = await goodAt('rnb1kbnr/p1pp1ppp/1p3q2/8/3Q4/4PN2/PPP2PPP/RNB1KB1R w KQkq - 0 5', 'd4e4');
  assert.equal(d.category, 'fork'); assert.match(d.what, /המלכה שלך תוקפת|המלכה ב-e4 נותנת|עם המלכה/);
  const fork = FIXTURES.find(f => f.expect === 'fork.check'); assert.match(fork.text[0], /הפרש ב-c2 נותן שח/);
});

await test('no praise without the engine line: the same fork with no line after it is not called a fork', async () => {
  const { input } = await goodAt('rnb1kbnr/p1pp1ppp/1p3q2/8/3Q4/4PN2/PPP2PPP/RNB1KB1R w KQkq - 0 5', 'd4e4');
  const d = diagnoseGood(Chess, { ...input, replyLine: [] });
  assert.ok(!d || d.category !== 'fork', 'a fork needs the line that wins the material');
  assert.ok(!d || !['won_material', 'pin', 'skewer'].includes(d.category));
});

await test('a recapture is counted net: taking back what the opponent just took is not "won material"', async () => {
  // 3...Nxd5 after 3.Nxd5 (his October game): the knight took a pawn, so the recapture wins a knight for a pawn (2 points), not a knight.
  const fen = 'rnbqkb1r/ppp1pppp/5n2/3N4/8/5N2/PPPPPPPP/R1BQKB1R b KQkq - 0 3';
  const { d } = await goodAt(fen, 'f6d5', { to: 'd5', captured: 'p' });
  assert.ok(d && d.category === 'won_material'); assert.match(d.why, /2 נקודות חומר/);
  const { d: d2 } = await goodAt(fen, 'f6d5', null); assert.match(d2.why, /פרש/);
});

await test('mistakes and plain moves are not praised', async () => {
  const { input } = await goodAt('rnb1kbnr/p1pp1ppp/1p3q2/8/3Q4/4PN2/PPP2PPP/RNB1KB1R w KQkq - 0 5', 'd4e4');
  for (const cls of ['inaccuracy', 'mistake', 'miss', 'blunder', 'good', 'book', 'forced']) assert.equal(diagnoseGood(Chess, { ...input, classification: cls }), null, cls);
  // A quiet developing move with no threat, no tactic and no endgame: no sentence.
  const { d } = await goodAt('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', 'g1f3');
  assert.equal(d, null);
  assert.equal(goodCandidate(Chess, 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', { from: 'g1', to: 'f3' }, 'mistake'), false);
  assert.deepEqual(GOOD_CLASSES, ['brilliant', 'great', 'best', 'excellent']);
});

// The look-ahead captions for one 6-ply line, from his October game (5.Qe4+, the fork above), move by move.
await test('captions: a 6-ply line, one Hebrew sentence per move (check, capture, threat, defence, development)', async () => {
  const fen = 'rnb1kbnr/p1pp1ppp/1p3q2/8/3Q4/4PN2/PPP2PPP/RNB1KB1R w KQkq - 0 5';
  const line = lookaheadLine(Chess, fen, ['d4e4', 'g8e7', 'e4a8', 'e7c6', 'b1c3', 'f8b4'], 'w');
  assert.equal(line.steps.length, 6);
  assert.deepEqual(line.captions.map(c => [c.san, c.who, c.text]), [
    ['Qe4+', 'me', 'אתה מזיז את המלכה ל-e4 ונותן שח, וגם מאיים על הצריח של היריב ב-a8.'],
    ['Ne7', 'opp', 'היריב מפתח את הפרש ל-e7.'],
    ['Qxa8', 'me', 'אתה לוקח עם המלכה את הצריח ב-a8 ומאיים על הפרש של היריב ב-b8.'],
    ['Nec6', 'opp', 'היריב מזיז את הפרש ל-c6 ומגן על הרגלי ב-a7.'],
    ['Nc3', 'me', 'אתה מפתח את הפרש ל-c3.'],
    ['Bb4', 'opp', 'היריב מפתח את הרץ ל-b4.'],
  ]);
  // Other caption facts on known lines: a recapture, a promotion, a mate, castling, a piece moved out of danger.
  const t = (f, l, me) => lookaheadLine(Chess, f, l, me).captions.map(c => c.text);
  assert.deepEqual(t('r3k1nQ/ppp2p1p/2npb3/6p1/2B1P3/8/PP3PPP/RNB2RK1 w q - 1 11', ['h8g8', 'e8d7', 'c4e6', 'f7e6'], 'w').slice(2),
    ['אתה לוקח עם הרץ את הרץ ב-e6 ונותן שח.', 'היריב לוקח בחזרה ב-e6 עם הרגלי.']);
  assert.deepEqual(t('8/8/5PK1/8/8/1k6/p2B4/8 b - - 0 50', ['a2a1q'], 'b'), ['אתה מכתיר את הרגלי ב-a1 למלכה.']);
  assert.deepEqual(t('8/1p5p/1p5k/p7/8/r7/1r6/5K2 b - - 3 48', ['a3a1'], 'b'), ['אתה מזיז את הצריח ל-a1 ונותן מט.']);
  assert.match(t('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', ['e1g1'], 'w')[0], /^אתה מצריח לצד המלך/);
});

await test('the line several moves ahead: continued to 8 plies, every move legal, each engine request timed', async () => {
  const fen = 'rnb1kbnr/p1pp1ppp/1p3q2/8/3Q4/4PN2/PPP2PPP/RNB1KB1R w KQkq - 0 5';
  const times = []; const timed = async (req) => { const t0 = performance.now(); const r = await ask(req); times.push(performance.now() - t0); return r; };
  const t0 = performance.now();
  const pv = await engineLine(Chess, fen, timed);
  const full = await extendLine(Chess, fen, pv, timed, LOOKAHEAD_PLIES);
  const total = performance.now() - t0;
  assert.equal(LOOKAHEAD_PLIES, 8);
  assert.ok(full.length >= 5 && full.length <= 8, `line of ${full.length}`);
  assert.deepEqual(full.slice(0, pv.length), pv, 'the first moves are the same line the coach\'s words were checked against');
  assert.equal(lineSteps(Chess, fen, full, full.length).length, full.length, 'every move legal');
  console.log(`  look-ahead: ${full.length} plies in ${times.length} engine requests, slowest ${Math.round(Math.max(...times))} ms, total ${Math.round(total)} ms (Node)`);
  assert.ok(Math.max(...times) < 2000, 'each engine request stays under 2 s');
});

await test('summary: the 3 best moves by how much they mattered, then the 3 biggest mistakes, each with its move', async () => {
  const goods = [];
  for (const [i, f] of FIXTURES.filter(f => ['mate_found.mate', 'fork.check', 'pawn_push.break', 'endgame_technique.king'].includes(f.expect)).entries()) {
    const { d } = await goodAt(f.fen, f.move, f.previous); goods.push({ ply: 10 + i, diagnosis: d });
  }
  const mistakes = summarizeGame([]);
  const s = summarizeReview(goods, mistakes);
  assert.equal(s.best.length, 3);
  assert.deepEqual(s.best.map(b => b.category), ['mate_found', 'fork', 'endgame_technique']);
  assert.equal(s.lines[0], 'שלושת המהלכים הכי טובים שלך:');
  assert.match(s.lines[1], /^1\. 39\.Ra7#: מט שמצאת$/);
  assert.equal(s.lines[4], 'לא היו לך טעויות במשחק הזה. כל הכבוד!');
  const withBad = summarizeReview(goods, { top: [{ ply: 3, moveLabel: '2.Qh5', category: 'queen_early', label: 'מלכה בחוץ מוקדם מדי', drop: 0.2, text: 'x' }], frequent: null, total: 1, lines: ['a', '1. 2.Qh5', 'כל טעות במשחק הזה הייתה מסוג אחר.'] });
  assert.equal(withBad.worst[0].ply, 3); assert.equal(withBad.lines[4], 'שלוש הטעויות הגדולות:');
  assert.equal(summarizeReview([], mistakes).lines[0], 'במשחק הזה המאמן לא מצא מהלך שבולט במיוחד לטובה.');
});

await test('UI wiring: good-move marks and filter in the move list, captions under the board line, both lines on a mistake, the review summary', async () => {
  const main = readFileSync('src/main.ts', 'utf8'); const css = readFileSync('public/styles.css', 'utf8');
  const words = readFileSync('src/coach-words-panel.ts', 'utf8'); const panel = readFileSync('src/coach-explain-panel.ts', 'utf8');
  assert.match(main, /h\(CoachGood,\{diag:coach\.good\}\)/);
  assert.match(main, /'data-coach-filter':'good'\},'מה עשיתי טוב'/);
  assert.match(main, /h\('span',\{className:'coach-good-mark'/);
  assert.match(main, /extendLine\(Chess,fen,pv,askEngine,LOOKAHEAD_PLIES\)/);
  assert.match(main, /summarizeReview\(goods,summary\)/);
  assert.match(panel, /coach-step-caption/);
  assert.match(words, /'אחרי המהלך שלך: '/); assert.match(words, /'אחרי המהלך הנכון: '/);
  assert.match(css, /\.coach-good\{/); assert.match(css, /\.coach-step-caption\{/); assert.match(css, /\.coach-move-filter\{/);
});

if (!process.exitCode) console.log(`PASS: ${passed} coach-review checks`);
else console.log(`FAIL: ${passed} passed`);
