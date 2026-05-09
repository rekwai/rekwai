"""Repository for requirement-extraction link operations."""

from typing import List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from .tables import RequirementExtractionLinkDB
from .models import RequirementExtractionLink, RequirementExtractionLinkCreate


class RequirementExtractionLinkRepository:
    """Repository for managing requirement-extraction links."""

    def __init__(self, db: Session):
        self.db = db

    def create_link(
        self, link: RequirementExtractionLinkCreate, commit: bool = True
    ) -> RequirementExtractionLink:
        """Create a single requirement-extraction link."""
        try:
            db_link = RequirementExtractionLinkDB(
                requirement_id=link.requirement_id,
                extracted_requirement_id=link.extracted_requirement_id,
                link_type=link.link_type,
            )
            self.db.add(db_link)
            self.db.flush()
            if commit:
                self.db.commit()
            self.db.refresh(db_link)
            return RequirementExtractionLink.model_validate(db_link)
        except IntegrityError:
            self.db.rollback()
            raise ValueError("Link already exists or invalid foreign key")

    def get_requirement_ids_for_extracted_requirement(
        self, extracted_requirement_id: str
    ) -> List[str]:
        """Get all requirement IDs linked to a specific extracted requirement."""
        links = (
            self.db.query(RequirementExtractionLinkDB)
            .filter(
                RequirementExtractionLinkDB.extracted_requirement_id
                == extracted_requirement_id
            )
            .all()
        )
        return [link.requirement_id for link in links]

    def get_extracted_requirement_ids_for_requirement(
        self, requirement_id: str
    ) -> List[str]:
        """Get all extracted requirement IDs linked to a specific requirement."""
        links = (
            self.db.query(RequirementExtractionLinkDB)
            .filter(RequirementExtractionLinkDB.requirement_id == requirement_id)
            .all()
        )
        return [link.extracted_requirement_id for link in links]

    def get_links_for_extracted_requirement(
        self, extracted_requirement_id: str
    ) -> list[RequirementExtractionLinkDB]:
        """Get all links for a specific extracted requirement."""
        return (
            self.db.query(RequirementExtractionLinkDB)
            .filter(
                RequirementExtractionLinkDB.extracted_requirement_id
                == extracted_requirement_id
            )
            .all()
        )

    def delete_link(self, requirement_id: str, extracted_requirement_id: str) -> bool:
        """Delete a specific requirement-extraction link."""
        link = (
            self.db.query(RequirementExtractionLinkDB)
            .filter(
                RequirementExtractionLinkDB.requirement_id == requirement_id,
                RequirementExtractionLinkDB.extracted_requirement_id
                == extracted_requirement_id,
            )
            .first()
        )

        if link:
            self.db.delete(link)
            self.db.commit()
            return True
        return False

    def delete_links_for_extracted_requirement(
        self, extracted_requirement_id: str
    ) -> int:
        """Delete all links for a specific extracted requirement. Returns number of deleted links."""
        deleted_count = (
            self.db.query(RequirementExtractionLinkDB)
            .filter(
                RequirementExtractionLinkDB.extracted_requirement_id
                == extracted_requirement_id
            )
            .delete()
        )
        self.db.commit()
        return deleted_count

    def count_linked_extracted_requirements_for_document(self, document_id: str) -> int:
        """Count how many extracted requirements from a document have at least one link."""
        from ..crud.tables import ExtractedRequirementDB

        # Count distinct extracted_requirement_ids that have links and belong to this document
        count = (
            self.db.query(RequirementExtractionLinkDB.extracted_requirement_id)
            .join(
                ExtractedRequirementDB,
                ExtractedRequirementDB.id
                == RequirementExtractionLinkDB.extracted_requirement_id,
            )
            .filter(ExtractedRequirementDB.document_id == document_id)
            .distinct()
            .count()
        )
        return count
