import type { Inspection } from "@/lib/data/inspections";

/**
 * Resuelve un conflicto entre una inspección modificada localmente
 * y la versión actual en el servidor.
 *
 * Política: "Client Wins" (El cliente gana)
 * Para simplificar este sistema de captura en terreno, los datos
 * tomados en sitio por el inspector tienen prioridad sobre el servidor.
 */
export function resolveConflict(local: Inspection, server: Inspection): Inspection {
  return {
    ...server,
    ...local,
  };
}
