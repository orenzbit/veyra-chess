// The eval bar is a white/black chess scale: the fill grows from the bottom with White's winning
// chance (src/main.ts eval-fill-v height), so the fill must be the LIGHT colour and the track the dark
// one, as on lichess and chess.com. With a dark fill, "White 100%" painted the whole bar black and read
// as "Black is winning". npm run check:review-determinism (check-eval-bar-colors.mjs)
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const styles = await readFile('public/styles.css', 'utf8');
const theme = await readFile('public/ui-theme.css', 'utf8');
const main = await readFile('src/main.ts', 'utf8');
assert.match(main, /className:'eval-fill-v',style:\{height:`\$\{currentWhiteChance\}%`\}/, 'the fill height is White\'s chance');
assert.match(styles, /\.eval-fill-v\{[^}]*bottom:0/, 'the fill grows from the bottom');

const rules = (css) => [...css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]*;/g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => [sel.trim(), body]);
const prop = (body, name) => body.match(new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`))?.[1].trim();
const vars = (css, selector) => Object.fromEntries(rules(css).filter(([s]) => s === selector).flatMap(([, b]) => [...b.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)].map(([, k, v]) => [k, v.trim()])));
const background = (css, selector) => rules(css).filter(([s]) => s === selector).map(([, b]) => prop(b, 'background')).filter(Boolean).at(-1);
const resolve = (value, scope) => { for (let i = 0; i < 5 && /var\(/.test(value); i++) value = value.replace(/var\((--[\w-]+)\)/g, (_, k) => scope[k] ?? 'unresolved'); return value; };
const luminance = (hex) => { const m = String(hex).match(/^#([0-9a-f]{6})/i); assert.ok(m, `a hex colour, got ${hex}`); const [r, g, b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255).map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

const rootVars = vars(styles, ':root');
const themes = {
  'app theme (ui-theme.css)': {
    track: background(theme, 'html:not(:has(.daily-rhythm)) .eval-bar-v') ?? resolve(background(styles, '.eval-bar-v'), { ...rootVars, ...vars(theme, ':root:not(:has(.daily-rhythm))') }),
    fill: background(theme, 'html:not(:has(.daily-rhythm)) .eval-fill-v') ?? resolve(background(styles, '.eval-fill-v'), { ...rootVars, ...vars(theme, ':root:not(:has(.daily-rhythm))') }),
  },
  'base styles.css': { track: resolve(background(styles, '.eval-bar-v'), rootVars), fill: resolve(background(styles, '.eval-fill-v'), rootVars) },
  'daily-rhythm screen': { track: resolve(background(styles, '.eval-bar-v'), { ...rootVars, ...vars(styles, '.daily-rhythm') }), fill: resolve(background(styles, '.eval-fill-v'), { ...rootVars, ...vars(styles, '.daily-rhythm') }) },
};
let failures = 0;
for (const [name, { track, fill }] of Object.entries(themes)) {
  const ok = luminance(fill) > luminance(track) * 3 + 0.05;
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}: White's part (fill ${fill}) is light and the track (${track}) is dark`);
  if (!ok) failures += 1;
}
if (failures) { console.log(`FAIL: ${failures} eval bar colour check(s) failed.`); process.exit(1); }
console.log('PASS: the eval bar shows White as the light part in every theme.');
