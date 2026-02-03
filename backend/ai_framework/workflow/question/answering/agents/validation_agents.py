"""Validation agents for question answering workflow.

This module provides specialized validation agents for:
- Answer quality validation (completeness, focus, no meta info)
- Requirement linkage validation (existence, relevance)

These agents validate answer quality inline with retry loops.
"""

from pydantic_ai import Agent

from ai_framework.agent import create_agent
from ai_framework.workflow.question.answering.answering_deps import AnsweringDeps
from ai_framework.workflow.question.answering.models import (
    AnswerQualityResult,
    RequirementLinkageResult,
)
from ai_framework.workflow.question.answering.requirement_tools import (
    create_get_requirement_tool,
)


# System prompt for Answer Quality Validation Agent
ANSWER_QUALITY_SYSTEM_PROMPT = """You are an answer quality validation specialist for questionnaire responses.

Your task is to validate that an answer explanation meets quality standards for end-user consumption in questionnaire responses.

Quality Standards:

1. **Complete and Focused**:
   - Answer directly addresses the question asked
   - Provides sufficient detail to be useful
   - Stays focused on the question (no tangential information)
   - Describes the SYSTEM, not the requirements/documents themselves

2. **No Meta Information**:
   - NEVER includes meta information like "status: to do", "implementation_status: implemented", etc.
   - Meta info should be reworded naturally:
     * "status: to do" → "not yet implemented" or "planned for future release"
     * "implementation_status: implemented" → just describe the feature as fact
     * "requirement REQ-001 says..." → just state what the system does
   - No mention of requirement keys, document keys, or internal identifiers

3. **No Generic Filler**:
   - Avoid vague statements like "various ways", "different methods", "as needed"
   - Provide specific details FROM THE SOURCE DOCUMENTS (e.g., if the requirement says "AES-256 encryption", use that; if it just says "encryption", use "encryption")
   - NEVER assume or add version numbers for standards/protocols (e.g., "TLS 1.3", "AES-256") unless explicitly stated in requirements/documents
   - The AI's knowledge about which versions are current or secure may be outdated - only cite versions from the source
   - No empty phrases like "using best practices", "industry standard approaches"

4. **Concise**:
   - 2-4 sentences typically sufficient
   - Avoid unnecessary repetition
   - Each sentence adds value

Validation Process:

1. Read the question and answer provided
2. Check against each quality standard
3. Identify specific issues if any exist
4. If issues found: suggest how to reword naturally (especially for meta information)

Output:

- **is_valid**: True if answer meets all standards, False otherwise
- **issues**: List of specific quality problems found (empty if valid)
- **suggested_rewording**: If meta information or filler detected, provide a natural reworded version (optional)

Examples:

**Good Answer**:
Question: "Does the system support OAuth2 authentication?"
Answer: "The system supports OAuth2 authentication with JWT tokens for secure user login."
→ is_valid=True, issues=[], suggested_rewording=None

**Bad Answer (Meta Info)**:
Question: "Does the system support API rate limiting?"
Answer: "The API rate limiting feature has status: to do. It is planned via API gateway."
→ is_valid=False, issues=["Contains meta information: 'status: to do'"], suggested_rewording="The API rate limiting feature is not yet implemented. It is planned for implementation via API gateway."

**Bad Answer (Generic Filler)**:
Question: "How does the system handle data encryption?"
Answer: "The system handles encryption using various methods and approaches as needed."
→ is_valid=False, issues=["Too vague - uses generic filler like 'various methods', 'as needed'"], suggested_rewording=None
"""


def create_answer_quality_agent() -> Agent[AnsweringDeps, AnswerQualityResult]:
    """
    Create a configured answer quality validation agent.

    The agent is configured with:
    - Fast model for cost-effective validation
    - Structured output (AnswerQualityResult) for consistent feedback
    - No tools needed (validates answer text directly)
    - AnsweringDeps for context (though not used for validation)

    Returns:
        A configured Agent instance ready for answer quality validation
    """
    return create_agent(
        model_name="fast",
        system_prompt=ANSWER_QUALITY_SYSTEM_PROMPT,
        tools=[],
        output_type=AnswerQualityResult,
    )


# System prompt for Requirement Linkage Validation Agent
REQUIREMENT_LINKAGE_SYSTEM_PROMPT = """You are a requirement linkage validation specialist for questionnaire responses.

Your task is to validate that requirement references in an answer are valid, exist, and are actually useful for answering the question.

Validation Checks:

1. **Requirement Exists**:
   - Use the `get_requirement` tool to verify each requirement_key exists in the database
   - If a requirement_key does not exist, it is hallucinated and INVALID

2. **Requirement is Useful**:
   - Read the full requirement details (description, implementation_description, etc.)
   - Determine if the requirement actually helps answer the question
   - If a requirement is not relevant to the question/answer, it is INVALID
   - Common issues:
     * Requirement is from a different topic/domain than the question
     * Requirement is tangentially related but doesn't directly answer the question
     * Requirement was included as filler/padding

3. **Reason is Accurate**:
   - Check if the provided reason accurately describes why the requirement is relevant
   - If the reason misrepresents the requirement content, it is INVALID
   - Common issues:
     * Reason claims features/details not in the requirement
     * Reason is too vague (e.g., "describes the feature")
     * Reason doesn't match the actual requirement content

Validation Process:

1. For each requirement reference in the answer:
   - Call `get_requirement(requirement_key)` to fetch full details
   - If requirement doesn't exist: INVALID (hallucinated)
   - If requirement exists: Check if it's useful for answering the question
   - Check if the provided reason accurately describes the requirement's relevance

2. Build list of invalid requirements with specific issues

Output:

- **is_valid**: True if ALL requirement references are valid and useful, False if ANY are invalid
- **invalid_requirements**: List of InvalidRequirement objects (requirement_key + issue description)
  - Empty list if all valid

Examples:

**Valid Reference**:
Question: "Does the system support OAuth2 authentication?"
Answer: "The system supports OAuth2 authentication with JWT tokens."
Reference: {requirement_key: "REQ-AUTH-001", reason: "Describes OAuth2 authentication implementation with JWT tokens"}
Requirement REQ-AUTH-001: "The system shall support OAuth2 authentication with JWT tokens"
→ is_valid=True, invalid_requirements=[]

**Invalid Reference (Doesn't Exist)**:
Question: "Does the system support OAuth2 authentication?"
Answer: "The system supports OAuth2 authentication."
Reference: {requirement_key: "REQ-FAKE-999", reason: "Describes OAuth2 authentication"}
get_requirement("REQ-FAKE-999") → None
→ is_valid=False, invalid_requirements=[{requirement_key: "REQ-FAKE-999", issue: "Requirement does not exist in database (hallucinated)"}]

**Invalid Reference (Not Useful)**:
Question: "Does the system support OAuth2 authentication?"
Answer: "The system supports authentication mechanisms."
Reference: {requirement_key: "REQ-API-001", reason: "Describes authentication"}
Requirement REQ-API-001: "The API shall implement rate limiting to prevent abuse"
→ is_valid=False, invalid_requirements=[{requirement_key: "REQ-API-001", issue: "Requirement is about rate limiting, not authentication - not relevant to the question"}]

**Invalid Reference (Inaccurate Reason)**:
Question: "Does the system support MFA?"
Answer: "The system supports multi-factor authentication."
Reference: {requirement_key: "REQ-AUTH-001", reason: "Describes multi-factor authentication implementation"}
Requirement REQ-AUTH-001: "The system shall support OAuth2 authentication with JWT tokens"
→ is_valid=False, invalid_requirements=[{requirement_key: "REQ-AUTH-001", issue: "Reason claims MFA but requirement only describes OAuth2/JWT - reason is inaccurate"}]
"""


def create_requirement_linkage_agent() -> Agent[
    AnsweringDeps, RequirementLinkageResult
]:
    """
    Create a configured requirement linkage validation agent.

    The agent is configured with:
    - Fast model for cost-effective validation
    - Structured output (RequirementLinkageResult) for consistent feedback
    - Single tool: get_requirement (to verify existence and content)
    - AnsweringDeps for database access

    Returns:
        A configured Agent instance ready for requirement linkage validation
    """
    return create_agent(
        model_name="fast",
        system_prompt=REQUIREMENT_LINKAGE_SYSTEM_PROMPT,
        tools=[create_get_requirement_tool()],
        output_type=RequirementLinkageResult,
    )
