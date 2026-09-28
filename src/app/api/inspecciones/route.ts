import { NextResponse } from "next/server";
import { inspections } from "../../../lib/data/inspections";

/**
 * Endpoint simple para el listado CSR (Semana 4).
 * Devuelve los datos sintéticos como JSON para que
 * src/app/inspecciones/page.tsx los pida desde el navegador.
 */
export async function GET() {
  return NextResponse.json(inspections);
}