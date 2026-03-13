/**
 * @file edge-cases.test.ts
 * @description Edge case tests for UPP backend interfaces.
 */

import { describe, it, expect } from "vitest";
import type { IngestBackend } from "../../src/backends/ingest.js";
import type { RetrieverBackend } from "../../src/backends/retriever.js";
import type { OntologyBackend } from "../../src/backends/ontology.js";
import type { Event, StoredEvent } from "../../src/models/index.js";

// Minimal implementations for edge case testing

class MinimalStore implements IngestBackend {
  private events: StoredEvent[] = [];
  private id = 0;

  async ingestEvents(entityKey: string, events: Event[]): Promise<StoredEvent[]> {
    const stored = events.map((e) => ({
      ...e,
      id: String(++this.id),
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
    return this.events.filter((e) => e.entity_key === entityKey && e.status === "valid");
  }

  async importEvents(entityKey: string, events: Event[]): Promise<StoredEvent[]> {
    return this.ingestEvents(entityKey, events);
  }
}

describe("Store edge cases", () => {
  it("should handle storing empty events array", async () => {
    const store = new MinimalStore();
    const stored = await store.ingestEvents("user-1", []);
    expect(stored).toHaveLength(0);
  });

  it("should handle multiple users independently", async () => {
    const store = new MinimalStore();
    await store.ingestEvents("user-1", [
      { value: "Fact A", labels: ["l1"], confidence: 0.9, source_type: "user_stated" },
    ]);
    await store.ingestEvents("user-2", [
      { value: "Fact B", labels: ["l2"], confidence: 0.9, source_type: "user_stated" },
    ]);

    const user1Events = await store.getEvents("user-1");
    const user2Events = await store.getEvents("user-2");

    expect(user1Events).toHaveLength(1);
    expect(user2Events).toHaveLength(1);
    expect(user1Events[0]!.value).toBe("Fact A");
    expect(user2Events[0]!.value).toBe("Fact B");
  });

  it("should not delete events from other users", async () => {
    const store = new MinimalStore();
    await store.ingestEvents("user-1", [
      { value: "Fact A", labels: ["l1"], confidence: 0.9, source_type: "user_stated" },
    ]);
    await store.ingestEvents("user-2", [
      { value: "Fact B", labels: ["l2"], confidence: 0.9, source_type: "user_stated" },
    ]);

    await store.deleteEvents("user-1");

    const user1Events = await store.getEvents("user-1");
    const user2Events = await store.getEvents("user-2");

    expect(user1Events).toHaveLength(0);
    expect(user2Events).toHaveLength(1);
  });

  it("should handle deleting with non-existent event IDs", async () => {
    const store = new MinimalStore();
    await store.ingestEvents("user-1", [
      { value: "Fact", labels: ["l1"], confidence: 0.9, source_type: "user_stated" },
    ]);

    const deleted = await store.deleteEvents("user-1", ["nonexistent-id"]);
    expect(deleted).toBe(0);

    const events = await store.getEvents("user-1");
    expect(events).toHaveLength(1);
  });
});

describe("Retriever edge cases", () => {
  it("should handle empty results gracefully", async () => {
    const retriever: RetrieverBackend = {
      async retrieve() {
        return [];
      },
    };
    const results = await retriever.retrieve("user-1", "anything");
    expect(results).toHaveLength(0);
  });
});

describe("Ontology edge cases", () => {
  it("should handle ontology with no labels", async () => {
    const backend: OntologyBackend = {
      async getLabels() {
        return [];
      },
      async getOntology() {
        return "empty/v1";
      },
    };

    const labels = await backend.getLabels();
    expect(labels).toHaveLength(0);
    const ontology = await backend.getOntology();
    expect(ontology).toBe("empty/v1");
  });
});
