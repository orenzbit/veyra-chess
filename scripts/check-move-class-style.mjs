// Move-classification look: colors, white inline SVG icons, one source of truth, badge at the top-right of the square.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

globalThis.React = { createElement: (type, props, ...children) => ({ type, props, children }) };
const { MOVE_CLASS_STYLE, MOVE_CLASS_KEYS, moveClassStyle, moveClassLabel, moveClassIconSvg, moveClassBadge, moveClassBadgeHtml } = await import("../src/move-class-style.ts");

const EXPECTED = {
  brilliant: ["#1baca6", "מבריק", "Brilliant"],
  great: ["#5b8baf", "מצוין", "Great"],
  best: ["#81b64c", "הטוב ביותר", "Best"],
  excellent: ["#95b776", "מעולה", "Excellent"],
  good: ["#95a370", "טוב", "Good"],
  book: ["#a88865", "ספר", "Book"],
  inaccuracy: ["#f7c045", "אי-דיוק", "Inaccuracy"],
  mistake: ["#ffa459", "טעות", "Mistake"],
  blunder: ["#fa412d", "שגיאה גסה", "Blunder"],
  miss: ["#ee6b55", "החמצה", "Miss"],
  forced: ["#6b6964", "כפוי", "Forced"]
};

assert.deepEqual([...MOVE_CLASS_KEYS].sort(), Object.keys(EXPECTED).sort(), "exactly the 11 classification keys");
for (const [key, [color, he, en]] of Object.entries(EXPECTED)) {
  assert.deepEqual(MOVE_CLASS_STYLE[key], { color, he, en }, `${key} color and labels`);
  assert.equal(moveClassLabel(key, "he"), he);
  assert.equal(moveClassLabel(key, "en"), en);
  const svg = moveClassIconSvg(key);
  assert.ok(svg.startsWith('<svg viewBox="0 0 24 24"') && svg.endsWith("</svg>"), `${key} icon is an inline 24x24 SVG`);
  const inner = svg.slice(svg.indexOf(">") + 1, -"</svg>".length);
  assert.ok(/<(path|polygon|circle|rect)\b/.test(inner), `${key} icon has shapes`);
  assert.ok(!/https?:|url\(|href|<image|<img|<text|font|xmlns/i.test(svg), `${key} icon has no external reference, image or font`);
  assert.ok(/#fff/.test(inner), `${key} icon is white`);
  assert.ok(!/#(?!fff\b)[0-9a-f]{3,6}\b/i.test(inner), `${key} icon uses only white`);
  const html = moveClassBadgeHtml(key, { size: 22, lang: "en" });
  assert.ok(html.includes(`--mcb-color:${color}`) && html.includes(`aria-label="${en}"`) && html.includes(svg), `${key} badge html`);
  const el = moveClassBadge(key, { size: 24, lang: "he" });
  assert.equal(el.props["aria-label"], he, `${key} badge element label`);
  assert.equal(el.props.style["--mcb-color"], color);
}
const icons = new Set(MOVE_CLASS_KEYS.map(k => moveClassIconSvg(k)));
assert.equal(icons.size, 10, "only best and excellent share an icon (single check)");
assert.equal(moveClassIconSvg("best"), moveClassIconSvg("excellent"));
assert.ok(moveClassIconSvg("forced").includes("<rect"), "forced renders a padlock");
for (const bad of [undefined, null, "", "nope", "__proto__", "toString"]) assert.equal(moveClassStyle(bad), MOVE_CLASS_STYLE.good, `unknown ${String(bad)} falls back to good`);
assert.equal(moveClassBadgeHtml("blunder", { decorative: true }).includes("aria-hidden"), true);

const [main, css, pkg] = await Promise.all(["src/main.ts", "public/styles.css", "package.json"].map(p => readFile(p, "utf8")));

// main.ts uses the module everywhere a classification is shown and keeps no private table or icon files.
assert.match(main, /from '\.\/move-class-style\.js'/, "main.ts imports move-class-style");
assert.ok(!main.includes("CLASS_VIS"), "no private CLASS_VIS table left in main.ts");
assert.ok(!main.includes("classification-icons"), "no classification-icons file references left in main.ts");
assert.ok(!/classification-icon',src|\.symbol\b/.test(main), "no per-classification img/symbol rendering left in main.ts");
const uses = name => (main.match(new RegExp(`${name}\\(`, "g")) || []).length;
assert.ok(uses("moveClassBadgeHtml") >= 1, "board overlay uses the badge");
assert.ok(uses("moveClassBadge") >= 3, "coach card, move list and summary use the badge");
assert.ok(uses("moveClassBadgeProps") >= 1, "move strip uses the badge props");
assert.ok(uses("moveClassLabel") >= 2, "labels come from the module");

// Board overlay: positioned from the destination square in screen coordinates (so flipped boards work) and LTR.
const overlay = main.slice(main.indexOf("function drawOverlays"), main.indexOf("function addArrow"));
assert.match(overlay, /const coord=/, "overlay keeps the orientation-aware coord()");
assert.match(overlay, /orient==='white'\?\{[^}]*\}:\{[^}]*\}/, "coord() handles white and black orientation");
assert.match(overlay, /coord\(mv\.to\)/, "badge goes on the destination square");
assert.match(overlay, /className='move-class-square'/);
assert.match(overlay, /moveClassBadgeHtml\(a\.classification/);

// CSS: top-right of the square, LTR layers, white thin border, round.
const rule = selector => {
  const m = css.match(new RegExp(`(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\{([^}]*)\\}`));
  assert.ok(m, `${selector} rule exists`);
  return m[1];
};
const place = rule(".move-class-square .move-class-badge");
assert.ok(/top:0\b/.test(place) && /right:0\b/.test(place) && !/(^|;)\s*(left|bottom):/.test(place), "badge sits at the top-right corner of the square");
assert.ok(/position:absolute/.test(rule(".move-class-square")) && /direction:ltr/.test(rule(".move-class-square")), "square box is absolute and LTR");
assert.ok(/direction:ltr/.test(rule(".badge-layer")), "overlay layer is direction:ltr (no RTL mirroring)");
const badge = rule(".move-class-badge");
assert.ok(/border-radius:50%/.test(badge) && /border:1\.5px solid #fff/.test(badge) && /background:var\(--mcb-color\)/.test(badge), "round badge with thin white border in the class color");
assert.ok(!css.includes(".piece-badge"), "old .piece-badge style is gone");
for (const tone of ["brilliant", "great", "mistake", "blunder", "miss"]) assert.ok(css.includes(`.strip-mark-${tone}`), `strip mark style for ${tone}`);
for (const old of ["#00D4AA", "#4CACEB", "#E67E22", "#D02030", "#FF5252"]) assert.ok(!css.includes(old), `old strip color ${old} is gone`);

// Chained into the review check.
assert.ok(/"check:review-determinism":[^\n]*node scripts\/check-move-class-style\.mjs/.test(pkg), "check:review-determinism runs this check");

console.log(`move class style OK (${MOVE_CLASS_KEYS.length} classes, ${icons.size} distinct icons)`);
