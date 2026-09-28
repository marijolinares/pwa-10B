import { LoadingState } from "../../../components/loading-state";

export default function Loading() {
  return (
    <main className="page-shell">
      <LoadingState label="Cargando inspección…" />
    </main>
  );
}