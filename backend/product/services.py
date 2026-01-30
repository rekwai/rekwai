"""Product services for business logic."""

import logging
from typing import List, Optional

from fastapi import HTTPException
from auth.org_context import get_organization_id
from . import models
from .repository import ProductRepository
from .tables import ProductDB

logger = logging.getLogger(__name__)


class ProductService:
    def __init__(self, repository: ProductRepository):
        self.repository = repository

    def _convert_to_pydantic(self, db_product: ProductDB) -> models.Product:
        """
        Converts a SQLAlchemy ProductDB object to a Pydantic Product model.
        """
        return models.Product(
            id=str(db_product.id),
            name=db_product.name,
            organization_id=str(db_product.organization_id),
            creation_date=db_product.creation_date,
            product_key=db_product.product_key,
        )

    def create_product(self, product_data: models.ProductCreate) -> models.Product:
        """
        Creates a new product.
        """
        logger.info(
            f"Creating product with name: {product_data.name}, key: {product_data.product_key}"
        )
        organization_id = get_organization_id()

        # Validate product_key: 3-6 uppercase letters
        key = (product_data.product_key or "").strip()
        if (
            not key
            or len(key) < 3
            or len(key) > 6
            or not key.isalpha()
            or key != key.upper()
        ):
            raise HTTPException(
                status_code=400,
                detail="Invalid product_key. Must be 3-6 uppercase letters (A-Z).",
            )

        # Check uniqueness within organization
        existing = self.repository.get_product_by_key_in_org(organization_id, key)
        if existing:
            logger.error(
                f"Product key '{key}' already exists (existing product: {existing.name})"
            )
            raise HTTPException(
                status_code=400,
                detail=f"Product key '{key}' already exists in this organization.",
            )

        db_product = self.repository.create_product(product_data, organization_id)
        logger.info(f"Successfully created product ID: {db_product.id}")
        return self._convert_to_pydantic(db_product)

    def get_product(self, product_id: str) -> Optional[models.Product]:
        """
        Retrieves a single product by its ID.
        """
        db_product = self.repository.get_product(product_id)
        if db_product is None:
            return None
        return self._convert_to_pydantic(db_product)

    def get_product_by_key(self, product_key: str) -> Optional[models.Product]:
        """
        Retrieves a single product by its key within the current organization.
        """
        organization_id = get_organization_id()
        db_product = self.repository.get_product_by_key_in_org(
            organization_id, product_key
        )
        if db_product is None:
            return None
        return self._convert_to_pydantic(db_product)

    def get_products(self) -> List[models.Product]:
        """
        Retrieves all products.
        """
        db_products = self.repository.get_products()
        return [self._convert_to_pydantic(db_product) for db_product in db_products]

    def update_product(
        self, product_id: str, update_data: models.ProductUpdate
    ) -> Optional[models.Product]:
        """
        Updates an existing product.
        """
        logger.info(f"Updating product ID: {product_id}")
        db_product = self.repository.get_product(product_id)
        if not db_product:
            logger.warning(f"Product with ID {product_id} not found for update")
            return None

        db_product = self.repository.update_product(db_product, update_data)
        logger.info(f"Successfully updated product ID: {product_id}")
        return self._convert_to_pydantic(db_product)

    def delete_product(self, product_id: str) -> Optional[models.Product]:
        """
        Deletes a product.
        """
        logger.info(f"Deleting product ID: {product_id}")
        db_product = self.repository.get_product(product_id)
        if not db_product:
            logger.warning(f"Product with ID {product_id} not found for deletion")
            return None

        # Convert to pydantic before deleting
        product_to_return = self._convert_to_pydantic(db_product)

        self.repository.delete_product(db_product)
        logger.info(f"Successfully deleted product ID: {product_id}")
        return product_to_return
