"""SQLAlchemy models for requirement-extraction linking table."""

from sqlalchemy import Column, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class RequirementExtractionLinkDB(Base):
    """SQLAlchemy model for the requirement_link_extraction table."""

    __tablename__ = "requirement_link_extraction"

    requirement_id = Column(
        UUID(as_uuid=False),
        ForeignKey("requirement.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    extracted_requirement_id = Column(
        UUID(as_uuid=False),
        ForeignKey("extracted_requirement.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    link_type = Column(String(20), nullable=True)  # attach, merge, create

    # Add indexes for better query performance
    __table_args__ = (
        Index("idx_requirement_link_extraction_requirement_id", requirement_id),
        Index(
            "idx_requirement_link_extraction_extracted_requirement_id",
            extracted_requirement_id,
        ),
    )

    def __repr__(self):
        """Representation of a RequirementExtractionLinkDB object."""
        return f"<RequirementExtractionLinkDB(requirement_id={self.requirement_id}, extracted_requirement_id={self.extracted_requirement_id})>"
