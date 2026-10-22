# Estrategia de pruebas

## Objetivo y alcance

Verificar que la PWA de inspecciones de laboratorio funciona de forma repetible, incluso con conectividad intermitente. Se prueba el flujo de captura y sincronización de inspecciones. No se prueba rendimiento real (TTFB, LCP) ni accesibilidad automatizada.

## Capas de prueba

| Capa | Herramienta | Responsable | Qué cubre |
|---|---|---|---|
| Unitarias e integración | Vitest + happy-dom | Germán | Cola de sincronización (`queue.ts`), esquema (`schema.ts`), política de conflicto, con fixtures sintéticos |
| E2E | Playwright | Lin | Flujo común en navegador real y variante sin permiso |
| CI | GitHub Actions | Lin | Ejecuta todo y guarda artefactos |

Estado actual: 7 archivos de Vitest, 90 pruebas, todas con navegador simulado.

## Flujo común

[COMPLETAR: pasos del flujo, por ejemplo abrir la app, ver el listado, entrar al detalle, capturar una inspección sin conexión y sincronizarla al volver la red.]

## Variante sin permiso

[COMPLETAR: qué permiso se niega (ubicación, cámara o notificaciones) y qué debe mostrar la app.]

## Fixtures y datos

Todos los datos son sintéticos. No hay datos personales ni autenticación.
[COMPLETAR: nombre de los archivos de fixtures de Germán.]

## CI y artefactos

El workflow ejecuta: `npm ci` → `npm run build` → `npm run verify` → E2E.
Artefactos que se guardan: `reports/verification.json` y [COMPLETAR: reporte y trazas de Playwright].

## Defecto controlado

Se introduce un defecto a propósito en una rama temporal que nunca se fusiona, para comprobar que las pruebas lo detectan.
- Defecto: [COMPLETAR]
- Prueba que debe fallar: [COMPLETAR]
- Evidencia: SHA del commit, enlace al run rojo en Actions y captura.

## Limitaciones

- Las pruebas de Vitest usan un navegador simulado (happy-dom), no uno real.
- El E2E solo cubre el flujo común y la variante sin permiso.
- No hay endpoint POST real; la sincronización se prueba con un `fetch` simulado.