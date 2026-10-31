// The blindfold click/highlight grid sits on top of the drawn board. The board is always drawn
// left-to-right (a-file on the left for White), so the grid must not follow the page's RTL direction;
// otherwise, in Hebrew, the highlight for e2 lands on d2 (files mirrored a<->h, d<->e).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync("public/styles.css", "utf8");
const rule = css.match(/\.blindfold-board-input\{([^}]*)\}/);
assert.ok(rule, "public/styles.css defines .blindfold-board-input");
assert.match(rule[1], /(^|;)direction:ltr(;|$)/, ".blindfold-board-input must be direction:ltr so highlights match the drawn squares in RTL pages");
console.log("PASS: blindfold highlight grid keeps board (LTR) geometry in RTL pages.");
