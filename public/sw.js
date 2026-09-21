const CACHE_NAME = 'arcano-pwa-v3';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/login',
  '/manifest.json',
  '/globe.svg',
  '/window.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Allow API routes to be handled by app/sync manager
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Static Assets (_next/static, public files): Stale-While-Revalidate
  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(svg|png|jpg|jpeg|gif|ico|css|js|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Navigation requests (HTML pages like /dashboard, /): Network first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Fallback to cached page
          const cached = await caches.match(request);
          if (cached) return cached;

          // If specific path not found, fallback to dashboard
          const dashboardFallback = await caches.match('/dashboard');
          if (dashboardFallback) return dashboardFallback;

          return caches.match('/');
        })
    );
  }
});
