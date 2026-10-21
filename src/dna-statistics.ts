/**
 * Shared statistics read model for all features built on Chess DNA.
 *
 * This module intentionally derives only metrics the server currently verifies
 * against persisted per-game analyses. It does not store a second copy of DNA
 * data, run engine analysis, or treat unverified opening/clock metadata as truth.
 */
export type DnaTimeClass = "bullet" | "blitz" | "rapid";

export interface DnaReportSection {
  count?: number;
  averageAccuracy?: number | null;
  userMoves?: number;
  classificationCounts?: Record<string, number>;
  issueRatesPer100Moves?: Record<string, number>;
  games?: unknown[];
}

export interface DnaReportLike {
  schemaVersion?: number;
  engineVersion?: string;
  timeControls?: Partial<Record<DnaTimeClass, DnaReportSection>>;
}

const TIME_CLASSES: readonly DnaTimeClass[] = ["bullet", "blitz", "rapid"];
const CLASSES = ["best", "brilliant", "great", "excellent", "good", "book", "forced", "inaccuracy", "mistake", "blunder"] as const;

function finiteNonNegative(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function roundedRate(count: number, denominator: number): number {
  return denominator > 0 ? Math.round((count / denominator) * 1000) / 10 : 0;
}

/**
 * Aggregate verified DNA report sections without re-running or duplicating
 * per-game analysis. A null accuracy means there are no analyzed games.
 */
export function buildDnaStatisticsOverview(report: DnaReportLike | null | undefined) {
  const controls = report?.timeControls;
  const perTimeControl = {} as Record<DnaTimeClass, {
    games: number;
    averageAccuracy: number | null;
    userMoves: number;
    classificationCounts: Record<string, number>;
    issueRatesPer100Moves: Record<string, number>;
    sampleIsSmall: boolean;
  }>;

  let totalGames = 0;
  let totalUserMoves = 0;
  const classificationCounts: Record<string, number> = Object.fromEntries(CLASSES.map(name => [name, 0]));
  let weightedAccuracy = 0;
  let accuracyGames = 0;

  for (const timeClass of TIME_CLASSES) {
    const section = controls?.[timeClass] || {};
    const games = Math.min(25, Math.floor(finiteNonNegative(section.count)));
    const userMoves = Math.floor(finiteNonNegative(section.userMoves));
    const averageAccuracyValue = section.averageAccuracy;
    const averageAccuracy = typeof averageAccuracyValue === "number" &&
      Number.isFinite(averageAccuracyValue) && averageAccuracyValue >= 0 && averageAccuracyValue <= 100 && games > 0
      ? Math.round(averageAccuracyValue * 10) / 10
      : null;
    const counts: Record<string, number> = {};
    for (const name of CLASSES) {
      counts[name] = Math.floor(finiteNonNegative(section.classificationCounts?.[name]));
      classificationCounts[name] += counts[name];
    }
    const issueRatesPer100Moves = {
      inaccuracy: roundedRate(counts.inaccuracy, userMoves),
      mistake: roundedRate(counts.mistake, userMoves),
      blunder: roundedRate(counts.blunder, userMoves),
    };

    perTimeControl[timeClass] = {
      games,
      averageAccuracy,
      userMoves,
      classificationCounts: counts,
      issueRatesPer100Moves,
      sampleIsSmall: games > 0 && games < 5,
    };
    totalGames += games;
    totalUserMoves += userMoves;
    if (averageAccuracy !== null) {
      weightedAccuracy += averageAccuracy * games;
      accuracyGames += games;
    }
  }

  return {
    schemaVersion: Number.isInteger(report?.schemaVersion) ? Number(report?.schemaVersion) : null,
    engineVersion: typeof report?.engineVersion === "string" ? report.engineVersion : null,
    totalGames,
    totalUserMoves,
    averageAccuracy: accuracyGames ? Math.round((weightedAccuracy / accuracyGames) * 10) / 10 : null,
    classificationCounts,
    issueRatesPer100Moves: {
      inaccuracy: roundedRate(classificationCounts.inaccuracy, totalUserMoves),
      mistake: roundedRate(classificationCounts.mistake, totalUserMoves),
      blunder: roundedRate(classificationCounts.blunder, totalUserMoves),
    },
    perTimeControl,
    hasData: totalGames > 0,
  };
}
