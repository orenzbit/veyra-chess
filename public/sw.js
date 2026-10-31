// Offline support: after one online visit a game against a local bot works without a connection.
// - /api/* and every non-GET request are never touched (network only, never cached).
// - HTML navigations: network first, the cached app shell is the fallback.
// - Static assets: stale-while-revalidate, so updates still arrive (one reload later).
// - Build output (dist/src/*.js, cm-chessboard, bot files) is listed by /data/offline-manifest.json,
//   written by scripts/build-offline-manifest.mjs, because the build does not hash file names.
const CACHE_PREFIX = 'tabia-';
const CACHE = 'tabia-shell-v3';
const MANIFEST_URL = '/data/offline-manifest.json';

// Every path here must exist in dist/ (checked by scripts/check-offline-cache.mjs).
const PRECACHE_PATHS = [
  '/',
  '/styles.css',
  '/ui-theme.css',
  '/home-page.css',
  '/bootstrap.js',
  '/chess-global.js',
  '/cm-global.js',
  '/engine-worker.js',
  '/coach-avatar.webp',
  '/manifest.webmanifest',
  '/icons/tabia-chess.svg',
  '/vendor/cm-chessboard/chessboard.css',
  '/vendor/cm-chessboard/pieces/standard.svg',
  '/vendor/veyra-rules/chess-compat.js',
  '/vendor/wasm-engine.js',
  '/vendor/chessy-ai-fast.wasm',
  '/data/bots/index.json',
  '/data/repertoire.json',
  '/data/openings.json',
  '/data/recommendations.json',
];

// Cross-origin URLs (exempt from the dist/ existence check). React loads from here in index.html.
// They are fetched in CORS mode because the page loads them with crossorigin="anonymous".
const PRECACHE_CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
];

const STATIC_PREFIXES = ['/src/', '/vendor/', '/data/bots/', '/assets/', '/icons/'];
const NEVER_INTERCEPT = ['/vendor/human-check.js', '/vendor/altcha/'];

function isStaticPath(path) {
  if (NEVER_INTERCEPT.some(p => path.startsWith(p))) return false;
  if (path !== '/' && PRECACHE_PATHS.includes(path)) return true;
  return STATIC_PREFIXES.some(p => path.startsWith(p));
}

function isCacheable(response, isCdn) {
  return response.status === 200 || (isCdn && response.type === 'opaque');
}

async function precacheOne(cache, url, isCdn) {
  try {
    const init = isCdn ? { cache: 'reload', mode: 'cors', credentials: 'omit' } : { cache: 'reload' };
    const response = await fetch(new Request(url, init));
    if (isCacheable(response, isCdn)) await cache.put(url, response);
  } catch {}
}

async function manifestPaths() {
  try {
    const response = await fetch(MANIFEST_URL, { cache: 'no-store' });
    if (!response.ok) return [];
    const data = await response.json();
    const files = Array.isArray(data && data.files) ? data.files : [];
    return files.filter(p => typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') && !p.startsWith('/api/'));
  } catch {
    return [];
  }
}

async function precache() {
  const cache = await caches.open(CACHE);
  const paths = [...new Set([...PRECACHE_PATHS, ...(await manifestPaths())])];
  // Each asset has its own catch: one missing optional file must not fail the whole install.
  await Promise.all([
    ...paths.map(path => precacheOne(cache, path, false)),
    ...PRECACHE_CDN.map(url => precacheOne(cache, url, true)),
  ]);
}

self.addEventListener('install', event => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (isCacheable(response, false)) cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch {
    return (await cache.match(request, { ignoreSearch: true })) || (await cache.match('/')) || Response.error();
  }
}

async function staleWhileRevalidate(event, isCdn) {
  const request = event.request;
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreVary: true });
  const update = fetch(request)
    .then(response => {
      if (isCacheable(response, isCdn)) cache.put(request, response.clone()).catch(() => {});
      return response;
    })
    .catch(() => null);
  if (cached) {
    event.waitUntil(update);
    return cached;
  }
  return (await update) || Response.error();
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return;

  if (PRECACHE_CDN.includes(request.url)) {
    event.respondWith(staleWhileRevalidate(event, true));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }
  if (isStaticPath(url.pathname)) event.respondWith(staleWhileRevalidate(event, false));
});
