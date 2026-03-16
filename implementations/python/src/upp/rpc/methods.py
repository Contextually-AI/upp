"""UPP JSON-RPC Method Constants.

Defines the method name constants for all ten UPP operations.
All method names use the ``upp/`` prefix as specified by the protocol.

Operations:
    5 Core: ingest, retrieve, events, delete, contextualize
    3 Discovery: info, labels, get_tasks
    2 Portability: export, import
"""

from __future__ import annotations

__all__ = [
    "ALL_METHODS",
    "UPP_CONTEXTUALIZE",
    "UPP_DELETE",
    "UPP_EVENTS",
    "UPP_EXPORT",
    "UPP_GET_TASKS",
    "UPP_IMPORT",
    "UPP_INFO",
    "UPP_LABELS",
    "UPP_RETRIEVE",
    "UPP_INGEST",
]

# Core operations
UPP_INGEST: str = "upp/ingest"
"""Extract and ingest events from text."""

UPP_RETRIEVE: str = "upp/retrieve"
"""Retrieve relevant events given a query."""

UPP_EVENTS: str = "upp/events"
"""List all stored events for a user."""

UPP_DELETE: str = "upp/delete"
"""Delete events for compliance (GDPR, CCPA)."""

# Discovery operations
UPP_INFO: str = "upp/info"
"""Return server metadata."""

UPP_LABELS: str = "upp/labels"
"""List label definitions from an ontology."""

# Portability operations
UPP_EXPORT: str = "upp/export"
"""Export events for migration."""

UPP_IMPORT: str = "upp/import"
"""Import events from another server."""

UPP_CONTEXTUALIZE: str = "upp/contextualize"
"""Retrieve context and ingest events in the background."""

UPP_GET_TASKS: str = "upp/get_tasks"
"""Check status of background tasks."""

#: All UPP method names.
ALL_METHODS: list[str] = [
    UPP_INGEST,
    UPP_RETRIEVE,
    UPP_EVENTS,
    UPP_DELETE,
    UPP_INFO,
    UPP_LABELS,
    UPP_EXPORT,
    UPP_IMPORT,
    UPP_CONTEXTUALIZE,
    UPP_GET_TASKS,
]
