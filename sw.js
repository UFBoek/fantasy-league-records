/* FIG League v73 — keep app shell available; never cache live league JSON. */
const CACHE_NAME = 'fig-league-shell-v113';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=63',
  './mobile-v67.css?v=67',
  './mobile-v68.css?v=68',
  './mobile-v69.css?v=69',
  './mobile-v70.css?v=70',
  './live-matchups.css?v=99',
  './editorial-v74.css?v=74',
  './layout-v75.css?v=75',
  './layout-v76.css?v=76',
  './layout-v77.css?v=77',
  './player-headshots-v78.css?v=78',
  './playoffs-v79.css?v=79',
  './trade-contrast-v80.css?v=80',
  './record-fit-v81.css?v=81',
  './history-paging-v82.css?v=82',
  './h2h-v88.css?v=88',
  './h2h-playoffs-v90.css?v=90',
  './archive-explore-v91.css?v=91',
  './archive-mobile-fit-v92.css?v=92',
  './player-trades-v93.css?v=93',
  './league-detail-v94.css?v=94',
  './history-polish-v95.css?v=96',
  './trade-archive-v103.css?v=103',
  './draft-franchises-v111.css?v=112',
  './draft-focus-v113.css?v=113',
  './james-hayden-compact-v100.css?v=101',
  './live-matchups.js?v=99',
  './mobile-v69.js?v=73',
  './app.js?v=113',
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
