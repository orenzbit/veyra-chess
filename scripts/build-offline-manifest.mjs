// Writes dist/data/offline-manifest.json: the build output the service worker (public/sw.js)
// precaches on install. File names are not hashed, so a plain list of paths is enough.
// Runs after tsc in `npm run build` (tsc emits dist/src).
import { readdir, writeFile } from 'node:fs/promises';
import { join, posix } from 'node:path';

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
console.log(`offline manifest: ${files.length} files`);
