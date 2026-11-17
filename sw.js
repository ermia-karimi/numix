const CACHE_NAME = 'numix-shell-v3-clean-game-screen';
const APP_SHELL = [
  './', './index.html', './style.css', './style1.css', './lib.js',
  './hammer.min.js', './NPuzzleSolver.js', './Game.js', './Cell.js',
  './index.js', './BastardusSans.ttf', './NATIONFF.TTF', './SCREAM.ttf',
  './OLDRB___.TTF', './eurostile.TTF', './FONT/d.otf', './FONT/c.ttf',
  './FONT/s.ttf', './FONT/h.ttf', './FONT/r.ttf', './Home.png', './Menu.png',
  './Star.png', './E.PNG', './2E43445F-067E-4769-8F4C-4B6110D85D8A.PNG'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(request).then(cached => {
    if (cached) return cached;
    return fetch(request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    });
  }));
});
