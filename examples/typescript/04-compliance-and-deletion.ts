/**
 * UPP Compliance and Deletion — GDPR / CCPA Right to Erasure.
 *
 * Demonstrates the compliance-related UPP operations:
 * 1. Store events for a user
 * 2. List all events (upp/events)
 * 3. Delete specific events by ID (selective deletion)
 * 4. Delete all events for a user (right to erasure)
 * 5. Verify deletion at each step
 *
 * These operations are essential for GDPR Article 17 (Right to Erasure),
 * CCPA deletion rights, and similar data protection regulations.
 *
 * Expected output:
 *     === Step 1: Store Events ===
 *     Stored 4 events for user-dave
 *     ...
 *     === Step 2: List All Events ===
 *     4 events stored for user-dave
 *     ...
 *     === Step 3: Selective Deletion ===
 *     Deleted 1 event(s) by ID
 *     Remaining: 3 events
 *     ...
 *     === Step 4: Right to Erasure (Delete All) ===
 *     Deleted 3 event(s) — full erasure
 *     Remaining: 0 events
 *     User data completely erased!
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
// InMemoryStore
// =============================================================================

class InMemoryStore implements IngestBackend {
  private events: Map<string, StoredEvent[]> = new Map();

  async ingestEvents(entityKey: string, text: string): Promise<StoredEvent[]> {
    const extracted = this.extract(text);
    return this.persist(entityKey, extracted);
  }

  private extract(text: string): Event[] {
    // Naive keyword extraction for demo. In production, use an LLM.
    const lower = text.toLowerCase();
    let label = "mock";
    let source: "user_stated" | "agent_observed" = "user_stated";
    let confidence = 0.95;
    if (lower.includes("name") || (text[0]?.match(/[A-Z]/) && text.includes(" ") && !text.includes("@") && !lower.includes(","))) {
      label = "who_name";
      confidence = 0.99;
    } else if (text.includes("@")) {
      label = "who_contact_info";
      confidence = 0.99;
    } else if (["live", "lives", "berlin", "city"].some((w) => lower.includes(w))) {
      label = "where_home";
    } else if (["work", "startup", "engineer"].some((w) => lower.includes(w))) {
      label = "who_role";
      confidence = 0.85;
      source = "agent_observed";
    }
    return [
      createEvent({
        value: text,
        labels: [label],
        confidence,
        source_type: source,
      }),
    ];
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
// Main
// =============================================================================

async function main(): Promise<void> {
  const store = new InMemoryStore();
  const entityKey = "user-dave";

  // =========================================================================
  // Step 1: Store events
  // =========================================================================
  console.log("=== Step 1: Store Events ===");

  const texts = [
    "My name is Dave Smith",
    "dave.smith@example.com",
    "Lives in Berlin, Germany",
    "Works at a fintech startup",
  ];

  const stored: StoredEvent[] = [];
  for (const text of texts) {
    stored.push(...(await store.ingestEvents(entityKey, text)));
  }
  console.log(`Stored ${stored.length} events for ${entityKey}`);
  for (const s of stored) {
    console.log(`  id=${s.id.slice(0, 8)}... | ${s.labels[0]}: ${s.value}`);
  }
  console.log();

  // =========================================================================
  // Step 2: List all events (upp/events)
  // =========================================================================
  console.log("=== Step 2: List All Events ===");

  const allEvents = await store.getEvents(entityKey);
  console.log(`${allEvents.length} events stored for ${entityKey}`);
  for (const e of allEvents) {
    console.log(`  [${e.status}] id=${e.id.slice(0, 8)}... | ${e.labels[0]}: ${e.value}`);
  }
  console.log();

  // =========================================================================
  // Step 3: Selective deletion (delete specific events by ID)
  // =========================================================================
  console.log("=== Step 3: Selective Deletion ===");

  // Delete the email event specifically (e.g., user requests email removal)
  const emailEvent = allEvents.find((e) => e.labels.includes("who_contact_info"));
  if (!emailEvent) throw new Error("Email event not found");
  console.log(`Deleting event: ${emailEvent.labels[0]}: ${emailEvent.value}`);

  const deletedCount = await store.deleteEvents(entityKey, [emailEvent.id]);
  console.log(`Deleted ${deletedCount} event(s) by ID`);

  const remaining = await store.getEvents(entityKey);
  console.log(`Remaining: ${remaining.length} events`);
  for (const e of remaining) {
    console.log(`  [${e.status}] ${e.labels[0]}: ${e.value}`);
  }
  console.log();

  // Verify the email event is gone
  const emailEvents = remaining.filter((e) => e.labels.includes("who_contact_info"));
  console.assert(emailEvents.length === 0, "Email event should have been deleted!");
  console.log("Verified: email event successfully deleted");
  console.log();

  // =========================================================================
  // Step 4: Right to erasure — delete ALL events
  // =========================================================================
  console.log("=== Step 4: Right to Erasure (Delete All) ===");

  // When a user exercises their right to erasure (GDPR Art. 17),
  // pass no event_ids to delete everything.
  const deletedAll = await store.deleteEvents(entityKey);
  console.log(`Deleted ${deletedAll} event(s) — full erasure`);

  const afterErasure = await store.getEvents(entityKey);
  console.log(`Remaining: ${afterErasure.length} events`);
  console.assert(afterErasure.length === 0, "All events should have been deleted!");
  console.log("User data completely erased!");
  console.log();

  // =========================================================================
  // Summary
  // =========================================================================
  console.log("=== Compliance Summary ===");
  console.log("UPP provides two deletion modes for regulatory compliance:");
  console.log("  1. Selective deletion — delete specific events by ID");
  console.log("  2. Full erasure — delete all events for a user (GDPR Art. 17)");
  console.log("Both are exposed via the upp/delete operation.");
}

main().catch(console.error);
