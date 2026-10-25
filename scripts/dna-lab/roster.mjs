// Roster and source access for the DNA lab (scripts/dna-lab/*).
//
// Bots are addressed only by roster number and public alias. Player identity rules (names, aliases)
// are read at runtime from scripts/build-historical-legend-bots.mjs, so this lab never duplicates
// them and stays in step with the generator. identifyGames() asserts that it finds exactly the
// game counts recorded in the bot profile; if the generator changes, the lab fails loudly instead of
// analysing a different game set.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const ROSTER = [
  { number: 1, alias: "The Lightning Strategist", slug: "01-lightning-strategist" },
  { number: 2, alias: "The Tactical Hammer", slug: "02-tactical-hammer" },
  { number: 3, alias: "The Immortal Gambit", slug: "03-immortal-gambit" },
  { number: 4, alias: "The Precision Machine", slug: "04-precision-machine" },
  { number: 5, alias: "The Quiet Squeeze", slug: "05-quiet-squeeze" },
  { number: 6, alias: "The Dynamic Storm", slug: "06-dynamic-storm" },
  { number: 7, alias: "The Open-Board Virtuoso", slug: "07-open-board-virtuoso" },
  { number: 8, alias: "The Tactical Speedster", slug: "08-tactical-speedster" },
  { number: 9, alias: "The Fearless Attacker", slug: "09-fearless-attacker" },
  { number: 10, alias: "The Magician from Riga", slug: "10-magician-from-riga" },
  { number: 11, alias: "Cuban Endgame Maestro", slug: "11-cuban-endgame-maestro" },
  { number: 12, alias: "השחקן הטוב בכל הזמנים", slug: "12-all-time-best" }
];

export function rosterEntry(number) {
  const entry = ROSTER.find(row => row.number === Number(number));
  assert.ok(entry, "Unknown roster number: " + number);
  return entry;
}

function extractBlock(text, startPattern, endLinePattern) {
  const start = text.search(startPattern);
  assert.ok(start >= 0, "Generator block not found: " + startPattern);
  const rest = text.slice(start);
  const end = rest.search(endLinePattern);
  assert.ok(end >= 0, "Generator block end not found: " + startPattern);
  return rest.slice(0, end + rest.slice(end).indexOf("\n") + 1);
}

let generatorHelpers;
async function loadGeneratorHelpers() {
  if (generatorHelpers) return generatorHelpers;
  const text = await readFile(resolve(ROOT, "scripts/build-historical-legend-bots.mjs"), "utf8");
  const code = [
    extractBlock(text, /^const normalize = /m, /\n/),
    extractBlock(text, /^const sources = \[/m, /^\];/m),
    extractBlock(text, /^function matchesPlayerName\(/m, /^\}/m),
    extractBlock(text, /^function parseHeaders\(/m, /^\}/m),
    "return { normalize, sources, matchesPlayerName, parseHeaders };"
  ].join("\n");
  generatorHelpers = new Function(code)();
  return generatorHelpers;
}

let manifestCache;
export async function loadManifest() {
  manifestCache ??= JSON.parse(await readFile(resolve(ROOT, "public/data/bots/index.json"), "utf8"));
  return manifestCache;
}

/** The runtime profile for a roster number, looked up by its public alias. */
export async function loadProfile(number) {
  const { alias } = rosterEntry(number);
  const manifest = await loadManifest();
  const listed = manifest.find(bot => bot.name === alias && bot.sourceFile);
  assert.ok(listed, "No historical profile with alias " + alias);
  try {
    return JSON.parse(await readFile(resolve(ROOT, "public/data/bots", listed.id + ".json"), "utf8"));
  } catch {
    return listed;
  }
}

export async function loadSource(number) {
  const { alias } = rosterEntry(number);
  const { sources, matchesPlayerName, parseHeaders } = await loadGeneratorHelpers();
  const source = sources.find(row => row.displayName === alias);
  assert.ok(source, "No generator source with alias " + alias);
  const identities = [...new Set([...(source.aliases || []), source.name, source.surname])].filter(Boolean).sort((a, b) => b.length - a.length);
  const patterns = identities.map(identity => new RegExp("(?<![\\p{L}\\p{N}])" + identity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![\\p{L}\\p{N}])", "giu"));
  /** Replaces the player's real name in any text that may be shown in a report. */
  const scrub = value => patterns.reduce((text, pattern) => text.replace(pattern, alias), String(value ?? ""));
  return { source, alias, matchesPlayer: value => matchesPlayerName(value, source), parseHeaders, scrub };
}

export async function loadChess() {
  return (await import(pathToFileURL(resolve(ROOT, "public/vendor/veyra-rules/chess-compat.js")).href)).Chess;
}

/**
 * Every game of the player, identified exactly like the generator: same PGN chunking, same name
 * matching, same "chunk index % 10 === 0 is holdout" split, same minimum of 8 plies.
 */
export async function identifyGames(number) {
  const Chess = await loadChess();
  const { source, matchesPlayer, parseHeaders, scrub, alias } = await loadSource(number);
  const pgnText = await readFile(resolve(ROOT, source.file), "utf8");
  const chunks = pgnText.split(/(?=^\[Event\s+")/m).filter(chunk => /^\[Event\s+"/m.test(chunk));
  const games = [];
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    const headers = parseHeaders(chunk);
    const whiteIsPlayer = matchesPlayer(headers.White);
    const blackIsPlayer = matchesPlayer(headers.Black);
    if (whiteIsPlayer === blackIsPlayer) continue;
    let moves;
    try {
      const game = new Chess();
      game.loadPgn(chunk, { sloppy: true });
      moves = game.history({ verbose: true });
    } catch {
      continue;
    }
    if (moves.length < 8) continue;
    games.push({
      chunkIndex,
      holdout: chunkIndex % 10 === 0,
      color: whiteIsPlayer ? "w" : "b",
      headers,
      sans: moves.map(move => move.san),
      plies: moves.length,
      pgn: chunk
    });
  }
  const profile = await loadProfile(number);
  const training = games.filter(game => !game.holdout).length;
  assert.equal(games.length, profile.sourceGameCount, alias + ": lab found " + games.length + " games but the profile records " + profile.sourceGameCount);
  assert.equal(training, profile.trainingGameCount, alias + ": training split differs from the profile");
  return { games, chunkCount: chunks.length, alias, scrub, profile };
}

// CLI: node scripts/dna-lab/roster.mjs slug <number>   |   node scripts/dna-lab/roster.mjs id <number>
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, number] = process.argv.slice(2);
  if (command === "slug") console.log(rosterEntry(number).slug);
  else if (command === "id") console.log((await loadProfile(number)).id);
  else throw new Error("Usage: roster.mjs slug|id <number>");
}