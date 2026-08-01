// Service worker minimal (module 8, installabilité PWA) : stratégie
// "réseau d'abord, repli sur le cache" pour les pages — permet à l'app
// de rester ouvrable hors-ligne sur les écrans déjà visités, condition
// technique requise par les navigateurs pour proposer l'installation.
const CACHE_NAME = 'eticketpro-shell-v1';
const SHELL_URLS = ['/dashboard'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached ?? caches.match('/dashboard'))),
  );
});
