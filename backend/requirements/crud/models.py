"""Pydantic models for requirements and related data structures."""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
import enum


class ImplementationStatus(str, enum.Enum):
    """Represents the implementation status of a requirement."""

    IMPLEMENTED = "Implemented"
    PLANNED = "Planned"
    TO_DO = "To do"
    WONT_DO = "Won't do"


class ExtractedRequirementBase(BaseModel):
    """Base Pydantic model for an extracted requirement."""

    document_name: str
    description: str
    product_id: str
    types: List[str] = []  # Changed: Multiple types support
    requirement_verification: Optional[str] = None
    implementation_status: Optional[str] = None
    implementation_description: Optional[str] = None


class ExtractedRequirementCreate(ExtractedRequirementBase):
    """Pydantic model for creating a new extracted requirement."""


class ExtractedRequirement(ExtractedRequirementBase):
    """Pydantic model representing an extracted requirement retrieved from the database."""

    id: Optional[str] = None  # UUID field from database, optional during creation
    extraction_timestamp: datetime
    order: Optional[float] = (
        None  # Sequential order within document for frontend sorting
    )

    model_config = ConfigDict(from_attributes=True)


class ExtractedRequirementUpdate(BaseModel):
    """Pydantic model for updating an extracted requirement."""

    description: Optional[str] = None
    types: Optional[List[str]] = None
    requirement_verification: Optional[str] = None
    implementation_status: Optional[str] = None
    implementation_description: Optional[str] = None


class ExtractedRequirementDto(BaseModel):
    """Pydantic model representing an extracted requirement for API responses (combined with types)."""

    id: Optional[str] = None
    document_name: str
    description: str
    product_id: str
    types: List[str] = []  # Multiple types from extracted_requirement_type table
    requirement_verification: Optional[str] = None
    implementation_status: Optional[str] = None
    implementation_description: Optional[str] = None
    extraction_timestamp: datetime
    order: float  # Sequential order within document for frontend sorting
    has_links: bool = False  # Whether this requirement has any linked main requirements
    suggested_action: Optional[str] = None
    suggested_target_requirement_id: Optional[str] = None
    suggestion_justification: Optional[str] = None
    suggestion_similarity_score: Optional[float] = None
    suggested_target_requirement: Optional["RequirementDto"] = None

    model_config = ConfigDict(from_attributes=True)


class RequirementBase(BaseModel):
    """Base Pydantic model for a main requirement. Fields match DB constraints."""

    description: str  # Changed: Removed Optional, NOT NULL in DB
    embedding: Optional[List[float]] = (
        None  # Embedding generated internally, optional on input
    )
    types: List[str]  # Changed: Multiple types support
    requirement_verification: Optional[str] = None  # Optional verification field
    implementation_description: str  # Changed: Removed Optional, NOT NULL in DB
    product_id: str


class RequirementCreate(RequirementBase):
    """Pydantic model for creating a new main requirement."""

    implementation_status: ImplementationStatus


class RequirementUpdate(BaseModel):
    """Pydantic model for updating an existing main requirement."""

    description: Optional[str] = None
    types: Optional[List[str]] = None
    requirement_verification: Optional[str] = None
    implementation_description: Optional[str] = None
    implementation_status: Optional[ImplementationStatus] = None
    product_id: Optional[str] = None
    # embedding is intentionally omitted - it should be updated internally based on description changes


class Requirement(RequirementBase):
    """Pydantic model representing a main requirement retrieved from the database."""

    id: str
    embedding: List[
        float
    ]  # Changed: Removed Optional, NOT NULL in DB and always present on retrieval
    implementation_status: str  # Allow any string when reading from DB
    created_at: datetime  # Added created_at field
    requirement_key: str

    model_config = ConfigDict(from_attributes=True)


class RequirementDto(BaseModel):
    """Pydantic model representing a main requirement for API responses (without embedding)."""

    id: str
    description: str
    types: List[str]  # Multiple types support
    requirement_verification: Optional[str] = None
    implementation_description: str
    implementation_status: str
    product_id: str
    created_at: datetime
    requirement_key: str

    model_config = ConfigDict(from_attributes=True)


class LLMSimilarityResult(BaseModel):
    """Schema for the structured LLM response comparing two requirements."""

    is_similar: bool = Field(
        ...,
        description="Boolean indicating if the requirements are semantically close (true) or not (false).",
    )
    similarity_score: float = Field(
        ...,
        description="A score between 0.0 (not similar) and 1.0 (very similar) indicating the semantic similarity.",
        ge=0.0,
        le=1.0,
    )
    justification: str = Field(
        ...,
        description="A brief explanation (1-2 sentences) justifying the similarity score.",
    )


class SuggestedActionType(str, enum.Enum):
    """The action the AI suggests for an extracted requirement."""

    ATTACH = "attach"
    MERGE = "merge"
    CREATE_NEW = "create_new"


class LLMActionDecision(BaseModel):
    """Internal LLM output: the AI's decision for a single extracted requirement."""

    action: SuggestedActionType = Field(
        ...,
        description="The recommended action: 'attach' (existing requirement fully covers this), "
        "'merge' (existing requirement is close but would benefit from details in the source), "
        "or 'create_new' (no existing requirement captures this).",
    )
    best_match_index: Optional[int] = Field(
        None,
        description="0-based index of the best matching candidate requirement. "
        "Required for 'attach' and 'merge', null for 'create_new'.",
    )
    similarity_score: float = Field(
        ...,
        description="A score between 0.0 and 1.0 indicating how close the best match is.",
        ge=0.0,
        le=1.0,
    )
    justification: str = Field(
        ...,
        description="A brief explanation (1-3 sentences) justifying the decision.",
    )


class SuggestedAction(BaseModel):
    """API response: the AI's suggested action for an extracted requirement."""

    action: SuggestedActionType
    target_requirement_id: Optional[str] = None
    target_requirement: Optional[RequirementDto] = None
    justification: str
    similarity_score: float = Field(ge=0.0, le=1.0)


class ActionDecisionValidationResult(BaseModel):
    """Validation output for an AI action decision."""

    is_valid: bool = Field(
        ..., description="Whether the decision passes validation."
    )
    issues: List[str] = Field(
        default_factory=list,
        description="List of issues found during validation.",
    )
    suggested_action: Optional[SuggestedActionType] = Field(
        None,
        description="If invalid, the action the validator thinks is correct.",
    )


class SimilarRequirementWithLLM(RequirementDto):
    """Extends RequirementDto to include optional LLM comparison results."""

    llm_result: Optional[LLMSimilarityResult] = Field(
        None,
        description="Results from the LLM-based similarity comparison, if performed.",
    )


class RequirementHistoryBase(BaseModel):
    """Base Pydantic model for a requirement history entry."""

    requirement_id: str
    product_id: str
    change_timestamp: datetime
    change_type: str  # e.g., 'CREATE', 'UPDATE', 'DELETE'
    user_id: Optional[str] = None  # Assuming user ID might be optional for now
    previous_description: Optional[str] = None
    previous_types: Optional[List[str]] = None
    previous_requirement_verification: Optional[str] = None
    previous_implementation_description: Optional[str] = None
    previous_implementation_status: Optional[str] = None
    new_description: Optional[str] = None
    new_types: Optional[List[str]] = None
    new_requirement_verification: Optional[str] = None
    new_implementation_description: Optional[str] = None
    new_implementation_status: Optional[str] = None


class RequirementHistory(RequirementHistoryBase):
    """Pydantic model representing a requirement history entry retrieved from the database."""

    id: str

    model_config = ConfigDict(from_attributes=True)


class MergedRequirement(BaseModel):
    """Pydantic model representing a merged requirement from an extracted requirement and main requirement."""

    description: str
    types: List[str]
    implementation_status: str
    implementation_description: str
    requirement_verification: Optional[str] = None


class IntermediateExtractedRequirementBase(BaseModel):
    """Base Pydantic model for an intermediate extracted requirement."""

    description: str
    types: List[str] = []
    requirement_verification: Optional[str] = None
    implementation_status: Optional[str] = None
    implementation_description: Optional[str] = None


class IntermediateExtractedRequirementCreate(IntermediateExtractedRequirementBase):
    """Pydantic model for creating a new intermediate extracted requirement."""

    pass


class IntermediateExtractedRequirement(IntermediateExtractedRequirementBase):
    """Pydantic model representing an intermediate extracted requirement retrieved from the database."""

    id: Optional[str] = None
    order: float
    extraction_timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class IntermediateExtractedRequirementUpdate(BaseModel):
    """Pydantic model for updating an intermediate extracted requirement."""

    description: Optional[str] = None
    types: Optional[List[str]] = None
    requirement_verification: Optional[str] = None
    implementation_status: Optional[str] = None
    implementation_description: Optional[str] = None


class IntermediateExtractedRequirementDto(BaseModel):
    """Pydantic model representing an intermediate extracted requirement for API responses.

    Note: This DTO exposes `order` instead of `id` to AI agents to reduce token usage
    and improve AI reasoning. The `order` field is a decimal number (e.g., 1.0, 2.5, 3.0)
    that represents the extraction sequence and allows inserting requirements between
    existing ones (e.g., inserting 2.5 between 2.0 and 3.0).

    Metadata like document_name, product_id, document_id, and organization_id are intentionally
    excluded to reduce token usage for AI agents - these are available in the context (ExtractionDeps).
    """

    order: float  # AI-friendly sequential ID (e.g., 1.0, 2.0, 2.5, 3.0)
    description: str
    types: List[str] = []
    requirement_verification: Optional[str] = None
    implementation_status: Optional[str] = None
    implementation_description: Optional[str] = None
    extraction_timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
