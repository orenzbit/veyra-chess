const CACHE = 'tabia-shell-v2';
const SHELL = [
  '/',
  '/styles.css',
  '/chess-global.js',
  '/cm-global.js',
  '/coach-avatar.webp',
  '/manifest.webmanifest',
  '/icons/tabia-chess.svg',
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then(r => r || caches.match('/'))));
});
