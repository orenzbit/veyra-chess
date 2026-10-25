// Historical-player DNA analysis for the bot-lab loop.
//
// Analyses every identified game of one historical source with the app's own review engine
// (analyzeGameMoves + the Chessy worker, the same code as Chess DNA) and aggregates the player's
// own moves into a style report. Bots are addressed by roster number; reports use the alias only.
//
//   node scripts/historical-dna.mjs --bot=1 --list
//       -> JSON {bot, alias, slug, games, shardCount, shards[]} for the CI matrix
//   node scripts/historical-dna.mjs --bot=1 --print-id
//       -> internal profile id (for existing check scripts that need HISTORICAL_BOT_IDS)
//   node scripts/historical-dna.mjs --bot=1 --shard-index=0 --shard-count=17 --out=artifacts/dna [--limit=N]
//       -> artifacts/dna/shard-0.jsonl, one line per analysed game
//   node scripts/historical-dna.mjs --bot=1 --merge --in=artifacts/dna [--report=docs/bots/01-.../DNA.md]
//       -> aggregates every shard file; writes DNA.md (human tables + an embedded dna-data JSON block)
//
// Player identity and the training/holdout split are taken from scripts/build-historical-legend-bots.mjs
// (same name matching, same "every 10th PGN game is holdout" rule), so the DNA describes exactly the
// games the bot profile was built from. The DNA profile uses training games only; holdout games are
// summarised separately for conformance checks.
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createEngine } from "./review-benchmark.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const GAMES_PER_SHARD = 250;
export const ROSTER = [
  "The Lightning Strategist",
  "The Tactical Hammer",
  "The Immortal Gambit",
  "The Precision Machine",
  "The Quiet Squeeze",
  "The Dynamic Storm",
  "The Open-Board Virtuoso",
  "The Tactical Speedster",
  "The Fearless Attacker",
  "The Magician from Riga",
  "Cuban Endgame Maestro",
  "השחקן הטוב בכל הזמנים"
];
const SLUG_OVERRIDES = { 12: "best-of-all-time" };
const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const OPENING_PLIES = 24;
const ENDGAME_NON_PAWN_MATERIAL = 26;
const LINE_PLIES = 8;
const SOUND_SACRIFICE_MAX_DROP = 0.05;

function arg(name) {
  const hit = process.argv.find(value => value === "--" + name || value.startsWith("--" + name + "="));
  if (!hit) return undefined;
  return hit.includes("=") ? hit.slice(hit.indexOf("=") + 1) : true;
}

export function botSlug(number) {
  const alias = ROSTER[number - 1];
  const tail = SLUG_OVERRIDES[number] || alias.toLowerCase().replace(/^the\s+/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return String(number).padStart(2, "0") + "-" + tail;
}

// The generator's `sources` array is plain data; read it from the generator so identity rules live in one place.
async function loadSources() {
  const text = await readFile(join(root, "scripts/build-historical-legend-bots.mjs"), "utf8");
  const start = text.search(/^const sources = \[/m);
  const end = text.indexOf("\n];", start);
  if (start < 0 || end < 0) throw new Error("Could not locate the sources array in build-historical-legend-bots.mjs");
  const literal = text.slice(text.indexOf("[", start), end + 2);
  return new Function('"use strict"; return (' + literal + ");")();
}

export async function resolveBot(number) {
  if (!Number.isInteger(number) || number < 1 || number > ROSTER.length) throw new Error("--bot must be 1-" + ROSTER.length);
  const alias = ROSTER[number - 1];
  const source = (await loadSources()).find(entry => entry.displayName === alias);
  if (!source) throw new Error("No generator source has display name for bot #" + number);
  return { number, alias, slug: botSlug(number), source };
}

// --- identity and split: copied from build-historical-legend-bots.mjs so the games match the profile exactly ---
const normalize = value => String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean).sort().join(" ");
function matchesPlayerName(value, source) {
  const raw = String(value || "");
  if (/[/:]/.test(raw)) return false;
  const actual = normalize(raw).split(" ").filter(Boolean);
  const surname = normalize(source.surname);
  if (!actual.includes(surname)) return false;
  const actualGiven = actual.filter(token => token !== surname);
  return source.aliases.some(alias => {
    const aliasTokens = normalize(alias).split(" ").filter(Boolean);
    if (aliasTokens.every(token => actual.includes(token))) return true;
    const givenNames = aliasTokens.filter(token => token !== surname);
    return actualGiven.some(abbreviation => givenNames.some(given => given.startsWith(abbreviation)));
  });
}
function parseHeaders(pgn) {
  const headers = {};
  const re = /^\[([A-Za-z0-9_]+)\s+"((?:[^"\\]|\\.)*)"\]\s*$/gm;
  let match;
  while ((match = re.exec(pgn))) headers[match[1]] = match[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  return headers;
}

async function loadRules() {
  return (await import(pathToFileURL(join(root, "public/vendor/veyra-rules/chess-compat.js")).href)).Chess;
}

// Header-only identification (fast): which PGN games belong to the player, in file order, with the
// generator's split. Full move parsing happens later, per shard, with the same validity rules.
export async function identifyGames(bot) {
  const pgnText = await readFile(join(root, bot.source.file), "utf8");
  const chunks = pgnText.split(/(?=^\[Event\s+")/m).filter(chunk => /^\[Event\s+"/m.test(chunk));
  const candidates = [];
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    const headers = parseHeaders(chunk);
    const whiteIsPlayer = matchesPlayerName(headers.White, bot.source);
    const blackIsPlayer = matchesPlayerName(headers.Black, bot.source);
    if (whiteIsPlayer === blackIsPlayer) continue;
    candidates.push({ chunkIndex, chunk, headers, color: whiteIsPlayer ? "w" : "b" });
  }
  return { totalChunks: chunks.length, candidates };
}

// Same validity rules as the generator: the PGN must load and have at least 8 plies.
function parseCandidate(candidate, Chess) {
  let game;
  try { game = new Chess(); game.loadPgn(candidate.chunk, { sloppy: true }); } catch { return { error: "load-failed" }; }
  const moves = game.history({ verbose: true });
  if (moves.length < 8) return { error: "too-short" };
  const { headers, color, chunkIndex } = candidate;
  const result = headers.Result || "*";
  const won = (color === "w" && result === "1-0") || (color === "b" && result === "0-1");
  const lost = (color === "w" && result === "0-1") || (color === "b" && result === "1-0");
  return {
    chunkIndex,
    split: chunkIndex % 10 === 0 ? "holdout" : "training",
    color,
    outcome: won ? "win" : lost ? "loss" : result === "1/2-1/2" ? "draw" : "unfinished",
    year: Number((String(headers.Date || "").match(/^(\d{4})/) || [])[1]) || null,
    eco: /^[A-E]\d{2}$/.test(headers.ECO || "") ? headers.ECO : null,
    moves
  };
}

// --- per-move features ---
function materialFromFen(fen) {
  const board = fen.split(" ")[0];
  const m = { w: 0, b: 0, wNonPawn: 0, bNonPawn: 0, wQ: 0, bQ: 0 };
  for (const ch of board) {
    const lower = ch.toLowerCase();
    if (!(lower in PIECE_VALUE)) continue;
    const side = ch === lower ? "b" : "w";
    m[side] += PIECE_VALUE[lower];
    if (lower !== "p" && lower !== "k") m[side + "NonPawn"] += PIECE_VALUE[lower];
    if (lower === "q") m[side + "Q"] += 1;
  }
  return m;
}
function phaseOf(ply, material) {
  if (material.wNonPawn + material.bNonPawn <= ENDGAME_NON_PAWN_MATERIAL) return "endgame";
  return ply < OPENING_PLIES ? "opening" : "middlegame";
}

export async function analyseGame(entry, { Chess, analyzeGameMoves, computeReviewSummary, analyzePosition, openingLines }, gameNumber, botNumber) {
  const history = entry.moves;
  const started = performance.now();
  const results = await analyzeGameMoves(history, { Chess, analyzePosition, openingLines });
  const ms = Math.round(performance.now() - started);
  const fens = [];
  const replay = new Chess();
  fens.push(replay.fen());
  for (const move of history) { replay.move({ from: move.from, to: move.to, promotion: move.promotion || undefined }); fens.push(replay.fen()); }
  const own = entry.color;
  const opp = own === "w" ? "b" : "w";
  const phases = { opening: {}, middlegame: {}, endgame: {} };
  const ownMovesByPhase = { opening: 0, middlegame: 0, endgame: 0 };
  const f = { captures: 0, checks: 0, pawnMoves: 0, endgameKingMoves: 0, endgameMoves: 0, trades: 0, sacrifices: 0, soundSacrifices: 0, ownMoves: 0 };
  let castle = null;
  let queensOffPly = null;
  for (let i = 0; i < history.length; i++) {
    const after = materialFromFen(fens[i + 1]);
    if (queensOffPly === null && after.wQ === 0 && after.bQ === 0) queensOffPly = i + 1;
    const move = history[i];
    if (move.color !== own) continue;
    const before = materialFromFen(fens[i]);
    const phase = phaseOf(i, before);
    const cls = results[i]?.classification || "unknown";
    phases[phase][cls] = (phases[phase][cls] || 0) + 1;
    ownMovesByPhase[phase] += 1;
    f.ownMoves += 1;
    if (move.captured) f.captures += 1;
    if (/[+#]/.test(move.san)) f.checks += 1;
    if (move.piece === "p") f.pawnMoves += 1;
    if (phase === "endgame") { f.endgameMoves += 1; if (move.piece === "k") f.endgameKingMoves += 1; }
    if (castle === null && /^O-O/.test(move.san)) castle = { side: move.san.startsWith("O-O-O") ? "long" : "short", ply: i + 1 };
    if (move.captured && history[i + 1] && history[i + 1].to === move.to && history[i + 1].captured) f.trades += 1;
    // Sacrifice: own material balance two plies later is >= 2 points worse than before the move.
    if (i + 2 < fens.length) {
      const later = materialFromFen(fens[i + 2]);
      const balanceBefore = before[own] - before[opp];
      const balanceLater = later[own] - later[opp];
      if (balanceBefore - balanceLater >= 2) {
        f.sacrifices += 1;
        if ((results[i]?.drop ?? 1) <= SOUND_SACRIFICE_MAX_DROP) f.soundSacrifices += 1;
      }
    }
  }
  const sideMoves = results.filter(r => (r.index % 2 === 0 ? "w" : "b") === own);
  const summary = computeReviewSummary(results);
  return {
    id: "B" + String(botNumber).padStart(2, "0") + "-G" + String(gameNumber).padStart(5, "0"),
    split: entry.split,
    color: own === "w" ? "white" : "black",
    outcome: entry.outcome,
    year: entry.year,
    eco: entry.eco,
    plies: history.length,
    line: history.slice(0, LINE_PLIES).map(move => move.san).join(" "),
    accuracy: own === "w" ? summary.whiteAcc : summary.blackAcc,
    meanDrop: sideMoves.length ? Math.round(sideMoves.reduce((s, r) => s + (r.drop || 0), 0) / sideMoves.length * 10000) / 10000 : 0,
    phases,
    ownMovesByPhase,
    features: f,
    castle,
    queensOffPly,
    ms
  };
}

async function runShard(botNumber, shardIndex, shardCount, outDir, limit) {
  const bot = await resolveBot(botNumber);
  const Chess = await loadRules();
  const { candidates } = await identifyGames(bot);
  const metrics = await import(pathToFileURL(join(root, "src/review-metrics.ts")).href);
  if (typeof metrics.analyzeGameMoves !== "function") throw new Error("src/review-metrics.ts has no analyzeGameMoves(); merge main into this branch first");
  const openingRows = JSON.parse(await readFile(join(root, "public/data/openings.json"), "utf8"));
  const openingLines = new Set(openingRows.map(row => String(row?.m || "").trim()).filter(Boolean));
  const engine = await createEngine(root);
  let requestId = 0;
  const analyzePosition = (fen, afterFen, mover, cachedBefore) =>
    engine({ id: "dna-" + (requestId++), fen, afterFen, mover: { from: mover.from, to: mover.to, promotion: mover.promotion || null }, cachedBefore });
  const mine = candidates.filter((_, index) => index % shardCount === shardIndex).slice(0, limit || Infinity);
  await mkdir(outDir, { recursive: true });
  const summary = { shardIndex, shardCount, candidates: mine.length, analysed: 0, loadFailed: 0, tooShort: 0, limited: Boolean(limit) };
  const lines = [];
  const started = Date.now();
  const flush = async () => {
    await writeFile(join(outDir, "shard-" + shardIndex + ".jsonl"), lines.length ? lines.join("\n") + "\n" : "");
    await writeFile(join(outDir, "shard-" + shardIndex + ".summary.json"), JSON.stringify(summary) + "\n");
  };
  for (let k = 0; k < mine.length; k++) {
    const game = parseCandidate(mine[k], Chess);
    if (game.error === "load-failed") summary.loadFailed += 1;
    else if (game.error === "too-short") summary.tooShort += 1;
    else {
      const record = await analyseGame(game, { Chess, analyzeGameMoves: metrics.analyzeGameMoves, computeReviewSummary: metrics.computeReviewSummary, analyzePosition, openingLines }, game.chunkIndex + 1, botNumber);
      lines.push(JSON.stringify(record));
      summary.analysed += 1;
    }
    if ((k + 1) % 10 === 0 || k + 1 === mine.length) {
      console.log("bot #" + botNumber + " shard " + (shardIndex + 1) + "/" + shardCount + ": " + (k + 1) + "/" + mine.length + " games, " + Math.round((Date.now() - started) / 1000) + " s");
      await flush();
    }
  }
  summary.done = true;
  await flush();
}

// --- aggregation ---
const round = (value, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;
const per100 = (count, moves) => (moves ? round((100 * count) / moves, 2) : 0);
const median = values => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const ISSUE_CLASSES = ["best", "inaccuracy", "mistake", "miss", "blunder"];

function profileOf(records) {
  const out = { games: records.length, white: 0, black: 0 };
  const byColor = { white: { win: 0, draw: 0, loss: 0, unfinished: 0 }, black: { win: 0, draw: 0, loss: 0, unfinished: 0 } };
  const phaseMoves = { opening: 0, middlegame: 0, endgame: 0 };
  const phaseClass = { opening: {}, middlegame: {}, endgame: {} };
  const f = { captures: 0, checks: 0, pawnMoves: 0, endgameKingMoves: 0, endgameMoves: 0, trades: 0, sacrifices: 0, soundSacrifices: 0, ownMoves: 0 };
  const castlePlies = [];
  let castled = 0, castledLong = 0, queensOffBy40 = 0;
  const accuracy = { white: [], black: [] };
  for (const r of records) {
    out[r.color] += 1;
    byColor[r.color][r.outcome] += 1;
    accuracy[r.color].push(r.accuracy);
    for (const phase of Object.keys(phaseMoves)) {
      phaseMoves[phase] += r.ownMovesByPhase[phase];
      for (const [cls, n] of Object.entries(r.phases[phase])) phaseClass[phase][cls] = (phaseClass[phase][cls] || 0) + n;
    }
    for (const key of Object.keys(f)) f[key] += r.features[key];
    if (r.castle) { castled += 1; castlePlies.push(r.castle.ply); if (r.castle.side === "long") castledLong += 1; }
    if (r.queensOffPly !== null && r.queensOffPly <= 40) queensOffBy40 += 1;
  }
  const mean = values => (values.length ? round(values.reduce((s, v) => s + v, 0) / values.length) : null);
  const phaseRates = {};
  for (const phase of Object.keys(phaseMoves)) {
    phaseRates[phase] = { moves: phaseMoves[phase] };
    for (const cls of ISSUE_CLASSES) phaseRates[phase][cls] = per100(phaseClass[phase][cls] || 0, phaseMoves[phase]);
  }
  return {
    ...out,
    results: byColor,
    scorePercent: {
      white: out.white ? round((100 * (byColor.white.win + byColor.white.draw / 2)) / out.white) : null,
      black: out.black ? round((100 * (byColor.black.win + byColor.black.draw / 2)) / out.black) : null
    },
    averagePlies: mean(records.map(r => r.plies)),
    accuracy: { white: mean(accuracy.white), black: mean(accuracy.black), all: mean([...accuracy.white, ...accuracy.black]) },
    phaseRatesPer100: phaseRates,
    stylePer100OwnMoves: {
      captures: per100(f.captures, f.ownMoves),
      checks: per100(f.checks, f.ownMoves),
      pawnMoves: per100(f.pawnMoves, f.ownMoves),
      trades: per100(f.trades, f.ownMoves),
      sacrifices: per100(f.sacrifices, f.ownMoves),
      soundSacrifices: per100(f.soundSacrifices, f.ownMoves),
      endgameKingMovesPer100EndgameMoves: per100(f.endgameKingMoves, f.endgameMoves)
    },
    castling: {
      castledPercent: records.length ? round((100 * castled) / records.length) : null,
      longPercentOfCastled: castled ? round((100 * castledLong) / castled) : null,
      medianPly: median(castlePlies)
    },
    queensOffBy40PliesPercent: records.length ? round((100 * queensOffBy40) / records.length) : null
  };
}

function openingsOf(records, color) {
  const games = records.filter(r => r.color === color);
  const firstOwn = new Map();
  const lines = new Map();
  for (const r of games) {
    const sans = r.line.split(" ");
    const ownFirst = color === "white" ? sans[0] : (sans[0] || "?") + " → " + (sans[1] || "?");
    const tally = (map, key) => {
      const entry = map.get(key) || { games: 0, points: 0 };
      entry.games += 1;
      entry.points += r.outcome === "win" ? 1 : r.outcome === "draw" ? 0.5 : 0;
      map.set(key, entry);
    };
    tally(firstOwn, ownFirst);
    tally(lines, r.line);
  }
  const top = (map, n) => [...map.entries()]
    .map(([key, v]) => ({ key, games: v.games, share: round((100 * v.games) / Math.max(1, games.length)), score: round((100 * v.points) / v.games) }))
    .sort((a, b) => b.games - a.games || a.key.localeCompare(b.key))
    .slice(0, n);
  return { games: games.length, firstMoves: top(firstOwn, 8), lines: top(lines, 10), distinctLines: lines.size };
}

function repertoireCoverage(records, profile) {
  const coverage = {};
  for (const [color, field] of [["white", "openingsAsWhite"], ["black", "openingsAsBlack"]]) {
    const repertoire = (profile?.[field] || []).map(entry => String(entry.moves || entry.line || entry).replace(/\d+\.(\.\.)?\s*/g, "").trim().split(/\s+/).filter(Boolean));
    const games = records.filter(r => r.color === color);
    const covered = games.filter(r => {
      const sans = r.line.split(" ").slice(0, 4);
      return repertoire.some(line => sans.every((san, i) => line[i] === san));
    }).length;
    coverage[color] = { repertoireLines: repertoire.length, gamesFirst4PliesInRepertoire: games.length ? round((100 * covered) / games.length) : null };
  }
  return coverage;
}

function table(headers, rows) {
  return ["| " + headers.join(" | ") + " |", "|" + headers.map(() => "---").join("|") + "|", ...rows.map(row => "| " + row.join(" | ") + " |")].join("\n");
}

function renderReport(bot, data) {
  const t = data.training;
  const h = data.holdout;
  const phaseRow = (label, p) => [label, p.moves, p.best, p.inaccuracy, p.mistake, p.miss, p.blunder];
  const openingTable = o => table(["מהלך פתיחה", "משחקים", "%", "ניקוד %"], o.firstMoves.map(x => [x.key, x.games, x.share, x.score]));
  const lineTable = o => table(["שורה (8 חצאי־מהלכים)", "משחקים", "ניקוד %"], o.lines.map(x => ["`" + x.key + "`", x.games, x.score]));
  return [
    "# DNA — בוט #" + bot.number + ": " + bot.alias,
    "",
    "> דוח DNA של משחקי המקור, נוצר אוטומטית על ידי `scripts/historical-dna.mjs`. הבוט מוצג בכינוי בלבד. כל המהלכים נותחו במנוע הסקירה של האפליקציה (Chessy, אותו קוד כמו Chess DNA); הדיוק והסיווגים הם יחסיים למנוע זה ואינם ברמת Stockfish.",
    "",
    "## מקור",
    "",
    table(["שדה", "ערך"], [
      ["Commit", "`" + data.commit + "`"],
      ["משחקים שזוהו לפי כותרות", data.headerMatchedGames],
      ["נפסלו (PGN לא נטען / פחות מ־8 חצאי־מהלכים)", data.excluded.loadFailed + " / " + data.excluded.tooShort],
      ["משחקים שנותחו", data.analysedGames + (data.matchesProfileCount ? " (תואם לפרופיל)" : " (פרופיל: " + data.profileSourceGames + ")")],
      ["ניתוח מלא", data.complete ? "כן" : "לא"],
      ["אימון / holdout", t.games + " / " + h.games],
      ["טווח שנים", data.yearRange],
      ["חלוקה", "כל משחק עשירי בקובץ = holdout (כמו המחולל)"],
      ["זמן ניתוח כולל", round(data.totalMs / 3600000, 2) + " שעות מנוע"]
    ]),
    "",
    "## תוצאות (אימון)",
    "",
    table(["צבע", "משחקים", "נ / ת / ה", "ניקוד %", "דיוק ממוצע"], [
      ["לבן", t.white, t.results.white.win + " / " + t.results.white.draw + " / " + t.results.white.loss, t.scorePercent.white, t.accuracy.white],
      ["שחור", t.black, t.results.black.win + " / " + t.results.black.draw + " / " + t.results.black.loss, t.scorePercent.black, t.accuracy.black]
    ]),
    "",
    "אורך משחק ממוצע: " + t.averagePlies + " חצאי־מהלכים.",
    "",
    "## פתיחות כלבן (אימון)",
    "",
    openingTable(data.openings.white),
    "",
    lineTable(data.openings.white),
    "",
    "## פתיחות כשחור (אימון) — מהלך היריב → תגובת השחקן",
    "",
    openingTable(data.openings.black),
    "",
    lineTable(data.openings.black),
    "",
    "כיסוי הרפרטואר הנוכחי של הבוט (4 חצאי־מהלכים ראשונים): לבן " + data.repertoireCoverage.white.gamesFirst4PliesInRepertoire + "% (" + data.repertoireCoverage.white.repertoireLines + " שורות), שחור " + data.repertoireCoverage.black.gamesFirst4PliesInRepertoire + "% (" + data.repertoireCoverage.black.repertoireLines + " שורות).",
    "",
    "## איכות מהלכים לפי שלב (ל־100 מהלכים של השחקן, אימון)",
    "",
    table(["שלב", "מהלכים", "best", "אי־דיוק", "טעות", "החמצה", "בלונדר"], [
      phaseRow("פתיחה", t.phaseRatesPer100.opening),
      phaseRow("אמצע", t.phaseRatesPer100.middlegame),
      phaseRow("סיום", t.phaseRatesPer100.endgame)
    ]),
    "",
    "## סגנון (ל־100 מהלכים של השחקן, אימון מול holdout)",
    "",
    table(["מדד", "אימון", "holdout"], [
      ["הכאות", t.stylePer100OwnMoves.captures, h.stylePer100OwnMoves.captures],
      ["שחים", t.stylePer100OwnMoves.checks, h.stylePer100OwnMoves.checks],
      ["מהלכי רגלי", t.stylePer100OwnMoves.pawnMoves, h.stylePer100OwnMoves.pawnMoves],
      ["חילופים (הכאה והכאה חוזרת)", t.stylePer100OwnMoves.trades, h.stylePer100OwnMoves.trades],
      ["הקרבות חומר (≥2 נקודות)", t.stylePer100OwnMoves.sacrifices, h.stylePer100OwnMoves.sacrifices],
      ["הקרבות שהמנוע אישר (ירידה ≤5%)", t.stylePer100OwnMoves.soundSacrifices, h.stylePer100OwnMoves.soundSacrifices],
      ["מהלכי מלך בסיום (ל־100 מהלכי סיום)", t.stylePer100OwnMoves.endgameKingMovesPer100EndgameMoves, h.stylePer100OwnMoves.endgameKingMovesPer100EndgameMoves],
      ["הצרחה (% משחקים)", t.castling.castledPercent, h.castling.castledPercent],
      ["הצרחה ארוכה (% מההצרחות)", t.castling.longPercentOfCastled, h.castling.longPercentOfCastled],
      ["חצי־מהלך חציוני להצרחה", t.castling.medianPly, h.castling.medianPly],
      ["מלכות יורדות עד חצי־מהלך 40 (%)", t.queensOffBy40PliesPercent, h.queensOffBy40PliesPercent],
      ["דיוק ממוצע", t.accuracy.all, h.accuracy.all]
    ]),
    "",
    "## הגדרות",
    "",
    "- שלב: סיום כאשר סך החומר שאינו רגלים (שני הצדדים) ≤ " + ENDGAME_NON_PAWN_MATERIAL + "; אחרת פתיחה עד חצי־מהלך " + OPENING_PLIES + " ואמצע לאחר מכן.",
    "- הקרבה: מאזן החומר של השחקן שני חצאי־מהלכים אחרי המהלך נמוך ב־2 נקודות לפחות. \"אושרה במנוע\" = ירידת סיכוי של עד " + SOUND_SACRIFICE_MAX_DROP * 100 + "%.",
    "- חילוף: הכאה של השחקן שהיריב מכה מיד באותה משבצת.",
    "- מזהי משחקים ניטרליים (`B" + String(bot.number).padStart(2, "0") + "-Gnnnnn`); שמות שחקנים אינם נשמרים בדוח.",
    "",
    "## נתונים למכונה",
    "",
    "```json dna-data",
    JSON.stringify(data),
    "```",
    ""
  ].join("\n");
}

async function runMerge(botNumber, inDir, reportPath) {
  const bot = await resolveBot(botNumber);
  const { candidates } = await identifyGames(bot);
  const names = await readdir(inDir, { recursive: true });
  const records = [];
  for (const name of names.filter(n => /shard-\d+\.jsonl$/.test(n))) {
    for (const line of (await readFile(join(inDir, name), "utf8")).split("\n")) if (line.trim()) records.push(JSON.parse(line));
  }
  const summaries = [];
  for (const name of names.filter(n => /shard-\d+\.summary\.json$/.test(n))) summaries.push(JSON.parse(await readFile(join(inDir, name), "utf8")));
  const ids = new Set(records.map(r => r.id));
  if (ids.size !== records.length) throw new Error("Duplicate game records across shards");
  const shardCount = summaries[0]?.shardCount || 0;
  const indices = new Set(summaries.map(s => s.shardIndex));
  const sum = key => summaries.reduce((s, x) => s + x[key], 0);
  const profile = JSON.parse(await readFile(join(root, "public/data/bots", bot.source.id + ".json"), "utf8"));
  const complete = shardCount > 0 && indices.size === shardCount && summaries.every(s => s.done && !s.limited && s.shardCount === shardCount)
    && sum("candidates") === candidates.length && sum("analysed") === records.length;
  const training = records.filter(r => r.split === "training");
  const holdout = records.filter(r => r.split === "holdout");
  const years = records.map(r => r.year).filter(Boolean);
  const data = {
    schema: 1,
    bot: bot.number,
    alias: bot.alias,
    commit: String(process.env.GITHUB_SHA || "local").slice(0, 12),
    headerMatchedGames: candidates.length,
    excluded: { loadFailed: sum("loadFailed"), tooShort: sum("tooShort") },
    analysedGames: records.length,
    profileSourceGames: profile.sourceGameCount ?? null,
    matchesProfileCount: profile.sourceGameCount === records.length,
    complete,
    yearRange: years.length ? Math.min(...years) + "–" + Math.max(...years) : "unknown",
    totalMs: records.reduce((s, r) => s + r.ms, 0),
    training: profileOf(training),
    holdout: profileOf(holdout),
    openings: { white: openingsOf(training, "white"), black: openingsOf(training, "black") },
    repertoireCoverage: repertoireCoverage(training, profile)
  };
  const report = renderReport(bot, data);
  const target = reportPath || join(root, "docs/bots", bot.slug, "DNA.md");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, report);
  console.log("DNA report for bot #" + bot.number + " (" + bot.alias + "): " + records.length + " analysed of " + candidates.length + " header-matched games; profile count " + data.profileSourceGames + (complete ? "" : " (INCOMPLETE)") + " -> " + target);
  if ((!complete || !data.matchesProfileCount) && !arg("allow-incomplete")) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const botNumber = Number(arg("bot"));
  if (arg("list")) {
    const bot = await resolveBot(botNumber);
    const { candidates } = await identifyGames(bot);
    const shardCount = Math.max(1, Math.ceil(candidates.length / GAMES_PER_SHARD));
    console.log(JSON.stringify({ bot: bot.number, alias: bot.alias, slug: bot.slug, games: candidates.length, shardCount, shards: Array.from({ length: shardCount }, (_, i) => i) }));
  } else if (arg("print-id")) {
    console.log((await resolveBot(botNumber)).source.id);
  } else if (arg("merge")) {
    await runMerge(botNumber, resolve(String(arg("in") || "artifacts/dna")), arg("report") ? resolve(String(arg("report"))) : null);
  } else {
    const shardCount = Number(arg("shard-count") || 1);
    const shardIndex = Number(arg("shard-index") || 0);
    if (!Number.isInteger(shardIndex) || !Number.isInteger(shardCount) || shardIndex < 0 || shardIndex >= shardCount) throw new Error("Invalid --shard-index/--shard-count");
    await runShard(botNumber, shardIndex, shardCount, resolve(String(arg("out") || "artifacts/dna")), Number(arg("limit") || 0));
  }
}
