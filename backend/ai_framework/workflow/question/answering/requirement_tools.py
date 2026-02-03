"""Tool factories for requirement search operations in question answering workflow.

This module provides tool factory functions that create Pydantic AI tools
for searching requirements using semantic similarity.
"""

from contextlib import contextmanager
from typing import Awaitable, Callable
from pydantic_ai import RunContext
from sqlalchemy.orm import Session, sessionmaker

from ai_framework.workflow.question.answering.answering_deps import AnsweringDeps
from ai_framework.workflow.question.answering.models import (
    SearchResult,
    RequirementDetails,
)
from requirements.crud.repository import RequirementRepository
from ai.external_ai import ExternalAIService


@contextmanager
def create_repository_services(
    deps: AnsweringDeps,
) -> tuple[Session, RequirementRepository, ExternalAIService]:
    """Create database session and service instances from deps.

    This context manager manages the database session lifecycle and creates
    service instances using factory methods from AnsweringDeps. It ensures:
    - Session is properly closed on exit
    - Session is rolled back on error to prevent partial commits
    - All services share the same session for transaction consistency

    Args:
        deps: AnsweringDeps providing database engine and service factory methods

    Yields:
        Tuple of (session, requirement_repository, external_ai_service)

    Raises:
        Exception: Any exception from repository/service operations is re-raised
                   after rolling back the session

    Example:
        with create_repository_services(deps) as (session, req_repo, ai_service):
            results = await req_repo.search_semantic(...)
    """
    SessionLocal = sessionmaker(bind=deps.db_engine)
    session = SessionLocal()

    try:
        # Create services using deps factory methods
        # This delegates service creation logic to AnsweringDeps for better separation of concerns
        requirement_repo = deps.create_requirement_repository(session)
        external_ai_service = deps.create_external_ai_service()

        yield session, requirement_repo, external_ai_service

    except Exception:
        # Rollback any pending changes to maintain database consistency
        session.rollback()
        raise
    finally:
        # Always close the session to release database resources
        session.close()


def create_search_requirements_semantic_tool() -> Callable[
    [RunContext[AnsweringDeps], str, int], Awaitable[list[SearchResult]]
]:
    """
    Create a tool for searching requirements using semantic similarity.

    This tool allows the agent to search for requirements that are semantically
    similar to a query string. It uses vector embeddings and L2 distance to
    find the most relevant requirements.

    Returns:
        An async tool function that can be registered with an agent.
    """

    async def search_requirements_semantic(
        ctx: RunContext[AnsweringDeps],
        query: str,
        limit: int = 5,
    ) -> list[SearchResult]:
        """
        Search requirements by semantic similarity to a query string.

        This tool generates an embedding from the query text and finds requirements
        that are semantically similar using vector search. Results are ordered by
        relevance (highest percentage = most similar).

        Args:
            ctx: The run context containing AnsweringDeps
            query: The search query text (e.g., "authentication security")
            limit: Maximum number of results to return (default: 5)

        Returns:
            List of SearchResult objects with requirement_key, description, types,
            and similarity_score (percentage 0-100, where 100 = perfect match)
        """
        # Increment search counter for tracking tool usage
        ctx.deps.search_count += 1
        ctx.deps.total_tool_call_count += 1

        deps = ctx.deps

        # Create session and services with proper lifecycle management
        with create_repository_services(deps) as (
            _,
            requirement_repo,
            external_ai_service,
        ):
            # Search using semantic similarity with distances
            results_with_distances = (
                await requirement_repo.search_semantic_with_distances(
                    query=query,
                    product_id=deps.product_id,
                    external_ai_service=external_ai_service,
                    limit=limit,
                )
            )

            # Transform to SearchResult objects
            # Convert L2 distance to percentage: 0 distance = 100%, larger distance approaches 0%
            return [
                SearchResult(
                    requirement_key=req_dto.requirement_key,
                    description=req_dto.description,
                    types=req_dto.types,
                    similarity_score=int((1 / (1 + distance)) * 100),
                )
                for req_dto, distance in results_with_distances
            ]

    return search_requirements_semantic


def create_get_requirement_tool() -> Callable[
    [RunContext[AnsweringDeps], str], Awaitable[RequirementDetails | None]
]:
    """
    Create a tool for getting full requirement details by requirement_key.

    This tool allows the agent to retrieve complete requirement information including
    implementation details and verification information. It's useful when the agent
    needs more context beyond what search results provide.

    Returns:
        An async tool function that can be registered with an agent.
    """

    async def get_requirement(
        ctx: RunContext[AnsweringDeps],
        requirement_key: str,
    ) -> RequirementDetails | None:
        """
        Get full requirement details by requirement_key.

        This tool retrieves complete information about a specific requirement,
        including its description, types, implementation details, status, and
        verification information.

        Args:
            ctx: The run context containing AnsweringDeps
            requirement_key: The requirement identifier (e.g., "REQ-AUTH-001")

        Returns:
            RequirementDetails object with full requirement information, or None if not found
        """
        ctx.deps.total_tool_call_count += 1

        deps = ctx.deps

        # Create session and services with proper lifecycle management
        with create_repository_services(deps) as (
            _,
            requirement_repo,
            _,
        ):
            # Get requirement by key
            req_dto = requirement_repo.get_by_key(
                requirement_key=requirement_key,
                organization_id=deps.organization_id,
            )

            # Return None if requirement not found
            if req_dto is None:
                return None

            # Transform to RequirementDetails
            return RequirementDetails(
                requirement_key=req_dto.requirement_key,
                description=req_dto.description,
                types=req_dto.types,
                implementation_description=req_dto.implementation_description,
                implementation_status=req_dto.implementation_status,
                requirement_verification=req_dto.requirement_verification,
            )

    return get_requirement
