import { defineConfig, devices } from "@playwright/test";

/**
 * E2E de la Semana 8. Prueba la PWA ya compilada (`npm run build`) y servida con
 * `next start`, porque el service worker solo funciona de forma fiable en modo
 * producción. Playwright arranca y apaga ese servidor solo (webServer).
 *
 * PW_CHROMIUM_PATH es opcional: sirve para apuntar a un Chromium ya instalado
 * en el equipo. En CI no se usa: allí se instala con `npx playwright install`.
 */
const PORT = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["junit", { outputFile: "reports/playwright-junit.xml" }],
  ],
  outputDir: "test-results",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
