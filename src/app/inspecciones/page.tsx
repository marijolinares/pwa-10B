"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell, ErrorState, EmptyState } from "../../components/app-shell";
import { LoadingState } from "../../components/loading-state";
import type { Inspection } from "../../lib/data/inspections";

/**
 * Listado de inspecciones — Client Component.
 * Semana 4: hace fetch en el navegador (CSR), no en el servidor,
 * porque este listado se espera que cambie seguido y no necesita
 * indexarse por SEO como una página individual.
 */
export default function InspeccionesPage() {
  const [inspections, setInspections] = useState<Inspection[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadInspections() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/inspecciones");
      if (!res.ok) throw new Error("Respuesta no válida del servidor");
      const data: Inspection[] = await res.json();
      setInspections(data);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInspections();
  }, []);

  return (
    <AppShell>
      <main className="page-shell">
        <header className="hero">
          <p className="eyebrow">Semana 4 · Renderizado</p>
          <h1>Listado de inspecciones</h1>
          <p className="lead">
            Esta vista se carga en el navegador (CSR): los datos se piden
            después de que la página ya está en pantalla.
          </p>
        </header>

        <section aria-labelledby="listado-heading" className="content-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Datos en vivo (sintéticos)</p>
              <h2 id="listado-heading">Inspecciones</h2>
            </div>
            {inspections && <span className="count">{inspections.length} registros</span>}
          </div>

          {loading && <LoadingState label="Cargando inspecciones…" />}

          {!loading && error && (
            <ErrorState
              message="No se pudo cargar el listado de inspecciones."
              onRetry={loadInspections}
            />
          )}

          {!loading && !error && inspections && inspections.length === 0 && (
            <EmptyState
              message="Todavía no hay inspecciones registradas."
              hint="Cuando se capture una inspección, aparecerá en esta lista."
            />
          )}

          {!loading && !error && inspections && inspections.length > 0 && (
            <div className="inspection-grid">
              {inspections.map((inspection) => (
                <Link
                  href={`/inspecciones/${inspection.id}`}
                  key={inspection.id}
                  className="inspection-card"
                  style={{ display: "block", textDecoration: "none", color: "inherit" }}
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
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}