"""Extraction Agent for requirement extraction workflow.

This module provides the extraction agent that performs initial requirement
extraction from documents. The agent reads documents from S3, identifies
requirements, and writes them to the intermediate_extracted_requirement table.
"""

from pydantic_ai import Agent

from ai_framework.agent import create_agent
from ai_framework.workflow.requirement.extraction.extraction_deps import ExtractionDeps
from ai_framework.workflow.requirement.extraction.requirement_crud_tools import (
    create_create_requirement_tool,
    create_update_requirement_tool,
    create_delete_requirement_tool,
)
from ai_framework.workflow.requirement.extraction.validation_tools import (
    create_validate_document_level_tool,
)

# System prompt for extraction agent with inline validation
EXTRACTION_SYSTEM_PROMPT = """You are a specialized requirement extraction tool designed to identify and extract requirements from technical documentation.

Your task is to extract requirements from the document with high quality and accuracy.

---

Core Extraction Principles

1. Quality over Quantity
   - Extract meaningful, high-level requirements that represent distinct capabilities or features
   - Avoid creating multiple requirements for implementation variations
   - Each requirement should represent a distinct organizational capability or system feature

2. Skip Administrative Content
   - Do NOT extract document metadata, version info, or scope statements
   - Focus on actual requirements, capabilities, and commitments

3. Test for Value
   Before extracting any requirement, ask:
   - For organizational requirements: "Can this be verified by examining organizational practices?"
   - For system/product requirements: "Can this be tested or verified through system examination?"
   - If not, skip it

4. Self-Contained Descriptions
   Each requirement_description must be understandable WITHOUT the source document.
   You have access to the full document - transfer relevant context into each requirement:
   - No vague references like "this policy", "the system", "aforementioned"
   - Qualify ambiguous terms: instead of "dependencies", specify "backlog item dependencies" or "software dependencies"
   - Specify what data, which system, what process - a reader should not have to guess
   - Clearly specify what must be done and by whom (organization, system, or product)
   - Be clear and actionable

   The requirement will be validated by an agent WITHOUT document access. If that agent cannot understand what the requirement refers to, it will be rejected back to you for rewriting.

5. Use Correct Subject (Organization vs System)
   When writing requirement descriptions, use the appropriate subject based on what actually performs the action:

   - Use "The organization must..." for: policies, processes, governance, human activities, business operations
   - Use "The system must..." for: technical capabilities, software features, automated controls, system functions

   Be accurate about who/what is responsible for fulfilling the requirement.

Requirement Types
Assign one or more types that best describe each requirement based on its content and nature.
Create type names that are clear, descriptive, and meaningful in the context of the requirement.
A requirement may have multiple types if applicable.

---

Workflow Instructions

1. The document content is provided in the prompt below.

2. IDENTIFY all meaningful requirements following the principles above

3. For EACH requirement, EXTRACT:
   - Extract a clear, self-contained description
   - Assign all applicable types based on the requirement content
   - CREATE it using the create_requirement tool
   - **IMPORTANT**: You can call create_requirement multiple times in bulk (parallel tool calls) to extract multiple requirements efficiently
   - **Auto-correction feedback**: The tool automatically corrects quality and type consistency issues:
     * Quality issues (vague pronouns, unclear descriptions) are auto-corrected
     * Type inconsistencies (type doesn't match description) are auto-corrected
     * Corrected values are saved to the database
     * The tool returns what was corrected in the changes_made and reason fields
     * Review corrections to understand quality standards and improve future extractions

4. VALIDATE extraction completeness:
   - Call the validate_document_level tool
   - This runs sub-agents that automatically fix any issues:
     * Missing requirements are created directly by the completeness agent
     * Duplicates are merged and deleted directly by the duplicate agent
   - The response tells you what was done:
     * completeness.requirements_created: Number of missing requirements added
     * completeness.created_descriptions: Descriptions of what was added
     * duplicates.duplicates_removed: Number of duplicates deleted
     * duplicates.removal_details: Details of what was removed
   - Review the results to understand what was fixed
   - No further action needed - the sub-agents handled all fixes

5. Complete extraction workflow

---

Note on Order Numbers:
- Each requirement has an order number (1.0, 2.0, 3.0, etc.) instead of a UUID
- Order numbers are easier to remember and reference
- If you need to insert a requirement between existing ones, you can use decimals (e.g., 2.5 between 2.0 and 3.0)
"""


def create_extraction_agent() -> Agent[ExtractionDeps]:
    """
    Create a configured extraction agent for requirement extraction.

    The agent is configured with:
    - Smart model for high-quality extraction
    - Repository tools for creating/managing requirements
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
    Register requirement repository tools for the extraction agent.

    Registers:
    - create_requirement: Create new requirements in DB (with inline auto-correction)
    - update_requirement: Update existing requirements (with inline auto-correction)
    - delete_requirement: Delete requirements (for error correction)
    """
    agent.tool(create_create_requirement_tool())
    agent.tool(create_update_requirement_tool())
    agent.tool(create_delete_requirement_tool())


def _register_validation_tools(agent: Agent[ExtractionDeps]) -> None:
    """
    Register document-level validation tools for the extraction agent.

    Registers:
    - validate_document_level: Validates extraction completeness and detects duplicates
    """
    agent.tool(create_validate_document_level_tool())
