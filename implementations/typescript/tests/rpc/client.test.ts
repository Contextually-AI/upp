/**
 * @file client.test.ts
 * @description Tests for the UPP JSON-RPC client.
 */

import { describe, it, expect, vi } from "vitest";
import { UppClient } from "../../src/rpc/client.js";
import { UppError } from "../../src/rpc/errors.js";
import type { JsonRpcRequest, JsonRpcResponse } from "../../src/rpc/types.js";

/** Helper: create a mock transport that returns a success response. */
function mockTransport(result: unknown) {
  return vi.fn(
    async (req: JsonRpcRequest): Promise<JsonRpcResponse> => ({
      jsonrpc: "2.0",
      id: req.id,
      result,
    }),
  );
}

/** Helper: create a mock transport that returns an error response. */
function errorTransport(code: number, message: string) {
  return vi.fn(
    async (req: JsonRpcRequest): Promise<JsonRpcResponse> => ({
      jsonrpc: "2.0",
      id: req.id,
      error: { code, message },
    }),
  );
}

describe("UppClient", () => {
  describe("ingest", () => {
    it("should send an ingest request", async () => {
      const transport = mockTransport([
        {
          id: "1",
          entity_key: "u1",
          value: "Fact",
          labels: ["l"],
          status: "valid",
          created_at: "2026-01-01T00:00:00Z",
        },
      ]);
      const client = new UppClient(transport);

      const result = await client.ingest("u1", "Some text");

      expect(transport).toHaveBeenCalledOnce();
      const req = transport.mock.calls[0]![0];
      expect(req.method).toBe("upp/ingest");
      expect(req.params.entity_key).toBe("u1");
      expect(req.params.text).toBe("Some text");
      expect(result).toHaveLength(1);
    });

    it("should not include ontology in request", async () => {
      const transport = mockTransport([]);
      const client = new UppClient(transport);

      await client.ingest("u1", "Text");

      const req = transport.mock.calls[0]![0];
      expect(req.params.ontology).toBeUndefined();
    });
  });

  describe("retrieve", () => {
    it("should send a retrieve request", async () => {
      const transport = mockTransport([
        {
          value: "Lives in Tokyo",
          labels: ["where_home"],
          confidence: 0.9,
          source_type: "user_stated",
        },
      ]);
      const client = new UppClient(transport);

      const result = await client.retrieve("u1", "Where does the user live?");

      const req = transport.mock.calls[0]![0];
      expect(req.method).toBe("upp/retrieve");
      expect(req.params.query).toBe("Where does the user live?");
      expect(result).toHaveLength(1);
    });
  });

  describe("events", () => {
    it("should send an events request", async () => {
      const transport = mockTransport([]);
      const client = new UppClient(transport);

      await client.events("u1");

      const req = transport.mock.calls[0]![0];
      expect(req.method).toBe("upp/events");
      expect(req.params.entity_key).toBe("u1");
    });
  });

  describe("delete", () => {
    it("should send a delete request and return count", async () => {
      const transport = mockTransport({ deleted_count: 5 });
      const client = new UppClient(transport);

      const count = await client.delete("u1");

      const req = transport.mock.calls[0]![0];
      expect(req.method).toBe("upp/delete");
      expect(count).toBe(5);
    });

    it("should include event_ids when provided", async () => {
      const transport = mockTransport({ deleted_count: 2 });
      const client = new UppClient(transport);

      await client.delete("u1", ["id-1", "id-2"]);

      const req = transport.mock.calls[0]![0];
      expect(req.params.event_ids).toEqual(["id-1", "id-2"]);
    });
  });

  describe("info", () => {
    it("should send an info request", async () => {
      const transport = mockTransport({
        protocol_version: "2.0.0",
        ontology: "user/v1",
        operations: ["upp/ingest", "upp/retrieve", "upp/info"],
        conformance_level: 1,
      });
      const client = new UppClient(transport);

      const info = await client.info();

      const req = transport.mock.calls[0]![0];
      expect(req.method).toBe("upp/info");
      expect(info.protocol_version).toBe("2.0.0");
      expect(info.ontology).toBe("user/v1");
      expect(info.conformance_level).toBe(1);
    });
  });

  describe("labels", () => {
    it("should send a labels request", async () => {
      const transport = mockTransport([
        {
          name: "who_name",
          display_name: "Name",
          description: "Full name",
          category: "WHO",
          sensitivity: "tier_personal",
          cardinality: "singular",
          durability: "permanent",
        },
      ]);
      const client = new UppClient(transport);

      const labels = await client.labels();

      const req = transport.mock.calls[0]![0];
      expect(req.method).toBe("upp/labels");
      expect(labels).toHaveLength(1);
    });
  });

  describe("export", () => {
    it("should send an export request", async () => {
      const transport = mockTransport({
        file: "/tmp/upp-export-u1-12345.json",
        event_count: 0,
        exported_at: "2026-01-01T00:00:00Z",
      });
      const client = new UppClient(transport);

      const result = await client.export("u1");

      const req = transport.mock.calls[0]![0];
      expect(req.method).toBe("upp/export");
      expect(result.file).toMatch(/\.json$/);
      expect(result.event_count).toBe(0);
      expect(result.exported_at).toBeDefined();
    });
  });

  describe("import", () => {
    it("should send an import request with file path", async () => {
      const transport = mockTransport({
        imported_count: 1,
        skipped_count: 0,
      });
      const client = new UppClient(transport);

      const result = await client.import("u1", "/tmp/upp-export-u1-12345.json");

      const req = transport.mock.calls[0]![0];
      expect(req.method).toBe("upp/import");
      expect(req.params.file).toBe("/tmp/upp-export-u1-12345.json");
      expect(result.imported_count).toBe(1);
      expect(result.skipped_count).toBe(0);
    });
  });

  describe("contextualize", () => {
    it("should send a contextualize request", async () => {
      const transport = mockTransport({
        events: [
          {
            value: "Lives in Tokyo",
            labels: ["where_home"],
            confidence: 0.9,
            source_type: "user_stated",
          },
        ],
        task_id: "task_abc123",
      });
      const client = new UppClient(transport);

      const result = await client.contextualize("u1", "Where does the user live?");

      const req = transport.mock.calls[0]![0];
      expect(req.method).toBe("upp/contextualize");
      expect(req.params.entity_key).toBe("u1");
      expect(req.params.text).toBe("Where does the user live?");
      expect(result.events).toHaveLength(1);
      expect(result.task_id).toBe("task_abc123");
    });
  });

  describe("getTasks", () => {
    it("should send a get_tasks request", async () => {
      const transport = mockTransport([
        {
          task_id: "task_abc123",
          status: "completed",
          result: [],
          error: null,
          created_at: "2026-01-01T00:00:00Z",
          completed_at: "2026-01-01T00:00:01Z",
        },
      ]);
      const client = new UppClient(transport);

      const tasks = await client.getTasks(["task_abc123"]);

      const req = transport.mock.calls[0]![0];
      expect(req.method).toBe("upp/get_tasks");
      expect(req.params.task_ids).toEqual(["task_abc123"]);
      expect(tasks).toHaveLength(1);
      expect(tasks[0]!.status).toBe("completed");
    });
  });

  describe("error handling", () => {
    it("should throw UppError on error response", async () => {
      const transport = errorTransport(-32001, "User not found");
      const client = new UppClient(transport);

      await expect(client.events("nonexistent")).rejects.toThrow(UppError);
      await expect(client.events("nonexistent")).rejects.toMatchObject({
        code: -32001,
        message: "User not found",
      });
    });

    it("should auto-increment request IDs", async () => {
      const transport = mockTransport([]);
      const client = new UppClient(transport);

      await client.events("u1");
      await client.events("u2");

      expect(transport.mock.calls[0]![0].id).toBe(1);
      expect(transport.mock.calls[1]![0].id).toBe(2);
    });

    it("should throw UppError when response has no result and no error", async () => {
      const transport = vi.fn(
        async (req: JsonRpcRequest): Promise<JsonRpcResponse> => ({
          jsonrpc: "2.0",
          id: req.id,
        }),
      );
      const client = new UppClient(transport);

      await expect(client.info()).rejects.toThrow(UppError);
      await expect(client.info()).rejects.toMatchObject({
        message: "Empty response from server",
      });
    });
  });
});
