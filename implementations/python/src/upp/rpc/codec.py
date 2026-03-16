"""UPP JSON-RPC 2.0 Codec.

Provides functions for encoding and decoding JSON-RPC 2.0 messages as
JSON strings. The codec handles serialization/deserialization between
:class:`JsonRpcRequest`/:class:`JsonRpcResponse` Pydantic models and
their JSON wire format.

Usage::

    from upp.rpc.codec import encode_request, decode_response

    wire = encode_request("upp/ingest", {"entity_key": "u1", "text": "..."}, request_id=1)
    response = decode_response(wire_response)
"""

from __future__ import annotations

import json
from typing import Any

from upp.rpc.messages import JsonRpcError, JsonRpcRequest, JsonRpcResponse

__all__ = [
    "decode_request",
    "decode_response",
    "encode_request",
    "encode_response",
]


def encode_request(
    method: str,
    params: dict[str, Any],
    request_id: int | str,
) -> str:
    """Encode a JSON-RPC 2.0 request as a JSON string.

    Args:
        method: The method name (e.g., ``"upp/ingest"``).
        params: The method parameters as a dictionary.
        request_id: Unique request identifier.

    Returns:
        A JSON string representing the full JSON-RPC 2.0 request.
    """
    request = JsonRpcRequest(
        id=request_id,
        method=method,
        params=params,
    )
    return request.model_dump_json()


def decode_request(data: str) -> JsonRpcRequest:
    """Decode a JSON string into a :class:`JsonRpcRequest`.

    Args:
        data: A JSON string representing a JSON-RPC 2.0 request.

    Returns:
        A validated :class:`JsonRpcRequest` instance.

    Raises:
        pydantic.ValidationError: If the JSON does not conform to the
            JSON-RPC 2.0 request schema.
        json.JSONDecodeError: If the string is not valid JSON.
    """
    parsed = json.loads(data)
    return JsonRpcRequest.model_validate(parsed)


def encode_response(
    request_id: int | str | None,
    result: dict[str, Any] | None = None,
    error: JsonRpcError | None = None,
) -> str:
    """Encode a JSON-RPC 2.0 response as a JSON string.

    Either ``result`` or ``error`` should be provided, but not both.

    Args:
        request_id: The matching request identifier.
        result: The result value on success.
        error: The error object on failure.

    Returns:
        A JSON string representing the full JSON-RPC 2.0 response.
    """
    response = JsonRpcResponse(
        id=request_id,
        result=result,
        error=error,
    )
    return response.model_dump_json()


def decode_response(data: str) -> JsonRpcResponse:
    """Decode a JSON string into a :class:`JsonRpcResponse`.

    Args:
        data: A JSON string representing a JSON-RPC 2.0 response.

    Returns:
        A validated :class:`JsonRpcResponse` instance.

    Raises:
        pydantic.ValidationError: If the JSON does not conform to the
            JSON-RPC 2.0 response schema.
        json.JSONDecodeError: If the string is not valid JSON.
    """
    parsed = json.loads(data)
    return JsonRpcResponse.model_validate(parsed)
