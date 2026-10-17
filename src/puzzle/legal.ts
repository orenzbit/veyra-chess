// Legality layer (TS port of src/puzzle-legal.mjs). Mirrors it exactly.
import { rcToSq, kingSquare } from './board.js';
import type { Grid } from './board.js';
import { applyUCIMove } from './moves.js';
import { isAttacked } from './tactics.js';

export function inCheck(grid: Grid, color: string): boolean {
  const ks = kingSquare(grid, color);
  if (!ks) return false;
  return isAttacked(grid, ks, color === 'w' ? 'b' : 'w');
}

export function legalMoves(grid: Grid, turn: string): string[] {
  const out: string[] = [];
  for (let fr = 0; fr < 8; fr++) for (let ff = 0; ff < 8; ff++) {
    const piece = grid[fr][ff];
    if (!piece || (turn === 'w') !== (piece === piece.toUpperCase())) continue;
    for (let tr = 0; tr < 8; tr++) for (let tf = 0; tf < 8; tf++) {
      const base = rcToSq(fr, ff) + rcToSq(tr, tf);
      const promos = piece.toLowerCase() === 'p' && (tr === 0 || tr === 7) ? ['q', 'r', 'b', 'n'] : [''];
      for (const promo of promos) {
        const uci = base + promo;
        let next: Grid;
        try { next = applyUCIMove(grid, uci, turn).grid; } catch (e) { continue; }
        if (!inCheck(next, turn)) out.push(uci);
      }
    }
  }
  return out;
}

export function isCheckmate(grid: Grid, turn: string): boolean {
  return inCheck(grid, turn) && legalMoves(grid, turn).length === 0;
}
