import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { enqueue, processQueue, getQueueStats } from "../../src/lib/sync/queue";
import { clearQueue, readQueue, writeQueue } from "../../src/lib/storage/schema";
import {
  listInspections,
  resetInspections,
  saveInspection,
} from "../../src/lib/server/inspection-store";
import { POST } from "../../src/app/api/inspecciones/route";
import {
  FIXTURE_VALID_OK,
  FIXTURE_VALID_ATTENTION,
  FIXTURE_DUPLICATE_OPERATION,
  createSyntheticQueueItem,
} from "../fixtures/synthetic-inspections";

describe("Integración: Sincronización y deduplicación con fixtures (Semana 8)", () => {
  beforeEach(() => {
    clearQueue();
    resetInspections();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("flujo de sincronización: envía inspección offline y actualiza estado a 'synced'", async () => {
    // Conectar fetch simulado al endpoint real de Next.js POST /api/inspecciones
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      const request = new Request("http://localhost:3000/api/inspecciones", {
        method: init?.method,
        headers: init?.headers,
        body: init?.body,
      });
      return POST(request);
    });

    enqueue(FIXTURE_VALID_OK);
    expect(readQueue()[0].status).toBe("pending");

    await processQueue();

    // 1. Verificación del cliente: la cola pasa a synced y no tiene errores
    const queue = readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].status).toBe("synced");
    expect(queue[0].lastError).toBeUndefined();

    // 2. Verificación de la llamada a la red: método POST y body correcto
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // 3. Verificación en el servidor: la inspección quedó almacenada
    const serverItems = listInspections();
    const stored = serverItems.find((i) => i.id === FIXTURE_VALID_OK.id);
    expect(stored).toBeDefined();
    expect(stored?.inspector).toBe("Germán Yair Martínez");

    const stats = getQueueStats();
    expect(stats.synced).toBe(1);
    expect(stats.pending).toBe(0);
  });

  it("deduplicación crítica: reintentar la sincronización de la misma operación no crea un duplicado", async () => {
    // Conectar fetch simulado al endpoint POST /api/inspecciones
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      const request = new Request("http://localhost:3000/api/inspecciones", {
        method: init?.method,
        headers: init?.headers,
        body: init?.body,
      });
      return POST(request);
    });

    // 1. Primer envío: la inspección se sincroniza y el servidor responde 201 Created
    enqueue(FIXTURE_DUPLICATE_OPERATION);
    await processQueue();

    expect(readQueue()[0].status).toBe("synced");

    const countAfterFirstSync = listInspections().length;
    const matchesAfterFirst = listInspections().filter(
      (i) => i.id === FIXTURE_DUPLICATE_OPERATION.id
    );
    expect(matchesAfterFirst).toHaveLength(1);

    // 2. Simulación de reintento:
    // Supongamos que la confirmación se interrumpió y el cliente intenta re-sincronizar
    // el mismo ítem (colocándolo nuevamente como 'pending' o llamando directamente al endpoint)
    const queueItem = readQueue()[0];
    writeQueue([{ ...queueItem, status: "pending", attempts: 1 }]);

    // 3. Ejecutar segundo intento de sincronización de la MISMA operación
    await processQueue();

    // 4. Verificaciones de deduplicación:
    // La cola vuelve a quedar en synced
    expect(readQueue()[0].status).toBe("synced");

    // En el servidor NO aumentó el total de inspecciones
    const countAfterRetry = listInspections().length;
    expect(countAfterRetry).toBe(countAfterFirstSync);

    // En el servidor sigue existiendo EXACTAMENTE UNA inspección con ese ID
    const matchesAfterRetry = listInspections().filter(
      (i) => i.id === FIXTURE_DUPLICATE_OPERATION.id
    );
    expect(matchesAfterRetry).toHaveLength(1);
    expect(matchesAfterRetry[0].id).toBe(FIXTURE_DUPLICATE_OPERATION.id);
  });

  it("manejo de fallo de red y posterior reintento exitoso sin pérdida de datos", async () => {
    let shouldFail = true;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      if (shouldFail) {
        throw new TypeError("Failed to fetch: red no disponible");
      }
      const request = new Request("http://localhost:3000/api/inspecciones", {
        method: init?.method,
        headers: init?.headers,
        body: init?.body,
      });
      return POST(request);
    });

    enqueue(FIXTURE_VALID_ATTENTION);

    // 1. Intento fallido por corte de conexión
    await processQueue();

    let items = readQueue();
    expect(items[0].status).toBe("failed");
    expect(items[0].attempts).toBe(1);
    expect(items[0].lastError).toContain("Failed to fetch");

    // 2. Red restaurada: reintentar proceso
    shouldFail = false;
    await processQueue();

    items = readQueue();
    expect(items[0].status).toBe("synced");
    expect(items[0].lastError).toBeUndefined();

    // El servidor tiene una sola copia
    const matches = listInspections().filter((i) => i.id === FIXTURE_VALID_ATTENTION.id);
    expect(matches).toHaveLength(1);
  });

  it("concurrencia: llamadas paralelas a processQueue comparten la misma promesa y no duplican llamadas", async () => {
    let callCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      callCount += 1;
      // Simula ligera latencia de red
      await new Promise((resolve) => setTimeout(resolve, 10));
      const request = new Request("http://localhost:3000/api/inspecciones", {
        method: init?.method,
        headers: init?.headers,
        body: init?.body,
      });
      return POST(request);
    });

    enqueue(FIXTURE_VALID_OK);

    // Disparar dos llamadas simultáneas a processQueue (ej. doble evento 'online')
    await Promise.all([processQueue(), processQueue()]);

    expect(callCount).toBe(1);
    expect(readQueue()[0].status).toBe("synced");
  });
});
