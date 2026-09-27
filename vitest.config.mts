import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    globals: false,
    environment: 'happy-dom',
  },
  esbuild: {
    jsxInject: "import React from 'react'",
  },
});
