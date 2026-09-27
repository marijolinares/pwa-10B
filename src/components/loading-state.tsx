export { LoadingState, ErrorState, EmptyState } from "./app-shell";

/**
 * Estado "no encontrado", usado por el detalle SSR (src/app/inspecciones/[id]/page.tsx)
 * cuando el id de la ruta no corresponde a ninguna inspección conocida.
 * No existe un equivalente en app-shell.tsx porque ese archivo es genérico
 * para toda la app; este es específico de la ruta de detalle.
 */
type NotFoundStateProps = {
  message?: string;
  backHref?: string;
  backLabel?: string;
};

export function NotFoundState({
  message = "El recurso solicitado no existe.",
  backHref = "/",
  backLabel = "← Volver",
}: NotFoundStateProps) {
  return (
    <div className="shell-state shell-state-not-found" role="status">
      <span className="shell-state-icon" aria-hidden="true">
        🔍
      </span>
      <p>{message}</p>
      <a href={backHref} className="shell-state-back-link">
        {backLabel}
      </a>
    </div>
  );
}