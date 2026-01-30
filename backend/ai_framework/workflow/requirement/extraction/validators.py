"""Validation logic for requirement extraction workflow.

This module provides validation functions used by tool implementations
to validate requirements during in-memory extraction.
"""

from typing import Optional

from pydantic_ai import RunContext
from pydantic_ai.exceptions import ModelRetry

from ai_framework.agent_utils import run_agent_with_retry
from ai_framework.workflow.requirement.extraction.extraction_deps import ExtractionDeps


def _prefix_if_present(prefix: str, value: Optional[str]) -> Optional[str]:
    """Return f'{prefix}: {value}' if value is truthy, else None."""
    return f"{prefix}: {value}" if value else None


def _combine_validation_explanations(
    *results: tuple[Optional[str], Optional[str]],
) -> tuple[Optional[str], Optional[str]]:
    """Combine changes_made and reason from multiple validation results.

    This helper prevents duplication when combining explanations from multiple
    validators (quality, type, implementation, verification).

    Args:
        *results: Variable number of (changes_made, reason) tuples from validation agents

    Returns:
        Tuple of (combined_changes, combined_reason) where:
        - combined_changes: All changes joined with ". ", or None if no changes
        - combined_reason: All reasons joined with ". ", or None if no reasons

    Example:
        >>> combine_validation_explanations(
        ...     ("Fixed pronoun", "Pronoun was vague"),
        ...     ("Changed type", "Type didn't match")
        ... )
        ("Fixed pronoun. Changed type", "Pronoun was vague. Type didn't match")

        >>> combine_validation_explanations(
        ...     (None, None),
        ...     ("Changed type", "Type didn't match")
        ... )
        ("Changed type", "Type didn't match")

        >>> combine_validation_explanations((None, None), (None, None))
        (None, None)
    """
    changes_parts = []
    reason_parts = []

    for changes, reason in results:
        if changes:
            changes_parts.append(changes)
        if reason:
            reason_parts.append(reason)

    combined_changes = ". ".join(changes_parts) if changes_parts else None
    combined_reason = ". ".join(reason_parts) if reason_parts else None

    return combined_changes, combined_reason


async def validate_requirement_inline(
    description: str,
    types: list[str],
    ctx: RunContext[ExtractionDeps],
) -> tuple[str, list[str], Optional[str], Optional[str]]:
    """Validate and auto-fix requirement description and types inline.

    Performs quality check and type consistency validation on a requirement,
    automatically correcting any issues found.

    Args:
        description: The requirement description to validate/fix
        types: List of requirement types to validate/fix
        ctx: The run context containing ExtractionDeps

    Returns:
        Tuple of (corrected_description, corrected_types, combined_changes, combined_reason)
        where combined_changes and combined_reason are None if no changes were made

    Raises:
        ModelRetry: If validation agents fail after all retries, allowing the parent
            agent to retry the tool call instead of crashing the workflow
    """
    from ai_framework.workflow.requirement.extraction.agents.sub_agents import (
        create_quality_check_agent,
        create_quality_fix_agent,
        create_type_consistency_agent,
    )

    # Step 1: Run quality check validation (no file access - fast & cheap)
    quality_agent = create_quality_check_agent()
    quality_check_result = (
        await run_agent_with_retry(
            quality_agent,
            f"Validate this requirement description: {description}",
            deps=ctx.deps,
        )
    ).output

    # Step 2: If rejected, try to fix with document access (second pass)
    if quality_check_result.rejected:
        quality_fix_agent = create_quality_fix_agent()
        quality_fix_result = (
            await run_agent_with_retry(
                quality_fix_agent,
                f"Fix this rejected requirement.\n\n"
                f"Original: {description}\n"
                f"Rejection reason: {quality_check_result.rejection_reason}\n\n"
                f"Source Document:\n{ctx.deps.file_content}",
                deps=ctx.deps,
            )
        ).output

        # If still rejected after fix attempt with document access, raise error
        if quality_fix_result.rejected:
            raise ModelRetry(
                f"Requirement is unclear: {quality_fix_result.rejection_reason} "
                f"Please rewrite with more specific context from the document."
            )

        # Use the fixed description and its explanations
        corrected_description = quality_fix_result.value
        quality_changes = quality_fix_result.changes_made
        quality_reason = quality_fix_result.reason
    else:
        corrected_description = quality_check_result.value
        quality_changes = quality_check_result.changes_made
        quality_reason = quality_check_result.reason

    # Step 3: Create type consistency agent with existing types embedded
    type_agent = create_type_consistency_agent(ctx.deps.existing_types)

    # Step 4: Run type consistency validation (auto-fixes types)
    # Use corrected description for type validation
    type_check_result = (
        await run_agent_with_retry(
            type_agent,
            f"Requirement: {corrected_description}\nAssigned Types: {types}",
            deps=ctx.deps,
        )
    ).output
    corrected_types = type_check_result.value

    # Step 5: Combine explanations from all validators
    combined_changes, combined_reason = _combine_validation_explanations(
        (
            _prefix_if_present("Quality", quality_changes),
            _prefix_if_present("Quality", quality_reason),
        ),
        (
            _prefix_if_present("Type", type_check_result.changes_made),
            _prefix_if_present("Type", type_check_result.reason),
        ),
    )

    return corrected_description, corrected_types, combined_changes, combined_reason


async def validate_implementation_inline(
    requirement_description: str,
    requirement_types: list[str],
    implementation_status: str,
    implementation_description: str,
    deps: "ExtractionDeps | None" = None,
) -> tuple[str, str, Optional[str], Optional[str]]:
    """Validate and auto-fix implementation status and description inline.

    Performs implementation validation, automatically correcting any issues found.

    Args:
        requirement_description: The requirement description for context
        requirement_types: List of requirement types for context
        implementation_status: The implementation status to validate/fix
        implementation_description: The implementation description to validate/fix
        deps: Optional ExtractionDeps for context (not currently used but kept for consistency)

    Returns:
        Tuple of (corrected_status, corrected_description, changes_made, reason)
        where changes_made and reason are None if no changes were made

    Raises:
        ModelRetry: If validation agent fails after all retries, allowing the parent
            agent to retry the tool call instead of crashing the workflow
    """
    from ai_framework.workflow.requirement.extraction.agents.coverage_validation_agents import (
        create_implementation_validation_agent,
    )

    # Run implementation validation (with auto-fix)
    impl_agent = create_implementation_validation_agent()
    validation_prompt = f"""Requirement: {requirement_description}
Types: {", ".join(requirement_types)}
Implementation Status: {implementation_status}
Implementation Description: {implementation_description}"""

    impl_validation_result = (
        await run_agent_with_retry(
            impl_agent,
            validation_prompt,
            deps=deps,
        )
    ).output

    # Return corrected values and explanations
    return (
        impl_validation_result.status_value,
        impl_validation_result.description_value,
        impl_validation_result.changes_made,
        impl_validation_result.reason,
    )


async def validate_verification_inline(
    requirement_description: str,
    requirement_types: list[str],
    implementation_status: str,
    implementation_description: str,
    requirement_verification: str,
) -> tuple[str, Optional[str], Optional[str]]:
    """Validate and auto-fix verification method inline.

    Performs verification validation with auto-correction, ensuring the verification
    method is specific, actionable, and aligned with implementation status.

    Args:
        requirement_description: The requirement description for context
        requirement_types: List of requirement types for context
        implementation_status: The implementation status for context
        implementation_description: The implementation description for context
        requirement_verification: The verification method to validate/fix

    Returns:
        Tuple of (corrected_verification, changes_made, reason)
        where changes_made and reason are None if no changes were made

    Raises:
        ModelRetry: If validation agent fails after all retries, allowing the parent
            agent to retry the tool call instead of crashing the workflow
    """
    from ai_framework.workflow.requirement.extraction.agents.coverage_validation_agents import (
        create_verification_validation_agent,
    )

    # Run verification validation (with auto-fix)
    verification_agent = create_verification_validation_agent()
    validation_prompt = f"""Requirement: {requirement_description}
Types: {", ".join(requirement_types)}
Implementation Status: {implementation_status}
Implementation Description: {implementation_description}
Verification Method: {requirement_verification}"""

    verification_validation_result = (
        await run_agent_with_retry(
            verification_agent,
            validation_prompt,
            deps=None,
        )
    ).output

    # Return corrected verification and explanations
    return (
        verification_validation_result.value,
        verification_validation_result.changes_made,
        verification_validation_result.reason,
    )
