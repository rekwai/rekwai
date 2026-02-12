"""
Common test utilities for integration tests.

This module provides common functions and fixtures for setting up test databases,
running migrations, and creating test clients for integration tests.
"""

import os
import uuid
import subprocess
import datetime
import psycopg2
import pytest
import random
import string
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy_utils import database_exists, create_database

# Import the FastAPI app and database models
from database import get_db
from main import app
from organization.tables import OrganizationDB
from auth.org_context import set_organization_id


def generate_unique_product_key():
    """
    Generate a unique product key that complies with validation rules:
    - Must be 3-6 uppercase letters (A-Z)
    - Must be unique across test runs

    Uses random 6-letter combinations to ensure uniqueness.
    """
    # Generate a random 6-letter uppercase key
    # With 26^6 = 308,915,776 combinations, collision is extremely unlikely
    return "".join(random.choices(string.ascii_uppercase, k=6))


# Generate a unique database name for this test run with timestamp
timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
TEST_DB_NAME = f"test_{timestamp}_{uuid.uuid4().hex[:8]}"
TEST_DB_URL = f"postgresql://rekwai:changeme@localhost:5432/{TEST_DB_NAME}"

# Override the DATABASE_URL environment variable for testing
os.environ["DATABASE_URL"] = TEST_DB_URL

# Create a test engine and session
test_engine = create_engine(TEST_DB_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


# Function to run golang-migrate migrations using Docker
def run_golang_migrate_migrations():
    """
    Run golang-migrate migrations using Docker to set up the database schema.
    """
    # Get the absolute path to the migrations directory
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
    migrations_dir = os.path.join(project_root, "db/migrations")

    # Run golang-migrate migrations using Docker
    command = [
        "docker",
        "run",
        "--rm",
        "--network=host",
        "-v",
        f"{migrations_dir}:/migrations",
        "migrate/migrate",
        "-path=/migrations",
        f"-database=postgresql://rekwai:changeme@localhost:5432/{TEST_DB_NAME}?sslmode=disable",
        "up",
    ]

    # Print the command being executed for better debugging
    print("\n" + "=" * 80)
    print("EXECUTING GOLANG-MIGRATE MIGRATION COMMAND:")
    print(" ".join(command))
    print("=" * 80 + "\n")

    # Execute the command
    result = subprocess.run(command, capture_output=True, text=True)

    # Print the command output regardless of success or failure
    print("\n" + "=" * 80)
    print("GOLANG-MIGRATE MIGRATION COMMAND OUTPUT:")
    print("=" * 80)

    if result.stdout:
        print("\nSTDOUT:")
        print("-" * 40)
        print(result.stdout)

    if result.stderr:
        print("\nSTDERR:")
        print("-" * 40)
        print(result.stderr)

    print("=" * 80 + "\n")

    # Check if the command was successful
    if result.returncode != 0:
        print(f"golang-migrate migration failed with return code: {result.returncode}")
        raise Exception(f"golang-migrate migration failed: {result.stderr}")

    print(f"golang-migrate migration successful with return code: {result.returncode}")


# Function to delete test databases older than 1 day
def delete_old_test_databases():
    """
    Delete test databases that are older than 1 day.
    This function connects to PostgreSQL, lists all databases that start with 'test_',
    and deletes those that are older than 1 day based on the timestamp in their name.
    """
    print("\n" + "=" * 80)
    print("CHECKING FOR OLD TEST DATABASES TO DELETE")
    print("=" * 80)

    # Connect to PostgreSQL
    conn = psycopg2.connect(
        host="localhost",
        user="rekwai",
        password="changeme",
        database="postgres",  # Connect to the default database
    )
    conn.autocommit = True
    cursor = conn.cursor()

    # Get the current time
    now = datetime.datetime.now()
    one_day_ago = now - datetime.timedelta(days=1)

    # List all databases
    cursor.execute("SELECT datname FROM pg_database WHERE datname LIKE 'test_%'")
    test_dbs = cursor.fetchall()

    deleted_count = 0
    for (db_name,) in test_dbs:
        # Skip the current test database
        if db_name == TEST_DB_NAME:
            continue

        try:
            # Parse the timestamp from the database name
            # Format: test_YYYYMMDDHHMMSS_uuid
            parts = db_name.split("_")
            if (
                len(parts) >= 3 and len(parts[1]) == 14
            ):  # Check if the timestamp part has the expected length
                timestamp_str = parts[1]
                db_timestamp = datetime.datetime.strptime(timestamp_str, "%Y%m%d%H%M%S")

                # Check if the database is older than 1 day
                if db_timestamp < one_day_ago:
                    print(
                        f"Deleting old test database: {db_name} (created on {db_timestamp})"
                    )
                    cursor.execute(f'DROP DATABASE "{db_name}"')
                    deleted_count += 1
        except (ValueError, IndexError) as e:
            # If we can't parse the timestamp, skip this database
            print(f"Skipping database with invalid format: {db_name} (Error: {e})")
            continue

    print(f"Deleted {deleted_count} test databases older than 1 day")
    print("=" * 80 + "\n")

    # Close the connection
    cursor.close()
    conn.close()


# Fixture to create and drop the test database
@pytest.fixture(scope="module")
def test_db():
    # Create the test database if it doesn't exist
    if not database_exists(TEST_DB_URL):
        create_database(TEST_DB_URL)

    # Run golang-migrate migrations to create all tables
    run_golang_migrate_migrations()

    # Delete old test databases
    delete_old_test_databases()

    # Yield to run the tests
    yield


# Fixture to override the get_db dependency
@pytest.fixture
def override_get_db():
    # Create a test database session
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Fixture to create a test client with the overridden get_db dependency
@pytest.fixture
def client(test_db, override_get_db):
    # Override the get_db dependency
    def _get_test_db():
        try:
            yield override_get_db
        finally:
            pass

    app.dependency_overrides[get_db] = _get_test_db

    # Create a test client
    with TestClient(app) as client:
        yield client

    # Reset the dependency override
    app.dependency_overrides = {}


# Fixture to create a test product
@pytest.fixture
def create_test_product(client):
    # Create a product with a unique product key
    unique_key = generate_unique_product_key()
    product_data = {"name": "Test Product", "product_key": unique_key}
    response = client.post("/products/", json=product_data)

    # Check the response
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Product"
    assert data["product_key"] == unique_key
    assert "id" in data
    assert "organization_id" in data
    assert "creation_date" in data

    # Return the product ID
    return data["id"]
