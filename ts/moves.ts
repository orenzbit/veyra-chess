// Veyra puzzle moves — TS port (src/puzzle-moves.ts). Mirrors puzzle-moves.mjs.
import { sqToRC, inBoard, validUCI } from './board.js';
import type { Grid } from './board.js';

function isWhite(p: string): boolean { return p === p.toUpperCase(); }

export function applyUCIMove(grid: Grid, uci: string, turn: string): { grid: Grid; captured: string | null; promo: string | null } {
  if (!validUCI(uci)) throw new Error('bad UCI: ' + uci);
  const from = sqToRC(uci.slice(0, 2)), to = sqToRC(uci.slice(2, 4));
  const promo = uci.length === 5 ? uci[4] : null;
  const piece = grid[from.r][from.f];
  if (!piece) throw new Error('empty source ' + uci.slice(0, 2));
  if (turn === 'w' ? !isWhite(piece) : isWhite(piece)) throw new Error('wrong side to move');
  const dest = grid[to.r][to.f];
  if (dest && (isWhite(dest) === isWhite(piece))) throw new Error('own piece on target');
  if (dest && dest.toLowerCase() === 'k') throw new Error('cannot capture the king');
  const p = piece.toLowerCase();
  const dr = to.r - from.r, df = to.f - from.f;
  const adr = Math.abs(dr), adf = Math.abs(df);
  let finalPiece = piece;
  if (p === 'p') {
    const dir = turn === 'w' ? -1 : 1;
    const startRow = turn === 'w' ? 6 : 1;
    const lastRow = turn === 'w' ? 0 : 7;
    if (df === 0 && !dest) {
      const one = dr === dir;
      const two = dr === 2 * dir && from.r === startRow && !grid[from.r + dir][from.f];
      if (!one && !two) throw new Error('bad pawn push');
    } else if (adf === 1 && dr === dir && dest && isWhite(dest) !== isWhite(piece)) {
      // capture ok
    } else throw new Error('bad pawn move');
    if (to.r === lastRow) {
      if (!promo) throw new Error('promotion letter required');
      finalPiece = turn === 'w' ? promo.toUpperCase() : promo;
    } else if (promo) throw new Error('promotion off last rank');
  } else if (p === 'n') {
    if (!((adr === 1 && adf === 2) || (adr === 2 && adf === 1))) throw new Error('bad knight move');
    if (promo) throw new Error('knight promotion flag');
  } else if (p === 'k') {
    if (Math.max(adr, adf) !== 1) throw new Error('castling not supported here');
    if (promo) throw new Error('king promotion flag');
  } else {
    const diag = adr === adf && adr > 0;
    const straight = (adr === 0 && adf > 0) || (adf === 0 && adr > 0);
    if (p === 'b' && !diag) throw new Error('bad bishop move');
    if (p === 'r' && !straight) throw new Error('bad rook move');
    if (p === 'q' && !(diag || straight)) throw new Error('bad queen move');
    if (promo) throw new Error('slider promotion flag');
    const sr = Math.sign(dr), sf = Math.sign(df);
    let r = from.r + sr, f = from.f + sf;
    while (r !== to.r || f !== to.f) {
      if (!inBoard(r, f) || grid[r][f]) throw new Error('path blocked');
      r += sr; f += sf;
    }
  }
  const ng = grid.map((row) => row.slice());
  ng[to.r][to.f] = finalPiece;
  ng[from.r][from.f] = null;
  return { grid: ng, captured: dest || null, promo: promo || null };
}
