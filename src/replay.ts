const STANDARD_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

type ReplayMove = { from: string; to: string; promotion?: string | null; before?: string };
type ReplayChess = { move: (move: { from: string; to: string; promotion?: string }) => unknown };
type ReplayChessCtor = new (fen?: string) => ReplayChess;

// Replays from the game's real first position (a [FEN] game or a review-board move), not always the standard start.
export function positionAfterPly(ChessCtor: ReplayChessCtor, history: ReplayMove[], index: number) {
  const start = history[0]?.before;
  const c = start && start !== STANDARD_START_FEN ? new ChessCtor(start) : new ChessCtor();
  const end = Math.min(history.length, index + 1);
  for (let i = 0; i < end; i++) c.move({ from: history[i].from, to: history[i].to, promotion: history[i].promotion || undefined });
  return c;
}
