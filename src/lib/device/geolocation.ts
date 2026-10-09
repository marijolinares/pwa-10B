import { failure, success } from "../capabilities/result";
import type { CapabilityResult } from "../capabilities/result";

/** Coordenadas leídas del dispositivo. Solo viven en memoria: no se guardan ni se envían. */
export type Coordinates = {
  latitude: number;
  longitude: number;
  /** Precisión aproximada en metros. */
  accuracy: number;
};

export type Laboratory = {
  id: string;
  name: string;
};

/**
 * Alternativa cuando no hay ubicación: la persona elige el laboratorio a mano.
 * Los nombres coinciden con los de las inspecciones sintéticas.
 */
export const LABORATORIES: readonly Laboratory[] = [
  { id: "redes", name: "Laboratorio de Redes" },
  { id: "electronica", name: "Laboratorio de Electrónica" },
  { id: "software", name: "Laboratorio de Software" },
];

/** Tiempo máximo de espera (ms) para obtener la posición. */
export const GEOLOCATION_TIMEOUT_MS = 8000;

/** Margen extra para el temporizador propio, por si el navegador nunca responde. */
const SAFETY_MARGIN_MS = 1000;

/**
 * Pide la posición actual. Debe llamarse SOLO desde una acción de la persona
 * (por ejemplo, el clic de un botón): el permiso nunca se pide al importar el módulo.
 *
 * Nunca lanza error: devuelve el motivo si no hay soporte, se niega el permiso,
 * no hay señal o se agota el tiempo.
 */
export function requestPosition(
  timeoutMs: number = GEOLOCATION_TIMEOUT_MS,
): Promise<CapabilityResult<Coordinates>> {
  return new Promise((resolve) => {
    let settled = false;
    let safetyTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = (result: CapabilityResult<Coordinates>) => {
      if (settled) return;
      settled = true;
      if (safetyTimer !== undefined) clearTimeout(safetyTimer);
      resolve(result);
    };

    try {
      const geo =
        typeof navigator !== "undefined" ? navigator.geolocation : undefined;

      if (!geo || typeof geo.getCurrentPosition !== "function") {
        finish(
          failure(
            "unsupported",
            "Este navegador no permite obtener la ubicación. Elige el laboratorio manualmente.",
          ),
        );
        return;
      }

      safetyTimer = setTimeout(() => {
        finish(
          failure(
            "timeout",
            "Se agotó el tiempo para obtener la ubicación. Elige el laboratorio manualmente.",
          ),
        );
      }, timeoutMs + SAFETY_MARGIN_MS);

      geo.getCurrentPosition(
        (position) => {
          finish(
            success({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            }),
          );
        },
        (error) => {
          // 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
          if (error?.code === 1) {
            finish(
              failure(
                "denied",
                "No diste permiso de ubicación. Elige el laboratorio manualmente.",
              ),
            );
          } else if (error?.code === 2) {
            finish(
              failure(
                "unavailable",
                "No se pudo determinar la ubicación. Elige el laboratorio manualmente.",
              ),
            );
          } else if (error?.code === 3) {
            finish(
              failure(
                "timeout",
                "Se agotó el tiempo para obtener la ubicación. Elige el laboratorio manualmente.",
              ),
            );
          } else {
            finish(
              failure(
                "error",
                "Ocurrió un error al obtener la ubicación. Elige el laboratorio manualmente.",
              ),
            );
          }
        },
        { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 0 },
      );
    } catch {
      finish(
        failure(
          "error",
          "Ocurrió un error al obtener la ubicación. Elige el laboratorio manualmente.",
        ),
      );
    }
  });
}

/**
 * Alternativa manual: busca un laboratorio por id.
 * No requiere permisos ni soporte del navegador.
 */
export function selectLaboratory(id: string): CapabilityResult<Laboratory> {
  const lab = LABORATORIES.find((item) => item.id === id);
  if (!lab) {
    return failure("unavailable", "Ese laboratorio no está en la lista.");
  }
  return success(lab);
}