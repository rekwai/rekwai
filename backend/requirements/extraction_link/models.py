"""Pydantic models for requirement-extraction links."""

from pydantic import BaseModel


class RequirementExtractionLinkCreate(BaseModel):
    """Model for creating a new requirement-extraction link."""

    requirement_id: str
    extracted_requirement_id: str


class RequirementExtractionLink(BaseModel):
    """Model representing a requirement-extraction link from the database."""

    requirement_id: str
    extracted_requirement_id: str

    class Config:
        from_attributes = True
