import { readQueue, writeQueue } from "../storage/schema";
import type { Inspection } from "@/lib/data/inspections";
import { resolveConflict } from "./conflict-policy";

const MAX_ATTEMPTS = 3;

/**
 * Encola una inspección para ser sincronizada.
 * No duplica por id; si ya existe y está pendiente o fallida, la actualiza.
 */
export function enqueue(payload: Inspection): void {
  const queue = readQueue();
  const existingIndex = queue.findIndex(item => item.id === payload.id);
  
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
 * Procesa la cola intentando sincronizar los items pendientes o fallidos.
 * Es idempotente: no reenvía lo ya sincronizado.
 */
export async function processQueue(): Promise<void> {
  const queue = readQueue();
  let changed = false;

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];

    if (item.status === "synced" || item.status === "syncing") {
      continue;
    }

    if (item.attempts >= MAX_ATTEMPTS) {
      continue;
    }

    item.status = "syncing";
    writeQueue(queue); 

    try {
      const response = await fetch('/api/inspecciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      });

      if (response.ok) {
        item.status = "synced";
      } else if (response.status === 409) {
        const serverData = await response.json();
        const resolved = resolveConflict(item.payload, serverData.current);
        item.payload = resolved;
        item.status = "pending";
        item.attempts = 0;
      } else {
        throw new Error(`Server returned ${response.status}`);
      }
    } catch (error) {
      item.status = "failed";
      item.attempts += 1;
      item.lastError = error instanceof Error ? error.message : String(error);
    }
    
    changed = true;
  }

  if (changed) {
    writeQueue(queue);
  }
}
