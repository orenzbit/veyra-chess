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
  /** Net material (in pawns) the move gives up: the moved piece (materialSacrifice) or another piece it chose to leave hanging (passiveSacrifice). */
  sacrificedMaterial?: number;
  /** The mover's winning chance (0..100) after the best alternative to the played best move, if measured. */
  moverSecondBestChance?: number | null;
  /** The move recaptures on the square where the opponent just captured. */
  isRecapture?: boolean;
}

const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/**
 * Net material, in pawns, that a piece move gives up on its destination square: the moved piece's value,
 * minus what it captured, minus what the mover wins back by recapturing. 0 when the piece cannot be taken
 * or when the exchange is even. Pawn and king moves are never counted as sacrifices.
 */
export function materialSacrifice(Chess: new (fen?: string) => any, afterFen: string, mover: { from: string; to: string; piece?: string; captured?: string; promotion?: string | null }): number {
  const movedType = mover.promotion || mover.piece;
  if (!movedType || movedType === "p" || movedType === "k") return 0;
  const after = new Chess(afterFen);
  const captures = after.moves({ verbose: true }).filter((move: any) => move.to === mover.to && move.captured);
  if (!captures.length) return 0;
  const won = mover.captured ? PIECE_VALUE[mover.captured] || 0 : 0;
  let worst = 0;
  for (const capture of captures) {
    const reply = new Chess(afterFen);
    reply.move(capture);
    const canRecapture = reply.moves({ verbose: true }).some((move: any) => move.to === mover.to && move.captured);
    const net = PIECE_VALUE[movedType] - won - (canRecapture ? PIECE_VALUE[capture.piece] || 0 : 0);
    worst = Math.max(worst, net);
  }
  return worst;
}

/**
 * Static exchange evaluation: material, in pawns, that the side playing `capture` nets when both sides keep
 * recapturing on that square with their least valuable piece, each side free to stop when it would lose more.
 */
export function exchangeGain(Chess: new (fen?: string) => any, fen: string, capture: { from: string; to: string; captured?: string; promotion?: string | null }): number {
  const position = new Chess(fen);
  position.move({ from: capture.from, to: capture.to, promotion: capture.promotion || undefined });
  const recaptures = position.moves({ verbose: true }).filter((move: any) => move.to === capture.to && move.captured);
  const gained = PIECE_VALUE[capture.captured || ""] || 0;
  if (!recaptures.length) return gained;
  // Least valuable attacker first; the king goes last (moves() only offers it when the square is safe).
  const order = (move: any) => move.piece === "k" ? 100 : PIECE_VALUE[move.piece] ?? 99;
  const cheapest = recaptures.reduce((least: any, move: any) => order(move) < order(least) ? move : least);
  return gained - Math.max(0, exchangeGain(Chess, position.fen(), cheapest));
}

/**
 * Passive sacrifice: net material, in pawns, that the opponent wins by taking one of the mover's other pieces
 * left en prise (not the piece that just moved). Each capture is scored by a full exchange on its square, minus
 * the mover's best winning capture elsewhere afterwards and minus what the move itself captured. Only material
 * is counted, so a piece that cannot be taken because of a mate threat still counts as offered; the engine
 * decides whether the offer is sound.
 */
export function hangingMaterial(Chess: new (fen?: string) => any, afterFen: string, mover: { to: string; captured?: string }): number {
  const after = new Chess(afterFen);
  const won = mover.captured ? PIECE_VALUE[mover.captured] || 0 : 0;
  let worst = 0;
  for (const capture of after.moves({ verbose: true })) {
    // Pawns (value 1) can never reach the 2-pawn sacrifice threshold, and the moved piece is materialSacrifice()'s job.
    if (!capture.captured || capture.captured === "p" || capture.to === mover.to) continue;
    const taken = exchangeGain(Chess, afterFen, capture);
    if (taken - won < 2) continue;
    const reply = new Chess(afterFen);
    reply.move(capture);
    const replyFen = reply.fen();
    let comeback = 0;
    for (const back of reply.moves({ verbose: true })) {
      if (back.captured && back.to !== capture.to) comeback = Math.max(comeback, exchangeGain(Chess, replyFen, back));
    }
    worst = Math.max(worst, taken - comeback - won);
  }
  return worst;
}

/**
 * Passive sacrifice actually chosen by the move: hangingMaterial() of the played move minus the least material
 * any legal alternative would give up. A fork, where every move loses material, therefore does not count;
 * leaving a piece en prise when it could have been saved (e.g. ignoring an attacked knight to threaten mate) does.
 */
export function passiveSacrifice(Chess: new (fen?: string) => any, beforeFen: string, afterFen: string, mover: { from: string; to: string; captured?: string; promotion?: string | null }): number {
  const offered = hangingMaterial(Chess, afterFen, mover);
  if (offered < 2) return 0;
  let leastLoss = Infinity;
  for (const alternative of new Chess(beforeFen).moves({ verbose: true })) {
    if (alternative.from === mover.from && alternative.to === mover.to && (alternative.promotion || null) === (mover.promotion || null)) continue;
    const position = new Chess(beforeFen);
    position.move(alternative);
    const fen = position.fen();
    leastLoss = Math.min(leastLoss, Math.max(materialSacrifice(Chess, fen, alternative), hangingMaterial(Chess, fen, alternative)));
    if (leastLoss <= 0) break;
  }
  return Number.isFinite(leastLoss) ? Math.max(0, offered - leastLoss) : 0;
}

/** Keeps the review screen's move-classification thresholds in one testable place. */
export function classifyReviewMove(input: ReviewClassificationInput): string {
  const {
    drop,
    bestUci,
    playedUci,
    legalMoveCount,
    isBookMove,
    moverChanceBefore = 50,
    moverChanceAfter = 50,
    isMateMove = false,
    sacrificedMaterial = 0,
    moverSecondBestChance = null,
    isRecapture = false
  } = input;

  if (isBookMove) return "book";
  if (legalMoveCount === 1) return "forced";
  if (isMateMove) return "best";

  // Brilliant: a sound piece sacrifice (at least 2 pawns of material offered, either the moved piece or another
  // piece left hanging) that is the best or a near-best move, keeps the mover out of a losing position, and was
  // not played from an already crushing position.
  if ((bestUci === playedUci || drop <= 0.01) && sacrificedMaterial >= 2 && moverChanceAfter >= 45 && moverChanceBefore < 90) {
    return "brilliant";
  }
  if (bestUci === playedUci) {
    // Great: the only good move. Every alternative loses at least 15% winning chance; obvious recaptures excluded.
    const onlyGoodMove = typeof moverSecondBestChance === "number" && moverChanceBefore - moverSecondBestChance >= 15;
    return onlyGoodMove && !isRecapture ? "great" : "best";
  }

  // Still clearly winning after the move (≥ 92%, about +7): the lost chance is noise, never a mistake or blunder.
  const stillCrushing = moverChanceAfter >= 92;
  // Miss: was winning (≥ 70%), let at least 15% slip, but is still holding the game (≥ 42%).
  if (moverChanceBefore >= 70 && drop >= 0.15 && moverChanceAfter >= 42 && !stillCrushing) return "miss";

  // Expected-points scale (drop = lost winning chance, 0..1): excellent ≤ 2%, good ≤ 5%, inaccuracy ≤ 10%.
  if (drop <= 0.02) return "excellent";
  if (drop <= 0.05) return "good";
  if (stillCrushing) return drop >= 0.20 ? "inaccuracy" : "good";
  // Blunder: a big loss that leaves the mover worse than winning.
  if ((drop >= 0.25 && moverChanceAfter < 60) || (drop >= 0.20 && moverChanceAfter < 35)) return "blunder";
  if (drop >= 0.10) return "mistake";
  return "inaccuracy";
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

/** `alternatives`: UCI of every legal move, sent when the played move may be the best one (for "great"). */
export type ReviewEngine = (fen: string, afterFen: string, mover: ReviewHistoryMove, cachedBefore?: CachedPositionSearch, alternatives?: string[]) => Promise<any>;

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

const BOOK_EXPLANATION = { he: "מהלך תיאוריה מוכר מספר הפתיחות.", en: "A known opening-theory move." } as const;

/** The page language: setLang() keeps document.documentElement.lang in step with getLang(). */
function bookExplanation(): string {
  return BOOK_EXPLANATION[typeof document !== "undefined" && document.documentElement?.lang === "en" ? "en" : "he"];
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
    const isBookMove = isBookPrefix(history, i, openingLines);
    const cachedBefore = previousAfter?.fen === before ? previousAfter : undefined;
    const isRecapture = i > 0 && Boolean(mover.captured) && Boolean(history[i - 1].captured) && history[i - 1].to === mover.to;
    // Alternatives are only needed when the played move may be the engine's best (the "great" check);
    // recaptures can never be "great", so they skip it.
    const mayBeBest = !cachedBefore || cachedBefore.bestUci === null || cachedBefore.bestUci === playedUci;
    const alternatives = legalMoveCount > 1 && !isBookMove && !isRecapture && mayBeBest
      ? temp.moves({ verbose: true }).map((move: any) => move.from + move.to + (move.promotion || ""))
      : undefined;
    let r: any;
    try {
      r = await analyzePosition(before, afterFen, mover, cachedBefore, alternatives);
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
    // Sacrifice checks are only needed where "brilliant" is possible (best or near-best moves).
    const mayBeBrilliant = !isMateMove && (r.bestUci === playedUci || r.drop <= 0.01);
    const sacrificedMaterial = mayBeBrilliant
      ? Math.max(materialSacrifice(Chess, afterFen, { ...mover, piece: temp.get(mover.from)?.type }), passiveSacrifice(Chess, before, afterFen, mover))
      : 0;
    const classification = classifyReviewMove({
      drop: isMateMove ? 0 : r.drop,
      bestUci: r.bestUci,
      playedUci,
      legalMoveCount,
      isBookMove,
      movingPieceType: temp.get(mover.from)?.type,
      capturedPieceType: mover.captured,
      moverChanceBefore,
      moverChanceAfter,
      isMateMove,
      sacrificedMaterial,
      moverSecondBestChance: r.moverSecondBestChance ?? null,
      isRecapture
    });
    results.push({
      ...r,
      playedUci,
      classification,
      ...(classification === "book" ? { explanation: bookExplanation() } : {}),
      whiteChanceBefore: r.whiteChanceBest,
      whiteChanceAfter: r.whiteChanceAfter,
      index: i
    });
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
  // Book and forced moves are not the player's own decisions, so they do not count toward accuracy.
  // Volatility below still uses every move, because the game's swings include them.
  const judged = moves.filter(move => move.classification !== "book" && move.classification !== "forced");
  const perMove = (judged.length ? judged : moves).map(move => {
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
