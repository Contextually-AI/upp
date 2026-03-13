/**
 * @file server.ts
 * @description UPP JSON-RPC 2.0 server implementation.
 *
 * The {@link UppServer} accepts backend instances and dispatches incoming
 * JSON-RPC requests to the appropriate handler. Implements all 10 UPP
 * operations with Zod request validation.
 *
 * @module
 */

import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import type { IngestBackend, RetrieverBackend, OntologyBackend } from "../backends/index.js";

import {
  UppError,
  invalidParams,
  methodNotFound,
  internalError,
  extractionFailed,
  INVALID_REQUEST,
} from "./errors.js";

import type { JsonRpcRequest, JsonRpcResponse, InfoResponse } from "./types.js";

import {
  UPP_INGEST,
  UPP_RETRIEVE,
  UPP_EVENTS,
  UPP_DELETE,
  UPP_INFO,
  UPP_LABELS,
  UPP_EXPORT,
  UPP_IMPORT,
  UPP_CONTEXTUALIZE,
  UPP_GET_TASKS,
  ALL_METHODS,
  IngestRequestSchema,
  RetrieveRequestSchema,
  EventsRequestSchema,
  DeleteRequestSchema,
  InfoRequestSchema,
  LabelsRequestSchema,
  ExportRequestSchema,
  ImportRequestSchema,
  ContextualizeRequestSchema,
  GetTasksRequestSchema,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Server Configuration
// ─────────────────────────────────────────────────────────────────────────────

/** Protocol version reported by the server. */
const PROTOCOL_VERSION = "2.0.0";

/**
 * Configuration for creating a {@link UppServer} instance.
 */
export interface UppServerConfig {
  /** Store backend for event persistence. */
  readonly store: IngestBackend;

  /** Retriever backend for intelligent retrieval. */
  readonly retriever: RetrieverBackend;

  /** Ontology backend for label definitions and metadata. */
  readonly ontology: OntologyBackend;

  /** Operations supported by this server. Defaults to all. */
  readonly supportedOperations?: readonly string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// UPP Server
// ─────────────────────────────────────────────────────────────────────────────

/**
 * UPP JSON-RPC 2.0 server.
 *
 * Accepts backend instances and dispatches incoming JSON-RPC requests.
 * Validates request parameters using Zod schemas and returns proper
 * JSON-RPC responses with UPP error codes.
 *
 * @example
 * ```typescript
 * const server = new UppServer({
 *   store: myIngestBackend,
 *   retriever: myRetrieverBackend,
 *   ontology: myOntologyBackend,
 * });
 *
 * const response = await server.handleRequest({
 *   jsonrpc: "2.0",
 *   id: 1,
 *   method: "upp/info",
 *   params: {},
 * });
 * ```
 */
export class UppServer {
  private readonly store: IngestBackend;
  private readonly retriever: RetrieverBackend;
  private readonly ontology: OntologyBackend;
  private readonly supportedOperations: readonly string[];

  /**
   * Creates a new UppServer.
   *
   * @param config - Server configuration with backend instances.
   */
  constructor(config: UppServerConfig) {
    this.store = config.store;
    this.retriever = config.retriever;
    this.ontology = config.ontology;
    this.supportedOperations = config.supportedOperations ?? [...ALL_METHODS];
  }

  /**
   * Dispatches a JSON-RPC request to the appropriate handler.
   *
   * @param request - A valid JSON-RPC 2.0 request object.
   * @returns A JSON-RPC 2.0 response (success or error).
   */
  async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    try {
      // Validate JSON-RPC structure
      if (request.jsonrpc !== "2.0") {
        return this.errorResponse(
          request.id ?? null,
          new UppError(INVALID_REQUEST, "Invalid Request: jsonrpc must be '2.0'"),
        );
      }

      const { method, params, id } = request;

      // Check if operation is supported
      if (!this.supportedOperations.includes(method)) {
        return this.errorResponse(id, methodNotFound(method));
      }

      // Dispatch to handlers
      switch (method) {
        case UPP_INGEST: {
          const parsed = IngestRequestSchema.safeParse(params);
          if (!parsed.success) {
            return this.errorResponse(id, invalidParams(parsed.error.message));
          }
          // Text extraction requires a domain-specific extraction backend
          // that is not part of the SDK. Implementations must override this
          // handler or provide an extraction hook. Fail explicitly.
          return this.errorResponse(
            id,
            extractionFailed(
              "Text extraction is not implemented. " +
                "Provide an extraction backend or override the upp/ingest handler.",
            ),
          );
        }

        case UPP_RETRIEVE: {
          const parsed = RetrieveRequestSchema.safeParse(params);
          if (!parsed.success) {
            return this.errorResponse(id, invalidParams(parsed.error.message));
          }
          const events = await this.retriever.retrieve(parsed.data.entity_key, parsed.data.query);
          return this.successResponse(id, events);
        }

        case UPP_EVENTS: {
          const parsed = EventsRequestSchema.safeParse(params);
          if (!parsed.success) {
            return this.errorResponse(id, invalidParams(parsed.error.message));
          }
          const events = await this.store.getEvents(parsed.data.entity_key);
          return this.successResponse(id, events);
        }

        case UPP_DELETE: {
          const parsed = DeleteRequestSchema.safeParse(params);
          if (!parsed.success) {
            return this.errorResponse(id, invalidParams(parsed.error.message));
          }
          const count = await this.store.deleteEvents(
            parsed.data.entity_key,
            parsed.data.event_ids,
          );
          return this.successResponse(id, { deleted_count: count });
        }

        case UPP_INFO: {
          InfoRequestSchema.safeParse(params); // validate (no required fields)
          const ontology = await this.ontology.getOntology();
          const ops = this.supportedOperations;
          const info: InfoResponse = {
            protocol_version: PROTOCOL_VERSION,
            ontology,
            operations: [...ops],
            conformance_level: this.computeConformanceLevel(ops),
          };
          return this.successResponse(id, info);
        }

        case UPP_LABELS: {
          const parsed = LabelsRequestSchema.safeParse(params);
          if (!parsed.success) {
            return this.errorResponse(id, invalidParams(parsed.error.message));
          }
          const labels = await this.ontology.getLabels();
          return this.successResponse(id, labels);
        }

        case UPP_EXPORT: {
          const parsed = ExportRequestSchema.safeParse(params);
          if (!parsed.success) {
            return this.errorResponse(id, invalidParams(parsed.error.message));
          }
          const entityKey = parsed.data.entity_key;
          const events = await this.store.exportEvents(entityKey);
          const ontology = await this.ontology.getOntology();
          const exportedAt = new Date().toISOString();
          const exportPackage = {
            entity_key: entityKey,
            ontology,
            events,
            exported_at: exportedAt,
          };
          const filePath = join(tmpdir(), `upp-export-${entityKey}-${Date.now()}.json`);
          writeFileSync(filePath, JSON.stringify(exportPackage, null, 2), "utf-8");
          return this.successResponse(id, {
            file: filePath,
            event_count: events.length,
            exported_at: exportedAt,
          });
        }

        case UPP_IMPORT: {
          const parsed = ImportRequestSchema.safeParse(params);
          if (!parsed.success) {
            return this.errorResponse(id, invalidParams(parsed.error.message));
          }
          const filePath = parsed.data.file;
          if (!filePath.endsWith(".json")) {
            return this.errorResponse(id, invalidParams("File must end with .json"));
          }
          let packageData: { events: Array<Record<string, unknown>> };
          try {
            const raw = readFileSync(filePath, "utf-8");
            packageData = JSON.parse(raw);
          } catch {
            return this.errorResponse(id, invalidParams("Failed to read or parse import file"));
          }
          if (!Array.isArray(packageData.events)) {
            return this.errorResponse(id, invalidParams("Import file missing events array"));
          }
          const imported = await this.store.importEvents(
            parsed.data.entity_key,
            packageData.events as import("../models/index.js").Event[],
          );
          return this.successResponse(id, {
            imported_count: imported.length,
            skipped_count: 0,
          });
        }

        case UPP_CONTEXTUALIZE: {
          const parsed = ContextualizeRequestSchema.safeParse(params);
          if (!parsed.success) {
            return this.errorResponse(id, invalidParams(parsed.error.message));
          }
          const events = await this.retriever.retrieve(parsed.data.entity_key, parsed.data.text);
          const taskId = await this.store.scheduleIngest(parsed.data.entity_key, parsed.data.text);
          return this.successResponse(id, { events, task_id: taskId });
        }

        case UPP_GET_TASKS: {
          const parsed = GetTasksRequestSchema.safeParse(params);
          if (!parsed.success) {
            return this.errorResponse(id, invalidParams(parsed.error.message));
          }
          const tasks = await this.store.getTasks(parsed.data.task_ids);
          return this.successResponse(id, tasks);
        }

        default:
          return this.errorResponse(id, methodNotFound(method));
      }
    } catch (error) {
      if (error instanceof UppError) {
        return this.errorResponse(request.id, error);
      }
      return this.errorResponse(
        request.id,
        internalError(error instanceof Error ? error.message : "Unknown error"),
      );
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Computes the conformance level based on supported operations.
   *
   * - Level 3 (Portable): all of Level 2 + export, import
   * - Level 2 (Full): ingest, retrieve, info, events, delete, labels, contextualize, get_tasks
   * - Level 1 (Minimal): ingest, retrieve, info
   */
  private computeConformanceLevel(ops: readonly string[]): number {
    const has = (m: string) => ops.includes(m);
    const hasLevel2 =
      has(UPP_INGEST) &&
      has(UPP_RETRIEVE) &&
      has(UPP_INFO) &&
      has(UPP_EVENTS) &&
      has(UPP_DELETE) &&
      has(UPP_LABELS) &&
      has(UPP_CONTEXTUALIZE) &&
      has(UPP_GET_TASKS);
    if (hasLevel2 && has(UPP_EXPORT) && has(UPP_IMPORT)) {
      return 3;
    }
    if (hasLevel2) {
      return 2;
    }
    return 1;
  }

  // ─── Response Builders ───────────────────────────────────────────────────

  /** Creates a JSON-RPC success response. */
  private successResponse<T>(id: string | number, result: T): JsonRpcResponse<T> {
    return { jsonrpc: "2.0", id, result };
  }

  /** Creates a JSON-RPC error response from an UppError. */
  private errorResponse(id: string | number | null, error: UppError): JsonRpcResponse {
    return {
      jsonrpc: "2.0",
      id: id ?? 0,
      error: error.toJsonRpcError(),
    };
  }
}
