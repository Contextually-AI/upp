/**
 * @file ontology.ts
 * @description Ontology entities for the Universal Personalization Protocol (UPP).
 *
 * Defines {@link LabelDefinition} and {@link Ontology} Zod schemas and
 * inferred types. The ontology is the vocabulary of UPP — it defines what
 * categories of personal facts exist and how they should be classified.
 *
 * @module
 */

import { z } from "zod";
import { SensitivityTierSchema, CardinalitySchema, DurabilitySchema } from "./enums.js";

// ─────────────────────────────────────────────────────────────────────────────
// LabelDefinition
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Zod validation schema for a single ontology label definition.
 *
 * Labels categorize personal facts using the 5W+H framework (Who, What,
 * Where, When, Why, How) plus Preferences, Relationships, and Meta.
 *
 * Fields:
 * - `name` — Machine-readable label key (e.g., `"who_name"`).
 * - `display_name` — Human-readable name (e.g., `"Name"`).
 * - `description` — Concise description of what this label captures.
 * - `category` — Top-level grouping (WHO, WHAT, WHERE, etc.).
 * - `sensitivity` — Privacy sensitivity tier.
 * - `cardinality` — singular (one value) or plural (many values).
 * - `durability` — permanent, transient, or ephemeral.
 * - `examples` — Optional example values to guide classification.
 */
export const LabelDefinitionSchema = z.object({
  name: z.string().min(1, "name must be a non-empty string"),
  display_name: z.string().min(1, "display_name must be a non-empty string"),
  description: z.string().min(1, "description must be a non-empty string"),
  category: z.string().min(1, "category must be a non-empty string"),
  sensitivity: SensitivityTierSchema,
  cardinality: CardinalitySchema,
  durability: DurabilitySchema,
  examples: z.array(z.string()),
  classification_guidance: z.string().optional(),
  anti_examples: z.array(z.string()).optional(),
});

/** Schema definition for a single ontology label. */
export type LabelDefinition = z.infer<typeof LabelDefinitionSchema>;

/** Input type for creating a LabelDefinition (before Zod parsing). */
export type LabelDefinitionInput = z.input<typeof LabelDefinitionSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Ontology
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Zod validation schema for a versioned ontology — a collection of label
 * definitions that forms the taxonomy for structured context classification.
 *
 * Fields:
 * - `version` — Semantic version of the ontology (e.g., `"1.0.0"`).
 * - `type` — Ontology type (e.g., `"user"`, `"enterprise"`, `"location"`).
 * - `label_count` — Total number of labels.
 * - `labels` — Array of label definitions.
 */
export const OntologySchema = z.object({
  version: z.string().min(1, "version must be a non-empty string"),
  type: z.string().min(1, "type must be a non-empty string"),
  label_count: z.number().int().min(0),
  labels: z.array(LabelDefinitionSchema),
});

/** A versioned collection of label definitions. */
export type Ontology = z.infer<typeof OntologySchema>;

/** Input type for creating an Ontology (before Zod parsing). */
export type OntologyInput = z.input<typeof OntologySchema>;

/**
 * Creates and validates a {@link LabelDefinition}.
 *
 * @param input - Raw label definition data.
 * @returns A validated LabelDefinition object.
 * @throws {z.ZodError} If validation fails.
 */
export function createLabelDefinition(input: LabelDefinitionInput): LabelDefinition {
  return LabelDefinitionSchema.parse(input);
}

/**
 * Creates and validates an {@link Ontology}.
 *
 * @param input - Raw ontology data.
 * @returns A validated Ontology object.
 * @throws {z.ZodError} If validation fails.
 */
export function createOntology(input: OntologyInput): Ontology {
  return OntologySchema.parse(input);
}
