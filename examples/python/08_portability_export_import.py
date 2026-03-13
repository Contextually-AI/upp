"""UPP Portability — Export and Import for Vendor Migration.

Demonstrates the UPP portability operations:
1. Store events for a user in "Server A"
2. Export events (upp/export)
3. Import events into "Server B" (upp/import)
4. Verify all data survived migration

This is how UPP enables vendor lock-in avoidance.

Expected output:
    === Server A: Store Events ===
    Stored 4 events for user-eve
    ...
    === Server A: Export Events ===
    Exported 4 events
    ...
    === Server B: Import Events ===
    Imported 4 events into Server B
    ...
    === Verify Migration ===
    Server B events: 4
    Migration successful!
"""

import asyncio
import uuid
from datetime import datetime, timezone

from upp import Event, EventStatus, SourceType
from upp.models.events import StoredEvent


# ---------------------------------------------------------------------------
# Minimal in-memory backends for demonstrating export/import
# ---------------------------------------------------------------------------


class SimpleIngest:
    """Minimal IngestBackend."""

    def __init__(self) -> None:
        self._events: dict[str, list[StoredEvent]] = {}

    async def ingest(
        self, entity_key: str, text: str
    ) -> list[StoredEvent]:
        """Extract and persist events from text.

        Naive extraction for demo. In production, use an LLM.
        """
        event = Event(
            value=text.strip(),
            labels=["mock"],
            confidence=0.95,
            source_type=SourceType.USER_STATED,
        )
        return await self._persist(entity_key, [event])

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

    async def delete_events(
        self, entity_key: str, event_ids: list[str] | None = None
    ) -> int:
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
        return await self._persist(entity_key, events)


class SimpleRetriever:
    """Minimal RetrieverBackend backed by a SimpleIngest."""

    def __init__(self, ingest: SimpleIngest) -> None:
        self._ingest = ingest

    async def retrieve(
        self, entity_key: str, query: str
    ) -> list[StoredEvent]:
        return list(self._ingest._events.get(entity_key, []))

    async def get_events(self, entity_key: str) -> list[StoredEvent]:
        return list(self._ingest._events.get(entity_key, []))

    async def export_events(self, entity_key: str) -> list[StoredEvent]:
        return list(self._ingest._events.get(entity_key, []))


async def main() -> None:
    # =========================================================================
    # Server A: Store personal events
    # =========================================================================
    print("=== Server A: Store Events ===")

    server_a_ingest = SimpleIngest()
    server_a_retriever = SimpleRetriever(server_a_ingest)
    entity_key = "user-eve"

    texts = [
        "Eve Martinez",
        "Product Manager at Stripe",
        "Lives in New York City",
        "Speaks English and Spanish",
    ]

    stored_a = []
    for text in texts:
        stored_a.extend(await server_a_ingest.ingest(entity_key, text))
    print(f"Stored {len(stored_a)} events for {entity_key}")
    for s in stored_a:
        print(f"  [{s.status.value}] {s.labels[0]}: {s.value}")
    print()

    # =========================================================================
    # Server A: Export events (upp/export)
    # =========================================================================
    print("=== Server A: Export Events ===")

    exported = await server_a_retriever.export_events(entity_key)
    print(f"Exported {len(exported)} events")
    for e in exported:
        print(f"  [{e.status.value}] {e.labels[0]}: {e.value} (id={e.id[:8]}...)")
    print()

    # =========================================================================
    # Server B: Import events (upp/import)
    # =========================================================================
    print("=== Server B: Import Events ===")

    server_b_ingest = SimpleIngest()
    server_b_retriever = SimpleRetriever(server_b_ingest)

    # Convert exported StoredEvents back to Events for import
    events_to_import = [
        Event(
            value=e.value,
            labels=e.labels,
            confidence=e.confidence,
            source_type=e.source_type,
            valid_from=e.valid_from,
            valid_until=e.valid_until,
        )
        for e in exported
    ]

    imported = await server_b_ingest.import_events(entity_key, events_to_import)
    print(f"Imported {len(imported)} events into Server B")
    print()

    # =========================================================================
    # Verify migration
    # =========================================================================
    print("=== Verify Migration ===")

    events_b = await server_b_retriever.get_events(entity_key)
    print(f"Server B events: {len(events_b)}")
    for e in events_b:
        print(f"  [{e.status.value}] {e.labels[0]}: {e.value}")

    assert len(events_b) == len(exported), "Migration failed — event count mismatch!"
    print("Migration successful!")
    print()

    # Verify values match (IDs will differ — server B assigns new ones)
    original_values = sorted(e.value for e in exported)
    migrated_values = sorted(e.value for e in events_b)
    assert original_values == migrated_values, "Migration failed — values don't match!"
    print("Verified: all event values preserved across servers")
    print()

    # =========================================================================
    # Summary
    # =========================================================================
    print("=== Portability Summary ===")
    print("UPP portability operations:")
    print("  1. upp/export — Export all events for a user (returns StoredEvent list)")
    print("  2. upp/import — Import events into a new server")
    print("  Key points:")
    print("    - Imported events get new server-assigned IDs and timestamps")
    print("    - Event values, labels, confidence, and source_type are preserved")
    print("    - This enables zero-lock-in vendor migration")


if __name__ == "__main__":
    asyncio.run(main())
