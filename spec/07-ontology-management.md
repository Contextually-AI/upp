# UPP — Ontology Management

## Protocol Specification: Ontology Management

This document describes how ontologies are created, versioned, and managed in UPP. Ontology management is a **configuration-time** concern — ontologies are defined as JSON files and loaded at server startup, not managed at runtime.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Ontology Types](#2-ontology-types)
3. [Directory Structure](#3-directory-structure)
4. [Ontology File Format](#4-ontology-file-format)
5. [Versioning Strategy](#5-versioning-strategy)
6. [Creating Custom Ontologies](#6-creating-custom-ontologies)
7. [Extending Existing Ontologies](#7-extending-existing-ontologies)
8. [Runtime Interaction](#8-runtime-interaction)
9. [Official Ontologies](#9-official-ontologies)

---

## 1. Overview

Ontologies in UPP define the vocabulary of labels used to classify events. They determine:

- **What facts** can be captured (which labels exist).
- **How facts behave** (cardinality, durability).
- **How facts are classified** (categories, sensitivity).

Ontologies are a general, extensible concept — any domain can define its own ontology to classify the context that matters to it. UPP provides the structural framework; ontology authors define the domain-specific vocabulary.

### Key Principles

1. **Configuration, not runtime** — Ontologies are defined as JSON files and loaded when the server starts. There are no runtime operations to create or modify ontologies.
2. **Query at runtime** — The protocol provides `upp/get_labels` and `upp/info` to *query* the server's configured ontology at runtime, but not to modify it.
3. **Independent versioning** — Each ontology has its own version, independent of the protocol version.
4. **Official + custom** — UPP provides official ontologies as starting points. Users can create their own or extend existing ones.
5. **Open and growing** — The ontology ecosystem is open source. New ontologies are contributed over time as the community identifies new domains.

---

## 2. Ontology Types

UPP defines four initial ontology types, with the system being extensible to any domain:

### User (`user`)

Context about users — the first ontology defined by UPP.

- Covers identity, demographics, skills, preferences, behavior patterns, and more.
- Uses the 5W+H framework (WHO, WHAT, WHERE, WHEN, WHY, HOW) for categorization.
- 57 labels in version 1.

### Enterprise (`enterprise`)

Context about companies and organizations.

- Company name, industry, size, products, culture.
- Useful for B2B contexts where the AI needs to understand organizational context.

### Agent (`agent`)

Context about AI agents and their capabilities.

- Agent name, purpose, capabilities, limitations, personality.
- Enables meta-personalization — the AI knowing about other AIs.

### Location (`location`)

Contextual information about places.

- City, country, climate, local events, culture, regulations.
- Useful for location-aware personalization.

### Custom Types

The system is fully extensible. Any domain can define its own ontology type — for example, `medical`, `financial`, `gaming`, `education`, etc. Custom types follow the same structure and versioning rules as built-in types.

---

## 3. Directory Structure

Ontologies are organized in a standard directory structure:

```
ontologies/
├── user/
│   ├── v1.json
│   └── v2.json
├── enterprise/
│   └── v1.json
├── location/
│   └── v1.json
├── agent/
│   └── v1.json
└── README.md
```

### Conventions

- Each ontology type has its own directory.
- Versions are individual JSON files named `v<N>.json`.
- The `README.md` provides documentation about available ontologies.

---

## 4. Ontology File Format

An ontology is defined as a JSON file with the following structure:

```json
{
  "type": "user",
  "version": "1.0.0",
  "label_count": 57,
  "labels": [
    {
      "name": "who_name",
      "display_name": "Name",
      "description": "The user's full name or preferred name",
      "category": "WHO",
      "sensitivity": "tier_personal",
      "cardinality": "singular",
      "durability": "permanent",
      "examples": ["Alice Chen", "Bob Smith"],
      "classification_guidance": "The person's preferred name or full legal name. Use for direct address and personalization.",
      "anti_examples": ["Goes by 'Dr. Chen' at work → use who_role"]
    },
    {
      "name": "what_interests_hobbies",
      "display_name": "Interests & Hobbies",
      "description": "Activities the user enjoys or topics they're passionate about",
      "category": "WHAT",
      "sensitivity": "tier_public",
      "cardinality": "plural",
      "durability": "transient",
      "examples": ["hiking", "painting"]
    }
  ],
  "metadata": {
    "description": "User personal context ontology",
    "author": "UPP Protocol",
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

### Top-Level Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | string | Yes | Ontology type identifier (e.g., `"user"`, `"gaming"`) |
| `version` | string | Yes | Semantic version of this ontology |
| `label_count` | integer | Yes | Total number of labels defined |
| `labels` | array | Yes | Array of LabelDefinition objects |
| `metadata` | object | No | Optional metadata (description, author, etc.) |

### Label Definitions

Each label in the `labels` array follows the `LabelDefinition` schema (see [02-data-models.md](02-data-models.md)).

---

## 5. Versioning Strategy

Ontologies are versioned independently from the protocol using semantic versioning:

### Version Format

`<major>.<minor>.<patch>` (e.g., `1.0.0`, `1.1.0`, `2.0.0`)

### Version Rules

- **Major version** — Breaking changes: removing labels, changing label semantics, changing cardinality or category.
- **Minor version** — Backward-compatible additions: new labels, new examples, updated descriptions.
- **Patch version** — Clarifications: typo fixes, improved descriptions, additional examples.

### Identifier Format

Ontology identifiers use the format `<type>/v<major>`:

- `user/v1` — User ontology, major version 1 (covers 1.x.x)
- `user/v2` — User ontology, major version 2 (covers 2.x.x)

The minor and patch versions are tracked in the `version` field inside the ontology file but are not part of the identifier. This means `user/v1` always refers to the latest `1.x.x` release.

### Backward Compatibility

Within a major version:
- New labels can be added (minor bump).
- Existing labels are never removed or have their semantics changed.
- Clients can rely on a major version identifier for stability.

---

## 6. Creating Custom Ontologies

Users can create their own ontologies for domain-specific use cases:

### Steps

1. **Choose a type name** — Pick a descriptive, lowercase name (e.g., `medical`, `gaming`).
2. **Define labels** — Create labels following the LabelDefinition schema, assigning each a category, sensitivity, cardinality, and durability.
3. **Create the JSON file** — Follow the ontology file format.
4. **Place in the directory** — Put the file at `ontologies/<type>/v<N>.json`.
5. **Configure the server** — The server loads ontologies from the directory at startup.

### Example: Gaming Ontology

```json
{
  "type": "gaming",
  "version": "1.0.0",
  "label_count": 3,
  "labels": [
    {
      "name": "gaming_platform",
      "display_name": "Gaming Platform",
      "description": "Platforms the user plays games on",
      "category": "WHAT",
      "sensitivity": "tier_public",
      "cardinality": "plural",
      "durability": "transient",
      "examples": ["PC", "PlayStation 5", "Nintendo Switch"]
    },
    {
      "name": "gaming_genre",
      "display_name": "Preferred Genre",
      "description": "Game genres the user prefers",
      "category": "PREF",
      "sensitivity": "tier_public",
      "cardinality": "plural",
      "durability": "transient",
      "examples": ["RPG", "FPS", "Strategy"]
    },
    {
      "name": "gaming_handle",
      "display_name": "Gamer Tag",
      "description": "The user's online gaming handle or username",
      "category": "WHO",
      "sensitivity": "tier_personal",
      "cardinality": "singular",
      "durability": "transient",
      "examples": ["xX_ProGamer_Xx", "AliceInWonderland"]
    }
  ],
  "metadata": {
    "description": "Gaming preferences and profile ontology",
    "author": "Custom"
  }
}
```

---

## 7. Extending Existing Ontologies

Instead of creating a completely new ontology, users can extend an existing one:

### Approach

1. Start with an official ontology (e.g., `user/v1`).
2. Add new labels specific to your domain.
3. Save as a new ontology file (e.g., `ontologies/user-extended/v1.json`).

### Guidelines

- **Do not modify official labels** — If you need different semantics, create new labels.
- **Use a distinct type name** — Avoid overwriting official ontologies (e.g., use `user-custom` instead of `user`).
- **Follow naming conventions** — Prefix custom labels to avoid future conflicts (e.g., `custom_favorite_game`).

---

## 8. Runtime Interaction

While ontology *management* is outside the runtime protocol, clients can query the server's ontology at runtime:

### `upp/get_labels`

Returns all label definitions from the server's configured ontology:

```json
{
  "jsonrpc": "2.0",
  "method": "upp/get_labels",
  "params": {},
  "id": 1
}
```

### Configured Ontology

A UPP server instance operates with exactly one ontology, configured at startup. All operations use the server's configured ontology — there is no per-request ontology parameter. For example:

```json
{
  "jsonrpc": "2.0",
  "method": "upp/ingest",
  "params": {
    "entity_key": "user_alice",
    "text": "I love playing RPGs on my PlayStation."
  },
  "id": 2
}
```

To serve multiple ontologies, deploy multiple server instances, each configured with its own ontology.

### `upp/info`

The `upp/info` operation returns the server's configured ontology:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "protocol_version": "1.0.0",
    "ontology": "user/v1",
    "operations": ["upp/ingest", "upp/retrieve", "..."],
    "conformance_level": 2
  },
  "id": 3
}
```

---

## 9. Official Ontologies

UPP provides official ontologies as starting points:

| Ontology | Status | Description |
|---|---|---|
| `user/v1` | **Available** | User context — 57 labels covering identity, skills, preferences, and behavior patterns |
| `enterprise/v1` | Planned | Company and organizational context |
| `agent/v1` | Planned | AI agent capabilities and personality |
| `location/v1` | Planned | Place-specific contextual information |

Official ontologies are maintained as part of the UPP project and follow the standard versioning strategy. They serve as reference implementations and can be used as-is or as the basis for custom extensions. The ontology ecosystem is open source — contributions of new ontologies and improvements to existing ones are welcome.
