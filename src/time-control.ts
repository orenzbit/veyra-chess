/**
 * Pure time-control parser and "base minutes" aggregation.
 *
 * Kept dependency-free so Node checks can transpile and import it on its own.
 * It never changes the Bullet/Blitz/Rapid classes: those come from the provider's
 * time_class and are handled in chess-dna.ts. This module only splits games by
 * the exact starting clock for an additional, descriptive table.
 */

export interface ParsedTimeControl {
  baseSeconds: number;
  incrementSeconds: number;
}

/**
 * "seconds": PGN TimeControl / provider raw values ("180+2", "600").
 * "minutes": the normalized label stored per archived game ("3+2", "0:30+0", "10+0").
 * "auto": integers are seconds; a decimal base ("0.5+0") is minutes.
 * "m:ss" bases ("0:30+0") are minutes in every unit. Increments are always seconds.
 */
export type TimeControlUnit = "auto" | "seconds" | "minutes";

export type BaseMinuteBucketId = "1" | "3" | "5" | "10" | "other";

export const BASE_MINUTE_BUCKET_IDS: readonly BaseMinuteBucketId[] = ["1", "3", "5", "10", "other"];

export const BASE_MINUTE_BUCKET_LABELS: Record<BaseMinuteBucketId, { he: string; en: string }> = {
  "1": { he: "1 דקה", en: "1 min" },
  "3": { he: "3 דקות", en: "3 min" },
  "5": { he: "5 דקות", en: "5 min" },
  "10": { he: "10 דקות", en: "10 min" },
  other: { he: "אחר", en: "Other" },
};

// Inclusive upper bounds, in seconds.
const BUCKET_LIMITS: ReadonlyArray<readonly [BaseMinuteBucketId, number]> = [
  ["1", 90],
  ["3", 210],
  ["5", 450],
  ["10", 750],
];

const NUMBER_PATTERN = /^(\d+(?:\.\d+)?)(?::(\d{1,2}))?(?:\+(\d+(?:\.\d+)?))?$/;
const DAILY_PATTERN = /^(\d+)\/(\d+)$/;

function finiteNonNegative(value: unknown): number | null {
  const number = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) && number >= 0 ? number : null;
}

function fromObject(value: Record<string, unknown>): ParsedTimeControl | null {
  // Lichess clock objects use {initial, increment}; the games API also uses {limit, increment}. All in seconds.
  const base = finiteNonNegative(value.initial ?? value.limit ?? value.base ?? value.baseSeconds);
  const increment = finiteNonNegative(value.increment ?? value.incrementSeconds ?? 0);
  if (base === null || increment === null || (base === 0 && increment === 0)) return null;
  return { baseSeconds: base, incrementSeconds: increment };
}

/**
 * Returns null for anything that is not a single, positive clock setting:
 * "", "-", "?", garbage and multi-period controls such as "40/7200:3600".
 * Daily/correspondence "1/259200" returns the seconds per turn as baseSeconds.
 */
export function parseTimeControl(value: unknown, unit: TimeControlUnit = "auto"): ParsedTimeControl | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0
      ? { baseSeconds: unit === "minutes" ? value * 60 : value, incrementSeconds: 0 }
      : null;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) return fromObject(value as Record<string, unknown>);
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text === "-" || text === "?") return null;

  const daily = text.match(DAILY_PATTERN);
  if (daily) {
    const perTurn = Number(daily[2]);
    return Number(daily[1]) > 0 && perTurn > 0 ? { baseSeconds: perTurn, incrementSeconds: 0 } : null;
  }

  const match = text.match(NUMBER_PATTERN);
  if (!match) return null;
  const first = Number(match[1]);
  const clockPart = match[2] === undefined ? null : Number(match[2]);
  if (clockPart !== null && clockPart >= 60) return null;
  const increment = match[3] === undefined ? 0 : Number(match[3]);
  // "m:ss" is always minutes and seconds; plain numbers follow the unit.
  const minutesBase = clockPart !== null || unit === "minutes" || (unit === "auto" && match[1].includes("."));
  const baseSeconds = minutesBase ? first * 60 + (clockPart ?? 0) : first;
  if (!Number.isFinite(baseSeconds) || !Number.isFinite(increment) || (baseSeconds === 0 && increment === 0)) return null;
  return { baseSeconds, incrementSeconds: increment };
}

function isParsed(value: unknown): value is ParsedTimeControl {
  return Boolean(value) && typeof value === "object" && typeof (value as ParsedTimeControl).baseSeconds === "number";
}

export function baseSecondsBucket(baseSeconds: number): BaseMinuteBucketId {
  if (!Number.isFinite(baseSeconds) || baseSeconds < 0) return "other";
  for (const [bucket, limit] of BUCKET_LIMITS) if (baseSeconds <= limit) return bucket;
  return "other";
}

/** Accepts an already parsed control, or anything parseTimeControl accepts. Unknown values fall into "other". */
export function baseMinuteBucket(value: unknown, unit: TimeControlUnit = "auto"): BaseMinuteBucketId {
  const parsed = isParsed(value) ? value : parseTimeControl(value, unit);
  return parsed ? baseSecondsBucket(parsed.baseSeconds) : "other";
}

export interface BaseMinuteGameInput {
  timeControlLabel?: unknown;
  result?: unknown;
  accuracy?: unknown;
  userMoves?: unknown;
}

export interface BaseMinuteRow {
  bucket: BaseMinuteBucketId;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  unknownResults: number;
  winPct: number | null;
  drawPct: number | null;
  lossPct: number | null;
  accuracyGames: number;
  averageAccuracy: number | null;
  moves: number;
  /** Games whose time control is missing or unparseable. They are counted in "other" only. */
  unknownTimeControl: number;
}

export interface BaseMinuteTable {
  version: 1;
  totalGames: number;
  rows: BaseMinuteRow[];
}

const round1 = (value: number) => Math.round(value * 10) / 10;

function emptyRow(bucket: BaseMinuteBucketId): BaseMinuteRow {
  return {
    bucket, games: 0, wins: 0, draws: 0, losses: 0, unknownResults: 0,
    winPct: null, drawPct: null, lossPct: null,
    accuracyGames: 0, averageAccuracy: null, moves: 0, unknownTimeControl: 0,
  };
}

/**
 * Splits games by base minutes. Percentages use games with a known result;
 * average accuracy uses only games with a valid accuracy (0-100).
 * Missing/unparseable time controls are counted inside "other" and reported
 * separately in unknownTimeControl.
 */
export function buildBaseMinuteTable(games: readonly BaseMinuteGameInput[], unit: TimeControlUnit = "minutes"): BaseMinuteTable {
  const rows = new Map<BaseMinuteBucketId, BaseMinuteRow>(BASE_MINUTE_BUCKET_IDS.map(id => [id, emptyRow(id)]));
  const accuracySums = new Map<BaseMinuteBucketId, number>();
  let totalGames = 0;
  for (const game of games || []) {
    if (!game || typeof game !== "object") continue;
    const parsed = parseTimeControl(game.timeControlLabel, unit);
    const row = rows.get(parsed ? baseSecondsBucket(parsed.baseSeconds) : "other") as BaseMinuteRow;
    totalGames++;
    row.games++;
    if (!parsed) row.unknownTimeControl++;
    if (game.result === "win") row.wins++;
    else if (game.result === "draw") row.draws++;
    else if (game.result === "loss") row.losses++;
    else row.unknownResults++;
    const accuracy = typeof game.accuracy === "number" ? game.accuracy : NaN;
    if (Number.isFinite(accuracy) && accuracy >= 0 && accuracy <= 100) {
      row.accuracyGames++;
      accuracySums.set(row.bucket, (accuracySums.get(row.bucket) || 0) + accuracy);
    }
    const moves = Number(game.userMoves);
    if (Number.isFinite(moves) && moves > 0) row.moves += Math.floor(moves);
  }
  for (const row of rows.values()) {
    const known = row.wins + row.draws + row.losses;
    if (known) {
      row.winPct = round1((row.wins / known) * 100);
      row.drawPct = round1((row.draws / known) * 100);
      row.lossPct = round1((row.losses / known) * 100);
    }
    if (row.accuracyGames) row.averageAccuracy = round1((accuracySums.get(row.bucket) || 0) / row.accuracyGames);
  }
  return { version: 1, totalGames, rows: BASE_MINUTE_BUCKET_IDS.map(id => rows.get(id) as BaseMinuteRow) };
}

interface ReportSectionLike {
  games?: unknown;
}

/**
 * Builds the table for a freshly generated DNA report. The report's per-game
 * entries carry result, accuracy and own-move counts but not the time-control
 * label, so labels are looked up from the analyzed games by fingerprint. The
 * same games as the Bullet/Blitz/Rapid cards are counted, so totals match.
 */
export function buildReportBaseMinuteTable(
  report: { timeControls?: Record<string, ReportSectionLike | undefined> } | null | undefined,
  sourceGames: ReadonlyArray<{ fingerprint?: unknown; timeControlLabel?: unknown }>,
): BaseMinuteTable {
  const labels = new Map<string, unknown>();
  for (const game of sourceGames || []) {
    if (typeof game?.fingerprint === "string") labels.set(game.fingerprint, game.timeControlLabel);
  }
  const inputs: BaseMinuteGameInput[] = [];
  for (const section of Object.values(report?.timeControls || {})) {
    const entries = Array.isArray(section?.games) ? section.games : [];
    for (const entry of entries as Array<Record<string, unknown>>) {
      if (!entry || typeof entry !== "object") continue;
      inputs.push({
        timeControlLabel: labels.get(String(entry.fingerprint)),
        result: entry.result,
        accuracy: entry.accuracy,
        userMoves: entry.userMoves,
      });
    }
  }
  return buildBaseMinuteTable(inputs, "minutes");
}

function count(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
}

function percent(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? round1(value) : null;
}

/** Defensive read of a saved (server-stored) table. Returns null when the report has no usable table. */
export function normalizeBaseMinuteTable(value: unknown): BaseMinuteTable | null {
  const source = value as { rows?: unknown } | null | undefined;
  if (!source || typeof source !== "object" || !Array.isArray(source.rows)) return null;
  const byBucket = new Map<string, Record<string, unknown>>();
  for (const row of source.rows as Array<Record<string, unknown>>) {
    if (row && typeof row === "object" && typeof row.bucket === "string") byBucket.set(row.bucket, row);
  }
  let totalGames = 0;
  const rows = BASE_MINUTE_BUCKET_IDS.map(bucket => {
    const row = byBucket.get(bucket) || {};
    const safe: BaseMinuteRow = {
      bucket,
      games: count(row.games), wins: count(row.wins), draws: count(row.draws), losses: count(row.losses),
      unknownResults: count(row.unknownResults),
      winPct: percent(row.winPct), drawPct: percent(row.drawPct), lossPct: percent(row.lossPct),
      accuracyGames: count(row.accuracyGames),
      averageAccuracy: percent(row.averageAccuracy),
      moves: count(row.moves),
      unknownTimeControl: count(row.unknownTimeControl),
    };
    totalGames += safe.games;
    return safe;
  });
  return { version: 1, totalGames, rows };
}
