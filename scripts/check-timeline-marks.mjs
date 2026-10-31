import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { timelineMark } from "../src/timeline-marks.ts";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = path => readFile(resolve(root, path), "utf8");
const [metricsSource, mainSource, cssSource] = await Promise.all([
  read("src/review-metrics.ts"),
  read("src/main.ts"),
  read("public/styles.css")
]);

// Every classification the review can produce: string literals returned by classifyReviewMove.
const start = metricsSource.indexOf("export function classifyReviewMove");
assert.ok(start >= 0, "classifyReviewMove not found in review-metrics.ts");
const end = metricsSource.indexOf("\n}\n", start);
const classes = [...new Set([...metricsSource.slice(start, end).matchAll(/return\s+(?:[^;"]*\?\s*)?"([a-z]+)"/g)].map(m => m[1]))];
for (const expected of ["book", "forced", "brilliant", "best", "great", "excellent", "good", "inaccuracy", "mistake", "blunder", "miss"]) {
  assert.ok(classes.includes(expected), `classification "${expected}" not found in review-metrics source`);
}

const expectedMarks = {
  brilliant: "!!",
  great: "!",
  mistake: "?",
  blunder: "??",
  miss: "✗"
};

for (const classification of classes) {
  const mark = timelineMark(classification);
  if (expectedMarks[classification]) {
    assert.ok(mark, `${classification} must have a timeline mark`);
    assert.equal(mark.symbol, expectedMarks[classification], `${classification} symbol`);
    assert.equal(mark.tone, classification, `${classification} tone`);
    assert.ok(mark.labelHe && /[\u0590-\u05ff]/.test(mark.labelHe), `${classification} needs a Hebrew label`);
    assert.ok(mark.labelEn && /^[A-Za-z ]+$/.test(mark.labelEn), `${classification} needs an English label`);
    assert.ok(cssSource.includes(`.strip-mark-${mark.tone}`), `styles.css must style .strip-mark-${mark.tone}`);
  } else {
    assert.equal(timelineMark(classification), null, `${classification} must not be marked`);
  }
}
for (const classification of Object.keys(expectedMarks)) assert.ok(classes.includes(classification), `${classification} is not a real classification`);

for (const value of [undefined, null, "", "unknown", "toString", "constructor", "__proto__"]) {
  assert.equal(timelineMark(value), null, `${String(value)} must return null`);
}
const first = timelineMark("blunder");
first.symbol = "changed";
assert.equal(timelineMark("blunder").symbol, "??", "marks must not be shared mutable objects");

// The strip in main.ts keeps SAN and adds the mark only when the move has a notable classification.
assert.match(mainSource, /import \{ timelineMark \} from '\.\/timeline-marks\.js'/, "main.ts must import timelineMark");
const stripAt = mainSource.indexOf("className:'move-strip'");
assert.ok(stripAt >= 0, "move strip not found in main.ts");
const strip = mainSource.slice(stripAt, mainSource.indexOf("board-actions", stripAt));
assert.match(strip, /timelineMark\(analysis\?\.moves\?\.\[/, "strip must read the classification from analysis.moves");
assert.match(strip, /\},m\.san,mk&&h\('span'/, "strip must keep the SAN text and add the mark span after it");
assert.match(strip, /'data-mark':mk\.tone/, "strip button must expose data-mark");
assert.match(strip, /'aria-label':`\$\{m\.san\} — \$\{mk\.labelHe\} \/ \$\{mk\.labelEn\}`/, "strip button needs a bilingual aria-label");
assert.match(strip, /title:`\$\{m\.san\} — \$\{mk\.labelHe\} \/ \$\{mk\.labelEn\}`/, "strip button needs a bilingual title");
assert.match(strip, /\.\.\.\(mk\?\{.*\}:\{\}\)/, "attributes must only be added when a mark exists");

console.log(`timeline marks OK (${classes.length} classifications, ${Object.keys(expectedMarks).length} marked)`);
