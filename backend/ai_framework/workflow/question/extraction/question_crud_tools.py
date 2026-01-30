"""CRUD tool factories for intermediate extracted questions.

This module provides tool factory functions that create Pydantic AI tools
for creating, reading, updating, and deleting intermediate questions during
the extraction workflow.
"""

from typing import Awaitable, Callable

from pydantic_ai import RunContext
from pydantic_ai.exceptions import ModelRetry

from ai_framework.workflow.question.extraction.extraction_deps import ExtractionDeps
from ai_framework.workflow.question.extraction.models import (
    QuestionToolResult,
)
from ai_framework.workflow.question.extraction.validators import (
    validate_question_type_inline,
)
from questionnaire.models import (
    IntermediateQuestionCreate,
    IntermediateQuestionUpdate,
)


def create_create_question_tool() -> Callable[
    [
        RunContext[ExtractionDeps],
        float,
        str,
    ],
    Awaitable[QuestionToolResult],
]:
    """
    Create a tool for creating new intermediate extracted questions with inline type filtering.

    This tool validates question type (recipient-directed vs document-explanatory) BEFORE saving.
    Document-explanatory questions are filtered out and NOT saved to the database.

    The questionnaire_id is automatically sourced from ctx.deps.

    Returns:
        An async tool function that can be registered with an agent.
    """

    async def create_question(
        ctx: RunContext[ExtractionDeps],
        order: float,
        question_text: str,
    ) -> QuestionToolResult:
        """
        Create a new intermediate extracted question with inline type filtering.

        This tool performs question type filtering BEFORE saving to database.
        Only recipient-directed questions are saved; document-explanatory questions are filtered out.

        The questionnaire_id is automatically sourced from ctx.deps and not exposed
        to AI agents to reduce token usage.

        Args:
            ctx: The run context containing ExtractionDeps
            order: The order number for this question (e.g., 1.0, 2.5, 3.0).
                Uses float throughout for simplicity - AI agents can use natural numeric
                literals and the database stores as PostgreSQL DOUBLE PRECISION (float) type.
            question_text: The question text

        Returns:
            QuestionToolResult: Result with order, filtered status, and reason
                - If filtered=False: Question was saved to database (recipient-directed)
                - If filtered=True: Question was NOT saved (document-explanatory)

        Raises:
            RuntimeError: If question type filter agent fails to execute (network errors, model timeouts, etc.)
        """
        # Step 1: Run inline question type validation (filters document-explanatory questions)
        should_include, reason = await validate_question_type_inline(question_text)

        # Step 2: If question should be filtered out, return without saving
        if not should_include:
            return QuestionToolResult(
                order=order,
                filtered=True,
                reason=reason,
            )

        # Step 3: Question should be included - save to in-memory repository

        # Create question data model
        question_data = IntermediateQuestionCreate(
            question_text=question_text,
        )

        # Create question, passing questionnaire_id from context
        try:
            ctx.deps.intermediate_repo.create(
                question_data,
                ctx.deps.questionnaire_id,
                order,
            )
        except ValueError as e:
            # Duplicate order - tell LLM to use a different order number
            raise ModelRetry(
                f"Question with order {order} already exists. "
                f"Please use a different order number based on the questions list provided in the prompt."
            ) from e

        # Return success result (question was saved)
        return QuestionToolResult(
            order=order,
            filtered=False,
            reason=None,
        )

    return create_question


def create_update_question_tool() -> Callable[
    [
        RunContext[ExtractionDeps],
        float,
        str,
    ],
    Awaitable[QuestionToolResult],
]:
    """
    Create a tool for updating an intermediate extracted question.

    This tool updates the question text for a given order number.
    Returns minimal response without created_at to reduce token usage.

    Returns:
        An async tool function that can be registered with an agent.
    """

    async def update_question(
        ctx: RunContext[ExtractionDeps],
        order: float,
        question_text: str,
    ) -> QuestionToolResult:
        """
        Update an intermediate extracted question.

        Args:
            ctx: The run context containing ExtractionDeps
            order: The order number of the question to update (e.g., 1.0, 2.5, 3.0)
            question_text: The new question text

        Returns:
            QuestionToolResult: Result with order and filtered=False (updates don't filter)

        Raises:
            ModelRetry: If question with given order is not found in the questionnaire
        """
        # Create update data model
        update_data = IntermediateQuestionUpdate(
            question_text=question_text,
        )

        # Update question using order-based method
        updated_question = ctx.deps.intermediate_repo.update_by_order(
            ctx.deps.questionnaire_id, order, update_data
        )

        if updated_question is None:
            raise ModelRetry(
                f"Question with order {order} not found. It may have been deleted or merged. "
                f"Please only update questions that exist in the list provided in the prompt."
            )

        # Return success result (question was updated, not filtered)
        return QuestionToolResult(
            order=order,
            filtered=False,
            reason=None,
        )

    return update_question


def create_delete_question_tool() -> Callable[
    [RunContext[ExtractionDeps], float], Awaitable[bool]
]:
    """
    Create a tool for deleting an intermediate extracted question by its order number.

    Returns:
        An async tool function that can be registered with an agent.
    """

    async def delete_question(ctx: RunContext[ExtractionDeps], order: float) -> bool:
        """
        Delete an intermediate extracted question by its order number.

        Args:
            ctx: The run context containing ExtractionDeps
            order: The order number of the question to delete (e.g., 1.0, 2.5, 3.0)

        Returns:
            True if the question was deleted, False if not found
        """
        return ctx.deps.intermediate_repo.delete_by_order(
            ctx.deps.questionnaire_id, order
        )

    return delete_question
