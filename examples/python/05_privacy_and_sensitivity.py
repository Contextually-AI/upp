"""UPP Privacy and Sensitivity — Working with Sensitivity Tiers.

Demonstrates how UPP handles privacy through sensitivity tiers on labels:
1. Loading the ontology and examining sensitivity tiers
2. Understanding the tier hierarchy
3. Filtering labels by sensitivity for access policies
4. Label metadata summary (cardinality, durability distributions)

Sensitivity Tiers (least to most sensitive):
    tier_public    — Safe to share broadly
    tier_work      — Professional context
    tier_personal  — Personal but non-sensitive
    tier_sensitive — Sensitive personal data
    tier_internal  — Never shared externally

Expected output:
    === Loaded Ontology ===
    Loaded N labels from the default ontology

    === Labels by Sensitivity Tier ===
    tier_public (N labels):
      ...
    tier_work (N labels):
      ...
    ...

    === Sensitivity Hierarchy ===
    tier_public < tier_work < tier_personal < tier_sensitive < tier_internal

    === Access Policy Example ===
    Shareable labels (public + work): N
    Restricted labels (personal + sensitive + internal): N

    === Label Metadata Summary ===
    Categories: HOW, META, PREF, ...
    Singular: N, Plural: N
    Permanent: N, Transient: N, Ephemeral: N
"""

from upp import Cardinality, Durability, SensitivityTier
from upp.ontologies.user_v1 import OntologyUserV1


def main() -> None:
    # =========================================================================
    # 1. Load the ontology
    # =========================================================================
    print("=== Loaded Ontology ===")
    labels = OntologyUserV1().get_labels()
    print(f"Loaded {len(labels)} labels from the default ontology")
    print()

    # =========================================================================
    # 2. Group labels by sensitivity tier
    # =========================================================================
    print("=== Labels by Sensitivity Tier ===")

    by_tier: dict[SensitivityTier, list[str]] = {}
    for label in labels:
        tier = label.sensitivity
        if tier not in by_tier:
            by_tier[tier] = []
        by_tier[tier].append(label.name)

    # Display in order from least to most sensitive
    tier_order = [
        SensitivityTier.TIER_PUBLIC,
        SensitivityTier.TIER_WORK,
        SensitivityTier.TIER_PERSONAL,
        SensitivityTier.TIER_SENSITIVE,
        SensitivityTier.TIER_INTERNAL,
    ]

    for tier in tier_order:
        tier_labels = by_tier.get(tier, [])
        print(f"\n  {tier.value} ({len(tier_labels)} labels):")
        for name in sorted(tier_labels)[:5]:
            label = next(l for l in labels if l.name == name)
            print(f"    - {name}: {label.description}")
        if len(tier_labels) > 5:
            print(f"    ... and {len(tier_labels) - 5} more")
    print()

    # =========================================================================
    # 3. Sensitivity hierarchy
    # =========================================================================
    print("=== Sensitivity Hierarchy ===")
    tier_names = [t.value for t in tier_order]
    print(f"  {' < '.join(tier_names)}")
    print()

    # =========================================================================
    # 4. Access policy example
    # =========================================================================
    print("=== Access Policy Example ===")
    print()

    # A vendor might have a policy: "Only share tier_public and tier_work labels"
    shareable_tiers = {SensitivityTier.TIER_PUBLIC, SensitivityTier.TIER_WORK}
    shareable = [l for l in labels if l.sensitivity in shareable_tiers]
    restricted = [l for l in labels if l.sensitivity not in shareable_tiers]

    print(f"  Shareable labels (public + work): {len(shareable)}")
    for l in sorted(shareable, key=lambda x: x.name)[:5]:
        print(f"    - {l.name} [{l.sensitivity.value}]")
    if len(shareable) > 5:
        print(f"    ... and {len(shareable) - 5} more")

    print(f"  Restricted labels (personal + sensitive + internal): {len(restricted)}")
    for l in sorted(restricted, key=lambda x: x.name)[:5]:
        print(f"    - {l.name} [{l.sensitivity.value}]")
    if len(restricted) > 5:
        print(f"    ... and {len(restricted) - 5} more")
    print()

    # =========================================================================
    # 5. Label metadata summary
    # =========================================================================
    print("=== Label Metadata Summary ===")
    print()

    categories = sorted({l.category for l in labels})
    print(f"  Categories: {', '.join(categories)}")

    singular = sum(1 for l in labels if l.cardinality == Cardinality.SINGULAR)
    plural = sum(1 for l in labels if l.cardinality == Cardinality.PLURAL)
    print(f"  Singular: {singular}, Plural: {plural}")

    permanent = sum(1 for l in labels if l.durability == Durability.PERMANENT)
    transient = sum(1 for l in labels if l.durability == Durability.TRANSIENT)
    ephemeral = sum(1 for l in labels if l.durability == Durability.EPHEMERAL)
    print(f"  Permanent: {permanent}, Transient: {transient}, Ephemeral: {ephemeral}")


if __name__ == "__main__":
    main()
