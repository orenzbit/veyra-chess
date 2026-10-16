// Differential test: Veyra rules layer (MIT) vs a reference chess.js build (test-only, never shipped).
// Usage: ORACLE=/path/to/chess.js/dist/esm/chess.js node scripts/test-rules-diff.mjs [games]
import { pathToFileURL } from 'node:url';
import { Chess as Mine } from '../rules-src/chess-compat.mjs';
if (!process.env.ORACLE) { console.log('ORACLE not set - skipping'); process.exit(0); }
const { Chess: Ref } = await import(pathToFileURL(process.env.ORACLE).href);
const GAMES = +process.argv[2] || 300;
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const FENS = [
  undefined,
  'r3k2r/pppq1ppp/2npbn2/2b1p3/2B1P3/2NPBN2/PPPQ1PPP/R3K2R w KQkq - 0 1',
  'r3k2r/p6p/8/8/8/8/P6P/R3K2R w KQkq - 0 1',
  '8/P6k/8/8/8/8/p6K/8 w - - 0 1',
  '4k3/1P4P1/8/8/8/8/1p4p1/4K3 w - - 0 1',
  'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3',
  '8/8/8/3k4/8/8/4P3/4K3 w - - 0 1',
  '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 98 80',
  '8/8/4k3/8/8/3KB3/8/8 w - - 0 1',
  '8/8/4k3/8/8/3KN3/8/5b2 w - - 0 1',
  'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
];
let bad = 0, plies = 0;
const fail = (m, ctx) => { if (bad++ < 15) console.log('MISMATCH', m, ctx); };
const norm = (v) => ({ c: v.color, f: v.from, t: v.to, p: v.piece, cap: v.captured, pr: v.promotion, fl: v.flags, san: v.san, lan: v.lan, b: v.before, a: v.after });
function cmp(a, b, ctx) {
  const chk = (n, x, y) => { if (JSON.stringify(x) !== JSON.stringify(y)) fail(n, { ctx, mine: x, ref: y }); };
  chk('fen', a.fen(), b.fen());
  chk('turn', a.turn(), b.turn());
  chk('moves', a.moves().sort(), b.moves().sort());
  const vs = (g) => g.moves({ verbose: true }).map(norm).sort((x, y) => (x.lan + x.p).localeCompare(y.lan + y.p));
  chk('verbose', vs(a), vs(b));
  for (const k of ['isCheck', 'isCheckmate', 'isStalemate', 'isDraw', 'isThreefoldRepetition', 'isInsufficientMaterial', 'isGameOver'])
    chk(k, a[k](), b[k]());
  chk('history', a.history(), b.history());
  chk('histv', a.history({ verbose: true }).map(norm), b.history({ verbose: true }).map(norm));
  chk('board', a.board(), b.board());
}
for (let g = 0; g < GAMES; g++) {
  const fen = FENS[g % FENS.length];
  const a = fen ? new Mine(fen) : new Mine(), b = fen ? new Ref(fen) : new Ref();
  cmp(a, b, 'start ' + g);
  for (let ply = 0; ply < 140 && !b.isGameOver(); ply++) {
    const ms = b.moves();
    const san = pick(ms);
    const mode = ply % 3;
    let ra, rb;
    if (mode === 0) { rb = b.move(san); ra = a.move(san); }
    else { const v = pick(b.moves({ verbose: true })); rb = b.move({ from: v.from, to: v.to, promotion: v.promotion }); ra = a.move({ from: v.from, to: v.to, promotion: v.promotion }); }
    if (ra.san !== rb.san) fail('san', { ra: ra.san, rb: rb.san });
    plies++;
    cmp(a, b, `g${g} ply${ply} ${rb.san}`);
    if (ply % 17 === 5) { // undo / redo round trip
      const u1 = a.undo(), u2 = b.undo();
      if (u1.san !== u2.san) fail('undo', { u1: u1.san, u2: u2.san });
      cmp(a, b, 'after undo');
      a.move(u1.san); b.move(u2.san); cmp(a, b, 'after redo');
    }
  }
  // PGN round trip
  const pa = a.pgn(), pb = b.pgn();
  if (pa !== pb) fail('pgn', { pa, pb });
  const a2 = new Mine(); a2.loadPgn(pb);
  if (a2.fen() !== b.fen()) fail('loadPgn', { fen: a2.fen(), ref: b.fen() });
}
// illegal input must throw in both
for (const bad of ['e5', 'Ke2', 'xx', '', 'O-O', 'Nf6', { from: 'e2', to: 'e5' }, { from: 'a7', to: 'a8' }]) {
  const t = (G) => { try { new G().move(bad); return 'ok'; } catch { return 'throw'; } };
  if (t(Mine) !== t(Ref)) fail('illegal-input', { bad, mine: t(Mine), ref: t(Ref) });
}
// lenient SAN
for (const [fen, s] of [[undefined, 'e2e4'], [undefined, 'Nf3'], [undefined, 'Ng1f3'], [undefined, 'e4+'], [undefined, 'e4!?'], ['r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', '0-0'], ['8/P6k/8/8/8/8/p6K/8 w - - 0 1', 'a8Q'], ['8/P6k/8/8/8/8/p6K/8 w - - 0 1', 'a8=N']]) {
  const t = (G) => { try { const g = fen ? new G(fen) : new G(); return g.move(s).san; } catch { return 'throw'; } };
  if (t(Mine) !== t(Ref)) fail('lenient-san', { s, mine: t(Mine), ref: t(Ref) });
}
// invalid FEN
for (const f of ['', 'junk', '8/8/8/8/8/8/8/8 w - - 0 1', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0']) {
  const t = (G) => { try { new G(f); return 'ok'; } catch { return 'throw'; } };
  if (t(Mine) !== t(Ref)) fail('fen-validate', { f, mine: t(Mine), ref: t(Ref) });
}
console.log(`games=${GAMES} plies=${plies} mismatches=${bad}`);
process.exit(bad ? 1 : 0);
