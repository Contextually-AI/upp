"""UPP Error Codes and Exception Class.

Defines all standard JSON-RPC 2.0 error codes, UPP-specific error codes,
and the :class:`UppError` exception class used throughout the protocol.

Standard JSON-RPC Error Codes:
    -32700  Parse error
    -32600  Invalid Request
    -32601  Method not found
    -32602  Invalid params
    -32603  Internal error

UPP-Specific Error Codes (-32001 to -32099):
    -32001  User not found
    -32002  Ontology not found
    -32003  Ingest failed
    -32004  Extraction failed
"""

from __future__ import annotations

from upp.rpc.messages import JsonRpcError

__all__ = [
    # Standard JSON-RPC error codes
    "INTERNAL_ERROR",
    "INVALID_PARAMS",
    "INVALID_REQUEST",
    "METHOD_NOT_FOUND",
    "PARSE_ERROR",
    # UPP-specific error codes
    "EXTRACTION_FAILED",
    "ONTOLOGY_NOT_FOUND",
    "INGEST_FAILED",
    "USER_NOT_FOUND",
    # Exception class
    "UppError",
]

# ---------------------------------------------------------------------------
# Standard JSON-RPC 2.0 Error Codes
# ---------------------------------------------------------------------------

#: Invalid JSON received by the server.
PARSE_ERROR: int = -32700

#: The JSON is valid but not a valid JSON-RPC 2.0 request.
INVALID_REQUEST: int = -32600

#: The requested method does not exist or is not available.
METHOD_NOT_FOUND: int = -32601

#: Invalid method parameter(s).
INVALID_PARAMS: int = -32602

#: Internal JSON-RPC error.
INTERNAL_ERROR: int = -32603

# ---------------------------------------------------------------------------
# UPP-Specific Error Codes (-32001 to -32099)
# ---------------------------------------------------------------------------

#: The specified ``entity_key`` does not exist.
USER_NOT_FOUND: int = -32001

#: The requested ontology does not exist.
ONTOLOGY_NOT_FOUND: int = -32002

#: Error persisting events during ingestion.
INGEST_FAILED: int = -32003

#: Error extracting events from text.
EXTRACTION_FAILED: int = -32004


# ---------------------------------------------------------------------------
# Exception Class
# ---------------------------------------------------------------------------


class UppError(Exception):
    """Exception representing a UPP protocol error.

    Can be raised by any backend or the client when a protocol-level
    error occurs. Provides a :meth:`to_jsonrpc_error` method for
    converting to a :class:`JsonRpcError`.

    Attributes:
        code: The numeric error code.
        message: A human-readable description of the error.
        data: Optional additional structured error data.
    """

    def __init__(
        self,
        code: int,
        message: str,
        data: dict[str, object] | None = None,
    ) -> None:
        """Initialize a UPP error.

        Args:
            code: The numeric error code.
            message: A human-readable description.
            data: Optional structured data providing additional context.
        """
        super().__init__(message)
        self.code = code
        self.message = message
        self.data = data

    def to_jsonrpc_error(self) -> JsonRpcError:
        """Convert this exception to a :class:`JsonRpcError` object.

        Returns:
            A :class:`JsonRpcError` suitable for inclusion in a
            :class:`JsonRpcResponse`.
        """
        return JsonRpcError(
            code=self.code,
            message=self.message,
            data=self.data,
        )

    def __repr__(self) -> str:
        """Return a developer-friendly string representation."""
        return f"UppError(code={self.code}, message={self.message!r})"
