/**
 * @file store.test.ts
 * @description Tests for the IngestBackend interface contract.
 */

import { describe, it, expect } from "vitest";
import type { IngestBackend } from "../../src/backends/ingest.js";
import type { Event, StoredEvent } from "../../src/models/index.js";

/**
 * Minimal in-memory store for testing the interface contract.
 */
class MockIngestBackend implements IngestBackend {
  private events: StoredEvent[] = [];
  private nextId = 1;

  async ingestEvents(entityKey: string, events: Event[]): Promise<StoredEvent[]> {
    const stored: StoredEvent[] = events.map((e) => ({
      ...e,
      id: String(this.nextId++),
      entity_key: entityKey,
      status: "valid" as const,
      created_at: new Date().toISOString(),
    }));
    this.events.push(...stored);
    return stored;
  }

  async getEvents(entityKey: string): Promise<StoredEvent[]> {
    return this.events.filter((e) => e.entity_key === entityKey);
  }

  async deleteEvents(entityKey: string, eventIds?: string[]): Promise<number> {
    const before = this.events.length;
    if (eventIds) {
      this.events = this.events.filter(
        (e) => !(e.entity_key === entityKey && eventIds.includes(e.id)),
      );
    } else {
      this.events = this.events.filter((e) => e.entity_key !== entityKey);
    }
    return before - this.events.length;
  }

  async exportEvents(entityKey: string): Promise<StoredEvent[]> {
    return this.events.filter((e) => e.entity_key === entityKey);
  }

  async importEvents(entityKey: string, events: Event[]): Promise<StoredEvent[]> {
    return this.ingestEvents(entityKey, events);
  }
}

describe("IngestBackend interface", () => {
  it("should store and retrieve events", async () => {
    const store: IngestBackend = new MockIngestBackend();
    const events: Event[] = [
      {
        value: "I live in Tokyo",
        labels: ["where_home"],
        confidence: 0.9,
        source_type: "user_stated",
      },
    ];

    const stored = await store.ingestEvents("user-1", events);
    expect(stored).toHaveLength(1);
    expect(stored[0]!.id).toBeDefined();
    expect(stored[0]!.entity_key).toBe("user-1");
    expect(stored[0]!.status).toBe("valid");

    const retrieved = await store.getEvents("user-1");
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0]!.value).toBe("I live in Tokyo");
  });

  it("should delete all events for a user", async () => {
    const store: IngestBackend = new MockIngestBackend();
    await store.ingestEvents("user-1", [
      { value: "Fact 1", labels: ["who_name"], confidence: 0.9, source_type: "user_stated" },
      { value: "Fact 2", labels: ["who_age"], confidence: 0.8, source_type: "inferred" },
    ]);

    const deleted = await store.deleteEvents("user-1");
    expect(deleted).toBe(2);

    const remaining = await store.getEvents("user-1");
    expect(remaining).toHaveLength(0);
  });

  it("should delete specific events by ID", async () => {
    const store: IngestBackend = new MockIngestBackend();
    const stored = await store.ingestEvents("user-1", [
      { value: "Fact 1", labels: ["who_name"], confidence: 0.9, source_type: "user_stated" },
      { value: "Fact 2", labels: ["who_age"], confidence: 0.8, source_type: "inferred" },
    ]);

    const deleted = await store.deleteEvents("user-1", [stored[0]!.id]);
    expect(deleted).toBe(1);

    const remaining = await store.getEvents("user-1");
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.value).toBe("Fact 2");
  });

  it("should export events of all statuses", async () => {
    const store = new MockIngestBackend();
    // Store two events (both start as "valid")
    const stored = await store.ingestEvents("user-1", [
      { value: "Original name", labels: ["who_name"], confidence: 0.9, source_type: "user_stated" },
      {
        value: "Another fact",
        labels: ["where_home"],
        confidence: 0.85,
        source_type: "agent_observed",
      },
    ]);

    // Manually mark one as superseded to simulate lifecycle
    stored[0]!.status = "superseded";

    const exported = await store.exportEvents("user-1");
    expect(exported).toHaveLength(2);

    const statuses = exported.map((e) => e.status);
    expect(statuses).toContain("valid");
    expect(statuses).toContain("superseded");
  });

  it("should import events", async () => {
    const store: IngestBackend = new MockIngestBackend();
    const events: Event[] = [
      { value: "Imported fact", labels: ["who_name"], confidence: 0.8, source_type: "user_stated" },
    ];

    const imported = await store.importEvents("user-1", events);
    expect(imported).toHaveLength(1);
    expect(imported[0]!.entity_key).toBe("user-1");
    expect(imported[0]!.value).toBe("Imported fact");
  });

  it("should return 0 when deleting non-existent user", async () => {
    const store: IngestBackend = new MockIngestBackend();
    const deleted = await store.deleteEvents("nonexistent");
    expect(deleted).toBe(0);
  });

  it("should return empty array for non-existent user", async () => {
    const store: IngestBackend = new MockIngestBackend();
    const events = await store.getEvents("nonexistent");
    expect(events).toHaveLength(0);
  });
});
