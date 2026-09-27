/**
 * src/app/inspecciones/page.tsx — Listado de inspecciones (CSR)
 *
 * Client Component de Next.js App Router: los datos se obtienen en el
 * navegador mediante un fetch simulado (datos sintéticos con latencia
 * artificial), lo que permite mostrar estados de carga y error en el
 * cliente.
 *
 * ¿Por qué CSR para el listado?
 * - Permite filtrar, ordenar y paginar sin recargar la página.
 * - Muestra un estado de carga visible (skeleton/spinner) que evidencia
 *   el ciclo de vida del componente en el navegador.
 * - Contrasta con el detalle SSR: el evaluador puede comparar ambas
 *   estrategias en la misma aplicación.
 *
 * Trade-off: la primera pintura del listado es un spinner; los datos
 * no están disponibles para SEO hasta que el JavaScript se ejecuta.
 *
 * Responsable principal: Irvin (CSR + loading-state).
 * Integración: Germán (conexión al detalle SSR con links).
 */

"use client";

import { useState, useEffect } from "react";
import { type Inspection } from "../../lib/data/inspections";
import { LoadingState, ErrorState } from "../../components/loading-state";

/**
 * Simula un fetch asíncrono de datos sintéticos.
 * En una app real, esto sería un fetch() a una API REST o GraphQL.
 */
async function fetchInspections(): Promise<Inspection[]> {
  // Importación dinámica: los datos se cargan en el cliente
  const { inspections } = await import("../../lib/data/inspections");
  // Latencia artificial para demostrar el estado de carga
  await new Promise((resolve) => setTimeout(resolve, 800));
  return inspections;
}

export default function InspeccionesListPage() {
  const [inspections, setInspections] = useState<Inspection[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchInspections()
      .then((data) => {
        if (active) setInspections(data);
      })
      .catch((err: unknown) => {
        if (active)
          setError(
            err instanceof Error ? err.message : "Error desconocido al cargar"
          );
      });
    return () => {
      active = false;
    };
  }, []);

  /* ── Estado de error ───────────────────────────────────────── */
  if (error) {
    return (
      <main className="page-shell" data-testid="inspecciones-list">
        <ErrorState
          message={error}
          onRetry={() => {
            setError(null);
            setInspections(null);
            fetchInspections()
              .then(setInspections)
              .catch((err: unknown) =>
                setError(
                  err instanceof Error
                    ? err.message
                    : "Error desconocido al cargar"
                )
              );
          }}
        />
      </main>
    );
  }

  /* ── Estado de carga ───────────────────────────────────────── */
  if (inspections === null) {
    return (
      <main className="page-shell" data-testid="inspecciones-list">
        <header className="list-header">
          <p className="eyebrow">Listado CSR · Semana 4</p>
          <h1>Inspecciones de laboratorio</h1>
        </header>
        <LoadingState
          label="Cargando inspecciones…"
          variant="skeleton"
          skeletonCount={3}
        />
      </main>
    );
  }

  /* ── Contenido cargado ─────────────────────────────────────── */
  return (
    <main className="page-shell" data-testid="inspecciones-list">
      <header className="list-header">
        <p className="eyebrow">Listado CSR · Semana 4</p>
        <h1>Inspecciones de laboratorio</h1>
        <p className="lead" style={{ color: "var(--muted)" }}>
          Registro de mantenimiento con datos sintéticos. El listado se
          renderiza en el cliente (CSR) para demostrar estados de carga.
        </p>
      </header>

      <section
        aria-labelledby="inspections-heading"
        className="content-section"
      >
        <div className="section-heading">
          <h2 id="inspections-heading">Inspecciones recientes</h2>
          <span className="count">{inspections.length} registros</span>
        </div>

        <div className="inspection-grid">
          {inspections.map((inspection) => (
            <a
              key={inspection.id}
              href={`/inspecciones/${inspection.id}`}
              className="inspection-card inspection-card--link"
              data-testid={`inspection-card-${inspection.id}`}
            >
              <div className="card-topline">
                <span className={`badge badge-${inspection.status}`}>
                  {inspection.statusLabel}
                </span>
                <span className="muted">{inspection.date}</span>
              </div>
              <h3>{inspection.location}</h3>
              <p>{inspection.summary}</p>
              <dl>
                <div>
                  <dt>Responsable</dt>
                  <dd>{inspection.inspector}</dd>
                </div>
                <div>
                  <dt>Hallazgos</dt>
                  <dd>{inspection.findings}</dd>
                </div>
              </dl>
              <span className="card-action muted">Ver detalle →</span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
