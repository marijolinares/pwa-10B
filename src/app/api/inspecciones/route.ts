import { NextResponse } from "next/server";
import { listInspections, saveInspection } from "../../../lib/server/inspection-store";
import { validateInspectionInput } from "../../../lib/validation/inspection";
import { parseJsonBody, sanitizeText } from "../../../lib/security/sanitize";
import { findSecrets } from "../../../lib/security/secrets";
import { redactForLog } from "../../../lib/security/privacy";

// Los datos cambian con cada POST: no se pueden pre-renderizar en el build.
export const dynamic = "force-dynamic";

/** Tamaño máximo del cuerpo (Semana 9): una inspección real pesa < 2 KB. */
const MAX_BODY_BYTES = 16 * 1024;

/**
 * Topes de seguridad ANTES de validar. Son más generosos que los de la
 * validación a propósito: así un texto demasiado largo sigue fallando con
 * su mensaje de campo en lugar de recortarse en silencio.
 */
const SANITIZE_CAPS: Record<string, number> = {
  id: 80,
  location: 120,
  inspector: 120,
  date: 20,
  summary: 1000,
};

// Estas respuestas llevan nombres de personas: no deben quedar en cachés.
const BASE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function respond(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: BASE_HEADERS });
}

/** Registra el rechazo sin cuerpo ni datos personales (solo el motivo). */
function logRejection(reason: string, status: number) {
  console.warn("[api/inspecciones] rechazo", redactForLog({ reason, status }));
}

/**
 * GET: listado para el CSR (Semana 4) - ahora incluye lo sincronizado (Semana 8).
 */
export async function GET() {
  return respond(listInspections());
}

/**
 * POST: recibe una inspección desde la cola de sincronización (Semana 5).
 *  - 415 si no es application/json.
 *  - 413 si el cuerpo pasa de MAX_BODY_BYTES.
 *  - 400 si el cuerpo no es JSON.
 *  - 422 si no pasa la validación (con el detalle por campo) o trae credenciales.
 *  - 201 si se creó; 200 si ya existía (idempotente: el reintento no duplica).
 */
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json\s*(;|$)/i.test(contentType)) {
    logRejection("content-type", 415);
    return respond({ error: "Content-Type debe ser application/json." }, 415);
  }

  // Corte barato: si el cliente declara un tamaño excesivo, ni se lee el cuerpo.
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    logRejection("body-too-large", 413);
    return respond({ error: "El cuerpo excede el tamaño permitido." }, 413);
  }

  const parsed = parseJsonBody(await request.text(), MAX_BODY_BYTES);
  if (!parsed.ok) {
    logRejection("body-parse", parsed.status);
    return respond({ error: parsed.error }, parsed.status);
  }

  const raw = (
    typeof parsed.value === "object" && parsed.value !== null && !Array.isArray(parsed.value)
      ? parsed.value
      : {}
  ) as Record<string, unknown>;

  // Se copia solo lo conocido: campos extra del cliente nunca llegan al store.
  const candidate: Record<string, unknown> = { findings: raw.findings };
  const secretFields: Record<string, string> = {};
  Object.keys(SANITIZE_CAPS).forEach((field) => {
    if (typeof raw[field] === "string" && findSecrets(raw[field]).length > 0) {
      secretFields[field] = "No incluyas credenciales ni claves en este campo.";
    }
    candidate[field] = sanitizeText(raw[field], SANITIZE_CAPS[field]);
  });
  if (Object.keys(secretFields).length > 0) {
    logRejection("credentials-in-body", 422);
    return respond({ error: "Inspección inválida.", errors: secretFields }, 422);
  }

  const result = validateInspectionInput(candidate);
  if (!result.ok) {
    logRejection("validation", 422);
    return respond({ error: "Inspección inválida.", errors: result.errors }, 422);
  }

  const saved = saveInspection(result.value);
  return respond(saved.inspection, saved.created ? 201 : 200);
}
