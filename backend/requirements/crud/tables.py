"""SQLAlchemy models for requirement-related tables."""

from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    ForeignKey,
    Index,
    JSON,
    UniqueConstraint,
    REAL,
)
from sqlalchemy.sql import func
import uuid6
from sqlalchemy.dialects.postgresql import UUID

from pgvector.sqlalchemy import Vector

from database import Base  # Import the shared Base
from ai.external_ai import EMBEDDING_DIM


class RequirementDB(Base):
    """SQLAlchemy model for the 'requirement' table."""

    __tablename__ = "requirement"

    id = Column(UUID(as_uuid=False), primary_key=True, index=True, default=uuid6.uuid7)
    description = Column(Text, nullable=True)
    embedding = Column(Vector(EMBEDDING_DIM), nullable=True)
    requirement_verification = Column(Text, nullable=True)
    implementation_description = Column(Text, nullable=True)
    implementation_status = Column(String, nullable=True)
    product_id = Column(
        UUID(as_uuid=False),
        ForeignKey("product.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    organization_id = Column(
        UUID(as_uuid=False),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    requirement_key = Column(String(32), nullable=True, index=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index(
            "idx_requirement_embedding",
            embedding,
            postgresql_using="ivfflat",
            postgresql_with={"lists": 100},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
        UniqueConstraint(
            "organization_id", "requirement_key", name="uq_requirement_org_key"
        ),
    )

    def __repr__(self):
        """Return a string representation of the RequirementDB instance."""
        return f"<RequirementDB(id={self.id})>"


class RequirementTypeDB(Base):
    """SQLAlchemy model for the 'requirement_type' table."""

    __tablename__ = "requirement_type"

    requirement_id = Column(
        UUID(as_uuid=False),
        ForeignKey("requirement.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    type = Column(String, primary_key=True, nullable=False)

    def __repr__(self):
        """Return a string representation of the RequirementTypeDB instance."""
        return f"<RequirementTypeDB(requirement_id={self.requirement_id}, type='{self.type}')>"


class RequirementHistoryDB(Base):
    """SQLAlchemy model for the 'requirement_history' table."""

    __tablename__ = "requirement_history"

    id = Column(UUID(as_uuid=False), primary_key=True, index=True, default=uuid6.uuid7)
    requirement_id = Column(
        UUID(as_uuid=False),
        ForeignKey("requirement.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id = Column(
        UUID(as_uuid=False),
        ForeignKey("product.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    change_type = Column(String(50), nullable=False)  # e.g., CREATE, UPDATE, DELETE
    previous_description = Column(Text, nullable=True)
    previous_types = Column(JSON, nullable=True)  # Store array of types
    previous_requirement_verification = Column(Text, nullable=True)
    previous_implementation_description = Column(Text, nullable=True)
    previous_implementation_status = Column(String, nullable=True)
    new_description = Column(Text, nullable=True)
    new_types = Column(JSON, nullable=True)  # Store array of types
    new_requirement_verification = Column(Text, nullable=True)
    new_implementation_description = Column(Text, nullable=True)
    new_implementation_status = Column(String, nullable=True)
    change_timestamp = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    user_id = Column(String, nullable=True)  # Optional: ID of user making the change

    def __repr__(self):
        """Return a string representation of the RequirementHistoryDB instance."""
        return f"<RequirementHistoryDB(id={self.id}, req_id={self.requirement_id}, type='{self.change_type}')>"


class ExtractedRequirementTypeDB(Base):
    """SQLAlchemy model for the 'extracted_requirement_type' table."""

    __tablename__ = "extracted_requirement_type"

    extracted_requirement_id = Column(
        UUID(as_uuid=False),
        ForeignKey("extracted_requirement.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    type = Column(String, primary_key=True, nullable=False)

    def __repr__(self):
        """Return a string representation of the ExtractedRequirementTypeDB instance."""
        return f"<ExtractedRequirementTypeDB(extracted_requirement_id={self.extracted_requirement_id}, type='{self.type}')>"


class ExtractedRequirementDB(Base):
    """SQLAlchemy model for the 'extracted_requirement' table."""

    __tablename__ = "extracted_requirement"

    id = Column(UUID(as_uuid=False), primary_key=True, default=uuid6.uuid7)
    document_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    # requirement_type column removed - now handled by extracted_requirement_type table
    requirement_verification = Column(Text, nullable=True)
    implementation_status = Column(String(100), nullable=True)
    implementation_description = Column(Text, nullable=True)
    extraction_timestamp = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    document_id = Column(
        UUID(as_uuid=False),
        ForeignKey("requirement_document.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    organization_id = Column(
        UUID(as_uuid=False),
        ForeignKey("organization.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id = Column(
        UUID(as_uuid=False),
        ForeignKey("product.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    order = Column(REAL, nullable=False)

    __table_args__ = (
        Index("idx_extracted_requirement_org_product", organization_id, product_id),
        UniqueConstraint(
            "document_id", "order", name="extracted_requirement_document_order_unique"
        ),
    )

    def __repr__(self):
        """Return a string representation of the ExtractedRequirementDB instance."""
        return f"<ExtractedRequirementDB(id={self.id}, document_name='{self.document_name}')>"
