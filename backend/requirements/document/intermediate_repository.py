"""Repository for intermediate extracted requirement in-memory operations during agent-to-agent extraction."""

from typing import Optional, List, Dict, Tuple
from datetime import datetime, timezone

from requirements.crud.models import (
    IntermediateExtractedRequirementCreate,
    IntermediateExtractedRequirementUpdate,
    IntermediateExtractedRequirementDto,
)


class IntermediateExtractedRequirementRepository:
    """Repository for handling intermediate extracted requirement in-memory operations.

    This repository stores requirements in memory during the extraction workflow,
    avoiding database round-trips and improving performance. Requirements are keyed
    by (document_id, order) tuple for fast lookup.
    """

    def __init__(self):
        """Initialize the in-memory repository with empty storage."""
        # Storage: key is (document_id, order), value is dict with all requirement data
        self.storage: Dict[Tuple[str, float], dict] = {}

    def _build_dto(self, req_data: dict) -> IntermediateExtractedRequirementDto:
        """Helper method to build DTO from in-memory requirement data.

        Note: The DTO exposes `order` (float) instead of internal keys to AI agents
        to reduce token usage and improve AI reasoning.

        Metadata like document_name, product_id, document_id, and organization_id are intentionally
        excluded from the DTO to reduce token usage - these are available in the context (ExtractionDeps).
        """
        return IntermediateExtractedRequirementDto(
            order=req_data["order"],
            description=req_data["description"],
            types=req_data["types"]
            or [],  # Handle None from updates that don't touch types
            requirement_verification=req_data.get("requirement_verification"),
            implementation_status=req_data.get("implementation_status"),
            implementation_description=req_data.get("implementation_description"),
            extraction_timestamp=req_data["extraction_timestamp"],
        )

    def create(
        self,
        requirement_data: IntermediateExtractedRequirementCreate,
        document_id: str,
        document_name: str,
        organization_id: str,
        product_id: str,
        order: float,
    ) -> IntermediateExtractedRequirementDto:
        """Create a new intermediate extracted requirement record in memory.

        Args:
            requirement_data: The requirement data to create (without metadata fields)
            document_id: The document ID this requirement belongs to
            document_name: The document name (provided by context, not exposed to AI)
            organization_id: The organization ID (provided by context, not exposed to AI)
            product_id: The product ID (provided by context, not exposed to AI)
            order: The order value (e.g., 1.0, 2.5, 3.0)

        Returns:
            The created requirement DTO (without metadata fields to reduce token usage)

        Raises:
            ValueError: If the order value already exists for this document
        """
        key = (document_id, order)

        if key in self.storage:
            raise ValueError(
                f"Requirement with order {order} already exists for document {document_id}"
            )

        # Store requirement data in memory
        req_dict = {
            "document_id": document_id,
            "document_name": document_name,
            "order": order,
            "description": requirement_data.description,
            "types": requirement_data.types,
            "requirement_verification": requirement_data.requirement_verification,
            "implementation_status": requirement_data.implementation_status,
            "implementation_description": requirement_data.implementation_description,
            "organization_id": organization_id,
            "product_id": product_id,
            "extraction_timestamp": datetime.now(timezone.utc),
        }

        self.storage[key] = req_dict
        return self._build_dto(req_dict)

    def get_by_order(
        self, document_id: str, order: float
    ) -> Optional[IntermediateExtractedRequirementDto]:
        """Get an intermediate extracted requirement by its order number.

        This is the AI-friendly method for retrieving requirements by their sequential order.

        Args:
            document_id: The document ID
            order: The order number (e.g., 1.0, 2.5, 3.0)

        Returns:
            The requirement DTO if found, None otherwise
        """
        key = (document_id, order)
        req_data = self.storage.get(key)

        if req_data is None:
            return None

        return self._build_dto(req_data)

    def get_by_document(
        self, document_id: str
    ) -> List[IntermediateExtractedRequirementDto]:
        """Get all intermediate extracted requirements for a specific document.

        Requirements are returned ordered by their `order` field (ascending),
        so the AI sees them in extraction sequence (1.0, 2.0, 2.5, 3.0, ...).

        Args:
            document_id: The document ID

        Returns:
            List of requirement DTOs ordered by order field
        """
        requirements = self._get_raw_by_document(document_id)
        return [self._build_dto(req) for req in requirements]

    def get_raw_by_document(self, document_id: str) -> List[dict]:
        """Get all intermediate extracted requirements for a document as raw dicts.

        Returns the full internal data including metadata fields (document_name,
        product_id, etc.) that are excluded from DTOs. Use this when you need
        to convert requirements to external formats.

        Args:
            document_id: The document ID

        Returns:
            List of requirement dicts ordered by order field
        """
        return self._get_raw_by_document(document_id)

    def _get_raw_by_document(self, document_id: str) -> List[dict]:
        """Internal helper to get raw requirement data for a document.

        Args:
            document_id: The document ID

        Returns:
            List of requirement dicts ordered by order field
        """
        # Filter requirements for this document and sort by order
        requirements = [
            req_data
            for (doc_id, _), req_data in self.storage.items()
            if doc_id == document_id
        ]

        # Sort by order field
        requirements.sort(key=lambda r: r["order"])

        return requirements

    def count_by_document(self, document_id: str) -> int:
        """Count the number of intermediate extracted requirements for a specific document.

        Args:
            document_id: The document ID

        Returns:
            Number of requirements for this document
        """
        return sum(1 for (doc_id, _) in self.storage.keys() if doc_id == document_id)

    def update_by_order(
        self,
        document_id: str,
        order: float,
        update_data: IntermediateExtractedRequirementUpdate,
    ) -> Optional[IntermediateExtractedRequirementDto]:
        """Update an intermediate extracted requirement by its order number.

        Args:
            document_id: The document ID
            order: The order number (e.g., 1.0, 2.5, 3.0)
            update_data: The update data

        Returns:
            The updated requirement DTO if found, None otherwise
        """
        key = (document_id, order)
        req_data = self.storage.get(key)

        if req_data is None:
            return None

        # Update fields from update_data (exclude None values)
        update_dict = update_data.model_dump(exclude_unset=True)

        for field, value in update_dict.items():
            req_data[field] = value

        return self._build_dto(req_data)

    def delete_by_order(self, document_id: str, order: float) -> bool:
        """Delete an intermediate extracted requirement by its order number.

        This is the AI-friendly method for deleting requirements by their sequential order.

        Args:
            document_id: The document ID
            order: The order number (e.g., 1.0, 2.5, 3.0)

        Returns:
            True if the requirement was deleted, False if not found
        """
        key = (document_id, order)

        if key not in self.storage:
            return False

        del self.storage[key]
        return True
