# UPP Ontologies

Ontologies define the set of **labels** available for classifying events within the Universal Personalization Protocol (UPP). Each label describes a specific type of structured context that can be extracted from text and stored as events.

## Directory Structure

```
ontologies/
├── user/
│   └── v1.json          # User ontology v1 — structured context labels
├── README.md             # This file
└── (future ontologies)
```

Each ontology lives in its own directory named by type, with versioned JSON files inside.

## Ontology Types

UPP supports multiple ontology types for different domains:

| Type | Description |
|---|---|
| **user** | Personal information about users — the primary ontology |
| **enterprise** | Information about companies and organizations |
| **agent** | Information about AI agents and assistants |
| **location** | Contextual information about places (city, country, climate, culture) |

The system is extensible — new ontology types can be added for any domain.

## Versioning

Ontologies are versioned independently using semantic versioning (e.g., `v1.json` for version 1.x). Each version is a complete, self-contained definition. Versions are immutable once published — changes require a new version.

## Ontology JSON Format

Each ontology file follows this structure:

```json
{
  "version": "1.0.0",
  "type": "user",
  "label_count": 57,
  "labels": [
    {
      "name": "who_name",
      "display_name": "Full Name",
      "description": "Their name — first, last, preferred, display name",
      "category": "WHO",
      "sensitivity": "tier_personal",
      "cardinality": "singular",
      "durability": "permanent",
      "examples": ["Alex Johnson", "Dr. Maria Garcia"]
    }
  ]
}
```

## LabelDefinition Schema

Each label in the `labels` array follows the `LabelDefinition` schema:

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Unique identifier (e.g., `who_name`, `what_skills`) |
| `display_name` | string | ✅ | Human-readable name (e.g., "Full Name") |
| `description` | string | ✅ | Brief description of what this label captures |
| `category` | string | ✅ | 5W+H grouping — see categories below |
| `sensitivity` | enum | ✅ | Data sensitivity tier |
| `cardinality` | enum | ✅ | `singular` or `plural` |
| `durability` | enum | ✅ | `permanent`, `transient`, or `ephemeral` |
| `examples` | string[] | ❌ | Example values for this label |

### Optional Fields

Ontologies may include the optional fields `classification_guidance` and `anti_examples` in label definitions. These are defined in the protocol spec and schema as optional fields — they are preserved by UPP implementations but are not required.

## Categories (5W+H)

Labels are organized into semantic categories:

| Category | Description |
|---|---|
| **WHO** | Identity — name, age, role, personality, relationships |
| **WHAT** | Capabilities — skills, education, projects, interests |
| **WHERE** | Location — home, work, travel, digital environments |
| **WHEN** | Temporal — timezone, schedule, routines, life events |
| **WHY** | Motivation — goals, values, fears, priorities |
| **HOW** | Process — workflow, learning, communication, problem-solving |
| **PREF** | Preferences — explicit likes/dislikes across domains |
| **REL** | Relationships — detailed relationship information |
| **META** | Internal — agent-only metadata, never shared externally |

## Sensitivity Tiers

Each label has a sensitivity classification that guides data handling:

| Tier | Description |
|---|---|
| `tier_public` | Safe to share broadly |
| `tier_work` | Professional context only |
| `tier_personal` | Personal but not sensitive |
| `tier_sensitive` | Sensitive personal data |
| `tier_internal` | Never shared externally (system use only) |

## Cardinality

Defines how events with this label interact with existing events:

- **`singular`** — Only one active value at a time (e.g., `who_name`). A new event supersedes the previous one.
- **`plural`** — Multiple values coexist (e.g., `what_skills`). New events accumulate alongside existing ones.

## Durability

Indicates the expected lifespan of facts with this label:

- **`permanent`** — Rarely changes (e.g., date of birth, education).
- **`transient`** — Changes over time (e.g., current job, city).
- **`ephemeral`** — Very short-lived (e.g., current mood, today's location).

## Protocol Integration

Ontologies integrate with UPP protocol operations:

- **`upp/labels`** — Query available labels from a loaded ontology at runtime.
- **`upp/ingest`** — Events are classified using labels from the active ontology.
- **`upp/retrieve`** — Label metadata aids intelligent retrieval and ranking.
- **`upp/info`** — Reports which ontologies are loaded on the server.

## Loading Ontologies

Ontologies are defined as static JSON files and loaded at server configuration time. The management of ontologies (creating, modifying labels) is **not** part of the runtime protocol — it happens during deployment and configuration.

Servers specify a default ontology. Protocol operations accept an optional `ontology` parameter (e.g., `"user/v1"`) to target a specific ontology.

## Creating Custom Ontologies

To create a custom ontology:

1. Create a new directory under `ontologies/` (e.g., `ontologies/mytype/`).
2. Add a versioned JSON file following the schema above.
3. Ensure every label has all required fields.
4. Load the ontology into your UPP server configuration.

UPP provides official ontologies as a starting point, but users are free to create their own or extend existing ones for their specific domain needs.
