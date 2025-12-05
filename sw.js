// Service Worker avanzado para StreetWearX PWA
const CACHE_VERSION = 'v3';
const CACHE_NAME = `streetwearx-${CACHE_VERSION}`;
const BASE_PATH = '/streetwear';

// Archivos esenciales para que la app siempre cargue offline
const urlsToCache = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/favicon.png`
];

// Instalación
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando…');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cache abierto:', CACHE_NAME);
      return cache.addAll(urlsToCache).catch(err => {
        console.log('[SW] Error al cachear archivos iniciales:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activación
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando…');
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// FETCH: navegación, APIs y estáticos
self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1) Navegación (HTML) → Network First, fallback a index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, resClone);
            });
          }
          return networkRes;
        })
        .catch(() => {
          return caches.match(`${BASE_PATH}/index.html`)
            .then((cachedRes) =>
              cachedRes || new Response('Offline - No se pudo cargar la app', { status: 503 })
            );
        })
    );
    return;
  }

  // 2) Firebase / Google APIs / Cloudinary → Network First con fallback a cache
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('cloudinary')
  ) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (!networkRes || networkRes.status !== 200) {
            return networkRes;
          }
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, resClone);
          });
          return networkRes;
        })
        .catch(() => {
          return caches.match(req)
            .then((cachedRes) =>
              cachedRes || new Response('Offline - Datos no disponibles', { status: 503 })
            );
        })
    );
    return;
  }

  // 3) Estáticos (CSS, JS, imágenes…) → Cache First con actualización en segundo plano
  event.respondWith(
    caches.match(req).then((cachedRes) => {
      if (cachedRes) {
        // Actualiza en segundo plano si hay red
        fetch(req)
          .then((networkRes) => {
            if (!networkRes || networkRes.status !== 200) return;
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, resClone);
            });
          })
          .catch(() => {});
        return cachedRes;
      }

      // No estaba en cache → intenta red y cachea
      return fetch(req)
        .then((networkRes) => {
          if (!networkRes || networkRes.status !== 200) {
            return networkRes;
          }
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, resClone);
          });
          return networkRes;
        })
        .catch(() => {
          return new Response('Offline - Recurso no disponible', { status: 503 });
        });
    })
  );
});

// Push Notifications (opcional)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Nueva notificación de StreetWearX',
    icon: `${BASE_PATH}/favicon.png`,
    badge: `${BASE_PATH}/favicon.png`,
    tag: 'streetwearx',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'StreetWearX', options)
  );
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (let client of clientList) {
        if (client.url.includes(`${BASE_PATH}/`) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(`${BASE_PATH}/`);
      }
    })
  );
});
