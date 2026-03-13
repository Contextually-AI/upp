/**
 * @file index.ts
 * @description Main entry point for the @upp/sdk TypeScript package.
 *
 * The Universal Personalization Protocol (UPP) TypeScript SDK provides type-safe
 * data models, Zod validation schemas, backend interfaces, and a complete
 * JSON-RPC 2.0 server/client implementation for building UPP-compliant systems.
 *
 * @example
 * ```typescript
 * import {
 *   // Models
 *   EventSchema,
 *   StoredEventSchema,
 *   LabelDefinitionSchema,
 *   createEvent,
 *   createStoredEvent,
 *
 *   // Backends
 *   type IngestBackend,
 *   type RetrieverBackend,
 *   type OntologyBackend,
 *
 *   // RPC
 *   UppServer,
 *   UppClient,
 *   UppError,
 *   UPP_INGEST,
 *   ALL_METHODS,
 * } from "@upp/sdk";
 * ```
 *
 * @packageDocumentation
 * @module @upp/sdk
 * @version 0.2.0
 */

export * from "./models/index.js";
export * from "./backends/index.js";
export * from "./rpc/index.js";
export { loadDefaultOntology, getLabel, DefaultOntology } from "./default-ontology.js";
