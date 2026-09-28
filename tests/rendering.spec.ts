import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
// @ts-ignore
import InspeccionesListPage from '../src/app/inspecciones/page';
// @ts-ignore
import InspectionDetailPage from '../src/app/inspecciones/[id]/page';
import React from 'react';

type MockFetchResponse = { ok: boolean; json?: () => Promise<unknown> };

function mockFetchOnce(response: MockFetchResponse) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response));
}

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
        json: async () => [
          {
            id: 'inspection-001',
            location: 'Laboratorio de Redes',
            status: 'ok',
            statusLabel: 'OK',
            date: '2026-01-01',
            summary: 'Resumen sintético',
            inspector: 'Técnica A',
            findings: 'Sin hallazgos',
          },
        ],
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
});