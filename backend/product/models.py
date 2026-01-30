"""Pydantic models for products."""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class ProductBase(BaseModel):
    """Base Pydantic model for a product."""

    name: str = Field(
        ..., description="Name of the product", min_length=1, max_length=255
    )


class ProductCreate(ProductBase):
    """Pydantic model for creating a new product."""

    product_key: str = Field(
        ...,
        description="Product key (3-6 uppercase letters)",
        min_length=3,
        max_length=6,
    )


class ProductUpdate(BaseModel):
    """Pydantic model for updating an existing product."""

    name: Optional[str] = Field(
        None, description="Updated name of the product", min_length=1, max_length=255
    )


class Product(ProductBase):
    """Pydantic model representing a product retrieved from the database."""

    id: str
    organization_id: str
    creation_date: datetime
    product_key: str

    model_config = ConfigDict(from_attributes=True)
