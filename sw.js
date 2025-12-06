const CACHE = "swx-cache-v1";
const FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.png"
];

self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.map(k=>k!==CACHE ? caches.delete(k) : null)
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", e=>{
  if(e.request.method!=="GET") return;

  e.respondWith(
    caches.match(e.request)
    .then(res=>res || fetch(e.request))
  );
});
