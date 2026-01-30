"""Repository for requirement-question link operations."""

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .models import RequirementQuestionLink, RequirementQuestionLinkCreate
from .tables import RequirementQuestionLinkDB


class RequirementQuestionLinkRepository:
    """Repository for managing requirement-question links."""

    def __init__(self, db: Session):
        self.db = db

    def create_link(
        self, link: RequirementQuestionLinkCreate
    ) -> RequirementQuestionLink:
        """Create a single requirement-question link."""
        try:
            db_link = RequirementQuestionLinkDB(
                requirement_id=link.requirement_id, question_id=link.question_id
            )
            self.db.add(db_link)
            self.db.commit()
            self.db.refresh(db_link)
            return RequirementQuestionLink.model_validate(db_link)
        except IntegrityError as e:
            self.db.rollback()
            raise ValueError("Link already exists or invalid foreign key") from e

    def create_links_for_question(
        self, question_id: str, requirement_ids: list[str]
    ) -> list[RequirementQuestionLink]:
        """Create multiple requirement-question links for a single question."""
        try:
            # First, delete existing links for this question
            self.delete_links_for_question(question_id)

            # Create new links
            db_links = []
            for req_id in requirement_ids:
                db_link = RequirementQuestionLinkDB(
                    requirement_id=req_id, question_id=question_id
                )
                db_links.append(db_link)

            self.db.add_all(db_links)
            self.db.commit()

            # Refresh and return
            for db_link in db_links:
                self.db.refresh(db_link)

            return [
                RequirementQuestionLink.model_validate(db_link) for db_link in db_links
            ]
        except IntegrityError as e:
            self.db.rollback()
            raise ValueError("Invalid requirement ID or question ID") from e

    def get_requirement_ids_for_question(self, question_id: str) -> list[str]:
        """Get all requirement IDs linked to a specific question."""
        links = (
            self.db.query(RequirementQuestionLinkDB)
            .filter(RequirementQuestionLinkDB.question_id == question_id)
            .all()
        )
        return [link.requirement_id for link in links]

    def get_question_ids_for_requirement(self, requirement_id: str) -> list[str]:
        """Get all question IDs linked to a specific requirement."""
        links = (
            self.db.query(RequirementQuestionLinkDB)
            .filter(RequirementQuestionLinkDB.requirement_id == requirement_id)
            .all()
        )
        return [link.question_id for link in links]

    def get_links_for_question(self, question_id: str) -> list[RequirementQuestionLink]:
        """Get all links for a specific question."""
        links = (
            self.db.query(RequirementQuestionLinkDB)
            .filter(RequirementQuestionLinkDB.question_id == question_id)
            .all()
        )
        return [RequirementQuestionLink.model_validate(link) for link in links]

    def delete_link(self, requirement_id: str, question_id: str) -> bool:
        """Delete a specific requirement-question link."""
        link = (
            self.db.query(RequirementQuestionLinkDB)
            .filter(
                RequirementQuestionLinkDB.requirement_id == requirement_id,
                RequirementQuestionLinkDB.question_id == question_id,
            )
            .first()
        )

        if link:
            self.db.delete(link)
            self.db.commit()
            return True
        return False

    def delete_links_for_question(self, question_id: str) -> int:
        """Delete all links for a specific question. Returns number of deleted links."""
        deleted_count = (
            self.db.query(RequirementQuestionLinkDB)
            .filter(RequirementQuestionLinkDB.question_id == question_id)
            .delete()
        )
        self.db.commit()
        return deleted_count
