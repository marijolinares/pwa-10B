import { NextResponse } from "next/server";
import { listInspections, saveInspection } from "../../../lib/server/inspection-store";
import { validateInspectionInput } from "../../../lib/validation/inspection";

// Los datos cambian con cada POST: no se pueden pre-renderizar en el build.
export const dynamic = "force-dynamic";

/**
 * GET: listado para el CSR (Semana 4) — ahora incluye lo sincronizado (Semana 8).
 */
export async function GET() {
  return NextResponse.json(listInspections());
}

/**
 * POST: recibe una inspección desde la cola de sincronización (Semana 5).
 *  - 400 si el cuerpo no es JSON.
 *  - 422 si no pasa la validación (con el detalle por campo).
 *  - 201 si se creó; 200 si ya existía (idempotente: el reintento no duplica).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo debe ser JSON válido." }, { status: 400 });
  }

  const result = validateInspectionInput(body);
  if (!result.ok) {
    return NextResponse.json({ error: "Inspección inválida.", errors: result.errors }, { status: 422 });
  }

  const saved = saveInspection(result.value);
  return NextResponse.json(saved.inspection, { status: saved.created ? 201 : 200 });
}
