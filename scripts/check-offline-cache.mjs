// Checks the offline bot-play cache (public/sw.js + dist/data/offline-manifest.json).
// If dist/ is missing or stale it rebuilds it (build.mjs + tsc + manifest; no rules bundle needed),
// because check:release runs before `npm run build` in CI.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { buildStamp, stampServiceWorker } from './offline-stamp.mjs';

const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };
const read = file => readFileSync(file, 'utf8');
const sw = read('public/sw.js');

function run(args) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.status !== 0) { console.error(`failed: node ${args.join(' ')}`); process.exit(1); }
}
const manifestFile = 'dist/data/offline-manifest.json';
const stampedSw = () => stampServiceWorker(sw, JSON.parse(read(manifestFile)).files);
const stale = !existsSync(manifestFile) || !existsSync('dist/sw.js') || !existsSync('dist/src/main.js') || read('dist/sw.js') !== stampedSw();
if (stale) {
  run(['scripts/build.mjs']);
  run(['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json']);
  run(['scripts/build-offline-manifest.mjs']);
}

function arrayLiteral(name) {
  const match = sw.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
  if (!match) { failures.push(`sw.js: ${name} array not found`); return []; }
  return [...match[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
}
const precachePaths = arrayLiteral('PRECACHE_PATHS');
const cdnUrls = arrayLiteral('PRECACHE_CDN');
const distFile = path => (path === '/' ? 'dist/index.html' : join('dist', path));

// 1. every precache path exists in dist/; cross-origin URLs are the only exemption
assert(precachePaths.length >= 15, 'sw.js: PRECACHE_PATHS looks too short');
for (const path of precachePaths) {
  assert(path.startsWith('/') && !path.startsWith('//'), `sw.js: precache path must be same-origin absolute: ${path}`);
  assert(existsSync(distFile(path)), `sw.js precache path missing from dist/: ${path}`);
}
for (const url of cdnUrls) assert(/^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\//.test(url), `sw.js: unexpected cross-origin precache URL: ${url}`);

// the cross-origin URLs must be exactly the ones index.html loads (React), so the app starts offline
const index = read('index.html');
const pageCdn = [...index.matchAll(/<script src="(https:\/\/[^"]+)"/g)].map(m => m[1]);
assert(pageCdn.length > 0, 'index.html: expected cross-origin scripts (React) to cover');
for (const url of pageCdn) assert(cdnUrls.includes(url), `index.html cross-origin script not precached in sw.js: ${url}`);
assert(/PRECACHE_CDN[\s\S]*mode: 'cors'/.test(sw), 'sw.js: CDN scripts (crossorigin="anonymous") must be fetched in cors mode');

// local scripts/styles index.html loads are all covered by precache paths or the manifest
const manifest = JSON.parse(read(manifestFile));
const manifestFiles = Array.isArray(manifest.files) ? manifest.files : [];
const covered = new Set([...precachePaths, ...manifestFiles]);
for (const m of index.matchAll(/(?:src|href)="(\/[^"]+)"/g)) {
  const path = m[1];
  if (path === '/src/main.js' || covered.has(path)) continue;
  failures.push(`index.html asset not precached: ${path}`);
}

// 2. manifest: every file exists, and everything needed for a bot game is listed
for (const path of manifestFiles) {
  assert(path.startsWith('/') && !path.startsWith('/api/'), `manifest path not allowed: ${path}`);
  assert(existsSync(join('dist', path)), `manifest file missing from dist/: ${path}`);
}
const botFiles = readdirSync('public/data/bots').filter(f => f.endsWith('.json'));
assert(botFiles.length >= 50, `expected at least 50 bot files, found ${botFiles.length}`);
for (const file of botFiles) assert(covered.has(`/data/bots/${file}`), `bot runtime file not precached: ${file}`);
for (const required of ['/src/main.js', '/src/bot-worker.js', '/src/bot-worker-client.js', '/src/bot-engine.js', '/vendor/cm-chessboard/src/Chessboard.js']) {
  assert(covered.has(required), `required bot-play file not precached: ${required}`);
}
const walkSrc = dir => readdirSync(dir).flatMap(name => {
  const full = join(dir, name);
  return statSync(full).isDirectory() ? walkSrc(full) : [full];
});
for (const file of walkSrc('dist/src').filter(f => /\.m?js$/.test(f))) {
  const path = '/' + file.replaceAll('\\', '/').replace(/^dist\//, '');
  assert(covered.has(path), `dist/src module not precached: ${path}`);
}
assert(sw.includes("const MANIFEST_URL = '/data/offline-manifest.json'"), 'sw.js must read the build manifest at install');

// 3. /api is never cached (static analysis)
assert(precachePaths.every(p => !p.startsWith('/api')) && cdnUrls.every(u => !u.includes('/api/')), 'sw.js: /api must not be precached');
const fetchHandler = sw.slice(sw.indexOf("self.addEventListener('fetch'"));
const apiGuard = fetchHandler.indexOf("url.pathname.startsWith('/api/')");
const methodGuard = fetchHandler.indexOf("request.method !== 'GET'");
const firstRespond = fetchHandler.indexOf('respondWith');
assert(apiGuard > -1 && methodGuard > -1, 'sw.js: fetch handler must guard /api/ and non-GET requests');
assert(firstRespond > apiGuard && firstRespond > methodGuard, 'sw.js: /api and non-GET guards must run before any respondWith');
assert(/startsWith\('\/api\/'\)\) return;/.test(fetchHandler), 'sw.js: /api/ requests must return without being handled (network only)');
assert(/method !== 'GET'\) return;/.test(fetchHandler), 'sw.js: non-GET requests must return without being handled');
assert(/!p\.startsWith\('\/api\/'\)/.test(sw), 'sw.js: manifest paths under /api/ must be rejected');
assert(!/\/api\/[^']*'\s*[,\]]/.test(sw.slice(0, sw.indexOf('const STATIC_PREFIXES'))), 'sw.js: no /api entry in the precache lists');

// 4. cache name changed from v2, old tabia-* caches deleted, only status 200 (or opaque CDN) is stored
const name = (sw.match(/const CACHE = '([^']+)'/) || [])[1];
assert(Boolean(name) && name !== 'tabia-shell-v2', 'sw.js: cache name must change from tabia-shell-v2');
const version = Number((name || '').match(/^tabia-shell-v(\d+)$/)?.[1]);
assert(version > 2, `sw.js: cache name must be tabia-shell-v<N> with N > 2, got ${name}`);
assert(/CACHE_PREFIX = 'tabia-'/.test(sw) && /key\.startsWith\(CACHE_PREFIX\) && key !== CACHE/.test(sw) && /caches\.delete\(key\)/.test(sw), 'sw.js: activate must delete old tabia-* caches');
assert(/response\.status === 200 \|\| \(isCdn && response\.type === 'opaque'\)/.test(sw), 'sw.js: only status 200 (or opaque CDN) may be cached');
assert(!/addAll\(/.test(sw), 'sw.js: precache must not use cache.addAll (one missing asset would fail the install)');
assert(/precacheOne[\s\S]*catch \{\}/.test(sw), 'sw.js: each precache asset needs its own catch');
assert(/mode === 'navigate'/.test(sw) && /cache\.match\('\/'\)/.test(sw), 'sw.js: navigations must fall back to the cached shell');

// 5. per-build stamp: dist/sw.js gets a versioned cache name so each deploy reinstalls and re-precaches
const distSw = read('dist/sw.js');
const distName = (distSw.match(/const CACHE = '([^']+)'/) || [])[1] || '';
assert(distSw === stampedSw(), 'dist/sw.js is not the stamped copy of public/sw.js (run npm run build)');
assert(/^tabia-shell-v\d+-[0-9a-f]{12}$/.test(distName) && distName.startsWith(`${name}-`), `dist/sw.js cache name must be ${name}-<12 hex>, got ${distName}`);
assert(distName !== 'tabia-shell-v2' && !distName.startsWith('tabia-shell-v2-'), 'dist/sw.js cache name must not be the v2 name');
assert(distSw.replace(distName, name) === sw, 'dist/sw.js may differ from public/sw.js only by the cache name stamp');
const stamp = buildStamp(sw, manifestFiles);
assert(distName === `${name}-${stamp}`, 'dist/sw.js stamp does not match the manifest and precached files');
assert(buildStamp(sw, manifestFiles.slice(1)) !== stamp, 'stamp must change when the manifest changes');
assert(buildStamp(sw + '\n// changed', manifestFiles) !== stamp, 'stamp must change when sw.js changes');

// 6. main.ts bot loading must fall back to the cached manifest when /api/bots fails (offline)
const mainTs = read('src/main.ts');
const botLoad = mainTs.slice(mainTs.indexOf("fetch('/api/bots'"));
const apiCall = botLoad.slice(0, botLoad.indexOf('BOT_MANIFEST_URL'));
assert(/fetch\('\/api\/bots'[^;]*\)\.catch\(\(\) ?=> ?null\)/.test(apiCall), 'main.ts: a rejected /api/bots fetch must not throw (needs .catch)');
assert(/if\(r&&r\.ok\)/.test(apiCall), 'main.ts: /api/bots result must be null-checked before reading it');
assert(/fetch\(BOT_MANIFEST_URL/.test(botLoad.slice(0, 900)), 'main.ts: bot loading must fall through to fetch(BOT_MANIFEST_URL)');

if (failures.length) {
  console.error('check-offline-cache: FAIL');
  for (const f of failures) console.error(' - ' + f);
  process.exit(1);
}
console.log(`check-offline-cache: OK (${precachePaths.length} fixed paths, ${manifestFiles.length} manifest files, ${botFiles.length} bot files, cache ${distName})`);
