"""Orchestrator for the complete requirement extraction workflow.

This module coordinates the three-phase requirement extraction workflow:
1. Extraction Agent - Extracts requirements from documents with inline validation
2. Implementation Agent - Determines implementation status (per-requirement, parallel)
3. Verification Agent - Generates verification methods (per-requirement, parallel)
"""

import asyncio
import logging
from typing import Any

from ai_framework.agent_utils import (
    run_agent_with_retry,
    log_agent_messages,
)
from ai_framework.workflow.requirement.extraction.validators import (
    validate_implementation_inline,
    validate_verification_inline,
)
from requirements.crud.models import IntermediateExtractedRequirementUpdate
from ai_framework.workflow.requirement.extraction.extraction_deps import ExtractionDeps
from ai_framework.workflow.requirement.extraction.context_helpers import (
    format_document_for_context,
    format_requirements_for_context,
    format_single_requirement_for_context,
)
from ai_framework.workflow.requirement.extraction.agents.extraction_agent import (
    create_extraction_agent,
)
from ai_framework.workflow.requirement.extraction.agents.implementation_agent import (
    create_implementation_agent,
)
from ai_framework.workflow.requirement.extraction.agents.verification_agent import (
    create_verification_agent,
)
from ai_framework.workflow.requirement.extraction.agents.coverage_validation_agents import (
    create_completeness_agent,
    create_duplicate_detection_agent,
)
from s3_service import S3Service

logger = logging.getLogger(__name__)


async def _prefetch_file_content(deps: ExtractionDeps) -> None:
    """Download document content from S3 and store in deps for context injection.

    This pre-fetches the file once at workflow start so agents receive the content
    directly in their prompts, avoiding redundant read_file tool calls.

    Args:
        deps: ExtractionDeps to populate with file_content
    """
    bucket = S3Service.UPLOAD_DOCUMENTS_BUCKET
    file_bytes = await deps.s3_service.download_file(bucket, deps.s3_object_key)
    deps.file_content = file_bytes.decode("utf-8")
    logger.info(f"Pre-fetched document content ({len(deps.file_content)} chars)")


async def _run_extraction_cleanup(deps: ExtractionDeps) -> None:
    """Run completeness and duplicate agents to fix any extraction issues.

    Both agents have CRUD access and will directly create missing requirements
    and remove duplicates. Runs sequentially: completeness first (creates missing),
    then duplicate detection (checks all including newly created).

    Args:
        deps: ExtractionDeps containing database, S3, and document context
    """
    logger.info("Running extraction cleanup...")

    # Check for cancellation before cleanup
    if deps.cancellation_check:
        deps.cancellation_check()

    # Step 1: Completeness - create any missing requirements
    completeness_agent = create_completeness_agent()
    reqs_context = format_requirements_for_context(deps)
    doc_context = format_document_for_context(deps)
    completeness_prompt = f"""Find any missing requirements in the document and create them.

{reqs_context}

{doc_context}"""
    completeness_result = await run_agent_with_retry(
        completeness_agent,
        completeness_prompt,
        deps,
        cancellation_check=deps.cancellation_check,
    )

    created_count = completeness_result.output.requirements_created
    if created_count > 0:
        logger.info(
            f"✓ Completeness agent created {created_count} missing requirements"
        )
        for desc in completeness_result.output.created_descriptions:
            logger.info(f"  - {desc[:100]}...")

    # Check for cancellation before duplicate detection
    if deps.cancellation_check:
        deps.cancellation_check()

    # Step 2: Duplicate detection - check all requirements including newly created
    duplicate_agent = create_duplicate_detection_agent()
    # Refresh requirements context after completeness agent may have added new ones
    reqs_context = format_requirements_for_context(deps)
    duplicate_prompt = f"""Find any duplicate requirements and handle them (merge/delete).

{reqs_context}"""
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


async def _run_implementation_per_requirement(deps: ExtractionDeps) -> list[Any]:
    """Run implementation agent for each requirement in parallel.

    Creates a separate agent call per requirement and runs all in parallel
    using asyncio.gather for efficiency. Each agent returns structured output
    which is then validated and saved to the repository.

    Args:
        deps: ExtractionDeps containing database, S3, and document context

    Returns:
        List of agent results from all requirement processing
    """
    requirements = deps.intermediate_repo.get_by_document(deps.document_id)
    doc_context = format_document_for_context(deps)

    async def process_requirement(req):
        req_context = format_single_requirement_for_context(req)
        prompt = f"""Analyze implementation status for this requirement:

{req_context}

{doc_context}"""
        agent = create_implementation_agent()
        result = await run_agent_with_retry(
            agent, prompt, deps, cancellation_check=deps.cancellation_check
        )
        log_agent_messages(
            result.all_messages(), f"IMPLEMENTATION AGENT (Order {req.order})"
        )

        # Validate and auto-correct the output
        (
            corrected_status,
            corrected_description,
            changes_made,
            reason,
        ) = await validate_implementation_inline(
            requirement_description=req.description,
            requirement_types=req.types,
            implementation_status=result.output.implementation_status,
            implementation_description=result.output.implementation_description,
            deps=deps,
        )

        if changes_made:
            logger.info(
                f"Implementation validation corrected (Order {req.order}): {changes_made}"
            )

        # Update the repository with corrected values
        update_data = IntermediateExtractedRequirementUpdate(
            implementation_status=corrected_status,
            implementation_description=corrected_description,
        )
        deps.intermediate_repo.update_by_order(deps.document_id, req.order, update_data)

        return result

    # Run all in parallel (fail-fast: if one fails, the exception propagates)
    results = await asyncio.gather(*[process_requirement(req) for req in requirements])
    return list(results)


async def _run_verification_per_requirement(deps: ExtractionDeps) -> list[Any]:
    """Run verification agent for each requirement in parallel.

    Creates a separate agent call per requirement and runs all in parallel
    using asyncio.gather for efficiency. Each agent returns structured output
    which is then validated and saved to the repository.

    Args:
        deps: ExtractionDeps containing database, S3, and document context

    Returns:
        List of agent results from all requirement processing
    """
    requirements = deps.intermediate_repo.get_by_document(deps.document_id)

    async def process_requirement(req):
        req_context = format_single_requirement_for_context(req)
        prompt = f"""Generate verification method for this requirement:

{req_context}"""
        agent = create_verification_agent()
        result = await run_agent_with_retry(
            agent, prompt, deps, cancellation_check=deps.cancellation_check
        )
        log_agent_messages(
            result.all_messages(), f"VERIFICATION AGENT (Order {req.order})"
        )

        # Validate and auto-correct the output
        (
            corrected_verification,
            changes_made,
            reason,
        ) = await validate_verification_inline(
            requirement_description=req.description,
            requirement_types=req.types,
            implementation_status=req.implementation_status or "",
            implementation_description=req.implementation_description or "",
            requirement_verification=result.output.requirement_verification,
        )

        if changes_made:
            logger.info(
                f"Verification validation corrected (Order {req.order}): {changes_made}"
            )

        # Update the repository with corrected value
        update_data = IntermediateExtractedRequirementUpdate(
            requirement_verification=corrected_verification,
        )
        deps.intermediate_repo.update_by_order(deps.document_id, req.order, update_data)

        return result

    # Run all in parallel (fail-fast: if one fails, the exception propagates)
    results = await asyncio.gather(*[process_requirement(req) for req in requirements])
    return list(results)


async def run_extraction_workflow(deps: ExtractionDeps) -> dict[str, Any]:
    """Run the complete requirement extraction workflow.

    Executes three phases:
    1. Extraction Agent - Extracts requirements with inline quality + type validation
    2. Implementation Agent - Determines implementation status (per-requirement, parallel)
    3. Verification Agent - Generates verification methods (per-requirement, parallel)

    Supports cancellation between phases via deps.cancellation_check callback.

    Args:
        deps: ExtractionDeps containing database, S3, and document context

    Returns:
        Dictionary with results from all three phases:
        {
            "extraction": {
                "requirements_extracted": int,
                "status": str,
                "messages": list  # All messages from agent run
            },
            "implementation": {
                "requirements_analyzed": int,
                "status": str
            },
            "verification": {
                "requirements_verified": int,
                "status": str
            }
        }

    Raises:
        Exception: If any phase fails, the error is propagated
        TaskCancelledException: If cancellation is requested
    """
    result = {}

    # Check for cancellation before Phase 1
    if deps.cancellation_check:
        deps.cancellation_check()

    # Pre-fetch file content once for all agents (avoids read_file tool calls)
    await _prefetch_file_content(deps)
    doc_context = format_document_for_context(deps)

    # Phase 1: Extraction Agent + Cleanup
    logger.info("Starting Phase 1: Extraction Agent")

    extraction_agent = create_extraction_agent()
    extraction_prompt = f"""Extract all requirements from the document: {deps.document_name}

{doc_context}"""
    extraction_result = await run_agent_with_retry(
        extraction_agent,
        extraction_prompt,
        deps,
        cancellation_check=deps.cancellation_check,
    )
    log_agent_messages(extraction_result.all_messages(), "EXTRACTION AGENT")

    # Run cleanup agents to handle any missing requirements or duplicates
    await _run_extraction_cleanup(deps)

    # Get count of extracted requirements
    extraction_count = deps.intermediate_repo.count_by_document(deps.document_id)

    result["extraction"] = {
        "requirements_extracted": extraction_count,
        "status": "completed",
        "messages": extraction_result.all_messages(),
    }
    logger.info(f"Phase 1 Complete: Extracted {extraction_count} requirements")

    # Report extraction complete
    if deps.progress_callback:
        deps.progress_callback(0.45, f"Extracted {extraction_count} requirements")

    # Check for cancellation before Phase 2
    if deps.cancellation_check:
        deps.cancellation_check()

    # Phase 2: Implementation Agent (per-requirement, parallel)
    logger.info("Starting Phase 2: Implementation Agent (parallel per-requirement)")

    # Report starting implementation analysis
    if deps.progress_callback:
        deps.progress_callback(
            0.50, f"Analyzing implementation for {extraction_count} requirements"
        )

    await _run_implementation_per_requirement(deps)

    # Get count of analyzed requirements
    implementation_count = deps.intermediate_repo.count_by_document(deps.document_id)

    result["implementation"] = {
        "requirements_analyzed": implementation_count,
        "status": "completed",
    }
    logger.info(f"Phase 2 Complete: Analyzed {implementation_count} requirements")

    # Report implementation complete
    if deps.progress_callback:
        deps.progress_callback(
            0.65, f"Analyzed implementation for {implementation_count} requirements"
        )

    # Check for cancellation before Phase 3
    if deps.cancellation_check:
        deps.cancellation_check()

    # Phase 3: Verification Agent (per-requirement, parallel)
    logger.info("Starting Phase 3: Verification Agent (parallel per-requirement)")

    # Report starting verification
    if deps.progress_callback:
        deps.progress_callback(
            0.70, f"Generating verification for {implementation_count} requirements"
        )

    await _run_verification_per_requirement(deps)

    # Get count of verified requirements
    verification_count = deps.intermediate_repo.count_by_document(deps.document_id)

    result["verification"] = {
        "requirements_verified": verification_count,
        "status": "completed",
    }
    logger.info(f"Phase 3 Complete: Verified {verification_count} requirements")

    # Report verification complete
    if deps.progress_callback:
        deps.progress_callback(
            0.80, f"Generated verification for {verification_count} requirements"
        )

    logger.info("=" * 80)
    logger.info("WORKFLOW COMPLETE")
    logger.info(f"Total requirements processed: {verification_count}")
    logger.info("=" * 80)

    return result
