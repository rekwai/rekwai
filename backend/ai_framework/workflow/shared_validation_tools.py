"""Shared validation tools for extraction workflows.

This module provides a generic factory for document-level validation tools
that can be used by both question and requirement extraction workflows.

The validation workflow includes:
- validate_document_level: Document-level validation (completeness + duplicates)
"""

from typing import Awaitable, Callable, TypeVar

from pydantic_ai import Agent, RunContext

from ai_framework.agent_utils import run_agent_with_retry

T = TypeVar("T")


def create_validate_document_level_tool(
    completeness_agent_factory: Callable[[], Agent],
    duplicate_agent_factory: Callable[[], Agent],
    completeness_prompt_builder: Callable[[RunContext[T]], str],
    duplicate_prompt_builder: Callable[[RunContext[T]], str],
) -> Callable[[RunContext[T]], Awaitable[dict]]:
    """
    Create a tool for document-level validation (completeness + duplicates).

    This is a generic factory that works for both question and requirement
    extraction workflows. The specific agents and prompts are injected as parameters.

    This tool runs two document-level validation agents in parallel:
    1. Completeness Agent: Identifies items in document that weren't extracted
    2. Duplicate Detection Agent: Finds duplicate or similar items in extraction

    Unlike the full validation workflow, this tool returns raw results directly
    without coordinator aggregation, allowing the extraction agent to handle
    feedback immediately.

    Args:
        completeness_agent_factory: Function that creates a completeness validation agent
        duplicate_agent_factory: Function that creates a duplicate detection agent
        completeness_prompt_builder: Function that builds the prompt for completeness agent from context
        duplicate_prompt_builder: Function that builds the prompt for duplicate agent from context

    Returns:
        An async tool function that can be registered with an agent.

    Example:
        >>> from ai_framework.workflow.question.extraction.agents.coverage_validation_agents import (
        ...     create_completeness_agent,
        ...     create_duplicate_detection_agent,
        ... )
        >>> tool = create_validate_document_level_tool(
        ...     completeness_agent_factory=create_completeness_agent,
        ...     duplicate_agent_factory=create_duplicate_detection_agent,
        ...     completeness_prompt_builder=lambda ctx: f"Check completeness\\n{format_data(ctx.deps)}",
        ...     duplicate_prompt_builder=lambda ctx: f"Check duplicates\\n{format_data(ctx.deps)}",
        ... )
    """

    async def validate_document_level(
        ctx: RunContext[T],
    ) -> dict:
        """
        Validate extraction completeness and detect duplicates.

        This tool performs document-level validation on the extraction:
        - Completeness: Checks if all items from the document were extracted
        - Duplicates: Finds duplicate or semantically similar items in extraction

        Use this tool after completing individual item extraction to:
        - Find items that weren't extracted (missing items)
        - Detect duplicate extractions (duplicate_groups)

        Args:
            ctx: The run context containing extraction deps

        Returns:
            Dict with two keys:
            - completeness: CompletenessResult with missing items
            - duplicates: DuplicateDetectionResult with duplicate_groups
        """
        # Create both validation agents
        completeness_agent = completeness_agent_factory()
        duplicate_agent = duplicate_agent_factory()

        # Get cancellation_check from deps (available in both ExtractionDeps types)
        cancellation_check = getattr(ctx.deps, "cancellation_check", None)

        # Check for cancellation before running sub-agents
        if cancellation_check:
            cancellation_check()

        # Run sequentially: completeness first (creates missing items),
        # then duplicate detection (checks all items including newly created)
        completeness_result = await run_agent_with_retry(
            completeness_agent,
            completeness_prompt_builder(ctx),
            deps=ctx.deps,
            cancellation_check=cancellation_check,
        )

        # Check for cancellation before running duplicate agent
        if cancellation_check:
            cancellation_check()

        duplicate_result = await run_agent_with_retry(
            duplicate_agent,
            duplicate_prompt_builder(ctx),
            deps=ctx.deps,
            cancellation_check=cancellation_check,
        )

        # Return raw results directly (no coordinator)
        # Convert Pydantic models to dicts for proper serialization
        # Each workflow's agents have different output models, so keep this generic
        return {
            "completeness": completeness_result.output.model_dump(),
            "duplicates": duplicate_result.output.model_dump(),
        }

    return validate_document_level
