#!/bin/bash

# E2E Test Runner Script
#
# This script automates the E2E testing process by:
# 1. Validating prerequisites (postgres running, docling-serve running, minio running, backend/frontend not running)
# 2. Setting up a test environment (creating test database, running migrations)
# 3. Starting the backend and frontend applications
# 4. Running Playwright E2E tests
# 5. Cleaning up resources after tests complete

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    export $(grep -E '^(POSTGRES_|MINIO_)' .env | xargs)
fi

# Configuration - use environment variables with fallback to defaults
POSTGRES_USER="${POSTGRES_USER:-rekwai}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-rekwai}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
BACKEND_PORT="8001"
FRONTEND_PORT="3001"
DOCLING_PORT="5001"
MINIO_PORT="${MINIO_API_PORT:-9000}"

# Global variables
TEST_DB_NAME=""
BACKEND_PID=""
FRONTEND_PID=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="test-results/e2e-logs"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

# Function to log messages with timestamp
log() {
    echo "[$(date -Iseconds)] $1"
}

# Function to check if PostgreSQL is running
check_postgres_running() {
    log "Checking if PostgreSQL is running..."
    if PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d postgres -c "SELECT 1;" &>/dev/null; then
        log "✅ PostgreSQL is running"
        return 0
    else
        log "❌ PostgreSQL is not running"
        log "Please start PostgreSQL before running e2e tests"
        return 1
    fi
}

# Function to check if docling-serve is running
check_docling_running() {
    log "Checking if docling-serve is running..."
    if curl -s http://localhost:$DOCLING_PORT/health &>/dev/null; then
        log "✅ docling-serve is running"
        return 0
    else
        log "❌ docling-serve is not running"
        log "Please start docling-serve before running e2e tests"
        return 1
    fi
}

# Function to check if MinIO is running
check_minio_running() {
    log "Checking if MinIO is running..."
    if curl -s http://localhost:$MINIO_PORT/minio/health/live &>/dev/null; then
        log "✅ MinIO is running"
        return 0
    else
        log "❌ MinIO is not running"
        log "Please start MinIO before running e2e tests"
        return 1
    fi
}

# Function to check if a port is in use
is_port_in_use() {
    local PORT=$1
    if lsof -i :$PORT -t &>/dev/null || netstat -tuln | grep -q ":$PORT "; then
        return 0  # Port is in use (success/true in bash)
    else
        return 1  # Port is not in use (failure/false in bash)
    fi
}

# Function to check that backend is not running
check_backend_not_running() {
    log "Checking if backend is not running..."
    if is_port_in_use "$BACKEND_PORT"; then
        log "❌ Port $BACKEND_PORT is already in use"
        log "Please ensure the backend port is free before running e2e tests"
        return 1
    else
        log "✅ Backend port $BACKEND_PORT is not in use"
        return 0
    fi
}

# Function to check that frontend is not running
check_frontend_not_running() {
    log "Checking if frontend is not running..."
    if is_port_in_use "$FRONTEND_PORT"; then
        log "❌ Port $FRONTEND_PORT is already in use"
        log "Please ensure the frontend port is free before running e2e tests"
        return 1
    else
        log "✅ Frontend port $FRONTEND_PORT is not in use"
        return 0
    fi
}

# Function to create a test database
create_test_database() {
    # Generate a unique database name
    UNIQUE_ID=$(uuidgen | tr -d '-' | head -c 8)
    TEST_DB_NAME="test_${UNIQUE_ID}"

    log "Creating test database: $TEST_DB_NAME"
    if PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d postgres -c "CREATE DATABASE $TEST_DB_NAME;" &>/dev/null; then
        log "✅ Created test database: $TEST_DB_NAME"
        return 0
    else
        log "❌ Failed to create test database"
        return 1
    fi
}

# Function to run golang-migrate migrations
run_golang_migrate_migration() {
    log "Running golang-migrate migrations..."
    if docker run --rm --network=rekwai-app_app-network \
        -v "$(pwd)/db/migrations:/migrations" \
        migrate/migrate \
        -path=/migrations \
        -database="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@rekwai-app-postgres-1:5432/$TEST_DB_NAME?sslmode=disable" \
        up; then
        log "✅ golang-migrate migrations completed successfully"
        return 0
    else
        log "❌ golang-migrate migrations failed"
        return 1
    fi
}

# Function to start the backend application
start_backend() {
    log "Starting backend application..."

    # Create log directory if it doesn't exist
    mkdir -p "$LOG_DIR"

    # Start the backend application with output redirected to log file
    cd backend
    DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$TEST_DB_NAME" \
    uv run uvicorn main:app --host 0.0.0.0 --port $BACKEND_PORT > "../$BACKEND_LOG" 2>&1 &
    BACKEND_PID=$!
    cd ..

    log "Backend logs: $BACKEND_LOG"

    # Wait for backend to start
    log "Waiting for backend to start..."
    for i in {1..10}; do
        if curl -s http://localhost:$BACKEND_PORT/health &>/dev/null; then
            log "✅ Backend started successfully"
            return 0
        fi
        log "Waiting for backend to start... ($i/10)"
        sleep 2
    done

    log "❌ Backend failed to start within the expected time"
    return 1
}

# Function to start the frontend application
start_frontend() {
    log "Starting frontend application..."

    cd frontend

    # Clean previously compiled files
    log "Cleaning previously compiled files..."
    if [ -d ".next" ]; then
        rm -rf .next
        log "✅ Cleaned .next directory"
    else
        log "No .next directory found, nothing to clean"
    fi

    # Start the frontend application in development mode
    log "Starting frontend server in development mode..."

    # Set backend service environment variable
    log "Setting backend service environment variable: BACKEND_SERVICE_URL=http://localhost:$BACKEND_PORT"
    export BACKEND_SERVICE_URL="http://localhost:$BACKEND_PORT"
    export USERS='[{"username":"example","password":"changeme"}]'
    log "Start frontend with users: $USERS"

    NODE_ENV=test npm run dev -- -p $FRONTEND_PORT > "../$FRONTEND_LOG" 2>&1 &
    FRONTEND_PID=$!
    cd ..

    log "Frontend logs: $FRONTEND_LOG"

    # Wait for frontend to start
    log "Waiting for frontend to start..."
    for i in {1..15}; do
        if curl -s http://localhost:$FRONTEND_PORT &>/dev/null; then
            log "✅ Frontend server started successfully"
            break
        fi
        log "Waiting for frontend server to start... ($i/15)"
        sleep 2
    done

    if ! curl -s http://localhost:$FRONTEND_PORT &>/dev/null; then
        log "❌ Frontend failed to start within the expected time"
        return 1
    fi

    # Wait for Next.js to finish initial compilation
    log "Waiting for Next.js compilation to complete..."
    sleep 5

    # Verify login page is accessible
    log "Verifying login page is accessible..."
    if curl -s http://localhost:$FRONTEND_PORT/login &>/dev/null; then
        log "✅ Login page is accessible"
        return 0
    else
        log "❌ Login page is not accessible"
        return 1
    fi
}

# Function to run Playwright E2E tests
run_playwright_tests() {
    log "Running Playwright E2E tests..."

    # Change to playwright directory
    cd playwright

    # Export environment variables for Playwright configuration
    export PLAYWRIGHT_HOST="localhost"
    export PLAYWRIGHT_PORT="$FRONTEND_PORT"

    if npx playwright test; then
        log "✅ Playwright tests completed successfully"
        cd ..
        return 0
    else
        log "❌ Playwright tests failed"
        cd ..
        return 1
    fi
}

# Function to kill all processes using a specific port
kill_processes_on_port() {
    local PORT=$1
    local SERVICE_NAME=$2
    local PID=$3

    # If a specific PID is provided, kill it first
    if [ -n "$PID" ]; then
        log "Stopping $SERVICE_NAME application..."
        kill -9 $PID
        wait $PID 2>/dev/null || true
    fi

    # Make sure to kill any processes still using the port
    local PORT_PIDS=$(lsof -ti :$PORT)
    if [ -n "$PORT_PIDS" ]; then
        log "Killing processes still using port $PORT (found by lsof): $PORT_PIDS"
        kill -9 $PORT_PIDS 2>/dev/null || true
    fi

    # Also check with netstat for IPv6 processes
    local NETSTAT_PIDS=$(netstat -tulnp 2>/dev/null | grep ":$PORT " | awk '{print $7}' | cut -d/ -f1 | sort -u | grep -v '^$')
    if [ -n "$NETSTAT_PIDS" ]; then
        log "Killing processes still using port $PORT (found by netstat): $NETSTAT_PIDS"
        for PID in $NETSTAT_PIDS; do
            kill -9 $PID 2>/dev/null || true
        done
    fi

    log "✅ $SERVICE_NAME stopped"
}

# Function to stop the frontend application
stop_frontend() {
    kill_processes_on_port "$FRONTEND_PORT" "Frontend" "$FRONTEND_PID"
}

# Function to stop the backend application
stop_backend() {
    kill_processes_on_port "$BACKEND_PORT" "Backend" "$BACKEND_PID"
}

# Function to run VACUUM FULL on postgres database
run_vacuum_full() {
    log "Running VACUUM FULL on postgres database..."
    PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d postgres -c "VACUUM FULL;" &>/dev/null
    log "✅ VACUUM FULL completed"
    return 0
}

# Function to delete old test databases
delete_old_test_databases() {
    log "Cleaning up old test databases..."

    # Get current date in seconds since epoch
    CURRENT_DATE=$(date +%s)
    ONE_WEEK_AGO=$((CURRENT_DATE - 7*24*60*60))

    # Get all test databases with their last modified date
    DB_INFO=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d postgres -t -c "
        SELECT 
            datname AS database_name,
            EXTRACT(EPOCH FROM (pg_stat_file('base/' || oid)).modification)::bigint AS last_modified_date
        FROM pg_database 
        WHERE datname LIKE 'test_%';
    ")

    # For each test database, drop if it's older than one week and not the one we just created
    echo "$DB_INFO" | while read -r LINE; do
        if [ -z "$LINE" ]; then
            continue
        fi

        # Extract database name and last modified date
        DB=$(echo "$LINE" | cut -d '|' -f1 | tr -d ' ')
        LAST_MODIFIED=$(echo "$LINE" | cut -d '|' -f2 | tr -d ' ')

        # Skip if it's the current test database
        if [ "$DB" = "$TEST_DB_NAME" ]; then
            continue
        fi

        # Check if the database is older than one week
        if [[ "$LAST_MODIFIED" =~ ^[0-9]+$ ]] && [ "$LAST_MODIFIED" -lt "$ONE_WEEK_AGO" ]; then
            # Convert timestamp to human-readable date
            FORMATTED_DATE=$(date -d "@$LAST_MODIFIED" '+%Y-%m-%d' 2>/dev/null || echo 'unknown')
            log "Dropping old test database: $DB (last modified: $FORMATTED_DATE)"
            PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d postgres -c "DROP DATABASE IF EXISTS $DB;" &>/dev/null
        fi
    done

    log "✅ Old test databases cleaned up"
    return 0
}

# Function to clean up resources
cleanup() {
    local exit_code=$?
    log "Starting cleanup..."
    stop_frontend
    stop_backend
    delete_old_test_databases
    run_vacuum_full

    # Only remove logs if tests passed
    if [ $exit_code -eq 0 ] && [ -d "$LOG_DIR" ]; then
        log "Tests passed, removing logs..."
        rm -rf "$LOG_DIR"
    elif [ -d "$LOG_DIR" ]; then
        log "Tests failed, preserving logs in $LOG_DIR"
    fi

    log "Cleanup completed"
}

# Handle termination signals
trap cleanup EXIT INT TERM

# Main function
main() {
    log "Starting E2E test runner"

    # Change to project root directory
    cd "$PROJECT_ROOT"

    # Validate prerequisites
    check_postgres_running || return 1
    check_docling_running || return 1
    check_minio_running || return 1

    # Setup test environment
    create_test_database || return 1
    run_golang_migrate_migration || { cleanup; return 1; }
    start_backend || { cleanup; return 1; }
    start_frontend || { cleanup; return 1; }

    # Run tests
    local test_result=0
    run_playwright_tests || test_result=1

    # Cleanup will be handled by the EXIT trap

    if [ $test_result -eq 0 ]; then
        log "E2E tests completed successfully"
    else
        log "E2E tests failed"
    fi

    return $test_result
}

# Run the main function
main
exit $?
