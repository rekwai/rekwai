"""
Integration tests for the product API.

This module tests the CRUD operations for products using FastAPI's TestClient.
It creates a temporary test database for testing and cleans it up after tests are complete.
It uses golang-migrate migrations to set up the database schema.
"""

import pytest
from fastapi.testclient import TestClient

# Import fixtures from test_utils
from tests.test_utils import (
    test_db,
    override_get_db,
    client,
    create_test_product,
    generate_unique_product_key,
)


def test_create_product(client):
    unique_key = generate_unique_product_key()
    product_data = {"name": "Test Product", "product_key": unique_key}
    response = client.post("/products/", json=product_data)

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Product"
    assert data["product_key"] == unique_key
    assert "id" in data
    assert "organization_id" in data
    assert "creation_date" in data


def test_get_products(client, create_test_product):
    response = client.get("/products/")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert any(product["name"] == "Test Product" for product in data)


def test_get_product(client, create_test_product):
    product_id = create_test_product

    response = client.get(f"/products/{product_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Product"
    assert data["id"] == product_id


def test_update_product(client, create_test_product):
    product_id = create_test_product

    update_data = {"name": "Updated Test Product"}
    response = client.put(f"/products/{product_id}", json=update_data)

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Test Product"
    assert data["id"] == product_id


def test_delete_product(client, create_test_product):
    product_id = create_test_product

    response = client.delete(f"/products/{product_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Product"
    assert data["id"] == product_id

    # Verify the product is deleted
    response = client.get(f"/products/{product_id}")
    assert response.status_code == 404
