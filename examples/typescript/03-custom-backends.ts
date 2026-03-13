/**
 * UPP Custom Backends — Implementing Protocol-Based Pluggability.
 *
 * Demonstrates how to create custom implementations of UPP backend
 * interfaces using TypeScript's structural typing.
 *
 * Backend Interfaces:
 * 1. IngestBackend — Persists and retrieves events
 * 2. RetrieverBackend — Intelligent retrieval of relevant events
 * 3. OntologyBackend — Label definitions and server metadata
 *
 * Any class that implements the required methods satisfies the interface —
 * this is how UPP enables pluggable backends.
 *
 * Expected output:
 *     === Custom Store: LoggingStore ===
 *     [LOG] ingestEvents: storing 2 event(s) for user-carol
 *     Stored 2 events
 *     [LOG] getEvents: retrieving events for user-carol
 *     Retrieved 2 events
 *     ...
 *     === Custom Retriever: KeywordRetriever ===
 *     Query: "food preferences"
 *     [RETRIEVER] Searching 2 events for keywords: food, preferences
 *     Found 1 relevant event(s)
 *     ...
 *     === Protocol Compliance Check ===
 *     LoggingStore satisfies IngestBackend: true
 *     KeywordRetriever satisfies RetrieverBackend: true
 *     ...
 */

import { randomUUID } from "node:crypto";

import {
  createEvent,
  createStoredEvent,
  DefaultOntology,
  UppServer,
  UppClient,
  type Event,
  type StoredEvent,
  type IngestBackend,
  type RetrieverBackend,
  type JsonRpcRequest,
  type JsonRpcResponse,
} from "../../implementations/typescript/src/index.js";

// =============================================================================
// Simple InMemoryStore (base for the logging wrapper)
// =============================================================================

class InMemoryStore implements IngestBackend {
  private events: Map<string, StoredEvent[]> = new Map();

  async ingestEvents(entityKey: string, text: string): Promise<StoredEvent[]> {
    const extracted = this.extract(text);
    return this.persist(entityKey, extracted);
  }

  private extract(text: string): Event[] {
    // Naive keyword extraction for demo. In production, use an LLM.
    const events: Event[] = [];
    const lower = text.toLowerCase();
    if (["food", "spicy", "prefer", "dark mode", "mode"].some((w) => lower.includes(w))) {
      events.push(
        createEvent({
          value: text,
          labels: ["what_preferences"],
          confidence: 0.92,
          source_type: lower.includes("dark mode") ? "agent_observed" : "user_stated",
        }),
      );
    }
    if (["work", "scientist", "engineer"].some((w) => lower.includes(w))) {
      events.push(
        createEvent({
          value: text,
          labels: ["who_role"],
          confidence: 0.88,
          source_type: "user_stated",
        }),
      );
    }
    return events;
  }

  persist(entityKey: string, events: Event[]): StoredEvent[] {
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
// Custom Backend 1: A logging wrapper around InMemoryStore
// =============================================================================

class LoggingStore implements IngestBackend {
  private inner = new InMemoryStore();

  async ingestEvents(entityKey: string, text: string): Promise<StoredEvent[]> {
    console.log(`  [LOG] ingestEvents: extracting events from text for ${entityKey}`);
    return this.inner.ingestEvents(entityKey, text);
  }

  async getEvents(entityKey: string, ontology?: string): Promise<StoredEvent[]> {
    console.log(`  [LOG] getEvents: retrieving events for ${entityKey}`);
    return this.inner.getEvents(entityKey, ontology);
  }

  async deleteEvents(entityKey: string, eventIds?: string[]): Promise<number> {
    const scope = eventIds ? `event_ids=[${eventIds.join(", ")}]` : "all events";
    console.log(`  [LOG] deleteEvents: deleting ${scope} for ${entityKey}`);
    return this.inner.deleteEvents(entityKey, eventIds);
  }

  async exportEvents(entityKey: string, ontology?: string): Promise<StoredEvent[]> {
    console.log(`  [LOG] exportEvents: exporting events for ${entityKey}`);
    return this.inner.exportEvents(entityKey, ontology);
  }

  async importEvents(entityKey: string, events: Event[], ontology?: string): Promise<StoredEvent[]> {
    console.log(`  [LOG] importEvents: importing ${events.length} event(s) for ${entityKey}`);
    return this.inner.importEvents(entityKey, events, ontology);
  }
}

// =============================================================================
// Custom Backend 2: A keyword-based retriever
// =============================================================================

class KeywordRetriever implements RetrieverBackend {
  private store: LoggingStore;

  constructor(store: LoggingStore) {
    this.store = store;
  }

  async retrieve(entityKey: string, query: string, _ontology?: string): Promise<Event[]> {
    const stored = await this.store.getEvents(entityKey);
    const keywords = new Set(
      query
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.replace(/[?.,!]/g, ""))
        .filter((w) => w.length > 2),
    );
    console.log(
      `  [RETRIEVER] Searching ${stored.length} events for keywords: ${[...keywords].sort().join(", ")}`,
    );

    const scored: Array<{ score: number; event: Event }> = [];
    for (const e of stored) {
      if (e.status !== "valid") continue;
      const valueWords = new Set(e.value.toLowerCase().split(/\s+/));
      const overlap = [...keywords].filter((w) => valueWords.has(w)).length;
      if (overlap > 0) {
        scored.push({
          score: overlap / keywords.size,
          event: createEvent({
            value: e.value,
            labels: e.labels,
            confidence: e.confidence,
            source_type: e.source_type,
          }),
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.event);
  }
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  // =========================================================================
  // 1. Use the custom LoggingStore
  // =========================================================================
  console.log("=== Custom Store: LoggingStore ===");

  const store = new LoggingStore();

  let stored = await store.ingestEvents("user-carol", "Loves spicy Thai food");
  stored = stored.concat(await store.ingestEvents("user-carol", "Works as a data scientist"));
  console.log(`Stored ${stored.length} events`);

  const retrieved = await store.getEvents("user-carol");
  console.log(`Retrieved ${retrieved.length} events`);
  console.log();

  // =========================================================================
  // 2. Use the custom KeywordRetriever
  // =========================================================================
  console.log("=== Custom Retriever: KeywordRetriever ===");

  const retriever = new KeywordRetriever(store);
  const query = "food preferences";
  console.log(`Query: "${query}"`);

  const results = await retriever.retrieve("user-carol", query);
  console.log(`Found ${results.length} relevant event(s)`);
  for (const r of results) {
    console.log(`  - ${r.value} [${r.labels.join(", ")}]`);
  }
  console.log();

  // =========================================================================
  // 3. Protocol compliance check (structural typing)
  // =========================================================================
  console.log("=== Protocol Compliance Check ===");

  // In TypeScript, structural typing means any object with the right shape
  // satisfies the interface. These checks verify the runtime structure.
  const storeOk: IngestBackend = store; // Compiles → satisfies IngestBackend
  const retrieverOk: RetrieverBackend = retriever; // Compiles → satisfies RetrieverBackend
  console.log(`LoggingStore satisfies IngestBackend: ${storeOk !== undefined}`);
  console.log(`KeywordRetriever satisfies RetrieverBackend: ${retrieverOk !== undefined}`);
  console.log();

  // =========================================================================
  // 4. Wire it together with UppServer + UppClient
  // =========================================================================
  console.log("=== Full Client with Custom Backends ===");

  const ontology = new DefaultOntology();
  const server = new UppServer({
    store,
    retriever,
    ontology,
  });

  // Create an in-process transport (server.handleRequest as transport)
  const transport = async (request: JsonRpcRequest): Promise<JsonRpcResponse> => {
    return server.handleRequest(request);
  };

  const client = new UppClient(transport);

  // Ingest via the backend directly
  await store.ingestEvents("user-carol", "Prefers dark mode in all apps");

  // Retrieve via client
  const clientResults = await client.retrieve("user-carol", "food and dark mode preferences");
  console.log(`Client retrieved ${clientResults.length} events`);
  for (const r of clientResults) {
    console.log(`  - ${r.value}`);
  }

  // Server info via client
  const info = await client.info();
  console.log(
    `\nServer info: protocol v${info.protocol_version}, ${info.operations.length} operations`,
  );
}

main().catch(console.error);
