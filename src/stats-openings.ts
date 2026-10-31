/**
 * Win rate per opening, derived from the games listed in the saved Chess DNA report.
 *
 * Each report game already carries the archived game's opening name (as written in the game's PGN headers),
 * the result from the user's side and the user's accuracy. No ECO code is stored, so none is invented here.
 */
export interface OpeningReportGame {
  opening?: unknown;
  result?: unknown;
  accuracy?: unknown;
}

export interface OpeningReportLike {
  timeControls?: Record<string, { games?: unknown[] } | undefined> | null;
}

export interface OpeningStatsRow {
  /** Display name as stored in the report; "" for the grouped unknown row (the UI supplies the localized label). */
  name: string;
  isUnknown: boolean;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  /** Games whose result is win, draw or loss; the percentages below are shares of this number. */
  decided: number;
  winPct: number | null;
  drawPct: number | null;
  lossPct: number | null;
  averageAccuracy: number | null;
}

export const OPENING_MIN_GAMES = 2;
export const OPENING_DEFAULT_ROWS = 10;
// The archive writes this Hebrew placeholder when a game has neither an Opening header nor an ECO code.
const UNKNOWN_NAMES = new Set(["", "?", "unknown", "פתיחה לא זוהתה", "לא ידוע"]);

function pct(count: number, total: number): number | null {
  return total > 0 ? Math.round((count / total) * 1000) / 10 : null;
}

/** All games across the report's time controls, in a stable order. */
function collectGames(report: OpeningReportLike | null | undefined): OpeningReportGame[] {
  const games: OpeningReportGame[] = [];
  for (const key of Object.keys(report?.timeControls || {}).sort()) {
    const list = report?.timeControls?.[key]?.games;
    if (!Array.isArray(list)) continue;
    for (const game of list) if (game && typeof game === "object") games.push(game as OpeningReportGame);
  }
  return games;
}

/**
 * One row per opening with at least `minGames` games, sorted by games (then name, so the order is stable).
 * Results are already from the user's side in the report. Games with an unknown result count as games but not
 * toward win/draw/loss percentages. Missing or placeholder opening names are grouped into one unknown row.
 */
export function buildOpeningStats(report: OpeningReportLike | null | undefined, minGames = OPENING_MIN_GAMES): OpeningStatsRow[] {
  const groups = new Map<string, { name: string; isUnknown: boolean; games: number; wins: number; draws: number; losses: number; accuracySum: number; accuracyGames: number }>();
  for (const game of collectGames(report)) {
    const rawName = typeof game.opening === "string" ? game.opening.trim().replace(/\s+/g, " ") : "";
    const isUnknown = UNKNOWN_NAMES.has(rawName.toLowerCase());
    const key = isUnknown ? "\u0000unknown" : rawName.toLowerCase();
    let group = groups.get(key);
    if (!group) {
      group = { name: isUnknown ? "" : rawName, isUnknown, games: 0, wins: 0, draws: 0, losses: 0, accuracySum: 0, accuracyGames: 0 };
      groups.set(key, group);
    }
    group.games++;
    if (game.result === "win") group.wins++;
    else if (game.result === "draw") group.draws++;
    else if (game.result === "loss") group.losses++;
    const accuracy = game.accuracy;
    if (typeof accuracy === "number" && Number.isFinite(accuracy) && accuracy >= 0 && accuracy <= 100) {
      group.accuracySum += accuracy;
      group.accuracyGames++;
    }
  }
  return Array.from(groups.values())
    .filter(group => group.games >= minGames)
    .map(group => {
      const decided = group.wins + group.draws + group.losses;
      return {
        name: group.name,
        isUnknown: group.isUnknown,
        games: group.games,
        wins: group.wins,
        draws: group.draws,
        losses: group.losses,
        decided,
        winPct: pct(group.wins, decided),
        drawPct: pct(group.draws, decided),
        lossPct: pct(group.losses, decided),
        averageAccuracy: group.accuracyGames ? Math.round((group.accuracySum / group.accuracyGames) * 10) / 10 : null
      };
    })
    .sort((a, b) => b.games - a.games || Number(a.isUnknown) - Number(b.isUnknown) || a.name.localeCompare(b.name));
}
