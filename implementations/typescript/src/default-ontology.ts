/**
 * @file default-ontology.ts
 * @description Default ontology loader and implementation for the UPP protocol.
 *
 * Provides functions for loading the default UPP ontology from disk, and
 * the {@link DefaultOntology} class that implements the OntologyBackend
 * interface.
 *
 * The ontology file is located at `ontologies/user/v1.json` relative to
 * the UPP repository root.
 *
 * @example
 * ```typescript
 * import { loadDefaultOntology, DefaultOntology } from "@upp/sdk";
 *
 * const labels = loadDefaultOntology();
 * const ontology = new DefaultOntology();
 * const id = await ontology.getOntology();
 * ```
 *
 * @module
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { LabelDefinition } from "./models/index.js";
import { LabelDefinitionSchema } from "./models/index.js";
import type { OntologyBackend } from "./backends/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// Path Resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves the default ontology file path relative to the package location.
 *
 * Structure: implementations/typescript/src/ → ../../../ontologies/user/v1.json
 */
function getDefaultOntologyPath(): string {
  try {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    return resolve(currentDir, "..", "..", "..", "ontologies", "user", "v1.json");
  } catch {
    // Fallback for environments where import.meta.url is not available
    return resolve(process.cwd(), "ontologies", "user", "v1.json");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Protocol Version
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Loader
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loads label definitions from a UPP ontology JSON file.
 *
 * Supports the array format where labels is an array of objects.
 *
 * @param path - Optional absolute path to the ontology JSON file.
 * @returns A list of validated LabelDefinition objects.
 * @throws {Error} If the ontology file does not exist or contains invalid JSON.
 */
function loadLabels(path?: string): LabelDefinition[] {
  const ontologyPath = path ?? getDefaultOntologyPath();
  const raw = JSON.parse(readFileSync(ontologyPath, "utf-8"));
  const rawLabels = raw.labels ?? [];

  const labels: LabelDefinition[] = [];

  if (Array.isArray(rawLabels)) {
    for (const labelData of rawLabels) {
      labels.push(LabelDefinitionSchema.parse(labelData));
    }
  }

  return labels;
}

// Module-level cache
let _cachedLabels: LabelDefinition[] | null = null;

/**
 * Loads and returns all label definitions from the default ontology.
 *
 * Results are cached after first load.
 *
 * @param path - Optional path to the ontology JSON file.
 * @returns A list of LabelDefinition objects.
 * @throws {Error} If the ontology file does not exist.
 */
export function loadDefaultOntology(path?: string): LabelDefinition[] {
  if (path !== undefined) {
    return loadLabels(path);
  }
  if (_cachedLabels === null) {
    _cachedLabels = loadLabels();
  }
  return [..._cachedLabels];
}

/**
 * Look up a single label definition by name from the default ontology.
 *
 * @param name - The machine-readable label key (e.g., "who_name").
 * @returns The LabelDefinition if found, undefined otherwise.
 */
export function getLabel(name: string): LabelDefinition | undefined {
  const labels = loadDefaultOntology();
  return labels.find((l) => l.name === name);
}

// ─────────────────────────────────────────────────────────────────────────────
// DefaultOntology (OntologyBackend implementation)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default ontology implementation backed by ontologies/user/v1.json.
 *
 * Implements the OntologyBackend interface. Provides label definitions
 * and ontology listing.
 *
 * @example
 * ```typescript
 * const ontology = new DefaultOntology();
 * const labels = await ontology.getLabels();
 * const id = await ontology.getOntology();
 * ```
 */
export class DefaultOntology implements OntologyBackend {
  private readonly _labels: LabelDefinition[];
  private readonly _labelsByName: Map<string, LabelDefinition>;

  /**
   * Initialize with labels from the ontology file.
   *
   * @param path - Optional path to the ontology JSON file.
   */
  constructor(path?: string) {
    this._labels = loadDefaultOntology(path);
    this._labelsByName = new Map(this._labels.map((l) => [l.name, l]));
  }

  /**
   * Return all label definitions.
   *
   * @returns Label definitions.
   */
  async getLabels(): Promise<LabelDefinition[]> {
    return [...this._labels];
  }

  /**
   * Return the ontology identifier for this server instance.
   *
   * @returns The string "user/v1".
   */
  async getOntology(): Promise<string> {
    return "user/v1";
  }

  /**
   * Look up a single label definition by name.
   *
   * @param name - The machine-readable label key.
   * @returns The LabelDefinition if found, undefined otherwise.
   */
  getLabel(name: string): LabelDefinition | undefined {
    return this._labelsByName.get(name);
  }
}
