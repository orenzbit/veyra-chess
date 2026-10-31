// Writes dist/data/offline-manifest.json: the build output the service worker (public/sw.js)
// precaches on install. File names are not hashed, so a plain list of paths is enough.
// It also stamps dist/sw.js with a per-build cache name so every deploy reinstalls the worker.
// Runs after tsc in `npm run build` (tsc emits dist/src).
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { stampServiceWorker } from './offline-stamp.mjs';

const DIST = 'dist';
const ROOTS = [
  { dir: 'src', ext: ['.js', '.mjs'] },
  { dir: 'vendor/cm-chessboard', ext: ['.js', '.css', '.svg'] },
  { dir: 'data/bots', ext: ['.json'] },
];

async function walk(relDir, ext) {
  const out = [];
  let entries;
  try {
    entries = await readdir(join(DIST, relDir), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const rel = posix.join(relDir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(rel, ext));
    else if (ext.some(e => entry.name.endsWith(e))) out.push('/' + rel);
  }
  return out;
}

const files = [];
for (const root of ROOTS) files.push(...await walk(root.dir, root.ext));
files.sort();
if (!files.some(f => f === '/src/main.js')) {
  console.error('build-offline-manifest: dist/src/main.js missing; run tsc first');
  process.exit(1);
}
await writeFile(join(DIST, 'data', 'offline-manifest.json'), JSON.stringify({ files }, null, 1) + '\n');
const swSource = await readFile('public/sw.js', 'utf8');
await writeFile(join(DIST, 'sw.js'), stampServiceWorker(swSource, files, DIST));
console.log(`offline manifest: ${files.length} files; sw.js stamped`);
