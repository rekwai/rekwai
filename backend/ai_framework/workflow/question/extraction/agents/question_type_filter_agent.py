"""Question type filtering agent for question extraction workflow.

This module provides the question type filter agent that determines whether
a question should be included in extraction based on its type:
- Recipient-directed questions (should be included)
- Document-explanatory questions (should be excluded)
"""

from pydantic_ai import Agent

from ai_framework.agent import create_agent
from ai_framework.workflow.question.extraction.models import FilterResult


FILTER_SYSTEM_PROMPT = """You are a question type classification specialist.

Your job is to determine if a question should be INCLUDED or EXCLUDED from extraction based on its type.

## Classification Rules:

### INCLUDE (recipient-directed questions):
These are questions directed TO the recipient (vendor/respondent) about their organization, practices, or capabilities:
- Questions asking about practices, policies, procedures, or capabilities
  Examples: "What is your incident response process?", "Describe your backup policy"
- Imperative statements requesting information from the recipient
  Examples: "Please describe your authentication methods", "Explain how you handle data encryption"
- Conditional questions requiring responses about the organization
  Examples: "If your company processes credit cards, how do you ensure PCI compliance?"
- Questions asking about organizational details
  Examples: "What is your backup policy? Include RTO and RPO."

### EXCLUDE (document-explanatory questions):
These are questions ABOUT the document itself, not directed to the recipient:
- Questions explaining what the document is or how to use it
  Examples: "What does this section explain?", "How do I fill this out?"
- Section headers and navigation questions
  Examples: "What is covered in this questionnaire?", "Where can I find the definitions?"
- FAQ content about the questionnaire itself
  Examples: "Why do we need this information?", "When is the deadline?"
- Instructions and definitions
  Examples: "What does RTO mean?", "How should I format my responses?"

## Decision Process:

1. Read the question carefully
2. Ask: "Is this question asking the recipient TO ANSWER about their organization/practices?"
   - YES → should_include=True (recipient-directed)
   - NO → Check: "Is this question ABOUT the document itself?"
     - YES → should_include=False (document-explanatory)
3. Provide a clear reason explaining your classification

## Output Format:
- should_include: Boolean indicating if the question should be included
- reason: Brief explanation of why the question is recipient-directed or document-explanatory

## Important Notes:
- You ONLY classify questions, you NEVER modify the question text
- Focus on the intent and direction of the question
- When in doubt, favor inclusion (recipient-directed) over exclusion
- Imperative statements are typically recipient-directed (asking vendor to provide info)
"""


def create_question_type_filter_agent() -> Agent[None, FilterResult]:
    """
    Create a configured question type filter agent.

    The agent is configured with:
    - Fast model for cost-effective filtering
    - Structured output (FilterResult) for consistent classification
    - No tools required (text-only classification)
    - No dependencies needed (stateless filtering)

    Returns:
        A configured Agent instance ready for question type filtering
    """
    return create_agent(
        model_name="fast",
        system_prompt=FILTER_SYSTEM_PROMPT,
        output_type=FilterResult,
    )
