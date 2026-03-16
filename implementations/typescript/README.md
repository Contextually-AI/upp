# @upp/sdk — TypeScript Reference Implementation

TypeScript reference implementation of the [Universal Personalization Protocol (UPP)](../../spec/01-overview.md) data models, backends, JSON-RPC 2.0 server/client, and default ontology.

## Installation

```bash
npm install @upp/sdk
```

**Requirements:**
- Node.js ≥ 18.0.0
- TypeScript ≥ 5.0

## Quick Start

```typescript
import {
  createEvent,
  createStoredEvent,
  SourceType,
  EventStatus,
  type Event,
  type StoredEvent,
} from "@upp/sdk";

// Create an event (pre-storage)
const event = createEvent({
  value: "I work as a senior software engineer at Anthropic",
  labels: ["what_occupation"],
  confidence: 0.95,
  source_type: "user_stated",
});

// Create a stored event (post-storage, with server-assigned metadata)
const stored = createStoredEvent({
  id: "550e8400-e29b-41d4-a716-446655440000",
  entity_key: "user-123",
  value: "I work as a senior software engineer at Anthropic",
  labels: ["what_occupation"],
  confidence: 0.95,
  source_type: "user_stated",
  status: "valid",
  created_at: new Date().toISOString(),
});
```

## Package Structure

```
src/
├── index.ts                 # Package entry point
├── default-ontology.ts      # Loads ontologies/user/v1.json
├── models/
│   ├── index.ts             # Model re-exports
│   ├── enums.ts             # EventStatus, SourceType, SensitivityTier, Cardinality, Durability
│   ├── event.ts             # Event, StoredEvent schemas and factories
│   └── ontology.ts          # LabelDefinition schema and factory
├── backends/
│   ├── index.ts             # Backend re-exports
│   ├── ingest.ts            # IngestBackend interface
│   ├── retriever.ts         # RetrieverBackend interface
│   └── ontology.ts          # OntologyBackend interface
└── rpc/
    ├── index.ts             # RPC re-exports
    ├── types.ts             # Method constants, request/response types
    ├── errors.ts            # Error codes and UppError class
    ├── server.ts            # UppServer — JSON-RPC 2.0 server
    └── client.ts            # UppClient — JSON-RPC 2.0 client
```

## Protocol Operations

The UPP protocol defines 8 operations:

| Operation | Type | Description |
|---|---|---|
| `upp/ingest` | Core (write) | Extract and ingest events from text |
| `upp/retrieve` | Core (read) | Intelligent retrieval of relevant events |
| `upp/events` | Core (read) | List all stored events |
| `upp/delete` | Core (write) | Delete events (GDPR compliance) |
| `upp/info` | Discovery | Server metadata |
| `upp/labels` | Discovery | Label definitions from an ontology |
| `upp/export` | Portability | Export events for migration |
| `upp/import` | Portability | Import events from another server |

## API Reference

### Enumerations

All enumerations use Zod schemas for validation:

```typescript
import {
  EventStatusSchema,
  SourceTypeSchema,
  SensitivityTierSchema,
  CardinalitySchema,
  DurabilitySchema,
} from "@upp/sdk";
```

| Enum | Values |
|------|--------|
| `EventStatus` | `valid`, `staged`, `superseded` |
| `SourceType` | `user_stated`, `agent_observed`, `inferred` |
| `SensitivityTier` | `tier_public`, `tier_work`, `tier_personal`, `tier_sensitive`, `tier_internal` |
| `Cardinality` | `singular`, `plural` |
| `Durability` | `permanent`, `transient`, `ephemeral` |

### Event

Immutable unit of extracted information:

```typescript
import { createEvent, EventSchema, type Event } from "@upp/sdk";

const event = createEvent({
  value: "Prefers dark mode",
  labels: ["pref_ui"],
  confidence: 0.9,
  source_type: "user_stated",
});
```

### StoredEvent

An Event after persistence, with server-assigned metadata:

```typescript
import { createStoredEvent, type StoredEvent } from "@upp/sdk";

const stored = createStoredEvent({
  id: "evt-001",
  entity_key: "user-123",
  value: "Prefers dark mode",
  labels: ["pref_ui"],
  status: "valid",
  created_at: new Date().toISOString(),
});
```

### LabelDefinition

Ontology label metadata:

```typescript
import { createLabelDefinition, type LabelDefinition } from "@upp/sdk";

const label = createLabelDefinition({
  name: "who_job_title",
  display_name: "Job Title",
  description: "The user's current professional role.",
  category: "who",
  sensitivity: "tier_work",
  cardinality: "singular",
  durability: "transient",
  examples: ["Software Engineer", "Product Manager"],
});
```

### Default Ontology

Load the bundled `user/v1` ontology:

```typescript
import { loadDefaultOntology, getLabel, DefaultOntology } from "@upp/sdk";

// Load all labels
const labels = loadDefaultOntology();
console.log(`Loaded ${labels.length} labels`);

// Get a specific label
const label = getLabel("who_name");

// Use as OntologyBackend
const ontology = new DefaultOntology();
const allLabels = await ontology.getLabels();
const info = await ontology.getInfo();
```

### Backends

Three backend interfaces for server implementations:

```typescript
import type { IngestBackend, RetrieverBackend, OntologyBackend } from "@upp/sdk";
```

- **`IngestBackend`** — Store, retrieve, delete, export, and import events.
- **`RetrieverBackend`** — Intelligent retrieval of relevant events given a query.
- **`OntologyBackend`** — Label definitions and server metadata.

### RPC Server

JSON-RPC 2.0 server that dispatches UPP operations:

```typescript
import { UppServer, type UppServerConfig } from "@upp/sdk";

const server = new UppServer({
  store: myIngestBackend,
  ontology: myOntologyBackend,
  retriever: myRetrieverBackend,
  extractEvents: async (text, ontology) => { /* ... */ },
});

const response = await server.handleRequest(jsonRpcRequest);
```

### RPC Client

JSON-RPC 2.0 client for calling UPP servers:

```typescript
import { UppClient, type UppTransport } from "@upp/sdk";

const transport: UppTransport = async (request) => {
  // Send JSON-RPC request and return response
};

const client = new UppClient(transport);
const events = await client.ingest("user-123", "I live in Buenos Aires");
const results = await client.retrieve("user-123", "Where does the user live?");
const info = await client.info();
```

### Error Codes

```typescript
import {
  INVALID_REQUEST,    // -32600
  METHOD_NOT_FOUND,   // -32601
  INVALID_PARAMS,     // -32602
  USER_NOT_FOUND,     // -32001
  ONTOLOGY_NOT_FOUND, // -32002
  INGEST_FAILED,      // -32003
  EXTRACTION_FAILED,  // -32004
  UppError,
} from "@upp/sdk";
```

## Validation

Every model has a Zod schema for runtime validation:

```typescript
import { EventSchema } from "@upp/sdk";

// Non-throwing validation
const result = EventSchema.safeParse(unknownData);
if (result.success) {
  console.log(result.data); // Typed Event
} else {
  console.error(result.error.issues);
}
```

## Development

```bash
# Install dependencies
npm install

# Type-check
npx tsc --noEmit

# Run tests
npm test
```

## Related Specifications

| Document | Description |
|----------|-------------|
| [01-overview.md](../../spec/01-overview.md) | Protocol overview |
| [02-data-models.md](../../spec/02-data-models.md) | Data model specification |
| [07-ontology-management.md](../../spec/07-ontology-management.md) | Ontology management |
| [Python SDK](../python/) | Python reference implementation |

---

*Universal Personalization Protocol — TypeScript SDK*
*Licensed under MIT.*
