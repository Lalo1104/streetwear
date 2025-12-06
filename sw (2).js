// Service Worker para StreetWearX PWA
const CACHE_VERSION = 'v2';
const CACHE_NAME = `streetwearx-${CACHE_VERSION}`;

const urlsToCache = [
  '/streetwear/',
  '/streetwear/index.html',
  '/streetwear/manifest.json',
  '/streetwear/favicon.png'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Cache abierto:', CACHE_NAME);
      return cache.addAll(urlsToCache).catch(err => {
        console.log('Error al cachear archivos:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia Network First para Firebase / Cloudinary / APIs
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // Firebase, Google APIs, Cloudinary → siempre intentar red primero
  if (
    url.includes('firebase') ||
    url.includes('googleapis.com') ||
    url.includes('cloudinary')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then((response) => response || new Response('Offline - No disponible'));
        })
    );
    return;
  }

  // Resto de recursos → Cache First
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // fallback a la página principal offline
          return caches.match('/streetwear/index.html');
        });
    })
  );
});

// Push Notifications (opcional)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Nueva notificación de StreetWearX',
    icon: '/streetwear/favicon.png',
    badge: '/streetwear/favicon.png',
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
        if (client.url.includes('/streetwear/') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/streetwear/');
      }
    })
  );
});
