"""Tests for the OntologyUserV1 implementation."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from upp.backends.ontology import OntologyBackend
from upp.models.enums import Cardinality, Durability, SensitivityTier
from upp.models.labels import LabelDefinition
from upp.ontologies.user_v1 import OntologyUserV1, _load_labels


class TestOntologyUserV1GetLabels:
    """Tests for OntologyUserV1.get_labels()."""

    def test_loads_labels(self) -> None:
        labels = OntologyUserV1().get_labels()
        assert isinstance(labels, list)
        assert len(labels) > 0

    def test_all_are_label_definitions(self) -> None:
        labels = OntologyUserV1().get_labels()
        for label in labels:
            assert isinstance(label, LabelDefinition)

    def test_labels_have_required_fields(self) -> None:
        labels = OntologyUserV1().get_labels()
        for label in labels:
            assert label.name
            assert label.display_name
            assert label.description
            assert label.category
            assert isinstance(label.sensitivity, SensitivityTier)
            assert isinstance(label.cardinality, Cardinality)
            assert isinstance(label.durability, Durability)

    def test_label_count(self) -> None:
        labels = OntologyUserV1().get_labels()
        assert len(labels) >= 50

    def test_categories_present(self) -> None:
        labels = OntologyUserV1().get_labels()
        categories = {label.category for label in labels}
        assert "WHO" in categories
        assert "WHAT" in categories
        assert "WHERE" in categories

    def test_all_sensitivity_values_are_valid(self) -> None:
        labels = OntologyUserV1().get_labels()
        valid_tiers = set(SensitivityTier)
        for label in labels:
            assert label.sensitivity in valid_tiers

    def test_all_cardinality_values_are_valid(self) -> None:
        labels = OntologyUserV1().get_labels()
        valid_cardinalities = set(Cardinality)
        for label in labels:
            assert label.cardinality in valid_cardinalities

    def test_all_durability_values_are_valid(self) -> None:
        labels = OntologyUserV1().get_labels()
        valid_durabilities = set(Durability)
        for label in labels:
            assert label.durability in valid_durabilities

    def test_no_duplicate_label_names(self) -> None:
        labels = OntologyUserV1().get_labels()
        names = [label.name for label in labels]
        assert len(names) == len(set(names)), "Duplicate label names found"


class TestOntologyUserV1GetLabelByName:
    """Tests for OntologyUserV1.get_label_by_name()."""

    def test_existing_label(self) -> None:
        label = OntologyUserV1().get_label_by_name("who_name")
        assert label.name == "who_name"
        assert isinstance(label, LabelDefinition)

    def test_nonexistent_label_raises(self) -> None:
        with pytest.raises(KeyError):
            OntologyUserV1().get_label_by_name("nonexistent_label_xyz")


class TestOntologyUserV1GetVersion:
    """Tests for OntologyUserV1.get_version()."""

    def test_returns_version_string(self) -> None:
        version = OntologyUserV1().get_version()
        assert version == "user/v1"


class TestOntologyUserV1Protocol:
    """Tests for OntologyBackend protocol conformance."""

    def test_implements_ontology_backend(self) -> None:
        ontology = OntologyUserV1()
        assert isinstance(ontology, OntologyBackend)


class TestLoadLabels:
    """Tests for _load_labels edge cases."""

    def test_file_not_found(self) -> None:
        with pytest.raises(FileNotFoundError, match="Default ontology file not found"):
            _load_labels(Path("/nonexistent/path/to/ontology.json"))

    def test_dict_format_labels(self, tmp_path: Path) -> None:
        ontology_data = {
            "labels": {
                "test_label": {
                    "display_name": "Test Label",
                    "description": "A test label",
                    "category": "WHO",
                    "sensitivity": "tier_public",
                    "cardinality": "singular",
                    "durability": "permanent",
                    "examples": ["example value"],
                }
            }
        }
        ontology_file = tmp_path / "ontology.json"
        ontology_file.write_text(json.dumps(ontology_data))

        labels = _load_labels(ontology_file)
        assert len(labels) == 1
        assert labels[0].name == "test_label"

    def test_dict_format_labels_with_name_key(self, tmp_path: Path) -> None:
        ontology_data = {
            "labels": {
                "dict_key": {
                    "name": "explicit_name",
                    "display_name": "Test",
                    "description": "Test",
                    "category": "WHO",
                    "sensitivity": "tier_public",
                    "cardinality": "singular",
                    "durability": "permanent",
                    "examples": ["example value"],
                }
            }
        }
        ontology_file = tmp_path / "ontology.json"
        ontology_file.write_text(json.dumps(ontology_data))

        labels = _load_labels(ontology_file)
        assert len(labels) == 1
        assert labels[0].name == "explicit_name"
