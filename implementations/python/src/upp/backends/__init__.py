"""UPP Backend Interfaces.

This package defines the abstract backend protocols for the Universal
Personalization Protocol. Each backend is a :class:`typing.Protocol`
decorated with :func:`typing.runtime_checkable`.

Backend Protocols:
    IngestBackend — Persists and retrieves stored events.
    RetrieverBackend — Intelligent retrieval of relevant context.
    OntologyBackend — Label definitions and server metadata.
"""

from __future__ import annotations

from upp.backends.ingest import IngestBackend
from upp.backends.ontology import OntologyBackend
from upp.backends.retriever import RetrieverBackend

__all__ = [
    "OntologyBackend",
    "RetrieverBackend",
    "IngestBackend",
]
