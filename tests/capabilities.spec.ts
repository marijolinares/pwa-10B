import { describe, it, expect, afterEach, vi } from "vitest";
import {
  requestPosition,
  selectLaboratory,
  LABORATORIES,
} from "../src/lib/device/geolocation";
import { showSyncNotification } from "../src/lib/notifications/client";

// ---------------------------------------------------------------------------
// Geolocalización (Irvin)
// Los demás integrantes agregan su bloque AL FINAL de este archivo.
// ---------------------------------------------------------------------------
describe("Geolocalización", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("éxito: devuelve las coordenadas sintéticas", async () => {
    const getCurrentPosition = vi.fn((onOk: PositionCallback) =>
      onOk({
        coords: { latitude: 18.46, longitude: -97.39, accuracy: 25 },
      } as GeolocationPosition),
    );
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });

    const result = await requestPosition();

    expect(result).toEqual({
      ok: true,
      value: { latitude: 18.46, longitude: -97.39, accuracy: 25 },
    });
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it("permiso denegado: devuelve 'denied' con mensaje", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (_ok: PositionCallback, onError: PositionErrorCallback) =>
          onError({ code: 1 } as GeolocationPositionError),
      },
    });

    const result = await requestPosition();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("denied");
      expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it("sin soporte: devuelve 'unsupported' sin lanzar error", async () => {
    vi.stubGlobal("navigator", {});

    const result = await requestPosition();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unsupported");
  });

  it("tiempo agotado: devuelve 'timeout' cuando el navegador lo reporta", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (_ok: PositionCallback, onError: PositionErrorCallback) =>
          onError({ code: 3 } as GeolocationPositionError),
      },
    });

    const result = await requestPosition();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("timeout");
  });

  it("tiempo agotado: el temporizador propio cubre un navegador que nunca responde", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", {
      geolocation: { getCurrentPosition: () => undefined },
    });

    const pending = requestPosition(1000);
    await vi.advanceTimersByTimeAsync(2000);
    const result = await pending;

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("timeout");
  });

  it("posición no disponible: devuelve 'unavailable'", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (_ok: PositionCallback, onError: PositionErrorCallback) =>
          onError({ code: 2 } as GeolocationPositionError),
      },
    });

    const result = await requestPosition();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unavailable");
  });

  it("fallo inesperado: si el navegador lanza error, devuelve 'error'", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: () => {
          throw new Error("fallo simulado");
        },
      },
    });

    const result = await requestPosition();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("error");
  });

  it("no pide permiso al importar: solo al llamar la función", async () => {
    const getCurrentPosition = vi.fn();
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });

    vi.resetModules();
    await import("../src/lib/device/geolocation");

    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("alternativa manual: elige un laboratorio sin permisos", () => {
    vi.stubGlobal("navigator", {});

    const result = selectLaboratory(LABORATORIES[0].id);

    expect(result).toEqual({ ok: true, value: LABORATORIES[0] });
  });

  it("alternativa manual: un laboratorio desconocido devuelve el motivo", () => {
    const result = selectLaboratory("no-existe");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unavailable");
  });
});

// ---------------------------------------------------------------------------
// Notificaciones (Germán)
// ---------------------------------------------------------------------------
describe("Notificaciones", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("éxito: muestra la notificación si el permiso es granted", async () => {
    const NotificationMock = vi.fn();
    Object.defineProperty(NotificationMock, "permission", {
      get: () => "granted",
    });
    vi.stubGlobal("window", { Notification: NotificationMock });
    vi.stubGlobal("Notification", NotificationMock);

    const result = await showSyncNotification("Prueba");

    expect(result).toEqual({ ok: true, value: true });
    expect(NotificationMock).toHaveBeenCalledWith("Prueba", undefined);
  });

  it("éxito: solicita permiso y muestra si la persona acepta", async () => {
    const NotificationMock = vi.fn();
    Object.defineProperty(NotificationMock, "permission", {
      value: "default",
      writable: true,
    });
    NotificationMock.requestPermission = vi.fn().mockResolvedValue("granted");
    
    vi.stubGlobal("window", { Notification: NotificationMock });
    vi.stubGlobal("Notification", NotificationMock);

    const result = await showSyncNotification("Prueba 2");

    expect(NotificationMock.requestPermission).toHaveBeenCalled();
    expect(result).toEqual({ ok: true, value: true });
    expect(NotificationMock).toHaveBeenCalledWith("Prueba 2", undefined);
  });

  it("permiso denegado: devuelve 'denied'", async () => {
    const NotificationMock = vi.fn();
    Object.defineProperty(NotificationMock, "permission", {
      get: () => "denied",
    });
    vi.stubGlobal("window", { Notification: NotificationMock });
    vi.stubGlobal("Notification", NotificationMock);

    const result = await showSyncNotification("Prueba denegado");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("denied");
      expect(result.message).toContain("denegado");
    }
  });

  it("sin soporte: devuelve 'unsupported' sin lanzar error", async () => {
    vi.stubGlobal("window", {}); // window existe pero no tiene Notification
    const result = await showSyncNotification("Prueba sin soporte");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("unsupported");
    }
  });

  it("fallo o error inesperado: devuelve 'error' si requestPermission falla", async () => {
    const NotificationMock = vi.fn();
    Object.defineProperty(NotificationMock, "permission", {
      value: "default",
      writable: true,
    });
    NotificationMock.requestPermission = vi.fn().mockRejectedValue(new Error("Fake Error"));
    vi.stubGlobal("window", { Notification: NotificationMock });
    vi.stubGlobal("Notification", NotificationMock);

    const result = await showSyncNotification("Prueba error");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("error");
    }
  });
});