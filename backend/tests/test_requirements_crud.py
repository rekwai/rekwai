"""
Integration tests for the requirements CRUD operations.

This module tests the CRUD operations for requirements using FastAPI's TestClient.
It creates a temporary test database for testing and cleans it up after tests are complete.
It uses Flyway migrations to set up the database schema.
"""

import pytest
from fastapi.testclient import TestClient

# Import fixtures from test_utils
from tests.test_utils import test_db, override_get_db, client, create_test_product


@pytest.fixture
def create_test_requirement(client, create_test_product):
    # Get the product ID
    product_id = create_test_product

    # Create a requirement
    requirement_data = {
        "description": "Test Requirement",
        "types": ["Functional"],
        "implementation_description": "Test Implementation",
        "implementation_status": "To do",
        "product_id": product_id,
    }
    response = client.post("/requirements/", json=requirement_data)

    # Check the response
    assert response.status_code == 201
    data = response.json()
    assert data["description"] == "Test Requirement"
    assert data["types"] == ["Functional"]
    assert data["implementation_description"] == "Test Implementation"
    assert data["implementation_status"] == "To do"
    assert data["product_id"] == product_id
    assert "id" in data
    assert "created_at" in data

    # Return the requirement ID
    return data["id"]


# Test creating a requirement
def test_create_requirement(client, create_test_product):
    # Get the product ID
    product_id = create_test_product

    # Create a requirement
    requirement_data = {
        "description": "Test Requirement",
        "types": ["Functional"],
        "implementation_description": "Test Implementation",
        "implementation_status": "To do",
        "product_id": product_id,
    }
    response = client.post("/requirements/", json=requirement_data)

    # Check the response
    assert response.status_code == 201
    data = response.json()
    assert data["description"] == "Test Requirement"
    assert data["types"] == ["Functional"]
    assert data["implementation_description"] == "Test Implementation"
    assert data["implementation_status"] == "To do"
    assert data["product_id"] == product_id
    assert "id" in data
    assert "created_at" in data


# Test getting all requirements
def test_get_requirements(client, create_test_product, create_test_requirement):
    product_id = create_test_product

    response = client.get(f"/requirements/?product_id={product_id}")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert any(req["description"] == "Test Requirement" for req in data)


def test_get_requirement(client, create_test_requirement):
    requirement_id = create_test_requirement

    response = client.get(f"/requirements/{requirement_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["description"] == "Test Requirement"
    assert data["types"] == ["Functional"]
    assert data["implementation_description"] == "Test Implementation"
    assert data["implementation_status"] == "To do"
    assert data["id"] == requirement_id


def test_update_requirement(client, create_test_requirement):
    requirement_id = create_test_requirement

    update_data = {
        "description": "Updated Test Requirement",
        "implementation_status": "Implemented",
    }
    response = client.put(f"/requirements/{requirement_id}", json=update_data)

    assert response.status_code == 200
    data = response.json()
    assert data["description"] == "Updated Test Requirement"
    assert data["implementation_status"] == "Implemented"
    assert data["id"] == requirement_id


def test_delete_requirement(client, create_test_requirement):
    requirement_id = create_test_requirement

    response = client.delete(f"/requirements/{requirement_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["description"] == "Test Requirement"
    assert data["id"] == requirement_id

    # Verify the requirement is deleted
    response = client.get(f"/requirements/{requirement_id}")
    assert response.status_code == 404
