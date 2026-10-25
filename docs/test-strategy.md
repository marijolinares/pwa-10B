# Estrategia de Pruebas e Integración Continua (Semana 8)

## 1. Objetivo y alcance

El objetivo principal de esta semana es consolidar la **pirámide de pruebas** y automatizar la verificación continua (CI) de la PWA de inspecciones y mantenimiento de laboratorios, garantizando que el flujo crítico de captura, persistencia offline y sincronización idempotente funcione de forma confiable, repetible y resiliente ante fallos de conectividad y restricciones de capacidades del dispositivo.

### Alcance
- **Flujo crítico**: Crear una inspección → guardarla sin conexión en el dispositivo → recargar sin red → reconectar la red → sincronizar automáticamente con el servidor sin generar registros duplicados.
- **Variante de capacidad denegada**: Capturar una inspección cuando el permiso de geolocalización es denegado o no disponible, demostrando degradación elegante hacia selección manual de laboratorio.
- **Datos utilizados**: 100% sintéticos e independientes, sin contraseñas, secretos, tokens ni PII.

---

### Responsables y estado

| Capa | Herramienta | Responsable |
|---|---|---|
| Unitarias, integración y fixtures | Vitest + happy-dom | Germán |
| E2E, captura offline, POST idempotente y CI | Playwright + GitHub Actions | Majo |
| Estrategia, README y defecto controlado | Documentación + rama temporal | Irvin |

Estado actual: 11 archivos de Vitest con 144 pruebas (navegador simulado: 28 unitarias, 9 de integración y el resto de las semanas 1 a 6) y 4 pruebas E2E de Playwright en Chromium real.

---

## 2. Matriz de Riesgo vs. Capa de Prueba

Relación entre cada riesgo crítico del sistema y la capa de prueba seleccionada en la pirámide:

| Riesgo del Negocio / Operación | Capa de Prueba | Herramienta | Archivos de Prueba | Justificación de la Capa |
|---|---|---|---|---|
| **Captura inválida**: Enviar datos incompletos, fechas irreales (ej. 2026-02-31), nombres excedidos o hallazgos negativos. | Unitarias | Vitest + happy-dom | `tests/unit/inspection-validation.spec.ts` | **Costo mínimo y alta velocidad**: Las reglas de validación son funciones puras sin dependencias de red ni DOM. Permite probar decenas de casos frontera (mínimos, máximos, bisiestos) en milisegundos. |
| **Pérdida de datos por desconexión**: El usuario guarda una inspección sin red o cierra la pestaña antes de reconectar. | Integración y E2E | Vitest (`localStorage`) + Playwright | `tests/integration/offline-persistence.spec.ts`<br>`tests/e2e/flujo-offline.e2e.ts` | **Integración**: Comprueba que la cola versionada (`pwa-10B:inspection-queue:v1`) serializa y recupera inspecciones tras recargas simuladas.<br>**E2E**: Demuestra que el Service Worker y el Cache Storage mantienen la PWA disponible sin red en Chromium real. |
| **Duplicado de sincronización**: Pérdida de confirmación HTTP o reintentos múltiples que crean inspecciones duplicadas. | Unitarias e Integración | Vitest + Request/Response | `tests/unit/queue-rules.spec.ts`<br>`tests/integration/sync-deduplication.spec.ts` | **Idempotencia de punta a punta**: Comprueba tanto la protección en la cola cliente (`queue.ts` no re-encola si está `synced`) como en el servidor (`saveInspection` en `inspection-store.ts` responde 200 OK y no añade filas redundantes). |
| **Permisos de dispositivo no disponibles**: El usuario niega el permiso de geolocalización o el dispositivo no lo soporta. | E2E | Playwright (Chromium) | `tests/e2e/flujo-offline.e2e.ts` | **Interacción realista**: Solo un navegador real puede interceptar `navigator.geolocation.getCurrentPosition` devolviendo error de permiso (`PERMISSION_DENIED = 1`) y validar que la UI ofrezca la alternativa manual sin bloquear la captura. |

---

## 3. Arquitectura de la Pirámide de Pruebas

```
             / \
            /   \       E2E (Playwright - Chromium)
           / E2E \      tests/e2e/flujo-offline.e2e.ts
          /-------\     Flujo completo, Service Worker y permisos
         /         \
        / Integrac. \   Integración (Vitest + fixtures)
       /             \  tests/integration/*.spec.ts
      /---------------\ Persistencia offline y deduplicación con endpoint
     /                 \
    /     Unitarias     \  Unitarias (Vitest)
   /                     \ tests/unit/*.spec.ts
  /-----------------------\ Validación pura de negocio, reglas de cola e idempotencia
```

### 3.1 Pruebas Unitarias (`tests/unit/`)
- `tests/unit/inspection-validation.spec.ts`:
  - Validación y normalización con `validateInspectionInput`.
  - Validación de fechas gregorianas reales (`isValidIsoDate`), detectando años bisiestos y rechazando meses o días imposibles.
  - Derivación automática del estado: `findings === 0` genera `"ok"` ("Sin incidencias"); `findings > 0` genera `"attention"` ("Requiere atención").
  - Límites de campos: identificador (regex alfanumérico, guiones y guiones bajos hasta 64 caracteres), inspector (hasta 60 caracteres), hallazgos (enteros de 0 a 99), resumen (5 a 500 caracteres).
- `tests/unit/queue-rules.spec.ts`:
  - Encolado inicial en cola vacía con estado `pending` y 0 intentos.
  - Idempotencia en cola: re-encolar una inspección en `pending` o `failed` actualiza el payload y resetea intentos; ignorar re-encolado si ya está en `synced` o `syncing`.
  - Recuperación de sincronizaciones huérfanas con `recoverStaleItems(now)`: restaura a `pending` aquellas inspecciones en `syncing` que excedieron 30 segundos.
  - Idempotencia del servidor: `saveInspection` retorna `{ created: true }` en el primer guardado y `{ created: false }` en reintentos con el mismo ID, manteniendo exactamente una copia en memoria.

### 3.2 Pruebas de Integración (`tests/integration/`)
- `tests/integration/offline-persistence.spec.ts`:
  - Simula captura sin red guardando inspecciones mediante `enqueue()`.
  - Verifica la estructura de datos en `localStorage` bajo la clave `pwa-10B:inspection-queue:v1`.
  - Simula recarga de sesión leyendo directamente con `readQueue()` y confirmando que no hay pérdida de información.
  - Verifica resiliencia ante entradas corruptas en el almacenamiento.
- `tests/integration/sync-deduplication.spec.ts`:
  - Conecta la cola cliente (`processQueue()`) directamente con el endpoint de Next.js (`POST /api/inspecciones`).
  - **Prueba crítica de deduplicación**: Simula un reintento del mismo identificador de inspección; comprueba que el servidor responde HTTP 200 OK y que el listado global (`listInspections()`) no incrementa su conteo.
  - Tolerancia a cortes de red: la cola transiciona a `failed`, incrementa intentos, preserva el error y se recupera automáticamente en el siguiente ciclo.
  - Concurrencia: llamadas simultáneas a `processQueue()` comparten la misma promesa en vuelo (`inFlight`) sin duplicar peticiones HTTP.

### 3.3 Pruebas E2E (`tests/e2e/`)
- `tests/e2e/flujo-offline.e2e.ts` (Playwright en Chromium real contra `next start` en puerto 3100):
  - **Escenario 1**: Calentamiento de Service Worker y caché `runtime-v1` → desconexión con `context.setOffline(true)` → captura en formulario `/inspecciones/nueva` → verificación de guardado local con estado `pending` → recarga de página sin red (persistencia) → reconexión con `context.setOffline(false)` → sincronización automática a estado `synced` → comprobación en `/inspecciones` de exactamente 1 elemento en el listado.
  - **Escenario 2**: Permiso de geolocalización denegado (`PERMISSION_DENIED = 1`) → mensaje de degradación elegante → selección manual de laboratorio → guardado exitoso y sincronización con el servidor.
  - **Escenario 3**: Rechazo en formulario de captura inválida sin ingresar a la cola.
  - **Escenario 4**: Solicitud POST duplicada en endpoint HTTP respondiendo 201 en la primera y 200 en la segunda.

---

## 4. Fixtures Sintéticos

Ubicación: `tests/fixtures/synthetic-inspections.ts`
- `FIXTURE_VALID_OK`: Inspección sin incidencias para Laboratorio de Redes (`findings: 0`).
- `FIXTURE_VALID_ATTENTION`: Inspección con incidencias para Laboratorio de Cómputo B (`findings: 3`).
- `FIXTURE_DUPLICATE_OPERATION`: Inspección para comprobar idempotencia en reintentos.
- `FIXTURE_INVALID_CASES`: Casos de error estructurados (ID ausente, ID con caracteres no permitidos, fechas gregorianas imposibles como 2026-02-31, inspector mayor a 60 caracteres, hallazgos negativos, resumen menor a 5 caracteres).

---

## 5. Integración Continua (CI)

Workflow: `.github/workflows/academic-evaluation.yml`
Ejecuta las siguientes etapas secuenciales en Ubuntu con Node 22:
1. `npm ci --no-audit --no-fund`: Instalación limpia de dependencias.
2. `npm run lint`: Verificación estática con Next Lint (cero advertencias permitidas).
3. `npm run typecheck`: Validación de tipos TypeScript (`tsc --noEmit`).
4. `npm run build`: Compilación de producción de Next.js.
5. `npm run test:unit`: Ejecución de pruebas unitarias (`tests/unit/`).
6. `npm run test:integration`: Ejecución de pruebas de integración (`tests/integration/`).
7. `npm run test:coverage`: Suite completa de Vitest con generación de reporte de cobertura V8.
8. `npx playwright install --with-deps chromium`: Instalación de Chromium.
9. `npm run test:e2e`: Ejecución de pruebas E2E con Playwright (arranque automático de Next.js en puerto 3100).
10. `npm run verify`: Verificación técnica global (`scripts/verify.mjs`).
11. `upload-artifact`: Publicación incondicional (`if: always()`) de reportes JUnit, cobertura y trazas de Playwright en el artefacto `reportes-semana-08`.

---

## 6. Procedimiento para Demostrar el Defecto Controlado

Para cumplir con el criterio **AC-03 (Calidad verificable)**, se introduce un defecto a propósito en una rama temporal que nunca se fusiona (`irvin/tmp-defecto-controlado`, creada desde `develop`).

### Defecto seleccionado: omitir la protección de deduplicación en el servidor
- **Archivo afectado**: `src/lib/server/inspection-store.ts`
- **Cambio en la rama temporal**: borrar el bloque que hace idempotente a `saveInspection`:
  ```ts
  if (existing) {
    return { created: false, inspection: { ...existing } };
  }
  ```
  Sin ese bloque, reenviar el mismo id crea una inspección duplicada.

### Qué pruebas lo detectan (una por cada capa) y qué salida dan
Resultado observado al probarlo en una copia de `main` con el defecto:

| Capa | Prueba que falla | Salida observada |
|---|---|---|
| Unitaria | `tests/unit/queue-rules.spec.ts` › reintento de la misma operación devuelve `created: false` y NO duplica el registro | `AssertionError: expected true to be false` |
| Integración | `tests/integration/sync-deduplication.spec.ts` › deduplicación crítica: reintentar la sincronización de la misma operación no crea un duplicado | `AssertionError: expected 5 to be 4` (el servidor creó una fila de más) |
| E2E | `tests/e2e/flujo-offline.e2e.ts` › enviar dos veces la misma inspección al servidor no crea un duplicado | `Expected: 200, Received: 201` (1 fallida, 3 pasan) |

### Recuperación
Se restaura el bloque `if (existing)` y se vuelven a ejecutar las tres capas: `28 passed` (unitarias), `9 passed` (integración) y `4 passed` (E2E).

### Evidencia enlazada (en Actions)
- Ejecución en rojo (con el defecto): commit `65f2a09` en la rama temporal `irvin/tmp-defecto-controlado` (nunca fusionada). Run de *Academic Evaluation*: https://github.com/marijolinares/pwa-10B/actions/runs/40240569659
- Ejecución en verde (recuperación): commit `1f81f20` en la misma rama, mismo workflow *Academic Evaluation*: https://github.com/marijolinares/pwa-10B/actions/runs/40241049094

---

## 7. Limitaciones y Supuestos
1. **Almacenamiento**: `localStorage` se utiliza para la cola de sincronización de metadatos de inspecciones (~5 MB disponibles). Si en el futuro se persistieran imágenes fotográficas de alta resolución en la cola offline, se deberá incorporar IndexedDB.
2. **Entorno de pruebas unitarias e integración**: Vitest ejecuta sobre `happy-dom`, simulando el entorno de navegador en Node.js de forma ultra-rápida. La validación en el motor de renderizado real queda cubierta por Playwright.
3. **Servidor en memoria**: Para fines pedagógicos y reproducibilidad en CI sin dependencias de infraestructura en la nube, el almacenamiento del servidor reside en memoria (`globalThis.__pwaInspections`) inicializado con datos sintéticos.
4. **Navegadores**: el E2E corre solo en Chromium de escritorio; no cubre otros navegadores ni dispositivos reales, y la desconexión es simulada con `context.setOffline`.
5. **Alcance del E2E**: cubre el flujo común, la variante con ubicación denegada, la captura inválida y el envío doble; la cámara y las notificaciones no están conectadas a ninguna pantalla, así que no se prueban de punta a punta.

