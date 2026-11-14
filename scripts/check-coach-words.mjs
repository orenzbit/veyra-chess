// The coach's words on game review: npm run check:coach-words (also run from check:review-determinism).
// For a mistake the coach says WHAT went wrong (a named category), WHERE (move, square or piece, the punishing
// reply), WHY (material, mate or position, with the evaluation swing) and WHAT to play instead.
// Each fixture is a real position (most from orenzbit's own games in this repo) and the move played in it; the
// engine worker gives both lines, exactly as the review does, and the chosen category and sentences are asserted.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Chess } from '../rules-src/chess-compat.mjs';
import { engineLine } from '../src/coach-explain.ts';
import { diagnoseMistake, summarizeGame, CATEGORY_LABEL, MISTAKE_CLASSES } from '../src/coach-words.ts';
import { WHAT, WHY, BETTER, FALLBACK, IDEA } from '../src/coach-words-he.ts';

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
  return async (req) => { messages.length = 0; const id = 'w' + (++n); await context.self.onmessage({ data: { id, ...req } }); const r = messages.find(m => m && m.id === id); if (!r) throw new Error('no response'); if (r.error) throw new Error(r.error); return r.result; };
}
const ask = await loadWorker();

// The review's own numbers for the move (the same worker request game review makes), then both engine lines.
async function diagnose(fen, uci, variant = 0) {
  const c = new Chess(fen); const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  assert.ok(mv, `${uci} is legal in ${fen}`);
  const a = await ask({ fen, afterFen: c.fen(), mover: { from: mv.from, to: mv.to, promotion: mv.promotion || null } });
  const bestLine = await engineLine(Chess, fen, ask);
  const replyLine = c.isCheckmate() ? [] : await engineLine(Chess, c.fen(), ask);
  const me = fen.split(' ')[1];
  const d = diagnoseMistake(Chess, { fenBefore: fen, played: { from: mv.from, to: mv.to, promotion: mv.promotion }, classification: a.classification,
    moverChanceBest: me === 'w' ? a.whiteChanceBest : 100 - a.whiteChanceBest, moverChanceAfter: me === 'w' ? a.whiteChanceAfter : 100 - a.whiteChanceAfter,
    bestScore: a.bestScore, afterScore: a.afterScore, bestLine, replyLine, variant });
  return { d, a, bestLine, replyLine };
}

const FIXTURES = [
 {
  "expect": "missed_mate.one",
  "source": "orenzbit-2026-06.pgn game 10, ply 30",
  "fen": "rnb1k2B/pppp4/8/2b2N2/2B3pq/2N2p2/P1PP3P/R2Q1K1R b q - 3 15",
  "move": "h4f6",
  "text": [
   "ב-15...Qf6 היה לך מט במהלך אחד: Qf2#.",
   "במקום לנצח מיד, המשחק ממשיך: ההערכה ירדה מעמדה מנצחת לעמדה אבודה."
  ]
 },
 {
  "expect": "mate_threat.ignored",
  "source": "orenzbit-2025-11.pgn game 27, ply 12",
  "fen": "r1bqkb1r/pppppppp/2n5/8/2BPP3/2N2Q1P/PPP2PP1/R1B1K1NR b KQkq - 2 6",
  "move": "c6b4",
  "text": [
   "ב-6...Nb4 היריב איים במט, ולא סגרת את האיום. עכשיו Bxf7# נותן מט.",
   "זה כבר לא עניין של חומר: המשחק נגמר במט. ההערכה ירדה מעמדה קשה לעמדה אבודה.",
   "עדיף היה e6. הוא סוגר את איום המט."
  ]
 },
 {
  "expect": "mate_threat.allowed",
  "source": "orenzbit-2026-04.pgn game 28, ply 33",
  "fen": "r1b1kr2/p1pp2pp/2n5/1p1KPp2/2NB4/2NP4/PPP3PP/R4B1R w q - 0 17",
  "move": "c3b5",
  "text": [
   "ב-17.Nxb5 פספסת סכנה למלך שלך: היריב עונה Nb4+, ומשם זה מט מאולץ.",
   "זה כבר לא עניין של חומר: המשחק נגמר במט. ההערכה ירדה מיתרון גדול לעמדה אבודה.",
   "עדיף היה Ne3, שמוציא את הפרש מסכנה: ב-c4 הוא היה מותקף."
  ]
 },
 {
  "expect": "mate_threat.now",
  "source": "orenzbit-2026-04.pgn game 27, ply 118",
  "fen": "4r3/4k2Q/7K/8/8/8/8/8 b - - 6 59",
  "move": "e7f8",
  "text": [
   "אחרי 59...Kf8 היריב נותן מט מיד: Qg7#.",
   "זה כבר לא עניין של חומר: המשחק נגמר במט. ההערכה ירדה מעמדה קשה לעמדה אבודה.",
   "עדיף היה Kd6."
  ]
 },
 {
  "expect": "back_rank",
  "source": "orenzbit-2026-09.pgn game 5, ply 32",
  "fen": "r1b2k1r/ppp4p/2nb4/5pBB/3P4/2P5/PP3PPP/R3R1K1 b - - 0 16",
  "move": "h8g8",
  "text": [
   "ב-16...Rg8 השארת את המלך ב-f8 על השורה האחורית בלי משבצת בריחה: אחרי Bh6+, הצריח נותן מט ב-e8.",
   "זה כבר לא עניין של חומר: המשחק נגמר במט. ההערכה ירדה מעמדה שקולה לעמדה אבודה.",
   "עדיף היה Kg7."
  ]
 },
 {
  "expect": "back_rank.now",
  "source": "orenzbit-2026-06.pgn game 2, ply 76",
  "fen": "2b3k1/3P1ppp/p2P4/7P/8/1r6/2P2K2/8 b - - 0 38",
  "move": "a6a5",
  "text": [
   "ב-38...a5 השארת את המלך ב-g8 על השורה האחורית בלי משבצת בריחה: dxc8=Q# הוא מט.",
   "זה כבר לא עניין של חומר: המשחק נגמר במט. ההערכה ירדה מיתרון גדול לעמדה אבודה.",
   "עדיף היה Bxd7. הוא סוגר את איום המט."
  ]
 },
 {
  "expect": "hanging_piece.moved",
  "source": "orenzbit-2026-05.pgn game 8, ply 49",
  "fen": "6Q1/p3k3/b4p2/1p6/2p2PB1/8/PPq5/R1B2K2 w - - 2 25",
  "move": "g8h7",
  "text": [
   "ב-25.Qh7+ הזזת את המלכה ל-h7, ושם היא לא מוגנת. היריב יכול Qxh7 ולזכות במלכה.",
   "זה עולה לך מלכה: ההערכה ירדה מעמדה מנצחת לעמדה קשה (בערך 14 נקודות לפי המנוע).",
   "עדיף היה Qe6+. מזלג: המלכה נותנת שח ובאותו זמן תוקפת את הרץ ב-a6."
  ]
 },
 {
  "expect": "hanging_piece.left",
  "source": "orenzbit-2026-09.pgn game 5, ply 44",
  "fen": "r7/ppp1b1k1/2n1R3/5p1B/3P1P1P/2P5/PP4P1/4R1K1 b - - 1 22",
  "move": "c6d8",
  "text": [
   "ב-22...Nd8 הזזת את הפרש מ-c6, והשארת את הרץ ב-e7 בלי הגנה. היריב יכול Rxe7+ ולזכות ב-4 נקודות חומר.",
   "זה עולה לך 4 נקודות חומר: ההערכה ירדה מעמדה קשה לעמדה אבודה (בערך 5.2 נקודות לפי המנוע).",
   "עדיף היה Bxh4, שלוקח את הרגלי ב-h4 בחינם: ללבן אין איך לקחת בחזרה."
  ]
 },
 {
  "expect": "hanging_piece.already",
  "source": "orenzbit-2026-07.pgn game 8, ply 4",
  "fen": "rnbqkbnr/pppp1ppp/8/4p3/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 2",
  "move": "d7d5",
  "text": [
   "הרגלי ב-e5 היה בסכנה, וב-2...d5 לא הצלת אותו. היריב יכול dxe5 ולזכות ברגלי.",
   "זה עולה לך רגלי: ההערכה ירדה מעט, והעמדה עדיין שקולה.",
   "עדיף היה exd4, שלוקח את הרגלי ב-d4."
  ]
 },
 {
  "expect": "hanging_piece.moved_cheap",
  "source": "orenzbit-2026-06.pgn game 26, ply 5",
  "fen": "rnbqkbnr/pppp1ppp/8/8/3pP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3",
  "move": "b1c3",
  "text": [
   "ב-3.Nc3 שמת את הפרש ב-c3, ושם הרגלי של היריב תוקף אותו. גם עם ההגנה, dxc3 זוכה ב-2 נקודות חומר.",
   "זה עולה לך 2 נקודות חומר: ההערכה ירדה מעמדה שקולה לעמדה קשה (בערך 3.7 נקודות לפי המנוע).",
   "עדיף היה Qxd4, שלוקח את הרגלי ב-d4 בחינם: לשחור אין איך לקחת בחזרה."
  ]
 },
 {
  "expect": "hanging_piece.moved_outnumbered",
  "source": "orenzbit-2026-09.pgn game 11, ply 18",
  "fen": "rn1qkbnr/pBp3pp/4b3/8/3P1p2/4N1P1/PPP1PP1P/R1BQK2R b KQkq - 0 9",
  "move": "e6d5",
  "text": [
   "ב-9...Bd5 שמת את הרץ ב-d5, ושם היריב תוקף אותו יותר פעמים ממה שאתה מגן. Nxd5 זוכה ברץ.",
   "זה עולה לך רץ: ההערכה ירדה מעמדה שקולה לעמדה קשה (בערך 6.0 נקודות לפי המנוע).",
   "עדיף היה fxe3, שלוקח את הפרש ב-e3 עם הרגלי: גם אם לבן ייקח בחזרה, שחור מרוויח בחילוף."
  ]
 },
 {
  "expect": "missed_capture",
  "source": "orenzbit-2026-09.pgn game 12, ply 9",
  "fen": "rnbqkb1r/ppp2ppp/8/3np3/2B5/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5",
  "move": "c4d5",
  "text": [
   "ב-5.Bxd5 יכולת לקחת את הרגלי ב-e5 עם Nxe5, ופספסת.",
   "פספסת רגלי: ההערכה ירדה מיתרון קטן לעמדה שקולה (בערך 0.8 נקודות לפי המנוע).",
   "השורה של המנוע: Nxe5 Qg5 Bxd5 Qxe5+."
  ]
 },
 {
  "expect": "missed_capture.line",
  "source": "orenzbit-2026-09.pgn game 1, ply 29",
  "fen": "2kr1b1r/ppp2bpp/3qp2n/3Pp2P/4P1P1/2NB4/PPP5/R1BQ1RK1 w - - 1 15",
  "move": "d5e6",
  "text": [
   "ב-15.dxe6 יכולת לקחת את הפרש ב-h6 עם Bxh6: גם אחרי התשובה של היריב, השורה של המנוע מרוויחה חומר.",
   "פספסת פרש: ההערכה ירדה מיתרון גדול לעמדה שקולה (בערך 3.6 נקודות לפי המנוע).",
   "השורה של המנוע: Bxh6 Qd7 Qf3 Bc5+."
  ]
 },
 {
  "expect": "fork.allowed",
  "source": "orenzbit-2026-10.pgn game 13, ply 112",
  "fen": "8/8/8/8/5r2/2b5/R3K1Pk/8 b - - 20 56",
  "move": "f4e4",
  "text": [
   "אחרי 56...Re4+ היריב משחק Kd3: המלך ב-d3 תוקף בבת אחת את הצריח ב-e4 ואת הרץ ב-c3.",
   "זה עולה לך רץ: ההערכה ירדה מיתרון גדול לעמדה שקולה (בערך 3.2 נקודות לפי המנוע).",
   "עדיף היה Kg3, שמאיים לקחת את הרגלי ב-g2."
  ]
 },
 {
  "expect": "fork.allowed_check",
  "source": "orenzbit-2026-07.pgn game 8, ply 32",
  "fen": "rn1k3r/pp3p1p/5p2/2p1N3/4P3/5b2/5PPP/R4RK1 b - - 3 16",
  "move": "f3e4",
  "text": [
   "אחרי 16...Bxe4 היריב משחק Nxf7+: הפרש ב-f7 נותן שח ובאותו זמן תוקף את הצריח ב-h8.",
   "זה עולה לך צריח: ההערכה ירדה מיתרון גדול ליתרון קטן (בערך 4.3 נקודות לפי המנוע).",
   "עדיף היה fxe5, שלוקח את הפרש ב-e5 בחינם: ללבן אין איך לקחת בחזרה."
  ]
 },
 {
  "expect": "missed_fork",
  "source": "orenzbit-2026-07.pgn game 5, ply 26",
  "fen": "r1bqr1k1/2p2p2/p1nb1n1p/1p1pp1p1/3P4/PBNQPNB1/1PP2PPP/R4RK1 b - - 2 13",
  "move": "e5d4",
  "text": [
   "ב-13...exd4 היה לך מזלג: e4, והרגלי תוקף בבת אחת את המלכה ב-d3 ואת הפרש ב-f3.",
   "פספסת פרש: ההערכה ירדה מיתרון קטן לעמדה שקולה (בערך 2.6 נקודות לפי המנוע)."
  ]
 },
 {
  "expect": "missed_fork.check",
  "source": "orenzbit-2026-09.pgn game 10, ply 65",
  "fen": "5r2/p7/1p6/3pk3/4p1PN/1PPbK2P/8/3R4 w - - 3 33",
  "move": "c3c4",
  "text": [
   "ב-33.c4 היה לך מזלג עם שח: Ng6+ נותן שח ובאותו זמן תוקף את הצריח ב-f8.",
   "פספסת צריח: ההערכה ירדה מיתרון גדול לעמדה קצת פחות טובה (בערך 6.6 נקודות לפי המנוע)."
  ]
 },
 {
  "expect": "pin",
  "source": "orenzbit-2026-04.pgn game 27, ply 20",
  "fen": "r1bqkb1r/1pp1pppp/8/p3N3/3np3/8/PPP2PPP/R2QKB1R b KQkq - 1 10",
  "move": "a5a4",
  "text": [
   "הפרש ב-d4 מרותק אל המלכה ב-d8 על ידי המלכה של היריב, וב-10...a4 לא טיפלת בזה. היריב מנצל את הריתוק: c3.",
   "זה עולה לך 2 נקודות חומר: ההערכה ירדה ב-1.1 נקודות לפי המנוע, ועדיין יש לך יתרון גדול.",
   "עדיף היה Qd5, שמאיים לקחת את הפרש ב-e5."
  ]
 },
 {
  "expect": "pin.made",
  "source": "orenzbit-2026-07.pgn game 8, ply 44",
  "fen": "r2k4/pp3p1p/2n2p2/2N5/8/7P/5PPK/4R3 b - - 0 22",
  "move": "c6d4",
  "text": [
   "אחרי 22...Nd4 היריב משחק Rd1 ומרתק את הפרש ב-d4 אל המלך ב-d8: הפרש לא יכול לזוז בלי לחשוף את המלך.",
   "זה עולה לך פרש: ההערכה ירדה מיתרון קטן לעמדה קצת פחות טובה (בערך 3.1 נקודות לפי המנוע).",
   "עדיף היה Kc7, שמגן על הרגלי ב-b7, שהיה מותקף."
  ]
 },
 {
  "expect": "pin.into",
  "source": "orenzbit-2026-10.pgn game 10, ply 36",
  "fen": "r4b1r/1p1knR1p/p7/3Pp1B1/8/2N5/PPP3PP/R5K1 b - - 4 18",
  "move": "d7d8",
  "text": [
   "ב-18...Kd8 נכנסת לריתוק: הפרש ב-e7 עומד עכשיו בין הרץ של היריב למלך ב-d8. היריב מנצל את זה: d6.",
   "זה עולה לך פרש: ההערכה ירדה ב-3.0 נקודות לפי המנוע, והעמדה עדיין קשה.",
   "עדיף היה Ke8, שמאיים לקחת את הצריח ב-f7."
  ]
 },
 {
  "expect": "skewer",
  "source": "orenzbit-2026-06.pgn game 4, ply 38",
  "fen": "rn5r/ppp2k1p/4B3/5p2/8/1Q1PBP2/PP2K1P1/q7 b - - 0 19",
  "move": "f7g7",
  "text": [
   "אחרי 19...Kg7 היריב משחק Qc3+: שיפוד. המלך ב-g7 חייב לזוז, ואז הצריח ב-h8 נלקח.",
   "זה עולה לך צריח: ההערכה ירדה מיתרון קטן לעמדה שקולה (בערך 1.6 נקודות לפי המנוע).",
   "עדיף היה Ke8."
  ]
 },
 {
  "expect": "discovered_attack.check",
  "source": "orenzbit-2026-09.pgn game 19, ply 13",
  "fen": "rnbqk2r/ppp2ppp/3P4/2b1p1N1/2B5/8/PPPP1nPP/RNBQK2R w KQkq - 0 7",
  "move": "e1g1",
  "text": [
   "אחרי 7.O-O היריב משחק Nxd1+: שח בגילוי. הפרש זז, הקו של הרץ אל המלך נפתח, ואתה חייב לטפל בשח.",
   "זה עולה לך 11 נקודות חומר: ההערכה ירדה מיתרון קטן לעמדה אבודה (בערך 11 נקודות לפי המנוע).",
   "עדיף היה Qh5, שמגן על הפרש ב-g5, שהיה מותקף."
  ]
 },
 {
  "expect": "king_safety.castle",
  "source": "orenzbit-2026-06.pgn game 9, ply 26",
  "fen": "r1bqk2r/2p3pp/p1p5/8/1b1Pp3/7N/P1P2KPP/R1BQ1R2 b kq - 1 13",
  "move": "c6c5",
  "text": [
   "במהלך 13 המלך שלך עדיין ב-e8, והיה אפשר להצריח. במקום זה שיחקת c5, והיריב יכול Qh5+.",
   "זה לא מפסיד חומר מיד, אבל העמדה נחלשת: ההערכה ירדה מיתרון קטן לעמדה שקולה (בערך 1.8 נקודות לפי המנוע).",
   "עדיף היה O-O+: להצריח ולהכניס את המלך למקום מוגן."
  ]
 },
 {
  "expect": "king_safety.king_moved",
  "source": "orenzbit-2026-07.pgn game 14, ply 7",
  "fen": "r1bqk1nr/pppp1ppp/2n5/1Bb1p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
  "move": "e1f1",
  "text": [
   "ב-4.Kf1 הזזת את המלך ואיבדת את הזכות להצריח. המלך נשאר באמצע הלוח, והיריב עונה Nf6.",
   "זה לא מפסיד חומר מיד, אבל העמדה נחלשת: ההערכה ירדה ב-1.2 נקודות לפי המנוע, והעמדה עדיין שקולה.",
   "עדיף היה Nc3, שמפתח את הפרש מהשורה האחורית למשחק."
  ]
 },
 {
  "expect": "queen_early",
  "source": "orenzbit-2026-07.pgn game 13, ply 21",
  "fen": "rn1qkbnr/5ppp/p2p4/1p1p4/3N2Q1/8/PPP2PPP/RNB2RK1 w kq - 0 11",
  "move": "g4f5",
  "text": [
   "ב-11.Qf5 הזזת את המלכה, כשעוד 2 כלים קלים שלך בבית. היריב עונה Ne7, תוקף אותה ומפתח כלי.",
   "זה לא מפסיד חומר מיד, אבל העמדה נחלשת: ההערכה ירדה מיתרון קטן לעמדה שקולה (בערך 1.1 נקודות לפי המנוע).",
   "עדיף היה Nf5."
  ]
 },
 {
  "expect": "queen_early.dev",
  "source": "orenzbit-2025-11.pgn game 23, ply 11",
  "fen": "rn1qk1nr/pppbbppp/8/4p3/4P3/2P5/PP3PPP/RNBQKBNR w KQkq - 1 6",
  "move": "d1d2",
  "text": [
   "ב-6.Qd2 הזזת את המלכה, כשעוד 4 כלים קלים שלך בבית (הפרש ב-b1, הפרש ב-g1, הרץ ב-c1 והרץ ב-f1). היריב עונה Nc6.",
   "זה לא מפסיד חומר מיד, אבל העמדה נחלשת: ההערכה ירדה מעמדה שקולה לעמדה קצת פחות טובה (בערך 1.5 נקודות לפי המנוע).",
   "עדיף היה Nf3: לפתח את הפרש ל-f3 ולהתקרב להצרחה."
  ]
 },
 {
  "expect": "undeveloped",
  "source": "orenzbit-2026-06.pgn game 15, ply 9",
  "fen": "rnbqkbnr/1pp1ppp1/8/3N3p/p2PP3/8/PPP2PPP/R1BQKBNR w KQkq - 0 5",
  "move": "b2b3",
  "text": [
   "במהלך 5 עוד 3 כלים קלים שלך בבית (הפרש ב-g1, הרץ ב-c1 והרץ ב-f1), ושיחקת b3 במקום לפתח. היריב עונה c6.",
   "זה לא מפסיד חומר מיד, אבל העמדה נחלשת: ההערכה ירדה ב-1.9 נקודות לפי המנוע, ועדיין יש לך יתרון קטן.",
   "עדיף היה Bf4: לפתח את הרץ ל-f4 ולהתקרב להצרחה."
  ]
 },
 {
  "expect": "lost_center",
  "source": "orenzbit-2026-09.pgn game 5, ply 10",
  "fen": "r1bqkbnr/ppp3pp/2n2p2/3pp3/3P4/2NBPN2/PPP2PPP/R1BQK2R b KQkq - 1 5",
  "move": "e5d4",
  "text": [
   "ב-5...exd4 ויתרת על המרכז: היריב משחק exd4 ותופס את d4.",
   "זה לא מפסיד חומר מיד, אבל העמדה נחלשת: ההערכה ירדה מיתרון קטן לעמדה קצת פחות טובה (בערך 2.3 נקודות לפי המנוע).",
   "עדיף היה e4. מזלג: הרגלי תוקף בבת אחת את הרץ ב-d3 ואת הפרש ב-f3."
  ]
 },
 {
  "expect": "lost_center.missed",
  "source": "orenzbit-2026-06.pgn game 9, ply 16",
  "fen": "r1bqkb1r/2p1pppp/p1p5/8/1P1Pp3/4PP2/P1P3PP/R1BQK1NR b KQkq - 0 8",
  "move": "f7f5",
  "text": [
   "ב-8...f5 יכולת לתפוס את המרכז עם e5. היריב עונה למהלך שלך Bd2.",
   "זה לא מפסיד חומר מיד, אבל העמדה נחלשת: ההערכה ירדה מעט, והעמדה עדיין שקולה.",
   "הרעיון: לתפוס את המרכז ב-e5."
  ]
 },
 {
  "expect": "bad_trade.wrong_piece",
  "source": "orenzbit-2026-06.pgn game 2, ply 72",
  "fen": "2b3k1/p2p1ppp/3P4/4P2P/8/1Nr5/2P2K2/8 b - - 0 36",
  "move": "c3b3",
  "text": [
   "ב-36...Rxb3 נתת את הצריח תמורת הפרש: זה חילוף שמפסיד חומר. היריב לוקח בחזרה עם cxb3.",
   "זה עולה לך את האיכות (צריח תמורת כלי קל): ההערכה ירדה ב-3.2 נקודות לפי המנוע, ועדיין יש לך יתרון גדול.",
   "עדיף היה Rxc2+, שלוקח את הרגלי ב-c2 בחינם: ללבן אין איך לקחת בחזרה."
  ]
 },
 {
  "expect": "bad_trade.behind",
  "source": "orenzbit-2026-09.pgn game 23, ply 43",
  "fen": "5r2/pppk3p/3p4/5Np1/4P1Pb/3P3K/PPr3P1/R7 w - - 2 22",
  "move": "f5h4",
  "text": [
   "ב-22.Nxh4 החלפת כלים כשאתה בפיגור של 5 נקודות חומר. כל חילוף כזה מקרב את היריב לסיום מנצח, והוא לוקח בחזרה: gxh4.",
   "זה לא מפסיד חומר מיד, אבל העמדה נחלשת: ההערכה ירדה ב-1.9 נקודות לפי המנוע, והעמדה עדיין קשה.",
   "עדיף היה g3, שמאיים לקחת את הרץ ב-h4."
  ]
 },
 {
  "expect": "pawn_structure.weakened",
  "source": "orenzbit-2026-05.pgn game 5, ply 15",
  "fen": "rn1qkb1r/ppp2ppp/8/3P4/3p4/5b1P/PPP2PP1/R1BQKB1R w KQkq - 0 8",
  "move": "g2f3",
  "text": [
   "ב-8.gxf3 קלקלת את מבנה הרגלים: רגלים כפולים ומבודדים בטור f. היריב עונה Qxd5.",
   "זה לא מפסיד חומר מיד, אבל העמדה נחלשת: ההערכה ירדה מעמדה שקולה לעמדה קצת פחות טובה (בערך 1.9 נקודות לפי המנוע).",
   "עדיף היה Qxf3, שלוקח את הרץ ב-f3 בחינם: לשחור אין איך לקחת בחזרה."
  ]
 },
 {
  "expect": "pawn_structure.passer_ignored",
  "source": "orenzbit-2026-06.pgn game 21, ply 60",
  "fen": "6k1/pp2Bppp/1p1P4/8/7b/4K3/r6P/8 b - - 0 30",
  "move": "h4e7",
  "text": [
   "ב-30...Bxe7 לא עצרת את הרגלי החופשי של היריב ב-d6. בשורה של המנוע הוא מתקדם: dxe7.",
   "זה לא מפסיד חומר מיד, אבל העמדה נחלשת: ההערכה ירדה מעמדה מנצחת לעמדה שקולה (בערך 8.3 נקודות לפי המנוע).",
   "עדיף היה Bf2+, שמוציא את הרץ מסכנה: ב-h4 הוא היה מותקף."
  ]
 },
 {
  "expect": "pawn_structure.promotes",
  "source": "orenzbit-2026-07.pgn game 24, ply 70",
  "fen": "3k4/p3qpPp/8/3K4/2P3P1/8/7P/8 b - - 2 35",
  "move": "e7f6",
  "text": [
   "ב-35...Qf6 לא עצרת את הרגלי החופשי ב-g7, והיריב מכתיר אותו: g8=Q+.",
   "זה עולה לך 9 נקודות חומר: ההערכה ירדה מעמדה מנצחת לעמדה שקולה (בערך 11 נקודות לפי המנוע).",
   "עדיף היה Qe6+, שמאיים לקחת את הרגלי ב-g4."
  ]
 },
 {
  "expect": "pawn_structure.own_passer",
  "source": "orenzbit-2026-07.pgn game 3, ply 74",
  "fen": "8/pp3pkp/6p1/4RP2/8/3p2KP/1r6/5R2 b - - 0 37",
  "move": "g7f6",
  "text": [
   "היה לך רגלי חופשי ב-d3, וב-37...Kf6 לא דחפת אותו. d2 היה מקדם אותו.",
   "זה עולה לך נקודת חומר אחת: ההערכה ירדה מעמדה שקולה לעמדה קצת פחות טובה (בערך 1.6 נקודות לפי המנוע)."
  ]
 },
 {
  "expect": "endgame_rook",
  "source": "orenzbit-2026-09.pgn game 7, ply 92",
  "fen": "1r6/8/R7/8/4k3/P2p4/1p1K4/1R6 b - - 1 46",
  "move": "e4d4",
  "text": [
   "ב-46...Kd4 הצריח שלך לא עומד מאחורי הרגלי החופשי ב-b2. Rb3 היה מעמיד אותו מאחוריו.",
   "זה עולה לך רגלי: ההערכה ירדה מעמדה קצת פחות טובה לעמדה קשה (בערך 3.0 נקודות לפי המנוע).",
   "הרעיון: להעמיד את הצריח מאחורי הרגלי החופשי."
  ]
 },
 {
  "expect": "endgame_opposition",
  "source": "orenzbit-2026-09.pgn game 9, ply 118",
  "fen": "8/8/8/7p/4K2P/8/8/4k3 b - - 4 59",
  "move": "e1f2",
  "text": [
   "בסיום מלכים ורגלים, ב-59...Kf2 ויתרת על האופוזיציה. Ke2 מעמיד את המלכים זה מול זה, והיריב היה חייב לזוז.",
   "זה עולה לך רגלי: ההערכה ירדה מעמדה קצת פחות טובה לעמדה אבודה (בערך 8.1 נקודות לפי המנוע)."
  ]
 },
 {
  "expect": "general.position",
  "source": "orenzbit-2026-06.pgn game 14, ply 33",
  "fen": "r1q1kr2/pp1np2p/2ppBbb1/6n1/3P2Q1/7P/PPP5/RNB1K1R1 w Qq - 4 17",
  "move": "e6d7",
  "text": [
   "ב-17.Bxd7+ המנוע לא מראה טקטיקה ברורה. התשובה הכי טובה של היריב היא Qxd7.",
   "זה לא מפסיד חומר מיד, אבל העמדה נחלשת: ההערכה ירדה ב-1.7 נקודות לפי המנוע, והעמדה עדיין קצת פחות טובה.",
   "עדיף היה Bxg5, שלוקח את הפרש ב-g5."
  ]
 },
 {
  "expect": "general.material",
  "source": "orenzbit-2026-04.pgn game 15, ply 29",
  "fen": "rn2k2r/ppp1n1p1/2qbQ2p/3p1p2/RP1P2P1/2NN4/P1P1PP1P/2B1KB1R w Kkq - 0 15",
  "move": "d3e5",
  "text": [
   "ב-15.Ne5 המנוע לא מראה טקטיקה אחת שאפשר לקרוא לה בשם, אבל התשובה של היריב, Qxc3+, מתחילה שורה שמרוויחה לו חומר.",
   "זה עולה לך 5 נקודות חומר: ההערכה ירדה מיתרון גדול לעמדה קצת פחות טובה (בערך 4.6 נקודות לפי המנוע).",
   "עדיף היה Bb2, שמגן על הפרש ב-c3, שהיה מותקף."
  ]
 },
 {
  "expect": "general.missed",
  "source": "orenzbit-2026-04.pgn game 27, ply 116",
  "fen": "3kr3/6KQ/8/8/8/8/8/8 b - - 4 58",
  "move": "d8e7",
  "text": [
   "ב-58...Ke7 היה לך מהלך שמרוויח חומר: Re7+. היריב עונה למהלך ששיחקת Qh5.",
   "פספסת 4 נקודות חומר: ההערכה ירדה מעמדה שקולה לעמדה קשה (בערך 5.3 נקודות לפי המנוע).",
   "עדיף היה Re7+, שנותן שח: לבן חייב קודם כול להציל את המלך."
  ]
 },
 {
  "expect": "missed_mate",
  "source": "orenzbit-2026-10.pgn game 11, ply 23",
  "fen": "rnbqk2r/pppp3p/3b4/4p1N1/2B1n3/8/PPP2PPP/R2Q1RK1 w kq - 0 12",
  "move": "g5f7",
  "text": [
   "ב-12.Nf7 היה לך מט, ופספסת אותו: Qh5+ מתחיל מט מאולץ.",
   "במקום לנצח מיד, המשחק ממשיך: ההערכה ירדה מעמדה מנצחת לעמדה קצת פחות טובה.",
   "השורה למט: Qh5+ Kf8 Qf7#."
  ]
 },
 {
  "expect": "endgame_king",
  "source": "constructed position (no real example of this in his games)",
  "fen": "8/p4pk1/1p4p1/7p/7P/1P4P1/P4P2/6K1 w - - 0 40",
  "move": "a2a4",
  "text": [
   "זה סיום, ובסיום המלך הוא כלי לוחם. ב-40.a4 המלך שלך נשאר ב-g1 במקום להתקרב למרכז עם Kf1.",
   "זה לא מפסיד חומר מיד, אבל העמדה נחלשת: ההערכה ירדה מעט, והעמדה עדיין שקולה.",
   "הרעיון: להביא את המלך למרכז, דרך f1."
  ]
 }
];

// One fixture per category (and sub-case): the category, and the three sentences exactly as the coach says them.
for (const f of FIXTURES) {
  await test(`${f.expect}: ${f.move} in ${f.source}`, async () => {
    const { d, bestLine, replyLine } = await diagnose(f.fen, f.move);
    assert.ok(d, 'a diagnosis');
    assert.equal(d.category + (d.sub ? '.' + d.sub : ''), f.expect, `category (best ${bestLine.join(' ')} / reply ${replyLine.join(' ')})`);
    assert.equal(d.label, CATEGORY_LABEL[d.category]);
    assert.deepEqual(d.text, f.text);
  });
}

await test('every category has a label, and every phrase has 2-3 variants', async () => {
  for (const [key, arr] of Object.entries(WHAT)) assert.ok(arr.length >= 2 && arr.length <= 3, `${key}: ${arr.length} variants`);
  for (const [key, arr] of Object.entries(WHY)) assert.ok(arr.length >= 2 && arr.length <= 3, `why ${key}`);
  for (const [key, arr] of Object.entries(FALLBACK)) assert.ok(arr.length >= 2, `fallback ${key}`);
  for (const key of Object.keys(WHAT)) assert.ok(CATEGORY_LABEL[key.split('.')[0]], `label for ${key}`);
  const covered = new Set(FIXTURES.map(f => f.expect.split('.')[0]));
  for (const cat of Object.keys(CATEGORY_LABEL)) assert.ok(covered.has(cat), `a fixture for ${cat}`);
});

await test('the variants do not repeat themselves: another variant gives another sentence, with the same facts', async () => {
  const f = FIXTURES.find(x => x.expect === 'fork.allowed_check');
  const a = (await diagnose(f.fen, f.move, 0)).d, b = (await diagnose(f.fen, f.move, 1)).d;
  assert.equal(a.category, b.category);
  assert.notEqual(a.what, b.what);
  for (const fact of ['Nxf7+', 'h8']) { assert.ok(a.what.includes(fact)); assert.ok(b.what.includes(fact) || b.what.includes('צריח')); }
});

await test('agreement: the queen is feminine, other pieces masculine', async () => {
  const q = FIXTURES.find(x => x.expect === 'hanging_piece.moved');
  const d = (await diagnose(q.fen, q.move)).d;
  assert.match(d.what, /המלכה ל-h7, ושם היא לא מוגנת/);
  const n = FIXTURES.find(x => x.expect === 'hanging_piece.moved_cheap');
  assert.match((await diagnose(n.fen, n.move)).d.what, /הפרש ב-c3, ושם הרגלי של היריב תוקף אותו/);
});

await test('a tactic is never named when the engine line does not show it paying off', async () => {
  // The fork position, but a made-up reply line in which the forking knight is simply taken: no fork, no material.
  const f = FIXTURES.find(x => x.expect === 'fork.allowed_check');
  const { d: real, bestLine } = await diagnose(f.fen, f.move);
  const c = new Chess(f.fen); c.move({ from: f.move.slice(0, 2), to: f.move.slice(2, 4) });
  const quiet = c.moves({ verbose: true }).find(m => !m.captured && !m.san.includes('+') && m.piece === 'p');
  const d = diagnoseMistake(Chess, { fenBefore: f.fen, played: { from: f.move.slice(0, 2), to: f.move.slice(2, 4) }, moverChanceBest: 80, moverChanceAfter: 60, bestLine, replyLine: [quiet.from + quiet.to], variant: 0 });
  assert.equal(real.category, 'fork');
  assert.notEqual(d.category, 'fork');
  assert.ok(!/מזלג/.test(d.what), d.what);
});

await test('no detector: a plain sentence with the evaluation swing, and nothing claimed', async () => {
  const f = FIXTURES.find(x => x.expect === 'general.position');
  const d = (await diagnose(f.fen, f.move)).d;
  assert.equal(d.category, 'general');
  assert.match(d.why, /ההערכה ירדה/);
  assert.ok(!/מזלג|ריתוק|שיפוד|מט/.test(d.what));
});

await test('the engine\'s own best move gets no "what went wrong"', async () => {
  const f = FIXTURES.find(x => x.expect === 'missed_mate');
  const bestLine = await engineLine(Chess, f.fen, ask);
  const d = diagnoseMistake(Chess, { fenBefore: f.fen, played: { from: bestLine[0].slice(0, 2), to: bestLine[0].slice(2, 4) }, moverChanceBest: 100, moverChanceAfter: 100, bestLine, replyLine: [] });
  assert.equal(d, null);
});

await test('game summary: the three biggest mistakes with category and move, and the most frequent category', async () => {
  const items = [];
  for (const k of ['hanging_piece.moved', 'hanging_piece.already', 'fork.allowed', 'missed_capture', 'hanging_piece.left']) {
    const f = FIXTURES.find(x => x.expect === k); items.push({ ply: items.length * 7, diagnosis: (await diagnose(f.fen, f.move)).d });
  }
  const s = summarizeGame(items);
  assert.equal(s.top.length, 3);
  assert.ok(s.top[0].drop >= s.top[1].drop && s.top[1].drop >= s.top[2].drop);
  assert.equal(s.frequent.category, 'hanging_piece');
  assert.equal(s.frequent.count, 3);
  assert.equal(s.lines[s.lines.length - 1], 'הטעות שחזרה הכי הרבה במשחק הזה: כלי לא מוגן (3 פעמים).');
  assert.match(s.lines[1], /^1\. \d+\.{1,3}\S+: /);
  assert.deepEqual(summarizeGame([]).lines, ['לא היו לך טעויות במשחק הזה. כל הכבוד!']);
  assert.deepEqual(MISTAKE_CLASSES, ['inaccuracy', 'mistake', 'miss', 'blunder']);
});

await test('UI wiring: review diagnoses mistakes inside "why?", and has the coach summary', async () => {
  const main = readFileSync('src/main.ts', 'utf8'); const css = readFileSync('public/styles.css', 'utf8');
  assert.match(main, /coachDiagnose\(ply,pv\)/);
  assert.match(main, /h\(CoachMistake,/);
  assert.match(main, /h\(CoachSummary,/);
  assert.match(main, /'סיכום המאמן'/);
  assert.match(css, /\.coach-mistake\{/);
});

if (!process.exitCode) console.log(`PASS: ${passed} coach-words checks`);
else console.log(`FAIL: ${passed} passed`);
