/**
 * @file client.ts
 * @description UPP JSON-RPC 2.0 client implementation.
 *
 * The {@link UppClient} provides type-safe methods for invoking all 10 UPP
 * operations over an abstract transport layer. The transport is provided as
 * a function, making the client agnostic to the underlying communication
 * mechanism (stdio, HTTP, WebSocket, in-process, etc.).
 *
 * @module
 */

import { UppError, INTERNAL_ERROR } from "./errors.js";
import type { JsonRpcRequest, JsonRpcResponse, InfoResponse, ExportResponse } from "./types.js";
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
} from "./types.js";
import type { Event, StoredEvent, LabelDefinition, ContextualizeResult, TaskResult } from "../models/index.js";
import type { ImportResponse } from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Transport Type
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transport function type. Takes a JSON-RPC request and returns a response.
 *
 * Implementations may use stdio, HTTP, WebSocket, or in-process dispatch.
 */
export type UppTransport = (request: JsonRpcRequest) => Promise<JsonRpcResponse>;

// ─────────────────────────────────────────────────────────────────────────────
// UPP Client
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Type-safe UPP JSON-RPC 2.0 client.
 *
 * Wraps a transport function and provides typed methods for each UPP
 * operation. Auto-increments request IDs and handles error deserialization.
 *
 * @example
 * ```typescript
 * const client = new UppClient(myTransport);
 *
 * const info = await client.info();
 * console.log(info.protocol_version);
 *
 * const events = await client.retrieve("user-123", "What is their name?");
 * ```
 */
export class UppClient {
  private readonly transport: UppTransport;
  private nextId = 1;

  /**
   * Creates a new UppClient.
   *
   * @param transport - Function that sends JSON-RPC requests and returns responses.
   */
  constructor(transport: UppTransport) {
    this.transport = transport;
  }

  // ─── Core Operations ───────────────────────────────────────────────────

  /**
   * Extract and ingest events from text (upp/ingest).
   *
   * @param entityKey - Identifier of the user.
   * @param text - Text from which to extract events.
   * @returns Stored events with server-assigned metadata.
   */
  async ingest(entityKey: string, text: string): Promise<StoredEvent[]> {
    const params: Record<string, unknown> = { entity_key: entityKey, text };
    return this.call<StoredEvent[]>(UPP_INGEST, params);
  }

  /**
   * Retrieve relevant events for a query (upp/retrieve).
   *
   * @param entityKey - Identifier of the user.
   * @param query - Free-text query.
   * @returns Relevant events ranked by the server.
   */
  async retrieve(entityKey: string, query: string): Promise<Event[]> {
    const params: Record<string, unknown> = { entity_key: entityKey, query };
    return this.call<Event[]>(UPP_RETRIEVE, params);
  }

  /**
   * List all stored events for a user (upp/events).
   *
   * @param entityKey - Identifier of the user.
   * @returns All stored events.
   */
  async events(entityKey: string): Promise<StoredEvent[]> {
    const params: Record<string, unknown> = { entity_key: entityKey };
    return this.call<StoredEvent[]>(UPP_EVENTS, params);
  }

  /**
   * Delete events for a user (upp/delete).
   *
   * @param entityKey - Identifier of the user.
   * @param eventIds - Specific event IDs to delete. If undefined, deletes all.
   * @returns Number of events deleted.
   */
  async delete(entityKey: string, eventIds?: string[]): Promise<number> {
    const params: Record<string, unknown> = { entity_key: entityKey };
    if (eventIds !== undefined) params.event_ids = eventIds;
    const result = await this.call<{ deleted_count: number }>(UPP_DELETE, params);
    return result.deleted_count;
  }

  // ─── Discovery Operations ──────────────────────────────────────────────

  /**
   * Return server metadata (upp/info).
   *
   * @returns Server information including protocol version, ontologies, operations.
   */
  async info(): Promise<InfoResponse> {
    return this.call<InfoResponse>(UPP_INFO, {});
  }

  /**
   * List label definitions (upp/labels).
   *
   * @returns Label definitions.
   */
  async labels(): Promise<LabelDefinition[]> {
    return this.call<LabelDefinition[]>(UPP_LABELS, {});
  }

  // ─── Portability Operations ────────────────────────────────────────────

  /**
   * Export events for a user (upp/export).
   *
   * @param entityKey - Identifier of the user.
   * @returns Export bundle with events and metadata.
   */
  async export(entityKey: string): Promise<ExportResponse> {
    const params: Record<string, unknown> = { entity_key: entityKey };
    return this.call<ExportResponse>(UPP_EXPORT, params);
  }

  /**
   * Import events for a user from a file (upp/import).
   *
   * @param entityKey - Identifier of the user.
   * @param file - Path to the JSON export file to import.
   * @returns Import result with counts.
   */
  async import(entityKey: string, file: string): Promise<ImportResponse> {
    const params: Record<string, unknown> = { entity_key: entityKey, file };
    return this.call<ImportResponse>(UPP_IMPORT, params);
  }

  // ─── Contextual Operations ─────────────────────────────────────────────

  /**
   * Retrieve context and ingest in the background (upp/contextualize).
   *
   * @param entityKey - Identifier of the user.
   * @param text - Text to retrieve context for and extract events from.
   * @returns Relevant events and a task_id for the background ingest.
   */
  async contextualize(entityKey: string, text: string): Promise<ContextualizeResult> {
    const params: Record<string, unknown> = { entity_key: entityKey, text };
    return this.call<ContextualizeResult>(UPP_CONTEXTUALIZE, params);
  }

  /**
   * Check status of background tasks (upp/get_tasks).
   *
   * @param taskIds - One or more task IDs to check.
   * @returns Task status objects with results.
   */
  async getTasks(taskIds: string[]): Promise<TaskResult[]> {
    const params: Record<string, unknown> = { task_ids: taskIds };
    return this.call<TaskResult[]>(UPP_GET_TASKS, params);
  }

  // ─── Internal Transport ────────────────────────────────────────────────

  /**
   * Sends a JSON-RPC request via the transport and handles the response.
   *
   * @param method - The UPP method name.
   * @param params - The method parameters.
   * @returns The typed result.
   * @throws {UppError} If the response contains an error.
   */
  private async call<T>(method: string, params: Record<string, unknown>): Promise<T> {
    const id = this.nextId++;

    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    const response = await this.transport(request);

    // Check for error response
    if (response.error) {
      throw new UppError(response.error.code, response.error.message, response.error.data);
    }

    if (response.result === undefined) {
      throw new UppError(INTERNAL_ERROR, "Empty response from server");
    }

    return response.result as T;
  }
}
