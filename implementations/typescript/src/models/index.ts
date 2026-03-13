/**
 * @file index.ts
 * @description Barrel export for all UPP data model types, schemas, and utilities.
 *
 * Re-exports every entity, enumeration, Zod schema, factory function, and
 * constant defined in the UPP TypeScript SDK models package.
 *
 * @module
 */

// ─── Enumerations ────────────────────────────────────────────────────────────
export {
  EventStatusSchema,
  type EventStatus,
  EVENT_STATUS_VALUES,
  SourceTypeSchema,
  type SourceType,
  SOURCE_TYPE_VALUES,
  SensitivityTierSchema,
  type SensitivityTier,
  SENSITIVITY_TIER_VALUES,
  CardinalitySchema,
  type Cardinality,
  CARDINALITY_VALUES,
  DurabilitySchema,
  type Durability,
  DURABILITY_VALUES,
  TaskStatusSchema,
  type TaskStatus,
  TaskStatusValues,
} from "./enums.js";

// ─── Event Entities ──────────────────────────────────────────────────────────
export {
  EventSchema,
  type Event,
  type EventInput,
  StoredEventSchema,
  type StoredEvent,
  type StoredEventInput,
  createEvent,
  createStoredEvent,
  TaskResultSchema,
  type TaskResult,
  type ContextualizeResult,
} from "./event.js";

// ─── Ontology Entities ───────────────────────────────────────────────────────
export {
  LabelDefinitionSchema,
  type LabelDefinition,
  type LabelDefinitionInput,
  OntologySchema,
  type Ontology,
  type OntologyInput,
  createLabelDefinition,
  createOntology,
} from "./ontology.js";
