"""UPP — Universal Personalization Protocol Python Reference Implementation.

This package provides the Python reference implementation of the Universal
Personalization Protocol (UPP) data models, backend interfaces, JSON-RPC
support, and a high-level client.

Quick Start::

    from upp import UPPClient, OntologyUserV1
    from upp import Event, StoredEvent, LabelDefinition
    from upp import EventStatus, SourceType, SensitivityTier

Backend Protocols::

    from upp import IngestBackend, RetrieverBackend, OntologyBackend

All public types are re-exported from sub-packages for convenience.
"""

from importlib.metadata import version as _pkg_version

__version__ = _pkg_version("upp-python")

# --- Backend Protocols ---
from upp.backends import (
    IngestBackend,
    OntologyBackend,
    RetrieverBackend,
)

# --- Client ---
from upp.client import UPPClient

# --- Models ---
from upp.models import (
    Cardinality,
    ContextualizeResult,
    Durability,
    Event,
    EventStatus,
    LabelDefinition,
    SensitivityTier,
    SourceType,
    StoredEvent,
    TaskResult,
    TaskStatus,
)

# --- Ontologies ---
from upp.ontologies.user_v1 import OntologyUserV1

# --- RPC ---
from upp.rpc import (
    ALL_METHODS,
    EXTRACTION_FAILED,
    INGEST_FAILED,
    INTERNAL_ERROR,
    INVALID_PARAMS,
    INVALID_REQUEST,
    METHOD_NOT_FOUND,
    ONTOLOGY_NOT_FOUND,
    PARSE_ERROR,
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
    USER_NOT_FOUND,
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
    UppError,
    decode_request,
    decode_response,
    encode_request,
    encode_response,
)

__all__ = [
    "__version__",
    # Enumerations
    "Cardinality",
    "Durability",
    "EventStatus",
    "SensitivityTier",
    "SourceType",
    "TaskStatus",
    # Core entities
    "ContextualizeResult",
    "Event",
    "LabelDefinition",
    "StoredEvent",
    "TaskResult",
    # Backend protocols
    "OntologyBackend",
    "RetrieverBackend",
    "IngestBackend",
    # RPC message types
    "JsonRpcError",
    "JsonRpcNotification",
    "JsonRpcRequest",
    "JsonRpcResponse",
    # RPC operation models
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
    # RPC method constants
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
    # RPC error codes
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
    # Codec
    "decode_request",
    "decode_response",
    "encode_request",
    "encode_response",
    # Client
    "UPPClient",
    # Ontology
    "OntologyUserV1",
]
