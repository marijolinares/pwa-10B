import type { Inspection } from "../../src/lib/data/inspections";
import type { QueueItem } from "../../src/lib/storage/schema";

/**
 * Fixtures sintéticos para pruebas de la Semana 8.
 * No contienen PII, tokens ni secretos.
 * Representan datos de prueba para validación, persistencia offline y deduplicación.
 */

export const FIXTURE_VALID_OK: Inspection = {
  id: "insp-w08-syn-001",
  location: "Laboratorio de Redes",
  date: "2026-10-25",
  inspector: "Germán Yair Martínez",
  status: "ok",
  statusLabel: "Sin incidencias",
  findings: 0,
  summary: "Revisión rutinaria de cableado y switches. Todo en orden.",
};

export const FIXTURE_VALID_ATTENTION: Inspection = {
  id: "insp-w08-syn-002",
  location: "Laboratorio de Cómputo B",
  date: "2026-10-25",
  inspector: "Germán Yair Martínez",
  status: "attention",
  statusLabel: "Requiere atención",
  findings: 3,
  summary: "Fallo de ventilación en 3 equipos de cómputo.",
};

export const FIXTURE_DUPLICATE_OPERATION: Inspection = {
  id: "insp-w08-dedup-999",
  location: "Laboratorio de Electrónica",
  date: "2026-10-25",
  inspector: "Germán Yair Martínez",
  status: "ok",
  statusLabel: "Sin incidencias",
  findings: 0,
  summary: "Inspección para verificación de idempotencia y reintentos.",
};

export const FIXTURE_INVALID_CASES = {
  missingId: {
    location: "Laboratorio de Redes",
    date: "2026-10-25",
    inspector: "Germán Yair Martínez",
    findings: 0,
    summary: "Falta el identificador único obligatorio.",
  },
  invalidIdChars: {
    id: "insp invalid with spaces!",
    location: "Laboratorio de Redes",
    date: "2026-10-25",
    inspector: "Germán Yair Martínez",
    findings: 0,
    summary: "Identificador con caracteres no permitidos.",
  },
  invalidDateCalendar: {
    id: "insp-inv-date-1",
    location: "Laboratorio de Redes",
    date: "2026-02-31",
    inspector: "Germán Yair Martínez",
    findings: 0,
    summary: "Fecha inexistente en calendario gregoriano.",
  },
  invalidDateFormat: {
    id: "insp-inv-date-2",
    location: "Laboratorio de Redes",
    date: "25-10-2026",
    inspector: "Germán Yair Martínez",
    findings: 0,
    summary: "Formato no ISO para la fecha.",
  },
  inspectorTooLong: {
    id: "insp-inv-inspector",
    location: "Laboratorio de Redes",
    date: "2026-10-25",
    inspector: "A".repeat(61),
    findings: 0,
    summary: "Nombre de inspector que sobrepasa el límite permitido.",
  },
  emptyLocation: {
    id: "insp-inv-location",
    location: "   ",
    date: "2026-10-25",
    inspector: "Germán Yair Martínez",
    findings: 0,
    summary: "Ubicación vacía o con solo espacios.",
  },
  negativeFindings: {
    id: "insp-inv-findings-neg",
    location: "Laboratorio de Redes",
    date: "2026-10-25",
    inspector: "Germán Yair Martínez",
    findings: -1,
    summary: "Hallazgos con número negativo.",
  },
  decimalFindings: {
    id: "insp-inv-findings-dec",
    location: "Laboratorio de Redes",
    date: "2026-10-25",
    inspector: "Germán Yair Martínez",
    findings: 2.5,
    summary: "Hallazgos no enteros.",
  },
  findingsAboveMax: {
    id: "insp-inv-findings-max",
    location: "Laboratorio de Redes",
    date: "2026-10-25",
    inspector: "Germán Yair Martínez",
    findings: 100,
    summary: "Hallazgos superiores a 99.",
  },
  summaryTooShort: {
    id: "insp-inv-sum-short",
    location: "Laboratorio de Redes",
    date: "2026-10-25",
    inspector: "Germán Yair Martínez",
    findings: 0,
    summary: "1234",
  },
  summaryTooLong: {
    id: "insp-inv-sum-long",
    location: "Laboratorio de Redes",
    date: "2026-10-25",
    inspector: "Germán Yair Martínez",
    findings: 0,
    summary: "S".repeat(501),
  },
};

export function createSyntheticQueueItem(
  inspection: Inspection,
  overrides: Partial<QueueItem> = {}
): QueueItem {
  return {
    id: inspection.id,
    payload: { ...inspection },
    status: "pending",
    attempts: 0,
    createdAt: new Date("2026-10-25T10:00:00Z").toISOString(),
    ...overrides,
  };
}
