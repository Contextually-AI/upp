/**
 * @file enums.ts
 * @description UPP protocol enumerations with Zod validation schemas.
 *
 * Defines all enumeration types used throughout the Universal Personalization
 * Protocol. Each enum is represented as a Zod schema for validation and an
 * inferred TypeScript type for compile-time safety.
 *
 * Enumerations:
 *   EventStatus — Lifecycle state of a stored event.
 *   SourceType — Provenance classification of an extracted fact.
 *   SensitivityTier — Privacy classification for ontology labels.
 *   Cardinality — Whether a label accepts one or many values.
 *   Durability — Expected lifespan of a fact.
 *
 * @module
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// EventStatus
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Zod schema for event lifecycle status.
 *
 * Events follow an immutable event-sourcing pattern:
 * - `valid` — Active and authoritative.
 * - `staged` — Low confidence, pending reinforcement.
 * - `superseded` — Replaced by a newer event, retained for audit.
 */
export const EventStatusSchema = z.enum(["valid", "staged", "superseded"]);

/** Lifecycle state of a stored event. */
export type EventStatus = z.infer<typeof EventStatusSchema>;

/** All valid EventStatus values as a readonly array. */
export const EVENT_STATUS_VALUES = EventStatusSchema.options;

// ─────────────────────────────────────────────────────────────────────────────
// SourceType
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Zod schema for fact provenance classification.
 *
 * Source types indicate how a fact was obtained:
 * - `user_stated` — The user explicitly stated this fact.
 * - `agent_observed` — The agent observed or derived this from conversation.
 * - `inferred` — The system inferred this from indirect signals.
 */
export const SourceTypeSchema = z.enum(["user_stated", "agent_observed", "inferred"]);

/** Provenance classification of an extracted fact. */
export type SourceType = z.infer<typeof SourceTypeSchema>;

/** All valid SourceType values as a readonly array. */
export const SOURCE_TYPE_VALUES = SourceTypeSchema.options;

// ─────────────────────────────────────────────────────────────────────────────
// SensitivityTier
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Zod schema for privacy sensitivity classification.
 *
 * Ordered from least to most sensitive:
 * `tier_public < tier_work < tier_personal < tier_sensitive < tier_internal`
 */
export const SensitivityTierSchema = z.enum([
  "tier_public",
  "tier_work",
  "tier_personal",
  "tier_sensitive",
  "tier_internal",
]);

/** Privacy classification for ontology labels. */
export type SensitivityTier = z.infer<typeof SensitivityTierSchema>;

/** All valid SensitivityTier values as a readonly array. */
export const SENSITIVITY_TIER_VALUES = SensitivityTierSchema.options;

// ─────────────────────────────────────────────────────────────────────────────
// Cardinality
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Zod schema for label cardinality.
 *
 * Determines supersession behavior:
 * - `singular` — Only one value at a time. New values supersede old ones.
 * - `plural` — Multiple values coexist. New values are added alongside.
 */
export const CardinalitySchema = z.enum(["singular", "plural"]);

/** Whether a label accepts one or many concurrent values. */
export type Cardinality = z.infer<typeof CardinalitySchema>;

/** All valid Cardinality values as a readonly array. */
export const CARDINALITY_VALUES = CardinalitySchema.options;

// ─────────────────────────────────────────────────────────────────────────────
// Durability
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Zod schema for fact durability.
 *
 * Indicates how long a fact is expected to remain valid:
 * - `permanent` — Unlikely to change over a person's lifetime.
 * - `transient` — Changes over months or years.
 * - `ephemeral` — Changes frequently — days or weeks.
 */
export const DurabilitySchema = z.enum(["permanent", "transient", "ephemeral"]);

/** Expected lifespan of a fact. */
export type Durability = z.infer<typeof DurabilitySchema>;

/** All valid Durability values as a readonly array. */
export const DURABILITY_VALUES = DurabilitySchema.options;

// ─────────────────────────────────────────────────────────────────────────────
// TaskStatus
// ─────────────────────────────────────────────────────────────────────────────

/** Status of a background task. */
export const TaskStatusValues = ["pending", "running", "completed", "failed"] as const;

/** Zod schema for TaskStatus. */
export const TaskStatusSchema = z.enum(TaskStatusValues);

/** TypeScript type for task status. */
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
