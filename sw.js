// Update this version string whenever you deploy a new version of the app.
// The browser detects when sw.js changes and installs the updated service worker,
// which then caches the new index.html and discards the old cache.
const CACHE_NAME = 'reading-challenges-v1.0.5';

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.add(self.registration.scope))
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
    event.respondWith(
        caches.match(event.request).then(cached => {
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
