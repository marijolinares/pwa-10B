/**
 * Privacidad y retención de datos (Semana 9).
 *
 *  - redactForLog: deja pasar a los logs solo lo que no identifica a nadie.
 *  - isExpired: regla de retención por antigüedad (fail-closed).
 *
 * Qué datos hay y por cuánto tiempo se guardan: docs/privacy-data-inventory.md.
 */
import { SENSITIVE_NAME_PATTERN, findSecrets } from "./secrets";

export const REDACTED = "[REDACTADO]";
const MAX_REDACT_DEPTH = 6;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Campos que identifican a una persona o su ubicación exacta. */
const PERSONAL_NAME_PATTERN =
  /^(?:inspector|nombre|name|email|correo|telefono|teléfono|phone|celular|direccion|dirección|address|lat|lng|lon|latitude|longitude|coords?|curp|rfc)$/i;

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// 10 a 13 dígitos con separadores opcionales (teléfonos).
const PHONE = /\+?\d(?:[\s().-]?\d){9,12}/g;

function redactString(value: string): string {
  let out = value.replace(EMAIL, REDACTED).replace(PHONE, REDACTED);
  // Si el texto trae una credencial, se enmascara el tramo completo.
  findSecrets(out)
    .slice()
    .reverse()
    .forEach((finding) => {
      const rest = out.slice(finding.index);
      const end = rest.search(/[\s"',;]/);
      const stop = end === -1 ? out.length : finding.index + end;
      out = `${out.slice(0, finding.index)}${REDACTED}${out.slice(stop)}`;
    });
  return out;
}

function redact(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (typeof value === "string") {
    return redactString(value);
  }
  if (value === null || typeof value !== "object") {
    // números, booleanos, undefined: no identifican por sí solos
    return typeof value === "function" || typeof value === "symbol" ? undefined : value;
  }
  if (seen.has(value)) {
    return "[CIRCULAR]";
  }
  if (depth >= MAX_REDACT_DEPTH) {
    return "[PROFUNDO]";
  }
  seen.add(value);

  if (value instanceof Error) {
    // El mensaje puede traer datos del usuario; el stack se omite a propósito.
    return { name: value.name, message: redactString(value.message) };
  }
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1, seen));
  }
  const out: Record<string, unknown> = {};
  Object.keys(value).forEach((key) => {
    const current = (value as Record<string, unknown>)[key];
    if (PERSONAL_NAME_PATTERN.test(key) || SENSITIVE_NAME_PATTERN.test(key)) {
      out[key] = REDACTED;
    } else {
      out[key] = redact(current, depth + 1, seen);
    }
  });
  return out;
}

/**
 * Devuelve una COPIA segura para registrar en logs. No modifica el original.
 * Enmascara: campos personales (inspector, correo, teléfono, coordenadas),
 * campos con nombre de credencial, y correos/teléfonos/credenciales dentro
 * de cualquier texto. Maneja ciclos y limita la profundidad.
 */
export function redactForLog(valor: unknown): unknown {
  return redact(valor, 0, new WeakSet<object>());
}

export type RetainedItem = {
  /** Marca de tiempo ISO o milisegundos (p. ej. QueueItem.createdAt). */
  createdAt?: string | number;
  /** Fecha AAAA-MM-DD (p. ej. Inspection.date) si no hay createdAt. */
  date?: string;
};

function toMillis(item: RetainedItem): number {
  const source = item.createdAt !== undefined ? item.createdAt : item.date;
  if (typeof source === "number") {
    return source;
  }
  if (typeof source === "string") {
    return Date.parse(source);
  }
  return NaN;
}

/**
 * ¿Ya pasó el periodo de retención? Es vencido cuando la antigüedad es
 * ESTRICTAMENTE mayor que `ttlDias` días (justo en el límite todavía vale).
 * Fail-closed: si la fecha, el reloj o el TTL no son válidos, se considera
 * vencido, para no conservar datos "por si acaso". Una fecha futura no vence.
 */
export function isExpired(item: RetainedItem, ahoraMs: number, ttlDias: number): boolean {
  if (typeof item !== "object" || item === null) {
    return true;
  }
  const created = toMillis(item);
  if (!Number.isFinite(created) || !Number.isFinite(ahoraMs)) {
    return true;
  }
  if (!Number.isFinite(ttlDias) || ttlDias < 0) {
    return true;
  }
  return ahoraMs - created > ttlDias * MS_PER_DAY;
}
