/**
 * @file types.ts
 * @description JSON-RPC 2.0 envelope types and UPP operation request/response types.
 *
 * Defines method name constants, Zod request schemas, and TypeScript types
 * for all 10 UPP operations along with the standard JSON-RPC structures.
 *
 * Operations:
 *   4 Core: ingest, retrieve, events, delete
 *   2 Discovery: info, labels
 *   2 Contextual: contextualize, get_tasks
 *   2 Portability: export, import
 *
 * @module
 */

import { z } from "zod";
import type { Event, StoredEvent, LabelDefinition, ContextualizeResult, TaskResult } from "../models/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// UPP Method Name Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Extract and ingest events from text. */
export const UPP_INGEST = "upp/ingest" as const;

/** Retrieve relevant events given a query. */
export const UPP_RETRIEVE = "upp/retrieve" as const;

/** List all stored events for a user. */
export const UPP_EVENTS = "upp/events" as const;

/** Delete events for compliance (GDPR, CCPA). */
export const UPP_DELETE = "upp/delete" as const;

/** Return server metadata. */
export const UPP_INFO = "upp/info" as const;

/** List label definitions from an ontology. */
export const UPP_LABELS = "upp/labels" as const;

/** Export events for migration. */
export const UPP_EXPORT = "upp/export" as const;

/** Import events from another server. */
export const UPP_IMPORT = "upp/import" as const;

/** Retrieve context and ingest events in the background. */
export const UPP_CONTEXTUALIZE = "upp/contextualize" as const;

/** Check status of background tasks. */
export const UPP_GET_TASKS = "upp/get_tasks" as const;

/** All UPP method names. */
export const ALL_METHODS = [
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
] as const;

/** Union type of all UPP method names. */
export type UppMethod = (typeof ALL_METHODS)[number];

// ─────────────────────────────────────────────────────────────────────────────
// JSON-RPC 2.0 Envelope Types
// ─────────────────────────────────────────────────────────────────────────────

/** A JSON-RPC 2.0 error object. */
export interface JsonRpcError {
  /** A number indicating the error type. */
  readonly code: number;
  /** A short, human-readable description of the error. */
  readonly message: string;
  /** Additional structured data about the error. */
  readonly data?: Record<string, unknown>;
}

/** A JSON-RPC 2.0 request object. */
export interface JsonRpcRequest {
  /** MUST be exactly "2.0". */
  readonly jsonrpc: "2.0";
  /** Unique request identifier. */
  readonly id: string | number;
  /** The method to invoke. */
  readonly method: string;
  /** Method parameters. */
  readonly params: Record<string, unknown>;
}

/** A JSON-RPC 2.0 success response object. */
export interface JsonRpcResponse<T = unknown> {
  /** MUST be exactly "2.0". */
  readonly jsonrpc: "2.0";
  /** The request ID this response corresponds to. */
  readonly id: string | number | null;
  /** The result of the invoked method (present on success). */
  readonly result?: T;
  /** The error object (present on failure). */
  readonly error?: JsonRpcError;
}

// ─────────────────────────────────────────────────────────────────────────────
// Request Schemas (Zod validation)
// ─────────────────────────────────────────────────────────────────────────────

/** Zod schema for `upp/ingest` request parameters. */
export const IngestRequestSchema = z.object({
  entity_key: z.string().min(1),
  text: z.string().min(1),
});

/** Zod schema for `upp/retrieve` request parameters. */
export const RetrieveRequestSchema = z.object({
  entity_key: z.string().min(1),
  query: z.string().min(1),
});

/** Zod schema for `upp/events` request parameters. */
export const EventsRequestSchema = z.object({
  entity_key: z.string().min(1),
});

/** Zod schema for `upp/delete` request parameters. */
export const DeleteRequestSchema = z.object({
  entity_key: z.string().min(1),
  event_ids: z.array(z.string()).optional(),
});

/** Zod schema for `upp/info` request parameters (empty). */
export const InfoRequestSchema = z.object({});

/** Zod schema for `upp/labels` request parameters. */
export const LabelsRequestSchema = z.object({});

/** Zod schema for `upp/export` request parameters. */
export const ExportRequestSchema = z.object({
  entity_key: z.string().min(1),
});

/** Zod schema for `upp/import` request parameters. */
export const ImportRequestSchema = z.object({
  entity_key: z.string().min(1),
  file: z.string().min(1),
});

// ─────────────────────────────────────────────────────────────────────────────
// Request Types (inferred from Zod schemas)
// ─────────────────────────────────────────────────────────────────────────────

export type IngestRequest = z.infer<typeof IngestRequestSchema>;
export type RetrieveRequest = z.infer<typeof RetrieveRequestSchema>;
export type EventsRequest = z.infer<typeof EventsRequestSchema>;
export type DeleteRequest = z.infer<typeof DeleteRequestSchema>;
export type InfoRequest = z.infer<typeof InfoRequestSchema>;
export type LabelsRequest = z.infer<typeof LabelsRequestSchema>;
export type ExportRequest = z.infer<typeof ExportRequestSchema>;
export type ImportRequest = z.infer<typeof ImportRequestSchema>;

/** Zod schema for `upp/contextualize` request parameters. */
export const ContextualizeRequestSchema = z.object({
  entity_key: z.string().min(1),
  text: z.string().min(1),
});

/** Zod schema for `upp/get_tasks` request parameters. */
export const GetTasksRequestSchema = z.object({
  task_ids: z.array(z.string()).min(1),
});

export type ContextualizeRequest = z.infer<typeof ContextualizeRequestSchema>;
export type GetTasksRequest = z.infer<typeof GetTasksRequestSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Response Types
// ─────────────────────────────────────────────────────────────────────────────

/** Response for `upp/ingest`. */
export type IngestResponse = StoredEvent[];

/** Response for `upp/retrieve`. */
export type RetrieveResponse = Event[];

/** Response for `upp/events`. */
export type EventsResponse = StoredEvent[];

/** Response for `upp/delete`. */
export interface DeleteResponse {
  readonly deleted_count: number;
}

/** Response for `upp/info`. */
export interface InfoResponse {
  readonly protocol_version: string;
  readonly ontology: string;
  readonly operations: string[];
  /** Server conformance level: 1 (Minimal), 2 (Full), or 3 (Portable). */
  readonly conformance_level: number;
}

/** Response for `upp/labels`. */
export type LabelsResponse = LabelDefinition[];

/** Response for `upp/export`. */
export interface ExportResponse {
  readonly file: string;
  readonly event_count: number;
  readonly exported_at: string;
}

/** Response for `upp/import`. */
export interface ImportResponse {
  readonly imported_count: number;
  readonly skipped_count: number;
}

/** Response for `upp/contextualize`. */
export type ContextualizeResponse = ContextualizeResult;

/** Response for `upp/get_tasks`. */
export type GetTasksResponse = TaskResult[];
