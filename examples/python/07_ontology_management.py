"""UPP Ontology Management — Loading and Querying Label Definitions.

Demonstrates how to work with UPP ontologies:
1. Loading the default ontology (user/v1)
2. Looking up labels by name
3. Browsing labels by category (5W+H)
4. Using OntologyUserV1 class for server integration
5. Querying the ontology version and label definitions

Ontologies define the set of labels available for classifying events.
The default ontology is user/v1, containing labels organized in
5W+H categories: WHO, WHAT, WHERE, WHEN, WHY, HOW, PREF, REL, META.

Expected output:
    === Default Ontology ===
    Loaded N labels from user/v1

    === Label Lookup ===
    who_name: Name (singular, permanent, tier_personal)
    what_skills: Skills (plural, transient, tier_work)
    ...

    === Labels by Category ===
    HOW (N labels): ...
    META (N labels): ...
    ...

    === OntologyUserV1 Class ===
    Ontology version: user/v1
    Total labels via get_labels(): N
    ...

    === Ontology Statistics ===
    Singular: N, Plural: N
    Permanent: N, Transient: N, Ephemeral: N
"""

from upp import Cardinality, Durability, SensitivityTier
from upp.ontologies.user_v1 import OntologyUserV1


def main() -> None:
    # =========================================================================
    # 1. Load the default ontology
    # =========================================================================
    print("=== Default Ontology ===")

    ontology = OntologyUserV1()
    labels = ontology.get_labels()
    print(f"Loaded {len(labels)} labels from user/v1")
    print()

    # =========================================================================
    # 2. Look up specific labels
    # =========================================================================
    print("=== Label Lookup ===")

    sample_labels = ["who_name", "what_skills", "where_home", "what_preferences", "who_languages"]
    for name in sample_labels:
        try:
            label = ontology.get_label_by_name(name)
        except KeyError:
            label = None
        if label:
            print(
                f"  {label.name}: {label.display_name} "
                f"({label.cardinality.value}, {label.durability.value}, "
                f"{label.sensitivity.value})"
            )
            if label.examples:
                print(f"    Examples: {', '.join(label.examples[:3])}")
        else:
            print(f"  {name}: NOT FOUND")
    print()

    # =========================================================================
    # 3. Browse by category
    # =========================================================================
    print("=== Labels by Category ===")

    categories: dict[str, list[str]] = {}
    for label in labels:
        cat = label.category
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(label.name)

    for cat in sorted(categories):
        names = sorted(categories[cat])
        preview = ", ".join(names[:3])
        suffix = f" ... +{len(names) - 3} more" if len(names) > 3 else ""
        print(f"  {cat} ({len(names)} labels): {preview}{suffix}")
    print()

    # =========================================================================
    # 4. Use OntologyUserV1 class (implements OntologyBackend)
    # =========================================================================
    print("=== OntologyUserV1 Class ===")

    # Ontology version (used by upp/info)
    version = ontology.get_version()
    print(f"  Ontology version: {version}")

    # Get all labels (used by upp/labels)
    all_labels = ontology.get_labels()
    print(f"  Total labels via get_labels(): {len(all_labels)}")

    # Look up a specific label
    who_name = ontology.get_label_by_name("who_name")
    print(f"  Lookup 'who_name': {who_name.display_name} — {who_name.description}")
    print()

    # =========================================================================
    # 5. Ontology statistics
    # =========================================================================
    print("=== Ontology Statistics ===")

    # Cardinality distribution
    singular = sum(1 for l in labels if l.cardinality == Cardinality.SINGULAR)
    plural = sum(1 for l in labels if l.cardinality == Cardinality.PLURAL)
    print(f"  Singular: {singular}, Plural: {plural}")

    # Durability distribution
    permanent = sum(1 for l in labels if l.durability == Durability.PERMANENT)
    transient = sum(1 for l in labels if l.durability == Durability.TRANSIENT)
    ephemeral = sum(1 for l in labels if l.durability == Durability.EPHEMERAL)
    print(f"  Permanent: {permanent}, Transient: {transient}, Ephemeral: {ephemeral}")

    # Sensitivity distribution
    print("  Sensitivity distribution:")
    for tier in SensitivityTier:
        count = sum(1 for l in labels if l.sensitivity == tier)
        print(f"    {tier.value}: {count}")


if __name__ == "__main__":
    main()
