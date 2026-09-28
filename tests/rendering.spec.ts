import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-ignore
import InspeccionesListPage from '../src/app/inspecciones/page';
// @ts-ignore
import InspectionDetailPage from '../src/app/inspecciones/[id]/page';
// @ts-ignore
import * as DetailModule from '../src/app/inspecciones/[id]/page';
import * as SharedStates from '../src/components/loading-state';
import React from 'react';

type MockFetchResponse = { ok: boolean; json?: () => Promise<unknown> };

function mockFetchOnce(response: MockFetchResponse) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response));
}

const sampleInspection = {
  id: 'inspection-001',
  location: 'Laboratorio de Redes',
  status: 'ok',
  statusLabel: 'OK',
  date: '2026-01-01',
  summary: 'Resumen sintético',
  inspector: 'Técnica A',
  findings: 'Sin hallazgos',
};

describe('CSR y SSR Rendering - Semana 4', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  describe('Listado de inspecciones (CSR) — src/app/inspecciones/page.tsx (Irvin)', () => {
    it('AC-03: la ruta existe y es un Client Component renderizable', () => {
      expect(typeof InspeccionesListPage).toBe('function');
    });

    it('AC-03: muestra el estado de carga inicial mientras llega el fetch', () => {
      mockFetchOnce({ ok: true, json: () => new Promise(() => {}) });
      const { container } = render(React.createElement(InspeccionesListPage));

      const loadingState = container.querySelector('.shell-state-loading');
      expect(loadingState).not.toBeNull();
      expect(loadingState?.getAttribute('role')).toBe('status');
    });

    it('AC-03: muestra el listado cuando el fetch resuelve con datos', async () => {
      mockFetchOnce({
        ok: true,
        json: async () => [sampleInspection],
      });

      const { container, findByText } = render(React.createElement(InspeccionesListPage));
      await findByText('Laboratorio de Redes');

      expect(container.querySelector('.shell-state-loading')).toBeNull();
    });

    it('AC-03: muestra el estado de error cuando el fetch falla', async () => {
      mockFetchOnce({ ok: false });
      const { findByRole } = render(React.createElement(InspeccionesListPage));

      const errorState = await findByRole('alert');
      expect(errorState.textContent).toContain(
        'No se pudo cargar el listado de inspecciones.',
      );
    });

    it('AC-03: muestra el estado vacío cuando no hay inspecciones', async () => {
      mockFetchOnce({ ok: true, json: async () => [] });
      const { findByText } = render(React.createElement(InspeccionesListPage));

      const emptyState = await findByText('Todavía no hay inspecciones registradas.');
      expect(emptyState).toBeTruthy();
    });
  });

  it('AC-03: Renderiza el detalle (SSR) con datos estáticos', async () => {
    const params = Promise.resolve({ id: 'inspection-001' });
    const page = await InspectionDetailPage({ params });
    const { container } = render(page);

    expect(container.textContent).toContain('Laboratorio de Redes');
    expect(container.textContent).toContain('Técnica A');
  });

  it('AC-03: Renderiza estado not-found en detalle para ID inválido', async () => {
    const params = Promise.resolve({ id: 'invalido-123' });
    const page = await InspectionDetailPage({ params });
    const { container } = render(page);

    expect(container.textContent).toContain('No se encontró una inspección con el identificador "invalido-123".');
  });

  // ── Pruebas de Maria Jose  ────────────────────────────────────────────────

  describe('Modo de renderizado declarado en el código (estructura)', () => {
    const listSource = readFileSync(
      resolve(process.cwd(), 'src/app/inspecciones/page.tsx'),
      'utf-8',
    );
    const detailSource = readFileSync(
      resolve(process.cwd(), 'src/app/inspecciones/[id]/page.tsx'),
      'utf-8',
    );

    it('AC-03: el listado declara "use client" (CSR)', () => {
      expect(listSource).toMatch(/^\s*["']use client["']/);
    });

    it('AC-03: el detalle NO declara "use client" (Server Component)', () => {
      expect(detailSource).not.toMatch(/["']use client["']/);
    });

    it('AC-03: el detalle pregenera las rutas conocidas con generateStaticParams', async () => {
      // Si el equipo decide SSR real (dynamic = "force-dynamic"), eliminar esta prueba.
      expect(typeof DetailModule.generateStaticParams).toBe('function');
      const params = await DetailModule.generateStaticParams();
      const ids = params.map((p: { id: string }) => p.id);

      expect(ids).toEqual(
        expect.arrayContaining(['inspection-001', 'inspection-002', 'inspection-003']),
      );
    });
  });

  describe('Listado CSR — comportamiento adicional', () => {
    it('AC-03: pide los datos a /api/inspecciones desde el navegador', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => [] });
      vi.stubGlobal('fetch', fetchMock);

      const { findByText } = render(React.createElement(InspeccionesListPage));
      await findByText('Todavía no hay inspecciones registradas.');

      expect(fetchMock).toHaveBeenCalledWith('/api/inspecciones');
    });

    it('AC-03: el botón Reintentar vuelve a pedir los datos y recupera el listado', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({ ok: true, json: async () => [sampleInspection] });
      vi.stubGlobal('fetch', fetchMock);

      const { findByText } = render(React.createElement(InspeccionesListPage));

      const retryButton = await findByText('Reintentar');
      fireEvent.click(retryButton);

      await findByText('Laboratorio de Redes');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('Estados compartidos — src/components/loading-state.tsx', () => {
    it('AC-03: exporta los cuatro estados que usan las rutas', () => {
      expect(typeof SharedStates.LoadingState).toBe('function');
      expect(typeof SharedStates.ErrorState).toBe('function');
      expect(typeof SharedStates.EmptyState).toBe('function');
      expect(typeof SharedStates.NotFoundState).toBe('function');
    });

    it('AC-03: NotFoundState muestra el mensaje y un enlace para volver', () => {
      const { container, getByText } = render(
        React.createElement(SharedStates.NotFoundState, {
          message: 'No existe esa inspección.',
          backHref: '/inspecciones',
          backLabel: '← Volver al listado',
        }),
      );

      expect(container.querySelector('.shell-state-not-found')?.getAttribute('role')).toBe('status');
      expect(getByText('No existe esa inspección.')).toBeTruthy();
      expect(getByText('← Volver al listado').getAttribute('href')).toBe('/inspecciones');
    });
  });
});