# UPP — Operations

## Protocol Specification: Operations

This document defines all 10 operations in the UPP protocol.

---

## Table of Contents

1. [Operations Overview](#1-operations-overview)
2. [Core Operations](#2-core-operations)
   - [upp/ingest](#uppingest)
   - [upp/retrieve](#uppretrieve)
   - [upp/contextualize](#uppcontextualize)
   - [upp/get_events](#uppget_events)
   - [upp/delete_events](#uppdelete_events)
3. [Discovery Operations](#3-discovery-operations)
   - [upp/info](#uppinfo)
   - [upp/get_labels](#uppget_labels)
   - [upp/get_tasks](#uppget_tasks)
4. [Portability Operations](#4-portability-operations)
   - [upp/export_events](#uppexport_events)
   - [upp/import_events](#uppimport_events)
5. [Parameter Philosophy](#5-parameter-philosophy)

---

## 1. Operations Overview

| Operation | Type | Description |
|---|---|---|
| `upp/ingest` | Core (write) | Extract and ingest events from text |
| `upp/retrieve` | Core (read) | Ranked search for relevant events |
| `upp/contextualize` | Core (read+write) | Retrieve context and ingest events in the background |
| `upp/get_events` | Core (read) | Raw listing of stored events |
| `upp/delete_events` | Core (write) | Delete events (compliance) |
| `upp/info` | Discovery | Server metadata and capabilities |
| `upp/get_labels` | Discovery | Label definitions from an ontology |
| `upp/get_tasks` | Discovery | Check status of background tasks |
| `upp/export_events` | Portability | Export events for migration |
| `upp/import_events` | Portability | Import events from another server |

---

## 2. Core Operations

### `upp/ingest`

**Extract and ingest events from text.**

Given a text input, the server extracts relevant personal facts and persists them as events. Events are immutable (event-sourcing). If a new event contradicts an existing one for a `singular` label, the existing event is marked as `superseded`.

#### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `entity_key` | string | Yes | Identifier of the user |
| `text` | string | Yes | Text from which to extract events |

#### Returns

`StoredEvent[]` — Array of persisted events with server-assigned IDs and metadata.

#### Behavior

1. The server analyzes the input text and extracts relevant personal facts.
2. Each fact is mapped to one or more ontology labels.
3. For `singular` labels, the server checks for existing events and performs supersession if needed.
4. Events are persisted and returned with server-assigned IDs, timestamps, and status.

#### Example

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "upp/ingest",
  "params": {
    "entity_key": "user_alice",
    "text": "My name is Alice and I just moved to Buenos Aires. I love hiking and photography."
  },
  "id": 1
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": [
    {
      "id": "evt_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "entity_key": "user_alice",
      "value": "User's name is Alice",
      "labels": ["who_name"],
      "confidence": 0.95,
      "source_type": "user_stated",
      "status": "valid",
      "created_at": "2026-01-15T10:30:00Z",
      "superseded_by": null
    },
    {
      "id": "evt_b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "entity_key": "user_alice",
      "value": "User lives in Buenos Aires",
      "labels": ["where_current_location"],
      "confidence": 0.92,
      "source_type": "user_stated",
      "status": "valid",
      "created_at": "2026-01-15T10:30:00Z",
      "superseded_by": null
    },
    {
      "id": "evt_c3d4e5f6-a7b8-9012-cdef-123456789012",
      "entity_key": "user_alice",
      "value": "User enjoys hiking and photography",
      "labels": ["what_interests_hobbies"],
      "confidence": 0.88,
      "source_type": "user_stated",
      "status": "valid",
      "created_at": "2026-01-15T10:30:00Z",
      "superseded_by": null
    }
  ],
  "id": 1
}
```

---

### `upp/retrieve`

**Retrieve relevant events based on a free-text query.**

Given a query, the server interprets it and returns events ranked by relevance. The server decides what constitutes "relevant" — this is intentionally left to the implementation.

#### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `entity_key` | string | Yes | Identifier of the user |
| `query` | string | Yes | Free-text query. The server interprets and decides relevance |

#### Returns

`Event[]` — Array of events ranked by relevance to the query.

#### Behavior

1. The server interprets the query to understand what information is being requested.
2. Events matching the query are retrieved and ranked by relevance.
3. The server decides the ranking algorithm and number of results.

#### Example

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "upp/retrieve",
  "params": {
    "entity_key": "user_alice",
    "query": "What are Alice's hobbies and interests?"
  },
  "id": 2
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": [
    {
      "value": "User enjoys hiking and photography",
      "labels": ["what_interests_hobbies"],
      "confidence": 0.88,
      "source_type": "user_stated"
    },
    {
      "value": "User is interested in machine learning",
      "labels": ["what_interests_hobbies"],
      "confidence": 0.75,
      "source_type": "agent_observed"
    }
  ],
  "id": 2
}
```

---

### `upp/contextualize`

**Retrieve relevant context and ingest new events in a single call.**

The most common interaction pattern with UPP: given a text, the server first retrieves existing events relevant to that text (returned synchronously), then extracts and ingests new events from the same text in the background. This combines `upp/retrieve` and `upp/ingest` into a single optimized operation.

#### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `entity_key` | string | Yes | Identifier of the user |
| `text` | string | Yes | Text to retrieve context for and extract events from |

#### Returns

| Field | Type | Description |
|---|---|---|
| `events` | StoredEvent[] | Relevant existing events, ranked by relevance to the text |
| `task_id` | string | Reference to the background ingest task |

#### Behavior

1. The server uses the input text as a query to retrieve relevant existing events for the user. These are returned **synchronously** in the response.
2. The server schedules an ingest operation for the same text to run **in the background**. New events are extracted, classified, and persisted asynchronously.
3. A `task_id` is returned that can be used with `upp/get_tasks` to check the status and results of the background ingest.
4. The retrieve and ingest may share internal classification work, allowing the server to optimize the combined operation.

#### Example

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "upp/contextualize",
  "params": {
    "entity_key": "user_alice",
    "text": "I just moved to Buenos Aires and I'm looking for good hiking trails nearby."
  },
  "id": 1
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": {
    "events": [
      {
        "id": "evt_c3d4e5f6-a7b8-9012-cdef-123456789012",
        "entity_key": "user_alice",
        "value": "User enjoys hiking and photography",
        "labels": ["what_interests_hobbies"],
        "confidence": 0.88,
        "source_type": "user_stated",
        "status": "valid",
        "created_at": "2026-01-15T10:30:00Z",
        "superseded_by": null
      },
      {
        "id": "evt_00112233-4455-6677-8899-aabbccddeeff",
        "entity_key": "user_alice",
        "value": "User lives in New York",
        "labels": ["where_current_location"],
        "confidence": 0.90,
        "source_type": "user_stated",
        "status": "valid",
        "created_at": "2025-06-01T08:00:00Z",
        "superseded_by": null
      }
    ],
    "task_id": "task_a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  },
  "id": 1
}
```

> **Note:** The retrieved event "User lives in New York" is still returned because the background ingest has not yet completed. Once the ingest finishes, it will be superseded by a new "User lives in Buenos Aires" event.

---

### `upp/get_events`

**List stored events for a user.**

Direct access to the event store without ranking or intelligence. Returns all stored events for the server's configured ontology.

#### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `entity_key` | string | Yes | Identifier of the user |

#### Returns

`StoredEvent[]` — Array of all stored events for the user.

#### Behavior

1. Returns all events for the user, including `valid`, `staged`, and `superseded` events.
2. No ranking or filtering by relevance — this is a raw listing.

#### Example

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "upp/get_events",
  "params": {
    "entity_key": "user_alice"
  },
  "id": 3
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": [
    {
      "id": "evt_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "entity_key": "user_alice",
      "value": "User's name is Alice",
      "labels": ["who_name"],
      "confidence": 0.95,
      "source_type": "user_stated",
      "status": "valid",
      "created_at": "2026-01-15T10:30:00Z",
      "superseded_by": null
    },
    {
      "id": "evt_00112233-4455-6677-8899-aabbccddeeff",
      "entity_key": "user_alice",
      "value": "User lives in New York",
      "labels": ["where_current_location"],
      "confidence": 0.90,
      "source_type": "user_stated",
      "status": "superseded",
      "created_at": "2025-06-01T08:00:00Z",
      "superseded_by": "evt_b2c3d4e5-f6a7-8901-bcde-f12345678901"
    },
    {
      "id": "evt_b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "entity_key": "user_alice",
      "value": "User lives in Buenos Aires",
      "labels": ["where_current_location"],
      "confidence": 0.92,
      "source_type": "user_stated",
      "status": "valid",
      "created_at": "2026-01-15T10:30:00Z",
      "superseded_by": null
    }
  ],
  "id": 3
}
```

---

### `upp/delete_events`

**Delete events for a user.**

Required for compliance with data protection regulations (GDPR right to erasure, CCPA, etc.). If specific event IDs are provided, only those events are deleted. If no IDs are provided, all events for the user are deleted.

#### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `entity_key` | string | Yes | Identifier of the user |
| `event_ids` | string[] | No | Specific event IDs to delete. If omitted, deletes all events for the user |

#### Returns

`{ deleted_count: number }` — The number of events that were deleted.

#### Behavior

1. If `event_ids` is provided, only those specific events are deleted.
2. If `event_ids` is omitted or empty, **all** events for the user are deleted.
3. Deletion is physical — events are permanently removed from storage.
4. Returns the count of events that were actually deleted.

#### Example — Delete Specific Events

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "upp/delete_events",
  "params": {
    "entity_key": "user_alice",
    "event_ids": ["evt_a1b2c3d4-e5f6-7890-abcd-ef1234567890"]
  },
  "id": 4
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": {
    "deleted_count": 1
  },
  "id": 4
}
```

#### Example — Delete All User Events

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "upp/delete_events",
  "params": {
    "entity_key": "user_alice"
  },
  "id": 5
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": {
    "deleted_count": 15
  },
  "id": 5
}
```

---

## 3. Discovery Operations

### `upp/info`

**Server metadata and capabilities.**

Returns information about the server, including protocol version, the configured ontology, and supported operations. Does not require a `entity_key`.

#### Parameters

None.

#### Returns

| Field | Type | Description |
|---|---|---|
| `protocol_version` | string | Protocol version (semver) |
| `ontology` | string | The configured ontology identifier |
| `operations` | string[] | Supported operations |
| `conformance_level` | integer | Server conformance level (1, 2, or 3) |

#### Behavior

1. Returns server metadata without requiring authentication or user context.
2. The `conformance_level` indicates which operations the server supports (see [08-conformance.md](08-conformance.md)).
3. The `operations` array lists all operations the server implements.

#### Example

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "upp/info",
  "params": {},
  "id": 6
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": {
    "protocol_version": "1.0.0",
    "ontology": "user/v1",
    "operations": [
      "upp/ingest",
      "upp/retrieve",
      "upp/contextualize",
      "upp/get_events",
      "upp/delete_events",
      "upp/info",
      "upp/get_labels",
      "upp/get_tasks",
      "upp/export_events",
      "upp/import_events"
    ],
    "conformance_level": 3
  },
  "id": 6
}
```

---

### `upp/get_labels`

**List label definitions from an ontology.**

Returns all label definitions for the server's configured ontology, including category, sensitivity tier, cardinality, and durability for each label.

#### Parameters

None.

#### Returns

`LabelDefinition[]` — Array of label definitions.

#### Behavior

1. Returns all labels defined in the server's configured ontology.
2. Each label includes its full definition (category, sensitivity, cardinality, durability, examples).

#### Example

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "upp/get_labels",
  "params": {},
  "id": 7
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": [
    {
      "name": "who_name",
      "display_name": "Name",
      "description": "The user's full name or preferred name",
      "category": "WHO",
      "sensitivity": "tier_personal",
      "cardinality": "singular",
      "durability": "permanent",
      "examples": ["Alice Chen", "Bob Smith"]
    },
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
  ],
  "id": 7
}
```

---

### `upp/get_tasks`

**Check the status of background tasks.**

Returns the current status and results of one or more background tasks created by operations like `upp/contextualize`. Allows clients to poll for completion of asynchronous work.

#### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `task_ids` | string[] | Yes | One or more task IDs to check |

#### Returns

`TaskStatus[]` — Array of task statuses, one per requested task ID.

| Field | Type | Description |
|---|---|---|
| `task_id` | string | The task identifier |
| `status` | string | One of: `pending`, `running`, `completed`, `failed` |
| `result` | StoredEvent[] \| null | Resulting events (only when `status` is `completed`) |
| `error` | string \| null | Error message (only when `status` is `failed`) |
| `created_at` | datetime | When the task was created (ISO-8601 UTC) |
| `completed_at` | datetime \| null | When the task finished (ISO-8601 UTC, null if not yet complete) |

#### Behavior

1. Returns the status of each requested task.
2. If a `task_id` is not found, it is omitted from the response (no error).
3. Task results are retained for a server-defined retention period after completion. Implementations should document their retention policy.
4. Clients should not poll more frequently than necessary. Implementations may rate-limit `upp/get_tasks` requests.

#### Example — Single Task

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "upp/get_tasks",
  "params": {
    "task_ids": ["task_a1b2c3d4-e5f6-7890-abcd-ef1234567890"]
  },
  "id": 10
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": [
    {
      "task_id": "task_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "status": "completed",
      "result": [
        {
          "id": "evt_d4e5f6a7-b8c9-0123-defg-456789012345",
          "entity_key": "user_alice",
          "value": "User lives in Buenos Aires",
          "labels": ["where_current_location"],
          "confidence": 0.92,
          "source_type": "user_stated",
          "status": "valid",
          "created_at": "2026-03-08T10:30:02Z",
          "superseded_by": null
        }
      ],
      "error": null,
      "created_at": "2026-03-08T10:30:00Z",
      "completed_at": "2026-03-08T10:30:02Z"
    }
  ],
  "id": 10
}
```

#### Example — Multiple Tasks

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "upp/get_tasks",
  "params": {
    "task_ids": [
      "task_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "task_f7e8d9c0-b1a2-3456-7890-abcdef123456"
    ]
  },
  "id": 11
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": [
    {
      "task_id": "task_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "status": "completed",
      "result": [
        {
          "id": "evt_d4e5f6a7-b8c9-0123-defg-456789012345",
          "entity_key": "user_alice",
          "value": "User lives in Buenos Aires",
          "labels": ["where_current_location"],
          "confidence": 0.92,
          "source_type": "user_stated",
          "status": "valid",
          "created_at": "2026-03-08T10:30:02Z",
          "superseded_by": null
        }
      ],
      "error": null,
      "created_at": "2026-03-08T10:30:00Z",
      "completed_at": "2026-03-08T10:30:02Z"
    },
    {
      "task_id": "task_f7e8d9c0-b1a2-3456-7890-abcdef123456",
      "status": "running",
      "result": null,
      "error": null,
      "created_at": "2026-03-08T10:30:05Z",
      "completed_at": null
    }
  ],
  "id": 11
}
```

---

## 4. Portability Operations

### `upp/export_events`

**Export events for migration or backup.**

Exports all events for a user in UPP portable format. This enables data migration between UPP-compatible servers and supports data portability rights (GDPR Article 20).

#### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `entity_key` | string | Yes | Identifier of the user |

#### Returns

| Field | Type | Description |
|---|---|---|
| `file` | string | Path to the generated export file |
| `event_count` | integer | Number of events exported |
| `exported_at` | datetime | ISO-8601 timestamp of the export |

#### Behavior

1. Exports all events for the user under the server's configured ontology.
2. Includes events of all statuses (`valid`, `staged`, `superseded`).
3. The server writes a `.json` file in [ExportPackage](02-data-models.md#4-exportpackage) format (containing `entity_key`, `ontology`, `events`, and `exported_at`).
4. The response returns the path to the generated file, not the events themselves.

#### Example

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "upp/export_events",
  "params": {
    "entity_key": "user_alice"
  },
  "id": 8
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": {
    "file": "/data/exports/user_alice_2026-03-01T12:00:00Z.json",
    "event_count": 42,
    "exported_at": "2026-03-01T12:00:00Z"
  },
  "id": 8
}
```

---

### `upp/import_events`

**Import events from another UPP-compatible server.**

Imports events that were previously exported with `upp/export_events`. Enables data migration between UPP vendors.

#### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `entity_key` | string | Yes | Identifier of the destination user |
| `file` | string | Yes | Path to a `.json` export file in [ExportPackage](02-data-models.md#4-exportpackage) format |

#### Returns

| Field | Type | Description |
|---|---|---|
| `imported_count` | integer | Number of events successfully imported |
| `skipped_count` | integer | Number of events skipped (e.g., invalid labels) |

#### Behavior

1. Reads events from the specified export file and persists them for the specified user.
2. The server assigns new IDs and timestamps to imported events.
3. Supersession rules apply as during normal storage.
4. Labels in the events must be valid for the server's configured ontology; events with invalid labels are skipped.

#### Example

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "upp/import_events",
  "params": {
    "entity_key": "user_alice_new",
    "file": "/data/exports/user_alice_2026-03-01T12:00:00Z.json"
  },
  "id": 9
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": {
    "imported_count": 42,
    "skipped_count": 0
  },
  "id": 9
}
```

---

## 5. Parameter Philosophy

The protocol defines **minimum required parameters** for each operation. This is the floor, not the ceiling.

### Extension Points

Implementations are free to add additional parameters without breaking protocol compatibility. Common extensions include:

| Extension Parameter | Description | Example Use |
|---|---|---|
| `max_results` | Limit the number of returned events | `upp/retrieve`, `upp/get_events` |
| `since_date` | Filter events by creation date | `upp/get_events`, `upp/retrieve` |
| `namespace` | Multi-tenant namespace | Any operation |
| `include_superseded` | Whether to include superseded events | `upp/retrieve` |
| `status_filter` | Filter by event status | `upp/get_events` |

### Rules for Extensions

1. Extension parameters **must not** conflict with protocol-defined parameters.
2. Extension parameters **must** be optional (the operation must work without them).
3. Extension parameters **should** be documented by the implementation.
4. Clients **should not** rely on extension parameters for basic interoperability.
