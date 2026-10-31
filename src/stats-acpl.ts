/**
 * Average centipawn loss (ACPL) for the signed-in user's side, from the games in the saved Chess DNA report.
 *
 * Only games analyzed after ACPL existed carry an `acpl` value (copied from the analysis summary's
 * whiteAcpl/blackAcpl for the user's colour). Older games have none and are not counted, never guessed.
 */
export interface AcplReportLike {
  timeControls?: Record<string, { games?: unknown[] } | undefined> | null;
}

export interface AcplStats {
  /** Mean of the per-game ACPL values, one decimal; null when no game has one. */
  average: number | null;
  /** Games that have an ACPL value. */
  games: number;
  /** All games in the report. */
  totalGames: number;
}

export function buildAcplStats(report: AcplReportLike | null | undefined): AcplStats {
  let sum = 0;
  let games = 0;
  let totalGames = 0;
  for (const section of Object.values(report?.timeControls || {})) {
    const list = Array.isArray(section?.games) ? section.games : [];
    for (const game of list) {
      if (!game || typeof game !== "object") continue;
      totalGames++;
      const value = (game as { acpl?: unknown }).acpl;
      if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1000) {
        sum += value;
        games++;
      }
    }
  }
  return { average: games ? Math.round((sum / games) * 10) / 10 : null, games, totalGames };
}

/** "—" for a missing value (old analyses), otherwise one decimal. */
export function formatAcpl(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(1) : "—";
}
