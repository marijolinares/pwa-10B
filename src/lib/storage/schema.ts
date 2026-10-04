import type { Inspection } from "@/lib/data/inspections";

export type QueueItemStatus =
  | "pending"
  | "syncing"
  | "synced"
  | "failed"
  | "conflict";

export type QueueItem = {
  id: string;
  payload: Inspection;
  status: QueueItemStatus;
  attempts: number;
  createdAt: string;
  lastError?: string;
  syncingSince?: string;
};

// Clave versionada: si cambia la forma de QueueItem, subimos a v2
// y no leemos datos viejos con el formato equivocado.
export const QUEUE_STORAGE_KEY = "pwa-10B:inspection-queue:v1";

const VALID_STATUSES: QueueItemStatus[] = [
  "pending",
  "syncing",
  "synced",
  "failed",
  "conflict",
];

function getStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null; // modo privado o acceso bloqueado
  }
}

function isQueueItem(value: unknown): value is QueueItem {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.payload === "object" &&
    v.payload !== null &&
    typeof v.status === "string" &&
    VALID_STATUSES.includes(v.status as QueueItemStatus) &&
    typeof v.attempts === "number" &&
    typeof v.createdAt === "string" &&
    (v.lastError === undefined || typeof v.lastError === "string") &&
    (v.syncingSince === undefined || typeof v.syncingSince === "string")
  );
}

export function readQueue(): QueueItem[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isQueueItem); // descarta entradas corruptas
  } catch {
    return []; // JSON inválido: no tumbar la app
  }
}

export function writeQueue(items: QueueItem[]): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false; // cuota llena u otro error
  }
}

export function clearQueue(): void {
  try {
    getStorage()?.removeItem(QUEUE_STORAGE_KEY);
  } catch {
    /* nada que limpiar */
  }
}