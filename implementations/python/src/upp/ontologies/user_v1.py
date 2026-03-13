"""UPP user/v1 Ontology — Loader and Implementation.

Provides :class:`OntologyUserV1`, an implementation of
:class:`~upp.backends.ontology.OntologyBackend` backed by
``ontologies/user/v1.json``.

Usage::

    from upp.ontologies.user_v1 import OntologyUserV1

    ontology = OntologyUserV1()
    all_labels = ontology.get_labels()
    label = ontology.get_label_by_name("who_name")
"""

from __future__ import annotations

import json
from pathlib import Path

from upp.backends.ontology import OntologyBackend
from upp.models.labels import LabelDefinition

__all__ = ["OntologyUserV1"]

#: Default path to the ontology file, resolved relative to this package.
_DEFAULT_ONTOLOGY_PATH = Path(__file__).resolve().parent.parent.parent.parent.parent.parent / "ontologies" / "user" / "v1.json"

# Module-level cache
_cached_labels: list[LabelDefinition] | None = None
_cached_labels_by_name: dict[str, LabelDefinition] | None = None


def _load_labels(path: Path | None = None) -> list[LabelDefinition]:
    """Load label definitions from the ontology JSON file.

    Args:
        path: Optional path to the ontology file.

    Returns:
        A list of :class:`LabelDefinition` objects.

    Raises:
        FileNotFoundError: If the ontology file does not exist.
        json.JSONDecodeError: If the file contains invalid JSON.
    """
    ontology_path = path or _DEFAULT_ONTOLOGY_PATH

    if not ontology_path.exists():
        raise FileNotFoundError(
            f"Default ontology file not found at {ontology_path}. Ensure the ontologies/user/v1.json file exists in the UPP repository root."
        )

    raw = json.loads(ontology_path.read_text(encoding="utf-8"))
    raw_labels = raw.get("labels", [])

    labels: list[LabelDefinition] = []

    # Support both array format and dict format
    if isinstance(raw_labels, list):
        for label_data in raw_labels:
            labels.append(LabelDefinition.model_validate(label_data))
    elif isinstance(raw_labels, dict):
        for key, label_data in raw_labels.items():
            if "name" not in label_data:
                label_data["name"] = key
            labels.append(LabelDefinition.model_validate(label_data))

    return labels


def _ensure_loaded() -> tuple[list[LabelDefinition], dict[str, LabelDefinition]]:
    """Ensure labels are loaded and cached.

    Returns:
        Tuple of (labels list, labels-by-name dict).
    """
    global _cached_labels, _cached_labels_by_name
    if _cached_labels is None:
        _cached_labels = _load_labels()
        _cached_labels_by_name = {label.name: label for label in _cached_labels}
    return _cached_labels, _cached_labels_by_name  # type: ignore[return-value]


class OntologyUserV1(OntologyBackend):
    """Ontology implementation backed by ontologies/user/v1.json."""

    def get_labels(self) -> list[LabelDefinition]:
        """Return all label definitions for the ontology."""
        labels, _ = _ensure_loaded()
        return list(labels)

    def get_label_by_name(self, name: str) -> LabelDefinition:
        """Get a label definition by its name.

        Args:
            name: The name of the label to retrieve.

        Returns:
            The :class:`LabelDefinition` with the specified name.

        Raises:
            KeyError: If no label with the given name exists.
        """
        _, labels_by_name = _ensure_loaded()
        if name not in labels_by_name:
            raise KeyError(f"Label with name '{name}' not found in ontology.")
        return labels_by_name[name]

    def get_version(self) -> str:
        """Return the ontology identifier for this server instance."""
        return "user/v1"
