"""Pydantic models for questionnaire questions."""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from datetime import datetime, timezone


class QuestionAnswer(BaseModel):
    answer: str
    answer_type: Optional[Literal["yes", "no", "n/a"]] = None
    context_sufficient: bool
    source_requirement_keys: list[str] = []


class SaveAnswerRequest(BaseModel):
    """Request model for saving an answer to a question."""

    answer: str
    answer_type: Optional[Literal["yes", "no", "n/a"]] = None


class QuestionnaireQuestionCreate(BaseModel):
    """
    Model for creating a new questionnaire question.
    """

    questionnaire_id: str
    question_text: str
    answer: Optional[str] = None
    answer_type: Optional[Literal["yes", "no", "n/a"]] = None
    order: float  # Sequential order within questionnaire for frontend sorting


class QuestionnaireQuestion(BaseModel):
    """
    Model representing a questionnaire question as stored in the database.
    """

    id: str
    questionnaire_id: str
    question_text: str
    status: str = (
        "extracted"  # e.g., extracted, answering, answered, reviewing, reviewed
    )
    generated_answer: Optional[str] = None
    answer_type: Optional[Literal["yes", "no", "n/a"]] = None
    reviewed_answer: Optional[str] = None
    review_status: Optional[Literal["pending", "approved", "rejected", "modified"]] = (
        "pending"
    )
    extraction_timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    generation_timestamp: Optional[datetime] = None
    review_timestamp: Optional[datetime] = None
    order: float  # Sequential order within questionnaire for frontend sorting

    model_config = ConfigDict(from_attributes=True)


class QuestionReviewInput(BaseModel):
    """
    Model for the input of the question review endpoint.
    """

    review_status: Literal["approved", "rejected", "modified"]
    reviewed_answer: Optional[str] = (
        None  # Required if status is 'modified', maybe add validation later
    )
    reviewer_comments: Optional[str] = None


class ExportedQuestionAnswer(BaseModel):
    """
    Model for exporting approved questions and answers.
    """

    question_text: str
    answer_text: str  # Changed from approved_answer to match API endpoint

    model_config = ConfigDict(from_attributes=True)


class QuestionnaireSummaryData(BaseModel):
    """Data class for questionnaire summary information."""

    id: str
    key: Optional[str] = None
    client_name: str
    file_name: str
    uploaded_at: datetime
    total_questions: int
    answered_questions: int


class QuestionnaireDetails(BaseModel):
    """Data class for questionnaire details including product_id."""

    id: str
    key: Optional[str] = None
    product_id: str
    client_name: str
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QuestionGeneratedRequirement(BaseModel):
    """Model representing a requirement generated from a question."""

    description: str
    types: list[str]
    implementation_status: str
    implementation_description: str
    requirement_verification: str


class IntermediateQuestionCreate(BaseModel):
    """Pydantic model for creating a new intermediate question."""

    question_text: str


class IntermediateQuestionUpdate(BaseModel):
    """Pydantic model for updating an intermediate question."""

    question_text: Optional[str] = None


class IntermediateQuestionDto(BaseModel):
    """Pydantic model representing an intermediate question for API responses.

    Note: This DTO exposes `order` instead of `id` to AI agents to reduce token usage
    and improve AI reasoning. The `order` field is a decimal number (e.g., 1.0, 2.5, 3.0)
    that represents the extraction sequence and allows inserting questions between
    existing ones (e.g., inserting 2.5 between 2.0 and 3.0).

    The questionnaire_id is intentionally excluded to reduce token usage - it's available
    in the context (ExtractionDeps).
    """

    order: float  # AI-friendly sequential ID (e.g., 1.0, 2.0, 2.5, 3.0)
    question_text: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
