/**
 * @file ingest.ts
 * @description Ingest backend interface for the UPP protocol.
 *
 * Defines the {@link IngestBackend} interface for extracting and persisting
 * personal events from free text. The backend manages the full lifecycle of
 * events following an immutable event-sourcing pattern.
 *
 * @module
 */

import type { Event, StoredEvent, TaskResult } from "../models/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// IngestBackend Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Interface for pluggable event ingestion.
 *
 * An ingest backend receives free text, extracts relevant personal
 * facts, classifies them with ontology labels, handles supersession
 * for singular-cardinality labels, and persists the resulting events.
 *
 * Implementations may use any extraction strategy (LLM, NLP, rules)
 * and any backing storage (in-memory, SQLite, PostgreSQL, Redis, etc.).
 */
export interface IngestBackend {
  /**
   * Extract and persist events from free text.
   *
   * The backend MUST:
   * 1. Analyze the input text and extract relevant personal facts.
   * 2. Classify each fact with one or more ontology labels.
   * 3. Assign a unique `id` and a UTC `created_at` timestamp.
   * 4. For singular-cardinality labels, mark existing valid events
   *    with the same label as superseded.
   *
   * @param entityKey - Unique identifier of the user.
   * @param text - Free text from which to extract events.
   * @returns Stored events with server-assigned metadata.
   */
  ingestEvents(entityKey: string, text: string): Promise<StoredEvent[]>;

  /**
   * Retrieve all stored events for a user.
   *
   * Returns events of all statuses for transparency.
   *
   * @param entityKey - Unique identifier of the user.
   * @returns All stored events for the user.
   */
  getEvents(entityKey: string): Promise<StoredEvent[]>;

  /**
   * Delete events for a user.
   *
   * If `eventIds` is undefined, deletes ALL events for the user
   * (right to erasure). Otherwise, deletes only the specified events.
   *
   * @param entityKey - Unique identifier of the user.
   * @param eventIds - Optional list of specific event IDs to delete.
   * @returns Number of events deleted.
   */
  deleteEvents(entityKey: string, eventIds?: string[]): Promise<number>;

  /**
   * Export all events for a user.
   *
   * Returns events of all statuses (`valid`, `staged`, `superseded`)
   * in UPP portable format, suitable for migration between vendors
   * and data portability (GDPR Article 20).
   *
   * @param entityKey - Unique identifier of the user.
   * @returns All stored events for export.
   */
  exportEvents(entityKey: string): Promise<StoredEvent[]>;

  /**
   * Import events for a user.
   *
   * Persists events that were previously exported from another
   * UPP-compatible server.
   *
   * @param entityKey - Unique identifier of the user.
   * @param events - Events to import.
   * @returns Imported events with server-assigned metadata.
   */
  importEvents(entityKey: string, events: Event[]): Promise<StoredEvent[]>;

  /**
   * Schedule an ingest operation to run in the background.
   *
   * @param entityKey - Unique identifier of the user.
   * @param text - Free text from which to extract events.
   * @returns A task_id that can be used with get_tasks to check status.
   */
  scheduleIngest(entityKey: string, text: string): Promise<string>;

  /**
   * Check the status of background tasks.
   *
   * @param taskIds - One or more task IDs to check.
   * @returns Task status objects with results.
   */
  getTasks(taskIds: string[]): Promise<TaskResult[]>;
}
