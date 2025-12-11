const CACHE_NAME = 'streetwearx-cache-v1';

// Archivos que se guardan para trabajar offline
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // Agrega aquí tus CSS / JS principales si los tienes, por ejemplo:
  // './styles.css',
  // './app.js'
];

// INSTALACIÓN: precache de recursos básicos
self.addEventListener('install', (event) => {
  console.log('📦 [SW] Install');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch((err) => console.error('Error al precachear:', err))
  );
});

// ACTIVATE: limpieza de cachés viejos
self.addEventListener('activate', (event) => {
  console.log('🧹 [SW] Activate');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Borrando caché viejo:', key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// FETCH: estrategia "network first con fallback a caché"
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // No cacheamos llamadas que no sean GET (POST, etc)
  if (req.method !== 'GET') return;

  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        // Guardamos copia en caché para la próxima vez
        const resClone = networkRes.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return networkRes;
      })
      .catch(() => {
        // Si no hay red, devolvemos de caché si existe
        return caches.match(req).then((cacheRes) => {
          if (cacheRes) return cacheRes;
          // Puedes devolver una página offline personalizada si quieres
          // return caches.match('./offline.html');
          return new Response('Sin conexión y recurso no encontrado en caché.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
      })
  );
});
