/**
 * src/app/inspecciones/[id]/page.tsx — Detalle de inspección (SSR)
 *
 * Server Component de Next.js App Router: renderiza en el servidor la
 * ficha completa de una inspección sintética a partir del parámetro [id].
 *
 * ¿Por qué SSR para el detalle?
 * - El HTML llega completo al navegador → mejor SEO y menor TTFB percibido.
 * - Los datos son estáticos/sintéticos: no hay llamada de red en el cliente,
 *   lo que elimina el flash de loading y posibles hydration mismatch.
 * - La ruta es enlazable y compartible: el evaluador puede abrir /inspecciones/inspection-001
 *   directamente y ver el contenido renderizado sin esperar JavaScript.
 *
 * Trade-off: si los datos fueran dinámicos y cambiaran con frecuencia,
 * un revalidate o ISR sería necesario para no servir datos obsoletos.
 *
 * @author Geryiman (Germán Yair Martinez Bolaños)
 */

import type { Metadata } from "next";
import { inspections, type Inspection } from "../../../lib/data/inspections";
import { NotFoundState } from "../../../components/loading-state";

/* ── Helpers ─────────────────────────────────────────────────────── */

function findInspection(id: string): Inspection | undefined {
  return inspections.find((ins) => ins.id === id);
}

/* ── Metadata dinámica (SSR) ─────────────────────────────────────── */

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const inspection = findInspection(id);
  if (!inspection) {
    return { title: "Inspección no encontrada" };
  }
  return {
    title: `${inspection.location} — Inspección`,
    description: inspection.summary,
  };
}

/* ── Generación estática de rutas conocidas ──────────────────────── */

export function generateStaticParams() {
  return inspections.map((ins) => ({ id: ins.id }));
}

/* ── Componente de página (Server Component por defecto) ─────────── */

export default async function InspectionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const inspection = findInspection(id);

  if (!inspection) {
    return (
      <main className="page-shell" data-testid="inspection-detail">
        <NotFoundState
          message={`No se encontró una inspección con el identificador "${id}".`}
          backHref="/inspecciones"
          backLabel="← Volver al listado"
        />
      </main>
    );
  }

  return (
    <main className="page-shell" data-testid="inspection-detail">
      {/* Enlace de retorno */}
      <nav aria-label="Regresar" className="detail-back">
        <a href="/inspecciones" className="detail-back-link">
          ← Volver al listado
        </a>
      </nav>

      {/* Encabezado del detalle */}
      <header className="detail-header">
        <span className={`badge badge-${inspection.status}`}>
          {inspection.statusLabel}
        </span>
        <h1>{inspection.location}</h1>
        <p className="detail-date">{inspection.date}</p>
      </header>

      {/* Información completa */}
      <section className="detail-body" aria-labelledby="detail-info-heading">
        <h2 id="detail-info-heading" className="sr-only">
          Información de la inspección
        </h2>

        <div className="detail-grid">
          <div className="detail-card">
            <h3>Resumen</h3>
            <p>{inspection.summary}</p>
          </div>

          <div className="detail-card">
            <h3>Datos de la inspección</h3>
            <dl className="detail-dl">
              <div>
                <dt>Identificador</dt>
                <dd>{inspection.id}</dd>
              </div>
              <div>
                <dt>Responsable</dt>
                <dd>{inspection.inspector}</dd>
              </div>
              <div>
                <dt>Hallazgos</dt>
                <dd>{inspection.findings}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{inspection.statusLabel}</dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>{inspection.date}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Nota de datos sintéticos */}
      <footer className="detail-footer">
        <p className="muted">
          Los datos mostrados son sintéticos y forman parte del proyecto de
          inspecciones de laboratorio (PWA — Semana 4, detalle SSR).
        </p>
      </footer>
    </main>
  );
}
