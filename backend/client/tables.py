"""SQLAlchemy table definitions for clients."""

from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid6

from database import Base  # Import the shared Base


class ClientDB(Base):
    """SQLAlchemy model for the client table."""

    __tablename__ = "client"

    id = Column(UUID(as_uuid=False), primary_key=True, default=uuid6.uuid7, index=True)
    organization_id = Column(
        UUID(as_uuid=False), ForeignKey("organization.id"), nullable=False, index=True
    )
    name = Column(String(255), nullable=False)
    key = Column(String(6), nullable=False, index=True)
    creation_date = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
