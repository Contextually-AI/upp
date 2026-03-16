"""Tests for UPP backend protocol conformance."""

from __future__ import annotations

import inspect

import pytest

from upp.backends.ingest import IngestBackend
from upp.backends.ontology import OntologyBackend
from upp.backends.retriever import RetrieverBackend
from upp.ontologies.user_v1 import OntologyUserV1


class TestIngestBackendProtocol:
    """Test that IngestBackend protocol is properly defined."""

    def test_has_ingest(self) -> None:
        assert hasattr(IngestBackend, "ingest")

    def test_ingest_signature(self) -> None:
        sig = inspect.signature(IngestBackend.ingest)
        params = list(sig.parameters.keys())
        assert "self" in params
        assert "entity_key" in params
        assert "text" in params

    def test_has_delete_events(self) -> None:
        assert hasattr(IngestBackend, "delete_events")

    def test_delete_events_signature(self) -> None:
        sig = inspect.signature(IngestBackend.delete_events)
        params = list(sig.parameters.keys())
        assert "self" in params
        assert "entity_key" in params
        assert "event_ids" in params

    def test_has_import_events(self) -> None:
        assert hasattr(IngestBackend, "import_events")

    def test_import_events_signature(self) -> None:
        sig = inspect.signature(IngestBackend.import_events)
        params = list(sig.parameters.keys())
        assert "self" in params
        assert "entity_key" in params
        assert "events" in params


class TestOntologyBackendProtocol:
    """Test that OntologyUserV1 satisfies the OntologyBackend protocol."""

    def test_isinstance_check(self) -> None:
        ontology = OntologyUserV1()
        assert isinstance(ontology, OntologyBackend)

    def test_has_get_labels(self) -> None:
        ontology = OntologyUserV1()
        assert hasattr(ontology, "get_labels")
        assert callable(ontology.get_labels)

    def test_has_get_version(self) -> None:
        ontology = OntologyUserV1()
        assert hasattr(ontology, "get_version")
        assert callable(ontology.get_version)

    def test_get_labels_signature(self) -> None:
        sig = inspect.signature(OntologyBackend.get_labels)
        params = list(sig.parameters.keys())
        assert "self" in params

    def test_get_version_signature(self) -> None:
        sig = inspect.signature(OntologyBackend.get_version)
        params = list(sig.parameters.keys())
        assert "self" in params


class TestRetrieverBackendProtocol:
    """Test that the RetrieverBackend protocol is properly defined."""

    def test_protocol_is_runtime_checkable(self) -> None:
        assert hasattr(RetrieverBackend, "__protocol_attrs__") or hasattr(RetrieverBackend, "__abstractmethods__")

    def test_has_retrieve_method(self) -> None:
        assert hasattr(RetrieverBackend, "retrieve")
        sig = inspect.signature(RetrieverBackend.retrieve)
        params = list(sig.parameters.keys())
        assert "self" in params
        assert "entity_key" in params
        assert "query" in params

    def test_has_get_events_method(self) -> None:
        assert hasattr(RetrieverBackend, "get_events")
        sig = inspect.signature(RetrieverBackend.get_events)
        params = list(sig.parameters.keys())
        assert "self" in params
        assert "entity_key" in params

    def test_has_export_events_method(self) -> None:
        assert hasattr(RetrieverBackend, "export_events")
        sig = inspect.signature(RetrieverBackend.export_events)
        params = list(sig.parameters.keys())
        assert "self" in params
        assert "entity_key" in params


class TestRemovedBackends:
    """Ensure removed backend modules are no longer importable."""

    def test_no_classifier_backend(self) -> None:
        with pytest.raises(ImportError):
            from upp.backends import classifier  # noqa: F401

    def test_no_extractor_backend(self) -> None:
        with pytest.raises(ImportError):
            from upp.backends import extractor  # noqa: F401

    def test_no_curator_backend(self) -> None:
        with pytest.raises(ImportError):
            from upp.backends import curator  # noqa: F401
