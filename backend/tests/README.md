# Integration Tests with golang-migrate Migrations

## Overview

The integration tests in this directory now use golang-migrate migrations to set up the database schema instead of SQLAlchemy's `Base.metadata.create_all()`. This ensures that the test database schema matches the production database schema exactly.

## How It Works

1. A unique test database with a timestamp is created for each test run
2. golang-migrate migrations are run using the Docker image to set up the database schema
3. Tests are executed against this database
4. Test databases older than 1 day are automatically deleted
   - This prevents accumulation of test databases while allowing recent ones to be available for debugging

## Running Tests

To run the tests, you need to have Docker installed and running. The tests will use the golang-migrate Docker image to run migrations.

```bash
# Navigate to the backend directory
cd backend

# Run the tests
make test-integration
```

## Troubleshooting

If you encounter issues with the golang-migrate migrations, check the following:

1. Make sure Docker is running
2. Make sure Postgres is running
3. Make sure the golang-migrate Docker image is available (`docker pull migrate/migrate` if needed)
4. Make sure the migrations directory is correctly mounted in the Docker container
5. Check the output of the golang-migrate command for any error messages

## Database Cleanup

The test databases are now managed with the following approach:

1. Each test database is named with a timestamp: `test_YYYYMMDDHHMMSS_uuid`
2. When tests run, a function called `delete_old_test_databases()` is executed
3. This function:
   - Connects to PostgreSQL
   - Lists all databases that start with `test_`
   - Parses the timestamp from each database name
   - Deletes databases that are older than 1 day
   - Skips the current test database

This approach has several benefits:
- Prevents accumulation of test databases over time
- Keeps recent test databases available for debugging
- Automatically cleans up old databases without manual intervention
