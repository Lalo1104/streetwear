// Service Worker para StreetWearX
const CACHE_VERSION = 'v2';
const CACHE_NAME = `streetwearx-${CACHE_VERSION}`;

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './favicon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null)
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cacheRes => {
      return (
        cacheRes ||
        fetch(event.request)
          .then(networkRes => {
            caches.open(CACHE_NAME).then(cache =>
              cache.put(event.request, networkRes.clone())
            );
            return networkRes;
          })
          .catch(() => caches.match('./index.html'))
      );
    })
  );
});
