/**
 * @file retriever.ts
 * @description Retriever backend interface for the UPP protocol.
 *
 * Defines the {@link RetrieverBackend} interface for retrieving relevant
 * structured context given a free-text query. The retriever is responsible
 * for scoring, ranking, and selecting the most relevant events.
 *
 * @module
 */

import type { Event } from "../models/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// RetrieverBackend Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Interface for pluggable intelligent retrieval.
 *
 * A retriever takes a user key and a free-text query, then returns
 * the most relevant events ranked by the implementation's scoring
 * algorithm.
 */
export interface RetrieverBackend {
  /**
   * Retrieve relevant events for a user given a query.
   *
   * The retriever MUST interpret the query and return events
   * ranked by relevance.
   *
   * @param entityKey - Unique identifier of the user.
   * @param query - Free-text query describing what information is needed.
   * @returns Events ranked by relevance.
   */
  retrieve(entityKey: string, query: string): Promise<Event[]>;
}
