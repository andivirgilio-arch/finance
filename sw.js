/* ADV Portafoglio — Service Worker
 * Cache-first per gli asset statici, network-first per le API esterne.
 */
const CACHE = 'adv-portafoglio-v6';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Non intercettare le chiamate dati (Yahoo / proxy / Apps Script): vanno sempre in rete.
  if (
    url.includes('corsproxy.io') ||
    url.includes('query1.finance.yahoo.com') ||
    url.includes('query2.finance.yahoo.com') ||
    url.includes('script.google.com') ||
    url.includes('script.googleusercontent.com')
  ) {
    return; // lascia gestire al browser
  }

  // Cache-first per asset statici
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((resp) => {
          if (resp && resp.status === 200 && event.request.method === 'GET') {
            const clone = resp.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
