   import { beforeEach, describe, expect, it } from "vitest";
import {
  readQueue,
  writeQueue,
  clearQueue,
  QUEUE_STORAGE_KEY,
  type QueueItem,
} from "../src/lib/storage/schema";

const item: QueueItem = {
  id: "a1",
  payload: {
    id: "a1",
    location: "Laboratorio de Redes",
    date: "2026-10-03",
    inspector: "Técnica A",
    status: "ok",
    statusLabel: "Sin incidencias",
    findings: 0,
    summary: "Inspección de prueba",
  },
  status: "pending",
  attempts: 0,
  createdAt: "2026-10-03T10:00:00.000Z",
};

describe("storage/schema", () => {
  beforeEach(() => localStorage.clear());

  it("devuelve [] si no hay nada guardado", () => {
    expect(readQueue()).toEqual([]);
  });

  it("escribe y lee la cola", () => {
    writeQueue([item]);
    expect(readQueue()).toEqual([item]);
  });

  it("clearQueue vacía la cola", () => {
    writeQueue([item]);
    clearQueue();
    expect(readQueue()).toEqual([]);
  });

  it("JSON corrupto no rompe la app", () => {
    localStorage.setItem(QUEUE_STORAGE_KEY, "{mal");
    expect(readQueue()).toEqual([]);
  });

  it("descarta items inválidos", () => {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify([item, { id: 1 }]));
    expect(readQueue()).toEqual([item]);
  });
});