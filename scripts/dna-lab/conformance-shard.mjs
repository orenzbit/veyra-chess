// Bot vs baseline moves on one shard of the conformance test positions.
//
//   node scripts/dna-lab/conformance-shard.mjs --bot=1 --plan=artifacts/dna-lab/conformance/plan.json \
//        --shard=0 --shards=20 --out=artifacts/dna-lab/conformance/shards
//
// The baseline is the same profile with its style settings removed (style "universal", no style
// profile, no style metrics), so differences isolate the effect of the bot's style tuning.
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, loadChess, loadProfile } from "./roster.mjs";

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [key, ...value] = arg.replace(/^--/, "").split("=");
  return [key, value.join("=") || "true"];
}));
const plan = JSON.parse(await readFile(resolve(args.plan), "utf8"));
const shard = Number(args.shard || 0);
const shards = Number(args.shards || 1);
const outDir = resolve(args.out || "artifacts/dna-lab/conformance/shards");

const Chess = await loadChess();
const { chooseBotMove } = await import(pathToFileURL(resolve(ROOT, "src/bot-engine.ts")).href);
const bot = await loadProfile(Number(args.bot));
const baseline = { ...bot, style: "universal", styleProfile: undefined, styleMetrics: undefined };

function play(profile, fen) {
  const started = Date.now();
  const board = new Chess(fen);
  const move = chooseBotMove(board, profile, Chess);
  const ms = Date.now() - started;
  if (!move) return { error: "no move", ms };
  const legal = new Chess(fen).moves({ verbose: true }).some(m => m.from === move.from && m.to === move.to && (m.promotion || "") === (move.promotion || ""));
  return {
    uci: move.from + move.to + (move.promotion || ""),
    san: move.san,
    legal,
    capture: Boolean(move.captured),
    check: /[+#]/.test(String(move.san || "")),
    pawn: move.piece === "p",
    ms
  };
}

await mkdir(outDir, { recursive: true });
const outFile = join(outDir, "shard-" + shard + ".jsonl");
await writeFile(outFile, "");
const mine = plan.positions.filter(position => position.index % shards === shard);
for (const position of mine) {
  const row = { index: position.index, phase: position.phase, player: position.player };
  try { row.bot = play(bot, position.fen); } catch (error) { row.bot = { error: String(error?.message || error) }; }
  try { row.baseline = play(baseline, position.fen); } catch (error) { row.baseline = { error: String(error?.message || error) }; }
  await appendFile(outFile, JSON.stringify(row) + "\n");
  console.log("shard " + shard + " #" + position.index + " " + position.phase + ": player " + position.player.san + ", bot " + (row.bot.san || row.bot.error) + " (" + row.bot.ms + " ms), baseline " + (row.baseline.san || row.baseline.error) + " (" + row.baseline.ms + " ms)");
}
console.log("shard " + shard + " done: " + mine.length + " positions");
