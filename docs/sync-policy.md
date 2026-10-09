# Política de sincronización y resolución de conflictos

## 1. Contexto y alcance

Los técnicos capturan inspecciones de laboratorio con conectividad intermitente. Cada inspección se guarda primero en el dispositivo (`localStorage`) y se envía al servidor cuando hay red. Este documento define cómo se evita perder o duplicar inspecciones, cómo se reintenta y qué pasa cuando el servidor ya tiene otra versión.

Archivos: `src/lib/storage/schema.ts` (almacenamiento), `src/lib/sync/queue.ts` (cola), `src/lib/sync/conflict-policy.ts` (conflictos), `tests/sync.spec.ts` y `tests/storage-schema.spec.ts` (pruebas). Todos los datos son sintéticos.

## 2. Modelo de la cola

Cada elemento (`QueueItem`) guarda: `id` (el de la inspección, sirve para no duplicar), `payload`, `status`, `attempts`, `createdAt`, `lastError` y `syncingSince` (cuándo empezó a enviarse). La clave de almacenamiento está versionada (`pwa-10B:inspection-queue:v1`) y `readQueue()` descarta lo corrupto o inválido en vez de fallar.

| Estado | Significado |
|---|---|
| `pending` | Capturada, falta enviarla |
| `syncing` | Enviándose ahora |
| `synced` | El servidor la aceptó |
| `failed` | El último intento falló; se reintenta mientras queden intentos |
| `conflict` | El servidor siguió respondiendo 409 tras `MAX_ATTEMPTS` intentos |

Transiciones:
- `enqueue()`: nueva → `pending`. Si ya existe como `pending`, `failed` o `conflict`, actualiza el contenido y reinicia los intentos. Si está `synced` o `syncing`, se ignora.
- `processQueue()`: `pending`/`failed` (con menos de 3 intentos) → `syncing` → `synced` (respuesta correcta), `failed` (error de red o respuesta distinta de 2xx y 409; suma un intento) o `pending`/`conflict` (respuesta 409).
- `recoverStaleItems()`: `syncing` por 30 s o más, o sin marca de tiempo → `pending`.

## 3. Garantías y cómo se comprueban

| Garantía | Mecanismo | Prueba en `tests/sync.spec.ts` |
|---|---|---|
| No duplicar al capturar | `enqueue()` busca por `id` | "no duplica por id…", "actualiza el payload…" |
| No reenviar lo ya sincronizado | `synced` no es elegible y `enqueue()` lo ignora | "ignora una inspección ya sincronizada…" |
| No enviar dos veces a la vez | `syncing` se guarda **antes** de la petición; además `processQueue()` reutiliza la corrida en curso (`inFlight`) dentro de la pestaña | "dos llamadas simultáneas…", "una corrida lenta no se solapa…" |
| No perder lo capturado durante una sincronización | Cada cambio relee la cola de `localStorage` (`updateItem`) y el siguiente item se elige de ahí | "no pierde una inspección capturada…" |
| Sobrevivir al cierre de la pestaña | `syncingSince` y `recoverStaleItems()` (umbral `STALE_SYNC_MS` = 30 000 ms) | 3 pruebas de "recuperación tras el cierre…" |
| Respuestas tardías o fuera de orden | Si el item ya no existe, `updateItem` no hace nada: no se resucita | "una respuesta tardía no resucita…" |
| Orden de captura | Se toma el primer item elegible de la cola | "envía las inspecciones en el orden…" |
| Reintentos acotados | `MAX_ATTEMPTS` = 3 | "deja de reintentar…", "cuenta como fallo una respuesta HTTP 500" |
| Conflictos acotados | Cada 409 cuenta un intento; al llegar a 3 pasa a `conflict` | 2 pruebas de "conflictos" |
| Observabilidad | `lastError` por item y `getQueueStats()` | "getQueueStats cuenta…" |

## 4. Reintentos

- Cada corrida intenta cada item como máximo una vez; los reintentos ocurren en la siguiente corrida.
- Una corrida se dispara con el evento `online` (`startAutoSync()`) o llamando a `processQueue()`.
- Tras 3 intentos fallidos el item queda en `failed` hasta que se vuelva a capturar con `enqueue()`.
- No hay espera creciente entre reintentos ni tiempo límite propio por petición (ver límites).

## 5. Política de conflictos: client wins

Si el servidor responde 409 con `{ current }` (su versión), `resolveConflict(local, server)` devuelve `{ ...server, ...local }`: **gana lo capturado en campo** y se conservan los campos que solo tiene el servidor. La función es pura (no modifica sus argumentos). El item vuelve a `pending` para reenviarse con el resultado.

Por qué: el técnico que inspeccionó el laboratorio es la fuente de verdad de lo que vio ese día, y la política es simple, predecible y fácil de probar.

Alternativas descartadas:

| Alternativa | Por qué no |
|---|---|
| Gana el servidor | Descartaría el trabajo hecho sin conexión |
| Gana la última escritura por fecha | Necesita un campo de fecha de modificación y relojes confiables, que el modelo no tiene |
| Fusión por campo | Necesita versionado por campo |
| Resolución manual | Necesita interfaz de usuario; fuera de alcance esta semana |

Riesgo conocido: si dos personas editan la misma inspección, la sincronización más reciente sobrescribe a la otra sin avisar. Mitigación futura: marca de tiempo por campo o pantalla de resolución.

## 6. Supuestos

- El servidor es idempotente por `id`: recibir la misma inspección dos veces no crea un duplicado.
- Un conflicto se responde con HTTP 409 y `{ "current": <inspección del servidor> }`.
- Estos dos puntos son un contrato **asumido**: hoy `src/app/api/inspecciones/route.ts` solo implementa `GET`, así que las pruebas usan un `fetch` simulado.

## 7. Fallos encontrados en la primera versión

| Fallo | Efecto | Corrección |
|---|---|---|
| `processQueue` guardaba al final una copia vieja de la cola | Una inspección capturada durante la sincronización desaparecía | `updateItem` relee `localStorage` en cada cambio |
| Llamadas simultáneas trabajaban con copias separadas | 3 peticiones en lugar de 2 en la prueba | Estado persistido antes de la red y `inFlight` |
| Items en `syncing` tras cerrar la pestaña se saltaban para siempre | Inspecciones que nunca se enviaban | `syncingSince` y `recoverStaleItems()` |
| Un 409 reiniciaba los intentos a 0 | Reintento sin fin ante un servidor que siempre responde 409; el estado `conflict` no se usaba | Cada 409 cuenta; al tercero pasa a `conflict` |
| `lastError` seguía visible tras sincronizar | Estado confuso para observar | Se limpia al sincronizar |

Al revisar la primera versión, las pruebas nuevas fallaron contra ella (9 de las 20 que existían entonces), lo que confirma estos fallos y que las pruebas detectan una regresión.

## 8. Límites

- `localStorage` es síncrono, guarda solo texto y tiene un límite cercano a 5 MB: no sirve para adjuntar fotos (haría falta IndexedDB).
- Entre pestañas, leer–modificar–escribir no es atómico; `syncingSince` y la idempotencia del servidor reducen el riesgo, pero no lo eliminan.
- Sin espera creciente entre reintentos ni tiempo límite por petición: una petición colgada mantiene ocupada la corrida de esa pestaña.
- Una edición posterior a una sincronización exitosa con el mismo `id` se ignora; haría falta versionado por inspección.
- La interfaz aún no llama a `enqueue()` ni a `startAutoSync()`.
- Las pruebas corren en Node con `happy-dom`; no cubren un navegador real ni la red.

## 9. Cómo verificar

```bash
npm ci
npm run verify
```

`npx vitest run tests/sync.spec.ts` ejecuta solo las pruebas de esta semana.
