# Capacidades del dispositivo (Semana 6)

<!-- La introducción general la completa Majo al cierre. Cada integrante agrega su sección al final. -->

## Geolocalización

**Archivos:** `src/lib/capabilities/result.ts` (resultado compartido), `src/lib/device/geolocation.ts`, pruebas en `tests/capabilities.spec.ts` (bloque "Geolocalización").

**Qué hace.** `requestPosition()` obtiene las coordenadas del dispositivo solo cuando la persona lo pide (por ejemplo, con un botón "Usar mi ubicación"). El permiso nunca se solicita al importar el módulo.

**Permiso mínimo.** Se usa una lectura puntual (`getCurrentPosition`), sin seguimiento continuo y sin alta precisión. Las coordenadas viven solo en memoria: no se guardan ni se envían. Todos los datos del proyecto son sintéticos.

**Resultado.** La función nunca lanza error. Devuelve `{ ok: true, value }` o `{ ok: false, reason, message }`:

| Motivo | Cuándo ocurre |
|---|---|
| `unsupported` | El navegador no tiene `navigator.geolocation` |
| `denied` | La persona negó el permiso |
| `unavailable` | Hay permiso, pero no se pudo determinar la posición |
| `timeout` | Se agotó el tiempo (8 s) |
| `error` | Cualquier otro fallo inesperado |

**Alternativa sin permiso o sin soporte.** La persona elige el laboratorio a mano de la lista `LABORATORIES` mediante `selectLaboratory(id)`, que no necesita permisos. El `message` de cada fallo ya invita a hacerlo y se muestra dentro de la app.

**Pruebas.** Simulan el navegador con `vi.stubGlobal`: éxito, permiso denegado, sin soporte, tiempo agotado, posición no disponible, error inesperado, que no se pida permiso al importar y la selección manual.