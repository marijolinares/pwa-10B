import type { Inspection } from "../data/inspections";

/**
 * Validación de una inspección capturada (Semana 8).
 *
 * La usan DOS lugares con las mismas reglas:
 *  - el formulario de captura (para avisar antes de guardar), y
 *  - el endpoint POST /api/inspecciones (el servidor nunca confía en el cliente).
 *
 * Es una función pura: no toca la red, el almacenamiento ni el reloj.
 */

export type InspectionField =
  | "id"
  | "location"
  | "inspector"
  | "date"
  | "findings"
  | "summary";

export type ValidationErrors = Partial<Record<InspectionField, string>>;

export type ValidationResult =
  | { ok: true; value: Inspection }
  | { ok: false; errors: ValidationErrors };

export const MAX_INSPECTOR_LENGTH = 60;
export const MIN_SUMMARY_LENGTH = 5;
export const MAX_SUMMARY_LENGTH = 500;
export const MAX_FINDINGS = 99;

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** true si "YYYY-MM-DD" es una fecha real (rechaza 2026-02-31, por ejemplo). */
export function isValidIsoDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Acepta 2 o "2"; rechaza 1.5, "", "abc", -1. Devuelve null si no es válido. */
function asWholeNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value : null;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  return null;
}

/**
 * Valida y normaliza una captura. Si todo está bien devuelve la Inspection
 * lista para encolar; si no, un mensaje por cada campo inválido.
 * El estado (ok / attention) NO se pide: se deduce de los hallazgos.
 */
export function validateInspectionInput(input: unknown): ValidationResult {
  const raw = (typeof input === "object" && input !== null ? input : {}) as Record<
    string,
    unknown
  >;
  const errors: ValidationErrors = {};

  const id = asText(raw.id);
  if (!ID_PATTERN.test(id)) {
    errors.id = "El identificador es obligatorio (letras, números, - o _; máximo 64).";
  }

  const location = asText(raw.location);
  if (!location) {
    errors.location = "Elige el laboratorio.";
  }

  const inspector = asText(raw.inspector);
  if (!inspector) {
    errors.inspector = "Escribe quién realizó la inspección.";
  } else if (inspector.length > MAX_INSPECTOR_LENGTH) {
    errors.inspector = `El nombre no puede pasar de ${MAX_INSPECTOR_LENGTH} caracteres.`;
  }

  const date = asText(raw.date);
  if (!isValidIsoDate(date)) {
    errors.date = "Escribe una fecha válida (AAAA-MM-DD).";
  }

  const findings = asWholeNumber(raw.findings);
  if (findings === null || findings > MAX_FINDINGS) {
    errors.findings = `Los hallazgos deben ser un número entero de 0 a ${MAX_FINDINGS}.`;
  }

  const summary = asText(raw.summary);
  if (summary.length < MIN_SUMMARY_LENGTH) {
    errors.summary = `El resumen necesita al menos ${MIN_SUMMARY_LENGTH} caracteres.`;
  } else if (summary.length > MAX_SUMMARY_LENGTH) {
    errors.summary = `El resumen no puede pasar de ${MAX_SUMMARY_LENGTH} caracteres.`;
  }

  if (Object.keys(errors).length > 0 || findings === null) {
    return { ok: false, errors };
  }

  const needsAttention = findings > 0;
  return {
    ok: true,
    value: {
      id,
      location,
      date,
      inspector,
      status: needsAttention ? "attention" : "ok",
      statusLabel: needsAttention ? "Requiere atención" : "Sin incidencias",
      findings,
      summary,
    },
  };
}
