// Service Worker for Bingo PWA — caches app for offline play
const CACHE_NAME = 'bingo-es-v13';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/js/firebase.config.js?v=13',
  '/js/firebase-init.js?v=13',
  '/js/shared.js?v=13',
  '/js/host.js?v=13',
  '/js/player.js?v=13',
  '/styles/host.css?v=13',
  '/styles/player.css?v=13',
  '/views/host.html?v=13',
  '/views/player.html?v=13',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network-first for JS and CSS to always get fresh code
  if (event.request.url.endsWith('.js') || event.request.url.endsWith('.css')) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        // Cache the fresh response for next time
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return networkResponse;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for other assets (HTML, images, etc.)
  event.respondWith(
    caches.match(event.request).then((response) =>
      response || fetch(event.request).catch(() => caches.match('/index.html'))
    )
  );
});
