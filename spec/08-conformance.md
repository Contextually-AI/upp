# UPP — Conformance

## Protocol Specification: Conformance Levels

This document defines the conformance levels for UPP servers and the out-of-scope concerns that implementations resolve independently.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Conformance Matrix](#2-conformance-matrix)
3. [Level Descriptions](#3-level-descriptions)
4. [Conformance Discovery](#4-conformance-discovery)
5. [Parameter Philosophy](#5-parameter-philosophy)
6. [Out of Scope](#6-out-of-scope)

---

## 1. Overview

Not every UPP server needs to implement all 10 operations. The protocol defines **three conformance levels** that allow servers to declare what they support. Each level builds on the previous one.

---

## 2. Conformance Matrix

| Operation | Category | Level 1 | Level 2 | Level 3 |
|---|---|:---:|:---:|:---:|
| `upp/ingest` | Core | ✅ | ✅ | ✅ |
| `upp/retrieve` | Core | ✅ | ✅ | ✅ |
| `upp/info` | Discovery | ✅ | ✅ | ✅ |
| `upp/contextualize` | Core | | ✅ | ✅ |
| `upp/get_tasks` | Discovery | | ✅ | ✅ |
| `upp/get_events` | Core | | ✅ | ✅ |
| `upp/delete_events` | Core | | ✅ | ✅ |
| `upp/get_labels` | Discovery | | ✅ | ✅ |
| `upp/export_events` | Portability | | | ✅ |
| `upp/import_events` | Portability | | | ✅ |

> 🟢 **Level 1 — Minimal** (3 operations): The building blocks.
> 🔵 **Level 2 — Full** (8 operations): Production-ready with optimized flows, compliance, and monitoring.
> 🟣 **Level 3 — Portable** (10 operations): Full interoperability and data portability.

---

## 3. Level Descriptions

### Level 1 — Minimal

The minimum to be **UPP-compatible**. A server can ingest and retrieve events.

**Use case:** A simple personalization backend that extracts and retrieves user context. Suitable for early adoption or lightweight integrations. Clients call `upp/retrieve` and `upp/ingest` separately.

---

### Level 2 — Full

Everything in Level 1, plus the optimized contextualize flow, background task monitoring, raw event access, compliance operations, and label discovery.

**Use case:** A production personalization service. Agents use `upp/contextualize` for the common retrieve-then-ingest pattern in a single call. Supports regulatory compliance (GDPR/CCPA) via `upp/delete_events`, direct event access for debugging via `upp/get_events`, background task monitoring via `upp/get_tasks`, and label discovery for dynamic UIs via `upp/get_labels`.

---

### Level 3 — Portable

Everything in Level 2, plus data portability operations.

**Use case:** Full interoperability between vendors. Users can migrate their data between UPP-compatible services. Supports GDPR right to data portability.

---

## 4. Conformance Discovery

The `upp/info` operation returns the server's conformance level:

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
  "id": 1
}
```

Clients can use this to:

1. **Discover capabilities** — Know which operations are available before calling them.
2. **Adapt behavior** — Gracefully degrade when operations are not supported (e.g., fall back to separate `upp/retrieve` + `upp/ingest` calls if `upp/contextualize` is unavailable).
3. **Validate compatibility** — Ensure the server meets the client's requirements.

### Validation Rule

A server's declared `conformance_level` must match its `operations` list:
- Level 1: Must include `upp/ingest`, `upp/retrieve`, `upp/info`.
- Level 2: Must include all Level 1 operations plus `upp/contextualize`, `upp/get_tasks`, `upp/get_events`, `upp/delete_events`, `upp/get_labels`.
- Level 3: Must include all Level 2 operations plus `upp/export_events`, `upp/import_events`.

If a server implements operations beyond its declared level but not all operations of the next level, it should declare the highest fully-supported level.

---

## 5. Parameter Philosophy

The UPP protocol defines **minimum required parameters** for each operation. This is the floor, not the ceiling.

### Core Principle

> The protocol defines the minimum interface. Implementations can extend it freely.

### Extension Rules

1. **Additional parameters are allowed** — Implementations can add parameters like `max_results`, `since_date`, `namespace`, `status_filter`, etc.
2. **Extensions must be optional** — An operation must work correctly with only the protocol-defined parameters.
3. **Extensions must not conflict** — Additional parameters must not redefine the semantics of protocol-defined parameters.
4. **Extensions should be documented** — Implementations should document any additional parameters they support.

### Examples of Valid Extensions

| Extension | Operation | Description |
|---|---|---|
| `max_results` | `upp/retrieve`, `upp/get_events` | Limit the number of returned events |
| `since_date` | `upp/get_events` | Filter events created after a date |
| `status_filter` | `upp/get_events` | Filter by event status (valid, staged, superseded) |
| `include_superseded` | `upp/retrieve` | Include superseded events in search results |
| `namespace` | Any | Multi-tenant namespace isolation |
| `format` | `upp/export_events` | Output format (default: UPP JSON) |

---

## 6. Out of Scope

The following concerns are explicitly **outside the UPP protocol**. Implementations resolve them as they see fit:

### Authentication

The protocol does not define how clients authenticate with servers. Implementations use whatever mechanisms suit their environment:

- API keys
- OAuth 2.0 / OpenID Connect
- mTLS (mutual TLS)
- JWT tokens
- Basic authentication

### Multi-Tenancy

How multiple tenants are isolated is an infrastructure concern:

- Separate server instances per tenant
- Shared server with authentication-based isolation
- Namespace-based isolation (via extension parameter)

### Idempotency

The protocol does not define idempotency guarantees. Implementations handle duplicate detection internally during event extraction and curation.

### Pagination and Limits

The protocol does not define pagination mechanisms. Operations return complete result sets by default. Implementations that need pagination can add extension parameters (`limit`, `offset`, `cursor`, etc.).

### Rate Limiting

The protocol does not define rate limiting. Implementations apply rate limits as needed and communicate them through standard HTTP mechanisms (e.g., `429 Too Many Requests`) or transport-specific mechanisms.

### Storage Backend

The protocol does not mandate a storage backend. Implementations can use:

- Relational databases (PostgreSQL, MySQL)
- Document stores (MongoDB)
- Vector databases (Pinecone, Weaviate)
- In-memory stores
- File-based storage
- Any combination

### Extraction Logic

How events are extracted from text in `upp/ingest` is an implementation concern. The protocol defines *what* the operation does (extract and ingest events), not *how* it does it (LLM prompts, NER, rule-based extraction, etc.).
