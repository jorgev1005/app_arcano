const CACHE_NAME = 'arcano-pwa-v11';

// Recursos críticos a pre-almacenar en la instalación
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/favicon.png'
];

// Pantalla de respaldo offline estilizada en Obsidian Dark
const OFFLINE_FALLBACK_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Arcano - Modo Offline</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0a0a0f;
      color: #f3f4f6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      text-align: center;
    }
    .card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 36px 28px;
      max-width: 380px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(16px);
    }
    .logo {
      width: 80px;
      height: 80px;
      border-radius: 20px;
      margin-bottom: 20px;
      box-shadow: 0 8px 24px rgba(37, 99, 235, 0.3);
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #60a5fa, #c084fc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      color: #9ca3af;
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-block;
      width: 100%;
      background: #2563eb;
      color: #ffffff;
      font-weight: 600;
      font-size: 14px;
      padding: 14px;
      border-radius: 14px;
      text-decoration: none;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn:active {
      transform: scale(0.98);
      background: #1d4ed8;
    }
    .hint {
      margin-top: 18px;
      font-size: 11px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="card">
    <img src="/icon-192.png" alt="Arcano" class="logo">
    <h1>Modo Offline Activo</h1>
    <p>No tienes conexión a internet en este momento. Si ya abriste Arcano previamente, tus manuscritos están seguros en este dispositivo.</p>
    <button class="btn" onclick="window.location.href='/dashboard'">Abrir Estudio de Escritura</button>
    <div class="hint">Al reconectarte a internet, se sincronizarán tus cambios automáticamente.</div>
  </div>
  <script>
    window.addEventListener('online', () => {
      window.location.reload();
    });
  </script>
</body>
</html>`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
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

  // 3. Activos estáticos (_next/static, css, js, svg, woff2, etc.): Cache-First con actualización en segundo plano
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(svg|png|jpg|jpeg|gif|ico|css|js|woff2?|json)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Revalidar en segundo plano si hay conexión
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const clone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        // Si no está en caché todavía, ir a la red y guardar copia
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        }).catch(() => {
          return new Response('', { status: 408, headers: { 'Content-Type': 'text/plain' } });
        });
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

  // 5. Peticiones de Navegación (HTML de páginas): Network First con fallback inteligente a caché
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
              if (request.url.includes('/dashboard')) {
                cache.put('/dashboard', networkResponse.clone());
              }
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // A. Coincidencia exacta de la URL en caché
          const cached = await caches.match(request);
          if (cached) return cached;

          // B. Coincidencia ignorando query params (ej. ?callbackUrl...)
          const cachedNoSearch = await caches.match(request, { ignoreSearch: true });
          if (cachedNoSearch) return cachedNoSearch;

          // C. Fallback a /dashboard
          const dashboardFallback = await caches.match('/dashboard');
          if (dashboardFallback) return dashboardFallback;

          // D. Fallback a /
          const rootFallback = await caches.match('/');
          if (rootFallback) return rootFallback;

          // E. Fallback a cualquier versión de dashboard en caché
          const cache = await caches.open(CACHE_NAME);
          const keys = await cache.keys();
          for (const key of keys) {
            if (key.url.includes('/dashboard')) {
              const res = await cache.match(key);
              if (res) return res;
            }
          }

          // F. Pantalla de rescate offline propia (evita la pantalla nativa blanca de Chrome "No tienes conexión")
          return new Response(OFFLINE_FALLBACK_HTML, {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        })
    );
    return;
  }
});
