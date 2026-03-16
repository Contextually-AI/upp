"""Tests for UPP RPC layer: methods, errors, messages, codec."""

from __future__ import annotations

import json
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
from upp.rpc.codec import decode_request, decode_response, encode_request, encode_response
from upp.rpc.errors import (
    EXTRACTION_FAILED,
    INGEST_FAILED,
    INTERNAL_ERROR,
    INVALID_PARAMS,
    INVALID_REQUEST,
    METHOD_NOT_FOUND,
    ONTOLOGY_NOT_FOUND,
    PARSE_ERROR,
    USER_NOT_FOUND,
    UppError,
)
from upp.rpc.messages import (
    DeleteRequest,
    DeleteResponse,
    EventsRequest,
    EventsResponse,
    ExportRequest,
    ExportResponse,
    ImportRequest,
    ImportResponse,
    InfoRequest,
    InfoResponse,
    IngestRequest,
    IngestResponse,
    JsonRpcError,
    JsonRpcNotification,
    JsonRpcRequest,
    JsonRpcResponse,
    LabelsRequest,
    LabelsResponse,
    RetrieveRequest,
    RetrieveResponse,
)
from upp.rpc.methods import (
    ALL_METHODS,
    UPP_CONTEXTUALIZE,
    UPP_DELETE,
    UPP_EVENTS,
    UPP_EXPORT,
    UPP_GET_TASKS,
    UPP_IMPORT,
    UPP_INFO,
    UPP_INGEST,
    UPP_LABELS,
    UPP_RETRIEVE,
)

# ---------------------------------------------------------------------------
# Method Constants
# ---------------------------------------------------------------------------


class TestMethods:
    """Tests for RPC method constants."""

    def test_method_values(self) -> None:
        assert UPP_INGEST == "upp/ingest"
        assert UPP_RETRIEVE == "upp/retrieve"
        assert UPP_EVENTS == "upp/events"
        assert UPP_DELETE == "upp/delete"
        assert UPP_INFO == "upp/info"
        assert UPP_LABELS == "upp/labels"
        assert UPP_EXPORT == "upp/export"
        assert UPP_IMPORT == "upp/import"

    def test_all_methods_count(self) -> None:
        assert len(ALL_METHODS) == 10

    def test_all_methods_contains_all(self) -> None:
        expected = {
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
        }
        assert set(ALL_METHODS) == expected


# ---------------------------------------------------------------------------
# Error Codes
# ---------------------------------------------------------------------------


class TestErrorCodes:
    """Tests for RPC error codes."""

    def test_standard_codes(self) -> None:
        assert PARSE_ERROR == -32700
        assert INVALID_REQUEST == -32600
        assert METHOD_NOT_FOUND == -32601
        assert INVALID_PARAMS == -32602
        assert INTERNAL_ERROR == -32603

    def test_upp_codes(self) -> None:
        assert USER_NOT_FOUND == -32001
        assert ONTOLOGY_NOT_FOUND == -32002
        assert INGEST_FAILED == -32003
        assert EXTRACTION_FAILED == -32004

    def test_removed_codes(self) -> None:
        """Ensure removed error codes are gone."""
        with pytest.raises(ImportError):
            from upp.rpc.errors import LABEL_NOT_FOUND  # noqa: F401
        with pytest.raises(ImportError):
            from upp.rpc.errors import EVENT_NOT_FOUND  # noqa: F401
        with pytest.raises(ImportError):
            from upp.rpc.errors import CONSENT_REQUIRED  # noqa: F401


class TestUppError:
    """Tests for the UppError exception."""

    def test_create_error(self) -> None:
        err = UppError(-32001, "User not found")
        assert err.code == -32001
        assert err.message == "User not found"
        assert err.data is None

    def test_error_with_data(self) -> None:
        err = UppError(-32001, "User not found", {"entity_key": "abc"})
        assert err.data == {"entity_key": "abc"}

    def test_to_jsonrpc_error(self) -> None:
        err = UppError(-32001, "User not found")
        rpc_err = err.to_jsonrpc_error()
        assert isinstance(rpc_err, JsonRpcError)
        assert rpc_err.code == -32001
        assert rpc_err.message == "User not found"

    def test_repr(self) -> None:
        err = UppError(-32001, "User not found")
        assert "UppError" in repr(err)
        assert "-32001" in repr(err)


# ---------------------------------------------------------------------------
# JSON-RPC Base Types
# ---------------------------------------------------------------------------


class TestJsonRpcRequest:
    """Tests for JsonRpcRequest."""

    def test_create_request(self) -> None:
        req = JsonRpcRequest(id=1, method="upp/ingest", params={"entity_key": "u1"})
        assert req.jsonrpc == "2.0"
        assert req.id == 1
        assert req.method == "upp/ingest"

    def test_default_params(self) -> None:
        req = JsonRpcRequest(id=1, method="upp/info")
        assert req.params == {}


class TestJsonRpcResponse:
    """Tests for JsonRpcResponse."""

    def test_success_response(self) -> None:
        resp = JsonRpcResponse(id=1, result={"events": []})
        assert resp.result == {"events": []}
        assert resp.error is None

    def test_error_response(self) -> None:
        err = JsonRpcError(code=-32001, message="Not found")
        resp = JsonRpcResponse(id=1, error=err)
        assert resp.error is not None
        assert resp.result is None


class TestJsonRpcNotification:
    """Tests for JsonRpcNotification."""

    def test_create_notification(self) -> None:
        notif = JsonRpcNotification(method="upp/ingest", params={"entity_key": "u1"})
        assert notif.jsonrpc == "2.0"
        assert notif.method == "upp/ingest"


# ---------------------------------------------------------------------------
# Operation Request/Response Models
# ---------------------------------------------------------------------------


class TestIngestRequestResponse:
    """Tests for IngestRequest and IngestResponse."""

    def test_ingest_request(self) -> None:
        req = IngestRequest(entity_key="u1", text="I live in Tokyo")
        assert req.entity_key == "u1"
        assert req.text == "I live in Tokyo"

    def test_ingest_response(self) -> None:
        now = datetime.now(UTC)
        event = StoredEvent(
            id="e1",
            entity_key="u1",
            value="Test",
            labels=["a"],
            confidence=0.9,
            source_type=SourceType.USER_STATED,
            status=EventStatus.VALID,
            created_at=now,
        )
        resp = IngestResponse(events=[event])
        assert len(resp.events) == 1


class TestRetrieveRequestResponse:
    """Tests for RetrieveRequest and RetrieveResponse."""

    def test_retrieve_request(self) -> None:
        req = RetrieveRequest(entity_key="u1", query="hobbies")
        assert req.query == "hobbies"

    def test_retrieve_response(self) -> None:
        event = Event(
            value="Likes chess",
            labels=["what_hobbies"],
            confidence=0.9,
            source_type=SourceType.USER_STATED,
        )
        resp = RetrieveResponse(events=[event])
        assert len(resp.events) == 1


class TestEventsRequestResponse:
    """Tests for EventsRequest and EventsResponse."""

    def test_events_request(self) -> None:
        req = EventsRequest(entity_key="u1")
        assert req.entity_key == "u1"

    def test_events_response(self) -> None:
        now = datetime.now(UTC)
        event = StoredEvent(
            id="e1",
            entity_key="u1",
            value="Test",
            labels=["a"],
            confidence=0.9,
            source_type=SourceType.USER_STATED,
            status=EventStatus.VALID,
            created_at=now,
        )
        resp = EventsResponse(events=[event])
        assert len(resp.events) == 1
        assert resp.events[0].id == "e1"

    def test_events_response_empty(self) -> None:
        resp = EventsResponse(events=[])
        assert len(resp.events) == 0


class TestDeleteRequestResponse:
    """Tests for DeleteRequest and DeleteResponse."""

    def test_delete_request_all(self) -> None:
        req = DeleteRequest(entity_key="u1")
        assert req.event_ids is None

    def test_delete_request_specific(self) -> None:
        req = DeleteRequest(entity_key="u1", event_ids=["e1", "e2"])
        assert req.event_ids == ["e1", "e2"]

    def test_delete_response(self) -> None:
        resp = DeleteResponse(deleted_count=5)
        assert resp.deleted_count == 5


class TestInfoRequestResponse:
    """Tests for InfoRequest and InfoResponse."""

    def test_info_request(self) -> None:
        req = InfoRequest()
        assert req is not None

    def test_info_response(self) -> None:
        resp = InfoResponse(
            protocol_version="2.0.0",
            ontology="user/v1",
            operations=list(ALL_METHODS),
            conformance_level=3,
        )
        assert resp.protocol_version == "2.0.0"
        assert resp.ontology == "user/v1"
        assert resp.conformance_level == 3

    def test_info_response_conformance_level_validation(self) -> None:
        """conformance_level must be between 1 and 3."""
        with pytest.raises(ValidationError):
            InfoResponse(
                protocol_version="2.0.0",
                ontology="user/v1",
                operations=list(ALL_METHODS),
                conformance_level=0,
            )
        with pytest.raises(ValidationError):
            InfoResponse(
                protocol_version="2.0.0",
                ontology="user/v1",
                operations=list(ALL_METHODS),
                conformance_level=4,
            )


class TestLabelsRequestResponse:
    """Tests for LabelsRequest and LabelsResponse."""

    def test_labels_request(self) -> None:
        req = LabelsRequest()
        assert req is not None

    def test_labels_response(self) -> None:
        label = LabelDefinition(
            name="who_name",
            display_name="Name",
            description="Name",
            category="WHO",
            sensitivity=SensitivityTier.TIER_PERSONAL,
            cardinality=Cardinality.SINGULAR,
            durability=Durability.PERMANENT,
            examples=["John Doe"],
        )
        resp = LabelsResponse(labels=[label])
        assert len(resp.labels) == 1


class TestExportRequestResponse:
    """Tests for ExportRequest and ExportResponse."""

    def test_export_request(self) -> None:
        req = ExportRequest(entity_key="u1")
        assert req.entity_key == "u1"

    def test_export_response(self) -> None:
        now = datetime.now(UTC)
        resp = ExportResponse(
            file="/tmp/upp-export-u1.json",
            event_count=3,
            exported_at=now,
        )
        assert resp.file == "/tmp/upp-export-u1.json"
        assert resp.event_count == 3
        assert resp.exported_at == now


class TestImportRequestResponse:
    """Tests for ImportRequest and ImportResponse."""

    def test_import_request(self) -> None:
        req = ImportRequest(entity_key="u1", file="/tmp/upp-export-u1.json")
        assert req.entity_key == "u1"
        assert req.file == "/tmp/upp-export-u1.json"

    def test_import_response(self) -> None:
        resp = ImportResponse(imported_count=5, skipped_count=0)
        assert resp.imported_count == 5
        assert resp.skipped_count == 0


# ---------------------------------------------------------------------------
# Codec
# ---------------------------------------------------------------------------


class TestCodec:
    """Tests for the JSON-RPC codec functions."""

    def test_encode_decode_request(self) -> None:
        wire = encode_request("upp/ingest", {"entity_key": "u1", "text": "test"}, 1)
        parsed = json.loads(wire)
        assert parsed["jsonrpc"] == "2.0"
        assert parsed["method"] == "upp/ingest"
        assert parsed["id"] == 1

        decoded = decode_request(wire)
        assert decoded.method == "upp/ingest"
        assert decoded.params["entity_key"] == "u1"

    def test_encode_decode_response(self) -> None:
        wire = encode_response(1, result={"events": []})
        parsed = json.loads(wire)
        assert parsed["id"] == 1
        assert parsed["result"] == {"events": []}

        decoded = decode_response(wire)
        assert decoded.id == 1
        assert decoded.result == {"events": []}

    def test_encode_error_response(self) -> None:
        error = JsonRpcError(code=-32001, message="User not found")
        wire = encode_response(1, error=error)
        decoded = decode_response(wire)
        assert decoded.error is not None
        assert decoded.error.code == -32001

    def test_decode_malformed_json(self) -> None:
        with pytest.raises(json.JSONDecodeError):
            decode_request("not valid json")

    def test_decode_missing_method(self) -> None:
        with pytest.raises(ValidationError):
            decode_request('{"jsonrpc": "2.0", "id": 1}')

    def test_decode_invalid_jsonrpc_version(self) -> None:
        with pytest.raises(ValidationError):
            decode_request('{"jsonrpc": "1.0", "id": 1, "method": "upp/ingest"}')

    def test_encode_request_string_id(self) -> None:
        wire = encode_request("upp/info", {}, "req-abc")
        decoded = decode_request(wire)
        assert decoded.id == "req-abc"

    def test_decode_response_malformed_json(self) -> None:
        with pytest.raises(json.JSONDecodeError):
            decode_response("{bad json}")

    def test_encode_response_null_id(self) -> None:
        wire = encode_response(None, result={"ok": True})
        decoded = decode_response(wire)
        assert decoded.id is None
        assert decoded.result == {"ok": True}
