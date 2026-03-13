/**
 * @file server.test.ts
 * @description Tests for the UPP JSON-RPC server.
 */

import { describe, it, expect } from "vitest";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { UppServer } from "../../src/rpc/server.js";
import type { IngestBackend } from "../../src/backends/ingest.js";
import type { RetrieverBackend } from "../../src/backends/retriever.js";
import type { OntologyBackend } from "../../src/backends/ontology.js";
import type { Event, StoredEvent, LabelDefinition, TaskResult } from "../../src/models/index.js";
import type { JsonRpcRequest } from "../../src/rpc/types.js";

// ─── Mock Backends ───────────────────────────────────────────────────────────

class MockStore implements IngestBackend {
  events: StoredEvent[] = [];
  private id = 0;
  private tasks = new Map<string, { result: StoredEvent[]; createdAt: string; completedAt: string }>();

  async ingestEvents(entityKey: string, text: string): Promise<StoredEvent[]> {
    const stored: StoredEvent = {
      value: text,
      labels: ["mock"],
      confidence: 1.0,
      source_type: "user_stated",
      id: String(++this.id),
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
      id: String(++this.id),
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

class MockRetriever implements RetrieverBackend {
  async retrieve(entityKey: string, query: string): Promise<Event[]> {
    return [
      {
        value: `Result for: ${query}`,
        labels: ["who_name"],
        confidence: 0.9,
        source_type: "inferred",
      },
    ];
  }
}

class MockOntology implements OntologyBackend {
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
    ];
  }

  async getOntology(): Promise<string> {
    return "user/v1";
  }
}

function createServer() {
  return new UppServer({
    store: new MockStore(),
    retriever: new MockRetriever(),
    ontology: new MockOntology(),
  });
}

function makeRequest(method: string, params: Record<string, unknown> = {}): JsonRpcRequest {
  return { jsonrpc: "2.0", id: 1, method, params };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("UppServer", () => {
  describe("upp/info", () => {
    it("should return server metadata with conformance level", async () => {
      const server = createServer();
      const response = await server.handleRequest(makeRequest("upp/info"));

      expect(response.error).toBeUndefined();
      const result = response.result as {
        protocol_version: string;
        ontology: string;
        operations: string[];
        conformance_level: number;
      };
      expect(result.protocol_version).toBe("2.0.0");
      expect(result.ontology).toBe("user/v1");
      expect(result.operations).toContain("upp/ingest");
      expect(result.operations).toContain("upp/retrieve");
      expect(result.operations).toContain("upp/info");
      expect(result.conformance_level).toBe(3);
    });

    it("should compute conformance level 1 for minimal server", async () => {
      const server = new UppServer({
        store: new MockStore(),
        retriever: new MockRetriever(),
        ontology: new MockOntology(),
        supportedOperations: ["upp/ingest", "upp/retrieve", "upp/info"],
      });
      const response = await server.handleRequest(makeRequest("upp/info"));
      expect(response.error).toBeUndefined();
      const result = response.result as { conformance_level: number };
      expect(result.conformance_level).toBe(1);
    });

    it("should compute conformance level 2 for full server", async () => {
      const server = new UppServer({
        store: new MockStore(),
        retriever: new MockRetriever(),
        ontology: new MockOntology(),
        supportedOperations: [
          "upp/ingest",
          "upp/retrieve",
          "upp/info",
          "upp/events",
          "upp/delete",
          "upp/labels",
          "upp/contextualize",
          "upp/get_tasks",
        ],
      });
      const response = await server.handleRequest(makeRequest("upp/info"));
      expect(response.error).toBeUndefined();
      const result = response.result as { conformance_level: number };
      expect(result.conformance_level).toBe(2);
    });
  });

  describe("upp/labels", () => {
    it("should return label definitions", async () => {
      const server = createServer();
      const response = await server.handleRequest(makeRequest("upp/labels"));

      expect(response.error).toBeUndefined();
      const labels = response.result as LabelDefinition[];
      expect(labels).toHaveLength(1);
      expect(labels[0]!.name).toBe("who_name");
    });
  });

  describe("upp/retrieve", () => {
    it("should retrieve events", async () => {
      const server = createServer();
      const response = await server.handleRequest(
        makeRequest("upp/retrieve", { entity_key: "u1", query: "What is their name?" }),
      );

      expect(response.error).toBeUndefined();
      const events = response.result as Event[];
      expect(events).toHaveLength(1);
      expect(events[0]!.value).toContain("What is their name?");
    });

    it("should reject missing entity_key", async () => {
      const server = createServer();
      const response = await server.handleRequest(makeRequest("upp/retrieve", { query: "test" }));

      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32602);
    });

    it("should reject missing query", async () => {
      const server = createServer();
      const response = await server.handleRequest(
        makeRequest("upp/retrieve", { entity_key: "u1" }),
      );

      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32602);
    });
  });

  describe("upp/events", () => {
    it("should return stored events", async () => {
      const server = createServer();
      const response = await server.handleRequest(makeRequest("upp/events", { entity_key: "u1" }));

      expect(response.error).toBeUndefined();
      expect(response.result).toEqual([]);
    });

    it("should reject missing entity_key", async () => {
      const server = createServer();
      const response = await server.handleRequest(makeRequest("upp/events", {}));

      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32602);
    });
  });

  describe("upp/delete", () => {
    it("should delete events", async () => {
      const server = createServer();
      const response = await server.handleRequest(makeRequest("upp/delete", { entity_key: "u1" }));

      expect(response.error).toBeUndefined();
      const result = response.result as { deleted_count: number };
      expect(result.deleted_count).toBe(0);
    });
  });

  describe("upp/export", () => {
    it("should export events to a file", async () => {
      const server = createServer();
      const response = await server.handleRequest(makeRequest("upp/export", { entity_key: "u1" }));

      expect(response.error).toBeUndefined();
      const result = response.result as { file: string; event_count: number; exported_at: string };
      expect(result.file).toMatch(/\.json$/);
      expect(result.event_count).toBe(0);
      expect(result.exported_at).toBeDefined();
    });
  });

  describe("upp/import", () => {
    it("should import events from a file", async () => {
      const server = createServer();
      const filePath = join(tmpdir(), `upp-test-import-${Date.now()}.json`);
      const exportPackage = {
        entity_key: "u1",
        ontology: "user/v1",
        events: [
          {
            value: "Imported fact",
            labels: ["who_name"],
            confidence: 0.9,
            source_type: "user_stated",
          },
        ],
        exported_at: new Date().toISOString(),
      };
      writeFileSync(filePath, JSON.stringify(exportPackage), "utf-8");

      const response = await server.handleRequest(
        makeRequest("upp/import", { entity_key: "u1", file: filePath }),
      );

      expect(response.error).toBeUndefined();
      const result = response.result as { imported_count: number; skipped_count: number };
      expect(result.imported_count).toBe(1);
      expect(result.skipped_count).toBe(0);
    });

    it("should reject missing file path", async () => {
      const server = createServer();
      const response = await server.handleRequest(makeRequest("upp/import", { entity_key: "u1" }));

      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32602);
    });
  });

  describe("upp/contextualize", () => {
    it("should return events and a task_id", async () => {
      const server = createServer();
      const response = await server.handleRequest(
        makeRequest("upp/contextualize", { entity_key: "u1", text: "Hello world" }),
      );

      expect(response.error).toBeUndefined();
      const result = response.result as { events: Event[]; task_id: string };
      expect(result.events).toBeDefined();
      expect(result.task_id).toBeDefined();
      expect(result.task_id).toMatch(/^task_/);
    });

    it("should reject missing entity_key", async () => {
      const server = createServer();
      const response = await server.handleRequest(
        makeRequest("upp/contextualize", { text: "Hello" }),
      );

      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32602);
    });

    it("should reject missing text", async () => {
      const server = createServer();
      const response = await server.handleRequest(
        makeRequest("upp/contextualize", { entity_key: "u1" }),
      );

      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32602);
    });
  });

  describe("upp/get_tasks", () => {
    it("should return task results", async () => {
      const server = createServer();

      // First create a task via contextualize
      const ctxResponse = await server.handleRequest(
        makeRequest("upp/contextualize", { entity_key: "u1", text: "Hello world" }),
      );
      const ctxResult = ctxResponse.result as { task_id: string };

      // Then check its status
      const response = await server.handleRequest(
        makeRequest("upp/get_tasks", { task_ids: [ctxResult.task_id] }),
      );

      expect(response.error).toBeUndefined();
      const tasks = response.result as TaskResult[];
      expect(tasks).toHaveLength(1);
      expect(tasks[0]!.task_id).toBe(ctxResult.task_id);
      expect(tasks[0]!.status).toBe("completed");
    });

    it("should reject missing task_ids", async () => {
      const server = createServer();
      const response = await server.handleRequest(makeRequest("upp/get_tasks", {}));

      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32602);
    });

    it("should reject empty task_ids array", async () => {
      const server = createServer();
      const response = await server.handleRequest(
        makeRequest("upp/get_tasks", { task_ids: [] }),
      );

      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32602);
    });
  });

  describe("unknown method", () => {
    it("should return method not found for unknown methods", async () => {
      const server = createServer();
      const response = await server.handleRequest(makeRequest("upp/unknown"));

      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32601);
    });
  });

  describe("invalid JSON-RPC", () => {
    it("should reject invalid jsonrpc version", async () => {
      const server = createServer();
      const response = await server.handleRequest({
        jsonrpc: "1.0" as "2.0",
        id: 1,
        method: "upp/info",
        params: {},
      });

      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32600);
    });
  });
});
