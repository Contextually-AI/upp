/**
 * @file edge-cases.test.ts
 * @description Edge case tests for UPP model schemas.
 */

import { describe, it, expect } from "vitest";
import { EventSchema, StoredEventSchema } from "../../src/models/event.js";
import { LabelDefinitionSchema } from "../../src/models/ontology.js";

describe("Event edge cases", () => {
  it("should handle very long values", () => {
    const longValue = "x".repeat(10000);
    const event = EventSchema.parse({
      value: longValue,
      labels: ["who_name"],
      confidence: 0.9,
      source_type: "user_stated",
    });
    expect(event.value).toHaveLength(10000);
  });

  it("should handle many labels", () => {
    const manyLabels = Array.from({ length: 50 }, (_, i) => `label_${i}`);
    const event = EventSchema.parse({
      value: "Some fact",
      labels: manyLabels,
      confidence: 0.9,
      source_type: "user_stated",
    });
    expect(event.labels).toHaveLength(50);
  });

  it("should reject null value", () => {
    expect(() =>
      EventSchema.parse({
        value: null,
        labels: ["who_name"],
        confidence: 0.9,
        source_type: "user_stated",
      }),
    ).toThrow();
  });

  it("should reject non-string labels", () => {
    expect(() =>
      EventSchema.parse({
        value: "Fact",
        labels: [123],
        confidence: 0.9,
        source_type: "user_stated",
      }),
    ).toThrow();
  });

  it("should handle confidence at exact boundaries", () => {
    expect(
      EventSchema.parse({ value: "F", labels: ["l"], confidence: 0.0, source_type: "inferred" })
        .confidence,
    ).toBe(0);
    expect(
      EventSchema.parse({ value: "F", labels: ["l"], confidence: 1.0, source_type: "inferred" })
        .confidence,
    ).toBe(1);
  });
});

describe("StoredEvent edge cases", () => {
  it("should handle superseded status with superseded_by", () => {
    const stored = StoredEventSchema.parse({
      id: "event-1",
      entity_key: "user-1",
      value: "Old name",
      labels: ["who_name"],
      confidence: 0.9,
      source_type: "user_stated",
      status: "superseded",
      created_at: "2026-01-01T00:00:00Z",
      superseded_by: "event-2",
    });
    expect(stored.status).toBe("superseded");
    expect(stored.superseded_by).toBe("event-2");
  });

  it("should accept valid status without superseded_by", () => {
    const stored = StoredEventSchema.parse({
      id: "event-1",
      entity_key: "user-1",
      value: "Name",
      labels: ["who_name"],
      confidence: 0.9,
      source_type: "user_stated",
      status: "valid",
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(stored.status).toBe("valid");
    expect(stored.superseded_by).toBeUndefined();
  });
});

describe("LabelDefinition edge cases", () => {
  it("should accept empty examples array", () => {
    const label = LabelDefinitionSchema.parse({
      name: "who_name",
      display_name: "Name",
      description: "Full name",
      category: "WHO",
      sensitivity: "tier_personal",
      cardinality: "singular",
      durability: "permanent",
      examples: [],
    });
    expect(label.examples).toEqual([]);
  });

  it("should accept all sensitivity tiers", () => {
    const tiers = [
      "tier_public",
      "tier_work",
      "tier_personal",
      "tier_sensitive",
      "tier_internal",
    ] as const;
    for (const tier of tiers) {
      const label = LabelDefinitionSchema.parse({
        name: "test_label",
        display_name: "Test",
        description: "Test label",
        category: "META",
        sensitivity: tier,
        cardinality: "singular",
        durability: "transient",
        examples: [],
      });
      expect(label.sensitivity).toBe(tier);
    }
  });

  it("should accept all cardinality values", () => {
    for (const card of ["singular", "plural"] as const) {
      const label = LabelDefinitionSchema.parse({
        name: "test_label",
        display_name: "Test",
        description: "Test label",
        category: "META",
        sensitivity: "tier_public",
        cardinality: card,
        durability: "transient",
        examples: [],
      });
      expect(label.cardinality).toBe(card);
    }
  });

  it("should accept all durability values", () => {
    for (const dur of ["permanent", "transient", "ephemeral"] as const) {
      const label = LabelDefinitionSchema.parse({
        name: "test_label",
        display_name: "Test",
        description: "Test label",
        category: "META",
        sensitivity: "tier_public",
        cardinality: "singular",
        durability: dur,
        examples: [],
      });
      expect(label.durability).toBe(dur);
    }
  });
});
