/**
 * @file ontology.test.ts
 * @description Tests for LabelDefinition and Ontology schemas and factories.
 */

import { describe, it, expect } from "vitest";
import {
  LabelDefinitionSchema,
  OntologySchema,
  createLabelDefinition,
  createOntology,
} from "../../src/models/ontology.js";

describe("LabelDefinitionSchema", () => {
  const validLabel = {
    name: "who_name",
    display_name: "Name",
    description: "The user's full name",
    category: "WHO",
    sensitivity: "tier_personal" as const,
    cardinality: "singular" as const,
    durability: "permanent" as const,
    examples: ["John Doe", "Jane Smith"],
  };

  it("should validate a label with all required fields", () => {
    const label = LabelDefinitionSchema.parse(validLabel);
    expect(label.name).toBe("who_name");
    expect(label.display_name).toBe("Name");
    expect(label.category).toBe("WHO");
    expect(label.sensitivity).toBe("tier_personal");
    expect(label.cardinality).toBe("singular");
    expect(label.durability).toBe("permanent");
    expect(label.examples).toEqual(["John Doe", "Jane Smith"]);
  });

  it("should validate a label with empty examples array", () => {
    const label = LabelDefinitionSchema.parse({
      ...validLabel,
      examples: [],
    });
    expect(label.examples).toEqual([]);
  });

  it("should reject missing examples", () => {
    const { examples: _, ...labelWithoutExamples } = validLabel;
    expect(() => LabelDefinitionSchema.parse(labelWithoutExamples)).toThrow();
  });

  it("should reject missing required fields", () => {
    expect(() => LabelDefinitionSchema.parse({ name: "x" })).toThrow();
    expect(() =>
      LabelDefinitionSchema.parse({
        name: "x",
        display_name: "X",
        // missing description, category, sensitivity, cardinality, durability
      }),
    ).toThrow();
  });

  it("should reject invalid sensitivity tier", () => {
    expect(() =>
      LabelDefinitionSchema.parse({
        ...validLabel,
        sensitivity: "secret",
      }),
    ).toThrow();
  });

  it("should reject invalid cardinality", () => {
    expect(() =>
      LabelDefinitionSchema.parse({
        ...validLabel,
        cardinality: "multiple",
      }),
    ).toThrow();
  });

  it("should reject invalid durability", () => {
    expect(() =>
      LabelDefinitionSchema.parse({
        ...validLabel,
        durability: "forever",
      }),
    ).toThrow();
  });

  it("should reject empty name", () => {
    expect(() =>
      LabelDefinitionSchema.parse({
        ...validLabel,
        name: "",
      }),
    ).toThrow();
  });
});

describe("OntologySchema", () => {
  const validLabel = {
    name: "who_name",
    display_name: "Name",
    description: "The user's full name",
    category: "WHO",
    sensitivity: "tier_personal" as const,
    cardinality: "singular" as const,
    durability: "permanent" as const,
    examples: ["John Doe"],
  };

  it("should validate a minimal ontology", () => {
    const ontology = OntologySchema.parse({
      version: "1.0.0",
      type: "user",
      label_count: 1,
      labels: [validLabel],
    });
    expect(ontology.version).toBe("1.0.0");
    expect(ontology.type).toBe("user");
    expect(ontology.label_count).toBe(1);
    expect(ontology.labels).toHaveLength(1);
  });

  it("should validate an empty ontology", () => {
    const ontology = OntologySchema.parse({
      version: "1.0.0",
      type: "user",
      label_count: 0,
      labels: [],
    });
    expect(ontology.labels).toHaveLength(0);
  });

  it("should reject missing required fields", () => {
    expect(() => OntologySchema.parse({})).toThrow();
    expect(() => OntologySchema.parse({ version: "1.0.0" })).toThrow();
  });

  it("should reject invalid label_count type", () => {
    expect(() =>
      OntologySchema.parse({
        version: "1.0.0",
        type: "user",
        label_count: "one",
        labels: [],
      }),
    ).toThrow();
  });
});

describe("createLabelDefinition", () => {
  it("should create a valid label", () => {
    const label = createLabelDefinition({
      name: "who_age",
      display_name: "Age",
      description: "The user's age",
      category: "WHO",
      sensitivity: "tier_personal",
      cardinality: "singular",
      durability: "permanent",
      examples: ["25", "30"],
    });
    expect(label.name).toBe("who_age");
  });
});

describe("createOntology", () => {
  it("should create a valid ontology", () => {
    const ontology = createOntology({
      version: "1.0.0",
      type: "user",
      label_count: 0,
      labels: [],
    });
    expect(ontology.version).toBe("1.0.0");
    expect(ontology.type).toBe("user");
  });
});
