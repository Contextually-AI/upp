"""UPP Data Models.

This package contains all data model definitions for the Universal
Personalization Protocol (UPP) Python reference implementation.

Enumerations:
    EventStatus, SourceType, SensitivityTier, Cardinality, Durability

Core Entities:
    Event, StoredEvent, LabelDefinition
"""

from upp.models.enums import (
    Cardinality,
    Durability,
    EventStatus,
    SensitivityTier,
    SourceType,
    TaskStatus,
)
from upp.models.events import ContextualizeResult, Event, StoredEvent, TaskResult
from upp.models.labels import LabelDefinition

__all__ = [
    # Enumerations
    "Cardinality",
    "Durability",
    "EventStatus",
    "SensitivityTier",
    "SourceType",
    "TaskStatus",
    # Core entities
    "ContextualizeResult",
    "Event",
    "LabelDefinition",
    "StoredEvent",
    "TaskResult",
]
