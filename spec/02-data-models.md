# UPP — Data Models

## Protocol Specification: Data Models

This document defines all data models used in the UPP protocol.

---

## Table of Contents

1. [Event](#1-event)
2. [StoredEvent](#2-storedevent)
3. [LabelDefinition](#3-labeldefinition)
4. [ExportPackage](#4-exportpackage)
5. [Enumerations](#5-enumerations)
6. [Event Lifecycle](#6-event-lifecycle)

---

## 1. Event

The atomic unit of information in UPP. An Event represents a single extracted fact in its pre-storage form. Events are immutable — once created, they are never modified (event-sourcing).

| Field | Type | Required | Description |
|---|---|---|---|
| `value` | string | Yes | The extracted fact as natural-language text |
| `labels` | string[] | Yes | Ontology labels associated with this event |
| `confidence` | float | Yes | Extraction confidence score (0.0 to 1.0) |
| `source_type` | SourceType | Yes | How the fact was obtained |
| `valid_from` | string \| null | No | ISO-8601 start of the fact's validity window |
| `valid_until` | string \| null | No | ISO-8601 end of the fact's validity window |

### Example

```json
{
  "value": "User's name is Alice Chen",
  "labels": ["who_name"],
  "confidence": 0.95,
  "source_type": "user_stated"
}
```

```json
{
  "value": "User enjoys hiking and rock climbing",
  "labels": ["what_interests_hobbies"],
  "confidence": 0.85,
  "source_type": "user_stated"
}
```

---

## 2. StoredEvent

A StoredEvent is an Event after it has been persisted by the server. It extends Event with server-assigned metadata.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Unique identifier assigned by the server |
| `entity_key` | string | Yes | The user this event belongs to |
| `value` | string | Yes | The extracted fact as natural-language text |
| `labels` | string[] | Yes | Ontology labels associated with this event |
| `confidence` | float | Yes | Extraction confidence score (0.0 to 1.0) |
| `source_type` | SourceType | Yes | How the fact was obtained |
| `valid_from` | string \| null | No | ISO-8601 start of the fact's validity window |
| `valid_until` | string \| null | No | ISO-8601 end of the fact's validity window |
| `status` | EventStatus | Yes | Current lifecycle status |
| `created_at` | datetime | Yes | Timestamp when the event was created (ISO-8601) |
| `superseded_by` | string | No | ID of the event that replaced this one (when status is `superseded`) |

### Example

```json
{
  "id": "evt_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "entity_key": "user_alice",
  "value": "User's name is Alice Chen",
  "labels": ["who_name"],
  "confidence": 0.95,
  "source_type": "user_stated",
  "status": "valid",
  "created_at": "2026-01-15T10:30:00Z",
  "superseded_by": null
}
```

```json
{
  "id": "evt_00112233-4455-6677-8899-aabbccddeeff",
  "entity_key": "user_alice",
  "value": "User lives in Buenos Aires",
  "labels": ["where_current_location"],
  "confidence": 0.90,
  "source_type": "user_stated",
  "status": "superseded",
  "created_at": "2025-06-01T08:00:00Z",
  "superseded_by": "evt_ffeeddcc-bbaa-9988-7766-554433221100"
}
```

---

## 3. LabelDefinition

Defines a label within an ontology. Labels are the classification tags applied to events.

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Identifier of the label (e.g., `who_name`) |
| `display_name` | string | Yes | Human-readable name (e.g., "Name") |
| `description` | string | Yes | What this label represents |
| `category` | string | Yes | Top-level grouping defined by the ontology (e.g., `user/v1` uses WHO, WHAT, WHERE, etc.) |
| `sensitivity` | SensitivityTier | Yes | Sensitivity level of data under this label |
| `cardinality` | Cardinality | Yes | Whether values accumulate (`plural`) or supersede (`singular`) |
| `durability` | Durability | Yes | Expected lifespan of facts under this label |
| `examples` | string[] | Yes | Example values for this label |
| `classification_guidance` | string | No | Classification and disambiguation guidance for label extraction |
| `anti_examples` | string[] | No | Counter-examples showing what does NOT belong under this label |

### Cardinality

Cardinality drives the **supersession** behavior:

- **`singular`** — The label accepts one value at a time. When a new event is stored with a `singular` label, any existing event with the same label for the same user is marked as `superseded`. Examples: `who_name`, `where_home`, `when_timezone`.

- **`plural`** — The label accepts multiple simultaneous values. New events accumulate alongside existing ones. Examples: `who_languages`, `what_interests_hobbies`, `who_relationships`.

### Durability

Durability indicates how long a fact is expected to remain valid:

- **`permanent`** — Facts that rarely change. Examples: name, date of birth, nationality.
- **`transient`** — Facts that change over time. Examples: current city, current job, relationship status.
- **`ephemeral`** — Facts with very short lifespan. Examples: current mood, momentary location, current activity.

### Example

```json
{
  "name": "who_name",
  "display_name": "Name",
  "description": "The user's full name or preferred name",
  "category": "WHO",
  "sensitivity": "tier_personal",
  "cardinality": "singular",
  "durability": "permanent",
  "examples": ["Alice Chen", "Bob Smith", "María García"]
}
```

```json
{
  "name": "what_interests_hobbies",
  "display_name": "Interests & Hobbies",
  "description": "Personal interests, hobbies, and leisure activities",
  "category": "WHAT",
  "sensitivity": "tier_public",
  "cardinality": "plural",
  "durability": "transient",
  "examples": ["hiking", "painting", "playing guitar"]
}
```

---

## 4. ExportPackage

The portable file format used by `upp/export_events` and `upp/import_events`. Contains all events for a user in a format suitable for migration between UPP-compatible servers.

> **Note:** ExportPackage is the format of the `.json` file written to disk by `upp/export_events`, not the JSON-RPC response itself. The `upp/export_events` response returns the file path and metadata; the file contents use this ExportPackage structure.

| Field | Type | Required | Description |
|---|---|---|---|
| `entity_key` | string | Yes | The user whose events are exported |
| `ontology` | string | Yes | The ontology identifier (e.g., `user/v1`) |
| `events` | StoredEvent[] | Yes | All exported events |
| `exported_at` | datetime | Yes | Timestamp of the export (ISO-8601) |

### Example

```json
{
  "entity_key": "user_alice",
  "ontology": "user/v1",
  "events": [
    {
      "id": "evt_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "entity_key": "user_alice",
      "value": "User's name is Alice Chen",
      "labels": ["who_name"],
      "confidence": 0.95,
      "source_type": "user_stated",
      "status": "valid",
      "created_at": "2026-01-15T10:30:00Z",
      "superseded_by": null
    }
  ],
  "exported_at": "2026-03-01T12:00:00Z"
}
```

---

## 5. Enumerations

### SourceType

Indicates how a fact was obtained.

| Value | Description |
|---|---|
| `user_stated` | The user explicitly stated this fact |
| `agent_observed` | An AI agent observed this fact from user behavior |
| `inferred` | The fact was inferred from other data |

### EventStatus

The lifecycle status of a stored event.

| Value | Description |
|---|---|
| `valid` | Active and authoritative event |
| `staged` | Low-confidence event, pending reinforcement |
| `superseded` | Replaced by a newer event; retained for audit trail |

### SensitivityTier

Privacy classification of a label.

| Value | Description |
|---|---|
| `tier_public` | Safe to share broadly |
| `tier_work` | Professional context |
| `tier_personal` | Personal but not sensitive |
| `tier_sensitive` | Sensitive personal data |
| `tier_internal` | Never shared externally |

### Cardinality

Whether a label accepts one or many simultaneous values.

| Value | Description |
|---|---|
| `singular` | One value at a time; new event supersedes the previous one |
| `plural` | Multiple simultaneous values; events accumulate |

### Durability

Expected lifespan of facts under a label.

| Value | Description |
|---|---|
| `permanent` | Rarely changes (e.g., name, date of birth) |
| `transient` | Changes over time (e.g., current city, current job) |
| `ephemeral` | Very short-lived (e.g., current mood, momentary location) |

---

## 6. Event Lifecycle

Events follow an immutable, event-sourcing lifecycle:

```
                    ┌──────────┐
     High           │          │
     Confidence ──► │  valid   │ ◄── Reinforced
                    │          │       from staged
                    └────┬─────┘
                         │
                    Contradicted by
                    new event
                         │
                         ▼
                    ┌──────────────┐
                    │              │
                    │  superseded  │
                    │              │
                    └──────────────┘


                    ┌──────────┐
     Low            │          │
     Confidence ──► │  staged  │
                    │          │
                    └────┬─────┘
                         │
                    Reinforced by
                    matching event
                         │
                         ▼
                    ┌──────────┐
                    │          │
                    │  valid   │
                    │          │
                    └──────────┘
```

### State Transitions

- **New event with high confidence** → Created as `valid`.
- **New event with low confidence** → Created as `staged`.
- **Staged event reinforced** → Transitions to `valid`.
- **Valid event contradicted** → Transitions to `superseded`; its `superseded_by` field is set to the ID of the new event.

### Supersession Rules

Supersession is triggered when `upp/ingest` extracts an event that contradicts an existing `valid` event. The rules are:

1. Both events must share at least one label.
2. The label's `cardinality` must be `singular`.
3. The existing event is marked `superseded` (with `superseded_by` pointing to the new event).
4. The new event is created as `valid`.

For `plural` labels, events simply accumulate — no supersession occurs.

### Immutability

Events are **never modified** after creation. The only state changes are:

- `staged` → `valid` (reinforcement)
- `valid` → `superseded` (contradiction)

Deletion via `upp/delete_events` physically removes events from storage (for compliance). This is the only way events leave the system.
