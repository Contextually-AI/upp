/**
 * UPP Quickstart — Minimal Working Example.
 *
 * Demonstrates the core UPP workflow in the fewest lines possible:
 * 1. Ingest free text (the backend extracts and persists events)
 * 2. Retrieve relevant events with a query
 *
 * This is the "Hello World" of UPP.
 *
 * Expected output:
 *     === Step 1: Ingest Text ===
 *     Input: "I love spicy Thai food, especially pad kra pao. I work as a data scientist at Spotify."
 *     Ingested 2 event(s) for user-alice
 *       id=<uuid>... | valid | what_preferences: Loves spicy Thai food, especially pad kra pao
 *       id=<uuid>... | valid | who_role: Works as a data scientist at Spotify
 *
 *     === Step 2: Retrieve Events ===
 *     Query: "What food does this person like?"
 *     Retrieved 1 relevant event(s)
 *       - Loves spicy Thai food, especially pad kra pao [what_preferences]
 */

import { randomUUID } from "node:crypto";

import {
  createEvent,
  createStoredEvent,
  type Event,
  type StoredEvent,
  type IngestBackend,
} from "../../implementations/typescript/src/index.js";

// =============================================================================
// InMemoryStore — Simple in-memory implementation of IngestBackend
// =============================================================================

class InMemoryStore implements IngestBackend {
  private events: Map<string, StoredEvent[]> = new Map();

  async ingestEvents(entityKey: string, text: string): Promise<StoredEvent[]> {
    // Simple keyword-based extraction for demo. In production, use an LLM.
    const extracted = this.extract(text);
    return this.persist(entityKey, extracted);
  }

  private extract(text: string): Event[] {
    const events: Event[] = [];
    const lower = text.toLowerCase();
    if (["food", "spicy", "eat"].some((w) => lower.includes(w))) {
      events.push(
        createEvent({
          value: "Loves spicy Thai food, especially pad kra pao",
          labels: ["what_preferences"],
          confidence: 0.92,
          source_type: "user_stated",
        }),
      );
    }
    if (["work", "scientist", "engineer"].some((w) => lower.includes(w))) {
      events.push(
        createEvent({
          value: "Works as a data scientist at Spotify",
          labels: ["who_role"],
          confidence: 0.88,
          source_type: "user_stated",
        }),
      );
    }
    return events;
  }

  private persist(entityKey: string, events: Event[]): StoredEvent[] {
    const existing = this.events.get(entityKey) ?? [];
    const stored: StoredEvent[] = [];
    for (const event of events) {
      const se = createStoredEvent({
        ...event,
        id: randomUUID(),
        entity_key: entityKey,
        status: "valid",
        created_at: new Date().toISOString(),
      });
      stored.push(se);
      existing.push(se);
    }
    this.events.set(entityKey, existing);
    return stored;
  }

  async getEvents(entityKey: string, _ontology?: string): Promise<StoredEvent[]> {
    return [...(this.events.get(entityKey) ?? [])];
  }

  async deleteEvents(entityKey: string, eventIds?: string[]): Promise<number> {
    const existing = this.events.get(entityKey) ?? [];
    if (!eventIds) {
      this.events.set(entityKey, []);
      return existing.length;
    }
    const toDelete = new Set(eventIds);
    const remaining = existing.filter((e) => !toDelete.has(e.id));
    this.events.set(entityKey, remaining);
    return existing.length - remaining.length;
  }

  async exportEvents(entityKey: string, _ontology?: string): Promise<StoredEvent[]> {
    const all = await this.getEvents(entityKey);
    return all.filter((e) => e.status === "valid");
  }

  async importEvents(entityKey: string, events: Event[], _ontology?: string): Promise<StoredEvent[]> {
    return this.persist(entityKey, events);
  }
}

// =============================================================================
// SimpleRetriever — Minimal retriever that matches events by keyword overlap
// =============================================================================

class SimpleRetriever {
  private store: InMemoryStore;

  constructor(store: InMemoryStore) {
    this.store = store;
  }

  async retrieve(entityKey: string, query: string, _ontology?: string): Promise<Event[]> {
    const stored = await this.store.getEvents(entityKey);
    const queryWords = new Set(
      query.toLowerCase().split(/\s+/).map((w) => w.replace(/[?.,!]/g, "")),
    );

    const results: Event[] = [];
    for (const e of stored) {
      if (e.status !== "valid") continue;
      const valueWords = new Set(
        e.value.toLowerCase().split(/\s+/).map((w) => w.replace(/[?.,!]/g, "")),
      );
      const overlap = [...queryWords].filter((w) => valueWords.has(w));
      if (overlap.length > 0) {
        results.push(
          createEvent({
            value: e.value,
            labels: e.labels,
            confidence: e.confidence,
            source_type: e.source_type,
          }),
        );
      }
    }
    return results;
  }
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  // --- Step 1: Ingest Text ---
  console.log("=== Step 1: Ingest Text ===");

  const store = new InMemoryStore();
  const retriever = new SimpleRetriever(store);

  const text =
    "I love spicy Thai food, especially pad kra pao. I work as a data scientist at Spotify.";
  console.log(`Input: "${text}"`);

  const stored = await store.ingestEvents("user-alice", text);
  console.log(`Ingested ${stored.length} event(s) for user-alice`);
  for (const se of stored) {
    console.log(
      `  id=${se.id.slice(0, 8)}... | ${se.status} | ${se.labels[0]}: ${se.value}`,
    );
  }
  console.log();

  // --- Step 2: Retrieve Events ---
  console.log("=== Step 2: Retrieve Events ===");

  const query = "What food does this person like?";
  console.log(`Query: "${query}"`);
  const results = await retriever.retrieve("user-alice", query);
  console.log(`Retrieved ${results.length} relevant event(s)`);
  for (const r of results) {
    console.log(`  - ${r.value} [${r.labels.join(", ")}]`);
  }
}

main().catch(console.error);
