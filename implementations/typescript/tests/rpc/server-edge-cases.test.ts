/**
 * @file server-edge-cases.test.ts
 * @description Edge case tests for the UPP JSON-RPC server.
 */

import { describe, it, expect } from "vitest";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { UppServer } from "../../src/rpc/server.js";
import type { IngestBackend } from "../../src/backends/ingest.js";
import type { RetrieverBackend } from "../../src/backends/retriever.js";
import type { OntologyBackend } from "../../src/backends/ontology.js";
import type { Event, StoredEvent, LabelDefinition } from "../../src/models/index.js";
import type { JsonRpcRequest } from "../../src/rpc/types.js";
import { UppError, INGEST_FAILED } from "../../src/rpc/errors.js";

// ─── Mock Backends ───────────────────────────────────────────────────────────

class MinimalStore implements IngestBackend {
  async ingestEvents(): Promise<StoredEvent[]> {
    return [];
  }
  async getEvents(): Promise<StoredEvent[]> {
    return [];
  }
  async deleteEvents(): Promise<number> {
    return 0;
  }
  async exportEvents(): Promise<StoredEvent[]> {
    return [];
  }
  async importEvents(): Promise<StoredEvent[]> {
    return [];
  }
}

class FailingStore implements IngestBackend {
  async ingestEvents(): Promise<StoredEvent[]> {
    throw new UppError(INGEST_FAILED, "Database connection lost");
  }
  async getEvents(): Promise<StoredEvent[]> {
    throw new Error("Unexpected error");
  }
  async deleteEvents(): Promise<number> {
    return 0;
  }
  async exportEvents(): Promise<StoredEvent[]> {
    return [];
  }
  async importEvents(): Promise<StoredEvent[]> {
    throw new UppError(INGEST_FAILED, "Database connection lost");
  }
}

class MinimalRetriever implements RetrieverBackend {
  async retrieve(): Promise<Event[]> {
    return [];
  }
}

class MinimalOntology implements OntologyBackend {
  async getLabels(): Promise<LabelDefinition[]> {
    return [];
  }
  async getOntology(): Promise<string> {
    return "user/v1";
  }
}

function makeRequest(method: string, params: Record<string, unknown> = {}): JsonRpcRequest {
  return { jsonrpc: "2.0", id: 1, method, params };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("UppServer edge cases", () => {
  it("should return extraction failed for upp/ingest (not implemented)", async () => {
    const server = new UppServer({
      store: new MinimalStore(),
      retriever: new MinimalRetriever(),
      ontology: new MinimalOntology(),
    });

    const response = await server.handleRequest(
      makeRequest("upp/ingest", { entity_key: "u1", text: "hello" }),
    );

    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe(-32004); // EXTRACTION_FAILED
  });

  it("should handle UppError thrown by backends", async () => {
    const server = new UppServer({
      store: new FailingStore(),
      retriever: new MinimalRetriever(),
      ontology: new MinimalOntology(),
    });

    // Create a temp file for import to trigger the FailingStore UppError
    const filePath = join(tmpdir(), `upp-test-failing-${Date.now()}.json`);
    writeFileSync(
      filePath,
      JSON.stringify({
        entity_key: "u1",
        ontology: "user/v1",
        events: [
          { value: "test", labels: ["who_name"], confidence: 0.9, source_type: "user_stated" },
        ],
        exported_at: new Date().toISOString(),
      }),
      "utf-8",
    );

    const response = await server.handleRequest(
      makeRequest("upp/import", {
        entity_key: "u1",
        file: filePath,
      }),
    );

    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe(-32003);
    expect(response.error!.message).toBe("Database connection lost");
  });

  it("should handle generic errors thrown by backends", async () => {
    const server = new UppServer({
      store: new FailingStore(),
      retriever: new MinimalRetriever(),
      ontology: new MinimalOntology(),
    });

    const response = await server.handleRequest(makeRequest("upp/events", { entity_key: "u1" }));

    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe(-32603); // Internal error
    expect(response.error!.message).toBe("Internal error");
  });

  it("should work with limited supported operations", async () => {
    const server = new UppServer({
      store: new MinimalStore(),
      retriever: new MinimalRetriever(),
      ontology: new MinimalOntology(),
      supportedOperations: ["upp/info", "upp/retrieve"],
    });

    // info should work
    const infoResponse = await server.handleRequest(makeRequest("upp/info"));
    expect(infoResponse.error).toBeUndefined();

    // ingest should fail as not supported
    const storeResponse = await server.handleRequest(
      makeRequest("upp/ingest", { entity_key: "u1", text: "hello" }),
    );
    expect(storeResponse.error).toBeDefined();
    expect(storeResponse.error!.code).toBe(-32601);
  });

  it("should handle request with string ID", async () => {
    const server = new UppServer({
      store: new MinimalStore(),
      retriever: new MinimalRetriever(),
      ontology: new MinimalOntology(),
    });

    const response = await server.handleRequest({
      jsonrpc: "2.0",
      id: "abc-123",
      method: "upp/info",
      params: {},
    });

    expect(response.id).toBe("abc-123");
    expect(response.error).toBeUndefined();
  });

  it("should validate upp/ingest params", async () => {
    const server = new UppServer({
      store: new MinimalStore(),
      retriever: new MinimalRetriever(),
      ontology: new MinimalOntology(),
    });

    // Missing text
    const response = await server.handleRequest(makeRequest("upp/ingest", { entity_key: "u1" }));
    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe(-32602);
  });

  it("should validate upp/delete params", async () => {
    const server = new UppServer({
      store: new MinimalStore(),
      retriever: new MinimalRetriever(),
      ontology: new MinimalOntology(),
    });

    // Missing entity_key
    const response = await server.handleRequest(makeRequest("upp/delete", {}));
    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe(-32602);
  });

  it("should validate upp/export params", async () => {
    const server = new UppServer({
      store: new MinimalStore(),
      retriever: new MinimalRetriever(),
      ontology: new MinimalOntology(),
    });

    // Missing entity_key
    const response = await server.handleRequest(makeRequest("upp/export", {}));
    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe(-32602);
  });

  it("should validate upp/import requires file", async () => {
    const server = new UppServer({
      store: new MinimalStore(),
      retriever: new MinimalRetriever(),
      ontology: new MinimalOntology(),
    });

    // Missing file
    const response = await server.handleRequest(makeRequest("upp/import", { entity_key: "u1" }));
    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe(-32602);
  });

  it("should return error when import file cannot be read or parsed", async () => {
    const server = new UppServer({
      store: new MinimalStore(),
      retriever: new MinimalRetriever(),
      ontology: new MinimalOntology(),
    });

    const response = await server.handleRequest(
      makeRequest("upp/import", {
        entity_key: "u1",
        file: "/nonexistent/path/file.json",
      }),
    );

    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe(-32602);
    expect(response.error!.data).toHaveProperty("detail", "Failed to read or parse import file");
  });

  it("should return error when import file is missing events array", async () => {
    const server = new UppServer({
      store: new MinimalStore(),
      retriever: new MinimalRetriever(),
      ontology: new MinimalOntology(),
    });

    const filePath = join(tmpdir(), `upp-test-no-events-${Date.now()}.json`);
    writeFileSync(filePath, JSON.stringify({ entity_key: "u1" }), "utf-8");

    const response = await server.handleRequest(
      makeRequest("upp/import", {
        entity_key: "u1",
        file: filePath,
      }),
    );

    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe(-32602);
    expect(response.error!.data).toHaveProperty("detail", "Import file missing events array");
  });

  it("should validate upp/labels params", async () => {
    const server = new UppServer({
      store: new MinimalStore(),
      retriever: new MinimalRetriever(),
      ontology: new MinimalOntology(),
    });

    // Pass non-object params to trigger validation failure
    const response = await server.handleRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "upp/labels",
      params: "invalid" as unknown as Record<string, unknown>,
    });

    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe(-32602);
  });

  it("should reject import file without .json extension", async () => {
    const server = new UppServer({
      store: new MinimalStore(),
      retriever: new MinimalRetriever(),
      ontology: new MinimalOntology(),
    });

    const response = await server.handleRequest(
      makeRequest("upp/import", {
        entity_key: "u1",
        file: "/tmp/data.txt",
      }),
    );

    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe(-32602);
    expect(response.error!.data).toHaveProperty("detail", "File must end with .json");
  });

  it("should handle invalid jsonrpc version with missing id", async () => {
    const server = new UppServer({
      store: new MinimalStore(),
      retriever: new MinimalRetriever(),
      ontology: new MinimalOntology(),
    });

    const response = await server.handleRequest({
      jsonrpc: "1.0" as "2.0",
      id: undefined as unknown as number,
      method: "upp/info",
      params: {},
    });

    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe(-32600);
    // id should fall back to null → 0 in error response
    expect(response.id).toBe(0);
  });

  it("should handle non-Error objects thrown by backends", async () => {
    // Create a store that throws a non-Error value
    class StringThrowingStore implements IngestBackend {
      async ingestEvents(): Promise<StoredEvent[]> {
        return [];
      }
      async getEvents(): Promise<StoredEvent[]> {
        throw "string error";
      }
      async deleteEvents(): Promise<number> {
        return 0;
      }
      async exportEvents(): Promise<StoredEvent[]> {
        return [];
      }
      async importEvents(): Promise<StoredEvent[]> {
        return [];
      }
    }

    const server = new UppServer({
      store: new StringThrowingStore(),
      retriever: new MinimalRetriever(),
      ontology: new MinimalOntology(),
    });

    const response = await server.handleRequest(makeRequest("upp/events", { entity_key: "u1" }));

    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe(-32603);
    expect(response.error!.data).toHaveProperty("detail", "Unknown error");
  });

  it("should return method not found for supported but unhandled method via default branch", async () => {
    // Force a method through the supported operations check but not handled by the switch
    const server = new UppServer({
      store: new MinimalStore(),
      retriever: new MinimalRetriever(),
      ontology: new MinimalOntology(),
      supportedOperations: ["upp/ingest", "upp/retrieve", "upp/info", "upp/custom"],
    });

    const response = await server.handleRequest(makeRequest("upp/custom"));

    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe(-32601); // Method not found
  });
});
