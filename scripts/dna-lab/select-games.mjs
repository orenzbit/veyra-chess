// Selects the "best" games of one historical player for the engine DNA analysis, and measures the
// player's openings over every training game (openings need no engine, so the full set is cheap).
//
//   node scripts/dna-lab/select-games.mjs --bot=1 [--count=500] --out=artifacts/dna-lab/selection.json
//
// Selection rules (training games only; holdout games stay untouched for conformance tests):
//   1. Classical games: events/time controls marked blitz, rapid, bullet, online, simul, blindfold,
//      odds, casual, exhibition, Chess960, tiebreak/playoff are excluded.
//   2. At least 20 plies and a decisive or drawn result.
//   3. Half as White, half as Black (the other colour fills any shortfall).
//   4. Spread over the career: quota per decade in proportion to the qualifying games of that decade.
//   5. Within a decade, the strongest opposition first (opponent Elo when both Elos are recorded),
//      otherwise the most important events first (title matches and championships before others).
// If fewer games qualify than requested, all qualifying games are used.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { identifyGames, rosterEntry } from "./roster.mjs";

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [key, ...value] = arg.replace(/^--/, "").split("=");
  return [key, value.join("=") || "true"];
}));
const botNumber = Number(args.bot);
const requested = Number(args.count || 500);
const out = resolve(args.out || "artifacts/dna-lab/selection.json");

const FAST_EVENT = /blitz|rapid|bullet|speed|armageddon|titled|online|chess\.?com|lichess|internet|\bicc\b|playchess|simul|blind|odds|casual|exhib|consultation|960|random|freestyle|tie-?break|play-?off|thematic/i;
const MAJOR_EVENT = /\bw?ch\b|wch|world|championship|match|\bm\.|olympiad|candidates|interzonal|congress|masters/i;
const RESULTS = new Set(["1-0", "0-1", "1/2-1/2"]);

function timeControlBaseSeconds(value) {
  const match = String(value || "").match(/^(?:\d+\/)?(\d+)/);
  return match ? Number(match[1]) : null;
}
function isClassical(headers) {
  if (FAST_EVENT.test(headers.Event || "") || FAST_EVENT.test(headers.Site || "")) return false;
  const base = timeControlBaseSeconds(headers.TimeControl);
  return base === null || base >= 3600;
}
const yearOf = headers => {
  const match = String(headers.Date || "").match(/^(\d{4})/);
  return match ? Number(match[1]) : null;
};
const eloOf = value => (/^\d{3,4}$/.test(String(value || "")) ? Number(value) : null);

function opponentElo(game) {
  const white = eloOf(game.headers.WhiteElo);
  const black = eloOf(game.headers.BlackElo);
  if (white === null || black === null) return null;
  return game.color === "w" ? black : white;
}
function rankScore(game) {
  const elo = opponentElo(game);
  const major = MAJOR_EVENT.test(game.headers.Event || "") ? 1 : 0;
  return elo !== null ? elo * 10 + major : major;
}

function allocate(total, buckets) {
  const sizes = buckets.map(bucket => bucket.games.length);
  const sum = sizes.reduce((a, b) => a + b, 0);
  if (sum <= total) return sizes;
  const exact = sizes.map(size => (size / sum) * total);
  const quota = exact.map(Math.floor);
  let left = total - quota.reduce((a, b) => a + b, 0);
  const order = exact.map((value, index) => ({ index, remainder: value - Math.floor(value) })).sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of order) {
    if (left <= 0) break;
    if (quota[index] < sizes[index]) { quota[index]++; left--; }
  }
  return quota;
}

function pickColour(games, count) {
  const byDecade = new Map();
  for (const game of games) {
    const year = yearOf(game.headers);
    const decade = year === null ? "unknown" : String(Math.floor(year / 10) * 10);
    if (!byDecade.has(decade)) byDecade.set(decade, []);
    byDecade.get(decade).push(game);
  }
  const buckets = [...byDecade.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([decade, list]) => ({
    decade,
    games: list.sort((a, b) => rankScore(b) - rankScore(a) || a.chunkIndex - b.chunkIndex)
  }));
  const quota = allocate(count, buckets);
  return buckets.flatMap((bucket, index) => bucket.games.slice(0, quota[index]));
}

function openingStats(games) {
  const stats = { w: { games: 0, firstMove: {}, lines: {} }, b: { games: 0, replies: {}, lines: {} } };
  for (const game of games) {
    const side = stats[game.color];
    side.games++;
    const line = game.sans.slice(0, 8).join(" ");
    side.lines[line] = (side.lines[line] || 0) + 1;
    if (game.color === "w") side.firstMove[game.sans[0]] = (side.firstMove[game.sans[0]] || 0) + 1;
    else {
      const key = game.sans[0];
      side.replies[key] ??= {};
      side.replies[key][game.sans[1]] = (side.replies[key][game.sans[1]] || 0) + 1;
    }
  }
  const top = (counts, n) => Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([move, count]) => ({ move, count }));
  return {
    white: { games: stats.w.games, firstMoves: top(stats.w.firstMove, 6), topLines: top(stats.w.lines, 12).map(({ move, count }) => ({ line: move, count })) },
    black: {
      games: stats.b.games,
      replies: Object.fromEntries(Object.entries(stats.b.replies).sort((a, b) => Object.values(b[1]).reduce((x, y) => x + y, 0) - Object.values(a[1]).reduce((x, y) => x + y, 0)).slice(0, 6).map(([first, replies]) => [first, top(replies, 4)])),
      topLines: top(stats.b.lines, 12).map(({ move, count }) => ({ line: move, count }))
    }
  };
}

/** Share of games whose first `plies` half-moves follow one of the bot's repertoire lines for that colour. */
function repertoireCoverage(games, profile, plies = 6) {
  const lineTokens = lines => (lines || []).map(line => String(line.moves || "").replace(/\d+\.(\.\.\.)?/g, " ").split(/\s+/).filter(Boolean));
  const repertoire = { w: lineTokens(profile.openingsAsWhite), b: lineTokens(profile.openingsAsBlack) };
  const result = {};
  for (const colour of ["w", "b"]) {
    const list = games.filter(game => game.color === colour);
    const covered = list.filter(game => repertoire[colour].some(tokens => tokens.length >= plies && tokens.slice(0, plies).join(" ") === game.sans.slice(0, plies).join(" "))).length;
    result[colour === "w" ? "white" : "black"] = { games: list.length, covered, percent: list.length ? Math.round((covered / list.length) * 1000) / 10 : null };
  }
  return result;
}

const started = Date.now();
const { games, alias, profile } = await identifyGames(botNumber);
const training = games.filter(game => !game.holdout);
const holdout = games.filter(game => game.holdout);
const qualifying = training.filter(game => isClassical(game.headers) && game.plies >= 20 && RESULTS.has(game.headers.Result));
const white = qualifying.filter(game => game.color === "w");
const black = qualifying.filter(game => game.color === "b");
let whiteCount = Math.min(white.length, Math.ceil(requested / 2));
let blackCount = Math.min(black.length, requested - whiteCount);
whiteCount = Math.min(white.length, requested - blackCount);
const selected = [...pickColour(white, whiteCount), ...pickColour(black, blackCount)].sort((a, b) => a.chunkIndex - b.chunkIndex);
const elos = selected.map(opponentElo).filter(value => value !== null);
const years = selected.map(game => yearOf(game.headers)).filter(value => value !== null);

const selection = {
  bot: botNumber,
  alias,
  slug: rosterEntry(botNumber).slug,
  requested,
  createdAt: new Date().toISOString(),
  criteria: [
    "training games only (holdout games are kept for conformance tests)",
    "classical only: events/time controls marked blitz, rapid, bullet, online, simul, blindfold, odds, casual, exhibition, Chess960 or tiebreak/playoff excluded",
    "at least 20 plies and a recorded result",
    "half as White, half as Black",
    "career spread: quota per decade proportional to qualifying games",
    "within a decade: strongest opponent Elo first when recorded, otherwise title matches/championships first"
  ],
  counts: {
    identified: games.length,
    training: training.length,
    holdout: holdout.length,
    qualifying: qualifying.length,
    qualifyingWhite: white.length,
    qualifyingBlack: black.length,
    selected: selected.length,
    selectedWhite: selected.filter(game => game.color === "w").length,
    selectedBlack: selected.filter(game => game.color === "b").length
  },
  opponentElo: elos.length ? {
    gamesWithElo: elos.length,
    average: Math.round(elos.reduce((a, b) => a + b, 0) / elos.length),
    min: Math.min(...elos),
    max: Math.max(...elos)
  } : null,
  yearRange: years.length ? [Math.min(...years), Math.max(...years)] : null,
  openings: {
    training: openingStats(training),
    repertoireCoverageTraining: repertoireCoverage(training, profile),
    repertoireCoverageHoldout: repertoireCoverage(holdout, profile)
  },
  games: selected.map(game => ({
    chunkIndex: game.chunkIndex,
    color: game.color,
    year: yearOf(game.headers),
    opponentElo: opponentElo(game),
    result: game.headers.Result,
    plies: game.plies,
    pgn: game.pgn
  }))
};
await mkdir(dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(selection) + "\n");
console.log("#" + botNumber + " " + alias + ": " + selection.counts.selected + " of " + qualifying.length + " qualifying training games selected (" +
  selection.counts.selectedWhite + " White / " + selection.counts.selectedBlack + " Black); opponent Elo avg " +
  (selection.opponentElo?.average ?? "n/a") + "; years " + (selection.yearRange || []).join("-") + "; " + Math.round((Date.now() - started) / 1000) + " s");
