'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js?v=8')
          .then((registration) => {
            console.log('Arcano Service Worker registrado con éxito:', registration.scope);
            registration.update();
          })
          .catch((error) => {
            console.warn('Fallo al registrar Service Worker:', error);
          });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[SW Arcano] Nueva versión del Service Worker activada.');
        });
      });
    }
  }, []);

  return null;
}
