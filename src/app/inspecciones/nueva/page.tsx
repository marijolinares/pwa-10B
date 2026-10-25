"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AppShell } from "../../../components/app-shell";
import { LABORATORIES, requestPosition } from "../../../lib/device/geolocation";
import { enqueue, processQueue, startAutoSync } from "../../../lib/sync/queue";
import { readQueue } from "../../../lib/storage/schema";
import type { QueueItem } from "../../../lib/storage/schema";
import { validateInspectionInput } from "../../../lib/validation/inspection";
import type { ValidationErrors } from "../../../lib/validation/inspection";

/**
 * Captura de una inspección (Semana 8).
 *
 * Es la pantalla que conecta las piezas de las semanas anteriores:
 *  - validación de la captura (validateInspectionInput),
 *  - cola local persistente en localStorage (enqueue, Semana 5),
 *  - sincronización al volver la red (startAutoSync / processQueue, Semana 5),
 *  - ubicación OPCIONAL (requestPosition, Semana 6): si se niega o falta,
 *    la inspección se captura igual eligiendo el laboratorio a mano.
 *
 * Regla de oro: guardar SIEMPRE escribe primero en el dispositivo; la red es opcional.
 */

const STATUS_LABELS: Record<QueueItem["status"], string> = {
  pending: "Pendiente de sincronizar",
  syncing: "Sincronizando",
  synced: "Sincronizada",
  failed: "Falló, se reintentará",
  conflict: "Conflicto sin resolver",
};

function newInspectionId(): string {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `inspection-${Date.now()}-${random}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NuevaInspeccionPage() {
  const [location, setLocation] = useState(LABORATORIES[0].name);
  const [inspector, setInspector] = useState("");
  const [date, setDate] = useState("");
  const [findings, setFindings] = useState("0");
  const [summary, setSummary] = useState("");

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saveMessage, setSaveMessage] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [online, setOnline] = useState(true);
  const [items, setItems] = useState<QueueItem[]>([]);

  const refresh = useCallback(() => setItems(readQueue()), []);

  useEffect(() => {
    // La fecha se calcula en el cliente para no desfasar el HTML del servidor.
    setDate(today());
    setOnline(navigator.onLine);
    refresh();

    const stopAutoSync = startAutoSync();
    const handleOnline = () => {
      setOnline(true);
      // Comparte la corrida que arrancó startAutoSync y refresca al terminar.
      void processQueue().then(refresh);
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Si había pendientes de una visita anterior y hay red, se intentan ya.
    if (navigator.onLine && readQueue().length > 0) {
      void processQueue().then(refresh);
    }

    return () => {
      stopAutoSync();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refresh]);

  async function handleLocation() {
    setLocationMessage("Buscando ubicación…");
    const result = await requestPosition();
    if (result.ok) {
      // Las coordenadas NO se guardan ni se envían (permisos mínimos).
      setLocationMessage(
        `Ubicación obtenida (precisión aproximada de ${Math.round(result.value.accuracy)} m). No se guarda.`,
      );
    } else {
      setLocationMessage(result.message);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveMessage("");

    const result = validateInspectionInput({
      id: newInspectionId(),
      location,
      inspector,
      date,
      findings,
      summary,
    });

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    enqueue(result.value);
    refresh();
    setSummary("");
    setInspector("");
    setFindings("0");

    if (navigator.onLine) {
      setSaveMessage("Inspección guardada en este dispositivo. Sincronizando…");
      await processQueue();
      refresh();
      setSaveMessage("Inspección guardada y enviada al servidor.");
    } else {
      setSaveMessage(
        "Inspección guardada en este dispositivo. Se enviará cuando vuelva la conexión.",
      );
    }
  }

  return (
    <AppShell>
      <main className="page-shell">
        <header className="hero">
          <p className="eyebrow">Semana 8 · Captura con conexión intermitente</p>
          <h1>Nueva inspección</h1>
          <p className="lead">
            Se guarda primero en este dispositivo y se sincroniza cuando haya red. Los datos son
            sintéticos.
          </p>
          <span className="status" data-testid="connection-status">
            {online ? "En línea" : "Sin conexión"}
          </span>
        </header>

        <section className="content-section" aria-labelledby="form-heading">
          <h2 id="form-heading">Datos de la inspección</h2>

          <form onSubmit={handleSubmit} noValidate data-testid="inspection-form">
            <p>
              <label htmlFor="location">Laboratorio</label>
              <br />
              <select
                id="location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              >
                {LABORATORIES.map((lab) => (
                  <option key={lab.id} value={lab.name}>
                    {lab.name}
                  </option>
                ))}
              </select>{" "}
              <button type="button" onClick={handleLocation}>
                Usar mi ubicación
              </button>
            </p>
            {locationMessage && (
              <p role="status" data-testid="location-message">
                {locationMessage}
              </p>
            )}

            <p>
              <label htmlFor="inspector">Responsable</label>
              <br />
              <input
                id="inspector"
                type="text"
                value={inspector}
                onChange={(event) => setInspector(event.target.value)}
              />
            </p>
            {errors.inspector && <p role="alert">{errors.inspector}</p>}

            <p>
              <label htmlFor="date">Fecha</label>
              <br />
              <input
                id="date"
                type="text"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </p>
            {errors.date && <p role="alert">{errors.date}</p>}

            <p>
              <label htmlFor="findings">Hallazgos</label>
              <br />
              <input
                id="findings"
                type="text"
                inputMode="numeric"
                value={findings}
                onChange={(event) => setFindings(event.target.value)}
              />
            </p>
            {errors.findings && <p role="alert">{errors.findings}</p>}

            <p>
              <label htmlFor="summary">Resumen</label>
              <br />
              <textarea
                id="summary"
                rows={3}
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
              />
            </p>
            {errors.summary && <p role="alert">{errors.summary}</p>}
            {errors.location && <p role="alert">{errors.location}</p>}

            <button type="submit">Guardar inspección</button>
          </form>

          {saveMessage && (
            <p role="status" data-testid="save-status">
              {saveMessage}
            </p>
          )}
        </section>

        <section className="content-section" aria-labelledby="queue-heading">
          <h2 id="queue-heading">Cola local</h2>
          {items.length === 0 ? (
            <p data-testid="queue-empty">No hay inspecciones guardadas en este dispositivo.</p>
          ) : (
            <ul data-testid="queue-list">
              {items.map((item) => (
                <li key={item.id} data-testid="queue-item" data-status={item.status}>
                  {item.payload.location} · {item.payload.inspector} ·{" "}
                  <strong>{STATUS_LABELS[item.status]}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </AppShell>
  );
}
