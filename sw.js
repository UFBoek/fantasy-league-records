/* FIG League v72 — keep app shell available; never cache live league JSON. */
const CACHE_NAME = 'fig-league-shell-v72';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=63',
  './mobile-v67.css?v=67',
  './mobile-v68.css?v=68',
  './mobile-v69.css?v=69',
  './mobile-v70.css?v=70',
  './live-matchups.css?v=72',
  './live-matchups.js?v=72',
  './mobile-v69.js?v=69',
  './app.js?v=72',
  './manifest.webmanifest',
  './assets/icons/fig-192.png',
  './assets/icons/fig-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('fig-league-shell-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // League records and dynasty values must not be served from stale app caches.
  if (url.pathname.includes('/data/')) {
    event.respondWith(fetch(request, {cache: 'no-store'}));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, {cache: 'no-store'}).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Network first for versioned JS/CSS, manifest and icon assets.
  if (!/\.(?:js|css|webmanifest|png)$/.test(url.pathname)) return;
  event.respondWith(
    fetch(request).then((response) => {
      if (response.ok) {
        const responseCopy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy)));
      }
      return response;
    }).catch(() => caches.match(request))
  );
});
