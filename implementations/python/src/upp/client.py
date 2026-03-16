"""UPP Client — High-Level Protocol Client.

Provides :class:`UPPClient`, the primary entry point for the UPP Python
reference implementation. The client accepts pluggable backends and
exposes methods for all ten UPP operations.

"""

from __future__ import annotations

import logging
from importlib.metadata import version as _pkg_version
from typing import Any

from upp.backends.ingest import IngestBackend
from upp.backends.ontology import OntologyBackend
from upp.backends.retriever import RetrieverBackend
from upp.models.client import UPPClientProtocol
from upp.models.events import ContextualizeResult, Event, StoredEvent, TaskResult
from upp.models.labels import LabelDefinition

__all__ = [
    "UPPClient",
]

logger = logging.getLogger(__name__)


class UPPClient(UPPClientProtocol):
    """High-level UPP protocol client.

    Orchestrates backend interfaces to implement all ten UPP
    operations. The client is backend-agnostic — any combination of
    backends satisfying the respective Protocol interfaces can be
    injected.
    """

    def __init__(
        self,
        *,
        ingest: IngestBackend,
        retriever: RetrieverBackend,
        ontology: OntologyBackend,
    ) -> None:
        """Initialize the UPP client with pluggable backends.

        Args:
            ingest: Backend for event ingestion.
            retriever: Backend for intelligent retrieval.
            ontology: Backend for ontology access and server metadata.
        """
        self._ingest = ingest
        self._retriever = retriever
        self._ontology = ontology

    # ── Core (write) ─────────────────────────────────────────────────

    async def ingest(
        self,
        entity_key: str,
        text: str,
    ) -> list[StoredEvent]:
        """upp/ingest — Extract and ingest events from text."""
        logger.info(f"Ingesting text for entity '{entity_key}'")
        return await self._ingest.ingest(entity_key, text)

    async def delete_events(
        self,
        entity_key: str,
        event_ids: list[str] | None = None,
    ) -> int:
        """upp/delete_events — Delete events (GDPR/CCPA compliance)."""
        logger.info(f"Deleting events for entity '{entity_key}' with event_ids={event_ids}")
        return await self._ingest.delete_events(entity_key, event_ids)

    # ── Core (read) ──────────────────────────────────────────────────

    async def retrieve(
        self,
        entity_key: str,
        query: str,
    ) -> list[StoredEvent]:
        """upp/retrieve — Intelligent search for relevant events."""
        logger.info(f"Retrieving events for entity '{entity_key}'")
        return await self._retriever.retrieve(entity_key, query)

    async def get_events(
        self,
        entity_key: str,
    ) -> list[StoredEvent]:
        """upp/get_events — Raw listing of stored events."""
        logger.info(f"Getting events for entity '{entity_key}'")
        return await self._retriever.get_events(entity_key)

    async def contextualize(
        self,
        entity_key: str,
        text: str,
    ) -> ContextualizeResult:
        """upp/contextualize — Retrieve context and ingest in the background."""
        logger.info(f"Contextualizing text for entity '{entity_key}'")
        # Retrieve existing relevant events synchronously
        events = await self._retriever.retrieve(entity_key, text)
        # Schedule background ingest and get task reference
        task_id = await self._ingest.schedule_ingest(entity_key, text)
        return ContextualizeResult(events=events, task_id=task_id)

    # ── Discovery ────────────────────────────────────────────────────

    def info(self) -> dict[str, Any]:
        """upp/info — Server metadata and capabilities."""
        logger.info("Fetching server info")
        return {
            "protocol_version": _pkg_version("upp-python"),
            "ontology": self._ontology.get_version(),
        }

    def get_labels(self) -> list[LabelDefinition]:
        """upp/get_labels — Available labels in the ontology."""
        logger.info("Fetching label definitions from ontology")
        return self._ontology.get_labels()

    async def get_tasks(
        self,
        task_ids: list[str],
    ) -> list[TaskResult]:
        """upp/get_tasks — Check status of background tasks."""
        logger.info(f"Getting task status for {len(task_ids)} task(s)")
        return await self._ingest.get_tasks(task_ids)

    # ── Portability ──────────────────────────────────────────────────

    async def export_events(
        self,
        entity_key: str,
    ) -> list[StoredEvent]:
        """upp/export_events — Export events for migration."""
        logger.info(f"Exporting events for entity '{entity_key}'")
        return await self._retriever.export_events(entity_key)

    async def import_events(
        self,
        entity_key: str,
        events: list[Event],
    ) -> list[StoredEvent]:
        """upp/import_events — Import events from another server."""
        logger.info(f"Importing {len(events)} events for entity '{entity_key}'")
        return await self._ingest.import_events(entity_key, events)
