// Copying a chess.js-style game together with its move history. A copy built from the FEN alone
// forgets every earlier move, so the move table, repetition draws and the review PGN break.

const STANDARD_START_FEN_PREFIX = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';

/** A fresh game with the same move history. Replays from/to/promotion, which is ~10× faster than
 * re-parsing SAN. Starts from the standard position, or from the game's own start position
 * (history[0].before) when it began from a custom FEN. */
export function copyGameWithHistory(ChessCtor: any, source: any): any {
  const moves = source.history({ verbose: true });
  // With no moves yet, the current position is the start position.
  const startFen = String(moves.length ? moves[0].before || '' : source.fen());
  const custom = startFen && !startFen.startsWith(STANDARD_START_FEN_PREFIX);
  const copy = custom ? new ChessCtor(startFen) : new ChessCtor();
  for (const move of moves) copy.move({ from: move.from, to: move.to, promotion: move.promotion || undefined });
  return copy;
}
