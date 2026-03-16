"""Tests for the UPPClient."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest

from upp.client import UPPClient
from upp.models.enums import EventStatus, SourceType
from upp.models.events import Event, StoredEvent
from upp.ontologies.user_v1 import OntologyUserV1

# ---------------------------------------------------------------------------
# Minimal in-memory backends for testing
# ---------------------------------------------------------------------------


class MockIngest:
    """A simple in-memory IngestBackend.

    Simulates extraction by creating a single event from the input text.
    In production, an LLM or NLP pipeline would handle real extraction.
    """

    def __init__(self) -> None:
        self._events: dict[str, list[StoredEvent]] = {}
        self._tasks: dict[str, dict] = {}

    async def ingest(self, entity_key: str, text: str) -> list[StoredEvent]:
        se = StoredEvent(
            value=text,
            labels=["mock"],
            confidence=1.0,
            source_type=SourceType.USER_STATED,
            id=str(uuid.uuid4()),
            entity_key=entity_key,
            status=EventStatus.VALID,
            created_at=datetime.now(UTC),
        )
        self._events.setdefault(entity_key, []).append(se)
        return [se]

    async def delete_events(self, entity_key: str, event_ids: list[str] | None = None) -> int:
        if entity_key not in self._events:
            return 0
        if event_ids is None:
            return len(self._events.pop(entity_key))
        before = len(self._events[entity_key])
        ids = set(event_ids)
        self._events[entity_key] = [e for e in self._events[entity_key] if e.id not in ids]
        return before - len(self._events[entity_key])

    async def import_events(self, entity_key: str, events: list[Event]) -> list[StoredEvent]:
        stored = []
        for e in events:
            se = StoredEvent(
                **e.model_dump(),
                id=str(uuid.uuid4()),
                entity_key=entity_key,
                status=EventStatus.VALID,
                created_at=datetime.now(UTC),
            )
            stored.append(se)
        self._events.setdefault(entity_key, []).extend(stored)
        return stored

    async def schedule_ingest(self, entity_key: str, text: str) -> str:
        task_id = f"task_{uuid.uuid4()}"
        # Simulate immediate completion for testing
        result = await self.ingest(entity_key, text)
        self._tasks[task_id] = {
            "result": result,
            "created_at": datetime.now(UTC),
            "completed_at": datetime.now(UTC),
        }
        return task_id

    async def get_tasks(self, task_ids: list[str]) -> list:
        from upp.models.enums import TaskStatus
        from upp.models.events import TaskResult

        results = []
        for tid in task_ids:
            if tid in self._tasks:
                t = self._tasks[tid]
                results.append(
                    TaskResult(
                        task_id=tid,
                        status=TaskStatus.COMPLETED,
                        result=t["result"],
                        created_at=t["created_at"],
                        completed_at=t["completed_at"],
                    )
                )
        return results


class MockRetriever:
    """A simple retriever that returns all valid events."""

    def __init__(self, ingest: MockIngest) -> None:
        self._ingest = ingest

    async def retrieve(self, entity_key: str, query: str) -> list[StoredEvent]:
        return [e for e in self._ingest._events.get(entity_key, []) if e.status == EventStatus.VALID]

    async def get_events(self, entity_key: str) -> list[StoredEvent]:
        return list(self._ingest._events.get(entity_key, []))

    async def export_events(self, entity_key: str) -> list[StoredEvent]:
        return list(self._ingest._events.get(entity_key, []))


@pytest.fixture
def client() -> UPPClient:
    """A UPPClient with mock backends."""
    ingest = MockIngest()
    retriever = MockRetriever(ingest)
    ontology = OntologyUserV1()
    return UPPClient(ingest=ingest, retriever=retriever, ontology=ontology)


class TestUPPClientIngest:
    """Tests for the ingest method."""

    @pytest.mark.asyncio
    async def test_ingest_text(self, client: UPPClient) -> None:
        result = await client.ingest("user-1", "Lives in Tokyo")
        assert len(result) == 1
        assert result[0].value == "Lives in Tokyo"


class TestUPPClientRetrieve:
    """Tests for the retrieve method."""

    @pytest.mark.asyncio
    async def test_retrieve_empty(self, client: UPPClient) -> None:
        result = await client.retrieve("user-1", "any query")
        assert result == []

    @pytest.mark.asyncio
    async def test_retrieve_after_ingest(self, client: UPPClient) -> None:
        await client.ingest("user-1", "Likes Python")

        result = await client.retrieve("user-1", "skills")
        assert len(result) == 1
        assert result[0].value == "Likes Python"


class TestUPPClientGetEvents:
    """Tests for the get_events method."""

    @pytest.mark.asyncio
    async def test_get_events_empty(self, client: UPPClient) -> None:
        result = await client.get_events("user-1")
        assert result == []

    @pytest.mark.asyncio
    async def test_get_events_lists_all(self, client: UPPClient) -> None:
        await client.ingest("user-1", "Knows Python")
        await client.ingest("user-1", "Name is Alice")
        result = await client.get_events("user-1")
        assert len(result) == 2


class TestUPPClientDeleteEvents:
    """Tests for the delete_events method."""

    @pytest.mark.asyncio
    async def test_delete_all(self, client: UPPClient) -> None:
        await client.ingest("user-1", "Some fact")

        count = await client.delete_events("user-1")
        assert count == 1

        result = await client.get_events("user-1")
        assert result == []

    @pytest.mark.asyncio
    async def test_delete_specific(self, client: UPPClient) -> None:
        stored_a = await client.ingest("user-1", "Fact A")
        await client.ingest("user-1", "Fact B")

        count = await client.delete_events("user-1", [stored_a[0].id])
        assert count == 1

        result = await client.get_events("user-1")
        assert len(result) == 1


class TestUPPClientInfo:
    """Tests for the info method."""

    def test_info_returns_metadata(self, client: UPPClient) -> None:
        info = client.info()
        assert "protocol_version" in info
        assert "ontology" in info
        assert isinstance(info["ontology"], str)
        assert info["ontology"] == "user/v1"


class TestUPPClientGetLabels:
    """Tests for the get_labels method."""

    def test_get_labels_returns_definitions(self, client: UPPClient) -> None:
        labels = client.get_labels()
        assert len(labels) > 0
        assert all(hasattr(label, "name") for label in labels)
        assert all(hasattr(label, "category") for label in labels)


class TestUPPClientExport:
    """Tests for the export_events method."""

    @pytest.mark.asyncio
    async def test_export_events(self, client: UPPClient) -> None:
        await client.ingest("user-1", "Test fact")

        result = await client.export_events("user-1")
        assert len(result) == 1
        assert result[0].value == "Test fact"


class TestUPPClientImport:
    """Tests for the import_events method."""

    @pytest.mark.asyncio
    async def test_import_events(self, client: UPPClient) -> None:
        events = [
            Event(
                value="Imported",
                labels=["who_name"],
                confidence=0.9,
                source_type=SourceType.USER_STATED,
            )
        ]
        result = await client.import_events("user-1", events)
        assert len(result) == 1
        assert result[0].value == "Imported"


class TestUPPClientContextualize:
    """Tests for the contextualize method."""

    @pytest.mark.asyncio
    async def test_contextualize_returns_events_and_task_id(self, client: UPPClient) -> None:
        await client.ingest("user-1", "Likes Python")
        result = await client.contextualize("user-1", "I now prefer Rust over Python")
        assert result.task_id.startswith("task_")
        assert len(result.events) >= 1

    @pytest.mark.asyncio
    async def test_contextualize_empty(self, client: UPPClient) -> None:
        result = await client.contextualize("user-1", "Hello world")
        assert result.task_id.startswith("task_")
        assert result.events == []


class TestUPPClientGetTasks:
    """Tests for the get_tasks method."""

    @pytest.mark.asyncio
    async def test_get_tasks_after_contextualize(self, client: UPPClient) -> None:
        ctx = await client.contextualize("user-1", "I love cooking")
        tasks = await client.get_tasks([ctx.task_id])
        assert len(tasks) == 1
        assert tasks[0].task_id == ctx.task_id
        assert tasks[0].status.value == "completed"
        assert tasks[0].result is not None

    @pytest.mark.asyncio
    async def test_get_tasks_unknown_id(self, client: UPPClient) -> None:
        tasks = await client.get_tasks(["nonexistent"])
        assert tasks == []
