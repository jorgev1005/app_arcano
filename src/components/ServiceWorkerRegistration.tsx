'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerSW = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[Arcano SW] Registrado con éxito:', registration.scope);
            registration.update();
          })
          .catch((error) => {
            console.warn('[Arcano SW] Fallo al registrar Service Worker:', error);
          });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[Arcano SW] Nueva versión del Service Worker activada.');
        });
      };

      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
        return () => window.removeEventListener('load', registerSW);
      }
    }
  }, []);

  return null;
}
