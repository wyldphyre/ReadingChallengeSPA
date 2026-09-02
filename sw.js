// Update this version string whenever you deploy a new version of the app.
// The browser detects when sw.js changes and installs the updated service worker,
// which then caches the new index.html and discards the old cache.
const CACHE_NAME = 'reading-challenges-v1.3.4';

// The app is reachable both as the bare scope (".../") and as ".../index.html",
// so cache both — matching on only one leaves the other failing offline.
const PRECACHE_URLS = [
    self.registration.scope,
    new URL('index.html', self.registration.scope).href
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    // Only GET responses can be stored; cache.put() rejects on anything else.
    if (event.request.method !== 'GET') return;

    event.respondWith(
        // ignoreSearch so a link carrying a query string still hits the cache.
        caches.match(event.request, { ignoreSearch: true }).then(cached => {
            // Serve from cache immediately, but refresh cache in background
            const networkFetch = fetch(event.request).then(response => {
                if (response && response.ok) {
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
                }
                return response;
            }).catch(() => cached);
            return cached || networkFetch;
        })
    );
});
