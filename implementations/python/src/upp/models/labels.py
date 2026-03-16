"""UPP Label Definition Model.

Defines the :class:`LabelDefinition` model — the fundamental unit of the
UPP ontology taxonomy. Labels categorize personal facts using the 5W+H
framework (Who, What, Where, When, Why, How) plus Preferences, Relationships,
and Meta categories.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from upp.models.enums import Cardinality, Durability, SensitivityTier

__all__ = [
    "LabelDefinition",
]


class LabelDefinition(BaseModel):
    """Schema definition for a single ontology label.

    A ``LabelDefinition`` describes a category of personal fact in the
    UPP taxonomy, including its privacy sensitivity, cardinality
    (singular vs. plural), and expected durability.

    Attributes:
        name: Machine-readable label key (e.g., ``"who_name"``).
        display_name: Human-readable name (e.g., ``"Name"``).
        description: Concise description of what this label captures.
        category: Top-level grouping (WHO, WHAT, WHERE, WHEN, WHY, HOW, PREF, REL, META).
        sensitivity: Privacy sensitivity tier.
        cardinality: Whether the label accepts one or many values.
        durability: Expected lifespan of facts under this label.
        examples: Optional example values to guide classification.
    """

    model_config = {"frozen": True}

    name: str = Field(
        description="Machine-readable label key (e.g., 'who_name').",
    )
    display_name: str = Field(
        description="Human-readable name (e.g., 'Name').",
    )
    description: str = Field(
        description="Concise description of what this label captures.",
    )
    classification_guidance: str | None = Field(
        default=None,
        description="Classification and disambiguation guidance for label extraction.",
    )
    category: str = Field(
        description=("Top-level grouping defined by the ontology (e.g., user/v1 uses WHO, WHAT, WHERE, etc.)."),
    )
    sensitivity: SensitivityTier = Field(
        description="Privacy sensitivity tier.",
    )
    cardinality: Cardinality = Field(
        description="Whether the label accepts one value (singular) or many (plural).",
    )
    durability: Durability = Field(
        description="Expected lifespan: permanent, transient, or ephemeral.",
    )
    examples: list[str] = Field(
        description="Example values to guide classification and extraction.",
    )
    anti_examples: list[str] | None = Field(
        default=None,
        description="Counter-examples to clarify label boundaries and prevent misclassification.",
    )
