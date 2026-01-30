"""
API endpoints for managing products.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from dependencies import get_product_service
from product.models import Product, ProductCreate, ProductUpdate
from product.services import ProductService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/products",
    tags=["products"],
)


@router.post(
    "/",
    response_model=Product,
    status_code=status.HTTP_201_CREATED,
)
def create_product_endpoint(
    product: ProductCreate, service: ProductService = Depends(get_product_service)
):
    """
    Creates a new product.
    """
    logger.info(f"Received request to create product: {product.name}")
    return service.create_product(product)


@router.get("/", response_model=list[Product], operation_id="list_products")
def list_products(service: ProductService = Depends(get_product_service)):
    """
    Retrieves all products.
    """
    logger.info("Received request to read all products")
    return service.get_products()


@router.get(
    "/key/{product_key}",
    response_model=Product,
)
def read_product_by_key(
    product_key: str, service: ProductService = Depends(get_product_service)
):
    """
    Retrieves a single product by its key.
    """
    logger.info(f"Received request to read product by key: {product_key}")
    db_product = service.get_product_by_key(product_key)
    if db_product is None:
        logger.warning(f"Product with key {product_key} not found.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with key {product_key} not found",
        )
    logger.info(f"Returning product with key: {product_key}")
    return db_product


@router.get(
    "/{product_id}",
    response_model=Product,
)
def read_product(
    product_id: str, service: ProductService = Depends(get_product_service)
):
    """
    Retrieves a single product by its ID.
    """
    logger.info(f"Received request to read product ID: {product_id}")
    db_product = service.get_product(product_id)
    if db_product is None:
        logger.warning(f"Product with ID {product_id} not found.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found",
        )
    logger.info(f"Returning product ID: {product_id}")
    return db_product


@router.put(
    "/{product_id}",
    response_model=Product,
)
def update_product_endpoint(
    product_id: str,
    product: ProductUpdate,
    service: ProductService = Depends(get_product_service),
):
    """
    Updates an existing product by its ID.
    """
    logger.info(f"Received request to update product ID: {product_id}")
    updated_product = service.update_product(product_id, product)
    if updated_product is None:
        logger.warning(f"Product with ID {product_id} not found for update.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found",
        )
    logger.info(f"Successfully updated product ID: {product_id}")
    return updated_product


@router.delete(
    "/{product_id}",
    response_model=Product,
)
def delete_product_endpoint(
    product_id: str, service: ProductService = Depends(get_product_service)
):
    """
    Deletes a product by its ID.
    """
    logger.info(f"Received request to delete product ID: {product_id}")
    deleted_product = service.delete_product(product_id)
    if deleted_product is None:
        logger.warning(f"Product with ID {product_id} not found for deletion.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found",
        )
    logger.info(f"Successfully deleted product ID: {product_id}")
    return deleted_product
