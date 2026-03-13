"""UPP Custom Backends — Implementing Protocol-Based Pluggability.

Demonstrates how to create custom implementations of UPP backend
protocols using Python's structural subtyping (duck typing).

Backend Protocols:
1. IngestBackend — Persists and manages events
2. RetrieverBackend — Intelligent retrieval of relevant events
3. OntologyBackend — Label definitions and server metadata

Any class that implements the required methods satisfies the protocol —
no inheritance needed. This is how UPP enables pluggable backends.

Expected output:
    === Custom Store: LoggingIngest ===
    [LOG] ingest: storing 2 event(s) for user-carol
    Stored 2 events
    [LOG] get_events: retrieving events for user-carol
    Retrieved 2 events
    ...
    === Custom Retriever: KeywordRetriever ===
    Query: "food preferences"
    [RETRIEVER] Searching 2 events for keywords: food, preferences
    Found 1 relevant event(s)
    ...
    === Protocol Compliance Check ===
    LoggingIngest satisfies IngestBackend: True
    KeywordRetriever satisfies RetrieverBackend: True
    ...
"""

import asyncio
import uuid
from datetime import datetime, timezone

from upp import (
    Event,
    EventStatus,
    IngestBackend,
    LabelDefinition,
    OntologyUserV1,
    RetrieverBackend,
    SourceType,
    StoredEvent,
    UPPClient,
)


# =============================================================================
# Custom Backend 1: A logging ingest backend
# =============================================================================


class LoggingIngest:
    """An ingest backend that logs every operation.

    Demonstrates implementing IngestBackend from scratch with logging.
    """

    def __init__(self) -> None:
        self._events: dict[str, list[StoredEvent]] = {}

    async def ingest(
        self, entity_key: str, text: str
    ) -> list[StoredEvent]:
        print(f"  [LOG] ingest: extracting events from text for {entity_key}")
        extracted = self._extract(text)
        print(f"  [LOG] ingest: extracted {len(extracted)} event(s)")
        return await self._persist(entity_key, extracted)

    async def _persist(
        self, entity_key: str, events: list[Event]
    ) -> list[StoredEvent]:
        stored = []
        for e in events:
            se = StoredEvent(
                **e.model_dump(),
                id=str(uuid.uuid4()),
                entity_key=entity_key,
                status=EventStatus.VALID,
                created_at=datetime.now(timezone.utc),
            )
            stored.append(se)
        self._events.setdefault(entity_key, []).extend(stored)
        return stored

    @staticmethod
    def _extract(text: str) -> list[Event]:
        """Naive keyword extraction for demo. In production, use an LLM."""
        events: list[Event] = []
        lower = text.lower()
        if any(w in lower for w in ("food", "spicy", "prefer", "dark mode", "mode")):
            events.append(Event(
                value=text.strip(),
                labels=["what_preferences"],
                confidence=0.92,
                source_type=SourceType.AGENT_OBSERVED if "dark mode" in lower else SourceType.USER_STATED,
            ))
        if any(w in lower for w in ("work", "scientist", "engineer")):
            events.append(Event(
                value=text.strip(),
                labels=["who_role"],
                confidence=0.88,
                source_type=SourceType.USER_STATED,
            ))
        return events

    async def delete_events(
        self, entity_key: str, event_ids: list[str] | None = None
    ) -> int:
        scope = f"event_ids={event_ids}" if event_ids else "all events"
        print(f"  [LOG] delete_events: deleting {scope} for {entity_key}")
        if entity_key not in self._events:
            return 0
        if event_ids is None:
            return len(self._events.pop(entity_key))
        before = len(self._events[entity_key])
        self._events[entity_key] = [
            e for e in self._events[entity_key] if e.id not in set(event_ids)
        ]
        return before - len(self._events[entity_key])

    async def import_events(
        self, entity_key: str, events: list[Event]
    ) -> list[StoredEvent]:
        print(f"  [LOG] import_events: importing {len(events)} event(s) for {entity_key}")
        return await self._persist(entity_key, events)


# =============================================================================
# Custom Backend 2: A keyword-based retriever
# =============================================================================


class KeywordRetriever:
    """A retriever that matches events by keyword overlap.

    Scores events based on how many query keywords appear in the
    event value, then returns matches sorted by score.
    """

    def __init__(self, ingest: LoggingIngest) -> None:
        self._ingest = ingest

    async def retrieve(
        self,
        entity_key: str,
        query: str,
    ) -> list[StoredEvent]:
        stored = self._ingest._events.get(entity_key, [])
        keywords = {w.lower().strip("?.,!") for w in query.split() if len(w) > 2}
        print(f"  [RETRIEVER] Searching {len(stored)} events for keywords: {', '.join(sorted(keywords))}")

        scored: list[tuple[float, StoredEvent]] = []
        for e in stored:
            if e.status != EventStatus.VALID:
                continue
            value_words = {w.lower() for w in e.value.split()}
            overlap = len(keywords & value_words)
            if overlap > 0:
                score = overlap / len(keywords)
                scored.append((score, e))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [event for _, event in scored]

    async def get_events(self, entity_key: str) -> list[StoredEvent]:
        print(f"  [LOG] get_events: retrieving events for {entity_key}")
        return list(self._ingest._events.get(entity_key, []))

    async def export_events(self, entity_key: str) -> list[StoredEvent]:
        print(f"  [LOG] export_events: exporting events for {entity_key}")
        return list(self._ingest._events.get(entity_key, []))


async def main() -> None:
    # =========================================================================
    # 1. Use the custom LoggingIngest
    # =========================================================================
    print("=== Custom Store: LoggingIngest ===")

    ingest = LoggingIngest()

    stored = await ingest.ingest("user-carol", "Loves spicy Thai food")
    stored += await ingest.ingest("user-carol", "Works as a data scientist")
    print(f"Stored {len(stored)} events")

    retriever = KeywordRetriever(ingest)
    retrieved = await retriever.get_events("user-carol")
    print(f"Retrieved {len(retrieved)} events")
    print()

    # =========================================================================
    # 2. Use the custom KeywordRetriever
    # =========================================================================
    print("=== Custom Retriever: KeywordRetriever ===")

    query = "food preferences"
    print(f'Query: "{query}"')

    results = await retriever.retrieve("user-carol", query)
    print(f"Found {len(results)} relevant event(s)")
    for r in results:
        print(f"  - {r.value} {r.labels}")
    print()

    # =========================================================================
    # 3. Protocol compliance check (duck typing)
    # =========================================================================
    print("=== Protocol Compliance Check ===")

    print(f"LoggingIngest satisfies IngestBackend: {isinstance(ingest, IngestBackend)}")
    print(f"KeywordRetriever satisfies RetrieverBackend: {isinstance(retriever, RetrieverBackend)}")
    print()

    # =========================================================================
    # 4. Wire it together with UPPClient
    # =========================================================================
    print("=== Full Client with Custom Backends ===")

    ontology = OntologyUserV1()
    client = UPPClient(ingest=ingest, retriever=retriever, ontology=ontology)

    # Ingest via client
    await client.ingest("user-carol", "Prefers dark mode in all apps")

    # Retrieve via client
    results = await client.retrieve("user-carol", "food and dark mode preferences")
    print(f"Client retrieved {len(results)} events")
    for r in results:
        print(f"  - {r.value}")

    # Server info via client
    info = client.info()
    print(f"\nServer info: protocol v{info['protocol_version']}, "
          f"ontology {info['ontology']}")


if __name__ == "__main__":
    asyncio.run(main())
