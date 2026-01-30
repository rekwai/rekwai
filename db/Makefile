.PHONY: help create-network create-docker-image start connect clear-database migrate info delete-docker-image clear-data-folder nuke-it start-ci

# Define the PostgreSQL Docker image
POSTGRES_IMAGE := pgvector/pgvector:0.8.0-pg17

# Default target when no arguments are given to make
help:
	@echo "Available targets:"
	@echo "  help                 - Show this help message"
	@echo "  create-docker-image  - Create PostgreSQL Docker container"
	@echo "  delete-docker-image  - Stop and remove the PostgreSQL docker image"
	@echo "  start                - Start the PostgreSQL container"
	@echo "  connect              - Connect to the PostgreSQL database"
	@echo "  clear-database       - Drop and recreate the database"
	@echo "  migrate              - Run Flyway migrations"
	@echo "  info                 - Show Flyway migration information"
	@echo "  clear-data-folder    - Remove and recreate the data folder"
	@echo "  nuke-it              - Complete reset: delete image, clear data, recreate image, start, and migrate"


# Create PostgreSQL Docker container
create-docker-image:
	docker create \
	    --name postgres-rekwai \
	    --network=rekwai-network \
	    -v $(CURDIR)/postgres_data:/var/lib/postgresql/data \
	    -e POSTGRES_DATABASE=rekwai \
	    -e POSTGRES_USER=rekwai \
	    -e POSTGRES_PASSWORD=rekwai \
	    -p 5432:5432 \
	    $(POSTGRES_IMAGE)

# Start the PostgreSQL container
start:
	docker start postgres-rekwai

# Start PostgreSQL container for CI (with network)
start-ci:
	docker run -d --name postgres-rekwai \
		--network rekwai-network \
		-p 5432:5432 \
		-e POSTGRES_USER=rekwai \
		-e POSTGRES_PASSWORD=rekwai \
		-e POSTGRES_DB=rekwai \
		$(POSTGRES_IMAGE)

# Connect to the PostgreSQL database
connect:
	PGPASSWORD=rekwai psql -h 127.0.0.1 -U rekwai rekwai

# Drop and recreate the database
clear-database:
	PGPASSWORD=rekwai psql -h 127.0.0.1 -U rekwai -d postgres -c "DROP DATABASE IF EXISTS rekwai;"
	PGPASSWORD=rekwai psql -h 127.0.0.1 -U rekwai -d postgres -c "CREATE DATABASE rekwai;"

# Run Flyway migrations
# Usage: make migrate [DATABASE=database_name]
# Default database is 'rekwai' if DATABASE is not specified
DATABASE ?= rekwai
migrate:
	docker run \
	    --rm \
	    --network=rekwai-network \
	    -v $(CURDIR)/migrations:/flyway/sql \
	    flyway/flyway \
	    -user=rekwai \
	    -password=rekwai \
	    -url=jdbc:postgresql://postgres-rekwai:5432/$(DATABASE) \
	    migrate

# Show Flyway migration information
info:
	docker run \
	    --rm \
	    --network=rekwai-network \
	    -v $(CURDIR)/migrations:/flyway/sql \
	    flyway/flyway \
	    -user=rekwai \
	    -password=rekwai \
	    -url=jdbc:postgresql://postgres-rekwai:5432/rekwai \
	    info

# Stop and remove the PostgreSQL container and image
delete-docker-image:
	# first stop the container if started (ignoring errors if it's not running)
	docker stop postgres-rekwai || true
	# delete the container
	docker rm postgres-rekwai || true
	# delete the image
	docker rmi "$(POSTGRES_IMAGE)" || true

# Remove and recreate the data folder
clear-data-folder:
	sudo rm -rf postgres_data
	mkdir postgres_data

# Complete reset: delete image, clear data, recreate image, start, and migrate
nuke-it:
	$(MAKE) delete-docker-image
	$(MAKE) clear-data-folder
	$(MAKE) create-docker-image
	$(MAKE) start
	sleep 5
	$(MAKE) migrate
