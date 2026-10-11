import { describe, it, expect, afterEach, vi } from "vitest";
import {
  requestPosition,
  selectLaboratory,
  LABORATORIES,
} from "../src/lib/device/geolocation";
import { showSyncNotification } from "../src/lib/notifications/client";

import {
  captureEvidence,
  validateEvidenceFile,
  isCameraCaptureSupported,
  MAX_EVIDENCE_BYTES,
} from "../src/lib/device/camera";


// ---------------------------------------------------------------------------
// Cámara (Majo)
// ---------------------------------------------------------------------------
describe("Cámara", () => {
  const photo = () =>
    new File(["foto-sintetica"], "evidencia.jpg", { type: "image/jpeg" });

  /**
   * Simula el selector del navegador: al llamar a click(), la persona elige
   * un archivo (o cancela). Devuelve los inputs que creó la función.
   */
  function simulatePicker(action: { file?: File; cancel?: boolean }) {
    const created: HTMLInputElement[] = [];
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (
      this: HTMLInputElement,
    ) {
      created.push(this);
      if (action.cancel) {
        this.dispatchEvent(new Event("cancel"));
        return;
      }
      Object.defineProperty(this, "files", {
        value: action.file ? [action.file] : [],
        configurable: true,
      });
      this.dispatchEvent(new Event("change"));
    });
    return created;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("éxito: devuelve la foto con solo el archivo, su tipo y su tamaño", async () => {
    const file = photo();
    simulatePicker({ file });

    const result = await captureEvidence();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.value).sort()).toEqual(["file", "size", "type"]);
      expect(result.value.file).toBe(file);
      expect(result.value.type).toBe("image/jpeg");
      expect(result.value.size).toBe(file.size);
    }
  });

  it("pide lo mínimo: solo imágenes, cámara trasera y no deja el input en la página", async () => {
    const created = simulatePicker({ file: photo() });

    await captureEvidence();

    expect(created).toHaveLength(1);
    expect(created[0].getAttribute("type")).toBe("file");
    expect(created[0].getAttribute("accept")).toBe("image/*");
    expect(created[0].getAttribute("capture")).toBe("environment");
    expect(document.querySelector("input[type=file]")).toBeNull();
  });

  it("cancelar: devuelve 'unavailable' y deja guardar la inspección sin evidencia", async () => {
    simulatePicker({ cancel: true });

    const result = await captureEvidence();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("unavailable");
      expect(result.message).toContain("sin evidencia");
    }
    expect(document.querySelector("input[type=file]")).toBeNull();
  });

  it("sin soporte: devuelve 'unsupported' sin lanzar error", async () => {
    vi.stubGlobal("document", undefined);

    expect(isCameraCaptureSupported()).toBe(false);
    const result = await captureEvidence();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unsupported");
  });

  it("archivo que no es imagen: devuelve 'error'", async () => {
    simulatePicker({
      file: new File(["texto"], "notas.txt", { type: "text/plain" }),
    });

    const result = await captureEvidence();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("error");
  });

  it("foto demasiado grande: devuelve 'error'", async () => {
    const file = photo();
    Object.defineProperty(file, "size", { value: MAX_EVIDENCE_BYTES + 1 });
    simulatePicker({ file });

    const result = await captureEvidence();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("error");
      expect(result.message).toContain("5 MB");
    }
  });

  it("acepta una foto que pesa exactamente el máximo", () => {
    const file = photo();
    Object.defineProperty(file, "size", { value: MAX_EVIDENCE_BYTES });

    expect(validateEvidenceFile(file).ok).toBe(true);
  });

  it("imagen vacía: devuelve 'error'", () => {
    const result = validateEvidenceFile(
      new File([], "vacia.jpg", { type: "image/jpeg" }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("error");
  });

  it("sin archivo: devuelve 'unavailable'", () => {
    const result = validateEvidenceFile(undefined);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unavailable");
  });

  it("fallo inesperado: si el navegador falla al abrir el selector, devuelve 'error' y limpia", async () => {
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {
      throw new Error("fallo simulado");
    });

    const result = await captureEvidence();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("error");
    expect(document.querySelector("input[type=file]")).toBeNull();
  });

  it("no abre el selector al importar: solo al llamar la función", async () => {
    const click = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => undefined);

    vi.resetModules();
    await import("../src/lib/device/camera");

    expect(click).not.toHaveBeenCalled();
    expect(document.querySelector("input[type=file]")).toBeNull();
  });

  it("limita los datos: no guarda ni envía la foto", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    simulatePicker({ file: photo() });

    const result = await captureEvidence();

    expect(result.ok).toBe(true);
    expect(setItem).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

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