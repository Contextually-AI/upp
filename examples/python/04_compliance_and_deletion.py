"""UPP Compliance and Deletion — GDPR / CCPA Right to Erasure.

Demonstrates the compliance-related UPP operations:
1. Store events for a user
2. List all events (upp/events)
3. Delete specific events by ID (selective deletion)
4. Delete all events for a user (right to erasure)
5. Verify deletion at each step

These operations are essential for GDPR Article 17 (Right to Erasure),
CCPA deletion rights, and similar data protection regulations.

Expected output:
    === Step 1: Store Events ===
    Stored 4 events for user-dave
    ...
    === Step 2: List All Events ===
    4 events stored for user-dave
    ...
    === Step 3: Selective Deletion ===
    Deleted 1 event(s) by ID
    Remaining: 3 events
    ...
    === Step 4: Right to Erasure (Delete All) ===
    Deleted 3 event(s) — full erasure
    Remaining: 0 events
    User data completely erased!
"""

import asyncio
import uuid
from datetime import datetime, timezone

from upp import Event, EventStatus, SourceType
from upp.models.events import StoredEvent


# ---------------------------------------------------------------------------
# Minimal in-memory ingest backend for demonstration
# ---------------------------------------------------------------------------


class SimpleIngest:
    """Minimal IngestBackend for demonstrating deletion operations."""

    def __init__(self) -> None:
        self._events: dict[str, list[StoredEvent]] = {}

    async def ingest(
        self, entity_key: str, text: str
    ) -> list[StoredEvent]:
        extracted = self._extract(text)
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
        lower = text.lower()
        label = "mock"
        source = SourceType.USER_STATED
        confidence = 0.95
        if "name" in lower or text[0].isupper() and " " in text and "@" not in text and "," not in lower:
            label = "who_name"
            confidence = 0.99
        elif "@" in text:
            label = "who_contact_info"
            confidence = 0.99
        elif any(w in lower for w in ("live", "lives", "berlin", "city")):
            label = "where_home"
        elif any(w in lower for w in ("work", "startup", "engineer")):
            label = "who_role"
            confidence = 0.85
            source = SourceType.AGENT_OBSERVED
        return [Event(
            value=text.strip(),
            labels=[label],
            confidence=confidence,
            source_type=source,
        )]

    async def get_events(self, entity_key: str) -> list[StoredEvent]:
        return list(self._events.get(entity_key, []))

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


async def main() -> None:
    store = SimpleIngest()
    entity_key = "user-dave"

    # =========================================================================
    # Step 1: Store events
    # =========================================================================
    print("=== Step 1: Store Events ===")

    texts = [
        "My name is Dave Smith",
        "dave.smith@example.com",
        "Lives in Berlin, Germany",
        "Works at a fintech startup",
    ]

    stored = []
    for text in texts:
        stored.extend(await store.ingest(entity_key, text))
    print(f"Stored {len(stored)} events for {entity_key}")
    for s in stored:
        print(f"  id={s.id[:8]}... | {s.labels[0]}: {s.value}")
    print()

    # =========================================================================
    # Step 2: List all events (upp/events)
    # =========================================================================
    print("=== Step 2: List All Events ===")

    all_events = await store.get_events(entity_key)
    print(f"{len(all_events)} events stored for {entity_key}")
    for e in all_events:
        print(f"  [{e.status.value}] id={e.id[:8]}... | {e.labels[0]}: {e.value}")
    print()

    # =========================================================================
    # Step 3: Selective deletion (delete specific events by ID)
    # =========================================================================
    print("=== Step 3: Selective Deletion ===")

    # Delete the email event specifically (e.g., user requests email removal)
    email_event = next(e for e in all_events if "who_contact_info" in e.labels)
    print(f"Deleting event: {email_event.labels[0]}: {email_event.value}")

    deleted_count = await store.delete_events(entity_key, [email_event.id])
    print(f"Deleted {deleted_count} event(s) by ID")

    remaining = await store.get_events(entity_key)
    print(f"Remaining: {len(remaining)} events")
    for e in remaining:
        print(f"  [{e.status.value}] {e.labels[0]}: {e.value}")
    print()

    # Verify the email event is gone
    email_events = [e for e in remaining if "who_contact_info" in e.labels]
    assert len(email_events) == 0, "Email event should have been deleted!"
    print("Verified: email event successfully deleted")
    print()

    # =========================================================================
    # Step 4: Right to erasure — delete ALL events
    # =========================================================================
    print("=== Step 4: Right to Erasure (Delete All) ===")

    # When a user exercises their right to erasure (GDPR Art. 17),
    # pass no event_ids to delete everything.
    deleted_count = await store.delete_events(entity_key)
    print(f"Deleted {deleted_count} event(s) — full erasure")

    remaining = await store.get_events(entity_key)
    print(f"Remaining: {len(remaining)} events")
    assert len(remaining) == 0, "All events should have been deleted!"
    print("User data completely erased!")
    print()

    # =========================================================================
    # Summary
    # =========================================================================
    print("=== Compliance Summary ===")
    print("UPP provides two deletion modes for regulatory compliance:")
    print("  1. Selective deletion — delete specific events by ID")
    print("  2. Full erasure — delete all events for a user (GDPR Art. 17)")
    print("Both are exposed via the upp/delete operation.")


if __name__ == "__main__":
    asyncio.run(main())
