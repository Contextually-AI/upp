"""UPP Event Lifecycle — Status Transitions and Supersession.

Demonstrates the event-sourcing lifecycle in UPP:
1. Events are immutable once created
2. Singular-cardinality labels cause automatic supersession
3. Plural-cardinality labels accumulate without supersession
4. The three event statuses: valid, staged, superseded

Scenario: Tracking a user's career and skills over time.

Expected output:
    === Phase 1: Initial Facts ===
    Stored 3 events for user-bob
      [valid] who_role: Software Engineer at Acme Corp
      [valid] where_home: Lives in San Francisco, CA
      [valid] what_skills: Proficient in Python and TypeScript

    === Phase 2: Singular Supersession (Job Change) ===
    Stored new job event
    All occupation events:
      [superseded] Software Engineer at Acme Corp (superseded_by=<uuid>...)
      [valid] Senior Engineer at Google ← current

    === Phase 3: Plural Accumulation (New Skills) ===
    All skill events (what_skills):
      [valid] Proficient in Python and TypeScript
      [valid] Learning Rust programming
    Both skills coexist — plural labels accumulate!

    === Phase 4: Staged Events (Low Confidence) ===
    Stored low-confidence event
      [valid] what_skills: Might know some Go (confidence=0.3)
    Note: Low confidence events are still stored as 'valid'.
    Staging logic is an implementation choice for the server.

    === Summary ===
    Total events: 6
      valid: 5
      superseded: 1
"""

import asyncio
import uuid
from datetime import datetime, timezone

from upp import Event, EventStatus, SourceType
from upp.models.events import StoredEvent
from upp.ontologies.user_v1 import OntologyUserV1


# ---------------------------------------------------------------------------
# Minimal in-memory ingest backend with supersession support
# ---------------------------------------------------------------------------


class SupersessionIngest:
    """IngestBackend that handles singular-cardinality supersession."""

    def __init__(self) -> None:
        self._events: dict[str, list[StoredEvent]] = {}
        self._ontology = OntologyUserV1()

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
            # Supersession: if label is singular, mark old events as superseded
            for label_name in e.labels:
                try:
                    label_def = self._ontology.get_label_by_name(label_name)
                except KeyError:
                    label_def = None
                if label_def and label_def.cardinality.value == "singular":
                    for existing in self._events.get(entity_key, []):
                        if (
                            label_name in existing.labels
                            and existing.status == EventStatus.VALID
                        ):
                            # Mark as superseded (recreate since frozen)
                            idx = self._events[entity_key].index(existing)
                            self._events[entity_key][idx] = StoredEvent(
                                **{
                                    **existing.model_dump(),
                                    "status": EventStatus.SUPERSEDED,
                                    "superseded_by": se.id,
                                }
                            )
            stored.append(se)
        self._events.setdefault(entity_key, []).extend(stored)
        return stored

    @staticmethod
    def _extract(text: str) -> list[Event]:
        """Naive keyword extraction for demo purposes.

        In production, an LLM would handle extraction and classification.
        """
        events: list[Event] = []
        lower = text.lower()
        # Extract job/role facts
        if "engineer" in lower or "scientist" in lower or "work" in lower:
            # Use the text as the extracted value
            events.append(Event(
                value=text.strip(),
                labels=["who_role"],
                confidence=0.95,
                source_type=SourceType.USER_STATED,
            ))
        # Extract location facts
        if any(w in lower for w in ("live", "lives", "moved", "home")):
            events.append(Event(
                value=text.strip(),
                labels=["where_home"],
                confidence=0.90,
                source_type=SourceType.USER_STATED,
            ))
        # Extract skill facts
        if any(w in lower for w in ("proficient", "skill", "learning", "know")):
            source = SourceType.AGENT_OBSERVED if "learning" in lower else SourceType.USER_STATED
            confidence = 0.3 if "might" in lower else (0.75 if "learning" in lower else 0.88)
            events.append(Event(
                value=text.strip(),
                labels=["what_skills"],
                confidence=confidence,
                source_type=SourceType.INFERRED if "might" in lower else source,
            ))
        return events

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
    store = SupersessionIngest()
    entity_key = "user-bob"

    # =========================================================================
    # Phase 1: Store initial facts
    # =========================================================================
    print("=== Phase 1: Initial Facts ===")

    texts = [
        "Software Engineer at Acme Corp",
        "Lives in San Francisco, CA",
        "Proficient in Python and TypeScript",
    ]

    all_stored = []
    for text in texts:
        all_stored.extend(await store.ingest(entity_key, text))
    print(f"Stored {len(all_stored)} events for {entity_key}")
    for s in all_stored:
        print(f"  [{s.status.value}] {s.labels[0]}: {s.value}")
    print()

    # =========================================================================
    # Phase 2: Singular supersession — job change
    # =========================================================================
    print("=== Phase 2: Singular Supersession (Job Change) ===")

    # who_role has singular cardinality → new value supersedes old
    await store.ingest(entity_key, "Senior Engineer at Google")
    print("Stored new job event")

    # Show the supersession in action
    all_events = await store.get_events(entity_key)
    occupation_events = [e for e in all_events if "who_role" in e.labels]

    print("All occupation events:")
    for e in occupation_events:
        if e.status == EventStatus.SUPERSEDED:
            print(f"  [{e.status.value}] {e.value} (superseded_by={e.superseded_by[:8]}...)")
        else:
            print(f"  [{e.status.value}] {e.value} ← current")
    print()

    # =========================================================================
    # Phase 3: Plural accumulation — new skills
    # =========================================================================
    print("=== Phase 3: Plural Accumulation (New Skills) ===")

    # what_skills has plural cardinality → new values accumulate
    await store.ingest(entity_key, "Learning Rust programming")

    all_events = await store.get_events(entity_key)
    skill_events = [
        e for e in all_events
        if "what_skills" in e.labels and e.status == EventStatus.VALID
    ]

    print("All skill events (what_skills):")
    for e in skill_events:
        print(f"  [{e.status.value}] {e.value}")
    print("Both skills coexist — plural labels accumulate!")
    print()

    # =========================================================================
    # Phase 4: Staged events — low confidence
    # =========================================================================
    print("=== Phase 4: Staged Events (Low Confidence) ===")

    staged_stored = await store.ingest(entity_key, "Might know some Go")
    print("Stored low-confidence event")
    for s in staged_stored:
        print(f"  [{s.status.value}] {s.labels[0]}: {s.value} (confidence={s.confidence})")
    print("Note: Low confidence events are still stored as 'valid'.")
    print("Staging logic is an implementation choice for the server.")
    print()

    # =========================================================================
    # Summary
    # =========================================================================
    print("=== Summary ===")

    all_events = await store.get_events(entity_key)
    print(f"Total events: {len(all_events)}")

    by_status: dict[str, int] = {}
    for e in all_events:
        by_status[e.status.value] = by_status.get(e.status.value, 0) + 1
    for status, count in sorted(by_status.items()):
        print(f"  {status}: {count}")


if __name__ == "__main__":
    asyncio.run(main())
