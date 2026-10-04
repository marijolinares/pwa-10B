# Evidencia Individual

**Estudiante:** Germán
**Actividad:** Semana 5 (Sincronización)

## Decisión Técnica
Implementé la cola de sincronización en `src/lib/sync/queue.ts`. Para asegurar que las operaciones sean idempotentes (no enviar la misma inspección múltiple veces causando duplicidad en base de datos), implementé una validación por ID en `enqueue()`. Además, en `processQueue()`, antes de ejecutar la petición `fetch`, actualizo el estado en storage a `syncing`. Esta decisión mitiga condiciones de carrera (por ejemplo, si el evento `online` del navegador se dispara varias veces o si un service worker invoca el Background Sync en paralelo con la UI).

## Límite y Riesgo
La política de conflicto actual ("Client Wins") sobrescribe por defecto el estado en el servidor. Si dos usuarios editan el mismo reporte de laboratorio y uno se sincroniza horas después que el otro debido al trabajo offline, el segundo borrará el progreso del primero sin saberlo. En una iteración futura, esto requeriría un Merge basado en "timestamp" por propiedad o intervención del usuario (Conflict Resolution UI).

## Prueba Ejecutada
Ejecuté la suite de pruebas `tests/sync.spec.ts` la cual comprueba que:
1. No hay duplicación al encolar.
2. Se reintenta en caso de errores de red (hasta el límite permitido).
3. Se invoca correctamente `resolveConflict` y se encola nuevamente al recibir un HTTP 409.

## Uso de IA Declarado
He utilizado IA (modelo de lenguaje por consola) para estructurar el mocking de `fetch` dentro de Vitest y agilizar la construcción de la función `processQueue` base, verificando manualmente que las políticas de idempotencia y retries se cumplan antes de realizar los commits.
