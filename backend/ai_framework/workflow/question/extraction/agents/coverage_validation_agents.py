"""Coverage validation agents for question extraction workflow.

This module provides specialized validation agents for:
- Completeness validation (identifying and creating missing questions)
- Duplicate detection (finding and removing duplicate questions)

These agents have CRUD access and directly fix issues during extraction cleanup,
matching the pattern from the requirement extraction workflow.
"""

from pydantic_ai import Agent

from ai_framework.agent import create_agent
from ai_framework.workflow.question.extraction.extraction_deps import ExtractionDeps
from ai_framework.workflow.question.extraction.models import (
    CompletenessResult,
    DuplicateDetectionResult,
)
from ai_framework.workflow.question.extraction.question_crud_tools import (
    create_create_question_tool,
    create_update_question_tool,
    create_delete_question_tool,
)


# System prompt for Completeness Agent
COMPLETENESS_SYSTEM_PROMPT = """You are a question completeness specialist.

Your task is to find questions in the questionnaire that haven't been extracted yet, and CREATE them directly.

The current questions and questionnaire content are provided in the prompt below.

Workflow:

1. Review the existing questions provided below
2. Review the questionnaire content provided below and identify ALL recipient-directed questions:
   - Questions directed TO the recipient (vendor/respondent)
   - Imperative statements requesting information ("Please describe...", "Explain how...")
   - Conditional questions requiring responses ("If your company...")
   - Questions asking about practices, policies, procedures, or capabilities
3. Compare systematically - find questions in the questionnaire that don't have a matching entry
   - A match means the core meaning is captured, even if wording differs
   - Only create truly missing questions, not semantic duplicates of existing ones
4. For each missing question, use create_question tool to add it directly
   - Keep the order intact by using decimal order numbers (e.g., use 15.5 to insert between 15 and 16)
   - Extract question text verbatim from the source - don't rephrase or reword

Output Requirements:
- questions_created: Number of questions you created
- created_descriptions: List of question texts you created

Quality Standards:
- Only create meaningful recipient-directed questions (skip FAQ content, document explanations, section headers)
- Base all findings on actual questionnaire content - don't fabricate or assume
- Each question should represent a distinct inquiry to the recipient
"""


def create_completeness_agent() -> Agent[ExtractionDeps, CompletenessResult]:
    """
    Create a configured completeness agent that finds and creates missing questions.

    The agent is configured with:
    - Smart model for high-quality document analysis
    - Structured output (CompletenessResult) reporting what was created
    - Tools for creating new questions
    - ExtractionDeps for database and file storage access

    Returns:
        A configured Agent instance ready for completeness checking and fixing
    """
    return create_agent(
        model_name="smart",
        system_prompt=COMPLETENESS_SYSTEM_PROMPT,
        tools=[
            create_create_question_tool(),
        ],
        output_type=CompletenessResult,
    )


# System prompt for Duplicate Detection Agent
DUPLICATE_DETECTION_SYSTEM_PROMPT = """You are a question duplicate detection specialist.

Your task is to find questions that were accidentally extracted more than once and remove the extra copies.

IMPORTANT: You are correcting extraction errors ONLY. If two similar questions both exist in the
source questionnaire document, they are there intentionally and MUST both be preserved. You should
only delete a question when it is a redundant copy introduced by the extraction process itself.

The current questions are provided in the prompt below.

Workflow:

1. Review the existing questions provided below
2. Identify questions that appear to be accidental duplicate extractions of the same source question
3. For each group of accidental duplicates found:
   - Pick the question to keep (usually the one with lowest order number)
   - If the duplicate copy has slightly better wording, use update_question to improve the kept one
   - Use delete_question to remove the accidental duplicate(s)

What counts as an accidental extraction duplicate:
- Near-identical wording clearly extracted from the same source question twice
  - "What is your backup policy?" vs "What is your backup policy?"
  - "Describe your incident response plan" vs "Describe your incident response plan."

What is NOT a duplicate (preserve both):
- Questions with different wording, even if they cover a similar topic — the source document
  author included them as separate items intentionally
  - "What is your backup policy?" vs "Describe your backup policy" (separate source questions)
  - "How does your organization handle data retention?" vs "Explain your data retention process" (separate source questions)
  - "What is your backup policy?" vs "How quickly can you restore from backup?" (different aspects)
  - "What authentication methods do you use?" vs "Describe your password policy" (different aspects)

Output Requirements:
- duplicates_removed: Number of duplicate questions you deleted
- removal_details: List of what you merged/deleted and why

Guidelines:
- Be extremely conservative — only remove questions you are confident were extracted twice from the same source question
- When in doubt, keep both questions
- Similar topic does NOT mean duplicate — only same source question extracted twice counts
"""


def create_duplicate_detection_agent() -> Agent[
    ExtractionDeps, DuplicateDetectionResult
]:
    """
    Create a configured duplicate detection agent that finds and removes duplicates.

    The agent is configured with:
    - Smart model for high-quality semantic analysis
    - Structured output (DuplicateDetectionResult) reporting what was done
    - Tools for updating and deleting questions
    - ExtractionDeps for database and file storage access

    Returns:
        A configured Agent instance ready for duplicate detection and removal
    """
    return create_agent(
        model_name="smart",
        system_prompt=DUPLICATE_DETECTION_SYSTEM_PROMPT,
        tools=[
            create_update_question_tool(),
            create_delete_question_tool(),
        ],
        output_type=DuplicateDetectionResult,
    )
