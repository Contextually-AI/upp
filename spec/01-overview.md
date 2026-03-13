# UPP — Universal Personalization Protocol

## Protocol Specification: Overview

| Field | Value |
|---|---|
| **Spec Version** | `1.0.0` |
| **Status** | Draft |
| **License** | MIT |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Motivation](#2-motivation)
3. [Design Philosophy](#3-design-philosophy)
4. [Protocol at a Glance](#4-protocol-at-a-glance)
5. [Core Concepts](#5-core-concepts)
6. [Operations Summary](#6-operations-summary)
7. [Terminology](#7-terminology)
8. [Versioning Strategy](#8-versioning-strategy)

---

## 1. Introduction

The **Universal Personalization Protocol (UPP)** is an open, transport-agnostic protocol that standardizes how AI systems **extract**, **store**, **retrieve**, and **share** structured context about the entities they serve.

UPP defines *interfaces*, not implementations. Any language, any database, any LLM — if it speaks UPP, it interoperates. The protocol uses **JSON-RPC 2.0** as its wire format and is transport-agnostic.

### What UPP Is

- A **protocol specification** — a set of JSON-RPC methods, data models, and behavioral contracts.
- An **ontology framework** — extensible, structured taxonomies for classifying facts about any entity.
- A **privacy model** — sensitivity tiers built into the type system.
- **Transport-agnostic** — works over any transport that can carry JSON-RPC 2.0 messages.
- **Language-agnostic** — any language can implement the protocol.

### What UPP Is Not

- Not a library or SDK (though reference implementations may exist).
- Not a database or storage engine.
- Not an LLM or extraction model.
- Not an authentication or authorization framework.

---

## 2. Motivation

Every AI system starts from scratch. Preferences, facts, and context are locked inside individual applications with no standard way to share or transfer them.

UPP solves this by providing:

- **A common language** for representing structured facts (events with ontology-driven labels).
- **A standard interface** for storing and retrieving those facts (10 JSON-RPC operations).
- **A portability mechanism** for moving context between systems (export/import).
- **A privacy framework** for controlling what gets shared and what stays private (sensitivity tiers).

---

## 3. Design Philosophy

### Simplicity First

The protocol defines **10 operations** — no more. Each operation does one thing well. The protocol defines minimum required parameters (the floor, not the ceiling). Implementations can extend freely.

### Event-Sourcing Model

All facts are modeled as **immutable events**. Events are never modified — when a fact changes, the old event is marked as `superseded` and a new event is created. This provides a complete audit trail.

### Ontology-Driven Classification

Events are classified using **labels** from structured, versioned ontologies. Each ontology defines a set of categories and labels relevant to a particular domain. For example, the built-in `user/v1` ontology organizes 57 labels into 6 categories (WHO, WHAT, WHERE, WHEN, WHY, HOW). The protocol defines 9 available categories for use across ontologies (including PREF, REL, and META). Ontologies are extensible — new ontologies can be created for any domain, and existing ones evolve through versioning. Ontologies are loaded at server startup.

A UPP server instance operates with exactly one ontology, configured at startup. All operations on that server use its configured ontology — there is no per-request ontology parameter. For multiple ontologies, deploy multiple server instances.

### Interoperability Over Prescription

UPP defines *what* to communicate, not *how* to implement it. Authentication, storage, extraction logic, and transport are all left to the implementation. The protocol is the contract between systems.

### Privacy by Design

Every label carries a sensitivity tier. The protocol includes operations for data deletion (compliance) and data export (portability). Privacy is not an afterthought — it is built into the data model.

---

## 4. Protocol at a Glance

```
┌─────────────────┐       JSON-RPC 2.0        ┌─────────────────┐
│                 │ ◄──────────────────────►  │                 │
│   UPP Client    │    Any Transport          │   UPP Server    │
│   (AI Agent)    │                           │                 │
└─────────────────┘                           └─────────────────┘

Operations:
  Core:         upp/ingest, upp/retrieve, upp/get_events, upp/delete_events, upp/contextualize
  Discovery:    upp/info, upp/get_labels, upp/get_tasks
  Portability:  upp/export_events, upp/import_events
```

A UPP interaction follows this pattern:

1. **Discovery** — Client calls `upp/info` to learn server capabilities and its configured ontology.
2. **Ingestion** — Client sends text via `upp/ingest`; server extracts events and persists them.
3. **Retrieval** — Client queries via `upp/retrieve`; server returns ranked relevant events.
4. **Management** — Client uses `upp/get_events`, `upp/delete_events`, `upp/get_labels` for direct access and compliance.
5. **Portability** — Client uses `upp/export_events` and `upp/import_events` for data migration between servers.

---

## 5. Core Concepts

### Events

The atomic unit of information in UPP. An event represents a single extracted fact — for example, "User's name is Alice" or "User prefers dark mode". Events are immutable; once created, they are never modified.

### Labels

Tags from a structured ontology that classify events. Labels belong to categories (WHO, WHAT, WHERE, etc.) and carry metadata like sensitivity tier, cardinality, and durability.

### Ontologies

Versioned collections of label definitions that define what facts can be captured for a given domain. Ontologies are loaded at server startup and can be extended or replaced independently of the protocol. The built-in `user/v1` ontology covers user-related context, but additional ontologies can be created for any domain (e.g., product knowledge, organizational context).

### Supersession

When a new event contradicts an existing one, the existing event is marked as `superseded` and the new event becomes `valid`. This is driven by label cardinality — `singular` labels trigger supersession, while `plural` labels accumulate.

### Sensitivity Tiers

Every label has an assigned sensitivity level (from `tier_public` to `tier_internal`) that controls how the data should be handled and shared.

---

## 6. Operations Summary

| Operation | Type | Description |
|---|---|---|
| `upp/ingest` | Core (write) | Extract and ingest events from text |
| `upp/retrieve` | Core (read) | Ranked search for relevant events |
| `upp/get_events` | Core (read) | Raw listing of stored events |
| `upp/delete_events` | Core (write) | Delete events (compliance) |
| `upp/contextualize` | Core (read+write) | Retrieve context and ingest events in the background |
| `upp/info` | Discovery | Server metadata and capabilities |
| `upp/get_labels` | Discovery | Label definitions from an ontology |
| `upp/get_tasks` | Discovery | Check status of background tasks |
| `upp/export_events` | Portability | Export events for migration |
| `upp/import_events` | Portability | Import events from another server |

**Total: 10 operations** (5 core + 3 discovery + 2 portability)

See [03-operations.md](03-operations.md) for full details on each operation.

---

## 7. Terminology

| Term | Definition |
|---|---|
| **Event** | An atomic, immutable fact extracted from text. Contains a value, labels, and optional metadata. |
| **StoredEvent** | An Event after persistence. Includes server-assigned ID, status, timestamp, and user key. |
| **Label** | A tag from an ontology that classifies an event (e.g., `who_name`, `where_home`). |
| **LabelDefinition** | The schema for a label, including its category, sensitivity, cardinality, and durability. |
| **Ontology** | A versioned collection of label definitions (e.g., `user/v1`). |
| **User Key** | An opaque string that identifies a user within the UPP server. |
| **Supersession** | The process by which a new event replaces an existing contradictory event. |
| **Cardinality** | Whether a label accepts one value at a time (`singular`) or accumulates values (`plural`). |
| **Durability** | How long a fact is expected to remain valid: `permanent`, `transient`, or `ephemeral`. |
| **Sensitivity Tier** | The privacy level of a label: `tier_public`, `tier_work`, `tier_personal`, `tier_sensitive`, `tier_internal`. |
| **Conformance Level** | The set of operations a server supports: Level 1 (Minimal), Level 2 (Full), Level 3 (Portable). |

---

## 8. Versioning Strategy

The protocol version follows [Semantic Versioning](https://semver.org/):

- **Major** — Breaking changes to operations, data models, or wire format.
- **Minor** — New operations or optional fields added (backward-compatible).
- **Patch** — Clarifications, documentation fixes.

Ontologies are versioned independently from the protocol. Each ontology has its own version (e.g., `user/v1`, `user/v2`).

The current protocol version is reported by `upp/info` in the `protocol_version` field.
