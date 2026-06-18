/* ADV Portafoglio — Service Worker
 * Cache-first per gli asset statici, network-first per le API esterne.
 */
const CACHE = 'adv-portafoglio-v15';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
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
  const req = event.request;
  const url = req.url;

  // Non intercettare le chiamate dati (Yahoo / proxy / Apps Script): vanno sempre in rete.
  if (
    url.includes('corsproxy.io') ||
    url.includes('allorigins.win') ||
    url.includes('query1.finance.yahoo.com') ||
    url.includes('query2.finance.yahoo.com') ||
    url.includes('script.google.com') ||
    url.includes('script.googleusercontent.com')
  ) {
    return; // lascia gestire al browser
  }

  const accept = req.headers.get('accept') || '';
  const isHTML = req.mode === 'navigate' || accept.includes('text/html');

  if (isHTML) {
    // NETWORK-FIRST per l'HTML: l'app è sempre aggiornata; offline usa la cache.
    event.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE).then((cache) => cache.put(req, clone));
          }
          return resp;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // CACHE-FIRST per gli altri asset statici (Chart.js, manifest, icone).
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((resp) => {
          if (resp && resp.status === 200 && req.method === 'GET') {
            const clone = resp.clone();
            caches.open(CACHE).then((cache) => cache.put(req, clone));
          }
          return resp;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
