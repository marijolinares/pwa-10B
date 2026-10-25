import { CapabilityResult, failure, success } from "../capabilities/result";

/**
 * Solicita permiso y muestra una notificación local de cambio.
 * NO pide permiso al importar, solo al ser llamada desde una acción del usuario.
 */
export async function showSyncNotification(
  title: string,
  options?: NotificationOptions
): Promise<CapabilityResult<boolean>> {
  // Comprobamos si hay soporte en el navegador
  if (typeof window === "undefined" || !("Notification" in window)) {
    return failure("unsupported", "Tu navegador no soporta notificaciones.");
  }

  try {
    let permission = Notification.permission;

    // Pedimos permiso si aún no se ha preguntado
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission === "denied") {
      return failure("denied", "Has denegado el permiso de notificaciones.");
    }

    if (permission === "granted") {
      new Notification(title, options);
      return success(true);
    }

    return failure("error", "No se pudo determinar el estado del permiso.");
  } catch (err) {
    return failure("error", "Ocurrió un error al intentar mostrar la notificación.");
  }
}
