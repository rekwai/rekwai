"""Data models for question answering workflow.

This module defines the data structures used by question answering agents and tools.
"""

from dataclasses import dataclass
from typing import List, Optional, Literal

from pydantic import BaseModel


@dataclass
class SearchResult:
    """Result from semantic requirement search.

    Attributes:
        requirement_key: The requirement identifier (e.g., "REQ-AUTH-001")
        description: The requirement description text
        types: List of requirement types (e.g., ["Security", "Authentication"])
        similarity_score: Similarity percentage (0-100, where 100 = perfect match)
    """

    requirement_key: str
    description: str
    types: List[str]
    similarity_score: int


@dataclass
class RequirementDetails:
    """Full requirement details including implementation information.

    Attributes:
        requirement_key: The requirement identifier (e.g., "REQ-AUTH-001")
        description: The requirement description text
        types: List of requirement types (e.g., ["Security", "Authentication"])
        implementation_description: Description of how the requirement is implemented
        implementation_status: Current implementation status (e.g., "Implemented", "To do")
        requirement_verification: How the requirement is verified/tested (optional)
    """

    requirement_key: str
    description: str
    types: List[str]
    implementation_description: str
    implementation_status: str
    requirement_verification: Optional[str]


class RequirementReference(BaseModel):
    """Reference to a requirement used in answering a question.

    Attributes:
        requirement_key: The requirement identifier (e.g., "REQ-AUTH-001")
        reason: Why this requirement is relevant to the answer (1-2 sentences)
    """

    requirement_key: str
    reason: str


class FullAnswerResult(BaseModel):
    """Result from answer agent.

    This model represents the structured output from the agent that
    answers questions using requirements.

    The agent ALWAYS provides an answer explanation. When no requirements are found,
    the agent returns answer_type=null to indicate user input is needed.

    Attributes:
        answer_type: Classification of the answer ("yes", "no", "n/a", or null if no requirements found)
        explanation: Detailed answer explanation
        requirements_referenced: List of requirements used (empty if none found)
    """

    answer_type: Optional[Literal["yes", "no", "n/a"]] = None
    explanation: str
    requirements_referenced: List[RequirementReference] = []


class AnswerQualityResult(BaseModel):
    """Result from answer quality validation agent.

    This model represents the validation result for checking if an answer
    meets quality standards for questionnaire responses.

    Attributes:
        is_valid: Whether the answer passes quality validation
        issues: List of quality issues found (empty if valid)
        suggested_rewording: Optional suggestion for how to improve the answer
    """

    is_valid: bool
    issues: List[str] = []
    suggested_rewording: Optional[str] = None


class InvalidRequirement(BaseModel):
    """Information about an invalid requirement reference.

    Attributes:
        requirement_key: The requirement identifier that is invalid
        issue: Description of why this requirement is invalid
    """

    requirement_key: str
    issue: str


class RequirementLinkageResult(BaseModel):
    """Result from requirement linkage validation agent.

    This model represents the validation result for checking if requirement
    references in an answer are valid and useful.

    Attributes:
        is_valid: Whether all requirement references pass validation
        invalid_requirements: List of invalid requirement references (empty if all valid)
    """

    is_valid: bool
    invalid_requirements: List[InvalidRequirement] = []


class ValidationResult(BaseModel):
    """Combined result from all validation agents.

    This model aggregates validation results from answer quality and requirement linkage
    validation agents.

    Attributes:
        answer_quality: Result from answer quality validation
        requirement_linkage: Result from requirement linkage validation
        overall_valid: Whether all validations passed
    """

    answer_quality: AnswerQualityResult
    requirement_linkage: RequirementLinkageResult
    overall_valid: bool
