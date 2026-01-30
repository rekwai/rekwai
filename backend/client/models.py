"""Pydantic models for clients."""

from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class ClientBase(BaseModel):
    """Base Pydantic model for a client."""

    name: str = Field(
        ..., description="Name of the client", min_length=1, max_length=255
    )


class ClientCreate(ClientBase):
    """Pydantic model for creating a new client."""

    pass


class Client(ClientBase):
    """Pydantic model representing a client retrieved from the database."""

    id: str
    organization_id: str
    key: str
    creation_date: datetime

    model_config = ConfigDict(from_attributes=True)
