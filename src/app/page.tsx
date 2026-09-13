import { inspections } from "../lib/data/inspections";
import { AppShell, EmptyState } from "../components/app-shell";

export default function HomePage() {
  return (
    <AppShell>
      <main className="page-shell">
        <header className="hero">
          <p className="eyebrow">Proyecto base · Semana 2</p>
          <h1>Inspecciones de laboratorio</h1>
          <p className="lead">
            Registro de mantenimiento para trabajar con conectividad intermitente.
            Los datos mostrados son sintéticos.
          </p>
          <span className="status">Estado: shell instalable en construcción · datos sintéticos</span>
        </header>

        <section aria-labelledby="inspections-heading" className="content-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Datos de demostración</p>
              <h2 id="inspections-heading">Inspecciones recientes</h2>
            </div>
            <span className="count">{inspections.length} registros</span>
          </div>

          {inspections.length === 0 ? (
            <EmptyState
              message="Todavía no hay inspecciones registradas."
              hint="Cuando se capture una inspección, aparecerá en esta lista."
            />
          ) : (
            <div className="inspection-grid">
              {inspections.map((inspection) => (
                <article className="inspection-card" key={inspection.id}>
                  <div className="card-topline">
                    <span className={`badge badge-${inspection.status}`}>{inspection.statusLabel}</span>
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
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="footer">
          <p>Aplicaciones Web Progresivas · Universidad Tecnológica de Tehuacán</p>
        </footer>
      </main>
    </AppShell>
  );
}