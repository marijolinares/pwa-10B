import { readQueue, writeQueue } from "../storage/schema";
import type { QueueItem, QueueItemStatus } from "../storage/schema";
import type { Inspection } from "@/lib/data/inspections";
import { resolveConflict } from "./conflict-policy";

/** Intentos máximos por inspección antes de dejar de reintentar. */
export const MAX_ATTEMPTS = 3;

/**
 * Un item en "syncing" por más de este tiempo se considera huérfano:
 * la pestaña se cerró (o el navegador murió) a media sincronización.
 */
export const STALE_SYNC_MS = 30000;

/** Endpoint al que se envía cada inspección. */
export const SYNC_ENDPOINT = "/api/inspecciones";

export type QueueStats = Record<QueueItemStatus, number> & { total: number };

/** Si hay una corrida en curso, las demás llamadas esperan esa misma. */
let inFlight: Promise<void> | null = null;

/**
 * Encola una inspección para ser sincronizada.
 * No duplica por id; si ya existe y está pendiente o fallida, la actualiza.
 */
export function enqueue(payload: Inspection): void {
  const queue = readQueue();
  const existingIndex = queue.findIndex((item) => item.id === payload.id);

  if (existingIndex !== -1) {
    const existing = queue[existingIndex];
    if (existing.status === "synced" || existing.status === "syncing") {
      return;
    }
    queue[existingIndex] = {
      ...existing,
      payload,
      status: "pending",
      attempts: 0,
      lastError: undefined,
      syncingSince: undefined,
    };
  } else {
    queue.push({
      id: payload.id,
      payload,
      status: "pending",
      attempts: 0,
      createdAt: new Date().toISOString(),
    });
  }

  writeQueue(queue);
}

/**
 * Cambia un solo item leyendo la cola ACTUAL de storage.
 * Así no pisamos lo que enqueue() haya guardado mientras esperábamos la red,
 * y si el item ya no existe (clearQueue) una respuesta tardía no lo resucita.
 */
function updateItem(id: string, patch: Partial<QueueItem>): void {
  const queue = readQueue();
  const index = queue.findIndex((item) => item.id === id);
  if (index === -1) return;
  queue[index] = { ...queue[index], ...patch };
  writeQueue(queue);
}

function isEligible(item: QueueItem): boolean {
  return (
    (item.status === "pending" || item.status === "failed") &&
    item.attempts < MAX_ATTEMPTS
  );
}

/**
 * Devuelve a "pending" los items que quedaron en "syncing" demasiado tiempo
 * (cierre de pestaña a media sincronización). Regresa cuántos recuperó.
 */
export function recoverStaleItems(now: number = Date.now()): number {
  const queue = readQueue();
  let recovered = 0;

  const next = queue.map((item): QueueItem => {
    if (item.status !== "syncing") return item;
    const since = item.syncingSince ? Date.parse(item.syncingSince) : NaN;
    const stale = Number.isNaN(since) || now - since >= STALE_SYNC_MS;
    if (!stale) return item;
    recovered += 1;
    return { ...item, status: "pending", syncingSince: undefined };
  });

  if (recovered > 0) writeQueue(next);
  return recovered;
}

/** Envía un item y guarda el resultado (éxito, conflicto o fallo). */
async function syncOne(item: QueueItem): Promise<void> {
  updateItem(item.id, {
    status: "syncing",
    syncingSince: new Date().toISOString(),
  });

  try {
    const response = await fetch(SYNC_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item.payload),
    });

    if (response.ok) {
      updateItem(item.id, {
        status: "synced",
        lastError: undefined,
        syncingSince: undefined,
      });
      return;
    }

    if (response.status === 409) {
      const body = (await response.json()) as { current?: Inspection };
      const resolved = resolveConflict(item.payload, body.current ?? item.payload);
      // Cada conflicto cuenta como intento: sin este tope un servidor que
      // siempre responde 409 haría que la cola reintentara para siempre.
      const attempts = item.attempts + 1;
      const exhausted = attempts >= MAX_ATTEMPTS;
      updateItem(item.id, {
        payload: resolved,
        attempts,
        status: exhausted ? "conflict" : "pending",
        lastError: exhausted
          ? `Conflicto 409 sin resolver tras ${MAX_ATTEMPTS} intentos`
          : "Conflicto 409: se aplicó client-wins y se reintentará",
        syncingSince: undefined,
      });
      return;
    }

    throw new Error(`Server returned ${response.status}`);
  } catch (error) {
    updateItem(item.id, {
      status: "failed",
      attempts: item.attempts + 1,
      lastError: error instanceof Error ? error.message : String(error),
      syncingSince: undefined,
    });
  }
}

async function runQueue(): Promise<void> {
  recoverStaleItems();

  // Cada item se intenta como máximo una vez por corrida: los reintentos
  // ocurren en la siguiente corrida (evento "online" o llamada manual).
  const visited = new Set<string>();

  for (;;) {
    // Se lee storage en cada vuelta: incluye lo encolado durante la corrida.
    const next = readQueue().find(
      (item) => isEligible(item) && !visited.has(item.id),
    );
    if (!next) return;
    visited.add(next.id);
    await syncOne(next);
  }
}

/**
 * Procesa la cola enviando los items pendientes o fallidos, en orden de captura.
 * - Idempotente: no reenvía lo ya sincronizado.
 * - Sin corridas simultáneas: llamadas concurrentes comparten la misma corrida.
 */
export function processQueue(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = runQueue().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Conteo de items por estado (observabilidad). */
export function getQueueStats(): QueueStats {
  const stats: QueueStats = {
    pending: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
    conflict: 0,
    total: 0,
  };
  for (const item of readQueue()) {
    stats[item.status] += 1;
    stats.total += 1;
  }
  return stats;
}

/**
 * Sincroniza automáticamente cuando el navegador recupera la red.
 * Regresa una función para cancelar el listener.
 */
export function startAutoSync(): () => void {
  if (typeof window === "undefined") return () => {};
  const onOnline = () => {
    void processQueue();
  };
  window.addEventListener("online", onOnline);
  return () => window.removeEventListener("online", onOnline);
}
