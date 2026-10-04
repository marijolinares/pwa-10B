import { describe, it, expect, beforeEach, vi } from "vitest";
import { enqueue, processQueue } from "../src/lib/sync/queue";
import { clearQueue, readQueue } from "../src/lib/storage/schema";
import type { Inspection } from "../src/lib/data/inspections";

const mockInspection: Inspection = {
  id: "test-1",
  date: "2023-10-25",
  lab: "Lab 1",
  status: "OK",
  inspector: "Germán",
  issues: [],
};

describe("Sync Queue", () => {
  beforeEach(() => {
    clearQueue();
    global.fetch = vi.fn();
  });

  it("should enqueue a new inspection without duplicating by ID", () => {
    enqueue(mockInspection);
    enqueue(mockInspection); // Call again with same ID
    
    const queue = readQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].id).toBe("test-1");
    expect(queue[0].status).toBe("pending");
  });

  it("should process pending items and mark as synced on success", async () => {
    enqueue(mockInspection);
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    await processQueue();

    const queue = readQueue();
    expect(queue[0].status).toBe("synced");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("should mark as failed on network error and increment attempts", async () => {
    enqueue(mockInspection);
    
    (global.fetch as any).mockRejectedValueOnce(new Error("Network Error"));

    await processQueue();

    const queue = readQueue();
    expect(queue[0].status).toBe("failed");
    expect(queue[0].attempts).toBe(1);
    expect(queue[0].lastError).toBe("Network Error");
  });

  it("should handle 409 Conflict using conflict policy", async () => {
    enqueue(mockInspection);
    
    const serverInspection = { ...mockInspection, status: "Critical" };
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ current: serverInspection }),
    });

    await processQueue();

    const queue = readQueue();
    expect(queue[0].status).toBe("pending");
    expect(queue[0].attempts).toBe(0);
    // As per Client Wins policy, local payload should be preserved (or merged)
    expect(queue[0].payload.status).toBe("OK"); 
  });
});
