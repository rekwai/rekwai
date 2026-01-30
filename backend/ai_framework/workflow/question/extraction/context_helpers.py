"""Context helpers for question extraction workflow.

This module provides helper functions for formatting context data
(file content, questions list) for prompt injection into agents.
"""

from ai_framework.workflow.question.extraction.extraction_deps import ExtractionDeps


def format_questions_for_context(deps: ExtractionDeps) -> str:
    """Format the current questions list for prompt injection.

    Retrieves questions from the intermediate repository and formats them
    in a structured way that agents can easily parse and reference.

    Args:
        deps: ExtractionDeps containing the intermediate repository

    Returns:
        Formatted string with questions wrapped in XML-style tags
    """
    questions = deps.intermediate_repo.get_by_questionnaire(deps.questionnaire_id)

    if not questions:
        return "<current_questions>\nNo questions extracted yet.\n</current_questions>"

    lines = ["<current_questions>"]
    for q in questions:
        lines.append(f"[{q.order}] {q.question_text}")
    lines.append("</current_questions>")

    return "\n".join(lines)


def format_questionnaire_for_context(deps: ExtractionDeps) -> str:
    """Format the questionnaire content for prompt injection.

    Wraps the pre-fetched file content in XML-style tags for clear delineation.

    Args:
        deps: ExtractionDeps containing the pre-fetched file_content

    Returns:
        Formatted string with questionnaire content wrapped in XML-style tags,
        or empty string if no content is available
    """
    if not deps.file_content:
        return ""

    return f"<questionnaire>\n{deps.file_content}\n</questionnaire>"
