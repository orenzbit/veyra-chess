// Per-build cache version for public/sw.js. Without it the service worker file is byte-identical
// between deploys, the browser never reinstalls it, and the precache is never refreshed.
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CACHE_LINE = /const CACHE = '(tabia-shell-v\d+)';/;

export function precachePathsOf(swSource) {
  const match = swSource.match(/const PRECACHE_PATHS = \[([\s\S]*?)\];/);
  return match ? [...match[1].matchAll(/'([^']+)'/g)].map(m => m[1]) : [];
}

const distFile = (distDir, path) => join(distDir, path === '/' ? 'index.html' : path);

// Hash of the sw source, the manifest list and the content of every file the worker precaches.
export function buildStamp(swSource, manifestFiles, distDir = 'dist') {
  const hash = createHash('sha256');
  hash.update(swSource);
  const paths = [...new Set([...precachePathsOf(swSource), ...manifestFiles])].sort();
  for (const path of paths) {
    hash.update('\0' + path + '\0');
    const file = distFile(distDir, path);
    if (existsSync(file)) hash.update(readFileSync(file));
  }
  return hash.digest('hex').slice(0, 12);
}

export function stampServiceWorker(swSource, manifestFiles, distDir = 'dist') {
  if (!CACHE_LINE.test(swSource)) throw new Error('sw.js: cache name line not found');
  const stamp = buildStamp(swSource, manifestFiles, distDir);
  return swSource.replace(CACHE_LINE, (_, base) => `const CACHE = '${base}-${stamp}';`);
}
