"""SQLAlchemy table definitions for products."""

from sqlalchemy import Column, String, DateTime, ForeignKey, Integer
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid6

from database import Base  # Import the shared Base


class ProductDB(Base):
    """SQLAlchemy model for the product table."""

    __tablename__ = "product"

    id = Column(UUID(as_uuid=False), primary_key=True, default=uuid6.uuid7, index=True)
    name = Column(String(255), nullable=False)
    organization_id = Column(
        UUID(as_uuid=False), ForeignKey("organization.id"), nullable=False
    )
    creation_date = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    product_key = Column(String(6), nullable=False, index=True)
    current_requirement_key_number = Column(Integer, nullable=False, server_default="1")
    current_requirement_document_key_number = Column(
        Integer, nullable=False, server_default="1"
    )
    current_questionnaire_key_number = Column(
        Integer, nullable=False, server_default="1"
    )
