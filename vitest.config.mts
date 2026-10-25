import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Incluye las suites de las semanas 1-6 (tests/*.spec.ts) y las de la
    // semana 8: tests/unit y tests/integration. Los E2E (tests/e2e/*.e2e.ts)
    // los ejecuta Playwright, no Vitest.
    include: ['tests/**/*.spec.ts'],
    globals: false,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      reporter: ['text-summary', 'json-summary', 'lcov', 'html'],
      reportsDirectory: 'coverage',
    },
  },
  esbuild: {
    jsxInject: "import React from 'react'",
  },
});
