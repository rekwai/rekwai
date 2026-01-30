"""Pydantic models for organizations."""

from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class OrganizationBase(BaseModel):
    """Base Pydantic model for an organization."""

    name: str = Field(
        ..., description="Name of the organization", min_length=1, max_length=255
    )


class Organization(OrganizationBase):
    """Pydantic model representing an organization retrieved from the database."""

    id: str
    creation_date: datetime

    model_config = ConfigDict(from_attributes=True)
