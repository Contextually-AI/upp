/**
 * @file ontology.ts
 * @description Ontology backend interface for the UPP protocol.
 *
 * Defines the {@link OntologyBackend} interface for accessing ontology
 * metadata, label definitions, and server information.
 *
 * @module
 */

import type { LabelDefinition } from "../models/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// OntologyBackend Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Interface for pluggable ontology backends.
 *
 * An ontology backend provides access to label definitions and the list
 * of available ontologies.
 */
export interface OntologyBackend {
  /**
   * Return all label definitions for the server's ontology.
   *
   * @returns Label definitions.
   */
  getLabels(): Promise<LabelDefinition[]>;

  /**
   * Return the ontology identifier for this server instance.
   *
   * @returns Ontology identifier string (e.g., `"user/v1"`).
   */
  getOntology(): Promise<string>;
}
