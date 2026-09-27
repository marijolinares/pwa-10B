/**
 * loading-state.tsx — Componentes de estado reutilizables para las rutas
 * de inspecciones (CSR y SSR).
 *
 * Extienden los estados básicos definidos en app-shell.tsx con variantes
 * específicas para el listado (CSR) y el detalle (SSR).
 *
 * Todos los componentes usan roles ARIA y aria-live para accesibilidad.
 */

/* ── Estado de carga (skeleton / spinner) ────────────────────────── */

type LoadingStateProps = {
  /** Texto descriptivo mostrado junto al spinner */
  label?: string;
  /** Número de skeleton cards a mostrar (solo modo "skeleton") */
  skeletonCount?: number;
  /** Variante visual */
  variant?: "spinner" | "skeleton";
};

export function LoadingState({
  label = "Cargando información…",
  skeletonCount = 3,
  variant = "spinner",
}: LoadingStateProps) {
  if (variant === "skeleton") {
    return (
      <div
        className="loading-state loading-state--skeleton"
        role="status"
        aria-live="polite"
        aria-label={label}
      >
        <p className="loading-state__label sr-only">{label}</p>
        <div className="inspection-grid">
          {Array.from({ length: skeletonCount }, (_, i) => (
            <div key={i} className="skeleton-card" aria-hidden="true">
              <div className="skeleton-line skeleton-line--short" />
              <div className="skeleton-line skeleton-line--title" />
              <div className="skeleton-line skeleton-line--body" />
              <div className="skeleton-line skeleton-line--body" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="loading-state loading-state--spinner"
      role="status"
      aria-live="polite"
    >
      <span className="shell-spinner" aria-hidden="true" />
      <p className="loading-state__label">{label}</p>
    </div>
  );
}

/* ── Estado de error ─────────────────────────────────────────────── */

type ErrorStateProps = {
  message?: string;
  /** Callback opcional para reintentar la operación */
  onRetry?: () => void;
};

export function ErrorState({
  message = "No se pudo cargar la información. Intenta de nuevo.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="loading-state loading-state--error" role="alert">
      <span className="loading-state__icon" aria-hidden="true">
        ⚠️
      </span>
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="loading-state__retry"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

/* ── Estado "no encontrado" (404 de detalle) ─────────────────────── */

type NotFoundStateProps = {
  message?: string;
  backHref?: string;
  backLabel?: string;
};

export function NotFoundState({
  message = "La inspección solicitada no existe.",
  backHref = "/inspecciones",
  backLabel = "← Volver al listado",
}: NotFoundStateProps) {
  return (
    <div className="loading-state loading-state--not-found" role="status">
      <span className="loading-state__icon" aria-hidden="true">
        🔍
      </span>
      <p>{message}</p>
      <a href={backHref} className="loading-state__back-link">
        {backLabel}
      </a>
    </div>
  );
}
