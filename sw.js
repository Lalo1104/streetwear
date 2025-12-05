const CACHE_VERSION='v1';
const CACHE_NAME=`streetwearx-${CACHE_VERSION}`;
const urlsToCache=['./','./index.html','./manifest.json','./favicon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(urlsToCache)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(n=>Promise.all(n.map(x=>x!==CACHE_NAME&&caches.delete(x)))));self.clients.claim();});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{const cl=resp.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,cl));return resp;}).catch(()=>caches.match('./index.html'))));
});