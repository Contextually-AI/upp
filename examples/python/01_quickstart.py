"""UPP Quickstart — Minimal Working Example.

Demonstrates the core UPP workflow in the fewest lines possible:
1. Ingest free text (the backend extracts and persists events)
2. Retrieve relevant events with a query
3. Wire it all together with UPPClient

This is the "Hello World" of UPP.

Expected output:
    === Step 1: Ingest Text ===
    Input: "I love spicy Thai food, especially pad kra pao. I work as a data scientist at Spotify."
    Ingested 2 event(s) for user-alice
      id=<uuid>... | valid | what_preferences: Loves spicy Thai food, especially pad kra pao
      id=<uuid>... | valid | who_role: Works as a data scientist at Spotify

    === Step 2: Retrieve Events ===
    Query: "What food does this person like?"
    Retrieved 1 relevant event(s)
      - Loves spicy Thai food, especially pad kra pao [what_preferences]
"""

import asyncio
import uuid
from datetime import datetime, timezone

from upp import (
    Event,
    EventStatus,
    OntologyUserV1,
    SourceType,
    StoredEvent,
    UPPClient,
)


# ---------------------------------------------------------------------------
# Minimal in-memory backends for demonstration
# ---------------------------------------------------------------------------


class SimpleIngest:
    """Minimal IngestBackend that extracts and stores events.

    Uses simple keyword-based extraction for demonstration purposes.
    In production, this would use an LLM or NLP pipeline.
    """

    def __init__(self) -> None:
        self._events: dict[str, list[StoredEvent]] = {}

    async def ingest(
        self, entity_key: str, text: str
    ) -> list[StoredEvent]:
        # Simple rule-based extraction for demonstration.
        # A real implementation would use an LLM for extraction.
        extracted = self._extract(text)
        stored = []
        for e in extracted:
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
        """Naive keyword-based extraction for demo purposes."""
        events: list[Event] = []
        lower = text.lower()
        if "food" in lower or "spicy" in lower or "eat" in lower:
            events.append(Event(
                value="Loves spicy Thai food, especially pad kra pao",
                labels=["what_preferences"],
                confidence=0.92,
                source_type=SourceType.USER_STATED,
            ))
        if "work" in lower or "scientist" in lower or "engineer" in lower:
            events.append(Event(
                value="Works as a data scientist at Spotify",
                labels=["who_role"],
                confidence=0.88,
                source_type=SourceType.USER_STATED,
            ))
        return events

    async def delete_events(
        self, entity_key: str, event_ids: list[str] | None = None
    ) -> int:
        if entity_key not in self._events:
            return 0
        if event_ids is None:
            count = len(self._events.pop(entity_key))
            return count
        before = len(self._events[entity_key])
        self._events[entity_key] = [
            e for e in self._events[entity_key] if e.id not in set(event_ids)
        ]
        return before - len(self._events[entity_key])

    async def import_events(
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


class SimpleRetriever:
    """A minimal retriever that matches events by keyword overlap.

    In production, this would use embeddings and semantic scoring.
    Here we do simple keyword matching for demonstration purposes.
    """

    def __init__(self, ingest: SimpleIngest) -> None:
        self._ingest = ingest

    async def retrieve(
        self,
        entity_key: str,
        query: str,
    ) -> list[StoredEvent]:
        """Return valid events whose value contains any query keyword."""
        stored = self._ingest._events.get(entity_key, [])
        query_words = {w.lower().strip("?.,!") for w in query.split()}
        results = []
        for e in stored:
            if e.status != EventStatus.VALID:
                continue
            value_words = {w.lower().strip("?.,!") for w in e.value.split()}
            if query_words & value_words:
                results.append(e)
        return results

    async def get_events(self, entity_key: str) -> list[StoredEvent]:
        return list(self._ingest._events.get(entity_key, []))

    async def export_events(self, entity_key: str) -> list[StoredEvent]:
        return list(self._ingest._events.get(entity_key, []))


async def main() -> None:
    # --- Step 1: Ingest Text ---
    print("=== Step 1: Ingest Text ===")

    ingest = SimpleIngest()
    retriever = SimpleRetriever(ingest)
    ontology = OntologyUserV1()
    client = UPPClient(ingest=ingest, retriever=retriever, ontology=ontology)

    text = "I love spicy Thai food, especially pad kra pao. I work as a data scientist at Spotify."
    print(f'Input: "{text}"')

    stored = await client.ingest("user-alice", text)
    print(f"Ingested {len(stored)} event(s) for user-alice")
    for se in stored:
        print(
            f"  id={se.id[:8]}... | {se.status.value} | "
            f"{se.labels[0]}: {se.value}"
        )
    print()

    # --- Step 2: Retrieve Events ---
    print("=== Step 2: Retrieve Events ===")

    query = "What food does this person like?"
    print(f'Query: "{query}"')
    results = await client.retrieve("user-alice", query)
    print(f"Retrieved {len(results)} relevant event(s)")
    for r in results:
        print(f"  - {r.value} {r.labels}")


if __name__ == "__main__":
    asyncio.run(main())
