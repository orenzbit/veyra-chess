export interface ReviewMoveMetrics {
  index: number;
  classification?: string;
  whiteChanceBefore?: number;
  whiteChanceAfter?: number;
}

export interface ReviewClassificationInput {
  drop: number;
  bestUci: string | null;
  playedUci: string;
  legalMoveCount: number;
  isBookMove: boolean;
  movingPieceType?: string;
  capturedPieceType?: string;
}

/** Keeps the review screen's existing move-classification thresholds in one testable place. */
export function classifyReviewMove(input: ReviewClassificationInput): string {
  const { drop, bestUci, playedUci, legalMoveCount, isBookMove, movingPieceType, capturedPieceType } = input;
  let classification = "good";
  if (isBookMove) classification = "book";
  else if (legalMoveCount === 1) classification = "forced";
  else if (bestUci === playedUci) classification = "best";
  else if (drop <= 0.02) classification = "great";
  else if (drop <= 0.05) classification = "excellent";
  else if (drop <= 0.10) classification = "good";
  else if (drop <= 0.20) classification = "inaccuracy";
  else if (drop <= 0.35) classification = "mistake";
  else classification = "blunder";

  // Preserve the review screen's existing Brilliant heuristic.
  if (drop <= 0.01 &&
      movingPieceType && ["q", "r", "b", "n"].includes(movingPieceType) &&
      capturedPieceType && ["q", "r", "b", "n"].includes(capturedPieceType)) {
    classification = "brilliant";
  }
  return classification;
}

const GAME_RATING_ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [60, 800], [70, 1200], [75, 1400], [80, 1600], [85, 1800],
  [88, 2000], [90, 2200], [93, 2400], [95, 2600], [97, 2800], [99, 3000]
];
const VOLATILITY_WINDOW = 4;
const VOLATILITY_NORMALIZER = 25;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

function harmonicMean(values: number[]): number {
  if (!values.length) return 0;
  const safe = values.map(value => Math.max(0.001, value));
  return values.length / safe.reduce((sum, value) => sum + 1 / value, 0);
}

export function computeAccuracyForSide(moves: ReviewMoveMetrics[]): number {
  if (!moves.length) return 0;
  const perMove = moves.map(move => {
    const before = move.index % 2 === 0
      ? (move.whiteChanceBefore ?? 50)
      : (100 - (move.whiteChanceBefore ?? 50));
    const after = move.index % 2 === 0
      ? (move.whiteChanceAfter ?? 50)
      : (100 - (move.whiteChanceAfter ?? 50));
    const loss = Math.max(0, before - after);
    return clamp(103.1668 * Math.exp(-0.04354 * loss) - 3.1669, 0, 100);
  });
  const winAfter = moves.map(move => move.index % 2 === 0
    ? (move.whiteChanceAfter ?? 50)
    : (100 - (move.whiteChanceAfter ?? 50)));
  const windowStds: number[] = [];
  for (let i = 0; i < winAfter.length; i++) {
    windowStds.push(stddev(winAfter.slice(Math.max(0, i - (VOLATILITY_WINDOW - 1)), i + 1)));
  }
  const avgStd = windowStds.reduce((sum, value) => sum + value, 0) / Math.max(1, windowStds.length);
  const weight = clamp(avgStd / VOLATILITY_NORMALIZER, 0, 1);
  const mean = perMove.reduce((sum, value) => sum + value, 0) / perMove.length;
  const harmonic = harmonicMean(perMove);
  return Math.round((weight * harmonic + (1 - weight) * mean) * 10) / 10;
}

export function computeGameRating(accuracy: number): number {
  if (accuracy <= GAME_RATING_ANCHORS[0][0]) return Math.round(GAME_RATING_ANCHORS[0][1]);
  for (let i = 1; i < GAME_RATING_ANCHORS.length; i++) {
    const [x1, y1] = GAME_RATING_ANCHORS[i - 1];
    const [x2, y2] = GAME_RATING_ANCHORS[i];
    if (accuracy <= x2) {
      const t = (accuracy - x1) / (x2 - x1);
      return Math.round(y1 + t * (y2 - y1));
    }
  }
  const n = GAME_RATING_ANCHORS.length;
  const [x1, y1] = GAME_RATING_ANCHORS[n - 2];
  const [x2, y2] = GAME_RATING_ANCHORS[n - 1];
  return Math.round(y2 + ((accuracy - x2) / (x2 - x1)) * (y2 - y1));
}

export function computeReviewSummary(moves: ReviewMoveMetrics[]) {
  const counts: { white: Record<string, number>; black: Record<string, number> } = { white: {}, black: {} };
  for (const move of moves) {
    const side = move.index % 2 === 0 ? "white" : "black";
    const classification = move.classification || "good";
    counts[side][classification] = (counts[side][classification] || 0) + 1;
  }
  const whiteMoves = moves.filter(move => move.index % 2 === 0);
  const blackMoves = moves.filter(move => move.index % 2 === 1);
  const whiteAcc = computeAccuracyForSide(whiteMoves);
  const blackAcc = computeAccuracyForSide(blackMoves);
  return {
    counts,
    whiteAcc,
    blackAcc,
    whiteRating: computeGameRating(whiteAcc),
    blackRating: computeGameRating(blackAcc)
  };
}
