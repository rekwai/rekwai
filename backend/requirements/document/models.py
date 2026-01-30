"""Pydantic models for requirement documents and related data structures."""

from pydantic import BaseModel, ConfigDict
from datetime import datetime


class RequirementDocumentBase(BaseModel):
    """Base Pydantic model for a requirement document."""

    s3_object_key: str
    organization_id: str
    product_id: str
    original_filename: str
    file_extension: str
    content_size_bytes: int
    document_key: str


class RequirementDocumentCreate(RequirementDocumentBase):
    """Pydantic model for creating a new requirement document."""

    id: str


class RequirementDocument(RequirementDocumentBase):
    """Pydantic model representing a requirement document retrieved from the database."""

    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
