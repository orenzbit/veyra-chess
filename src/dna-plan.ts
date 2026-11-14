// DNA plan: turns a Chess DNA report into an ordered study plan of Veyra's own opening lines and
// endgame lessons. Pure (no I/O, no DOM, no clock): the caller passes the report, the repertoire
// (data/repertoire/index.js `openings`) and the endgame list (src/endgames.ts ENDGAMES), so the
// same input always gives the same plan.

export type PlanColor = "white" | "black";
export type Bilingual = { en: string; he: string };

/** The fields of buildDnaReport() (src/chess-dna.ts) this module reads. */
export interface DnaPlanReport {
  timeControls?: Record<string, {
    userMoves?: number;
    classificationCounts?: Record<string, number>;
    clock?: { clockedUserMoves?: number; lowTimeMoves?: number };
    games?: readonly { opening?: string; playerColor?: string; result?: string; accuracy?: number; userMoves?: number }[];
  }>;
}
/** One repertoire opening as data/repertoire/index.js exports it (only these fields are read). */
export interface PlanOpening { id: string; name: string; color: "w" | "b" | string; lines: readonly { id: string; name?: string; star?: boolean }[] }
/** One endgame lesson as src/endgames.ts ENDGAMES exports it. */
export interface PlanEndgame { id: string }
/** What the player already finished (optional): opening lines as "openingId:lineId", endgames by ENDGAMES id. */
export interface PlanProgress { openingLines?: readonly string[]; endgames?: readonly string[] }

export interface DnaPlanInput {
  report: DnaPlanReport | null | undefined;
  openings: readonly PlanOpening[];
  endgames: readonly PlanEndgame[];
  progress?: PlanProgress;
  /** Only this time control ("bullet" | "blitz" | "rapid"); all of them when omitted. */
  timeClass?: string;
  /** How many openings / endgame lessons the plan may hold (defaults 3 and 3). */
  maxOpenings?: number;
  maxEndgames?: number;
}

export interface PlanOpeningStep {
  kind: "opening";
  openingId: string;
  lineIds: string[];
  /** "play": the player's own side of this opening; "face": an opening opponents play against them. */
  role: "play" | "face";
  games: number;
  losses: number;
  averageAccuracy: number | null;
  reason: Bilingual;
}
export interface PlanEndgameStep { kind: "endgame"; endgameId: string; reason: Bilingual }
export type PlanStep = PlanOpeningStep | PlanEndgameStep;

export interface DnaPlan {
  version: 1;
  games: number;
  /** false under DNA_PLAN_MIN_GAMES analysed games: the plan is then a default order, not a diagnosis. */
  personalised: boolean;
  focus: "openings" | "endgames" | "balanced";
  steps: PlanStep[];
  /** The first step whose content is not finished yet, or null when everything is done. */
  next: PlanStep | null;
  signals: { blundersPer100: number | null; missesPer100: number | null; lowTimePer100: number | null; longGameLosses: number; longGames: number };
}

export const DNA_PLAN_MIN_GAMES = 5;
/** A game with at least this many of the player's own moves is treated as one that reached an endgame. */
export const LONG_GAME_MOVES = 40;
/** Veyra's endgame lessons, easiest first (src/endgames.ts ids). Unknown ids are skipped. */
const TECHNIQUE_ORDER = ["kq-k", "kr-k", "kp-k-win", "lucena", "kbb-k"];
const DEFENCE_ORDER = ["philidor"];

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const limit = (value: number | undefined, fallback: number) => (value === undefined || !Number.isFinite(value) ? fallback : Math.max(0, Math.floor(value)));
const UNKNOWN = new Set(["", "?", "unknown", "פתיחה לא זוהתה", "לא ידוע"]);

/**
 * Lower-case words without apostrophes or accents; "defence" is spelled "defense"; a final "s" is dropped from
 * words over 3 letters, so the possessives chess.com writes without an apostrophe ("Alekhines Defense",
 * "Petrovs Defense") meet the repertoire's names ("Alekhine Defense", "Petrov Defense").
 */
export function normalizeOpeningName(name: unknown): string {
  return String(name ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bdefence\b/g, "defense")
    .trim()
    .split(" ")
    .map(word => (word.length > 3 ? word.replace(/s$/, "") : word))
    .join(" ");
}

/**
 * The repertoire opening a DNA opening name belongs to: the opening whose normalised name is the longest
 * word-prefix of the game's name ("Queens Gambit Declined Chigorin Defense" -> Queen's Gambit Declined,
 * not Queen's Gambit). null when nothing matches.
 */
export function matchOpening(name: unknown, openings: readonly PlanOpening[]): PlanOpening | null {
  const target = normalizeOpeningName(name);
  if (!target || UNKNOWN.has(String(name ?? "").trim())) return null;
  let best: PlanOpening | null = null; let bestLength = 0;
  for (const opening of openings) {
    const key = normalizeOpeningName(opening.name);
    if (!key) continue;
    if (!(target === key || target.startsWith(key + " "))) continue;
    // Longest name wins; equal names are broken by id so the repertoire's order never matters.
    if (key.length > bestLength || (key.length === bestLength && best && cmp(opening.id, best.id) < 0)) { best = opening; bestLength = key.length; }
  }
  return best;
}

const words = (text: string) => new Set(normalizeOpeningName(text).split(" ").filter(word => word.length > 2));

/**
 * Up to `count` lines: those sharing words with the games' variation names first (a variation met in more
 * games counts more), then starred, then file order.
 */
export function pickLines(opening: PlanOpening, variationNames: readonly string[], count = 2): string[] {
  const own = words(opening.name);
  const wanted = new Map<string, number>();
  for (const name of variationNames) for (const word of words(name)) if (!own.has(word)) wanted.set(word, (wanted.get(word) || 0) + 1);
  const scored = opening.lines.map((line, index) => {
    let overlap = 0;
    for (const word of words(line.name || line.id.replace(/-/g, " "))) overlap += wanted.get(word) || 0;
    return { id: line.id, overlap, star: line.star ? 1 : 0, index };
  });
  scored.sort((a, b) => b.overlap - a.overlap || b.star - a.star || a.index - b.index);
  return scored.slice(0, count).map(line => line.id);
}

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const per100 = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);

function isLoss(result: unknown, color: string): boolean {
  const value = String(result ?? "").trim().toLowerCase();
  if (value === "loss" || value === "lose" || value === "lost") return true;
  return color === "white" ? value === "0-1" : value === "1-0";
}

export function buildDnaPlan(input: DnaPlanInput): DnaPlan {
  const maxOpenings = limit(input.maxOpenings, 3);
  const maxEndgames = limit(input.maxEndgames, 3);
  const doneLines = new Set(input.progress?.openingLines || []);
  const doneEndgames = new Set(input.progress?.endgames || []);
  const buckets = Object.entries(input.report?.timeControls || {})
    .filter(([key]) => !input.timeClass || key === input.timeClass)
    .sort(([a], [b]) => cmp(a, b))
    .map(([, bucket]) => bucket || {});

  let moves = 0, blunders = 0, misses = 0, clocked = 0, lowTime = 0, longGames = 0, longGameLosses = 0, games = 0;
  const byOpening = new Map<string, { opening: PlanOpening; role: "play" | "face"; games: number; losses: number; accSum: number; accN: number; variations: string[] }>();
  for (const bucket of buckets) {
    moves += Number(bucket.userMoves) || 0;
    blunders += Number(bucket.classificationCounts?.blunder) || 0;
    misses += Number(bucket.classificationCounts?.miss) || 0;
    clocked += Number(bucket.clock?.clockedUserMoves) || 0;
    lowTime += Number(bucket.clock?.lowTimeMoves) || 0;
    for (const game of bucket.games || []) {
      const color = String(game?.playerColor ?? "").trim().toLowerCase();
      if (color !== "white" && color !== "black") continue;
      games += 1;
      const lost = isLoss(game.result, color);
      if ((Number(game.userMoves) || 0) >= LONG_GAME_MOVES) { longGames += 1; if (lost) longGameLosses += 1; }
      const opening = matchOpening(game.opening, input.openings);
      if (!opening) continue;
      const role: "play" | "face" = (opening.color === "w") === (color === "white") ? "play" : "face";
      const key = opening.id + "|" + role;
      const row = byOpening.get(key) || { opening, role, games: 0, losses: 0, accSum: 0, accN: 0, variations: [] };
      row.games += 1; if (lost) row.losses += 1;
      // Only a real number counts as accuracy (null or "" is no data, not 0%).
      if (typeof game.accuracy === "number" && Number.isFinite(game.accuracy)) { row.accSum += Math.max(0, Math.min(100, game.accuracy)); row.accN += 1; }
      row.variations.push(String(game.opening));
      byOpening.set(key, row);
    }
  }

  const personalised = games >= DNA_PLAN_MIN_GAMES;
  const blundersPer100 = per100(blunders, moves), missesPer100 = per100(misses, moves), lowTimePer100 = per100(lowTime, clocked);

  // Openings: most damage first. Weight = losses + games × (1 − accuracy), so a frequent opening played badly
  // outranks a one-off loss; without accuracy data only losses count. Ties: more games, then id (stable).
  // Under DNA_PLAN_MIN_GAMES no opening is diagnosed: a few games are noise, not a pattern.
  const ranked = !personalised ? [] : [...byOpening.values()].map(row => {
    const averageAccuracy = row.accN ? Math.round((row.accSum / row.accN) * 10) / 10 : null;
    const weight = row.losses + (row.accN ? row.games * (1 - row.accSum / row.accN / 100) : 0);
    return { ...row, averageAccuracy, weight };
  }).sort((a, b) => b.weight - a.weight || b.games - a.games || cmp(a.opening.id, b.opening.id) || cmp(a.role, b.role));

  const allOpeningSteps: PlanOpeningStep[] = ranked.map(row => {
    const name = row.opening.name;
    const lossPct = pct(row.losses, row.games);
    const acc = row.averageAccuracy === null ? "" : `, ${row.averageAccuracy}% accuracy`;
    const accHe = row.averageAccuracy === null ? "" : `, דיוק ${row.averageAccuracy}%`;
    const reason: Bilingual = row.role === "play"
      ? { en: `You played the ${name} in ${row.games} games and lost ${row.losses} (${lossPct}%${acc}).`,
          he: `שיחקת ${name} ב-${row.games} משחקים והפסדת ${row.losses} (${lossPct}%${accHe}).` }
      : { en: `Opponents played the ${name} against you in ${row.games} games; you lost ${row.losses} (${lossPct}%${acc}).`,
          he: `יריבים שיחקו נגדך ${name} ב-${row.games} משחקים; הפסדת ${row.losses} (${lossPct}%${accHe}).` };
    return { kind: "opening", openingId: row.opening.id, lineIds: pickLines(row.opening, row.variations), role: row.role,
      games: row.games, losses: row.losses, averageAccuracy: row.averageAccuracy, reason };
  });
  const openingDone = (step: PlanOpeningStep) => step.lineIds.length > 0 && step.lineIds.every(id => doneLines.has(step.openingId + ":" + id));
  // Finished openings move behind unfinished ones before the cap, like the endgame lessons below.
  const openingSteps = allOpeningSteps.filter(step => !openingDone(step)).concat(allOpeningSteps.filter(openingDone)).slice(0, maxOpenings);

  // Endgames: defence first when long games are lost; winning technique first otherwise. Missed wins raise
  // the technique lessons' reason; nothing here invents a phase the report does not carry.
  const known = new Set(input.endgames.map(eg => eg.id));
  const defendFirst = personalised && longGames > 0 && longGameLosses / longGames >= 0.5;
  const order = (defendFirst ? [...DEFENCE_ORDER, ...TECHNIQUE_ORDER] : [...TECHNIQUE_ORDER, ...DEFENCE_ORDER]).filter(id => known.has(id));
  const endgameSteps: PlanEndgameStep[] = order.filter(id => !doneEndgames.has(id)).concat(order.filter(id => doneEndgames.has(id)))
    .slice(0, maxEndgames).map(endgameId => {
      const defence = DEFENCE_ORDER.includes(endgameId);
      const reason: Bilingual = !personalised
        ? { en: "A core endgame every player needs; it comes early in the default order.", he: "סיום בסיסי שכל שחקן צריך; הוא מופיע מוקדם בסדר הרגיל." }
        : defence
          ? { en: `You lost ${longGameLosses} of ${longGames} long games (${LONG_GAME_MOVES}+ of your moves): holding a worse ending saves points.`,
              he: `הפסדת ${longGameLosses} מתוך ${longGames} משחקים ארוכים (${LONG_GAME_MOVES}+ מסעים שלך): הגנה בסיום נחות מצילה נקודות.` }
          : missesPer100 !== null && missesPer100 >= 1
            ? { en: `You missed a win ${missesPer100} times per 100 moves: converting a won ending turns those into points.`,
                he: `החמצת ניצחון ${missesPer100} פעמים ל-100 מסעים: מימוש סיום מנוצח הופך אותן לנקודות.` }
            : { en: "Winning technique: turn an extra piece or pawn into a full point.", he: "טכניקת ניצחון: להפוך כלי או רגלי עודף לנקודה מלאה." };
      return { kind: "endgame", endgameId, reason };
    });

  // Interleave by focus: openings first when they cost more than endgames, else endgames first.
  const openingLoss = openingSteps.reduce((sum, step) => sum + step.losses, 0);
  const focus: DnaPlan["focus"] = !personalised ? "balanced" : (defendFirst && longGameLosses > openingLoss) ? "endgames" : openingSteps.length ? "openings" : "endgames";
  const steps: PlanStep[] = [];
  const first: PlanStep[] = focus === "endgames" ? endgameSteps : openingSteps;
  const second: PlanStep[] = focus === "endgames" ? openingSteps : endgameSteps;
  for (let i = 0; i < Math.max(first.length, second.length); i += 1) {
    if (first[i]) steps.push(first[i]);
    if (second[i]) steps.push(second[i]);
  }
  const done = (step: PlanStep) => step.kind === "endgame" ? doneEndgames.has(step.endgameId) : openingDone(step);
  return {
    version: 1,
    games,
    personalised,
    focus,
    steps,
    next: steps.find(step => !done(step)) || null,
    signals: { blundersPer100, missesPer100, lowTimePer100, longGameLosses, longGames },
  };
}
