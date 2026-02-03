"""Dependencies configuration for question answering workflow agents.

This module defines AnsweringDeps, which provides database access and context
for question answering agents.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import ClassVar, TYPE_CHECKING
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

if TYPE_CHECKING:
    from ai.external_ai import ExternalAIService
    from requirements.crud.repository import RequirementRepository


@dataclass
class AnsweringDeps:
    """Dependencies for question answering workflow agents.

    Provides all necessary context for agents to search requirements,
    generate answers, and automatically link requirements to questions.

    Attributes:
        db_engine: SQLAlchemy engine for database operations
        product_id: ID of the product this question belongs to
        organization_id: ID of the organization owning the question
        question_text: The actual question text to be answered
        search_count: Counter for tracking semantic search tool calls
        total_tool_call_count: Counter for tracking all tool calls across all tools
    """

    MAX_SEARCH_CALLS: ClassVar[int] = 3
    MAX_TOTAL_TOOL_CALLS: ClassVar[int] = 40

    db_engine: Engine
    product_id: str
    organization_id: str
    question_text: str
    search_count: int = 0
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
