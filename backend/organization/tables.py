"""SQLAlchemy table definitions for organizations."""

from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid6

from database import Base  # Import the shared Base


class OrganizationDB(Base):
    """SQLAlchemy model for the organization table."""

    __tablename__ = "organization"

    id = Column(UUID(as_uuid=False), primary_key=True, default=uuid6.uuid7, index=True)
    name = Column(String(255), nullable=False)
    creation_date = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
