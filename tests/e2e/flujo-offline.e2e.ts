import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

/**
 * E2E de la Semana 8 — flujo crítico de la PWA de inspecciones.
 * Navegador real (Chromium) contra la app compilada y servida con `next start`.
 *
 * Flujo mínimo: crear → guardar sin conexión → recargar → reconectar →
 * sincronizar SIN duplicar. Más una variante con el permiso de ubicación
 * denegado, donde la captura se completa igual.
 *
 * Aislamiento: cada test usa un contexto de navegador nuevo (localStorage,
 * caché y service worker vacíos) y un marcador único en "Responsable", así
 * el servidor puede contar solo las inspecciones de ESE caso.
 */

const QUEUE_KEY = "pwa-10B:inspection-queue:v1";

type ServerInspection = { id: string; inspector: string; summary: string };

function uniqueInspector(label: string): string {
  return `E2E ${label} ${Date.now()}`;
}

async function countOnServer(request: APIRequestContext, inspector: string): Promise<number> {
  const response = await request.get("/api/inspecciones");
  expect(response.ok()).toBe(true);
  const list = (await response.json()) as ServerInspection[];
  return list.filter((item) => item.inspector === inspector).length;
}

/**
 * Deja la página lista para funcionar sin red: espera a que el service worker
 * controle la pestaña y a que la caché ya tenga la página y sus scripts.
 */
async function warmUpOfflineSupport(page: Page): Promise<void> {
  await page.goto("/inspecciones/nueva");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  // Segunda carga: ahora sí pasa por el service worker y se guarda en caché.
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const page = await caches.match("/inspecciones/nueva");
        const runtime = await caches.open("runtime-v1");
        return Boolean(page) && (await runtime.keys()).length > 0;
      }),
    )
    .toBe(true);
}

async function fillAndSave(page: Page, inspector: string, summary: string): Promise<void> {
  await page.getByLabel("Responsable").fill(inspector);
  await page.getByLabel("Hallazgos").fill("2");
  await page.getByLabel("Resumen").fill(summary);
  await page.getByRole("button", { name: "Guardar inspección" }).click();
}

test.describe("Flujo crítico: captura con conexión intermitente", () => {
  test("crear → guardar sin conexión → recargar → reconectar → una sola inspección sincronizada", async ({
    page,
    context,
    request,
  }) => {
    const inspector = uniqueInspector("flujo");
    await warmUpOfflineSupport(page);

    // 1) Sin conexión: la captura se guarda en el dispositivo.
    await context.setOffline(true);
    await expect(page.getByTestId("connection-status")).toHaveText("Sin conexión");
    await fillAndSave(page, inspector, "Revisión sintética de estaciones sin red.");

    await expect(page.getByTestId("save-status")).toContainText("guardada en este dispositivo");
    const pending = page.getByTestId("queue-item");
    await expect(pending).toHaveCount(1);
    await expect(pending).toHaveAttribute("data-status", "pending");
    expect(await countOnServer(request, inspector)).toBe(0);

    // 2) Recargar sin red: la inspección NO se pierde.
    await page.reload();
    await expect(page.getByTestId("queue-item")).toHaveCount(1);
    await expect(page.getByTestId("queue-item")).toHaveAttribute("data-status", "pending");
    await expect(page.getByTestId("queue-item")).toContainText(inspector);

    // 3) Reconectar: se sincroniza sola, una sola vez.
    await context.setOffline(false);
    await expect(page.getByTestId("queue-item")).toHaveAttribute("data-status", "synced");
    expect(await countOnServer(request, inspector)).toBe(1);

    // 4) Otra visita con red: no vuelve a enviarse (sin duplicado).
    await page.reload();
    await expect(page.getByTestId("queue-item")).toHaveAttribute("data-status", "synced");
    expect(await countOnServer(request, inspector)).toBe(1);

    // 5) Y aparece una sola vez en el listado.
    await page.goto("/inspecciones");
    await expect(page.getByText(inspector)).toHaveCount(1);
  });

  test("con la ubicación denegada la captura se completa eligiendo el laboratorio a mano", async ({
    page,
    request,
  }) => {
    const inspector = uniqueInspector("sin-permiso");

    // Simula que la persona niega el permiso (PERMISSION_DENIED = 1).
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: {
          getCurrentPosition: (
            _ok: PositionCallback,
            fail: PositionErrorCallback,
          ) => fail({ code: 1, message: "denied" } as GeolocationPositionError),
        },
      });
    });

    await page.goto("/inspecciones/nueva");
    await page.getByRole("button", { name: "Usar mi ubicación" }).click();
    await expect(page.getByTestId("location-message")).toContainText(
      "Elige el laboratorio manualmente",
    );

    // La alternativa manual funciona: se elige laboratorio y se guarda.
    await page.getByLabel("Laboratorio").selectOption({ label: "Laboratorio de Electrónica" });
    await fillAndSave(page, inspector, "Captura sin permiso de ubicación.");

    await expect(page.getByTestId("save-status")).toContainText("enviada al servidor");
    await expect(page.getByTestId("queue-item")).toHaveAttribute("data-status", "synced");
    expect(await countOnServer(request, inspector)).toBe(1);
  });

  test("una captura inválida se rechaza y no entra a la cola", async ({ page }) => {
    await page.goto("/inspecciones/nueva");
    await page.getByLabel("Resumen").fill("abc");
    await page.getByRole("button", { name: "Guardar inspección" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "Escribe quién realizó" })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "al menos 5 caracteres" })).toBeVisible();
    await expect(page.getByTestId("queue-empty")).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), QUEUE_KEY)).toBeNull();
  });

  test("enviar dos veces la misma inspección al servidor no crea un duplicado", async ({
    request,
  }) => {
    const inspector = uniqueInspector("idempotencia");
    const payload = {
      id: `inspection-e2e-${Date.now()}`,
      location: "Laboratorio de Redes",
      date: "2026-10-24",
      inspector,
      status: "ok",
      statusLabel: "Sin incidencias",
      findings: 0,
      summary: "Reintento del mismo envío.",
    };

    const first = await request.post("/api/inspecciones", { data: payload });
    const second = await request.post("/api/inspecciones", { data: payload });

    expect(first.status()).toBe(201);
    expect(second.status()).toBe(200);
    expect(await countOnServer(request, inspector)).toBe(1);
  });
});
