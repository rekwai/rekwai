"""Validation logic for question extraction workflow.

This module provides validation functions used by tool implementations
to validate questions before database operations.
"""

from ai_framework.agent_utils import run_agent_with_retry


async def validate_question_type_inline(
    question_text: str,
) -> tuple[bool, str]:
    """Validate question type inline before saving to database.

    Determines if a question should be included based on its type:
    - Recipient-directed questions (should be included) -> (True, reason)
    - Document-explanatory questions (should be excluded) -> (False, reason)

    This validation happens transparently inside CRUD tools to filter out
    document-explanatory questions without saving them to the database.

    Args:
        question_text: The question text to validate

    Returns:
        Tuple of (should_include, reason) where:
        - should_include: True if question should be saved, False if filtered
        - reason: Explanation of the filtering decision

    Raises:
        ModelRetry: If filter agent fails after all retries, allowing the parent
            agent to retry the tool call instead of crashing the workflow
    """
    from ai_framework.workflow.question.extraction.agents.question_type_filter_agent import (
        create_question_type_filter_agent,
    )

    # Run question type filter agent with retry logic
    filter_agent = create_question_type_filter_agent()
    filter_agent_result = await run_agent_with_retry(
        filter_agent,
        f"Classify this question: {question_text}",
        deps=None,
    )
    filter_result = filter_agent_result.output

    return filter_result.should_include, filter_result.reason
