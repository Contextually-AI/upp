# UPP — Ontology

## Protocol Specification: Ontology Structure

Ontologies define the set of labels available for classifying events. This document describes the ontology structure, label categories, and classification dimensions.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Ontology Types](#2-ontology-types)
3. [Label Categories](#3-label-categories)
4. [Classification Dimensions](#4-classification-dimensions)
5. [The User Ontology (user/v1)](#5-the-user-ontology-userv1)

---

## 1. Overview

An **ontology** in UPP is a versioned collection of **label definitions** that determine what kinds of facts can be captured for a given domain and how they behave. Labels are the tags applied to events to classify them.

Ontologies are a **general, extensible concept** — they can be created for any domain that needs structured context classification. The UPP protocol provides the framework for defining and using ontologies; individual ontology definitions determine the vocabulary for their specific domain.

Each label definition includes:

- **Category** — A top-level grouping that organizes labels by their nature (e.g., identity, temporal, behavioral).
- **Sensitivity** — How private the data under this label is.
- **Cardinality** — Whether values accumulate or supersede.
- **Durability** — How long the fact is expected to remain valid.

Ontologies are defined as JSON files and loaded at server startup. They are not managed at runtime — see [07-ontology-management.md](07-ontology-management.md) for management details.

---

## 2. Ontology Types

UPP supports multiple ontology types, each designed for a different domain:

| Type | Description |
|---|---|
| **user** | Context about users — identity, skills, preferences, behavior patterns. |
| **enterprise** | Context about companies and organizations. |
| **agent** | Context about AI agents and their capabilities. |
| **location** | Contextual information about places (cities, countries, climate, culture, regulations). |

The ontology system is **fully extensible** — additional types can be created for any domain (e.g., `medical`, `financial`, `gaming`). All ontology types follow the same structure and versioning rules.

### Ontology Identifiers

Ontologies are identified by a combination of type and version: `<type>/<version>`.

Examples:
- `user/v1` — User ontology, version 1
- `location/v1` — Location ontology, version 1
- `enterprise/v1` — Enterprise ontology, version 1

---

## 3. Label Categories

Labels are organized into categories. The protocol defines a standard set of 9 category values that ontologies can use:

| Category | Name | Description |
|---|---|---|
| `WHO` | Who | Identity, demographics, personality, and social attributes |
| `WHAT` | What | Skills, knowledge, projects, and professional assets |
| `WHERE` | Where | Locations, environments, and geographic context |
| `WHEN` | When | Temporal patterns, schedules, and life events |
| `WHY` | Why | Goals, motivations, values, and aspirations |
| `HOW` | How | Behavioral patterns — work style, learning, decision-making |
| `PREF` | Preferences | Explicit preferences and settings |
| `REL` | Relationships | Social connections and relationship dynamics |
| `META` | Meta | Metadata about the entity's context or profile |

**Not all ontologies use all categories.** Each ontology chooses the categories that are relevant to its domain. For example, the `user/v1` ontology uses the six 5W+H categories (WHO, WHAT, WHERE, WHEN, WHY, HOW) while PREF, REL, and META are available for custom ontologies or future versions.

---

## 4. Classification Dimensions

Every label in an ontology is classified along three dimensions: sensitivity, cardinality, and durability.

### Sensitivity Tiers

Sensitivity controls the privacy level of data under a label. This determines how the data should be handled, stored, and shared.

| Tier | Description | Examples |
|---|---|---|
| `tier_public` | Safe to share broadly. Non-sensitive information. | Preferred language, timezone, public interests |
| `tier_work` | Professional context. Appropriate for work settings. | Job title, company, professional skills |
| `tier_personal` | Personal but not inherently sensitive. | First name, hobbies, favorite foods |
| `tier_sensitive` | Sensitive personal data requiring extra protection. | Health conditions, political views, financial info |
| `tier_internal` | Never shared externally. Internal system use only. | Internal notes, system metadata |

### Cardinality

Cardinality determines the **supersession behavior** for a label — whether a new event replaces or accumulates alongside existing events.

| Cardinality | Behavior | Use When | Examples |
|---|---|---|---|
| `singular` | New event **supersedes** the previous one. Only one value is valid at a time. | The fact has one canonical value. | `who_name`, `where_home`, `when_timezone` |
| `plural` | New events **accumulate**. Multiple values can be valid simultaneously. | The fact can have many concurrent values. | `who_languages`, `what_interests_hobbies`, `who_relationships` |

**Supersession mechanics:**

When `upp/ingest` extracts an event for a `singular` label:
1. The server looks for an existing `valid` event with the same label for the same user.
2. If found, the existing event is marked as `superseded` (with `superseded_by` set to the new event's ID).
3. The new event is created as `valid`.

When `upp/ingest` extracts an event for a `plural` label:
1. The new event is simply added alongside existing events.
2. No supersession occurs.

### Durability

Durability indicates how long a fact is expected to remain valid. This is informational and can be used by implementations for caching, cleanup, or display decisions.

| Durability | Expected Lifespan | Examples |
|---|---|---|
| `permanent` | Rarely changes. Stable facts about an entity. | Name, nationality, native language |
| `transient` | Changes over time. Facts that evolve. | Current location, current job, relationship status, favorite restaurant |
| `ephemeral` | Very short-lived. Momentary state. | Current mood, immediate location, ongoing activity |

---

## 5. The User Ontology (user/v1)

The `user/v1` ontology is the first official ontology provided by UPP. It covers personal context about users, organized using a **5W+H framework** (Who, What, Where, When, Why, How) as its categorization approach.

> **Note:** The user ontology is one use case of UPP's ontology system — it demonstrates what's possible. Additional ontologies for other domains (enterprise, agent, location, and custom types) follow the same structure and can use any combination of the available categories.

### Categories Used

The `user/v1` ontology uses 6 of the 9 available categories:

| Category | Count | Description | Example Labels |
|---|---|---|---|
| WHO | 19 | Identity, demographics, personality | `who_name`, `who_age`, `who_languages`, `who_nationality_ethnicity` |
| WHAT | 9 | Skills, knowledge, projects | `what_skills`, `what_interests_hobbies`, `what_education`, `what_tech_stack` |
| WHERE | 6 | Locations and environments | `where_home`, `where_current_location`, `where_work`, `where_work_environment` |
| WHEN | 8 | Temporal patterns and schedules | `when_timezone`, `when_work_schedule`, `when_routines`, `when_life_events` |
| WHY | 6 | Goals, motivations, values | `why_goals`, `why_values_motivations`, `why_aspirations`, `why_fears` |
| HOW | 9 | Behavioral and work patterns | `how_workflow`, `how_communication`, `how_decision_making`, `how_learning` |

**Total: 57 labels** across 6 categories.

### Label Examples

#### WHO — Singular, Permanent

```json
{
  "name": "who_name",
  "display_name": "Name",
  "description": "The user's full name or preferred name",
  "category": "WHO",
  "sensitivity": "tier_personal",
  "cardinality": "singular",
  "durability": "permanent",
  "examples": ["Alice Chen", "Bob Smith"],
  "classification_guidance": "The person's preferred name or full legal name. Use for direct address and personalization. May include nicknames if the person uses them as their primary identifier.",
  "anti_examples": ["Goes by 'Dr. Chen' at work → use who_role"]
}
```

#### WHAT — Plural, Transient

```json
{
  "name": "what_interests_hobbies",
  "display_name": "Interests & Hobbies",
  "description": "Activities the user enjoys or topics they're passionate about",
  "category": "WHAT",
  "sensitivity": "tier_public",
  "cardinality": "plural",
  "durability": "transient",
  "examples": ["hiking", "painting", "playing guitar"]
}
```

#### WHERE — Singular, Transient

```json
{
  "name": "where_current_location",
  "display_name": "Current Location",
  "description": "The city or region where the user currently lives",
  "category": "WHERE",
  "sensitivity": "tier_personal",
  "cardinality": "singular",
  "durability": "transient",
  "examples": ["Buenos Aires", "San Francisco", "London"]
}
```

For the complete label list, use the `upp/get_labels` operation or refer to the ontology JSON file (`ontologies/user/v1.json`).
