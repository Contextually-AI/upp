# UPP — Privacy

## Protocol Specification: Privacy and Compliance

This document describes how UPP enables privacy compliance and data protection through its built-in privacy model.

---

## Table of Contents

1. [Privacy by Design](#1-privacy-by-design)
2. [Sensitivity Tiers](#2-sensitivity-tiers)
3. [Data Minimization](#3-data-minimization)
4. [Compliance Operations](#4-compliance-operations)
5. [Data Portability](#5-data-portability)
6. [Filtering by Sensitivity](#6-filtering-by-sensitivity)
7. [Implementation Guidance](#7-implementation-guidance)

---

## 1. Privacy by Design

UPP treats privacy as a first-class concern, not an afterthought. Privacy is built into the protocol at multiple levels:

- **Sensitivity tiers** — Every label carries a sensitivity classification, enabling fine-grained access control.
- **Data deletion** — The `upp/delete_events` operation enables compliance with right-to-erasure regulations.
- **Data portability** — The `upp/export_events` operation enables compliance with right-to-data-portability regulations.
- **Event-sourcing** — The immutable event model provides a complete audit trail of all data changes.
- **Minimal data surface** — Events store extracted facts, not raw conversation transcripts.

---

## 2. Sensitivity Tiers

Every label in an ontology is assigned a sensitivity tier. These tiers provide a framework for controlling how data is handled, stored, and shared.

| Tier | Level | Description | Example Labels |
|---|---|---|---|
| `tier_public` | 1 (Lowest) | Safe to share broadly. Non-sensitive information that the user would be comfortable sharing publicly. | Preferred language, timezone, public interests |
| `tier_work` | 2 | Professional context. Appropriate for sharing in work settings but not necessarily publicly. | Job title, company name, professional skills |
| `tier_personal` | 3 | Personal but not inherently sensitive. Information the user might share with acquaintances. | First name, hobbies, favorite foods, city of residence |
| `tier_sensitive` | 4 | Sensitive personal data requiring extra protection. Information that could cause harm if disclosed. | Health conditions, political views, financial information, sexual orientation |
| `tier_internal` | 5 (Highest) | Never shared externally. For internal system use only. | Internal notes, system metadata, processing artifacts |

### Tier Hierarchy

Tiers are ordered from least sensitive to most sensitive:

```
tier_public < tier_work < tier_personal < tier_sensitive < tier_internal
```

A client requesting data at a given tier should receive all data at that tier and below (e.g., requesting `tier_personal` should include `tier_public`, `tier_work`, and `tier_personal` data).

---

## 3. Data Minimization

UPP supports data minimization principles through several mechanisms:

### Extract Only What's Needed

The `upp/ingest` operation extracts facts from text — it does not persist raw conversation transcripts. This inherently limits the data surface to relevant personal facts.

### Ontology-Scoped Storage

Events are classified by ontology labels. Only facts that match defined labels are extracted and stored. This prevents over-collection of data.

### Durability-Aware Cleanup

Labels have a `durability` property (`permanent`, `transient`, `ephemeral`) that indicates how long facts are expected to remain valid. Implementations can use this to:

- Automatically expire `ephemeral` events after a short period.
- Flag `transient` events for periodic review.
- Retain `permanent` events indefinitely (unless deleted by the user).

### Supersession

The event-sourcing model naturally minimizes stale data. When a fact changes, the old event is marked as `superseded` rather than retained as current truth. Only `valid` events represent the current state.

---

## 4. Compliance Operations

### Right to Erasure (GDPR Article 17 / CCPA)

The `upp/delete_events` operation provides the mechanism for complying with right-to-erasure requests:

```json
{
  "jsonrpc": "2.0",
  "method": "upp/delete_events",
  "params": {
    "entity_key": "user_alice"
  },
  "id": 1
}
```

This deletes **all** events for the user. For selective deletion:

```json
{
  "jsonrpc": "2.0",
  "method": "upp/delete_events",
  "params": {
    "entity_key": "user_alice",
    "event_ids": ["evt_a1b2c3d4-e5f6-7890-abcd-ef1234567890"]
  },
  "id": 2
}
```

### Key Properties

- **Physical deletion** — Events are permanently removed from storage, not soft-deleted.
- **Complete erasure** — When no `event_ids` are specified, all events for the user are deleted.
- **Selective erasure** — Specific events can be targeted for deletion.
- **Confirmation** — The response includes `deleted_count` for verification.

---

## 5. Data Portability

### Right to Data Portability (GDPR Article 20)

The `upp/export_events` operation enables users to obtain their data in a structured, commonly used, machine-readable format:

```json
{
  "jsonrpc": "2.0",
  "method": "upp/export_events",
  "params": {
    "entity_key": "user_alice"
  },
  "id": 3
}
```

The export returns all events in UPP format, which can be:

1. **Provided to the user** — For personal records or to share with other services.
2. **Imported into another UPP server** — Using `upp/import_events` for vendor migration.
3. **Archived** — For backup purposes.

### Interoperability

The export format is designed to be interoperable between any UPP-compatible servers. The `upp/import_events` operation accepts the same event format, enabling seamless data migration between vendors.

---

## 6. Filtering by Sensitivity

Implementations should support filtering events by sensitivity tier. This enables:

### Use Case: Sharing with Third Parties

A client may want to share only `tier_public` and `tier_work` data with a third-party service:

1. Retrieve events using `upp/retrieve` or `upp/get_events`.
2. Filter results to include only events whose labels have sensitivity `tier_public` or `tier_work`.
3. Share the filtered subset.

### Use Case: Display in UI

An application may show different levels of detail based on the viewing context:

- **Public profile**: Show only `tier_public` data.
- **Work context**: Show `tier_public` + `tier_work` data.
- **Personal dashboard**: Show up to `tier_personal` data.
- **Settings/admin**: Show all tiers including `tier_sensitive`.

### Implementation Note

While the protocol defines sensitivity tiers on labels, the actual enforcement of access control is an implementation concern. The protocol provides the classification; implementations decide how to use it.

---

## 7. Implementation Guidance

### Storage Security

Implementations should:

- Encrypt events at rest, especially those with `tier_sensitive` or `tier_internal` labels.
- Use appropriate access controls to prevent unauthorized access.
- Log access to sensitive data for audit purposes.

### Data Retention

Implementations should consider:

- Implementing automatic expiration for `ephemeral` events.
- Providing mechanisms for periodic review of `transient` events.
- Retaining `superseded` events only as long as needed for audit purposes.
- Documenting their data retention policy.

### Regulatory Compliance

The protocol provides the building blocks for compliance, but implementations must ensure their complete deployment meets applicable regulations:

- **GDPR** — Use `upp/delete_events` for erasure, `upp/export_events` for portability. Ensure proper consent mechanisms (outside protocol scope).
- **CCPA** — Use `upp/delete_events` for consumer deletion requests. Provide disclosure of data collected (via `upp/get_events`).
- **Other regulations** — Adapt the sensitivity tier model and compliance operations to local requirements.

### Authentication and Authorization

Authentication and authorization are explicitly **outside the scope of the UPP protocol**. Implementations must provide their own mechanisms (API keys, OAuth, mTLS, etc.) to ensure that:

- Only authorized clients can access user data.
- Users can only access their own data (or data they are authorized to see).
- Sensitive operations (delete, export) require appropriate authorization.
