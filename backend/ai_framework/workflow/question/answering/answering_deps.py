"""Dependencies configuration for question answering workflow agents.

This module defines AnsweringDeps, which provides database access, file storage,
and context for question answering agents.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from s3_service import S3Service

if TYPE_CHECKING:
    from ai.external_ai import ExternalAIService
    from requirements.crud.repository import RequirementRepository


@dataclass
class AnsweringDeps:
    """Dependencies for question answering workflow agents.

    Provides all necessary context for agents to search requirements and source documents,
    generate answers, and automatically link requirements to questions.

    Attributes:
        db_engine: SQLAlchemy engine for database operations
        s3_service: S3/MinIO service for file storage operations
        product_id: ID of the product this question belongs to
        organization_id: ID of the organization owning the question
        question_text: The actual question text to be answered
        search_count: Counter for tracking semantic search tool calls
        source_doc_search_count: Counter for tracking source document search tool calls
        total_tool_call_count: Counter for tracking all tool calls across all tools
    """

    MAX_SEARCH_CALLS: int = 3
    MAX_SOURCE_DOC_SEARCH_CALLS: int = 5
    MAX_TOTAL_TOOL_CALLS: int = 40

    db_engine: Engine
    s3_service: S3Service
    product_id: str
    organization_id: str
    question_text: str
    search_count: int = 0
    source_doc_search_count: int = 0
    total_tool_call_count: int = 0

    def create_requirement_repository(self, session: Session) -> RequirementRepository:
        """Create a RequirementRepository instance for the given session.

        Args:
            session: SQLAlchemy session to use for database operations

        Returns:
            RequirementRepository instance bound to the session
        """
        from requirements.crud.repository import RequirementRepository

        return RequirementRepository(session)

    def create_external_ai_service(self) -> ExternalAIService:
        """Create an ExternalAIService instance.

        Returns:
            ExternalAIService instance
        """
        from ai.external_ai import ExternalAIService

        return ExternalAIService()
