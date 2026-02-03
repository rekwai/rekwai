#!/bin/bash
set -e

# Run database migrations
echo "Running database migrations..."

# Add sslmode=disable to DATABASE_URL if not already present
if [[ "${DATABASE_URL}" != *"sslmode"* ]]; then
  if [[ "${DATABASE_URL}" == *"?"* ]]; then
    MIGRATION_URL="${DATABASE_URL}&sslmode=disable"
  else
    MIGRATION_URL="${DATABASE_URL}?sslmode=disable"
  fi
else
  MIGRATION_URL="${DATABASE_URL}"
fi

migrate \
  -path=/migrations \
  -database="${MIGRATION_URL}" \
  -verbose \
  up

echo "Migrations complete. Starting application..."

# Execute the CMD (uvicorn)
exec "$@"
