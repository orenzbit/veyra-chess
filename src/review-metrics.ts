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
  moverChanceBefore?: number;
  moverChanceAfter?: number;
  isMateMove?: boolean;
}

/** Keeps the review screen's move-classification thresholds in one testable place. */
export function classifyReviewMove(input: ReviewClassificationInput): string {
  const {
    drop,
    bestUci,
    playedUci,
    legalMoveCount,
    isBookMove,
    movingPieceType,
    capturedPieceType,
    moverChanceBefore = 50,
    moverChanceAfter = 50,
    isMateMove = false
  } = input;

  if (isBookMove) return "book";
  if (legalMoveCount === 1) return "forced";
  if (isMateMove || bestUci === playedUci) return "best";

  // Brilliant heuristic: tactical piece sacrifice or sharp winning capture
  if (drop <= 0.01 &&
      movingPieceType && ["q", "r", "b", "n"].includes(movingPieceType) &&
      capturedPieceType && ["q", "r", "b", "n"].includes(capturedPieceType)) {
    return "brilliant";
  }

  // Miss: Had a clearly winning advantage or tactical conversion, but squandered it
  const hadWinningAdvantage = moverChanceBefore >= 68;
  const lostAdvantage = (moverChanceBefore - moverChanceAfter) >= 20 && moverChanceAfter <= 55;
  if (hadWinningAdvantage && lostAdvantage && drop >= 0.20) {
    return "miss";
  }

  // Expected-points scale (drop = lost winning chance, 0..1): excellent ≤ 2%, good ≤ 5%,
  // inaccuracy ≤ 10%, mistake ≤ 20%, blunder above. "great" keeps Veyra's extra band for near-best moves.
  if (drop <= 0.01) return "great";
  if (drop <= 0.02) return "excellent";
  if (drop <= 0.05) return "good";
  if (drop <= 0.10) return "inaccuracy";
  if (drop <= 0.20) return "mistake";
  return "blunder";
}

export interface ReviewHistoryMove {
  from: string;
  to: string;
  san: string;
  promotion?: string | null;
  captured?: string;
}

export interface CachedPositionSearch {
  fen: string;
  score: number;
  bestUci: string | null;
  depth: number;
}

export type ReviewEngine = (fen: string, afterFen: string, mover: ReviewHistoryMove, cachedBefore?: CachedPositionSearch) => Promise<any>;

export interface AnalyzeGameOptions {
  /** Rules constructor: window.ChessLib.Chess in the browser, rules-src/chess-compat.mjs in Node. */
  Chess: new (fen?: string) => any;
  analyzePosition: ReviewEngine;
  openingLines: Set<string>;
  /** Runs before each move is analyzed; throw to stop (e.g. the DNA owner check). */
  beforeMove?: (index: number) => void;
  onMoveAnalyzed?: (index: number, total: number) => void;
}

export class ReviewAnalysisError extends Error {
  moveIndex: number;
  reason: "illegal-move" | "engine";
  cause?: unknown;
  constructor(message: string, moveIndex: number, reason: "illegal-move" | "engine", cause?: unknown) {
    super(message);
    this.name = "ReviewAnalysisError";
    this.moveIndex = moveIndex;
    this.reason = reason;
    this.cause = cause;
  }
}

export function isBookPrefix(history: ReviewHistoryMove[], index: number, openingLines: Set<string>): boolean {
  const sequence = history.slice(0, index + 1).map(move => move.san).join(" ");
  for (const line of openingLines) if (line === sequence || line.startsWith(sequence + " ")) return true;
  return false;
}

/**
 * The per-move review loop shared by the Review screen, Chess DNA and scripts/review-benchmark.mjs,
 * so the benchmark measures exactly the code the app runs.
 */
export async function analyzeGameMoves(history: ReviewHistoryMove[], options: AnalyzeGameOptions): Promise<any[]> {
  const { Chess, analyzePosition, openingLines, beforeMove, onMoveAnalyzed } = options;
  const results: any[] = [];
  const replay = new Chess();
  // The position after move i is the position before move i+1, so its search is passed on instead of repeated.
  let previousAfter: CachedPositionSearch | undefined;
  for (let i = 0; i < history.length; i++) {
    beforeMove?.(i);
    const mover = history[i];
    const before = replay.fen();
    const temp = new Chess(before);
    const legalMoveCount = temp.moves().length;
    const playedUci = mover.from + mover.to + (mover.promotion || "");
    const afterState = new Chess(before);
    if (!afterState.move({ from: mover.from, to: mover.to, promotion: mover.promotion || undefined })) {
      throw new ReviewAnalysisError("Illegal move at ply " + (i + 1), i, "illegal-move");
    }
    const afterFen = afterState.fen();
    let r: any;
    try {
      r = await analyzePosition(before, afterFen, mover, previousAfter?.fen === before ? previousAfter : undefined);
    } catch (error) {
      throw new ReviewAnalysisError("Engine analysis failed at ply " + (i + 1) + ": " + String((error as Error)?.message || error), i, "engine", error);
    }
    previousAfter = Number.isFinite(r.afterScore)
      ? { fen: afterFen, score: r.afterScore, bestUci: r.afterBestUci ?? null, depth: r.afterDepth }
      : undefined;
    const moverColor = before.split(" ")[1] === "w" ? "w" : "b";
    const moverChanceBefore = moverColor === "w" ? r.whiteChanceBest : 100 - r.whiteChanceBest;
    const moverChanceAfter = moverColor === "w" ? r.whiteChanceAfter : 100 - r.whiteChanceAfter;
    const isMateMove = Boolean(r.isMateMove || afterState.isCheckmate());
    const classification = classifyReviewMove({
      drop: isMateMove ? 0 : r.drop,
      bestUci: r.bestUci,
      playedUci,
      legalMoveCount,
      isBookMove: isBookPrefix(history, i, openingLines),
      movingPieceType: temp.get(mover.from)?.type,
      capturedPieceType: mover.captured,
      moverChanceBefore,
      moverChanceAfter,
      isMateMove
    });
    results.push({ ...r, playedUci, classification, whiteChanceBefore: r.whiteChanceBest, whiteChanceAfter: r.whiteChanceAfter, index: i });
    replay.move({ from: mover.from, to: mover.to, promotion: mover.promotion || undefined });
    onMoveAnalyzed?.(i, history.length);
  }
  return results;
}

const GAME_RATING_ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [15, 100],
  [25, 150],
  [35, 200],
  [45, 300],
  [55, 500],
  [65, 800],
  [72, 1100],
  [78, 1400],
  [84, 1700],
  [89, 2000],
  [93, 2300],
  [96, 2600],
  [98, 2800],
  [99.5, 3000]
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
    // Exponential CAPS accuracy formula: steep penalty on big drops
    return clamp(103.1668 * Math.exp(-0.065 * loss) - 3.1669, 0, 100);
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
