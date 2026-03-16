# UPP — Transport

## Protocol Specification: Wire Format and Error Handling

This document defines the wire format and error handling for the UPP protocol.

---

## Table of Contents

1. [Wire Format](#1-wire-format)
2. [Request Format](#2-request-format)
3. [Response Format](#3-response-format)
4. [Error Handling](#4-error-handling)
5. [Transport Agnosticism](#5-transport-agnosticism)

---

## 1. Wire Format

UPP uses **JSON-RPC 2.0** as its wire format. All messages are JSON objects conforming to the [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification).

### Key Properties

- **Encoding**: UTF-8 JSON.
- **Protocol**: JSON-RPC 2.0 (`"jsonrpc": "2.0"` in every message).
- **Methods**: UPP operations are JSON-RPC methods prefixed with `upp/` (e.g., `upp/ingest`, `upp/retrieve`).
- **IDs**: Clients assign a unique `id` to each request. The server includes the same `id` in the response.

---

## 2. Request Format

A UPP request is a standard JSON-RPC 2.0 request object:

```json
{
  "jsonrpc": "2.0",
  "method": "upp/<operation>",
  "params": { ... },
  "id": <number or string>
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `jsonrpc` | string | Yes | Must be `"2.0"` |
| `method` | string | Yes | The UPP operation (e.g., `"upp/ingest"`) |
| `params` | object | Yes | Operation-specific parameters |
| `id` | number \| string | Yes | Request identifier for correlation |

### Example Request

```json
{
  "jsonrpc": "2.0",
  "method": "upp/ingest",
  "params": {
    "entity_key": "user_alice",
    "text": "My name is Alice and I live in Buenos Aires."
  },
  "id": 1
}
```

---

## 3. Response Format

### Success Response

A successful response contains a `result` field:

```json
{
  "jsonrpc": "2.0",
  "result": <operation-specific result>,
  "id": <same id as request>
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `jsonrpc` | string | Yes | Must be `"2.0"` |
| `result` | any | Yes | Operation-specific result data |
| `id` | number \| string | Yes | Same ID as the request |

### Example Success Response

```json
{
  "jsonrpc": "2.0",
  "result": [
    {
      "id": "evt_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "entity_key": "user_alice",
      "value": "User's name is Alice",
      "labels": ["who_name"],
      "confidence": 0.95,
      "source_type": "user_stated",
      "status": "valid",
      "created_at": "2026-01-15T10:30:00Z",
      "superseded_by": null
    }
  ],
  "id": 1
}
```

### Error Response

An error response contains an `error` field instead of `result`:

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": <error code>,
    "message": "<error message>",
    "data": <optional additional data>
  },
  "id": <same id as request, or null>
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `error.code` | integer | Yes | Numeric error code |
| `error.message` | string | Yes | Human-readable error description |
| `error.data` | any | No | Additional error details |

---

## 4. Error Handling

### Standard JSON-RPC Error Codes

These are standard error codes defined by the JSON-RPC 2.0 specification:

| Code | Name | Description |
|---|---|---|
| `-32600` | Invalid Request | The JSON sent is not a valid JSON-RPC 2.0 request |
| `-32601` | Method Not Found | The requested method (operation) does not exist |
| `-32602` | Invalid Params | Invalid method parameters |
| `-32603` | Internal Error | Internal server error |
| `-32700` | Parse Error | Invalid JSON received |

### UPP-Specific Error Codes

These error codes are specific to the UPP protocol:

| Code | Name | Description |
|---|---|---|
| `-32001` | User Not Found | The specified `entity_key` does not exist |
| `-32002` | Ontology Not Found | The requested ontology does not exist |
| `-32003` | Ingest Failed | Error persisting events to storage |
| `-32004` | Extraction Failed | Error extracting events from the input text |

### Extension Error Codes

Implementations may define additional error codes in the range **`-32000` to `-32099`**. These should be documented by the implementation.

### Error Response Examples

#### Invalid Parameters

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32602,
    "message": "Invalid params: 'entity_key' is required",
    "data": {
      "missing_params": ["entity_key"]
    }
  },
  "id": 1
}
```

#### User Not Found

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32001,
    "message": "User not found: 'user_unknown'",
    "data": {
      "entity_key": "user_unknown"
    }
  },
  "id": 2
}
```

#### Ontology Not Found

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32002,
    "message": "Ontology not found: 'custom/v99'",
    "data": {
      "ontology": "custom/v99"
    }
  },
  "id": 3
}
```

#### Extraction Failed

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32004,
    "message": "Failed to extract events from text",
    "data": {
      "reason": "Text contains no extractable personal information"
    }
  },
  "id": 4
}
```

#### Method Not Found

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32601,
    "message": "Method not found: 'upp/unknown'",
    "data": null
  },
  "id": 5
}
```

---

## 5. Transport Agnosticism

UPP is **transport-agnostic**. The protocol defines the wire format (JSON-RPC 2.0) but does not mandate a specific transport mechanism. Any transport that can carry JSON-RPC 2.0 messages is valid:

- HTTP (request/response)
- WebSocket (bidirectional)
- stdio (process communication)
- Unix sockets
- Message queues
- Any other transport

### Implementation Guidance

While the protocol does not mandate a transport, implementations should consider:

1. **Statelessness** — Each JSON-RPC request is independent. The server should not require a specific sequence of calls (except that `upp/info` is recommended as a first call for discovery).
2. **Content Type** — When using HTTP, implementations should use `application/json` as the content type.
3. **Encoding** — All messages must be UTF-8 encoded JSON.
4. **Concurrency** — The protocol supports concurrent requests. Implementations should handle multiple simultaneous requests gracefully.
