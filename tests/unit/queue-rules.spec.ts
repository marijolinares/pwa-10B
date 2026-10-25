import { describe, it, expect, beforeEach } from "vitest";
import {
  enqueue,
  recoverStaleItems,
  getQueueStats,
  STALE_SYNC_MS,
  MAX_ATTEMPTS,
} from "../../src/lib/sync/queue";
import { clearQueue, readQueue, writeQueue } from "../../src/lib/storage/schema";
import {
  saveInspection,
  listInspections,
  resetInspections,
} from "../../src/lib/server/inspection-store";
import {
  FIXTURE_VALID_OK,
  FIXTURE_VALID_ATTENTION,
  FIXTURE_DUPLICATE_OPERATION,
  createSyntheticQueueItem,
} from "../fixtures/synthetic-inspections";

describe("Reglas de cola e idempotencia (Semana 8)", () => {
  beforeEach(() => {
    clearQueue();
    resetInspections();
  });

  describe("Reglas de encolado en cliente (queue.ts)", () => {
    it("encola un nuevo elemento en cola vacía con estado 'pending' y 0 intentos", () => {
      enqueue(FIXTURE_VALID_OK);

      const items = readQueue();
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe(FIXTURE_VALID_OK.id);
      expect(items[0].status).toBe("pending");
      expect(items[0].attempts).toBe(0);
      expect(items[0].payload).toEqual(FIXTURE_VALID_OK);
      expect(items[0].createdAt).toBeDefined();
    });

    it("encola múltiples inspecciones manteniendo elementos independientes sin pisarse", () => {
      enqueue(FIXTURE_VALID_OK);
      enqueue(FIXTURE_VALID_ATTENTION);

      const items = readQueue();
      expect(items).toHaveLength(2);
      expect(items[0].id).toBe(FIXTURE_VALID_OK.id);
      expect(items[1].id).toBe(FIXTURE_VALID_ATTENTION.id);

      const stats = getQueueStats();
      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(2);
    });

    it("idempotencia en cola: re-encolar una inspección ya en 'pending' actualiza datos y no duplica", () => {
      enqueue(FIXTURE_VALID_OK);

      const updatedPayload = {
        ...FIXTURE_VALID_OK,
        summary: "Resumen actualizado antes de sincronizar.",
      };
      enqueue(updatedPayload);

      const items = readQueue();
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe(FIXTURE_VALID_OK.id);
      expect(items[0].payload.summary).toBe("Resumen actualizado antes de sincronizar.");
      expect(items[0].status).toBe("pending");
      expect(items[0].attempts).toBe(0);
    });

    it("idempotencia en cola: re-encolar una inspección en 'failed' la reinicia a 'pending'", () => {
      const failedItem = createSyntheticQueueItem(FIXTURE_VALID_OK, {
        status: "failed",
        attempts: 2,
        lastError: "Error de conexión previo",
      });
      writeQueue([failedItem]);

      const retryPayload = {
        ...FIXTURE_VALID_OK,
        summary: "Reintento manual de captura fallida.",
      };
      enqueue(retryPayload);

      const items = readQueue();
      expect(items).toHaveLength(1);
      expect(items[0].status).toBe("pending");
      expect(items[0].attempts).toBe(0);
      expect(items[0].lastError).toBeUndefined();
      expect(items[0].payload.summary).toBe("Reintento manual de captura fallida.");
    });

    it("regla de protección: si la inspección ya está en 'synced', enqueue la ignora y no la vuelve a enviar", () => {
      const syncedItem = createSyntheticQueueItem(FIXTURE_VALID_OK, {
        status: "synced",
        attempts: 1,
      });
      writeQueue([syncedItem]);

      enqueue({ ...FIXTURE_VALID_OK, summary: "Intento de modificación post-sincronización." });

      const items = readQueue();
      expect(items).toHaveLength(1);
      expect(items[0].status).toBe("synced");
      expect(items[0].payload.summary).toBe(FIXTURE_VALID_OK.summary);
    });

    it("regla de concurrencia: si la inspección está en 'syncing', enqueue no altera su estado", () => {
      const syncingItem = createSyntheticQueueItem(FIXTURE_VALID_OK, {
        status: "syncing",
        syncingSince: new Date().toISOString(),
      });
      writeQueue([syncingItem]);

      enqueue(FIXTURE_VALID_OK);

      const items = readQueue();
      expect(items).toHaveLength(1);
      expect(items[0].status).toBe("syncing");
    });
  });

  describe("Recuperación de sincronizaciones huérfanas (recoverStaleItems)", () => {
    it("recupera a 'pending' aquellos items en 'syncing' que exceden el tiempo límite", () => {
      const now = Date.now();
      const expiredTimestamp = new Date(now - (STALE_SYNC_MS + 5000)).toISOString();

      const staleItem = createSyntheticQueueItem(FIXTURE_VALID_OK, {
        status: "syncing",
        syncingSince: expiredTimestamp,
      });
      writeQueue([staleItem]);

      const recoveredCount = recoverStaleItems(now);
      expect(recoveredCount).toBe(1);

      const items = readQueue();
      expect(items[0].status).toBe("pending");
      expect(items[0].syncingSince).toBeUndefined();
    });

    it("mantiene en 'syncing' aquellos items cuyo proceso aún está dentro del tiempo válido", () => {
      const now = Date.now();
      const freshTimestamp = new Date(now - 5000).toISOString();

      const activeItem = createSyntheticQueueItem(FIXTURE_VALID_OK, {
        status: "syncing",
        syncingSince: freshTimestamp,
      });
      writeQueue([activeItem]);

      const recoveredCount = recoverStaleItems(now);
      expect(recoveredCount).toBe(0);

      const items = readQueue();
      expect(items[0].status).toBe("syncing");
    });

    it("recupera items en 'syncing' con timestamp inválido o ausente", () => {
      const corruptSyncItem = createSyntheticQueueItem(FIXTURE_VALID_OK, {
        status: "syncing",
        syncingSince: "fecha-invalida",
      });
      writeQueue([corruptSyncItem]);

      const recoveredCount = recoverStaleItems();
      expect(recoveredCount).toBe(1);

      const items = readQueue();
      expect(items[0].status).toBe("pending");
    });
  });

  describe("Regla de idempotencia del servidor (inspection-store.ts)", () => {
    it("primera creación registra la inspección con created: true", () => {
      const result = saveInspection(FIXTURE_DUPLICATE_OPERATION);
      expect(result.created).toBe(true);
      expect(result.inspection.id).toBe(FIXTURE_DUPLICATE_OPERATION.id);

      const all = listInspections();
      const matches = all.filter((i) => i.id === FIXTURE_DUPLICATE_OPERATION.id);
      expect(matches).toHaveLength(1);
    });

    it("reintento de la misma operación devuelve created: false y NO duplica el registro", () => {
      // Primer guardado
      const firstResult = saveInspection(FIXTURE_DUPLICATE_OPERATION);
      expect(firstResult.created).toBe(true);

      const countBeforeRetry = listInspections().length;

      // Segundo guardado (reintento por fallo de red o llamada concurrente)
      const retryResult = saveInspection(FIXTURE_DUPLICATE_OPERATION);
      expect(retryResult.created).toBe(false);
      expect(retryResult.inspection.id).toBe(FIXTURE_DUPLICATE_OPERATION.id);

      const countAfterRetry = listInspections().length;
      expect(countAfterRetry).toBe(countBeforeRetry);

      // Verificación estricta: sólo existe una entidad con ese ID en todo el store
      const occurrences = listInspections().filter(
        (i) => i.id === FIXTURE_DUPLICATE_OPERATION.id
      );
      expect(occurrences).toHaveLength(1);
    });

    it("listInspections devuelve copias defensivas inmutables", () => {
      const list1 = listInspections();
      const originalCount = list1.length;
      list1.push(FIXTURE_VALID_OK);

      const list2 = listInspections();
      expect(list2.length).toBe(originalCount);
    });
  });
});
