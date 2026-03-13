/**
 * UPP Event Lifecycle — Status Transitions and Supersession.
 *
 * Demonstrates the event-sourcing lifecycle in UPP:
 * 1. Events are immutable once created
 * 2. Singular-cardinality labels cause automatic supersession
 * 3. Plural-cardinality labels accumulate without supersession
 * 4. The three event statuses: valid, staged, superseded
 *
 * Scenario: Tracking a user's career and skills over time.
 *
 * Expected output:
 *     === Phase 1: Initial Facts ===
 *     Stored 3 events for user-bob
 *       [valid] who_role: Software Engineer at Acme Corp
 *       [valid] where_home: Lives in San Francisco, CA
 *       [valid] what_skills: Proficient in Python and TypeScript
 *
 *     === Phase 2: Singular Supersession (Job Change) ===
 *     Stored new job event
 *     All occupation events:
 *       [superseded] Software Engineer at Acme Corp (superseded_by=<uuid>...)
 *       [valid] Senior Engineer at Google ← current
 *
 *     === Phase 3: Plural Accumulation (New Skills) ===
 *     All skill events (what_skills):
 *       [valid] Proficient in Python and TypeScript
 *       [valid] Learning Rust programming
 *     Both skills coexist — plural labels accumulate!
 *
 *     === Phase 4: Staged Events (Low Confidence) ===
 *     Stored low-confidence event
 *       [valid] what_skills: Might know some Go (confidence=0.3)
 *     Note: Low confidence events are still stored as 'valid'.
 *     Staging logic is an implementation choice for the server.
 *
 *     === Summary ===
 *     Total events: 6
 *       valid: 5
 *       superseded: 1
 */

import { randomUUID } from "node:crypto";

import {
  createEvent,
  createStoredEvent,
  getLabel,
  type Cardinality,
  type Event,
  type StoredEvent,
  type IngestBackend,
} from "../../implementations/typescript/src/index.js";

// =============================================================================
// InMemoryStore with cardinality-aware supersession
// =============================================================================

class InMemoryStore implements IngestBackend {
  private events: Map<string, StoredEvent[]> = new Map();
  private cardinalityFn?: (label: string) => Cardinality | undefined;

  constructor(cardinalityFn?: (label: string) => Cardinality | undefined) {
    this.cardinalityFn = cardinalityFn;
  }

  async ingestEvents(entityKey: string, text: string): Promise<StoredEvent[]> {
    const extracted = this.extract(text);
    return this.persist(entityKey, extracted);
  }

  private extract(text: string): Event[] {
    // Naive keyword extraction for demo. In production, use an LLM.
    const events: Event[] = [];
    const lower = text.toLowerCase();
    if (["engineer", "scientist", "work"].some((w) => lower.includes(w))) {
      events.push(
        createEvent({
          value: text,
          labels: ["who_role"],
          confidence: 0.95,
          source_type: "user_stated",
        }),
      );
    }
    if (["live", "lives", "moved", "home"].some((w) => lower.includes(w))) {
      events.push(
        createEvent({
          value: text,
          labels: ["where_home"],
          confidence: 0.9,
          source_type: "user_stated",
        }),
      );
    }
    if (["proficient", "skill", "learning", "know"].some((w) => lower.includes(w))) {
      events.push(
        createEvent({
          value: text,
          labels: ["what_skills"],
          confidence: lower.includes("might") ? 0.3 : lower.includes("learning") ? 0.75 : 0.88,
          source_type: lower.includes("might")
            ? "inferred"
            : lower.includes("learning")
              ? "agent_observed"
              : "user_stated",
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

      // Handle singular supersession
      if (this.cardinalityFn) {
        for (const label of event.labels) {
          const cardinality = this.cardinalityFn(label);
          if (cardinality === "singular") {
            for (const e of existing) {
              if (e.labels.includes(label) && e.status === "valid") {
                // Mutate for demo purposes (events are conceptually immutable)
                (e as Record<string, unknown>).status = "superseded";
                (e as Record<string, unknown>).superseded_by = se.id;
              }
            }
          }
        }
      }

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
// Cardinality lookup using the default ontology
// =============================================================================

function getLabelCardinality(label: string): Cardinality | undefined {
  const def = getLabel(label);
  return def?.cardinality;
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  // Create store with ontology-aware supersession
  const store = new InMemoryStore(getLabelCardinality);
  const entityKey = "user-bob";

  // =========================================================================
  // Phase 1: Store initial facts
  // =========================================================================
  console.log("=== Phase 1: Initial Facts ===");

  const texts = [
    "Software Engineer at Acme Corp",
    "Lives in San Francisco, CA",
    "Proficient in Python and TypeScript",
  ];

  const stored: StoredEvent[] = [];
  for (const text of texts) {
    stored.push(...(await store.ingestEvents(entityKey, text)));
  }
  console.log(`Stored ${stored.length} events for ${entityKey}`);
  for (const s of stored) {
    console.log(`  [${s.status}] ${s.labels[0]}: ${s.value}`);
  }
  console.log();

  // =========================================================================
  // Phase 2: Singular supersession — job change
  // =========================================================================
  console.log("=== Phase 2: Singular Supersession (Job Change) ===");

  // who_role has singular cardinality → new value supersedes old
  await store.ingestEvents(entityKey, "Senior Engineer at Google");
  console.log("Stored new job event");

  // Show the supersession in action
  const allEvents = await store.getEvents(entityKey);
  const occupationEvents = allEvents.filter((e) => e.labels.includes("who_role"));

  console.log("All occupation events:");
  for (const e of occupationEvents) {
    if (e.status === "superseded") {
      console.log(`  [${e.status}] ${e.value} (superseded_by=${e.superseded_by?.slice(0, 8)}...)`);
    } else {
      console.log(`  [${e.status}] ${e.value} ← current`);
    }
  }
  console.log();

  // =========================================================================
  // Phase 3: Plural accumulation — new skills
  // =========================================================================
  console.log("=== Phase 3: Plural Accumulation (New Skills) ===");

  // what_skills has plural cardinality → new values accumulate
  await store.ingestEvents(entityKey, "Learning Rust programming");

  const allEventsAfterSkill = await store.getEvents(entityKey);
  const skillEvents = allEventsAfterSkill.filter(
    (e) => e.labels.includes("what_skills") && e.status === "valid",
  );

  console.log("All skill events (what_skills):");
  for (const e of skillEvents) {
    console.log(`  [${e.status}] ${e.value}`);
  }
  console.log("Both skills coexist — plural labels accumulate!");
  console.log();

  // =========================================================================
  // Phase 4: Staged events — low confidence
  // =========================================================================
  console.log("=== Phase 4: Staged Events (Low Confidence) ===");

  const stagedStored = await store.ingestEvents(entityKey, "Might know some Go");
  console.log("Stored low-confidence event");
  for (const s of stagedStored) {
    console.log(`  [${s.status}] ${s.labels[0]}: ${s.value} (confidence=${s.confidence})`);
  }
  console.log("Note: Low confidence events are still stored as 'valid'.");
  console.log("Staging logic is an implementation choice for the server.");
  console.log();

  // =========================================================================
  // Summary
  // =========================================================================
  console.log("=== Summary ===");

  const finalEvents = await store.getEvents(entityKey);
  console.log(`Total events: ${finalEvents.length}`);

  const byStatus: Record<string, number> = {};
  for (const e of finalEvents) {
    byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
  }
  for (const status of Object.keys(byStatus).sort()) {
    console.log(`  ${status}: ${byStatus[status]}`);
  }
}

main().catch(console.error);
