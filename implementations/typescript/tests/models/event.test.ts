/**
 * @file event.test.ts
 * @description Tests for Event and StoredEvent schemas and factories.
 */

import { describe, it, expect } from "vitest";
import {
  EventSchema,
  StoredEventSchema,
  createEvent,
  createStoredEvent,
} from "../../src/models/event.js";

describe("EventSchema", () => {
  it("should validate a valid event with all required fields", () => {
    const event = EventSchema.parse({
      value: "I live in Buenos Aires",
      labels: ["where_home"],
      confidence: 0.9,
      source_type: "user_stated",
    });
    expect(event.value).toBe("I live in Buenos Aires");
    expect(event.labels).toEqual(["where_home"]);
    expect(event.confidence).toBe(0.9);
    expect(event.source_type).toBe("user_stated");
  });

  it("should validate a full event with all source types", () => {
    for (const source_type of ["user_stated", "agent_observed", "inferred"] as const) {
      const event = EventSchema.parse({
        value: "I work as a software engineer",
        labels: ["who_job_title"],
        confidence: 0.95,
        source_type,
      });
      expect(event.source_type).toBe(source_type);
    }
  });

  it("should reject missing confidence", () => {
    expect(() =>
      EventSchema.parse({
        value: "Some fact",
        labels: ["who_name"],
        source_type: "user_stated",
      }),
    ).toThrow();
  });

  it("should reject missing source_type", () => {
    expect(() =>
      EventSchema.parse({
        value: "Some fact",
        labels: ["who_name"],
        confidence: 0.9,
      }),
    ).toThrow();
  });

  it("should reject empty value", () => {
    expect(() =>
      EventSchema.parse({
        value: "",
        labels: ["who_name"],
        confidence: 0.9,
        source_type: "user_stated",
      }),
    ).toThrow();
  });

  it("should reject empty labels array", () => {
    expect(() =>
      EventSchema.parse({
        value: "Some fact",
        labels: [],
        confidence: 0.9,
        source_type: "user_stated",
      }),
    ).toThrow();
  });

  it("should reject confidence out of range", () => {
    expect(() =>
      EventSchema.parse({
        value: "Some fact",
        labels: ["who_name"],
        confidence: 1.5,
        source_type: "user_stated",
      }),
    ).toThrow();

    expect(() =>
      EventSchema.parse({
        value: "Some fact",
        labels: ["who_name"],
        confidence: -0.1,
        source_type: "user_stated",
      }),
    ).toThrow();
  });

  it("should reject invalid source_type", () => {
    expect(() =>
      EventSchema.parse({
        value: "Some fact",
        labels: ["who_name"],
        confidence: 0.9,
        source_type: "magic",
      }),
    ).toThrow();
  });

  it("should accept confidence at boundaries", () => {
    const event0 = EventSchema.parse({
      value: "Fact",
      labels: ["l"],
      confidence: 0,
      source_type: "inferred",
    });
    expect(event0.confidence).toBe(0);

    const event1 = EventSchema.parse({
      value: "Fact",
      labels: ["l"],
      confidence: 1,
      source_type: "inferred",
    });
    expect(event1.confidence).toBe(1);
  });

  it("should accept multiple labels", () => {
    const event = EventSchema.parse({
      value: "I work as a senior engineer at Anthropic",
      labels: ["who_job_title", "who_employer"],
      confidence: 0.9,
      source_type: "user_stated",
    });
    expect(event.labels).toEqual(["who_job_title", "who_employer"]);
  });

  it("should default valid_from and valid_until to null", () => {
    const event = EventSchema.parse({
      value: "Some fact",
      labels: ["who_name"],
      confidence: 0.9,
      source_type: "user_stated",
    });
    expect(event.valid_from).toBeNull();
    expect(event.valid_until).toBeNull();
  });

  it("should accept valid_from and valid_until as ISO-8601 strings", () => {
    const event = EventSchema.parse({
      value: "Works at Acme Corp",
      labels: ["what_occupation"],
      confidence: 0.9,
      source_type: "user_stated",
      valid_from: "2025-01-01T00:00:00Z",
      valid_until: "2026-06-30T23:59:59Z",
    });
    expect(event.valid_from).toBe("2025-01-01T00:00:00Z");
    expect(event.valid_until).toBe("2026-06-30T23:59:59Z");
  });

  it("should accept valid_from without valid_until", () => {
    const event = EventSchema.parse({
      value: "Started learning Rust",
      labels: ["what_skills"],
      confidence: 0.8,
      source_type: "user_stated",
      valid_from: "2026-01-15T00:00:00Z",
    });
    expect(event.valid_from).toBe("2026-01-15T00:00:00Z");
    expect(event.valid_until).toBeNull();
  });

  it("should reject invalid valid_from datetime", () => {
    expect(() =>
      EventSchema.parse({
        value: "Some fact",
        labels: ["who_name"],
        confidence: 0.9,
        source_type: "user_stated",
        valid_from: "not-a-date",
      }),
    ).toThrow();
  });
});

describe("StoredEventSchema", () => {
  const baseStoredEvent = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    entity_key: "user-123",
    value: "I live in Buenos Aires",
    labels: ["where_home"],
    confidence: 0.9,
    source_type: "user_stated" as const,
    status: "valid" as const,
    created_at: "2026-02-24T14:30:00Z",
  };

  it("should validate a minimal stored event", () => {
    const stored = StoredEventSchema.parse(baseStoredEvent);
    expect(stored.id).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(stored.entity_key).toBe("user-123");
    expect(stored.status).toBe("valid");
    expect(stored.confidence).toBe(0.9);
    expect(stored.source_type).toBe("user_stated");
    expect(stored.superseded_by).toBeUndefined();
  });

  it("should validate a stored event with all fields", () => {
    const stored = StoredEventSchema.parse({
      ...baseStoredEvent,
      confidence: 0.85,
      source_type: "agent_observed",
      superseded_by: "another-id",
    });
    expect(stored.confidence).toBe(0.85);
    expect(stored.source_type).toBe("agent_observed");
    expect(stored.superseded_by).toBe("another-id");
  });

  it("should accept all status values", () => {
    for (const status of ["valid", "staged", "superseded"] as const) {
      const stored = StoredEventSchema.parse({ ...baseStoredEvent, status });
      expect(stored.status).toBe(status);
    }
  });

  it("should reject missing required fields", () => {
    expect(() =>
      StoredEventSchema.parse({
        value: "hello",
        labels: ["x"],
        confidence: 0.9,
        source_type: "user_stated",
      }),
    ).toThrow();
    expect(() =>
      StoredEventSchema.parse({
        id: "abc",
        value: "hello",
        labels: ["x"],
        confidence: 0.9,
        source_type: "user_stated",
        status: "valid",
        created_at: "2026-01-01T00:00:00Z",
        // missing entity_key
      }),
    ).toThrow();
  });

  it("should reject invalid status", () => {
    expect(() =>
      StoredEventSchema.parse({
        ...baseStoredEvent,
        status: "unknown",
      }),
    ).toThrow();
  });

  it("should reject invalid datetime", () => {
    expect(() =>
      StoredEventSchema.parse({
        ...baseStoredEvent,
        created_at: "not-a-date",
      }),
    ).toThrow();
  });
});

describe("createEvent", () => {
  it("should create a valid event", () => {
    const event = createEvent({
      value: "Prefers dark mode",
      labels: ["pref_ui"],
      confidence: 0.8,
      source_type: "user_stated",
    });
    expect(event.value).toBe("Prefers dark mode");
    expect(event.labels).toEqual(["pref_ui"]);
  });

  it("should throw on invalid input", () => {
    expect(() =>
      createEvent({ value: "", labels: [], confidence: 0.5, source_type: "user_stated" }),
    ).toThrow();
  });
});

describe("createStoredEvent", () => {
  it("should create a valid stored event", () => {
    const stored = createStoredEvent({
      id: "abc-123",
      entity_key: "user-1",
      value: "Fact",
      labels: ["who_name"],
      confidence: 0.9,
      source_type: "user_stated",
      status: "valid",
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(stored.id).toBe("abc-123");
    expect(stored.status).toBe("valid");
  });
});
