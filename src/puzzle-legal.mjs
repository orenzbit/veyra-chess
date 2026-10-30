// Legality layer for seed validation: check detection, legal-move filter,
// checkmate. Built on the same attack + pseudo-legal rules as the rest of src/.
import { sqToRC, rcToSq, kingSquare } from './puzzle-board.mjs';
import { applyUCIMove } from './puzzle-moves.mjs';
import { isAttacked } from './puzzle-tactics.mjs';

export function inCheck(grid, color) {
  const ks = kingSquare(grid, color);
  if (!ks) return false;
  return isAttacked(grid, ks, color === 'w' ? 'b' : 'w');
}

export function legalMoves(grid, turn) {
  const out = [];
  for (let fr = 0; fr < 8; fr++) for (let ff = 0; ff < 8; ff++) {
    const piece = grid[fr][ff];
    if (!piece || (turn === 'w') !== (piece === piece.toUpperCase())) continue;
    for (let tr = 0; tr < 8; tr++) for (let tf = 0; tf < 8; tf++) {
      const base = rcToSq(fr, ff) + rcToSq(tr, tf);
      const promos = piece.toLowerCase() === 'p' && (tr === 0 || tr === 7) ? ['q', 'r', 'b', 'n'] : [''];
      for (const promo of promos) {
        const uci = base + promo;
        let next;
        try { next = applyUCIMove(grid, uci, turn).grid; } catch (e) { continue; }
        if (!inCheck(next, turn)) out.push(uci);
      }
    }
  }
  return out;
}

export function isCheckmate(grid, turn) {
  return inCheck(grid, turn) && legalMoves(grid, turn).length === 0;
}
