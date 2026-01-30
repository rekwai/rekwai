"""SQLAlchemy models for the questionnaire and questionnaire question tables."""

import enum
import uuid6
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    REAL,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID

# Import the shared Base from the central database module
from database import Base


class ReviewStatusEnum(str, enum.Enum):
    """Enum for review status to ensure consistency.

    Note: Ensure this enum definition matches any potential enum type created in the DB by V14 migration.
    """

    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    modified = "modified"


class QuestionnaireQuestionDB(Base):
    """SQLAlchemy model for the questionnaire_question table."""

    __tablename__ = "questionnaire_question"

    id = Column(UUID(as_uuid=False), primary_key=True, default=uuid6.uuid7)
    questionnaire_id = Column(
        UUID(as_uuid=False), ForeignKey("questionnaire.id"), nullable=False
    )
    question_text = Column(Text, nullable=False)
    status = Column(
        String(50), nullable=False, default="extracted"
    )  # Overall status (e.g., extracted, answered, reviewed, rejected)
    generated_answer = Column(Text, nullable=True)
    reviewed_answer = Column(Text, nullable=True)
    review_status = Column(
        SQLEnum(ReviewStatusEnum, name="review_status_enum", create_type=False),
        nullable=True,
        default=ReviewStatusEnum.pending,
    )
    extraction_timestamp = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    generation_timestamp = Column(DateTime(timezone=True), nullable=True)
    review_timestamp = Column(DateTime(timezone=True), nullable=True)
    order = Column(REAL, nullable=False)
    answer_type = Column(String(10), nullable=True)  # yes, no, n/a, or NULL

    __table_args__ = (
        UniqueConstraint(
            "questionnaire_id",
            "order",
            name="questionnaire_question_questionnaire_order_unique",
        ),
    )

    def __repr__(self):
        """Representation of a QuestionnaireQuestionDB object."""
        return f"<QuestionnaireQuestionDB(id={self.id}, status='{self.status}')>"


class QuestionnaireDB(Base):
    """SQLAlchemy model for the questionnaire table."""

    __tablename__ = "questionnaire"

    id = Column(UUID(as_uuid=False), primary_key=True, index=True, default=uuid6.uuid7)
    file_name = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    s3_object_key = Column(String, nullable=False, unique=True)
    product_id = Column(
        UUID(as_uuid=False),
        ForeignKey("product.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    organization_id = Column(
        UUID(as_uuid=False),
        nullable=False,
        index=True,
    )
    upload_timestamp = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    upload_status = Column(String(50), nullable=False, default="uploaded")
    client_id = Column(
        UUID(as_uuid=False),
        ForeignKey("client.id"),
        nullable=False,
        index=True,
    )
    key = Column(String(255), nullable=True, index=True)

    def __repr__(self):
        """Representation of a QuestionnaireDB object."""
        return f"<QuestionnaireDB(id={self.id}, file_name='{self.file_name}')>"
