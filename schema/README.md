# UPP Protocol — JSON Schemas

This directory contains the JSON Schema definitions for the Universal Preference Protocol (UPP). All schemas use [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12/schema).

## Protocol Overview

UPP defines **8 operations** over JSON-RPC 2.0:

| Operation | Type | Description |
|---|---|---|
| `upp/ingest` | Core (write) | Extract and store events from text |
| `upp/retrieve` | Core (read) | Intelligent search for relevant events |
| `upp/events` | Core (read) | Raw listing of stored events |
| `upp/delete` | Core (write) | Delete events (compliance: GDPR, CCPA) |
| `upp/info` | Discovery | Server metadata |
| `upp/labels` | Discovery | List ontology labels |
| `upp/export` | Portability | Export events for migration |
| `upp/import` | Portability | Import events from another server |

## Conformance Levels

| Level | Name | Required Operations |
|---|---|---|
| 1 | Minimal | `upp/ingest`, `upp/retrieve`, `upp/info` |
| 2 | Full | Level 1 + `upp/events`, `upp/delete`, `upp/labels` |
| 3 | Portable | Level 2 + `upp/export`, `upp/import` |

## Data Models

### Event (`event.json`)

The atomic unit of information in UPP. Represents a personal fact before persistence.

| Field | Type | Required | Description |
|---|---|---|---|
| `value` | string | yes | The extracted fact in natural language |
| `labels` | string[] | yes | Ontology labels for this fact |
| `confidence` | float \| null | no | Extraction confidence (0.0–1.0) |
| `source_type` | enum \| null | no | `user_stated`, `agent_observed`, `inferred` |

### StoredEvent (`stored-event.json`)

An Event after persistence. Extends Event with server-assigned metadata.

| Field | Type | Required | Description |
|---|---|---|---|
| *(all Event fields)* | | | |
| `id` | string (uuid) | yes | Server-assigned unique ID |
| `entity_key` | string | yes | User identifier |
| `status` | enum | yes | `valid`, `staged`, `superseded` |
| `created_at` | datetime | yes | Creation timestamp |
| `superseded_by` | string (uuid) \| null | no | ID of the replacing event |

### LabelDefinition (`label-definition.json`)

Definition of a label in an ontology.

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Machine-readable key (e.g., `who_name`) |
| `display_name` | string | yes | Human-readable name |
| `description` | string | yes | What this label captures |
| `category` | enum | yes | `WHO`, `WHAT`, `WHERE`, `WHEN`, `WHY`, `HOW`, `PREF`, `REL`, `META` |
| `sensitivity` | enum | yes | Sensitivity tier |
| `cardinality` | enum | yes | `singular` or `plural` |
| `durability` | enum | yes | `permanent`, `transient`, `ephemeral` |
| `examples` | string[] | no | Example values |

### Ontology (`ontology.json`)

A versioned collection of labels forming a complete taxonomy.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | Ontology identifier (e.g., `user/v1`) |
| `version` | string | yes | Semantic version |
| `labels` | object | yes | Label definitions keyed by name |
| `label_count` | integer | yes | Total number of labels |
| `metadata` | object \| null | no | Optional metadata |

## Enums

| File | Values | Description |
|---|---|---|
| `enums/event-status.json` | `valid`, `staged`, `superseded` | Event lifecycle states |
| `enums/source-type.json` | `user_stated`, `agent_observed`, `inferred` | How a fact was obtained |
| `enums/sensitivity-tier.json` | `tier_public`, `tier_work`, `tier_personal`, `tier_sensitive`, `tier_internal` | Privacy classification |
| `enums/cardinality.json` | `singular`, `plural` | Single vs. multi-value labels |
| `enums/durability.json` | `permanent`, `transient`, `ephemeral` | Fact lifespan |

## RPC Schemas

Each operation has a request and response schema in the `rpc/` directory:

| Operation | Request | Response |
|---|---|---|
| `upp/ingest` | `rpc/ingest-request.json` | `rpc/ingest-response.json` |
| `upp/retrieve` | `rpc/retrieve-request.json` | `rpc/retrieve-response.json` |
| `upp/events` | `rpc/events-request.json` | `rpc/events-response.json` |
| `upp/delete` | `rpc/delete-request.json` | `rpc/delete-response.json` |
| `upp/info` | `rpc/info-request.json` | `rpc/info-response.json` |
| `upp/labels` | `rpc/labels-request.json` | `rpc/labels-response.json` |
| `upp/export` | `rpc/export-request.json` | `rpc/export-response.json` |
| `upp/import` | `rpc/import-request.json` | `rpc/import-response.json` |

## Error Codes

Standard JSON-RPC error codes plus UPP-specific codes:

| Code | Name | Description |
|---|---|---|
| -32700 | Parse Error | Invalid JSON (JSON-RPC standard) |
| -32600 | Invalid Request | Invalid JSON-RPC request (JSON-RPC standard) |
| -32601 | Method Not Found | Operation not supported (JSON-RPC standard) |
| -32602 | Invalid Params | Invalid parameters (JSON-RPC standard) |
| -32603 | Internal Error | Internal server error (JSON-RPC standard) |
| -32001 | User Not Found | The `entity_key` does not exist |
| -32002 | Ontology Not Found | The requested ontology does not exist |
| -32003 | Ingest Failed | Error persisting events |
| -32004 | Extraction Failed | Error extracting events from text |

Implementations may define additional error codes in the range `-32000` to `-32099`.

## File Listing

```
schema/
├── README.md                    # This file
├── event.json                   # Event model
├── stored-event.json            # StoredEvent model (Event + server metadata)
├── label-definition.json        # LabelDefinition model
├── ontology.json                # Ontology container
├── error-response.json          # JSON-RPC error response
├── jsonrpc-message.json         # JSON-RPC message envelope
├── enums/
│   ├── event-status.json        # valid | staged | superseded
│   ├── source-type.json         # user_stated | agent_observed | inferred
│   ├── sensitivity-tier.json    # tier_public | ... | tier_internal
│   ├── cardinality.json         # singular | plural
│   └── durability.json          # permanent | transient | ephemeral
└── rpc/
    ├── ingest-request.json       # upp/ingest request
    ├── ingest-response.json      # upp/ingest response
    ├── retrieve-request.json    # upp/retrieve request
    ├── retrieve-response.json   # upp/retrieve response
    ├── events-request.json      # upp/events request
    ├── events-response.json     # upp/events response
    ├── delete-request.json      # upp/delete request
    ├── delete-response.json     # upp/delete response
    ├── info-request.json        # upp/info request
    ├── info-response.json       # upp/info response
    ├── labels-request.json      # upp/labels request
    ├── labels-response.json     # upp/labels response
    ├── export-request.json      # upp/export request
    ├── export-response.json     # upp/export response
    ├── import-request.json      # upp/import request
    └── import-response.json     # upp/import response
```
