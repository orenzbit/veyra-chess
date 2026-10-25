// Runs the full DNA pipeline for one bot on this machine, in parallel, with Node only (no downloads).
//
//   node scripts/dna-lab/run-local.mjs --bot=1 [--count=500] [--workers=18] [--batches=60]
//
// 1. Selects the games, parsing the source file in `workers` child processes.
// 2. Analyses the selection in `batches` small batches, `workers` at a time (a work pool, so slower
//    cores do not hold the run back).
// 3. Builds docs/bots/<slug>/DNA.md.
// Intermediate files go to artifacts/dna-lab/local/<slug>/ (ignored by git).
import { spawn } from "node:child_process";
import { availableParallelism } from "node:os";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { ROOT, rosterEntry } from "./roster.mjs";

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [key, ...value] = arg.replace(/^--/, "").split("=");
  return [key, value.join("=") || "true"];
}));
const bot = Number(args.bot);
const count = Number(args.count || 500);
const workers = Number(args.workers || Math.max(1, availableParallelism() - 2));
const batches = Number(args.batches || workers * 3);
const { slug } = rosterEntry(bot);
const work = resolve(ROOT, "artifacts/dna-lab/local", slug);
const script = name => resolve(ROOT, "scripts/dna-lab", name);
const started = Date.now();
const elapsed = () => Math.round((Date.now() - started) / 1000) + " s";

function run(file, argv, quiet = false) {
  return new Promise((done, fail) => {
    const child = spawn(process.execPath, [file, ...argv], { cwd: ROOT, stdio: ["ignore", quiet ? "ignore" : "inherit", "inherit"] });
    child.on("error", fail);
    child.on("exit", code => (code === 0 ? done() : fail(new Error(file + " exited with " + code))));
  });
}

await rm(work, { recursive: true, force: true });
console.log("#" + bot + ": selecting " + count + " games with " + workers + " workers...");
await run(script("select-games.mjs"), ["--bot=" + bot, "--count=" + count, "--parts=" + workers, "--out=" + resolve(work, "selection.json")]);
console.log("[" + elapsed() + "] selection done; analysing in " + batches + " batches, " + workers + " at a time...");

let next = 0;
let finished = 0;
await Promise.all(Array.from({ length: workers }, async () => {
  while (next < batches) {
    const batch = next++;
    await run(script("analyze-dna.mjs"), ["--selection=" + resolve(work, "selection.json"), "--shard=" + batch, "--shards=" + batches, "--out=" + resolve(work, "shards")], true);
    finished++;
    if (finished % Math.max(1, Math.floor(batches / 10)) === 0 || finished === batches) console.log("[" + elapsed() + "] " + finished + "/" + batches + " batches done");
  }
}));

await run(script("build-dna-report.mjs"), ["--selection=" + resolve(work, "selection.json"), "--shards=" + resolve(work, "shards"), "--out=" + resolve(ROOT, "docs/bots", slug, "DNA.md")]);
console.log("#" + bot + " DNA done in " + elapsed());
