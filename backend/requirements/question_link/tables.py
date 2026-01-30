"""SQLAlchemy models for requirement-question linking table."""

from sqlalchemy import Column, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class RequirementQuestionLinkDB(Base):
    """SQLAlchemy model for the requirement_link_question table."""

    __tablename__ = "requirement_link_question"

    requirement_id = Column(
        UUID(as_uuid=False),
        ForeignKey("requirement.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    question_id = Column(
        UUID(as_uuid=False),
        ForeignKey("questionnaire_question.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )

    # Add indexes for better query performance (these match the migration)
    __table_args__ = (
        Index("idx_requirement_link_question_requirement_id", requirement_id),
        Index("idx_requirement_link_question_question_id", question_id),
    )

    def __repr__(self):
        """Representation of a RequirementQuestionLinkDB object."""
        return f"<RequirementQuestionLinkDB(requirement_id={self.requirement_id}, question_id={self.question_id})>"
