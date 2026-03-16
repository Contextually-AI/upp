"""UPP Ingest Backend Protocol.

Defines the :class:`IngestBackend` protocol for extracting and persisting
personal events from free text. The backend manages the full lifecycle of
events following an immutable event-sourcing pattern.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from upp.models.events import Event, StoredEvent, TaskResult

__all__ = [
    "IngestBackend",
]


@runtime_checkable
class IngestBackend(Protocol):
    """Protocol for pluggable event ingestion.

    An ingest backend receives free text, extracts relevant personal
    facts, classifies them with ontology labels, handles supersession
    for singular-cardinality labels, and persists the resulting events.

    Implementations may use any extraction strategy (LLM, NLP, rules)
    and any backing storage (in-memory, SQLite, PostgreSQL, Redis, etc.).
    """

    async def ingest(
        self,
        entity_key: str,
        text: str,
    ) -> list[StoredEvent]:
        """Extract and persist events from free text.

        The backend MUST:

        1. Analyze the input text and extract relevant personal facts.
        2. Classify each fact with one or more ontology labels.
        3. Assign a UUID v4 ``id`` and a UTC ``created_at`` timestamp.
        4. For singular-cardinality labels, mark existing valid events
           with the same label as superseded.

        Args:
            entity_key: Unique identifier of the user.
            text: Free text from which to extract events.

        Returns:
            A list of :class:`StoredEvent` objects with server-assigned metadata.
        """
        ...

    async def delete_events(
        self,
        entity_key: str,
        event_ids: list[str] | None = None,
    ) -> int:
        """Delete events for a user.

        If ``event_ids`` is ``None``, deletes ALL events for the user
        (right to erasure). Otherwise, deletes only the specified events.

        Args:
            entity_key: Unique identifier of the user.
            event_ids: Optional list of specific event IDs to delete.
                If ``None``, all events for the user are deleted.

        Returns:
            Number of events deleted.
        """
        ...

    async def import_events(
        self,
        entity_key: str,
        events: list[Event],
    ) -> list[StoredEvent]:
        """Import events for a user.

        Persists events that were previously exported from another
        UPP-compatible server.

        Args:
            entity_key: Unique identifier of the user.
            events: Events to import.

        Returns:
            A list of :class:`StoredEvent` objects with server-assigned metadata.
        """
        ...

    async def schedule_ingest(
        self,
        entity_key: str,
        text: str,
    ) -> str:
        """Schedule an ingest operation to run in the background.

        Args:
            entity_key: Unique identifier of the user.
            text: Free text from which to extract events.

        Returns:
            A task_id that can be used with get_tasks to check status.
        """
        ...

    async def get_tasks(
        self,
        task_ids: list[str],
    ) -> list[TaskResult]:
        """Check the status of background tasks.

        Args:
            task_ids: One or more task IDs to check.

        Returns:
            A list of TaskResult objects with status and results.
        """
        ...
