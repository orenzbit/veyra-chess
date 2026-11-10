// Decisive moments of a reviewed game: the moves that swung the game most. Pure (no DOM).
// A move's swing is how far it moved White's winning chance (whiteChanceBefore = the position's value with best play,
// whiteChanceAfter = after the move played), so a blunder by either side and a winning shot both show up.
// Book and forced moves never count. The `count` biggest swings of at least MIN_SWING points are returned in game order.

export const MIN_SWING = 15;
export const DECISIVE_COUNT = 3;

export type DecisiveMoment = {
  index: number; moveNumber: number; mover: 'white' | 'black'; san: string; bestSan: string | null;
  classification: string; moverBefore: number; moverAfter: number; swing: number;
};

const SKIP = new Set(['book', 'forced']);
const round = (n: number) => Math.round(n);

/** `history`: the game's verbose moves; `moves`: the analysis rows (index, classification, whiteChanceBefore/After, bestUci). */
export function decisiveMoments(Chess: any, history: any[], moves: any[], count = DECISIVE_COUNT): DecisiveMoment[] {
  if (!Array.isArray(history) || !Array.isArray(moves)) return [];
  const scored: Array<DecisiveMoment & { size: number }> = [];
  const game = new Chess(history[0]?.before || undefined);
  for (let i = 0; i < history.length; i++) {
    const row = moves[i]; const mv = history[i];
    const fen = game.fen();
    try { game.move({ from: mv.from, to: mv.to, promotion: mv.promotion || undefined }); } catch { break; }
    if (!row || SKIP.has(row.classification)) continue;
    // A mating move ends the game: its "after" is a win for the mover, whatever the engine reports for a finished board.
    const mates = String(mv.san || '').includes('#');
    const before = Number(row.whiteChanceBefore), after = mates ? (fen.split(' ')[1] === 'b' ? 0 : 100) : Number(row.whiteChanceAfter);
    if (!Number.isFinite(before) || !Number.isFinite(after)) continue;
    const size = Math.abs(after - before);
    if (size < MIN_SWING) continue;
    const mover = fen.split(' ')[1] === 'b' ? 'black' : 'white';
    let bestSan: string | null = null;
    const best = String(row.bestUci || '');
    if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(best) && best !== mv.from + mv.to + (mv.promotion || '')) {
      try { bestSan = new Chess(fen).move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] || undefined })?.san || null; } catch { bestSan = null; }
    }
    const moverBefore = mover === 'white' ? before : 100 - before, moverAfter = mover === 'white' ? after : 100 - after;
    scored.push({ index: i, moveNumber: Math.floor(i / 2) + 1, mover, san: mv.san, bestSan, classification: String(row.classification || ''),
      moverBefore: round(moverBefore), moverAfter: round(moverAfter), swing: round(moverAfter - moverBefore), size });
  }
  return scored.sort((a, b) => b.size - a.size || a.index - b.index).slice(0, count)
    .sort((a, b) => a.index - b.index).map(({ size, ...m }) => m);
}
