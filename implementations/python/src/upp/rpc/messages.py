"""UPP JSON-RPC 2.0 Message Types and Operation Models.

Defines Pydantic models for the four JSON-RPC 2.0 message types and
typed request/response models for all ten UPP operations.

JSON-RPC Message Types:
    JsonRpcRequest, JsonRpcResponse, JsonRpcError, JsonRpcNotification

Operation Request/Response Models:
    IngestRequest/IngestResponse, RetrieveRequest/RetrieveResponse,
    EventsRequest/EventsResponse, DeleteRequest/DeleteResponse,
    InfoRequest/InfoResponse, LabelsRequest/LabelsResponse,
    ExportRequest/ExportResponse, ImportRequest/ImportResponse
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from upp.models.events import Event, StoredEvent, TaskResult
from upp.models.labels import LabelDefinition

__all__ = [
    # JSON-RPC base types
    "JsonRpcError",
    "JsonRpcNotification",
    "JsonRpcRequest",
    "JsonRpcResponse",
    # Operation request/response models
    "ContextualizeRequest",
    "ContextualizeResponse",
    "DeleteRequest",
    "DeleteResponse",
    "EventsRequest",
    "EventsResponse",
    "ExportRequest",
    "ExportResponse",
    "GetTasksRequest",
    "GetTasksResponse",
    "ImportRequest",
    "ImportResponse",
    "InfoRequest",
    "InfoResponse",
    "LabelsRequest",
    "LabelsResponse",
    "RetrieveRequest",
    "RetrieveResponse",
    "IngestRequest",
    "IngestResponse",
]


# ---------------------------------------------------------------------------
# JSON-RPC 2.0 Base Types
# ---------------------------------------------------------------------------


class JsonRpcError(BaseModel):
    """JSON-RPC 2.0 error object.

    Attributes:
        code: A number indicating the error type.
        message: A short, human-readable description of the error.
        data: Additional structured data about the error (optional).
    """

    code: int = Field(description="A number indicating the error type.")
    message: str = Field(description="A short, human-readable description of the error.")
    data: dict[str, Any] | None = Field(
        default=None,
        description="Additional structured data about the error.",
    )


class JsonRpcRequest(BaseModel):
    """JSON-RPC 2.0 request message.

    Attributes:
        jsonrpc: Protocol version, always ``"2.0"``.
        id: Unique request identifier.
        method: The name of the method to invoke.
        params: Method parameters as a dictionary.
    """

    jsonrpc: Literal["2.0"] = Field(
        default="2.0",
        description='JSON-RPC protocol version. Always "2.0".',
    )
    id: int | str = Field(description="Unique request identifier.")
    method: str = Field(description="The name of the method to invoke.")
    params: dict[str, Any] = Field(
        default_factory=dict,
        description="Method parameters as a dictionary.",
    )


class JsonRpcResponse(BaseModel):
    """JSON-RPC 2.0 response message.

    Contains either ``result`` (success) or ``error`` (failure), not both.

    Attributes:
        jsonrpc: Protocol version, always ``"2.0"``.
        id: Matching request identifier.
        result: The result value on success.
        error: The error object on failure.
    """

    jsonrpc: Literal["2.0"] = Field(
        default="2.0",
        description='JSON-RPC protocol version. Always "2.0".',
    )
    id: int | str | None = Field(default=None, description="Matching request identifier.")
    result: dict[str, Any] | None = Field(
        default=None,
        description="The result value on success.",
    )
    error: JsonRpcError | None = Field(
        default=None,
        description="The error object on failure.",
    )


class JsonRpcNotification(BaseModel):
    """JSON-RPC 2.0 notification message (fire-and-forget, no ``id``).

    Attributes:
        jsonrpc: Protocol version, always ``"2.0"``.
        method: The name of the method to invoke.
        params: Method parameters as a dictionary.
    """

    jsonrpc: Literal["2.0"] = Field(
        default="2.0",
        description='JSON-RPC protocol version. Always "2.0".',
    )
    method: str = Field(description="The name of the method to invoke.")
    params: dict[str, Any] | None = Field(
        default=None,
        description="Method parameters as a dictionary.",
    )


# ---------------------------------------------------------------------------
# UPP Operation Request/Response Models
# ---------------------------------------------------------------------------


class IngestRequest(BaseModel):
    """Request model for ``upp/ingest``.

    Attributes:
        entity_key: Identifier of the user.
        text: Text from which to extract events.
    """

    entity_key: str = Field(description="Identifier of the user.")
    text: str = Field(description="Text from which to extract events.")


class IngestResponse(BaseModel):
    """Response model for ``upp/ingest``.

    Attributes:
        events: The stored events with server-assigned metadata.
    """

    events: list[StoredEvent] = Field(description="The stored events.")


class RetrieveRequest(BaseModel):
    """Request model for ``upp/retrieve``.

    Attributes:
        entity_key: Identifier of the user.
        query: Free-text query for relevance matching.
    """

    entity_key: str = Field(description="Identifier of the user.")
    query: str = Field(description="Free-text query for relevance matching.")


class RetrieveResponse(BaseModel):
    """Response model for ``upp/retrieve``.

    Attributes:
        events: Relevant events ranked by the server.
    """

    events: list[Event] = Field(description="Relevant events ranked by the server.")


class EventsRequest(BaseModel):
    """Request model for ``upp/events``.

    Attributes:
        entity_key: Identifier of the user.
    """

    entity_key: str = Field(description="Identifier of the user.")


class EventsResponse(BaseModel):
    """Response model for ``upp/events``.

    Attributes:
        events: All stored events for the user.
    """

    events: list[StoredEvent] = Field(description="All stored events for the user.")


class DeleteRequest(BaseModel):
    """Request model for ``upp/delete``.

    Attributes:
        entity_key: Identifier of the user.
        event_ids: Specific event IDs to delete. If not provided, all events are deleted.
    """

    entity_key: str = Field(description="Identifier of the user.")
    event_ids: list[str] | None = Field(
        default=None,
        description="Specific event IDs to delete. If omitted, all events are deleted.",
    )


class DeleteResponse(BaseModel):
    """Response model for ``upp/delete``.

    Attributes:
        deleted_count: Number of events deleted.
    """

    deleted_count: int = Field(description="Number of events deleted.")


class InfoRequest(BaseModel):
    """Request model for ``upp/info``. No parameters required."""

    pass


class InfoResponse(BaseModel):
    """Response model for ``upp/info``.

    Attributes:
        protocol_version: Semantic version of the UPP protocol.
        ontology: The ontology identifier for this server instance.
        operations: List of supported operations.
        conformance_level: Server conformance level (1=Minimal, 2=Full, 3=Portable).
    """

    protocol_version: str = Field(description="Semantic version of the UPP protocol.")
    ontology: str = Field(description="The ontology identifier for this server instance.")
    operations: list[str] = Field(description="Supported operations.")
    conformance_level: int = Field(
        ge=1,
        le=3,
        description=("Server conformance level. 1: Minimal (ingest, retrieve, info). 2: Full (+ events, delete, labels). 3: Portable (+ export, import)."),
    )


class LabelsRequest(BaseModel):
    """Request model for ``upp/labels``. No parameters required."""

    pass


class LabelsResponse(BaseModel):
    """Response model for ``upp/labels``.

    Attributes:
        labels: Label definitions from the ontology.
    """

    labels: list[LabelDefinition] = Field(description="Label definitions from the ontology.")


class ExportRequest(BaseModel):
    """Request model for ``upp/export``.

    Attributes:
        entity_key: Identifier of the user.
    """

    entity_key: str = Field(description="Identifier of the user.")


class ExportResponse(BaseModel):
    """Response model for ``upp/export``.

    Attributes:
        file: Path to the exported JSON file.
        event_count: Number of events exported.
        exported_at: Timestamp of the export.
    """

    file: str = Field(description="Path to the exported JSON file.")
    event_count: int = Field(description="Number of events exported.")
    exported_at: datetime = Field(description="Timestamp of the export.")


class ImportRequest(BaseModel):
    """Request model for ``upp/import``.

    Attributes:
        entity_key: Identifier of the destination user.
        file: Path to the JSON file containing events to import.
    """

    entity_key: str = Field(description="Identifier of the destination user.")
    file: str = Field(description="Path to the JSON file containing events to import.")


class ImportResponse(BaseModel):
    """Response model for ``upp/import``.

    Attributes:
        imported_count: Number of events successfully imported.
        skipped_count: Number of events skipped during import.
    """

    imported_count: int = Field(description="Number of events successfully imported.")
    skipped_count: int = Field(description="Number of events skipped during import.")


class ContextualizeRequest(BaseModel):
    """Request model for ``upp/contextualize``."""

    entity_key: str = Field(description="Identifier of the user.")
    text: str = Field(description="Text to retrieve context for and extract events from.")


class ContextualizeResponse(BaseModel):
    """Response model for ``upp/contextualize``."""

    events: list[StoredEvent] = Field(description="Relevant existing events.")
    task_id: str = Field(description="Reference to the background ingest task.")


class GetTasksRequest(BaseModel):
    """Request model for ``upp/get_tasks``."""

    task_ids: list[str] = Field(description="One or more task IDs to check.")


class GetTasksResponse(BaseModel):
    """Response model for ``upp/get_tasks``."""

    tasks: list[TaskResult] = Field(description="Status of each requested task.")
