/**
 * Keeps rushed bullet games out of headline statistics unless the player opts in.
 * Pure helpers only: nothing here changes saved reports or the DNA schema, and
 * per-time-control numbers are always passed through untouched.
 */
import { buildDnaStatisticsOverview, type DnaReportLike } from "./dna-statistics.js";

export const INCLUDE_BULLET_STORAGE_KEY = "veyra_stats_include_bullet_v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function isBulletTimeClass(value: unknown): boolean {
  return typeof value === "string" && value.trim().toLowerCase() === "bullet";
}

/** Games with a missing or unknown time class are treated as non-bullet. */
export function filterGamesByTimeClass<T extends { timeClass?: unknown }>(games: readonly T[], includeBullet = false): T[] {
  return includeBullet ? [...games] : games.filter(game => !isBulletTimeClass(game?.timeClass));
}

export function loadIncludeBullet(storage?: StorageLike | null): boolean {
  try {
    const target = storage === undefined ? localStorage : storage;
    return target?.getItem(INCLUDE_BULLET_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveIncludeBullet(value: boolean, storage?: StorageLike | null): void {
  try {
    const target = storage === undefined ? localStorage : storage;
    target?.setItem(INCLUDE_BULLET_STORAGE_KEY, value ? "1" : "0");
  } catch {
    // Storage can be blocked (private mode); the toggle still works for this visit.
  }
}

/**
 * Headline numbers (games, moves, accuracy, issue rates) skip the bullet bucket
 * unless includeBullet is true. perTimeControl is the unfiltered per-bucket view.
 */
export function buildHeadlineStatistics(report: DnaReportLike | null | undefined, includeBullet = false) {
  const full = buildDnaStatisticsOverview(report);
  const headlineReport: DnaReportLike | null | undefined = includeBullet || !report
    ? report
    : { ...report, timeControls: { ...report.timeControls, bullet: undefined } };
  const headline = includeBullet ? full : buildDnaStatisticsOverview(headlineReport);
  const bulletGames = full.perTimeControl.bullet.games;
  const bulletExcluded = !includeBullet && bulletGames > 0;
  return {
    ...headline,
    perTimeControl: full.perTimeControl,
    includeBullet,
    bulletGames,
    bulletExcluded,
    onlyBulletHidden: bulletExcluded && !headline.hasData,
    hasAnyData: full.hasData,
  };
}
