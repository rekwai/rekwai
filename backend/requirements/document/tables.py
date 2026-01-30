"""SQLAlchemy models for requirement document-related tables."""

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Index,
    UniqueConstraint,
)
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID

from database import Base  # Import the shared Base


class RequirementDocumentDB(Base):
    """SQLAlchemy model for the 'requirement_document' table."""

    __tablename__ = "requirement_document"

    id = Column(UUID(as_uuid=False), primary_key=True)
    s3_object_key = Column(String(500), nullable=False)
    organization_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    product_id = Column(
        UUID(as_uuid=False),
        ForeignKey("product.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    original_filename = Column(String(255), nullable=False)
    file_extension = Column(String(10), nullable=False)
    content_size_bytes = Column(Integer, nullable=False)
    document_key = Column(String(32), nullable=False, index=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("idx_requirement_document_org_product", organization_id, product_id),
        UniqueConstraint(
            "organization_id", "document_key", name="uq_requirement_document_org_key"
        ),
    )

    def __repr__(self):
        """Return a string representation of the RequirementDocumentDB instance."""
        return f"<RequirementDocumentDB(id='{self.id}', s3_object_key='{self.s3_object_key}')>"
