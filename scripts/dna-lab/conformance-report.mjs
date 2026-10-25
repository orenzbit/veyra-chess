// Evaluates the pre-registered pass marks (REPORT.md) on the conformance plan and shard results.
//
//   node scripts/dna-lab/conformance-report.mjs --plan=.../plan.json --shards=.../shards --out=.../conformance.md
//
// Writes a Markdown section plus conformance.json next to it. Exit code stays 0; failures are reported.
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [key, ...value] = arg.replace(/^--/, "").split("=");
  return [key, value.join("=") || "true"];
}));
const plan = JSON.parse(await readFile(resolve(args.plan), "utf8"));
const shardDir = resolve(args.shards);
const out = resolve(args.out);
const rows = [];
for (const file of (await readdir(shardDir)).filter(name => /^shard-\d+\.jsonl$/.test(name))) {
  for (const line of (await readFile(join(shardDir, file), "utf8")).split("\n")) if (line.trim()) rows.push(JSON.parse(line));
}
rows.sort((a, b) => a.index - b.index);

const pct = (part, whole) => (whole ? Math.round((1000 * part) / whole) / 10 : null);
const fmtShares = shares => Object.entries(shares).sort((a, b) => b[1] - a[1]).map(([move, share]) => move + " " + Math.round(share * 100) + "%").join(", ");
const checks = [];
const add = (id, name, value, mark, pass) => checks.push({ id, name, value, mark, result: pass === null ? "not measured" : pass ? "pass" : "fail" });

// Openings
const { o1, o2, o3 } = plan.openings;
add("O1", "White first move vs player", "TVD " + o1.tvd + " — bot: " + fmtShares(o1.bot) + "; player: " + fmtShares(o1.player), "≤ 0.20", o1.tvd <= 0.2);
for (const row of o2) add("O2", "Black reply to 1." + row.first, "TVD " + row.tvd + " — bot: " + fmtShares(row.bot) + (row.fromBook ? "" : " (from search)") + "; player: " + fmtShares(row.player), "≤ 0.25", row.tvd <= 0.25);
add("O3", "Repertoire covers test games (first 6 plies)", "White " + o3.white.percent + "%, Black " + o3.black.percent + "%", "≥ 40% each", o3.white.percent >= 40 && o3.black.percent >= 40);

// Play on test positions
const valid = rows.filter(row => row.bot && !row.bot.error && row.baseline && !row.baseline.error);
const match = side => pct(valid.filter(row => row[side].uci === row.player.uci).length, valid.length);
const rate = (side, flag) => pct(valid.filter(row => (side === "player" ? row.player : row[side])[flag]).length, valid.length);
const botMatch = match("bot");
const baseMatch = match("baseline");
add("P1", "Exact match with the player's move (" + valid.length + " positions)", "bot " + botMatch + "%, baseline " + baseMatch + "%", "bot ≥ baseline − 2 pp", valid.length ? botMatch >= baseMatch - 2 : null);
for (const flag of ["capture", "check", "pawn"]) {
  const player = rate("player", flag), b = rate("bot", flag), base = rate("baseline", flag);
  const pass = Math.abs(b - player) <= 5 || Math.abs(b - player) <= Math.abs(base - player);
  add("P2", flag + " rate", "player " + player + "%, bot " + b + "%, baseline " + base + "%", "within 5 pp or as close as baseline", valid.length ? pass : null);
}
const errors = rows.filter(row => !row.bot || row.bot.error || row.bot.legal === false);
add("P3", "Legal moves, no errors", (rows.length - errors.length) + "/" + plan.positions.length + " positions OK", "100%", rows.length === plan.positions.length && errors.length === 0);
for (const phase of ["opening", "middlegame", "endgame"]) {
  const list = valid.filter(row => row.phase === phase);
  checks.push({ id: "P1·" + phase, name: "Exact match, " + phase + " (" + list.length + ")", value: "bot " + pct(list.filter(r => r.bot.uci === r.player.uci).length, list.length) + "%, baseline " + pct(list.filter(r => r.baseline.uci === r.player.uci).length, list.length) + "%", mark: "information", result: "info" });
}

// Speed
const times = valid.map(row => row.bot.ms).sort((a, b) => a - b);
const median = times.length ? times[Math.floor(times.length / 2)] : null;
const max = times.length ? times[times.length - 1] : null;
add("Q2", "Bot thinking time per move", "median " + (median / 1000).toFixed(1) + " s, max " + (max / 1000).toFixed(1) + " s", "median ≤ 5 s and max ≤ 20 s", times.length ? median <= 5000 && max <= 20000 : null);

// Names
add("N1", "Real name in user-visible fields", plan.n1.fieldsWithRealName.length ? plan.n1.fieldsWithRealName.join(", ") : "none", "0", plan.n1.fieldsWithRealName.length === 0);

const summary = {
  bot: plan.bot,
  alias: plan.alias,
  createdAt: new Date().toISOString(),
  positions: plan.positions.length,
  analysed: rows.length,
  phaseCounts: plan.phaseCounts,
  checks
};
const md = [
  "### Conformance results — #" + plan.bot + " " + plan.alias,
  "",
  plan.positions.length + " test positions from " + plan.holdoutGames + " classical test games (" + Object.entries(plan.phaseCounts).map(([k, v]) => k + " " + v).join(", ") + "); " + rows.length + " analysed.",
  "",
  "| ID | Check | Measured | Pass mark | Result |",
  "|---|---|---|---|---|",
  ...checks.map(c => "| " + [c.id, c.name, c.value, c.mark, c.result === "pass" ? "✅ pass" : c.result === "fail" ? "❌ fail" : c.result].join(" | ") + " |"),
  ""
].join("\n");
await mkdir(dirname(out), { recursive: true });
await writeFile(out, md);
await writeFile(out.replace(/\.md$/, ".json"), JSON.stringify(summary, null, 2) + "\n");
console.log(md);
