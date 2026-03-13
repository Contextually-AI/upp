"""UPP JSON-RPC — Encoding and Decoding Protocol Messages.

Demonstrates the JSON-RPC 2.0 wire format used by UPP:
1. All 8 UPP method constants
2. Encoding requests for all operations
3. Encoding success and error responses
4. Decoding requests and responses
5. Using typed request/response models
6. Error handling with UppError and error codes

The UPP wire format is JSON-RPC 2.0 over any transport. This example
shows the message encoding/decoding layer that sits between the
application and the transport.

Expected output:
    === UPP Methods (8 Operations) ===
    Core:        upp/ingest, upp/retrieve, upp/events, upp/delete
    Discovery:   upp/info, upp/labels
    Portability: upp/export, upp/import

    === Encoding Requests ===
    upp/ingest: {"jsonrpc": "2.0", ...}
    ...

    === Encoding Responses ===
    Success: {"jsonrpc": "2.0", "id": 1, "result": ...}
    Error:   {"jsonrpc": "2.0", "id": 1, "error": ...}

    === Decoding ===
    Decoded request: method=upp/ingest, id=10
    ...

    === Typed Models ===
    IngestRequest: entity_key=user-1, text=I live in Tokyo
    ...

    === Error Handling ===
    UppError: code=-32001, message='User not found'
    ...
"""

from upp.rpc.codec import decode_request, decode_response, encode_request, encode_response
from upp.rpc.errors import (
    EXTRACTION_FAILED,
    INVALID_PARAMS,
    ONTOLOGY_NOT_FOUND,
    INGEST_FAILED,
    USER_NOT_FOUND,
    UppError,
)
from upp.rpc.messages import (
    DeleteRequest,
    DeleteResponse,
    EventsRequest,
    ExportRequest,
    ImportRequest,
    InfoRequest,
    InfoResponse,
    JsonRpcError,
    LabelsRequest,
    RetrieveRequest,
    IngestRequest,
    IngestResponse,
)
from upp.rpc.methods import (
    ALL_METHODS,
    UPP_DELETE,
    UPP_EVENTS,
    UPP_EXPORT,
    UPP_IMPORT,
    UPP_INFO,
    UPP_LABELS,
    UPP_RETRIEVE,
    UPP_INGEST,
)


def main() -> None:
    # =========================================================================
    # 1. Method constants
    # =========================================================================
    print("=== UPP Methods (8 Operations) ===")
    print(f"  Core:        {UPP_INGEST}, {UPP_RETRIEVE}, {UPP_EVENTS}, {UPP_DELETE}")
    print(f"  Discovery:   {UPP_INFO}, {UPP_LABELS}")
    print(f"  Portability: {UPP_EXPORT}, {UPP_IMPORT}")
    print(f"  Total: {len(ALL_METHODS)} methods")
    print()

    # =========================================================================
    # 2. Encoding requests for all 8 operations
    # =========================================================================
    print("=== Encoding Requests ===")

    # Core operations
    wire = encode_request(
        UPP_INGEST,
        {"entity_key": "user-1", "text": "I live in Tokyo"},
        request_id=1,
    )
    print(f"  {UPP_INGEST}: {wire}")

    wire = encode_request(
        UPP_RETRIEVE,
        {"entity_key": "user-1", "query": "Where does this person live?"},
        request_id=2,
    )
    print(f"  {UPP_RETRIEVE}: {wire}")

    wire = encode_request(
        UPP_EVENTS,
        {"entity_key": "user-1"},
        request_id=3,
    )
    print(f"  {UPP_EVENTS}: {wire}")

    wire = encode_request(
        UPP_DELETE,
        {"entity_key": "user-1", "event_ids": ["evt-001", "evt-002"]},
        request_id=4,
    )
    print(f"  {UPP_DELETE}: {wire}")

    # Discovery operations
    wire = encode_request(UPP_INFO, {}, request_id=5)
    print(f"  {UPP_INFO}: {wire}")

    wire = encode_request(
        UPP_LABELS,
        {},
        request_id=6,
    )
    print(f"  {UPP_LABELS}: {wire}")

    # Portability operations
    wire = encode_request(
        UPP_EXPORT,
        {"entity_key": "user-1"},
        request_id=7,
    )
    print(f"  {UPP_EXPORT}: {wire}")

    wire = encode_request(
        UPP_IMPORT,
        {"entity_key": "user-2", "events": [{"value": "Lives in Tokyo", "labels": ["where_home"]}]},
        request_id=8,
    )
    print(f"  {UPP_IMPORT}: {wire}")
    print()

    # =========================================================================
    # 3. Encoding responses
    # =========================================================================
    print("=== Encoding Responses ===")

    # Success response
    success_wire = encode_response(
        request_id=1,
        result={"events": [{"value": "Lives in Tokyo", "labels": ["where_home"]}]},
    )
    print(f"  Success: {success_wire}")

    # Error response
    error = JsonRpcError(code=USER_NOT_FOUND, message="User 'user-999' not found")
    error_wire = encode_response(request_id=1, error=error)
    print(f"  Error:   {error_wire}")
    print()

    # =========================================================================
    # 4. Decoding
    # =========================================================================
    print("=== Decoding ===")

    req_wire = encode_request(UPP_INGEST, {"entity_key": "u1", "text": "test"}, 10)
    decoded_req = decode_request(req_wire)
    print(f"  Decoded request: method={decoded_req.method}, id={decoded_req.id}")
    print(f"    params: {decoded_req.params}")

    decoded_resp = decode_response(success_wire)
    print(f"  Decoded response: id={decoded_resp.id}, has_result={decoded_resp.result is not None}")
    print(f"    result: {decoded_resp.result}")
    print()

    # =========================================================================
    # 5. Typed request/response models
    # =========================================================================
    print("=== Typed Models ===")

    ingest_req = IngestRequest(entity_key="user-1", text="I live in Tokyo")
    print(f"  IngestRequest: entity_key={ingest_req.entity_key}, text={ingest_req.text}")

    retrieve_req = RetrieveRequest(entity_key="user-1", query="location")
    print(f"  RetrieveRequest: entity_key={retrieve_req.entity_key}, query={retrieve_req.query}")

    events_req = EventsRequest(entity_key="user-1")
    print(f"  EventsRequest: entity_key={events_req.entity_key}")

    delete_req = DeleteRequest(entity_key="user-1", event_ids=["e1", "e2"])
    print(f"  DeleteRequest: entity_key={delete_req.entity_key}, event_ids={delete_req.event_ids}")

    info_req = InfoRequest()
    print(f"  InfoRequest: (no params)")

    labels_req = LabelsRequest()
    print(f"  LabelsRequest: (no params)")

    export_req = ExportRequest(entity_key="user-1")
    print(f"  ExportRequest: entity_key={export_req.entity_key}")

    import_req = ImportRequest.model_validate({
        "entity_key": "user-2",
        "events": [{"value": "test fact", "labels": ["who_name"]}],
    })
    print(f"  ImportRequest: entity_key={import_req.entity_key}, {len(import_req.events)} event(s)")

    # Response models
    info_resp = InfoResponse(
        protocol_version="2.0.0",
        ontology="user/v1",
        operations=list(ALL_METHODS),
    )
    print(f"  InfoResponse: v{info_resp.protocol_version}, {len(info_resp.operations)} ops")

    delete_resp = DeleteResponse(deleted_count=3)
    print(f"  DeleteResponse: deleted_count={delete_resp.deleted_count}")
    print()

    # =========================================================================
    # 6. Error handling
    # =========================================================================
    print("=== Error Handling ===")

    # All UPP error codes
    error_codes = {
        USER_NOT_FOUND: "User Not Found",
        ONTOLOGY_NOT_FOUND: "Ontology Not Found",
        INGEST_FAILED: "Ingest Failed",
        EXTRACTION_FAILED: "Extraction Failed",
    }
    print("  UPP error codes:")
    for code, name in error_codes.items():
        print(f"    {code}: {name}")
    print()

    # UppError exception
    err = UppError(USER_NOT_FOUND, "User 'user-999' not found", {"entity_key": "user-999"})
    print(f"  UppError: {err!r}")

    rpc_err = err.to_jsonrpc_error()
    print(f"  As JsonRpcError: code={rpc_err.code}, message={rpc_err.message}")
    print(f"  Error data: {rpc_err.data}")


if __name__ == "__main__":
    main()
