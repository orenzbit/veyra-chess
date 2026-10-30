// Compares two review-benchmark results (base branch vs PR), writes a Markdown report and
// exits 1 when the PR makes scoring worse or a move exceeds the app's per-move timeout.
//
// Usage: node scripts/compare-review-benchmark.mjs --pr <pr.json> [--base <base.json>] [--markdown <report.md>]
// A missing or unreadable --base file is reported, and only the absolute timeout rule is enforced.
import { readFile, writeFile } from "node:fs/promises";
import { APP_PLY_TIMEOUT_MS } from "./review-benchmark.mjs";

const REPORT_MARKER = "<!-- review-benchmark -->";
const ACCURACY_TOLERANCE = 0.05;

function parseArgs(argv) {
  const args = { pr: null, base: null, markdown: null };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!["--pr", "--base", "--markdown"].includes(key) || !value) throw new Error("Unknown or incomplete argument: " + key);
    args[key.slice(2)] = value;
    i++;
  }
  if (!args.pr) throw new Error("--pr is required");
  return args;
}

async function readResult(path) {
  if (!path) return null;
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

function delta(baseValue, prValue, higherIsBetter, digits = 0) {
  if (baseValue == null) return "—";
  const diff = prValue - baseValue;
  if (Math.abs(diff) < 1e-9) return "no change";
  const better = higherIsBetter ? diff > 0 : diff < 0;
  return (diff > 0 ? "+" : "") + diff.toFixed(digits) + (better ? " ✅ better" : " ❌ worse");
}

function compareResults(base, pr) {
  const regressions = [];
  if (base) {
    if (pr.totals.agreement < base.totals.agreement) {
      regressions.push("Label agreement dropped from " + base.totals.agreement + " to " + pr.totals.agreement + " of " + pr.totals.plies + " moves.");
    }
    if (pr.totals.accuracyMae > base.totals.accuracyMae + ACCURACY_TOLERANCE) {
      regressions.push("Accuracy error grew from " + base.totals.accuracyMae + " to " + pr.totals.accuracyMae + " points.");
    }
  }
  if (pr.totals.maxPlyMs > APP_PLY_TIMEOUT_MS) {
    regressions.push("Slowest move took " + pr.totals.maxPlyMs + " ms, above the app's " + APP_PLY_TIMEOUT_MS + " ms per-move timeout.");
  }
  return regressions;
}

function renderReport(base, pr, regressions) {
  const b = base?.totals;
  const p = pr.totals;
  const lines = [REPORT_MARKER, "## Review scoring benchmark", ""];
  lines.push(regressions.length ? "**Result: ❌ scoring got worse**" : "**Result: ✅ no regression**", "");
  for (const reason of regressions) lines.push("- " + reason);
  if (regressions.length) lines.push("");
  if (!base) lines.push("> ⚠️ The base branch could not be scored, so only the PR is shown and only the timeout rule was checked.", "");

  lines.push("| Metric | Base | PR | Change |", "|---|---|---|---|");
  lines.push("| Moves whose severity matches the reference (higher is better) | " + (b ? b.agreement + "/" + b.plies : "—") + " | " + p.agreement + "/" + p.plies + " | " + delta(b?.agreement, p.agreement, true) + " |");
  lines.push("| Accuracy error vs reference, mean points (lower is better) | " + (b ? b.accuracyMae : "—") + " | " + p.accuracyMae + " | " + delta(b?.accuracyMae, p.accuracyMae, false, 1) + " |");
  lines.push("| Game-rating error vs reference, mean (info only) | " + (b ? b.ratingMae : "—") + " | " + p.ratingMae + " | " + delta(b?.ratingMae, p.ratingMae, false) + " |");
  if (p.labelTotal) lines.push("| Exact label matches the reference (info only) | " + (b?.labelTotal ? b.labelAgreement + "/" + b.labelTotal : "—") + " | " + p.labelAgreement + "/" + p.labelTotal + " | " + (b?.labelTotal ? delta(b.labelAgreement, p.labelAgreement, true) : "—") + " |");
  for (const [label, row] of Object.entries(p.tracked || {})) {
    const before = b?.tracked?.[label];
    lines.push("| \"" + label + "\" labels: Veyra / reference / both (info only) | " + (before ? before.veyra + " / " + before.reference + " / " + before.both : "—") + " | " + row.veyra + " / " + row.reference + " / " + row.both + " | " + (before ? delta(before.both, row.both, true) + " agreeing" : "—") + " |");
  }
  lines.push("| Slowest move, ms (must stay under " + APP_PLY_TIMEOUT_MS + ") | " + (b ? b.maxPlyMs : "—") + " | " + p.maxPlyMs + " | timing varies by runner |");
  lines.push("");

  if (pr.sets && Object.keys(pr.sets).length > 1) {
    lines.push("### Per reference set", "", "| Set | Games | Severity agreement (base → PR) | Exact labels (base → PR) |", "|---|---|---|---|");
    for (const [set, row] of Object.entries(pr.sets)) {
      const before = base?.sets?.[set];
      lines.push("| " + set + " | " + row.games + " | " + (before ? before.agreement + " → " : "") + row.agreement + "/" + row.plies + " | " + (row.labelTotal ? (before ? before.labelAgreement + " → " : "") + row.labelAgreement + "/" + row.labelTotal : "—") + " |");
    }
    lines.push("");
  }

  lines.push("### Games with a reference accuracy", "", "| Game | Agreement (base → PR) | White accuracy (ref) | Black accuracy (ref) | Rating W / B (ref) |", "|---|---|---|---|---|");
  for (const game of pr.games.filter(game => game.reference && Number.isFinite(game.reference.whiteAccuracy))) {
    const baseGame = base?.games.find(g => g.id === game.id);
    const ref = game.reference;
    const arrow = (before, after, suffix = "") => (baseGame ? before + suffix + " → " : "") + after + suffix;
    lines.push("| " + game.id +
      " | " + arrow(baseGame?.agreement, game.agreement) + "/" + game.total +
      " | " + arrow(baseGame?.accuracy.white, game.accuracy.white, "%") + " (" + ref.whiteAccuracy + "%)" +
      " | " + arrow(baseGame?.accuracy.black, game.accuracy.black, "%") + " (" + ref.blackAccuracy + "%)" +
      " | " + arrow(baseGame ? baseGame.rating.white + "/" + baseGame.rating.black : "", game.rating.white + "/" + game.rating.black) + " (" + ref.whiteRating + "/" + ref.blackRating + ") |");
  }
  lines.push("");

  if (base) {
    const changed = [];
    for (const game of pr.games) {
      const baseGame = base.games.find(g => g.id === game.id);
      if (!baseGame) continue;
      game.plies.forEach((ply, i) => {
        const before = baseGame.plies[i];
        if (before && before.classification !== ply.classification) {
          const verdict = ply.refLabel
            ? (ply.classification === ply.refLabel ? "✅ now matches" : before.classification === ply.refLabel ? "❌ no longer matches" : before.bucket === ply.bucket ? "same severity" : "still differs")
            : before.bucket === ply.bucket ? "same severity" : ply.bucket === ply.ref ? "✅ now matches" : before.bucket === ply.ref ? "❌ no longer matches" : "still differs";
          changed.push("| " + game.id + " | " + ply.ply + " | " + (ply.refLabel || ply.ref) + " | " + before.classification + " | " + ply.classification + " | " + verdict + " |");
        }
      });
    }
    const SHOWN = 40;
    lines.push("### Moves whose label changed (" + changed.length + ")", "");
    if (changed.length) lines.push("| Game | Move | Reference | Base | PR | Effect |", "|---|---|---|---|---|---|", ...changed.slice(0, SHOWN));
    if (changed.length > SHOWN) lines.push("", "…and " + (changed.length - SHOWN) + " more (full list in the uploaded results).");
    else lines.push("No move labels changed.");
    lines.push("");
  }

  lines.push("<sub>Labels are compared by severity: ok / inaccuracy / mistake / blunder / miss. The check fails when agreement drops, accuracy error grows by more than " + ACCURACY_TOLERANCE + " points, or a move exceeds the app timeout. Fixtures: `scripts/fixtures/review-benchmark/games.json`.</sub>");
  return lines.join("\n") + "\n";
}

const args = parseArgs(process.argv.slice(2));
const pr = await readResult(args.pr);
if (!pr) throw new Error("Could not read PR benchmark result: " + args.pr);
const base = await readResult(args.base);
const regressions = compareResults(base, pr);
const report = renderReport(base, pr, regressions);
if (args.markdown) await writeFile(args.markdown, report);
else process.stdout.write(report);
if (regressions.length) {
  console.error("Review scoring regression:\n- " + regressions.join("\n- "));
  process.exitCode = 1;
}
