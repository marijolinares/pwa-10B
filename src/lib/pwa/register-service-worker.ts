/**
 * register-service-worker.ts
 *
 * Módulo de registro del Service Worker para la PWA de inspecciones.
 * Se encarga de:
 *  - Verificar soporte del navegador.
 *  - Registrar /sw.js con scope raíz.
 *  - Detectar actualizaciones (updatefound → statechange).
 *  - Exponer funciones tipadas para registro y desregistro.
 *
 * Decisiones:
 *  - No bloquea la carga de la app: los errores se registran en consola.
 *  - El registro se pospone a window.onload para no competir con el
 *    primer paint.
 *  - Se notifica por consola cuando hay una versión nueva lista,
 *    sin forzar recarga automática (el usuario decide cuándo).
 */

/** Resultado del intento de registro. */
export type SWRegistrationResult =
  | { success: true; registration: ServiceWorkerRegistration }
  | { success: false; reason: string };

/**
 * Registra el service worker ubicado en /sw.js.
 *
 * Debe llamarse solo en el cliente (nunca en SSR).
 * Devuelve un objeto con el resultado del registro.
 */
export async function registerSW(): Promise<SWRegistrationResult> {
  if (typeof window === 'undefined') {
    return { success: false, reason: 'No hay objeto window (SSR).' };
  }

  if (!('serviceWorker' in navigator)) {
    const reason = 'Este navegador no soporta Service Workers.';
    console.warn('[SW]', reason);
    return { success: false, reason };
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[SW] Registrado con éxito. Scope:', registration.scope);

    // ── Detección de actualizaciones ────────────────────────────
    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (!installing) return;

      console.log('[SW] Nueva versión detectada, instalando…');

      installing.addEventListener('statechange', () => {
        switch (installing.state) {
          case 'installed':
            if (navigator.serviceWorker.controller) {
              // Ya había un SW activo → hay una actualización lista.
              console.log(
                '[SW] Actualización lista. Se activará en la próxima recarga.'
              );
            } else {
              // Primera instalación.
              console.log('[SW] Contenido precacheado para uso offline.');
            }
            break;

          case 'redundant':
            console.warn('[SW] La instalación fue descartada (redundant).');
            break;
        }
      });
    });

    return { success: true, registration };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido';
    console.error('[SW] Error al registrar:', message);
    return { success: false, reason: message };
  }
}

/**
 * Desregistra todos los service workers del sitio.
 * Útil para depuración o para forzar una instalación limpia.
 */
export async function unregisterSW(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const results = await Promise.all(
      registrations.map((r) => r.unregister())
    );
    const allUnregistered = results.every(Boolean);

    if (allUnregistered) {
      console.log('[SW] Todos los service workers desregistrados.');
    }
    return allUnregistered;
  } catch (error: unknown) {
    console.error('[SW] Error al desregistrar:', error);
    return false;
  }
}
