"""Response models for requirement extraction tools.

This module contains all Pydantic models used for tool responses,
validation results, and error handling in the extraction workflow.
"""

from typing import Optional

from pydantic import BaseModel


class AutoCorrectionResult(BaseModel):
    """Base class for auto-correction validation results.

    This base class provides the common fields for tracking what was changed
    during auto-correction and why. All validation agents that auto-fix issues
    should return results that include these fields.

    Attributes:
        changes_made: Description of what was changed (None if no changes)
        reason: Explanation of why changes were needed (None if no changes)
    """

    changes_made: Optional[str]
    reason: Optional[str]


class TypeConsistencyResult(AutoCorrectionResult):
    """Result from type consistency validation with auto-fix capability.

    Attributes:
        value: Corrected types as list (or original if no changes needed)
        changes_made: What was changed (None if no changes) - inherited from AutoCorrectionResult
        reason: Why changes were needed (None if no changes) - inherited from AutoCorrectionResult
    """

    value: list[str]


class QualityCheckResult(AutoCorrectionResult):
    """Result from quality check validation with auto-fix capability.

    Attributes:
        value: Corrected description (or original if no changes needed)
        changes_made: What was changed (None if no changes) - inherited from AutoCorrectionResult
        reason: Why changes were needed (None if no changes) - inherited from AutoCorrectionResult
        rejected: True if the requirement is too ambiguous to understand without document context
        rejection_reason: Explanation of what's unclear (e.g., "What kind of dependencies?")
    """

    value: str
    rejected: bool = False
    rejection_reason: Optional[str] = None


class ImplementationValidationResult(AutoCorrectionResult):
    """Result from implementation validation with auto-fix capability.

    Attributes:
        status_value: Corrected status (or original if no changes needed)
        description_value: Corrected description (or original if no changes needed)
        changes_made: What was changed (None if no changes) - inherited from AutoCorrectionResult
        reason: Why changes were needed (None if no changes) - inherited from AutoCorrectionResult
    """

    status_value: str
    description_value: str


class VerificationValidationResult(AutoCorrectionResult):
    """Result from verification validation with auto-fix capability.

    Attributes:
        value: Corrected verification method (or original if no changes needed)
        changes_made: What was changed (None if no changes) - inherited from AutoCorrectionResult
        reason: Why changes were needed (None if no changes) - inherited from AutoCorrectionResult
    """

    value: str


class UpdatedFields(BaseModel):
    """Type-safe representation of updated requirement fields.

    Only includes fields that were actually created or updated.
    All fields are optional - only set fields will be present in responses.
    None values are excluded from serialization to reduce token usage.

    Attributes:
        description: The requirement description (if updated)
        types: List of requirement types (if updated)
        verification: Verification method (if updated)
        implementation_status: Implementation status (if updated)
        implementation_description: Implementation description (if updated)
    """

    model_config = {"exclude_none": True}

    description: Optional[str] = None
    types: Optional[list[str]] = None
    verification: Optional[str] = None
    implementation_status: Optional[str] = None
    implementation_description: Optional[str] = None


class RequirementToolResult(BaseModel):
    """Minimal token-efficient response for requirement CRUD operations.

    Returns only the order number and the fields that were created/updated.
    Auto-correction information is included when corrections were made.

    Attributes:
        order: The requirement order number (e.g., 1.0, 2.5, 3.0)
        updated: Fields that were created/updated (only set fields are included)
        corrections_made: What was auto-corrected (None if no corrections)
        reason: Why corrections were needed (None if no corrections)
    """

    model_config = {"exclude_none": True}

    order: float
    updated: UpdatedFields
    corrections_made: Optional[str] = None
    reason: Optional[str] = None


class RequirementData(BaseModel):
    """Minimal token-efficient response for GET operations.

    Returns only the order number and the core requirement fields we care about.
    Excludes metadata like timestamps and None values to reduce token usage.

    Attributes:
        order: The requirement order number (e.g., 1.0, 2.5, 3.0)
        description: The requirement description
        types: List of requirement types
        verification: Verification method (excluded if None)
        implementation_status: Implementation status (excluded if None)
        implementation_description: Implementation description (excluded if None)
    """

    model_config = {"exclude_none": True}

    order: float
    description: str
    types: list[str]
    verification: Optional[str] = None
    implementation_status: Optional[str] = None
    implementation_description: Optional[str] = None


class CompletenessResult(BaseModel):
    """Structured result from completeness agent after creating missing requirements.

    Attributes:
        requirements_created: Number of requirements created
        created_descriptions: List of descriptions of created requirements
    """

    requirements_created: int
    created_descriptions: list[str]


class DuplicateDetectionResult(BaseModel):
    """Structured result from duplicate detection agent after handling duplicates.

    Attributes:
        duplicates_removed: Number of duplicate requirements removed
        removal_details: List of details about what was merged/deleted and why
    """

    duplicates_removed: int
    removal_details: list[str]


class ImplementationOutput(BaseModel):
    """Structured output from implementation agent.

    Attributes:
        implementation_status: Status (Implemented, Planned, To do, Won't do)
        implementation_description: Description of implementation details
    """

    implementation_status: str
    implementation_description: str


class VerificationOutput(BaseModel):
    """Structured output from verification agent.

    Attributes:
        requirement_verification: Verification method for the requirement
    """

    requirement_verification: str
