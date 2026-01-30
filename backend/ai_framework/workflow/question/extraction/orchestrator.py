"""Orchestrator for the complete question extraction workflow.

This module coordinates the question extraction workflow:
1. Extraction Agent - Extracts recipient-directed questions from questionnaires with inline type filtering
2. Cleanup - Completeness and duplicate agents fix any issues directly
"""

import logging
from typing import Any

from ai_framework.agent_utils import (
    run_agent_with_retry,
    log_agent_messages,
)
from ai_framework.workflow.question.extraction.extraction_deps import ExtractionDeps
from ai_framework.workflow.question.extraction.context_helpers import (
    format_questions_for_context,
    format_questionnaire_for_context,
)
from ai_framework.workflow.question.extraction.agents.question_extraction_agent import (
    create_extraction_agent,
)
from ai_framework.workflow.question.extraction.agents.coverage_validation_agents import (
    create_completeness_agent,
    create_duplicate_detection_agent,
)
from s3_service import S3Service

logger = logging.getLogger(__name__)


async def _prefetch_file_content(deps: ExtractionDeps) -> None:
    """Download questionnaire content from S3 and store in deps for context injection.

    This pre-fetches the file once at workflow start so agents receive the content
    directly in their prompts, avoiding redundant read_file tool calls.

    Args:
        deps: ExtractionDeps to populate with file_content
    """
    bucket = S3Service.UPLOAD_DOCUMENTS_BUCKET
    file_bytes = await deps.s3_service.download_file(bucket, deps.s3_object_key)
    deps.file_content = file_bytes.decode("utf-8")
    logger.info(f"Pre-fetched questionnaire content ({len(deps.file_content)} chars)")


async def _run_extraction_cleanup(deps: ExtractionDeps) -> None:
    """Run completeness and duplicate agents to fix any extraction issues.

    Both agents have CRUD access and will directly create missing questions
    and remove duplicates. Runs sequentially: completeness first (creates missing),
    then duplicate detection (checks all including newly created).

    Args:
        deps: ExtractionDeps containing database, S3, and questionnaire context
    """
    logger.info("Running extraction cleanup...")

    # Check for cancellation before cleanup
    if deps.cancellation_check:
        deps.cancellation_check()

    # Step 1: Completeness - create any missing questions
    completeness_agent = create_completeness_agent()
    questions_context = format_questions_for_context(deps)
    questionnaire_context = format_questionnaire_for_context(deps)
    completeness_prompt = f"""Find any missing questions in the questionnaire and create them.

{questions_context}

{questionnaire_context}"""
    completeness_result = await run_agent_with_retry(
        completeness_agent,
        completeness_prompt,
        deps,
        cancellation_check=deps.cancellation_check,
    )

    created_count = completeness_result.output.questions_created
    if created_count > 0:
        logger.info(f"✓ Completeness agent created {created_count} missing questions")
        for desc in completeness_result.output.created_descriptions:
            logger.info(f"  - {desc[:100]}...")

    # Check for cancellation before duplicate detection
    if deps.cancellation_check:
        deps.cancellation_check()

    # Step 2: Duplicate detection - check all questions including newly created
    duplicate_agent = create_duplicate_detection_agent()
    # Refresh questions context after completeness agent may have added new ones
    questions_context = format_questions_for_context(deps)
    duplicate_prompt = f"""Find any duplicate questions and handle them (merge/delete).

{questions_context}"""
    duplicate_result = await run_agent_with_retry(
        duplicate_agent,
        duplicate_prompt,
        deps,
        cancellation_check=deps.cancellation_check,
    )

    removed_count = duplicate_result.output.duplicates_removed
    if removed_count > 0:
        logger.info(f"✓ Duplicate agent removed {removed_count} duplicates")
        for detail in duplicate_result.output.removal_details:
            logger.info(f"  - {detail}")

    if created_count == 0 and removed_count == 0:
        logger.info("✓ Extraction cleanup complete - no issues found")


async def run_extraction_workflow(deps: ExtractionDeps) -> dict[str, Any]:
    """Run the complete question extraction workflow.

    Executes extraction agent with cleanup:
    1. Extraction Agent - Extracts recipient-directed questions with inline type filtering
    2. Cleanup - Completeness and duplicate agents fix any issues directly

    Supports cancellation via deps.cancellation_check callback.

    Args:
        deps: ExtractionDeps containing database, S3, and questionnaire context

    Returns:
        Dictionary with extraction results:
        {
            "extraction": {
                "questions_extracted": int,
                "status": str,
                "messages": list  # All messages from agent run
            }
        }

    Raises:
        Exception: If extraction phase fails, the error is propagated
        TaskCancelledException: If cancellation is requested
    """
    result = {}

    # Check for cancellation before starting
    if deps.cancellation_check:
        deps.cancellation_check()

    # Pre-fetch file content once for all agents (avoids read_file tool calls)
    await _prefetch_file_content(deps)
    questionnaire_context = format_questionnaire_for_context(deps)

    # Phase 1: Extraction Agent
    logger.info("Starting Extraction Phase")

    extraction_agent = create_extraction_agent()
    extraction_prompt = f"""Extract all recipient-directed questions from the questionnaire: {deps.file_name}

{questionnaire_context}"""
    extraction_result = await run_agent_with_retry(
        extraction_agent,
        extraction_prompt,
        deps,
        cancellation_check=deps.cancellation_check,
    )
    log_agent_messages(extraction_result.all_messages(), "EXTRACTION AGENT")

    # Run cleanup agents to handle any missing questions or duplicates
    await _run_extraction_cleanup(deps)

    # Get count of extracted questions
    extracted_questions = deps.intermediate_repo.get_by_questionnaire(
        deps.questionnaire_id
    )
    extraction_count = len(extracted_questions)

    result["extraction"] = {
        "questions_extracted": extraction_count,
        "status": "completed",
        "messages": extraction_result.all_messages(),
    }
    logger.info(f"Extraction Complete: Extracted {extraction_count} questions")

    logger.info("=" * 80)
    logger.info("WORKFLOW COMPLETE")
    logger.info(f"Total questions extracted: {extraction_count}")
    logger.info("=" * 80)

    return result
