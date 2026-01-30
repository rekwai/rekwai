"""Pydantic models for requirement-question links."""

from pydantic import BaseModel


class RequirementQuestionLinkCreate(BaseModel):
    """Model for creating a new requirement-question link."""

    requirement_id: str
    question_id: str


class RequirementQuestionLink(BaseModel):
    """Model representing a requirement-question link from the database."""

    requirement_id: str
    question_id: str

    class Config:
        from_attributes = True
