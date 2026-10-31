// Sacrifice badge: sound sacrifices get `sacrifice: { material }` in the review results and a badge in the UI,
// while classifications, accuracy and ratings stay exactly what they were before the feature.
// The expected classifications and summary below were computed with the review-metrics.ts of origin/main
// (before this feature) on the same positions and engine, and also compared move by move against it.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Chess } from "../rules-src/chess-compat.mjs";
import { analyzeGameMoves, computeReviewSummary, materialSacrifice, passiveSacrifice, soundSacrifice, SOUND_SACRIFICE_CLASSES } from "../src/review-metrics.ts";
import { createEngine } from "./review-benchmark.mjs";
import { _test } from "../netlify/functions/chess-dna.mjs";

globalThis.React = { createElement: (type, props, ...children) => ({ type, props, children }) };
const { sacrificeBadge, sacrificeBadgeText, sacrificeBadgeTitle, sacrificeMaterial } = await import("../src/sacrifice-badge.ts");

// 1. Which classes may carry the field.
assert.deepEqual([...SOUND_SACRIFICE_CLASSES], ["brilliant", "great", "best", "excellent", "good"]);
for (const name of SOUND_SACRIFICE_CLASSES) assert.deepEqual(soundSacrifice(name, 3), { material: 3 }, name);
for (const name of ["inaccuracy", "mistake", "miss", "blunder", "book", "forced", "", "unknown"]) assert.equal(soundSacrifice(name, 3), null, name);
assert.equal(soundSacrifice("brilliant", 0), null);
assert.equal(soundSacrifice("brilliant", NaN), null);
assert.deepEqual(soundSacrifice("best", 1), { material: 1 });
console.log("PASS: only brilliant/great/best/excellent/good moves with material >= 1 can carry a sacrifice");

// 2. Badge component: Hebrew and English text, material in the title, safe on old or malformed rows.
assert.equal(sacrificeBadgeText("he"), "♟ הקרבה");
assert.equal(sacrificeBadgeText("en"), "♟ Sacrifice");
assert.equal(sacrificeBadgeTitle(3, "he"), "הקרבה של 3 נקודות חומר");
assert.equal(sacrificeBadgeTitle(3, "en"), "Sacrifice of 3 points of material");
assert.equal(sacrificeBadgeTitle(1, "he"), "הקרבה של נקודת חומר אחת");
assert.equal(sacrificeBadgeTitle(1, "en"), "Sacrifice of 1 point of material");
for (const lang of ["he", "en"]) {
  const badge = sacrificeBadge({ index: 4, classification: "brilliant", sacrifice: { material: 3 } }, lang);
  assert.equal(badge.type, "span");
  assert.equal(badge.props.className, "sacrifice-badge");
  assert.equal(badge.props.title, sacrificeBadgeTitle(3, lang));
  assert.equal(badge.props["aria-label"], badge.props.title);
  assert.equal(badge.children[0], sacrificeBadgeText(lang));
}
for (const old of [undefined, null, {}, { classification: "best" }, { sacrifice: null }, { sacrifice: {} }, { sacrifice: { material: 0 } }, { sacrifice: { material: -2 } }, { sacrifice: { material: "3" } }, { sacrifice: { material: NaN } }, { sacrifice: { material: Infinity } }]) {
  assert.equal(sacrificeBadge(old, "he"), null, JSON.stringify(old));
  assert.equal(sacrificeBadge(old, "en"), null, JSON.stringify(old));
}
assert.equal(sacrificeMaterial({ sacrifice: { material: 1e9 } }), 99);
console.log("PASS: badge renders Hebrew and English with the material in title/aria-label, and nothing for old or malformed rows");

// 3. Real review of a known game (first 23 plies), same loop the Review screen runs.
const engine = await createEngine(process.cwd());
const openingSet = new Set(JSON.parse(await readFile("public/data/openings.json", "utf8")).map(row => String(row?.m || "").trim()).filter(Boolean));
const fixture = JSON.parse(await readFile("scripts/fixtures/review-benchmark/analyzer-100.json", "utf8"));
const game = fixture.games.find(entry => entry.id === "analyzer-001");
const parsed = new Chess();
parsed.loadPgn(game.pgn);
const history = parsed.history({ verbose: true }).slice(0, 23);
assert.equal(history.map(move => move.san).join(" "), "e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nc3 Bb4 Nxc6 bxc6 Qd3 O-O Bd2 Bxc3 Bxc3 Nxe4 Qxe4 Re8 Be5 f6 O-O-O");
let requestId = 0;
const results = await analyzeGameMoves(history, {
  Chess,
  openingLines: openingSet,
  analyzePosition: (fen, afterFen, mover, cachedBefore, alternatives) =>
    engine({ id: "sacrifice-" + requestId++, fen, afterFen, mover: { from: mover.from, to: mover.to, promotion: mover.promotion || null }, cachedBefore, alternatives })
});

const EXPECTED_CLASSIFICATIONS = ["book", "book", "book", "book", "book", "book", "book", "book", "book", "book", "book", "book", "excellent", "best", "good", "good", "best", "blunder", "best", "great", "great", "excellent", "brilliant"];
assert.deepEqual(results.map(row => row.classification), EXPECTED_CLASSIFICATIONS, "classifications changed");
const summary = computeReviewSummary(results);
assert.deepEqual(summary, {
  counts: {
    white: { book: 6, excellent: 1, good: 1, best: 2, great: 1, brilliant: 1 },
    black: { book: 6, best: 1, good: 1, blunder: 1, great: 1, excellent: 1 }
  },
  whiteAcc: 81, blackAcc: 73.1, whiteRating: 1550, blackRating: 1155
}, "accuracy/rating changed");
const withoutField = results.map(({ sacrifice, ...rest }) => rest);
assert.deepEqual(computeReviewSummary(withoutField), summary, "accuracy/rating must not depend on the sacrifice field");

// Sound sacrifice: 12.O-O-O leaves the bishop on e5 en prise (3 points) and is a brilliant move.
const sound = results[22];
assert.equal(history[22].san, "O-O-O");
assert.equal(sound.classification, "brilliant");
assert.deepEqual(sound.sacrifice, { material: 3 });
// Unsound: 9...Nxe4 also gives up material per the same detection, but is a blunder, so it gets no badge.
const replay = new Chess();
for (const move of history.slice(0, 17)) replay.move({ from: move.from, to: move.to, promotion: move.promotion || undefined });
const beforeBlunder = replay.fen();
const blunder = history[17];
assert.equal(blunder.san, "Nxe4");
const afterBlunder = new Chess(beforeBlunder);
afterBlunder.move({ from: blunder.from, to: blunder.to });
const gaveUp = Math.max(
  materialSacrifice(Chess, afterBlunder.fen(), { ...blunder, piece: new Chess(beforeBlunder).get(blunder.from).type }),
  passiveSacrifice(Chess, beforeBlunder, afterBlunder.fen(), blunder)
);
assert.ok(gaveUp >= 1, "the blunder must give up material for this to test the exclusion");
assert.equal(results[17].classification, "blunder");
assert.equal(Object.hasOwn(results[17], "sacrifice"), false);
for (const row of results) {
  if (row.sacrifice) {
    assert.ok(SOUND_SACRIFICE_CLASSES.includes(row.classification), "sacrifice on a " + row.classification + " move");
    assert.ok(Number.isInteger(row.sacrifice.material) && row.sacrifice.material >= 1);
  }
}
assert.deepEqual(results.map((row, index) => row.sacrifice ? index : -1).filter(index => index >= 0), [22], "only the sound sacrifice is marked");
console.log("PASS: sound sacrifice (12.O-O-O, 3 points) has the field; blunder 9...Nxe4 that also gives up material does not");
console.log("PASS: classifications, accuracy (81 / 73.1) and ratings (1550 / 1155) equal the origin/main values");

// 4. Saved analyses: the server validator accepts rows with and without the optional field and keeps it.
const rows = results.map(row => ({ ...row, clockSeconds: null }));
const analysis = { moves: rows, summary };
assert.equal(_test.validateAnalysis(analysis), true);
const roundTrip = JSON.parse(JSON.stringify(analysis));
assert.equal(_test.validateAnalysis(roundTrip), true);
assert.deepEqual(roundTrip.moves[22].sacrifice, { material: 3 });
assert.equal(sacrificeBadge(roundTrip.moves[22], "en").props.title, "Sacrifice of 3 points of material");
assert.equal(sacrificeBadge(roundTrip.moves[17], "en"), null);
const legacy = { moves: withoutField.map(row => ({ ...row, clockSeconds: null })), summary };
assert.equal(_test.validateAnalysis(legacy), true);
assert.ok(legacy.moves.every(row => sacrificeBadge(row, "he") === null), "old analyses render without badges");
console.log("PASS: saved analyses with and without the field validate, survive JSON, and render");

// 5. Wiring and styling.
const main = await readFile("src/main.ts", "utf8");
assert.match(main, /import \{ sacrificeBadge \} from '\.\/sacrifice-badge\.js'/);
assert.match(main, /a\?\.sacrifice&&sacrificeBadge\(a,getLang\(\)\)/, "moves list badge");
assert.match(main, /currentA\?\.sacrifice&&h\('div',\{className:'coach-sacrifice'\},sacrificeBadge\(currentA,getLang\(\)\)\)/, "coach card badge");
const css = await readFile("public/styles.css", "utf8");
const rule = css.match(/\.sacrifice-badge\{[^}]*\}/)?.[0] || "";
assert.ok(rule.includes("white-space:nowrap") && rule.includes("flex:none") && rule.includes("max-width:100%") && rule.includes("var(--primary"), "badge rule uses the theme and cannot overflow");
assert.match(css, /@media\(max-width:420px\)\{\.sacrifice-badge\{/);
console.log("PASS: moves list and coach card use the badge; CSS is themed and bounded");
