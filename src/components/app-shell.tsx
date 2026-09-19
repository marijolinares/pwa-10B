"use client";

import { ReactNode } from "react";

/**
 * AppShell — estructura visual persistente de la PWA:
 * barra de navegación superior + área de contenido.
 * También expone los tres estados reutilizables que pide la Semana 2:
 * carga, error y vacío. Todos con datos sintéticos, sin llamadas reales
 * a un backend todavía.
 */

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-shell-nav" role="banner">
        <div className="app-shell-nav-brand">
          <span className="app-shell-logo" aria-hidden="true">
            🧪
          </span>
          <span>Inspecciones</span>
        </div>
        <nav aria-label="Navegación principal" className="app-shell-nav-links">
          <a href="/" className="app-shell-nav-link" aria-current="page">
            Inicio
          </a>
          {/* Enlaces futuros (registrar inspección, sincronización, etc.)
              se agregan aquí cuando existan las rutas correspondientes. */}
        </nav>
      </header>

      <main className="app-shell-content">{children}</main>
    </div>
  );
}

/**
 * Estado de carga. Úsalo mientras se obtienen datos (hoy sintéticos,
 * en el futuro desde una API o desde caché offline).
 */
export function LoadingState({ label = "Cargando información…" }: { label?: string }) {
  return (
    <div className="shell-state shell-state-loading" role="status" aria-live="polite">
      <span className="shell-spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

/**
 * Estado de error. Úsalo cuando falla una operación (por ejemplo,
 * en el futuro, un intento de sincronización sin conexión).
 */
export function ErrorState({
  message = "No se pudo cargar la información. Intenta de nuevo.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="shell-state shell-state-error" role="alert">
      <span className="shell-state-icon" aria-hidden="true">
        ⚠️
      </span>
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="shell-state-retry">
          Reintentar
        </button>
      )}
    </div>
  );
}

/**
 * Estado vacío. Úsalo cuando la consulta fue exitosa pero no hay
 * registros que mostrar (por ejemplo, cero inspecciones capturadas).
 */
export function EmptyState({
  message = "Todavía no hay inspecciones registradas.",
  hint,
}: {
  message?: string;
  hint?: string;
}) {
  return (
    <div className="shell-state shell-state-empty">
      <span className="shell-state-icon" aria-hidden="true">
        📭
      </span>
      <p>{message}</p>
      {hint && <p className="shell-state-hint">{hint}</p>}
    </div>
  );
}