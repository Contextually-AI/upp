/**
 * @file enums.test.ts
 * @description Tests for UPP protocol enumerations.
 */

import { describe, it, expect } from "vitest";
import {
  EventStatusSchema,
  EVENT_STATUS_VALUES,
  SourceTypeSchema,
  SOURCE_TYPE_VALUES,
  SensitivityTierSchema,
  SENSITIVITY_TIER_VALUES,
  CardinalitySchema,
  CARDINALITY_VALUES,
  DurabilitySchema,
  DURABILITY_VALUES,
} from "../../src/models/enums.js";

describe("EventStatusSchema", () => {
  it("should accept valid values", () => {
    expect(EventStatusSchema.parse("valid")).toBe("valid");
    expect(EventStatusSchema.parse("staged")).toBe("staged");
    expect(EventStatusSchema.parse("superseded")).toBe("superseded");
  });

  it("should reject invalid values", () => {
    expect(() => EventStatusSchema.parse("unknown")).toThrow();
    expect(() => EventStatusSchema.parse("invalid_status")).toThrow();
    expect(() => EventStatusSchema.parse("")).toThrow();
  });

  it("should expose all valid values", () => {
    expect(EVENT_STATUS_VALUES).toEqual(["valid", "staged", "superseded"]);
  });
});

describe("SourceTypeSchema", () => {
  it("should accept valid values", () => {
    expect(SourceTypeSchema.parse("user_stated")).toBe("user_stated");
    expect(SourceTypeSchema.parse("agent_observed")).toBe("agent_observed");
    expect(SourceTypeSchema.parse("inferred")).toBe("inferred");
  });

  it("should reject invalid values", () => {
    expect(() => SourceTypeSchema.parse("manual")).toThrow();
    expect(() => SourceTypeSchema.parse("")).toThrow();
  });

  it("should expose all valid values", () => {
    expect(SOURCE_TYPE_VALUES).toEqual(["user_stated", "agent_observed", "inferred"]);
  });
});

describe("SensitivityTierSchema", () => {
  it("should accept valid values", () => {
    expect(SensitivityTierSchema.parse("tier_public")).toBe("tier_public");
    expect(SensitivityTierSchema.parse("tier_work")).toBe("tier_work");
    expect(SensitivityTierSchema.parse("tier_personal")).toBe("tier_personal");
    expect(SensitivityTierSchema.parse("tier_sensitive")).toBe("tier_sensitive");
    expect(SensitivityTierSchema.parse("tier_internal")).toBe("tier_internal");
  });

  it("should reject invalid values", () => {
    expect(() => SensitivityTierSchema.parse("public")).toThrow();
    expect(() => SensitivityTierSchema.parse("secret")).toThrow();
  });

  it("should expose all valid values in order", () => {
    expect(SENSITIVITY_TIER_VALUES).toEqual([
      "tier_public",
      "tier_work",
      "tier_personal",
      "tier_sensitive",
      "tier_internal",
    ]);
  });
});

describe("CardinalitySchema", () => {
  it("should accept valid values", () => {
    expect(CardinalitySchema.parse("singular")).toBe("singular");
    expect(CardinalitySchema.parse("plural")).toBe("plural");
  });

  it("should reject invalid values", () => {
    expect(() => CardinalitySchema.parse("multiple")).toThrow();
    expect(() => CardinalitySchema.parse("single")).toThrow();
  });

  it("should expose all valid values", () => {
    expect(CARDINALITY_VALUES).toEqual(["singular", "plural"]);
  });
});

describe("DurabilitySchema", () => {
  it("should accept valid values", () => {
    expect(DurabilitySchema.parse("permanent")).toBe("permanent");
    expect(DurabilitySchema.parse("transient")).toBe("transient");
    expect(DurabilitySchema.parse("ephemeral")).toBe("ephemeral");
  });

  it("should reject invalid values", () => {
    expect(() => DurabilitySchema.parse("temporary")).toThrow();
    expect(() => DurabilitySchema.parse("forever")).toThrow();
  });

  it("should expose all valid values", () => {
    expect(DURABILITY_VALUES).toEqual(["permanent", "transient", "ephemeral"]);
  });
});
