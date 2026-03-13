/**
 * @file ontology.test.ts
 * @description Tests for the OntologyBackend interface contract.
 */

import { describe, it, expect } from "vitest";
import type { OntologyBackend } from "../../src/backends/ontology.js";
import type { LabelDefinition } from "../../src/models/index.js";

/**
 * Minimal mock ontology backend for testing the interface contract.
 */
class MockOntologyBackend implements OntologyBackend {
  private labels: LabelDefinition[];

  constructor(labels: LabelDefinition[] = []) {
    this.labels = labels;
  }

  async getLabels(): Promise<LabelDefinition[]> {
    return [...this.labels];
  }

  async getOntology(): Promise<string> {
    return "user/v1";
  }
}

describe("OntologyBackend interface", () => {
  const sampleLabels: LabelDefinition[] = [
    {
      name: "who_name",
      display_name: "Name",
      description: "The user's full name",
      category: "WHO",
      sensitivity: "tier_personal",
      cardinality: "singular",
      durability: "permanent",
      examples: ["John Doe", "Jane Smith"],
    },
    {
      name: "where_home",
      display_name: "Home Location",
      description: "Where the user lives",
      category: "WHERE",
      sensitivity: "tier_personal",
      cardinality: "singular",
      durability: "transient",
      examples: ["Tokyo", "New York"],
    },
  ];

  it("should return all labels", async () => {
    const backend: OntologyBackend = new MockOntologyBackend(sampleLabels);
    const labels = await backend.getLabels();
    expect(labels).toHaveLength(2);
    expect(labels[0]!.name).toBe("who_name");
    expect(labels[1]!.name).toBe("where_home");
  });

  it("should return the ontology identifier", async () => {
    const backend: OntologyBackend = new MockOntologyBackend(sampleLabels);
    const ontology = await backend.getOntology();
    expect(ontology).toBe("user/v1");
  });

  it("should return empty array for empty ontology", async () => {
    const backend: OntologyBackend = new MockOntologyBackend([]);
    const labels = await backend.getLabels();
    expect(labels).toHaveLength(0);
  });
});
