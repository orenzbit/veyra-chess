/**
 * Chess DNA selection contract.
 *
 * Only explicit, supported time-class metadata is accepted here. Do not infer
 * a Bullet/Blitz/Rapid bucket from elapsed game duration: it is not a reliable
 * substitute for the platform's time-class metadata.
 */

export type DnaTimeClass = "bullet" | "blitz" | "rapid";
export type DnaGameSource = "chesscom" | "lichess" | "demo" | string;

export interface DnaCandidateGame {
  id: string;
  source: DnaGameSource;
  date: string;
  playedAt?: string;
  pgn: string;
  timeClass: string;
  timeControlLabel?: string;
  playerColorKnown?: boolean;
}

export interface DnaSelection {
  selected: Record<DnaTimeClass, DnaCandidateGame[]>;
  counts: {
    fetched: number;
    excludedDemo: number;
    excludedInvalid: number;
    excludedUnknownTimeClass: number;
    duplicates: number;
    eligible: number;
    selected: Record<DnaTimeClass, number>;
  };
}

const TIME_CLASSES: readonly DnaTimeClass[] = ["bullet", "blitz", "rapid"];

export function normalizeDnaTimeClass(value: unknown): DnaTimeClass | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return TIME_CLASSES.includes(normalized as DnaTimeClass)
    ? normalized as DnaTimeClass
    : null;
}

/**
 * Stable, whitespace-normalized PGN identity input.
 * The caller should hash this with SHA-256 for persisted cache keys.
 * This intentionally preserves headers and move text: it avoids silently
 * treating materially different records as identical.
 */
export function normalizePgnForDnaFingerprint(pgn: unknown): string {
  if (typeof pgn !== "string") return "";
  return pgn
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .join("\n");
}

function validDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const time = Date.parse(value + "T00:00:00Z");
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) return "";
  return value;
}

/**
 * Pick up to N newest unique real games per supported time class.
 * A fingerprint of normalized PGN is used for dedupe across providers/IDs.
 * Unknown/classical/daily games are deliberately excluded, not guessed.
 */
export function selectLatestDnaGames(
  candidates: readonly DnaCandidateGame[],
  limitPerClass = 25,
): DnaSelection {
  const limit = Number.isFinite(limitPerClass)
    ? Math.max(0, Math.min(25, Math.floor(limitPerClass)))
    : 25;
  const selected: Record<DnaTimeClass, DnaCandidateGame[]> = {
    bullet: [],
    blitz: [],
    rapid: [],
  };
  const seenFingerprints = new Set<string>();
  const counts = {
    fetched: candidates.length,
    excludedDemo: 0,
    excludedInvalid: 0,
    excludedUnknownTimeClass: 0,
    duplicates: 0,
    eligible: 0,
    selected: { bullet: 0, blitz: 0, rapid: 0 } as Record<DnaTimeClass, number>,
  };

  const ordered = [...candidates].sort((a, b) => {
    const aTime = typeof a.playedAt === "string" ? Date.parse(a.playedAt) : NaN;
    const bTime = typeof b.playedAt === "string" ? Date.parse(b.playedAt) : NaN;
    if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) return bTime - aTime;
    const dateOrder = validDate(b.date).localeCompare(validDate(a.date));
    return dateOrder || String(a.id || "").localeCompare(String(b.id || ""));
  });

  for (const game of ordered) {
    if (game.source === "demo" || String(game.id || "").startsWith("demo:") || game.id === "demo-opponent-gamma") {
      counts.excludedDemo++;
      continue;
    }
    const timeClass = normalizeDnaTimeClass(game.timeClass);
    if (!timeClass) {
      counts.excludedUnknownTimeClass++;
      continue;
    }
    if (!game.id || !validDate(game.date) || !normalizePgnForDnaFingerprint(game.pgn) || game.playerColorKnown === false) {
      counts.excludedInvalid++;
      continue;
    }

    const fingerprint = normalizePgnForDnaFingerprint(game.pgn);
    if (seenFingerprints.has(fingerprint)) {
      counts.duplicates++;
      continue;
    }
    seenFingerprints.add(fingerprint);
    counts.eligible++;

    if (selected[timeClass].length < limit) selected[timeClass].push(game);
  }

  for (const timeClass of TIME_CLASSES) counts.selected[timeClass] = selected[timeClass].length;
  return { selected, counts };
}

export const DNA_ENGINE_VERSION = "chessy-ai-fast-v2-depth16-node250000-scoring-2026-10-26";
export const DNA_ANALYSIS_SCHEMA_VERSION = 2;
export const DNA_REPORT_SCHEMA_VERSION = 2;

export interface DnaAnalyzedGame extends DnaCandidateGame {
  fingerprint: string;
  playerColor: "white" | "black";
  opening?: string;
  result?: "win" | "loss" | "draw" | "unknown";
  analysis: {
    moves: Array<{ index: number; classification: string; clockSeconds?: number | null }>;
    summary: { whiteAcc: number; blackAcc: number };
  };
}

const MOVE_CLASSES = ["best", "brilliant", "great", "excellent", "good", "book", "forced", "inaccuracy", "mistake", "blunder"] as const;

function parseClockSeconds(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  const text = value.trim();
  if (!text) return null;
  const parts = text.split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some(part => !/^\d+(?:\.\d+)?$/.test(part))) return null;
  const numbers = parts.map(Number);
  if (numbers.some(number => !Number.isFinite(number) || number < 0)) return null;
  if (numbers.slice(1).some(number => number >= 60)) return null;
  return parts.length === 3 ? numbers[0] * 3600 + numbers[1] * 60 + numbers[2] : numbers[0] * 60 + numbers[1];
}

function parseBaseTimeSeconds(label: unknown): number | null {
  if (typeof label !== "string") return null;
  const match = label.trim().match(/^(\d+)(?::(\d{2}))?(?:\+\d+)?$/);
  if (!match) return null;
  const first = Number(match[1]);
  const second = match[2] === undefined ? 0 : Number(match[2]);
  const seconds = match[2] === undefined ? first * 60 : first * 60 + second;
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}


/**
 * Aggregate only the user's own moves. Values are descriptive summaries of
 * the existing engine's output, not official Chess.com/Lichess ratings.
 */
export function buildDnaReport(games: readonly DnaAnalyzedGame[], generatedAt = new Date().toISOString()) {
  const timeControls = {
    bullet: { games: [] as any[], count: 0, averageAccuracy: null as number | null, userMoves: 0, classificationCounts: {} as Record<string, number>, issueRatesPer100Moves: {} as Record<string, number>, openings: [] as Array<{ name: string; games: number }>, clock: { availableGames: 0, clockedUserMoves: 0, lowTimeMoves: 0, lowTimeRatePer100Moves: null as number | null } },
    blitz: { games: [] as any[], count: 0, averageAccuracy: null as number | null, userMoves: 0, classificationCounts: {} as Record<string, number>, issueRatesPer100Moves: {} as Record<string, number>, openings: [] as Array<{ name: string; games: number }>, clock: { availableGames: 0, clockedUserMoves: 0, lowTimeMoves: 0, lowTimeRatePer100Moves: null as number | null } },
    rapid: { games: [] as any[], count: 0, averageAccuracy: null as number | null, userMoves: 0, classificationCounts: {} as Record<string, number>, issueRatesPer100Moves: {} as Record<string, number>, openings: [] as Array<{ name: string; games: number }>, clock: { availableGames: 0, clockedUserMoves: 0, lowTimeMoves: 0, lowTimeRatePer100Moves: null as number | null } },
  };
  for (const timeClass of TIME_CLASSES) {
    const bucket = timeControls[timeClass];
    const matching = games.filter(game => normalizeDnaTimeClass(game.timeClass) === timeClass);
    const accuracyValues: number[] = [];
    const openingCounts = new Map<string, number>();
    for (const game of matching) {
      const accuracy = game.playerColor === "white" ? game.analysis.summary.whiteAcc : game.analysis.summary.blackAcc;
      const safeAccuracy = Number(accuracy);
      if (!Number.isFinite(safeAccuracy) || safeAccuracy < 0 || safeAccuracy > 100) continue;
      accuracyValues.push(safeAccuracy);
      const ownParity = game.playerColor === "white" ? 0 : 1;
      const ownMoves = game.analysis.moves.filter(move => Number.isInteger(move.index) && move.index >= 0 && move.index % 2 === ownParity);
      bucket.userMoves += ownMoves.length;
      for (const classification of MOVE_CLASSES) bucket.classificationCounts[classification] = (bucket.classificationCounts[classification] || 0);
      for (const move of ownMoves) {
        const classification = MOVE_CLASSES.includes(move.classification as typeof MOVE_CLASSES[number]) ? move.classification : "unknown";
        bucket.classificationCounts[classification] = (bucket.classificationCounts[classification] || 0) + 1;
      }
      const opening = typeof game.opening === "string" && game.opening.trim() ? game.opening.trim() : "פתיחה לא זוהתה";
      openingCounts.set(opening, (openingCounts.get(opening) || 0) + 1);
      const baseTimeSeconds = parseBaseTimeSeconds(game.timeControlLabel);
      const clockedOwnMoves = baseTimeSeconds === null ? [] : ownMoves.filter(move => parseClockSeconds(move.clockSeconds) !== null);
      const lowTimeThreshold = baseTimeSeconds === null ? null : Math.max(10, baseTimeSeconds * 0.1);
      const lowTimeMoves = lowTimeThreshold === null ? 0 : clockedOwnMoves.filter(move => (parseClockSeconds(move.clockSeconds) as number) <= lowTimeThreshold).length;
      bucket.clock.availableGames += clockedOwnMoves.length ? 1 : 0;
      bucket.clock.clockedUserMoves += clockedOwnMoves.length;
      bucket.clock.lowTimeMoves += lowTimeMoves;
      bucket.games.push({
        fingerprint: game.fingerprint,
        date: game.date,
        playerColor: game.playerColor,
        result: game.result || "unknown",
        opening,
        accuracy: Math.round(safeAccuracy * 10) / 10,
        userMoves: ownMoves.length,
        clockedUserMoves: clockedOwnMoves.length,
        lowTimeMoves,
      });
    }
    bucket.count = bucket.games.length;
    bucket.averageAccuracy = accuracyValues.length
      ? Math.round((accuracyValues.reduce((sum, value) => sum + value, 0) / accuracyValues.length) * 10) / 10
      : null;
    for (const classification of ["inaccuracy", "mistake", "blunder"]) {
      bucket.issueRatesPer100Moves[classification] = bucket.userMoves
        ? Math.round(((bucket.classificationCounts[classification] || 0) / bucket.userMoves) * 1000) / 10
        : 0;
    }
    bucket.openings = Array.from(openingCounts.entries())
      .map(([name, count]) => ({ name, games: count }))
      .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name))
      .slice(0, 10);
    bucket.clock.lowTimeRatePer100Moves = bucket.clock.clockedUserMoves
      ? Math.round((bucket.clock.lowTimeMoves / bucket.clock.clockedUserMoves) * 1000) / 10
      : null;
  }
  return {
    schemaVersion: DNA_REPORT_SCHEMA_VERSION,
    engineVersion: DNA_ENGINE_VERSION,
    generatedAt,
    timeControls,
    sampleQuality: Object.fromEntries(TIME_CLASSES.map(timeClass => [
      timeClass,
      { count: timeControls[timeClass].count, target: 25, sufficientForPatterns: timeControls[timeClass].count >= 5 },
    ])),
  };
}
