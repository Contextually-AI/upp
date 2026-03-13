/**
 * UPP Portability — Export and Import for Vendor Migration (File-Based).
 *
 * Demonstrates the UPP portability operations (Level 3 conformance):
 * 1. Store events for a user in "Server A"
 * 2. Export events to a file (upp/export)
 * 3. Import the export file into "Server B" (upp/import)
 * 4. Verify all data survived migration
 *
 * Export and import work with files on disk rather than inline events.
 * The export file uses the ExportPackage format (entity_key, ontology,
 * events, exported_at). This is how UPP enables vendor lock-in avoidance.
 *
 * Expected output:
 *     === Server A: Store Events ===
 *     Stored 4 events for user-eve
 *     ...
 *     === Server A: Export Events ===
 *     Export file: /tmp/upp_export_user-eve.json
 *     Event count: 4
 *     ...
 *     === Server B: Import Events ===
 *     Imported 4 events, skipped 0
 *     ...
 *     === Verify Migration ===
 *     Server B events: 4
 *     Migration successful!
 */

import { readFileSync } from "node:fs";
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
// Types for file-based export/import responses
// =============================================================================

interface ExportResult {
  file: string;
  event_count: number;
  exported_at: string;
}

interface ImportResult {
  imported_count: number;
  skipped_count: number;
}

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
    // Naive extraction for demo. In production, use an LLM.
    const event = createEvent({
      value: text,
      labels: ["mock"],
      confidence: 0.95,
      source_type: "user_stated",
    });
    return this.persist(entityKey, [event]);
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

  async exportEvents(entityKey: string, _ontology?: string): Promise<ExportResult> {
    const all = await this.getEvents(entityKey);
    const valid = all.filter((e) => e.status === "valid");
    const exportedAt = new Date().toISOString();

    // Write ExportPackage to file
    const filePath = `/tmp/upp_export_${entityKey}.json`;
    const { writeFileSync } = await import("node:fs");
    const exportPackage = {
      entity_key: entityKey,
      ontology: "user/v1",
      events: valid,
      exported_at: exportedAt,
    };
    writeFileSync(filePath, JSON.stringify(exportPackage, null, 2));

    return { file: filePath, event_count: valid.length, exported_at: exportedAt };
  }

  async importEvents(entityKey: string, file: string, _ontology?: string): Promise<ImportResult> {
    // Read ExportPackage from file
    const content = readFileSync(file, "utf-8");
    const exportPackage = JSON.parse(content);
    const events: Event[] = exportPackage.events.map((e: StoredEvent) =>
      createEvent({
        value: e.value,
        labels: e.labels,
        confidence: e.confidence,
        source_type: e.source_type,
      }),
    );

    const stored = this.persist(entityKey, events);
    return { imported_count: stored.length, skipped_count: 0 };
  }
}

// =============================================================================
// Cardinality lookup
// =============================================================================

function getLabelCardinality(label: string): Cardinality | undefined {
  const def = getLabel(label);
  return def?.cardinality;
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  // =========================================================================
  // Server A: Store personal events
  // =========================================================================
  console.log("=== Server A: Store Events ===");

  const serverA = new InMemoryStore(getLabelCardinality);
  const entityKey = "user-eve";

  const texts = [
    "Eve Martinez",
    "Product Manager at Stripe",
    "Lives in New York City",
    "Speaks English and Spanish",
  ];

  const storedA: StoredEvent[] = [];
  for (const text of texts) {
    storedA.push(...(await serverA.ingestEvents(entityKey, text)));
  }
  console.log(`Stored ${storedA.length} events for ${entityKey}`);
  for (const s of storedA) {
    console.log(`  [${s.status}] ${s.labels[0]}: ${s.value}`);
  }
  console.log();

  // =========================================================================
  // Server A: Export events to file (upp/export)
  // =========================================================================
  console.log("=== Server A: Export Events ===");

  // In a real JSON-RPC call, the client sends:
  //   { "method": "upp/export", "params": { "entity_key": "user-eve" } }
  //
  // The server writes an ExportPackage file and responds with:
  //   { "file": "<path>", "event_count": N, "exported_at": "..." }

  const exportResult = await serverA.exportEvents(entityKey);

  console.log(`Export file: ${exportResult.file}`);
  console.log(`Event count: ${exportResult.event_count}`);
  console.log(`Exported at: ${exportResult.exported_at}`);
  console.log();

  // Peek at the file contents (ExportPackage format)
  const packageContent = JSON.parse(readFileSync(exportResult.file, "utf-8"));
  console.log(
    `File contains ${packageContent.events.length} events for entity_key=${packageContent.entity_key}`,
  );
  console.log();

  // =========================================================================
  // Server B: Import from file (upp/import)
  // =========================================================================
  console.log("=== Server B: Import Events ===");

  const serverB = new InMemoryStore(getLabelCardinality);

  // In a real JSON-RPC call, the client sends:
  //   { "method": "upp/import", "params": { "entity_key": "user-eve", "file": "<path>" } }
  //
  // The server reads the file and responds with:
  //   { "imported_count": N, "skipped_count": M }

  const importResult = await serverB.importEvents(entityKey, exportResult.file);

  console.log(`Imported ${importResult.imported_count} events, skipped ${importResult.skipped_count}`);
  console.log();

  // =========================================================================
  // Verify migration
  // =========================================================================
  console.log("=== Verify Migration ===");

  const eventsB = await serverB.getEvents(entityKey);
  console.log(`Server B events: ${eventsB.length}`);
  for (const e of eventsB) {
    console.log(`  [${e.status}] ${e.labels[0]}: ${e.value}`);
  }

  console.assert(
    eventsB.length === exportResult.event_count,
    "Migration failed — event count mismatch!",
  );
  console.log("Migration successful!");
  console.log();

  // =========================================================================
  // Summary
  // =========================================================================
  console.log("=== Portability Summary ===");
  console.log("UPP portability operations (Level 3 conformance):");
  console.log("  1. upp/export — Writes an ExportPackage .json file, returns path + metadata");
  console.log("  2. upp/import — Reads an ExportPackage .json file, imports events");
  console.log("  Key points:");
  console.log("    - Export/import work with files, not inline event arrays");
  console.log("    - The file uses ExportPackage format (entity_key, ontology, events, exported_at)");
  console.log("    - Imported events get new server-assigned IDs and timestamps");
  console.log("    - This enables zero-lock-in vendor migration");
}

main().catch(console.error);
