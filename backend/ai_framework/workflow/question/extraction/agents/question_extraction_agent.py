"""Extraction Agent for question extraction workflow.

This module provides the extraction agent that performs initial question
extraction from questionnaires. The agent reads questionnaires from S3, identifies
recipient-directed questions, and writes them to the intermediate_questionnaire_question table.
"""

from pydantic_ai import Agent

from ai_framework.agent import create_agent
from ai_framework.workflow.question.extraction.extraction_deps import ExtractionDeps
from ai_framework.workflow.question.extraction.question_crud_tools import (
    create_create_question_tool,
    create_update_question_tool,
    create_delete_question_tool,
)
from ai_framework.workflow.question.extraction.validation_tools import (
    create_validate_document_level_tool,
)

EXTRACTION_SYSTEM_PROMPT = """You are a specialized question extraction tool designed to identify and extract recipient-directed questions from questionnaires.

Extract questions directed to the document recipient (vendor/respondent), not explanatory questions about the document itself.

## Include:
- Questions the recipient must answer
- Imperative statements requesting information ("Please describe...", "Explain how...", "Provide details about...")
- Conditional questions requiring responses ("If your company...", "Does your organization...")
- Questions asking about practices, policies, procedures, or capabilities

## Exclude:
- Questions explaining what the document is
- Section headers and titles
- FAQ content about the questionnaire itself
- Instructions and definitions
- Response fields and metadata
- Document navigation or structural content

## Critical Review:

For EVERY potential question, ask yourself: "Is this a question TO the recipient or ABOUT the document?"

- Questions TO the recipient: Extract these (e.g., "What is your backup policy?", "Describe your incident response process")
- Questions ABOUT the document: Skip these (e.g., "What is this questionnaire for?", "How do I fill this out?")

## Workflow:

1. The questionnaire content is provided in the prompt below.

2. IDENTIFY all recipient-directed questions:
   - Apply the Include/Exclude criteria above
   - Remove numbering from questions (Q1.1, Q2.1, etc.) - extract only the question text
   - Normalize whitespace, preserve question marks and periods

3. For EACH valid question:
   - Extract the clear, self-contained question text
   - CREATE it using the create_question tool with an appropriate order number
   - **IMPORTANT**: You can call create_question multiple times in bulk (parallel tool calls) to extract multiple questions efficiently

4. VALIDATE extraction completeness:
   - Call the validate_document_level tool
   - This runs sub-agents that automatically fix any issues:
     * Missing questions are created directly by the completeness agent
     * Duplicates are merged and deleted directly by the duplicate agent
   - The response tells you what was done:
     * completeness.questions_created: Number of missing questions added
     * completeness.created_descriptions: Descriptions of what was added
     * duplicates.duplicates_removed: Number of duplicates deleted
     * duplicates.removal_details: Details of what was removed
   - Review the results to understand what was fixed
   - No further action needed - the sub-agents handled all fixes

5. Complete extraction workflow

## Quality:

- Self-contained text: Each question should be completely self-contained (include necessary context)
- No duplicates: Avoid extracting the same question multiple times
- Meaningful content: Each question should solicit distinct information from the recipient
- Clear and actionable: Questions should be unambiguous and answerable

Note on Order Numbers:
- Each question has an order number (1.0, 2.0, 3.0, etc.)
- Use the natural sequence from the document
- If you need to insert a question between existing ones, you can use decimals (e.g., 2.5 between 2.0 and 3.0)
"""


def create_extraction_agent() -> Agent[ExtractionDeps]:
    """
    Create a configured extraction agent for question extraction.

    The agent is configured with:
    - Smart model for high-quality extraction
    - Repository tools for creating/managing questions
    - Validation tools for document-level completeness and duplicate checks

    Returns:
        A configured Agent instance ready for extraction tasks
    """
    # Create agent with system prompt
    agent = create_agent(
        model_name="smart",
        system_prompt=EXTRACTION_SYSTEM_PROMPT,
    )

    # Register tool groups
    _register_repository_tools(agent)
    _register_validation_tools(agent)

    return agent


def _register_repository_tools(agent: Agent[ExtractionDeps]) -> None:
    """
    Register question repository tools for the extraction agent.

    Registers:
    - create_question: Create new questions in DB
    - update_question: Update existing questions
    - delete_question: Delete questions (for error correction)
    """
    agent.tool(create_create_question_tool())
    agent.tool(create_update_question_tool())
    agent.tool(create_delete_question_tool())


def _register_validation_tools(agent: Agent[ExtractionDeps]) -> None:
    """
    Register validation tools for the extraction agent.

    Registers:
    - validate_document_level: Document-level validation (completeness + duplicates)
    """
    agent.tool(create_validate_document_level_tool())
