"""UPP Ontology Backend Protocol.

Defines the :class:`OntologyBackend` protocol for accessing ontology
metadata, label definitions, and server information.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from upp.models.labels import LabelDefinition

__all__ = [
    "OntologyBackend",
]


@runtime_checkable
class OntologyBackend(Protocol):
    """Protocol for pluggable ontology backends.

    An ontology backend provides access to label definitions, the
    ontology identifier, and server information for the ``upp/info``
    operation.
    """

    def get_labels(self) -> list[LabelDefinition]:
        """Return all label definitions for the ontology.

        Returns:
            A list of :class:`LabelDefinition` objects.
        """
        ...

    def get_version(self) -> str:
        """Return the ontology identifier for this server instance.

        Returns:
            The ontology identifier string (e.g., ``"user/v1"``).
        """
        ...
