/**
 * @file event.ts
 * @description Core event entities for the Universal Personalization Protocol (UPP).
 *
 * Defines the {@link Event} (pre-storage) and {@link StoredEvent} (post-storage)
 * Zod schemas and inferred types. Events are the atomic unit of personal data
 * in UPP — every extracted fact is modeled as an immutable event.
 *
 * @module
 */

import { z } from "zod";
import { EventStatusSchema, SourceTypeSchema, TaskStatusSchema } from "./enums.js";

// ─────────────────────────────────────────────────────────────────────────────
// Event
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Zod validation schema for an Event — the atomic unit of extracted
 * personal information.
 *
 * Events are produced by the extraction pipeline and consumed by the
 * store layer. They are immutable — once created, they are never modified.
 *
 * Fields:
 * - `value` — The extracted fact as natural-language text. Required.
 * - `labels` — One or more ontology label keys. Required, minimum 1.
 * - `confidence` — Extraction confidence score in [0.0, 1.0]. Optional.
 * - `source_type` — Provenance: user_stated, agent_observed, or inferred. Optional.
 */
export const EventSchema = z.object({
  value: z.string().min(1, "value must be a non-empty string"),
  labels: z.array(z.string().min(1)).min(1, "labels must contain at least one element"),
  confidence: z.number().min(0).max(1),
  source_type: SourceTypeSchema,
  valid_from: z.string().datetime().nullable().optional().default(null),
  valid_until: z.string().datetime().nullable().optional().default(null),
});

/** An atomic unit of extracted personal information. */
export type Event = z.infer<typeof EventSchema>;

/** Input type for creating an Event (before Zod parsing). */
export type EventInput = z.input<typeof EventSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// StoredEvent
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Zod validation schema for a StoredEvent — an Event after persistence,
 * enriched with server-assigned metadata.
 *
 * Extends Event with:
 * - `id` — Unique event identifier assigned by the server.
 * - `entity_key` — Unique identifier of the user who owns this event.
 * - `status` — Lifecycle status: valid, staged, or superseded.
 * - `created_at` — ISO-8601 creation timestamp (UTC).
 * - `superseded_by` — ID of the event that replaced this one (if superseded).
 */
export const StoredEventSchema = EventSchema.extend({
  id: z.string().min(1, "id must be a non-empty string"),
  entity_key: z.string().min(1, "entity_key must be a non-empty string"),
  status: EventStatusSchema,
  created_at: z.string().datetime({ message: "created_at must be a valid ISO-8601 datetime" }),
  superseded_by: z.string().optional(),
});

/** A persisted event with server-assigned metadata. */
export type StoredEvent = z.infer<typeof StoredEventSchema>;

/** Input type for creating a StoredEvent (before Zod parsing). */
export type StoredEventInput = z.input<typeof StoredEventSchema>;

/**
 * Creates and validates an {@link Event}.
 *
 * @param input - Raw event data. At minimum, `value` and `labels` are required.
 * @returns A validated Event object.
 * @throws {z.ZodError} If validation fails.
 */
export function createEvent(input: EventInput): Event {
  return EventSchema.parse(input);
}

/**
 * Creates and validates a {@link StoredEvent}.
 *
 * @param input - Raw stored event data.
 * @returns A validated StoredEvent object.
 * @throws {z.ZodError} If validation fails.
 */
export function createStoredEvent(input: StoredEventInput): StoredEvent {
  return StoredEventSchema.parse(input);
}

// ─────────────────────────────────────────────────────────────────────────────
// TaskResult
// ─────────────────────────────────────────────────────────────────────────────

/** Zod schema for a background task result. */
export const TaskResultSchema = z.object({
  task_id: z.string(),
  status: TaskStatusSchema,
  result: z.array(StoredEventSchema).nullable(),
  error: z.string().nullable(),
  created_at: z.string(),
  completed_at: z.string().nullable(),
});

/** A background task status and result. */
export type TaskResult = z.infer<typeof TaskResultSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// ContextualizeResult
// ─────────────────────────────────────────────────────────────────────────────

/** Result of a contextualize operation. */
export interface ContextualizeResult {
  /** Relevant existing events, ranked by relevance. */
  readonly events: StoredEvent[];
  /** Reference to the background ingest task. */
  readonly task_id: string;
}
