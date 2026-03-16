"""UPP Retriever Backend Protocol.

Defines the :class:`RetrieverBackend` protocol for retrieving relevant
structured context given a free-text query. The retriever is responsible
for scoring, ranking, and selecting the most relevant events.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from upp.models.events import StoredEvent

__all__ = [
    "RetrieverBackend",
]


@runtime_checkable
class RetrieverBackend(Protocol):
    """Protocol for pluggable intelligent retrieval.

    A retriever takes a user key and a free-text query, then returns
    the most relevant events ranked by the implementation's scoring
    algorithm.
    """

    async def retrieve(
        self,
        entity_key: str,
        query: str,
    ) -> list[StoredEvent]:
        """Retrieve relevant events for a user given a query.

        The retriever MUST interpret the query and return events
        ranked by relevance.

        Args:
            entity_key: Unique identifier of the user.
            query: Free-text query describing what information is needed.

        Returns:
            A list of :class:`StoredEvent` objects ranked by relevance.
        """
        ...

    async def get_events(
        self,
        entity_key: str,
    ) -> list[StoredEvent]:
        """Get all stored events for a user.

        Returns events of all statuses for transparency.

        Args:
            entity_key: Unique identifier of the user.

        Returns:
            All stored events for the user.
        """
        ...

    async def export_events(
        self,
        entity_key: str,
    ) -> list[StoredEvent]:
        """Export all events for a user.

        Returns events of all statuses (valid, staged, superseded) to
        provide a complete audit trail suitable for migration between
        vendors.

        Args:
            entity_key: Unique identifier of the user.

        Returns:
            All stored events for export.
        """
        ...
