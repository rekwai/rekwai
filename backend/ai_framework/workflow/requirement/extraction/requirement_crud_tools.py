"""CRUD tool factories for intermediate extracted requirements.

This module provides tool factory functions that create Pydantic AI tools
for creating, reading, updating, and deleting intermediate requirements during
the extraction workflow.
"""

import json
from typing import Annotated, Awaitable, Callable

from pydantic import BeforeValidator
from pydantic_ai import RunContext
from pydantic_ai.exceptions import ModelRetry

from ai_framework.workflow.requirement.extraction.extraction_deps import ExtractionDeps
from ai_framework.workflow.requirement.extraction.models import (
    RequirementToolResult,
    UpdatedFields,
)
from ai_framework.workflow.requirement.extraction.validators import (
    validate_requirement_inline,
)
from requirements.crud.models import (
    IntermediateExtractedRequirementCreate,
    IntermediateExtractedRequirementUpdate,
)


def _parse_json_string_list(v: list[str] | str | None) -> list[str] | None:
    """Parse a JSON string into a list if needed.

    LLMs sometimes pass arrays as JSON strings (e.g., '["security"]' instead of ["security"]).
    This validator handles both formats for robustness.

    Args:
        v: Either a list, a JSON string representing a list, or None

    Returns:
        A list of strings or None
    """
    if v is None:
        return None
    if isinstance(v, list):
        return v
    if isinstance(v, str):
        try:
            parsed = json.loads(v)
            if isinstance(parsed, list):
                return parsed
        except json.JSONDecodeError:
            pass
    return v  # Let Pydantic handle validation errors for invalid types


# Type alias for list[str] that also accepts JSON-encoded strings.
# Use this for tool parameters where LLMs might pass arrays as strings.
FlexibleStringList = Annotated[list[str], BeforeValidator(_parse_json_string_list)]
FlexibleStringListOptional = Annotated[
    list[str] | None, BeforeValidator(_parse_json_string_list)
]


def _raise_requirement_not_found(order: float) -> None:
    """Raise ModelRetry error when a requirement is not found by order.

    Args:
        order: The order number that was not found

    Raises:
        ModelRetry: Always raises with a standard error message
    """
    raise ModelRetry(
        f"Requirement with order {order} not found. It may have been deleted or merged. "
        f"Please only update requirements that exist in the list provided in the prompt."
    )


def create_create_requirement_tool() -> Callable[
    [
        RunContext[ExtractionDeps],
        float,
        str,
        FlexibleStringList,
    ],
    Awaitable[RequirementToolResult],
]:
    """
    Create a tool for creating new intermediate extracted requirements with inline auto-correction.

    This tool validates and auto-corrects the requirement quality and type consistency BEFORE saving.
    Corrected values are saved to the database and explanations are returned.

    Returns:
        An async tool function that can be registered with an agent.
    """

    async def create_requirement(
        ctx: RunContext[ExtractionDeps],
        order: float,
        description: str,
        types: FlexibleStringList,
    ) -> RequirementToolResult:
        """
        Create a new intermediate extracted requirement with inline auto-correction.

        This tool performs quality check and type consistency validation BEFORE saving,
        automatically correcting any issues found. Corrected values are saved to the database.

        Metadata like document_name, product_id, document_id, and organization_id are automatically
        sourced from ctx.deps and not exposed to AI agents to reduce token usage.

        Args:
            ctx: The run context containing ExtractionDeps
            order: The order number for this requirement (e.g., 1.0, 2.5, 3.0).
                Uses float throughout for simplicity - AI agents can use natural numeric
                literals and the database stores as PostgreSQL REAL (float) type.
            description: The requirement description text
            types: List of requirement types (e.g., ["functional", "security"])

        Returns:
            RequirementToolResult: Success response with updated fields and auto-correction explanations

        Raises:
            RuntimeError: If validation agents fail to execute (network errors, model timeouts, etc.)
        """
        # Step 1: Run validation using shared helper (auto-corrects)
        (
            corrected_description,
            corrected_types,
            combined_changes,
            combined_reason,
        ) = await validate_requirement_inline(description, types, ctx)

        # Step 2: Create requirement in in-memory repository with CORRECTED values
        # Create requirement data model with CORRECTED values
        # Note: implementation and verification fields are not set here - they will be
        # added by specialized agents in later phases of the workflow
        req_data = IntermediateExtractedRequirementCreate(
            description=corrected_description,
            types=corrected_types,
            requirement_verification=None,
            implementation_status=None,
            implementation_description=None,
        )

        # Create requirement, passing metadata from context separately
        # The repository handles storage internally
        try:
            ctx.deps.intermediate_repo.create(
                req_data,
                ctx.deps.document_id,
                ctx.deps.document_name,
                ctx.deps.organization_id,
                ctx.deps.product_id,
                order,
            )
        except ValueError as e:
            # Duplicate order - tell LLM to use a different order number
            raise ModelRetry(
                f"Requirement with order {order} already exists. "
                f"Please use a different order number based on the requirements list provided in the prompt."
            ) from e

        # Build UpdatedFields with only the fields that were set
        # Only description and types are set during extraction phase
        return RequirementToolResult(
            order=order,
            updated=UpdatedFields(
                description=corrected_description,
                types=corrected_types,
            ),
            corrections_made=combined_changes,
            reason=combined_reason,
        )

    return create_requirement


def create_update_requirement_tool() -> Callable[
    [
        RunContext[ExtractionDeps],
        float,
        str | None,
        FlexibleStringListOptional,
    ],
    Awaitable[RequirementToolResult],
]:
    """
    Create a tool for updating an intermediate extracted requirement with inline auto-correction.

    This tool validates and auto-corrects the requirement quality and type consistency BEFORE updating.
    Corrected values are saved to the database and explanations are returned.

    Returns:
        An async tool function that can be registered with an agent.
    """

    async def update_requirement(
        ctx: RunContext[ExtractionDeps],
        order: float,
        description: str | None = None,
        types: FlexibleStringListOptional = None,
    ) -> RequirementToolResult:
        """
        Update an intermediate extracted requirement with inline auto-correction.

        This tool performs quality check and type consistency validation BEFORE updating,
        automatically correcting any issues found. Corrected values are saved to the database.

        Only provide the fields you want to update. Fields not provided will remain unchanged.

        Args:
            ctx: The run context containing ExtractionDeps
            order: The order number of the requirement to update (e.g., 1.0, 2.5, 3.0)
            description: Optional new description (only provide if you want to change it)
            types: Optional new list of requirement types (only provide if you want to change them)

        Returns:
            RequirementToolResult: Success response with updated fields and auto-correction explanations

        Raises:
            ValueError: If requirement with given order is not found in the document
            RuntimeError: If validation agents fail to execute (network errors, model timeouts, etc.)
        """
        # Step 1: Fetch existing requirement to get current values for fields not being updated
        existing_req = ctx.deps.intermediate_repo.get_by_order(
            ctx.deps.document_id, order
        )

        if existing_req is None:
            _raise_requirement_not_found(order)

        # Step 2: Early return if no fields to update
        if description is None and types is None:
            return RequirementToolResult(
                order=order,
                updated=UpdatedFields(),
                corrections_made=None,
                reason=None,
            )

        # Step 3: Determine final description and types for validation
        # Use provided values if given, otherwise use existing values
        final_description = (
            description if description is not None else existing_req.description
        )
        final_types = types if types is not None else existing_req.types

        # Step 4: Run validation using shared helper (auto-corrects)
        (
            corrected_description,
            corrected_types,
            combined_changes,
            combined_reason,
        ) = await validate_requirement_inline(final_description, final_types, ctx)

        # Step 5: Update requirement in in-memory repository with CORRECTED values
        # Only description and types can be updated during extraction phase
        # Implementation and verification fields are updated by specialized tools in later phases
        # IMPORTANT: Only include fields that were actually provided. Using **kwargs
        # ensures unset fields are truly excluded by model_dump(exclude_unset=True).
        update_kwargs: dict = {}
        if description is not None:
            update_kwargs["description"] = corrected_description
        if types is not None:
            update_kwargs["types"] = corrected_types
        update_data = IntermediateExtractedRequirementUpdate(**update_kwargs)

        # Update requirement using order-based method
        ctx.deps.intermediate_repo.update_by_order(
            ctx.deps.document_id, order, update_data
        )

        # Build UpdatedFields with only the fields that were provided
        # Only description and types can be updated during extraction phase
        return RequirementToolResult(
            order=order,
            updated=UpdatedFields(
                description=corrected_description if description is not None else None,
                types=corrected_types if types is not None else None,
            ),
            corrections_made=combined_changes,
            reason=combined_reason,
        )

    return update_requirement


def create_delete_requirement_tool() -> Callable[
    [RunContext[ExtractionDeps], float], Awaitable[bool]
]:
    """
    Create a tool for deleting an intermediate extracted requirement by its order number.

    Returns:
        An async tool function that can be registered with an agent.
    """

    async def delete_requirement(ctx: RunContext[ExtractionDeps], order: float) -> bool:
        """
        Delete an intermediate extracted requirement by its order number.

        Args:
            ctx: The run context containing ExtractionDeps
            order: The order number of the requirement to delete (e.g., 1.0, 2.5, 3.0)

        Returns:
            True if the requirement was deleted, False if not found
        """
        return ctx.deps.intermediate_repo.delete_by_order(ctx.deps.document_id, order)

    return delete_requirement
