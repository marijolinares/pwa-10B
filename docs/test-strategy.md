# Estrategia de pruebas

## Objetivo y alcance

Verificar que la PWA de inspecciones de laboratorio funciona de forma repetible, incluso con conectividad intermitente. Se prueba el flujo de captura y sincronización de inspecciones. No se prueba rendimiento real (TTFB, LCP) ni accesibilidad automatizada.

## Capas de prueba

| Capa | Herramienta | Responsable | Qué cubre |
|---|---|---|---|
| Unitarias e integración | Vitest + happy-dom | Germán | Cola de sincronización (`queue.ts`), esquema (`schema.ts`), política de conflicto, con fixtures sintéticos |
| E2E | Playwright | Lin | Flujo común en navegador real y variante sin permiso |
| CI | GitHub Actions | Lin | Ejecuta todo y guarda artefactos |

Estado actual: 7 archivos de Vitest con 90 pruebas (navegador simulado) y 4 pruebas E2E de Playwright en Chromium real (`tests/e2e/flujo-offline.e2e.ts`).

## Flujo común

Abrir "Nueva inspección", dejar que el service worker se instale y cachee la página, quedar sin conexión, capturar y guardar (queda pendiente), recargar sin red (no se pierde), reconectar (pasa a sincronizada, una sola vez en el servidor) y verla una sola vez en el listado.

## Variante sin permiso

Se niega la ubicación. La app debe mostrar "Elige el laboratorio manualmente", dejar elegir el laboratorio a mano y completar y sincronizar la captura.

## Fixtures y datos

Todos los datos son sintéticos. No hay datos personales ni autenticación.
`tests/fixtures/synthetic-inspections.ts` (fixtures de Germán, en su rama `german-develop`, pendiente de fusionar)

## CI y artefactos

El workflow ejecuta: `npm ci` → lint → tipos → build → pruebas unitarias → integración → cobertura → E2E → `npm run verify`.
Artefactos que se guardan: `reports/verification.json`, `playwright-report/` (reporte HTML), `reports/playwright-junit.xml` y las trazas y capturas de `test-results/` (solo si falla), subidos como el artefacto `reportes-semana-08`.

## Defecto controlado

Se introduce un defecto a propósito en una rama temporal que nunca se fusiona, para comprobar que las pruebas lo detectan.
- Defecto: Borrar el bloque `if (existing)` de `src/lib/server/inspection-store.ts`, que hace idempotente el POST: reenviar el mismo id crea un duplicado.
- Prueba que debe fallar: El E2E "enviar dos veces la misma inspección al servidor no crea un duplicado" (`tests/e2e/flujo-offline.e2e.ts`): espera 201 y luego 200, y recibe 201 y 201.
- Evidencia: SHA del commit, enlace al run rojo en Actions y captura.

## Limitaciones

- Las pruebas de Vitest usan un navegador simulado (happy-dom), no uno real.
- El E2E solo cubre el flujo común y la variante sin permiso.
- El E2E corre solo en Chromium de escritorio; no cubre otros navegadores ni dispositivos reales.