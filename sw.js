const CACHE = 'travel-pocket-v2';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Network-first for external APIs
  if (url.hostname.includes('nominatim') || url.hostname.includes('overpass') || url.hostname.includes('firebase')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // Cache-first for app shell
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
    if (res.ok) { const c = res.clone(); caches.open(CACHE).then(cache => cache.put(e.request, c)); }
    return res;
  })));
});
