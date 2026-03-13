/**
 * @file retriever.test.ts
 * @description Tests for the RetrieverBackend interface contract.
 */

import { describe, it, expect } from "vitest";
import type { RetrieverBackend } from "../../src/backends/retriever.js";
import type { Event } from "../../src/models/index.js";

/**
 * Minimal mock retriever for testing the interface contract.
 */
class MockRetrieverBackend implements RetrieverBackend {
  private fakeEvents: Event[];

  constructor(fakeEvents: Event[] = []) {
    this.fakeEvents = fakeEvents;
  }

  async retrieve(entityKey: string, query: string): Promise<Event[]> {
    // Simple keyword matching for testing
    return this.fakeEvents.filter((e) => e.value.toLowerCase().includes(query.toLowerCase()));
  }
}

describe("RetrieverBackend interface", () => {
  it("should retrieve matching events", async () => {
    const events: Event[] = [
      {
        value: "I live in Tokyo",
        labels: ["where_home"],
        confidence: 0.9,
        source_type: "user_stated",
      },
      {
        value: "I work as an engineer",
        labels: ["who_job_title"],
        confidence: 0.85,
        source_type: "user_stated",
      },
      {
        value: "I love sushi",
        labels: ["pref_food"],
        confidence: 0.8,
        source_type: "agent_observed",
      },
    ];

    const retriever: RetrieverBackend = new MockRetrieverBackend(events);
    const results = await retriever.retrieve("user-1", "Tokyo");
    expect(results).toHaveLength(1);
    expect(results[0]!.value).toBe("I live in Tokyo");
  });

  it("should return empty array for no matches", async () => {
    const retriever: RetrieverBackend = new MockRetrieverBackend([
      {
        value: "I live in Tokyo",
        labels: ["where_home"],
        confidence: 0.9,
        source_type: "user_stated",
      },
    ]);
    const results = await retriever.retrieve("user-1", "nonexistent");
    expect(results).toHaveLength(0);
  });

  it("should return results without ontology parameter", async () => {
    const retriever: RetrieverBackend = new MockRetrieverBackend([
      { value: "Some fact", labels: ["who_name"], confidence: 0.9, source_type: "user_stated" },
    ]);
    const results = await retriever.retrieve("user-1", "fact");
    expect(results).toHaveLength(1);
  });
});
