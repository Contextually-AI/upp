/**
 * @file errors.test.ts
 * @description Tests for UPP error codes and error class.
 */

import { describe, it, expect } from "vitest";
import {
  PARSE_ERROR,
  INVALID_REQUEST,
  METHOD_NOT_FOUND,
  INVALID_PARAMS,
  INTERNAL_ERROR,
  USER_NOT_FOUND,
  ONTOLOGY_NOT_FOUND,
  INGEST_FAILED,
  EXTRACTION_FAILED,
  getErrorName,
  UppError,
  invalidParams,
  methodNotFound,
  userNotFound,
  ontologyNotFound,
  ingestFailed,
  extractionFailed,
  internalError,
} from "../../src/rpc/errors.js";

describe("Error code constants", () => {
  it("should have correct standard JSON-RPC error codes", () => {
    expect(PARSE_ERROR).toBe(-32700);
    expect(INVALID_REQUEST).toBe(-32600);
    expect(METHOD_NOT_FOUND).toBe(-32601);
    expect(INVALID_PARAMS).toBe(-32602);
    expect(INTERNAL_ERROR).toBe(-32603);
  });

  it("should have correct UPP-specific error codes", () => {
    expect(USER_NOT_FOUND).toBe(-32001);
    expect(ONTOLOGY_NOT_FOUND).toBe(-32002);
    expect(INGEST_FAILED).toBe(-32003);
    expect(EXTRACTION_FAILED).toBe(-32004);
  });
});

describe("getErrorName", () => {
  it("should return names for standard codes", () => {
    expect(getErrorName(PARSE_ERROR)).toBe("Parse error");
    expect(getErrorName(INVALID_REQUEST)).toBe("Invalid Request");
    expect(getErrorName(METHOD_NOT_FOUND)).toBe("Method not found");
    expect(getErrorName(INVALID_PARAMS)).toBe("Invalid params");
    expect(getErrorName(INTERNAL_ERROR)).toBe("Internal error");
  });

  it("should return names for UPP codes", () => {
    expect(getErrorName(USER_NOT_FOUND)).toBe("User not found");
    expect(getErrorName(ONTOLOGY_NOT_FOUND)).toBe("Ontology not found");
    expect(getErrorName(INGEST_FAILED)).toBe("Ingest failed");
    expect(getErrorName(EXTRACTION_FAILED)).toBe("Extraction failed");
  });

  it("should return 'Unknown error' for unrecognized codes", () => {
    expect(getErrorName(-99999)).toBe("Unknown error");
    expect(getErrorName(0)).toBe("Unknown error");
  });
});

describe("UppError", () => {
  it("should create an error with code and message", () => {
    const error = new UppError(USER_NOT_FOUND, "User not found");
    expect(error.code).toBe(-32001);
    expect(error.message).toBe("User not found");
    expect(error.name).toBe("UppError");
    expect(error).toBeInstanceOf(Error);
  });

  it("should create an error with data", () => {
    const error = new UppError(USER_NOT_FOUND, "User not found", { entity_key: "abc" });
    expect(error.data).toEqual({ entity_key: "abc" });
  });

  it("should use default message from getErrorName", () => {
    const error = new UppError(USER_NOT_FOUND);
    expect(error.message).toBe("User not found");
  });

  it("should convert to JSON-RPC error", () => {
    const error = new UppError(INGEST_FAILED, "Storage error", { detail: "disk full" });
    const jsonRpc = error.toJsonRpcError();
    expect(jsonRpc.code).toBe(-32003);
    expect(jsonRpc.message).toBe("Storage error");
    expect(jsonRpc.data).toEqual({ detail: "disk full" });
  });

  it("should convert to JSON-RPC error without data", () => {
    const error = new UppError(METHOD_NOT_FOUND, "Not found");
    const jsonRpc = error.toJsonRpcError();
    expect(jsonRpc.code).toBe(-32601);
    expect(jsonRpc.message).toBe("Not found");
    expect(jsonRpc.data).toBeUndefined();
  });

  it("should have a useful toString", () => {
    const error = new UppError(USER_NOT_FOUND, "User not found");
    expect(error.toString()).toContain("-32001");
    expect(error.toString()).toContain("User not found");
  });
});

describe("Error factories", () => {
  it("invalidParams should create correct error", () => {
    const error = invalidParams("missing entity_key");
    expect(error.code).toBe(INVALID_PARAMS);
    expect(error.data?.detail).toBe("missing entity_key");
  });

  it("methodNotFound should create correct error", () => {
    const error = methodNotFound("upp/unknown");
    expect(error.code).toBe(METHOD_NOT_FOUND);
    expect(error.data?.method).toBe("upp/unknown");
  });

  it("userNotFound should create correct error", () => {
    const error = userNotFound("user-123");
    expect(error.code).toBe(USER_NOT_FOUND);
    expect(error.data?.entity_key).toBe("user-123");
  });

  it("ontologyNotFound should create correct error", () => {
    const error = ontologyNotFound("unknown/v1");
    expect(error.code).toBe(ONTOLOGY_NOT_FOUND);
    expect(error.data?.ontology).toBe("unknown/v1");
  });

  it("ingestFailed should create correct error", () => {
    const error = ingestFailed("connection refused");
    expect(error.code).toBe(INGEST_FAILED);
    expect(error.data?.detail).toBe("connection refused");
  });

  it("extractionFailed should create correct error", () => {
    const error = extractionFailed("LLM timeout");
    expect(error.code).toBe(EXTRACTION_FAILED);
    expect(error.data?.detail).toBe("LLM timeout");
  });

  it("internalError should create correct error", () => {
    const error = internalError("unexpected failure");
    expect(error.code).toBe(INTERNAL_ERROR);
    expect(error.data?.detail).toBe("unexpected failure");
  });
});
