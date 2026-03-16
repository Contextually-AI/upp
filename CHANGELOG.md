# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-03-13

### Added

- Protocol specification documents (spec/01 through spec/08)
- JSON Schema definitions for all protocol types (draft 2020-12)
- 10 core operations: `upp/ingest`, `upp/retrieve`, `upp/get_events`, `upp/delete_events`, `upp/contextualize`, `upp/info`, `upp/get_labels`, `upp/get_tasks`, `upp/export_events`, `upp/import_events`
- Event-sourced data model with immutable events and full audit trail
- Ontology system with structured label definitions, categories, and sensitivity tiers
- Default `user/v1` ontology with 57 labels organized across 6 categories (WHO, WHAT, WHERE, WHEN, WHY, HOW)
- Cardinality-based supersession logic (`singular` vs `plural`)
- Durability classification for events (`permanent`, `transient`, `ephemeral`)
- Privacy-by-design sensitivity tiers integrated into the type system
- Data portability via `upp/export_events` and `upp/import_events` operations
- GDPR/CCPA compliance support via `upp/delete_events`
- Server discovery via `upp/info`
- Ontology discovery via `upp/get_labels`
- Three conformance levels: Minimal, Full, and Portable
- Transport-agnostic design supporting stdio, HTTP+SSE, and WebSocket
- Python reference implementation (`upp-python`)
- TypeScript reference implementation (`@upp/sdk`)
- Usage examples for Python and TypeScript

[Unreleased]: https://github.com/Contextually-AI/upp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Contextually-AI/upp/releases/tag/v0.1.0
