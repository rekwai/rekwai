"""Validation tools for extracted requirements in extraction workflow.

This module provides Pydantic AI tools for document-level validation.

The validation workflow includes:
- validate_document_level: Document-level validation (completeness + duplicates)

Note: Individual requirement validation (quality + type) happens inline during
create_requirement and update_requirement tool calls.
"""

from typing import Awaitable, Callable

from pydantic_ai import RunContext

from ai_framework.workflow.requirement.extraction.agents.coverage_validation_agents import (
    create_completeness_agent,
    create_duplicate_detection_agent,
)
from ai_framework.workflow.requirement.extraction.context_helpers import (
    format_requirements_for_context,
    format_document_for_context,
)
from ai_framework.workflow.requirement.extraction.extraction_deps import ExtractionDeps
from ai_framework.workflow.shared_validation_tools import (
    create_validate_document_level_tool as create_generic_validate_tool,
)


def _build_completeness_prompt(ctx: RunContext[ExtractionDeps]) -> str:
    """Build completeness prompt with requirements and document content."""
    reqs = format_requirements_for_context(ctx.deps)
    doc = format_document_for_context(ctx.deps)
    return f"""Check if all requirements from the document have been extracted.

{reqs}

{doc}"""


def _build_duplicate_prompt(ctx: RunContext[ExtractionDeps]) -> str:
    """Build duplicate detection prompt with requirements."""
    reqs = format_requirements_for_context(ctx.deps)
    return f"""Check for duplicate or semantically similar requirements in the extraction.

{reqs}"""


def create_validate_document_level_tool() -> Callable[
    [RunContext[ExtractionDeps]], Awaitable[dict]
]:
    """
    Create a tool for document-level validation (completeness + duplicates).

    This tool runs two document-level validation agents sequentially:
    1. Completeness Agent: Identifies requirements in document that weren't extracted
    2. Duplicate Detection Agent: Finds duplicate or similar requirements in extraction

    Sequential execution ensures completeness creates missing items before
    duplicate detection runs on the full set.

    Returns:
        An async tool function that can be registered with an agent.
    """
    return create_generic_validate_tool(
        completeness_agent_factory=create_completeness_agent,
        duplicate_agent_factory=create_duplicate_detection_agent,
        completeness_prompt_builder=_build_completeness_prompt,
        duplicate_prompt_builder=_build_duplicate_prompt,
    )
