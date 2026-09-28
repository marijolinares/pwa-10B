"use client";

import { ErrorState } from "../../../components/loading-state";

export default function DetailError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="page-shell">
      <ErrorState message="No se pudo cargar la inspección." onRetry={reset} />
    </main>
  );
}