/**
 * Resultado compartido por todas las capacidades del dispositivo
 * (geolocalización, notificaciones, cámara).
 *
 * Las funciones nunca lanzan error: devuelven siempre uno de estos dos casos.
 */

/** Motivo por el que una capacidad no pudo usarse. */
export type CapabilityFailureReason =
  | "unsupported" // el navegador no tiene la API
  | "denied" // la persona negó el permiso
  | "unavailable" // hay API y permiso, pero no hay dato (sin señal, sin dispositivo)
  | "timeout" // se agotó el tiempo de espera
  | "error"; // cualquier otro fallo inesperado

export type CapabilitySuccess<T> = { ok: true; value: T };

export type CapabilityFailure = {
  ok: false;
  reason: CapabilityFailureReason;
  /** Mensaje en español, listo para mostrarse dentro de la app. */
  message: string;
};

export type CapabilityResult<T> = CapabilitySuccess<T> | CapabilityFailure;

export function success<T>(value: T): CapabilitySuccess<T> {
  return { ok: true, value };
}

export function failure(
  reason: CapabilityFailureReason,
  message: string,
): CapabilityFailure {
  return { ok: false, reason, message };
}