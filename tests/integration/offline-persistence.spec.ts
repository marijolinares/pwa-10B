import { describe, it, expect, beforeEach } from "vitest";
import { enqueue, getQueueStats } from "../../src/lib/sync/queue";
import {
  clearQueue,
  readQueue,
  QUEUE_STORAGE_KEY,
} from "../../src/lib/storage/schema";
import { validateInspectionInput } from "../../src/lib/validation/inspection";
import {
  FIXTURE_VALID_OK,
  FIXTURE_VALID_ATTENTION,
  FIXTURE_INVALID_CASES,
} from "../fixtures/synthetic-inspections";

describe("Integración: Persistencia offline y recarga sin conexión (Semana 8)", () => {
  beforeEach(() => {
    clearQueue();
  });

  it("guardar sin conexión persiste la inspección en localStorage con clave versionada", () => {
    // 1. Simulación de captura offline: se encola una inspección sintética
    enqueue(FIXTURE_VALID_OK);

    // 2. Verificación directa en localStorage físico (persistencia en cliente)
    const rawStorage = localStorage.getItem(QUEUE_STORAGE_KEY);
    expect(rawStorage).not.toBeNull();
    expect(typeof rawStorage).toBe("string");

    const parsed = JSON.parse(rawStorage as string);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe(FIXTURE_VALID_OK.id);
    expect(parsed[0].status).toBe("pending");
    expect(parsed[0].attempts).toBe(0);
    expect(parsed[0].payload.location).toBe("Laboratorio de Redes");
    expect(parsed[0].payload.inspector).toBe("Germán Yair Martínez");

    // 3. Verificación a través de la capa de lectura de cola
    const queue = readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].payload).toEqual(FIXTURE_VALID_OK);

    const stats = getQueueStats();
    expect(stats.total).toBe(1);
    expect(stats.pending).toBe(1);
    expect(stats.synced).toBe(0);
  });

  it("recarga sin red: simula reinicio de pestaña y comprueba que no hay pérdida de datos", () => {
    // 1. Encola dos capturas mientras el dispositivo está sin red
    enqueue(FIXTURE_VALID_OK);
    enqueue(FIXTURE_VALID_ATTENTION);

    // 2. Simula el reinicio de la aplicación/pestaña:
    // Se vuelven a consultar los datos directamente desde localStorage
    const queueAfterReload = readQueue();

    expect(queueAfterReload).toHaveLength(2);
    expect(queueAfterReload[0].id).toBe(FIXTURE_VALID_OK.id);
    expect(queueAfterReload[0].payload.summary).toBe(FIXTURE_VALID_OK.summary);
    expect(queueAfterReload[0].status).toBe("pending");

    expect(queueAfterReload[1].id).toBe(FIXTURE_VALID_ATTENTION.id);
    expect(queueAfterReload[1].payload.findings).toBe(3);
    expect(queueAfterReload[1].status).toBe("pending");

    const stats = getQueueStats();
    expect(stats.total).toBe(2);
    expect(stats.pending).toBe(2);
  });

  it("integración validación + persistencia: captura inválida no entra a la cola", () => {
    // 1. Validar un caso inválido (resumen demasiado corto)
    const validationResult = validateInspectionInput(FIXTURE_INVALID_CASES.summaryTooShort);
    expect(validationResult.ok).toBe(false);

    // 2. Si la validación falla, el flujo de negocio no llama a enqueue
    if (validationResult.ok) {
      enqueue(validationResult.value);
    }

    // 3. Comprobar que localStorage no tiene ningún dato almacenado
    expect(localStorage.getItem(QUEUE_STORAGE_KEY)).toBeNull();
    expect(readQueue()).toHaveLength(0);
    expect(getQueueStats().total).toBe(0);
  });

  it("integración validación + persistencia: captura válida se encola con datos normalizados", () => {
    // 1. Validar una entrada con espacios y hallazgos en string
    const inputConEspacios = {
      id: "insp-w08-integ-01",
      location: "Laboratorio de Redes",
      date: "2026-10-25",
      inspector: "  Germán Yair Martínez  ",
      findings: "0",
      summary: "Inspección integrada con datos trimeados y validados.",
    };

    const validationResult = validateInspectionInput(inputConEspacios);
    expect(validationResult.ok).toBe(true);

    if (validationResult.ok) {
      enqueue(validationResult.value);
    }

    const queue = readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].payload.inspector).toBe("Germán Yair Martínez");
    expect(queue[0].payload.findings).toBe(0);
    expect(queue[0].payload.status).toBe("ok");
    expect(queue[0].payload.statusLabel).toBe("Sin incidencias");
  });

  it("resiliencia del esquema: filtra entradas corruptas sin romper la lectura", () => {
    // Simula una corrupción en localStorage (mezcla de item válido y objeto basura)
    const corruptedData = [
      { id: "valido-1", payload: FIXTURE_VALID_OK, status: "pending", attempts: 0, createdAt: "2026-10-25" },
      { id: 12345, payload: null }, // item corrupto
      "cadena-arbitraria",           // item corrupto
    ];
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(corruptedData));

    const sanitizedQueue = readQueue();
    expect(sanitizedQueue).toHaveLength(1);
    expect(sanitizedQueue[0].id).toBe("valido-1");
  });
});
