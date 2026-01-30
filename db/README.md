# Database

PostgreSQL database with pgvector extension for the Rekwai application.

## Setup

```bash
# Create PostgreSQL container
make create-docker-image
```

## Run

```bash
# Start PostgreSQL container
make start

# Run database migrations
make migrate
```