import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');
const manifestPath = resolve(root, 'public/manifest.webmanifest');
const layoutPath = resolve(root, 'src/app/layout.tsx');

/**
 * Suite de pruebas para el Web App Manifest de la PWA.
 *
 * Valida estructura, campos obligatorios y coherencia del manifest
 * usando lectura de archivos (sin servidor HTTP), lo que garantiza
 * pruebas deterministas y reproducibles.
 */
describe('Web App Manifest (public/manifest.webmanifest)', () => {
  // ── Existencia y parsing ──────────────────────────────────────

  it('el archivo manifest.webmanifest existe', () => {
    expect(existsSync(manifestPath)).toBe(true);
  });

  it('es JSON válido', () => {
    const raw = readFileSync(manifestPath, 'utf-8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  // ── Campos obligatorios W3C ───────────────────────────────────

  const manifest = (() => {
    try {
      return JSON.parse(readFileSync(manifestPath, 'utf-8'));
    } catch {
      return {};
    }
  })();

  it('tiene "name" no vacío', () => {
    expect(manifest.name).toBeTruthy();
    expect(typeof manifest.name).toBe('string');
    expect(manifest.name.trim().length).toBeGreaterThan(0);
  });

  it('tiene "short_name" no vacío', () => {
    expect(manifest.short_name).toBeTruthy();
    expect(typeof manifest.short_name).toBe('string');
    expect(manifest.short_name.trim().length).toBeGreaterThan(0);
  });

  it('tiene "start_url"', () => {
    expect(manifest.start_url).toBeDefined();
    expect(typeof manifest.start_url).toBe('string');
  });

  it('"display" es "standalone" o "fullscreen"', () => {
    expect(['standalone', 'fullscreen']).toContain(manifest.display);
  });

  // ── Íconos PWA ────────────────────────────────────────────────

  it('tiene un arreglo "icons" con al menos 2 entradas', () => {
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  });

  it('incluye un ícono de 192×192', () => {
    const icon192 = manifest.icons?.find(
      (i: { sizes?: string }) => i.sizes === '192x192'
    );
    expect(icon192).toBeDefined();
    expect(icon192.type).toBe('image/png');
  });

  it('incluye un ícono de 512×512', () => {
    const icon512 = manifest.icons?.find(
      (i: { sizes?: string }) => i.sizes === '512x512'
    );
    expect(icon512).toBeDefined();
    expect(icon512.type).toBe('image/png');
  });

  it('los archivos de íconos referenciados existen en disco', () => {
    for (const icon of manifest.icons ?? []) {
      // Los src del manifest usan rutas relativas a public/
      const iconFile = resolve(root, 'public', icon.src.replace(/^\//, ''));
      expect(
        existsSync(iconFile),
        `Falta el archivo de ícono: ${icon.src}`
      ).toBe(true);
    }
  });

  // ── Campos recomendados ───────────────────────────────────────

  it('tiene "theme_color" y "background_color"', () => {
    expect(manifest.theme_color).toBeDefined();
    expect(typeof manifest.theme_color).toBe('string');
    expect(manifest.background_color).toBeDefined();
    expect(typeof manifest.background_color).toBe('string');
  });

  // ── Integración con layout.tsx ────────────────────────────────

  it('layout.tsx referencia el manifest', () => {
    const layoutContent = readFileSync(layoutPath, 'utf-8');
    // El layout puede referenciar el manifest vía metadata.manifest o un <link>
    const referencesManifest =
      layoutContent.includes('manifest') &&
      (layoutContent.includes('.webmanifest') || layoutContent.includes('.json'));
    expect(
      referencesManifest,
      'layout.tsx debe incluir una referencia al manifest (manifest.webmanifest o manifest.json)'
    ).toBe(true);
  });
});
