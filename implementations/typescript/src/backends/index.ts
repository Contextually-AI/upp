/**
 * @file index.ts
 * @description Barrel export for all UPP backend interfaces.
 *
 * Exports abstract backend interfaces for each pipeline stage.
 * Implementations are provided by server vendors.
 *
 * @module
 */

// ─── Ingest ──────────────────────────────────────────────────────────────────
export type { IngestBackend } from "./ingest.js";

// ─── Retriever ───────────────────────────────────────────────────────────────
export type { RetrieverBackend } from "./retriever.js";

// ─── Ontology ────────────────────────────────────────────────────────────────
export type { OntologyBackend } from "./ontology.js";
