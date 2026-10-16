// Bundles the MIT rules layer (rules-src/chess-compat.mjs + js-chess-engine) into one browser module.
// Usage: node scripts/build-rules.mjs [--check]   (--check fails if the committed bundle is stale)
import { build } from 'esbuild';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
const OUT = 'public/vendor/veyra-rules/chess-compat.js';
const check = process.argv.includes('--check');
const r = await build({
  entryPoints: ['rules-src/chess-compat.mjs'], bundle: true, format: 'esm', platform: 'browser',
  target: 'es2020', minify: true, legalComments: 'none', write: false,
  banner: { js: '/* Veyra rules layer (MIT) + js-chess-engine (MIT, Josef Jadrny). See LICENSE-js-chess-engine.txt */' },
});
const code = r.outputFiles[0].text;
if (check) {
  const cur = await readFile(OUT, 'utf8').catch(() => '');
  if (cur !== code) { console.error('STALE: run node scripts/build-rules.mjs'); process.exit(1); }
  console.log('PASS: rules bundle is up to date'); process.exit(0);
}
await mkdir('public/vendor/veyra-rules', { recursive: true });
await writeFile(OUT, code);
await copyFile('node_modules/js-chess-engine/LICENSE', 'public/vendor/veyra-rules/LICENSE-js-chess-engine.txt');
console.log('built', OUT, code.length, 'bytes');
