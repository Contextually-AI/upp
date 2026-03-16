/**
 * @file errors.ts
 * @description UPP JSON-RPC 2.0 error codes and exception class.
 *
 * Defines both standard JSON-RPC error codes and UPP-specific error codes
 * in the range -32001 to -32099.
 *
 * Standard JSON-RPC Error Codes:
 *   -32700  Parse error
 *   -32600  Invalid Request
 *   -32601  Method not found
 *   -32602  Invalid params
 *   -32603  Internal error
 *
 * UPP-Specific Error Codes:
 *   -32001  User not found
 *   -32002  Ontology not found
 *   -32003  Ingest failed
 *   -32004  Extraction failed
 *
 * @module
 */

import type { JsonRpcError } from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Standard JSON-RPC 2.0 Error Codes
// ─────────────────────────────────────────────────────────────────────────────

/** Invalid JSON received by the server. */
export const PARSE_ERROR = -32700;

/** The JSON is valid but not a valid JSON-RPC 2.0 request. */
export const INVALID_REQUEST = -32600;

/** The requested method does not exist or is not available. */
export const METHOD_NOT_FOUND = -32601;

/** Invalid method parameter(s). */
export const INVALID_PARAMS = -32602;

/** Internal JSON-RPC error. */
export const INTERNAL_ERROR = -32603;

// ─────────────────────────────────────────────────────────────────────────────
// UPP-Specific Error Codes (-32001 to -32099)
// ─────────────────────────────────────────────────────────────────────────────

/** The specified entity_key does not exist. */
export const USER_NOT_FOUND = -32001;

/** The requested ontology does not exist. */
export const ONTOLOGY_NOT_FOUND = -32002;

/** Error persisting events during ingestion. */
export const INGEST_FAILED = -32003;

/** Error extracting events from text. */
export const EXTRACTION_FAILED = -32004;

// ─────────────────────────────────────────────────────────────────────────────
// Error Names Mapping
// ─────────────────────────────────────────────────────────────────────────────

/** Human-readable names for all error codes. */
const ERROR_NAMES: Record<number, string> = {
  [PARSE_ERROR]: "Parse error",
  [INVALID_REQUEST]: "Invalid Request",
  [METHOD_NOT_FOUND]: "Method not found",
  [INVALID_PARAMS]: "Invalid params",
  [INTERNAL_ERROR]: "Internal error",
  [USER_NOT_FOUND]: "User not found",
  [ONTOLOGY_NOT_FOUND]: "Ontology not found",
  [INGEST_FAILED]: "Ingest failed",
  [EXTRACTION_FAILED]: "Extraction failed",
};

/**
 * Returns the human-readable name for a given error code.
 *
 * @param code - The numeric error code.
 * @returns The error name, or "Unknown error" if the code is not recognized.
 */
export function getErrorName(code: number): string {
  return ERROR_NAMES[code] ?? "Unknown error";
}

// ─────────────────────────────────────────────────────────────────────────────
// UPP Error Class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Structured error class for UPP JSON-RPC errors.
 *
 * Extends the standard Error class with a numeric `code` and optional
 * `data` payload, matching the JSON-RPC 2.0 error object structure.
 *
 * @example
 * ```typescript
 * throw new UppError(USER_NOT_FOUND, "User not found", { entity_key: "abc" });
 * ```
 */
export class UppError extends Error {
  /** Numeric error code (JSON-RPC or UPP-specific). */
  readonly code: number;

  /** Additional structured data about the error. */
  readonly data?: Record<string, unknown>;

  /**
   * Creates an UppError.
   *
   * @param code - Numeric error code.
   * @param message - Human-readable error description.
   * @param data - Optional structured error data.
   */
  constructor(code: number, message?: string, data?: Record<string, unknown>) {
    super(message ?? getErrorName(code));
    this.name = "UppError";
    this.code = code;
    this.data = data;
  }

  /**
   * Converts this error to a JSON-RPC error object.
   *
   * @returns A plain object suitable for inclusion in a JSON-RPC error response.
   */
  toJsonRpcError(): JsonRpcError {
    const result: JsonRpcError = {
      code: this.code,
      message: this.message,
    };
    if (this.data !== undefined) {
      return { ...result, data: this.data };
    }
    return result;
  }

  /** Developer-friendly string representation. */
  override toString(): string {
    return `UppError(code=${this.code}, message=${this.message})`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience Error Factories
// ─────────────────────────────────────────────────────────────────────────────

/** Creates an Invalid Params error (-32602). */
export function invalidParams(detail: string): UppError {
  return new UppError(INVALID_PARAMS, "Invalid params", { detail });
}

/** Creates a Method Not Found error (-32601). */
export function methodNotFound(method: string): UppError {
  return new UppError(METHOD_NOT_FOUND, "Method not found", { method });
}

/** Creates a User Not Found error (-32001). */
export function userNotFound(entityKey: string): UppError {
  return new UppError(USER_NOT_FOUND, "User not found", { entity_key: entityKey });
}

/** Creates an Ontology Not Found error (-32002). */
export function ontologyNotFound(ontology: string): UppError {
  return new UppError(ONTOLOGY_NOT_FOUND, "Ontology not found", { ontology });
}

/** Creates an Ingest Failed error (-32003). */
export function ingestFailed(detail: string): UppError {
  return new UppError(INGEST_FAILED, "Ingest failed", { detail });
}

/** Creates an Extraction Failed error (-32004). */
export function extractionFailed(detail: string): UppError {
  return new UppError(EXTRACTION_FAILED, "Extraction failed", { detail });
}

/** Creates an Internal Error (-32603). */
export function internalError(detail: string): UppError {
  return new UppError(INTERNAL_ERROR, "Internal error", { detail });
}
