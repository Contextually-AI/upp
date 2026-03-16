# UPP Python Examples

Runnable Python examples for the Universal Personalization Protocol (UPP).

## Setup

```bash
# From the repository root
cd implementations/python
pip install -e ".[dev]"

# Or from the examples directory
cd examples/python
pip install -e ../../implementations/python
```

## Running Examples

Each example is a self-contained Python script:

```bash
python 01_quickstart.py
python 02_event_lifecycle.py
# ... etc
```

All examples use `asyncio.run()` where async code is needed.

## Examples

| File | Description |
|------|-------------|
| `01_quickstart.py` | Minimal working example — create events, store them, and retrieve with keyword matching |
| `02_event_lifecycle.py` | Event status lifecycle: singular supersession, plural accumulation, and staged events |
| `03_custom_backends.py` | Implement custom IngestBackend and RetrieverBackend — protocol-based pluggability |
| `04_compliance_and_deletion.py` | GDPR/CCPA compliance — list events, selective deletion, and right to erasure |
| `05_privacy_and_sensitivity.py` | Sensitivity tiers, privacy-aware filtering, and label metadata |
| `06_rpc_client_server.py` | JSON-RPC 2.0 wire format — encoding/decoding all 8 UPP operations |
| `07_ontology_management.py` | Loading and querying the ontology: labels, categories, and server metadata |
| `08_portability_export_import.py` | Data portability — export events, import to another server, verify migration |

## Protocol Overview

UPP defines **8 operations** organized in three tiers:

- **Core** (4): `upp/ingest`, `upp/retrieve`, `upp/events`, `upp/delete`
- **Discovery** (2): `upp/info`, `upp/labels`
- **Portability** (2): `upp/export`, `upp/import`

## Requirements

- Python 3.11+
- `pydantic >= 2.0`
- `upp` package (installed from `implementations/python`)
