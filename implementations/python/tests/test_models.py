"""Tests for UPP data models."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from upp.models.enums import (
    Cardinality,
    Durability,
    EventStatus,
    SensitivityTier,
    SourceType,
)
from upp.models.events import Event, StoredEvent
from upp.models.labels import LabelDefinition

# ---------------------------------------------------------------------------
# Enum Tests
# ---------------------------------------------------------------------------


class TestEventStatus:
    """Tests for EventStatus enum."""

    def test_values(self) -> None:
        assert EventStatus.VALID == "valid"
        assert EventStatus.STAGED == "staged"
        assert EventStatus.SUPERSEDED == "superseded"

    def test_all_values(self) -> None:
        assert len(EventStatus) == 3

    def test_string_serialization(self) -> None:
        assert str(EventStatus.VALID) == "valid"
        assert EventStatus.VALID.value == "valid"


class TestSourceType:
    """Tests for SourceType enum."""

    def test_values(self) -> None:
        assert SourceType.USER_STATED == "user_stated"
        assert SourceType.AGENT_OBSERVED == "agent_observed"
        assert SourceType.INFERRED == "inferred"

    def test_all_values(self) -> None:
        assert len(SourceType) == 3


class TestSensitivityTier:
    """Tests for SensitivityTier enum."""

    def test_values(self) -> None:
        assert SensitivityTier.TIER_PUBLIC == "tier_public"
        assert SensitivityTier.TIER_WORK == "tier_work"
        assert SensitivityTier.TIER_PERSONAL == "tier_personal"
        assert SensitivityTier.TIER_SENSITIVE == "tier_sensitive"
        assert SensitivityTier.TIER_INTERNAL == "tier_internal"

    def test_all_values(self) -> None:
        assert len(SensitivityTier) == 5


class TestCardinality:
    """Tests for Cardinality enum."""

    def test_values(self) -> None:
        assert Cardinality.SINGULAR == "singular"
        assert Cardinality.PLURAL == "plural"

    def test_all_values(self) -> None:
        assert len(Cardinality) == 2


class TestDurability:
    """Tests for Durability enum."""

    def test_values(self) -> None:
        assert Durability.PERMANENT == "permanent"
        assert Durability.TRANSIENT == "transient"
        assert Durability.EPHEMERAL == "ephemeral"

    def test_all_values(self) -> None:
        assert len(Durability) == 3


# ---------------------------------------------------------------------------
# Event Tests
# ---------------------------------------------------------------------------


class TestEvent:
    """Tests for the Event model."""

    def test_minimal_event(self) -> None:
        event = Event(
            value="Likes Python",
            labels=["what_skills"],
            confidence=0.9,
            source_type=SourceType.USER_STATED,
        )
        assert event.value == "Likes Python"
        assert event.labels == ["what_skills"]
        assert event.confidence == 0.9
        assert event.source_type == SourceType.USER_STATED

    def test_full_event(self) -> None:
        event = Event(
            value="Lives in Tokyo",
            labels=["where_home"],
            confidence=0.95,
            source_type=SourceType.USER_STATED,
        )
        assert event.value == "Lives in Tokyo"
        assert event.labels == ["where_home"]
        assert event.confidence == 0.95
        assert event.source_type == SourceType.USER_STATED

    def test_multiple_labels(self) -> None:
        event = Event(
            value="Works as senior developer at Google",
            labels=["what_occupation", "where_work_environment"],
            confidence=0.85,
            source_type=SourceType.AGENT_OBSERVED,
        )
        assert len(event.labels) == 2

    def test_labels_min_length(self) -> None:
        with pytest.raises(ValidationError):
            Event(value="Test", labels=[], confidence=0.5, source_type=SourceType.USER_STATED)

    def test_confidence_bounds(self) -> None:
        Event(value="Test", labels=["a"], confidence=0.0, source_type=SourceType.USER_STATED)
        Event(value="Test", labels=["a"], confidence=1.0, source_type=SourceType.USER_STATED)

        with pytest.raises(ValidationError):
            Event(value="Test", labels=["a"], confidence=-0.1, source_type=SourceType.USER_STATED)

        with pytest.raises(ValidationError):
            Event(value="Test", labels=["a"], confidence=1.1, source_type=SourceType.USER_STATED)

    def test_frozen(self) -> None:
        event = Event(value="Test", labels=["a"], confidence=0.5, source_type=SourceType.USER_STATED)
        with pytest.raises(ValidationError):
            event.value = "Changed"  # type: ignore[misc]

    def test_serialization(self) -> None:
        event = Event(
            value="Test",
            labels=["a"],
            confidence=0.5,
            source_type=SourceType.INFERRED,
        )
        data = event.model_dump()
        assert data["value"] == "Test"
        assert data["labels"] == ["a"]
        assert data["confidence"] == 0.5
        assert data["source_type"] == "inferred"

    def test_deserialization(self) -> None:
        data = {
            "value": "Test",
            "labels": ["a"],
            "confidence": 0.8,
            "source_type": "user_stated",
        }
        event = Event.model_validate(data)
        assert event.source_type == SourceType.USER_STATED

    def test_value_rejects_empty_string(self) -> None:
        """Empty string is rejected — value must have min_length=1."""
        with pytest.raises(ValidationError):
            Event(value="", labels=["a"], confidence=0.5, source_type=SourceType.USER_STATED)

    def test_confidence_boundary_zero(self) -> None:
        event = Event(value="Test", labels=["a"], confidence=0.0, source_type=SourceType.USER_STATED)
        assert event.confidence == 0.0

    def test_confidence_boundary_one(self) -> None:
        event = Event(value="Test", labels=["a"], confidence=1.0, source_type=SourceType.USER_STATED)
        assert event.confidence == 1.0

    def test_all_source_types(self) -> None:
        for st in SourceType:
            event = Event(value="Test", labels=["a"], confidence=0.5, source_type=st)
            assert event.source_type == st

    def test_confidence_required(self) -> None:
        """confidence is required — omitting it raises ValidationError."""
        with pytest.raises(ValidationError):
            Event(value="Test", labels=["a"], source_type=SourceType.USER_STATED)

    def test_source_type_required(self) -> None:
        """source_type is required — omitting it raises ValidationError."""
        with pytest.raises(ValidationError):
            Event(value="Test", labels=["a"], confidence=0.5)

    def test_valid_from_default_none(self) -> None:
        event = Event(value="Test", labels=["a"], confidence=0.5, source_type=SourceType.USER_STATED)
        assert event.valid_from is None

    def test_valid_until_default_none(self) -> None:
        event = Event(value="Test", labels=["a"], confidence=0.5, source_type=SourceType.USER_STATED)
        assert event.valid_until is None

    def test_valid_from_and_valid_until(self) -> None:
        event = Event(
            value="Works at Acme Corp",
            labels=["what_occupation"],
            confidence=0.9,
            source_type=SourceType.USER_STATED,
            valid_from="2025-01-01T00:00:00Z",
            valid_until="2026-06-30T23:59:59Z",
        )
        assert event.valid_from == "2025-01-01T00:00:00Z"
        assert event.valid_until == "2026-06-30T23:59:59Z"

    def test_valid_from_without_valid_until(self) -> None:
        event = Event(
            value="Started learning Rust",
            labels=["what_skills"],
            confidence=0.8,
            source_type=SourceType.USER_STATED,
            valid_from="2026-01-15T00:00:00Z",
        )
        assert event.valid_from == "2026-01-15T00:00:00Z"
        assert event.valid_until is None

    def test_validity_window_serialization(self) -> None:
        event = Event(
            value="Test",
            labels=["a"],
            confidence=0.5,
            source_type=SourceType.USER_STATED,
            valid_from="2025-01-01T00:00:00Z",
            valid_until="2026-01-01T00:00:00Z",
        )
        data = event.model_dump()
        assert data["valid_from"] == "2025-01-01T00:00:00Z"
        assert data["valid_until"] == "2026-01-01T00:00:00Z"

        restored = Event.model_validate(data)
        assert restored.valid_from == event.valid_from
        assert restored.valid_until == event.valid_until


# ---------------------------------------------------------------------------
# StoredEvent Tests
# ---------------------------------------------------------------------------


class TestStoredEvent:
    """Tests for the StoredEvent model."""

    def test_minimal_stored_event(self) -> None:
        now = datetime.now(UTC)
        stored = StoredEvent(
            id="evt-001",
            entity_key="user-123",
            value="Test",
            labels=["a"],
            confidence=0.9,
            source_type=SourceType.USER_STATED,
            status=EventStatus.VALID,
            created_at=now,
        )
        assert stored.id == "evt-001"
        assert stored.entity_key == "user-123"
        assert stored.status == EventStatus.VALID
        assert stored.created_at == now
        assert stored.superseded_by is None

    def test_superseded_event(self) -> None:
        stored = StoredEvent(
            id="evt-001",
            entity_key="user-123",
            value="Old value",
            labels=["a"],
            confidence=0.8,
            source_type=SourceType.USER_STATED,
            status=EventStatus.SUPERSEDED,
            created_at=datetime.now(UTC),
            superseded_by="evt-002",
        )
        assert stored.status == EventStatus.SUPERSEDED
        assert stored.superseded_by == "evt-002"

    def test_inherits_event_fields(self) -> None:
        stored = StoredEvent(
            id="evt-001",
            entity_key="user-123",
            value="Test",
            labels=["a", "b"],
            confidence=0.9,
            source_type=SourceType.AGENT_OBSERVED,
            status=EventStatus.VALID,
            created_at=datetime.now(UTC),
        )
        assert stored.confidence == 0.9
        assert stored.source_type == SourceType.AGENT_OBSERVED

    def test_frozen(self) -> None:
        stored = StoredEvent(
            id="evt-001",
            entity_key="user-123",
            value="Test",
            labels=["a"],
            confidence=0.9,
            source_type=SourceType.USER_STATED,
            status=EventStatus.VALID,
            created_at=datetime.now(UTC),
        )
        with pytest.raises(ValidationError):
            stored.status = EventStatus.SUPERSEDED  # type: ignore[misc]

    def test_serialization_roundtrip(self) -> None:
        now = datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC)
        stored = StoredEvent(
            id="evt-001",
            entity_key="user-123",
            value="Test value",
            labels=["who_name"],
            confidence=0.95,
            source_type=SourceType.USER_STATED,
            status=EventStatus.VALID,
            created_at=now,
        )
        data = stored.model_dump()
        restored = StoredEvent.model_validate(data)
        assert restored.id == stored.id
        assert restored.created_at == stored.created_at
        assert restored.source_type == stored.source_type

    def test_created_at_is_datetime(self) -> None:
        stored = StoredEvent(
            id="evt-001",
            entity_key="user-123",
            value="Test",
            labels=["a"],
            confidence=0.9,
            source_type=SourceType.USER_STATED,
            status=EventStatus.VALID,
            created_at=datetime.now(UTC),
        )
        assert isinstance(stored.created_at, datetime)

    def test_staged_status(self) -> None:
        stored = StoredEvent(
            id="evt-001",
            entity_key="user-123",
            value="Might be a developer",
            labels=["what_occupation"],
            confidence=0.15,
            source_type=SourceType.INFERRED,
            status=EventStatus.STAGED,
            created_at=datetime.now(UTC),
        )
        assert stored.status == EventStatus.STAGED
        assert stored.confidence == 0.15

    def test_all_statuses(self) -> None:
        for status in EventStatus:
            stored = StoredEvent(
                id="evt-001",
                entity_key="user-123",
                value="Test",
                labels=["a"],
                confidence=0.9,
                source_type=SourceType.USER_STATED,
                status=status,
                created_at=datetime.now(UTC),
            )
            assert stored.status == status

    def test_default_status_is_valid(self) -> None:
        stored = StoredEvent(
            id="evt-001",
            entity_key="user-123",
            value="Test",
            labels=["a"],
            confidence=0.9,
            source_type=SourceType.USER_STATED,
            created_at=datetime.now(UTC),
        )
        assert stored.status == EventStatus.VALID


# ---------------------------------------------------------------------------
# LabelDefinition Tests
# ---------------------------------------------------------------------------


class TestLabelDefinition:
    """Tests for the LabelDefinition model."""

    def test_minimal_label(self) -> None:
        label = LabelDefinition(
            name="who_name",
            display_name="Name",
            description="The person's name",
            category="WHO",
            sensitivity=SensitivityTier.TIER_PERSONAL,
            cardinality=Cardinality.SINGULAR,
            durability=Durability.PERMANENT,
            examples=["John Doe", "Jane Smith"],
        )
        assert label.name == "who_name"
        assert label.examples == ["John Doe", "Jane Smith"]

    def test_label_with_examples(self) -> None:
        label = LabelDefinition(
            name="what_skills",
            display_name="Skills",
            description="Technical and professional skills",
            category="WHAT",
            sensitivity=SensitivityTier.TIER_WORK,
            cardinality=Cardinality.PLURAL,
            durability=Durability.TRANSIENT,
            examples=["Python", "Machine Learning"],
        )
        assert label.examples == ["Python", "Machine Learning"]

    def test_frozen(self) -> None:
        label = LabelDefinition(
            name="test",
            display_name="Test",
            description="Test label",
            category="META",
            sensitivity=SensitivityTier.TIER_PUBLIC,
            cardinality=Cardinality.SINGULAR,
            durability=Durability.TRANSIENT,
            examples=["example"],
        )
        with pytest.raises(ValidationError):
            label.name = "changed"  # type: ignore[misc]

    def test_serialization(self) -> None:
        label = LabelDefinition(
            name="who_name",
            display_name="Name",
            description="The person's name",
            category="WHO",
            sensitivity=SensitivityTier.TIER_PERSONAL,
            cardinality=Cardinality.SINGULAR,
            durability=Durability.PERMANENT,
            examples=["John Doe"],
        )
        data = label.model_dump()
        assert data["name"] == "who_name"
        assert data["sensitivity"] == "tier_personal"
        assert data["cardinality"] == "singular"
        assert data["durability"] == "permanent"

    def test_deserialization_roundtrip(self) -> None:
        label = LabelDefinition(
            name="what_skills",
            display_name="Skills",
            description="Technical skills",
            category="WHAT",
            sensitivity=SensitivityTier.TIER_WORK,
            cardinality=Cardinality.PLURAL,
            durability=Durability.TRANSIENT,
            examples=["Python", "Rust"],
        )
        data = label.model_dump()
        restored = LabelDefinition.model_validate(data)
        assert restored.name == label.name
        assert restored.sensitivity == label.sensitivity
        assert restored.cardinality == label.cardinality
        assert restored.durability == label.durability
        assert restored.examples == label.examples

    def test_all_sensitivity_tiers(self) -> None:
        for tier in SensitivityTier:
            label = LabelDefinition(
                name="test",
                display_name="Test",
                description="Test",
                category="META",
                sensitivity=tier,
                cardinality=Cardinality.SINGULAR,
                durability=Durability.TRANSIENT,
                examples=["example"],
            )
            assert label.sensitivity == tier

    def test_all_cardinalities(self) -> None:
        for card in Cardinality:
            label = LabelDefinition(
                name="test",
                display_name="Test",
                description="Test",
                category="META",
                sensitivity=SensitivityTier.TIER_PUBLIC,
                cardinality=card,
                durability=Durability.TRANSIENT,
                examples=["example"],
            )
            assert label.cardinality == card

    def test_all_durabilities(self) -> None:
        for dur in Durability:
            label = LabelDefinition(
                name="test",
                display_name="Test",
                description="Test",
                category="META",
                sensitivity=SensitivityTier.TIER_PUBLIC,
                cardinality=Cardinality.SINGULAR,
                durability=dur,
                examples=["example"],
            )
            assert label.durability == dur

    def test_examples_required(self) -> None:
        """examples is required — omitting it raises ValidationError."""
        with pytest.raises(ValidationError):
            LabelDefinition(
                name="test",
                display_name="Test",
                description="Test",
                category="META",
                sensitivity=SensitivityTier.TIER_PUBLIC,
                cardinality=Cardinality.SINGULAR,
                durability=Durability.TRANSIENT,
            )


# ---------------------------------------------------------------------------
# Removed Types Tests
# ---------------------------------------------------------------------------


class TestRemovedTypes:
    """Ensure removed types are no longer importable."""

    def test_no_event_action(self) -> None:
        with pytest.raises(ImportError):
            from upp.models.enums import EventAction  # noqa: F401

    def test_no_node_type(self) -> None:
        with pytest.raises(ImportError):
            from upp.models.enums import NodeType  # noqa: F401

    def test_no_source_message(self) -> None:
        with pytest.raises(ImportError):
            from upp.models.events import SourceMessage  # noqa: F401

    def test_no_stored_event_details(self) -> None:
        with pytest.raises(ImportError):
            from upp.models.events import StoredEventDetails  # noqa: F401

    def test_no_label_result(self) -> None:
        with pytest.raises(ImportError):
            from upp.models.labels import LabelResult  # noqa: F401

    def test_no_graph_module(self) -> None:
        with pytest.raises(ImportError):
            from upp.models import graph  # noqa: F401

    def test_no_capability_module(self) -> None:
        with pytest.raises(ImportError):
            from upp.models import capability  # noqa: F401

    def test_no_retrieval_module(self) -> None:
        with pytest.raises(ImportError):
            from upp.models import retrieval  # noqa: F401
