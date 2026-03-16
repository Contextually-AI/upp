"""UPP Enumerations.

Defines the enumeration types used throughout the Universal Personalization
Protocol. All enums inherit from ``str`` and ``enum.Enum`` so they
serialize naturally to their string values in JSON.

Enumerations:
    EventStatus: Lifecycle state of a stored event.
    SourceType: Provenance classification of an extracted fact.
    SensitivityTier: Privacy classification for ontology labels.
    Cardinality: Whether a label accepts one or many values.
    Durability: Expected lifespan of a fact.
"""

from __future__ import annotations

import enum

__all__ = [
    "Cardinality",
    "Durability",
    "EventStatus",
    "SensitivityTier",
    "SourceType",
    "TaskStatus",
]


class EventStatus(enum.StrEnum):
    """Lifecycle state of a stored event.

    Events follow an immutable event-sourcing pattern:

    - ``VALID`` — Active and authoritative.
    - ``STAGED`` — Low confidence, pending reinforcement.
    - ``SUPERSEDED`` — Replaced by a newer event, retained for audit.
    """

    VALID = "valid"
    """Current, retrievable event."""

    STAGED = "staged"
    """Low-confidence event awaiting reinforcement."""

    SUPERSEDED = "superseded"
    """Replaced by a newer event. Retained for audit trail."""


class SourceType(enum.StrEnum):
    """Classifies how a fact was obtained.

    Source types indicate the provenance of an extracted fact.
    """

    USER_STATED = "user_stated"
    """The user explicitly stated this fact."""

    AGENT_OBSERVED = "agent_observed"
    """The agent observed or derived this fact from conversation context."""

    INFERRED = "inferred"
    """The system inferred this fact from indirect signals."""


class SensitivityTier(enum.StrEnum):
    """Privacy classification for ontology labels.

    Ordered from least to most sensitive:
    ``TIER_PUBLIC < TIER_WORK < TIER_PERSONAL < TIER_SENSITIVE < TIER_INTERNAL``
    """

    TIER_PUBLIC = "tier_public"
    """Safe to share broadly."""

    TIER_WORK = "tier_work"
    """Professional context."""

    TIER_PERSONAL = "tier_personal"
    """Personal but non-sensitive."""

    TIER_SENSITIVE = "tier_sensitive"
    """Sensitive personal data."""

    TIER_INTERNAL = "tier_internal"
    """Never shared externally."""


class Cardinality(enum.StrEnum):
    """Defines whether a label accepts one or many concurrent values.

    Cardinality determines supersession behavior: singular labels cause
    new events to supersede old ones, while plural labels accumulate.
    """

    SINGULAR = "singular"
    """Only one value at a time. New values supersede old ones."""

    PLURAL = "plural"
    """Multiple values coexist. New values are added alongside existing ones."""


class Durability(enum.StrEnum):
    """Indicates how long a fact is expected to remain valid.

    Ordering (longest to shortest): ``PERMANENT > TRANSIENT > EPHEMERAL``
    """

    PERMANENT = "permanent"
    """Unlikely to change over a person's lifetime."""

    TRANSIENT = "transient"
    """Changes over months or years."""

    EPHEMERAL = "ephemeral"
    """Changes frequently — days or weeks."""


class TaskStatus(enum.StrEnum):
    """Status of a background task."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
