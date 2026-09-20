import { describe, it, expect, vi, afterEach } from "vitest";
import { registerSW, unregisterSW } from "../src/lib/pwa/register-service-worker";

/**
 * tests/offline.spec.ts
 *
 * Estas pruebas cubren el módulo de registro del service worker
 * (src/lib/pwa/register-service-worker.ts) simulando distintos
 * escenarios que representan el comportamiento "offline-relevante"
 * de la app: navegador sin soporte, registro exitoso, y falla de
 * registro.
 *
 * Limitación (igual que en service-worker.spec.ts): esto NO ejecuta
 * un service worker real ni simula una petición de red real perdiendo
 * conexión. Se prueba el módulo de registro en aislamiento, simulando
 * (mock) el objeto navigator.serviceWorker. El comportamiento real de
 * fetch/caches en un navegador requeriría una prueba E2E.
 */

const originalNavigator = globalThis.navigator;

function restoreNavigator() {
  Object.defineProperty(globalThis, "navigator", {
    value: originalNavigator,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  restoreNavigator();
  vi.restoreAllMocks();
});

describe("registerSW — navegador sin soporte de Service Worker", () => {
  it("devuelve success: false si 'serviceWorker' no está en navigator", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      configurable: true,
      writable: true,
    });

    const result = await registerSW();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toMatch(/no soporta/i);
    }
  });

  it("no lanza una excepción sin capturar cuando falta soporte", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      configurable: true,
      writable: true,
    });

    await expect(registerSW()).resolves.not.toThrow();
  });
});

describe("registerSW — registro exitoso", () => {
  it("llama a navigator.serviceWorker.register con '/sw.js' y scope raíz", async () => {
    const addEventListener = vi.fn();
    const registerMock = vi.fn().mockResolvedValue({
      scope: "/",
      installing: null,
      addEventListener,
    });

    Object.defineProperty(globalThis, "navigator", {
      value: {
        serviceWorker: {
          register: registerMock,
        },
      },
      configurable: true,
      writable: true,
    });

    const result = await registerSW();

    expect(registerMock).toHaveBeenCalledWith("/sw.js", { scope: "/" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.registration.scope).toBe("/");
    }
  });

  it("se suscribe al evento 'updatefound' para detectar nuevas versiones", async () => {
    const addEventListener = vi.fn();
    const registerMock = vi.fn().mockResolvedValue({
      scope: "/",
      installing: null,
      addEventListener,
    });

    Object.defineProperty(globalThis, "navigator", {
      value: {
        serviceWorker: {
          register: registerMock,
        },
      },
      configurable: true,
      writable: true,
    });

    await registerSW();

    expect(addEventListener).toHaveBeenCalledWith(
      "updatefound",
      expect.any(Function)
    );
  });
});

describe("registerSW — falla de registro", () => {
  it("captura el error y devuelve success: false con el mensaje", async () => {
    const registerMock = vi
      .fn()
      .mockRejectedValue(new Error("Registro rechazado por el navegador"));

    Object.defineProperty(globalThis, "navigator", {
      value: {
        serviceWorker: {
          register: registerMock,
        },
      },
      configurable: true,
      writable: true,
    });

    const result = await registerSW();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe("Registro rechazado por el navegador");
    }
  });

  it("no bloquea ni relanza la excepción hacia quien lo llama", async () => {
    const registerMock = vi.fn().mockRejectedValue(new Error("falla de red"));

    Object.defineProperty(globalThis, "navigator", {
      value: {
        serviceWorker: {
          register: registerMock,
        },
      },
      configurable: true,
      writable: true,
    });

    await expect(registerSW()).resolves.not.toThrow();
  });
});

describe("unregisterSW — limpieza de registros", () => {
  it("devuelve false si no hay soporte de Service Worker", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      configurable: true,
      writable: true,
    });

    const result = await unregisterSW();
    expect(result).toBe(false);
  });

  it("desregistra todos los registros existentes y devuelve true si todos tuvieron éxito", async () => {
    const registrations = [
      { unregister: vi.fn().mockResolvedValue(true) },
      { unregister: vi.fn().mockResolvedValue(true) },
    ];

    Object.defineProperty(globalThis, "navigator", {
      value: {
        serviceWorker: {
          getRegistrations: vi.fn().mockResolvedValue(registrations),
        },
      },
      configurable: true,
      writable: true,
    });

    const result = await unregisterSW();

    expect(result).toBe(true);
    for (const reg of registrations) {
      expect(reg.unregister).toHaveBeenCalled();
    }
  });

  it("devuelve false si al menos un desregistro falla", async () => {
    const registrations = [
      { unregister: vi.fn().mockResolvedValue(true) },
      { unregister: vi.fn().mockResolvedValue(false) },
    ];

    Object.defineProperty(globalThis, "navigator", {
      value: {
        serviceWorker: {
          getRegistrations: vi.fn().mockResolvedValue(registrations),
        },
      },
      configurable: true,
      writable: true,
    });

    const result = await unregisterSW();
    expect(result).toBe(false);
  });
});