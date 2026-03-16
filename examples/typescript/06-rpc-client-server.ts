/**
 * UPP JSON-RPC — Encoding and Decoding Protocol Messages.
 *
 * Demonstrates the JSON-RPC 2.0 wire format used by UPP:
 * 1. All 8 UPP method constants
 * 2. Building JSON-RPC request objects for all operations
 * 3. Building success and error responses
 * 4. Validating request parameters with Zod schemas
 * 5. Error handling with UppError and error codes
 * 6. UppServer and UppClient in-process round-trip
 *
 * The UPP wire format is JSON-RPC 2.0 over any transport. This example
 * shows the message encoding/decoding layer that sits between the
 * application and the transport.
 *
 * Expected output:
 *     === UPP Methods (8 Operations) ===
 *     Core:        upp/ingest, upp/retrieve, upp/events, upp/delete
 *     Discovery:   upp/info, upp/labels
 *     Portability: upp/export, upp/import
 *
 *     === Building JSON-RPC Requests ===
 *     upp/ingest: {"jsonrpc": "2.0", ...}
 *     ...
 *
 *     === Building Responses ===
 *     Success: {"jsonrpc": "2.0", "id": 1, "result": ...}
 *     Error:   {"jsonrpc": "2.0", "id": 1, "error": ...}
 *
 *     === Request Validation ===
 *     IngestRequest valid: true
 *     ...
 *
 *     === Error Handling ===
 *     UppError: code=-32001, message='User not found'
 *     ...
 */

import {
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
  // Error codes and class
  USER_NOT_FOUND,
  ONTOLOGY_NOT_FOUND,
  INGEST_FAILED,
  EXTRACTION_FAILED,
  INVALID_PARAMS,
  UppError,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type JsonRpcError,
} from "../../implementations/typescript/src/index.js";

function main(): void {
  // =========================================================================
  // 1. Method constants
  // =========================================================================
  console.log("=== UPP Methods (8 Operations) ===");
  console.log(`  Core:        ${UPP_INGEST}, ${UPP_RETRIEVE}, ${UPP_EVENTS}, ${UPP_DELETE}`);
  console.log(`  Discovery:   ${UPP_INFO}, ${UPP_LABELS}`);
  console.log(`  Portability: ${UPP_EXPORT}, ${UPP_IMPORT}`);
  console.log(`  Total: ${ALL_METHODS.length} methods`);
  console.log();

  // =========================================================================
  // 2. Building JSON-RPC requests for all 8 operations
  // =========================================================================
  console.log("=== Building JSON-RPC Requests ===");

  const buildRequest = (
    method: string,
    params: Record<string, unknown>,
    id: number,
  ): JsonRpcRequest => ({
    jsonrpc: "2.0",
    id,
    method,
    params,
  });

  // Core operations
  let req = buildRequest(UPP_INGEST, { entity_key: "user-1", text: "I live in Tokyo" }, 1);
  console.log(`  ${UPP_INGEST}: ${JSON.stringify(req)}`);

  req = buildRequest(UPP_RETRIEVE, { entity_key: "user-1", query: "Where does this person live?" }, 2);
  console.log(`  ${UPP_RETRIEVE}: ${JSON.stringify(req)}`);

  req = buildRequest(UPP_EVENTS, { entity_key: "user-1" }, 3);
  console.log(`  ${UPP_EVENTS}: ${JSON.stringify(req)}`);

  req = buildRequest(UPP_DELETE, { entity_key: "user-1", event_ids: ["evt-001", "evt-002"] }, 4);
  console.log(`  ${UPP_DELETE}: ${JSON.stringify(req)}`);

  // Discovery operations
  req = buildRequest(UPP_INFO, {}, 5);
  console.log(`  ${UPP_INFO}: ${JSON.stringify(req)}`);

  req = buildRequest(UPP_LABELS, {}, 6);
  console.log(`  ${UPP_LABELS}: ${JSON.stringify(req)}`);

  // Portability operations
  req = buildRequest(UPP_EXPORT, { entity_key: "user-1" }, 7);
  console.log(`  ${UPP_EXPORT}: ${JSON.stringify(req)}`);

  req = buildRequest(
    UPP_IMPORT,
    { entity_key: "user-2", events: [{ value: "Lives in Tokyo", labels: ["where_home"] }] },
    8,
  );
  console.log(`  ${UPP_IMPORT}: ${JSON.stringify(req)}`);
  console.log();

  // =========================================================================
  // 3. Building responses
  // =========================================================================
  console.log("=== Building Responses ===");

  // Success response
  const successResponse: JsonRpcResponse = {
    jsonrpc: "2.0",
    id: 1,
    result: { events: [{ value: "Lives in Tokyo", labels: ["where_home"] }] },
  };
  console.log(`  Success: ${JSON.stringify(successResponse)}`);

  // Error response
  const errorObj: JsonRpcError = {
    code: USER_NOT_FOUND,
    message: "User 'user-999' not found",
  };
  const errorResponse: JsonRpcResponse = {
    jsonrpc: "2.0",
    id: 1,
    error: errorObj,
  };
  console.log(`  Error:   ${JSON.stringify(errorResponse)}`);
  console.log();

  // =========================================================================
  // 4. Request validation with Zod schemas
  // =========================================================================
  console.log("=== Request Validation ===");

  const ingestResult = IngestRequestSchema.safeParse({ entity_key: "user-1", text: "I live in Tokyo" });
  console.log(`  IngestRequest valid: ${ingestResult.success}`);
  if (ingestResult.success) {
    console.log(`    entity_key=${ingestResult.data.entity_key}, text=${ingestResult.data.text}`);
  }

  const retrieveResult = RetrieveRequestSchema.safeParse({ entity_key: "user-1", query: "location" });
  console.log(`  RetrieveRequest valid: ${retrieveResult.success}`);

  const eventsResult = EventsRequestSchema.safeParse({ entity_key: "user-1" });
  console.log(`  EventsRequest valid: ${eventsResult.success}`);

  const deleteResult = DeleteRequestSchema.safeParse({ entity_key: "user-1", event_ids: ["e1", "e2"] });
  console.log(`  DeleteRequest valid: ${deleteResult.success}`);

  const infoResult = InfoRequestSchema.safeParse({});
  console.log(`  InfoRequest valid: ${infoResult.success}`);

  const labelsResult = LabelsRequestSchema.safeParse({});
  console.log(`  LabelsRequest valid: ${labelsResult.success}`);

  const exportResult = ExportRequestSchema.safeParse({ entity_key: "user-1" });
  console.log(`  ExportRequest valid: ${exportResult.success}`);

  const importResult = ImportRequestSchema.safeParse({
    entity_key: "user-2",
    events: [{ value: "test fact", labels: ["who_name"] }],
  });
  console.log(`  ImportRequest valid: ${importResult.success}`);

  // Invalid request (missing required field)
  const invalidResult = IngestRequestSchema.safeParse({ entity_key: "user-1" });
  console.log(`  IngestRequest without text: valid=${invalidResult.success}`);
  console.log();

  // =========================================================================
  // 5. Error handling
  // =========================================================================
  console.log("=== Error Handling ===");

  // All UPP error codes
  const errorCodes: Record<number, string> = {
    [USER_NOT_FOUND]: "User Not Found",
    [ONTOLOGY_NOT_FOUND]: "Ontology Not Found",
    [INGEST_FAILED]: "Ingest Failed",
    [EXTRACTION_FAILED]: "Extraction Failed",
  };
  console.log("  UPP error codes:");
  for (const [code, name] of Object.entries(errorCodes)) {
    console.log(`    ${code}: ${name}`);
  }
  console.log();

  // UppError exception
  const err = new UppError(USER_NOT_FOUND, "User 'user-999' not found", { entity_key: "user-999" });
  console.log(`  UppError: ${err.toString()}`);

  const rpcErr = err.toJsonRpcError();
  console.log(`  As JsonRpcError: code=${rpcErr.code}, message=${rpcErr.message}`);
  console.log(`  Error data: ${JSON.stringify(rpcErr.data)}`);
}

main();
