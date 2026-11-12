// Checks the puzzle API the way Netlify ships it: bundled by esbuild to CommonJS, where
// import.meta.url is empty. npm run check:netlify-bundle
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = mkdtempSync(join(tmpdir(), 'veyra-bundle-'));
const require = createRequire(import.meta.url);
const { createFakeSupabase } = await import(pathToFileURL(join(root, 'scripts/lib/fake-supabase.mjs')).href);

let failures = 0;
async function check(name, fn) {
  try { await fn(); console.log(`PASS: ${name}`); } catch (error) { failures += 1; console.log(`FAIL: ${name} (${error?.message || error})`); }
}
async function bundle(entry) {
  const outfile = join(out, entry.replace(/[\\/]/g, '_') + '.cjs');
  await build({ entryPoints: [join(root, entry)], outfile, bundle: true, platform: 'node', format: 'cjs', target: 'node18', logLevel: 'silent' });
  return require(outfile);
}

// Netlify runs the function from its own directory with LAMBDA_TASK_ROOT holding included_files.
const realCwd = process.cwd();
process.chdir(out);
process.env.LAMBDA_TASK_ROOT = root;

const kits = await bundle('netlify/functions/lib/puzzle-kits.mjs');
await check('bundled loadSeeds() finds data/puzzle-seed.json via LAMBDA_TASK_ROOT', async () => {
  assert.equal((await kits.loadSeeds()).length, 24);
});
const engine = await bundle('netlify/functions/lib/engine-node.mjs');
await check('bundled engine keeps its own exports and wasmCandidates() includes LAMBDA_TASK_ROOT', async () => {
  assert.equal(typeof engine.wasmCandidates, 'function', 'engine-node exports were replaced by the WasmEngine UMD');
  assert.ok(engine.wasmCandidates().some((p) => p.startsWith(root)));
  assert.ok(await engine.loadEngine(), 'bundled loadEngine() did not load the wasm engine');
});
const refill = await bundle('netlify/functions/puzzle-refill-background.mjs');
await check('bundled puzzle-refill-background still exports its handler', async () => {
  assert.equal(typeof refill.handler, 'function', `exports: ${Object.keys(refill).join(',')}`);
});

const puzzles = await bundle('netlify/functions/puzzles.mjs');
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORIGIN = 'https://veyra.test';
const call = (handler) => handler({ httpMethod: 'GET', queryStringParameters: { action: 'state' }, rawUrl: `${ORIGIN}/api/puzzles?action=state`, headers: { origin: ORIGIN } });
await check('bundled /api/puzzles?action=state answers 200 (was 503 sync_unavailable)', async () => {
  const handler = puzzles.createHandler({ db: createFakeSupabase(), env: { PUZZLES_SERVER_ENABLED: '1' }, currentSession: () => ({ user_id: A }) });
  const res = await call(handler);
  assert.equal(res.statusCode, 200, res.body);
});

await check('unexpected errors stay generic for clients and are logged server-side', async () => {
  const logged = [];
  const original = console.error;
  console.error = (...args) => logged.push(args.map(String).join(' '));
  let res;
  try {
    const handler = puzzles.createHandler({ db: async () => { throw new Error('secret-internal-detail'); }, env: { PUZZLES_SERVER_ENABLED: '1' }, currentSession: () => ({ user_id: A }), loadSeeds: async () => [] });
    res = await call(handler);
  } finally { console.error = original; }
  assert.equal(res.statusCode, 503);
  assert.deepEqual(JSON.parse(res.body), { ok: false, error: 'sync_unavailable' });
  assert.ok(!res.body.includes('secret-internal-detail'), 'internal detail leaked to client');
  assert.ok(logged.some((line) => line.includes('secret-internal-detail')), 'real error was not logged');
});

process.chdir(realCwd);
if (failures) { console.error(`FAIL: ${failures} Netlify bundle check(s) failed.`); process.exit(1); }
console.log('PASS: puzzle API works when bundled to CommonJS as on Netlify; unexpected errors are logged, not leaked.');
