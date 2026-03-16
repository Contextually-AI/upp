# UPP Python — Reference Implementation

Python reference implementation of the [Universal Personalization Protocol (UPP)](../../spec/01-overview.md) data models, backends, and client.

## Installation

```bash
pip install upp-python
```

### Development

```bash
pip install -e ".[dev]"
```

## Quick Start

```python
from upp import Event, StoredEvent, SourceType, EventStatus
from upp import LabelDefinition, OntologyUserV1, UPPClient

# Create an event (pre-storage)
event = Event(
    value="I work as a senior software engineer at Anthropic",
    labels=["what_occupation"],
    confidence=0.95,
    source_type=SourceType.USER_STATED,
)

# Use with a client (requires backend implementations)
import asyncio

async def demo():
    client = UPPClient(
        ingest=my_ingest_backend,
        retriever=my_retriever_backend,
        ontology=OntologyUserV1(),
    )
    stored = await client.ingest("user-123", [event])
    print(f"Stored: {stored[0].value} (id={stored[0].id})")

    # Retrieve events
    events = await client.get_events("user-123")
    print(f"Total events: {len(events)}")

asyncio.run(demo())
```

## Package Structure

```
src/upp/
├── __init__.py              # Top-level exports
├── client.py                # UPPClient — high-level protocol client
├── models/
│   ├── __init__.py           # Model re-exports
│   ├── client.py             # UPPClientProtocol
│   ├── enums.py              # EventStatus, SourceType, SensitivityTier, Cardinality, Durability
│   ├── events.py             # Event, StoredEvent
│   └── labels.py             # LabelDefinition
├── backends/
│   ├── __init__.py           # Backend re-exports
│   ├── ingest.py             # IngestBackend protocol
│   ├── retriever.py          # RetrieverBackend protocol
│   └── ontology.py           # OntologyBackend protocol
├── ontologies/
│   ├── __init__.py
│   └── user_v1.py            # OntologyUserV1 — loads ontologies/user/v1.json
└── rpc/
    ├── __init__.py           # RPC re-exports
    ├── methods.py            # UPP_INGEST, UPP_RETRIEVE, etc.
    ├── errors.py             # Error codes and UppError
    ├── messages.py           # JSON-RPC types + operation request/response models
    └── codec.py              # JSON-RPC encode/decode
```

## Protocol Operations

The UPP protocol defines 8 operations:

| Operation | Type | Description |
|---|---|---|
| `upp/ingest` | Core (write) | Extract and ingest events from text |
| `upp/retrieve` | Core (read) | Intelligent retrieval of relevant events |
| `upp/events` | Core (read) | List all stored events |
| `upp/delete` | Core (write) | Delete events (GDPR compliance) |
| `upp/info` | Discovery | Server metadata |
| `upp/labels` | Discovery | Label definitions from an ontology |
| `upp/export` | Portability | Export events for migration |
| `upp/import` | Portability | Import events from another server |

## Requirements

- Python >= 3.11
- Pydantic >= 2.0.0

## Testing

```bash
pytest tests/ -v
```

## License

MIT — See [LICENSE](../../LICENSE) for details.
