"""Context helpers for requirement extraction workflow.

This module provides helper functions for formatting context data
(file content, requirements list) for prompt injection into agents.
"""

from ai_framework.workflow.requirement.extraction.extraction_deps import ExtractionDeps
from requirements.crud.models import IntermediateExtractedRequirementDto


def format_requirements_for_context(deps: ExtractionDeps) -> str:
    """Format the current requirements list for prompt injection.

    Retrieves requirements from the intermediate repository and formats them
    in a structured way that agents can easily parse and reference.

    Args:
        deps: ExtractionDeps containing the intermediate repository

    Returns:
        Formatted string with requirements wrapped in XML-style tags
    """
    reqs = deps.intermediate_repo.get_by_document(deps.document_id)

    if not reqs:
        return "<current_requirements>\nNo requirements extracted yet.\n</current_requirements>"

    lines = ["<current_requirements>"]
    for req in reqs:
        lines.append(f"[{req.order}] {req.description}")
        if req.types:
            lines.append(f"    Types: {', '.join(req.types)}")
        if req.implementation_status:
            lines.append(f"    Status: {req.implementation_status}")
        if req.implementation_description:
            # Truncate long descriptions for context
            desc = req.implementation_description
            if len(desc) > 200:
                desc = desc[:200] + "..."
            lines.append(f"    Implementation: {desc}")
        if req.requirement_verification:
            # Truncate long verifications for context
            verif = req.requirement_verification
            if len(verif) > 200:
                verif = verif[:200] + "..."
            lines.append(f"    Verification: {verif}")
    lines.append("</current_requirements>")

    return "\n".join(lines)


def format_document_for_context(deps: ExtractionDeps) -> str:
    """Format the document content for prompt injection.

    Wraps the pre-fetched file content in XML-style tags for clear delineation.

    Args:
        deps: ExtractionDeps containing the pre-fetched file_content

    Returns:
        Formatted string with document content wrapped in XML-style tags,
        or empty string if no content is available
    """
    if not deps.file_content:
        return ""

    return f"<document>\n{deps.file_content}\n</document>"


def format_single_requirement_for_context(
    req: IntermediateExtractedRequirementDto,
) -> str:
    """Format a single requirement for prompt injection.

    Formats one requirement in a structured way for agents processing
    individual requirements.

    Args:
        req: The requirement DTO to format

    Returns:
        Formatted string with requirement wrapped in XML-style tags
    """
    lines = ["<requirement>"]
    lines.append(f"Order: {req.order}")
    lines.append(f"Description: {req.description}")
    if req.types:
        lines.append(f"Types: {', '.join(req.types)}")
    if req.implementation_status:
        lines.append(f"Implementation Status: {req.implementation_status}")
    if req.implementation_description:
        lines.append(f"Implementation Description: {req.implementation_description}")
    if req.requirement_verification:
        lines.append(f"Verification: {req.requirement_verification}")
    lines.append("</requirement>")

    return "\n".join(lines)
