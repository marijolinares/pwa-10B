# PWA de Inspecciones de Laboratorio

Aplicación web progresiva para el registro de inspecciones y mantenimiento de laboratorios de la Universidad Tecnológica de Tehuacán. Diseñada para funcionar con conectividad intermitente.

**Grupo:** 10B · **Equipo:** 8  
**Repositorio:** [marijolinares/pwa-10B](https://github.com/marijolinares/pwa-10B)

---

## Entorno requerido

| Herramienta | Versión mínima |
|---|---|
| Node.js | 20.19 o posterior |
| npm | 10 o posterior |
| Git | 2.x |

Registren las versiones locales con:

```bash
node --version
npm --version
git --version
```

---

## Setup (instalación limpia)

```bash
git clone https://github.com/marijolinares/pwa-10B.git
cd pwa-10B
npm ci
```

`npm ci` instala las dependencias exactas de `package-lock.json`, garantizando reproducibilidad entre máquinas. No usar `npm install` para la verificación final. Las dependencias de pruebas (Vitest, happy-dom y Testing Library) también se instalan con `npm ci`.

---

## Ejecución local

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) y comprobar las inspecciones sintéticas. Detener el servidor con `Ctrl+C`.

---

## Verificación

### Pruebas automatizadas

```bash
npm run test -- --run
```

Ejecuta `tests/starter.spec.mjs` (Node puro) y después Vitest (7 archivos, 107 pruebas):

1. **`tests/starter.spec.mjs`** — prueba del starter (Semana 1): verifica que `page.tsx` contiene las referencias esperadas.
2. **`tests/manifest.spec.ts`** — prueba del manifest (Semana 2, 12 pruebas): valida estructura, campos obligatorios W3C, íconos PWA e integración con `layout.tsx`.
3. **`tests/service-worker.spec.ts`** — service worker (Semana 3, 17 pruebas): valida la estructura de `sw.js`: versionamiento de caché, precaché del shell, limpieza de cachés viejos y las tres estrategias de `fetch`.
4. **`tests/offline.spec.ts`** — registro offline (Semana 3, 9 pruebas): valida `register-service-worker.ts` simulando (mock) el navegador: sin soporte, registro exitoso, detección de actualización y fallo de registro.
5. **`tests/rendering.spec.ts`** — rutas CSR y SSR (Semana 4, 16 pruebas): el listado (5), el detalle (4), la estructura CSR/SSR (3), el comportamiento del listado (2) y los estados compartidos (2). Comprueba que el listado inicie en estado de carga, que el detalle renderice el contenido con los `params`, maneje identificadores inexistentes (not-found) y tenga estados de carga y error.
6. **`tests/storage-schema.spec.ts`** — esquema de la cola (Semana 5, 5 pruebas): lectura y escritura en `localStorage`, JSON corrupto y elementos inválidos.
7. **`tests/sync.spec.ts`** — cola de sincronización (Semana 5, 21 pruebas): duplicados, reintentos, concurrencia, pérdida de datos, cierre de pestaña, respuestas tardías, conflictos y reconexión.
8. **`tests/capabilities.spec.ts`** — capacidades del dispositivo (Semana 6, 27 pruebas): geolocalización (10), notificaciones (5) y cámara (12). Con el navegador simulado comprueban el éxito, el permiso denegado, la falta de soporte, los errores y que nunca se pida un permiso al importar el módulo.

**Limitación importante:** estas pruebas corren en Node.js con [`happy-dom`](https://github.com/capricorn86/happy-dom) como entorno simulado (`vitest.config.mts`), no en un navegador real. Validan la *estructura* del código (que existan los listeners correctos, que la lista de precaché sea la esperada) y el *comportamiento del módulo de registro* ante distintos escenarios simulados — no ejecutan un Service Worker real interceptando peticiones de red. Una cobertura E2E real (por ejemplo con Playwright) sería necesaria para probar el comportamiento en un navegador de verdad.

### Verificación completa

```bash
npm run verify
```

Equivalente a `make verify`. Ejecuta comprobación de archivos, pruebas y build; genera `reports/verification.json`.

### Check de estructura (opcional)

```bash
bash public-tests/check.sh
```

Verifica solo la estructura de archivos, no el contenido.

---

## Estructura del proyecto

```
pwa-10B/
├── .github/
│   └── workflows/             ← Workflows de CI
├── public/
│   ├── manifest.webmanifest   ← Manifest de la PWA (semana 2)
│   ├── sw.js                  ← Service worker (semana 3)
│   └── icons/
│       ├── icon-192x192.png   ← Ícono para instalación
│       └── icon-512x512.png   ← Ícono para splash screen
├── src/
│   ├── app/
│   │   ├── layout.tsx         ← Layout raíz con metadata y manifest
│   │   ├── page.tsx           ← Página principal con inspecciones
│   │   ├── globals.css        ← Estilos globales
│   │   ├── api/
│   │   │   └── inspecciones/
│   │   │       └── route.ts   ← Endpoint JSON del listado (semana 4)
│   │   └── inspecciones/
│   │       ├── page.tsx       ← Listado, CSR (semana 4)
│   │       └── [id]/
│   │           ├── page.tsx   ← Detalle, SSR (semana 4)
│   │           ├── loading.tsx ← Estado de carga del detalle
│   │           └── error.tsx  ← Estado de error del detalle
│   ├── components/
│   │   ├── app-shell.tsx      ← Shell: navegación + estados (carga, error, vacío)
│   │   └── loading-state.tsx  ← Estados compartidos por las rutas (semana 4)
│   └── lib/
│       ├── capabilities/
│       │   └── result.ts      ← Resultado común de las capacidades (semana 6)
│       ├── data/
│       │   └── inspections.ts ← Datos sintéticos de inspecciones
│       ├── device/
│       │   ├── geolocation.ts ← Ubicación opcional (semana 6)
│       │   └── camera.ts      ← Evidencia fotográfica opcional (semana 6)
│       ├── notifications/
│       │   └── client.ts      ← Notificación local de cambio (semana 6)
│       ├── pwa/
│       │   └── register-service-worker.ts ← Registro del service worker (semana 3)
│       ├── storage/
│       │   └── schema.ts      ← Cola offline en localStorage (semana 5)
│       └── sync/
│           ├── queue.ts       ← Cola de sincronización (semana 5)
│           └── conflict-policy.ts ← Política de conflictos (semana 5)
├── tests/
│   ├── starter.spec.mjs       ← Prueba del starter (semana 1)
│   ├── manifest.spec.ts       ← Prueba del manifest (semana 2)
│   ├── service-worker.spec.ts ← Prueba del service worker (semana 3)
│   ├── offline.spec.ts        ← Prueba del registro offline (semana 3)
│   ├── rendering.spec.ts      ← Prueba de rutas CSR/SSR (semana 4)
│   ├── storage-schema.spec.ts ← Prueba del esquema de la cola (semana 5)
│   ├── sync.spec.ts           ← Prueba de la cola de sincronización (semana 5)
│   └── capabilities.spec.ts   ← Prueba de las capacidades del dispositivo (semana 6)
├── evidence/
│   └── individual.md          ← Evidencia individual por integrante
├── docs/
│   ├── requirements.md        ← Requisitos del producto
│   ├── decision-record.md     ← Justificación de la estrategia PWA
│   ├── cache-strategy.md      ← Estrategia de caché (semana 3)
│   ├── rendering-decision.md  ← Decisión CSR/SSR (semana 4)
│   ├── sync-policy.md         ← Política de sincronización (semana 5)
│   └── capabilities.md        ← Capacidades del dispositivo (semana 6)
├── scripts/
│   └── verify.mjs             ← Script de verificación
├── vitest.config.mts          ← Configuración de Vitest
├── package.json
└── README.md                  ← Este archivo
```

---

## Decisiones técnicas (Semana 2)

### Vitest como framework de pruebas

Se eligió [Vitest](https://vitest.dev/) para `tests/manifest.spec.ts` porque:

- **Soporte TypeScript nativo**: el archivo es `.spec.ts` — `node:assert` no ejecuta TypeScript sin transpilación adicional.
- **Compatibilidad con CI**: el check de la semana 2 ejecuta `npm test -- --run`, patrón estándar de Vitest.
- **Velocidad**: Vitest usa Vite como motor, con tiempos de arranque mínimos.
- **Coexistencia**: el script `test` ejecuta primero el `starter.spec.mjs` existente (Node puro) y luego Vitest.

### Validación por filesystem vs HTTP

Las pruebas del manifest leen archivos directamente del disco (`readFileSync`) en lugar de levantar un servidor HTTP. Esto garantiza:

- **Determinismo**: no depende del estado del servidor ni del puerto disponible.
- **Velocidad**: sin overhead de HTTP.
- **Reproducibilidad**: funciona igual en CI y en local.

### Manifest `.webmanifest` vs `.json`

El estándar W3C recomienda la extensión `.webmanifest` con MIME type `application/manifest+json`. Ambas extensiones funcionan, pero `.webmanifest` es la convención moderna y es lo que los checks de la actividad verifican.

---

## Service Worker y funcionamiento offline (Semana 3)

### Qué implementa

- `public/sw.js` — ciclo de vida completo: `install` (precachea el shell: `/`, manifest, íconos), `activate` (limpia cachés de versiones anteriores), `fetch` (network-first para navegación HTML, cache-first para assets estáticos de `/_next/static/` e `/icons/`, network-first simple para el resto).
- `src/lib/pwa/register-service-worker.ts` — registra el service worker desde el cliente, detecta actualizaciones (`updatefound`) y expone `registerSW()` / `unregisterSW()`.
- `docs/cache-strategy.md` — documenta el razonamiento detrás de cada estrategia de caché, el ciclo de vida y las limitaciones conocidas.

### Probar el comportamiento offline manualmente

1. `npm run build && npm run start` (el service worker requiere HTTPS o producción local; no funciona de forma confiable con `npm run dev`).
2. Abrir `http://localhost:3000` en Chrome/Edge.
3. DevTools → **Application** → **Service Workers**: confirmar que aparece registrado y activo.
4. DevTools → **Network** → marcar **Offline**.
5. Recargar la página: el shell (HTML, manifest, íconos) debe seguir cargando desde caché.

### Dependencias nuevas

Esta semana se agregó `happy-dom` como `devDependency` para que Vitest simule un entorno con `navigator`/`window` disponibles (necesario para los mocks de `offline.spec.ts`). Si acabas de hacer `git pull` y ves un error de "vitest no se reconoce" o pruebas que no cargan, corre `npm ci` para instalar las dependencias actualizadas.

---

## Renderizado CSR/SSR con estados verificables (Semana 4)

### Qué implementa

| Ruta | Estrategia | Archivos |
|---|---|---|
| `/inspecciones` | **CSR**: Client Component que pide los datos en el navegador a `/api/inspecciones` y muestra un estado de carga antes de los datos | `src/app/inspecciones/page.tsx`, `src/app/api/inspecciones/route.ts` |
| `/inspecciones/[id]` | **SSR**: Server Component con `dynamic = "force-dynamic"` (se renderiza en cada petición) a partir de los parámetros de ruta; entrega HTML listo, optimizando SEO y TTFB | `src/app/inspecciones/[id]/page.tsx`, `loading.tsx`, `error.tsx` |

Los estados de carga, error, vacío y "no encontrado" son reutilizables y viven en `src/components/loading-state.tsx`. La justificación completa, la comparación (carga, accesibilidad y complejidad) y los trade-offs de haber elegido CSR para el listado y SSR para el detalle están en `docs/rendering-decision.md`.

### Cómo probarlo

1. Con el servidor de desarrollo levantado (ver *Ejecución local*), ir a `http://localhost:3000/inspecciones`. Se muestra un estado de carga antes de los datos (dura una fracción de segundo; abajo se explica cómo verlo).
2. Al dar clic en alguna inspección se navega a la ruta de detalle (por ejemplo, `/inspecciones/inspection-001`), que se renderiza desde el servidor de forma inmediata.

### Cómo ver los estados de carga y error

Como los datos son locales, el listado responde de inmediato. Para verlos en el navegador (DevTools → Network):
- **Carga:** activar la limitación de red "Slow 4G" y recargar `/inspecciones`.
- **Error:** bloquear la petición a `/api/inspecciones` (clic derecho → Block request URL) y recargar; aparece el estado de error con el botón Reintentar.
- **Sin conexión:** con `npm run build && npm run start` (como en la sección de Service Worker), marcar "Offline" y recargar; un detalle ya visitado abre desde el caché del service worker.

### Métrica de carga repetible

El *First Load JS* por ruta que imprime `npm run build` (valores del commit evaluado):

| Ruta | Estrategia | First Load JS |
|---|---|---|
| `/inspecciones` | CSR | 97.7 kB |
| `/inspecciones/[id]` | SSR (`ƒ`) | 88.1 kB |

---
## Persistencia local y sincronización (Semana 5)

### Qué implementa

| Archivo | Responsabilidad |
|---|---|
| `src/lib/storage/schema.ts` | Cola offline en `localStorage` con clave versionada; descarta datos corruptos |
| `src/lib/sync/queue.ts` | `enqueue`, `processQueue` (reintentos, sin duplicados ni pérdida), `recoverStaleItems`, `getQueueStats`, `startAutoSync` |
| `src/lib/sync/conflict-policy.ts` | `resolveConflict`: política *client wins* (gana lo capturado en campo) |
| `docs/sync-policy.md` | Política completa: estados, garantías, reintentos, conflictos, fallos encontrados y límites |

### Uso

```ts
import { enqueue, processQueue, startAutoSync, getQueueStats } from "@/lib/sync/queue";

enqueue(inspection);          // guarda en el dispositivo, sin duplicar por id
const stop = startAutoSync(); // sincroniza al volver la red
await processQueue();         // o manualmente
getQueueStats();              // { pending, syncing, synced, failed, conflict, total }
```

### Cómo probarlo

```bash
npx vitest run tests/sync.spec.ts   # 21 pruebas de la cola
npm run verify                      # todo: 107 pruebas + build
```

Cubren duplicados, reintentos, concurrencia, pérdida de datos al capturar durante una sincronización, cierre de pestaña, respuestas tardías, conflictos y reconexión.

### Límites

- La sincronización se prueba con un `fetch` simulado: `/api/inspecciones` solo implementa `GET`, no existe un endpoint que reciba la inspección.
- La interfaz todavía no llama a `enqueue()` ni a `startAutoSync()`.
- Sin espera creciente entre reintentos; `localStorage` limitado a ~5 MB y no atómico entre pestañas.

---

## Capacidades del dispositivo y notificaciones (Semana 6)

### Qué implementa

| Archivo | Responsabilidad |
|---|---|
| `src/lib/capabilities/result.ts` | Resultado común `{ ok: true, value }` / `{ ok: false, reason, message }` con los motivos `unsupported`, `denied`, `unavailable`, `timeout` y `error` |
| `src/lib/device/geolocation.ts` | `requestPosition()`: lectura puntual de la ubicación (máximo 8 s). Alternativa sin permiso: `selectLaboratory()` con la lista `LABORATORIES` |
| `src/lib/notifications/client.ts` | `showSyncNotification()`: notificación local de cambio; pide permiso solo al llamarla |
| `src/lib/device/camera.ts` | `captureEvidence()`: adjunta una foto opcional como evidencia (cámara trasera en el teléfono, selector de archivos en la computadora) |
| `docs/capabilities.md` | Principios, permiso y datos mínimos, alternativa y trade-offs de cada capacidad |

### Reglas que cumplen las tres capacidades

1. **El permiso se pide solo por una acción de la persona** (por ejemplo, el clic de un botón); importar un módulo nunca abre un cuadro de permiso.
2. **Nunca lanzan error:** devuelven un `CapabilityResult` con el motivo y un mensaje en español listo para mostrarse.
3. **Datos mínimos:** las coordenadas y la foto viven solo en memoria; no se guardan ni se envían. Todos los datos del proyecto son sintéticos.
4. **El flujo sigue sin la capacidad:** sin ubicación se elige el laboratorio a mano; sin foto, la inspección se guarda sin evidencia; sin notificación, el aviso se muestra dentro de la app.

### Uso

```ts
import { captureEvidence } from "@/lib/device/camera";

// Dentro del manejador de clic de un botón "Adjuntar foto (opcional)":
const photo = await captureEvidence();
if (photo.ok) {
  // photo.value = { file, type, size }
} else {
  // photo.reason: "unsupported" | "unavailable" | "error"
  // photo.message ya indica que la inspección se guarda sin evidencia
}
```

### Cómo probarlo

```bash
npx vitest run tests/capabilities.spec.ts   # 27 pruebas de las tres capacidades
npm run verify                              # todo: 107 pruebas + build
```

Las pruebas simulan las APIs del navegador (`navigator.geolocation`, `Notification` y el selector de archivos). Cubren el éxito, el permiso denegado, la falta de soporte, el tiempo agotado, los errores, los límites de la foto (solo imágenes, máximo 5 MB) y que no se pida nada al importar ni se guarde o envíe la foto.

### Límites

- La interfaz todavía no llama a `requestPosition()`, `showSyncNotification()` ni `captureEvidence()`: se prueban con el navegador simulado, no con los cuadros de permiso reales.
- Solo hay notificaciones locales: no existe un servidor de notificaciones push ni suscripción. Además, `new Notification()` no funciona en Chrome para Android; para ese caso haría falta mostrarla desde el service worker.
- La foto conserva sus metadatos (por ejemplo, la ubicación) porque no se reprocesa, y una foto de 5 MB no cabe en `localStorage`; guardarla requeriría IndexedDB.
- En una computadora el atributo `capture` se ignora y se abre el selector de archivos.

## Resumen de la estrategia de pruebas y limitaciones (Semana 8)

La estrategia completa (capas de prueba, matriz riesgo-prueba, flujo común, defecto controlado y limitaciones) está en [`docs/test-strategy.md`](docs/test-strategy.md). Los comandos de cada etapa están en la sección "Semana 8: Pirámide de pruebas e integración continua" de más abajo.

Primera vez con las pruebas E2E:

```bash
npx playwright install chromium   # solo la primera vez
npm run build
npm run test:e2e
```

El workflow de GitHub Actions (`.github/workflows/academic-evaluation.yml`) ejecuta `npm ci`, lint, tipos, build, pruebas unitarias, de integración, cobertura, E2E y `npm run verify`. Los artefactos (`reportes-semana-08`: `coverage/`, `reports/`, `playwright-report/` y `test-results/`) se descargan desde la pestaña Actions y se suben siempre, aunque falle una etapa.

### Limitaciones

- Las pruebas de Vitest usan un navegador simulado (`happy-dom`), no un navegador real.
- El E2E cubre el flujo común y la variante sin permiso, solo en Chromium de escritorio.

---

## Datos y límites

- Todos los datos son **sintéticos** (3 inspecciones de demostración); `/api/inspecciones` devuelve esos datos locales, sin backend real ni latencia artificial.
- **Sin autenticación** ni datos personales reales.
- El service worker (Semana 3) precachea el shell y aplica network-first a la navegación; no hay sincronización en segundo plano, almacenamiento offline de datos (IndexedDB) ni página offline dedicada.
- Las pruebas del manifest validan la estructura estática del archivo, **no** el comportamiento real de instalación PWA en un navegador.
- Las pruebas no miden TTFB ni LCP y no incluyen una auditoría automática de accesibilidad.
- El SSR de `/inspecciones/[id]` requiere un servidor Node en ejecución (`npm run start` después de `npm run build`).
- El comportamiento sin conexión de las rutas de la Semana 4 se deduce del código de `public/sw.js`; puede comprobarse manualmente en el navegador (DevTools → Network → Offline).
- Las vulnerabilidades reportadas por `npm audit` provienen de dependencias del starter y no se corrigen para no alterar versiones requeridas por el proyecto.
- La cola de sincronización (Semana 5) se prueba con un `fetch` simulado: no existe un endpoint POST real, y la interfaz aún no la usa. Detalle en `docs/sync-policy.md`.
- Las capacidades de la Semana 6 (ubicación, notificaciones y cámara) se prueban con APIs del navegador simuladas y la interfaz aún no las usa; no hay notificaciones push reales y la foto no se guarda ni se envía. Detalle en `docs/capabilities.md`.

---

## Evidencia

Ver `evidence/individual.md` para la evidencia de cada integrante, incluyendo commit SHA, decisión técnica, prueba ejecutada, limitaciones y uso de IA.

---

## CI / GitHub Actions

El workflow de CI ejecuta:

1. `npm ci` — instalación reproducible
2. `npm run build` — compilación de Next.js
3. `npm run verify` — verificación completa (archivos + pruebas + build)

Los artefactos de evidencia se descargan desde la pestaña Actions del repositorio.


---

## Semana 8: Pirámide de pruebas e integración continua

### Comandos de ejecución y verificación

| Comando | Descripción | Artefactos generados |
|---|---|---|
| `npm ci` | Instalación reproducible de dependencias | `node_modules` |
| `npm run lint` | Análisis estático de código sin advertencias | Consola |
| `npm run typecheck` | Comprobación estricta de tipos TypeScript | Consola |
| `npm run build` | Compilación de producción de Next.js | `.next/` |
| `npm run test:unit` | Pruebas unitarias de validación y cola | `reports/unit-junit.xml` |
| `npm run test:integration` | Pruebas de integración de persistencia y deduplicación | `reports/integration-junit.xml` |
| `npm run test:coverage` | Suite completa con reporte de cobertura V8 | `reports/vitest-junit.xml`, `coverage/` |
| `npm run test:e2e` | Pruebas E2E en Chromium con Playwright | `playwright-report/`, `test-results/` |
| `npm run verify` o `make verify` | Verificación técnica global | `reports/verification.json` |

### Capas implementadas
1. **Unitarias (`tests/unit/`)**:
   - `tests/unit/inspection-validation.spec.ts`: Validación de reglas de captura, fechas gregorianas reales, normalización y estados derivados.
   - `tests/unit/queue-rules.spec.ts`: Reglas de encolado, protección de duplicados, stale items e idempotencia en cliente y servidor.
2. **Integración (`tests/integration/`)**:
   - `tests/integration/offline-persistence.spec.ts`: Persistencia en `localStorage` y recarga sin red.
   - `tests/integration/sync-deduplication.spec.ts`: Sincronización contra el endpoint `POST /api/inspecciones`, control de reintentos y deduplicación con fixtures.
3. **E2E (`tests/e2e/`)**:
   - `tests/e2e/flujo-offline.e2e.ts`: Flujo completo en navegador real (crear → guardar offline → recargar → reconectar → sincronizar sin duplicar) y variante con geolocalización denegada.
4. **Estrategia y CI**:
   - Documentación en `docs/test-strategy.md`.
   - Workflow automatizado en `.github/workflows/academic-evaluation.yml`.


## Semana 9: Modelo de amenazas y privacidad aplicada

Datos exclusivamente sintéticos. Qué amenazas se consideran y por qué se descartó o aceptó cada riesgo está en [`docs/threat-model.md`](docs/threat-model.md); qué datos se tratan, con qué finalidad y por cuánto tiempo, en [`docs/privacy-data-inventory.md`](docs/privacy-data-inventory.md).

### Qué implementa

| Control | Dónde vive | Qué evita |
|---|---|---|
| CSP y headers de seguridad (nosniff, anti-framing, referrer, permisos mínimos, HSTS) | `src/lib/security/headers.ts`, aplicados por `src/middleware.ts` | XSS, clickjacking, sniffing de tipo, tráfico sin cifrar |
| `poweredByHeader: false` y `Cache-Control: no-cache` para `/sw.js` | `next.config.mjs` | Anunciar la tecnología; quedarse con un service worker viejo |
| Detección de credenciales en texto | `src/lib/security/secrets.ts` | Claves o llaves subidas por accidente en una captura, un log o un archivo |
| Sanitización y lectura segura del cuerpo JSON | `src/lib/security/sanitize.ts` | Etiquetas HTML, caracteres invisibles, cuerpos enormes, claves de contaminación de prototipos |
| Redacción de logs y retención con vencimiento | `src/lib/security/privacy.ts` | Nombres, correos, teléfonos y coordenadas en logs; datos que se guardan de más |
| API endurecida (415, 413, 400, 422; sin caché; sin eco de credenciales) | `src/app/api/inspecciones/route.ts` | Entradas hostiles al endpoint de sincronización |
| `robots.txt` | `public/robots.txt` | Reduce la indexación de `/api/`. **No es un control de acceso** |

### Cómo ejecutarlo y verificarlo

```bash
npm ci
npm run verify                          # lint, tipos, pruebas y build (o: make verify)
npx vitest run tests/security.spec.ts   # solo las pruebas de seguridad
npm run build && npm run start          # app compilada en http://localhost:3000
curl -I http://localhost:3000/          # revisar los headers de seguridad
bash public-tests/check.sh              # chequeo público del kit (si está en el repo)
```

Las pruebas de seguridad (`tests/security.spec.ts`) están agrupadas en cinco bloques que corresponden a la tabla de amenazas: "CSP y headers", "Secretos", "Sanitización", "Privacidad y retención" y "API". Son deterministas, sin red y sin reloj real. Las cadenas con forma de credencial se arman al vuelo para que ningún valor parecido a una clave quede escrito en el repositorio. Cada control tiene un caso negativo: si alguien lo quita, una prueba falla.

### Evidencia de que las pruebas detectan una regresión

Se quitó la directiva `frame-ancestors` de la CSP en una rama temporal que **no se fusiona** (`lin/tmp-regresion-seguridad`). La prueba "la CSP restringe todo a 'self' y bloquea objetos, frames y bases ajenas" falló con `expected '…' to contain 'frame-ancestors \'none\''`; al restaurar la línea volvieron a pasar las 45 pruebas. Los enlaces a la ejecución en rojo y a la ejecución en verde están en [`evidence/individual.md`](evidence/individual.md).

### Decisiones, supuestos y límites

- **Headers en middleware, no en `next.config.mjs`**: Next 14 usa `next.config.mjs` (ESM) y no puede importar un archivo `.ts`. Con el middleware hay una sola fuente de verdad (`securityHeaders()`), la misma que prueban los tests.
- **La CSP permite `'unsafe-inline'` en scripts y estilos** porque Next inyecta scripts inline. Debilita la protección contra XSS; la mejora es usar nonces por petición.
- **Fallan hacia lo seguro**: un dato con fecha inválida se considera vencido y un campo con credenciales se rechaza.
- **Las pruebas verifican funciones y valores de configuración**, no un navegador real. La app compilada se revisó con `curl -I` y el E2E de la Semana 8 sigue en verde con la CSP activa.
- **La retención no se ejecuta sola todavía**: `isExpired` define la regla, pero ningún proceso borra datos. El servidor guarda en memoria y pierde todo al reiniciarse.
- **El detector de credenciales es una heurística**: reduce el riesgo, no lo elimina.
- **El chequeo público del kit** busca palabras como las de credenciales en todo el repositorio, así que también marca la documentación y el lockfile; no encuentra valores reales.
- Todo lo anterior se amplía en `docs/threat-model.md` (riesgos residuales) y en `docs/privacy-data-inventory.md`.
