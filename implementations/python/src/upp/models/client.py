"""UPP Client Protocol.

Defines :class:`UPPClientProtocol`, the top-level interface that any
UPP-compliant client must satisfy.  It declares all ten operations
specified by the Universal Personalization Protocol.

Design note — why this Protocol does NOT inherit from the backend protocols
(``IngestBackend``, ``RetrieverBackend``, ``OntologyBackend``):

    Backends are *infrastructure* components — each one owns a single
    responsibility (persistence, retrieval, ontology metadata).  A client
    is an *orchestrator*: it delegates to backends but lives at a higher
    abstraction level.  Inheriting from the backend protocols would
    conflate these two roles and allow a client instance to be passed
    where a backend is expected, creating a misleading extra layer of
    indirection.

    Instead, ``UPPClientProtocol`` declares the same method signatures
    independently.  This keeps the type hierarchy honest — a client *is
    not* a backend — while still guaranteeing that every compliant client
    exposes the full set of UPP operations.
"""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable

from upp.models.events import ContextualizeResult, Event, StoredEvent, TaskResult
from upp.models.labels import LabelDefinition


@runtime_checkable
class UPPClientProtocol(Protocol):
    """Top-level protocol for a UPP-compliant client.

    Any implementation that satisfies this protocol exposes the ten
    operations defined by the Universal Personalization Protocol:

    Core (write):
        1. ingest         — Persist extracted events.
        2. delete_events  — Delete events (GDPR / CCPA compliance).

    Core (read + write):
        3. retrieve       — Intelligent, query-driven event retrieval.
        4. get_events     — Raw listing of all stored events.
        5. contextualize  — Retrieve context and ingest in the background.

    Discovery:
        6. info           — Server metadata and capabilities.
        7. get_labels     — Available labels in the ontology.
        8. get_tasks      — Check status of background tasks.

    Portability:
        9. export_events  — Export events for migration.
       10. import_events  — Import events from another server.
    """

    # ── Core (write) ─────────────────────────────────────────────────

    async def ingest(
        self,
        entity_key: str,
        text: str,
    ) -> list[StoredEvent]: ...

    async def delete_events(
        self,
        entity_key: str,
        event_ids: list[str] | None = None,
    ) -> int: ...

    # ── Core (read) ──────────────────────────────────────────────────

    async def retrieve(
        self,
        entity_key: str,
        query: str,
    ) -> list[StoredEvent]: ...

    async def get_events(
        self,
        entity_key: str,
    ) -> list[StoredEvent]: ...

    async def contextualize(
        self,
        entity_key: str,
        text: str,
    ) -> ContextualizeResult: ...

    # ── Discovery ────────────────────────────────────────────────────

    def info(self) -> dict[str, Any]: ...

    def get_labels(self) -> list[LabelDefinition]: ...

    async def get_tasks(
        self,
        task_ids: list[str],
    ) -> list[TaskResult]: ...

    # ── Portability ──────────────────────────────────────────────────

    async def export_events(
        self,
        entity_key: str,
    ) -> list[StoredEvent]: ...

    async def import_events(
        self,
        entity_key: str,
        events: list[Event],
    ) -> list[StoredEvent]: ...
