import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * tests/service-worker.spec.ts
 *
 * Estas pruebas validan la ESTRUCTURA y el contenido estático de
 * public/sw.js leyendo el archivo como texto, no ejecutándolo en un
 * navegador real. Vitest corre en Node.js y no implementa la Service
 * Worker API (self, caches, clients), así que no podemos "instalar" ni
 * "activar" el SW de verdad aquí.
 *
 * Qué SÍ verifican: que el archivo existe, que registra los listeners
 * esperados (install/activate/fetch), que la lista de precaché incluye
 * los recursos críticos del shell, que el nombre de caché está
 * versionado, y que la limpieza de cachés viejos ocurre en activate.
 *
 * Qué NO verifican: que un fetch real sea interceptado y respondido
 * desde caché, que addAll() falle atómicamente ante un 404, o el
 * comportamiento de skipWaiting/clientsClaim en un navegador real.
 * Esa cobertura requeriría una prueba E2E (p. ej. Playwright).
 */

const SW_PATH = resolve(process.cwd(), "public/sw.js");
let swSource = "";

beforeAll(() => {
  if (!existsSync(SW_PATH)) {
    throw new Error(`No se encontró public/sw.js en ${SW_PATH}`);
  }
  swSource = readFileSync(SW_PATH, "utf-8");
});

describe("public/sw.js — existencia y estructura básica", () => {
  it("existe como archivo en public/", () => {
    expect(existsSync(SW_PATH)).toBe(true);
  });

  it("no está vacío", () => {
    expect(swSource.trim().length).toBeGreaterThan(0);
  });
});

describe("public/sw.js — versionamiento de caché", () => {
  it("define una constante de versión de caché", () => {
    expect(swSource).toMatch(/CACHE_VERSION\s*=\s*["'`][^"'`]+["'`]/);
  });

  it("deriva nombres de caché distintos para shell y runtime", () => {
    expect(swSource).toMatch(/SHELL_CACHE/);
    expect(swSource).toMatch(/RUNTIME_CACHE/);
  });
});

describe("public/sw.js — evento install (precache del shell)", () => {
  it("registra un listener para 'install'", () => {
    expect(swSource).toMatch(/addEventListener\(\s*["']install["']/);
  });

  it("usa event.waitUntil dentro de install", () => {
    const installBlock = swSource.match(
      /addEventListener\(\s*["']install["'][\s\S]*?\}\);/
    );
    expect(installBlock).not.toBeNull();
    expect(installBlock![0]).toMatch(/event\.waitUntil/);
  });

  it("abre un caché y precachea recursos con addAll", () => {
    expect(swSource).toMatch(/caches\.open\(\s*SHELL_CACHE\s*\)/);
    expect(swSource).toMatch(/\.addAll\(/);
  });

  it("la lista de recursos a precachear incluye el shell crítico", () => {
    const shellAssetsMatch = swSource.match(
      /SHELL_ASSETS\s*=\s*\[([\s\S]*?)\]/
    );
    expect(shellAssetsMatch).not.toBeNull();

    const listContent = shellAssetsMatch![1];
    const critical = [
      "/",
      "/manifest.webmanifest",
      "/icons/icon-192x192.png",
      "/icons/icon-512x512.png",
    ];

    for (const asset of critical) {
      expect(listContent).toContain(asset);
    }
  });
});

describe("public/sw.js — evento activate (limpieza de cachés viejos)", () => {
  it("registra un listener para 'activate'", () => {
    expect(swSource).toMatch(/addEventListener\(\s*["']activate["']/);
  });

  it("compara los nombres de caché existentes contra los vigentes", () => {
    const activateBlock = swSource.match(
      /addEventListener\(\s*["']activate["'][\s\S]*?\}\);/
    );
    expect(activateBlock).not.toBeNull();
    expect(activateBlock![0]).toMatch(/caches\.keys\(\)/);
    expect(activateBlock![0]).toMatch(/caches\.delete\(/);
  });

  it("toma control de los clientes tras activarse", () => {
    expect(swSource).toMatch(/self\.clients\.claim\(\)/);
  });
});

describe("public/sw.js — evento fetch (estrategias por tipo de recurso)", () => {
  it("registra un listener para 'fetch'", () => {
    expect(swSource).toMatch(/addEventListener\(\s*["']fetch["']/);
  });

  it("ignora métodos distintos de GET", () => {
    expect(swSource).toMatch(/request\.method\s*!==\s*["']GET["']/);
  });

  it("aplica una estrategia distinta para navegación (HTML)", () => {
    expect(swSource).toMatch(/request\.mode\s*===\s*["']navigate["']/);
  });

  it("ante un fallo de red en navegación, cae a caché y luego a '/'", () => {
    const navBlock = swSource.match(
      /request\.mode\s*===\s*["']navigate["'][\s\S]*?return;/
    );
    expect(navBlock).not.toBeNull();
    expect(navBlock![0]).toMatch(/\.catch\(/);
    expect(navBlock![0]).toMatch(/caches\.match\(request\)/);
    expect(navBlock![0]).toMatch(/caches\.match\(\s*["']\/["']\s*\)/);
  });

  it("aplica cache-first para assets estáticos de Next e íconos", () => {
    expect(swSource).toMatch(/_next\/static/);
    expect(swSource).toMatch(/\/icons\//);
  });

  it("no cachea el resto de las peticiones (network-first simple)", () => {
    const genericFetchBlock = swSource.slice(swSource.lastIndexOf("fetch(request)"));
    expect(genericFetchBlock).toMatch(/\.catch\(\s*\(\)\s*=>\s*caches\.match\(request\)\s*\)/);
  });
});