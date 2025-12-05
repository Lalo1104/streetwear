// Service Worker avanzado para StreetWearX PWA
const CACHE_VERSION = 'v3';
const CACHE_NAME = `streetwearx-${CACHE_VERSION}`;

// Rutas base de GitHub Pages
const BASE_PATH = '/streetwear';

// Archivos esenciales para que la app siempre cargue offline
const urlsToCache = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/favicon.png`
];

// Instalación del Service Worker
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

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando…');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia de fetch:
// - Para navegaciones (HTML): Network First → fallback a index.html
// - Para Firebase/Cloudinary/APIs: Network First con fallback a cache
// - Para estáticos (CSS, JS, imágenes): Cache First con actualización
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Solo manejamos GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1) Navegaciones (cuando el usuario entra a la app)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          // Cacheamos la respuesta de navegación si es válida
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, resClone);
            });
          }
          return networkRes;
        })
        .catch(() => {
          // Si no hay red, devolvemos el index.html desde cache
          return caches.match(`${BASE_PATH}/index.html`)
            .then((cachedRes) => cachedRes || new Response('Offline - No se pudo cargar la app', { status: 503 }));
        })
    );
    return;
  }

  // 2) Firebase / Google APIs / Cloudinary → Network First
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
          // Si no hay red, intentamos devolver lo que tengamos en cache para esa misma URL
          return caches.match(req)
            .then((cachedRes) => cachedRes || new Response('Offline - Datos no disponibles', { status: 503 }));
        })
    );
    return;
  }

  // 3) Otros recursos estáticos (CSS, JS, imágenes, etc.) → Cache First
  event.respondWith(
    caches.match(req).then((cachedRes) => {
      if (cachedRes) {
        // Devolvemos desde cache y de fondo intentamos actualizar
        fetch(req)
          .then((networkRes) => {
            if (!networkRes || networkRes.status !== 200) return;
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, resClone);
            });
          })
          .catch(() => { /* sin red, no pasa nada */ });

        return cachedRes;
      }

      // Si no estaba en cache, vamos a red y lo cacheamos
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
          // Si falla todo
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
