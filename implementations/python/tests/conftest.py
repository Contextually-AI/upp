"""Test fixtures for the UPP Python implementation."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from upp.models.enums import (
    Cardinality,
    Durability,
    EventStatus,
    SensitivityTier,
    SourceType,
)
from upp.models.events import Event, StoredEvent
from upp.models.labels import LabelDefinition
from upp.ontologies.user_v1 import OntologyUserV1


@pytest.fixture
def sample_event() -> Event:
    """A minimal valid Event."""
    return Event(
        value="Lives in Buenos Aires",
        labels=["where_home"],
        confidence=0.95,
        source_type=SourceType.USER_STATED,
    )


@pytest.fixture
def sample_event_plural() -> Event:
    """An Event with a plural-cardinality label."""
    return Event(
        value="Speaks Spanish",
        labels=["who_languages"],
        confidence=0.9,
        source_type=SourceType.USER_STATED,
    )


@pytest.fixture
def sample_event_low_confidence() -> Event:
    """An Event with low confidence (staged scenario)."""
    return Event(
        value="Might live in Berlin",
        labels=["where_home"],
        confidence=0.15,
        source_type=SourceType.INFERRED,
    )


@pytest.fixture
def sample_stored_event() -> StoredEvent:
    """A minimal valid StoredEvent."""
    return StoredEvent(
        id="evt-001",
        entity_key="user-123",
        value="Lives in Buenos Aires",
        labels=["where_home"],
        confidence=0.95,
        source_type=SourceType.USER_STATED,
        status=EventStatus.VALID,
        created_at=datetime(2026, 1, 1, tzinfo=UTC),
    )


@pytest.fixture
def sample_staged_event() -> StoredEvent:
    """A StoredEvent with staged status (low confidence)."""
    return StoredEvent(
        id="evt-002",
        entity_key="user-123",
        value="Might live in Berlin",
        labels=["where_home"],
        confidence=0.15,
        source_type=SourceType.INFERRED,
        status=EventStatus.STAGED,
        created_at=datetime(2026, 1, 2, tzinfo=UTC),
    )


@pytest.fixture
def sample_superseded_event() -> StoredEvent:
    """A StoredEvent with superseded status."""
    return StoredEvent(
        id="evt-003",
        entity_key="user-123",
        value="Lives in Tokyo",
        labels=["where_home"],
        confidence=0.9,
        source_type=SourceType.USER_STATED,
        status=EventStatus.SUPERSEDED,
        created_at=datetime(2026, 1, 3, tzinfo=UTC),
        superseded_by="evt-004",
    )


@pytest.fixture
def sample_label() -> LabelDefinition:
    """A minimal valid LabelDefinition."""
    return LabelDefinition(
        name="who_name",
        display_name="Name",
        description="The person's full name",
        category="WHO",
        sensitivity=SensitivityTier.TIER_PERSONAL,
        cardinality=Cardinality.SINGULAR,
        durability=Durability.PERMANENT,
        examples=["John Doe", "María García"],
    )


@pytest.fixture
def ontology() -> OntologyUserV1:
    """An OntologyUserV1 instance."""
    return OntologyUserV1()
