import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
// @ts-ignore
import InspeccionesListPage from '../src/app/inspecciones/page';
// @ts-ignore
import InspectionDetailPage from '../src/app/inspecciones/[id]/page';
import React from 'react';

describe('CSR y SSR Rendering - Semana 4', () => {
  it('AC-03: Renderiza el listado (CSR) con estado de carga inicial', () => {
    // Inspecciones list page es un Client Component asíncrono en su data fetching
    const { container } = render(React.createElement(InspeccionesListPage));
    
    // Debería mostrar el skeleton al inicio
    const loadingState = container.querySelector('.loading-state--skeleton');
    expect(loadingState).not.toBeNull();
  });

  it('AC-03: Renderiza el detalle (SSR) con datos estáticos', async () => {
    // Al ser SSR, se le pasan los params resueltos en una promesa simulada
    const params = Promise.resolve({ id: 'inspection-001' });
    const page = await InspectionDetailPage({ params });
    const { container } = render(page); // Renderizamos el output del Server Component

    // Debe mostrar la locación de la inspección 001
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
