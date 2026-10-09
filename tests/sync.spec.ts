import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  enqueue,
  processQueue,
  recoverStaleItems,
  getQueueStats,
  startAutoSync,
  MAX_ATTEMPTS,
  STALE_SYNC_MS,
} from "../src/lib/sync/queue";
import { resolveConflict } from "../src/lib/sync/conflict-policy";
import { clearQueue, readQueue, writeQueue } from "../src/lib/storage/schema";
import type { QueueItem } from "../src/lib/storage/schema";
import type { Inspection } from "../src/lib/data/inspections";

function makeInspection(id: string, overrides: Partial<Inspection> = {}): Inspection {
  return {
    id,
    location: "Laboratorio de Redes",
    date: "2026-10-03",
    inspector: "Técnica A",
    status: "ok",
    statusLabel: "Sin incidencias",
    findings: 0,
    summary: "Inspección sintética de prueba",
    ...overrides,
  };
}

function makeItem(id: string, overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    id,
    payload: makeInspection(id),
    status: "pending",
    attempts: 0,
    createdAt: "2026-10-03T10:00:00.000Z",
    ...overrides,
  };
}

const okResponse = { ok: true, status: 200 };
const conflictResponse = (current: unknown) => ({
  ok: false,
  status: 409,
  json: async () => ({ current }),
});

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  clearQueue();
  fetchMock = vi.fn().mockResolvedValue(okResponse);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("enqueue: captura local sin duplicados", () => {
  it("no duplica por id al encolar dos veces la misma inspección", () => {
    enqueue(makeInspection("a"));
    enqueue(makeInspection("a"));

    const queue = readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe("a");
    expect(queue[0].status).toBe("pending");
  });

  it("actualiza el payload de un item pendiente con el mismo id", () => {
    enqueue(makeInspection("a", { summary: "primera versión" }));
    enqueue(makeInspection("a", { summary: "versión corregida" }));

    const queue = readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].payload.summary).toBe("versión corregida");
  });

  it("reinicia los intentos de un item fallido al encolarlo de nuevo", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network Error"));
    enqueue(makeInspection("a"));
    await processQueue();
    expect(readQueue()[0].status).toBe("failed");
    expect(readQueue()[0].attempts).toBe(1);

    enqueue(makeInspection("a"));
    expect(readQueue()[0].status).toBe("pending");
    expect(readQueue()[0].attempts).toBe(0);
  });

  it("ignora una inspección ya sincronizada y no la reenvía", async () => {
    enqueue(makeInspection("a"));
    await processQueue();

    enqueue(makeInspection("a"));
    await processQueue();

    expect(readQueue()).toHaveLength(1);
    expect(readQueue()[0].status).toBe("synced");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("processQueue: sincronización, reintentos y concurrencia", () => {
  it("envía un POST con la inspección y la marca como sincronizada", async () => {
    const inspection = makeInspection("a");
    enqueue(inspection);

    await processQueue();

    expect(readQueue()[0].status).toBe("synced");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/inspecciones");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual(inspection);
  });

  it("marca el fallo de red y lo reintenta en la siguiente corrida", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network Error"));
    enqueue(makeInspection("a"));

    await processQueue();
    expect(readQueue()[0].status).toBe("failed");
    expect(readQueue()[0].attempts).toBe(1);
    expect(readQueue()[0].lastError).toBe("Network Error");

    await processQueue();
    expect(readQueue()[0].status).toBe("synced");
    expect(readQueue()[0].lastError).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("cuenta como fallo una respuesta HTTP 500", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    enqueue(makeInspection("a"));

    await processQueue();

    const item = readQueue()[0];
    expect(item.status).toBe("failed");
    expect(item.attempts).toBe(1);
    expect(item.lastError).toContain("500");
  });

  it("deja de reintentar al llegar a MAX_ATTEMPTS", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    enqueue(makeInspection("a"));

    for (let i = 0; i < MAX_ATTEMPTS + 2; i += 1) {
      await processQueue();
    }

    expect(fetchMock).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    expect(readQueue()[0].status).toBe("failed");
    expect(readQueue()[0].attempts).toBe(MAX_ATTEMPTS);
  });

  it("dos llamadas simultáneas no duplican los envíos", async () => {
    enqueue(makeInspection("a"));
    enqueue(makeInspection("b"));

    await Promise.all([processQueue(), processQueue()]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(readQueue().every((item) => item.status === "synced")).toBe(true);
  });

  it("envía las inspecciones en el orden en que se capturaron", async () => {
    enqueue(makeInspection("a"));
    enqueue(makeInspection("b"));
    enqueue(makeInspection("c"));

    await processQueue();

    const sentIds = fetchMock.mock.calls.map((call) => JSON.parse(call[1].body).id);
    expect(sentIds).toEqual(["a", "b", "c"]);
  });

  it("no pierde una inspección capturada mientras se sincroniza otra", async () => {
    // Regresión: una versión anterior guardaba una copia vieja de la cola al
    // terminar y borraba lo que enqueue() había guardado durante la espera.
    fetchMock.mockImplementationOnce(async () => {
      enqueue(makeInspection("b"));
      return okResponse;
    });
    enqueue(makeInspection("a"));

    await processQueue();

    const queue = readQueue();
    expect(queue.map((item) => item.id)).toEqual(["a", "b"]);
    expect(queue.every((item) => item.status === "synced")).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("una corrida lenta no se solapa con otra aunque su item ya parezca huérfano", async () => {
    // Solo se simula Date: el item lleva más de STALE_SYNC_MS en "syncing", pero
    // su corrida sigue viva. Sin el guard, la segunda llamada lo recuperaría y
    // lo enviaría otra vez mientras la primera petición todavía está en curso.
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      let release: () => void = () => {};
      fetchMock.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = () => resolve(okResponse);
          }),
      );
      enqueue(makeInspection("a"));

      const first = processQueue();
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      vi.setSystemTime(Date.now() + STALE_SYNC_MS + 1000);
      const second = processQueue();
      release();
      await Promise.all([first, second]);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(readQueue()[0].status).toBe("synced");
    } finally {
      vi.useRealTimers();
    }
  });

  it("una respuesta tardía no resucita un item que ya fue eliminado", async () => {
    let release: () => void = () => {};
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve(okResponse);
        }),
    );
    enqueue(makeInspection("a"));

    const run = processQueue();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    clearQueue();
    release();
    await run;

    expect(readQueue()).toEqual([]);
  });
});

describe("recuperación tras el cierre de la pestaña", () => {
  it("un item huérfano en syncing vuelve a pending y se envía", async () => {
    writeQueue([
      makeItem("a", {
        status: "syncing",
        syncingSince: new Date(Date.now() - STALE_SYNC_MS - 5000).toISOString(),
      }),
    ]);

    expect(recoverStaleItems()).toBe(1);
    expect(readQueue()[0].status).toBe("pending");

    await processQueue();
    expect(readQueue()[0].status).toBe("synced");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("un item que empezó a sincronizarse hace poco no se toca", async () => {
    writeQueue([
      makeItem("a", {
        status: "syncing",
        syncingSince: new Date(Date.now() - 1000).toISOString(),
      }),
    ]);

    expect(recoverStaleItems()).toBe(0);
    await processQueue();

    expect(readQueue()[0].status).toBe("syncing");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("un item en syncing sin marca de tiempo se considera huérfano", () => {
    writeQueue([makeItem("a", { status: "syncing" })]);

    expect(recoverStaleItems()).toBe(1);
    expect(readQueue()[0].status).toBe("pending");
  });
});

describe("conflictos: política client-wins", () => {
  it("ante un 409 conserva lo local, completa con lo del servidor y reintenta", async () => {
    const local = makeInspection("a", { summary: "Versión local", status: "ok" });
    const server = {
      ...makeInspection("a", {
        summary: "Versión del servidor",
        status: "attention",
        statusLabel: "Requiere atención",
      }),
      extra: "solo-servidor",
    };
    fetchMock.mockResolvedValueOnce(conflictResponse(server));
    enqueue(local);

    await processQueue();

    const item = readQueue()[0];
    expect(item.status).toBe("pending");
    expect(item.attempts).toBe(1);
    expect(item.payload.summary).toBe("Versión local");
    expect(item.payload.status).toBe("ok");
    expect((item.payload as unknown as Record<string, unknown>).extra).toBe("solo-servidor");

    await processQueue();
    expect(readQueue()[0].status).toBe("synced");
  });

  it("un conflicto que no se resuelve termina en conflict y deja de reintentar", async () => {
    fetchMock.mockResolvedValue(conflictResponse(makeInspection("a", { summary: "otro" })));
    enqueue(makeInspection("a"));

    for (let i = 0; i < MAX_ATTEMPTS + 2; i += 1) {
      await processQueue();
    }

    expect(readQueue()[0].status).toBe("conflict");
    expect(readQueue()[0].attempts).toBe(MAX_ATTEMPTS);
    expect(fetchMock).toHaveBeenCalledTimes(MAX_ATTEMPTS);
  });

  it("resolveConflict es una función pura: gana lo local y no muta sus entradas", () => {
    const local = makeInspection("a", { summary: "local" });
    const server = makeInspection("a", { summary: "servidor", status: "attention" });
    const localCopy = JSON.parse(JSON.stringify(local));
    const serverCopy = JSON.parse(JSON.stringify(server));

    const resolved = resolveConflict(local, server);

    expect(resolved.summary).toBe("local");
    expect(resolved).not.toBe(local);
    expect(local).toEqual(localCopy);
    expect(server).toEqual(serverCopy);
  });
});

describe("observabilidad y reconexión", () => {
  it("getQueueStats cuenta los items por estado", async () => {
    fetchMock.mockRejectedValueOnce(new Error("x"));
    enqueue(makeInspection("a"));
    enqueue(makeInspection("b"));
    enqueue(makeInspection("c"));

    await processQueue();

    expect(getQueueStats()).toEqual({
      pending: 0,
      syncing: 0,
      synced: 2,
      failed: 1,
      conflict: 0,
      total: 3,
    });
  });

  it("startAutoSync sincroniza al evento online y se puede detener", async () => {
    enqueue(makeInspection("a"));
    const stop = startAutoSync();

    window.dispatchEvent(new Event("online"));
    await processQueue(); // espera la corrida que disparó el evento
    expect(fetchMock).toHaveBeenCalledTimes(1);

    stop();
    enqueue(makeInspection("b"));
    window.dispatchEvent(new Event("online"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(readQueue().find((item) => item.id === "b")?.status).toBe("pending");
  });
});
