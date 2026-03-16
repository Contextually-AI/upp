# UPP TypeScript Examples

Runnable TypeScript examples for the Universal Personalization Protocol (UPP).

## Setup

```bash
# From the repository root
cd implementations/typescript
npm install

# Or from the examples directory
cd examples/typescript
npm install ../../implementations/typescript
```

## Running Examples

Each example can be run with `tsx`:

```bash
npx tsx 01-quickstart.ts
npx tsx 02-event-lifecycle.ts
# ... etc
```

## Examples

| File | Description |
|------|-------------|
| `01-quickstart.ts` | Minimal working example — create events, store them, and retrieve with keyword matching |
| `02-event-lifecycle.ts` | Event status lifecycle: singular supersession, plural accumulation, and staged events |
| `03-custom-backends.ts` | Implement custom IngestBackend and RetrieverBackend — protocol-based pluggability |
| `04-compliance-and-deletion.ts` | GDPR/CCPA compliance — list events, selective deletion, and right to erasure |
| `05-privacy-and-sensitivity.ts` | Sensitivity tiers, privacy-aware filtering, and label metadata |
| `06-rpc-client-server.ts` | JSON-RPC 2.0 wire format — building requests, validating with Zod schemas, error handling |
| `07-ontology-management.ts` | Loading and querying the ontology: labels, categories, and server metadata |
| `08-portability-export-import.ts` | Data portability — export events, import to another server, verify migration |

## Protocol Overview

UPP defines **8 operations** organized in three tiers:

- **Core** (4): `upp/ingest`, `upp/retrieve`, `upp/events`, `upp/delete`
- **Discovery** (2): `upp/info`, `upp/labels`
- **Portability** (2): `upp/export`, `upp/import`

## Requirements

- Node.js 18+
- TypeScript 5+
- `tsx` for running examples directly
- `zod` (dependency of `@upp/sdk`)
