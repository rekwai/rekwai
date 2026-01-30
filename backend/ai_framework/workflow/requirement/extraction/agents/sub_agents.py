"""Validation sub-agents for requirement extraction workflow.

This module provides specialized validation agents for basic quality checks:
- Quality Check Agent (validates requirement description clarity)
- Type Consistency Agent (validates requirement type consistency)

Additional validation agents for coverage and implementation validation
are available in coverage_validation_agents.py.
"""

from pydantic_ai import Agent

from ai_framework.agent import create_agent
from ai_framework.workflow.requirement.extraction.extraction_deps import ExtractionDeps
from ai_framework.workflow.requirement.extraction.models import (
    QualityCheckResult,
    TypeConsistencyResult,
)


# System prompt for Quality Check Agent
QUALITY_CHECK_SYSTEM_PROMPT = """You are a requirement quality validator.

Your job is to ensure requirement descriptions are clear, self-contained, and understandable WITHOUT access to the source document. You simulate a reader who only sees the requirement text.

Validation Rules:

1. Self-Contained Description
   - FIX: Vague pronouns like "this", "that", "it" → replace with specific nouns
   - KEEP: Generic actors like "Users", "The system", "The application" when context is clear
   - Ensure the requirement makes sense when read alone

2. Correct Subject (Organization vs System)
   - FIX: "The system must..." when the action is performed by people/organization (policies, processes, governance, human activities)
   - FIX: "The organization must..." when the action is performed by software (technical capabilities, automated controls)
   - Use "The organization must..." for: policies, processes, governance, human activities, business operations
   - Use "The system must..." for: technical capabilities, software features, automated controls, system functions

3. Clear Subject and Action
   - Ensure there's an identifiable subject (who/what)
   - Ensure there's an identifiable action (what must be done)

4. Understandable Language
   - FIX: Vague qualifiers with no context (e.g., "efficiently") → either remove or make specific
   - KEEP: Domain-appropriate terminology
   - KEEP: Missing implementation details (that's not your concern)

5. Domain Context (CRITICAL)
   - REJECT if you cannot understand what the requirement is about
   - You do NOT have access to the source document - if the requirement uses ambiguous terms that could mean different things in different contexts, REJECT it
   - Ask yourself: "Do I know exactly what this requirement is asking for?"
   - If you're unsure what a term refers to (e.g., "dependencies" - of what?), REJECT with a question

Output Format:
- value: The corrected requirement description (or original if clear). Set to original if rejecting.
- changes_made: What was changed (null if no changes or if rejecting)
- reason: Why changes were needed (null if no changes or if rejecting)
- rejected: Set to true if you cannot understand the requirement without more context
- rejection_reason: If rejected, explain what's unclear as a question (e.g., "What kind of dependencies? Software, task, or resource dependencies?")

Examples:

Clear requirement (accept):
Input: "Users must be able to login with their email and password"
Output: value="Users must be able to login with their email and password", rejected=false

Fixable issue (fix and accept):
Input: "It must handle files"
Output: value="The application must process uploaded files", changes_made="Replaced pronoun 'It' with 'The application'", reason="Pronoun had no clear antecedent", rejected=false

Ambiguous requirement (reject):
Input: "Dependencies must be identified and their impact on prioritization assessed"
Output: value="Dependencies must be identified and their impact on prioritization assessed", rejected=true, rejection_reason="What kind of dependencies? Software dependencies, task dependencies, or resource dependencies? And prioritization of what?"

Another rejection example:
Input: "Data must be encrypted at rest"
Output: value="Data must be encrypted at rest", rejected=true, rejection_reason="What data? All data, user data, sensitive data, or specific data types?"
"""


def create_quality_check_agent() -> Agent[None, QualityCheckResult]:
    """
    Create a configured quality check agent for requirement validation.

    The agent is configured with:
    - Fast model for cost-effective validation
    - Structured output (QualityCheckResult) for consistent feedback
    - No tools required (text-only analysis)
    - No dependencies needed

    Returns:
        A configured Agent instance ready for quality validation
    """
    return create_agent(
        model_name="fast",
        system_prompt=QUALITY_CHECK_SYSTEM_PROMPT,
        output_type=QualityCheckResult,
    )


# System prompt for Quality Fix Agent (with document access)
QUALITY_FIX_SYSTEM_PROMPT = """You are a requirement quality fixer with document access.

A requirement was rejected as unclear by a validator without document access.
Your job is to fix the requirement using the source document provided in the prompt.

The rejection reason explains what's unclear. Find the context in the document that
clarifies the unclear term and rewrite the requirement to be self-contained
(understandable without document access).

Also ensure the correct subject is used:
- Use "The organization must..." for: policies, processes, governance, human activities, business operations
- Use "The system must..." for: technical capabilities, software features, automated controls, system functions

Output Format:
- value: The fixed requirement description (must be self-contained and clear)
- changes_made: What you changed to fix the issue
- reason: Why this change makes the requirement clear
- rejected: Set to true ONLY if you cannot find any context in the document to clarify
- rejection_reason: If rejected, explain why even with document access

Example:
Input: "Violations of the Access Control Standard may result in termination."
Rejection: "What is the Access Control Standard? A policy, regulation, or framework?"
Document context shows it's the organization's internal policy document title.
Output: value="Violations of the organization's Access Control Standard policy may result in termination.", changes_made="Added 'the organization's' and 'policy' to clarify it's an internal company policy", reason="The document title and scope section establish this as the organization's internal security policy", rejected=false
"""


def create_quality_fix_agent() -> Agent[ExtractionDeps, QualityCheckResult]:
    """
    Create a quality fix agent with document access for rejected requirements.

    This agent is used as a second pass when the initial quality check rejects
    a requirement as unclear. It receives the document content in the prompt
    and uses it to fix the requirement.

    The agent is configured with:
    - Fast model for cost-effective validation
    - Structured output (QualityCheckResult) for consistent feedback
    - ExtractionDeps dependency for context

    Returns:
        A configured Agent instance ready for quality fixing with document access
    """
    return create_agent(
        model_name="fast",
        system_prompt=QUALITY_FIX_SYSTEM_PROMPT,
        output_type=QualityCheckResult,
    )


# System prompt template for Type Consistency Agent
# The {existing_types} placeholder will be replaced with actual types at runtime
TYPE_CONSISTENCY_SYSTEM_PROMPT_TEMPLATE = """You are a requirement type auto-correction specialist.

Your job is to FIX requirement types to match content and align with project conventions.

Existing Project Types: {existing_types}

Auto-Correction Rules:

1. Content Matching:
   - FIX: Types that don't match requirement content (e.g., "performance" for a security requirement)
   - Example: "Password encrypted" with type "performance" → FIX to ["security"]

2. Project Convention Alignment:
   - FIX: Use existing project types instead of inventing similar ones
   - Example: If "functional" exists, replace "feature" with "functional"
   - Example: If "usability" exists, consider replacing "user-experience" with "usability"

3. Preservation:
   - KEEP: Types that already match content and align with conventions

CRITICAL - Output Format (follow exactly):
- value: A list of strings with the corrected types. Example: ["security", "compliance"]
- changes_made: A SINGLE STRING describing what changed, or null if no changes.
  WRONG: [["old"], ["new"]] - DO NOT return arrays here!
  CORRECT: "Changed type from 'performance' to 'security'" or null
- reason: A SINGLE STRING explaining why, or null if no changes.
  WRONG: ["reason1", "reason2"] - DO NOT return arrays here!
  CORRECT: "The requirement describes security, not performance" or null

Examples:

Input: Requirement="Users must login", Types=["functional"], Existing Types: "functional", "security"
Output: {{"value": ["functional"], "changes_made": null, "reason": null}}

Input: Requirement="Password must be encrypted", Types=["performance"], Existing Types: "functional", "security"
Output: {{"value": ["security"], "changes_made": "Changed type from 'performance' to 'security'", "reason": "The requirement describes security (encryption), not performance"}}

Input: Requirement="UI must be accessible", Types=["user-experience"], Existing Types: "usability", "functional"
Output: {{"value": ["usability"], "changes_made": "Changed type from 'user-experience' to 'usability'", "reason": "The project uses 'usability' for UI accessibility requirements"}}
"""


def create_type_consistency_agent(
    existing_types: list[str],
) -> Agent[None, TypeConsistencyResult]:
    """
    Create a configured type consistency agent for requirement type validation.

    The agent is configured with:
    - Fast model for cost-effective validation
    - Structured output (TypeConsistencyResult) for consistent feedback
    - Existing types embedded in system prompt (no tool calls needed)
    - No dependencies needed (stateless validation)

    Args:
        existing_types: List of existing requirement types in the project.
            These are embedded in the system prompt to avoid tool call overhead.

    Returns:
        A configured Agent instance ready for type consistency validation
    """
    # Format existing types as a comma-separated list for readability
    types_str = (
        ", ".join(f'"{t}"' for t in existing_types) if existing_types else "None"
    )

    # Build the system prompt with existing types embedded
    system_prompt = TYPE_CONSISTENCY_SYSTEM_PROMPT_TEMPLATE.format(
        existing_types=types_str
    )

    return create_agent(
        model_name="fast",
        system_prompt=system_prompt,
        output_type=TypeConsistencyResult,
        retries=3,
    )
