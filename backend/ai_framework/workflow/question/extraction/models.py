"""Response models for question extraction workflow.

This module contains all Pydantic models used for tool responses,
validation results, and filtering in the extraction workflow.
"""

from typing import List, Optional

from pydantic import BaseModel


class FilterResult(BaseModel):
    """Result from question type filtering.

    This model represents the decision of whether a question should be included
    in the extraction based on its type (recipient-directed vs document-explanatory).

    Attributes:
        should_include: Whether the question should be included in extraction
        reason: Explanation of why the question should or should not be included
    """

    should_include: bool
    reason: str


class QuestionToolResult(BaseModel):
    """Minimal token-efficient response for question CRUD operations.

    Returns the order number and filtering status after attempting to create a question.
    Questions that are filtered out (document-explanatory) are NOT saved to the database.

    Attributes:
        order: The question order number (e.g., 1.0, 2.5, 3.0)
        filtered: Whether the question was filtered out (True = not saved, False = saved)
        reason: Explanation of why the question was filtered (None if not filtered)
    """

    order: float
    filtered: bool
    reason: Optional[str] = None


class CompletenessResult(BaseModel):
    """Structured result from completeness agent after creating missing questions.

    Attributes:
        questions_created: Number of questions created
        created_descriptions: List of descriptions of created questions
    """

    questions_created: int
    created_descriptions: List[str]


class DuplicateDetectionResult(BaseModel):
    """Structured result from duplicate detection agent after handling duplicates.

    Attributes:
        duplicates_removed: Number of duplicate questions removed
        removal_details: List of details about what was merged/deleted and why
    """

    duplicates_removed: int
    removal_details: List[str]
