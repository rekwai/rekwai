"""Pydantic models for requirement-extraction links."""

from typing import Literal, Optional
from pydantic import BaseModel

LinkType = Literal["attach", "merge", "create"]


class RequirementExtractionLinkCreate(BaseModel):
    """Model for creating a new requirement-extraction link."""

    requirement_id: str
    extracted_requirement_id: str
    link_type: Optional[LinkType] = None


class RequirementExtractionLink(BaseModel):
    """Model representing a requirement-extraction link from the database."""

    requirement_id: str
    extracted_requirement_id: str
    link_type: Optional[LinkType] = None

    class Config:
        from_attributes = True
