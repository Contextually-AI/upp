/**
 * @file pipeline.test.ts
 * @description End-to-end integration tests for the UPP protocol v2 pipeline.
 *
 * Tests the complete flow using a UppServer and UppClient wired together
 * with mock backends. Verifies that the JSON-RPC layer correctly dispatches
 * all 8 operations.
 *
 * @module
 */

import { describe, it, expect, beforeEach } from "vitest";
import { UppServer } from "../../src/rpc/server.js";
import { UppClient } from "../../src/rpc/client.js";
import type { UppTransport } from "../../src/rpc/client.js";
import type { IngestBackend } from "../../src/backends/ingest.js";
import type { RetrieverBackend } from "../../src/backends/retriever.js";
import type { OntologyBackend } from "../../src/backends/ontology.js";
import type { Event, StoredEvent, LabelDefinition, TaskResult } from "../../src/models/index.js";

// ─── Mock Backends ───────────────────────────────────────────────────────────

class InMemoryStore implements IngestBackend {
  private events: StoredEvent[] = [];
  private nextId = 0;
  private tasks = new Map<string, { result: StoredEvent[]; createdAt: string; completedAt: string }>();

  async ingestEvents(entityKey: string, text: string): Promise<StoredEvent[]> {
    const stored: StoredEvent = {
      value: text,
      labels: ["mock"],
      confidence: 1.0,
      source_type: "user_stated",
      id: String(++this.nextId),
      entity_key: entityKey,
      status: "valid" as const,
      created_at: new Date().toISOString(),
    };
    this.events.push(stored);
    return [stored];
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
    const stored = events.map((e) => ({
      ...e,
      id: String(++this.nextId),
      entity_key: entityKey,
      status: "valid" as const,
      created_at: new Date().toISOString(),
    }));
    this.events.push(...stored);
    return stored;
  }

  async scheduleIngest(entityKey: string, text: string): Promise<string> {
    const taskId = `task_${crypto.randomUUID()}`;
    const result = await this.ingestEvents(entityKey, text);
    this.tasks.set(taskId, {
      result,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });
    return taskId;
  }

  async getTasks(taskIds: string[]): Promise<TaskResult[]> {
    return taskIds
      .filter((id) => this.tasks.has(id))
      .map((id) => {
        const t = this.tasks.get(id)!;
        return {
          task_id: id,
          status: "completed" as const,
          result: t.result,
          error: null,
          created_at: t.createdAt,
          completed_at: t.completedAt,
        };
      });
  }
}

class SimpleRetriever implements RetrieverBackend {
  private store: InMemoryStore;

  constructor(store: InMemoryStore) {
    this.store = store;
  }

  async retrieve(entityKey: string, query: string): Promise<Event[]> {
    const events = await this.store.getEvents(entityKey);
    // Simple keyword matching
    return events
      .filter((e) => e.value.toLowerCase().includes(query.toLowerCase()))
      .map(({ value, labels, confidence, source_type }) => ({
        value,
        labels,
        confidence,
        source_type,
      }));
  }
}

class SimpleOntology implements OntologyBackend {
  async getLabels(): Promise<LabelDefinition[]> {
    return [
      {
        name: "who_name",
        display_name: "Name",
        description: "Full name",
        category: "WHO",
        sensitivity: "tier_personal",
        cardinality: "singular",
        durability: "permanent",
        examples: ["John Doe"],
      },
      {
        name: "where_home",
        display_name: "Home",
        description: "Home location",
        category: "WHERE",
        sensitivity: "tier_personal",
        cardinality: "singular",
        durability: "transient",
        examples: ["Tokyo", "London"],
      },
    ];
  }

  async getOntology(): Promise<string> {
    return "user/v1";
  }
}

function createTestStack() {
  const store = new InMemoryStore();
  const retriever = new SimpleRetriever(store);
  const ontology = new SimpleOntology();

  const server = new UppServer({ store, retriever, ontology });
  const transport: UppTransport = (req) => server.handleRequest(req);
  const client = new UppClient(transport);

  return { server, client, store };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Full Pipeline Integration", () => {
  let client: UppClient;
  let store: InMemoryStore;

  beforeEach(() => {
    const stack = createTestStack();
    client = stack.client;
    store = stack.store;
  });

  describe("discovery operations", () => {
    it("should return server info", async () => {
      const info = await client.info();
      expect(info.protocol_version).toBe("2.0.0");
      expect(info.ontology).toBe("user/v1");
      expect(info.operations.length).toBeGreaterThanOrEqual(10);
    });

    it("should return labels", async () => {
      const labels = await client.labels();
      expect(labels.length).toBeGreaterThan(0);
      expect(labels[0]).toHaveProperty("name");
      expect(labels[0]).toHaveProperty("sensitivity");
    });
  });

  describe("core operations", () => {
    it("should retrieve events by query", async () => {
      // Seed events via store backend directly
      await store.ingestEvents("user-1", "Lives in Tokyo");
      await store.ingestEvents("user-1", "Name is Alice");

      const results = await client.retrieve("user-1", "Tokyo");
      expect(results).toHaveLength(1);
      expect(results[0]!.value).toBe("Lives in Tokyo");
    });

    it("should list all events for a user", async () => {
      await store.ingestEvents("user-1", "Fact A");
      await store.ingestEvents("user-1", "Fact B");

      const events = await client.events("user-1");
      expect(events).toHaveLength(2);
    });

    it("should delete all events for a user", async () => {
      await store.ingestEvents("user-1", "Fact");

      const count = await client.delete("user-1");
      expect(count).toBe(1);

      const events = await client.events("user-1");
      expect(events).toHaveLength(0);
    });

    it("should delete specific events by ID", async () => {
      const storedA = await store.ingestEvents("user-1", "Fact A");
      await store.ingestEvents("user-1", "Fact B");

      const count = await client.delete("user-1", [storedA[0]!.id]);
      expect(count).toBe(1);

      const remaining = await client.events("user-1");
      expect(remaining).toHaveLength(1);
      expect(remaining[0]!.value).toBe("Fact B");
    });
  });

  describe("portability operations", () => {
    it("should export and import events via file", async () => {
      await store.ingestEvents("user-1", "Lives in Tokyo");

      // Export to file
      const exported = await client.export("user-1");
      expect(exported.file).toMatch(/\.json$/);
      expect(exported.event_count).toBe(1);
      expect(exported.exported_at).toBeDefined();

      // Import from the exported file to another user
      const imported = await client.import("user-2", exported.file);
      expect(imported.imported_count).toBe(1);
      expect(imported.skipped_count).toBe(0);

      // Verify the imported events exist
      const user2Events = await client.events("user-2");
      expect(user2Events).toHaveLength(1);
    });
  });

  describe("contextual operations", () => {
    it("should contextualize and return events with task_id", async () => {
      await store.ingestEvents("user-1", "Lives in Tokyo");

      const result = await client.contextualize("user-1", "Tokyo");
      expect(result.events).toHaveLength(1);
      expect(result.events[0]!.value).toBe("Lives in Tokyo");
      expect(result.task_id).toBeDefined();
      expect(result.task_id).toMatch(/^task_/);
    });

    it("should check task status with getTasks", async () => {
      await store.ingestEvents("user-1", "Lives in Tokyo");

      const ctxResult = await client.contextualize("user-1", "Tokyo");
      const tasks = await client.getTasks([ctxResult.task_id]);

      expect(tasks).toHaveLength(1);
      expect(tasks[0]!.task_id).toBe(ctxResult.task_id);
      expect(tasks[0]!.status).toBe("completed");
      expect(tasks[0]!.result).toBeDefined();
      expect(tasks[0]!.error).toBeNull();
    });
  });

  describe("multi-user isolation", () => {
    it("should keep events isolated between users", async () => {
      await store.ingestEvents("user-A", "Lives in Tokyo");
      await store.ingestEvents("user-B", "Lives in London");

      const eventsA = await client.events("user-A");
      const eventsB = await client.events("user-B");

      expect(eventsA).toHaveLength(1);
      expect(eventsB).toHaveLength(1);
      expect(eventsA[0]!.value).toBe("Lives in Tokyo");
      expect(eventsB[0]!.value).toBe("Lives in London");
    });
  });
});
