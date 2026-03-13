"""UPP Event Models.

Defines the core event entities in the Universal Personalization Protocol:

- :class:`Event` — The atomic unit of extracted personal information.
- :class:`StoredEvent` — An Event after persistence, enriched with server metadata.

Both models are immutable (frozen). Events follow an event-sourcing pattern
where they are never modified after creation.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from upp.models.enums import EventStatus, SourceType, TaskStatus

__all__ = [
    "ContextualizeResult",
    "Event",
    "StoredEvent",
    "TaskResult",
]


class Event(BaseModel):
    """An atomic unit of extracted personal information.

    Events are produced by the extraction pipeline and consumed by the
    store layer. They are immutable — once created, they are never modified.

    Attributes:
        value: The extracted fact as natural-language text.
        labels: One or more ontology label keys this fact maps to.
        confidence: Extraction confidence score in [0.0, 1.0].
        source_type: Provenance classification of the fact.
    """

    model_config = {"frozen": True}

    value: str = Field(
        min_length=1,
        description="The extracted fact as natural-language text.",
    )
    labels: list[str] = Field(
        min_length=1,
        description="One or more ontology label keys this fact maps to.",
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Extraction confidence score in [0.0, 1.0].",
    )
    source_type: SourceType = Field(
        description="Provenance classification: user_stated, agent_observed, or inferred.",
    )
    valid_from: str | None = Field(
        default=None,
        description="ISO-8601 start of the fact's validity window.",
    )
    valid_until: str | None = Field(
        default=None,
        description="ISO-8601 end of the fact's validity window.",
    )


class StoredEvent(Event):
    """A persisted event with server-assigned metadata.

    Extends :class:`Event` with fields assigned by the server upon
    persistence: unique ID, user key, lifecycle status, creation
    timestamp, and optional supersession reference.

    Like ``Event``, ``StoredEvent`` is immutable.

    Attributes:
        id: Unique event identifier (UUID v4).
        entity_key: Unique identifier of the user who owns this event.
        status: Lifecycle status (valid, staged, superseded).
        created_at: Timestamp of creation.
        superseded_by: ID of the event that replaced this one.
    """

    id: str = Field(
        description="Unique event identifier (UUID v4).",
    )
    entity_key: str = Field(
        description="Unique identifier of the user who owns this event.",
    )
    status: EventStatus = Field(
        default=EventStatus.VALID,
        description="Lifecycle status: valid, staged, or superseded.",
    )
    created_at: datetime = Field(
        description="Timestamp of creation (UTC).",
    )
    superseded_by: str | None = Field(
        default=None,
        description="ID of the event that replaced this one (if superseded).",
    )


class TaskResult(BaseModel):
    """Status and result of a background task."""

    model_config = {"frozen": True}

    task_id: str = Field(description="The task identifier.")
    status: TaskStatus = Field(description="Current task status.")
    result: list[StoredEvent] | None = Field(default=None, description="Resulting events when completed.")
    error: str | None = Field(default=None, description="Error message when failed.")
    created_at: datetime = Field(description="When the task was created (UTC).")
    completed_at: datetime | None = Field(default=None, description="When the task finished (UTC).")


class ContextualizeResult(BaseModel):
    """Result of a contextualize operation."""

    model_config = {"frozen": True}

    events: list[StoredEvent] = Field(description="Relevant existing events.")
    task_id: str = Field(description="Reference to the background ingest task.")
