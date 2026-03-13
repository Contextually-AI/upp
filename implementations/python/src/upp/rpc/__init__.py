"""UPP JSON-RPC 2.0 Support.

This package provides JSON-RPC 2.0 message types, codec functions,
method constants, error definitions, and typed request/response models
for all ten UPP operations.

Message Types:
    JsonRpcRequest, JsonRpcResponse, JsonRpcError, JsonRpcNotification

Operation Models:
    IngestRequest/Response, RetrieveRequest/Response, EventsRequest/Response,
    DeleteRequest/Response, InfoRequest/Response, LabelsRequest/Response,
    ExportRequest/Response, ImportRequest/Response

Codec:
    encode_request, decode_request, encode_response, decode_response

Methods:
    UPP_INGEST, UPP_RETRIEVE, UPP_EVENTS, UPP_DELETE,
    UPP_INFO, UPP_LABELS, UPP_EXPORT, UPP_IMPORT, ALL_METHODS

Errors:
    UppError, standard and UPP-specific error code constants
"""

from __future__ import annotations

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
    ContextualizeRequest,
    ContextualizeResponse,
    DeleteRequest,
    DeleteResponse,
    EventsRequest,
    EventsResponse,
    ExportRequest,
    ExportResponse,
    GetTasksRequest,
    GetTasksResponse,
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

__all__ = [
    # Message types
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
    "IngestRequest",
    "IngestResponse",
    "RetrieveRequest",
    "RetrieveResponse",
    # Codec
    "decode_request",
    "decode_response",
    "encode_request",
    "encode_response",
    # Method constants
    "ALL_METHODS",
    "UPP_CONTEXTUALIZE",
    "UPP_DELETE",
    "UPP_EVENTS",
    "UPP_EXPORT",
    "UPP_GET_TASKS",
    "UPP_IMPORT",
    "UPP_INFO",
    "UPP_LABELS",
    "UPP_INGEST",
    "UPP_RETRIEVE",
    # Error codes
    "EXTRACTION_FAILED",
    "INTERNAL_ERROR",
    "INVALID_PARAMS",
    "INVALID_REQUEST",
    "METHOD_NOT_FOUND",
    "ONTOLOGY_NOT_FOUND",
    "INGEST_FAILED",
    "PARSE_ERROR",
    "USER_NOT_FOUND",
    # Exception
    "UppError",
]
