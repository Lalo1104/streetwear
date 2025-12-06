// StreetWearX - Service Worker
const CACHE_NAME = "streetwearx-cache-v1";

// Archivos esenciales para offline
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./favicon.png"
];

// INSTALACIÓN
self.addEventListener("install", event => {
  console.log("[SW] Instalando Service Worker...");
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("[SW] Cacheando archivos iniciales...");
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// ACTIVACIÓN
self.addEventListener("activate", event => {
  console.log("[SW] Activando Service Worker...");
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Eliminando cache viejo:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// FETCH (modo offline seguro sin afectar Firebase)
self.addEventListener("fetch", event => {
  const req = event.request;

  // No cacheamos llamadas dinámicas a Firebase o Cloudinary
  if (
    req.url.includes("firebasestorage") ||
    req.url.includes("firebase") ||
    req.url.includes("cloudinary")
  ) {
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      return (
        cached ||
        fetch(req).catch(() => caches.match("./index.html"))
      );
    })
  );
});
