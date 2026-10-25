import { inspections as seed } from "../data/inspections";
import type { Inspection } from "../data/inspections";

/**
 * "Base de datos" del servidor para la Semana 8: un arreglo en memoria
 * (datos sintéticos). Sirve para demostrar la sincronización sin depender
 * de servicios externos. Se reinicia al reiniciar el servidor.
 *
 * Se guarda en globalThis para que el modo desarrollo (que recarga módulos)
 * no pierda lo ya guardado.
 */
const globalStore = globalThis as unknown as { __pwaInspections?: Inspection[] };

function store(): Inspection[] {
  if (!globalStore.__pwaInspections) {
    globalStore.__pwaInspections = seed.map((item) => ({ ...item }));
  }
  return globalStore.__pwaInspections;
}

export function listInspections(): Inspection[] {
  return store().map((item) => ({ ...item }));
}

export type SaveResult = { created: boolean; inspection: Inspection };

/**
 * Guarda una inspección de forma IDEMPOTENTE: si el id ya existe NO crea otra,
 * devuelve la que ya estaba. Así, reintentar el mismo envío (por ejemplo porque
 * la respuesta se perdió) no genera duplicados.
 */
export function saveInspection(inspection: Inspection): SaveResult {
  const current = store();
  const existing = current.find((item) => item.id === inspection.id);
  if (existing) {
    return { created: false, inspection: { ...existing } };
  }
  current.push({ ...inspection });
  return { created: true, inspection: { ...inspection } };
}

/** Solo para pruebas: vuelve al estado inicial con los datos sintéticos. */
export function resetInspections(): void {
  globalStore.__pwaInspections = seed.map((item) => ({ ...item }));
}
