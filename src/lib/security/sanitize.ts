/**
 * Sanitización de entradas y lectura segura de cuerpos JSON (Semana 9).
 *
 * Principio: no confiar en nada que venga del cliente. Se limpia el texto
 * antes de validarlo/guardarlo y se acota el tamaño del cuerpo antes de
 * interpretarlo. La salida a HTML la sigue escapando React; aquí no se
 * escapa HTML (doble escape corrompería datos), solo se elimina lo que
 * nunca debería llegar: caracteres de control, marcas de dirección de
 * texto y etiquetas HTML completas.
 */

// Caracteres de control (salvo \t, \n, \r que se tratan aparte) y DEL.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
// Cero-ancho, marcas bidireccionales y BOM: sirven para disfrazar texto.
const INVISIBLE_CHARS = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;
// Etiquetas HTML completas o comentarios.
const HTML_TAGS = /<\/?[A-Za-z!][^>]*>/g;

/** Claves que, en un objeto JSON, abren la puerta a contaminar prototipos. */
const FORBIDDEN_KEYS = ["__proto__", "constructor", "prototype"];
const MAX_JSON_DEPTH = 8;

/**
 * Limpia un texto de usuario:
 *  - convierte a texto (null/undefined/objetos dan cadena vacía);
 *  - normaliza Unicode (NFC) para que "é" siempre sea el mismo valor;
 *  - quita caracteres de control, invisibles y etiquetas HTML;
 *  - colapsa espacios y saltos de línea en un solo espacio;
 *  - recorta y limita a `maxLen` caracteres (por carácter, no parte emojis).
 */
export function sanitizeText(texto: unknown, maxLen: number): string {
  if (typeof texto !== "string") {
    return "";
  }
  const limit = Number.isFinite(maxLen) && maxLen > 0 ? Math.floor(maxLen) : 0;
  if (limit === 0) {
    return "";
  }

  // Se corta ANTES de procesar si es absurdamente largo: evita trabajo inútil.
  const bounded = texto.length > limit * 8 + 64 ? texto.slice(0, limit * 8 + 64) : texto;

  let clean = bounded.normalize("NFC");
  clean = clean.replace(CONTROL_CHARS, "").replace(INVISIBLE_CHARS, "");
  // Se repite por si quitar una etiqueta deja otra armada ("<<b>script>").
  let previous = "";
  while (previous !== clean) {
    previous = clean;
    clean = clean.replace(HTML_TAGS, "");
  }
  clean = clean.replace(/\s+/g, " ").trim();

  const chars = Array.from(clean);
  return chars.length > limit ? chars.slice(0, limit).join("").trim() : clean;
}

export type ParseJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; status: 400 | 413 | 422; error: string };

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function exceedsDepth(value: unknown, depth: number): boolean {
  if (depth > MAX_JSON_DEPTH) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some((item) => exceedsDepth(item, depth + 1));
  }
  if (typeof value === "object" && value !== null) {
    return Object.keys(value).some((key) =>
      exceedsDepth((value as Record<string, unknown>)[key], depth + 1)
    );
  }
  return false;
}

/**
 * Interpreta un cuerpo JSON con límites:
 *  - 413 si pesa más de `maxBytes` (se mide en bytes UTF-8, no en caracteres);
 *  - 400 si no es JSON válido o está vacío;
 *  - 422 si está demasiado anidado.
 * Descarta las claves que permiten contaminar prototipos.
 */
export function parseJsonBody(raw: unknown, maxBytes: number): ParseJsonResult {
  if (typeof raw !== "string" || raw.trim() === "") {
    return { ok: false, status: 400, error: "El cuerpo debe ser JSON válido." };
  }
  const limit = Number.isFinite(maxBytes) && maxBytes > 0 ? maxBytes : 0;
  if (byteLength(raw) > limit) {
    return { ok: false, status: 413, error: "El cuerpo excede el tamaño permitido." };
  }

  let value: unknown;
  try {
    value = JSON.parse(raw, (key, current) =>
      FORBIDDEN_KEYS.indexOf(key) !== -1 ? undefined : current
    );
  } catch {
    return { ok: false, status: 400, error: "El cuerpo debe ser JSON válido." };
  }

  if (exceedsDepth(value, 0)) {
    return { ok: false, status: 422, error: "El cuerpo está demasiado anidado." };
  }
  return { ok: true, value };
}
