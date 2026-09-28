const CACHE_NAME = 'arcano-pwa-v7';

// Archivos estáticos clave a pre-almacenar en caché al instalar
const PRECACHE_ASSETS = [
  '/',
  '/dashboard',
  '/login',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/favicon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usar Promise.allSettled para que si alguna ruta redirige (ej. /dashboard -> 307 sin sesión),
      // no aborte la instalación del Service Worker
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          fetch(url, { redirect: 'follow' })
            .then((res) => {
              if (res && res.status === 200) {
                return cache.put(url, res);
              }
            })
            .catch(() => null)
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW Arcano] Purgando caché obsoleta:', name);
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

  // Peticiones de otros orígenes (ej. fuentes de Google)
  if (url.origin !== self.location.origin) {
    if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
      event.respondWith(
        caches.match(request).then((cached) => {
          return cached || fetch(request).then((res) => {
            if (res && res.status === 200) {
              const resClone = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
            }
            return res;
          }).catch(() => cached);
        })
      );
    }
    return;
  }

  // 1. Sesión de NextAuth: Network First con fallback a caché
  // Crucial: Cuando el usuario está sin conexión, servir la última sesión válida
  // para que NextAuth mantenga el estado autenticado y no bloquee el acceso al Dashboard.
  if (url.pathname === '/api/auth/session') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedSession = await caches.match(request);
          if (cachedSession) {
            return cachedSession;
          }
          // Si no hay sesión guardada en caché, responder JSON vacío
          return new Response(JSON.stringify({ user: null }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // 2. Rutas de la API de Arcano (proyectos, archivos): gestionadas por IndexedDB y syncManager
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 3. Activos estáticos (_next/static, css, js, svg, woff2, etc.): Stale-While-Revalidate
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(svg|png|jpg|jpeg|gif|ico|css|js|woff2?|json)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 4. Cargas de RSC de Next.js App Router (?_rsc=... o header RSC)
  if (url.searchParams.has('_rsc') || request.headers.get('RSC') === '1') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response('', { status: 200, headers: { 'Content-Type': 'text/x-component' } });
        })
    );
    return;
  }

  // 5. Peticiones de Navegación (HTML de páginas): Network First con fallback inmediato a /dashboard o /
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
          // Intentar coincidencia exacta en caché
          const cached = await caches.match(request);
          if (cached) return cached;

          // Si estamos navegando a cualquier parte de la app, fallback al Dashboard
          const dashboardFallback = await caches.match('/dashboard');
          if (dashboardFallback) return dashboardFallback;

          return caches.match('/');
        })
    );
    return;
  }
});
