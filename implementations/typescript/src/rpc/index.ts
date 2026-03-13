/**
 * @file index.ts
 * @description Barrel export for the UPP JSON-RPC 2.0 layer.
 *
 * Exports error codes, error classes, request/response types, method
 * constants, the server implementation, and the client implementation.
 *
 * @module
 */

// ─── Errors ──────────────────────────────────────────────────────────────────
export {
  // Standard JSON-RPC error codes
  PARSE_ERROR,
  INVALID_REQUEST,
  METHOD_NOT_FOUND,
  INVALID_PARAMS,
  INTERNAL_ERROR,
  // UPP-specific error codes
  USER_NOT_FOUND,
  ONTOLOGY_NOT_FOUND,
  INGEST_FAILED,
  EXTRACTION_FAILED,
  // Error utilities
  getErrorName,
  UppError,
  invalidParams,
  methodNotFound,
  userNotFound,
  ontologyNotFound,
  ingestFailed,
  extractionFailed,
  internalError,
} from "./errors.js";

// ─── Types ───────────────────────────────────────────────────────────────────
export {
  // Method constants
  UPP_INGEST,
  UPP_RETRIEVE,
  UPP_EVENTS,
  UPP_DELETE,
  UPP_INFO,
  UPP_LABELS,
  UPP_EXPORT,
  UPP_IMPORT,
  ALL_METHODS,
  // Request schemas
  IngestRequestSchema,
  RetrieveRequestSchema,
  EventsRequestSchema,
  DeleteRequestSchema,
  InfoRequestSchema,
  LabelsRequestSchema,
  ExportRequestSchema,
  ImportRequestSchema,
} from "./types.js";

export type {
  UppMethod,
  JsonRpcError,
  JsonRpcRequest,
  JsonRpcResponse,
  IngestRequest,
  RetrieveRequest,
  EventsRequest,
  DeleteRequest,
  InfoRequest,
  LabelsRequest,
  ExportRequest,
  ImportRequest,
  IngestResponse,
  RetrieveResponse,
  EventsResponse,
  DeleteResponse,
  InfoResponse,
  LabelsResponse,
  ExportResponse,
  ImportResponse,
} from "./types.js";

// ─── Server ──────────────────────────────────────────────────────────────────
export type { UppServerConfig } from "./server.js";
export { UppServer } from "./server.js";

// ─── Client ──────────────────────────────────────────────────────────────────
export type { UppTransport } from "./client.js";
export { UppClient } from "./client.js";
